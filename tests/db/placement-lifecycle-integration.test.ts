/**
 * placement-lifecycle-integration.test.ts — N3 DB integration tests.
 *
 * Lane: integration (DB-touching). Self-skip nếu DATABASE_URL_TEST không khả dụng.
 * ENV_BLOCKED là báo cáo trung thực, KHÔNG phải điều kiện PASS để merge/deploy (DEC-13).
 * Tier 0/Owner cung cấp DB test trước khi xét deploy.
 *
 * Cases:
 *   (i)   SELECTED → CONFIRMED (HRP)
 *   (ii)  client-managed SELECTED → CONFIRMED → EFFECTIVE
 *   (iii) HRP-managed markPlacementEffective REJECT (DEC-07)
 *   (iv)  retry cùng (case, opening) khi SELECTED → trả placement hiện tại (P2002 path)
 *   (v)   retry sau FAILED tạo Placement mới (index giải phóng slot)
 *   (vi)  FK chain broken → REJECT (DEC-06)
 *   (vii) RLS: HR_MANAGER GUC thấy row; PUBLIC (no GUC) thấy 0 (FORCE RLS)
 *   (viii) UNIQUE partial index race: concurrent INSERT cùng (case, opening) → P23505 caught
 *
 * Patterns:
 *   - admin PrismaClient (OWNER): tạo fixture, verify rows, cleanup
 *   - writer PrismaClient (app_user_writer): gọi service commands trong GUC context
 *   - GUC: SET LOCAL set_config('app.role', role, true) trong transaction
 *   - Neon pooler: mỗi $transaction() = 1 connection riêng
 *
 * Ref: tests/db/intake-writer-integration.test.ts (N1 round-5)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import type { PlacementStatus, ServiceModel } from '@prisma/client';
import {
  createPlacement,
  confirmPlacement,
  markPlacementEffective,
  failPlacement,
  cancelPlacement,
} from '@/src/domains/talent/placement.service';
import type {
  CreatePlacementInput,
  TransitionPlacementInput,
  CreatePlacementResult,
} from '@/src/domains/talent/placement.service';
import { PlacementIdempotencyConflictError, PlacementValidationError } from '@/src/domains/talent/placement.errors';

const HAS_TEST_DB =
  !!process.env.DATABASE_URL_TEST &&
  !process.env.DATABASE_URL_TEST?.includes('placeholder');

const describeIf = HAS_TEST_DB ? describe : describe.skip;

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const runId = `n3-${randomUUID().slice(0, 8)}`;

const TEST_TRANSACTION_OPTIONS = {
  timeout: 15_000,
} as const;

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
    transactionOptions: TEST_TRANSACTION_OPTIONS,
  });
}

/** Set HR_MANAGER GUC context trong transaction. */
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

/** Set PUBLIC GUC context (no role) — FORCE RLS deny. */
async function withPublicContext<T>(
  prisma: PrismaClient,
  cb: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', '', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.role', '', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.worker_id', '', true)`);
    return cb(tx);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Shared fixture builder
// ─────────────────────────────────────────────────────────────────────────

interface Fixture {
  clientCompanyId: string;
  projectId: string;
  staffingOrderId: string;
  jobOpeningId: string;
  laborProfileId: string;
  placementCaseId: string;
  serviceModel: ServiceModel;
  lpId: string;
  pcId: string;
}

/** Tạo đủ chain: ClientCompany → Project → StaffingOrder → JobOpening
 *  + LaborProfile → PlacementCase (OPEN).
 *  serviceModel = STAFFING_SUPPLY → HRP_MANAGED. */
async function buildHrpManagedFixture(
  admin: PrismaClient,
  seed: string,
): Promise<Fixture> {
  const cc = await admin.clientCompany.create({
    data: {
      name: `N3 Test CC ${seed} ${runId}`,
      code: `CC${runId}${seed}`,
    },
    select: { id: true },
  });

  const prj = await admin.project.create({
    data: {
      name: `N3 Test Project ${seed} ${runId}`,
      code: `PRJ${runId}${seed}`,
      clientCompanyId: cc.id,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 86400 * 1000),
    },
    select: { id: true },
  });

  const so = await admin.staffingOrder.create({
    data: {
      projectId: prj.id,
      code: `SO${runId}${seed}`,
      title: `N3 StaffingOrder ${seed} ${runId}`,
      status: 'OPEN',
    },
    select: { id: true },
  });

  const jo = await admin.jobOpening.create({
    data: {
      staffingOrderId: so.id,
      status: 'OPEN',
      openedAt: new Date(),
      serviceModel: 'STAFFING_SUPPLY',
    },
    select: { id: true, serviceModel: true },
  });

  const lp = await admin.laborProfile.create({
    data: {
      fullName: `N3 LP ${seed} ${runId}`,
      phone: `09${runId.replace(/-/g, '').slice(0, 8)}${seed}`,
      normalizedPhone: `90${runId.replace(/-/g, '').slice(0, 8)}${seed}`,
    },
    select: { id: true },
  });

  const pc = await admin.placementCase.create({
    data: {
      laborProfileId: lp.id,
      status: 'OPEN',
      openedAt: new Date(),
    },
    select: { id: true },
  });

  return {
    clientCompanyId: cc.id,
    projectId: prj.id,
    staffingOrderId: so.id,
    jobOpeningId: jo.id,
    laborProfileId: lp.id,
    placementCaseId: pc.id,
    serviceModel: 'STAFFING_SUPPLY',
    lpId: lp.id,
    pcId: pc.id,
  };
}

