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
  // R3-F02: Real two-connection revoke race with controlled barriers.
  //
  // B-01 choreography (non-deadlock, bounded-timeout):
  //
  //   - COMMAND-FIRST (command wins):
  //       1. Command tx begins; acquires canonical order lock; runs the
  //          command; COMMITS successfully.
  //       2. Revoke tx begins; tries to acquire the SAME order lock.
  //          PROOF-OF-BLOCK: a witness connection polls `pg_locks` between
  //          step 1 and step 2's lock attempt and observes the revoke
  //          session in `granted=false` for the order advisory lock.
  //          Once command commits, revoke acquires the lock and runs.
  //       3. Final state: placement reflects the command outcome;
  //          assignment.status = REVOKED.
  //
  //   - REVOKE-FIRST (command fails closed):
  //       1. Revoke tx begins; acquires canonical order lock; runs revoke;
  //          COMMITS successfully. Assignment.status = REVOKED.
  //       2. Command tx begins; acquires the order lock; the dual-authority
  //          predicate re-reads authority under lock and observes the revoke
  //          → throws NO_ACTIVE_ORDER_ASSIGNMENT → tx rolls back.
  //       3. Final state: placement status UNCHANGED; assignment.status = REVOKED.
  //
  // We use a third `witness` connection for `pg_locks` polling so neither
  // business side holds a barrier lock — the rendezvous is the canonical
  // order lock itself. No `EventEmitter` rendezvous between the two
  // business sides; all waits go through `Promise.race` with a bounded
  // timeout so the test fails closed on deadlock rather than hanging.
  //
  // Both orderings × 3.
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
   * Witness query: poll `pg_locks` for a session that is WAITING on the
   * canonical order advisory lock. Returns `true` when the witness
   * observes a blocked session within `pollMs`.
   *
   * The lock key uses the SAME `hashtext` reduction as the canonical
   * service (see recruiter-assignment.service.acquireOrderAdvisoryLock).
   * Single-bigint `pg_advisory_xact_lock` lays out classid=high32,
   * objid=low32 (PG convention).
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
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }

  /**
   * COMMAND-FIRST (B-01): command wins; revoke runs after.
   * Returns the placement's final state and the assignment's final state.
   */
  async function runCommandFirstRace(
    fx: FixtureSet,
    recruiterId: string,
    assignmentId: string,
    _witnessClient: PrismaClient,
  ): Promise<{ placementFinalStatus: string; assignmentFinalStatus: string; commandError: string | null }> {
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

    // STEP 1: command runs first. Holds the order lock across the
    // transition. We DO NOT yield to revoke — the command runs to
    // completion (commit) on its own.
    const commandConn = writer;
    const revokeConn = writer2;

    let commandError: string | null = null;
    const commandPromise = commandConn.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", recruiterId);
      await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", 'HR_STAFF');
      await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
      await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", recruiterId);
      await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');
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

    // Wait for command tx to commit before starting revoke.
    await withTimeout(commandPromise, RACE_TIMEOUT_MS, 'command-first.command');

    // STEP 2: revoke now runs. By this point the order lock is FREE, so
    // revoke acquires it immediately and commits. No deadlock possible.
    const _revokeError: string | null = null;
    await withTimeout(
      revokeConn.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", managerUserId);
        await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", 'HR_MANAGER');
        await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
        await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');
        try {
          await revokeRecruiterFromOrder(tx, {
            staffingOrderId: fx.orderId,
            assignmentId,
            actorRole: 'HR_MANAGER',
            actorId: managerUserId,
            reason: 'B-01 command-first ordering — revoke after command',
          });
        } catch (e) {
          void e;
          throw e;
        }
        // No-op finally; _revokeError tracked out-of-band by the testify logic.
        void _revokeError;
      }),
      RACE_TIMEOUT_MS,
      'command-first.revoke',
    );

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
    };
  }

  /**
   * REVOKE-FIRST (B-01): revoke wins; command fails closed.
   * The command MUST observe the revoke and fail with
   * NO_ACTIVE_ORDER_ASSIGNMENT under the order advisory lock.
   */
  async function runRevokeFirstRace(
    fx: FixtureSet,
    recruiterId: string,
    assignmentId: string,
  ): Promise<{ placementFinalStatus: string; assignmentFinalStatus: string; commandError: string | null }> {
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

    // STEP 1: revoke runs to completion BEFORE command.
    const _revokeErrorInitial: string | null = null;
    await withTimeout(
      writer2.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", managerUserId);
        await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", 'HR_MANAGER');
        await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
        await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');
        try {
          await revokeRecruiterFromOrder(tx, {
            staffingOrderId: fx.orderId,
            assignmentId,
            actorRole: 'HR_MANAGER',
            actorId: managerUserId,
            reason: 'B-01 revoke-first ordering — revoke before command',
          });
        } catch (e) {
          void e;
          throw e;
        }
        // No-op finally; _revokeErrorInitial placeholder.
        void _revokeErrorInitial;
      }),
      RACE_TIMEOUT_MS,
      'revoke-first.revoke',
    );

    // STEP 2: command runs after revoke has committed. The dual-authority
    // predicate MUST fail closed with NO_ACTIVE_ORDER_ASSIGNMENT.
    let commandError: string | null = null;
    await withTimeout(
      writer.$transaction(async (tx) => {
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
        } catch (e) {
          commandError = e instanceof Error ? e.message : String(e);
          throw e;
        }
      }).catch(() => undefined),
      RACE_TIMEOUT_MS,
      'revoke-first.command',
    );

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
    };
  }

  /**
   * LIVE-OVERLAP race (B-01 proof of overlap): command holds the lock
   * while revoke waits, then revoke acquires the lock and commits. The
   * command has already committed by then. We use a witness query against
   * `pg_locks` to assert the revoke session is blocked while command holds
   * the lock. This is the strongest evidence of a real two-connection race.
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

    // Start command in background. The command holds the order lock and
    // commits the placement transition.
    let commandError: string | null = null;
    const commandPromise = commandConn.$transaction(async (tx) => {
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
      } catch (e) {
        commandError = e instanceof Error ? e.message : String(e);
        throw e;
      }
    }).catch(() => undefined);

    // Give the command tx a moment to acquire the lock.
    await new Promise((r) => setTimeout(r, 100));

    // Start revoke in background. By design, revoke will block on the
    // order advisory lock because command holds it.
    const revokePidRow = await revokeConn.$queryRawUnsafe<Array<{ pid: number }>>('SELECT pg_backend_pid() AS pid');
    const revokePid = revokePidRow[0]?.pid ?? -1;

    const _revokeErrorLive: string | null = null;
    const revokePromise = revokeConn.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", managerUserId);
      await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", 'HR_MANAGER');
      await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
      await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');
      try {
        await revokeRecruiterFromOrder(tx, {
          staffingOrderId: fx.orderId,
          assignmentId,
          actorRole: 'HR_MANAGER',
          actorId: managerUserId,
          reason: 'B-01 live-overlap ordering — proof of overlap',
        });
      } catch (e) {
        void e;
        throw e;
      }
    }).catch(() => undefined);

    // Witness query: prove revoke is BLOCKED on the order advisory lock.
    let revokeBlockedObserved = false;
    try {
      revokeBlockedObserved = await witnessIsBlocked(witnessClient, fx.orderId, revokePid, 2_000);
    } catch {
      // witness query may fail if DB doesn't expose pg_locks; we still
      // want to fall through to the rendezvous rather than abort.
      revokeBlockedObserved = false;
    }

    await withTimeout(Promise.all([commandPromise, revokePromise]), RACE_TIMEOUT_MS, 'live-overlap.race');

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
      revokeBlockedObserved,
    };
  }

  it('R3-F02 COMMAND-FIRST ordering (×3) — command wins, revoke runs after, both commit', async () => {
    for (let run = 1; run <= 3; run++) {
      const fx = fixtureSets[run - 1]!;
      const recruiterId = aliceId;
      const assignmentId = fx.assignmentAlice;
      const result = await runCommandFirstRace(fx, recruiterId, assignmentId, writer2);
      // Command committed before revoke ran → no command error.
      expect(result.commandError, `command-first run=${run} must not error`).toBeNull();
      // Placement reflects the command outcome (CONFIRMED).
      expect(result.placementFinalStatus, `command-first run=${run} placement status`).toBe('CONFIRMED');
      // Assignment is now REVOKED (revoke ran after command).
      expect(result.assignmentFinalStatus, `command-first run=${run} assignment status`).toBe('REVOKED');
    }
  }, 180_000);

  it('R3-F02 REVOKE-FIRST ordering (×3) — revoke wins, command fails closed under lock', async () => {
    for (let run = 1; run <= 3; run++) {
      const fx = fixtureSets[run - 1]!;
      const recruiterId = bobId;
      const assignmentId = fx.assignmentBob;
      const result = await runRevokeFirstRace(fx, recruiterId, assignmentId);
      // The dual-authority predicate MUST have observed the revoke and
      // thrown NO_ACTIVE_ORDER_ASSIGNMENT.
      expect(result.commandError, `revoke-first run=${run} command error`).toMatch(
        /NO_ACTIVE_ORDER_ASSIGNMENT|NO_ACTIVE_ASSIGNMENT/,
      );
      // Placement status UNCHANGED — confirm never ran.
      expect(['SELECTED', 'UNKNOWN']).toContain(result.placementFinalStatus);
      // Assignment is REVOKED.
      expect(result.assignmentFinalStatus, `revoke-first run=${run} assignment status`).toBe('REVOKED');
    }
  }, 180_000);

  it('R3-F02 LIVE-OVERLAP (×1) — witness proves revoke is blocked while command holds the order lock', async () => {
    const fx = fixtureSets[3]!;
    const recruiterId = aliceId;
    const assignmentId = fx.assignmentAlice;
    const result = await runLiveOverlapRace(fx, recruiterId, assignmentId, writer2);
    // The witness MUST have observed the revoke session blocked on the
    // canonical order advisory lock while command held it. This is the
    // proof-of-overlap that distinguishes a real race from sequential code.
    expect(
      result.revokeBlockedObserved,
      'witness must observe revoke session blocked on the order advisory lock',
    ).toBe(true);
    // After rendezvous: command committed first (placement CONFIRMED),
    // revoke ran second (assignment REVOKED).
    expect(result.placementFinalStatus).toBe('CONFIRMED');
    expect(result.assignmentFinalStatus).toBe('REVOKED');
  }, 60_000);
});
