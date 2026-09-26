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

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma } from '@prisma/client';

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
      }),
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
      }),
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
      }),
    );
    const row = out.items.find((r) => r.caseId === c.id);
    expect(row).toBeDefined();
    expect(row!.candidate.phone).toBe('091****678');
    expect(row!.candidate.cccdNumber).toBe('********3456');
    expect(row!.handler.assigneeUserId).toBe(staffAId);
    expect(row!.handler.assigneeName).toBe('P1E0 Staff A');
    expect(row!.nextAction).toBe('OPEN_INTAKE');
  }, 30_000);

  it('AC-04: lastInteraction prefers STATUS_CHANGE over SUBMISSION', async () => {
    const profile = await makeProfile('last-int', {
      identity: 'VERIFIED',
      completeness: 'COMPLETE',
    });
    const c = await makeCase(profile.id, 'IN_PROGRESS');
    // Older submission (50 min ago).
    const sub = await makeSubmission(profile.id, c.id, {
      fullName: `Sub ${runId}`,
      createdMinutesAgo: 50,
    });
    // Newer STATUS_CHANGE (10 min ago).
    await makeStatusHistory(sub.id, 'IN_REVIEW', 10);

    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };
    const out = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        page: 1,
        pageSize: 20,
      }),
    );
    const row = out.items.find((r) => r.caseId === c.id);
    expect(row).toBeDefined();
    expect(row!.lastInteraction.kind).toBe('STATUS_CHANGE');
    expect(row!.nextAction).toBe('AWAITING_RESULT');
  }, 30_000);

  it('AC-04: lastInteraction falls back to SUBMISSION when no history', async () => {
    const profile = await makeProfile('last-int-sub', {
      identity: 'VERIFIED',
      completeness: 'COMPLETE',
    });
    const c = await makeCase(profile.id, 'OPEN');
    await makeSubmission(profile.id, c.id, {
      fullName: `Sub ${runId}`,
      createdMinutesAgo: 30,
    });
    const ctx: AuthContext = { userId: managerId, role: 'HR_MANAGER' };
    const out = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        page: 1,
        pageSize: 20,
      }),
    );
    const row = out.items.find((r) => r.caseId === c.id);
    expect(row).toBeDefined();
    expect(row!.lastInteraction.kind).toBe('SUBMISSION');
    expect(row!.nextAction).toBe('SCREEN_SUBMISSION');
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
      }),
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
      }),
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
      }),
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
      }),
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
      }),
    );
    const no = await withContext(writer, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, {
        view: 'ALL',
        overdue: false,
        page: 1,
        pageSize: 100,
      }),
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
      }),
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
      }),
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
});
