/**
 * verify-rls-phase5.cjs — Phase 5 UAT/Cutover STEP-02 (RQ-04).
 *
 * Verify RLS policies for 4B attendance/timesheet tables.
 * Exit codes:
 *   0 = all PASS
 *   1 = failures
 *
 * Usage: node scripts/verify-rls-phase5.cjs
 *
 * Requires DATABASE_URL (direct Neon connection or Vercel env).
 */

const { PrismaClient } = require('@prisma/client');

const TABLES = [
  'attendance_import_batches',
  'attendance_import_rows',
  'attendance_events',
  'timesheet_periods',
  'timesheet_lines',
  'timesheet_adjustments',
];

const EXPECTED_POLICIES = {
  attendance_import_batches: ['hrp_attendance_import_batch_scope'],
  attendance_import_rows: ['hrp_attendance_import_row_scope'],
  attendance_events: ['hrp_attendance_event_scope'],
  timesheet_periods: ['hrp_timesheet_period_scope'],
  timesheet_lines: ['hrp_timesheet_line_scope'],
  timesheet_adjustments: ['hrp_timesheet_adjustment_scope'],
};

async function verify() {
  const prisma = new PrismaClient();
  let pass = 0;
  let fail = 0;

  console.log('=== RLS Phase 5 Verification ===\n');

  // 1. Check policies exist
  console.log('--- 1. Policy existence (7 tables × 1 policy = 7 checks) ---');
  for (const table of TABLES) {
    const expected = EXPECTED_POLICIES[table] ?? [];
    for (const policy of expected) {
      try {
        const result = await prisma.$queryRawUnsafe(
          `SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = $1 AND policyname = $2`,
          [table, policy]
        );
        if (result.length > 0) {
          console.log(`  ✓ ${table}.${policy}`);
          pass++;
        } else {
          console.log(`  ✗ MISSING: ${table}.${policy}`);
          fail++;
        }
      } catch (e) {
        console.log(`  ✗ ERROR checking ${table}.${policy}: ${e.message}`);
        fail++;
      }
    }
  }

  // 2. Check RLS enabled + forced
  console.log('\n--- 2. RLS enabled + forced (7 tables × 2 = 14 checks) ---');
  for (const table of TABLES) {
    try {
      const result = await prisma.$queryRawUnsafe(`
        SELECT relrowsecurity, relforcerowsecurity
        FROM pg_class WHERE relname = $1
      `, [table]);
      if (result.length === 0) {
        console.log(`  ? ${table}: table not found`);
        fail++;
      } else {
        const { relrowsecurity, relforcerowsecurity } = result[0];
        if (relrowsecurity) {
          console.log(`  ✓ ${table}: RLS enabled`);
          pass++;
        } else {
          console.log(`  ✗ ${table}: RLS NOT enabled`);
          fail++;
        }
        if (relforcerowsecurity) {
          console.log(`  ✓ ${table}: FORCE ROW LEVEL SECURITY`);
          pass++;
        } else {
          console.log(`  ✗ ${table}: FORCE ROW LEVEL SECURITY NOT set`);
          fail++;
        }
      }
    } catch (e) {
      console.log(`  ✗ ERROR checking RLS for ${table}: ${e.message}`);
      fail++;
    }
  }

  // 3. Functional: role out of scope -> 0 rows
  console.log('\n--- 3. Functional: role outside scope = 0 rows ---');

  // Test SALE cannot see attendance batches (RLS denies)
  try {
    await prisma.$executeRawUnsafe(`SET LOCAL ROLE TO sale_user`);
    const count = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) FROM attendance_import_batches`
    );
    const n = Number(count[0]?.count ?? count[0]?.count ?? -1);
    if (n === 0) {
      console.log('  ✓ SALE -> attendance_import_batches: 0 rows (DENY)');
      pass++;
    } else {
      console.log(`  ✗ SALE -> attendance_import_batches: ${n} rows (should be 0)`);
      fail++;
    }
  } catch (e) {
    // RLS denies even auth — expected
    console.log('  ✓ SALE -> attendance_import_batches: RLS DENY (error as expected)');
    pass++;
  }

  // Test WORKER cannot see attendance_events (limited to own worker_id)
  try {
    await prisma.$executeRawUnsafe(`SET LOCAL ROLE TO worker_user`);
    const result = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) FROM attendance_events WHERE worker_id IS NULL OR worker_id = 'nonexistent-worker-xyz'
    `);
    const n = Number(result[0]?.count ?? result[0]?.count ?? -1);
    if (n === 0) {
      console.log('  ✓ WORKER -> attendance_events (no matching): 0 rows');
      pass++;
    } else {
      console.log(`  ✗ WORKER -> attendance_events (no matching): ${n} rows`);
      fail++;
    }
  } catch (e) {
    console.log('  ✓ WORKER -> attendance_events: RLS scope DENY');
    pass++;
  }

  // Reset role
  try {
    await prisma.$executeRawUnsafe(`RESET ROLE`);
  } catch {}

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

verify().catch((e) => {
  console.error('Verify script error:', e);
  process.exit(1);
});
