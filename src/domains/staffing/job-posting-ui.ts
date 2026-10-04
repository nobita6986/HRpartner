/**
 * job-posting-ui.ts — T1B Wave 2 module-owned JobPosting status dictionary.
 *
 * Authority binding (do NOT reopen):
 * - docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md §3.2.3, §3.3 #3-#5
 * - docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md §3
 * - Cross-module term `job_posting` (label "Tin tuyển dụng") lives in
 *   src/shared/i18n/glossary.ts.
 * - Display action labels (`Đăng tin` / `Gỡ tin` / `Lưu trữ`) are imported
 *   from `src/shared/i18n/action-dictionary.ts` (Wave 1) — NEVER redefined
 *   here. Canonical lifecycle operation names (`Publish` / `Unpublish` /
 *   `Archive`) live on the API + runStateMutation argument; they are
 *   preserved per T0 §2 #2 / F11 §9 and are NOT in this dictionary.
 *
 * Architecture rule (EP §4.2 / §4.3):
 * - This file owns ONLY JobPosting status labels + re-exports the
 *   action dictionary for typed access in JobPosting consumers.
 * - No global aggregator; consumers import this dictionary directly.
 */

import { actionLabel, type ActionCode } from '@/src/shared/i18n/action-dictionary';

export type JobPostingLifecycleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/** EP §3.2.3 — canonical 3 enum values mapped to operator-facing Vietnamese labels. */
export const JOB_POSTING_STATUS_LABELS: Readonly<Record<JobPostingLifecycleStatus, string>> = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã đăng',
  ARCHIVED: 'Đã lưu trữ',
};

/** Tone per JobPosting status (matches the inline `colorMap` baseline at `app/admin/jobs/job-postings/page.tsx:469-472` and `[id]/page.tsx:249-253`). */
export const JOB_POSTING_STATUS_TONES: Readonly<Record<JobPostingLifecycleStatus, 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER'>> = {
  DRAFT: 'NEUTRAL',
  PUBLISHED: 'SUCCESS',
  ARCHIVED: 'NEUTRAL',
};

/**
 * Action display labels for JobPosting — these are the operator-facing
 * Vietnamese labels that appear on buttons / status messages. The canonical
 * lifecycle operation names (`Publish` / `Unpublish` / `Archive`) are
 * preserved in `value` / `aria-label` / `runStateMutation` argument. We
 * re-export `actionLabel()` here for typed access in JobPosting consumers;
 * the underlying values are owned by `src/shared/i18n/action-dictionary.ts`.
 */
export const JOB_POSTING_ACTION_LABELS: Readonly<Record<'publish' | 'unpublish' | 'archive', string>> = {
  publish: actionLabel('publish'),
  unpublish: actionLabel('unpublish'),
  archive: actionLabel('archive'),
};

/** Typed access to the JobPosting action codes (canonical). */
export type JobPostingActionCode = 'publish' | 'unpublish' | 'archive';
export const JOB_POSTING_ACTION_CODES: Readonly<Record<JobPostingActionCode, ActionCode>> = {
  publish: 'publish',
  unpublish: 'unpublish',
  archive: 'archive',
};

/**
 * Lookup helper. Returns the operator-facing Vietnamese label for a
 * JobPosting status. Falls back to the canonical enum value
 * (KEEP_CANONICAL_IDENTIFIER) if the value is missing.
 */
export function jobPostingStatusLabel(status: string): string {
  return JOB_POSTING_STATUS_LABELS[status as JobPostingLifecycleStatus] ?? status;
}

export function jobPostingStatusTone(status: string): 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER' {
  return JOB_POSTING_STATUS_TONES[status as JobPostingLifecycleStatus] ?? 'NEUTRAL';
}

/** Stable module identifier for `<StatusBadge module="job_posting" />`. */
export const JOB_POSTING_MODULE = 'job_posting' as const;
