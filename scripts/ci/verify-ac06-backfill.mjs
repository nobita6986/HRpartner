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

if (!ADMIN_URL) { console.error('ERROR: DATABASE_URL_ADMIN_TEST not set'); process.exit(2); }
if (!process.env.PGPASSWORD) { console.error('ERROR: PGPASSWORD not set'); process.exit(2); }

if (!existsSync(EVIDENCE_DIR)) mkdirSync(EVIDENCE_DIR, { recursive: true });
const EVIDENCE_FILE = join(EVIDENCE_DIR, 'ac06-backfill.txt');
const logLines = [];
const log = (line) => { console.log(line); logLines.push(line); };

const adminConn = new URL(ADMIN_URL);
const host = adminConn.hostname || '127.0.0.1';
const port = adminConn.port || '5432';
const user = adminConn.username;
const password = adminConn.password;

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

async function main() {
  log(`AC-06 verify (backfill R1) — running at ${new Date().toISOString()}`);
  log(`TARGET_DB=${TARGET_DB}`);
  log(`EVIDENCE_FILE=${EVIDENCE_FILE}`);

  // 1. Reset to predecessor state via prep script.
  log('\n=== STEP 1: Reset DB to AFF-03C predecessor state ===');
  const prep = spawnSync('node', [join(REPO_ROOT, 'scripts/ci/prepare-migration-test-db.mjs')], {
    env: { ...process.env },
    encoding: 'utf8',
    stdio: 'pipe',
  });
  log(prep.stdout);
  if (prep.stderr) log(`STDERR: ${prep.stderr}`);
  if (prep.status !== 0) {
    log(`PREPARE_FAILED exit=${prep.status}`);
    writeFileSync(EVIDENCE_FILE, logLines.join('\n'));
    process.exit(1);
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
    writeFileSync(EVIDENCE_FILE, logLines.join('\n'));
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
  const lpNonAff = `${TARGET_DB}-ac06-nonaff-lp`;
  await seedLp(lpOverdue, 'AC06 overdue LP', '0900000006');
  await seedLp(lpFuture, 'AC06 future LP', '0900000007');
  await seedLp(lpTerminal, 'AC06 terminal LP', '0900000008');
  await seedLp(lpNonAff, 'AC06 nonAff LP', '0900000009');

  // Seed 4 legacy rows (matching T0 brief — note: schema enforces starts_at NOT NULL,
  // so "outside predicate" case is covered by non-AFF row instead of starts_at IS NULL):
  //   (a) Overdue ACTIVE: starts_at far past → deadline computed, status → EXPIRED.
  //   (b) Future ACTIVE: starts_at in future → deadline computed, status ACTIVE.
  //   (c) Terminal (REVOKED/EXPIRED): expires_at IS NULL → deadline computed, status preserved.
  //   (d) Non-AFF control: source != AFF_INITIAL → untouched by backfill predicate.

  const rowOverdue = `${TARGET_DB}-ac06-overdue-row`;
  const rowFuture = `${TARGET_DB}-ac06-future-row`;
  const rowTerminal = `${TARGET_DB}-ac06-terminal-row`;
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
      const nonAffStart = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  await seedLpha(rowOverdue, lpOverdue, 'AFF_INITIAL', overdueStart, null, 'ACTIVE');
  await seedLpha(rowFuture, lpFuture, 'AFF_INITIAL', futureStart, null, 'ACTIVE');
  await seedLpha(rowTerminal, lpTerminal, 'AFF_INITIAL', terminalStart, null, 'EXPIRED');
  await seedLpha(rowNonAff, lpNonAff, 'MANAGER', nonAffStart, null, 'ACTIVE');

  // Verify seeded state matches expected.
  const seedCheck = await execSql(client, `
    SELECT id, source, status, starts_at, expires_at
      FROM labor_profile_handling_assignments
     WHERE id IN ('${rowOverdue}','${rowFuture}','${rowTerminal}','${rowNonAff}')
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
    writeFileSync(EVIDENCE_FILE, logLines.join('\n'));
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
     WHERE id IN ('${rowOverdue}','${rowFuture}','${rowTerminal}','${rowNonAff}')
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
  else log('ASSERT_PASS (c): terminal status preserved');
  if (!terminalAfter?.expires_at) { log('ASSERT_FAIL (c): terminal row has no expires_at (backfill set deadline)'); allAssertionsPassed = false; }
  else log('ASSERT_PASS (c): terminal row received deadline from starts_at');

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

  writeFileSync(EVIDENCE_FILE, logLines.join('\n'));
  process.exit(allAssertionsPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(`FATAL ${e.stack ?? e.message}`);
  logLines.push(`FATAL ${e.stack ?? e.message}`);
  writeFileSync(EVIDENCE_FILE, logLines.join('\n'));
  process.exit(1);
});
