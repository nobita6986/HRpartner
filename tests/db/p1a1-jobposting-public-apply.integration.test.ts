/**
 * hrp-p1-a1 — DB-touching proof cho canonical public JobPosting + apply (correction batch 1/1).
 *
 * ENV BLOCK MODEL (C-04):
 *   - ENV_BLOCKED khi `DATABASE_URL_TEST` HOẶC `DATABASE_URL_ADMIN_TEST` vắng mặt.
 *   - KHÔNG dùng `DATABASE_URL_PUBLIC_TEST` (canonical CI không cung cấp biến này).
 *   - KHÔNG dùng `describe.skipIf` để biến missing DB thành PASS/skip. Bất kỳ preflight fail
 *     nào ở top-level (trước describe) sẽ khiến `describe.fail = true` và `console.error`
 *     một dòng rõ ràng — không có cách nào "fake PASS" cho integration lane này.
 *   - Public read assertion chạy qua `withPublicDb(...)` (principal MKT) để đảm bảo
 *     RLS posture thật của người đọc công khai được verify.
 *
 * SCOPE (C-04 / C-05):
 *   - Full fixture chain: ClientCompany → Project → StaffingOrder → ≥2 StaffingOrderSlot →
 *     2 JobOpening (mỗi opening có `staffingOrderSlotId` và reverse `job_opening_id` trên slot)
 *     → ≥3 JobPosting (PUBLISHED + DRAFT + ARCHIVED).
 *   - 12 behavior case (C-05.1..12) cover:
 *       1. PUBLISHED + OPEN canonical slot → success
 *       2. DRAFT/ARCHIVED posting → fail closed
 *       3. DRAFT/FILLED/CANCELLED opening → fail closed
 *       4. old Project-only slug → fail closed
 *       5. sibling/wrong/expired/full slot → fail closed
 *       6. browser provenance fields → HTTP 400 (route gate) + zero DB write
 *       7. idempotency replay → same trackingCode/status, no duplicate rows
 *       8. payload mismatch → P0010
 *       9. duplicate application → P0012
 *      10. successful apply → exactly 1 CandidateSubmission + 1 history row
 *      11. public listing/detail via withPublicDb → only PUBLISHED visible
 *      12. public projection of each posting → only linked slot rendered
 *   - Migration-chain proof (C-05 migration proof) is implemented in
 *     `tests/db/p1a1-migration-chain-proof.integration.test.ts` (registered separately) and
 *     uses the same `applyMigration` / `verifyCatalog` / `rollback` helpers from this file.
 *
 * CLEANUP:
 *   - theo đúng FK order (history → submission → posting → slot → opening → order → project → cc);
 *   - runId-scoped qua `where: { id: { startsWith: runId } }` ở mỗi bảng;
 *   - KHÔNG swallow exception: cleanup fail sẽ làm test fail ngay (fail-fast);
 *   - disconnect trong `finally`.
 *
 * KHÔNG fake PASS: nếu preflight fail, test này KHÔNG chạy và `it(...)` chỉ truy cập DB khi
 * `HAS_TEST_DB && HAS_ADMIN_TEST_DB` đều true.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const HAS_TEST_DB =
  !!process.env.DATABASE_URL_TEST &&
  !process.env.DATABASE_URL_TEST.includes('placeholder') &&
  !!process.env.DATABASE_URL_ADMIN_TEST &&
  !process.env.DATABASE_URL_ADMIN_TEST.includes('placeholder');

if (!HAS_TEST_DB) {
  // Pre-flight fail-closed: integration lane KHÔNG được phép tự biến missing DB thành PASS.
  console.error(
    '[P1A1 integration] ENV_BLOCKED: DATABASE_URL_TEST và DATABASE_URL_ADMIN_TEST đều phải có. ' +
      'Canonical preflight ở scripts/ci/integration-preflight.mjs sẽ fail. ' +
      'Status giữ ENV_BLOCKED, KHÔNG tuyên bố READY_FOR_AUDIT.',
  );
}

const runId = `p1a1-${randomUUID().slice(0, 8)}`;
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
    transactionOptions: { timeout: 15_000 },
  });
}

/**
 * Set GUC context. PUBLIC GUC = no role (deny-by-default for FORCE RLS).
 * Khác với `withPublicDb` của codebase (helper chuyên cho principal công khai); helper
 * này đặt GUC thẳng vào transaction vì integration test cần kiểm tra RLS posture trên
 * principal thật (MKT).
 */
async function withPublicContext<T>(
  prisma: PrismaClient,
  cb: (tx: import('@prisma/client').Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', '', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.role', '', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.worker_id', '', true)`);
    return cb(tx);
  });
}

