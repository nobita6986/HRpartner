/**
 * integration-preflight.env-readiness.static.test.ts
 *
 * C-05 (round 2) — static guard for the integration lane env-readiness contract.
 *
 * The integration preflight (`scripts/ci/integration-preflight.mjs`) and the
 * posture assertion (`scripts/ci/assert-test-db-posture.mjs`) must BOTH
 * refuse to enter the integration lane unless BOTH `DATABASE_URL_TEST` and
 * `DATABASE_URL_ADMIN_TEST` are present and target the same host+port+db.
 *
 * This static test reads both scripts verbatim, strips comments and string
 * literals, and asserts the structural contract. It does NOT execute the
 * scripts against a real DB; that is the canonical integration gate and
 * remains ENV_BLOCKED in this sandbox (BLK-01).
 *
 * Lives under the observability directory so the unit-lane glob picks
 * the file up automatically.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PREFLIGHT = join(ROOT, 'scripts/ci/integration-preflight.mjs');
const POSTURE = join(ROOT, 'scripts/ci/assert-test-db-posture.mjs');

function strip(src: string): string {
  // Strip block comments and line comments. Strings left intact because the
  // env-var names live in code (e.g. `process.env.DATABASE_URL_TEST`).
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('C-05 — integration env readiness requires BOTH DATABASE_URL_TEST AND DATABASE_URL_ADMIN_TEST', () => {
  it('integration-preflight.mjs reads DATABASE_URL_TEST', () => {
    const code = strip(readFileSync(PREFLIGHT, 'utf8'));
    expect(code).toMatch(/DATABASE_URL_TEST/);
  });

  it('integration-preflight.mjs reads DATABASE_URL_ADMIN_TEST', () => {
    const code = strip(readFileSync(PREFLIGHT, 'utf8'));
    expect(code).toMatch(/DATABASE_URL_ADMIN_TEST/);
  });

  it('integration-preflight.mjs blocks when DATABASE_URL_TEST is missing', () => {
    const code = strip(readFileSync(PREFLIGHT, 'utf8'));
    expect(code).toMatch(/if\s*\(\s*!TEST_URL\s*\)/);
    expect(code).toMatch(/blocked\s*\(/);
  });

  it('assert-test-db-posture.mjs refuses when EITHER URL is missing', () => {
    const code = strip(readFileSync(POSTURE, 'utf8'));
    expect(code).toMatch(/DATABASE_URL_TEST is not set/);
    expect(code).toMatch(/DATABASE_URL_ADMIN_TEST is not set/);
  });

  it('assert-test-db-posture.mjs enforces same-host+port+db between TEST and ADMIN_TEST', () => {
    const code = strip(readFileSync(POSTURE, 'utf8'));
    expect(code).toMatch(/wUrl\.hostname\s*!==\s*aUrl\.hostname/);
    expect(code).toMatch(/wUrl\.port\s*!==\s*aUrl\.port/);
    expect(code).toMatch(/wUrl\.pathname\s*!==\s*aUrl\.pathname/);
  });

  it('integration lane never falls back to dev/prod DATABASE_URL', () => {
    const code = strip(readFileSync(PREFLIGHT, 'utf8'));
    // The preflight explicitly refuses if TEST_URL matches dev/prod DATABASE_URL.
    expect(code).toMatch(/DATABASE_URL/);
    expect(code).toMatch(/protectedUrls/);
    expect(code).toMatch(/DATABASE_URL_DEV/);
    expect(code).toMatch(/DATABASE_URL_ADMIN/);
    expect(code).toMatch(/DATABASE_URL_PROD/);
  });

  it('integration lane emits ENV_BLOCKED, never fake PASS', () => {
    const code = strip(readFileSync(PREFLIGHT, 'utf8'));
    expect(code).toContain('ENV_BLOCKED');
    expect(code).toMatch(/NOT run.*BLOCKED/);
    // STRICT mode converts blocked → exit 1.
    expect(code).toMatch(/CI_INTEGRATION_STRICT/);
  });
});
