/**
 * route-patch.test.ts — T1B Pre-P2 hotfix (DEC-P2-02..08).
 *
 * UNIT route test cho PATCH /api/admin/labor-profiles/[id]:
 *   - 401 NO_TOKEN/INVALID_TOKEN nếu getAuthContext throw AuthSessionError.
 *   - 403 FORBIDDEN cho non-writer roles (HR_STAFF, SALE, PM, WORKER, ...).
 *   - 200 happy path với ADMIN/HR_MANAGER.
 *   - 400 INVALID_INPUT nếu body có `workerId` (zod `.strict()` reject).
 *   - 400 INVALID_INPUT nếu body thiếu/rỗng field required.
 *   - 404 NOT_FOUND nếu service ném LABOR_PROFILE_NOT_FOUND.
 *   - 409 LABOR_PROFILE_ALREADY_LINKED nếu service ném LaborProfileAlreadyLinkedError.
 *
 * Mocks `updateLaborProfileIntakeProfile` ở service layer — route test
 * KHÔNG đụng DB; service contract được cover ở `labor-profile.update-service.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  getAuthContext: vi.fn(),
  dbContext: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({
  getPrisma: () => ({ __raw: true }),
}));
vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class extends Error {
    constructor(public code: string, msg: string) {
      super(msg);
      this.name = 'AuthSessionError';
    }
  },
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => mocks.dbContext(cb),
}));
vi.mock('@/src/domains/talent/labor-profile.service', () => ({
  updateLaborProfileIntakeProfile: mocks.update,
}));
vi.mock('@/src/domains/talent/labor-profile.types', () => {
  class LaborProfileAlreadyLinkedError extends Error {
    code: string;
    workerId: string;
    constructor(workerId: string) {
      super('LABOR_PROFILE_ALREADY_LINKED');
      this.name = 'LaborProfileAlreadyLinkedError';
      this.code = 'LABOR_PROFILE_ALREADY_LINKED';
      this.workerId = workerId;
    }
  }
  return { LaborProfileAlreadyLinkedError };
});

import { PATCH } from '@/app/api/admin/labor-profiles/[id]/route';

const PROFILE_ID = 'lp-1';
const patchReq = (body: unknown) =>
  new NextRequest(`http://localhost/api/admin/labor-profiles/${PROFILE_ID}`, {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

describe('PATCH /api/admin/labor-profiles/[id] — T1B Pre-P2 hotfix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default auth: ADMIN
    mocks.getAuthContext.mockResolvedValue({ userId: 'u-admin-1', role: 'ADMIN' });
    // Default withDbContext: invoke callback
    mocks.dbContext.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb({ __tx: true }));
    // Default service result: 200
    mocks.update.mockResolvedValue({
      id: PROFILE_ID,
      fullName: 'Nguyễn Văn A',
      phone: '0912345678',
      normalizedPhone: '912345678',
      cccdNumber: '001099123456',
      completeness: 'COMPLETE',
      workerId: null,
      warnings: [],
    });
  });

  // ─── Auth ───

  it('PATCH: getAuthContext throw AuthSessionError → 401', async () => {
    const { AuthSessionError } = await import('@/src/shared/auth/auth-context');
    mocks.getAuthContext.mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'Missing token'));
    const res = await PATCH(patchReq({ fullName: 'A', phone: '0900000123' }), { params: Promise.resolve({ id: PROFILE_ID }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('NO_TOKEN');
  });

  // ─── Role gate (DEC-P2-02) ───

  it.each([
    'HR_STAFF', 'SALE', 'PM', 'WORKER', 'CTV', 'MKT', 'ACCOUNTANT',
    'VENDOR_ADMIN', 'VENDOR_STAFF', 'DIRECTOR', 'EMPLOYEE',
  ])('PATCH: role=%s → 403 FORBIDDEN, KHÔNG gọi service', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: `u-${role}`, role });
    const res = await PATCH(patchReq({ fullName: 'A', phone: '0900000123' }), { params: Promise.resolve({ id: PROFILE_ID }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('FORBIDDEN');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'HR_MANAGER'])('PATCH: role=%s → 200 với writable response', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: `u-${role.toLowerCase()}`, role });
    const res = await PATCH(patchReq({ fullName: 'A', phone: '0900000123' }), { params: Promise.resolve({ id: PROFILE_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile.id).toBe(PROFILE_ID);
    expect(body.profile.fullName).toBe('Nguyễn Văn A');
    expect(body.profile.warnings).toEqual([]);
  });

  // ─── Body validation (DEC-P2-03) ───

  it('PATCH: body có `workerId` → 400 INVALID_INPUT (zod .strict() reject)', async () => {
    const res = await PATCH(
      patchReq({ fullName: 'A', phone: '0900000123', workerId: 'worker-evil' }),
      { params: Promise.resolve({ id: PROFILE_ID }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_INPUT');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('PATCH: body không phải JSON → 400 BAD_REQUEST', async () => {
    const res = await PATCH(patchReq('not json'), { params: Promise.resolve({ id: PROFILE_ID }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('BAD_REQUEST');
  });

  it('PATCH: body rỗng → 400 INVALID_INPUT (zod fail)', async () => {
    const res = await PATCH(patchReq({}), { params: Promise.resolve({ id: PROFILE_ID }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_INPUT');
  });

  it('PATCH: cccdNumber=null OK (clear field) → 200', async () => {
    const res = await PATCH(
      patchReq({ fullName: 'A', phone: '0900000123', cccdNumber: null }),
      { params: Promise.resolve({ id: PROFILE_ID }) },
    );
    expect(res.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ cccdNumber: null }),
    );
  });

  // ─── 409 guard (DEC-P2-06) ───

  it('PATCH: service ném LaborProfileAlreadyLinkedError → 409', async () => {
    const { LaborProfileAlreadyLinkedError } = await import('@/src/domains/talent/labor-profile.types');
    mocks.update.mockRejectedValueOnce(new LaborProfileAlreadyLinkedError('worker-xyz'));
    const res = await PATCH(patchReq({ fullName: 'A', phone: '0900000123' }), { params: Promise.resolve({ id: PROFILE_ID }) });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('LABOR_PROFILE_ALREADY_LINKED');
    expect(body.workerId).toBe('worker-xyz');
  });

  it('PATCH: service ném LABOR_PROFILE_NOT_FOUND → 404', async () => {
    const err = new Error('LABOR_PROFILE_NOT_FOUND');
    (err as Error & { code?: string }).code = 'LABOR_PROFILE_NOT_FOUND';
    mocks.update.mockRejectedValueOnce(err);
    const res = await PATCH(patchReq({ fullName: 'A', phone: '0900000123' }), { params: Promise.resolve({ id: PROFILE_ID }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NOT_FOUND');
  });

  // ─── actorId propagation ───

  it('PATCH: actorId = ctx.userId, KHÔNG random', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u-admin-7', role: 'ADMIN' });
    await PATCH(patchReq({ fullName: 'A', phone: '0900000123' }), { params: Promise.resolve({ id: PROFILE_ID }) });
    const args = mocks.update.mock.calls[0]?.[1];
    expect(args?.actorId).toBe('u-admin-7');
  });
});
