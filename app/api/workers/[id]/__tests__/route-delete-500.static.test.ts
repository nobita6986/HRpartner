/**
 * route-delete-500.static.test.ts — T1B fence 500 catch-all cho DELETE.
 *
 * Khóa invariant: khi DELETE throw ngoài `WorkerServiceError` / `AuthScopeError`
 * (Prisma exception, idempotency layer, JSON parse...), response body KHÔNG
 * được leak `e.message` hay stack trace. Message trả về phải là chuỗi tiếng
 * Việt cố định, đồng thời `console.error` được gọi phía server với thông
 * tin exception đầy đủ.
 *
 * KHÔNG dùng DB; mock đầy đủ service layer.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withDbContext: vi.fn(),
  withIdempotency: vi.fn(),
  serviceDeleteWorker: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
  },
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
  deleteWorker: mocks.serviceDeleteWorker,
}));

import { DELETE } from '@/app/api/workers/[id]/route';

const ADMIN_CTX = { userId: 'admin-1', role: 'ADMIN' };
const params = (id = 'w1') => Promise.resolve({ id });

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
  // Idempotency mặc định chạy handler trực tiếp (mô phỏng trường hợp có idem key).
  mocks.withIdempotency.mockImplementation(
    async ({ handler }: { handler: () => Promise<unknown> }) => {
      const r = (await handler()) as { body: unknown; statusCode: number };
      return { body: r.body, statusCode: r.statusCode, replayed: false };
    },
  );
  // withDbContext chạy callback.
  mocks.withDbContext.mockImplementation(
    (_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb({}),
  );
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('DELETE /api/workers/[id] — 500 catch-all', () => {
  it('Prisma exception KHÔNG leak `e.message` ra response body', async () => {
    // Exception kiểu Prisma (không phải WorkerServiceError).
    const prismaError = new Error(
      'PrismaClientKnownRequestError: P2002: Unique constraint failed on the fields: (`userId`)',
    );
    mocks.serviceDeleteWorker.mockRejectedValue(prismaError);
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'DELETE',
      headers: { 'x-idempotency-key': 'delete-w1-test' },
      body: JSON.stringify({ reason: 'r' }),
    });
    const res = await DELETE(req, { params: params() });
    expect(res.status).toBe(500);
    const data = await res.json();
    // KHÔNG leak Prisma error message.
    expect(data.error).toBe('INTERNAL');
    expect(data.message).not.toContain('P2002');
    expect(data.message).not.toContain('PrismaClientKnownRequestError');
    expect(data.message).not.toContain('Unique constraint');
  });

  it('response body có message tiếng Việt cố định, có hướng xử lý', async () => {
    mocks.serviceDeleteWorker.mockImplementation(() => {
      throw new Error('internal stack with secrets and PII xyz');
    });
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'r' }),
    });
    const res = await DELETE(req, { params: params() });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.message).toContain('Hệ thống gặp sự cố');
    expect(data.message).toContain('Vui lòng thử lại');
    expect(data.message).toContain('quản trị viên');
    expect(data.message).not.toContain('secrets and PII');
  });

  it('console.error được gọi với marker + exception đầy đủ (server-side log)', async () => {
    const err = new Error('boom');
    mocks.serviceDeleteWorker.mockRejectedValue(err);
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'r' }),
    });
    await DELETE(req, { params: params() });
    // console.error phải được gọi với marker chứa 'DELETE' để server log có thể filter.
    const errorCalls = consoleErrorSpy.mock.calls.flat().map(String);
    expect(errorCalls.some((c) => c.includes('[api/workers/[id] DELETE]'))).toBe(true);
    // Và phải log cả error object để có stack/message phục vụ debug server-side.
    expect(consoleErrorSpy.mock.calls.flat()).toContain(err);
  });

  it('idempotency layer throw (không phải WorkerServiceError) cũng rơi vào catch-all', async () => {
    mocks.withIdempotency.mockImplementation(() => {
      throw new Error('idempotency store timeout');
    });
    const req = new NextRequest('http://localhost/api/workers/w1', {
      method: 'DELETE',
      headers: { 'x-idempotency-key': 'delete-w1-test' },
      body: JSON.stringify({ reason: 'r' }),
    });
    const res = await DELETE(req, { params: params() });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.message).not.toContain('idempotency store timeout');
    expect(data.message).toContain('Hệ thống gặp sự cố');
  });
});
