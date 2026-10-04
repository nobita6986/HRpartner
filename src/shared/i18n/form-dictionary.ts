/**
 * form-dictionary.ts — T1B Wave 1 Foundation shared common form/table labels.
 *
 * Wave 1 ships a subset of EP §3.5 (`form/table/presentation terms`) covering
 * the columns / cells actually rendered by `RoleGuardLayout` sidebar (L-004
 * default User), the role chip, and the static test reference. Domain pages
 * extend this set in Wave 2/3 via `src/shared/i18n/form-dictionary.ts` or via
 * their own module-owned file.
 *
 * Boundary rule: this file owns the COMMON labels (used by ≥ 2 modules) only.
 * Domain-specific labels (e.g. recruitment ticketing) live in domain-owned files.
 */

export const FORM_LABELS: Readonly<Record<string, string>> = {
  // EP §3.5 #7
  status: 'Trạng thái',
  // EP §3.5 #16 / #30
  action: 'Thao tác',
  // EP §3.5 #3 / #4
  created: 'Ngày tạo',
  updated: 'Ngày cập nhật',
  // EP §3.5 #8
  code: 'Mã',
  // name (common — no EP #)
  name: 'Tên',
  // EP §3.5 #21 / #22 / #35
  description: 'Mô tả',
  reason_required: 'Lý do (bắt buộc)',
  // EP §3.5 #9
  save: 'Lưu',
  // EP §3.5 #51
  cancel: 'Hủy',
  // search (common — no EP #)
  search: 'Tìm kiếm',
  // EP §3.5 #19 / #42
  date: 'Ngày',
  // EP §3.5 #20
  time: 'Giờ',
  // L-004 default user placeholder (admin-shell role chip fallback)
  default_user: 'Người dùng',
  // L-047 (binding per EP §3.5 #42 — explicit CCCD label)
  cccd_label: 'Số CCCD',
};

/**
 * Lookup helper. Returns the binding Vietnamese label for a common form/table
 * code. Falls back to the canonical code itself if the entry is missing — the
 * caller MUST treat the fallback as a Wave 1 contract violation and either
 * add the entry or open a T0 decision.
 */
export function formLabel(code: keyof typeof FORM_LABELS): string {
  return FORM_LABELS[code] ?? code;
}