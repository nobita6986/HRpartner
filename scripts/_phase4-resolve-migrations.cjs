// Resolve stuck migrations by deleting failed entries from _prisma_migrations.
// Specifically targets entries that reference tables not yet existing in DB.
// Idempotent — re-running is safe.
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const targetMigrations = ['20260816161958_s1_integrity_idem_outbox'];

    // Show current state first
    const before = await p.$queryRawUnsafe(
      `SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count
       FROM _prisma_migrations
       WHERE finished_at IS NULL OR rolled_back_at IS NULL
       ORDER BY started_at DESC
       LIMIT 10`
    );
    console.log('OPEN/BLOCKED migrations before:', JSON.stringify(before, null, 2));

    for (const m of targetMigrations) {
      const res = await p.$executeRawUnsafe(
        `DELETE FROM _prisma_migrations WHERE migration_name = $1`,
        m
      );
      console.log(`Removed ${res} rows for migration_name="${m}"`);
    }

    const after = await p.$queryRawUnsafe(
      `SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '20260816%' OR migration_name LIKE '20260817%' ORDER BY migration_name`
    );
    console.log('Remaining 08/16-08/17 entries:', JSON.stringify(after, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();
