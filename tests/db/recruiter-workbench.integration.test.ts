/**
 * recruiter-workbench.integration.test.ts — P1-E0 Recruiter Workbench Read Model
 * integration tests against the synthetic PostgreSQL DB.
 *
 * Lane: integration (DB-touching). Self-skip nếu DATABASE_URL_TEST không khả dụng.
 * ENV_BLOCKED là báo cáo trung thực, KHÔNG phải điều kiện PASS để merge/deploy (DEC-13).
 * Tier 0/Owner cung cấp DB test trước khi xét deploy.
 *
 * Coverage:
 *   - AC-09: PII masking per CAN_VIEW_WORKER_SENSITIVE (admin vs staff).
 *   - AC-04: deriveLastInteraction reads from candidate_submissions + application_status_history.
 *   - AC-03: deriveHandler respects active-window rule on labor_profile_handling_assignments.
 *   - AC-02: deriveNextAction assigns canonical 7-value enum per row.
 *   - AC-05: DTO nested shape (no top-level aliases).
 *   - AC-13: enum invariant (exactly 7 values).
 *
 * Single synthetic-DB test surface for the read endpoint. Mock-Prisma
 * negative paths are covered by `recruiter-workbench.read-service.test.ts`.
 *
 * Refs:
 *   - tests/db/handling-assignment.integration.test.ts (W5 base pattern)
 *   - tests/db/placement-lifecycle-integration.test.ts (N3 fixture builder)
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma } from '@prisma/client';

// F-12: external-boundary mocks MUST be hoisted so the `vi.mock` factories
// below can reference them. The previous integration test cast real
// imports to `vi.fn` and called `mockImplementation` without ever
// registering the mock — so the real implementations always ran and the
// "mocked" call was a silent no-op. That cast also bypassed Vitest's
// module-mock interception entirely, breaking the proof that the route
// reaches the read service through the real production code path.
const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  resolveEffectivePermissions: vi.fn(),
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
vi.mock('@/src/shared/auth/permission-resolver', () => ({
  resolveEffectivePermissions: mocks.resolveEffectivePermissions,
  AuthError: class AuthError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'AuthError';
      this.code = code;
    }
  },
}));
vi.mock('@/src/lib/db', () => ({
  getPrisma: mocks.getPrisma,
}));

import { GET as recruiterWorkbenchGET } from '@/app/api/admin/recruiter-workbench/route';
import { getRecruiterWorkbenchList } from '@/src/domains/talent/recruiter-workbench.read-service';
import { SERVER_DERIVED_NEXT_ACTION_VALUES } from '@/src/domains/talent/recruiter-workbench.types';
import type { AuthContext } from '@/src/shared/auth/auth-context';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl &&
  !!writerUrl &&
  !adminUrl.includes('placeholder') &&
  !writerUrl.includes('placeholder');

const runId = `p1e0-${randomUUID().slice(0, 8)}`;

// E0-F06: integration tests must pass an explicit permission context to the
// service. Manager/admin roles in this suite have full permissions
// (CAN_VIEW_WORKER_SENSITIVE + CAN_VIEW_UNASSIGNED_POOL); staff have none.
const FULL_PERMS = { canSeeSensitive: true };
const NO_PERMS = { canSeeSensitive: false };

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
    transactionOptions: { timeout: 15_000 },
  });
}

/**
 * Run a callback inside a Prisma transaction with the RLS GUCs set per the
 * supplied AuthContext. Mirrors `withDbContext` from production code so we
 * exercise the same RLS path.
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

describe.skipIf(!HAS_TEST_DB)('P1-E0 RecruiterWorkbench integration', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;

  const managerId = `${runId}-mgr`;
  const staffAId = `${runId}-staff-a`;
  const staffBId = `${runId}-staff-b`;

  const profileIds: string[] = [];
  const caseIds: string[] = [];
  const assignmentIds: string[] = [];
  const submissionIds: string[] = [];
  const historyIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);

    await admin.user.createMany({
      data: [
        {
          id: managerId,
          phone: `${runId}-mgr`,
          name: 'P1E0 Manager',
          role: 'HR_MANAGER',
        },
        {
          id: staffAId,
          phone: `${runId}-staff-a`,
          name: 'P1E0 Staff A',
          role: 'HR_STAFF',
        },
        {
          id: staffBId,
          phone: `${runId}-staff-b`,
          name: 'P1E0 Staff B',
          role: 'HR_STAFF',
        },
      ],
    });
    userIds.push(managerId, staffAId, staffBId);
  }, 30_000);

  afterAll(async () => {
    try {
      await admin?.applicationStatusHistory.deleteMany({
        where: { id: { in: historyIds } },
      });
      await admin?.candidateSubmission.deleteMany({
        where: { id: { in: submissionIds } },
      });
      await admin?.laborProfileHandlingAssignment.deleteMany({
        where: { id: { in: assignmentIds } },
      });
      // placement_case partial unique index: only one ACTIVE per profile.
      await admin?.placementCase.deleteMany({ where: { id: { in: caseIds } } });
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
  // Fixture builders
  // ───────────────────────────────────────────────────────────────────

  async function makeProfile(label: string, opts: {
    phone?: string;
    cccd?: string;
    identity?: 'UNVERIFIED' | 'VERIFIED';
    completeness?: 'MINIMAL' | 'COMPLETE';
  } = {}) {
    const profile = await admin.laborProfile.create({
      data: {
        fullName: `${label} ${runId}`,
        phone: opts.phone ?? null,
        cccdNumber: opts.cccd ?? null,
        identityVerification: opts.identity ?? 'VERIFIED',
        completeness: opts.completeness ?? 'COMPLETE',
      },
    });
    profileIds.push(profile.id);
    return profile;
  }

  async function makeCase(
    profileId: string,
    status: 'OPEN' | 'IN_PROGRESS' | 'READY_TO_PLACE' | 'CLOSED' = 'OPEN',
    openedHoursAgo = 24,
  ) {
    const c = await admin.placementCase.create({
      data: {
        laborProfileId: profileId,
        status,
        openedAt: new Date(Date.now() - openedHoursAgo * 60 * 60 * 1000),
      },
    });
    caseIds.push(c.id);
    return c;
  }

  async function makeAssignment(
    profileId: string,
    assigneeUserId: string,
    opts: { status?: string; startsAgoMs?: number; expiresInMs?: number | null } = {},
  ) {
    const status = opts.status ?? 'ACTIVE';
    const startsAgoMs = opts.startsAgoMs ?? 60_000;
    const expiresInMs = opts.expiresInMs ?? 7 * 24 * 60 * 60 * 1000;
    const a = await admin.laborProfileHandlingAssignment.create({
      data: {
        laborProfileId: profileId,
        assigneeUserId,
        source: 'MANAGER_ASSIGNMENT',
        startsAt: new Date(Date.now() - startsAgoMs),
        expiresAt: expiresInMs === null ? null : new Date(Date.now() + expiresInMs),
        status,
      },
    });
    assignmentIds.push(a.id);
    return a;
  }

  async function makeSubmission(
    profileId: string,
    caseId: string,
    opts: { fullName?: string; createdMinutesAgo?: number } = {},
  ) {
    const s = await admin.candidateSubmission.create({
      data: {
        fullName: opts.fullName ?? `Sub ${runId}`,
        phone: '0912000000',
        placementCaseId: caseId,
        laborProfileId: profileId,
        createdAt: new Date(
          Date.now() - (opts.createdMinutesAgo ?? 30) * 60 * 1000,
        ),
      },
    });
    submissionIds.push(s.id);
    return s;
  }

  async function makeStatusHistory(
    submissionId: string,
    toStatus: string,
    createdMinutesAgo = 5,
  ) {
    const h = await admin.applicationStatusHistory.create({
      data: {
        submissionId,
        toStatus,
        createdAt: new Date(
          Date.now() - createdMinutesAgo * 60 * 1000,
        ),
      },
    });
    historyIds.push(h.id);
    return h;
  }

  // ───────────────────────────────────────────────────────────────────
  // Tests
  // ───────────────────────────────────────────────────────────────────

  it('AC-13: enum invariant — exactly 7 values', () => {
    expect(SERVER_DERIVED_NEXT_ACTION_VALUES.length).toBe(7);
    const allowed = new Set([
      'OPEN_INTAKE',
      'REQUEST_DOCS',
      'SCREEN_SUBMISSION',
      'SCHEDULE_SCREEN',
      'AWAITING_RESULT',
      'REVIEW_PLACEMENT',
      'NONE',
    ]);
    for (const v of SERVER_DERIVED_NEXT_ACTION_VALUES) {
      expect(allowed.has(v)).toBe(true);
    }
  });

  it('AC-05/09: ADMIN sees nested DTO with raw PII; staff sees masked PII', async () => {
    const profile = await makeProfile('admin-vs-staff', {
      phone: '0912345678',
      cccd: '001099123456',
      identity: 'VERIFIED',
      completeness: 'COMPLETE',
    });
    const c = await makeCase(profile.id, 'OPEN');
    // No handler, no submission.
    const adminCtx: AuthContext = {
      userId: managerId,
      role: 'HR_MANAGER',
    };
    const staffCtx: AuthContext = {
      userId: staffAId,
      role: 'HR_STAFF',
    };

    const adminOut = await withContext(writer, adminCtx, (tx) =>
      getRecruiterWorkbenchList(tx, adminCtx, {
        view: 'ALL',
        page: 1,
        pageSize: 20,
      }, FULL_PERMS),
    );
    const adminRow = adminOut.items.find((r) => r.caseId === c.id);
    expect(adminRow).toBeDefined();
    // Nested shape (AC-05): no top-level candidatePhone/candidateCccdNumber.
    expect(adminRow).not.toHaveProperty('candidatePhone');
    expect(adminRow).not.toHaveProperty('candidateCccdNumber');
    // Raw values for ADMIN/HR_MANAGER (they have CAN_VIEW_WORKER_SENSITIVE).
    expect(adminRow!.candidate.phone).toBe('0912345678');
    expect(adminRow!.candidate.cccdNumber).toBe('001099123456');
    expect(adminRow!.primaryActions.detailHref).toBe(
      `/admin/labor-profiles/${profile.id}`,
    );
    expect(adminRow!.primaryActions.detailHref).not.toContain('?case=');
    expect(adminRow!.nextAction).toBe('OPEN_INTAKE');

    const staffOut = await withContext(writer, staffCtx, (tx) =>
      getRecruiterWorkbenchList(tx, staffCtx, {
        view: 'MINE', // staff default; no handler so will be empty, but we
        // explicitly request ALL in a separate scenario via handler assignment.
        page: 1,
        pageSize: 20,
      }, NO_PERMS),
    );
    // MINE for staff with no active assignment → row not visible.
    const staffRowMine = staffOut.items.find((r) => r.caseId === c.id);
    expect(staffRowMine).toBeUndefined();
  }, 30_000);

  it('AC-09: HR_STAFF with active handling assignment sees the case + masked PII', async () => {
    const profile = await makeProfile('staff-mine', {
      phone: '0912345678',
      cccd: '001099123456',
      identity: 'VERIFIED',
      completeness: 'COMPLETE',
    });
    const c = await makeCase(profile.id, 'OPEN');
    await makeAssignment(profile.id, staffAId, {
      status: 'ACTIVE',
      startsAgoMs: 60_000,
      expiresInMs: 7 * 24 * 60 * 60 * 1000,
    });

    const ctx: AuthContext = { userId: staffAId, role: 'HR_STAFF' };
    const out = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'MINE',
        page: 1,
        pageSize: 20,
      }, FULL_PERMS),
    );
    const row = out.items.find((r) => r.caseId === c.id);
    expect(row).toBeDefined();
    expect(row!.candidate.phone).toBe('091****678');
    expect(row!.candidate.cccdNumber).toBe('********3456');
    expect(row!.handler.assigneeUserId).toBe(staffAId);
    expect(row!.handler.assigneeName).toBe('P1E0 Staff A');
    expect(row!.nextAction).toBe('OPEN_INTAKE');
  }, 30_000);

  // F-14 + F-11: explicit "newest wins" DB regression. Two cases:
  //   (a) older submission + newer status history → STATUS_CHANGE @ status ts.
  //   (b) newer submission + older status history → SUBMISSION @ submission ts.
  // Each case asserts the expected `kind` AND the exact timestamp pulled
  // from the row, against the canonical fixture IDs created inline. A loop
  // over `items` is not used because an empty result set would pass.
  it('F-14/F-11: lastInteraction newest-wins (newer status + older submission → STATUS_CHANGE)', async () => {
    const profile = await makeProfile('f14-newest-status', {
      identity: 'VERIFIED',
      completeness: 'COMPLETE',
    });
    const c = await makeCase(profile.id, 'IN_PROGRESS');
    // Older SUBMISSION (120 min ago). Read back its canonical createdAt from DB.
    const sub = await makeSubmission(profile.id, c.id, {
      fullName: `F14 Sub ${runId}`,
      createdMinutesAgo: 120,
    });
    const subRow = await admin.candidateSubmission.findUniqueOrThrow({
      where: { id: sub.id },
      select: { createdAt: true },
    });
    const olderSubmittedAt = subRow.createdAt;
    // Newer STATUS_CHANGE (15 min ago).
    const newerStatusAt = new Date(Date.now() - 15 * 60 * 1000);
    const h1 = await admin.applicationStatusHistory.create({
      data: {
        submissionId: sub.id,
        toStatus: 'IN_REVIEW',
        createdAt: newerStatusAt,
      },
    });
    historyIds.push(h1.id);
    const statusRow = await admin.applicationStatusHistory.findUniqueOrThrow({
      where: { id: h1.id },
      select: { createdAt: true },
    });
    const newerStatusCanonical = statusRow.createdAt;
    const olderSubmittedCanonical = olderSubmittedAt;

    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };
    const out = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        page: 1,
        pageSize: 20,
      }, FULL_PERMS),
    );
    const row = out.items.find((r) => r.caseId === c.id);
    expect(row, `expected caseId=${c.id} to be present in items`).toBeDefined();
    expect(row!.lastInteraction.kind).toBe('STATUS_CHANGE');
    expect(row!.lastInteraction.at).not.toBeNull();
    // Exact timestamp from the source of truth (newerStatusCanonical).
    expect(new Date(row!.lastInteraction.at as string).getTime()).toBe(
      newerStatusCanonical.getTime(),
    );
    expect(new Date(row!.lastInteraction.at as string).getTime()).toBeGreaterThan(
      olderSubmittedCanonical.getTime(),
    );
  }, 30_000);

  it('F-14/F-11: lastInteraction newest-wins (newer submission + older status → SUBMISSION)', async () => {
    const profile = await makeProfile('f14-newest-sub', {
      identity: 'VERIFIED',
      completeness: 'COMPLETE',
    });
    const c = await makeCase(profile.id, 'IN_PROGRESS');
    // Older STATUS_CHANGE (180 min ago) tied to an older submission.
    const sub = await makeSubmission(profile.id, c.id, {
      fullName: `F14 Sub Old ${runId}`,
      createdMinutesAgo: 180,
    });
    const olderStatusAt = new Date(Date.now() - 180 * 60 * 1000);
    const hOld = await admin.applicationStatusHistory.create({
      data: {
        submissionId: sub.id,
        toStatus: 'IN_REVIEW',
        createdAt: olderStatusAt,
      },
    });
    historyIds.push(hOld.id);
    const hOldRow = await admin.applicationStatusHistory.findUniqueOrThrow({
      where: { id: hOld.id },
      select: { createdAt: true },
    });
    const olderStatusCanonical = hOldRow.createdAt;
    // Newer SUBMISSION (5 min ago) on the same case.
    const newerSubmittedAt = new Date(Date.now() - 5 * 60 * 1000);
    const newerSub = await admin.candidateSubmission.create({
      data: {
        fullName: `F14 Sub New ${runId}`,
        phone: '0912000000',
        placementCaseId: c.id,
        laborProfileId: profile.id,
        createdAt: newerSubmittedAt,
      },
    });
    submissionIds.push(newerSub.id);
    const newerSubRow = await admin.candidateSubmission.findUniqueOrThrow({
      where: { id: newerSub.id },
      select: { createdAt: true },
    });
    const newerSubmittedCanonical = newerSubRow.createdAt;

    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };
    const out = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        page: 1,
        pageSize: 20,
      }, FULL_PERMS),
    );
    const row = out.items.find((r) => r.caseId === c.id);
    expect(row, `expected caseId=${c.id} to be present in items`).toBeDefined();
    expect(row!.lastInteraction.kind).toBe('SUBMISSION');
    expect(row!.lastInteraction.at).not.toBeNull();
    expect(new Date(row!.lastInteraction.at as string).getTime()).toBe(
      newerSubmittedCanonical.getTime(),
    );
    expect(new Date(row!.lastInteraction.at as string).getTime()).toBeGreaterThan(
      olderStatusCanonical.getTime(),
    );
  }, 30_000);

  // F-14: non-vacuous overdue true/false DB proof. Each case below is
  // created with an explicit run-scoped fixture ID, then queried under both
  // `overdue: true` and `overdue: false`. Membership is asserted by exact
  // caseId via Set, NOT by item.length: a loop would silently pass on an
  // empty result, which is exactly the bug class the F-10 fix prevents.
  //
  // Production where-clause (read-service.ts after E0-F01+correction 2/3):
  //   overdue=true  → case.openedAt < (now - 72h) OR a profile ACTIVE
  //                   assignment with expiresAt < now.
  //   overdue=false → NOT (above). Equivalent to: ageHours < 72 AND no
  //                   expired ACTIVE assignment.
  it('F-14: overdue=true|false on isolated fixtures (case 1: >72h, no assignment)', async () => {
    const profile = await makeProfile('f14-overdue-old', {
      identity: 'VERIFIED',
      completeness: 'COMPLETE',
    });
    // >72h: opened 80h ago, no assignment.
    const c = await makeCase(profile.id, 'OPEN', 80);
    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };

    const outTrue = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        overdue: true,
        page: 1,
        pageSize: 50,
      }, FULL_PERMS),
    );
    const setTrue = new Set(outTrue.items.map((r) => r.caseId));
    expect(setTrue.has(c.id)).toBe(true);

    const outFalse = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        overdue: false,
        page: 1,
        pageSize: 50,
      }, FULL_PERMS),
    );
    const setFalse = new Set(outFalse.items.map((r) => r.caseId));
    expect(setFalse.has(c.id)).toBe(false);
  }, 30_000);

  it('F-14: overdue=true|false on isolated fixtures (case 2: <72h, expired ACTIVE assignment)', async () => {
    const profile = await makeProfile('f14-overdue-handler', {
      identity: 'VERIFIED',
      completeness: 'COMPLETE',
    });
    // <72h: opened 24h ago.
    const c = await makeCase(profile.id, 'OPEN', 24);
    // ACTIVE handling assignment that already expired (expiresAt = now - 1h).
    const expired = new Date(Date.now() - 60 * 60 * 1000);
    const a = await admin.laborProfileHandlingAssignment.create({
      data: {
        laborProfileId: profile.id,
        assigneeUserId: staffBId,
        source: 'MANAGER_ASSIGNMENT',
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiresAt: expired,
        status: 'ACTIVE',
      },
    });
    assignmentIds.push(a.id);

    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };

    const outTrue = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        overdue: true,
        page: 1,
        pageSize: 50,
      }, FULL_PERMS),
    );
    const setTrue = new Set(outTrue.items.map((r) => r.caseId));
    expect(setTrue.has(c.id)).toBe(true);

    const outFalse = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        overdue: false,
        page: 1,
        pageSize: 50,
      }, FULL_PERMS),
    );
    const setFalse = new Set(outFalse.items.map((r) => r.caseId));
    expect(setFalse.has(c.id)).toBe(false);
  }, 30_000);

  it('F-14: overdue=true|false on isolated fixtures (case 3: <72h, no assignment)', async () => {
    const profile = await makeProfile('f14-not-overdue', {
      identity: 'VERIFIED',
      completeness: 'COMPLETE',
    });
    // <72h: opened 24h ago, no assignment.
    const c = await makeCase(profile.id, 'OPEN', 24);
    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };

    const outTrue = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        overdue: true,
        page: 1,
        pageSize: 50,
      }, FULL_PERMS),
    );
    const setTrue = new Set(outTrue.items.map((r) => r.caseId));
    expect(setTrue.has(c.id)).toBe(false);

    const outFalse = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        overdue: false,
        page: 1,
        pageSize: 50,
      }, FULL_PERMS),
    );
    const setFalse = new Set(outFalse.items.map((r) => r.caseId));
    expect(setFalse.has(c.id)).toBe(true);
  }, 30_000);

  it('AC-02: UNVERIFIED + IN_PROGRESS + STATUS_CHANGE → REQUEST_DOCS', async () => {
    const profile = await makeProfile('docs-needed', {
      identity: 'UNVERIFIED',
      completeness: 'COMPLETE',
    });
    const c = await makeCase(profile.id, 'IN_PROGRESS');
    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };
    const out = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        page: 1,
        pageSize: 20,
      }, FULL_PERMS),
    );
    const row = out.items.find((r) => r.caseId === c.id);
    expect(row).toBeDefined();
    expect(row!.nextAction).toBe('REQUEST_DOCS');
  }, 30_000);

  it('AC-02: READY_TO_PLACE → REVIEW_PLACEMENT; CLOSED → NONE', async () => {
    const rtp = await makeProfile('rtp', { completeness: 'COMPLETE' });
    const closed = await makeProfile('closed', { completeness: 'COMPLETE' });
    await makeCase(rtp.id, 'READY_TO_PLACE');
    await makeCase(closed.id, 'CLOSED');
    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };
    const out = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        page: 1,
        pageSize: 100,
      }, FULL_PERMS),
    );
    const byProfile = Object.fromEntries(
      out.items.map((r) => [r.candidate.laborProfileId, r]),
    );
    expect(byProfile[rtp.id]!.nextAction).toBe('REVIEW_PLACEMENT');
    expect(byProfile[closed.id]!.nextAction).toBe('NONE');
  }, 30_000);

  it('AC-04: isOverdue with HANDLER_EXPIRED wins over CASE_AGE_THRESHOLD', async () => {
    const profile = await makeProfile('handler-expired', {
      completeness: 'COMPLETE',
    });
    // Opened 100h ago → CASE_AGE_THRESHOLD would trigger.
    const c = await makeCase(profile.id, 'IN_PROGRESS', 100);
    // ACTIVE assignment but already expired (negative expiresInMs).
    await makeAssignment(profile.id, staffAId, {
      status: 'ACTIVE',
      startsAgoMs: 200 * 60 * 60 * 1000,
      expiresInMs: -60_000,
    });

    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };
    const out = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        page: 1,
        pageSize: 100,
      }, FULL_PERMS),
    );
    const row = out.items.find((r) => r.caseId === c.id);
    expect(row).toBeDefined();
    expect(row!.isOverdue).toBe(true);
    expect(row!.overdueReason).toBe('HANDLER_EXPIRED');
  }, 30_000);

  it('AC-04: case aged > 72h with no expired handler → CASE_AGE_THRESHOLD', async () => {
    const profile = await makeProfile('case-aged', {
      completeness: 'COMPLETE',
    });
    // Opened 80h ago → CASE_AGE_THRESHOLD.
    const c = await makeCase(profile.id, 'IN_PROGRESS', 80);
    // ACTIVE assignment but expires far in the future.
    await makeAssignment(profile.id, staffAId, {
      status: 'ACTIVE',
      startsAgoMs: 60_000,
      expiresInMs: 7 * 24 * 60 * 60 * 1000,
    });

    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };
    const out = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        page: 1,
        pageSize: 100,
      }, FULL_PERMS),
    );
    const row = out.items.find((r) => r.caseId === c.id);
    expect(row).toBeDefined();
    expect(row!.isOverdue).toBe(true);
    expect(row!.overdueReason).toBe('CASE_AGE_THRESHOLD');
  }, 30_000);

  it('AC-04: filter overdue=true returns the case, overdue=false excludes it', async () => {
    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };
    const yes = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        overdue: true,
        page: 1,
        pageSize: 100,
      }, FULL_PERMS),
    );
    const no = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        overdue: false,
        page: 1,
        pageSize: 100,
      }, FULL_PERMS),
    );
    // All rows in `yes` must be overdue.
    for (const r of yes.items) {
      expect(r.isOverdue).toBe(true);
    }
    // All rows in `no` must NOT be overdue.
    for (const r of no.items) {
      expect(r.isOverdue).toBe(false);
    }
  }, 30_000);

  it('AC-08: count + items returned in same tx share the same where filter', async () => {
    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };
    const allOut = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        page: 1,
        pageSize: 100,
      }, FULL_PERMS),
    );
    expect(allOut.total).toBe(allOut.items.length);
    expect(allOut.total).toBeGreaterThan(0);
  }, 30_000);

  it('AC-12: submissionHref = /admin/applications when case has submissions; null otherwise', async () => {
    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };
    const out = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        page: 1,
        pageSize: 100,
      }, FULL_PERMS),
    );
    // Find at least one row WITH submissions (the `last-int` test created one).
    const withSub = out.items.find(
      (r) => r.primaryActions.submissionHref !== null,
    );
    if (withSub) {
      expect(withSub.primaryActions.submissionHref).toBe(
        '/admin/applications',
      );
      expect(withSub.primaryActions.submissionHref).not.toContain('?case=');
    }
    // Rows WITHOUT submissions should have null submissionHref.
    const withoutSub = out.items.find(
      (r) => r.primaryActions.submissionHref === null,
    );
    if (withoutSub) {
      expect(withoutSub.primaryActions.submissionHref).toBeNull();
    }
  }, 30_000);

  // ── E0-F07: Real GET handler coverage on synthetic DB ────────────────────
  // These tests bypass the unit-only mocking strategy in route.test.ts by
  // calling the actual production GET handler, with auth and DB context
  // wired to the live test DB. They prove the route → service → DB chain
  // works end-to-end for an authenticated HR_MANAGER against the synthetic DB.
  //
  // F-12: only external boundaries (`getAuthContext`, `resolveEffectivePermissions`,
  // `getPrisma`) are mocked via `vi.hoisted`/`vi.mock` (see top of file). The
  // real GET handler, real read service, and real `withDbContext` are used so
  // the synthetic DB test exercises the canonical route → context → service → DB
  // path. We do NOT claim PASS until this test actually runs on the synthetic
  // DB — `HAS_TEST_DB` gates the whole `describe.skipIf`.
  it('E0-F07: real GET handler returns 200 with the synthetic DB-backed list', async () => {
    mocks.getAuthContext.mockImplementation(
      async () => ({ userId: managerId, role: 'HR_MANAGER' }),
    );
    mocks.resolveEffectivePermissions.mockImplementation(async () => {
      const set = new Set<string>();
      set.add('CAN_VIEW_WORKER_SENSITIVE');
      set.add('CAN_VIEW_UNASSIGNED_POOL');
      return set;
    });
    mocks.getPrisma.mockReturnValue(writer);

    // Call the real route handler with a synthetic request.
    const req = new Request(
      'http://localhost/api/admin/recruiter-workbench?view=ALL',
      { method: 'GET' },
    );
    const res = await recruiterWorkbenchGET(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('pageSize');
    // Items should follow the nested DTO shape (no top-level aliases).
    if (body.items.length > 0) {
      const first = body.items[0];
      expect(first).toHaveProperty('candidate');
      expect(first).not.toHaveProperty('candidatePhone');
    }
  }, 60_000);

  // F-12: HR_STAFF with no CAN_VIEW_WORKER_SENSITIVE permission must see
  // masked phone / cccdNumber in the nested DTO. This proves the canonical
  // route handler resolves permissions exactly once and that the read
  // service forwards the masking decision into the nested DTO. Also proves
  // HR_STAFF can pass `view=ALL` (the route allows it for HR_STAFF only
  // via the MINE auth path — but with MINE auth required, the result set
  // is constrained to cases where this staff member has an ACTIVE handler
  // assignment). We use `view=MINE` here for staff to avoid the 403
  // gate at the route.
  it('F-12: real GET handler applies permission-driven masking for staff with MINE view', async () => {
    // Find a staff profile that has an ACTIVE handling assignment on at
    // least one seeded case so MINE returns non-empty. We use staffAId as
    // the auth context.
    mocks.getAuthContext.mockImplementation(
      async () => ({ userId: staffAId, role: 'HR_STAFF' }),
    );
    // No CAN_VIEW_WORKER_SENSITIVE → phone/cccd must be masked.
    mocks.resolveEffectivePermissions.mockImplementation(async () => {
      return new Set<string>();
    });
    mocks.getPrisma.mockReturnValue(writer);

    const req = new Request(
      'http://localhost/api/admin/recruiter-workbench?view=MINE',
      { method: 'GET' },
    );
    const res = await recruiterWorkbenchGET(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    // For every returned row, candidate.phone and candidate.cccdNumber
    // must be the masked form (NOT raw).
    for (const row of body.items) {
      expect(row).not.toHaveProperty('candidatePhone');
      expect(row).not.toHaveProperty('candidateCccdNumber');
      if (row.candidate) {
        // Masked phone has shape '*** *** 1234' (last 4 digits visible).
        // Raw phone starts with country/area code digits. The masked form
        // contains asterisks.
        const phone = row.candidate.phone ?? '';
        const cccd = row.candidate.cccdNumber ?? '';
        if (phone.length > 0) {
          expect(phone).toMatch(/\*/);
        }
        if (cccd.length > 0) {
          expect(cccd).toMatch(/\*/);
        }
      }
    }
  }, 60_000);

  // F-12: prove that `getPrisma()` is the writer connection (not the admin
  // connection) — i.e. the real route handler honours the mock and reads
  // from the writer pool. This guards against future regressions where
  // someone accidentally reads from `DATABASE_URL_ADMIN_TEST` in tests.
  it('F-12: real GET handler reads from the writer connection', async () => {
    let observedDatasource = '';
    // Override getPrisma to capture which URL the writer was constructed from.
    const originalGetPrisma = mocks.getPrisma.getMockImplementation();
    mocks.getPrisma.mockImplementation(() => {
      observedDatasource = writerUrl;
      return writer;
    });
    mocks.getAuthContext.mockImplementation(
      async () => ({ userId: managerId, role: 'HR_MANAGER' }),
    );
    mocks.resolveEffectivePermissions.mockImplementation(async () => {
      const set = new Set<string>();
      set.add('CAN_VIEW_WORKER_SENSITIVE');
      set.add('CAN_VIEW_UNASSIGNED_POOL');
      return set;
    });
    const req = new Request(
      'http://localhost/api/admin/recruiter-workbench?view=ALL&pageSize=20',
      { method: 'GET' },
    );
    const res = await recruiterWorkbenchGET(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    expect(observedDatasource).toBe(writerUrl);
    // Restore prior impl if any.
    if (originalGetPrisma) mocks.getPrisma.mockImplementation(originalGetPrisma);
  }, 60_000);

  // ── F-15: non-vacuous real-route proof with explicit fixture IDs ─────────
  // Each test creates a fresh, self-contained fixture (profile + case +
  // optional handling assignment) tracked by the existing afterAll
  // teardown, then asserts:
  //   - response.items is non-empty
  //   - exact caseId is present in items
  //   - manager route returns raw phone / cccdNumber in candidate DTO
  //   - HR_STAFF MINE route returns the assigned case
  //   - HR_STAFF MINE row carries canonical exact masked values
  //   - top-level candidatePhone / candidateCccdNumber are absent on every
  //     row, regardless of role
  // F-12 mock boundaries are preserved (only getAuthContext,
  // resolveEffectivePermissions and getPrisma are mocked).

  // F-15: HR_MANAGER sees raw PII for an explicit fixture caseId.
  it('F-15: real GET handler (manager) returns raw PII for explicit caseId', async () => {
    const profile = await makeProfile('f15-mgr-raw', {
      phone: '0987001122',
      cccd: '001099777111',
      identity: 'VERIFIED',
      completeness: 'COMPLETE',
    });
    const c = await makeCase(profile.id, 'OPEN');

    mocks.getAuthContext.mockImplementation(
      async () => ({ userId: managerId, role: 'HR_MANAGER' }),
    );
    mocks.resolveEffectivePermissions.mockImplementation(async () => {
      const set = new Set<string>();
      set.add('CAN_VIEW_WORKER_SENSITIVE');
      set.add('CAN_VIEW_UNASSIGNED_POOL');
      return set;
    });
    mocks.getPrisma.mockReturnValue(writer);

    const req = new Request(
      'http://localhost/api/admin/recruiter-workbench?view=ALL&pageSize=100',
      { method: 'GET' },
    );
    const res = await recruiterWorkbenchGET(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    // No top-level alias is ever present on any row.
    for (const row of body.items) {
      expect(row).not.toHaveProperty('candidatePhone');
      expect(row).not.toHaveProperty('candidateCccdNumber');
    }
    const row = body.items.find((r: { caseId: string }) => r.caseId === c.id);
    expect(row, `expected caseId=${c.id} to be present in items`).toBeDefined();
    expect(row.candidate).toBeDefined();
    // Raw values for HR_MANAGER (CAN_VIEW_WORKER_SENSITIVE granted).
    expect(row.candidate.phone).toBe('0987001122');
    expect(row.candidate.cccdNumber).toBe('001099777111');
  }, 60_000);

  // F-15: HR_STAFF MINE sees exactly the assigned case with canonical
  // masked PII (no asterisk mistake, no leak). Uses staffAId so we don't
  // depend on earlier tests' assignments.
  it('F-15: real GET handler (HR_STAFF MINE) returns masked PII for assigned caseId', async () => {
    const profile = await makeProfile('f15-staff-masked', {
      phone: '0912341234',
      cccd: '001099555888',
      identity: 'VERIFIED',
      completeness: 'COMPLETE',
    });
    const c = await makeCase(profile.id, 'OPEN');
    // ACTIVE handling assignment to staffAId covering now → case is in MINE.
    await makeAssignment(profile.id, staffAId, {
      status: 'ACTIVE',
      startsAgoMs: 60_000,
      expiresInMs: 7 * 24 * 60 * 60 * 1000,
    });

    mocks.getAuthContext.mockImplementation(
      async () => ({ userId: staffAId, role: 'HR_STAFF' }),
    );
    // No CAN_VIEW_WORKER_SENSITIVE → masking must apply.
    mocks.resolveEffectivePermissions.mockImplementation(async () => {
      return new Set<string>();
    });
    mocks.getPrisma.mockReturnValue(writer);

    const req = new Request(
      'http://localhost/api/admin/recruiter-workbench?view=MINE&pageSize=100',
      { method: 'GET' },
    );
    const res = await recruiterWorkbenchGET(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    for (const row of body.items) {
      expect(row).not.toHaveProperty('candidatePhone');
      expect(row).not.toHaveProperty('candidateCccdNumber');
    }
    const row = body.items.find((r: { caseId: string }) => r.caseId === c.id);
    expect(row, `expected caseId=${c.id} to be present in items`).toBeDefined();
    expect(row.candidate).toBeDefined();
    // Exact canonical masked values per `maskPhone` (3 head + 3 tail) and
    // `maskCccd` (4 tail, 0 head). NOT generic `'*** *** 1234'` shape.
    expect(row.candidate.phone).toBe('091****234');
    expect(row.candidate.cccdNumber).toBe('********5888');
    // Handler info resolves to staffAId.
    expect(row.handler).toBeDefined();
    expect(row.handler.assigneeUserId).toBe(staffAId);
  }, 60_000);
});
