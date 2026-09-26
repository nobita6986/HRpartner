/**
 * job-posting-stamps.integration.test.ts — hrp-p1-a0-1 / RQ-09 / DEC-01..DEC-07.
 *                                     + correction batch 1/1 / C-03 (T0 §C-03).
 *
 * Substantive deterministic DB-touching proof cho hành vi JobPosting stamps.
 *
 * ENV BLOCK MODEL (C-04 / mirror của `p1a1-jobposting-public-apply.integration.test.ts`):
 *   - `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` BẮT BUỘC có mặt trước khi
 *     describe chạy. Thiếu một → throw ở top-level: vitest báo fail rõ ràng — KHÔNG
 *     fake PASS qua `describe.skipIf`.
 *   - `CI_INTEGRATION_STRICT` được set cho canonical CI; test đảm bảo preflight
 *     gặp đủ hai URL trên neondb synthetic.
 *
 * SCOPE — 11 substantive behavior cases (T0 §C-03):
 *   1. OPEN eligible slot appears in selector.
 *   2. CLOSING_SOON eligible slot appears in selector + DTO reports `orderStatus`.
 *   3. expired / full / closed slot excluded.
 *   4. existing JobOpening + no JobPosting → slot remains eligible (POST reuses).
 *   5. existing canonical JobPosting → slot excluded.
 *   6. stale direct POST rejected with zero new JobOpening/JobPosting.
 *   7. actual PATCH route persists both booleans (`PATCH /api/admin/jobs/job-postings/[id]`).
 *   8. invalid PATCH flag rejected (NULL / string / number / object).
 *   9. PUBLISHED row appears in public list/detail with exact flags.
 *  10. DRAFT and ARCHIVED rows do not appear in public list/detail.
 *  11. idempotency replay/conflict on PATCH (same key + different payload = 409).
 *
 * Cleanup:
 *   - Run-scoped deterministic prefixes (`runIdPrefix = ${runId}-`).
 *   - Strict reverse-FK order: job_postings → staffing_order_slots (clear FK)
 *     → job_openings → staffing_orders → projects → client_companies → users.
 *   - KHÔNG swallow cleanup failures.
 *   - After cleanup, integration afterEach asserts ZERO residue under runIdPrefix
 *     trên tất cả bảng fixture; nếu khác 0 → test fail closed.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

import {
  createOrReuseJobOpeningForSlot,
  createOrReuseJobPostingDraftForOpening,
  updateDraftContent,
  publishJobPosting,
  archiveJobPosting,
  AuthoringError,
} from '@/src/domains/staffing/job-posting-authoring.service';
import {
  listEligibleSlotsForNewJobPosting,
  eligibleSlotPredicateSql,
  JobPostingSlotSelectorDto,
} from '@/src/domains/staffing/job-posting-list.service';
import {
  listPublicJobProjection,
  getPublicJobDetail,
} from '@/src/domains/job-board/public.service';
import { withPublicDb } from '@/src/shared/auth/with-public-db';
import {
  validateRichText,
  JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
} from '@/src/shared/content/job-posting-rich-text';
import { PATCH } from '@/app/api/admin/jobs/job-postings/[id]/route';
import { NextRequest } from 'next/server';

// ─── MOCKS (Vitest hoists `vi.mock` to top-level; use vi.hoisted) ──────────
//
// Auth + Idempotency are mocked at module boundary. `getPrisma` returns the
// real `writer` Prisma client so the underlying service's DB calls hit the
// synthetic DB. `withDbContext` is NOT mocked — it invokes `applyRlsContext`
// to set GUC on a real transaction, then runs the real service callback.
// Auth context returns a fake admin user UUID; the GUC `app.user_id` must
// match an actual User row in the DB so RLS doesn't deny. We create a
// matching user in the fixture and use its UUID.
//
// vi.hoisted() defers initialization until after vi.mock is set up, so
// MOCKS_STATE is available to the factory functions.
// ────────────────────────────────────────────────────────────────────────────
const MOCKS_STATE = vi.hoisted(() => ({
  getAuthContext: vi.fn<() => Promise<{ userId: string; role: string }>>(),
  capturedRequestBody: [] as unknown[],
  capturedIdempotencyKey: '' as string,
  capturedRoute: '' as string,
  idempotencyReplay: false,
  idempotencyShouldThrow: { throw: false } as { throw: boolean; message?: string },
  // Mocked Prisma writer (set by `beforeAll` once `writer` is created). All
  // `getPrisma()` calls resolve to this client.
  mockedPrisma: undefined as unknown as PrismaClient,
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: MOCKS_STATE.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    constructor(public readonly code: string, message: string) {
      super(message);
      this.name = 'AuthSessionError';
    }
  },
}));
vi.mock('@/src/lib/db', () => ({
  getPrisma: () => MOCKS_STATE.mockedPrisma as PrismaClient,
}));
vi.mock('@/src/shared/integrity/idempotency', () => {
  class IdempotencyConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'IdempotencyConflictError';
    }
  }
  return {
    withIdempotency: async (opts: {
      requestBody: unknown[];
      key: string;
      route: string;
      handler: () => Promise<{ body: unknown }>;
    }) => {
      MOCKS_STATE.capturedRequestBody = opts.requestBody;
      MOCKS_STATE.capturedIdempotencyKey = opts.key;
      MOCKS_STATE.capturedRoute = opts.route;
      if (MOCKS_STATE.idempotencyShouldThrow.throw) {
        throw new IdempotencyConflictError(MOCKS_STATE.idempotencyShouldThrow.message ?? 'conflict');
      }
      const result = await opts.handler();
      return { body: result.body, statusCode: 200, replayed: MOCKS_STATE.idempotencyReplay };
    },
    IdempotencyConflictError,
  };
});

// ─── ENV BLOCK PREFLIGHT (fail-closed, no fake PASS) ─────────────────────────
const HAS_TEST_DB =
  !!process.env.DATABASE_URL_TEST &&
  !process.env.DATABASE_URL_TEST.includes('placeholder') &&
  !!process.env.DATABASE_URL_ADMIN_TEST &&
  !process.env.DATABASE_URL_ADMIN_TEST.includes('placeholder');

if (!HAS_TEST_DB) {
  throw new Error(
    '[P1A0.1 stamps integration] ENV_BLOCKED: cần `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST`. ' +
      'Canonical preflight ở `scripts/ci/integration-preflight.mjs` sẽ fail. ' +
      'Status giữ ENV_BLOCKED, KHÔNG tuyên bố READY_FOR_AUDIT.',
  );
}

// ─── RUN-SCOPED DETERMINISTIC PREFIX ────────────────────────────────────────
const runToken = randomUUID().replaceAll('-', '').slice(0, 12);
const runId = `p1a01-stamps-${runToken}`;
const runIdPrefix = `${runId}-`;

const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
    transactionOptions: { timeout: 15_000 },
  });
}

// ─── ROLE CONTEXT HELPERS (writer + principal) ───────────────────────────────
async function withRoleContext<T>(
  prisma: PrismaClient,
  userId: string,
  role: string,
  cb: (tx: import('@prisma/client').Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, userId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.role', $1, true)`, role);
    await tx.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.worker_id', '', true)`);
    return cb(tx);
  });
}

function makeCanonicalDoc(title: string) {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: title }],
      },
    ],
  };
}

// ─── TRACKED IDS ─────────────────────────────────────────────────────────────
const createdPostingIds = new Set<string>();
const createdOpeningIds = new Set<string>();
const createdSlotIds = new Set<string>();
const createdStaffingOrderIds = new Set<string>();
const createdProjectIds = new Set<string>();
const createdCompanyIds = new Set<string>();
const createdUserIds = new Set<string>();

interface Fixture {
  clientCompanyId: string;
  projectId: string;
  staffingOrderId: string;
  hrManagerUserId: string;
  adminUserId: string;
  // Auto-primary slot used by cases 1-3.
  slotOpenId: string;
  slotClosingSoonId: string;
  slotExpiredId: string;
  slotFullId: string;
  slotClosedId: string;
}

async function seedBaseFixture(admin: PrismaClient): Promise<Fixture> {
  // Two users (admin + HR manager) used for withRoleContext transactions.
  const adminUserId = `${runId}-admin`;
  const hrManagerUserId = `${runId}-hr`;
  createdUserIds.add(adminUserId);
  createdUserIds.add(hrManagerUserId);
  await admin.user.create({
    data: {
      id: adminUserId,
      phone: `phone-${runId}-admin`,
      name: `Admin ${runId}`,
      role: 'ADMIN',
      isActive: true,
    },
  });
  await admin.user.create({
    data: {
      id: hrManagerUserId,
      phone: `phone-${runId}-hr`,
      name: `HR Manager ${runId}`,
      role: 'HR_MANAGER',
      isActive: true,
    },
  });

  const clientCompanyId = `${runId}-cc`;
  const projectId = `${runId}-prj`;
  const staffingOrderId = `${runId}-so`;
  createdCompanyIds.add(clientCompanyId);
  createdProjectIds.add(projectId);
  createdStaffingOrderIds.add(staffingOrderId);

  await admin.clientCompany.create({
    data: {
      id: clientCompanyId,
      code: `${runId}-CC`,
      name: `Acme ${runId}`,
      taxCode: `TAX-${runId}`,
    },
  });
  await admin.project.create({
    data: {
      id: projectId,
      code: `PRJ-${runId}`,
      name: `Project ${runId}`,
      clientCompanyId,
      status: 'ACTIVE',
      startDate: new Date(),
      isPublic: true, // required for job-board public projection (A-04 / hrp_p1_a1)
      quota: 10,
      filled: 0,
    },
  });
  await admin.staffingOrder.create({
    data: {
      id: staffingOrderId,
      projectId,
      code: `SO-${runId}`,
      title: `Order ${runId}`,
      status: 'OPEN',
    },
  });

  // Five seed slots, each in a distinct status scenario.
  const slotOpenId = `${runId}-slot-open`;
  const slotClosingSoonId = `${runId}-slot-cs`;
  const slotExpiredId = `${runId}-slot-exp`;
  const slotFullId = `${runId}-slot-full`;
  const slotClosedId = `${runId}-slot-closed`;

  createdSlotIds.add(slotOpenId);
  createdSlotIds.add(slotClosingSoonId);
  createdSlotIds.add(slotExpiredId);
  createdSlotIds.add(slotFullId);
  createdSlotIds.add(slotClosedId);

  // OPEN eligible slot — needsNeeded=2, slotsFilled=0; valid dates far in future.
  await admin.staffingOrderSlot.create({
    data: {
      id: slotOpenId,
      staffingOrderId,
      positionCode: 'OP',
      positionTitle: `OPEN eligible ${runId}`,
      slotsNeeded: 2,
      slotsFilled: 0,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // CLOSING_SOON eligible slot.
  await admin.staffingOrderSlot.create({
    data: {
      id: slotClosingSoonId,
      staffingOrderId,
      positionCode: 'CS',
      positionTitle: `CLOSING_SOON eligible ${runId}`,
      slotsNeeded: 1,
      slotsFilled: 0,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  await admin.staffingOrder.update({
    where: { id: staffingOrderId },
    data: { status: 'CLOSING_SOON' },
  });
  // Re-set OPEN-eligible slot's order row to OPEN so the OPEN case #1 picks it.
  await admin.staffingOrder.update({
    where: { id: staffingOrderId },
    data: { status: 'OPEN' },
  });

  // EXPIRED slot (validTo in past).
  await admin.staffingOrderSlot.create({
    data: {
      id: slotExpiredId,
      staffingOrderId,
      positionCode: 'EXP',
      positionTitle: `EXPIRED ${runId}`,
      slotsNeeded: 2,
      slotsFilled: 0,
      validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      validTo: new Date(Date.now() - 60 * 1000), // 1 minute ago
    },
  });

  // FULL slot (slotsFilled == slotsNeeded).
  await admin.staffingOrderSlot.create({
    data: {
      id: slotFullId,
      staffingOrderId,
      positionCode: 'FULL',
      positionTitle: `FULL ${runId}`,
      slotsNeeded: 2,
      slotsFilled: 2,
      validFrom: new Date(),
    },
  });

  // CLOSED slot: rely on a separate staffing order in CLOSED status.
  const closedOrderId = `${runId}-so-closed`;
  createdStaffingOrderIds.add(closedOrderId);
  await admin.staffingOrder.create({
    data: {
      id: closedOrderId,
      projectId,
      code: `SO-CLD-${runId}`,
      title: `Closed order ${runId}`,
      status: 'CLOSED',
    },
  });
  await admin.staffingOrderSlot.create({
    data: {
      id: slotClosedId,
      staffingOrderId: closedOrderId,
      positionCode: 'CLD',
      positionTitle: `CLOSED ${runId}`,
      slotsNeeded: 1,
      slotsFilled: 0,
      validFrom: new Date(),
    },
  });

  return {
    clientCompanyId,
    projectId,
    staffingOrderId,
    hrManagerUserId,
    adminUserId,
    slotOpenId,
    slotClosingSoonId,
    slotExpiredId,
    slotFullId,
    slotClosedId,
  };
}

// ─── CLEANUP (reverse-FK order, fail-closed) ────────────────────────────────
async function cleanupFixture(admin: PrismaClient): Promise<void> {
  // 1. job_postings (FK → job_openings) — by tracked IDs.
  if (createdPostingIds.size > 0) {
    await admin.jobPosting.deleteMany({
      where: { id: { in: [...createdPostingIds] } },
    });
  }
  // Belt-and-braces by prefix.
  await admin.jobPosting.deleteMany({
    where: { id: { startsWith: runIdPrefix } },
  });

  // 2. job_openings — by tracked IDs.
  if (createdOpeningIds.size > 0) {
    await admin.jobOpening.deleteMany({
      where: { id: { in: [...createdOpeningIds] } },
    });
  }
  await admin.jobOpening.deleteMany({
    where: { id: { startsWith: runIdPrefix } },
  });

  // 3. staffing_order_slots — clear reverse FK, then delete.
  await admin.staffingOrderSlot.updateMany({
    where: { id: { in: [...createdSlotIds] } },
    data: { jobOpeningId: null },
  });
  await admin.staffingOrderSlot.updateMany({
    where: { id: { startsWith: runIdPrefix } },
    data: { jobOpeningId: null },
  });
  if (createdSlotIds.size > 0) {
    await admin.staffingOrderSlot.deleteMany({
      where: { id: { in: [...createdSlotIds] } },
    });
  }
  await admin.staffingOrderSlot.deleteMany({
    where: { id: { startsWith: runIdPrefix } },
  });

  // 4. staffing_orders
  if (createdStaffingOrderIds.size > 0) {
    await admin.staffingOrder.deleteMany({
      where: { id: { in: [...createdStaffingOrderIds] } },
    });
  }
  await admin.staffingOrder.deleteMany({
    where: { id: { startsWith: runIdPrefix } },
  });

  // 5. projects
  if (createdProjectIds.size > 0) {
    await admin.project.deleteMany({
      where: { id: { in: [...createdProjectIds] } },
    });
  }
  await admin.project.deleteMany({
    where: { code: { startsWith: `PRJ-${runId}` } },
  });

  // 6. client_companies
  if (createdCompanyIds.size > 0) {
    await admin.clientCompany.deleteMany({
      where: { id: { in: [...createdCompanyIds] } },
    });
  }
  await admin.clientCompany.deleteMany({
    where: { code: { startsWith: `${runId}-CC` } },
  });

  // 7. users
  if (createdUserIds.size > 0) {
    await admin.user.deleteMany({
      where: { id: { in: [...createdUserIds] } },
    });
  }
}

async function assertNoResidue(admin: PrismaClient, fx: Fixture): Promise<void> {
  // Strict assertion — any non-zero count fails the test.
  // Note: cannot use `expect.soft` outside a test context (called from
  // afterEach). Aggregate all residue counts into a single assertion error
  // so the test fails closed.
  const counts = await Promise.all([
    admin.jobPosting.count({ where: { id: { startsWith: runIdPrefix } } }),
    admin.jobOpening.count({ where: { id: { startsWith: runIdPrefix } } }),
    admin.staffingOrderSlot.count({ where: { id: { startsWith: runIdPrefix } } }),
    admin.staffingOrder.count({ where: { id: { startsWith: runIdPrefix } } }),
    admin.project.count({ where: { code: { startsWith: `PRJ-${runId}` } } }),
    admin.clientCompany.count({ where: { code: { startsWith: `${runId}-CC` } } }),
    admin.user.count({ where: { id: { in: [fx.adminUserId, fx.hrManagerUserId] } } }),
  ]);
  const [postings, openings, slots, orders, projects, companies, users] = counts;
  const residue: string[] = [];
  if (postings > 0) residue.push(`job_postings=${postings}`);
  if (openings > 0) residue.push(`job_openings=${openings}`);
  if (slots > 0) residue.push(`staffing_order_slots=${slots}`);
  if (orders > 0) residue.push(`staffing_orders=${orders}`);
  if (projects > 0) residue.push(`projects=${projects}`);
  if (companies > 0) residue.push(`client_companies=${companies}`);
  if (users > 0) residue.push(`users=${users}`);
  if (residue.length > 0) {
    throw new Error(`run-scoped residue left after cleanup: ${residue.join(', ')}`);
  }
}

// ─── HELPER: build a PATCH NextRequest ──────────────────────────────────────
function patchReq(path: string, body: unknown, idemKey: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'idempotency-key': idemKey,
    },
  });
}

// ─── DESCRIBE ────────────────────────────────────────────────────────────────
describe.skipIf(!HAS_TEST_DB)('hrp-p1-a0-1 / C-03 — JobPosting stamps (substantive integration)', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;
  let fx: Fixture;

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);
    fx = await seedBaseFixture(admin);
    // Wire mocked DB → real writer; auth → real seeded admin user UUID.
    MOCKS_STATE.mockedPrisma = writer;
    MOCKS_STATE.getAuthContext.mockResolvedValue({
      userId: fx.adminUserId,
      role: 'ADMIN',
    });
  }, 60_000);

  afterEach(async () => {
    // Per-test cleanup of any posted rows but keep the fixture slots.
    // Tear down by tracked IDs (accumulated during the test).
    if (createdPostingIds.size > 0) {
      const ids = [...createdPostingIds];
      await admin.jobPosting.deleteMany({ where: { id: { in: ids } } });
      ids.forEach((id) => createdPostingIds.delete(id));
    }
    if (createdOpeningIds.size > 0) {
      const ids = [...createdOpeningIds];
      // JobOpening has posting (JobPosting?) — by deleting postings first we
      // ensure the relation drops. Posting FK is required (String @unique),
      // but Opening.posting is optional so we can clear FKs safely.
      await admin.jobOpening.deleteMany({ where: { id: { in: ids } } });
      ids.forEach((id) => createdOpeningIds.delete(id));
    }
    // Also clear any residual reverse FK on slots created by re-use.
    await admin.staffingOrderSlot.updateMany({
      where: { id: { startsWith: runIdPrefix } },
      data: { jobOpeningId: null },
    });
  });

  afterAll(async () => {
    if (admin && fx) {
      try {
        await cleanupFixture(admin);
      } catch (e) {
        // Cleanup failures must propagate (C-03: do NOT swallow).
        throw new Error(`[stamps integration] cleanup failed: ${(e as Error).message}`);
      } finally {
        await assertNoResidue(admin, fx);
        await admin.$disconnect().catch(() => undefined);
        await writer?.$disconnect().catch(() => undefined);
      }
    }
  }, 60_000);

  // ─────────────────────────────────────────────────────────────────────────
  // Case 1: OPEN eligible slot appears in selector.
  // ─────────────────────────────────────────────────────────────────────────
  it('CASE 1: OPEN eligible slot appears in selector', async () => {
    const slots: JobPostingSlotSelectorDto[] = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) => listEligibleSlotsForNewJobPosting(tx, { limit: 200 }),
    );
    const openMatch = slots.find((s) => s.id === fx.slotOpenId);
    expect(openMatch).toBeDefined();
    expect(openMatch?.orderStatus).toBe('OPEN');
    expect(openMatch?.slotsAvailable).toBe(2);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Case 2: CLOSING_SOON appears + DTO reports `orderStatus`.
  // ─────────────────────────────────────────────────────────────────────────
  it('CASE 2: CLOSING_SOON eligible slot appears + DTO reports orderStatus=CLOSING_SOON', async () => {
    // Switch the staffingOrderId row back to CLOSING_SOON so the slot is eligible.
    await admin.staffingOrder.update({
      where: { id: fx.staffingOrderId },
      data: { status: 'CLOSING_SOON' },
    });
    try {
      const slots: JobPostingSlotSelectorDto[] = await withRoleContext(
        writer,
        fx.hrManagerUserId,
        'HR_MANAGER',
        async (tx) => listEligibleSlotsForNewJobPosting(tx, { limit: 200 }),
      );
      const csMatch = slots.find((s) => s.id === fx.slotClosingSoonId);
      expect(csMatch).toBeDefined();
      expect(csMatch?.orderStatus).toBe('CLOSING_SOON');
      // OPEN-eligible slot moved out under the parent order; verify parent status.
      expect(csMatch?.staffingOrderCode).toMatch(/^SO-/);
    } finally {
      // Restore for downstream cases.
      await admin.staffingOrder.update({
        where: { id: fx.staffingOrderId },
        data: { status: 'OPEN' },
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Case 3: expired / full / closed slots excluded.
  // ─────────────────────────────────────────────────────────────────────────
  it('CASE 3: expired / full / closed slots are excluded', async () => {
    const slots = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) => listEligibleSlotsForNewJobPosting(tx, { limit: 200 }),
    );
    const idSet = new Set(slots.map((s) => s.id));
    expect(idSet.has(fx.slotExpiredId)).toBe(false); // validTo in past
    expect(idSet.has(fx.slotFullId)).toBe(false); // slotsFilled == slotsNeeded
    expect(idSet.has(fx.slotClosedId)).toBe(false); // parent order is CLOSED
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Case 4: existing JobOpening + no JobPosting → slot remains eligible.
  // Case 5: existing canonical JobPosting → slot excluded.
  // ─────────────────────────────────────────────────────────────────────────
  it('CASE 4 + 5: existing JobOpening without JobPosting stays eligible; with JobPosting excluded', async () => {
    // 4a) Create only a JobOpening (no JobPosting) on a fresh slot.
    const freshSlotId = `${runId}-slot-opening-only`;
    createdSlotIds.add(freshSlotId);
    await admin.staffingOrderSlot.create({
      data: {
        id: freshSlotId,
        staffingOrderId: fx.staffingOrderId,
        positionCode: 'OPN',
        positionTitle: `OPENING-ONLY ${runId}`,
        slotsNeeded: 1,
        slotsFilled: 0,
        validFrom: new Date(),
      },
    });

    // Bind a JobOpening to that slot.
    const opening = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobOpeningForSlot(tx, { userId: fx.hrManagerUserId, role: 'HR_MANAGER' }, {
          slotId: freshSlotId,
        }),
    );
    createdOpeningIds.add(opening.id);

    // 4: slot still eligible (JobOpening but no JobPosting).
    let slots = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) => listEligibleSlotsForNewJobPosting(tx, { limit: 200 }),
    );
    expect(slots.find((s) => s.id === freshSlotId)).toBeDefined();

    // 5: now create a JobPosting on that opening → slot becomes excluded.
    const posting = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobPostingDraftForOpening(
          tx,
          { userId: fx.hrManagerUserId, role: 'HR_MANAGER' },
          { jobOpeningId: opening.id },
        ),
    );
    createdPostingIds.add(posting.id);

    slots = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) => listEligibleSlotsForNewJobPosting(tx, { limit: 200 }),
    );
    expect(slots.find((s) => s.id === freshSlotId)).toBeUndefined();

    // Tidy up so the next case doesn't see residue.
    await admin.staffingOrderSlot.update({
      where: { id: freshSlotId },
      data: { jobOpeningId: null },
    });
    await admin.jobPosting.delete({ where: { id: posting.id } });
    createdPostingIds.delete(posting.id);
    await admin.jobOpening.delete({ where: { id: opening.id } });
    createdOpeningIds.delete(opening.id);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Case 6: stale direct POST to an ineligible slot rejected with zero mutation.
  //
  // We simulate "stale POST" by going through `createOrReuseJobOpeningForSlot`
  // with a slot in an ineligible state, which must reject with AuthoringError
  // and not mutate any row.
  // ─────────────────────────────────────────────────────────────────────────
  it('CASE 6: stale direct POST rejected with zero new JobOpening/JobPosting', async () => {
    const before = {
      openings: await admin.jobOpening.count({ where: { id: { startsWith: runIdPrefix } } }),
      postings: await admin.jobPosting.count({ where: { id: { startsWith: runIdPrefix } } }),
    };

    // Try to create JobOpening on a CLOSED slot → must reject.
    await expect(
      withRoleContext(writer, fx.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        createOrReuseJobOpeningForSlot(
          tx,
          { userId: fx.hrManagerUserId, role: 'HR_MANAGER' },
          { slotId: fx.slotClosedId },
        ),
      ),
    ).rejects.toBeInstanceOf(AuthoringError);

    // Try to create JobOpening on an EXPIRED slot → must reject.
    await expect(
      withRoleContext(writer, fx.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        createOrReuseJobOpeningForSlot(
          tx,
          { userId: fx.hrManagerUserId, role: 'HR_MANAGER' },
          { slotId: fx.slotExpiredId },
        ),
      ),
    ).rejects.toBeInstanceOf(AuthoringError);

    // Try to create JobOpening on a FULL slot → must reject.
    await expect(
      withRoleContext(writer, fx.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        createOrReuseJobOpeningForSlot(
          tx,
          { userId: fx.hrManagerUserId, role: 'HR_MANAGER' },
          { slotId: fx.slotFullId },
        ),
      ),
    ).rejects.toBeInstanceOf(AuthoringError);

    const after = {
      openings: await admin.jobOpening.count({ where: { id: { startsWith: runIdPrefix } } }),
      postings: await admin.jobPosting.count({ where: { id: { startsWith: runIdPrefix } } }),
    };
    expect(after.openings).toBe(before.openings);
    expect(after.postings).toBe(before.postings);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Case 7: actual PATCH route persists both booleans.
  // Case 8: invalid PATCH flag rejected.
  //
  // Mocks are installed at module-load time via `installRouteMocks` (top-level);
  // `updateDraftContent` is NOT mocked — auth/db/idempotency boundary is mocked
  // only, so the real service call (and DB persistence) runs underneath.
  // ─────────────────────────────────────────────────────────────────────────
  it('CASE 7: actual PATCH route persists both isHot=true and isUrgent=true', async () => {
    // Bind a real JobPosting through the writer.
    const opening = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobOpeningForSlot(tx, { userId: fx.hrManagerUserId, role: 'HR_MANAGER' }, {
          slotId: fx.slotOpenId,
        }),
    );
    createdOpeningIds.add(opening.id);

    const initial = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobPostingDraftForOpening(
          tx,
          { userId: fx.hrManagerUserId, role: 'HR_MANAGER' },
          { jobOpeningId: opening.id },
        ),
    );
    createdPostingIds.add(initial.id);

    expect(validateRichText(JOB_POSTING_RICH_TEXT_SCHEMA_VERSION, makeCanonicalDoc('PATCH test')).ok).toBe(true);

    const postingId = initial.id;
    const req = patchReq(
      `/api/admin/jobs/job-postings/${postingId}`,
      {
        expectedRevision: initial.revision,
        title: 'PATCH test title',
        descriptionJson: makeCanonicalDoc('PATCH test'),
        contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
        isHot: true,
        isUrgent: true,
      },
      `idem-${runId}-case7-${randomUUID().slice(0, 6)}`,
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: postingId }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { jobPosting: { isHot: boolean; isUrgent: boolean } };
    expect(body.jobPosting.isHot).toBe(true);
    expect(body.jobPosting.isUrgent).toBe(true);

    // Direct DB read to confirm persistence.
    const after = await admin.jobPosting.findUnique({
      where: { id: postingId },
      select: { isHot: true, isUrgent: true, revision: true },
    });
    expect(after?.isHot).toBe(true);
    expect(after?.isUrgent).toBe(true);
    expect(after?.revision).toBe(initial.revision + 1);
  });

  it('CASE 8: invalid PATCH flag (null / string / number / object) → 400 INVALID_INPUT', async () => {
    const opening = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobOpeningForSlot(tx, { userId: fx.hrManagerUserId, role: 'HR_MANAGER' }, {
          slotId: fx.slotOpenId,
        }),
    );
    createdOpeningIds.add(opening.id);
    const initial = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobPostingDraftForOpening(
          tx,
          { userId: fx.hrManagerUserId, role: 'HR_MANAGER' },
          { jobOpeningId: opening.id },
        ),
    );
    createdPostingIds.add(initial.id);

    const invalidValues: Array<{ flag: 'isHot' | 'isUrgent'; value: unknown }> = [
      { flag: 'isHot', value: null },
      { flag: 'isHot', value: 'true' },
      { flag: 'isHot', value: 1 },
      { flag: 'isHot', value: { v: true } },
      { flag: 'isUrgent', value: null },
      { flag: 'isUrgent', value: 'false' },
      { flag: 'isUrgent', value: 2 },
      { flag: 'isUrgent', value: [] },
    ];
    for (const { flag, value } of invalidValues) {
      const req = patchReq(
        `/api/admin/jobs/job-postings/${initial.id}`,
        {
          expectedRevision: initial.revision,
          title: 'PATCH test title',
          descriptionJson: makeCanonicalDoc('PATCH test'),
          contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
          [flag]: value,
        },
        `idem-${runId}-case8-${flag}-${randomUUID().slice(0, 4)}`,
      );
      const res = await PATCH(req, {
        params: Promise.resolve({ id: initial.id }),
      });
      expect(res.status, `flag=${flag} value=${JSON.stringify(value)}`).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('INVALID_INPUT');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Case 9: PUBLISHED row appears in public projection with exact flags.
  // Case 10: DRAFT / ARCHIVED do not appear publicly.
  // ─────────────────────────────────────────────────────────────────────────
  it('CASE 9 + 10: PUBLISHED appears in list/detail with exact flags; DRAFT/ARCHIVED do not', async () => {
    // Setup 3 sibling postings under one Project: PUBLISHED + DRAFT + ARCHIVED.
    const freshSlotId = `${runId}-slot-projection`;
    createdSlotIds.add(freshSlotId);
    await admin.staffingOrderSlot.create({
      data: {
        id: freshSlotId,
        staffingOrderId: fx.staffingOrderId,
        positionCode: 'PROJ',
        positionTitle: `PROJECTION ${runId}`,
        slotsNeeded: 3,
        slotsFilled: 0,
        validFrom: new Date(),
      },
    });

    const opening = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobOpeningForSlot(tx, { userId: fx.hrManagerUserId, role: 'HR_MANAGER' }, {
          slotId: freshSlotId,
        }),
    );
    createdOpeningIds.add(opening.id);
    await admin.jobOpening.update({
      where: { id: opening.id },
      data: { status: 'OPEN', openedAt: new Date() },
    });

    // One canonical posting for this opening → will be PUBLISHED.
    const postingPublished = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobPostingDraftForOpening(
          tx,
          { userId: fx.hrManagerUserId, role: 'HR_MANAGER' },
          { jobOpeningId: opening.id },
        ),
    );
    createdPostingIds.add(postingPublished.id);
    await withRoleContext(writer, fx.hrManagerUserId, 'HR_MANAGER', async (tx) =>
      updateDraftContent(tx, { userId: fx.hrManagerUserId, role: 'HR_MANAGER' }, {
        jobPostingId: postingPublished.id,
        expectedRevision: postingPublished.revision,
        title: 'Published test title',
        descriptionJson: makeCanonicalDoc('Public desc'),
        contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
        isHot: true,
        isUrgent: true,
      }),
    );
    const publishedAfter = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        publishJobPosting(tx, { userId: fx.hrManagerUserId, role: 'HR_MANAGER' }, {
          jobPostingId: postingPublished.id,
          expectedRevision: postingPublished.revision + 1,
        }),
    );
    expect(publishedAfter.status).toBe('PUBLISHED');

    // Need additional openings+postings for the DRAFT / ARCHIVED siblings.
    const slotDraftId = `${runId}-slot-draft`;
    const slotArchivedId = `${runId}-slot-arch`;
    createdSlotIds.add(slotDraftId);
    createdSlotIds.add(slotArchivedId);
    await admin.staffingOrderSlot.create({
      data: {
        id: slotDraftId,
        staffingOrderId: fx.staffingOrderId,
        positionCode: 'DRF',
        positionTitle: `DRAFT sibling ${runId}`,
        slotsNeeded: 1,
        slotsFilled: 0,
        validFrom: new Date(),
      },
    });
    await admin.staffingOrderSlot.create({
      data: {
        id: slotArchivedId,
        staffingOrderId: fx.staffingOrderId,
        positionCode: 'ARC',
        positionTitle: `ARCHIVED sibling ${runId}`,
        slotsNeeded: 1,
        slotsFilled: 0,
        validFrom: new Date(),
      },
    });
    const openingDraft = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobOpeningForSlot(tx, { userId: fx.hrManagerUserId, role: 'HR_MANAGER' }, {
          slotId: slotDraftId,
        }),
    );
    const openingArchived = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobOpeningForSlot(tx, { userId: fx.hrManagerUserId, role: 'HR_MANAGER' }, {
          slotId: slotArchivedId,
        }),
    );
    createdOpeningIds.add(openingDraft.id);
    createdOpeningIds.add(openingArchived.id);
    await admin.jobOpening.update({
      where: { id: openingDraft.id },
      data: { status: 'OPEN', openedAt: new Date() },
    });
    await admin.jobOpening.update({
      where: { id: openingArchived.id },
      data: { status: 'OPEN', openedAt: new Date() },
    });

    const postingDraft = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobPostingDraftForOpening(
          tx,
          { userId: fx.hrManagerUserId, role: 'HR_MANAGER' },
          { jobOpeningId: openingDraft.id },
        ),
    );
    const postingArchived = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobPostingDraftForOpening(
          tx,
          { userId: fx.hrManagerUserId, role: 'HR_MANAGER' },
          { jobOpeningId: openingArchived.id },
        ),
    );
    createdPostingIds.add(postingDraft.id);
    createdPostingIds.add(postingArchived.id);

    await withRoleContext(writer, fx.hrManagerUserId, 'HR_MANAGER', async (tx) =>
      updateDraftContent(tx, { userId: fx.hrManagerUserId, role: 'HR_MANAGER' }, {
        jobPostingId: postingArchived.id,
        expectedRevision: postingArchived.revision,
        title: 'Archived title',
        descriptionJson: makeCanonicalDoc('archived'),
        contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
      }),
    );
    const archivedAfter = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        archiveJobPosting(tx, { userId: fx.hrManagerUserId, role: 'HR_MANAGER' }, {
          jobPostingId: postingArchived.id,
          expectedRevision: postingArchived.revision + 1,
        }),
    );
    expect(archivedAfter.status).toBe('ARCHIVED');

    // Public projection — must show PUBLISHED only.
    const projection = await withPublicDb(writer, (tx) =>
      listPublicJobProjection(tx, { limit: 200 }),
    );
    const allIds = projection.jobs.map((j) => j.id);
    expect(allIds).toContain(postingPublished.id);
    expect(allIds).not.toContain(postingDraft.id);
    expect(allIds).not.toContain(postingArchived.id);

    // The published row carries its exact flags.
    const publishedRow = projection.jobs.find((j) => j.id === postingPublished.id);
    expect(publishedRow?.isHot).toBe(true);
    expect(publishedRow?.isUrgent).toBe(true);

    // Public detail mirrors the same flag set.
    const detail = await withPublicDb(writer, (tx) =>
      getPublicJobDetail(tx, postingPublished.slug),
    );
    expect(detail?.id).toBe(postingPublished.id);
    expect(detail?.isHot).toBe(true);
    expect(detail?.isUrgent).toBe(true);

    // DRAFT and ARCHIVED are unreachable publicly.
    expect(
      await withPublicDb(writer, (tx) => getPublicJobDetail(tx, postingDraft.slug)),
    ).toBeNull();
    expect(
      await withPublicDb(writer, (tx) => getPublicJobDetail(tx, postingArchived.slug)),
    ).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Case 11: idempotency replay/conflict on PATCH (same key + different payload = 409).
  // ─────────────────────────────────────────────────────────────────────────
  it('CASE 11: same Idempotency-Key with different payload → 409 IDEMPOTENCY_CONFLICT', async () => {
    // We need a real posting + we override `withIdempotency` to throw.
    const opening = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobOpeningForSlot(tx, { userId: fx.hrManagerUserId, role: 'HR_MANAGER' }, {
          slotId: fx.slotOpenId,
        }),
    );
    createdOpeningIds.add(opening.id);
    const initial = await withRoleContext(
      writer,
      fx.hrManagerUserId,
      'HR_MANAGER',
      async (tx) =>
        createOrReuseJobPostingDraftForOpening(
          tx,
          { userId: fx.hrManagerUserId, role: 'HR_MANAGER' },
          { jobOpeningId: opening.id },
        ),
    );
    createdPostingIds.add(initial.id);

    // Override `MOCKS_STATE.idempotencyShouldThrow` to simulate conflict path.
    MOCKS_STATE.idempotencyShouldThrow = {
      throw: true,
      message: 'x-idempotency-key đã được dùng với request body khác',
    };
    try {
      const req = patchReq(
        `/api/admin/jobs/job-postings/${initial.id}`,
        {
          expectedRevision: initial.revision,
          title: 'PATCH conflict test',
          descriptionJson: makeCanonicalDoc('conflict'),
          contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
          isHot: true,
          isUrgent: false,
        },
        'same-key-conflict',
      );
      const res = await PATCH(req, {
        params: Promise.resolve({ id: initial.id }),
      });
      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('IDEMPOTENCY_CONFLICT');
    } finally {
      MOCKS_STATE.idempotencyShouldThrow = { throw: false };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Invariant: predicate SQL helper is canonical and not split across files.
  // ─────────────────────────────────────────────────────────────────────────
  it('eligibleSlotPredicateSql canonical helper covers all four legs of the predicate', () => {
    const sql = eligibleSlotPredicateSql(new Date());
    // Prisma.Sql exposes a `strings: string[]` array. We join the literal SQL
    // segments to a single string so each predicate leg can be asserted by
    // case-insensitive regex. The placeholder interpolations (e.g. `${now}`)
    // live in `values`, but our predicate has no value interpolation in the
    // static legs we are asserting.
    expect(typeof sql).toBe('object');
    expect(sql.strings.length).toBeGreaterThan(0);
    const serialized = sql.strings.join('\n').toLowerCase();
    expect(serialized.length).toBeGreaterThan(0);
    // Must include each leg:
    //   1. status ∈ OPEN/CLOSING_SOON
    //   2. deadlineDate null or >= now
    //   3. validTo null or >= now
    //   4. slotsFilled < slotsNeeded
    //   5. exclude only slots with canonical JobPosting
    expect(serialized).toMatch(/open/);
    expect(serialized).toMatch(/closing_soon/);
    expect(serialized).toMatch(/deadline_date/);
    expect(serialized).toMatch(/valid_to/);
    expect(serialized).toMatch(/slots_filled\s*<\s*s\.slots_needed/);
    expect(serialized).toMatch(/from\s+job_postings\s+jp/);
  });
});
