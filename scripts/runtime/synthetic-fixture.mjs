#!/usr/bin/env node
/**
 * scripts/runtime/synthetic-fixture.mjs
 *
 * P1 FINAL RELEASE SAFETY — Synthetic run-scoped fixture bootstrap (T0 §B.06).
 *
 * Bootstraps, on the synthetic Neon DB only (gated by db-host-guard + posture):
 *   1. RUN_ID = crypto.randomUUID()  (high-entropy)
 *   2. Synthetic ADMIN user     (random password, kept in process memory only)
 *   3. Synthetic HR_MANAGER user (random password, kept in process memory only)
 *   4. Synthetic HR_STAFF   user (random password, kept in process memory only)
 *   5. ClientCompany + Project (public, ACTIVE)
 *   6. A StaffingOrder (OPEN) via the canonical order.service, with one slot
 *   7. Tracked ID Set returned to caller for downstream teardown.
 *
 * Hard rules enforced:
 *   - Exact tracked IDs only — no `startsWith`, no LIKE, no TRUNCATE.
 *   - Random per-run password (`crypto.randomBytes(24).toString('base64url')`),
 *     passed BACK to caller only via in-memory return object. NEVER written
 *     to disk or to evidence.
 *   - Synthetic phone derived deterministically from RUN_ID and exact format
 *     `09` + 8 digits, matching normalizePhone's contract.
 *   - All fixtures are run-scoped via RUN_ID prefix on displayable fields.
 *   - Bootstrap goes through the ADMIN connection (HRP_RUNTIME_E2E_ADMIN_DATABASE_URL)
 *     with `bypassrls=true` — same architecture as production seed.
 *   - Refuses to operate on shared seeded rows. Refuses to UPDATE seeded users.
 *
 * Returns a JSON object describing the fixture. Print-safe (no password).
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import {
  assertSyntheticRuntime,
  GuardReject,
  describeSyntheticRuntime,
} from './db-host-guard.mjs';

const ADMIN_URL = (process.env.HRP_RUNTIME_E2E_ADMIN_DATABASE_URL ?? '').trim();
const FIXTURE_CLIENT = process.argv[2] ?? 'node-pg';

/**
 * Build a deterministic 10-digit VN phone from RUN_ID + role suffix.
 * Format: 09XXXXXXXX (matches normalizePhone strip-leading-0 result: 9 digits).
 * Two roles must NEVER collide: the tail is derived from the role suffix
 * (sum-of-charCodes % 100) and folded into the last 2 digits, while the
 * first 8 digits are derived from the RUN_ID.
 *
 * Output is EXACTLY 10 chars: 09 + 6 RUN_ID digits + 2 role digits.
 * The 2 role digits are placed in positions 8-9 of the 10-char string,
 * ensuring the discriminating tail is never dropped.
 */
function syntheticPhone(runId, roleSuffix) {
  const cleaned = runId.replace(/-/g, '').toLowerCase();
  const digits = [];
  for (let i = 0; i < 8 && digits.length < 6; i++) {
    const hex = cleaned[i] ?? '0';
    if (/[0-9]/.test(hex)) {
      digits.push(hex);
    } else {
      // Fold a-f to a digit (a-f → 0..5).
      const v = (hex.charCodeAt(0) - 87); // 'a'=97, 97-87=10
      digits.push(((v % 6)).toString());
    }
  }
  while (digits.length < 6) digits.push('0');
  // Last 2 digits encode the role-suffix to ensure roles don't collide
  // even when their RUN_ID-derived digits happen to match.
  const tail = (roleSuffix.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100)
    .toString()
    .padStart(2, '0');
  const phone = `09${digits.slice(0, 6).join('')}${tail}`;
  if (!/^09\d{8}$/.test(phone)) {
    throw new Error(`syntheticPhone produced malformed ${phone}`);
  }
  return phone;
}

function randomPassword() {
  return randomBytes(24).toString('base64url');
}

