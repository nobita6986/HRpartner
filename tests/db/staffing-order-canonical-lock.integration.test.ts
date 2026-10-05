/**
 * tests/db/staffing-order-canonical-lock.integration.test.ts
 *
 * t1a-staffing-order-management (CORRECTION 2/1, T0) — Real PostgreSQL two-
 * connection race test for the canonical order-lock namespace.
 *
 * Self-skips when DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST are absent
 * (ENV_BLOCKED). Otherwise RUNs against the live synthetic DB with admin +
 * writer Prisma clients.
 *
 * What this test exercises:
 *
 *   Case A — Order-delete race:
 *     1. Two independent connections (no shared in-memory state).
 *     2. Connection B (writer) opens a transaction, sets GUC `app.role =
 *        ADMIN` (so its RLS-guarded INSERT is admitted), acquires the
 *        canonical `p1a04:order:<orderId>` advisory lock, sleeps 300ms,
 *        then INSERTs a `JobOpening` for the same order, then COMMITS
 *        (releasing the lock).
 *     3. Connection A (writer) opens a transaction with the same GUC
 *        context and calls `deleteStaffingOrder`, which acquires the same
 *        canonical lock. A's lock acquire BLOCKS while B holds it; once
 *        B commits, A acquires the lock, re-reads deps, and observes the
 *        new JobOpening → throws `ORDER_NOT_DELETABLE` (409, typed).
 *     4. Final outcome: ORDER_NOT_DELETABLE, not 500, not a silent delete.
 *
 *   Case B — Slot-delete race:
 *     Same shape but the dep is `CandidateSubmission` on a slot. B holds
 *     `p1a04:slot:<slotId>`, inserts a CandidateSubmission against a
 *     pre-baked PlacementCase (admin connection, FK-only). A calls the
 *     slot delete path (via `updateStaffingOrder` with `_delete: true`)
 *     under the same canonical order + slot lock and observes the
 *     submission → throws `SLOT_HAS_DEPENDENCIES` (409).
 *
 *   Case C — Same lock on both sides (one holds, one waits):
 *     Two concurrent `deleteStaffingOrder` on the same orderId. Exactly
 *     one wins (200, deleted); the other waits then sees the row gone and
 *     throws NOT_FOUND (404). NO 500.
 *
 * The test does NOT call Next.js routes; it exercises the service layer +
 * Prisma directly via the canonical lock primitive. The route-layer
 * coverage is owned by unit tests under `app/api/staffing/orders/[id]/
 * route.test.ts`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { type Prisma as PrismaTypes, PrismaClient } from '@prisma/client';

import {
  deleteStaffingOrder,
  updateStaffingOrder,
  StaffingOrderServiceError,
} from '@/src/domains/staffing/order.service';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl && !!writerUrl &&
  !adminUrl.includes('placeholder') && !writerUrl.includes('placeholder');

const runId = `t1a-lock-${randomUUID().slice(0, 8)}`;

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    transactionOptions: { timeout: 30_000 },
  });
}

/**
 * Run `callback` inside a writer transaction with the GUC context set
 * LOCAL to the transaction. This is the same shape p1a04-scoped-recruiter-
 * authority uses, and is the only way RLS policies see the writer as the
 * intended actor inside `tx` queries.
 */
async function withContext<T>(
  client: PrismaClient,
  userId: string,
  role: string,
  callback: (tx: PrismaTypes.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (tx) => {
    // `is_local` (3rd arg) MUST be a SQL boolean literal — NOT a parameter
    // binding. Passing '' here would be cast to boolean and fail with 22P02.
    await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", userId);
    await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", role);
    await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
    await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');
    return callback(tx);
  });
}

async function getSessionPid(client: PrismaClient): Promise<number> {
  const rows = await client.$queryRawUnsafe<Array<{ pid: number }>>(
    'SELECT pg_backend_pid()::int AS pid',
  );
  return rows[0]?.pid ?? 0;
}

interface AdminCtx {
  userId: string;
  role: 'ADMIN' | 'HR_MANAGER' | 'HR_STAFF';
}

const ADMIN_CTX: AdminCtx = { userId: 'admin-test', role: 'ADMIN' };

