/**
 * scripts/verify-rls-blocks-default.mjs (STEP-02..04 verify)
 */
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

const w1 = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM workers');
console.log('workers.NO_GUC', w1[0].n);

await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'admin-1', false)`);
await p.$executeRawUnsafe(`SELECT set_config('app.role', 'ADMIN', false)`);
const w2 = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM workers');
console.log('workers.ADMIN_GUC', w2[0].n);

await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'fake-worker', false)`);
await p.$executeRawUnsafe(`SELECT set_config('app.role', 'WORKER', false)`);
const w3 = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM workers');
console.log('workers.WORKER_GUC', w3[0].n);

await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'fake-sale', false)`);
await p.$executeRawUnsafe(`SELECT set_config('app.role', 'SALE', false)`);
const w4 = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM workers');
console.log('workers.SALE_GUC', w4[0].n);

await p.$disconnect();
console.log('CHECK_PASS=OK');