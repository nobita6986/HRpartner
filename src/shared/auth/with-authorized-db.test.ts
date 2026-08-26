/**
 * with-authorized-db.test.ts — V5-M1-06a / RQ-02 / AC-02
 *
 * Chứng minh boundary canonical áp ĐÚNG THỨ TỰ trong CÙNG một transaction:
 *   $extends(withAuthScope(ctx))  →  $transaction  →  applyRlsContext (4 GUC is_local)
 *   →  callback; model op trên tx bị L1 inject WHERE; callback throw → transaction reject.
 *
 * Dùng fake PrismaClient (KHÔNG chạm DB): fake mô phỏng $extends trả client có
 * $transaction, và tx định tuyến model op qua chính extension `query.$allModels.
 * $allOperations` (đúng cơ chế Prisma). Việc extension THỰC SỰ fire bên trong một
 * interactive `$transaction` của Prisma 5 + rollback nguyên tử ở DB = phần LIVE (STEP-07).
 */
import { describe, it, expect } from 'vitest';
import { withAuthorizedDb } from './with-authorized-db';
import { AuthScopeError } from './with-auth-scope';
import type { AuthContext } from './auth-context';

type Trace = {
  extendCalled: boolean;
  extensionName?: string;
  transactionCalled: boolean;
  raw: Array<{ sql: string; params: unknown[] }>;
  models: Array<{ model: string; op: string; args: any }>;
  order: string[];
};

function makeFakePrisma(trace: Trace) {
  return {
    $extends(ext: any) {
      trace.extendCalled = true;
      trace.extensionName = ext.name;
      const allOps = ext.query.$allModels.$allOperations;
      return {
        async $transaction(fn: (tx: any) => Promise<unknown>) {
          trace.transactionCalled = true;
          const baseTx: any = {
            async $executeRawUnsafe(sql: string, ...params: unknown[]) {
              trace.raw.push({ sql, params });
              trace.order.push('raw');
              return 1;
            },
          };
          const tx = new Proxy(baseTx, {
            get(target, prop: string) {
              if (prop in target) return (target as any)[prop];
              // Prisma delegate `tx.sourceClaim` ↔ model 'SourceClaim'
              const model = prop.charAt(0).toUpperCase() + prop.slice(1);
              return new Proxy(
                {},
                {
                  get(_d, op: string) {
                    return (args: any) =>
                      allOps({
                        model,
                        operation: op,
                        args: args ?? {},
                        query: async (finalArgs: any) => {
                          trace.models.push({ model, op, args: finalArgs });
                          trace.order.push('model');
                          return { rows: [], finalArgs };
                        },
                      });
                  },
                },
              );
            },
          });
          return fn(tx);
        },
      };
    },
  } as any;
}

function freshTrace(): Trace {
  return { extendCalled: false, transactionCalled: false, raw: [], models: [], order: [] };
}

const CTV: AuthContext = { userId: 'ctv-1', role: 'CTV', vendorId: undefined, workerId: undefined };

describe('withAuthorizedDb — composition L1 + L2 (AC-02)', () => {
  it('áp $extends(withAuthScope) rồi $transaction rồi 4 GUC transaction-local, TRƯỚC callback', async () => {
    const trace = freshTrace();
    const prisma = makeFakePrisma(trace);

    await withAuthorizedDb(prisma, CTV, async (tx) => {
      // model op bên trong callback — phải chạy SAU khi GUC đã set
      await (tx as any).sourceClaim.findMany({ orderBy: { createdAt: 'desc' } });
      return 'ok';
    });

    // L1 wired
    expect(trace.extendCalled).toBe(true);
    expect(trace.extensionName).toBe('withAuthScope-Phase2');
    // L2 trong transaction
    expect(trace.transactionCalled).toBe(true);

    // 4 GUC set_config is_local=true, đúng keys, đúng giá trị ctx
    expect(trace.raw).toHaveLength(4);
    expect(trace.raw[0].sql).toMatch(/set_config\('app\.user_id', \$1, true\)/);
    expect(trace.raw[0].params[0]).toBe('ctv-1');
    expect(trace.raw[1].sql).toMatch(/set_config\('app\.role', \$1, true\)/);
    expect(trace.raw[1].params[0]).toBe('CTV');
    expect(trace.raw[2].sql).toMatch(/set_config\('app\.vendor_id', \$1, true\)/);
    expect(trace.raw[3].sql).toMatch(/set_config\('app\.worker_id', \$1, true\)/);
    for (const r of trace.raw) expect(r.sql).toMatch(/, true\)/); // is_local

    // Thứ tự: 4 raw (GUC) TRƯỚC, rồi mới tới model op
    expect(trace.order.slice(0, 4)).toEqual(['raw', 'raw', 'raw', 'raw']);
    expect(trace.order[4]).toBe('model');
  });

  it('L1 inject WHERE self-scope cho model op của CTV bên trong boundary', async () => {
    const trace = freshTrace();
    const prisma = makeFakePrisma(trace);

    await withAuthorizedDb(prisma, CTV, async (tx) => {
      await (tx as any).commissionLedger.findMany({ where: { status: 'PAID' } });
      return null;
    });

    expect(trace.models).toHaveLength(1);
    const injected = trace.models[0].args;
    expect(injected.where.AND).toBeDefined();
    // caller where + scope { ctvId: 'ctv-1' } đều có mặt
    const and = injected.where.AND;
    expect(and.some((c: any) => c?.status === 'PAID')).toBe(true);
    expect(and.some((c: any) => c?.ctvId === 'ctv-1')).toBe(true);
  });

  it('callback throw → transaction reject (đường rollback); GUC đã set trước khi throw', async () => {
    const trace = freshTrace();
    const prisma = makeFakePrisma(trace);

    await expect(
      withAuthorizedDb(prisma, CTV, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    // GUC vẫn được set trước callback (transaction-local → DB tự reset khi rollback)
    expect(trace.raw).toHaveLength(4);
  });

  it('L1 DENY_BY_DEFAULT: non-root role đọc model không có builder → throw qua boundary', async () => {
    const trace = freshTrace();
    const prisma = makeFakePrisma(trace);
    const SALE: AuthContext = { userId: 's-1', role: 'SALE' };

    await expect(
      withAuthorizedDb(prisma, SALE, async (tx) => {
        // 'Dependent' không có builder → extension phải throw DENY_BY_DEFAULT
        // (Ticket/AttendanceEvent/Site đã có builder từ M1-06b nên không còn dùng ở đây).
        await (tx as any).dependent.findMany({});
        return null;
      }),
    ).rejects.toBeInstanceOf(AuthScopeError);
  });
});
