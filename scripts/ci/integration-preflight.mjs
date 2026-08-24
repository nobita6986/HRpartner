#!/usr/bin/env node
/**
 * scripts/ci/integration-preflight.mjs — G0-04 / RQ-06. Fail-closed gate for the integration lane.
 *
 * Contract:
 *   1. The integration lane runs ONLY against a dedicated test DB provided via DATABASE_URL_TEST
 *      (and optionally DATABASE_URL_ADMIN_TEST). It NEVER falls back to the repo .env, DATABASE_URL,
 *      *_DEV or *_ADMIN (dev/prod).
 *   2. Missing test-DB env → print ENV_BLOCKED, write a job-summary note, exit 0 (the job is
 *      "green but blocked", NOT a fake integration PASS). Set CI_INTEGRATION_STRICT=1 to make the
 *      absence a hard failure instead.
 *   3. Present test-DB env → GUARD: refuse if it equals any protected (dev/prod) URL, and (when an
 *      admin test URL is given) refuse unless admin and writer target the SAME host+port+db. Then,
 *      and only then, spawn `vitest run --config vitest.integration.config.ts` and propagate exit.
 *
 * SECURITY: connection strings are NEVER printed. Only a masked form (protocol//****@host:port/db)
 * and a short sha256 fingerprint are shown, for correlation without leaking credentials.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const STRICT = !!(process.env.CI_INTEGRATION_STRICT ?? '').trim();

const fingerprint = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 12);

function mask(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//****@${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}`;
  } catch {
    return '(unparseable url)';
  }
}

function appendSummary(md) {
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (!f) return;
  try { appendFileSync(f, md + '\n'); } catch { /* summary is best-effort */ }
}

function readRepoEnvDbUrl() {
  try {
    const env = readFileSync(path.join(ROOT, '.env'), 'utf8');
    const m = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
    return m ? m[1] : undefined;
  } catch { return undefined; }
}
function blocked(reason) {
  console.log('ENV_BLOCKED');
  console.log(`[integration-preflight] ${reason}`);
  console.log('[integration-preflight] Integration lane NOT run — this is a BLOCKED state, not a PASS.');
  appendSummary(`### Integration lane: \`ENV_BLOCKED\`\n\n${reason}\n\nSet \`DATABASE_URL_TEST\` (a dedicated test database) to enable this lane. It never falls back to dev/prod.`);
  if (STRICT) {
    console.error('[integration-preflight] CI_INTEGRATION_STRICT set → blocked state treated as failure.');
    process.exit(1);
  }
  process.exit(0);
}

function refuse(reason) {
  console.error('INTEGRATION_REFUSED');
  console.error(`[integration-preflight] ${reason}`);
  appendSummary(`### Integration lane: \`REFUSED\`\n\n${reason}`);
  process.exit(1);
}

// ── 1. Require a dedicated test DB URL ────────────────────────────────────────
const TEST_URL = (process.env.DATABASE_URL_TEST ?? '').trim();
const ADMIN_TEST_URL = (process.env.DATABASE_URL_ADMIN_TEST ?? '').trim();

if (!TEST_URL) {
  blocked('DATABASE_URL_TEST is not set. A dedicated test database is required for the integration lane.');
}

// ── 2. Refuse if the test URL is actually a protected (dev/prod) database ─────
const norm = (u) => (u ?? '').trim().replace(/\?.*$/, ''); // compare base (ignore query params)
const protectedUrls = [
  ['repo .env DATABASE_URL', readRepoEnvDbUrl()],
  ['DATABASE_URL', process.env.DATABASE_URL],
  ['DATABASE_URL_DEV', process.env.DATABASE_URL_DEV],
  ['DATABASE_URL_ADMIN', process.env.DATABASE_URL_ADMIN],
  ['DATABASE_URL_ADMIN_DEV', process.env.DATABASE_URL_ADMIN_DEV],
  ['DATABASE_URL_PROD', process.env.DATABASE_URL_PROD],
];
for (const [name, val] of protectedUrls) {
  if (val && norm(val) === norm(TEST_URL)) {
    refuse(`DATABASE_URL_TEST equals a protected URL (${name}). The integration lane must use a DEDICATED test database, never dev/prod.`);
  }
}

// ── 3. Admin test URL (if given) must target the SAME host+port+db as the writer ──
if (ADMIN_TEST_URL) {
  let w, a;
  try { w = new URL(TEST_URL); a = new URL(ADMIN_TEST_URL); }
  catch { refuse('DATABASE_URL_TEST or DATABASE_URL_ADMIN_TEST is not a valid URL.'); }
  if (w.hostname !== a.hostname || w.port !== a.port || w.pathname !== a.pathname) {
    refuse('DATABASE_URL_ADMIN_TEST must target the SAME host+port+database as DATABASE_URL_TEST (admin role on the same test DB).');
  }
}

// ── 4. Guards passed → run the integration lane ───────────────────────────────
console.log('[integration-preflight] Test DB accepted (guards passed).');
console.log(`[integration-preflight]   writer: ${mask(TEST_URL)}  fp=${fingerprint(TEST_URL)}`);
if (ADMIN_TEST_URL) console.log(`[integration-preflight]   admin : ${mask(ADMIN_TEST_URL)}  fp=${fingerprint(ADMIN_TEST_URL)}`);
appendSummary(`### Integration lane: running\n\nwriter \`${mask(TEST_URL)}\` (fp \`${fingerprint(TEST_URL)}\`)`);

const res = spawnSync('npx', ['vitest', 'run', '--config', 'vitest.integration.config.ts'], {
  stdio: 'inherit',
  cwd: ROOT,
  env: process.env,
  shell: process.platform === 'win32',
});
process.exit(res.status ?? 1);
