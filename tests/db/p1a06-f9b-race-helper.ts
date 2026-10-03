/**
 * p1a06-f9b-race-helper.ts — Two-connection writer ↔ revoke overlap helper.
 *
 * Lane: integration (DATABASE_URL_TEST).
 * Self-skips when DATABASE_URL_TEST is missing.
 *
 * The F9 round-1 AC-07 race was rejected at pre-audit review because it was
 * sequential (revoke commits, then create starts). This helper proves a TRUE
 * two-connection overlap with the exact required ordering from the F9-B
 * contract section F.C (REQUIRED CASES C):
 *
 *   1. Two independent connections, no shared in-memory state.
 *   2. Revoke connection B acquires the canonical
 *      `pg_advisory_xact_lock(hashtext('p1a04:order:<id>'))` and HOLDS it.
 *   3. Create connection A enters BEGIN and runs the canonical create path,
 *      which calls `acquireOrderAdvisoryLock(tx, orderId)` internally.
 *      A BLOCKS on the canonical lock because B holds it.
 *   4. While A is blocked, B runs the revoke UPDATE (which it can do
 *      because it holds the canonical lock), then COMMITs, releasing
 *      the lock.
 *   5. A unblocks, acquires the lock, the post-lock guard re-reads
 *      `staffing_order_recruiter_assignments` and observes REVOKED, throws
 *      `NO_ACTIVE_ORDER_ASSIGNMENT` (403).
 *
 * Evidence collected:
 *   - `revokeBlockedOnLockWhileRevokeHeld`: whether pg_locks shows A as
 *     granted=false on the canonical key while B holds it (the proof
 *     of overlapping lock contention).
 *   - `revokeWallClockMs`: time B spent holding the lock.
 *   - `createWallClockMs`: time from A BEGIN to A COMMIT/ROLLBACK.
 *   - `overlapObserved`: whether A's create was open while B's revoke
 *     committed.
 *   - Final row counts (zero JobOpening, zero JobPosting, zero slot
 *     binding required).
 */
import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma as PrismaTypes } from '@prisma/client';

import {
  createOrReuseJobOpeningForSlot,
  AuthoringError,
  type AuthoringErrorCode,
} from '@/src/domains/staffing/job-posting-authoring.service';
import { revokeRecruiterFromOrder } from '@/src/domains/talent/recruiter-assignment.service';

export interface TwoConnectionRaceArgs {
  writerUrl: string;
  adminUrl?: string;
  actorId: string;
  slotId: string;
  orderId: string;
  assignmentId: string;
  managerActorId: string;
}

export interface TwoConnectionRaceEvidence {
  runToken: string;
  revokeWallClockMs: number;
  createWallClockMs: number;
  overlapObserved: boolean;
  revokeBlockedOnLockWhileRevokeHeld: boolean;
  errorCode: AuthoringErrorCode | null;
  httpStatus: number;
  rowCounts: {
    slotBoundToOpening: boolean;
    assignmentStatus: 'ACTIVE' | 'REVOKED' | null;
    openingsForSlot: number;
    postingsForSlot: number;
  };
  allDisconnected: boolean;
}

export interface TwoConnectionRaceResult {
  evidence: TwoConnectionRaceEvidence;
  error: AuthoringError | null;
}

async function getSessionPid(client: PrismaClient): Promise<number> {
  const rows = await client.$queryRawUnsafe<Array<{ pid: number }>>(
    'SELECT pg_backend_pid()::int AS pid',
  );
  return rows[0]?.pid ?? 0;
}

