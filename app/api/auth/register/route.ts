import { SystemRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { createUnverifiedWorkerAccount, PublicRegistrationError } from '@/src/shared/auth/preauth-db';
import { signJwt, JWT_TTL_SECONDS } from '@/src/shared/auth/jwt';
import { AUTH_COOKIE_NAME } from '@/src/shared/auth/user';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { clientIpFromHeaders } from '@/src/shared/security/rate-limit-identity';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';
import { enforceRateLimits } from '@/src/shared/security/rate-limit-guard';
import { readCappedJson } from '@/src/shared/security/request-body';
import { normalizePhone } from '@/src/domains/applications/apply-helpers';
import { error as logError } from '@/src/shared/observability/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const routeClass = 'POST /api/auth/register';
const schema = z.object({
  phone: z.string().trim().min(8).max(20).regex(/^[0-9+()\-\s]+$/),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(1).max(200),
}).strict();

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const requestId = getCorrelationId(req.headers);
  const ipDenied = await enforceRateLimits({
    buckets: [{ rule: RATE_LIMIT_RULES.APPLY_IP, value: clientIpFromHeaders(req.headers, process.env) }],
    routeClass,
    requestId,
  });
  if (ipDenied) return ipDenied;

  const read = await readCappedJson<Record<string, unknown>>(req);
  if (!read.ok) {
    const status = read.response.status;
    return errorResponse(status, status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 415 ? 'UNSUPPORTED_MEDIA_TYPE' : 'INVALID_JSON', 'Không thể đọc dữ liệu đăng ký.');
  }
  const parsed = schema.safeParse(read.value);
  if (!parsed.success) return errorResponse(400, 'VALIDATION_ERROR', 'Vui lòng kiểm tra họ tên, số điện thoại và mật khẩu (tối thiểu 8 ký tự).');

  const phone = normalizePhone(parsed.data.phone);
  if (!/^0\d{9}$/.test(phone)) return errorResponse(400, 'VALIDATION_ERROR', 'Số điện thoại Việt Nam không hợp lệ.');

  const phoneDenied = await enforceRateLimits({
    buckets: [{ rule: RATE_LIMIT_RULES.APPLY_PHONE, value: phone }],
    routeClass,
    requestId,
  });
  if (phoneDenied) return phoneDenied;

  try {
    const user = await createUnverifiedWorkerAccount(getPrisma(), {
      phone,
      fullName: parsed.data.fullName,
      password: parsed.data.password,
    });
    if (user.role !== SystemRole.WORKER) return errorResponse(500, 'INTERNAL', 'Không thể tạo tài khoản lúc này.');

    const token = await signJwt(user.id, SystemRole.WORKER);
    const mobile = req.headers.get('x-hrp-client')?.trim().toLowerCase() === 'android';
    const res = NextResponse.json({
      ok: true,
      data: {
        userId: user.id,
        phone: user.phone,
        fullName: user.name,
        role: user.role,
        phoneVerified: false,
        ...(mobile ? { token } : {}),
      },
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } });

    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.headers.append('Set-Cookie', `${AUTH_COOKIE_NAME}=${token}; Path=/; Max-Age=${JWT_TTL_SECONDS}; HttpOnly; SameSite=Lax${secure}`);
    if (process.env.NODE_ENV === 'production') {
      res.headers.append('Set-Cookie', `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure; Domain=.hrpartner.vn`);
    }
    return res;
  } catch (error) {
    if (error instanceof PublicRegistrationError || (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002')) {
      return errorResponse(409, 'PHONE_ALREADY_REGISTERED', 'Không thể tạo tài khoản với thông tin này. Nếu đã có tài khoản, vui lòng đăng nhập.');
    }
    logError('auth.register.error', requestId, {
      route: routeClass,
      outcome: 'registration_failed',
      errorCode: typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'UNCLASSIFIED',
    });
    return errorResponse(503, 'REGISTRATION_UNAVAILABLE', 'Đăng ký đang tạm thời gián đoạn. Vui lòng thử lại sau.');
  }
}
