/**
 * prisma/seed.mjs - Phase 0 fixtures (idempotent upsert)
 *
 * Uses DATABASE_URL_ADMIN if set (bypasses RLS for seed).
 * Falls back to DATABASE_URL otherwise.
 *
 * Phase 5: extended with 2 vendors, timesheet LOCKED, vendor statement SENT.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Use DATABASE_URL_ADMIN if set (bypasses RLS for seed), else DATABASE_URL.
const adminUrl = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL;
if (!adminUrl) { console.error('[seed] No DATABASE_URL or DATABASE_URL_ADMIN'); process.exit(1); }
const prisma = new PrismaClient({ datasources: { db: { url: adminUrl } } });

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 bcc-fence (TASK hrp-phase1-bcc-fence, RQ-05 / DEC-05):
// 2 tài khoản auth từ ENV (ADMIN + HR_MANAGER). Upsert theo phone (User.phone
// KHÔNG unique trong schema → findFirst + update/create). Tài khoản đã tồn tại
// → KHÔNG reset passwordHash. Thiếu ENV → skip + cảnh báo (không crash).
// Chỉ chạm bảng `users` — không đụng bảng khác, không xóa row (EV-06, RISK-02).
// KHÔNG log phone/password/hash dưới mọi hình thức.
// ─────────────────────────────────────────────────────────────────────────────
const AUTH_ACCOUNTS = [
  { role: 'ADMIN', phoneEnv: 'ADMIN_PHONE', passwordEnv: 'ADMIN_PASSWORD', name: 'Admin HRP (bcc-fence)' },
  { role: 'HR_MANAGER', phoneEnv: 'HR_PHONE', passwordEnv: 'HR_PASSWORD', name: 'HR Manager (bcc-fence)' },
];

async function seedAuthAccounts() {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const acc of AUTH_ACCOUNTS) {
    const phone = process.env[acc.phoneEnv];
    const password = process.env[acc.passwordEnv];

    if (!phone || !password) {
      console.warn(`[seed.mjs] SKIP ${acc.role}: thieu ENV ${acc.phoneEnv} hoac ${acc.passwordEnv}`);
      skipped++;
      continue;
    }

    const existing = await prisma.user.findFirst({ where: { phone } });

    if (existing) {
      // Đã tồn tại → chỉ cập nhật role/isActive/name, GIỮ NGUYÊN passwordHash
      await prisma.user.update({
        where: { id: existing.id },
        data: { name: acc.name, role: acc.role, isActive: true },
      });
      if (!existing.passwordHash) {
        console.warn(`[seed.mjs] WARN ${acc.role}: user da ton tai nhung chua co passwordHash — giu nguyen, dang nhap chua kha dung`);
      }
      updated++;
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: { phone, passwordHash, name: acc.name, role: acc.role, isActive: true },
      });
      created++;
    }
  }

  return { created, updated, skipped };
}

const ROLE_SCENARIOS = [
  // 12 SystemRole × minimum 1 user moi role = 12 row
  { code: 'ADMIN',        name: 'Founder Minh (admin)',         phone: '090****001' },
  { code: 'HR_MANAGER',   name: 'Nguyen Van A (HR Manager)',    phone: '091****002' },
  { code: 'DIRECTOR',     name: 'BGD Tran Thi B (Director)',    phone: '092****003' },
  { code: 'HR_STAFF',     name: 'Le Van C (HR Staff)',          phone: '093****004' },
  { code: 'SALE',         name: 'Pham Thi D (Sale)',            phone: '094****005' },
  { code: 'PM',           name: 'Hoang Van E (PM)',             phone: '095****006' },
  { code: 'ACCOUNTANT',   name: 'Vu Thi F (Accountant)',        phone: '096****007' },
  { code: 'MKT',          name: 'Dao Van G (MKT)',              phone: '097****008' },
  { code: 'VENDOR_ADMIN', name: 'Bui Thi H (Vendor Admin)',     phone: '098****009' },
  { code: 'VENDOR_STAFF', name: 'Do Van I (Vendor Staff)',      phone: '089****010' },
  { code: 'CTV',          name: 'Ly Van K (CTV)',               phone: '088****011' },
  { code: 'WORKER',       name: 'Tran Van L (Worker)',          phone: '087****012' },
];

// SECURITY (AUD-004 P1): All seed projects MUST default to isPublic=false to
// prevent `staffing_orders` leak via `hrp_project_visible_for` (MKT/CTV/WORKER
// only see staffing_orders when project.is_public=true). Public visibility for
// job board demo is opt-in per project — none by default for safety.
const PROJECT_SCENARIOS = [
  { code: 'DA-2026-018', name: 'Nha may Dien tu An Phat',           site: 'Bac Ninh',                  quota: 50, filled: 47, isPublic: false },
  { code: 'DA-2026-022', name: 'Kho van Yen Phong',                site: 'KCN Yen Phong, Bac Ninh',   quota: 80, filled: 80, isPublic: false },
  { code: 'PRJ-SV-014',  name: 'Nha may Sao Viet',                 site: 'KCN Quang Chau, Bac Giang', quota: 35, filled: 32, isPublic: false },
  { code: 'PRJ-INTERNAL',name: 'Du an noi bo HRP (khong public)',  site: 'Ha Noi',                    quota: 5,  filled: 2,  isPublic: false },
];

const WORKER_SCENARIOS = [
  // Phase 0: 3 workers
  { empCode: 'EMP-001', fullName: 'Nguyen Van Worker A',  cccd: '084****1234' },
  { empCode: 'EMP-002', fullName: 'Tran Thi Worker B',    cccd: '085****2345' },
  { empCode: 'EMP-003', fullName: 'Le Van Worker C',      cccd: '086****3456' },
  // Phase 5: +2 workers for F00A demo (total 5)
  { empCode: 'EMP-004', fullName: 'Pham Thi Worker D',    cccd: '087****4567' },
  { empCode: 'EMP-005', fullName: 'Hoang Van Worker E',  cccd: '088****5678' },
];

// ─── Phase 5: Vendors (2) ────────────────────────────────────────────────
const VENDOR_SCENARIOS = [
  { code: 'VND-001', name: 'Cong ty TNHH Nhan su Vien Dong',  taxCode: '09****001', area: 'Bac Ninh',   status: 'ACTIVE' },
  { code: 'VND-002', name: 'Cong ty TNHH Tu Van Nhan luc',    taxCode: '09****002', area: 'Bac Giang', status: 'ACTIVE' },
];

// ─── Phase 5: Timesheet period LOCKED (for F00A moment 09:30) ──────────
const TIMESHEET_PERIOD_SEED = {
  month: 7,
  year: 2026,
  projectCode: 'DA-2026-018',
  status: 'LOCKED',
};

// ─── Phase 5: VendorStatement SENT (for F00A moment 11:30) ──────────────
const STATEMENT_SEED = {
  periodMonth: 7,
  periodYear: 2026,
  vendorCode: 'VND-001',
  status: 'SENT',
};

async function seedUsers() {
  let count = 0;
  for (const u of ROLE_SCENARIOS) {
    await prisma.user.upsert({
      where: { id: `seed-user-${u.code.toLowerCase()}` },
      update: { name: u.name, phone: u.phone, role: u.code, isActive: true },
      create: {
        id: `seed-user-${u.code.toLowerCase()}`,
        name: u.name,
        phone: u.phone,
        role: u.code,
        isActive: true,
      },
    });
    count++;
  }
  return count;
}

async function seedProjects() {
  // Tao 1 ClientCompany cho cac project
  const client = await prisma.clientCompany.upsert({
    where: { id: 'seed-client-hrp-demo' },
    update: {},
    create: {
      id: 'seed-client-hrp-demo',
      code: 'CC-SEED-001',
      name: 'HRP Demo Client',
      taxCode: '08****001',
      status: 'ACTIVE',
    },
  });

  let count = 0;
  for (const p of PROJECT_SCENARIOS) {
    await prisma.project.upsert({
      where: { code: p.code },
      update: { name: p.name, quota: p.quota, filled: p.filled, isPublic: p.isPublic, siteAddress: p.site },
      create: {
        id: `seed-proj-${p.code}`,
        code: p.code,
        name: p.name,
        clientCompanyId: client.id,
        quota: p.quota,
        filled: p.filled,
        isPublic: p.isPublic,
        siteAddress: p.site,
        startDate: new Date('2026-01-01'),
        status: 'ACTIVE',
        version: 1,
      },
    });
    count++;
  }
  return count;
}

async function seedWorkers() {
  let count = 0;
  for (const w of WORKER_SCENARIOS) {
    await prisma.worker.upsert({
      where: { id: `seed-worker-${w.empCode}` },
      update: { fullName: w.fullName },
      create: {
        id: `seed-worker-${w.empCode}`,
        userId: `USR-${w.empCode}`,
        fullName: w.fullName,
        cccdNumber: w.cccd,
        profileStatus: 'VERIFIED',
        employmentStatus: 'ACTIVE',
        riskStatus: 'NORMAL',
      },
    });
    count++;
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 UAT/Cutover STEP-05 (RQ-08):
// Seed 2 vendors + timesheet period LOCKED + vendor statement SENT (F00A demo).
// ─────────────────────────────────────────────────────────────────────────────

async function seedVendors() {
  let count = 0;
  for (const v of VENDOR_SCENARIOS) {
    await prisma.vendor.upsert({
      where: { id: `seed-vendor-${v.code}` },
      update: { name: v.name, taxCode: v.taxCode, area: v.area, status: v.status },
      create: {
        id: `seed-vendor-${v.code}`,
        code: v.code,
        name: v.name,
        taxCode: v.taxCode,
        area: v.area,
        status: v.status,
      },
    });
    count++;
  }
  return count;
}

async function seedTimesheetPeriod() {
  const proj = await prisma.project.findUnique({ where: { code: TIMESHEET_PERIOD_SEED.projectCode } });
  if (!proj) { console.warn('[seed] project not found, skipping timesheet period'); return 0; }

  await prisma.timesheetPeriod.upsert({
    where: { id: `seed-period-2026-07` },
    update: { status: 'LOCKED', projectId: proj.id },
    create: {
      id: `seed-period-2026-07`,
      projectId: proj.id,
      month: TIMESHEET_PERIOD_SEED.month,
      year: TIMESHEET_PERIOD_SEED.year,
      status: 'LOCKED',
      lockedAt: new Date('2026-08-15T08:30:00Z'),
      version: 1,
    },
  });
  return 1;
}

async function seedVendorStatement() {
  const vendor = await prisma.vendor.findUnique({ where: { id: 'seed-vendor-VND-001' } });
  const period = await prisma.timesheetPeriod.findUnique({ where: { id: 'seed-period-2026-07' } });
  if (!vendor || !period) { console.warn('[seed] vendor/period not found, skipping statement'); return 0; }

  await prisma.vendorStatement.upsert({
    where: { id: 'seed-vs-2026-07-vnd001' },
    update: { status: 'SENT' },
    create: {
      id: 'seed-vs-2026-07-vnd001',
      vendorId: vendor.id,
      periodMonth: STATEMENT_SEED.periodMonth,
      periodYear: STATEMENT_SEED.periodYear,
      totalAmount: BigInt(15000000),
      status: 'SENT',
      sentAt: new Date('2026-08-15T11:30:00Z'),
      confirmDeadlineAt: new Date('2026-08-18T08:00:00Z'),
      disputeCount: 0,
      version: 1,
    },
  });
  return 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// P1 Portals STEP-11 (DEC-12 + RQ-12): seed ≥2 staffing orders OPEN
// StaffingOrder.status = 'OPEN' (not 'ACTIVE' — see schema StaffingOrder model)
const STAFFING_ORDER_SEED = [
  { code: 'SO-VND001-001', title: 'Tuyen 5 dien cong Cho an',         projectCode: 'DA-2026-018', slotsNeeded: 5, positionCode: 'ELECTRICIAN', positionTitle: 'Điện công',     shiftStart: '07:00', shiftEnd: '16:00', workLocation: 'KCN Cho An, Bac Ninh' },
  { code: 'SO-VND001-002', title: 'Tuyen 3 han sy Khu cong nghiep',   projectCode: 'DA-2026-022', slotsNeeded: 3, positionCode: 'WELDER',      positionTitle: 'Hàn sợi',        shiftStart: '08:00', shiftEnd: '17:00', workLocation: 'KCN Bac Ninh II' },
];

async function seedStaffingOrders() {
  let count = 0;
  for (const s of STAFFING_ORDER_SEED) {
    const project = await prisma.project.findUnique({ where: { code: s.projectCode } });
    if (!project) { console.warn(`[seed] project ${s.projectCode} not found, skipping order`); continue; }

    const validFrom = new Date('2026-08-01');
    const validTo   = new Date('2026-12-31');

    const order = await prisma.staffingOrder.upsert({
      where: { id: `seed-order-${s.code}` },
      update: { status: 'OPEN' },
      create: {
        id: `seed-order-${s.code}`,
        code: s.code,
        title: s.title,
        projectId: project.id,
        status: 'OPEN',
        deadlineDate: validTo,
      },
    });

    await prisma.staffingOrderSlot.upsert({
      where: { id: `seed-slot-${s.code}` },
      update: { slotsNeeded: s.slotsNeeded },
      create: {
        id: `seed-slot-${s.code}`,
        staffingOrderId: order.id,
        positionCode: s.positionCode,
        positionTitle: s.positionTitle,
        slotsNeeded: s.slotsNeeded,
        slotsFilled: 0,
        shiftStart: s.shiftStart,
        shiftEnd: s.shiftEnd,
        validFrom,
        validTo,
        workLocation: s.workLocation,
      },
    });
    count++;
  }
  return count;
}

// ═══════════════════════════════════════════════════════════════════════════
// P1 Portals STEP-11 (DEC-12): seed users + worker profile + claims + submissions
// 3 cổng: vendor.hrpartner.vn, worker.hrpartner.vn, ctv.hrpartner.vn
// Phone masked 09x****xxx (DEC-12). All upsert (idempotent).
// ═══════════════════════════════════════════════════════════════════════════
const PORTAL_USERS_SEED = [
  { phone: '0910000001', role: 'VENDOR_ADMIN', vendorCode: 'VND-001', affCode: null, name: 'Vendor Admin Demo' },
  { phone: '0910000002', role: 'WORKER', vendorCode: null, affCode: null, name: 'Worker Demo' },
  { phone: '0910000003', role: 'CTV', vendorCode: null, affCode: 'CTV-DEMO-001', name: 'CTV Demo' },
];

async function seedPortalUsers() {
  let count = 0;
  for (const u of PORTAL_USERS_SEED) {
    const existing = await prisma.user.findFirst({ where: { phone: u.phone } });
    const data = {
      role: u.role,
      isActive: true,
      name: u.name,
      affCode: u.affCode,
    };

    if (u.vendorCode) {
      const vendor = await prisma.vendor.findUnique({ where: { code: u.vendorCode } });
      if (vendor) data.vendorId = vendor.id;
    }

    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data });
    } else {
      // No passwordHash — user must be created via admin in production (DEC-12 note).
      // Seed gives a dev password so test login works.
      const passwordHash = await bcrypt.hash('demo-portal-2026', 10);
      await prisma.user.create({
        data: {
          phone: u.phone,
          passwordHash,
          ...data,
        },
      });
    }
    count++;
  }
  return count;
}

async function seedWorkerProfile() {
  // Find worker demo user
  const workerUser = await prisma.user.findFirst({ where: { phone: '0910000002' } });
  if (!workerUser) { console.warn('[seed] worker user not found, skipping profile'); return 0; }

  // Check if Worker profile exists
  let worker = await prisma.worker.findUnique({ where: { userId: workerUser.id } });
  if (!worker) {
    worker = await prisma.worker.create({
      data: {
        userId: workerUser.id,
        accountUserId: workerUser.id,
        fullName: workerUser.name ?? 'Worker Demo',
        phone: workerUser.phone,
        employmentStatus: 'NONE',
        profileStatus: 'INCOMPLETE',
        riskStatus: 'NORMAL',
      },
    });
  } else if (!worker.accountUserId) {
    // Sửa lỗi nạp thiếu accountUserId trước đây
    await prisma.worker.update({
      where: { id: worker.id },
      data: { accountUserId: workerUser.id },
    });
  }
  return worker ? 1 : 0;
}

async function seedSourceClaims() {
  const ctvUser = await prisma.user.findFirst({ where: { phone: '0910000003' } });
  if (!ctvUser) { console.warn('[seed] ctv user not found, skipping claims'); return 0; }

  // Find any worker to claim
  const worker = await prisma.worker.findFirst();
  if (!worker) { console.warn('[seed] no worker, skipping claims'); return 0; }

  let count = 0;
  for (const claimType of ['HRP_DIRECT', 'CTV_REFERRAL']) {
    const id = `seed-claim-${ctvUser.id}-${claimType}`;
    await prisma.sourceClaim.upsert({
      where: { id },
      update: { accepted: claimType === 'CTV_REFERRAL' },
      create: {
        id,
        workerId: worker.id,
        claimType,
        ctvId: ctvUser.id,
        accepted: claimType === 'CTV_REFERRAL',
      },
    });
    count++;
  }
  return count;
}

async function seedCandidateSubmissionForVendor() {
  const vendor = await prisma.vendor.findUnique({ where: { code: 'VND-001' } });
  if (!vendor) { console.warn('[seed] vendor not found, skipping submission'); return 0; }

  // Find a project
  const project = await prisma.project.findFirst();
  if (!project) { console.warn('[seed] no project, skipping submission'); return 0; }

  await prisma.candidateSubmission.upsert({
    where: { id: 'seed-cs-vnd001-01' },
    update: { status: 'NEW' },
    create: {
      id: 'seed-cs-vnd001-01',
      vendorId: vendor.id,
      projectId: project.id,
      fullName: 'Ứng viên demo',
      phone: '0987654321',
      status: 'NEW',
    },
  });
  return 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 identity-core (TASK hrp-phase1-identity-core, RQ-08 + DEC-07):
// Seed Permission catalog + RolePermission matrix idempotent.
// - Upsert Permission (code + group + description) — không reset.
// - Upsert RolePermission (role + permissionCode) — không reset.
// - KHÔNG đụng UserPermissionGrant (giữ nguyên grant manual — DEC-07).
// - KHÔNG reset password user (đảm bảo idempotent).
// ─────────────────────────────────────────────────────────────────────────────
const PERMISSION_SEED = [
  { code: 'CAN_MANAGE_PERMISSIONS',     group: 'SYSTEM',    description: 'Cấp/thu quyền cho user khác (chỉ root cấp được — G22).' },
  { code: 'CAN_CREATE_WORKER',          group: 'WORKER',    description: 'Tạo hồ sơ worker mới (Sale/HR tạo nguồn).' },
  { code: 'CAN_VIEW_UNASSIGNED_POOL',   group: 'WORKER',    description: 'Xem pool worker chưa phân công (assignedToId = null).' },
  { code: 'CAN_VIEW_WORKER_SENSITIVE',  group: 'WORKER',    description: 'Xem trường nhạy cảm (CCCD, bankAccount, selfie) — Phase 2 masking.' },
  { code: 'CAN_APPROVE_PAYROLL',        group: 'PAYROLL',   description: 'Duyệt bảng lương (HR_MANAGER + ACCOUNTANT).' },
  { code: 'CAN_FORCE_LOCK_STATEMENT',   group: 'STATEMENT', description: 'Khóa statement cưỡng bức (reconciliation cuối kỳ).' },
  { code: 'CAN_OVERRIDE_REFERRAL_GUARD',group: 'REFERRAL',  description: 'Bỏ qua referral guard (SOP S1/S2/S3 §9.3.1).' },
  { code: 'CAN_APPROVE_TICKET_LEVEL2',  group: 'TICKET',    description: 'Duyệt ticket level 2 (duyệt 2 chữ ký cho ADVANCE_SALARY).' },
  { code: 'CAN_PROCESS_TICKET',         group: 'TICKET',    description: 'Xử lý ticket (cancel/pay/reject — Planner bổ sung nhóm TICKET).' },
  { code: 'CAN_EDIT_CONTRACT',          group: 'CONTRACT',  description: 'Sửa hợp đồng worker (HR_MANAGER).' },
];

// Role → tập permission codes (theo data-scope-security §4.2 seed mẫu + DEC-02 bổ sung).
// ADMIN short-circuit nên không cần row (resolver trả ALL).
const ROLE_PERMISSION_SEED = [
  // HR_MANAGER — đa quyền nhất (trừ MANAGE root + VIEW_WORKER_SENSITIVE giai đoạn đầu)
  { role: 'HR_MANAGER', code: 'CAN_CREATE_WORKER' },
  { role: 'HR_MANAGER', code: 'CAN_VIEW_UNASSIGNED_POOL' },
  { role: 'HR_MANAGER', code: 'CAN_APPROVE_PAYROLL' },
  { role: 'HR_MANAGER', code: 'CAN_FORCE_LOCK_STATEMENT' },
  { role: 'HR_MANAGER', code: 'CAN_OVERRIDE_REFERRAL_GUARD' },
  { role: 'HR_MANAGER', code: 'CAN_APPROVE_TICKET_LEVEL2' },
  { role: 'HR_MANAGER', code: 'CAN_PROCESS_TICKET' },
  { role: 'HR_MANAGER', code: 'CAN_EDIT_CONTRACT' },
  { role: 'HR_MANAGER', code: 'CAN_VIEW_WORKER_SENSITIVE' },

  // HR_STAFF — tạo worker, xử lý ticket
  { role: 'HR_STAFF', code: 'CAN_CREATE_WORKER' },
  { role: 'HR_STAFF', code: 'CAN_PROCESS_TICKET' },

  // SALE — tạo worker
  { role: 'SALE', code: 'CAN_CREATE_WORKER' },

  // ACCOUNTANT — duyệt payroll
  { role: 'ACCOUNTANT', code: 'CAN_APPROVE_PAYROLL' },
];

async function seedPermissions() {
  let permCount = 0;
  let rpCount = 0;

  // 1. Upsert Permission catalog
  for (const p of PERMISSION_SEED) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { group: p.group, description: p.description },
      create: { code: p.code, group: p.group, description: p.description },
    });
    permCount++;
  }

  // 2. Upsert RolePermission matrix
  for (const rp of ROLE_PERMISSION_SEED) {
    await prisma.rolePermission.upsert({
      where: { role_permissionCode: { role: rp.role, permissionCode: rp.code } },
      update: {},
      create: { role: rp.role, permissionCode: rp.code, grantedBy: 'root' },
    });
    rpCount++;
  }

  // 3. KHÔNG đụng UserPermissionGrant (theo DEC-07 — giữ nguyên grant manual).
  return { permCount, rpCount };
}

async function main() {
  console.log('[seed.mjs] Phase 0 fixtures + Phase 1 identity-core permissions - idempotent upsert');
  console.log('[seed.mjs] CANONICAL MOCK ONLY - no real PII');

  const users = await seedUsers();
  const projects = await seedProjects();
  const workers = await seedWorkers();
  const vendors = await seedVendors();
  const periods = await seedTimesheetPeriod();
  const statements = await seedVendorStatement();
  const staffingOrders = await seedStaffingOrders();
  const portalUsers = await seedPortalUsers();
  const workerProfile = await seedWorkerProfile();
  const claims = await seedSourceClaims();
  const submissions = await seedCandidateSubmissionForVendor();
  const auth = await seedAuthAccounts();
  const perms = await seedPermissions();

  console.log(`[seed.mjs] Upserted: ${users} users, ${projects} projects, ${workers} workers, ${vendors} vendors`);
  console.log(`[seed.mjs] Phase 5: ${periods} timesheet period (LOCKED), ${statements} vendor statement (SENT), ${staffingOrders} staffing orders (OPEN)`);
  console.log(`[seed.mjs] P1 Portals: ${portalUsers} users, ${workerProfile} worker profile, ${claims} source claims, ${submissions} candidate submissions`);
  console.log(`[seed.mjs] Auth accounts (ENV): ${auth.created} created, ${auth.updated} updated, ${auth.skipped} skipped`);
  console.log(`[seed.mjs] Permissions: ${perms.permCount} catalog, ${perms.rpCount} role-permissions`);
  console.log(`[seed.mjs] F00A + P1 demo ready: 5 workers, 3 projects, 2 vendors, 1 period LOCKED, 1 statement SENT, 3 portal users`);
}

main()
  .catch((e) => {
    console.error('[seed.mjs] FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
