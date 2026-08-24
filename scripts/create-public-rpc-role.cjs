#!/usr/bin/env node
/**
 * create-public-rpc-role.cjs — MP-2 Apply + Tracking (OP-01, DEC-08/DEC-09).
 *
 * Provisions the ONE role that owns the public SECURITY DEFINER RPC boundary:
 *
 *   hrp_public_rpc — NOLOGIN BYPASSRLS
 *
 * This role owns hrp_public_apply_submission() / hrp_public_tracking_projection()
 * (see prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql §5-§7).
 * SECURITY DEFINER means those functions execute AS this owner, so its BYPASSRLS
 * attribute is what lets the anonymous public-apply path INSERT under FORCE'd RLS
 * WITHOUT the app ever setting app.role to an authenticated role. The role has
 * NOLOGIN — nothing can connect as it; it is reachable ONLY through the two
 * GRANT EXECUTE'd functions.
 *
 * DEC-09: the migration MUST NOT `CREATE ROLE`. This script is the provisioning
 * step and is run as OP-01 (owner = sếp) via DATABASE_URL_ADMIN — BEFORE the
 * migration is applied. Idempotent: safe to re-run; converges an existing role
 * to the required NOLOGIN + BYPASSRLS shape.
 *
 * Neon note: granting BYPASSRLS requires a superuser/`neon_superuser`-privileged
 * admin. If DATABASE_URL_ADMIN's role cannot set BYPASSRLS, the CREATE/ALTER will
 * error with "must be superuser to change bypassrls attribute" — run this with a
 * neon_superuser-capable admin connection. No secrets are printed by this script.
 *
 * Usage: node scripts/create-public-rpc-role.cjs
 */
require('./load-env.cjs');
const { Client } = require('pg');

const ROLE = 'hrp_public_rpc';

async function main() {
  const adminUrl = process.env.DATABASE_URL_ADMIN;
  if (!adminUrl) {
    console.error('ERROR: DATABASE_URL_ADMIN not set. Required (secret sếp giữ).');
    process.exit(1);
  }

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  try {
    const res = await client.query(
      `SELECT rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname = $1`,
      [ROLE],
    );

    if (res.rowCount === 0) {
      await client.query(`CREATE ROLE ${ROLE} NOLOGIN BYPASSRLS`);
      console.log(`CREATE: role "${ROLE}" created (NOLOGIN BYPASSRLS)`);
    } else {
      const { rolcanlogin, rolbypassrls } = res.rows[0];
      if (!rolcanlogin && rolbypassrls) {
        console.log(`SKIP: role "${ROLE}" already exists with NOLOGIN BYPASSRLS`);
      } else {
        // Converge an existing role to the required shape (idempotent).
        await client.query(`ALTER ROLE ${ROLE} NOLOGIN BYPASSRLS`);
        console.log(
          `ALTER: role "${ROLE}" converged to NOLOGIN BYPASSRLS ` +
            `(was login=${rolcanlogin}, bypassrls=${rolbypassrls})`,
        );
      }
    }

    // Post-condition assertion — fail loudly if the shape is still wrong.
    const check = await client.query(
      `SELECT rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname = $1`,
      [ROLE],
    );
    const ok =
      check.rowCount === 1 &&
      check.rows[0].rolcanlogin === false &&
      check.rows[0].rolbypassrls === true;
    if (!ok) {
      console.error(
        `ERROR: role "${ROLE}" is not NOLOGIN+BYPASSRLS after provisioning. ` +
          `On Neon this usually means the admin lacks neon_superuser.`,
      );
      process.exit(1);
    }

    console.log(`DONE: role "${ROLE}" ready (owner of MP-2 public RPC boundary)`);
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
