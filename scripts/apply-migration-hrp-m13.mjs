// scripts/apply-migration-hrp-m13.mjs
// Tier 2 executor for hrp-m13-backend-expansion.
//
// Áp dụng migration prisma/migrations/20260819104701_m13_backend_expansion/migration.sql
// qua DATABASE_URL_ADMIN (user neondb_owner — có quyền CREATE/ALTER).
//
// Script idempotent: nếu cột/constraint đã tồn tại, sẽ bỏ qua (không fail).
//
// Usage: node scripts/apply-migration-hrp-m13.mjs
//
// Sau khi chạy:
//   - Cột sub_pm_user_id_1/2 trên outsourcing_projects + manager_id trên workers được tạo.
//   - 3 FK + 3 index được tạo.
//   - Dữ liệu cũ (DA-2026-018, …) được giữ nguyên (NULL cho các cột mới).
//   - RLS policies hiện hành không cần sửa (chưa tham chiếu cột mới).

import './load-env.cjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const adminUrl = process.env.DATABASE_URL_ADMIN;
if (!adminUrl) {
  console.error('ERROR: DATABASE_URL_ADMIN is not set.');
  process.exit(2);
}

const sqlPath = resolve(
  repoRoot,
  'prisma/migrations/20260819104701_m13_backend_expansion/migration.sql'
);
const sqlText = readFileSync(sqlPath, 'utf8');

// Lọc comments-only lines, giữ SQL statements nguyên vẹn (kể cả multi-line).
// Lưu ý: file migration.sql dùng `;\n` để kết thúc statement. Tách bằng regex
// bảo toàn statement kể cả khi có nhiều statement trên 1 logical block.
const cleaned = sqlText
  .split(/\r?\n/)
  .filter((l) => !/^\s*--/.test(l))
  .join('\n');
const statements = cleaned
  .split(/;\s*(?=\n|$)/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const client = new Client({
  connectionString: adminUrl,
  ssl: { rejectUnauthorized: false },
});

console.log(`[m13] Connecting as admin…`);
await client.connect();

let success = 0;
let skipped = 0;
let failed = 0;

for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
  try {
    await client.query(stmt);
    console.log(`  OK  · ${preview}…`);
    success++;
  } catch (err) {
    const msg = err.message || String(err);
    // Idempotency: nếu column/constraint đã tồn tại → coi như đã áp dụng.
    if (/already exists|duplicate/i.test(msg)) {
      console.log(`  SKIP· ${preview}…  (${msg.split('\n')[0]})`);
      skipped++;
    } else {
      console.error(`  FAIL· ${preview}…`);
      console.error(`        ${msg}`);
      failed++;
    }
  }
}

await client.end();

// Verify post-migration: kiểm tra cột + FK thật sự có trong DB.
console.log(`\n[m13] Verify schema after migration…`);
const verifyClient = new Client({
  connectionString: adminUrl,
  ssl: { rejectUnauthorized: false },
});
await verifyClient.connect();

const checks = [
  {
    label: 'workers.manager_id column',
    sql: "SELECT column_name FROM information_schema.columns WHERE table_name='workers' AND column_name='manager_id'",
    expectMin: 1,
  },
  {
    label: 'outsourcing_projects.sub_pm_user_id_1 column',
    sql: "SELECT column_name FROM information_schema.columns WHERE table_name='outsourcing_projects' AND column_name='sub_pm_user_id_1'",
    expectMin: 1,
  },
  {
    label: 'outsourcing_projects.sub_pm_user_id_2 column',
    sql: "SELECT column_name FROM information_schema.columns WHERE table_name='outsourcing_projects' AND column_name='sub_pm_user_id_2'",
    expectMin: 1,
  },
  {
    label: 'FK workers_manager_id → users.id',
    sql: "SELECT conname FROM pg_constraint WHERE conname='workers_manager_id_fkey'",
    expectMin: 1,
  },
  {
    label: 'FK outsourcing_projects_sub_pm_user_id_1_fkey',
    sql: "SELECT conname FROM pg_constraint WHERE conname='outsourcing_projects_sub_pm_user_id_1_fkey'",
    expectMin: 1,
  },
  {
    label: 'FK outsourcing_projects_sub_pm_user_id_2_fkey',
    sql: "SELECT conname FROM pg_constraint WHERE conname='outsourcing_projects_sub_pm_user_id_2_fkey'",
    expectMin: 1,
  },
];

let verifyOk = 0;
for (const c of checks) {
  try {
    const r = await verifyClient.query(c.sql);
    if (r.rows.length >= c.expectMin) {
      console.log(`  OK  · ${c.label}  (rows=${r.rows.length})`);
      verifyOk++;
    } else {
      console.error(`  FAIL· ${c.label}  (rows=${r.rows.length}, expected ≥ ${c.expectMin})`);
    }
  } catch (err) {
    console.error(`  ERR · ${c.label}  ${err.message}`);
  }
}
await verifyClient.end();

// Sample data integrity check
console.log(`\n[m13] Sample data integrity (cột mới = NULL, dữ liệu cũ giữ nguyên)…`);
const dataClient = new Client({
  connectionString: adminUrl,
  ssl: { rejectUnauthorized: false },
});
await dataClient.connect();
const projSample = await dataClient.query(
  "SELECT code, pm_user_id, sub_pm_user_id_1, sub_pm_user_id_2 FROM outsourcing_projects ORDER BY code LIMIT 3"
);
console.log('  outsourcing_projects sample:');
projSample.rows.forEach((r) =>
  console.log(`    ${r.code}: pm=${r.pm_user_id}, sub1=${r.sub_pm_user_id_1}, sub2=${r.sub_pm_user_id_2}`)
);
const workerSample = await dataClient.query(
  "SELECT full_name, manager_id FROM workers ORDER BY created_at LIMIT 3"
);
console.log('  workers sample:');
workerSample.rows.forEach((r) =>
  console.log(`    ${r.full_name || '(no name)'}: manager=${r.manager_id}`)
);
await dataClient.end();

console.log(`\n[m13] Summary: ${success} applied, ${skipped} skipped (idempotent), ${failed} failed`);
console.log(`[m13] Verify: ${verifyOk}/${checks.length} schema checks passed`);
process.exit(failed === 0 && verifyOk === checks.length ? 0 : 1);
