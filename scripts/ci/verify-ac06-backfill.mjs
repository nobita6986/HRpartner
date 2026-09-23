#!/usr/bin/env node
/**
 * scripts/ci/verify-ac06-backfill.mjs
 *
 * AC-06 verification: applies the actual R1 migration file
 * (`prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql`)
 * on a dedicated synthetic DB (`aff05a_r1_migration_test`) starting at the
 * AFF-03C predecessor state. Seeds legacy AFF_INITIAL NULL-deadline rows
 * BEFORE applying migration, then asserts:
 *
 *   (a) overdue ACTIVE expires in place → deadline = starts_at + 168 hours.
 *   (b) future ACTIVE gets deadline but remains ACTIVE.
 *   (c) terminal rows (status != ACTIVE) unchanged: status preserved, deadline
 *       computed if starts_at IS NOT NULL, history links preserved.
 *   (d) non-AFF_INITIAL control rows untouched (predicate source filter).
 *   (e) outside-predicate rows (starts_at IS NULL) untouched.
 *
 * The migration file is executed as a single psql transaction. The script
 * does NOT copy/replicate the backfill SQL — it relies on the actual migration
 * file to perform the backfill. Evidence is written to `evidence/ac06-backfill.txt`.
 *
 * Usage:
 *   node scripts/ci/verify-ac06-backfill.mjs
 */
import { Client } from 'pg';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const ADMIN_URL = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const TARGET_DB = process.env.MIGRATION_TARGET_DB ?? 'aff05a_r1_migration_test';
const EVIDENCE_DIR = process.env.EVIDENCE_DIR ?? join(REPO_ROOT, 'docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence');

