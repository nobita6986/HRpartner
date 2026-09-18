/**
 * attribution-redirect.service.test.ts — hrp-v6-n2-aff-02-link-capture (N2-2).
 *
 * Unit tests for resolveReferralRedirect(). All DB calls are mocked at the
 * PrismaClient level; no live DB connection.
 *
 * Coverage:
 *   - input validation (code format, job allowlist, open-redirect)
 *   - referrer lookup (found / not found / error)
 *   - cookie logic (no cookie, invalid, cross-referrer first-click, row-gone, referrer-inactive)
 *   - engine write (happy path, set_config, P2002 -> WRITE_FAILED, RLS deny)
 *   - Decision A 3: no advisory lock
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RedirectOutcome, RedirectDeps } from './attribution-redirect.service';

/* ─── Shared mutable state ─────────────────────────────────────────────── */

const shared = vi.hoisted(() => ({
  mode: 'happy' as
    | 'happy'
    | 'referrer_not_found'
    | 'writer_error'
    | 'cookie_row_gone'
    | 'cookie_referrer_inactive'
    | 'cookie_engine_error'
    | 'engine_insert_error'
    | 'engine_insert_p2002',
  engineWriteWasCalled: false,
  COOKIE_ROW_REFERRER_ID: 'cookie-referrer-user-uuid',
  CLICK_REFERRER_ID: 'click-referrer-user-uuid',
}));

