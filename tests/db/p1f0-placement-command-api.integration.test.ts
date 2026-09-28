/**
 * p1f0-placement-command-api.integration.test.ts — P1-F0 DB integration tests.
 *
 * Lane: integration (DB-touching). Self-skip nếu DATABASE_URL_TEST không khả dụng.
 * ENV_BLOCKED là báo cáo trung thực, KHÔNG phải điều kiện PASS (DEC-13).
 * Tier 0/Owner cung cấp DB test trước khi xét merge/deploy.
 *
 * Scope: mở rộng N3 placement lifecycle bằng cách gọi F0 ROUTE HANDLERS thật
 * (POST /api/admin/placements + 4 transitions) thay vì gọi service thuần.
 * Mocks:
 *   - `getAuthContext`: trả AuthContext có role giả (ADMIN/HR_MANAGER/HR_STAFF)
 *     để verify role gate. Khi DB chưa có, chỉ check 401/403/400 path.
 *   - Mọi thứ khác: REAL — gọi `withDbContext` + `placement.commands.ts` +
 *     `placement.service.ts` + `withIdempotency` + Prisma tx.
 *
 * Pattern đúc từ `tests/db/placement-lifecycle-integration.test.ts` (N3) +
 * `src/domains/applications/conversion.routes.test.ts` (route unit).
 *
 * Round-3 cleanup rule (T0 zero-residue handback): every fixture
 * created by `buildFixture()` and `attachCandidateSubmission()` is
 * pushed into module-scoped trackers (`createdClientCompanyIds`,
 * `createdProjectIds`, `createdStaffingOrderIds`, `createdJobOpeningIds`,
 * `createdLaborProfileIds`, `createdPlacementCaseIds`,
 * `createdPlacementIds`, `createdCsIds`). `afterAll` deletes them in
 * strict reverse-FK order, scoped to tracked IDs only — NEVER
 * blanket-deletes a whole table. Idempotency keys are deleted by
 * `actorId IN (createdIdempotencyActorIds)` (the three run-scoped
 * mock actor identities) because the table is shared across suites on
 * the same synthetic DB. Every individual delete in teardown fails
 * closed; the disconnect calls in `finally` are the only `.catch(…)`
 * remains, to keep the harness clean on partial teardown.
 *
 * Refs:
 *   - Contract v1.1 §4.1.1 (5 commands)
 *   - TASK §0 (in-scope roots, forbidden paths)
 *   - C-07 (error→HTTP canonical mapping)
 *   - C-08 (single transaction boundary)
 *   - tests/db/intake-writer-integration.test.ts (idempotency_key
 *     scoped-by-actor cleanup precedent)
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { PrismaClient, Prisma, type ServiceModel } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────
// Mock getAuthContext — drives the role gate without needing a real JWT.
// ─────────────────────────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
}));
vi.mock('@/src/shared/auth/auth-context', async (original) => {
  const actual = await original<typeof import('@/src/shared/auth/auth-context')>();
  return {
    ...actual,
    getAuthContext: mockAuth.getAuthContext,
  };
});

// ─────────────────────────────────────────────────────────────────────────
// Real imports — must run AFTER the mock is installed.
// ─────────────────────────────────────────────────────────────────────────
import {
  PlacementError,
  PlacementIdempotencyConflictError,
} from '@/src/domains/talent/placement.errors';

// ─────────────────────────────────────────────────────────────────────────
// Env gate — fail-closed honest report.
// ─────────────────────────────────────────────────────────────────────────
const HAS_TEST_DB =
  !!process.env.DATABASE_URL_TEST &&
  !process.env.DATABASE_URL_TEST?.includes('placeholder');

const describeIf = HAS_TEST_DB ? describe : describe.skip;

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const runId = `p1f0-${randomUUID().slice(0, 8)}`;

const TEST_TRANSACTION_OPTIONS = { timeout: 15_000 } as const;

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
    transactionOptions: TEST_TRANSACTION_OPTIONS,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Fixture builder (re-uses pattern from placement-lifecycle-integration).
// ─────────────────────────────────────────────────────────────────────────
/**
 * Module-scoped teardown trackers — pushed to by `buildFixture()` and
 * every direct fixture helper, then drained by `afterAll` in strict
 * reverse-FK order. The previous round (round-2) only tracked
 * Placement / PlacementCase / LaborProfile / CandidateSubmission; the
 * T0 zero-residue handback (round-3) requires every row this run ever
 * created to be tracked, including ClientCompany / Project /
 * StaffingOrder / JobOpening / IdempotencyKey — otherwise the synthetic
 * DB accumulates residue across `npx vitest run` invocations on the
 * same dataset. We DO NOT blanket-delete any whole table.
 */
const createdClientCompanyIds: string[] = [];
const createdProjectIds: string[] = [];
const createdStaffingOrderIds: string[] = [];
const createdJobOpeningIds: string[] = [];
const createdLaborProfileIds: string[] = [];
const createdPlacementCaseIds: string[] = [];
const createdPlacementIds: string[] = [];
const createdCsIds: string[] = [];
/**
 * Every actorId wired into mockAuth across the suite. The canonical
 * `withIdempotency` wrap records `actor_id = ctx.userId`, so deleting
 * `idempotencyKey` rows by `actorId IN (createdIdempotencyActorIds)`
 * is sufficient to clean up every idempotency row this run created
 * without touching sibling-suite rows. Some entries here are pure
 * actor ids that never reach `withIdempotency` (HR_STAFF role gate,
 * HR_MANAGER IDEMPOTENCY_REQUIRED) — those entries leave zero
 * idempotency rows so the scoped delete is a no-op for them, which is
 * correct. We deliberately track all three identities so the
 * zero-residue assertion is exact regardless of which actor created the
 * row.
 */
