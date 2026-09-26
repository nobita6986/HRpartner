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
  | 'SLUG_COLLISION';

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

  // 1. Lock the slot row.
  const slotRows = await tx.$queryRaw<
    Array<{ id: string; staffing_order_id: string; job_opening_id: string | null }>
  >(Prisma.sql`SELECT id, staffing_order_id, job_opening_id FROM staffing_order_slots WHERE id = ${input.slotId} FOR UPDATE`);
  const slot = slotRows[0];
  if (!slot) {
    throw new AuthoringError('NOT_FOUND', `StaffingOrderSlot ${input.slotId} không tồn tại.`, 404);
  }

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
    include: { jobOpening: { select: { id: true, status: true } } },
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

  const current = await tx.jobPosting.findUnique({ where: { id: input.jobPostingId } });
  if (!current) {
    throw new AuthoringError(
      'NOT_FOUND',
      `JobPosting ${input.jobPostingId} không tồn tại.`,
      404,
    );
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

  const current = await tx.jobPosting.findUnique({ where: { id: input.jobPostingId } });
  if (!current) {
    throw new AuthoringError(
      'NOT_FOUND',
      `JobPosting ${input.jobPostingId} không tồn tại.`,
      404,
    );
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

export async function getJobPostingForAuthoring(
  tx: PrismaTypes.TransactionClient,
  id: string,
): Promise<JobPostingDto | null> {
  if (!id || typeof id !== 'string') return null;
  const row = await tx.jobPosting.findUnique({ where: { id } });
  if (!row) return null;
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
