/**
 * prisma/seed.mjs - Phase 0 fixtures (idempotent upsert)
 *
 * Constraints (PROMPT §1.4):
 *   - Canonical mock data only: An Phat / Yen Phong / Sao Viet
 *   - CCCD/SDT masked (e.g. 084****1234)
 *   - No real bank account, no real salary
 *   - 20 scenario fixtures (Role x Scope matrix tu data-scope-security.md)
 *
 * Lenh chay: prisma db seed (can DATABASEX_URL trong env).
 * Phase 0 BLK: khong co dev DB rieng, chi verify bang 'node prisma/seed.mjs --check'
 * (khong can DB, chi load + assert schema).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

const PROJECT_SCENARIOS = [
  { code: 'DA-2026-018', name: 'Nha may Dien tu An Phat',           site: 'Bac Ninh',                  quota: 50, filled: 47, isPublic: true },
  { code: 'DA-2026-022', name: 'Kho van Yen Phong',                site: 'KCN Yen Phong, Bac Ninh',   quota: 80, filled: 80, isPublic: true },
  { code: 'PRJ-SV-014',  name: 'Nha may Sao Viet',                 site: 'KCN Quang Chau, Bac Giang', quota: 35, filled: 32, isPublic: true },
  { code: 'PRJ-INTERNAL',name: 'Du an noi bo HRP (khong public)',  site: 'Ha Noi',                    quota: 5,  filled: 2,  isPublic: false },
];

const WORKER_SCENARIOS = [
  { empCode: 'EMP-001', fullName: 'Nguyen Van Worker A',  cccd: '084****1234' },
  { empCode: 'EMP-002', fullName: 'Tran Thi Worker B',    cccd: '085****2345' },
  { empCode: 'EMP-003', fullName: 'Le Van Worker C',      cccd: '086****3456' },
];

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

async function main() {
  console.log('[seed.mjs] Phase 0 fixtures - idempotent upsert');
  console.log('[seed.mjs] CANONICAL MOCK ONLY - no real PII');

  const users = await seedUsers();
  const projects = await seedProjects();
  const workers = await seedWorkers();
  const auth = await seedAuthAccounts();

  console.log(`[seed.mjs] Upserted: ${users} users, ${projects} projects, ${workers} workers`);
  console.log(`[seed.mjs] Auth accounts (ENV): ${auth.created} created, ${auth.updated} updated, ${auth.skipped} skipped`);
  console.log(`[seed.mjs] Total scenarios: ${users + projects + workers} (12 role + 4 project + 3 worker + 1 client = 20)`);
}

main()
  .catch((e) => {
    console.error('[seed.mjs] FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
