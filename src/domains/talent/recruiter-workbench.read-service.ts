/**
 * recruiter-workbench.read-service.ts — P1-E0 Recruiter Workbench Read Model.
 *
 * Implements the read-only list endpoint `GET /api/admin/recruiter-workbench`
 * per TASK.md v1.3 / RQ-02..RQ-17. Two layers:
 *
 *   1. **Pure derive functions** (no Prisma, no IO):
 *      - `deriveNextAction`   — closed 7-value enum decision table (AC-02).
 *      - `deriveHandler`      — active-handler selection (AC-03).
 *      - `deriveLastInteraction` — newest STATUS_CHANGE vs newest SUBMISSION (AC-04).
 *      - `computeAge`         — `ageHours` + `isOverdue` + `overdueReason` (AC-04).
 *
 *   2. **`getRecruiterWorkbenchList`** (Prisma transaction client):
 *      - RLS-aware via `withDbContext` caller.
 *      - Permission-aware masking (CAN_VIEW_WORKER_SENSITIVE).
 *      - Filter / sort / page semantics per RQ-03, RQ-11.
 *      - DTO assembly with deterministic tie-breakers (AC-11, RQ-11).
 */

import { Prisma } from '@prisma/client';

import { AuthContext } from '@/src/shared/auth/auth-context';
import {
  resolveEffectivePermissions,
  AuthError,
} from '@/src/shared/auth/permission-resolver';
import { maskCccd, maskPhone } from '@/src/shared/privacy/mask';

import {
  CASE_STATUS_VALUES,
  RecruiterWorkbenchCaseStatus,
  RecruiterWorkbenchFilter,
  RecruiterWorkbenchListResponse,
  RecruiterWorkbenchOverdueReason,
  RecruiterWorkbenchRow,
  SERVER_DERIVED_NEXT_ACTION_VALUES,
  ServerDerivedNextAction,
} from '@/src/domains/talent/recruiter-workbench.types';

// ═══════════════════════════════════════════════════════════════════════════
// Pure derive helpers — no Prisma, no IO, deterministic.
// ═══════════════════════════════════════════════════════════════════════════

export interface HandlerAssignmentLike {
  status: string;
  startsAt: Date;
  expiresAt: Date | null;
  assigneeUserId: string;
  assigneeName?: string | null;
  source: string;
  createdAt: Date;
  id: string;
}

export interface HandlerResolution {
  assigneeUserId: string | null;
  assigneeName: string | null;
  source: string | null;
}

/**
 * Select the active handler for a placement case (AC-03, §4.3, rule C-03).
 *
 * Filter:
 *   - `status = 'ACTIVE'`
 *   - `startsAt <= now`
 *   - `expiresAt IS NULL OR expiresAt > now`
 *
 * Deterministic order (RQ-11 tie-breaker):
 *   `startsAt DESC, createdAt DESC, id DESC` → take 1.
 *
 * Returns `{ null, null, null }` when no active handler matches.
 */
export function deriveHandler(
  assignments: ReadonlyArray<HandlerAssignmentLike>,
  now: Date = new Date(),
): HandlerResolution {
  let best: HandlerAssignmentLike | null = null;
  for (const a of assignments) {
    if (a.status !== 'ACTIVE') continue;
    if (a.startsAt.getTime() > now.getTime()) continue;
    if (a.expiresAt !== null && a.expiresAt.getTime() <= now.getTime()) continue;
    if (best === null) {
      best = a;
      continue;
    }
    // Order: startsAt DESC, createdAt DESC, id DESC.
    if (a.startsAt.getTime() > best.startsAt.getTime()) {
      best = a;
      continue;
    }
    if (
      a.startsAt.getTime() === best.startsAt.getTime() &&
      a.createdAt.getTime() > best.createdAt.getTime()
    ) {
      best = a;
      continue;
    }
    if (
      a.startsAt.getTime() === best.startsAt.getTime() &&
      a.createdAt.getTime() === best.createdAt.getTime() &&
      a.id > best.id
    ) {
      best = a;
    }
  }
  if (best === null) {
    return { assigneeUserId: null, assigneeName: null, source: null };
  }
  return {
    assigneeUserId: best.assigneeUserId,
    assigneeName: best.assigneeName ?? null,
    source: best.source,
  };
}

export interface SubmissionLike {
  createdAt: Date;
  id: string;
}

export interface StatusHistoryLike {
  createdAt: Date;
  id: string;
}

