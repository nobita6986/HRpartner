/**
 * auth-context test — Phase 1 identity-core (RQ-04, AC-04).
 *
 * Test buildAuthContextFromClaims (lookup User.isActive/vendorId, Worker.accountUserId).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemRole } from '@prisma/client';

const userRows: any[] = [];
const workerRows: any[] = [];

vi.mock('@/src/lib/db', () => ({
  getPrisma: () => ({
    user: {
      findUnique: async ({ where }: any) =>
        userRows.find((u) => u.id === where.id) ?? null,
    },
    worker: {
      findUnique: async ({ where }: any) => {
        if (where.accountUserId) {
          return workerRows.find((w) => w.accountUserId === where.accountUserId) ?? null;
        }
        return null;
      },
    },
  }),
}));

import { AuthSessionError, buildAuthContextFromClaims } from './auth-context';

beforeEach(() => {
  userRows.length = 0;
  workerRows.length = 0;
});

describe('buildAuthContextFromClaims (RQ-04, DEC-04)', () => {
  it('HR_MANAGER isActive=true → trả AuthContext { userId, role }', async () => {
    userRows.push({ id: 'u-1', role: 'HR_MANAGER', isActive: true, vendorId: null });
    const ctx = await buildAuthContextFromClaims({ sub: 'u-1', role: 'HR_MANAGER' });
    expect(ctx).toEqual({ userId: 'u-1', role: 'HR_MANAGER' });
  });

  it('VENDOR_ADMIN có vendorId → context có vendorId', async () => {
    userRows.push({ id: 'v-1', role: 'VENDOR_ADMIN', isActive: true, vendorId: 'V-XYZ' });
    const ctx = await buildAuthContextFromClaims({ sub: 'v-1', role: 'VENDOR_ADMIN' });
    expect(ctx).toEqual({ userId: 'v-1', role: 'VENDOR_ADMIN', vendorId: 'V-XYZ' });
  });

  it('WORKER có Worker.accountUserId → context có workerId', async () => {
    userRows.push({ id: 'u-w-1', role: 'WORKER', isActive: true, vendorId: null });
    workerRows.push({ id: 'w-1', accountUserId: 'u-w-1' });
    const ctx = await buildAuthContextFromClaims({ sub: 'u-w-1', role: 'WORKER' });
    expect(ctx).toEqual({ userId: 'u-w-1', role: 'WORKER', workerId: 'w-1' });
  });

  it('WORKER không có Worker.accountUserId link → chỉ userId+role (KHÔNG throw)', async () => {
    userRows.push({ id: 'u-w-2', role: 'WORKER', isActive: true, vendorId: null });
    const ctx = await buildAuthContextFromClaims({ sub: 'u-w-2', role: 'WORKER' });
    expect(ctx).toEqual({ userId: 'u-w-2', role: 'WORKER' });
  });

  it('isActive=false → throw AuthSessionError USER_INACTIVE', async () => {
    userRows.push({ id: 'u-1', role: 'HR_MANAGER', isActive: false, vendorId: null });
    await expect(
      buildAuthContextFromClaims({ sub: 'u-1', role: 'HR_MANAGER' }),
    ).rejects.toBeInstanceOf(AuthSessionError);
    await expect(
      buildAuthContextFromClaims({ sub: 'u-1', role: 'HR_MANAGER' }),
    ).rejects.toMatchObject({ code: 'USER_INACTIVE' });
  });

  it('User không tồn tại → throw AuthSessionError USER_NOT_FOUND', async () => {
    await expect(
      buildAuthContextFromClaims({ sub: 'u-missing', role: 'ADMIN' as SystemRole }),
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('JWT role ≠ DB.role → dùng DB.role (DB là source of truth)', async () => {
    userRows.push({ id: 'u-1', role: 'HR_MANAGER', isActive: true, vendorId: null });
    // JWT khai ADMIN, DB thực tế HR_MANAGER → phải trả HR_MANAGER
    const ctx = await buildAuthContextFromClaims({ sub: 'u-1', role: 'ADMIN' });
    expect(ctx.role).toBe('HR_MANAGER');
  });

  it('AuthSessionError có name + code', () => {
    const err = new AuthSessionError('NO_TOKEN', 'test');
    expect(err.name).toBe('AuthSessionError');
    expect(err.code).toBe('NO_TOKEN');
  });
});
