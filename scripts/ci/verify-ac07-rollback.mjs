#!/usr/bin/env node
/**
 * scripts/ci/verify-ac07-rollback.mjs
 *
 * AC-07 verification: forces a migration anomaly (far-future starts_at on an
 * AFF_INITIAL NULL-deadline row) before applying the R1 migration. The migration
 * should RAISE EXCEPTION at the anomaly check, causing the ENTIRE transaction to
 * roll back — including the function replacement, the handling SELECT grant, and
 * all data mutations. Proves:
 *
 *   (a) function body rolled back to predecessor (no R1 marker, no advisory lock).
 *   (b) handling SELECT privilege NOT granted (rolls back with the transaction).
 *   (c) anomaly row preserved in its original state (NULL deadline, ACTIVE).
 *   (d) no spurious LPHA rows created.
 *
 * T0 round-4: --lock-timeout mode — two-connection evidence for the bounded
 * `SET LOCAL lock_timeout = '5s'` setting in the R1 migration. Connection A
 * holds `LOCK TABLE labor_profile_handling_assignments IN SHARE ROW EXCLUSIVE
 * MODE`; connection B runs the R1 migration which must abort with
 * `canceling statement due to lock timeout` (NOT hang indefinitely).
 *
 * The migration file is executed as a single psql transaction. The anomaly
 * is seeded BEFORE the migration runs, triggering the backfill's RAISE EXCEPTION
 * path. Evidence is written to `evidence/ac07-rollback.txt` (default mode) or
 * `evidence/ac04-lock-timeout.txt` (`--lock-timeout` mode).
 *
 * Usage:
 *   node scripts/ci/verify-ac07-rollback.mjs                # AC-07 default
 *   node scripts/ci/verify-ac07-rollback.mjs --lock-timeout # AC-04 lock_timeout evidence
 */
import { Client } from 'pg';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const ADMIN_URL = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const TARGET_DB = process.env.MIGRATION_TARGET_DB ?? 'aff05a_r1_migration_test';
const EVIDENCE_DIR = process.env.EVIDENCE_DIR ?? join(REPO_ROOT, 'docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence');

// T0 round-4: synthetic-only host + DB allowlist. Reject non-loopback hosts
// and any DB name outside the project's synthetic prefix BEFORE any
// destructive action.
const ALLOWED_DB_NAMES = new Set([
  'aff05a_r1_test',
  'aff05a_r1_migration_test',
  'aff05a_r1_baseline_test',
]);
const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function guardDbName(name, role) {
  if (!ALLOWED_DB_NAMES.has(name)) {
    console.error(`UNSAFE_DB_NAME ${role}=${name} — refusing. Allowed: ${[...ALLOWED_DB_NAMES].join(', ')}`);
    process.exit(3);
  }
}
function guardHost(host) {
  if (!ALLOWED_HOSTS.has(host)) {
    console.error(`UNSAFE_HOST host=${host} — refusing. Allowed: ${[...ALLOWED_HOSTS].join(', ')}`);
    process.exit(3);
  }
}
guardDbName(TARGET_DB, 'MIGRATION_TARGET_DB');

if (!ADMIN_URL) { console.error('ERROR: DATABASE_URL_ADMIN_TEST not set'); process.exit(2); }
if (!process.env.PGPASSWORD) { console.error('ERROR: PGPASSWORD not set'); process.exit(2); }

if (!existsSync(EVIDENCE_DIR)) mkdirSync(EVIDENCE_DIR, { recursive: true });
const LOCK_TIMEOUT_MODE = process.argv.includes('--lock-timeout');
const EVIDENCE_FILE = join(EVIDENCE_DIR, LOCK_TIMEOUT_MODE ? 'ac04-lock-timeout.txt' : 'ac07-rollback.txt');
const logLines = [];
const log = (line) => { console.log(line); logLines.push(line); };

const adminConn = new URL(ADMIN_URL);
const host = adminConn.hostname || '127.0.0.1';
const port = adminConn.port || '5432';
const user = adminConn.username;
const password = adminConn.password;

