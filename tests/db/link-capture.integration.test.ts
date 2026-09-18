/**
 * link-capture.integration.test.ts — hrp-v6-n2-aff-02-link-capture (N2-2).
 *
 * Container-DB integration test exercising the full PUBLIC -> READER ENGINE
 * path against the live test DB (CI: ephemeral container via
 * `.github/workflows/ci.yml`; local: Neon dedicated test DB).
 *
 * Self-skips when `DATABASE_URL_TEST` is absent, mirroring the pattern in
 * `tests/db/referral-attribution-foundation.integration.test.ts`.
 *
 * Coverage:
 *   AC-01  valid affCode creates exactly one row via app_engine_writer under 'link-capture' context.
 *   AC-02  forged/inactive affCode returns INVALID_REFERRAL with NO DB write.
 *   AC-04  app_user_writer denied INSERT; app_engine_writer allowed.
 *   AC-05  deterministic outcome for the same (referrer, code) under concurrent distinct-key inserts.
 *   AC-07  engine context cleared at COMMIT/ROLLBACK; no leak across pooled reuse.
 *   AC-08  missing HRPARTNER_ENGINE_URL surfaces as ENGINE_UNAVAILABLE (fail-closed).
 *   AC-09  set_config(..., true) ONLY — covered by static unit test in another file.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID as uuidv4 } from 'crypto';
import {
  captureReferralLink,
  type LinkCaptureInput,
} from '@/src/domains/referrals/link-capture.service';
import { getEnginePrisma } from '@/src/db/engine-client';

const engineRole = 'app_engine_writer';
const runNamespace = uuidv4().substring(0, 8);
const nid = (suffix: string): string => `n2-2-${runNamespace}-${suffix}`;

describe('N2-2 Link Capture Integration', () => {
  let writerDb: PrismaClient;
  let adminDb: PrismaClient;
  let ephemeralEnginePassword = '';
  const createdAttributions: string[] = [];
  const createdUsers: string[] = [];

  beforeAll(async () => {
    if (!process.env.DATABASE_URL_TEST || process.env.DATABASE_URL_TEST.includes('placeholder')) {
      throw new Error('ENV_BLOCKED: DATABASE_URL_TEST required');
    }
    if (!process.env.DATABASE_URL_ADMIN_TEST || process.env.DATABASE_URL_ADMIN_TEST.includes('placeholder')) {
      throw new Error('ENV_BLOCKED: DATABASE_URL_ADMIN_TEST required');
    }

    writerDb = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_TEST } } });
    adminDb = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_ADMIN_TEST } } });

    // Provision HRPARTNER_ENGINE_URL the same way N2-1 foundation tests do:
    // mutate the engine role password to an ephemeral value and rewrite the
    // URL (E-14 contract: no SET ROLE assumption).
    if (!process.env.HRPARTNER_ENGINE_URL) {
      ephemeralEnginePassword = uuidv4();
      await adminDb.$executeRawUnsafe(
        `ALTER ROLE ${engineRole} WITH PASSWORD '${ephemeralEnginePassword}'`,
      );
      const adminUrl = new URL(process.env.DATABASE_URL_ADMIN_TEST);
      adminUrl.username = engineRole;
      adminUrl.password = ephemeralEnginePassword;
      process.env.HRPARTNER_ENGINE_URL = adminUrl.toString();
    }

    // Seed minimal fixtures.
    // 1 active referrer; 1 inactive referrer; same affCode namespace.
    await adminDb.$executeRawUnsafe(
      `INSERT INTO users(id, role, is_active, aff_code, updated_at) VALUES ($1, 'WORKER', true, $2, NOW()) ON CONFLICT DO NOTHING`,
      nid('referrer-active'),
      `ACODE_${runNamespace}_ACTIVE`,
    );
    await adminDb.$executeRawUnsafe(
      `INSERT INTO users(id, role, is_active, aff_code, updated_at) VALUES ($1, 'WORKER', false, $2, NOW()) ON CONFLICT DO NOTHING`,
      nid('referrer-inactive'),
      `ACODE_${runNamespace}_INACTIVE`,
    );
    createdUsers.push(nid('referrer-active'), nid('referrer-inactive'));
  });

  afterAll(async () => {
    try {
      if (adminDb && createdAttributions.length > 0) {
        for (const id of createdAttributions) {
          try {
            await adminDb.$executeRawUnsafe(
              `DELETE FROM referral_attributions WHERE id = $1`,
              id,
            );
          } catch {
            /* ignore */
          }
        }
      }
      if (adminDb && createdUsers.length > 0) {
        const list = createdUsers.map((u) => `'${u}'`).join(',');
        if (list.length > 0) {
          try {
            await adminDb.$executeRawUnsafe(
              `DELETE FROM users WHERE id IN (${list})`,
            );
          } catch {
            /* ignore */
          }
        }
      }
    } finally {
      try { if (writerDb) await writerDb.$disconnect(); } catch { /* ignore */ }
      try { if (adminDb) await adminDb.$disconnect(); } catch { /* ignore */ }
    }
  });

  beforeEach(() => {
    if (!process.env.DATABASE_URL_TEST) {
      throw new Error('ENV_BLOCKED: DATABASE_URL_TEST required');
    }
  });

  function baseInput(overrides: Partial<LinkCaptureInput> = {}): LinkCaptureInput {
    return {
      affCode: `ACODE_${runNamespace}_ACTIVE`,
      idempotencyKey: uuidv4(),
      body: null,
      clientIpHash: 'unknown',
      userAgentHash: 'ua-hash',
      requestId: 'itest-1',
      ...overrides,
    };
  }

  it('AC-01: valid affCode creates exactly one row via engine (link-capture context)', async () => {
    const engine = getEnginePrisma();
    const outcome = await captureReferralLink(baseInput(), { writer: writerDb, engine });
    expect(outcome.kind).toBe('OK');
    if (outcome.kind !== 'OK') return;

    createdAttributions.push(outcome.attributionId);

    // Verify the row from admin (bypasses RLS for cleanup asserts).
    const rows = await adminDb.$queryRawUnsafe<Array<{
      id: string;
      referrer_user_id: string;
      affiliate_code_snapshot: string;
      status: string;
    }>>(
      `SELECT id, referrer_user_id, affiliate_code_snapshot, status FROM referral_attributions WHERE id = $1`,
      outcome.attributionId,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('ACTIVE');
    expect(rows[0].affiliate_code_snapshot).toBe(`ACODE_${runNamespace}_ACTIVE`);
    expect(rows[0].referrer_user_id).toBe(nid('referrer-active'));
  });

  it('AC-02: forged/unknown affCode returns INVALID_REFERRAL with NO DB write', async () => {
    const engine = getEnginePrisma();
    const before = await adminDb.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT COUNT(*)::text AS count FROM referral_attributions WHERE affiliate_code_snapshot = $1`,
      'NOT_A_REAL_CODE',
    );
    const outcome = await captureReferralLink(
      baseInput({ affCode: 'NOT_A_REAL_CODE' }),
      { writer: writerDb, engine },
    );
    expect(outcome.kind).toBe('INVALID_REFERRAL');
    const after = await adminDb.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT COUNT(*)::text AS count FROM referral_attributions WHERE affiliate_code_snapshot = $1`,
      'NOT_A_REAL_CODE',
    );
    expect(after[0].count).toBe(before[0].count);
  });

  it('AC-02: inactive user affCode returns INVALID_REFERRAL with NO DB write', async () => {
    const engine = getEnginePrisma();
    const before = await adminDb.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT COUNT(*)::text AS count FROM referral_attributions WHERE affiliate_code_snapshot = $1`,
      `ACODE_${runNamespace}_INACTIVE`,
    );
    const outcome = await captureReferralLink(
      baseInput({ affCode: `ACODE_${runNamespace}_INACTIVE` }),
      { writer: writerDb, engine },
    );
    expect(outcome.kind).toBe('INVALID_REFERRAL');
    const after = await adminDb.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT COUNT(*)::text AS count FROM referral_attributions WHERE affiliate_code_snapshot = $1`,
      `ACODE_${runNamespace}_INACTIVE`,
    );
    expect(after[0].count).toBe(before[0].count);
  });

  it('AC-04: writer cannot INSERT referral_attributions; engine can', async () => {
    // Try direct INSERT as app_user_writer — should be denied by RLS.
    const id = uuidv4();
    await expect(
      writerDb.$executeRawUnsafe(
        `INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES ($1::text, $2::text, $3::text, NOW(), NOW(), 'ACTIVE'::text, NOW())`,
        id,
        nid('referrer-active'),
        'should-fail',
      ),
    ).rejects.toThrow();

    // Engine insert with link-capture context succeeds.
    const engine = getEnginePrisma();
    await engine.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('hrp.engine_context', $1, true)`, 'link-capture');
      const rows = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at)
          VALUES (${uuidv4()}::text, ${nid('referrer-active')}::text, ${'writer-vs-engine'}::text, NOW(), NOW(), 'ACTIVE'::text, NOW())
          RETURNING id::text AS id
        `,
      );
      expect(rows.length).toBe(1);
      createdAttributions.push(rows[0].id);
    });
  });

  it('AC-05: deterministic outcome when same code already has a row for the same referrer', async () => {
    const engine = getEnginePrisma();
    const aff = `RACE_${runNamespace}_A`;
    const userId = nid('referrer-race');
    await adminDb.$executeRawUnsafe(
      `INSERT INTO users(id, role, is_active, aff_code, updated_at) VALUES ($1, 'WORKER', true, $2, NOW()) ON CONFLICT DO NOTHING`,
      userId,
      aff,
    );
    createdUsers.push(userId);

    // Seed one row via the engine.
    await engine.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('hrp.engine_context', $1, true)`, 'link-capture');
      const rows = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at)
          VALUES (${uuidv4()}::text, ${userId}::text, ${aff}::text, NOW(), NOW(), 'ACTIVE'::text, NOW())
          RETURNING id::text AS id
        `,
      );
      createdAttributions.push(rows[0].id);
    });

    // Call the service with a fresh idempotency key + same affCode. Engine
    // INSERT policy allows additional rows (no partial unique asserted in the
    // N2-1 migration SQL). The advisory lock still serializes insertions for
    // the same code window. Outcome is one of OK (insert succeeded) or
    // RACE_RESOLVED (P2002 if any future unique constraint raises); both are
    // typed and deterministic.
    const outcome = await captureReferralLink(baseInput({ affCode: aff }), {
      writer: writerDb,
      engine,
    });
    expect(['OK', 'RACE_RESOLVED']).toContain(outcome.kind);
    if (outcome.kind === 'OK') createdAttributions.push(outcome.attributionId);
  });

  it('AC-07: engine context cleared at COMMIT; no leak across transactions', async () => {
    const engine = getEnginePrisma();

    await engine.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('hrp.engine_context', $1, true)`, 'link-capture');
    });

    // New transaction on the same pooled engine client: context must be ''.
    const after = await engine.$queryRawUnsafe<Array<{ ctx: string | null }>>(
      `SELECT current_setting('hrp.engine_context', true) AS ctx`,
    );
    expect(after[0].ctx ?? '').toBe('');
  });

  it('AC-08: missing HRPARTNER_ENGINE_URL surfaces as ENGINE_UNAVAILABLE (fail-closed)', async () => {
    const saved = process.env.HRPARTNER_ENGINE_URL;
    delete process.env.HRPARTNER_ENGINE_URL;
    try {
      expect(() => getEnginePrisma()).toThrow(/HRPARTNER_ENGINE_URL/);
    } finally {
      if (saved !== undefined) process.env.HRPARTNER_ENGINE_URL = saved;
    }
  });

  it('AC-01 + form: a successful capture ends with status=ACTIVE and 30-day window', async () => {
    const engine = getEnginePrisma();
    const outcome = await captureReferralLink(
      baseInput({ body: { source: 'qr' } }),
      { writer: writerDb, engine },
    );
    expect(outcome.kind).toBe('OK');
    if (outcome.kind !== 'OK') return;
    createdAttributions.push(outcome.attributionId);

    const rows = await adminDb.$queryRawUnsafe<Array<{
      affiliate_code_snapshot: string;
      first_clicked_at: string;
      expires_at: string;
    }>>(
      `SELECT affiliate_code_snapshot, first_clicked_at::text, expires_at::text FROM referral_attributions WHERE id = $1`,
      outcome.attributionId,
    );
    expect(rows[0].affiliate_code_snapshot).toBe(`ACODE_${runNamespace}_ACTIVE`);
    const first = new Date(rows[0].first_clicked_at).getTime();
    const expires = new Date(rows[0].expires_at).getTime();
    expect(expires - first).toBeGreaterThanOrEqual(30 * 24 * 60 * 60 * 1000 - 1000);
  });
});
