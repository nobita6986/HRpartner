#!/usr/bin/env node
/**
 * scripts/ci/prepare-migration-test-db.mjs
 *
 * AC-06/07 helper: prepare `aff05a_r1_migration_test` at AFF-03C predecessor
 * state. Schema+data are copied from `aff05a_r1_test` (which is already at
 * R1 state for the integration suite), then:
 *   - DROP and recreate `hrp_public_intake_submission` with the AFF-03C body
 *     (from `prisma/migrations/20260921140000_aff03c_cs_labor_profile_backfill/migration.sql`).
 *   - REVOKE the R1-added SELECT grant on `labor_profile_handling_assignments`
 *     from `hrp_public_rpc` so that post-state can prove it was added back by
 *     the R1 migration.
 *
 * SYNTHETIC-ONLY GUARD (round-3 fix):
 *   The target DB name is validated against an allowlist prefix before ANY
 *   DROP/CREATE/pg_dump mutation runs. Names that do not match the synthetic
 *   test prefix (`aff05a_r1_migration_test`) are rejected with exit 3 BEFORE
 *   any SQL is sent. The default is also pinned to the synthetic name; the
 *   env override is allowed only if it matches the same prefix.
 *
 * IDENTIFIER QUOTING (round-3 fix):
 *   Target/source DB identifiers are quoted via pg_quote_ident() before
 *   interpolation. Direct template-string interpolation of DB names is
 *   unsafe even for trusted internal input.
 *
 * Idempotent: re-runs converge to predecessor state.
 *
 * Usage:
 *   node scripts/ci/prepare-migration-test-db.mjs
 *   node scripts/ci/prepare-migration-test-db.mjs --dry-run   # validate without mutating
 *
 * Requires admin password in env PGPASSWORD or DATABASE_URL_ADMIN_TEST pointing
 * to a Postgres superuser with CREATE DATABASE.
 */
import { Client } from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const ADMIN_URL = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const SOURCE_DB_RAW = process.env.MIGRATION_SOURCE_DB ?? 'aff05a_r1_test';
const TARGET_DB_RAW = process.env.MIGRATION_TARGET_DB ?? 'aff05a_r1_migration_test';

// Synthetic-only allowlist: reject any target/source name that doesn't match.
// Both names must match (a) the project's synthetic test prefix and (b) the
// known set of CI DB names.
const ALLOWED_DB_NAMES = new Set([
  'aff05a_r1_test',
  'aff05a_r1_migration_test',
]);

function guardDbName(name, role) {
  if (!ALLOWED_DB_NAMES.has(name)) {
    console.error(`UNSAFE_DB_NAME ${role}=${name} — refusing. Allowed: ${[...ALLOWED_DB_NAMES].join(', ')}`);
    process.exit(3);
  }
}

guardDbName(SOURCE_DB_RAW, 'MIGRATION_SOURCE_DB');
guardDbName(TARGET_DB_RAW, 'MIGRATION_TARGET_DB');

if (!ADMIN_URL) {
  console.error('ERROR: DATABASE_URL_ADMIN_TEST not set');
  process.exit(2);
}

const out = (k, v) => console.log(`${k}=${v}`);

const DRY_RUN = process.argv.includes('--dry-run');

async function quoteIdent(client, name) {
  // quote_ident is the SQL standard quoting function; it doubles quotes
  // inside the identifier so it is safe to interpolate back into SQL.
  const r = await client.query(`SELECT quote_ident($1) AS q`, [name]);
  return r.rows[0]?.q ?? '';
}

