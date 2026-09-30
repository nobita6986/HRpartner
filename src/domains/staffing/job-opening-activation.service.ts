/**
 * job-opening-activation.service.ts — P1-A0.5 (canonical, contract v1.3 §STEP-01).
 *
 * Activation lifecycle for an existing JobOpening:
 *   - classifyJobOpening: ADMIN/HR_MANAGER sets ServiceModel (DRAFT only).
 *   - openJobOpening:     ADMIN/HR_MANAGER ∪ scoped HR_STAFF transitions
 *                         DRAFT → OPEN under the full 7-precondition set.
 *
 * Atomic + race-safe (RQ-07 / v1.1 §D):
 *   - SELECT ... FOR UPDATE on the JobOpening row.
 *   - UPDATE filtered by `status = 'DRAFT'`. A concurrent race between two
 *     distinct-key callers serializes on the row lock: exactly one 200,
 *     one 409 INVALID_STATE_TRANSITION (the loser sees status != DRAFT
 *     after the lock is acquired and the UPDATE filtered by DRAFT affects
 *     0 rows). Race on /classify while DRAFT → last-committed-command-wins
 *     (the contract explicitly allows reclassify while still DRAFT — v1.1 §C).
 *
 * Shared-predicate refactor (STEP-11):
 *   - `openableJobOpeningPredicateSql` (this service) does NOT include
 *     `NOT EXISTS job_postings`. The opening path is a separate state
 *     transition on the existing JobOpening; the existing DRAFT JobPosting
 *     is the EXPECTED state for a freshly-authored opening and MUST NOT
 *     fail `/open`.
 *   - The authoring selector (`eligibleSlotPredicateSql`) keeps the
 *     `NOT EXISTS job_postings` clause because authoring creates a NEW
 *     posting and must not collide with an existing one.
 *
 * Typed error (DEC-14, RQ-09): `JobOpeningActivationError` analog of the
 * codebase carryover pattern (`AdminApplicationError`, `ApplicationServiceError`,
 * `RecruiterAssignmentError`). Wire-stable JSON envelope:
 *   { error: <code>, message: <safeText>, details?: <safeFacts> }.
 *
 * No new dependencies.
 */
import { Prisma, ServiceModel, type SystemRole } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { assertClassifiedJobOpening } from '@/src/domains/talent/placement.resolution';
import { assertActiveRecruiterForOrder } from '@/src/domains/talent/recruiter-assignment.service';
import {
  eligibleSlotPredicateSql,
} from './job-posting-list.service';

// ─────────────────────────────────────────────────────────────────────────────
// Typed error class (DEC-14 canonical wire codes).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical error codes (RQ-09 / DEC-14). Stable wire contract.
 *
 *   400 INVALID_INPUT           — Zod failed; body / params rejected.
 *   400 IDEMPOTENCY_REQUIRED    — header Idempotency-Key missing or not UUID v4.
 *   403 PERMISSION_DENIED       — caller role outside the admission set AND not
 *                                 an HR_STAFF scoped candidate.
 *   403 NO_ACTIVE_ORDER_ASSIGNMENT — HR_STAFF caller without an ACTIVE
 *                                 StaffingOrderRecruiterAssignment on the
 *                                 parent StaffingOrder.
 *   404 NOT_FOUND               — JobOpening does not exist (privacy-safe).
 *   409 INVALID_STATE_TRANSITION — current status != DRAFT (race loser or
 *                                 already-OPEN caller).
 *   409 IDEMPOTENCY_CONFLICT    — same key + different payload.
 *   409 ORDER_NOT_OPEN          — parent StaffingOrder not OPEN/CLOSING_SOON.
 *   409 SLOT_NOT_ELIGIBLE       — slot / order deadline passed or full.
 *   422 SERVICE_MODEL_REQUIRED  — JobOpening DRAFT but `serviceModel` is NULL.
 */
export type JobOpeningActivationErrorCode =
  | 'INVALID_INPUT'
  | 'IDEMPOTENCY_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'NO_ACTIVE_ORDER_ASSIGNMENT'
  | 'NOT_FOUND'
  | 'INVALID_STATE_TRANSITION'
  | 'IDEMPOTENCY_CONFLICT'
  | 'ORDER_NOT_OPEN'
  | 'SLOT_NOT_ELIGIBLE'
  | 'SERVICE_MODEL_REQUIRED';

