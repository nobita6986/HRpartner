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
  // [Y10.4-projection] Used inside withDbContext to derive clientCompanyName.
  // Mock both create-side lookup (POST) and update-side lookup (PUT) on the same delegate.
  clientCompanyFindUnique: vi.fn(),
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
  // [Y10.4-projection] Mocked inside the same `tx` so the create/update route
  // can derive clientCompanyName from ClientCompany.name via the boundary callback.
  clientCompany: {
    findUnique: mocks.clientCompanyFindUnique,
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
    // [Y10.4-projection] Default: ClientCompany exists with a canonical name.
    // Routes derive clientCompanyName from this lookup; tests verify the field.
    mocks.clientCompanyFindUnique.mockResolvedValue({ name: 'Công ty ABC' });
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

  // [Y10.4-projection] POST: derive clientCompanyName from ClientCompany lookup
  // INSIDE the boundary callback. The lookup is RLS-scoped — no raw client op.
  it('POST: clientCompanyName derived from ClientCompany lookup (no raw client op)', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ADMIN' });
    mocks.clientCompanyFindUnique.mockResolvedValue({ name: 'Khách hàng XYZ' });
    const res = await POST(
      postReq({ code: 'P-NEW', name: 'DA mới', clientCompanyId: 'cc-99', startDate: '2026-12-01' }),
    );
    expect(res.status).toBe(201);
    expect(mocks.clientCompanyFindUnique).toHaveBeenCalledTimes(1);
    expect(mocks.clientCompanyFindUnique).toHaveBeenCalledWith({
      where: { id: 'cc-99' },
      select: { name: true },
    });
    // clientCompanyName phải lấy từ lookup, không phải từ body
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientCompanyName: 'Khách hàng XYZ',
          clientCompanyId: 'cc-99',
        }),
      }),
    );
  });

  // [Y10.4-projection] POST: lookup returns null → clientCompanyName = null
  // (FK constraint sẽ reject invalid clientCompanyId ở tầng dưới).
  it('POST: lookup returns null → clientCompanyName = null', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ADMIN' });
    mocks.clientCompanyFindUnique.mockResolvedValue(null);
    const res = await POST(
      postReq({ code: 'P-NEW', name: 'DA mới', clientCompanyId: 'cc-missing', startDate: '2026-12-01' }),
    );
    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientCompanyName: null }),
      }),
    );
  });

  // [Y10.4-projection] PUT: when clientCompanyId changes, derive clientCompanyName
  // from the NEW ClientCompany lookup INSIDE the boundary callback.
  it('PUT: clientCompanyId changes → derive new clientCompanyName INSIDE boundary', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'pm', role: 'PM' });
    mocks.clientCompanyFindUnique.mockResolvedValue({ name: 'Khách hàng mới' });
    const res = await PUT(putReq({ clientCompanyId: 'cc-new' }), putCtx);
    expect(res.status).toBe(200);
    expect(mocks.clientCompanyFindUnique).toHaveBeenCalledWith({
      where: { id: 'cc-new' },
      select: { name: true },
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({
          clientCompanyId: 'cc-new',
          clientCompanyName: 'Khách hàng mới',
        }),
      }),
    );
  });

  // [Y10.4-projection] PUT: when clientCompanyId is NOT in the body, NO lookup.
  it('PUT: no clientCompanyId in body → no clientCompany lookup', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'pm', role: 'PM' });
    const res = await PUT(putReq({ name: 'x' }), putCtx);
    expect(res.status).toBe(200);
    expect(mocks.clientCompanyFindUnique).not.toHaveBeenCalled();
    // clientCompanyName KHÔNG nằm trong data update (giữ nguyên giá trị cũ trong DB)
    const updateCall = mocks.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('clientCompanyName');
    expect(updateCall.data).not.toHaveProperty('clientCompanyId');
  });
});
