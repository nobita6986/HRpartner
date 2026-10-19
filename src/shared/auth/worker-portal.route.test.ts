/**
 * worker-portal.route.test.ts — V5-M1-06b / RQ-03 / STEP-03 / AC-03 / DEC-03,DEC-04.
 *
 * UNIT (no DB): worker self-scope gate + server-derived ownership. Chạy luôn (bổ trợ
 * LIVE two-worker):
 *   - GET tickets/attendance: thiếu `ctx.workerId` → 403 NOT_A_WORKER; WORKER → query
 *     self-scope `where { workerId: ctx.workerId }` (không nhận từ client).
 *   - POST checkins: thiếu workerId → 403; success → attendanceEvent.create lấy
 *     `workerId` từ ctx (body KHÔNG override — DEC-03); trùng payload (P2002) → idempotent.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  ticketFindMany: vi.fn(),
  attendanceFindMany: vi.fn(),
  siteFindMany: vi.fn(),
  attendanceCreate: vi.fn(),
  timesheetGroupBy: vi.fn(),
}));

/**
 * Site row mặc định — HỢP LỆ cho geofence (lat/lng + geoConfirmedAt marker,
 * hrp-t1a-android-gps-project-site-config): check-in success path cần một
 * Site đã được Admin xác nhận; đặt gần (lat 10, lng 10, radius 1000) để GPS
 * body (10,10) là INSIDE.
 */
const CONFIRMED_SITE = {
  latitude: '10.0',
  longitude: '10.0',
  radiusMeters: 1000,
  geoConfirmedAt: new Date('2026-08-20T00:00:00.000Z'),
};

vi.mock('@/src/shared/auth/auth-context', () => ({ getAuthContext: mocks.getAuthContext }));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDbReadOnly: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) =>
    cb({
      ticket: { findMany: mocks.ticketFindMany },
      attendanceEvent: { findMany: mocks.attendanceFindMany },
      // T1A DEC-06: attendance route query thêm aggregate giờ chuẩn/OT từ TimesheetLine.
      timesheetLine: { groupBy: mocks.timesheetGroupBy },
    }),
}));
vi.mock('@/src/shared/auth/with-system-db', () => ({
  SYSTEM_CHECKIN: { userId: 'system:checkin', role: 'ADMIN', purpose: 'CHECKIN' },
  withSystemDb: (_p: unknown, _principal: unknown, cb: (t: unknown) => unknown) =>
    cb({
      site: { findMany: mocks.siteFindMany },
      attendanceEvent: { create: mocks.attendanceCreate },
    }),
}));

import { GET as ticketsGET } from '@/app/api/worker/tickets/route';
import { GET as attendanceGET } from '@/app/api/worker/attendance/route';
import { POST as checkinsPOST } from '@/app/api/worker/checkins/route';

