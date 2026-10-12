/**
 * app/api/projects/[id]/__tests__/route.test.ts — T1A PRE-P2 HOTFIX.
 *
 * Unit test cho PUT / PATCH / DELETE handler của Dự án:
 *   - 401 nếu getAuthContext throw AuthSessionError.
 *   - PUT: role gate; JSON body parse; strict validation reject field ngoài
 *     contract; clientCompanyId lookup; P2025 → 404; success 200.
 *   - PATCH: role gate; status enum gate; state machine + terminal guard
 *     (INVALID_TRANSITION → 400); idempotency key (key khác body → 409
 *     IDEMPOTENCY_CONFLICT); idempotent replay khi cùng key.
 *   - DELETE: chỉ ADMIN; thiếu x-idempotency-key → 400; PROJECT_NOT_DELETABLE
 *     → 409 với guidance "Hoàn thành/Huỷ dự án"; NOT_FOUND → 404; success 200.
 *
 * Mocks: getAuthContext, getPrisma (in-memory stub), withDbContext (passthrough),
 * service layer functions, withIdempotency. Không đụng DB thật.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  class FakeAuthSessionError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'AuthSessionError';
      this.code = code;
    }
  }
  class FakeAuthScopeError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'AuthScopeError';
      this.code = code;
    }
  }
  class FakeIdempotencyConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'IdempotencyConflictError';
    }
  }
  class FakeProjectManagementServiceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'ProjectManagementServiceError';
      this.code = code;
    }
  }
  return {
    getAuthContext: vi.fn(),
    getPrisma: vi.fn(),
    withDbContext: vi.fn(),
    withIdempotency: vi.fn(),
    updateProjectStatus: vi.fn(),
    deleteProject: vi.fn(),
    validateProjectUpdateInput: vi.fn(),
    FakeAuthSessionError,
    FakeAuthScopeError,
    FakeIdempotencyConflictError,
    FakeProjectManagementServiceError,
  };
});

vi.mock('@/src/lib/db', () => ({
  getPrisma: () => mocks.getPrisma(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: mocks.FakeAuthSessionError,
}));

vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (
    _prisma: unknown,
    _ctx: unknown,
    cb: (tx: unknown) => unknown,
  ) => mocks.withDbContext(cb),
}));

vi.mock('@/src/shared/auth/with-auth-scope', () => ({
  AuthScopeError: mocks.FakeAuthScopeError,
}));

vi.mock('@/src/shared/integrity/idempotency', () => ({
  withIdempotency: (opts: unknown) => mocks.withIdempotency(opts),
  IdempotencyConflictError: mocks.FakeIdempotencyConflictError,
}));

vi.mock('@/src/domains/crm/project-management.service', () => ({
  PROJECT_STATUSES: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
  PROJECT_DELETE_ROLES: ['ADMIN'],
  PROJECT_UPDATE_ROLES: ['ADMIN', 'HR_MANAGER', 'PM'],
  updateProjectStatus: mocks.updateProjectStatus,
  deleteProject: mocks.deleteProject,
  validateProjectUpdateInput: mocks.validateProjectUpdateInput,
  ProjectManagementServiceError: mocks.FakeProjectManagementServiceError,
}));

import {
  PUT,
  PATCH,
  DELETE,
} from '@/app/api/projects/[id]/route';
import type { Prisma } from '@prisma/client';

const PROJECT_ID = 'p-1';

function makeReq(
  method: 'PUT' | 'PATCH' | 'DELETE',
  body: unknown,
  opts?: { idemKey?: string },
) {
  const init: {
    method: string;
    headers: Record<string, string>;
    body?: BodyInit | null;
  } = {
    method,
    headers: { 'content-type': 'application/json' },
  };
  if (method !== 'DELETE') {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (typeof body === 'string') {
      init.headers['content-type'] = 'text/plain';
    }
  }
  if (opts?.idemKey) init.headers['x-idempotency-key'] = opts.idemKey;
  return new NextRequest(`http://localhost/api/projects/${PROJECT_ID}`, init);
}

const params = { params: Promise.resolve({ id: PROJECT_ID }) };

describe('PUT /api/projects/[id] — validation + role gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthContext.mockResolvedValue({ userId: 'u-admin', role: 'ADMIN' });
    mocks.getPrisma.mockReturnValue({ __prisma: true });
    mocks.withDbContext.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({ __tx: true }),
    );
    mocks.validateProjectUpdateInput.mockReturnValue({
      ok: true,
      value: { name: 'PRJ-A' },
    });
  });

  it('returns 401 when getAuthContext throws AuthSessionError', async () => {
    mocks.getAuthContext.mockRejectedValueOnce(
      new mocks.FakeAuthSessionError('NO_TOKEN', 'Missing token'),
    );
    const res = await PUT(makeReq('PUT', { name: 'X' }), params);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('NO_TOKEN');
  });

  it.each(['HR_STAFF', 'SALE', 'WORKER', 'VENDOR_ADMIN', 'DIRECTOR', 'ACCOUNTANT'])(
    'PUT: role=%s → 403 FORBIDDEN (chỉ ADMIN/HR_MANAGER/PM)',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: `u-${role}`, role });
      const res = await PUT(makeReq('PUT', { name: 'X' }), params);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('FORBIDDEN');
      expect(body.message).toMatch(new RegExp(role));
      expect(mocks.withDbContext).not.toHaveBeenCalled();
    },
  );

  it.each(['ADMIN', 'HR_MANAGER', 'PM'])('PUT: role=%s gate passes → service validate', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: `u-${role}`, role });
    mocks.withDbContext.mockImplementation(async (cb: (tx: Prisma.TransactionClient) => unknown) => {
      return cb({
        project: {
          update: vi.fn().mockResolvedValue({ id: PROJECT_ID, name: 'PRJ-A' }),
          findUnique: vi.fn().mockResolvedValue({ name: 'Old client' }),
        },
        clientCompany: { findUnique: vi.fn().mockResolvedValue({ name: 'New client' }) },
      } as unknown as Prisma.TransactionClient);
    });
    mocks.validateProjectUpdateInput.mockReturnValue({
      ok: true,
      value: { name: 'PRJ-A', clientCompanyId: 'c-1' },
    });
    const res = await PUT(makeReq('PUT', { name: 'PRJ-A', clientCompanyId: 'c-1' }), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project).toMatchObject({ id: PROJECT_ID });
  });

  it('PUT: body invalid JSON → 400 INVALID_BODY', async () => {
    const res = await PUT(makeReq('PUT', 'not json'), params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_BODY');
  });

  it('PUT: validateProjectUpdateInput returns ok=false → 400 VALIDATION', async () => {
    mocks.validateProjectUpdateInput.mockReturnValueOnce({
      ok: false,
      error: 'Trường không hợp lệ: foo',
    });
    const res = await PUT(makeReq('PUT', { foo: 'bar' }), params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VALIDATION');
    expect(body.message).toMatch(/foo/);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('PUT: project.update throws P2025 → 404 NOT_FOUND', async () => {
    const p2025 = new Error('Record not found');
    (p2025 as Error & { code?: string }).code = 'P2025';
    mocks.withDbContext.mockImplementation(async (cb: (tx: Prisma.TransactionClient) => unknown) => {
      return cb({
        project: { update: vi.fn().mockRejectedValue(p2025) },
        clientCompany: { findUnique: vi.fn().mockResolvedValue(null) },
      } as unknown as Prisma.TransactionClient);
    });
    mocks.validateProjectUpdateInput.mockReturnValue({
      ok: true,
      value: { name: 'X' },
    });
    const res = await PUT(makeReq('PUT', { name: 'X' }), params);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NOT_FOUND');
  });

  it('PUT: clientCompanyId lookup miss → undefined; no crash', async () => {
    mocks.withDbContext.mockImplementation(async (cb: (tx: Prisma.TransactionClient) => unknown) => {
      return cb({
        project: {
          update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: PROJECT_ID, ...data }),
          ),
        },
        clientCompany: { findUnique: vi.fn().mockResolvedValue(null) },
      } as unknown as Prisma.TransactionClient);
    });
    mocks.validateProjectUpdateInput.mockReturnValue({
      ok: true,
      value: { clientCompanyId: 'c-missing' },
    });
    const res = await PUT(makeReq('PUT', { clientCompanyId: 'c-missing' }), params);
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/projects/[id] — state transition + idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthContext.mockResolvedValue({ userId: 'u-admin', role: 'ADMIN' });
    mocks.getPrisma.mockReturnValue({ __prisma: true });
    mocks.withIdempotency.mockImplementation(async (opts: any) => {
      const result = await opts.handler();
      return { body: result.body, statusCode: result.statusCode ?? 200, replayed: false };
    });
    mocks.updateProjectStatus.mockResolvedValue({ id: PROJECT_ID, status: 'ACTIVE' });
  });

  it('returns 401 when no token', async () => {
    mocks.getAuthContext.mockRejectedValueOnce(
      new mocks.FakeAuthSessionError('NO_TOKEN', 'missing'),
    );
    const res = await PATCH(makeReq('PATCH', { status: 'ACTIVE' }), params);
    expect(res.status).toBe(401);
  });

  it.each(['HR_STAFF', 'SALE', 'WORKER', 'VENDOR_ADMIN', 'ACCOUNTANT', 'DIRECTOR'])(
    'PATCH: role=%s → 403',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: `u-${role}`, role });
      const res = await PATCH(makeReq('PATCH', { status: 'ACTIVE' }), params);
      expect(res.status).toBe(403);
      expect(mocks.updateProjectStatus).not.toHaveBeenCalled();
    },
  );

  it('PATCH: body thiếu "status" → 400 VALIDATION', async () => {
    const res = await PATCH(makeReq('PATCH', {}), params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VALIDATION');
    expect(body.message).toMatch(/status/);
  });

  it('PATCH: status ngoài enum → 400 VALIDATION', async () => {
    const res = await PATCH(makeReq('PATCH', { status: 'FROZEN' }), params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/DRAFT.*ACTIVE.*PAUSED.*COMPLETED.*CANCELLED/);
  });

  it('PATCH: body invalid JSON → 400 INVALID_BODY', async () => {
    const res = await PATCH(makeReq('PATCH', '{bad}'), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_BODY');
  });

  it('PATCH: service throw INVALID_TRANSITION → 400', async () => {
    const err = new mocks.FakeProjectManagementServiceError(
      'INVALID_TRANSITION',
      'Không thể chuyển trạng thái dự án từ COMPLETED sang ACTIVE.',
    );
    mocks.updateProjectStatus.mockRejectedValueOnce(err);
    const res = await PATCH(makeReq('PATCH', { status: 'ACTIVE' }), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_TRANSITION');
  });

  it('PATCH: happy path no idem-key runs without withIdempotency wrapper', async () => {
    const res = await PATCH(makeReq('PATCH', { status: 'ACTIVE' }), params);
    expect(res.status).toBe(200);
    expect(mocks.withIdempotency).not.toHaveBeenCalled();
    expect(mocks.updateProjectStatus).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.project).toEqual({ id: PROJECT_ID, status: 'ACTIVE' });
  });

  it('PATCH: with idem-key forwards to withIdempotency with route PATCH:/api/projects/{id}/status', async () => {
    await PATCH(makeReq('PATCH', { status: 'ACTIVE' }, { idemKey: 'k-1' }), params);
    expect(mocks.withIdempotency).toHaveBeenCalledTimes(1);
    const opts = mocks.withIdempotency.mock.calls[0][0];
    expect(opts.route).toBe(`PATCH:/api/projects/${PROJECT_ID}/status`);
    expect(opts.actorId).toBe('u-admin');
    expect(opts.key).toBe('k-1');
    expect(opts.requestBody).toEqual({ status: 'ACTIVE' });
  });

  it('PATCH: idempotency conflict (cùng key, khác body) → 409 IDEMPOTENCY_CONFLICT', async () => {
    const conflict = new Error('key đã được dùng với request body khác');
    (conflict as Error & { name?: string }).name = 'IdempotencyConflictError';
    mocks.withIdempotency.mockRejectedValueOnce(conflict);
    const res = await PATCH(makeReq('PATCH', { status: 'ACTIVE' }, { idemKey: 'k-1' }), params);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('PATCH: replay (replayed=true) trả về body cached', async () => {
    mocks.withIdempotency.mockResolvedValueOnce({
      body: { project: { id: PROJECT_ID, status: 'PAUSED' } },
      statusCode: 200,
      replayed: true,
    });
    const res = await PATCH(makeReq('PATCH', { status: 'PAUSED' }, { idemKey: 'k-2' }), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project.status).toBe('PAUSED');
  });
});

describe('DELETE /api/projects/[id] — ADMIN-only safe delete + idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthContext.mockResolvedValue({ userId: 'u-admin', role: 'ADMIN' });
    mocks.getPrisma.mockReturnValue({ __prisma: true });
    mocks.withIdempotency.mockImplementation(async (opts: any) => {
      const result = await opts.handler();
      return { body: result.body, statusCode: result.statusCode ?? 200, replayed: false };
    });
    mocks.deleteProject.mockResolvedValue({ id: PROJECT_ID, deleted: true });
  });

  it('returns 401 when no token', async () => {
    mocks.getAuthContext.mockRejectedValueOnce(
      new mocks.FakeAuthSessionError('NO_TOKEN', 'missing'),
    );
    const res = await DELETE(makeReq('DELETE', null), params);
    expect(res.status).toBe(401);
  });

  it.each(['HR_MANAGER', 'PM', 'HR_STAFF', 'DIRECTOR', 'SALE', 'WORKER', 'VENDOR_ADMIN', 'ACCOUNTANT'])(
    'DELETE: role=%s → 403 FORBIDDEN (chỉ ADMIN)',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: `u-${role}`, role });
      const res = await DELETE(makeReq('DELETE', null, { idemKey: 'k-1' }), params);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('FORBIDDEN');
      expect(body.message).toMatch(/Quản trị viên/);
      expect(mocks.withIdempotency).not.toHaveBeenCalled();
    },
  );

  it('DELETE: thiếu x-idempotency-key → 400 VALIDATION', async () => {
    const res = await DELETE(makeReq('DELETE', null), params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VALIDATION');
    expect(body.message).toMatch(/x-idempotency-key/);
    expect(mocks.withIdempotency).not.toHaveBeenCalled();
  });

  it('DELETE: service throw PROJECT_NOT_DELETABLE → 409 + guidance "Hoàn thành/Huỷ dự án"', async () => {
    const err = new mocks.FakeProjectManagementServiceError(
      'PROJECT_NOT_DELETABLE',
      'Dự án đã phát sinh nghiệp vụ (2 nhu cầu tuyển dụng). Không thể xoá vĩnh viễn. Hãy dùng "Hoàn thành dự án" hoặc "Huỷ dự án" thay thế để giữ lại lịch sử.',
    );
    mocks.deleteProject.mockRejectedValueOnce(err);
    const res = await DELETE(makeReq('DELETE', null, { idemKey: 'k-1' }), params);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('PROJECT_NOT_DELETABLE');
    expect(body.message).toMatch(/Hoàn thành dự án|Huỷ dự án/);
  });

  it('DELETE: service throw NOT_FOUND → 404', async () => {
    const err = new mocks.FakeProjectManagementServiceError(
      'NOT_FOUND',
      `Không tìm thấy dự án ${PROJECT_ID} hoặc nằm ngoài phạm vi truy cập.`,
    );
    mocks.deleteProject.mockRejectedValueOnce(err);
    const res = await DELETE(makeReq('DELETE', null, { idemKey: 'k-1' }), params);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('NOT_FOUND');
  });

  it('DELETE: happy path ADMIN + idem-key → 200', async () => {
    const res = await DELETE(makeReq('DELETE', null, { idemKey: 'k-1' }), params);
    expect(res.status).toBe(200);
    expect(mocks.withIdempotency).toHaveBeenCalledTimes(1);
    const opts = mocks.withIdempotency.mock.calls[0][0];
    expect(opts.route).toBe(`DELETE:/api/projects/${PROJECT_ID}`);
    expect(opts.actorId).toBe('u-admin');
    expect(opts.key).toBe('k-1');
    expect(opts.requestBody).toEqual({ _delete: true, projectId: PROJECT_ID });
    const body = await res.json();
    expect(body.project).toEqual({ id: PROJECT_ID, deleted: true });
  });

  it('DELETE: idempotency conflict → 409 IDEMPOTENCY_CONFLICT', async () => {
    const conflict = new Error('key đã được dùng với request body khác');
    (conflict as Error & { name?: string }).name = 'IdempotencyConflictError';
    mocks.withIdempotency.mockRejectedValueOnce(conflict);
    const res = await DELETE(makeReq('DELETE', null, { idemKey: 'k-1' }), params);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('DELETE: replay (replayed=true) trả body cached', async () => {
    mocks.withIdempotency.mockResolvedValueOnce({
      body: { project: { id: PROJECT_ID, deleted: true } },
      statusCode: 200,
      replayed: true,
    });
    const res = await DELETE(makeReq('DELETE', null, { idemKey: 'k-1' }), params);
    expect(res.status).toBe(200);
  });
});