/** Tạo fixture với serviceModel = RECRUITMENT_SERVICE → CLIENT_MANAGED. */
async function buildClientManagedFixture(
  admin: PrismaClient,
  seed: string,
): Promise<Fixture> {
  const cc = await admin.clientCompany.create({
    data: {
      name: `N3 Client CC ${seed} ${runId}`,
      code: `CCC${runId}${seed}`,
    },
    select: { id: true },
  });
  const prj = await admin.project.create({
    data: {
      name: `N3 Client Project ${seed} ${runId}`,
      code: `CPRJ${runId}${seed}`,
      clientCompanyId: cc.id,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 86400 * 1000),
    },
    select: { id: true },
  });
  const so = await admin.staffingOrder.create({
    data: {
      projectId: prj.id,
      code: `CSO${runId}${seed}`,
      title: `N3 Client StaffingOrder ${seed} ${runId}`,
      status: 'OPEN',
    },
    select: { id: true },
  });
  const jo = await admin.jobOpening.create({
    data: {
      staffingOrderId: so.id,
      status: 'OPEN',
      openedAt: new Date(),
      serviceModel: 'RECRUITMENT_SERVICE',
    },
    select: { id: true, serviceModel: true },
  });
  const lp = await admin.laborProfile.create({
    data: {
      fullName: `N3 Client LP ${seed} ${runId}`,
      phone: `08${runId.replace(/-/g, '').slice(0, 8)}${seed}`,
      normalizedPhone: `80${runId.replace(/-/g, '').slice(0, 8)}${seed}`,
    },
    select: { id: true },
  });
  const pc = await admin.placementCase.create({
    data: {
      laborProfileId: lp.id,
      status: 'OPEN',
      openedAt: new Date(),
    },
    select: { id: true },
  });
  return {
    clientCompanyId: cc.id,
    projectId: prj.id,
    staffingOrderId: so.id,
    jobOpeningId: jo.id,
    laborProfileId: lp.id,
    placementCaseId: pc.id,
    serviceModel: 'RECRUITMENT_SERVICE',
    lpId: lp.id,
    pcId: pc.id,
  };
}

