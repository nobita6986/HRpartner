#!/usr/bin/env node
/**
 * scripts/runtime/db-host-guard.mjs
 *
 * P1 FINAL RELEASE SAFETY — Production-host HARD GUARD.
 * T0 directive 2026-10-01 §A. Refused-by-construction.
 *
 * Purpose: every executable in `scripts/runtime/*` that touches Prisma / pg /
 * any network call MUST run this guard BEFORE constructing any DB client.
 * The guard is fail-closed; on reject the caller MUST throw / exit non-zero.
 *
 * Forbidden env names (T0 §A.1):
 *   - DATABASE_URL
 *   - DATABASE_URL_ADMIN
 *   - DATABASE_URL_TEST
 *   - DATABASE_URL_ADMIN_TEST
 *   - DIRECT_URL
 *   - SHADOW_DATABASE_URL
 *   - .env / .env.local auto-load
 *
 * Required env names (T0 §A.1):
 *   - HRP_RUNTIME_E2E_AUTHORIZED=1
 *   - HRP_RUNTIME_E2E_ADMIN_DATABASE_URL
 *   - HRP_RUNTIME_E2E_WRITER_DATABASE_URL
 *
 * Runtime allowlist (constants — NOT env, NOT overridable):
 *   - exact host:    ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech
 *   - exact database: neondb
 *
 * Runtime denylist (constants):
 *   - any host starting with: ep-shy-tree-az32as2c
 *
 * Fail-closed conditions (T0 §A.1):
 *   1. HRP_RUNTIME_E2E_AUTHORIZED !== '1'                  → reject AUTH_MISSING
 *   2. missing writer or admin URL                          → reject URL_MISSING
 *   3. URL parse fails                                      → reject URL_UNPARSEABLE
 *   4. writer/admin different host | port | database        → reject HOST_MISMATCH
 *   5. host matches production alias `ep-shy-tree-az32as2c` → reject PROD_HOST
 *   6. host not in synthetic allowlist                      → reject HOST_NOT_ALLOWLISTED
 *   7. database name not exact `neondb`                     → reject DB_NAME_MISMATCH
 *   8. (preflight posture — separate script)                → reject POSTURE_MISMATCH
 *   9. VERCEL_ENV=production                                → reject VERCEL_PROD
 *  10. process.env.DATABASE_URL / .env auto-load detected   → reject FORBIDDEN_ENV
 *
 * Error contract:
 *   - throws a typed `GuardReject` instance
 *   - .code = one of the codes above (never URL/secret leaked)
 *   - .message = a short, redacted reason; host alias OR generic code ONLY
 *   - .alias = a short SHA-256 prefix of the offending host for correlation
 *
 * No override switch is supported (T0 §A.1 — no `--force-production`).
 *
 * USAGE:
 *   import { assertSyntheticRuntime } from './db-host-guard.mjs';
 *   assertSyntheticRuntime(); // throws on reject; returns void on accept
 */

import { createHash } from 'node:crypto';

export const SYNTHETIC_HOST = 'ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech';
export const SYNTHETIC_DATABASE = 'neondb';
export const PROD_DENY_PREFIX = 'ep-shy-tree-az32as2c';

const FORBIDDEN_ENV_NAMES = Object.freeze([
  'DATABASE_URL',
  'DATABASE_URL_ADMIN',
  'DATABASE_URL_TEST',
  'DATABASE_URL_ADMIN_TEST',
  'DIRECT_URL',
  'SHADOW_DATABASE_URL',
]);

const REQUIRED_ENV_NAMES = Object.freeze([
  'HRP_RUNTIME_E2E_AUTHORIZED',
  'HRP_RUNTIME_E2E_ADMIN_DATABASE_URL',
  'HRP_RUNTIME_E2E_WRITER_DATABASE_URL',
]);

const HOST_FINGERPRINT_LEN = 12;

function fingerprint(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, HOST_FINGERPRINT_LEN);
}

function redactUrl(url) {
  try {
    const u = new URL(url);
    // protocol + host:port + pathname; never userInfo, never password, never query.
    const port = u.port ? `:${u.port}` : '';
    return `${u.protocol}//${u.hostname}${port}${u.pathname}`;
  } catch {
    return '(unparseable-url)';
  }
}

export class GuardReject extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'GuardReject';
    this.code = code;
    Object.assign(this, detail);
  }
}

function reject(code, message, detail) {
  throw new GuardReject(code, message, detail);
}

/**
 * Parse + validate a runtime E2E DB URL. Returns normalized {host, port, database}
 * or throws GuardReject.
 */
