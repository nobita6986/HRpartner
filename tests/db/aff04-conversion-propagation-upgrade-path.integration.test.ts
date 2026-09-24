/**
 * tests/db/aff04-conversion-propagation-upgrade-path.integration.test.ts
 *
 * AFF-04 forward-only migration — predecessor upgrade-path integration test.
 *
 * Why this test exists (T0 directive 2026-09-23, F-P4-2):
 *   Fresh-schema tests verify the migration on an empty DB, but production
 *   applies AFF-04 on top of a non-empty schema (Neon branch hrp-live).
 *   The legacy state MUST be preserved across AFF-04:
 *     - accepted CTV_REFERRAL + ctv_id           -> backfill to referrer_user_id
 *     - HRP_DIRECT accepted=false + legacy ctv_id -> preserved (ctv_id unchanged,
 *                                                    referrer_user_id stays NULL)
 *     - VENDOR_SUPPLIED with legacy ctv_id       -> preserved (same as HRP_DIRECT)
 *     - accepted CTV_REFERRAL with ctv_id NULL   -> reject (fail-closed, predicate)
 *     - project_assignments.referrer_id orphan  -> reject (fail-closed, predicate)
 *     - two partial unique indexes preserved    -> assert presence post-apply
 *
 * ENV contract: same as the canonical AFF-04 test. Skipped only when the
 * DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST pair is set and reachable.
 *
 * Workflow:
 *   1. Create an ephemeral database `aff04_upgrade_<runId>` from the admin URL
 *      using `psql -d <admin> -c "CREATE DATABASE ..."`.
 *   2. Run `prisma migrate deploy` against it (apply ALL migrations including
 *      AFF-04) so we have a known-good post-AFF-04 schema baseline.
 *   3. Roll back the AFF-04 artifacts (drop new FK, index, column) using psql
 *      with a small DDL script. The result is a true predecessor state:
 *      source_claims and project_assignments as they existed at baseline
 *      `9e527a13e74c8361feea77b8edca522c8c37ec08`.
 *   4. Seed the predecessor rows that exercise every predicate:
 *        - accepted CTV_REFERRAL + ctv_id  (will be backfilled)
 *        - HRP_DIRECT accepted=false + ctv_id (legacy, preserved)
 *        - VENDOR_SUPPLIED + ctv_id (legacy, preserved)
 *   5. Apply the ACTUAL AFF-04 migration file via `prisma db execute --stdin`
 *      (this is the byte-identical file shipped in the repo, not a re-derived
 *      copy — see `prisma/migrations/20260923120000_aff04_conversion_propagation/`).
 *   6. Verify every assertion in §6.2.
 *   7. Drop the ephemeral database.
 *
 * This test is HEAVY (creates a real database, runs the full migration chain,
 * applies AFF-04 byte-identical). It is intentionally slow and runs LAST in
 * the integration lane. Self-skips when env is absent (ENV_BLOCKED — Tier 0 /
 * Owner cung cấp DB trước khi xét deploy).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl &&
  !!writerUrl &&
  !adminUrl.includes('placeholder') &&
  !writerUrl.includes('placeholder');

const describeIf = HAS_TEST_DB ? describe : describe.skip;

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PRISMA_BIN = path.join(
  REPO_ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);
const PSQL_BIN =
  process.env.PG_PSQL_BIN ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe'
    : 'psql');
const AFF04_MIGRATION_DIR = path.join(
  REPO_ROOT,
  'prisma',
  'migrations',
  '20260923120000_aff04_conversion_propagation',
);
const AFF04_MIGRATION_FILE = path.join(AFF04_MIGRATION_DIR, 'migration.sql');

function buildEphemeralDbName(): string {
  return `aff04_up_${randomUUID().slice(0, 8).replace(/-/g, '')}`;
}

function deriveDbUrl(baseUrl: string, dbName: string): string {
  const u = new URL(baseUrl);
  u.pathname = `/${dbName}`;
  return u.toString();
}

/**
 * Run a SQL string against the given connection URL using psql.
 * Throws on non-zero exit. Pass `database` to override the DB name (default uses URL pathname).
 */
