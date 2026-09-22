#!/usr/bin/env node
/**
 * scripts/ci/apply-r1-migration.mjs
 *
 * AC-06/07 helper: apply the R1 migration file as a single transactional unit
 * on a target DB (default `aff05a_r1_migration_test`). The migration runs
 * through `psql -1` (single transaction). Caller controls whether to commit
 * (default) or expect a rollback (via AC-07 anomaly seeding first).
 *
 * Exit codes:
 *   0  migration applied successfully.
 *   1  migration failed (transaction rolled back). Use this for AC-07.
 *
 * Usage:
 *   node scripts/ci/apply-r1-migration.mjs                # apply normally
 *   node scripts/ci/apply-r1-migration.mjs --dry-run      # psql -1 dry run
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const TARGET_DB = process.env.MIGRATION_TARGET_DB ?? 'aff05a_r1_migration_test';
const ADMIN_URL = process.env.DATABASE_URL_ADMIN_TEST ?? '';

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

const migrationFile = join(
  REPO_ROOT,
  'prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql'
);
if (!existsSync(migrationFile)) {
  console.error(`MIGRATION_NOT_FOUND ${migrationFile}`);
  process.exit(1);
}

out('TARGET_DB', TARGET_DB);
out('MIGRATION_FILE', migrationFile);

// psql -1 wraps the entire file in a single transaction.
const args = [
  '-h', host,
  '-p', port,
  '-U', user,
  '-d', TARGET_DB,
  '-1',                       // single transaction
  '-v', 'ON_ERROR_STOP=1',    // fail fast
  '-f', migrationFile,
];

const dryRun = process.argv.includes('--dry-run');
if (dryRun) {
  out('DRY_RUN', 'true');
  args.push('--echo-queries');
}

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
  out('MIGRATION_OK', 'true');
  process.stdout.write(stdout);
  process.exit(0);
} catch (e) {
  out('MIGRATION_FAILED', 'true');
  out('EXIT_CODE', (e.status ?? '?').toString());
  if (e.stdout) process.stdout.write(e.stdout);
  if (e.stderr) process.stderr.write(e.stderr);
  process.exit(1);
}
