#!/usr/bin/env node
/**
 * scripts/runtime/run-p1-e2e-pipeline.mjs
 *
 * Orchestrator for ONE P1 final runtime E2E pipeline (T0 §C).
 * Runs: posture preflight → synthetic fixture → canonical E2E → exact-ID teardown.
 * Captures stdout/stderr per stage to utf8-noBOM files in evidenceDir.
 * Returns non-zero exit if any stage fails.
 *
 * Usage:
 *   node scripts/runtime/run-p1-e2e-pipeline.mjs <runNumber> <evidenceDir>
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [, , runNumberArg, evidenceDirArg] = process.argv;
if (!runNumberArg || !evidenceDirArg) {
  console.error('Usage: run-p1-e2e-pipeline.mjs <runNumber> <evidenceDir>');
  process.exit(2);
}

const runNumber = Number(runNumberArg);
const evidenceDir = evidenceDirArg;
const WT = process.cwd();

if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

const runLogPath = path.join(evidenceDir, `run-${runNumber}.log`);
fs.writeFileSync(runLogPath, '', 'utf8');

function append(line) {
  fs.appendFileSync(runLogPath, line + '\n', 'utf8');
  process.stdout.write(line + '\n');
}

function runStage(label, cmd, args, parseFixture = false) {
  append(`\n=== stage: ${label} ===`);
  const r = spawnSync(cmd, args, {
    cwd: WT,
    encoding: 'utf8',
    env: process.env,
    shell: false,
  });
  const stdout = r.stdout ?? '';
  const stderr = r.stderr ?? '';
  const stdoutPath = path.join(evidenceDir, `run-${runNumber}-${label}.stdout`);
  const stderrPath = path.join(evidenceDir, `run-${runNumber}-${label}.stderr`);
  fs.writeFileSync(stdoutPath, stdout, 'utf8');
  fs.writeFileSync(stderrPath, stderr, 'utf8');
  append(`[${label}] exit=${r.status ?? 'null'} stdout=${stdout.length}B stderr=${stderr.length}B`);
  if (stdout) {
    append(`--- ${label} stdout (first 200 lines) ---`);
    const head = stdout.split('\n').slice(0, 200);
    for (const ln of head) append(ln);
    if (stdout.split('\n').length > 200) append(`... (${stdout.split('\n').length - 200} more lines truncated for runLog)`);
  }
  if (stderr) {
    append(`--- ${label} stderr (first 100 lines) ---`);
    const head = stderr.split('\n').slice(0, 100);
    for (const ln of head) append(ln);
  }
  if (parseFixture) {
    const a = stdout.indexOf('{');
    const b = stdout.lastIndexOf('}');
    if (a < 0 || b < 0) {
      append(`[${label}] FAIL could not locate JSON braces in stdout`);
      return { exit: 2, fixturePath: null };
    }
    try {
      const j = JSON.parse(stdout.slice(a, b + 1));
      return { exit: r.status ?? 2, fixturePath: j.fixtureFile ?? null };
    } catch (e) {
      append(`[${label}] FAIL JSON parse: ${e.message}`);
      return { exit: 2, fixturePath: null };
    }
  }
  return { exit: r.status ?? 2, fixturePath: null };
}

const results = { posture: 0, fixture: 0, e2e: 0, teardown: 0 };

const postureRes = runStage('posture', 'node', ['scripts/runtime/db-posture-preflight.mjs'], false);
results.posture = postureRes.exit;

const fixtureRes = runStage('fixture', 'node', ['scripts/runtime/synthetic-fixture.mjs'], true);
results.fixture = fixtureRes.exit;
const fixturePath = fixtureRes.fixturePath;
append(`fixturePath=${fixturePath ?? '(none)'}`);

if (fixturePath) {
  const e2eRes = runStage('e2e', 'node', ['scripts/runtime/p1-final-runtime-e2e.mjs', fixturePath], false);
  results.e2e = e2eRes.exit;
  const tdRes = runStage('teardown', 'node', ['scripts/runtime/exact-id-teardown.mjs', fixturePath], false);
  results.teardown = tdRes.exit;
} else {
  append('[e2e] SKIPPED fixturePath missing');
  append('[teardown] SKIPPED fixturePath missing');
}
const allOk = results.posture === 0 && results.fixture === 0 && results.e2e === 0 && results.teardown === 0;
fs.writeFileSync(
  path.join(evidenceDir, `run-${runNumber}-summary.json`),
  JSON.stringify(results, null, 2),
  'utf8',
);

if (!allOk) {
  append('RUN FAIL');
  process.exit(1);
}
append('RUN OK');
process.exit(0);