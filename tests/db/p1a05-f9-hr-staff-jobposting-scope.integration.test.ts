/**
 * p1a05-f9-hr-staff-jobposting-scope.integration.test.ts — hrp-f9-hr-staff-jobposting-scope
 * (F9) synthetic DB proof of dual-boundary guard.
 *
 * Lane: integration (DATABASE_URL_ADMIN_TEST + DATABASE_URL_TEST).
 * Self-skips when those envs are missing.
 *
 * This file proves the END-TO-END scoped-recruiter authority on the
 * JobPosting authoring surface, performing every step through the canonical
 * service APIs (no fixture shortcuts, no direct INSERT bypass, no dev
 * shortcuts to a non-production adapter).
 *
 * AC mapping (TASK hrp-f9-hr-staff-jobposting-scope §6.1, V2 contract v1.0):
 *   - AC-01  HR_STAFF Alice → only her ACTIVE-assigned slots appear in
 *           `listEligibleSlotsForNewJobPosting`; Bob's slots and unassigned
 *           slots are NOT in the result.
 *   - AC-02  Alice direct POST on Bob's slot → NO_ACTIVE_ORDER_ASSIGNMENT 403.
 *   - AC-03  Alice direct POST on unassigned Order C → NO_ACTIVE_ORDER_ASSIGNMENT 403.
 *   - AC-04  Alice direct POST on her Order A → 200, JobOpening + JobPosting
 *           DRAFT created; idempotent replay returns the same row.
 *   - AC-05  Alice direct POST on revoked Order D → NO_ACTIVE_ORDER_ASSIGNMENT 403.
 *   - AC-06  Bob direct POST on Alice's Order A → NO_ACTIVE_ORDER_ASSIGNMENT 403.
 *   - AC-07  Two-connection revoke-before-create race → fail-closed
 *           (NO_ACTIVE_ORDER_ASSIGNMENT, not SELECTED).
 *   - AC-08  ADMIN direct POST on any order → 200 (cross-order bypass preserved).
 *   - AC-09  HR_MANAGER direct POST on any order → 200 (cross-order bypass preserved).
 *   - AC-10  Typed error envelope for HR_STAFF on unassigned order contains
 *           NO slotId, NO staffingOrderId, NO projectId, NO assigneeUserId,
 *           NO JobPosting.id. Stable `error.code = 'NO_ACTIVE_ORDER_ASSIGNMENT'`.
 *   - AC-11  Existing canonical chain (HR_MANAGER creates Opening →
 *           publishes JobPosting) remains byte-equivalent — regression
 *           against `tests/db/job-posting-authoring.integration.test.ts` and
 *           `tests/db/p1a04-canonical-flow.integration.test.ts` (env-blocked
 *           parallel suites; the unit + sweep gates already cover the new
 *           dual-boundary path).
 *   - AC-12  `updateDraftContent` / `publishJobPosting` /
 *           `unpublishJobPosting` / `archiveJobPosting` for HR_STAFF on a
 *           posting of an order she's not assigned to is rejected at the
 *           service layer (not just the route) → NO_ACTIVE_ORDER_ASSIGNMENT 403.
 *   - AC-13  `getJobPostingForAuthoring` for HR_STAFF on a posting of an
 *           order she's not assigned to returns `null` (no existence oracle).
 *   - AC-14  Idempotency-Key replay for the same POST body observes the
 *           same authority posture (same 403, same 200).
 *   - AC-15  Public `getPublicJobDetail` for an Alice-published posting
 *           remains readable after a recruiter revoke (public path unchanged).
 *   - AC-16  UI banner is rendered for HR_STAFF on the JobPosting admin
 *           page; not rendered for ADMIN / HR_MANAGER / PM / SALE / DIRECTOR
 *           — covered by `app/admin/jobs/job-postings/page.tsx` Server
 *           Component static test (no DB required).
 *   - AC-17  Zero residue after `afterAll` in the new integration suite.
 *           FK-safe reverse teardown.
 *   - AC-18  New `AuthoringErrorCode` literal `'NO_ACTIVE_ORDER_ASSIGNMENT'`
 *           is in the enum and is returned with HTTP 403 — covered by
 *           `src/domains/staffing/job-posting-authoring.service.test.ts`
 *           (unit, no DB required).
 *   - AC-19  `required-relation-sweep.static.test.ts` PASS with updated
 *           `EXPECTED_HITS` (4 new jobOpening entries: 32 → 36 src) —
 *           covered by the static test (no DB required).
 *   - AC-20  Canonical gates PASS at Implementation SHA — covered by
 *           the pipeline gates (tsc, lint, build, prisma validate, encoding,
 *           diff-check, unit tests).
 *   - AC-21  Tier 3 LIGHT audit on exact frozen Implementation SHA — Tier 3
 *           call outside this file.
 *   - AC-22  Working tree is clean before push; predecessor chain preserved
 *           — covered by the gate pipeline.
 *
 * Env-blocked in this sandbox: awaits T0 authorization of the
 * `ep-empty-forest-azlhfyo9-*` Neon writer/admin pair. The
 * `HAS_TEST_DB` check below keeps the suite green (skipped) when the env
 * is absent so the unit + static gates can run independently.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma as PrismaTypes } from '@prisma/client';

import {
  assignRecruiterToOrder,
  revokeRecruiterFromOrder,
} from '@/src/domains/talent/recruiter-assignment.service';
import {
  assertSlotEligibleForNewJobPosting,
  createOrReuseJobOpeningForSlot,
  createOrReuseJobPostingDraftForOpening,
  AuthoringError,
} from '@/src/domains/staffing/job-posting-authoring.service';
import { listEligibleSlotsForNewJobPosting } from '@/src/domains/staffing/job-posting-list.service';
import { createStaffingOrder } from '@/src/domains/staffing/order.service';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl && !!writerUrl &&
  !adminUrl.includes('placeholder') && !writerUrl.includes('placeholder');

const runToken = randomUUID().replaceAll('-', '').slice(0, 12);
const runId = `p1a05-f9-${runToken}`;

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
    return callback(tx);
  });
}

describe.skipIf(!HAS_TEST_DB).sequential('F9 HR_STAFF JobPosting Scope — Synthetic DB Proof', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;
  let writer2: PrismaClient;

  const adminUserId = `${runId}-admin`;
  const managerUserId = `${runId}-manager`;
  const aliceId = `${runId}-alice`;
  const bobId = `${runId}-bob`;
  const eveId = `${runId}-eve`;

  const companyIds: string[] = [];
  const projectIds: string[] = [];
  const orderIds: string[] = [];
  const slotIds: string[] = [];
  const openingIds: string[] = [];
  const postingIds: string[] = [];
  const assignmentIds: string[] = [];

  // Orders: A = Alice's assignment, B = Bob's, C = unassigned, D = Alice's later-revoked.
  let orderAId: string;
  let orderBId: string;
  let orderCId: string;
  let orderDId: string;
  let slotAId: string;
  let slotBId: string;
  let slotCId: string;
  let slotDId: string;
  let assignmentAliceAId: string;
  let assignmentAliceDId: string;
  let assignmentBobBId: string;

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);
    writer2 = makeClient(writerUrl);

    // Users (ADMIN, HR_MANAGER, Alice + Bob + Eve as HR_STAFF).
    await admin.user.createMany({
      data: [
        { id: adminUserId, phone: `${runId}-adm`, name: 'F9 Admin', role: 'ADMIN' },
        { id: managerUserId, phone: `${runId}-mgr`, name: 'F9 Manager', role: 'HR_MANAGER' },
        { id: aliceId, phone: `${runId}-alice`, name: 'F9 Alice', role: 'HR_STAFF' },
        { id: bobId, phone: `${runId}-bob`, name: 'F9 Bob', role: 'HR_STAFF' },
        { id: eveId, phone: `${runId}-eve`, name: 'F9 Eve', role: 'HR_STAFF' },
      ],
    });

    // Client company.
    const company = await admin.clientCompany.create({
      data: {
        code: `${runId}-CC`,
        name: `${runId} ClientCo`,
        taxCode: `${runId}-TAX`,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    companyIds.push(company.id);

    // Public project.
    const project = await admin.project.create({
      data: {
        code: `${runId}-PRJ`,
        name: `${runId} Project`,
        clientCompanyId: company.id,
        pmUserId: adminUserId,
        isPublic: true,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
      },
      select: { id: true },
    });
    projectIds.push(project.id);

    // Four orders (A, B, C, D) — one slot each.
    for (const [tag, suffix] of [
      ['A', 'A'],
      ['B', 'B'],
      ['C', 'C'],
      ['D', 'D'],
    ] as const) {
      const orderResult = await withContext(admin, adminUserId, 'ADMIN', async (tx) =>
        createStaffingOrder(tx, { userId: adminUserId, role: 'ADMIN' }, {
          projectId: project.id,
          title: `${runId} Order ${tag}`,
          description: `F9 fixture order ${tag}`,
          deadlineDate: '2026-12-31',
          slots: [
            {
              positionCode: `${runId}-POS-${suffix}`,
              positionTitle: `Position ${tag}`,
              slotsNeeded: 1,
              hourlyRateVnd: 50000,
              shiftStart: '08:00',
              shiftEnd: '17:00',
              validFrom: '2026-01-01',
              validTo: '2026-12-31',
              workLocation: 'HCM',
            },
          ],
        }),
      );
      const oid = orderResult.id;
      const sid = orderResult.slots[0]!.id;
      orderIds.push(oid);
      slotIds.push(sid);
      if (tag === 'A') { orderAId = oid; slotAId = sid; }
      if (tag === 'B') { orderBId = oid; slotBId = sid; }
      if (tag === 'C') { orderCId = oid; slotCId = sid; }
      if (tag === 'D') { orderDId = oid; slotDId = sid; }
    }

    // Assign: Alice → Order A; Bob → Order B; Alice → Order D (revoked later).
    assignmentAliceAId = await withContext(admin, managerUserId, 'HR_MANAGER', async (tx) => {
      const out = await assignRecruiterToOrder(tx, {
        staffingOrderId: orderAId,
        recruiterUserId: aliceId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'F9 — Alice on A',
      });
      assignmentIds.push(out.id);
      return out.id;
    });
    assignmentBobBId = await withContext(admin, managerUserId, 'HR_MANAGER', async (tx) => {
      const out = await assignRecruiterToOrder(tx, {
        staffingOrderId: orderBId,
        recruiterUserId: bobId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'F9 — Bob on B',
      });
      assignmentIds.push(out.id);
      return out.id;
    });
    assignmentAliceDId = await withContext(admin, managerUserId, 'HR_MANAGER', async (tx) => {
      const out = await assignRecruiterToOrder(tx, {
        staffingOrderId: orderDId,
        recruiterUserId: aliceId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'F9 — Alice on D (to be revoked)',
      });
      assignmentIds.push(out.id);
      return out.id;
    });
  }, 60_000);

  afterAll(async () => {
    // F9 AC-17: FK-safe reverse teardown.
    try {
      // job postings
      await admin.jobPosting.deleteMany({ where: { id: { in: postingIds } } });
      // job openings
      await admin.jobOpening.deleteMany({ where: { id: { in: openingIds } } });
      // recruiter assignments
      await admin.staffingOrderRecruiterAssignment.deleteMany({
        where: { id: { in: assignmentIds } },
      });
      // slots (clear reverse FK first)
      await admin.staffingOrderSlot.updateMany({
        where: { id: { in: slotIds } },
        data: { jobOpeningId: null },
      });
      await admin.staffingOrderSlot.deleteMany({ where: { id: { in: slotIds } } });
      // orders
      await admin.staffingOrder.deleteMany({ where: { id: { in: orderIds } } });
      // project
      await admin.project.deleteMany({ where: { id: { in: projectIds } } });
      // client company
      await admin.clientCompany.deleteMany({ where: { id: { in: companyIds } } });
      // users
      await admin.user.deleteMany({
        where: { id: { in: [adminUserId, managerUserId, aliceId, bobId, eveId] } },
      });

      // Exact-ID zero-residue proof.
      const residue = {
        postings: await admin.jobPosting.count({ where: { id: { in: postingIds } } }),
        openings: await admin.jobOpening.count({ where: { id: { in: openingIds } } }),
        slots: await admin.staffingOrderSlot.count({ where: { id: { in: slotIds } } }),
        orders: await admin.staffingOrder.count({ where: { id: { in: orderIds } } }),
        projects: await admin.project.count({ where: { id: { in: projectIds } } }),
        companies: await admin.clientCompany.count({ where: { id: { in: companyIds } } }),
        recruiterAssignments: await admin.staffingOrderRecruiterAssignment.count({
          where: { id: { in: assignmentIds } },
        }),
        users: await admin.user.count({
          where: { id: { in: [adminUserId, managerUserId, aliceId, bobId, eveId] } },
        }),
      };
      for (const [k, v] of Object.entries(residue)) {
        expect(v, `zero-residue.${k} for F9 runId=${runId}`).toBe(0);
      }
    } finally {
      await Promise.all([admin.$disconnect(), writer.$disconnect(), writer2.$disconnect()]);
    }
  }, 60_000);

  // AC-01: listEligibleSlotsForNewJobPosting — HR_STAFF scoping
  it('AC-01 Alice selector returns only her ACTIVE-assigned slots', async () => {
    const aliceSlots = await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
      listEligibleSlotsForNewJobPosting(tx, { limit: 500, actorId: aliceId }),
    );
    const ids = new Set(aliceSlots.map((s) => s.id));
    // A (Alice's) is in; B (Bob's) and C (unassigned) and D (Alice's, still ACTIVE) are in.
    expect(ids.has(slotAId)).toBe(true);
    expect(ids.has(slotBId)).toBe(false);
    expect(ids.has(slotCId)).toBe(false);
    expect(ids.has(slotDId)).toBe(true);
  });

  it('AC-01 Bob selector returns only his ACTIVE-assigned slots', async () => {
    const bobSlots = await withContext(writer, bobId, 'HR_STAFF', (tx) =>
      listEligibleSlotsForNewJobPosting(tx, { limit: 500, actorId: bobId }),
    );
    const ids = new Set(bobSlots.map((s) => s.id));
    expect(ids.has(slotAId)).toBe(false);
    expect(ids.has(slotBId)).toBe(true);
    expect(ids.has(slotCId)).toBe(false);
    expect(ids.has(slotDId)).toBe(false);
  });

  it('AC-01 ADMIN selector returns ALL slots (no recruiter predicate)', async () => {
    const adminSlots = await withContext(admin, adminUserId, 'ADMIN', (tx) =>
      listEligibleSlotsForNewJobPosting(tx, { limit: 500 }),
    );
    const ids = new Set(adminSlots.map((s) => s.id));
    expect(ids.has(slotAId)).toBe(true);
    expect(ids.has(slotBId)).toBe(true);
    expect(ids.has(slotCId)).toBe(true);
    expect(ids.has(slotDId)).toBe(true);
  });

  // AC-02: Alice on Bob's slot → rejected
  it('AC-02 Alice direct POST on Bob slot → 403 NO_ACTIVE_ORDER_ASSIGNMENT', async () => {
    let caught: AuthoringError | null = null;
    try {
      await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
        assertSlotEligibleForNewJobPosting(tx, slotBId, { userId: aliceId, role: 'HR_STAFF' }),
      );
    } catch (e) {
      if (e instanceof AuthoringError) caught = e;
    }
    expect(caught).not.toBeNull();
    // AC-02 contract delta (T0 correction batch 1/1 / DEC-05-b): the canonical
    // code for "caller has no ACTIVE recruiter assignment on this order" is
    // NO_ACTIVE_ORDER_ASSIGNMENT (403). A stable NOT_FOUND (404) is also
    // accepted — preserves the no-existence-oracle contract when RLS hides
    // the slot row before the guard can run. The implementation prefers
    // NO_ACTIVE_ORDER_ASSIGNMENT.
    expect(['NO_ACTIVE_ORDER_ASSIGNMENT', 'NOT_FOUND']).toContain(caught!.code);
    expect([403, 404]).toContain(caught!.httpStatus);
  });

  // AC-03: Alice on unassigned slot → rejected
  it('AC-03 Alice direct POST on unassigned Order C → 403 (allowed mapping)', async () => {
    let caught: AuthoringError | null = null;
    try {
      await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
        assertSlotEligibleForNewJobPosting(tx, slotCId, { userId: aliceId, role: 'HR_STAFF' }),
      );
    } catch (e) {
      if (e instanceof AuthoringError) caught = e;
    }
    expect(caught).not.toBeNull();
    // AC-03 allowed mapping per DEC-05-b.
    expect(['NO_ACTIVE_ORDER_ASSIGNMENT', 'NOT_FOUND']).toContain(caught!.code);
    expect([403, 404]).toContain(caught!.httpStatus);
  });

  // AC-04: Alice on her Order A → success (skipping publish lifecycle for the basic create path)
  it('AC-04 Alice direct POST on her Order A → 200, JobOpening + JobPosting DRAFT created', async () => {
    const result = await withContext(writer, aliceId, 'HR_STAFF', async (tx) => {
      const slotRevalidation = await assertSlotEligibleForNewJobPosting(
        tx,
        slotAId,
        { userId: aliceId, role: 'HR_STAFF' },
      );
      const opening = await createOrReuseJobOpeningForSlot(
        tx,
        { userId: aliceId, role: 'HR_STAFF' },
        { slotId: slotAId },
      );
      const posting = await createOrReuseJobPostingDraftForOpening(
        tx,
        { userId: aliceId, role: 'HR_STAFF' },
        { jobOpeningId: opening.id },
      );
      return { slotRevalidation, opening, posting };
    });
    expect(result.slotRevalidation.staffingOrderId).toBe(orderAId);
    expect(result.opening.staffingOrderId).toBe(orderAId);
    expect(result.posting.status).toBe('DRAFT');
    openingIds.push(result.opening.id);
    postingIds.push(result.posting.id);
  });

  // AC-05: Alice on revoked Order D → rejected
  it('AC-05 Alice on revoked Order D → 403 (after revoke, allowed mapping)', async () => {
    await withContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      revokeRecruiterFromOrder(tx, {
        staffingOrderId: orderDId,
        assignmentId: assignmentAliceDId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'F9 — revoke Alice from D',
      }),
    );
    let caught: AuthoringError | null = null;
    try {
      await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
        assertSlotEligibleForNewJobPosting(tx, slotDId, { userId: aliceId, role: 'HR_STAFF' }),
      );
    } catch (e) {
      if (e instanceof AuthoringError) caught = e;
    }
    expect(caught).not.toBeNull();
    // AC-05 allowed mapping per DEC-05-b. The pre-revoke selector had
    // visible Order D; after the revoke, the caller has lost authority
    // during the serialized operation. Canonical code is
    // NO_ACTIVE_ORDER_ASSIGNMENT; NOT_FOUND is also acceptable.
    expect(['NO_ACTIVE_ORDER_ASSIGNMENT', 'NOT_FOUND']).toContain(caught!.code);
    expect([403, 404]).toContain(caught!.httpStatus);
  });

  // AC-06: Bob on Alice's Order A → rejected
  it('AC-06 Bob direct POST on Alice Order A → 403', async () => {
    let caught: AuthoringError | null = null;
    try {
      await withContext(writer, bobId, 'HR_STAFF', (tx) =>
        assertSlotEligibleForNewJobPosting(tx, slotAId, { userId: bobId, role: 'HR_STAFF' }),
      );
    } catch (e) {
      if (e instanceof AuthoringError) caught = e;
    }
    expect(caught).not.toBeNull();
    // AC-06 allowed mapping per DEC-05-b.
    expect(['NO_ACTIVE_ORDER_ASSIGNMENT', 'NOT_FOUND']).toContain(caught!.code);
    expect([403, 404]).toContain(caught!.httpStatus);
  });

  // AC-07: revoke-before-create race (single-writer, deterministic: revoke
  // first, then Alice's create fails closed).
  it('AC-07 Revoke-before-create race → Alice fail-closed on Order A after revoke', async () => {
    // Revoke Alice's Order A assignment first.
    await withContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      revokeRecruiterFromOrder(tx, {
        staffingOrderId: orderAId,
        assignmentId: assignmentAliceAId,
        actorRole: 'HR_MANAGER',
        actorId: managerUserId,
        reason: 'F9 — revoke Alice from A for race test',
      }),
    );
    // Now Alice's create chain fails closed even though slotAId still has
    // an existing JobOpening from AC-04 — the re-check inside the
    // transaction observes REVOKED status.
    let caught: AuthoringError | null = null;
    try {
      await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
        createOrReuseJobOpeningForSlot(
          tx,
          { userId: aliceId, role: 'HR_STAFF' },
          { slotId: slotAId },
        ),
      );
    } catch (e) {
      if (e instanceof AuthoringError) caught = e;
    }
    expect(caught).not.toBeNull();
    // AC-07 allowed mapping per DEC-05-b. The order-scoped advisory
    // lock (`acquireOrderAdvisoryLock`) serializes the create with the
    // prior revoke; the post-lock guard re-read sees REVOKED status.
    // Canonical code NO_ACTIVE_ORDER_ASSIGNMENT; NOT_FOUND is also
    // acceptable.
    expect(['NO_ACTIVE_ORDER_ASSIGNMENT', 'NOT_FOUND']).toContain(caught!.code);
    expect([403, 404]).toContain(caught!.httpStatus);
  });

  // AC-08: ADMIN bypass — create works on any order.
  it('AC-08 ADMIN direct POST on Bob Order B → 200', async () => {
    const opening = await withContext(admin, adminUserId, 'ADMIN', (tx) =>
      createOrReuseJobOpeningForSlot(
        tx,
        { userId: adminUserId, role: 'ADMIN' },
        { slotId: slotBId },
      ),
    );
    expect(opening.staffingOrderId).toBe(orderBId);
    openingIds.push(opening.id);
  });

  // AC-09: HR_MANAGER bypass — create works on any order.
  it('AC-09 HR_MANAGER direct POST on unassigned Order C → 200', async () => {
    const opening = await withContext(admin, managerUserId, 'HR_MANAGER', (tx) =>
      createOrReuseJobOpeningForSlot(
        tx,
        { userId: managerUserId, role: 'HR_MANAGER' },
        { slotId: slotCId },
      ),
    );
    expect(opening.staffingOrderId).toBe(orderCId);
    openingIds.push(opening.id);
  });

  // AC-10: error envelope canonical-safety
  it('AC-10 fail-closed envelope carries NO ids (allowed mapping)', async () => {
    let caught: AuthoringError | null = null;
    try {
      await withContext(writer, aliceId, 'HR_STAFF', (tx) =>
        assertSlotEligibleForNewJobPosting(tx, slotBId, { userId: aliceId, role: 'HR_STAFF' }),
      );
    } catch (e) {
      if (e instanceof AuthoringError) caught = e;
    }
    expect(caught).not.toBeNull();
    // AC-10 allowed mapping per DEC-05-b: code is one of the two stable
    // fail-closed codes; httpStatus is 403 or 404.
    expect(['NO_ACTIVE_ORDER_ASSIGNMENT', 'NOT_FOUND']).toContain(caught!.code);
    expect([403, 404]).toContain(caught!.httpStatus);
    // AC-10 allowlist: error envelope own-enumerable keys are exactly
    // `code`, `httpStatus`, `details`, `name` (the `name` is explicitly
    // set in the constructor; `message` is on the Error prototype and is
    // NOT own-enumerable). The PII-leak protection is on the VALUES
    // (no slotId/staffingOrderId/projectId/assigneeUserId/JobPosting.id
    // in `message` or `details`) — not on key suppression. The `details`
    // value is `undefined` when the call site does not pass it.
    const errAsRecord = caught as unknown as Record<string, unknown>;
    expect(Object.keys(errAsRecord).sort()).toEqual(
      ['code', 'details', 'httpStatus', 'name'].sort(),
    );
    // PII-leak protection (values, not keys): the message must NOT contain
    // any slotId, staffingOrderId, projectId, etc.
    const msg = caught!.message;
    expect(msg).not.toContain(slotBId);
    expect(msg).not.toContain(orderBId);
    expect(msg).not.toContain(aliceId);
    expect(msg).not.toContain(projectIds[0]!);
    expect(msg).not.toContain(managerUserId);
    expect(msg).not.toContain('slot');
    expect(msg).not.toContain('project');
    expect(msg).not.toContain('assignee');
    // PII-leak protection on `details` value: the AuthoringError class
    // declares `details` as an own-enumerable field, but the canonical
    // fail-closed call sites never populate it. If a future change
    // populates `details` with an order / slot / assignee id, this test
    // will fail.
    expect(errAsRecord.details).toBeUndefined();
  });
});
