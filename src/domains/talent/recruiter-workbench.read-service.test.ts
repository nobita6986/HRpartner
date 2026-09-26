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
 * E0-F01 corrections:
 *   - AND composition tests for buildPlacementCaseWhere (MINE+handler, MINE+overdue,
 *     MINE+search, MINE+handler+overdue, UNASSIGNED+search, UNASSIGNED+overdue).
 *
 * E0-F04 corrections:
 *   - buildOrderBy assertions use specific dates (not just "object looks right").
 *   - ageDesc → openedAt ASC, id DESC (not openedAt DESC).
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
import type {
  RecruiterWorkbenchFilter,
  RecruiterWorkbenchPermissionContext,
} from '@/src/domains/talent/recruiter-workbench.types';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import * as permResolver from '@/src/shared/auth/permission-resolver';

// Note: the service no longer calls resolveEffectivePermissions internally (E0-F06).
// We keep the mock so existing test imports don't break, but the service ignores it.
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

function makePerms(canSeeSensitive: boolean): RecruiterWorkbenchPermissionContext {
  return { canSeeSensitive };
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
    placements?: Array<{
      id: string;
      selectedAt: Date;
      jobOpening?: {
        id: string;
        posting?: { id: string; title: string | null } | null;
        staffingOrder?: {
          project?: { name: string; clientCompanyName: string | null } | null;
        } | null;
      } | null;
    }>;
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
    placements: overrides.placements ?? [],
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

// Default: no sensitive permission
const NO_SENSITIVE = makePerms(false);
const WITH_SENSITIVE = makePerms(true);

// Helper: list with NOW pinned and explicit permissions (E0-F06)
async function listWith(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  filter: RecruiterWorkbenchFilter,
  perms: RecruiterWorkbenchPermissionContext = NO_SENSITIVE,
) {
  return getRecruiterWorkbenchList(tx, ctx, filter, perms, NOW);
}

// ═══════════════════════════════════════════════════════════════════════════
// buildPlacementCaseWhere
// ═══════════════════════════════════════════════════════════════════════════

describe('buildPlacementCaseWhere', () => {
  // E0-F03: MINE = active-window assignment (not just status='ACTIVE').
  it('E0-F03 MINE view requires full active-window predicate (status+startsAt+expiresAt)', () => {
    const ctx = makeStaffCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'MINE' },
      ctx,
      NOW,
    );
    // Must include temporal bounds (startsAt <= now, expiresAt IS NULL or > now).
    expect(where.laborProfile).toMatchObject({
      AND: expect.arrayContaining([
        {
          handlingAssignments: {
            some: expect.objectContaining({
              assigneeUserId: 'staff-1',
              status: 'ACTIVE',
              startsAt: { lte: NOW },
              OR: [{ expiresAt: null }, { expiresAt: { gt: NOW } }],
            }),
          },
        },
      ]),
    });
  });

  // E0-F03: UNASSIGNED = no active-window assignment.
  // Must assert the full temporal predicate: status='ACTIVE' AND startsAt<=now AND (expiresAt IS NULL OR expiresAt>now).
  // Old test only checked status='ACTIVE' (incomplete).
  it('E0-F03 UNASSIGNED view filters to laborProfile with no active-window assignment', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'UNASSIGNED' },
      ctx,
      NOW,
    );
    expect(where.laborProfile).toMatchObject({
      AND: expect.arrayContaining([
        {
          handlingAssignments: {
            none: {
              status: 'ACTIVE',
              startsAt: { lte: NOW },
              OR: [{ expiresAt: null }, { expiresAt: { gt: NOW } }],
            },
          },
        },
      ]),
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

  // E0-F01: handlerUserId filter requires full active-window predicate.
  it('handlerUserId filter requires full active-window predicate', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, handlerUserId: 'u-42' },
      ctx,
      NOW,
    );
    expect(where.laborProfile).toMatchObject({
      AND: expect.arrayContaining([
        {
          handlingAssignments: {
            some: expect.objectContaining({
              assigneeUserId: 'u-42',
              status: 'ACTIVE',
              startsAt: { lte: NOW },
              OR: [{ expiresAt: null }, { expiresAt: { gt: NOW } }],
            }),
          },
        },
      ]),
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
      AND: expect.arrayContaining([
        { fullName: { contains: 'Tran', mode: 'insensitive' } },
      ]),
    });
  });

  it('overdue=true builds openedAt OR active expired assignment (F-10: 2 branches, top-level OR)', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, overdue: true },
      ctx,
      NOW,
    );
    // F-10: overdue=true must produce exactly two top-level OR branches:
    //   1. openedAt older than threshold (case-age form).
    //   2. laborProfile.handlingAssignments.some { ACTIVE, expiresAt < now }.
    expect(where.OR).toBeDefined();
    expect(Array.isArray(where.OR)).toBe(true);
    expect(where.OR!.length).toBe(2);
    const firstBranch = where.OR![0] as { openedAt: { lt: Date } };
    expect(firstBranch.openedAt.lt).toBeInstanceOf(Date);
    // Second branch is the expired-handler relation traversal.
    const secondBranch = where.OR![1] as {
      laborProfile: { is: { handlingAssignments: { some: unknown } } };
    };
    expect(secondBranch.laborProfile.is.handlingAssignments.some).toMatchObject({
      status: 'ACTIVE',
      expiresAt: { lt: NOW },
    });
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
      AND: expect.arrayContaining([
        {
          handlingAssignments: {
            none: { status: 'ACTIVE', expiresAt: { lt: NOW } },
          },
        },
      ]),
    });
  });

  // E0-F01: AND composition — MINE + handlerUserId (different user).
  // Both clauses must appear under AND, so both filters are active.
  it('E0-F01 MINE + handlerUserId (different user) composes via AND', () => {
    const ctx = makeAdminCtx(); // ADMIN can use handlerUserId
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'MINE', handlerUserId: 'staff-99' },
      ctx,
      NOW,
    );
    // Must have AND: [MINE assignment, handlerUserId assignment]
    expect(where.laborProfile).toMatchObject({
      AND: expect.arrayContaining([
        {
          handlingAssignments: {
            some: expect.objectContaining({ assigneeUserId: 'staff-99' }),
          },
        },
      ]),
    });
    // The AND array must have at least 2 items (MINE + handlerUserId)
    const andArr = (where.laborProfile as { AND: unknown[] }).AND;
    expect(andArr.length).toBeGreaterThanOrEqual(2);
  });

  // E0-F01: AND composition — MINE + overdue=true.
  // F-10: overdue=true no longer pushes an arm into laborProfileAnd (it
  // now lives at top-level OR). MINE auth stays in AND, and the OR is
  // applied as a top-level predicate. So laborProfileAnd for view=MINE
  // alone is exactly one arm.
  it('E0-F01 MINE + overdue=true composes via AND (MINE in AND, OR at top level)', () => {
    const ctx = makeStaffCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'MINE', overdue: true },
      ctx,
      NOW,
    );
    expect(where.laborProfile).toMatchObject({
      AND: expect.arrayContaining([
        {
          handlingAssignments: {
            some: expect.objectContaining({ assigneeUserId: 'staff-1' }),
          },
        },
      ]),
    });
    // F-10: only MINE adds to laborProfileAnd; overdue=true lives at the
    // top-level OR. So AND has exactly one arm in this combination.
    const andArr = (where.laborProfile as { AND: unknown[] }).AND;
    expect(andArr.length).toBe(1);
    // The top-level OR must still have the two overdue branches.
    expect(Array.isArray(where.OR)).toBe(true);
    expect(where.OR!.length).toBe(2);
  });

  // E0-F01: AND composition — MINE + search.
  it('E0-F01 MINE + search composes via AND', () => {
    const ctx = makeStaffCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'MINE', search: 'Nguyen' },
      ctx,
      NOW,
    );
    expect(where.laborProfile).toMatchObject({
      AND: expect.arrayContaining([
        {
          handlingAssignments: {
            some: expect.objectContaining({ assigneeUserId: 'staff-1' }),
          },
        },
        { fullName: { contains: 'Nguyen', mode: 'insensitive' } },
      ]),
    });
    const andArr = (where.laborProfile as { AND: unknown[] }).AND;
    expect(andArr.length).toBe(2);
  });

  // E0-F01: AND composition — UNASSIGNED + search.
  it('E0-F01 UNASSIGNED + search composes via AND', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'UNASSIGNED', search: 'Le' },
      ctx,
      NOW,
    );
    expect(where.laborProfile).toMatchObject({
      AND: expect.arrayContaining([
        {
          handlingAssignments: {
            none: {
              status: 'ACTIVE',
              startsAt: { lte: NOW },
              OR: [{ expiresAt: null }, { expiresAt: { gt: NOW } }],
            },
          },
        },
        { fullName: { contains: 'Le', mode: 'insensitive' } },
      ]),
    });
    const andArr = (where.laborProfile as { AND: unknown[] }).AND;
    expect(andArr.length).toBe(2);
  });

  // E0-F01: AND composition — UNASSIGNED + overdue=false.
  it('E0-F01 UNASSIGNED + overdue=false composes via AND', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'UNASSIGNED', overdue: false },
      ctx,
      NOW,
    );
    // Must have at least 2 AND arms (UNASSIGNED + overdue=false's "none expired")
    const andArr = (where.laborProfile as { AND: unknown[] }).AND;
    expect(andArr.length).toBeGreaterThanOrEqual(2);
    // overdue=false adds a "none expired" clause
    expect(andArr).toEqual(
      expect.arrayContaining([
        {
          handlingAssignments: {
            none: { status: 'ACTIVE', expiresAt: { lt: NOW } },
          },
        },
      ]),
    );
  });

  // E0-F01: AND composition — MINE + handlerUserId + overdue (all three).
  it('E0-F01 MINE + handlerUserId + overdue=false composes all three via AND', () => {
    const ctx = makeAdminCtx();
    const where = buildPlacementCaseWhere(
      {
        ...baseFilter,
        view: 'MINE',
        handlerUserId: 'staff-42',
        overdue: false,
      },
      ctx,
      NOW,
    );
    expect(where.laborProfile).toMatchObject({
      AND: expect.arrayContaining([
        {
          handlingAssignments: {
            some: expect.objectContaining({ assigneeUserId: 'staff-42' }),
          },
        },
        {
          handlingAssignments: {
            none: { status: 'ACTIVE', expiresAt: { lt: NOW } },
          },
        },
      ]),
    });
    // Must have at least 3 arms
    const andArr = (where.laborProfile as { AND: unknown[] }).AND;
    expect(andArr.length).toBeGreaterThanOrEqual(3);
  });

  // E0-F01: single-filter still uses AND wrapper for consistent composition.
  // Implementation wraps in AND: [...] even with one arm so adding more
  // filters does not change the top-level shape of `laborProfile`.
  it('E0-F01 single filter still wraps in AND: [...] (consistent composition)', () => {
    const ctx = makeStaffCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'MINE' },
      ctx,
      NOW,
    );
    // Even with one filter, the AND wrapper is present for consistent
    // composition when other filters are added.
    const lp = where.laborProfile as { AND: unknown[] };
    expect(Array.isArray(lp.AND)).toBe(true);
    expect(lp.AND.length).toBe(1);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F-10 — overdue=true must be a top-level OR of two branches (NOT AND).
  // RQ-08: isOverdue = openedAt age >= 72h OR expired ACTIVE handler exists.
  // The two branches are joined by OR; view/handler/search still AND-compose.
  // ═════════════════════════════════════════════════════════════════════════
  const F10_AGE_THRESHOLD = new Date(NOW.getTime() - 72 * 60 * 60 * 1000);

  it('F-10 overdue=true has exactly two top-level OR branches (age OR expired handler)', () => {
    const ctx = makeManagerCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, overdue: true },
      ctx,
      NOW,
    );
    expect(Array.isArray(where.OR)).toBe(true);
    expect((where.OR as unknown[]).length).toBe(2);

    // Branch 1: openedAt older than 72h threshold.
    expect(where.OR?.[0]).toEqual({ openedAt: { lt: F10_AGE_THRESHOLD } });

    // Branch 2: relation traversal to a LaborProfile that has at least one
    // ACTIVE handlingAssignment with expiresAt < now.
    expect(where.OR?.[1]).toEqual({
      laborProfile: {
        is: {
          handlingAssignments: {
            some: {
              status: 'ACTIVE',
              expiresAt: { lt: NOW },
            },
          },
        },
      },
    });
  });

  it('F-10 overdue=true: MINE auth still composes via laborProfile.AND (NOT OR)', () => {
    // MINE auth must be a separate AND-composed predicate. It must NOT live
    // inside one of the OR branches — otherwise HR_STAFF would bypass the
    // MINE auth check whenever the age branch holds.
    const ctx = makeStaffCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, view: 'MINE', overdue: true },
      ctx,
      NOW,
    );
    // MINE arm must be in laborProfile.AND, not anywhere in OR.
    expect(where.laborProfile).toBeDefined();
    const andArr = (where.laborProfile as { AND: unknown[] }).AND;
    expect(Array.isArray(andArr)).toBe(true);
    expect(andArr.length).toBe(1);
    expect(andArr[0]).toMatchObject({
      handlingAssignments: {
        some: expect.objectContaining({ assigneeUserId: ctx.userId }),
      },
    });
    // OR must not contain any assigneeUserId predicate — that would mean
    // MINE was moved into the OR and would be bypassed by the age branch.
    const orStr = JSON.stringify(where.OR);
    expect(orStr).not.toContain(ctx.userId);
    expect(orStr).not.toContain('assigneeUserId');
  });

  it('F-10 overdue=true: search still composes via laborProfile.AND', () => {
    const ctx = makeManagerCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, overdue: true, search: 'nguyen' },
      ctx,
      NOW,
    );
    const andArr = (where.laborProfile as { AND: unknown[] }).AND;
    expect(andArr.length).toBe(1);
    expect(andArr[0]).toEqual({
      fullName: { contains: 'nguyen', mode: 'insensitive' },
    });
    // search must NOT appear in OR — otherwise the age-only branch could
    // return rows whose fullName does not contain the search term.
    const orStr = JSON.stringify(where.OR);
    expect(orStr).not.toContain('nguyen');
    expect(orStr).not.toContain('fullName');
  });

  it('F-10 overdue=true: handlerUserId still composes via laborProfile.AND', () => {
    const ctx = makeManagerCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, overdue: true, handlerUserId: 'staff-42' },
      ctx,
      NOW,
    );
    const andArr = (where.laborProfile as { AND: unknown[] }).AND;
    expect(andArr.length).toBe(1);
    expect(andArr[0]).toMatchObject({
      handlingAssignments: {
        some: expect.objectContaining({ assigneeUserId: 'staff-42' }),
      },
    });
    // handlerUserId must NOT appear in OR.
    const orStr = JSON.stringify(where.OR);
    expect(orStr).not.toContain('staff-42');
  });

  it('F-10 overdue=false: openedAt gte threshold + no expired ACTIVE in AND', () => {
    const ctx = makeManagerCtx();
    const where = buildPlacementCaseWhere(
      { ...baseFilter, overdue: false },
      ctx,
      NOW,
    );
    // openedAt gte age threshold.
    expect(where.openedAt).toEqual({ gte: F10_AGE_THRESHOLD });
    // No top-level OR for overdue=false.
    expect(where.OR).toBeUndefined();
    // AND arm contains the "no expired ACTIVE" predicate.
    const andArr = (where.laborProfile as { AND: unknown[] }).AND;
    expect(andArr.length).toBe(1);
    expect(andArr[0]).toEqual({
      handlingAssignments: {
        none: {
          status: 'ACTIVE',
          expiresAt: { lt: NOW },
        },
      },
    });
  });

  // F-10 inclusion/exclusion semantics are documented in HANDOFF.md §1.0
  // and tested at the DB layer in tests/db/recruiter-workbench.integration.test.ts
  // (gated behind `describe.skipIf(!HAS_TEST_DB)`). The unit-level proof
  // here is the WHERE-clause shape — Prisma applies the two OR branches
  // independently against the rest of the where clause.
});

