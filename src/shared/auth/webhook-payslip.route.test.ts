/**
 * webhook-payslip.route.test.ts — V5-M1-06d / RQ-02 / STEP-02 / DEC-03 / DEC-04.
 *
 * UNIT (no DB, cache + auth mocked): POST SYSTEM_SCOPED_DATA + GET USER_SCOPED_DATA.
 *   POST: thiếu secret → 503 KHÔNG cache; sai → 401 KHÔNG cache; đúng → cache.set.
 *   GET : unauth → 401; WORKER self qua ctx.workerId (query không override);
 *         WORKER cross-worker → 404; WORKER chưa link → 404; privileged cần workerId;
 *         role thường → 403; thiếu period → 400.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
  },
}));
vi.mock('@/src/lib/cache', () => ({
  cache: { get: mocks.cacheGet, set: mocks.cacheSet },
}));

import { GET, POST } from '@/app/api/webhook/payslip/route';
import { AuthSessionError } from '@/src/shared/auth/auth-context';

const postReq = (body: unknown, apiKey?: string) =>
  new NextRequest('http://localhost/api/webhook/payslip', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: apiKey === undefined ? { 'content-type': 'application/json' } : { 'content-type': 'application/json', 'x-api-key': apiKey },
  });

const getReq = (qs: string) => new NextRequest('http://localhost/api/webhook/payslip' + qs);

const SLIP = { workerId: 'w1', periodMonth: 6, periodYear: 2026, grossSalary: 1, netSalary: 1, deductions: {}, earned: {}, computedAt: 'x' };

describe('POST /api/webhook/payslip — SYSTEM_SCOPED_DATA (DEC-03)', () => {
  const ORIGINAL = process.env.INTERNAL_API_KEY;
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cacheSet.mockResolvedValue(undefined);
    delete process.env.INTERNAL_API_KEY;
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = ORIGINAL;
  });

  it('thiếu secret → 503, KHÔNG chạm cache, KHÔNG parse body', async () => {
    const res = await POST(postReq({ payslips: [SLIP], source: 's', computedAt: 'x' }, 'dev-internal-key'));
    expect(res.status).toBe(503);
    expect(mocks.cacheSet).not.toHaveBeenCalled();
  });

  it('sai secret → 401, KHÔNG chạm cache', async () => {
    process.env.INTERNAL_API_KEY = 'real-secret';
    const res = await POST(postReq({ payslips: [SLIP], source: 's', computedAt: 'x' }, 'wrong'));
    expect(res.status).toBe(401);
    expect(mocks.cacheSet).not.toHaveBeenCalled();
  });

  it('đúng secret → 200, cache.set theo workerId', async () => {
    process.env.INTERNAL_API_KEY = 'real-secret';
    const res = await POST(postReq({ payslips: [SLIP], source: 's', computedAt: 'x' }, 'real-secret'));
    expect(res.status).toBe(200);
    expect(mocks.cacheSet).toHaveBeenCalledTimes(1);
    expect(mocks.cacheSet.mock.calls[0][0]).toBe('payslip:w1:2026:06');
  });

  it('đúng secret nhưng payslips không phải array → 400', async () => {
    process.env.INTERNAL_API_KEY = 'real-secret';
    const res = await POST(postReq({ source: 's', computedAt: 'x' }, 'real-secret'));
    expect(res.status).toBe(400);
    expect(mocks.cacheSet).not.toHaveBeenCalled();
  });
});

describe('GET /api/webhook/payslip — USER_SCOPED_DATA (DEC-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cacheGet.mockResolvedValue({ netSalary: 1 });
  });

  it('unauth (AuthSessionError) → 401, KHÔNG đọc cache', async () => {
    mocks.getAuthContext.mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'no token'));
    const res = await GET(getReq('?workerId=w9&periodMonth=6&periodYear=2026'));
    expect(res.status).toBe(401);
    expect(mocks.cacheGet).not.toHaveBeenCalled();
  });

  it('thiếu period → 400', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ADMIN' });
    const res = await GET(getReq('?workerId=w1&periodYear=2026'));
    expect(res.status).toBe(400);
  });

  it('WORKER self: dùng ctx.workerId, KHÔNG dùng query workerId', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'WORKER', workerId: 'w-self' });
    const res = await GET(getReq('?periodMonth=6&periodYear=2026'));
    expect(res.status).toBe(200);
    expect(mocks.cacheGet).toHaveBeenCalledWith('payslip:w-self:2026:06');
  });

  it('WORKER cross-worker (query != self) → 404, KHÔNG phục vụ dữ liệu người khác', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'WORKER', workerId: 'w-self' });
    const res = await GET(getReq('?workerId=w-other&periodMonth=6&periodYear=2026'));
    expect(res.status).toBe(404);
    expect(mocks.cacheGet).not.toHaveBeenCalled();
  });

  it('WORKER chưa link Worker (no ctx.workerId) → 404', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'WORKER' });
    const res = await GET(getReq('?periodMonth=6&periodYear=2026'));
    expect(res.status).toBe(404);
    expect(mocks.cacheGet).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT'])('privileged %s + workerId → 200', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await GET(getReq('?workerId=w7&periodMonth=6&periodYear=2026'));
    expect(res.status).toBe(200);
    expect(mocks.cacheGet).toHaveBeenCalledWith('payslip:w7:2026:06');
  });

  it('privileged thiếu workerId → 400', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ACCOUNTANT' });
    const res = await GET(getReq('?periodMonth=6&periodYear=2026'));
    expect(res.status).toBe(400);
  });

  it.each(['PM', 'HR_STAFF', 'SALE', 'MKT', 'VENDOR_ADMIN', 'CTV', 'EMPLOYEE'])(
    'role thường %s → 403',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
      const res = await GET(getReq('?workerId=w7&periodMonth=6&periodYear=2026'));
      expect(res.status).toBe(403);
      expect(mocks.cacheGet).not.toHaveBeenCalled();
    },
  );
});
