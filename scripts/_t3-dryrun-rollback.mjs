/**
 * scripts/_t3-dryrun-rollback.mjs (TEMPORARY, audit-only)
 * Audit-side dry-run for _rollback-rls.mjs: chỉ ĐỌC pg_policies, pg_class,
 * pg_proc để xác minh danh sách đối tượng sẽ bị ảnh hưởng nếu rollback thực thi.
 * Không ALTER, không DROP. Idempotent.
 */
import { PrismaClient } from '@prisma/client';

const TABLES = [
  'workers', 'dependents', 'source_claims', 'project_assignments',
  'tickets', 'ticket_comments', 'ticket_notifications',
  'outsourcing_projects', 'sites', 'staffing_orders', 'contracts',
  'vendors', 'candidate_submissions', 'vendor_statements', 'vendor_statement_lines',
];
const HELPERS = [
  'hrp_worker_visible(wid text)',
  'hrp_worker_visible_for(wid text)',
  'hrp_worker_writable(wid text)',
  'hrp_session_user_id()',
  'hrp_session_role()',
  'hrp_session_vendor_id()',
  'hrp_session_worker_id()',
];

const p = new PrismaClient();
const out = (k, v) => console.log(`${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`);

try {
  // Snapshot trạng thái trước khi rollback (would-be state)
  const rlsState = await p.$queryRawUnsafe(
    "SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class " +
    "WHERE relname = ANY($1::text[]) ORDER BY relname",
    TABLES
  );
  out('RLS_STATE_BEFORE', rlsState);

  const pols = await p.$queryRawUnsafe(
    "SELECT tablename, policyname, cmd FROM pg_policies " +
    "WHERE schemaname='public' AND tablename = ANY($1::text[]) ORDER BY tablename, policyname",
    TABLES
  );
  out('POLICY_COUNT', pols.length);
  out('POLICIES', pols);

  const fns = await p.$queryRawUnsafe(
    "SELECT proname, pg_get_function_identity_arguments(oid) AS args FROM pg_proc " +
    "WHERE proname = ANY($1::text[]) ORDER BY proname",
    HELPERS.map((s) => s.split('(')[0])
  );
  out('FN_COUNT', fns.length);
  out('FUNCTIONS', fns);

  // Liệt kê steps sẽ chạy nếu rollback thực thi (mirror _rollback-rls.mjs, no-op)
  out('WOULD_DISABLE_RLS', TABLES.length + ' tables');
  out('WOULD_DROP_POLICY', pols.length + ' policies across ' + new Set(pols.map((p_) => p_.tablename)).size + ' tables');
  out('WOULD_DROP_FN', fns.length + ' helper functions (asked: ' + HELPERS.length + ')');
  out('DRYRUN_DONE', 'OK — READ-ONLY, no DDL executed');
} catch (e) {
  console.error('ERR=' + String(e.message || e).split('\n')[0]);
  process.exit(1);
} finally {
  await p.$disconnect();
}
