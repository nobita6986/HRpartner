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

// TimesheetLine dataset NIÊM YẾT: gồm dòng cũ NGOÀI eventRows (audit round 2 —
// phải KHÔNG làm tăng totals khi không truyền period) và dòng giữa tháng
// (không có event — CHỈ được tính khi aggregate theo toàn range month/year).
const LINES = [
  {
    workDate: new Date('2026-09-02T00:00:00.000Z'),
    _sum: { regularHours: '8.00', ot15Hours: '2.00', ot20Hours: '0.00', ot30Hours: '0.00' },
  },
  {
    workDate: new Date('2026-09-03T00:00:00.000Z'),
    _sum: { regularHours: '4.50', ot15Hours: '0.00', ot20Hours: '1.50', ot30Hours: '0.00' },
  },
  {
    workDate: new Date('2026-09-15T00:00:00.000Z'),
    _sum: { regularHours: '2.00', ot15Hours: '0.00', ot20Hours: '0.00', ot30Hours: '1.00' },
  },
  {
    workDate: new Date('2026-01-15T00:00:00.000Z'),
    _sum: { regularHours: '3.00', ot15Hours: '1.00', ot20Hours: '0.00', ot30Hours: '0.00' },
  },
];

function matchesRange(row: (typeof LINES)[number], workDate: Record<string, Date | Date[] | undefined>): boolean {
  if (Array.isArray(workDate.in)) return workDate.in.some((d) => d.getTime() === row.workDate.getTime());
  if (workDate.gte instanceof Date || workDate.lt instanceof Date) {
    if (workDate.gte && row.workDate.getTime() < (workDate.gte as Date).getTime()) return false;
    if (workDate.lt && row.workDate.getTime() >= (workDate.lt as Date).getTime()) return false;
    return true;
  }
  return false;
}

/** Mock groupBy tôn trọng where.workDate (in / gte-lt) như Prisma sẽ làm. */
function groupByRespectingFilter(arg: { where: { workerId?: unknown; workDate?: Record<string, Date | Date[] | undefined> } }) {
  const workDate = arg.where.workDate ?? {};
  return LINES.filter((row) => matchesRange(row, workDate));
}

const getReq = (query = '') => new NextRequest(`http://localhost/api/worker/attendance${query}`);

