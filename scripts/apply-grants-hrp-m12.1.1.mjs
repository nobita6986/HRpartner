// scripts/apply-grants-hrp-m12.1.1.mjs
// Tier 2 executor for hrp-m12.1.1-db-grants.
//
// Chạy file prisma/grants-hrp-m12.1.1.sql bằng admin connection
// (DATABASE_URL_ADMIN trong .env). Kết quả: app_user_writer sẽ có
// USAGE + SELECT/INSERT/UPDATE/DELETE trên toàn bộ schema public
// + default privileges cho bảng/sequence mới.
//
// Usage: node scripts/apply-grants-hrp-m12.1.1.mjs
//
// Đảm bảo file này idempotent (chạy lại không lỗi): GRANT/ALTER DEFAULT
// PRIVILEGES là idempotent nếu đã áp dụng trước đó.

// Load env vars from .env before other imports.
import './load-env.cjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const adminUrl = process.env.DATABASE_URL_ADMIN;
if (!adminUrl) {
  console.error('ERROR: DATABASE_URL_ADMIN is not set in env.');
  console.error('Set it in .env or pass via env var before running.');
  process.exit(2);
}

const sqlPath = resolve(repoRoot, 'prisma/grants-hrp-m12.1.1.sql');
const sqlText = readFileSync(sqlPath, 'utf8');

const client = new Client({
  connectionString: adminUrl,
  ssl: { rejectUnauthorized: false },
});

const statements = [
  'GRANT USAGE ON SCHEMA public TO app_user_writer',
  'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user_writer',
  'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user_writer',
  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user_writer",
  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user_writer",
];

console.log(`[grants] Connecting as admin…`);
await client.connect();

let success = 0;
let failed = 0;
for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
  try {
    await client.query(stmt);
    console.log(`  OK  · ${preview}…`);
    success++;
  } catch (err) {
    console.error(`  FAIL · ${preview}…`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

await client.end();

console.log(`[grants] Done: ${success} OK, ${failed} FAIL.`);

// Verify: thử SELECT 1 với app_user_writer
const runtimeUrl = process.env.DATABASE_URL;
if (runtimeUrl && failed === 0) {
  console.log(`[verify] Connecting as app_user_writer to sanity-check…`);
  const verifyClient = new Client({
    connectionString: runtimeUrl,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await verifyClient.connect();
    const r = await verifyClient.query('SELECT 1 AS ok');
    console.log(`  SELECT 1 = ${r.rows[0].ok} (connection OK)`);
    await verifyClient.end();
  } catch (err) {
    console.error(`  VERIFY FAIL: ${err.message}`);
  }
}

process.exit(failed === 0 ? 0 : 1);
