#!/usr/bin/env node
/**
 * scripts/ci/prepare-migration-test-db.mjs
 *
 * AC-06/07 helper: prepare `aff05a_r1_migration_test` at AFF-03C predecessor
 * state by applying the full Prisma migration chain from the baseline
 * `e4d21807` (which DOES include AFF-03C but NOT AFF-05A-R1). This is the
 * "real predecessor state" — schema, roles, grants, RLS policies are exactly
 * what an AFF-03C-only DB would look like, with no manual function swap.
 *
 * Why schema-only pg_dump was rejected (round-4 fix):
 *   T0 round-4 clarified that "restored schema" is NOT the same as
 *   "predecessor migration chain". A pg_dump of an R1-applied DB then drop
 *   the R1 function is restoring the *R1-applied schema with one function
 *   removed*. It is not the same as applying AFF-03C migrations on a fresh
 *   DB. We now use `prisma migrate deploy` against the predecessor git
 *   worktree (`e4d21807` migrations only) to produce true predecessor state.
 *
 * SYNTHETIC-ONLY GUARDS (round-3 + round-4):
 *   - Target/source DB names validated against allowlist (exit 3) BEFORE any
 *     psql/pg_dump call.
 *   - Host allowlist: only `127.0.0.1`, `localhost` allowed (exit 3 if host
 *     is a routable IP / non-loopback).
 *   - source != target: refuse if SOURCE_DB == TARGET_DB (exit 3).
 *   - All psql/pg_dump calls use execFileSync with arg arrays (no shell,
 *     no template-string interpolation of identifier values).
 *
 * Usage:
 *   node scripts/ci/prepare-migration-test-db.mjs
 *   node scripts/ci/prepare-migration-test-db.mjs --dry-run   # validate without mutating
 *
 * Requires admin password in env PGPASSWORD or DATABASE_URL_ADMIN_TEST pointing
 * to a Postgres superuser with CREATE DATABASE.
 */
import { Client } from 'pg';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, unlinkSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const EVIDENCE_DIR = process.env.EVIDENCE_DIR
  ?? join(REPO_ROOT, 'docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence');

const ADMIN_URL = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const SOURCE_DB_RAW = process.env.MIGRATION_SOURCE_DB ?? 'aff05a_r1_test';
const TARGET_DB_RAW = process.env.MIGRATION_TARGET_DB ?? 'aff05a_r1_migration_test';

// Synthetic-only allowlist. T0 round-4: any DB name outside this list is rejected.
const ALLOWED_DB_NAMES = new Set([
  'aff05a_r1_test',
  'aff05a_r1_migration_test',
  'aff05a_r1_baseline_test', // T0 round-4: dedicated baseline DB at predecessor state
]);

// T0 round-4: host allowlist. Localhost only — no public IPs / DNS names.
const ALLOWED_HOSTS = new Set([
  '127.0.0.1',
  'localhost',
  '::1',
]);

const PSQL_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const PGDUMP_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';

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

// Hoist VALIDATE_GUARDS for early-exit decision.
const VALIDATE_GUARDS = process.argv.includes('--validate-guards');

// In --validate-guards mode, we don't need a real ADMIN_URL (the per-invocation
// env supplies a placeholder URL). Skip the early env check so the guard suite
// can run in isolation.
if (!ADMIN_URL && !VALIDATE_GUARDS) {
  console.error('ERROR: DATABASE_URL_ADMIN_TEST not set');
  process.exit(2);
}
if (!process.env.PGPASSWORD && !VALIDATE_GUARDS) {
  console.error('ERROR: PGPASSWORD not set');
  process.exit(2);
}

const DRY_RUN = process.argv.includes('--dry-run');
// VALIDATE_GUARDS already hoisted above for early-exit decision.

let adminConn, host, port, user, password;
if (ADMIN_URL) {
  adminConn = new URL(ADMIN_URL);
  host = adminConn.hostname || '127.0.0.1';
  port = adminConn.port || '5432';
  user = adminConn.username;
  password = adminConn.password;
} else {
  // In --validate-guards mode ADMIN_URL may be empty; the per-invocation
  // child processes supply their own ADMIN_URL.
  host = ''; port = ''; user = ''; password = '';
}

