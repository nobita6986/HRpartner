/**
 * POST /api/push/register-device — T1A Android backend mobile contract (TASK DEC-05).
 *
 * WORKER đăng ký FCM token cho push notification. KHÔNG triển khai gửi FCM trong
 * task này — chỉ lưu token.
 *
 * AUTH: AuthContext (Bearer-first fail-closed qua getTokenFromRequest) + gate
 * role WORKER (role khác → 403).
 *
 * IDENTITY: userId suy ra TỪ AuthContext (ctx.userId) — KHÔNG nhận userId từ body
 * (body supplied userId bị phớt và validation fail nếu có key lạ).
 *
 * STORAGE: upsert theo unique (userId, fcmToken) — idempotent re-register; FK
 * users ON DELETE CASCADE (xóa User dọn token). RLS FORCE policy chỉ cho chủ sở
 * hữu token qua GUC self (migration 20261018120000_mobile_device_token_with_rls).
 *
 * LOGGING: KHÔNG BAO GIỜ log FCM token (payload nhạy cảm — 00-global-rules §3).
 * Lỗi ghi có chủ đích KHÔNG chứa token trong message/metadata.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';

const registerDeviceSchema = z.object({
  // Android contract (DeviceRegistrationRequest): { token, deviceType, model }.
  token: z.string().trim().min(1).max(16384),
  deviceType: z.enum(['ANDROID', 'IOS']).default('ANDROID'),
  model: z.string().trim().min(1).max(255).optional(),
});

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (ctx.role !== 'WORKER') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Endpoint chỉ dành cho role WORKER' },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const parsed = registerDeviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // userId LUÔN từ server context — đã role gate WORKER phía trên.
  const userId = ctx.userId;

  const prisma = getPrisma();

  try {
    await withDbContext(prisma, ctx, (tx) =>
      tx.mobileDeviceToken.upsert({
        where: { userId_fcmToken: { userId, fcmToken: parsed.data.token } },
        create: {
          userId,
          fcmToken: parsed.data.token,
          deviceType: parsed.data.deviceType,
          model: parsed.data.model ?? null,
        },
        update: {
          deviceType: parsed.data.deviceType,
          model: parsed.data.model ?? null,
        },
      }),
    );

    // Response KHÔNG echo token — chỉ xác nhận đăng ký + deviceId.
    return NextResponse.json({ ok: true, enabled: true });
  } catch (err) {
    // Log lỗi KHÔNG chứa token (chỉ code/prisma error code — 00-global-rules §3).
    const errorCode =
      typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : 'UNCLASSIFIED';
    console.error('[push/register-device] upsert failed:', { errorCode });
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
