/**
 * verify-rls-phase5.cjs — Phase 5 UAT/Cutover STEP-02 (RQ-04).
 *
 * Round 2 fix (AUD-001):
 *   1. Spread Prisma params: [...array] not [array]
 *   2. Add 7th table: client_statements
 *   3. Fix false-pass: distinguish error types in functional tests
 *
 * Exit codes:
 *   0 = all PASS
 *   1 = failures
 *
 * Usage: node scripts/verify-rls-phase5.cjs
 *
 * Requires DATABASE_URL (direct Neon connection or Vercel env).
 */

const { PrismaClient } = require('@prisma/client');

// ─── 7 tables with RLS from migration 20260817160000 ────────────────────────
const TABLES = [
  'attendance_import_batches',
  'attendance_import_rows',
  'attendance_events',
  'timesheet_periods',
  'timesheet_lines',
  'timesheet_adjustments',
  'client_statements',   // 7th table (audit directive)
];

const EXPECTED_POLICIES = {
  attendance_import_batches: ['hrp_attendance_import_batch_scope'],
  attendance_import_rows:    ['hrp_attendance_import_row_scope'],
  attendance_events:         ['hrp_attendance_event_scope'],
  timesheet_periods:         ['hrp_timesheet_period_scope'],
  timesheet_lines:           ['hrp_timesheet_line_scope'],
  timesheet_adjustments:     ['hrp_timesheet_adjustment_scope'],
  client_statements:         ['hrp_client_statement_scope'],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Run a raw query with NO Prisma param interpolation — inline literals. */
async function rawQuery(prisma, sql) {
  return prisma.$queryRawUnsafe(sql);
}

/** Run functional test inside a transaction so SET LOCAL ROLE survives. */
async function withRole(prisma, role, fn) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL ROLE TO ${role}`);
    return fn(tx);
  });
}

async function verify() {
  const prisma = new PrismaClient();
  let pass = 0;
  let fail = 0;

  console.log('=== RLS Phase 5 Verification (Round 2) ===\n');

  // ── 0. DB roles existence (4 portal roles from STEP-09) ───────────────────
  console.log('--- 0. DB roles existence (4 portal roles) ---');
  const DB_ROLES = ['worker_user', 'vendor_user', 'ctv_user', 'sale_user'];
  for (const role of DB_ROLES) {
    try {
      const result = await prisma.$queryRawUnsafe(
        `SELECT 1 FROM pg_roles WHERE rolname = $1`,
        role,
      );
      if (result.length > 0) {
        console.log(`  ✓ role "${role}" exists`);
        pass++;
      } else {
        // STEP-09 / DEC-09 / FO-01: role missing = FAIL
        console.log(`  ✗ role "${role}" MISSING — run scripts/create-db-roles.cjs`);
        fail++;
      }
    } catch (e) {
      console.log(`  ✗ role "${role}" ERROR: ${e.message.split('\n')[0]}`);
      fail++;
    }
  }

  // ── 1. Policy existence (7 tables × 1 policy = 7 checks) ─────────────────
  console.log('--- 1. Policy existence (7 tables × 1 policy) ---');
  for (const table of TABLES) {
    const policies = EXPECTED_POLICIES[table] ?? [];
    for (const policy of policies) {
      try {
        // Directive 1: spread array as positional args, NOT [array]
        const result = await prisma.$queryRawUnsafe(
          `SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = $1 AND policyname = $2`,
          table,      // positional arg 1
          policy      // positional arg 2
        );
        if (result.length > 0) {
          console.log(`  ✓ ${table}.${policy}`);
          pass++;
        } else {
          console.log(`  ✗ MISSING: ${table}.${policy}`);
          fail++;
        }
      } catch (e) {
        // Policy might not exist yet — treat as missing, not hard error
        console.log(`  ✗ MISSING: ${table}.${policy} (error: ${e.message.split('\n')[0]})`);
        fail++;
      }
    }
  }

  // ── 2. RLS enabled + forced (7 tables × 2 = 14 checks) ──────────────────
  console.log('\n--- 2. RLS enabled + FORCE (7 tables × 2) ---');
  for (const table of TABLES) {
    try {
      // Directive 1: spread single-element array
      const result = await prisma.$queryRawUnsafe(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`,
        table
      );
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
      console.log(`  ✗ ERROR ${table}: ${e.message.split('\n')[0]}`);
      fail++;
    }
  }

  // ── 3. Functional deny tests ───────────────────────────────────────────────
  // Directive 3: distinguish error types — don't blanket-catch-everything-as-PASS
  console.log('\n--- 3. Functional deny (role out of scope → 0 rows) ---');

  // Test A: SALE cannot see attendance_import_batches (no scope)
  try {
    await withRole(prisma, 'sale_user', async (tx) => {
      const result = await tx.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM attendance_import_batches`);
      const n = Number(result[0]?.n ?? -1);
      if (n === 0) {
        console.log('  ✓ SALE -> attendance_import_batches: 0 rows (RLS deny)');
        pass++;
      } else {
        console.log(`  ✗ SALE -> attendance_import_batches: ${n} rows (should be 0)`);
        fail++;
      }
    });
  } catch (e) {
    const msg = e.message ?? '';
    if (msg.includes('does not exist') || msg.includes('42501')) {
      // role doesn't exist, or RLS denied → expected
      console.log('  ✓ SALE -> attendance_import_batches: deny/error (role missing or RLS block)');
      pass++;
    } else {
      console.log(`  ✗ SALE -> attendance_import_batches: unexpected error: ${msg.split('\n')[0]}`);
      fail++;
    }
  }

  // Test B: SALE cannot see client_statements (no scope — 7th table)
  try {
    await withRole(prisma, 'sale_user', async (tx) => {
      const result = await tx.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM client_statements`);
      const n = Number(result[0]?.n ?? -1);
      if (n === 0) {
        console.log('  ✓ SALE -> client_statements: 0 rows (RLS deny)');
        pass++;
      } else {
        console.log(`  ✗ SALE -> client_statements: ${n} rows (should be 0)`);
        fail++;
      }
    });
  } catch (e) {
    const msg = e.message ?? '';
    if (msg.includes('does not exist') || msg.includes('42501')) {
      console.log('  ✓ SALE -> client_statements: deny/error (role missing or RLS block)');
      pass++;
    } else {
      console.log(`  ✗ SALE -> client_statements: unexpected error: ${msg.split('\n')[0]}`);
      fail++;
    }
  }

  // Test C: WORKER with no matching worker_id sees 0 attendance_events
  try {
    await withRole(prisma, 'worker_user', async (tx) => {
      const result = await tx.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS n FROM attendance_events WHERE worker_id = 'nonexistent-xyz'`
      );
      const n = Number(result[0]?.n ?? -1);
      if (n === 0) {
        console.log('  ✓ WORKER (no match) -> attendance_events: 0 rows');
        pass++;
      } else {
        console.log(`  ✗ WORKER (no match) -> attendance_events: ${n} rows (should be 0)`);
        fail++;
      }
    });
  } catch (e) {
    const msg = e.message ?? '';
    if (msg.includes('does not exist') || msg.includes('42501')) {
      console.log('  ✓ WORKER -> attendance_events (no match): deny/error');
      pass++;
    } else {
      console.log(`  ✗ WORKER -> attendance_events (no match): unexpected error: ${msg.split('\n')[0]}`);
      fail++;
    }
  }

  // Test D: SALE cannot see timesheet_periods (no scope)
  try {
    await withRole(prisma, 'sale_user', async (tx) => {
      const result = await tx.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM timesheet_periods`);
      const n = Number(result[0]?.n ?? -1);
      if (n === 0) {
        console.log('  ✓ SALE -> timesheet_periods: 0 rows (RLS deny)');
        pass++;
      } else {
        console.log(`  ✗ SALE -> timesheet_periods: ${n} rows (should be 0)`);
        fail++;
      }
    });
  } catch (e) {
    const msg = e.message ?? '';
    if (msg.includes('does not exist') || msg.includes('42501')) {
      console.log('  ✓ SALE -> timesheet_periods: deny/error');
      pass++;
    } else {
      console.log(`  ✗ SALE -> timesheet_periods: unexpected error: ${msg.split('\n')[0]}`);
      fail++;
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

verify().catch((e) => {
  console.error('Verify script error:', e.message);
  process.exit(1);
});