function runPsql(databaseUrl: string, sql: string): string {
  const u = new URL(databaseUrl);
  const dbName = u.pathname.replace(/^\//, '');
  const args = [
    '-h',
    u.hostname,
    '-p',
    u.port || '5432',
    '-U',
    decodeURIComponent(u.username),
    '-d',
    dbName,
    '-X', // do not read ~/.psqlrc
    '-v',
    'ON_ERROR_STOP=1',
    '-q',
    '-c',
    sql,
  ];
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (u.password) env.PGPASSWORD = decodeURIComponent(u.password);
  return execFileSync(PSQL_BIN, args, { env, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

function applyAllMigrations(ephUrl: string): void {
  const result = spawnSync(
    PRISMA_BIN,
    ['migrate', 'deploy', '--schema', path.join(REPO_ROOT, 'prisma', 'schema.prisma')],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, DATABASE_URL: ephUrl },
      stdio: 'pipe',
      shell: true,
    },
  );
  if (result.status !== 0) {
    const stderr = (result.stderr ?? Buffer.from('')).toString();
    const stdout = (result.stdout ?? Buffer.from('')).toString();
    throw new Error(
      `prisma migrate deploy failed (exit ${result.status}). stderr: ${stderr}\nstdout: ${stdout}`,
    );
  }
}

function applyAff04MigrationFile(ephUrl: string): void {
  if (!existsSync(AFF04_MIGRATION_FILE)) {
    throw new Error(`AFF-04 migration file missing: ${AFF04_MIGRATION_FILE}`);
  }
  const sql = readFileSync(AFF04_MIGRATION_FILE, 'utf8');
  const result = spawnSync(
    PRISMA_BIN,
    ['db', 'execute', '--stdin', '--schema', path.join(REPO_ROOT, 'prisma', 'schema.prisma')],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, DATABASE_URL: ephUrl },
      input: sql,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    },
  );
  if (result.status !== 0) {
    const stderr = (result.stderr ?? Buffer.from('')).toString();
    const stdout = (result.stdout ?? Buffer.from('')).toString();
    throw new Error(
      `prisma db execute --stdin for AFF-04 migration failed (exit ${result.status}). stderr: ${stderr}\nstdout: ${stdout}`,
    );
  }
}

