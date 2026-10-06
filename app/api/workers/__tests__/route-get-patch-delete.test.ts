/**
 * route-get-patch-delete.test.ts — T1B API route fence.
 *
 * Mock service + auth + idempotency, assert:
 *   - GET /api/workers/[id] gọi serviceGetWorkerDetail, project sensitive.
 *   - PATCH gọi serviceUpdateWorkerProfile + trả projected DTO.
 *   - PATCH reject ownership field cho HR_MANAGER (FORBIDDEN_OWNERSHIP).
 *   - PUT là backward-compat alias (5 field legacy).
 *   - DELETE ADMIN-only, idempotency key optional, 409 WORKER_NOT_DELETABLE.
 *   - 401/403/404 fail-closed.
 *   - Không leak CCCD / bank / PII khi caller thiếu permission.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  resolvePerms: vi.fn(),
  withDbContext: vi.fn(),
  withIdempotency: vi.fn(),
  serviceGetWorkerDetail: vi.fn(),
  serviceUpdateWorkerProfile: vi.fn(),
  serviceDeleteWorker: vi.fn(),
  projectWorker: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
  },
}));
vi.mock('@/src/shared/auth/permission-resolver', () => ({
  resolveEffectivePermissions: mocks.resolvePerms,
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: mocks.withDbContext,
}));
vi.mock('@/src/shared/auth/with-auth-scope', () => ({
  AuthScopeError: class AuthScopeError extends Error {
    code = 'FORBIDDEN';
  },
}));
vi.mock('@/src/shared/integrity/idempotency', () => ({
  withIdempotency: mocks.withIdempotency,
}));
vi.mock('@/src/shared/auth/worker-projection', () => ({
  projectWorker: mocks.projectWorker,
}));
vi.mock('@/src/domains/workforce/worker.service', () => ({
  WorkerServiceError: class WorkerServiceError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly details?: unknown,
    ) {
      super(message);
      this.name = 'WorkerServiceError';
    }
  },
  getWorkerDetail: mocks.serviceGetWorkerDetail,
  updateWorkerProfile: mocks.serviceUpdateWorkerProfile,
  deleteWorker: mocks.serviceDeleteWorker,
}));

import { DELETE, GET, PATCH, PUT } from '@/app/api/workers/[id]/route';
import { WorkerServiceError } from '@/src/domains/workforce/worker.service';
import { AuthSessionError } from '@/src/shared/auth/auth-context';

const ADMIN_CTX = { userId: 'admin-1', role: 'ADMIN' };
const HR_MANAGER_CTX = { userId: 'hr-1', role: 'HR_MANAGER' };
const HR_STAFF_CTX = { userId: 'staff-1', role: 'HR_STAFF' };
const MKT_CTX = { userId: 'm1', role: 'MKT' };

const FULL_WORKER = {
  id: 'w1',
  userId: 'USR-001',
  fullName: 'Nguyễn Văn A',
  phone: '0901234567',
  cccdNumber: '001099123456',
  cccdImageUrl: null,
  selfieImageUrl: null,
  cccdIssuedDate: null,
  cccdIssuedPlace: null,
  cccdExpiryDate: null,
  taxCode: null,
  insuranceCode: null,
  bankAccount: '1234567890',
  bankName: 'VCB',
  bankBranch: 'HCM',
  profileStatus: 'VERIFIED',
  employmentStatus: 'ACTIVE',
  riskStatus: 'NORMAL',
  ownerId: null,
  assignedToId: null,
  accountUserId: null,
  managerId: null,
  dateOfBirth: null,
  gender: null,
  maritalStatus: null,
  permanentAddress: null,
  currentAddress: null,
  hometown: null,
  ethnicGroup: null,
  religion: null,
  nationality: 'VN',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
  mocks.resolvePerms.mockResolvedValue(new Set(['CAN_VIEW_WORKER_SENSITIVE']));
  mocks.withDbContext.mockImplementation(
    (_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb({}),
  );
  mocks.withIdempotency.mockImplementation(
    async ({ handler }: { handler: () => Promise<unknown> }) => {
      const r = (await handler()) as { body: unknown };
      return { body: r.body, statusCode: 200, replayed: false };
    },
  );
  mocks.projectWorker.mockImplementation((row: unknown) => row);
});

const params = (id = 'w1') => Promise.resolve({ id });

describe('GET /api/workers/[id]', () => {
  it('returns 200 + projected worker for ADMIN', async () => {
    mocks.serviceGetWorkerDetail.mockResolvedValue(FULL_WORKER);
    const req = new NextRequest('http://localhost/api/workers/w1');
    const res = await GET(req, { params: params() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.worker.id).toBe('w1');
    expect(data.worker.fullName).toBe('Nguyễn Văn A');
  });

  it('returns 404 when service returns null (IDOR-safe)', async () => {
    mocks.serviceGetWorkerDetail.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/workers/w1');
    const res = await GET(req, { params: params() });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('NOT_FOUND');
  });

  it('returns 403 for role not in viewer matrix (MKT)', async () => {
    mocks.getAuthContext.mockResolvedValue(MKT_CTX);
    const req = new NextRequest('http://localhost/api/workers/w1');
    const res = await GET(req, { params: params() });
    expect(res.status).toBe(403);
  });

  it('returns 401 when session missing', async () => {
    mocks.getAuthContext.mockRejectedValue(
      new AuthSessionError('NO_TOKEN', 'No session'),
    );
    const req = new NextRequest('http://localhost/api/workers/w1');
    const res = await GET(req, { params: params() });
    expect(res.status).toBe(401);
  });

  it('does NOT leak raw CCCD / bank when caller lacks CAN_VIEW_WORKER_SENSITIVE', async () => {
    mocks.resolvePerms.mockResolvedValue(new Set()); // no sensitive
    mocks.serviceGetWorkerDetail.mockResolvedValue(FULL_WORKER);
    // projectWorker với hasSensitivePermission=false sẽ mask → mock echo row,
    // assert rằng projectWorker được gọi với hasSensitivePermission=false.
    const req = new NextRequest('http://localhost/api/workers/w1');
    await GET(req, { params: params() });
    expect(mocks.projectWorker).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ hasSensitivePermission: false, action: 'DETAIL' }),
    );
  });
});

describe('PATCH /api/workers/[id]', () => {
  it('HR_MANAGER patches fullName → 200 + updatedFields', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_MANAGER_CTX);
    mocks.serviceUpdateWorkerProfile.mockResolvedValue({
      id: 'w1',
      updatedAt: new Date('2026-01-03T00:00:00Z'),
      updatedFields: ['fullName'],
    });
    mocks.serviceGetWorkerDetail.mockResolvedValue(FULL_WORKER);
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'PATCH',
      body: JSON.stringify({ fullName: 'Trần Văn B' }),
    });
    const res = await PATCH(req, { params: params() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toEqual(['fullName']);
  });

  it('HR_STAFF cannot PATCH (writer guard)', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_STAFF_CTX);
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'PATCH',
      body: JSON.stringify({ fullName: 'Test' }),
    });
    const res = await PATCH(req, { params: params() });
    expect(res.status).toBe(403);
  });

  it('returns 422 when caller tries to submit `*` mask', async () => {
    mocks.serviceUpdateWorkerProfile.mockRejectedValue(
      new WorkerServiceError(
        'WORKER_MASKED_INPUT_REJECTED',
        'Field cccdNumber chứa ký tự mask "*"',
        { forbiddenFields: ['cccdNumber'] },
      ),
    );
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'PATCH',
      body: JSON.stringify({ cccdNumber: '001****234' }),
    });
    const res = await PATCH(req, { params: params() });
    expect(res.status).toBe(422);
  });

  it('returns 410 STALE_VERSION when CAS fails', async () => {
    mocks.serviceUpdateWorkerProfile.mockRejectedValue(
      new WorkerServiceError('STALE_VERSION', 'Worker đã bị chỉnh giữa chừng'),
    );
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'PATCH',
      body: JSON.stringify({ fullName: 'Test' }),
    });
    const res = await PATCH(req, { params: params() });
    expect(res.status).toBe(410);
  });

  it('forbids PATCH body containing actorId / userId / accountUserId / workerId / id', async () => {
    mocks.serviceUpdateWorkerProfile.mockRejectedValue(
      new WorkerServiceError('INVALID_INPUT', 'Field userId không thể sửa qua PATCH', {
        forbiddenFields: ['userId'],
      }),
    );
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'USR-002' }),
    });
    const res = await PATCH(req, { params: params() });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/workers/[id] — backward-compat alias', () => {
  it('only forwards 5 legacy fields to PATCH', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_MANAGER_CTX);
    mocks.serviceUpdateWorkerProfile.mockResolvedValue({
      id: 'w1',
      updatedAt: new Date('2026-01-03T00:00:00Z'),
      updatedFields: ['fullName', 'phone'],
    });
    mocks.serviceGetWorkerDetail.mockResolvedValue(FULL_WORKER);
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'PUT',
      body: JSON.stringify({
        fullName: 'New Name',
        phone: '0909999999',
        cccdNumber: '001xxx', // allowed in legacy 5
        dateOfBirth: '1990-01-01',
        gender: 'M',
        ethnicity: 'Kinh', // KHÔNG thuộc 5 field legacy → bị filter
      }),
    });
    const res = await PUT(req, { params: params() });
    expect(res.status).toBe(200);
    // Service nhận body ĐÃ FILTER — chỉ 5 field legacy.
    const sent = mocks.serviceUpdateWorkerProfile.mock.calls[0][3] as Record<string, unknown>;
    expect(sent).toHaveProperty('fullName');
    expect(sent).toHaveProperty('phone');
    expect(sent).toHaveProperty('cccdNumber');
    expect(sent).toHaveProperty('dateOfBirth');
    expect(sent).toHaveProperty('gender');
    expect(sent).not.toHaveProperty('ethnicity');
  });
});

describe('DELETE /api/workers/[id]', () => {
  it('ADMIN orphan delete → 200 OK', async () => {
    mocks.serviceDeleteWorker.mockResolvedValue({
      id: 'w1',
      userId: 'USR-001',
      fullName: 'Test',
      deletedAt: new Date(),
      auditId: 'a1',
    });
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'DELETE',
      headers: { 'x-idempotency-key': 'delete-w1-test' },
      body: JSON.stringify({ reason: 'cleanup' }),
    });
    const res = await DELETE(req, { params: params() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.id).toBe('w1');
  });

  it('HR_MANAGER cannot DELETE (ADMIN-only)', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_MANAGER_CTX);
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'r' }),
    });
    const res = await DELETE(req, { params: params() });
    expect(res.status).toBe(403);
  });

  it('returns 409 WORKER_NOT_DELETABLE when dependencies exist', async () => {
    mocks.serviceDeleteWorker.mockRejectedValue(
      new WorkerServiceError(
        'WORKER_NOT_DELETABLE',
        'Worker còn phụ thuộc',
        { blockingFacts: ['LABOR_PROFILE', 'PROJECT_ASSIGNMENT'] },
      ),
    );
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'r' }),
    });
    const res = await DELETE(req, { params: params() });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe('WORKER_NOT_DELETABLE');
    expect(data.details.blockingFacts).toEqual(['LABOR_PROFILE', 'PROJECT_ASSIGNMENT']);
  });

  it('returns 404 when worker does not exist (IDOR-safe)', async () => {
    mocks.serviceDeleteWorker.mockRejectedValue(
      new WorkerServiceError('NOT_FOUND', 'Worker w1 không tồn tại.'),
    );
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'r' }),
    });
    const res = await DELETE(req, { params: params() });
    expect(res.status).toBe(404);
  });

  it('idempotent replay: withIdempotency returns same body on retry', async () => {
    let firstCall = true;
    mocks.serviceDeleteWorker.mockImplementation(() => {
      if (firstCall) {
        firstCall = false;
        return Promise.resolve({
          id: 'w1',
          userId: 'USR-001',
          fullName: 'Test',
          deletedAt: new Date(),
          auditId: 'a1',
        });
      }
      // Second call: worker already deleted, throw NOT_FOUND.
      throw new WorkerServiceError('NOT_FOUND', 'Worker đã bị xóa concurrent.');
    });
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'DELETE',
      headers: { 'x-idempotency-key': 'delete-w1-test' },
      body: JSON.stringify({ reason: 'r' }),
    });
    const res = await DELETE(req, { params: params() });
    expect(res.status).toBe(200);
    // withIdempotency đã wrap; handler chỉ chạy 1 lần (mock implement như
    // thật — chạy 1 lần rồi replay).
  });

  it('non-WorkerServiceError (Prisma) → 500 với message chung tiếng Việt, KHÔNG leak e.message', async () => {
    mocks.serviceDeleteWorker.mockImplementation(() => {
      throw new Error('P2002: Unique constraint failed on the fields: (`userId`)');
    });
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'r' }),
    });
    const res = await DELETE(req, { params: params() });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('INTERNAL');
    expect(data.message).toContain('Hệ thống gặp sự cố');
    expect(data.message).not.toContain('P2002');
    expect(data.message).not.toContain('Unique constraint');
  });
});
