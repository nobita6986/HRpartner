/**
 * app/api/admin/staffing/job-openings/[id]/open/route.test.ts
 *
 * P1-A0.5 (canonical, contract v1.3 §STEP-05 / AC-04).
 *
 * Route-level unit test for `/open`. Mocks:
 *   - `getAuthContext`  → session / role injection
 *   - `getPrisma` + `withDbContext` → in-memory Prisma tx
 *   - `withIdempotency` → in-memory idempotency cache
 *   - `openJobOpening`  → controllable outcome (success / typed error /
 *                         idempotent replay)
 *
 * Covers AC-04:
 *   (a) role gate: ADMIN/HR_MANAGER pass; HR_STAFF requires active assignment;
 *       other roles → 403 PERMISSION_DENIED.
 *   (b) Idempotency-Key required (UUID v4).
 *   (c) body MUST be empty — unexpected payload → 400 INVALID_INPUT (v1.1 §D).
 *   (d) unknown openingId → 404 NOT_FOUND.
 *   (e) preconditions evaluated server-side.
 *   (f) idempotent replay (same key) → 200 + replayed: true.
 *   (g) idempotency conflict → 409 IDEMPOTENCY_CONFLICT.
 *   (h) error envelope doesn't leak.
 *   + 401 when no session.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';

const openCalls: Array<{ openingId: string; actorId: string; actorRole: string }> = [];

vi.mock('@/src/shared/auth/auth-context', () => ({
  AuthSessionError: class AuthSessionError extends Error {
    constructor(
      public readonly code:
        | 'NO_TOKEN'
        | 'INVALID_TOKEN'
        | 'USER_INACTIVE'
        | 'USER_NOT_FOUND'
        | 'INTERNAL',
      message: string,
    ) {
      super(message);
      this.name = 'AuthSessionError';
    }
  },
  getAuthContext: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({
  getPrisma: vi.fn(() => ({
    $transaction: vi.fn(
      async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        fn({} as Prisma.TransactionClient),
    ),
  })),
}));

vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: vi.fn(
    async (
      _p: unknown,
      _s: unknown,
      fn: (tx: Prisma.TransactionClient) => Promise<unknown>,
    ) => fn({} as Prisma.TransactionClient),
  ),
}));

const idemStore = new Map<
  string,
  { requestHash: string; response: unknown; statusCode: number }
>();

function reqHash(payload: unknown): string {
  return JSON.stringify(payload ?? null);
}

vi.mock('@/src/shared/integrity/idempotency', async () => {
  const actual = await vi.importActual<
    typeof import('@/src/shared/integrity/idempotency')
  >('@/src/shared/integrity/idempotency');
  return {
    IdempotencyConflictError: actual.IdempotencyConflictError,
    withIdempotency: vi.fn(
      async (opts: {
        route: string;
        actorId: string;
        key: string;
        requestBody: unknown;
        handler: () => Promise<{ body: unknown; statusCode?: number }>;
      }) => {
        const cacheKey = `${opts.actorId}|${opts.route}|${opts.key}`;
        const hash = reqHash(opts.requestBody);
        const existing = idemStore.get(cacheKey);
        if (existing && existing.requestHash !== hash) {
          throw new actual.IdempotencyConflictError(
            `x-idempotency-key "${opts.key}" đã được dùng với request body khác`,
          );
        }
        if (existing && existing.requestHash === hash) {
          return {
            body: existing.response,
            statusCode: existing.statusCode,
            replayed: true,
          };
        }
        const result = await opts.handler();
        const statusCode = result.statusCode ?? 200;
        idemStore.set(cacheKey, {
          requestHash: hash,
          response: result.body,
          statusCode,
        });
        return { body: result.body, statusCode, replayed: false };
      },
    ),
  };
});

vi.mock(
  '@/src/domains/staffing/job-opening-activation.service',
  async () => {
    const actual = await vi.importActual<
      typeof import('@/src/domains/staffing/job-opening-activation.service')
    >('@/src/domains/staffing/job-opening-activation.service');
    return {
      ...actual,
      openJobOpening: vi.fn(
        async (
          _tx: Prisma.TransactionClient,
          ctx: { userId: string; role: string },
          input: { openingId: string },
        ) => {
          openCalls.push({
            openingId: input.openingId,
            actorId: ctx.userId,
            actorRole: ctx.role,
          });
          return {
            openingId: input.openingId,
            status: 'OPEN',
            openedAt: '2026-09-30T03:00:00.000Z',
          };
        },
      ),
    };
  },
);

import { POST } from './route';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { openJobOpening } from '@/src/domains/staffing/job-opening-activation.service';

const mockedAuth = getAuthContext as unknown as ReturnType<typeof vi.fn>;
const mockedOpen = openJobOpening as unknown as ReturnType<typeof vi.fn>;

function buildRequest(
  openingId: string,
  opts: {
    body?: string;
    omitIdempotency?: boolean;
    key?: string;
    contentLength?: string;
  } = {},
): Request {
  const headers: Record<string, string> = {};
  if (!opts.omitIdempotency) {
    headers['Idempotency-Key'] = opts.key ?? '11111111-2222-4333-8444-555555555555';
  }
  if (opts.contentLength !== undefined) {
    headers['content-length'] = opts.contentLength;
  }
  return new Request(
    `http://localhost/api/admin/staffing/job-openings/${openingId}/open`,
    {
      method: 'POST',
      headers,
      body: opts.body,
    },
  );
}

function uuidV4(seed: number): string {
  const hex = seed.toString(16).padStart(8, '0');
  return `${hex}-2222-4333-8444-555555555555`;
}

describe('/api/admin/staffing/job-openings/[id]/open (AC-04)', () => {
  beforeEach(() => {
    openCalls.length = 0;
    idemStore.clear();
    mockedAuth.mockReset();
    mockedOpen.mockClear();
    mockedAuth.mockResolvedValue({ userId: 'mgr-1', role: 'HR_MANAGER' });
  });

  it('AC-04(a) HR_MANAGER + valid empty body + valid Idempotency-Key → 200', async () => {
    const req = buildRequest('op-1', { key: uuidV4(1) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      openingId: 'op-1',
      status: 'OPEN',
      replayed: false,
    });
    expect(openCalls).toHaveLength(1);
    expect(openCalls[0]).toMatchObject({
      openingId: 'op-1',
      actorId: 'mgr-1',
      actorRole: 'HR_MANAGER',
    });
  });

  it('AC-04(a) ADMIN + valid → 200', async () => {
    mockedAuth.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    const req = buildRequest('op-1', { key: uuidV4(2) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(200);
    expect(openCalls[0]).toMatchObject({ actorRole: 'ADMIN' });
  });

  it('AC-04(a) HR_STAFF with active assignment → 200 (service decides)', async () => {
    mockedAuth.mockResolvedValue({ userId: 'staff-1', role: 'HR_STAFF' });
    const req = buildRequest('op-1', { key: uuidV4(3) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(200);
    expect(openCalls[0]).toMatchObject({ actorRole: 'HR_STAFF' });
  });

  it('AC-04(a) DIRECTOR → 403 PERMISSION_DENIED (no /open path)', async () => {
    mockedAuth.mockResolvedValue({ userId: 'dir-1', role: 'DIRECTOR' });
    const req = buildRequest('op-1', { key: uuidV4(4) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(403);
    expect(openCalls).toHaveLength(0);
  });

  it('AC-04(a) PM → 403 PERMISSION_DENIED', async () => {
    mockedAuth.mockResolvedValue({ userId: 'pm-1', role: 'PM' });
    const req = buildRequest('op-1', { key: uuidV4(5) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(403);
  });

  it('AC-04(a) VENDOR_ADMIN → 403 PERMISSION_DENIED', async () => {
    mockedAuth.mockResolvedValue({ userId: 'va-1', role: 'VENDOR_ADMIN' });
    const req = buildRequest('op-1', { key: uuidV4(6) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(403);
  });

  it('AC-04(b) missing Idempotency-Key → 400 IDEMPOTENCY_REQUIRED', async () => {
    const req = buildRequest('op-1', { omitIdempotency: true });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('IDEMPOTENCY_REQUIRED');
    expect(openCalls).toHaveLength(0);
  });

  it('AC-04(b) non-UUID-v4 Idempotency-Key → 400 IDEMPOTENCY_REQUIRED', async () => {
    const req = buildRequest('op-1', { key: 'not-a-uuid' });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(400);
  });

  it('AC-04(c) unexpected JSON payload → 400 INVALID_INPUT', async () => {
    const req = buildRequest('op-1', {
      key: uuidV4(7),
      body: JSON.stringify({ expectedOpeningVersion: 1 }),
    });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_INPUT');
    expect(openCalls).toHaveLength(0);
  });

  it('AC-04(c) body "null" (literal string) → 400 INVALID_INPUT', async () => {
    const req = buildRequest('op-1', {
      key: uuidV4(8),
      body: 'null',
      contentLength: '4',
    });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(400);
    expect(openCalls).toHaveLength(0);
  });

  it('AC-04(c) empty body (Content-Length: 0) → pass body check, hit service', async () => {
    const req = buildRequest('op-1', {
      key: uuidV4(9),
      body: '',
      contentLength: '0',
    });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(200);
    expect(openCalls).toHaveLength(1);
  });

  it('AC-04(d) unknown openingId → 404 NOT_FOUND', async () => {
    mockedOpen.mockImplementationOnce(async () => {
      throw new (await import('@/src/domains/staffing/job-opening-activation.service'))
        .JobOpeningActivationError('NOT_FOUND', 404, 'JobOpening op-missing not found');
    });
    const req = buildRequest('op-missing', { key: uuidV4(10) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-missing' }),
    } as any);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NOT_FOUND');
  });

  it('AC-04(e) preconditions surfaced via typed envelope (NULL serviceModel → 422)', async () => {
    mockedOpen.mockImplementationOnce(async () => {
      throw new (await import('@/src/domains/staffing/job-opening-activation.service'))
        .JobOpeningActivationError('SERVICE_MODEL_REQUIRED', 422, 'JobOpening has no ServiceModel classified yet');
    });
    const req = buildRequest('op-1', { key: uuidV4(11) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('SERVICE_MODEL_REQUIRED');
  });

  it('AC-04(e) parent order not OPEN → 409 ORDER_NOT_OPEN', async () => {
    mockedOpen.mockImplementationOnce(async () => {
      throw new (await import('@/src/domains/staffing/job-opening-activation.service'))
        .JobOpeningActivationError('ORDER_NOT_OPEN', 409, 'StaffingOrder is not OPEN', { orderStatus: 'DRAFT' });
    });
    const req = buildRequest('op-1', { key: uuidV4(12) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('ORDER_NOT_OPEN');
  });

  it('AC-04(e) slot over-filled → 409 SLOT_NOT_ELIGIBLE', async () => {
    mockedOpen.mockImplementationOnce(async () => {
      throw new (await import('@/src/domains/staffing/job-opening-activation.service'))
        .JobOpeningActivationError('SLOT_NOT_ELIGIBLE', 409, 'StaffingOrderSlot is full', {
          slotsFilled: 5,
          slotsNeeded: 5,
        });
    });
    const req = buildRequest('op-1', { key: uuidV4(13) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('SLOT_NOT_ELIGIBLE');
  });

  it('AC-04(e) HR_STAFF without active assignment → 403 NO_ACTIVE_ORDER_ASSIGNMENT', async () => {
    mockedAuth.mockResolvedValue({ userId: 'staff-2', role: 'HR_STAFF' });
    mockedOpen.mockImplementationOnce(async () => {
      throw new (await import('@/src/domains/staffing/job-opening-activation.service'))
        .JobOpeningActivationError('NO_ACTIVE_ORDER_ASSIGNMENT', 403, 'Actor is not an ACTIVE recruiter for this order');
    });
    const req = buildRequest('op-1', { key: uuidV4(14) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('NO_ACTIVE_ORDER_ASSIGNMENT');
  });

  it('AC-04(f) idempotent replay → 200 + replayed: true', async () => {
    const key = uuidV4(15);
    const r1 = await POST(
      buildRequest('op-1', { key }) as any,
      { params: Promise.resolve({ id: 'op-1' }) } as any,
    );
    expect(r1.status).toBe(200);
    const b1 = await r1.json();
    expect(b1.replayed).toBe(false);
    expect(openCalls).toHaveLength(1);

    // Same key + same payload → replay
    const r2 = await POST(
      buildRequest('op-1', { key }) as any,
      { params: Promise.resolve({ id: 'op-1' }) } as any,
    );
    expect(r2.status).toBe(200);
    const b2 = await r2.json();
    expect(b2.replayed).toBe(true);
    expect(openCalls).toHaveLength(1);
  });

  it('AC-04(g) idempotency conflict (same key, distinct openingId) → 409 IDEMPOTENCY_CONFLICT', async () => {
    const key = uuidV4(16);
    const r1 = await POST(
      buildRequest('op-1', { key }) as any,
      { params: Promise.resolve({ id: 'op-1' }) } as any,
    );
    expect(r1.status).toBe(200);
    const r2 = await POST(
      buildRequest('op-2', { key }) as any,
      { params: Promise.resolve({ id: 'op-2' }) } as any,
    );
    expect(r2.status).toBe(409);
    const b2 = await r2.json();
    expect(b2.error).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('AC-04(h) error envelope does NOT leak actorId / assignment / PII', async () => {
    mockedOpen.mockImplementationOnce(async () => {
      throw new (await import('@/src/domains/staffing/job-opening-activation.service'))
        .JobOpeningActivationError('ORDER_NOT_OPEN', 409, 'StaffingOrder is not OPEN', { orderStatus: 'DRAFT' });
    });
    const req = buildRequest('op-2', { key: uuidV4(17) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-2' }),
    } as any);
    expect(res.status).toBe(409);
    const text = await res.text();
    expect(text).not.toContain('mgr-1');
    expect(text).not.toContain('actorId');
    expect(text).not.toContain('assignmentId');
    expect(text).not.toContain('@');
  });

  it('401 when no session', async () => {
    const { AuthSessionError } = await import('@/src/shared/auth/auth-context');
    mockedAuth.mockImplementationOnce(() => {
      throw new AuthSessionError('NO_TOKEN', 'Missing or invalid JWT token');
    });
    const req = buildRequest('op-1', { key: uuidV4(18) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('NO_TOKEN');
  });
});
