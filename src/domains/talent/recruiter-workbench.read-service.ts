/**
 * recruiter-workbench.read-service.ts — P1-E0 Recruiter Workbench Read Model.
 *
 * Implements the read-only list endpoint `GET /api/admin/recruiter-workbench`
 * per TASK.md v1.3 / RQ-02..RQ-17. Two layers:
 *
 *   1. **Pure derive functions** (no Prisma, no IO):
 *      - `deriveNextAction`   — closed 7-value enum decision table (AC-02).
 *      - `deriveHandler`      — active-handler selection (AC-03).
 *      - `deriveLastInteraction` — global newest across candidate_submissions and application_status_history (DEC-07 / F-11).
 *      - `computeAge`         — `ageHours` + `isOverdue` + `overdueReason` (AC-04).
 *      - `extractJobContextFromPlacement` — canonical job chain pull (AC-05/F05).
 *
 *   2. **`getRecruiterWorkbenchList`** (Prisma transaction client):
 *      - RLS-aware via `withDbContext` caller.
 *      - Permission-aware masking (`canSeeSensitive` is resolved exactly ONCE by
 *        the route handler and forwarded here — E0-F06).
 *      - Filter / sort / page semantics per RQ-03, RQ-11.
 *      - DTO assembly with deterministic tie-breakers (AC-11, RQ-11).
 */

import { Prisma } from '@prisma/client';

import type { AuthContext } from '@/src/shared/auth/auth-context';

import { maskCccd, maskPhone } from '@/src/shared/privacy/mask';

