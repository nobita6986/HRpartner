/**
 * Permission Resolver — Phase 1 identity-core (RQ-02, RQ-03, DEC-03, G22).
 *
 * Thuật toán resolve (data-scope-security §4.2):
 *   role = ADMIN          → ALL (SHORT-CIRCUIT — root bất khả tước, kể cả permission tạo sau)
 *   role ≠ ADMIN          → RolePermission[user.role]
 *                          ∪ UserPermissionGrant[user, GRANT]   (cấp thêm)
 *                          − UserPermissionGrant[user, REVOKE]  (thu hồi — REVOKE thắng GRANT)
 *                          (bỏ các grant hết expiresAt)
 *
 * G22 — root bất khả tước, 2 tầng chặn:
 *   Tầng 1: writeGrant/writeRevoke chặn target user có role ADMIN (ném AuthError).
 *   Tầng 2: kể cả nếu row lọt vào DB, short-circuit vẫn trả ALL cho ADMIN.
 *
 * Cache: TỐI ƯU ĐỂ ĐỌC — DEC-11 (in-DB resolve mỗi request, không Redis).
 * Bảng nhỏ (vài chục permission code, vài role) → query O(1) theo userId.
 */
import { SystemRole } from '@prisma/client';
import {
  PERMISSION_CATALOG,
  isKnownPermissionCode,
  type PermissionCode,
} from './permission-catalog';
import { getPrisma } from '@/src/lib/db';

/** Tập permission hiệu lực cho 1 user. */
export type EffectivePermissions = ReadonlySet<string>;

/** Payload tối thiểu cho resolver — chỉ cần role + userId. */
export interface ResolverUser {
  userId: string;
  role: SystemRole;
}

/** Lỗi chuẩn hoá — caller (require-permission) sẽ map sang HTTP 403. */
export class AuthError extends Error {
  constructor(
    public readonly code: 'PERMISSION_DENIED' | 'GRANT_TARGET_ADMIN' | 'INTERNAL',
    message: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Resolve quyền hiệu lực cho 1 user.
 *
 * - ADMIN: short-circuit ALL (mọi code trong catalog — kể cả code tạo sau).
 * - Role khác: load RolePermission + UserPermissionGrant (filter expired) → grant/revoke reconcile.
 *
 * @param user  Có thể là User DB record hoặc { userId, role }. Tiện cho test + route handler.
 */
export async function resolveEffectivePermissions(
  user: ResolverUser,
): Promise<EffectivePermissions> {
  // ── Tầng 2 G22: ADMIN short-circuit ─────────────────────────────
  if (user.role === 'ADMIN') {
    return new Set(PERMISSION_CATALOG.map((p) => p.code));
  }

  const prisma = getPrisma();
  const now = new Date();

  // 1. RolePermission (nền từ role)
  const rolePerms = await prisma.rolePermission.findMany({
    where: { role: user.role },
    select: { permissionCode: true },
  });
  const set = new Set<string>(rolePerms.map((r) => r.permissionCode));

  // 2. UserPermissionGrant (GRANT + REVOKE, bỏ expired)
  const grants = await prisma.userPermissionGrant.findMany({
    where: {
      userId: user.userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { permissionCode: true, grantType: true },
  });
  for (const g of grants) {
    if (g.grantType === 'GRANT') set.add(g.permissionCode);
    else if (g.grantType === 'REVOKE') set.delete(g.permissionCode);
  }

  return set;
}

/** Check 1 quyền cụ thể (dùng nội bộ helper require-permission). */
export async function hasPermission(
  user: ResolverUser,
  code: PermissionCode,
): Promise<boolean> {
  const eff = await resolveEffectivePermissions(user);
  return eff.has(code);
}

/**
 * Ghi GRANT cho 1 user (G22 Tầng 1 — chặn target role ADMIN).
 *
 * @param target      User được cấp — phải lookup role từ DB.
 * @param code        Permission code (phải có trong catalog).
 * @param grantedBy   UserId của người cấp (audit).
 * @param reason      Bắt buộc (audit + G22 SOP).
 * @param expiresAt   Optional — null = vô hạn.
 *
 * @throws AuthError('GRANT_TARGET_ADMIN') nếu target.role === 'ADMIN'.
 * @throws AuthError('INTERNAL') nếu code lạ hoặc input thiếu.
 */
export async function writeGrant(args: {
  target: ResolverUser;
  code: PermissionCode;
  grantedBy: string;
  reason: string;
  expiresAt?: Date | null;
}): Promise<{ userId: string; permissionCode: string; grantType: 'GRANT' }> {
  validateGrantArgs(args);
  if (args.target.role === 'ADMIN') {
    throw new AuthError(
      'GRANT_TARGET_ADMIN',
      `ADMIN là root bất khả tước (G22) — không cấp/thu được quyền cho user có role ADMIN.`,
      { targetUserId: args.target.userId, code: args.code },
    );
  }
  const prisma = getPrisma();
  const row = await prisma.userPermissionGrant.upsert({
    where: {
      userId_permissionCode_grantType: {
        userId: args.target.userId,
        permissionCode: args.code,
        grantType: 'GRANT',
      },
    },
    create: {
      userId: args.target.userId,
      permissionCode: args.code,
      grantType: 'GRANT',
      grantedBy: args.grantedBy,
      reason: args.reason,
      expiresAt: args.expiresAt ?? null,
    },
    update: {
      grantedBy: args.grantedBy,
      reason: args.reason,
      expiresAt: args.expiresAt ?? null,
    },
    select: { userId: true, permissionCode: true, grantType: true },
  });
  return { ...row, grantType: 'GRANT' as const };
}

/** Ghi REVOKE — cùng logic chặn target ADMIN. */
export async function writeRevoke(args: {
  target: ResolverUser;
  code: PermissionCode;
  grantedBy: string;
  reason: string;
}): Promise<{ userId: string; permissionCode: string; grantType: 'REVOKE' }> {
  validateGrantArgs(args);
  if (args.target.role === 'ADMIN') {
    throw new AuthError(
      'GRANT_TARGET_ADMIN',
      `ADMIN là root bất khả tước (G22) — không cấp/thu được quyền cho user có role ADMIN.`,
      { targetUserId: args.target.userId, code: args.code },
    );
  }
  const prisma = getPrisma();
  const row = await prisma.userPermissionGrant.upsert({
    where: {
      userId_permissionCode_grantType: {
        userId: args.target.userId,
        permissionCode: args.code,
        grantType: 'REVOKE',
      },
    },
    create: {
      userId: args.target.userId,
      permissionCode: args.code,
      grantType: 'REVOKE',
      grantedBy: args.grantedBy,
      reason: args.reason,
    },
    update: {
      grantedBy: args.grantedBy,
      reason: args.reason,
    },
    select: { userId: true, permissionCode: true, grantType: true },
  });
  return { ...row, grantType: 'REVOKE' as const };
}

function validateGrantArgs(args: {
  target: ResolverUser;
  code: PermissionCode;
  grantedBy: string;
  reason: string;
}) {
  if (!args.target.userId) {
    throw new AuthError('INTERNAL', 'target.userId is required');
  }
  if (!args.grantedBy) {
    throw new AuthError('INTERNAL', 'grantedBy is required');
  }
  if (!args.reason?.trim()) {
    throw new AuthError('INTERNAL', 'reason is required (G22 — audit)');
  }
  if (!isKnownPermissionCode(args.code)) {
    throw new AuthError('INTERNAL', `unknown permission code: ${args.code}`);
  }
}
