#!/usr/bin/env node
/**
 * scripts/ci/prepare-migration-test-db.mjs
 *
 * AC-06/07 helper: prepare `aff05a_r1_migration_test` (candidate DB) by
 * applying the FULL Prisma migration chain from the worktree's
 * `prisma/migrations/` directory. The predecessor DB (R1 excluded) is
 * built separately by `scripts/ci/build-predecessor-staging.mjs`.
 *
 * Why schema-only pg_dump was rejected (round-4 fix):
 *   T0 round-4 clarified that "restored schema" is NOT the same as
 *   "predecessor migration chain". A pg_dump of an R1-applied DB then drop
 *   the R1 function is restoring the *R1-applied schema with one function
 *   removed*. It is not the same as applying AFF-03C migrations on a fresh
 *   DB. Predecessor is therefore built by `build-predecessor-staging.mjs`
 *   which extracts `e4d21807` baseline migrations via `git show` and runs
 *   the real `prisma migrate deploy` in a per-invocation tmp dir. This
 *   script applies the full chain (including R1) to the candidate DB.
 *
 * T0 round-7 R7-G2: candidate preparation = bootstrap pre → migrate
 * deploy → bootstrap post on a clean DB. The old `--validate-guards`
 * mode (which lived in this script) has been REMOVED —
 * `scripts/ci/validate-guards.mjs` is the SINGLE non-mutating guard
 * validator. This script only runs the destructive prepare branch (which
 * the validator's `--probe` mode proves is unreachable until the guard
 * phase passes).
 *
 * SYNTHETIC-ONLY GUARDS (round-3 + round-4 + round-8):
 *   - Target/source DB names validated against allowlist (exit 3) BEFORE any
 *     psql call.
 *   - Host allowlist: only `127.0.0.1`, `localhost` allowed (exit 3 if host
 *     is a routable IP / non-loopback).
 *   - source != target: refuse if SOURCE_DB == TARGET_DB (exit 3).
 *   - All psql calls use execFileSync with arg arrays (no shell,
 *     no template-string interpolation of identifier values).
 *   - Round-8 R8-G1: CLI flag allowlist BEFORE any connection/env-var
 *     resolution/mutation. Unknown flags (including the removed legacy
 *     `--validate-guards`) reject with exit 3. Negative tests for the
 *     rejection live in `scripts/ci/validate-guards.mjs`.
 *
 * Usage:
 *   node scripts/ci/prepare-migration-test-db.mjs
 *   node scripts/ci/prepare-migration-test-db.mjs --dry-run   # validate without mutating
 *   node scripts/ci/prepare-migration-test-db.mjs --probe     # guards only, no connection
 *
 * T0 round-8 R8-G1: the legacy `--validate-guards` mode (which used to
 * live inside this script) was removed in R7, but its flag was NOT
 * rejected. With valid config, the legacy flag was silently ignored and
 * the script fell through to the destructive prepare branch. We now
 * EXPLICITLY REJECT `--validate-guards` (and any other unknown flag)
 * BEFORE any connection, env-var resolution, or mutation.
 *
 * Requires admin password in env PGPASSWORD or DATABASE_URL_ADMIN_TEST pointing
 * to a Postgres superuser with CREATE DATABASE.
 */
import { Client } from 'pg';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const EVIDENCE_DIR = process.env.EVIDENCE_DIR
  ?? join(REPO_ROOT, 'docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence');

// T0 round-8 R8-G1: explicit CLI flag allowlist. Reject unknown flags and
// the legacy removed `--validate-guards` flag BEFORE any env-var read,
// connection, or mutation. With valid config, the previous (R7) script
// silently ignored `--validate-guards` and fell through to the
// destructive prepare branch — this rejection closes that loophole.
// Allowed flags: --dry-run, --probe. Anything else (including
// --validate-guards) → exit 3.
const ALLOWED_FLAGS = new Set(['--dry-run', '--probe']);
const REJECTED_FLAGS = new Set(['--validate-guards']);
{
  const args = process.argv.slice(2);
  for (const a of args) {
    if (a.startsWith('--')) {
      if (REJECTED_FLAGS.has(a)) {
        console.error(`REJECTED_LEGACY_FLAG ${a} — this flag was removed; use scripts/ci/validate-guards.mjs for non-mutating guard validation.`);
        process.exit(3);
      }
      if (!ALLOWED_FLAGS.has(a)) {
        console.error(`UNKNOWN_FLAG ${a} — refusing. Allowed: ${[...ALLOWED_FLAGS].join(', ')}`);
        process.exit(3);
      }
    }
  }
}