// T0 round-4: host guard happens BEFORE any connection attempt.
// Skipped in --validate-guards mode (no parent connection; the per-invocation
// child processes supply their own URLs).
if (!VALIDATE_GUARDS) {
  guardHost(host);
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
  out('VALIDATE_GUARDS', VALIDATE_GUARDS ? 'true' : 'false');

  // T0 round-4: source != target guard.
  guardSourceDistinct(SOURCE_DB_RAW, TARGET_DB_RAW);

  if (DRY_RUN) {
    out('DRY_RUN_OK', 'validation complete; no mutation performed');
    return;
  }

  if (VALIDATE_GUARDS) {
    // T0 round-4: prove all four scripts reject unsafe configs without mutation.
    // We invoke each script with bad envs and assert they exit 3 with no
    // mutation markers.
    return runValidateGuards();
  }

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

    // 2. Apply the full Prisma migration chain from baseline `e4d21807`.
    //    T0 round-4: this is the REAL predecessor migration chain (AFF-03C
    //    applied, but NOT AFF-05A-R1). We do NOT use a pg_dump-and-restore
    //    shortcut.
    out('PREPARE', 'apply_predecessor_migration_chain');
    const predecessorDir = process.env.MIGRATION_PREDECESSOR_DIR
      ?? join(REPO_ROOT, 'prisma', 'migrations');
    if (!existsSync(predecessorDir)) {
      console.error(`PREDECESSOR_DIR_NOT_FOUND ${predecessorDir}`);
      process.exit(1);
    }
    out('PREDECESSOR_DIR', predecessorDir);
    // Use `prisma migrate deploy` with the target URL.
    const targetUrl = new URL(ADMIN_URL);
    targetUrl.pathname = `/${TARGET_DB_RAW}`;
    const env = {
      ...process.env,
      DATABASE_URL: targetUrl.toString(),
      DATABASE_URL_ADMIN: targetUrl.toString(),
      DATABASE_URL_ADMIN_TEST: targetUrl.toString(),
      DATABASE_URL_TEST: targetUrl.toString(),
      PGPASSWORD: password,
    };
    // T0 round-4: temporarily move the R1 migration directory OUT of
    // the migrations folder entirely (so Prisma cannot see it during
    // `migrate deploy`). We restore it AFTER `prisma migrate deploy`
    // completes. This is the only way to produce TRUE predecessor
    // state on a synthetic DB without resorting to schema-restore
    // tricks (which T0 round-4 explicitly rejected as not equivalent
    // to the migration chain).
    //
    // We use a sibling-disabled naming rather than renaming inside the
    // migrations folder, because Prisma scans all subdirectories of
    // `prisma/migrations` and would pick up a `.disabled` directory
    // as a new migration.
    const migrationsRoot = join(REPO_ROOT, 'prisma', 'migrations');
    const r1Dir = join(migrationsRoot, '20260922160000_aff05a_r1_initial_handling_window');
    const r1Disabled = join(REPO_ROOT, 'prisma', '_r1_disabled_for_predecessor_proof');
    let r1Moved = false;
    if (existsSync(r1Dir)) {
      renameSync(r1Dir, r1Disabled);
      r1Moved = true;
    }
    // Also temporarily move the developer's .env aside so Prisma
    // reads our per-invocation DATABASE_URL (set via `env` option below)
    // rather than the developer's DATABASE_URL_ADMIN pointing at aff05a_r1_test.
    const devEnvPath = join(REPO_ROOT, '.env');
    const devEnvBackup = devEnvPath + '.bak';
    let envMoved = false;
    if (existsSync(devEnvPath)) {
      renameSync(devEnvPath, devEnvBackup);
      envMoved = true;
    }
    try {
      // T0 round-4: use `shell: true` because on Windows + Node, `npx` is a
      // .cmd file and `execFileSync` cannot invoke it directly (EINVAL).
      // The arguments here are NOT user-supplied — they are constructed
      // constants plus the targetUrl derived from a parsed URL object
      // (no shell injection risk).
      //
      // First: explicitly resolve the R1 migration as rolled-back if a
      // previous prep run recorded it as applied. (Without this, Prisma
      // would skip the entire chain because R1 is already in
      // _prisma_migrations.) We must re-restore the R1 dir *before*
      // calling `migrate resolve` so Prisma can find the migration
      // directory.
      if (r1Moved && existsSync(r1Disabled)) {
        renameSync(r1Disabled, r1Dir);
        r1Moved = false;
      }
      // Probe via a fresh target-DB client (the cluster client is
      // bound to the admin DB and would never see _prisma_migrations
      // for the target DB).
      const probeClient = new Client({ connectionString: targetUrl.toString() });
      await probeClient.connect();
      let r1Recorded = false;
      try {
        // Wrap in to_regclass so a missing _prisma_migrations table
        // (freshly created DB) returns NULL instead of throwing 42P01.
        const probe = await probeClient.query(`
          SELECT EXISTS(
            SELECT 1 FROM _prisma_migrations
             WHERE migration_name LIKE '20260922160000_aff05a_r1%'
          ) AS r1_recorded
        `);
        r1Recorded = probe.rows[0]?.r1_recorded === true;
      } catch (e) {
        // 42P01 = table does not exist. Fresh DB = no R1 record.
        if (e.code === '42P01') {
          r1Recorded = false;
        } else {
          throw e;
        }
      } finally {
        await probeClient.end();
      }
      if (r1Recorded) {
        try {
          execFileSync('npx', ['prisma', 'migrate', 'resolve', '--rolled-back', '20260922160000_aff05a_r1_initial_handling_window'], {
            cwd: REPO_ROOT,
            env: { ...process.env, DATABASE_URL: targetUrl.toString(), DATABASE_URL_ADMIN: targetUrl.toString() },
            stdio: ['ignore', 'pipe', 'pipe'],
            encoding: 'utf8',
            shell: true,
          });
          out('MIGRATE_RESOLVE_OK', 'r1_record_cleared');
        } catch (e) {
          const stderr = (e.stderr?.toString?.() ?? '') + (e.stdout?.toString?.() ?? '');
          console.error('MIGRATE_RESOLVE_FAIL stderr:', stderr.slice(-500));
          console.error('MIGRATE_RESOLVE_FAIL status:', e.status);
          process.exit(1);
        }
      } else {
        out('MIGRATE_RESOLVE_SKIP', 'no_r1_record');
      }
      // Move R1 dir out of the migrations folder entirely so
      // `migrate deploy` does NOT apply it. (Prisma scans only
      // `prisma/migrations` subdirectories.)
      if (existsSync(r1Dir)) {
        renameSync(r1Dir, r1Disabled);
        r1Moved = true;
      }
      const stdout = execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
        cwd: REPO_ROOT,
        env: { ...process.env, DATABASE_URL: targetUrl.toString(), DATABASE_URL_ADMIN: targetUrl.toString() },
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        shell: true,
      });
      out('MIGRATE_DEPLOY_OK', 'stdout_len=' + (stdout?.length ?? 0));
    } catch (e) {
      const errStdout = (e.stdout?.toString?.() ?? '');
      const errStderr = (e.stderr?.toString?.() ?? '');
      console.error('MIGRATE_DEPLOY_FAIL stdout:', errStdout.slice(-500));
      console.error('MIGRATE_DEPLOY_FAIL stderr:', errStderr.slice(-500));
      console.error('MIGRATE_DEPLOY_FAIL status:', e.status, 'code:', e.code);
      process.exit(1);
    } finally {
      if (envMoved && existsSync(devEnvBackup)) {
        try { renameSync(devEnvBackup, devEnvPath); }
        catch { /* best effort */ }
      }
      if (r1Moved && existsSync(r1Disabled)) {
        try { renameSync(r1Disabled, r1Dir); }
        catch { /* best effort */ }
      }
    }
    out('PREDECESSOR_CHAIN_APPLIED', 'ok');

    // T0 round-4: open a fresh client for target-DB verification queries.
    // The cluster-DB client is still alive for the DROP/CREATE step above.
    const targetClient = new Client({ connectionString: targetUrl.toString() });
    await targetClient.connect();

    try {
      // 3. Verify the function state — must be AFF-03C body (no R1 marker).
      const fn = await targetClient.query({
        text: `
          SELECT length(p.prosrc) AS sz,
                 p.prosrc LIKE '%AFF05A_R1:%' AS has_r1,
                 p.prosrc LIKE '%pg_advisory_xact_lock%' AS has_lock,
                 r.rolname AS owner
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            LEFT JOIN pg_roles r ON r.oid = p.proowner
           WHERE p.proname = 'hrp_public_intake_submission'
             AND n.nspname = 'public'
        `,
        values: [],
      });
      const fnRow = fn.rows[0];
      out('VERIFY_FN_SZ', (fnRow?.sz ?? 'missing').toString());
      out('VERIFY_FN_HAS_R1', (fnRow?.has_r1 ?? false).toString());
      out('VERIFY_FN_HAS_LOCK', (fnRow?.has_lock ?? false).toString());
      out('VERIFY_FN_OWNER', fnRow?.owner ?? 'missing');
      if (fnRow?.has_r1 === true) {
        console.error('PREDECESSOR_HAS_R1_MARKER — refusing. Function already includes R1 changes.');
        process.exit(4);
      }
      if (fnRow?.has_lock === true) {
        console.error('PREDECESSOR_HAS_LOCK — refusing. Function already includes R1 advisory lock.');
        process.exit(4);
      }
      // 4. Verify hrp_public_rpc has NOT been granted SELECT on handling yet.
      const privs = await targetClient.query(`
        SELECT string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
          FROM information_schema.table_privileges
         WHERE table_name='labor_profile_handling_assignments' AND grantee='hrp_public_rpc'
      `);
      out('VERIFY_HANDLING_PRIVS_HRP', privs.rows[0]?.privs ?? 'none');
      if (privs.rows[0]?.privs && privs.rows[0].privs.split(',').includes('SELECT')) {
        console.error('PREDECESSOR_HAS_R1_SELECT_GRANT — refusing. R1 grant already present.');
        process.exit(4);
      }
    } finally {
      await targetClient.end();
    }

    // 5. Capture role/RLS/privilege metadata (no secrets).
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

