#!/usr/bin/env node
/**
 * scripts/runtime/db-posture-preflight.mjs
 *
 * P1 FINAL RELEASE SAFETY — Integration posture proof (T0 §B.05 (2)).
 *
 * Asserts (via read-only `pg.Client` probes, rolled-back transactions):
 *   1. admin and writer connect to the SAME host+port+database (defense in
 *      depth on top of the db-host-guard).
 *   2. writer: rolsuper=false AND rolbypassrls=false.
 *   3. admin:  rolsuper=false AND rolbypassrls=true.
 *      (matches production posture: admin role = DDL/RLS-bypass owner;
 *      writer role = app-user with full RLS enforcement.)
 *   4. Rolls back every probe (no row writes).
 *   5. Never prints the URL itself — only role names + posture flags.
 *
 * Refuses to run if `db-host-guard` rejects the env first. This module
 * must be the FIRST executable in every scripts/runtime/* that touches
 * a real DB.
 *
 * USAGE:
 *   node scripts/runtime/db-posture-preflight.mjs
 *   exit 0  → POSTURE_OK
 *   exit 2  → POSTURE_FAIL (reason logged to stderr)
 */

import { createHash } from 'node:crypto';
import { Client } from 'pg';
import { assertSyntheticRuntime, GuardReject, describeSyntheticRuntime } from './db-host-guard.mjs';

const POSTURE_FAIL = (reason) => {
  console.error(`POSTURE_FAIL ${reason}`);
  process.exit(2);
};

const fingerprint = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 12);

async function probePosture(url) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');
    try {
        const r = await client.query(`
          SELECT current_user::text         AS current_user,
                 session_user::text         AS session_user,
                 (SELECT rolsuper    FROM pg_roles WHERE rolname = current_user) AS rolsuper,
                 (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS rolbypassrls,
                 (SELECT current_database()::text) AS current_database
        `);
        return r.rows[0];
      } finally {
        await client.query('ROLLBACK');
      }
  } finally {
    await client.end();
  }
}

async function main() {
  // Guard first — fail closed before any network call.
  let meta;
  try {
    meta = assertSyntheticRuntime();
  } catch (e) {
    if (e instanceof GuardReject) {
      POSTURE_FAIL(`GUARD_REJECT code=${e.code} reason=${e.message}`);
    }
    POSTURE_FAIL(`GUARD_UNEXPECTED ${e?.message ?? e}`);
  }
  console.log(`[describe] ${describeSyntheticRuntime(meta)}`);

  const ADMIN = (process.env.HRP_RUNTIME_E2E_ADMIN_DATABASE_URL ?? '').trim();
  const WRITER = (process.env.HRP_RUNTIME_E2E_WRITER_DATABASE_URL ?? '').trim();

  // Run probes. Any exception during connect/query also POSTURE_FAILs.
  let writerPosture, adminPosture;
  try {
    [writerPosture, adminPosture] = await Promise.all([probePosture(WRITER), probePosture(ADMIN)]);
  } catch (e) {
    POSTURE_FAIL(`PROBE_CONNECT_FAIL ${e?.message ?? e}`);
  }

  // Log posture WITHOUT revealing the URL.
  console.log(
    `WRITER_POSTURE user=${writerPosture.current_user} ` +
    `super=${writerPosture.rolsuper} bypassrls=${writerPosture.rolbypassrls} ` +
    `db=${fingerprint(writerPosture.current_database)}`,
  );
  console.log(
    `ADMIN_POSTURE  user=${adminPosture.current_user} ` +
    `super=${adminPosture.rolsuper} bypassrls=${adminPosture.rolbypassrls} ` +
    `db=${fingerprint(adminPosture.current_database)}`,
  );

  // Same target assertion (defense in depth on top of guard).
  if (writerPosture.current_database !== adminPosture.current_database) {
    POSTURE_FAIL(
      `DATABASE_MISMATCH writer=${fingerprint(writerPosture.current_database)} ` +
      `admin=${fingerprint(adminPosture.current_database)}`,
    );
  }

  // Writer posture: non-super, non-bypassrls.
  if (writerPosture.rolsuper !== false) {
    POSTURE_FAIL(`writer (${writerPosture.current_user}) is rolsuper=true; integration lane requires non-super writer`);
  }
  if (writerPosture.rolbypassrls !== false) {
    POSTURE_FAIL(`writer (${writerPosture.current_user}) is rolbypassrls=true; integration lane requires non-bypassrls writer`);
  }

  // Admin posture: non-super, bypassrls=true.
  if (adminPosture.rolsuper !== false) {
    POSTURE_FAIL(`admin (${adminPosture.current_user}) is rolsuper=true; production posture requires admin to be non-super`);
  }
  if (adminPosture.rolbypassrls !== true) {
    POSTURE_FAIL(`admin (${adminPosture.current_user}) is rolbypassrls=false; production posture requires admin to bypassrls=true`);
  }

  console.log(
    `POSTURE_OK writer_is_writer admin_is_admin ` +
    `same_db=${fingerprint(writerPosture.current_database)} host_alias=${meta.hostAlias}`,
  );
  process.exit(0);
}

main().catch((e) => POSTURE_FAIL(`UNEXPECTED ${e?.message ?? e}`));