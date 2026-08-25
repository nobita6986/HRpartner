/**
 * ctv-account-scope.test.ts — V5-M1-06a / RQ-04 / AC-04
 *
 * Unit test cho 4 self-scope builder mới (CtvWithdrawalRequest, CommissionLedger,
 * CommissionDebt, User): CTV chỉ thấy dữ liệu của chính mình; root role passthrough ({});
 * mọi role khác → DENY_BY_DEFAULT (fail-closed). Không chạm DB (thuần builder).
 */
import { describe, it, expect } from 'vitest';
import { AuthScopeError } from '../with-auth-scope';
import type { AuthContext } from '../auth-context';
import {
  buildCtvWithdrawalScope,
  buildCommissionLedgerScope,
  buildCommissionDebtScope,
  buildUserSelfScope,
} from './ctv.scope';

const CTV: AuthContext = { userId: 'ctv-1', role: 'CTV' };
const CTV_OTHER: AuthContext = { userId: 'ctv-2', role: 'CTV' };
const ROOTS: AuthContext[] = [
  { userId: 'a-1', role: 'ADMIN' },
  { userId: 'h-1', role: 'HR_MANAGER' },
  { userId: 'd-1', role: 'DIRECTOR' },
];
const DENIED: AuthContext[] = [
  { userId: 's-1', role: 'SALE' },
  { userId: 'ac-1', role: 'ACCOUNTANT' },
  { userId: 'pm-1', role: 'PM' },
  { userId: 'mkt-1', role: 'MKT' },
  { userId: 'hs-1', role: 'HR_STAFF' },
  { userId: 'w-1', role: 'WORKER', workerId: 'w-1' },
  { userId: 'va-1', role: 'VENDOR_ADMIN', vendorId: 'v-1' },
  { userId: 'vs-1', role: 'VENDOR_STAFF', vendorId: 'v-1' },
];

describe('V5-M1-06a self-scope builders — finance models keyed by ctvId', () => {
  const financeBuilders = [
    ['CtvWithdrawalRequest', buildCtvWithdrawalScope],
    ['CommissionLedger', buildCommissionLedgerScope],
    ['CommissionDebt', buildCommissionDebtScope],
  ] as const;

  for (const [name, builder] of financeBuilders) {
    describe(name, () => {
      it('CTV → self-scope { ctvId: ctx.userId } (server-derived, DEC-06)', () => {
        expect(builder(CTV)).toEqual({ ctvId: 'ctv-1' });
        expect(builder(CTV_OTHER)).toEqual({ ctvId: 'ctv-2' });
      });

      it('root roles → {} (passthrough)', () => {
        for (const ctx of ROOTS) expect(builder(ctx)).toEqual({});
      });

      it('mọi role khác → DENY_BY_DEFAULT (fail-closed)', () => {
        for (const ctx of DENIED) {
          expect(() => builder(ctx)).toThrow(AuthScopeError);
          try {
            builder(ctx);
          } catch (e) {
            expect((e as AuthScopeError).code).toBe('DENY_BY_DEFAULT');
          }
        }
      });
    });
  }
});

describe('V5-M1-06a User self-scope builder', () => {
  it('CTV → { id: ctx.userId } (chỉ đọc chính mình)', () => {
    expect(buildUserSelfScope(CTV)).toEqual({ id: 'ctv-1' });
    expect(buildUserSelfScope(CTV_OTHER)).toEqual({ id: 'ctv-2' });
  });

  it('root roles → {} (passthrough)', () => {
    for (const ctx of ROOTS) expect(buildUserSelfScope(ctx)).toEqual({});
  });

  it('SALE/WORKER/... → DENY_BY_DEFAULT (giữ nguyên: User không có general builder)', () => {
    for (const ctx of DENIED) {
      expect(() => buildUserSelfScope(ctx)).toThrow(AuthScopeError);
      try {
        buildUserSelfScope(ctx);
      } catch (e) {
        expect((e as AuthScopeError).code).toBe('DENY_BY_DEFAULT');
      }
    }
  });

  it('CTV không bao giờ suy ra id của CTV khác (isolation)', () => {
    const scope = buildUserSelfScope(CTV);
    expect(scope).toEqual({ id: 'ctv-1' });
    expect(scope).not.toEqual({ id: 'ctv-2' });
  });
});
