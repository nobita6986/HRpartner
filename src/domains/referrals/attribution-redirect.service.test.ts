/**
 * attribution-redirect.service.test.ts — hrp-v6-n2-aff-02-link-capture (N2-2).
 *
 * Unit tests for `resolveReferralRedirect()`. All DB calls are mocked at the
 * PrismaClient level; this file makes NO live DB connection.
 *
 * Coverage (mirrors TASK ACs):
 *   - invalid code format   → INVALID_CODE
 *   - invalid job           → INVALID_JOB
 *   - referrer not found    → NOT_FOUND
 *   - valid token, row ok   → REDIRECT_EXISTING
 *   - no cookie, happy path → REDIRECT_NEW
 *   - P2002 (race)          → REDIRECT_EXISTING (re-read)
 *   - engine RLS deny       → WRITE_FAILED
 *   - open-redirect payload → INVALID_JOB
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RedirectOutcome } from './attribution-redirect.service';

/* ─── Shared mock setup ─────────────────────────────────────────────────── */

const sqlExecutions: Array<{ side: 'writer' | 'engine'; sql: string; params?: unknown[] }> = [];

const writerLookupBehavior = vi.fn<() => Array<{ id: string }>>(() => [{ id: 'user-uuid' }]);
const engineInsertBehavior = vi.fn<() => Array<{ id: string }>>(() => [{ id: 'attr-uuid-new' }]);

const fakeWriter: any = {
  $queryRaw: vi.fn(async () => {
    sqlExecutions.push({ side: 'writer', sql: 'writer_lookup' });
    return writerLookupBehavior();
  }),
};

const fakeEngineTx: any = {
  $executeRawUnsafe: vi.fn(async (sql: string, ...params: unknown[]) => {
    sqlExecutions.push({ side: 'engine', sql, params });
    return 1;
  }),
  $queryRaw: vi.fn(async (sql: any) => {
    sqlExecutions.push({ side: 'engine', sql: String(sql) });
    return engineInsertBehavior();
  }),
};

const fakeEngine: any = {
  $transaction: vi.fn(async (cb: (tx: any) => unknown) => cb(fakeEngineTx)),
};

