/**
 * scripts/verify-rls-real-roles.mjs (STEP-02..04 verify)
 */
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const out = (k, v) => console.log(`${k}=${v}`);

try {
  // List workers với account link
  const workers = await p.$queryRawUnsafe(`
    SELECT w.id, w.user_id, w.full_name, w.owner_id, w.assigned_to_id
    FROM workers w LIMIT 5
  `);
  out('WORKERS_FOUND', workers.length);
  for (const w of workers) {
    console.log(`WORKER id=${w.id} userId=${w.user_id} owner=${w.owner_id} assignedTo=${w.assigned_to_id}`);
  }

  // ADMIN role → thấy hết
  await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'seed-user-admin', false)`);
  await p.$executeRawUnsafe(`SELECT set_config('app.role', 'ADMIN', false)`);
  await p.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', false)`);
  const w1 = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM workers');
  out('ADMIN.workers', w1[0].n);

  // PM with no project → thấy 0 workers
  await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'seed-user-pm', false)`);
  await p.$executeRawUnsafe(`SELECT set_config('app.role', 'PM', false)`);
  await p.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', false)`);
  const w2 = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM workers');
  out('PM.workers', w2[0].n);

  // SALE - thấy 0 vì workers không owned by seed-user-sale
  await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'seed-user-sale', false)`);
  await p.$executeRawUnsafe(`SELECT set_config('app.role', 'SALE', false)`);
  const w3 = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM workers');
  out('SALE.workers', w3[0].n);

  // MKT - thấy 0 (MKT không scope Worker)
  await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'seed-user-mkt', false)`);
  await p.$executeRawUnsafe(`SELECT set_config('app.role', 'MKT', false)`);
  const w4 = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM workers');
  out('MKT.workers', w4[0].n);

  // HR_STAFF with no assignments - thấy 0
  await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'seed-user-hr_staff', false)`);
  await p.$executeRawUnsafe(`SELECT set_config('app.role', 'HR_STAFF', false)`);
  const w5 = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM workers');
  out('HR_STAFF.workers', w5[0].n);

  // CTV with no claims - thấy 0
  await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'seed-user-ctv', false)`);
  await p.$executeRawUnsafe(`SELECT set_config('app.role', 'CTV', false)`);
  const w6 = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM workers');
  out('CTV.workers', w6[0].n);

  // VENDOR_ADMIN no vendor → thấy 0
  await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'seed-user-vendor_admin', false)`);
  await p.$executeRawUnsafe(`SELECT set_config('app.role', 'VENDOR_ADMIN', false)`);
  await p.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', false)`);
  const w7 = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM workers');
  out('VENDOR_ADMIN.workers', w7[0].n);

  // ACCOUNTANT - không thuộc matrix workers
  await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'seed-user-accountant', false)`);
  await p.$executeRawUnsafe(`SELECT set_config('app.role', 'ACCOUNTANT', false)`);
  const w8 = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM workers');
  out('ACCOUNTANT.workers', w8[0].n);

  // RESET
  await p.$executeRawUnsafe(`SELECT set_config('app.role', '', false)`);
} catch (e) {
  console.error('ERR=' + String(e.message || e).split('\n').slice(0, 5).join(' | '));
  process.exit(1);
} finally {
  await p.$disconnect();
}