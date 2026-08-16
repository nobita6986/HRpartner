/**
 * with-auth-scope test — Phase 1 identity-core (RQ-06, AC-02 case deny).
 */
import { describe, it, expect } from 'vitest';
import { AuthScopeError, withAuthScope, authorizeForPhase1 } from './with-auth-scope';
import type { AuthContext } from './auth-context';

const CTX_ADMIN: AuthContext = { userId: 'a-1', role: 'ADMIN' };
const CTX_HR_MANAGER: AuthContext = { userId: 'h-1', role: 'HR_MANAGER' };
const CTX_DIRECTOR: AuthContext = { userId: 'd-1', role: 'DIRECTOR' };
const CTX_WORKER: AuthContext = { userId: 'w-1', role: 'WORKER', workerId: 'w-1' };
const CTX_SALE: AuthContext = { userId: 's-1', role: 'SALE' };
const CTX_ACCOUNTANT: AuthContext = { userId: 'ac-1', role: 'ACCOUNTANT' };

describe('authorizeForPhase1 (Phase 1 deny-by-default)', () => {
  it.each([
    ['ADMIN', true],
    ['HR_MANAGER', true],
    ['DIRECTOR', true],
    ['HR_STAFF', false],
    ['ACCOUNTANT', false],
    ['SALE', false],
    ['PM', false],
    ['MKT', false],
    ['VENDOR_ADMIN', false],
    ['VENDOR_STAFF', false],
    ['CTV', false],
    ['WORKER', false],
    ['EMPLOYEE', false],
  ])('role %s → allowed=%s', (role, expected) => {
    const r = authorizeForPhase1({ userId: 'u-1', role: role as any });
    expect(r.allowed).toBe(expected);
  });
});

describe('withAuthScope — extension factory (RQ-06)', () => {
  it('thiếu ctx → throw AuthScopeError INTERNAL', () => {
    expect(() => withAuthScope(undefined as any)).toThrow(AuthScopeError);
    expect(() => withAuthScope({ userId: '', role: 'ADMIN' })).toThrow(/INTERNAL|yêu cầu AuthContext/);
  });

  it('trả extension có name + query.$allModels.$allOperations', () => {
    const ext = withAuthScope(CTX_ADMIN);
    expect(ext.name).toBe('withAuthScope-Phase1');
    expect(ext.query).toBeDefined();
    expect((ext.query as any).$allModels.$allOperations).toBeInstanceOf(Function);
  });
});

describe('withAuthScope — gate behavior (RQ-06)', () => {
  /**
   * Helper: gọi $allOperations với mock query — giả lập 1 prisma op.
   * Trả throw hoặc kết quả passthrough.
   */
  async function runOp(ctx: AuthContext, model: string, operation: string) {
    const ext = withAuthScope(ctx);
    const op = (ext.query as any).$allModels.$allOperations;
    let passthroughCalled = false;
    try {
      await op({
        model,
        operation,
        args: {},
        query: async (a: any) => {
          passthroughCalled = true;
          return a;
        },
      });
      return { threw: null as null | AuthScopeError, passthroughCalled };
    } catch (e) {
      return { threw: e as AuthScopeError, passthroughCalled };
    }
  }

  it('ADMIN + findMany → passthrough (không throw)', async () => {
    const r = await runOp(CTX_ADMIN, 'User', 'findMany');
    expect(r.threw).toBeNull();
    expect(r.passthroughCalled).toBe(true);
  });

  it('HR_MANAGER + findUnique → passthrough', async () => {
    const r = await runOp(CTX_HR_MANAGER, 'Ticket', 'findUnique');
    expect(r.threw).toBeNull();
    expect(r.passthroughCalled).toBe(true);
  });

  it('DIRECTOR + count → passthrough', async () => {
    const r = await runOp(CTX_DIRECTOR, 'Worker', 'count');
    expect(r.threw).toBeNull();
    expect(r.passthroughCalled).toBe(true);
  });

  it('WORKER + findMany → throw AuthScopeError DENY_BY_DEFAULT', async () => {
    const r = await runOp(CTX_WORKER, 'User', 'findMany');
    expect(r.threw).toBeInstanceOf(AuthScopeError);
    expect(r.threw!.code).toBe('DENY_BY_DEFAULT');
    expect(r.passthroughCalled).toBe(false);
  });

  it('SALE + create → throw AuthScopeError DENY_BY_DEFAULT', async () => {
    const r = await runOp(CTX_SALE, 'Worker', 'create');
    expect(r.threw).toBeInstanceOf(AuthScopeError);
    expect(r.threw!.code).toBe('DENY_BY_DEFAULT');
  });

  it('ACCOUNTANT + updateMany → throw', async () => {
    const r = await runOp(CTX_ACCOUNTANT, 'Ticket', 'updateMany');
    expect(r.threw).toBeInstanceOf(AuthScopeError);
    expect(r.threw!.code).toBe('DENY_BY_DEFAULT');
  });

  it('role bất kỳ + findFirst → nếu không thuộc PASS_THROUGH → throw', async () => {
    const r = await runOp({ userId: 'h-1', role: 'HR_STAFF' }, 'Worker', 'findFirst');
    expect(r.threw).toBeInstanceOf(AuthScopeError);
    expect(r.threw!.code).toBe('DENY_BY_DEFAULT');
  });

  it('PHASE 1 chưa builder: tất cả model đều bị gate (PHASE 2 mới narrow per model)', async () => {
    for (const model of ['User', 'Worker', 'Project', 'Ticket', 'VendorStatement', 'ClientStatement']) {
      const r = await runOp(CTX_WORKER, model, 'findMany');
      expect(r.threw, `Worker.${model} phải throw`).toBeInstanceOf(AuthScopeError);
    }
  });

  it('AuthScopeError có name + code + meta', () => {
    const err = new AuthScopeError('DENY_BY_DEFAULT', 'test', { foo: 1 });
    expect(err.name).toBe('AuthScopeError');
    expect(err.code).toBe('DENY_BY_DEFAULT');
    expect(err.meta).toEqual({ foo: 1 });
  });
});