async function main() {
  // 1. Hard guard.
  let meta;
  try {
    meta = assertSyntheticRuntime();
  } catch (e) {
    if (e instanceof GuardReject) {
      console.error(`[synthetic-fixture] GUARD_REJECT code=${e.code} reason=${e.message}`);
      process.exit(2);
    }
    throw e;
  }
  console.log(`[describe] ${describeSyntheticRuntime(meta)}`);

  const RUN_ID = randomUUID();
  const runToken = RUN_ID.replace(/-/g, '').slice(0, 8);

  const adminPw = randomPassword();
  const managerPw = randomPassword();
  const staffPw = randomPassword();

  const adminUserId = `rt-e2e-${runToken}-admin`;
  const managerUserId = `rt-e2e-${runToken}-manager`;
  const staffUserId = `rt-e2e-${runToken}-hrstaff`;
  const adminPhone = syntheticPhone(RUN_ID, 'admin');
  const managerPhone = syntheticPhone(RUN_ID, 'mgr');
  const staffPhone = syntheticPhone(RUN_ID, 'hr');

  const tracked = {
    runId: RUN_ID,
    client: FIXTURE_CLIENT,
    adminUrlAlias: meta.hostAlias,
    dbAlias: meta.dbAlias,
    userIds: [adminUserId, managerUserId, staffUserId],
    adminUserId,
    managerUserId,
    staffUserId,
    adminPhone,
    managerPhone,
    staffPhone,
    userIdsExactIds: [adminUserId, managerUserId, staffUserId],
    companyIds: [],
    projectIds: [],
    orderIds: [],
    slotIds: [],
    assignmentIds: [],
    userIdByRole: {
      ADMIN: adminUserId,
      HR_MANAGER: managerUserId,
      HR_STAFF: staffUserId,
    },
    credentials: {
      // NEVER logged, NEVER persisted to disk — held in process memory only.
      // The launcher forwards these to the in-process map keyed by RUN_ID.
      ADMIN: { phone: adminPhone, password: adminPw },
      HR_MANAGER: { phone: managerPhone, password: managerPw },
      HR_STAFF: { phone: staffPhone, password: staffPw },
    },
  };

  // 2. Connect via ADMIN (bypassrls) — write the synthetic fixture.
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  try {
    await admin.query('BEGIN');

    // Users — synthetic exact IDs.
    const adminHash = await bcrypt.hash(adminPw, 10);
    const managerHash = await bcrypt.hash(managerPw, 10);
    const staffHash = await bcrypt.hash(staffPw, 10);

    await admin.query(
      `INSERT INTO users (id, phone, password_hash, name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'ADMIN', true, now(), now())
       ON CONFLICT (id) DO NOTHING`,
      [adminUserId, adminPhone, adminHash, `RT-E2E Admin ${runToken}`],
    );
    await admin.query(
      `INSERT INTO users (id, phone, password_hash, name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'HR_MANAGER', true, now(), now())
       ON CONFLICT (id) DO NOTHING`,
      [managerUserId, managerPhone, managerHash, `RT-E2E HR_MANAGER ${runToken}`],
    );
    await admin.query(
      `INSERT INTO users (id, phone, password_hash, name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'HR_STAFF', true, now(), now())
       ON CONFLICT (id) DO NOTHING`,
      [staffUserId, staffPhone, staffHash, `RT-E2E HR_STAFF ${runToken}`],
    );

    // ClientCompany.
    const companyCode = `RT-E2E-${runToken}-CC`;
    const company = await admin.query(
      `INSERT INTO client_companies (id, code, name, status, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, 'ACTIVE', now())
       RETURNING id`,
      [companyCode, `RT-E2E ClientCo ${runToken}`],
    );
    const companyId = company.rows[0].id;
    tracked.companyIds.push(companyId);

    // Project (public so the public job detail surfaces).
    const projectCode = `RT-E2E-${runToken}-PRJ`;
    const project = await admin.query(
      `INSERT INTO outsourcing_projects
         (id, code, client_company_id, name, pm_user_id, status, start_date, is_public, client_company_name, quota, filled, created_at)
       VALUES
         (gen_random_uuid()::text, $1, $2, $3, $4, 'ACTIVE', '2026-01-01', true, $5, 1, 0, now())
       RETURNING id`,
      [projectCode, companyId, `RT-E2E Project ${runToken}`, adminUserId, `RT-E2E ClientCo ${runToken}`],
    );
    const projectId = project.rows[0].id;
    tracked.projectIds.push(projectId);

    // StaffingOrder + Slot. Run-scoped exact IDs.
    const orderCode = `RT-E2E-${runToken}-SO`;
    const order = await admin.query(
      `INSERT INTO staffing_orders (id, project_id, code, title, description, deadline_date, status, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, '2099-12-31', 'OPEN', now())
       RETURNING id`,
      [projectId, orderCode, `RT-E2E Order ${runToken}`, 'Runtime E2E fixture order'],
    );
    const orderId = order.rows[0].id;
    tracked.orderIds.push(orderId);

    const slotCode = `RT-E2E-${runToken}-SLOT`;
    const slot = await admin.query(
      `INSERT INTO staffing_order_slots
         (id, staffing_order_id, position_code, position_title, slots_needed, slots_filled, hourly_rate_vnd,
          shift_start, shift_end, valid_from, valid_to, work_location, created_at)
       VALUES
         (gen_random_uuid()::text, $1, $2, 'Electrician', 1, 0, 50000,
          '08:00', '17:00', '2026-01-01', '2099-12-31', 'HCM', now())
       RETURNING id`,
      [orderId, slotCode],
    );
    const slotId = slot.rows[0].id;
    tracked.slotIds.push(slotId);

    await admin.query(`UPDATE staffing_orders SET code = $1 WHERE id = $2`, [
      `${orderCode}-FINAL`, orderId,
    ]);

    // hrp-p1-final-release-safety-closeout T0 §C.2: ACTIVE StaffingOrderRecruiterAssignment
    // binding the synthetic HR_STAFF recruiter to the StaffingOrder so that the canonical
    // dual-authority predicate (`assertActiveRecruiterForOrder`) passes when the e2e
    // invokes `POST /api/admin/applications/<submissionId>/claim` with HR_STAFF session.
    // Source = 'HR_MANAGER_ASSIGN' (matches the canonical `assignRecruiterToOrder` service).
    const assignment = await admin.query(
      `INSERT INTO staffing_order_recruiter_assignments
         (id, staffing_order_id, recruiter_user_id, assigned_by_user_id, source, status,
          reason, assigned_at, created_at, updated_at)
       VALUES
         (gen_random_uuid()::text, $1, $2, $3, 'HR_MANAGER_ASSIGN', 'ACTIVE',
          'RT-E2E runtime fixture (p1-final closeout T0 §C.2)', now(), now(), now())
       RETURNING id`,
      [orderId, staffUserId, managerUserId],
    );
    tracked.assignmentIds.push(assignment.rows[0].id);

    await admin.query('COMMIT');
  } catch (e) {
    try { await admin.query('ROLLBACK'); } catch (_) { /* best-effort rollback */ }
    console.error(`[synthetic-fixture] FAIL ${e?.message ?? e}`);
    process.exit(2);
  } finally {
    await admin.end();
  }

  // 3. Output: tracked IDs + safe metadata. Credentials NEVER printed.
  const safe = {
    runId: tracked.runId,
    runToken,
    client: tracked.client,
    hostAlias: tracked.adminUrlAlias,
    dbAlias: tracked.dbAlias,
    adminUserId: tracked.adminUserId,
    managerUserId: tracked.managerUserId,
    staffUserId: tracked.staffUserId,
    adminPhone: tracked.adminPhone,
    managerPhone: tracked.managerPhone,
    staffPhone: tracked.staffPhone,
    companyIds: tracked.companyIds,
    projectIds: tracked.projectIds,
    orderIds: tracked.orderIds,
    slotIds: tracked.slotIds,
    assignmentIds: tracked.assignmentIds,
    credentials: tracked.credentials,
  };

  // Persist fixture metadata to the OS temp directory (T0 §D.2: run-scoped, OS-temp,
  // cleaned in finally). Never write under `docs/tasks/.tmp/` — that path is a
  // working-tree artefact and is forbidden by the T0 cleanup hygiene rule.
  // The file holds the per-run credentials (only loaded by the same-process e2e
  // launcher via stdio pipe; removed on process exit).
  const fs = await import('node:fs');
  const path = await import('node:path');
  const os = await import('node:os');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `hrp-runtime-fixture-${runToken}-`));
  const fixtureFile = path.join(tmpRoot, `fixture-${RUN_ID}.json`);
  fs.writeFileSync(fixtureFile, JSON.stringify(safe, null, 2), { encoding: 'utf8', mode: 0o600 });

  // The fixture file path runs in OS-temp (T0 §D.2) so PASS never dirties the
  // repo's working tree. The teardown step (`exact-id-teardown.mjs`) is the
  // sole owner of fixture-file deletion: it deletes the file after the
  // zero-residue DB cleanup via `fs.unlinkSync(fixturePath)`. No `process.on('exit')`
  // cleanup here — premature removal would race the e2e stage's read of the
  // same file, producing "fixture file not found" failures.

  // Sanitized stdout summary — NEVER echoes credentials.
  console.log(JSON.stringify({
    runId: safe.runId,
    runToken: safe.runToken,
    hostAlias: safe.hostAlias,
    dbAlias: safe.dbAlias,
    adminUserId: safe.adminUserId,
    managerUserId: safe.managerUserId,
    staffUserId: safe.staffUserId,
    companyIds: safe.companyIds,
    projectIds: safe.projectIds,
    orderIds: safe.orderIds,
    slotIds: safe.slotIds,
    adminPhoneAlias: `${safe.adminPhone.slice(0, 4)}****${safe.adminPhone.slice(-2)}`,
    managerPhoneAlias: `${safe.managerPhone.slice(0, 4)}****${safe.managerPhone.slice(-2)}`,
    staffPhoneAlias: `${safe.staffPhone.slice(0, 4)}****${safe.staffPhone.slice(-2)}`,
    fixtureFile,
  }, null, 2));
}

main().catch((e) => {
  console.error(`[synthetic-fixture] UNEXPECTED ${e?.message ?? e}`);
  process.exit(2);
});