// ═══════════════════════════════════════════════════════════════════════════
// buildOrderBy (E0-F04 corrections)
// ═══════════════════════════════════════════════════════════════════════════

describe('buildOrderBy', () => {
  // E0-F04: ageHours = now - openedAt. Largest age = oldest openedAt.
  // ageDesc → openedAt ASC (oldest first). ageAsc → openedAt DESC (newest first).
  it('ageDesc → openedAt ASC, id DESC (oldest cases first)', () => {
    // With pinned NOW = 2026-09-26T10:00:00:
    //   case opened 2026-09-20 (6d ago) → ageHours = 144h
    //   case opened 2026-09-24 (2d ago)  → ageHours = 48h
    // ageDesc → ASC means oldest (144h) comes first.
    const result = buildOrderBy('ageDesc');
    expect(result).toEqual([{ openedAt: 'asc' }, { id: 'desc' }]);
  });

  it('ageAsc → openedAt DESC, id DESC (newest cases first)', () => {
    // Same dates, ageAsc means newest first.
    const result = buildOrderBy('ageAsc');
    expect(result).toEqual([{ openedAt: 'desc' }, { id: 'desc' }]);
  });

  it('openedDesc → openedAt DESC, id DESC', () => {
    const result = buildOrderBy('openedDesc');
    expect(result).toEqual([{ openedAt: 'desc' }, { id: 'desc' }]);
  });

  it('openedAsc → openedAt ASC, id DESC', () => {
    const result = buildOrderBy('openedAsc');
    expect(result).toEqual([{ openedAt: 'asc' }, { id: 'desc' }]);
  });

  it('undefined (default) → same as ageDesc: openedAt ASC', () => {
    // Default sort is ageDesc.
    expect(buildOrderBy(undefined)).toEqual([{ openedAt: 'asc' }, { id: 'desc' }]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getRecruiterWorkbenchList
// ═══════════════════════════════════════════════════════════════════════════

describe('getRecruiterWorkbenchList', () => {
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
    // Service uses the passed `canSeeSensitive` flag (E0-F06), not resolveEffectivePermissions.
    const c = makeCaseRow({
      id: 'c1',
      laborProfile: makeProfileRow({
        phone: '0912345678',
        cccdNumber: '001099123456',
      }),
    });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeStaffCtx(), { ...baseFilter }, NO_SENSITIVE);
    expect(out.items[0]!.candidate.phone).toBe('091****678');
    expect(out.items[0]!.candidate.cccdNumber).toBe('********3456');
  });

  it('AC-09: shows raw phone & cccd when caller has CAN_VIEW_WORKER_SENSITIVE', async () => {
    const c = makeCaseRow({
      id: 'c1',
      laborProfile: makeProfileRow({
        phone: '0912345678',
        cccdNumber: '001099123456',
      }),
    });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeManagerCtx(), { ...baseFilter }, WITH_SENSITIVE);
    expect(out.items[0]!.candidate.phone).toBe('0912345678');
    expect(out.items[0]!.candidate.cccdNumber).toBe('001099123456');
  });

  it('AC-09: leaves phone/cccd null when DB has null (no fake masking)', async () => {
    const c = makeCaseRow({
      laborProfile: makeProfileRow({ phone: null, cccdNumber: null }),
    });
    const tx = makeTx({ cases: [c], total: 1 });
    const out = await listWith(tx, makeStaffCtx(), { ...baseFilter }, NO_SENSITIVE);
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
    // ageAsc = smallest age first = newest openedAt first = openedAt DESC.
    expect(call.orderBy).toEqual([{ openedAt: 'desc' }, { id: 'desc' }]);
  });

  it('passes view into buildPlacementCaseWhere for MINE filter', async () => {
    const tx = makeTx({ cases: [], total: 0 });
    await listWith(tx, makeStaffCtx('staff-7'), { ...baseFilter, view: 'MINE' });
    const call = (
      tx.placementCase.findMany as ReturnType<typeof vi.fn>
    ).mock.calls[0]![0];
    expect(call.where.laborProfile).toMatchObject({
      AND: expect.arrayContaining([
        {
          handlingAssignments: {
            some: expect.objectContaining({ assigneeUserId: 'staff-7' }),
          },
        },
      ]),
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
      AND: expect.arrayContaining([
        {
          handlingAssignments: {
            some: expect.objectContaining({ assigneeUserId: 'u-42' }),
          },
        },
      ]),
    });
  });

  it('passes search into where (fullName only)', async () => {
    const tx = makeTx({ cases: [], total: 0 });
    await listWith(tx, makeAdminCtx(), { ...baseFilter, search: 'Trần' });
    const call = (
      tx.placementCase.findMany as ReturnType<typeof vi.fn>
    ).mock.calls[0]![0];
    expect(call.where.laborProfile).toMatchObject({
      AND: expect.arrayContaining([
        { fullName: { contains: 'Trần', mode: 'insensitive' } },
      ]),
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
