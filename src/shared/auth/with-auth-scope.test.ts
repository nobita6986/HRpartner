/**
 * with-auth-scope test — Phase 2 identity-core EXTENSION (RQ-04, DEC-06).
 *
 * Phase 2 changes từ Phase 1 SKELETON:
 *   - Root roles (ADMIN/HR_MANAGER/DIRECTOR) passthrough toàn bộ model.
 *   - Non-root: lookup builder trong SCOPE_REGISTRY.
 *     - Có builder → inject WHERE.
 *     - Không có builder → throw DENY_BY_DEFAULT.
 *   - Model Worker/Project/Vendor/CandidateSubmission/VendorStatement/SourceClaim có builder.
 *   - Model User/Dependent/Ticket/ProjectAssignment chưa có builder (DENY_BY_DEFAULT).
 */
import { describe, it, expect } from 'vitest';
import { AuthScopeError, withAuthScope, authorizeForPhase2 } from './with-auth-scope';
import type { AuthContext } from './auth-context';

const CTX_ADMIN: AuthContext = { userId: 'a-1', role: 'ADMIN' };
const CTX_HR_MANAGER: AuthContext = { userId: 'h-1', role: 'HR_MANAGER' };
const CTX_DIRECTOR: AuthContext = { userId: 'd-1', role: 'DIRECTOR' };
const CTX_WORKER: AuthContext = { userId: 'w-1', role: 'WORKER', workerId: 'w-1' };
const CTX_SALE: AuthContext = { userId: 's-1', role: 'SALE' };
const CTX_ACCOUNTANT: AuthContext = { userId: 'ac-1', role: 'ACCOUNTANT' };
const CTX_PM: AuthContext = { userId: 'pm-1', role: 'PM' };
const CTX_HR_STAFF: AuthContext = { userId: 'hs-1', role: 'HR_STAFF' };
const CTX_VENDOR_ADMIN: AuthContext = { userId: 'va-1', role: 'VENDOR_ADMIN', vendorId: 'v-1' };
const CTX_VENDOR_STAFF: AuthContext = { userId: 'vs-1', role: 'VENDOR_STAFF', vendorId: 'v-1' };
const CTX_CTV: AuthContext = { userId: 'ctv-1', role: 'CTV' };
const CTX_MKT: AuthContext = { userId: 'mkt-1', role: 'MKT' };

describe('authorizeForPhase2 (Phase 2 deny-by-default)', () => {
  it.each([
    // [role, model, expected]
    ['ADMIN', 'Worker', true],
    ['HR_MANAGER', 'Worker', true],
    ['DIRECTOR', 'Project', true],
    ['HR_STAFF', 'Worker', true], // has builder
    ['SALE', 'Worker', true],
    ['PM', 'Project', true],
    ['VENDOR_ADMIN', 'Vendor', true], // has vendorId
    ['VENDOR_STAFF', 'Vendor', true],
    ['CTV', 'Worker', true],
    ['WORKER', 'Worker', true],
    ['MKT', 'Worker', false], // MKT throws
    ['ACCOUNTANT', 'Worker', false], // not in worker matrix
    // Models without builder
    ['ADMIN', 'User', true], // root passthrough
    ['HR_MANAGER', 'Ticket', true],
    ['WORKER', 'User', false], // no builder + not root → deny
    ['SALE', 'Dependent', false],
    ['PM', 'Vendor', false], // PM không có scope Vendor
  ])('role %s on model %s → allowed=%s', (role, model, expected) => {
    const ctxMap: Record<string, AuthContext> = {
      ADMIN: CTX_ADMIN,
      HR_MANAGER: CTX_HR_MANAGER,
      DIRECTOR: CTX_DIRECTOR,
      HR_STAFF: CTX_HR_STAFF,
      SALE: CTX_SALE,
      PM: CTX_PM,
      ACCOUNTANT: CTX_ACCOUNTANT,
      VENDOR_ADMIN: CTX_VENDOR_ADMIN,
      VENDOR_STAFF: CTX_VENDOR_STAFF,
      CTV: CTX_CTV,
      WORKER: CTX_WORKER,
      MKT: CTX_MKT,
    };
    const r = authorizeForPhase2(ctxMap[role], model);
    expect(r.allowed).toBe(expected);
  });

  it('VENDOR_ADMIN thiếu vendorId → not allowed', () => {
    const r = authorizeForPhase2({ userId: 'va-2', role: 'VENDOR_ADMIN' }, 'Vendor');
    expect(r.allowed).toBe(false);
  });
});

