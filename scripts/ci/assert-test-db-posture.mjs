#!/usr/bin/env node
/**
 * scripts/ci/assert-test-db-posture.mjs
 *
 * T0 round-5 R5-G1: pre-suite assertion that the writer connection target
 * is genuinely a non-super, non-bypassrls role (e.g. app_user_writer)
 * and that the admin connection target is genuinely the admin role on
 * the SAME host+db. This catches the round-4 mistake of passing
 * `postgres` (superuser) as DATABASE_URL_TEST.
 *
 * Contract:
 *   1. DATABASE_URL_TEST must connect to a role with rolsuper=false AND
 *      rolbypassrls=false. EXIT 2 otherwise (fail-closed; integration
 *      lane MUST NOT run with superuser writer).
 *   2. DATABASE_URL_ADMIN_TEST must connect to a role with rolsuper=true
 *      OR rolbypassrls=true (admin privileges are required for
 *      migrations + introspection). EXIT 2 otherwise.
 *   3. Both URLs MUST target the same host+port+db. EXIT 2 otherwise.
 *   4. NEVER prints the URL itself; only role name + posture flags.
 *
 * Usage:
 *   node scripts/ci/assert-test-db-posture.mjs
 */
import { Client } from 'pg';
import process from 'node:process';

const WRITER_URL = (process.env.DATABASE_URL_TEST ?? '').trim();
const ADMIN_URL  = (process.env.DATABASE_URL_ADMIN_TEST ?? '').trim();

function fail(reason, code = 2) {
  console.error(`POSTURE_FAIL ${reason}`);
  process.exit(code);
}

if (!WRITER_URL) fail('DATABASE_URL_TEST is not set');
if (!ADMIN_URL)  fail('DATABASE_URL_ADMIN_TEST is not set');

let wUrl, aUrl;
try { wUrl = new URL(WRITER_URL); } catch { fail('DATABASE_URL_TEST is not a valid URL'); }
try { aUrl = new URL(ADMIN_URL);  } catch { fail('DATABASE_URL_ADMIN_TEST is not a valid URL'); }

if (wUrl.hostname !== aUrl.hostname
 || wUrl.port     !== aUrl.port
 || wUrl.pathname !== aUrl.pathname) {
  fail('DATABASE_URL_TEST and DATABASE_URL_ADMIN_TEST must target the SAME host+port+database');
}

async function probe(url) {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    const r = await c.query(`
      SELECT current_user::text         AS current_user,
             session_user::text         AS session_user,
             (SELECT rolsuper    FROM pg_roles WHERE rolname = current_user) AS rolsuper,
             (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS rolbypassrls
    `);
    return r.rows[0];
  } finally {
    await c.end();
  }
}

const writer = await probe(WRITER_URL);
const admin  = await probe(ADMIN_URL);

console.log(`WRITER_POSTURE user=${writer.current_user} session=${writer.session_user} super=${writer.rolsuper} bypassrls=${writer.rolbypassrls}`);
console.log(`ADMIN_POSTURE  user=${admin.current_user}  session=${admin.session_user}  super=${admin.rolsuper}  bypassrls=${admin.rolbypassrls}`);

if (writer.rolsuper    !== false) fail(`writer (${writer.current_user}) is rolsuper=true; integration lane requires a non-super writer (e.g. app_user_writer)`);
if (writer.rolbypassrls !== false) fail(`writer (${writer.current_user}) is rolbypassrls=true; integration lane requires a non-bypassrls writer`);

if (admin.rolsuper === false && admin.rolbypassrls === false) {
  fail(`admin (${admin.current_user}) has neither rolsuper nor rolbypassrls; migrations + MP2 introspection need admin privileges`);
}

console.log('POSTURE_OK writer_is_writer admin_is_admin same_target');
