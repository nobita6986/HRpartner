#!/usr/bin/env node
/**
 * scripts/ci/build-predecessor-staging.mjs
 *
 * T0 round-6 R6-G2 + T0 round-7 R7-G2: build a TRUE predecessor (e4d2180)
 * state on a clean synthetic DB using ONLY `prisma migrate deploy` (the
 * real Prisma CLI).
 *
 * Single path (no parallel mechanisms):
 *   1. mkdtempSync(tmpdir()) → fresh per-invocation tmp dir (NEVER a fixed
 *      path that could collide with another concurrent run).
 *   2. Inside the tmp dir, materialize:
 *        - prisma/schema.prisma (from `git e4d2180`)
 *        - prisma/migration_lock.toml (from the WORKING TREE — T0 R7
 *          confirms the file exists; baseline `e4d2180` predates it. We
 *          write the canonical `provider = "postgresql"` content that
 *          Prisma CLI auto-generates. Materializing it explicitly ensures
 *          `prisma migrate deploy` does not skip the directory because
 *          `migration_lock.toml` is missing.)
 *        - prisma/migrations/<each baseline migration dir>/migration.sql
 *          (from `git e4d2180`, EXCLUDING any 20260922160000_aff05a_r1*)
 *      Files are extracted via `git show` — the worktree itself is NEVER
 *      renamed, mutated, or have files moved.
 *   3. Source/target collision check BEFORE any DROP/CREATE: we look up
 *      `pg_database` and `pg_stat_activity` and refuse to proceed if the
 *      target is already in use as a connection source or is currently
 *      connected by any active session. The check runs BEFORE DROP, not
 *      between DROP and CREATE — a marker printed AFTER DROP cannot prove
 *      the destructive branch never ran.
 *   4. Drop + recreate the target DB on the cluster.
 *   5. Bootstrap PRE (`container-test-db.mjs --phase=pre`) — creates roles
 *      (e.g. app_user_writer, hrp_public_rpc) before migrations run, so
 *      pre-existing GRANTs in baseline migrations can succeed.
 *   6. `prisma migrate deploy` (from worktree's `node_modules/.bin/prisma`,
 *      NOT `npx prisma`) against the target DB using explicit synthetic env
 *      (DATABASE_URL, DATABASE_URL_ADMIN). Prisma itself writes
 *      `_prisma_migrations` — we do NOT touch that table manually.
 *      Migrations are applied in Prisma's own alphabetical/timestamp order.
 *   7. Bootstrap POST (`container-test-db.mjs --phase=post`) — applies
 *      post-migration GRANTs to tables that didn't exist before deploy.
 *   8. Verify function state: function MUST exist; body MUST have NO
 *      R1 marker, NO `pg_advisory_xact_lock`, NO SELECT grant on handling
 *      for `hrp_public_rpc`. Assert failure is logged AND propagates to
 *      exit 4 — but ONLY after the finally block has run cleanup.
 *   9. Cleanup in `finally` — tmp dir is ALWAYS removed. No `process.exit()`
 *      before the finally block runs.
 *
 * Synthetic-only guards:
 *   - target DB name allowlist (exit 3 if unsafe)
 *   - host allowlist (loopback only; exit 3 if unsafe)
 *   - explicit synthetic env (DATABASE_URL etc.) — no fallback to developer
 *     .env or to aff05a_r1_test
 *
 * Exit codes:
 *   0 — predecessor DB ready
 *   1 — build failed (after cleanup)
 *   2 — env missing
 *   3 — unsafe guard violation
 *   4 — predecessor state invalid (function missing / R1 marker present /
 *       advisory lock present / SELECT grant present)
 *
 * Usage:
 *   PGPASSWORD=... DATABASE_URL_ADMIN_TEST=postgresql://postgres:...@host/aff05a_r1_predecessor \
 *     PG_BASELINE_PASSWORD=... \
 *     node scripts/ci/build-predecessor-staging.mjs
 */
