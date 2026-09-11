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
const cols = await prisma.$queryRawUnsafe(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='outsourcing_projects'
  ORDER BY ordinal_position
`);
console.log(JSON.stringify(cols, null, 2));
await prisma.$disconnect();
