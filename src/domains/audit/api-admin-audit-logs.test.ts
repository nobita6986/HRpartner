/**
 * api-admin-audit-logs.test.ts — T1B-OPS /api/admin/audit-logs route tests.
 *
 * Cover:
 *   - 401 khi thiếu session.
 *   - 403 khi role không phải ADMIN.
 *   - 400 khi query không hợp lệ (skip âm, take > 200, date format sai).
 *   - 200 với ADMIN — pass filter xuống service.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withAuthorizedDbReadOnly: vi.fn(),
  listAuditLogs: vi.fn(),
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
  },
  AuthScopeError: class AuthScopeError extends Error {},
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: mocks.AuthSessionError,
}));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({
  withAuthorizedDbReadOnly: mocks.withAuthorizedDbReadOnly,
}));
vi.mock('@/src/shared/auth/with-auth-scope', () => ({
  AuthScopeError: mocks.AuthScopeError,
}));
vi.mock('@/src/domains/audit/audit-logs.read-service', () => ({
  listAuditLogs: mocks.listAuditLogs,
  AuthError: class AuthError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

import { GET } from '@/app/api/admin/audit-logs/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withAuthorizedDbReadOnly.mockImplementation(async (_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) =>
    cb({}),
  );
});

describe('GET /api/admin/audit-logs', () => {
  it('returns 401 when no session', async () => {
    mocks.getAuthContext.mockRejectedValue(new mocks.AuthSessionError('No token'));
    const req = new NextRequest('http://localhost/api/admin/audit-logs');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const j = await res.json();
    expect(j.error).toBe('UNAUTHENTICATED');
  });

  it('returns 403 when role is not ADMIN', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'HR_MANAGER' });
    mocks.listAuditLogs.mockRejectedValue(new (await import('@/src/domains/audit/audit-logs.read-service')).AuthError('FORBIDDEN', 'Role HR_MANAGER không có quyền.'));
    const req = new NextRequest('http://localhost/api/admin/audit-logs');
    const res = await GET(req);
    expect(res.status).toBe(403);
    const j = await res.json();
    expect(j.error).toBe('FORBIDDEN');
  });

  it('returns 400 for invalid query (negative skip)', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'ADMIN' });
    const req = new NextRequest('http://localhost/api/admin/audit-logs?skip=-5');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe('BAD_REQUEST');
  });

  it('returns 400 for invalid date format', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'ADMIN' });
    const req = new NextRequest('http://localhost/api/admin/audit-logs?fromDate=01-01-2026');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when take > 200', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'ADMIN' });
    const req = new NextRequest('http://localhost/api/admin/audit-logs?take=1000');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 with valid filter', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'ADMIN' });
    const expected = { items: [], total: 0, skip: 0, take: 50 };
    mocks.listAuditLogs.mockResolvedValue(expected);
    const req = new NextRequest('http://localhost/api/admin/audit-logs?entityType=Worker&take=10');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j).toEqual(expected);
    expect(mocks.listAuditLogs).toHaveBeenCalledTimes(1);
    // listAuditLogs(tx, ctx, filter) — 3rd arg is filter
    const filterArg = mocks.listAuditLogs.mock.calls[0][2];
    expect(filterArg.entityType).toBe('Worker');
    expect(filterArg.take).toBe(10);
  });
});