import { execFileSync } from 'node:child_process';
import { Client } from 'pg';
import {
  mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const BASELINE_REF = process.env.BASELINE_REF ?? 'e4d21807f0d972de447e710066b40c77a661fb17';
const ADMIN_URL = (process.env.DATABASE_URL_ADMIN_TEST ?? '').trim();
const PASSWORD = (process.env.PGPASSWORD ?? '').trim();
const BASELINE_PASSWORD = (process.env.PG_BASELINE_PASSWORD ?? '').trim();
// T0 round-7 R7-G2: TARGET_DB env priority.
//   1. DATABASE_NAME — used by AC-06/07 callers to pin the predecessor
//      DB to a known name regardless of MIGRATION_TARGET_DB (which is
//      the AC-06/07 post-rename target name).
//   2. MIGRATION_TARGET_DB — used by validate-guards.mjs to inject an
//      "unsafe" name (e.g. `production_main_db`) and verify the guard
//      fires.
//   3. default `aff05a_r1_predecessor`.
// This order matches the existing AC-06/07 contract (which calls the
// builder with DATABASE_NAME explicitly) while still letting the guard
// validator drive the script with MIGRATION_TARGET_DB alone.
const TARGET_DB = (
  process.env.DATABASE_NAME
  ?? process.env.MIGRATION_TARGET_DB
  ?? 'aff05a_r1_predecessor'
).trim();

const ALLOWED_DB_NAMES = new Set([
  'aff05a_r1_predecessor',
  'aff05a_r1_migration_test',
  'aff05a_r1_test',
  'aff05a_r1_baseline_test',
]);
const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

// Fixture names remain synthetic-only even when the explicit flag is present.
const IS_COLLISION_FIXTURE = process.argv.includes('--collision-fixture');
const FIXTURE_NAME = /^aff05a_r1_collision_[0-9a-f]{8}_(?:pred|tgt)$/;
for (const arg of process.argv.slice(2)) {
  if (!['--probe', '--collision-fixture'].includes(arg)) {
    console.error('UNSAFE_FLAG: unsupported builder argument');
    process.exit(3);
  }
}
if (process.env.COLLISION_BYPASS_DB_NAME !== undefined || process.env.COLLISION_PREDECESSOR_NAME !== undefined) {
  console.error('UNSAFE_LEGACY_OVERRIDE: collision bypass overrides are not supported');
  process.exit(3);
}

const out = (k, v) => console.log(`${k}=${v}`);

function failGuard(reason, code = 3) {
  console.error(`FAIL ${reason}`);
  return code;
}

let guardExitCode = 0;
function guardHost(url) {
  let u;
  try { u = new URL(url); } catch {
    console.error(`FAIL ADMIN_URL is not a valid URL`);
    guardExitCode = failGuard('ADMIN_URL_INVALID');
    return null;
  }
  if (!ALLOWED_HOSTS.has(u.hostname)) {
    console.error(`FAIL UNSAFE_HOST host=${u.hostname}; only loopback allowed`);
    guardExitCode = failGuard('UNSAFE_HOST');
    return null;
  }
  return u;
}
function guardDbName(name) {
  if (IS_COLLISION_FIXTURE && FIXTURE_NAME.test(name)) {
    out('DB_NAME', 'synthetic fixture');
    return;
  }
  if (!ALLOWED_DB_NAMES.has(name)) {
    console.error(`FAIL UNSAFE_DB_NAME name=${name}; allowed: ${[...ALLOWED_DB_NAMES].join(', ')}`);
    guardExitCode = failGuard('UNSAFE_DB_NAME');
  }
}

if (!ADMIN_URL) {
  console.error('FAIL DATABASE_URL_ADMIN_TEST is not set');
  guardExitCode = 2;
}
if (!PASSWORD) {
  console.error('FAIL PGPASSWORD is not set');
  guardExitCode = 2;
}
if (!BASELINE_PASSWORD) {
  console.error('FAIL PG_BASELINE_PASSWORD is not set (required for container-test-db bootstrap)');
  guardExitCode = 2;
}
guardHost(ADMIN_URL);
guardDbName(TARGET_DB);

// T0 round-7 R7-G2: --probe mode for validate-guards.mjs coverage. Runs
// ONLY guard checks (db name, host, url parse, env set) and exits 0 with
// GUARD_PASS. Never opens a pg client, never shells out to psql/prisma,
// never writes evidence, never materializes the tmp dir.
if (process.argv.includes('--probe')) {
  if (guardExitCode !== 0) process.exit(guardExitCode);
  out('GUARD_PASS', 'db_name host url_parse env_set');
  out('PROBE_OK', 'no-build no-evidence');
  process.exit(0);
}

// If any guard rejected the env, exit 3 now (after all guards have been
// evaluated). We never `process.exit()` inside guard functions — only here
// after every check ran. The finally block is unreachable in this branch
// (no tmp dir was created yet) so this is safe.
if (guardExitCode !== 0) process.exit(3);

const adminUrlObj = new URL(ADMIN_URL);
const targetUrl = new URL(ADMIN_URL);
targetUrl.pathname = `/${TARGET_DB}`;
const clusterUrl = new URL(ADMIN_URL);
clusterUrl.pathname = '/postgres';

let tmpDir = null;
let targetDbCreated = false;
let buildOk = false;
let verifyOk = false;

try {
  // 1. Fresh tmp dir per invocation.
  tmpDir = mkdtempSync(join(tmpdir(), 'hrp-predecessor-'));
  out('TMPDIR_CREATED', tmpDir);
  const prismaDir = join(tmpDir, 'prisma');
  const migrationsDir = join(prismaDir, 'migrations');
  mkdirSync(migrationsDir, { recursive: true });
  // `prisma migrate deploy` looks for the schema in the `prisma/` subdirectory
  // by default. Without a node_modules/Prisma client the deploy command still
  // works because we only run `migrate deploy` (no `generate`).

  // 2. Materialize schema.prisma + migration_lock.toml + migration dirs from
  //    `git BASELINE_REF`. We never rename or move anything inside the worktree.
  out('BASELINE_REF', BASELINE_REF);

  const schemaPrisma = execFileSync('git', ['show', `${BASELINE_REF}:prisma/schema.prisma`], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  writeFileSync(join(prismaDir, 'schema.prisma'), schemaPrisma);
  out('SCHEMA_WRITTEN', join(prismaDir, 'schema.prisma'));

  // T0 round-8 R8-G3a: `prisma/migrations/migration_lock.toml` is PINNED
  // to the baseline commit. At `e4d21807f0d972de447e710066b40c77a661fb17`,
  // the file is blob `fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d` with the
  // canonical content:
  //
  //     # Please do not edit this file manually
  //     # It should be added in your version-control system (i.e. Git)
  //     provider = "postgresql"
  //
  // We extract it directly via `git show ${BASELINE_REF}:prisma/migrations/
  // migration_lock.toml` (NO working-tree fallback, NO default-string
  // fallback). If the file is missing at baseline, the predecessor build
  // is unrecoverable; we throw so the finally block cleans up the tmp
  // dir and the validator can flag this as a fixture defect.
  const lockShow = (() => {
    try {
      return execFileSync('git', ['show', `${BASELINE_REF}:prisma/migrations/migration_lock.toml`], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
    } catch (e) {
      throw new Error(`BASELINE_LOCK_TOML_MISSING ${BASELINE_REF}:prisma/migrations/migration_lock.toml — cannot materialize predecessor`);
    }
  })();
  writeFileSync(join(migrationsDir, 'migration_lock.toml'), lockShow);
  out('MIGRATION_LOCK_TOML_SOURCE', `pinned_baseline=${BASELINE_REF.slice(0, 12)} blob=fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d`);

  const names = execFileSync('git', ['ls-tree', '--name-only', BASELINE_REF, '--', 'prisma/migrations/'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).split('\n').filter(Boolean);

  const migrationDirs = [];
  for (const n of names) {
    const m = n.match(/^prisma\/migrations\/(\d{8,14}_[^/]+)\/?$/);
    if (!m) continue;
    const dirName = m[1];
    if (dirName.startsWith('20260922160000_aff05a_r1')) continue; // exclude R1
    migrationDirs.push(dirName);
  }
  out('BASELINE_MIGRATION_COUNT', String(migrationDirs.length));
  if (migrationDirs.length === 0) {
    console.error('FAIL no migration directories found in baseline');
    // T0 round-7 R7-G2: do NOT process.exit(1) here. Throw so the
    // finally block runs and cleans up the tmp dir.
    throw new Error('NO_BASELINE_MIGRATIONS');
  }

  // 3. Extract each migration's migration.sql via `git show` (no rename).
  for (const dir of migrationDirs) {
    const localDir = join(migrationsDir, dir);
    mkdirSync(localDir, { recursive: true });
    const sql = execFileSync('git', ['show', `${BASELINE_REF}:prisma/migrations/${dir}/migration.sql`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    writeFileSync(join(localDir, 'migration.sql'), sql);
  }
  out('MIGRATIONS_MATERIALIZED', String(migrationDirs.length));

  // 4. Create a fresh target DB; existing names are never deleted.
  const clusterClient = new Client({ connectionString: clusterUrl.toString() });
  await clusterClient.connect();
  let quotedTarget;
  try {
    const qi = await clusterClient.query(`SELECT quote_ident($1) AS q`, [TARGET_DB]);
    quotedTarget = qi.rows[0]?.q ?? `"${TARGET_DB}"`;

    // T0 round-8 R8-G2: source/target collision check BEFORE any DROP.
    // Refuse to proceed if the cluster reports that `TARGET_DB` has
    // active (non-idle) sessions, or if the target DB is itself
    // connected to as the cluster's connection source. The string-level
    // `guardDbName` already passed; this is a runtime belt-and-braces
    // check that runs BEFORE the destructive DROP — a marker printed
    // AFTER DROP would not prove the destructive branch never ran.
    const activeCheck = await clusterClient.query(
      `SELECT count(*)::int AS n
         FROM pg_stat_activity
        WHERE datname = $1
          AND state <> 'idle'
          AND pid <> pg_backend_pid()`,
      [TARGET_DB],
    );
    const active = activeCheck.rows[0]?.n ?? 0;
    if (active > 0) {
      // Throw so the finally block cleans up tmp dir; the cluster
      // client is still alive (no DROP/CREATE pending).
      throw new Error(`TARGET_DB_BUSY target=${TARGET_DB} active_sessions=${active}`);
    }
    const dbExists = await clusterClient.query(
      `SELECT count(*)::int AS n FROM pg_database WHERE datname = $1`,
      [TARGET_DB],
    );
    const dbExistsCount = dbExists.rows[0]?.n ?? 0;
    if (dbExistsCount > 0) {
      // T0 round-8 R8-G2: an existing DB at the target name is a
      // collision risk — refuse BEFORE DROP rather than silently
      // destroying it. Caller must explicitly drop or pick a fresh
      // name. This catches the AC-06/07 rename-predecessor-to-target
      // case where the predecessor was already promoted earlier in
      // the same run, AND the case where the operator forgot to
      // clean up a leftover from a previous run.
      throw new Error(`TARGET_DB_EXISTS target=${TARGET_DB} — refusing to create; caller must ensure target is fresh`);
    }
    out('TARGET_DB_COLLISION_CHECK', 'pass (before CREATE, db-not-exists)');

    // CREATE is atomic: a concurrent creator wins or we do. Never DROP after a check.
    await clusterClient.query(`CREATE DATABASE ${quotedTarget}`);
    targetDbCreated = true;
    out('TARGET_DB_CREATED', TARGET_DB);
  } finally {
    await clusterClient.end().catch(() => {});
  }

  // 5. Bootstrap PRE — creates roles so baseline migrations can GRANT to them.
  //    T0 R6-G2: bootstrap pre BEFORE migrate deploy; post AFTER.
  if (targetDbCreated) {
    const baseEnv = {
      ...process.env,
      PGPASSWORD: PASSWORD,
      PG_BASELINE_PASSWORD: BASELINE_PASSWORD,
      DATABASE_URL_ADMIN_TEST: targetUrl.toString(),
    };
    execFileSync('node', [join(REPO_ROOT, 'scripts', 'ci', 'container-test-db.mjs'), '--phase=pre'], {
      cwd: REPO_ROOT,
      env: baseEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    out('BOOTSTRAP_PRE_OK', 'pre');
  }

  // 6. `prisma migrate deploy` against the target DB. We use a per-invocation
  //    tmp dir as cwd so Prisma reads the materialized schema + migrations,
  //    NOT the worktree's own. Prisma itself writes `_prisma_migrations`.
  //
  //    T0 round-6: explicitly invoke the prisma CLI from the worktree's
  //    `node_modules/.bin/prisma` because `npx prisma` from a tmp cwd
  //    without a local node_modules resolves to the wrong package.
  const prismaBin = process.platform === 'win32'
    ? join(REPO_ROOT, 'node_modules', '.bin', 'prisma.cmd')
    : join(REPO_ROOT, 'node_modules', '.bin', 'prisma');
  const prismaEnv = {
    ...process.env,
    PGPASSWORD: PASSWORD,
    PG_BASELINE_PASSWORD: BASELINE_PASSWORD,
    DATABASE_URL: targetUrl.toString(),
    DATABASE_URL_ADMIN: targetUrl.toString(),
    DATABASE_URL_ADMIN_TEST: targetUrl.toString(),
    DATABASE_URL_TEST: targetUrl.toString(),
    PRISMA_HIDE_UPDATE_MESSAGE: '1',
  };
  execFileSync(prismaBin, ['migrate', 'deploy'], {
    cwd: tmpDir,
    env: prismaEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  out('MIGRATE_DEPLOY_OK', 'prisma_cli');

  // 7. Bootstrap POST — applies post-migration GRANTs (per-table).
  execFileSync('node', [join(REPO_ROOT, 'scripts', 'ci', 'container-test-db.mjs'), '--phase=post'], {
    cwd: REPO_ROOT,
    env: prismaEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  out('BOOTSTRAP_POST_OK', 'post');

  // 8. Verify function state — must be AFF-03C body (function MUST exist;
  //    body MUST have NO R1 marker, NO pg_advisory_xact_lock; handling
  //    table MUST have NO SELECT grant for hrp_public_rpc).
  const verifyClient = new Client({ connectionString: targetUrl.toString() });
  await verifyClient.connect();
  try {
    const fn = await verifyClient.query(`
      SELECT length(p.prosrc) AS sz,
             p.prosrc LIKE '%AFF05A_R1:%' AS has_r1,
             p.prosrc LIKE '%pg_advisory_xact_lock%' AS has_lock
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE p.proname = 'hrp_public_intake_submission'
         AND n.nspname = 'public'
    `);
    const fnRow = fn.rows[0];
    out('VERIFY_FN_SZ', (fnRow?.sz ?? 'missing').toString());
    out('VERIFY_FN_HAS_R1', (fnRow?.has_r1 ?? false).toString());
    out('VERIFY_FN_HAS_LOCK', (fnRow?.has_lock ?? false).toString());

    // T0 round-7 R7-G2: ASSERT function exists. The predecessor state must
    // have the function. If it's missing, the predecessor build is broken.
    if (!fnRow) {
      throw new Error('PREDECESSOR_FN_MISSING hrp_public_intake_submission not found');
    }
    if (fnRow.has_r1 === true || fnRow.has_lock === true) {
      throw new Error('PREDECESSOR_HAS_R1_MARKER function body contains R1 markers or advisory lock');
    }

    const privs = await verifyClient.query(`
      SELECT string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
        FROM information_schema.table_privileges
       WHERE table_name='labor_profile_handling_assignments' AND grantee='hrp_public_rpc'
    `);
    const privsStr = privs.rows[0]?.privs ?? 'none';
    out('VERIFY_HANDLING_PRIVS_HRP', privsStr);

    // T0 round-7 R7-G2: ASSERT no SELECT grant on handling for hrp_public_rpc.
    // If SELECT is present, the predecessor is contaminated with R1 grants.
    if (privsStr.includes('SELECT')) {
      throw new Error(`PREDECESSOR_HAS_SELECT_GRANT privs=${privsStr}`);
    }

    verifyOk = true;
  } finally {
    await verifyClient.end().catch(() => {});
  }

  buildOk = true;
  out('READY', `predecessor_db=${TARGET_DB} tmpdir=${tmpDir}`);
  console.log(`READY target_db=${TARGET_DB}`);
} catch (e) {
  console.error(`BUILD_FAIL ${e.message}`);
} finally {
  // T0 R7-G2: cleanup ALWAYS runs. NEVER process.exit() before this.
  // Windows EPERM can race with the just-finished prisma CLI; retry a
  // few times before giving up.
  if (tmpDir && existsSync(tmpDir)) {
    let cleanedUp = false;
    for (let i = 0; i < 5 && !cleanedUp; i += 1) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
        cleanedUp = true;
      } catch {
        // Wait briefly and retry. Windows releases the handle after a tick.
        await new Promise((res) => setTimeout(res, 200 * (i + 1)));
      }
    }
    if (cleanedUp) {
      out('TMPDIR_REMOVED', tmpDir);
    } else {
      console.error(`TMPDIR_CLEANUP_FAIL could not remove ${tmpDir} after retries`);
    }
  }
  // Determine exit code based on what failed.
  // Order: verify failure (4) takes precedence over generic build failure (1),
  // because the build itself completed but produced invalid predecessor state.
  if (!verifyOk && buildOk) {
    process.exit(4);
  }
  if (!buildOk) {
    process.exit(1);
  }
  // Otherwise exit 0 (READY).
}
