/**
 * login-projection.route.test.ts — T1A Android backend mobile contract.
 *
 * UNIT (no DB): POST /api/auth/login bược mở rộng (TASK DEC-02):
 *   - WORKER: JSON có token/role/user/worker{assignment, department: null};
 *     đồng thời cookie web hiện hành vẫn được phát.
 *   - Role khác: KHÔNG có key worker.
 *   - Worker summary query lỗi → login KHÔNG chặn: worker null + 200.
 *   - Password sai → 401 (hành vi hiện hành giữ nguyên).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getPrisma: vi.fn(),
  verifyPassword: vi.fn(),
  signJwt: vi.fn(),
  findUserForLogin: vi.fn(),
  getLandingPath: vi.fn(),
  loadWorkerSelfSummary: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/password', () => ({ verifyPassword: mocks.verifyPassword }));
vi.mock('@/src/shared/auth/jwt', () => ({
  signJwt: mocks.signJwt,
  JWT_TTL_SECONDS: 8 * 60 * 60,
}));
vi.mock('@/src/shared/auth/user', () => ({
  AUTH_COOKIE_NAME: 'hrp_session',
  getTokenFromRequest: vi.fn(),
  getAuthUser: vi.fn(),
}));
vi.mock('@/src/shared/auth/preauth-db', () => ({ findUserForLogin: mocks.findUserForLogin }));
vi.mock('@/src/shared/auth/worker-assignment-summary', () => ({
  loadWorkerSelfSummary: mocks.loadWorkerSelfSummary,
}));
vi.mock('@/src/shared/routing/portal-landing', () => ({ getLandingPath: mocks.getLandingPath }));
vi.mock('@/src/shared/observability/logger', () => ({
  error: vi.fn(),
  warn: vi.fn(),
}));

import { POST } from '@/app/api/auth/login/route';

const ASSIGNMENT = {
  id: 'asg-1',
  projectId: 'prj-1',
  projectName: 'Nhà máy Samsung SEVT - Thái Nguyên',
  projectCode: 'PRJ-SAMS-01',
  employeeCode: 'emp-0001',
  employmentType: 'HRP_EMPLOYED',
  workSetting: 'PHOTHONG',
  position: 'Chuyền SMT',
  validFrom: '2026-01-01T00:00:00.000Z',
  validTo: null,
  sites: [],
};

const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

describe('POST /api/auth/login — T1A mobile projection (TASK DEC-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signJwt.mockResolvedValue('jwt-token-123');
    mocks.getLandingPath.mockReturnValue('/worker');
  });

  it('WORKER hợp lệ: JSON có token + user summary + worker summary (assignment + department null), cookie vẫn phát', async () => {
    mocks.findUserForLogin.mockResolvedValue({
      id: 'u1', role: 'WORKER', isActive: true, passwordHash: 'h', name: 'Nguyễn A', phone: '0900000000',
    });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.loadWorkerSelfSummary.mockResolvedValue({ id: 'w1', fullName: 'Nguyễn A', assignment: ASSIGNMENT });

    const res = await POST(postReq({ phone: '0900000000', password: 'pw' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.token).toBe('jwt-token-123');
    expect(json.role).toBe('WORKER');
    expect(json.redirectTo).toBe('/');
    expect(json.user).toEqual({ id: 'u1', name: 'Nguyễn A', phone: '0900000000', role: 'WORKER' });
    expect(json.worker).toEqual({
      id: 'w1',
      fullName: 'Nguyễn A',
      assignment: ASSIGNMENT,
      department: null,
    });

    // Cookie web hiện hành giữ nguyên.
    const setCookies = res.headers.getSetCookie();
    expect(setCookies.some((c) => c.startsWith('hrp_session=jwt-token-123;'))).toBe(true);
  });

  it('Role khác (PM): có token + user summary, KHÔNG có key worker', async () => {
    mocks.findUserForLogin.mockResolvedValue({
      id: 'u2', role: 'PM', isActive: true, passwordHash: 'h', name: 'Pm B', phone: '0900000001',
    });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.getLandingPath.mockReturnValue(null);

    const res = await POST(postReq({ phone: '0900000001', password: 'pw' }));
    const json = await res.json();
    expect(json.token).toBe('jwt-token-123');
    expect(json.user).toEqual({ id: 'u2', name: 'Pm B', phone: '0900000001', role: 'PM' });
    expect('worker' in json).toBe(false);
    expect(mocks.loadWorkerSelfSummary).not.toHaveBeenCalled();
  });

  it('Worker summary query lỗi → login KHÔNG chặn: worker null, ok true', async () => {
    mocks.findUserForLogin.mockResolvedValue({
      id: 'u1', role: 'WORKER', isActive: true, passwordHash: 'h', name: null, phone: null,
    });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.loadWorkerSelfSummary.mockRejectedValue(new Error('db explode'));

    const res = await POST(postReq({ phone: '0900000000', password: 'pw' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.worker).toBeNull();
  });

  it('Password sai → 401 (hành vi hiện hành)', async () => {
    mocks.findUserForLogin.mockResolvedValue({
      id: 'u1', role: 'WORKER', isActive: true, passwordHash: 'h', name: null, phone: null,
    });
    mocks.verifyPassword.mockResolvedValue(false);

    const res = await POST(postReq({ phone: '0900000000', password: 'wrong' }));
    expect(res.status).toBe(401);
  });
});
