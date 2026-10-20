import { SystemRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { matchesPhoneOtpDigest, phoneDigest, phoneOtpDigest, PHONE_OTP_MAX_ATTEMPTS } from '@/src/shared/auth/phone-otp';
import { SYSTEM_PHONE_OTP, withSystemDb } from '@/src/shared/auth/with-system-db';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { clientIpFromHeaders } from '@/src/shared/security/rate-limit-identity';
import { evaluateRateLimits } from '@/src/shared/security/rate-limit-guard';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';
import { readCappedJson } from '@/src/shared/security/request-body';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const routeClass = 'POST /api/auth/phone-otp/verify';
const schema = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();
const noStore = { 'Cache-Control': 'no-store' };

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers: noStore });
}

export async function POST(req: NextRequest) {
  const requestId = getCorrelationId(req.headers);
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return fail(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập lại.'); }
  if (ctx.role !== SystemRole.WORKER) return fail(403, 'FORBIDDEN', 'Chỉ tài khoản người lao động được xác minh số điện thoại.');
  const rateLimit = await evaluateRateLimits({ buckets: [{ rule: RATE_LIMIT_RULES.PHONE_OTP_VERIFY_IP, value: clientIpFromHeaders(req.headers, process.env) }], routeClass, requestId });
  if (rateLimit.kind === 'unavailable') return fail(503, 'OTP_SERVICE_UNAVAILABLE', 'Dịch vụ xác thực OTP đang tạm thời gián đoạn.');
  if (rateLimit.kind === 'rate-limited') return NextResponse.json({ ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' } }, { status: 429, headers: { ...noStore, 'Retry-After': String(rateLimit.decision.retryAfterSec) } });
  const read = await readCappedJson<Record<string, unknown>>(req);
  if (!read.ok) return fail(read.response.status, 'VALIDATION_ERROR', 'Dữ liệu yêu cầu không hợp lệ.');
  const parsed = schema.safeParse(read.value);
  if (!parsed.success) return fail(400, 'VALIDATION_ERROR', 'Mã xác thực gồm 6 chữ số.');
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return fail(503, 'OTP_SERVICE_UNAVAILABLE', 'Dịch vụ xác thực OTP đang tạm thời gián đoạn.');

  const now = new Date();
  try {
    const result = await withSystemDb(getPrisma(), SYSTEM_PHONE_OTP, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${ctx.userId}, 0))`;
      const user = await tx.user.findUnique({ where: { id: ctx.userId }, select: { phone: true, phoneVerified: true, phoneVerifiedAt: true } });
      if (!user) return { kind: 'missing' as const };
      if (user.phoneVerified) return { kind: 'verified' as const, verifiedAt: user.phoneVerifiedAt ?? now };
      const challenge = await tx.phoneOtpChallenge.findUnique({ where: { userId: ctx.userId } });
      if (!challenge || !challenge.isSent || challenge.expiresAt <= now || !user.phone || challenge.phoneHash !== phoneDigest(secret, ctx.userId, user.phone)) return { kind: 'invalid' as const };
      if (challenge.attempts >= PHONE_OTP_MAX_ATTEMPTS) return { kind: 'attempt_limit' as const };
      const digest = phoneOtpDigest(secret, ctx.userId, user.phone, parsed.data.code);
      if (!matchesPhoneOtpDigest(challenge.codeHash, digest)) {
        await tx.phoneOtpChallenge.update({ where: { userId: ctx.userId }, data: { attempts: { increment: 1 } } });
        return { kind: 'invalid' as const };
      }
      const updated = await tx.user.update({ where: { id: ctx.userId }, data: { phoneVerified: true, phoneVerifiedAt: now }, select: { phoneVerifiedAt: true } });
      await tx.phoneOtpChallenge.delete({ where: { userId: ctx.userId } });
      return { kind: 'verified' as const, verifiedAt: updated.phoneVerifiedAt ?? now };
    });
    if (result.kind === 'missing') return fail(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập lại.');
    if (result.kind === 'attempt_limit') return fail(429, 'RATE_LIMIT_EXCEEDED', 'Bạn đã nhập sai quá nhiều lần. Hãy yêu cầu mã mới.');
    if (result.kind === 'invalid') return fail(400, 'OTP_INVALID_OR_EXPIRED', 'Mã xác thực không đúng hoặc đã hết hạn.');
    return NextResponse.json({ ok: true, data: { phoneVerified: true, verifiedAt: result.verifiedAt.toISOString() } }, { headers: noStore });
  } catch {
    return fail(503, 'OTP_SERVICE_UNAVAILABLE', 'Dịch vụ xác thực OTP đang tạm thời gián đoạn.');
  }
}