export interface LastInteractionResolution {
  at: Date | null;
  kind: 'SUBMISSION' | 'STATUS_CHANGE' | null;
}

/**
 * Pick the newest "interaction" for the case (RQ-10, AC-04).
 *
 * Priority:
 *   1. Newest STATUS_CHANGE (by `createdAt DESC, id DESC`) if any.
 *   2. Else newest SUBMISSION (by `createdAt DESC, id DESC`).
 *   3. Else `{ at: null, kind: null }`.
 *
 * NOTE — there is no `NOTE` kind (TASK.md RQ-10).
 */
export function deriveLastInteraction(
  submissions: ReadonlyArray<SubmissionLike>,
  statusHistory: ReadonlyArray<StatusHistoryLike>,
): LastInteractionResolution {
  function pickNewest<T extends { createdAt: Date; id: string }>(
    rows: ReadonlyArray<T>,
  ): T | null {
    if (rows.length === 0) return null;
    let best = rows[0]!;
    for (let i = 1; i < rows.length; i++) {
      const cur = rows[i]!;
      if (cur.createdAt.getTime() > best.createdAt.getTime()) {
        best = cur;
        continue;
      }
      if (
        cur.createdAt.getTime() === best.createdAt.getTime() &&
        cur.id > best.id
      ) {
        best = cur;
      }
    }
    return best;
  }

  const newestStatus = pickNewest(statusHistory);
  if (newestStatus !== null) {
    return { at: newestStatus.createdAt, kind: 'STATUS_CHANGE' };
  }
  const newestSubmission = pickNewest(submissions);
  if (newestSubmission !== null) {
    return { at: newestSubmission.createdAt, kind: 'SUBMISSION' };
  }
  return { at: null, kind: null };
}

export interface ComputeAgeInput {
  openedAt: Date;
  handlerExpiresAt: Date | null;
}

export interface AgeResolution {
  ageHours: number;
  isOverdue: boolean;
  overdueReason: RecruiterWorkbenchOverdueReason;
}

const CASE_AGE_OVERDUE_HOURS = 72;

/**
 * Compute `ageHours`, `isOverdue`, `overdueReason` (AC-04, RQ-08).
 *
 *   - `ageHours` = (now - openedAt) / 1h, rounded to 1 decimal.
 *   - `isOverdue` = `ageHours >= 72` OR `handlerExpiresAt < now` (HANDLER_EXPIRED takes precedence).
 *   - `overdueReason`:
 *       - `HANDLER_EXPIRED`    if `handlerExpiresAt < now`.
 *       - `CASE_AGE_THRESHOLD` if `ageHours >= 72` (and not already handler-expired).
 *       - `null`               otherwise.
 */
export function computeAge(
  input: ComputeAgeInput,
  now: Date = new Date(),
): AgeResolution {
  const ms = now.getTime() - input.openedAt.getTime();
  const rawHours = ms / (60 * 60 * 1000);
  const ageHours = Math.round(rawHours * 10) / 10;

  const handlerExpired =
    input.handlerExpiresAt !== null &&
    input.handlerExpiresAt.getTime() < now.getTime();

  let isOverdue = false;
  let overdueReason: RecruiterWorkbenchOverdueReason = null;
  if (handlerExpired) {
    isOverdue = true;
    overdueReason = 'HANDLER_EXPIRED';
  } else if (ageHours >= CASE_AGE_OVERDUE_HOURS) {
    isOverdue = true;
    overdueReason = 'CASE_AGE_THRESHOLD';
  }

  return { ageHours, isOverdue, overdueReason };
}

export interface NextActionInput {
  caseStatus: RecruiterWorkbenchCaseStatus;
  identityVerification: string;
  completeness: string;
  lastInteractionKind: 'SUBMISSION' | 'STATUS_CHANGE' | null;
}

/**
 * Decision table from TASK.md §4.4 / AC-02. The 7-value closed set is
 * enforced by the type `ServerDerivedNextAction`; this function MUST never
 * return any other value.
 *
 * Order matters — applied top-down:
 *   1. CLOSED → NONE
 *   2. OPEN + lastInteraction = null → OPEN_INTAKE
 *   3. (OPEN | IN_PROGRESS) + UNVERIFIED → REQUEST_DOCS
 *   4. (OPEN | IN_PROGRESS) + MINIMAL → REQUEST_DOCS
 *   5. OPEN + lastInteraction = SUBMISSION → SCREEN_SUBMISSION
 *   6. IN_PROGRESS + lastInteraction = SUBMISSION → SCHEDULE_SCREEN
 *   7. IN_PROGRESS + lastInteraction = STATUS_CHANGE → AWAITING_RESULT
 *   8. READY_TO_PLACE → REVIEW_PLACEMENT
 *   9. fallback → NONE
 */
