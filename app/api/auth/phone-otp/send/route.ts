import { SystemRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { phoneDigest, phoneOtpDigest, newPhoneOtp, readEtrustOtpConfig, sendEtrustOtp, PHONE_OTP_COOLDOWN_SECONDS, PHONE_OTP_MAX_SENDS_PER_WINDOW, PHONE_OTP_SEND_WINDOW_MS, PHONE_OTP_TTL_MS } from '@/src/shared/auth/phone-otp';
import { decryptEtrustCredential } from '@/src/shared/auth/etrust-credential-vault';
import { SYSTEM_PHONE_OTP, withSystemDb } from '@/src/shared/auth/with-system-db';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { clientIpFromHeaders } from '@/src/shared/security/rate-limit-identity';
import { evaluateRateLimits } from '@/src/shared/security/rate-limit-guard';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';
import { readCappedJson } from '@/src/shared/security/request-body';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const routeClass = 'POST /api/auth/phone-otp/send';
const schema = z.object({ phone: z.string().regex(/^0\d{9}$/) }).strict();
const noStore = { 'Cache-Control': 'no-store' };

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers: noStore });
}

export async function POST(req: NextRequest) {
  const requestId = getCorrelationId(req.headers);
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return fail(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập lại.'); }
  if (ctx.role !== SystemRole.WORKER) return fail(403, 'FORBIDDEN', 'Chỉ tài khoản người lao động được xác minh số điện thoại.');

  const rateLimit = await evaluateRateLimits({ buckets: [{ rule: RATE_LIMIT_RULES.PHONE_OTP_SEND_IP, value: clientIpFromHeaders(req.headers, process.env) }], routeClass, requestId });
  if (rateLimit.kind === 'unavailable') return fail(503, 'OTP_SERVICE_UNAVAILABLE', 'Dịch vụ xác thực OTP đang tạm thời gián đoạn.');
  if (rateLimit.kind === 'rate-limited') return NextResponse.json({ ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' } }, { status: 429, headers: { ...noStore, 'Retry-After': String(rateLimit.decision.retryAfterSec) } });
  const read = await readCappedJson<Record<string, unknown>>(req);
  if (!read.ok) return fail(read.response.status, 'VALIDATION_ERROR', 'Dữ liệu yêu cầu không hợp lệ.');
  const parsed = schema.safeParse(read.value);
  if (!parsed.success) return fail(400, 'VALIDATION_ERROR', 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.');

  const secret = process.env.JWT_SECRET;
  const prisma = getPrisma();
  if (!secret || secret.length < 32) return fail(503, 'OTP_SERVICE_UNAVAILABLE', 'Dịch vụ xác thực OTP đang tạm thời gián đoạn.');
  let config;
  try {
    const credentials = await withSystemDb(prisma, SYSTEM_PHONE_OTP, (tx) => tx.etrustOtpCredential.findUnique({ where: { id: 'primary' } }));
    if (!credentials) return fail(503, 'OTP_SERVICE_UNAVAILABLE', 'Quản trị viên chưa cấu hình nhà cung cấp OTP.');
    config = readEtrustOtpConfig(decryptEtrustCredential(credentials.apiKeyCiphertext), decryptEtrustCredential(credentials.secretKeyCiphertext));
  } catch {
    return fail(503, 'OTP_SERVICE_UNAVAILABLE', 'Dịch vụ xác thực OTP đang tạm thời gián đoạn.');
  }
  if (!config) return fail(503, 'OTP_SERVICE_UNAVAILABLE', 'Dịch vụ xác thực OTP chưa được cấu hình đầy đủ.');
  const code = newPhoneOtp();
  const now = new Date();
  const codeHash = phoneOtpDigest(secret, ctx.userId, parsed.data.phone, code);
  const phoneHash = phoneDigest(secret, ctx.userId, parsed.data.phone);
  let reservation: 'reserved' | 'already_verified' | 'cooldown' | 'send_limit' | 'phone_mismatch' | 'not_found';
  try {
    reservation = await withSystemDb(prisma, SYSTEM_PHONE_OTP, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${ctx.userId}, 0))`;
      const user = await tx.user.findUnique({ where: { id: ctx.userId }, select: { phone: true, phoneVerified: true } });
      if (!user) return 'not_found';
      if (user.phoneVerified) return 'already_verified';
      if (user.phone !== parsed.data.phone) return 'phone_mismatch';

      const challenge = await tx.phoneOtpChallenge.findUnique({ where: { userId: ctx.userId } });
      if (challenge && challenge.cooldownUntil > now) return 'cooldown';
      const inWindow = challenge && now.getTime() - challenge.sendWindowStartedAt.getTime() < PHONE_OTP_SEND_WINDOW_MS;
      if (inWindow && challenge.sendsInWindow >= PHONE_OTP_MAX_SENDS_PER_WINDOW) return 'send_limit';
      const windowStart = inWindow ? challenge.sendWindowStartedAt : now;
      const sendsInWindow = inWindow ? challenge.sendsInWindow + 1 : 1;
      const values = { codeHash, phoneHash, expiresAt: new Date(now.getTime() + PHONE_OTP_TTL_MS), cooldownUntil: new Date(now.getTime() + PHONE_OTP_COOLDOWN_SECONDS * 1000), sendWindowStartedAt: windowStart, sendsInWindow, attempts: 0, isSent: false };
      await tx.phoneOtpChallenge.upsert({ where: { userId: ctx.userId }, create: { userId: ctx.userId, ...values }, update: values });
      return 'reserved';
    });
  } catch {
    return fail(503, 'OTP_SERVICE_UNAVAILABLE', 'Dịch vụ xác thực OTP đang tạm thời gián đoạn.');
  }

  if (reservation === 'already_verified') return NextResponse.json({ ok: true, data: { sent: false, phoneVerified: true, cooldownSeconds: 0 } }, { headers: noStore });
  if (reservation === 'not_found') return fail(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập lại.');
  if (reservation === 'phone_mismatch') return fail(400, 'VALIDATION_ERROR', 'Số điện thoại không khớp với tài khoản hiện tại.');
  if (reservation === 'cooldown') return fail(429, 'RATE_LIMIT_EXCEEDED', 'Vui lòng đợi trước khi yêu cầu mã mới.');
  if (reservation === 'send_limit') return fail(429, 'RATE_LIMIT_EXCEEDED', 'Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau một giờ.');

  let delivered = false;
  try { delivered = await sendEtrustOtp(config, parsed.data.phone, code); } catch { /* Provider errors are deliberately not logged. */ }
  if (!delivered) return fail(503, 'OTP_SERVICE_UNAVAILABLE', 'Không gửi được mã xác thực. Vui lòng thử lại sau.');

  try {
    await withSystemDb(prisma, SYSTEM_PHONE_OTP, (tx) => tx.phoneOtpChallenge.updateMany({ where: { userId: ctx.userId, codeHash }, data: { isSent: true } }));
  } catch {
    return fail(503, 'OTP_SERVICE_UNAVAILABLE', 'Dịch vụ xác thực OTP đang tạm thời gián đoạn.');
  }
  return NextResponse.json({ ok: true, data: { sent: true, cooldownSeconds: PHONE_OTP_COOLDOWN_SECONDS } }, { headers: noStore });
}
