/**
 * scripts/seed-public-jobs.mjs
 *
 * Y10.4/UI04g Owner directive 11/09/2026 09:25:
 * Seed 5 ClientCompany + 5 Project + 5 StaffingOrder + 5 StaffingOrderSlot
 * để trang chủ hiển thị jobs thật (không còn DEMO/INTEGRATION_PENDING fixture).
 *
 * Idempotent: dùng code unique để find-then-create/update.
 * Dùng DATABASE_URL_ADMIN (bypass RLS) — giống pattern prisma/seed.mjs.
 *
 * Run: node scripts/seed-public-jobs.mjs
 */

import { PrismaClient } from '@prisma/client';

// Y10.4/UI04g: dùng DATABASE_URL_ADMIN từ .env.dev (neondb_owner, bypass RLS).
// .env runtime URL = app_user_writer (RLS, không ghi được).
const adminUrl = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL;
if (!adminUrl) {
  console.error('[seed] No DATABASE_URL_ADMIN or DATABASE_URL');
  process.exit(1);
}
const seedUrl = new URL(adminUrl);
seedUrl.searchParams.set('connection_limit', '1');
const prisma = new PrismaClient({ datasources: { db: { url: seedUrl.toString() } } });

const COMPANIES = [
  { code: 'CC-NB-001', name: 'Công ty TNHH Công nghệ Yên Phong', taxCode: '2300123456', industry: 'Điện tử', companySize: 'ENTERPRISE' },
  { code: 'CC-NB-002', name: 'Nhà máy Dệt may Tiên Sơn', taxCode: '2300234567', industry: 'Dệt may', companySize: 'LARGE' },
  { code: 'CC-NB-003', name: 'Công ty CP Chế biến Thực phẩm Thành Phong', taxCode: '2300345678', industry: 'Thực phẩm', companySize: 'MEDIUM' },
  { code: 'CC-NB-004', name: 'Công ty TNHH Logistics Quế Võ', taxCode: '2300456789', industry: 'Logistics', companySize: 'LARGE' },
  { code: 'CC-NB-005', name: 'Nhà máy Cơ khí Gia Bình', taxCode: '2300567890', industry: 'Cơ khí', companySize: 'MEDIUM' },
];

const PROJECTS = [
  {
    code: 'PRJ-2026-001',
    companyIdx: 0,
    name: 'Tuyển công nhân lắp ráp linh kiện điện tử',
    siteAddress: 'KCN Yên Phong, Bắc Ninh',
    startDate: '2026-09-15',
    positions: [{ code: 'ASSEMBLER', title: 'Công nhân lắp ráp', needed: 25, rate: 28000, shift: '07:30-16:30' }],
  },
  {
    code: 'PRJ-2026-002',
    companyIdx: 1,
    name: 'Tuyển công nhân may công nghiệp',
    siteAddress: 'KCN Tiên Sơn, Bắc Ninh',
    startDate: '2026-09-20',
    positions: [
      { code: 'SEAMSTRESS', title: 'Công nhân may', needed: 30, rate: 25000, shift: '07:00-16:00' },
    ],
  },
  {
    code: 'PRJ-2026-003',
    companyIdx: 2,
    name: 'Tuyển công nhân đóng gói thực phẩm',
    siteAddress: 'KCN Thành Phong, Bắc Ninh',
    startDate: '2026-09-10',
    positions: [{ code: 'PACKER', title: 'Công nhân đóng gói', needed: 18, rate: 24000, shift: '06:00-15:00' }],
  },
  {
    code: 'PRJ-2026-004',
    companyIdx: 3,
    name: 'Tuyển nhân viên kho vận',
    siteAddress: 'KCN Quế Võ, Bắc Ninh',
    startDate: '2026-09-25',
    positions: [
      { code: 'WAREHOUSE', title: 'Nhân viên kho', needed: 12, rate: 26000, shift: '08:00-17:00' },
    ],
  },
  {
    code: 'PRJ-2026-005',
    companyIdx: 4,
    name: 'Tuyển thợ hàn và cơ khí',
    siteAddress: 'KCN Gia Bình, Bắc Ninh',
    startDate: '2026-09-30',
    positions: [{ code: 'WELDER', title: 'Thợ hàn', needed: 15, rate: 35000, shift: '07:00-16:00' }],
  },
];

async function upsertCompanies() {
  const ids = [];
  for (const c of COMPANIES) {
    const existing = await prisma.clientCompany.findUnique({ where: { code: c.code } });
    if (existing) {
      ids.push(existing.id);
      console.log(`[seed] Company exists: ${c.code}`);
    } else {
      const created = await prisma.clientCompany.create({ data: c });
      ids.push(created.id);
      console.log(`[seed] Company created: ${c.code}`);
    }
  }
  return ids;
}

