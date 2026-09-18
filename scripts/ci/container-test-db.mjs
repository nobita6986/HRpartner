#!/usr/bin/env node
/**
 * scripts/ci/container-test-db.mjs — Container-DB bootstrap for CI Integration lane (RQ-03, RQ-11).
 *
 * Goal: when GitHub Actions spins up a fresh `postgres:16-alpine` service container,
 *       every Integration run gets a clean database — yet with **the exact same RLS/role
 *       posture** as the baseline Neon dedicated test DB. This script is the equivalent
 *       of running (a) `scripts/create-public-rpc-role.cjs`, (b) `scripts/create-db-roles.cjs`,
 *       (c) `scripts/run-bootstrap-roles.mjs`, (d) `prisma/grants-hrp-m12.1.1.sql` —
 *       folded into ONE idempotent setup that runs as part of the Integration job.
 *
 * Why a single script (vs chaining 4 one-shots)?
 *   1. The 4 one-shots depend on each other. Stitching them in YAML adds noise and ordering risk.
 *   2. run-bootstrap-roles.mjs reads PIPE_ROLE_*_PASSWORD from .env (Neon dev secret names)
 *      — those env vars are silent absent in CI. We'd have to port Neon's seeding logic anyway.
 *   3. Auditors want ONE entry point that prints "role_count=N grants_count=M ready=true" — that's
 *      a single line for Tier 3 to grep in logs.
 *
 * Idempotency: every CREATE guards with `IF NOT EXISTS pg_roles.rolname = $1`.
 *   Re-running on an already-bootstrapped container converges cleanly, no error.
 *   ALTER ROLE ... NOLOGIN/NOSUPERUSER/NOBYPASSRLS also converges an existing role.
 *
 * SECURITY:
 *   - Reads ONLY DATABASE_URL_ADMIN_TEST (admin connection to the fresh container).
 *     No secrets printed, only counts.
 *   - Sets role passwords to the same value as the container admin password (POSTGRES_PASSWORD).
 *     This is acceptable because:
 *       (a) the container is ephemeral — destroyed at job end,
 *       (b) nothing inside the container ever dials an external network,
 *       (c) the runtime URL is then forwarded to `app_user_writer` and engine test mutates
 *           the password to an ephemeral UUID for the engine role (see E-14 setup
 *           in tests/db/referral-attribution-foundation.integration.test.ts:30-46).
 *   - No SET ROLE assumption, no broad GRANT, no REVOKE on PUBLIC.
 *
 * EXIT contract:
 *   - exit 0 + `READY role_count=8 grants_count=N` if everything provisioned.
 *   - exit nonzero on first error (fail-closed, Integration step fails, required check red).
 *
 * Usage: node scripts/ci/container-test-db.mjs
 */

import { Client } from 'pg';
import process from 'node:process';

const ADMIN_URL = (process.env.DATABASE_URL_ADMIN_TEST ?? '').trim();
const ADMIN_PASSWORD_FROM_ENV = (process.env.PG_BASELINE_PASSWORD ?? '').trim();

// 9 runtime roles to provision (idempotent). 7 of these come from baseline Neon scripts;
// `app_engine_writer` is created by migration `20260917000000_referral_attribution_foundation`
// so this script does NOT create it — but the bootstrap script enforces the SAME password
// here so engine test E-14 (which mutates password via ALTER ROLE) works.
const ROLES = [
  // 4 NOLOGIN roles — MP-2 public RPC + P1 portals NOLOGIN scope-roles
  { name: 'hrp_public_rpc', login: false, bypassrls: true,  superuser: false, fromBaseline: true  },
  { name: 'worker_user',    login: false, bypassrls: false, superuser: false, fromBaseline: true  },
  { name: 'vendor_user',    login: false, bypassrls: false, superuser: false, fromBaseline: true  },
  { name: 'ctv_user',       login: false, bypassrls: false, superuser: false, fromBaseline: true  },
  { name: 'sale_user',      login: false, bypassrls: false, superuser: false, fromBaseline: true  },
  // 3 LOGIN roles — DEC-09 A separation (M8 era)
  { name: 'app_user_writer', login: true, bypassrls: false, superuser: false, fromBaseline: true  },
  { name: 'app_user',        login: true, bypassrls: false, superuser: false, fromBaseline: true  },
  { name: 'hrp_etl',         login: true, bypassrls: false, superuser: false, fromBaseline: true  },
];

