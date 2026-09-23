// Reproduce on a NEW, dedicated loopback PostgreSQL cluster only.
// HRP_R11_PG_PORT selects that cluster; no credential file is read.
import {spawnSync, execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {Client} from 'pg';
const here = dirname(fileURLToPath(import.meta.url));
const root = execFileSync('git', ['rev-parse','--show-toplevel'], {cwd:here,encoding:'utf8'}).trim();
const port = process.env.HRP_R11_PG_PORT;
assert.match(port ?? '', /^\d{4,5}$/);
assert.ok(+port > 1024 && +port <= 65535);
const url = `postgresql://postgres:probe@127.0.0.1:${port}/postgres`;
const env = {PATH:process.env.PATH, SystemRoot:process.env.SystemRoot, TEMP:process.env.TEMP,
  TMP:process.env.TMP, USERPROFILE:process.env.USERPROFILE, PGPASSWORD:'probe', PG_BASELINE_PASSWORD:'probe',
  DATABASE_URL_ADMIN_TEST:url, DATABASE_URL:url, DATABASE_URL_ADMIN:url,
  EVIDENCE_DIR:here, PRISMA_HIDE_UPDATE_MESSAGE:'1'};
const db = new Client({connectionString:url,connectionTimeoutMillis:3000});
await db.connect();
try {
  const existing = await db.query("SELECT datname FROM pg_database WHERE datname LIKE 'aff05a_r1_%'");
  assert.equal(existing.rowCount, 0, 'Use a fresh isolated cluster; this harness never deletes pre-existing DBs');
} finally { await db.end(); }
const results = [];
function run(name, file, args, extra={}, expected=0) {
  const r = spawnSync(file, args, {cwd:root,env:{...env,...extra},encoding:'buffer',
    shell:file.endsWith('.cmd'),windowsHide:true,timeout:240000,maxBuffer:20*1024*1024});
  const decode = b => new TextDecoder('utf8',{fatal:true}).decode(b ?? new Uint8Array()).replace(/\r\n?/g,'\n');
  const output = decode(r.stdout) + '\nSTDERR:\n' + decode(r.stderr) + `\nEXIT_CODE=${r.status}\n`;
  writeFileSync(join(here,name+'.txt'),output,'utf8');
  const pass = r.status === expected;
  results.push({name,command:[file,...args],exit:r.status,expected,pass});
  console.log(`${name}: exit=${r.status}, expected=${expected}, ${pass?'PASS':'FAIL'}`);
  writeFileSync(join(here,'results.json'),JSON.stringify({node:process.version,results},null,2)+'\n');
  assert.ok(pass,name+' gate failed');
  return output;
}
const node = process.execPath;
run('guards-r11',node,['scripts/ci/validate-guards.mjs']);
for (const mode of ['predecessor-exists','target-exists']) {
  run('collision-'+mode,node,['scripts/ci/verify-collision-integration.mjs','--'+mode]);
}
const injected = run('cleanup-injected-failure',node,
  ['scripts/ci/verify-collision-integration.mjs','--target-exists','--inject-failure'],{},1);
assert.match(injected,/INJECTED_FAILURE_AFTER_FIXTURE/);
assert.match(injected,/OWNED_FIXTURE_CLEANUP=PASS/);
assert.match(injected,/COLLISION_RESULT=FAIL/);
run('ac06-run',node,['scripts/ci/verify-ac06-backfill.mjs'],{MIGRATION_TARGET_DB:'aff05a_r1_test'});
run('ac07-run',node,['scripts/ci/verify-ac07-rollback.mjs'],{MIGRATION_TARGET_DB:'aff05a_r1_migration_test'});
run('ac04-run',node,['scripts/ci/verify-ac07-rollback.mjs','--lock-timeout'],{MIGRATION_TARGET_DB:'aff05a_r1_baseline_test'});
run('lint-r11','npm.cmd',['run','lint']);
run('diff-check','git',['diff','--check']);
console.log('R11_GATES=PASS');
