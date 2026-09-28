/**
 * p1f1-placement-action-ui.integration.test.ts — P1-F1 DB integration test.
 *
 * Lane: integration (DB-touching). Self-skips when DATABASE_URL_TEST +
 * DATABASE_URL_ADMIN_TEST are absent. ENV_BLOCKED is an HONEST report, not
 * a pass condition (DEC-13). Tier 0/Owner cung cấp DB trước khi xét merge.
 *
 * Scope (round 2 / PRE-AUDIT CORRECTION BATCH 2/2):
 *   - F1-DB01..F1-DB06: pure read-model evidence (placement +
 *     placementOptions projection) — same as round 1.
 *   - F1-DB07, F1-DB08: pure state-helper evidence (LOCK-15).
 *   - F1-DB09 (C2-02): F1 generate → canonical F0 ROUTE POST → F0 confirm
 *     ROUTE POST → real HTTP envelopes → read-model observes CONFIRMED.
 *     NO direct placement.create / placement.update calls.
 *   - F1-DB10 (C2-03): canonical F0 route stack creates + confirms an
 *     HRP-managed placement; an EFFECTIVE POST against the same route
 *     returns the canonical rejection; re-reading the DB proves the
 *     placement stays CONFIRMED. NO manually thrown
 *     `HRP_EFFECTIVE_FORBIDDEN`.
 *
 * Round 2 cleanup rule (C2-01): every fixture create is tracked. The
 * single biggest defect from round 1 was a direct
 * `admin.candidateSubmission.create(...)` in the DB05 legacy test that
 * never pushed its id into `submissionIds`. We route EVERY
 * CandidateSubmission (including legacy slot=null) through one canonical
 * helper that ALWAYS pushes the id.
 *
 * Refs:
 *   - Contract v1.1 §3 / §4.1 (placement lifecycle, additive DTO)
 *   - tests/db/recruiter-workbench.integration.test.ts (P1-E0 base pattern)
 *   - tests/db/p1f0-placement-command-api.integration.test.ts (F0 route
 *     invocation pattern + buildFixture)
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { PrismaClient, type Prisma, type ServiceModel } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────
// Mocks (hoisted) — drive the boundary without spinning up real auth.
// ─────────────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', async (original) => {
  const actual = await original<typeof import('@/src/shared/auth/auth-context')>();
  return {
    ...actual,
    getAuthContext: mocks.getAuthContext,
    AuthSessionError: actual.AuthSessionError,
  };
});

vi.mock('@/src/lib/db', () => ({
  getPrisma: mocks.getPrisma,
}));

import { getRecruiterWorkbenchList } from '@/src/domains/talent/recruiter-workbench.read-service';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import {
  availableActionsForRow,
  isStalePlacementSnapshot,
} from '@/src/domains/talent/recruiter-workbench.placement-actions.states';

// ─────────────────────────────────────────────────────────────────────────
// Env gate + clients
// ─────────────────────────────────────────────────────────────────────────
const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl &&
  !!writerUrl &&
  !adminUrl.includes('placeholder') &&
  !writerUrl.includes('placeholder');

const runId = `p1f1r2-${randomUUID().slice(0, 8)}`;

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
    transactionOptions: { timeout: 15_000 },
  });
}

/**
 * Build a NextRequest with a UUID-v4 Idempotency-Key header (F0 contract).
 * The body is JSON-stringified and `content-type` is application/json.
 */
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
    'x-idempotency-key': randomUUID(),
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