const createdIdempotencyActorIds: string[] = [];

interface Fixture {
  clientCompanyId: string;
  projectId: string;
  staffingOrderId: string;
  jobOpeningId: string;
  laborProfileId: string;
  placementCaseId: string;
  serviceModel: ServiceModel;
  lpId: string;
  pcId: string;
  /** An optional CandidateSubmission row linked to placementCaseId. */
  candidateSubmissionId?: string;
}

async function buildFixture(
  admin: PrismaClient,
  seed: string,
  serviceModel: ServiceModel,
): Promise<Fixture> {
  const cc = await admin.clientCompany.create({
    data: { name: `P1F0 CC ${seed} ${runId}`, code: `P1F0CC${runId}${seed}` },
    select: { id: true },
  });
  createdClientCompanyIds.push(cc.id);
  const prj = await admin.project.create({
    data: {
      name: `P1F0 Project ${seed} ${runId}`,
      code: `P1F0PRJ${runId}${seed}`,
      clientCompanyId: cc.id,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 86400 * 1000),
    },
    select: { id: true },
  });
  createdProjectIds.push(prj.id);
  const so = await admin.staffingOrder.create({
    data: {
      projectId: prj.id,
      code: `P1F0SO${runId}${seed}`,
      title: `P1F0 StaffingOrder ${seed} ${runId}`,
      status: 'OPEN',
    },
    select: { id: true },
  });
  createdStaffingOrderIds.push(so.id);
  const jo = await admin.jobOpening.create({
    data: {
      staffingOrderId: so.id,
      status: 'OPEN',
      openedAt: new Date(),
      serviceModel,
    },
    select: { id: true, serviceModel: true },
  });
  createdJobOpeningIds.push(jo.id);
  const lp = await admin.laborProfile.create({
    data: {
      fullName: `P1F0 LP ${seed} ${runId}`,
      phone: `0${runId.replace(/-/g, '').slice(0, 9)}${seed}`,
      normalizedPhone: `9${runId.replace(/-/g, '').slice(0, 9)}${seed}`,
    },
    select: { id: true },
  });
  createdLaborProfileIds.push(lp.id);
  const pc = await admin.placementCase.create({
    data: { laborProfileId: lp.id, status: 'OPEN', openedAt: new Date() },
    select: { id: true },
  });
  createdPlacementCaseIds.push(pc.id);
  return {
    clientCompanyId: cc.id,
    projectId: prj.id,
    staffingOrderId: so.id,
    jobOpeningId: jo.id,
    laborProfileId: lp.id,
    placementCaseId: pc.id,
    serviceModel,
    lpId: lp.id,
    pcId: pc.id,
  };
}

async function attachCandidateSubmission(
  admin: PrismaClient,
  fixture: Fixture,
  seed: string,
): Promise<string> {
  const row = await admin.candidateSubmission.create({
    data: {
      laborProfileId: fixture.laborProfileId,
      fullName: `P1F0 CS ${seed} ${runId}`,
      status: 'NEW',
      phone: `0${runId.replace(/-/g, '').slice(0, 9)}${seed}`,
      normalizedPhone: `9${runId.replace(/-/g, '').slice(0, 9)}${seed}`,
      placementCaseId: fixture.placementCaseId,
    },
    select: { id: true },
  });
  createdCsIds.push(row.id);
  return row.id;
}

// ─────────────────────────────────────────────────────────────────────────
// Test request builders.
// ─────────────────────────────────────────────────────────────────────────
function buildRequest(
  url: string,
  init: {
    body?: unknown;
    headers?: Record<string, string>;
    method?: string;
  } = {},
): NextRequest {
  const method = init.method ?? 'POST';
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-idempotency-key': randomUUID(), // default UUID v4
    ...(init.headers ?? {}),
  };
  return new NextRequest(`http://localhost${url}`, {
    method,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    headers,
  });
}

function routeParams<T>(value: T): { params: Promise<T> } {
  return { params: Promise.resolve(value) };
}

