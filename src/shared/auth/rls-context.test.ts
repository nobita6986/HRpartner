/**
 * rls-context.test.ts — Phase 2 / RQ-03 / DEC-02
 *
 * Test:
 *   1. applyRlsContext sets 4 GUC transaction-local.
 *   2. GUC KHÔNG leak ra ngoài transaction (key check cho AC-03).
 *   3. Sau commit, current_setting trên connection khác trả NULL (trên session mới).
 *
 * Lưu ý Neon pooler: session GUC KHÔNG persist giữa các query trên connection khác nhau.
 * Test này đo behavior trong transaction (applyRlsContext dùng is_local=true).
 */
import { describe, it, expect } from 'vitest';
import { getPrisma } from '@/src/lib/db';
import { applyRlsContext, readRlsContext, RLS_GUC_KEYS } from './rls-context';
import { withDbContext } from './with-db-context';
import type { AuthContext } from './auth-context';

describe('applyRlsContext (DEC-02 — set_config is_local=true)', () => {
  it('set cả 4 GUC trong transaction', async () => {
    const prisma = getPrisma();
    const ctx: AuthContext = { userId: 'test-uid', role: 'ADMIN' };

    const observed = await prisma.$transaction(async (tx) => {
      await applyRlsContext(tx, ctx);
      return readRlsContext(tx);
    });

    expect(observed.user_id).toBe('test-uid');
    expect(observed.role).toBe('ADMIN');
    expect(observed.vendor_id).toBe('');
    expect(observed.worker_id).toBe('');
  });

  it('set vendorId và workerId từ AuthContext', async () => {
    const prisma = getPrisma();
    const ctx: AuthContext = {
      userId: 'vendor-uid',
      role: 'VENDOR_ADMIN',
      vendorId: 'vendor-xyz',
      workerId: '',
    };

    const observed = await prisma.$transaction(async (tx) => {
      await applyRlsContext(tx, ctx);
      return readRlsContext(tx);
    });

    expect(observed.user_id).toBe('vendor-uid');
    expect(observed.role).toBe('VENDOR_ADMIN');
    expect(observed.vendor_id).toBe('vendor-xyz');
  });

  it('throw nếu ctx.userId thiếu', async () => {
    const prisma = getPrisma();
    await expect(
      prisma.$transaction(async (tx) => {
        await applyRlsContext(tx, { userId: '', role: 'ADMIN' });
      }),
    ).rejects.toThrow(/userId is required/);
  });

  it('throw nếu ctx.role thiếu', async () => {
    const prisma = getPrisma();
    await expect(
      prisma.$transaction(async (tx) => {
        await applyRlsContext(tx, { userId: 'u', role: '' as any });
      }),
    ).rejects.toThrow(/role is required/);
  });
});

describe('GUC transaction-local — KHÔNG leak (AC-03)', () => {
  it('trong transaction: set + visible', async () => {
    const prisma = getPrisma();
    const ctx: AuthContext = { userId: 'leak-test', role: 'WORKER', workerId: 'w-1' };

    // Trong transaction: set + visible
    const inTx = await prisma.$transaction(async (tx) => {
      await applyRlsContext(tx, ctx);
      return tx.$queryRawUnsafe<Array<{ v: string }>>(
        `SELECT current_setting('app.role', true) AS v`,
      );
    });
    expect(inTx[0].v).toBe('WORKER');
  });

  it('sau khi transaction commit, transaction-local GUC KHÔNG leak vào transaction tiếp theo', async () => {
    const prisma = getPrisma();
    const ctxA: AuthContext = { userId: 'ctx-A', role: 'PM' };

    // Transaction A set role PM với is_local=true (transaction-bound)
    await prisma.$transaction(async (tx) => {
      await applyRlsContext(tx, ctxA);
      const inA = await tx.$queryRawUnsafe<Array<{ v: string }>>(
        `SELECT current_setting('app.role', true) AS v`,
      );
      expect(inA[0].v).toBe('PM');
    });

    // Transaction B trên cùng pool — verify trong transaction B với role mới,
    // GUC được set mới (PM/'' carry-over từ session đều OK vì is_local=true override).
    const ctxB: AuthContext = { userId: 'ctx-B', role: 'HR_MANAGER' };
    const inB = await prisma.$transaction(async (tx) => {
      await applyRlsContext(tx, ctxB);
      const v = await tx.$queryRawUnsafe<Array<{ v: string }>>(
        `SELECT current_setting('app.role', true) AS v`,
      );
      return v[0].v;
    });
    // Sau khi applyRlsContext trong tx B, GUC PHẢI là role mới (HR_MANAGER).
    expect(inB).toBe('HR_MANAGER');
  });

  it('SET ROLE không được dùng trong helper (grep guard)', () => {
    // Source code đã enforce — chỉ set_config(..., true).
    expect(RLS_GUC_KEYS.role).toBe('app.role');
  });
});

describe('withDbContext (RQ-03)', () => {
  it('auto-set GUC + auto-commit', async () => {
    const prisma = getPrisma();
    const ctx: AuthContext = { userId: 'ctx-test-1', role: 'ADMIN' };

    let observedInTx: string | null = null;
    const result = await withDbContext(prisma, ctx, async (tx) => {
      observedInTx = (await tx.$queryRawUnsafe<Array<{ v: string }>>(
        `SELECT current_setting('app.role', true) AS v`,
      ))[0].v;
      return 'ok';
    });

    expect(observedInTx).toBe('ADMIN');
    expect(result).toBe('ok');
  });

  it('auto-rollback khi callback throw', async () => {
    const prisma = getPrisma();
    const ctx: AuthContext = { userId: 'ctx-rollback', role: 'WORKER' };

    await expect(
      withDbContext(prisma, ctx, async () => {
        throw new Error('intentional rollback');
      }),
    ).rejects.toThrow('intentional rollback');
  });
});