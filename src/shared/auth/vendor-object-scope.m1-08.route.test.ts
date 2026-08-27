/**
 * vendor-object-scope.m1-08.route.test.ts — V5-M1-08 STEP-01/05/06 (RQ-01/02/05/06/07).
 *
 * UNIT (no DB): focused route×method×role×context matrix + guarded-write race sim cho
 * vendor object scope / IDOR hardening. Bổ sung (không thay) các suite M1-06b hiện có.
 * Chứng minh tại L1 route boundary — L2 writer RLS chứng minh ở LIVE suite
 * `live-vendor-idor.m1-08.test.ts` (AC-08, DEC-09).
 *
 * AC map:
 *   - AC-01: mỗi route/method có allowed/denied role + missing-context; denial TRƯỚC business DB.
 *   - AC-02: order list chỉ OPEN/CLOSING_SOON (không còn literal 'ACTIVE').
 *   - AC-05: chỉ VENDOR_ADMIN confirm/dispute; STAFF 403 trước DB; guarded 404/409.
 *   - AC-06: vendor role 403 zero-call ở generic /api/statements + /api/disputes; internal allowed xanh.
 *   - AC-07: hai attempt tuần tự trên 1 statement → tối đa một winner, một audit.
 *
 * Guarded write không lộ cross-vendor: 404 (như absent). Race: winner count=1, loser count=0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withAuthorizedDbReadOnly: vi.fn(),
  withDbContext: vi.fn(),
  withIdempotency: vi.fn(),
  probeWorkerDuplicateByPhone: vi.fn(),
  // generic dispute.service delegates
  sendStatement: vi.fn(),
  disputeStatement: vi.fn(),
  confirmStatement: vi.fn(),
  lockStatement: vi.fn(),
  forceLockStatement: vi.fn(),
  // tx sub-op mocks (shared fake tx across both boundaries)
  orderFindMany: vi.fn(),
  orderFindFirst: vi.fn(),
  submissionFindMany: vi.fn(),
  submissionCreate: vi.fn(),
  vendorStmtFindMany: vi.fn(),
  vendorStmtFindFirst: vi.fn(),
  vendorStmtUpdateMany: vi.fn(),
  vendorStmtCount: vi.fn(),
  clientStmtFindMany: vi.fn(),
  clientStmtCount: vi.fn(),
  auditCreate: vi.fn(),
}));

// ── One shared fake tx exposing every op any in-scope route may touch ──────────
function fakeTx() {
  return {
    staffingOrder: { findMany: mocks.orderFindMany, findFirst: mocks.orderFindFirst },
    candidateSubmission: { findMany: mocks.submissionFindMany, create: mocks.submissionCreate },
    vendorStatement: {
      findMany: mocks.vendorStmtFindMany,
      findFirst: mocks.vendorStmtFindFirst,
      updateMany: mocks.vendorStmtUpdateMany,
      count: mocks.vendorStmtCount,
    },
    clientStatement: { findMany: mocks.clientStmtFindMany, count: mocks.clientStmtCount },
    auditLog: { create: mocks.auditCreate },
  };
}

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
  },
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDbReadOnly: mocks.withAuthorizedDbReadOnly,
  withAuthorizedDb: mocks.withAuthorizedDbReadOnly,
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));
vi.mock('@/src/shared/integrity/idempotency', () => ({ withIdempotency: mocks.withIdempotency }));
vi.mock('@/src/shared/vendor/worker-dedup.repository', () => ({
  probeWorkerDuplicateByPhone: mocks.probeWorkerDuplicateByPhone,
}));
vi.mock('@/src/domains/reconciliation/dispute.service', () => ({
  sendStatement: mocks.sendStatement,
  disputeStatement: mocks.disputeStatement,
  confirmStatement: mocks.confirmStatement,
  lockStatement: mocks.lockStatement,
  forceLockStatement: mocks.forceLockStatement,
  DisputeServiceError: class DisputeServiceError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'DisputeServiceError';
    }
  },
}));

// NOTE: @/src/domains/staffing/types (OPEN_ORDER_STATUSES / isOpenOrderStatus) is left REAL
// so AC-02's "no ACTIVE" assertion runs against the canonical constant, not a mock.

import { GET as ordersGET } from '@/app/api/vendor/orders/route';
import { GET as vsubGET, POST as vsubPOST } from '@/app/api/vendor/submissions/route';
import { GET as vstmtGET } from '@/app/api/vendor/statements/route';
import { GET as vexportGET } from '@/app/api/vendor/statements/[id]/export/route';
import { POST as vconfirmPOST } from '@/app/api/vendor/statements/[id]/confirm/route';
import { POST as vdisputePOST } from '@/app/api/vendor/statements/[id]/dispute/route';
import { GET as genStmtGET } from '@/app/api/statements/route';
import { POST as genDisputePOST } from '@/app/api/disputes/route';
import { AuthSessionError } from '@/src/shared/auth/auth-context';

// ── Request + ctx helpers ──────────────────────────────────────────────────────
const A_ADMIN = { userId: 'ua-A', role: 'VENDOR_ADMIN', vendorId: 'vendor-A' };
const A_STAFF = { userId: 'us-A', role: 'VENDOR_STAFF', vendorId: 'vendor-A' };
const ACCOUNTANT = { userId: 'acc-1', role: 'ACCOUNTANT' };
const DIRECTOR = { userId: 'dir-1', role: 'DIRECTOR' };
const ADMIN = { userId: 'adm-1', role: 'ADMIN' };

const getReq = (url: string) => new NextRequest(`http://localhost${url}`);
const jsonReq = (url: string, body: unknown, headers?: Record<string, string>) =>
  new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(headers ?? {}) },
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

// PLACEHOLDER_TESTS
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAuthContext.mockResolvedValue(A_ADMIN);
  mocks.withAuthorizedDbReadOnly.mockImplementation(
    async (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) => cb(fakeTx()),
  );
  mocks.withDbContext.mockImplementation(
    async (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) => cb(fakeTx()),
  );
  mocks.withIdempotency.mockImplementation(
    async ({ handler }: { handler: () => Promise<unknown> }) => handler(),
  );
  mocks.probeWorkerDuplicateByPhone.mockResolvedValue({ duplicate: false, activeConflict: false, workerId: null });
  mocks.orderFindMany.mockResolvedValue([]);
  mocks.orderFindFirst.mockResolvedValue({ id: 'order-1', projectId: 'proj-1', status: 'OPEN' });
  mocks.submissionFindMany.mockResolvedValue([]);
  mocks.submissionCreate.mockResolvedValue({ id: 'sub-1' });
  mocks.vendorStmtFindMany.mockResolvedValue([]);
  mocks.vendorStmtFindFirst.mockResolvedValue(null);
  mocks.vendorStmtUpdateMany.mockResolvedValue({ count: 0 });
  mocks.vendorStmtCount.mockResolvedValue(0);
  mocks.clientStmtFindMany.mockResolvedValue([]);
  mocks.clientStmtCount.mockResolvedValue(0);
  mocks.auditCreate.mockResolvedValue({ id: 'audit-1' });
  mocks.sendStatement.mockResolvedValue({ ok: true });
  mocks.disputeStatement.mockResolvedValue({ ok: true });
  mocks.confirmStatement.mockResolvedValue({ ok: true });
  mocks.lockStatement.mockResolvedValue({ ok: true });
  mocks.forceLockStatement.mockResolvedValue({ ok: true });
});

// ═══ AC-01 + AC-02 — GET /api/vendor/orders ════════════════════════════════════
describe('GET /api/vendor/orders — role/context matrix + canonical open status (AC-01/02)', () => {
  it('unauth → 401, zero query', async () => {
    mocks.getAuthContext.mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'x'));
    const res = await ordersGET(getReq('/api/vendor/orders'));
    expect(res.status).toBe(401);
    expect(mocks.withAuthorizedDbReadOnly).not.toHaveBeenCalled();
  });

  it('non-vendor role (ACCOUNTANT) → 403, zero query', async () => {
    mocks.getAuthContext.mockResolvedValue(ACCOUNTANT);
    const res = await ordersGET(getReq('/api/vendor/orders'));
    expect(res.status).toBe(403);
    expect(mocks.withAuthorizedDbReadOnly).not.toHaveBeenCalled();
  });

  it('VENDOR_ADMIN thiếu vendorId → 403 NO_VENDOR_CONTEXT, zero query', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'x', role: 'VENDOR_ADMIN' });
    const res = await ordersGET(getReq('/api/vendor/orders'));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'NO_VENDOR_CONTEXT' });
    expect(mocks.withAuthorizedDbReadOnly).not.toHaveBeenCalled();
  });

  it('VENDOR_ADMIN → 200; query dùng OPEN_ORDER_STATUSES, KHÔNG chứa ACTIVE/CLOSED/CANCELLED', async () => {
    const res = await ordersGET(getReq('/api/vendor/orders'));
    expect(res.status).toBe(200);
    const where = mocks.orderFindMany.mock.calls[0][0].where;
    expect(where.status.in).toEqual(['OPEN', 'CLOSING_SOON']);
    expect(where.status.in).not.toContain('ACTIVE');
    expect(where.status.in).not.toContain('CLOSED');
    expect(where.status.in).not.toContain('CANCELLED');
  });

  it('VENDOR_STAFF cũng được list order → 200 (DEC-05 operational read)', async () => {
    mocks.getAuthContext.mockResolvedValue(A_STAFF);
    const res = await ordersGET(getReq('/api/vendor/orders'));
    expect(res.status).toBe(200);
    expect(mocks.orderFindMany).toHaveBeenCalledTimes(1);
  });
});

// PLACEHOLDER_TESTS_2
// ═══ AC-01 + AC-03 — /api/vendor/submissions (role split: STAFF may create) ═════
describe('POST /api/vendor/submissions — VENDOR_STAFF operational create (AC-01/03, DEC-05)', () => {
  const VALID = { orderId: 'order-1', fullName: 'Nguyen Van A', phone: '0900000000' };

  it('VENDOR_STAFF create own submission → 200; owner server-derived (vendor-A)', async () => {
    mocks.getAuthContext.mockResolvedValue(A_STAFF);
    const res = await vsubPOST(jsonReq('/api/vendor/submissions', VALID));
    expect(res.status).toBe(200);
    expect(mocks.submissionCreate).toHaveBeenCalledTimes(1);
    expect(mocks.submissionCreate.mock.calls[0][0].data.vendorId).toBe('vendor-A');
  });

  it('non-vendor role → 403, KHÔNG probe/create', async () => {
    mocks.getAuthContext.mockResolvedValue(ACCOUNTANT);
    const res = await vsubPOST(jsonReq('/api/vendor/submissions', VALID));
    expect(res.status).toBe(403);
    expect(mocks.probeWorkerDuplicateByPhone).not.toHaveBeenCalled();
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it('GET VENDOR_STAFF list own submissions → 200 (scope vendor-A)', async () => {
    mocks.getAuthContext.mockResolvedValue(A_STAFF);
    const res = await vsubGET(getReq('/api/vendor/submissions'));
    expect(res.status).toBe(200);
    expect(mocks.submissionFindMany.mock.calls[0][0]).toMatchObject({ where: { vendorId: 'vendor-A' } });
  });
});

// ═══ AC-04 — GET /api/vendor/statements + export (own-scope read) ═══════════════
describe('GET /api/vendor/statements(+export) — own-scope read (AC-04)', () => {
  it('list: non-vendor → 403 zero query', async () => {
    mocks.getAuthContext.mockResolvedValue(ACCOUNTANT);
    const res = await vstmtGET(getReq('/api/vendor/statements'));
    expect(res.status).toBe(403);
    expect(mocks.withAuthorizedDbReadOnly).not.toHaveBeenCalled();
  });

  it('list: VENDOR_ADMIN → 200; findMany scoped to own vendorId', async () => {
    const res = await vstmtGET(getReq('/api/vendor/statements'));
    expect(res.status).toBe(200);
    expect(mocks.vendorStmtFindMany.mock.calls[0][0]).toMatchObject({ where: { vendorId: 'vendor-A' } });
  });

  it('export: scoped findFirst → null (cross-vendor/absent) → 404, không lộ khác absent', async () => {
    mocks.vendorStmtFindFirst.mockResolvedValue(null); // withAuthorizedDbReadOnly used, but export calls findFirst on tx
    // export route reads via tx.vendorStatement.findFirst({ where:{id}, include:{lines} })
    mocks.withAuthorizedDbReadOnly.mockImplementationOnce(
      async (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) =>
        cb({ vendorStatement: { findFirst: () => Promise.resolve(null) } }),
    );
    const res = await vexportGET(getReq('/api/vendor/statements/stmt-B/export'), params('stmt-B'));
    expect(res.status).toBe(404);
  });

  it('export: VENDOR_STAFF own statement → 200 CSV (read/export allowed)', async () => {
    mocks.getAuthContext.mockResolvedValue(A_STAFF);
    mocks.withAuthorizedDbReadOnly.mockImplementationOnce(
      async (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) =>
        cb({
          vendorStatement: {
            findFirst: () =>
              Promise.resolve({
                id: 'stmt-A', periodMonth: 8, periodYear: 2026, status: 'SENT',
                totalAmount: 1000n, lines: [],
              }),
          },
        }),
    );
    const res = await vexportGET(getReq('/api/vendor/statements/stmt-A/export'), params('stmt-A'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
  });
});

// PLACEHOLDER_TESTS_3
// ═══ AC-05 + AC-07 — POST /api/vendor/statements/[id]/confirm ═══════════════════
describe('POST vendor confirm — VENDOR_ADMIN-only + guarded write (AC-05/07)', () => {
  it('unauth → 401, zero DB', async () => {
    mocks.getAuthContext.mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'x'));
    const res = await vconfirmPOST(jsonReq('/api/vendor/statements/s1/confirm', {}), params('s1'));
    expect(res.status).toBe(401);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('VENDOR_STAFF → 403 TRƯỚC DB (withDbContext không gọi)', async () => {
    mocks.getAuthContext.mockResolvedValue(A_STAFF);
    const res = await vconfirmPOST(jsonReq('/api/vendor/statements/s1/confirm', {}), params('s1'));
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
    expect(mocks.vendorStmtUpdateMany).not.toHaveBeenCalled();
  });

  it('internal role (ACCOUNTANT) → 403 TRƯỚC DB', async () => {
    mocks.getAuthContext.mockResolvedValue(ACCOUNTANT);
    const res = await vconfirmPOST(jsonReq('/api/vendor/statements/s1/confirm', {}), params('s1'));
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('VENDOR_ADMIN thiếu vendorId → 403, zero DB', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'x', role: 'VENDOR_ADMIN' });
    const res = await vconfirmPOST(jsonReq('/api/vendor/statements/s1/confirm', {}), params('s1'));
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('winner: updateMany count=1 → 200 CONFIRMED; guard where = {id,vendorId,status:SENT}', async () => {
    mocks.vendorStmtUpdateMany.mockResolvedValue({ count: 1 });
    const res = await vconfirmPOST(jsonReq('/api/vendor/statements/stmt-A/confirm', {}), params('stmt-A'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, status: 'CONFIRMED' });
    expect(mocks.vendorStmtUpdateMany.mock.calls[0][0].where).toMatchObject({ id: 'stmt-A', vendorId: 'vendor-A', status: 'SENT' });
  });

  it('cross-vendor/absent: count=0 + findFirst null → 404 (indistinguishable)', async () => {
    mocks.vendorStmtUpdateMany.mockResolvedValue({ count: 0 });
    mocks.vendorStmtFindFirst.mockResolvedValue(null);
    const res = await vconfirmPOST(jsonReq('/api/vendor/statements/stmt-B/confirm', {}), params('stmt-B'));
    expect(res.status).toBe(404);
  });

  it('wrong state: count=0 + findFirst {CONFIRMED} → 409 INVALID_STATE', async () => {
    mocks.vendorStmtUpdateMany.mockResolvedValue({ count: 0 });
    mocks.vendorStmtFindFirst.mockResolvedValue({ status: 'CONFIRMED' });
    const res = await vconfirmPOST(jsonReq('/api/vendor/statements/stmt-A/confirm', {}), params('stmt-A'));
    expect(res.status).toBe(409);
  });

  it('RACE (AC-07): 2 attempt tuần tự → đúng một 200, một 409, không double-flip', async () => {
    mocks.vendorStmtUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    mocks.vendorStmtFindFirst.mockResolvedValue({ status: 'CONFIRMED' }); // loser classifies
    const r1 = await vconfirmPOST(jsonReq('/api/vendor/statements/stmt-A/confirm', {}), params('stmt-A'));
    const r2 = await vconfirmPOST(jsonReq('/api/vendor/statements/stmt-A/confirm', {}), params('stmt-A'));
    const codes = [r1.status, r2.status].sort();
    expect(codes).toEqual([200, 409]);
    expect(mocks.vendorStmtUpdateMany).toHaveBeenCalledTimes(2);
  });
});

// PLACEHOLDER_TESTS_4
// ═══ AC-05 + AC-07 — POST /api/vendor/statements/[id]/dispute ═══════════════════
describe('POST vendor dispute — VENDOR_ADMIN-only + guarded write + exactly-once audit (AC-05/07)', () => {
  const R = { reason: 'So gio sai' };

  it('VENDOR_STAFF → 403 TRƯỚC body parse/DB', async () => {
    mocks.getAuthContext.mockResolvedValue(A_STAFF);
    const res = await vdisputePOST(jsonReq('/api/vendor/statements/s1/dispute', R), params('s1'));
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it('reason rỗng → 400 VALIDATION_ERROR, zero DB', async () => {
    const res = await vdisputePOST(jsonReq('/api/vendor/statements/s1/dispute', { reason: '' }), params('s1'));
    expect(res.status).toBe(400);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('winner vòng 1: count=1 → 200 DISPUTED; guard count<2; audit đúng một lần', async () => {
    mocks.vendorStmtFindFirst
      .mockResolvedValueOnce({ id: 'stmt-A', status: 'SENT', disputeCount: 0 }) // initial precheck
      .mockResolvedValueOnce({ disputeCount: 1 }); // read-back
    mocks.vendorStmtUpdateMany.mockResolvedValue({ count: 1 });
    const res = await vdisputePOST(jsonReq('/api/vendor/statements/stmt-A/dispute', R), params('stmt-A'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, status: 'DISPUTED', disputeCount: 1 });
    expect(mocks.vendorStmtUpdateMany.mock.calls[0][0].where.disputeCount).toEqual({ lt: 2 });
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });

  it('cross-vendor/absent: findFirst null (precheck) → 404; updateMany & audit KHÔNG chạy', async () => {
    mocks.vendorStmtFindFirst.mockResolvedValueOnce(null);
    const res = await vdisputePOST(jsonReq('/api/vendor/statements/stmt-B/dispute', R), params('stmt-B'));
    expect(res.status).toBe(404);
    expect(mocks.vendorStmtUpdateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it('loser count=0 + disputeCount>=2 → 409 MAX_DISPUTES; audit KHÔNG chạy', async () => {
    mocks.vendorStmtFindFirst
      .mockResolvedValueOnce({ id: 'stmt-A', status: 'DISPUTED', disputeCount: 1 }) // precheck passes (<2)
      .mockResolvedValueOnce({ disputeCount: 2 }); // classify after lost write
    mocks.vendorStmtUpdateMany.mockResolvedValue({ count: 0 });
    const res = await vdisputePOST(jsonReq('/api/vendor/statements/stmt-A/dispute', R), params('stmt-A'));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'MAX_DISPUTES' });
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it('loser count=0 + wrong state → 409 INVALID_STATE; audit KHÔNG chạy', async () => {
    mocks.vendorStmtFindFirst
      .mockResolvedValueOnce({ id: 'stmt-A', status: 'SENT', disputeCount: 0 })
      .mockResolvedValueOnce({ status: 'CONFIRMED', disputeCount: 0 });
    mocks.vendorStmtUpdateMany.mockResolvedValue({ count: 0 });
    const res = await vdisputePOST(jsonReq('/api/vendor/statements/stmt-A/dispute', R), params('stmt-A'));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'INVALID_STATE' });
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it('RACE vòng cuối (AC-07): winner 200 + audit×1, loser 409 MAX_DISPUTES + audit×0', async () => {
    mocks.vendorStmtFindFirst
      .mockResolvedValueOnce({ id: 'stmt-A', status: 'SENT', disputeCount: 1 }) // A precheck
      .mockResolvedValueOnce({ disputeCount: 2 }) // A read-back
      .mockResolvedValueOnce({ id: 'stmt-A', status: 'DISPUTED', disputeCount: 1 }) // B precheck (stale)
      .mockResolvedValueOnce({ disputeCount: 2 }); // B classify
    mocks.vendorStmtUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const r1 = await vdisputePOST(jsonReq('/api/vendor/statements/stmt-A/dispute', R), params('stmt-A'));
    const r2 = await vdisputePOST(jsonReq('/api/vendor/statements/stmt-A/dispute', R), params('stmt-A'));
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1); // exactly-once
  });
});

// PLACEHOLDER_TESTS_5
// ═══ AC-06 — generic /api/statements (list) surface closure ═════════════════════
describe('GET /api/statements — generic surface: vendor role 403 zero-call, internal xanh (AC-06)', () => {
  it('VENDOR_ADMIN → 403 TRƯỚC DB (withDbContext KHÔNG chạy)', async () => {
    mocks.getAuthContext.mockResolvedValue(A_ADMIN);
    const res = await genStmtGET(getReq('/api/statements'));
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('VENDOR_STAFF → 403 TRƯỚC DB', async () => {
    mocks.getAuthContext.mockResolvedValue(A_STAFF);
    const res = await genStmtGET(getReq('/api/statements'));
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('DIRECTOR (read-only nội bộ) → 200', async () => {
    mocks.getAuthContext.mockResolvedValue(DIRECTOR);
    const res = await genStmtGET(getReq('/api/statements'));
    expect(res.status).toBe(200);
    expect(mocks.withDbContext).toHaveBeenCalled();
  });

  it('ACCOUNTANT → 200', async () => {
    mocks.getAuthContext.mockResolvedValue(ACCOUNTANT);
    const res = await genStmtGET(getReq('/api/statements'));
    expect(res.status).toBe(200);
  });
});

// ═══ AC-06 — generic /api/disputes (mutation) surface closure ═══════════════════
describe('POST /api/disputes — generic surface: vendor & DIRECTOR 403 zero-delegate, internal delegate (AC-06)', () => {
  const send = { action: 'SEND', statementId: 's1', statementKind: 'VENDOR' };

  it('VENDOR_ADMIN → 403 zero-delegate (withDbContext + service KHÔNG chạy)', async () => {
    mocks.getAuthContext.mockResolvedValue(A_ADMIN);
    const res = await genDisputePOST(jsonReq('/api/disputes', send));
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
    expect(mocks.sendStatement).not.toHaveBeenCalled();
  });

  it('VENDOR_STAFF → 403 zero-delegate', async () => {
    mocks.getAuthContext.mockResolvedValue(A_STAFF);
    const res = await genDisputePOST(jsonReq('/api/disputes', send));
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('DIRECTOR (read-only, KHÔNG trên mutation) → 403 zero-delegate', async () => {
    mocks.getAuthContext.mockResolvedValue(DIRECTOR);
    const res = await genDisputePOST(jsonReq('/api/disputes', send));
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
    expect(mocks.sendStatement).not.toHaveBeenCalled();
  });

  it('ACCOUNTANT SEND → 200, delegate sendStatement', async () => {
    mocks.getAuthContext.mockResolvedValue(ACCOUNTANT);
    const res = await genDisputePOST(jsonReq('/api/disputes', send));
    expect(res.status).toBe(200);
    expect(mocks.sendStatement).toHaveBeenCalledTimes(1);
  });

  it('ADMIN FORCE_LOCK → delegate forceLockStatement một lần (gate CAN_FORCE_LOCK_STATEMENT ở service, chứng minh tại reconciliation-unit.test.ts)', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN);
    const res = await genDisputePOST(
      jsonReq('/api/disputes', { action: 'FORCE_LOCK', statementId: 's1', statementKind: 'VENDOR' }),
    );
    expect(res.status).toBe(200);
    expect(mocks.forceLockStatement).toHaveBeenCalledTimes(1);
  });
});
