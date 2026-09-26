/**
 * recruiter-workbench.read-service.test.ts — read service with mock Prisma.
 *
 * Targets:
 *   - AC-05: nested DTO shape (no top-level aliases).
 *   - AC-06: filter pipeline (caseStatus, view, overdue, handlerUserId, search).
 *   - AC-07: sort + page semantics with deterministic tie-break.
 *   - AC-08: count + findMany in same tx (query consistency).
 *   - AC-09: PII masking per CAN_VIEW_WORKER_SENSITIVE (matrix).
 *   - AC-10: deriveHandler / deriveLastInteraction / computeAge applied.
 *   - AC-12: detailHref = /admin/labor-profiles/<id> (no ?case=).
 *
 * NOTE: We pin `now` via the service's `nowOverride` parameter so tests are
 * independent of wall-clock time.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';

import {
  buildOrderBy,
  buildPlacementCaseWhere,
  getRecruiterWorkbenchList,
} from '@/src/domains/talent/recruiter-workbench.read-service';
import type { RecruiterWorkbenchFilter } from '@/src/domains/talent/recruiter-workbench.types';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import * as permResolver from '@/src/shared/auth/permission-resolver';

vi.mock('@/src/shared/auth/permission-resolver', () => {
  return {
    resolveEffectivePermissions: vi.fn(),
    AuthError: class extends Error {
      constructor(public code: string, message: string) {
        super(message);
        this.name = 'AuthError';
      }
    },
  };
});

const NOW = new Date('2026-09-26T10:00:00.000Z');

function makeAdminCtx(): AuthContext {
  return { userId: 'admin-1', role: 'ADMIN' } as AuthContext;
}
function makeManagerCtx(): AuthContext {
  return { userId: 'mgr-1', role: 'HR_MANAGER' } as AuthContext;
}
function makeStaffCtx(userId = 'staff-1'): AuthContext {
  return { userId, role: 'HR_STAFF' } as AuthContext;
}

function setPerms(perms: string[]): void {
  vi.mocked(permResolver.resolveEffectivePermissions).mockImplementation(
    async () => new Set(perms),
  );
}

function makeProfileRow(
  overrides: {
    id?: string;
    fullName?: string | null;
    phone?: string | null;
    cccdNumber?: string | null;
    identityVerification?: string;
    completeness?: string;
    handlingAssignments?: Array<{
      id: string;
      status: string;
      startsAt: Date;
      expiresAt: Date | null;
      assigneeUserId: string;
      source: string;
      createdAt: Date;
      assigneeUser?: { name: string | null } | null;
    }>;
  } = {},
) {
  const has = (k: string): boolean =>
    Object.prototype.hasOwnProperty.call(overrides, k);
  return {
    id: overrides.id ?? 'lp-1',
    fullName: has('fullName') ? overrides.fullName : 'Trần Văn A',
    phone: has('phone') ? overrides.phone : '0912345678',
    cccdNumber: has('cccdNumber') ? overrides.cccdNumber : '001099123456',
    identityVerification: overrides.identityVerification ?? 'VERIFIED',
    completeness: overrides.completeness ?? 'COMPLETE',
    handlingAssignments: overrides.handlingAssignments ?? [],
  };
}

function makeCaseRow(
  overrides: {
    id?: string;
    status?: 'OPEN' | 'IN_PROGRESS' | 'READY_TO_PLACE' | 'CLOSED';
    openedAt?: Date;
    closedAt?: Date | null;
    laborProfile?: ReturnType<typeof makeProfileRow>;
    submissions?: Array<{ id: string; createdAt: Date }>;
  } = {},
) {
  return {
    id: overrides.id ?? 'case-1',
    status: overrides.status ?? 'OPEN',
    openedAt:
      overrides.openedAt ?? new Date(NOW.getTime() - 24 * 60 * 60 * 1000),
    closedAt: overrides.closedAt ?? null,
    laborProfile: overrides.laborProfile ?? makeProfileRow(),
    submissions: overrides.submissions ?? [],
  };
}

function makeTx(opts: {
  cases?: ReturnType<typeof makeCaseRow>[];
  total?: number;
  statusHistory?: Array<{
    id: string;
    submissionId: string;
    createdAt: Date;
  }>;
}): Prisma.TransactionClient {
  const cases = opts.cases ?? [];
  const statusHistory = opts.statusHistory ?? [];
  return {
    placementCase: {
      count: vi.fn().mockResolvedValue(opts.total ?? cases.length),
      findMany: vi.fn().mockResolvedValue(cases),
    },
    applicationStatusHistory: {
      findMany: vi.fn().mockResolvedValue(statusHistory),
    },
  } as unknown as Prisma.TransactionClient;
}

const baseFilter: RecruiterWorkbenchFilter = {
  view: 'ALL',
  page: 1,
  pageSize: 20,
};

// Helper: list with NOW pinned
async function listWith(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  filter: RecruiterWorkbenchFilter,
) {
  return getRecruiterWorkbenchList(tx, ctx, filter, NOW);
}

// ═══════════════════════════════════════════════════════════════════════════
// buildPlacementCaseWhere
// ═══════════════════════════════════════════════════════════════════════════

describe('buildPlacementCaseWhere', () => {
  it('MINE view joins laborProfile.handlingAssignments with assigneeUserId = ctx.userId', () => {
    const ctx = makeStaffCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'MINE' },
      ctx,
      NOW,
    );
    expect(where.laborProfile).toMatchObject({
      handlingAssignments: {
        some: {
          assigneeUserId: 'staff-1',
          status: 'ACTIVE',
          startsAt: { lte: NOW },
          OR: [{ expiresAt: null }, { expiresAt: { gt: NOW } }],
        },
      },
    });
  });

  it('UNASSIGNED view filters to laborProfile with no active handling assignments', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'UNASSIGNED' },
      ctx,
      NOW,
    );
    expect(where.laborProfile).toMatchObject({
      handlingAssignments: { none: { status: 'ACTIVE' } },
    });
  });

  it('ALL view produces no laborProfile filter', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'ALL' },
      ctx,
      NOW,
    );
    expect(where.laborProfile).toBeUndefined();
    expect(where.status).toBeUndefined();
  });

  it('caseStatus filter sets status', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, caseStatus: 'IN_PROGRESS' },
      ctx,
      NOW,
    );
    expect(where.status).toBe('IN_PROGRESS');
  });

  it('handlerUserId filter joins active assignments with given userId', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, handlerUserId: 'u-42' },
      ctx,
      NOW,
    );
    expect(where.laborProfile).toMatchObject({
      handlingAssignments: {
        some: { assigneeUserId: 'u-42', status: 'ACTIVE' },
      },
    });
  });

  it('search filter applies fullName contains (no-oracle)', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, search: 'Tran' },
      ctx,
      NOW,
    );
    expect(where.laborProfile).toMatchObject({
      fullName: { contains: 'Tran', mode: 'insensitive' },
    });
  });

  it('overdue=true builds openedAt OR active expired assignment', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, overdue: true },
      ctx,
      NOW,
    );
    expect(where.OR).toBeDefined();
    expect(Array.isArray(where.OR)).toBe(true);
    expect(where.OR!.length).toBe(2);
    const firstBranch = where.OR![0] as { openedAt: { lt: Date } };
    expect(firstBranch.openedAt.lt).toBeInstanceOf(Date);
  });

  it('overdue=false builds openedAt gte 72h AND no expired active handler', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, overdue: false },
      ctx,
      NOW,
    );
    expect(where.openedAt).toBeDefined();
    expect(where.laborProfile).toMatchObject({
      handlingAssignments: {
        none: { status: 'ACTIVE', expiresAt: { lt: NOW } },
      },
    });
  });

  it('handlerUserId + MINE compose correctly (handlerUserId wins)', () => {
    const ctx = makeStaffCtx('staff-7');
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'MINE', handlerUserId: 'staff-99' },
      ctx,
      NOW,
    );
    const lp = where.laborProfile as {
      handlingAssignments: { some: { assigneeUserId: string } };
    };
    expect(lp.handlingAssignments.some.assigneeUserId).toBe('staff-99');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// buildOrderBy
// ═══════════════════════════════════════════════════════════════════════════

describe('buildOrderBy', () => {
  it('default + ageDesc + openedDesc → openedAt DESC, id DESC', () => {
    expect(buildOrderBy(undefined)).toEqual([
      { openedAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(buildOrderBy('ageDesc')).toEqual([
      { openedAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(buildOrderBy('openedDesc')).toEqual([
      { openedAt: 'desc' },
      { id: 'desc' },
    ]);
  });

  it('ageAsc + openedAsc → openedAt ASC, id DESC tie-break', () => {
    expect(buildOrderBy('ageAsc')).toEqual([
      { openedAt: 'asc' },
      { id: 'desc' },
    ]);
    expect(buildOrderBy('openedAsc')).toEqual([
      { openedAt: 'asc' },
      { id: 'desc' },
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getRecruiterWorkbenchList
// ═══════════════════════════════════════════════════════════════════════════

describe('getRecruiterWorkbenchList', () => {
  beforeEach(() => {
    setPerms([]); // default: no sensitive
  });

  it('returns empty list when DB has no cases', async () => {
    const tx = makeTx({ cases: [], total: 0 });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.items).toEqual([]);
    expect(out.total).toBe(0);
    expect(out.page).toBe(1);
    expect(out.pageSize).toBe(20);
  });

  it('AC-05: emits nested DTO shape (no top-level aliases)', async () => {
    const c = makeCaseRow({ id: 'c1' });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.items[0]).not.toHaveProperty('candidatePhone');
    expect(out.items[0]).not.toHaveProperty('candidateCccdNumber');
    expect(out.items[0]).toHaveProperty('candidate.laborProfileId');
    expect(out.items[0]).toHaveProperty('candidate.fullName');
    expect(out.items[0]).toHaveProperty('candidate.phone');
    expect(out.items[0]).toHaveProperty('candidate.cccdNumber');
  });

  it('AC-09: masks phone & cccd when caller lacks CAN_VIEW_WORKER_SENSITIVE', async () => {
    setPerms([]);
    const c = makeCaseRow({
      id: 'c1',
      laborProfile: makeProfileRow({
        phone: '0912345678',
        cccdNumber: '001099123456',
      }),
    });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeStaffCtx(), { ...baseFilter });
    expect(out.items[0]!.candidate.phone).toBe('091****678');
    expect(out.items[0]!.candidate.cccdNumber).toBe('********3456');
  });

  it('AC-09: shows raw phone & cccd when caller has CAN_VIEW_WORKER_SENSITIVE', async () => {
    setPerms(['CAN_VIEW_WORKER_SENSITIVE']);
    const c = makeCaseRow({
      id: 'c1',
      laborProfile: makeProfileRow({
        phone: '0912345678',
        cccdNumber: '001099123456',
      }),
    });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeManagerCtx(), { ...baseFilter });
    expect(out.items[0]!.candidate.phone).toBe('0912345678');
    expect(out.items[0]!.candidate.cccdNumber).toBe('001099123456');
  });

  it('AC-09: leaves phone/cccd null when DB has null (no fake masking)', async () => {
    setPerms([]);
    const c = makeCaseRow({
      laborProfile: makeProfileRow({ phone: null, cccdNumber: null }),
    });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeStaffCtx(), { ...baseFilter });
    expect(out.items[0]!.candidate.phone).toBeNull();
    expect(out.items[0]!.candidate.cccdNumber).toBeNull();
  });

  it('AC-10: deriveHandler picks the active handler per deterministic order', async () => {
    const c = makeCaseRow({
      laborProfile: makeProfileRow({
        handlingAssignments: [
          {
            id: 'ha-1',
            status: 'COMPLETED',
            startsAt: new Date(NOW.getTime() - 100000),
            expiresAt: new Date(NOW.getTime() - 50000),
            assigneeUserId: 'u-old',
            source: 'MANAGER_ASSIGNMENT',
            createdAt: new Date(NOW.getTime() - 100000),
            assigneeUser: { name: 'Old' },
          },
          {
            id: 'ha-2',
            status: 'ACTIVE',
            startsAt: new Date(NOW.getTime() - 1000),
            expiresAt: null,
            assigneeUserId: 'u-current',
            source: 'CASE_RESOLUTION',
            createdAt: new Date(NOW.getTime() - 1000),
            assigneeUser: { name: 'Current' },
          },
        ],
      }),
    });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.items[0]!.handler).toEqual({
      assigneeUserId: 'u-current',
      assigneeName: 'Current',
      source: 'CASE_RESOLUTION',
    });
  });

  it('AC-10: deriveLastInteraction prefers STATUS_CHANGE over SUBMISSION', async () => {
    const submissionId = 'sub-1';
    const c = makeCaseRow({
      submissions: [
        { id: submissionId, createdAt: new Date(NOW.getTime() - 60000) },
      ],
    });
    const tx = makeTx({
      cases: [c],
      total: 1,
      statusHistory: [
        {
          id: 'h-1',
          submissionId,
          createdAt: new Date(NOW.getTime() - 30000),
        },
      ],
    });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.items[0]!.lastInteraction.kind).toBe('STATUS_CHANGE');
    expect(out.items[0]!.lastInteraction.at).toBe(
      new Date(NOW.getTime() - 30000).toISOString(),
    );
  });

  it('AC-10: deriveLastInteraction falls back to SUBMISSION when no history', async () => {
    const c = makeCaseRow({
      submissions: [
        { id: 'sub-1', createdAt: new Date(NOW.getTime() - 60000) },
      ],
    });
    const tx = makeTx({ cases: [c], total: 1, statusHistory: [] });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.items[0]!.lastInteraction.kind).toBe('SUBMISSION');
  });

  it('AC-10: lastInteraction = null when no submissions and no history', async () => {
    const c = makeCaseRow();
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.items[0]!.lastInteraction.kind).toBeNull();
    expect(out.items[0]!.lastInteraction.at).toBeNull();
  });

  it('AC-10: computeAge flips isOverdue at 72h boundary (just under → not overdue)', async () => {
    const c = makeCaseRow({
      openedAt: new Date(NOW.getTime() - 71.9 * 60 * 60 * 1000), // 71.9h
    });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.items[0]!.isOverdue).toBe(false);
    expect(out.items[0]!.overdueReason).toBeNull();
  });

  it('AC-10: computeAge flags overdue at 72.1h with CASE_AGE_THRESHOLD', async () => {
    const c = makeCaseRow({
      id: 'c2',
      openedAt: new Date(NOW.getTime() - 72.1 * 60 * 60 * 1000),
    });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.items[0]!.isOverdue).toBe(true);
    expect(out.items[0]!.overdueReason).toBe('CASE_AGE_THRESHOLD');
  });

  it('AC-10: HANDLER_EXPIRED wins over CASE_AGE_THRESHOLD', async () => {
    const c = makeCaseRow({
      openedAt: new Date(NOW.getTime() - 200 * 60 * 60 * 1000),
      laborProfile: makeProfileRow({
        handlingAssignments: [
          {
            id: 'ha-1',
            status: 'ACTIVE',
            startsAt: new Date(NOW.getTime() - 10000),
            expiresAt: new Date(NOW.getTime() - 1000),
            assigneeUserId: 'u-x',
            source: 'MANAGER_ASSIGNMENT',
            createdAt: new Date(NOW.getTime() - 10000),
            assigneeUser: { name: 'X' },
          },
        ],
      }),
    });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.items[0]!.isOverdue).toBe(true);
    expect(out.items[0]!.overdueReason).toBe('HANDLER_EXPIRED');
  });

  it('AC-02: deriveNextAction applies table values per row', async () => {
    const tx = makeTx({
      cases: [
        makeCaseRow({ id: 'c1', status: 'OPEN' }),
        makeCaseRow({
          id: 'c2',
          status: 'IN_PROGRESS',
          laborProfile: makeProfileRow({ completeness: 'MINIMAL' }),
        }),
        makeCaseRow({ id: 'c3', status: 'READY_TO_PLACE' }),
        makeCaseRow({ id: 'c4', status: 'CLOSED' }),
      ],
      total: 4,
    });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    const byId = Object.fromEntries(
      out.items.map((i) => [i.caseId, i.nextAction]),
    );
    expect(byId['c1']).toBe('OPEN_INTAKE');
    expect(byId['c2']).toBe('REQUEST_DOCS'); // IN_PROGRESS + MINIMAL
    expect(byId['c3']).toBe('REVIEW_PLACEMENT');
    expect(byId['c4']).toBe('NONE');
  });

  it('AC-12: detailHref = /admin/labor-profiles/<id> (no ?case=)', async () => {
    const c = makeCaseRow({
      id: 'case-77',
      laborProfile: makeProfileRow({ id: 'lp-77' }),
    });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.items[0]!.primaryActions.detailHref).toBe(
      '/admin/labor-profiles/lp-77',
    );
    expect(out.items[0]!.primaryActions.detailHref).not.toContain('?case=');
  });

  it('AC-12: submissionHref = /admin/applications when submissions exist (no ?case=)', async () => {
    const c = makeCaseRow({
      id: 'c1',
      submissions: [{ id: 's1', createdAt: NOW }],
    });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.items[0]!.primaryActions.submissionHref).toBe(
      '/admin/applications',
    );
    expect(out.items[0]!.primaryActions.submissionHref).not.toContain('?case=');
  });

  it('AC-12: submissionHref = null when no submissions', async () => {
    const c = makeCaseRow({ id: 'c1', submissions: [] });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.items[0]!.primaryActions.submissionHref).toBeNull();
  });

  it('AC-08: count + findMany execute in the same tx', async () => {
    const tx = makeTx({ cases: [makeCaseRow()], total: 1 });
    await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(
      tx.placementCase.count as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalled();
    expect(
      tx.placementCase.findMany as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalled();
  });

  it('AC-07: findMany is called with skip + take from page/pageSize', async () => {
    const tx = makeTx({ cases: [], total: 0 });
    await listWith(tx, makeAdminCtx(), {
      ...baseFilter,
      page: 3,
      pageSize: 50,
    });
    const call = (
      tx.placementCase.findMany as ReturnType<typeof vi.fn>
    ).mock.calls[0]![0];
    expect(call.skip).toBe(100); // (3-1)*50
    expect(call.take).toBe(50);
  });

  it('AC-07: orderBy respects sort param', async () => {
    const tx = makeTx({ cases: [], total: 0 });
    await listWith(tx, makeAdminCtx(), { ...baseFilter, sort: 'ageAsc' });
    const call = (
      tx.placementCase.findMany as ReturnType<typeof vi.fn>
    ).mock.calls[0]![0];
    expect(call.orderBy).toEqual([{ openedAt: 'asc' }, { id: 'desc' }]);
  });

  it('passes view into buildPlacementCaseWhere for MINE filter', async () => {
    const tx = makeTx({ cases: [], total: 0 });
    await listWith(tx, makeStaffCtx('staff-7'), { ...baseFilter, view: 'MINE' });
    const call = (
      tx.placementCase.findMany as ReturnType<typeof vi.fn>
    ).mock.calls[0]![0];
    expect(call.where.laborProfile).toMatchObject({
      handlingAssignments: {
        some: { assigneeUserId: 'staff-7', status: 'ACTIVE' },
      },
    });
  });

  it('passes caseStatus into where', async () => {
    const tx = makeTx({ cases: [], total: 0 });
    await listWith(tx, makeAdminCtx(), { ...baseFilter, caseStatus: 'IN_PROGRESS' });
    const call = (
      tx.placementCase.findMany as ReturnType<typeof vi.fn>
    ).mock.calls[0]![0];
    expect(call.where.status).toBe('IN_PROGRESS');
  });

  it('passes handlerUserId into where', async () => {
    const tx = makeTx({ cases: [], total: 0 });
    await listWith(tx, makeAdminCtx(), { ...baseFilter, handlerUserId: 'u-42' });
    const call = (
      tx.placementCase.findMany as ReturnType<typeof vi.fn>
    ).mock.calls[0]![0];
    expect(call.where.laborProfile).toMatchObject({
      handlingAssignments: {
        some: { assigneeUserId: 'u-42', status: 'ACTIVE' },
      },
    });
  });

  it('passes search into where (fullName only)', async () => {
    const tx = makeTx({ cases: [], total: 0 });
    await listWith(tx, makeAdminCtx(), { ...baseFilter, search: 'Trần' });
    const call = (
      tx.placementCase.findMany as ReturnType<typeof vi.fn>
    ).mock.calls[0]![0];
    expect(call.where.laborProfile).toMatchObject({
      fullName: { contains: 'Trần', mode: 'insensitive' },
    });
  });

  it('passes overdue=true into where', async () => {
    const tx = makeTx({ cases: [], total: 0 });
    await listWith(tx, makeAdminCtx(), { ...baseFilter, overdue: true });
    const call = (
      tx.placementCase.findMany as ReturnType<typeof vi.fn>
    ).mock.calls[0]![0];
    expect(call.where.OR).toBeDefined();
  });

  it('returns total from count and items from findMany', async () => {
    const cases = Array.from({ length: 5 }, (_, i) =>
      makeCaseRow({ id: `c${i}` }),
    );
    const tx = makeTx({ cases, total: 42 });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    expect(out.total).toBe(42);
    expect(out.items.length).toBe(5);
  });

  it('nextAction enum returns only canonical 7 values across rows', async () => {
    const tx = makeTx({
      cases: [
        makeCaseRow({ id: 'c1', status: 'OPEN' }),
        makeCaseRow({ id: 'c2', status: 'IN_PROGRESS' }),
        makeCaseRow({ id: 'c3', status: 'READY_TO_PLACE' }),
        makeCaseRow({ id: 'c4', status: 'CLOSED' }),
      ],
      total: 4,
    });
    const out = await listWith(tx, makeAdminCtx(), { ...baseFilter });
    const allowed = new Set([
      'OPEN_INTAKE',
      'REQUEST_DOCS',
      'SCREEN_SUBMISSION',
      'SCHEDULE_SCREEN',
      'AWAITING_RESULT',
      'REVIEW_PLACEMENT',
      'NONE',
    ]);
    for (const item of out.items) {
      expect(allowed.has(item.nextAction)).toBe(true);
    }
  });
});
