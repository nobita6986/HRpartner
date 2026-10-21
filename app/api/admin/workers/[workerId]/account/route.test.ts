import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(),
  withAuthorizedDb: vi.fn(),
  withDbContext: vi.fn(),
  getWorkerAccountContext: vi.fn(),
  linkOrAssignWorkerAccountByAdmin: vi.fn(),
  unlinkWorkerAccountByAdmin: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
  },
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDb: mocks.withAuthorizedDb,
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: mocks.withDbContext,
}));
vi.mock('@/src/domains/admin/worker-onboarding.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/domains/admin/worker-onboarding.service')>();
  return {
    ...actual,
    getWorkerAccountContext: mocks.getWorkerAccountContext,
    linkOrAssignWorkerAccountByAdmin: mocks.linkOrAssignWorkerAccountByAdmin,
    unlinkWorkerAccountByAdmin: mocks.unlinkWorkerAccountByAdmin,
  };
});

import { DELETE, GET, POST } from './route';

describe('/api/admin/workers/[workerId]/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrisma.mockReturnValue({});
    mocks.getAuthContext.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    mocks.withAuthorizedDb.mockImplementation((_p, _c, cb) => cb({}));
    mocks.withDbContext.mockImplementation((_p, _c, cb) => cb({}));
  });

  it('GET trả về danh sách tài khoản gợi ý và slot mở cho ADMIN', async () => {
    mocks.getWorkerAccountContext.mockResolvedValue({
      worker: {
        id: 'w1',
        userId: 'USR-EMP-001',
        fullName: 'Nguyễn A',
        phone: '0987654321',
        profileStatus: 'INCOMPLETE',
        employmentStatus: 'NONE',
        accountUserId: null,
        activeAssignment: null,
      },
      linkedUser: null,
      candidateUsers: [
        {
          id: 'u1',
          name: 'Nguyễn A',
          phone: '0987654321',
          phoneVerified: false,
          isActive: true,
          matchedByPhone: true,
        },
      ],
      openSlots: [],
    });

    const res = await GET(
      new NextRequest('http://localhost/api/admin/workers/w1/account'),
      { params: Promise.resolve({ workerId: 'w1' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.candidateUsers).toHaveLength(1);
  });

  it('POST liên kết tài khoản và kích hoạt Worker thành công', async () => {
    mocks.linkOrAssignWorkerAccountByAdmin.mockResolvedValue({
      workerId: 'w1',
      userId: 'u1',
      phoneVerified: true,
      profileStatus: 'VERIFIED',
      employmentStatus: 'ACTIVE',
      assignment: null,
    });

    const res = await POST(
      new NextRequest('http://localhost/api/admin/workers/w1/account', {
        method: 'POST',
        body: JSON.stringify({ userId: 'u1', reason: 'Liên kết tài khoản NLĐ' }),
      }),
      { params: Promise.resolve({ workerId: 'w1' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.userId).toBe('u1');
    expect(body.phoneVerified).toBe(true);
  });

  it('DELETE gỡ liên kết tài khoản Worker', async () => {
    mocks.unlinkWorkerAccountByAdmin.mockResolvedValue({
      workerId: 'w1',
      unlinkedUserId: 'u1',
    });

    const res = await DELETE(
      new NextRequest('http://localhost/api/admin/workers/w1/account', {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Gỡ tài khoản nhầm' }),
      }),
      { params: Promise.resolve({ workerId: 'w1' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, workerId: 'w1', unlinkedUserId: 'u1' });
  });
});
