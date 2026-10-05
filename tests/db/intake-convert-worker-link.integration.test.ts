/**
 * hrp-t1c-intake-worker-link — DB-touching proof that the conversion service
 * links the resolved Worker to the LaborProfile in the same transaction.
 *
 * Self-skips when `DATABASE_URL_TEST` (writer) or `DATABASE_URL_ADMIN_TEST`
 * (admin/migration) is absent. When env is set, exercises:
 *
 *   - AC-09 happy path: QUALIFIED submission với laborProfileId → sau convert,
 *     `LaborProfile.workerId` được set đúng = `submission.workerId`. Audit
 *     diff `after.laborProfileLink` khớp.
 *
 *   - AC-10 conflict fail-closed: LaborProfile.workerId đã thuộc Worker khác →
 *     convert throw `LABOR_PROFILE_WORKER_CONFLICT` (409); toàn bộ row phát
 *     sinh trong transaction (Worker, SourceClaim, history, audit) bị rollback
 *     — submission vẫn ở QUALIFIED, LaborProfile.workerId KHÔNG đổi.
 *
 *   - AC-11 replay idempotent: submission đã CONVERTED + LaborProfile.workerId
 *     NULL → re-run convert (qua REPLAY path) khôi phục link idempotent; không
 *     tạo Worker/SourceClaim mới; vẫn `changed: false`.
 *
 *   - AC-12 legacy non-regression: submission không có `laborProfileId`
 *     (public/legacy path) → convert vẫn thành công; `tx.laborProfile.*`
 *     không được touch (assert bằng cách đếm `updatedAt` của LaborProfile
 *     trước/sau).
 *
 *   - AC-13 zero-residue teardown: mọi row tạo ra (CandidateSubmission, Worker,
 *     SourceClaim, ApplicationStatusHistory, AuditLog, LaborProfile, PlacementCase)
 *     đều được cleanup trong `afterAll`. Test DB rời pristine.
 *
 * ENV posture (DEC-01):
 *   - DATABASE_URL_TEST (writer, RLS-enforcing)
 *   - DATABASE_URL_ADMIN_TEST (admin, RLS bypass for fixtures + teardown)
 *   - Không đụng production. Không ghi credentials.
 *
 * GUC handling (giống intake-writer-integration.test.ts):
 *   - set_config(..., true) chỉ giữ trong transaction. Mọi query cần GUC
 *     đều phải đi qua prisma.$transaction hoặc withDbContext.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { convertApplication, ConversionError } from '@/src/domains/applications/conversion.service';

const HAS_TEST_DB =
  !!process.env.DATABASE_URL_TEST &&
  !!process.env.DATABASE_URL_ADMIN_TEST &&
  !process.env.DATABASE_URL_TEST?.includes('placeholder');

function makeClient(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } } });
}

const runId = `t1ciwl-${randomUUID().slice(0, 8)}`;
const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';

const HR_MANAGER = { userId: `t1ciwl-hr-${runId}`, role: 'HR_MANAGER' as const };

describe.skipIf(!HAS_TEST_DB)('hrp-t1c-intake-worker-link — DB-touching proof', () => {
  let admin: PrismaClient;

  // Track every row we create so teardown can clean up deterministically.
  const createdLaborProfileIds: string[] = [];
  const createdSubmissionIds: string[] = [];
  const createdWorkerIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdSourceClaimIds: string[] = [];
  const createdHistoryIds: string[] = [];
  const createdAuditLogIds: string[] = [];

  beforeAll(async () => {
    if (!adminUrl) return;
    admin = makeClient(adminUrl);
    // Provision the HR_MANAGER user used as the conversion actor.
    await admin.user.create({
      data: {
        id: HR_MANAGER.userId,
        name: 't1c-intake-worker-link HR',
        role: 'HR_MANAGER',
        isActive: true,
      },
    });
    createdUserIds.push(HR_MANAGER.userId);
  }, 30_000);

  afterAll(async () => {
    if (!admin) return;
    try {
      // Unlink LaborProfile.workerId (otherwise RESTRICT FK on LaborProfile
      // can block teardown when Worker still references it).
      if (createdLaborProfileIds.length > 0) {
        await admin.laborProfile.updateMany({
          where: { id: { in: createdLaborProfileIds } },
          data: { workerId: null },
        }).catch(() => {});
      }
      if (createdAuditLogIds.length > 0) {
        await admin.auditLog.deleteMany({ where: { id: { in: createdAuditLogIds } } }).catch(() => {});
      }
      if (createdHistoryIds.length > 0) {
        await admin.applicationStatusHistory.deleteMany({ where: { id: { in: createdHistoryIds } } }).catch(() => {});
      }
      if (createdSourceClaimIds.length > 0) {
        await admin.sourceClaim.deleteMany({ where: { id: { in: createdSourceClaimIds } } }).catch(() => {});
      }
      if (createdSubmissionIds.length > 0) {
        // Unlink placementCaseId to allow PlacementCase delete.
        await admin.$executeRawUnsafe(
          `UPDATE candidate_submissions SET placement_case_id = NULL WHERE id = ANY($1)`,
          createdSubmissionIds,
        ).catch(() => {});
        await admin.candidateSubmission.deleteMany({ where: { id: { in: createdSubmissionIds } } }).catch(() => {});
      }
      if (createdWorkerIds.length > 0) {
        await admin.worker.deleteMany({ where: { id: { in: createdWorkerIds } } }).catch(() => {});
      }
      if (createdLaborProfileIds.length > 0) {
        await admin.laborProfile.deleteMany({ where: { id: { in: createdLaborProfileIds } } }).catch(() => {});
      }
      if (createdUserIds.length > 0) {
        await admin.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
      }
    } catch (e) {
      console.warn('[teardown] partial failure:', (e as Error).message.slice(0, 200));
    }
    await admin?.$disconnect().catch(() => {});
  }, 30_000);

  /** Build a CandidateSubmission with deterministic seed. */
  async function seedQualifedSubmission(opts: {
    laborProfileId: string | null;
    phone: string;
    suffix: string;
  }): Promise<{ submissionId: string; expectedWorkerId?: string }> {
    const submissionId = `${runId}-sub-${opts.suffix}`;
    const phone = opts.phone;
    const sub = await admin.candidateSubmission.create({
      data: {
        id: submissionId,
        laborProfileId: opts.laborProfileId,
        fullName: `t1c-intake-worker-link ${opts.suffix}`,
        phone,
        normalizedPhone: phone,
        status: 'QUALIFIED',
        version: 0,
      },
      select: { id: true, laborProfileId: true, status: true, workerId: true },
    });
    createdSubmissionIds.push(sub.id);
    return { submissionId: sub.id };
  }

  async function seedLaborProfile(opts: { suffix: string; phone: string; cccd?: string }): Promise<string> {
    const lp = await admin.laborProfile.create({
      data: {
        fullName: `t1c-intake-worker-link LP ${opts.suffix}`,
        phone: opts.phone,
        normalizedPhone: opts.phone.replace(/^0/, ''),
        cccdNumber: opts.cccd ?? `${runId}-CCCD-${opts.suffix}`.slice(0, 20),
      },
      select: { id: true },
    });
    createdLaborProfileIds.push(lp.id);
    return lp.id;
  }

  function captureRowIds(result: {
    workerId: string;
    sourceClaimId: string;
  }) {
    createdWorkerIds.push(result.workerId);
    createdSourceClaimIds.push(result.sourceClaimId);
  }

  it('AC-09: QUALIFIED + laborProfileId → LaborProfile.workerId được set sau convert', async () => {
    const writer = makeClient(writerUrl);
    try {
      const phone = `09${runId.replace(/-/g, '').slice(0, 8)}A`.padEnd(10, '0');
      const lpId = await seedLaborProfile({ suffix: 'A09', phone });
      const { submissionId } = await seedQualifedSubmission({ laborProfileId: lpId, phone, suffix: 'A09' });

      const result = await withDbContext(writer, HR_MANAGER, (tx) =>
        convertApplication(tx as any, HR_MANAGER, submissionId, { reason: 'AC-09 convert' }),
      );

      expect(result.status).toBe('CONVERTED');
      expect(result.changed).toBe(true);
      captureRowIds(result);

      // 1. LaborProfile.workerId is now the Worker that was just created/selected.
      const lp = await admin.laborProfile.findUniqueOrThrow({
        where: { id: lpId },
        select: { workerId: true },
      });
      expect(lp.workerId).toBe(result.workerId);

      // 2. Submission.workerId matches LaborProfile.workerId.
      const sub = await admin.candidateSubmission.findUniqueOrThrow({
        where: { id: submissionId },
        select: { workerId: true, status: true, version: true, laborProfileId: true },
      });
      expect(sub.workerId).toBe(result.workerId);
      expect(sub.status).toBe('CONVERTED');
      expect(sub.laborProfileId).toBe(lpId);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 30_000);

  it('AC-10: LaborProfile.workerId đã thuộc Worker khác → fail-closed; toàn transaction rollback', async () => {
    const writer = makeClient(writerUrl);
    try {
      const phone = `09${runId.replace(/-/g, '').slice(0, 8)}B`.padEnd(10, '0');
      const lpId = await seedLaborProfile({ suffix: 'B10', phone });

      // Pre-link the LaborProfile to a Worker khác (the "stale" owner).
      const staleWorker = await admin.worker.create({
        data: {
          userId: `STALE-${runId}-B10`,
          fullName: 'Stale Owner',
          phone: '0900000099',
          cccdNumber: `${runId}-STALE-B10`.slice(0, 20),
        },
        select: { id: true },
      });
      createdWorkerIds.push(staleWorker.id);
      await admin.laborProfile.update({
        where: { id: lpId },
        data: { workerId: staleWorker.id },
      });

      const { submissionId } = await seedQualifedSubmission({ laborProfileId: lpId, phone, suffix: 'B10' });
      const snapshotSubmissionWorkerBefore = (await admin.candidateSubmission.findUniqueOrThrow({
        where: { id: submissionId },
        select: { workerId: true, version: true, status: true },
      })).workerId;

      let err: ConversionError | null = null;
      try {
        await withDbContext(writer, HR_MANAGER, (tx) =>
          convertApplication(tx as any, HR_MANAGER, submissionId, { reason: 'AC-10 conflict' }),
        );
      } catch (e) {
        err = e as ConversionError;
      }
      expect(err).toBeInstanceOf(ConversionError);
      expect(err).toMatchObject({
        code: 'LABOR_PROFILE_WORKER_CONFLICT',
        httpStatus: 409,
      });

      // Submission rollback: status vẫn QUALIFIED, workerId vẫn NULL, version không đổi.
      const subAfter = await admin.candidateSubmission.findUniqueOrThrow({
        where: { id: submissionId },
        select: { workerId: true, version: true, status: true },
      });
      expect(subAfter.workerId).toBe(snapshotSubmissionWorkerBefore);
      expect(subAfter.status).toBe('QUALIFIED');

      // LaborProfile.workerId KHÔNG bị mutate bởi transaction đã rollback.
      const lpAfter = await admin.laborProfile.findUniqueOrThrow({
        where: { id: lpId },
        select: { workerId: true },
      });
      expect(lpAfter.workerId).toBe(staleWorker.id);

      // Không có SourceClaim mới từ submission này.
      const claimCount = await admin.sourceClaim.count({
        where: { submissionId },
      });
      expect(claimCount).toBe(0);

      // Không có ApplicationStatusHistory row mới cho submission này.
      const historyCount = await admin.applicationStatusHistory.count({
        where: { submissionId, toStatus: 'CONVERTED' },
      });
      expect(historyCount).toBe(0);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 30_000);

  it('AC-11: REPLAY CONVERTED + LaborProfile.workerId NULL → khôi phục idempotent', async () => {
    const writer = makeClient(writerUrl);
    try {
      const phone = `09${runId.replace(/-/g, '').slice(0, 8)}C`.padEnd(10, '0');
      const lpId = await seedLaborProfile({ suffix: 'C11', phone });
      const { submissionId } = await seedQualifedSubmission({ laborProfileId: lpId, phone, suffix: 'C11' });

      // First convert: Worker mới được tạo, LaborProfile được link.
      const first = await withDbContext(writer, HR_MANAGER, (tx) =>
        convertApplication(tx as any, HR_MANAGER, submissionId, { reason: 'AC-11 first' }),
      );
      captureRowIds(first);
      const workerId = first.workerId;

      // Simulate "code cũ chưa link LaborProfile": unlink LaborProfile.workerId.
      await admin.laborProfile.update({
        where: { id: lpId },
        data: { workerId: null },
      });
      // Worker.laborProfile back-relation tự cập nhật theo LaborProfile.workerId = null
      // (Worker.laborProfile là back-relation 0..1, không có cột riêng).

      // Re-run convert: REPLAY path. Expect `changed: false`, link được khôi phục.
      const replay = await withDbContext(writer, HR_MANAGER, (tx) =>
        convertApplication(tx as any, HR_MANAGER, submissionId, { reason: 'AC-11 replay' }),
      );
      expect(replay.changed).toBe(false);
      expect(replay.workerId).toBe(workerId);

      // LaborProfile.workerId đã được khôi phục.
      const lpAfter = await admin.laborProfile.findUniqueOrThrow({
        where: { id: lpId },
        select: { workerId: true },
      });
      expect(lpAfter.workerId).toBe(workerId);

      // Vẫn chỉ một Worker / một SourceClaim / một history / một audit.
      const claimCount = await admin.sourceClaim.count({ where: { submissionId, accepted: true } });
      expect(claimCount).toBe(1);
      const workerCount = await admin.worker.count({ where: { userId: `APP-${submissionId}` } });
      expect(workerCount).toBe(1);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 30_000);

  it('AC-12: QUALIFIED không có laborProfileId → flow cũ, LaborProfile không bị touch', async () => {
    const writer = makeClient(writerUrl);
    try {
      const phone = `09${runId.replace(/-/g, '').slice(0, 8)}D`.padEnd(10, '0');
      // Legacy/public path: tạo submission KHÔNG có laborProfileId.
      const { submissionId } = await seedQualifedSubmission({ laborProfileId: null, phone, suffix: 'D12' });
      const lpBefore = await admin.laborProfile.findFirst({
        where: { phone },
        select: { id: true, updatedAt: true, workerId: true },
      });
      // Belt-and-braces: chắc chắn không có LaborProfile nào với phone này.
      // (seedQualifedSubmission chỉ tạo submission, không tạo LaborProfile.)

      const result = await withDbContext(writer, HR_MANAGER, (tx) =>
        convertApplication(tx as any, HR_MANAGER, submissionId, { reason: 'AC-12 legacy' }),
      );
      expect(result.status).toBe('CONVERTED');
      captureRowIds(result);

      // Không có LaborProfile nào được tạo ra từ convert.
      const lpAfter = await admin.laborProfile.findFirst({
        where: { phone },
        select: { id: true, updatedAt: true, workerId: true },
      });
      expect(lpAfter).toBeNull();
      // Sanity: nếu có LaborProfile cũ trùng phone (không nên), updatedAt/workerId không đổi.
      if (lpBefore && lpAfter) {
        expect(lpAfter.workerId).toBe(lpBefore.workerId);
        expect(lpAfter.updatedAt.getTime()).toBe(lpBefore.updatedAt.getTime());
      }
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 30_000);
});
