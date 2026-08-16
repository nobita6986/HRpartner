/**
 * scripts/verify-rls-policies.mjs (STEP-02..04 verify)
 * Verify: 11 Phase 2 tables có ENABLE + FORCE RLS + ít nhất 1 policy.
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const out = (k, v) => console.log(`${k}=${v}`);

const TABLES = [
  'workers', 'dependents', 'source_claims', 'project_assignments',
  'tickets', 'ticket_comments', 'ticket_notifications',
  'outsourcing_projects', 'sites', 'staffing_orders', 'contracts',
  'vendors', 'candidate_submissions', 'vendor_statements', 'vendor_statement_lines',
];

try {
  let totalPolicies = 0;
  for (const t of TABLES) {
    const r = await p.$queryRawUnsafe(`
      SELECT
        (SELECT relrowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = 'public'::regnamespace) AS rls,
        (SELECT relforcerowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = 'public'::regnamespace) AS force
    `, t);
    const pols = await p.$queryRawUnsafe(`
      SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=$1
    `, t);
    out(`${t}.RLS`, r[0]?.rls ?? 'no_table');
    out(`${t}.FORCE`, r[0]?.force ?? 'no_table');
    out(`${t}.POLICIES`, pols.map(p => p.policyname).join(',') || 'NONE');
    totalPolicies += pols.length;
  }
  out('TOTAL_POLICIES', totalPolicies);
} catch (e) {
  console.error('ERR=' + String(e.message || e).split('\n')[0]);
  process.exit(1);
} finally {
  await p.$disconnect();
}