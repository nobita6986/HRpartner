/**
 * recruiter-workbench.types.ts — P1-E0 Recruiter Workbench Read Model.
 *
 * Frozen shape (TASK.md v1.3, RQ-02..RQ-17):
 *   - 7-value closed enum for `nextAction` (no extra values allowed).
 *   - Query schema (zod) for HTTP layer validation (RQ-03, RQ-16).
 *   - Nested DTO shape (no top-level `candidatePhone` / `candidateCccdNumber` aliases).
 *   - `lastInteraction.kind` ∈ {SUBMISSION, STATUS_CHANGE, null}.
 *   - `overdueReason` ∈ {HANDLER_EXPIRED, CASE_AGE_THRESHOLD, null}.
 *   - `primaryActions.detailHref` = `/admin/labor-profiles/<laborProfileId>` (no `?case=`).
 *   - `primaryActions.submissionHref` = `/admin/applications` (no `?case=`).
 *
 * Single source of truth for the row DTO: every downstream consumer (service,
 * route, integration test) MUST consume this module's types — do NOT redefine.
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// 1. `nextAction` — server-derived 7-value closed enum (§4.4).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Canonical 7-value closed enum. Any new value MUST be added here AND in the
 * `deriveNextAction` decision table inside `recruiter-workbench.read-service.ts`,
 * together with the §4.4 acceptance criterion. The `NONE` value is the catch-all
 * for `caseStatus = CLOSED` (TASK.md AC-02).
 */
export const SERVER_DERIVED_NEXT_ACTION_VALUES = [
  'OPEN_INTAKE',
  'REQUEST_DOCS',
  'SCREEN_SUBMISSION',
  'SCHEDULE_SCREEN',
  'AWAITING_RESULT',
  'REVIEW_PLACEMENT',
  'NONE',
] as const;

export type ServerDerivedNextAction =
  (typeof SERVER_DERIVED_NEXT_ACTION_VALUES)[number];

/**
 * Runtime assertion used by integration test AC-13: the live array MUST be
 * exactly seven values, never fewer, never more.
 */
export function assertNextActionEnumSize(): void {
  if (SERVER_DERIVED_NEXT_ACTION_VALUES.length !== 7) {
    throw new Error(
      `ServerDerivedNextAction must have exactly 7 values (got ${SERVER_DERIVED_NEXT_ACTION_VALUES.length}). ` +
        'See TASK.md §4.4 / AC-13.',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Query schema — zod-validated at the route layer (RQ-03, RQ-16).
// ═══════════════════════════════════════════════════════════════════════════

export const CASE_STATUS_VALUES = [
  'OPEN',
  'IN_PROGRESS',
  'READY_TO_PLACE',
  'CLOSED',
] as const;

export const RECRUITER_WORKBENCH_VIEW_VALUES = [
  'MINE',
  'ALL',
  'UNASSIGNED',
] as const;

export const RECRUITER_WORKBENCH_SORT_VALUES = [
  'ageDesc',
  'ageAsc',
  'openedDesc',
  'openedAsc',
] as const;

export const RECRUITER_WORKBENCH_PAGE_SIZES = ['20', '50', '100'] as const;

/**
 * Validated query schema (RQ-03, RQ-16). Failure → 400 BAD_QUERY at route.
 * All optional fields are server-side defaulted inside the service:
 *   - `view`    : `ALL` for ADMIN/HR_MANAGER, `MINE` for HR_STAFF (route sets).
 *   - `sort`    : `ageDesc` (service sets).
 *   - `pageSize`: `20` (service sets).
 */
export const RecruiterWorkbenchQuerySchema = z.object({
  search: z.string().trim().min(1).max(255).optional(),
  caseStatus: z.enum(CASE_STATUS_VALUES).optional(),
  handlerUserId: z.string().uuid().optional(),
  view: z.enum(RECRUITER_WORKBENCH_VIEW_VALUES).optional(),
  overdue: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  sort: z.enum(RECRUITER_WORKBENCH_SORT_VALUES).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z
    .enum(RECRUITER_WORKBENCH_PAGE_SIZES)
    .optional()
    .default('20'),
});

export type RecruiterWorkbenchQuery = z.infer<typeof RecruiterWorkbenchQuerySchema>;

/**
 * Service-level filter shape (post-parse). Differs from the wire schema by:
 *   - `overdue` is already coerced to `boolean | undefined`.
 *   - `pageSize` is already coerced to a positive integer.
 */
export interface RecruiterWorkbenchFilter {
  search?: string;
  caseStatus?: (typeof CASE_STATUS_VALUES)[number];
  handlerUserId?: string;
  view: (typeof RECRUITER_WORKBENCH_VIEW_VALUES)[number];
  overdue?: boolean;
  sort?: (typeof RECRUITER_WORKBENCH_SORT_VALUES)[number];
  page: number;
  pageSize: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. DTO — nested shape, server-derived fields.
// ═══════════════════════════════════════════════════════════════════════════

export type RecruiterWorkbenchCaseStatus = (typeof CASE_STATUS_VALUES)[number];
export type RecruiterWorkbenchLastInteractionKind =
  | 'SUBMISSION'
  | 'STATUS_CHANGE'
  | null;
export type RecruiterWorkbenchOverdueReason =
  | 'HANDLER_EXPIRED'
  | 'CASE_AGE_THRESHOLD'
  | null;

/**
 * Single row in the workbench list response. Nested shape (no top-level
 * aliases — TASK.md RQ-02 / DEC-08).
 *
 * `phone` and `cccdNumber` are MASKED when the caller lacks
 * `CAN_VIEW_WORKER_SENSITIVE`. The mask is performed in the read-service
 * BEFORE the DTO is assembled.
 */
export interface RecruiterWorkbenchRow {
  caseId: string;
  caseStatus: RecruiterWorkbenchCaseStatus;
  openedAt: string;
  closedAt: string | null;
  candidate: {
    laborProfileId: string;
    fullName: string | null;
    phone: string | null;
    cccdNumber: string | null;
    identityVerification: string;
    completeness: string;
  };
  job: {
    jobPostingId: string | null;
    jobPostingTitle: string | null;
    projectName: string | null;
    companyName: string | null;
  };
  lastInteraction: {
    at: string | null;
    kind: RecruiterWorkbenchLastInteractionKind;
  };
  nextAction: ServerDerivedNextAction;
  handler: {
    assigneeUserId: string | null;
    assigneeName: string | null;
    source: string | null;
  };
  ageHours: number;
  isOverdue: boolean;
  overdueReason: RecruiterWorkbenchOverdueReason;
  primaryActions: {
    detailHref: string;
    submissionHref: string | null;
  };
}

export interface RecruiterWorkbenchListResponse {
  items: RecruiterWorkbenchRow[];
  total: number;
  page: number;
  pageSize: number;
}
