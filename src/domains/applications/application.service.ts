/**
 * application.service — MP-2 Apply + Tracking (STEP-02/03, RQ-02/03/04/09).
 *
 * The canonical public apply + tracking path. The anonymous write and the
 * public tracking read execute EXCLUSIVELY through the `hrp_public_rpc`-owned
 * SECURITY DEFINER functions `hrp_public_apply_submission(...)` /
 * `hrp_public_tracking_profile(code)` (DEC-08 + Owner decision 2026-08-31). This service NEVER touches
 * RLS context: it calls the functions via the app's normal connection
 * (`app_user_writer`) using `$queryRawUnsafe` with positional bind params, and
 * it MUST NOT set `app.role` to an authenticated role. No Worker/SourceClaim is
 * ever created for an anonymous applicant (EV-03/EV-08/DEC-01).
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import {
  normalizePhone,
  computeIdempotencyKeyHash,
  computeApplyPayloadHash,
  generateTrackingCode,
  validateCvMetadata,
  mapApplySqlState,
  CvValidationError,
  type CvMetaInput,
} from './apply-helpers';

export type DbClient = PrismaClient | Prisma.TransactionClient;

export interface PublicApplyInput {
  slug: string;
  slotId?: string | null;
  fullName: string;
  phone: string;
  cccdNumber?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  experience?: string | null;
  consentAt?: string | Date | null;
  idempotencyKey: string;
  cv?: CvMetaInput | null;
  cvStorageKey?: string | null;
}

export interface PublicApplyResult {
  trackingCode: string;
  status: string;
}

/**
 * Tracking projection for the holder of the 120-bit bearer tracking code.
 * Owner decision 2026-08-31: echo the three identity fields submitted by the
 * applicant for visual reconciliation; internal/normalized fields stay omitted.
 */
export interface PublicTrackingDto {
  trackingCode: string;
  status: string;
  statusLabel: string;
  nextStep: string;
  submittedAt: string | null;
  jobTitle: string | null;
  jobCode: string | null;
  positionTitle: string | null;
  fullName: string;
  phone: string;
  cccdNumber: string | null;
}

export class ApplicationServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationServiceError';
  }
}

function toIsoDateOnly(v: string | Date | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // yyyy-mm-dd
}

