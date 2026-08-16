// AC-01 catalog query — verify Phase 3 STEP-01
// Idempotent: chạy nhiều lần OK, không ghi gì vào DB.
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const cols = await p.$queryRawUnsafe(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='audit_logs' AND column_name IN ('reason','ip_address','user_agent') ORDER BY column_name"
    );
    console.log('AUDIT_COLS=', JSON.stringify(cols));

    const iKeys = await p.$queryRawUnsafe(
      "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid='idempotency_keys'::regclass AND contype='u'"
    );
    console.log('IDEM_UNIQUE=', JSON.stringify(iKeys));

    const oIdx = await p.$queryRawUnsafe(
      "SELECT indexname FROM pg_indexes WHERE tablename='outbox_events' ORDER BY indexname"
    );
    console.log('OUTBOX_INDEX=', JSON.stringify(oIdx));

    const iCols = await p.$queryRawUnsafe(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='idempotency_keys' ORDER BY ordinal_position"
    );
    console.log('IDEM_COLS=', JSON.stringify(iCols));

    const oCols = await p.$queryRawUnsafe(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='outbox_events' ORDER BY ordinal_position"
    );
    console.log('OUTBOX_COLS=', JSON.stringify(oCols));
  } finally {
    await p.$disconnect();
  }
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
