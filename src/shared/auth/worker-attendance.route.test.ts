/**
 * worker-attendance.route.test.ts — T1A Android backend mobile contract.
 *
 * UNIT (no DB): GET /api/worker/attendance mở rộng (TASK DEC-06 / AC-07):
 *   - month+year đủ cặp → filter workDate range đúng (UTC boundary);
 *   - thiếu 1 trong 2 → 400;
 *   - regularHours/otHours item + totals lấy từ AGGREGATE TimesheetLine
 *     (groupBy) — KHÔNG suy diễn từ check-in/out;
 *   - không period → hành vi hiện hành (không filter, không 400);
 *   - unauth → 401; non-worker → 403.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  findMany: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {},
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDbReadOnly: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) =>
    cb({
      attendanceEvent: { findMany: mocks.findMany },
      timesheetLine: { groupBy: mocks.groupBy },
    }),
}));

import { GET } from '@/app/api/worker/attendance/route';

const EVENTS = [
  {
    id: 'e1', workDate: new Date('2026-09-02T00:00:00.000Z'), checkInTime: '08:00',
    checkOutTime: '18:30', source: 'GPS', geofenceResult: 'INSIDE', status: 'APPENDED', shiftCode: 'CA1',
  },
  {
    id: 'e2', workDate: new Date('2026-09-03T00:00:00.000Z'), checkInTime: '07:30',
    checkOutTime: null, source: 'GPS', geofenceResult: 'OUTSIDE', status: 'APPENDED', shiftCode: null,
  },
];

const HOURS = [
  {
    workDate: new Date('2026-09-02T00:00:00.000Z'),
    _sum: { regularHours: '8.00', ot15Hours: '2.00', ot20Hours: '0.00', ot30Hours: '0.00' },
  },
  {
    workDate: new Date('2026-09-03T00:00:00.000Z'),
    _sum: { regularHours: '4.50', ot15Hours: '0.00', ot20Hours: '1.50', ot30Hours: '0.00' },
  },
];

const getReq = (query = '') => new NextRequest(`http://localhost/api/worker/attendance${query}`);

describe('GET /api/worker/attendance (AC-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.findMany.mockResolvedValue(EVENTS);
    mocks.groupBy.mockResolvedValue(HOURS);
  });

  it('unauth → 401', async () => {
    mocks.getAuthContext.mockRejectedValue(new Error('no token'));
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it('non-worker → 403', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'PM' });
    const res = await GET(getReq());
    expect(res.status).toBe(403);
  });

  it('không period → hành vi hiện hành; có shift/status + regularHours/otHours từ TimesheetLine aggregate', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const json = await res.json();

    // TimesheetLine aggregate: 8 regular + (2+1.5) OT.
    expect(json.items[0]).toMatchObject({
      id: 'e1',
      workDate: '2026-09-02',
      shift: 'CA1',
      status: 'APPENDED',
      regularHours: 8,
      otHours: 2,
    });
    expect(json.items[1]).toMatchObject({ id: 'e2', regularHours: 4.5, otHours: 1.5 });
    expect(json.totals).toEqual({ regularHours: 12.5, otHours: 3.5 });

    // KHÔNG suy diễn từ giờ vào/ra: otHours == aggregate TimesheetLine, không tính từ 18:30-08:00.
    expect(json.items[0].otHours).toBe(2);

    // where event không có workDate range.
    const where = mocks.findMany.mock.calls[0][0].where;
    expect(where.workDate).toBeUndefined();
    expect(where.workerId).toBe('w1');

    // groupBy scope self + aggregate đúng cột.
    const gby = mocks.groupBy.mock.calls[0][0];
    expect(gby.where.workerId).toBe('w1');
    expect(gby._sum).toEqual({ regularHours: true, ot15Hours: true, ot20Hours: true, ot30Hours: true });
  });

  it('month/year đủ cặp → filter workDate UTC range đúng', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    const res = await GET(getReq('?month=9&year=2026'));
    expect(res.status).toBe(200);

    const where = mocks.findMany.mock.calls[0][0].where;
    expect(where.workDate.gte.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(where.workDate.lt.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    const gby = mocks.groupBy.mock.calls[0][0];
    expect(gby.where.workDate.gte.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(gby.where.workDate.lt.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('thiếu 1 trong 2 (chỉ month) → 400 KHÔNG query', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    const res = await GET(getReq('?month=9'));
    expect(res.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.groupBy).not.toHaveBeenCalled();
  });

  it('month ngoài 1-12 → 400', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    const res = await GET(getReq('?month=13&year=2026'));
    expect(res.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
