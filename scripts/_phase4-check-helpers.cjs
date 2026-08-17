// Verify RLS helper functions exist in dev DB
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const r = await p.$queryRawUnsafe(`
      SELECT proname, pronargs::int
      FROM pg_proc
      WHERE proname IN (
        'hrp_project_visible_for','hrp_project_writable',
        'hrp_worker_visible_for','hrp_worker_writable',
        'hrp_session_role','hrp_session_user_id','hrp_session_vendor_id','hrp_session_worker_id'
      )
      ORDER BY proname
    `);
    console.log(JSON.stringify(r, null, 2));

    const policyCheck = await p.$queryRawUnsafe(`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE tablename IN ('staffing_orders','candidate_submissions','source_claims','staffing_order_slots')
      ORDER BY tablename, policyname
    `);
    console.log('POLICIES:', JSON.stringify(policyCheck, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();