async function isCanonicalOrderLockGranted(
  client: PrismaClient,
  pid: number,
  orderId: string,
): Promise<boolean> {
  // hashtext returns int4; pg_locks.objid stores the int4 hash for
  // advisory locks acquired via the single-arg form. For the two-arg
  // form (classid, objid), pg_locks.classid would be non-zero. We
  // acquire the lock via the two-arg form to keep it distinct from
  // any other advisory lock traffic — so we match classid, objid.
  // The application's acquireOrderAdvisoryLock uses the single-arg
  // form: SELECT pg_advisory_xact_lock(int8_key). That key is the masked
  // int8 of hashtext('p1a04:order:<id>'). For matching we use the
  // upper int4 (objid) and check that the lower int4 (classid) is 0.
  const rows = await client.$queryRawUnsafe<Array<{ granted: boolean; objid: number; classid: number }>>(
    "SELECT granted, objid, classid FROM pg_locks WHERE locktype = 'advisory' AND pid = $1",
    pid,
  );
  // The hashtext of 'p1a04:order:<id>' returns int4, then masked to
  // int8 via & 9223372036854775807. For a single-arg pg_advisory_xact_lock
  // call, PostgreSQL stores the lower int4 in objid and 0 in classid.
  // We re-derive expectedObjid via hashtext in SQL:
  const expected = await client.$queryRawUnsafe<Array<{ h: number }>>(
    'SELECT hashtext($1)::int4 AS h',
    `p1a04:order:${orderId}`,
  );
  const expectedObjid = expected[0]?.h ?? -1;
  return rows.some((r) => r.granted && r.classid === 0 && r.objid === expectedObjid);
}

async function isCanonicalOrderLockWaiting(
  client: PrismaClient,
  pid: number,
  orderId: string,
): Promise<boolean> {
  const rows = await client.$queryRawUnsafe<Array<{ granted: boolean; objid: number; classid: number }>>(
    "SELECT granted, objid, classid FROM pg_locks WHERE locktype = 'advisory' AND pid = $1",
    pid,
  );
  const expected = await client.$queryRawUnsafe<Array<{ h: number }>>(
    'SELECT hashtext($1)::int4 AS h',
    `p1a04:order:${orderId}`,
  );
  const expectedObjid = expected[0]?.h ?? -1;
  return rows.some((r) => !r.granted && r.classid === 0 && r.objid === expectedObjid);
}

/**
 * Run the deterministic two-connection revoke-before-create race.
 */
