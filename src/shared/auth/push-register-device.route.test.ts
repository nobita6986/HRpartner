/**
 * push-register-device.route.test.ts — T1A Android backend mobile contract.
 *
 * UNIT (no DB): `POST /api/push/register-device` (TASK DEC-05 / RQ-02 / AC-04):
 *   - unauth → 401; non-WORKER → 403; body sai → 400 (KHÔNG ghi).
 *   - hợp lệ → upsert scoped theo (ctx.userId, token) qua withDbContext,
 *     response KHÔNG echo token.
 *   - upsert fail → 500 KHÔNG leak token vào log (console.error không chứa chuỗi token).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  upsert: vi.fn(),
  dbContext: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {},
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) => mocks.dbContext(cb),
}));

import { POST } from '@/app/api/push/register-device/route';

const tx = () => ({ mobileDeviceToken: { upsert: mocks.upsert } });

const VALID = { token: 'fcm-token-alpha-123', deviceType: 'ANDROID', model: 'Pixel 7' };
const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/push/register-device', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

describe('POST /api/push/register-device (AC-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.upsert.mockResolvedValue({ id: 't1' });
    mocks.dbContext.mockImplementation((cb: (t: unknown) => unknown) => cb(tx()));
  });

  it('unauth (getAuthContext throw) → 401, KHÔNG ghi', async () => {
    mocks.getAuthContext.mockRejectedValue(new Error('no token'));
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(401);
    expect(mocks.dbContext).not.toHaveBeenCalled();
  });

  it('role không phải WORKER → 403, KHÔNG ghi', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'CTV' });
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(403);
    expect(mocks.dbContext).not.toHaveBeenCalled();
  });

  it('body sai (token rỗng) → 400, KHÔNG ghi', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER' });
    const res = await POST(postReq({ ...VALID, token: '' }));
    expect(res.status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('deviceType sai enum → 400', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER' });
    const res = await POST(postReq({ ...VALID, deviceType: 'WINDOWS' }));
    expect(res.status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('hợp lệ → 200, upsert scoped theo (ctx.userId, token); response KHÔNG echo token', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(JSON.stringify(json)).not.toContain('fcm-token-alpha-123');

    expect(mocks.dbContext).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    const arg = mocks.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ userId_fcmToken: { userId: 'u1', fcmToken: 'fcm-token-alpha-123' } });
    expect(arg.create).toEqual({
      userId: 'u1',
      fcmToken: 'fcm-token-alpha-123',
      deviceType: 'ANDROID',
      model: 'Pixel 7',
    });
    expect(arg.update).toEqual({ deviceType: 'ANDROID', model: 'Pixel 7' });
  });

  it('body có userId lạ → bỏ qua (server-derived), vẫn upsert theo ctx.userId', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER' });
    // zod object không strip key lạ — validity vẫn ok, upsert vẫn theo ctx.userId.
    const res = await POST(postReq({ ...VALID, userId: 'victim-id' }));
    expect(res.status).toBe(200);
    const arg = mocks.upsert.mock.calls[0][0];
    expect(arg.create.userId).toBe('u1');
    expect(arg.where).toEqual({ userId_fcmToken: { userId: 'u1', fcmToken: 'fcm-token-alpha-123' } });
  });

  it('upsert fail → 500 và log KHÔNG chứa token', async () => {
    const errorSpy = console.error as unknown as ReturnType<typeof vi.spyOn>;
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER' });
    mocks.upsert.mockRejectedValue(Object.assign(new Error('db'), { code: 'P2002' }));

    const res = await POST(postReq(VALID));
    expect(res.status).toBe(500);

    const logged = JSON.stringify(
      errorSpy.mock.calls.map((c) => c.map(String).join(' ')),
    );
    expect(logged).not.toContain('fcm-token-alpha-123');
  });
});
