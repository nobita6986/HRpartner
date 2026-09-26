/**
 * placement.route-helpers.test.ts — no-DB unit tests for `runPlacementCommand`
 * (P1-F0 contract v1.2 — round-2 correction batch).
 *
 * Covers C-02 + C-03 + C-05 requirements WITHOUT any real DB / network:
 *
 *   1. 401 unauthenticated (getAuthContext throws AuthSessionError).
 *   2. 401 unauthenticated WITH malformed placementId → 401, NOT 400.
 *   3. 403 disallowed role (HR_STAFF).
 *   4. 400 placementId malformed (UUID v4) AFTER auth.
 *   5. 400 strict body validation (unknown fields, empty body when not allowed,
 *      non-ISO timestamp rejected by Zod strict ISO-8601).
 *   6. 400 Idempotency-Key missing or non-UUID-v4.
 *   7. PlacementError → HTTP mapping for all 4 subclasses:
 *        - PlacementValidationError → 400
 *        - InvalidStateTransitionError → 409
 *        - PlacementNotFoundError → 404
 *        - PlacementIdempotencyConflictError → 409
 *   8. IdempotencyConflictError (from helper) → 409.
 *   9. Unexpected error → generic 500, body `{ error: 'INTERNAL' }`, no leak.
 *  10. Structured logger emits SafeMeta envelope with route/method/status/
 *      actorRole/resourceType/outcome/errorCode and minimal detail.
 *  11. Logger never emits raw actorId, body, evidence, acknowledgementRef,
 *      failureReason, token, Idempotency-Key or PII.
 *  12. Correlation-id header `x-request-id` is forwarded into log entries.
 *  13. `parseStrictIso8601Date` accepts strict ISO-8601, rejects loose
 *      Date.parse-able strings (C-02).
 *
 * Strategy:
 *   - Mock `@/src/shared/auth/auth-context` to control getAuthContext.
 *   - Mock `@/src/shared/auth/with-db-context` to bypass real DB tx.
 *   - Mock `@/src/shared/integrity/idempotency` to control withIdempotency
 *     behaviour (success / conflict / unexpected error).
 *   - Mock `@/src/lib/db` so `getPrisma()` returns a sentinel object.
 *   - Use the real canonical logger and `__captureSink` to assert emitted
 *     log entries.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────
// Module mocks — set up BEFORE importing the helper under test.
// ─────────────────────────────────────────────────────────────────────────

const getAuthContextMock = vi.fn();
vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: (...args: unknown[]) => getAuthContextMock(...args),
  AuthSessionError: class AuthSessionError extends Error {
    constructor(
      public readonly code: 'NO_TOKEN' | 'INVALID_TOKEN' | 'USER_INACTIVE' | 'USER_NOT_FOUND' | 'INTERNAL',
      message: string,
    ) {
      super(message);
      this.name = 'AuthSessionError';
    }
  },
}));

const withDbContextMock = vi.fn();
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (...args: unknown[]) => withDbContextMock(...args),
}));

const withIdempotencyMock = vi.fn();
vi.mock('@/src/shared/integrity/idempotency', () => ({
  withIdempotency: (...args: unknown[]) => withIdempotencyMock(...args),
  IdempotencyConflictError: class IdempotencyConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'IdempotencyConflictError';
    }
  },
}));

vi.mock('@/src/lib/db', () => ({
  getPrisma: vi.fn(() => ({ __prismaSentinel: true }) as unknown as Prisma.TransactionClient),
}));

// Import helper under test AFTER all `vi.mock` declarations above.
import {
  runPlacementCommand,
  parseStrictIso8601Date,
  STRICT_ISO8601,
  isUuidV4,
} from '@/src/domains/talent/placement.route-helpers';
import { AuthSessionError } from '@/src/shared/auth/auth-context';
import { IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import {
  PlacementValidationError,
  PlacementIdempotencyConflictError,
  InvalidStateTransitionError,
  PlacementNotFoundError,
} from '@/src/domains/talent/placement.errors';
import { __captureSink, __resetSink, type LogEntry } from '@/src/shared/observability/logger';

// ─────────────────────────────────────────────────────────────────────────
// Helpers — request builders + log capture.
// ─────────────────────────────────────────────────────────────────────────

const VALID_UUID = '11111111-1111-4111-8111-111111111111';
const IDEM_KEY = '22222222-2222-4222-8222-222222222222';

function buildReq(opts: {
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
}): NextRequest {
  const headers = new Headers(opts.headers ?? {});
  if (opts.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  return new NextRequest('http://localhost/api/test', {
    method: opts.method ?? 'POST',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

const VALID_AUTH = { userId: 'u-admin-1', role: 'ADMIN' as const };

let captured: { entries: LogEntry[] } | undefined;
beforeEach(() => {
  captured = __captureSink();
  getAuthContextMock.mockReset();
  withDbContextMock.mockReset();
  withIdempotencyMock.mockReset();
});

afterEach(() => {
  if (captured) {
    __resetSink();
    captured = undefined;
  }
});

/** Find the first log entry whose `event` matches the given pattern. */
function findLog(eventRe: RegExp): LogEntry | undefined {
  return captured?.entries.find((e) => eventRe.test(e.event));
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Auth-first ordering: 401 even with malformed placementId.
// ─────────────────────────────────────────────────────────────────────────

describe('runPlacementCommand — auth-first (C-02)', () => {
  it('1.1: unauthenticated request → 401 AuthSessionError', async () => {
    getAuthContextMock.mockRejectedValue(
      new AuthSessionError('NO_TOKEN', 'Missing or invalid JWT token'),
    );
    const res = await runPlacementCommand(buildReq({ body: {} }), {
      route: 'POST:/api/admin/placements',
      command: 'placement.create',
      parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
      run: async () => ({ ok: true }),
      statusCode: 201,
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'NO_TOKEN', message: 'Missing or invalid JWT token' });
    // Logger captured an auth_failed event.
    const entry = findLog(/placement\.command\.auth_failed/);
    expect(entry).toBeDefined();
    expect(entry!.level).toBe('warn');
    expect(entry!.meta.outcome).toBe('auth_failed');
    expect(entry!.meta.errorCode).toBe('NO_TOKEN');
    // actorRole field is OMITTED (top-level allow-list strips unknown /
    // undefined values); the canonical logger sanitizes long opaque strings
    // like placementId via `SENSITIVE_VALUE_RE`. Detail must only contain
    // the canonical command name.
    expect(entry!.meta.detail).toEqual({ command: 'placement.create' });
  });

  it('1.2: unauthenticated request with malformed placementId → 401, NOT 400', async () => {
    // Critical C-02 contract: even though placementId is malformed, auth runs
    // FIRST so the client sees 401 (token issue), not 400 (placementId issue).
    getAuthContextMock.mockRejectedValue(
      new AuthSessionError('NO_TOKEN', 'Missing or invalid JWT token'),
    );
    const res = await runPlacementCommand(buildReq({ body: {} }), {
      route: 'POST:/api/admin/placements/[id]/actions/confirm',
      command: 'placement.confirm',
      placementId: 'not-a-uuid-at-all', // intentionally malformed
      parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
      run: async () => ({ ok: true }),
      statusCode: 200,
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('NO_TOKEN');
    // Body parser / placementId validator must NEVER have run.
    expect(withIdempotencyMock).not.toHaveBeenCalled();
    expect(withDbContextMock).not.toHaveBeenCalled();
  });

  it('1.3: 401 INTERNAL AuthSessionError → 500 (auth context build failure)', async () => {
    getAuthContextMock.mockRejectedValue(
      new AuthSessionError('INTERNAL', 'Failed to load user'),
    );
    const res = await runPlacementCommand(buildReq({ body: {} }), {
      route: 'POST:/api/admin/placements',
      command: 'placement.create',
      parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
      run: async () => ({ ok: true }),
      statusCode: 201,
    });
    expect(res.status).toBe(500);
    const entry = findLog(/placement\.command\.auth_internal_error/);
    expect(entry).toBeDefined();
    expect(entry!.level).toBe('error');
  });

  it('1.4: getAuthContext throws a non-AuthSessionError → 500 with safe logger', async () => {
    getAuthContextMock.mockRejectedValue(new Error('random DB blip'));
    const res = await runPlacementCommand(buildReq({ body: {} }), {
      route: 'POST:/api/admin/placements',
      command: 'placement.create',
      parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
      run: async () => ({ ok: true }),
      statusCode: 201,
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'INTERNAL', message: 'Failed to build auth context' });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Role gate (C-02).
// ─────────────────────────────────────────────────────────────────────────

describe('runPlacementCommand — role gate', () => {
  it('2.1: HR_STAFF → 403 FORBIDDEN, never touches DB', async () => {
    getAuthContextMock.mockResolvedValue({ userId: 'u-hrstaff', role: 'HR_STAFF' });
    const res = await runPlacementCommand(buildReq({ body: {} }), {
      route: 'POST:/api/admin/placements',
      command: 'placement.create',
      parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
      run: async () => ({ ok: true }),
      statusCode: 201,
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('FORBIDDEN');
    expect(withIdempotencyMock).not.toHaveBeenCalled();
    expect(withDbContextMock).not.toHaveBeenCalled();
    const entry = findLog(/placement\.command\.forbidden/);
    expect(entry).toBeDefined();
    expect(entry!.meta.actorRole).toBe('HR_STAFF');
    expect(entry!.meta.outcome).toBe('forbidden');
  });

  it('2.2: ADMIN passes role gate (placementId malformed → 400 VALIDATION)', async () => {
    getAuthContextMock.mockResolvedValue(VALID_AUTH);
    const res = await runPlacementCommand(buildReq({ body: {} }), {
      route: 'POST:/api/admin/placements/[id]/actions/confirm',
      command: 'placement.confirm',
      placementId: 'malformed',
      parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
      run: async () => ({ ok: true }),
      statusCode: 200,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'VALIDATION', message: 'placementId phải là UUID v4' });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. placementId + body + Idempotency-Key validation.
// ─────────────────────────────────────────────────────────────────────────

describe('runPlacementCommand — strict validation', () => {
  beforeEach(() => {
    getAuthContextMock.mockResolvedValue(VALID_AUTH);
  });

  it('3.1: well-formed placementId after auth passes placementId gate', async () => {
    withIdempotencyMock.mockResolvedValue({
      body: { placementId: VALID_UUID, status: 'CONFIRMED', replayed: false },
      statusCode: 200,
      replayed: false,
    });
    const res = await runPlacementCommand(buildReq({ body: {}, headers: { 'x-idempotency-key': IDEM_KEY } }), {
      route: 'POST:/api/admin/placements/[id]/actions/confirm',
      command: 'placement.confirm',
      placementId: VALID_UUID,
      parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
      run: async () => ({ placementId: VALID_UUID, status: 'CONFIRMED', replayed: false }),
      statusCode: 200,
    });
    expect(res.status).toBe(200);
  });

  it('3.2: body parser rejects unknown fields → 400 VALIDATION (no DB)', async () => {
    const parseBody = vi.fn((raw: unknown) => {
      const obj = raw as Record<string, unknown>;
      if (Object.keys(obj).length > 0) {
        return { ok: false as const, error: 'VALIDATION', message: 'unknown field' };
      }
      return { ok: true as const, value: {} as Record<string, never> };
    });
    const res = await runPlacementCommand(buildReq({ body: { secret: 'x' } }), {
      route: 'POST:/api/admin/placements/[id]/actions/confirm',
      command: 'placement.confirm',
      placementId: VALID_UUID,
      parseBody,
      run: async () => ({ ok: true }),
      statusCode: 200,
    });
    expect(res.status).toBe(400);
    expect(parseBody).toHaveBeenCalled();
    expect(withIdempotencyMock).not.toHaveBeenCalled();
    const entry = findLog(/placement\.command\.validation_failed/);
    expect(entry).toBeDefined();
    expect(entry!.meta.errorCode).toBe('VALIDATION');
  });

  it('3.3: invalid JSON body → 400 VALIDATION (no parser invoked, no DB)', async () => {
    const parseBody = vi.fn(() => ({ ok: true as const, value: {} as Record<string, never> }));
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-json',
    });
    const res = await runPlacementCommand(req, {
      route: 'POST:/api/admin/placements/[id]/actions/confirm',
      command: 'placement.confirm',
      placementId: VALID_UUID,
      parseBody,
      run: async () => ({ ok: true }),
      statusCode: 200,
    });
    expect(res.status).toBe(400);
    expect(parseBody).not.toHaveBeenCalled();
  });

  it('3.4: missing Idempotency-Key → 400 IDEMPOTENCY_REQUIRED', async () => {
    const res = await runPlacementCommand(buildReq({ body: {} }), {
      route: 'POST:/api/admin/placements/[id]/actions/confirm',
      command: 'placement.confirm',
      placementId: VALID_UUID,
      parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
      run: async () => ({ ok: true }),
      statusCode: 200,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('IDEMPOTENCY_REQUIRED');
    expect(withIdempotencyMock).not.toHaveBeenCalled();
    const entry = findLog(/placement\.command\.idempotency_missing/);
    expect(entry).toBeDefined();
  });

  it('3.5: non-UUID-v4 Idempotency-Key → 400 IDEMPOTENCY_REQUIRED', async () => {
    const res = await runPlacementCommand(
      buildReq({ body: {}, headers: { 'x-idempotency-key': 'not-a-uuid' } }),
      {
        route: 'POST:/api/admin/placements/[id]/actions/confirm',
        command: 'placement.confirm',
        placementId: VALID_UUID,
        parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
        run: async () => ({ ok: true }),
        statusCode: 200,
      },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('IDEMPOTENCY_REQUIRED');
    expect(withIdempotencyMock).not.toHaveBeenCalled();
    const entry = findLog(/placement\.command\.idempotency_invalid/);
    expect(entry).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. PlacementError → HTTP mapping (4 subclasses).
// ─────────────────────────────────────────────────────────────────────────

describe('runPlacementCommand — PlacementError HTTP mapping (C-07)', () => {
  beforeEach(() => {
    getAuthContextMock.mockResolvedValue(VALID_AUTH);
  });

  function setupIdempotencyThrow(err: unknown): void {
    withIdempotencyMock.mockImplementation(async () => {
      throw err;
    });
  }

  it('4.1: PlacementValidationError → 400 PLACEMENT_VALIDATION_ERROR (with details)', async () => {
    const details = { placementId: VALID_UUID, hint: 'FK chain broken' };
    setupIdempotencyThrow(
      new PlacementValidationError('FK chain broken', details),
    );
    const res = await runPlacementCommand(
      buildReq({ body: {}, headers: { 'x-idempotency-key': IDEM_KEY } }),
      {
        route: 'POST:/api/admin/placements/[id]/actions/confirm',
        command: 'placement.confirm',
        placementId: VALID_UUID,
        parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
        run: async () => ({ ok: true }),
        statusCode: 200,
      },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('PLACEMENT_VALIDATION_ERROR');
    expect(body.details).toEqual(details);
  });

  it('4.2: InvalidStateTransitionError → 409 INVALID_STATE_TRANSITION', async () => {
    setupIdempotencyThrow(
      new InvalidStateTransitionError('cancel after EFFECTIVE rejected', 'EFFECTIVE', 'CANCELLED'),
    );
    const res = await runPlacementCommand(
      buildReq({ body: {}, headers: { 'x-idempotency-key': IDEM_KEY } }),
      {
        route: 'POST:/api/admin/placements/[id]/actions/cancel',
        command: 'placement.cancel',
        placementId: VALID_UUID,
        parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
        run: async () => ({ ok: true }),
        statusCode: 200,
      },
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('INVALID_STATE_TRANSITION');
  });

  it('4.3: PlacementNotFoundError → 404 PLACEMENT_NOT_FOUND', async () => {
    setupIdempotencyThrow(new PlacementNotFoundError(VALID_UUID));
    const res = await runPlacementCommand(
      buildReq({ body: {}, headers: { 'x-idempotency-key': IDEM_KEY } }),
      {
        route: 'POST:/api/admin/placements/[id]/actions/confirm',
        command: 'placement.confirm',
        placementId: VALID_UUID,
        parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
        run: async () => ({ ok: true }),
        statusCode: 200,
      },
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('PLACEMENT_NOT_FOUND');
  });

  it('4.4: PlacementIdempotencyConflictError → 409 PLACEMENT_IDEMPOTENCY_CONFLICT', async () => {
    setupIdempotencyThrow(
      new PlacementIdempotencyConflictError('DB race lost', VALID_UUID),
    );
    const res = await runPlacementCommand(
      buildReq({ body: {}, headers: { 'x-idempotency-key': IDEM_KEY } }),
      {
        route: 'POST:/api/admin/placements/[id]/actions/cancel',
        command: 'placement.cancel',
        placementId: VALID_UUID,
        parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
        run: async () => ({ ok: true }),
        statusCode: 200,
      },
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('PLACEMENT_IDEMPOTENCY_CONFLICT');
  });

  it('4.5: IdempotencyConflictError (from helper) → 409 IDEMPOTENCY_CONFLICT', async () => {
    setupIdempotencyThrow(
      new IdempotencyConflictError('same key, different payload'),
    );
    const res = await runPlacementCommand(
      buildReq({ body: {}, headers: { 'x-idempotency-key': IDEM_KEY } }),
      {
        route: 'POST:/api/admin/placements/[id]/actions/confirm',
        command: 'placement.confirm',
        placementId: VALID_UUID,
        parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
        run: async () => ({ ok: true }),
        statusCode: 200,
      },
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('IDEMPOTENCY_CONFLICT');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Unexpected error → generic 500, no message leak, structured log.
// ─────────────────────────────────────────────────────────────────────────

describe('runPlacementCommand — unexpected error → 500 generic (C-07)', () => {
  it('5.1: withIdempotency throws generic Error → 500 { error: INTERNAL }', async () => {
    getAuthContextMock.mockResolvedValue(VALID_AUTH);
    withIdempotencyMock.mockImplementation(async () => {
      throw new Error('SECRET INTERNAL CONTEXT: connection terminated; pwd=hunter2; cccd=012345678901');
    });
    const res = await runPlacementCommand(
      buildReq({ body: {}, headers: { 'x-idempotency-key': IDEM_KEY } }),
      {
        route: 'POST:/api/admin/placements/[id]/actions/confirm',
        command: 'placement.confirm',
        placementId: VALID_UUID,
        parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
        run: async () => ({ ok: true }),
        statusCode: 200,
      },
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'INTERNAL' });
    // The body MUST NOT contain the internal error message or any PII.
    const serialised = JSON.stringify(body);
    expect(serialised).not.toContain('SECRET');
    expect(serialised).not.toContain('hunter2');
    expect(serialised).not.toContain('012345678901');
    expect(serialised).not.toContain('connection terminated');
  });

  it('5.2: withDbContext throws generic Error → 500 (only AFTER idempotency)', async () => {
    getAuthContextMock.mockResolvedValue(VALID_AUTH);
    withIdempotencyMock.mockImplementation(async (opts: {
      handler: () => Promise<{ body: unknown; statusCode: number }>;
    }) => {
      // Replicate the real wrapper: invoke the handler so the underlying
      // withDbContext call is exercised, and surface whatever it throws.
      return opts.handler();
    });
    withDbContextMock.mockImplementation(async () => {
      throw new Error('RLS GUC application failure; secret=abc12345678901234567890');
    });
    const res = await runPlacementCommand(
      buildReq({ body: {}, headers: { 'x-idempotency-key': IDEM_KEY } }),
      {
        route: 'POST:/api/admin/placements',
        command: 'placement.create',
        parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
        run: async () => ({ ok: true }),
        statusCode: 201,
      },
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'INTERNAL' });
  });

  it('5.3: structured logger emits `placement.command.unexpected_error` with safe detail', async () => {
    getAuthContextMock.mockResolvedValue(VALID_AUTH);
    withIdempotencyMock.mockImplementation(async () => {
      throw new Error('internal details that must NEVER appear in log');
    });
    await runPlacementCommand(
      buildReq({ body: {}, headers: { 'x-idempotency-key': IDEM_KEY } }),
      {
        route: 'POST:/api/admin/placements/[id]/actions/cancel',
        command: 'placement.cancel',
        placementId: VALID_UUID,
        parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
        run: async () => ({ ok: true }),
        statusCode: 200,
      },
    );
    const entry = findLog(/placement\.command\.unexpected_error/);
    expect(entry).toBeDefined();
    expect(entry!.level).toBe('error');
    expect(entry!.meta.status).toBe(500);
    expect(entry!.meta.outcome).toBe('unexpected_error');
    expect(entry!.meta.errorCode).toBe('INTERNAL');
    expect(entry!.meta.actorRole).toBe('ADMIN');
    expect(entry!.meta.resourceType).toBe('placement_command');
    // C-03 round-2: the canonical logger sanitizes long opaque identifiers
    // (UUIDs match `[\w.+-]{20,}`) → placementId appears as `[REDACTED]`.
    // This is the safe outcome the user mandated ("không log data nhạy cảm").
    // The detail envelope still carries `command` verbatim (short, safe).
    const detail = entry!.meta.detail as Record<string, unknown>;
    expect(detail.command).toBe('placement.cancel');
    expect(detail.placementId).toBe('[REDACTED]');
    // Serialised log must NOT include raw error text.
    const serialised = JSON.stringify(entry);
    expect(serialised).not.toContain('internal details');
    expect(serialised).not.toContain('must NEVER');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Structured logger safe-shape (C-03).
// ─────────────────────────────────────────────────────────────────────────

describe('runPlacementCommand — structured logger safe shape', () => {
  it('6.1: success log includes all SafeMeta fields + minimal detail', async () => {
    getAuthContextMock.mockResolvedValue(VALID_AUTH);
    withIdempotencyMock.mockResolvedValue({
      body: { placementId: VALID_UUID, status: 'CONFIRMED', replayed: false },
      statusCode: 200,
      replayed: false,
    });
    const res = await runPlacementCommand(
      buildReq({ body: {}, headers: { 'x-idempotency-key': IDEM_KEY, 'x-request-id': 'req-fixed-12345678' } }),
      {
        route: 'POST:/api/admin/placements/[id]/actions/confirm',
        command: 'placement.confirm',
        placementId: VALID_UUID,
        parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
        run: async () => ({ placementId: VALID_UUID, status: 'CONFIRMED', replayed: false }),
        statusCode: 200,
      },
    );
    expect(res.status).toBe(200);

    const entry = findLog(/placement\.command\.success/);
    expect(entry).toBeDefined();
    expect(entry!.level).toBe('info');
    expect(entry!.meta.route).toBe('POST:/api/admin/placements/[id]/actions/confirm');
    expect(entry!.meta.method).toBe('POST');
    expect(entry!.meta.status).toBe(200);
    expect(entry!.meta.actorRole).toBe('ADMIN');
    expect(entry!.meta.resourceType).toBe('placement_command');
    expect(entry!.meta.outcome).toBe('success');
    // C-03 round-2: canonical logger sanitizes long opaque identifiers →
    // `placementId` is `[REDACTED]`. `command` and `replayed` survive.
    const detail = entry!.meta.detail as Record<string, unknown>;
    expect(detail.command).toBe('placement.confirm');
    expect(detail.placementId).toBe('[REDACTED]');
    expect(detail.replayed).toBe(false);
    // requestId is forwarded from `x-request-id` header.
    expect(entry!.requestId).toBe('req-fixed-12345678');
  });

  it('6.2: logger never emits raw actorId, body, evidence, acknowledgementRef, failureReason, Idempotency-Key, token, or PII', async () => {
    getAuthContextMock.mockResolvedValue(VALID_AUTH);
    withIdempotencyMock.mockImplementation(async (opts: { actorId: string; key: string; requestBody: unknown }) => {
      // Pretend the handler threw with PII in evidence + failureReason.
      throw new Error(
        `actorId=${opts.actorId} key=${opts.key} ` +
          'evidence.clientAcknowledgedByUserId=u-123 acknowledgementRef=REF-456 ' +
          'failureReason="worker phone 0901234567 cccd 012345678901"',
      );
    });
    await runPlacementCommand(
      buildReq({
        body: { evidence: { clientAcknowledgedByUserId: 'u-123', acknowledgementRef: 'REF-456' } },
        headers: { 'x-idempotency-key': IDEM_KEY },
      }),
      {
        route: 'POST:/api/admin/placements/[id]/actions/effective',
        command: 'placement.effective',
        placementId: VALID_UUID,
        parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
        run: async () => ({ ok: true }),
        statusCode: 200,
      },
    );
    // Capture ALL emitted log entries.
    const allEntries = captured!.entries;
    expect(allEntries.length).toBeGreaterThan(0);
    const forbiddenSubstrings = [
      'u-123',
      'REF-456',
      'worker phone',
      '0901234567',
      '012345678901',
      IDEM_KEY, // idempotency key MUST NOT leak
    ];
    for (const entry of allEntries) {
      const blob = JSON.stringify(entry);
      for (const bad of forbiddenSubstrings) {
        expect(blob, `entry event=${entry.event} leaked ${bad}`).not.toContain(bad);
      }
      // meta must never carry actorId at top level (only via actorRole + resourceType/outcome).
      expect(entry.meta).not.toHaveProperty('actorId');
      // meta must never carry `failureReason`, `body`, `evidence`, `acknowledgementRef`, `token`.
      expect(entry.meta).not.toHaveProperty('failureReason');
      expect(entry.meta).not.toHaveProperty('body');
      expect(entry.meta).not.toHaveProperty('evidence');
      expect(entry.meta).not.toHaveProperty('acknowledgementRef');
      expect(entry.meta).not.toHaveProperty('token');
      // detail.command + placementId + replayed only.
      if (entry.meta.detail && typeof entry.meta.detail === 'object') {
        const detailKeys = Object.keys(entry.meta.detail);
        expect(detailKeys.every((k) => ['command', 'placementId', 'replayed'].includes(k))).toBe(true);
      }
    }
  });

  it('6.3: generated correlation id when x-request-id absent', async () => {
    getAuthContextMock.mockResolvedValue(VALID_AUTH);
    withIdempotencyMock.mockResolvedValue({
      body: { placementId: VALID_UUID, status: 'CONFIRMED', replayed: false },
      statusCode: 200,
      replayed: false,
    });
    await runPlacementCommand(
      buildReq({ body: {}, headers: { 'x-idempotency-key': IDEM_KEY } }),
      {
        route: 'POST:/api/admin/placements/[id]/actions/confirm',
        command: 'placement.confirm',
        placementId: VALID_UUID,
        parseBody: () => ({ ok: true, value: {} as Record<string, never> }),
        run: async () => ({ placementId: VALID_UUID, status: 'CONFIRMED', replayed: false }),
        statusCode: 200,
      },
    );
    const entry = findLog(/placement\.command\.success/);
    expect(entry).toBeDefined();
    expect(entry!.requestId).toMatch(/^[0-9a-f-]{36}$/i); // UUID v4
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Strict ISO-8601 (Zod-backed).
// ─────────────────────────────────────────────────────────────────────────

describe('parseStrictIso8601Date (C-02)', () => {
  it('7.1: accepts strict RFC 3339 (Z and offset)', () => {
    expect(parseStrictIso8601Date('2026-01-01T00:00:00Z').toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
    expect(parseStrictIso8601Date('2026-01-01T00:00:00.123Z').toISOString()).toBe(
      '2026-01-01T00:00:00.123Z',
    );
    // `2026-01-01T07:00:00+07:00` = midnight UTC the same day.
    expect(parseStrictIso8601Date('2026-01-01T07:00:00+07:00').toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
    // A west offset lands on the previous UTC day.
    expect(parseStrictIso8601Date('2026-01-01T18:00:00-07:00').toISOString()).toBe(
      '2026-01-02T01:00:00.000Z',
    );
  });

  it('7.2: rejects loose strings that Date.parse accepts', () => {
    // `Date.parse("Jan 1 2026")` returns a valid timestamp but it is NOT ISO-8601.
    expect(() => parseStrictIso8601Date('Jan 1 2026')).toThrow();
    // Date.parse-style loose string.
    expect(() => parseStrictIso8601Date('01/01/2026')).toThrow();
    // Missing time component.
    expect(() => parseStrictIso8601Date('2026-01-01')).toThrow();
    // Not even a date.
    expect(() => parseStrictIso8601Date('definitely-not-a-date')).toThrow();
    // Empty string.
    expect(() => parseStrictIso8601Date('')).toThrow();
  });

  it('7.3: STRICT_ISO8601 is exported for downstream tests', () => {
    expect(STRICT_ISO8601.safeParse('2026-01-01T00:00:00Z').success).toBe(true);
    expect(STRICT_ISO8601.safeParse('Jan 1 2026').success).toBe(false);
  });

  it('7.4: isUuidV4 helper round-trips strict UUID v4', () => {
    expect(isUuidV4(VALID_UUID)).toBe(true);
    expect(isUuidV4('not-a-uuid')).toBe(false);
    // UUID v1 (version digit `1`) is REJECTED.
    expect(isUuidV4('11111111-1111-1111-1111-111111111111')).toBe(false);
  });
});
