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

// T0 round-8 R8-G2: configuration collision check. AC-06/07 build the
// predecessor DB at the name given by COLLISION_PREDECESSOR_NAME or
// DATABASE_NAME (defaults to 'aff05a_r1_predecessor') and then rename
// it to MIGRATION_TARGET_DB. If MIGRATION_TARGET_DB equals the predecessor
// name, the rename is a no-op and the test effectively re-uses the
// predecessor — defeating the AC-06 / AC-07 invariant (run the migration
// on a fresh DB). Reject this BEFORE calling build-predecessor-staging.mjs.
//
// Both names are guarded before any connection. Fixture mode is a narrow grammar, not a bypass.
const PREDECESSOR_DB_NAME = (process.env.DATABASE_NAME ?? 'aff05a_r1_predecessor').trim();
function guardConfigCollision(target, predecessor) {
  if (target === predecessor) {
    console.error(`CONFIG_COLLISION TARGET_DB=${target} equals predecessor name; refusing to call builder. Use a distinct MIGRATION_TARGET_DB.`);
    process.exit(3);
  }
}
guardConfigCollision(TARGET_DB, PREDECESSOR_DB_NAME);

// T0 round-4: synthetic-only host + DB allowlist. Reject non-loopback hosts
// and any DB name outside the project's synthetic prefix BEFORE any
// destructive action.
const ALLOWED_DB_NAMES = new Set([
  'aff05a_r1_test',
  'aff05a_r1_migration_test',
  'aff05a_r1_baseline_test',
  'aff05a_r1_predecessor',
]);
const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

const IS_COLLISION_FIXTURE = process.argv.includes('--collision-fixture');
const FIXTURE_NAME = /^aff05a_r1_collision_[0-9a-f]{8}_(?:pred|tgt)$/;
if (process.env.COLLISION_BYPASS_DB_NAME !== undefined || process.env.COLLISION_PREDECESSOR_NAME !== undefined) {
  console.error('UNSAFE_LEGACY_OVERRIDE: collision bypass overrides are not supported');
  process.exit(3);
}