const WORKER = { userId: 'wu-1', role: 'WORKER', workerId: 'worker-1' };
const getReq = (p: string) => new NextRequest('http://localhost' + p);
const checkinReq = (body: unknown) =>
  new NextRequest('http://localhost/api/worker/checkins', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

describe('worker portal — self scope + server-derived owner (DEC-03/04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthContext.mockResolvedValue(WORKER);
    mocks.ticketFindMany.mockResolvedValue([]);
    mocks.attendanceFindMany.mockResolvedValue([]);
    mocks.siteFindMany.mockResolvedValue([]);
    mocks.attendanceCreate.mockResolvedValue({ id: 'evt-1' });
    mocks.timesheetGroupBy.mockResolvedValue([]);
  });

  it('tickets: thiếu workerId → 403 NOT_A_WORKER, KHÔNG query', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'CTV' });
    const res = await ticketsGET(getReq('/api/worker/tickets'));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'NOT_A_WORKER' });
    expect(mocks.ticketFindMany).not.toHaveBeenCalled();
  });

  it('tickets: WORKER → self-scope where { workerId: ctx.workerId }', async () => {
    const res = await ticketsGET(getReq('/api/worker/tickets'));
    expect(res.status).toBe(200);
    expect(mocks.ticketFindMany.mock.calls[0][0]).toMatchObject({ where: { workerId: 'worker-1' } });
  });

  it('attendance: thiếu workerId → 403', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'CTV' });
    const res = await attendanceGET(getReq('/api/worker/attendance'));
    expect(res.status).toBe(403);
    expect(mocks.attendanceFindMany).not.toHaveBeenCalled();
  });

  it('attendance: WORKER → self-scope + riskFlag map từ geofenceResult', async () => {
    mocks.attendanceFindMany.mockResolvedValue([
      {
        id: 'a1',
        workDate: new Date('2026-08-25T00:00:00.000Z'),
        checkInTime: '08:00',
        checkOutTime: '17:00',
        source: 'GPS',
        geofenceResult: 'OUTSIDE',
        status: 'APPENDED',
      },
    ]);
    const res = await attendanceGET(getReq('/api/worker/attendance'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mocks.attendanceFindMany.mock.calls[0][0]).toMatchObject({ where: { workerId: 'worker-1' } });
    expect(body.items[0].riskFlag).toBe(true);
  });

  it('checkins: thiếu workerId (body hợp lệ) → 403 NOT_A_WORKER, KHÔNG create', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'CTV' });
    const res = await checkinsPOST(checkinReq({ workDate: '2026-08-25', checkInTime: '08:00' }));
    expect(res.status).toBe(403);
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();
  });

  it('checkins: success (site hợp lệ có marker) → workerId từ ctx, body KHÔNG override (DEC-03)', async () => {
    // GPS (10,10) gần site confirmed (radius 1000) ⇒ INSIDE, geofence gate mở.
    mocks.siteFindMany.mockResolvedValue([CONFIRMED_SITE]);
    const res = await checkinsPOST(
      checkinReq({
        workDate: '2026-08-25',
        checkInTime: '08:00',
        gpsLatitude: 10,
        gpsLongitude: 10,
        workerId: 'worker-EVIL',
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.id).toBe('evt-1');
    expect(body.geofenceResult).toBe('INSIDE');
    expect(mocks.attendanceCreate.mock.calls[0][0].data.workerId).toBe('worker-1');
  });

  it('checkins: FAIL-CLOSED — site chưa được Admin xác nhận (geoConfirmedAt null) → 422 SITE_GEOFENCE_NOT_CONFIGURED, KHÔNG create', async () => {
    mocks.siteFindMany.mockResolvedValue([
      { latitude: '10.0', longitude: '10.0', radiusMeters: 1000, geoConfirmedAt: null },
    ]);
    const res = await checkinsPOST(
      checkinReq({ workDate: '2026-08-25', checkInTime: '08:00', gpsLatitude: 10, gpsLongitude: 10 }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('SITE_GEOFENCE_NOT_CONFIGURED');
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();
  });

  it('checkins: FAIL-CLOSED — site lat/lng null (không (0,0)) → 422, KHÔNG create', async () => {
    mocks.siteFindMany.mockResolvedValue([
      { latitude: null, longitude: null, radiusMeters: 200, geoConfirmedAt: new Date() },
    ]);
    const res = await checkinsPOST(
      checkinReq({ workDate: '2026-08-25', checkInTime: '08:00', gpsLatitude: 0.001, gpsLongitude: 0.001 }),
    );
    expect(res.status).toBe(422);
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();
  });

  it('checkins: FAIL-CLOSED — worker không có assignment ACTIVE site hợp lệ (sites rỗng) → 422', async () => {
    mocks.siteFindMany.mockResolvedValue([]);
    const res = await checkinsPOST(
      checkinReq({ workDate: '2026-08-25', checkInTime: '08:00', gpsLatitude: 10, gpsLongitude: 10 }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('SITE_GEOFENCE_NOT_CONFIGURED');
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();
  });

  it('checkins: hợp lệ site + body KHÔNG GPS → event tạo với geofenceResult null (giữ behavior)', async () => {
    mocks.siteFindMany.mockResolvedValue([CONFIRMED_SITE]);
    const res = await checkinsPOST(checkinReq({ workDate: '2026-08-25', checkInTime: '08:00' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.attendanceCreate).toHaveBeenCalledTimes(1);
    expect(mocks.attendanceCreate.mock.calls[0][0].data.geofenceResult).toBeNull();
  });

  it('checkins: payload trùng (P2002) → idempotent ok:true id:null', async () => {
    mocks.siteFindMany.mockResolvedValue([CONFIRMED_SITE]);
    mocks.attendanceCreate.mockRejectedValue({ code: 'P2002' });
    const res = await checkinsPOST(
      checkinReq({ workDate: '2026-08-25', checkInTime: '08:00', gpsLatitude: 10, gpsLongitude: 10 }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, id: null });
  });
});
