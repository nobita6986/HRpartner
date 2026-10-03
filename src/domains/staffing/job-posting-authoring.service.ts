/**
 * job-posting-authoring.service.ts — P1-A0 implementation.
 *
 * Vertical slice A0: create-or-reuse JobOpening + DRAFT JobPosting from a
 * StaffingOrderSlot, update draft content, publish / unpublish / archive with
 * optimistic revision checking.
 *
 * DECISIONS (locked at TASK v1.2):
 *   - DEC-02 state machine: JobPosting status = DRAFT ↔ PUBLISHED → ARCHIVED.
 *     ARCHIVED is terminal in this slice. Publish requires linked JobOpening
 *     status = OPEN; DRAFT / FILLED / CANCELLED JobOpenings are rejected.
 *     Publish/unpublish/archive MUST NOT mutate JobOpening lifecycle
 *     (Owner uses the canonical JobOpening status flow separately).
 *   - DEC-03 / OD-P1A-01..03: rich content is Tiptap/ProseMirror JSON +
 *     contentSchemaVersion=1. Validator is `validateRichText` from the shared
 *     boundary (src/shared/content/job-posting-rich-text). The validator is
 *     the AUTHORITY — even if the client lies, we re-validate before write.
 *   - DEC-04 / OD-P1A-01: dependency boundary is owned by HRP. This file does
 *     NOT import `@tiptap/*` directly.
 *   - DEC-07 / OD-P1A-06: create-or-reuse JobOpening from a StaffingOrderSlot.
 *     Caller MUST pass a slotId. We lock the slot row in the transaction, read
 *     its current jobOpeningId, and either reuse (if set) or create exactly
 *     one DRAFT JobOpening and bind it back to the slot. Two concurrent
 *     callers cannot produce duplicates — both see the same locked row, the
 *     first wins via UPDATE-with-where-clause (jobOpeningId IS NULL), the
 *     second sees the new binding.
 *   - DEC-08 / OD-P1A-07: canonical slug = `{normalized-title}-{stable-short-suffix}`.
 *     Stable suffix = first 8 hex chars of sha256(jobOpeningId | revision=1)
 *     — deterministic and immutable. Slug unique; immutable after the first
 *     PUBLISHED transition (enforced by state-transition guard).
 *   - DEC-09 / OD-P1A-09: this slice does NOT add a CandidateSubmission.jobPostingId.
 *     Public anonymous apply RPC stays unchanged.
 *
 * AUTHORIZATION (DEC-09 / OD-P1A-09):
 *   - Mutations: ADMIN, HR_MANAGER, HR_STAFF.
 *   - Reads: existing admin list (`job-posting-list.service.ts`) already
 *     handles SALE/PM/HR_*. No new anonymous route.
 *
 * RLS posture:
 *   - The `job_postings` table has FORCE ROW LEVEL SECURITY. Every operation
 *     here receives a `tx: Prisma.TransactionClient` whose GUC has been set
 *     by `withDbContext` (caller's responsibility). All SELECT/UPDATE use the
 *     same `tx`. We do NOT open additional connections.
 *
 * Idempotency:
 *   - The `withIdempotency` helper (in src/shared/integrity) is the route's
 *     concern — this service intentionally stays idempotent at the *service*
 *     level for `createOrReuse` (race-safe via slot lock), but route-level
 *     retries are deduplicated by the helper.
 */

import { Prisma, SystemRole } from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';
import { createHash } from 'node:crypto';
import {
  validateRichText,
  isValidationFailure,
  JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
  type ValidationResult,
  type RichTextErrorCode,
} from '@/src/shared/content/job-posting-rich-text';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import {
  assertActiveRecruiterForOrder,
  acquireOrderAdvisoryLock,
  RecruiterAssignmentError,
} from '@/src/domains/talent/recruiter-assignment.service';
import { eligibleSlotPredicateSql } from './job-posting-list.service';
// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export type AuthoringErrorCode =
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'INVALID_REVISION'
  | 'INVALID_STATE_TRANSITION'
  | 'JOB_OPENING_NOT_OPEN'
  | 'VALIDATION_FAILED'
  | 'SLUG_COLLISION'
  // hrp-f9-hr-staff-jobposting-scope: scoped-recruiter authority. Mirrors
  // P1-A0.4 `RecruiterAssignmentError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)`
  // surfaced at the JobPosting authoring surface. Stable code; route maps
  // it to HTTP 403 via the existing `AuthoringError` catch block.
  | 'NO_ACTIVE_ORDER_ASSIGNMENT';