export class JobOpeningActivationError extends Error {
  constructor(
    public readonly code: JobOpeningActivationErrorCode,
    public readonly httpStatus: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'JobOpeningActivationError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — local copies of admin role gate to avoid coupling to specific
// other services that may evolve. ADMIN/HR_MANAGER = classify + open
// unconditional; HR_STAFF requires `assertActiveRecruiterForOrder` predicate.
// ─────────────────────────────────────────────────────────────────────────────

function isAdminOrHrManager(role: SystemRole): boolean {
  return role === 'ADMIN' || role === 'HR_MANAGER';
}

function assertClassifyRole(ctx: AuthContext): void {
  if (!isAdminOrHrManager(ctx.role)) {
    throw new JobOpeningActivationError(
      'PERMISSION_DENIED',
      403,
      `Role ${ctx.role} cannot classify JobOpening ServiceModel (ADMIN/HR_MANAGER only)`,
    );
  }
}

const SERVICE_MODEL_VALUES: ServiceModel[] = [
  'STAFFING_SUPPLY',
  'LABOR_LEASING',
  'RECRUITMENT_SERVICE',
  'REFERRAL_SERVICE',
];

function isValidServiceModel(v: unknown): v is ServiceModel {
  return typeof v === 'string' && (SERVICE_MODEL_VALUES as string[]).includes(v);
}

// ─────────────────────────────────────────────────────────────────────────────
// /classify — RQ-03 / RQ-04 (RQ-04 forbids NULL incoming write — v1.1 §C).
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassifyJobOpeningInput {
  openingId: string;
  /** Must be one of the 4 ServiceModel enums. NULL / missing / unknown → 400. */
  serviceModel: ServiceModel;
}

export interface ClassifyJobOpeningResult {
  openingId: string;
  serviceModel: ServiceModel;
  status: 'DRAFT';
}

/**
 * Classify the JobOpening's ServiceModel. ADMIN/HR_MANAGER only.
 *
 *   - Asserts `ctx.role ∈ {ADMIN, HR_MANAGER}` (RQ-04).
 *   - Asserts JobOpening exists (NOT_FOUND).
 *   - Asserts current status === 'DRAFT' (INVALID_STATE_TRANSITION 409).
 *   - Asserts `placementCount === 0` (defense in depth — placement fail-closed
 *     on NULL via DEC-10; if a Placement exists, classification is too late).
 *   - SELECT ... FOR UPDATE on the row, UPDATE filtered by `status = 'DRAFT'`.
 *   - If `serviceModel` was already set to the same value → idempotent
 *     replay (200 + same row, no change). v1.1 §C allows reclassify while
 *     DRAFT — the UPDATE filtered by DRAFT will replace the value; distinct
 *     keys racing last-committed-command-wins semantics.
 *
 * Returns the updated (or replayed) JobOpening's classification snapshot.
 */
export async function classifyJobOpening(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: ClassifyJobOpeningInput,
): Promise<ClassifyJobOpeningResult> {
  assertClassifyRole(ctx);

  if (!input.openingId || typeof input.openingId !== 'string') {
    throw new JobOpeningActivationError('INVALID_INPUT', 400, 'openingId is required');
  }
  if (!isValidServiceModel(input.serviceModel)) {
    throw new JobOpeningActivationError(
      'INVALID_INPUT',
      400,
      `serviceModel must be one of ${SERVICE_MODEL_VALUES.join(', ')} (got: ${String(input.serviceModel)})`,
    );
  }

  // Existence + current state. placementCount is computed at the same time so
  // we can fail-closed BEFORE acquiring the row lock.
  const opening = await tx.jobOpening.findUnique({
    where: { id: input.openingId },
    select: {
      id: true,
      status: true,
      serviceModel: true,
      _count: { select: { placements: true } },
    },
  });
  if (!opening) {
    throw new JobOpeningActivationError(
      'NOT_FOUND',
      404,
      `JobOpening ${input.openingId} not found`,
    );
  }
  if (opening.status !== 'DRAFT') {
    throw new JobOpeningActivationError(
      'INVALID_STATE_TRANSITION',
      409,
      `JobOpening ${input.openingId} is in status ${opening.status}; cannot classify (must be DRAFT)`,
      { currentStatus: opening.status },
    );
  }
  if (opening._count.placements > 0) {
    throw new JobOpeningActivationError(
      'INVALID_STATE_TRANSITION',
      409,
      `JobOpening ${input.openingId} already has ${opening._count.placements} Placement(s); cannot reclassify after placements exist`,
      { placementCount: opening._count.placements },
    );
  }

  // Idempotent replay — same value already persisted, no UPDATE.
  if (opening.serviceModel === input.serviceModel) {
    return {
      openingId: opening.id,
      serviceModel: opening.serviceModel,
      status: 'DRAFT',
    };
  }

  // Row lock + UPDATE filtered by status = 'DRAFT' so a concurrent winner
  // can't double-write or race-lose. If 0 rows update → INVALID_STATE_TRANSITION.
  const locked = await tx.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT id FROM job_openings WHERE id = ${input.openingId} FOR UPDATE`,
  );
  if (locked.length === 0) {
    throw new JobOpeningActivationError(
      'NOT_FOUND',
      404,
      `JobOpening ${input.openingId} disappeared during lock acquisition`,
    );
  }

  const updated = await tx.jobOpening.updateMany({
    where: { id: input.openingId, status: 'DRAFT' },
    data: { serviceModel: input.serviceModel },
  });
  if (updated.count === 0) {
    throw new JobOpeningActivationError(
      'INVALID_STATE_TRANSITION',
      409,
      `JobOpening ${input.openingId} is no longer DRAFT (concurrent change)`,
    );
  }

  return {
    openingId: input.openingId,
    serviceModel: input.serviceModel,
    status: 'DRAFT',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// /open — RQ-05 / RQ-06 (RQ-06 = full 7-precondition set, v1.1 §D).
// ─────────────────────────────────────────────────────────────────────────────

export interface OpenJobOpeningInput {
  openingId: string;
}

export interface OpenJobOpeningResult {
  openingId: string;
  status: 'OPEN';
  openedAt: string;
}

/**
 * Row shape used by the precondition checks. Contains everything the
 * service needs to make the 7-precondition decision without extra round-trips.
 */
interface OpeningPreconditionRow {
  id: string;
  staffing_order_id: string;
  staffing_order_slot_id: string | null;
  status: string;
  service_model: ServiceModel | null;
  /** StaffingOrder.status — current parent state. */
  order_status: string;
  /** StaffingOrder.deadlineDate — null or ISO date. */
  order_deadline_date: Date | null;
  /** StaffingOrderSlot.validTo — null or timestamp. */
  slot_valid_to: Date | null;
  slots_filled: number;
  slots_needed: number;
  /** Capacity/time/order canonical predicate (base, NO `NOT EXISTS job_postings`). */
  slot_is_eligible: boolean;
}

async function loadOpeningPreconditionRow(
  tx: Prisma.TransactionClient,
  openingId: string,
  now: Date,
): Promise<OpeningPreconditionRow | null> {
  const rows = await tx.$queryRaw<OpeningPreconditionRow[]>(Prisma.sql`
    SELECT
      jo.id,
      jo.staffing_order_id,
      jo.staffing_order_slot_id,
      jo.status,
      jo.service_model,
      so.status::text AS order_status,
      so.deadline_date AS order_deadline_date,
      s.valid_to AS slot_valid_to,
      s.slots_filled,
      s.slots_needed,
      (${eligibleSlotPredicateSql(now)}) AS slot_is_eligible
    FROM job_openings jo
    INNER JOIN staffing_orders so ON so.id = jo.staffing_order_id
    LEFT JOIN staffing_order_slots s ON s.id = jo.staffing_order_slot_id
    WHERE jo.id = ${openingId}
    FOR UPDATE OF jo
  `);
  return rows[0] ?? null;
}

/**
 * Open the JobOpening (DRAFT → OPEN) under the canonical 7-precondition set.
 *
 * Caller authority (RQ-06 / LOCK-04):
 *   - ADMIN / HR_MANAGER: unconditional access.
 *   - HR_STAFF: ONLY if `assertActiveRecruiterForOrder(tx, ctx.userId, ctx.role,
 *     opening.staffingOrderId)` returns clean. NO_ACTIVE_ORDER_ASSIGNMENT
 *     (403) otherwise.
 *   - Other roles: PERMISSION_DENIED (403).
 *
 * Preconditions (evaluated server-side, fail-closed):
 *   (a) status === 'DRAFT'                                → INVALID_STATE_TRANSITION (409)
 *   (b) serviceModel !== null                              → SERVICE_MODEL_REQUIRED (422)
 *   (c) parent StaffingOrder.status IN (OPEN, CLOSING_SOON) → ORDER_NOT_OPEN (409)
 *   (d) StaffingOrder.deadlineDate null OR >= now          → SLOT_NOT_ELIGIBLE (409)
 *   (e) StaffingOrderSlot.validTo null OR >= now           → SLOT_NOT_ELIGIBLE (409)
 *   (f) slotsFilled < slotsNeeded                          → SLOT_NOT_ELIGIBLE (409)
 *   (g) caller authority (handled by the role gate above)
 *
 * NOTE on (a): for `openJobOpening` we accept OPEN/CLOSING_SOON as the
 * parent order statuses; the parent must be ACTIVE. The atomic
 * JobOpening.status === 'DRAFT' guard is the row-state predicate; the
 * parent's `OPEN`/`CLOSING_SOON` status maps to ORDER_NOT_OPEN (409)
 * otherwise. This matches the SELECT FOR UPDATE raw SQL's pre-aggregation.
 *
 * Atomic + race-safe: row lock acquired in the precondition SELECT; UPDATE
 * filtered by `status = 'DRAFT'` + `opened_at = now()`. If 0 rows updated,
 * a concurrent distinct-key caller won the race — 409 INVALID_STATE_TRANSITION.
 *
 * Presence of a JobPosting DRAFT MUST NOT fail this call — the opening
 * predicate is the BASE capacity/time/order predicate (no
 * `NOT EXISTS job_postings`). See STEP-11 shared-predicate refactor.
 */
export async function openJobOpening(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: OpenJobOpeningInput,
): Promise<OpenJobOpeningResult> {
  if (!input.openingId || typeof input.openingId !== 'string') {
    throw new JobOpeningActivationError('INVALID_INPUT', 400, 'openingId is required');
  }

  // Caller authority gate (g).
  if (!isAdminOrHrManager(ctx.role) && ctx.role !== 'HR_STAFF') {
    throw new JobOpeningActivationError(
      'PERMISSION_DENIED',
      403,
      `Role ${ctx.role} cannot open JobOpening`,
    );
  }

  const now = new Date();
  const row = await loadOpeningPreconditionRow(tx, input.openingId, now);
  if (!row) {
    throw new JobOpeningActivationError(
      'NOT_FOUND',
      404,
      `JobOpening ${input.openingId} not found`,
    );
  }

  // (a) JobOpening state guard.
  if (row.status !== 'DRAFT') {
    throw new JobOpeningActivationError(
      'INVALID_STATE_TRANSITION',
      409,
      `JobOpening ${input.openingId} is in status ${row.status}; only DRAFT can be opened`,
      { currentStatus: row.status },
    );
  }

  // (b) NULL ServiceModel — typed 422 per RQ-06 / v1.2 §I-06 (mirrors the
  // CONSENT_REQUIRED 422 precedent in application.service). v1.1 §C forbids
  // NULL writes, but the OPENING path's NULL guard is its own typed error:
  // a request is syntactically valid (typed DRAFT opening exists, role
  // gate OK, idempotency OK) but the entity is unprocessable until
  // classified. We re-use the canonical `assertClassifiedJobOpening`
  // helper for the projection shape but throw a `JobOpeningActivationError`
  // here instead of `PlacementValidationError` (DEC-14: KHÔNG reuse
  // PlacementValidationError for JobOpening activation).
  if (row.service_model === null) {
    try {
      assertClassifiedJobOpening({
        id: row.id,
        staffingOrderId: row.staffing_order_id,
        serviceModel: row.service_model,
      });
      // assertClassifiedJobOpening threw, but if not — defensive fallthrough.
      throw new JobOpeningActivationError(
        'SERVICE_MODEL_REQUIRED',
        422,
        `JobOpening ${input.openingId} has no ServiceModel classified yet; classify before opening`,
      );
    } catch (err) {
      if (err instanceof JobOpeningActivationError) throw err;
      // assertClassifiedJobOpening threw PlacementValidationError — map to
      // SERVICE_MODEL_REQUIRED per DEC-14 / v1.1 §C.
      throw new JobOpeningActivationError(
        'SERVICE_MODEL_REQUIRED',
        422,
        `JobOpening ${input.openingId} has no ServiceModel classified yet; classify before opening`,
      );
    }
  }

  // HR_STAFF scoped authority check (g, second half) — needs the staffingOrderId
  // we just loaded. For ADMIN/HR_MANAGER this is a no-op bypass inside
  // assertActiveRecruiterForOrder.
  await assertActiveRecruiterForOrder(tx, ctx.userId, ctx.role, row.staffing_order_id);

  // (c) parent StaffingOrder.status ∈ {OPEN, CLOSING_SOON}.
  if (row.order_status !== 'OPEN' && row.order_status !== 'CLOSING_SOON') {
    throw new JobOpeningActivationError(
      'ORDER_NOT_OPEN',
      409,
      `StaffingOrder ${row.staffing_order_id} is not OPEN (status=${row.order_status})`,
      { orderStatus: row.order_status },
    );
  }

  // (d) (e) (f) — slot eligibility per the BASE predicate (no
  // `NOT EXISTS job_postings`). We re-derive (d), (e), (f) here to give a
  // stable wire code (`SLOT_NOT_ELIGIBLE` 409) and stable error message.
  if (row.order_deadline_date !== null && row.order_deadline_date < now) {
    throw new JobOpeningActivationError(
      'SLOT_NOT_ELIGIBLE',
      409,
      `StaffingOrder ${row.staffing_order_id} deadline has passed`,
      { deadlineDate: row.order_deadline_date.toISOString() },
    );
  }
  if (row.slot_valid_to !== null && row.slot_valid_to < now) {
    throw new JobOpeningActivationError(
      'SLOT_NOT_ELIGIBLE',
      409,
      `StaffingOrderSlot has expired (validTo < now)`,
      { validTo: row.slot_valid_to.toISOString() },
    );
  }
  if (row.slots_filled >= row.slots_needed) {
    throw new JobOpeningActivationError(
      'SLOT_NOT_ELIGIBLE',
      409,
      `StaffingOrderSlot is full (slotsFilled >= slotsNeeded)`,
      { slotsFilled: row.slots_filled, slotsNeeded: row.slots_needed },
    );
  }
  // Belt + suspenders: the SQL `is_eligible` (base capacity/time/order
  // predicate) must also be true. Defense in depth — should always agree
  // with the explicit (d)/(e)/(f) checks above.
  if (row.slot_is_eligible !== true) {
    throw new JobOpeningActivationError(
      'SLOT_NOT_ELIGIBLE',
      409,
      `StaffingOrderSlot fails canonical eligibility predicate`,
      { isEligible: row.slot_is_eligible },
    );
  }

  // Atomic DRAFT → OPEN transition. Filtered by `status = 'DRAFT'` so a
  // concurrent distinct-key caller that won the race yields count = 0
  // here → INVALID_STATE_TRANSITION 409.
  const updated = await tx.jobOpening.updateMany({
    where: { id: input.openingId, status: 'DRAFT' },
    data: { status: 'OPEN', openedAt: now },
  });
  if (updated.count === 0) {
    throw new JobOpeningActivationError(
      'INVALID_STATE_TRANSITION',
      409,
      `JobOpening ${input.openingId} is no longer DRAFT (concurrent change)`,
    );
  }

  return {
    openingId: input.openingId,
    status: 'OPEN',
    openedAt: now.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ServiceModel enum re-export — handy for routes / tests to avoid importing
// directly from @prisma/client.
// ─────────────────────────────────────────────────────────────────────────────

export const SERVICE_MODEL_ENUMS = SERVICE_MODEL_VALUES;
