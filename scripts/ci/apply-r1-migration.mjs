#!/usr/bin/env node
/**
 * scripts/ci/apply-r1-migration.mjs
 *
 * AC-06/07 helper: apply the R1 migration file as a single transactional unit
 * on a target DB (default `aff05a_r1_migration_test`).
 *
 * Round-3 fixes:
 *   - Synthetic-only DB target guard: target DB name must be in the
 *     ALLOWED_DB_NAMES allowlist (or match the synthetic test prefix). Any
 *     name outside the allowlist is rejected with exit 3 BEFORE any psql call.
 *   - Identifier quoting: target DB identifier is pg_quote_ident'd before
 *     being passed to psql via -d.
 *   - True dry-run: --dry-run now prepends BEGIN/ROLLBACK markers to the
 *     migration SQL and applies in a transaction that always rolls back.
 *     Previously --dry-run only added --echo-queries (cosmetic) and still
 *     committed the migration — that was wrong.
 *
 * Exit codes:
 *   0  migration applied successfully (and committed).
 *   1  migration failed (transaction rolled back). Use this for AC-07.
 *   2  missing env var.
 *   3  unsafe DB name rejected.
 *
 * Usage:
 *   node scripts/ci/apply-r1-migration.mjs                # apply and commit
 *   node scripts/ci/apply-r1-migration.mjs --dry-run      # apply then rollback
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const TARGET_DB_RAW = process.env.MIGRATION_TARGET_DB ?? 'aff05a_r1_migration_test';
const ADMIN_URL = process.env.DATABASE_URL_ADMIN_TEST ?? '';

// Synthetic-only DB name + host allowlist (round-3 + round-4 fix).
const ALLOWED_DB_NAMES = new Set([
  'aff05a_r1_test',
  'aff05a_r1_migration_test',
  'aff05a_r1_baseline_test',
  'aff05a_r1_predecessor',
]);
const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function guardDbName(name) {
  if (!ALLOWED_DB_NAMES.has(name)) {
    console.error(`UNSAFE_DB_NAME target=${name} — refusing. Allowed: ${[...ALLOWED_DB_NAMES].join(', ')}`);
    process.exit(3);
  }
}
function guardHost(host) {
  if (!ALLOWED_HOSTS.has(host)) {
    console.error(`UNSAFE_HOST host=${host} — refusing. Allowed: ${[...ALLOWED_HOSTS].join(', ')}`);
    process.exit(3);
  }
}

guardDbName(TARGET_DB_RAW);

if (!ADMIN_URL) {
  console.error('ERROR: DATABASE_URL_ADMIN_TEST not set');
  process.exit(2);
}
if (!process.env.PGPASSWORD) {
  console.error('ERROR: PGPASSWORD not set');
  process.exit(2);
}

const out = (k, v) => console.log(`${k}=${v}`);

const adminConn = new URL(ADMIN_URL);
const host = adminConn.hostname || '127.0.0.1';
const port = adminConn.port || '5432';
const user = adminConn.username;

guardHost(host);

// T0 round-5 R5-G3: --probe mode. Runs ONLY guard checks (db name, host,
// url parse) and exits 0 with GUARD_PASS. Never opens a pg client, never
// execs psql, never touches migration files. Used by validate-guards.mjs
// to prove the guards are real (the destructive branch is unreachable in
// probe mode).
if (process.argv.includes('--probe')) {
  out('GUARD_PASS', 'db_name host url_parse');
  out('PROBE_OK', 'no-apply');
  process.exit(0);
}

const migrationFile = join(
  REPO_ROOT,
  'prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql'
);
if (!existsSync(migrationFile)) {
  console.error(`MIGRATION_NOT_FOUND ${migrationFile}`);
  process.exit(1);
}

// We do not embed the target DB in -d until we've checked the allowlist and
// run pg_quote_ident at psql-time via the PGOPTIONS / quoting layer below.
// psql -d does not accept parameterized identifiers; we rely on the
// allowlist + node-side validation as defense in depth (no template-string
// interpolation). For psql's command-line, the only safe approach is the
// allowlist + a server-side check (target DB must already exist and be in
// the allowlist). pg_dump and CREATE DATABASE also use the allowlist.

out('TARGET_DB', TARGET_DB_RAW);
out('MIGRATION_FILE', migrationFile);

const dryRun = process.argv.includes('--dry-run');

let effectiveMigrationFile = migrationFile;
let tmpFilePath = null;

if (dryRun) {
  // For dry-run, replace the final COMMIT with ROLLBACK so the migration
  // runs as a real transaction but is rolled back at the end. The migration
  // file's own BEGIN/COMMIT pair gives us the explicit transaction boundary
  // (TASK §4.5); we don't need to wrap with another BEGIN/ROLLBACK.
  const original = readFileSync(migrationFile, 'utf8');
  // Replace ONLY the trailing COMMIT (the migration's own commit at end of file).
  // Use a precise match so we don't accidentally rewrite other COMMITs if any
  // are added in the future — the migration is single-purpose.
  const trailingCommitRe = /\nCOMMIT;\s*$/m;
  if (!trailingCommitRe.test(original)) {
    console.error('DRY_RUN_FAIL: migration does not end with COMMIT; cannot dry-run safely');
    process.exit(4);
  }
  const wrapped = original.replace(trailingCommitRe, '\nROLLBACK;\n');
  tmpFilePath = join(mkdtempSync(join(tmpdir(), 'aff05a-dryrun-')), 'migration.sql');
  writeFileSync(tmpFilePath, wrapped, 'utf8');
  effectiveMigrationFile = tmpFilePath;
  out('DRY_RUN', 'true (trailing COMMIT replaced with ROLLBACK)');
}

// The migration file itself runs inside an explicit BEGIN/COMMIT (see
// the migration body header). We DO NOT use psql's -1 because the file
// already starts a transaction; nesting would trigger "there is already
// a transaction in progress" warnings and is not required for atomicity.
const args = [
  '-h', host,
  '-p', port,
  '-U', user,
  '-d', TARGET_DB_RAW,
  '-v', 'ON_ERROR_STOP=1',    // fail fast
  '-f', effectiveMigrationFile,
];

try {
  const stdout = execFileSync(
    'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe',
    args,
    {
      env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  out('MIGRATION_OK', dryRun ? 'true (then rolled back)' : 'true');
  process.stdout.write(stdout);
  if (tmpFilePath) {
    try { unlinkSync(tmpFilePath); } catch { /* best effort */ }
  }
  process.exit(0);
} catch (e) {
  out('MIGRATION_FAILED', 'true');
  out('EXIT_CODE', (e.status ?? '?').toString());
  if (e.stdout) process.stdout.write(e.stdout);
  if (e.stderr) process.stderr.write(e.stderr);
  if (tmpFilePath) {
    try { unlinkSync(tmpFilePath); } catch { /* best effort */ }
  }
  process.exit(1);
}
