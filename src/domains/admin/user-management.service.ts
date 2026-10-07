/**
 * user-management.service.ts — hrp-v6-admin-users-permissions
 *
 * Service layer cho CRUD người dùng từ phía Admin.
 *
 * Phạm vi (DEC trong TASK §1):
 *   - createUser     — random 16-char password một lần, bcrypt hash, lưu.
 *   - updateUser     — đổi name/phone/role/vendorId/isActive.
 *   - deactivateUser — soft-delete (isActive=false) thay vì hard-delete.
 *   - reactivateUser — bật lại tài khoản đã vô hiệu.
 *   - getUserWithGrants — đọc user + danh sách permission grants (read-only).
 *
 * Bảo vệ Admin cuối cùng (DEC-04: D1):
 *   - 4 error codes: LAST_ADMIN_PROTECTED, SELF_DEACTIVATION_BLOCKED,
 *     SELF_DEMOTION_BLOCKED, SELF_MODIFICATION_BLOCKED. Map 409.
 *   - Đếm active admin trong CÙNG transaction — chống race condition khi 2 admin
 *     cùng hạ/vô hiệu hóa admin active cuối cùng.
 *
 * Bảo mật (PHASE_KHOAHOC DoD):
 *   - KHÔNG ghi `passwordHash` plaintext ra ngoài. Service chỉ trả `temporaryPassword`
 *     về handler — caller (route) sanitize trước khi lưu idempotency_keys.
 *   - AuditLog.diff KHÔNG chứa passwordHash/temporaryPassword (chỉ các trường public).
 *   - KHÔNG log plaintext password qua `console.*`.
 *
 * Caller mở transaction qua `withDbContext` (L2 RLS GUC).
 */

import { randomBytes } from 'node:crypto';

import { Prisma, type PrismaClient, type SystemRole } from '@prisma/client';

import { hashPassword } from '@/src/shared/auth/password';
import { writeAuditLog } from '@/src/shared/integrity/audit';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { applyRlsContext } from '@/src/shared/auth/rls-context';

// ═══════════════════════════════════════════════════════════════════════════
// Public types
// ═══════════════════════════════════════════════════════════════════════════

/** Input tạo user — caller validate (Zod) trước khi vào service. */
export interface CreateUserInput {
  name: string;
  phone: string;
  role: SystemRole;
  vendorId?: string | null;
  /** Lý do tạo tài khoản (ghi vào audit_log.reason). */
  reason: string;
}

/** Input cập nhật user — partial, chỉ set field nào có. */
export interface UpdateUserInput {
  name?: string;
  phone?: string;
  role?: SystemRole;
  vendorId?: string | null;
  isActive?: boolean;
  /** Lý do thay đổi (audit_log.reason). */
  reason: string;
}

