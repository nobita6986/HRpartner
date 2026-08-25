/**
 * assignment-placement.service — MP-3C STEP-03/04/05 (RQ-02..RQ-07).
 *
 * Two operations on top of a CONVERTED CandidateSubmission:
 *
 *   previewPlacement()  — READ-ONLY advisory projection. Runs every preflight
 *                         check and returns a stable `conflicts[]` plus slot /
 *                         project counters. It writes NOTHING (DEC-03), so a
 *                         stale preview can never authorise anything.
 *   activatePlacement() — the command. Re-evaluates EVERY check inside the
 *                         caller's `withDbContext` transaction AFTER taking the
 *                         locks, in the mandated order (4.4):
 *                             worker advisory lock -> slot row lock -> checks -> writes
 *                         then creates exactly one ACTIVE assignment and moves
 *                         both denormalized counters exactly once, with audit +
 *                         outbox in the same transaction (RQ-07).
 *
 * Canonical-ID rule (DEC-01): the client supplies ONLY `submissionId` plus the
 * assignment attributes. workerId / slotId / staffingOrderId / projectId are
 * always derived server-side from the submission, never accepted from input.
 *
 * No network I/O after a lock (4.4): the CAN_OVERRIDE_REFERRAL_GUARD lookup
 * (`resolveEffectivePermissions` opens its own connection) is resolved BEFORE
 * the advisory lock and passed into the guard as a boolean.
 *
 * PII rule (4.3): projections carry IDs, statuses and counters only — never
 * phone / CCCD / rate / margin / internal source evidence.
 */
import { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { enqueueOutbox } from '@/src/shared/integrity/outbox';
import {
  applyOverride,
  describeBlockCode,
  evaluateReferralGuard,
  isOverrideCase,
  type GuardContext,
  type GuardResult,
  type OverrideCase,
  type ReferralSource,
} from './referral-guard.service';

// ─── Role boundary (DEC-04 / EV-08) ──────────────────────────────────────────
// RLS additionally permits DIRECTOR to write project_assignments; the MP-3 action
// boundary is narrower on purpose — the app gate is the authority, RLS is a floor.
export const PLACEMENT_ROLES: ReadonlySet<string> = new Set(['ADMIN', 'HR_MANAGER']);

export const EMPLOYMENT_TYPES = ['HRP_EMPLOYED', 'OUTSOURCED', 'REFERRED_OUT'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORK_SETTINGS = ['PHOTHONG', 'VANPHONG', 'CONGXUONG'] as const;
export type WorkSetting = (typeof WORK_SETTINGS)[number];

const MAX_EMPLOYEE_CODE = 64;
const AUDIT_ACTION = 'ASSIGNMENT_ACTIVATE';
const OUTBOX_EVENT = 'AssignmentActivated';

// ─── Errors ──────────────────────────────────────────────────────────────────

export type PlacementErrorCode =
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONVERSION_INVARIANT_BROKEN'
  | 'ASSIGNMENT_EXISTS'
  | 'SLOT_UNAVAILABLE'
  | 'PROJECT_QUOTA_FULL'
  | 'ACTIVE_ASSIGNMENT_CONFLICT'
  | 'EMPLOYEE_CODE_CONFLICT'
  | 'REFERRAL_GUARD_BLOCKED'
  | 'OVERRIDE_DENIED'
  | 'ASSIGNMENT_CONFLICT';

export class PlacementError extends Error {
  constructor(
    public readonly code: PlacementErrorCode,
    public readonly httpStatus: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PlacementError';
  }
}

/** Conflict codes that a preview can report (a subset of the error codes). */
export type PlacementConflictCode = Extract<
  PlacementErrorCode,
  | 'CONVERSION_INVARIANT_BROKEN'
  | 'ASSIGNMENT_EXISTS'
  | 'SLOT_UNAVAILABLE'
  | 'PROJECT_QUOTA_FULL'
  | 'ACTIVE_ASSIGNMENT_CONFLICT'
  | 'EMPLOYEE_CODE_CONFLICT'
  | 'REFERRAL_GUARD_BLOCKED'
>;

export interface PlacementConflict {
  code: PlacementConflictCode;
  message: string;
  /** Safe, non-PII metadata the UI can act on (IDs / counters / block codes). */
  details?: Record<string, unknown>;
  /** true when a permitted S1/S2/S3 override can clear this conflict. */
  overridable?: boolean;
}

// ─── Input / output contract (4.3) ───────────────────────────────────────────

export interface PlacementAttributes {
  submissionId: string;
  employeeCode: string;
  employmentType: string;
  workSetting?: string | null;
  validFrom: string;
  validTo?: string | null;
}

export interface OverrideRequest {
  overrideCase: string;
  reason: string;
  evidence?: string;
}

export interface ActivatePlacementInput extends PlacementAttributes {
  reason: string;
  override?: OverrideRequest | null;
  /**
   * Pre-resolved CAN_OVERRIDE_REFERRAL_GUARD. Supplied by the route so no
   * connection is opened after the lock (4.4). Resolved here when omitted.
   */
  hasOverridePermission?: boolean;
}

export interface SlotProjection {
  id: string;
  staffingOrderId: string;
  positionCode: string;
  positionTitle: string;
  slotsNeeded: number;
  slotsFilled: number;
  remaining: number;
  validFrom: Date;
  validTo: Date | null;
}

export interface OrderProjection {
  id: string;
  code: string;
  status: string;
}

export interface ProjectProjection {
  id: string;
  code: string;
  name: string;
  status: string;
  quota: number;
  filled: number;
  remaining: number;
}

export interface ActiveAssignmentSummary {
  assignmentId: string;
  projectId: string;
  staffingOrderId: string | null;
  employeeCode: string;
  validFrom: Date;
}

export interface ReferralGuardProjection {
  source: ReferralSource;
  blockCode: number;
  blockLabel: string;
  failedRules: string[];
  skippedRules: string[];
  overrideRequired: boolean;
}

export interface PlacementPreview {
  canActivate: boolean;
  submissionId: string;
  submissionStatus: string;
  workerId: string | null;
  sourceClaimId: string | null;
  source: ReferralSource;
  slot: SlotProjection | null;
  order: OrderProjection | null;
  project: ProjectProjection | null;
  existingActiveAssignment: ActiveAssignmentSummary | null;
  existingAssignmentForSubmission: { assignmentId: string; status: string } | null;
  referralGuard: ReferralGuardProjection | null;
  employeeCode: string;
  employmentType: string;
  workSetting: string | null;
  validFrom: string;
  validTo: string | null;
  conflicts: PlacementConflict[];
}

export interface ActivatePlacementResult {
  assignmentId: string;
  status: 'ACTIVE';
  submissionId: string;
  workerId: string;
  slotId: string;
  staffingOrderId: string | null;
  projectId: string;
  employeeCode: string;
  counters: {
    slotsFilled: number;
    slotsNeeded: number;
    projectFilled: number;
    projectQuota: number;
  };
  overrideApplied: boolean;
}

// ─── Validation (pure — no DB) ───────────────────────────────────────────────

export interface NormalizedAttributes {
  submissionId: string;
  employeeCode: string;
  employmentType: EmploymentType;
  workSetting: WorkSetting | null;
  validFrom: Date;
  validTo: Date | null;
}

/**
 * Shape/temporal validation only. `now` is injectable so tests are deterministic.
 * 4.4: the placement must be effective NOW — `validFrom <= now < validTo`.
 * Future-dated placement belongs to a scheduling task, not MP-3C.
 */
export function normalizePlacementAttributes(
  input: PlacementAttributes,
  now: Date = new Date(),
): NormalizedAttributes {
  const submissionId = (input.submissionId ?? '').trim();
  if (!submissionId) throw new PlacementError('VALIDATION', 400, 'submissionId is required');

  const employeeCode = (input.employeeCode ?? '').trim();
  if (!employeeCode) throw new PlacementError('VALIDATION', 400, 'employeeCode is required');
  if (employeeCode.length > MAX_EMPLOYEE_CODE) {
    throw new PlacementError('VALIDATION', 400, `employeeCode must be at most ${MAX_EMPLOYEE_CODE} characters`);
  }

  const employmentType = (input.employmentType ?? '').trim() as EmploymentType;
  if (!EMPLOYMENT_TYPES.includes(employmentType)) {
    throw new PlacementError('VALIDATION', 400, `employmentType must be one of ${EMPLOYMENT_TYPES.join(' | ')}`);
  }

  const rawWorkSetting = (input.workSetting ?? '') === '' ? null : String(input.workSetting).trim();
  if (rawWorkSetting !== null && !WORK_SETTINGS.includes(rawWorkSetting as WorkSetting)) {
    throw new PlacementError('VALIDATION', 400, `workSetting must be one of ${WORK_SETTINGS.join(' | ')}`);
  }

  const validFrom = parseTimestamp(input.validFrom, 'validFrom');
  const validTo = input.validTo ? parseTimestamp(input.validTo, 'validTo') : null;
  if (validTo && validTo.getTime() <= validFrom.getTime()) {
    throw new PlacementError('VALIDATION', 400, 'validTo must be after validFrom');
  }
  if (validFrom.getTime() > now.getTime()) {
    throw new PlacementError('VALIDATION', 400, 'validFrom must not be in the future (scheduling is out of scope)');
  }
  if (validTo && validTo.getTime() <= now.getTime()) {
    throw new PlacementError('VALIDATION', 400, 'validTo must be in the future — the placement must be active now');
  }

  return {
    submissionId,
    employeeCode,
    employmentType,
    workSetting: rawWorkSetting as WorkSetting | null,
    validFrom,
    validTo,
  };
}

function parseTimestamp(value: string | undefined | null, field: string): Date {
  const raw = (value ?? '').trim();
  if (!raw) throw new PlacementError('VALIDATION', 400, `${field} is required`);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new PlacementError('VALIDATION', 400, `${field} must be a valid ISO timestamp`);
  }
  return parsed;
}

export function assertPlacementRole(ctx: AuthContext): void {
  if (!PLACEMENT_ROLES.has(ctx.role)) {
    throw new PlacementError('FORBIDDEN', 403, `Role ${ctx.role} cannot preview or activate assignments`);
  }
}

/** Deterministic conflict ordering so UI and tests see a stable list. */
const CONFLICT_ORDER: readonly PlacementConflictCode[] = [
  'CONVERSION_INVARIANT_BROKEN',
  'ASSIGNMENT_EXISTS',
  'ACTIVE_ASSIGNMENT_CONFLICT',
  'SLOT_UNAVAILABLE',
  'PROJECT_QUOTA_FULL',
  'EMPLOYEE_CODE_CONFLICT',
  'REFERRAL_GUARD_BLOCKED',
];

export function sortConflicts(conflicts: PlacementConflict[]): PlacementConflict[] {
  return [...conflicts].sort((a, b) => CONFLICT_ORDER.indexOf(a.code) - CONFLICT_ORDER.indexOf(b.code));
}

const HTTP_FOR_CONFLICT: Readonly<Record<PlacementConflictCode, number>> = {
  CONVERSION_INVARIANT_BROKEN: 409,
  ASSIGNMENT_EXISTS: 409,
  ACTIVE_ASSIGNMENT_CONFLICT: 409,
  SLOT_UNAVAILABLE: 409,
  PROJECT_QUOTA_FULL: 409,
  EMPLOYEE_CODE_CONFLICT: 409,
  REFERRAL_GUARD_BLOCKED: 409,
};
// ─── Fact gathering (shared by preview and activate) ─────────────────────────

interface SubmissionFacts {
  id: string;
  status: string;
  workerId: string | null;
  slotId: string | null;
  vendorId: string | null;
  ctvId: string | null;
  acceptedClaimId: string | null;
}

interface PlacementFacts {
  submission: SubmissionFacts;
  slot: SlotProjection | null;
  order: OrderProjection | null;
  project: ProjectProjection | null;
  existingActive: ActiveAssignmentSummary | null;
  existingForSubmission: { assignmentId: string; status: string } | null;
  employeeCodeTaken: boolean;
  guard: GuardResult | null;
}

interface SlotRow {
  id: string;
  staffing_order_id: string;
  position_code: string;
  position_title: string;
  slots_needed: number;
  slots_filled: number;
  valid_from: Date;
  valid_to: Date | null;
}

async function readSubmission(
  tx: Prisma.TransactionClient,
  submissionId: string,
): Promise<SubmissionFacts> {
  const row = await tx.candidateSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true, status: true, workerId: true, slotId: true, vendorId: true, ctvId: true,
      sourceClaims: { where: { accepted: true }, select: { id: true, workerId: true } },
    },
  });
  if (!row) throw new PlacementError('NOT_FOUND', 404, 'Application not found');
  const accepted = row.sourceClaims.find((claim) => claim.workerId === row.workerId) ?? null;
  return {
    id: row.id,
    status: String(row.status),
    workerId: row.workerId ?? null,
    slotId: row.slotId ?? null,
    vendorId: row.vendorId ?? null,
    ctvId: row.ctvId ?? null,
    acceptedClaimId: accepted?.id ?? null,
  };
}