function toIsoTimestamp(v: string | Date | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// Human-facing status projection (safe, no internal semantics leaked).
const STATUS_LABEL: Record<string, { label: string; nextStep: string }> = {
  NEW: { label: 'Đã tiếp nhận', nextStep: 'Hồ sơ của bạn đã được ghi nhận và đang chờ xét duyệt.' },
  NEEDS_INFO: { label: 'Cần bổ sung thông tin', nextStep: 'Nhà tuyển dụng cần bạn bổ sung thêm thông tin.' },
  SCREENING: { label: 'Đang xét duyệt', nextStep: 'Hồ sơ của bạn đang được xem xét.' },
  QUALIFIED: { label: 'Đạt yêu cầu', nextStep: 'Bạn sẽ được liên hệ cho bước tiếp theo.' },
  REJECTED: { label: 'Chưa phù hợp', nextStep: 'Cảm ơn bạn đã ứng tuyển.' },
  WITHDRAWN: { label: 'Đã rút hồ sơ', nextStep: 'Hồ sơ đã được rút.' },
  CONVERTED: { label: 'Đã tiếp nhận làm việc', nextStep: 'Chúc mừng! Bạn sẽ nhận hướng dẫn tiếp theo.' },
};

function labelFor(status: string): { label: string; nextStep: string } {
  return STATUS_LABEL[status] ?? { label: status, nextStep: '' };
}

/**
 * Public apply — the ONLY anonymous write path. Computes idempotency/payload
 * hashes, a fresh tracking code and the normalized phone in Node, then delegates
 * the whole transaction (job/slot validation, idempotency replay, duplicate
 * guard, single INSERT + initial history) to the definer function.
 */
export async function submitPublicApplication(
  db: DbClient,
  input: PublicApplyInput,
): Promise<PublicApplyResult> {
  if (!input.idempotencyKey || input.idempotencyKey.trim().length === 0) {
    throw new ApplicationServiceError('IDEMPOTENCY_KEY_REQUIRED', 400, 'Idempotency key is required');
  }
  const slug = (input.slug ?? '').trim();
  const fullName = (input.fullName ?? '').trim();
  const normalizedPhone = normalizePhone(input.phone);
  if (!slug || !fullName || !normalizedPhone) {
    throw new ApplicationServiceError('VALIDATION', 400, 'slug, fullName and a valid phone are required');
  }
  if (!input.consentAt) {
    throw new ApplicationServiceError('CONSENT_REQUIRED', 422, 'Applicant consent is required');
  }

  // CV metadata (optional) — throws CvValidationError (mapped to 422 by route).
  const cv = validateCvMetadata(input.cv);

  const dob = toIsoDateOnly(input.dateOfBirth ?? null);
  const consentIso = toIsoTimestamp(input.consentAt);
  const slotId = input.slotId ?? null;

  const idempotencyKeyHash = computeIdempotencyKeyHash(input.idempotencyKey);
  const payloadHash = computeApplyPayloadHash({
    slug,
    slotId,
    fullName,
    normalizedPhone,
    cccdNumber: input.cccdNumber ?? null,
    dateOfBirth: dob,
    gender: input.gender ?? null,
    experience: input.experience ?? null,
    cvFileName: cv.cvFileName,
    cvMimeType: cv.cvMimeType,
    cvSizeBytes: cv.cvSizeBytes,
  });
  const trackingCode = generateTrackingCode();

  try {
    const rows = await db.$queryRawUnsafe<Array<{ tracking_code: string; status: string }>>(
      `SELECT tracking_code, status FROM hrp_public_apply_submission(
         $1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10::timestamptz, $11, $12, $13::integer, $14, $15, $16, $17
       )`,
      slug,
      slotId,
      fullName,
      input.phone ?? null,
      normalizedPhone,
      input.cccdNumber ?? null,
      dob,
      input.gender ?? null,
      input.experience ?? null,
      consentIso,
      cv.cvFileName,
      cv.cvMimeType,
      cv.cvSizeBytes,
      input.cvStorageKey ?? null,
      idempotencyKeyHash,
      payloadHash,
      trackingCode,
    );
    const row = rows[0];
    if (!row) {
      throw new ApplicationServiceError('APPLY_FAILED', 500, 'Apply function returned no row');
    }
    return { trackingCode: row.tracking_code, status: row.status };
  } catch (err) {
    if (err instanceof ApplicationServiceError) throw err;
    const mapped = mapApplySqlState(extractSqlState(err));
    if (mapped) {
      throw new ApplicationServiceError(mapped.error, mapped.status, mapped.error);
    }
    throw err;
  }
}

/**
 * Public tracking — safe projection via the definer function. Unknown/disabled
 * code yields null (route → generic 404) with no row-existence signal.
 */
export async function getPublicTracking(
  db: DbClient,
  trackingCode: string,
): Promise<PublicTrackingDto | null> {
  const code = (trackingCode ?? '').trim();
  if (!code) return null;
  const rows = await db.$queryRawUnsafe<
    Array<{
      tracking_code: string;
      status: string;
      submitted_at: Date | null;
      job_title: string | null;
      job_code: string | null;
      position_title: string | null;
      full_name: string;
      phone: string;
      cccd_number: string | null;
    }>
  >(`SELECT tracking_code, status, submitted_at, job_title, job_code, position_title,
            full_name, phone, cccd_number
       FROM hrp_public_tracking_profile($1)`, code);
  const row = rows[0];
  if (!row) return null;
  const { label, nextStep } = labelFor(row.status);
  return {
    trackingCode: row.tracking_code,
    status: row.status,
    statusLabel: label,
    nextStep,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    jobTitle: row.job_title,
    jobCode: row.job_code,
    positionTitle: row.position_title,
    fullName: row.full_name,
    phone: row.phone,
    cccdNumber: row.cccd_number,
  };
}

/** Extract a PG SQLSTATE from a Prisma raw-query error (P2010 wraps meta.code). */
function extractSqlState(err: unknown): string | undefined {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = err.meta as { code?: string } | undefined;
    if (meta?.code) return meta.code;
  }
  const anyErr = err as { code?: string; meta?: { code?: string } } | null;
  return anyErr?.meta?.code ?? anyErr?.code;
}

// Re-export for route mapping convenience.
export { CvValidationError };
