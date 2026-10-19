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
  idempotencyFindUnique: vi.fn(),
  idempotencyCreate: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({ getAuthContext: mocks.auth }));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/with-system-db', () => ({
  SYSTEM_CHECKIN: { userId: 'system:checkin', role: 'ADMIN', purpose: 'CHECKIN' },
  withSystemDb: (_prisma: unknown, _principal: unknown, cb: (tx: unknown) => unknown) => cb({
    $queryRaw: mocks.advisoryLock,
    worker: { findUnique: mocks.worker },
    idempotencyKey: { findUnique: mocks.idempotencyFindUnique, create: mocks.idempotencyCreate },
    projectAssignment: { findFirst: mocks.assignment },
    site: { findMany: mocks.sites },
    attendanceEvent: { findFirst: mocks.attendanceFindFirst, create: mocks.attendanceCreate },
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
});
