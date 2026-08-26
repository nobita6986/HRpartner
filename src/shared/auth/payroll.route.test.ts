/**
 * payroll.route.test.ts — V5-M1-06c / RQ-05 / STEP-05 / AC-05 / OQ-03.
 *
 * UNIT (no DB): role matrix cho Payroll config (`GET /api/payroll`).
 * PayrollConfig chưa có builder → chỉ {ADMIN, DIRECTOR} đọc (§7.2, OQ-03).
 * Deviation: bỏ HR_MANAGER + ACCOUNTANT (trước {ADMIN,HR_MANAGER,ACCOUNTANT,DIRECTOR}).
 *   - viewer → 200 qua withAuthorizedDbReadOnly (L1 passthrough vì root); non-viewer
 *     → 403 KHÔNG query; boundary throw AuthScopeError → 403.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  authorizedRO: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {},
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDbReadOnly: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) =>
    mocks.authorizedRO(cb),
}));

import { GET } from '@/app/api/payroll/route';

const tx = () => ({
  payrollConfig: { findMany: mocks.findMany, count: mocks.count },
});

const getReq = () => new NextRequest('http://localhost/api/payroll');

describe('payroll config — role matrix (RQ-05 / AC-05 / OQ-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    mocks.authorizedRO.mockImplementation((cb: (t: unknown) => unknown) => cb(tx()));
  });

  it.each(['ADMIN', 'DIRECTOR'])('GET: %s → 200 qua boundary', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    expect(mocks.authorizedRO).toHaveBeenCalledTimes(1);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  it.each(['HR_MANAGER', 'ACCOUNTANT', 'HR_STAFF', 'PM', 'SALE', 'MKT', 'WORKER', 'VENDOR_ADMIN'])(
    'GET: %s → 403 (deviation OQ-03 deny), KHÔNG query',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
      const res = await GET(getReq());
      expect(res.status).toBe(403);
      expect(mocks.authorizedRO).not.toHaveBeenCalled();
      expect(mocks.findMany).not.toHaveBeenCalled();
    },
  );

  it('GET: boundary throw AuthScopeError → 403', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ADMIN' });
    mocks.authorizedRO.mockRejectedValueOnce(new AuthScopeError('DENY_BY_DEFAULT', 'no scope'));
    const res = await GET(getReq());
    expect(res.status).toBe(403);
  });
});
