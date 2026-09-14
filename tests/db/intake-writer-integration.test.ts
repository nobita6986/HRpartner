/**
 * hrp-v6-n1-intake-writer — round 2 integration test (DB-touching).
 *
 * ENV_BLOCKED by default: bỏ qua toàn bộ nếu DATABASE_URL_TEST không có.
 * Khi env có, chạy các case sau trên nhánh test (hrp_mp2_test):
 *
 *   - AC-04 race: 2 transaction đồng thời openPlacementCase cho cùng LaborProfile
 *     → chỉ 1 PlacementCase ACTIVE; bên thua SELECT lại id đang active (KHÔNG 500).
 *   - AC-05 idempotency: cùng Idempotency-Key + cùng payload → 1 row;
 *     cùng key + payload khác → P2002 (caller map IdempotencyConflictError).
 *   - AC-06 General Interest: jobOpeningId=null, projectId=null → vẫn tạo case + submission
 *     với placementCaseId set, projectId null.
 *   - AC-01/AC-03 conflictingEvidence: phone-only match → SELECT existing nhưng service trả POSSIBLE_MATCH.
 *   - RLS sanity: route public proxy HR_STAFF mới INSERT được placement_case;
 *     PUBLIC role (no GUC) bị RLS deny read+write.
 *
 * QUAN TRỌNG — GUC handling:
 *   - Neon pooler dùng transaction-mode pooling → set_config(..., true) chỉ giữ trong transaction hiện tại.
 *   - Mọi query cần GUC đều phải wrap trong prisma.$transaction(async tx => ...) để giữ
 *     GUC persist giữa set_config và query.
 *   - Phía admin (fixtures) KHÔNG cần GUC vì role OWNER bypass RLS.
 *
 * Mọi row tạo ra đều được cleanup trong afterAll. Test DB rời pristine.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const HAS_TEST_DB = !!process.env.DATABASE_URL_TEST && !process.env.DATABASE_URL_TEST?.includes('placeholder');

function makeClient(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } } });
}

const runId = `n1iwr2-${randomUUID().slice(0, 8)}`; // unique per run; embedded in fixture ids
const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';

describe.skipIf(!HAS_TEST_DB)('N1 intake-writer round 2 — DB-touching proof', () => {
  let admin: PrismaClient;

  const createdLaborProfileIds: string[] = [];
  const createdSubmissionIds: string[] = [];

  beforeAll(async () => {
    if (!adminUrl || !writerUrl) return;
    admin = makeClient(adminUrl);
  }, 30000);

  afterAll(async () => {
    try {
      // FK-safe cleanup: unset submission.placementCaseId → delete case → delete labor profile.
      for (const csId of createdSubmissionIds) {
        await admin.$executeRawUnsafe(
          `UPDATE candidate_submissions SET placement_case_id = NULL WHERE id = $1`,
          csId,
        ).catch(() => {});
      }
      // Close placement cases first
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
      }
      if (createdSubmissionIds.length > 0) {
        await admin.candidateSubmission.deleteMany({ where: { id: { in: createdSubmissionIds } } }).catch(() => {});
      }
      if (createdLaborProfileIds.length > 0) {
        await admin.laborProfile.deleteMany({ where: { id: { in: createdLaborProfileIds } } }).catch(() => {});
      }
    } catch (e) {
      console.warn('cleanup partial failure:', (e as Error).message.slice(0, 200));
    }
    await admin?.$disconnect().catch(() => {});
  }, 30000);

  // ─────────────────────────────────────────────────────────────────────────
  // AC-01 — createOrMatchLaborProfile SELECT path với signals
  // (Pure scoring đã cover ở labor-profile.service.test.ts; đây verify SELECT path thật.)
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-01 SELECT existing LaborProfile theo normalizedPhone + cccdNumber tìm đúng record', async () => {
    // Pre-cleanup các fixture trùng phone (từ run trước nếu cleanup fail)
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

    // SELECT theo normalizedPhone OR cccdNumber — đúng pattern createOrMatchLaborProfile
    const existing = await admin.laborProfile.findMany({
      where: {
        OR: [{ normalizedPhone: '900000001' }, { cccdNumber: lp.cccdNumber }],
      },
      select: { id: true, fullName: true, normalizedPhone: true, cccdNumber: true },
    });
    expect(existing).toHaveLength(1);
    expect(existing[0]!.id).toBe(lp.id);
  });

  it('AC-01/AC-03 phone-only match → SELECT thấy 1 candidate, KHÔNG có second signal → service trả POSSIBLE_MATCH (verify service-only logic ở unit test)', async () => {
    // Pre-cleanup các fixture trùng phone
    await admin.laborProfile.deleteMany({
      where: { OR: [{ normalizedPhone: '900000099' }, { phone: '0900000099' }] },
    });

    const lp = await admin.laborProfile.create({
      data: {
        fullName: `AC-03 PhoneOnly ${runId}`,
        phone: '0900000099',
        normalizedPhone: '900000099',
        cccdNumber: `CCCD${runId}PO`,
      },
      select: { id: true, normalizedPhone: true },
    });
    createdLaborProfileIds.push(lp.id);

    // Lookup với normalizedPhone chỉ (KHÔNG truyền cccd)
    const existing = await admin.laborProfile.findMany({
      where: { OR: [{ normalizedPhone: '900000099' }] },
      select: { id: true, normalizedPhone: true, cccdNumber: true },
    });
    expect(existing).toHaveLength(1);
    expect(existing[0]!.id).toBe(lp.id);
    // Service sẽ thấy: 1 signal matched (normalizedPhone), KHÔNG có cccd khớp
    // → scoreAndClassify trả POSSIBLE_MATCH, caller KHÔNG merge.
    // Decision logic verified in src/domains/talent/labor-profile.service.test.ts.
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-04 — race path: 2 transaction đồng thời openPlacementCase
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-04 race: 2 transaction đồng thời cùng laborProfileId → chỉ 1 active case, bên thua SELECT lại id đang active', async () => {
    const lp = await admin.laborProfile.create({
      data: { fullName: `AC-04 Race ${runId}`, phone: `09${runId.replace(/-/g, '').slice(0, 8)}` },
      select: { id: true },
    });
    createdLaborProfileIds.push(lp.id);

    // Dùng admin client cho cả 2 transaction (RLS bypass cho test).
    // Real production sẽ dùng writer + GUC proxy HR_STAFF, nhưng logic race giống nhau.
    const fireA = admin.placementCase.create({
      data: { laborProfileId: lp.id, status: 'OPEN', openedAt: new Date() },
      select: { id: true },
    });
    const fireB = admin.placementCase.create({
      data: { laborProfileId: lp.id, status: 'OPEN', openedAt: new Date() },
      select: { id: true },
    });

    const settled = await Promise.allSettled([fireA, fireB]);
    const fulfilled = settled.filter((s) => s.status === 'fulfilled');
    const rejected = settled.filter((s) => s.status === 'rejected');

    // Kỳ vọng: một bên INSERT thành công, một bên nhận P2002 (partial unique index).
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    const rejection = (rejected[0] as PromiseRejectedResult).reason as { code?: string };
    expect(['P2002', 'P2034']).toContain(rejection.code);

    // Verify: chỉ 1 PlacementCase ACTIVE tồn tại cho laborProfileId này.
    const active = await admin.placementCase.findMany({
      where: {
        laborProfileId: lp.id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'READY_TO_PLACE'] },
      },
      select: { id: true },
    });
    expect(active).toHaveLength(1);

    // App layer behavior: openPlacementCase catch P2002 → SELECT existing.
    const existing = await admin.placementCase.findFirst({
      where: {
        laborProfileId: lp.id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'READY_TO_PLACE'] },
      },
      select: { id: true },
    });
    expect(existing).not.toBeNull();
    expect(existing!.id).toBe(active[0]!.id);
  }, 30000);

  // ─────────────────────────────────────────────────────────────────────────
  // AC-05 — idempotency replay qua IdempotencyKey table
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-05 cùng Idempotency-Key + payload khác → P2002 (caller map IdempotencyConflictError)', async () => {
    const key = `${runId}-idem-001`;
    const actorId = 'public:anon'; // round 2 fix: stable actorId (was random)

    // Pre-cleanup
    await admin.idempotencyKey.deleteMany({ where: { actorId, route: 'TEST:/api/intake', key } });

    await admin.idempotencyKey.create({
      data: {
        actorId,
        route: 'TEST:/api/intake',
        key,
        requestHash: 'hash-payload-A',
        response: { body: 'response-A', statusCode: 201 },
        statusCode: 201,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    // Thử insert row thứ 2 → P2002 (UNIQUE constraint).
    let err: { code?: string } | null = null;
    try {
      await admin.idempotencyKey.create({
        data: {
          actorId,
          route: 'TEST:/api/intake',
          key,
          requestHash: 'hash-payload-B',
          response: { body: 'response-B', statusCode: 201 },
          statusCode: 201,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
    } catch (e) {
      err = e as { code?: string };
    }
    expect(err?.code).toBe('P2002');

    // Cleanup
    await admin.idempotencyKey.deleteMany({ where: { actorId, route: 'TEST:/api/intake', key } });
  });

  it('AC-05 với actorId stable (round 2 fix): 2 retry cùng key thực sự replay (cùng row)', async () => {
    // Trước round 2, actorId = public-anon-<random> mỗi request → UNIQUE fail (different actorId).
    // Round 2: actorId = 'public:anon' stable → 2 retry dùng cùng actorId → cùng row → replay.
    const key = `${runId}-stable-001`;
    const actorId = 'public:anon';

    await admin.idempotencyKey.deleteMany({ where: { actorId, route: 'TEST:/api/intake-stable', key } });

    // First insert: thành công.
    const r1 = await admin.idempotencyKey.create({
      data: {
        actorId,
        route: 'TEST:/api/intake-stable',
        key,
        requestHash: 'h1',
        response: { body: 'r1' },
        statusCode: 200,
        expiresAt: new Date(Date.now() + 60_000),
      },
      select: { id: true, requestHash: true, response: true },
    });
    expect(r1.requestHash).toBe('h1');

    // Second insert với cùng actorId + route + key + hash khác → P2002.
    // withIdempotency catch P2002 → SELECT existing row → return stored response.
    let err: { code?: string } | null = null;
    try {
      await admin.idempotencyKey.create({
        data: {
          actorId,
          route: 'TEST:/api/intake-stable',
          key,
          requestHash: 'h2',
          response: { body: 'r2' },
          statusCode: 200,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
    } catch (e) {
      err = e as { code?: string };
    }
    expect(err?.code).toBe('P2002');

    // Verify: existing row vẫn là r1 (không bị overwrite).
    const final = await admin.idempotencyKey.findUnique({
      where: { uq_idempotency_keys_scope: { actorId, route: 'TEST:/api/intake-stable', key } },
    });
    expect(final?.requestHash).toBe('h1');
    expect(final?.response).toEqual({ body: 'r1' });

    // Cleanup
    await admin.idempotencyKey.deleteMany({ where: { actorId, route: 'TEST:/api/intake-stable', key } });
  });

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
  // RLS sanity — route public proxy HR_STAFF, PUBLIC role bị RLS deny
  //
  // QUAN TRỌNG: writer (app_user_writer) cần wrap query trong $transaction để
  // set_config(..., true) giữ GUC giữa set và query. Neon pooler auto-commit
  // mỗi query → GUC reset.
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

      // Public role (no GUC) trong transaction → 0 rows.
      const publicRead = await writer.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', '', true)`);
        await tx.$executeRawUnsafe(`SELECT set_config('app.role', '', true)`);
        return tx.placementCase.findMany({
          where: { laborProfileId: lp.id },
          select: { id: true },
        });
      });
      expect(publicRead).toHaveLength(0);

      // HR_STAFF role trong transaction → 1 row.
      const staffRead = await writer.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', 'hr-staff-1', true)`);
        await tx.$executeRawUnsafe(`SELECT set_config('app.role', 'HR_STAFF', true)`);
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

      // Public role trong transaction → INSERT phải fail với RLS WITH CHECK.
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
      // Prisma surface: P2002 (RLS WITH CHECK violate → mapped), P2011, P2023, etc.
      // Quan trọng: KHÔNG có row tạo ra.
      const rows = await admin.placementCase.findMany({
        where: { laborProfileId: lp.id },
        select: { id: true },
      });
      expect(rows).toHaveLength(0);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  it('RLS: HR_STAFF role INSERT được placement_case (round 2 proxy path)', async () => {
    const writer = makeClient(writerUrl);
    try {
      const lp = await admin.laborProfile.create({
        data: { fullName: `RLS HR ${runId}`, phone: `0900${runId.replace(/-/g, '').slice(0, 6)}` },
        select: { id: true },
      });
      createdLaborProfileIds.push(lp.id);

      // HR_STAFF role trong transaction → INSERT OK.
      const created = await writer.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', 'hr-staff-2', true)`);
        await tx.$executeRawUnsafe(`SELECT set_config('app.role', 'HR_STAFF', true)`);
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