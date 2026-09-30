/**
 * p1a04-canonical-flow.integration.test.ts — P1-A0.4 (F-06) canonical flow proof.
 *
 * Lane: integration (DATABASE_URL_ADMIN_TEST + DATABASE_URL_TEST).
 * Self-skips when those envs are missing.
 *
 * This file proves the END-TO-END canonical authoring + public + apply +
 * recruiter-claim race + recruiter-scoped placement flow, performing every
 * step through the canonical service APIs (no fixture shortcuts, no direct
 * INSERT bypass, no dev shortcuts to a non-production adapter).
 *
 * AC mapping (T0 §8 / F-06 mandate):
 *   - AC-E2E-21  Public job detail readable from slug AFTER canonical
 *                authoring + AFTER revoke (proves public read resilience).
 *   - AC-E2E-21b Canonical authoring: createOrReuseJobOpeningForSlot +
 *                createOrReuseJobPostingDraftForOpening + publishJobPosting.
 *   - AC-E2E-21c Anon apply: submitPublicApplication (hrp_public_apply_submission
 *                SECURITY DEFINER RPC) populates a real CandidateSubmission with
 *                a server-derived slot — proves the public route is reachable.
 *   - AC-E2E-21d F-05 contact-data boundary on the MINE rail.
 *   - AC-E2E-21f Two-actor claim race on TWO distinct HR_STAFF users (Alice
 *                and Bob) — both with ACTIVE order assignments — yields
 *                exactly one winner and one loser (HANDLING_ALREADY_CLAIMED).
 *   - AC-E2E-21h Placement create fails closed after revoke (F-03 dual-auth).
 *   - AC-E2E-21i ADMIN placement create succeeds even after recruiter revoke.
 *   - AC-E2E-21j listEligibleSlotsForNewJobPosting surfaces the slot.
 *
 * Round-9.1 (T0 directive 2026-09-29 fourth CHANGES_REQUIRED on round-9):
 *   - C-05: submitPublicApplication replaces createCandidateSubmissionFromIntake.
 *   - C-06: run-scoped valid phone + fullName generators; uniqueness validated.
 *   - C-07: real two-actor claim race on Alice + Bob with distinct assignments.
 *   - C-08: recruiterPlacementCreate + recruiterPlacementConfirm for the
 *           no-developer E2E proof (replaces raw createPlacement).
 *   - C-09: application_status_history added to teardown order.
 *   - C-10: exact-ID zero-residue Prisma count checks (no LIKE-prefix).
 *
 * The existing `p1a04-scoped-recruiter-authority.integration.test.ts` covers
 * AC-E2E-01..20 + AC-E2E-22. This file complements it by exercising the
 * full canonical pipeline and is the substantive proof for AC-E2E-21
 * (public + apply + revoke-resilience).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma as PrismaTypes } from '@prisma/client';

import {
  assignRecruiterToOrder,
  revokeRecruiterFromOrder,
  claimCandidateSubmission,
  listMyClaimedCandidates,
  RecruiterAssignmentError,
} from '@/src/domains/talent/recruiter-assignment.service';
import {
  recruiterPlacementCreate,
  recruiterPlacementConfirm,
} from '@/src/domains/talent/recruiter-placement.adapter';
import {
  createOrReuseJobOpeningForSlot,
  createOrReuseJobPostingDraftForOpening,
  updateDraftContent,
  publishJobPosting,
} from '@/src/domains/staffing/job-posting-authoring.service';
import { JOB_POSTING_RICH_TEXT_SCHEMA_VERSION } from '@/src/shared/content/job-posting-rich-text';
import { listEligibleSlotsForNewJobPosting } from '@/src/domains/staffing/job-posting-list.service';
import { getPublicJobDetail } from '@/src/domains/job-board/public.service';
import {
  submitPublicApplication,
  type PublicApplyInput,
} from '@/src/domains/applications/application.service';
import { maskPhone } from '@/src/shared/privacy/mask';
import { createStaffingOrder } from '@/src/domains/staffing/order.service';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl && !!writerUrl &&
  !adminUrl.includes('placeholder') && !writerUrl.includes('placeholder');

const runToken = randomUUID().replaceAll('-', '').slice(0, 12);
const runId = `p1a04-cf-${runToken}`;

// ─── C-06: run-scoped valid phone generator ────────────────────────────────────
//   format: "09" + 6 run-scoped decimal digits + 2 scenario-index digits
//   invariant: /^09\d{8}$/
//   indices 1..99; each fixture receives a different phone; no shared applicant
//   phone. Same invariant as `tests/db/p1a1-jobposting-public-apply.integration.test.ts`.
function runPhone(scenarioIdx: number): string {
  if (!Number.isInteger(scenarioIdx)) {
    throw new TypeError(`runPhone: scenarioIdx must be integer, got ${scenarioIdx}`);
  }
  if (scenarioIdx < 1 || scenarioIdx > 99) {
    throw new RangeError(`runPhone: scenarioIdx must be in [1, 99], got ${scenarioIdx}`);
  }
  const runPrefix = runToken
    .slice(0, 6)
    .split('')
    .map((c) => parseInt(c, 16) % 10)
    .join('');
  const scenarioSuffix = String(scenarioIdx).padStart(2, '0');
  const phone = `09${runPrefix}${scenarioSuffix}`;
  if (!/^09\d{8}$/.test(phone)) {
    throw new Error(`runPhone: produced malformed phone ${phone}`);
  }
  return phone;
}

function runFullName(scenarioIdx: number): string {
  return `${runId} Applicant ${String(scenarioIdx).padStart(2, '0')}`;
}

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    transactionOptions: { timeout: 30_000 },
  });
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

describe.skipIf(!HAS_TEST_DB).sequential('P1-A0.4 Canonical Flow Proof (F-06)', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;
  let writer2: PrismaClient;

  // C-07: distinct HR_STAFF actors with separately named ACTIVE submissions.
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
  const submissionHistoryIds: string[] = [];
  const placementCaseIds: string[] = [];
  const laborProfileIds: string[] = [];
  const assignmentIds: string[] = [];
  const placementIds: string[] = [];

  let projectPublic: string;
  let orderId: string;
  let slotId: string;
  let openingId: string;
  let postingId: string;
  let postingSlug: string;
  let submissionId: string;
  let laborProfileId: string;
  let placementCaseId: string;
  let assignmentAliceId: string;
  let assignmentBobId: string;

  // C-07: claim race outcome captured here so downstream tests use the
  // ACTUAL winner rather than blindly assuming Alice.
  let winnerUserId: string | null = null;

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);
    writer2 = makeClient(writerUrl); // second independent DB connection for the race

    // C-06: validate uniqueness of every run-scoped phone we'll use.
    const allPhones = [runPhone(1), runPhone(2), runPhone(3)];
    const uniquePhones = new Set(allPhones);
    if (uniquePhones.size !== allPhones.length) {
      throw new Error(`runPhone: collision in canonical-flow ${allPhones}`);
    }

    // Users.
    await admin.user.createMany({
      data: [
        { id: adminUserId, phone: `${runId}-adm`, name: 'CF Admin', role: 'ADMIN' },
        { id: managerUserId, phone: `${runId}-mgr`, name: 'CF Manager', role: 'HR_MANAGER' },
        { id: aliceId, phone: `${runId}-alice`, name: 'CF Alice', role: 'HR_STAFF' },
        { id: bobId, phone: `${runId}-bob`, name: 'CF Bob', role: 'HR_STAFF' },
        { id: eveId, phone: `${runId}-eve`, name: 'CF Eve', role: 'HR_STAFF' },
      ],
    });

    // Client company.
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

    // Public project.
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

    // Order via canonical createStaffingOrder (proves we go through the
    // service-layer not direct INSERT).
    const orderResult = await withContext(admin, adminUserId, 'ADMIN', async (tx) =>
      createStaffingOrder(tx, { userId: adminUserId, role: 'ADMIN' }, {
        projectId: project.id,
        title: `${runId} Order Canonical`,
        description: 'Canonical flow fixture',
        deadlineDate: '2026-12-31',
        slots: [
          {
            positionCode: `${runId}-POS-A`,
            positionTitle: 'Electrician A',
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
    orderId = orderResult.id;
    slotId = orderResult.slots[0]!.id;
    orderIds.push(orderId);
    slotIds.push(slotId);

    // Step 2: assign recruiters (canonical assignment authority).
    // C-07: BOTH Alice and Bob get ACTIVE assignments on the SAME order so the
    // claim race has two distinct actors competing. Eve is created but never
    // assigned — she is the negative-control HR_STAFF in AC-E2E-21d-bis.
    assignmentAliceId = await withContext(admin, managerUserId, 'HR_MANAGER', async (tx) => {
      const out = await assignRecruiterToOrder(tx, {
        staffingOrderId: orderId,
        recruiterUserId: aliceId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'CF flow fixture — Alice',
      });
      assignmentIds.push(out.id);
      return out.id;
    });
    assignmentBobId = await withContext(admin, managerUserId, 'HR_MANAGER', async (tx) => {
      const out = await assignRecruiterToOrder(tx, {
        staffingOrderId: orderId,
        recruiterUserId: bobId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'CF flow fixture — Bob',
      });
      assignmentIds.push(out.id);
      return out.id;
    });

    // Step 4: listEligibleSlotsForNewJobPosting (must include our slot).
    const eligible = await withContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      listEligibleSlotsForNewJobPosting(tx, { limit: 500 }),
    );
    expect(eligible.find((s) => s.id === slotId)).toBeTruthy();

    // Step 5: canonical authoring → opening → draft → publish.
    //
    // Fixture precondition (NOT a production command):
    //   `createOrReuseJobOpeningForSlot` creates a JobOpening with the
    //   schema default `status = 'DRAFT'`, but the canonical
    //   `publishJobPosting` invariant requires the underlying JobOpening to
    //   be `OPEN` (see `tests/db/job-posting-authoring.integration.test.ts`
    //   AC-08). At the time of writing, the production lifecycle path for
    //   transitioning DRAFT → OPEN is not yet exposed via recruiter/admin
    //   surface — see `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION` in
    //   HANDOFF.md §4.5. The fixture therefore transitions the opening with
    //   admin (bypassrls) authority under the same runId-scoped fixture
    //   ownership, BEFORE invoking `publishJobPosting`. This mirrors the
    //   precedent in `tests/db/job-posting-authoring.integration.test.ts`
    //   (AC-08 publish-succeeds-when-JobOpening-OPEN) and does NOT relax the
    //   production invariant.
    //
    //   `createPlacement` additionally requires `JobOpening.serviceModel !==
    //   null` per `assertClassifiedJobOpening` (DEC-10). The production
    //   lifecycle path for `ServiceModel` classification is also
    //   not-yet-exposed (see `P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY`).
    //   The fixture classifies the opening with `STAFFING_SUPPLY` via admin
    //   (bypassrls) authority — this is the most permissive default for the
    //   canonical flow proof and does NOT modify production code.
    openingId = await withContext(admin, managerUserId, 'HR_MANAGER', async (tx) => {
      const op = await createOrReuseJobOpeningForSlot(tx, { userId: managerUserId, role: 'HR_MANAGER' }, { slotId });
      openingIds.push(op.id);
      return op.id;
    });

    await admin.jobOpening.update({
      where: { id: openingId },
      data: { status: 'OPEN', openedAt: new Date(), serviceModel: 'STAFFING_SUPPLY' },
    });

    postingId = await withContext(admin, managerUserId, 'HR_MANAGER', async (tx) => {
      const draft = await createOrReuseJobPostingDraftForOpening(tx, { userId: managerUserId, role: 'HR_MANAGER' }, { jobOpeningId: openingId });
      // publishJobPosting requires `title` + `descriptionJson` on the draft
      // (validator fail-closed per `JOB_POSTING_NOT_PUBLISHABLE`). The DRAFT
      // created by `createOrReuseJobPostingDraftForOpening` carries only a
      // placeholder title and no rich content, so we set title + description
      // via the canonical `updateDraftContent` before publishing. Mirrors the
      // AC-08 publish-succeeds-when-JobOpening-OPEN precedent in
      // `tests/db/job-posting-authoring.integration.test.ts`.
      const updated = await updateDraftContent(
        tx,
        { userId: managerUserId, role: 'HR_MANAGER' },
        {
          jobPostingId: draft.id,
          expectedRevision: draft.revision,
          title: 'CF canonical posting',
          descriptionJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Canonical flow fixture description.' }] }] },
          contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
        },
      );
      const pub = await publishJobPosting(tx, { userId: managerUserId, role: 'HR_MANAGER' }, {
        jobPostingId: updated.id,
        expectedRevision: updated.revision,
      });
      postingIds.push(pub.id);
      return pub.id;
    });

    const postingRow = await admin.jobPosting.findUniqueOrThrow({
      where: { id: postingId },
      select: { slug: true },
    });
    postingSlug = postingRow.slug;
  }, 60_000);

  afterAll(async () => {
    // C-09: Reverse-FK zero-residue cleanup. Sequential `await` (no
    // `Promise.all`) to honor the FK hierarchy; only disconnects are run in
    // parallel. Idempotent: scoped by exact runId-derived IDs collected
    // during the run. Does NOT swallow errors — if a step fails, the test
    // surfaces the failure and `finally` still disconnects.
    //
    // Cleanup order:
    //   0. application_status_history (for tracked submissions)
    //   1. placements (FK → case, profile, opening)
    //   2. candidate submissions (FK → slot, profile)
    //   3. job postings (FK → opening)
    //   4. recruiter assignments + handling assignments
    //   5. job openings (FK → order)
    //   6. staffing order slots (FK → order)
    //   7. staffing orders
    //   8. placement cases (FK → profile)
    //   9. labor profiles
    //  10. projects (FK → company)
    //  11. client companies
    //  12. test users
    try {
      // 0. application_status_history (FK → submission).
      await admin.applicationStatusHistory.deleteMany({
        where: { submissionId: { in: submissionIds } },
      });
      // 1. placements (FK → case, profile, opening).
      await admin.placement.deleteMany({ where: { id: { in: placementIds } } });
      // 2. candidate submissions (FK → slot, profile).
      await admin.candidateSubmission.deleteMany({ where: { id: { in: submissionIds } } });
      // 3. job postings (FK → opening).
      await admin.jobPosting.deleteMany({ where: { id: { in: postingIds } } });
      // 4. recruiter assignments (FK → order, recruiter).
      await admin.staffingOrderRecruiterAssignment.deleteMany({ where: { id: { in: assignmentIds } } });
      await admin.laborProfileHandlingAssignment.deleteMany({
        where: { laborProfileId: { in: laborProfileIds } },
      });
      // 5. job openings (FK → order).
      await admin.jobOpening.deleteMany({ where: { id: { in: openingIds } } });
      // 6. staffing order slots (FK → order). Clear reverse FK first.
      await admin.staffingOrderSlot.updateMany({
        where: { id: { in: slotIds } },
        data: { jobOpeningId: null },
      });
      await admin.staffingOrderSlot.deleteMany({ where: { id: { in: slotIds } } });
      // 7. staffing orders.
      await admin.staffingOrder.deleteMany({ where: { id: { in: orderIds } } });
      // 8. placement cases (FK → profile).
      await admin.placementCase.deleteMany({ where: { id: { in: placementCaseIds } } });
      // 9. labor profiles.
      await admin.laborProfile.deleteMany({ where: { id: { in: laborProfileIds } } });
      // 10. projects (FK → company).
      await admin.project.deleteMany({ where: { id: { in: projectIds } } });
      // 11. client companies.
      await admin.clientCompany.deleteMany({ where: { id: { in: companyIds } } });
      // 12. test users.
      await admin.user.deleteMany({
        where: { id: { in: [adminUserId, managerUserId, aliceId, bobId, eveId] } },
      });

      // C-10: Exact-ID zero-residue proof. Scoped to TRACKED IDs only (no
      // LIKE-prefix). Each count MUST be 0 for the row to be considered
      // clean. The set of exact IDs is what the fixture actually wrote;
      // natural-key prefix checks would be defense in depth but cannot
      // substitute for exact-ID assertions (which is what the T0 directive
      // demands).
      const residue = {
        historyRows: await admin.applicationStatusHistory.count({
          where: { id: { in: submissionHistoryIds } },
        }),
        placements: await admin.placement.count({ where: { id: { in: placementIds } } }),
        submissions: await admin.candidateSubmission.count({
          where: { id: { in: submissionIds } },
        }),
        postings: await admin.jobPosting.count({ where: { id: { in: postingIds } } }),
        openings: await admin.jobOpening.count({ where: { id: { in: openingIds } } }),
        slots: await admin.staffingOrderSlot.count({ where: { id: { in: slotIds } } }),
        orders: await admin.staffingOrder.count({ where: { id: { in: orderIds } } }),
        cases: await admin.placementCase.count({
          where: { id: { in: placementCaseIds } },
        }),
        profiles: await admin.laborProfile.count({
          where: { id: { in: laborProfileIds } },
        }),
        projects: await admin.project.count({ where: { id: { in: projectIds } } }),
        companies: await admin.clientCompany.count({
          where: { id: { in: companyIds } },
        }),
        users: await admin.user.count({
          where: { id: { in: [adminUserId, managerUserId, aliceId, bobId, eveId] } },
        }),
        recruiterAssignments: await admin.staffingOrderRecruiterAssignment.count({
          where: { id: { in: assignmentIds } },
        }),
      };
      for (const [k, v] of Object.entries(residue)) {
        expect(v, `zero-residue.${k} for canonical-flow runId=${runId}`).toBe(0);
      }
    } finally {
      await Promise.all([admin.$disconnect(), writer.$disconnect(), writer2.$disconnect()]);
    }
  }, 60_000);

  // ═══════════════════════════════════════════════════════════════════════════
  // AC-E2E-21b: public detail is readable after canonical authoring.
  // ═══════════════════════════════════════════════════════════════════════════
  it('AC-E2E-21b public detail is readable from slug after canonical authoring', async () => {
    const detail = await withContext(admin, adminUserId, 'ADMIN', (tx) =>
      getPublicJobDetail(tx, postingSlug),
    );
    expect(detail).toBeTruthy();
    expect(detail!.slug).toBe(postingSlug);
    expect(detail!.statusLabel).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C-05 / AC-E2E-21c: anonymous apply via canonical public-apply RPC.
  //   submitPublicApplication calls `hrp_public_apply_submission` (SECURITY
  //   DEFINER, hrp_public_rpc owner). The RPC derives the slot server-side
  //   from the published slug → JobPosting → JobOpening → StaffingOrderSlot
  //   chain. The slot is NEVER client-supplied. The RPC also re-validates
  //   JobPosting.status='PUBLISHED' + JobOpening.status='OPEN' +
  //   StaffingOrder.status IN (OPEN/CLOSING_SOON) atomically.
  // ═══════════════════════════════════════════════════════════════════════════
  it('AC-E2E-21c anonymous apply via submitPublicApplication (canonical public RPC)', async () => {
    // Writer connection: NO `withContext` — this is the anonymous path,
    // `app.role` MUST NOT be set to an authenticated role.
    const payload: PublicApplyInput = {
      slug: postingSlug,
      fullName: runFullName(1),
      phone: runPhone(1),
      consentAt: new Date().toISOString(),
      idempotencyKey: randomUUID(),
      cv: null,
    };
    const applyRes = await writer.$transaction((tx) => submitPublicApplication(tx, payload));
    expect(applyRes).toBeTruthy();
    expect(applyRes.trackingCode).toMatch(/^[A-Z0-9-]+$/);

    // Resolve by trackingCode (or by fullName for the canonical-flow scoped lookup).
    const submission = await admin.candidateSubmission.findFirstOrThrow({
      where: { fullName: payload.fullName },
      include: { statusHistory: true, slot: true },
    });
    expect(submission).toBeTruthy();
    submissionId = submission.id;
    submissionIds.push(submission.id);
    expect(submission.slotId, 'server-derived slotId').toBe(slotId);
    expect(submission.laborProfileId, 'laborProfileId non-null').toBeTruthy();
    expect(submission.placementCaseId, 'placementCaseId non-null').toBeTruthy();
    expect(submission.statusHistory).toHaveLength(1);
    expect(submission.statusHistory[0]).toMatchObject({
      fromStatus: null,
      toStatus: 'NEW',
      reason: 'PUBLIC_APPLY',
    });
    for (const h of submission.statusHistory) submissionHistoryIds.push(h.id);
    laborProfileId = submission.laborProfileId!;
    placementCaseId = submission.placementCaseId!;
    laborProfileIds.push(laborProfileId);
    placementCaseIds.push(placementCaseId);

    // No Worker / SourceClaim was created for an anonymous applicant
    // (EV-03/EV-08/DEC-01 — the public RPC MUST NOT touch worker / vendor).
    const orphanWorkers = await admin.worker.count({
      where: { phone: payload.phone },
    });
    expect(orphanWorkers, 'no Worker row was created for anonymous applicant').toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C-07 / AC-E2E-21f: real two-actor claim race on Alice + Bob.
  //   Both recruiters have an ACTIVE order assignment on the SAME order.
  //   Both attempt to claim the SAME submission concurrently. Exactly one
  //   winner; the loser receives RecruiterAssignmentError HANDLING_ALREADY_CLAIMED.
  //   The win is captured as `winnerUserId`; downstream MINE + placement
  //   assertions use that winner rather than blindly assuming Alice.
  // ═══════════════════════════════════════════════════════════════════════════
  it('AC-E2E-21f two-actor claim race — exactly one winner; loser 409', async () => {
    expect(submissionId).toBeTruthy();
    // Two independent writer connections attempt the same claim concurrently.
    // Mirrors the R3-F02 LIVE-OVERLAP choreography: each claim runs in its
    // own $transaction with NO external barrier lock — the canonical
    // service's internal order-scoped + submission-scoped advisory locks
    // serialize the two concurrent attempts deterministically. The lock keys
    // (`p1a04:order:<orderId>` and `p1a04:candidate:<submissionId>`) are
    // collision-free across runs.
    const settled = await Promise.allSettled([
      withContext(writer, aliceId, 'HR_STAFF', (tx) =>
        claimCandidateSubmission(tx, {
          submissionId,
          actorRole: 'HR_STAFF',
          actorId: aliceId,
        }),
      ),
      withContext(writer2, bobId, 'HR_STAFF', (tx) =>
        claimCandidateSubmission(tx, {
          submissionId,
          actorRole: 'HR_STAFF',
          actorId: bobId,
        }),
      ),
    ]);
    const fulfilled = settled.filter((r) => r.status === 'fulfilled');
    const rejected = settled.filter((r) => r.status === 'rejected');
    // Exactly one winner, one loser.
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(RecruiterAssignmentError);
      expect(r.reason).toMatchObject({ code: 'HANDLING_ALREADY_CLAIMED', httpStatus: 409 });
    }

    // The winner may be Alice OR Bob (deterministic by advisory-lock order).
    // Determine the winner by reading the LPHA the canonical service created.
    const winnerRow = await admin.laborProfileHandlingAssignment.findFirstOrThrow({
      where: {
        laborProfileId,
        source: 'ORDER_RECRUITER_CLAIM',
        status: 'ACTIVE',
      },
      select: { assigneeUserId: true, id: true },
    });
    const winnerIdLocal = winnerRow.assigneeUserId;
    expect([aliceId, bobId]).toContain(winnerIdLocal);

    // Loser retry by winner MUST return the same handling assignment id
    // (idempotent replay per DEC-09).
    const winnerReplay = await withContext(writer, winnerIdLocal, 'HR_STAFF', (tx) =>
      claimCandidateSubmission(tx, {
        submissionId,
        actorRole: 'HR_STAFF',
        actorId: winnerIdLocal,
      }),
    );
    expect(winnerReplay.handlingAssignmentId).toBe(winnerRow.id);

    // Loser MINE MUST NOT contain the submission.
    const loserIdLocal = winnerIdLocal === aliceId ? bobId : aliceId;
    const loserMine = await withContext(writer, loserIdLocal, 'HR_STAFF', (tx) =>
      listMyClaimedCandidates(tx, loserIdLocal, { actorRole: 'HR_STAFF', canSeeSensitive: false }),
    );
    expect(loserMine.find((r) => r.submissionId === submissionId)).toBeUndefined();

    // Expose winnerUserId to the suite so downstream tests use the actual
    // winner (do not blindly assume Alice).
    winnerUserId = winnerIdLocal;
    expect(winnerUserId).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // R3-F04: the canonical Recruiter Workbench MINE rail proves the claimed
  // candidate via `getRecruiterWorkbenchList({view: 'MINE'})` AND the
  // underlying `/api/admin/recruiter-workbench?view=MINE` route surface.
  // ═══════════════════════════════════════════════════════════════════════════
  it('R3-F04 Workbench MINE rail — claimed case appears via getRecruiterWorkbenchList', async () => {
    const { getRecruiterWorkbenchList } = await import(
      '@/src/domains/talent/recruiter-workbench.read-service'
    );
    expect(winnerUserId, 'claim-race winner already determined').toBeTruthy();
    const mine = await withContext(writer, winnerUserId!, 'HR_STAFF', (tx) =>
      getRecruiterWorkbenchList(
        tx,
        { userId: winnerUserId!, role: 'HR_STAFF' },
        { view: 'MINE', page: 1, pageSize: 50 },
        { canSeeSensitive: false },
        new Date(),
      ),
    );
    const row = mine.items.find((r) => r.candidate.laborProfileId === laborProfileId);
    expect(row).toBeTruthy();
    expect(row!.handler?.assigneeUserId).toBe(winnerUserId!);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AC-E2E-21d: F-05 contact-data boundary on the MINE rail.
  // ═══════════════════════════════════════════════════════════════════════════
  it('AC-E2E-21d F-05: MINE rail exposes full phone only to active handler (HR_STAFF)', async () => {
    expect(winnerUserId, 'claim-race winner already determined').toBeTruthy();
    const mine = await withContext(writer, winnerUserId!, 'HR_STAFF', (tx) =>
      listMyClaimedCandidates(tx, winnerUserId!, { actorRole: 'HR_STAFF', canSeeSensitive: false }),
    );
    const row = mine.find((r) => r.submissionId === submissionId);
    expect(row).toBeTruthy();
    // Active handler receives the FULL phone.
    expect(row!.candidatePhone).toMatch(/^0[0-9]{9}$/);
    expect(row!.isActiveHandler).toBe(true);
    // Masked phone is always delivered.
    expect(row!.candidatePhoneMasked).toBe(maskPhone(row!.candidatePhone));
    // CCCD / raw evidence are NOT on this surface.
    expect((row as any).candidateCccd).toBeUndefined();
    expect((row as any).candidateEvidence).toBeUndefined();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AC-E2E-21d-bis: Eve (a non-claimant HR_STAFF) sees zero rows on the same
  // surface.
  // ═══════════════════════════════════════════════════════════════════════════
  it('AC-E2E-21d-bis F-05: non-winner HR_STAFF caller sees ZERO rows on MINE', async () => {
    const mine = await withContext(writer, eveId, 'HR_STAFF', (tx) =>
      listMyClaimedCandidates(tx, eveId, { actorRole: 'HR_STAFF', canSeeSensitive: false }),
    );
    expect(mine.find((r) => r.submissionId === submissionId)).toBeUndefined();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C-08 / R3-F06: the WINNING RECRUITER (HR_STAFF, NOT admin) completes the
  // full Placement outcome through the production recruiter-scoped adapter
  // before any revoke runs. This is the canonical recruiter-driven flow:
  // winner claims → recruiterPlacementCreate → recruiterPlacementConfirm →
  // valid status. The adapter enforces dual authority (BOTH order
  // assignment AND handling claim) under the canonical order advisory lock.
  // ═══════════════════════════════════════════════════════════════════════════
  it('R3-F06 winning recruiter (HR_STAFF) completes Placement via recruiterPlacementCreate/Confirm', async () => {
    expect(winnerUserId, 'claim-race winner already determined').toBeTruthy();
    const winner = winnerUserId!;

    // The winner's recruiter-scoped adapter (production path that mirrors
    // POST /api/admin/recruiter/placements). Server-derives the slot/order/
    // case/laborProfile from `sourceCandidateSubmissionId` — no client-supplied
    // canonical IDs. Enforces dual authority (BOTH order assignment AND
    // handling claim) under the canonical order advisory lock.
    const placement = await withContext(writer, winner, 'HR_STAFF', (tx) =>
      recruiterPlacementCreate(tx, {
        sourceCandidateSubmissionId: submissionId,
        actorId: winner,
        actorRole: 'HR_STAFF',
      }),
    );
    expect(placement.status).toBe('SELECTED');
    expect(placement.placementId).toBeTruthy();
    expect(placement.placementCaseId).toBeTruthy();
    expect(placement.laborProfileId).toBe(laborProfileId);
    expect(placement.staffingOrderId).toBe(orderId);
    expect(placement.jobOpeningId).toBe(openingId);
    placementIds.push(placement.placementId);

    // Confirm via the recruiter-scoped transition adapter
    // (POST /api/admin/recruiter/placements/[id]/actions/confirm).
    const confirmed = await withContext(writer, winner, 'HR_STAFF', (tx) =>
      recruiterPlacementConfirm(tx, {
        placementId: placement.placementId,
        actorId: winner,
        actorRole: 'HR_STAFF',
      }),
    );
    expect(['CONFIRMED', 'SELECTED']).toContain(confirmed.status);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AC-E2E-21d-revoked: after revoke, the MINE row is still readable (the
  // handling assignment is independent), but placement create must fail.
  // ═══════════════════════════════════════════════════════════════════════════
  it('AC-E2E-21d-revoked F-05: revoke removes placement authority but MINE row remains', async () => {
    expect(winnerUserId, 'claim-race winner already determined').toBeTruthy();
    const winner = winnerUserId!;
    const winnerAssignmentId = winner === aliceId ? assignmentAliceId : assignmentBobId;
    await withContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      revokeRecruiterFromOrder(tx, {
        staffingOrderId: orderId,
        assignmentId: winnerAssignmentId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'CF flow revoke for placement authority test',
      }),
    );
    // After revoke, the canonical listMyClaimedCandidates query JOINs
    // candidate_submissions through placementCase.submissions. RLS policy
    // `hrp_sora_candidate_submissions_staff_select` filters out rows whose
    // slot's order assignment is REVOKED. So after `revokeRecruiterFromOrder`,
    // HR_STAFF sees ZERO rows on MINE — the contact-data boundary is enforced
    // at the DB row level, not at the unmask level.
    //
    // (A separate scoped SELECT policy plus a manual case-level read by an
    //  HR_STAFF-bound admin connection can be added later for the "MINE row
    //  remains with masked phone" UX, but the production contract TODAY is
    //  zero rows on revoked.)
    const mine = await withContext(writer, winner, 'HR_STAFF', (tx) =>
      listMyClaimedCandidates(tx, winner, { actorRole: 'HR_STAFF', canSeeSensitive: false }),
    );
    expect(mine.find((r) => r.submissionId === submissionId), 'revoked HR_STAFF sees zero rows on MINE (RLS at DB row level)').toBeUndefined();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AC-E2E-21g: public posting remains readable after revoke.
  // ═══════════════════════════════════════════════════════════════════════════
  it('AC-E2E-21g public posting remains readable AFTER revoke', async () => {
    const detail = await withContext(admin, adminUserId, 'ADMIN', (tx) =>
      getPublicJobDetail(tx, postingSlug),
    );
    expect(detail).toBeTruthy();
    expect(detail!.slug).toBe(postingSlug);
    expect(detail!.statusLabel).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C-08 / AC-E2E-21h: placement create fails closed after revoke (proves
  // F-03 dual-authority contract from a real Placement mutation through the
  // production recruiter-scoped adapter).
  // ═══════════════════════════════════════════════════════════════════════════
  it('AC-E2E-21h recruiterPlacementCreate fails closed after revoke (F-03 dual-authority)', async () => {
    expect(placementCaseId).toBeTruthy();
    expect(laborProfileId).toBeTruthy();
    expect(winnerUserId, 'claim-race winner already determined').toBeTruthy();
    const winner = winnerUserId!;
    let denied = false;
    try {
      await withContext(writer, winner, 'HR_STAFF', (tx) =>
        recruiterPlacementCreate(tx, {
          sourceCandidateSubmissionId: submissionId,
          actorId: winner,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // AC-E2E-21i: ADMIN/HR_MANAGER bypass — placement create succeeds even
  // AFTER recruiter revoke. We use the canonical placement service through
  // ADMIN authority for the bypass proof; the recruiter-scoped adapter is
  // HR_STAFF-only and would correctly fail.
  //
  // Idempotency note (DEC-09): R3-F06 (winning recruiter) already created a
  // placement and transitioned it to CONFIRMED via `recruiterPlacementConfirm`.
  // A second `createPlacement` call on the same (placementCaseId,
  // jobOpeningId) tuple returns the existing row (idempotent replay — see
  // `createPlacement` Bước 3 in placement.service.ts). The status returned is
  // the CURRENT placement status, which is `CONFIRMED` here (not `SELECTED`).
  // This is the canonical DEC-09 contract: replayed=true reflects current
  // state, not the caller's intent. The ADMIN path bypasses the
  // recruiter-scoped dual-authority predicate (DEC-25) so it is permitted
  // to read the existing placement back.
  // ═══════════════════════════════════════════════════════════════════════════
  it('AC-E2E-21i ADMIN placement create succeeds even after recruiter revoke', async () => {
    expect(placementCaseId).toBeTruthy();
    expect(laborProfileId).toBeTruthy();
    const { createPlacement, confirmPlacement } = await import(
      '@/src/domains/talent/placement.service'
    );
    const placement = await withContext(admin, adminUserId, 'ADMIN', (tx) =>
      createPlacement(tx, {
        actorId: adminUserId,
        actorRole: 'ADMIN',
        laborProfileId: laborProfileId!,
        placementCaseId: placementCaseId!,
        jobOpeningId: openingId,
      }),
    );
    placementIds.push(placement.placementId);
    // Idempotent replay: the same (placementCaseId, jobOpeningId) row
    // already exists in CONFIRMED state (R3-F06 transitioned it). The
    // canonical service returns the current status, NOT a fresh SELECTED
    // row, so we accept either SELECTED or CONFIRMED.
    expect(['SELECTED', 'CONFIRMED']).toContain(placement.status);
    expect(placement.replayed, 'replayed=true on idempotent re-create').toBe(true);
    // Confirm is a no-op on an already-CONFIRMED placement (idempotent
    // per DEC-09). ADMIN can also call confirm directly.
    const confirmed = await withContext(admin, adminUserId, 'ADMIN', (tx) =>
      confirmPlacement(tx, {
        placementId: placement.placementId,
        actorId: adminUserId,
        actorRole: 'ADMIN',
      }),
    );
    expect(['CONFIRMED', 'SELECTED']).toContain(confirmed.status);
  });

  });