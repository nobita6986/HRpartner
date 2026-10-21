import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(),
  withAuthorizedDb: vi.fn(),
  withDbContext: vi.fn(),
  getUserOnboardingContext: vi.fn(),
  onboardWorkerAccountByAdmin: vi.fn(),
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
    getUserOnboardingContext: mocks.getUserOnboardingContext,
    onboardWorkerAccountByAdmin: mocks.onboardWorkerAccountByAdmin,
  };
});

import { GET, POST } from './route';

describe('/api/admin/users/[id]/onboard-worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrisma.mockReturnValue({});
    mocks.getAuthContext.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    mocks.withAuthorizedDb.mockImplementation((_p, _c, cb) => cb({}));
    mocks.withDbContext.mockImplementation((_p, _c, cb) => cb({}));
  });

  it('GET trả về ngữ cảnh kích hoạt và danh sách slot mở cho ADMIN', async () => {
    mocks.getUserOnboardingContext.mockResolvedValue({
      user: { id: 'u1', name: 'Nguyễn A', phone: '0987654321', phoneVerified: false, role: 'WORKER', isActive: true },
      linkedWorker: null,
      matchingWorkers: [],
      openSlots: [],
    });

    const res = await GET(
      new NextRequest('http://localhost/api/admin/users/u1/onboard-worker'),
      { params: Promise.resolve({ id: 'u1' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe('u1');
  });

  it('POST chặn non-ADMIN với 403 FORBIDDEN', async () => {
    mocks.getAuthContext.mockResolvedValueOnce({ userId: 'hr-1', role: 'HR_MANAGER' });
    const res = await POST(
      new NextRequest('http://localhost/api/admin/users/u1/onboard-worker', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test' }),
      }),
      { params: Promise.resolve({ id: 'u1' }) },
    );
    expect(res.status).toBe(403);
    expect(mocks.onboardWorkerAccountByAdmin).not.toHaveBeenCalled();
  });

  it('POST thực hiện kích hoạt và gán dự án thành công cho ADMIN', async () => {
    mocks.onboardWorkerAccountByAdmin.mockResolvedValue({
      userId: 'u1',
      phoneVerified: true,
      workerId: 'w1',
      workerCode: 'USR-EMP-001',
      workerCreated: true,
      profileStatus: 'VERIFIED',
      employmentStatus: 'ACTIVE',
      assignment: {
        id: 'asg-1',
        projectId: 'proj-1',
        projectCode: 'PRJ-001',
        projectName: 'Samsung',
        staffingOrderId: 'order-1',
        staffingOrderSlotId: 'slot-1',
        employeeCode: 'NV-001',
        employmentType: 'HRP_EMPLOYED',
        workSetting: 'PHOTHONG',
        validFrom: '2026-10-21T00:00:00.000Z',
      },
    });

    const res = await POST(
      new NextRequest('http://localhost/api/admin/users/u1/onboard-worker', {
        method: 'POST',
        body: JSON.stringify({
          slotId: 'slot-1',
          employeeCode: 'NV-001',
          employmentType: 'HRP_EMPLOYED',
          workSetting: 'PHOTHONG',
          reason: 'Xác thực thủ công và gán dự án',
        }),
      }),
      { params: Promise.resolve({ id: 'u1' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.workerId).toBe('w1');
    expect(body.assignment.employeeCode).toBe('NV-001');
  });
});
