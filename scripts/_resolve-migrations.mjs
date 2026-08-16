/**
 * scripts/_resolve-migrations.mjs (TEMPORARY)
 * Resolve stuck migration (delete failed/in-progress entries OR specific migration by name).
 */
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

const target = process.argv[2]; // optional migration_name to delete

try {
  if (target) {
    const r = await p.$executeRawUnsafe(
      `DELETE FROM _prisma_migrations WHERE migration_name = $1`,
      target,
    );
    console.log(`DELETED=${target}=${r}`);
  } else {
    const r = await p.$executeRawUnsafe(`DELETE FROM _prisma_migrations WHERE finished_at IS NULL`);
    console.log(`DELETED_IN_PROGRESS=${r}`);
  }
} catch (e) {
  console.error('ERR=' + String(e.message || e).split('\n')[0]);
  process.exit(1);
} finally {
  await p.$disconnect();
}