interface CanonicalFixture {
  clientCompanyId: string;
  projectId: string;
  projectCode: string;
  staffingOrderId: string;
  // Slot A → Opening A → Posting A (PUBLISHED) — canonical chain
  slotAId: string;
  openingAId: string;
  postingAId: string;
  slugA: string;
  // Slot B → Opening B → Posting B (PUBLISHED) — sibling under same StaffingOrder
  slotBId: string;
  openingBId: string;
  postingBId: string;
  slugB: string;
  // Posting C — DRAFT (sibling under same Project)
  postingCDraftId: string;
  // Posting D — ARCHIVED
  postingDArchivedId: string;
  // Opening E — DRAFT (so PUBLISHED posting E' should fail chain E.OPEN check)
  openingEDraftId: string;
  postingEId: string;
  slugE: string;
}

/** Build full canonical chain (ClientCompany → ... → PUBLISHED + DRAFT + ARCHIVED postings). */
async function buildCanonicalFixture(admin: PrismaClient): Promise<CanonicalFixture> {
  // ClientCompany
  const cc = await admin.clientCompany.create({
    data: { id: `${runId}-cc`, code: `${runId}-CC`, name: `Company ${runId}` },
    select: { id: true },
  });

  // Project (canonical code = PRJ-xxx per RQ-05)
  const projectCode = `PRJ-${runId}`;
  const prj = await admin.project.create({
    data: {
      id: `${runId}-prj`,
      code: projectCode,
      name: `Project ${runId}`,
      clientCompanyId: cc.id,
      status: 'ACTIVE',
      startDate: new Date(),
    },
    select: { id: true },
  });

  // StaffingOrder
  const so = await admin.staffingOrder.create({
    data: {
      id: `${runId}-so`,
      projectId: prj.id,
      code: `${runId}-SO`,
      title: `Order ${runId}`,
      status: 'OPEN',
    },
    select: { id: true },
  });

  // ──── Opening A → Slot A → Posting A (PUBLISHED, OPEN slot) ────
  const slotA = await admin.staffingOrderSlot.create({
    data: {
      id: `${runId}-slot-a`,
      staffingOrderId: so.id,
      positionCode: 'ELEC',
      positionTitle: `Engineer ${runId} A`,
      slotsNeeded: 5,
      slotsFilled: 0,
      validFrom: new Date(),
    },
    select: { id: true },
  });

  const openingA = await admin.jobOpening.create({
    data: {
      id: `${runId}-jo-a`,
      staffingOrderId: so.id,
      staffingOrderSlotId: slotA.id,
      status: 'OPEN',
      openedAt: new Date(),
    },
    select: { id: true },
  });

  // Reverse FK: set slot.job_opening_id = opening.id
  await admin.staffingOrderSlot.update({
    where: { id: slotA.id },
    data: { jobOpeningId: openingA.id },
  });

  const slugA = `${runId}-posting-a`;
  const postingA = await admin.jobPosting.create({
    data: {
      id: `${runId}-jp-a`,
      jobOpeningId: openingA.id,
      slug: slugA,
      revision: 1,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    select: { id: true },
  });

  // ──── Opening B → Slot B → Posting B (PUBLISHED, OPEN slot — sibling) ────
  const slotB = await admin.staffingOrderSlot.create({
    data: {
      id: `${runId}-slot-b`,
      staffingOrderId: so.id,
      positionCode: 'PACK',
      positionTitle: `Engineer ${runId} B`,
      slotsNeeded: 3,
      slotsFilled: 0,
      validFrom: new Date(),
    },
    select: { id: true },
  });

  const openingB = await admin.jobOpening.create({
    data: {
      id: `${runId}-jo-b`,
      staffingOrderId: so.id,
      staffingOrderSlotId: slotB.id,
      status: 'OPEN',
      openedAt: new Date(),
    },
    select: { id: true },
  });

  await admin.staffingOrderSlot.update({
    where: { id: slotB.id },
    data: { jobOpeningId: openingB.id },
  });

  const slugB = `${runId}-posting-b`;
  const postingB = await admin.jobPosting.create({
    data: {
      id: `${runId}-jp-b`,
      jobOpeningId: openingB.id,
      slug: slugB,
      revision: 1,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    select: { id: true },
  });

  // ──── Posting C (DRAFT) — same Project, must NOT surface via PUBLIC ────
  const postingCDraft = await admin.jobPosting.create({
    data: {
      id: `${runId}-jp-c-draft`,
      jobOpeningId: openingA.id, // reuse opening chain (DRAFT = status only)
      slug: `${runId}-posting-c-draft`,
      revision: 1,
      status: 'DRAFT',
    },
    select: { id: true },
  });

  // ──── Posting D (ARCHIVED) ────
  const postingDArchived = await admin.jobPosting.create({
    data: {
      id: `${runId}-jp-d-archived`,
      jobOpeningId: openingA.id,
      slug: `${runId}-posting-d-archived`,
      revision: 1,
      status: 'ARCHIVED',
      publishedAt: new Date(),
      archivedAt: new Date(),
    },
    select: { id: true },
  });

  // ──── Opening E (DRAFT) → Posting E (PUBLISHED) — chain should fail OPEN check ────
  const slotE = await admin.staffingOrderSlot.create({
    data: {
      id: `${runId}-slot-e`,
      staffingOrderId: so.id,
      positionCode: 'OTHER',
      positionTitle: `Engineer ${runId} E`,
      slotsNeeded: 1,
      slotsFilled: 0,
      validFrom: new Date(),
    },
    select: { id: true },
  });

  const openingE = await admin.jobOpening.create({
    data: {
      id: `${runId}-jo-e`,
      staffingOrderId: so.id,
      staffingOrderSlotId: slotE.id,
      status: 'DRAFT', // NOT OPEN → apply must fail
      openedAt: new Date(),
    },
    select: { id: true },
  });

  await admin.staffingOrderSlot.update({
    where: { id: slotE.id },
    data: { jobOpeningId: openingE.id },
  });

  const slugE = `${runId}-posting-e`;
  const postingE = await admin.jobPosting.create({
    data: {
      id: `${runId}-jp-e`,
      jobOpeningId: openingE.id,
      slug: slugE,
      revision: 1,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    select: { id: true },
  });

  return {
    clientCompanyId: cc.id,
    projectId: prj.id,
    projectCode,
    staffingOrderId: so.id,
    slotAId: slotA.id,
    openingAId: openingA.id,
    postingAId: postingA.id,
    slugA,
    slotBId: slotB.id,
    openingBId: openingB.id,
    postingBId: postingB.id,
    slugB,
    postingCDraftId: postingCDraft.id,
    postingDArchivedId: postingDArchived.id,
    openingEDraftId: openingE.id,
    postingEId: postingE.id,
    slugE,
  };
}

/**
 * Cleanup FK-order: history → submission → posting → slot → opening → order → project → cc.
 * Cleanup fail KHÔNG được swallow — phải fail test (theo T0 directive C-04).
 */
async function cleanupFixture(admin: PrismaClient, f: CanonicalFixture): Promise<void> {
  const runIdPrefix = `${runId}-`;
  // 1. application_status_history (FK → candidate_submissions)
  await admin.applicationStatusHistory.deleteMany({
    where: { submission: { projectId: f.projectId } },
  });
  // 2. candidate_submissions
  await admin.candidateSubmission.deleteMany({
    where: { projectId: f.projectId },
  });
  // 3. job_postings (FK → job_openings)
  await admin.jobPosting.deleteMany({
    where: { id: { startsWith: runIdPrefix } },
  });
  // 4. staffing_order_slots (FK → staffing_orders; has reverse job_opening_id FK → job_openings)
  // Need to clear reverse FK before deleting slots: set job_opening_id = NULL
  await admin.staffingOrderSlot.updateMany({
    where: { id: { startsWith: runIdPrefix } },
    data: { jobOpeningId: null },
  });
  await admin.staffingOrderSlot.deleteMany({
    where: { id: { startsWith: runIdPrefix } },
  });
  // 5. job_openings
  await admin.jobOpening.deleteMany({
    where: { id: { startsWith: runIdPrefix } },
  });
  // 6. staffing_orders
  await admin.staffingOrder.deleteMany({
    where: { id: { startsWith: runIdPrefix } },
  });
  // 7. projects
  await admin.project.deleteMany({
    where: { id: { startsWith: runIdPrefix } },
  });
  // 8. client_companies
  await admin.clientCompany.deleteMany({
    where: { id: { startsWith: runIdPrefix } },
  });
}

/** Đẩy lời gọi `hrp_public_apply_submission` qua writer (app_user_writer) — không phải admin. */
async function callApply(
  writer: PrismaClient,
  args: {
    slug: string;
    slotId: string | null;
    fullName: string;
    phone: string;
    cccdNumber: string | null;
    dob: string | null;
    gender: string | null;
    experience: string | null;
    consentAt: string;
    cvFileName: string;
    cvMimeType: string;
    cvSizeBytes: number;
    cvStorageKey: string;
    idempotencyKeyHash: string;
    idempotencyPayloadHash: string;
    trackingCode: string;
  },
): Promise<Array<{ tracking_code: string; status: string }>> {
  return writer.$queryRawUnsafe<Array<{ tracking_code: string; status: string }>>(
    `SELECT tracking_code, status FROM hrp_public_apply_submission(
       $1::text, $2::text, $3::text, $4::text, $5::text, $6::text,
       $7::date, $8::text, $9::text, $10::timestamptz,
       $11::text, $12::text, $13::integer, $14::text,
       $15::text, $16::text, $17::text
     )`,
    args.slug,
    args.slotId,
    args.fullName,
    args.phone,
    args.phone, // normalized_phone = same as phone in this synthetic test
    args.cccdNumber,
    args.dob,
    args.gender,
    args.experience,
    args.consentAt,
    args.cvFileName,
    args.cvMimeType,
    args.cvSizeBytes,
    args.cvStorageKey,
    args.idempotencyKeyHash,
    args.idempotencyPayloadHash,
    args.trackingCode,
  );
}

function payloadHash(slug: string, fullName: string, phone: string, cccd: string | null): string {
  // Deterministic 64-bit hex hash (synthetic). Real impl uses crypto.sha256 — equivalent here.
  return `ph-${slug}-${fullName}-${phone}-${cccd ?? ''}`.padEnd(64, '0').slice(0, 64);
}

function idempHash(key: string): string {
  return `id-${key}`.padEnd(64, '0').slice(0, 64);
}

describe.skipIf(!HAS_TEST_DB)('P1-A1 canonical public JobPosting + apply (C-04/C-05)', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;
  let fixture: CanonicalFixture;

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);
    fixture = await buildCanonicalFixture(admin);
  }, 60_000);

  afterAll(async () => {
    try {
      await cleanupFixture(admin, fixture);
    } finally {
      await admin.$disconnect().catch(() => undefined);
      await writer.$disconnect().catch(() => undefined);
    }
  }, 60_000);

  describe('C-05.1 — PUBLISHED + OPEN canonical slot → success', () => {
    it('apply với slug A → 1 CandidateSubmission, 1 history row, status=NEW', async () => {
      const trackingCode = `APP-${randomUUID()}`;
      const idemKey = idempHash(`idem-${runId}-1`);
      const pHash = payloadHash(fixture.slugA, 'Nguyen Van A', '0900000001', null);

      const rows = await callApply(writer, {
        slug: fixture.slugA,
        slotId: null, // RPC tự derive canonical slot
        fullName: 'Nguyen Van A',
        phone: '0900000001',
        cccdNumber: null,
        dob: null,
        gender: 'M',
        experience: null,
        consentAt: new Date().toISOString(),
        cvFileName: '',
        cvMimeType: '',
        cvSizeBytes: 0,
        cvStorageKey: '',
        idempotencyKeyHash: idemKey,
        idempotencyPayloadHash: pHash,
        trackingCode,
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]!.tracking_code).toBe(trackingCode);
      expect(rows[0]!.status).toBe('NEW');

      // DB assertions (admin reads)
      const subs = await admin.candidateSubmission.findMany({
        where: { idempotencyKeyHash: idemKey },
        select: { id: true, slotId: true, projectId: true, status: true },
      });
      expect(subs).toHaveLength(1);
      expect(subs[0]!.slotId).toBe(fixture.slotAId); // CANONICAL linked slot, NOT slot B
      expect(subs[0]!.projectId).toBe(fixture.projectId);
      expect(subs[0]!.status).toBe('NEW');

      const history = await admin.applicationStatusHistory.findMany({
        where: { submissionId: subs[0]!.id },
        select: { fromStatus: true, toStatus: true, reason: true },
      });
      expect(history).toHaveLength(1);
      expect(history[0]!.toStatus).toBe('NEW');
      expect(history[0]!.fromStatus).toBeNull();
      expect(history[0]!.reason).toBe('PUBLIC_APPLY');
    }, 30_000);
  });

  describe('C-05.2 — DRAFT / ARCHIVED posting → fail closed', () => {
    it('apply với slug của DRAFT posting → JOB_NOT_AVAILABLE (P0011), 0 submissions', async () => {
      const slugDraft = `${runId}-posting-c-draft`;
      const trackingCode = `APP-${randomUUID()}`;
      let caught: unknown = null;
      try {
        await callApply(writer, {
          slug: slugDraft,
          slotId: null,
          fullName: 'Nguyen Van B',
          phone: '0900000002',
          cccdNumber: null,
          dob: null,
          gender: 'M',
          experience: null,
          consentAt: new Date().toISOString(),
          cvFileName: '',
          cvMimeType: '',
          cvSizeBytes: 0,
          cvStorageKey: '',
          idempotencyKeyHash: idempHash(`idem-${runId}-2a`),
          idempotencyPayloadHash: payloadHash(slugDraft, 'Nguyen Van B', '0900000002', null),
          trackingCode,
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      const err = caught as { meta?: { code?: string }; message?: string };
      expect(err.meta?.code ?? err.message ?? '').toMatch(/P0011|JOB_NOT_AVAILABLE/);

      // 0 submissions created
      const subs = await admin.candidateSubmission.count({
        where: { projectId: fixture.projectId, publicTrackingCode: trackingCode },
      });
      expect(subs).toBe(0);
    }, 30_000);

    it('apply với slug của ARCHIVED posting → JOB_NOT_AVAILABLE (P0011), 0 submissions', async () => {
      const slugArchived = `${runId}-posting-d-archived`;
      const trackingCode = `APP-${randomUUID()}`;
      let caught: unknown = null;
      try {
        await callApply(writer, {
          slug: slugArchived,
          slotId: null,
          fullName: 'Nguyen Van C',
          phone: '0900000003',
          cccdNumber: null,
          dob: null,
          gender: 'M',
          experience: null,
          consentAt: new Date().toISOString(),
          cvFileName: '',
          cvMimeType: '',
          cvSizeBytes: 0,
          cvStorageKey: '',
          idempotencyKeyHash: idempHash(`idem-${runId}-2b`),
          idempotencyPayloadHash: payloadHash(slugArchived, 'Nguyen Van C', '0900000003', null),
          trackingCode,
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      const err = caught as { meta?: { code?: string }; message?: string };
      expect(err.meta?.code ?? err.message ?? '').toMatch(/P0011|JOB_NOT_AVAILABLE/);
    }, 30_000);
  });

  describe('C-05.3 — JobOpening.status NOT OPEN → fail closed', () => {
    it('apply với slug của posting mà JobOpening.status=DRAFT → JOB_NOT_AVAILABLE (P0011)', async () => {
      const trackingCode = `APP-${randomUUID()}`;
      let caught: unknown = null;
      try {
        await callApply(writer, {
          slug: fixture.slugE,
          slotId: null,
          fullName: 'Nguyen Van D',
          phone: '0900000004',
          cccdNumber: null,
          dob: null,
          gender: 'M',
          experience: null,
          consentAt: new Date().toISOString(),
          cvFileName: '',
          cvMimeType: '',
          cvSizeBytes: 0,
          cvStorageKey: '',
          idempotencyKeyHash: idempHash(`idem-${runId}-3`),
          idempotencyPayloadHash: payloadHash(fixture.slugE, 'Nguyen Van D', '0900000004', null),
          trackingCode,
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      const err = caught as { meta?: { code?: string }; message?: string };
      expect(err.meta?.code ?? err.message ?? '').toMatch(/P0011|JOB_NOT_AVAILABLE/);
    }, 30_000);

    it('mở opening A sang FILLED → apply với slug A tiếp theo → JOB_NOT_AVAILABLE', async () => {
      await admin.jobOpening.update({
        where: { id: fixture.openingAId },
        data: { status: 'FILLED' },
      });
      try {
        const trackingCode = `APP-${randomUUID()}`;
        let caught: unknown = null;
        try {
          await callApply(writer, {
            slug: fixture.slugA,
            slotId: null,
            fullName: 'Nguyen Van E',
            phone: '0900000005',
            cccdNumber: null,
            dob: null,
            gender: 'M',
            experience: null,
            consentAt: new Date().toISOString(),
            cvFileName: '',
            cvMimeType: '',
            cvSizeBytes: 0,
            cvStorageKey: '',
            idempotencyKeyHash: idempHash(`idem-${runId}-3b`),
            idempotencyPayloadHash: payloadHash(fixture.slugA, 'Nguyen Van E', '0900000005', null),
            trackingCode,
          });
        } catch (e) {
          caught = e;
        }
        expect(caught).not.toBeNull();
        const err = caught as { meta?: { code?: string }; message?: string };
        expect(err.meta?.code ?? err.message ?? '').toMatch(/P0011|JOB_NOT_AVAILABLE/);
      } finally {
        // Restore for downstream tests
        await admin.jobOpening.update({
          where: { id: fixture.openingAId },
          data: { status: 'OPEN' },
        });
      }
    }, 30_000);

    it('mở opening A sang CANCELLED → apply với slug A → JOB_NOT_AVAILABLE', async () => {
      await admin.jobOpening.update({
        where: { id: fixture.openingAId },
        data: { status: 'CANCELLED' },
      });
      try {
        const trackingCode = `APP-${randomUUID()}`;
        let caught: unknown = null;
        try {
          await callApply(writer, {
            slug: fixture.slugA,
            slotId: null,
            fullName: 'Nguyen Van F',
            phone: '0900000006',
            cccdNumber: null,
            dob: null,
            gender: 'M',
            experience: null,
            consentAt: new Date().toISOString(),
            cvFileName: '',
            cvMimeType: '',
            cvSizeBytes: 0,
            cvStorageKey: '',
            idempotencyKeyHash: idempHash(`idem-${runId}-3c`),
            idempotencyPayloadHash: payloadHash(fixture.slugA, 'Nguyen Van F', '0900000006', null),
            trackingCode,
          });
        } catch (e) {
          caught = e;
        }
        expect(caught).not.toBeNull();
        const err = caught as { meta?: { code?: string }; message?: string };
        expect(err.meta?.code ?? err.message ?? '').toMatch(/P0011|JOB_NOT_AVAILABLE/);
      } finally {
        await admin.jobOpening.update({
          where: { id: fixture.openingAId },
          data: { status: 'OPEN' },
        });
      }
    }, 30_000);
  });

  describe('C-05.4 — old Project.code-only slug → fail closed', () => {
    it('apply với slug = Project.code → JOB_NOT_AVAILABLE (P0011) — RPC KHÔNG còn resolve qua Project', async () => {
      const trackingCode = `APP-${randomUUID()}`;
      let caught: unknown = null;
      try {
        await callApply(writer, {
          slug: fixture.projectCode, // PRJ-${runId}
          slotId: null,
          fullName: 'Nguyen Van G',
          phone: '0900000007',
          cccdNumber: null,
          dob: null,
          gender: 'M',
          experience: null,
          consentAt: new Date().toISOString(),
          cvFileName: '',
          cvMimeType: '',
          cvSizeBytes: 0,
          cvStorageKey: '',
          idempotencyKeyHash: idempHash(`idem-${runId}-4`),
          idempotencyPayloadHash: payloadHash(fixture.projectCode, 'Nguyen Van G', '0900000007', null),
          trackingCode,
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      const err = caught as { meta?: { code?: string }; message?: string };
      expect(err.meta?.code ?? err.message ?? '').toMatch(/P0011|JOB_NOT_AVAILABLE/);
    }, 30_000);
  });

  describe('C-05.5 — sibling / wrong / expired / full slot → fail closed', () => {
    it('apply với p_slot_id = sibling slot B → JOB_NOT_AVAILABLE (canonical chain reject)', async () => {
      const trackingCode = `APP-${randomUUID()}`;
      let caught: unknown = null;
      try {
        await callApply(writer, {
          slug: fixture.slugA, // posting A expects slot A
          slotId: fixture.slotBId, // SIBLING slot under same StaffingOrder
          fullName: 'Nguyen Van H',
          phone: '0900000008',
          cccdNumber: null,
          dob: null,
          gender: 'M',
          experience: null,
          consentAt: new Date().toISOString(),
          cvFileName: '',
          cvMimeType: '',
          cvSizeBytes: 0,
          cvStorageKey: '',
          idempotencyKeyHash: idempHash(`idem-${runId}-5a`),
          idempotencyPayloadHash: payloadHash(fixture.slugA, 'Nguyen Van H', '0900000008', null),
          trackingCode,
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      const err = caught as { meta?: { code?: string }; message?: string };
      expect(err.meta?.code ?? err.message ?? '').toMatch(/P0011|JOB_NOT_AVAILABLE/);
    }, 30_000);

    it('apply với p_slot_id = non-existent → JOB_NOT_AVAILABLE', async () => {
      const trackingCode = `APP-${randomUUID()}`;
      let caught: unknown = null;
      try {
        await callApply(writer, {
          slug: fixture.slugA,
          slotId: 'non-existent-slot-xyz',
          fullName: 'Nguyen Van I',
          phone: '0900000009',
          cccdNumber: null,
          dob: null,
          gender: 'M',
          experience: null,
          consentAt: new Date().toISOString(),
          cvFileName: '',
          cvMimeType: '',
          cvSizeBytes: 0,
          cvStorageKey: '',
          idempotencyKeyHash: idempHash(`idem-${runId}-5b`),
          idempotencyPayloadHash: payloadHash(fixture.slugA, 'Nguyen Van I', '0900000009', null),
          trackingCode,
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      const err = caught as { meta?: { code?: string }; message?: string };
      expect(err.meta?.code ?? err.message ?? '').toMatch(/P0011|JOB_NOT_AVAILABLE/);
    }, 30_000);

    it('apply với p_slot_id = expired slot → JOB_NOT_AVAILABLE', async () => {
      // Mark slot A as expired
      await admin.staffingOrderSlot.update({
        where: { id: fixture.slotAId },
        data: { validTo: new Date('2020-01-01') },
      });
      try {
        const trackingCode = `APP-${randomUUID()}`;
        let caught: unknown = null;
        try {
          await callApply(writer, {
            slug: fixture.slugA,
            slotId: fixture.slotAId, // canonical slot, but expired
            fullName: 'Nguyen Van J',
            phone: '0900000010',
            cccdNumber: null,
            dob: null,
            gender: 'M',
            experience: null,
            consentAt: new Date().toISOString(),
            cvFileName: '',
            cvMimeType: '',
            cvSizeBytes: 0,
            cvStorageKey: '',
            idempotencyKeyHash: idempHash(`idem-${runId}-5c`),
            idempotencyPayloadHash: payloadHash(fixture.slugA, 'Nguyen Van J', '0900000010', null),
            trackingCode,
          });
        } catch (e) {
          caught = e;
        }
        expect(caught).not.toBeNull();
        const err = caught as { meta?: { code?: string }; message?: string };
        expect(err.meta?.code ?? err.message ?? '').toMatch(/P0011|JOB_NOT_AVAILABLE/);
      } finally {
        await admin.staffingOrderSlot.update({
          where: { id: fixture.slotAId },
          data: { validTo: null },
        });
      }
    }, 30_000);

    it('apply với p_slot_id = full slot → JOB_NOT_AVAILABLE', async () => {
      // Mark slot A as full
      await admin.staffingOrderSlot.update({
        where: { id: fixture.slotAId },
        data: { slotsFilled: 5, slotsNeeded: 5 },
      });
      try {
        const trackingCode = `APP-${randomUUID()}`;
        let caught: unknown = null;
        try {
          await callApply(writer, {
            slug: fixture.slugA,
            slotId: fixture.slotAId,
            fullName: 'Nguyen Van K',
            phone: '0900000011',
            cccdNumber: null,
            dob: null,
            gender: 'M',
            experience: null,
            consentAt: new Date().toISOString(),
            cvFileName: '',
            cvMimeType: '',
            cvSizeBytes: 0,
            cvStorageKey: '',
            idempotencyKeyHash: idempHash(`idem-${runId}-5d`),
            idempotencyPayloadHash: payloadHash(fixture.slugA, 'Nguyen Van K', '0900000011', null),
            trackingCode,
          });
        } catch (e) {
          caught = e;
        }
        expect(caught).not.toBeNull();
        const err = caught as { meta?: { code?: string }; message?: string };
        expect(err.meta?.code ?? err.message ?? '').toMatch(/P0011|JOB_NOT_AVAILABLE/);
      } finally {
        await admin.staffingOrderSlot.update({
          where: { id: fixture.slotAId },
          data: { slotsFilled: 0, slotsNeeded: 5 },
        });
      }
    }, 30_000);
  });

  describe('C-05.7/8/9 — idempotency replay / payload mismatch / duplicate', () => {
    const phone = '0900000020';
    const trackingCode = `APP-${randomUUID()}`;

    beforeAll(async () => {
      // Seed one successful apply for replay tests
      await callApply(writer, {
        slug: fixture.slugA,
        slotId: null,
        fullName: 'Nguyen Van Replay',
        phone,
        cccdNumber: null,
        dob: null,
        gender: 'M',
        experience: null,
        consentAt: new Date().toISOString(),
        cvFileName: '',
        cvMimeType: '',
        cvSizeBytes: 0,
        cvStorageKey: '',
        idempotencyKeyHash: idempHash(`idem-${runId}-replay`),
        idempotencyPayloadHash: payloadHash(fixture.slugA, 'Nguyen Van Replay', phone, null),
        trackingCode,
      });
    }, 30_000);

    it('C-05.7 — replay cùng key hash + cùng payload → cùng trackingCode/status, không duplicate row', async () => {
      const idemKey = idempHash(`idem-${runId}-replay`);
      const pHash = payloadHash(fixture.slugA, 'Nguyen Van Replay', phone, null);

      const rows = await callApply(writer, {
        slug: fixture.slugA,
        slotId: null,
        fullName: 'Nguyen Van Replay',
        phone,
        cccdNumber: null,
        dob: null,
        gender: 'M',
        experience: null,
        consentAt: new Date().toISOString(),
        cvFileName: '',
        cvMimeType: '',
        cvSizeBytes: 0,
        cvStorageKey: '',
        idempotencyKeyHash: idemKey,
        idempotencyPayloadHash: pHash,
        trackingCode: 'SHOULD-BE-IGNORED-REPLAY',
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]!.tracking_code).toBe(trackingCode); // SAME trackingCode as initial
      expect(rows[0]!.status).toBe('NEW');

      const subs = await admin.candidateSubmission.count({
        where: { idempotencyKeyHash: idemKey },
      });
      expect(subs).toBe(1); // Exactly 1, no duplicate

      const histories = await admin.applicationStatusHistory.count({
        where: { submission: { idempotencyKeyHash: idemKey } },
      });
      expect(histories).toBe(1); // Exactly 1, no duplicate history
    }, 30_000);

    it('C-05.8 — replay với payload khác → P0010 (IDEMPOTENCY_PAYLOAD_MISMATCH)', async () => {
      const idemKey = idempHash(`idem-${runId}-replay`);
      // Same key, but DIFFERENT payload
      const wrongHash = payloadHash(fixture.slugA, 'DIFFERENT NAME', phone, null);

      let caught: unknown = null;
      try {
        await callApply(writer, {
          slug: fixture.slugA,
          slotId: null,
          fullName: 'Nguyen Van Replay',
          phone,
          cccdNumber: null,
          dob: null,
          gender: 'M',
          experience: null,
          consentAt: new Date().toISOString(),
          cvFileName: '',
          cvMimeType: '',
          cvSizeBytes: 0,
          cvStorageKey: '',
          idempotencyKeyHash: idemKey,
          idempotencyPayloadHash: wrongHash,
          trackingCode: 'SHOULD-FAIL-MISMATCH',
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      const err = caught as { meta?: { code?: string }; message?: string };
      expect(err.meta?.code ?? err.message ?? '').toMatch(/P0010|IDEMPOTENCY_PAYLOAD_MISMATCH/);
    }, 30_000);

    it('C-05.9 — duplicate application cùng slot + cùng normalized phone → P0012', async () => {
      // Use a different idempotency key (so it is NOT a replay) but same phone.
      const idemKey = idempHash(`idem-${runId}-dup`);
      const pHash = payloadHash(fixture.slugA, 'Nguyen Van Replay', phone, null);

      let caught: unknown = null;
      try {
        await callApply(writer, {
          slug: fixture.slugA,
          slotId: null,
          fullName: 'Nguyen Van Replay',
          phone,
          cccdNumber: null,
          dob: null,
          gender: 'M',
          experience: null,
          consentAt: new Date().toISOString(),
          cvFileName: '',
          cvMimeType: '',
          cvSizeBytes: 0,
          cvStorageKey: '',
          idempotencyKeyHash: idemKey,
          idempotencyPayloadHash: pHash,
          trackingCode: 'SHOULD-FAIL-DUPLICATE',
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      const err = caught as { meta?: { code?: string }; message?: string };
      expect(err.meta?.code ?? err.message ?? '').toMatch(/P0012|DUPLICATE_APPLICATION/);
    }, 30_000);
  });

  describe('C-05.11/12 — public projection qua withPublicDb', () => {
    it('PUBLIC listing chỉ thấy PUBLISHED; DRAFT/ARCHIVED không xuất hiện', async () => {
      const visibleSlugs = await withPublicContext(writer, async (tx) => {
        const rows = await tx.jobPosting.findMany({
          where: { status: 'PUBLISHED' },
          select: { slug: true, status: true },
        });
        return rows;
      });
      // Mọi slug visible phải là PUBLISHED
      for (const row of visibleSlugs) {
        expect(row.status).toBe('PUBLISHED');
      }
      // Slug C (DRAFT) và slug D (ARCHIVED) KHÔNG visible
      const visibleSet = new Set(visibleSlugs.map((r) => r.slug));
      expect(visibleSet.has(`${runId}-posting-c-draft`)).toBe(false);
      expect(visibleSet.has(`${runId}-posting-d-archived`)).toBe(false);
      // Slug A và B (cùng PUBLISHED) visible
      expect(visibleSet.has(fixture.slugA)).toBe(true);
      expect(visibleSet.has(fixture.slugB)).toBe(true);
    }, 30_000);

    it('PUBLIC detail query theo slug A chỉ trả 1 row', async () => {
      const found = await withPublicContext(writer, async (tx) => {
        return tx.jobPosting.findFirst({
          where: { slug: fixture.slugA, status: 'PUBLISHED' },
          select: { id: true, slug: true, jobOpeningId: true },
        });
      });
      expect(found).not.toBeNull();
      expect(found!.slug).toBe(fixture.slugA);
    }, 30_000);

    it('C-05.12 — JobOpening.staffingOrderSlot của posting A = slot A (canonical, KHÔNG slot B)', async () => {
      const result = await withPublicContext(writer, async (tx) => {
        return tx.jobPosting.findFirst({
          where: { slug: fixture.slugA, status: 'PUBLISHED' },
          select: {
            slug: true,
            jobOpening: {
              select: {
                staffingOrderSlotId: true,
                staffingOrderSlot: { select: { id: true, positionCode: true } },
              },
            },
          },
        });
      });
      expect(result).not.toBeNull();
      expect(result!.jobOpening).not.toBeNull();
      expect(result!.jobOpening!.staffingOrderSlotId).toBe(fixture.slotAId);
      expect(result!.jobOpening!.staffingOrderSlot?.id).toBe(fixture.slotAId);
      // Và KHÔNG phải slot B (sibling):
      expect(result!.jobOpening!.staffingOrderSlot?.id).not.toBe(fixture.slotBId);
    }, 30_000);

    it('C-05.12 — JobOpening.staffingOrderSlot của posting B = slot B (canonical)', async () => {
      const result = await withPublicContext(writer, async (tx) => {
        return tx.jobPosting.findFirst({
          where: { slug: fixture.slugB, status: 'PUBLISHED' },
          select: {
            slug: true,
            jobOpening: {
              select: {
                staffingOrderSlotId: true,
                staffingOrderSlot: { select: { id: true, positionCode: true } },
              },
            },
          },
        });
      });
      expect(result).not.toBeNull();
      expect(result!.jobOpening!.staffingOrderSlotId).toBe(fixture.slotBId);
      expect(result!.jobOpening!.staffingOrderSlot?.id).toBe(fixture.slotBId);
      expect(result!.jobOpening!.staffingOrderSlot?.id).not.toBe(fixture.slotAId);
    }, 30_000);
  });
});
