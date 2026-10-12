/**
 * role-labels.static.test.ts — Wave 1 Foundation shared role labels.
 *
 * Pure static tests: assert all 13 SystemRole values have a Vietnamese label
 * matching the binding from EP §3.4. No DOM, no React, no DB.
 */

import { describe, expect, it } from 'vitest';

import { ROLE_LABELS, roleLabel } from '@/src/shared/i18n/role-labels';

describe('shared/i18n/role-labels (Wave 1 Foundation)', () => {
  it('contains all 13 SystemRole entries from EP §3.4 binding', () => {
    expect(Object.keys(ROLE_LABELS)).toHaveLength(13);
  });

  it('every role has a non-empty Vietnamese label', () => {
    for (const [role, label] of Object.entries(ROLE_LABELS)) {
      expect(label.length, `label for ${role}`).toBeGreaterThan(0);
      expect(label.trim(), `label.trim for ${role}`).toBe(label);
    }
  });

  it('EP §3.4 binding spot checks', () => {
    expect(roleLabel('ADMIN')).toBe('Quản trị viên');
    expect(roleLabel('HR_MANAGER')).toBe('Quản lý nhân sự');
    expect(roleLabel('HR_STAFF')).toBe('Chuyên viên nhân sự');
    expect(roleLabel('ACCOUNTANT')).toBe('Kế toán');
    expect(roleLabel('PM')).toBe('PM');
    expect(roleLabel('SALE')).toBe('Sale');
    expect(roleLabel('DIRECTOR')).toBe('Giám đốc');
    expect(roleLabel('WORKER')).toBe('Người lao động');
    expect(roleLabel('MKT')).toBe('Marketing');
    expect(roleLabel('VENDOR_ADMIN')).toBe('Quản trị NCC');
    expect(roleLabel('VENDOR_STAFF')).toBe('Nhân viên NCC');
    expect(roleLabel('CTV')).toBe('Cộng tác viên');
    expect(roleLabel('EMPLOYEE')).toBe('Nhân viên');
  });

  it('PM and SALE keep their canonical token as operator-facing label per EP §3.4', () => {
    // Per EP §3.4: PM (canonical — keep); SALE (canonical — keep).
    expect(roleLabel('PM')).toBe('PM');
    expect(roleLabel('SALE')).toBe('Sale');
  });

  it('local Role.VENDOR alias maps to VENDOR_ADMIN label', () => {
    expect(roleLabel('VENDOR')).toBe('Quản trị NCC');
  });
});