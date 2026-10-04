import type { ApplicantSignalKey } from '@/src/domains/talent/labor-profile.types';
import {
  IDENTITY_VERIFICATION_LABELS,
  identityVerificationTone,
} from '@/src/domains/talent/identity-verification-ui';

export { IDENTITY_VERIFICATION_LABELS, identityVerificationTone };

export function laborProfileIdentityVerificationLabel(value: string | null | undefined): string {
  if (!value) return 'Chưa xác định';
  if (value === 'UNVERIFIED') return 'Chưa xác minh';
  return IDENTITY_VERIFICATION_LABELS[value] ?? 'Trạng thái xác minh khác';
}

const LABOR_PROFILE_COMPLETENESS_LABELS: Readonly<Record<string, string>> = {
  MINIMAL: 'Cơ bản',
  FULL: 'Đầy đủ',
  COMPLETE: 'Đầy đủ',
};

export function laborProfileCompletenessTone(value: string | null | undefined): 'NEUTRAL' | 'SUCCESS' | 'WARN' {
  if (value === 'FULL' || value === 'COMPLETE') return 'SUCCESS';
  if (value === 'MINIMAL') return 'WARN';
  return 'NEUTRAL';
}

export function laborProfileCompletenessLabel(value: string | null | undefined): string {
  if (!value) return 'Chưa xác định';
  return LABOR_PROFILE_COMPLETENESS_LABELS[value] ?? 'Mức độ hoàn thiện khác';
}

const LABOR_PROFILE_INTAKE_CHANNEL_LABELS: Readonly<Record<string, string>> = {
  PUBLIC_MARKETPLACE: 'Sàn tuyển dụng công khai',
  STAFF_INTAKE: 'Nhân viên tiếp nhận',
  PARTNER_INTAKE: 'Đối tác tiếp nhận',
  ADMIN_INTAKE: 'Quản trị viên tiếp nhận',
};

export function laborProfileIntakeChannelLabel(value: string | null | undefined): string {
  if (!value) return 'Không rõ nguồn tiếp nhận';
  return LABOR_PROFILE_INTAKE_CHANNEL_LABELS[value] ?? 'Nguồn tiếp nhận khác';
}

const PLACEMENT_CASE_STATUS_LABELS: Readonly<Record<string, string>> = {
  OPEN: 'Đang mở',
  IN_PROGRESS: 'Đang xử lý',
  READY_TO_PLACE: 'Sẵn sàng bố trí việc làm',
  CLOSED: 'Đã đóng',
};

export function placementCaseStatusLabel(value: string | null | undefined): string {
  if (!value) return 'Chưa xác định';
  return PLACEMENT_CASE_STATUS_LABELS[value] ?? 'Trạng thái khác';
}

const HANDLING_ASSIGNMENT_STATUS_LABELS: Readonly<Record<string, string>> = {
  ACTIVE: 'Đang hiệu lực',
  COMPLETED: 'Đã hoàn tất',
  EXPIRED: 'Đã hết hạn',
  TRANSFERRED: 'Đã chuyển giao',
  REVOKED: 'Đã thu hồi',
};

export function handlingAssignmentStatusLabel(value: string | null | undefined): string {
  if (!value) return 'Chưa xác định';
  return HANDLING_ASSIGNMENT_STATUS_LABELS[value] ?? 'Trạng thái khác';
}

const HANDLING_ASSIGNMENT_SOURCE_LABELS: Readonly<Record<string, string>> = {
  AFF_INITIAL: 'Giao ban đầu qua tiếp thị liên kết',
  MANAGER_ASSIGNMENT: 'Quản lý giao',
  CASE_RESOLUTION: 'Xử lý trường hợp',
};

export function handlingAssignmentSourceLabel(value: string | null | undefined): string {
  if (!value) return 'Không rõ nguồn giao';
  return HANDLING_ASSIGNMENT_SOURCE_LABELS[value] ?? 'Nguồn giao khác';
}

const APPLICANT_SIGNAL_LABELS: Readonly<Record<ApplicantSignalKey, string>> = {
  normalizedPhone: 'Số điện thoại',
  cccdNumber: 'Số CCCD',
  fullName: 'Họ và tên',
  dateOfBirth: 'Ngày sinh',
};

export function applicantSignalLabel(value: string): string {
  return APPLICANT_SIGNAL_LABELS[value as ApplicantSignalKey] ?? 'Thông tin khác';
}
