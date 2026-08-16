/**
 * scopes/vendor.scope.ts — Phase 2 / RQ-04 / DEC-05/06
 *
 * Vendor scope builder theo visibility matrix §5.3.
 * VENDOR_ADMIN / VENDOR_STAFF chỉ thấy vendor của mình.
 */
import { Prisma } from '@prisma/client';
import { AuthScopeError } from '../with-auth-scope';
import type { AuthContext } from '../auth-context';

export function buildVendorScope(ctx: AuthContext): Prisma.VendorWhereInput {
  switch (ctx.role) {
    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
    case 'SALE':
    case 'ACCOUNTANT':
      return {};

    case 'VENDOR_ADMIN':
    case 'VENDOR_STAFF': {
      if (!ctx.vendorId) {
        throw new AuthScopeError('DENY_BY_DEFAULT', 'VENDOR role thiếu vendorId', {
          userId: ctx.userId,
          role: ctx.role,
        });
      }
      return { id: ctx.vendorId };
    }

    case 'CTV':
    case 'PM':
    case 'MKT':
    case 'HR_STAFF':
    case 'WORKER':
    case 'EMPLOYEE':
    default:
      throw new AuthScopeError('DENY_BY_DEFAULT', `Role ${ctx.role} không có scope đọc Vendor`, {
        userId: ctx.userId,
        role: ctx.role,
      });
  }
}