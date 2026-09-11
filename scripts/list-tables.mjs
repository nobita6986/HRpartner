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
const tables = await prisma.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
console.log('tables:', tables.map(t => t.tablename).join(', '));
await prisma.$disconnect();
