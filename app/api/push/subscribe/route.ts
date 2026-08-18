/**
 * POST /api/push/subscribe — P1 Portals STEP-05 (RQ-05).
 *
 * DEC-05: Web Push subscription endpoint.
 * Stores in push_subscriptions (UNIQUE(userId, endpoint) ensures idempotent re-subscribe).
 * Graceful when VAPID keys missing — feature flag off.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { isPushAvailable } from '@/src/shared/feature-flags';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export async function POST(req: NextRequest) {
  if (!isPushAvailable()) {
    return NextResponse.json({
      ok: true,
      message: 'Push disabled — VAPID keys missing or feature flag off',
      enabled: false,
    });
  }

  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
  }

  const prisma = getPrisma();

  try {
    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: ctx.userId, endpoint: parsed.data.endpoint } },
      create: {
        userId: ctx.userId,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
      },
      update: {
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
      },
    });

    return NextResponse.json({ ok: true, enabled: true });
  } catch (err) {
    console.error('[push/subscribe]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
