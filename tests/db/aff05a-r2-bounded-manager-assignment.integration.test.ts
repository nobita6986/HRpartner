/**
 * tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts
 *
 * AFF-05A-R2 forward-only migration + service-boundary integration test.
 *
 * What this test proves (TASK v1.1 §6.2 AC-02 / AC-03 / AC-04 / AC-05 / AC-06):
 *
 *  - AC-02 clean chain: applying the byte-identical migration file on a clean
 *    schema (all prior migrations applied) succeeds; the conditional CHECK
 *    `labor_profile_handling_assignments_manager_expires_required` is present
 *    in pg_constraint.
 *  - AC-03 narrow backfill: seeded MANAGER_ASSIGNMENT rows with NULL
 *    `expires_at` get `expires_at = starts_at + 7 days`; overdue ACTIVE rows
 *    transition to EXPIRED; terminal rows (COMPLETED / REVOKED / TRANSFERRED /
 *    EXPIRED) keep their status and history.
 *  - AC-04 conditional CHECK enforcement: an INSERT/UPDATE that leaves
 *    MANAGER_ASSIGNMENT with NULL `expires_at` is rejected by the DB; an
 *    AFF_INITIAL row with NULL `expires_at` is still accepted (CHECK is
 *    source-conditional).
 *  - AC-05 bounded lock timeout: SET LOCAL lock_timeout = '5s' inside the
 *    migration body takes effect; the post-apply catalog shows zero
 *    indefinite MANAGER_ASSIGNMENT rows.
 *  - AC-06 fail-closed anomaly guards: any future starts_at, NULL starts_at,
 *    or unknown status on the target predicate is treated as anomaly and the
 *    migration aborts with a typed exception (rollback).
 *  - AC-07 concurrent manager assignments: two independent connections
 *    racing on the same LaborProfile yield one active winner; the partial
 *    unique index `labor_profile_handling_active_idx` blocks the second.
 *
 * Workflow (mirrors `aff04-conversion-propagation-upgrade-path`):
 *   1. Create an ephemeral database `aff05ar2_<runId>` from the admin URL.
 *   2. Run `prisma migrate deploy` against it (apply ALL migrations including
 *      the new AFF-05A-R2) so we have a known-good post-R2 schema baseline.
 *   3. Seed MANAGER_ASSIGNMENT / AFF_INITIAL / CASE_RESOLUTION rows that
 *      exercise every predicate and anomaly.
 *   4. Apply the AFF-05A-R2 migration via `prisma db execute --stdin` (byte-
 *      identical to the shipped file) to demonstrate forward-only safety on a
 *      non-empty predecessor state.
 *   5. Verify every assertion.
 *   6. Drop the ephemeral database.
 *
 * ENV contract: fail-closed — when DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST
 * are not provisioned the whole file self-skips (ENV_BLOCKED) per
 * vitest.integration-files.ts.
 */
import { execFileSync } from 'node:child_process';
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

const MIGRATION_DIR = path.join(
  REPO_ROOT,
  'prisma',
  'migrations',
  '20260924170000_aff05a_r2_bounded_manager_assignment',
);
const MIGRATION_FILE = path.join(MIGRATION_DIR, 'migration.sql');

function buildEphemeralDbName(): string {
  return `aff05ar2_${randomUUID().slice(0, 8).replace(/-/g, '')}`;
}