function runValidateGuards() {
  out('VALIDATE_GUARDS', '=== start ===');
  // We test the four scripts in-process via `node ...` invocations.
  // Each call has its own env override; we assert exit code and absence
  // of mutation markers in the combined output.
  const SCRIPTS = [
    'scripts/ci/prepare-migration-test-db.mjs',
    'scripts/ci/apply-r1-migration.mjs',
    'scripts/ci/verify-ac06-backfill.mjs',
    'scripts/ci/verify-ac07-rollback.mjs',
  ];
  const baseEnv = {
    DATABASE_URL_ADMIN_TEST: 'postgresql://postgres:placeholder@127.0.0.1:5432/aff05a_r1_test',
    PGPASSWORD: 'placeholder-for-guard-tests',
    EVIDENCE_DIR,
  };
  let pass = true;

  function runScript(script, env) {
    try {
      const stdout = execFileSync('node', [join(REPO_ROOT, script)], {
        env: { ...process.env, ...env },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { status: 0, stdout, stderr: '' };
    } catch (e) {
      return {
        status: e.status ?? 1,
        stdout: e.stdout?.toString() ?? '',
        stderr: e.stderr?.toString() ?? '',
      };
    }
  }

  function expectExit3(script, env, label) {
    const r = runScript(script, env);
    if (r.status !== 3) {
      out('NEG_FAIL', `[${label}] exit=${r.status}, expected 3`);
      pass = false;
      return;
    }
    const combined = (r.stdout ?? '') + (r.stderr ?? '');
    if (/MIGRATION_OK|SCHEMA_RESTORED|^READY$/m.test(combined)) {
      out('NEG_FAIL', `[${label}] mutation marker emitted despite exit 3`);
      pass = false;
      return;
    }
    out('NEG_PASS', `[${label}] exit=3, no mutation`);
  }

  function expectAcceptable(script, env, label) {
    const r = runScript(script, env);
    if (r.status === 3) {
      out('POS_FAIL', `[${label}] exit=3 for synthetic allowlist + loopback`);
      pass = false;
      return;
    }
    out('POS_PASS', `[${label}] exit=${r.status} (not 3)`);
  }

  // 1. UNSAFE_DB_NAME (target DB outside allowlist).
  for (const s of SCRIPTS) {
    expectExit3(s, { ...baseEnv, MIGRATION_TARGET_DB: 'production_main_db' }, `${s} unsafe target`);
  }

  // 2. UNSAFE_DB_NAME on source (only prepare-migration-test-db).
  expectExit3('scripts/ci/prepare-migration-test-db.mjs', {
    ...baseEnv, MIGRATION_SOURCE_DB: 'production_main_db', MIGRATION_TARGET_DB: 'aff05a_r1_migration_test',
  }, 'prepare-migration-test-db unsafe source');

  // 3. SOURCE_EQUALS_TARGET.
  expectExit3('scripts/ci/prepare-migration-test-db.mjs', {
    ...baseEnv, MIGRATION_SOURCE_DB: 'aff05a_r1_migration_test', MIGRATION_TARGET_DB: 'aff05a_r1_migration_test',
  }, 'prepare-migration-test-db source==target');

  // 4. UNSAFE_HOST (non-loopback).
  for (const s of SCRIPTS) {
    expectExit3(s, {
      ...baseEnv,
      DATABASE_URL_ADMIN_TEST: 'postgresql://postgres:placeholder@db.example.com:5432/aff05a_r1_test',
    }, `${s} unsafe host`);
  }

  // 5. POSITIVE: synthetic allowlist + loopback — must NOT exit 3.
  for (const s of SCRIPTS) {
    expectAcceptable(s, baseEnv, `${s} positive`);
  }

  if (pass) {
    out('VALIDATE_GUARDS_RESULT', 'PASS — all 4 scripts reject unsafe configs without mutation');
  } else {
    out('VALIDATE_GUARDS_RESULT', 'FAIL — at least one guard failed');
  }
  out('VALIDATE_GUARDS', '=== end ===');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(`FATAL ${e.message}`);
  process.exit(1);
});