// T0 round-8 R8-G2: configuration collision check. AC-06/07 build the
// predecessor DB at the name given by DATABASE_NAME (defaults to
// 'aff05a_r1_predecessor') and then rename it to MIGRATION_TARGET_DB.
// If MIGRATION_TARGET_DB equals the predecessor name, the rename is a
// no-op and the test effectively re-uses the predecessor — defeating
// the AC-06 / AC-07 invariant (run the migration on a fresh DB).
// Reject this BEFORE calling build-predecessor-staging.mjs.
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
// execs psql, never touches migration files or evidence. Used by
// validate-guards.mjs to prove the guards are real.
//
// T0 R10: `--probe` and `--collision-fixture` are accepted. Unknown flags
// (e.g. the now-removed `--collision-test`) must exit 3 BEFORE any
// connection or DB read. This keeps the AC scripts purely non-mutating
// w.r.t. the validator contract.
const ALLOWED_FLAGS = new Set(['--probe', '--collision-fixture']);
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
const EVIDENCE_FILE = join(EVIDENCE_DIR, 'ac06-backfill.txt');
const logLines = [];
// T0 round-7 R7-G4: normalize all appended lines to LF (no CRLF). See
// the equivalent comment in verify-ac07-rollback.mjs for rationale.
const log = (line) => {
  const normalized = String(line ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  console.log(normalized);
  logLines.push(normalized);
};

const targetUrl = `postgresql://${user}:${password}@${host}:${port}/${TARGET_DB}`;

function pgClient(url) {
  return new Client({ connectionString: url });
}

async function execSql(client, sql) {
  return client.query(sql);
}

// T0 round-8 R8-G4: safe evidence-write helper. If the operator
// redirected stdout to the same file (Windows file-lock conflict),
// fall back to a sibling `.partial` file so the AC still exits with
// the right code.
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

function psqlApplyMigration() {
  const migrationFile = join(REPO_ROOT, 'prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql');
    const args = ['-h', host, '-p', port, '-U', user, '-d', TARGET_DB, '-v', 'ON_ERROR_STOP=1', '-f', migrationFile];
  try {
    return {
      ok: true,
      stdout: execFileSync('C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe', args, {
        env: { ...process.env, PGPASSWORD: password },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
      stderr: '',
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

async function snapshotPred(client) {
  const fn = await execSql(client, `
    SELECT length(prosrc) AS sz, prosrc LIKE '%AFF05A_R1:%' AS has_r1,
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
  log(`AC-06 verify (backfill R1) — running at ${new Date().toISOString()}`);
  log(`TARGET_DB=${TARGET_DB}`);
  log(`EVIDENCE_FILE=${EVIDENCE_FILE}`);

  await assertFreshDatabases();

  // 1. Reset to predecessor state via the single staging-driven path.
  //    T0 round-6 R6-G2: AC-06 must use `build-predecessor-staging.mjs`
  //    (Prisma CLI in a per-run tmp dir) — NOT the deprecated
  //    rename-the-worktree path. The new path uses explicit synthetic
  //    env, never renames anything in the worktree, runs bootstrap pre →
  //    migrate deploy → bootstrap post, and cleans up the tmp dir in
  //    `finally`. We pass DATABASE_NAME so build-predecessor-staging
  //    creates the predecessor DB at the canonical name (regardless of
  //    MIGRATION_TARGET_DB which is the AC-06 *target* name post-rename).
  log('\n=== STEP 1: Build predecessor via Prisma CLI (single path) ===');
  // T0 R10: pass PREDECESSOR_DB_NAME as DATABASE_NAME to the builder so
  // STEP 0 and the builder see the same name. For --collision-fixture
  // mode, also pass --collision-fixture to the builder so it accepts
  // the strictly validated per-run synthetic fixture name.
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
  // The predecessor DB now exists as `aff05a_r1_predecessor`. Promote it
  // to `aff05a_r1_migration_test` (the canonical AC-06 target name) via
  // a cluster-level rename — no worktree mutation, no schema mutation.
  log('\n=== STEP 1b: Rename predecessor → MIGRATION_TARGET_DB (cluster only) ===');
  const _adminUrl = new URL(ADMIN_URL);
  const clusterUrlStr = `${_adminUrl.protocol}//${_adminUrl.username ? _adminUrl.username + ':' + _adminUrl.password + '@' : ''}${_adminUrl.hostname}:${_adminUrl.port || '5432'}/postgres`;
  log(`CLUSTER_URL=${clusterUrlStr.replace(/:[^:@]+@/, ':****@')}`);
  // T0 R10: target DB must not exist before rename. Fail-closed: if
  // `MIGRATION_TARGET_DB` already exists, the rename would either collide
  // (PostgreSQL: "database already exists") or silently overwrite a
  // database owned by another run. We do NOT auto-DROP here. The caller
  // (or operator) owns the target DB lifecycle.
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
      log(`TARGET_DB_EXISTS_HINT: Drop '${TARGET_DB}' manually before re-running AC-06.`);
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
    log(`RENAME_SQL=ALTER DATABASE ${fromQ} RENAME TO ${toQ}`);
    await clusterClient.query(`ALTER DATABASE ${fromQ} RENAME TO ${toQ}`);
    log(`RENAME_OK from=${PREDECESSOR_DB_NAME} to=${TARGET_DB}`);
  } finally {
    await clusterClient.end().catch(() => {});
  }

  // 2. Connect to target DB and snapshot predecessor state.
  log('\n=== STEP 2: Snapshot predecessor state ===');
  const client = pgClient(targetUrl);
  await client.connect();
  const predState = await snapshotPred(client);
  log(`PRED_FN_SIZE=${predState.fnSize}`);
  log(`PRED_FN_HAS_R1=${predState.hasR1}`);
  log(`PRED_FN_HAS_LOCK=${predState.hasLock}`);
  log(`PRED_HANDLING_PRIVS_HRP=${predState.handlingPrivs}`);
  if (predState.hasR1 || predState.hasLock || predState.handlingPrivs?.includes('SELECT')) {
    log('PRECONDITION_FAILED: predecessor state not at expected baseline');
    await client.end();
    writeEvidence();
    process.exit(1);
  }

  // 3. Seed legacy AFF_INITIAL NULL-deadline rows + controls.
  log('\n=== STEP 3: Seed legacy AFF_INITIAL NULL-deadline rows + controls ===');

  // We need a labor_profile_id for each seeded LPHA. Insert directly using admin.
  // Helper: seed a labor_profile first.
  async function seedLp(id, fullName, phone) {
    await execSql(client, `
      INSERT INTO labor_profiles (id, full_name, normalized_phone, phone,
        identity_verification, completeness, created_at, updated_at)
      VALUES ('${id}', '${fullName}', '${phone}', '${phone}', 'UNVERIFIED', 'MINIMAL', now(), now())
      ON CONFLICT (id) DO NOTHING
    `);
  }

  const lpOverdue = `${TARGET_DB}-ac06-overdue-lp`;
  const lpFuture = `${TARGET_DB}-ac06-future-lp`;
  const lpTerminal = `${TARGET_DB}-ac06-terminal-lp`;
  const lpRevoked = `${TARGET_DB}-ac06-revoked-lp`;
  const lpNonAff = `${TARGET_DB}-ac06-nonaff-lp`;
  await seedLp(lpOverdue, 'AC06 overdue LP', '0900000006');
  await seedLp(lpFuture, 'AC06 future LP', '0900000007');
  await seedLp(lpTerminal, 'AC06 terminal LP', '0900000008');
  await seedLp(lpRevoked, 'AC06 revoked LP', '0900000010');
  await seedLp(lpNonAff, 'AC06 nonAff LP', '0900000009');

  // Seed 5 legacy rows (T0 round-4: REVOKED overdue fixture added to prove
  // the backfill CASE `status = 'ACTIVE'` guard prevents REVOKED from being
  // flipped to EXPIRED — the EXPIRED terminal fixture alone cannot detect
  // this defect):
  //   (a) Overdue ACTIVE: starts_at far past → deadline computed, status → EXPIRED.
  //   (b) Future ACTIVE: starts_at in past (1h ago) → deadline computed, status ACTIVE.
  //   (c) Terminal EXPIRED: expires_at IS NULL → deadline computed, status preserved EXPIRED.
  //   (c2) Terminal REVOKED overdue: starts_at far past, status REVOKED → status preserved REVOKED.
  //   (d) Non-AFF control: source != AFF_INITIAL → untouched by backfill predicate.

  const rowOverdue = `${TARGET_DB}-ac06-overdue-row`;
  const rowFuture = `${TARGET_DB}-ac06-future-row`;
  const rowTerminal = `${TARGET_DB}-ac06-terminal-row`;
  const rowRevoked = `${TARGET_DB}-ac06-revoked-row`;
  const rowNonAff = `${TARGET_DB}-ac06-nonaff-row`;

  // Helper to seed a LPHA row with explicit values (bypass RLS — admin context).
  async function seedLpha(id, lpId, source, startsAt, expiresAt, status) {
    const startsAtExpr = startsAt === null ? 'NULL' : `'${startsAt}'::timestamptz`;
    const expiresAtExpr = expiresAt === null ? 'NULL' : `'${expiresAt}'::timestamptz`;
    await execSql(client, `
      INSERT INTO labor_profile_handling_assignments
        (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
         source, starts_at, expires_at, status, created_at, updated_at, version)
      VALUES ('${id}', '${lpId}', '${refUser}', NULL, '${source}',
        ${startsAtExpr}, ${expiresAtExpr}, '${status}', now(), now(), 1)
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // Use a known referrer user id (admin) for these synthetic rows. We must
  // create a synthetic user first to satisfy the FK constraint.
  const refUser = `${TARGET_DB}-ac06-ref1`;
  await execSql(client, `
    INSERT INTO users (id, phone, role, name, created_at, updated_at)
    VALUES ('${refUser}', '0900000001', 'CTV', 'AC06 Synthetic Referrer', now(), now())
    ON CONFLICT (id) DO NOTHING
  `);
  log(`REF_USER=${refUser}`);

  // "future" here means "not yet overdue" — seed within the 1-day anomaly tolerance
  // so the migration processes it normally. Pathological far-future (>1 day) is AC-07's rollback case.
      const overdueStart = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
      // For the new threshold `starts_at > v_txn_ts`, a "future ACTIVE" row must have
      // starts_at <= transaction_timestamp (i.e. starts_at is in the past relative to
      // the snapshot), but its computed deadline (starts_at + 168h) must still be in
      // the future. Seed with starts_at = now - 1 hour so the row is "already started
      // but not yet expired".
      const futureStart = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
      const terminalStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const revokedStart = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(); // 200 days ago, REVOKED
      const nonAffStart = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  await seedLpha(rowOverdue, lpOverdue, 'AFF_INITIAL', overdueStart, null, 'ACTIVE');
  await seedLpha(rowFuture, lpFuture, 'AFF_INITIAL', futureStart, null, 'ACTIVE');
  await seedLpha(rowTerminal, lpTerminal, 'AFF_INITIAL', terminalStart, null, 'EXPIRED');
  await seedLpha(rowRevoked, lpRevoked, 'AFF_INITIAL', revokedStart, null, 'REVOKED');
  await seedLpha(rowNonAff, lpNonAff, 'MANAGER', nonAffStart, null, 'ACTIVE');

  // Verify seeded state matches expected.
  const seedCheck = await execSql(client, `
    SELECT id, source, status, starts_at, expires_at
      FROM labor_profile_handling_assignments
     WHERE id IN ('${rowOverdue}','${rowFuture}','${rowTerminal}','${rowRevoked}','${rowNonAff}')
     ORDER BY id
  `);
  log(`SEEDED_ROWS=${seedCheck.rowCount}`);
  for (const r of seedCheck.rows) {
    log(`  seeded: id=${r.id} source=${r.source} status=${r.status} starts_at=${r.starts_at?.toISOString()} expires_at=${r.expires_at}`);
  }

  // 4. Apply the actual R1 migration file as a single psql transaction.
  log('\n=== STEP 4: Apply R1 migration file as single transaction ===');
  const migrationFile = join(REPO_ROOT, 'prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql');
  log(`MIGRATION_FILE=${migrationFile}`);
  const result = psqlApplyMigration();
  log(result.stdout);
  if (result.stderr) log(`STDERR: ${result.stderr}`);
  if (!result.ok) {
    log(`MIGRATION_FAILED exit=${result.code}`);
    await client.end();
    writeEvidence();
    process.exit(1);
  }

  // 5. Assert post-migration state.
  log('\n=== STEP 5: Assert post-migration state ===');
  const postState = await snapshotPred(client);
  log(`POST_FN_SIZE=${postState.fnSize}`);
  log(`POST_FN_HAS_R1=${postState.hasR1}`);
  log(`POST_FN_HAS_LOCK=${postState.hasLock}`);
  log(`POST_HANDLING_PRIVS_HRP=${postState.handlingPrivs}`);

  let allAssertionsPassed = true;

  // Assertion 1: RPC body now has R1 marker + advisory lock.
  if (!postState.hasR1) { log('ASSERT_FAIL: function body lacks R1 marker'); allAssertionsPassed = false; }
  else log('ASSERT_PASS: function body has R1 marker');
  if (!postState.hasLock) { log('ASSERT_FAIL: function body lacks pg_advisory_xact_lock'); allAssertionsPassed = false; }
  else log('ASSERT_PASS: function body has pg_advisory_xact_lock');

  // Assertion 2: handling SELECT privilege added for hrp_public_rpc.
  if (!postState.handlingPrivs?.includes('SELECT')) {
    log('ASSERT_FAIL: handling SELECT privilege not granted to hrp_public_rpc');
    allAssertionsPassed = false;
  } else log('ASSERT_PASS: handling SELECT granted to hrp_public_rpc');

  // Read post-migration rows.
  const post = await execSql(client, `
    SELECT id, source, status, starts_at, expires_at
      FROM labor_profile_handling_assignments
     WHERE id IN ('${rowOverdue}','${rowFuture}','${rowTerminal}','${rowRevoked}','${rowNonAff}')
     ORDER BY id
  `);

  function findRow(id) { return post.rows.find(r => r.id === id); }

  // (a) Overdue: deadline set, status → EXPIRED.
  const overdueAfter = findRow(rowOverdue);
  const overdueExpectedDeadline = new Date(new Date(overdueStart).getTime() + 168 * 60 * 60 * 1000);
  if (!overdueAfter?.expires_at) { log('ASSERT_FAIL (a): overdue row has no expires_at'); allAssertionsPassed = false; }
  else {
    const actualMs = new Date(overdueAfter.expires_at).getTime();
    const diffMs = Math.abs(actualMs - overdueExpectedDeadline.getTime());
    if (diffMs > 60_000) { log(`ASSERT_FAIL (a): overdue deadline drift=${diffMs}ms > 60s`); allAssertionsPassed = false; }
    else log(`ASSERT_PASS (a): overdue deadline = starts_at + 168h (drift=${diffMs}ms)`);
  }
  if (overdueAfter?.status !== 'EXPIRED') { log(`ASSERT_FAIL (a): overdue status=${overdueAfter?.status}, expected EXPIRED`); allAssertionsPassed = false; }
  else log('ASSERT_PASS (a): overdue ACTIVE → EXPIRED');

  // (b) Future: deadline set, status ACTIVE.
  const futureAfter = findRow(rowFuture);
  const futureExpectedDeadline = new Date(new Date(futureStart).getTime() + 168 * 60 * 60 * 1000);
  if (!futureAfter?.expires_at) { log('ASSERT_FAIL (b): future row has no expires_at'); allAssertionsPassed = false; }
  else {
    const actualMs = new Date(futureAfter.expires_at).getTime();
    const diffMs = Math.abs(actualMs - futureExpectedDeadline.getTime());
    if (diffMs > 60_000) { log(`ASSERT_FAIL (b): future deadline drift=${diffMs}ms > 60s`); allAssertionsPassed = false; }
    else log(`ASSERT_PASS (b): future deadline = starts_at + 168h (drift=${diffMs}ms)`);
  }
  if (futureAfter?.status !== 'ACTIVE') { log(`ASSERT_FAIL (b): future status=${futureAfter?.status}, expected ACTIVE`); allAssertionsPassed = false; }
  else log('ASSERT_PASS (b): future ACTIVE preserved');

  // (c) Terminal: status preserved (EXPIRED); deadline computed from starts_at.
  const terminalAfter = findRow(rowTerminal);
  if (terminalAfter?.status !== 'EXPIRED') { log(`ASSERT_FAIL (c): terminal status=${terminalAfter?.status}, expected EXPIRED`); allAssertionsPassed = false; }
  else log('ASSERT_PASS (c): terminal EXPIRED status preserved');
  if (!terminalAfter?.expires_at) { log('ASSERT_FAIL (c): terminal row has no expires_at (backfill set deadline)'); allAssertionsPassed = false; }
  else log('ASSERT_PASS (c): terminal EXPIRED row received deadline from starts_at');

  // (c2) Terminal REVOKED overdue: T0 round-4 — the previous fixture set had only
  // EXPIRED terminals, which the migration would not flip regardless of the CASE
  // guard. REVOKED overdue exercises the `status = 'ACTIVE'` guard directly:
  // starts_at is far in the past so the deadline has passed, but status is
  // REVOKED, NOT ACTIVE — the backfill must NOT flip it to EXPIRED.
  const revokedAfter = findRow(rowRevoked);
  if (revokedAfter?.status !== 'REVOKED') {
    log(`ASSERT_FAIL (c2): REVOKED status=${revokedAfter?.status}, expected REVOKED (backfill CASE bug would flip to EXPIRED)`);
    allAssertionsPassed = false;
  } else log('ASSERT_PASS (c2): REVOKED status preserved (not flipped to EXPIRED)');
  const revokedExpectedDeadline = new Date(new Date(revokedStart).getTime() + 168 * 60 * 60 * 1000);
  if (!revokedAfter?.expires_at) {
    log('ASSERT_FAIL (c2): REVOKED row has no expires_at (backfill set deadline)'); allAssertionsPassed = false;
  } else {
    const actualMs = new Date(revokedAfter.expires_at).getTime();
    const diffMs = Math.abs(actualMs - revokedExpectedDeadline.getTime());
    if (diffMs > 60_000) { log(`ASSERT_FAIL (c2): REVOKED deadline drift=${diffMs}ms > 60s`); allAssertionsPassed = false; }
    else log(`ASSERT_PASS (c2): REVOKED deadline = starts_at + 168h (drift=${diffMs}ms)`);
  }

  // (d) Non-AFF: untouched.
  const nonAffAfter = findRow(rowNonAff);
  if (nonAffAfter?.source !== 'MANAGER') { log(`ASSERT_FAIL (d): nonAff source=${nonAffAfter?.source}`); allAssertionsPassed = false; }
  else log('ASSERT_PASS (d): nonAff source preserved (MANAGER)');
  if (nonAffAfter?.expires_at !== null) { log(`ASSERT_FAIL (d): nonAff expires_at=${nonAffAfter?.expires_at?.toISOString()}, expected NULL`); allAssertionsPassed = false; }
  else log('ASSERT_PASS (d): nonAff row untouched (expires_at still NULL)');
  if (nonAffAfter?.status !== 'ACTIVE') { log(`ASSERT_FAIL (d): nonAff status=${nonAffAfter?.status}, expected ACTIVE`); allAssertionsPassed = false; }
  else log('ASSERT_PASS (d): nonAff status preserved');

  // 6. Final assertion: no ACTIVE AFF_INITIAL rows with NULL deadline remain (DEC-06).
  // Non-ACTIVE (terminal) rows with NULL deadline are valid — they had deadline set
  // by the backfill but their status remained terminal; checking for any NULL deadline
  // across ALL statuses would falsely fail on the terminal seed fixture.
  const remaining = await execSql(client, `
    SELECT count(*)::int AS n
      FROM labor_profile_handling_assignments
     WHERE source = 'AFF_INITIAL'
       AND expires_at IS NULL
       AND starts_at IS NOT NULL
       AND status = 'ACTIVE'
  `);
  log(`REMAINING_AFF_INITIAL_NULL_DEADLINE=${remaining.rows[0]?.n}`);
  if (remaining.rows[0]?.n !== 0) {
    log('ASSERT_FAIL: AFF_INITIAL NULL-deadline rows remain after backfill');
    allAssertionsPassed = false;
  } else log('ASSERT_PASS: no AFF_INITIAL NULL-deadline rows remain');

  await client.end();

  log('\n=== RESULT ===');
  if (allAssertionsPassed) {
    log('AC-06 PASS — backfill behaves correctly on predecessor DB');
  } else {
    log('AC-06 FAIL — at least one assertion failed');
  }

  writeEvidence();
  process.exit(allAssertionsPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(`FATAL ${e.stack ?? e.message}`);
  logLines.push(`FATAL ${e.stack ?? e.message}`);
  writeEvidence();
  process.exitCode = e.exitCode ?? 1;
});
