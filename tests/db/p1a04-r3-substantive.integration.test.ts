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
  recruiterPlacementCreate,
  recruiterPlacementConfirm,
  recruiterPlacementCancel,
} from '@/src/domains/talent/recruiter-placement.adapter';
import {
  createPlacement,
  confirmPlacement,
  cancelPlacement,
} from '@/src/domains/talent/placement.service';
import {
  createOrReuseJobOpeningForSlot,
  createOrReuseJobPostingDraftForOpening,
  updateDraftContent,
  publishJobPosting,
} from '@/src/domains/staffing/job-posting-authoring.service';
import {
  submitPublicApplication,
  type PublicApplyInput,
} from '@/src/domains/applications/application.service';
import { createStaffingOrder } from '@/src/domains/staffing/order.service';
import { JOB_POSTING_RICH_TEXT_SCHEMA_VERSION } from '@/src/shared/content/job-posting-rich-text';
import { getRecruiterWorkbenchList } from '@/src/domains/talent/recruiter-workbench.read-service';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { maskPhone } from '@/src/shared/privacy/mask';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl && !!writerUrl &&
  !adminUrl.includes('placeholder') && !writerUrl.includes('placeholder');

const runToken = randomUUID().replaceAll('-', '').slice(0, 12);
const runId = `p1a04-r3-${runToken}`;

