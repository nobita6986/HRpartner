/**
 * live-vendor-idor.m1-08.test.ts — V5-M1-08 STEP-07 (RQ-01/02/05/07, DEC-03/04/07/08/09).
 *
 * LIVE evidence (integration lane có DB thật; else ENV_BLOCKED — không bao giờ PASS giả):
 * chứng minh vendor object-scope / IDOR hardening tại tầng DB-boundary mà unit KHÔNG thể:
 *
 *  - L1 (admin principal — loại nhiễu RLS, đo ĐÚNG scope extension inject WHERE):
 *      • StaffingOrder: VENDOR chỉ thấy order trên project public HOẶC project có submission
 *        của vendor mình; project private không-submission → KHÔNG thấy (IDOR). where thủ công
 *        trỏ order vô hình vẫn rỗng. AC-02: literal status filter chỉ OPEN/CLOSING_SOON.
 *      • CandidateSubmission / VendorStatement: chỉ của vendor mình; where trỏ vendor khác rỗng.
 *  - L2 (writer principal — RLS-enforcing): guarded/optimistic write của M1-08 trên DB thật:
 *      • GUC transaction-local đúng danh tính (readRlsContext).
 *      • RLS backstop (DEC-09): dưới GUC vendor A, updateMany BỎ where.vendorId vẫn KHÔNG chạm
 *        được row vendor B (count=0) — L2 chặn kể cả khi L1/where app lỡ rơi.
 *      • Guarded confirm: {id,vendorId,status:'SENT'} → count=1, flip CONFIRMED; cross-vendor → 0.
 *      • Race (AC-07): hai transaction đồng thời confirm CÙNG statement → đúng một winner (count=1).
 *      • Guarded dispute + max 2 vòng (G17): disputeCount {lt:2} guard chặn vòng 3 tại DB (count=0).
 *
 * HTTP 401/403 zero-call đã được unit route suite phủ (vendor-object-scope.m1-08.route.test.ts);
 * file LIVE này phủ tầng DB (L1+L2) — cùng cách phân tầng như live-vendor-worker-scope.m1-06b.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { withAuthorizedDb } from './with-authorized-db';
import { withDbContext } from './with-db-context';
import { readRlsContext } from './rls-context';
import { OPEN_ORDER_STATUSES } from '@/src/domains/staffing/types';
import type { AuthContext } from './auth-context';

const ADMIN_URL = process.env.DATABASE_URL_ADMIN;
const WRITER_URL = process.env.DATABASE_URL;
const enabled = Boolean(process.env.M1_08_LIVE_VENDOR_IDOR && ADMIN_URL && WRITER_URL);

describe.skipIf(!enabled)('V5-M1-08 LIVE — vendor object-scope/IDOR (L1) + guarded write & RLS backstop (L2)', () => {
  const admin = new PrismaClient({ datasourceUrl: ADMIN_URL });
  const writer = new PrismaClient({ datasourceUrl: WRITER_URL });

  const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Vendors + auth contexts (server-derived vendorId is the scope key).
  const vAId = `m108-va-${RUN}`;
  const vBId = `m108-vb-${RUN}`;
  const vendorA: AuthContext = { userId: `m108-vu-a-${RUN}`, role: 'VENDOR_ADMIN', vendorId: vAId };
  const vendorAStaff: AuthContext = { userId: `m108-vu-as-${RUN}`, role: 'VENDOR_STAFF', vendorId: vAId };
  const vendorB: AuthContext = { userId: `m108-vu-b-${RUN}`, role: 'VENDOR_ADMIN', vendorId: vBId };
  // Vendor context whose vendorId owns nothing (empty/invalid-scope actor) — sees only public.
  const vendorEmpty: AuthContext = { userId: `m108-vu-x-${RUN}`, role: 'VENDOR_ADMIN', vendorId: `m108-vx-${RUN}` };

  // Client company + projects (public vs private) for order visibility.
  const ccId = `m108-cc-${RUN}`;
  const projPublicId = `m108-pp-${RUN}`;
  const projPrivSubId = `m108-ps-${RUN}`;
  const projPrivNoSubId = `m108-pn-${RUN}`;

  // StaffingOrders: public-open (visible), public-closed (status filtered out),
  // private-with-sub (visible via own submission), private-no-sub (INVISIBLE = IDOR barrier).
  const orderPublicOpenId = `m108-o-pub-open-${RUN}`;
  const orderPublicClosedId = `m108-o-pub-closed-${RUN}`;
  const orderPrivSubOpenId = `m108-o-priv-sub-${RUN}`;
  const orderPrivNoSubOpenId = `m108-o-priv-nosub-${RUN}`;

  // Submissions: subA (vendor A on private-with-sub project) grants A visibility;
  // subB (vendor B on private-no-sub project) grants only B visibility.
  let subAId = '';
  let subBId = '';

  // VendorStatements (all SENT unless mutated): dedicated per mutating test to stay isolated.
  let vsAConfirmId = ''; // vendor A — guarded confirm happy path
  let vsARaceId = '';    // vendor A — concurrency race
  let vsADisputeId = ''; // vendor A — guarded dispute + max-2 guard
  let vsBCrossId = '';    // vendor B — cross-vendor target (must stay untouched)

  beforeAll(async () => {
    await Promise.all([admin.$connect(), writer.$connect()]);

    await admin.vendor.create({ data: { id: vAId, code: `M108-VA-${RUN}`, name: 'M108 Vendor A' } });
    await admin.vendor.create({ data: { id: vBId, code: `M108-VB-${RUN}`, name: 'M108 Vendor B' } });

    await admin.clientCompany.create({ data: { id: ccId, code: `M108-CC-${RUN}`, name: 'M108 Client' } });
    const start = new Date('2026-08-01T00:00:00.000Z');
    await admin.project.create({ data: { id: projPublicId, code: `M108-PP-${RUN}`, clientCompanyId: ccId, name: 'Public', startDate: start, isPublic: true } });
    await admin.project.create({ data: { id: projPrivSubId, code: `M108-PS-${RUN}`, clientCompanyId: ccId, name: 'PrivSub', startDate: start, isPublic: false } });
    await admin.project.create({ data: { id: projPrivNoSubId, code: `M108-PN-${RUN}`, clientCompanyId: ccId, name: 'PrivNoSub', startDate: start, isPublic: false } });

    await admin.staffingOrder.create({ data: { id: orderPublicOpenId, projectId: projPublicId, code: `M108-SO-PO-${RUN}`, title: 'pub open', status: 'OPEN' } });
    await admin.staffingOrder.create({ data: { id: orderPublicClosedId, projectId: projPublicId, code: `M108-SO-PC-${RUN}`, title: 'pub closed', status: 'CLOSED' } });
    await admin.staffingOrder.create({ data: { id: orderPrivSubOpenId, projectId: projPrivSubId, code: `M108-SO-PS-${RUN}`, title: 'priv sub open', status: 'OPEN' } });
    await admin.staffingOrder.create({ data: { id: orderPrivNoSubOpenId, projectId: projPrivNoSubId, code: `M108-SO-PN-${RUN}`, title: 'priv nosub open', status: 'OPEN' } });

    const subA = await admin.candidateSubmission.create({ data: { vendorId: vAId, projectId: projPrivSubId, fullName: 'Cand A', phone: `0${String(Date.now()).slice(-9)}`, status: 'NEW' } });
    const subB = await admin.candidateSubmission.create({ data: { vendorId: vBId, projectId: projPrivNoSubId, fullName: 'Cand B', phone: `0${String(Date.now() + 1).slice(-9)}`, status: 'NEW' } });
    subAId = subA.id;
    subBId = subB.id;

    const mk = (vendorId: string, m: number) => admin.vendorStatement.create({ data: { vendorId, periodMonth: m, periodYear: 2026, version: 1, status: 'SENT', totalAmount: 1000n } });
    vsAConfirmId = (await mk(vAId, 1)).id;
    vsARaceId = (await mk(vAId, 2)).id;
    vsADisputeId = (await mk(vAId, 3)).id;
    vsBCrossId = (await mk(vBId, 1)).id;
  }, 60_000);

  afterAll(async () => {
    try {
      await admin.candidateSubmission.deleteMany({ where: { id: { in: [subAId, subBId] } } });
      await admin.vendorStatement.deleteMany({ where: { id: { in: [vsAConfirmId, vsARaceId, vsADisputeId, vsBCrossId] } } });
      await admin.staffingOrder.deleteMany({ where: { id: { in: [orderPublicOpenId, orderPublicClosedId, orderPrivSubOpenId, orderPrivNoSubOpenId] } } });
      await admin.project.deleteMany({ where: { id: { in: [projPublicId, projPrivSubId, projPrivNoSubId] } } });
      await admin.clientCompany.deleteMany({ where: { id: ccId } });
      await admin.vendor.deleteMany({ where: { id: { in: [vAId, vBId] } } });
    } finally {
      await Promise.all([admin.$disconnect(), writer.$disconnect()]);
    }
  });

  // ── L1 (admin principal): StaffingOrder visibility + IDOR + canonical status (AC-01/02) ──
  it('L1: VENDOR chỉ thấy order trên project public hoặc có submission; KHÔNG thấy private-no-submission; status lọc OPEN/CLOSING_SOON', async () => {
    const rows = await withAuthorizedDb(admin, vendorA, (tx) =>
      tx.staffingOrder.findMany({
        where: { status: { in: [...OPEN_ORDER_STATUSES] } },
        select: { id: true, status: true },
      }),
    );
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(orderPublicOpenId); // public + OPEN → thấy
    expect(ids).toContain(orderPrivSubOpenId); // private nhưng có submission của A → thấy
    expect(ids).not.toContain(orderPrivNoSubOpenId); // private, A không có submission → IDOR chặn
    expect(ids).not.toContain(orderPublicClosedId); // CLOSED bị status filter loại (AC-02)
    // AC-02: KHÔNG có literal 'ACTIVE' — canonical chỉ OPEN/CLOSING_SOON.
    expect(rows.every((r) => (['OPEN', 'CLOSING_SOON'] as string[]).includes(r.status))).toBe(true);
  }, 30_000);

  it('L1: VENDOR where thủ công trỏ order vô hình (private-no-sub) vẫn rỗng (AND self-scope, chống enumeration)', async () => {
    const rows = await withAuthorizedDb(admin, vendorA, (tx) =>
      tx.staffingOrder.findMany({ where: { id: orderPrivNoSubOpenId } }),
    );
    expect(rows).toHaveLength(0);
  }, 30_000);

  // ── L1: CandidateSubmission + VendorStatement IDOR (AC-01/04) ──
  it('L1: VENDOR chỉ đọc CandidateSubmission của mình; where trỏ vendor khác rỗng', async () => {
    const own = await withAuthorizedDb(admin, vendorA, (tx) =>
      tx.candidateSubmission.findMany({ select: { id: true, vendorId: true } }),
    );
    expect(own.every((r) => r.vendorId === vAId)).toBe(true);
    expect(own.some((r) => r.id === subAId)).toBe(true);
    expect(own.some((r) => r.id === subBId)).toBe(false);

    const cross = await withAuthorizedDb(admin, vendorA, (tx) =>
      tx.candidateSubmission.findMany({ where: { vendorId: vBId } }),
    );
    expect(cross).toHaveLength(0);
  }, 30_000);

  it('L1: VENDOR chỉ đọc VendorStatement của mình; where trỏ vendor khác rỗng (IDOR)', async () => {
    const own = await withAuthorizedDb(admin, vendorA, (tx) =>
      tx.vendorStatement.findMany({ select: { id: true, vendorId: true } }),
    );
    expect(own.every((r) => r.vendorId === vAId)).toBe(true);
    expect(own.some((r) => r.id === vsBCrossId)).toBe(false);

    const cross = await withAuthorizedDb(admin, vendorA, (tx) =>
      tx.vendorStatement.findMany({ where: { id: vsBCrossId } }),
    );
    expect(cross).toHaveLength(0);
  }, 30_000);

  // ── L1 extended: A-staff parity + B-admin đối xứng + empty-scope actor (AC-01/04) ──
  it('L1: VENDOR_STAFF (cùng vendor A) đọc ĐÚNG own-scope như VENDOR_ADMIN — scope key là vendorId server-derived, không phải role', async () => {
    const orderIds = (await withAuthorizedDb(admin, vendorAStaff, (tx) =>
      tx.staffingOrder.findMany({ where: { status: { in: [...OPEN_ORDER_STATUSES] } }, select: { id: true } }),
    )).map((r) => r.id);
    expect(orderIds).toContain(orderPublicOpenId);
    expect(orderIds).toContain(orderPrivSubOpenId); // own submission → thấy
    expect(orderIds).not.toContain(orderPrivNoSubOpenId); // A không có sub → IDOR chặn
    expect(orderIds).not.toContain(orderPublicClosedId); // status filter (AC-02)

    const subs = await withAuthorizedDb(admin, vendorAStaff, (tx) =>
      tx.candidateSubmission.findMany({ select: { id: true, vendorId: true } }),
    );
    expect(subs.every((r) => r.vendorId === vAId)).toBe(true);
    expect(subs.some((r) => r.id === subAId)).toBe(true);
    expect(subs.some((r) => r.id === subBId)).toBe(false);

    const stmts = await withAuthorizedDb(admin, vendorAStaff, (tx) =>
      tx.vendorStatement.findMany({ select: { vendorId: true } }),
    );
    expect(stmts.every((r) => r.vendorId === vAId)).toBe(true);
  }, 30_000);

  it('L1: VENDOR_ADMIN vendor B thấy đối xứng — order/submission/statement của B; KHÔNG thấy của A (cách ly hai chiều)', async () => {
    const orderIds = (await withAuthorizedDb(admin, vendorB, (tx) =>
      tx.staffingOrder.findMany({ where: { status: { in: [...OPEN_ORDER_STATUSES] } }, select: { id: true } }),
    )).map((r) => r.id);
    expect(orderIds).toContain(orderPublicOpenId); // public → thấy
    expect(orderIds).toContain(orderPrivNoSubOpenId); // B có submission trên project này → thấy
    expect(orderIds).not.toContain(orderPrivSubOpenId); // project của A → B không có sub → IDOR chặn
    expect(orderIds).not.toContain(orderPublicClosedId); // status filter

    const subs = await withAuthorizedDb(admin, vendorB, (tx) =>
      tx.candidateSubmission.findMany({ select: { id: true, vendorId: true } }),
    );
    expect(subs.every((r) => r.vendorId === vBId)).toBe(true);
    expect(subs.some((r) => r.id === subBId)).toBe(true);
    expect(subs.some((r) => r.id === subAId)).toBe(false);

    const stmts = await withAuthorizedDb(admin, vendorB, (tx) =>
      tx.vendorStatement.findMany({ select: { id: true, vendorId: true } }),
    );
    expect(stmts.every((r) => r.vendorId === vBId)).toBe(true);
    expect(stmts.some((r) => r.id === vsBCrossId)).toBe(true);
  }, 30_000);

  it('L1: vendor context sở hữu rỗng chỉ thấy order public; submission/statement rỗng (empty/invalid-scope actor)', async () => {
    const orderIds = (await withAuthorizedDb(admin, vendorEmpty, (tx) =>
      tx.staffingOrder.findMany({ where: { status: { in: [...OPEN_ORDER_STATUSES] } }, select: { id: true } }),
    )).map((r) => r.id);
    expect(orderIds).toContain(orderPublicOpenId); // public → thấy
    expect(orderIds).not.toContain(orderPrivSubOpenId); // không sub → không thấy
    expect(orderIds).not.toContain(orderPrivNoSubOpenId); // không sub → không thấy

    const subs = await withAuthorizedDb(admin, vendorEmpty, (tx) => tx.candidateSubmission.findMany());
    expect(subs).toHaveLength(0);
    const stmts = await withAuthorizedDb(admin, vendorEmpty, (tx) => tx.vendorStatement.findMany());
    expect(stmts).toHaveLength(0);
  }, 30_000);
  // ── L2 (writer principal): GUC identity + RLS backstop (DEC-09) ──
  it('L2: GUC transaction-local đúng danh tính vendor A (vendor_id, role, worker_id rỗng)', async () => {
    const guc = await withDbContext(writer, vendorA, (tx) => readRlsContext(tx));
    expect(guc.vendor_id).toBe(vAId);
    expect(guc.role).toBe('VENDOR_ADMIN');
    expect(guc.worker_id).toBe('');
    expect(guc.user_id).toBe(vendorA.userId);
  }, 30_000);

  it('L2 RLS backstop: dưới GUC vendor A, plain findMany chỉ trả row vendor A (không lộ vendor B)', async () => {
    const rows = await withDbContext(writer, vendorA, (tx) =>
      tx.vendorStatement.findMany({ select: { id: true, vendorId: true } }),
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.every((r) => r.vendorId === vAId)).toBe(true);
    expect(rows.some((r) => r.id === vsBCrossId)).toBe(false);
  }, 30_000);

  it('L2 RLS backstop: BỎ where.vendorId, dưới GUC vendor A vẫn KHÔNG update được row vendor B (count=0, row nguyên vẹn)', async () => {
    // Mô phỏng L1/where app lỡ rơi vendorId — RLS (hrp_vendor_statement_scope) phải backstop.
    const count = await withDbContext(writer, vendorA, async (tx) => {
      const res = await tx.vendorStatement.updateMany({
        where: { id: vsBCrossId, status: 'SENT' }, // KHÔNG có vendorId
        data: { status: 'CONFIRMED' },
      });
      return res.count;
    });
    expect(count).toBe(0);
    const after = await admin.vendorStatement.findUnique({ where: { id: vsBCrossId }, select: { status: true } });
    expect(after?.status).toBe('SENT'); // vendor B statement không bị chạm
  }, 30_000);

  // ── L2 guarded write (DEC-08) — confirm SENT→CONFIRMED ──
  it('L2 guarded confirm: {id,vendorId,status:SENT} của A → count=1, flip CONFIRMED', async () => {
    const count = await withDbContext(writer, vendorA, async (tx) => {
      const res = await tx.vendorStatement.updateMany({
        where: { id: vsAConfirmId, vendorId: vAId, status: 'SENT' },
        data: { status: 'CONFIRMED' },
      });
      return res.count;
    });
    expect(count).toBe(1);
    const after = await admin.vendorStatement.findUnique({ where: { id: vsAConfirmId }, select: { status: true } });
    expect(after?.status).toBe('CONFIRMED');
  }, 30_000);

  // ── L2 concurrency race (AC-07): hai transaction đồng thời confirm CÙNG statement ──
  it('L2 race: hai confirm đồng thời trên 1 statement SENT → đúng một winner (count=1), một loser (count=0)', async () => {
    const attempt = () =>
      withDbContext(writer, vendorA, async (tx) => {
        const res = await tx.vendorStatement.updateMany({
          where: { id: vsARaceId, vendorId: vAId, status: 'SENT' },
          data: { status: 'CONFIRMED' },
        });
        return res.count;
      });
    const [c1, c2] = await Promise.all([attempt(), attempt()]);
    expect([c1, c2].sort()).toEqual([0, 1]); // guarded write: exactly-once winner
    const after = await admin.vendorStatement.findUnique({ where: { id: vsARaceId }, select: { status: true } });
    expect(after?.status).toBe('CONFIRMED');
  }, 30_000);

  // ── L2 guarded dispute (DEC-08/G17): tối đa 2 vòng, guard disputeCount<2 chặn vòng 3 tại DB ──
  it('L2 guarded dispute: 2 vòng tăng disputeCount 0→1→2; vòng 3 bị guard {lt:2} chặn (count=0)', async () => {
    const disputeOnce = () =>
      withDbContext(writer, vendorA, async (tx) => {
        const res = await tx.vendorStatement.updateMany({
          where: { id: vsADisputeId, vendorId: vAId, status: { in: ['SENT', 'DISPUTED'] }, disputeCount: { lt: 2 } },
          data: { status: 'DISPUTED', disputeCount: { increment: 1 } },
        });
        return res.count;
      });

    expect(await disputeOnce()).toBe(1); // vòng 1: SENT→DISPUTED, count 0→1
    let row = await admin.vendorStatement.findUnique({ where: { id: vsADisputeId }, select: { status: true, disputeCount: true } });
    expect(row).toMatchObject({ status: 'DISPUTED', disputeCount: 1 });

    expect(await disputeOnce()).toBe(1); // vòng 2: DISPUTED→DISPUTED, count 1→2
    row = await admin.vendorStatement.findUnique({ where: { id: vsADisputeId }, select: { status: true, disputeCount: true } });
    expect(row?.disputeCount).toBe(2);

    expect(await disputeOnce()).toBe(0); // vòng 3: guard disputeCount<2 chặn tại DB → không tăng
    row = await admin.vendorStatement.findUnique({ where: { id: vsADisputeId }, select: { status: true, disputeCount: true } });
    expect(row?.disputeCount).toBe(2); // vẫn 2, không vượt max
  }, 30_000);
});