/** User public (không có passwordHash). */
export interface UserPublic {
  id: string;
  name: string | null;
  phone: string | null;
  role: SystemRole;
  vendorId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** User + grants (read-only view). */
export interface UserWithGrants {
  user: UserPublic;
  grants: Array<{
    permissionCode: string;
    grantType: 'GRANT' | 'REVOKE';
    source: 'ROLE' | 'USER';
  }>;
}

/** Output createUser — trả về 1 lần `temporaryPassword` cho UI. */
export interface CreateUserResult {
  user: UserPublic;
  temporaryPassword: string;
  auditId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Error types
// ═══════════════════════════════════════════════════════════════════════════

export class UserManagementServiceError extends Error {
  constructor(
    public readonly code:
      | 'PERMISSION_DENIED'
      | 'NOT_FOUND'
      | 'VALIDATION'
      | 'PHONE_TAKEN'
      | 'LAST_ADMIN_PROTECTED'
      | 'SELF_DEACTIVATION_BLOCKED'
      | 'SELF_DEMOTION_BLOCKED'
      | 'SELF_MODIFICATION_BLOCKED'
      | 'NO_OP',
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'UserManagementServiceError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Roles caller PHẢI có để gọi service (mirror backend route allowlist). */
export const USER_MANAGEMENT_ROLES: ReadonlyArray<SystemRole> = ['ADMIN'];

/**
 * Độ dài password ngẫu nhiên 16 char base64url (DEC-02 B1).
 * 16 char base64url ≈ 96 bit entropy.
 */
const TEMP_PASSWORD_LENGTH = 16;

/**
 * Action allowlist cho audit log entityType='User' (PHASE_KHOAHOC DoD).
 * Khi test static terminology đọc các hằng số này phải khớp với `writeAuditLog`
 * call site.
 */
export const USER_AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DEACTIVATE: 'DEACTIVATE',
  REACTIVATE: 'REACTIVATE',
} as const;
export type UserAuditAction =
  (typeof USER_AUDIT_ACTIONS)[keyof typeof USER_AUDIT_ACTIONS];

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sinh mật khẩu tạm an toàn — `TEMP_PASSWORD_LENGTH` char base64url.
 * KHÔNG ghi log, KHÔNG truyền qua `console.*`, KHÔNG lưu DB.
 * Chỉ trả về từ `createUser` cho handler để sanitize trước khi xuất response.
 */
function generateTemporaryPassword(): string {
  // 12 byte random -> 16 char base64url (no padding, url-safe).
  return randomBytes(12)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
    .slice(0, TEMP_PASSWORD_LENGTH);
}

/** Đếm số ADMIN active trong transaction — chống race khi hạ/vô hiệu hóa. */
async function countActiveAdmins(
  tx: Prisma.TransactionClient,
  excludeUserId?: string,
): Promise<number> {
  return tx.user.count({
    where: {
      role: 'ADMIN',
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

/** Map User row → UserPublic (strip passwordHash). */
function toPublicUser(u: {
  id: string;
  name: string | null;
  phone: string | null;
  role: SystemRole;
  vendorId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserPublic {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role,
    vendorId: u.vendorId,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/** Sanitize diff cho audit log — strip mọi field nhạy cảm (chỉ giữ public). */
function publicDiff(
  before: Partial<UserPublic> | null,
  after: Partial<UserPublic> | null,
): { before: Record<string, unknown> | null; after: Record<string, unknown> | null } {
  return {
    before: before ? { ...before } : null,
    after: after ? { ...after } : null,
  };
}

/** Auth guard — chỉ ADMIN được thao tác (mirror route). */
function assertAdmin(ctx: AuthContext): void {
  if (!USER_MANAGEMENT_ROLES.includes(ctx.role)) {
    throw new UserManagementServiceError(
      'PERMISSION_DENIED',
      `Vai trò ${ctx.role} không có quyền quản lý người dùng.`,
    );
  }
}

/** Validate and normalize the mandatory forensic reason before any mutation. */
function requireAuditReason(reason: string | null | undefined): string {
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
    throw new UserManagementServiceError(
      'VALIDATION',
      'Lý do thao tác là bắt buộc và không được vượt quá 500 ký tự.',
    );
  }
  return reason.trim();
}

/**
 * Run user mutations in a serializable RLS-bound transaction. Serialization
 * failures are deliberately not retried here: the API maps P2034 to a retryable
 * 409 so a client cannot unknowingly repeat a sensitive mutation.
 */
export async function withSerializableUserManagementDb<T>(
  prisma: PrismaClient,
  ctx: AuthContext,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await applyRlsContext(tx, ctx);
      return callback(tx);
    },
    { isolationLevel: 'Serializable' },
  );
}

/** PostgreSQL SSI conflict (Prisma P2034): caller should return retryable 409. */
export function isUserMutationSerializationConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  if (error.code === 'P2034') return true;

  // Prisma wraps serialization failures raised by raw SELECT ... FOR UPDATE
  // as P2010; only PostgreSQL SQLSTATE 40001 is retryable, never generic P2010.
  if (error.code !== 'P2010' || !('meta' in error) || !error.meta || typeof error.meta !== 'object') {
    return false;
  }
  return 'code' in error.meta && error.meta.code === '40001';
}

/** Lock the complete active-admin set in stable order before the last-admin count. */
async function lockActiveAdmins(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM public.users
    WHERE role::text = 'ADMIN' AND is_active = TRUE
    ORDER BY id
    FOR UPDATE
  `);
}

// ═══════════════════════════════════════════════════════════════════════════
// createUser
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tạo user mới + audit log. Trả về `temporaryPassword` 1 lần.
 * Caller (route) PHẢI sanitize `temporaryPassword` trước khi lưu idempotency_keys.
 *
 * Validation: phone phải unique (Prisma sẽ throw P2002 nếu trùng; service
 * map sang `PHONE_TAKEN` 409).
 */
export async function createUser(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: CreateUserInput,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<CreateUserResult> {
  assertAdmin(ctx);
  const reason = requireAuditReason(input.reason);

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  // Gọi create trong transaction. Nếu phone trùng → Prisma throw P2002 → map.
  let created;
  try {
    created = await tx.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        passwordHash,
        role: input.role,
        vendorId: input.vendorId ?? null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        vendorId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    const isP2002 =
      (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002');
    if (isP2002) {
      throw new UserManagementServiceError(
        'PHONE_TAKEN',
        `Số điện thoại ${input.phone} đã được sử dụng.`,
      );
    }
    throw err;
  }

  // Audit log — diff KHÔNG chứa passwordHash/temporaryPassword.
  const audit = await writeAuditLog({
    prisma: tx,
    actor: {
      id: ctx.userId,
      role: ctx.role,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
    entityType: 'User',
    entityId: created.id,
    action: USER_AUDIT_ACTIONS.CREATE,
    diff: publicDiff(null, toPublicUser(created)),
    reason,
    metadata: { actorRole: ctx.role, role: input.role },
  });

  return {
    user: toPublicUser(created),
    temporaryPassword,
    auditId: audit.id,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// updateUser
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cập nhật user. Bảo vệ:
 *   - Self-modification block: admin không được tự sửa role/isActive của mình
 *     (SELF_MODIFICATION_BLOCKED 409). Self-modification cho name/phone OK.
 *   - Last-admin: nếu làm active admin thành inactive, hoặc đổi role admin → non-admin,
 *     phải đảm bảo còn ≥ 1 admin active khác.
 *   - Self-demote: nếu admin tự hạ role của mình → SELF_DEMOTION_BLOCKED 409
 *     (subset của SELF_MODIFICATION_BLOCKED nhưng error code riêng để UI dễ phân biệt).
 *
 * Trả về user public (KHÔNG có passwordHash) + auditId.
 */
export async function updateUser(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  targetUserId: string,
  patch: UpdateUserInput,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<{ user: UserPublic; auditId: string }> {
  assertAdmin(ctx);
  const reason = requireAuditReason(patch.reason);

  const isSelf = ctx.userId === targetUserId;

  const existing = await tx.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      vendorId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!existing) {
    throw new UserManagementServiceError(
      'NOT_FOUND',
      `Không tìm thấy người dùng ${targetUserId} hoặc nằm ngoài phạm vi.`,
    );
  }

  const isChangingRole = patch.role !== undefined && patch.role !== existing.role;
  const isChangingActive =
    patch.isActive !== undefined && patch.isActive !== existing.isActive;
  const willDeactivate = isChangingActive && patch.isActive === false;
  const willDemote = isChangingRole && existing.role === 'ADMIN' && patch.role !== 'ADMIN';

  // Self-modification: admin tự sửa role/isActive của mình
  if (isSelf && (isChangingRole || isChangingActive)) {
    if (willDemote) {
      throw new UserManagementServiceError(
        'SELF_DEMOTION_BLOCKED',
        'Bạn không thể tự hạ quyền quản trị của chính mình.',
      );
    }
    if (willDeactivate) {
      throw new UserManagementServiceError(
        'SELF_DEACTIVATION_BLOCKED',
        'Bạn không thể tự vô hiệu hóa tài khoản của chính mình.',
      );
    }
    // Các thay đổi khác trên role/active của bản thân (vd role=ADMIN same,
    // isActive=true same) — service xử lý sớm ở đây để có error code rõ ràng
    // thay vì rơi vào NO_OP.
    throw new UserManagementServiceError(
      'SELF_MODIFICATION_BLOCKED',
      'Bạn không thể tự thay đổi vai trò/trạng thái của chính mình qua endpoint này.',
    );
  }

  // Last-admin guard: nếu target là admin active và sắp deactivate/demote,
  // đếm số admin active khác — phải ≥ 1.
  if (existing.role === 'ADMIN' && existing.isActive && (willDeactivate || willDemote)) {
    // Lock only on a guard-relevant mutation to avoid serializing ordinary profile edits.
    await lockActiveAdmins(tx);
    const remaining = await countActiveAdmins(tx, existing.id);
    if (remaining < 1) {
      throw new UserManagementServiceError(
        'LAST_ADMIN_PROTECTED',
        'Không thể hạ quyền hoặc vô hiệu hóa admin đang hoạt động cuối cùng của hệ thống.',
        { remainingAdmins: remaining },
      );
    }
  }

  // Tính set field thực sự thay đổi (no-op detection).
  const data: Prisma.UserUpdateInput = {};
  if (patch.name !== undefined && patch.name !== existing.name) data.name = patch.name;
  if (patch.phone !== undefined && patch.phone !== existing.phone) data.phone = patch.phone;
  if (patch.role !== undefined && patch.role !== existing.role) data.role = patch.role;
  if (patch.vendorId !== undefined && patch.vendorId !== existing.vendorId) {
    data.vendorId = patch.vendorId;
  }
  if (patch.isActive !== undefined && patch.isActive !== existing.isActive) {
    data.isActive = patch.isActive;
  }
  if (Object.keys(data).length === 0) {
    throw new UserManagementServiceError(
      'NO_OP',
      'Không có thay đổi nào để cập nhật.',
    );
  }

  // Apply update.
  let updated;
  try {
    updated = await tx.user.update({
      where: { id: targetUserId },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        vendorId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    const isP2002 =
      (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002');
    if (isP2002) {
      throw new UserManagementServiceError(
        'PHONE_TAKEN',
        `Số điện thoại ${patch.phone ?? ''} đã được sử dụng.`,
      );
    }
    throw err;
  }

  // Audit.
  const audit = await writeAuditLog({
    prisma: tx,
    actor: {
      id: ctx.userId,
      role: ctx.role,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
    entityType: 'User',
    entityId: updated.id,
    action: USER_AUDIT_ACTIONS.UPDATE,
    diff: publicDiff(toPublicUser(existing), toPublicUser(updated)),
    reason,
    metadata: { actorRole: ctx.role, fields: Object.keys(data) },
  });

  return { user: toPublicUser(updated), auditId: audit.id };
}

// ═══════════════════════════════════════════════════════════════════════════
// deactivateUser / reactivateUser
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Vô hiệu hóa user (isActive = false). Áp dụng last-admin guard + self-deactivation.
 */
export async function deactivateUser(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  targetUserId: string,
  reason: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<{ user: UserPublic; auditId: string }> {
  assertAdmin(ctx);
  const auditReason = requireAuditReason(reason);

  if (ctx.userId === targetUserId) {
    throw new UserManagementServiceError(
      'SELF_DEACTIVATION_BLOCKED',
      'Bạn không thể tự vô hiệu hóa tài khoản của chính mình.',
    );
  }

  const existing = await tx.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      vendorId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!existing) {
    throw new UserManagementServiceError(
      'NOT_FOUND',
      `Không tìm thấy người dùng ${targetUserId}.`,
    );
  }
  if (!existing.isActive) {
    // Đã inactive rồi — coi như no-op nhưng vẫn trả về user.
    const audit = await writeAuditLog({
      prisma: tx,
      actor: {
        id: ctx.userId,
        role: ctx.role,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
      entityType: 'User',
      entityId: existing.id,
      action: USER_AUDIT_ACTIONS.DEACTIVATE,
      diff: publicDiff(toPublicUser(existing), toPublicUser(existing)),
      reason: auditReason,
      metadata: { actorRole: ctx.role, idempotent: true },
    });
    return { user: toPublicUser(existing), auditId: audit.id };
  }

  // Last-admin guard.
  if (existing.role === 'ADMIN') {
    await lockActiveAdmins(tx);
    const remaining = await countActiveAdmins(tx, existing.id);
    if (remaining < 1) {
      throw new UserManagementServiceError(
        'LAST_ADMIN_PROTECTED',
        'Không thể vô hiệu hóa admin đang hoạt động cuối cùng của hệ thống.',
        { remainingAdmins: remaining },
      );
    }
  }

  const updated = await tx.user.update({
    where: { id: targetUserId },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      vendorId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const audit = await writeAuditLog({
    prisma: tx,
    actor: {
      id: ctx.userId,
      role: ctx.role,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
    entityType: 'User',
    entityId: updated.id,
    action: USER_AUDIT_ACTIONS.DEACTIVATE,
    diff: publicDiff(toPublicUser(existing), toPublicUser(updated)),
    reason: auditReason,
    metadata: { actorRole: ctx.role },
  });

  return { user: toPublicUser(updated), auditId: audit.id };
}

/**
 * Kích hoạt lại user đã vô hiệu (isActive = true). Không có last-admin guard
 * (mở rồi thì an toàn hơn).
 */
export async function reactivateUser(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  targetUserId: string,
  reason: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<{ user: UserPublic; auditId: string }> {
  assertAdmin(ctx);
  const auditReason = requireAuditReason(reason);

  const existing = await tx.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      vendorId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!existing) {
    throw new UserManagementServiceError(
      'NOT_FOUND',
      `Không tìm thấy người dùng ${targetUserId}.`,
    );
  }
  if (existing.isActive) {
    throw new UserManagementServiceError(
      'NO_OP',
      'Tài khoản đã đang hoạt động.',
    );
  }

  const updated = await tx.user.update({
    where: { id: targetUserId },
    data: { isActive: true },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      vendorId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const audit = await writeAuditLog({
    prisma: tx,
    actor: {
      id: ctx.userId,
      role: ctx.role,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
    entityType: 'User',
    entityId: updated.id,
    action: USER_AUDIT_ACTIONS.REACTIVATE,
    diff: publicDiff(toPublicUser(existing), toPublicUser(updated)),
    reason: auditReason,
    metadata: { actorRole: ctx.role },
  });

  return { user: toPublicUser(updated), auditId: audit.id };
}

// ═══════════════════════════════════════════════════════════════════════════
// getUserWithGrants — read-only, mirror GET /api/admin/users/[id]
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Đọc user + danh sách permission grants. Chỉ ADMIN.
 *
 * Grant shape:
 *   - source='ROLE' — đến từ RolePermission của role user
 *   - source='USER' — đến từ UserPermissionGrant của riêng user
 *
 * (Service expose danh sách này cho UI tương lai; task này KHÔNG build UI grant/revoke,
 * nhưng service hỗ trợ cho programmatic/test dùng.)
 */
export async function getUserWithGrants(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  userId: string,
): Promise<UserWithGrants | null> {
  assertAdmin(ctx);

  const row = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      vendorId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      permissionGrants: {
        select: { permissionCode: true, grantType: true },
      },
    },
  });

  if (!row) return null;

  const userGrants = row.permissionGrants.map((g) => ({
    permissionCode: g.permissionCode,
    grantType: (g.grantType as 'GRANT' | 'REVOKE') ?? 'GRANT',
    source: 'USER' as const,
  }));

  return {
    user: toPublicUser(row),
    grants: userGrants,
  };
}
