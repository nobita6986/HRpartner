import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  advisoryLock: vi.fn(),
  worker: vi.fn(),
  assignment: vi.fn(),
  sites: vi.fn(),
  attendanceFindFirst: vi.fn(),
  attendanceCreate: vi.fn(),
  attendanceUpdate: vi.fn(),
  idempotencyFindUnique: vi.fn(),
  idempotencyCreate: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({ getAuthContext: mocks.auth }));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/with-system-db', () => ({
  SYSTEM_CHECKIN: { userId: 'system:checkin', role: 'ADMIN', purpose: 'CHECKIN' },
  withSystemDb: (_prisma: unknown, _principal: unknown, cb: (tx: unknown) => unknown) => cb({
    $executeRaw: mocks.advisoryLock,
    worker: { findUnique: mocks.worker },
    idempotencyKey: { findUnique: mocks.idempotencyFindUnique, create: mocks.idempotencyCreate },
    projectAssignment: { findFirst: mocks.assignment },
    site: { findMany: mocks.sites },
    attendanceEvent: {
      findFirst: mocks.attendanceFindFirst,
      create: mocks.attendanceCreate,
      update: mocks.attendanceUpdate,
    },
  }),
}));

import { POST } from './route';

const BODY = {
  workDate: '2026-10-19',
  action: 'CHECK_IN',
  gpsLatitude: 21.4925,
  gpsLongitude: 105.8239,
  gpsAccuracyMeters: 11.4,
  capturedAt: '2026-10-19T01:15:00.000Z',
};
const SITE = {
  id: 'site-1', latitude: '21.4925', longitude: '105.8239', radiusMeters: 500,
  geoConfirmedAt: new Date('2026-10-18T00:00:00Z'),
};

function request(body: unknown = BODY, action = 'CHECK_IN') {
  return new NextRequest('http://localhost/api/worker/checkins/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': '123e4567-e89b-42d3-a456-426614174000' },
    body: JSON.stringify(body ?? { ...BODY, action }),
  });
}

