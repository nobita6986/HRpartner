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
const rows = await prisma.$queryRawUnsafe("SELECT id, code, name FROM client_companies ORDER BY code");
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
