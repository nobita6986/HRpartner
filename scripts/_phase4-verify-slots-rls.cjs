// Phase 4 STEP-21 AC-17 — verify policy scoping on dev DB.
// Test: VENDOR role + project they have NO scope on → 0 slot row.
//       ADMIN → all slots visible.
const { PrismaClient } = require('@prisma/client');

const url = process.env.DATABASE_URL; // app_user_writer
const p = new PrismaClient({ datasourceUrl: url });

(async () => {
  try {
    // 1. Set role to ADMIN, count slots.
    await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'seed-user-admin', false)`);
    await p.$executeRawUnsafe(`SELECT set_config('app.role', 'ADMIN', false)`);
    await p.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', false)`);
    const adminCount = await p.staffingOrderSlot.count();
    console.log('ADMIN slot count:', adminCount);

    // 2. Set role to VENDOR (vendor_admin from seed) — should not see slots
    //    (vendor has no project visibility; hrp_project_visible_for('prj') = false)
    await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'seed-user-vendor_admin', false)`);
    await p.$executeRawUnsafe(`SELECT set_config('app.role', 'VENDOR_ADMIN', false)`);
    await p.$executeRawUnsafe(`SELECT set_config('app.vendor_id', 'seed-vendor-001', false)`);
    const vendorCount = await p.staffingOrderSlot.count();
    console.log('VENDOR_ADMIN slot count (should be 0 — no project scope):', vendorCount);

    // 3. Set role to PM of project 1, see slots in that project.
    await p.$executeRawUnsafe(`SELECT set_config('app.user_id', 'seed-user-pm', false)`);
    await p.$executeRawUnsafe(`SELECT set_config('app.role', 'PM', false)`);
    await p.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', false)`);
    const pmCount = await p.staffingOrderSlot.count();
    console.log('PM slot count (only projects they manage):', pmCount);

    // 4. Reset session GUCs.
    await p.$executeRawUnsafe(`SELECT set_config('app.role', '', false)`);
    await p.$executeRawUnsafe(`SELECT set_config('app.user_id', '', false)`);
    process.exit(0);
  } catch (e) {
    console.error('ERR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();