/**
 * projects-clients-master.route.test.ts — V5-M1-06d / RQ-07 / STEP-07 / DEC-10 / AC-07.
 *
 * UNIT (auth + DB boundary mocked): master endpoints giữ CONSERVATIVE access.
 *   DEC-10: projects/clients master KHÔNG mở raw master DTO cho SALE/MKT — họ dùng
 *   public job projection (route khác). CRM projection thuộc M1-09, không mở ở đây.
 *
 *   - /api/projects GET: ADMIN/HR_MANAGER/HR_STAFF/PM/ACCOUNTANT/DIRECTOR → 200
 *     (PM/HR_STAFF còn bị L1 project-scope thu hẹp — chứng minh ở LIVE); SALE/MKT + portal
 *     roles → 403 TRƯỚC boundary (không chạm master DTO).
 *   - /api/clients GET: chỉ ADMIN/HR_MANAGER/DIRECTOR → 200 (ClientCompany chưa có builder,
 *     non-root DENY); mọi role khác (gồm SALE/MKT/HR_STAFF/PM/ACCOUNTANT) → 403.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withAuthorizedDbReadOnly: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
  },
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDbReadOnly: mocks.withAuthorizedDbReadOnly,
}));

import { GET as PROJECTS_GET } from '@/app/api/projects/route';
import { GET as CLIENTS_GET } from '@/app/api/clients/route';

const ALL_ROLES = [
  'ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF', 'SALE', 'PM',
  'ACCOUNTANT', 'MKT', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'WORKER', 'EMPLOYEE',
];
const pReq = () => new NextRequest('http://localhost/api/projects');
const cReq = () => new NextRequest('http://localhost/api/clients');

describe('GET /api/projects — DEC-10 conservative master access', () => {
  const ALLOWED = ['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'ACCOUNTANT', 'DIRECTOR'];
  const DENIED = ALL_ROLES.filter((r) => !ALLOWED.includes(r)); // SALE, MKT, VENDOR_*, CTV, WORKER, EMPLOYEE

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withAuthorizedDbReadOnly.mockResolvedValue([[], 0]);
  });

  it.each(ALLOWED)('%s → 200', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    expect((await PROJECTS_GET(pReq())).status).toBe(200);
  });

  it.each(DENIED)('%s → 403 (không chạm master DTO)', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await PROJECTS_GET(pReq());
    expect(res.status).toBe(403);
    expect(mocks.withAuthorizedDbReadOnly).not.toHaveBeenCalled();
  });

  it('SALE + MKT bị deny (DEC-10 — dùng public job projection)', async () => {
    for (const role of ['SALE', 'MKT']) {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
      expect((await PROJECTS_GET(pReq())).status).toBe(403);
    }
  });
});

describe('GET /api/clients — DEC-10 root-only master access', () => {
  const ALLOWED = ['ADMIN', 'HR_MANAGER', 'DIRECTOR'];
  const DENIED = ALL_ROLES.filter((r) => !ALLOWED.includes(r));

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withAuthorizedDbReadOnly.mockResolvedValue([[], 0]);
  });

  it.each(ALLOWED)('%s → 200', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    expect((await CLIENTS_GET(cReq())).status).toBe(200);
  });

  it.each(DENIED)('%s → 403 (không chạm master DTO)', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await CLIENTS_GET(cReq());
    expect(res.status).toBe(403);
    expect(mocks.withAuthorizedDbReadOnly).not.toHaveBeenCalled();
  });
});