const ADMIN_URL = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const SOURCE_DB_RAW = process.env.MIGRATION_SOURCE_DB ?? 'aff05a_r1_test';
const TARGET_DB_RAW = process.env.MIGRATION_TARGET_DB ?? 'aff05a_r1_migration_test';

// Synthetic-only allowlist. T0 round-4: any DB name outside this list is rejected.
const ALLOWED_DB_NAMES = new Set([
  'aff05a_r1_test',
  'aff05a_r1_migration_test',
  'aff05a_r1_baseline_test', // T0 round-4: dedicated baseline DB at predecessor state
  'aff05a_r1_predecessor', // T0 round-5 R5-G2: staging-driven predecessor DB
]);

// T0 round-4: host allowlist. Localhost only — no public IPs / DNS names.
const ALLOWED_HOSTS = new Set([
  '127.0.0.1',
  'localhost',
  '::1',
]);

const PSQL_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';

const out = (k, v) => console.log(`${k}=${v}`);

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

function guardSourceDistinct(source, target) {
  if (source === target) {
    console.error(`SOURCE_EQUALS_TARGET source=${source} — refusing to drop and recreate the same DB.`);
    process.exit(3);
  }
}

guardDbName(SOURCE_DB_RAW, 'MIGRATION_SOURCE_DB');
guardDbName(TARGET_DB_RAW, 'MIGRATION_TARGET_DB');

if (!ADMIN_URL) {
  console.error('ERROR: DATABASE_URL_ADMIN_TEST not set');
  process.exit(2);
}
if (!process.env.PGPASSWORD) {
  console.error('ERROR: PGPASSWORD not set');
  process.exit(2);
}

const DRY_RUN = process.argv.includes('--dry-run');

let adminConn, host, port, user, password;
adminConn = new URL(ADMIN_URL);
host = adminConn.hostname || '127.0.0.1';
port = adminConn.port || '5432';
user = adminConn.username;
password = adminConn.password;

// T0 round-4: host guard happens BEFORE any connection attempt.
guardHost(host);

// T0 round-5 R5-G3: --probe mode. Runs ONLY guard checks (db names, host,
// source != target) and exits 0 with GUARD_PASS. Never opens a pg client,
// never shells out to psql/prisma, never writes evidence. Used by
// validate-guards.mjs to prove the guards are real.
//
// T0 round-7 R7-G2: this is the SINGLE non-mutating guard path. The
// redundant `--validate-guards` mode that used to live in this script
// has been removed — `scripts/ci/validate-guards.mjs` is the dedicated
// non-mutating guard validator. Tests negative (unsafe target / host /
// source==target) by asserting exit-3 from the destructive branch
// WITHOUT any side-effect, and positive (probe) by exiting 0 with
// GUARD_PASS and no destructive marker.
if (process.argv.includes('--probe')) {
  guardSourceDistinct(SOURCE_DB_RAW, TARGET_DB_RAW);
  out('GUARD_PASS', 'source_db target_db host url_parse source_distinct');
  out('PROBE_OK', 'no-prepare no-evidence');
  process.exit(0);
}

async function quoteIdent(client, name) {
  const r = await client.query(`SELECT quote_ident($1) AS q`, [name]);
  return r.rows[0]?.q ?? '';
}

async function fetchMetadata(client, label, dbname) {
  out(label, `=== ${dbname} ===`);
  // writer role (app_user_writer) effective privileges on key tables
  const privs = await client.query(`
    SELECT table_name, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
      FROM information_schema.table_privileges
     WHERE grantee = 'app_user_writer'
       AND table_schema = 'public'
       AND table_name IN ('referral_attributions', 'labor_profile_handling_assignments',
                          'placement_case', 'candidate_submissions', 'labor_profiles')
     GROUP BY table_name
     ORDER BY table_name
  `);
  for (const r of privs.rows) {
    out(label + '.priv', `${r.table_name}=${r.privs}`);
  }
  // RLS state on labor_profile_handling_assignments
  const rls = await client.query(`
    SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
     WHERE relname = 'labor_profile_handling_assignments'
       AND relnamespace = 'public'::regnamespace
  `);
  for (const r of rls.rows) {
    out(label + '.rls', `${r.relname}: rowsec=${r.relrowsecurity} forcerowsec=${r.relforcerowsecurity}`);
  }
  // hrp_public_rpc effective privileges on labor_profile_handling_assignments
  const rpcPrivs = await client.query(`
    SELECT string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
      FROM information_schema.table_privileges
     WHERE table_name = 'labor_profile_handling_assignments'
       AND grantee = 'hrp_public_rpc'
  `);
  out(label + '.rpc_handling_privs', rpcPrivs.rows[0]?.privs ?? 'none');
  // hrp_public_rpc role attributes (rolcanlogin, rolbypassrls, etc.)
  const attrs = await client.query(`
    SELECT rolname, rolcanlogin, rolbypassrls, rolsuper, rolcreatedb
      FROM pg_roles WHERE rolname = 'hrp_public_rpc'
  `);
  if (attrs.rows.length > 0) {
    const r = attrs.rows[0];
    out(label + '.rpc_role_attrs', `${r.rolname}: login=${r.rolcanlogin} bypassrls=${r.rolbypassrls} super=${r.rolsuper} createdb=${r.rolcreatedb}`);
  }
  // Verify hrp_public_rpc NOLOGIN BYPASSRLS (DEC-14)
  if (attrs.rows[0]?.rolcanlogin === true) {
    console.error(`HRP_PUBLIC_RPC_HAS_LOGIN — refusing. Role must be NOLOGIN per DEC-14.`);
    process.exit(4);
  }
  if (attrs.rows[0]?.rolbypassrls !== true) {
    console.error(`HRP_PUBLIC_RPC_NO_BYPASSRLS — refusing. Role must be BYPASSRLS per DEC-14.`);
    process.exit(4);
  }
}

