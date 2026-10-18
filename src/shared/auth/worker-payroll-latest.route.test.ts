/**
 * worker-payroll-latest.route.test.ts — T1A Android backend mobile contract.
 *
 * UNIT (no DB): GET /api/worker/payroll/latest?period=YYYY-MM (TASK DEC-09 / AC-10):
 *   - unauth 401; non-WORKER 403; WORKER không profile 404;
 *   - period sai format → 400; thiếu period → 400;
 *   - cache miss → 404 (best-effort process-local cache);
 *   - hit → projection allowlist từ projectPayslipForResponse, period echo.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  cacheGet: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {},
}));
vi.mock('@/src/lib/cache', () => ({
  cache: { get: mocks.cacheGet, set: vi.fn() },
}));

import { GET } from '@/app/api/worker/payroll/latest/route';

const getReq = (query = '') => new NextRequest(`http://localhost/api/worker/payroll/latest${query}`);

const PAYSLIP = {
  workerId: 'w1',
  periodMonth: 9,
  periodYear: 2026,
  grossSalary: 5000000,
  netSalary: 4200000,
  deductions: { bhxh: 100000 },
  earned: { regular: 4000000 },
  computedAt: '2026-10-01T00:00:00.000Z',
  cacheExtraLeak: 'must-not-appear',
};

describe('GET /api/worker/payroll/latest (AC-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unauth → 401', async () => {
    mocks.getAuthContext.mockRejectedValue(new Error('no token'));
    const res = await GET(getReq('?period=2026-09'));
    expect(res.status).toBe(401);
  });

  it('role khác WORKER → 403', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'HR_MANAGER' });
    const res = await GET(getReq('?period=2026-09'));
    expect(res.status).toBe(403);
  });

  it('thiếu period / sai format → 400', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    expect((await GET(getReq())).status).toBe(400);
    expect((await GET(getReq('?period=2026-9'))).status).toBe(400);
    expect((await GET(getReq('?period=26-09'))).status).toBe(400);
    expect(mocks.cacheGet).not.toHaveBeenCalled();
  });

  it('cache miss → 404 (process-local cache caveat)', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    mocks.cacheGet.mockResolvedValue(null);
    const res = await GET(getReq('?period=2026-09'));
    expect(res.status).toBe(404);
    expect(mocks.cacheGet).toHaveBeenCalledWith('payslip:w1:2026:09');
  });

  it('hit → projection allowlist; cache-extra KHÔNG đi ké; period echo', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    mocks.cacheGet.mockResolvedValue(PAYSLIP);

    const res = await GET(getReq('?period=2026-09'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.period).toBe('2026-09');
    expect(json.payslip).toEqual({
      workerId: 'w1',
      periodMonth: 9,
      periodYear: 2026,
      grossSalary: 5000000,
      netSalary: 4200000,
      deductions: { bhxh: 100000 },
      earned: { regular: 4000000 },
      computedAt: '2026-10-01T00:00:00.000Z',
    });
    expect(JSON.stringify(json)).not.toContain('cacheExtraLeak');
  });
});
