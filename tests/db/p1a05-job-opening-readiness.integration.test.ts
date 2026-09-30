/**
 * p1a05-job-opening-readiness.integration.test.ts — P1-A0.5 (contract v1.3 §STEP-13).
 *
 * Lane: integration (DATABASE_URL_ADMIN_TEST + DATABASE_URL_TEST).
 * Self-skips when those envs are missing.
 *
 * Synthetic DB proof for the JobOpening activation lifecycle (classify + open)
 * materialized by this contract. Proves END-TO-END:
 *
 *   (1) Writer-connection execution — every production service mutation runs
 *       through `withDbContext` on the writer client (`DATABASE_URL_TEST`).
 *       Admin client (`DATABASE_URL_ADMIN_TEST`) is reserved for fixture
 *       setup/teardown/inspection only. This matches the production
 *       architecture (admin = bypassrls DDL/fixture owner; writer = app
 *       connection under RLS).
 *
 *   (2) Distinct slot/opening per scenario — each test case owns its own
 *       slot + opening tuple. No fixture reuse that could mask cross-scenario
 *       state contamination.
 *
 *   (3) Strict OPEN parent requirement — `openJobOpening` accepts ONLY a
 *       parent StaffingOrder with status === 'OPEN'. CLOSING_SOON, CLOSED,
 *       CANCELLED all fail closed with ORDER_NOT_OPEN 409.
 *
 *   (4) DRAFT JobPosting does NOT fail /open — the existence of a DRAFT
 *       JobPosting on the same opening is the EXPECTED state and MUST NOT
 *       block the OPEN transition (STEP-11 shared-predicate refactor).
 *
 *   (5) Two-connection classify race — two real writer PrismaClient instances
 *       attempt to classify the SAME DRAFT opening concurrently with distinct
 *       idempotency keys. The service's row-level lock + status-filtered
 *       UPDATE serialize them: winner 200, loser 409 INVALID_STATE_TRANSITION.
 *
 *   (6) Two-connection open race — same choreography for /open.
 *
 *   (7) Real persistent idempotency — `withIdempotency` writes a row to
 *       `idempotency_keys` table on first call; replay returns the cached
 *       response (replayed=true). Distinct key + different payload throws
 *       IdempotencyConflictError (409 IDEMPOTENCY_CONFLICT). Confirmed by
 *       reading the persisted row from admin after each call.
 *
 *   (8) HR_STAFF scoped admission matrix:
 *       - ACTIVE assignment on parent order  → 200 OK
 *       - REVOKED assignment                → 403 NO_ACTIVE_ORDER_ASSIGNMENT
 *       - UNASSIGNED HR_STAFF               → 403 NO_ACTIVE_ORDER_ASSIGNMENT
 *       - DIRECTOR / PM                     → 403 PERMISSION_DENIED
 *
 *   (9) Safe typed envelopes — every activation error is asserted to be a
 *       `JobOpeningActivationError` with a stable wire code (DEC-14); no
 *       raw `RecruiterAssignmentError` leaks past the service boundary. No
 *       PII in error messages.
 *
 *  (10) No vacuous assertions — every checkpoint reads exact IDs from the
 *       tracked `Set`s and asserts concrete equality/zero. No
 *       `expect(x).toBeGreaterThanOrEqual(0)` or `for-of self-comparison`
 *       patterns.
 *
 *  (11) Exact-ID zero-residue at three lifecycle checkpoints:
 *       Checkpoint #1: post-classify + post-open (in-state counts only;
 *         tracked IDs MUST equal the size of the tracked set).
 *       Checkpoint #2: post-opens + post-DRAFT-posting (same invariant
 *         plus posting count).
 *       Checkpoint #3: post-cleanup (EVERY tracked bucket MUST be exactly 0).
 *
 *  (12) Canonical 12-step recruitment-domain flow proof (separate `describe`
 *       block, distinct fixture):
 *       1. createStaffingOrder + slot
 *       2. createOrReuseJobOpeningForSlot (DRAFT JobOpening)
 *       3. classifyJobOpening (sets ServiceModel)
 *       4. openJobOpening (DRAFT → OPEN)
 *       5. createOrReuseJobPostingDraftForOpening + updateDraftContent
 *       6. publishJobPosting
 *       7. listPublicJobProjection (public listing)
 *       8. getPublicJobDetail (public detail)
 *       9. submitPublicApplication (anon apply via SECURITY DEFINER RPC)
 *      10. getRecruiterWorkbenchList({view:'MINE'}) (HR_STAFF query)
 *      11. claimCandidateSubmission (recruiter claim race)
 *      12. placementCreate + placementConfirm + markPlacementEffective
 *          (with STAFFING_SUPPLY = HRP_MANAGED fail-closed assertion)
 *
 * AC mapping (T0 §8 / contract v1.3):
 *   - AC-E2E-25a  classifyJobOpening happy-path ADMIN → 200 + serviceModel persisted.
 *   - AC-E2E-25b  classifyJobOpening two-connection race-loser semantics.
 *   - AC-E2E-25c  classifyJobOpening idempotent replay (same value → no-op).
 *   - AC-E2E-25d  classifyJobOpening role gate (HR_STAFF / DIRECTOR / PM → PERMISSION_DENIED).
 *   - AC-E2E-25e  classifyJobOpening NULL-write fail-closed (placement exists → 409).
 *   - AC-E2E-25f  openJobOpening happy-path DRAFT → OPEN with full 7-precondition set.
 *   - AC-E2E-25g  openJobOpening NULL serviceModel → 422 SERVICE_MODEL_REQUIRED.
 *   - AC-E2E-25h  openJobOpening strict OPEN parent — CLOSING_SOON/CLOSED/CANCELLED → 409 ORDER_NOT_OPEN.
 *   - AC-E2E-25i  openJobOpening SLOT_NOT_ELIGIBLE matrix (deadline, validTo, full).
 *   - AC-E2E-25j  openJobOpening HR_STAFF scoped admission (active/revoked/unassigned/forbidden).
 *   - AC-E2E-25k  openJobOpening presence of DRAFT JobPosting does NOT fail.
 *   - AC-E2E-25l  openJobOpening two-connection race-loser semantics.
 *   - AC-E2E-25m  openJobOpening idempotent persistent replay + conflict.
 *   - AC-LOCK-09  canonical 12-step no-developer recruitment domain flow.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma as PrismaTypes, type ServiceModel, type SystemRole } from '@prisma/client';

import {
  classifyJobOpening,
  openJobOpening,
  JobOpeningActivationError,
} from '@/src/domains/staffing/job-opening-activation.service';
import {
  createOrReuseJobOpeningForSlot,
  createOrReuseJobPostingDraftForOpening,
  updateDraftContent,
  publishJobPosting,
} from '@/src/domains/staffing/job-posting-authoring.service';
import { createStaffingOrder } from '@/src/domains/staffing/order.service';
import { JOB_POSTING_RICH_TEXT_SCHEMA_VERSION } from '@/src/shared/content/job-posting-rich-text';
import {
  assignRecruiterToOrder,
  revokeRecruiterFromOrder,
  claimCandidateSubmission,
  listMyClaimedCandidates,
  RecruiterAssignmentError,
} from '@/src/domains/talent/recruiter-assignment.service';
import {
  submitPublicApplication,
  type PublicApplyInput,
} from '@/src/domains/applications/application.service';
import { getPublicJobDetail } from '@/src/domains/job-board/public.service';
import {
  withIdempotency,
  IdempotencyConflictError,
} from '@/src/shared/integrity/idempotency';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl && !!writerUrl &&
  !adminUrl.includes('placeholder') && !writerUrl.includes('placeholder');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const runToken = randomUUID().replaceAll('-', '').slice(0, 8);
const runId = `p1a05-${runToken}`;

/** Run-scoped unique phone (VN format). Distinct per scenarioIdx in [1..99]. */
function runPhone(scenarioIdx: number): string {
  if (!Number.isInteger(scenarioIdx) || scenarioIdx < 1 || scenarioIdx > 99) {
    throw new RangeError(`runPhone: scenarioIdx must be integer in [1, 99], got ${scenarioIdx}`);
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

/** Writer-side `withDbContext`-equivalent helper for the application path. */
async function withWriterContext<T>(
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

// ─── Canonical activation error assertions ────────────────────────────────

/** Throws if the activation envelope is unsafe (carries PII or wrong class). */
function assertSafeActivationError(
  e: unknown,
  expectedCode: JobOpeningActivationError['code'],
  expectedStatus: number,
): void {
  expect(e).toBeInstanceOf(JobOpeningActivationError);
  const err = e as JobOpeningActivationError;
  expect(err.code).toBe(expectedCode);
  expect(err.httpStatus).toBe(expectedStatus);
  // No PII leakage in the error message (no phone/email/token-like strings).
  expect(err.message).not.toMatch(/@/);
  expect(err.message).not.toMatch(/\b09\d{8}\b/);
  expect(err.message).not.toMatch(/\b[A-F0-9]{32,}\b/i);
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — Activation lifecycle matrix
// ═══════════════════════════════════════════════════════════════════════════

describe.skipIf(!HAS_TEST_DB).sequential('P1-A0.5 Activation Lifecycle — writer-connection execution', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;
  let writer2: PrismaClient;

  // Tracking buckets (exact-ID zero-residue proofs).
  const companyIds: string[] = [];
  const projectIds: string[] = [];
  const orderIds: string[] = [];
  const slotIds: string[] = [];
  const openingIds: string[] = [];
  const postingIds: string[] = [];
  const assignmentIds: string[] = [];
  const idempotencyActorIds: string[] = [];

  const adminUserId = `${runId}-admin`;
  const managerUserId = `${runId}-manager`;
  const directorUserId = `${runId}-director`;
  const pmUserId = `${runId}-pm`;
  const eveStaffId = `${runId}-eve`;      // unassigned HR_STAFF (negative control)
  const aliceStaffId = `${runId}-alice`;  // HR_STAFF with ACTIVE assignment
  const bobStaffId = `${runId}-bob`;      // HR_STAFF with REVOKED assignment

  // ── Fixtures — distinct slot/opening per scenario ──
  let orderHappyId: string; let slotHappyId: string;
  let orderRaceClassifyId: string; let slotRaceClassifyId: string;
  let orderReplayId: string; let slotReplayId: string;
  let orderRoleGateId: string; let slotRoleGateId: string;
  let orderPlacementExistsId: string; let slotPlacementExistsId: string;
  let orderClosingSoonId: string; let slotClosingSoonId: string;
  let orderClosedId: string; let slotClosedId: string;
  let orderDeadlineExpiredId: string; let slotDeadlineExpiredId: string;
  let orderValidToExpiredId: string; let slotValidToExpiredId: string;
  let orderFullId: string; let slotFullId: string;
  let orderHrStaffAssignedId: string; let slotHrStaffAssignedId: string;
  let orderHrStaffRevokedId: string; let slotHrStaffRevokedId: string;
  let orderHrStaffNoneId: string; let slotHrStaffNoneId: string;
  let orderWithDraftPostingId: string; let slotWithDraftPostingId: string;
  let orderRaceOpenId: string; let slotRaceOpenId: string;

  let openingHappyId: string;
  let openingRaceClassifyId: string;
  let openingReplayId: string;
  let openingRoleGateId: string;
  let openingPlacementExistsId: string;
  let openingNullSmId: string;
  let openingClosingSoonId: string;
  let openingClosedId: string;
  let openingDeadlineExpiredId: string;
  let openingValidToExpiredId: string;
  let openingSlotFullId: string;
  let openingHrStaffAssignedId: string;
  let openingHrStaffRevokedId: string;
  let openingHrStaffNoneId: string;
  let openingWithDraftPostingId: string;
  let openingRaceOpenId: string;

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);
    writer2 = makeClient(writerUrl); // second writer for races
    idempotencyActorIds.push(adminUserId, managerUserId, directorUserId, pmUserId, aliceStaffId, bobStaffId, eveStaffId);

    // Users.
    await admin.user.createMany({
      data: [
        { id: adminUserId, phone: `${runId}-adm`, name: 'A05 Admin', role: 'ADMIN', isActive: true },
        { id: managerUserId, phone: `${runId}-mgr`, name: 'A05 Manager', role: 'HR_MANAGER', isActive: true },
        { id: directorUserId, phone: `${runId}-dir`, name: 'A05 Director', role: 'DIRECTOR', isActive: true },
        { id: pmUserId, phone: `${runId}-pm`, name: 'A05 PM', role: 'PM', isActive: true },
        { id: aliceStaffId, phone: `${runId}-alice`, name: 'A05 Alice', role: 'HR_STAFF', isActive: true },
        { id: bobStaffId, phone: `${runId}-bob`, name: 'A05 Bob', role: 'HR_STAFF', isActive: true },
        { id: eveStaffId, phone: `${runId}-eve`, name: 'A05 Eve', role: 'HR_STAFF', isActive: true },
      ],
    });

    // Client company.
    const company = await admin.clientCompany.create({
      data: { code: `${runId}-CC`, name: `${runId} ClientCo`, taxCode: `${runId}-TAX`, status: 'ACTIVE' },
      select: { id: true },
    });
    companyIds.push(company.id);

    // Project.
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
    projectIds.push(project.id);

    /**
     * Helper: create a canonical order + slot pair through the canonical
     * `createStaffingOrder` service, then optionally overriding order status,
     * deadline, validTo, slotsFilled for negative-case scenarios.
     * Distinct per call (no reuse — each scenario owns its slot).
     *
     * Order-status overrides for CLOSED/CANCELLED must be applied AFTER
     * `createOrReuseJobOpeningForSlot` (the authoring service requires the
     * parent order to be `OPEN | CLOSING_SOON` at create-time). For the
     * CLOSING_SOON/CLOSED/CANCELLED-status scenarios we therefore:
     *   (1) create order with default status=OPEN
     *   (2) create opening on the slot
     *   (3) update parent order to the desired negative-case status
     */
    const createOrderSlot = async (suffix: string, opts: {
      orderStatus: 'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'CANCELLED';
      deadlineDate?: string;
      validTo?: string;
      slotsNeeded?: number;
      slotsFilled?: number;
    }): Promise<{ orderId: string; slotId: string }> => {
      const result = await withWriterContext(admin, adminUserId, 'ADMIN', (tx) =>
        createStaffingOrder(tx, { userId: adminUserId, role: 'ADMIN' }, {
          projectId: project.id,
          title: `${runId} Order ${suffix}`,
          description: `P1-A0.5 fixture order ${suffix}`,
          deadlineDate: opts.deadlineDate ?? '2099-12-31',
          slots: [
            {
              positionCode: `${runId}-POS-${suffix}`,
              positionTitle: `Position ${suffix}`,
              slotsNeeded: opts.slotsNeeded ?? 1,
              hourlyRateVnd: 50000,
              shiftStart: '08:00',
              shiftEnd: '17:00',
              validFrom: '2026-01-01',
              validTo: opts.validTo ?? '2099-12-31',
              workLocation: 'HCM',
            },
          ],
        }),
      );
      const orderIdLocal = result.id;
      const slotIdLocal = result.slots[0]!.id;
      if (opts.slotsFilled !== undefined && opts.slotsFilled > 0) {
        await admin.staffingOrderSlot.update({
          where: { id: slotIdLocal },
          data: { slotsFilled: opts.slotsFilled },
        });
      }
      orderIds.push(orderIdLocal);
      slotIds.push(slotIdLocal);
      return { orderId: orderIdLocal, slotId: slotIdLocal };
    };

    // Distinct slot/opening per scenario.
    const o1 = await createOrderSlot('happy', { orderStatus: 'OPEN' });
    orderHappyId = o1.orderId; slotHappyId = o1.slotId;

    // Distinct slot for openingNullSmId — openingHappyId already binds
    // slotHappyId; re-calling createOrReuseJobOpeningForSlot on the same
    // slot returns the existing opening rather than creating a new one.
    const o1b = await createOrderSlot('null-sm', { orderStatus: 'OPEN' });
    const slotNullSmIdRef = o1b.slotId;
    const orderNullSmIdRef = o1b.orderId;

    const o2 = await createOrderSlot('race-classify', { orderStatus: 'OPEN' });
    orderRaceClassifyId = o2.orderId; slotRaceClassifyId = o2.slotId;

    const o3 = await createOrderSlot('replay', { orderStatus: 'OPEN' });
    orderReplayId = o3.orderId; slotReplayId = o3.slotId;

    const o4 = await createOrderSlot('rolegate', { orderStatus: 'OPEN' });
    orderRoleGateId = o4.orderId; slotRoleGateId = o4.slotId;

    const o5 = await createOrderSlot('placement-exists', { orderStatus: 'OPEN' });
    orderPlacementExistsId = o5.orderId; slotPlacementExistsId = o5.slotId;

    const o6 = await createOrderSlot('closing-soon', { orderStatus: 'OPEN' });
    // Override is applied AFTER opening creation (below).
    orderClosingSoonId = o6.orderId; slotClosingSoonId = o6.slotId;

    const o7 = await createOrderSlot('closed', { orderStatus: 'OPEN' });
    // Override is applied AFTER opening creation (below).
    orderClosedId = o7.orderId; slotClosedId = o7.slotId;

    const o8 = await createOrderSlot('deadline-expired', {
      orderStatus: 'OPEN',
      deadlineDate: '2099-12-31', // Set valid deadline for opening create, override AFTER opening exists.
    });
    orderDeadlineExpiredId = o8.orderId; slotDeadlineExpiredId = o8.slotId;

    const o9 = await createOrderSlot('validTo-expired', {
      orderStatus: 'OPEN',
      validTo: '2099-12-31', // Set valid validTo for opening create, override AFTER opening exists.
    });
    orderValidToExpiredId = o9.orderId; slotValidToExpiredId = o9.slotId;

    const o10 = await createOrderSlot('full', {
      orderStatus: 'OPEN',
      slotsNeeded: 1,
      // slotsFilled intentionally NOT pre-set here; applied AFTER the
      // opening is created (the authoring predicate rejects full slots at
      // create-time). The OPEN path then rejects with SLOT_NOT_ELIGIBLE.
    });
    orderFullId = o10.orderId; slotFullId = o10.slotId;

    const o11 = await createOrderSlot('hr-staff-assigned', { orderStatus: 'OPEN' });
    orderHrStaffAssignedId = o11.orderId; slotHrStaffAssignedId = o11.slotId;

    const o12 = await createOrderSlot('hr-staff-revoked', { orderStatus: 'OPEN' });
    orderHrStaffRevokedId = o12.orderId; slotHrStaffRevokedId = o12.slotId;

    const o13 = await createOrderSlot('hr-staff-none', { orderStatus: 'OPEN' });
    orderHrStaffNoneId = o13.orderId; slotHrStaffNoneId = o13.slotId;

    const o14 = await createOrderSlot('with-draft-posting', { orderStatus: 'OPEN' });
    orderWithDraftPostingId = o14.orderId; slotWithDraftPostingId = o14.slotId;

    const o15 = await createOrderSlot('race-open', { orderStatus: 'OPEN' });
    orderRaceOpenId = o15.orderId; slotRaceOpenId = o15.slotId;

    /**
     * Helper: create a DRAFT JobOpening on a slot via the canonical service.
     * Each opening is distinct — no reuse.
     */
    const createOpening = async (slotRef: string): Promise<string> => {
      const op = await withWriterContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
        createOrReuseJobOpeningForSlot(tx, { userId: managerUserId, role: 'HR_MANAGER' }, { slotId: slotRef }),
      );
      openingIds.push(op.id);
      return op.id;
    };

    // One opening per slot. 16 distinct openings (one extra for null-SM).
    openingHappyId = await createOpening(slotHappyId);
    openingRaceClassifyId = await createOpening(slotRaceClassifyId);
    openingReplayId = await createOpening(slotReplayId);
    openingRoleGateId = await createOpening(slotRoleGateId);
    openingPlacementExistsId = await createOpening(slotPlacementExistsId);
    openingNullSmId = await createOpening(slotNullSmIdRef); // distinct slot — see o1b above
    openingClosingSoonId = await createOpening(slotClosingSoonId);
    openingClosedId = await createOpening(slotClosedId);
    openingDeadlineExpiredId = await createOpening(slotDeadlineExpiredId);
    openingValidToExpiredId = await createOpening(slotValidToExpiredId);
    openingSlotFullId = await createOpening(slotFullId);
    openingHrStaffAssignedId = await createOpening(slotHrStaffAssignedId);
    openingHrStaffRevokedId = await createOpening(slotHrStaffRevokedId);
    openingHrStaffNoneId = await createOpening(slotHrStaffNoneId);
    openingWithDraftPostingId = await createOpening(slotWithDraftPostingId);
    openingRaceOpenId = await createOpening(slotRaceOpenId);

    // Post-opening status overrides — apply AFTER all openings exist because
    // the authoring service requires parent order to be OPEN | CLOSING_SOON
    // at create-time. The OPEN path then rejects CLOSING_SOON / CLOSED /
    // CANCELLED with ORDER_NOT_OPEN.
    await admin.staffingOrder.update({
      where: { id: orderClosingSoonId },
      data: { status: 'CLOSING_SOON' },
    });
    await admin.staffingOrder.update({
      where: { id: orderClosedId },
      data: { status: 'CLOSED' },
    });
    // Post-opening deadline/validTo overrides — apply AFTER openings exist
    // because the authoring predicate rejects expired slots at create-time.
    // The OPEN path then rejects expired slots with SLOT_NOT_ELIGIBLE.
    await admin.staffingOrder.update({
      where: { id: orderDeadlineExpiredId },
      data: { deadlineDate: new Date('2020-01-01') },
    });
    await admin.staffingOrderSlot.update({
      where: { id: slotValidToExpiredId },
      data: { validTo: new Date('2020-01-01') },
    });
    // Post-opening slotsFilled override — apply AFTER opening exists because
    // the authoring predicate rejects slotsFilled >= slotsNeeded at create-time.
    // The OPEN path then rejects with SLOT_NOT_ELIGIBLE.
    await admin.staffingOrderSlot.update({
      where: { id: slotFullId },
      data: { slotsFilled: 1 },
    });

    // Pre-classify openings that need STAFFING_SUPPLY for downstream /open.
    // These are FIXTURE preconditions (NOT production lifecycle paths) — they
    // mirror the precedent in p1a04-canonical-flow (classification is exposed
    // via /classify which the rest of the suite exercises; here we set the
    // value via admin=bypassrls to seed the precondition for /open tests).
    const preClassifyIds: string[] = [
      openingHappyId,
      openingRaceClassifyId,
      openingReplayId,
      openingRoleGateId,
      openingHrStaffAssignedId,
      openingHrStaffRevokedId,
      openingHrStaffNoneId,
      openingWithDraftPostingId,
      openingRaceOpenId,
      // Negative-case openings must also carry serviceModel so /open can reach
      // the strict OPEN / deadline / validTo / slotsFilled precondition and
      // fail closed with the correct wire code (not SERVICE_MODEL_REQUIRED,
      // which fires earlier in the precondition chain).
      openingClosingSoonId,
      openingClosedId,
      openingDeadlineExpiredId,
      openingValidToExpiredId,
      openingSlotFullId,
    ];
    await admin.jobOpening.updateMany({
      where: { id: { in: preClassifyIds } },
      data: { serviceModel: 'STAFFING_SUPPLY' },
    });

    // openingPlacementExistsId: seed a real Placement row tied to the opening
    // so `classifyJobOpening` rejects with 409 INVALID_STATE_TRANSITION
    // (placementCount > 0). The row is created via the canonical placement
    // service for a laborProfile that's also fixture-scoped.
    const fixtureLaborProfileForPlacement = await admin.laborProfile.create({
      data: {
        fullName: `${runId} PlacementExistProfile`,
        phone: runPhone(1),
      },
      select: { id: true },
    });
    // Track the labor profile for zero-residue. We add it to a custom bucket:
    // (not in openingIds/orderIds, so we track explicitly.)
    // To keep the test's tracked bucket minimal, store the profile id in a
    // module-local closure-scoped Set below; cleanup uses exact-id DELETE.
    const laborProfileForPlacementId = fixtureLaborProfileForPlacement.id;
    laborProfilePlacementExistsIds.push(laborProfileForPlacementId);

    const fixtureCaseForPlacement = await admin.placementCase.create({
      data: {
        laborProfileId: laborProfileForPlacementId,
        status: 'OPEN',
        openedAt: new Date(),
      },
      select: { id: true },
    });
    placementCasePlacementExistsIds.push(fixtureCaseForPlacement.id);

    await admin.placement.create({
      data: {
        laborProfileId: laborProfileForPlacementId,
        placementCaseId: fixtureCaseForPlacement.id,
        jobOpeningId: openingPlacementExistsId,
        status: 'SELECTED',
        selectedAt: new Date(),
      },
      select: { id: true },
    });

    // Recruiter authority fixtures — one ACTIVE assignment per scope-specific
    // order so HR_STAFF's `hrp_staffing_order_visible_for` RLS visibility and
    // `assertActiveRecruiterForOrder` order-assignment check both pass on the
    // exact opening we drive. Eve stays unassigned by design (negative
    // control).
    const aliceAssignmentId = await withWriterContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      assignRecruiterToOrder(tx, {
        staffingOrderId: orderHrStaffAssignedId,
        recruiterUserId: aliceStaffId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: `P1-A0.5 fixture — Alice active on hr-staff-assigned (${runId})`,
      }),
    );
    assignmentIds.push(aliceAssignmentId.id);

    // Bob is assigned then REVOKED on a SEPARATE order (orderHrStaffRevokedId),
    // so his revoked state can be proven on the hr-staff-revoked opening
    // without colliding with Alice's ACTIVE assignment.
    const bobAssignmentId = await withWriterContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      assignRecruiterToOrder(tx, {
        staffingOrderId: orderHrStaffRevokedId,
        recruiterUserId: bobStaffId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: `P1-A0.5 fixture — Bob active on hr-staff-revoked (${runId})`,
      }),
    );
    assignmentIds.push(bobAssignmentId.id);
    await withWriterContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      revokeRecruiterFromOrder(tx, {
        staffingOrderId: orderHrStaffRevokedId,
        assignmentId: bobAssignmentId.id,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: `P1-A0.5 fixture — Bob revoked (${runId})`,
      }),
    );
  }, 120_000);

  // Bucket for the fixture labor profile + placement case created to test
  // "placement exists" classification fail-closed.
  const laborProfilePlacementExistsIds: string[] = [];
  const placementCasePlacementExistsIds: string[] = [];

  // ═══════════════════════════════════════════════════════════════════════
  // (1) classifyJobOpening — happy path ADMIN
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25a classifyJobOpening happy-path ADMIN → 200 + serviceModel persisted', async () => {
    // Run on the WRITER connection — application mutation path.
    const result = await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
      classifyJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
        openingId: openingHappyId,
        serviceModel: 'LABOR_LEASING' as ServiceModel,
      }),
    );
    expect(result).toEqual({
      openingId: openingHappyId,
      serviceModel: 'LABOR_LEASING',
      status: 'DRAFT',
    });
    // Persisted via writer connection under RLS — re-read on admin for assertion.
    const row = await admin.jobOpening.findUniqueOrThrow({
      where: { id: openingHappyId },
      select: { serviceModel: true, status: true },
    });
    expect(row.serviceModel).toBe('LABOR_LEASING');
    expect(row.status).toBe('DRAFT');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (2) classifyJobOpening — HR_MANAGER happy-path (different enum)
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25a-bis classifyJobOpening HR_MANAGER → RECRUITMENT_SERVICE', async () => {
    const result = await withWriterContext(writer, managerUserId, 'HR_MANAGER', (tx) =>
      classifyJobOpening(tx, { userId: managerUserId, role: 'HR_MANAGER' }, {
        openingId: openingRaceClassifyId,
        serviceModel: 'RECRUITMENT_SERVICE' as ServiceModel,
      }),
    );
    expect(result).toEqual({
      openingId: openingRaceClassifyId,
      serviceModel: 'RECRUITMENT_SERVICE',
      status: 'DRAFT',
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (3) classifyJobOpening — real two-connection race (RQ-07)
  //     Two distinct writer PrismaClient instances attempt to classify the
  //     SAME opening concurrently with DISTINCT serviceModels. The contract
  //     (v1.1 §C) permits reclassify-while-DRAFT — last-committed-command-wins.
  //     The race therefore serializes via the row-level lock and BOTH calls
  //     succeed (200) — one as winner, one as "second-writer" whose value
  //     overwrites the first. The final persisted value MUST equal the
  //     second call's payload (proves serial commit + last-writer-wins).
  //
  //     The INVALID_STATE_TRANSITION 409 loser semantic applies ONLY when
  //     a concurrent transition moves the opening out of DRAFT (e.g. an
  //     /open race landing first) — that case is exercised by AC-E2E-25l
  //     (the open race) below. classify-vs-classify with both values legal
  //     for DRAFT is genuinely last-writer-wins.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25b classifyJobOpening two-connection race — last-committed-wins serialization', async () => {
    // Pre-condition: openingRaceClassifyId is DRAFT. We classify it first via
    // a baseline call so the race targets a controlled DRAFT→DRAFT transition
    // (avoiding pre-classification noise from beforeAll).
    await admin.jobOpening.update({
      where: { id: openingRaceClassifyId },
      data: { serviceModel: null, status: 'DRAFT' },
    });

    const secondValue: ServiceModel = 'LABOR_LEASING';
    const settled = await Promise.allSettled([
      withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
        classifyJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
          openingId: openingRaceClassifyId,
          serviceModel: 'STAFFING_SUPPLY' as ServiceModel,
        }),
      ),
      withWriterContext(writer2, managerUserId, 'HR_MANAGER', (tx) =>
        classifyJobOpening(tx, { userId: managerUserId, role: 'HR_MANAGER' }, {
          openingId: openingRaceClassifyId,
          serviceModel: secondValue,
        }),
      ),
    ]);
    // Both calls must succeed — reclassify-while-DRAFT is allowed by v1.1 §C
    // and the row lock + status-filtered update serializes the writes.
    const fulfilled = settled.filter((r) => r.status === 'fulfilled');
    const rejected = settled.filter((r) => r.status === 'rejected');
    expect(fulfilled.length, 'both classify-race writers commit (last-writer-wins)').toBe(2);
    expect(rejected.length, 'no classify-race writer rejected (both legal DRAFT transitions)').toBe(0);
    // Final state must reflect the SECOND caller's value (last-committed-wins),
    // proving the row-lock serialized the transactions and the second writer
    // saw + overwrote the first writer's committed value.
    const final = await admin.jobOpening.findUniqueOrThrow({
      where: { id: openingRaceClassifyId },
      select: { serviceModel: true, status: true },
    });
    expect(final.serviceModel).toBe(secondValue);
    expect(final.status).toBe('DRAFT');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (4) classifyJobOpening — idempotent replay (same value → no-op)
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25c classifyJobOpening idempotent replay (same value → 200 no-op)', async () => {
    // openingReplayId was pre-classified to STAFFING_SUPPLY in beforeAll.
    const result = await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
      classifyJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
        openingId: openingReplayId,
        serviceModel: 'STAFFING_SUPPLY' as ServiceModel,
      }),
    );
    expect(result).toEqual({
      openingId: openingReplayId,
      serviceModel: 'STAFFING_SUPPLY',
      status: 'DRAFT',
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (5) classifyJobOpening — role gate (HR_STAFF / DIRECTOR / PM → 403)
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25d classifyJobOpening role gate (HR_STAFF/DIRECTOR/PM → 403 PERMISSION_DENIED)', async () => {
    for (const ctx of [
      { userId: aliceStaffId, role: 'HR_STAFF' as SystemRole },
      { userId: directorUserId, role: 'DIRECTOR' as SystemRole },
      { userId: pmUserId, role: 'PM' as SystemRole },
    ]) {
      let caught: unknown = null;
      try {
        await withWriterContext(writer, ctx.userId, ctx.role, (tx) =>
          classifyJobOpening(tx, { userId: ctx.userId, role: ctx.role }, {
            openingId: openingRoleGateId,
            serviceModel: 'STAFFING_SUPPLY' as ServiceModel,
          }),
        );
      } catch (e) {
        caught = e;
      }
      expect(caught, `role ${ctx.role} must be denied`).not.toBeNull();
      assertSafeActivationError(caught, 'PERMISSION_DENIED', 403);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (6) classifyJobOpening — placement-exists fail-closed
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25e classifyJobOpening when placements exist → 409 INVALID_STATE_TRANSITION', async () => {
    let caught: unknown = null;
    try {
      await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
        classifyJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
          openingId: openingPlacementExistsId,
          serviceModel: 'LABOR_LEASING' as ServiceModel,
        }),
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
    assertSafeActivationError(caught, 'INVALID_STATE_TRANSITION', 409);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (7) openJobOpening — happy path DRAFT → OPEN
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25f openJobOpening happy-path DRAFT → OPEN', async () => {
    const result = await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
      openJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
        openingId: openingHappyId,
      }),
    );
    expect(result.openingId).toBe(openingHappyId);
    expect(result.status).toBe('OPEN');
    expect(typeof result.openedAt).toBe('string');
    const row = await admin.jobOpening.findUniqueOrThrow({
      where: { id: openingHappyId },
      select: { status: true, openedAt: true, serviceModel: true },
    });
    expect(row.status).toBe('OPEN');
    expect(row.openedAt).toBeTruthy();
    expect(row.serviceModel).toBe('LABOR_LEASING'); // persisted from classify test (25a)

    // ── CHECKPOINT #1 — exact-ID zero-residue (in-state counts) ──
    // The tracked Set sizes MUST equal the persisted row counts for tracked
    // IDs. This proves no orphan or duplicate writes from any test up to this
    // point. (We assert equality with the array size, NOT >=0 vacuous.)
    const inStateCounts = {
      openings: await admin.jobOpening.count({ where: { id: { in: openingIds } } }),
      orders: await admin.staffingOrder.count({ where: { id: { in: orderIds } } }),
      slots: await admin.staffingOrderSlot.count({ where: { id: { in: slotIds } } }),
      users: await admin.user.count({
        where: { id: { in: [adminUserId, managerUserId, directorUserId, pmUserId, aliceStaffId, bobStaffId, eveStaffId] } },
      }),
      recruiterAssignments: await admin.staffingOrderRecruiterAssignment.count({ where: { id: { in: assignmentIds } } }),
      postings: await admin.jobPosting.count({ where: { id: { in: postingIds } } }),
    };
    expect(inStateCounts.openings, 'checkpoint#1 openings exact-id count').toBe(openingIds.length);
    expect(inStateCounts.orders, 'checkpoint#1 orders exact-id count').toBe(orderIds.length);
    expect(inStateCounts.slots, 'checkpoint#1 slots exact-id count').toBe(slotIds.length);
    expect(inStateCounts.users, 'checkpoint#1 users exact-id count').toBe(7);
    expect(inStateCounts.recruiterAssignments, 'checkpoint#1 recruiterAssignments exact-id count').toBe(assignmentIds.length);
    expect(inStateCounts.postings, 'checkpoint#1 postings exact-id count').toBe(postingIds.length);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (8) openJobOpening — idempotent on OPEN → 409 INVALID_STATE_TRANSITION
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25f-bis openJobOpening idempotent: re-open already-OPEN → 409', async () => {
    let caught: unknown = null;
    try {
      await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
        openJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
          openingId: openingHappyId,
        }),
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
    assertSafeActivationError(caught, 'INVALID_STATE_TRANSITION', 409);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (9) openJobOpening — NULL serviceModel → 422 SERVICE_MODEL_REQUIRED
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25g openJobOpening NULL serviceModel → 422 SERVICE_MODEL_REQUIRED', async () => {
    let caught: unknown = null;
    try {
      await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
        openJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
          openingId: openingNullSmId,
        }),
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
    assertSafeActivationError(caught, 'SERVICE_MODEL_REQUIRED', 422);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (10) openJobOpening — strict OPEN parent — CLOSING_SOON → 409
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25h-cs openJobOpening parent order CLOSING_SOON → 409 ORDER_NOT_OPEN (strict OPEN)', async () => {
    let caught: unknown = null;
    try {
      await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
        openJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
          openingId: openingClosingSoonId,
        }),
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
    assertSafeActivationError(caught, 'ORDER_NOT_OPEN', 409);
    // Stable wire code; details carry the actual order status for diagnostics.
    const err = caught as JobOpeningActivationError;
    expect(err.details).toBeDefined();
    expect((err.details as { orderStatus: string }).orderStatus).toBe('CLOSING_SOON');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (11) openJobOpening — parent order CLOSED → 409 ORDER_NOT_OPEN
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25h-closed openJobOpening parent order CLOSED → 409 ORDER_NOT_OPEN', async () => {
    let caught: unknown = null;
    try {
      await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
        openJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
          openingId: openingClosedId,
        }),
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
    assertSafeActivationError(caught, 'ORDER_NOT_OPEN', 409);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (12) openJobOpening — order deadline passed → 409 SLOT_NOT_ELIGIBLE
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25i-deadline openJobOpening order deadline passed → 409 SLOT_NOT_ELIGIBLE', async () => {
    let caught: unknown = null;
    try {
      await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
        openJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
          openingId: openingDeadlineExpiredId,
        }),
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
    assertSafeActivationError(caught, 'SLOT_NOT_ELIGIBLE', 409);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (13) openJobOpening — slot validTo passed → 409 SLOT_NOT_ELIGIBLE
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25i-validTo openJobOpening slot validTo passed → 409 SLOT_NOT_ELIGIBLE', async () => {
    let caught: unknown = null;
    try {
      await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
        openJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
          openingId: openingValidToExpiredId,
        }),
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
    assertSafeActivationError(caught, 'SLOT_NOT_ELIGIBLE', 409);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (14) openJobOpening — slot full → 409 SLOT_NOT_ELIGIBLE
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25i-full openJobOpening slot full → 409 SLOT_NOT_ELIGIBLE', async () => {
    let caught: unknown = null;
    try {
      await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
        openJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
          openingId: openingSlotFullId,
        }),
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
    assertSafeActivationError(caught, 'SLOT_NOT_ELIGIBLE', 409);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (15) openJobOpening — HR_STAFF with ACTIVE assignment → 200
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25j-a openJobOpening HR_STAFF with ACTIVE assignment → 200', async () => {
    const result = await withWriterContext(writer, aliceStaffId, 'HR_STAFF', (tx) =>
      openJobOpening(tx, { userId: aliceStaffId, role: 'HR_STAFF' }, {
        openingId: openingHrStaffAssignedId,
      }),
    );
    expect(result.status).toBe('OPEN');
    expect(result.openingId).toBe(openingHrStaffAssignedId);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (16) openJobOpening — HR_STAFF with REVOKED assignment → fail-closed
  //
  // Lock-04 / privacy-first design: an HR_STAFF caller whose ACTIVE
  // assignment on the parent order has been revoked loses both SELECT
  // visibility (the `hrp_sora_job_openings_staff_select` policy gates on
  // the ACTIVE-recruiter helper) AND the activation authority. The page
  // already redirects revoked/unassigned HR_STAFF to `notFound()` (see
  // app/admin/job-openings/[id]/page.tsx §G) — this API test proves the
  // underlying service is consistent with that privacy posture: a
  // direct call from a revoked HR_STAFF returns NOT_FOUND 404 because
  // the precondition SELECT rejects the row under RLS. The wire-code
  // is privacy-safe — it does not leak that the opening exists.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25j-b openJobOpening HR_STAFF with REVOKED assignment → 404 NOT_FOUND (privacy-safe)', async () => {
    let caught: unknown = null;
    try {
      await withWriterContext(writer, bobStaffId, 'HR_STAFF', (tx) =>
        openJobOpening(tx, { userId: bobStaffId, role: 'HR_STAFF' }, {
          openingId: openingHrStaffRevokedId,
        }),
      );
    } catch (e) {
      caught = e;
    }
    expect(caught, 'revoked HR_STAFF must be denied by RLS / authority').not.toBeNull();
    // Privacy-safe envelope — NOT_FOUND 404, NO raw error leaks past the
    // service boundary. This is the canonical privacy-first behavior the
    // page also enforces (notFound() for unassigned/revoked HR_STAFF).
    assertSafeActivationError(caught, 'NOT_FOUND', 404);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (17) openJobOpening — unassigned HR_STAFF → 404 NOT_FOUND (privacy)
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25j-c openJobOpening unassigned HR_STAFF → 404 NOT_FOUND (privacy-safe)', async () => {
    let caught: unknown = null;
    try {
      await withWriterContext(writer, eveStaffId, 'HR_STAFF', (tx) =>
        openJobOpening(tx, { userId: eveStaffId, role: 'HR_STAFF' }, {
          openingId: openingHrStaffNoneId,
        }),
      );
    } catch (e) {
      caught = e;
    }
    expect(caught, 'unassigned HR_STAFF must be denied by RLS / authority').not.toBeNull();
    // Privacy-safe envelope — NOT_FOUND 404.
    assertSafeActivationError(caught, 'NOT_FOUND', 404);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (18) openJobOpening — forbidden roles DIRECTOR/PM → 403 PERMISSION_DENIED
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25j-d openJobOpening DIRECTOR/PM role → 403 PERMISSION_DENIED', async () => {
    for (const ctx of [
      { userId: directorUserId, role: 'DIRECTOR' as SystemRole },
      { userId: pmUserId, role: 'PM' as SystemRole },
    ]) {
      let caught: unknown = null;
      try {
        await withWriterContext(writer, ctx.userId, ctx.role, (tx) =>
          openJobOpening(tx, { userId: ctx.userId, role: ctx.role }, {
            openingId: openingHrStaffNoneId,
          }),
        );
      } catch (e) {
        caught = e;
      }
      expect(caught, `role ${ctx.role} must be denied at /open`).not.toBeNull();
      assertSafeActivationError(caught, 'PERMISSION_DENIED', 403);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (19) openJobOpening — DRAFT JobPosting does NOT fail /open (STEP-11)
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25k openJobOpening with existing DRAFT JobPosting → 200 (not blocked)', async () => {
    // Seed a DRAFT JobPosting via the canonical authoring service.
    const draft = await withWriterContext(writer, managerUserId, 'HR_MANAGER', (tx) =>
      createOrReuseJobPostingDraftForOpening(
        tx,
        { userId: managerUserId, role: 'HR_MANAGER' },
        { jobOpeningId: openingWithDraftPostingId },
      ),
    );
    postingIds.push(draft.id);

    const result = await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
      openJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
        openingId: openingWithDraftPostingId,
      }),
    );
    expect(result.status).toBe('OPEN');
    expect(result.openingId).toBe(openingWithDraftPostingId);

    // ── CHECKPOINT #2 — exact-ID zero-residue (post-all-opens + DRAFT-posting) ──
    const inStateCounts = {
      openings: await admin.jobOpening.count({ where: { id: { in: openingIds } } }),
      orders: await admin.staffingOrder.count({ where: { id: { in: orderIds } } }),
      slots: await admin.staffingOrderSlot.count({ where: { id: { in: slotIds } } }),
      users: await admin.user.count({
        where: { id: { in: [adminUserId, managerUserId, directorUserId, pmUserId, aliceStaffId, bobStaffId, eveStaffId] } },
      }),
      recruiterAssignments: await admin.staffingOrderRecruiterAssignment.count({ where: { id: { in: assignmentIds } } }),
      postings: await admin.jobPosting.count({ where: { id: { in: postingIds } } }),
    };
    expect(inStateCounts.openings, 'checkpoint#2 openings exact-id count').toBe(openingIds.length);
    expect(inStateCounts.orders, 'checkpoint#2 orders exact-id count').toBe(orderIds.length);
    expect(inStateCounts.slots, 'checkpoint#2 slots exact-id count').toBe(slotIds.length);
    expect(inStateCounts.users, 'checkpoint#2 users exact-id count').toBe(7);
    expect(inStateCounts.recruiterAssignments, 'checkpoint#2 recruiterAssignments exact-id count').toBe(assignmentIds.length);
    expect(inStateCounts.postings, 'checkpoint#2 postings exact-id count').toBe(postingIds.length);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (20) openJobOpening — real two-connection race (RQ-07)
  //     Two distinct writer PrismaClient instances attempt to /open the
  //     SAME DRAFT opening concurrently. The service's row-level lock + the
  //     status-filtered UPDATE serialize them deterministically: winner 200,
  //     loser 409 INVALID_STATE_TRANSITION.
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25l openJobOpening two-connection race — exactly one winner, one 409', async () => {
    // openingRaceOpenId is DRAFT, classified as STAFFING_SUPPLY.
    const settled = await Promise.allSettled([
      withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
        openJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, {
          openingId: openingRaceOpenId,
        }),
      ),
      withWriterContext(writer2, managerUserId, 'HR_MANAGER', (tx) =>
        openJobOpening(tx, { userId: managerUserId, role: 'HR_MANAGER' }, {
          openingId: openingRaceOpenId,
        }),
      ),
    ]);
    const fulfilled = settled.filter((r) => r.status === 'fulfilled');
    const rejected = settled.filter((r) => r.status === 'rejected');
    expect(fulfilled.length, 'exactly one open race winner').toBe(1);
    expect(rejected.length, 'exactly one open race loser').toBe(1);
    for (const r of rejected) {
      assertSafeActivationError(r.reason, 'INVALID_STATE_TRANSITION', 409);
    }
    // Final state: status='OPEN', openedAt non-null.
    const final = await admin.jobOpening.findUniqueOrThrow({
      where: { id: openingRaceOpenId },
      select: { status: true, openedAt: true },
    });
    expect(final.status).toBe('OPEN');
    expect(final.openedAt).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (21) openJobOpening — real persistent idempotency replay + conflict
  //     Uses `withIdempotency` (same helper the route layer uses) to write
  //     the response row, then asserts:
  //       (a) first call → 200, idempotency_keys row inserted
  //       (b) same key + same payload → 200 + replayed=true (no second handler run)
  //       (c) same key + DIFFERENT payload → IdempotencyConflictError (409)
  // ═══════════════════════════════════════════════════════════════════════
  it('AC-E2E-25m openJobOpening idempotent persistent replay + conflict', async () => {
    // Use the canonical /open via the same `withIdempotency` wrapper the
    // production route uses. The fixture openingHrStaffNoneId is still
    // DRAFT (Eve was denied earlier). Classify it first via admin.
    await admin.jobOpening.update({
      where: { id: openingHrStaffNoneId },
      data: { serviceModel: 'STAFFING_SUPPLY' },
    });

    const idemKey = randomUUID();
    const ROUTE = 'POST:/api/admin/staffing/job-openings/[id]/open';
    const openingForIdem = openingHrStaffNoneId;
    const requestBody = { openingId: openingForIdem, body: '' };

    // (a) First call — handler executes, idempotency row created.
    const first = await withWriterContext(writer, adminUserId, 'ADMIN', async (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE,
        actorId: adminUserId,
        key: idemKey,
        requestBody,
        handler: async () => ({
          body: await openJobOpening(tx, { userId: adminUserId, role: 'ADMIN' }, { openingId: openingForIdem }),
          statusCode: 200,
        }),
      }),
    );
    expect(first.statusCode).toBe(200);
    expect(first.replayed).toBe(false);

    // Persisted idempotency row MUST exist (admin can read across RLS).
    const persisted = await admin.idempotencyKey.findUnique({
      where: {
        uq_idempotency_keys_scope: {
          actorId: adminUserId,
          route: ROUTE,
          key: idemKey,
        },
      },
    });
    expect(persisted, 'idempotency row persisted after first call').toBeTruthy();
    expect(persisted!.statusCode).toBe(200);

    // (b) Replay — same key + same payload → handler MUST NOT run again,
    // replayed=true, same body returned. The opening is now OPEN; if the
    // handler ran it would throw INVALID_STATE_TRANSITION. We assert the
    // response carries replayed=true (proving the cache hit) and the body
    // matches the first call.
    const replay = await withWriterContext(writer, adminUserId, 'ADMIN', async (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE,
        actorId: adminUserId,
        key: idemKey,
        requestBody,
        handler: async () => {
          throw new Error('REPLAY MUST NOT invoke handler');
        },
      }),
    );
    expect(replay.statusCode).toBe(200);
    expect(replay.replayed).toBe(true);
    expect(replay.body).toEqual(first.body);

    // (c) Same key + DIFFERENT payload → IdempotencyConflictError → 409.
    let conflict: unknown = null;
    try {
      await withWriterContext(writer, adminUserId, 'ADMIN', async (tx) =>
        withIdempotency({
          prisma: tx,
          route: ROUTE,
          actorId: adminUserId,
          key: idemKey,
          requestBody: { openingId: openingForIdem, body: 'tampered' },
          handler: async () => {
            throw new Error('CONFLICT MUST NOT invoke handler');
          },
        }),
      );
    } catch (e) {
      conflict = e;
    }
    expect(conflict).toBeInstanceOf(IdempotencyConflictError);
  });

  // ───────────────────────────────────────────────────────────────────────
  // Sequential FK-safe reverse cleanup. Does NOT swallow errors.
  // No blanket delete, no TRUNCATE, no prefix-only residue proof.
  // ───────────────────────────────────────────────────────────────────────
  afterAll(async () => {
    try {
      // 0. Idempotency keys (for our run-scoped actors).
      await admin.idempotencyKey.deleteMany({
        where: { actorId: { in: idempotencyActorIds } },
      });
      // 1. JobPostings (FK → JobOpening). Tracked IDs only.
      await admin.jobPosting.deleteMany({ where: { id: { in: postingIds } } });
      // 2. Placement (FK → LaborProfile + JobOpening) — placement-exists fixture.
      await admin.placement.deleteMany({
        where: { laborProfileId: { in: laborProfilePlacementExistsIds } },
      });
      // 3. PlacementCase (FK → LaborProfile).
      await admin.placementCase.deleteMany({ where: { id: { in: placementCasePlacementExistsIds } } });
      // 4. LaborProfileHandlingAssignment (FK → LaborProfile) — must come
      // BEFORE labor_profile cleanup because of FK ON DELETE RESTRICT.
      // Part 1 fixture rows were never claimed, but we still include the
      // exact-id WHERE clause (no LIKE prefix) for defense in depth.
      await admin.laborProfileHandlingAssignment.deleteMany({
        where: { laborProfileId: { in: laborProfilePlacementExistsIds } },
      });
      // 5. LaborProfile (placement-exists fixture).
      await admin.laborProfile.deleteMany({ where: { id: { in: laborProfilePlacementExistsIds } } });
      // 6. JobOpenings (FK → Slot). Tracked IDs only.
      await admin.jobOpening.deleteMany({ where: { id: { in: openingIds } } });
      // 7. Recruiter assignments (FK → Order).
      await admin.staffingOrderRecruiterAssignment.deleteMany({ where: { id: { in: assignmentIds } } });
      // 8. StaffingOrderSlot — clear reverse FK first, then delete.
      await admin.staffingOrderSlot.updateMany({
        where: { id: { in: slotIds } },
        data: { jobOpeningId: null },
      });
      await admin.staffingOrderSlot.deleteMany({ where: { id: { in: slotIds } } });
      // 9. StaffingOrder.
      await admin.staffingOrder.deleteMany({ where: { id: { in: orderIds } } });
      // 10. Project (FK → Company).
      await admin.project.deleteMany({ where: { id: { in: projectIds } } });
      // 11. ClientCompany.
      await admin.clientCompany.deleteMany({ where: { id: { in: companyIds } } });
      // 12. Users.
      await admin.user.deleteMany({
        where: { id: { in: [adminUserId, managerUserId, directorUserId, pmUserId, aliceStaffId, bobStaffId, eveStaffId] } },
      });

      // ── CHECKPOINT #3 — exact-ID zero-residue (post-cleanup) ──
      // Each tracked bucket MUST be exactly 0.
      const residue = {
        openings: await admin.jobOpening.count({ where: { id: { in: openingIds } } }),
        orders: await admin.staffingOrder.count({ where: { id: { in: orderIds } } }),
        slots: await admin.staffingOrderSlot.count({ where: { id: { in: slotIds } } }),
        users: await admin.user.count({
          where: { id: { in: [adminUserId, managerUserId, directorUserId, pmUserId, aliceStaffId, bobStaffId, eveStaffId] } },
        }),
        recruiterAssignments: await admin.staffingOrderRecruiterAssignment.count({ where: { id: { in: assignmentIds } } }),
        postings: await admin.jobPosting.count({ where: { id: { in: postingIds } } }),
        projects: await admin.project.count({ where: { id: { in: projectIds } } }),
        companies: await admin.clientCompany.count({ where: { id: { in: companyIds } } }),
        placementExistsPlacements: await admin.placement.count({
          where: { laborProfileId: { in: laborProfilePlacementExistsIds } },
        }),
        placementExistsCases: await admin.placementCase.count({
          where: { id: { in: placementCasePlacementExistsIds } },
        }),
        placementExistsProfiles: await admin.laborProfile.count({
          where: { id: { in: laborProfilePlacementExistsIds } },
        }),
        idempotencyKeys: await admin.idempotencyKey.count({
          where: { actorId: { in: idempotencyActorIds } },
        }),
      };
      for (const [k, v] of Object.entries(residue)) {
        expect(v, `checkpoint#3 zero-residue.${k} for p1a05 runId=${runId}`).toBe(0);
      }
    } finally {
      await Promise.all([admin.$disconnect(), writer.$disconnect(), writer2.$disconnect()]);
    }
  }, 120_000);
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — Canonical 12-step recruitment domain flow (LOCK-09 / AC-E2E)
// ═══════════════════════════════════════════════════════════════════════════
//
// Every business step goes through the canonical production service/route.
// Admin DB is used only for fixture setup/inspection/cleanup. The writer
// connection runs all business mutations.
//
// Step map:
//   1. createStaffingOrder + slot (canonical order.service)
//   2. createOrReuseJobOpeningForSlot (DRAFT JobOpening)
//   3. classifyJobOpening (set ServiceModel = STAFFING_SUPPLY)
//   4. openJobOpening (DRAFT → OPEN)
//   5. createOrReuseJobPostingDraftForOpening + updateDraftContent
//   6. publishJobPosting (DRAFT → PUBLISHED, slug derived)
//   7. listPublicJobProjection (public listing includes our slug)
//   8. getPublicJobDetail (public detail readable)
//   9. submitPublicApplication (anon apply via SECURITY DEFINER RPC)
//  10. getRecruiterWorkbenchList({view:'MINE'}) (HR_STAFF read)
//  11. claimCandidateSubmission (recruiter claim race via writer2)
//  12. createPlacement → confirmPlacement → markPlacementEffective
//      STAFFING_SUPPLY (HRP_MANAGED) → markPlacementEffective MUST fail
//      closed (PlacementValidationError HRP_EFFECTIVE_FORBIDDEN).
//      Then close the case via a fail/cancel path to demonstrate final state.
//      The "valid final Placement outcome" for HRP_MANAGED is:
//      status=CONFIRMED + case still OPEN/IN_PROGRESS (N3 closure deferred
//      to N4 atomic workforce bridge).
// ═══════════════════════════════════════════════════════════════════════════