describe.skipIf(!HAS_TEST_DB)('t1a-staffing-order-management — canonical order-lock two-connection race (CORRECTION 2/1)', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;

  // Identifiers (runId-scoped).
  const adminUserId = `${runId}-admin`;
  const managerUserId = `${runId}-mgr`;

  const companyIds: string[] = [];
  const projectIds: string[] = [];
  const orderIds: string[] = [];
  const slotIds: string[] = [];
  const openingIds: string[] = [];
  const submissionIds: string[] = [];
  const laborProfileIds: string[] = [];
  const placementCaseIds: string[] = [];

  let projectA: string;
  let orderDeleteRace: string;
  let orderSlotDeleteRace: string;
  let orderSameLock: string;
  let slotA: string;
  let placementCaseForSubmission: string;

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);

    // Users (admin + HR_MANAGER) for FK chain.
    await admin.user.createMany({
      data: [
        { id: adminUserId, phone: `${runId}-adm`, name: 'T1A Admin', role: 'ADMIN' },
        { id: managerUserId, phone: `${runId}-mgr`, name: 'T1A Manager', role: 'HR_MANAGER' },
      ],
    });

    // Client company + project.
    const company = await admin.clientCompany.create({
      data: {
        code: `${runId}-CC`,
        name: `${runId} ClientCo`,
        taxCode: `${runId}-TAX`,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    companyIds.push(company.id);

    const project = await admin.project.create({
      data: {
        code: `${runId}-PRJ`,
        name: `${runId} Project`,
        clientCompanyId: company.id,
        pmUserId: adminUserId,
        isPublic: false,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
      },
      select: { id: true },
    });
    projectA = project.id;
    projectIds.push(project.id);

    // Three orders: orderDeleteRace, orderSlotDeleteRace, orderSameLock.
    // All OPEN, no slots/jobopenings/submissions yet.
    const o1 = await admin.staffingOrder.create({
      data: {
        projectId: projectA,
        code: `${runId}-DEL`,
        title: 'T1A Order-Delete-Race',
        status: 'OPEN',
      },
      select: { id: true },
    });
    orderDeleteRace = o1.id;
    orderIds.push(o1.id);

    const o2 = await admin.staffingOrder.create({
      data: {
        projectId: projectA,
        code: `${runId}-SLOT`,
        title: 'T1A Order-Slot-Delete-Race',
        status: 'OPEN',
      },
      select: { id: true },
    });
    orderSlotDeleteRace = o2.id;
    orderIds.push(o2.id);

    const o3 = await admin.staffingOrder.create({
      data: {
        projectId: projectA,
        code: `${runId}-SAME`,
        title: 'T1A Order-Same-Lock',
        status: 'OPEN',
      },
      select: { id: true },
    });
    orderSameLock = o3.id;
    orderIds.push(o3.id);

    // Two slots, one for each race order.
    const sa = await admin.staffingOrderSlot.create({
      data: {
        staffingOrderId: orderSlotDeleteRace,
        positionCode: 'TESTER',
        positionTitle: 'Tester',
        slotsNeeded: 1,
        validFrom: new Date('2026-01-01'),
      },
      select: { id: true },
    });
    slotA = sa.id;
    slotIds.push(sa.id);

    // Pre-bake FK fixtures for CandidateSubmission (Case B): LaborProfile +
    // PlacementCase via admin (bypasses RLS).
    const profile = await admin.laborProfile.create({
      data: { fullName: `T1A Sub ${runId}` },
      select: { id: true },
    });
    laborProfileIds.push(profile.id);
    const caseRow = await admin.placementCase.create({
      data: { laborProfileId: profile.id, status: 'OPEN' },
      select: { id: true },
    });
    placementCaseIds.push(caseRow.id);
    placementCaseForSubmission = caseRow.id;
  });

  afterAll(async () => {
    // Cleanup in reverse FK order. Admin connection bypasses RLS.
    try {
      for (const id of submissionIds) {
        await admin.candidateSubmission.deleteMany({ where: { id } }).catch(() => undefined);
      }
      for (const id of placementCaseIds) {
        await admin.placementCase.deleteMany({ where: { id } }).catch(() => undefined);
      }
      for (const id of laborProfileIds) {
        await admin.laborProfile.deleteMany({ where: { id } }).catch(() => undefined);
      }
      for (const id of openingIds) {
        await admin.jobOpening.deleteMany({ where: { id } }).catch(() => undefined);
      }
      for (const id of slotIds) {
        await admin.staffingOrderSlot.deleteMany({ where: { id } }).catch(() => undefined);
      }
      for (const id of orderIds) {
        await admin.staffingOrder.deleteMany({ where: { id } }).catch(() => undefined);
      }
      for (const id of projectIds) {
        await admin.project.deleteMany({ where: { id } }).catch(() => undefined);
      }
      for (const id of companyIds) {
        await admin.clientCompany.deleteMany({ where: { id } }).catch(() => undefined);
      }
      await admin.user.deleteMany({ where: { id: { in: [adminUserId, managerUserId] } } }).catch(() => undefined);
    } finally {
      await Promise.all([
        admin.$disconnect().catch(() => undefined),
        writer.$disconnect().catch(() => undefined),
      ]);
    }
  });

  it('Case A: deleteStaffingOrder + concurrent JobOpening insert on same order — sees fresh dep under lock, returns ORDER_NOT_DELETABLE', async () => {
    const orderId = orderDeleteRace;

    // Connection B: writer transaction with GUC set INSIDE so RLS admits
    // its JobOpening insert. Holds the canonical order lock for 300ms so A
    // blocks on the same lock, then commits.
    const connB = makeClient(writerUrl);
    const inserterPromise = withContext(
      connB,
      ADMIN_CTX.userId,
      ADMIN_CTX.role,
      async (tx) => {
        await tx.$executeRawUnsafe(
          "SELECT pg_advisory_xact_lock( (hashtext($1)::bigint) & 9223372036854775807::bigint )",
          `p1a04:order:${orderId}`,
        );
        // Hold the lock while A attempts to acquire it.
        await tx.$executeRawUnsafe('SELECT pg_sleep(0.3)');
        // Insert a JobOpening for the order (RLS ok under ADMIN GUC).
        const op = await tx.jobOpening.create({
          data: {
            staffingOrderId: orderId,
            serviceModel: 'STAFFING_SUPPLY',
            status: 'OPEN',
            openedAt: new Date(),
          },
          select: { id: true },
        });
        openingIds.push(op.id);
        return op.id;
      },
    );

    // Connection A: a fresh Prisma client. Wait briefly to give B a head
    // start (so the blocking observation has time to register). Then
    // call deleteStaffingOrder under GUC ADMIN — the lock acquire inside
    // the service blocks until B commits.
    const connA = makeClient(writerUrl);
    const aPid = await getSessionPid(connA);
    await new Promise((r) => setTimeout(r, 50));
    const aWasBlocked = await (async () => {
      // Best-effort probe: while A's tx hasn't been started yet, the
      // probe is on a *separate* writer connection, so we cannot see
      // A's lock state directly here. We log the observation and let the
      // duration check be the authoritative serialization proof.
      void aPid;
      return false;
    })();

    const deleteStart = Date.now();
    let caught: StaffingOrderServiceError | null = null;
    try {
      await withContext(connA, ADMIN_CTX.userId, ADMIN_CTX.role, async (tx) => {
        await deleteStaffingOrder(tx, ADMIN_CTX, orderId);
      });
    } catch (e) {
      if (e instanceof StaffingOrderServiceError) caught = e;
      else throw e;
    }
    const deleteMs = Date.now() - deleteStart;
    expect(caught, 'deleteStaffingOrder must throw, not silently succeed').not.toBeNull();
    expect(caught?.code).toBe('ORDER_NOT_DELETABLE');
    expect(deleteMs).toBeGreaterThanOrEqual(250); // proves it waited under lock

    // Cleanup: the row was NOT deleted (delete was rejected).
    const stillExists = await admin.staffingOrder.findUnique({ where: { id: orderId }, select: { id: true } });
    expect(stillExists?.id).toBe(orderId);

    await inserterPromise;
    await connA.$disconnect().catch(() => undefined);
    await connB.$disconnect().catch(() => undefined);

    // The TYPED 409 outcome + duration is the authoritative pass condition.
    // The blocking probe is logged for human review only.
    console.log('[t1a] Case A: deleteMs=%d, aWasBlocked=%s', deleteMs, aWasBlocked);
  });

  it('Case B: updateStaffingOrder slot-delete + concurrent CandidateSubmission on same slot — sees fresh dep under lock, returns SLOT_HAS_DEPENDENCIES', async () => {
    const slotId = slotA;
    const orderId = orderSlotDeleteRace;

    // Connection B: writer transaction with GUC ADMIN. Holds the canonical
    // SLOT lock for 300ms so A blocks, then inserts a CandidateSubmission
    // (uses pre-baked PlacementCase FK from beforeAll).
    const connB = makeClient(writerUrl);
    const inserterPromise = withContext(
      connB,
      ADMIN_CTX.userId,
      ADMIN_CTX.role,
      async (tx) => {
        await tx.$executeRawUnsafe(
          "SELECT pg_advisory_xact_lock( (hashtext($1)::bigint) & 9223372036854775807::bigint )",
          `p1a04:slot:${slotId}`,
        );
        await tx.$executeRawUnsafe('SELECT pg_sleep(0.3)');
        const sub = await tx.candidateSubmission.create({
          data: {
            placementCaseId: placementCaseForSubmission,
            slotId: slotId,
            fullName: 'Anonymous Tester',
            phone: `${runId}-sub`,
            status: 'NEW',
          },
          select: { id: true },
        });
        submissionIds.push(sub.id);
        return sub.id;
      },
    );

    // Connection A: calls updateStaffingOrder with slot._delete under
    // GUC ADMIN. Service acquires both the order + slot canonical locks
    // and re-reads deps — sees the new submission → SLOT_HAS_DEPENDENCIES.
    const connA = makeClient(writerUrl);
    const updateStart = Date.now();
    let caught: StaffingOrderServiceError | null = null;
    try {
      await withContext(connA, ADMIN_CTX.userId, ADMIN_CTX.role, async (tx) => {
        await updateStaffingOrder(tx, ADMIN_CTX, orderId, {
          slots: [{ id: slotId, _delete: true } as never],
        });
      });
    } catch (e) {
      if (e instanceof StaffingOrderServiceError) caught = e;
      else throw e;
    }
    const updateMs = Date.now() - updateStart;
    expect(caught, 'updateStaffingOrder(slot._delete) must throw, not silently delete').not.toBeNull();
    expect(caught?.code).toBe('SLOT_HAS_DEPENDENCIES');
    expect(updateMs).toBeGreaterThanOrEqual(250);

    const slotStillExists = await admin.staffingOrderSlot.findUnique({ where: { id: slotId }, select: { id: true } });
    expect(slotStillExists?.id).toBe(slotId);

    await inserterPromise;
    await connA.$disconnect().catch(() => undefined);
    await connB.$disconnect().catch(() => undefined);
    console.log('[t1a] Case B: updateMs=%d', updateMs);
  });

  it('Case C: two concurrent deleteStaffingOrder on the same order — exactly one wins, other gets NOT_FOUND, NO 500', async () => {
    const orderId = orderSameLock;

    const connA = makeClient(writerUrl);
    const connB = makeClient(writerUrl);

    const deleteA = (async () => {
      try {
        await withContext(connA, ADMIN_CTX.userId, ADMIN_CTX.role, async (tx) => {
          return await deleteStaffingOrder(tx, ADMIN_CTX, orderId);
        });
        return { ok: true as const };
      } catch (e) {
        if (e instanceof StaffingOrderServiceError) return { ok: false as const, code: e.code };
        throw e;
      }
    })();

    // Stagger B by 30ms to make the race shape deterministic: A grabs
    // the canonical lock first; B blocks on it.
    await new Promise((r) => setTimeout(r, 30));
    const deleteB = (async () => {
      try {
        await withContext(connB, ADMIN_CTX.userId, ADMIN_CTX.role, async (tx) => {
          return await deleteStaffingOrder(tx, ADMIN_CTX, orderId);
        });
        return { ok: true as const };
      } catch (e) {
        if (e instanceof StaffingOrderServiceError) return { ok: false as const, code: e.code };
        throw e;
      }
    })();

    const [resultA, resultB] = await Promise.all([deleteA, deleteB]);

    // Exactly one winner.
    const winners = [resultA, resultB].filter((r) => r.ok);
    const losers = [resultA, resultB].filter((r) => !r.ok);
    expect(winners.length).toBe(1);
    expect(losers.length).toBe(1);
    // Loser sees the row gone (NOT_FOUND) — never a 500.
    const loserCode = losers[0] && !losers[0].ok ? (losers[0] as { ok: false; code: string }).code : '';
    expect(loserCode).toBe('NOT_FOUND');

    await connA.$disconnect().catch(() => undefined);
    await connB.$disconnect().catch(() => undefined);
    console.log('[t1a] Case C: resultA=%j, resultB=%j', resultA, resultB);
  });
});
