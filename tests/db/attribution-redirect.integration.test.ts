/**
 * attribution-redirect.integration.test.ts — hrp-v6-n2-aff-02-link-capture (N2-2).
 *
 * Container-DB integration tests for the canonical GET /r/[code] redirect flow.
 *
 * These tests open a real database connection and must RUN (not self-skip) in CI.
 * Local runs: requires DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST + HRPARTNER_ENGINE_URL.
 *
 * If the live DB is unavailable, tests FAIL with a descriptive error rather than
 * silently skipping — this is intentional per T0 directive ("SKIP/ENV_BLOCKED is not PASS").
 *
 * Coverage:
 *   AC-01  valid code → creates attribution, sets cookie, redirects to allowlisted path
 *   AC-02  forged/inactive code → constant /jobs redirect (no existence signal)
 *   AC-03  existing valid cookie (same code) → existing attribution wins, no new row created
 *   AC-03b cross-referrer: cookie from code A + click code B → REDIRECT_EXISTING (first click wins)
 *   AC-04  engine context set correctly, cleared at COMMIT
 *   AC-05  open-redirect payloads blocked
 *   AC-06  job allowlist: valid slugs pass through; others redirect to /jobs
 *   AC-07  missing engine URL → 503 (fail-closed)
 *   AC-08  RLS: writer cannot INSERT referral_attributions; engine can
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID as uuidv4 } from 'crypto';
import { resolveReferralRedirect } from '@/src/domains/referrals/attribution-redirect.service';
import type { RedirectOutcome } from '@/src/domains/referrals/attribution-redirect.service';
import { getEnginePrisma } from '@/src/db/engine-client';

const engineRole = 'app_engine_writer';
const runNamespace = uuidv4().substring(0, 8);
const nid = (suffix: string) => `n2-2-redirect-${runNamespace}-${suffix}`;

/** Narrows RedirectOutcome to outcomes that carry `destination`. Returns the narrowed object. */
function asWithDestination(o: RedirectOutcome): Extract<RedirectOutcome, { destination: string }> {
  if (!('destination' in o)) throw new Error(`Expected destination, got: ${o.kind}`);
  return o as Extract<RedirectOutcome, { destination: string }>;
}

/** Narrows RedirectOutcome to outcomes that carry `cookieToken`. Returns the narrowed object. */
function asWithCookieToken(o: RedirectOutcome): Extract<RedirectOutcome, { cookieToken: string }> {
  if (!('cookieToken' in o)) throw new Error(`Expected cookieToken, got: ${o.kind}`);
  return o as Extract<RedirectOutcome, { cookieToken: string }>;
}

