// scripts/seed-runtime-e2e-fixture.mjs — LOCAL fixture for synthetic runtime E2E.
// NOT COMMITTED. Underlying file lives outside the repo on the operator's box.
//
// Prerequisite ONLY (does NOT seed any P1-A0.5 result):
//   - JobOpening DRAFT for slot `seed-slot-SO-VND001-001`
//   - StaffingOrderRecruiterAssignment ACTIVE for HR_STAFF on the parent order
//
// What this script MUST NOT do:
//   - classify the JobOpening (status must remain DRAFT for runtime classify step)
//   - open the JobOpening (status must remain DRAFT for runtime open step)
//   - create JobPosting (must be created by runtime POST /api/admin/jobs/job-postings)
//   - publish JobPosting (must be done by runtime)
//   - create CandidateSubmission (must be created by runtime apply step)
//   - create Placement (must be created by runtime recruiter action)
//   - claim CandidateSubmission (must be done by runtime claim step)
//
// Idempotent: re-running is a no-op if the prerequisite already exists.

import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { readFileSync, existsSync } from 'node:fs';

// Load .env into process.env (PowerShell can't always strip quotes reliably).
// Only sets vars that aren't already defined (process.env wins).
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const adminUrl = (process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL)?.replace(/^"|"$/g, '');
if (!adminUrl) { console.error('[runtime-fixture] No DATABASE_URL[_ADMIN]'); process.exit(1); }
const fixtureUrl = new URL(adminUrl);
fixtureUrl.searchParams.set('connection_limit', '1');
const prisma = new PrismaClient({ datasources: { db: { url: fixtureUrl.toString() } } });

const RUN_ID = process.env.RUN_ID ?? 'run-unknown';
const SLOT_ID = 'seed-slot-SO-VND001-001';
const ORDER_ID = 'seed-order-SO-VND001-001';
const OPENING_ID = `seed-opening-runtime-${RUN_ID}`;
const PROJECT_ID = 'seed-proj-DA-2026-018';

async function ensureHrStaffActiveAssignment(orderId, hrStaffUserId, assignedByUserId) {
  const existing = await prisma.staffingOrderRecruiterAssignment.findFirst({
    where: { staffingOrderId: orderId, recruiterUserId: hrStaffUserId, status: 'ACTIVE' },
  });
  if (existing) {
    console.log(`[fixture] recruiter assignment ACTIVE exists: ${existing.id}`);
    return existing;
  }
  const created = await prisma.staffingOrderRecruiterAssignment.create({
    data: {
      staffingOrderId: orderId,
      recruiterUserId: hrStaffUserId,
      assignedByUserId,
      source: 'HR_MANAGER_ASSIGN',
      status: 'ACTIVE',
      assignedAt: new Date(),
      reason: `runtime E2E fixture (runId=${RUN_ID})`,
    },
  });
  console.log(`[fixture] recruiter assignment CREATED: ${created.id}`);
  return created;
}

async function ensureDraftOpening() {
  // Step A: unbind any canonical binding on the slot AND drop any pre-existing
  // JobPosting on the slot (so eligibility check `has_posting` passes again).
  await prisma.$executeRaw(
    Prisma.sql`UPDATE staffing_order_slots SET job_opening_id = NULL WHERE id = ${SLOT_ID}`,
  );
  // Drop any JobPostings on openings that previously bound this slot.
  await prisma.jobPosting.deleteMany({ where: { jobOpening: { staffingOrderSlotId: SLOT_ID } } });
  await prisma.jobOpening.deleteMany({ where: { staffingOrderSlotId: SLOT_ID, NOT: { id: OPENING_ID } } });

  // Step B: ensure OUR canonical opening exists and is reset to a pristine
  // pre-classify state: status=DRAFT, serviceModel=null, no openedAt.
  const existing = await prisma.jobOpening.findUnique({ where: { id: OPENING_ID } });
  if (existing) {
    const updated = await prisma.jobOpening.update({
      where: { id: OPENING_ID },
      data: { status: 'DRAFT', openedAt: null, closedAt: null, serviceModel: null },
    });
    await prisma.$executeRaw(
      Prisma.sql`UPDATE staffing_order_slots SET job_opening_id = ${OPENING_ID} WHERE id = ${SLOT_ID} AND job_opening_id IS NULL`,
    );
    console.log(`[fixture] JobOpening DRAFT reset+bound: ${updated.id} status=${updated.status} serviceModel=${updated.serviceModel}`);
    return updated;
  }
  const created = await prisma.jobOpening.create({
    data: {
      id: OPENING_ID,
      staffingOrderId: ORDER_ID,
      staffingOrderSlotId: SLOT_ID,
      status: 'DRAFT',
    },
  });
  await prisma.$executeRaw(
    Prisma.sql`UPDATE staffing_order_slots SET job_opening_id = ${OPENING_ID} WHERE id = ${SLOT_ID} AND job_opening_id IS NULL`,
  );
  console.log(`[fixture] JobOpening CREATED+bound: ${created.id} status=${created.status}`);
  return created;
}