function parseRuntimeUrl(name, rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    reject('URL_MISSING', `${name} is empty or missing`, { field: name });
  }
  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch (e) {
    reject('URL_UNPARSEABLE', `${name} is not a valid URL`, {
      field: name,
      fingerprint: fingerprint(rawValue),
    });
  }
  const host = parsed.hostname;
  const port = parsed.port || (parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:' ? '5432' : '');
  const database = parsed.pathname.replace(/^\//, '').split('?')[0];
  if (!host || !database) {
    reject('URL_UNPARSEABLE', `${name} has empty host or database`, {
      field: name,
      fingerprint: fingerprint(rawValue),
    });
  }
  return { host, port, database, raw: rawValue };
}

/**
 * Public API. Runs the full pre-flight check.
 *
 * Returns a {admin, writer} object with normalized metadata.
 */
export function assertSyntheticRuntime(env = process.env, opts = {}) {
  const envSource = env;
  // (10) Forbidden env names must not be present (or auto-load would have set them).
  for (const name of FORBIDDEN_ENV_NAMES) {
    const value = envSource[name];
    if (typeof value === 'string' && value.trim() !== '') {
      reject('FORBIDDEN_ENV', `${name} must be unset for runtime E2E`, {
        fingerprint: fingerprint(value),
      });
    }
  }

  // (9) VERCEL_ENV=production — refused unconditionally.
  if ((envSource.VERCEL_ENV ?? '').trim() === 'production') {
    reject('VERCEL_PROD', 'VERCEL_ENV=production is forbidden for runtime E2E');
  }

  // (1) Authorization flag.
  if ((envSource.HRP_RUNTIME_E2E_AUTHORIZED ?? '').trim() !== '1') {
    reject('AUTH_MISSING', 'HRP_RUNTIME_E2E_AUTHORIZED must equal "1"');
  }

  // (2) Required URLs.
  const adminRaw = (envSource.HRP_RUNTIME_E2E_ADMIN_DATABASE_URL ?? '').trim();
  const writerRaw = (envSource.HRP_RUNTIME_E2E_WRITER_DATABASE_URL ?? '').trim();
  if (!adminRaw || !writerRaw) {
    reject('URL_MISSING', 'HRP_RUNTIME_E2E_ADMIN_DATABASE_URL and HRP_RUNTIME_E2E_WRITER_DATABASE_URL are required', {
      adminPresent: !!adminRaw,
      writerPresent: !!writerRaw,
    });
  }

  // (3) Parse both.
  const admin = parseRuntimeUrl('HRP_RUNTIME_E2E_ADMIN_DATABASE_URL', adminRaw);
  const writer = parseRuntimeUrl('HRP_RUNTIME_E2E_WRITER_DATABASE_URL', writerRaw);

  // (4) Same host / port / database.
  if (admin.host !== writer.host || admin.port !== writer.port || admin.database !== writer.database) {
    reject('HOST_MISMATCH', 'admin and writer must target the same host+port+database', {
      adminHostAlias: fingerprint(admin.host),
      writerHostAlias: fingerprint(writer.host),
      adminDbAlias: fingerprint(admin.database),
      writerDbAlias: fingerprint(writer.database),
    });
  }

  // (5) Production denylist.
  if (admin.host.startsWith(PROD_DENY_PREFIX) || writer.host.startsWith(PROD_DENY_PREFIX)) {
    reject('PROD_HOST', `host matches production deny prefix`, {
      hostAlias: fingerprint(admin.host),
    });
  }

  // (6) Synthetic allowlist (exact host).
  if (admin.host !== SYNTHETIC_HOST) {
    reject('HOST_NOT_ALLOWLISTED', `host is not in synthetic allowlist`, {
      hostAlias: fingerprint(admin.host),
    });
  }

  // (7) Exact database name.
  if (admin.database !== SYNTHETIC_DATABASE) {
    reject('DB_NAME_MISMATCH', `database is not the expected synthetic contract`, {
      dbAlias: fingerprint(admin.database),
    });
  }

  if (opts.skipReturn === true) {
    // Caller wants to ignore the metadata (e.g. a CLI guard test). Return a sentinel.
    return Object.freeze({ accepted: true, hostAlias: fingerprint(admin.host), dbAlias: fingerprint(admin.database) });
  }
  return {
    host: admin.host,
    port: admin.port,
    database: admin.database,
    hostAlias: fingerprint(admin.host),
    dbAlias: fingerprint(admin.database),
  };
}

/**
 * Render a one-line safe summary of the guard outcome. NEVER prints the URL.
 */
export function describeSyntheticRuntime(meta) {
  return `synthetic-allowlist host-alias=${meta.hostAlias} db-alias=${meta.dbAlias}`;
}

/**
 * CLI entry. Exits 0 on accept, 2 on reject (non-zero so callers can rely on $?).
 */
function main() {
  try {
    const meta = assertSyntheticRuntime();
    console.log(`[db-host-guard] OK ${describeSyntheticRuntime(meta)}`);
    process.exit(0);
  } catch (e) {
    if (e instanceof GuardReject) {
      console.error(`[db-host-guard] REJECT code=${e.code} reason=${e.message}`);
      process.exit(2);
    }
    console.error(`[db-host-guard] UNEXPECTED ${e?.message ?? e}`);
    process.exit(2);
  }
}

// Run only when invoked as a script (not when imported by tests).
const invokedDirectly = (() => {
  try {
    const argv1 = process.argv[1];
    if (!argv1) return false;
    const url = new URL(`file://${argv1.replace(/\\/g, '/')}`);
    return import.meta.url === url.href;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main();
}