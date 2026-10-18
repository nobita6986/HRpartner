/**
 * worker-tickets-create.route.test.ts — T1A Android backend mobile contract.
 *
 * UNIT (no DB): `POST /api/worker/tickets` tái sử dụng workflow POST /api/tickets
 * (TASK DEC-07 / AC-08):
 *   - non-WORKER → 403; WORKER chưa có worker profile → 404;
 *   - body.workerId khác self → 403;
 *   - body không workerId → force self (ctx.workerId) rồi đi cùng service path
 *     (service.createTicket qua withDbContext) — cùng handler dùng chung.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getTicketAuth: vi.fn(),
  createTicket: vi.fn(),
  dbContext: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {},
}));

vi.mock('@/src/shared/auth/ticket-route-helpers', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getTicketAuth: mocks.getTicketAuth,
  };
});

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) => mocks.dbContext(cb),
}));
vi.mock('@/src/shared/integrity/idempotency', () => ({
  withIdempotency: (opts: { handler: () => Promise<{ body: unknown; statusCode: number }> }) =>
    opts.handler(),
}));
vi.mock('@/src/domains/attendance/ticket.service', () => ({
  TicketService: vi.fn().mockImplementation(() => ({ createTicket: mocks.createTicket })),
}));

import { POST } from '@/app/api/worker/tickets/route';

const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/worker/tickets', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

const SESSION_WORKER = {
  id: 'u1',
  role: 'WORKER',
  workerId: 'w1',
  name: 'W',
  ipAddress: null,
  userAgent: null,
};

const validBody = { type: 'OTHER', title: 'Xin nghỉ', description: 'Ốm' };

describe('POST /api/worker/tickets (AC-08 — reuse POST /api/tickets workflow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTicket.mockResolvedValue({ id: 't1' });
    mocks.dbContext.mockImplementation((cb: (t: unknown) => unknown) => cb({ id: 'tx' }));
    mocks.getTicketAuth.mockResolvedValue({ sessionUser: SESSION_WORKER });
  });

  it('role khác WORKER → 403', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'HR_STAFF' });
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(403);
    expect(mocks.createTicket).not.toHaveBeenCalled();
  });

  it('WORKER chưa có worker profile → 404', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER' });
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(404);
    expect(mocks.createTicket).not.toHaveBeenCalled();
  });

  it('body.workerId KHÁC self → 403 (server-side ownership)', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    const res = await POST(postReq({ ...validBody, workerId: 'other-worker' }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('FORBIDDEN');
    expect(mocks.createTicket).not.toHaveBeenCalled();
  });

  it('body không workerId → force self rồi service.createTicket cùng handler (L2 GUC)', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(201);

    expect(mocks.dbContext).toHaveBeenCalledTimes(1);
    expect(mocks.createTicket).toHaveBeenCalledTimes(1);
    const input = mocks.createTicket.mock.calls[0][0];
    expect(input.workerId).toBe('w1');
    expect(input.type).toBe('OTHER');
    const actor = mocks.createTicket.mock.calls[0][1];
    expect(actor.id).toBe('u1');
  });

  it('body workerId == self → chấp nhận, cùng service path', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'WORKER', workerId: 'w1' });
    const res = await POST(postReq({ ...validBody, workerId: 'w1' }));
    expect(res.status).toBe(201);
    const input = mocks.createTicket.mock.calls[0][0];
    expect(input.workerId).toBe('w1');
  });
});