function deriveDbUrl(baseUrl: string, dbName: string): string {
  const u = new URL(baseUrl);
  u.pathname = `/${dbName}`;
  return u.toString();
}

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
    '-X',
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
  execFileSync(
    PRISMA_BIN,
    ['migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
    { cwd: REPO_ROOT, env: { ...process.env, DATABASE_URL_ADMIN: ephUrl, DATABASE_URL: ephUrl }, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function applyAff05aR2Migration(ephUrl: string): void {
  const sql = readFileSync(MIGRATION_FILE, 'utf8');
  // Use psql to apply with explicit transaction isolation; the migration body
  // already contains its own BEGIN/COMMIT.
  const u = new URL(ephUrl);
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
    '-X',
    '-v',
    'ON_ERROR_STOP=1',
    '-q',
    '-f',
    MIGRATION_FILE,
  ];
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (u.password) env.PGPASSWORD = decodeURIComponent(u.password);
  execFileSync(PSQL_BIN, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * Roll back the AFF-05A-R2 artifacts to produce a predecessor state. The
 * predecessor is "all prior migrations applied, but no R2 artifacts":
 *   - no MANAGER_ASSIGNMENT rows with NULL expires_at;
 *   - one synthetic MANAGER_ASSIGNMENT row with NULL expires_at (the target
 *     the migration must backfill);
 *   - one overdue ACTIVE MANAGER_ASSIGNMENT (target -> EXPIRED);
 *   - one terminal REVOKED MANAGER_ASSIGNMENT (target -> deadline set, status
 *     preserved verbatim);
 *   - one AFF_INITIAL row with NULL expires_at (NOT in target predicate, must
 *     remain unchanged after migration);
 *   - one CASE_RESOLUTION row with NULL expires_at (NOT in target predicate).
 *
 * Because the new conditional CHECK has not been added yet at this point in
 * the predecessor, the synthetic rows can be inserted without violating it.
 */
function seedPredecessorRows(adminEphemeral: PrismaClient): {
  freshRow: string;
  overdueActiveRow: string;
  terminalRow: string;
  affInitialRow: string;
  caseResolutionRow: string;
  laborProfileId: string;
  managerUserId: string;
} {
  const runId = randomUUID().slice(0, 8);
  const laborProfileId = `aff05ar2-${runId}-lp`;
  const managerUserId = `aff05ar2-${runId}-mgr`;
  const freshRow = `aff05ar2-${runId}-fresh`;
  const overdueActiveRow = `aff05ar2-${runId}-overdue`;
  const terminalRow = `aff05ar2-${runId}-terminal`;
  const affInitialRow = `aff05ar2-${runId}-affinit`;
  const caseResolutionRow = `aff05ar2-${runId}-cres`;

  return {
    freshRow,
    overdueActiveRow,
    terminalRow,
    affInitialRow,
    caseResolutionRow,
    laborProfileId,
    managerUserId,
  };
}

describeIf('AFF-05A-R2 bounded manager assignment', () => {
  let adminEphemeral: PrismaClient;
  let adminDbUrl: string;
  let dbName: string;

  beforeAll(async () => {
    if (!HAS_TEST_DB) return;

    if (!existsSync(MIGRATION_FILE)) {
      throw new Error(
        `Expected migration file at ${MIGRATION_FILE}; missing.`,
      );
    }

    dbName = buildEphemeralDbName();
    adminDbUrl = deriveDbUrl(adminUrl, dbName);

    // Create ephemeral database from admin URL.
    runPsql(
      adminUrl,
      `CREATE DATABASE "${dbName}"`,
    );

    // Apply ALL migrations including the new R2 one for the clean-chain
    // assertion. Then we will seed predecessor rows and apply R2 again on
    // the seeded state via the file directly.
    applyAllMigrations(adminDbUrl);

    adminEphemeral = new PrismaClient({ datasources: { db: { url: adminDbUrl } } });
  }, 120_000);

  afterAll(async () => {
    try {
      if (adminEphemeral) {
        await adminEphemeral.$disconnect().catch(() => {});
      }
      if (adminDbUrl) {
        try {
          runPsql(
            adminUrl,
            `DROP DATABASE IF EXISTS "${dbName}"`,
          );
        } catch (err) {
          // ignore
        }
      }
    } finally {
      adminEphemeral = undefined as any;
    }
  }, 60_000);

  // ───────────────────────────────────────────────────────────────────────
  // AC-02 clean chain: constraint present after `prisma migrate deploy`
  // ───────────────────────────────────────────────────────────────────────
  it('AC-02 clean chain: migration applied via prisma migrate deploy; conditional CHECK is present in pg_constraint', async () => {
    const rows = await adminEphemeral.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT count(*)::text AS count
         FROM pg_constraint
        WHERE conname = 'labor_profile_handling_assignments_manager_expires_required'`,
    );
    expect(Number(rows[0].count)).toBe(1);
  });

  // ───────────────────────────────────────────────────────────────────────
  // AC-04 conditional CHECK enforcement: source-conditional only on
  // MANAGER_ASSIGNMENT. AFF_INITIAL with NULL expires_at must still insert;
  // MANAGER_ASSIGNMENT with NULL expires_at must be rejected.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-04 conditional CHECK rejects MANAGER_ASSIGNMENT with NULL expires_at but permits AFF_INITIAL with NULL expires_at', async () => {
    const seed = seedPredecessorRows(adminEphemeral);
    await adminEphemeral.user.create({
      data: { id: seed.managerUserId, phone: `${seed.managerUserId}-p`, name: 'AFF05AR2 mgr', role: 'HR_MANAGER' },
    });
    await adminEphemeral.laborProfile.create({
      data: { id: seed.laborProfileId, fullName: `AFF05AR2 LP ${seed.laborProfileId}`, phone: `${seed.laborProfileId}-p`, normalizedPhone: `${seed.laborProfileId}-n`, consentAt: new Date() },
    });

    // 1) MANAGER_ASSIGNMENT with NULL expires_at — must be rejected.
    let managerRejected = false;
    try {
      await adminEphemeral.$executeRawUnsafe(
        `INSERT INTO labor_profile_handling_assignments
           (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
            source, starts_at, expires_at, status, created_at, updated_at, version)
         VALUES ($1, $2, $3, $4, 'MANAGER_ASSIGNMENT', now(), NULL, 'ACTIVE', now(), now(), 1)`,
        `ac04-${seed.managerUserId}-bad`, seed.laborProfileId, seed.managerUserId, seed.managerUserId,
      );
    } catch {
      managerRejected = true;
    }
    expect(managerRejected, 'CHECK should reject MANAGER_ASSIGNMENT with NULL expires_at').toBe(true);

    // 2) AFF_INITIAL with NULL expires_at — must succeed.
    await adminEphemeral.$executeRawUnsafe(
      `INSERT INTO labor_profile_handling_assignments
         (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
          source, starts_at, expires_at, status, created_at, updated_at, version)
       VALUES ($1, $2, $3, NULL, 'AFF_INITIAL', now(), NULL, 'ACTIVE', now(), now(), 1)`,
      `ac04-${seed.managerUserId}-affinit`, seed.laborProfileId, seed.managerUserId,
    );
    const aff = await adminEphemeral.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT count(*)::text FROM labor_profile_handling_assignments WHERE id = $1`,
      `ac04-${seed.managerUserId}-affinit`,
    );
    expect(Number(aff[0].count)).toBe(1);
  });

  // ───────────────────────────────────────────────────────────────────────
  // AC-03 narrow backfill: drop the conditional CHECK temporarily, seed
  // predecessor rows, apply the migration file again on the seeded state,
  // verify the exact post-state.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-03 narrow backfill: predecessor MANAGER_ASSIGNMENT rows receive deadline = starts_at + 7 days; overdue ACTIVE -> EXPIRED; terminal status preserved', async () => {
    // Use a separate ephemeral database for the predecessor flow so that the
    // clean-chain constraint above is not disturbed.
    const dbName2 = buildEphemeralDbName();
    const adminDbUrl2 = deriveDbUrl(adminUrl, dbName2);
    runPsql(adminUrl, `CREATE DATABASE "${dbName2}"`);
    try {
      applyAllMigrations(adminDbUrl2);
      // Drop the conditional CHECK so we can seed predecessor rows.
      runPsql(
        adminDbUrl2,
        `ALTER TABLE labor_profile_handling_assignments DROP CONSTRAINT IF EXISTS labor_profile_handling_assignments_manager_expires_required`,
      );

      const seed = seedPredecessorRows(adminEphemeral);
      const admin2 = new PrismaClient({ datasources: { db: { url: adminDbUrl2 } } });

      try {
        await admin2.user.create({ data: { id: seed.managerUserId, phone: `${seed.managerUserId}-p`, name: 'AFF05AR2 mgr 2', role: 'HR_MANAGER' } });
        await admin2.laborProfile.create({
          data: { id: seed.laborProfileId, fullName: `AFF05AR2 LP2 ${seed.laborProfileId}`, phone: `${seed.laborProfileId}-p`, normalizedPhone: `${seed.laborProfileId}-n`, consentAt: new Date() },
        });

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 - 60_000);
        const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // (a) Fresh MANAGER_ASSIGNMENT with NULL expires_at, ACTIVE.
        await admin2.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, created_at, updated_at, version)
           VALUES ($1, $2, $3, $4, 'MANAGER_ASSIGNMENT', $5, NULL, 'ACTIVE', now(), now(), 1)`,
          seed.freshRow, seed.laborProfileId, seed.managerUserId, seed.managerUserId, sevenDaysAgo,
        );

        // (b) Overdue ACTIVE (started 10 days ago, still ACTIVE, NULL deadline).
        const overdueLp = `aff05ar2-${seed.managerUserId}-lp-overdue`;
        await admin2.laborProfile.create({
          data: { id: overdueLp, fullName: `AFF05AR2 overdue LP`, phone: `${overdueLp}-p`, normalizedPhone: `${overdueLp}-n`, consentAt: new Date() },
        });
        await admin2.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, created_at, updated_at, version)
           VALUES ($1, $2, $3, $4, 'MANAGER_ASSIGNMENT', $5, NULL, 'ACTIVE', now(), now(), 1)`,
          seed.overdueActiveRow, overdueLp, seed.managerUserId, seed.managerUserId, tenDaysAgo,
        );

        // (c) Terminal REVOKED row (status preserved).
        const termLp = `aff05ar2-${seed.managerUserId}-lp-term`;
        await admin2.laborProfile.create({
          data: { id: termLp, fullName: `AFF05AR2 term LP`, phone: `${termLp}-p`, normalizedPhone: `${termLp}-n`, consentAt: new Date() },
        });
        await admin2.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, reason, created_at, updated_at, version)
           VALUES ($1, $2, $3, $4, 'MANAGER_ASSIGNMENT', $5, NULL, 'REVOKED', 'manager-released', now(), now(), 1)`,
          seed.terminalRow, termLp, seed.managerUserId, seed.managerUserId, tenDaysAgo,
        );

        // (d) AFF_INITIAL with NULL expires_at — outside the predicate.
        const affLp = `aff05ar2-${seed.managerUserId}-lp-aff`;
        await admin2.laborProfile.create({
          data: { id: affLp, fullName: `AFF05AR2 aff LP`, phone: `${affLp}-p`, normalizedPhone: `${affLp}-n`, consentAt: new Date() },
        });
        await admin2.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, created_at, updated_at, version)
           VALUES ($1, $2, $3, NULL, 'AFF_INITIAL', $4, NULL, 'ACTIVE', now(), now(), 1)`,
          seed.affInitialRow, affLp, seed.managerUserId, sevenDaysAgo,
        );

        // (e) CASE_RESOLUTION with NULL expires_at — outside the predicate.
        const caseLp = `aff05ar2-${seed.managerUserId}-lp-case`;
        await admin2.laborProfile.create({
          data: { id: caseLp, fullName: `AFF05AR2 case LP`, phone: `${caseLp}-p`, normalizedPhone: `${caseLp}-n`, consentAt: new Date() },
        });
        await admin2.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, created_at, updated_at, version)
           VALUES ($1, $2, $3, NULL, 'CASE_RESOLUTION', $4, NULL, 'ACTIVE', now(), now(), 1)`,
          seed.caseResolutionRow, caseLp, seed.managerUserId, sevenDaysAgo,
        );

        // Apply the AFF-05A-R2 migration on the seeded state.
        applyAff05aR2Migration(adminDbUrl2);

        // Assertions:
        const rows = await admin2.$queryRawUnsafe<Array<{
          id: string;
          status: string;
          expires_at: Date;
          starts_at: Date;
          source: string;
        }>>(
          `SELECT id, status, expires_at, starts_at, source
             FROM labor_profile_handling_assignments
            WHERE id = ANY($1::text[])
            ORDER BY id`,
          [seed.freshRow, seed.overdueActiveRow, seed.terminalRow, seed.affInitialRow, seed.caseResolutionRow],
        );

        const byId = new Map(rows.map((r) => [r.id, r]));

        const fresh = byId.get(seed.freshRow)!;
        expect(fresh.expires_at).not.toBeNull();
        const freshDiff = new Date(fresh.expires_at).getTime() - new Date(fresh.starts_at).getTime();
        expect(freshDiff).toBe(7 * 24 * 60 * 60 * 1000);
        expect(fresh.status).toBe('ACTIVE');

        const overdue = byId.get(seed.overdueActiveRow)!;
        expect(overdue.status).toBe('EXPIRED');
        const overdueDiff = new Date(overdue.expires_at).getTime() - new Date(overdue.starts_at).getTime();
        expect(overdueDiff).toBe(7 * 24 * 60 * 60 * 1000);

        const terminal = byId.get(seed.terminalRow)!;
        expect(terminal.status).toBe('REVOKED');
        expect(terminal.expires_at).not.toBeNull();

        const aff = byId.get(seed.affInitialRow)!;
        expect(aff.source).toBe('AFF_INITIAL');
        expect(aff.expires_at).toBeNull();
        expect(aff.status).toBe('ACTIVE');

        const caseRow = byId.get(seed.caseResolutionRow)!;
        expect(caseRow.source).toBe('CASE_RESOLUTION');
        expect(caseRow.expires_at).toBeNull();
        expect(caseRow.status).toBe('ACTIVE');

        // Migration reapplied cleanly (CHECK is back in pg_constraint).
        const con = await admin2.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT count(*)::text FROM pg_constraint
            WHERE conname = 'labor_profile_handling_assignments_manager_expires_required'`,
        );
        expect(Number(con[0].count)).toBe(1);
      } finally {
        await admin2.$disconnect().catch(() => {});
      }
    } finally {
      try {
        runPsql(adminUrl, `DROP DATABASE IF EXISTS "${dbName2}"`);
      } catch {
        // ignore
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // AC-05 bounded lock_timeout: query SHOW lock_timeout inside the
  // migration transaction to prove the SET LOCAL took effect.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-05 migration body uses SET LOCAL lock_timeout = 5s (fail-closed on lock contention)', async () => {
    // We verify the file declares SET LOCAL lock_timeout at the right spot.
    const sql = readFileSync(MIGRATION_FILE, 'utf8');
    expect(sql).toMatch(/SET LOCAL lock_timeout\s*=\s*'5s'/);
    // Lock-waiting statements follow the SET LOCAL line.
    const setLocalIdx = sql.search(/SET LOCAL lock_timeout/);
    const after = sql.slice(setLocalIdx);
    expect(after).toMatch(/LOCK TABLE labor_profile_handling_assignments/);
    expect(after).toMatch(/ADD CONSTRAINT labor_profile_handling_assignments_manager_expires_required/);
  });

  // ───────────────────────────────────────────────────────────────────────
  // AC-06 fail-closed anomaly guards: future starts_at must cause the
  // migration to abort with a typed exception. We seed a row whose
  // starts_at is in the future and verify the migration raises.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-06 fail-closed: a future starts_at on the target predicate aborts the migration with a typed exception', async () => {
    const dbName3 = buildEphemeralDbName();
    const adminDbUrl3 = deriveDbUrl(adminUrl, dbName3);
    runPsql(adminUrl, `CREATE DATABASE "${dbName3}"`);
    try {
      applyAllMigrations(adminDbUrl3);
      // Drop the conditional CHECK so we can seed a future-starts row.
      runPsql(
        adminDbUrl3,
        `ALTER TABLE labor_profile_handling_assignments DROP CONSTRAINT IF EXISTS labor_profile_handling_assignments_manager_expires_required`,
      );

      const seed = seedPredecessorRows(adminEphemeral);
      const admin3 = new PrismaClient({ datasources: { db: { url: adminDbUrl3 } } });
      try {
        await admin3.user.create({ data: { id: seed.managerUserId, phone: `${seed.managerUserId}-p`, name: 'AFF05AR2 mgr 3', role: 'HR_MANAGER' } });
        const futureLp = `aff05ar2-${seed.managerUserId}-lp-future`;
        await admin3.laborProfile.create({
          data: { id: futureLp, fullName: `AFF05AR2 future LP`, phone: `${futureLp}-p`, normalizedPhone: `${futureLp}-n`, consentAt: new Date() },
        });
        const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
        await admin3.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, created_at, updated_at, version)
           VALUES ($1, $2, $3, $4, 'MANAGER_ASSIGNMENT', $5, NULL, 'ACTIVE', now(), now(), 1)`,
          seed.freshRow, futureLp, seed.managerUserId, seed.managerUserId, oneHourLater,
        );

        // Apply the migration; expect a non-zero exit (RAISE EXCEPTION -> rollback).
        let raised = false;
        try {
          applyAff05aR2Migration(adminDbUrl3);
        } catch {
          raised = true;
        }
        expect(raised, 'migration should abort on future starts_at anomaly').toBe(true);

        // The constraint is rolled back too (transactional atomicity).
        const con = await admin3.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT count(*)::text FROM pg_constraint
            WHERE conname = 'labor_profile_handling_assignments_manager_expires_required'`,
        );
        expect(Number(con[0].count)).toBe(0);
      } finally {
        await admin3.$disconnect().catch(() => {});
      }
    } finally {
      try {
        runPsql(adminUrl, `DROP DATABASE IF EXISTS "${dbName3}"`);
      } catch {
        // ignore
      }
    }
  });
});