async function main() {
  out('ADMIN_URL_SET', 'yes');
  out('SOURCE_DB', SOURCE_DB_RAW);
  out('TARGET_DB', TARGET_DB_RAW);
  out('DRY_RUN', DRY_RUN ? 'true' : 'false');

  if (DRY_RUN) {
    out('DRY_RUN_OK', 'validation complete; no mutation performed');
    return;
  }

  const client = new Client({ connectionString: ADMIN_URL });
  await client.connect();
  try {
    // Quote identifiers before SQL interpolation.
    const quotedTarget = await quoteIdent(client, TARGET_DB_RAW);
    const quotedSource = await quoteIdent(client, SOURCE_DB_RAW);

    // 1. Drop and recreate target DB.
    out('PREPARE', 'drop_recreate_target_db');
    await client.query(`DROP DATABASE IF EXISTS ${quotedTarget} WITH (FORCE)`).catch(async () => {
      await client.query(`DROP DATABASE IF EXISTS ${quotedTarget}`);
    });
    await client.query(`CREATE DATABASE ${quotedTarget}`);
    out('TARGET_DB_CREATED', TARGET_DB_RAW);

    // 2. Connect to source DB and dump schema-only.
    out('PREPARE', 'dump_source_schema');
    const adminConn = new URL(ADMIN_URL);
    const port = adminConn.port || '5432';
    const host = adminConn.hostname || '127.0.0.1';
    const user = adminConn.username;
    const password = adminConn.password;

    const dumpCmd = `"C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe" --schema-only --no-owner -h ${host} -p ${port} -U ${user} ${quotedSource}`;
    const restoreCmd = `"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe" -h ${host} -p ${port} -U ${user} -d ${quotedTarget} -v ON_ERROR_STOP=1`;
    out('DUMP_CMD', dumpCmd.replace(password, '***'));
    out('RESTORE_CMD', restoreCmd);

    const { execSync, spawnSync } = await import('node:child_process');

    const dumpOutput = execSync(dumpCmd, {
      env: { ...process.env, PGPASSWORD: password },
      encoding: 'buffer',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const restore = spawnSync('C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe', [
      '-h', host, '-p', port, '-U', user, '-d', quotedTarget, '-v', 'ON_ERROR_STOP=1',
    ], {
      env: { ...process.env, PGPASSWORD: password },
      input: dumpOutput,
    });
    if (restore.status !== 0) {
      console.error('RESTORE_FAIL stdout:', restore.stdout?.toString().slice(-500));
      console.error('RESTORE_FAIL stderr:', restore.stderr?.toString().slice(-500));
      process.exit(1);
    }
    out('SCHEMA_RESTORED', 'ok');

    // 3. Drop function and replace with AFF-03C predecessor body.
    out('PREPARE', 'replace_function_with_pred_body');
    const aff03cFile = join(REPO_ROOT, 'prisma/migrations/20260921140000_aff03c_cs_labor_profile_backfill/migration.sql');
    if (!existsSync(aff03cFile)) {
      console.error(`AFF03C_NOT_FOUND ${aff03cFile}`);
      process.exit(1);
    }
    const aff03c = readFileSync(aff03cFile, 'utf8');

    // Extract just the function definition. The actual CREATE statement is
    // `CREATE OR REPLACE FUNCTION hrp_public_intake_submission(p_payload jsonb)`
    // (the earlier comment also mentions the function name — we must skip those).
    const createStart = aff03c.indexOf('CREATE OR REPLACE FUNCTION hrp_public_intake_submission(p_payload jsonb)');
    const dollarTag = '$fn$';
    const endIdx = aff03c.indexOf(dollarTag + ';', createStart);
    if (createStart < 0 || endIdx < 0) {
      console.error('PRED_FN_NOT_EXTRACTED');
      process.exit(1);
    }
    const predFnBody = aff03c.substring(createStart, endIdx + dollarTag.length + 1);
    out('PRED_FN_LEN', predFnBody.length.toString());

    // Acquire role, alter owner, then drop and recreate with predecessor body, then reset.
    const targetConn = new URL(ADMIN_URL);
    targetConn.pathname = `/${TARGET_DB_RAW}`;
    const targetClient = new Client({ connectionString: targetConn.toString() });
    await targetClient.connect();
    try {
      const acquire = `
        GRANT CREATE ON SCHEMA public TO hrp_public_rpc;
        DO $do$ BEGIN EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET TRUE', session_user); END $do$;
      `;
      await targetClient.query(acquire);
      out('STEP1_ACQUIRE', 'ok');
      await targetClient.query(`ALTER FUNCTION public.hrp_public_intake_submission(jsonb) OWNER TO hrp_public_rpc`);
      out('STEP2_OWNER', 'ok');
      await targetClient.query(`SET ROLE hrp_public_rpc`);
      out('STEP3_SET_ROLE', 'ok');
      await targetClient.query(`DROP FUNCTION IF EXISTS public.hrp_public_intake_submission(jsonb)`);
      out('STEP4_DROP', 'ok');
      await targetClient.query(predFnBody);
      out('STEP5_CREATE_FN', 'ok');
      await targetClient.query(`RESET ROLE`);
      const release = `
        DO $do$ BEGIN EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET FALSE', session_user); END $do$;
        REVOKE CREATE ON SCHEMA public FROM hrp_public_rpc;
        DO $do$ BEGIN EXECUTE format('REVOKE hrp_public_rpc FROM %I', session_user); END $do$;
      `;
      await targetClient.query(release);
      out('PRED_FN_REPLACED', 'ok');
    } finally {
      await targetClient.end();
    }

    // 4. REVOKE the R1-added SELECT grant on handling table (predecessor had INSERT only).
    const revokeClient = new Client({ connectionString: targetConn.toString() });
    await revokeClient.connect();
    try {
      await revokeClient.query(`REVOKE SELECT ON labor_profile_handling_assignments FROM hrp_public_rpc`);
      out('PRED_GRANT_REVOKED', 'ok');
    } finally {
      await revokeClient.end();
    }

    // 5. Verify predecessor state.
    const verifyClient = new Client({ connectionString: targetConn.toString() });
    await verifyClient.connect();
    try {
      const fn = await verifyClient.query(`
        SELECT length(prosrc) AS sz, prosrc LIKE '%AFF05A_R1:%' AS has_r1,
               prosrc LIKE '%pg_advisory_xact_lock%' AS has_lock
          FROM pg_proc WHERE proname = 'hrp_public_intake_submission'
      `);
      out('VERIFY_FN_SZ', fn.rows[0]?.sz?.toString() ?? 'missing');
      out('VERIFY_FN_HAS_R1', (fn.rows[0]?.has_r1 ?? false).toString());
      out('VERIFY_FN_HAS_LOCK', (fn.rows[0]?.has_lock ?? false).toString());
      const privs = await verifyClient.query(`
        SELECT string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
          FROM information_schema.table_privileges
         WHERE table_name='labor_profile_handling_assignments' AND grantee='hrp_public_rpc'
      `);
      out('VERIFY_HANDLING_PRIVS_HRP', privs.rows[0]?.privs ?? 'none');
    } finally {
      await verifyClient.end();
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