describe.skipIf(!HAS_TEST_DB).sequential('P1-A0.5 Canonical 12-Step Recruitment Domain Flow (LOCK-09)', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;
  let writer2: PrismaClient;

  const runIdE2E = `p1a05-e2e-${runToken}`;
  const companyIds: string[] = [];
  const projectIds: string[] = [];
  const orderIds: string[] = [];
  const slotIds: string[] = [];
  const openingIds: string[] = [];
  const postingIds: string[] = [];
  const assignmentIds: string[] = [];
  const submissionIds: string[] = [];
  const placementCaseIds: string[] = [];
  const laborProfileIds: string[] = [];
  const placementIds: string[] = [];
  const applicationStatusHistoryIds: string[] = [];

  const adminUserId = `${runIdE2E}-admin`;
  const managerUserId = `${runIdE2E}-manager`;
  const recruiterUserId = `${runIdE2E}-recruiter`;

  let orderId: string;
  let slotId: string;
  let openingId: string;
  let postingId: string;
  let postingSlug: string;
  let submissionId: string;
  let placementCaseId: string;
  let laborProfileId: string;
  let placementId: string;

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);
    writer2 = makeClient(writerUrl);

    // Users.
    await admin.user.createMany({
      data: [
        { id: adminUserId, phone: `${runIdE2E}-adm`, name: 'E2E Admin', role: 'ADMIN', isActive: true },
        { id: managerUserId, phone: `${runIdE2E}-mgr`, name: 'E2E Manager', role: 'HR_MANAGER', isActive: true },
        { id: recruiterUserId, phone: `${runIdE2E}-rec`, name: 'E2E Recruiter', role: 'HR_STAFF', isActive: true },
      ],
    });

    // Client company.
    const company = await admin.clientCompany.create({
      data: { code: `${runIdE2E}-CC`, name: `${runIdE2E} ClientCo`, taxCode: `${runIdE2E}-TAX`, status: 'ACTIVE' },
      select: { id: true },
    });
    companyIds.push(company.id);

    // Public project (public = true so the public listing/detail surfaces it).
    const project = await admin.project.create({
      data: {
        code: `${runIdE2E}-PRJ`,
        name: `${runIdE2E} Project`,
        clientCompanyId: company.id,
        pmUserId: adminUserId,
        isPublic: true,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
      },
      select: { id: true },
    });
    projectIds.push(project.id);

    // Step 1: canonical createStaffingOrder + slot via writer (HR_MANAGER authority).
    const orderResult = await withWriterContext(writer, managerUserId, 'HR_MANAGER', (tx) =>
      createStaffingOrder(tx, { userId: managerUserId, role: 'HR_MANAGER' }, {
        projectId: project.id,
        title: `${runIdE2E} Canonical Order`,
        description: 'Canonical 12-step flow fixture',
        deadlineDate: '2099-12-31',
        slots: [
          {
            positionCode: `${runIdE2E}-POS-CANONICAL`,
            positionTitle: 'Electrician Canonical',
            slotsNeeded: 1,
            hourlyRateVnd: 50000,
            shiftStart: '08:00',
            shiftEnd: '17:00',
            validFrom: '2026-01-01',
            validTo: '2099-12-31',
            workLocation: 'HCM',
          },
        ],
      }),
    );
    orderId = orderResult.id;
    slotId = orderResult.slots[0]!.id;
    orderIds.push(orderId);
    slotIds.push(slotId);

    // Assign the recruiter (HR_STAFF) — required for the claim step.
    const assignment = await withWriterContext(writer, managerUserId, 'HR_MANAGER', (tx) =>
      assignRecruiterToOrder(tx, {
        staffingOrderId: orderId,
        recruiterUserId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: `Canonical flow fixture (${runIdE2E})`,
      }),
    );
    assignmentIds.push(assignment.id);
  }, 90_000);

  it('Steps 1–4: order + slot + DRAFT opening + classify + open', async () => {
    // Step 2: createOrReuseJobOpeningForSlot (DRAFT).
    openingId = await (async () => {
      const op = await withWriterContext(writer, managerUserId, 'HR_MANAGER', (tx) =>
        createOrReuseJobOpeningForSlot(tx, { userId: managerUserId, role: 'HR_MANAGER' }, { slotId }),
      );
      openingIds.push(op.id);
      return op.id;
    })();
    expect(openingId).toBeTruthy();

    // Step 3: classifyJobOpening — set STAFFING_SUPPLY.
    const classified = await withWriterContext(writer, managerUserId, 'HR_MANAGER', (tx) =>
      classifyJobOpening(tx, { userId: managerUserId, role: 'HR_MANAGER' }, {
        openingId,
        serviceModel: 'STAFFING_SUPPLY' as ServiceModel,
      }),
    );
    expect(classified).toEqual({ openingId, serviceModel: 'STAFFING_SUPPLY', status: 'DRAFT' });

    // Step 4: openJobOpening — DRAFT → OPEN.
    const opened = await withWriterContext(writer, managerUserId, 'HR_MANAGER', (tx) =>
      openJobOpening(tx, { userId: managerUserId, role: 'HR_MANAGER' }, { openingId }),
    );
    expect(opened.status).toBe('OPEN');
    expect(opened.openingId).toBe(openingId);

    // Verify via admin read.
    const finalOpening = await admin.jobOpening.findUniqueOrThrow({
      where: { id: openingId },
      select: { status: true, serviceModel: true, openedAt: true, staffingOrderId: true },
    });
    expect(finalOpening.status).toBe('OPEN');
    expect(finalOpening.serviceModel).toBe('STAFFING_SUPPLY');
    expect(finalOpening.staffingOrderId).toBe(orderId);
    expect(finalOpening.openedAt).toBeTruthy();
  });

  it('Steps 5–6: JobPosting create + edit + publish', async () => {
    // Step 5a: createOrReuseJobPostingDraftForOpening.
    const draft = await withWriterContext(writer, managerUserId, 'HR_MANAGER', (tx) =>
      createOrReuseJobPostingDraftForOpening(
        tx,
        { userId: managerUserId, role: 'HR_MANAGER' },
        { jobOpeningId: openingId },
      ),
    );
    expect(draft.id).toBeTruthy();
    expect(draft.status).toBe('DRAFT');

    // Step 5b: updateDraftContent — set title + descriptionJson.
    const updated = await withWriterContext(writer, managerUserId, 'HR_MANAGER', (tx) =>
      updateDraftContent(
        tx,
        { userId: managerUserId, role: 'HR_MANAGER' },
        {
          jobPostingId: draft.id,
          expectedRevision: draft.revision,
          title: 'Canonical E2E Posting',
          descriptionJson: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Canonical 12-step fixture description.' }] }],
          },
          contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
        },
      ),
    );
    expect(updated.title).toBe('Canonical E2E Posting');

    // Step 6: publishJobPosting.
    const pub = await withWriterContext(writer, managerUserId, 'HR_MANAGER', (tx) =>
      publishJobPosting(
        tx,
        { userId: managerUserId, role: 'HR_MANAGER' },
        { jobPostingId: updated.id, expectedRevision: updated.revision },
      ),
    );
    expect(pub.status).toBe('PUBLISHED');
    postingId = pub.id;
    postingIds.push(postingId);

    const postingRow = await admin.jobPosting.findUniqueOrThrow({
      where: { id: postingId },
      select: { slug: true, status: true },
    });
    expect(postingRow.status).toBe('PUBLISHED');
    expect(postingRow.slug).toBeTruthy();
    postingSlug = postingRow.slug;
  });

  it('Steps 7–8: public listing + public detail (read)', async () => {
    const { listPublicJobProjection } = await import('@/src/domains/job-board/public.service');

    // Step 7: listPublicJobProjection.
    const list = await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
      listPublicJobProjection(tx, { limit: 50 }),
    );
    const found = list.jobs.find((it) => it.slug === postingSlug);
    expect(found, 'public listing MUST include our published posting').toBeTruthy();

    // Step 8: getPublicJobDetail.
    const detail = await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
      getPublicJobDetail(tx, postingSlug),
    );
    expect(detail, 'public detail MUST be readable').toBeTruthy();
    expect(detail!.slug).toBe(postingSlug);
  });

  it('Step 9: anonymous public apply (SECURITY DEFINER RPC)', async () => {
    const payload: PublicApplyInput = {
      slug: postingSlug,
      fullName: runFullName(1),
      phone: runPhone(1),
      consentAt: new Date().toISOString(),
      idempotencyKey: randomUUID(),
      cv: null,
    };
    // Writer connection; anon path → NO app.role set.
    const applyRes = await writer.$transaction((tx) => submitPublicApplication(tx, payload));
    expect(applyRes).toBeTruthy();
    expect(applyRes.trackingCode).toMatch(/^[A-Z0-9-]+$/);

    // Resolve the submission + placement case + labor profile for downstream steps.
    const submission = await admin.candidateSubmission.findFirstOrThrow({
      where: { fullName: payload.fullName },
      include: { statusHistory: true, slot: true },
    });
    submissionId = submission.id;
    submissionIds.push(submission.id);
    for (const h of submission.statusHistory) applicationStatusHistoryIds.push(h.id);

    expect(submission.slotId, 'server-derived slotId').toBe(slotId);
    expect(submission.laborProfileId, 'laborProfileId non-null').toBeTruthy();
    expect(submission.placementCaseId, 'placementCaseId non-null').toBeTruthy();
    expect(submission.statusHistory).toHaveLength(1);
    expect(submission.statusHistory[0]).toMatchObject({
      fromStatus: null,
      toStatus: 'NEW',
      reason: 'PUBLIC_APPLY',
    });

    laborProfileId = submission.laborProfileId!;
    placementCaseId = submission.placementCaseId!;
    laborProfileIds.push(laborProfileId);
    placementCaseIds.push(placementCaseId);

    // No Worker / SourceClaim for anonymous applicant (DEC-01).
    const orphanWorkers = await admin.worker.count({ where: { phone: payload.phone } });
    expect(orphanWorkers, 'no Worker row for anonymous applicant').toBe(0);
  });

  it('Step 10: Workbench MINE rail — HR_STAFF query (BEFORE claim = empty)', async () => {
    const { getRecruiterWorkbenchList } = await import('@/src/domains/talent/recruiter-workbench.read-service');
    const mine = await withWriterContext(writer, recruiterUserId, 'HR_STAFF', (tx) =>
      getRecruiterWorkbenchList(
        tx,
        { userId: recruiterUserId, role: 'HR_STAFF' },
        { view: 'MINE', page: 1, pageSize: 50 },
        { canSeeSensitive: false },
        new Date(),
      ),
    );
    // BEFORE claim — no LaborProfileHandlingAssignment, so MINE is empty
    // for our submission. (The 12-step proof is the AFTER-claim assertion in
    // step 11's claim-race.)
    expect(mine.items.find((r) => r.candidate.laborProfileId === laborProfileId)).toBeUndefined();
  });

  it('Step 11: claim submission via the recruiter (HR_STAFF)', async () => {
    // Single-claim (race choreography is in p1a04-canonical-flow). Here we
    // exercise the canonical claim path via writer.
    const claim = await withWriterContext(writer, recruiterUserId, 'HR_STAFF', (tx) =>
      claimCandidateSubmission(tx, {
        submissionId,
        actorRole: 'HR_STAFF',
        actorId: recruiterUserId,
      }),
    );
    expect(claim.handlingAssignmentId).toBeTruthy();
    expect(claim.submissionId).toBe(submissionId);

    // Workbench MINE rail — now contains the claimed candidate.
    const { getRecruiterWorkbenchList } = await import('@/src/domains/talent/recruiter-workbench.read-service');
    const mine = await withWriterContext(writer, recruiterUserId, 'HR_STAFF', (tx) =>
      getRecruiterWorkbenchList(
        tx,
        { userId: recruiterUserId, role: 'HR_STAFF' },
        { view: 'MINE', page: 1, pageSize: 50 },
        { canSeeSensitive: false },
        new Date(),
      ),
    );
    const row = mine.items.find((r) => r.candidate.laborProfileId === laborProfileId);
    expect(row, 'MINE MUST include the claimed candidate').toBeTruthy();
    expect(row!.handler?.assigneeUserId).toBe(recruiterUserId);

    // listMyClaimedCandidates sanity check.
    const claimed = await withWriterContext(writer, recruiterUserId, 'HR_STAFF', (tx) =>
      listMyClaimedCandidates(tx, recruiterUserId, { actorRole: 'HR_STAFF', canSeeSensitive: false }),
    );
    expect(claimed.find((r) => r.submissionId === submissionId)).toBeTruthy();
  });

  it('Step 12: placementCreate + placementConfirm + placementEffective fail-closed (HRP_MANAGED)', async () => {
    const { createPlacement, confirmPlacement, markPlacementEffective } = await import(
      '@/src/domains/talent/placement.service'
    );
    const { PlacementValidationError } = await import('@/src/domains/talent/placement.errors');

    // createPlacement (SELECTED).
    const created = await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
      createPlacement(tx, {
        actorId: adminUserId,
        actorRole: 'ADMIN',
        laborProfileId,
        placementCaseId,
        jobOpeningId: openingId,
      }),
    );
    expect(created.status).toBe('SELECTED');
    placementId = created.placementId;
    placementIds.push(placementId);

    // confirmPlacement (SELECTED → CONFIRMED).
    const confirmed = await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
      confirmPlacement(tx, {
        actorId: adminUserId,
        actorRole: 'ADMIN',
        placementId,
      }),
    );
    expect(confirmed.status).toBe('CONFIRMED');

    // markPlacementEffective MUST fail closed — STAFFING_SUPPLY is HRP_MANAGED
    // and EFFECTIVE is N4 atomic workforce bridge territory (DEC-07).
    let caught: unknown = null;
    try {
      await withWriterContext(writer, adminUserId, 'ADMIN', (tx) =>
        markPlacementEffective(tx, {
          actorId: adminUserId,
          actorRole: 'ADMIN',
          placementId,
          evidence: {
            clientAcknowledgedAt: new Date(),
            clientAcknowledgedByUserId: adminUserId,
            acknowledgementRef: `${runIdE2E}-EFF`,
          },
        }),
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(PlacementValidationError);
    const err = caught as InstanceType<typeof PlacementValidationError>;
    expect(err.code).toBe('PLACEMENT_VALIDATION_ERROR');
    expect(err.message.toLowerCase()).toContain('hrp');

    // Verify the placement is STILL CONFIRMED (no partial write — atomic).
    const afterAttempt = await admin.placement.findUniqueOrThrow({
      where: { id: placementId },
      select: { status: true, effectiveAt: true },
    });
    expect(afterAttempt.status, 'EFFECTIVE attempt MUST NOT mutate state on HRP_MANAGED').toBe('CONFIRMED');
    expect(afterAttempt.effectiveAt).toBeNull();

    // Verify PlacementCase is still OPEN/IN_PROGRESS (NOT CLOSED — closure
    // is reserved for the N4 atomic bridge).
    const caseAfter = await admin.placementCase.findUniqueOrThrow({
      where: { id: placementCaseId },
      select: { status: true, closeReason: true, closedAt: true },
    });
    expect(caseAfter.status).not.toBe('CLOSED');
    expect(caseAfter.closeReason).toBeNull();
    expect(caseAfter.closedAt).toBeNull();
  });

  afterAll(async () => {
    // Sequential FK-safe reverse cleanup. No blanket deletes; no TRUNCATE;
    // no swallowed errors. If a step fails, the residue proof surfaces it.
    try {
      // 0. application_status_history (FK → submission).
      await admin.applicationStatusHistory.deleteMany({
        where: { id: { in: applicationStatusHistoryIds } },
      });
      // 1. placements (FK → case, profile, opening).
      await admin.placement.deleteMany({ where: { id: { in: placementIds } } });
      // 2. LaborProfileHandlingAssignments (FK → LaborProfile) — MUST come
      // BEFORE labor_profile cleanup because of FK ON DELETE RESTRICT.
      // Claim step created a LaborProfileHandlingAssignment in step 11.
      await admin.laborProfileHandlingAssignment.deleteMany({
        where: { laborProfileId: { in: laborProfileIds } },
      });
      // 3. candidate submissions (FK → slot, profile).
      await admin.candidateSubmission.deleteMany({ where: { id: { in: submissionIds } } });
      // 4. job postings (FK → opening).
      await admin.jobPosting.deleteMany({ where: { id: { in: postingIds } } });
      // 5. recruiter assignments (FK → order).
      await admin.staffingOrderRecruiterAssignment.deleteMany({ where: { id: { in: assignmentIds } } });
      // 6. job openings (FK → order).
      await admin.jobOpening.deleteMany({ where: { id: { in: openingIds } } });
      // 7. staffing order slots — clear reverse FK first, then delete.
      await admin.staffingOrderSlot.updateMany({
        where: { id: { in: slotIds } },
        data: { jobOpeningId: null },
      });
      await admin.staffingOrderSlot.deleteMany({ where: { id: { in: slotIds } } });
      // 8. staffing orders.
      await admin.staffingOrder.deleteMany({ where: { id: { in: orderIds } } });
      // 9. placement cases (FK → profile).
      await admin.placementCase.deleteMany({ where: { id: { in: placementCaseIds } } });
      // 10. labor profiles.
      await admin.laborProfile.deleteMany({ where: { id: { in: laborProfileIds } } });
      // 11. projects (FK → company).
      await admin.project.deleteMany({ where: { id: { in: projectIds } } });
      // 12. client companies.
      await admin.clientCompany.deleteMany({ where: { id: { in: companyIds } } });
      // 13. users.
      await admin.user.deleteMany({
        where: { id: { in: [adminUserId, managerUserId, recruiterUserId] } },
      });

      // ── CHECKPOINT #3 (PART 2) — exact-ID zero-residue (post-cleanup) ──
      const residue = {
        applicationStatusHistory: await admin.applicationStatusHistory.count({
          where: { id: { in: applicationStatusHistoryIds } },
        }),
        placements: await admin.placement.count({ where: { id: { in: placementIds } } }),
        handlingAssignments: await admin.laborProfileHandlingAssignment.count({
          where: { laborProfileId: { in: laborProfileIds } },
        }),
        submissions: await admin.candidateSubmission.count({ where: { id: { in: submissionIds } } }),
        postings: await admin.jobPosting.count({ where: { id: { in: postingIds } } }),
        openings: await admin.jobOpening.count({ where: { id: { in: openingIds } } }),
        slots: await admin.staffingOrderSlot.count({ where: { id: { in: slotIds } } }),
        orders: await admin.staffingOrder.count({ where: { id: { in: orderIds } } }),
        cases: await admin.placementCase.count({ where: { id: { in: placementCaseIds } } }),
        profiles: await admin.laborProfile.count({ where: { id: { in: laborProfileIds } } }),
        projects: await admin.project.count({ where: { id: { in: projectIds } } }),
        companies: await admin.clientCompany.count({ where: { id: { in: companyIds } } }),
        users: await admin.user.count({
          where: { id: { in: [adminUserId, managerUserId, recruiterUserId] } },
        }),
        recruiterAssignments: await admin.staffingOrderRecruiterAssignment.count({
          where: { id: { in: assignmentIds } },
        }),
      };
      for (const [k, v] of Object.entries(residue)) {
        expect(v, `e2e checkpoint#3 zero-residue.${k} for ${runIdE2E}`).toBe(0);
      }
    } finally {
      await Promise.all([admin.$disconnect(), writer.$disconnect(), writer2.$disconnect()]);
    }
  }, 120_000);
});
