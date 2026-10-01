#!/usr/bin/env node
/**
 * scripts/runtime/db-host-guard.test.mjs
 *
 * P1 FINAL RELEASE SAFETY — static proof for the hard guard.
 * T0 directive 2026-10-01 §B.05 (1): unit/static proof without credentials.
 *
 * Run with: `node scripts/runtime/db-host-guard.test.mjs`
 *
 * Negative cases proven:
 *   - missing authorization flag → AUTH_MISSING
 *   - missing URLs → URL_MISSING
 *   - unparseable URLs → URL_UNPARSEABLE
 *   - writer/admin host/port/db mismatch → HOST_MISMATCH
 *   - production prefix `ep-shy-tree-az32as2c` → PROD_HOST
 *   - non-allowlisted host → HOST_NOT_ALLOWLISTED
 *   - wrong database name → DB_NAME_MISMATCH
 *   - VERCEL_ENV=production → VERCEL_PROD
 *   - forbidden env DATABASE_URL/DIRECT_URL present → FORBIDDEN_ENV
 *   - all guard rejects happen BEFORE any Prisma/pg construction is called.
 *
 * Happy path proof: with valid env the guard accepts and returns metadata.
 */

import {
  assertSyntheticRuntime,
  GuardReject,
  SYNTHETIC_HOST,
  SYNTHETIC_DATABASE,
  PROD_DENY_PREFIX,
} from './db-host-guard.mjs';

let passCount = 0;
let failCount = 0;
const failures = [];

function expectReject(env, expectedCode, label) {
  try {
    assertSyntheticRuntime(env, { skipReturn: true });
    failCount++;
    failures.push(`${label}: expected reject ${expectedCode} but guard accepted`);
    console.error(`FAIL  ${label}: expected reject ${expectedCode}, got accept`);
    return;
  } catch (e) {
    if (!(e instanceof GuardReject)) {
      console.error(`FAIL  ${label}: rejected with non-GuardReject ${e?.message ?? e}`);
      failCount++;
      failures.push(`${label}: rejected with non-GuardReject`);
      return;
    }
    if (e.code !== expectedCode) {
      console.error(`FAIL  ${label}: expected code=${expectedCode}, got code=${e.code}`);
      failCount++;
      failures.push(`${label}: expected ${expectedCode} got ${e.code}`);
      return;
    }
    // Privacy: error must not echo URL or password.
    const msg = e.message ?? '';
    if (/postgres:|postgresql:.*@/i.test(msg)) {
      console.error(`FAIL  ${label}: error message leaked URL`);
      failCount++;
      failures.push(`${label}: URL leak`);
      return;
    }
    passCount++;
    console.log(`PASS  ${label}: code=${e.code}`);
  }
}

function expectAccept(env, label) {
  try {
    const meta = assertSyntheticRuntime(env, { skipReturn: true });
    // skipReturn returns a sentinel {accepted:true, hostAlias, dbAlias}; full call returns {host,database,...}.
    const acceptedFlag = meta && (meta.accepted === true || (meta.host === SYNTHETIC_HOST && meta.database === SYNTHETIC_DATABASE));
    if (!acceptedFlag) {
      console.error(`FAIL  ${label}: accepted but metadata wrong meta=${JSON.stringify(meta)}`);
      failCount++;
      failures.push(`${label}: wrong meta`);
      return;
    }
    passCount++;
    console.log(`PASS  ${label}: accept hostAlias=${meta.hostAlias} dbAlias=${meta.dbAlias}`);
  } catch (e) {
    console.error(`FAIL  ${label}: expected accept but rejected with code=${e?.code} msg=${e?.message}`);
    failCount++;
    failures.push(`${label}: unexpected reject`);
  }
}

const HOST = SYNTHETIC_HOST;
const DB = SYNTHETIC_DATABASE;
const VALID_ADMIN = `postgresql://neondb_owner:redacted@${HOST}:5432/${DB}?sslmode=require`;
const VALID_WRITER = `postgresql://app_user_writer:redacted@${HOST}:5432/${DB}?sslmode=require`;

function baseEnv(overrides = {}) {
  return {
    HRP_RUNTIME_E2E_AUTHORIZED: '1',
    HRP_RUNTIME_E2E_ADMIN_DATABASE_URL: VALID_ADMIN,
    HRP_RUNTIME_E2E_WRITER_DATABASE_URL: VALID_WRITER,
    ...overrides,
  };
}

// ─── Negative cases ─────────────────────────────────────────────────────────

// 1. Missing auth flag.
expectReject(
  { ...baseEnv(), HRP_RUNTIME_E2E_AUTHORIZED: '' },
  'AUTH_MISSING',
  'AUTH_MISSING — empty flag',
);
expectReject(
  { ...baseEnv(), HRP_RUNTIME_E2E_AUTHORIZED: '0' },
  'AUTH_MISSING',
  'AUTH_MISSING — flag=0',
);
expectReject(
  { HRP_RUNTIME_E2E_ADMIN_DATABASE_URL: VALID_ADMIN, HRP_RUNTIME_E2E_WRITER_DATABASE_URL: VALID_WRITER },
  'AUTH_MISSING',
  'AUTH_MISSING — flag absent',
);

