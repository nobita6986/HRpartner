/**
 * scopes/worker.scope.ts — Phase 2 / RQ-04 / DEC-05/06
 *
 * Worker scope builder — L1 Prisma scope theo visibility matrix §5.2.
 * Phase 1 SKELETON trong with-auth-scope đã deny-by-default. Phase 2 THAY
 * bằng builder này (đăng ký vào extension trong STEP-06).
 *
 * Lưu ý: builder trả WHERE clause — KHÔNG throw để trả []; throw chỉ khi role
 * không xác định được scope (deny-by-default, theo §5.2 default branch).
 */
import { Prisma } from '@prisma/client';
import { AuthScopeError } from '../with-auth-scope';
import type { AuthContext } from '../auth-context';

/**
 * Build where-clause cho model Worker theo role.
 * Throw AuthScopeError nếu role không khai báo scope (deny-by-default).
 */
export function buildWorkerScope(ctx: AuthContext): Prisma.WorkerWhereInput {
  switch (ctx.role) {
    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
      // Root — đọc toàn bộ
      return {};

    case 'MKT':
      // MKT không có scope Worker — chặn (§5.2 MKT throw)
      throw new AuthScopeError('DENY_BY_DEFAULT', 'MKT không có scope đọc Worker', {
        userId: ctx.userId,
        role: ctx.role,
      });

    case 'HR_STAFF':
      return { assignedToId: ctx.userId };

    case 'SALE':
      return { OR: [{ ownerId: ctx.userId }, { assignedToId: ctx.userId }] };

    case 'PM':
      return {
        assignments: {
          some: {
            status: 'ACTIVE',
            project: { pmUserId: ctx.userId },
          },
        },
      };

    case 'VENDOR_ADMIN':
    case 'VENDOR_STAFF': {
      if (!ctx.vendorId) {
        throw new AuthScopeError('DENY_BY_DEFAULT', 'VENDOR role thiếu vendorId trong session', {
          userId: ctx.userId,
          role: ctx.role,
        });
      }
      return { sourceClaims: { some: { accepted: true, vendorId: ctx.vendorId } } };
    }

    case 'CTV':
      return { sourceClaims: { some: { accepted: true, ctvId: ctx.userId } } };

    case 'WORKER':
      // Qua accountUserId — không qua SĐT
      return { accountUserId: ctx.userId };

    case 'ACCOUNTANT':
    case 'EMPLOYEE':
    default:
      throw new AuthScopeError('DENY_BY_DEFAULT', `Role ${ctx.role} không có scope đọc Worker`, {
        userId: ctx.userId,
        role: ctx.role,
      });
  }
}