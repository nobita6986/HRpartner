/**
 * action-dictionary.ts — T1B Wave 1 Foundation shared action labels.
 *
 * Binding per EP §3.3 (T0 §2 #2). F11 frozen business-button literals
 * (`Công bố dự án` / `Bỏ công bố dự án`) are NOT in this dictionary — they
 * live directly on the Project-level buttons and are static-fenced by
 * `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts`.
 *
 * Canonical action key (`Publish`, `Unpublish`, `Archive`, etc.) NEVER changes —
 * only the operator-facing Vietnamese display label changes.
 */

export type ActionCode =
  // JobPosting display labels (T0 §2 #2; canonical lifecycle operation unchanged)
  | 'publish'
  | 'unpublish'
  | 'archive'
  // JobOpening
  | 'open_opening'
  | 'close_opening'
  // StaffingOrder / JobOpening
  | 'cancel'
  // Common
  | 'save'
  | 'create'
  | 'update'
  // Assignment
  | 'claim'
  | 'assign'
  // Attendance
  | 'resolve'
  | 'approve'
  | 'adjustment'
  | 'add_adjustment'
  // Reconciliation
  | 'dispute'
  | 'submit_dispute';

export const ACTION_LABELS: Readonly<Record<ActionCode, string>> = {
  // EP §3.3 #3 / #4 / #5 — JobPosting display labels (canonical operation unchanged)
  publish: 'Đăng tin',
  unpublish: 'Gỡ tin',
  archive: 'Lưu trữ',
  // EP §3.3 #6 / #7 — JobOpening
  open_opening: 'Mở đợt tuyển',
  close_opening: 'Đóng đợt tuyển',
  // EP §3.3 #8 — StaffingOrder / JobOpening
  cancel: 'Hủy',
  // EP §3.3 #9 / #10 / #11 — common
  save: 'Lưu',
  create: 'Tạo',
  update: 'Cập nhật',
  // EP §3.3 #12 / #13 — assignment
  claim: 'Nhận phụ trách',
  assign: 'Phân công',
  // EP §3.3 #14 / #15 / #16 / #19 — attendance
  resolve: 'Xử lý',
  approve: 'Duyệt',
  adjustment: 'Điều chỉnh',
  add_adjustment: '+ Tạo điều chỉnh',
  // EP §3.3 #17 / #18 — reconciliation
  dispute: 'Tranh chấp',
  submit_dispute: 'Gửi tranh chấp',
};

/**
 * Lookup helper. Returns the binding Vietnamese label for an action code.
 * Falls back to the canonical code itself if the entry is missing.
 */
export function actionLabel(code: ActionCode): string {
  return ACTION_LABELS[code] ?? code;
}