guardHost(host);

const targetUrl = `postgresql://${user}:${password}@${host}:${port}/${TARGET_DB}`;

function pgClient(url) {
  return new Client({ connectionString: url });
}

async function execSql(client, sql) {
  return client.query(sql);
}

function psqlApplyMigration() {
  const migrationFile = join(REPO_ROOT, 'prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql');
  const args = ['-h', host, '-p', port, '-U', user, '-d', TARGET_DB, '-v', 'ON_ERROR_STOP=1', '-f', migrationFile];
  try {
    return {
      ok: false, // expect failure
      stdout: execFileSync('C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe', args, {
        env: { ...process.env, PGPASSWORD: password },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
      stderr: '',
      status: 0,
    };
  } catch (e) {
    return {
      ok: false,
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
      code: e.status,
    };
  }
}

async function snapshotFn(client) {
  const fn = await execSql(client, `
    SELECT length(prosrc) AS sz,
           prosrc LIKE '%AFF05A_R1:%' AS has_r1,
           prosrc LIKE '%pg_advisory_xact_lock%' AS has_lock
      FROM pg_proc WHERE proname = 'hrp_public_intake_submission'
  `);
  const privs = await execSql(client, `
    SELECT string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
      FROM information_schema.table_privileges
     WHERE table_name='labor_profile_handling_assignments' AND grantee='hrp_public_rpc'
  `);
  return {
    fnSize: fn.rows[0]?.sz,
    hasR1: fn.rows[0]?.has_r1,
    hasLock: fn.rows[0]?.has_lock,
    handlingPrivs: privs.rows[0]?.privs,
  };
}

async function main() {
  log(LOCK_TIMEOUT_MODE
    ? `AC-04 lock_timeout verify — running at ${new Date().toISOString()}`
    : `AC-07 verify (forced abort / rollback) — running at ${new Date().toISOString()}`);
  log(`TARGET_DB=${TARGET_DB}`);
  log(`EVIDENCE_FILE=${EVIDENCE_FILE}`);
  log(`MODE=${LOCK_TIMEOUT_MODE ? 'lock-timeout' : 'default'}`);

  // Branch: lock_timeout mode runs a different flow (two-connection timeout
  // evidence). Default mode runs the AC-07 forced-anomaly flow.
  if (LOCK_TIMEOUT_MODE) {
    return runLockTimeoutMode();
  }

  // 1. Reset to predecessor state.
  log('\n=== STEP 1: Reset DB to AFF-03C predecessor state ===');
  const prep = spawnSync('node', [join(REPO_ROOT, 'scripts/ci/prepare-migration-test-db.mjs')], {
    env: { ...process.env },
    encoding: 'utf8',
    stdio: 'pipe',
  });
  log(prep.stdout);
  if (prep.status !== 0) {
    log(`PREPARE_FAILED exit=${prep.status}`);
    writeFileSync(EVIDENCE_FILE, logLines.join('\n'));
    process.exit(1);
  }

  // 2. Snapshot predecessor state.
  log('\n=== STEP 2: Snapshot predecessor state ===');
  const client = pgClient(targetUrl);
  await client.connect();
  const predState = await snapshotFn(client);
  log(`PRED_FN_SIZE=${predState.fnSize}`);
  log(`PRED_FN_HAS_R1=${predState.hasR1}`);
  log(`PRED_FN_HAS_LOCK=${predState.hasLock}`);
  log(`PRED_HANDLING_PRIVS_HRP=${predState.handlingPrivs}`);

  // 3. Seed synthetic referrer user and anomaly row.
  log('\n=== STEP 3: Seed anomaly (far-future starts_at) ===');
  const refUser = `${TARGET_DB}-ac07-ref1`;
  await execSql(client, `
    INSERT INTO users (id, phone, role, name, created_at, updated_at)
    VALUES ('${refUser}', '0900000001', 'CTV', 'AC07 Synthetic Referrer', now(), now())
    ON CONFLICT (id) DO NOTHING
  `);
  log(`REF_USER=${refUser}`);

  // Create LP for anomaly row.
  const lpAnomaly = `${TARGET_DB}-ac07-anomaly-lp`;
  await execSql(client, `
    INSERT INTO labor_profiles (id, full_name, normalized_phone, phone,
      identity_verification, completeness, created_at, updated_at)
    VALUES ('${lpAnomaly}', 'AC07 anomaly LP', '0900000002', '0900000002',
      'UNVERIFIED', 'MINIMAL', now(), now())
    ON CONFLICT (id) DO NOTHING
  `);

  // Far-future anomaly: starts_at 100 days in the future (> 1 day tolerance triggers RAISE).
  const anomalyStart = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString();
  const anomalyRow = `${TARGET_DB}-ac07-anomaly-row`;
  await execSql(client, `
    INSERT INTO labor_profile_handling_assignments
      (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
       source, starts_at, expires_at, status, created_at, updated_at, version)
    VALUES ('${anomalyRow}', '${lpAnomaly}', '${refUser}', NULL, 'AFF_INITIAL',
      '${anomalyStart}'::timestamptz, NULL, 'ACTIVE', now(), now(), 1)
    ON CONFLICT (id) DO NOTHING
  `);
  log(`ANOMALY_ROW_ID=${anomalyRow}`);
  log(`ANOMALY_STARTS_AT=${anomalyStart}`);

  // Verify seeded.
  const anomalyCheck = await execSql(client, `
    SELECT id, source, status, starts_at, expires_at
      FROM labor_profile_handling_assignments WHERE id = '${anomalyRow}'
  `);
  log(`ANOMALY_SEEDED=${anomalyCheck.rowCount === 1 ? 'ok' : 'FAIL'}`);
  const seededAnomaly = anomalyCheck.rows[0];
  log(`  anomaly: starts_at=${seededAnomaly?.starts_at?.toISOString()} expires_at=${seededAnomaly?.expires_at} status=${seededAnomaly?.status}`);

  // 4. Attempt to apply R1 migration — must FAIL due to far-future anomaly.
  log('\n=== STEP 4: Attempt R1 migration (should fail with anomaly) ===');
  const result = psqlApplyMigration();
  log(result.stdout || '');
  log(`MIGRATION_EXIT_CODE=${result.code}`);
  log(`STDERR=${result.stderr}`);

  // Migration MUST fail.
  if (result.code === 0) {
    log('ASSERT_FAIL: migration succeeded when it should have failed due to anomaly');
    await client.end();
    writeFileSync(EVIDENCE_FILE, logLines.join('\n'));
    process.exit(1);
  }
  const hasAnomalyError = (result.stdout + result.stderr).includes('future starts_at');
  if (!hasAnomalyError) {
    log('ASSERT_FAIL: migration failed but not due to future starts_at anomaly');
    await client.end();
    writeFileSync(EVIDENCE_FILE, logLines.join('\n'));
    process.exit(1);
  }
  log('ASSERT_PASS: migration failed with future starts_at anomaly');

  // 5. Assert full rollback — function, grants, and data all unchanged.
  log('\n=== STEP 5: Assert full transaction rollback ===');
  const postState = await snapshotFn(client);
  log(`POST_FN_SIZE=${postState.fnSize}`);
  log(`POST_FN_HAS_R1=${postState.hasR1}`);
  log(`POST_FN_HAS_LOCK=${postState.hasLock}`);
  log(`POST_HANDLING_PRIVS_HRP=${postState.handlingPrivs}`);

  let allAssertionsPassed = true;

  // (a) Function body rolled back to predecessor: size matches pred, no R1 marker, no lock.
  if (postState.fnSize !== predState.fnSize) {
    log(`ASSERT_FAIL (a): fn size=${postState.fnSize} vs pred=${predState.fnSize}`);
    allAssertionsPassed = false;
  } else log('ASSERT_PASS (a): fn size matches predecessor');
  if (postState.hasR1) {
    log('ASSERT_FAIL (a): fn body has R1 marker after rollback');
    allAssertionsPassed = false;
  } else log('ASSERT_PASS (a): fn body has no R1 marker after rollback');
  if (postState.hasLock) {
    log('ASSERT_FAIL (a): fn body has advisory lock after rollback');
    allAssertionsPassed = false;
  } else log('ASSERT_PASS (a): fn body has no advisory lock after rollback');

  // (b) Handling SELECT privilege rolled back: back to INSERT-only.
  if (postState.handlingPrivs?.includes('SELECT')) {
    log('ASSERT_FAIL (b): hrp_public_rpc still has SELECT on handling table after rollback');
    allAssertionsPassed = false;
  } else log('ASSERT_PASS (b): handling SELECT privilege rolled back (INSERT only)');

  // (c) Anomaly row preserved in original state.
  const postAnomaly = await execSql(client, `
    SELECT id, source, status, starts_at, expires_at
      FROM labor_profile_handling_assignments WHERE id = '${anomalyRow}'
  `);
  if (postAnomaly.rowCount !== 1) {
    log(`ASSERT_FAIL (c): anomaly row missing after rollback`);
    allAssertionsPassed = false;
  } else {
    const row = postAnomaly.rows[0];
    if (row.expires_at !== null) {
      log(`ASSERT_FAIL (c): anomaly row has expires_at=${row.expires_at?.toISOString()} after rollback`);
      allAssertionsPassed = false;
    } else log('ASSERT_PASS (c): anomaly row expires_at still NULL after rollback');
    if (row.status !== 'ACTIVE') {
      log(`ASSERT_FAIL (c): anomaly row status=${row.status} after rollback`);
      allAssertionsPassed = false;
    } else log('ASSERT_PASS (c): anomaly row status still ACTIVE after rollback');
    if (row.starts_at?.toISOString() !== anomalyStart) {
      log(`ASSERT_FAIL (c): anomaly row starts_at changed`);
      allAssertionsPassed = false;
    } else log('ASSERT_PASS (c): anomaly row starts_at preserved after rollback');
  }

  // (d) No spurious rows created by partial backfill (transaction rolled back).
  const totalRows = await execSql(client, `
    SELECT count(*)::int AS n FROM labor_profile_handling_assignments
  `);
  const seedCount = await execSql(client, `
    SELECT count(*)::int AS n FROM labor_profile_handling_assignments
     WHERE id LIKE '${TARGET_DB}-ac07%'
  `);
  if (totalRows.rows[0]?.n !== seedCount.rows[0]?.n) {
    log(`ASSERT_FAIL (d): unexpected rows in handling table: total=${totalRows.rows[0]?.n} vs seed=${seedCount.rows[0]?.n}`);
    allAssertionsPassed = false;
  } else log('ASSERT_PASS (d): no spurious rows created (all rows from seed)');

  await client.end();

  log('\n=== RESULT ===');
  if (allAssertionsPassed) {
    log('AC-07 PASS — forced anomaly triggers rollback of entire migration transaction');
  } else {
    log('AC-07 FAIL — at least one assertion failed');
  }

  writeFileSync(EVIDENCE_FILE, logLines.join('\n'));
  process.exit(allAssertionsPassed ? 0 : 1);
}

async function runLockTimeoutMode() {
  log('\n=== lock_timeout MODE ===');
  log('Step A. Reset target DB to AFF-03C predecessor state.');
  const prep = spawnSync('node', [join(REPO_ROOT, 'scripts/ci/prepare-migration-test-db.mjs')], {
    env: { ...process.env },
    encoding: 'utf8',
    stdio: 'pipe',
  });
  log(prep.stdout || '');
  if (prep.stderr) log(`STDERR: ${prep.stderr}`);
  if (prep.status !== 0) {
    log(`PREPARE_FAILED exit=${prep.status}`);
    writeFileSync(EVIDENCE_FILE, logLines.join('\n'));
    process.exit(1);
  }

  log('\nStep B. Connection A: BEGIN; LOCK TABLE ... (hold lock).');
  const targetUrl = new URL(ADMIN_URL);
  targetUrl.pathname = `/${TARGET_DB}`;
  const clientA = new Client({ connectionString: targetUrl.toString() });
  await clientA.connect();
  await clientA.query('BEGIN');
  await clientA.query(`LOCK TABLE labor_profile_handling_assignments IN SHARE ROW EXCLUSIVE MODE`);
  log(`CONNECTION_A: lock acquired at ${new Date().toISOString()}`);

  log('\nStep C. Connection B: run R1 migration (must time out, NOT hang).');
  const t0 = Date.now();
  const result = spawnSync('node', [join(REPO_ROOT, 'scripts/ci/apply-r1-migration.mjs')], {
    env: { ...process.env, MIGRATION_TARGET_DB: TARGET_DB },
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const elapsedMs = Date.now() - t0;
  log(`MIGRATION_ELAPSED_MS=${elapsedMs}`);
  log(`MIGRATION_EXIT_CODE=${result.status}`);
  log(`STDOUT:\n${result.stdout || ''}`);
  log(`STDERR:\n${result.stderr || ''}`);

  let pass = true;
  if (elapsedMs >= 30_000) {
    log(`ASSERT_FAIL: migration took ${elapsedMs}ms — bounded timeout not enforced.`);
    pass = false;
  } else {
    log(`ASSERT_PASS: migration aborted within ${elapsedMs}ms (well under 30s) — bounded timeout works.`);
  }
  const combined = (result.stdout || '') + (result.stderr || '');
  if (!/canceling statement due to lock timeout/i.test(combined)) {
    log(`ASSERT_FAIL: expected 'canceling statement due to lock timeout' in output, not found.`);
    pass = false;
  } else {
    log(`ASSERT_PASS: lock_timeout error observed in migration output.`);
  }
  if (result.status === 0) {
    log(`ASSERT_FAIL: migration succeeded despite contention — should have failed.`);
    pass = false;
  } else {
    log(`ASSERT_PASS: migration exited non-zero (status=${result.status}).`);
  }

  log('\nStep D. Release connection A (ROLLBACK).');
  await clientA.query('ROLLBACK');
  await clientA.end();
  log(`CONNECTION_A: lock released at ${new Date().toISOString()}`);

  log('\nStep E. Re-run migration (sanity, no contention — must succeed).');
  const sanity = spawnSync('node', [join(REPO_ROOT, 'scripts/ci/apply-r1-migration.mjs')], {
    env: { ...process.env, MIGRATION_TARGET_DB: TARGET_DB },
    encoding: 'utf8',
    stdio: 'pipe',
  });
  log(`SANITY_EXIT_CODE=${sanity.status}`);
  log(`SANITY_STDOUT:\n${sanity.stdout || ''}`);
  if (sanity.stderr) log(`SANITY_STDERR:\n${sanity.stderr}`);
  if (sanity.status !== 0) {
    log(`ASSERT_FAIL: sanity re-run failed (status=${sanity.status}).`);
    pass = false;
  } else {
    log(`ASSERT_PASS: sanity re-run succeeded — lock_timeout setting does not break normal apply.`);
  }

  log('\n=== RESULT ===');
  if (pass) {
    log('AC-04 lock_timeout PASS — migration aborts cleanly under contention, no indefinite hang.');
  } else {
    log('AC-04 lock_timeout FAIL — see assertions above.');
  }
  writeFileSync(EVIDENCE_FILE, logLines.join('\n'));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(`FATAL ${e.stack ?? e.message}`);
  logLines.push(`FATAL ${e.stack ?? e.message}`);
  writeFileSync(EVIDENCE_FILE, logLines.join('\n'));
  process.exit(1);
});
