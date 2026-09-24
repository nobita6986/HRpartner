/**
 * app/api/admin/labor-profiles/[id]/handling-assignments/route.test.ts
 *
 * AFF-05A-R2 route-level unit test (AC-01).
 *
 * Validates the strict no-coercion boundary at the route layer:
 *   - accept 1, 7, 30 and property-absent (default 7);
 *   - reject explicit null, string, boolean, NaN/Infinity, fraction, zero,
 *     negative, and values > 30.
 *
 * Strategy: monkey-patch `managerAssign` / `releaseHandlingAssignment` so we
 * can call the POST handler directly with synthetic sessions. The handler
 * reads `request.json()` and `getServerSession()`; we stub both via
 * dependency injection by constructing the module after setting
 * `vi.mock(...)` for the relevant module paths.
 *
 * ENV contract: pure unit test. No DB, no network. Fail-closed unit lane.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import type { Prisma } from '@prisma/client';

// Track invocations of managerAssign so we can assert on the `days` arg.
const managerAssignCalls: Array<{ days: unknown; newAssigneeUserId: string }> = [];
const releaseCalls: Array<{ actorId: string }> = [];

vi.mock('@/src/domains/talent/handling-assignment.service', async () => {
  const { ManagerAssignDaysError: RealErr } = await vi.importActual<
    typeof import('@/src/domains/talent/handling-assignment.service')
  >('@/src/domains/talent/handling-assignment.service');
  return {
    managerAssign: vi.fn(async (_tx: Prisma.TransactionClient, input: any) => {
      managerAssignCalls.push({ days: input.days, newAssigneeUserId: input.newAssigneeUserId });
      return { id: 'stubbed-assignment', ...input };
    }),
    releaseHandlingAssignment: vi.fn(async (_tx: Prisma.TransactionClient, input: any) => {
      releaseCalls.push({ actorId: input.actorId });
      return { id: 'stubbed-release', status: 'REVOKED' };
    }),
    normalizeManagerAssignDays: (present: boolean, raw: unknown) => {
      if (!present) return 7;
      if (raw === null) throw new RealErr('days must be a finite integer in [1,30] when provided (null is not allowed).');
      if (typeof raw !== 'number' || !Number.isFinite(raw)) throw new RealErr('days must be a finite integer in [1,30].');
      if (!Number.isInteger(raw)) throw new RealErr('days must be an integer in [1,30].');
      if (raw < 1 || raw > 30) throw new RealErr('days must be in [1,30].');
      return raw;
    },
    ManagerAssignDaysError: RealErr,
  };
});

vi.mock('@/src/shared/auth/server-session', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({
  getPrisma: vi.fn(() => ({
    $transaction: vi.fn(async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => fn({} as Prisma.TransactionClient)),
  })),
}));

vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: vi.fn(async (_p: unknown, _s: unknown, fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => fn({} as Prisma.TransactionClient)),
}));

import { POST } from './route';
import { getServerSession } from '@/src/shared/auth/server-session';

const mockedSession = getServerSession as unknown as ReturnType<typeof vi.fn>;

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/admin/labor-profiles/lp-1/handling-assignments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('AFF-05A-R2 handling-assignments route (AC-01)', () => {
  beforeEach(() => {
    managerAssignCalls.length = 0;
    releaseCalls.length = 0;
    mockedSession.mockReset();
    mockedSession.mockResolvedValue({
      userId: 'mgr-1',
      role: 'HR_MANAGER',
    });
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  async function run(body: unknown): Promise<Response> {
    return POST(buildRequest(body) as any, {
      params: Promise.resolve({ id: 'lp-1' }),
    } as any);
  }

  it('accepts 1 (minimum) when newAssigneeUserId is provided', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', days: 1, reason: 'r' });
    expect(res.status).toBe(200);
    expect(managerAssignCalls).toHaveLength(1);
    expect(managerAssignCalls[0].days).toBe(1);
  });

  it('accepts 7 (default) when newAssigneeUserId is provided', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', days: 7, reason: 'r' });
    expect(res.status).toBe(200);
    expect(managerAssignCalls[0].days).toBe(7);
  });

  it('accepts 30 (maximum) when newAssigneeUserId is provided', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', days: 30, reason: 'r' });
    expect(res.status).toBe(200);
    expect(managerAssignCalls[0].days).toBe(30);
  });

  it('accepts property-absent (default 7) when newAssigneeUserId is provided', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', reason: 'r' });
    expect(res.status).toBe(200);
    expect(managerAssignCalls[0].days).toBe(7);
  });

  it('rejects explicit null with 400', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', days: null, reason: 'r' });
    expect(res.status).toBe(400);
    expect(managerAssignCalls).toHaveLength(0);
  });

  it('rejects string days with 400', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', days: '7', reason: 'r' });
    expect(res.status).toBe(400);
    expect(managerAssignCalls).toHaveLength(0);
  });

  it('rejects boolean days with 400', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', days: true, reason: 'r' });
    expect(res.status).toBe(400);
    expect(managerAssignCalls).toHaveLength(0);
  });

  it('rejects NaN with 400', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', days: Number.NaN, reason: 'r' });
    expect(res.status).toBe(400);
    expect(managerAssignCalls).toHaveLength(0);
  });

  it('rejects Infinity with 400', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', days: Number.POSITIVE_INFINITY, reason: 'r' });
    expect(res.status).toBe(400);
    expect(managerAssignCalls).toHaveLength(0);
  });

  it('rejects fraction with 400', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', days: 7.5, reason: 'r' });
    expect(res.status).toBe(400);
    expect(managerAssignCalls).toHaveLength(0);
  });

  it('rejects zero with 400', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', days: 0, reason: 'r' });
    expect(res.status).toBe(400);
    expect(managerAssignCalls).toHaveLength(0);
  });

  it('rejects negative with 400', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', days: -1, reason: 'r' });
    expect(res.status).toBe(400);
    expect(managerAssignCalls).toHaveLength(0);
  });

  it('rejects 31 (just above max) with 400', async () => {
    const res = await run({ newAssigneeUserId: 'staff-1', days: 31, reason: 'r' });
    expect(res.status).toBe(400);
    expect(managerAssignCalls).toHaveLength(0);
  });

  it('release path: newAssigneeUserId absent routes to release, never to managerAssign', async () => {
    const res = await run({ reason: 'r' });
    expect(res.status).toBe(200);
    expect(managerAssignCalls).toHaveLength(0);
    expect(releaseCalls).toHaveLength(1);
    expect(releaseCalls[0].actorId).toBe('mgr-1');
  });

  it('release path: rejects property-present null days with 400 even when no assignee', async () => {
    const res = await run({ reason: 'r', days: null });
    expect(res.status).toBe(400);
    expect(releaseCalls).toHaveLength(0);
  });
});