describe('withAuthScope — extension factory (RQ-04)', () => {
  it('thiếu ctx → throw AuthScopeError INTERNAL', () => {
    expect(() => withAuthScope(undefined as any)).toThrow(AuthScopeError);
    expect(() => withAuthScope({ userId: '', role: 'ADMIN' })).toThrow(/INTERNAL|yêu cầu AuthContext/);
  });

  it('trả extension có name + query.$allModels.$allOperations', () => {
    const ext = withAuthScope(CTX_ADMIN);
    expect(ext.name).toBe('withAuthScope-Phase2');
    expect(ext.query).toBeDefined();
    expect((ext.query as any).$allModels.$allOperations).toBeInstanceOf(Function);
  });
});

describe('withAuthScope — root roles passthrough (RQ-04)', () => {
  async function runOp(ctx: AuthContext, model: string, operation: string) {
    const ext = withAuthScope(ctx);
    const op = (ext.query as any).$allModels.$allOperations;
    let passthroughCalled = false;
    let injectedArgs: any = null;
    try {
      const result = await op({
        model,
        operation,
        args: {},
        query: async (a: any) => {
          passthroughCalled = true;
          injectedArgs = a;
          return a;
        },
      });
      return { threw: null as null | AuthScopeError, passthroughCalled, result, injectedArgs };
    } catch (e) {
      return { threw: e as AuthScopeError, passthroughCalled, result: null, injectedArgs };
    }
  }

  it('ADMIN + findMany → passthrough KHÔNG inject WHERE', async () => {
    const r = await runOp(CTX_ADMIN, 'Worker', 'findMany');
    expect(r.threw).toBeNull();
    expect(r.passthroughCalled).toBe(true);
  });

  it('HR_MANAGER + User.findUnique → passthrough (root không có model giới hạn)', async () => {
    const r = await runOp(CTX_HR_MANAGER, 'User', 'findUnique');
    expect(r.threw).toBeNull();
    expect(r.passthroughCalled).toBe(true);
  });

  it('DIRECTOR + Ticket.count → passthrough', async () => {
    const r = await runOp(CTX_DIRECTOR, 'Ticket', 'count');
    expect(r.threw).toBeNull();
    expect(r.passthroughCalled).toBe(true);
  });
});

describe('withAuthScope — non-root inject WHERE (RQ-04)', () => {
  async function runOp(ctx: AuthContext, model: string, operation: string, originalWhere?: any) {
    const ext = withAuthScope(ctx);
    const op = (ext.query as any).$allModels.$allOperations;
    let passthroughCalled = false;
    let injectedArgs: any = null;
    try {
      await op({
        model,
        operation,
        args: originalWhere ? { where: originalWhere } : {},
        query: async (a: any) => {
          passthroughCalled = true;
          injectedArgs = a;
          return a;
        },
      });
      return { threw: null as null | AuthScopeError, passthroughCalled, injectedArgs };
    } catch (e) {
      return { threw: e as AuthScopeError, passthroughCalled, injectedArgs };
    }
  }

  it('SALE + Worker.findMany → inject WHERE OR(ownerId, assignedToId)', async () => {
    const r = await runOp(CTX_SALE, 'Worker', 'findMany');
    expect(r.threw).toBeNull();
    expect(r.injectedArgs.where.AND).toBeDefined();
    const and = r.injectedArgs.where.AND;
    // And contains the OR clause
    const hasOr = and.some((c: any) => c?.OR && Array.isArray(c.OR));
    expect(hasOr).toBe(true);
  });

  it('HR_STAFF + Worker.findMany → inject WHERE assignedToId = userId', async () => {
    const r = await runOp(CTX_HR_STAFF, 'Worker', 'findMany');
    expect(r.threw).toBeNull();
    expect(r.injectedArgs.where.AND).toBeDefined();
    const and = r.injectedArgs.where.AND;
    expect(and.some((c: any) => c?.assignedToId === 'hs-1')).toBe(true);
  });

  it('PM + Worker.findMany → inject WHERE assignments.some ACTIVE', async () => {
    const r = await runOp(CTX_PM, 'Worker', 'findMany');
    expect(r.threw).toBeNull();
    const and = r.injectedArgs.where.AND;
    expect(and.some((c: any) => c?.assignments?.some?.status === 'ACTIVE')).toBe(true);
  });

  it('WORKER + Worker.findMany → inject WHERE accountUserId = userId', async () => {
    const r = await runOp(CTX_WORKER, 'Worker', 'findMany');
    expect(r.threw).toBeNull();
    const and = r.injectedArgs.where.AND;
    expect(and.some((c: any) => c?.accountUserId === 'w-1')).toBe(true);
  });

  it('CTV + Worker.findMany → inject WHERE sourceClaims.some accepted ctvId', async () => {
    const r = await runOp(CTX_CTV, 'Worker', 'findMany');
    expect(r.threw).toBeNull();
    const and = r.injectedArgs.where.AND;
    expect(and.some((c: any) => c?.sourceClaims?.some?.ctvId === 'ctv-1')).toBe(true);
  });

  it('VENDOR_ADMIN + Vendor.findMany → inject WHERE id = vendorId', async () => {
    const r = await runOp(CTX_VENDOR_ADMIN, 'Vendor', 'findMany');
    expect(r.threw).toBeNull();
    const and = r.injectedArgs.where.AND;
    expect(and.some((c: any) => c?.id === 'v-1')).toBe(true);
  });
});

