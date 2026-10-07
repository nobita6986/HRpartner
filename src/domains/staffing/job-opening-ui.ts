/**
 * job-opening-ui.ts — T1B Wave 2 module-owned JobOpening status dictionary.
 *
 * Authority binding (do NOT reopen):
 * - docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md §3.2.2, §3.2.11
 * - docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md §3
 * - Cross-module term `job_opening` (label "Đợt tuyển dụng") lives in
 *   src/shared/i18n/glossary.ts.
 *
 * Architecture rule (EP §4.2 / §4.3):
 * - This file owns ONLY JobOpening status + serviceModel labels.
 * - No global aggregator; consumers import this dictionary directly.
 * - Tone map mirrors the inline baseline used at
 *   `app/admin/job-openings/[id]/page.tsx` so visual contract is preserved.
 */

export type JobOpeningLifecycleStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'CLOSING_SOON'
  | 'CLOSED'
  | 'FILLED'
  | 'CANCELLED';

/** EP §3.2.2 — canonical 6 enum values mapped to operator-facing Vietnamese labels. */
export const JOB_OPENING_STATUS_LABELS: Readonly<Record<JobOpeningLifecycleStatus, string>> = {
  DRAFT: 'Bản nháp',
  OPEN: 'Đang mở',
  CLOSING_SOON: 'Sắp đóng',
  CLOSED: 'Đã đóng',
  FILLED: 'Đã đủ chỉ tiêu',
  CANCELLED: 'Đã hủy',
};

/** EP §3.2.11 — serviceModel enum values (canonical `onsite` / `remote`). */
export const JOB_OPENING_SERVICE_MODEL_LABELS: Readonly<Record<
  | 'onsite'
  | 'remote'
  | 'STAFFING_SUPPLY'
  | 'LABOR_LEASING'
  | 'RECRUITMENT_SERVICE'
  | 'REFERRAL_SERVICE',
  string
>> = {
  onsite: 'Tại nơi làm việc',
  remote: 'Từ xa',
  STAFFING_SUPPLY: 'Cung ứng nhân sự',
  LABOR_LEASING: 'Cho thuê lại lao động',
  RECRUITMENT_SERVICE: 'Dịch vụ tuyển dụng',
  REFERRAL_SERVICE: 'Giới thiệu ứng viên',
};

/** Tone per JobOpening status. */
export const JOB_OPENING_STATUS_TONES: Readonly<Record<JobOpeningLifecycleStatus, 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER'>> = {
  DRAFT: 'NEUTRAL',
  OPEN: 'SUCCESS',
  CLOSING_SOON: 'WARN',
  CLOSED: 'NEUTRAL',
  FILLED: 'SUCCESS',
  CANCELLED: 'DANGER',
};

/**
 * Lookup helper. Returns the operator-facing Vietnamese label for a
 * JobOpening status. Falls back to the canonical enum value
 * (KEEP_CANONICAL_IDENTIFIER) if the value is missing.
 */
export function jobOpeningStatusLabel(status: string): string {
  return JOB_OPENING_STATUS_LABELS[status as JobOpeningLifecycleStatus] ?? 'Không xác định';
}

export function jobOpeningStatusTone(status: string): 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER' {
  return JOB_OPENING_STATUS_TONES[status as JobOpeningLifecycleStatus] ?? 'NEUTRAL';
}

/**
 * Lookup helper for the `JobOpening.serviceModel` enum. Returns
 * `Tại nơi làm việc` / `Từ xa`. Falls back to canonical enum.
 */
export function jobOpeningServiceModelLabel(serviceModel: string | null | undefined): string {
  if (serviceModel === null || serviceModel === undefined || serviceModel === '') return '';
  return JOB_OPENING_SERVICE_MODEL_LABELS[
    serviceModel as keyof typeof JOB_OPENING_SERVICE_MODEL_LABELS
  ] ?? 'Chưa phân loại';
}

/** Stable module identifier for `<StatusBadge module="job_opening" />`. */
export const JOB_OPENING_MODULE = 'job_opening' as const;
