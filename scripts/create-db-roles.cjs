#!/usr/bin/env node
/**
 * create-db-roles.cjs — P1 Portals STEP-09 (RQ-10, DEC-09, FO-01).
 *
 * Creates 4 DB roles NOLOGIN for the 4 portal roles:
 *   worker_user  — for WORKER role context
 *   vendor_user  — for VENDOR_ADMIN/VENDOR_STAFF context
 *   ctv_user     — for CTV context
 *   sale_user    — for SALE context
 *
 * Idempotent — checks if role exists before creating.
 * Uses DATABASE_URL_ADMIN (superuser, bypasses RLS) — secret sếp giữ.
 *
 * Usage: node scripts/create-db-roles.cjs
 */
const { Client } = require('pg');

const ROLES = ['worker_user', 'vendor_user', 'ctv_user', 'sale_user'];

async function main() {
  const adminUrl = process.env.DATABASE_URL_ADMIN;
  if (!adminUrl) {
    console.error('ERROR: DATABASE_URL_ADMIN not set. Required.');
    process.exit(1);
  }

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  try {
    for (const role of ROLES) {
      const exists = await client.query(
        `SELECT 1 FROM pg_roles WHERE rolname = $1`,
        [role],
      );

      if (exists.rowCount > 0) {
        console.log(`SKIP: role "${role}" already exists`);
        continue;
      }

      await client.query(`CREATE ROLE ${role} NOLOGIN`);
      console.log(`CREATE: role "${role}" created`);
    }
    console.log('DONE: 4 DB roles ready');
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