/** `lockRow` adds FOR UPDATE — used only inside the activation transaction. */
async function readSlot(
  tx: Prisma.TransactionClient,
  slotId: string,
  lockRow: boolean,
): Promise<SlotProjection | null> {
  const rows = await tx.$queryRawUnsafe<SlotRow[]>(
    `SELECT id, staffing_order_id, position_code, position_title,
            slots_needed, slots_filled, valid_from, valid_to
       FROM staffing_order_slots
      WHERE id = $1
      ${lockRow ? 'FOR UPDATE' : ''}`,
    slotId,
  );
  const row = rows[0];
  if (!row) return null;
  const slotsNeeded = Number(row.slots_needed);
  const slotsFilled = Number(row.slots_filled);
  return {
    id: row.id,
    staffingOrderId: row.staffing_order_id,
    positionCode: row.position_code,
    positionTitle: row.position_title,
    slotsNeeded,
    slotsFilled,
    remaining: Math.max(0, slotsNeeded - slotsFilled),
    validFrom: new Date(row.valid_from),
    validTo: row.valid_to ? new Date(row.valid_to) : null,
  };
}

async function gatherFacts(
  tx: Prisma.TransactionClient,
  attrs: NormalizedAttributes,
  opts: { lockSlot: boolean },
): Promise<PlacementFacts> {
  const submission = await readSubmission(tx, attrs.submissionId);

  const existingForSubmission = await tx.projectAssignment.findFirst({
    where: { submissionId: submission.id },
    select: { id: true, status: true },
  });

  const slot = submission.slotId ? await readSlot(tx, submission.slotId, opts.lockSlot) : null;

  let order: OrderProjection | null = null;
  let project: ProjectProjection | null = null;
  if (slot) {
    const orderRow = await tx.staffingOrder.findUnique({
      where: { id: slot.staffingOrderId },
      select: { id: true, code: true, status: true, projectId: true },
    });
    if (orderRow) {
      order = { id: orderRow.id, code: orderRow.code, status: orderRow.status };
      const projectRow = await tx.project.findUnique({
        where: { id: orderRow.projectId },
        select: { id: true, code: true, name: true, status: true, quota: true, filled: true },
      });
      if (projectRow) {
        project = {
          id: projectRow.id,
          code: projectRow.code,
          name: projectRow.name,
          status: projectRow.status,
          quota: projectRow.quota,
          filled: projectRow.filled,
          remaining: Math.max(0, projectRow.quota - projectRow.filled),
        };
      }
    }
  }

  let existingActive: ActiveAssignmentSummary | null = null;
  if (submission.workerId) {
    const active = await tx.projectAssignment.findFirst({
      where: { workerId: submission.workerId, status: 'ACTIVE' },
      select: { id: true, projectId: true, staffingOrderId: true, employeeCode: true, validFrom: true },
      orderBy: { validFrom: 'desc' },
    });
    if (active) {
      existingActive = {
        assignmentId: active.id,
        projectId: active.projectId,
        staffingOrderId: active.staffingOrderId ?? null,
        employeeCode: active.employeeCode,
        validFrom: active.validFrom,
      };
    }
  }

  let employeeCodeTaken = false;
  if (project) {
    const clash = await tx.projectAssignment.findFirst({
      where: { projectId: project.id, employeeCode: attrs.employeeCode },
      select: { id: true },
    });
    employeeCodeTaken = clash !== null;
  }

  // Referral Guard runs only when the conversion invariant is intact — it needs a
  // canonical worker. DEC-07: PUBLIC/CTV do not fabricate a vendor.
  let guard: GuardResult | null = null;
  if (submission.workerId && project) {
    guard = await evaluateReferralGuard(tx, guardContextFor(submission, project.id));
  }

  return {
    submission,
    slot,
    order,
    project,
    existingActive,
    existingForSubmission: existingForSubmission
      ? { assignmentId: existingForSubmission.id, status: existingForSubmission.status }
      : null,
    employeeCodeTaken,
    guard,
  };
}

