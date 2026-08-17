/**
 * Taxonomy unit tests -- STEP-15 (AC-03).
 *
 * Verify 6 anomaly types G29 (DEC-11) classified correctly:
 *   FORMAT_ERROR / UNKNOWN_CODE / MISSING_PUNCH -> owner: KT
 *   DUPLICATE_CCCD -> owner: HR
 *   OUTSIDE_SHIFT / DUPLICATE_SCAN -> owner: PM
 *
 * Also verify 3 blockers D07:
 *   UNMATCHED_EMPLOYEE / SOURCE_CONFLICT / WRONG_PROJECT
 */

import { describe, it, expect } from 'vitest';
import { ANOMALY_TYPES, ANOMALY_OWNER, BLOCKER_TYPES } from './import.service';

describe('Taxonomy - 6 anomaly types G29', () => {

  it('ANOMALY_TYPES co dung 6 loai', () => {
    expect(ANOMALY_TYPES).toHaveLength(6);
    expect(ANOMALY_TYPES).toContain('FORMAT_ERROR');
    expect(ANOMALY_TYPES).toContain('UNKNOWN_CODE');
    expect(ANOMALY_TYPES).toContain('MISSING_PUNCH');
    expect(ANOMALY_TYPES).toContain('DUPLICATE_CCCD');
    expect(ANOMALY_TYPES).toContain('OUTSIDE_SHIFT');
    expect(ANOMALY_TYPES).toContain('DUPLICATE_SCAN');
  });

  it('FORMAT_ERROR -> owner KT', () => {
    expect(ANOMALY_OWNER['FORMAT_ERROR']).toBe('KT');
  });

  it('UNKNOWN_CODE -> owner KT', () => {
    expect(ANOMALY_OWNER['UNKNOWN_CODE']).toBe('KT');
  });

  it('MISSING_PUNCH -> owner KT', () => {
    expect(ANOMALY_OWNER['MISSING_PUNCH']).toBe('KT');
  });

  it('DUPLICATE_CCCD -> owner HR', () => {
    expect(ANOMALY_OWNER['DUPLICATE_CCCD']).toBe('HR');
  });

  it('OUTSIDE_SHIFT -> owner PM', () => {
    expect(ANOMALY_OWNER['OUTSIDE_SHIFT']).toBe('PM');
  });

  it('DUPLICATE_SCAN -> owner PM', () => {
    expect(ANOMALY_OWNER['DUPLICATE_SCAN']).toBe('PM');
  });

  it('Tat ca anomaly types co owner', () => {
    for (const t of ANOMALY_TYPES) {
      expect(ANOMALY_OWNER[t as keyof typeof ANOMALY_OWNER]).toBeDefined();
      expect(['KT', 'HR', 'PM']).toContain(ANOMALY_OWNER[t as keyof typeof ANOMALY_OWNER]);
    }
  });

  it('KT owner = FORMAT_ERROR + UNKNOWN_CODE + MISSING_PUNCH', () => {
    const ktTypes = ANOMALY_TYPES.filter(t => ANOMALY_OWNER[t as keyof typeof ANOMALY_OWNER] === 'KT');
    expect(ktTypes).toHaveLength(3);
    expect(ktTypes).toContain('FORMAT_ERROR');
    expect(ktTypes).toContain('UNKNOWN_CODE');
    expect(ktTypes).toContain('MISSING_PUNCH');
  });

  it('HR owner = DUPLICATE_CCCD', () => {
    const hrTypes = ANOMALY_TYPES.filter(t => ANOMALY_OWNER[t as keyof typeof ANOMALY_OWNER] === 'HR');
    expect(hrTypes).toHaveLength(1);
    expect(hrTypes[0]).toBe('DUPLICATE_CCCD');
  });

  it('PM owner = OUTSIDE_SHIFT + DUPLICATE_SCAN', () => {
    const pmTypes = ANOMALY_TYPES.filter(t => ANOMALY_OWNER[t as keyof typeof ANOMALY_OWNER] === 'PM');
    expect(pmTypes).toHaveLength(2);
    expect(pmTypes).toContain('OUTSIDE_SHIFT');
    expect(pmTypes).toContain('DUPLICATE_SCAN');
  });
});

describe('Taxonomy - blockers D07', () => {
  it('BLOCKER_TYPES co dung 3 loai', () => {
    expect(BLOCKER_TYPES).toHaveLength(3);
    expect(BLOCKER_TYPES).toContain('UNMATCHED_EMPLOYEE');
    expect(BLOCKER_TYPES).toContain('SOURCE_CONFLICT');
    expect(BLOCKER_TYPES).toContain('WRONG_PROJECT');
  });
});
