/**
 * debug.route.test.ts — V5-M1-06d / RQ-06 / STEP-06 / DEC-09 / AC-06.
 *
 * UNIT: /api/debug là NO_BUSINESS_DB — production 404; non-prod chỉ ADMIN.
 *   - production → 404 (không lộ tồn tại), KHÔNG gọi getAuthContext.
 *   - non-prod unauth → 401; non-prod non-ADMIN → 403; non-prod ADMIN → 200 {status:'ok'}.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ getAuthContext: vi.fn() }));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
  },
}));

import { GET } from '@/app/api/debug/route';
import { AuthSessionError } from '@/src/shared/auth/auth-context';

const req = () => new NextRequest('http://localhost/api/debug');

describe('GET /api/debug — NO_BUSINESS_DB (DEC-09)', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('production → 404, KHÔNG gọi getAuthContext', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await GET(req());
    expect(res.status).toBe(404);
    expect(mocks.getAuthContext).not.toHaveBeenCalled();
  });

  it('non-prod unauth (AuthSessionError) → 401', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    mocks.getAuthContext.mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'no token'));
    expect((await GET(req())).status).toBe(401);
  });

  it('non-prod non-ADMIN → 403', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'HR_MANAGER' });
    expect((await GET(req())).status).toBe(403);
  });

  it('non-prod ADMIN → 200 {status:ok}', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ADMIN' });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