describe('GET /api/worker/attendance (AC-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.findMany.mockResolvedValue(EVENTS);
    mocks.groupBy.mockImplementation((arg: Parameters<typeof groupByRespectingFilter>[0]) =>
      Promise.resolve(groupByRespectingFilter(arg)),
    );
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
    expect(json.items[0]).toMatchObject({ id: 'e2', workDate: '2026-09-03', regularHours: 4.5, otHours: 1.5 });
    expect(json.items[1]).toMatchObject({
      id: 'e1',
      workDate: '2026-09-02',
      shift: 'CA1',
      status: 'APPENDED',
      regularHours: 8,
      otHours: 2,
    });
    expect(json.totals).toEqual({ regularHours: 12.5, otHours: 3.5 });

    // KHÔNG suy diễn từ giờ vào/ra: otHours == aggregate TimesheetLine, không tính từ 18:30-08:00.
    expect(json.items[1].otHours).toBe(2);

    // where event không có workDate range.
    const where = mocks.findMany.mock.calls[0][0].where;
    expect(where.workDate).toBeUndefined();
    expect(where.workerId).toBe('w1');

    // groupBy scope self + aggregate đúng cột; scope dates = `in` các ngày
    // CÓ trong eventRows (audit round 2: không quét toàn bộ lịch sử).
    const gby = mocks.groupBy.mock.calls[0][0];
    expect(gby.where.workerId).toBe('w1');
    expect(gby.where.workDate.in).toEqual([
      new Date('2026-09-03T00:00:00.000Z'),
      new Date('2026-09-02T00:00:00.000Z'),
    ]);
    expect(gby._sum).toEqual({ regularHours: true, ot15Hours: true, ot20Hours: true, ot30Hours: true });
  });

  it('REGRESSION (audit round 2): TimesheetLine ở ngày cũ ngoài eventRows KHÔNG làm tăng totals khi không có period', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const json = await res.json();

    // LINES có dòng 2026-01-15 (regular 3.0, ot 1.0) — nếu aggregate quét toàn
    // lịch sử, totals sẽ là 16.5/5.5. Đúng: chỉ ngày của eventRows ⇒ 12.5/3.5.
    expect(json.totals).toEqual({ regularHours: 12.5, otHours: 3.5 });
    expect(json.totals.regularHours).toBeLessThan(16.5);
    // items của event không "ké" giờ của dòng cũ.
    expect(json.items.every((it: { workDate: string }) => it.workDate !== '2026-01-15')).toBe(true);
  });

  it('REGRESSION (audit round 2): eventRows rỗng ⇒ aggregate + totals = 0, không groupBy', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    mocks.findMany.mockResolvedValue([]);
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual([]);
    expect(json.total).toBe(0);
    expect(json.totals).toEqual({ regularHours: 0, otHours: 0 });
    expect(mocks.groupBy).not.toHaveBeenCalled();
  });

  it('month/year đủ cặp → filter workDate UTC range đúng; totals tính TOÀN RANGE (kể cả ngày không event)', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    const res = await GET(getReq('?month=9&year=2026'));
    expect(res.status).toBe(200);

    const where = mocks.findMany.mock.calls[0][0].where;
    expect(where.workDate.gte.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(where.workDate.lt.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    const gby = mocks.groupBy.mock.calls[0][0];
    expect(gby.where.workDate.gte.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(gby.where.workDate.lt.toISOString()).toBe('2026-10-01T00:00:00.000Z');

    // Full-range: gồm dòng 09-15 (không event): regular 12.5+2=14.5, ot 3.5+1=4.5.
    // Dòng 01-15 vẫn ngoài range.
    const json = await res.json();
    expect(json.totals).toEqual({ regularHours: 14.5, otHours: 4.5 });
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

  it('mobile GPS events: tính giờ công chuẩn & OT theo thực tế và ca dự án (chưa Tan ca -> PENDING 0h, đủ Vào/Ra -> tính regularHours & otHours)', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    mocks.groupBy.mockResolvedValue([]);

    mocks.findMany.mockResolvedValue([
      // Day 1 (2026-10-21): open shift (only CHECK_IN, no CHECK_OUT) -> PENDING, 0h
      {
        id: 'm-open-in',
        workDate: new Date('2026-10-21T00:00:00.000Z'),
        checkInTime: '08:00',
        checkOutTime: null,
        source: 'GPS',
        geofenceResult: 'INSIDE',
        status: 'APPENDED',
        shiftCode: 'CA1',
        projectId: 'p1',
        mobileAction: 'CHECK_IN',
        receivedAt: new Date('2026-10-21T01:00:00.000Z'),
      },
      // Day 2 (2026-10-19): 9.5h worked -> 8.0h regular + 1.5h OT
      {
        id: 'm-ot-in',
        workDate: new Date('2026-10-19T00:00:00.000Z'),
        checkInTime: '08:00',
        checkOutTime: null,
        source: 'GPS',
        geofenceResult: 'INSIDE',
        status: 'APPENDED',
        shiftCode: 'CA1',
        projectId: 'p1',
        mobileAction: 'CHECK_IN',
        receivedAt: new Date('2026-10-19T01:00:00.000Z'),
      },
      {
        id: 'm-ot-out',
        workDate: new Date('2026-10-19T00:00:00.000Z'),
        checkInTime: null,
        checkOutTime: '17:30',
        source: 'GPS',
        geofenceResult: 'INSIDE',
        status: 'APPENDED',
        shiftCode: 'CA1',
        projectId: 'p1',
        mobileAction: 'CHECK_OUT',
        receivedAt: new Date('2026-10-19T10:30:00.000Z'),
      },
      // Day 3 (2026-10-18): 7.5h worked -> 7.5h regular, 0h OT
      {
        id: 'm-valid-in',
        workDate: new Date('2026-10-18T00:00:00.000Z'),
        checkInTime: '08:00',
        checkOutTime: null,
        source: 'GPS',
        geofenceResult: 'INSIDE',
        status: 'APPENDED',
        shiftCode: 'CA1',
        projectId: 'p1',
        mobileAction: 'CHECK_IN',
        receivedAt: new Date('2026-10-18T01:00:00.000Z'),
      },
      {
        id: 'm-valid-out',
        workDate: new Date('2026-10-18T00:00:00.000Z'),
        checkInTime: null,
        checkOutTime: '15:30',
        source: 'GPS',
        geofenceResult: 'INSIDE',
        status: 'APPENDED',
        shiftCode: 'CA1',
        projectId: 'p1',
        mobileAction: 'CHECK_OUT',
        receivedAt: new Date('2026-10-18T08:30:00.000Z'),
      },
    ]);

    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.items).toHaveLength(3);
    expect(json.items[0]).toMatchObject({
      id: 'm-open-in',
      workDate: '2026-10-21',
      shift: 'CA1',
      status: 'PENDING',
      regularHours: 0,
      otHours: 0,
    });
    expect(json.items[1]).toMatchObject({
      id: 'm-ot-in',
      workDate: '2026-10-19',
      shift: 'CA1',
      checkInTime: '08:00',
      checkOutTime: '17:30',
      status: 'APPROVED',
      regularHours: 8,
      otHours: 1.5,
    });
    expect(json.items[2]).toMatchObject({
      id: 'm-valid-in',
      workDate: '2026-10-18',
      shift: 'CA1',
      checkInTime: '08:00',
      checkOutTime: '15:30',
      status: 'APPROVED',
      regularHours: 7.5,
      otHours: 0,
    });
    expect(json.totals).toEqual({ regularHours: 15.5, otHours: 1.5 });
  });
});
