/**
 * require-permission test — Phase 1 identity-core (RQ-05, AC-04/05).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from './auth-context';
import { AuthError } from './permission-resolver';

// Mock trước khi import
const hasPermissionMock = vi.fn();
vi.mock('./permission-resolver', async () => {
  const actual = await vi.importActual<typeof import('./permission-resolver')>('./permission-resolver');
  return {
    ...actual,
    hasPermission: (user: { userId: string; role: any }, code: string) => hasPermissionMock(user, code),
  };
});

// Import sau mock
import { requirePermission, requireAnyPermission, toForbiddenResponse } from './require-permission';

const CTX_HR_MANAGER: AuthContext = { userId: 'u-hr-1', role: 'HR_MANAGER' };
const CTX_WORKER: AuthContext = { userId: 'u-w-1', role: 'WORKER', workerId: 'w-1' };
const CTX_ADMIN: AuthContext = { userId: 'u-a-1', role: 'ADMIN' };

beforeEach(() => {
  hasPermissionMock.mockReset();
});

describe('requirePermission (RQ-05, DEC-05)', () => {
  it('HR_MANAGER có CAN_APPROVE_PAYROLL → trả ctx, không throw', async () => {
    hasPermissionMock.mockResolvedValue(true);
    const r = await requirePermission(CTX_HR_MANAGER, 'CAN_APPROVE_PAYROLL');
    expect(r).toBe(CTX_HR_MANAGER);
    expect(hasPermissionMock).toHaveBeenCalledWith(
      { userId: 'u-hr-1', role: 'HR_MANAGER' },
      'CAN_APPROVE_PAYROLL',
    );
  });

  it('WORKER thiếu CAN_APPROVE_PAYROLL → throw AuthError PERMISSION_DENIED', async () => {
    hasPermissionMock.mockResolvedValue(false);
    await expect(requirePermission(CTX_WORKER, 'CAN_APPROVE_PAYROLL'))
      .rejects.toBeInstanceOf(AuthError);
    await expect(requirePermission(CTX_WORKER, 'CAN_APPROVE_PAYROLL'))
      .rejects.toMatchObject({ code: 'PERMISSION_DENIED', message: 'thiếu CAN_APPROVE_PAYROLL' });
  });

  it('ADMIN luôn pass (short-circuit)', async () => {
    hasPermissionMock.mockResolvedValue(true);
    const r = await requirePermission(CTX_ADMIN, 'CAN_MANAGE_PERMISSIONS');
    expect(r).toBe(CTX_ADMIN);
  });
});

describe('requireAnyPermission', () => {
  it('1 trong các code pass → return ctx', async () => {
    hasPermissionMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const r = await requireAnyPermission(CTX_HR_MANAGER, ['CAN_APPROVE_PAYROLL', 'CAN_VIEW_WORKER_SENSITIVE']);
    expect(r).toBe(CTX_HR_MANAGER);
    expect(hasPermissionMock).toHaveBeenCalledTimes(2);
  });

  it('không code nào pass → throw PERMISSION_DENIED', async () => {
    hasPermissionMock.mockResolvedValue(false);
    await expect(
      requireAnyPermission(CTX_WORKER, ['CAN_APPROVE_PAYROLL', 'CAN_EDIT_CONTRACT']),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED', message: 'thiếu 1 trong: CAN_APPROVE_PAYROLL, CAN_EDIT_CONTRACT' });
  });
});

describe('toForbiddenResponse', () => {
  it('map AuthError → 403 { error: FORBIDDEN, reason }', () => {
    const err = new AuthError('PERMISSION_DENIED', 'thiếu CAN_VIEW_WORKER_SENSITIVE', { userId: 'u-1' });
    const resp = toForbiddenResponse(err);
    expect(resp.status).toBe(403);
    expect(resp.body).toEqual({ error: 'FORBIDDEN', reason: 'thiếu CAN_VIEW_WORKER_SENSITIVE' });
  });
});