// Grants to apply idempotent (lifted from prisma/grants-hrp-m12.1.1.sql + run-bootstrap-roles.mjs).
// Split into two phases because some migrations (e.g. `20260816210000_s1_rls_worker`)
// GRANT to `app_user_writer` and need that role to exist BEFORE migrations run, while
// the table-level GRANT for `portal_timesheets` (a runtime table created by migration
// `20260816180349_g0_rq09_uniq_portal_timesheets`) needs the table to exist first.
//   - PRE_MIGRATE_GRANTS: schema-level + ALL TABLES (no-op when public is empty) +
//     sequences + DEFAULT PRIVILEGES + USAGE on schema for worker/vendor/ctv/sale.
//   - POST_MIGRATE_GRANTS: per-table GRANTs whose target table is created by a migration.
const PRE_MIGRATE_GRANTS = [
  `GRANT USAGE ON SCHEMA public TO app_user_writer`,
  `GRANT USAGE ON SCHEMA public TO app_user`,
  `GRANT USAGE ON SCHEMA public TO hrp_etl`,
  `GRANT USAGE ON SCHEMA public TO hrp_public_rpc`,
  `GRANT USAGE ON SCHEMA public TO worker_user, vendor_user, ctv_user, sale_user`,
  // All-tables-in-schema + sequences + defaults are safe pre-migration: when the schema
  // is empty, these grant nothing; future tables (created by `prisma migrate deploy`)
  // are auto-covered by ALTER DEFAULT PRIVILEGES.
  `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user_writer`,
  `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user_writer`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user_writer`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user_writer`,
  `GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_user`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_user`,
];

const POST_MIGRATE_GRANTS = [
  // `portal_timesheets` is created by migration `20260816180349_g0_rq09_uniq_portal_timesheets`.
  // Wrapped in DO $$ so re-runs without the table still no-op cleanly (idempotent).
  `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='portal_timesheets') THEN EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE portal_timesheets TO hrp_etl'; END IF; END $$`,
];

const out = (k, v) => console.log(`${k}=${v}`);

