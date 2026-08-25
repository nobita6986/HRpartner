/**
 * placement-ui — MP-3C STEP-07 (RQ-09) UI decision logic, extracted so it is
 * unit-testable without a DOM.
 *
 * The action matrix here MIRRORS the server gates and must stay in sync:
 *   screen   -> ADMIN/HR_MANAGER/SALE, from NEW|NEEDS_INFO        (screening.service)
 *   qualify  -> ADMIN/HR_MANAGER,      from SCREENING             (screening.service)
 *   reject   -> ADMIN/HR_MANAGER,      from NEW|NEEDS_INFO|SCREENING|QUALIFIED
 *   convert  -> ADMIN/HR_MANAGER,      from QUALIFIED             (conversion.service)
 *   placement-> ADMIN/HR_MANAGER,      from CONVERTED             (assignment-placement.service)
 *
 * The UI is a convenience, never the authority: the server re-checks every gate.
 */

export type AppStatus =
  | 'NEW' | 'NEEDS_INFO' | 'SCREENING' | 'QUALIFIED'
  | 'REJECTED' | 'WITHDRAWN' | 'CONVERTED' | 'MERGED';

export type ActionId = 'screen' | 'qualify' | 'reject' | 'convert' | 'placement';

export const STATUS_LABELS: Readonly<Record<string, string>> = {
  NEW: 'Mới', NEEDS_INFO: 'Cần bổ sung', SCREENING: 'Đang xét', QUALIFIED: 'Đạt',
  REJECTED: 'Từ chối', WITHDRAWN: 'Đã rút', CONVERTED: 'Đã nhận', MERGED: 'Đã gộp',
};

export const SOURCE_LABELS: Readonly<Record<string, string>> = {
  PUBLIC: 'Công khai', VENDOR: 'NCC', CTV: 'CTV',
};

export const ACTION_LABELS: Readonly<Record<ActionId, string>> = {
  screen: 'Bắt đầu xét', qualify: 'Đánh giá đạt', reject: 'Từ chối',
  convert: 'Nhận vào (tạo Worker)', placement: 'Xếp vào slot',
};

const ACTION_ROLES: Readonly<Record<ActionId, readonly string[]>> = {
  screen: ['ADMIN', 'HR_MANAGER', 'SALE'],
  qualify: ['ADMIN', 'HR_MANAGER'],
  reject: ['ADMIN', 'HR_MANAGER'],
  convert: ['ADMIN', 'HR_MANAGER'],
  placement: ['ADMIN', 'HR_MANAGER'],
};

const ACTION_FROM: Readonly<Record<ActionId, readonly AppStatus[]>> = {
  screen: ['NEW', 'NEEDS_INFO'],
  qualify: ['SCREENING'],
  reject: ['NEW', 'NEEDS_INFO', 'SCREENING', 'QUALIFIED'],
  convert: ['QUALIFIED'],
  placement: ['CONVERTED'],
};

const ACTION_ORDER: readonly ActionId[] = ['screen', 'qualify', 'convert', 'placement', 'reject'];

export interface ActionSubject {
  status: string;
  /** An existing placement hides the placement action (already assigned). */
  hasAssignment?: boolean;
}

export function isActionAvailable(action: ActionId, subject: ActionSubject, role: string): boolean {
  if (!ACTION_ROLES[action].includes(role)) return false;
  if (!ACTION_FROM[action].includes(subject.status as AppStatus)) return false;
  if (action === 'placement' && subject.hasAssignment) return false;
  return true;
}

/** Actions offered for this status/role, in a stable display order. */
export function availableActions(subject: ActionSubject, role: string): ActionId[] {
  return ACTION_ORDER.filter((action) => isActionAvailable(action, subject, role));
}

/** Roles that may read the queue at all (DEC-06 — server is the authority). */
export const QUEUE_ROLES: readonly string[] = ['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE'];

export function canReadQueue(role: string): boolean {
  return QUEUE_ROLES.includes(role);
}

// ─── Conflict presentation ───────────────────────────────────────────────────

export const CONFLICT_LABELS: Readonly<Record<string, string>> = {
  CONVERSION_INVARIANT_BROKEN: 'Hồ sơ chưa đủ điều kiện xếp việc (chưa nhận vào / thiếu slot / thiếu nguồn)',
  ASSIGNMENT_EXISTS: 'Hồ sơ này đã được xếp việc',
  ACTIVE_ASSIGNMENT_CONFLICT: 'Người này đang có assignment ACTIVE — cần dùng luồng chuyển dự án',
  SLOT_UNAVAILABLE: 'Slot không nhận được người (đóng / hết hạn / đã đủ)',
  PROJECT_QUOTA_FULL: 'Dự án đã đủ quota',
  EMPLOYEE_CODE_CONFLICT: 'Mã nhân viên đã dùng trong dự án này',
  REFERRAL_GUARD_BLOCKED: 'Referral Guard chặn — cần override S1/S2/S3 nếu có quyền',
  IDEMPOTENCY_REQUIRED: 'Thiếu Idempotency-Key',
  IDEMPOTENCY_CONFLICT: 'Cùng Idempotency-Key nhưng payload khác — hãy tạo lại preview',
  OVERRIDE_DENIED: 'Không được phép override',
  ASSIGNMENT_CONFLICT: 'Có thao tác song song — hãy tạo lại preview',
  FORBIDDEN: 'Không có quyền thực hiện',
  NOT_FOUND: 'Không tìm thấy hồ sơ',
  VALIDATION: 'Dữ liệu nhập chưa hợp lệ',
  DEDUP_REVIEW_REQUIRED: 'Có Worker trùng — cần HR xác nhận chọn đúng người',
  DEDUP_SELECTION_INVALID: 'Worker đã chọn không nằm trong danh sách trùng',
  STALE_VERSION: 'Hồ sơ vừa bị thay đổi — hãy tải lại',
};

