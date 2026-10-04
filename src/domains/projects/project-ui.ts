/**
 * project-ui.ts — T1B Wave 2 module-owned Project status dictionary.
 *
 * Authority binding (do NOT reopen):
 * - docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md §3.2.1
 * - docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md §3
 * - Cross-module term `project` (label "Dự án") lives in src/shared/i18n/glossary.ts
 *   and is imported here via `glossaryLabel('project')` when needed.
 *
 * Architecture rule (EP §4.2 / §4.3):
 * - This file owns ONLY Project-domain status / column-derived labels.
 * - F11 frozen business-button literals (`Công bố dự án` / `Bỏ công bố dự án`)
 *   are NOT in this dictionary — they live directly on the Project-level
 *   button JSX at `app/admin/jobs/page.tsx` and are static-fenced by
 *   `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts`.
 * - Tone map is a small companion (NEUTRAL/SUCCESS/WARN/DANGER) matching
 *   the Wave 1 StatusBadge contract (`src/shared/ui/status-badge/index.tsx`).
 *   Consumers in this module choose the tone to match the existing inline
 *   `STATUS_COLORS` baseline so the visual contract is preserved.
 */

export type ProjectLifecycleStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

/** EP §3.2.1 — canonical 5 enum values mapped to operator-facing Vietnamese labels. */
export const PROJECT_STATUS_LABELS: Readonly<Record<ProjectLifecycleStatus, string>> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Hoạt động',
  PAUSED: 'Tạm dừng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

/** EP §3.2.1 — column-derived 3 labels for the /admin/jobs publish column. */
export const PROJECT_PUBLISH_COLUMN_LABELS = {
  /** `job.isPublic === true` → "Đã công bố". */
  published: 'Đã công bố',
  /** `job.isPublic === false` AND `job.status !== 'CLOSED'` → "Chưa công bố". */
  unpublished: 'Chưa công bố',
  /** `job.status === 'CLOSED'` → "Đã đóng" (overrides isPublic). */
  closed: 'Đã đóng',
} as const;

export type ProjectPublishColumnKey = keyof typeof PROJECT_PUBLISH_COLUMN_LABELS;

/** Tone per Project status (preserves inline `STATUS_COLORS` baseline). */
export const PROJECT_STATUS_TONES: Readonly<Record<ProjectLifecycleStatus, 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER'>> = {
  DRAFT: 'NEUTRAL',
  ACTIVE: 'SUCCESS',
  PAUSED: 'WARN',
  COMPLETED: 'NEUTRAL',
  CANCELLED: 'DANGER',
};

export const PROJECT_PUBLISH_COLUMN_TONES: Readonly<Record<ProjectPublishColumnKey, 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER'>> = {
  published: 'SUCCESS',
  unpublished: 'NEUTRAL',
  closed: 'DANGER',
};

/**
 * Lookup helper. Returns the operator-facing Vietnamese label for a Project
 * lifecycle status. Falls back to the canonical enum value (KEEP_CANONICAL_IDENTIFIER)
 * if the value is missing — the caller MUST treat the fallback as a Wave 2
 * contract violation and either add the entry or open a T0 decision.
 */
export function projectStatusLabel(status: string): string {
  return PROJECT_STATUS_LABELS[status as ProjectLifecycleStatus] ?? status;
}

/** Same as `projectStatusLabel` but for tone. */
export function projectStatusTone(status: string): 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER' {
  return PROJECT_STATUS_TONES[status as ProjectLifecycleStatus] ?? 'NEUTRAL';
}

/**
 * Lookup helper for the `/admin/jobs` publish column. The publish column is
 * a 3-state column-derived label that depends on BOTH `isPublic` AND
 * `status === 'CLOSED'` (CLOSED wins over isPublic). The raw literal used
 * to live in `app/admin/jobs/page.tsx:351` as a ternary returning
 * `'Published' | 'Unpublished' | 'Closed'`; Wave 2 routes this through
 * `projectPublishColumnLabel()`.
 */
export function projectPublishColumnLabel(isPublic: boolean, status: string): string {
  if (status === 'CLOSED') return PROJECT_PUBLISH_COLUMN_LABELS.closed;
  return isPublic ? PROJECT_PUBLISH_COLUMN_LABELS.published : PROJECT_PUBLISH_COLUMN_LABELS.unpublished;
}

export function projectPublishColumnTone(isPublic: boolean, status: string): 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER' {
  if (status === 'CLOSED') return PROJECT_PUBLISH_COLUMN_TONES.closed;
  return isPublic ? PROJECT_PUBLISH_COLUMN_TONES.published : PROJECT_PUBLISH_COLUMN_TONES.unpublished;
}

/** Stable module identifier for `<StatusBadge module="project" />`. */
export const PROJECT_MODULE = 'project' as const;
