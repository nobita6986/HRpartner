// Phase 4 STEP-21 AC-17 — strong evidence. Use real IDs from DB.
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_ADMIN });

(async () => {
  try {
    // Find real client + 2 users
    const clients = await p.$queryRawUnsafe(`SELECT id FROM client_companies LIMIT 1`);
    const users = await p.$queryRawUnsafe(`SELECT id, role FROM users WHERE role IN ('PM','ADMIN') LIMIT 5`);
    console.log('Real client_id:', clients[0]?.id);
    console.log('Real users:', JSON.stringify(users));

    if (!clients.length || users.length < 2) {
      console.error('NEED at least 1 client + 2 users in DB. ABORT.');
      process.exit(1);
    }

    const realClientId = clients[0].id;
    const pm1 = users.find(u => u.role === 'PM')?.id;
    const admin = users.find(u => u.role === 'ADMIN')?.id || users[0].id;

    const seedProjectId = 'seed-prj-phase4-ac17';
    const otherProjectId = 'seed-prj-other-pm';
    const seedOrderId = 'seed-so-phase4-ac17';
    const seedSlotId = 'seed-slot-phase4-ac17';

    // Cleanup
    await p.$executeRawUnsafe(`DELETE FROM staffing_order_slots WHERE id = '${seedSlotId}'`);
    await p.$executeRawUnsafe(`DELETE FROM staffing_orders WHERE id = '${seedOrderId}'`);
    await p.$executeRawUnsafe(`DELETE FROM outsourcing_projects WHERE id IN ('${seedProjectId}','${otherProjectId}')`);

    // Insert 2 projects (different PMs) — pm1 must exist
    await p.$executeRawUnsafe(`
      INSERT INTO outsourcing_projects (id, code, client_company_id, name, start_date, status, pm_user_id, created_at)
      VALUES
        ('${seedProjectId}', 'PRJ-PHASE4-AC17', '${realClientId}', 'Project PM sees', '2026-08-01', 'ACTIVE', '${pm1}', now()),
        ('${otherProjectId}', 'PRJ-OTHER-PM', '${realClientId}', 'Other PM project', '2026-08-01', 'ACTIVE', '${admin}', now())
    `);

    await p.$executeRawUnsafe(`
      INSERT INTO staffing_orders (id, project_id, code, title, created_at)
      VALUES ('${seedOrderId}', '${seedProjectId}', 'SO-PHASE4-AC17', 'Order PM sees', now())
    `);
    await p.$executeRawUnsafe(`
      INSERT INTO staffing_order_slots (id, staffing_order_id, position_code, position_title, slots_needed, slots_filled, valid_from, created_at)
      VALUES ('${seedSlotId}', '${seedOrderId}', 'ELECTRICIAN', 'Thợ điện', 5, 0, '2026-08-01', now())
    `);
    console.log('FIXTURE inserted (pm1=' + pm1 + ', admin=' + admin + ')');

    const writer = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    const matrix = [];

    const setSession = async (role, userId, vendorId = '', workerId = '') => {
      await writer.$executeRawUnsafe(`SELECT set_config('app.role', '${role}', false)`);
      await writer.$executeRawUnsafe(`SELECT set_config('app.user_id', '${userId}', false)`);
      await writer.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '${vendorId}', false)`);
      await writer.$executeRawUnsafe(`SELECT set_config('app.worker_id', '${workerId}', false)`);
    };

    // ADMIN
    await setSession('ADMIN', admin);
    matrix.push({ role: 'ADMIN', expected: 1, count: await writer.staffingOrderSlot.count() });

    // VENDOR_ADMIN
    await setSession('VENDOR_ADMIN', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
    matrix.push({ role: 'VENDOR_ADMIN', expected: 0, count: await writer.staffingOrderSlot.count() });

    // PM pm1 (manages seedProjectId)
    await setSession('PM', pm1);
    matrix.push({ role: 'PM_pm1', expected: 1, count: await writer.staffingOrderSlot.count() });

    // PM admin (manages otherProjectId only)
    await setSession('PM', admin);
    matrix.push({ role: 'PM_admin', expected: 0, count: await writer.staffingOrderSlot.count() });

    // WORKER
    await setSession('WORKER', '00000000-0000-0000-0000-000000000002', '', '00000000-0000-0000-0000-000000000002');
    matrix.push({ role: 'WORKER', expected: 0, count: await writer.staffingOrderSlot.count() });

    // CTV
    await setSession('CTV', '00000000-0000-0000-0000-000000000003');
    matrix.push({ role: 'CTV', expected: 0, count: await writer.staffingOrderSlot.count() });

    // HR_MANAGER (admin role scope)
    await setSession('HR_MANAGER', admin);
    matrix.push({ role: 'HR_MANAGER', expected: 1, count: await writer.staffingOrderSlot.count() });

    console.log('\nAC-17 MATRIX:');
    console.log('| role        | expected | actual | pass |');
    console.log('|-------------|----------|--------|------|');
    matrix.forEach(m => {
      const pass = m.count === m.expected ? 'PASS' : 'FAIL';
      console.log(`| ${m.role.padEnd(11)} | ${String(m.expected).padEnd(8)} | ${String(m.count).padEnd(6)} | ${pass} |`);
    });

    // Cleanup GUC
    await writer.$executeRawUnsafe(`SELECT set_config('app.role', '', false)`);
    await writer.$executeRawUnsafe(`SELECT set_config('app.user_id', '', false)`);
    await writer.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', false)`);
    await writer.$executeRawUnsafe(`SELECT set_config('app.worker_id', '', false)`);

    // Cleanup fixture
    await p.$executeRawUnsafe(`DELETE FROM staffing_order_slots WHERE id = '${seedSlotId}'`);
    await p.$executeRawUnsafe(`DELETE FROM staffing_orders WHERE id = '${seedOrderId}'`);
    await p.$executeRawUnsafe(`DELETE FROM outsourcing_projects WHERE id IN ('${seedProjectId}','${otherProjectId}')`);
    console.log('FIXTURE cleaned');

    process.exit(0);
  } catch (e) {
    console.error('ERR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();