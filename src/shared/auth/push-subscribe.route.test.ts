/**
 * push-subscribe.route.test.ts — V5-M1-06c / RQ-06 / STEP-06 / AC-06.
 *
 * UNIT (no DB): `POST /api/push/subscribe`.
 * PushSubscription chưa có builder → user-scoped ghi qua withDbContext (L2 GUC),
 * UNIQUE(userId, endpoint) giữ idempotent. Không dùng L1 (upsert không thuộc L1 ALL_OPS).
 *   - push off → 200 enabled:false KHÔNG auth/DB; unauth → 401; body sai → 400;
 *     hợp lệ → 200 enabled:true, upsert scoped theo ctx.userId.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  isPushAvailable: vi.fn(),
  upsert: vi.fn(),
  dbContext: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {},
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/feature-flags', () => ({ isPushAvailable: mocks.isPushAvailable }));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) => mocks.dbContext(cb),
}));

import { POST } from '@/app/api/push/subscribe/route';

const tx = () => ({ pushSubscription: { upsert: mocks.upsert } });

const VALID = { endpoint: 'https://push.example.com/abc', p256dh: 'k256', auth: 'authk' };
const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

describe('push subscribe (RQ-06 / AC-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPushAvailable.mockReturnValue(true);
    mocks.upsert.mockResolvedValue({ id: 's1' });
    mocks.dbContext.mockImplementation((cb: (t: unknown) => unknown) => cb(tx()));
  });

  it('push OFF → 200 enabled:false, KHÔNG auth/DB', async () => {
    mocks.isPushAvailable.mockReturnValue(false);
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.enabled).toBe(false);
    expect(mocks.getAuthContext).not.toHaveBeenCalled();
    expect(mocks.dbContext).not.toHaveBeenCalled();
  });

  it('unauth (getAuthContext throw) → 401', async () => {
    mocks.getAuthContext.mockRejectedValueOnce(new Error('no cookie'));
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(401);
    expect(mocks.dbContext).not.toHaveBeenCalled();
  });

  it('body sai (endpoint không phải URL) → 400, KHÔNG ghi', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'WORKER' });
    const res = await POST(postReq({ endpoint: 'not-a-url', p256dh: 'k', auth: 'a' }));
    expect(res.status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('hợp lệ → 200 enabled:true, upsert scoped theo ctx.userId', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER' });
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, enabled: true });
    expect(mocks.dbContext).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    const arg = mocks.upsert.mock.calls[0][0] as {
      where: { userId_endpoint: { userId: string; endpoint: string } };
      create: { userId: string };
    };
    expect(arg.where.userId_endpoint.userId).toBe('u1');
    expect(arg.where.userId_endpoint.endpoint).toBe(VALID.endpoint);
    expect(arg.create.userId).toBe('u1');
  });
});
