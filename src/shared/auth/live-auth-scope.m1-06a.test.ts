/**
 * live-auth-scope.m1-06a.test.ts — V5-M1-06a / RQ-08 / STEP-07 / AC-09.
 *
 * LIVE evidence (chạy trong integration lane có DB thật; else ENV_BLOCKED — DEC-14):
 * chứng minh boundary canonical `withAuthorizedDb` áp CẢ L1 (scope extension) VÀ L2
 * (RLS GUC transaction-local) cho request CTV.
 *
 *  - Seed/teardown qua DATABASE_URL_ADMIN (role admin — BYPASSRLS, KHÔNG bỏ qua unique).
 *  - Isolation L1 kiểm trên `admin` principal để LOẠI nhiễu RLS → đo ĐÚNG hành vi L1
 *    (extension inject `where { <key>: ctx.userId }`): CTV chỉ thấy dữ liệu của mình,
 *    where thủ công trỏ CTV khác vẫn rỗng (AND self-scope), role ngoài scope → DENY.
 *  - L2 kiểm trên `writer` principal (RLS-enforcing): đọc lại 4 GUC trong CÙNG tx của
 *    boundary (transaction-local) + backstop "không leak" trên đường RLS thật.
 *
 * Anonymous=401 / wrong-role=403 ở tầng HTTP do middleware + route (getAuthContext,
 * ctx.role gate) đảm nhiệm và đã được unit test (vd ctv-summary.route.test.ts: SALE→403);
 * file LIVE này chứng minh tầng DB-boundary (L1+L2) mà unit không thể.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { withAuthorizedDb } from './with-authorized-db';
import { AuthScopeError } from './with-auth-scope';
import { readRlsContext } from './rls-context';
import type { AuthContext } from './auth-context';
import type { DbContextCallback } from './with-db-context';

const ADMIN_URL = process.env.DATABASE_URL_ADMIN;
const WRITER_URL = process.env.DATABASE_URL;
const enabled = Boolean(process.env.M1_06A_LIVE_AUTH_SCOPE && ADMIN_URL && WRITER_URL);

describe.skipIf(!enabled)('V5-M1-06a LIVE — CTV self-scope (L1) + RLS context (L2)', () => {
  const admin = new PrismaClient({ datasourceUrl: ADMIN_URL });
  const writer = new PrismaClient({ datasourceUrl: WRITER_URL });

  const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const ctv1Id = `m106a-ctv1-${RUN}`;
  const ctv2Id = `m106a-ctv2-${RUN}`;
  const ctx1: AuthContext = { userId: ctv1Id, role: 'CTV' };
  const ctx2: AuthContext = { userId: ctv2Id, role: 'CTV' };
  let w1Id = '';
  let w2Id = '';

  beforeAll(async () => {
    await Promise.all([admin.$connect(), writer.$connect()]);
    await admin.user.create({ data: { id: ctv1Id, role: 'CTV', name: 'M106A CTV1' } });
    await admin.user.create({ data: { id: ctv2Id, role: 'CTV', name: 'M106A CTV2' } });
    const w1 = await admin.ctvWithdrawalRequest.create({
      data: { ctvId: ctv1Id, amountVnd: BigInt(100_000), bankAccount: '0001', bankName: 'BankA', status: 'PENDING' },
    });
    const w2 = await admin.ctvWithdrawalRequest.create({
      data: { ctvId: ctv2Id, amountVnd: BigInt(200_000), bankAccount: '0002', bankName: 'BankB', status: 'PENDING' },
    });
    w1Id = w1.id;
    w2Id = w2.id;
  }, 30_000);

  afterAll(async () => {
    try {
      await admin.ctvWithdrawalRequest.deleteMany({ where: { ctvId: { in: [ctv1Id, ctv2Id] } } });
      await admin.user.deleteMany({ where: { id: { in: [ctv1Id, ctv2Id] } } });
    } finally {
      await Promise.all([admin.$disconnect(), writer.$disconnect()]);
    }
  });

  it('L1: CTV chỉ đọc User của chính mình (inject { id: ctx.userId }); hai CTV disjoint', async () => {
    const rows1 = await withAuthorizedDb(admin, ctx1, (tx) => tx.user.findMany({ select: { id: true } }));
    const rows2 = await withAuthorizedDb(admin, ctx2, (tx) => tx.user.findMany({ select: { id: true } }));
    expect(rows1.map((r) => r.id)).toEqual([ctv1Id]);
    expect(rows2.map((r) => r.id)).toEqual([ctv2Id]);
    expect(rows1[0].id).not.toBe(rows2[0].id);
  }, 30_000);

  it('L1: CTV chỉ đọc CtvWithdrawalRequest của mình, không thấy của CTV khác', async () => {
    const r1 = await withAuthorizedDb(admin, ctx1, (tx) =>
      tx.ctvWithdrawalRequest.findMany({ select: { id: true, ctvId: true } }),
    );
    expect(r1.length).toBeGreaterThanOrEqual(1);
    expect(r1.every((x) => x.ctvId === ctv1Id)).toBe(true);
    expect(r1.some((x) => x.id === w1Id)).toBe(true);
    expect(r1.some((x) => x.id === w2Id)).toBe(false);
  }, 30_000);

  it('L1: where thủ công { ctvId: <CTV khác> } vẫn rỗng (AND self-scope, chống enumeration)', async () => {
    const rows = await withAuthorizedDb(admin, ctx1, (tx) =>
      tx.ctvWithdrawalRequest.findMany({ where: { ctvId: ctv2Id } }),
    );
    expect(rows).toHaveLength(0);
  }, 30_000);

  it('L1: role ngoài scope (SALE) → DENY_BY_DEFAULT trên cả 4 builder mới', async () => {
    const sale: AuthContext = { userId: 'm106a-sale', role: 'SALE' };
    const ops: Array<DbContextCallback<unknown>> = [
      (tx) => tx.user.findMany({}),
      (tx) => tx.ctvWithdrawalRequest.findMany({}),
      (tx) => tx.commissionLedger.findMany({}),
      (tx) => tx.commissionDebt.findMany({}),
    ];
    for (const op of ops) {
      await expect(withAuthorizedDb(admin, sale, op)).rejects.toBeInstanceOf(AuthScopeError);
    }
  }, 30_000);

  it('L2: 4 GUC transaction-local set đúng ctx trong CÙNG tx boundary (writer principal)', async () => {
    const guc = await withAuthorizedDb(writer, ctx1, (tx) => readRlsContext(tx));
    expect(guc.user_id).toBe(ctv1Id);
    expect(guc.role).toBe('CTV');
    expect(guc.vendor_id).toBe('');
    expect(guc.worker_id).toBe('');
  }, 30_000);

  it('L1+L2: trên writer (RLS thật) CTV đọc CtvWithdrawalRequest KHÔNG leak sang CTV khác', async () => {
    const rows = await withAuthorizedDb(writer, ctx1, (tx) =>
      tx.ctvWithdrawalRequest.findMany({ select: { ctvId: true } }),
    );
    // 0 row cũng đạt (RLS/policy có thể chặt hơn); chỉ CẦN không bao giờ lộ ctv khác.
    expect(rows.every((x) => x.ctvId === ctv1Id)).toBe(true);
  }, 30_000);
});
