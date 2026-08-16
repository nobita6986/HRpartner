/**
 * with-auth-scope — Phase 1 identity-core SKELETON (RQ-06, DEC-06).
 *
 * ⚠️ Phase 1 SKELETON — chưa có scope builders (Phase 2 mới có).
 * Chức năng duy nhất Phase 1: deny-by-default theo role gate.
 *
 * Quy tắc (DEC-06 + data-scope-security §1.3):
 *   - Role chưa có builder scope: chỉ ADMIN/HR_MANAGER/DIRECTOR được qua; role khác throw AuthScopeError.
 *   - Phase 2: nối scope builders (workerScope, projectScope, ...) vào `READ_OPS` + `WRITE_OPS` injection.
 *
 * Phase 1 hành vi cụ thể:
 *   - getSession() → wrap prisma client → apply gate.
 *   - READ_OPS (findMany / findFirst / findUnique / findUniqueOrThrow / count / aggregate):
 *     nhánh DENY: role không thuộc { ADMIN, HR_MANAGER, DIRECTOR } → throw AuthScopeError.
 *     nhánh PASS: passthrough (chưa inject where — Phase 2 sẽ thay).
 *   - WRITE_OPS (create / update / updateMany / delete / deleteMany): same gate.
 *   - CREATE: ép ownerId từ session nếu có (placeholder — Phase 1 chưa enforce).
 *
 * Lưu ý: §1.3 cũng nói "thiếu session → throw" — router phải gọi getSession() trước khi dùng.
 */
import { SystemRole } from '@prisma/client';
import type { AuthContext } from './auth-context';

/** Lỗi chuẩn hoá — caller map 403/500. */
export class AuthScopeError extends Error {
  constructor(
    public readonly code: 'DENY_BY_DEFAULT' | 'INTERNAL',
    message: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AuthScopeError';
  }
}

/** Role được passthrough khi chưa có builder (Phase 1). Phase 2 sẽ thay bằng injected where. */
const PASS_THROUGH_ROLES: readonly SystemRole[] = ['ADMIN', 'HR_MANAGER', 'DIRECTOR'];

/** Tất cả model — Phase 1 chưa có builder → gate toàn cục. Phase 2 narrowing per model. */
const READ_OPS = ['findMany', 'findFirst', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate'] as const;
const WRITE_OPS = ['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany'] as const;

/**
 * Trả một Prisma Client Extension — Phase 1 gate.
 * Cách dùng:
 *   const db = prisma.$extends(withAuthScope(ctx));
 *   const rows = await db.user.findMany(); // gate check
 *
 * @throws AuthScopeError('DENY_BY_DEFAULT') nếu role không thuộc PASS_THROUGH_ROLES.
 */
export function withAuthScope(ctx: AuthContext) {
  if (!ctx?.userId || !ctx?.role) {
    throw new AuthScopeError('INTERNAL', 'withAuthScope yêu cầu AuthContext (gọi getAuthContext trước)');
  }

  return {
    name: 'withAuthScope-Phase1',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (READ_OPS.includes(operation) || WRITE_OPS.includes(operation)) {
            if (!PASS_THROUGH_ROLES.includes(ctx.role)) {
              throw new AuthScopeError(
                'DENY_BY_DEFAULT',
                `Role ${ctx.role} bị chặn truy cập model ${model} (Phase 1 deny-by-default — Phase 2 sẽ nới scope theo builder).`,
                { userId: ctx.userId, role: ctx.role, model, operation },
              );
            }
          }
          return query(args);
        },
      },
    },
  };
}

/**
 * Helper tạo Prisma client đã extend — Phase 1 chỉ là convenience.
 * Caller chịu trách nhiệm truyền ctx đã verify.
 *
 * Phase 2 sẽ thay bằng: `prisma.$extends(withAuthScope(ctx))` + inject where theo model.
 */
export function authorizeForPhase1(ctx: AuthContext): {
  allowed: boolean;
  reason?: string;
} {
  if (!PASS_THROUGH_ROLES.includes(ctx.role)) {
    return {
      allowed: false,
      reason: `Role ${ctx.role} không thuộc PASS_THROUGH_ROLES (Phase 1 deny-by-default).`,
    };
  }
  return { allowed: true };
}
