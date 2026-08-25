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

/**
 * V5-M1-06a / RQ-04 / DEC-06 — CtvWithdrawalRequest self-scope.
 * CTV chỉ thấy yêu cầu rút tiền của chính mình (`ctvId = ctx.userId`, server-derived).
 * Root passthrough (không reach ở runtime, giữ cho authorizeForPhase2). Còn lại DENY.
 */
export function buildCtvWithdrawalScope(ctx: AuthContext): Prisma.CtvWithdrawalRequestWhereInput {
  switch (ctx.role) {
    case 'CTV':
      return { ctvId: ctx.userId };

    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
      return {};

    default:
      throw new AuthScopeError(
        'DENY_BY_DEFAULT',
        `Role ${ctx.role} không có scope đọc CtvWithdrawalRequest`,
        { userId: ctx.userId, role: ctx.role },
      );
  }
}

/**
 * V5-M1-06a / RQ-04 / DEC-06 — CommissionLedger self-scope.
 * CTV chỉ thấy ledger của chính mình. Admin-finance L1 (ACCOUNTANT...) là slice sau —
 * ở đây fail-closed theo RQ-04 (non-root model/action chưa khai báo → DENY_BY_DEFAULT).
 */
export function buildCommissionLedgerScope(ctx: AuthContext): Prisma.CommissionLedgerWhereInput {
  switch (ctx.role) {
    case 'CTV':
      return { ctvId: ctx.userId };

    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
      return {};

    default:
      throw new AuthScopeError(
        'DENY_BY_DEFAULT',
        `Role ${ctx.role} không có scope đọc CommissionLedger`,
        { userId: ctx.userId, role: ctx.role },
      );
  }
}

/**
 * V5-M1-06a / RQ-04 / DEC-06 — CommissionDebt self-scope. CTV chỉ thấy nợ của chính mình.
 */
export function buildCommissionDebtScope(ctx: AuthContext): Prisma.CommissionDebtWhereInput {
  switch (ctx.role) {
    case 'CTV':
      return { ctvId: ctx.userId };

    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
      return {};

    default:
      throw new AuthScopeError(
        'DENY_BY_DEFAULT',
        `Role ${ctx.role} không có scope đọc CommissionDebt`,
        { userId: ctx.userId, role: ctx.role },
      );
  }
}

/**
 * V5-M1-06a / RQ-04 / DEC-06 — User self-scope.
 * CTV chỉ đọc được bản ghi User của chính mình (`id = ctx.userId`). Root passthrough.
 * Mọi role khác (SALE/WORKER/VENDOR/...) → DENY_BY_DEFAULT (giữ nguyên hành vi cũ:
 * User không có general builder, chỉ thêm nhánh self cho CTV).
 */
export function buildUserSelfScope(ctx: AuthContext): Prisma.UserWhereInput {
  switch (ctx.role) {
    case 'CTV':
      return { id: ctx.userId };

    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
      return {};

    default:
      throw new AuthScopeError(
        'DENY_BY_DEFAULT',
        `Role ${ctx.role} không có scope đọc User`,
        { userId: ctx.userId, role: ctx.role },
      );
  }
}