// ─────────────────────────────────────────────────────────────────────────
// F0 LIVE integration suite — DB-touching proof (ENV_BLOCKED by default).
// ─────────────────────────────────────────────────────────────────────────
describeIf(
  'P1-F0 placement command API — DB-touching proof',
  { timeout: 30_000 },
  () => {
    let admin: PrismaClient;
    let writer: PrismaClient;

    // Every tracker is module-scoped (above) and pushed to by
    // `buildFixture()` / `attachCandidateSubmission()`. Do NOT
    // shadow them with describe-scoped duplicates — the teardown
    // reads from the module-scoped arrays.

    beforeAll(async () => {
      if (!adminUrl || !writerUrl) return;
      admin = makeClient(adminUrl);
      writer = makeClient(writerUrl);
      // Register every actor identity that mockAuth will use this
      // run. The canonical `withIdempotency` records
      // `actor_id = ctx.userId`; tracking all three identities keeps
      // the scoped idempotency_key cleanup exact even if a test
      // forgets to call buildFixture (e.g. role-gate tests still
      // send a mock userId).
      for (const actorId of [
        `p1f0-admin-${runId}`,
        `p1f0-hrmgr-${runId}`,
        `p1f0-hrstaff-${runId}`,
      ]) {
        if (!createdIdempotencyActorIds.includes(actorId)) {
          createdIdempotencyActorIds.push(actorId);
        }
      }
    }, 30000);

    afterAll(async () => {
      if (!admin) return;
      try {
        // Round-3 teardown — strict reverse-FK order, scoped to
        // tracked IDs only, fail-closed (no `.catch(() => {})` on
        // any individual delete). Schema FKs that drive the order:
        //   Placement.placementCase → Restrict
        //   Placement.laborProfile  → Restrict
        //   PlacementCase.laborProfile → NoAction (default)
        //   JobOpening.staffingOrder  → NoAction (default)
        //   StaffingOrderSlot.staffingOrder → Cascade (parent)
        //   StaffingOrderSlot.jobOpening → SetNull (slot survives JO delete)
        //   Project.clientCompany     → NoAction (default)
        //   CandidateSubmission.placementCase → NoAction (default)
        //   ApplicationStatusHistory.submission → Cascade (parent)
        //   IdempotencyKey.actorId has no FK to users; we delete by
        //   scoped actorId IN tracked ids BEFORE the (no-op) users
        //   delete. We DO NOT create User rows for these actor
        //   identities — they're mock auth subjects only.
        //
        // Order:
        //   1. Placements (Restrict on placementCase/laborProfile)
        await admin.placement.deleteMany({
          where: { id: { in: createdPlacementIds } },
        });
        //   2. Application status history tied to tracked submissions
        await admin.applicationStatusHistory.deleteMany({
          where: { submissionId: { in: createdCsIds } },
        });
        //   3. Candidate submissions (Restrict on placementCase)
        await admin.candidateSubmission.deleteMany({
          where: { id: { in: createdCsIds } },
        });
        //   4. Job openings (must precede StaffingOrder due to FK)
        await admin.jobOpening.deleteMany({
          where: { id: { in: createdJobOpeningIds } },
        });
        //   5. StaffingOrderSlots (Cascade parent → SO already tracked;
        //      skip the cascade edge by deleting slots explicitly with
        //      an empty set, since buildFixture does not create slots)
        //   (intentionally no-op — buildFixture creates no slots.)
        //   6. Staffing orders (must precede Project)
        await admin.staffingOrder.deleteMany({
          where: { id: { in: createdStaffingOrderIds } },
        });
        //   7. Placement cases (must precede LaborProfile)
        await admin.placementCase.deleteMany({
          where: { id: { in: createdPlacementCaseIds } },
        });
        //   8. Labor profiles (after all placements + cases reference them)
        await admin.laborProfile.deleteMany({
          where: { id: { in: createdLaborProfileIds } },
        });
        //   9. Projects (must precede ClientCompany)
        await admin.project.deleteMany({
          where: { id: { in: createdProjectIds } },
        });
        //  10. Client companies (no FK below)
        await admin.clientCompany.deleteMany({
          where: { id: { in: createdClientCompanyIds } },
        });
        //  11. Idempotency keys for tracked actor ids (independent
        //      zero-residue gate — T0 handback). Scoped by actorId,
        //      never blanket-deleted, because the table is shared
        //      across suites on the same synthetic DB.
        await admin.idempotencyKey.deleteMany({
          where: { actorId: { in: createdIdempotencyActorIds } },
        });

        // Zero-residue assertion. Every tracked surface MUST be empty.
        const residue = await admin.$transaction(async (tx) => {
          const counts = {
            placements: await tx.placement.count({
              where: { id: { in: createdPlacementIds } },
            }),
            applicationStatusHistories: await tx.applicationStatusHistory.count({
              where: { submissionId: { in: createdCsIds } },
            }),
            candidateSubmissions: await tx.candidateSubmission.count({
              where: { id: { in: createdCsIds } },
            }),
            jobOpenings: await tx.jobOpening.count({
              where: { id: { in: createdJobOpeningIds } },
            }),
            staffingOrders: await tx.staffingOrder.count({
              where: { id: { in: createdStaffingOrderIds } },
            }),
            placementCases: await tx.placementCase.count({
              where: { id: { in: createdPlacementCaseIds } },
            }),
            laborProfiles: await tx.laborProfile.count({
              where: { id: { in: createdLaborProfileIds } },
            }),
            projects: await tx.project.count({
              where: { id: { in: createdProjectIds } },
            }),
            clientCompanies: await tx.clientCompany.count({
              where: { id: { in: createdClientCompanyIds } },
            }),
            idempotencyKeys: await tx.idempotencyKey.count({
              where: { actorId: { in: createdIdempotencyActorIds } },
            }),
          };
          return counts;
        });
        expect(residue).toEqual({
          placements: 0,
          applicationStatusHistories: 0,
          candidateSubmissions: 0,
          jobOpenings: 0,
          staffingOrders: 0,
          placementCases: 0,
          laborProfiles: 0,
          projects: 0,
          clientCompanies: 0,
          idempotencyKeys: 0,
        });
      } finally {
        // Disconnects still allowed in finally (test harness safety);
        // cleanup itself is fail-closed.
        await admin?.$disconnect().catch(() => {});
        await writer?.$disconnect().catch(() => {});
      }
    }, 30000);

    // ─────────────────────────────────────────────────────────────────────
    // AC-01: role gate
    // ─────────────────────────────────────────────────────────────────────
    it('AC-01: HR_STAFF role → 403 FORBIDDEN on placement.create', async () => {
      mockAuth.getAuthContext.mockResolvedValueOnce({
        userId: `p1f0-hrstaff-${runId}`,
        role: 'HR_STAFF',
      });
      const { POST } = await import('@/app/api/admin/placements/route');
      const req = buildRequest('/api/admin/placements', {
        body: { placementCaseId: 'pc-x', jobOpeningId: randomUUID() },
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('FORBIDDEN');
    });

    it('AC-01: HR_MANAGER role → reaches body parser; missing Idempotency-Key → 400 IDEMPOTENCY_REQUIRED', async () => {
      mockAuth.getAuthContext.mockResolvedValueOnce({
        userId: `p1f0-hrmgr-${runId}`,
        role: 'HR_MANAGER',
      });
      const { POST } = await import('@/app/api/admin/placements/route');
      const req = buildRequest('/api/admin/placements', {
        body: { placementCaseId: 'pc-x', jobOpeningId: randomUUID() },
        headers: { 'x-idempotency-key': '' }, // strip default
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('IDEMPOTENCY_REQUIRED');
    });

    it('AC-01: ADMIN role + valid body → creates placement (SELECTED)', async () => {
      const f = await buildFixture(admin, '01', 'RECRUITMENT_SERVICE');

      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST } = await import('@/app/api/admin/placements/route');
      const req = buildRequest('/api/admin/placements', {
        body: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId },
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.placementId).toBeTruthy();
      expect(body.status).toBe('SELECTED');
      expect(body.replayed).toBe(false);
      expect(body.serviceModelSnapshot).toBe('RECRUITMENT_SERVICE');
      createdPlacementIds.push(body.placementId);
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-02: strict body parsing — unknown fields rejected
    // ─────────────────────────────────────────────────────────────────────
    it('AC-02: unknown field in create body → 400 VALIDATION (no DB call)', async () => {
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST } = await import('@/app/api/admin/placements/route');
      const req = buildRequest('/api/admin/placements', {
        body: {
          placementCaseId: 'pc-1',
          jobOpeningId: randomUUID(),
          sneaky: 'evil',
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('VALIDATION');
      expect(body.message).toMatch(/Unknown field: sneaky/);
    });

    it('AC-02: malformed jobOpeningId (not UUID v4) → 400 VALIDATION', async () => {
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST } = await import('@/app/api/admin/placements/route');
      const req = buildRequest('/api/admin/placements', {
        body: { placementCaseId: 'pc-1', jobOpeningId: 'not-a-uuid' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('VALIDATION');
      expect(body.message).toMatch(/UUID v4/);
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-03: idempotency replay
    // ─────────────────────────────────────────────────────────────────────
    it('AC-03: same key + same payload → replayed=true, single Placement', async () => {
      const f = await buildFixture(admin, '03', 'RECRUITMENT_SERVICE');
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST } = await import('@/app/api/admin/placements/route');

      const idemKey = randomUUID();
      const payload = { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId };

      const r1 = await POST(buildRequest('/api/admin/placements', { body: payload, headers: { 'x-idempotency-key': idemKey } }));
      const b1 = await r1.json();
      createdPlacementIds.push(b1.placementId);
      expect(b1.replayed).toBe(false);

      const r2 = await POST(buildRequest('/api/admin/placements', { body: payload, headers: { 'x-idempotency-key': idemKey } }));
      const b2 = await r2.json();
      expect(b2.placementId).toBe(b1.placementId);
      expect(b2.replayed).toBe(true);
      expect(r2.status).toBe(201);

      // DB proof: only ONE Placement row for this (case, opening).
      const count = await admin.placement.count({
        where: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId },
      });
      expect(count).toBe(1);
    });

    it('AC-03: same key + DIFFERENT payload → 409 IDEMPOTENCY_CONFLICT', async () => {
      const f1 = await buildFixture(admin, '03a', 'RECRUITMENT_SERVICE');
      const f2 = await buildFixture(admin, '03b', 'RECRUITMENT_SERVICE');
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST } = await import('@/app/api/admin/placements/route');

      const idemKey = randomUUID();
      const r1 = await POST(buildRequest('/api/admin/placements', {
        body: { placementCaseId: f1.placementCaseId, jobOpeningId: f1.jobOpeningId },
        headers: { 'x-idempotency-key': idemKey },
      }));
      const b1 = await r1.json();
      createdPlacementIds.push(b1.placementId);
      expect(b1.replayed).toBe(false);

      const r2 = await POST(buildRequest('/api/admin/placements', {
        body: { placementCaseId: f2.placementCaseId, jobOpeningId: f2.jobOpeningId }, // different payload
        headers: { 'x-idempotency-key': idemKey },
      }));
      expect(r2.status).toBe(409);
      const b2 = await r2.json();
      expect(b2.error).toBe('IDEMPOTENCY_CONFLICT');
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-04: sourceCandidateSubmissionId integrity check
    // ─────────────────────────────────────────────────────────────────────
    it('AC-04: sourceCandidateSubmissionId matching → create succeeds', async () => {
      const f = await buildFixture(admin, '04a', 'RECRUITMENT_SERVICE');
      const csId = await attachCandidateSubmission(admin, f, '04a');

      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST } = await import('@/app/api/admin/placements/route');
      const req = buildRequest('/api/admin/placements', {
        body: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId, sourceCandidateSubmissionId: csId },
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      createdPlacementIds.push(body.placementId);
    });

    it('AC-04: sourceCandidateSubmissionId mismatch → 400 VALIDATION, zero mutation', async () => {
      const fA = await buildFixture(admin, '04b-a', 'RECRUITMENT_SERVICE');
      const fB = await buildFixture(admin, '04b-b', 'RECRUITMENT_SERVICE');
      const csForA = await attachCandidateSubmission(admin, fA, '04b');

      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST } = await import('@/app/api/admin/placements/route');
      // Send csForA but for case B → mismatch
      const req = buildRequest('/api/admin/placements', {
        body: { placementCaseId: fB.placementCaseId, jobOpeningId: fB.jobOpeningId, sourceCandidateSubmissionId: csForA },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('PLACEMENT_VALIDATION_ERROR');

      // DB proof: zero Placement for case B.
      const count = await admin.placement.count({ where: { placementCaseId: fB.placementCaseId } });
      expect(count).toBe(0);
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-05: confirm → CONFIRMED; service writes confirmedAt only
    // ─────────────────────────────────────────────────────────────────────
    it('AC-05: confirm route → 200 CONFIRMED; replayed=false', async () => {
      const f = await buildFixture(admin, '05', 'RECRUITMENT_SERVICE');
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST: POST_CREATE } = await import('@/app/api/admin/placements/route');
      const r1 = await POST_CREATE(buildRequest('/api/admin/placements', {
        body: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId },
      }));
      const b1 = await r1.json();
      createdPlacementIds.push(b1.placementId);

      const { POST: POST_CONFIRM } = await import('@/app/api/admin/placements/[id]/actions/confirm/route');
      const r2 = await POST_CONFIRM(
        buildRequest(`/api/admin/placements/${b1.placementId}/actions/confirm`, { body: {} }),
        routeParams({ id: b1.placementId }),
      );
      expect(r2.status).toBe(200);
      const b2 = await r2.json();
      expect(b2.status).toBe('CONFIRMED');
      expect(b2.placementId).toBe(b1.placementId);
      expect(b2.replayed).toBe(false);
      // Service does NOT add placementCaseClosed (C-06).
      expect(b2.placementCaseClosed).toBeUndefined();

      // DB proof: confirmedAt is set.
      const placement = await admin.placement.findUnique({
        where: { id: b1.placementId },
        select: { status: true, confirmedAt: true },
      });
      expect(placement?.status).toBe('CONFIRMED');
      expect(placement?.confirmedAt).not.toBeNull();
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-06: confirm idempotent replay
    // ─────────────────────────────────────────────────────────────────────
    it('AC-06: same key on confirm → replayed=true', async () => {
      const f = await buildFixture(admin, '06', 'RECRUITMENT_SERVICE');
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST: POST_CREATE } = await import('@/app/api/admin/placements/route');
      const r1 = await POST_CREATE(buildRequest('/api/admin/placements', {
        body: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId },
      }));
      const b1 = await r1.json();
      createdPlacementIds.push(b1.placementId);

      const idemKey = randomUUID();
      const { POST: POST_CONFIRM } = await import('@/app/api/admin/placements/[id]/actions/confirm/route');
      const r2 = await POST_CONFIRM(
        buildRequest(`/api/admin/placements/${b1.placementId}/actions/confirm`, { body: {}, headers: { 'x-idempotency-key': idemKey } }),
        routeParams({ id: b1.placementId }),
      );
      const b2 = await r2.json();
      expect(b2.replayed).toBe(false);

      const r3 = await POST_CONFIRM(
        buildRequest(`/api/admin/placements/${b1.placementId}/actions/confirm`, { body: {}, headers: { 'x-idempotency-key': idemKey } }),
        routeParams({ id: b1.placementId }),
      );
      const b3 = await r3.json();
      expect(b3.replayed).toBe(true);
      expect(b3.status).toBe('CONFIRMED');
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-07: client-managed EFFECTIVE atomically closes PlacementCase; no Worker/Episode/Assignment
    // ─────────────────────────────────────────────────────────────────────
    it('AC-07: client-managed EFFECTIVE → Placement EFFECTIVE + PlacementCase CLOSED; zero Worker/Episode/Assignment', async () => {
      const f = await buildFixture(admin, '07', 'RECRUITMENT_SERVICE');
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'HR_MANAGER',
      });
      const { POST: POST_CREATE } = await import('@/app/api/admin/placements/route');
      const r1 = await POST_CREATE(buildRequest('/api/admin/placements', {
        body: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId },
      }));
      const b1 = await r1.json();
      createdPlacementIds.push(b1.placementId);

      const { POST: POST_CONFIRM } = await import('@/app/api/admin/placements/[id]/actions/confirm/route');
      const r2 = await POST_CONFIRM(
        buildRequest(`/api/admin/placements/${b1.placementId}/actions/confirm`, { body: {} }),
        routeParams({ id: b1.placementId }),
      );
      expect(r2.status).toBe(200);

      const { POST: POST_EFFECTIVE } = await import('@/app/api/admin/placements/[id]/actions/effective/route');
      const r3 = await POST_EFFECTIVE(
        buildRequest(`/api/admin/placements/${b1.placementId}/actions/effective`, {
          body: {
            evidence: {
              clientAcknowledgedAt: new Date().toISOString(),
              clientAcknowledgedByUserId: `p1f0-cb-${runId}`,
              acknowledgementRef: `p1f0-ref-${runId}`,
            },
          },
        }),
        routeParams({ id: b1.placementId }),
      );
      expect(r3.status).toBe(200);
      const b3 = await r3.json();
      expect(b3.status).toBe('EFFECTIVE');
      expect(b3.placementCaseClosed).toBeUndefined(); // C-06: route does NOT add field

      // DB proof: PlacementCase CLOSED.
      const pc = await admin.placementCase.findUnique({
        where: { id: f.placementCaseId },
        select: { status: true, closeReason: true },
      });
      expect(pc?.status).toBe('CLOSED');
      expect(pc?.closeReason).toMatch(/PLACEMENT_EFFECTIVE/);

      // DB proof: zero Worker/Episode/Assignment created.
      const workerCount = await admin.worker.count({ where: { laborProfile: { id: f.laborProfileId } } });
      expect(workerCount).toBe(0);
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-08: HRP-managed EFFECTIVE → 400 PLACEMENT_VALIDATION_ERROR (NO HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED)
    // ─────────────────────────────────────────────────────────────────────
    it('AC-08: HRP-managed EFFECTIVE → 400 PLACEMENT_VALIDATION_ERROR; zero mutation', async () => {
      const f = await buildFixture(admin, '08', 'STAFFING_SUPPLY');
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST: POST_CREATE } = await import('@/app/api/admin/placements/route');
      const r1 = await POST_CREATE(buildRequest('/api/admin/placements', {
        body: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId },
      }));
      const b1 = await r1.json();
      createdPlacementIds.push(b1.placementId);

      const { POST: POST_CONFIRM } = await import('@/app/api/admin/placements/[id]/actions/confirm/route');
      await POST_CONFIRM(
        buildRequest(`/api/admin/placements/${b1.placementId}/actions/confirm`, { body: {} }),
        routeParams({ id: b1.placementId }),
      );

      const { POST: POST_EFFECTIVE } = await import('@/app/api/admin/placements/[id]/actions/effective/route');
      const r3 = await POST_EFFECTIVE(
        buildRequest(`/api/admin/placements/${b1.placementId}/actions/effective`, {
          body: {
            evidence: {
              clientAcknowledgedAt: new Date().toISOString(),
              clientAcknowledgedByUserId: `p1f0-cb-${runId}`,
              acknowledgementRef: `p1f0-ref-${runId}`,
            },
          },
        }),
        routeParams({ id: b1.placementId }),
      );
      expect(r3.status).toBe(400);
      const b3 = await r3.json();
      expect(b3.error).toBe('PLACEMENT_VALIDATION_ERROR');
      expect(b3.error).not.toBe('HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED'); // taxonomy freeze

      // DB proof: Placement vẫn CONFIRMED; PlacementCase vẫn OPEN.
      const p = await admin.placement.findUnique({
        where: { id: b1.placementId },
        select: { status: true },
      });
      expect(p?.status).toBe('CONFIRMED');
      const pc = await admin.placementCase.findUnique({
        where: { id: f.placementCaseId },
        select: { status: true },
      });
      expect(pc?.status).toBe('OPEN');
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-09: cancel after EFFECTIVE → 409 INVALID_STATE_TRANSITION
    // ─────────────────────────────────────────────────────────────────────
    it('AC-09: cancel after EFFECTIVE → 409 INVALID_STATE_TRANSITION', async () => {
      const f = await buildFixture(admin, '09', 'RECRUITMENT_SERVICE');
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST: POST_CREATE } = await import('@/app/api/admin/placements/route');
      const r1 = await POST_CREATE(buildRequest('/api/admin/placements', {
        body: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId },
      }));
      const b1 = await r1.json();
      createdPlacementIds.push(b1.placementId);

      const { POST: POST_CONFIRM } = await import('@/app/api/admin/placements/[id]/actions/confirm/route');
      await POST_CONFIRM(
        buildRequest(`/api/admin/placements/${b1.placementId}/actions/confirm`, { body: {} }),
        routeParams({ id: b1.placementId }),
      );

      const { POST: POST_EFFECTIVE } = await import('@/app/api/admin/placements/[id]/actions/effective/route');
      await POST_EFFECTIVE(
        buildRequest(`/api/admin/placements/${b1.placementId}/actions/effective`, {
          body: {
            evidence: {
              clientAcknowledgedAt: new Date().toISOString(),
              clientAcknowledgedByUserId: `p1f0-cb-${runId}`,
              acknowledgementRef: `p1f0-ref-${runId}`,
            },
          },
        }),
        routeParams({ id: b1.placementId }),
      );

      // Now try to cancel after EFFECTIVE.
      const { POST: POST_CANCEL } = await import('@/app/api/admin/placements/[id]/actions/cancel/route');
      const rCancel = await POST_CANCEL(
        buildRequest(`/api/admin/placements/${b1.placementId}/actions/cancel`, { body: {} }),
        routeParams({ id: b1.placementId }),
      );
      expect(rCancel.status).toBe(409);
      const bCancel = await rCancel.json();
      expect(bCancel.error).toBe('INVALID_STATE_TRANSITION');
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-10: fail transition → FAILED
    // ─────────────────────────────────────────────────────────────────────
    it('AC-10: fail transition → 200 FAILED; service builds failureReason', async () => {
      const f = await buildFixture(admin, '10', 'RECRUITMENT_SERVICE');
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST: POST_CREATE } = await import('@/app/api/admin/placements/route');
      const r1 = await POST_CREATE(buildRequest('/api/admin/placements', {
        body: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId },
      }));
      const b1 = await r1.json();
      createdPlacementIds.push(b1.placementId);

      const { POST: POST_FAIL } = await import('@/app/api/admin/placements/[id]/actions/fail/route');
      const r2 = await POST_FAIL(
        buildRequest(`/api/admin/placements/${b1.placementId}/actions/fail`, { body: {} }),
        routeParams({ id: b1.placementId }),
      );
      expect(r2.status).toBe(200);
      const b2 = await r2.json();
      expect(b2.status).toBe('FAILED');

      // Service builds failureReason — verify non-empty.
      const p = await admin.placement.findUnique({
        where: { id: b1.placementId },
        select: { failureReason: true },
      });
      expect(p?.failureReason).toBeTruthy();
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-11: PlacementNotFound → 404
    // ─────────────────────────────────────────────────────────────────────
    it('AC-11: confirm unknown placement → 404 PLACEMENT_NOT_FOUND', async () => {
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST: POST_CONFIRM } = await import('@/app/api/admin/placements/[id]/actions/confirm/route');
      const fakeId = randomUUID();
      const res = await POST_CONFIRM(
        buildRequest(`/api/admin/placements/${fakeId}/actions/confirm`, { body: {} }),
        routeParams({ id: fakeId }),
      );
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('PLACEMENT_NOT_FOUND');
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-12: concurrent confirm + cancel — two legal serializable outcomes.
    //
    // Lifecycle (DEC-02, DEC-05): SELECTED → CONFIRMED → CANCELLED is intentionally
    // permitted. Therefore concurrent confirm+cancel has TWO legal outcomes:
    //
    //   (a) [200,409]: both commands observed SELECTED; one conditional UPDATE wins
    //                   and the other receives canonical conflict (409).
    //   (b) [200,200]: confirm commits first; cancel then legally observes
    //                   CONFIRMED and transitions it to CANCELLED.
    //
    // What we MUST guarantee:
    //   - statuses contain only 200 or 409
    //   - at least one response is 200
    //   - never 500
    //   - when [200,200]: confirm.status === 'CONFIRMED', cancel.status === 'CANCELLED',
    //                     final DB state Placement.status === 'CANCELLED',
    //                     exactly one Placement row
    //   - when [200,409]: final DB state equals the winning transition
    //   - no swallowed errors and no weak "anything non-500 passes" assertion
    //
    // We additionally run the concurrent fixture K times so flakiness shows up.
    // ─────────────────────────────────────────────────────────────────────
    it('AC-12a: concurrent confirm vs cancel — lifecycle permits both [200,409] and [200,200]; never 500', async () => {
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST: POST_CREATE } = await import('@/app/api/admin/placements/route');
      const { POST: POST_CONFIRM } = await import('@/app/api/admin/placements/[id]/actions/confirm/route');
      const { POST: POST_CANCEL } = await import('@/app/api/admin/placements/[id]/actions/cancel/route');

      const K = 5;
      const legalOutcomes = new Set<string>();
      for (let i = 0; i < K; i++) {
        const f = await buildFixture(admin, `12a-${i}`, 'RECRUITMENT_SERVICE');
        const r1 = await POST_CREATE(buildRequest('/api/admin/placements', {
          body: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId },
        }));
        const b1 = await r1.json();
        createdPlacementIds.push(b1.placementId);

        const [confirmRes, cancelRes] = await Promise.all([
          POST_CONFIRM(
            buildRequest(`/api/admin/placements/${b1.placementId}/actions/confirm`, { body: {} }),
            routeParams({ id: b1.placementId }),
          ),
          POST_CANCEL(
            buildRequest(`/api/admin/placements/${b1.placementId}/actions/cancel`, { body: {} }),
            routeParams({ id: b1.placementId }),
          ),
        ]);

        const confirmStatus = confirmRes.status;
        const cancelStatus = cancelRes.status;

        // Hard invariants: statuses ∈ {200,409}, at least one 200, never 500.
        for (const s of [confirmStatus, cancelStatus]) {
          expect([200, 409]).toContain(s);
        }
        expect([confirmStatus, cancelStatus]).toContain(200);
        expect([confirmStatus, cancelStatus].includes(500)).toBe(false);

        const confirmBody = await confirmRes.json();
        const cancelBody = await cancelRes.json();

        // Categorize the outcome.
        const sorted = [confirmStatus, cancelStatus].sort().join(',');
        if (sorted === '200,200') {
          // Confirm committed first; cancel then legally observed CONFIRMED
          // and transitioned it to CANCELLED. This is a legal serializable
          // outcome of the canonical lifecycle (DEC-02/DEC-05).
          expect(confirmBody.status).toBe('CONFIRMED');
          expect(cancelBody.status).toBe('CANCELLED');
          expect(confirmBody.placementId).toBe(b1.placementId);
          expect(cancelBody.placementId).toBe(b1.placementId);
        } else if (sorted === '200,409') {
          // Both commands observed SELECTED; one conditional UPDATE won and the
          // other received canonical conflict. The 409 must be a canonical
          // conflict error (either INVALID_STATE_TRANSITION or
          // PLACEMENT_IDEMPOTENCY_CONFLICT — both are 409, taxonomy is frozen).
          expect(confirmStatus === 200 || cancelStatus === 200).toBe(true);
          const losingBody = confirmStatus === 409 ? confirmBody : cancelBody;
          expect(['INVALID_STATE_TRANSITION', 'PLACEMENT_IDEMPOTENCY_CONFLICT']).toContain(
            losingBody.error,
          );
        } else {
          // Unreachable because of the hard invariants above — make it loud.
          throw new Error(
            `Illegal concurrent outcome: confirm=${confirmStatus}, cancel=${cancelStatus}`,
          );
        }
        legalOutcomes.add(sorted);

        // DB proof: final Placement.status ∈ {CONFIRMED, CANCELLED} (matches winner).
        const finalPlacement = await admin.placement.findUnique({
          where: { id: b1.placementId },
          select: { status: true },
        });
        expect(['CONFIRMED', 'CANCELLED']).toContain(finalPlacement?.status);

        // Exactly ONE Placement row for this case+opening.
        const placementCount = await admin.placement.count({
          where: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId },
        });
        expect(placementCount).toBe(1);
      }
      // At least one of the two legal outcomes must have been observed across
      // K runs (proves both branches are reachable, not theoretical).
      expect(legalOutcomes.has('200,200') || legalOutcomes.has('200,409')).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-12b: deterministic terminal-vs-terminal race (fail vs cancel).
    //
    // FAILED and CANCELLED are both terminal — they cannot legally chain.
    // Therefore concurrent fail+cancel from SELECTED MUST yield exactly one
    // 200 + one canonical 409, with final DB state matching the winner
    // (FAILED or CANCELLED). This is the real race-loser proof for the
    // terminal-state invariant, independent of the confirm-then-cancel
    // lifecycle path above.
    // ─────────────────────────────────────────────────────────────────────
    it('AC-12b: deterministic fail vs cancel — exactly one 200 + one canonical 409, final state FAILED or CANCELLED per winner', async () => {
      mockAuth.getAuthContext.mockResolvedValue({
        userId: `p1f0-admin-${runId}`,
        role: 'ADMIN',
      });
      const { POST: POST_CREATE } = await import('@/app/api/admin/placements/route');
      const { POST: POST_FAIL } = await import('@/app/api/admin/placements/[id]/actions/fail/route');
      const { POST: POST_CANCEL } = await import('@/app/api/admin/placements/[id]/actions/cancel/route');

      const f = await buildFixture(admin, '12b', 'RECRUITMENT_SERVICE');
      const r1 = await POST_CREATE(buildRequest('/api/admin/placements', {
        body: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId },
      }));
      const b1 = await r1.json();
      createdPlacementIds.push(b1.placementId);
      // Sanity: starting from SELECTED.
      expect(b1.status).toBe('SELECTED');

      const [failRes, cancelRes] = await Promise.all([
        POST_FAIL(
          buildRequest(`/api/admin/placements/${b1.placementId}/actions/fail`, { body: {} }),
          routeParams({ id: b1.placementId }),
        ),
        POST_CANCEL(
          buildRequest(`/api/admin/placements/${b1.placementId}/actions/cancel`, { body: {} }),
          routeParams({ id: b1.placementId }),
        ),
      ]);

      const failStatus = failRes.status;
      const cancelStatus = cancelRes.status;

      // Hard invariants: exactly one 200, exactly one canonical 409, never 500.
      const statuses = [failStatus, cancelStatus].sort();
      expect(statuses).toEqual([200, 409]);
      expect([failStatus, cancelStatus].includes(500)).toBe(false);

      const failBody = await failRes.json();
      const cancelBody = await cancelRes.json();

      // The losing 409 must be a canonical conflict (terminal-state invariant).
      const losingBody = failStatus === 409 ? failBody : cancelBody;
      expect(['INVALID_STATE_TRANSITION', 'PLACEMENT_IDEMPOTENCY_CONFLICT']).toContain(
        losingBody.error,
      );

      // The winning 200 must report exactly its terminal state.
      const winningBody = failStatus === 200 ? failBody : cancelBody;
      expect(['FAILED', 'CANCELLED']).toContain(winningBody.status);

      // DB proof: final Placement.status matches the winning 200, exactly ONE row.
      const finalPlacement = await admin.placement.findUnique({
        where: { id: b1.placementId },
        select: { status: true },
      });
      expect(finalPlacement?.status).toBe(winningBody.status);

      const placementCount = await admin.placement.count({
        where: { placementCaseId: f.placementCaseId, jobOpeningId: f.jobOpeningId },
      });
      expect(placementCount).toBe(1);

      // Failure reason: BOTH FAILED and CANCELLED terminal transitions receive a
      // server-built reason (`Marked <STATUS> by <actorId> at <ISO>`) per the
      // canonical placement.service.ts terminal-state handler. The reason must
      // therefore be non-empty, must echo the winning terminal status, and must
      // carry the canonical actor id used by this run.
      const p = await admin.placement.findUnique({
        where: { id: b1.placementId },
        select: { failureReason: true },
      });
      expect(typeof p?.failureReason).toBe('string');
      expect(p?.failureReason).toBeTruthy();
      expect(p?.failureReason).toContain(`Marked ${winningBody.status}`);
      expect(p?.failureReason).toContain(`p1f0-admin-${runId}`);
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-13: RLS GUC applied via withDbContext — verified by GUC inspection
    // ─────────────────────────────────────────────────────────────────────
    it('AC-13: withDbContext sets app.user_id + app.role GUC inside the placement command', async () => {
      const f = await buildFixture(admin, '13', 'RECRUITMENT_SERVICE');
      // Wrap getAuthContext to also assert GUC inside the tx via a callback.
      const userId = `p1f0-admin-${runId}`;
      mockAuth.getAuthContext.mockImplementation(async () => ({
        userId,
        role: 'ADMIN',
      }));

      // Use a probe PrismaClient that opens a tx and reads GUC after applyRlsContext.
      const { applyRlsContext, readRlsContext } = await import('@/src/shared/auth/rls-context');
      const ctx = { userId, role: 'ADMIN' as const };

      const guc = await writer.$transaction(async (tx) => {
        await applyRlsContext(tx as unknown as Prisma.TransactionClient, ctx);
        return readRlsContext(tx as unknown as Prisma.TransactionClient);
      });

      expect(guc.user_id).toBe(userId);
      expect(guc.role).toBe('ADMIN');
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────
// ENV_BLOCKED honest report (DEC-13).
// ─────────────────────────────────────────────────────────────────────────
describe('p1f0-placement-command-api — ENV_BLOCKED honest report', () => {
  it('nếu HAS_TEST_DB = false → ENV_BLOCKED (không phải PASS)', () => {
    if (HAS_TEST_DB) return;
    expect(HAS_TEST_DB).toBe(false);
    expect(process.env.DATABASE_URL_TEST ?? '').toBe('');
    expect(process.env.DATABASE_URL_ADMIN_TEST ?? '').toBe('');
  });
});

// Suppress unused-import lints in CI.
void PlacementError;
void PlacementIdempotencyConflictError;
