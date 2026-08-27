/**
 * scopes/finance.scope.ts — V5-M1-06d / RQ-07 / STEP-07 / DEC-11 / DEC-12.
 *
 * L1 capability tường minh cho model tài chính/cấu hình toàn cục (KHÔNG có row-owner):
 *   - ClientStatement / ClientStatementLine (DEC-12): margin aggregate cần L1 thật (không
 *     chỉ role gate + L2). Reader tài chính đọc toàn cục; role khác DENY_BY_DEFAULT.
 *   - PayrollConfig (DEC-11): config lương toàn cục; ACCOUNTANT (non-root) cần global-read
 *     tường minh vì không có builder → trước đây DENY. Không nới mutation (route GET-only).
 *
 * ADMIN/HR_MANAGER/DIRECTOR là ROOT_ROLES (with-auth-scope passthrough — liệt kê cho đầy đủ,
 * không reach runtime). ACCOUNTANT là finance-reader non-root → `{}` (đọc toàn cục, không có
 * row scope vì đây là aggregate/config toàn hệ). Mọi role khác → DENY_BY_DEFAULT (fail-closed).
 */
import { Prisma } from '@prisma/client';
import { AuthScopeError } from '../with-auth-scope';
import type { AuthContext } from '../auth-context';

/** ClientStatement + ClientStatementLine — finance/root đọc toàn cục (DEC-12). */
export function buildClientStatementScope(ctx: AuthContext): Prisma.ClientStatementWhereInput {
  switch (ctx.role) {
    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
    case 'ACCOUNTANT':
      return {};
    default:
      throw new AuthScopeError(
        'DENY_BY_DEFAULT',
        `Role ${ctx.role} không có scope đọc ClientStatement`,
        { userId: ctx.userId, role: ctx.role },
      );
  }
}

/** PayrollConfig — cấu hình lương toàn cục; finance/root read, không nới mutation (DEC-11). */
export function buildPayrollConfigScope(ctx: AuthContext): Prisma.PayrollConfigWhereInput {
  switch (ctx.role) {
    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
    case 'ACCOUNTANT':
      return {};
    default:
      throw new AuthScopeError(
        'DENY_BY_DEFAULT',
        `Role ${ctx.role} không có scope đọc PayrollConfig`,
        { userId: ctx.userId, role: ctx.role },
      );
  }
}
