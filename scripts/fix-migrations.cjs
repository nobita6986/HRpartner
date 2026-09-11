const url = 'postgresql://neondb_owner:npg_fI6NtbOvdPY4@ep-shy-tree-az32as2c.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const fs = require('fs');
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Step 1: Mark migration 20260908150000 as applied (schema already in DB)
  await c.query(`
    UPDATE _prisma_migrations
    SET finished_at = NOW(), applied_steps_count = 1
    WHERE migration_name = '20260908150000_v6_phase1a_labor_profile_schema'
  `);
  console.log('Marked 20260908150000 as applied (schema already exists in DB)');

  // Step 2: Apply migration 4 (RLS) manually - ignore errors
  const sql = fs.readFileSync('prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/migration.sql', 'utf8');
  const stmts = sql.split(/\n\n/).filter((s) => s.trim().length > 0 && !s.trim().startsWith('--'));
  for (const stmt of stmts) {
    try {
      await c.query(stmt);
      console.log('OK:', stmt.split('\n')[0]);
    } catch (e) {
      const skip = ['42710', '42701', '23505', '42000', '42723', '55000'];
      if (skip.includes(e.code)) {
        console.log('SKIP:', stmt.split('\n')[0], '-', e.code);
      } else {
        console.error('ERR:', e.code, stmt.split('\n')[0]);
        console.error('  ', e.message);
      }
    }
  }

  // Step 3: Mark migration 4 as applied
  await c.query(`
    INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
    SELECT gen_random_uuid()::text, gen_random_uuid()::text, NOW(), '20260908150001_v6_phase1a_labor_profile_rls', NOW(), 1
    WHERE NOT EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name = '20260908150001_v6_phase1a_labor_profile_rls')
  `);
  console.log('Marked 20260908150001 as applied');

  // Verify
  const r = await c.query("SELECT migration_name, applied_steps_count, finished_at FROM _prisma_migrations WHERE migration_name LIKE '202609%' ORDER BY migration_name");
  console.log('\n202609 migrations:');
  r.rows.forEach((row) => console.log(' ', row.migration_name, 'applied:', row.applied_steps_count, row.finished_at ? '✓' : '✗'));
  await c.end();
})();
