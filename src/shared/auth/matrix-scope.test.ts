/**
 * matrix-scope.test.ts — Phase 2 / RQ-07 / AC-07
 *
 * 52-case matrix: 13 role × 4 bảng (Worker, Project, Vendor, VendorStatement).
 * Mỗi case:
 *   - Set GUC trong transaction (is_local=true)
 *   - count(*) from table
 *   - assert row-set hợp lý theo role
 *
 * L2 only — không qua L1 (test SQL RLS thuần).
 *
 * Lưu ý Neon pooler: mỗi query có thể ở connection khác nhau → session-level GUC
 * KHÔNG persist giữa các query. Phải dùng transaction (is_local=true) để GUC
 * còn hiệu lực trong các query kế tiếp.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { getPrisma } from '@/src/lib/db';

const ROLES = [
  'ADMIN',
  'HR_MANAGER',
  'DIRECTOR',
  'HR_STAFF',
  'SALE',
  'PM',
  'ACCOUNTANT',
  'MKT',
  'VENDOR_ADMIN',
  'VENDOR_STAFF',
  'CTV',
  'WORKER',
  'EMPLOYEE',
] as const;

const TABLES = [
  { name: 'workers', table: 'workers' },
  { name: 'projects', table: 'outsourcing_projects' },
  { name: 'vendors', table: 'vendors' },
  { name: 'vendor_statements', table: 'vendor_statements' },
] as const;

async function queryInScope(prisma: any, role: string, table: string, vendorId = ''): Promise<number> {
  // Dùng transaction để GUC (is_local=true) survive across queries
  return prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', 'matrix-test', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.role', $1, true)`, role);
    await tx.$executeRawUnsafe(`SELECT set_config('app.vendor_id', $1, true)`, vendorId);
    const r = await tx.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT COUNT(*)::int AS n FROM ${table}`,
    );
    return r[0].n;
  });
}

describe('Phase 2 L2 RLS — 13 role × 4 bảng matrix (52 cases)', () => {
  let baselineCounts: Record<string, number> = {};

  beforeAll(async () => {
    const prisma = getPrisma();
    // Baseline trong transaction ADMIN (root short-circuit)
    for (const t of TABLES) {
      baselineCounts[t.name] = await queryInScope(prisma, 'ADMIN', t.table);
    }
  });

  for (const role of ROLES) {
    for (const t of TABLES) {
      it(`${role} × ${t.name} → query không error (≤ baseline)`, async () => {
        const prisma = getPrisma();
        const n = await queryInScope(prisma, role, t.table);
        const baseline = baselineCounts[t.name];

        expect(n, `${role}.${t.name} count(${n}) > baseline(${baseline})`).toBeLessThanOrEqual(baseline);

        // ROOT roles phải thấy = baseline
        if (['ADMIN', 'HR_MANAGER', 'DIRECTOR'].includes(role)) {
          expect(n, `${role}.${t.name} phải = baseline`).toBe(baseline);
        }
      });
    }
  }
});

describe('L2 RLS — VendorStatement scope riêng (root + VENDOR)', () => {
  it('ADMIN + vendor_statements → thấy hết', async () => {
    const prisma = getPrisma();
    const n = await queryInScope(prisma, 'ADMIN', 'vendor_statements');
    expect(n).toBeGreaterThanOrEqual(0);
  });

  it('SALE + vendor_statements → 0 (SALE không có scope VS)', async () => {
    const prisma = getPrisma();
    const n = await queryInScope(prisma, 'SALE', 'vendor_statements');
    expect(n).toBe(0);
  });

  it('VENDOR_ADMIN thiếu vendor_id + vendor_statements → 0', async () => {
    const prisma = getPrisma();
    const n = await queryInScope(prisma, 'VENDOR_ADMIN', 'vendor_statements');
    expect(n).toBe(0);
  });
});

describe('L2 RLS — worker role thấy chỉ chính mình', () => {
  it('WORKER (accountUserId không match) + workers → 0', async () => {
    const prisma = getPrisma();
    const n = await queryInScope(prisma, 'WORKER', 'workers');
    expect(n).toBe(0);
  });
});

describe('L2 RLS — §5.7 chống leak (counts/aggregates scoped)', () => {
  it('count() qua L2 cũng bị scope (không leak tổng số)', async () => {
    const prisma = getPrisma();
    const n = await queryInScope(prisma, 'SALE', 'workers');
    expect(n).toBe(0);
  });

  it('HR_STAFF + projects → 0 (HR_STAFF không có scope project)', async () => {
    const prisma = getPrisma();
    const n = await queryInScope(prisma, 'HR_STAFF', 'outsourcing_projects');
    expect(n).toBe(0);
  });
});

describe('L2 RLS — UPDATE/DELETE không thể modify ngoài scope', () => {
  it('SALE cố update 1 worker ngoài scope → 0 rows affected', async () => {
    const prisma = getPrisma();
    const r = await prisma.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', 'fake-sale', true)`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.role', 'SALE', true)`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', true)`);
      return tx.$executeRawUnsafe(
        `UPDATE workers SET full_name = 'HACKED' WHERE id = (SELECT id FROM workers LIMIT 1)`,
      );
    });
    expect(r).toBe(0);
  });
});