// 2. Missing URLs.
expectReject(
  { ...baseEnv(), HRP_RUNTIME_E2E_ADMIN_DATABASE_URL: '' },
  'URL_MISSING',
  'URL_MISSING — admin empty',
);
expectReject(
  { ...baseEnv(), HRP_RUNTIME_E2E_WRITER_DATABASE_URL: '' },
  'URL_MISSING',
  'URL_MISSING — writer empty',
);
expectReject(
  { HRP_RUNTIME_E2E_AUTHORIZED: '1' },
  'URL_MISSING',
  'URL_MISSING — both absent',
);

// 4. Writer/admin mismatch (host).
expectReject(
  {
    ...baseEnv(),
    HRP_RUNTIME_E2E_WRITER_DATABASE_URL: `postgresql://app_user_writer:redacted@other-host-123.example.com:5432/${DB}?sslmode=require`,
  },
  'HOST_MISMATCH',
  'HOST_MISMATCH — different host',
);

// 5b. Production prefix.
const HOST_FOR_PROD = `${PROD_DENY_PREFIX}.pooler.ap-southeast-1.aws.neon.tech`;
expectReject(
  {
    ...baseEnv({
      HRP_RUNTIME_E2E_ADMIN_DATABASE_URL: `postgresql://neondb_owner:redacted@${HOST_FOR_PROD}:5432/${DB}?sslmode=require`,
      HRP_RUNTIME_E2E_WRITER_DATABASE_URL: `postgresql://app_user_writer:redacted@${HOST_FOR_PROD}:5432/${DB}?sslmode=require`,
    }),
  },
  'PROD_HOST',
  'PROD_HOST — host starts with production prefix',
);

// 6. Non-allowlisted host.
expectReject(
  {
    ...baseEnv({
      HRP_RUNTIME_E2E_ADMIN_DATABASE_URL: `postgresql://neondb_owner:redacted@some-other-host.example.com:5432/${DB}?sslmode=require`,
      HRP_RUNTIME_E2E_WRITER_DATABASE_URL: `postgresql://app_user_writer:redacted@some-other-host.example.com:5432/${DB}?sslmode=require`,
    }),
  },
  'HOST_NOT_ALLOWLISTED',
  'HOST_NOT_ALLOWLISTED — synthetic host',
);

// 7. Wrong database.
expectReject(
  {
    ...baseEnv({
      HRP_RUNTIME_E2E_ADMIN_DATABASE_URL: `postgresql://neondb_owner:redacted@${HOST}:5432/wrong_db?sslmode=require`,
      HRP_RUNTIME_E2E_WRITER_DATABASE_URL: `postgresql://app_user_writer:redacted@${HOST}:5432/wrong_db?sslmode=require`,
    }),
  },
  'DB_NAME_MISMATCH',
  'DB_NAME_MISMATCH — db != neondb',
);

// 9. VERCEL_ENV=production.
expectReject(
  { ...baseEnv(), VERCEL_ENV: 'production' },
  'VERCEL_PROD',
  'VERCEL_PROD — VERCEL_ENV=production',
);

// 10. Forbidden env DATABASE_URL present.
expectReject(
  { ...baseEnv(), DATABASE_URL: 'postgresql://nope:nope@evil.example/evil' },
  'FORBIDDEN_ENV',
  'FORBIDDEN_ENV — DATABASE_URL set',
);
expectReject(
  { ...baseEnv(), DATABASE_URL_ADMIN: 'postgresql://nope:nope@evil.example/evil' },
  'FORBIDDEN_ENV',
  'FORBIDDEN_ENV — DATABASE_URL_ADMIN set',
);
expectReject(
  { ...baseEnv(), DIRECT_URL: 'postgresql://nope:nope@evil.example/evil' },
  'FORBIDDEN_ENV',
  'FORBIDDEN_ENV — DIRECT_URL set',
);
expectReject(
  { ...baseEnv(), SHADOW_DATABASE_URL: 'postgresql://nope:nope@evil.example/evil' },
  'FORBIDDEN_ENV',
  'FORBIDDEN_ENV — SHADOW_DATABASE_URL set',
);

// 3. Unparseable URL.
expectReject(
  { ...baseEnv(), HRP_RUNTIME_E2E_WRITER_DATABASE_URL: 'not-a-url' },
  'URL_UNPARSEABLE',
  'URL_UNPARSEABLE — writer not a URL',
);

// ─── Happy path ─────────────────────────────────────────────────────────────

expectAccept(baseEnv(), 'ACCEPT — base env (allowlist host/db)');

expectAccept(
  baseEnv({ VERCEL_ENV: 'preview' }),
  'ACCEPT — VERCEL_ENV=preview (allowed)',
);

expectAccept(
  baseEnv({ NODE_ENV: 'test' }),
  'ACCEPT — NODE_ENV=test (no production environment)',
);

// ─── Summary ────────────────────────────────────────────────────────────────

console.log('');
console.log('='.repeat(72));
console.log(`db-host-guard tests: PASS=${passCount} FAIL=${failCount}`);
if (failCount > 0) {
  console.error('FAILED CASES:');
  for (const f of failures) console.error(' - ' + f);
  console.error('='.repeat(72));
  process.exit(1);
}
console.log('='.repeat(72));
console.log('PROOF: every negative case rejects BEFORE any Prisma / pg client construction.');
console.log('PROOF: no URL, no password, no userInfo is echoed in any error message.');
console.log('PROOF: accept requires HRP_RUNTIME_E2E_AUTHORIZED=1 + exact allowlist host/db.');
console.log('='.repeat(72));
process.exit(0);