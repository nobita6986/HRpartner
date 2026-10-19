import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(),
  withDbContext: vi.fn(),
  writeAuditLog: vi.fn(),
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error { code = 'UNAUTHENTICATED'; },
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));
vi.mock('@/src/shared/integrity/audit', () => ({ writeAuditLog: mocks.writeAuditLog }));

import { POST } from './route';

const request = (body: unknown) => new NextRequest('http://localhost/api/admin/users/u1/phone-verification', {
  method: 'POST',
  body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPrisma.mockReturnValue({});
  mocks.getAuthContext.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
  mocks.withDbContext.mockImplementation((_prisma, _ctx, callback) => callback({ user: mocks.user }));
  mocks.user.findUnique.mockResolvedValue({ id: 'u1', role: 'WORKER', phone: '0987654321', phoneVerified: false, isActive: true });
  mocks.user.update.mockResolvedValue({});
  mocks.writeAuditLog.mockResolvedValue({ id: 'audit-1' });
});

describe('POST /api/admin/users/[id]/phone-verification', () => {
  it('admin xác nhận thủ công và ghi audit', async () => {
    const response = await POST(request({ reason: 'Đã đối chiếu trực tiếp' }), { params: Promise.resolve({ id: 'u1' }) });
    expect(response.status).toBe(200);
    expect(mocks.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'u1' },
      data: expect.objectContaining({ phoneVerified: true, phoneVerifiedAt: expect.any(Date) }),
    }));
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'PHONE_VERIFIED_MANUALLY',
      reason: 'Đã đối chiếu trực tiếp',
    }));
  });

  it('chặn tài khoản không phải WORKER hoặc không hoạt động', async () => {
    mocks.user.findUnique.mockResolvedValueOnce({ id: 'u1', role: 'ADMIN', phone: '0987654321', phoneVerified: false, isActive: true });
    const response = await POST(request({ reason: 'Kiểm tra' }), { params: Promise.resolve({ id: 'u1' }) });
    expect(response.status).toBe(409);
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it('chỉ ADMIN được gọi', async () => {
    mocks.getAuthContext.mockResolvedValueOnce({ userId: 'worker-1', role: 'WORKER' });
    const response = await POST(request({ reason: 'Kiểm tra' }), { params: Promise.resolve({ id: 'u1' }) });
    expect(response.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });
});