function guardDbName(name, role) {
  if (IS_COLLISION_FIXTURE && FIXTURE_NAME.test(name)) return;
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
guardDbName(PREDECESSOR_DB_NAME, 'DATABASE_NAME');

if (!ADMIN_URL) { console.error('ERROR: DATABASE_URL_ADMIN_TEST not set'); process.exit(2); }
if (!process.env.PGPASSWORD) { console.error('ERROR: PGPASSWORD not set'); process.exit(2); }

const adminConn = new URL(ADMIN_URL);
const host = adminConn.hostname || '127.0.0.1';
const port = adminConn.port || '5432';
const user = adminConn.username;
const password = adminConn.password;

guardHost(host);

// T0 round-5 R5-G3: --probe mode. Runs ONLY guard checks (db name, host,
// url parse) and exits 0 with GUARD_PASS. Never opens a pg client, never
// execs psql, never touches migration files or evidence.
//
// T0 R10: `--probe`, `--lock-timeout`, and `--collision-fixture` are accepted.
// Unknown flags (e.g. the now-removed `--collision-test`) must exit 3 BEFORE
// any connection or DB read.
const ALLOWED_FLAGS = new Set(['--probe', '--lock-timeout', '--collision-fixture']);
for (const arg of process.argv.slice(2)) {
  if (!ALLOWED_FLAGS.has(arg)) {
    console.error(`UNSAFE_FLAG ${arg} — refusing. Allowed: ${[...ALLOWED_FLAGS].join(' ')}`);
    process.exit(3);
  }
}
if (process.argv.includes('--probe')) {
  console.log('GUARD_PASS=db_name host url_parse');
  console.log('PROBE_OK=no-apply no-evidence');
  process.exit(0);
}

if (!existsSync(EVIDENCE_DIR)) mkdirSync(EVIDENCE_DIR, { recursive: true });
const LOCK_TIMEOUT_MODE = process.argv.includes('--lock-timeout');
// T0 R10: --collision-test removed. The negative proof for collision
// scenarios lives in a separate integration runner
// (`scripts/ci/verify-collision-integration.mjs`) so the AC entrypoints
// themselves stay non-mutating. The AC scripts never terminate/drop a
// pre-existing DB.
const EVIDENCE_FILE = join(EVIDENCE_DIR, LOCK_TIMEOUT_MODE ? 'ac04-lock-timeout.txt' : 'ac07-rollback.txt');
const logLines = [];
// T0 round-7 R7-G4: normalize all appended lines to LF (no CRLF). The
// verify scripts capture stdout from `spawnSync` of `psql.exe` on
// Windows, which embeds CRLF in the per-statement output. Appending
// such a buffer verbatim preserves those CRLFs as part of the log;
// later normalize line endings to LF for canonical UTF-8 no-BOM, LF
// evidence files. The helper-level separator remains `\n`.
const log = (line) => {
  const normalized = String(line ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  console.log(normalized);
  logLines.push(normalized);
};

const targetUrl = `postgresql://${user}:${password}@${host}:${port}/${TARGET_DB}`;

function pgClient(url) {
  return new Client({ connectionString: url });
}

// T0 round-8 R8-G4: safe evidence-write helper. If the operator
// redirected stdout to the same file (Windows file-lock conflict),
// fall back to a sibling `.partial` file so the AC still exits with
// the right code. The `.partial` content is byte-identical to the
// intended evidence file; we always have *some* durable artifact.
function writeEvidence() {
  const body = logLines.join('\n');
  try {
    writeFileSync(EVIDENCE_FILE, body);
  } catch (e) {
    try {
      writeFileSync(EVIDENCE_FILE + '.partial', body);
      console.error(`EVIDENCE_WRITE_FALLBACK ${EVIDENCE_FILE}: ${e.message}`);
    } catch { /* truly cannot write; ignore */ }
  }
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


async function assertFreshDatabases() {
  const url = new URL(ADMIN_URL);
  url.pathname = '/postgres';
  const client = new Client({ connectionString: url.toString() });
  try {
    await client.connect();
    const result = await client.query(
      'SELECT datname FROM pg_database WHERE datname = ANY($1::text[])',
      [[PREDECESSOR_DB_NAME, TARGET_DB]],
    );
    const names = new Set(result.rows.map(row => row.datname));
    for (const [name, marker] of [
      [PREDECESSOR_DB_NAME, 'PREDECESSOR_DB_EXISTS'],
      [TARGET_DB, 'TARGET_DB_EXISTS'],
    ]) {
      if (names.has(name)) {
        const error = new Error(`${marker}: ${name} already exists — refusing to run before builder.`);
        error.exitCode = 3;
        throw error;
      }
    }
    log('FRESH_DATABASES_CHECK=PASS (both absent; before builder)');
  } finally {
    await client.end();
  }
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

  await assertFreshDatabases();

  // 1. Reset to predecessor state via the single staging-driven path.
  //    T0 round-6 R6-G2: AC-07 must use `build-predecessor-staging.mjs`
  //    (Prisma CLI in a per-run tmp dir) — NOT the deprecated
  //    rename-the-worktree path. After staging, rename the predecessor DB
  //    to `MIGRATION_TARGET_DB` at cluster level (no worktree mutation,
  //    no schema mutation).
  //
  // T0 R10: pass PREDECESSOR_DB_NAME as DATABASE_NAME so STEP 0 and the
  // builder see the same name. For --collision-fixture mode, also pass
  // --collision-fixture to the builder.
  log('\n=== STEP 1: Build predecessor via Prisma CLI (single path) ===');
  const stage = spawnSync('node', [
    join(REPO_ROOT, 'scripts/ci/build-predecessor-staging.mjs'),
    ...(IS_COLLISION_FIXTURE ? ['--collision-fixture'] : []),
  ], {
    env: {
      ...process.env,
      DATABASE_NAME: PREDECESSOR_DB_NAME,
      BASELINE_REF: 'e4d21807f0d972de447e710066b40c77a661fb17',
    },
    encoding: 'utf8',
    stdio: 'pipe',
  });
  log(stage.stdout);
  if (stage.stderr) log(`STDERR: ${stage.stderr}`);
  if (stage.status !== 0) {
    log(`STAGING_FAILED exit=${stage.status}`);
    writeEvidence();
    process.exit(1);
  }
  log('\n=== STEP 1b: Rename predecessor → MIGRATION_TARGET_DB (cluster only) ===');
  const _adminUrl = new URL(ADMIN_URL);
  const clusterUrlStr = new URL(ADMIN_URL).protocol + '//' + (new URL(ADMIN_URL).username ? new URL(ADMIN_URL).username + ':' + new URL(ADMIN_URL).password + '@' : '') + new URL(ADMIN_URL).hostname + ':' + (new URL(ADMIN_URL).port || '5432') + '/postgres';
  // T0 R10: target DB must not exist before rename. Fail-closed: refuse if
  // MIGRATION_TARGET_DB already exists (would collide with rename or silently
  // overwrite a DB owned by another run). We do NOT auto-DROP here.
  // T0 R10: predecessor name is configurable via PREDECESSOR_DB_NAME.
  const clusterClient = new Client({ connectionString: clusterUrlStr });
  await clusterClient.connect();
  try {
    const dbList = await clusterClient.query(
      `SELECT datname FROM pg_database WHERE datname = ANY($1::text[]) ORDER BY datname`,
      [[PREDECESSOR_DB_NAME, TARGET_DB]],
    );
    log(`PRE_RENAME_DBS=${JSON.stringify(dbList.rows.map(r => r.datname))}`);
    const names = new Set(dbList.rows.map(r => r.datname));
    if (names.has(TARGET_DB)) {
      log(`TARGET_DB_EXISTS: ${TARGET_DB} already exists — refusing to rename.`);
      log(`TARGET_DB_EXISTS_HINT: Drop '${TARGET_DB}' manually before re-running AC-07.`);
      await clusterClient.end().catch(() => {});
      writeEvidence();
      process.exit(3);
    }
    if (!names.has(PREDECESSOR_DB_NAME)) {
      log(`PREDECESSOR_DB_MISSING: ${PREDECESSOR_DB_NAME} not found — builder did not produce it.`);
      await clusterClient.end().catch(() => {});
      writeEvidence();
      process.exit(1);
    }
    const qiFrom = await clusterClient.query(`SELECT quote_ident($1) AS q`, [PREDECESSOR_DB_NAME]);
    const qiTo = await clusterClient.query(`SELECT quote_ident($1) AS q`, [TARGET_DB]);
    const fromQ = qiFrom.rows[0]?.q;
    const toQ = qiTo.rows[0]?.q;
    await clusterClient.query(`ALTER DATABASE ${fromQ} RENAME TO ${toQ}`);
    log(`RENAME_OK from=${PREDECESSOR_DB_NAME} to=${TARGET_DB}`);
  } finally {
    await clusterClient.end().catch(() => {});
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
    writeEvidence();
    process.exit(1);
  }
  const hasAnomalyError = (result.stdout + result.stderr).includes('future starts_at');
  if (!hasAnomalyError) {
    log('ASSERT_FAIL: migration failed but not due to future starts_at anomaly');
    await client.end();
    writeEvidence();
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

  writeEvidence();
  process.exit(allAssertionsPassed ? 0 : 1);
}

async function runLockTimeoutMode() {
  log('\n=== lock_timeout MODE ===');
  await assertFreshDatabases();
  log('Step A. Reset target DB to AFF-03C predecessor state.');
  log('Step A.1 Build predecessor via Prisma CLI (single path).');
  // T0 R10: pass PREDECESSOR_DB_NAME as DATABASE_NAME so STEP A.0 and
  // the builder see the same name.
  const stage = spawnSync('node', [
    join(REPO_ROOT, 'scripts/ci/build-predecessor-staging.mjs'),
    ...(IS_COLLISION_FIXTURE ? ['--collision-fixture'] : []),
  ], {
    env: {
      ...process.env,
      DATABASE_NAME: PREDECESSOR_DB_NAME,
      BASELINE_REF: 'e4d21807f0d972de447e710066b40c77a661fb17',
    },
    encoding: 'utf8',
    stdio: 'pipe',
  });
  log(stage.stdout || '');
  if (stage.stderr) log(`STDERR: ${stage.stderr}`);
  if (stage.status !== 0) {
    log(`STAGING_FAILED exit=${stage.status}`);
    writeEvidence();
    process.exit(1);
  }
  log('Step A.2 Rename predecessor → MIGRATION_TARGET_DB (cluster only).');
  const clusterUrlStrLt = new URL(ADMIN_URL).protocol + '//' + (new URL(ADMIN_URL).username ? new URL(ADMIN_URL).username + ':' + new URL(ADMIN_URL).password + '@' : '') + new URL(ADMIN_URL).hostname + ':' + (new URL(ADMIN_URL).port || '5432') + '/postgres';
  // T0 R10: target DB must not exist before rename. Fail-closed.
  // T0 R10: predecessor name is configurable via PREDECESSOR_DB_NAME.
  const clusterClient = new Client({ connectionString: clusterUrlStrLt });
  await clusterClient.connect();
  try {
    const dbList = await clusterClient.query(
      `SELECT datname FROM pg_database WHERE datname = ANY($1::text[]) ORDER BY datname`,
      [[PREDECESSOR_DB_NAME, TARGET_DB]],
    );
    log(`PRE_RENAME_DBS=${JSON.stringify(dbList.rows.map(r => r.datname))}`);
    const names = new Set(dbList.rows.map(r => r.datname));
    if (names.has(TARGET_DB)) {
      log(`TARGET_DB_EXISTS: ${TARGET_DB} already exists — refusing to rename.`);
      log(`TARGET_DB_EXISTS_HINT: Drop '${TARGET_DB}' manually before re-running AC-04.`);
      await clusterClient.end().catch(() => {});
      writeEvidence();
      process.exit(3);
    }
    if (!names.has(PREDECESSOR_DB_NAME)) {
      log(`PREDECESSOR_DB_MISSING: ${PREDECESSOR_DB_NAME} not found — builder did not produce it.`);
      await clusterClient.end().catch(() => {});
      writeEvidence();
      process.exit(1);
    }
    const qiFrom = await clusterClient.query(`SELECT quote_ident($1) AS q`, [PREDECESSOR_DB_NAME]);
    const qiTo = await clusterClient.query(`SELECT quote_ident($1) AS q`, [TARGET_DB]);
    const fromQ = qiFrom.rows[0]?.q;
    const toQ = qiTo.rows[0]?.q;
    await clusterClient.query(`ALTER DATABASE ${fromQ} RENAME TO ${toQ}`);
    log(`RENAME_OK from=${PREDECESSOR_DB_NAME} to=${TARGET_DB}`);
  } finally {
    await clusterClient.end().catch(() => {});
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

  // T0 round-5 R5-G4: rollback-proof gate BEFORE sanity reapply. The
  // timeout-induced abort must have rolled back the ENTIRE migration
  // transaction: function body, grants, and data all unchanged. If any
  // R1 marker / grant / LPHA row leaks past Step D, the sanity reapply
  // would silently build on a half-applied state.
  log('\nStep D-prime. Rollback-proof gate (verify migration state is unchanged after Step C abort).');
  const rollbackClient = new Client({ connectionString: targetUrl.toString() });
  await rollbackClient.connect();
  try {
    // (a) Function body must NOT have R1 markers.
    const fnBody = await rollbackClient.query(`
      SELECT pg_get_functiondef(oid) AS def
        FROM pg_proc
       WHERE proname = 'hrp_public_intake_submission'
    `);
    const defText = fnBody.rows[0]?.def ?? '';
    if (/ensure_initial_handling_window|advisory_xact_lock.*AFF05A_R1/i.test(defText)) {
      log(`ASSERT_FAIL (rollback): function body has R1 marker after Step C abort — transaction did NOT roll back`);
      pass = false;
    } else {
      log(`ASSERT_PASS (rollback): function body has NO R1 marker after Step C abort — full rollback confirmed`);
    }
    // (b) hrp_public_rpc must NOT have SELECT on labor_profile_handling_assignments.
    const priv = await rollbackClient.query(`
      SELECT 1 FROM information_schema.table_privileges
       WHERE grantee = 'hrp_public_rpc'
         AND table_name = 'labor_profile_handling_assignments'
         AND privilege_type = 'SELECT'
    `);
    if (priv.rowCount > 0) {
      log(`ASSERT_FAIL (rollback): hrp_public_rpc has SELECT on labor_profile_handling_assignments after Step C abort — GRANT not rolled back`);
      pass = false;
    } else {
      log(`ASSERT_PASS (rollback): hrp_public_rpc has NO SELECT on handling table after Step C abort — grant rolled back`);
    }
    // (c) LPHA table row count must equal zero (no backfill data leak).
    const lphaCount = await rollbackClient.query(`
      SELECT count(*)::int AS n FROM labor_profile_handling_assignments
    `);
    if (lphaCount.rows[0]?.n !== 0) {
      log(`ASSERT_FAIL (rollback): LPHA table has ${lphaCount.rows[0]?.n} rows after Step C abort — expected 0`);
      pass = false;
    } else {
      log(`ASSERT_PASS (rollback): LPHA table has 0 rows after Step C abort — no data leak`);
    }
  } finally {
    await rollbackClient.end();
  }

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
  // T0 R9: write evidence; fall back to sibling .partial on Windows EBUSY.
  writeEvidence();
  process.exit(pass ? 0 : 1);
}

// T0 R10: collision-test mode removed. The negative proof for collision
// scenarios (predecessor exists, target exists, with sentinel + connection)
// lives in a separate integration runner:
//   scripts/ci/verify-collision-integration.mjs
// Keeping it out of the AC entrypoints means the AC scripts themselves
// never terminate/drop pre-existing DBs or hold connections across
// subprocess boundaries. The collision runner is the ONLY place where
// fixture DBs are created and held.

main().catch((e) => {
  console.error(`FATAL ${e.stack ?? e.message}`);
  logLines.push(`FATAL ${e.stack ?? e.message}`);
  writeEvidence();
  process.exitCode = e.exitCode ?? 1;
});
