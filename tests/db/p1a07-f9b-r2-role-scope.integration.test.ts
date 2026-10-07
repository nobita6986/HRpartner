/**
 * p1a07-f9b-r2-role-scope.integration.test.ts — hrp-f9b-r2-slot-scope-read-restore
 * (F9-B round-2) synthetic DB proof of the canonical role-mapped SELECT
 * blast radius on `staffing_order_slots` for every legitimate read role.
 *
 * Lane: integration (DATABASE_URL_ADMIN_TEST + DATABASE_URL_TEST).
 * Self-skips when those envs are missing.
 *
 * Canonical AC-02 contract (T0 disposition 2026-10-03 22:44 ICT, reused
 * verbatim from F9-B round-1):
 *   - Writer connection = `app_user_writer` (non-super, non-bypassrls).
 *   - GUC `app.user_id` / `app.role` set in-tx; re-read via
 *     `current_setting(...)` to prove context (avoids false PASS on
 *     unset context).
 *   - Forbidden UPDATE may return zero rows (RLS USING not matched)
 *     OR throw (RLS rejection). Both are acceptable fail-closed.
 *   - The assertion is the post-attempt admin snapshot is byte/value-
 *     equivalent to the pre-attempt value for every protected column.
 *   - A `count = 0` is NOT a success unless the test additionally
 *     proves target existence, context correctness, and zero side
 *     effects.
 *
 * This file closes the F9-B round-2 regression surfaced by CI on PR #88:
 * the F9-B round-1 corrective migration dropped the canonical
 * `hrp_staffing_order_slot_scope` FOR ALL policy and replaced it with
 * `hrp_f9b_slots_manager_select` (admin/HR_MANAGER only), stripping
 * legitimate SELECT access from MKT (public JobPosting card), CTV
 * (public referral surface), PM / sub-PM (Demand Tree), DIRECTOR,
 * SALE, WORKER, VENDOR_ADMIN, VENDOR_STAFF. F9-B round-2 restores the
 * canonical role-mapped visibility via
 * `hrp_f9b_slots_project_select` (FOR SELECT, role-agnostic, canonical
 * `hrp_project_visible_for(so.project_id)` predicate) while preserving
 * every F9-B round-1 least-privilege WRITE hardening (B-01, B-02, B-03).
 *
 * AC mapping (TASK hrp-f9b-r2-slot-scope-read-restore §6.1):
 *   - MKT-01 / MKT-02: public / private project read.
 *   - PM-01 / PM-02: own / other PM project read.
 *   - ADMIN-01 / HRM-01: regression of admin / HR_MANAGER read.
 *   - HRSTAFF-01 / -02 / -03: assigned / unassigned / revoked HR_STAFF.
 *   - HRSTAFF-04 / -05 / -06: HR_STAFF direct UPDATE / INSERT / DELETE
 *     still fail closed (B-01 preserved; round-1 manager policies
 *     retained).
 *   - HRSTAFF-07: PUBLIC cannot EXECUTE the binding primitive.
 *   - POL-01 / POL-02: live posture in synthetic DB (canonical SELECT
 *     policy present, over-restrictive policy gone, round-1 posture
 *     preserved, no HR_STAFF DELETE policy, no broad write relaxation).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma as PrismaTypes } from '@prisma/client';

import {
  assignRecruiterToOrder,
  revokeRecruiterFromOrder,
} from '@/src/domains/talent/recruiter-assignment.service';
import { createStaffingOrder } from '@/src/domains/staffing/order.service';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl && !!writerUrl &&
  !adminUrl.includes('placeholder') && !writerUrl.includes('placeholder');

const runToken = randomUUID().replaceAll('-', '').slice(0, 12);
const runId = `p1a07-f9b-r2-${runToken}`;

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    transactionOptions: { timeout: 30_000 },
  });
}

async function withContext<T>(
  client: PrismaClient,
  userId: string,
  role: string,
  callback: (tx: PrismaTypes.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", userId);
    await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", role);
    await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
    await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');
    // Re-read the GUC to prove the context is set inside this transaction
    // (canonical AC-02 contract point 2 — avoids a false PASS when the
    // context was never bound and RLS USING happens to match nothing).
    const ctxRows = await tx.$queryRawUnsafe<Array<{ user_id: string | null; role: string | null }>>(
      "SELECT current_setting('app.user_id', true) AS user_id, current_setting('app.role', true) AS role",
    );
    const ctx = ctxRows[0] ?? { user_id: null, role: null };
    if (ctx.user_id !== userId || ctx.role !== role) {
      throw new Error(
        `withContext: GUC re-read mismatch. expected user_id=${userId} role=${role}; got user_id=${ctx.user_id} role=${ctx.role}`,
      );
    }
    return callback(tx);
  });
}

async function withVendorContext<T>(
  client: PrismaClient,
  userId: string,
  role: string,
  vendorId: string,
  callback: (tx: PrismaTypes.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", userId);
    await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", role);
    await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", vendorId);
    await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", '');
    const ctxRows = await tx.$queryRawUnsafe<Array<{ user_id: string; role: string; vendor_id: string }>>(
      "SELECT current_setting('app.user_id', true) AS user_id, current_setting('app.role', true) AS role, current_setting('app.vendor_id', true) AS vendor_id",
    );
    const ctx = ctxRows[0];
    if (
      !ctx ||
      ctx.user_id !== userId ||
      ctx.role !== role ||
      ctx.vendor_id !== vendorId
    ) {
      throw new Error(
        `withVendorContext: GUC re-read mismatch. expected user_id=${userId} role=${role} vendor_id=${vendorId}; got user_id=${ctx?.user_id} role=${ctx?.role} vendor_id=${ctx?.vendor_id}`,
      );
    }
    return callback(tx);
  });
}

async function withWorkerContext<T>(
  client: PrismaClient,
  userId: string,
  role: string,
  workerId: string,
  callback: (tx: PrismaTypes.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", userId);
    await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", role);
    await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', $1, true)", '');
    await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', $1, true)", workerId);
    const ctxRows = await tx.$queryRawUnsafe<Array<{ user_id: string; role: string; worker_id: string }>>(
      "SELECT current_setting('app.user_id', true) AS user_id, current_setting('app.role', true) AS role, current_setting('app.worker_id', true) AS worker_id",
    );
    const ctx = ctxRows[0];
    if (
      !ctx ||
      ctx.user_id !== userId ||
      ctx.role !== role ||
      ctx.worker_id !== workerId
    ) {
      throw new Error(
        `withWorkerContext: GUC re-read mismatch. expected user_id=${userId} role=${role} worker_id=${workerId}; got user_id=${ctx?.user_id} role=${ctx?.role} worker_id=${ctx?.worker_id}`,
      );
    }
    return callback(tx);
  });
}

describe.skipIf(!HAS_TEST_DB).sequential('F9-B R2 Slot Scope Read Restore — Role-Matrix Synthetic DB Proof', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;
  let writer2: PrismaClient;
  let writer3: PrismaClient;

  const adminUserId = `${runId}-admin`;
  const managerUserId = `${runId}-manager`;
  const directorUserId = `${runId}-director`;
  const saleUserId = `${runId}-sale`;
  const mktUserId = `${runId}-mkt`;
  const ctvUserId = `${runId}-ctv`;
  const pmPublicUserId = `${runId}-pm-public`;
  const pmPrivateUserId = `${runId}-pm-private`;
  const workerUserId = `${runId}-worker`;
  const vendorAdminUserId = `${runId}-vendor-admin`;
  const vendorStaffUserId = `${runId}-vendor-staff`;
  const aliceId = `${runId}-alice`;
  const eveId = `${runId}-eve`;

  const vendorId = `${runId}-vendor`;
  const workerId = `${runId}-worker-row`;

  const companyIds: string[] = [];
  const projectIds: string[] = [];
  const orderIds: string[] = [];
  const slotIds: string[] = [];
  const assignmentIds: string[] = [];
  const submissionIds: string[] = [];
  const projectAssignmentIds: string[] = [];
  const userIds = [
    adminUserId,
    managerUserId,
    directorUserId,
    saleUserId,
    mktUserId,
    ctvUserId,
    pmPublicUserId,
    pmPrivateUserId,
    workerUserId,
    vendorAdminUserId,
    vendorStaffUserId,
    aliceId,
    eveId,
  ];

  let publicProjectId: string;
  let privateProjectId: string;
  let publicOrderId: string;
  let privateOrderId: string;
  let publicSlotId: string;
  let privateSlotId: string;
  let assignmentAlicePublicId: string;

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);
    writer2 = makeClient(writerUrl);
    writer3 = makeClient(writerUrl);

    // Seed users — all 13 fixture roles needed for the role matrix.
    await admin.user.createMany({
      data: [
        { id: adminUserId, phone: `${runId}-adm`, name: 'F9B-R2 Admin', role: 'ADMIN' },
        { id: managerUserId, phone: `${runId}-mgr`, name: 'F9B-R2 Manager', role: 'HR_MANAGER' },
        { id: directorUserId, phone: `${runId}-dir`, name: 'F9B-R2 Director', role: 'DIRECTOR' },
        { id: saleUserId, phone: `${runId}-sal`, name: 'F9B-R2 Sale', role: 'SALE' },
        { id: mktUserId, phone: `${runId}-mkt`, name: 'F9B-R2 MKT', role: 'MKT' },
        { id: ctvUserId, phone: `${runId}-ctv`, name: 'F9B-R2 CTV', role: 'CTV' },
        { id: pmPublicUserId, phone: `${runId}-pmp`, name: 'F9B-R2 PM Public', role: 'PM' },
        { id: pmPrivateUserId, phone: `${runId}-pmr`, name: 'F9B-R2 PM Private', role: 'PM' },
        { id: workerUserId, phone: `${runId}-wrk`, name: 'F9B-R2 Worker', role: 'WORKER' },
        { id: vendorAdminUserId, phone: `${runId}-vad`, name: 'F9B-R2 VendorAdmin', role: 'VENDOR_ADMIN' },
        { id: vendorStaffUserId, phone: `${runId}-vst`, name: 'F9B-R2 VendorStaff', role: 'VENDOR_STAFF' },
        { id: aliceId, phone: `${runId}-alice`, name: 'F9B-R2 Alice', role: 'HR_STAFF' },
        { id: eveId, phone: `${runId}-eve`, name: 'F9B-R2 Eve', role: 'HR_STAFF' },
      ],
    });

    // Seed vendor row for VENDOR_*.
    await admin.vendor.create({
      data: { id: vendorId, code: `${runId}-VENDOR`, name: `${runId} Vendor` },
    });

    // Seed worker row for WORKER context. The Worker model is keyed by
    // an internal `id` (UUID), has a primary immutable `userId` FK to
    // User (the Worker's primary user identity), and a V4.14 G22
    // `accountUserId` FK used by the WORKER branch of
    // `hrp_project_visible_for` (which joins
    // `workers.account_user_id = hrp_session_user_id()`). Project
    // assignments link to `workers.id` (ProjectAssignment.workerId).
    // We therefore set all three so the same Worker row satisfies
    // both predicates and the ProjectAssignment FK.
    await admin.worker.create({
      data: {
        id: workerId,
        userId: workerUserId,
        accountUserId: workerUserId,
        fullName: `${runId} Worker`,
      },
    });

    // Two client companies (one for public project, one for private).
    const ccPublic = await admin.clientCompany.create({
      data: {
        code: `${runId}-CC-PUB`,
        name: `${runId} ClientCo Public`,
        taxCode: `${runId}-TAX-PUB`,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    companyIds.push(ccPublic.id);

    const ccPrivate = await admin.clientCompany.create({
      data: {
        code: `${runId}-CC-PRIV`,
        name: `${runId} ClientCo Private`,
        taxCode: `${runId}-TAX-PRIV`,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    companyIds.push(ccPrivate.id);

    // Public project — pmUserId = pmPublicUserId, isPublic = true.
    const pubProject = await admin.project.create({
      data: {
        code: `${runId}-PRJ-PUB`,
        name: `${runId} Project Public`,
        clientCompanyId: ccPublic.id,
        pmUserId: pmPublicUserId,
        isPublic: true,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
      },
      select: { id: true },
    });
    publicProjectId = pubProject.id;
    projectIds.push(pubProject.id);

    // Private project — pmUserId = pmPrivateUserId, isPublic = false.
    const privProject = await admin.project.create({
      data: {
        code: `${runId}-PRJ-PRIV`,
        name: `${runId} Project Private`,
        clientCompanyId: ccPrivate.id,
        pmUserId: pmPrivateUserId,
        isPublic: false,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
      },
      select: { id: true },
    });
    privateProjectId = privProject.id;
    projectIds.push(privProject.id);

    // One staffing order + one slot on each project.
    const pubOrderResult = await withContext(admin, adminUserId, 'ADMIN', async (tx) =>
      createStaffingOrder(tx, { userId: adminUserId, role: 'ADMIN' }, {
        projectId: publicProjectId,
        title: `${runId} Public Order`,
        description: 'F9-B R2 public order',
        deadlineDate: '2026-12-31',
        slots: [{
          positionTitle: 'F9B-R2 Public Eng',
          positionCode: 'F9BR2PUB',
          workLocation: 'HCM',
          slotsNeeded: 1,
          hourlyRateVnd: 50000,
          shiftStart: '08:00',
          shiftEnd: '17:00',
          validFrom: '2026-01-01',
          validTo: '2026-12-31',
        }],
      }),
    );
    publicOrderId = pubOrderResult.id;
    publicSlotId = pubOrderResult.slots[0]!.id;
    orderIds.push(publicOrderId);
    slotIds.push(publicSlotId);

    const privOrderResult = await withContext(admin, adminUserId, 'ADMIN', async (tx) =>
      createStaffingOrder(tx, { userId: adminUserId, role: 'ADMIN' }, {
        projectId: privateProjectId,
        title: `${runId} Private Order`,
        description: 'F9-B R2 private order',
        deadlineDate: '2026-12-31',
        slots: [{
          positionTitle: 'F9B-R2 Private Eng',
          positionCode: 'F9BR2PRIV',
          workLocation: 'HN',
          slotsNeeded: 1,
          hourlyRateVnd: 50000,
          shiftStart: '08:00',
          shiftEnd: '17:00',
          validFrom: '2026-01-01',
          validTo: '2026-12-31',
        }],
      }),
    );
    privateOrderId = privOrderResult.id;
    privateSlotId = privOrderResult.slots[0]!.id;
    orderIds.push(privateOrderId);
    slotIds.push(privateSlotId);

    // Active assignment for Alice (HR_STAFF) on the public order. Eve
    // is the unassigned HR_STAFF.
    const assignmentAliceResult = await withContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      assignRecruiterToOrder(tx, {
        staffingOrderId: publicOrderId,
        recruiterUserId: aliceId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'F9-B R2 assign Alice to public order',
      }),
    );
    assignmentAlicePublicId = assignmentAliceResult.id;
    assignmentIds.push(assignmentAlicePublicId);

    // Active project assignment for the WORKER on the public project —
    // required for the WORKER context to see the public project via
    // `hrp_project_visible_for` (WORKER sees public OR active
    // assignment; we exercise the active-assignment path here).
    // ProjectAssignment requires: workerId (FK to Worker.id),
    // projectId (FK to Project.id), employeeCode (string), and
    // validFrom (timestamptz). `status` and `startDate` are not
    // settable here — assignment is ACTIVE when validTo is null and
    // validFrom is past, and the start date lives in `validFrom`.
    const pa = await admin.projectAssignment.create({
      data: {
        projectId: publicProjectId,
        workerId,
        employeeCode: `${runId}-EMP`,
        employmentType: 'HRP_EMPLOYED',
        validFrom: new Date('2026-01-01T00:00:00Z'),
        validTo: null,
      },
      select: { id: true },
    });
    projectAssignmentIds.push(pa.id);

    // Candidate submission for the VENDOR on the public project —
    // required for the VENDOR_* context to see the public project via
    // `hrp_project_visible_for` (VENDOR_* sees public OR own
    // submission; we exercise the own-submission path here, which is
    // distinct from the MKT/CTV public-only path).
    const sub = await admin.candidateSubmission.create({
      data: {
        projectId: publicProjectId,
        vendorId,
        fullName: `${runId} Vendor Applicant`,
        phone: `${runId}-vsub`,
        status: 'NEW',
      },
      select: { id: true },
    });
    submissionIds.push(sub.id);
  }, 60_000);

  afterAll(async () => {
    try {
      // FK-safe reverse teardown.
      await admin.candidateSubmission.deleteMany({ where: { id: { in: submissionIds } } });
      await admin.projectAssignment.deleteMany({ where: { id: { in: projectAssignmentIds } } });
      await admin.staffingOrderRecruiterAssignment.deleteMany({
        where: { id: { in: assignmentIds } },
      });
      await admin.staffingOrderSlot.updateMany({
        where: { id: { in: slotIds } },
        data: { jobOpeningId: null },
      });
      await admin.staffingOrderSlot.deleteMany({ where: { id: { in: slotIds } } });
      await admin.staffingOrder.deleteMany({ where: { id: { in: orderIds } } });
      await admin.project.deleteMany({ where: { id: { in: projectIds } } });
      await admin.clientCompany.deleteMany({ where: { id: { in: companyIds } } });
      await admin.worker.deleteMany({ where: { id: { in: [workerId] } } });
      await admin.vendor.deleteMany({ where: { id: { in: [vendorId] } } });
      await admin.user.deleteMany({ where: { id: { in: userIds } } });

      const residue = {
        submissions: await admin.candidateSubmission.count({ where: { id: { in: submissionIds } } }),
        projectAssignments: await admin.projectAssignment.count({
          where: { id: { in: projectAssignmentIds } },
        }),
        assignments: await admin.staffingOrderRecruiterAssignment.count({
          where: { id: { in: assignmentIds } },
        }),
        slots: await admin.staffingOrderSlot.count({ where: { id: { in: slotIds } } }),
        orders: await admin.staffingOrder.count({ where: { id: { in: orderIds } } }),
        projects: await admin.project.count({ where: { id: { in: projectIds } } }),
        companies: await admin.clientCompany.count({ where: { id: { in: companyIds } } }),
        users: await admin.user.count({ where: { id: { in: userIds } } }),
      };
      for (const [k, v] of Object.entries(residue)) {
        expect(v, `zero-residue.${k} for F9-B R2 runId=${runId}`).toBe(0);
      }
    } finally {
      await Promise.all([
        admin.$disconnect(),
        writer.$disconnect(),
        writer2.$disconnect(),
        writer3.$disconnect(),
      ]);
    }
  }, 60_000);

  // ─────────────────────────────────────────────────────────────────────
  // Precondition: target slots exist (admin can see them).
  // ─────────────────────────────────────────────────────────────────────
  it('PRECONDITION: public and private slots exist and are visible to admin', async () => {
    const publicRow = await admin.staffingOrderSlot.findUnique({
      where: { id: publicSlotId },
      select: { id: true, staffingOrderId: true },
    });
    const privateRow = await admin.staffingOrderSlot.findUnique({
      where: { id: privateSlotId },
      select: { id: true, staffingOrderId: true },
    });
    expect(publicRow?.id).toBe(publicSlotId);
    expect(publicRow?.staffingOrderId).toBe(publicOrderId);
    expect(privateRow?.id).toBe(privateSlotId);
    expect(privateRow?.staffingOrderId).toBe(privateOrderId);
  });

  // ─────────────────────────────────────────────────────────────────────
  // MKT — public JobPosting card surface. Canonical read of
  // `staffing_order_slots` for `is_public = true` projects.
  // ─────────────────────────────────────────────────────────────────────
  it('MKT-01 MKT can SELECT slot of public project', async () => {
    const visible = await withContext(writer, mktUserId, 'MKT', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        publicSlotId,
      );
      return rows.length;
    });
    expect(visible, 'MKT must see public slot via canonical RLS').toBe(1);
  });

  it('MKT-02 MKT cannot SELECT slot of private project (zero-row fail-closed)', async () => {
    const visible = await withContext(writer, mktUserId, 'MKT', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        privateSlotId,
      );
      return rows.length;
    });
    expect(visible, 'MKT must NOT see private slot').toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────
  // CTV — public referral surface. Same canonical rule as MKT for
  // `is_public = true` projects.
  // ─────────────────────────────────────────────────────────────────────
  it('CTV-01 CTV can SELECT slot of public project', async () => {
    const visible = await withContext(writer, ctvUserId, 'CTV', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        publicSlotId,
      );
      return rows.length;
    });
    expect(visible, 'CTV must see public slot via canonical RLS').toBe(1);
  });

  it('CTV-02 CTV cannot SELECT slot of private project (zero-row fail-closed)', async () => {
    const visible = await withContext(writer, ctvUserId, 'CTV', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        privateSlotId,
      );
      return rows.length;
    });
    expect(visible, 'CTV must NOT see private slot').toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────
  // PM / sub-PM — Demand Tree surface. PM sees slots of their own
  // project; other PM's project is invisible.
  // ─────────────────────────────────────────────────────────────────────
  it('PM-01 PM can SELECT slot of own project', async () => {
    const visible = await withContext(writer, pmPublicUserId, 'PM', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        publicSlotId,
      );
      return rows.length;
    });
    expect(visible, 'PM must see own project slot via canonical RLS').toBe(1);
  });

  it('PM-02 PM cannot SELECT slot of other PM project (zero-row fail-closed)', async () => {
    const visible = await withContext(writer, pmPublicUserId, 'PM', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        privateSlotId,
      );
      return rows.length;
    });
    expect(visible, 'PM must NOT see other PM project slot').toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────
  // ADMIN / HR_MANAGER — regression of the broad read path. Both must
  // see both slots.
  // ─────────────────────────────────────────────────────────────────────
  it('ADMIN-01 ADMIN can SELECT slot of any project', async () => {
    const visiblePublic = await withContext(writer, adminUserId, 'ADMIN', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        publicSlotId,
      );
      return rows.length;
    });
    expect(visiblePublic, 'ADMIN must see public slot').toBe(1);
    const visiblePrivate = await withContext(writer, adminUserId, 'ADMIN', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        privateSlotId,
      );
      return rows.length;
    });
    expect(visiblePrivate, 'ADMIN must see private slot').toBe(1);
  });

  it('HRM-01 HR_MANAGER can SELECT slot of any project', async () => {
    const visiblePublic = await withContext(writer, managerUserId, 'HR_MANAGER', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        publicSlotId,
      );
      return rows.length;
    });
    expect(visiblePublic, 'HR_MANAGER must see public slot').toBe(1);
    const visiblePrivate = await withContext(writer, managerUserId, 'HR_MANAGER', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        privateSlotId,
      );
      return rows.length;
    });
    expect(visiblePrivate, 'HR_MANAGER must see private slot').toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────
  // DIRECTOR / SALE / WORKER / VENDOR_* — each must see the public slot
  // and the private slot per `hrp_project_visible_for` rules:
  //   DIRECTOR / SALE: any project (broader admin-style read).
  //   WORKER: public OR active project assignment (active-assignment
  //           path here; the worker has an ACTIVE assignment on the
  //           public project).
  //   VENDOR_ADMIN / VENDOR_STAFF: public OR own submission on the
  //           project (own-submission path here; the vendor has a
  //           SUBMITTED submission on the public project).
  // ─────────────────────────────────────────────────────────────────────
  it('DIRECTOR-01 DIRECTOR can SELECT slot of any project', async () => {
    const visiblePublic = await withContext(writer, directorUserId, 'DIRECTOR', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        publicSlotId,
      );
      return rows.length;
    });
    expect(visiblePublic, 'DIRECTOR must see public slot').toBe(1);
    const visiblePrivate = await withContext(writer, directorUserId, 'DIRECTOR', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        privateSlotId,
      );
      return rows.length;
    });
    expect(visiblePrivate, 'DIRECTOR must see private slot').toBe(1);
  });

  it('SALE-01 SALE can SELECT slot of any project', async () => {
    const visiblePublic = await withContext(writer, saleUserId, 'SALE', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        publicSlotId,
      );
      return rows.length;
    });
    expect(visiblePublic, 'SALE must see public slot').toBe(1);
    const visiblePrivate = await withContext(writer, saleUserId, 'SALE', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        privateSlotId,
      );
      return rows.length;
    });
    expect(visiblePrivate, 'SALE must see private slot').toBe(1);
  });

  it('WORKER-01 WORKER can SELECT slot of public project (via active assignment)', async () => {
    const visible = await withWorkerContext(writer, workerUserId, 'WORKER', workerId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        publicSlotId,
      );
      return rows.length;
    });
    expect(visible, 'WORKER must see slot of project with active assignment').toBe(1);
  });

  it('WORKER-02 WORKER cannot SELECT slot of private project (zero-row fail-closed)', async () => {
    const visible = await withWorkerContext(writer, workerUserId, 'WORKER', workerId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        privateSlotId,
      );
      return rows.length;
    });
    expect(visible, 'WORKER must NOT see slot of unrelated private project').toBe(0);
  });

  it('VENDOR_ADMIN-01 VENDOR_ADMIN can SELECT slot of project with own submission', async () => {
    const visible = await withVendorContext(
      writer,
      vendorAdminUserId,
      'VENDOR_ADMIN',
      vendorId,
      async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          'SELECT id FROM staffing_order_slots WHERE id = $1',
          publicSlotId,
        );
        return rows.length;
      },
    );
    expect(visible, 'VENDOR_ADMIN must see slot of project with own submission').toBe(1);
  });

  it('VENDOR_ADMIN-02 VENDOR_ADMIN cannot SELECT slot of unrelated private project (zero-row fail-closed)', async () => {
    const visible = await withVendorContext(
      writer,
      vendorAdminUserId,
      'VENDOR_ADMIN',
      vendorId,
      async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          'SELECT id FROM staffing_order_slots WHERE id = $1',
          privateSlotId,
        );
        return rows.length;
      },
    );
    expect(visible, 'VENDOR_ADMIN must NOT see slot of unrelated private project').toBe(0);
  });

  it('VENDOR_STAFF-01 VENDOR_STAFF can SELECT slot of project with own submission', async () => {
    const visible = await withVendorContext(
      writer,
      vendorStaffUserId,
      'VENDOR_STAFF',
      vendorId,
      async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          'SELECT id FROM staffing_order_slots WHERE id = $1',
          publicSlotId,
        );
        return rows.length;
      },
    );
    expect(visible, 'VENDOR_STAFF must see slot of project with own submission').toBe(1);
  });

  it('VENDOR_STAFF-02 VENDOR_STAFF cannot SELECT slot of unrelated private project (zero-row fail-closed)', async () => {
    const visible = await withVendorContext(
      writer,
      vendorStaffUserId,
      'VENDOR_STAFF',
      vendorId,
      async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          'SELECT id FROM staffing_order_slots WHERE id = $1',
          privateSlotId,
        );
        return rows.length;
      },
    );
    expect(visible, 'VENDOR_STAFF must NOT see slot of unrelated private project').toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────
  // HR_STAFF — assigned / unassigned / revoked. The narrow HR_STAFF
  // SELECT policy `hrp_sora_order_slots_staff_select` (P1-A0.4) gates
  // HR_STAFF rows on `hrp_staffing_order_visible_for`. Alice has an
  // ACTIVE assignment on the public order; Eve has no assignment.
  // ─────────────────────────────────────────────────────────────────────
  it('HRSTAFF-01 assigned HR_STAFF can SELECT slot of assigned order', async () => {
    const visible = await withContext(writer, aliceId, 'HR_STAFF', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        publicSlotId,
      );
      return rows.length;
    });
    expect(visible, 'assigned HR_STAFF must see slot of assigned order').toBe(1);
  });

  it('HRSTAFF-02 unassigned HR_STAFF cannot SELECT slot of order they are not assigned to (zero-row fail-closed)', async () => {
    const visible = await withContext(writer, eveId, 'HR_STAFF', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        publicSlotId,
      );
      return rows.length;
    });
    expect(visible, 'unassigned HR_STAFF must NOT see slot of unrelated order').toBe(0);
  });

  it('HRSTAFF-03 revoked HR_STAFF cannot SELECT slot of order whose assignment was revoked (zero-row fail-closed)', async () => {
    // Revoke Alice's assignment on the public order, then re-check the
    // SELECT scope from the same writer connection. The narrow
    // `hrp_sora_order_slots_staff_select` policy must observe the
    // REVOKED status and return zero rows.
    const revokeResult = await withContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      revokeRecruiterFromOrder(tx, {
        staffingOrderId: publicOrderId,
        assignmentId: assignmentAlicePublicId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'F9-B R2 revoke Alice',
      }),
    );
    expect(revokeResult.status).toBe('REVOKED');

    const visible = await withContext(writer, aliceId, 'HR_STAFF', async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM staffing_order_slots WHERE id = $1',
        publicSlotId,
      );
      return rows.length;
    });
    expect(visible, 'revoked HR_STAFF must NOT see slot of revoked order').toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────
  // B-01 preservation: HR_STAFF direct UPDATE on any slot column must
  // still fail closed. The forbidden UPDATE may return zero rows (RLS
  // USING not matched) OR throw (RLS rejection). The assertion is the
  // post-attempt admin snapshot is byte-equivalent to the pre-attempt
  // value.
  // ─────────────────────────────────────────────────────────────────────
  describe('HR_STAFF direct-write negative proof (B-01 / B-02 / B-03 preserved)', () => {
    it('HRSTAFF-04 HR_STAFF direct UPDATE on slots_needed still fails closed (zero-row fail-closed)', async () => {
      const pre = await admin.staffingOrderSlot.findUnique({
        where: { id: publicSlotId },
        select: { slotsNeeded: true },
      });
      expect(pre?.slotsNeeded).toBe(1);

      let thrown: unknown = null;
      try {
        await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
          tx.$executeRawUnsafe(
            'UPDATE staffing_order_slots SET slots_needed = 999 WHERE id = $1',
            publicSlotId,
          ),
        );
      } catch (e) {
        thrown = e;
      }

      const post = await admin.staffingOrderSlot.findUnique({
        where: { id: publicSlotId },
        select: { slotsNeeded: true },
      });
      // Fail-closed contract: post.slotsNeeded is unchanged (zero-row
      // or throw — either way the column is preserved). We assert
      // equivalence.
      expect(post?.slotsNeeded).toBe(pre?.slotsNeeded);
      // We do NOT assert thrown === null; RLS may surface this as a
      // rejected UPDATE (throw) OR a 0-row UPDATE (no-op). Both are
      // acceptable. We just note that the column is unchanged.
      if (thrown) {
        // If RLS threw, the message should reference a permission error.
        const msg = String((thrown as Error).message ?? '');
        expect(
          /permission denied|row-level security|42501|new row violates/i.test(msg),
          `expected RLS rejection or permission error; got: ${msg.slice(0, 240)}`,
        ).toBe(true);
      }
    });

    it('HRSTAFF-05 HR_STAFF direct INSERT on staffing_order_slots still fails closed', async () => {
      // HR_STAFF has no INSERT policy on staffing_order_slots. The
      // attempt must fail closed (throw or zero-row; we assert throw
      // because INSERT with RLS that does not match a USING policy
      // typically throws a permission error before returning rows).
      let thrown: unknown = null;
      try {
        await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
          tx.$executeRawUnsafe(
            `INSERT INTO staffing_order_slots
              (id, staffing_order_id, position_title, position_code,
               work_location, slots_needed, slots_filled, hourly_rate_vnd,
               shift_start, shift_end, valid_from, valid_to,
               created_at, updated_at)
             VALUES (gen_random_uuid()::text, $1, 'F9B-R2 FAKE', 'FAKE',
               'XX', 1, 0, 50000,
               '08:00', '17:00', '2026-01-01', '2026-12-31',
               now(), now())`,
            publicOrderId,
          ),
        );
      } catch (e) {
        thrown = e;
      }
      expect(thrown, 'HR_STAFF direct INSERT must be rejected').not.toBeNull();
      // And no fake row landed.
      const fake = await admin.staffingOrderSlot.findFirst({
        where: { positionCode: 'FAKE' },
        select: { id: true },
      });
      expect(fake).toBeNull();
    });

    it('HRSTAFF-06 HR_STAFF direct DELETE on staffing_order_slots still fails closed (no DELETE policy)', async () => {
      // RESTRICTIVE hrp_staffing_order_slots_no_delete policy (from
      // m1_07b runtime posture closure) carries USING (false), so the
      // DELETE attempt must be silently filtered to 0 affected rows
      // (no throw, but no row removed either). The fail-closed
      // assertion is the row-count delta == 0 AND the row still
      // exists. We also accept a thrown RLS rejection as an
      // alternative fail-closed shape — the AC-02 contract allows
      // either (zero-row OR throw), as long as the row survives.
      let thrown: unknown = null;
      let affected: unknown = null;
      try {
        affected = await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
          tx.$executeRawUnsafe(
            'DELETE FROM staffing_order_slots WHERE id = $1',
            publicSlotId,
          ),
        );
      } catch (e) {
        thrown = e;
      }

      // Either shape is acceptable: throw OR 0-row no-op.
      const isThrow = thrown !== null;
      const isZeroRow = affected === 0 || affected === undefined || affected === null;
      expect(
        isThrow || isZeroRow,
        `HR_STAFF direct DELETE must be fail-closed: either throw OR zero-row. got thrown=${
          thrown ? String((thrown as Error).message ?? '').slice(0, 160) : 'null'
        } affected=${String(affected)}`,
      ).toBe(true);

      // The row must still be present (fail-closed: column state preserved).
      const stillThere = await admin.staffingOrderSlot.findUnique({
        where: { id: publicSlotId },
        select: { id: true },
      });
      expect(stillThere?.id).toBe(publicSlotId);
    });

    it('HRSTAFF-07 PUBLIC cannot EXECUTE hrp_f9b_bind_slot_to_opening (regression of B-02)', async () => {
      // PUBLIC EXECUTE must be revoked on the binding primitive. We
      // assert that no row in `information_schema.routine_privileges`
      // has `grantee = 'PUBLIC'` and `privilege_type = 'EXECUTE'` for
      // the function.
      const rows = await admin.$queryRawUnsafe<Array<{ grantee: string }>>(
        "SELECT grantee FROM information_schema.routine_privileges WHERE routine_schema = 'public' AND routine_name = 'hrp_f9b_bind_slot_to_opening' AND privilege_type = 'EXECUTE'",
      );
      const publicGrants = rows.filter((r) => r.grantee === 'PUBLIC');
      expect(publicGrants, 'PUBLIC must NOT have EXECUTE on the binding primitive').toHaveLength(0);
      // The intended writer roles (app_user_writer, app_user) must
      // still have EXECUTE.
      const writerGrants = rows.filter((r) => r.grantee === 'app_user_writer' || r.grantee === 'app_user');
      expect(writerGrants.length, 'app_user_writer + app_user must have EXECUTE').toBeGreaterThanOrEqual(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // Live policy/function posture in synthetic DB. Mirrors F9-B round-1
  // AC-04 but adds the round-2 SELECT policy posture checks.
  // ─────────────────────────────────────────────────────────────────────
  describe('POL live posture in synthetic DB', () => {
    it('POL-01 the over-restrictive hrp_f9b_slots_manager_select policy is gone', async () => {
      const rows = await admin.$queryRawUnsafe<Array<{ policyname: string }>>(
        "SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staffing_order_slots' AND policyname = 'hrp_f9b_slots_manager_select'",
      );
      expect(rows).toHaveLength(0);
    });

    it('POL-02 the canonical FOR SELECT policy hrp_f9b_slots_project_select exists with hrp_project_visible_for predicate', async () => {
      const rows = await admin.$queryRawUnsafe<Array<{ policyname: string; cmd: string; qual: string | null }>>(
        "SELECT policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staffing_order_slots' AND policyname = 'hrp_f9b_slots_project_select'",
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].cmd).toBe('SELECT');
      // Canonical predicate: `hrp_project_visible_for(so.project_id)`.
      expect(rows[0].qual).toMatch(/hrp_project_visible_for/);
      expect(rows[0].qual).toMatch(/so\.project_id/);
    });

    it('POL-03 round-1 SECURITY DEFINER primitive posture is preserved (prosecdef + search_path)', async () => {
      const rows = await admin.$queryRawUnsafe<Array<{ proname: string; prosecdef: boolean; proconfig: string[] | null }>>(
        "SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname = 'hrp_f9b_bind_slot_to_opening'",
      );
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows[0].prosecdef).toBe(true);
      const cfg = rows[0].proconfig ?? [];
      const sp = cfg.find((c) => c.startsWith('search_path='));
      expect(sp, 'search_path must be pinned on the binding primitive').toBeDefined();
      expect(sp).toContain('pg_catalog');
    });

    it('POL-04 round-1 hardening of hrp_f9_openings_staff_insert is preserved (cross-order sub-select)', async () => {
      const rows = await admin.$queryRawUnsafe<Array<{ policyname: string; with_check: string | null }>>(
        "SELECT policyname, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'job_openings' AND policyname = 'hrp_f9_openings_staff_insert'",
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].with_check ?? '').toMatch(/s\.staffing_order_id = job_openings\.staffing_order_id/);
    });

    it('POL-05 round-1 manager INSERT / UPDATE policies are preserved (HR_MANAGER / ADMIN write path intact)', async () => {
      const rows = await admin.$queryRawUnsafe<Array<{ policyname: string; cmd: string }>>(
        "SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staffing_order_slots' AND policyname IN ('hrp_f9b_slots_manager_insert', 'hrp_f9b_slots_manager_update')",
      );
      expect(rows).toHaveLength(2);
      expect(rows.find((r) => r.policyname === 'hrp_f9b_slots_manager_insert')?.cmd).toBe('INSERT');
      expect(rows.find((r) => r.policyname === 'hrp_f9b_slots_manager_update')?.cmd).toBe('UPDATE');
    });

    it('POL-06 no HR_STAFF DELETE policy on staffing_order_slots (regression guard)', async () => {
      const rows = await admin.$queryRawUnsafe<Array<{ cmd: string; roles: string[] }>>(
        "SELECT cmd, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staffing_order_slots' AND 'HR_STAFF' = ANY(roles)",
      );
      const deletes = rows.filter((r) => r.cmd === 'DELETE');
      expect(deletes).toHaveLength(0);
    });

    it('POL-07 the narrow HR_STAFF SELECT policy hrp_sora_order_slots_staff_select is preserved (P1-A0.4)', async () => {
      const rows = await admin.$queryRawUnsafe<Array<{ policyname: string; cmd: string }>>(
        "SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staffing_order_slots' AND policyname = 'hrp_sora_order_slots_staff_select'",
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].cmd).toBe('SELECT');
    });
  });
});
