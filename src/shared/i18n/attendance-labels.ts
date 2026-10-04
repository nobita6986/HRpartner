import { actionLabel } from './action-dictionary';
import { formLabel } from './form-dictionary';
import { glossaryLabel } from './glossary';

const UNKNOWN_OWNER_LABEL = 'Khác';

export const ATTENDANCE_OWNER_LABELS = {
  ALL: 'Tất cả',
  KT: 'Kế toán',
  HR: 'Nhân sự',
  PM: 'Quản lý dự án',
} as const;

export const ATTENDANCE_BATCH_STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  PREVIEWED: 'Đã xem trước',
  COMMITTED: 'Đã ghi nhận',
  FAILED: 'Thất bại',
} as const;

export const ATTENDANCE_PERIOD_STATUS_LABELS = {
  PENDING: 'Chưa duyệt',
  REVIEWED: 'Đã rà soát',
  APPROVED: 'Đã duyệt',
  LOCKED: 'Đã khóa',
} as const;

export const ATTENDANCE_SOURCE_LABELS = {
  CSV: 'Tệp CSV',
  XLSX: 'Tệp Excel (XLSX)',
} as const;

export const ATTENDANCE_LABELS = {
  heading: 'Chấm công',
  summary: 'Phân hệ M7 — quy trình 4B · F00A 06:20–08:30 · Nhập dữ liệu → phân loại → khóa kỳ',
  importBatch: 'Lô nhập dữ liệu',
  uploadCsv: 'Tải tệp CSV',
  batchEmpty: 'Chưa có lô nhập nào. Tải tệp CSV/XLSX để bắt đầu.',
  source: 'Nguồn',
  rows: 'Số dòng',
  matched: 'Đã khớp',
  unmatched: 'Chưa khớp',
  anomaly: 'Bất thường',
  employeeCode: 'Mã nhân viên',
  matchedWorkerId: 'Mã nhân viên (đã khớp)',
  periods: 'Kỳ công',
  periodEmpty: 'Chưa có kỳ công nào.',
  exceptions: 'Ngoại lệ công',
  exceptionSummary: 'Phân loại G29: 3 nhóm lỗi → 3 bộ phận xử lý (Kế toán / Nhân sự / Quản lý dự án)',
  exceptionEmpty: 'Không có ngoại lệ nào.',
  unmatchedRow: 'Xử lý dòng chưa khớp',
  rawEmployeeCode: 'Mã nhân viên (dữ liệu gốc)',
  lineNumber: 'Dòng',
  id: formLabel('code'),
  uploadTitle: 'Tải tệp chấm công',
  uploadDescription: 'Chức năng tải tệp CSV/XLSX (API /api/attendance/import).',
  deltaHours: 'Số giờ chênh (dương = +, âm = -)',
  reasonRequired: formLabel('reason_required'),
  adjustmentExample: 'Ví dụ: đi muộn 30 phút do tắc đường',
  missingEmployeeCode: 'Nhập mã nhân viên.',
  missingReason: 'Nhập lý do (bắt buộc).',
  adjustmentFailed: 'Không thể tạo điều chỉnh.',
  resolveFailed: 'Không thể xử lý dòng chưa khớp.',
  loadBatchesFailed: 'Không thể tải danh sách lô nhập.',
  loadPeriodsFailed: 'Không thể tải danh sách kỳ công.',
  loadExceptionsFailed: 'Không thể tải danh sách ngoại lệ.',
  networkError: 'Lỗi kết nối mạng.',
  month: 'Tháng',
  statusPrefix: 'Trạng thái',
  lockedPeriodNote: 'Kỳ đã khóa là bất biến — cần mở lại trước.',
  unknownOwner: 'Khác',
  status: formLabel('status'),
  action: formLabel('action'),
  date: formLabel('date'),
  time: formLabel('time'),
  workerId: glossaryLabel('worker_id'),
  resolve: actionLabel('resolve'),
  approve: actionLabel('approve'),
  cancel: actionLabel('cancel'),
  addAdjustment: actionLabel('add_adjustment'),
  createAdjustment: `${actionLabel('create')} điều chỉnh`,
} as const;

export function attendanceOwnerLabel(value: string): string {
  return ATTENDANCE_OWNER_LABELS[value as keyof typeof ATTENDANCE_OWNER_LABELS] ?? UNKNOWN_OWNER_LABEL;
}

export function attendanceBatchStatusLabel(value: string): string {
  return ATTENDANCE_BATCH_STATUS_LABELS[value as keyof typeof ATTENDANCE_BATCH_STATUS_LABELS] ?? 'Trạng thái khác';
}

export function attendancePeriodStatusLabel(value: string): string {
  return ATTENDANCE_PERIOD_STATUS_LABELS[value as keyof typeof ATTENDANCE_PERIOD_STATUS_LABELS] ?? 'Trạng thái khác';
}

export function attendanceSourceLabel(value: string): string {
  return ATTENDANCE_SOURCE_LABELS[value as keyof typeof ATTENDANCE_SOURCE_LABELS] ?? 'Nguồn khác';
}
