/**
 * Run prisma/seed-extra-jobs.sql against the database in DATABASE_URL.
 * Usage: node scripts/run-seed-sql.mjs
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

// Manually load .env.dev (no dotenv dep)
const envPath = path.resolve(process.cwd(), '.env.dev');
try {
  const envText = await readFile(envPath, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL=(.+)$/);
    if (m && !process.env.DATABASE_URL) process.env.DATABASE_URL = m[1].trim();
  }
} catch {}

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL missing'); process.exit(1); }
console.log('[seed-sql] DATABASE_URL host:', new URL(url).host);

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlPath = path.resolve(__dirname, '../prisma/seed-extra-jobs.sql');
const sql = await readFile(sqlPath, 'utf8');

console.log('[seed-sql] running:', sqlPath, '(', sql.length, 'bytes)');

// strip comments (lines starting with --), keep semicolons
const statements = sql
  .split(/;\s*\n/)
  .map(s => s.replace(/^--.*$/gm, '').trim())
  .filter(s => s.length > 0 && s !== 'BEGIN' && s !== 'COMMIT');

let ok = 0;
let err = 0;
for (const stmt of statements) {
  try {
    await prisma.$executeRawUnsafe(stmt);
    ok++;
  } catch (e) {
    err++;
    console.error('[seed-sql] FAILED stmt (first 200 chars):', stmt.slice(0, 200).replace(/\s+/g, ' '));
    console.error('  error:', e.message);
  }
}

console.log(`[seed-sql] done. ${ok} statements ok, ${err} failed.`);

// verify count
const extraProjects = await prisma.project.count({ where: { code: { startsWith: 'EXTRA-2026-' } } });
const extraOrders = await prisma.staffingOrder.count({ where: { code: { startsWith: 'SO-EXTRA-' } } });
const extraSlots = await prisma.staffingOrderSlot.count({ where: { id: { startsWith: 'seed-slot-EXTRA-' } } });
console.log(`[seed-sql] verify: projects=${extraProjects}, orders=${extraOrders}, slots=${extraSlots}`);

await prisma.$disconnect();
process.exit(err > 0 ? 1 : 0);
