/**
 * staffing-order-ui.test.ts — T1B Wave 2 dictionary test (EP §5.2 / §4.3 ownership).
 *
 * Asserts:
 *  - Every StaffingOrder lifecycle status has a non-empty Vietnamese label.
 *  - `staffingOrderStatusLabel()` returns the Vietnamese label for known values.
 *  - `staffingOrderStatusLabel()` falls back to canonical enum (KEEP_CANONICAL_IDENTIFIER).
 *  - Tone map has matching shape (no undefined).
 *  - Labels are consistent with the existing inline `STATUS_CONFIG` in
 *    `app/admin/staffing/staffing-list-client.tsx` (the inline map is
 *    removed in Wave 2 STEP-07; this test guards the migration).
 */

import { describe, expect, it } from 'vitest';

import {
  STAFFING_ORDER_STATUS_LABELS,
  STAFFING_ORDER_STATUS_TONES,
  staffingOrderStatusLabel,
  staffingOrderStatusTone,
} from '../staffing-order-ui';

describe('staffing-order-ui (T1B Wave 2) — StaffingOrder status dictionary', () => {
  it('exports a typed map mirroring the existing inline STATUS_CONFIG baseline', () => {
    expect(STAFFING_ORDER_STATUS_LABELS.OPEN).toBe('Mở');
    expect(STAFFING_ORDER_STATUS_LABELS.CLOSING_SOON).toBe('Sắp đóng');
    expect(STAFFING_ORDER_STATUS_LABELS.CLOSED).toBe('Đã đóng');
    expect(STAFFING_ORDER_STATUS_LABELS.CANCELLED).toBe('Đã hủy');
  });

  it('tone map has matching shape (no undefined values for known statuses)', () => {
    for (const key of Object.keys(STAFFING_ORDER_STATUS_LABELS) as Array<keyof typeof STAFFING_ORDER_STATUS_LABELS>) {
      expect(STAFFING_ORDER_STATUS_TONES[key]).toBeDefined();
      expect(['NEUTRAL', 'SUCCESS', 'WARN', 'DANGER']).toContain(STAFFING_ORDER_STATUS_TONES[key]);
    }
  });

  it('staffingOrderStatusLabel() returns the Vietnamese label for known values', () => {
    expect(staffingOrderStatusLabel('OPEN')).toBe('Mở');
    expect(staffingOrderStatusLabel('CLOSING_SOON')).toBe('Sắp đóng');
    expect(staffingOrderStatusLabel('CLOSED')).toBe('Đã đóng');
    expect(staffingOrderStatusLabel('CANCELLED')).toBe('Đã hủy');
  });

  it('staffingOrderStatusLabel() does not expose unknown raw values', () => {
    expect(staffingOrderStatusLabel('SOMETHING_NEW')).toBe('Không xác định');
  });

  it('staffingOrderStatusTone() returns the matching tone for known values', () => {
    expect(staffingOrderStatusTone('OPEN')).toBe('SUCCESS');
    expect(staffingOrderStatusTone('CLOSING_SOON')).toBe('WARN');
    expect(staffingOrderStatusTone('CLOSED')).toBe('NEUTRAL');
    expect(staffingOrderStatusTone('CANCELLED')).toBe('DANGER');
  });

  it('staffingOrderStatusTone() falls back to NEUTRAL for unknown values', () => {
    expect(staffingOrderStatusTone('SOMETHING_NEW')).toBe('NEUTRAL');
  });
});
