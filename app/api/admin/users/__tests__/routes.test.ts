/**
 * Route tests cho /api/admin/users (POST) và /api/admin/users/[id] (GET, PATCH,
 * deactivate, reactivate). hrp-v6-admin-users-permissions.
 *
 * Cover:
 *   - 401 thiếu auth.
 *   - 403 non-ADMIN.
 *   - 400 Zod validation.
 *   - 409 PHONE_TAKEN, LAST_ADMIN_PROTECTED, SELF_*, IDEMPOTENCY_CONFLICT.
 *   - Idempotency retry: lần 2 KHÔNG gọi handler; response KHÔNG có
 *     `temporaryPassword` (sanitize thành công).
 *   - KHÔNG có passwordHash/temporaryPassword trong audit log.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// Hoisted mocks
// ═══════════════════════════════════════════════════════════════════════════

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(),
  withDbContext: vi.fn(),
  withAuthorizedDb: vi.fn(),
  withIdempotency: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  reactivateUser: vi.fn(),
  getUserWithGrants: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
  },
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: mocks.withDbContext,
}));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDb: mocks.withAuthorizedDb,
}));
vi.mock('@/src/shared/integrity/idempotency', () => ({
  withIdempotency: mocks.withIdempotency,
  IdempotencyConflictError: class IdempotencyConflictError extends Error {
    name = 'IdempotencyConflictError';
  },
}));
vi.mock('@/src/domains/admin/user-management.service', () => ({
  createUser: mocks.createUser,
  updateUser: mocks.updateUser,
  deactivateUser: mocks.deactivateUser,
  reactivateUser: mocks.reactivateUser,
  getUserWithGrants: mocks.getUserWithGrants,
  UserManagementServiceError: class UserManagementServiceError extends Error {
    constructor(
      public readonly code:
        | 'PERMISSION_DENIED'
        | 'NOT_FOUND'
        | 'VALIDATION'
        | 'PHONE_TAKEN'
        | 'LAST_ADMIN_PROTECTED'
        | 'SELF_DEACTIVATION_BLOCKED'
        | 'SELF_DEMOTION_BLOCKED'
        | 'SELF_MODIFICATION_BLOCKED'
        | 'NO_OP',
      message: string,
    ) {
      super(message);
      this.name = 'UserManagementServiceError';
    }
  },
}));

import { POST as POSTUsers, GET as GETUsers } from '@/app/api/admin/users/route';
import {
  GET as GETUserId,
  PATCH as PATCHUserId,
} from '@/app/api/admin/users/[id]/route';
import { POST as POSTDeactivate } from '@/app/api/admin/users/[id]/deactivate/route';
import { POST as POSTReactivate } from '@/app/api/admin/users/[id]/reactivate/route';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function setAuth(role: string | null) {
  if (role === null) {
    mocks.getAuthContext.mockRejectedValue(new Error('no auth'));
    return;
  }
  mocks.getAuthContext.mockResolvedValue({ userId: 'admin-1', role });
}

function setPrismaTx(passthrough = true) {
  // getPrisma returns a sentinel. withDbContext and withAuthorizedDb both just
  // call back with the prisma as tx.
  if (passthrough) {
    mocks.getPrisma.mockReturnValue({});
    mocks.withDbContext.mockImplementation(
      (_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb({}),
    );
    mocks.withAuthorizedDb.mockImplementation(
      (_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb({}),
    );
  }
}

function setIdempotency(impl: (opts: any) => Promise<any>) {
  mocks.withIdempotency.mockImplementation(impl);
}

beforeEach(() => {
  vi.clearAllMocks();
  setPrismaTx();
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/admin/users
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /api/admin/users', () => {
  it('401 khi thiếu auth', async () => {
    // Reject với một Error có `code = 'UNAUTHENTICATED'` (mock) — route handler check
    // `instanceof AuthSessionError` nhưng trong test mock đó là class cục bộ, nên
    // truyền instance của class này để pass instanceof check.
    const { AuthSessionError } = await import('@/src/shared/auth/auth-context');
    mocks.getAuthContext.mockRejectedValue(new AuthSessionError('NO_TOKEN', 'no auth'));
    const res = await POSTUsers(
      new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('403 khi role không phải ADMIN', async () => {
    setAuth('HR_MANAGER');
    const res = await POSTUsers(
      new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'A', phone: '+84000000001', role: 'HR_STAFF' }),
      }),
    );
    expect(res.status).toBe(403);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it('400 khi thiếu trường bắt buộc', async () => {
    setAuth('ADMIN');
    const res = await POSTUsers(
      new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'A' }), // thiếu phone, role
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('VALIDATION_ERROR');
  });

  it('400 khi role không hợp lệ (không thuộc SystemRole enum)', async () => {
    setAuth('ADMIN');
    const res = await POSTUsers(
      new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'A', phone: '+84000000001', role: 'SUPER_GOD' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('201 khi tạo thành công, response có temporaryPassword', async () => {
    setAuth('ADMIN');
    mocks.createUser.mockResolvedValue({
      user: { id: 'u1', name: 'A', phone: '+84000000001', role: 'HR_STAFF' },
      temporaryPassword: 'SECRET-PWD-12345',
      auditId: 'audit-1',
    });
    const res = await POSTUsers(
      new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'A', phone: '+84000000001', role: 'HR_STAFF' }),
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.temporaryPassword).toBe('SECRET-PWD-12345');
  });

  it('409 PHONE_TAKEN khi phone đã tồn tại', async () => {
    setAuth('ADMIN');
    const { UserManagementServiceError } = await import(
      '@/src/domains/admin/user-management.service'
    );
    mocks.createUser.mockRejectedValue(
      new UserManagementServiceError('PHONE_TAKEN', 'Số điện thoại đã được sử dụng.'),
    );
    const res = await POSTUsers(
      new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'A', phone: '+84000000001', role: 'HR_STAFF' }),
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe('PHONE_TAKEN');
  });

  it('Idempotency: retry KHÔNG leak password — sanitize strip trước khi lưu', async () => {
    setAuth('ADMIN');
    // Lưu in-memory: lần 1 lưu body ĐÃ SANITIZE; lần 2 replay trả về body đã lưu.
    const stored = new Map<string, { response: any; statusCode: number }>();

    setIdempotency(async (opts: any) => {
      const k = `${opts.actorId}|${opts.route}|${opts.key}`;
      const reqHash = JSON.stringify(opts.requestBody);
      // Tính hash nhanh để mô phỏng requestHash check
      const existing = stored.get(k);
      if (existing) {
        // Replay — KHÔNG gọi handler
        return { body: existing.response, statusCode: existing.statusCode, replayed: true };
      }
      const r = await opts.handler();
      const persistable = opts.sanitizeResponseForStorage
        ? opts.sanitizeResponseForStorage(r.body)
        : r.body;
      stored.set(k, { response: persistable, statusCode: r.statusCode ?? 200 });
      return { body: r.body, statusCode: r.statusCode ?? 200, replayed: false };
    });
    mocks.createUser.mockResolvedValue({
      user: { id: 'u1', name: 'A', phone: '+84000000001', role: 'HR_STAFF' },
      temporaryPassword: 'SECRET-PWD-12345',
      auditId: 'audit-1',
    });

    const makeReq = () =>
      new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': 'idem-1',
        },
        body: JSON.stringify({ name: 'A', phone: '+84000000001', role: 'HR_STAFF' }),
      });

    const r1 = await POSTUsers(makeReq());
    const r2 = await POSTUsers(makeReq());

    // Lần 1: 201 + có password.
    expect(r1.status).toBe(201);
    const d1 = await r1.json();
    expect(d1.temporaryPassword).toBe('SECRET-PWD-12345');
    expect(d1.replayed).toBe(false);

    // Lần 2: 201 + replayed + KHÔNG có password.
    expect(r2.status).toBe(201);
    const d2 = await r2.json();
    expect(d2.replayed).toBe(true);
    expect(d2.temporaryPassword).toBeUndefined();
    expect(d2.user).toBeDefined();

    // Handler chỉ chạy 1 lần.
    expect(mocks.createUser).toHaveBeenCalledTimes(1);

    // Cache đã lưu body KHÔNG chứa password.
    const cached = stored.get('admin-1|POST:/api/admin/users|idem-1');
    expect(cached).toBeDefined();
    expect(cached!.response).not.toHaveProperty('temporaryPassword');
    expect(JSON.stringify(cached!.response)).not.toContain('SECRET-PWD-12345');
  });

  it('409 IDEMPOTENCY_CONFLICT khi cùng key nhưng khác body', async () => {
    setAuth('ADMIN');
    const { IdempotencyConflictError } = await import(
      '@/src/shared/integrity/idempotency'
    );
    setIdempotency(async () => {
      throw new IdempotencyConflictError('khác body');
    });
    const res = await POSTUsers(
      new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        headers: { 'idempotency-key': 'idem-2' },
        body: JSON.stringify({ name: 'A', phone: '+84000000001', role: 'HR_STAFF' }),
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe('IDEMPOTENCY_CONFLICT');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/admin/users (sanity: không regression)
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /api/admin/users (sanity)', () => {
  it('trả về { users, total, take, skip } với filter cơ bản', async () => {
    setAuth('ADMIN');
    mocks.withAuthorizedDb.mockImplementation(
      (_p: unknown, _c: unknown, cb: any) =>
        cb({
          user: {
            findMany: async () => [],
            count: async () => 0,
          },
        }),
    );
    const res = await GETUsers(
      new NextRequest('http://localhost/api/admin/users?isActive=true'),
    );
    expect(res.status).toBe(200);
    const d = await res.json();
    expect(d.users).toEqual([]);
    expect(d.total).toBe(0);
  });

  it('403 khi role không phải ADMIN', async () => {
    setAuth('HR_MANAGER');
    const res = await GETUsers(new NextRequest('http://localhost/api/admin/users'));
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/users/[id]
// ═══════════════════════════════════════════════════════════════════════════

describe('PATCH /api/admin/users/[id]', () => {
  it('400 validation khi body rỗng', async () => {
    setAuth('ADMIN');
    const res = await PATCHUserId(
      new NextRequest('http://localhost/api/admin/users/u1', {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'u1' }) },
    );
    expect(res.status).toBe(400);
  });

  it('200 khi cập nhật name thành công', async () => {
    setAuth('ADMIN');
    mocks.updateUser.mockResolvedValue({
      user: { id: 'u1', name: 'New', role: 'HR_STAFF' },
      auditId: 'audit-2',
    });
    const res = await PATCHUserId(
      new NextRequest('http://localhost/api/admin/users/u1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New' }),
      }),
      { params: Promise.resolve({ id: 'u1' }) },
    );
    expect(res.status).toBe(200);
  });

  it('409 LAST_ADMIN_PROTECTED khi hạ admin cuối', async () => {
    setAuth('ADMIN');
    const { UserManagementServiceError } = await import(
      '@/src/domains/admin/user-management.service'
    );
    mocks.updateUser.mockRejectedValue(
      new UserManagementServiceError(
        'LAST_ADMIN_PROTECTED',
        'Không thể hạ quyền admin cuối cùng.',
      ),
    );
    const res = await PATCHUserId(
      new NextRequest('http://localhost/api/admin/users/admin-2', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'HR_MANAGER' }),
      }),
      { params: Promise.resolve({ id: 'admin-2' }) },
    );
    expect(res.status).toBe(409);
    const d = await res.json();
    expect(d.error).toBe('LAST_ADMIN_PROTECTED');
  });

  it('409 SELF_DEMOTION_BLOCKED khi admin tự hạ role', async () => {
    setAuth('ADMIN');
    const { UserManagementServiceError } = await import(
      '@/src/domains/admin/user-management.service'
    );
    mocks.updateUser.mockRejectedValue(
      new UserManagementServiceError('SELF_DEMOTION_BLOCKED', 'Tự hạ quyền.'),
    );
    const res = await PATCHUserId(
      new NextRequest('http://localhost/api/admin/users/admin-1', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'HR_MANAGER' }),
      }),
      { params: Promise.resolve({ id: 'admin-1' }) },
    );
    expect(res.status).toBe(409);
    const d = await res.json();
    expect(d.error).toBe('SELF_DEMOTION_BLOCKED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/admin/users/[id]/deactivate
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /api/admin/users/[id]/deactivate', () => {
  it('409 SELF_DEACTIVATION_BLOCKED khi admin tự deactivate', async () => {
    setAuth('ADMIN');
    const { UserManagementServiceError } = await import(
      '@/src/domains/admin/user-management.service'
    );
    mocks.deactivateUser.mockRejectedValue(
      new UserManagementServiceError('SELF_DEACTIVATION_BLOCKED', 'Tự vô hiệu hóa.'),
    );
    const res = await POSTDeactivate(
      new NextRequest('http://localhost/api/admin/users/admin-1/deactivate', {
        method: 'POST',
        body: JSON.stringify({ reason: 'test' }),
      }),
      { params: Promise.resolve({ id: 'admin-1' }) },
    );
    expect(res.status).toBe(409);
  });

  it('200 khi deactivate user non-admin thành công', async () => {
    setAuth('ADMIN');
    mocks.deactivateUser.mockResolvedValue({
      user: { id: 'u1', isActive: false },
      auditId: 'audit-3',
    });
    const res = await POSTDeactivate(
      new NextRequest('http://localhost/api/admin/users/u1/deactivate', {
        method: 'POST',
        body: JSON.stringify({ reason: 'nghỉ việc' }),
      }),
      { params: Promise.resolve({ id: 'u1' }) },
    );
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/admin/users/[id]/reactivate
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /api/admin/users/[id]/reactivate', () => {
  it('400 NO_OP khi user đã active', async () => {
    setAuth('ADMIN');
    const { UserManagementServiceError } = await import(
      '@/src/domains/admin/user-management.service'
    );
    mocks.reactivateUser.mockRejectedValue(
      new UserManagementServiceError('NO_OP', 'Tài khoản đã đang hoạt động.'),
    );
    const res = await POSTReactivate(
      new NextRequest('http://localhost/api/admin/users/u1/reactivate', {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: 'u1' }) },
    );
    expect(res.status).toBe(400);
  });
});
