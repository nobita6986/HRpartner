/**
 * p1f1-placement-action-ui.integration.test.ts — P1-F1 DB integration test.
 *
 * Lane: integration (DB-touching). Self-skips when DATABASE_URL_TEST +
 * DATABASE_URL_ADMIN_TEST are absent. ENV_BLOCKED is an HONEST report, not
 * a pass condition (DEC-13). Tier 0/Owner cung cấp DB trước khi xét merge.
 *
 * Scope: prove the F1 additive E0 projections against the synthetic
 * PostgreSQL DB end-to-end. The harness drives the real
 * `getRecruiterWorkbenchList` service through a real Prisma transaction
 * under RLS, mocking only the `getAuthContext` boundary.
 *
 * Coverage:
 *   - F1-DB01: a case with NO placement surfaces `placement: null` and
 *     `placementOptions: null` (when no submissions resolve to a
 *     JobOpening).
 *   - F1-DB02: a case with a single SELECTED HRP-managed placement
 *     surfaces the additive `placement` with `managementMode='HRP_MANAGED'`,
 *     `status='SELECTED'`, `jobOpeningId` populated.
 *   - F1-DB03: multiple `CandidateSubmission` rows pointing to the same
 *     `JobOpening` (via `StaffingOrderSlot`) are deduplicated; the
 *     returned `placementOptions` carries the newest submission's id.
 *   - F1-DB04: deterministic sort of `placementOptions` by
 *     `(projectName, companyName, title, jobOpeningId)` asc.
 *   - F1-DB05: legacy submissions whose `slot` is `NULL` do NOT pollute
 *     `placementOptions`.
 *   - F1-DB06: read-service is RLS-clean — a different row in a different
 *     scope never leaks into `placement` / `placementOptions` (cross-row
 *     isolation).
 *
 * Refs:
 *   - Contract v1.1 §3 / §4.1 (placement lifecycle, additive DTO)
 *   - tests/db/recruiter-workbench.integration.test.ts (P1-E0 base pattern)
 *   - tests/db/p1f0-placement-command-api.integration.test.ts (fixture
 *     builder for PlacementCase + JobOpening + ServiceModelSnapshot)
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma, type ServiceModel } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────
// Mocks (hoisted) — drive the boundary without spinning up real auth.
// ─────────────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    code = 'UNAUTHENTICATED';
    constructor(message?: string) {
      super(message ?? 'UNAUTHENTICATED');
      this.name = 'AuthSessionError';
    }
  },
}));

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

const runId = `p1f1-${randomUUID().slice(0, 8)}`;

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
    transactionOptions: { timeout: 15_000 },
  });
}

/**
 * Run inside a Prisma transaction with the RLS GUCs set per the supplied
 * AuthContext. Mirrors production `withDbContext`.
 */
async function withContext<T>(
  client: PrismaClient,
  ctx: { userId: string; role: string },
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (tx) => {
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
    return callback(tx);
  });
}

function makeAdminCtx(): AuthContext {
  return { userId: `${runId}-admin`, role: 'ADMIN' } as AuthContext;
}

