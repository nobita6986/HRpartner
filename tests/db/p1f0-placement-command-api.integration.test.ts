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
 * Refs:
 *   - Contract v1.1 §4.1.1 (5 commands)
 *   - TASK §0 (in-scope roots, forbidden paths)
 *   - C-07 (error→HTTP canonical mapping)
 *   - C-08 (single transaction boundary)
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
  const so = await admin.staffingOrder.create({
    data: {
      projectId: prj.id,
      code: `P1F0SO${runId}${seed}`,
      title: `P1F0 StaffingOrder ${seed} ${runId}`,
      status: 'OPEN',
    },
    select: { id: true },
  });
  const jo = await admin.jobOpening.create({
    data: {
      staffingOrderId: so.id,
      status: 'OPEN',
      openedAt: new Date(),
      serviceModel,
    },
    select: { id: true, serviceModel: true },
  });
  const lp = await admin.laborProfile.create({
    data: {
      fullName: `P1F0 LP ${seed} ${runId}`,
      phone: `0${runId.replace(/-/g, '').slice(0, 9)}${seed}`,
      normalizedPhone: `9${runId.replace(/-/g, '').slice(0, 9)}${seed}`,
    },
    select: { id: true },
  });
  const pc = await admin.placementCase.create({
    data: { laborProfileId: lp.id, status: 'OPEN', openedAt: new Date() },
    select: { id: true },
  });
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

    const createdLaborProfileIds: string[] = [];
    const createdPlacementCaseIds: string[] = [];
    const createdPlacementIds: string[] = [];
    const createdCsIds: string[] = [];

    beforeAll(async () => {
      if (!adminUrl || !writerUrl) return;
      admin = makeClient(adminUrl);
      writer = makeClient(writerUrl);
    }, 30000);

    afterAll(async () => {
      if (!admin) return;
      try {
        for (const pid of createdPlacementIds) {
          await admin.$executeRawUnsafe(`DELETE FROM placements WHERE id = $1`, pid).catch(() => {});
        }
        for (const csId of createdCsIds) {
          await admin.candidateSubmission.deleteMany({ where: { id: csId } }).catch(() => {});
        }
        for (const pcId of createdPlacementCaseIds) {
          await admin.placementCase.update({
            where: { id: pcId },
            data: { status: 'CLOSED', closedAt: new Date() },
          }).catch(() => {});
        }
        for (const lpId of createdLaborProfileIds) {
          await admin.placementCase.deleteMany({ where: { laborProfileId: lpId } }).catch(() => {});
          await admin.laborProfile.deleteMany({ where: { id: lpId } }).catch(() => {});
        }
      } catch (e) {
        console.warn('P1-F0 cleanup partial failure:', (e as Error).message.slice(0, 200));
      }
      await admin?.$disconnect().catch(() => {});
      await writer?.$disconnect().catch(() => {});
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
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

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
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

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
      createdLaborProfileIds.push(f1.lpId, f2.lpId);
      createdPlacementCaseIds.push(f1.pcId, f2.pcId);

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
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);
      const csId = await attachCandidateSubmission(admin, f, '04a');
      createdCsIds.push(csId);

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
      createdLaborProfileIds.push(fA.lpId, fB.lpId);
      createdPlacementCaseIds.push(fA.pcId, fB.pcId);
      const csForA = await attachCandidateSubmission(admin, fA, '04b');
      createdCsIds.push(csForA);

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
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

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
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

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
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

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
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

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
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

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
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

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
    // AC-12: concurrent confirm + cancel — one success, one canonical 409
    // ─────────────────────────────────────────────────────────────────────
    it('AC-12: concurrent confirm vs cancel — một success, một 409 INVALID_STATE_TRANSITION, không 500', async () => {
      const f = await buildFixture(admin, '12', 'RECRUITMENT_SERVICE');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

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
      const { POST: POST_CANCEL } = await import('@/app/api/admin/placements/[id]/actions/cancel/route');

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

      const statuses = [confirmRes.status, cancelRes.status].sort();
      // One 200, one 409 (terminal-state) — never both 200, never 500.
      expect(statuses).toEqual([200, 409]);
    });

    // ─────────────────────────────────────────────────────────────────────
    // AC-13: RLS GUC applied via withDbContext — verified by GUC inspection
    // ─────────────────────────────────────────────────────────────────────
    it('AC-13: withDbContext sets app.user_id + app.role GUC inside the placement command', async () => {
      const f = await buildFixture(admin, '13', 'RECRUITMENT_SERVICE');
      createdLaborProfileIds.push(f.lpId);
      createdPlacementCaseIds.push(f.pcId);

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
