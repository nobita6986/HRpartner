import { actionLabel } from './action-dictionary';
import { formLabel } from './form-dictionary';

const STATEMENT_LABEL = 'Bảng đối soát';
const GENERATE_FROM_TIMESHEET_LABEL = 'Tạo từ Timesheet';

export const RECONCILIATION_STATEMENT_STATUS_LABELS = {
  DRAFT: 'Bản nháp',
  SENT: 'Đã gửi',
  DISPUTED: 'Đang tranh chấp',
  CONFIRMED: 'Đã xác nhận',
  LOCKED: 'Đã khóa',
  PAID: 'Đã thanh toán',
} as const;

export const RECONCILIATION_STATEMENT_KIND_LABELS = {
  VENDOR: 'Nhà cung cấp',
  CLIENT: 'Khách hàng',
} as const;

export const RECONCILIATION_LABELS = {
  heading: 'Đối soát (Reconciliation)',
  summary: 'Module M4 + M8 — slice 4C · F00A 09:30–13:00 · Bảng lương 2 kỳ + Lợi nhuận + Tranh chấp',
  statement: STATEMENT_LABEL,
  generateFromTimesheet: GENERATE_FROM_TIMESHEET_LABEL,
  margin: 'Lợi nhuận',
  kind: 'Loại',
  party: 'Đối tác',
  period: 'Kỳ',
  amountVnd: 'Số tiền (VNĐ)',
  status: formLabel('status'),
  dispute: actionLabel('dispute'),
  slaDeadline: 'Hạn SLA',
  actions: formLabel('action'),
  emptyStatements: `Chưa có bảng đối soát nào. Tạo từ tab ${GENERATE_FROM_TIMESHEET_LABEL}.`,
  generateLockedHeading: 'Tạo bảng đối soát từ Timesheet (đã khóa)',
  generateLockedDescription: 'Tạo Bảng đối soát NCC + Bảng đối soát Khách hàng từ Kỳ Timesheet đã khóa.',
  generateStatements: 'Tạo Bảng đối soát NCC + Khách hàng',
  generating: 'Đang tạo…',
  marginBreakdown: 'Phân tích lợi nhuận',
  viewMargin: 'Xem lợi nhuận',
  loading: 'Đang tải…',
  vendorPayable: 'Phải trả NCC',
  clientReceivable: 'Phải thu khách hàng',
  disputeStatement: `${actionLabel('dispute')} ${STATEMENT_LABEL}`,
  disputeCount: 'Số tranh chấp hiện tại',
  attachmentUrl: 'URL tài liệu đính kèm (tuỳ chọn)',
  disputePlaceholder: 'Ví dụ: Số giờ không khớp với check-in thực tế',
  reasonRequired: formLabel('reason_required'),
  periodPrompt: 'Nhập mã kỳ Timesheet (từ tab Chấm công):',
  cannotLoadStatements: 'Không thể tải danh sách bảng đối soát.',
  networkError: 'Lỗi kết nối mạng.',
  generatedSuccessfully: 'Đã tạo bảng đối soát thành công.',
  cancel: actionLabel('cancel'),
  submitDispute: actionLabel('submit_dispute'),
} as const;

export function reconciliationStatementStatusLabel(value: string): string {
  return RECONCILIATION_STATEMENT_STATUS_LABELS[value as keyof typeof RECONCILIATION_STATEMENT_STATUS_LABELS] ?? 'Trạng thái khác';
}

export function reconciliationStatementKindLabel(value: string): string {
  return RECONCILIATION_STATEMENT_KIND_LABELS[value as keyof typeof RECONCILIATION_STATEMENT_KIND_LABELS] ?? 'Loại đối tác khác';
}
