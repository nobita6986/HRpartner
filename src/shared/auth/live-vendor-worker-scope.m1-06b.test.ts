/**
 * live-vendor-worker-scope.m1-06b.test.ts — V5-M1-06b / RQ-11 / STEP-07 / AC-03,AC-05,AC-11.
 *
 * LIVE evidence (chạy trong integration lane có DB thật; else ENV_BLOCKED — DEC-14):
 * chứng minh boundary canonical áp CẢ L1 (scope extension) VÀ L2 (RLS GUC transaction-local)
 * cho ba mặt trận của M1-06b — worker self-scope, vendor IDOR, và tiến trình hệ thống.
 *
 *  - Seed/teardown qua DATABASE_URL_ADMIN (role admin — BYPASSRLS, KHÔNG bỏ qua unique).
 *  - Isolation L1 đo trên `admin` principal để LOẠI nhiễu RLS → đo ĐÚNG hành vi L1
 *    (extension inject `where`): WORKER chỉ thấy Ticket/Attendance của mình; VENDOR chỉ
 *    thấy CandidateSubmission/VendorStatement của vendor mình; where thủ công trỏ đối
 *    tượng khác vẫn rỗng (AND self-scope, chống IDOR/enumeration); role ngoài scope → DENY.
 *  - L2 đo trên `writer` principal (RLS-enforcing): đọc lại 4 GUC trong CÙNG tx boundary
 *    (transaction-local) cho WORKER, VENDOR và SYSTEM_CRON.
 *  - Dedup OPAQUE (DEC-05): repo đặc quyền `SYSTEM_DEDUP` thấy worker trùng SĐT trên toàn
 *    bộ, trong khi VENDOR (L1 buildWorkerScope) KHÔNG thấy row worker đó → xác nhận outcome
 *    chỉ được lộ dưới dạng opaque, không rò định danh worker cho vendor.
 *
 * Anonymous=401 / wrong-role=403 ở tầng HTTP do middleware + route đảm nhiệm và đã được
 * unit test (worker-portal / vendors-master / vendor-submissions / cron-routes .route.test.ts);
 * file LIVE này chứng minh tầng DB-boundary (L1+L2) mà unit không thể.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { withAuthorizedDb } from './with-authorized-db';
import { AuthScopeError } from './with-auth-scope';
import { readRlsContext } from './rls-context';
import { withSystemDb, SYSTEM_CRON } from './with-system-db';
import { probeWorkerDuplicateByPhone } from '@/src/shared/vendor/worker-dedup.repository';
import type { AuthContext } from './auth-context';

const ADMIN_URL = process.env.DATABASE_URL_ADMIN;
const WRITER_URL = process.env.DATABASE_URL;
const enabled = Boolean(process.env.M1_06B_LIVE_AUTH_SCOPE && ADMIN_URL && WRITER_URL);

describe.skipIf(!enabled)('V5-M1-06b LIVE — worker/vendor scope (L1) + RLS context (L2)', () => {
  const admin = new PrismaClient({ datasourceUrl: ADMIN_URL });
  const writer = new PrismaClient({ datasourceUrl: WRITER_URL });

  const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const stamp = Number(String(Date.now()).slice(-9));
  const phoneA = `0${String(stamp).padStart(9, '0')}`;
  const phoneB = `0${String(stamp + 1).padStart(9, '0')}`;

  // Workers (workerId = Worker.id là khoá self-scope cho Ticket/AttendanceEvent).
  const wAId = `m106b-wa-${RUN}`;
  const wBId = `m106b-wb-${RUN}`;
  const workerA: AuthContext = { userId: `m106b-login-a-${RUN}`, role: 'WORKER', workerId: wAId };

  // Vendors.
  const vAId = `m106b-va-${RUN}`;
  const vBId = `m106b-vb-${RUN}`;
  const vendorA: AuthContext = { userId: `m106b-vu-a-${RUN}`, role: 'VENDOR_ADMIN', vendorId: vAId };

  let tAId = '';
  let tBId = '';
  let aAId = '';
  let aBId = '';
  let sAId = '';
  let sBId = '';
  let vsAId = '';
  let vsBId = '';

  beforeAll(async () => {
    await Promise.all([admin.$connect(), writer.$connect()]);

    // ── Workers ────────────────────────────────────────────────────────────
    // workerA ACTIVE + có SĐT → cũng là mục tiêu dedup opaque (vendor KHÔNG thấy row này).
    await admin.worker.create({
      data: { id: wAId, userId: `usr-${wAId}`, fullName: 'M106B Worker A', phone: phoneA, employmentStatus: 'ACTIVE' },
    });
    await admin.worker.create({
      data: { id: wBId, userId: `usr-${wBId}`, fullName: 'M106B Worker B', phone: phoneB, employmentStatus: 'NONE' },
    });

    // ── Tickets (FK workerId → workers.id) ───────────────────────────────────
    const tA = await admin.ticket.create({
      data: {
        type: 'OTHER', workerId: wAId, createdByActorId: workerA.userId, createdByRole: 'WORKER',
        title: 'A ticket', description: 'self-scope A',
      },
    });
    const tB = await admin.ticket.create({
      data: {
        type: 'OTHER', workerId: wBId, createdByActorId: `login-b-${RUN}`, createdByRole: 'WORKER',
        title: 'B ticket', description: 'self-scope B',
      },
    });
    tAId = tA.id;
    tBId = tB.id;

    // ── AttendanceEvent (workerId scalar; unique [source, externalEventId]) ───
    const aA = await admin.attendanceEvent.create({
      data: {
        externalEventId: `evt-a-${RUN}`, source: 'GPS', workerId: wAId,
        workDate: new Date('2026-08-25T00:00:00.000Z'), payloadHash: `h-a-${RUN}`,
      },
    });
    const aB = await admin.attendanceEvent.create({
      data: {
        externalEventId: `evt-b-${RUN}`, source: 'GPS', workerId: wBId,
        workDate: new Date('2026-08-25T00:00:00.000Z'), payloadHash: `h-b-${RUN}`,
      },
    });
    aAId = aA.id;
    aBId = aB.id;

    // ── Vendors + submissions + statements ───────────────────────────────────
    await admin.vendor.create({ data: { id: vAId, code: `M106B-VA-${RUN}`, name: 'Vendor A' } });
    await admin.vendor.create({ data: { id: vBId, code: `M106B-VB-${RUN}`, name: 'Vendor B' } });

    const sA = await admin.candidateSubmission.create({
      data: { vendorId: vAId, fullName: 'Cand A', phone: phoneA, status: 'NEW' },
    });
    const sB = await admin.candidateSubmission.create({
      data: { vendorId: vBId, fullName: 'Cand B', phone: phoneB, status: 'NEW' },
    });
    sAId = sA.id;
    sBId = sB.id;

    const vsA = await admin.vendorStatement.create({
      data: { vendorId: vAId, periodMonth: 6, periodYear: 2026, version: 1 },
    });
    const vsB = await admin.vendorStatement.create({
      data: { vendorId: vBId, periodMonth: 6, periodYear: 2026, version: 1 },
    });
    vsAId = vsA.id;
    vsBId = vsB.id;
  }, 60_000);

  afterAll(async () => {
    try {
      await admin.ticket.deleteMany({ where: { id: { in: [tAId, tBId] } } });
      await admin.attendanceEvent.deleteMany({ where: { id: { in: [aAId, aBId] } } });
      await admin.candidateSubmission.deleteMany({ where: { id: { in: [sAId, sBId] } } });
      await admin.vendorStatement.deleteMany({ where: { id: { in: [vsAId, vsBId] } } });
      await admin.worker.deleteMany({ where: { id: { in: [wAId, wBId] } } });
      await admin.vendor.deleteMany({ where: { id: { in: [vAId, vBId] } } });
    } finally {
      await Promise.all([admin.$disconnect(), writer.$disconnect()]);
    }
  });

  // ── L1: WORKER self-scope (Ticket + AttendanceEvent) ───────────────────────
  it('L1: WORKER chỉ đọc Ticket của mình (inject { workerId: ctx.workerId }); không thấy của worker khác', async () => {
    const rows = await withAuthorizedDb(admin, workerA, (tx) =>
      tx.ticket.findMany({ select: { id: true, workerId: true } }),
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.every((r) => r.workerId === wAId)).toBe(true);
    expect(rows.some((r) => r.id === tAId)).toBe(true);
    expect(rows.some((r) => r.id === tBId)).toBe(false);
  }, 30_000);

  it('L1: WORKER where thủ công { workerId: <worker khác> } vẫn rỗng (AND self-scope, chống IDOR)', async () => {
    const rows = await withAuthorizedDb(admin, workerA, (tx) =>
      tx.ticket.findMany({ where: { workerId: wBId } }),
    );
    expect(rows).toHaveLength(0);
  }, 30_000);

  it('L1: WORKER chỉ đọc AttendanceEvent của mình; không thấy của worker khác', async () => {
    const rows = await withAuthorizedDb(admin, workerA, (tx) =>
      tx.attendanceEvent.findMany({ select: { id: true, workerId: true } }),
    );
    expect(rows.every((r) => r.workerId === wAId)).toBe(true);
    expect(rows.some((r) => r.id === aAId)).toBe(true);
    expect(rows.some((r) => r.id === aBId)).toBe(false);
  }, 30_000);

  // ── L1: VENDOR IDOR (CandidateSubmission + VendorStatement) ────────────────
  it('L1: VENDOR chỉ đọc CandidateSubmission của vendor mình; where trỏ vendor khác vẫn rỗng', async () => {
    const own = await withAuthorizedDb(admin, vendorA, (tx) =>
      tx.candidateSubmission.findMany({ select: { id: true, vendorId: true } }),
    );
    expect(own.every((r) => r.vendorId === vAId)).toBe(true);
    expect(own.some((r) => r.id === sAId)).toBe(true);
    expect(own.some((r) => r.id === sBId)).toBe(false);

    const cross = await withAuthorizedDb(admin, vendorA, (tx) =>
      tx.candidateSubmission.findMany({ where: { vendorId: vBId } }),
    );
    expect(cross).toHaveLength(0);
  }, 30_000);

  it('L1: VENDOR chỉ đọc VendorStatement của vendor mình; không thấy statement vendor khác', async () => {
    const own = await withAuthorizedDb(admin, vendorA, (tx) =>
      tx.vendorStatement.findMany({ select: { id: true, vendorId: true } }),
    );
    expect(own.every((r) => r.vendorId === vAId)).toBe(true);
    expect(own.some((r) => r.id === vsAId)).toBe(true);
    expect(own.some((r) => r.id === vsBId)).toBe(false);
  }, 30_000);

  // ── L1: role ngoài scope → DENY_BY_DEFAULT (fail-closed) ───────────────────
  it('L1: role ngoài scope → DENY_BY_DEFAULT trên Ticket/Attendance/CandidateSubmission/VendorStatement', async () => {
    const employee: AuthContext = { userId: `m106b-emp-${RUN}`, role: 'EMPLOYEE' };
    const sale: AuthContext = { userId: `m106b-sale-${RUN}`, role: 'SALE' };
    await expect(withAuthorizedDb(admin, employee, (tx) => tx.ticket.findMany({}))).rejects.toBeInstanceOf(AuthScopeError);
    await expect(withAuthorizedDb(admin, sale, (tx) => tx.attendanceEvent.findMany({}))).rejects.toBeInstanceOf(AuthScopeError);
    await expect(withAuthorizedDb(admin, employee, (tx) => tx.candidateSubmission.findMany({}))).rejects.toBeInstanceOf(AuthScopeError);
    await expect(withAuthorizedDb(admin, sale, (tx) => tx.vendorStatement.findMany({}))).rejects.toBeInstanceOf(AuthScopeError);
  }, 30_000);

  // ── L2: GUC transaction-local đúng ctx (writer principal) ──────────────────
  it('L2: WORKER → 4 GUC set đúng (worker_id = ctx.workerId, role = WORKER, vendor_id rỗng)', async () => {
    const guc = await withAuthorizedDb(writer, workerA, (tx) => readRlsContext(tx));
    expect(guc.worker_id).toBe(wAId);
    expect(guc.role).toBe('WORKER');
    expect(guc.vendor_id).toBe('');
    expect(guc.user_id).toBe(workerA.userId);
  }, 30_000);

  it('L2: VENDOR → GUC vendor_id = ctx.vendorId, role = VENDOR_ADMIN, worker_id rỗng', async () => {
    const guc = await withAuthorizedDb(writer, vendorA, (tx) => readRlsContext(tx));
    expect(guc.vendor_id).toBe(vAId);
    expect(guc.role).toBe('VENDOR_ADMIN');
    expect(guc.worker_id).toBe('');
  }, 30_000);

  it('L2: SYSTEM_CRON → GUC danh tính hệ thống cố định (user_id = system:cron, role = ADMIN)', async () => {
    const guc = await withSystemDb(writer, SYSTEM_CRON, (tx) => readRlsContext(tx));
    expect(guc.user_id).toBe('system:cron');
    expect(guc.role).toBe('ADMIN');
  }, 30_000);

  // ── Dedup OPAQUE (DEC-05): elevated repo thấy, VENDOR không thấy row worker ─
  it('DEC-05: SYSTEM_DEDUP phát hiện worker ACTIVE trùng SĐT, nhưng VENDOR không thấy row worker', async () => {
    // Repo đặc quyền: thấy được worker trùng (server-side, opaque).
    const dedup = await probeWorkerDuplicateByPhone(writer, phoneA);
    expect(dedup.duplicate).toBe(true);
    expect(dedup.activeConflict).toBe(true);
    expect(dedup.workerId).toBe(wAId);

    // VENDOR (L1 buildWorkerScope) KHÔNG thấy worker vì không có sourceClaim accepted →
    // định danh worker không bao giờ lộ cho vendor qua boundary thường.
    const vendorView = await withAuthorizedDb(admin, vendorA, (tx) =>
      tx.worker.findMany({ where: { phone: phoneA }, select: { id: true } }),
    );
    expect(vendorView).toHaveLength(0);
  }, 30_000);
});
