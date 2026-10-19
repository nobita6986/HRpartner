/**
 * site-gps.routes.test.ts — hrp-t1a-android-gps-project-site-config (AC-06).
 *
 * UNIT (no DB): POST /api/projects/[id]/sites và PUT /api/projects/[id]/sites/[siteId]:
 *   - unauth → 401; role ngoài allowlist → 403; body sai JSON → 400 INVALID_BODY;
 *     service VALIDATION → 400; NOT_FOUND → 404; IdempotencyConflict → 409;
 *   - success POST (không idem key) → 201 { site }; có idem key → withIdempotency path;
 *   - success PUT → 200 { site }.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  createSiteForProject: vi.fn(),
  updateSiteGps: vi.fn(),
  dbContext: vi.fn(),
  withIdempotency: vi.fn(),
  AuthSessionError: class AuthSessionError extends Error {
    constructor() {
      super('no token');
      this.name = 'AuthSessionError';
      (this as unknown as { code: string }).code = 'UNAUTHORIZED';
    }
  },
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: mocks.AuthSessionError,
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) => mocks.dbContext(cb),
}));
vi.mock('@/src/shared/integrity/idempotency', () => ({
  withIdempotency: mocks.withIdempotency,
}));

// Service là module thật nhưng 2 hàm mutation với
// trong test — qua importOriginal spread giữ nguyên SiteGpsServiceError class.
vi.mock('@/src/domains/crm/site-gps.service', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createSiteForProject: mocks.createSiteForProject,
    updateSiteGps: mocks.updateSiteGps,
  };
});

import { POST as sitesPOST } from '@/app/api/projects/[id]/sites/route';
import { PUT as sitePUT } from '@/app/api/projects/[id]/sites/[siteId]/route';
import { SiteGpsServiceError } from '@/src/domains/crm/site-gps.service';

const SITE = {
  id: 'site-1', projectId: 'p1', name: 'Cổng B', address: null,
  latitude: 21.4925, longitude: 105.8239, radiusMeters: 800,
  gpsStatus: 'CONFIRMED', geoConfirmedAt: '2026-10-19T00:00:00.000Z', geoConfirmedById: 'admin-1',
};

const VALID_CREATE = { name: 'Cổng B', latitude: 21.4925, longitude: 105.8239, radiusMeters: 800 };
const VALID_UPDATE = { address: 'Địa chỉ', latitude: 21.4925, longitude: 105.8239, radiusMeters: 800 };

const ctx = (role: string) => ({ userId: 'admin-1', role });

const postReq = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost/api/projects/p1/sites', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  });

const putReq = (body: unknown) =>
  new NextRequest('http://localhost/api/projects/p1/sites/site-1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

describe('POST /api/projects/[id]/sites (AC-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.dbContext.mockImplementation((cb: (t: unknown) => unknown) => cb({ id: 'tx' }));
    mocks.createSiteForProject.mockResolvedValue(SITE);
  });

  it('unauth → 401', async () => {
    mocks.getAuthContext.mockRejectedValue(new mocks.AuthSessionError());
    const res = await sitesPOST(postReq(VALID_CREATE), { params: Promise.resolve({ id: 'p1' }) } as never);
    expect(res.status).toBe(401);
    expect(mocks.createSiteForProject).not.toHaveBeenCalled();
  });

  it('role ngoài allowlist (PM/HR_MANAGER/HR_STAFF) → 403 FORBIDDEN', async () => {
    for (const role of ['PM', 'HR_MANAGER', 'HR_STAFF']) {
      mocks.getAuthContext.mockResolvedValue(ctx(role));
      const res = await sitesPOST(postReq(VALID_CREATE), { params: Promise.resolve({ id: 'p1' }) } as never);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('PERMISSION_DENIED');
    }
  });

  it('body JSON sai → 400 INVALID_BODY', async () => {
    mocks.getAuthContext.mockResolvedValue(ctx('ADMIN'));
    const bad = new NextRequest('http://localhost/api/projects/p1/sites', { method: 'POST', body: 'not-json' });
    const res = await sitesPOST(bad, { params: Promise.resolve({ id: 'p1' }) } as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_BODY');
  });

  it('service VALIDATION → 400', async () => {
    mocks.getAuthContext.mockResolvedValue(ctx('ADMIN'));
    mocks.createSiteForProject.mockRejectedValue(new SiteGpsServiceError('VALIDATION', 'name là bắt buộc.'));
    const res = await sitesPOST(postReq({ latitude: 1, longitude: 2 }), { params: Promise.resolve({ id: 'p1' }) } as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('VALIDATION');
  });

  it('service NOT_FOUND → 404', async () => {
    mocks.getAuthContext.mockResolvedValue(ctx('ADMIN'));
    mocks.createSiteForProject.mockRejectedValue(new SiteGpsServiceError('NOT_FOUND', 'fail'));
    const res = await sitesPOST(postReq(VALID_CREATE), { params: Promise.resolve({ id: 'p1' }) } as never);
    expect(res.status).toBe(404);
  });

  it('success không idem key → 201 { site }; projectId từ route param vào service call', async () => {
    mocks.getAuthContext.mockResolvedValue(ctx('ADMIN'));
    const res = await sitesPOST(
      postReq({ ...VALID_CREATE, projectId: 'evil-id' }),
      { params: Promise.resolve({ id: 'p1' }) } as never,
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.site.id).toBe('site-1');

    // service call: (tx, ctx, projectId='p1' (route), raw body — Body có
    // projectId lạ cũng KHÔNG được dùng (service sẽ strip trong validation).
    const call = mocks.createSiteForProject.mock.calls[0];
    expect(call[2]).toBe('p1');
    expect(call[3]).toEqual({ ...VALID_CREATE, projectId: 'evil-id' });
  });

  it('có idem key → withIdempotency path', async () => {
    mocks.getAuthContext.mockResolvedValue(ctx('ADMIN'));
    mocks.withIdempotency.mockResolvedValue({ body: { site: SITE }, statusCode: 201 });
    const res = await sitesPOST(postReq(VALID_CREATE, { 'x-idempotency-key': 'idem-123' }), { params: Promise.resolve({ id: 'p1' }) } as never);
    expect(res.status).toBe(201);
    expect(mocks.withIdempotency).toHaveBeenCalledTimes(1);
    const arg = mocks.withIdempotency.mock.calls[0][0];
    expect(arg.route).toBe('POST:/api/projects/p1/sites');
    expect(arg.key).toBe('idem-123');
  });
});

describe('PUT /api/projects/[id]/sites/[siteId] (AC-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.dbContext.mockImplementation((cb: (t: unknown) => unknown) => cb({ id: 'tx' }));
    mocks.updateSiteGps.mockResolvedValue(SITE);
  });

  it('unauth → 401', async () => {
    mocks.getAuthContext.mockRejectedValue(new mocks.AuthSessionError());
    const res = await sitePUT(putReq(VALID_UPDATE), { params: Promise.resolve({ id: 'p1', siteId: 'site-1' }) } as never);
    expect(res.status).toBe(401);
  });

  it('role không được phép → 403 PERMISSION_DENIED', async () => {
    mocks.getAuthContext.mockResolvedValue(ctx('SALE'));
    const res = await sitePUT(putReq(VALID_UPDATE), { params: Promise.resolve({ id: 'p1', siteId: 'site-1' }) } as never);
    expect(res.status).toBe(403);
    expect(mocks.updateSiteGps).not.toHaveBeenCalled();
  });

  it('success → 200 { site }; service nhận (tx, ctx, projectId, siteId, raw, auditMeta)', async () => {
    mocks.getAuthContext.mockResolvedValue(ctx('DIRECTOR'));
    const res = await sitePUT(putReq(VALID_UPDATE), { params: Promise.resolve({ id: 'p1', siteId: 'site-1' }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.site.id).toBe('site-1');
    const call = mocks.updateSiteGps.mock.calls[0];
    expect(call[2]).toBe('p1');
    expect(call[3]).toBe('site-1');
    expect(call[5]).toMatchObject({ ipAddress: undefined, userAgent: undefined });
  });
});