import {
  CASE_STATUS_VALUES,
  RecruiterWorkbenchCaseStatus,
  RecruiterWorkbenchFilter,
  RecruiterWorkbenchListResponse,
  RecruiterWorkbenchOverdueReason,
  RecruiterWorkbenchPermissionContext,
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
 * Filter (E0-F03 — UNASSIGNED semantics):
 *   - `status = 'ACTIVE'`
 *   - `startsAt <= now`
 *   - `expiresAt IS NULL OR expiresAt > now`
 *
 * Future ACTIVE (`startsAt > now`) and expired ACTIVE (`expiresAt <= now`)
 * must NOT remove UNASSIGNED status — they fall outside the active window.
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
/**
 * Pick the global newest row across both `candidate_submissions` and
 * `application_status_history`. The kind is derived from which set the
 * winner came from.
 *
 * DEC-07 / F-11: the previous implementation always preferred STATUS_CHANGE
 * over SUBMISSION when any history row existed, even when a SUBMISSION was
 * chronologically newer. Correct shape: compare `pickNewest(submissions)`
 * against `pickNewest(statusHistory)` and return whichever has the larger
 * `createdAt` (deterministic tie-break by `id DESC`).
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
      const bestTime = best.createdAt.getTime();
      const curTime = cur.createdAt.getTime();
      if (curTime > bestTime) {
        best = cur;
        continue;
      }
      if (curTime === bestTime && cur.id > best.id) {
        best = cur;
      }
    }
    return best;
  }

  const newestSubmission = pickNewest(submissions);
  const newestStatus = pickNewest(statusHistory);

  // Both empty → null
  if (newestSubmission === null && newestStatus === null) {
    return { at: null, kind: null };
  }
  // Only one side has rows → that side wins
  if (newestSubmission === null) {
    return { at: newestStatus!.createdAt, kind: 'STATUS_CHANGE' };
  }
  if (newestStatus === null) {
    return { at: newestSubmission.createdAt, kind: 'SUBMISSION' };
  }
  // Both have rows → pick global newest by createdAt, tie-break by id DESC.
  const subTime = newestSubmission.createdAt.getTime();
  const statTime = newestStatus.createdAt.getTime();
  if (subTime > statTime) {
    return { at: newestSubmission.createdAt, kind: 'SUBMISSION' };
  }
  if (statTime > subTime) {
    return { at: newestStatus.createdAt, kind: 'STATUS_CHANGE' };
  }
  // Equal timestamp → tie-break by id DESC across kinds (the kind with the
  // lexicographically larger id wins; kinds themselves are not compared).
  if (newestSubmission.id > newestStatus.id) {
    return { at: newestSubmission.createdAt, kind: 'SUBMISSION' };
  }
  return { at: newestStatus.createdAt, kind: 'STATUS_CHANGE' };
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
// Job context projection (E0-F05)
// ═══════════════════════════════════════════════════════════════════════════

export interface PlacementLike {
  id: string;
  selectedAt: Date;
  jobOpening?: {
    id: string;
    posting?: {
      id: string;
      title: string | null;
    } | null;
    staffingOrder?: {
      project?: {
        name: string;
        clientCompanyName: string | null;
      } | null;
    } | null;
  } | null;
}

export interface JobContextResolution {
  jobPostingId: string | null;
  jobPostingTitle: string | null;
  projectName: string | null;
  companyName: string | null;
}

/**
 * Pick the latest placement by `selectedAt DESC, id DESC` and project its job
 * chain into the canonical DTO `job` block. Returns all-null when the case
 * has no placement, no JobOpening, no Posting, no StaffingOrder, or no
 * Project (E0-F05 — no 500 from missing optional relations).
 */
export function extractJobContextFromPlacement(
  placements: ReadonlyArray<PlacementLike>,
): JobContextResolution {
  if (placements.length === 0) {
    return {
      jobPostingId: null,
      jobPostingTitle: null,
      projectName: null,
      companyName: null,
    };
  }
  let latest: PlacementLike = placements[0]!;
  for (let i = 1; i < placements.length; i++) {
    const cur = placements[i]!;
    if (cur.selectedAt.getTime() > latest.selectedAt.getTime()) {
      latest = cur;
      continue;
    }
    if (
      cur.selectedAt.getTime() === latest.selectedAt.getTime() &&
      cur.id > latest.id
    ) {
      latest = cur;
    }
  }
  const opening = latest.jobOpening;
  const posting = opening?.posting;
  const project = opening?.staffingOrder?.project;
  return {
    jobPostingId: posting?.id ?? null,
    jobPostingTitle: posting?.title ?? null,
    projectName: project?.name ?? null,
    companyName: project?.clientCompanyName ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Read service — runs inside a Prisma transaction (RLS GUC set by caller).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Active-handler membership filter used by both `MINE` (current ctx.userId)
 * and `handlerUserId` (the explicit filter arg). Mirrors rule C-03:
 * `status = 'ACTIVE' AND startsAt <= now AND (expiresAt IS NULL OR expiresAt > now)`.
 */
function activeAssignmentForUser(userId: string, now: Date): Prisma.LaborProfileHandlingAssignmentWhereInput {
  return {
    assigneeUserId: userId,
    status: 'ACTIVE',
    startsAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

/**
 * Active-handler membership filter with no assignee constraint. Used by
 * `view=UNASSIGNED` (the inverse — see `buildPlacementCaseWhere`) and by
 * `overdue=true` (handler expired but still ACTIVE).
 */
function activeAssignment(now: Date): Prisma.LaborProfileHandlingAssignmentWhereInput {
  return {
    status: 'ACTIVE',
    startsAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

/**
 * Build the Prisma `where` clause for `placement_case` given the validated
 * filter. Centralised here so tests can mirror the exact shape.
 *
 * E0-F01 — composable AND clauses. Every filter is a separate `AND:` arm
 * under `laborProfile`. The previous implementation merged `laborProfile`
 * objects via last-write-wins, which silently dropped earlier clauses
 * (MINE auth bypass when `handlerUserId` / `overdue=false` / `search` was
 * applied on top). Each clause here is independent; Prisma AND-combines
 * them, so all five filters are preserved concurrently.
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

  // Compose top-level `AND` arms for every clause that touches the labor
  // profile. Each arm is independent; Prisma AND-combines them. This is the
  // fix for E0-F01 — the old implementation merged these objects via spread
  // and dropped earlier clauses.
  const laborProfileAnd: Prisma.LaborProfileWhereInput[] = [];

    // View filter (RQ-04, DEC-06):
  //   MINE       → LaborProfile has at least one ACTIVE handlingAssignment
  //                (active window) whose assignee = ctx.userId.
  //   UNASSIGNED → LaborProfile has NO handlingAssignment whose active window
  //                contains `now` (E0-F03: status='ACTIVE' AND startsAt<=now AND
  //                (expiresAt IS NULL OR expiresAt>now)). Future ACTIVE and expired
  //                ACTIVE must NOT remove UNASSIGNED status.
  //   ALL        → no view-driven filter at this layer (RBAC gated at route).
  if (filter.view === 'MINE') {
    laborProfileAnd.push({
      handlingAssignments: {
        some: activeAssignmentForUser(ctx.userId, now),
      },
    });
  } else if (filter.view === 'UNASSIGNED') {
    // Exclude any profile that HAS an active-window assignment.
    // Must check temporal bounds: future ACTIVE and expired ACTIVE are not "active".
    laborProfileAnd.push({
      handlingAssignments: {
        none: activeAssignment(now),
      },
    });
  }

  // Handler filter (RQ-03): LaborProfile has any active-window handling
  // assignment matching the explicit `handlerUserId`. This composes
  // orthogonally with `view=MINE` (the route layer enforces `handlerUserId`
  // === ctx.userId for HR_STAFF in E0-F02).
  if (filter.handlerUserId) {
    laborProfileAnd.push({
      handlingAssignments: {
        some: activeAssignmentForUser(filter.handlerUserId, now),
      },
    });
  }

  // Search filter (RQ-05): `fullName` contains (no-oracle on phone/cccd).
  if (filter.search) {
    laborProfileAnd.push({
      fullName: { contains: filter.search, mode: 'insensitive' },
    });
  }

  // Overdue filter (RQ-08):
  //   isOverdue = openedAt age ≥ 72h OR any ACTIVE handler whose expiresAt < now.
  //
  // F-10: the previous shape put the expired-handler branch inside
  // laborProfileAnd (AND-composed with view/handler/search) AND a separate
  // openedAt branch on where.OR — producing an intersection (AND-of-OR) that
  // excludes cases where ONLY ONE condition holds. The correct shape is a
  // top-level `where.OR` with exactly two branches for overdue=true. The
  // existing view/search/handler clauses (built into laborProfileAnd) still
  // compose via Prisma's default top-level AND — they remain outside the OR.
  //
  // The expired-handler branch is encoded as a relation traversal
  // `laborProfile: { handlingAssignments: { some: { status, expiresAt } } }`
  // inside the OR — Prisma applies each OR branch as a top-level predicate
  // AND-composed with the rest of the `where` (including laborProfileAnd).
  // Prisma constraint: when a single relation field appears in multiple OR
  // branches, each branch is treated independently, so the AND of the OR
  // holds correctly across both branches.
  if (filter.overdue === true) {
    const ageThreshold = new Date(
      now.getTime() - CASE_AGE_OVERDUE_HOURS * 60 * 60 * 1000,
    );
    where.OR = [
      { openedAt: { lt: ageThreshold } },
      {
        laborProfile: {
          is: {
            handlingAssignments: {
              some: {
                status: 'ACTIVE',
                expiresAt: { lt: now },
              },
            },
          },
        },
      },
    ];
  } else if (filter.overdue === false) {
    const ageThreshold = new Date(
      now.getTime() - CASE_AGE_OVERDUE_HOURS * 60 * 60 * 1000,
    );
    where.openedAt = { gte: ageThreshold };
    laborProfileAnd.push({
      handlingAssignments: {
        none: {
          status: 'ACTIVE',
          expiresAt: { lt: now },
        },
      },
    });
  }

  if (laborProfileAnd.length > 0) {
    where.laborProfile = { AND: laborProfileAnd };
  }

  return where;
}

/**
 * Sort spec → Prisma `orderBy`. The tie-breaker `placement_case.id DESC` is
 * required by RQ-11 for deterministic pagination.
 *
 * E0-F04 — `ageHours = now - openedAt`, so the deterministic mapping is:
 *
 *   - `ageDesc`   → openedAt ASC  (largest age first = oldest openedAt first).
 *   - `ageAsc`    → openedAt DESC (smallest age first = newest openedAt first).
 *   - `openedDesc`→ openedAt DESC.
 *   - `openedAsc` → openedAt ASC.
 *
 * The previous implementation had `ageDesc → openedAt DESC` (inverted). This
 * correction matches the §4.3 RQ-11 deterministic sort.
 */
export function buildOrderBy(
  sort: RecruiterWorkbenchFilter['sort'],
): Prisma.PlacementCaseOrderByWithRelationInput[] {
  const tie = { id: 'desc' as const };
  switch (sort) {
    case 'ageAsc':
      return [{ openedAt: 'desc' }, tie]; // smallest age first
    case 'openedAsc':
      return [{ openedAt: 'asc' }, tie];
    case 'openedDesc':
      return [{ openedAt: 'desc' }, tie];
    case 'ageDesc':
    case undefined:
      return [{ openedAt: 'asc' }, tie]; // largest age first (default)
  }
}

/**
 * Get a paginated list of placement cases for the recruiter workbench, with
 * nested DTO shape per TASK.md RQ-02.
 *
 * IMPORTANT (E0-F06 — resolve permissions exactly once):
 *   - The route handler MUST compute `canSeeSensitive` ONCE (after Zod parse
 *     succeeds) and pass it via `permissions`. This function MUST NOT call
 *     `resolveEffectivePermissions` itself.
 *   - Caller MUST wrap with `withDbContext` so that RLS GUCs are set.
 *   - Caller MUST gate `view = UNASSIGNED` permission at the route layer.
 *   - Caller MUST gate `role === HR_STAFF && view === ALL` at the route.
 *
 * @param tx            Prisma transaction client (RLS GUC must already be set).
 * @param _ctx          AuthContext. (Reserved for future use; current logic uses
 *                      `filter.view` to scope, which the route has already
 *                      authority-gated.)
 * @param filter        Validated filter.
 * @param permissions   Pre-resolved `canSeeSensitive` from route handler.
 * @param nowOverride   Optional pinned `Date.now()` for tests. Defaults to
 *                      `new Date()` at call time. Service never mutates this.
 */
export async function getRecruiterWorkbenchList(
  tx: Prisma.TransactionClient,
  _ctx: AuthContext,
  filter: RecruiterWorkbenchFilter,
  permissions: RecruiterWorkbenchPermissionContext,
  nowOverride?: Date,
): Promise<RecruiterWorkbenchListResponse> {
  const canSeeSensitive = permissions.canSeeSensitive;

  const now = nowOverride ?? new Date();
  const where = buildPlacementCaseWhere(filter, _ctx, now);
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
        placements: {
          orderBy: [{ selectedAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: {
            id: true,
            selectedAt: true,
            jobOpening: {
              select: {
                id: true,
                posting: { select: { id: true, title: true } },
                staffingOrder: {
                  select: {
                    project: { select: { name: true, clientCompanyName: true } },
                  },
                },
              },
            },
          },
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
  // recent placement's job chain (jobOpening.posting + staffingOrder.project)
  // per E0-F05 — no N+1, no raw client-company crossing.
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

    // E0-F05: derive canonical job context from the case's latest placement
    // (Prisma already returned `placements: { take: 1, orderBy: selectedAt DESC, id DESC }`).
    const job = extractJobContextFromPlacement(
      c.placements as unknown as ReadonlyArray<PlacementLike>,
    );

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
      job,
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
