/**
 * payroll.route.test.ts — V5-M1-06d / RQ-07 / STEP-07 / DEC-11 / AC-07.
 *
 * UNIT (auth + DB boundary mocked): 13-role matrix cho GET /api/payroll.
 *   - unauth → 401 (không chạm DB).
 *   - ADMIN/HR_MANAGER/DIRECTOR/ACCOUNTANT → 200 (canonical matrix §7.2).
 *   - 9 role còn lại → 403 route gate, KHÔNG gọi DB boundary.
 *   - AuthScopeError từ L1 (backstop) → 403 (không lộ 500).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withAuthorizedDbReadOnly: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
  },
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDbReadOnly: mocks.withAuthorizedDbReadOnly,
}));

import { GET } from '@/app/api/payroll/route';
import { AuthSessionError } from '@/src/shared/auth/auth-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

const req = () => new NextRequest('http://localhost/api/payroll?take=10');

const ALLOWED = ['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT'];
const DENIED = ['HR_STAFF', 'SALE', 'PM', 'MKT', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'WORKER', 'EMPLOYEE'];

describe('GET /api/payroll — DEC-11 role matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withAuthorizedDbReadOnly.mockResolvedValue([[], 0]);
  });

  it('unauth (AuthSessionError) → 401, KHÔNG chạm DB', async () => {
    mocks.getAuthContext.mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'no token'));
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(mocks.withAuthorizedDbReadOnly).not.toHaveBeenCalled();
  });

  it.each(ALLOWED)('%s → 200 (canonical payroll reader)', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(mocks.withAuthorizedDbReadOnly).toHaveBeenCalledTimes(1);
  });

  it.each(DENIED)('%s → 403 route gate, KHÔNG gọi DB boundary', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(mocks.withAuthorizedDbReadOnly).not.toHaveBeenCalled();
  });

  it('L1 AuthScopeError (backstop) → 403, không lộ 500', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ACCOUNTANT' });
    mocks.withAuthorizedDbReadOnly.mockRejectedValueOnce(
      new AuthScopeError('DENY_BY_DEFAULT', 'no scope', { userId: 'u', role: 'ACCOUNTANT' }),
    );
    const res = await GET(req());
    expect(res.status).toBe(403);
  });
});
