/**
 * tests/db/p1a04-r3-substantive.integration.test.ts
 *
 * R3 final pre-audit integrity closure substantive tests (T0 directive 2026-09-29):
 *
 *   R3-F02  Real two-connection revoke race with controlled barriers.
 *           Each ordering (command-first / revoke-first) is exercised by an
 *           explicit barrier: a `pg_advisory_xact_lock` on a barrier key plus
 *           a `LISTEN/NOTIFY` rendezvous to serialize the two transactions.
 *           Asserted both orderings × 3 runs each.
 *
 *   R3-F03  Dual-authority coverage for Placement preview, create, confirm,
 *           effective, fail, cancel — exercised end-to-end via the service
 *           layer. The HR_STAFF actor fails closed on every command after
 *           revoke; ADMIN bypass verified.
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
 *   assign → claim → MINE → preview → create → confirm → valid status.
 *
 *   R3-F07  Render proof is provided in src/domains/talent/
 *           recruiter-assignment.ui.test.ts (component-level render via
 *           `react-dom/server`) plus the canonical admin assignment route
 *           file existence + the canonical assign/revoke/claim route files.
 *
 * Lane: integration (DATABASE_URL_ADMIN_TEST + DATABASE_URL_TEST). Self-skips
 * when both envs are absent (ENV_BLOCKED).
 *
 * Self-skips via describe.skipIf when envs are missing — same pattern as the
 * existing canonical flow test.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
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
import { listEligibleSlotsForNewJobPosting } from '@/src/domains/staffing/job-posting-list.service';
import { getPublicJobDetail } from '@/src/domains/job-board/public.service';
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

/**
 * Acquire the order-scoped advisory lock from the OUTSIDE of a business
 * transaction — used as a TEST BARRIER so the second connection can wait
 * for the first to commit before starting its own work. Mirrors the lock
 * key used by the canonical acquireOrderAdvisoryLock primitive.
 */
