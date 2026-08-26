/**
 * vendor-submissions.route.test.ts — V5-M1-06b / RQ-05,RQ-06 / STEP-04 / AC-05,AC-06 / DEC-05,DEC-06.
 *
 * UNIT (no DB): hợp đồng OPAQUE của vendor submissions — luôn chạy dù thiếu test DB
 * (LIVE two-vendor để integration lane):
 *   - GET: response KHÔNG BAO GIỜ lộ `dedupWorkerId` (DEC-05) dù row DB có field đó.
 *   - GET/POST: role gate (chỉ VENDOR_*) + bắt buộc `ctx.vendorId`.
 *   - POST activeConflict → 409 WORKER_ACTIVE, body KHÔNG chứa workerId/tên/CCCD, và
 *     KHÔNG tạo submission (withDbContext không create).
 *   - POST owner (vendorId/projectId) derive server-side; body client KHÔNG override.
 *   - POST re-check order: null→404 ORDER_NOT_FOUND, CLOSED/CANCELLED→409 ORDER_NOT_OPEN
 *     (StaffingOrder.status enum = OPEN|CLOSING_SOON|CLOSED|CANCELLED — không có 'ACTIVE').
 *   - POST success → `{ ok, id, duplicate }` (không dedupHint/workerId), và create nhận
 *     `dedupWorkerId` server-side (linkage HR queue, không trả ra ngoài).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  probeWorkerDuplicateByPhone: vi.fn(),
  submissionFindMany: vi.fn(),
  orderFindFirst: vi.fn(),
  submissionCreate: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({ getAuthContext: mocks.getAuthContext }));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/vendor/worker-dedup.repository', () => ({
  probeWorkerDuplicateByPhone: mocks.probeWorkerDuplicateByPhone,
}));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDbReadOnly: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) =>
    cb({ candidateSubmission: { findMany: mocks.submissionFindMany } }),
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) =>
    cb({
      staffingOrder: { findFirst: mocks.orderFindFirst },
      candidateSubmission: { create: mocks.submissionCreate },
    }),
}));

import { GET, POST } from '@/app/api/vendor/submissions/route';

const getReq = () => new NextRequest('http://localhost/api/vendor/submissions');
const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/vendor/submissions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

const VENDOR_CTX = { userId: 'vu-1', role: 'VENDOR_ADMIN', vendorId: 'vendor-A' };
const VALID = { orderId: 'order-1', fullName: 'Nguyen Van A', phone: '0900000000' };

describe('vendor/submissions — OPAQUE dedup + scope (DEC-05/06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthContext.mockResolvedValue(VENDOR_CTX);
    mocks.probeWorkerDuplicateByPhone.mockResolvedValue({ duplicate: false, activeConflict: false, workerId: null });
    mocks.orderFindFirst.mockResolvedValue({ id: 'order-1', projectId: 'proj-1', status: 'OPEN' });
    mocks.submissionCreate.mockResolvedValue({ id: 'sub-1' });
    mocks.submissionFindMany.mockResolvedValue([]);
  });

  // ── GET ───────────────────────────────────────────────────────────────────
  it('GET: role không phải VENDOR → 403, KHÔNG query', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'SALE' });
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    expect(mocks.submissionFindMany).not.toHaveBeenCalled();
  });

  it('GET: VENDOR nhưng thiếu vendorId → 403', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'VENDOR_ADMIN' });
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'NO_VENDOR_CONTEXT' });
  });

  it('GET: response KHÔNG lộ dedupWorkerId dù row DB có (DEC-05)', async () => {
    mocks.submissionFindMany.mockResolvedValue([
      {
        id: 's1',
        project: { id: 'p1', name: 'Proj 1' },
        fullName: 'A',
        phone: '0900000000',
        cccdNumber: null,
        status: 'NEW',
        blockCode: null,
        overrideCase: null,
        dedupWorkerId: 'worker-SECRET-999', // server-side linkage — PHẢI bị drop
        createdAt: new Date('2026-08-25T00:00:00.000Z'),
      },
    ]);
    const res = await GET(getReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).not.toHaveProperty('dedupWorkerId');
    // Không lộ định danh worker ở bất kỳ đâu trong payload.
    expect(JSON.stringify(body)).not.toContain('worker-SECRET-999');
    // Vendor tự query đúng vendorId của mình.
    expect(mocks.submissionFindMany.mock.calls[0][0]).toMatchObject({ where: { vendorId: 'vendor-A' } });
  });

  // ── POST ──────────────────────────────────────────────────────────────────
  it('POST: role không phải VENDOR → 403, KHÔNG probe/không create', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'SALE' });
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(403);
    expect(mocks.probeWorkerDuplicateByPhone).not.toHaveBeenCalled();
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it('POST: body sai schema (phone) → 400, KHÔNG probe', async () => {
    const res = await POST(postReq({ ...VALID, phone: 'abc' }));
    expect(res.status).toBe(400);
    expect(mocks.probeWorkerDuplicateByPhone).not.toHaveBeenCalled();
  });

  it('POST: worker ACTIVE trùng SĐT → 409 WORKER_ACTIVE, KHÔNG lộ PII, KHÔNG create', async () => {
    mocks.probeWorkerDuplicateByPhone.mockResolvedValue({
      duplicate: true,
      activeConflict: true,
      workerId: 'worker-SECRET-1',
    });
    const res = await POST(postReq(VALID));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe('WORKER_ACTIVE');
    // Opaque: không workerId, không tên/CCCD/employmentStatus rò rỉ.
    expect(JSON.stringify(body)).not.toContain('worker-SECRET-1');
    expect(body).not.toHaveProperty('workerId');
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it('POST: order không tồn tại / ngoài tầm nhìn → 404 ORDER_NOT_FOUND', async () => {
    mocks.orderFindFirst.mockResolvedValue(null);
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: 'ORDER_NOT_FOUND' });
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it('POST: order CLOSED → 409 ORDER_NOT_OPEN', async () => {
    mocks.orderFindFirst.mockResolvedValue({ id: 'order-1', projectId: 'proj-1', status: 'CLOSED' });
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'ORDER_NOT_OPEN' });
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it('POST: order CANCELLED → 409 ORDER_NOT_OPEN', async () => {
    mocks.orderFindFirst.mockResolvedValue({ id: 'order-1', projectId: 'proj-1', status: 'CANCELLED' });
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'ORDER_NOT_OPEN' });
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it('POST: order CLOSING_SOON vẫn nhận ứng viên → 200 (đồng bộ job-board visible)', async () => {
    mocks.orderFindFirst.mockResolvedValue({ id: 'order-1', projectId: 'proj-1', status: 'CLOSING_SOON' });
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(200);
    expect(mocks.submissionCreate).toHaveBeenCalledTimes(1);
  });

  it('POST success: owner derive server-side; response chỉ {ok,id,duplicate}; dedupWorkerId lưu server-side', async () => {
    mocks.probeWorkerDuplicateByPhone.mockResolvedValue({ duplicate: true, activeConflict: false, workerId: 'worker-INACTIVE-7' });
    // Client cố override owner — PHẢI bị bỏ qua.
    const res = await POST(postReq({ ...VALID, vendorId: 'vendor-EVIL', projectId: 'proj-EVIL' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, id: 'sub-1', duplicate: true });
    // Không rò dedupWorkerId/dedupHint/tên ra response.
    expect(JSON.stringify(body)).not.toContain('worker-INACTIVE-7');
    expect(body).not.toHaveProperty('dedupHint');
    // create nhận owner từ ctx (vendor-A), project từ order (proj-1) — KHÔNG từ body.
    const createData = mocks.submissionCreate.mock.calls[0][0].data;
    expect(createData.vendorId).toBe('vendor-A');
    expect(createData.projectId).toBe('proj-1');
    expect(createData.status).toBe('NEW');
    // Linkage server-side cho HR queue được lưu (nhưng không trả ra ngoài).
    expect(createData.dedupWorkerId).toBe('worker-INACTIVE-7');
  });
});