async function ensureHrStaffUserWithPassword() {
  // Seeded by seed.mjs (id=seed-user-hr_staff, phone=093****004).
  // We do NOT touch password here — runtime HR_STAFF login uses a DIFFERENT
  // synthetic account that we create by ENV (HR_PHONE/HR_PASSWORD), but per
  // T0 directive the founder has only ADMIN + HR_MANAGER accounts and the
  // recruiter flow uses the SEEDED HR_STAFF user whose password is provisioned
  // here for synthetic E2E. The password is read from ENV, NEVER logged.
  const hrStaffPhone = process.env.HR_STAFF_PHONE ?? process.env.HR_PHONE;
  const hrStaffPassword = process.env.HR_STAFF_PASSWORD ?? process.env.HR_PASSWORD;
  if (!hrStaffPhone || !hrStaffPassword) {
    console.warn('[fixture] HR_STAFF_PHONE/HR_STAFF_PASSWORD not set — recruiter claim step will use seeded user (password may be unset)');
    return null;
  }
  const existing = await prisma.user.findFirst({ where: { phone: hrStaffPhone } });
  if (existing) {
    const hash = await bcrypt.hash(hrStaffPassword, 10);
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash: hash, role: 'HR_STAFF', isActive: true, name: existing.name ?? 'HR Staff (runtime E2E)' } });
    console.log(`[fixture] HR_STAFF user password rotated: ${existing.id}`);
    return existing;
  }
  const hash = await bcrypt.hash(hrStaffPassword, 10);
  const created = await prisma.user.create({
    data: { phone: hrStaffPhone, passwordHash: hash, name: 'HR Staff (runtime E2E)', role: 'HR_STAFF', isActive: true },
  });
  console.log(`[fixture] HR_STAFF user CREATED: ${created.id}`);
  return created;
}

async function ensureAdminPassword() {
  // seed.mjs preserves an existing passwordHash on update — so if the seed already
  // created an ADMIN user with a different password, we must rotate the hash here
  // to match ADMIN_PASSWORD in .env so the runtime ADMIN login succeeds.
  const adminPhone = process.env.ADMIN_PHONE;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPhone || !adminPassword) {
    console.warn('[fixture] ADMIN_PHONE/ADMIN_PASSWORD not set — ADMIN login may fail');
    return null;
  }
  const u = await prisma.user.findFirst({ where: { phone: adminPhone } });
  if (!u) { console.warn(`[fixture] ADMIN user with phone ${adminPhone} not found — seed.mjs may need re-run`); return null; }
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: hash, role: 'ADMIN', isActive: true } });
  console.log(`[fixture] ADMIN user password rotated: ${u.id}`);
  return u;
}

async function main() {
  const order = await prisma.staffingOrder.findUnique({ where: { id: ORDER_ID } });
  if (!order) { console.error(`[fixture] order ${ORDER_ID} missing — run node prisma/seed.mjs first`); process.exit(1); }
  if (order.status !== 'OPEN') { console.error(`[fixture] order ${ORDER_ID} status=${order.status}, expected OPEN`); process.exit(1); }
  console.log(`[fixture] order ${order.id} status=${order.status}`);

  await ensureDraftOpening();

  // Recruiter user for ACTIVE assignment MUST be the same one we login as in step 9.
  // The seeded `seed-user-hr_staff` has phone `093****004` (no passwordHash), so we use
  // the HR_PHONE/HR_PASSWORD account instead — this is the runtime E2E HR_STAFF login user.
  const hrStaffPhone = process.env.HR_STAFF_PHONE ?? process.env.HR_PHONE;
  const hrStaff = hrStaffPhone ? await prisma.user.findFirst({ where: { phone: hrStaffPhone } }) : null;
  if (!hrStaff) { console.error(`[fixture] HR_STAFF user with phone ${hrStaffPhone} missing`); process.exit(1); }

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) { console.error('[fixture] no ADMIN user found — run node prisma/seed.mjs first'); process.exit(1); }

  await ensureHrStaffActiveAssignment(order.id, hrStaff.id, admin.id);
  await ensureAdminPassword();
  await ensureHrStaffUserWithPassword();

  console.log(`[fixture] ready runId=${RUN_ID} openingId=${OPENING_ID} hrStaffId=${hrStaff.id} hrStaffPhone=${hrStaffPhone}`);
}

main().catch(e => { console.error('[fixture] FATAL', e); process.exit(1); }).finally(() => prisma.$disconnect());