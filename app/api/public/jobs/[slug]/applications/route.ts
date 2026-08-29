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
  slotId?: string | null;
  cccdNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  experience?: string | null;
  consentAt?: string | null;
  consent?: boolean;
  idempotencyKey?: string;
  cv?: unknown;
}

type RouteParams = { params: Promise<{ slug: string }> };

/** RQ-06: shape CHẶT — mọi field ngoài danh sách này bị từ chối trước khi chạm DB. */
const ACCEPTED_FIELDS = new Set([
  'fullName',
  'phone',
  'slotId',
  'cccdNumber',
  'dateOfBirth',
  'gender',
  'experience',
  'consentAt',
  'consent',
  'idempotencyKey',
  'cv',
]);
const STRING_FIELDS = [
  'fullName',
  'phone',
  'slotId',
  'cccdNumber',
  'dateOfBirth',
  'gender',
  'experience',
  'consentAt',
  'idempotencyKey',
] as const;

/** Trả mã lỗi khi shape sai; KHÔNG echo lại nội dung body (DEC-12). */
function shapeViolation(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (!ACCEPTED_FIELDS.has(key)) return 'Body chứa field không được hỗ trợ.';
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

/** Idempotency key: header (standard or x- variant) then body. */
function extractIdempotencyKey(req: NextRequest, body: ApplyBody): string {
  return (
    req.headers.get('idempotency-key') ??
    req.headers.get('x-idempotency-key') ??
    body.idempotencyKey ??
    ''
  ).trim();
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

  const idempotencyKey = extractIdempotencyKey(req, body);
  // consent may arrive as a boolean flag or an explicit timestamp.
  const consentAt = body.consentAt ?? (body.consent === true ? new Date().toISOString() : null);

  const prisma = getPrisma();
  try {
    const result = await prisma.$transaction((tx) =>
      submitPublicApplication(tx, {
        slug,
        slotId: body.slotId ?? null,
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