async function ensureRole(client, role, baselinePassword) {
  const flags = [
    role.superuser ? 'SUPERUSER' : 'NOSUPERUSER',
    role.bypassrls ? 'BYPASSRLS' : 'NOBYPASSRLS',
    'NOCREATEDB',
    'NOCREATEROLE',
    'NOREPLICATION',
  ];
  const loginClause = role.login ? `LOGIN PASSWORD '${baselinePassword}'` : 'NOLOGIN';

  // Idempotent CREATE
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role.name}') THEN
        CREATE ROLE ${role.name} ${loginClause} ${flags.join(' ')};
      END IF;
    END$$;
  `);
  // Converge existing role to the required shape.
  const flagStr = flags.join(' ');
  if (role.login) {
    await client.query(`ALTER ROLE ${role.name} ${loginClause} ${flagStr}`);
  } else {
    await client.query(`ALTER ROLE ${role.name} NOLOGIN ${flagStr}`);
  }
}

async function waitForReady(client, maxAttempts = 30) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      const r = await client.query('SELECT 1 AS ok');
      if (r.rows[0]?.ok === 1) return;
    } catch (e) {
      // retry
    }
    attempt += 1;
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`database not ready after ${maxAttempts}s`);
}

async function applyGrants(client, statements, phaseLabel) {
  let grantsCount = 0;
  let grantsFailed = 0;
  for (const stmt of statements) {
    try {
      await client.query(stmt);
      grantsCount += 1;
    } catch (e) {
      console.error(`GRANT_ERR phase=${phaseLabel} stmt="${stmt.replace(/\s+/g, ' ').slice(0, 60)}..." message=${e.message}`);
      grantsFailed += 1;
    }
  }
  if (grantsFailed > 0) {
    console.error(`BOOTSTRAP_ERR phase=${phaseLabel} grants_failed=${grantsFailed}/${statements.length}`);
    process.exit(1);
  }
  return grantsCount;
}

async function main() {
  if (!ADMIN_URL) {
    console.error('ERROR: DATABASE_URL_ADMIN_TEST is not set. Container bootstrap aborts (fail-closed).');
    process.exit(2);
  }
  if (!ADMIN_PASSWORD_FROM_ENV) {
    console.error('ERROR: PG_BASELINE_PASSWORD is not set. Container bootstrap aborts (fail-closed).');
    process.exit(2);
  }

  // Phase argument selects which GRANT set to apply:
  //   --phase=pre  → roles + PRE_MIGRATE_GRANTS (run BEFORE prisma migrate deploy so
  //                  migrations can GRANT to existing roles; schema-level + ALL TABLES
  //                  grants work even on an empty schema).
  //   --phase=post → roles (idempotent re-run) + POST_MIGRATE_GRANTS (run AFTER migrations
  //                  so per-table GRANTs find their target table).
  //   (no arg)     → both phases (legacy / local debug).
  const phaseArg = (process.argv.find(a => a.startsWith('--phase=')) ?? '').split('=')[1] ?? '';
  const phase = (phaseArg === 'pre' || phaseArg === 'post') ? phaseArg : 'both';

  const client = new Client({ connectionString: ADMIN_URL });
  await client.connect();

  try {
    // 1. Wait for ready.
    out('BOOTSTRAP_PHASE', 'wait_for_ready');
    await waitForReady(client);
    out('BOOTSTRAP_PHASE', 'db_ready');

    // 2. Roles (idempotent; safe to re-run on every phase).
    let roleCount = 0;
    for (const role of ROLES) {
      try {
        await ensureRole(client, role, ADMIN_PASSWORD_FROM_ENV);
        roleCount += 1;
      } catch (e) {
        console.error(`BOOTSTRAP_ERR role=${role.name} message=${e.message}`);
        process.exit(1);
      }
    }
    out('ROLE_COUNT', roleCount);

    // 3. Grants (split by phase to satisfy ordering constraints).
    let grantsCount = 0;
    if (phase === 'pre' || phase === 'both') {
      out('GRANTS_PHASE', 'pre_migrate');
      grantsCount += await applyGrants(client, PRE_MIGRATE_GRANTS, 'pre_migrate');
    }
    if (phase === 'post' || phase === 'both') {
      out('GRANTS_PHASE', 'post_migrate');
      grantsCount += await applyGrants(client, POST_MIGRATE_GRANTS, 'post_migrate');
    }
    out('GRANTS_COUNT', grantsCount);

    // 4. Verify posture (light sanity).
    const writerPosture = await client.query(`
      SELECT rolname, rolsuper, rolbypassrls, rolcanlogin, rolcreatedb, rolcreaterole
      FROM pg_roles
      WHERE rolname IN ('app_user_writer','app_user','hrp_etl','app_engine_writer')
      ORDER BY rolname
    `);
    out('VERIFY_POSTURE_ROWS', writerPosture.rowCount);
    for (const r of writerPosture.rows) {
      const ok = (
        r.rolsuper === false &&
        r.rolbypassrls === false &&
        r.rolcreatedb === false &&
        r.rolcreaterole === false
      );
      out(`POSTURE_${r.rolname}`, `${ok ? 'PASS' : 'FAIL'} login=${r.rolcanlogin} super=${r.rolsuper} bypassrls=${r.rolbypassrls}`);
      if (!ok) {
        console.error(`BOOTSTRAP_ERR posture mismatch for ${r.rolname} — fail-closed`);
        process.exit(1);
      }
    }

    out('BOOTSTRAP_PHASE', 'done');
    console.log(`READY role_count=${roleCount} grants_count=${grantsCount}`);
  } catch (e) {
    console.error(`BOOTSTRAP_ERR message=${e.message}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(e => {
  console.error(`BOOTSTRAP_FATAL ${e.message}`);
  process.exit(1);
});
