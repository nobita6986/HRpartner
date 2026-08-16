/**
 * scopes/ctv.scope.ts — Phase 2 / RQ-04 / DEC-05/06
 *
 * CTV scope builder — CTV chỉ thấy SourceClaim/CandidateSubmission của mình.
 * Vendor cũng dùng CandidateSubmission riêng.
 */
import { Prisma } from '@prisma/client';
import { AuthScopeError } from '../with-auth-scope';
import type { AuthContext } from '../auth-context';

/** CandidateSubmission scope — VENDOR và CTV riêng, ADMIN/HR full. */
export function buildCandidateSubmissionScope(ctx: AuthContext): Prisma.CandidateSubmissionWhereInput {
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
      return { vendorId: ctx.vendorId };
    }

    case 'CTV':
      return { ctvId: ctx.userId };

    case 'PM':
      return { project: { pmUserId: ctx.userId } };

    case 'MKT':
    case 'HR_STAFF':
    case 'WORKER':
    case 'EMPLOYEE':
    default:
      throw new AuthScopeError(
        'DENY_BY_DEFAULT',
        `Role ${ctx.role} không có scope đọc CandidateSubmission`,
        { userId: ctx.userId, role: ctx.role },
      );
  }
}

/** VendorStatement scope — VENDOR xem statement của mình, ADMIN/HR/ACCOUNTANT all. */
export function buildVendorStatementScope(ctx: AuthContext): Prisma.VendorStatementWhereInput {
  switch (ctx.role) {
    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
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
      return { vendorId: ctx.vendorId };
    }

    case 'SALE':
    case 'CTV':
    case 'PM':
    case 'MKT':
    case 'HR_STAFF':
    case 'WORKER':
    case 'EMPLOYEE':
    default:
      throw new AuthScopeError(
        'DENY_BY_DEFAULT',
        `Role ${ctx.role} không có scope đọc VendorStatement`,
        { userId: ctx.userId, role: ctx.role },
      );
  }
}

/** CTV = scope CTV. Dùng cho SourceClaim theo §5.3 (CTV thấy accepted claim của mình). */
export function buildCtvSourceClaimScope(ctx: AuthContext): Prisma.SourceClaimWhereInput {
  switch (ctx.role) {
    case 'CTV':
      return { ctvId: ctx.userId };

    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
    case 'SALE':
    case 'ACCOUNTANT':
      return {};

    case 'VENDOR_ADMIN':
    case 'VENDOR_STAFF':
      if (!ctx.vendorId) {
        throw new AuthScopeError('DENY_BY_DEFAULT', 'VENDOR role thiếu vendorId', {
          userId: ctx.userId,
          role: ctx.role,
        });
      }
      return { vendorId: ctx.vendorId };

    default:
      throw new AuthScopeError('DENY_BY_DEFAULT', `Role ${ctx.role} không có scope đọc SourceClaim`, {
        userId: ctx.userId,
        role: ctx.role,
      });
  }
}