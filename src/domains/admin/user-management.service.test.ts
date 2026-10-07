/**
 * user-management.service.test.ts — hrp-v6-admin-users-permissions
 *
 * Pure unit tests cho service `user-management.service.ts`:
 *
 * Bảo vệ (DEC-04 D1):
 *   - LAST_ADMIN_PROTECTED — hạ quyền/vô hiệu hóa admin active cuối cùng ⇒ 409.
 *   - SELF_DEACTIVATION_BLOCKED — admin tự vô hiệu hóa mình ⇒ 409.
 *   - SELF_DEMOTION_BLOCKED — admin tự hạ role ⇒ 409.
 *   - SELF_MODIFICATION_BLOCKED — admin tự sửa role/isActive qua endpoint này ⇒ 409.
 *
 * Bảo mật (PHASE_KHOAHOC DoD):
 *   - Plaintext password KHÔNG xuất hiện trong audit_log.diff / metadata.
 *   - Plaintext password CHỉ có trong `temporaryPassword` (return value của createUser).
 *   - Idempotency cache (sanitize) đã cover ở test idempotency.test.ts.
 *
 * Unit race coverage asserts active-admin row locks precede the count. The
 * real two-connection PostgreSQL race proof lives in tests/db/.
 *
 * Vitest unit lane (DB fail-closed). Mock toàn bộ `tx`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemRole } from '@prisma/client';
import { applyRlsContext } from '@/src/shared/auth/rls-context';

import {
  USER_AUDIT_ACTIONS,
  UserManagementServiceError,
  createUser,
  deactivateUser,
  getUserWithGrants,
  reactivateUser,
  updateUser,
  withSerializableUserManagementDb,
  type CreateUserInput,
  type UpdateUserInput,
} from './user-management.service';

// ═══════════════════════════════════════════════════════════════════════════
// Mock bcrypt + audit + crypto (để deterministic test)
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('@/src/shared/auth/password', () => ({
  hashPassword: vi.fn(async (plain: string) => `HASH::${plain}`),
}));
vi.mock('@/src/shared/auth/rls-context', () => ({
  applyRlsContext: vi.fn(async () => undefined),
}));

// ═══════════════════════════════════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_AUTH = { userId: 'admin-1', role: 'ADMIN' as SystemRole };
const HR_AUTH = { userId: 'hr-1', role: 'HR_MANAGER' as SystemRole };

const BASE_USER = {
  id: 'user-1',
  name: 'Test User',
  phone: '+84900000001',
  role: 'HR_MANAGER' as SystemRole,
  vendorId: null,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const ADMIN_USER = {
  ...BASE_USER,
  id: 'admin-self',
  name: 'Self Admin',
  phone: '+84900000000',
  role: 'ADMIN' as SystemRole,
};

function makeTx(opts: {
  existing?: Partial<typeof BASE_USER> | null;
  activeAdminCount?: number;
  createError?: Error;
  updateError?: Error;
  grants?: Array<{ permissionCode: string; grantType: string }>;
  extraUsers?: Array<Record<string, unknown>>;
} = {}) {
  const activeAdmins = opts.activeAdminCount ?? 1;
  // DB-like in-memory store keyed by id; default seeded with BASE_USER + ADMIN_USER.
  const db: Record<string, any> = {
    [BASE_USER.id]: { ...BASE_USER, ...(opts.existing ?? {}) },
    [ADMIN_USER.id]: { ...ADMIN_USER },
  };
  for (const u of opts.extraUsers ?? []) {
    db[u.id as string] = { ...BASE_USER, ...u };
  }

  const tx: any = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    user: {
      findUnique: vi.fn().mockImplementation((args: any) => {
        const id = args?.where?.id;
        return Promise.resolve(id in db ? db[id] : null);
      }),
      create: vi.fn().mockImplementation((args: any) => {
        if (opts.createError) return Promise.reject(opts.createError);
        const data = args?.data ?? {};
        const row = {
          ...BASE_USER,
          id: 'new-user-id',
          role: data.role ?? 'HR_MANAGER',
          name: data.name ?? null,
          phone: data.phone ?? null,
          vendorId: data.vendorId ?? null,
          isActive: data.isActive ?? true,
          passwordHash: data.passwordHash,
        };
        db[row.id] = row;
        return Promise.resolve(row);
      }),
      update: vi.fn().mockImplementation((args: any) => {
        if (opts.updateError) return Promise.reject(opts.updateError);
        const id = args?.where?.id;
        const data = args?.data ?? {};
        if (!(id in db)) {
          const err: any = new Error('Record not found');
          err.code = 'P2025';
          return Promise.reject(err);
        }
        db[id] = { ...db[id], ...data, updatedAt: new Date() };
        return Promise.resolve({ ...db[id] });
      }),
      count: vi.fn().mockImplementation(() => Promise.resolve(activeAdmins)),
    },
    auditLog: {
      create: vi.fn().mockImplementation((args: any) =>
        Promise.resolve({ id: `audit-${Math.random().toString(36).slice(2, 9)}`, ...args.data }),
      ),
    },
  };

  return tx;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// Permission guard
// ═══════════════════════════════════════════════════════════════════════════

describe('user-management.service — non-ADMIN guards', () => {
  it('non-ADMIN gọi createUser → PERMISSION_DENIED', async () => {
    const tx = makeTx();
    await expect(
      createUser(tx, HR_AUTH, {
        name: 'x',
        phone: '+84000000000',
        role: 'HR_MANAGER',
      } as CreateUserInput),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('non-ADMIN gọi updateUser → PERMISSION_DENIED', async () => {
    const tx = makeTx();
    await expect(
      updateUser(tx, HR_AUTH, BASE_USER.id, { name: 'new' } as UpdateUserInput),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('non-ADMIN gọi deactivateUser → PERMISSION_DENIED', async () => {
    const tx = makeTx();
    await expect(
      deactivateUser(tx, HR_AUTH, BASE_USER.id, 'Not authorized'),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

describe('user-management serializable transaction boundary', () => {
  it('binds RLS context inside PostgreSQL SERIALIZABLE transaction without blind retry', async () => {
    const tx = {};
    const callback = vi.fn(async () => 'committed');
    const prisma = {
      $transaction: vi.fn(async (run: (value: unknown) => Promise<unknown>, options: unknown) => {
        expect(options).toEqual({ isolationLevel: 'Serializable' });
        return run(tx);
      }),
    };

    await expect(withSerializableUserManagementDb(prisma as never, ADMIN_AUTH, callback)).resolves.toBe('committed');
    expect(applyRlsContext).toHaveBeenCalledWith(tx, ADMIN_AUTH);
    expect(callback).toHaveBeenCalledWith(tx);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createUser
// ═══════════════════════════════════════════════════════════════════════════

describe('user-management.service — createUser', () => {
  it('hash password qua bcrypt (KHÔNG plaintext vào DB)', async () => {
    const { hashPassword } = await import('@/src/shared/auth/password');
    const tx = makeTx();
    const result = await createUser(tx, ADMIN_AUTH, {
      name: 'Nguyen Van A',
      phone: '+84987654321',
      role: 'HR_STAFF',
      reason: 'Provision approved account',
    });
    expect(hashPassword).toHaveBeenCalledTimes(1);
    const [plain] = (hashPassword as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(plain).toMatch(/^[A-Za-z0-9_-]{16}$/);
    // passwordHash lưu DB = "HASH::<plaintext>" (mock).
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: `HASH::${plain}`,
        }),
      }),
    );
    expect(result.temporaryPassword).toBe(plain);
  });

  it('temporaryPassword trả về 1 lần, không lưu vào audit_log', async () => {
    const tx = makeTx();
    const result = await createUser(tx, ADMIN_AUTH, {
      name: 'A',
      phone: '+84000000001',
      role: 'HR_STAFF',
      reason: 'Provision test account',
    });
    // Audit diff KHÔNG chứa temporaryPassword hoặc passwordHash.
    const auditCall = tx.auditLog.create.mock.calls[0][0];
    const diffJson = JSON.stringify(auditCall.data.diff);
    expect(diffJson).not.toContain('temporaryPassword');
    expect(diffJson).not.toContain('passwordHash');
    expect(diffJson).not.toContain(result.temporaryPassword);
    expect(auditCall.data.metadata).toBeDefined();
    const metaJson = JSON.stringify(auditCall.data.metadata);
    expect(metaJson).not.toContain(result.temporaryPassword);
  });

  it('audit.action = USER_AUDIT_ACTIONS.CREATE, entityType = "User"', async () => {
    const tx = makeTx();
    await createUser(tx, ADMIN_AUTH, {
      name: 'A',
      phone: '+84000000002',
      role: 'HR_STAFF',
      reason: 'Provision test account',
    });
    const auditCall = tx.auditLog.create.mock.calls[0][0];
    expect(auditCall.data.action).toBe(USER_AUDIT_ACTIONS.CREATE);
    expect(auditCall.data.entityType).toBe('User');
  });

  it('phone trùng → Prisma P2002 → map PHONE_TAKEN 409', async () => {
    const err: any = new Error('Unique constraint failed');
    err.code = 'P2002';
    const tx = makeTx({ createError: err });
    await expect(
      createUser(tx, ADMIN_AUTH, {
        name: 'A',
        phone: '+84000000003',
        role: 'HR_STAFF',
        reason: 'Provision test account',
      }),
    ).rejects.toMatchObject({ code: 'PHONE_TAKEN' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateUser — self modification guards
// ═══════════════════════════════════════════════════════════════════════════

describe('user-management.service — updateUser self-modification', () => {
  it('admin tự hạ role (ADMIN → HR_MANAGER) → SELF_DEMOTION_BLOCKED 409', async () => {
    const selfAuth = { userId: 'admin-self', role: 'ADMIN' as SystemRole };
    const tx = makeTx({ activeAdminCount: 2 });
    await expect(
      updateUser(tx, selfAuth, 'admin-self', { role: 'HR_MANAGER', reason: 'Correct role' }),
    ).rejects.toMatchObject({ code: 'SELF_DEMOTION_BLOCKED' });
  });

  it('admin tự vô hiệu hóa (isActive=false) → SELF_DEACTIVATION_BLOCKED 409', async () => {
    const selfAuth = { userId: 'admin-self', role: 'ADMIN' as SystemRole };
    const tx = makeTx({ activeAdminCount: 2 });
    await expect(
      updateUser(tx, selfAuth, 'admin-self', { isActive: false, reason: 'Correct status' }),
    ).rejects.toMatchObject({ code: 'SELF_DEACTIVATION_BLOCKED' });
  });

  it('admin tự sửa isActive (giống) → NO_OP', async () => {
    const selfAuth = { userId: 'admin-self', role: 'ADMIN' as SystemRole };
    const tx = makeTx({ activeAdminCount: 2 });
    // patch.isActive === existing.isActive (true) → isChangingActive=false;
    // service vẫn rơi vào self block (isSelf && isChangingActive === true so
    // isChangingActive computed với !== ; nếu giống sẽ là false).
    // Test chính xác hơn: admin tự sửa role về ADMIN (giống) — nhưng đây là NO_OP.
    // → Self check: actor==target, patch.isActive=true (giống cũ) → KHÔNG rơi
    // self block, rơi NO_OP. Thay vào đó test admin tự đổi role về role khác:
    // đã cover ở test trên (SELF_DEMOTION_BLOCKED).
    await expect(
      updateUser(tx, selfAuth, 'admin-self', { isActive: true, reason: 'Confirm status' }),
    ).rejects.toMatchObject({ code: 'NO_OP' });
  });

  it('admin tự đổi name (không role/isActive) → OK (name đổi OK)', async () => {
    // Self path CHỈ chặn role/isActive. Đổi name/phone được phép.
    const selfAuth = { userId: 'admin-self', role: 'ADMIN' as SystemRole };
    const tx = makeTx({ activeAdminCount: 2 });
    const result = await updateUser(tx, selfAuth, 'admin-self', { name: 'New Name', reason: 'Correct profile' });
    expect(result.user.id).toBe('admin-self');
    expect(tx.user.update).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateUser — last-admin guard
// ═══════════════════════════════════════════════════════════════════════════

describe('user-management.service — updateUser last-admin guard', () => {
  it('hạ role admin active cuối cùng → LAST_ADMIN_PROTECTED 409', async () => {
    const tx = makeTx({
      activeAdminCount: 0,
      extraUsers: [{ id: 'admin-2', role: 'ADMIN', isActive: true }],
    });
    await expect(
      updateUser(
        tx,
        { userId: 'admin-1', role: 'ADMIN' },
        'admin-2',
        { role: 'HR_MANAGER', reason: 'Correct role' },
      ),
    ).rejects.toMatchObject({ code: 'LAST_ADMIN_PROTECTED' });
  });

  it('hạ role admin khi còn admin khác → OK', async () => {
    const tx = makeTx({
      activeAdminCount: 1,
      extraUsers: [{ id: 'admin-2', role: 'ADMIN', isActive: true }],
    });
    const result = await updateUser(
      tx,
      { userId: 'admin-1', role: 'ADMIN' },
      'admin-2',
        { role: 'HR_MANAGER', reason: 'Correct role' },
    );
    expect(result.user.id).toBe('admin-2');
    expect(tx.user.update).toHaveBeenCalled();
  });

  it('hạ role admin khi target đã inactive → KHÔNG trigger last-admin guard', async () => {
    const tx = makeTx({
      activeAdminCount: 0,
      extraUsers: [{ id: 'admin-2', role: 'ADMIN', isActive: false }],
    });
    const result = await updateUser(
      tx,
      { userId: 'admin-1', role: 'ADMIN' },
      'admin-2',
        { role: 'HR_MANAGER', reason: 'Correct role' },
    );
    expect(result.user.id).toBe('admin-2');
  });

  it('deactivate user non-admin khi count admin = 0 → KHÔNG trigger guard', async () => {
    // last-admin guard chỉ áp dụng cho target có role=ADMIN.
    const tx = makeTx({ activeAdminCount: 0 });
    const result = await updateUser(tx, ADMIN_AUTH, BASE_USER.id, { isActive: false, reason: 'Correct status' });
    expect(result.user.id).toBe(BASE_USER.id);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateUser — race condition
// ═══════════════════════════════════════════════════════════════════════════

describe('user-management.service — race condition', () => {
  it('2 admin cùng deactivate admin cuối: 1 thắng, 1 thua LAST_ADMIN_PROTECTED', async () => {
    // The mocked count models the post-serialization state; assert lock-before-count below.
    const tx = makeTx({
      activeAdminCount: 0,
      extraUsers: [{ id: 'admin-2', role: 'ADMIN', isActive: true }],
    });
    await expect(
      updateUser(
        tx,
        { userId: 'admin-1', role: 'ADMIN' },
        'admin-2',
        { isActive: false, reason: 'Correct status' },
      ),
    ).rejects.toMatchObject({ code: 'LAST_ADMIN_PROTECTED' });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.user.count.mock.invocationCallOrder[0]);
  });
});

describe('user-management.service — audit reason required', () => {
  it('rejects a blank reason before mutating', async () => {
    const tx = makeTx();
    await expect(createUser(tx, ADMIN_AUTH, {
      name: 'A', phone: '+84000000004', role: 'HR_STAFF', reason: '   ',
    })).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(tx.user.create).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateUser — happy path + audit
// ═══════════════════════════════════════════════════════════════════════════

describe('user-management.service — updateUser happy path', () => {
  it('đổi name → audit diff có before/after; KHÔNG chứa passwordHash', async () => {
    const tx = makeTx({ activeAdminCount: 1 });
    const result = await updateUser(tx, ADMIN_AUTH, BASE_USER.id, { name: 'New Name', reason: 'Correct profile' });
    expect(result.user.name).toBe('New Name');
    const auditCall = tx.auditLog.create.mock.calls[0][0];
    expect(auditCall.data.action).toBe(USER_AUDIT_ACTIONS.UPDATE);
    expect(auditCall.data.entityType).toBe('User');
    const diffJson = JSON.stringify(auditCall.data.diff);
    expect(diffJson).not.toContain('passwordHash');
    expect(auditCall.data.diff.before).toMatchObject({ name: 'Test User' });
    expect(auditCall.data.diff.after).toMatchObject({ name: 'New Name' });
  });

  it('patch rỗng (không đổi) → NO_OP', async () => {
    const tx = makeTx({ activeAdminCount: 1 });
    await expect(
      updateUser(tx, ADMIN_AUTH, BASE_USER.id, { name: BASE_USER.name, reason: 'Confirm profile' }),
    ).rejects.toMatchObject({ code: 'NO_OP' });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('user không tồn tại → NOT_FOUND', async () => {
    const tx = makeTx({ activeAdminCount: 1 });
    await expect(
      updateUser(tx, ADMIN_AUTH, 'no-such-id', { name: 'X', reason: 'Correct profile' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// deactivateUser / reactivateUser
// ═══════════════════════════════════════════════════════════════════════════

describe('user-management.service — deactivateUser', () => {
  it('deactivate user non-admin active → OK + audit action=DEACTIVATE', async () => {
    const tx = makeTx({ activeAdminCount: 1 });
    const result = await deactivateUser(tx, ADMIN_AUTH, BASE_USER.id, 'audit reason');
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BASE_USER.id },
        data: { isActive: false },
      }),
    );
    const auditCall = tx.auditLog.create.mock.calls[0][0];
    expect(auditCall.data.action).toBe(USER_AUDIT_ACTIONS.DEACTIVATE);
    expect(auditCall.data.reason).toBe('audit reason');
  });

  it('admin tự deactivate → SELF_DEACTIVATION_BLOCKED 409', async () => {
    const selfAuth = { userId: 'admin-self', role: 'ADMIN' as SystemRole };
    const tx = makeTx({ activeAdminCount: 2 });
    await expect(
      deactivateUser(tx, selfAuth, 'admin-self', 'Correct status'),
    ).rejects.toMatchObject({ code: 'SELF_DEACTIVATION_BLOCKED' });
  });

  it('deactivate admin active cuối cùng → LAST_ADMIN_PROTECTED 409', async () => {
    const tx = makeTx({
      activeAdminCount: 0,
      extraUsers: [{ id: 'admin-2', role: 'ADMIN', isActive: true }],
    });
    await expect(
      deactivateUser(tx, { userId: 'admin-1', role: 'ADMIN' }, 'admin-2', 'Correct status'),
    ).rejects.toMatchObject({ code: 'LAST_ADMIN_PROTECTED' });
  });

  it('deactivate user đã inactive (idempotent) → KHÔNG throw, vẫn audit', async () => {
    const tx = makeTx({
      activeAdminCount: 1,
      extraUsers: [{ id: BASE_USER.id, isActive: false }],
    });
    const result = await deactivateUser(tx, ADMIN_AUTH, BASE_USER.id, 'Confirm existing status');
    expect(result.user.isActive).toBe(false);
    const auditCall = tx.auditLog.create.mock.calls[0][0];
    expect(auditCall.data.metadata).toMatchObject({ idempotent: true });
  });
});

describe('user-management.service — reactivateUser', () => {
  it('reactivate user inactive → OK + audit action=REACTIVATE', async () => {
    const tx = makeTx({
      activeAdminCount: 1,
      extraUsers: [{ id: BASE_USER.id, isActive: false }],
    });
    const result = await reactivateUser(tx, ADMIN_AUTH, BASE_USER.id, 'Restore access');
    expect(result.user.isActive).toBe(true);
    const auditCall = tx.auditLog.create.mock.calls[0][0];
    expect(auditCall.data.action).toBe(USER_AUDIT_ACTIONS.REACTIVATE);
  });

  it('reactivate user đã active → NO_OP', async () => {
    const tx = makeTx({ activeAdminCount: 1 });
    await expect(
      reactivateUser(tx, ADMIN_AUTH, BASE_USER.id, 'Confirm active status'),
    ).rejects.toMatchObject({ code: 'NO_OP' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getUserWithGrants
// ═══════════════════════════════════════════════════════════════════════════

describe('user-management.service — getUserWithGrants', () => {
  it('user tồn tại + có grants → trả về user + grants', async () => {
    const tx = makeTx({
      activeAdminCount: 1,
      grants: [
        { permissionCode: 'tickets.approve', grantType: 'GRANT' },
        { permissionCode: 'tickets.create', grantType: 'REVOKE' },
      ],
    });
    // Override findUnique để trả user có permissionGrants
    tx.user.findUnique.mockImplementation(() =>
      Promise.resolve({
        ...BASE_USER,
        permissionGrants: [
          { permissionCode: 'tickets.approve', grantType: 'GRANT' },
          { permissionCode: 'tickets.create', grantType: 'REVOKE' },
        ],
      }),
    );
    const result = await getUserWithGrants(tx, ADMIN_AUTH, BASE_USER.id);
    expect(result).not.toBeNull();
    expect(result!.user.id).toBe(BASE_USER.id);
    expect(result!.grants).toHaveLength(2);
    expect(result!.grants[0]).toMatchObject({
      permissionCode: 'tickets.approve',
      grantType: 'GRANT',
      source: 'USER',
    });
  });

  it('user không tồn tại → null', async () => {
    const tx = makeTx({ activeAdminCount: 1 });
    const result = await getUserWithGrants(tx, ADMIN_AUTH, 'no-such-id');
    expect(result).toBeNull();
  });
});
