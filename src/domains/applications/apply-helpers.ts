/**
 * apply-helpers — MP-2 Apply + Tracking (STEP-02, RQ-02/03/09).
 *
 * Pure, side-effect-free helpers for the public apply funnel. Everything that
 * can be computed in Node (phone normalization, idempotency/payload hashing,
 * tracking-code minting, CV metadata validation, SQLSTATE→HTTP mapping) lives
 * here so it is unit-testable WITHOUT a database. The values produced here are
 * passed INTO `hrp_public_apply_submission(...)`; the SECURITY DEFINER function
 * treats the tracking code as opaque and, on idempotent replay, returns the
 * STORED code (see prisma/migrations/20260823101500_mp2_apply_tracking).
 *
 * DEC-03 idempotency, DEC-04 duplicate guard, DEC-07 CV metadata allow-list.
 */
import { createHash, randomBytes } from 'node:crypto';

// ─── Phone normalization (duplicate-guard key, DEC-04) ──────────────────────
// Canonical VN form: trunk-0 national number, digits only. All of
// "+84909123456", "0084909123456", "84909123456", "0909 123 456",
// "0909-123-456" collapse to "0909123456".
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  let d = String(raw).replace(/[\s().\-]/g, '');
  if (d.startsWith('+84')) d = '0' + d.slice(3);
  else if (d.startsWith('0084')) d = '0' + d.slice(4);
  else if (d.startsWith('84') && !d.startsWith('0')) d = '0' + d.slice(2);
  return d.replace(/\D/g, '');
}

// ─── Hashing (DEC-03) ───────────────────────────────────────────────────────
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** Server-stored hash of the CLIENT idempotency key (never store the raw key). */
export function computeIdempotencyKeyHash(clientKey: string): string {
  return sha256Hex(`mp2-apply-key:${clientKey}`);
}

/** Semantic apply payload, hashed in a FIXED field order so key-order and
 *  transport formatting never change the hash (DEC-03 payload-mismatch guard). */
export interface CanonicalApplyPayload {
  slug: string;
  slotId: string | null;
  fullName: string;
  normalizedPhone: string;
  cccdNumber: string | null;
  dateOfBirth: string | null; // ISO yyyy-mm-dd
  gender: string | null;
  experience: string | null;
  cvFileName: string | null;
  cvMimeType: string | null;
  cvSizeBytes: number | null;
}

export function computeApplyPayloadHash(p: CanonicalApplyPayload): string {
  const canonical = JSON.stringify([
    (p.slug ?? '').trim(),
    p.slotId ?? null,
    (p.fullName ?? '').trim(),
    p.normalizedPhone ?? '',
    p.cccdNumber ?? null,
    p.dateOfBirth ?? null,
    p.gender ?? null,
    (p.experience ?? null) === null ? null : String(p.experience).trim(),
    p.cvFileName ?? null,
    p.cvMimeType ?? null,
    p.cvSizeBytes ?? null,
  ]);
  return sha256Hex(canonical);
}

// ─── Tracking code (DEC-02 / 4.3: high-entropy, non-sequential, non-PII) ────
// Crockford base32 (no I/L/O/U) over 15 random bytes → 120 bits, grouped for
// readability. NEVER the submission UUID.
const CROCKFORD32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateTrackingCode(byteLen = 15): string {
  const buf = randomBytes(byteLen);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += CROCKFORD32[(value << (5 - bits)) & 31];
  const grouped = out.match(/.{1,4}/g)!.join('-');
  return `APP-${grouped}`;
}

// ─── CV metadata validation (DEC-07: metadata only, allow-list, ≤5 MiB) ─────
export const ALLOWED_CV_MIME = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_CV_BYTES = 5 * 1024 * 1024;

export interface CvMetaInput {
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}
export interface CvMetaValidated {
  cvFileName: string | null;
  cvMimeType: string | null;
  cvSizeBytes: number | null;
}

export class CvValidationError extends Error {
  constructor(
    public readonly code: 'CV_MIME_NOT_ALLOWED' | 'CV_TOO_LARGE' | 'CV_METADATA_INCOMPLETE',
    message: string,
  ) {
    super(message);
    this.name = 'CvValidationError';
  }
}

export function validateCvMetadata(meta?: CvMetaInput | null): CvMetaValidated {
  // CV is optional; absence of every field means "no CV".
  if (!meta || (!meta.fileName && !meta.mimeType && (meta.sizeBytes ?? null) === null)) {
    return { cvFileName: null, cvMimeType: null, cvSizeBytes: null };
  }
  const mime = (meta.mimeType ?? '').toLowerCase();
  if (!ALLOWED_CV_MIME.includes(mime as (typeof ALLOWED_CV_MIME)[number])) {
    throw new CvValidationError('CV_MIME_NOT_ALLOWED', `CV MIME "${mime}" not allowed (PDF/JPEG/PNG only)`);
  }
  const size = meta.sizeBytes ?? -1;
  if (!Number.isInteger(size) || size <= 0) {
    throw new CvValidationError('CV_METADATA_INCOMPLETE', 'CV size (bytes) must be a positive integer');
  }
  if (size > MAX_CV_BYTES) {
    throw new CvValidationError('CV_TOO_LARGE', `CV exceeds ${MAX_CV_BYTES} bytes`);
  }
  return { cvFileName: meta.fileName ?? null, cvMimeType: mime, cvSizeBytes: size };
}

// ─── SQLSTATE → HTTP (raised by hrp_public_apply_submission) ────────────────
export interface ApplyHttpError {
  status: number;
  error: string;
}

export function mapApplySqlState(code: string | undefined): ApplyHttpError | null {
  switch (code) {
    case 'P0002':
      return { status: 400, error: 'INVALID_INPUT' };
    case 'P0010':
      return { status: 409, error: 'IDEMPOTENCY_PAYLOAD_MISMATCH' };
    case 'P0011':
      return { status: 404, error: 'JOB_NOT_AVAILABLE' };
    case 'P0012':
      return { status: 409, error: 'DUPLICATE_APPLICATION' };
    default:
      return null;
  }
}
