// scripts/verify-rls-policies.mjs -- uses Prisma to query pg_policies
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(`
  SELECT tablename, policyname, cmd
  FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN (
      'attendance_import_batches',
      'attendance_import_rows',
      'attendance_events',
      'timesheet_periods',
      'timesheet_lines',
      'timesheet_adjustments'
    )
  ORDER BY tablename;
`);
console.log('=== RLS policies for slice 4B tables ===');
console.table(rows);
await prisma.$disconnect();