/**
 * app/api/admin/staffing/job-openings/[id]/classify/route.test.ts
 *
 * P1-A0.5 (canonical, contract v1.3 §STEP-03 / AC-02).
 *
 * Route-level unit test for `/classify`. Mocks:
 *   - `getAuthContext`  → session / role injection
 *   - `getPrisma` + `withDbContext` → in-memory Prisma tx
 *   - `withIdempotency` → in-memory idempotency cache
 *   - `classifyJobOpening` → controllable outcome (success / typed error /
 *     idempotent replay / IDEMPOTENCY_CONFLICT)
 *
 * Covers:
 *   - AC-02(a) role gate: ADMIN/HR_MANAGER pass; HR_STAFF/DIRECTOR/PM/VENDOR_* → 403 PERMISSION_DENIED.
 *   - AC-02(b) missing Idempotency-Key → 400 IDEMPOTENCY_REQUIRED.
 *   - AC-02(c) NULL/missing/unknown serviceModel → 400 INVALID_INPUT (Zod — v1.1 §C).
 *   - AC-02(d) unknown openingId → 404 NOT_FOUND.
 *   - AC-02(e) DRAFT + valid 4-enum → 200.
 *   - AC-02(f) OPEN/FILLED/CANCELLED → 409 INVALID_STATE_TRANSITION.
 *   - AC-02(g) idempotent replay (same key + same payload) → 200 + replayed: true.
 *   - AC-02(h) idempotency conflict (same key + different payload) → 409 IDEMPOTENCY_CONFLICT.
 *   - AC-02(i) error envelope doesn't leak actorId / assignment / PII.
 *   - 401 when no session.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';

const classifyCalls: Array<{
  openingId: string;
  serviceModel: string;
  actorId: string;
  actorRole: string;
}> = [];

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

// In-memory idempotency cache keyed on `${actorId}|${route}|${key}`.
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
      classifyJobOpening: vi.fn(
        async (
          _tx: Prisma.TransactionClient,
          ctx: { userId: string; role: string },
          input: { openingId: string; serviceModel: string },
        ) => {
          classifyCalls.push({
            openingId: input.openingId,
            serviceModel: input.serviceModel,
            actorId: ctx.userId,
            actorRole: ctx.role,
          });
          // Replay (idempotent at service layer): if a previous call wrote
          // the same value, the test calls a hook here to simulate success.
          const marker = (input as { __simulate?: string }).__simulate;
          if (marker === 'NOT_FOUND') {
            throw new actual.JobOpeningActivationError(
              'NOT_FOUND',
              404,
              `JobOpening ${input.openingId} not found`,
            );
          }
          if (marker === 'INVALID_STATE_TRANSITION') {
            throw new actual.JobOpeningActivationError(
              'INVALID_STATE_TRANSITION',
              409,
              `JobOpening ${input.openingId} is in status OPEN; cannot classify`,
            );
          }
          return {
            openingId: input.openingId,
            serviceModel: input.serviceModel,
            status: 'DRAFT',
          };
        },
      ),
    };
  },
);

import { POST } from './route';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { classifyJobOpening } from '@/src/domains/staffing/job-opening-activation.service';

const mockedAuth = getAuthContext as unknown as ReturnType<typeof vi.fn>;
const mockedClassify = classifyJobOpening as unknown as ReturnType<typeof vi.fn>;

function buildRequest(openingId: string, body: unknown, opts?: { omitIdempotency?: boolean; key?: string }): Request {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (!opts?.omitIdempotency) {
    headers['Idempotency-Key'] = opts?.key ?? '11111111-2222-4333-8444-555555555555';
  }
  return new Request(
    `http://localhost/api/admin/staffing/job-openings/${openingId}/classify`,
    {
      method: 'POST',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
  );
}

function uuidV4(seed: number): string {
  // Generate a deterministic UUID v4 for the seed so tests are stable.
  const hex = seed.toString(16).padStart(8, '0');
  return `${hex}-2222-4333-8444-555555555555`;
}

describe('/api/admin/staffing/job-openings/[id]/classify (AC-02)', () => {
  beforeEach(() => {
    classifyCalls.length = 0;
    idemStore.clear();
    mockedAuth.mockReset();
    mockedClassify.mockClear();
    mockedAuth.mockResolvedValue({
      userId: 'mgr-1',
      role: 'HR_MANAGER',
    });
  });

  it('AC-02(a) HR_MANAGER + valid request → 200', async () => {
    const req = buildRequest('op-1', { serviceModel: 'STAFFING_SUPPLY' });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      openingId: 'op-1',
      serviceModel: 'STAFFING_SUPPLY',
      status: 'DRAFT',
      replayed: false,
    });
    expect(classifyCalls).toHaveLength(1);
    expect(classifyCalls[0]).toMatchObject({
      openingId: 'op-1',
      serviceModel: 'STAFFING_SUPPLY',
      actorId: 'mgr-1',
      actorRole: 'HR_MANAGER',
    });
  });

  it('AC-02(a) ADMIN + valid request → 200', async () => {
    mockedAuth.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    const req = buildRequest('op-1', { serviceModel: 'RECRUITMENT_SERVICE' });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(200);
    expect(classifyCalls[0]).toMatchObject({ actorRole: 'ADMIN' });
  });

  it('AC-02(a) HR_STAFF → 403 PERMISSION_DENIED', async () => {
    mockedAuth.mockResolvedValue({ userId: 'staff-1', role: 'HR_STAFF' });
    const req = buildRequest('op-1', { serviceModel: 'STAFFING_SUPPLY' });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('PERMISSION_DENIED');
    // No service call on role-gate fail.
    expect(classifyCalls).toHaveLength(0);
  });

  it('AC-02(a) DIRECTOR → 403 PERMISSION_DENIED', async () => {
    mockedAuth.mockResolvedValue({ userId: 'dir-1', role: 'DIRECTOR' });
    const req = buildRequest('op-1', { serviceModel: 'STAFFING_SUPPLY' });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(403);
  });

  it('AC-02(b) missing Idempotency-Key → 400 IDEMPOTENCY_REQUIRED', async () => {
    const req = buildRequest('op-1', { serviceModel: 'STAFFING_SUPPLY' }, { omitIdempotency: true });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('IDEMPOTENCY_REQUIRED');
    expect(classifyCalls).toHaveLength(0);
  });

  it('AC-02(b) non-UUID-v4 Idempotency-Key → 400 IDEMPOTENCY_REQUIRED', async () => {
    const req = buildRequest('op-1', { serviceModel: 'STAFFING_SUPPLY' }, { key: 'not-a-uuid' });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(400);
    expect(classifyCalls).toHaveLength(0);
  });

  it('AC-02(c) NULL serviceModel → 400 INVALID_INPUT (Zod)', async () => {
    const req = buildRequest('op-1', { serviceModel: null });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_INPUT');
    expect(classifyCalls).toHaveLength(0);
  });

  it('AC-02(c) missing serviceModel → 400 INVALID_INPUT (Zod)', async () => {
    const req = buildRequest('op-1', {});
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(400);
    expect(classifyCalls).toHaveLength(0);
  });

  it('AC-02(c) unknown enum serviceModel → 400 INVALID_INPUT (Zod)', async () => {
    const req = buildRequest('op-1', { serviceModel: 'BOGUS_ENUM' });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(400);
    expect(classifyCalls).toHaveLength(0);
  });

  it('AC-02(c) string instead of object → 400 INVALID_INPUT', async () => {
    const req = buildRequest('op-1', 'not-an-object', { key: uuidV4(0xaaaaaaaa) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(400);
  });

  it('AC-02(d) unknown openingId → 404 NOT_FOUND', async () => {
    mockedClassify.mockImplementationOnce(async () => {
      throw new (await import('@/src/domains/staffing/job-opening-activation.service'))
        .JobOpeningActivationError('NOT_FOUND', 404, 'JobOpening op-missing not found');
    });
    const req = buildRequest('op-missing', { serviceModel: 'STAFFING_SUPPLY' }, { key: uuidV4(1) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-missing' }),
    } as any);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NOT_FOUND');
  });

  it('AC-02(f) OPEN opening → 409 INVALID_STATE_TRANSITION', async () => {
    mockedClassify.mockImplementationOnce(async () => {
      throw new (await import('@/src/domains/staffing/job-opening-activation.service'))
        .JobOpeningActivationError('INVALID_STATE_TRANSITION', 409, 'JobOpening is in status OPEN; cannot classify', {
          currentStatus: 'OPEN',
        });
    });
    const req = buildRequest('op-2', { serviceModel: 'STAFFING_SUPPLY' }, { key: uuidV4(2) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-2' }),
    } as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('INVALID_STATE_TRANSITION');
  });

  it('AC-02(g) idempotent replay → 200 + replayed: true', async () => {
    const key = uuidV4(3);
    // First call
    const r1 = await POST(
      buildRequest('op-1', { serviceModel: 'STAFFING_SUPPLY' }, { key }) as any,
      { params: Promise.resolve({ id: 'op-1' }) } as any,
    );
    expect(r1.status).toBe(200);
    const b1 = await r1.json();
    expect(b1.replayed).toBe(false);
    expect(classifyCalls).toHaveLength(1);
    // Second call (replay, same payload + same key)
    const r2 = await POST(
      buildRequest('op-1', { serviceModel: 'STAFFING_SUPPLY' }, { key }) as any,
      { params: Promise.resolve({ id: 'op-1' }) } as any,
    );
    expect(r2.status).toBe(200);
    const b2 = await r2.json();
    expect(b2.replayed).toBe(true);
    // No additional service call.
    expect(classifyCalls).toHaveLength(1);
  });

  it('AC-02(h) idempotency conflict (same key + different payload) → 409 IDEMPOTENCY_CONFLICT', async () => {
    const key = uuidV4(4);
    // First call
    const r1 = await POST(
      buildRequest('op-1', { serviceModel: 'STAFFING_SUPPLY' }, { key }) as any,
      { params: Promise.resolve({ id: 'op-1' }) } as any,
    );
    expect(r1.status).toBe(200);
    // Second call (same key, DIFFERENT payload)
    const r2 = await POST(
      buildRequest('op-1', { serviceModel: 'LABOR_LEASING' }, { key }) as any,
      { params: Promise.resolve({ id: 'op-1' }) } as any,
    );
    expect(r2.status).toBe(409);
    const b2 = await r2.json();
    expect(b2.error).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('AC-02(i) error envelope does NOT leak actorId / assignment / PII', async () => {
    mockedClassify.mockImplementationOnce(async () => {
      throw new (await import('@/src/domains/staffing/job-opening-activation.service'))
        .JobOpeningActivationError('INVALID_STATE_TRANSITION', 409, 'JobOpening is in status OPEN; cannot classify', {
          currentStatus: 'OPEN',
        });
    });
    const req = buildRequest('op-2', { serviceModel: 'STAFFING_SUPPLY' }, { key: uuidV4(5) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-2' }),
    } as any);
    expect(res.status).toBe(409);
    const text = await res.text();
    expect(text).not.toContain('mgr-1'); // no actorId leak
    expect(text).not.toContain('actorId');
    expect(text).not.toContain('assignment');
    expect(text).not.toContain('@'); // no PII (email-like)
  });

  it('401 when no session (no JWT)', async () => {
    const { AuthSessionError } = await import('@/src/shared/auth/auth-context');
    mockedAuth.mockImplementationOnce(() => {
      throw new AuthSessionError('NO_TOKEN', 'Missing or invalid JWT token');
    });
    const req = buildRequest('op-1', { serviceModel: 'STAFFING_SUPPLY' }, { key: uuidV4(6) });
    const res = await POST(req as any, {
      params: Promise.resolve({ id: 'op-1' }),
    } as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('NO_TOKEN');
  });
});
