import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(() => ({})),
  withAuthorizedDb: vi.fn(),
  withDbContext: vi.fn(),
  getLaborProfileOnboardingContext: vi.fn(),
  onboardLaborProfileByAdmin: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
  },
}));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDb: mocks.withAuthorizedDb,
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: mocks.withDbContext,
}));
vi.mock('@/src/domains/admin/worker-onboarding.service', () => ({
  getLaborProfileOnboardingContext: mocks.getLaborProfileOnboardingContext,
  onboardLaborProfileByAdmin: mocks.onboardLaborProfileByAdmin,
  WorkerOnboardingError: class WorkerOnboardingError extends Error {
    constructor(
      public readonly code: string,
      public readonly httpStatus: number,
      message: string,
      public readonly details?: Record<string, unknown>,
    ) {
      super(message);
    }
  },
}));

import { GET, POST } from './route';

describe('/api/admin/labor-profiles/[id]/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withAuthorizedDb.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) =>
      cb({}),
    );
    mocks.withDbContext.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) =>
      cb({}),
    );
  });

  it('GET returns 403 for non-ADMIN', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'hr-1', role: 'HR_MANAGER' });
    const res = await GET(new NextRequest('http://localhost/api/admin/labor-profiles/lp-1/onboarding'), {
      params: Promise.resolve({ id: 'lp-1' }),
    });
    expect(res.status).toBe(403);
  });

  it('GET returns onboarding context for ADMIN', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    mocks.getLaborProfileOnboardingContext.mockResolvedValue({
      laborProfile: {
        id: 'lp-1',
        fullName: 'Duc Nguyen',
        phone: '0987654321',
        cccdNumber: null,
        identityVerification: 'UNVERIFIED',
        completeness: 'MINIMAL',
        workerId: null,
      },
      linkedWorker: null,
      matchingWorkers: [],
      linkedUser: null,
      matchingUsers: [
        {
          id: 'u-1',
          name: 'Duc Nguyen',
          phone: '0987654321',
          phoneVerified: false,
          isActive: true,
          matchedByPhone: true,
        },
      ],
      openSlots: [],
    });

    const res = await GET(new NextRequest('http://localhost/api/admin/labor-profiles/lp-1/onboarding'), {
      params: Promise.resolve({ id: 'lp-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.laborProfile.phone).toBe('0987654321');
    expect(body.matchingUsers).toHaveLength(1);
  });

  it('POST validates reason and calls onboardLaborProfileByAdmin for ADMIN', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    mocks.onboardLaborProfileByAdmin.mockResolvedValue({
      laborProfileId: 'lp-1',
      userId: 'u-1',
      accountCreated: false,
      temporaryPassword: null,
      phoneVerified: true,
      workerId: 'w-1',
      workerCode: 'USR-EMP-009',
      workerCreated: true,
      profileStatus: 'VERIFIED',
      employmentStatus: 'ACTIVE',
      assignment: null,
    });

    const res = await POST(
      new NextRequest('http://localhost/api/admin/labor-profiles/lp-1/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'u-1',
          createAccountIfMissing: false,
          verifyPhone: true,
          reason: 'Admin duyệt ứng viên thành NLĐ HRP',
        }),
      }),
      { params: Promise.resolve({ id: 'lp-1' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.workerCode).toBe('USR-EMP-009');
    expect(body.phoneVerified).toBe(true);
    expect(mocks.onboardLaborProfileByAdmin).toHaveBeenCalledWith(
      expect.anything(),
      { userId: 'admin-1', role: 'ADMIN' },
      expect.objectContaining({
        laborProfileId: 'lp-1',
        userId: 'u-1',
        verifyPhone: true,
        reason: 'Admin duyệt ứng viên thành NLĐ HRP',
      }),
      expect.anything(),
    );
  });
});
