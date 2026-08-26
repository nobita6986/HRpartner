/**
 * vendors-master.route.test.ts — V5-M1-06b / RQ-08 / STEP-04 / AC-08 / DEC-08.
 *
 * UNIT (no DB): role matrix cho Vendor master (`/api/vendors`). Chạy luôn (bổ trợ
 * LIVE two-vendor):
 *   - GET VIEWER_ROLES = {ADMIN, SALE, HR_MANAGER}; PM/MKT/CTV/WORKER/VENDOR bị 403.
 *     DEC-08 headline: PM KHÔNG được liệt kê Vendor master.
 *   - POST ADMIN_ROLES = {ADMIN, SALE}; HR_MANAGER (viewer) KHÔNG tạo được.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  vendorFindMany: vi.fn(),
  vendorCount: vi.fn(),
  vendorCreate: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {},
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDbReadOnly: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) =>
    cb({ vendor: { findMany: mocks.vendorFindMany, count: mocks.vendorCount } }),
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) =>
    cb({ vendor: { create: mocks.vendorCreate } }),
}));

import { GET, POST } from '@/app/api/vendors/route';

const getReq = () => new NextRequest('http://localhost/api/vendors');
const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/vendors', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

describe('vendors master — role matrix (DEC-08 / AC-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.vendorFindMany.mockResolvedValue([]);
    mocks.vendorCount.mockResolvedValue(0);
    mocks.vendorCreate.mockResolvedValue({ id: 'v1' });
  });

  it('GET: PM → 403 (DEC-08: PM không xem Vendor master), KHÔNG query', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'pm-1', role: 'PM' });
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    expect(mocks.vendorFindMany).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'SALE', 'HR_MANAGER'])('GET: %s (viewer) → 200 qua boundary', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    expect(mocks.vendorFindMany).toHaveBeenCalledTimes(1);
  });

  it.each(['MKT', 'CTV', 'WORKER', 'VENDOR_ADMIN', 'EMPLOYEE'])(
    'GET: %s → 403 (không enumerate master)',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role, vendorId: 'vendor-A' });
      const res = await GET(getReq());
      expect(res.status).toBe(403);
      expect(mocks.vendorFindMany).not.toHaveBeenCalled();
    },
  );

  it('POST: HR_MANAGER là viewer nhưng KHÔNG tạo được → 403', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'hr-1', role: 'HR_MANAGER' });
    const res = await POST(postReq({ code: 'V01', name: 'Vendor 1' }));
    expect(res.status).toBe(403);
    expect(mocks.vendorCreate).not.toHaveBeenCalled();
  });

  it('POST: PM → 403, KHÔNG tạo', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'pm-1', role: 'PM' });
    const res = await POST(postReq({ code: 'V01', name: 'Vendor 1' }));
    expect(res.status).toBe(403);
    expect(mocks.vendorCreate).not.toHaveBeenCalled();
  });

  it('POST: SALE → 201 tạo qua boundary', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'sale-1', role: 'SALE' });
    const res = await POST(postReq({ code: 'V01', name: 'Vendor 1' }));
    expect(res.status).toBe(201);
    expect(mocks.vendorCreate).toHaveBeenCalledTimes(1);
  });
});