function guardContextFor(submission: SubmissionFacts, projectId: string): GuardContext {
  return {
    workerId: submission.workerId as string,
    vendorId: submission.vendorId,
    ctvId: submission.ctvId,
    projectId,
    // The submission being placed is its OWN claim — it must not trip the R1
    // 7-day window against itself (the documented purpose of this field).
    submissionId: submission.id,
  };
}
// ─── Conflict derivation ─────────────────────────────────────────────────────

/**
 * Every preflight rule in one place so preview and activate can NEVER disagree.
 * `now` is injectable for deterministic tests.
 */
export function deriveConflicts(
  facts: PlacementFacts,
  attrs: NormalizedAttributes,
  now: Date = new Date(),
): PlacementConflict[] {
  const conflicts: PlacementConflict[] = [];
  const { submission, slot, order, project, existingActive, existingForSubmission, guard } = facts;

  // RQ-04: only a CONVERTED submission with a canonical Worker, a slot link and an
  // accepted SourceClaim may be placed.
  const invariantReasons: string[] = [];
  if (submission.status !== 'CONVERTED') invariantReasons.push(`status is ${submission.status}, expected CONVERTED`);
  if (!submission.workerId) invariantReasons.push('no canonical workerId');
  if (!submission.slotId) invariantReasons.push('no slot link');
  if (!submission.acceptedClaimId) invariantReasons.push('no accepted SourceClaim for the converted Worker');
  if (invariantReasons.length > 0) {
    conflicts.push({
      code: 'CONVERSION_INVARIANT_BROKEN',
      message: `Application cannot be placed: ${invariantReasons.join('; ')}`,
      details: { reasons: invariantReasons, status: submission.status },
    });
  }

  // RQ-04: one initial assignment per submission (DB unique is the backstop).
  if (existingForSubmission) {
    conflicts.push({
      code: 'ASSIGNMENT_EXISTS',
      message: 'This application already has an assignment',
      details: { assignmentId: existingForSubmission.assignmentId, status: existingForSubmission.status },
    });
  }

  // DEC-05: never auto-transfer — hand the UI the guided-transfer target.
  if (existingActive) {
    conflicts.push({
      code: 'ACTIVE_ASSIGNMENT_CONFLICT',
      message: 'Worker already has an ACTIVE assignment — use guided transfer',
      details: {
        assignmentId: existingActive.assignmentId,
        projectId: existingActive.projectId,
        staffingOrderId: existingActive.staffingOrderId,
        validFrom: existingActive.validFrom.toISOString(),
      },
    });
  }

  // Slot / order / project validity + capacity (4.4).
  if (submission.slotId) {
    const slotReasons: string[] = [];
    if (!slot) slotReasons.push('slot not found or out of scope');
    if (slot && !order) slotReasons.push('staffing order not found or out of scope');
    if (order && order.status !== 'OPEN') slotReasons.push(`staffing order is ${order.status}, expected OPEN`);
    if (slot && !project) slotReasons.push('project not found or out of scope');
    if (project && project.status !== 'ACTIVE') slotReasons.push(`project is ${project.status}, expected ACTIVE`);
    if (slot && slot.validFrom.getTime() > now.getTime()) slotReasons.push('slot has not started yet');
    if (slot?.validTo && slot.validTo.getTime() <= now.getTime()) slotReasons.push('slot interval has expired');
    if (slot && slot.slotsFilled >= slot.slotsNeeded) slotReasons.push('slot is full');
    if (slotReasons.length > 0) {
      conflicts.push({
        code: 'SLOT_UNAVAILABLE',
        message: `Slot cannot accept a placement: ${slotReasons.join('; ')}`,
        details: {
          reasons: slotReasons,
          slotId: submission.slotId,
          slotsFilled: slot?.slotsFilled ?? null,
          slotsNeeded: slot?.slotsNeeded ?? null,
        },
      });
    }
  }

  if (project && project.filled >= project.quota) {
    conflicts.push({
      code: 'PROJECT_QUOTA_FULL',
      message: 'Project quota is full',
      details: { projectId: project.id, filled: project.filled, quota: project.quota },
    });
  }

  if (facts.employeeCodeTaken && project) {
    conflicts.push({
      code: 'EMPLOYEE_CODE_CONFLICT',
      message: `employeeCode "${attrs.employeeCode}" is already used in this project`,
      details: { projectId: project.id, employeeCode: attrs.employeeCode },
    });
  }

  // RQ-06: a blocked guard is the only overridable conflict.
  if (guard && !guard.allowed) {
    conflicts.push({
      code: 'REFERRAL_GUARD_BLOCKED',
      message: `Referral Guard blocked this placement (${describeBlockCode(guard.blockCode)})`,
      details: {
        blockCode: guard.blockCode,
        blockLabel: describeBlockCode(guard.blockCode),
        failedRules: guard.failedRules,
        source: guard.source,
      },
      overridable: true,
    });
  }

  return sortConflicts(conflicts);
}

