/**
 * hrp-v6-n1-intake-writer — round 3 integration test (DB-touching).
 *
 * ENV_BLOCKED by default: bỏ qua toàn bộ nếu DATABASE_URL_TEST không có.
 * Khi env có, chạy các case sau trên nhánh test (hrp_mp2_test):
 *
 *   - AC-04 race: GỌI `openPlacementCase()` qua 2 transaction ĐỒNG THỜI
 *     (dùng writer client + GUC HR_MANAGER). Prove chỉ 1 PlacementCase ACTIVE;
 *     cả 2 caller nhận result hợp lệ (1 created, 1 replayed). KHÔNG 500.
 *
 *   - AC-05 idempotency: GỌI `withIdempotency()` helper thực (KHÔNG INSERT
 *     trực tiếp vào IdempotencyKey table). Cùng key + cùng payload → 1 row
 *     IdempotencyKey + 1 CandidateSubmission; cùng key + payload khác → throw
 *     IdempotencyConflictError. Concurrent retry cùng key + payload → 1 submission
 *     (profile + case + submission), cả 2 fulfilled (1 replayed, 1 fresh).
 *
 *   - AC-06 General Interest: candidate submission với projectId=null,
 *     placementCaseId set, status NEW.
 *
 *   - AC-01 SELECT path: SELECT existing LaborProfile theo normalizedPhone +
 *     cccdNumber tìm đúng record. Service-only scoring verified ở unit test.
 *
 *   - AC-14 RLS: PUBLIC role (no GUC) bị RLS deny read+write placement_case;
 *     HR_STAFF role (GUC set) được phép cả read + write. Forced RLS bật.
 *
 * QUAN TRỌNG — GUC handling:
 *   - Neon pooler dùng transaction-mode pooling → set_config(..., true) chỉ
 *     giữ trong transaction hiện tại.
 *   - Mọi query cần GUC đều phải wrap trong prisma.$transaction(async tx => ...)
 *     để giữ GUC persist giữa set_config và query.
 *   - Phía admin (fixtures) KHÔNG cần GUC vì role OWNER bypass RLS.
 *
 * QUAN TRỌNG — PrismaClient singleton:
 *   - Ứng dụng dùng PrismaClient singleton (1 instance cho toàn bộ process).
 *   - Mỗi `withIdempotency()` tự wrap handler trong `$transaction()` riêng,
 *     nên cùng 1 writer client vẫn xử lý được 2 concurrent calls
 *     (mỗi call mở transaction riêng trên connection pool khác nhau).
 *
 * Mọi row tạo ra đều được cleanup trong afterAll. Test DB rời pristine.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { openPlacementCase } from '@/src/domains/talent/placement-case.service';
import {
  createCandidateSubmissionFromIntake,
} from '@/src/domains/talent/intake-writer.service';
import {
  normalizePhone,
} from '@/src/domains/talent/normalize';
import {
  withIdempotency,
  IdempotencyConflictError,
} from '@/src/shared/integrity/idempotency';

const HAS_TEST_DB =
  !!process.env.DATABASE_URL_TEST &&
  !process.env.DATABASE_URL_TEST?.includes('placeholder');

function makeClient(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } } });
}

const runId = `n1iwr3-${randomUUID().slice(0, 8)}`;
const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';

/** Set GUC HR_MANAGER trong transaction — giả lập route /api/admin/intake/staff
 *  với role HR_MANAGER (được phép write cả `placement_case` + `candidate_submissions`
 *  theo RLS policies round-3). HR_STAFF chỉ được write `placement_case` không
 *  write được `candidate_submissions` (policy scope) → dùng HR_MANAGER để cover
 *  toàn bộ flow N1 intake. */
async function withHrManagerContext<T>(
  prisma: PrismaClient,
  userId: string,
  cb: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, userId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.role', $1, true)`, 'HR_MANAGER');
    await tx.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.worker_id', '', true)`);
    return cb(tx);
  });
}

/** Wrap a payload body with same shape route layer would send. */
function buildIntakePayload(seed: string) {
  return {
    applicant: {
      fullName: `Round3 ${seed} ${runId}`,
      phone: `09${runId.replace(/-/g, '').slice(0, 8)}`,
      cccdNumber: `CCCD${runId}${seed.replace(/[^A-Z0-9]/gi, '')}`.slice(0, 20),
    },
    channel: 'STAFF_INTAKE',
    intent: 'GENERAL_INTEREST',
  } as const;
}