async function main() {
  out('ADMIN_URL_SET', 'yes');
  out('HOST', host);
  out('SOURCE_DB', SOURCE_DB_RAW);
  out('TARGET_DB', TARGET_DB_RAW);
  out('DRY_RUN', DRY_RUN ? 'true' : 'false');

  // T0 round-4: source != target guard.
  guardSourceDistinct(SOURCE_DB_RAW, TARGET_DB_RAW);

  if (DRY_RUN) {
    out('DRY_RUN_OK', 'validation complete; no mutation performed');
    return;
  }

  // T0 round-7 R7-G2: the old `--validate-guards` mode that lived here
  // has been removed. `scripts/ci/validate-guards.mjs` is the SINGLE
  // non-mutating guard validator. This script now only handles the
  // destructive prepare branch (which the validator's `--probe` mode
  // proves is unreachable until the guard phase passes).

  // T0 round-4: connect to the cluster DB (postgres), not the target DB,
  // because we DROP/CREATE the target DB below and the connection would
  // otherwise be terminated mid-stream.
  const clusterUrl = new URL(ADMIN_URL);
  clusterUrl.pathname = '/postgres';
  const client = new Client({ connectionString: clusterUrl.toString() });
  await client.connect();
  try {
    // Quote identifiers before SQL interpolation.
    const quotedTarget = await quoteIdent(client, TARGET_DB_RAW);

  // T0 round-8 R8-G2: source/target collision check BEFORE any DROP. We
  // refuse to proceed if the cluster reports that `TARGET_DB` already
  // exists or has active (non-idle) sessions. The check runs BEFORE the
  // destructive DROP — a marker printed AFTER DROP would not prove the
  // destructive branch never ran. The string-level `guardSourceDistinct`
  // already passed; this is a runtime belt-and-braces check that also
  // catches the case where the operator forgot to clean up a leftover
  // from a previous run.
  {
    const activeCheck = await client.query(
      `SELECT count(*)::int AS n
         FROM pg_stat_activity
        WHERE datname = $1
          AND state <> 'idle'
          AND pid <> pg_backend_pid()`,
      [TARGET_DB_RAW],
    );
    const active = activeCheck.rows[0]?.n ?? 0;
    if (active > 0) {
      console.error(`TARGET_DB_BUSY target=${TARGET_DB_RAW} active_sessions=${active} — refusing.`);
      process.exit(5);
    }
    const dbExists = await client.query(
      `SELECT count(*)::int AS n FROM pg_database WHERE datname = $1`,
      [TARGET_DB_RAW],
    );
    const dbExistsCount = dbExists.rows[0]?.n ?? 0;
    if (dbExistsCount > 0) {
      console.error(`TARGET_DB_EXISTS target=${TARGET_DB_RAW} — refusing to DROP; caller must ensure target is fresh.`);
      process.exit(5);
    }
    out('TARGET_DB_COLLISION_CHECK', 'pass (pre-DROP, db-not-exists)');
  }

  // 1. Drop and recreate target DB.
  out('PREPARE', 'drop_recreate_target_db');
  // T0 round-4: DROP DATABASE ... WITH (FORCE) can take time; we still use it
  // but only against the allowlisted synthetic target.
  try {
    execFileSync(PSQL_BIN, [
      '-h', host, '-p', port, '-U', user, '-d', 'postgres',
      '-v', 'ON_ERROR_STOP=1',
      '-c', `DROP DATABASE IF EXISTS ${quotedTarget} WITH (FORCE)`,
    ], {
      env: { ...process.env, PGPASSWORD: password },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    execFileSync(PSQL_BIN, [
      '-h', host, '-p', port, '-U', user, '-d', 'postgres',
      '-v', 'ON_ERROR_STOP=1',
      '-c', `DROP DATABASE IF EXISTS ${quotedTarget}`,
    ], {
      env: { ...process.env, PGPASSWORD: password },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }
  execFileSync(PSQL_BIN, [
    '-h', host, '-p', port, '-U', user, '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1',
    '-c', `CREATE DATABASE ${quotedTarget}`,
  ], {
    env: { ...process.env, PGPASSWORD: password },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  out('TARGET_DB_CREATED', TARGET_DB_RAW);

    const targetUrl = new URL(ADMIN_URL);
    targetUrl.pathname = `/${TARGET_DB_RAW}`;
    const env = {
      ...process.env,
      PGPASSWORD: password,
      DATABASE_URL: targetUrl.toString(),
      DATABASE_URL_ADMIN: targetUrl.toString(),
      DATABASE_URL_ADMIN_TEST: targetUrl.toString(),
      DATABASE_URL_TEST: targetUrl.toString(),
    };

    // T0 round-7 R7-G2: bootstrap PRE on the candidate DB BEFORE migrate
    // deploy. Some baseline migrations assume roles like `hrp_public_rpc`
    // and `app_user_writer` already exist (so their GRANTs can succeed).
    // Without bootstrap pre, the migration can fail at `GRANT ... TO
    // hrp_public_rpc`. `container-test-db.mjs --phase=pre` creates those
    // roles idempotently.
    out('BOOTSTRAP_PRE', 'starting');
    execFileSync('node', [join(REPO_ROOT, 'scripts', 'ci', 'container-test-db.mjs'), '--phase=pre'], {
      cwd: REPO_ROOT,
      env: { ...env, PG_BASELINE_PASSWORD: password },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    out('BOOTSTRAP_PRE_OK', 'pre');

    // T0 round-7 R7-G2: apply the full Prisma migration chain from the
    // worktree's `prisma/migrations/` directory. This includes R1 for the
    // candidate DB. Predecessor DB (R1 excluded) is built by
    // `build-predecessor-staging.mjs` instead. We use Prisma CLI with
    // explicit synthetic env vars; we do NOT rename anything in the
    // worktree.
    out('PREPARE', 'apply_migration_chain');
    if (!existsSync(join(REPO_ROOT, 'prisma', 'migrations'))) {
      console.error(`PREDECESSOR_DIR_NOT_FOUND ${join(REPO_ROOT, 'prisma', 'migrations')}`);
      process.exit(1);
    }
    out('PRISMA_SCHEMA', join(REPO_ROOT, 'prisma', 'schema.prisma'));
    try {
      const stdout = execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
        cwd: REPO_ROOT,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        shell: process.platform === 'win32',
      });
      out('MIGRATE_DEPLOY_OK', 'stdout_len=' + (stdout?.length ?? 0));
    } catch (e) {
      const errStdout = (e.stdout?.toString?.() ?? '');
      const errStderr = (e.stderr?.toString?.() ?? '');
      console.error('MIGRATE_DEPLOY_FAIL stdout:', errStdout.slice(-500));
      console.error('MIGRATE_DEPLOY_FAIL stderr:', errStderr.slice(-500));
      console.error('MIGRATE_DEPLOY_FAIL status:', e.status, 'code:', e.code);
      process.exit(1);
    }
    out('MIGRATION_CHAIN_APPLIED', 'full_chain_for_candidate_db');

    // T0 round-7 R7-G2: bootstrap POST after migrate deploy. Some
    // post-migration grants in the project's CI helper set are conditional
    // on tables existing (which is only true after migrate deploy
    // completes). Running post after deploy applies those grants.
    out('BOOTSTRAP_POST', 'starting');
    execFileSync('node', [join(REPO_ROOT, 'scripts', 'ci', 'container-test-db.mjs'), '--phase=post'], {
      cwd: REPO_ROOT,
      env: { ...env, PG_BASELINE_PASSWORD: password },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    out('BOOTSTRAP_POST_OK', 'post');

    // 4. Fetch role/RLS/privilege metadata (no secrets).
    out('METADATA', `=== ${TARGET_DB_RAW} ===`);
    // T0 round-4: open a fresh target-DB client for the metadata fetch.
    const metaClient = new Client({ connectionString: targetUrl.toString() });
    await metaClient.connect();
    try {
      await fetchMetadata(metaClient, 'METADATA', TARGET_DB_RAW);
    } finally {
      await metaClient.end();
    }

    out('READY', 'predecessor_state');
    console.log(`READY target_db=${TARGET_DB_RAW}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(`FATAL ${e.message}`);
  process.exit(1);
});
