import { describe, expect, it } from 'vitest';
import {
  applicantSignalLabel,
  handlingAssignmentSourceLabel,
  handlingAssignmentStatusLabel,
  laborProfileIdentityVerificationLabel,
  laborProfileCompletenessLabel,
  laborProfileCompletenessTone,
  laborProfileIntakeChannelLabel,
  placementCaseStatusLabel,
} from '../labor-profile-ui';

describe('labor-profile UI labels', () => {
  it('localizes every supported identity-verification value without raw fallbacks', () => {
    expect(laborProfileIdentityVerificationLabel('UNVERIFIED')).toBe('Chưa xác minh');
    expect(laborProfileIdentityVerificationLabel('VERIFIED')).toBe('Đã xác minh');
    expect(laborProfileIdentityVerificationLabel('PENDING')).toBe('Đang chờ xác minh');
    expect(laborProfileIdentityVerificationLabel('REJECTED')).toBe('Bị từ chối');
    expect(laborProfileIdentityVerificationLabel('FUTURE_STATUS')).toBe('Trạng thái xác minh khác');
    expect(laborProfileIdentityVerificationLabel(null)).toBe('Chưa xác định');
  });

  it('localizes LaborProfile completeness and intake channels', () => {
    expect(laborProfileCompletenessLabel('MINIMAL')).toBe('Cơ bản');
    expect(laborProfileCompletenessLabel('FULL')).toBe('Đầy đủ');
    expect(laborProfileCompletenessTone('FULL')).toBe('SUCCESS');
    expect(laborProfileCompletenessLabel('COMPLETE')).toBe('Đầy đủ');
    expect(laborProfileIntakeChannelLabel('ADMIN_INTAKE')).toBe('Quản trị viên tiếp nhận');
    expect(laborProfileIntakeChannelLabel('FUTURE_CHANNEL')).toBe('Nguồn tiếp nhận khác');
  });

  it('localizes placement, assignment, and duplicate-match values', () => {
    expect(placementCaseStatusLabel('READY_TO_PLACE')).toBe('Sẵn sàng bố trí việc làm');
    expect(handlingAssignmentStatusLabel('REVOKED')).toBe('Đã thu hồi');
    expect(handlingAssignmentSourceLabel('CASE_RESOLUTION')).toBe('Xử lý trường hợp');
    expect(applicantSignalLabel('normalizedPhone')).toBe('Số điện thoại');
    expect(applicantSignalLabel('futureSignal')).toBe('Thông tin khác');
  });
});