describe('withAuthScope — deny-by-default for models without builder (DEC-06)', () => {
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

  it('MKT + Worker.findMany → throw DENY_BY_DEFAULT (MKT không có scope Worker)', async () => {
    const r = await runOp(CTX_MKT, 'Worker', 'findMany');
    expect(r.threw).toBeInstanceOf(AuthScopeError);
    expect(r.threw!.code).toBe('DENY_BY_DEFAULT');
  });

  it('SALE + User.findMany → throw (User chưa có builder)', async () => {
    const r = await runOp(CTX_SALE, 'User', 'findMany');
    expect(r.threw).toBeInstanceOf(AuthScopeError);
    expect(r.threw!.code).toBe('DENY_BY_DEFAULT');
  });

  it('WORKER + Dependent.findMany → throw (Dependent chưa có builder)', async () => {
    const r = await runOp(CTX_WORKER, 'Dependent', 'findMany');
    expect(r.threw).toBeInstanceOf(AuthScopeError);
    expect(r.threw!.code).toBe('DENY_BY_DEFAULT');
  });

  // V5-M1-06b: Ticket/AttendanceEvent/Site đã được đăng ký builder (worker-portal.scope).
  // WORKER giờ self-scope (không còn deny-by-default); role ngoài scope vẫn deny.
  it('WORKER + Ticket.findMany → passthrough (M1-06b: Ticket đã có builder self-scope)', async () => {
    const r = await runOp(CTX_WORKER, 'Ticket', 'findMany');
    expect(r.threw).toBeNull();
    expect(r.passthroughCalled).toBe(true);
  });

  it('WORKER + AttendanceEvent.findMany → passthrough (M1-06b: builder self-scope)', async () => {
    const r = await runOp(CTX_WORKER, 'AttendanceEvent', 'findMany');
    expect(r.threw).toBeNull();
    expect(r.passthroughCalled).toBe(true);
  });

  it('MKT + AttendanceEvent.findMany → throw (role ngoài scope vẫn deny-by-default)', async () => {
    const r = await runOp(CTX_MKT, 'AttendanceEvent', 'findMany');
    expect(r.threw).toBeInstanceOf(AuthScopeError);
    expect(r.threw!.code).toBe('DENY_BY_DEFAULT');
  });

  it('PM + Vendor.findMany → throw (PM không có scope Vendor)', async () => {
    const r = await runOp(CTX_PM, 'Vendor', 'findMany');
    expect(r.threw).toBeInstanceOf(AuthScopeError);
    expect(r.threw!.code).toBe('DENY_BY_DEFAULT');
  });

  it('Accountant + Project.findMany → allow (ACCOUNTANT có builder qua §5.3)', async () => {
    const r = await runOp(CTX_ACCOUNTANT, 'Project', 'findMany');
    expect(r.threw).toBeNull();
    expect(r.passthroughCalled).toBe(true);
  });

  it('root roles (ADMIN) trên bất kỳ model nào cũng passthrough', async () => {
    for (const model of ['User', 'Worker', 'Project', 'Ticket', 'Dependent']) {
      const r = await runOp(CTX_ADMIN, model, 'findMany');
      expect(r.threw, `ADMIN.${model} phải passthrough`).toBeNull();
    }
  });
});

describe('withAuthScope — AuthScopeError shape', () => {
  it('có name + code + meta', () => {
    const err = new AuthScopeError('DENY_BY_DEFAULT', 'test', { foo: 1 });
    expect(err.name).toBe('AuthScopeError');
    expect(err.code).toBe('DENY_BY_DEFAULT');
    expect(err.meta).toEqual({ foo: 1 });
  });
});