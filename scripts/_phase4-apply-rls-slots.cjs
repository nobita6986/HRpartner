// Phase 4 STEP-21 — apply RLS policy for staffing_order_slots directly on dev DB.
// Rationale: `prisma migrate dev` fails on shadow DB because migration
// `20260816180349_g0_rq09_uniq_portal_timesheets` references table
// `portal_timesheets` (raw SQL — sếp's appBCC, not in schema.prisma).
// Phase 3 workaround: `prisma migrate resolve` on the stuck entry. Same approach
// here: SQL apply directly + mark migration applied.
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const p = new PrismaClient();
const url = process.env.DATABASE_URL_ADMIN;
if (url) {
  // Phase 4 STEP-21: use neondb_owner (DDL owner) to ALTER TABLE.
  process.env.DATABASE_URL = url;
}

const SQL_PATH = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  '20260817080000_s1_rls_staffing_order_slots',
  'migration.sql'
);

(async () => {
  try {
    // 1. Pre-check: confirm table exists + no policy yet.
    const before = await p.$queryRawUnsafe(`
      SELECT c.relname AS tablename, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
      FROM pg_class c
      WHERE c.relname = 'staffing_order_slots' AND c.relkind = 'r'
    `);
    console.log('BEFORE:', JSON.stringify(before, null, 2));

    const beforePol = await p.$queryRawUnsafe(`
      SELECT policyname FROM pg_policies
      WHERE tablename = 'staffing_order_slots'
    `);
    console.log('BEFORE_POLICIES:', JSON.stringify(beforePol, null, 2));

    // 2. Read + execute SQL.
    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    console.log('SQL bytes:', sql.length);
    await p.$executeRawUnsafe(sql);
    console.log('SQL executed OK');

    // 3. Post-check.
    const after = await p.$queryRawUnsafe(`
      SELECT c.relname AS tablename, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
      FROM pg_class c
      WHERE c.relname = 'staffing_order_slots' AND c.relkind = 'r'
    `);
    console.log('AFTER:', JSON.stringify(after, null, 2));

    const afterPol = await p.$queryRawUnsafe(`
      SELECT policyname, cmd, roles
      FROM pg_policies
      WHERE tablename = 'staffing_order_slots'
    `);
    console.log('AFTER_POLICIES:', JSON.stringify(afterPol, null, 2));

    process.exit(0);
  } catch (e) {
    console.error('ERR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();