vi.mock('@/src/shared/observability/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

import { resolveReferralRedirect } from './attribution-redirect.service';

/* ─── Mock factories ─────────────────────────────────────────────────── */

/**
 * Writer mock: handles two distinct queries by SQL fragment:
 *   1. SELECT ... FROM users WHERE "aff_code" = ? AND is_active  → click-time referrer lookup
 *   2. SELECT ... FROM users WHERE id = ? AND is_active        → cookie-row referrer check
 */
function makeWriter(): RedirectDeps['writer'] {
  return {
    $queryRaw: vi.fn(async (sql: unknown) => {
      const obj = sql as { strings?: string[] };
      const text = Array.isArray(obj.strings) ? obj.strings.join('') : String(sql);
      if (shared.mode === 'writer_error') throw new Error('db down');
      // Click-time referrer lookup
      if (text.includes('"aff_code"')) {
        if (shared.mode === 'referrer_not_found') return [];
        return [{ id: shared.CLICK_REFERRER_ID }];
      }
      // Cookie-row referrer check (verifyCookieAgainstRow step 2)
      if (shared.mode === 'cookie_referrer_inactive') return [];
      return [{ id: shared.COOKIE_ROW_REFERRER_ID }];
    }),
  } as unknown as RedirectDeps['writer'];
}

/**
 * Engine tx mock:
 *   1. $executeRawUnsafe → set_config (always returns 1)
 *   2. $queryRaw SELECT ... AND status = 'ACTIVE' (no RETURNING)
 *      → verifyCookieAgainstRow step 1 (returns cookie row referrer)
 *   3. $queryRaw INSERT ... RETURNING id::text AS id
 *      → writeAttributionViaEngine (returns new attribution id)
 *
 * Prisma Sql objects: { strings: string[], values: unknown[] }
 * We distinguish SELECT (no RETURNING) from INSERT (has RETURNING).
 */
function makeEngine(): RedirectDeps['engine'] {
  shared.engineWriteWasCalled = false;
  const tx: any = {
    $executeRawUnsafe: vi.fn(async () => 1),
    $queryRaw: vi.fn(async (sql: unknown) => {
      const obj = sql as { strings?: string[]; values?: unknown[] };
      const text = Array.isArray(obj.strings) ? obj.strings.join('') : String(sql);

      // verifyCookieAgainstRow SELECT: status = 'ACTIVE', no RETURNING
      if (text.includes("'ACTIVE'") && !text.includes('RETURNING')) {
        if (shared.mode === 'cookie_row_gone') return [];
        if (shared.mode === 'cookie_engine_error') throw new Error('engine offline');
        return [{ referrer_user_id: shared.COOKIE_ROW_REFERRER_ID }];
      }

      // writeAttributionViaEngine INSERT: has RETURNING id::text AS id
      if (text.includes('RETURNING')) {
        shared.engineWriteWasCalled = true;
        if (shared.mode === 'engine_insert_error') {
          const e: any = new Error('RLS denied');
          e.code = '42501';
          throw e;
        }
        if (shared.mode === 'engine_insert_p2002') {
          const e: any = new Error('unique');
          e.code = 'P2002';
          throw e;
        }
        return [{ id: 'new-attr-uuid' }];
      }

      throw new Error('Unexpected engine $queryRaw: ' + text.slice(0, 80));
    }),
  };
  const result: any = {
    $transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
    _tx: tx,
  };
  return result as RedirectDeps['engine'];
}

/* ─── Narrowing helpers ─────────────────────────────────────────────── */

function asDest(o: RedirectOutcome): asserts o is Extract<RedirectOutcome, { destination: string }> {
  if (!('destination' in o)) throw new Error('Expected destination, got: ' + o.kind);
}

function asCookie(o: RedirectOutcome): asserts o is Extract<RedirectOutcome, { cookieToken: string }> {
  if (!('cookieToken' in o)) throw new Error('Expected cookieToken, got: ' + o.kind);
}

/* ─── Setup / teardown ──────────────────────────────────────────────── */

beforeEach(() => {
  shared.mode = 'happy';
  shared.engineWriteWasCalled = false;
  vi.stubEnv('RATE_LIMIT_HASH_SECRET', 'A'.repeat(32));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/* ─── Tests ─────────────────────────────────────────────────────────── */

describe('input validation', () => {
  it('INVALID_CODE: empty affCode', async () => {
    const r = await resolveReferralRedirect(
      { affCode: '   ', job: null, hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('INVALID_CODE');
  });

  it('INVALID_CODE: SQL injection attempt', async () => {
    const r = await resolveReferralRedirect(
      { affCode: "'; DROP TABLE users; --", job: null, hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('INVALID_CODE');
  });

  it('INVALID_CODE: affCode over 64 chars', async () => {
    const r = await resolveReferralRedirect(
      { affCode: 'A'.repeat(65), job: null, hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('INVALID_CODE');
  });

  it('INVALID_JOB: rejects open-redirect ?job=https://evil.com', async () => {
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: 'https://evil.com', hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('INVALID_JOB');
    asDest(r);
    expect(r.destination).toBe('/jobs');
  });

  it('INVALID_JOB: rejects path traversal ?job=/../etc/passwd', async () => {
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: '/../etc/passwd', hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('INVALID_JOB');
  });

  it('REDIRECT_NEW: ?job=/jobs?redirect=https://evil.com — query stripped, /jobs valid', async () => {
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: '/jobs?redirect=https://evil.com', hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('REDIRECT_NEW');
    asDest(r);
    expect(r.destination).toBe('/jobs');
  });

  it('REDIRECT_NEW: null job defaults to /jobs', async () => {
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('REDIRECT_NEW');
    asDest(r);
    expect(r.destination).toBe('/jobs');
  });

  it('REDIRECT_NEW: ?job=/jobs/some-slug preserved', async () => {
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: '/jobs/some-job-slug', hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('REDIRECT_NEW');
    asDest(r);
    expect(r.destination).toBe('/jobs/some-job-slug');
  });
});

describe('referrer lookup', () => {
  it('NOT_FOUND: unknown affCode → constant /jobs, no engine call', async () => {
    shared.mode = 'referrer_not_found';
    const engine = makeEngine();
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine },
    );
    expect(r.kind).toBe('NOT_FOUND');
    asDest(r);
    expect(r.destination).toBe('/jobs');
    expect(engine.$transaction).not.toHaveBeenCalled();
  });

  it('WRITE_FAILED: writer throws', async () => {
    shared.mode = 'writer_error';
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('WRITE_FAILED');
  });
});

describe('cookie logic', () => {
  it('REDIRECT_NEW: no cookie → creates new attribution + cookieToken', async () => {
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('REDIRECT_NEW');
    asDest(r);
    asCookie(r);
    expect(r.cookieToken.split('.')).toHaveLength(4);
  });

  it('REDIRECT_NEW: tampered cookie → treated as no cookie', async () => {
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: 'tampered.invalid.token', requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('REDIRECT_NEW');
  });

  it('REDIRECT_EXISTING: valid cookie + active row + active referrer → no new write', async () => {
    const { createAttributionToken } = await import('./redirect-token');
    const cookie = createAttributionToken('attr-existing', Date.now() + 60_000);
    const engine = makeEngine();
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: cookie, requestId: 'r1' },
      { writer: makeWriter(), engine },
    );
    expect(r.kind).toBe('REDIRECT_EXISTING');
    asDest(r);
    expect(r.destination).toBe('/jobs');
    expect(shared.engineWriteWasCalled).toBe(false);
  });

  it('DEC-AFF-010 cross-referrer: cookie A + click B code → REDIRECT_EXISTING (no overwrite)', async () => {
    // Affer A clicks -> cookie A (row from A's referrer).
    // User then clicks B's code. Cookie A must win (first click wins).
    const { createAttributionToken } = await import('./redirect-token');
    const cookie = createAttributionToken('attr-from-A', Date.now() + 60_000);
    const engine = makeEngine();
    const r = await resolveReferralRedirect(
      { affCode: 'B_CODE', job: null, hrpAffCookie: cookie, requestId: 'r1' },
      { writer: makeWriter(), engine },
    );
    expect(r.kind).toBe('REDIRECT_EXISTING');
    asDest(r);
    expect(r.destination).toBe('/jobs');
    expect(shared.engineWriteWasCalled).toBe(false);
  });

  it('row gone → cookie untrusted, REDIRECT_NEW', async () => {
    shared.mode = 'cookie_row_gone';
    const { createAttributionToken } = await import('./redirect-token');
    const cookie = createAttributionToken('attr-missing', Date.now() + 60_000);
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: cookie, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('REDIRECT_NEW');
  });

  it('referrer inactive → cookie untrusted, REDIRECT_NEW', async () => {
    shared.mode = 'cookie_referrer_inactive';
    const { createAttributionToken } = await import('./redirect-token');
    const cookie = createAttributionToken('attr-orphan', Date.now() + 60_000);
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: cookie, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('REDIRECT_NEW');
  });

  it('cookie engine error → cookie untrusted, REDIRECT_NEW', async () => {
    shared.mode = 'cookie_engine_error';
    const { createAttributionToken } = await import('./redirect-token');
    const cookie = createAttributionToken('attr-whatever', Date.now() + 60_000);
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: cookie, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('REDIRECT_NEW');
  });
});

describe('engine write', () => {
  it('REDIRECT_NEW: happy path → cookieToken', async () => {
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('REDIRECT_NEW');
    asDest(r);
    asCookie(r);
    expect(r.destination).toBe('/jobs');
    expect(r.cookieToken.split('.')).toHaveLength(4);
  });

  it('set_config called with link-capture context + is_local=true', async () => {
    const engine = makeEngine();
    const { _tx } = engine as unknown as { _tx: { $executeRawUnsafe: { mock: { calls: unknown[][] } } } };
    await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine },
    );
    const calls = _tx.$executeRawUnsafe.mock.calls as unknown[][];
    expect(calls.length).toBeGreaterThan(0);
    const [call0, call1] = calls[0] as [string, string];
    expect(call0).toContain('hrp.engine_context');
    expect(call1).toBe('link-capture');
    expect(call0).toContain('true');
  });

  it('Decision A 3: P2002 → WRITE_FAILED (no race-winner claim)', async () => {
    shared.mode = 'engine_insert_p2002';
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    // No business-key unique constraint supports a race winner; mapping to
    // REDIRECT_EXISTING without the winner's cookie would set the wrong cookie.
    expect(r.kind).toBe('WRITE_FAILED');
  });

  it('WRITE_FAILED: engine RLS deny (42501)', async () => {
    shared.mode = 'engine_insert_error';
    const r = await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine: makeEngine() },
    );
    expect(r.kind).toBe('WRITE_FAILED');
  });
});

describe('Decision A 3: no advisory lock / no synthetic actor', () => {
  it('no pg_advisory_xact_lock in engine SQL', async () => {
    const engine = makeEngine();
    const { _tx } = engine as unknown as { _tx: { $executeRawUnsafe: { mock: { calls: unknown[][] } } } };
    await resolveReferralRedirect(
      { affCode: 'X', job: null, hrpAffCookie: null, requestId: 'r1' },
      { writer: makeWriter(), engine },
    );
    const calls = _tx.$executeRawUnsafe.mock.calls as unknown[][];
    const hasAdvisory = calls.some((args) => String(args[0]).includes('advisory'));
    expect(hasAdvisory).toBe(false);
  });
});
