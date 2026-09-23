#!/usr/bin/env node
// Synthetic collision proof only. No migrations or shared/canonical DB cleanup.
// Each CREATE establishes ownership; existing databases are never adopted.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const allowed = new Set(['--predecessor-exists', '--target-exists', '--inject-failure', '--probe']);
const modes = args.filter(a => a === '--predecessor-exists' || a === '--target-exists');
if (args.some(a => !allowed.has(a)) || modes.length !== 1 || new Set(args).size !== args.length) {
  console.error('UNSAFE_FLAG: select exactly one collision mode'); process.exit(3);
}
let admin;
try {
  admin = new URL(process.env.DATABASE_URL_ADMIN_TEST ?? '');
  if (!['postgres:', 'postgresql:'].includes(admin.protocol) ||
      !['localhost', '127.0.0.1', '[::1]', '::1'].includes(admin.hostname)) throw Error('unsafe host');
} catch {
  console.error('UNSAFE_HOST_OR_URL: only explicit loopback PostgreSQL is permitted'); process.exit(3);
}
if (args.includes('--probe')) {
  console.log('GUARD_PASS=loopback url flags; PROBE_OK=no-connection no-evidence'); process.exit(0);
}
admin.pathname = '/postgres';
const mode = modes[0].slice(2);
const inject = args.includes('--inject-failure');
const rid = randomUUID().replaceAll('-', '').slice(0, 8);
const pred = `aff05a_r1_collision_${rid}_pred`;
const target = `aff05a_r1_collision_${rid}_tgt`;
const fixture = mode === 'predecessor-exists' ? pred : target;
const evidence = process.env.EVIDENCE_DIR ??
  join(root, 'docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence');
const childEvidence = join(evidence, '..', 'evidence-tmp', `collision-${rid}`);
const lines = [];
const log = text => { const line = String(text).replace(/\r\n?/g, '\n'); lines.push(line); console.log(line); };
const clients = new Set();
const owned = new Map();
const cluster = new Client({connectionString: admin.toString(), connectionTimeoutMillis: 5000});
let clusterConnected = false;
let failure;
const qi = name => '"' + name.replaceAll('"', '""') + '"';
const dbList = async () => (await cluster.query('SELECT datname, oid FROM pg_database ORDER BY datname')).rows;
async function connect(name) {
  const url = new URL(admin); url.pathname = '/' + name;
  const client = new Client({connectionString: url.toString(), connectionTimeoutMillis:5000});
  clients.add(client);
  await client.connect();
  return client;
}

try {
  mkdirSync(childEvidence, {recursive:true});
  await cluster.connect(); clusterConnected = true;
  await cluster.query("SET statement_timeout = '5s'");
  log(`MODE=${mode}; RID=${rid}; INJECT_FAILURE=${inject}`);
  // Atomic create, no DROP IF EXISTS / retry. Only after success may we own it.
  await cluster.query(`CREATE DATABASE ${qi(fixture)}`);
  owned.set(fixture, null);
  const row = (await cluster.query('SELECT oid FROM pg_database WHERE datname=$1', [fixture])).rows[0];
  assert.ok(row);
  owned.set(fixture, row.oid);
  const held = await connect(fixture);
  await held.query('CREATE TABLE collision_sentinel (id text PRIMARY KEY)');
  await held.query('INSERT INTO collision_sentinel VALUES ($1)', [rid]);
  log('FIXTURE_CREATED_AND_HELD=PASS');
  if (inject) throw Error('INJECTED_FAILURE_AFTER_FIXTURE');

  const baseline = await dbList();
  const entries = [
    ['AC-06', 'verify-ac06-backfill.mjs', []],
    ['AC-07', 'verify-ac07-rollback.mjs', []],
    ['AC-04', 'verify-ac07-rollback.mjs', ['--lock-timeout']],
  ];
  for (const [name, script, flags] of entries) {
    const env = {...process.env, DATABASE_URL_ADMIN_TEST:admin.toString(),
      DATABASE_NAME:pred, MIGRATION_TARGET_DB:target, EVIDENCE_DIR:childEvidence};
    delete env.COLLISION_BYPASS_DB_NAME;
    delete env.COLLISION_PREDECESSOR_NAME;
    const child = spawnSync(process.execPath, [join(root, 'scripts/ci', script), ...flags, '--collision-fixture'],
      {env, encoding:'utf8', timeout:15000, maxBuffer:1024*1024});
    const output = (child.stdout ?? '') + (child.stderr ?? '');
    const marker = mode === 'predecessor-exists' ? 'PREDECESSOR_DB_EXISTS' : 'TARGET_DB_EXISTS';
    assert.equal(child.status, 3, name + ' must reject with exact exit 3');
    assert.ok(output.includes(marker), name + ' missing marker');
    assert.ok(output.includes('refusing to run before builder'), name + ' rejected too late');
    assert.ok(!output.includes('TARGET_DB_CREATED'), name + ' reached builder');
    assert.deepEqual(await dbList(), baseline, name + ' mutated database catalog');
    assert.deepEqual((await held.query('SELECT id FROM collision_sentinel')).rows, [{id:rid}]);
    assert.equal((await held.query('SELECT 1 AS n')).rows[0].n, 1);
    log(`${name}: exit=3 marker=${marker}; catalog/sentinel/held-connection preserved; PASS`);
  }
} catch (error) {
  failure = error;
  log('FAILURE=' + error.message);
} finally {
  // This outer finally covers fixture creation, seeding, children and assertions.
  // Close only our clients. No FORCE, termination, or cleanup of inherited names.
  for (const client of clients) {
    try { await client.end(); }
    catch (error) { failure ??= error; log('CLIENT_CLEANUP_FAIL=' + error.message); }
  }
  if (clusterConnected) {
    for (const [name, oid] of owned) {
      try {
        assert.notEqual(oid, null, 'Cannot prove fixture OID; leave it for explicit inspection');
        const current = (await cluster.query('SELECT oid FROM pg_database WHERE datname=$1', [name])).rows[0];
        assert.equal(current?.oid, oid, 'Fixture identity changed; refusing cleanup');
        await cluster.query(`DROP DATABASE ${qi(name)}`);
        assert.equal((await cluster.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount, 0);
        log('OWNED_FIXTURE_CLEANUP=PASS ' + name);
      } catch (error) {
        failure ??= error;
        log('FIXTURE_CLEANUP_FAIL=' + error.message);
      }
    }
  }
  try { await cluster.end(); }
  catch (error) { failure ??= error; log('CLUSTER_CLOSE_FAIL=' + error.message); }
}
log(failure ? 'COLLISION_RESULT=FAIL' : 'COLLISION_RESULT=PASS');
mkdirSync(evidence, {recursive:true});
writeFileSync(join(evidence, `collision-${mode}${inject ? '-injected-failure' : ''}-r11.txt`), lines.join('\n') + '\n', 'utf8');
process.exitCode = failure ? 1 : 0;