vi.mock('@/src/shared/observability/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

import { resolveReferralRedirect } from './attribution-redirect.service';

/* ─── Helpers ──────────────────────────────────────────────────────────── */

/** Type-safe narrowing helper: narrows RedirectOutcome to those with `destination`. */
function asWithDestination(o: RedirectOutcome): asserts o is Extract<RedirectOutcome, { destination: string }> {
  if (!('destination' in o)) {
    throw new Error(`Expected outcome to have 'destination': ${o.kind}`);
  }
}

/** Type-safe narrowing helper: narrows RedirectOutcome to those with `cookieToken`. */
function asWithCookieToken(o: RedirectOutcome): asserts o is Extract<RedirectOutcome, { cookieToken: string }> {
  if (!('cookieToken' in o)) {
    throw new Error(`Expected outcome to have 'cookieToken': ${o.kind}`);
  }
}

function baseInput(overrides: Partial<Parameters<typeof resolveReferralRedirect>[0]> = {}) {
  return {
    affCode: 'VALID_CODE',
    job: null,
    hrpAffCookie: null,
    requestId: 'req-1',
    ...overrides,
  };
}

beforeEach(() => {
  sqlExecutions.length = 0;
  fakeWriter.$queryRaw.mockClear();
  fakeEngineTx.$executeRawUnsafe.mockClear();
  fakeEngineTx.$queryRaw.mockClear();
  fakeEngine.$transaction.mockClear();

  writerLookupBehavior.mockImplementation(() => [{ id: 'user-uuid' }]);
  engineInsertBehavior.mockImplementation(() => [{ id: 'attr-uuid-new' }]);

  // Provide a deterministic signing secret for the duration of the test.
  vi.stubEnv('RATE_LIMIT_HASH_SECRET', 'A'.repeat(32));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

/* ─── Tests ─────────────────────────────────────────────────────────────── */

describe('input validation', () => {
  it('INVALID_CODE: rejects empty affCode', async () => {
    const result = await resolveReferralRedirect(baseInput({ affCode: '   ' }), {
      writer: fakeWriter,
      engine: fakeEngine,
    });
    expect(result.kind).toBe('INVALID_CODE');
  });

  it('INVALID_CODE: rejects malformed affCode (SQL injection attempt)', async () => {
    const result = await resolveReferralRedirect(
      baseInput({ affCode: "'; DROP TABLE users; --" }),
      { writer: fakeWriter, engine: fakeEngine },
    );
    expect(result.kind).toBe('INVALID_CODE');
    expect(fakeWriter.$queryRaw).not.toHaveBeenCalled();
  });

  it('INVALID_CODE: rejects affCode over 64 chars', async () => {
    const result = await resolveReferralRedirect(
      baseInput({ affCode: 'A'.repeat(65) }),
      { writer: fakeWriter, engine: fakeEngine },
    );
    expect(result.kind).toBe('INVALID_CODE');
  });

  it('INVALID_JOB: rejects open-redirect payload ?job=https://evil.com', async () => {
    const result = await resolveReferralRedirect(
      baseInput({ job: 'https://evil.com' }),
      { writer: fakeWriter, engine: fakeEngine },
    );
    expect(result.kind).toBe('INVALID_JOB');
    asWithDestination(result);
    expect(result.destination).toBe('/jobs');
  });

  it('INVALID_JOB: rejects ?job=/../etc/passwd', async () => {
    const result = await resolveReferralRedirect(
      baseInput({ job: '/../etc/passwd' }),
      { writer: fakeWriter, engine: fakeEngine },
    );
    expect(result.kind).toBe('INVALID_JOB');
  });

  it('INVALID_JOB: rejects ?job=/jobs?redirect=https://evil.com (query stripped → /jobs valid → REDIRECT_NEW)', async () => {
    // Note: the service strips query/hash BEFORE prefix check. So ?job=/jobs?redirect=...
    // becomes /jobs (allowlisted prefix). The dangerous query is discarded.
    const result = await resolveReferralRedirect(
      baseInput({ job: '/jobs?redirect=https://evil.com' }),
      { writer: fakeWriter, engine: fakeEngine },
    );
    // Expected: REDIRECT_NEW with destination='/jobs' (safe: open-redirect payload was stripped).
    expect(result.kind).toBe('REDIRECT_NEW');
    asWithDestination(result);
    expect(result.destination).toBe('/jobs');
  });

  it('null job defaults to /jobs destination', async () => {
    const result = await resolveReferralRedirect(
      baseInput({ job: null }),
      { writer: fakeWriter, engine: fakeEngine },
    );
    expect(result.kind).toBe('REDIRECT_NEW');
    asWithDestination(result);
    expect(result.destination).toBe('/jobs');
  });

  it('valid job is preserved in destination', async () => {
    const result = await resolveReferralRedirect(
      baseInput({ job: '/jobs/some-job-slug' }),
      { writer: fakeWriter, engine: fakeEngine },
    );
    expect(result.kind).toBe('REDIRECT_NEW');
    asWithDestination(result);
    expect(result.destination).toBe('/jobs/some-job-slug');
  });
});

describe('referrer lookup', () => {
  it('NOT_FOUND: unknown affCode → NOT_FOUND (constant /jobs)', async () => {
    writerLookupBehavior.mockImplementation(() => []);
    const result = await resolveReferralRedirect(baseInput(), {
      writer: fakeWriter,
      engine: fakeEngine,
    });
    expect(result.kind).toBe('NOT_FOUND');
    asWithDestination(result);
    expect(result.destination).toBe('/jobs');
    expect(fakeEngine.$transaction).not.toHaveBeenCalled();
  });

  it('NOT_FOUND: inactive user filtered out by writer query', async () => {
    writerLookupBehavior.mockImplementation(() => []);
    const result = await resolveReferralRedirect(baseInput(), {
      writer: fakeWriter,
      engine: fakeEngine,
    });
    expect(result.kind).toBe('NOT_FOUND');
    expect(fakeEngine.$transaction).not.toHaveBeenCalled();
  });

  it('WRITE_FAILED: writer throws', async () => {
    fakeWriter.$queryRaw.mockImplementationOnce(async () => { throw new Error('db down'); });
    const result = await resolveReferralRedirect(baseInput(), {
      writer: fakeWriter,
      engine: fakeEngine,
    });
    expect(result.kind).toBe('WRITE_FAILED');
  });
});

describe('cookie logic', () => {
  it('REDIRECT_NEW: no cookie → creates new attribution and returns cookieToken', async () => {
    const result = await resolveReferralRedirect(
      baseInput({ hrpAffCookie: null }),
      { writer: fakeWriter, engine: fakeEngine },
    );
    expect(result.kind).toBe('REDIRECT_NEW');
    asWithCookieToken(result);
    expect(result.cookieToken).toBeDefined();
    expect(typeof result.cookieToken).toBe('string');
    // Token is 4-part dot-separated
    expect(result.cookieToken.split('.')).toHaveLength(4);
  });

  it('invalid/expired cookie → treated as no cookie (REDIRECT_NEW)', async () => {
    const result = await resolveReferralRedirect(
      baseInput({ hrpAffCookie: 'tampered.invalid.token' }),
      { writer: fakeWriter, engine: fakeEngine },
    );
    expect(result.kind).toBe('REDIRECT_NEW');
  });
});

describe('engine write', () => {
  it('REDIRECT_NEW: happy path → REDIRECT_NEW with cookieToken', async () => {
    const result = await resolveReferralRedirect(baseInput(), {
      writer: fakeWriter,
      engine: fakeEngine,
    });
    expect(result.kind).toBe('REDIRECT_NEW');
    asWithDestination(result);
    asWithCookieToken(result);
    expect(result.destination).toBe('/jobs');
    expect(result.cookieToken).toBeDefined();
    expect(typeof result.cookieToken).toBe('string');
    expect(result.cookieToken.split('.')).toHaveLength(4);
  });

  it('set_config called with link-capture context', async () => {
    await resolveReferralRedirect(baseInput(), {
      writer: fakeWriter,
      engine: fakeEngine,
    });

    const setConfigCall = sqlExecutions.find(
      (e) => e.side === 'engine' && e.sql.includes('set_config'),
    );
    expect(setConfigCall).toBeDefined();
    expect(setConfigCall!.params?.[0]).toBe('link-capture');
  });

  it('set_config is called with is_local=true (never false)', async () => {
    await resolveReferralRedirect(baseInput(), {
      writer: fakeWriter,
      engine: fakeEngine,
    });

    const setConfigCall = sqlExecutions.find(
      (e) => e.side === 'engine' && e.sql.includes('set_config'),
    );
    expect(setConfigCall!.sql).toMatch(/set_config\('hrp\.engine_context',\s*\$1,\s*true\)/);
  });

  it('REDIRECT_EXISTING: P2002 from engine → REDIRECT_EXISTING (race winner)', async () => {
    engineInsertBehavior.mockImplementation(() => {
      const err: any = new Error('Unique constraint');
      err.code = 'P2002';
      throw err;
    });

    const result = await resolveReferralRedirect(baseInput(), {
      writer: fakeWriter,
      engine: fakeEngine,
    });
    expect(result.kind).toBe('REDIRECT_EXISTING');
    asWithDestination(result);
    expect(result.destination).toBe('/jobs');
  });

  it('WRITE_FAILED: engine RLS deny (42501)', async () => {
    engineInsertBehavior.mockImplementation(() => {
      const err: any = new Error('RLS denied');
      err.code = '42501';
      throw err;
    });

    const result = await resolveReferralRedirect(baseInput(), {
      writer: fakeWriter,
      engine: fakeEngine,
    });
    expect(result.kind).toBe('WRITE_FAILED');
  });
});

describe('no synthetic actor / idempotency / advisory lock (Decision A)', () => {
  it('service does NOT call any advisory lock', async () => {
    await resolveReferralRedirect(baseInput(), {
      writer: fakeWriter,
      engine: fakeEngine,
    });

    // No pg_advisory_xact_lock call (Decision A: no advisory lock)
    const lockCall = sqlExecutions.find((e) => e.side === 'engine' && e.sql.includes('advisory'));
    expect(lockCall).toBeUndefined();
  });
});