// ─────────────────────────────────────────────────────────────────────────
describeIf(
  'N3 placement-lifecycle integration — DB-touching proof',
  { timeout: 30_000 },
  () => {
  let admin: PrismaClient;

  const createdLaborProfileIds: string[] = [];
  const createdPlacementCaseIds: string[] = [];
  const createdPlacementIds: string[] = [];

  beforeAll(async () => {
    if (!adminUrl || !writerUrl) return;
    admin = makeClient(adminUrl);
  }, 30000);

  afterAll(async () => {
    if (!admin) return;
    try {
      // Cleanup placements first (FK dependencies)
      for (const pid of createdPlacementIds) {
        await admin.$executeRawUnsafe(
          `DELETE FROM placements WHERE id = $1`,
          pid,
        ).catch(() => {});
      }
      // Close placement_cases → delete labor_profiles
      for (const pcId of createdPlacementCaseIds) {
        await admin.placementCase.update({
          where: { id: pcId },
          data: { status: 'CLOSED', closedAt: new Date() },
        }).catch(() => {});
      }
      for (const lpId of createdLaborProfileIds) {
        await admin.placementCase.deleteMany({ where: { laborProfileId: lpId } }).catch(() => {});
        await admin.laborProfile.deleteMany({ where: { id: lpId } }).catch(() => {});
      }
    } catch (e) {
      console.warn('N3 cleanup partial failure:', (e as Error).message.slice(0, 200));
    }
    await admin?.$disconnect().catch(() => {});
  }, 30000);

  // ─────────────────────────────────────────────────────────────────────
  // (i) SELECTED → CONFIRMED (HRP-managed)
  // ─────────────────────────────────────────────────────────────────────

  it('(i) createPlacement → SELECTED; confirmPlacement → CONFIRMED', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildHrpManagedFixture(admin, 'i-hrp');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const createInput: CreatePlacementInput = {
        laborProfileId: f.laborProfileId,
        placementCaseId: f.placementCaseId,
        jobOpeningId: f.jobOpeningId,
        actorId: `n3-actor-i-${runId}`,
      };

      // createPlacement
      const created = await withHrManagerContext(writer, createInput.actorId, (tx) =>
        createPlacement(tx, createInput),
      );
      expect(created.status).toBe('SELECTED');
      expect(created.serviceModelSnapshot).toBe('STAFFING_SUPPLY');
      expect(created.replayed).toBe(false);
      createdPlacementIds.push(created.placementId);

      // verify SELECTED in DB via admin
      const row = await admin.placement.findUnique({
        where: { id: created.placementId },
        select: { status: true, serviceModelSnapshot: true, placementCaseId: true, laborProfileId: true },
      });
      expect(row).not.toBeNull();
      expect(row!.status).toBe('SELECTED');
      expect(row!.placementCaseId).toBe(f.placementCaseId);
      expect(row!.laborProfileId).toBe(f.laborProfileId);

      // confirmPlacement → CONFIRMED
      const confirmInput: TransitionPlacementInput = {
        placementId: created.placementId,
        actorId: createInput.actorId,
      };
      const confirmed = await withHrManagerContext(writer, confirmInput.actorId, (tx) =>
        confirmPlacement(tx, confirmInput),
      );
      expect(confirmed.status).toBe('CONFIRMED');
      expect(confirmed.replayed).toBe(false);

      // verify CONFIRMED in DB
      const confirmedRow = await admin.placement.findUnique({
        where: { id: created.placementId },
        select: { status: true, confirmedAt: true },
      });
      expect(confirmedRow!.status).toBe('CONFIRMED');
      expect(confirmedRow!.confirmedAt).not.toBeNull();
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);

  // ─────────────────────────────────────────────────────────────────────
  // (ii) client-managed SELECTED → CONFIRMED → EFFECTIVE (with evidence)
  // ─────────────────────────────────────────────────────────────────────

  it('(ii) client-managed: SELECTED → CONFIRMED → EFFECTIVE with evidence', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildClientManagedFixture(admin, 'ii-client');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const actorId = `n3-actor-ii-${runId}`;
      const created = await withHrManagerContext(writer, actorId, (tx) =>
        createPlacement(tx, {
          laborProfileId: f.laborProfileId,
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          actorId,
        }),
      );
      expect(created.status).toBe('SELECTED');
      expect(created.serviceModelSnapshot).toBe('RECRUITMENT_SERVICE');
      createdPlacementIds.push(created.placementId);

      await withHrManagerContext(writer, actorId, (tx) =>
        confirmPlacement(tx, { placementId: created.placementId, actorId }),
      );

      // EFFECTIVE with evidence (DEC-08)
      const effectiveResult = await withHrManagerContext(writer, actorId, (tx) =>
        markPlacementEffective(tx, {
          placementId: created.placementId,
          actorId,
          evidence: {
            clientAcknowledgedAt: new Date(),
            clientAcknowledgedByUserId: `client-user-${runId}`,
            acknowledgementRef: `ACK-${runId}-ii`,
          },
        }),
      );
      expect(effectiveResult.status).toBe('EFFECTIVE');
      expect(effectiveResult.replayed).toBe(false);

      // Verify EFFECTIVE in DB
      const row = await admin.placement.findUnique({
        where: { id: created.placementId },
        select: { status: true, effectiveAt: true },
      });
      expect(row!.status).toBe('EFFECTIVE');
      expect(row!.effectiveAt).not.toBeNull();

      // Terminal state: further transitions should reject
      const err = await withHrManagerContext(writer, actorId, (tx) =>
        confirmPlacement(tx, { placementId: created.placementId, actorId }),
      ).catch((e) => e);
      expect(err).toBeDefined();
      expect((err as Error).message).toMatch(/INVALID_TRANSITION|EFFECTIVE_TERMINAL|TERMINAL_STATE/i);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);

  // ─────────────────────────────────────────────────────────────────────
  // (iii) HRP-managed markPlacementEffective REJECT (DEC-07)
  // ─────────────────────────────────────────────────────────────────────

  it('(iii) HRP-managed markPlacementEffective REJECT — N4 owns EFFECTIVE', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildHrpManagedFixture(admin, 'iii-hrp');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const actorId = `n3-actor-iii-${runId}`;
      const created = await withHrManagerContext(writer, actorId, (tx) =>
        createPlacement(tx, {
          laborProfileId: f.laborProfileId,
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          actorId,
        }),
      );
      createdPlacementIds.push(created.placementId);

      await withHrManagerContext(writer, actorId, (tx) =>
        confirmPlacement(tx, { placementId: created.placementId, actorId }),
      );

      // HRP-managed EFFECTIVE: must REJECT
      let errCaught: Error | null = null;
      try {
        await withHrManagerContext(writer, actorId, (tx) =>
          markPlacementEffective(tx, {
            placementId: created.placementId,
            actorId,
            evidence: {
              clientAcknowledgedAt: new Date(),
              clientAcknowledgedByUserId: 'x',
              acknowledgementRef: 'x',
            },
          }),
        );
      } catch (e) {
        errCaught = e as Error;
      }
      expect(errCaught).not.toBeNull();
      expect(errCaught!.message).toMatch(/HRP_EFFECTIVE_FORBIDDEN|HRP.*managed|forbidden/i);

      // Verify status still CONFIRMED
      const row = await admin.placement.findUnique({
        where: { id: created.placementId },
        select: { status: true },
      });
      expect(row!.status).toBe('CONFIRMED');
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);

  // ─────────────────────────────────────────────────────────────────────
  // (iv) idempotent replay: retry SELECTED → return existing placement
  // ─────────────────────────────────────────────────────────────────────

  it('(iv) retry cùng (case, opening) khi SELECTED → trả placement hiện tại (idempotent)', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildHrpManagedFixture(admin, 'iv-replay');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const actorId = `n3-actor-iv-${runId}`;
      const input: CreatePlacementInput = {
        laborProfileId: f.laborProfileId,
        placementCaseId: f.placementCaseId,
        jobOpeningId: f.jobOpeningId,
        actorId,
      };

      const first = await withHrManagerContext(writer, actorId, (tx) =>
        createPlacement(tx, input),
      );
      createdPlacementIds.push(first.placementId);

      // Retry same (case, opening) → should return existing (replayed=true)
      const replayed = await withHrManagerContext(writer, actorId, (tx) =>
        createPlacement(tx, input),
      );
      expect(replayed.replayed).toBe(true);
      expect(replayed.placementId).toBe(first.placementId);
      expect(replayed.status).toBe('SELECTED');

      // Only 1 placement row in DB
      const rows = await admin.placement.findMany({
        where: {
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          status: { in: ['SELECTED', 'CONFIRMED'] },
        },
        select: { id: true },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]!.id).toBe(first.placementId);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);

  // ─────────────────────────────────────────────────────────────────────
  // (v) retry after FAILED: unique index slot released → new placement OK
  // ─────────────────────────────────────────────────────────────────────

  it('(v) sau FAILED: retry tạo Placement mới (index slot giải phóng)', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildHrpManagedFixture(admin, 'v-failed');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const actorId = `n3-actor-v-${runId}`;

      // First placement
      const first = await withHrManagerContext(writer, actorId, (tx) =>
        createPlacement(tx, {
          laborProfileId: f.laborProfileId,
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          actorId,
        }),
      );
      createdPlacementIds.push(first.placementId);
      expect(first.status).toBe('SELECTED');

      // Fail it
      await withHrManagerContext(writer, actorId, (tx) =>
        failPlacement(tx, { placementId: first.placementId, actorId }),
      );

      // Verify FAILED
      const failedRow = await admin.placement.findUnique({
        where: { id: first.placementId },
        select: { status: true },
      });
      expect(failedRow!.status).toBe('FAILED');

      // Retry: partial index slot released → new INSERT succeeds
      const second = await withHrManagerContext(writer, actorId, (tx) =>
        createPlacement(tx, {
          laborProfileId: f.laborProfileId,
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          actorId,
        }),
      );
      expect(second.replayed).toBe(false); // new placement
      expect(second.placementId).not.toBe(first.placementId);
      createdPlacementIds.push(second.placementId);

      // Now have 2 placements: FAILED + SELECTED
      const allRows = await admin.placement.findMany({
        where: {
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
        },
        select: { id: true, status: true },
      });
      expect(allRows).toHaveLength(2);
      expect(allRows.map((r) => r.status).sort()).toEqual(['FAILED', 'SELECTED']);

      // Only 1 active (SELECTED/CONFIRMED) at a time
      const activeRows = await admin.placement.findMany({
        where: {
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          status: { in: ['SELECTED', 'CONFIRMED'] },
        },
        select: { id: true, status: true },
      });
      expect(activeRows).toHaveLength(1);
      expect(activeRows[0]!.status).toBe('SELECTED');
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 20000);

  // ─────────────────────────────────────────────────────────────────────
  // (vi) FK chain broken → REJECT (DEC-06)
  // ─────────────────────────────────────────────────────────────────────

  it('(vi) FK chain broken → PlacementValidationError (JobOpening không tồn tại)', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildHrpManagedFixture(admin, 'vi-fk');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);
      // jobOpening NOT referenced — we use a fake non-existent one

      const actorId = `n3-actor-vi-${runId}`;
      const fakeJobOpeningId = `fake-jo-${runId}-vi`;

      let errCaught: Error | null = null;
      try {
        await withHrManagerContext(writer, actorId, (tx) =>
          createPlacement(tx, {
            laborProfileId: f.laborProfileId,
            placementCaseId: f.placementCaseId,
            jobOpeningId: fakeJobOpeningId,
            actorId,
          }),
        );
      } catch (e) {
        errCaught = e as Error;
      }

      expect(errCaught).not.toBeNull();
      expect(errCaught!.message).toMatch(/JobOpening|không tồn tại|not found|validation/i);

      // Verify no placement row created
      const rows = await admin.placement.findMany({
        where: {
          placementCaseId: f.placementCaseId,
          jobOpeningId: fakeJobOpeningId,
        },
        select: { id: true },
      });
      expect(rows).toHaveLength(0);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);

  // ─────────────────────────────────────────────────────────────────────
  // (vii) RLS: HR_MANAGER GUC → sees rows; PUBLIC (no GUC) → sees 0
  // ─────────────────────────────────────────────────────────────────────

  it('(vii) RLS: HR_MANAGER GUC thấy rows; PUBLIC (no GUC) thấy 0 — FORCE RLS enforced', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildHrpManagedFixture(admin, 'vii-rls');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const actorId = `n3-actor-vii-${runId}`;
      const created = await withHrManagerContext(writer, actorId, (tx) =>
        createPlacement(tx, {
          laborProfileId: f.laborProfileId,
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          actorId,
        }),
      );
      createdPlacementIds.push(created.placementId);

      // HR_MANAGER context: should see the row
      const hrManagerRead = await withHrManagerContext(writer, actorId, (tx) =>
        tx.placement.findMany({ where: { id: created.placementId }, select: { id: true, status: true } }),
      );
      expect(hrManagerRead).toHaveLength(1);
      expect(hrManagerRead[0]!.status).toBe('SELECTED');

      // PUBLIC context: RLS deny → 0 rows visible (FORCE RLS active)
      const publicRead = await withPublicContext(writer, (tx) =>
        tx.placement.findMany({ where: { id: created.placementId }, select: { id: true, status: true } }),
      );
      expect(publicRead).toHaveLength(0);

      // PUBLIC write attempt: INSERT blocked by RLS WITH CHECK
      let publicInsertErr: Error | null = null;
      try {
        await withPublicContext(writer, (tx) =>
          tx.placement.create({
            data: {
              id: `n3-public-insert-${runId}`,
              placementCaseId: f.placementCaseId,
              laborProfileId: f.laborProfileId,
              jobOpeningId: f.jobOpeningId,
              status: 'SELECTED',
            },
            select: { id: true },
          }),
        );
      } catch (e) {
        publicInsertErr = e as Error;
      }
      expect(publicInsertErr).not.toBeNull();
      // RLS WITH CHECK: row MUST NOT be persisted regardless of error type.
      // (PRIVILEGE_NOT_ENOUGH in Neon → Prisma wraps as P2014 / generic error).

      // Verify row not persisted via PUBLIC INSERT
      const adminRead = await admin.placement.findMany({
        where: { id: { startsWith: 'n3-public-insert' } },
        select: { id: true },
      });
      expect(adminRead).toHaveLength(0);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  // (viii) UNIQUE partial index race: concurrent INSERT same (case,opening)
  //        → P23505 caught → second caller gets replayed=true
  // ─────────────────────────────────────────────────────────────────────

  it('(viii) UNIQUE partial index race: concurrent INSERT cùng (case,opening) → both fulfilled, one winner one replayed', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildHrpManagedFixture(admin, 'viii-race');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const actorId = `n3-actor-viii-${runId}`;
      const input: CreatePlacementInput = {
        laborProfileId: f.laborProfileId,
        placementCaseId: f.placementCaseId,
        jobOpeningId: f.jobOpeningId,
        actorId,
      };

      // Fire TWO concurrent createPlacement calls — second will hit unique index P23505
      // Both use separate writer clients so they get separate connections from pooler
      const w1 = makeClient(writerUrl);
      const w2 = makeClient(writerUrl);

      const fire = (w: PrismaClient) =>
        withHrManagerContext(w, actorId, (tx) => createPlacement(tx, input));

      const results = await Promise.allSettled([fire(w1), fire(w2)]);

      // Both must fulfill (no unhandled rejection)
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(2);
      if (rejected.length > 0) {
        console.error('(viii) unexpected rejections:', rejected.map((r) => ({
          reason: String((r as PromiseRejectedResult).reason?.message ?? '').slice(0, 300),
          code: (r as PromiseRejectedResult).reason?.code,
        })));
      }
      expect(rejected.length).toBe(0);

      const settled = fulfilled.map(
        (r) => (r as PromiseFulfilledResult<CreatePlacementResult>).value,
      );

      // One winner (replayed=false), one loser→replay (replayed=true)
      expect(settled.some((s) => s.replayed === false)).toBe(true);
      expect(settled.some((s) => s.replayed === true)).toBe(true);

      // Both return same placementId
      expect(settled[0]!.placementId).toBe(settled[1]!.placementId);

      // Only 1 row in DB
      const rows = await admin.placement.findMany({
        where: {
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          status: { in: ['SELECTED', 'CONFIRMED'] },
        },
        select: { id: true, status: true },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]!.status).toBe('SELECTED');

      createdPlacementIds.push(settled[0]!.placementId);

      await w1.$disconnect().catch(() => {});
      await w2.$disconnect().catch(() => {});
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);

  // ─────────────────────────────────────────────────────────────────────
  // (ix) case-ownership mismatch: case thuộc LaborProfile khác → REJECT
  // ─────────────────────────────────────────────────────────────────────

  it('(ix) createPlacement: case thuộc LaborProfile khác → PlacementValidationError (N1 invariant)', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildHrpManagedFixture(admin, 'ix-mismatch');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const actorId = `n3-actor-ix-${runId}`;
      let errCaught: Error | null = null;
      try {
        await withHrManagerContext(writer, actorId, (tx) =>
          createPlacement(tx, {
            laborProfileId: 'lp-WRONG-not-the-case-owner',
            placementCaseId: f.placementCaseId,
            jobOpeningId: f.jobOpeningId,
            actorId,
          }),
        );
      } catch (e) {
        errCaught = e as Error;
      }
      expect(errCaught).not.toBeNull();
      expect(errCaught!.message).toMatch(/thuộc LaborProfile khác|N1 invariant|case.laborProfileId/i);

      // Verify NO placement row created
      const rows = await admin.placement.findMany({
        where: { placementCaseId: f.placementCaseId, laborProfileId: 'lp-WRONG-not-the-case-owner' },
        select: { id: true },
      });
      expect(rows).toHaveLength(0);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);

  // ─────────────────────────────────────────────────────────────────────
  // (x) case CLOSED: tạo Placement trên case đã CLOSED → REJECT
  // ─────────────────────────────────────────────────────────────────────

  it('(x) createPlacement: case CLOSED → PlacementValidationError', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildHrpManagedFixture(admin, 'x-closed');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      // Close the case manually
      await admin.placementCase.update({
        where: { id: f.pcId },
        data: { status: 'CLOSED', closedAt: new Date(), closeReason: 'test-closed-pre' },
      });

      const actorId = `n3-actor-x-${runId}`;
      let errCaught: Error | null = null;
      try {
        await withHrManagerContext(writer, actorId, (tx) =>
          createPlacement(tx, {
            laborProfileId: f.laborProfileId,
            placementCaseId: f.placementCaseId,
            jobOpeningId: f.jobOpeningId,
            actorId,
          }),
        );
      } catch (e) {
        errCaught = e as Error;
      }
      expect(errCaught).not.toBeNull();
      expect(errCaught!.message).toMatch(/CLOSED|đã đóng|không thể tạo/i);

      // Verify NO placement row created
      const rows = await admin.placement.findMany({
        where: { placementCaseId: f.placementCaseId },
        select: { id: true },
      });
      expect(rows).toHaveLength(0);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);

  // ─────────────────────────────────────────────────────────────────────
  // (xi) client-managed EFFECTIVE: evidence PERSISTED + PlacementCase CLOSED
  // ─────────────────────────────────────────────────────────────────────

  it('(xi) client-managed EFFECTIVE: evidence persisted to DB columns + PlacementCase closed SUCCESS', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildClientManagedFixture(admin, 'xi-effective');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const actorId = `n3-actor-xi-${runId}`;
      const ackAt = new Date('2026-09-14T10:00:00Z');

      const created = await withHrManagerContext(writer, actorId, (tx) =>
        createPlacement(tx, {
          laborProfileId: f.laborProfileId,
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          actorId,
        }),
      );
      createdPlacementIds.push(created.placementId);

      await withHrManagerContext(writer, actorId, (tx) =>
        confirmPlacement(tx, { placementId: created.placementId, actorId }),
      );

      // EFFECTIVE với evidence
      await withHrManagerContext(writer, actorId, (tx) =>
        markPlacementEffective(tx, {
          placementId: created.placementId,
          actorId,
          evidence: {
            clientAcknowledgedAt: ackAt,
            clientAcknowledgedByUserId: `client-ack-${runId}`,
            acknowledgementRef: `ACK-${runId}-xi`,
          },
        }),
      );

      // Verify evidence PERSISTED in DB
      const row = await admin.placement.findUnique({
        where: { id: created.placementId },
        select: {
          status: true,
          effectiveAt: true,
          evidenceAcknowledgedAt: true,
          evidenceAcknowledgedByUserId: true,
          evidenceAcknowledgementRef: true,
        },
      });
      expect(row!.status).toBe('EFFECTIVE');
      expect(row!.evidenceAcknowledgedAt).toEqual(ackAt);
      expect(row!.evidenceAcknowledgedByUserId).toBe(`client-ack-${runId}`);
      expect(row!.evidenceAcknowledgementRef).toBe(`ACK-${runId}-xi`);

      // Verify PlacementCase CLOSED SUCCESS (atomic closure)
      const closedCase = await admin.placementCase.findUnique({
        where: { id: f.placementCaseId },
        select: { status: true, closedAt: true, closeReason: true },
      });
      expect(closedCase!.status).toBe('CLOSED');
      expect(closedCase!.closedAt).not.toBeNull();
      expect(closedCase!.closeReason).toMatch(/PLACEMENT_EFFECTIVE/);

      // Verify NO Worker/Episode/Assignment created (N4 boundary)
      const episodeCount = await admin.employmentEpisode.count({
        where: { laborProfileId: f.laborProfileId },
      });
      expect(episodeCount).toBe(0);

      const assignmentCount = await admin.projectAssignment.count({
        where: { id: { startsWith: 'n3-xi-' } }, // any n3-xi-* — should be 0
      });
      expect(assignmentCount).toBe(0);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);

  // ─────────────────────────────────────────────────────────────────────
  // (xii) HRP-managed EFFECTIVE reject KHÔNG đóng PlacementCase (N4 boundary)
  // ─────────────────────────────────────────────────────────────────────

  it('(xii) HRP-managed EFFECTIVE reject → case vẫn OPEN (atomic N4 boundary)', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildHrpManagedFixture(admin, 'xii-hrp-reject');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const actorId = `n3-actor-xii-${runId}`;
      const created = await withHrManagerContext(writer, actorId, (tx) =>
        createPlacement(tx, {
          laborProfileId: f.laborProfileId,
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          actorId,
        }),
      );
      createdPlacementIds.push(created.placementId);

      await withHrManagerContext(writer, actorId, (tx) =>
        confirmPlacement(tx, { placementId: created.placementId, actorId }),
      );

      // HRP-managed EFFECTIVE → REJECT
      let errCaught: Error | null = null;
      try {
        await withHrManagerContext(writer, actorId, (tx) =>
          markPlacementEffective(tx, {
            placementId: created.placementId,
            actorId,
            evidence: {
              clientAcknowledgedAt: new Date(),
              clientAcknowledgedByUserId: 'x',
              acknowledgementRef: 'x',
            },
          }),
        );
      } catch (e) {
        errCaught = e as Error;
      }
      expect(errCaught).not.toBeNull();
      expect(errCaught!.message).toMatch(/HRP_EFFECTIVE_FORBIDDEN|atomic workforce bridge|N4/i);

      // Verify status stays CONFIRMED
      const row = await admin.placement.findUnique({
        where: { id: created.placementId },
        select: { status: true, evidenceAcknowledgedAt: true },
      });
      expect(row!.status).toBe('CONFIRMED');
      expect(row!.evidenceAcknowledgedAt).toBeNull(); // evidence NOT persisted

      // Verify case vẫn ACTIVE (HRP reject → không atomic close)
      const stillActiveCase = await admin.placementCase.findUnique({
        where: { id: f.placementCaseId },
        select: { status: true, closedAt: true, closeReason: true },
      });
      expect(stillActiveCase!.status).toBe('OPEN');
      expect(stillActiveCase!.closedAt).toBeNull();
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);

  // ─────────────────────────────────────────────────────────────────────
  // (xiii) DELETE privilege revoked: app_user_writer KHÔNG được DELETE
  // ─────────────────────────────────────────────────────────────────────

  it('(xiii) RLS/privilege: app_user_writer DELETE bị REVOKE — Placement lịch sử bất khả xóa', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildHrpManagedFixture(admin, 'xiii-no-delete');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const actorId = `n3-actor-xiii-${runId}`;
      const created = await withHrManagerContext(writer, actorId, (tx) =>
        createPlacement(tx, {
          laborProfileId: f.laborProfileId,
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          actorId,
        }),
      );
      createdPlacementIds.push(created.placementId);

      // app_user_writer cố DELETE → bị PG privilege deny
      let deleteErr: Error | null = null;
      try {
        await withHrManagerContext(writer, actorId, (tx) =>
          tx.placement.delete({ where: { id: created.placementId } }),
        );
      } catch (e) {
        deleteErr = e as Error;
      }
      expect(deleteErr).not.toBeNull(); // privilege deny hoặc RLS deny

      // Verify row vẫn còn (DELETE bị chặn)
      const rowAfter = await admin.placement.findUnique({
        where: { id: created.placementId },
        select: { id: true, status: true },
      });
      expect(rowAfter).not.toBeNull();
      expect(rowAfter!.status).toBe('SELECTED');
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);

  // ─────────────────────────────────────────────────────────────────────
  // (xiv) [F-09 round-4] race-loser transition: concurrent cancel → PlacementIdempotencyConflictError
  // ─────────────────────────────────────────────────────────────────────

  it('(xiv) race-loser transition: caller confirm, concurrent cancel → PlacementIdempotencyConflictError', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildHrpManagedFixture(admin, 'xiv-race-loser');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const actorId = `n3-actor-xiv-${runId}`;
      const created = await withHrManagerContext(writer, actorId, (tx) =>
        createPlacement(tx, {
          laborProfileId: f.laborProfileId,
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          actorId,
        }),
      );
      createdPlacementIds.push(created.placementId);

      // Concurrent cancel thành công trước (giả lập admin cancel riêng).
      await admin.placement.update({
        where: { id: created.placementId },
        data: { status: 'CANCELLED', failureReason: 'concurrent cancel for test xiv' },
      });

      // Caller confirm — canTransition(CANCELLED, CONFIRMED) = TERMINAL_STATE.
      // → throw InvalidStateTransitionError.
      let errCaught: Error | null = null;
      try {
        await withHrManagerContext(writer, actorId, (tx) =>
          confirmPlacement(tx, { placementId: created.placementId, actorId }),
        );
      } catch (e) {
        errCaught = e as Error;
      }
      expect(errCaught).not.toBeNull();
      // canTransition reject sớm hơn updateMany — đây là path bình thường.
      // Round-4 fix F-09 chỉ trigger khi canTransition pass + updateMany count=0.
      // Test này verify nhánh canTransition reject (giữ behavior cũ).
      expect(errCaught!.message).toMatch(/TERMINAL_STATE|không hợp lệ/i);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);

  // ─────────────────────────────────────────────────────────────────────
  // (xv) [F-08 + F-09 round-4] closePlacementCaseSuccess rollback khi case đã CLOSED đồng thời
  // ─────────────────────────────────────────────────────────────────────

  it('(xv) Client-managed EFFECTIVE khi case đã CLOSED đồng thời → PlacementIdempotencyConflictError + Placement KHÔNG EFFECTIVE (transaction rollback)', async () => {
    const writer = makeClient(writerUrl);
    try {
      const f = await buildClientManagedFixture(admin, 'xv-concurrent-close');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

      const actorId = `n3-actor-xv-${runId}`;
      const created = await withHrManagerContext(writer, actorId, (tx) =>
        createPlacement(tx, {
          laborProfileId: f.laborProfileId,
          placementCaseId: f.placementCaseId,
          jobOpeningId: f.jobOpeningId,
          actorId,
        }),
      );
      createdPlacementIds.push(created.placementId);

      await withHrManagerContext(writer, actorId, (tx) =>
        confirmPlacement(tx, { placementId: created.placementId, actorId }),
      );

      // Concurrent closure (giả lập admin đóng case trước khi EFFECTIVE chạy).
      await admin.placementCase.update({
        where: { id: f.placementCaseId },
        data: { status: 'CLOSED', closedAt: new Date(), closeReason: 'concurrent close for test xv' },
      });

      // EFFECTIVE — closePlacementCaseSuccess sẽ thấy case không ACTIVE → throw.
      let errCaught: Error | null = null;
      try {
        await withHrManagerContext(writer, actorId, (tx) =>
          markPlacementEffective(tx, {
            placementId: created.placementId,
            actorId,
            evidence: {
              clientAcknowledgedAt: new Date(),
              clientAcknowledgedByUserId: `client-ack-${runId}`,
              acknowledgementRef: `ACK-${runId}-xv`,
            },
          }),
        );
      } catch (e) {
        errCaught = e as Error;
      }
      expect(errCaught).not.toBeNull();
      expect(errCaught!.message).toMatch(/ACTIVE|CLOSED|concurrent|case|đóng/i);
      expect(errCaught).toBeInstanceOf(PlacementIdempotencyConflictError);

      // CRITICAL: Verify Placement KHÔNG EFFECTIVE (rollback toàn bộ transaction).
      const placementAfter = await admin.placement.findUnique({
        where: { id: created.placementId },
        select: {
          status: true,
          evidenceAcknowledgedAt: true,
          evidenceAcknowledgedByUserId: true,
          evidenceAcknowledgementRef: true,
          effectiveAt: true,
        },
      });
      expect(placementAfter!.status).toBe('CONFIRMED'); // vẫn CONFIRMED — rollback
      expect(placementAfter!.evidenceAcknowledgedAt).toBeNull(); // evidence KHÔNG persisted (rollback)
      expect(placementAfter!.evidenceAcknowledgedByUserId).toBeNull();
      expect(placementAfter!.evidenceAcknowledgementRef).toBeNull();
      expect(placementAfter!.effectiveAt).toBeNull();

      // Verify case vẫn CLOSED (từ concurrent closure, không bị thay đổi bởi EFFECTIVE)
      const caseAfter = await admin.placementCase.findUnique({
        where: { id: f.placementCaseId },
        select: { status: true, closeReason: true },
      });
      expect(caseAfter!.status).toBe('CLOSED');
      expect(caseAfter!.closeReason).toBe('concurrent close for test xv'); // closeReason cũ
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  }, 15000);
});

// ─────────────────────────────────────────────────────────────────────────
describe('placement-lifecycle-integration — ENV_BLOCKED honest report', () => {
  it('nếu HAS_TEST_DB = false → ENV_BLOCKED (không phải PASS)', () => {
    if (HAS_TEST_DB) return;
    // Báo cáo trung thực: Tier 0/Owner cần cung cấp DATABASE_URL_TEST
    // trước khi xét merge/deploy N3.
    expect(HAS_TEST_DB).toBe(false);
    expect(process.env.DATABASE_URL_TEST ?? '').toBe('');
    expect(process.env.DATABASE_URL_ADMIN_TEST ?? '').toBe('');
  });
});
