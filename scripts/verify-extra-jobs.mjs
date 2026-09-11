import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const envPath = path.resolve(process.cwd(), '.env.dev');
try {
  const envText = await readFile(envPath, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL=(.+)$/);
    if (m && !process.env.DATABASE_URL) process.env.DATABASE_URL = m[1].trim();
  }
} catch {}

const prisma = new PrismaClient();

// Gọi public service qua API giống UI để xác nhận jobs hiện trên board
const rows = await prisma.$queryRawUnsafe(`
  SELECT p.code, p.name AS project_name, p.client_company_name, p.site_address,
         so.code AS order_code, so.status AS order_status, so.deadline_date,
         s.position_title, s.slots_needed, s.slots_filled, s.hourly_rate_vnd,
         s.valid_to
  FROM outsourcing_projects p
  JOIN staffing_orders so ON so.project_id = p.id
  JOIN staffing_order_slots s ON s.staffing_order_id = so.id
  WHERE p.code LIKE 'EXTRA-2026-%'
  ORDER BY p.code
`);
console.log(`Found ${rows.length} rows`);
console.log(JSON.stringify(rows, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
await prisma.$disconnect();