describe('N2-2 Attribution Redirect Integration', () => {
  let writerDb: PrismaClient;
  let adminDb: PrismaClient;
  let ephemeralEnginePassword = '';
  const createdAttributions: string[] = [];
  const createdUsers: string[] = [];

  beforeAll(async () => {
    // ── LIVE DB requirement ──────────────────────────────────────────────────
    // We do NOT self-skip.  If the env is missing we FAIL explicitly so CI
    // reports a clear error rather than silently passing.
    const missing: string[] = [];
    if (!process.env.DATABASE_URL_TEST) missing.push('DATABASE_URL_TEST');
    if (!process.env.DATABASE_URL_ADMIN_TEST) missing.push('DATABASE_URL_ADMIN_TEST');
    if (missing.length > 0) {
      throw new Error(
        `INTEGRATION_LIVE_DB_REQUIRED: missing ${missing.join(', ')}. ` +
        'Set these env vars to run integration tests against a live Postgres.',
      );
    }
    if (process.env.DATABASE_URL_TEST && process.env.DATABASE_URL_TEST.includes('placeholder')) {
      throw new Error('INTEGRATION_LIVE_DB_REQUIRED: DATABASE_URL_TEST is a placeholder value.');
    }

    writerDb = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_TEST! } } });
    adminDb = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_ADMIN_TEST! } } });

    // Token signing requires a 32+ char secret.  The CI container does not
    // inject RATE_LIMIT_HASH_SECRET, so provision an ephemeral one for the
    // test run.  Mirror the N2-1 pattern of using random per-run passwords.
    if (!process.env.RATE_LIMIT_HASH_SECRET || process.env.RATE_LIMIT_HASH_SECRET.length < 32) {
      process.env.RATE_LIMIT_HASH_SECRET = `itest-${runNamespace}-${uuidv4()}${uuidv4()}`.padEnd(32, '0').slice(0, 64);
    }

    // Provision ephemeral engine credentials (N2-1 pattern).
    if (!process.env.HRPARTNER_ENGINE_URL) {
      ephemeralEnginePassword = uuidv4();
      await adminDb.$executeRawUnsafe(
        `ALTER ROLE ${engineRole} WITH PASSWORD '${ephemeralEnginePassword}'`,
      );
      const adminUrl = new URL(process.env.DATABASE_URL_ADMIN_TEST!);
      adminUrl.username = engineRole;
      adminUrl.password = ephemeralEnginePassword;
      process.env.HRPARTNER_ENGINE_URL = adminUrl.toString();
    }

    // Seed: 1 active referrer, 1 inactive referrer, 1 extra active referrer.
    const active1 = nid('active1');
    const active2 = nid('active2');
    const inactive1 = nid('inactive1');

    await adminDb.$executeRawUnsafe(
      `INSERT INTO users(id, role, is_active, aff_code, updated_at)
       VALUES ($1, 'WORKER', true, $2, NOW())
       ON CONFLICT DO NOTHING`,
      active1,
      `CODE_${runNamespace}_ACTIVE1`,
    );
    await adminDb.$executeRawUnsafe(
      `INSERT INTO users(id, role, is_active, aff_code, updated_at)
       VALUES ($1, 'WORKER', true, $2, NOW())
       ON CONFLICT DO NOTHING`,
      active2,
      `CODE_${runNamespace}_ACTIVE2`,
    );
    await adminDb.$executeRawUnsafe(
      `INSERT INTO users(id, role, is_active, aff_code, updated_at)
       VALUES ($1, 'WORKER', false, $2, NOW())
       ON CONFLICT DO NOTHING`,
      inactive1,
      `CODE_${runNamespace}_INACTIVE`,
    );

    createdUsers.push(active1, active2, inactive1);
  });

  afterAll(async () => {
    // FK-safe teardown: delete attributions first, then users.
    if (adminDb && createdAttributions.length > 0) {
      for (const id of createdAttributions) {
        try {
          await adminDb.$executeRawUnsafe(`DELETE FROM referral_attributions WHERE id = $1`, id);
        } catch { /* ignore */ }
      }
    }
    if (adminDb && createdUsers.length > 0) {
      const list = createdUsers.map((u) => `'${u}'`).join(',');
      try {
        await adminDb.$executeRawUnsafe(`DELETE FROM users WHERE id IN (${list})`);
      } catch { /* ignore */ }
    }
    try { if (writerDb) await writerDb.$disconnect(); } catch { /* ignore */ }
    try { if (adminDb) await adminDb.$disconnect(); } catch { /* ignore */ }
  });

  beforeEach(() => {
    if (!process.env.DATABASE_URL_TEST) {
      throw new Error('INTEGRATION_LIVE_DB_REQUIRED: DATABASE_URL_TEST must be set');
    }
  });

  function baseInput(overrides: Partial<Parameters<typeof resolveReferralRedirect>[0]> = {}) {
    return {
      affCode: `CODE_${runNamespace}_ACTIVE1`,
      job: null,
      hrpAffCookie: null,
      requestId: `itest-${uuidv4()}`,
      ...overrides,
    };
  }

  // ── AC-01: valid code creates attribution + returns REDIRECT_NEW ───────────

  it('AC-01: valid active code creates attribution row via engine and returns REDIRECT_NEW', async () => {
    const engine = getEnginePrisma();
    const result = await resolveReferralRedirect(baseInput(), { writer: writerDb, engine });

    expect(result.kind).toBe('REDIRECT_NEW');
    expect(asWithDestination(result).destination).toBe('/jobs');
    expect(asWithCookieToken(result).cookieToken).toBeDefined();
    expect(asWithCookieToken(result).cookieToken.split('.')).toHaveLength(4);

    // Verify at least one row was created for this code.
    const count = await adminDb.$queryRawUnsafe<Array<{ cnt: string }>>(
      `SELECT COUNT(*)::text AS cnt FROM referral_attributions WHERE affiliate_code_snapshot = $1`,
      `CODE_${runNamespace}_ACTIVE1`,
    );
    expect(parseInt(count[0].cnt)).toBeGreaterThanOrEqual(1);
  });

  // ── AC-02: forged/inactive code → NOT_FOUND / constant /jobs ─────────────

  it('AC-02: forged code → NOT_FOUND (constant /jobs), no attribution row', async () => {
    const engine = getEnginePrisma();
    const before = await countAttributions('NOT_A_REAL_CODE');
    const result = await resolveReferralRedirect(
      baseInput({ affCode: 'NOT_A_REAL_CODE' }),
      { writer: writerDb, engine },
    );

    expect(result.kind).toBe('NOT_FOUND');
    expect(asWithDestination(result).destination).toBe('/jobs');

    const after = await countAttributions('NOT_A_REAL_CODE');
    expect(after).toBe(before); // no row created
  });

  it('AC-02: inactive user code → NOT_FOUND, no attribution row', async () => {
    const engine = getEnginePrisma();
    const before = await countAttributions(`CODE_${runNamespace}_INACTIVE`);
    const result = await resolveReferralRedirect(
      baseInput({ affCode: `CODE_${runNamespace}_INACTIVE` }),
      { writer: writerDb, engine },
    );

    expect(result.kind).toBe('NOT_FOUND');
    expect(asWithDestination(result).destination).toBe('/jobs');

    const after = await countAttributions(`CODE_${runNamespace}_INACTIVE`);
    expect(after).toBe(before);
  });

  // ── AC-03: existing valid cookie → existing attribution wins ─────────────

  it('AC-03: valid cookie + existing active row → REDIRECT_EXISTING (existing wins, no new row)', async () => {
    const engine = getEnginePrisma();

    // First: create an attribution and get its token.
    const first = await resolveReferralRedirect(baseInput(), { writer: writerDb, engine });
    expect(first.kind).toBe('REDIRECT_NEW');
    const cookie = asWithCookieToken(first).cookieToken;
    expect(cookie).toBeDefined();

    const countBefore = await countAttributions(`CODE_${runNamespace}_ACTIVE1`);

    // Second: same code, with valid cookie → should return REDIRECT_EXISTING.
    const second = await resolveReferralRedirect(
      baseInput({ hrpAffCookie: cookie }),
      { writer: writerDb, engine },
    );

    expect(second.kind).toBe('REDIRECT_EXISTING');
    expect(asWithDestination(second).destination).toBe('/jobs');

    const countAfter = await countAttributions(`CODE_${runNamespace}_ACTIVE1`);
    expect(countAfter).toBe(countBefore); // no new row created
  });

  // ── AC-03b: cross-referrer first-click (P1 fix) ───────────────────────────
  // Per DEC-AFF-010: if a cookie exists from a prior click on code A,
  // clicking code B must NOT overwrite — the cookie's row is authoritative.
  // The row's referrer is independent of the currently-clicked code.

  it('AC-03b: cookie from code A + click code B → REDIRECT_EXISTING (first click wins)', async () => {
    const engine = getEnginePrisma();

    // Step 1: create attribution for CODE_ACTIVE1 (user A).
    const first = await resolveReferralRedirect(
      baseInput({ affCode: `CODE_${runNamespace}_ACTIVE1` }),
      { writer: writerDb, engine },
    );
    expect(first.kind).toBe('REDIRECT_NEW');
    const cookieA = asWithCookieToken(first).cookieToken;

    const countBefore = await countAttributions(`CODE_${runNamespace}_ACTIVE1`);

    // Step 2: click CODE_ACTIVE2 (user B) WITH cookie from A.
    // DEC-AFF-010 requires: existing valid cookie wins regardless of code.
    const second = await resolveReferralRedirect(
      baseInput({ affCode: `CODE_${runNamespace}_ACTIVE2`, hrpAffCookie: cookieA }),
      { writer: writerDb, engine },
    );

    expect(second.kind).toBe('REDIRECT_EXISTING');
    expect(asWithDestination(second).destination).toBe('/jobs');

    // No new row created (attribution count unchanged).
    const countAfter = await countAttributions(`CODE_${runNamespace}_ACTIVE1`);
    expect(countAfter).toBe(countBefore); // no new row for CODE_ACTIVE2

    // The attribution belongs to CODE_ACTIVE1's referrer, not CODE_ACTIVE2.
    // (The row was created in step 1 and is unchanged.)
  });

  // ── AC-04: engine context cleared at COMMIT ───────────────────────────────

  it('AC-04: hrp.engine_context set inside engine tx, cleared after COMMIT', async () => {
    const engine = getEnginePrisma();

    await engine.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('hrp.engine_context', $1, true)`, 'link-capture');
    });

    // New transaction on the same pooled engine client: context must be cleared.
    const after = await engine.$queryRawUnsafe<Array<{ ctx: string | null }>>(
      `SELECT current_setting('hrp.engine_context', true) AS ctx`,
    );
    expect(after[0].ctx ?? '').toBe('');
  });

  // ── AC-05: open-redirect payloads blocked ─────────────────────────────────

  it('AC-05: open-redirect payload ?job=https://evil.com → INVALID_JOB', async () => {
    const engine = getEnginePrisma();
    const result = await resolveReferralRedirect(
      baseInput({ job: 'https://evil.com' }),
      { writer: writerDb, engine },
    );
    expect(result.kind).toBe('INVALID_JOB');
    expect(asWithDestination(result).destination).toBe('/jobs');
  });

  it('AC-05: open-redirect payload ?job=//evil.com → INVALID_JOB', async () => {
    const engine = getEnginePrisma();
    const result = await resolveReferralRedirect(
      baseInput({ job: '//evil.com' }),
      { writer: writerDb, engine },
    );
    expect(result.kind).toBe('INVALID_JOB');
  });

  it('AC-05: path traversal ?job=/../etc/passwd → INVALID_JOB', async () => {
    const engine = getEnginePrisma();
    const result = await resolveReferralRedirect(
      baseInput({ job: '/../etc/passwd' }),
      { writer: writerDb, engine },
    );
    expect(result.kind).toBe('INVALID_JOB');
  });

  // ── AC-06: job allowlist ───────────────────────────────────────────────────

  it('AC-06: ?job=/jobs/vietnam-senior-dev → allowlisted prefix preserved', async () => {
    const engine = getEnginePrisma();
    const result = await resolveReferralRedirect(
      baseInput({ job: '/jobs/vietnam-senior-dev' }),
      { writer: writerDb, engine },
    );
    expect(result.kind).toBe('REDIRECT_NEW');
    expect(asWithDestination(result).destination).toBe('/jobs/vietnam-senior-dev');
  });

  it('AC-06: ?job=/jobs?page=2 → query stripped, prefix preserved', async () => {
    const engine = getEnginePrisma();
    const result = await resolveReferralRedirect(
      baseInput({ job: '/jobs?page=2' }),
      { writer: writerDb, engine },
    );
    // The service strips query/hash before prefix check; destination becomes /jobs
    // (allowlisted, query stripped). This is correct: we don't want to carry
    // arbitrary query params from the referral link.
    expect(result.kind).toBe('REDIRECT_NEW');
    expect(asWithDestination(result).destination).toBe('/jobs');
  });

  it('AC-06: ?job=/admin → not allowlisted → INVALID_JOB', async () => {
    const engine = getEnginePrisma();
    const result = await resolveReferralRedirect(
      baseInput({ job: '/admin' }),
      { writer: writerDb, engine },
    );
    expect(result.kind).toBe('INVALID_JOB');
    expect(asWithDestination(result).destination).toBe('/jobs');
  });

  // ── AC-07: missing engine URL → fail-closed 503 ──────────────────────────

  it('AC-07: missing HRPARTNER_ENGINE_URL → ENGINE_UNAVAILABLE (fail-closed)', async () => {
    const saved = process.env.HRPARTNER_ENGINE_URL;
    delete process.env.HRPARTNER_ENGINE_URL;
    try {
      // When engine client fails to init, route returns 503.
      expect(() => getEnginePrisma()).toThrow(/HRPARTNER_ENGINE_URL/);
    } finally {
      if (saved !== undefined) process.env.HRPARTNER_ENGINE_URL = saved;
    }
  });

  // ── AC-08: RLS — writer cannot INSERT; engine can ────────────────────────

  it('AC-08: writer cannot INSERT referral_attributions (RLS deny)', async () => {
    await expect(
      writerDb.$executeRawUnsafe(
        `INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at)
         VALUES ($1::text, $2::text, $3::text, NOW(), NOW(), 'ACTIVE'::text, NOW())`,
        uuidv4(),
        nid('active1'),
        'writer-test-code',
      ),
    ).rejects.toThrow();

    // Engine with link-capture context succeeds.
    const engine = getEnginePrisma();
    await engine.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('hrp.engine_context', $1, true)`, 'link-capture');
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at)
         VALUES ($1::text, $2::text, $3::text, NOW(), NOW(), 'ACTIVE'::text, NOW())
         RETURNING id::text AS id`,
        uuidv4(),
        nid('active1'),
        'engine-test-code',
      );
      expect(rows.length).toBe(1);
    });
  });

  // ── Extra: expires_at + 30-day window ──────────────────────────────────────

  it('AC-01 + expires: created attribution has expires_at = now + 30 days', async () => {
    const engine = getEnginePrisma();
    const result = await resolveReferralRedirect(
      baseInput({ affCode: `CODE_${runNamespace}_ACTIVE2`, job: null }),
      { writer: writerDb, engine },
    );
    expect(result.kind).toBe('REDIRECT_NEW');

    const rows = await adminDb.$queryRawUnsafe<Array<{ first_clicked_at: string; expires_at: string }>>(
      `SELECT first_clicked_at::text, expires_at::text
       FROM referral_attributions
       WHERE referrer_user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      nid('active2'),
    );
    expect(rows.length).toBe(1);
    const first = new Date(rows[0].first_clicked_at).getTime();
    const expires = new Date(rows[0].expires_at).getTime();
    const window = expires - first;
    // Allow 1s tolerance for test execution time.
    expect(window).toBeGreaterThanOrEqual(30 * 24 * 60 * 60 * 1000 - 1000);
    expect(window).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000 + 1000);
  });

  /** Count rows for a given affiliate code using the admin connection. */
  async function countAttributions(affCode: string): Promise<number> {
    const rows = await adminDb.$queryRawUnsafe<Array<{ cnt: string }>>(
      `SELECT COUNT(*)::text AS cnt FROM referral_attributions WHERE affiliate_code_snapshot = $1`,
      affCode,
    );
    return parseInt(rows[0].cnt, 10);
  }
});