export function conflictLabel(code: string | null | undefined): string {
  if (!code) return 'Lỗi không xác định';
  return CONFLICT_LABELS[code] ?? code;
}

/** Codes that a permitted S1/S2/S3 override can clear. */
export function isOverridable(code: string): boolean {
  return code === 'REFERRAL_GUARD_BLOCKED';
}

export const OVERRIDE_CASES = ['S1', 'S2', 'S3'] as const;
export type OverrideCaseId = (typeof OVERRIDE_CASES)[number];

export const OVERRIDE_CASE_LABELS: Readonly<Record<OverrideCaseId, string>> = {
  S1: 'S1 — NCC xác nhận nhường nguồn',
  S2: 'S2 — Khách hàng/PM xác nhận',
  S3: 'S3 — Ban giám đốc phê duyệt',
};

// ─── Submit gating (RQ-09: no double-submit, no stale success) ───────────────

export interface PlacementFormState {
  employeeCode: string;
  employmentType: string;
  validFrom: string;
  validTo?: string;
  workSetting?: string;
}

export interface SubmitGate {
  disabled: boolean;
  /** Why the button is disabled — rendered as help text. */
  hint: string | null;
}

export function previewSubmitGate(form: PlacementFormState, pending: boolean): SubmitGate {
  if (pending) return { disabled: true, hint: 'Đang kiểm tra…' };
  if (!form.employeeCode.trim()) return { disabled: true, hint: 'Nhập mã nhân viên tại dự án.' };
  if (!form.employmentType.trim()) return { disabled: true, hint: 'Chọn loại hình làm việc.' };
  if (!form.validFrom.trim()) return { disabled: true, hint: 'Chọn ngày bắt đầu.' };
  return { disabled: false, hint: null };
}

export interface ActivateGateInput {
  /** Preview result currently displayed; null means "no preview yet". */
  preview: { canActivate: boolean; conflicts: Array<{ code: string }> } | null;
  reason: string;
  pending: boolean;
  /** Form was edited after the preview was fetched -> preview is stale. */
  dirtySincePreview: boolean;
  override: { overrideCase: string; reason: string } | null;
  canOverride: boolean;
}

/**
 * Activation is offered only when a FRESH preview says so (or the single blocking
 * conflict is an override the caller is allowed to file). A stale preview always
 * forces a re-check — the server would reject it anyway (DEC-03).
 */
export function activateGate(input: ActivateGateInput): SubmitGate {
  if (input.pending) return { disabled: true, hint: 'Đang xử lý…' };
  if (!input.preview) return { disabled: true, hint: 'Hãy xem trước (preview) trước khi xếp việc.' };
  if (input.dirtySincePreview) return { disabled: true, hint: 'Thông tin đã đổi — hãy xem trước lại.' };
  if (!input.reason.trim()) return { disabled: true, hint: 'Nhập lý do xếp việc.' };

  if (!input.preview.canActivate) {
    const codes = input.preview.conflicts.map((c) => c.code);
    const onlyGuardBlocks = codes.length > 0 && codes.every(isOverridable);
    if (!onlyGuardBlocks) return { disabled: true, hint: 'Còn xung đột chưa xử lý được.' };
    if (!input.canOverride) return { disabled: true, hint: 'Referral Guard chặn và bạn không có quyền override.' };
    if (!input.override?.overrideCase) return { disabled: true, hint: 'Chọn case override S1/S2/S3.' };
    if (!input.override.reason.trim()) return { disabled: true, hint: 'Nhập lý do override.' };
  }
  return { disabled: false, hint: null };
}

// ─── Idempotency key (DEC-08) ───────────────────────────────────────────────

/**
 * One key per activation attempt. A retry of the SAME attempt reuses the key so
 * the server replays instead of double-writing; editing the form mints a new one.
 */
export function newIdempotencyKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return `mp3c-${c.randomUUID()}`;
  return `mp3c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** `datetime-local` value -> ISO string the API accepts. */
export function toIsoOrEmpty(local: string | undefined | null): string {
  const raw = (local ?? '').trim();
  if (!raw) return '';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function formatCounter(filled: number, capacity: number): string {
  return `${filled}/${capacity}`;
}
