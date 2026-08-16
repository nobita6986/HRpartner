/**
 * scripts/_rollback-rls.mjs (TEMPORARY)
 * Rollback Phase 2 RLS — drop all policies, disable RLS, drop helper functions.
 * Idempotent.
 */
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

const TABLES = [
  'workers', 'dependents', 'source_claims', 'project_assignments',
  'tickets', 'ticket_comments', 'ticket_notifications',
  'outsourcing_projects', 'sites', 'staffing_orders', 'contracts',
  'vendors', 'candidate_submissions', 'vendor_statements', 'vendor_statement_lines',
];

const out = (k, v) => console.log(`${k}=${v}`);

try {
  for (const t of TABLES) {
    await p.$executeRawUnsafe(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    await p.$executeRawUnsafe(`ALTER TABLE ${t} NO FORCE ROW LEVEL SECURITY`);
    out(`DISABLED_RLS`, t);
  }
  // Drop policies (DO block per table)
  for (const t of TABLES) {
    const pols = await p.$queryRawUnsafe(`
      SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=$1
    `, t);
    for (const p_ of pols) {
      await p.$executeRawUnsafe(`DROP POLICY IF EXISTS ${p_.policyname} ON ${t}`);
      out(`DROPPED_POLICY`, `${t}.${p_.policyname}`);
    }
  }
  // Drop helper functions
  const helpers = [
    'hrp_worker_visible(wid text)',
    'hrp_worker_visible_for(wid text)',
    'hrp_worker_writable(wid text)',
    'hrp_session_user_id()',
    'hrp_session_role()',
    'hrp_session_vendor_id()',
    'hrp_session_worker_id()',
  ];
  for (const fn of helpers) {
    try {
      await p.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${fn}`);
      out('DROPPED_FN', fn);
    } catch (e) {
      out('DROP_FN_ERR', fn + ': ' + String(e.message || e).split('\n')[0]);
    }
  }
  out('ROLLBACK_DONE', 'OK');
} catch (e) {
  console.error('ERR=' + String(e.message || e).split('\n')[0]);
  process.exit(1);
} finally {
  await p.$disconnect();
}