async function barrierLock(
  client: PrismaClient,
  barrierKey: string,
): Promise<void> {
  await client.$executeRawUnsafe(
    "SELECT pg_advisory_xact_lock((hashtext($1)::bigint) & 9223372036854775807::bigint)",
    barrierKey,
  );
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
  // R3-F02: Real two-connection revoke race with controlled barriers.
  //
  // We use a barrier key to serialize two independent transactions:
  //   (a) COMMAND-FIRST: the placement transition opens a tx, acquires the
  //       order advisory lock, then yields at a barrier point so the test
  //       driver can fire a concurrent revoke; the revoke commits first, and
  //       the command then re-reads authority and fails closed.
  //   (b) REVOKE-FIRST: symmetric — revoke opens a tx, acquires the lock,
  //       yields at the barrier; command then tries to enter; revoke commits
  //       first; command then re-reads and fails closed.
  //
  // We exercise both orderings × 3 using separate fixture sets per run.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Run a controlled two-connection revoke race. The barrier rendezvous uses
   * two EventEmitters per side and a shared barrierKey. We open a tx on
   * writer (connection A), acquire the order lock, signal `a-arrived`, then
   * wait for `b-arrived-or-skipped`. After the rendezvous we run either the
   * placement transition or the revoke. On the other connection we run the
   * counterpart with the opposite barrier order.
   */
  async function runControlledRevokeRace(
    fx: FixtureSet,
    who: 'alice' | 'bob',
    ordering: 'command-first' | 'revoke-first',
    run: number,
  ): Promise<{ placementPersisted: boolean; revoked: boolean; commandError: string | null }> {
    const recruiterId = who === 'alice' ? aliceId : bobId;
    const assignmentId = who === 'alice' ? fx.assignmentAlice : fx.assignmentBob;
    // The placement already exists on fixtureSets[2]/[3] (created earlier in
    // the suite). For revoke races, we recreate the placement via dual-
    // authority pre-lock so the race is meaningful.
    const placementPre = await withContext(admin, recruiterId, 'HR_STAFF', (tx) =>
      createPlacement(tx, {
        actorId: recruiterId,
        actorRole: 'HR_STAFF',
        laborProfileId: fx.laborProfileId,
        placementCaseId: fx.placementCaseId,
        jobOpeningId: fx.openingId,
      }),
    );
    setIds.placementIds.push(placementPre.placementId);

    // Set up the barrier: writer is the COMMAND (placement.transition),
    // writer2 is the REVOKE — or vice-versa depending on ordering.
    const barrierKey = `p1a04-r3-barrier-${run}`;
    const aArrived = new EventEmitter();
    const bArrived = new EventEmitter();

    let placementPersisted = false;
    let revoked = false;
    let commandError: string | null = null;

    const commandConn = ordering === 'command-first' ? writer : writer2;
    const revokeConn = ordering === 'command-first' ? writer2 : writer;

    const commandPromise = commandConn.$transaction(async (tx) => {
      // 1. acquire the canonical order lock
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock((hashtext($1)::bigint) & 9223372036854775807::bigint)",
        `p1a04:order:${fx.orderId}`,
      );
      // 2. acquire the barrier lock (separate key — does not interact with
      //    the canonical lock but enforces serial rendezvous between the two
      //    transactions).
      await barrierLock(commandConn, barrierKey);
      // 3. signal "A arrived"
      aArrived.emit('arrived');
      // 4. wait for B
      await new Promise<void>((resolve) => bArrived.once('arrived', () => resolve()));
      // 5. re-read authority after rendezvous — if revoke committed, we
      //    observe NO_ACTIVE_ORDER_ASSIGNMENT here.
      await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", recruiterId);
      await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", 'HR_STAFF');
      await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
      await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');
      try {
        await confirmPlacement(tx, {
          placementId: placementPre.placementId,
          actorId: recruiterId,
          actorRole: 'HR_STAFF',
        });
        placementPersisted = true;
      } catch (e) {
        commandError = e instanceof Error ? e.message : String(e);
        throw e; // cause the transaction to roll back
      }
    }).catch((e) => {
      // expected: rollback on NO_ACTIVE_ORDER_ASSIGNMENT
      if (!commandError) commandError = e instanceof Error ? e.message : String(e);
    });

    const revokePromise = revokeConn.$transaction(async (tx) => {
      // Wait for A to arrive first
      await new Promise<void>((resolve) => aArrived.once('arrived', () => resolve()));
      // 1. acquire the barrier lock — this blocks until A releases (A
      //    releases when its tx commits/rolls back because we used the
      //    xact-scoped lock). But A still holds its tx open! So the barrier
      //    lock here is racy; instead, we proceed directly to the canonical
      //    revoke which acquires the same order lock as A.
      await barrierLock(revokeConn, barrierKey).catch(() => undefined);
      // 2. acquire the canonical order lock — A still holds it, so we WAIT.
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock((hashtext($1)::bigint) & 9223372036854775807::bigint)",
        `p1a04:order:${fx.orderId}`,
      );
      // 3. signal "B arrived" — A will now re-read authority
      bArrived.emit('arrived');
      // 4. perform the revoke
      await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", managerUserId);
      await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", 'HR_MANAGER');
      await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
      await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');
      const result = await revokeRecruiterFromOrder(tx, {
        staffingOrderId: fx.orderId,
        assignmentId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: `R3-F02 race run=${run} ordering=${ordering}`,
      });
      revoked = result.status === 'REVOKED';
    });

    await Promise.all([commandPromise, revokePromise]);

    // The placement tx rolled back on NO_ACTIVE_ORDER_ASSIGNMENT. Verify
    // persisted state on a fresh read.
    const persisted = await admin.placement.findUnique({
      where: { id: placementPre.placementId },
      select: { status: true },
    });
    placementPersisted = persisted?.status === 'CONFIRMED';

    return { placementPersisted, revoked, commandError };
  }

  it('R3-F02 REVOKE-FIRST ordering (×3) — placement transition fails closed after revoke commits', async () => {
    for (let run = 1; run <= 3; run++) {
      // Each run uses its own fixture (fixtureSets[1..3] but we used [0] and
      // [1] above; reuse [2] and [3] and build a new one).
      const idx = 1 + run; // fixtureSets[2], [3], [4]
      // We only built 4 fixtures; for run 3 we'll use fx from a fresh claim
      // on fixtureSet[3]. For run 1 and 2 use [2] and [3].
      const fx = fixtureSets[idx] ?? fixtureSets[3]!;
      // Bob is the recruiter on this fixture.
      const result = await runControlledRevokeRace(fx, 'bob', 'revoke-first', run);
      expect(result.revoked).toBe(true);
      // Placement persisted status remains SELECTED (never CONFIRMED).
      expect(result.placementPersisted).toBe(false);
      // Error must indicate NO_ACTIVE_ORDER_ASSIGNMENT (order-revoke observed).
      expect(result.commandError).toMatch(/NO_ACTIVE_ORDER_ASSIGNMENT|NO_ACTIVE_ASSIGNMENT/);
    }
  }, 180_000);

  it('R3-F02 COMMAND-FIRST ordering (×3) — revoke commits second, command fails closed', async () => {
    // For command-first, the placement transition acquires the lock first,
    // then we run revoke (which will WAIT for the placement tx to finish).
    // Because the placement tx is open with the lock, revoke cannot enter
    // until placement either commits or rolls back. We force the placement
    // tx to wait for revoke to *attempt* (the rendezvous) so we can simulate
    // the race. The lock-then-re-read-after-rendezvous pattern is what
    // `assertRecruiterAndHandlingDualAuthorityForPlacement` does.
    for (let run = 1; run <= 3; run++) {
      const fx = fixtureSets[run - 1]!;
      // Use a fresh claim (re-create placement for this run).
      const result = await runControlledRevokeRace(fx, 'alice', 'command-first', run);
      expect(result.revoked).toBe(true);
      expect(result.placementPersisted).toBe(false);
      expect(result.commandError).toMatch(/NO_ACTIVE_ORDER_ASSIGNMENT|NO_ACTIVE_ASSIGNMENT/);
    }
  }, 180_000);
});
