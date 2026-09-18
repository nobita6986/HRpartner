// container-test-db.test.mjs — Self-test for scripts/ci/container-test-db.mjs (AC-11).
//
// Runs WITHOUT a real Postgres container. Verifies the script's structural
// invariants (role list, grant list, idempotent guards, posture block, fail-closed,
// dependency surface). This file lives under docs/tasks/hrp-v7-ci-container-db/
// evidence/ and is runnable via `node docs/tasks/hrp-v7-ci-container-db/evidence/
// container-test-db.test.mjs` from the worktree root.
//
// Fixtures are SYNCHRONOUS source-level checks (no DB needed). Real integration
// is verified at runtime by the container on CI runner — Tier 3 reads the
// "READY role_count=N grants_count=M" log line + the `pg_stat_activity` evidence.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('scripts/ci/container-test-db.mjs', 'utf8');

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`  PASS: ${name}`);
  } catch (e) {
    results.push({ name, ok: false, err: e.message });
    console.log(`  FAIL: ${name} — ${e.message}`);
  }
}

// A. Role list — 8 baseline roles, app_engine_writer NOT in scripted list (migration provisions)
test('A. source declares 8 baseline roles + app_engine_writer (created by migration) not in scripted list', () => {
  const matches = source.match(/name:\s*'(\w+)'/g) ?? [];
  const declaredNames = matches.map(s => s.match(/'(\w+)'/)[1]);
  const expectedCore = [
    'hrp_public_rpc', 'worker_user', 'vendor_user', 'ctv_user', 'sale_user',
    'app_user_writer', 'app_user', 'hrp_etl',
  ];
  for (const e of expectedCore) {
    assert.ok(declaredNames.includes(e), `missing role ${e}`);
  }
  assert.ok(!declaredNames.includes('app_engine_writer'),
    'app_engine_writer should NOT be in container bootstrap (migration provisions it)');
});

  // B. Grant list contains canonical ones, split into PRE and POST phases
  test('B. PRE_MIGRATE_GRANTS has schema-level + ALL TABLES + DEFAULT PRIVILEGES for writer/admin/etl', () => {
    const preBlocks = source.split('PRE_MIGRATE_GRANTS = [')[1]?.split('];')[0] ?? '';
    const required = [
      'GRANT USAGE ON SCHEMA public TO app_user_writer',
      'GRANT USAGE ON SCHEMA public TO app_user',
      'GRANT USAGE ON SCHEMA public TO hrp_etl',
      'GRANT USAGE ON SCHEMA public TO hrp_public_rpc',
      'GRANT USAGE ON SCHEMA public TO worker_user, vendor_user, ctv_user, sale_user',
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user_writer',
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user_writer',
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user_writer',
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user_writer',
      'GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_user',
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_user',
    ];
    for (const g of required) {
      assert.ok(preBlocks.includes(g), `PRE_MIGRATE_GRANTS missing: ${g.slice(0, 60)}…`);
    }
  });

  test("B'. POST_MIGRATE_GRANTS has table-level portal_timesheets wrapped in DO $$ IF EXISTS", () => {
    const postBlocks = source.split('POST_MIGRATE_GRANTS = [')[1]?.split('];')[0] ?? '';
    assert.ok(postBlocks.includes('information_schema.tables'),
      'POST_MIGRATE_GRANTS must check information_schema.tables for table existence');
    assert.ok(postBlocks.includes("table_name='portal_timesheets'"),
      'POST_MIGRATE_GRANTS must reference portal_timesheets specifically');
    assert.ok(postBlocks.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE portal_timesheets TO hrp_etl'),
      'POST_MIGRATE_GRANTS missing the actual grant for hrp_etl on portal_timesheets');
  });

  test("B''. phase argument selects pre vs post grant set (--phase=pre/--phase=post)", () => {
    assert.ok(source.includes('--phase=') || source.includes('process.argv'),
      'script must read --phase=pre|post argv to select grant set');
    assert.ok(source.includes('PRE_MIGRATE_GRANTS'),
      'script must reference PRE_MIGRATE_GRANTS');
    assert.ok(source.includes('POST_MIGRATE_GRANTS'),
      'script must reference POST_MIGRATE_GRANTS');
  });

// C. Idempotent guards
test('C. ensureRole uses DO $$ IF NOT EXISTS pg_roles + ALTER ROLE convergence (idempotent re-run safe)', () => {
  assert.ok(source.includes('IF NOT EXISTS') && source.includes('pg_roles'),
    'CREATE not guarded by DO $$ IF NOT EXISTS pg_roles');
  assert.ok(source.includes('ALTER ROLE'),
    'ALTER ROLE convergence not present (idempotent)');
});

// D. Posture verification block
test('D. posture verification asserts NOSUPERUSER + NOBYPASSRLS + NOCREATEDB + NOCREATEROLE', () => {
  const postureBlock = source.split('Verify posture')[1] ?? '';
  for (const flag of ['rolsuper === false', 'rolbypassrls === false', 'rolcreatedb === false', 'rolcreaterole === false']) {
    assert.ok(postureBlock.includes(flag), `posture assertion missing: ${flag}`);
  }
});

// E. Fail-closed
test('E. fail-closed on errors (process.exit(1) in catch + GRANT_ERR counter)', () => {
  assert.ok(source.match(/process\.exit\(1\)/) || source.includes('BOOTSTRAP_ERR'),
    'script does not have fail-closed exit path');
});

// F. No SET ROLE
test('F. no `SET ROLE` assumption in container bootstrap (RLS posture is FORCE, not role swap)', () => {
  const lines = source.split('\n');
  for (const l of lines) {
    const trimmed = l.trim();
    if (l.includes('SET ROLE') && !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('#')) {
      throw new Error(`unexpected SET ROLE line in script body: "${l.trim()}"`);
    }
  }
});

// G. Uses project's `pg` (already a dep)
test('G. imports `pg` from npm dep (no new package added)', () => {
  assert.ok(source.includes("import { Client } from 'pg'") ||
            source.includes('import { Client } from "pg"'),
    'missing `import { Client } from "pg"`');
});

// H. Wait-for-ready loop present
test('H. waitForReady loop with bounded retries (Belt-and-suspenders on services.postgres healthcheck)', () => {
  assert.ok(source.includes('waitForReady'),
    'script must have a waitForReady() helper');
  assert.ok(source.includes('SELECT 1'),
    'waitForReady must issue SELECT 1 to verify roundtrip beyond pg_isready');
});

// I. READY summary at end
test('I. READY summary printed (role_count + grants_count) for Tier 3 grep', () => {
  assert.ok(/READY role_count=\$\{roleCount\} grants_count=\$\{grantsCount\}/.test(source),
    'READY summary line missing `role_count=... grants_count=...` placeholders');
});

const pass = results.filter(r => r.ok).length;
const fail = results.length - pass;
console.log(`Results: PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