async function upsertProject(p, clientCompanyId, companyName) {
  const existing = await prisma.project.findUnique({ where: { code: p.code } });
  let project;
  if (existing) {
    project = await prisma.project.update({
      where: { id: existing.id },
      data: {
        name: p.name,
        siteAddress: p.siteAddress,
        startDate: new Date(p.startDate),
        endDate: null,
        status: 'ACTIVE',
        isPublic: true,
        clientCompanyName: companyName, // Y10.4/UI04g: denormalize so MKT can render
        quota: p.positions.reduce((s, pos) => s + pos.needed, 0),
        filled: 0,
        budgetVnd: BigInt(p.positions.reduce((s, pos) => s + pos.rate * 8 * 26 * pos.needed, 0)),
      },
    });
    console.log(`[seed] Project updated: ${p.code}`);
  } else {
    project = await prisma.project.create({
      data: {
        code: p.code,
        clientCompanyId,
        name: p.name,
        siteAddress: p.siteAddress,
        startDate: new Date(p.startDate),
        status: 'ACTIVE',
        isPublic: true,
        clientCompanyName: companyName,
        quota: p.positions.reduce((s, pos) => s + pos.needed, 0),
        filled: 0,
        budgetVnd: BigInt(p.positions.reduce((s, pos) => s + pos.rate * 8 * 26 * pos.needed, 0)),
      },
    });
    console.log(`[seed] Project created: ${p.code}`);
  }
  return project;
}

async function upsertOrder(project, p, idx) {
  const orderCode = `SO-${p.code.split('-').pop()}-${idx + 1}`;
  const existing = await prisma.staffingOrder.findUnique({ where: { code: orderCode } });
  let order;
  const deadline = new Date(p.startDate);
  deadline.setDate(deadline.getDate() + 14);
  if (existing) {
    order = await prisma.staffingOrder.update({
      where: { id: existing.id },
      data: {
        title: `Tuyển ${p.positions.length} vị trí — ${p.name.replace(/^Tuyển\s+/, '')}`,
        status: 'OPEN',
        deadlineDate: deadline,
      },
    });
    console.log(`[seed] Order updated: ${orderCode}`);
  } else {
    order = await prisma.staffingOrder.create({
      data: {
        projectId: project.id,
        code: orderCode,
        title: `Tuyển ${p.positions.length} vị trí — ${p.name.replace(/^Tuyển\s+/, '')}`,
        status: 'OPEN',
        deadlineDate: deadline,
      },
    });
    console.log(`[seed] Order created: ${orderCode}`);
  }
  return order;
}

async function upsertSlot(order, p, project) {
  let totalSlots = 0;
  for (let i = 0; i < p.positions.length; i++) {
    const pos = p.positions[i];
    const [start, end] = pos.shift.split('-');
    const validFrom = new Date(p.startDate);
    const validTo = new Date(deadlineInMonths(p.startDate, 3));
    // Compound where: positionCode + staffingOrderId (no `code` on StaffingOrderSlot)
    const existing = await prisma.staffingOrderSlot.findFirst({
      where: { staffingOrderId: order.id, positionCode: pos.code },
    });
    if (existing) {
      await prisma.staffingOrderSlot.update({
        where: { id: existing.id },
        data: {
          positionTitle: pos.title,
          slotsNeeded: pos.needed,
          slotsFilled: 0,
          hourlyRateVnd: BigInt(pos.rate),
          shiftStart: start,
          shiftEnd: end,
          validFrom,
          validTo,
          workLocation: project.siteAddress,
        },
      });
      console.log(`[seed]   Slot updated: ${pos.code} (need=${pos.needed})`);
    } else {
      await prisma.staffingOrderSlot.create({
        data: {
          staffingOrderId: order.id,
          positionCode: pos.code,
          positionTitle: pos.title,
          slotsNeeded: pos.needed,
          slotsFilled: 0,
          hourlyRateVnd: BigInt(pos.rate),
          shiftStart: start,
          shiftEnd: end,
          validFrom,
          validTo,
          workLocation: project.siteAddress,
        },
      });
      console.log(`[seed]   Slot created: ${pos.code} (need=${pos.needed})`);
    }
    totalSlots += pos.needed;
  }
  return totalSlots;
}

function deadlineInMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('[seed] Starting public jobs seed...');
  try {
    const companyIds = await upsertCompanies();
    let totalJobs = 0;
    for (let i = 0; i < PROJECTS.length; i++) {
      const p = PROJECTS[i];
      const companyName = COMPANIES[p.companyIdx].name;
      const project = await upsertProject(p, companyIds[p.companyIdx], companyName);
      const order = await upsertOrder(project, p, i);
      const slots = await upsertSlot(order, p, project);
      totalJobs += slots;
    }
    console.log(`[seed] Done. ${COMPANIES.length} companies, ${PROJECTS.length} projects, ${totalJobs} slots seeded.`);
    console.log('[seed] Trang chủ HRP giờ sẽ hiển thị 5 việc thật.');
  } catch (e) {
    console.error('[seed] ERROR:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