export class AuthoringError extends Error {
  constructor(
    public readonly code: AuthoringErrorCode,
    message: string,
    public readonly httpStatus: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AuthoringError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const ALLOWED_MUTATION_ROLES: ReadonlySet<SystemRole> = new Set<SystemRole>([
  'ADMIN',
  'HR_MANAGER',
  'HR_STAFF',
]);

/** JobOpening lifecycle states the schema accepts. Keep in sync with schema.prisma. */
export type JobOpeningLifecycleStatus = 'DRAFT' | 'OPEN' | 'FILLED' | 'CANCELLED';

/** JobPosting lifecycle states. ARCHIVED is terminal. */
export type JobPostingLifecycleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

// ─────────────────────────────────────────────────────────────────────────────
// Inputs / DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateOrReuseJobOpeningForSlotInput {
  slotId: string;
}

/**
 * C-02: revalidation context returned by the write-path authority. Carries the
 * LIVE StaffingOrder status so the route can echo it back to the client (no
 * hard-coded `orderStatus: 'OPEN'`). Always present when the slot is eligible.
 */
export interface SlotRevalidationContext {
  readonly slotId: string;
  readonly staffingOrderId: string;
  readonly slotsFilled: number;
  readonly slotsNeeded: number;
  readonly validTo: Date | null;
  readonly deadlineDate: Date | null;
  /** Actual `StaffingOrder.status` as observed under the transaction's RLS scope. */
  readonly orderStatus: string;
}

export interface CreateOrReuseJobPostingDraftForOpeningInput {
  jobOpeningId: string;
}

export interface UpdateDraftContentInput {
  jobPostingId: string;
  expectedRevision: number;
  title: string;
  salaryDisplay?: string | null;
  descriptionJson: unknown;
  requirementsJson?: unknown | null;
  benefitsJson?: unknown | null;
  applicationInstructionsJson?: unknown | null;
  /**
   * P1-A0.1 stamp flags. `undefined` → giữ giá trị hiện tại trên row (theo `DEC-04`,
   * giống pattern `salaryDisplay` hiện hữu — client không truyền = không đổi).
   * Field xuất hiện nhưng không phải boolean bị `assertBoolean` reject 400.
   */
  isHot?: boolean;
  isUrgent?: boolean;
  contentSchemaVersion: number;
}

export interface PublishJobPostingInput {
  jobPostingId: string;
  expectedRevision: number;
}

export interface UnpublishJobPostingInput {
  jobPostingId: string;
  expectedRevision: number;
}

export interface ArchiveJobPostingInput {
  jobPostingId: string;
  expectedRevision: number;
}

export interface JobPostingDto {
  id: string;
  jobOpeningId: string;
  slug: string;
  revision: number;
  status: JobPostingLifecycleStatus;
  title: string | null;
  salaryDisplay: string | null;
  descriptionJson: unknown | null;
  requirementsJson: unknown | null;
  benefitsJson: unknown | null;
  applicationInstructionsJson: unknown | null;
  contentSchemaVersion: number;
  /** P1-A0.1 stamp flags — canonical source of truth for public "Hot" + "Tuyển gấp" stamps. */
  isHot: boolean;
  isUrgent: boolean;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobOpeningDto {
  id: string;
  staffingOrderId: string;
  staffingOrderSlotId: string | null;
  status: JobOpeningLifecycleStatus;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Authorization helpers
// ─────────────────────────────────────────────────────────────────────────────

export function assertMutationRole(ctx: AuthContext): void {
  if (!ALLOWED_MUTATION_ROLES.has(ctx.role)) {
    throw new AuthoringError(
      'PERMISSION_DENIED',
      `Role ${ctx.role} không có quyền mutate JobPosting.`,
      403,
    );
  }
}

/**
 * hrp-f9-hr-staff-jobposting-scope (DEC-03, DEC-05, DEC-08) — scoped-recruiter
 * authority for the JobPosting authoring surface.
 *
 *   - HR_STAFF caller MUST hold an ACTIVE `StaffingOrderRecruiterAssignment`
 *     on the target `StaffingOrder`. Revoked / unassigned / other-recruiter
 *     fail-closed with `AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)`.
 *   - ADMIN / HR_MANAGER bypass (matches the canonical P1-A0.4
 *     `assertActiveRecruiterForOrder` bypass — no other role reaches here
 *     because `assertMutationRole` already narrows the caller to
 *     `ALLOWED_MUTATION_ROLES = {ADMIN, HR_MANAGER, HR_STAFF}`).
 *
 * Wraps `assertActiveRecruiterForOrder` (read-only consumption) and translates
 * `RecruiterAssignmentError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)` into the
 * authoring-side typed error so the route's existing `AuthoringError` catch
 * block surfaces a stable `error.code` and `error.httpStatus`.
 *
 * The error envelope carries NO slot id, NO staffing order id, NO project id,
 * NO assignee id, NO actor id. The canonical helper's `details` are dropped
 * intentionally — the helper's default message includes `actorId` and
 * `staffingOrderId`, which would leak the existence of the foreign order to
 * the caller.
 *
 * Runs INSIDE the same `$transaction` as the mutation so the re-check closes
 * a revoke race: a revoke that committed between the slot read and the
 * mutation is observed on the assignment row read here.
 */
export async function assertHrStaffRecruiterScope(
  tx: PrismaTypes.TransactionClient,
  ctx: AuthContext,
  staffingOrderId: string,
): Promise<void> {
  if (ctx.role !== 'HR_STAFF') return; // bypass for ADMIN/HR_MANAGER
  try {
    await assertActiveRecruiterForOrder(tx, ctx.userId, ctx.role, staffingOrderId);
  } catch (err) {
    if (err instanceof RecruiterAssignmentError && err.code === 'NO_ACTIVE_ORDER_ASSIGNMENT') {
      throw new AuthoringError(
        'NO_ACTIVE_ORDER_ASSIGNMENT',
        'Bạn không có quyền truy cập StaffingOrder này. Vui lòng liên hệ HR_MANAGER.',
        403,
      );
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Slug helpers
// ─────────────────────────────────────────────────────────────────────────────

const VIETNAMESE_DIACRITICS_MAP: Record<string, string> = {
  à: 'a', á: 'a', ả: 'a', ã: 'a', ạ: 'a',
  ă: 'a', ằ: 'a', ắ: 'a', ẳ: 'a', ẵ: 'a', ặ: 'a',
  â: 'a', ầ: 'a', ấ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
  À: 'a', Á: 'a', Ả: 'a', Ã: 'a', Ạ: 'a',
  Ă: 'a', Ằ: 'a', Ắ: 'a', Ẳ: 'a', Ẵ: 'a', Ặ: 'a',
  Â: 'a', Ầ: 'a', Ấ: 'a', Ẩ: 'a', Ẫ: 'a', Ậ: 'a',
  è: 'e', é: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e',
  ê: 'e', ề: 'e', ế: 'e', ể: 'e', ễ: 'e', ệ: 'e',
  È: 'e', É: 'e', Ẻ: 'e', Ẽ: 'e', Ẹ: 'e',
  Ê: 'e', Ề: 'e', Ế: 'e', Ể: 'e', Ễ: 'e', Ệ: 'e',
  ì: 'i', í: 'i', ỉ: 'i', ĩ: 'i', ị: 'i',
  Ì: 'i', Í: 'i', Ỉ: 'i', Ĩ: 'i', Ị: 'i',
  ò: 'o', ó: 'o', ỏ: 'o', õ: 'o', ọ: 'o',
  ô: 'o', ồ: 'o', ố: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
  ơ: 'o', ờ: 'o', ớ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
  Ò: 'o', Ó: 'o', Ỏ: 'o', Õ: 'o', Ọ: 'o',
  Ô: 'o', Ồ: 'o', Ố: 'o', Ổ: 'o', Ỗ: 'o', Ộ: 'o',
  Ơ: 'o', Ờ: 'o', Ớ: 'o', Ở: 'o', Ỡ: 'o', Ợ: 'o',
  ù: 'u', ú: 'u', ủ: 'u', ũ: 'u', ụ: 'u',
  ư: 'u', ừ: 'u', ứ: 'u', ử: 'u', ữ: 'u', ự: 'u',
  Ù: 'u', Ú: 'u', Ủ: 'u', Ũ: 'u', Ụ: 'u',
  Ư: 'u', Ừ: 'u', Ứ: 'u', Ử: 'u', Ữ: 'u', Ự: 'u',
  ỳ: 'y', ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
  Ỳ: 'y', Ý: 'y', Ỷ: 'y', Ỹ: 'y', Ỵ: 'y',
  đ: 'd', Đ: 'd',
};

export function normalizeSlugTitle(input: string): string {
  const lower = input.toLowerCase().trim();
  const stripped = lower
    .split('')
    .map((ch) => VIETNAMESE_DIACRITICS_MAP[ch] ?? ch)
    .join('');
  // Replace any run of non-alphanumeric with a single dash.
  const dashed = stripped.replace(/[^a-z0-9]+/g, '-');
  // Trim leading/trailing dashes.
  return dashed.replace(/^-+|-+$/g, '').slice(0, 80);
}

export function stableShortSuffix(seed: string): string {
  return createHash('sha256').update(seed).digest('hex').slice(0, 8);
}

export interface GenerateCanonicalSlugInput {
  jobOpeningId: string;
  title: string;
}

/**
 * Compute the canonical slug for a JobPosting. Pure — does not touch the DB.
 * The caller is responsible for ensuring uniqueness in the DB.
 */
export function generateCanonicalSlug(input: GenerateCanonicalSlugInput): string {
  const norm = normalizeSlugTitle(input.title);
  const base = norm === '' ? 'job' : norm;
  const suffix = stableShortSuffix(`${input.jobOpeningId}|v1`);
  return `${base}-${suffix}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers (rich content + state)
// ─────────────────────────────────────────────────────────────────────────────

function validateRichContentField(
  label: string,
  payload: unknown,
  schemaVersion: number,
): ValidationResult {
  const result = validateRichText(schemaVersion, payload);
  if (isValidationFailure(result)) {
    throw new AuthoringError(
      'VALIDATION_FAILED',
      `Rich content "${label}" bị reject: ${result.code} — ${result.message}`,
      400,
      { field: label, code: result.code as RichTextErrorCode, message: result.message },
    );
  }
  return result;
}

function assertValidTitle(title: string): void {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new AuthoringError('INVALID_INPUT', 'title là bắt buộc khi lưu/publish JobPosting.', 400);
  }
  if (trimmed.length > 200) {
    throw new AuthoringError('INVALID_INPUT', 'title tối đa 200 ký tự.', 400);
  }
}

function assertSalaryDisplay(salaryDisplay: string | null | undefined): void {
  if (salaryDisplay === null || salaryDisplay === undefined) return;
  if (salaryDisplay.length > 200) {
    throw new AuthoringError('INVALID_INPUT', 'salaryDisplay tối đa 200 ký tự.', 400);
  }
}

/**
 * P1-A0.1 stamp flag validator. `undefined` = field bị bỏ qua (giữ giá trị hiện tại).
 * Mọi giá trị khác phải là boolean thật; string/number/null/object/array bị reject.
 * Cho phép `true`/`false`; KHÔNG ép truthy của string 'true' → bắt buộc JSON boolean.
 */
function assertBoolean(label: 'isHot' | 'isUrgent', value: unknown): void {
  if (value === undefined) return;
  if (typeof value !== 'boolean') {
    throw new AuthoringError(
      'INVALID_INPUT',
      `${label} phải là boolean (true/false) hoặc bị bỏ qua.`,
      400,
      { field: label, receivedType: typeof value },
    );
  }
}

function ensureUniqueSlug(
  tx: PrismaTypes.TransactionClient,
  slug: string,
  excludePostingId: string | null,
): Promise<void> {
  return (async () => {
    const existing = await tx.jobPosting.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing && existing.id !== excludePostingId) {
      throw new AuthoringError(
        'SLUG_COLLISION',
        `Slug "${slug}" đã tồn tại trên JobPosting ${existing.id}.`,
        409,
        { slug, existingId: existing.id },
      );
    }
  })();
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

/**
 * C-02: write-path authority for slot eligibility. Reads the slot + its staffing
 * order under the caller's transaction (RLS already applied by `withDbContext`)
 * and throws `AuthoringError('INVALID_INPUT', 400)` with a precise code if the
 * slot does NOT satisfy the canonical predicate. AUD-001: fail-closed
 * `is_eligible` gate at end of function.
 *
 * Critically: "exclude only slots with a canonical JobPosting". A slot that
 * already has a `JobOpening` bound but no `JobPosting` remains ELIGIBLE — the
 * POST path will reuse that `JobOpening` and create the missing posting.
 */
export async function assertSlotEligibleForNewJobPosting(
  tx: PrismaTypes.TransactionClient,
  slotId: string,
  ctx: AuthContext,
  now: Date = new Date(),
): Promise<SlotRevalidationContext> {
  if (typeof slotId !== 'string' || slotId.length === 0) {
    throw new AuthoringError('INVALID_INPUT', 'slotId là bắt buộc.', 400);
  }

  type SlotRow = {
    id: string;
    staffing_order_id: string;
    slots_filled: number;
    slots_needed: number;
    valid_to: Date | null;
    deadline_date: Date | null;
    order_status: string;
    /** C-02: id của JobOpening bound nếu có; null nếu slot chưa có opening. */
    job_opening_id: string | null;
    /** C-02: id của JobPosting qua JobOpening; null nếu chưa có canonical posting. */
    has_posting: boolean;
    is_eligible: boolean;
  };

  // hrp-f9-hr-staff-jobposting-scope correction batch 1/1 §F: re-ordered
  // to acquire the canonical order-scoped advisory lock + run the guard
  // BEFORE the FOR UPDATE. The narrow `hrp_f9_slots_staff_update` policy
  // (migration `20261003000000_f9_hr_staff_posting_write_rls`) admits the
  // writer connection's `SELECT ... FOR UPDATE` when the writer has an
  // ACTIVE recruiter assignment on the parent order. The advisory lock
  // (re-exported from `recruiter-assignment.service.ts`) is the same
  // canonical primitive used by `assignRecruiterToOrder` /
  // `revokeRecruiterFromOrder` / `claimCandidateSubmission`, so a parallel
  // revoke and a parallel create cannot interleave.
  //
  // Step 1: SELECT (no FOR UPDATE) to discover the parent order's id. If
  // RLS hides the row because the caller was never assigned, the row is
  // RLS-filtered and the SELECT returns 0 rows → stable NOT_FOUND 404
  // (no existence oracle). This is the canonical fail-closed envelope
  // for the never-assigned case (DEC-05-b). The message carries NO id
  // — no slotId, no staffingOrderId — per the no-existence-oracle
  // contract (AC-10 PII-leak protection).
  const initial = await tx.$queryRaw<
    Array<{ id: string; staffing_order_id: string }>
  >(Prisma.sql`
    SELECT s.id, s.staffing_order_id
      FROM staffing_order_slots s
     WHERE s.id = ${slotId}
  `);
  const initialSlot = initial[0];
  if (!initialSlot) {
    throw new AuthoringError('NOT_FOUND', 'StaffingOrderSlot không tồn tại hoặc bạn không có quyền truy cập.', 404);
  }

  // Step 2: Acquire the canonical order-scoped advisory lock. Held for the
  // rest of the transaction. Re-entrant for nested calls within the same
  // transaction (advisory locks are session-scoped; second acquisition
  // with the same key is a no-op in PG).
  await acquireOrderAdvisoryLock(tx, initialSlot.staffing_order_id);

  // Step 3: Guard re-read under the lock. For HR_STAFF callers without an
  // ACTIVE recruiter assignment on this order, the helper throws
  // `NO_ACTIVE_ORDER_ASSIGNMENT` 403. For ADMIN / HR_MANAGER, the guard
  // bypasses. This is the canonical fail-closed envelope for the
  // assigned-then-lost case (DEC-05-b).
  await assertHrStaffRecruiterScope(tx, ctx, initialSlot.staffing_order_id);

  // Step 4: SELECT FOR UPDATE under the lock + with the new narrow
  // HR_STAFF UPDATE policy in place. The row is now admitted by both the
  // pre-existing `hrp_sora_order_slots_staff_select` (read) and the new
  // `hrp_f9_slots_staff_update` (write/FOR UPDATE). Re-reads the slot
  // state under the row lock for predicate validation.
  const rows = await tx.$queryRaw<SlotRow[]>(Prisma.sql`
    SELECT
      s.id,
      s.staffing_order_id,
      s.slots_filled,
      s.slots_needed,
      s.valid_to,
      so.deadline_date,
      so.status AS order_status,
      s.job_opening_id,
      EXISTS (
        SELECT 1 FROM job_postings jp
        WHERE jp.job_opening_id = (
          SELECT jo.id FROM job_openings jo
          WHERE jo.staffing_order_slot_id = s.id
          LIMIT 1
        )
      ) AS has_posting,
      (${eligibleSlotPredicateSql(now)}) AS is_eligible
    FROM staffing_order_slots s
    INNER JOIN staffing_orders so ON so.id = s.staffing_order_id
    WHERE s.id = ${slotId}
    FOR UPDATE OF s
  `);
  const slot = rows[0];
  if (!slot) {
    // RLS or row state changed between step 1 and step 4 (e.g. concurrent
    // delete, or revoke-then-orphan). Stable NOT_FOUND 404.
    throw new AuthoringError('NOT_FOUND', `StaffingOrderSlot ${slotId} không tồn tại.`, 404);
  }

  // Step 5: Defense-in-depth guard re-read. A revoke that committed
  // between step 1's read and step 2's lock acquisition is now observed
  // (the assignment's status is REVOKED). Throws NO_ACTIVE_ORDER_ASSIGNMENT
  // for HR_STAFF who lost authority during the serialized operation.
  await assertHrStaffRecruiterScope(tx, ctx, slot.staffing_order_id);

  if (slot.order_status !== 'OPEN' && slot.order_status !== 'CLOSING_SOON') {
    throw new AuthoringError(
      'INVALID_INPUT',
      `StaffingOrder không còn mở (status=${slot.order_status}). Không thể tạo JobPosting mới.`,
      400,
      { orderStatus: slot.order_status },
    );
  }
  if (slot.deadline_date !== null && slot.deadline_date < now) {
    throw new AuthoringError(
      'INVALID_INPUT',
      'StaffingOrder đã quá hạn nộp (deadlineDate < now).',
      400,
      { deadlineDate: slot.deadline_date.toISOString() },
    );
  }
  if (slot.valid_to !== null && slot.valid_to < now) {
    throw new AuthoringError(
      'INVALID_INPUT',
      'StaffingOrderSlot đã quá hạn (validTo < now).',
      400,
      { validTo: slot.valid_to.toISOString() },
    );
  }
  if (slot.slots_filled >= slot.slots_needed) {
    throw new AuthoringError(
      'INVALID_INPUT',
      'StaffingOrderSlot đã đủ chỉ tiêu (slotsFilled >= slotsNeeded).',
      400,
      { slotsFilled: slot.slots_filled, slotsNeeded: slot.slots_needed },
    );
  }
  if (slot.has_posting) {
    throw new AuthoringError(
      'INVALID_INPUT',
      'StaffingOrderSlot đã có canonical JobPosting — không thể tạo JobPosting mới.',
      400,
      { slotId },
    );
  }
  // AUD-001: fail-closed mutation authority — never return success when canonical helper reports false.
  if (slot.is_eligible !== true) throw new AuthoringError('INVALID_INPUT', `StaffingOrderSlot ${slotId} không đủ điều kiện canonical eligibility (is_eligible=false).`, 400, { slotId, is_eligible: slot.is_eligible });

  return {
    slotId: slot.id,
    staffingOrderId: slot.staffing_order_id,
    slotsFilled: slot.slots_filled,
    slotsNeeded: slot.slots_needed,
    validTo: slot.valid_to,
    deadlineDate: slot.deadline_date,
    orderStatus: slot.order_status,
  };
}

/**
 * Create or reuse exactly one JobOpening bound to the given StaffingOrderSlot.
 *
 * Algorithm (OD-P1A-06 / DEC-07):
 *   1. SELECT FOR UPDATE the slot row.
 *   2. If `slot.jobOpeningId` is non-null → reuse (return that JobOpening).
 *   3. Otherwise create one DRAFT JobOpening on the slot's staffingOrder,
 *      then UPDATE the slot to bind the new opening.
 *   4. Return the JobOpening.
 *
 * Race: two concurrent callers both see `slot.jobOpeningId = null`. They each
 * create a JobOpening, but only one UPDATE on the slot succeeds — the second
 * UPDATE finds `jobOpeningId IS NOT NULL` and re-reads the canonical binding
 * (re-using it). This guarantees exactly-one-JobOpening-per-slot regardless
 * of race order.
 */
export async function createOrReuseJobOpeningForSlot(
  tx: PrismaTypes.TransactionClient,
  ctx: AuthContext,
  input: CreateOrReuseJobOpeningForSlotInput,
): Promise<JobOpeningDto> {
  assertMutationRole(ctx);

  if (typeof input.slotId !== 'string' || input.slotId.length === 0) {
    throw new AuthoringError('INVALID_INPUT', 'slotId là bắt buộc.', 400);
  }

  // C-02: re-read + revalidate eligibility INSIDE the transaction. The selector
  // (client dropdown) is NEVER the authorization authority — a stale selector
  // must fail closed with zero mutation. `assertSlotEligibleForNewJobPosting`
  // shares the predicate with `listEligibleSlotsForNewJobPosting` so the two
  // paths cannot drift.
  await assertSlotEligibleForNewJobPosting(tx, input.slotId, ctx);

  // 1. Lock the slot row.
  const slotRows = await tx.$queryRaw<
    Array<{ id: string; staffing_order_id: string; job_opening_id: string | null }>
  >(Prisma.sql`SELECT id, staffing_order_id, job_opening_id FROM staffing_order_slots WHERE id = ${input.slotId} FOR UPDATE`);
  const slot = slotRows[0];
  if (!slot) {
    throw new AuthoringError('NOT_FOUND', `StaffingOrderSlot ${input.slotId} không tồn tại.`, 404);
  }

  // hrp-f9-hr-staff-jobposting-scope correction batch 1/1 §F: participate
  // in the canonical order-scoped advisory lock. The inner
  // `assertSlotEligibleForNewJobPosting` call already acquired the lock,
  // so this is a re-entrant no-op within the same transaction. Listed
  // explicitly so the lock participation is visible at every call site.
  await acquireOrderAdvisoryLock(tx, slot.staffing_order_id);

  // hrp-f9-hr-staff-jobposting-scope STEP-03: defense-in-depth re-check of
  // the scoped-recruiter authority AFTER the slot lock. Closes a revoke
  // race that may have committed between the read inside
  // `assertSlotEligibleForNewJobPosting` and the actual INSERT/UPDATE
  // here. The canonical helper reads `staffing_order_recruiter_assignments`
  // again under the same transaction; a revoke that committed in a parallel
  // transaction is observed and HR_STAFF fails closed.
  await assertHrStaffRecruiterScope(tx, ctx, slot.staffing_order_id);

  // 2. Reuse if already bound.
  if (slot.job_opening_id) {
    const reused = await tx.jobOpening.findUnique({
      where: { id: slot.job_opening_id },
    });
    if (!reused) {
      throw new AuthoringError(
        'NOT_FOUND',
        `Slot ${input.slotId} có jobOpeningId=${slot.job_opening_id} nhưng JobOpening không tồn tại.`,
        500,
      );
    }
    return toJobOpeningDto(reused);
  }

  // 3. Create DRAFT JobOpening on the slot's staffing order.
  const created = await tx.jobOpening.create({
    data: {
      staffingOrderId: slot.staffing_order_id,
      staffingOrderSlotId: slot.id,
      status: 'DRAFT',
    },
  });

  // 4. Bind the new opening to the slot — only update if still unbound.
  const updateResult = await tx.$executeRaw(
    Prisma.sql`UPDATE staffing_order_slots
                SET job_opening_id = ${created.id}
                WHERE id = ${slot.id} AND job_opening_id IS NULL`,
  );
  if (updateResult === 0) {
    // Another concurrent caller bound the slot first. Reuse theirs.
    const rebound = await tx.staffingOrderSlot.findUnique({
      where: { id: slot.id },
      select: { jobOpeningId: true },
    });
    const winnerId = rebound?.jobOpeningId;
    if (!winnerId || winnerId === created.id) {
      throw new AuthoringError(
        'NOT_FOUND',
        `Slot ${slot.id} không thể bind JobOpening sau race — trạng thái không nhất quán.`,
        500,
      );
    }
    // Remove the orphan we just created so the test lane stays clean.
    await tx.jobOpening.delete({ where: { id: created.id } }).catch(() => undefined);
    const winner = await tx.jobOpening.findUnique({ where: { id: winnerId } });
    if (!winner) {
      throw new AuthoringError(
        'NOT_FOUND',
        `Slot ${slot.id} đã bind JobOpening ${winnerId} nhưng JobOpening không tồn tại.`,
        500,
      );
    }
    return toJobOpeningDto(winner);
  }

  return toJobOpeningDto(created);
}

/**
 * Create or reuse exactly one DRAFT JobPosting bound to the given JobOpening.
 * Idempotent: re-using a JobOpening that already has a posting returns it.
 */
export async function createOrReuseJobPostingDraftForOpening(
  tx: PrismaTypes.TransactionClient,
  ctx: AuthContext,
  input: CreateOrReuseJobPostingDraftForOpeningInput,
): Promise<JobPostingDto> {
  assertMutationRole(ctx);

  if (typeof input.jobOpeningId !== 'string' || input.jobOpeningId.length === 0) {
    throw new AuthoringError('INVALID_INPUT', 'jobOpeningId là bắt buộc.', 400);
  }

  const opening = await tx.jobOpening.findUnique({
    where: { id: input.jobOpeningId },
    include: { posting: true },
  });
  if (!opening) {
    throw new AuthoringError('NOT_FOUND', `JobOpening ${input.jobOpeningId} không tồn tại.`, 404);
  }

  // hrp-f9-hr-staff-jobposting-scope correction batch 1/1 §F: acquire the
  // canonical order-scoped advisory lock BEFORE the guard. Held for the
  // rest of the transaction. A parallel `revokeRecruiterFromOrder` on
  // this order will block until this transaction commits, so the
  // post-guard re-read observes a consistent assignment state.
  await acquireOrderAdvisoryLock(tx, opening.staffingOrderId);

  // hrp-f9-hr-staff-jobposting-scope STEP-04: scoped-recruiter authority for
  // the create-or-reuse chain that runs WITHOUT first calling
  // `assertSlotEligibleForNewJobPosting`. The opening is the parent of the
  // posting, so the order anchor derives from `opening.staffingOrderId`.
  // HR_STAFF callers without an ACTIVE assignment on this order are denied
  // before any INSERT. Runs under the advisory lock so a concurrent revoke
  // is serialized.
  await assertHrStaffRecruiterScope(tx, ctx, opening.staffingOrderId);

  if (opening.posting) {
    return toJobPostingDto(opening.posting);
  }

  // Pick a placeholder title from the slot's positionTitle so the row is
  // never published without a real title (placeholder is fine for DRAFT).
  let placeholderTitle = 'Untitled draft';
  if (opening.staffingOrderSlotId) {
    const slot = await tx.staffingOrderSlot.findUnique({
      where: { id: opening.staffingOrderSlotId },
      select: { positionTitle: true },
    });
    if (slot?.positionTitle) placeholderTitle = slot.positionTitle;
  }

  // Provisional slug — getUniqueSlug ensures no collision.
  let attempt = 0;
  let createdRow: Awaited<ReturnType<typeof tx.jobPosting.create>> | null = null;
  while (attempt < 5) {
    const slug = generateCanonicalSlug({
      jobOpeningId: opening.id,
      title: `${placeholderTitle}-${attempt}`,
    });
    try {
      createdRow = await tx.jobPosting.create({
        data: {
          jobOpeningId: opening.id,
          slug,
          revision: 1,
          status: 'DRAFT',
          title: placeholderTitle,
          contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
        },
      });
      break;
    } catch (err) {
      const isUnique =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
      if (!isUnique) throw err;
      attempt += 1;
    }
  }
  if (!createdRow) {
    throw new AuthoringError(
      'SLUG_COLLISION',
      `Không thể tạo JobPosting DRAFT cho JobOpening ${opening.id} — slug collision sau 5 lần thử.`,
      500,
    );
  }
  return toJobPostingDto(createdRow);
}

/**
 * Update DRAFT JobPosting content. Validates ALL rich fields (when present)
 * with the shared validator, refuses stale revisions (returns STALE_VERSION
 * without writing), and bumps revision.
 */
export async function updateDraftContent(
  tx: PrismaTypes.TransactionClient,
  ctx: AuthContext,
  input: UpdateDraftContentInput,
): Promise<JobPostingDto> {
  assertMutationRole(ctx);
  assertValidTitle(input.title);
  assertSalaryDisplay(input.salaryDisplay);
  assertBoolean('isHot', input.isHot);
  assertBoolean('isUrgent', input.isUrgent);

  validateRichContentField('descriptionJson', input.descriptionJson, input.contentSchemaVersion);
  if (input.requirementsJson !== null && input.requirementsJson !== undefined) {
    validateRichContentField(
      'requirementsJson',
      input.requirementsJson,
      input.contentSchemaVersion,
    );
  }
  if (input.benefitsJson !== null && input.benefitsJson !== undefined) {
    validateRichContentField('benefitsJson', input.benefitsJson, input.contentSchemaVersion);
  }
  if (input.applicationInstructionsJson !== null && input.applicationInstructionsJson !== undefined) {
    validateRichContentField(
      'applicationInstructionsJson',
      input.applicationInstructionsJson,
      input.contentSchemaVersion,
    );
  }

  const current = await tx.jobPosting.findUnique({
    where: { id: input.jobPostingId },
    select: {
      id: true,
      status: true,
      revision: true,
      slug: true,
      publishedAt: true,
      isHot: true,
      isUrgent: true,
      // hrp-f9-hr-staff-jobposting-scope STEP-05: derive the order anchor
      // for the scoped-recruiter re-check. F9 guard re-reads the assignment
      // table inside the same transaction; the include is required because
      // `JobPosting.jobOpeningId` alone is not enough — we need
      // `JobOpening.staffingOrderId` to call `assertHrStaffRecruiterScope`.
      jobOpening: { select: { id: true, staffingOrderId: true } },
    },
  });
  if (!current) {
    throw new AuthoringError(
      'NOT_FOUND',
      `JobPosting ${input.jobPostingId} không tồn tại.`,
      404,
    );
  }
  // hrp-f9-hr-staff-jobposting-scope STEP-05: scoped-recruiter re-check on
  // `updateDraftContent`. Runs AFTER NOT_FOUND (so the caller learns nothing
  // about a non-existent posting) and BEFORE the state/revision guards (so
  // an HR_STAFF probing a posting of an unassigned order never sees an
  // INVALID_STATE_TRANSITION or INVALID_REVISION error that would leak the
  // posting's lifecycle state). Orphan postings (no `jobOpening`) are
  // impossible here — the draft is created by
  // `createOrReuseJobPostingDraftForOpening` which always binds an opening.
  if (current.jobOpening) {
    // hrp-f9-hr-staff-jobposting-scope correction batch 1/1 §F: acquire
    // the canonical order-scoped advisory lock BEFORE the guard so a
    // parallel revoke is serialized with the update path.
    await acquireOrderAdvisoryLock(tx, current.jobOpening.staffingOrderId);
    await assertHrStaffRecruiterScope(tx, ctx, current.jobOpening.staffingOrderId);
  }
  if (current.status !== 'DRAFT') {
    throw new AuthoringError(
      'INVALID_STATE_TRANSITION',
      `Không thể cập nhật draft cho JobPosting ở trạng thái ${current.status}.`,
      409,
      { currentStatus: current.status },
    );
  }
  if (current.revision !== input.expectedRevision) {
    throw new AuthoringError(
      'INVALID_REVISION',
      `Revision mismatch: client=${input.expectedRevision}, server=${current.revision}.`,
      409,
      { clientRevision: input.expectedRevision, serverRevision: current.revision },
    );
  }

  // Slug is locked once published. Draft can keep its initial slug; we do NOT
  // regenerate here because the contract requires slug immutability after
  // first publish and stable suffix for traceability. Future schema for
  // "rename before publish" is intentionally out of scope (DEC-08 + RISK-03).
  const nextRevision = current.revision + 1;
  // P1-A0.1 (DEC-04): `undefined` → giữ giá trị hiện tại (giống pattern `salaryDisplay`).
  // Client không truyền field = không đổi row. Field truyền true/false = cập nhật.
  const nextIsHot = input.isHot !== undefined ? input.isHot : current.isHot;
  const nextIsUrgent = input.isUrgent !== undefined ? input.isUrgent : current.isUrgent;

  const updated = await tx.jobPosting.update({
    where: {
      id: current.id,
      revision: current.revision, // optimistic concurrency backstop
    },
    data: {
      title: input.title.trim(),
      salaryDisplay: input.salaryDisplay ?? null,
      descriptionJson: input.descriptionJson as PrismaTypes.InputJsonValue,
      requirementsJson:
        input.requirementsJson === null || input.requirementsJson === undefined
          ? Prisma.JsonNull
          : (input.requirementsJson as PrismaTypes.InputJsonValue),
      benefitsJson:
        input.benefitsJson === null || input.benefitsJson === undefined
          ? Prisma.JsonNull
          : (input.benefitsJson as PrismaTypes.InputJsonValue),
      applicationInstructionsJson:
        input.applicationInstructionsJson === null ||
        input.applicationInstructionsJson === undefined
          ? Prisma.JsonNull
          : (input.applicationInstructionsJson as PrismaTypes.InputJsonValue),
      contentSchemaVersion: input.contentSchemaVersion,
      isHot: nextIsHot,
      isUrgent: nextIsUrgent,
      revision: nextRevision,
    },
  });

  return toJobPostingDto(updated);
}

/**
 * Publish DRAFT → PUBLISHED.
 *   - requires linked JobOpening.status = OPEN
 *   - requires title + descriptionJson present and valid
 *   - requires current revision match
 *   - locks slug (immutable from now on)
 *   - sets publishedAt
 *
 * Does NOT mutate JobOpening.status.
 */
export async function publishJobPosting(
  tx: PrismaTypes.TransactionClient,
  ctx: AuthContext,
  input: PublishJobPostingInput,
): Promise<JobPostingDto> {
  assertMutationRole(ctx);

  const current = await tx.jobPosting.findUnique({
    where: { id: input.jobPostingId },
    include: {
      jobOpening: {
        select: {
          id: true,
          status: true,
          // hrp-f9-hr-staff-jobposting-scope STEP-05: extend include to
          // carry the order anchor for the scoped-recruiter re-check.
          staffingOrderId: true,
        },
      },
    },
  });
  if (!current) {
    throw new AuthoringError(
      'NOT_FOUND',
      `JobPosting ${input.jobPostingId} không tồn tại.`,
      404,
    );
  }
  if (current.status !== 'DRAFT') {
    throw new AuthoringError(
      'INVALID_STATE_TRANSITION',
      `Không thể publish JobPosting ở trạng thái ${current.status}.`,
      409,
      { currentStatus: current.status },
    );
  }
  if (current.revision !== input.expectedRevision) {
    throw new AuthoringError(
      'INVALID_REVISION',
      `Revision mismatch: client=${input.expectedRevision}, server=${current.revision}.`,
      409,
      { clientRevision: input.expectedRevision, serverRevision: current.revision },
    );
  }
  if (!current.jobOpening) {
    throw new AuthoringError(
      'NOT_FOUND',
      `JobPosting ${current.id} không gắn với JobOpening nào.`,
      500,
    );
  }
  // hrp-f9-hr-staff-jobposting-scope STEP-05: scoped-recruiter re-check on
  // `publishJobPosting`. Runs AFTER NOT_FOUND + INVALID_STATE_TRANSITION +
  // INVALID_REVISION (so callers do not learn the order's authority state
  // from a 409/404 leak) and BEFORE the JOB_OPENING_NOT_OPEN check (so an
  // unassigned HR_STAFF never sees the linked JobOpening's status — which
  // would be a foreign-entity metadata leak). `current.jobOpening` is
  // non-null here per the guard above.
  // hrp-f9-hr-staff-jobposting-scope correction batch 1/1 §F: advisory
  // lock participation (canonical primitive, no second namespace). Lock is
  // acquired before the guard re-read so a concurrent revoke is serialized
  // with the publish path.
  await acquireOrderAdvisoryLock(tx, current.jobOpening.staffingOrderId);
  await assertHrStaffRecruiterScope(tx, ctx, current.jobOpening.staffingOrderId);
  if (current.jobOpening.status !== 'OPEN') {
    throw new AuthoringError(
      'JOB_OPENING_NOT_OPEN',
      `Linked JobOpening ${current.jobOpening.id} phải ở trạng thái OPEN (hiện tại: ${current.jobOpening.status}).`,
      409,
      { jobOpeningId: current.jobOpening.id, jobOpeningStatus: current.jobOpening.status },
    );
  }
  if (!current.title || current.title.trim() === '') {
    throw new AuthoringError(
      'INVALID_INPUT',
      'title là bắt buộc khi publish JobPosting.',
      400,
    );
  }
  if (!current.descriptionJson) {
    throw new AuthoringError(
      'INVALID_INPUT',
      'descriptionJson là bắt buộc khi publish JobPosting.',
      400,
    );
  }

  // Slug lock: ensure canonical slug already in place. If not (e.g. admin
  // removed title earlier), regenerate it now — but only when status was
  // DRAFT (never rewrite a slug already locked).
  if (!current.slug) {
    const newSlug = generateCanonicalSlug({
      jobOpeningId: current.jobOpeningId,
      title: current.title,
    });
    await ensureUniqueSlug(tx, newSlug, current.id);
    const updated = await tx.jobPosting.update({
      where: { id: current.id, revision: current.revision },
      data: {
        slug: newSlug,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        revision: current.revision + 1,
      },
    });
    return toJobPostingDto(updated);
  }

  await ensureUniqueSlug(tx, current.slug, current.id);
  const updated = await tx.jobPosting.update({
    where: { id: current.id, revision: current.revision },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      revision: current.revision + 1,
    },
  });
  return toJobPostingDto(updated);
}

/**
 * Unpublish PUBLISHED → DRAFT. Clears publishedAt. Does NOT mutate JobOpening.
 */
export async function unpublishJobPosting(
  tx: PrismaTypes.TransactionClient,
  ctx: AuthContext,
  input: UnpublishJobPostingInput,
): Promise<JobPostingDto> {
  assertMutationRole(ctx);

  // hrp-f9-hr-staff-jobposting-scope STEP-05: extend the read to include
  // the linked JobOpening so the scoped-recruiter re-check can derive the
  // order anchor. Without this include, `unpublishJobPosting` could not
  // enforce HR_STAFF scope at the order level.
  const current = await tx.jobPosting.findUnique({
    where: { id: input.jobPostingId },
    include: {
      jobOpening: { select: { id: true, staffingOrderId: true } },
    },
  });
  if (!current) {
    throw new AuthoringError(
      'NOT_FOUND',
      `JobPosting ${input.jobPostingId} không tồn tại.`,
      404,
    );
  }
  // F9 guard: AFTER NOT_FOUND, BEFORE state/revision guards. See
  // `updateDraftContent` for the rationale (no foreign-entity metadata
  // leak through 409/404/INVALID_REVISION envelopes).
  if (current.jobOpening) {
    // hrp-f9-hr-staff-jobposting-scope correction batch 1/1 §F: advisory
    // lock participation (canonical primitive, no second namespace).
    await acquireOrderAdvisoryLock(tx, current.jobOpening.staffingOrderId);
    await assertHrStaffRecruiterScope(tx, ctx, current.jobOpening.staffingOrderId);
  }
  if (current.status !== 'PUBLISHED') {
    throw new AuthoringError(
      'INVALID_STATE_TRANSITION',
      `Không thể unpublish JobPosting ở trạng thái ${current.status}.`,
      409,
      { currentStatus: current.status },
    );
  }
  if (current.revision !== input.expectedRevision) {
    throw new AuthoringError(
      'INVALID_REVISION',
      `Revision mismatch: client=${input.expectedRevision}, server=${current.revision}.`,
      409,
      { clientRevision: input.expectedRevision, serverRevision: current.revision },
    );
  }

  const updated = await tx.jobPosting.update({
    where: { id: current.id, revision: current.revision },
    data: {
      status: 'DRAFT',
      publishedAt: null,
      revision: current.revision + 1,
    },
  });
  return toJobPostingDto(updated);
}

/**
 * Archive from DRAFT or PUBLISHED → ARCHIVED. ARCHIVED is TERMINAL.
 *   - From DRAFT: just sets archivedAt.
 *   - From PUBLISHED: sets archivedAt and clears publishedAt (state machine
 *     invariant: only one terminal status). Slug stays unchanged.
 *   - From ARCHIVED: rejected (terminal).
 *
 * Does NOT mutate JobOpening.status.
 */
export async function archiveJobPosting(
  tx: PrismaTypes.TransactionClient,
  ctx: AuthContext,
  input: ArchiveJobPostingInput,
): Promise<JobPostingDto> {
  assertMutationRole(ctx);

  // hrp-f9-hr-staff-jobposting-scope STEP-05: same extend-include pattern
  // as `unpublishJobPosting`. The scoped-recruiter re-check derives the
  // order anchor from `jobOpening.staffingOrderId` and fails closed.
  const current = await tx.jobPosting.findUnique({
    where: { id: input.jobPostingId },
    include: {
      jobOpening: { select: { id: true, staffingOrderId: true } },
    },
  });
  if (!current) {
    throw new AuthoringError(
      'NOT_FOUND',
      `JobPosting ${input.jobPostingId} không tồn tại.`,
      404,
    );
  }
  // F9 guard: AFTER NOT_FOUND, BEFORE state/revision guards. See
  // `updateDraftContent` for the rationale.
  if (current.jobOpening) {
    // hrp-f9-hr-staff-jobposting-scope correction batch 1/1 §F: advisory
    // lock participation (canonical primitive, no second namespace).
    await acquireOrderAdvisoryLock(tx, current.jobOpening.staffingOrderId);
    await assertHrStaffRecruiterScope(tx, ctx, current.jobOpening.staffingOrderId);
  }
  if (current.status === 'ARCHIVED') {
    throw new AuthoringError(
      'INVALID_STATE_TRANSITION',
      'JobPosting đã ở trạng thái ARCHIVED — không thể archive lại.',
      409,
      { currentStatus: current.status },
    );
  }
  if (current.revision !== input.expectedRevision) {
    throw new AuthoringError(
      'INVALID_REVISION',
      `Revision mismatch: client=${input.expectedRevision}, server=${current.revision}.`,
      409,
      { clientRevision: input.expectedRevision, serverRevision: current.revision },
    );
  }

  const updated = await tx.jobPosting.update({
    where: { id: current.id, revision: current.revision },
    data: {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      publishedAt: null,
      revision: current.revision + 1,
    },
  });
  return toJobPostingDto(updated);
}

// ─────────────────────────────────────────────────────────────────────────────
// Read helpers (for service-layer tests + admin API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * hrp-f9-hr-staff-jobposting-scope STEP-06: scoped-recruiter read helper.
 *
 * For HR_STAFF callers, derive the order anchor from the linked
 * JobOpening and re-check the scoped-recruiter authority. On miss, return
 * `null` (no existence oracle — the row IS in the database, but the caller
 * is not authorized to see it). ADMIN / HR_MANAGER bypass.
 *
 * The caller is responsible for opening the transaction with the right
 * `app.role` GUC via `withDbContext`. RLS still filters at the row level as
 * a backstop; the application-level guard is additive (defense in depth,
 * contract explicitness).
 */
export async function getJobPostingForAuthoring(
  tx: PrismaTypes.TransactionClient,
  ctx: AuthContext,
  id: string,
): Promise<JobPostingDto | null> {
  if (!id || typeof id !== 'string') return null;
  const row = await tx.jobPosting.findUnique({
    where: { id },
    include: {
      jobOpening: { select: { id: true, staffingOrderId: true } },
    },
  });
  if (!row) return null;
  if (row.jobOpening) {
    // F9 guard. For unassigned HR_STAFF on an active row, returns null
    // silently — no existence oracle. For ADMIN/HR_MANAGER, the helper
    // bypasses and the row is returned as before.
    try {
      await assertHrStaffRecruiterScope(tx, ctx, row.jobOpening.staffingOrderId);
    } catch (err) {
      if (err instanceof AuthoringError && err.code === 'NO_ACTIVE_ORDER_ASSIGNMENT') {
        return null;
      }
      throw err;
    }
  }
  return toJobPostingDto(row);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping helpers (private)
// ─────────────────────────────────────────────────────────────────────────────

interface JobPostingModelRow {
  id: string;
  jobOpeningId: string;
  slug: string;
  revision: number;
  status: string;
  title: string | null;
  salaryDisplay: string | null;
  descriptionJson: unknown;
  requirementsJson: unknown;
  benefitsJson: unknown;
  applicationInstructionsJson: unknown;
  contentSchemaVersion: number;
  // P1-A0.1 stamp flags — readonly; Prisma returns `boolean` for non-nullable columns.
  isHot: boolean;
  isUrgent: boolean;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface JobOpeningModelRow {
  id: string;
  staffingOrderId: string;
  staffingOrderSlotId: string | null;
  status: string;
  openedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toJobPostingDto(row: JobPostingModelRow): JobPostingDto {
  return {
    id: row.id,
    jobOpeningId: row.jobOpeningId,
    slug: row.slug,
    revision: row.revision,
    status: row.status as JobPostingLifecycleStatus,
    title: row.title,
    salaryDisplay: row.salaryDisplay,
    descriptionJson: row.descriptionJson,
    requirementsJson: row.requirementsJson,
    benefitsJson: row.benefitsJson,
    applicationInstructionsJson: row.applicationInstructionsJson,
    contentSchemaVersion: row.contentSchemaVersion,
    isHot: row.isHot,
    isUrgent: row.isUrgent,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toJobOpeningDto(row: JobOpeningModelRow): JobOpeningDto {
  return {
    id: row.id,
    staffingOrderId: row.staffingOrderId,
    staffingOrderSlotId: row.staffingOrderSlotId,
    status: row.status as JobOpeningLifecycleStatus,
    openedAt: row.openedAt ? row.openedAt.toISOString() : null,
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
