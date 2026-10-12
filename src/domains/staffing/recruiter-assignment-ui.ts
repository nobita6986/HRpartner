/**
 * recruiter-assignment-ui.ts — T1B Wave 2 module-owned Recruiter Assignment
 * status dictionary.
 *
 * Authority binding (do NOT reopen):
 * - docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md §3.2.7
 * - docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md §3
 * - Cross-module term `recruiter_workbench` (label "Bàn làm việc tuyển dụng")
 *   lives in src/shared/i18n/glossary.ts.
 *
 * Architecture rule (EP §4.2 / §4.3):
 * - This file owns ONLY Recruiter Assignment status labels.
 * - No global aggregator; consumers import this dictionary directly.
 * - Tone map mirrors the existing inline baseline at
 *   `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx:326-330`
 *   (which already renders Vietnamese labels; dictionary added forward-only
 *   for Wave 3 / future consumers per EP §5.2 file ownership and DEC-10).
 *
 * Wave 2 scope: dictionary + test only. No consumer rewrite.
 */

export type RecruiterAssignmentLifecycleStatus = 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';

/** EP §3.2.7 — canonical 3 enum values mapped to operator-facing Vietnamese labels. */
export const RECRUITER_ASSIGNMENT_STATUS_LABELS: Readonly<Record<RecruiterAssignmentLifecycleStatus, string>> = {
  ACTIVE: 'Đang phụ trách',
  REVOKED: 'Đã thu hồi',
  SUPERSEDED: 'Đã thay thế',
};

/** Tone per Recruiter Assignment status. */
export const RECRUITER_ASSIGNMENT_STATUS_TONES: Readonly<Record<RecruiterAssignmentLifecycleStatus, 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER'>> = {
  ACTIVE: 'SUCCESS',
  REVOKED: 'NEUTRAL',
  SUPERSEDED: 'NEUTRAL',
};

/**
 * Lookup helper. Returns the operator-facing Vietnamese label for a
 * Recruiter Assignment status. Falls back to the canonical enum value
 * (KEEP_CANONICAL_IDENTIFIER) if the value is missing.
 */
export function recruiterAssignmentStatusLabel(status: string): string {
  return RECRUITER_ASSIGNMENT_STATUS_LABELS[status as RecruiterAssignmentLifecycleStatus] ?? status;
}

export function recruiterAssignmentStatusTone(status: string): 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER' {
  return RECRUITER_ASSIGNMENT_STATUS_TONES[status as RecruiterAssignmentLifecycleStatus] ?? 'NEUTRAL';
}

/** Stable module identifier for `<StatusBadge module="recruiter_assignment" />`. */
export const RECRUITER_ASSIGNMENT_MODULE = 'recruiter_assignment' as const;
