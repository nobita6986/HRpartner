/**
 * scripts/_inspect-migrations.mjs (TEMPORARY)
 * Inspect _prisma_migrations state.
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const r = await p.$queryRawUnsafe(`SELECT migration_name, finished_at, applied_steps_count FROM _prisma_migrations ORDER BY started_at`);
  for (const row of r) {
    console.log(`${row.migration_name}\t${row.finished_at ?? '(in-progress)'}\tsteps=${row.applied_steps_count}`);
  }
} catch (e) {
  console.error('ERR=' + String(e.message || e).split('\n')[0]);
} finally {
  await p.$disconnect();
}