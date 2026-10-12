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

export function applicationStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? 'Không xác định';
}

export function applicationHistoryReasonLabel(reason: string): string {
  if (reason === 'PUBLIC_APPLY') return 'Ứng tuyển qua trang công khai';
  return /^[A-Z][A-Z0-9_]*$/.test(reason) ? 'Cập nhật trạng thái' : reason;
}

const ASSIGNMENT_STATUS_LABELS: Readonly<Record<string, string>> = {
  ACTIVE: 'Đang hiệu lực',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
};

export function assignmentStatusLabel(status: string): string {
  return ASSIGNMENT_STATUS_LABELS[status] ?? 'Không xác định';
}

const EMPLOYMENT_TYPE_LABELS: Readonly<Record<string, string>> = {
  HRP_EMPLOYED: 'Nhân sự HRP',
  OUTSOURCED: 'Thuê ngoài',
  REFERRED_OUT: 'Giới thiệu ra ngoài',
};

export function employmentTypeLabel(type: string): string {
  return EMPLOYMENT_TYPE_LABELS[type] ?? 'Không xác định';
}

export const SOURCE_LABELS: Readonly<Record<string, string>> = {
  PUBLIC: 'Công khai', VENDOR: 'Nhà cung cấp', CTV: 'Cộng tác viên',
};

const DEDUP_MATCH_LABELS: Readonly<Record<string, string>> = {
  CCCD: 'Số CCCD',
  PHONE: 'Số điện thoại',
  DEDUP_HINT: 'Thông tin liên quan',
};

export function dedupMatchLabel(field: string): string {
  return DEDUP_MATCH_LABELS[field] ?? 'Thông tin liên quan';
}

export const ACTION_LABELS: Readonly<Record<ActionId, string>> = {
  screen: 'Bắt đầu xét', qualify: 'Đánh giá đạt', reject: 'Từ chối',
  convert: 'Tiếp nhận ứng viên', placement: 'Bố trí việc làm',
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
  CONVERSION_INVARIANT_BROKEN: 'Hồ sơ chưa đủ điều kiện bố trí việc làm. Hãy kiểm tra trạng thái tiếp nhận, vị trí và thông tin nguồn.',
  ASSIGNMENT_EXISTS: 'Hồ sơ này đã được bố trí việc làm',
  ACTIVE_ASSIGNMENT_CONFLICT: 'Người lao động đang được bố trí tại dự án khác; cần dùng luồng chuyển dự án',
  SLOT_UNAVAILABLE: 'Vị trí cần tuyển không còn nhận hồ sơ (đã đóng, hết hạn hoặc đủ chỉ tiêu)',
  PROJECT_QUOTA_FULL: 'Dự án đã đủ số người cần tuyển',
  EMPLOYEE_CODE_CONFLICT: 'Mã nhân viên đã được dùng trong dự án này',
  REFERRAL_GUARD_BLOCKED: 'Nguồn giới thiệu cần được xác minh trước khi tiếp tục',
  IDEMPOTENCY_REQUIRED: 'Không thể xử lý yêu cầu này. Vui lòng thử lại',
  IDEMPOTENCY_CONFLICT: 'Thông tin đã thay đổi. Vui lòng tạo bản xem trước mới',
  OVERRIDE_DENIED: 'Bạn không có quyền thực hiện thao tác ngoại lệ',
  ASSIGNMENT_CONFLICT: 'Có thay đổi đồng thời. Vui lòng tạo bản xem trước mới',
  FORBIDDEN: 'Không có quyền thực hiện',
  NOT_FOUND: 'Không tìm thấy hồ sơ',
  VALIDATION: 'Dữ liệu nhập chưa hợp lệ',
  DEDUP_REVIEW_REQUIRED: 'Có hồ sơ người lao động trùng — cần xác nhận hồ sơ chính xác',
  DEDUP_SELECTION_INVALID: 'Hồ sơ đã chọn không nằm trong danh sách trùng',
  STALE_VERSION: 'Hồ sơ vừa được cập nhật — vui lòng tải lại',
};

export function conflictLabel(code: string | null | undefined): string {
  if (!code) return 'Không thể hoàn tất thao tác. Vui lòng thử lại.';
  return CONFLICT_LABELS[code] ?? 'Không thể hoàn tất thao tác. Vui lòng thử lại.';
}

/** Codes that a permitted S1/S2/S3 override can clear. */
export function isOverridable(code: string): boolean {
  return code === 'REFERRAL_GUARD_BLOCKED';
}

export const OVERRIDE_CASES = ['S1', 'S2', 'S3'] as const;
export type OverrideCaseId = (typeof OVERRIDE_CASES)[number];

export const OVERRIDE_CASE_LABELS: Readonly<Record<OverrideCaseId, string>> = {
  S1: 'Nhà cung cấp xác nhận nhường quyền giới thiệu',
  S2: 'Khách hàng hoặc quản lý dự án xác nhận',
  S3: 'Ban giám đốc phê duyệt',
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
  if (!input.preview) return { disabled: true, hint: 'Hãy xem trước thông tin trước khi bố trí việc làm.' };
  if (input.dirtySincePreview) return { disabled: true, hint: 'Thông tin đã đổi — hãy xem trước lại.' };
  if (!input.reason.trim()) return { disabled: true, hint: 'Nhập lý do xếp việc.' };

  if (!input.preview.canActivate) {
    const codes = input.preview.conflicts.map((c) => c.code);
    const onlyGuardBlocks = codes.length > 0 && codes.every(isOverridable);
    if (!onlyGuardBlocks) return { disabled: true, hint: 'Còn xung đột chưa xử lý được.' };
    if (!input.canOverride) return { disabled: true, hint: 'Nguồn giới thiệu cần được xác minh và bạn chưa có quyền thực hiện ngoại lệ.' };
    if (!input.override?.overrideCase) return { disabled: true, hint: 'Chọn trường hợp ngoại lệ phù hợp.' };
    if (!input.override.reason.trim()) return { disabled: true, hint: 'Nhập lý do thực hiện ngoại lệ.' };
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