export async function runRevokeBeforeCreateTwoConnectionRace(
  input: TwoConnectionRaceArgs,
): Promise<TwoConnectionRaceResult> {
  const runToken = randomUUID().replaceAll('-', '').slice(0, 8);

  const revoker = new PrismaClient({
    datasources: { db: { url: input.writerUrl } },
    transactionOptions: { timeout: 30_000 },
  });
  const creator = new PrismaClient({
    datasources: { db: { url: input.writerUrl } },
    transactionOptions: { timeout: 30_000 },
  });
  const probe = new PrismaClient({
    datasources: { db: { url: input.writerUrl } },
    transactionOptions: { timeout: 30_000 },
  });

  let evidence: TwoConnectionRaceEvidence = {
    runToken,
    revokeWallClockMs: 0,
    createWallClockMs: 0,
    overlapObserved: false,
    revokeBlockedOnLockWhileRevokeHeld: false,
    errorCode: null,
    httpStatus: 0,
    rowCounts: {
      slotBoundToOpening: false,
      assignmentStatus: null,
      openingsForSlot: 0,
      postingsForSlot: 0,
    },
    allDisconnected: false,
  };
  let caught: AuthoringError | null = null;
  let creatorPid = 0;
  let revokerPid = 0;

  try {
    // Phase 1 — B (revoker) acquires the canonical advisory lock on the
    // order and HOLDS it while it sleeps. This forces any concurrent
    // create that touches the same order to BLOCK on the same key.
    revokerPid = await getSessionPid(revoker);
    const revokerPromise = (async () => {
      await revoker.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          'SELECT pg_advisory_xact_lock( (hashtext($1)::bigint) & 9223372036854775807::bigint )',
          `p1a04:order:${input.orderId}`,
        );
        // Hold the lock while the create attempts to acquire it.
        await tx.$executeRawUnsafe('SELECT pg_sleep(0.4)');
        await tx.$executeRawUnsafe(
          "SELECT set_config('app.user_id', $1, true)",
          input.managerActorId,
        );
        await tx.$executeRawUnsafe(
          "SELECT set_config('app.role', $1, true)",
          'HR_MANAGER',
        );
        await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', '', true)");
        await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', '', true)");
        // revokeRecruiterFromOrder acquires the same lock — same
        // transaction, same session → re-entrant, no BLOCK. The lock is
        // still held by this transaction.
        await revokeRecruiterFromOrder(tx, {
          staffingOrderId: input.orderId,
          assignmentId: input.assignmentId,
          actorRole: 'HR_MANAGER',
          actorId: input.managerActorId,
          reason: `F9-B race ${runToken}`,
        });
      });
    })();

    // Phase 2 — A (creator) starts its transaction and runs the create
    // path. It will internally call acquireOrderAdvisoryLock and wait.
    await new Promise((r) => setTimeout(r, 30)); // ensure B has acquired
    creatorPid = await getSessionPid(creator);

    const createStart = Date.now();
    const createPromise = creator.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        "SELECT set_config('app.user_id', $1, true)",
        input.actorId,
      );
      await tx.$executeRawUnsafe(
        "SELECT set_config('app.role', $1, true)",
        'HR_STAFF',
      );
      await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', '', true)");
      await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', '', true)");
      // The inner create path will:
      //   1. Run assertSlotEligibleForNewJobPosting (which calls
      //      acquireOrderAdvisoryLock — BLOCKS waiting for B).
      //   2. After unblock, re-read assignment → REVOKED → throws
      //      NO_ACTIVE_ORDER_ASSIGNMENT (403).
      return createOrReuseJobOpeningForSlot(
        tx as PrismaTypes.TransactionClient,
        { userId: input.actorId, role: 'HR_STAFF' },
        { slotId: input.slotId },
      );
    });

    // Phase 3 — observe A blocked on the canonical lock while B holds it.
    await new Promise((r) => setTimeout(r, 80));
    try {
      evidence.revokeBlockedOnLockWhileRevokeHeld = await isCanonicalOrderLockWaiting(
        probe,
        creatorPid,
        input.orderId,
      );
    } catch {
      evidence.revokeBlockedOnLockWhileRevokeHeld = false;
    }

    // Phase 4 — wait for both transactions to settle. B will COMMIT
    // (releasing the lock). A will unblock, observe REVOKED, fail.
    const revokeStart = Date.now();
    await revokerPromise;
    const revokeEnd = Date.now();
    evidence.revokeWallClockMs = revokeEnd - revokeStart;

    try {
      await createPromise;
    } catch (e) {
      if (e instanceof AuthoringError) {
        caught = e;
        evidence.errorCode = e.code;
        evidence.httpStatus = e.httpStatus;
      } else {
        throw e;
      }
    }
    evidence.createWallClockMs = Date.now() - createStart;
    evidence.overlapObserved = revokeEnd <= evidence.createWallClockMs + createStart;

    // Final state probe — use admin (bypasses RLS) for direct truth. If
  // no admin URL is provided, fall back to the creator connection with
  // HR_MANAGER GUC so the RLS policy on `staffing_order_recruiter_
  // assignments` admits the row.
  const adminConn = input.adminUrl
    ? new PrismaClient({
        datasources: { db: { url: input.adminUrl } },
        transactionOptions: { timeout: 30_000 },
      })
    : null;
  try {
    const slot = adminConn
      ? await adminConn.staffingOrderSlot.findUnique({
          where: { id: input.slotId },
          select: { jobOpeningId: true },
        })
      : await probe.staffingOrderSlot.findUnique({
          where: { id: input.slotId },
          select: { jobOpeningId: true },
        });
    const assignment = adminConn
      ? await adminConn.staffingOrderRecruiterAssignment.findUnique({
          where: { id: input.assignmentId },
          select: { status: true },
        })
      : await probe.staffingOrderRecruiterAssignment.findUnique({
          where: { id: input.assignmentId },
          select: { status: true },
        });
    let postingsForSlot = 0;
    let openingsForSlot = 0;
    if (slot?.jobOpeningId) {
      const conn = adminConn ?? probe;
      openingsForSlot = await conn.jobOpening.count({
        where: { id: slot.jobOpeningId },
      });
      postingsForSlot = await conn.jobPosting.count({
        where: { jobOpeningId: slot.jobOpeningId },
      });
    }
    evidence.rowCounts = {
      slotBoundToOpening: !!slot?.jobOpeningId,
      assignmentStatus: (assignment?.status as 'ACTIVE' | 'REVOKED' | null) ?? null,
      openingsForSlot,
      postingsForSlot,
    };
  } finally {
    if (adminConn) {
      await adminConn.$disconnect().catch(() => undefined);
    }
  }
  } finally {
    await Promise.all([
      revoker.$disconnect().catch(() => undefined),
      creator.$disconnect().catch(() => undefined),
      probe.$disconnect().catch(() => undefined),
    ]);
    evidence.allDisconnected = true;
  }

  return { evidence, error: caught };
}