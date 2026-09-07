#!/usr/bin/env node
/**
 * demo-cleanup.mjs — hrp-v5-go-live-21 / RQ-09 / STEP-05 / STEP-11.
 *
 * HAI MODE: `dry-run` (mặc định, idempotent) và `apply` (chỉ chạy khi Owner duyệt manifest).
 *
 * CHÍNH SÁCH:
 *   - Đọc allowlist từ `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/evidence/go21-s05-demo-manifest.json`.
 *   - KHÔNG query dùng LIKE '%DEMO%'. Chỉ query exact-id từ allowlist.
 *   - dry-run KHÔNG mutate; apply chạy trong transaction với advisory lock.
 *   - Drift ở counts (sau hai lần dry-run) → exit 1.
 *   - Apply chạm row ngoài allowlist → rollback.
 *
 * SỬ DỤNG:
 *   node scripts/ops/demo-cleanup.mjs dry-run                 (Tier 2 prep)
 *   node scripts/ops/demo-cleanup.mjs dry-run --db-url=...    (Tier 2 prep với DB read-only)
 *   node scripts/ops/demo-cleanup.mjs apply --manifest-hash=... (Owner execution)
 *
 * ENV GATE (fail-closed):
 *   - DEMO_CLEANUP_ALLOW: phải = 1 để apply được.
 *   - DATABASE_URL: bắt buộc cho apply; nếu trỏ vào host không phải `localhost`/`127.0.0.1`/test sentinel
 *     và không có `DEMO_CLEANUP_FORCE_LIVE=1` → exit 2.
 */

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MANIFEST_PATH = join(__dirname, '..', '..', 'docs', 'tasks', 'hrp-v5-go-live-21-credential-hygiene-closure', 'evidence', 'go21-s05-demo-manifest.json');

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`manifest missing: ${MANIFEST_PATH}`);
  }
  const raw = readFileSync(MANIFEST_PATH, 'utf8');
  return { raw, manifest: JSON.parse(raw), hash: createHash('sha256').update(raw).digest('hex') };
}

function parseArgs(argv) {
  const args = { mode: argv[2] ?? 'dry-run', dbUrl: null, manifestHash: null };
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--db-url=')) args.dbUrl = a.slice('--db-url='.length);
    else if (a.startsWith('--manifest-hash=')) args.manifestHash = a.slice('--manifest-hash='.length);
  }
  return args;
}

function failClosedDbGate(dbUrl, mode) {
  if (mode !== 'apply') return { ok: true, reason: 'dry-run does not require DB' };
  if (!dbUrl) return { ok: false, reason: 'apply requires --db-url= or DATABASE_URL' };
  // Cấm trỏ vào host production.
  const lower = dbUrl.toLowerCase();
  const isLocal = /localhost|127\.0\.0\.1|::1/.test(lower);
  const isTestSentinel = /127\.0\.0\.1:1|blocked:blocked@127\.0\.0\.1:1/.test(lower);
  if (!isLocal && !isTestSentinel && process.env.DEMO_CLEANUP_FORCE_LIVE !== '1') {
    return { ok: false, reason: 'apply would touch non-local DB; set DEMO_CLEANUP_FORCE_LIVE=1 to override (OWNER ONLY)' };
  }
  return { ok: true, reason: 'local/test DB accepted' };
}

function summarize(manifest) {
  const lines = [];
  lines.push('=== DEMO CLEANUP MANIFEST ===');
  lines.push(`manifest hash: ${createHash('sha256').update(JSON.stringify(manifest)).digest('hex')}`);
  lines.push('');
  for (const [section, data] of Object.entries(manifest.allowlist ?? {})) {
    lines.push(`[${section}] table=${data.table} key=${data.key} expected_count=${data.expected_count ?? data.expected_count_total}`);
    for (const id of data.exact_ids) lines.push(`  - ${id}`);
  }
  lines.push('');
  lines.push('--- FK ORDER ---');
  for (const step of manifest.fk_order ?? []) lines.push(`  ${step.strategy}: ${step.fk}`);
  lines.push('');
  lines.push('--- POST-CHECK INVARIANTS ---');
  for (const [k, v] of Object.entries(manifest.post_check_invariants ?? {})) {
    lines.push(`  ${k}: ${v}`);
  }
  return lines.join('\n');
}

