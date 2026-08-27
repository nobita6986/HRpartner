/**
 * finance-scope.test.ts — V5-M1-06d / RQ-07 / STEP-07 / DEC-11 / DEC-12.
 *
 * UNIT: chứng minh L1 capability tường minh (không phải role-gate + L2 giả).
 *   - buildClientStatementScope / buildPayrollConfigScope: finance/root → {} (global read);
 *     mọi role ngoài finance → AuthScopeError('DENY_BY_DEFAULT') (fail-closed).
 *   - SCOPE_REGISTRY đăng ký ClientStatement, ClientStatementLine, PayrollConfig → extension
 *     lookup được builder (không rơi vào nhánh "chưa có builder → DENY" mù).
 */
import { describe, expect, it } from 'vitest';
import type { SystemRole } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  buildClientStatementScope,
  buildPayrollConfigScope,
} from '@/src/shared/auth/scopes/finance.scope';
import { SCOPE_REGISTRY } from '@/src/shared/auth/scopes';

const ALL_ROLES: SystemRole[] = [
  'ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF', 'SALE', 'PM',
  'ACCOUNTANT', 'MKT', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'WORKER', 'EMPLOYEE',
];
// Canonical finance-reader/root matrix (§7.2 / DEC-11 / DEC-12).
const FINANCE_ALLOWED: SystemRole[] = ['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT'];
const DENIED = ALL_ROLES.filter((r) => !FINANCE_ALLOWED.includes(r));

const ctxFor = (role: SystemRole): AuthContext => ({ userId: 'u-' + role, role });

describe('buildClientStatementScope (DEC-12)', () => {
  it.each(FINANCE_ALLOWED)('%s → global read {} (không lọc row)', (role) => {
    expect(buildClientStatementScope(ctxFor(role))).toEqual({});
  });

  it.each(DENIED)('%s → AuthScopeError DENY_BY_DEFAULT', (role) => {
    try {
      buildClientStatementScope(ctxFor(role));
      throw new Error('phải throw nhưng không');
    } catch (e) {
      expect(e).toBeInstanceOf(AuthScopeError);
      expect((e as AuthScopeError).code).toBe('DENY_BY_DEFAULT');
    }
  });
});

describe('buildPayrollConfigScope (DEC-11)', () => {
  it.each(FINANCE_ALLOWED)('%s → global read {} (đọc config toàn cục)', (role) => {
    expect(buildPayrollConfigScope(ctxFor(role))).toEqual({});
  });

  it.each(DENIED)('%s → AuthScopeError DENY_BY_DEFAULT', (role) => {
    try {
      buildPayrollConfigScope(ctxFor(role));
      throw new Error('phải throw nhưng không');
    } catch (e) {
      expect(e).toBeInstanceOf(AuthScopeError);
      expect((e as AuthScopeError).code).toBe('DENY_BY_DEFAULT');
    }
  });
});

describe('SCOPE_REGISTRY đăng ký finance models (L1 capability thật)', () => {
  it('ClientStatement + ClientStatementLine + PayrollConfig có builder', () => {
    expect(SCOPE_REGISTRY.ClientStatement).toBe(buildClientStatementScope);
    expect(SCOPE_REGISTRY.ClientStatementLine).toBe(buildClientStatementScope);
    expect(SCOPE_REGISTRY.PayrollConfig).toBe(buildPayrollConfigScope);
  });
});