// ─── C-06: run-scoped valid phone + fullName generators ─────────────────────────
//   format: "09" + 6 run-scoped decimal digits + 2 scenario-index digits
//   invariant: /^09\d{8}$/
//   indices 1..99; each fixture receives a different phone; no shared applicant
//   phone. Same invariant as `tests/db/p1a1-jobposting-public-apply.integration.test.ts`
//   and `tests/db/p1a04-canonical-flow.integration.test.ts`.
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
    // C-08 / F02 fixture pollution fix: each fixture has TWO independent
    // public-apply submissions (Alice's + Bob's) on the SAME opening+slot.
    // F02 COMMAND-FIRST runs the Alice path; F02 REVOKE-FIRST runs the Bob
    // path. They MUST NOT share a submission because `claimCandidateSubmission`
    // is one-winner-per-submission — sharing would let COMMAND-FIRST claim
    // Alice's LPHA and contaminate REVOKE-FIRST's Bob claim.
    submissionAlice: string;
    submissionBob: string;
    laborProfileAlice: string;
    laborProfileBob: string;
    placementCaseAlice: string;
    placementCaseBob: string;
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
    submissionHistoryIds: [] as string[],
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
    await admin.jobOpening.update({
      where: { id: openingId },
      data: { status: 'OPEN', openedAt: new Date(), serviceModel: 'STAFFING_SUPPLY' },
    });

    const postingId = await withContext(admin, managerUserId, 'HR_MANAGER', async (tx) => {
      const draft = await createOrReuseJobPostingDraftForOpening(tx, makeAuth(managerUserId, 'HR_MANAGER'), { jobOpeningId: openingId });
      // publishJobPosting requires `title` + `descriptionJson` on the draft
      // (validator fail-closed per `JOB_POSTING_NOT_PUBLISHABLE`). The DRAFT
      // created by `createOrReuseJobPostingDraftForOpening` carries only a
      // placeholder title and no rich content, so we set title + description
      // via the canonical `updateDraftContent` before publishing. Mirrors the
      // AC-08 publish-succeeds-when-JobOpening-OPEN precedent in
      // `tests/db/job-posting-authoring.integration.test.ts`.
      const updated = await updateDraftContent(
        tx,
        makeAuth(managerUserId, 'HR_MANAGER'),
        {
          jobPostingId: draft.id,
          expectedRevision: draft.revision,
          title: `R3 fixture ${idx} posting`,
          descriptionJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `R3 fixture ${idx} description.` }] }] },
          contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
        },
      );
      const pub = await publishJobPosting(tx, makeAuth(managerUserId, 'HR_MANAGER'), {
        jobPostingId: updated.id,
        expectedRevision: updated.revision,
      });
      setIds.postingIds.push(pub.id);
      return pub.id;
    });

    const postingRow = await admin.jobPosting.findUniqueOrThrow({
      where: { id: postingId },
      select: { slug: true },
    });

    // C-05: Use the canonical public RPC `submitPublicApplication` (calls
    // `hrp_public_apply_submission` SECURITY DEFINER, hrp_public_rpc owner).
    // The slot is server-derived from the published slug → JobPosting →
    // JobOpening → StaffingOrderSlot. The RPC populates CandidateSubmission +
    // LaborProfile + PlacementCase + ApplicationStatusHistory atomically. It
    // MUST NOT be replaced with the generic N1 intake writer (which does NOT
    // persist slotId/jobOpeningId and would not be reachable through the
    // canonical claimCandidateSubmission path).
    //
    // Writer connection: NO `withContext` — this is the anonymous path,
    // `app.role` MUST NOT be set to an authenticated role.
    //
    // C-08 / F02 fixture pollution fix: create TWO independent submissions on
    // the same opening (Alice's + Bob's). Each `runPhone(idx)` MUST be unique;
    // we pre-validate uniqueness in `beforeAll`. The shared openingId +
    // staffingOrderId lets both F02 COMMAND-FIRST (Alice) and F02 REVOKE-FIRST
    // (Bob) operate against the SAME order advisory lock surface — without
    // competing on the SAME submission's LPHA.
    const applyAlice: PublicApplyInput = {
      slug: postingRow.slug,
      fullName: runFullName(idx * 2 + 1),
      phone: runPhone(idx * 2 + 1),
      consentAt: new Date().toISOString(),
      idempotencyKey: randomUUID(),
      cv: null,
    };
    const applyBob: PublicApplyInput = {
      slug: postingRow.slug,
      fullName: runFullName(idx * 2 + 2),
      phone: runPhone(idx * 2 + 2),
      consentAt: new Date().toISOString(),
      idempotencyKey: randomUUID(),
      cv: null,
    };
    await writer.$transaction((tx) => submitPublicApplication(tx, applyAlice));
    await writer.$transaction((tx) => submitPublicApplication(tx, applyBob));

    // Resolve the created submissions by fullName (canonical-flow scoped
    // lookup pattern). Track history rows for teardown.
    const submissionAliceRow = await admin.candidateSubmission.findFirstOrThrow({
      where: { fullName: applyAlice.fullName },
      include: { statusHistory: true, slot: true },
    });
    const submissionBobRow = await admin.candidateSubmission.findFirstOrThrow({
      where: { fullName: applyBob.fullName },
      include: { statusHistory: true, slot: true },
    });
    for (const s of [submissionAliceRow, submissionBobRow]) {
      expect(s.slotId, 'server-derived slotId matches fixture slot').toBe(orderResult.slots[0]!.id);
      expect(s.laborProfileId, 'laborProfileId non-null').toBeTruthy();
      expect(s.placementCaseId, 'placementCaseId non-null').toBeTruthy();
      expect(s.statusHistory).toHaveLength(1);
      expect(s.statusHistory[0]).toMatchObject({
        fromStatus: null,
        toStatus: 'NEW',
        reason: 'PUBLIC_APPLY',
      });
      setIds.submissionIds.push(s.id);
      for (const h of s.statusHistory) setIds.submissionHistoryIds.push(h.id);
      setIds.laborProfileIds.push(s.laborProfileId!);
      setIds.placementCaseIds.push(s.placementCaseId!);
    }

    // C-06: no shared applicant phone. Each fixture uses a unique runPhone(idx).
    // The unique constraint is verified at beforeAll startup.

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
      submissionAlice: submissionAliceRow.id,
      submissionBob: submissionBobRow.id,
      laborProfileAlice: submissionAliceRow.laborProfileId!,
      laborProfileBob: submissionBobRow.laborProfileId!,
      placementCaseAlice: submissionAliceRow.placementCaseId!,
      placementCaseBob: submissionBobRow.placementCaseId!,
      placementId: '',
    };
  }

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);
    writer2 = makeClient(writerUrl);

    // C-06: validate uniqueness of every run-scoped phone we'll use across
    // the 6 fixture sets. Each fixture now creates 2 independent submissions
    // (Alice's + Bob's) → 12 phones total per run. Each phone must be distinct.
    const allPhones = [
      runPhone(1), runPhone(2), runPhone(3), runPhone(4),
      runPhone(5), runPhone(6), runPhone(7), runPhone(8),
      runPhone(9), runPhone(10), runPhone(11), runPhone(12),
    ];
    const uniquePhones = new Set(allPhones);
    if (uniquePhones.size !== allPhones.length) {
      throw new Error(`runPhone: collision in R3 substantive ${allPhones}`);
    }

    await admin.user.createMany({
      data: [
        { id: adminUserId, phone: `${runId}-adm`, name: 'R3 Admin', role: 'ADMIN' },
        { id: managerUserId, phone: `${runId}-mgr`, name: 'R3 Manager', role: 'HR_MANAGER' },
        { id: aliceId, phone: `${runId}-alice`, name: 'R3 Alice', role: 'HR_STAFF' },
        { id: bobId, phone: `${runId}-bob`, name: 'R3 Bob', role: 'HR_STAFF' },
        { id: eveId, phone: `${runId}-eve`, name: 'R3 Eve', role: 'HR_STAFF' },
      ],
    });

    // Fixture index allocation (C-08 fixture pollution fix):
    //   fixtureSets[0..2]: F02 COMMAND-FIRST (Alice) + F02 REVOKE-FIRST (Bob).
    //     Each fixture carries TWO submissions (Alice's + Bob's) so the two
    //     race orderings do NOT collide on the same LPHA.
    //   fixtureSets[3]:    F02 LIVE-OVERLAP alias (Alice).
    //   fixtureSets[4]:    F04 (Alice), F05 (Alice), F05-revoked (revoke Alice).
    //   fixtureSets[5]:    F05 negative-control orderId (fx2), F06 (Bob).
    // F02 MUST run BEFORE F05-revoked (which mutates the assignment state
    // on fixtureSets[0]). Separate fixture sets for F02 vs F04..F06
    // eliminates the assignment-state coupling.
    const F02_FIXTURE_COUNT = 4;
    const WORKBENCH_FIXTURE_COUNT = 2;
    const totalFixtures = F02_FIXTURE_COUNT + WORKBENCH_FIXTURE_COUNT;
    for (let i = 0; i < totalFixtures; i++) {
      fixtureSets.push(await buildFixtureSet(i));
    }
  }, 120_000);

  afterAll(async () => {
    // C-09: Reverse-FK zero-residue cleanup. Sequential `await` (no
    // `Promise.all`) to honor the FK hierarchy; only disconnects are run in
    // parallel. Idempotent: scoped by exact runId-derived IDs collected
    // during the run. Does NOT swallow errors — if a step fails, the test
    // surfaces the failure and `finally` still disconnects.
    //
    // Cleanup order:
    //   0. application_status_history (for tracked submissions) [C-09]
    //   1. placements (FK → case, profile, opening)
    //   2. candidate submissions (FK → slot, profile)
    //   3. job postings (FK → opening)
    //   4. recruiter assignments + handling assignments
    //   5. job openings (FK → order)
    //   6. staffing order slots (FK → order) — clear reverse FK first
    //   7. staffing orders
    //   8. placement cases (FK → profile)
    //   9. labor profiles
    //  10. projects (FK → company)
    //  11. client companies
    //  12. test users
    try {
      // 0. application_status_history (FK → submission).
      await admin.applicationStatusHistory.deleteMany({
        where: { id: { in: setIds.submissionHistoryIds } },
      });
      // 1. placements (FK → case, profile, opening).
      await admin.placement.deleteMany({ where: { id: { in: setIds.placementIds } } });
      // 2. candidate submissions (FK → slot, profile).
      await admin.candidateSubmission.deleteMany({ where: { id: { in: setIds.submissionIds } } });
      // 3. job postings (FK → opening).
      await admin.jobPosting.deleteMany({ where: { id: { in: setIds.postingIds } } });
      // 4. recruiter assignments + handling assignments (FK → order / profile).
      await admin.staffingOrderRecruiterAssignment.deleteMany({ where: { id: { in: setIds.assignmentIds } } });
      await admin.laborProfileHandlingAssignment.deleteMany({
        where: { laborProfileId: { in: setIds.laborProfileIds } },
      });
      // 5. job openings (FK → order).
      await admin.jobOpening.deleteMany({ where: { id: { in: setIds.openingIds } } });
      // 6. staffing order slots (FK → order). Clear reverse FK first.
      await admin.staffingOrderSlot.updateMany({
        where: { id: { in: setIds.slotIds } },
        data: { jobOpeningId: null },
      });
      await admin.staffingOrderSlot.deleteMany({ where: { id: { in: setIds.slotIds } } });
      // 7. staffing orders.
      await admin.staffingOrder.deleteMany({ where: { id: { in: setIds.orderIds } } });
      // 8. placement cases (FK → profile).
      await admin.placementCase.deleteMany({ where: { id: { in: setIds.placementCaseIds } } });
      // 9. labor profiles.
      await admin.laborProfile.deleteMany({ where: { id: { in: setIds.laborProfileIds } } });
      // 10. projects (FK → company).
      await admin.project.deleteMany({ where: { id: { in: setIds.projectIds } } });
      // 11. client companies.
      await admin.clientCompany.deleteMany({ where: { id: { in: setIds.companyIds } } });
      // 12. test users.
      await admin.user.deleteMany({
        where: { id: { in: [adminUserId, managerUserId, aliceId, bobId, eveId] } },
      });

      // C-10: Exact-ID zero-residue proof. Scoped to TRACKED IDs only (no
      // LIKE-prefix). Each count MUST be 0 for the row to be considered
      // clean. UUID-shaped IDs mean a LIKE-prefix check can pass even when
      // the actual run rows remain; exact-ID Prisma count is the only
      // substantive proof.
      const residue = {
        historyRows: await admin.applicationStatusHistory.count({
          where: { id: { in: setIds.submissionHistoryIds } },
        }),
        placements: await admin.placement.count({ where: { id: { in: setIds.placementIds } } }),
        submissions: await admin.candidateSubmission.count({
          where: { id: { in: setIds.submissionIds } },
        }),
        postings: await admin.jobPosting.count({ where: { id: { in: setIds.postingIds } } }),
        openings: await admin.jobOpening.count({ where: { id: { in: setIds.openingIds } } }),
        slots: await admin.staffingOrderSlot.count({ where: { id: { in: setIds.slotIds } } }),
        orders: await admin.staffingOrder.count({ where: { id: { in: setIds.orderIds } } }),
        cases: await admin.placementCase.count({
          where: { id: { in: setIds.placementCaseIds } },
        }),
        profiles: await admin.laborProfile.count({
          where: { id: { in: setIds.laborProfileIds } },
        }),
        projects: await admin.project.count({ where: { id: { in: setIds.projectIds } } }),
        companies: await admin.clientCompany.count({
          where: { id: { in: setIds.companyIds } },
        }),
        users: await admin.user.count({
          where: { id: { in: [adminUserId, managerUserId, aliceId, bobId, eveId] } },
        }),
        recruiterAssignments: await admin.staffingOrderRecruiterAssignment.count({
          where: { id: { in: setIds.assignmentIds } },
        }),
      };
      for (const [k, v] of Object.entries(residue)) {
        expect(v, `zero-residue.${k} for R3 substantive runId=${runId}`).toBe(0);
      }
    } finally {
      await Promise.all([admin.$disconnect(), writer.$disconnect(), writer2.$disconnect()]);
    }
  }, 120_000);

  // ═══════════════════════════════════════════════════════════════════════════
  // R3-F04 + R3-F05: Workbench MINE rail + F-05 contact boundary
  // ═══════════════════════════════════════════════════════════════════════════

  it('R3-F04 winner appears in canonical Workbench MINE rail after claim', async () => {
    const fx = fixtureSets[4]!;
    // Alice claims her submission on writer connection.
    // (C-08 / F02 fixture pollution fix: F04/F05 use the dedicated workbench
    // fixture set [4..5], not the F02 fixture set [0..3], so the F02 revoke
    // choreography and F05-revoked do not cross-contaminate the LPHA state.)
    await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
      claimCandidateSubmission(tx, {
        submissionId: fx.submissionAlice,
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
    const row = mine.items.find((r) => r.candidate.laborProfileId === fx.laborProfileAlice);
    expect(row).toBeTruthy();
    // The handler is alice.
    expect(row!.handler?.assigneeUserId).toBe(aliceId);

    // Bob (the loser who never claimed THIS submission) sees ZERO rows on
    // the canonical MINE rail for Alice's labor profile.
    const bobMine = await withContext(writer, bobId, 'HR_STAFF', (tx) =>
      getRecruiterWorkbenchList(
        tx,
        makeAuth(bobId, 'HR_STAFF'),
        { view: 'MINE', page: 1, pageSize: 50 },
        { canSeeSensitive: false },
        new Date(),
      ),
    );
    expect(bobMine.items.find((r) => r.candidate.laborProfileId === fx.laborProfileAlice)).toBeUndefined();

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
    expect(eveMine.items.find((r) => r.candidate.laborProfileId === fx.laborProfileAlice)).toBeUndefined();
  }, 60_000);

  it('R3-F05 winner full phone, loser/revoked/pre-claim MASKED; CCCD never exposed', async () => {
    const fx = fixtureSets[4]!;
    // Winner: Alice's MINE row carries the FULL phone because she is the
    // active handler with an active order assignment AND an active handling
    // assignment. Uses Alice's submission (not Bob's) so the F02 REVOKE-FIRST
    // run on the same fixture doesn't collide.
    const aliceMine = await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
      listMyClaimedCandidates(tx, aliceId, { actorRole: 'HR_STAFF', canSeeSensitive: false }),
    );
    const aliceRow = aliceMine.find((r) => r.submissionId === fx.submissionAlice);
    expect(aliceRow).toBeTruthy();
    // Full phone exposed.
    expect(aliceRow!.candidatePhone).toMatch(/^0[0-9]{9}$/);
    expect(aliceRow!.isActiveHandler).toBe(true);
    // Masked phone is always delivered.
    expect(aliceRow!.candidatePhoneMasked).toBe(maskPhone(aliceRow!.candidatePhone));
    // No CCCD or raw evidence on this surface.
    expect((aliceRow as any).candidateCccd).toBeUndefined();
    expect((aliceRow as any).candidateEvidence).toBeUndefined();

    // Pre-claim masked queue: a NON-ASSIGNED recruiter (Eve) MUST be denied
    // by the order-2 masked queue (server-side authority). Each fixture set
    // assigns Alice + Bob on the SAME order, so a recruiter assigned on
    // order 0 is ALSO assigned on order 1..3 — so the only true
    // non-assigned HR_STAFF actor we can use for the negative-control is
    // Eve, who is never assigned to any order.
    const fx2 = fixtureSets[5]!;
    let forbidden = false;
    try {
      await withContext(writer, eveId, 'HR_STAFF', (tx) =>
        listMaskedUnclaimedCandidatesForOrder(tx, fx2.orderId, eveId),
      );
    } catch (e) {
      if (e instanceof RecruiterAssignmentError) {
        forbidden = true;
        expect(e.code).toBe('NO_ACTIVE_ORDER_ASSIGNMENT');
      } else throw e;
    }
    expect(forbidden).toBe(true);
  }, 60_000);

  it('R3-F05-revoked after revoke the MINE row drops (RLS at DB row level) and placement create fails closed', async () => {
    const fx = fixtureSets[4]!;
    // Revoke Alice's order assignment. The LPHA remains ACTIVE — but the
    // candidate_submissions SELECT policy is gated on the slot's order
    // assignment being ACTIVE (`hrp_sora_candidate_submissions_staff_select`).
    // So after revoke, HR_STAFF sees ZERO rows on MINE — the contact-data
    // boundary is enforced at the DB row level, not at the unmask level.
    // (See AC-E2E-21d-revoked in canonical-flow for the same contract.)
    // Uses Alice's submission so it does NOT collide with F02 REVOKE-FIRST
    // (which revokes Bob on the same fixture).
    await withContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      revokeRecruiterFromOrder(tx, {
        staffingOrderId: fx.orderId,
        assignmentId: fx.assignmentAlice,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'R3-F05 revoke for boundary test',
      }),
    );
    const aliceAfterRevoke = await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
      listMyClaimedCandidates(tx, aliceId, { actorRole: 'HR_STAFF', canSeeSensitive: false }),
    );
    expect(
      aliceAfterRevoke.find((r) => r.submissionId === fx.submissionAlice),
      'revoked HR_STAFF sees zero rows on MINE (RLS at DB row level)',
    ).toBeUndefined();

    // C-08: placement create by Alice (revoked) MUST fail closed via the
    // canonical recruiter-scoped adapter (production path that mirrors
    // POST /api/admin/recruiter/placements). The adapter enforces dual
    // authority (BOTH order assignment AND handling claim) under the
    // canonical order advisory lock, and throws `RecruiterAssignmentError`
    // with NO_ACTIVE_ORDER_ASSIGNMENT/NO_ACTIVE_ASSIGNMENT for fail-closed.
    let denied = false;
    try {
      await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
        recruiterPlacementCreate(tx, {
          sourceCandidateSubmissionId: fx.submissionAlice,
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
  }, 60_000);

  // ═══════════════════════════════════════════════════════════════════════════
  // R3-F06: The WINNING RECRUITER (not ADMIN) completes the full placement
  // outcome. Bob is assigned to fixtureSet[1] and claims there, then
  // recruiterPlacementCreate + recruiterPlacementConfirm run with
  // actorRole='HR_STAFF' (not admin). Both commands succeed under the
  // dual-authority predicate.
  // ═══════════════════════════════════════════════════════════════════════════

  it('R3-F06 winning RECRUITER (HR_STAFF) completes Placement via recruiterPlacementCreate/Confirm', async () => {
    const fx = fixtureSets[5]!;
    // Bob claims Bob's submission on fixtureSet[1]. (C-08 fixture pollution
    // fix: each fixture has TWO submissions — Alice's and Bob's. F06 uses
    // Bob's so the LPHA belongs to Bob; otherwise the F02 REVOKE-FIRST path
    // on the same fixture would conflict.)
    const claim = await withContext(writer, bobId, 'HR_STAFF', (tx) =>
      claimCandidateSubmission(tx, {
        submissionId: fx.submissionBob,
        actorRole: 'HR_STAFF',
        actorId: bobId,
      }),
    );
    expect(claim.laborProfileId).toBe(fx.laborProfileBob);

    // C-08: Bob (HR_STAFF, not admin) creates the placement via the
    // production recruiter-scoped adapter. ADMIN/HR_MANAGER bypass is NOT
    // used here. Server-derives slot/order/case/laborProfile from the
    // submission ID — no client-supplied canonical IDs.
    const placement = await withContext(writer, bobId, 'HR_STAFF', (tx) =>
      recruiterPlacementCreate(tx, {
        sourceCandidateSubmissionId: fx.submissionBob,
        actorId: bobId,
        actorRole: 'HR_STAFF',
      }),
    );
    expect(placement.status).toBe('SELECTED');
    expect(placement.placementId).toBeTruthy();
    expect(placement.placementCaseId).toBe(fx.placementCaseBob);
    expect(placement.laborProfileId).toBe(fx.laborProfileBob);
    expect(placement.staffingOrderId).toBe(fx.orderId);
    expect(placement.jobOpeningId).toBe(fx.openingId);
    setIds.placementIds.push(placement.placementId);

    // C-08: Bob confirms via the recruiter-scoped transition adapter
    // (POST /api/admin/recruiter/placements/[id]/actions/confirm).
    const confirmed = await withContext(writer, bobId, 'HR_STAFF', (tx) =>
      recruiterPlacementConfirm(tx, {
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

    // Bob cancels it (terminal) to close out fixtureSet[1] via the
    // recruiter-scoped cancel adapter (C-08 — production path).
    const cancelled = await withContext(writer, bobId, 'HR_STAFF', (tx) =>
      recruiterPlacementCancel(tx, {
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
    submissionId: string,
    laborProfileId: string,
    placementCaseId: string,
    witnessClient: PrismaClient,
  ): Promise<{
    placementFinalStatus: string;
    assignmentFinalStatus: string;
    commandError: string | null;
    commandPid: number;
    revokePid: number;
    revokeBlockedObserved: boolean;
  }> {
    // Pre-create the placement via the lower-level service (`createPlacement`)
    // so the race is solely about the confirm transition + revoke lock
    // choreography — the F02 races intentionally probe the lock-contention
    // path, NOT the C-08 recruiter adapter (which is exercised by the F-06
    // no-developer E2E proof and would otherwise require a separate claim
    // step that contaminates the race window).
    //
    // Even the lower-level createPlacement enforces the F-02 dual-authority
    // predicate when actorRole='HR_STAFF' (order assignment + handling
    // assignment ACTIVE), so we MUST claim the submission on THIS fx
    // (not on a different fx) so the LPHA on this submission's laborProfileId
    // is ACTIVE for the actor. The canonical idempotent replay path applies.
    try {
      await withContext(writer, recruiterId, 'HR_STAFF', (tx) =>
        claimCandidateSubmission(tx, {
          submissionId,
          actorRole: 'HR_STAFF',
          actorId: recruiterId,
        }),
      );
    } catch (e) {
      // If the claim race already happened in a previous run on the same
      // fx (the LPHA is now ACTIVE on the OTHER actor), the canonical
      // service throws HANDLING_ALREADY_CLAIMED. We accept that and
      // continue — the test still exercises the lock choreography on the
      // same placement.
      if (!(e instanceof RecruiterAssignmentError)) throw e;
    }
    // Sanity check (debug): the JobOpening referenced by fx must still
    // exist (RLS on candidate_submissions makes some rows invisible, but
    // the OPENING itself is a separate table — we explicitly verify before
    // calling createPlacement).
    const openingRow = await admin.jobOpening.findUnique({ where: { id: fx.openingId }, select: { id: true, status: true } });
    if (!openingRow) {
      throw new Error(`FIXTURE_MISSING openingId=${fx.openingId} for fx order=${fx.orderId} submission=${submissionId}`);
    }
    const placementPre = await withContext(writer, recruiterId, 'HR_STAFF', (tx) =>
      createPlacement(tx, {
        actorId: recruiterId,
        actorRole: 'HR_STAFF',
        laborProfileId,
        placementCaseId,
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
    submissionId: string,
    laborProfileId: string,
    placementCaseId: string,
    witnessClient: PrismaClient,
  ): Promise<{
    placementFinalStatus: string;
    assignmentFinalStatus: string;
    commandError: string | null;
    commandErrorCode: string | null;
    revokePid: number;
    commandPid: number;
    commandBlockedObserved: boolean;
  }> {
    // See note in runCommandFirstRace — we MUST claim first so the dual-
    // authority predicate (lower-level createPlacement also enforces it for
    // actorRole='HR_STAFF') finds an ACTIVE LPHA on this submission's
    // laborProfileId. F02 REVOKE-FIRST uses Bob's submission on the same
    // fixture so COMMAND-FIRST's Alice LPHA does not collide.
    try {
      await withContext(writer, recruiterId, 'HR_STAFF', (tx) =>
        claimCandidateSubmission(tx, {
          submissionId,
          actorRole: 'HR_STAFF',
          actorId: recruiterId,
        }),
      );
    } catch (e) {
      if (!(e instanceof RecruiterAssignmentError)) throw e;
    }
    // Pre-create the placement via the lower-level service (`createPlacement`)
    // so the race is solely about the confirm transition + revoke lock
    // choreography — see note in runCommandFirstRace above.
    const placementPre = await withContext(writer, recruiterId, 'HR_STAFF', (tx) =>
      createPlacement(tx, {
        actorId: recruiterId,
        actorRole: 'HR_STAFF',
        laborProfileId,
        placementCaseId,
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
    let commandErrorCode: string | null = null;

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
        commandErrorCode = e instanceof RecruiterAssignmentError ? e.code : null;
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
      commandErrorCode,
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
    submissionId: string,
    laborProfileId: string,
    placementCaseId: string,
    witnessClient: PrismaClient,
  ): Promise<{
    placementFinalStatus: string;
    assignmentFinalStatus: string;
    commandError: string | null;
    revokeBlockedObserved: boolean;
  }> {
    const r = await runCommandFirstRace(fx, recruiterId, assignmentId, submissionId, laborProfileId, placementCaseId, witnessClient);
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
      const result = await runCommandFirstRace(
        fx, recruiterId, assignmentId,
        fx.submissionAlice, fx.laborProfileAlice, fx.placementCaseAlice,
        writer2,
      );
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
      // F02 REVOKE-FIRST uses Bob's submission so COMMAND-FIRST's Alice LPHA
      // does not pollute this run's dual-authority predicate.
      const result = await runRevokeFirstRace(
        fx, recruiterId, assignmentId,
        fx.submissionBob, fx.laborProfileBob, fx.placementCaseBob,
        writer2,
      );
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
      // Command MUST have failed closed. We assert on the canonical
      // `RecruiterAssignmentError.code` (the contractual surface) — NOT the
      // human message text, which is unstable across refactors.
      // The CODE MUST be exactly one of the two canonical fail-closed codes
      // (DEC-25 + F-02 / F-03).
      expect(result.commandErrorCode, `revoke-first run=${run} commandErrorCode MUST be set (got message: ${result.commandError})`).toBeTruthy();
      expect(
        result.commandErrorCode,
        `revoke-first run=${run} command must fail closed with NO_ACTIVE_ORDER_ASSIGNMENT or NO_ACTIVE_ASSIGNMENT`,
      ).toMatch(/^NO_ACTIVE_(ORDER_)?ASSIGNMENT$/);
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
    const result = await runLiveOverlapRace(
      fx, recruiterId, assignmentId,
      fx.submissionAlice, fx.laborProfileAlice, fx.placementCaseAlice,
      writer2,
    );
    expect(result.revokeBlockedObserved).toBe(true);
    expect(result.placementFinalStatus).toBe('CONFIRMED');
    expect(result.assignmentFinalStatus).toBe('REVOKED');
  }, 60_000);
});
