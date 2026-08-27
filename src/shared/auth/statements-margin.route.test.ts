/**
 * statements-margin.route.test.ts — V5-M1-06d / RQ-07 / STEP-07 / DEC-12 / AC-07.
 *
 * UNIT (auth + DB boundary + service mocked): role matrix cho GET /api/statements/margin.
 *   - unauth → 401; thiếu month/year → 400.
 *   - ADMIN/ACCOUNTANT/DIRECTOR → 200 (aggregate qua withAuthorizedDbReadOnly = L1+L2 thật).
 *   - Role ngoài (kể cả HR_MANAGER) → 403 route gate, KHÔNG chạm DB.
 *   - MarginPermissionError / AuthScopeError (L1 backstop) → 403, không lộ 500.
 * Xác nhận DEC-12: route dùng withAuthorizedDbReadOnly (L1), KHÔNG phải withDbContext (L2-only).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withAuthorizedDbReadOnly: vi.fn(),
  calculateMargin: vi.fn(),
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
vi.mock('@/src/domains/reconciliation/margin.service', () => ({
  calculateMargin: mocks.calculateMargin,
  MarginPermissionError: class MarginPermissionError extends Error {
    code = 'PERMISSION_DENIED';
  },
}));

import { GET } from '@/app/api/statements/margin/route';
import { AuthSessionError } from '@/src/shared/auth/auth-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { MarginPermissionError } from '@/src/domains/reconciliation/margin.service';

const req = (qs = '?month=6&year=2026') => new NextRequest('http://localhost/api/statements/margin' + qs);
const FAKE_MARGIN = { totalClientReceivable: 100n, totalVendorPayable: 60n, margin: 40n, periodMonth: 6, periodYear: 2026 };

const ALLOWED = ['ADMIN', 'ACCOUNTANT', 'DIRECTOR'];
const DENIED = ['HR_MANAGER', 'HR_STAFF', 'SALE', 'PM', 'MKT', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'WORKER', 'EMPLOYEE'];

describe('GET /api/statements/margin — DEC-12 role matrix + L1 capability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // withAuthorizedDbReadOnly thực thi callback (chứng minh route đi qua L1 boundary).
    mocks.withAuthorizedDbReadOnly.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb({}));
    mocks.calculateMargin.mockResolvedValue(FAKE_MARGIN);
  });

  it('unauth (AuthSessionError) → 401, KHÔNG chạm DB', async () => {
    mocks.getAuthContext.mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'no token'));
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(mocks.withAuthorizedDbReadOnly).not.toHaveBeenCalled();
  });

  it('thiếu month/year → 400', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ADMIN' });
    const res = await GET(req('?month=6'));
    expect(res.status).toBe(400);
    expect(mocks.withAuthorizedDbReadOnly).not.toHaveBeenCalled();
  });

  it.each(ALLOWED)('%s → 200, đi qua withAuthorizedDbReadOnly (L1+L2)', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(mocks.withAuthorizedDbReadOnly).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.margin.margin).toBe('40'); // bigint serialized
  });

  it.each(DENIED)('%s → 403 route gate, KHÔNG chạm DB', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(mocks.withAuthorizedDbReadOnly).not.toHaveBeenCalled();
  });

  it('MarginPermissionError → 403', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ACCOUNTANT' });
    mocks.calculateMargin.mockRejectedValueOnce(new MarginPermissionError('PERMISSION_DENIED', 'denied'));
    const res = await GET(req());
    expect(res.status).toBe(403);
  });

  it('L1 AuthScopeError (backstop) → 403, không lộ 500', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ACCOUNTANT' });
    mocks.calculateMargin.mockRejectedValueOnce(
      new AuthScopeError('DENY_BY_DEFAULT', 'no scope', { userId: 'u', role: 'ACCOUNTANT' }),
    );
    const res = await GET(req());
    expect(res.status).toBe(403);
  });
});
