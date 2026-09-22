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
 * Idempotent: re-runs converge to predecessor state.
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
const SOURCE_DB = process.env.MIGRATION_SOURCE_DB ?? 'aff05a_r1_test';
const TARGET_DB = process.env.MIGRATION_TARGET_DB ?? 'aff05a_r1_migration_test';

if (!ADMIN_URL) {
  console.error('ERROR: DATABASE_URL_ADMIN_TEST not set');
  process.exit(2);
}

const out = (k, v) => console.log(`${k}=${v}`);

async function main() {
  const client = new Client({ connectionString: ADMIN_URL });
  await client.connect();
  try {
    // 1. Drop and recreate target DB.
    out('PREPARE', 'drop_recreate_target_db');
    await client.query(`DROP DATABASE IF EXISTS ${TARGET_DB} WITH (FORCE)`).catch(async () => {
      await client.query(`DROP DATABASE IF EXISTS ${TARGET_DB}`);
    });
    await client.query(`CREATE DATABASE ${TARGET_DB}`);
    out('TARGET_DB_CREATED', TARGET_DB);

    // 2. Connect to source DB and dump schema-only.
    out('PREPARE', 'dump_source_schema');
    const { execSync } = await import('node:child_process');
    const adminConn = new URL(ADMIN_URL);
    const port = adminConn.port || '5432';
    const host = adminConn.hostname || '127.0.0.1';
    const user = adminConn.username;
    const password = adminConn.password;
    const targetConn = new URL(ADMIN_URL);
    targetConn.pathname = `/${TARGET_DB}`;

    const dumpCmd = `"C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe" --schema-only --no-owner -h ${host} -p ${port} -U ${user} ${SOURCE_DB}`;
    const restoreCmd = `"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe" -h ${host} -p ${port} -U ${user} -d ${TARGET_DB} -v ON_ERROR_STOP=1`;
    out('DUMP_CMD', dumpCmd.replace(password, '***'));
    out('RESTORE_CMD', restoreCmd);

    const dumpOutput = execSync(dumpCmd, {
      env: { ...process.env, PGPASSWORD: password },
      encoding: 'buffer',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const { spawnSync } = await import('node:child_process');
    const restore = spawnSync('C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe', [
      '-h', host, '-p', port, '-U', user, '-d', TARGET_DB, '-v', 'ON_ERROR_STOP=1',
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
    const targetClient = new Client({ connectionString: targetConn.toString() });
    await targetClient.connect();
    try {
      // Use a single transaction with raw psql-style script via a single query
      // so that DO blocks with format() strings containing GRANT/REVOKE
      // keywords don't confuse the simple-query protocol parser.
      const acquire = `
        GRANT CREATE ON SCHEMA public TO hrp_public_rpc;
        DO $do$ BEGIN EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET TRUE', session_user); END $do$;
      `;
      await targetClient.query(acquire);
      out('STEP1_ACQUIRE', 'ok');
      // Transfer ownership of existing function to hrp_public_rpc.
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
    console.log(`READY target_db=${TARGET_DB}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(`FATAL ${e.message}`);
  process.exit(1);
});
