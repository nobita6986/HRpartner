#!/usr/bin/env node
/**
 * scripts/ci/validate-guards.mjs
 *
 * T0 round-5 R5-G3 + T0 round-7 R7-G2: SINGLE non-mutating guard
 * validator. Prove the CI helper scripts have REAL non-mutating guards.
 * Negative cases MUST abort with EXIT CODE 3 BEFORE any
 *   - connection (DB / pg client)
 *   - destructive operation (DROP / CREATE DATABASE / ALTER ROLE)
 *   - call into the real apply/prepare branch
 *
 * Positive cases MUST pass guards (NOT exit 3) — but MUST NOT proceed past
 * the guard phase. We test this by passing a syntactically valid but
 * deliberately inert config and asserting:
 *   - the script prints GUARD_PASS then EXITS 0 without ever opening a
 *     pg client or shelling out to psql/prisma;
 *   - it does not overwrite any AC evidence file;
 *   - the helper scripts each have a `--probe` mode that ONLY runs guards
 *     and exits 0 (no prepare, no apply, no build).
 *
 * For each script we test:
 *   - NEGATIVE (must exit 3 BEFORE any side-effect):
 *       a) unsafe target DB name (production_main_db)
 *       b) unsafe host (db.example.com)
 *       c) source == target (prepare-migration-test-db only)
 *   - POSITIVE (must reach GUARD_PASS, exit 0, no mutation):
 *       a) inert mode via --probe (each helper exposes this)
 *
 * T0 round-7 R7-G2: this is now the SINGLE non-mutating guard
 * validator. The redundant `--validate-guards` mode that previously
 * lived inside `prepare-migration-test-db.mjs` has been REMOVED —
 * its behavior was identical to this validator but kept a parallel
 * mechanism. We now have one validator that covers all five helpers
 * (the four CI helpers + the predecessor builder).
 *
 * T0 R10: validator is PURE non-DB. baseEnv uses inert credentials;
 * collision integration (predecessor exists / target exists with
 * sentinel + connection) is owned by a separate script
 * (`scripts/ci/verify-collision-integration.mjs`). The validator
 * never terminates or drops a DB.
 *
 * This script does NOT call into the apply/prepare branches of the
 * helpers, NEVER connects to a database, and DOES NOT touch any
 * evidence file. AC evidence files are checked only for size/timestamp
 * stability across the run.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const EVIDENCE_DIR = process.env.EVIDENCE_DIR
  ?? join(REPO_ROOT, 'docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence');

const SCRIPTS = [
  'scripts/ci/prepare-migration-test-db.mjs',
  'scripts/ci/apply-r1-migration.mjs',
  'scripts/ci/verify-ac06-backfill.mjs',
  'scripts/ci/verify-ac07-rollback.mjs',
  // T0 round-7 R7-G2: the predecessor builder now also exposes a
  // `--probe` mode so it can be covered by the validator. The
  // destructive branch (DROP/CREATE DB, materialize tmp dir, run
  // Prisma migrate deploy) is only reachable after the guard phase
  // passes — `--probe` exits 0 BEFORE any side-effect.
  'scripts/ci/build-predecessor-staging.mjs',
];

const out = (k, v) => console.log(`${k}=${v}`);

// Snapshot evidence files BEFORE the run so we can prove no overwrite.
function snapshotEvidence() {
  const snap = {};
  if (!existsSync(EVIDENCE_DIR)) return snap;
  for (const name of readdirSync(EVIDENCE_DIR)) {
    const p = join(EVIDENCE_DIR, name);
    if (statSync(p).isFile()) {
      const st = statSync(p);
      snap[name] = { size: st.size, mtimeMs: st.mtimeMs };
    }
  }
  return snap;
}

function diffSnapshot(before, after) {
  const changed = [];
  for (const k of Object.keys(before)) {
    if (!after[k]) { changed.push(`${k} (deleted)`); continue; }
    if (after[k].size !== before[k].size || after[k].mtimeMs !== before[k].mtimeMs) {
      changed.push(k);
    }
  }
  for (const k of Object.keys(after)) {
    if (!before[k]) changed.push(`${k} (added)`);
  }
  return changed;
}

function runNode(script, args, env) {
  // T0 round-7: validator runs helpers in a CLEAN env so test overrides
  // (e.g. MIGRATION_TARGET_DB=production_main_db) cannot be silently
  // shadowed by values inherited from `process.env` (e.g. the
  // developer's shell .env). The only inherited values are minimal
  // Node.js needs; DATABASE_* and PGPASSWORD come from `env`.
  const cleanEnv = {
    PATH: process.env.PATH ?? '',
    SystemRoot: process.env.SystemRoot ?? '',
    TEMP: process.env.TEMP ?? '',
    TMP: process.env.TMP ?? '',
    USERPROFILE: process.env.USERPROFILE ?? '',
    ...env,
  };
  try {
    const stdout = execFileSync('node', [join(REPO_ROOT, script), ...args], {
      cwd: REPO_ROOT,
      env: cleanEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    return {
      status: e.status ?? 1,
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
    };
  }
}

const before = snapshotEvidence();
out('EVIDENCE_BEFORE', JSON.stringify({ dir: EVIDENCE_DIR, count: Object.keys(before).length }));

let pass = true;
function fail(label, why) {
  out('FAIL', `[${label}] ${why}`);
  pass = false;
}
function ok(label, info = '') {
  out('PASS', `[${label}]${info ? ' ' + info : ''}`);
}

// ──────────────────────────────────────────────────────────────────────
//  NEGATIVE cases — must exit EXACTLY 3 BEFORE any side-effect.
// ──────────────────────────────────────────────────────────────────────
const baseEnv = {
  // T0 R10: pure non-DB validator. baseEnv uses inert URLs with `probe`
  // password so NEGATIVE probes (which must NEVER actually connect) trip
  // on guard checks BEFORE opening a pg client. POSITIVE probes use --probe
  // mode of each helper, which only runs guard checks and exits 0 without
  // opening a connection.
  DATABASE_URL_ADMIN_TEST: 'postgresql://postgres:probe@127.0.0.1:5432/aff05a_r1_test',
  PGPASSWORD: 'probe',
  PG_BASELINE_PASSWORD: 'probe',
  MIGRATION_SOURCE_DB: 'aff05a_r1_test',
  MIGRATION_TARGET_DB: 'aff05a_r1_migration_test',
  EVIDENCE_DIR,
};

const MUTATION_MARKERS = [
  /MIGRATION_APPLIED_OK/m,
  /MIGRATION_OK/m,
  /SCHEMA_RESTORED/m,
  /^READY$/m,
  /PREDECESSOR_APPLY_OK/m,
  /FUNCTIONS_VERIFIED_OK/m,
  /GRANTS_VERIFIED_OK/m,
];

function assertExit3(script, env, label, args = []) {
  const r = runNode(script, args, env);
  if (r.status !== 3) {
    fail(label, `expected exit=3, got exit=${r.status} stdout=${r.stdout.slice(0, 200)}`);
    return;
  }
  const combined = (r.stdout ?? '') + (r.stderr ?? '');
  for (const marker of MUTATION_MARKERS) {
    if (marker.test(combined)) {
      fail(label, `exit=3 OK but mutation marker ${marker} appeared in output`);
      return;
    }
  }
  ok(label, `exit=3, no mutation marker`);
}

// (a) unsafe target DB name.
for (const s of SCRIPTS) {
  assertExit3(s, { ...baseEnv, MIGRATION_TARGET_DB: 'production_main_db' }, `${s} unsafe target`);
}
// T0 round-7: the builder reads DATABASE_NAME first then MIGRATION_TARGET_DB
// (AC-06/07 callers pass DATABASE_NAME explicitly). Run the unsafe-target
// test for the builder with BOTH set to make sure the guard fires regardless
// of which env var the operator or test passes.
assertExit3('scripts/ci/build-predecessor-staging.mjs',
  { ...baseEnv, MIGRATION_TARGET_DB: 'production_main_db', DATABASE_NAME: 'production_main_db' },
  'scripts/ci/build-predecessor-staging.mjs unsafe target (both envs)');
// (b) unsafe host.
for (const s of SCRIPTS) {
  assertExit3(s, { ...baseEnv, DATABASE_URL_ADMIN_TEST: 'postgresql://postgres:probe@db.example.com:5432/aff05a_r1_test' }, `${s} unsafe host`);
}
// (c) source == target (only prepare-migration-test-db validates this).
assertExit3('scripts/ci/prepare-migration-test-db.mjs',
  { ...baseEnv, MIGRATION_SOURCE_DB: 'aff05a_r1_migration_test', MIGRATION_TARGET_DB: 'aff05a_r1_migration_test' },
  'prepare-migration-test-db source==target');

// T0 round-8 R8-G1: legacy `--validate-guards` flag MUST be rejected
// BEFORE any connection/env-var resolution. With valid config in R7,
// this flag was silently ignored and the script fell through to the
// destructive prepare branch. We assert exit=3 + no mutation marker.
assertExit3('scripts/ci/prepare-migration-test-db.mjs',
  { ...baseEnv },
  'prepare-migration-test-db rejected --validate-guards flag',
  ['--validate-guards']);
// T0 round-8 R8-G1: unknown flags MUST be rejected. Same expectation.
assertExit3('scripts/ci/prepare-migration-test-db.mjs',
  { ...baseEnv },
  'prepare-migration-test-db rejected unknown flag',
  ['--no-such-flag']);

// T0 round-8 R8-G2: AC-06/07 must reject `MIGRATION_TARGET_DB ==
// aff05a_r1_predecessor` BEFORE calling build-predecessor-staging. The
// probe-only run with this config would otherwise fall through both
// AC-06/07 and the builder with exit 0, defeating the rename-after-
// build invariant.
assertExit3('scripts/ci/verify-ac06-backfill.mjs',
  { ...baseEnv, MIGRATION_TARGET_DB: 'aff05a_r1_predecessor' },
  'verify-ac06-backfill rejected target==predecessor');
assertExit3('scripts/ci/verify-ac07-rollback.mjs',
  { ...baseEnv, MIGRATION_TARGET_DB: 'aff05a_r1_predecessor' },
  'verify-ac07-rollback rejected target==predecessor');

// T0 R10: --collision-test is removed from verify-ac07-rollback.mjs.
// Unknown flags must still exit 3 BEFORE any side-effect.
assertExit3('scripts/ci/verify-ac07-rollback.mjs',
  { ...baseEnv },
  'verify-ac07-rollback rejected --collision-test flag',
  ['--collision-test']);
assertExit3('scripts/ci/verify-ac06-backfill.mjs',
  { ...baseEnv },
  'verify-ac06-backfill rejected --collision-test flag',
  ['--collision-test']);
// T0 round-8 R8-G2: the predecessor builder itself must refuse to DROP
// a target DB that already exists at its name. We pre-stage a probe
// with the builder's DATABASE_NAME set to `aff05a_r1_predecessor`
// (which is the canonical AC-06/07 caller pattern); the new pre-DROP
// collision check fires for the synthetic DB only if the cluster
// already has such a DB. We do not assert this against the live cluster
// here — the check fires inside the destructive branch, not the guard
// branch, and the validator only proves guards. The check is exercised
// by the AC-06/07 integration runs (with TARGET_DB ==
// aff05a_r1_migration_test, which is fresh after the rename), and
// logged in evidence.

// ──────────────────────────────────────────────────────────────────────
//  POSITIVE cases — guards MUST pass but script MUST NOT execute its
//  destructive branch. We add a `--probe` flag to each helper that
//  short-circuits after the guard phase and exits 0.
// ──────────────────────────────────────────────────────────────────────

const PROBE_RESULT_MARKERS = [/GUARD_PASS/m];

function assertProbePasses(script, env, label) {
  const r = runNode(script, ['--probe'], env);
  if (r.status !== 0) {
    fail(label, `--probe expected exit=0, got exit=${r.status} stdout=${r.stdout.slice(0, 200)} stderr=${r.stderr.slice(0, 200)}`);
    return;
  }
  const combined = (r.stdout ?? '') + (r.stderr ?? '');
  let found = false;
  for (const m of PROBE_RESULT_MARKERS) if (m.test(combined)) found = true;
  if (!found) {
    fail(label, `--probe exit=0 but no GUARD_PASS marker in output`);
    return;
  }
  // Ensure probe did NOT execute destructive branch.
  for (const marker of MUTATION_MARKERS) {
    if (marker.test(combined)) {
      fail(label, `--probe exit=0 but mutation marker ${marker} appeared — probe ran past guards`);
      return;
    }
  }
  ok(label, `--probe exit=0, GUARD_PASS present, no mutation marker`);
}

for (const s of SCRIPTS) {
  assertProbePasses(s, baseEnv, `${s} probe (positive)`);
}
// T0 round-7: the builder needs DATABASE_NAME to hit its allowlist during
// probe mode; otherwise MIGRATION_TARGET_DB defaults to `aff05a_r1_test`
// (which is in the allowlist but the more explicit form is better for
// coverage). Set both.
assertProbePasses('scripts/ci/build-predecessor-staging.mjs',
  { ...baseEnv, DATABASE_NAME: 'aff05a_r1_predecessor' },
  'scripts/ci/build-predecessor-staging.mjs probe with DATABASE_NAME');

// R11: fixture mode must not weaken the namespace boundary.
for (const script of ['scripts/ci/verify-ac06-backfill.mjs', 'scripts/ci/verify-ac07-rollback.mjs', 'scripts/ci/build-predecessor-staging.mjs']) {
  for (const name of ['production_main_db', 'postgres', 'aff05a_r1_collision_bad_pred']) {
    assertExit3(script, {...baseEnv, DATABASE_NAME:name, MIGRATION_TARGET_DB:'aff05a_r1_collision_1234abcd_tgt'},
      `${script} fixture rejects ${name}`, ['--probe', '--collision-fixture']);
  }
  assertExit3(script, {...baseEnv, COLLISION_BYPASS_DB_NAME:'1'},
    `${script} rejects legacy bypass`, ['--probe', '--collision-fixture']);
  assertExit3(script, {...baseEnv,
    DATABASE_NAME:script.includes('build-predecessor') ? 'production_main_db' : 'aff05a_r1_collision_1234abcd_pred',
    MIGRATION_TARGET_DB:'production_main_db'}, `${script} fixture target remains guarded`,
    ['--probe', '--collision-fixture']);
  const valid = runNode(script, ['--probe', '--collision-fixture'], {...baseEnv,
    DATABASE_NAME:'aff05a_r1_collision_1234abcd_pred', MIGRATION_TARGET_DB:'aff05a_r1_collision_1234abcd_tgt'});
  if (valid.status === 0 && /GUARD_PASS/.test(valid.stdout)) ok(`${script} valid fixture grammar`);
  else fail(`${script} valid fixture grammar`, `exit=${valid.status}`);
}
assertExit3('scripts/ci/verify-collision-integration.mjs', {...baseEnv,
  DATABASE_URL_ADMIN_TEST:'postgresql://postgres:probe@db.example.com:5432/postgres'},
  'collision runner rejects non-loopback', ['--predecessor-exists', '--probe']);
assertExit3('scripts/ci/verify-collision-integration.mjs', baseEnv,
  'collision runner rejects unknown flag', ['--target-exists', '--unknown', '--probe']);
const runner = runNode('scripts/ci/verify-collision-integration.mjs', ['--target-exists', '--probe'], baseEnv);
if (runner.status === 0 && /GUARD_PASS/.test(runner.stdout)) ok('collision runner probe no connection');
else fail('collision runner probe no connection', `exit=${runner.status}`);

// T0 R10: target-existence check is exercised end-to-end by the
// dedicated collision-integration runner
// (`scripts/ci/verify-collision-integration.mjs`). The validator
// covers it indirectly via the unsafe-target / target==predecessor
// probes above; the integration runner owns the live-DB proof.

// ──────────────────────────────────────────────────────────────────────
//  Evidence integrity — no AC evidence file may have been touched.
// ──────────────────────────────────────────────────────────────────────

const after = snapshotEvidence();
const changed = diffSnapshot(before, after);
// T0 round-5 R5-G3: the evidence file for THIS run is the only file
// allowed to change. The operator writes `guards-r5.txt` (or similar)
// by redirecting validate-guards's stdout. We therefore whitelist that
// file pattern so the integrity check does not flag self-modification.
// T0 R10: only the validator's own self-write is allowed.
const SELF_OK = /^(guards|validate-guards)\.txt$/;
const realChanges = changed.filter(c => !SELF_OK.test(c));
const selfChanges = changed.filter(c => SELF_OK.test(c));
if (realChanges.length > 0) {
  fail('evidence-integrity', `AC evidence files modified (non-self): ${realChanges.join(', ')}`);
} else {
  ok('evidence-integrity', `no AC evidence files modified by validation run (${Object.keys(after).length} files scanned${selfChanges.length > 0 ? `; ${selfChanges.length} self-file(s) ignored: ${selfChanges.join(', ')}` : ''})`);
}

// ──────────────────────────────────────────────────────────────────────

out('VALIDATE_GUARDS_RESULT', pass ? 'PASS — guards truly non-mutating, exit codes exact' : 'FAIL — see FAIL lines above');
if (!pass) process.exit(1);
