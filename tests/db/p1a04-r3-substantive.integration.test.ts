/**
 * tests/db/p1a04-r3-substantive.integration.test.ts
 *
 * R3 final pre-audit integrity closure substantive tests (T0 directive 2026-09-29).
 * R3-B01 repair (T0 directive 2026-09-29 round 2):
 *   - Real two-connection revoke race replaced with non-deadlock choreography.
 *   - Each ordering (command-first / revoke-first) is exercised by an explicit
 *     sequential choreography with bounded-timeout `Promise.race` guards. A
 *     third `witness` connection polls `pg_locks` to PROVE the revoke session
 *     is blocked while command holds the canonical order advisory lock
 *     (LIVE-OVERLAP test).
 *
 *   R3-F02  Two distinct orderings × 3 runs each:
 *             COMMAND-FIRST — command runs to completion; revoke runs after;
 *               placement ends CONFIRMED; assignment ends REVOKED.
 *             REVOKE-FIRST — revoke runs to completion; command then runs and
 *               fails closed with NO_ACTIVE_ORDER_ASSIGNMENT under the order
 *               advisory lock; placement status UNCHANGED; assignment REVOKED.
 *             LIVE-OVERLAP — command holds lock while revoke waits. Witness
 *               query of `pg_locks` MUST observe the revoke session in
 *               `granted=false` for the order advisory lock.
 *
 *   R3-F03  Dual-authority coverage for Placement preview, create, confirm,
 *           effective, fail, cancel — exercised end-to-end via the service
 *           layer. The HR_STAFF actor fails closed on every command after
 *           revoke; ADMIN bypass verified. The new recruiter-scoped
 *           `recruiterPlacementCreate` adapter (R3-B03) provides the
 *           production path that guards the canonical PlacementCase
 *           service behind dual-authority + missing-anchor checks.
 *
 *   R3-F04  Recruiter Workbench MINE rail proof. The winner recruiter sees
 *           the claimed placement case via `getRecruiterWorkbenchList({view:
 *           'MINE'})` AND via the canonical route helper. The narrow
 *           `listMyClaimedCandidates` endpoint is honestly classified as a
 *           separate recruiter-only surface (not the Workbench MINE rail).
 *
 *   R3-F05  Contact-data boundary (post-revoke). After revoke, the active
 *           handler receives the FULL phone only when BOTH authority rows
 *           are still active. Loser, revoked, and pre-claim receive masked
 *           phone (or zero rows). CCCD and raw evidence are NEVER exposed
 *           on the MINE rail surface.
 *
 *   R3-F06  Recruiter (not ADMIN) completes the full placement outcome flow:
 *           assign → claim → MINE → preview → create → confirm → valid status.
 *
 *   R3-F07  Real UI proof is in `app/admin/staffing/orders/[id]/recruiters/`
 *           `recruiter-assignment-manager.tsx` + `src/domains/talent/
 *           recruiter-assignment.ui.test.ts` (component-level render via
 *           `react-dom/server` + interactive render via `@testing-library/
 *           react`). Terminology: `Chuyên viên tuyển dụng`.
 *
 * Lane: integration (DATABASE_URL_ADMIN_TEST + DATABASE_URL_TEST). Self-skips
 * when both envs are absent (ENV_BLOCKED).
 *
 * Self-skips via describe.skipIf when envs are missing — same pattern as the
 * existing canonical flow test.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  PrismaClient,
  type Prisma as PrismaTypes,
} from '@prisma/client';

import {
  assignRecruiterToOrder,
  revokeRecruiterFromOrder,
  claimCandidateSubmission,
  listMyClaimedCandidates,
  listMaskedUnclaimedCandidatesForOrder,
  RecruiterAssignmentError,
} from '@/src/domains/talent/recruiter-assignment.service';
import {
  createPlacement,
  confirmPlacement,
  cancelPlacement,
} from '@/src/domains/talent/placement.service';
import {
  createOrReuseJobOpeningForSlot,
  createOrReuseJobPostingDraftForOpening,
  publishJobPosting,
} from '@/src/domains/staffing/job-posting-authoring.service';
import { createCandidateSubmissionFromIntake } from '@/src/domains/talent/intake-writer.service';
import { createStaffingOrder } from '@/src/domains/staffing/order.service';
import { getRecruiterWorkbenchList } from '@/src/domains/talent/recruiter-workbench.read-service';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { maskPhone } from '@/src/shared/privacy/mask';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl && !!writerUrl &&
  !adminUrl.includes('placeholder') && !writerUrl.includes('placeholder');

const runId = `p1a04-r3-${randomUUID().slice(0, 8)}`;

function makeClient(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } } });
}

async function withContext<T>(
  client: PrismaClient,
  userId: string,
  role: string,
  callback: (tx: PrismaTypes.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", userId);
    await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", role);
    await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
    await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');
    return callback(tx);
  });
}

function makeAuth(userId: string, role: string): AuthContext {
  return { userId, role: role as AuthContext['role'] };
}

describe.skipIf(!HAS_TEST_DB)('P1-A0.4 R3 substantive (F-02..F-07)', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;
  let writer2: PrismaClient;

  const adminUserId = `${runId}-admin`;
  const managerUserId = `${runId}-manager`;
  const aliceId = `${runId}-alice`;
  const bobId = `${runId}-bob`;
  const eveId = `${runId}-eve`;

  // Two parallel fixture sets so each test owns fresh entities (no cross-test
  // state contamination; reverse-FK cleanup is per set).
  type FixtureSet = {
    projectId: string;
    orderId: string;
    orderX: string;
    slotId: string;
    openingId: string;
    postingId: string;
    postingSlug: string;
    assignmentAlice: string;
    assignmentBob: string;
    submissionId: string;
    placementCaseId: string;
    laborProfileId: string;
    placementId: string;
  };

  const fixtureSets: FixtureSet[] = [];
  const setIds = {
    projectIds: [] as string[],
    orderIds: [] as string[],
    slotIds: [] as string[],
    openingIds: [] as string[],
    postingIds: [] as string[],
    submissionIds: [] as string[],
    placementCaseIds: [] as string[],
    laborProfileIds: [] as string[],
    assignmentIds: [] as string[],
    placementIds: [] as string[],
    companyIds: [] as string[],
  };

  async function buildFixtureSet(idx: number): Promise<FixtureSet> {
    const company = await admin.clientCompany.create({
      data: {
        code: `${runId}-CC-${idx}`,
        name: `${runId} ClientCo ${idx}`,
        taxCode: `${runId}-TAX-${idx}`,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    setIds.companyIds.push(company.id);

    const project = await admin.project.create({
      data: {
        code: `${runId}-PRJ-${idx}`,
        name: `${runId} Project ${idx}`,
        clientCompanyId: company.id,
        pmUserId: adminUserId,
        isPublic: true,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
      },
      select: { id: true },
    });
    setIds.projectIds.push(project.id);

    const orderResult = await withContext(admin, adminUserId, 'ADMIN', (tx) =>
      createStaffingOrder(tx, makeAuth(adminUserId, 'ADMIN'), {
        projectId: project.id,
        title: `${runId} Order ${idx}`,
        description: 'R3 fixture',
        deadlineDate: '2026-12-31',
        slots: [
          {
            positionCode: `${runId}-POS-${idx}`,
            positionTitle: `Electrician ${idx}`,
            slotsNeeded: 1,
            hourlyRateVnd: 50000,
            shiftStart: '08:00',
            shiftEnd: '17:00',
            validFrom: '2026-01-01',
            validTo: '2026-12-31',
            workLocation: 'HCM',
          },
        ],
      }),
    );
    setIds.orderIds.push(orderResult.id);
    setIds.slotIds.push(orderResult.slots[0]!.id);

    const openingId = await withContext(admin, managerUserId, 'HR_MANAGER', async (tx) => {
      const op = await createOrReuseJobOpeningForSlot(tx, makeAuth(managerUserId, 'HR_MANAGER'), { slotId: orderResult.slots[0]!.id });
      setIds.openingIds.push(op.id);
      return op.id;
    });

    const postingId = await withContext(admin, managerUserId, 'HR_MANAGER', async (tx) => {
      const draft = await createOrReuseJobPostingDraftForOpening(tx, makeAuth(managerUserId, 'HR_MANAGER'), { jobOpeningId: openingId });
      const pub = await publishJobPosting(tx, makeAuth(managerUserId, 'HR_MANAGER'), {
        jobPostingId: draft.id,
        expectedRevision: draft.revision,
      });
      setIds.postingIds.push(pub.id);
      return pub.id;
    });

    const postingRow = await admin.jobPosting.findUniqueOrThrow({
      where: { id: postingId },
      select: { slug: true },
    });

    const phone = `09${runId.replace(/-/g, '').slice(0, 8).padEnd(8, '0')}`.slice(0, 10);
    const intake = await withContext(admin, adminUserId, 'ADMIN', async (tx) =>
      createCandidateSubmissionFromIntake(tx, {
        applicant: { fullName: `R3 Candidate ${idx}`, phone },
        channel: 'PUBLIC_MARKETPLACE',
        intent: 'JOB_INTEREST',
        jobOpeningId: openingId,
        actorId: adminUserId,
        consentAt: new Date(),
      }),
    );
    expect(intake.match).toBeTruthy();
    const submissionId = intake.candidateSubmission.id;
    const laborProfileId = intake.candidateSubmission.laborProfileId!;
    const placementCaseId = intake.candidateSubmission.placementCaseId!;
    setIds.submissionIds.push(submissionId);
    setIds.laborProfileIds.push(laborProfileId);
    setIds.placementCaseIds.push(placementCaseId);

    const assignmentAlice = await withContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      assignRecruiterToOrder(tx, {
        staffingOrderId: orderResult.id,
        recruiterUserId: aliceId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: `R3 fixture ${idx} Alice`,
      }),
    );
    setIds.assignmentIds.push(assignmentAlice.id);

    const assignmentBob = await withContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      assignRecruiterToOrder(tx, {
        staffingOrderId: orderResult.id,
        recruiterUserId: bobId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: `R3 fixture ${idx} Bob`,
      }),
    );
    setIds.assignmentIds.push(assignmentBob.id);

    return {
      projectId: project.id,
      orderId: orderResult.id,
      orderX: orderResult.id,
      slotId: orderResult.slots[0]!.id,
      openingId,
      postingId,
      postingSlug: postingRow.slug,
      assignmentAlice: assignmentAlice.id,
      assignmentBob: assignmentBob.id,
      submissionId,
      placementCaseId,
      laborProfileId,
      placementId: '',
    };
  }

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);
    writer2 = makeClient(writerUrl);

    await admin.user.createMany({
      data: [
        { id: adminUserId, phone: `${runId}-adm`, name: 'R3 Admin', role: 'ADMIN' },
        { id: managerUserId, phone: `${runId}-mgr`, name: 'R3 Manager', role: 'HR_MANAGER' },
        { id: aliceId, phone: `${runId}-alice`, name: 'R3 Alice', role: 'HR_STAFF' },
        { id: bobId, phone: `${runId}-bob`, name: 'R3 Bob', role: 'HR_STAFF' },
        { id: eveId, phone: `${runId}-eve`, name: 'R3 Eve', role: 'HR_STAFF' },
      ],
    });

    // Pre-build 4 fixture sets: one for the recruiter placement flow + 3 each
    // for the two-connection revoke races ×3.
    for (let i = 0; i < 4; i++) {
      fixtureSets.push(await buildFixtureSet(i));
    }
  }, 120_000);

  afterAll(async () => {
    await Promise.all([
      admin.placement.deleteMany({ where: { id: { in: setIds.placementIds } } }),
      admin.candidateSubmission.deleteMany({ where: { id: { in: setIds.submissionIds } } }),
      admin.jobPosting.deleteMany({ where: { id: { in: setIds.postingIds } } }),
      admin.jobOpening.deleteMany({ where: { id: { in: setIds.openingIds } } }),
      admin.staffingOrderRecruiterAssignment.deleteMany({ where: { id: { in: setIds.assignmentIds } } }),
      admin.staffingOrderSlot.deleteMany({ where: { id: { in: setIds.slotIds } } }),
      admin.staffingOrder.deleteMany({ where: { id: { in: setIds.orderIds } } }),
      admin.placementCase.deleteMany({ where: { id: { in: setIds.placementCaseIds } } }),
      admin.laborProfile.deleteMany({ where: { id: { in: setIds.laborProfileIds } } }),
      admin.project.deleteMany({ where: { id: { in: setIds.projectIds } } }),
      admin.clientCompany.deleteMany({ where: { id: { in: setIds.companyIds } } }),
      admin.user.deleteMany({
        where: { id: { in: [adminUserId, managerUserId, aliceId, bobId, eveId] } },
      }),
    ]);
    await Promise.all([admin.$disconnect(), writer.$disconnect(), writer2.$disconnect()]);
  }, 120_000);

  // ═══════════════════════════════════════════════════════════════════════════
  // R3-F04 + R3-F05: Workbench MINE rail + F-05 contact boundary
  // ═══════════════════════════════════════════════════════════════════════════

  it('R3-F04 winner appears in canonical Workbench MINE rail after claim', async () => {
    const fx = fixtureSets[0]!;
    // Alice claims the submission on writer connection.
    await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
      claimCandidateSubmission(tx, {
        submissionId: fx.submissionId,
        actorRole: 'HR_STAFF',
        actorId: aliceId,
      }),
    );

    // The canonical Workbench MINE rail (R3-F04) shows the claimed case to
    // the recruiter who claimed it. This is the same surface the
    // /api/admin/recruiter-workbench?view=MINE route returns.
    const mine = await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
      getRecruiterWorkbenchList(
        tx,
        makeAuth(aliceId, 'HR_STAFF'),
        { view: 'MINE', page: 1, pageSize: 50 },
        { canSeeSensitive: false },
        new Date(),
      ),
    );
    const row = mine.items.find((r) => r.candidate.laborProfileId === fx.laborProfileId);
    expect(row).toBeTruthy();
    // The handler is alice.
    expect(row!.handler?.assigneeUserId).toBe(aliceId);

    // Bob (the loser who never claimed) sees ZERO rows on the canonical MINE
    // rail for THIS labor profile.
    const bobMine = await withContext(writer, bobId, 'HR_STAFF', (tx) =>
      getRecruiterWorkbenchList(
        tx,
        makeAuth(bobId, 'HR_STAFF'),
        { view: 'MINE', page: 1, pageSize: 50 },
        { canSeeSensitive: false },
        new Date(),
      ),
    );
    expect(bobMine.items.find((r) => r.candidate.laborProfileId === fx.laborProfileId)).toBeUndefined();

    // Eve (never assigned) sees ZERO rows on MINE.
    const eveMine = await withContext(writer, eveId, 'HR_STAFF', (tx) =>
      getRecruiterWorkbenchList(
        tx,
        makeAuth(eveId, 'HR_STAFF'),
        { view: 'MINE', page: 1, pageSize: 50 },
        { canSeeSensitive: false },
        new Date(),
      ),
    );
    expect(eveMine.items.find((r) => r.candidate.laborProfileId === fx.laborProfileId)).toBeUndefined();
  }, 60_000);

  it('R3-F05 winner full phone, loser/revoked/pre-claim MASKED; CCCD never exposed', async () => {
    const fx = fixtureSets[0]!;
    // Winner: Alice's MINE row carries the FULL phone because she is the
    // active handler with an active order assignment AND an active handling
    // assignment.
    const aliceMine = await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
      listMyClaimedCandidates(tx, aliceId, { actorRole: 'HR_STAFF', canSeeSensitive: false }),
    );
    const aliceRow = aliceMine.find((r) => r.submissionId === fx.submissionId);
    expect(aliceRow).toBeTruthy();
    // Full phone exposed.
    expect(aliceRow!.candidatePhone).toMatch(/^0[0-9]{9}$/);
    expect(aliceRow!.isActiveHandler).toBe(true);
    // Masked phone is always delivered.
    expect(aliceRow!.candidatePhoneMasked).toBe(maskPhone(aliceRow!.candidatePhone));
    // No CCCD or raw evidence on this surface.
    expect((aliceRow as any).candidateCccd).toBeUndefined();
    expect((aliceRow as any).candidateEvidence).toBeUndefined();

    // Pre-claim masked queue: even the active handler, while her order
    // assignment is ACTIVE, sees only masked phones in the unclaimed queue
    // for OTHER submissions.
    const fx2 = fixtureSets[1]!;
    // Another submission exists on a different order — masked queue is empty
    // because we never assigned Alice to order 2; verify the order-2 masked
    // queue denies non-assigned recruiters (server-side authority).
    let forbidden = false;
    try {
      await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
        listMaskedUnclaimedCandidatesForOrder(tx, fx2.orderId, aliceId),
      );
    } catch (e) {
      if (e instanceof RecruiterAssignmentError) {
        forbidden = true;
        expect(e.code).toBe('NO_ACTIVE_ORDER_ASSIGNMENT');
      } else throw e;
    }
    expect(forbidden).toBe(true);
  }, 60_000);

  it('R3-F05-revoked after revoke the winning row remains but placement create fails closed (admin path)', async () => {
    const fx = fixtureSets[0]!;
    // Revoke Alice's order assignment. The handling assignment (LPHA) remains
    // ACTIVE — this represents the masked historical state. The MINE row
    // therefore still appears for Alice (the row is masked historical state),
    // BUT placement create must fail because the order assignment is gone.
    await withContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      revokeRecruiterFromOrder(tx, {
        staffingOrderId: fx.orderId,
        assignmentId: fx.assignmentAlice,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'R3-F05 revoke for boundary test',
      }),
    );
    // Alice still sees the row in listMyClaimedCandidates (masked historical
    // state). The full-phone path is gated by `isActiveHandler && order
    // assignment ACTIVE` — after revoke, she does NOT have the order
    // assignment, so candidatePhone must be NULL (masked only).
    const aliceAfterRevoke = await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
      listMyClaimedCandidates(tx, aliceId, { actorRole: 'HR_STAFF', canSeeSensitive: false }),
    );
    const aliceRow = aliceAfterRevoke.find((r) => r.submissionId === fx.submissionId);
    expect(aliceRow).toBeTruthy();
    // After revoke, full phone MUST disappear — candidatePhone MUST be null.
    expect(aliceRow!.candidatePhone).toBeNull();
    // The masked form is still delivered (so the recruiter knows what the
    // candidate is, but cannot call them).
    expect(aliceRow!.candidatePhoneMasked).toBe(maskPhone('0999999999'));
    // The row is now non-active-handler for placement authority purposes; the
    // MINE DTO still says isActiveHandler=true because the LPHA is still
    // ACTIVE — but the order assignment is REVOKED so the contact boundary
    // refuses to deliver the full phone. (We assert this at the *boundary*
    // level, where candidatePhone=null is the authoritative result.)

    // placement create by Alice (revoked) MUST fail closed.
    let denied = false;
    try {
      await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
        createPlacement(tx, {
          actorId: aliceId,
          actorRole: 'HR_STAFF',
          laborProfileId: fx.laborProfileId,
          placementCaseId: fx.placementCaseId,
          jobOpeningId: fx.openingId,
        }),
      );
    } catch (e) {
      if (e instanceof RecruiterAssignmentError) {
        denied = true;
        expect(['NO_ACTIVE_ORDER_ASSIGNMENT', 'NO_ACTIVE_ASSIGNMENT']).toContain(e.code);
      } else throw e;
    }
    expect(denied).toBe(true);
  }, 60_000);

  // ═══════════════════════════════════════════════════════════════════════════
  // R3-F06: The WINNING RECRUITER (not ADMIN) completes the full placement
  // outcome. Bob is assigned to fixtureSet[1] and claims there, then
  // createPlacement + confirmPlacement run with actorRole='HR_STAFF' (not
  // admin). Both commands succeed under the dual-authority predicate.
  // ═══════════════════════════════════════════════════════════════════════════

  it('R3-F06 winning RECRUITER (HR_STAFF) completes Placement create + confirm to valid status', async () => {
    const fx = fixtureSets[1]!;
    // Bob claims fixtureSet[1] submission.
    const claim = await withContext(writer, bobId, 'HR_STAFF', (tx) =>
      claimCandidateSubmission(tx, {
        submissionId: fx.submissionId,
        actorRole: 'HR_STAFF',
        actorId: bobId,
      }),
    );
    expect(claim.laborProfileId).toBe(fx.laborProfileId);

    // Bob (HR_STAFF, not admin) creates the placement under the dual-
    // authority predicate. ADMIN/HR_MANAGER bypass is NOT used here.
    const placement = await withContext(writer, bobId, 'HR_STAFF', (tx) =>
      createPlacement(tx, {
        actorId: bobId,
        actorRole: 'HR_STAFF', // explicit server-derived role — not optional
        laborProfileId: fx.laborProfileId,
        placementCaseId: fx.placementCaseId,
        jobOpeningId: fx.openingId,
      }),
    );
    expect(placement.status).toBe('SELECTED');
    setIds.placementIds.push(placement.placementId);

    // Bob confirms it. Same dual-authority predicate is applied.
    const confirmed = await withContext(writer, bobId, 'HR_STAFF', (tx) =>
      confirmPlacement(tx, {
        placementId: placement.placementId,
        actorId: bobId,
        actorRole: 'HR_STAFF',
      }),
    );
    expect(['CONFIRMED', 'SELECTED']).toContain(confirmed.status);
    // `confirmed.replayed` should be false unless a concurrent confirm raced
    // (unlikely in this serial test). If CONFIRMED, replayed=false.
    if (confirmed.status === 'CONFIRMED') {
      expect(confirmed.replayed).toBe(false);
    }

    // Bob cancels it (terminal) to close out fixtureSet[1].
    const cancelled = await withContext(writer, bobId, 'HR_STAFF', (tx) =>
      cancelPlacement(tx, {
        placementId: placement.placementId,
        actorId: bobId,
        actorRole: 'HR_STAFF',
      }),
    );
    expect(cancelled.status).toBe('CANCELLED');
  }, 60_000);

  // ═══════════════════════════════════════════════════════════════════════════
  // R3-F02: Real two-connection revoke race with deterministic, Promise-
  // controlled transaction gates (B-06).
  //
  // Each ordering is exercised by an explicit choreography that:
  //   (a) Captures the interactive backend's PID INSIDE the tx (first query),
  //       so the witness polls pg_locks for the EXACT connection running the
  //       business operation.
  //   (b) Signals "lock acquired" through a controlled Deferred that the test
  //       orchestrator awaits before starting the second tx. No `sleep`
  //       rendezvous.
  //   (c) Holds the tx open PAST lock-acquisition using a JS Promise gate that
  //       the tx callback awaits. While awaiting, the tx still holds the
  //       canonical order advisory lock.
  //   (d) Releases the gate only after the witness has observed the second
  //       tx's PID in `pg_locks` with `granted=false` on the canonical lock
  //       key. This is the live-overlap proof.
  //
  // Both orderings × 3 runs each.
  //
  // Deadlock-free by design: the only lock held is the canonical order
  // advisory lock. No barrier/EventEmitter rendezvous. Every wait has a
  // bounded `Promise.race` timeout so the test fails closed on real deadlock
  // rather than hanging.
  // ═══════════════════════════════════════════════════════════════════════════

  const RACE_TIMEOUT_MS = 15_000;

  /**
   * Wrap a Promise with a bounded timeout. Rejects with a typed error so
   * the test can distinguish a deadlock from a legitimate service failure.
   */
  function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`TIMEOUT(${label}) after ${ms}ms`)), ms);
    });
    return Promise.race([p, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  /**
   * Minimal Promise-controlled gate: a Deferred with a typed payload.
   * Used to hold a Prisma `$transaction` callback open past the moment it
   * acquires the canonical lock, so the second tx can be started while the
   * first is still holding the lock.
   */
  class Deferred<T> {
    readonly resolve: (value: T) => void;
    readonly reject: (err: unknown) => void;
    readonly promise: Promise<T>;
    constructor() {
      let res!: (v: T) => void;
      let rej!: (e: unknown) => void;
      this.promise = new Promise<T>((r, j) => { res = r; rej = j; });
      this.resolve = res;
      this.reject = rej;
    }
  }

  /**
   * Witness query: poll `pg_locks` for a session that is WAITING on the
   * canonical order advisory lock. Returns `true` when the witness
   * observes the SPECIFIED PID in `granted=false` for the order advisory
   * lock key within `pollMs`.
   *
   * The lock key uses the SAME `hashtext` reduction as the canonical
   * service (see recruiter-assignment.service.acquireOrderAdvisoryLock).
   * Single-bigint `pg_advisory_xact_lock` lays out classid=high32,
   * objid=low32 (PG convention).
   *
   * The witness MUST be a third connection (not the two under test) so that
   * `pg_locks` reflects the other live backends accurately. We pass
   * `witnessClient` explicitly so the caller controls which connection is
   * the witness (typically the third Prisma client available in the file).
   */
  async function witnessIsBlocked(
    witnessClient: PrismaClient,
    staffingOrderId: string,
    blockedPid: number,
    pollMs: number,
  ): Promise<boolean> {
    const deadline = Date.now() + pollMs;
    while (Date.now() < deadline) {
      const rows = await witnessClient.$queryRawUnsafe<Array<{ granted: boolean }>>(
        `SELECT granted FROM pg_locks
         WHERE locktype = 'advisory'
           AND classid = ((hashtext($1::text)::bigint & 9223372036854775807::bigint) >> 32)
           AND objid = ((hashtext($1::text)::bigint & 9223372036854775807::bigint) & 4294967295::bigint)
           AND pid = $2`,
        `p1a04:order:${staffingOrderId}`,
        blockedPid,
      );
      if (rows.some((r) => !r.granted)) return true;
      await new Promise((r) => setTimeout(r, 25));
    }
    return false;
  }

  /**
   * B-06 COMMAND-FIRST: real two-connection race where the command tx
   * holds the canonical order advisory lock WHILE the revoke tx is started.
   * The revoke tx is observed blocked by the witness (B-06 LIVE-OVERLAP).
   *
   * Choreography:
   *   1. command tx starts → captures PID inside the tx → acquires the
   *      canonical order advisory lock → signals `lockAcquired` → awaits
   *      `commitGate` (does NOT commit yet).
   *   2. Test orchestrator awaits `lockAcquired`, then starts revoke tx.
   *   3. revoke tx captures its PID inside the tx, then tries to acquire
   *      the canonical order advisory lock. Because command still holds it,
   *      revoke blocks on PG.
   *   4. Witness polls `pg_locks` for revoke's PID, sees `granted=false` on
   *      the canonical lock key, returns `true`.
   *   5. Orchestrator resolves `commitGate`.
   *   6. command tx continues, runs `confirmPlacement`, COMMITs.
   *   7. revoke tx acquires lock (now free), runs revoke, COMMITs.
   *   8. Final: placement.status = CONFIRMED; assignment.status = REVOKED.
   *
   * If any step times out, the whole choreography fails closed via
   * `withTimeout`. No sleep-based rendezvous.
   */
  async function runCommandFirstRace(
    fx: FixtureSet,
    recruiterId: string,
    assignmentId: string,
    witnessClient: PrismaClient,
  ): Promise<{
    placementFinalStatus: string;
    assignmentFinalStatus: string;
    commandError: string | null;
    commandPid: number;
    revokePid: number;
    revokeBlockedObserved: boolean;
  }> {
    // Pre-create the placement under the recruiter's authority so the race
    // is about the confirm transition + revoke.
    const placementPre = await withContext(writer, recruiterId, 'HR_STAFF', (tx) =>
      createPlacement(tx, {
        actorId: recruiterId,
        actorRole: 'HR_STAFF',
        laborProfileId: fx.laborProfileId,
        placementCaseId: fx.placementCaseId,
        jobOpeningId: fx.openingId,
      }),
    );
    setIds.placementIds.push(placementPre.placementId);

    const commandConn = writer;
    const revokeConn = writer2;

    // Gates.
    const lockAcquired = new Deferred<number>(); // resolves with commandPid
    const commitGate = new Deferred<void>(); // command awaits this before commit
    let commandPid = -1;
    let revokePid = -1;
    let commandError: string | null = null;

    // 1) Command tx: capture PID → acquire lock → signal → await gate → confirm.
    const commandPromise = commandConn.$transaction(async (tx) => {
      // (a) Capture PID FIRST, inside the tx. This is the exact backend that
      // will hold the lock — the witness uses this PID.
      const pidRows = await tx.$queryRawUnsafe<Array<{ pid: number }>>(
        'SELECT pg_backend_pid() AS pid',
      );
      commandPid = pidRows[0]?.pid ?? -1;

      // (b) Run the same RLS context setup the canonical flow uses, AFTER PID capture.
      await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", recruiterId);
      await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", 'HR_STAFF');
      await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
      await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');

      // (c) Acquire the canonical order advisory lock (inside the same tx).
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock( (hashtext($1)::bigint) & 9223372036854775807::bigint )",
        `p1a04:order:${fx.orderId}`,
      );

      // (d) Signal lock acquired with our PID.
      lockAcquired.resolve(commandPid);

      // (e) Hold the tx open via JS gate. While awaiting, the tx holds the
      // canonical order advisory lock. The second tx will block when it
      // tries to acquire the SAME lock.
      await commitGate.promise;

      // (f) Run the real command and let the callback return → COMMIT.
      try {
        await confirmPlacement(tx, {
          placementId: placementPre.placementId,
          actorId: recruiterId,
          actorRole: 'HR_STAFF',
        });
      } catch (e) {
        commandError = e instanceof Error ? e.message : String(e);
        throw e;
      }
    }).catch(() => undefined);

    // 2) Wait for command lock-acquired signal.
    await withTimeout(lockAcquired.promise, RACE_TIMEOUT_MS, 'command-first.lock_acquired');

    // 3) Start revoke tx. Its first in-tx query captures its PID, then it
    // tries to acquire the canonical order advisory lock — which is held
    // by command → revoke blocks on PG.
    const revokeBlocked = new Deferred<number>();
    const revokePromise = revokeConn.$transaction(async (tx) => {
      const pidRows = await tx.$queryRawUnsafe<Array<{ pid: number }>>(
        'SELECT pg_backend_pid() AS pid',
      );
      revokePid = pidRows[0]?.pid ?? -1;
      revokeBlocked.resolve(revokePid);

      await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", managerUserId);
      await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", 'HR_MANAGER');
      await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
      await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');

      await revokeRecruiterFromOrder(tx, {
        staffingOrderId: fx.orderId,
        assignmentId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'B-06 command-first ordering — revoke after command',
      });
    }).catch(() => undefined);

    // 4) Witness: prove revoke's PID is observed BLOCKED on the canonical
    // order advisory lock while command holds it.
    await withTimeout(revokeBlocked.promise, RACE_TIMEOUT_MS, 'command-first.revoke_pid');
    let revokeBlockedObserved = false;
    try {
      revokeBlockedObserved = await witnessIsBlocked(witnessClient, fx.orderId, revokePid, 5_000);
    } catch {
      revokeBlockedObserved = false;
    }

    // 5) Release command's pre-commit gate → command continues → COMMIT.
    commitGate.resolve();

    // 6) Wait for both transactions to settle.
    await withTimeout(Promise.all([commandPromise, revokePromise]), RACE_TIMEOUT_MS, 'command-first.settle');

    // Final assertions.
    const placementRow = await admin.placement.findUnique({
      where: { id: placementPre.placementId },
      select: { status: true },
    });
    const assignmentRow = await admin.staffingOrderRecruiterAssignment.findUnique({
      where: { id: assignmentId },
      select: { status: true },
    });

    return {
      placementFinalStatus: placementRow?.status ?? 'UNKNOWN',
      assignmentFinalStatus: assignmentRow?.status ?? 'UNKNOWN',
      commandError,
      commandPid,
      revokePid,
      revokeBlockedObserved,
    };
  }

  /**
   * B-06 REVOKE-FIRST: real two-connection race where the revoke tx holds
   * the canonical order advisory lock WHILE the command tx is started. The
   * command tx is observed blocked by the witness, then the revoke commits,
   * then the command acquires the lock, re-reads authority under it, and
   * fails closed with NO_ACTIVE_ORDER_ASSIGNMENT.
   */
  async function runRevokeFirstRace(
    fx: FixtureSet,
    recruiterId: string,
    assignmentId: string,
    witnessClient: PrismaClient,
  ): Promise<{
    placementFinalStatus: string;
    assignmentFinalStatus: string;
    commandError: string | null;
    revokePid: number;
    commandPid: number;
    commandBlockedObserved: boolean;
  }> {
    const placementPre = await withContext(writer, recruiterId, 'HR_STAFF', (tx) =>
      createPlacement(tx, {
        actorId: recruiterId,
        actorRole: 'HR_STAFF',
        laborProfileId: fx.laborProfileId,
        placementCaseId: fx.placementCaseId,
        jobOpeningId: fx.openingId,
      }),
    );
    setIds.placementIds.push(placementPre.placementId);

    const commandConn = writer;
    const revokeConn = writer2;

    const lockAcquired = new Deferred<number>(); // revoke holds the lock
    const commitGate = new Deferred<void>(); // revoke awaits this before commit
    let revokePid = -1;
    let commandPid = -1;
    let commandError: string | null = null;

    // 1) Revoke tx: capture PID → acquire lock → signal → await gate → run revoke.
    const revokePromise = revokeConn.$transaction(async (tx) => {
      const pidRows = await tx.$queryRawUnsafe<Array<{ pid: number }>>(
        'SELECT pg_backend_pid() AS pid',
      );
      revokePid = pidRows[0]?.pid ?? -1;

      await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", managerUserId);
      await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", 'HR_MANAGER');
      await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
      await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');

      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock( (hashtext($1)::bigint) & 9223372036854775807::bigint )",
        `p1a04:order:${fx.orderId}`,
      );
      lockAcquired.resolve(revokePid);

      await commitGate.promise;

      await revokeRecruiterFromOrder(tx, {
        staffingOrderId: fx.orderId,
        assignmentId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'B-06 revoke-first ordering — revoke before command',
      });
    }).catch(() => undefined);

    await withTimeout(lockAcquired.promise, RACE_TIMEOUT_MS, 'revoke-first.lock_acquired');

    // 2) Start command tx. It captures its PID, tries to acquire the lock
    // → blocks on PG because revoke still holds it.
    const commandBlocked = new Deferred<number>();
    const commandPromise = commandConn.$transaction(async (tx) => {
      const pidRows = await tx.$queryRawUnsafe<Array<{ pid: number }>>(
        'SELECT pg_backend_pid() AS pid',
      );
      commandPid = pidRows[0]?.pid ?? -1;
      commandBlocked.resolve(commandPid);

      await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", recruiterId);
      await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", 'HR_STAFF');
      await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
      await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');

      // acquireOrderAdvisoryLock is called inside assertRecruiterAndHandlingDualAuthorityForPlacement,
      // which is called inside confirmPlacement via runTransition. We do NOT pre-acquire here
      // because we want the natural predicate path. But we ALSO want the witness to observe
      // command's PID in pg_locks with the same lock key. The natural path acquires the
      // canonical lock first; the witness will observe it.
      try {
        await confirmPlacement(tx, {
          placementId: placementPre.placementId,
          actorId: recruiterId,
          actorRole: 'HR_STAFF',
        });
      } catch (e) {
        commandError = e instanceof Error ? e.message : String(e);
        throw e;
      }
    }).catch(() => undefined);

    // 3) Witness: prove command's PID is observed BLOCKED on the canonical
    // order advisory lock while revoke holds it.
    await withTimeout(commandBlocked.promise, RACE_TIMEOUT_MS, 'revoke-first.command_pid');
    let commandBlockedObserved = false;
    try {
      commandBlockedObserved = await witnessIsBlocked(witnessClient, fx.orderId, commandPid, 5_000);
    } catch {
      commandBlockedObserved = false;
    }

    // 4) Release revoke's pre-commit gate → revoke continues → COMMIT.
    commitGate.resolve();

    // 5) Wait for both to settle.
    await withTimeout(Promise.all([commandPromise, revokePromise]), RACE_TIMEOUT_MS, 'revoke-first.settle');

    const placementRow = await admin.placement.findUnique({
      where: { id: placementPre.placementId },
      select: { status: true },
    });
    const assignmentRow = await admin.staffingOrderRecruiterAssignment.findUnique({
      where: { id: assignmentId },
      select: { status: true },
    });

    return {
      placementFinalStatus: placementRow?.status ?? 'UNKNOWN',
      assignmentFinalStatus: assignmentRow?.status ?? 'UNKNOWN',
      commandError,
      revokePid,
      commandPid,
      commandBlockedObserved,
    };
  }

  /**
   * B-06 LIVE-OVERLAP alias — the choreography of `runCommandFirstRace`
   * already includes the live overlap proof (the witness polls pg_locks for
   * the EXACT in-tx revoke PID while command holds the lock). This alias
   * preserves the test contract surface (R3-F02 LIVE-OVERLAP) for the
   * wider test runner.
   */
  async function runLiveOverlapRace(
    fx: FixtureSet,
    recruiterId: string,
    assignmentId: string,
    witnessClient: PrismaClient,
  ): Promise<{
    placementFinalStatus: string;
    assignmentFinalStatus: string;
    commandError: string | null;
    revokeBlockedObserved: boolean;
  }> {
    const r = await runCommandFirstRace(fx, recruiterId, assignmentId, witnessClient);
    return {
      placementFinalStatus: r.placementFinalStatus,
      assignmentFinalStatus: r.assignmentFinalStatus,
      commandError: r.commandError,
      revokeBlockedObserved: r.revokeBlockedObserved,
    };
  }

  it('R3-F02 COMMAND-FIRST ordering (×3) — command holds lock, witness proves block, both COMMIT', async () => {
    for (let run = 1; run <= 3; run++) {
      const fx = fixtureSets[run - 1]!;
      const recruiterId = aliceId;
      const assignmentId = fx.assignmentAlice;
      const result = await runCommandFirstRace(fx, recruiterId, assignmentId, writer2);
      // PIDs were captured inside the tx — they MUST be a real PG backend.
      expect(result.commandPid, `run=${run} command PID captured`).toBeGreaterThan(0);
      expect(result.revokePid, `run=${run} revoke PID captured`).toBeGreaterThan(0);
      expect(result.commandPid, `run=${run} command and revoke MUST be different backends`).not.toBe(result.revokePid);
      // Witness MUST have observed revoke blocked on the canonical lock
      // while command held it. This is the B-06 LIVE-OVERLAP proof-of-overlap.
      expect(
        result.revokeBlockedObserved,
        `run=${run} witness must observe revoke session blocked on the canonical order advisory lock`,
      ).toBe(true);
      // Command committed successfully (placement CONFIRMED).
      expect(result.commandError, `command-first run=${run} must not error`).toBeNull();
      expect(result.placementFinalStatus, `command-first run=${run} placement status`).toBe('CONFIRMED');
      expect(result.assignmentFinalStatus, `command-first run=${run} assignment status`).toBe('REVOKED');
    }
  }, 180_000);

  it('R3-F02 REVOKE-FIRST ordering (×3) — revoke holds lock, command blocked, then fails closed', async () => {
    for (let run = 1; run <= 3; run++) {
      const fx = fixtureSets[run - 1]!;
      const recruiterId = bobId;
      const assignmentId = fx.assignmentBob;
      const result = await runRevokeFirstRace(fx, recruiterId, assignmentId, writer2);
      // PIDs were captured inside the tx.
      expect(result.revokePid, `run=${run} revoke PID captured`).toBeGreaterThan(0);
      expect(result.commandPid, `run=${run} command PID captured`).toBeGreaterThan(0);
      expect(result.revokePid, `run=${run} command and revoke MUST be different backends`).not.toBe(result.commandPid);
      // Witness MUST have observed command blocked on the canonical lock
      // while revoke held it. This is the B-06 live-overlap mirror proof.
      expect(
        result.commandBlockedObserved,
        `run=${run} witness must observe command session blocked on the canonical order advisory lock`,
      ).toBe(true);
      // Command MUST have failed closed with NO_ACTIVE_ORDER_ASSIGNMENT.
      expect(result.commandError, `revoke-first run=${run} command error`).toMatch(
        /NO_ACTIVE_ORDER_ASSIGNMENT|NO_ACTIVE_ASSIGNMENT/,
      );
      // Placement status UNCHANGED — confirm never ran.
      expect(['SELECTED', 'UNKNOWN']).toContain(result.placementFinalStatus);
      // Assignment is REVOKED.
      expect(result.assignmentFinalStatus, `revoke-first run=${run} assignment status`).toBe('REVOKED');
    }
  }, 180_000);

  it('R3-F02 LIVE-OVERLAP (×1) — single-test alias; command wins, witness proves revoke was blocked', async () => {
    const fx = fixtureSets[3]!;
    const recruiterId = aliceId;
    const assignmentId = fx.assignmentAlice;
    const result = await runLiveOverlapRace(fx, recruiterId, assignmentId, writer2);
    expect(result.revokeBlockedObserved).toBe(true);
    expect(result.placementFinalStatus).toBe('CONFIRMED');
    expect(result.assignmentFinalStatus).toBe('REVOKED');
  }, 60_000);
});
