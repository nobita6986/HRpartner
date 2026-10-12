/**
 * staffing-order-ui.ts — T1B Wave 2 module-owned StaffingOrder status dictionary.
 *
 * Authority binding (do NOT reopen):
 * - docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md §3.1 #3, #4
 * - docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md §3
 * - Cross-module terms `staffing_order` (label "Nhu cầu tuyển dụng") and
 *   `staffing_order_slot` (label "Vị trí cần tuyển") live in
 *   src/shared/i18n/glossary.ts.
 *
 * Architecture rule (EP §4.2 / §4.3):
 * - This file owns ONLY StaffingOrder status labels.
 * - No global aggregator; consumers import this dictionary directly.
 * - Tone map mirrors the inline `STATUS_CONFIG` baseline used at
 *   `app/admin/staffing/staffing-list-client.tsx:23-28` so visual contract
 *   is preserved.
 */

export type StaffingOrderLifecycleStatus = 'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'CANCELLED';

/** Status labels mirror the existing inline `STATUS_CONFIG` in `staffing-list-client.tsx` (now routed through this dictionary). */
export const STAFFING_ORDER_STATUS_LABELS: Readonly<Record<StaffingOrderLifecycleStatus, string>> = {
  OPEN: 'Mở',
  CLOSING_SOON: 'Sắp đóng',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
};

/** Tone per StaffingOrder status (matches inline `STATUS_CONFIG` colors). */
export const STAFFING_ORDER_STATUS_TONES: Readonly<Record<StaffingOrderLifecycleStatus, 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER'>> = {
  OPEN: 'SUCCESS',
  CLOSING_SOON: 'WARN',
  CLOSED: 'NEUTRAL',
  CANCELLED: 'DANGER',
};

/**
 * Lookup helper. Returns the operator-facing Vietnamese label for a
 * StaffingOrder status. Falls back to the canonical enum value
 * (KEEP_CANONICAL_IDENTIFIER) if the value is missing.
 */
export function staffingOrderStatusLabel(status: string): string {
  return STAFFING_ORDER_STATUS_LABELS[status as StaffingOrderLifecycleStatus] ?? 'Không xác định';
}

export function staffingOrderStatusTone(status: string): 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER' {
  return STAFFING_ORDER_STATUS_TONES[status as StaffingOrderLifecycleStatus] ?? 'NEUTRAL';
}

/** Stable module identifier for `<StatusBadge module="staffing_order" />`. */
export const STAFFING_ORDER_MODULE = 'staffing_order' as const;