export function deriveNextAction(input: NextActionInput): ServerDerivedNextAction {
  if (input.caseStatus === 'CLOSED') return 'NONE';
  if (
    input.caseStatus === 'OPEN' &&
    input.lastInteractionKind === null
  ) {
    return 'OPEN_INTAKE';
  }
  if (
    (input.caseStatus === 'OPEN' || input.caseStatus === 'IN_PROGRESS') &&
    input.identityVerification === 'UNVERIFIED'
  ) {
    return 'REQUEST_DOCS';
  }
  if (
    (input.caseStatus === 'OPEN' || input.caseStatus === 'IN_PROGRESS') &&
    input.completeness === 'MINIMAL'
  ) {
    return 'REQUEST_DOCS';
  }
  if (
    input.caseStatus === 'OPEN' &&
    input.lastInteractionKind === 'SUBMISSION'
  ) {
    return 'SCREEN_SUBMISSION';
  }
  if (
    input.caseStatus === 'IN_PROGRESS' &&
    input.lastInteractionKind === 'SUBMISSION'
  ) {
    return 'SCHEDULE_SCREEN';
  }
  if (
    input.caseStatus === 'IN_PROGRESS' &&
    input.lastInteractionKind === 'STATUS_CHANGE'
  ) {
    return 'AWAITING_RESULT';
  }
  if (input.caseStatus === 'READY_TO_PLACE') return 'REVIEW_PLACEMENT';
  return 'NONE';
}

/**
 * Compile-time guard: assert the enum hasn't drifted. Cheap runtime check,
 * exercised by integration test AC-13 and by service boot.
 */
