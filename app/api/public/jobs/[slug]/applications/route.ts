import { NextRequest, NextResponse } from 'next/server';
import {
  submitPublicApplication,
  ApplicationServiceError,
} from '@/src/domains/applications/application.service';
import { CvValidationError, normalizePhone } from '@/src/domains/applications/apply-helpers';
import { getPrisma } from '@/src/lib/db';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { clientIpFromHeaders } from '@/src/shared/security/rate-limit-identity';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';
import { enforceRateLimits } from '@/src/shared/security/rate-limit-guard';
import { readCappedJson } from '@/src/shared/security/request-body';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ApplyBody {
  fullName?: string;
  phone?: string;
  // hrp-p1-a1: canonical slot resolution belongs SERVER-SIDE via JobPosting → JobOpening →
  // StaffingOrder → StaffingOrderSlot. The apply RPC re-validates the chain atomically and
  // ignores any browser-supplied slotId/projectId/jobOpeningId (defense in depth). The route
  // explicitly REJECTS these fields at the shape gate so a tampered client cannot pin a
  // slot that the canonical picker would have skipped.
  projectId?: never;
  jobOpeningId?: never;
  slotId?: never;
  cccdNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  experience?: string | null;
  consentAt?: string | null;
  consent?: boolean;
  cv?: unknown;
}

type RouteParams = { params: Promise<{ slug: string }> };

/** RQ-06: shape CHẶT — mọi field ngoài danh sách này bị từ chối trước khi chạm DB. */
const ACCEPTED_FIELDS = new Set([
  'fullName',
  'phone',
  'cccdNumber',
  'dateOfBirth',
  'gender',
  'experience',
  'consentAt',
  'consent',
  'cv',
]);
const STRING_FIELDS = [
  'fullName',
  'phone',
  'cccdNumber',
  'dateOfBirth',
  'gender',
  'experience',
  'consentAt',
] as const;

/**
 * hrp-p1-a1: prove-of-fix cho DEC-04. Các field này là OUTPUT của phép giải canonical
 * JobPosting → JobOpening → StaffingOrder → Slot, do RPC tự derive; một client gửi chúng
 * là đang cố ghim một trong những bước trung gian, và gateway phải fail closed.
 */
const FORBIDDEN_PROVENANCE_FIELDS = new Set(['slotId', 'projectId', 'jobOpeningId']);

/** Trả mã lỗi khi shape sai; KHÔNG echo lại nội dung body (DEC-12). */
function shapeViolation(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (!ACCEPTED_FIELDS.has(key)) {
      // hrp-p1-a1: surface provenance-field rejection separately so the caller can debug
      // without leaking the canonical schema (the field is forbidden, not unknown).
      if (FORBIDDEN_PROVENANCE_FIELDS.has(key)) {
        return `Field "${key}" do client cung cấp bị từ chối: chỗ trống/dự án/đơn được suy ra server-side từ JobPosting slug.`;
      }
      return 'Body chứa field không được hỗ trợ.';
    }
  }
  for (const key of STRING_FIELDS) {
    const v = body[key];
    if (v !== undefined && v !== null && typeof v !== 'string') return 'Field phải là chuỗi.';
  }
  if (body.consent !== undefined && typeof body.consent !== 'boolean') {
    return 'Field consent phải là boolean.';
  }
  return null;
}

/** P1-B: one canonical transport — standard Idempotency-Key header, UUID only. */
function extractIdempotencyKey(req: NextRequest): string {
  return (req.headers.get('idempotency-key') ?? '').trim();
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: 'INVALID_INPUT', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
}

// Canonical public apply (MP-2 DEC-01/RQ-02/RQ-09 + OPS-06A RQ-05/06/09): the ONLY
// forward-facing apply URL and the ONLY anonymous write. Delegates the entire write
// to the SECURITY DEFINER boundary; never creates a Worker/SourceClaim and never
// sets app.role. Idempotency key is REQUIRED (4.3).
//
// OPS-06A thứ tự phòng thủ (RQ-05/06):
//   1. APPLY_IP bucket TRƯỚC khi đọc/parse body  → flood không tốn parse, zero DB.
//   2. Media-type gate 415 + trần 16 KiB 413      → payload lớn không vào RAM (DEC-09).
//   3. Shape chặt 400, `cv` non-null → 422 CV_UPLOAD_DISABLED (surface CV đã tắt).
//   4. APPLY_PHONE bucket TRƯỚC transaction        → deny không tạo history/idempotency row.
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const requestId = getCorrelationId(req.headers);
  const routeClass = 'POST /api/public/jobs/[slug]/applications';

  const ipDenied = await enforceRateLimits({
    buckets: [{ rule: RATE_LIMIT_RULES.APPLY_IP, value: clientIpFromHeaders(req.headers, process.env) }],
    routeClass,
    requestId,
  });
  if (ipDenied) return ipDenied;

  const read = await readCappedJson<ApplyBody & Record<string, unknown>>(req);
  if (!read.ok) return read.response;
  const body = read.value;

  const violation = shapeViolation(body);
  if (violation) return badRequest(violation);

  // DEC-09: surface CV đã tắt. `cv: null` được chấp nhận cho tương thích client cũ,
  // mọi giá trị non-null bị từ chối và KHÔNG metadata nào được lưu.
  if (body.cv !== undefined && body.cv !== null) {
    return NextResponse.json(
      { error: 'CV_UPLOAD_DISABLED', message: 'Tính năng tải CV hiện đang tắt. Vui lòng gửi hồ sơ không kèm CV.' },
      { status: 422, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const normalizedPhone = normalizePhone(body.phone);
  if (normalizedPhone.length > 0) {
    const phoneDenied = await enforceRateLimits({
      buckets: [{ rule: RATE_LIMIT_RULES.APPLY_PHONE, value: normalizedPhone }],
      routeClass,
      requestId,
    });
    if (phoneDenied) return phoneDenied;
  }

  const idempotencyKey = extractIdempotencyKey(req);
  if (!idempotencyKey || !isUuidLike(idempotencyKey)) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Header Idempotency-Key (UUID) is required' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  // consent may arrive as a boolean flag or an explicit timestamp.
  const consentAt = body.consentAt ?? (body.consent === true ? new Date().toISOString() : null);

  const prisma = getPrisma();
  try {
    // hrp-p1-a1: server-side slot derivation via the canonical JobPosting chain. The
    // SECURITY DEFINER RPC re-validates JobPosting.status='PUBLISHED' AND
    // JobOpening.status='OPEN' AND StaffingOrder.status IN (OPEN/CLOSING_SOON) inside the
    // same transaction, so the route cannot leak a stale slot.
    const result = await prisma.$transaction((tx) =>
      submitPublicApplication(tx, {
        slug,
        // slotId omitted → RPC picks the deterministic next available slot from the chain.
        fullName: body.fullName ?? '',
        phone: body.phone ?? '',
        cccdNumber: body.cccdNumber ?? null,
        dateOfBirth: body.dateOfBirth ?? null,
        gender: body.gender ?? null,
        experience: body.experience ?? null,
        consentAt,
        idempotencyKey,
        cv: null,
      }),
    );
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof CvValidationError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 422 });
    }
    if (e instanceof ApplicationServiceError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.httpStatus });
    }
    console.error('[public apply] unexpected error', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Internal server error' }, { status: 500 });
  }
}