describe.skipIf(!HAS_TEST_DB)('P1-F1 Placement Action UI integration (round 2)', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;

  const userIds: string[] = [];
  const profileIds: string[] = [];
  const caseIds: string[] = [];
  const clientCompanyIds: string[] = [];
  const projectIds: string[] = [];
  const staffingOrderIds: string[] = [];
  const jobOpeningIds: string[] = [];
  const slotIds: string[] = [];
  const submissionIds: string[] = [];
  const placementIds: string[] = [];
  const jobPostingIds: string[] = [];

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);

    const adminUser = await admin.user.create({
      data: {
        id: `${runId}-admin`,
        phone: `${runId}-admin`,
        name: 'P1F1R2 Admin',
        role: 'ADMIN',
      },
    });
    userIds.push(adminUser.id);
    // Default role (all read-service calls): ADMIN. F0-route cases can
    // override per-call via `mocks.getAuthContext.mockResolvedValueOnce`.
    mocks.getAuthContext.mockResolvedValue({
      userId: adminUser.id,
      role: 'ADMIN',
    });
    // The F0 route pipeline calls `getPrisma()` (NOT `withDbContext`) to
    // acquire the raw Prisma client. Wire the writer; routes that run
    // commands create their own transactions internally.
    mocks.getPrisma.mockReturnValue(writer);
  }, 30_000);

  afterAll(async () => {
    try {
      // C2-01 / strict reverse-FK teardown — by tracked IDs only.
      await admin?.placement.deleteMany({
        where: { id: { in: placementIds } },
      });
      await admin?.applicationStatusHistory?.deleteMany({
        where: { submissionId: { in: submissionIds } },
      });
      await admin?.candidateSubmission.deleteMany({
        where: { id: { in: submissionIds } },
      });
      await admin?.jobPosting.deleteMany({
        where: { id: { in: jobPostingIds } },
      });
      await admin?.staffingOrderSlot.deleteMany({
        where: { id: { in: slotIds } },
      });
      await admin?.jobOpening.deleteMany({
        where: { id: { in: jobOpeningIds } },
      });
      await admin?.staffingOrder.deleteMany({
        where: { id: { in: staffingOrderIds } },
      });
      await admin?.placementCase.deleteMany({
        where: { id: { in: caseIds } },
      });
      await admin?.project.deleteMany({
        where: { id: { in: projectIds } },
      });
      await admin?.clientCompany.deleteMany({
        where: { id: { in: clientCompanyIds } },
      });
      await admin?.laborProfile.deleteMany({
        where: { id: { in: profileIds } },
      });
      await admin?.user.deleteMany({ where: { id: { in: userIds } } });

      const residue = await admin?.$transaction(async (tx) => {
        const counts = {
          users: await tx.user.count({ where: { id: { in: userIds } } }),
          laborProfiles: await tx.laborProfile.count({
            where: { id: { in: profileIds } },
          }),
          placementCases: await tx.placementCase.count({
            where: { id: { in: caseIds } },
          }),
          clientCompanies: await tx.clientCompany.count({
            where: { id: { in: clientCompanyIds } },
          }),
          projects: await tx.project.count({ where: { id: { in: projectIds } } }),
          staffingOrders: await tx.staffingOrder.count({
            where: { id: { in: staffingOrderIds } },
          }),
          jobOpenings: await tx.jobOpening.count({
            where: { id: { in: jobOpeningIds } },
          }),
          staffingOrderSlots: await tx.staffingOrderSlot.count({
            where: { id: { in: slotIds } },
          }),
          candidateSubmissions: await tx.candidateSubmission.count({
            where: { id: { in: submissionIds } },
          }),
          placements: await tx.placement.count({
            where: { id: { in: placementIds } },
          }),
          jobPostings: await tx.jobPosting.count({
            where: { id: { in: jobPostingIds } },
          }),
        };
        return counts;
      });
      expect(residue).toEqual({
        users: 0,
        laborProfiles: 0,
        placementCases: 0,
        clientCompanies: 0,
        projects: 0,
        staffingOrders: 0,
        jobOpenings: 0,
        staffingOrderSlots: 0,
        candidateSubmissions: 0,
        placements: 0,
        jobPostings: 0,
      });
    } finally {
      await writer?.$disconnect().catch(() => {});
      await admin?.$disconnect().catch(() => {});
    }
  }, 30_000);

  // ───────────────────────────────────────────────────────────────────
  // Fixture builders — every fixture MUST push into the tracked-id
  // array; teardown relies on it (C2-01).
  // ───────────────────────────────────────────────────────────────────

  async function makeProfile(label: string) {
    const profile = await admin.laborProfile.create({
      data: {
        fullName: `${label} ${runId}`,
        phone: `${runId}-${label}-phone`,
        cccdNumber: `${runId}-${label}-cccd`,
        identityVerification: 'VERIFIED',
        completeness: 'COMPLETE',
      },
    });
    profileIds.push(profile.id);
    return {
      ...profile,
      fullName: profile.fullName ?? `${label} ${runId}`,
    };
  }

  async function makeCase(profileId: string, status: 'OPEN' | 'READY_TO_PLACE') {
    const c = await admin.placementCase.create({
      data: {
        laborProfileId: profileId,
        status,
        openedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });
    caseIds.push(c.id);
    return c;
  }

  async function makeCompany(label: string) {
    const cc = await admin.clientCompany.create({
      data: {
        name: `P1F1R2 ${label} ${runId}`,
        code: `P1F1R2-${runId}-${label}`,
      },
    });
    clientCompanyIds.push(cc.id);
    return cc;
  }

  async function makeProject(label: string, clientCompanyId: string, name: string) {
    const prj = await admin.project.create({
      data: {
        name,
        code: `P1F1R2-${runId}-${label}`,
        clientCompanyId,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 86400_000),
      },
    });
    projectIds.push(prj.id);
    return prj;
  }

  async function makeStaffingOrder(projectId: string, label: string) {
    const so = await admin.staffingOrder.create({
      data: {
        projectId,
        code: `P1F1R2-${runId}-${label}`,
        title: `P1F1R2 SO ${label}`,
        status: 'OPEN',
      },
    });
    staffingOrderIds.push(so.id);
    return so;
  }

  async function makeJobOpening(
    staffingOrderId: string,
    opts: {
      label: string;
      serviceModel: ServiceModel;
    },
  ) {
    const jobOpening = await admin.jobOpening.create({
      data: {
        staffingOrderId,
        serviceModel: opts.serviceModel,
        status: 'OPEN',
      },
    });
    jobOpeningIds.push(jobOpening.id);
    return jobOpening;
  }

  async function makeSlot(staffingOrderId: string, jobOpeningId: string, label: string) {
    const slot = await admin.staffingOrderSlot.create({
      data: {
        staffingOrderId,
        jobOpeningId,
        positionCode: `PC-${label}-${runId}`,
        positionTitle: `Vị trí ${label}`,
        slotsNeeded: 1,
        slotsFilled: 0,
        validFrom: new Date(),
      },
    });
    slotIds.push(slot.id);
    return slot;
  }

  async function makePosting(opts: { jobOpeningId: string; title: string; label: string }) {
    const post = await admin.jobPosting.create({
      data: {
        jobOpeningId: opts.jobOpeningId,
        title: opts.title,
        slug: `p1f1r2-${opts.label}-${runId}`,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    jobPostingIds.push(post.id);
    return post;
  }

  /**
   * C2-01 / round 2 — single canonical CandidateSubmission helper.
   * ALWAYS pushes the created id into `submissionIds`, including the
   * legacy slot=null variant. ALL fixture creates in this file must go
   * through this function so the teardown never leaks residue (the
   * round-1 `DB05` bug was a direct `admin.candidateSubmission.create`
   * that bypassed tracking).
   */
  async function makeSubmission(
    opts: {
      laborProfileId: string;
      placementCaseId: string;
      slotId: string | null;
      createdAt?: Date;
      legacy?: boolean;
    },
  ): Promise<string> {
    const sub = await admin.candidateSubmission.create({
      data: {
        laborProfileId: opts.laborProfileId,
        placementCaseId: opts.placementCaseId,
        slotId: opts.slotId,
        fullName: opts.legacy
          ? `P1F1R2 Legacy Sub ${opts.laborProfileId.slice(-4)}`
          : `P1F1R2 Sub ${opts.laborProfileId.slice(-4)}`,
        phone: `${runId}-sub`,
        createdAt: opts.createdAt ?? new Date(),
      },
    });
    submissionIds.push(sub.id);
    return sub.id;
  }

  /**
   * Build the minimal Placement fixture for read-model projections.
   * Used ONLY by DB02, DB03, DB04, DB06 (no F0-route involvement).
   * Any route-driven DB09/DB10 path goes through the canonical route,
   * NOT through this helper.
   */
  async function makePlacementRow(opts: {
    placementCaseId: string;
    laborProfileId: string;
    clientCompanyId: string;
    projectId: string;
    jobOpeningId: string;
    serviceModelSnapshot: ServiceModel;
    status?: 'SELECTED' | 'CONFIRMED';
  }) {
    const p = await admin.placement.create({
      data: {
        placementCaseId: opts.placementCaseId,
        laborProfileId: opts.laborProfileId,
        clientCompanyId: opts.clientCompanyId,
        projectId: opts.projectId,
        jobOpeningId: opts.jobOpeningId,
        serviceModelSnapshot: opts.serviceModelSnapshot,
        status: opts.status ?? 'SELECTED',
      },
    });
    placementIds.push(p.id);
    return p;
  }

  async function fetchOneRow(searchTag: string) {
    const ctx = { userId: `${runId}-admin`, role: 'ADMIN' as const };
    return writer.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.user_id', $1, true)`,
        ctx.userId,
      );
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.role', $1, true)`,
        ctx.role,
      );
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.vendor_id', '', true)`,
      );
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.worker_id', '', true)`,
      );
      return getRecruiterWorkbenchList(
        tx,
        ctx as AuthContext,
        { search: searchTag, view: 'ALL', page: 1, pageSize: 50 },
        { canSeeSensitive: true },
        new Date(),
      );
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // F1-DB01 .. F1-DB08 — pure read-model evidence + helper matrix.
  // Identical scope to round 1 (the targeted F1 unit/component tests
  // and the read-model projection are not under dispute). All
  // CandidateSubmissions go through makeSubmission (C2-01 fixed).
  // ───────────────────────────────────────────────────────────────────

  it('F1-DB01: case with NO placement + NO submissions → placement + placementOptions both null', async () => {
    const profile = await makeProfile('db01');
    await makeCase(profile.id, 'OPEN');

    const out = await fetchOneRow(profile.fullName);
    expect(out.total).toBe(1);
    const row = out.items[0]!;
    expect(row.placement).toBeNull();
    expect(row.placementOptions).toBeNull();
  });

  it('F1-DB02: case with SELECTED HRP-managed Placement → placement surfaces with managementMode=HRP_MANAGED', async () => {
    const profile = await makeProfile('db02');
    const pc = await makeCase(profile.id, 'READY_TO_PLACE');
    const cc = await makeCompany('db02cc');
    const prj = await makeProject('db02prj', cc.id, 'P1F1R2 Project Bravo');
    const so = await makeStaffingOrder(prj.id, 'db02so');
    const jo = await makeJobOpening(so.id, {
      label: 'db02jo',
      serviceModel: 'STAFFING_SUPPLY',
    });
    await makePlacementRow({
      placementCaseId: pc.id,
      laborProfileId: profile.id,
      clientCompanyId: cc.id,
      projectId: prj.id,
      jobOpeningId: jo.id,
      serviceModelSnapshot: 'STAFFING_SUPPLY',
    });

    const out = await fetchOneRow(profile.fullName);
    expect(out.total).toBe(1);
    const row = out.items[0]!;
    expect(row.placement).not.toBeNull();
    expect(row.placement?.managementMode).toBe('HRP_MANAGED');
    expect(row.placement?.status).toBe('SELECTED');
    expect(row.placement?.jobOpeningId).toBe(jo.id);
  });

  it('F1-DB03: 2 submissions targeting the same JobOpening → placementOptions surfaces ONE option with NEWEST submission id', async () => {
    const profile = await makeProfile('db03');
    const pc = await makeCase(profile.id, 'READY_TO_PLACE');
    const cc = await makeCompany('db03cc');
    const prj = await makeProject('db03prj', cc.id, 'P1F1R2 Alpha');
    const so = await makeStaffingOrder(prj.id, 'db03so');
    const jo = await makeJobOpening(so.id, {
      label: 'db03jo',
      serviceModel: 'RECRUITMENT_SERVICE',
    });
    await makePosting({ jobOpeningId: jo.id, title: 'Thợ điện', label: 'db03' });
    const slot = await makeSlot(so.id, jo.id, 'db03slot');

    await makeSubmission({
      laborProfileId: profile.id,
      placementCaseId: pc.id,
      slotId: slot.id,
      createdAt: new Date('2026-09-26T09:00:00Z'),
    });
    await makeSubmission({
      laborProfileId: profile.id,
      placementCaseId: pc.id,
      slotId: slot.id,
      createdAt: new Date('2026-09-25T09:00:00Z'),
    });

    const out = await fetchOneRow(profile.fullName);
    expect(out.total).toBe(1);
    const row = out.items[0]!;
    expect(row.placementOptions?.length).toBe(1);
    const opt = row.placementOptions![0]!;
    expect(opt.jobOpeningId).toBe(jo.id);
    expect(opt.sourceCandidateSubmissionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-/i,
    );
    expect(opt.title).toBe('Thợ điện');
    expect(opt.projectName).toBe('P1F1R2 Alpha');
  });

  it('F1-DB04: 3 distinct job openings → sorted by (projectName, title, jobOpeningId)', async () => {
    const profile = await makeProfile('db04');
    const pc = await makeCase(profile.id, 'READY_TO_PLACE');

    const ccA = await makeCompany('db04ccA');
    const prjA = await makeProject('db04prjA', ccA.id, 'Alpha-Works');
    const soA = await makeStaffingOrder(prjA.id, 'db04soA');
    const joA = await makeJobOpening(soA.id, {
      label: 'db04joA',
      serviceModel: 'STAFFING_SUPPLY',
    });
    await makePosting({ jobOpeningId: joA.id, title: 'Helper', label: 'db04A' });
    const slotA = await makeSlot(soA.id, joA.id, 'db04slotA');

    const ccB = await makeCompany('db04ccB');
    const prjB = await makeProject('db04prjB', ccB.id, 'Alpha-Works');
    const soB = await makeStaffingOrder(prjB.id, 'db04soB');
    const joB = await makeJobOpening(soB.id, {
      label: 'db04joB',
      serviceModel: 'STAFFING_SUPPLY',
    });
    await makePosting({ jobOpeningId: joB.id, title: 'Welder', label: 'db04B' });
    const slotB = await makeSlot(soB.id, joB.id, 'db04slotB');

    const ccC = await makeCompany('db04ccC');
    const prjC = await makeProject('db04prjC', ccC.id, 'Bravo-Site');
    const soC = await makeStaffingOrder(prjC.id, 'db04soC');
    const joC = await makeJobOpening(soC.id, {
      label: 'db04joC',
      serviceModel: 'STAFFING_SUPPLY',
    });
    await makePosting({ jobOpeningId: joC.id, title: 'Welder', label: 'db04C' });
    const slotC = await makeSlot(soC.id, joC.id, 'db04slotC');

    await makeSubmission({
      laborProfileId: profile.id,
      placementCaseId: pc.id,
      slotId: slotA.id,
    });
    await makeSubmission({
      laborProfileId: profile.id,
      placementCaseId: pc.id,
      slotId: slotB.id,
    });
    await makeSubmission({
      laborProfileId: profile.id,
      placementCaseId: pc.id,
      slotId: slotC.id,
    });

    const out = await fetchOneRow(profile.fullName);
    expect(out.total).toBe(1);
    const options = out.items[0]!.placementOptions!;
    expect(options.length).toBe(3);
    const titlesAlpha = options
      .filter((o) => o.projectName === 'Alpha-Works')
      .map((o) => o.title);
    expect(titlesAlpha).toEqual(['Helper', 'Welder']);
    expect(options[options.length - 1]!.projectName).toBe('Bravo-Site');
  });

  it('F1-DB05 (C2-01 fixed): legacy submission with slot=null tracked via canonical helper', async () => {
    const profile = await makeProfile('db05');
    const pc = await makeCase(profile.id, 'READY_TO_PLACE');

    // C2-01: routed through `makeSubmission` so teardown sees the id.
    // `legacy=true` preserves the slot=null semantics so the read-model
    // expectation (placementOptions null) still holds.
    await makeSubmission({
      laborProfileId: profile.id,
      placementCaseId: pc.id,
      slotId: null,
      legacy: true,
    });

    const out = await fetchOneRow(profile.fullName);
    const row = out.items[0]!;
    expect(row.placementOptions).toBeNull();
    expect(row.placement).toBeNull();
  });

  it('F1-DB06: cross-row isolation — placement on case A is NOT carried over to case B', async () => {
    const profileA = await makeProfile('db06A');
    const profileB = await makeProfile('db06B');

    const pcA = await makeCase(profileA.id, 'READY_TO_PLACE');
    const pcB = await makeCase(profileB.id, 'READY_TO_PLACE');

    const cc = await makeCompany('db06cc');
    const prj = await makeProject('db06prj', cc.id, 'P1F1R2 Delta');
    const so = await makeStaffingOrder(prj.id, 'db06so');
    const jo = await makeJobOpening(so.id, {
      label: 'db06jo',
      serviceModel: 'STAFFING_SUPPLY',
    });

    await makePlacementRow({
      placementCaseId: pcA.id,
      laborProfileId: profileA.id,
      clientCompanyId: cc.id,
      projectId: prj.id,
      jobOpeningId: jo.id,
      serviceModelSnapshot: 'STAFFING_SUPPLY',
    });

    const outA = await fetchOneRow(profileA.fullName);
    expect(outA.total).toBe(1);
    expect(outA.items[0]!.placement).not.toBeNull();

    const outB = await fetchOneRow(profileB.fullName);
    expect(outB.total).toBe(1);
    expect(outB.items[0]!.placement).toBeNull();
  });

  it('F1-DB07: isStalePlacementSnapshot classifies SELECTED + IN_PROGRESS as stale', () => {
    const row = {
      caseId: 'db07',
      caseStatus: 'IN_PROGRESS' as const,
      placement: {
        id: 'pl-1',
        status: 'SELECTED' as const,
        jobOpeningId: 'jo-1',
        managementMode: 'HRP_MANAGED' as const,
      },
      placementOptions: null,
    };
    expect(isStalePlacementSnapshot(row)).toBe(true);
    expect(
      availableActionsForRow({ ...row, nextAction: 'REVIEW_PLACEMENT' as const }),
    ).toEqual([]);
  });

  it('F1-DB08: availableActionsForRow returns confirm+fail+cancel for SELECTED + READY_TO_PLACE', () => {
    const row = {
      caseId: 'db08',
      caseStatus: 'READY_TO_PLACE' as const,
      placement: {
        id: 'pl-1',
        status: 'SELECTED' as const,
        jobOpeningId: 'jo-1',
        managementMode: 'HRP_MANAGED' as const,
      },
      placementOptions: null,
    };
    expect(
      availableActionsForRow({ ...row, nextAction: 'REVIEW_PLACEMENT' as const }).map(
        (a) => a.command,
      ),
    ).toEqual([
      'placement.confirm',
      'placement.fail',
      'placement.cancel',
    ]);
  });

  // ───────────────────────────────────────────────────────────────────────
  // F1-DB09 (C2-02) — F1 generate → canonical F0 routes → read model
  // observes CONFIRMED. NO direct placement.create / placement.update.
  // ───────────────────────────────────────────────────────────────────────

  it('F1-DB09 (C2-02): F1 create via F0 route + F0 confirm via route + read-model observes CONFIRMED', async () => {
    // Build minimal chain through the tracked-id helpers ONLY — never
    // call placement.create directly.
    const profile = await makeProfile('db09');
    const pc = await makeCase(profile.id, 'READY_TO_PLACE');
    const cc = await makeCompany('db09cc');
    const prj = await makeProject('db09prj', cc.id, 'P1F1R2 Runway-9');
    const so = await makeStaffingOrder(prj.id, 'db09so');
    const jo = await makeJobOpening(so.id, {
      label: 'db09jo',
      serviceModel: 'RECRUITMENT_SERVICE',
    });
    await makePosting({ jobOpeningId: jo.id, title: 'Crane operator', label: 'db09' });
    const slot = await makeSlot(so.id, jo.id, 'db09slot');
    await makeSubmission({
      laborProfileId: profile.id,
      placementCaseId: pc.id,
      slotId: slot.id,
    });

    // Pre-state: read model has placement:null + 1 placementOption.
    const pre = await fetchOneRow(profile.fullName);
    expect(pre.items[0]!.placement).toBeNull();
    expect(pre.items[0]!.placementOptions?.length).toBe(1);

    // C2-02 fix: invoke the canonical F0 route. Admin session is
    // already set in beforeAll (mockResolvedValue); the F0 pipeline
    // internally calls `getPrisma()` (which we mocked to `writer`).
    const { POST: POST_CREATE } = await import(
      '@/app/api/admin/placements/route'
    );
    const createRes = await POST_CREATE(
      buildRequest('/api/admin/placements', {
        body: {
          placementCaseId: pc.id,
          jobOpeningId: jo.id,
        },
      }),
    );
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.placementId).toBeTruthy();
    expect(createBody.status).toBe('SELECTED');
    expect(createBody.replayed).toBe(false);
    placementIds.push(createBody.placementId);

    // C2-02 fix: invoke the canonical F0 confirm route.
    const { POST: POST_CONFIRM } = await import(
      '@/app/api/admin/placements/[id]/actions/confirm/route'
    );
    const confirmRes = await POST_CONFIRM(
      buildRequest(
        `/api/admin/placements/${createBody.placementId}/actions/confirm`,
        { body: {} },
      ),
      routeParams({ id: createBody.placementId }),
    );
    expect(confirmRes.status).toBe(200);
    const confirmBody = await confirmRes.json();
    expect(confirmBody.status).toBe('CONFIRMED');
    expect(confirmBody.placementId).toBe(createBody.placementId);
    expect(confirmBody.replayed).toBe(false);

    // DB proof (read-side): confirmedAt populated by the service.
    const placementRow = await admin.placement.findUnique({
      where: { id: createBody.placementId },
      select: { status: true, confirmedAt: true },
    });
    expect(placementRow?.status).toBe('CONFIRMED');
    expect(placementRow?.confirmedAt).not.toBeNull();

    // Read-model proof: refreshed projection observes CONFIRMED.
    const post = await fetchOneRow(profile.fullName);
    expect(post.items[0]!.placement?.id).toBe(createBody.placementId);
    expect(post.items[0]!.placement?.status).toBe('CONFIRMED');
  });

  // ───────────────────────────────────────────────────────────────────────
  // F1-DB10 (C2-03) — canonical F0 route stack creates + confirms an
  // HRP-managed placement; an EFFECTIVE POST against the SAME route
  // returns the canonical rejection; re-reading the DB proves the
  // placement stays CONFIRMED. NO manually thrown
  // `HRP_EFFECTIVE_FORBIDDEN`.
  // ───────────────────────────────────────────────────────────────────────

  it('F1-DB10 (C2-03): HRP-managed placement → canonical EFFECTIVE route returns 400; placement stays CONFIRMED', async () => {
    const profile = await makeProfile('db10');
    const pc = await makeCase(profile.id, 'READY_TO_PLACE');
    const cc = await makeCompany('db10cc');
    const prj = await makeProject('db10prj', cc.id, 'P1F1R2 Runway-10');
    const so = await makeStaffingOrder(prj.id, 'db10so');
    const jo = await makeJobOpening(so.id, {
      label: 'db10jo',
      serviceModel: 'STAFFING_SUPPLY',
    });
    await makePosting({ jobOpeningId: jo.id, title: 'Welder HRP', label: 'db10' });
    const slot = await makeSlot(so.id, jo.id, 'db10slot');
    await makeSubmission({
      laborProfileId: profile.id,
      placementCaseId: pc.id,
      slotId: slot.id,
    });

    // C2-03 fix: create + confirm through the canonical F0 route stack
    // (NO direct placement.create, NO direct placement.update).
    const { POST: POST_CREATE } = await import(
      '@/app/api/admin/placements/route'
    );
    const createRes = await POST_CREATE(
      buildRequest('/api/admin/placements', {
        body: {
          placementCaseId: pc.id,
          jobOpeningId: jo.id,
        },
      }),
    );
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    placementIds.push(createBody.placementId);

    const { POST: POST_CONFIRM } = await import(
      '@/app/api/admin/placements/[id]/actions/confirm/route'
    );
    const confirmRes = await POST_CONFIRM(
      buildRequest(
        `/api/admin/placements/${createBody.placementId}/actions/confirm`,
        { body: {} },
      ),
      routeParams({ id: createBody.placementId }),
    );
    expect(confirmRes.status).toBe(200);
    const confirmBody = await confirmRes.json();
    expect(confirmBody.status).toBe('CONFIRMED');

    // UI gate sanity check: HRP-managed + CONFIRMED → no EFFECTIVE
    // command in the available action set (matches LOCK-15).
    expect(
      availableActionsForRow({
        caseStatus: 'READY_TO_PLACE',
        placement: {
          id: createBody.placementId,
          status: 'CONFIRMED',
          jobOpeningId: jo.id,
          managementMode: 'HRP_MANAGED',
        },
        placementOptions: null,
        nextAction: 'REVIEW_PLACEMENT',
      }).map((a) => a.command),
    ).not.toContain('placement.effective');

    // C2-03 fix: invoke the REAL EFFECTIVE route with VALID evidence.
    // The route is canonical and the rejection comes from the canonical
    // service via `PlacementValidationError`. NO manual `if
    // serviceModelSnapshot === 'STAFFING_SUPPLY' throw …` here.
    const { POST: POST_EFFECTIVE } = await import(
      '@/app/api/admin/placements/[id]/actions/effective/route'
    );
    const effectiveRes = await POST_EFFECTIVE(
      buildRequest(
        `/api/admin/placements/${createBody.placementId}/actions/effective`,
        {
          body: {
            evidence: {
              clientAcknowledgedAt: new Date().toISOString(),
              clientAcknowledgedByUserId: `${runId}-cb`,
              acknowledgementRef: `${runId}-ref`,
            },
          },
        },
      ),
      routeParams({ id: createBody.placementId }),
    );
    expect(effectiveRes.status).toBe(400);
    const effectiveBody = await effectiveRes.json();
    // C-07 / taxonomy freeze: rejection code is PLACEMENT_VALIDATION_ERROR,
    // NOT the synthetic HRP_EFFECTIVE_FORBIDDEN (which no longer exists).
    expect(effectiveBody.error).toBe('PLACEMENT_VALIDATION_ERROR');
    expect(effectiveBody.error).not.toBe('HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED');

    // DB proof: placement is still CONFIRMED; PlacementCase is unchanged
    // at its original READY_TO_PLACE status — the rejected EFFECTIVE
    // command must NOT mutate the case. Placement status is what the
    // canonical route protects; the case status is a precondition the
    // fixture set, not a side-effect of the rejection.
    const rereadPlacement = await admin.placement.findUnique({
      where: { id: createBody.placementId },
      select: { status: true },
    });
    expect(rereadPlacement?.status).toBe('CONFIRMED');
    const rereadCase = await admin.placementCase.findUnique({
      where: { id: pc.id },
      select: { status: true },
    });
    expect(rereadCase?.status).toBe('READY_TO_PLACE');
  });
});
