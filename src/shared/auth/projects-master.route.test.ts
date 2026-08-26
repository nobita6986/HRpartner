/**
 * projects-master.route.test.ts — V5-M1-06c / RQ-03 / STEP-03 / AC-03.
 *
 * UNIT (no DB): role matrix cho Projects master (`/api/projects` + `[id]`).
 *   - GET VIEWER_ROLES = {ADMIN, HR_MANAGER, HR_STAFF, PM, ACCOUNTANT, DIRECTOR};
 *     SALE + MKT → 403 (AC-03 "SALE/MKT deny"), KHÔNG query.
 *   - POST/PUT ADMIN_ROLES = {ADMIN, PM, HR_MANAGER}.
 *   - cross-project (RLS backstop): update trả P2025 → 404.
 *   - boundary throw AuthScopeError → 403 (catch phòng thủ).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  authorizedRO: vi.fn(),
  dbContext: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {},
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDbReadOnly: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) =>
    mocks.authorizedRO(cb),
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) => mocks.dbContext(cb),
}));

import { GET, POST } from '@/app/api/projects/route';
import { PUT } from '@/app/api/projects/[id]/route';

const tx = () => ({
  project: {
    findMany: mocks.findMany,
    count: mocks.count,
    create: mocks.create,
    update: mocks.update,
  },
});

const getReq = () => new NextRequest('http://localhost/api/projects');
const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/projects', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
const putReq = (body: unknown) =>
  new NextRequest('http://localhost/api/projects/p1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
const putCtx = { params: Promise.resolve({ id: 'p1' }) };

describe('projects master — role matrix (RQ-03 / AC-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    mocks.create.mockResolvedValue({ id: 'p1' });
    mocks.update.mockResolvedValue({ id: 'p1' });
    // boundary mặc định: gọi cb với tx đã scope (mô phỏng L1+L2 / L2).
    mocks.authorizedRO.mockImplementation((cb: (t: unknown) => unknown) => cb(tx()));
    mocks.dbContext.mockImplementation((cb: (t: unknown) => unknown) => cb(tx()));
  });

  it.each(['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'ACCOUNTANT', 'DIRECTOR'])(
    'GET: %s (viewer) → 200 qua boundary',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
      const res = await GET(getReq());
      expect(res.status).toBe(200);
      expect(mocks.authorizedRO).toHaveBeenCalledTimes(1);
      expect(mocks.findMany).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['SALE', 'MKT', 'CTV', 'WORKER', 'VENDOR_ADMIN'])(
    'GET: %s → 403 (AC-03 deny), KHÔNG query',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
      const res = await GET(getReq());
      expect(res.status).toBe(403);
      expect(mocks.authorizedRO).not.toHaveBeenCalled();
      expect(mocks.findMany).not.toHaveBeenCalled();
    },
  );

  it('GET: boundary throw AuthScopeError → 403', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'PM' });
    mocks.authorizedRO.mockRejectedValueOnce(new AuthScopeError('DENY_BY_DEFAULT', 'no scope'));
    const res = await GET(getReq());
    expect(res.status).toBe(403);
  });

  it.each(['ADMIN', 'PM', 'HR_MANAGER'])('POST: %s → 201 tạo qua boundary', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await POST(postReq({ code: 'P01', name: 'DA 1', clientCompanyId: 'c1', startDate: '2026-01-01' }));
    expect(res.status).toBe(201);
    expect(mocks.dbContext).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it.each(['SALE', 'ACCOUNTANT', 'HR_STAFF', 'MKT'])('POST: %s → 403, KHÔNG tạo', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await POST(postReq({ code: 'P01', name: 'DA 1', clientCompanyId: 'c1', startDate: '2026-01-01' }));
    expect(res.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('PUT: PM → 200 sửa qua boundary', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'pm', role: 'PM' });
    const res = await PUT(putReq({ name: 'x' }), putCtx);
    expect(res.status).toBe(200);
    expect(mocks.dbContext).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it('PUT: SALE → 403, KHÔNG sửa', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'SALE' });
    const res = await PUT(putReq({ name: 'x' }), putCtx);
    expect(res.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('PUT: cross-project (RLS → P2025) → 404', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'pm', role: 'PM' });
    mocks.update.mockRejectedValueOnce({ code: 'P2025' });
    const res = await PUT(putReq({ name: 'x' }), putCtx);
    expect(res.status).toBe(404);
  });
});
