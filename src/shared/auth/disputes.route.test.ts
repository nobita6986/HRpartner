/**
 * disputes.route.test.ts — V5-M1-06d / RQ-06 / STEP-06 / DEC-09 / AC-06.
 *
 * UNIT: /api/disputes là USER_SCOPED_DB — business op qua withDbContext (L2) + idempotency
 * wrapper (raw compose cho phép per EV-13). Kiểm tra boundary/error mapping, giữ idempotency.
 *   - unauth → 401; thiếu action/statementId/statementKind → 400.
 *   - AuthScopeError → 403; DisputeServiceError NOT_FOUND→404, INVALID_STATE→409.
 *   - có x-idempotency-key → đi qua withIdempotency (giữ replay semantics).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withDbContext: vi.fn(),
  withIdempotency: vi.fn(),
  sendStatement: vi.fn(),
  disputeStatement: vi.fn(),
  confirmStatement: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
  },
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: mocks.withDbContext,
}));
vi.mock('@/src/shared/integrity/idempotency', () => ({
  withIdempotency: mocks.withIdempotency,
}));
vi.mock('@/src/domains/reconciliation/dispute.service', () => ({
  sendStatement: mocks.sendStatement,
  disputeStatement: mocks.disputeStatement,
  confirmStatement: mocks.confirmStatement,
  lockStatement: vi.fn(),
  forceLockStatement: vi.fn(),
  DisputeServiceError: class DisputeServiceError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'DisputeServiceError';
    }
  },
}));

import { POST } from '@/app/api/disputes/route';
import { AuthSessionError } from '@/src/shared/auth/auth-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { DisputeServiceError } from '@/src/domains/reconciliation/dispute.service';

const post = (body: unknown, key?: string) =>
  new NextRequest('http://localhost/api/disputes', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: key ? { 'content-type': 'application/json', 'x-idempotency-key': key } : { 'content-type': 'application/json' },
  });

const SEND_BODY = { action: 'SEND', statementId: 's1', statementKind: 'VENDOR' };

describe('POST /api/disputes — USER_SCOPED_DB boundary + idempotency (DEC-09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // withDbContext thực thi callback với fake tx.
    mocks.withDbContext.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb({}));
    mocks.sendStatement.mockResolvedValue({ ok: true, statementId: 's1' });
  });

  it('unauth (AuthSessionError) → 401, KHÔNG chạm DB', async () => {
    mocks.getAuthContext.mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'no token'));
    const res = await POST(post(SEND_BODY));
    expect(res.status).toBe(401);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('thiếu action/statementId/statementKind → 400', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ACCOUNTANT' });
    expect((await POST(post({ action: 'SEND' }))).status).toBe(400);
  });

  it('SEND không idempotency key → withDbContext, 200', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ACCOUNTANT' });
    const res = await POST(post(SEND_BODY));
    expect(res.status).toBe(200);
    expect(mocks.withDbContext).toHaveBeenCalledTimes(1);
    expect(mocks.withIdempotency).not.toHaveBeenCalled();
  });

  it('có x-idempotency-key → đi qua withIdempotency', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ACCOUNTANT' });
    mocks.withIdempotency.mockImplementation(async ({ handler }: { handler: () => Promise<unknown> }) => handler());
    const res = await POST(post(SEND_BODY, 'idem-1'));
    expect(res.status).toBe(200);
    expect(mocks.withIdempotency).toHaveBeenCalledTimes(1);
    expect(mocks.withIdempotency.mock.calls[0][0]).toMatchObject({ route: 'POST:/api/disputes', actorId: 'u', key: 'idem-1' });
  });

  it('AuthScopeError từ service → 403', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ACCOUNTANT' });
    mocks.sendStatement.mockRejectedValueOnce(new AuthScopeError('DENY_BY_DEFAULT', 'no scope'));
    expect((await POST(post(SEND_BODY))).status).toBe(403);
  });

  it('DisputeServiceError NOT_FOUND → 404', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ACCOUNTANT' });
    mocks.sendStatement.mockRejectedValueOnce(new DisputeServiceError('NOT_FOUND', 'khong thay'));
    expect((await POST(post(SEND_BODY))).status).toBe(404);
  });

  it('DisputeServiceError INVALID_STATE → 409', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ACCOUNTANT' });
    mocks.sendStatement.mockRejectedValueOnce(new DisputeServiceError('INVALID_STATE', 'sai trang thai'));
    expect((await POST(post(SEND_BODY))).status).toBe(409);
  });
});