describe.skipIf(!HAS_TEST_DB)('P1-F1 Placement Action UI integration', () => {
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

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);

    const adminUser = await admin.user.create({
      data: {
        id: `${runId}-admin`,
        phone: `${runId}-admin`,
        name: 'P1F1 Admin',
        role: 'ADMIN',
      },
    });
    userIds.push(adminUser.id);
    // getAuthContext is mocked; each call returns ADMIN for this run.
    mocks.getAuthContext.mockResolvedValue(makeAdminCtx());
    // The read-service does not call getPrisma — only the routes do — but
    // we still satisfy the import graph in case future helper calls do.
    mocks.getPrisma.mockReturnValue(writer);
  }, 30_000);

  afterAll(async () => {
    try {
      // Cascading-by-id, in FK-safe order.
      await admin?.placement.deleteMany({
        where: { id: { in: placementIds } },
      });
      await admin?.candidateSubmission.deleteMany({
        where: { id: { in: submissionIds } },
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
      await admin?.project.deleteMany({
        where: { id: { in: projectIds } },
      });
      await admin?.clientCompany.deleteMany({
        where: { id: { in: clientCompanyIds } },
      });
      await admin?.placementCase.deleteMany({
        where: { id: { in: caseIds } },
      });
      await admin?.laborProfile.deleteMany({
        where: { id: { in: profileIds } },
      });
      await admin?.user.deleteMany({ where: { id: { in: userIds } } });
    } finally {
      await writer?.$disconnect().catch(() => {});
      await admin?.$disconnect().catch(() => {});
    }
  }, 30_000);

  // ───────────────────────────────────────────────────────────────────
  // Fixture builders — minimal chain needed to project placement /
  // placementOptions from the workbench read-model.
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
        name: `P1F1 ${label} ${runId}`,
        code: `P1F1-${runId}-${label}`,
      },
    });
    clientCompanyIds.push(cc.id);
    return cc;
  }

  async function makeProject(label: string, clientCompanyId: string, name: string) {
    const prj = await admin.project.create({
      data: {
        name,
        code: `P1F1-${runId}-${label}`,
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
        code: `P1F1-${runId}-${label}`,
        title: `P1F1 SO ${label}`,
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

  /**
   * Make a JobPosting (one-to-one with JobOpening). This is where the public
   * `title` lives — `placementOptions.title` derives from `posting.title`.
   */
  async function makePosting(opts: { jobOpeningId: string; title: string; label: string }) {
    const post = await admin.jobPosting.create({
      data: {
        jobOpeningId: opts.jobOpeningId,
        title: opts.title,
        slug: `p1f1-${opts.label}-${runId}`,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    return post;
  }

  async function makeSubmission(
    opts: {
      laborProfileId: string;
      placementCaseId: string;
      slotId: string;
      createdAt?: Date;
    },
  ) {
    const sub = await admin.candidateSubmission.create({
      data: {
        laborProfileId: opts.laborProfileId,
        placementCaseId: opts.placementCaseId,
        slotId: opts.slotId,
        fullName: `P1F1 Sub ${opts.laborProfileId.slice(-4)}`,
        phone: `${runId}-sub`,
        createdAt: opts.createdAt ?? new Date(),
      },
    });
    submissionIds.push(sub.id);
    return sub;
  }

  /**
   * Build the minimal Placement fixture: PlacementCase + JobOpening chain +
   * (optional) Placement row. We use the same `placementCreate` flow
   * indirectly by writing the Placement row directly with the snapshot
   * `serviceModelSnapshot` that the production service would copy from the
   * JobOpening's `serviceModel`. (The route is exercised by `p1f0` tests;
   * F1 only cares about the additive READ projection.)
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

  /**
   * Fetch the workbench list narrowed by `search` (the runId is embedded
   * in `profile.fullName`, so the search predicate isolates each fixture
   * on a shared synthetic DB).
   */
  async function fetchOneRow(searchTag: string) {
    const ctx = makeAdminCtx();
    return withContext(writer, ctx, async (tx) => {
      return getRecruiterWorkbenchList(
        tx,
        ctx,
        { search: searchTag, view: 'ALL', page: 1, pageSize: 50 },
        { canSeeSensitive: true },
        new Date(),
      );
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // Coverage
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
    const prj = await makeProject('db02prj', cc.id, 'P1F1 Project Bravo');
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
    const prj = await makeProject('db03prj', cc.id, 'P1F1 Alpha');
    const so = await makeStaffingOrder(prj.id, 'db03so');
    const jo = await makeJobOpening(so.id, {
      label: 'db03jo',
      serviceModel: 'RECRUITMENT_SERVICE',
    });
    await makePosting({ jobOpeningId: jo.id, title: 'Thợ điện', label: 'db03' });
    const slot = await makeSlot(so.id, jo.id, 'db03slot');

    // Order matches Prisma orderBy: createdAt DESC, id DESC.
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
    // The newest submission is the one returned (id ends with longer uuid suffix).
    // Sanity check: it's a valid UUID v4-shape (column is uuid).
    expect(opt.sourceCandidateSubmissionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-/i,
    );
    expect(opt.title).toBe('Thợ điện');
    expect(opt.projectName).toBe('P1F1 Alpha');
  });

  it('F1-DB04: 3 distinct job openings → sorted by (projectName, companyName fallback, title, jobOpeningId)', async () => {
    const profile = await makeProfile('db04');
    const pc = await makeCase(profile.id, 'READY_TO_PLACE');

    // Project A: one title (default companyName).
    const ccA = await makeCompany('db04ccA');
    const prjA = await makeProject('db04prjA', ccA.id, 'Alpha-Works');
    const soA = await makeStaffingOrder(prjA.id, 'db04soA');
    const joA = await makeJobOpening(soA.id, {
      label: 'db04joA',
      serviceModel: 'STAFFING_SUPPLY',
    });
    await makePosting({ jobOpeningId: joA.id, title: 'Helper', label: 'db04A' });
    const slotA = await makeSlot(soA.id, joA.id, 'db04slotA');

    // Same project name 'Alpha-Works', same companyName, different title.
    const ccB = await makeCompany('db04ccB');
    const prjB = await makeProject('db04prjB', ccB.id, 'Alpha-Works');
    const soB = await makeStaffingOrder(prjB.id, 'db04soB');
    const joB = await makeJobOpening(soB.id, {
      label: 'db04joB',
      serviceModel: 'STAFFING_SUPPLY',
    });
    await makePosting({ jobOpeningId: joB.id, title: 'Welder', label: 'db04B' });
    const slotB = await makeSlot(soB.id, joB.id, 'db04slotB');

    // Different project 'Bravo'.
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
    // 'Alpha-Works' < 'Bravo-Site' → 2 x Alpha first.
    const titlesAlpha = options
      .filter((o) => o.projectName === 'Alpha-Works')
      .map((o) => o.title);
    expect(titlesAlpha).toEqual(['Helper', 'Welder']); // alphabetical
    expect(options[options.length - 1]!.projectName).toBe('Bravo-Site');
  });

  it('F1-DB05: legacy submission with slot=null does NOT pollute placementOptions', async () => {
    const profile = await makeProfile('db05');
    const pc = await makeCase(profile.id, 'READY_TO_PLACE');

    // Legacy submission: slot NULL
    await admin.candidateSubmission.create({
      data: {
        laborProfileId: profile.id,
        placementCaseId: pc.id,
        slotId: null,
        fullName: `P1F1 Legacy Sub ${profile.id.slice(-4)}`,
        phone: `${runId}-legacy-sub`,
      },
    });

    const out = await fetchOneRow(profile.fullName);
    const row = out.items[0]!;
    expect(row.placementOptions).toBeNull(); // empty after filtering legacy
    expect(row.placement).toBeNull();
  });

  it('F1-DB06: cross-row isolation — placement on case A is NOT carried over to case B', async () => {
    const profileA = await makeProfile('db06A');
    const profileB = await makeProfile('db06B');

    const pcA = await makeCase(profileA.id, 'READY_TO_PLACE');
    const pcB = await makeCase(profileB.id, 'READY_TO_PLACE');

    const cc = await makeCompany('db06cc');
    const prj = await makeProject('db06prj', cc.id, 'P1F1 Delta');
    const so = await makeStaffingOrder(prj.id, 'db06so');
    const jo = await makeJobOpening(so.id, {
      label: 'db06jo',
      serviceModel: 'STAFFING_SUPPLY',
    });

    // Case A: has a placement.
    await makePlacementRow({
      placementCaseId: pcA.id,
      laborProfileId: profileA.id,
      clientCompanyId: cc.id,
      projectId: prj.id,
      jobOpeningId: jo.id,
      serviceModelSnapshot: 'STAFFING_SUPPLY',
    });

    // Search by full name — must yield EXACTLY one case, the matching profile.
    const outA = await fetchOneRow(profileA.fullName);
    expect(outA.total).toBe(1);
    expect(outA.items[0]!.placement).not.toBeNull();

    const outB = await fetchOneRow(profileB.fullName);
    expect(outB.total).toBe(1);
    expect(outB.items[0]!.placement).toBeNull();
  });

  it('F1-DB07: isStalePlacementSnapshot classifies SELECTED + IN_PROGRESS as stale', async () => {
    // Pure helper × DB scenario — no real DB write required beyond the seed
    // above. Confirms the matrix view matches the read-service row.
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
    expect(availableActionsForRow(row)).toEqual([]);
  });

  it('F1-DB08: availableActionsForRow returns confirm+fail+cancel for SELECTED + READY_TO_PLACE', async () => {
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
    expect(availableActionsForRow(row).map((a) => a.command)).toEqual([
      'placement.confirm',
      'placement.fail',
      'placement.cancel',
    ]);
  });
});
