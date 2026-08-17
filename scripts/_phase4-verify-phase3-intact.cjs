// Verify Phase 3 schema is intact after migration history cleanup
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const tables = await p.$queryRawUnsafe(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name IN ('idempotency_keys','outbox_events','audit_logs','staffing_order_slots','staffing_orders','portal_timesheets')
      ORDER BY table_name
    `);
    console.log('TABLES:', JSON.stringify(tables, null, 2));

    const cols = await p.$queryRawUnsafe(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'audit_logs' AND column_name IN ('reason','ip_address','user_agent')
      ORDER BY column_name
    `);
    console.log('AUDIT_LOG_COLS:', JSON.stringify(cols, null, 2));

    const uniqs = await p.$queryRawUnsafe(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'idempotency_keys'
      ORDER BY indexname
    `);
    console.log('IDX_IDEMPOTENCY:', JSON.stringify(uniqs, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();
