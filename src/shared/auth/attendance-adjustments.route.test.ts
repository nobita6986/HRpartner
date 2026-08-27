/**
 * attendance-adjustments.route.test.ts — V5-M1-06d / RQ-03 / STEP-03 / DEC-05 / AC-03.
 *
 * UNIT (auth + DB boundary mocked): GET /api/attendance/adjustments PHẢI có auth + role gate +
 * transaction context (EV-06 disposition — trước đây GET thiếu auth, chạy raw prisma).
 *   DEC-05: GET cho ADMIN/HR_MANAGER/HR_STAFF/PM/ACCOUNTANT/DIRECTOR; PM/HR_STAFF bị L2 (RLS)
 *   thu hẹp về project của mình (chứng minh scope thật ở LIVE — RLS không mock được ở unit).
 *
 *   - unauth (AuthSessionError) → 401, KHÔNG chạm DB.
 *   - role ngoài DEC-05 → 403 TRƯỚC khi chạm DB.
 *   - thiếu periodId (sau khi qua auth+gate) → 400.
 *   - role hợp lệ → 200, đi qua withDbContext (L2) đúng 1 lần với periodId.
 *   - POST giữ nguyên: role ngoài ADJUST_ROLES → 403 (không regress khi sửa GET).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withDbContext: vi.fn(),
  withIdempotency: vi.fn(),
  createTimesheetAdjustment: vi.fn(),
  listTimesheetAdjustments: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'AuthSessionError';
    }
  },
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: mocks.withDbContext,
}));
vi.mock('@/src/shared/integrity/idempotency', () => ({
  withIdempotency: mocks.withIdempotency,
}));
vi.mock('@/src/domains/attendance/resolve-adjustment.service', () => ({
  createTimesheetAdjustment: mocks.createTimesheetAdjustment,
  listTimesheetAdjustments: mocks.listTimesheetAdjustments,
  AdjustmentServiceError: class AdjustmentServiceError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'AdjustmentServiceError';
    }
  },
}));

import { GET, POST } from '@/app/api/attendance/adjustments/route';
import { AuthSessionError } from '@/src/shared/auth/auth-context';

const getReq = (periodId?: string) =>
  new NextRequest(
    periodId
      ? `http://localhost/api/attendance/adjustments?periodId=${periodId}`
      : 'http://localhost/api/attendance/adjustments',
  );

const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/attendance/adjustments', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

const ALL_ROLES = [
  'ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF', 'SALE', 'PM',
  'ACCOUNTANT', 'MKT', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'WORKER', 'EMPLOYEE',
];

describe('GET /api/attendance/adjustments — DEC-05 auth + role gate + L2 context', () => {
  const ALLOWED = ['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'ACCOUNTANT', 'DIRECTOR'];
  const DENIED = ALL_ROLES.filter((r) => !ALLOWED.includes(r));

  beforeEach(() => {
    vi.clearAllMocks();
    // withDbContext thực thi callback với fake tx (RLS scope là hành vi LIVE, không mock).
    mocks.withDbContext.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb({}));
    mocks.listTimesheetAdjustments.mockResolvedValue([{ id: 'adj1', periodId: 'p1' }]);
  });

  it('unauth (AuthSessionError) → 401, KHÔNG chạm DB', async () => {
    mocks.getAuthContext.mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'no token'));
    const res = await GET(getReq('p1'));
    expect(res.status).toBe(401);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it.each(DENIED)('%s → 403 TRƯỚC boundary (không chạm DB)', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await GET(getReq('p1'));
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('role hợp lệ nhưng thiếu periodId → 400', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ADMIN' });
    const res = await GET(getReq());
    expect(res.status).toBe(400);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it.each(ALLOWED)('%s → 200, đi qua withDbContext với periodId', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await GET(getReq('p1'));
    expect(res.status).toBe(200);
    expect(mocks.withDbContext).toHaveBeenCalledTimes(1);
    expect(mocks.listTimesheetAdjustments).toHaveBeenCalledWith(expect.anything(), 'p1');
    expect(await res.json()).toEqual({ adjustments: [{ id: 'adj1', periodId: 'p1' }] });
  });
});

describe('POST /api/attendance/adjustments — không regress khi sửa GET', () => {
  const WRITE_ALLOWED = ['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM'];
  const WRITE_DENIED = ALL_ROLES.filter((r) => !WRITE_ALLOWED.includes(r));

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withDbContext.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb({}));
    mocks.createTimesheetAdjustment.mockResolvedValue({ id: 'adj1' });
  });

  it.each(WRITE_DENIED)('%s → 403 (POST gate giữ nguyên)', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await POST(postReq({ periodId: 'p1', workerId: 'w1', deltaHours: 1, reason: 'x' }));
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('ADMIN POST hợp lệ (no idempotency key) → 201', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ADMIN' });
    const res = await POST(postReq({ periodId: 'p1', workerId: 'w1', deltaHours: 1, reason: 'x' }));
    expect(res.status).toBe(201);
    expect(mocks.withDbContext).toHaveBeenCalledTimes(1);
  });
});
