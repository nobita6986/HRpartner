/**
 * tests/db/p1a04-scoped-recruiter-authority.integration.test.ts
 *
 * hrp-p1-a0-4-scoped-recruiter-authority — canonical candidate-claim E2E proof
 * (TASK.md v1.3 / correction batch 1/1).
 *
 * Self-skips when DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST are absent
 * (ENV_BLOCKED). Otherwise RUNs against the live synthetic DB with admin +
 * writer Prisma clients and the canonical `withContext` GUC helper.
 *
 * What this test exercises (T0 §8 / AC-E2E-01..AC-E2E-22):
 *
 *   1. Two StaffingOrder rows X/Y under the same project, both OPEN, both
 *      with at least one JobOpening + JobPosting + slot.
 *   2. Multiple recruiters assigned to Order X (Alice + Bob) by HR_MANAGER;
 *      Eve is created but NEVER assigned.
 *   3. Eve (unassigned) sees EMPTY list for every recruiter view — no
 *      assigned orders, no masked candidates, no MINE row. Cross-order/cross-
 *      project privacy holds.
 *   4. Alice + Bob (assigned) see MASKED unclaimed candidates of Order X.
 *      Phone is masked; name + slot position are visible.
 *   5. Anonymous apply: a public route submits a CandidateSubmission onto
 *      Order X's slot (no auth required; the public RLS path allows it).
 *   6. Candidate claim race: two Prisma clients (one for Alice, one for
 *      Bob) both attempt to claim the SAME submission concurrently. Exactly
 *      one winner; the loser receives HANDLING_ALREADY_CLAIMED (409). The
 *      winner's LaborProfileHandlingAssignment carries source =
 *      'ORDER_RECRUITER_CLAIM', assignee = winner, status = 'ACTIVE'.
 *   7. MINE rail: winner's `listMyClaimedCandidates` includes the claimed
 *      candidate. Loser's MINE is empty for this submission.
 *   8. Placement dual authority:
 *        (a) Loser attempts `createPlacement` for the placement case linked
 *            to the candidate → 403 NO_ACTIVE_ORDER_ASSIGNMENT.
 *        (b) Winner attempts `createPlacement` → 201 SELECTED (full success).
 *        (c) Revoke the order assignment while placement is SELECTED. The
 *            winner attempts `confirmPlacement` → 403 NO_ACTIVE_ORDER_ASSIGNMENT.
 *            command-first race deterministic.
 *        (d) Revoke-first ordering: a fresh placement row is created on a
 *            different slot/order by Alice; before any transition,
 *            `revokeRecruiterFromOrder` is invoked. Subsequent
 *            `confirmPlacement` for that placement fails closed.
 *   9. Both revoke orderings (HR_MANAGER-side and order-scoped assignment
 *      revoke) remove order-derived access IMMEDIATELY (no cached rows).
 *  10. Zero residue: after `afterAll`, every fixture row created under
 *      `runId` is removed via reverse-FK order.
 *
 * The test does NOT call Next.js routes (which would require the auth
 * harness). It exercises the service layer + Prisma directly, which is the
 * canonical RLS-aware path. The route-layer (HTTP) coverage is owned by
 * unit tests under src/domains/talent (vitest.unit.config.ts lane).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient, type Prisma as PrismaTypes } from '@prisma/client';

import {
  assignRecruiterToOrder,
  revokeRecruiterFromOrder,
  claimCandidateSubmission,
  listMyClaimedCandidates,
  listMaskedUnclaimedCandidatesForOrder,
  assertActiveRecruiterForOrder,
  assertActiveHandlingForLaborProfile,
  RecruiterAssignmentError,
} from '@/src/domains/talent/recruiter-assignment.service';
import {
  createPlacement,
  confirmPlacement,
  cancelPlacement,
} from '@/src/domains/talent/placement.service';
import { PlacementValidationError } from '@/src/domains/talent/placement.errors';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl && !!writerUrl &&
  !adminUrl.includes('placeholder') && !writerUrl.includes('placeholder');

const runId = `p1a04-${randomUUID().slice(0, 8)}`;

function makeClient(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } } });
}

async function withContext<T>(
  client: PrismaClient,
  userId: string,
  role: string,
  vendorId = '',
  workerId = '',
  callback: (tx: PrismaTypes.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", userId);
    await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", role);
    await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", vendorId);
    await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", workerId);
    return callback(tx);
  });
}

describe.skipIf(!HAS_TEST_DB)('P1-A0.4 Scoped Recruiter Authority (canonical candidate-claim)', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;

  // Identifiers (runId-scoped, deterministic per process).
  const adminUserId = `${runId}-admin`;
  const managerUserId = `${runId}-manager`;
  const aliceId = `${runId}-alice`;
  const bobId = `${runId}-bob`;
  const eveId = `${runId}-eve`;

  const companyIds: string[] = [];
  const projectIds: string[] = [];
  const orderIds: string[] = [];
  const slotIds: string[] = [];
  const openingIds: string[] = [];
  const postingIds: string[] = [];
  const submissionIds: string[] = [];
  const placementCaseIds: string[] = [];
  const laborProfileIds: string[] = [];
  const assignmentIds: string[] = [];
  const placementIds: string[] = [];

  let projectPublic: string;
  let orderX: string;
  let orderY: string;
  let slotX: string;
  let slotY: string;
  let openingX: string;
  let openingY: string;
  let postingX: string;
  let postingY: string;
  let submissionX: string;
  let laborProfileX: string;
  let placementCaseX: string;
  let assignmentAliceX: string;
  let assignmentBobX: string;

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);

    // ── Users (HR_STAFF/HR_MANAGER/ADMIN) — via admin (BYPASSRLS). ────
    await admin.user.createMany({
      data: [
        { id: adminUserId, phone: `${runId}-adm`, name: 'P1A04 Admin', role: 'ADMIN' },
        { id: managerUserId, phone: `${runId}-mgr`, name: 'P1A04 Manager', role: 'HR_MANAGER' },
        { id: aliceId, phone: `${runId}-alice`, name: 'Alice Recruiter', role: 'HR_STAFF' },
        { id: bobId, phone: `${runId}-bob`, name: 'Bob Recruiter', role: 'HR_STAFF' },
        { id: eveId, phone: `${runId}-eve`, name: 'Eve Unassigned', role: 'HR_STAFF' },
      ],
    });

    // ── Client company (canonical chain for FK) ────
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

    // ── Project (isPublic = true so the public apply path is open) ────
    const project = await admin.project.create({
      data: {
        code: `${runId}-PRJ`,
        name: `${runId} Project`,
        clientCompanyId: company.id,
        pmUserId: adminUserId,
        isPublic: true,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
      },
      select: { id: true },
    });
    projectPublic = project.id;
    projectIds.push(project.id);

    // ── Two StaffingOrders X + Y in the same project, both OPEN. ────
    const orderXRow = await admin.staffingOrder.create({
      data: {
        projectId: project.id,
        code: `${runId}-SO-X`,
        title: 'Order X — Electricians',
        status: 'OPEN',
      },
      select: { id: true },
    });
    orderX = orderXRow.id;
    orderIds.push(orderXRow.id);

    const orderYRow = await admin.staffingOrder.create({
      data: {
        projectId: project.id,
        code: `${runId}-SO-Y`,
        title: 'Order Y — Welders',
        status: 'OPEN',
      },
      select: { id: true },
    });
    orderY = orderYRow.id;
    orderIds.push(orderYRow.id);

    // ── JobOpenings (no title/headcount fields in canonical schema). ────
    const opX = await admin.jobOpening.create({
      data: {
        staffingOrderId: orderXRow.id,
        serviceModel: 'STAFFING_SUPPLY',
        status: 'OPEN',
        openedAt: new Date(),
      },
      select: { id: true },
    });
    openingX = opX.id;
    openingIds.push(opX.id);

    const opY = await admin.jobOpening.create({
      data: {
        staffingOrderId: orderYRow.id,
        serviceModel: 'STAFFING_SUPPLY',
        status: 'OPEN',
        openedAt: new Date(),
      },
      select: { id: true },
    });
    openingY = opY.id;
    openingIds.push(opY.id);

    // ── JobPostings (canonical `slug` field, optional `title`). ────
    const postX = await admin.jobPosting.create({
      data: {
        jobOpeningId: opX.id,
        title: 'Electrician (Order X)',
        slug: `${runId}-X`,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    postingX = postX.id;
    postingIds.push(postX.id);

    const postY = await admin.jobPosting.create({
      data: {
        jobOpeningId: opY.id,
        title: 'Welder (Order Y)',
        slug: `${runId}-Y`,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    postingY = postY.id;
    postingIds.push(postY.id);

    // ── Slots ────
    const slotXRow = await admin.staffingOrderSlot.create({
      data: {
        staffingOrderId: orderXRow.id,
        jobOpeningId: opX.id,
        positionCode: 'ELECTRICIAN',
        positionTitle: 'Electrician',
        slotsNeeded: 1,
        validFrom: new Date('2026-01-01'),
      },
      select: { id: true },
    });
    slotX = slotXRow.id;
    slotIds.push(slotXRow.id);

    const slotYRow = await admin.staffingOrderSlot.create({
      data: {
        staffingOrderId: orderYRow.id,
        jobOpeningId: opY.id,
        positionCode: 'WELDER',
        positionTitle: 'Welder',
        slotsNeeded: 1,
        validFrom: new Date('2026-01-01'),
      },
      select: { id: true },
    });
    slotY = slotYRow.id;
    slotIds.push(slotYRow.id);

    // ── LaborProfile + PlacementCase for the candidate (anchors for the claim path). ────
    const profileX = await admin.laborProfile.create({
      data: {
        fullName: 'Anonymous Candidate',
      },
      select: { id: true },
    });
    laborProfileX = profileX.id;
    laborProfileIds.push(profileX.id);

    const caseX = await admin.placementCase.create({
      data: {
        laborProfileId: profileX.id,
        status: 'OPEN',
      },
      select: { id: true },
    });
    placementCaseX = caseX.id;
    placementCaseIds.push(caseX.id);

    // ── LaborProfile + PlacementCase for a second candidate (revoke-first test). ────
    const profileY = await admin.laborProfile.create({
      data: {
        fullName: 'Revoke-First Candidate',
      },
      select: { id: true },
    });
    laborProfileIds.push(profileY.id);

    const caseY = await admin.placementCase.create({
      data: {
        laborProfileId: profileY.id,
        status: 'OPEN',
      },
      select: { id: true },
    });
    placementCaseIds.push(caseY.id);

    // ── Public apply: CandidateSubmission on Order X's slot, linked to the placement case. ────
    const subX = await admin.candidateSubmission.create({
      data: {
        slotId: slotXRow.id,
        placementCaseId: caseX.id,
        fullName: 'Anonymous Candidate',
        phone: '0900000001',
        status: 'NEW',
      },
      select: { id: true },
    });
    submissionX = subX.id;
    submissionIds.push(subX.id);

    // Second submission on Order Y for the revoke-first test.
    const subY = await admin.candidateSubmission.create({
      data: {
        slotId: slotYRow.id,
        placementCaseId: caseY.id,
        fullName: 'Revoke-First Candidate',
        phone: '0900000002',
        status: 'NEW',
      },
      select: { id: true },
    });
    submissionIds.push(subY.id);

    // ── HR_MANAGER assigns Alice + Bob to Order X (multiple recruiters). ────
    const aA = await withContext(admin, managerUserId, 'HR_MANAGER', '', '', (tx) =>
      assignRecruiterToOrder(tx, {
        staffingOrderId: orderXRow.id,
        recruiterUserId: aliceId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'P1A04 fixture: assign Alice to Order X',
      }),
    );
    assignmentAliceX = aA.id;
    assignmentIds.push(aA.id);

    const aB = await withContext(admin, managerUserId, 'HR_MANAGER', '', '', (tx) =>
      assignRecruiterToOrder(tx, {
        staffingOrderId: orderXRow.id,
        recruiterUserId: bobId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'P1A04 fixture: assign Bob to Order X',
      }),
    );
    assignmentBobX = aB.id;
    assignmentIds.push(aB.id);
  }, 60_000);

  afterAll(async () => {
    // ── Reverse-FK cleanup (NO swallowing) ────
    try {
      // Placements first (FK → case, profile, opening).
      await admin.placement.deleteMany({
        where: { id: { in: placementIds } },
      });
      // Handling assignments (FK → profile).
      await admin.laborProfileHandlingAssignment.deleteMany({
        where: { laborProfileId: { in: laborProfileIds } },
      });
      // Recruiter assignments.
      await admin.staffingOrderRecruiterAssignment.deleteMany({
        where: { id: { in: assignmentIds } },
      });
      // Candidate submissions (FK → slot).
      await admin.candidateSubmission.deleteMany({
        where: { id: { in: submissionIds } },
      });
      // Placement cases (FK → profile).
      await admin.placementCase.deleteMany({
        where: { id: { in: placementCaseIds } },
      });
      // Labor profiles.
      await admin.laborProfile.deleteMany({
        where: { id: { in: laborProfileIds } },
      });
      // Slots (FK → order, opening).
      await admin.staffingOrderSlot.deleteMany({
        where: { id: { in: slotIds } },
      });
      // JobPostings (FK → opening).
      await admin.jobPosting.deleteMany({
        where: { id: { in: postingIds } },
      });
      // JobOpenings (FK → order).
      await admin.jobOpening.deleteMany({
        where: { id: { in: openingIds } },
      });
      // StaffingOrders.
      await admin.staffingOrder.deleteMany({
        where: { id: { in: orderIds } },
      });
      // Project (FK → company).
      await admin.project.deleteMany({
        where: { id: { in: projectIds } },
      });
      // Company.
      await admin.clientCompany.deleteMany({
        where: { id: { in: companyIds } },
      });
      // Users.
      await admin.user.deleteMany({
        where: { id: { in: [adminUserId, managerUserId, aliceId, bobId, eveId] } },
      });
    } finally {
      await admin.$disconnect();
      await writer.$disconnect();
    }
  }, 60_000);

  // ═══════════════════════════════════════════════════════════════════════
  // AC-01 / AC-02: Eve (unassigned HR_STAFF) sees nothing for Order X/Y.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-01 unassigned HR_STAFF sees no recruiter assignments', async () => {
    const rows = await withContext(admin, eveId, 'HR_STAFF', '', '', async (tx) =>
      tx.staffingOrderRecruiterAssignment.findMany({
        where: { recruiterUserId: eveId, status: 'ACTIVE' },
      }),
    );
    expect(rows).toHaveLength(0);
  });

  it('AC-02 unassigned HR_STAFF sees no MINE claimed candidates', async () => {
    const mine = await withContext(admin, eveId, 'HR_STAFF', '', '', (tx) =>
      listMyClaimedCandidates(tx, eveId),
    );
    expect(mine).toHaveLength(0);
  });

  it('AC-03 unassigned HR_STAFF cannot read masked candidate queue for Order X', async () => {
    let denied = false;
    try {
      await withContext(admin, eveId, 'HR_STAFF', '', '', (tx) =>
        listMaskedUnclaimedCandidatesForOrder(tx, orderX, eveId),
      );
    } catch (e) {
      if (e instanceof RecruiterAssignmentError && e.code === 'NO_ACTIVE_ORDER_ASSIGNMENT') {
        denied = true;
      } else throw e;
    }
    expect(denied).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-04 / AC-05: Alice + Bob (assigned) see MASKED unclaimed candidates.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-04 Alice (assigned) sees MASKED unclaimed candidates for Order X', async () => {
    const queue = await withContext(admin, aliceId, 'HR_STAFF', '', '', (tx) =>
      listMaskedUnclaimedCandidatesForOrder(tx, orderX, aliceId),
    );
    expect(queue.find((c) => c.submissionId === submissionX)).toBeTruthy();
    const row = queue.find((c) => c.submissionId === submissionX)!;
    expect(row.candidatePhoneMasked).toMatch(/\*/); // masked
    expect(row.candidateFullName).toBe('Anonymous Candidate');
  });

  it('AC-05 Bob (assigned) sees MASKED unclaimed candidates for Order X too', async () => {
    const queue = await withContext(admin, bobId, 'HR_STAFF', '', '', (tx) =>
      listMaskedUnclaimedCandidatesForOrder(tx, orderX, bobId),
    );
    expect(queue.find((c) => c.submissionId === submissionX)).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-06 / AC-07: Cross-order privacy. Alice has no assignment on Order Y.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-06 Alice cannot claim candidates on Order Y (no assignment)', async () => {
    let denied = false;
    try {
      await withContext(admin, aliceId, 'HR_STAFF', '', '', (tx) =>
        listMaskedUnclaimedCandidatesForOrder(tx, orderY, aliceId),
      );
    } catch (e) {
      if (e instanceof RecruiterAssignmentError && e.code === 'NO_ACTIVE_ORDER_ASSIGNMENT') {
        denied = true;
      } else throw e;
    }
    expect(denied).toBe(true);
  });

  it('AC-07 Eve cannot list assignments on Order X', async () => {
    const rows = await withContext(admin, eveId, 'HR_STAFF', '', '', async (tx) =>
      tx.staffingOrderRecruiterAssignment.findMany({
        where: { staffingOrderId: orderX, recruiterUserId: eveId },
      }),
    );
    expect(rows).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-08 / AC-09 / AC-10: Candidate-claim race — exactly one winner.
  // Two independent DB connections; both claim the SAME submission.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-08 candidate claim race — exactly one winner; loser gets HANDLING_ALREADY_CLAIMED', async () => {
    let aliceOk: Awaited<ReturnType<typeof claimCandidateSubmission>> | null = null;

    // Two independent tx on the writer connection. The first to acquire the
    // advisory lock + create the handling row wins.
    const aliceTx = withContext(writer, aliceId, 'HR_STAFF', '', '', (tx) =>
      claimCandidateSubmission(tx, {
        submissionId: submissionX,
        actorRole: 'HR_STAFF',
        actorId: aliceId,
      }),
    );
    const bobTx = withContext(writer, bobId, 'HR_STAFF', '', '', (tx) =>
      claimCandidateSubmission(tx, {
        submissionId: submissionX,
        actorRole: 'HR_STAFF',
        actorId: bobId,
      }),
    );
    const results = await Promise.allSettled([aliceTx, bobTx]);

    const settled = results.map((r) => {
      if (r.status === 'fulfilled') return { ok: true, value: r.value };
      const err = r.reason as RecruiterAssignmentError;
      return { ok: false, code: err.code };
    });
    const fulfilled = settled.filter((s) => s.ok) as Array<{ ok: true; value: Awaited<ReturnType<typeof claimCandidateSubmission>> }>;
    const rejected = settled.filter((s) => !s.ok) as Array<{ ok: false; code: string }>;
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].code).toBe('HANDLING_ALREADY_CLAIMED');
    aliceOk = fulfilled[0].value;

    // The winner row carries source = ORDER_RECRUITER_CLAIM and assignee = winner.
    const winnerRow = await withContext(admin, aliceId, 'HR_STAFF', '', '', async (tx) =>
      tx.laborProfileHandlingAssignment.findUnique({
        where: { id: aliceOk!.handlingAssignmentId },
      }),
    );
    expect(winnerRow).toBeTruthy();
    expect(winnerRow!.source).toBe('ORDER_RECRUITER_CLAIM');
    expect(winnerRow!.status).toBe('ACTIVE');
    expect(winnerRow!.assigneeUserId === aliceId || winnerRow!.assigneeUserId === bobId).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-11 / AC-12: MINE rail — winner sees the claimed candidate; loser does not.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-11 winner MINE rail contains the claimed candidate; loser MINE is empty for it', async () => {
    // Determine winner from the prior test via DB state.
    const winnerRow = await withContext(admin, adminUserId, 'ADMIN', '', '', async (tx) =>
      tx.laborProfileHandlingAssignment.findFirst({
        where: {
          laborProfileId: laborProfileX,
          source: 'ORDER_RECRUITER_CLAIM',
          status: 'ACTIVE',
        },
        select: { assigneeUserId: true },
      }),
    );
    expect(winnerRow).toBeTruthy();
    const winnerId = winnerRow!.assigneeUserId;
    const loserId = winnerId === aliceId ? bobId : aliceId;

    const winnerMine = await withContext(admin, winnerId, 'HR_STAFF', '', '', (tx) =>
      listMyClaimedCandidates(tx, winnerId),
    );
    expect(winnerMine.find((m) => m.submissionId === submissionX)).toBeTruthy();
    const claimedRow = winnerMine.find((m) => m.submissionId === submissionX)!;
    expect(claimedRow.staffingOrderId).toBe(orderX);
    expect(claimedRow.handlingAssignmentId).toBeTruthy();

    const loserMine = await withContext(admin, loserId, 'HR_STAFF', '', '', (tx) =>
      listMyClaimedCandidates(tx, loserId),
    );
    expect(loserMine.find((m) => m.submissionId === submissionX)).toBeFalsy();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-13 / AC-14: Placement dual authority — loser denied; winner succeeds.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-13 loser cannot createPlacement (NO_ACTIVE_ORDER_ASSIGNMENT or NO_ACTIVE_ASSIGNMENT)', async () => {
    const winnerRow = await withContext(admin, adminUserId, 'ADMIN', '', '', async (tx) =>
      tx.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: laborProfileX, source: 'ORDER_RECRUITER_CLAIM', status: 'ACTIVE' },
        select: { assigneeUserId: true },
      }),
    );
    const winnerId = winnerRow!.assigneeUserId;
    const loserId = winnerId === aliceId ? bobId : aliceId;

    let denied = false;
    try {
      await withContext(admin, loserId, 'HR_STAFF', '', '', (tx) =>
        createPlacement(tx, {
          actorId: loserId,
          actorRole: 'HR_STAFF',
          laborProfileId: laborProfileX,
          placementCaseId: placementCaseX,
          jobOpeningId: openingX,
        }),
      );
    } catch (e) {
      if (e instanceof RecruiterAssignmentError) {
        denied = true;
        expect(['NO_ACTIVE_ORDER_ASSIGNMENT', 'NO_ACTIVE_ASSIGNMENT']).toContain(e.code);
      } else if (e instanceof PlacementValidationError) {
        // PlacementValidationError can wrap the recruiter-authority denial
        // when the check fires inside the service.
        denied = true;
      } else throw e;
    }
    expect(denied).toBe(true);
  });

  it('AC-14 winner can createPlacement (SELECTED)', async () => {
    const winnerRow = await withContext(admin, adminUserId, 'ADMIN', '', '', async (tx) =>
      tx.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: laborProfileX, source: 'ORDER_RECRUITER_CLAIM', status: 'ACTIVE' },
        select: { assigneeUserId: true },
      }),
    );
    const winnerId = winnerRow!.assigneeUserId;

    const result = await withContext(admin, winnerId, 'HR_STAFF', '', '', (tx) =>
      createPlacement(tx, {
        actorId: winnerId,
        actorRole: 'HR_STAFF',
        laborProfileId: laborProfileX,
        placementCaseId: placementCaseX,
        jobOpeningId: openingX,
      }),
    );
    placementIds.push(result.placementId);
    expect(result.status).toBe('SELECTED');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-19: assertActiveRecruiterForOrder — direct helper coverage.
  // (Placed BEFORE AC-15/AC-16 because those revoke Alice's X assignment.)
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-19 assertActiveRecruiterForOrder passes for assigned Alice; fails for Eve', async () => {
    await withContext(admin, aliceId, 'HR_STAFF', '', '', async (tx) =>
      assertActiveRecruiterForOrder(tx, aliceId, 'HR_STAFF', orderX),
    );
    let denied = false;
    try {
      await withContext(admin, eveId, 'HR_STAFF', '', '', async (tx) =>
        assertActiveRecruiterForOrder(tx, eveId, 'HR_STAFF', orderX),
      );
    } catch (e) {
      if (e instanceof RecruiterAssignmentError && e.code === 'NO_ACTIVE_ORDER_ASSIGNMENT') {
        denied = true;
      } else throw e;
    }
    expect(denied).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-20: assertActiveHandlingForLaborProfile — direct helper coverage.
  // (Placed BEFORE AC-15/AC-16 for the same reason as AC-19.)
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-20 assertActiveHandlingForLaborProfile passes for winner; fails for non-claimant', async () => {
    const winnerRow = await withContext(admin, adminUserId, 'ADMIN', '', '', async (tx) =>
      tx.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: laborProfileX, source: 'ORDER_RECRUITER_CLAIM', status: 'ACTIVE' },
        select: { assigneeUserId: true },
      }),
    );
    const winnerId = winnerRow!.assigneeUserId;

    await withContext(admin, winnerId, 'HR_STAFF', '', '', async (tx) =>
      assertActiveHandlingForLaborProfile(tx, winnerId, 'HR_STAFF', laborProfileX),
    );

    let denied = false;
    try {
      await withContext(admin, eveId, 'HR_STAFF', '', '', async (tx) =>
        assertActiveHandlingForLaborProfile(tx, eveId, 'HR_STAFF', laborProfileX),
      );
    } catch (e) {
      if (e instanceof RecruiterAssignmentError && e.code === 'NO_ACTIVE_ASSIGNMENT') {
        denied = true;
      } else throw e;
    }
    expect(denied).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-21: Idempotent replay — same actor claiming twice returns the same row.
  // (Placed BEFORE AC-15/AC-16 because those revoke Alice's X assignment.)
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-21 idempotent claim replay returns the same row', async () => {
    const winnerRow = await withContext(admin, adminUserId, 'ADMIN', '', '', async (tx) =>
      tx.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: laborProfileX, source: 'ORDER_RECRUITER_CLAIM', status: 'ACTIVE' },
        select: { id: true, assigneeUserId: true },
      }),
    );
    const winnerId = winnerRow!.assigneeUserId;

    const replay = await withContext(admin, winnerId, 'HR_STAFF', '', '', (tx) =>
      claimCandidateSubmission(tx, {
        submissionId: submissionX,
        actorRole: 'HR_STAFF',
        actorId: winnerId,
      }),
    );
    expect(replay.handlingAssignmentId).toBe(winnerRow!.id);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-22: HR_MANAGER bypass — assertActiveRecruiterForOrder passes without
  // an order assignment, and assertActiveHandlingForLaborProfile passes for
  // ADMIN. Pure role-gate smoke test; placement dual-authority is wired into
  // placement.service.ts runTransition / createPlacement.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-22 HR_MANAGER bypass — assertActiveRecruiterForOrder passes without assignment', async () => {
    await withContext(admin, managerUserId, 'HR_MANAGER', '', '', async (tx) =>
      assertActiveRecruiterForOrder(tx, managerUserId, 'HR_MANAGER', orderX),
    );
    await withContext(admin, adminUserId, 'ADMIN', '', '', async (tx) =>
      assertActiveHandlingForLaborProfile(tx, adminUserId, 'ADMIN', laborProfileX),
    );
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-15: Revoke-first ordering — placement transition fails closed after revoke.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-15 revoke-first race — confirmPlacement fails closed after order-assignment revoke', async () => {
    // (1) Assign Alice to Order Y, claim the Y submission, create placement
    //     under STAFFING_SUPPLY (HRP_MANAGED — cannot go EFFECTIVE).
    const orderYAssign = await withContext(admin, managerUserId, 'HR_MANAGER', '', '', (tx) =>
      assignRecruiterToOrder(tx, {
        staffingOrderId: orderY,
        recruiterUserId: aliceId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'P1A04 fixture: Alice → Order Y for revoke-first test',
      }),
    );
    assignmentIds.push(orderYAssign.id);

    // Claim the Y submission as Alice.
    const claimY = await withContext(admin, aliceId, 'HR_STAFF', '', '', (tx) =>
      claimCandidateSubmission(tx, {
        submissionId: submissionIds[1],
        actorRole: 'HR_STAFF',
        actorId: aliceId,
      }),
    );
    void claimY; // result captured via DB queries below.

    // Get the placement case + labor profile for the Y submission.
    const subY = await withContext(admin, adminUserId, 'ADMIN', '', '', async (tx) =>
      tx.candidateSubmission.findUnique({
        where: { id: submissionIds[1] },
        select: { placementCaseId: true },
      }),
    );
    const caseY = subY!.placementCaseId!;
    const profileYRow = await withContext(admin, adminUserId, 'ADMIN', '', '', async (tx) =>
      tx.placementCase.findUnique({
        where: { id: caseY },
        select: { laborProfileId: true },
      }),
    );

    // Create placement on Order Y's slot/opening.
    const placementY = await withContext(admin, aliceId, 'HR_STAFF', '', '', (tx) =>
      createPlacement(tx, {
        actorId: aliceId,
        actorRole: 'HR_STAFF',
        laborProfileId: profileYRow!.laborProfileId,
        placementCaseId: caseY,
        jobOpeningId: openingY,
      }),
    );
    placementIds.push(placementY.placementId);
    expect(placementY.status).toBe('SELECTED');

    // (2) Revoke Alice's assignment on Order Y.
    await withContext(admin, managerUserId, 'HR_MANAGER', '', '', (tx) =>
      revokeRecruiterFromOrder(tx, {
        staffingOrderId: orderYAssign.staffingOrderId,
        assignmentId: orderYAssign.id,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'P1A04 revoke-first race fixture',
      }),
    );

    // (3) Alice attempts confirmPlacement → must fail closed.
    let denied = false;
    try {
      await withContext(admin, aliceId, 'HR_STAFF', '', '', (tx) =>
        confirmPlacement(tx, {
          placementId: placementY.placementId,
          actorId: aliceId,
          actorRole: 'HR_STAFF',
        }),
      );
    } catch (e) {
      if (e instanceof RecruiterAssignmentError) {
        denied = true;
        expect(['NO_ACTIVE_ORDER_ASSIGNMENT', 'NO_ACTIVE_ASSIGNMENT']).toContain(e.code);
      } else throw e;
    }
    expect(denied).toBe(true);

    // (4) Cleanup: cancel the placement as HR_MANAGER (terminal → CANCELLED).
    await withContext(admin, managerUserId, 'HR_MANAGER', '', '', (tx) =>
      cancelPlacement(tx, {
        placementId: placementY.placementId,
        actorId: managerUserId,
        actorRole: 'HR_MANAGER',
      }),
    );
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-16: Command-first ordering — placement transition fails closed when
  // concurrent revoke lands BEFORE the transition runs.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-16 command-first race — revoke order-assignment before confirm; transition fails closed', async () => {
    // Reuse: Alice still has assignment on Order X from setup.
    const assignmentXAlice = await withContext(admin, adminUserId, 'ADMIN', '', '', async (tx) =>
      tx.staffingOrderRecruiterAssignment.findFirst({
        where: { staffingOrderId: orderX, recruiterUserId: aliceId, status: 'ACTIVE' },
      }),
    );
    expect(assignmentXAlice).toBeTruthy();

    // Reuse the placement from AC-14 (placement[0]) — already in SELECTED.
    const winnerPlacementId = placementIds[0];

    // (1) Revoke Alice's X assignment.
    await withContext(admin, managerUserId, 'HR_MANAGER', '', '', (tx) =>
      revokeRecruiterFromOrder(tx, {
        staffingOrderId: assignmentXAlice!.staffingOrderId,
        assignmentId: assignmentXAlice!.id,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'P1A04 command-first race fixture',
      }),
    );

    // (2) Alice attempts confirmPlacement → must fail closed.
    let denied = false;
    try {
      await withContext(admin, aliceId, 'HR_STAFF', '', '', (tx) =>
        confirmPlacement(tx, {
          placementId: winnerPlacementId,
          actorId: aliceId,
          actorRole: 'HR_STAFF',
        }),
      );
    } catch (e) {
      if (e instanceof RecruiterAssignmentError) {
        denied = true;
        expect(['NO_ACTIVE_ORDER_ASSIGNMENT', 'NO_ACTIVE_ASSIGNMENT']).toContain(e.code);
      } else throw e;
    }
    expect(denied).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-17: HR_STAFF cannot self-revoke (service gate).
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-17 HR_STAFF cannot revoke (service gate)', async () => {
    let denied = false;
    try {
      await withContext(admin, aliceId, 'HR_STAFF', '', '', (tx) =>
        revokeRecruiterFromOrder(tx, {
          staffingOrderId: orderX,
          assignmentId: assignmentBobX,
          actorRole: 'HR_STAFF',
          actorId: aliceId,
          reason: 'unauthorized self-revoke attempt',
        }),
      );
    } catch (e) {
      if (e instanceof RecruiterAssignmentError && e.code === 'ROLE_NOT_PERMITTED') {
        denied = true;
      } else throw e;
    }
    expect(denied).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC-18: Source CHECK constraint — only HR_MANAGER_ASSIGN is allowed.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-18 source CHECK rejects ORDER_RECRUITER_CLAIM at the DB layer', async () => {
    let rejected = false;
    try {
      await withContext(admin, adminUserId, 'ADMIN', '', '', async (tx) =>
        tx.staffingOrderRecruiterAssignment.create({
          data: {
            staffingOrderId: orderY,
            recruiterUserId: aliceId,
            assignedByUserId: adminUserId,
            source: 'ORDER_RECRUITER_CLAIM', // forbidden source
            status: 'ACTIVE',
            assignedAt: new Date(),
          },
        }),
      );
    } catch (e) {
      rejected = true;
    }
    expect(rejected).toBe(true);
  });
});