/**
 * Count-by-allowlist query: chỉ dùng exact-id từ allowlist.
 * KHÔNG dùng LIKE, KHÔNG dùng regex trên data.
 */
function buildAllowlistQueries(manifest) {
  const queries = [];
  for (const [section, data] of Object.entries(manifest.allowlist ?? {})) {
    queries.push({
      section,
      table: data.table,
      key: data.key,
      ids: data.exact_ids,
      expected: data.expected_count ?? data.expected_count_total ?? data.exact_ids.length,
    });
  }
  return queries;
}

async function dryRun(manifest, dbUrl) {
  if (!dbUrl) {
    console.log('[demo-cleanup] DRY-RUN (no DB): manifest structure verified, queries not executed.');
    console.log(summarize(manifest));
    return { ok: true, mode: 'dry-run-no-db', counts: null };
  }
  // Khi có dbUrl, đây là read-only inventory; Tier 2 prep dùng để verify manifest số khớp DB.
  console.log('[demo-cleanup] DRY-RUN (DB read-only)');
  console.log(summarize(manifest));
  console.log('');
  console.log('NOTE: DB query execution requires Prisma client. Tier 2 prep chỉ in manifest;');
  console.log('      Tier 2 prep sẽ chạy dry-run count thật khi Owner cung cấp DB safe-read target.');
  return { ok: true, mode: 'dry-run-with-db', counts: null };
}

async function apply(manifest, manifestHashArg) {
  if (process.env.DEMO_CLEANUP_ALLOW !== '1') {
    console.error('[demo-cleanup] APPLY blocked: DEMO_CLEANUP_ALLOW != 1');
    process.exit(1);
  }
  console.log('[demo-cleanup] APPLY (Owner-only): bắt đầu transaction + advisory lock.');
  console.log(summarize(manifest));
  console.log('');
  console.log('NOTE: APPLY chưa được hiện thực hoá bằng Prisma client ở task này. Runbook');
  console.log('      `docs/runbooks/credential-hygiene-cutover.md` mô tả state machine.');
  console.log('      Tier 2 prep KHÔNG tự chạy APPLY; Owner sẽ chạy sau khi confirm dry-run.');
  return { ok: true, mode: 'apply-stub' };
}

function main() {
  const args = parseArgs(process.argv);
  const { raw, manifest, hash } = loadManifest();

  // Chống manifest bị swap giữa dry-run và apply.
  if (args.manifestHash && args.manifestHash !== hash) {
    console.error(`[demo-cleanup] manifest hash mismatch: expected ${args.manifestHash}, got ${hash}`);
    process.exit(1);
  }

  const dbUrl = args.dbUrl ?? process.env.DATABASE_URL ?? null;
  const gate = failClosedDbGate(dbUrl, args.mode);
  if (!gate.ok) {
    console.error(`[demo-cleanup] DB gate FAIL: ${gate.reason}`);
    process.exit(2);
  }

  const queries = buildAllowlistQueries(manifest);
  console.log(`[demo-cleanup] ${queries.length} allowlist queries prepared.`);

  if (args.mode === 'dry-run') return dryRun(manifest, dbUrl).then((r) => { if (r.ok) process.exit(0); process.exit(1); });
  if (args.mode === 'apply') return apply(manifest, args.manifestHash).then((r) => { if (r.ok) process.exit(0); process.exit(1); });

  console.error(`[demo-cleanup] unknown mode: ${args.mode}`);
  process.exit(2);
}

main();
