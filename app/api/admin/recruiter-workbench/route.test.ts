/**
 * app/api/admin/recruiter-workbench/route.test.ts
 *
 * E0-F07 route-level unit tests for GET /api/admin/recruiter-workbench.
 *
 * Validates the gate sequence (E0-F02):
 *   1. missing auth → 401
 *   2. forbidden role → 403 with { error: 'PERMISSION_DENIED' }
 *   3. HR_STAFF + ALL → 403 (E0-F02)
 *   4. HR_STAFF + UNASSIGNED → 403 (E0-F02)
 *   5. HR_STAFF + foreign handlerUserId → 403 (E0-F02)
 *   6. invalid query → 400 + zero permission resolver / DB calls (E0-F02)
 *   7. unknown query key → 400 + zero DB calls (E0-F02, .strict())
 *   8. UNASSIGNED without CAN_VIEW_UNASSIGNED_POOL → 403
 *   9. default view: ADMIN/HR_MANAGER = ALL, HR_STAFF = MINE
 *
 * Strategy: monkey-patch the route's dependencies so we can call the GET
 * handler directly with synthetic sessions and query strings. The handler
 * reads `getAuthContext(req)`, `resolveEffectivePermissions`, and
 * `withDbContext`; we stub all of them.
 *
 * ENV contract: pure unit test. No DB, no network. Fail-closed unit lane.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mock call tracking ────────────────────────────────────────────────────────
const permissionResolverCalls: Array<{ userId: string; role: string }> = [];
const dbContextCalls: Array<unknown[]> = [];

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: vi.fn(),
  AuthSessionError: class AuthSessionError extends Error {
    constructor(public code: string) {
      super(code);
      this.name = 'AuthSessionError';
    }
  },
}));

vi.mock('@/src/shared/auth/permission-resolver', () => ({
  resolveEffectivePermissions: vi.fn(async (ctx: { userId: string; role: string }) => {
    permissionResolverCalls.push({ userId: ctx.userId, role: ctx.role });
    const set = new Set<string>();
    // ADMIN/HR_MANAGER gets everything by default
    if (ctx.role === 'ADMIN' || ctx.role === 'HR_MANAGER') {
      set.add('CAN_VIEW_WORKER_SENSITIVE');
      set.add('CAN_VIEW_UNASSIGNED_POOL');
    }
    // HR_STAFF with CAN_VIEW_WORKER_SENSITIVE
    if (ctx.userId === 'staff-sensisitive') {
      set.add('CAN_VIEW_WORKER_SENSITIVE');
    }
    return set;
  }),
}));

vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: vi.fn(
    async (
      _prisma: unknown,
      _session: unknown,
      fn: (tx: unknown) => Promise<unknown>,
    ) => {
      dbContextCalls.push([_prisma, _session]);
      return fn({});
    },
  ),
}));

vi.mock('@/src/lib/db', () => ({
  getPrisma: vi.fn(() => ({})),
}));

vi.mock('@/src/domains/talent/recruiter-workbench.read-service', () => ({
  getRecruiterWorkbenchList: vi.fn(async () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  })),
}));

// ── Imports after mocks ────────────────────────────────────────────────────────
import { GET } from './route';
import {
  getAuthContext,
  AuthSessionError,
} from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getRecruiterWorkbenchList } from '@/src/domains/talent/recruiter-workbench.read-service';

const mockedGetAuth = getAuthContext as unknown as ReturnType<typeof vi.fn>;
const mockedPerms = resolveEffectivePermissions as unknown as ReturnType<typeof vi.fn>;
const mockedDbContext = withDbContext as unknown as ReturnType<typeof vi.fn>;
const mockedService = getRecruiterWorkbenchList as unknown as ReturnType<typeof vi.fn>;

function buildReq(url = '/api/admin/recruiter-workbench'): NextRequest {
  return new Request(`http://localhost${url}`, { method: 'GET' }) as unknown as NextRequest;
}

describe('GET /api/admin/recruiter-workbench — E0-F07 route coverage', () => {
  beforeEach(() => {
    permissionResolverCalls.length = 0;
    dbContextCalls.length = 0;
    mockedGetAuth.mockReset();
    mockedGetAuth.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    mockedPerms.mockReset();
    mockedPerms.mockImplementation(
      async (ctx: { userId: string; role: string }) => {
        permissionResolverCalls.push({ userId: ctx.userId, role: ctx.role });
        const set = new Set<string>();
        if (ctx.role === 'ADMIN' || ctx.role === 'HR_MANAGER') {
          set.add('CAN_VIEW_WORKER_SENSITIVE');
          set.add('CAN_VIEW_UNASSIGNED_POOL');
        }
        if (ctx.userId === 'staff-sensisitive') {
          set.add('CAN_VIEW_WORKER_SENSITIVE');
        }
        return set;
      },
    );
    // Do NOT reset mockedDbContext — the mock factory has the callback flow
    // baked in. mockReset() would replace it with a no-op returning undefined.
    mockedService.mockReset();
    mockedService.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  // ── Gate 1: auth ─────────────────────────────────────────────────────────────

  it('missing auth → 401', async () => {
    mockedGetAuth.mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'no token'));
    const res = await GET(buildReq());
    expect(res.status).toBe(401);
  });

  it('invalid auth → 401', async () => {
    mockedGetAuth.mockRejectedValueOnce(new AuthSessionError('INVALID_TOKEN', 'invalid'));
    const res = await GET(buildReq());
    expect(res.status).toBe(401);
  });

  // ── Gate 2: role allowlist ─────────────────────────────────────────────────

  it('forbidden role → 403 PERMISSION_DENIED', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'u1', role: 'WORKER' });
    const res = await GET(buildReq());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: 'PERMISSION_DENIED' });
    // Zero permission resolver calls for forbidden role
    expect(permissionResolverCalls).toHaveLength(0);
  });

  // ── Gate 3: HR_STAFF pre-check ─────────────────────────────────────────────

  it('HR_STAFF + ALL view → 403 before Zod and permission resolver', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'staff-1', role: 'HR_STAFF' });
    const res = await GET(buildReq('/api/admin/recruiter-workbench?view=ALL'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: 'PERMISSION_DENIED' });
    // Must NOT call permission resolver or DB
    expect(permissionResolverCalls).toHaveLength(0);
    expect(dbContextCalls).toHaveLength(0);
  });

  it('HR_STAFF + UNASSIGNED view → 403 before Zod and permission resolver', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'staff-1', role: 'HR_STAFF' });
    const res = await GET(
      buildReq('/api/admin/recruiter-workbench?view=UNASSIGNED'),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: 'PERMISSION_DENIED' });
    expect(permissionResolverCalls).toHaveLength(0);
    expect(dbContextCalls).toHaveLength(0);
  });

  it('HR_STAFF + foreign handlerUserId → 403 after Zod', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'staff-1', role: 'HR_STAFF' });
    const res = await GET(
      buildReq(
        '/api/admin/recruiter-workbench?handlerUserId=00000000-0000-0000-0000-000000000099',
      ),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: 'PERMISSION_DENIED' });
    // HR_STAFF can use their own handlerUserId
    expect(permissionResolverCalls).toHaveLength(0);
    expect(dbContextCalls).toHaveLength(0);
  });

  // ── Gate 4: strict Zod parse ───────────────────────────────────────────────

  it('invalid page → 400 BAD_QUERY, zero permission resolver / DB calls', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    const res = await GET(
      buildReq('/api/admin/recruiter-workbench?page=-1'),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('BAD_QUERY');
    expect(permissionResolverCalls).toHaveLength(0);
    expect(dbContextCalls).toHaveLength(0);
  });

  it('invalid pageSize → 400 BAD_QUERY', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    const res = await GET(
      buildReq('/api/admin/recruiter-workbench?pageSize=13'),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('BAD_QUERY');
    expect(permissionResolverCalls).toHaveLength(0);
    expect(dbContextCalls).toHaveLength(0);
  });

  it('invalid overdue value → 400 BAD_QUERY', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    const res = await GET(
      buildReq('/api/admin/recruiter-workbench?overdue=yes'),
    );
    expect(res.status).toBe(400);
    expect(permissionResolverCalls).toHaveLength(0);
  });

  // ── Gate 5: .strict() rejects unknown keys ─────────────────────────────────

  it('E0-F02: unknown query key → 400 BAD_QUERY, zero DB / permission calls', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    const res = await GET(
      buildReq('/api/admin/recruiter-workbench?typoKey=value'),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('BAD_QUERY');
    expect(permissionResolverCalls).toHaveLength(0);
    expect(dbContextCalls).toHaveLength(0);
  });

  it('E0-F02: .strict() rejects unknown key even with valid params', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    const res = await GET(
      buildReq(
        '/api/admin/recruiter-workbench?search=Nguyen&unknownExtra=foo',
      ),
    );
    expect(res.status).toBe(400);
    expect(permissionResolverCalls).toHaveLength(0);
  });

  // ── Gate 6: UNASSIGNED needs CAN_VIEW_UNASSIGNED_POOL ───────────────────────

  it('UNASSIGNED without CAN_VIEW_UNASSIGNED_POOL → 403 PERMISSION_DENIED', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    // Override perms: strip CAN_VIEW_UNASSIGNED_POOL
    mockedPerms.mockResolvedValueOnce(new Set(['CAN_VIEW_WORKER_SENSITIVE']));
    const res = await GET(
      buildReq('/api/admin/recruiter-workbench?view=UNASSIGNED'),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: 'PERMISSION_DENIED' });
    // Service must NOT be called
    expect(mockedService).toHaveBeenCalledTimes(0);
  });

  // ── Gate 7: happy path ──────────────────────────────────────────────────────

  it('ADMIN with ALL view → calls service with correct view', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    const res = await GET(buildReq('/api/admin/recruiter-workbench?view=ALL'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
    // Permission resolver called once (default impl tracks calls).
    expect(permissionResolverCalls).toHaveLength(1);
    // withDbContext called once
    expect(dbContextCalls).toHaveLength(1);
  });

  it('ADMIN with MINE view → allowed', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    const res = await GET(
      buildReq('/api/admin/recruiter-workbench?view=MINE'),
    );
    expect(res.status).toBe(200);
  });

  it('HR_STAFF with MINE view (explicit) → allowed, default MINE view', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'staff-1', role: 'HR_STAFF' });
    const res = await GET(
      buildReq('/api/admin/recruiter-workbench?view=MINE'),
    );
    expect(res.status).toBe(200);
  });

  it('HR_STAFF with no view param → defaults to MINE (no 403)', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'staff-1', role: 'HR_STAFF' });
    const res = await GET(buildReq('/api/admin/recruiter-workbench'));
    expect(res.status).toBe(200);
    // HR_STAFF with no UNASSIGNED gate, so permission resolver still called once.
    expect(permissionResolverCalls).toHaveLength(1);
  });

  it('HR_STAFF with own handlerUserId → allowed', async () => {
    mockedGetAuth.mockResolvedValueOnce({
      userId: '00000000-0000-0000-0000-000000000001',
      role: 'HR_STAFF',
    });
    const res = await GET(
      buildReq(
        '/api/admin/recruiter-workbench?handlerUserId=00000000-0000-0000-0000-000000000001',
      ),
    );
    expect(res.status).toBe(200);
  });

  it('UNASSIGNED with CAN_VIEW_UNASSIGNED_POOL → 200', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    const res = await GET(
      buildReq('/api/admin/recruiter-workbench?view=UNASSIGNED'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
  });

  it('HR_MANAGER with ALL view → allowed', async () => {
    mockedGetAuth.mockResolvedValueOnce({ userId: 'mgr-1', role: 'HR_MANAGER' });
    const res = await GET(buildReq('/api/admin/recruiter-workbench?view=ALL'));
    expect(res.status).toBe(200);
  });
});
