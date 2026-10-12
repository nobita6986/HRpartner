/**
 * job-opening-ui.test.ts — T1B Wave 2 dictionary test (EP §5.2 / §4.3 ownership).
 *
 * Asserts:
 *  - Every EP §3.2.2 JobOpening lifecycle status has a non-empty Vietnamese label.
 *  - Every EP §3.2.11 serviceModel enum has a non-empty Vietnamese label.
 *  - `jobOpeningStatusLabel()` returns the Vietnamese label for known values.
 *  - `jobOpeningStatusLabel()` falls back to canonical enum (KEEP_CANONICAL_IDENTIFIER).
 *  - `jobOpeningServiceModelLabel()` handles null / unknown correctly.
 *  - Tone map has matching shape (no undefined).
 */

import { describe, expect, it } from 'vitest';

import {
  JOB_OPENING_SERVICE_MODEL_LABELS,
  JOB_OPENING_STATUS_LABELS,
  JOB_OPENING_STATUS_TONES,
  jobOpeningServiceModelLabel,
  jobOpeningStatusLabel,
  jobOpeningStatusTone,
} from '../job-opening-ui';

describe('job-opening-ui (T1B Wave 2) — JobOpening status dictionary', () => {
  it('exports a typed map for every EP §3.2.2 lifecycle status', () => {
    expect(JOB_OPENING_STATUS_LABELS.DRAFT).toBe('Bản nháp');
    expect(JOB_OPENING_STATUS_LABELS.OPEN).toBe('Đang mở');
    expect(JOB_OPENING_STATUS_LABELS.CLOSING_SOON).toBe('Sắp đóng');
    expect(JOB_OPENING_STATUS_LABELS.CLOSED).toBe('Đã đóng');
    expect(JOB_OPENING_STATUS_LABELS.FILLED).toBe('Đã đủ chỉ tiêu');
    expect(JOB_OPENING_STATUS_LABELS.CANCELLED).toBe('Đã hủy');
  });

  it('exports EP §3.2.11 serviceModel labels (onsite / remote)', () => {
    expect(JOB_OPENING_SERVICE_MODEL_LABELS.onsite).toBe('Tại nơi làm việc');
    expect(JOB_OPENING_SERVICE_MODEL_LABELS.remote).toBe('Từ xa');
    expect(JOB_OPENING_SERVICE_MODEL_LABELS.STAFFING_SUPPLY).toBe('Cung ứng nhân sự');
    expect(JOB_OPENING_SERVICE_MODEL_LABELS.LABOR_LEASING).toBe('Cho thuê lại lao động');
    expect(JOB_OPENING_SERVICE_MODEL_LABELS.RECRUITMENT_SERVICE).toBe('Dịch vụ tuyển dụng');
    expect(JOB_OPENING_SERVICE_MODEL_LABELS.REFERRAL_SERVICE).toBe('Giới thiệu ứng viên');
  });

  it('tone map has matching shape (no undefined values for known statuses)', () => {
    for (const key of Object.keys(JOB_OPENING_STATUS_LABELS) as Array<keyof typeof JOB_OPENING_STATUS_LABELS>) {
      expect(JOB_OPENING_STATUS_TONES[key]).toBeDefined();
      expect(['NEUTRAL', 'SUCCESS', 'WARN', 'DANGER']).toContain(JOB_OPENING_STATUS_TONES[key]);
    }
  });

  it('jobOpeningStatusLabel() returns the Vietnamese label for known values', () => {
    expect(jobOpeningStatusLabel('DRAFT')).toBe('Bản nháp');
    expect(jobOpeningStatusLabel('OPEN')).toBe('Đang mở');
    expect(jobOpeningStatusLabel('CLOSING_SOON')).toBe('Sắp đóng');
    expect(jobOpeningStatusLabel('CLOSED')).toBe('Đã đóng');
    expect(jobOpeningStatusLabel('FILLED')).toBe('Đã đủ chỉ tiêu');
    expect(jobOpeningStatusLabel('CANCELLED')).toBe('Đã hủy');
  });

  it('jobOpeningStatusLabel() does not expose unknown raw values', () => {
    expect(jobOpeningStatusLabel('SOMETHING_NEW')).toBe('Không xác định');
  });

  it('jobOpeningStatusTone() returns the matching tone for known values', () => {
    expect(jobOpeningStatusTone('OPEN')).toBe('SUCCESS');
    expect(jobOpeningStatusTone('CANCELLED')).toBe('DANGER');
    expect(jobOpeningStatusTone('CLOSING_SOON')).toBe('WARN');
  });

  it('jobOpeningStatusTone() falls back to NEUTRAL for unknown values', () => {
    expect(jobOpeningStatusTone('SOMETHING_NEW')).toBe('NEUTRAL');
  });

  it('jobOpeningServiceModelLabel() returns Vietnamese for known values', () => {
    expect(jobOpeningServiceModelLabel('onsite')).toBe('Tại nơi làm việc');
    expect(jobOpeningServiceModelLabel('remote')).toBe('Từ xa');
  });

  it('jobOpeningServiceModelLabel() returns empty string for null/undefined/empty (KEEP_CANONICAL_IDENTIFIER for nullable)', () => {
    expect(jobOpeningServiceModelLabel(null)).toBe('');
    expect(jobOpeningServiceModelLabel(undefined)).toBe('');
    expect(jobOpeningServiceModelLabel('')).toBe('');
  });

  it('jobOpeningServiceModelLabel() does not expose unknown raw values', () => {
    expect(jobOpeningServiceModelLabel('hybrid')).toBe('Chưa phân loại');
  });
});
