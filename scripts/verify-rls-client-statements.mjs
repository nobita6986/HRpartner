// scripts/verify-rls-client-statements.mjs
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(`
  SELECT tablename, policyname, cmd
  FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('client_statements', 'client_statement_lines', 'vendor_statements', 'vendor_statement_lines')
  ORDER BY tablename;
`);
console.log('=== RLS policies for statement tables ===');
console.table(rows);
await prisma.$disconnect();