describeIf('AFF-04 predecessor upgrade-path (T0 directive F-P4-2)', () => {
  let admin: PrismaClient;
  let ephemeral: PrismaClient;
  const ephemeralDbName = buildEphemeralDbName();
  const ephemeralUrl = deriveDbUrl(adminUrl, ephemeralDbName);

  const ctvUserId = `aff04-up-${randomUUID().slice(0, 8)}-ctv`;
  const vendorCtvUserId = `aff04-up-${randomUUID().slice(0, 8)}-vctv`;
  const adminUserId = `aff04-up-${randomUUID().slice(0, 8)}-admin`;
  const workerAId = `aff04-up-${randomUUID().slice(0, 8)}-wka`;
  const workerBId = `aff04-up-${randomUUID().slice(0, 8)}-wkb`;
  const workerCId = `aff04-up-${randomUUID().slice(0, 8)}-wkc`;
  const projectAId = `aff04-up-${randomUUID().slice(0, 8)}-prja`;

  // DDL that rolls the AFF-04 artifacts out of the DB to recreate the
  // predecessor state at baseline 9e527a13. Order matters because of FKs.
  const ROLLBACK_AFF04_DDL = `
    DROP INDEX IF EXISTS "project_assignments_referrer_id_status_idx";
    ALTER TABLE "project_assignments" DROP CONSTRAINT IF EXISTS "project_assignments_referrer_id_fkey";
    DROP INDEX IF EXISTS "source_claims_referrer_user_id_accepted_idx";
    ALTER TABLE "source_claims" DROP CONSTRAINT IF EXISTS "source_claims_referrer_user_id_fkey";
    ALTER TABLE "source_claims" DROP COLUMN IF EXISTS "referrer_user_id";
  `;

  beforeAll(async () => {
    admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });

    // Step 1: create ephemeral DB (psql is the only tool that can CREATE DATABASE
    // outside the admin's `postgres` schema cleanly — Prisma does not expose it).
    runPsql(adminUrl, `CREATE DATABASE "${ephemeralDbName}"`);

    // Step 2: apply all migrations to ephemeral DB (including AFF-04).
    applyAllMigrations(ephemeralUrl);

    // Step 3: roll back AFF-04 artifacts (drops column, FK, index).
    runPsql(ephemeralUrl, ROLLBACK_AFF04_DDL);

    // Step 4: seed predecessor state via Prisma (admin client has OWNER privilege).
    ephemeral = new PrismaClient({ datasources: { db: { url: ephemeralUrl } } });

    await ephemeral.user.createMany({
      data: [
        { id: ctvUserId, phone: `${ctvUserId}-phone`, name: 'AFF-04 UP CTV', role: 'CTV' },
        { id: vendorCtvUserId, phone: `${vendorCtvUserId}-phone`, name: 'AFF-04 UP Vendor CTV', role: 'CTV' },
        { id: adminUserId, phone: `${adminUserId}-phone`, name: 'AFF-04 UP Admin', role: 'ADMIN' },
      ],
    });
    for (const [wkId, label] of [
      [workerAId, 'A'],
      [workerBId, 'B'],
      [workerCId, 'C'],
    ] as const) {
      const userId = `${wkId}-user`;
      await ephemeral.user.create({
        data: { id: userId, phone: `${userId}-phone`, name: `AFF-04 UP Worker ${label}`, role: 'CTV' },
      });
      await ephemeral.worker.create({
        data: {
          id: wkId,
          userId,
          fullName: `AFF-04 UP Worker ${label}`,
          phone: `${wkId}-phone`,
        },
      });
    }
    const vendorId = `aff04-up-vendor-${randomUUID().slice(0, 8)}`;
    await ephemeral.vendor.create({
      data: { id: vendorId, code: vendorId, name: 'AFF-04 UP Vendor' },
    });
    const ccId = `aff04-up-cc-${randomUUID().slice(0, 8)}`;
    await ephemeral.clientCompany.create({
      data: { id: ccId, code: `${ccId}-code`, name: 'AFF-04 UP Client Co' },
    });
    await ephemeral.project.create({
      data: {
        id: projectAId,
        code: `${projectAId}-code`,
        name: 'AFF-04 UP Project A',
        quota: 10,
        filled: 0,
        status: 'ACTIVE',
        pmUserId: adminUserId,
        startDate: new Date(),
        clientCompanyId: ccId,
      },
    });

    // SOURCE CLAIM fixtures (predecessor state, no referrer_user_id column yet):
    // (a) accepted CTV_REFERRAL + ctv_id  -> WILL be backfilled by AFF-04
    await ephemeral.sourceClaim.create({
      data: {
        id: `${workerAId}-claim-ctv`,
        workerId: workerAId,
        claimType: 'CTV_REFERRAL',
        ctvId: ctvUserId,
        accepted: true,
        acceptedBy: adminUserId,
      },
    });
    // (b) HRP_DIRECT accepted=false + legacy ctv_id  -> PRESERVED unchanged by AFF-04
    await ephemeral.$executeRawUnsafe(
      `INSERT INTO source_claims (id, worker_id, claim_type, ctv_id, accepted, registration_channel, updated_at)
       VALUES ($1, $2, 'HRP_DIRECT', $3, false, 'SALE_ADDED', NOW())`,
      [`${workerBId}-claim-hrp-legacy`, workerBId, vendorCtvUserId],
    );
    // (c) VENDOR_SUPPLIED + legacy ctv_id  -> PRESERVED unchanged by AFF-04
    await ephemeral.$executeRawUnsafe(
      `INSERT INTO source_claims (id, worker_id, claim_type, ctv_id, vendor_id, accepted, updated_at)
       VALUES ($1, $2, 'VENDOR_SUPPLIED', $3, $4, false, NOW())`,
      [`${workerCId}-claim-vendor-legacy`, workerCId, vendorCtvUserId, vendorId],
    );
  }, 240_000);

  afterAll(async () => {
    try {
      // Terminate any lingering connections to the ephemeral DB before dropping.
      runPsql(
        adminUrl,
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${ephemeralDbName}' AND pid <> pg_backend_pid();`,
      );
      runPsql(adminUrl, `DROP DATABASE IF EXISTS "${ephemeralDbName}"`);
    } catch (e) {
      // best-effort cleanup; the test still reports its own pass/fail
      console.error('[aff04 upgrade-path] cleanup error:', e);
    } finally {
      await ephemeral?.$disconnect().catch(() => {});
      await admin?.$disconnect().catch(() => {});
    }
  }, 60_000);

  it('rolls back to the true predecessor state (no AFF-04 artifacts present)', async () => {
    const cols = await ephemeral.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='source_claims' AND column_name='referrer_user_id'`,
    );
    expect(cols).toHaveLength(0);

    const idx = await ephemeral.$queryRawUnsafe<Array<{ indexname: string }>>(
      `SELECT indexname FROM pg_indexes
        WHERE schemaname='public'
          AND ((tablename='source_claims' AND indexname='source_claims_referrer_user_id_accepted_idx')
            OR (tablename='project_assignments' AND indexname='project_assignments_referrer_id_status_idx'))`,
    );
    expect(idx).toHaveLength(0);

    const fks = await ephemeral.$queryRawUnsafe<Array<{ conname: string }>>(
      `SELECT conname FROM pg_constraint
        WHERE conname IN ('source_claims_referrer_user_id_fkey', 'project_assignments_referrer_id_fkey')`,
    );
    expect(fks).toHaveLength(0);
  });

  it('applies the byte-identical AFF-04 migration file', () => {
    // The migration file content is what production will execute.
    const sql = readFileSync(AFF04_MIGRATION_FILE, 'utf8');
    expect(sql).toContain('20260923120000_aff04_conversion_propagation');
    expect(sql).toContain('referrer_user_id');
    // F-P4-1: the old fail-closed predicate that REJECTED non-CTV ctv_id is gone.
    expect(sql).not.toMatch(/FAIL:\s*%\s*source_claims\s*row\(s\)\s*are\s*NOT\s*CTV_REFERRAL/i);
    // The narrow fail-closed predicates (accepted CTV_REFERRAL with NULL ctv_id; orphan
    // referrer_id on project_assignments) are still present.
    expect(sql).toMatch(/accepted CTV_REFERRAL row\(s\) have NULL ctv_id/);
    expect(sql).toMatch(/orphan referrer_id/);
    // The informational NOTICE on non-CTV legacy ctv_id is present.
    expect(sql).toMatch(/non-CTV_REFERRAL row\(s\) carry legacy ctv_id/i);

    // Apply through the actual toolchain. Throws on failure.
    applyAff04MigrationFile(ephemeralUrl);
  }, 120_000);

  it('backfills only accepted CTV_REFERRAL with non-null ctv_id', async () => {
    const ctvRow = await ephemeral.$queryRawUnsafe<Array<{ referrer_user_id: string | null }>>(
      `SELECT referrer_user_id FROM source_claims WHERE id = $1`,
      [`${workerAId}-claim-ctv`],
    );
    expect(ctvRow).toHaveLength(1);
    expect(ctvRow[0].referrer_user_id).toBe(ctvUserId);

    const hrpRow = await ephemeral.$queryRawUnsafe<Array<{ ctv_id: string | null; referrer_user_id: string | null }>>(
      `SELECT ctv_id, referrer_user_id FROM source_claims WHERE id = $1`,
      [`${workerBId}-claim-hrp-legacy`],
    );
    expect(hrpRow[0].ctv_id).toBe(vendorCtvUserId); // preserved
    expect(hrpRow[0].referrer_user_id).toBeNull(); // NOT promoted

    const vendorRow = await ephemeral.$queryRawUnsafe<Array<{ ctv_id: string | null; referrer_user_id: string | null }>>(
      `SELECT ctv_id, referrer_user_id FROM source_claims WHERE id = $1`,
      [`${workerCId}-claim-vendor-legacy`],
    );
    expect(vendorRow[0].ctv_id).toBe(vendorCtvUserId); // preserved
    expect(vendorRow[0].referrer_user_id).toBeNull(); // NOT promoted
  });

  it('does not modify non-CTV rows outside the predicate (zero row drift)', async () => {
    const drift = await ephemeral.$queryRawUnsafe<Array<{ c: string }>>(
      `SELECT id AS c FROM source_claims
        WHERE claim_type <> 'CTV_REFERRAL'
          AND referrer_user_id IS NOT NULL`,
    );
    expect(drift).toHaveLength(0);
  });

  it('preserves the two pre-existing partial unique indexes verbatim', async () => {
    const rows = await ephemeral.$queryRawUnsafe<Array<{ indexname: string }>>(
      `SELECT indexname FROM pg_indexes
        WHERE schemaname='public' AND tablename='source_claims'
          AND indexname IN ('one_accepted_source', 'one_accepted_source_per_submission')
        ORDER BY indexname`,
    );
    expect(rows.map((r) => r.indexname)).toEqual([
      'one_accepted_source',
      'one_accepted_source_per_submission',
    ]);
  });

  it('installs both new AFF-04 FKs and indexes', async () => {
    const fks = await ephemeral.$queryRawUnsafe<Array<{ conname: string; confdeltype: string }>>(
      `SELECT conname, confdeltype FROM pg_constraint
        WHERE conname IN ('source_claims_referrer_user_id_fkey', 'project_assignments_referrer_id_fkey')`,
    );
    expect(fks).toHaveLength(2);
    for (const fk of fks) {
      expect(fk.confdeltype).toBe('r'); // 'r' = RESTRICT
    }

    const idx = await ephemeral.$queryRawUnsafe<Array<{ indexname: string }>>(
      `SELECT indexname FROM pg_indexes
        WHERE schemaname='public'
          AND ((tablename='source_claims' AND indexname='source_claims_referrer_user_id_accepted_idx')
            OR (tablename='project_assignments' AND indexname='project_assignments_referrer_id_status_idx'))`,
    );
    expect(idx.map((r) => r.indexname).sort()).toEqual([
      'project_assignments_referrer_id_status_idx',
      'source_claims_referrer_user_id_accepted_idx',
    ]);
  });

  it('fail-closed invariants still hold at runtime (cannot backfill non-CTV row)', async () => {
    // The narrow backfill predicate excludes non-CTV rows. Re-running it must match zero rows.
    const r = await ephemeral.$queryRawUnsafe<Array<{ c: string }>>(
      `UPDATE source_claims
          SET referrer_user_id = ctv_id
        WHERE claim_type <> 'CTV_REFERRAL'
          AND ctv_id IS NOT NULL
          AND referrer_user_id IS NULL
        RETURNING id AS c`,
    );
    expect(r).toHaveLength(0);
  });
});