function guardProjection(guard: GuardResult | null): ReferralGuardProjection | null {
  if (!guard) return null;
  return {
    source: guard.source,
    blockCode: guard.blockCode,
    blockLabel: describeBlockCode(guard.blockCode),
    failedRules: [...guard.failedRules],
    skippedRules: [...guard.skippedRules],
    overrideRequired: !guard.allowed,
  };
}

// ─── STEP-03: read-only preview (RQ-02) ──────────────────────────────────────

/**
 * Advisory projection. Writes NOTHING — no audit, no counters, no override.
 * DEC-03: activate re-runs every check under lock, so this result is never an
 * authority. Caller supplies the RLS transaction (`withDbContext`).
 */
export async function previewPlacement(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: PlacementAttributes,
  now: Date = new Date(),
): Promise<PlacementPreview> {
  assertPlacementRole(ctx);
  const attrs = normalizePlacementAttributes(input, now);
  const facts = await gatherFacts(tx, attrs, { lockSlot: false });
  const conflicts = deriveConflicts(facts, attrs, now);

  return {
    canActivate: conflicts.length === 0,
    submissionId: facts.submission.id,
    submissionStatus: facts.submission.status,
    workerId: facts.submission.workerId,
    sourceClaimId: facts.submission.acceptedClaimId,
    source: facts.guard?.source
      ?? (facts.submission.vendorId ? 'VENDOR' : facts.submission.ctvId ? 'CTV' : 'PUBLIC'),
    slot: facts.slot,
    order: facts.order,
    project: facts.project,
    existingActiveAssignment: facts.existingActive,
    existingAssignmentForSubmission: facts.existingForSubmission,
    referralGuard: guardProjection(facts.guard),
    employeeCode: attrs.employeeCode,
    employmentType: attrs.employmentType,
    workSetting: attrs.workSetting,
    validFrom: attrs.validFrom.toISOString(),
    validTo: attrs.validTo ? attrs.validTo.toISOString() : null,
    conflicts,
  };
}
// ─── STEP-04/05: activation (RQ-03, RQ-05, RQ-06, RQ-07) ─────────────────────

