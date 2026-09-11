/**
 * clients-master.route.test.ts — V5-M1-06c / RQ-04 / STEP-04 / AC-04.
 *
 * UNIT (no DB): role matrix cho Clients master (`/api/clients` + `[id]`).
 * ClientCompany chưa có scope builder → chỉ ROOT_ROLES {ADMIN, HR_MANAGER, DIRECTOR}
 * đọc/ghi (L1 passthrough). Deviation: SALE (cũ được view+CRUD) → 403.
 *   - cross-client (RLS backstop): update trả P2025 → 404.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  // [Y10.4-projection] Used inside withDbContext when `name` changes —
  // propagation to Projects that reference this ClientCompany.
  projectUpdateMany: vi.fn(),
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

import { GET, POST } from '@/app/api/clients/route';
import { PUT } from '@/app/api/clients/[id]/route';

const tx = () => ({
  clientCompany: {
    findMany: mocks.findMany,
    count: mocks.count,
    create: mocks.create,
    update: mocks.update,
  },
  // [Y10.4-projection] Mock the project delegate used inside the same boundary
  // callback for clientCompanyName propagation on rename.
  project: {
    updateMany: mocks.projectUpdateMany,
  },
});

const getReq = () => new NextRequest('http://localhost/api/clients');
const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/clients', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
const putReq = (body: unknown) =>
  new NextRequest('http://localhost/api/clients/c1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
const putCtx = { params: Promise.resolve({ id: 'c1' }) };

describe('clients master — role matrix (RQ-04 / AC-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    mocks.create.mockResolvedValue({ id: 'c1' });
    mocks.update.mockResolvedValue({ id: 'c1' });
    // [Y10.4-projection] Default no-op for project rename propagation.
    mocks.projectUpdateMany.mockResolvedValue({ count: 0 });
    mocks.authorizedRO.mockImplementation((cb: (t: unknown) => unknown) => cb(tx()));
    mocks.dbContext.mockImplementation((cb: (t: unknown) => unknown) => cb(tx()));
  });

  it.each(['ADMIN', 'HR_MANAGER', 'DIRECTOR'])('GET: %s (root) → 200 passthrough', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    expect(mocks.authorizedRO).toHaveBeenCalledTimes(1);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  it.each(['SALE', 'PM', 'ACCOUNTANT', 'HR_STAFF', 'MKT', 'WORKER'])(
    'GET: %s → 403 (không có builder / deny), KHÔNG query',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
      const res = await GET(getReq());
      expect(res.status).toBe(403);
      expect(mocks.authorizedRO).not.toHaveBeenCalled();
      expect(mocks.findMany).not.toHaveBeenCalled();
    },
  );

  it.each(['ADMIN', 'HR_MANAGER', 'DIRECTOR'])('POST: %s → 201 tạo qua boundary', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await POST(postReq({ code: 'C01', name: 'KH 1' }));
    expect(res.status).toBe(201);
    expect(mocks.dbContext).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('POST: SALE → 403 (deviation: SALE cũ tạo được nay bị chặn)', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'SALE' });
    const res = await POST(postReq({ code: 'C01', name: 'KH 1' }));
    expect(res.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('PUT: DIRECTOR → 200 sửa qua boundary', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'DIRECTOR' });
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

  it('PUT: cross-client (RLS → P2025) → 404', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ADMIN' });
    mocks.update.mockRejectedValueOnce({ code: 'P2025' });
    const res = await PUT(putReq({ name: 'x' }), putCtx);
    expect(res.status).toBe(404);
  });

  // [Y10.4-projection] Khi ClientCompany.name đổi, propagate sang tất cả Projects
  // tham chiếu công ty đó. Cả `update` + `project.updateMany` chạy trong cùng
  // `withDbContext` callback (RLS-scoped, atomic, satisfies api-boundary AC-08).
  it('PUT: rename → propagate project.updateMany INSIDE boundary', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ADMIN' });
    const res = await PUT(putReq({ name: 'Tên mới' }), putCtx);
    expect(res.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.projectUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.projectUpdateMany).toHaveBeenCalledWith({
      where: { clientCompanyId: 'c1' },
      data: { clientCompanyName: 'Tên mới' },
    });
  });

  // [Y10.4-projection] Khi body không có `name`, KHÔNG gọi project.updateMany
  // (tránh churn không cần thiết).
  it('PUT: no name change → KHÔNG propagate', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ADMIN' });
    const res = await PUT(putReq({ industry: 'CN' }), putCtx);
    expect(res.status).toBe(200);
    expect(mocks.projectUpdateMany).not.toHaveBeenCalled();
  });
});