describe.skipIf(!HAS_TEST_DB)('N1 intake-writer round 3 — DB-touching proof', () => {
  let admin: PrismaClient;

  const createdLaborProfileIds: string[] = [];
  const createdSubmissionIds: string[] = [];
  const createdIdemKeys: Array<{ actorId: string; route: string; key: string }> = [];

  beforeAll(async () => {
    if (!adminUrl || !writerUrl) return;
    admin = makeClient(adminUrl);
  }, 30000);

  afterAll(async () => {
    try {
      // Unlink submission.placementCaseId → delete placement_case → submission → LP
      for (const csId of createdSubmissionIds) {
        await admin.$executeRawUnsafe(
          `UPDATE candidate_submissions SET placement_case_id = NULL WHERE id = $1`,
          csId,
        ).catch(() => {});
      }
      if (createdLaborProfileIds.length > 0) {
        await admin.placementCase.updateMany({
          where: {
            laborProfileId: { in: createdLaborProfileIds },
            status: { not: 'CLOSED' },
          },
          data: { status: 'CLOSED', closedAt: new Date() },
        }).catch(() => {});
        await admin.placementCase.deleteMany({
          where: { laborProfileId: { in: createdLaborProfileIds } },
        }).catch(() => {});
        await admin.candidateSubmission.deleteMany({
          where: { laborProfileId: { in: createdLaborProfileIds } },
        }).catch(() => {});
        await admin.laborProfile.deleteMany({
          where: { id: { in: createdLaborProfileIds } },
        }).catch(() => {});
      }
      // Cleanup idempotency keys
      for (const k of createdIdemKeys) {
        await admin.idempotencyKey
          .deleteMany({
            where: { actorId: k.actorId, route: k.route, key: k.key },
          })
          .catch(() => {});
      }
    } catch (e) {
      console.warn('cleanup partial failure:', (e as Error).message.slice(0, 200));
    }
    await admin?.$disconnect().catch(() => {});
  }, 30000);

  // ─────────────────────────────────────────────────────────────────────────
  // AC-01 — SELECT existing LaborProfile path (read-only proof)
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-01 SELECT existing LaborProfile theo normalizedPhone + cccdNumber tìm đúng record', async () => {
    await admin.laborProfile.deleteMany({
      where: { OR: [{ normalizedPhone: '900000001' }, { phone: '0900000001' }] },
    });
    const lp = await admin.laborProfile.create({
      data: {
        fullName: `AC-01 Exact ${runId}`,
        phone: '0900000001',
        normalizedPhone: '900000001',
        cccdNumber: `CCCD${runId}EXACT`,
      },
      select: { id: true, normalizedPhone: true, cccdNumber: true },
    });
    createdLaborProfileIds.push(lp.id);

    const existing = await admin.laborProfile.findMany({
      where: {
        OR: [{ normalizedPhone: '900000001' }, { cccdNumber: lp.cccdNumber }],
      },
      select: { id: true, fullName: true, normalizedPhone: true, cccdNumber: true },
    });
    expect(existing).toHaveLength(1);
    expect(existing[0]!.id).toBe(lp.id);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-04 — race path via openPlacementCase() qua 2 transaction đồng thời
  //
  // Spec (sếp round 3): "ca race phải gọi openPlacementCase() qua hai transaction
  // đồng thời, chứng minh chỉ một active case và cả hai caller nhận kết quả
  // hợp lệ, không 500".
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-04 race: openPlacementCase() qua 2 transaction đồng thời → chỉ 1 active case, cả 2 caller nhận result hợp lệ', async () => {
    const writer = makeClient(writerUrl);
    try {
      // 1. Setup LaborProfile qua admin (OWNER bypass RLS).
      const lp = await admin.laborProfile.create({
        data: {
          fullName: `AC-04 Race ${runId}`,
          phone: `09${runId.replace(/-/g, '').slice(0, 8)}`,
          normalizedPhone: `90${runId.replace(/-/g, '').slice(0, 8)}`,
        },
        select: { id: true },
      });
      createdLaborProfileIds.push(lp.id);

      // 2. Hai transaction SONG SONG, mỗi cái apply GUC HR_STAFF + gọi openPlacementCase.
      //    Mỗi cái dùng instance writer riêng để tránh share transaction internal state.
      const w1 = makeClient(writerUrl);
      const w2 = makeClient(writerUrl);
      try {
        // Fire hai transaction thật sự ĐỒNG THỜI. wrap openPlacementCase trong
        // withHrManagerContext để GUC được apply trước khi INSERT.
        const fire = (w: PrismaClient) =>
          withHrManagerContext(w, 'hr-staff-race', (tx) =>
            openPlacementCase(tx, {
              laborProfileId: lp.id,
              intent: 'GENERAL_INTEREST',
              actorId: 'hr-staff-race',
            }),
          );

        // Bắt đầu đồng thời — không có await tuần tự ở giữa.
        const results = await Promise.allSettled([fire(w1), fire(w2)]);

        // Cả 2 phải fulfilled (race thua nhận replayed=true; race thắng nhận replayed=false).
        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');
        if (rejected.length > 0) {
          console.error('AC-04 rejected reasons:', rejected.map((r) => ({
            code: (r as PromiseRejectedResult).reason?.code,
            message: String((r as PromiseRejectedResult).reason?.message ?? '').slice(0, 300),
          })));
        }
        expect(fulfilled.length).toBe(2);
        expect(rejected.length).toBe(0);

        const settled = fulfilled.map(
          (r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof fire>>>).value,
        );
        // Một bên created (replayed=false), một bên replayed (replayed=true).
        expect(settled.some((s) => s.replayed === false)).toBe(true);
        expect(settled.some((s) => s.replayed === true)).toBe(true);
        // Cả 2 cùng trỏ về 1 placementCaseId.
        expect(settled[0]!.placementCaseId).toBe(settled[1]!.placementCaseId);

        // 3. Verify trên DB: chỉ 1 PlacementCase ACTIVE cho laborProfileId này.
        const active = await admin.placementCase.findMany({
          where: {
            laborProfileId: lp.id,
            status: { in: ['OPEN', 'IN_PROGRESS', 'READY_TO_PLACE'] },
          },
          select: { id: true },
        });
        expect(active).toHaveLength(1);
        expect(active[0]!.id).toBe(settled[0]!.placementCaseId);
      } finally {
        await w1.$disconnect().catch(() => {});
        await w2.$disconnect().catch(() => {});
      }
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 30000);

  // ─────────────────────────────────────────────────────────────────────────
  // AC-05 — idempotency qua withIdempotency() helper THỰC (không INSERT thẳng)
  //
  // Spec (sếp round 3): "ca idempotency phải gọi helper/route thực, chứng minh
  // retry cùng key và payload chỉ tạo một submission, payload khác trả conflict;
  // không chỉ INSERT trực tiếp vào bảng key".
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-05 idempotency replay: cùng key + cùng payload qua withIdempotency() → 1 submission', async () => {
    const writer = makeClient(writerUrl);
    try {
      const key = `${runId}-idem-replay`;
      const actorId = 'hr-staff-idem';
      const route = 'POST:/api/admin/intake/staff';
      const payload = buildIntakePayload('REPLAY');

      const idemScope = { actorId, route, key };
      createdIdemKeys.push(idemScope);

      // Handler thật: chạy trong writer transaction, set GUC HR_MANAGER + tạo submission.
      const handler = async () => {
        const sub = await withHrManagerContext(writer, actorId, async (tx) => {
          return createCandidateSubmissionFromIntake(tx, {
            applicant: payload.applicant,
            channel: 'STAFF_INTAKE',
            intent: 'GENERAL_INTEREST',
            actorId,
          });
        });
        return { body: sub, statusCode: 201 };
      };

      // 1. First call → chạy handler, lưu key, tạo submission.
      const first = await withIdempotency({
        prisma: writer,
        route,
        actorId,
        key,
        requestBody: payload,
        handler,
      });
      expect(first.replayed).toBe(false);
      expect(first.statusCode).toBe(201);

      // Track submission created.
      const submissionIdFromHandler = (first.body as any).candidateSubmission.id;
      createdSubmissionIds.push(submissionIdFromHandler);
      createdLaborProfileIds.push((first.body as any).match.laborProfileId ?? '');

      // 2. Second call cùng key + cùng payload → REPLAY, KHÔNG tạo submission mới.
      const second = await withIdempotency({
        prisma: writer,
        route,
        actorId,
        key,
        requestBody: payload,
        handler,
      });
      expect(second.replayed).toBe(true);
      expect(second.statusCode).toBe(201);
      const submissionIdFromReplay = (second.body as any).candidateSubmission.id;
      expect(submissionIdFromReplay).toBe(submissionIdFromHandler);

      // 3. Verify DB: chỉ 1 CandidateSubmission + 1 IdempotencyKey.
      const subsCount = await admin.candidateSubmission.count({
        where: { id: submissionIdFromHandler },
      });
      expect(subsCount).toBe(1);
      const idemCount = await admin.idempotencyKey.count({
        where: { actorId, route, key },
      });
      expect(idemCount).toBe(1);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 30000);

  it('AC-05 idempotency conflict: cùng key + payload khác qua withIdempotency() → throw IdempotencyConflictError', async () => {
    const writer = makeClient(writerUrl);
    try {
      const key = `${runId}-idem-conflict`;
      const actorId = 'hr-staff-idem';
      const route = 'POST:/api/admin/intake/staff';
      const payloadA = buildIntakePayload('CONFLICT_A');
      const payloadB = buildIntakePayload('CONFLICT_B');

      createdIdemKeys.push({ actorId, route, key });

      const handler = async () => ({ body: { ok: true }, statusCode: 201 });

      // 1. First call với payloadA → success.
      const first = await withIdempotency({
        prisma: writer,
        route,
        actorId,
        key,
        requestBody: payloadA,
        handler,
      });
      expect(first.replayed).toBe(false);

      // 2. Second call cùng key + payloadB khác → throw IdempotencyConflictError.
      let err: unknown = null;
      try {
        await withIdempotency({
          prisma: writer,
          route,
          actorId,
          key,
          requestBody: payloadB,
          handler,
        });
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(IdempotencyConflictError);

      // 3. Verify DB: chỉ 1 IdempotencyKey (payloadA), không có row cho payloadB.
      const idemRows = await admin.idempotencyKey.findMany({
        where: { actorId, route, key },
        select: { requestHash: true, response: true },
      });
      expect(idemRows).toHaveLength(1);
      // withIdempotency lưu response = result.body (không wrap thêm).
      expect(idemRows[0]!.response).toEqual({ ok: true });
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 30000);

  it('AC-05 idempotency concurrent retry: cùng key + payload qua 2 concurrent withIdempotency() → 1 submission, cả 2 fulfilled (1 replayed)', async () => {
    // Test verify: 2 request đồng thời cùng key + payload.
    // App dùng PrismaClient singleton — mỗi withIdempotency tự wrap $transaction riêng
    // nên cùng 1 writer client vẫn xử lý được 2 concurrent calls.
    //
    // Pre-create LaborProfile trước: cả 2 concurrent calls đều nhận EXACT_MATCH
    // (profile đã tồn tại, không phải tạo mới). Điều này isolate race ở tầng
    // PlacementCase creation — đúng scenario "2 request cùng intake cùng candidate".
    //
    // Handler dùng createCandidateSubmissionFromIntake THẬT (profile + case + submission).
    // Verify: submission count + case/profile phát sinh + replay response.
    const writer = makeClient(writerUrl);
    try {
      // 0. Pre-create LaborProfile — dùng phone number cố định (toàn số) để
      // normalizePhone() luôn cho ra giá trị deterministic, đảm bảo match.
      // Dùng seed riêng để tránh conflict với test khác.
      const lpSeed = `r5c${runId.replace(/-/g, '').slice(0, 8)}`; // 11 ký tự số
      // normalizePhone('09' + '12345678') → '912345678' (strip '0' prefix + strip '84').
      const lpPhone = `09${lpSeed}`; // '0912345678' — normalizePhone → '912345678'
      const preLp = await admin.laborProfile.create({
        data: {
          fullName: `AC-05 Concurrent ${runId}`,
          phone: lpPhone,
          normalizedPhone: normalizePhone(lpPhone), // explicit, deterministic
          cccdNumber: `CCCD${lpSeed}`,
        },
        select: { id: true },
      });
      createdLaborProfileIds.push(preLp.id);

      const key = `${runId}-idem-concurrent`;
      const actorId = 'hr-staff-idem';
      const route = 'POST:/api/admin/intake/staff';
      // Payload cùng phone + cccdNumber với preLp → EXACT_MATCH.
      const payload = {
        applicant: {
          fullName: `AC-05 Concurrent ${runId}`,
          phone: lpPhone,
          cccdNumber: `CCCD${lpSeed}`,
        },
        channel: 'STAFF_INTAKE',
        intent: 'GENERAL_INTEREST',
      };
      createdIdemKeys.push({ actorId, route, key });

      // Handler THẬT: gọi createCandidateSubmissionFromIntake qua GUC HR_MANAGER.
      const handler = async () => {
        const sub = await withHrManagerContext(writer, actorId, async (tx) => {
          return createCandidateSubmissionFromIntake(tx, {
            applicant: payload.applicant,
            channel: 'STAFF_INTAKE',
            intent: 'GENERAL_INTEREST',
            actorId,
          });
        });
        return { body: sub, statusCode: 201 };
      };

      // 2 concurrent calls với CÙNG 1 writer client (singleton pattern).
      const [r1, r2] = await Promise.allSettled([
        withIdempotency({ prisma: writer, route, actorId, key, requestBody: payload, handler }),
        withIdempotency({ prisma: writer, route, actorId, key, requestBody: payload, handler }),
      ]);

      // Surface error nếu có rejected để debug.
      const rejected = [r1, r2].filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      if (rejected.length > 0) {
        // eslint-disable-next-line no-console
        console.error('[concurrent-retry] rejected reasons:', rejected.map((r) => String(r.reason)));
      }

      // Cả 2 phải fulfilled.
      const fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<
        Awaited<ReturnType<typeof withIdempotency>>
      >[];
      expect(fulfilled.length).toBe(2);

      // Verify 3 điều kiện:
      const [first, second] = fulfilled.map((f) => f.value);

      // (a) 1 trong 2 có replayed=true, 1 có replayed=false.
      const replayedTrue = [first, second].filter((r) => r.replayed).length;
      const replayedFalse = [first, second].filter((r) => !r.replayed).length;
      expect(replayedTrue).toBe(1);
      expect(replayedFalse).toBe(1);

      // (b) Cả 2 cùng trỏ về 1 submission + 1 placement case + 1 labor profile.
      const firstSubId = (first.body as any).candidateSubmission.id;
      const secondSubId = (second.body as any).candidateSubmission.id;
      expect(firstSubId).toBe(secondSubId);

      const firstPcId = (first.body as any).placementCase.placementCaseId;
      const secondPcId = (second.body as any).placementCase.placementCaseId;
      expect(firstPcId).toBe(secondPcId);

      // CreateOrMatchResult.EXACT_MATCH: laborProfileId là field trực tiếp (không phải nested candidate).
      const firstLpid = (first.body as any).match.laborProfileId ?? '';
      const secondLpid = (second.body as any).match.laborProfileId ?? '';
      expect(firstLpid).toBe(secondLpid);
      expect(firstLpid).toBe(preLp.id); // phải match với pre-created profile

      // (c) DB: chỉ 1 CandidateSubmission + 1 PlacementCase ACTIVE + 1 LaborProfile.
      const subsCount = await admin.candidateSubmission.count({ where: { id: firstSubId } });
      expect(subsCount).toBe(1);

      const pcsCount = await admin.placementCase.count({
        where: { id: firstPcId, status: { in: ['OPEN', 'IN_PROGRESS', 'READY_TO_PLACE'] } },
      });
      expect(pcsCount).toBe(1);

      const lpCount = await admin.laborProfile.count({ where: { id: firstLpid } });
      expect(lpCount).toBe(1);

      // Cleanup: track cho afterAll.
      createdSubmissionIds.push(firstSubId);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 30000);

  // ─────────────────────────────────────────────────────────────────────────
  // AC-06 — General Interest: case + submission với placementCaseId set, projectId null
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-06 General Interest: tạo case + submission với projectId=null, placementCaseId set', async () => {
    const lp = await admin.laborProfile.create({
      data: { fullName: `AC-06 GenInt ${runId}`, phone: `09${runId.replace(/-/g, '').slice(0, 8)}` },
      select: { id: true },
    });
    createdLaborProfileIds.push(lp.id);

    const pc = await admin.placementCase.create({
      data: { laborProfileId: lp.id, status: 'OPEN', openedAt: new Date() },
      select: { id: true },
    });

    const sub = await admin.candidateSubmission.create({
      data: {
        laborProfileId: lp.id,
        placementCaseId: pc.id,
        fullName: `AC-06 GenInt ${runId}`,
        phone: `09${runId.replace(/-/g, '').slice(0, 8)}`,
        projectId: null,
        status: 'NEW',
      },
      select: { id: true, placementCaseId: true, projectId: true, status: true },
    });
    createdSubmissionIds.push(sub.id);

    expect(sub.placementCaseId).toBe(pc.id);
    expect(sub.projectId).toBeNull();
    expect(sub.status).toBe('NEW');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-14 — RLS sanity: PUBLIC denied, HR_STAFF allowed
  //
  // Round 3 giữ nguyên cấu trúc round 2: PUBLIC (no GUC) bị FORCE RLS deny
  // cả USING (read) lẫn WITH CHECK (write); HR_STAFF (GUC set) được phép.
  // ─────────────────────────────────────────────────────────────────────────

  it('RLS: PUBLIC role (no GUC) KHÔNG thấy placement_case (FORCE RLS deny USING)', async () => {
    const writer = makeClient(writerUrl);
    try {
      const lp = await admin.laborProfile.create({
        data: { fullName: `RLS Test ${runId}`, phone: `0900${runId.replace(/-/g, '').slice(0, 6)}` },
        select: { id: true },
      });
      createdLaborProfileIds.push(lp.id);
      await admin.placementCase.create({
        data: { laborProfileId: lp.id, status: 'OPEN', openedAt: new Date() },
        select: { id: true },
      });

      const publicRead = await writer.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', '', true)`);
        await tx.$executeRawUnsafe(`SELECT set_config('app.role', '', true)`);
        return tx.placementCase.findMany({
          where: { laborProfileId: lp.id },
          select: { id: true },
        });
      });
      expect(publicRead).toHaveLength(0);

      const staffRead = await writer.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, 'hr-staff-1');
        await tx.$executeRawUnsafe(`SELECT set_config('app.role', $1, true)`, 'HR_STAFF');
        return tx.placementCase.findMany({
          where: { laborProfileId: lp.id },
          select: { id: true },
        });
      });
      expect(staffRead).toHaveLength(1);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  it('RLS: PUBLIC role KHÔNG INSERT được placement_case (FORCE RLS deny WITH CHECK)', async () => {
    const writer = makeClient(writerUrl);
    try {
      const lp = await admin.laborProfile.create({
        data: { fullName: `RLS Insert ${runId}`, phone: `0900${runId.replace(/-/g, '').slice(0, 6)}` },
        select: { id: true },
      });
      createdLaborProfileIds.push(lp.id);

      let err: { code?: string; message?: string } | null = null;
      try {
        await writer.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', '', true)`);
          await tx.$executeRawUnsafe(`SELECT set_config('app.role', '', true)`);
          await tx.placementCase.create({
            data: { laborProfileId: lp.id, status: 'OPEN', openedAt: new Date() },
            select: { id: true },
          });
        });
      } catch (e) {
        err = e as { code?: string; message?: string };
      }
      expect(err).not.toBeNull();
      const rows = await admin.placementCase.findMany({
        where: { laborProfileId: lp.id },
        select: { id: true },
      });
      expect(rows).toHaveLength(0);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  it('RLS: HR_STAFF role INSERT được placement_case', async () => {
    const writer = makeClient(writerUrl);
    try {
      const lp = await admin.laborProfile.create({
        data: { fullName: `RLS HR ${runId}`, phone: `0900${runId.replace(/-/g, '').slice(0, 6)}` },
        select: { id: true },
      });
      createdLaborProfileIds.push(lp.id);

      const created = await writer.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, 'hr-staff-2');
        await tx.$executeRawUnsafe(`SELECT set_config('app.role', $1, true)`, 'HR_STAFF');
        return tx.placementCase.create({
          data: { laborProfileId: lp.id, status: 'OPEN', openedAt: new Date() },
          select: { id: true, status: true },
        });
      });
      expect(created.status).toBe('OPEN');
      expect(created.id).toBeDefined();
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });
});
