/**
 * with-auth-scope — Phase 2 identity-core EXTENSION (RQ-04, DEC-06).
 *
 * Phase 2 UPDATE (từ Phase 1 SKELETON):
 *   - Đăng ký scope builders qua SCOPE_REGISTRY cho 4 model chính: Worker, Project,
 *     Vendor, CandidateSubmission (theo §5.3 + DEC-06).
 *   - Root roles (ADMIN/HR_MANAGER/DIRECTOR) passthrough toàn bộ model (G22 root bất khả tước).
 *   - Các role khác: lookup builder theo model name. Nếu có builder → inject WHERE.
 *     Nếu KHÔNG có builder → throw AuthScopeError DENY_BY_DEFAULT (mặc định §1.3).
 *   - READ_OPS (findMany/findFirst/findUnique/findUniqueOrThrow/count/aggregate):
 *     inject WHERE clause cho non-root role.
 *   - WRITE_OPS (create/createMany/update/updateMany/delete/deleteMany):
 *     cùng gate — non-root không có builder phải throw.
 *
 * Lưu ý §5.7:
 *   - findUnique ngoài scope → trả null/P2025 y hệt "không tồn tại" (Prisma tự lo vì
 *     WHERE không match → P2025 nếu findUniqueOrThrow, null nếu findUnique).
 *   - $queryRaw KHÔNG qua extension → cấm dùng. Phase 2 helper dùng `withDbContext`
 *     cho mọi DB operation trong context.
 */
import type { Prisma } from '@prisma/client';
import type { AuthContext } from './auth-context';
import { SCOPE_REGISTRY } from './scopes';

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

const ROOT_ROLES: readonly string[] = ['ADMIN', 'HR_MANAGER', 'DIRECTOR'];

const READ_OPS = ['findMany', 'findFirst', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate'] as const;
const WRITE_OPS = ['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany'] as const;
const ALL_OPS = [...READ_OPS, ...WRITE_OPS] as const;

/**
 * Prisma Client Extension factory — Phase 2.
 *
 * Cách dùng:
 *   const db = prisma.$extends(withAuthScope(ctx));
 *   const rows = await db.worker.findMany(); // WHERE injected theo scope
 */
export function withAuthScope(ctx: AuthContext) {
  if (!ctx?.userId || !ctx?.role) {
    throw new AuthScopeError('INTERNAL', 'withAuthScope yêu cầu AuthContext (gọi getAuthContext trước)');
  }

  return {
    name: 'withAuthScope-Phase2',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (!ALL_OPS.includes(operation as any)) {
            return query(args);
          }

          // Root roles: passthrough không inject
          if (ROOT_ROLES.includes(ctx.role)) {
            return query(args);
          }

          // Non-root: lookup builder
          const builder = SCOPE_REGISTRY[model];
          if (!builder) {
            // Model chưa có builder → DENY_BY_DEFAULT (1.3)
            throw new AuthScopeError(
              'DENY_BY_DEFAULT',
              `Role ${ctx.role} không có scope cho model ${model} (Phase 2 chưa đăng ký builder — deny-by-default).`,
              { userId: ctx.userId, role: ctx.role, model, operation },
            );
          }

          // Inject WHERE clause
          const where = builder(ctx);
          const newArgs = { ...args, where: { AND: [args.where, where].filter(Boolean) } };

          return query(newArgs);
        },
      },
    },
  };
}

/**
 * Helper helper — authorize a request for a model (pre-check trước khi vào route).
 * Phase 2 dùng cho self-test / debug.
 */
export function authorizeForPhase2(ctx: AuthContext, model: string): {
  allowed: boolean;
  reason?: string;
} {
  if (ROOT_ROLES.includes(ctx.role)) return { allowed: true };
  const builder = SCOPE_REGISTRY[model];
  if (!builder) {
    return {
      allowed: false,
      reason: `Role ${ctx.role} không có builder cho model ${model} (deny-by-default)`,
    };
  }
  try {
    builder(ctx);
    return { allowed: true };
  } catch (e) {
    return {
      allowed: false,
      reason: (e as Error).message,
    };
  }
}

/** Re-export Prisma type cho consumer. */
export type { Prisma };