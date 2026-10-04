import { describe, expect, it } from 'vitest';

import {
  ATTENDANCE_BATCH_STATUS_LABELS,
  ATTENDANCE_OWNER_LABELS,
  ATTENDANCE_PERIOD_STATUS_LABELS,
  ATTENDANCE_SOURCE_LABELS,
  attendanceBatchStatusLabel,
  attendanceOwnerLabel,
  attendancePeriodStatusLabel,
  attendanceSourceLabel,
} from '@/src/shared/i18n/attendance-labels';

describe('attendance labels', () => {
  it('covers every canonical attendance status, source, and owner', () => {
    expect(Object.keys(ATTENDANCE_BATCH_STATUS_LABELS)).toEqual(['PENDING', 'PREVIEWED', 'COMMITTED', 'FAILED']);
    expect(Object.keys(ATTENDANCE_PERIOD_STATUS_LABELS)).toEqual(['PENDING', 'REVIEWED', 'APPROVED', 'LOCKED']);
    expect(Object.keys(ATTENDANCE_SOURCE_LABELS)).toEqual(['CSV', 'XLSX']);
    expect(Object.keys(ATTENDANCE_OWNER_LABELS)).toEqual(['ALL', 'KT', 'HR', 'PM']);

    for (const labels of [
      ATTENDANCE_BATCH_STATUS_LABELS,
      ATTENDANCE_PERIOD_STATUS_LABELS,
      ATTENDANCE_SOURCE_LABELS,
      ATTENDANCE_OWNER_LABELS,
    ]) {
      for (const label of Object.values(labels)) {
        expect(label.trim()).toBe(label);
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  it('translates known values and uses Vietnamese fallbacks', () => {
    expect(attendanceBatchStatusLabel('PENDING')).toBe('Chờ xử lý');
    expect(attendancePeriodStatusLabel('LOCKED')).toBe('Đã khóa');
    expect(attendanceSourceLabel('XLSX')).toBe('Tệp Excel (XLSX)');
    expect(attendanceOwnerLabel('HR')).toBe('Nhân sự');
    expect(attendanceOwnerLabel('UNKNOWN')).toBe('Khác');
    expect(attendanceBatchStatusLabel('UNKNOWN')).toBe('Trạng thái khác');
    expect(attendancePeriodStatusLabel('UNKNOWN')).toBe('Trạng thái khác');
    expect(attendanceSourceLabel('UNKNOWN')).toBe('Nguồn khác');
  });
});