export function assertEnumInvariant(): void {
  if (SERVER_DERIVED_NEXT_ACTION_VALUES.length !== 7) {
    throw new Error(
      `ServerDerivedNextAction must have exactly 7 values (got ${SERVER_DERIVED_NEXT_ACTION_VALUES.length}).`,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Read service — runs inside a Prisma transaction (RLS GUC set by caller).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the Prisma `where` clause for `placement_case` given the validated
 * filter. Centralised here so tests can mirror the exact shape.
 */
export function buildPlacementCaseWhere(
  filter: RecruiterWorkbenchFilter,
  ctx: AuthContext,
  now: Date = new Date(),
): Prisma.PlacementCaseWhereInput {
  const where: Prisma.PlacementCaseWhereInput = {};

  // caseStatus filter (RQ-03). When omitted, ALL open cases are visible.
  if (filter.caseStatus) {
    where.status = filter.caseStatus;
  }

  // View filter (RQ-04, DEC-06):
  //   MINE       → placementCase has at least one ACTIVE handlingAssignment
  //                (via LaborProfile) whose assignee = ctx.userId.
  //   UNASSIGNED → placementCase's LaborProfile has NO ACTIVE handlingAssignment.
  //   ALL        → no extra filter at this layer (RBAC gated at route).
  if (filter.view === 'MINE') {
    where.laborProfile = {
      handlingAssignments: {
        some: {
          assigneeUserId: ctx.userId,
          status: 'ACTIVE',
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      },
    };
  } else if (filter.view === 'UNASSIGNED') {
    where.laborProfile = {
      handlingAssignments: { none: { status: 'ACTIVE' } },
    };
  }

  // Handler filter (RQ-03): placementCase.laborProfile.handlingAssignments has
  // any row matching the given userId with the active window.
  if (filter.handlerUserId) {
    where.laborProfile = {
      ...(where.laborProfile as Prisma.LaborProfileWhereInput | undefined),
      handlingAssignments: {
        some: {
          assigneeUserId: filter.handlerUserId,
          status: 'ACTIVE',
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      },
    };
  }

  // Search filter (RQ-05): fullName contains (no-oracle on phone/cccd).
  if (filter.search) {
    where.laborProfile = {
      ...(where.laborProfile as Prisma.LaborProfileWhereInput | undefined),
      fullName: { contains: filter.search, mode: 'insensitive' },
    };
  }

  // Overdue filter (RQ-08):
  //   - `true`  → ageHours >= 72  OR  handlerExpiresAt < now.
  //   - `false` → neither condition.
  if (filter.overdue !== undefined) {
    if (filter.overdue) {
      where.OR = [
        // openedAt older than 72h
        { openedAt: { lt: new Date(now.getTime() - CASE_AGE_OVERDUE_HOURS * 60 * 60 * 1000) } },
        // any active handling assignment whose expiresAt < now
        {
          laborProfile: {
            handlingAssignments: {
              some: {
                status: 'ACTIVE',
                expiresAt: { lt: now },
              },
            },
          },
        },
      ];
    } else {
      where.openedAt = {
        gte: new Date(now.getTime() - CASE_AGE_OVERDUE_HOURS * 60 * 60 * 1000),
      };
      where.laborProfile = {
        ...(where.laborProfile as Prisma.LaborProfileWhereInput | undefined),
        handlingAssignments: {
          none: {
            status: 'ACTIVE',
            expiresAt: { lt: now },
          },
        },
      };
    }
  }

  return where;
}

/**
 * Sort spec → Prisma `orderBy`. The tie-breaker `placement_case.id DESC` is
 * required by RQ-11 for deterministic pagination.
 */
export function buildOrderBy(
  sort: RecruiterWorkbenchFilter['sort'],
): Prisma.PlacementCaseOrderByWithRelationInput[] {
  const tie = { id: 'desc' as const };
  switch (sort) {
    case 'openedAsc':
      return [{ openedAt: 'asc' }, tie];
    case 'openedDesc':
      return [{ openedAt: 'desc' }, tie];
    case 'ageAsc':
      return [{ openedAt: 'asc' }, tie]; // oldest first = lowest age first
    case 'ageDesc':
    case undefined:
      return [{ openedAt: 'desc' }, tie]; // default
  }
}

/**
 * Get a paginated list of placement cases for the recruiter workbench, with
 * nested DTO shape per TASK.md RQ-02.
 *
 * IMPORTANT:
 *   - Caller MUST wrap with `withDbContext` so that RLS GUCs are set.
 *   - Caller MUST gate `view = UNASSIGNED` permission at the route layer.
 *   - Caller MUST gate `role === HR_STAFF && view === ALL` at the route.
 *
 * @param tx          Prisma transaction client (RLS GUC must already be set).
 * @param ctx         AuthContext.
 * @param filter      Validated filter.
 * @param nowOverride Optional pinned `Date.now()` for tests. Defaults to
 *                    `new Date()` at call time. Service never mutates this.
 */
export async function getRecruiterWorkbenchList(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  filter: RecruiterWorkbenchFilter,
  nowOverride?: Date,
): Promise<RecruiterWorkbenchListResponse> {
  const permissions = await resolveEffectivePermissions({
    userId: ctx.userId,
    role: ctx.role,
  });
  const canSeeSensitive = permissions.has('CAN_VIEW_WORKER_SENSITIVE');

  const now = nowOverride ?? new Date();
  const where = buildPlacementCaseWhere(filter, ctx, now);
  const orderBy = buildOrderBy(filter.sort);

  const page = filter.page;
  const pageSize = Number(filter.pageSize);
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // `count` + `findMany` MUST share the same `where` and run in the same
  // `tx` for query consistency (RQ-11 / AC-08).
  const [total, rawCases] = await Promise.all([
    tx.placementCase.count({ where }),
    tx.placementCase.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        laborProfile: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            cccdNumber: true,
            identityVerification: true,
            completeness: true,
            handlingAssignments: {
              orderBy: [
                { startsAt: 'desc' },
                { createdAt: 'desc' },
                { id: 'desc' },
              ],
              include: {
                assigneeUser: { select: { name: true } },
              },
            },
          },
        },
        submissions: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: { id: true, createdAt: true },
        },
      },
    }),
  ]);

  // For `lastInteraction` STATUS_CHANGE kind, we need the newest statusHistory
  // across all submissions in the case. Fetch only when at least one submission
  // exists (avoid empty round-trip).
  const submissionIds = rawCases.flatMap((c) => c.submissions.map((s) => s.id));
  const statusHistoryBySubmission = new Map<
    string,
    Array<{ id: string; createdAt: Date }>
  >();
  if (submissionIds.length > 0) {
    const rows = await tx.applicationStatusHistory.findMany({
      where: { submissionId: { in: submissionIds } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, createdAt: true, submissionId: true },
    });
    for (const row of rows) {
      const arr = statusHistoryBySubmission.get(row.submissionId);
      if (arr) {
        arr.push({ id: row.id, createdAt: row.createdAt });
      } else {
        statusHistoryBySubmission.set(row.submissionId, [
          { id: row.id, createdAt: row.createdAt },
        ]);
      }
    }
  }

  // Job denorm: each case can have 0..N placements; we expose the most
  // recent placement's jobOpening (if any) + posting title.
  const items: RecruiterWorkbenchRow[] = rawCases.map((c) => {
    const profile = c.laborProfile;
    const assignments = profile.handlingAssignments as Array<
      HandlerAssignmentLike & { assigneeUser?: { name: string | null } | null }
    >;
    const handler = deriveHandler(
      assignments.map((a) => ({
        status: a.status,
        startsAt: a.startsAt,
        expiresAt: a.expiresAt,
        assigneeUserId: a.assigneeUserId,
        assigneeName: a.assigneeUser?.name ?? null,
        source: a.source,
        createdAt: a.createdAt,
        id: a.id,
      })),
      now,
    );

    // Aggregate STATUS_CHANGE candidates across all submissions of the case,
    // then derive the newest overall.
    const allStatusHistory: StatusHistoryLike[] = [];
    for (const sub of c.submissions) {
      const arr = statusHistoryBySubmission.get(sub.id);
      if (arr) allStatusHistory.push(...arr);
    }
    const lastInteraction = deriveLastInteraction(
      c.submissions.map((s) => ({ id: s.id, createdAt: s.createdAt })),
      allStatusHistory,
    );

    const age = computeAge(
      {
        openedAt: c.openedAt,
        handlerExpiresAt: findExpiredHandlerExpiresAt(assignments, now),
      },
      now,
    );

    const nextAction = deriveNextAction({
      caseStatus: c.status as RecruiterWorkbenchCaseStatus,
      identityVerification: profile.identityVerification,
      completeness: profile.completeness,
      lastInteractionKind: lastInteraction.kind,
    });

    return {
      caseId: c.id,
      caseStatus: c.status as RecruiterWorkbenchCaseStatus,
      openedAt: c.openedAt.toISOString(),
      closedAt: c.closedAt ? c.closedAt.toISOString() : null,
      candidate: {
        laborProfileId: profile.id,
        fullName: profile.fullName,
        phone: canSeeSensitive
          ? profile.phone
          : profile.phone
            ? maskPhone(profile.phone)
            : null,
        cccdNumber: canSeeSensitive
          ? profile.cccdNumber
          : profile.cccdNumber
            ? maskCccd(profile.cccdNumber)
            : null,
        identityVerification: profile.identityVerification,
        completeness: profile.completeness,
      },
      job: {
        jobPostingId: null,
        jobPostingTitle: null,
        projectName: null,
        companyName: null,
      },
      lastInteraction: {
        at: lastInteraction.at ? lastInteraction.at.toISOString() : null,
        kind: lastInteraction.kind,
      },
      nextAction,
      handler,
      ageHours: age.ageHours,
      isOverdue: age.isOverdue,
      overdueReason: age.overdueReason,
      primaryActions: {
        detailHref: `/admin/labor-profiles/${profile.id}`,
        submissionHref:
          c.submissions.length > 0 ? `/admin/applications` : null,
      },
    };
  });

  return { items, total, page, pageSize };
}

/**
 * Helper: return the `expiresAt` of the most recent ACTIVE assignment whose
 * window has expired (`expiresAt < now`). This is the signal used to set
 * `overdueReason = 'HANDLER_EXPIRED'`.
 *
 * Returns `null` when no such expired-but-still-ACTIVE assignment exists.
 */
function findExpiredHandlerExpiresAt(
  assignments: ReadonlyArray<HandlerAssignmentLike>,
  now: Date,
): Date | null {
  const expired = assignments.filter(
    (a) =>
      a.status === 'ACTIVE' &&
      a.expiresAt !== null &&
      a.expiresAt.getTime() < now.getTime() &&
      a.startsAt.getTime() <= now.getTime(),
  );
  if (expired.length === 0) return null;
  // Pick the most recently expired (newest expiresAt).
  let best = expired[0]!;
  for (let i = 1; i < expired.length; i++) {
    const cur = expired[i]!;
    if (cur.expiresAt!.getTime() > best.expiresAt!.getTime()) {
      best = cur;
    }
  }
  return best.expiresAt;
}

/**
 * Re-export for callers / tests that need to assert enum invariants or read
 * the canonical CASE_STATUS_VALUES.
 */
export { CASE_STATUS_VALUES };