/**
 * Create exactly one ACTIVE assignment for a CONVERTED submission.
 *
 * Order of operations is contractual (4.4):
 *   1. role gate + payload validation (no I/O)
 *   2. resolve override permission if an override was requested (own connection —
 *      MUST happen before any lock)
 *   3. read the submission to learn the canonical workerId (lock key)
 *   4. pg_advisory_xact_lock(worker)      <- worker lock FIRST
 *   5. SELECT ... FOR UPDATE on the slot  <- then the slot row
 *   6. re-evaluate EVERY check on locked data
 *   7. insert assignment, bump slot + project counters exactly once, verify both
 *      stayed inside capacity/quota, write audit + outbox
 *
 * Any failure throws, so `withDbContext`'s transaction rolls the whole thing back
 * — no partial write, no counter drift, no orphan audit/outbox row.
 */
export async function activatePlacement(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: ActivatePlacementInput,
  now: Date = new Date(),
): Promise<ActivatePlacementResult> {
  assertPlacementRole(ctx);
  const attrs = normalizePlacementAttributes(input, now);

  const reason = (input.reason ?? '').trim();
  if (!reason) throw new PlacementError('VALIDATION', 400, 'A non-empty reason is required to activate an assignment');

  const override = input.override ?? null;
  if (override) {
    if (!isOverrideCase(override.overrideCase)) {
      throw new PlacementError('OVERRIDE_DENIED', 400, 'override.overrideCase must be S1, S2 or S3');
    }
    if (!override.reason?.trim()) {
      throw new PlacementError('OVERRIDE_DENIED', 400, 'override.reason is required');
    }
  }

  // Pre-lock (4.4): the permission resolver opens its own connection.
  let hasOverridePermission = input.hasOverridePermission;
  if (override && hasOverridePermission === undefined) {
    hasOverridePermission = (await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role }))
      .has('CAN_OVERRIDE_REFERRAL_GUARD');
  }
  if (override && !hasOverridePermission) {
    throw new PlacementError('OVERRIDE_DENIED', 403, `Role ${ctx.role} lacks CAN_OVERRIDE_REFERRAL_GUARD`);
  }

  // Lock key comes from the canonical worker link; this read is pre-lock and is
  // re-done under the lock below (its result is never trusted for decisions).
  const preRead = await readSubmission(tx, attrs.submissionId);
  if (!preRead.workerId) {
    throw new PlacementError(
      'CONVERSION_INVARIANT_BROKEN', 409,
      'Application has no canonical Worker — convert it before placement',
      { status: preRead.status },
    );
  }

  await acquireWorkerLock(tx, preRead.workerId);

  // Everything below runs on locked data (slot row is locked inside gatherFacts).
  const facts = await gatherFacts(tx, attrs, { lockSlot: true });
  if (facts.submission.workerId !== preRead.workerId) {
    throw new PlacementError('ASSIGNMENT_CONFLICT', 409, 'Application changed concurrently; reload the preview');
  }

  const conflicts = deriveConflicts(facts, attrs, now);
  const guardConflict = conflicts.find((c) => c.code === 'REFERRAL_GUARD_BLOCKED');
  const blocking = conflicts.filter((c) => !(override && c.code === 'REFERRAL_GUARD_BLOCKED'));
  if (blocking.length > 0) {
    const first = blocking[0];
    throw new PlacementError(first.code, HTTP_FOR_CONFLICT[first.code], first.message, {
      ...(first.details ?? {}),
      conflicts: blocking.map((c) => ({ code: c.code, message: c.message, details: c.details ?? null })),
    });
  }
  // An override may only be consumed when the guard actually blocked (DEC-03).
  if (override && !guardConflict) {
    throw new PlacementError('OVERRIDE_DENIED', 409, 'Referral Guard did not block this placement — nothing to override');
  }

  const slot = facts.slot as SlotProjection;
  const project = facts.project as ProjectProjection;
  const workerId = facts.submission.workerId as string;

  if (override && facts.guard) {
    // Same transaction, exactly one audit row (RQ-06/RQ-07); permission already
    // resolved pre-lock so no connection is opened here.
    await applyOverride(
      tx, ctx, guardContextFor(facts.submission, project.id), facts.guard,
      {
        overrideCase: override.overrideCase as OverrideCase,
        reason: override.reason.trim(),
        evidence: override.evidence?.trim() || undefined,
      },
      {
        hasOverridePermission: true,
        entityType: 'ProjectAssignment',
        entityId: facts.submission.id,
        extra: { submissionId: facts.submission.id, slotId: slot.id, employeeCode: attrs.employeeCode },
      },
    );
  }

  let assignment: { id: string };
  try {
    assignment = await tx.projectAssignment.create({
      data: {
        workerId,
        projectId: project.id,
        staffingOrderId: slot.staffingOrderId,
        staffingOrderSlotId: slot.id,
        submissionId: facts.submission.id,
        employeeCode: attrs.employeeCode,
        employmentType: attrs.employmentType,
        workSetting: attrs.workSetting,
        validFrom: attrs.validFrom,
        validTo: attrs.validTo,
        status: 'ACTIVE',
        isPrimary: true,
      },
      select: { id: true },
    });
  } catch (error) {
    throw mapWriteConflict(error, facts.submission.id, workerId, attrs.employeeCode);
  }

  // Counters move exactly once, in the same transaction (DEC-06 projection rule).
  const slotAfter = await tx.staffingOrderSlot.update({
    where: { id: slot.id },
    data: { slotsFilled: { increment: 1 } },
    select: { slotsFilled: true, slotsNeeded: true },
  });
  if (slotAfter.slotsFilled > slotAfter.slotsNeeded) {
    throw new PlacementError('SLOT_UNAVAILABLE', 409, 'Slot capacity would be exceeded — rolled back', {
      slotId: slot.id, slotsFilled: slotAfter.slotsFilled, slotsNeeded: slotAfter.slotsNeeded,
    });
  }

  const projectAfter = await tx.project.update({
    where: { id: project.id },
    data: { filled: { increment: 1 } },
    select: { filled: true, quota: true },
  });
  if (projectAfter.filled > projectAfter.quota) {
    throw new PlacementError('PROJECT_QUOTA_FULL', 409, 'Project quota would be exceeded — rolled back', {
      projectId: project.id, filled: projectAfter.filled, quota: projectAfter.quota,
    });
  }

  await tx.auditLog.create({
    data: {
      actorId: ctx.userId,
      actorRole: ctx.role,
      entityType: 'ProjectAssignment',
      entityId: assignment.id,
      action: AUDIT_ACTION,
      reason,
      diff: {
        before: { assignmentId: null, slotsFilled: slot.slotsFilled, projectFilled: project.filled },
        after: {
          assignmentId: assignment.id,
          status: 'ACTIVE',
          submissionId: facts.submission.id,
          workerId,
          slotId: slot.id,
          staffingOrderId: slot.staffingOrderId,
          projectId: project.id,
          employeeCode: attrs.employeeCode,
          employmentType: attrs.employmentType,
          slotsFilled: slotAfter.slotsFilled,
          projectFilled: projectAfter.filled,
        },
        override: override
          ? { overrideCase: override.overrideCase, blockCode: facts.guard?.blockCode ?? null }
          : null,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await enqueueOutbox(tx, {
    eventType: OUTBOX_EVENT,
    aggregateId: assignment.id,
    payload: {
      assignmentId: assignment.id,
      submissionId: facts.submission.id,
      workerId,
      slotId: slot.id,
      staffingOrderId: slot.staffingOrderId,
      projectId: project.id,
      employeeCode: attrs.employeeCode,
      employmentType: attrs.employmentType,
      validFrom: attrs.validFrom.toISOString(),
      activatedBy: ctx.userId,
    },
  });

  return {
    assignmentId: assignment.id,
    status: 'ACTIVE',
    submissionId: facts.submission.id,
    workerId,
    slotId: slot.id,
    staffingOrderId: slot.staffingOrderId,
    projectId: project.id,
    employeeCode: attrs.employeeCode,
    counters: {
      slotsFilled: slotAfter.slotsFilled,
      slotsNeeded: slotAfter.slotsNeeded,
      projectFilled: projectAfter.filled,
      projectQuota: projectAfter.quota,
    },
    overrideApplied: Boolean(override),
  };
}

/** Transaction-scoped advisory lock on the worker — same key/pattern as transfer.service. */
async function acquireWorkerLock(tx: Prisma.TransactionClient, workerId: string): Promise<void> {
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1::text))`, workerId);
}

/**
 * Map a losing race to its stable code. The DB indexes are the real backstops:
 *   one_active_assignment(worker_id) WHERE status='ACTIVE'  -> 1-ACTIVE
 *   project_assignments_submission_id_key                   -> one per submission
 *   project_assignments_project_id_employee_code_key        -> employee code
 */
export function mapWriteConflict(
  error: unknown,
  submissionId: string,
  workerId: string,
  employeeCode: string,
): PlacementError {
  const target = uniqueTargetOf(error);
  if (target === null) {
    return error instanceof PlacementError
      ? error
      : new PlacementError('ASSIGNMENT_CONFLICT', 409, toMessage(error), { submissionId });
  }
  if (target.includes('submission_id')) {
    return new PlacementError('ASSIGNMENT_EXISTS', 409, 'This application already has an assignment', { submissionId });
  }
  if (target.includes('one_active_assignment') || target.includes('worker_id')) {
    return new PlacementError(
      'ACTIVE_ASSIGNMENT_CONFLICT', 409,
      'Worker already has an ACTIVE assignment — use guided transfer', { workerId },
    );
  }
  if (target.includes('employee_code')) {
    return new PlacementError(
      'EMPLOYEE_CODE_CONFLICT', 409,
      `employeeCode "${employeeCode}" is already used in this project`, { employeeCode },
    );
  }
  return new PlacementError('ASSIGNMENT_CONFLICT', 409, 'Assignment was created concurrently; reload the preview', {
    submissionId, target,
  });
}

function uniqueTargetOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const e = error as { code?: string; meta?: { target?: unknown } };
  if (e.code !== 'P2002') return null;
  const target = e.meta?.target;
  if (Array.isArray(target)) return target.join(',');
  if (typeof target === 'string') return target;
  return '';
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