describe('POST /api/worker/checkins/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: 'user-1', role: 'WORKER', workerId: 'worker-1' });
    mocks.worker.mockResolvedValue({ profileStatus: 'VERIFIED', employmentStatus: 'ACTIVE' });
    mocks.assignment.mockResolvedValue({ id: 'assignment-1', projectId: 'project-1' });
    mocks.sites.mockResolvedValue([SITE]);
    mocks.attendanceFindFirst.mockResolvedValue(null);
    mocks.attendanceCreate.mockResolvedValue({ id: 'attendance-1', receivedAt: new Date('2026-10-19T01:15:00Z') });
    mocks.attendanceUpdate.mockResolvedValue({ id: 'attendance-1-updated', receivedAt: new Date('2026-10-19T14:00:00Z') });
    mocks.idempotencyFindUnique.mockResolvedValue(null);
    mocks.idempotencyCreate.mockResolvedValue({});
  });

  it('records an in-range event with server-derived worker and assignment', async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { attendanceId: 'attendance-1', action: 'CHECK_IN', geofenceResult: 'INSIDE' },
    });
    expect(mocks.advisoryLock).toHaveBeenCalledTimes(1);
    expect(mocks.attendanceCreate.mock.calls[0][0].data).toMatchObject({
      workerId: 'worker-1', projectId: 'project-1', assignmentId: 'assignment-1',
    });
  });

  it('fails closed when the active project has no admin-confirmed geofence', async () => {
    mocks.sites.mockResolvedValue([{ ...SITE, geoConfirmedAt: null }]);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'SITE_GEOFENCE_NOT_CONFIGURED' } });
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();
  });

  it('blocks attendance unless Admin verified an active Worker profile', async () => {
    mocks.worker.mockResolvedValue({ profileStatus: 'PENDING_VERIFY', employmentStatus: 'ACTIVE' });
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'FORBIDDEN_NOT_VERIFIED' } });
    expect(mocks.assignment).not.toHaveBeenCalled();
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();
  });

  it('rejects coordinates outside every confirmed site', async () => {
    const response = await POST(request({ ...BODY, gpsLatitude: 0, gpsLongitude: 0 }));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'GEOFENCE_OUT_OF_RANGE' } });
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();
  });

  it('requires a check-in before check-out', async () => {
    const response = await POST(request({ ...BODY, action: 'CHECK_OUT' }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'CHECK_IN_REQUIRED' } });
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();
  });

  it('requires an idempotency UUID before touching the database', async () => {
    const req = new NextRequest('http://localhost/api/worker/checkins/events', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(BODY),
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
    expect(mocks.assignment).not.toHaveBeenCalled();
  });

  it('rejects CHECK_OUT when elapsed time since CHECK_IN is under 6 hours (< 6h)', async () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3_600_000);
    mocks.attendanceFindFirst.mockImplementation((arg: { where?: { mobileAction?: string; externalEventId?: string } }) => {
      if (arg.where?.mobileAction === 'CHECK_IN') {
        return Promise.resolve({
          id: 'checkin-1',
          workDate: new Date('2026-10-19T00:00:00.000Z'),
          receivedAt: threeHoursAgo,
        });
      }
      return Promise.resolve(null);
    });

    const response = await POST(request({ ...BODY, action: 'CHECK_OUT' }));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Chưa đủ thời gian tối thiểu 6 giờ kể từ lúc Vào ca để bấm Tan ca.',
      },
    });
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();
  });

  it('accepts CHECK_OUT when elapsed time since CHECK_IN is within 6h..12h and pairs workDate with openCheckIn', async () => {
    const eightHoursAgo = new Date(Date.now() - 8 * 3_600_000);
    mocks.attendanceFindFirst.mockImplementation((arg: { where?: { mobileAction?: string; externalEventId?: string } }) => {
      if (arg.where?.mobileAction === 'CHECK_IN') {
        return Promise.resolve({
          id: 'checkin-1',
          workDate: new Date('2026-10-18T00:00:00.000Z'),
          receivedAt: eightHoursAgo,
        });
      }
      return Promise.resolve(null);
    });

    const response = await POST(request({ ...BODY, workDate: '2026-10-19', action: 'CHECK_OUT' }));
    expect(response.status).toBe(201);
    expect(mocks.attendanceCreate).toHaveBeenCalledTimes(1);
    expect(mocks.attendanceCreate.mock.calls[0][0].data).toMatchObject({
      mobileAction: 'CHECK_OUT',
      workDate: new Date('2026-10-18T00:00:00.000Z'),
      externalEventId: 'mobile:worker-1:2026-10-18:CHECK_OUT',
    });
  });

  it('rejects CHECK_OUT when elapsed time since CHECK_IN exceeds 12 hours (> 12h)', async () => {
    const thirteenHoursAgo = new Date(Date.now() - 13 * 3_600_000);
    mocks.attendanceFindFirst.mockImplementation((arg: { where?: { mobileAction?: string } }) => {
      if (arg.where?.mobileAction === 'CHECK_IN') {
        return Promise.resolve({
          id: 'checkin-1',
          workDate: new Date('2026-10-19T00:00:00.000Z'),
          receivedAt: thirteenHoursAgo,
        });
      }
      return Promise.resolve(null);
    });

    const response = await POST(request({ ...BODY, action: 'CHECK_OUT' }));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ca làm việc đã quá 12 giờ chưa bấm Tan ca nên không được ghi nhận. Vui lòng bấm Vào ca để bắt đầu ca mới.',
      },
    });
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();
  });

  it('rejects CHECK_IN while an open shift is still within 12 hours (<= 12h without CHECK_OUT)', async () => {
    const fourHoursAgo = new Date(Date.now() - 4 * 3_600_000);
    mocks.attendanceFindFirst.mockImplementation((arg: { where?: { mobileAction?: string; externalEventId?: string } }) => {
      if (arg.where?.mobileAction === 'CHECK_IN') {
        return Promise.resolve({
          id: 'checkin-1',
          workDate: new Date('2026-10-19T00:00:00.000Z'),
          receivedAt: fourHoursAgo,
        });
      }
      return Promise.resolve(null);
    });

    const response = await POST(request({ ...BODY, action: 'CHECK_IN' }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: {
        code: 'ATTENDANCE_ACTION_ALREADY_RECORDED',
        message: 'Bạn đang trong ca làm việc. Vui lòng bấm Tan ca sau khi đủ 6h–12h kể từ lúc Vào ca.',
      },
    });
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();
  });

  it('allows a new CHECK_IN when previous unclosed shift exceeded 12 hours (> 12h), updating same-day expired row', async () => {
    const thirteenHoursAgo = new Date(Date.now() - 13 * 3_600_000);
    mocks.attendanceFindFirst.mockImplementation((arg: { where?: { mobileAction?: string; externalEventId?: string } }) => {
      if (arg.where?.externalEventId === 'mobile:worker-1:2026-10-19:CHECK_IN') {
        return Promise.resolve({
          id: 'expired-checkin-1',
          payloadHash: 'old-hash',
          receivedAt: thirteenHoursAgo,
        });
      }
      if (arg.where?.mobileAction === 'CHECK_IN') {
        return Promise.resolve({
          id: 'expired-checkin-1',
          workDate: new Date('2026-10-19T00:00:00.000Z'),
          receivedAt: thirteenHoursAgo,
        });
      }
      return Promise.resolve(null);
    });

    const response = await POST(request({ ...BODY, action: 'CHECK_IN' }));
    expect(response.status).toBe(201);
    expect(mocks.attendanceUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();
  });

  it('enforces 20-hour cooldown from previous valid shift CHECK_IN (< 20h rejected, >= 20h allowed)', async () => {
    const fifteenHoursAgo = new Date(Date.now() - 15 * 3_600_000);
    const sevenHoursAgo = new Date(Date.now() - 7 * 3_600_000); // 8h valid shift
    mocks.attendanceFindFirst.mockImplementation((arg: { where?: { mobileAction?: string } }) => {
      if (arg.where?.mobileAction === 'CHECK_IN') {
        return Promise.resolve({
          id: 'checkin-prev',
          workDate: new Date('2026-10-18T00:00:00.000Z'),
          receivedAt: fifteenHoursAgo,
        });
      }
      if (arg.where?.mobileAction === 'CHECK_OUT') {
        return Promise.resolve({
          id: 'checkout-prev',
          payloadHash: 'prev-out',
          receivedAt: sevenHoursAgo,
        });
      }
      return Promise.resolve(null);
    });

    const earlyRes = await POST(request({ ...BODY, action: 'CHECK_IN' }));
    expect(earlyRes.status).toBe(422);
    const earlyJson = await earlyRes.json();
    expect(earlyJson.error.code).toBe('CHECK_IN_COOLDOWN_ACTIVE');
    expect(earlyJson.error.message).toContain('Chưa đủ 20 giờ kể từ lần Vào ca trước');
    expect(mocks.attendanceCreate).not.toHaveBeenCalled();

    // Now test >= 20h since previous CHECK_IN (21h ago, checkout 13h ago = 8h valid shift)
    const twentyOneHoursAgo = new Date(Date.now() - 21 * 3_600_000);
    const thirteenHoursAgo = new Date(Date.now() - 13 * 3_600_000);
    mocks.attendanceFindFirst.mockImplementation((arg: { where?: { mobileAction?: string } }) => {
      if (arg.where?.mobileAction === 'CHECK_IN') {
        return Promise.resolve({
          id: 'checkin-prev',
          workDate: new Date('2026-10-18T00:00:00.000Z'),
          receivedAt: twentyOneHoursAgo,
        });
      }
      if (arg.where?.mobileAction === 'CHECK_OUT') {
        return Promise.resolve({
          id: 'checkout-prev',
          payloadHash: 'prev-out',
          receivedAt: thirteenHoursAgo,
        });
      }
      return Promise.resolve(null);
    });

    const okRes = await POST(request({ ...BODY, action: 'CHECK_IN' }));
    expect(okRes.status).toBe(201);
    expect(mocks.attendanceCreate).toHaveBeenCalledTimes(1);
  });
});
