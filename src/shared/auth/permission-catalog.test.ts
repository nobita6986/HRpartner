/**
 * Permission Catalog test — Phase 1 identity-core (RQ-01, AC-01).
 */
import { describe, it, expect } from 'vitest';
import {
  PERMISSION_CATALOG,
  PERMISSION_CODE_SET,
  PERMISSION_GROUPS,
  isKnownPermissionCode,
  getPermissionDescriptor,
} from './permission-catalog';

describe('AC-01 — Catalog ≥10 codes + khớp DB seed (RQ-01)', () => {
  it('catalog có ≥10 codes (DEC-02)', () => {
    expect(PERMISSION_CATALOG.length).toBeGreaterThanOrEqual(10);
  });

  it('mỗi code có group + description đầy đủ', () => {
    for (const p of PERMISSION_CATALOG) {
      expect(p.code).toMatch(/^CAN_[A-Z0-9_]+$/);
      expect(Object.values(PERMISSION_GROUPS)).toContain(p.group);
      expect(p.description).toBeTruthy();
    }
  });

  it('code là duy nhất (không trùng)', () => {
    const codes = PERMISSION_CATALOG.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('PERMISSION_CODE_SET chứa đủ catalog', () => {
    for (const p of PERMISSION_CATALOG) {
      expect(PERMISSION_CODE_SET.has(p.code)).toBe(true);
    }
  });

  it('8 codes data-scope-security §4.2 + 2 codes Planner bổ sung', () => {
    const expectedSubset = [
      'CAN_MANAGE_PERMISSIONS',
      'CAN_CREATE_WORKER',
      'CAN_VIEW_UNASSIGNED_POOL',
      'CAN_APPROVE_PAYROLL',
      'CAN_FORCE_LOCK_STATEMENT',
      'CAN_OVERRIDE_REFERRAL_GUARD',
      'CAN_APPROVE_TICKET_LEVEL2',
      'CAN_EDIT_CONTRACT',
      'CAN_VIEW_WORKER_SENSITIVE', // Planner bổ sung
      'CAN_PROCESS_TICKET', // Planner bổ sung
    ];
    for (const c of expectedSubset) {
      expect(PERMISSION_CODE_SET.has(c), `thiếu code ${c}`).toBe(true);
    }
  });

  it('isKnownPermissionCode: code lạ → false', () => {
    expect(isKnownPermissionCode('CAN_FAKE')).toBe(false);
    expect(isKnownPermissionCode('')).toBe(false);
    expect(isKnownPermissionCode('CAN_APPROVE_PAYROLL')).toBe(true);
  });

  it('getPermissionDescriptor: known → trả đúng', () => {
    const d = getPermissionDescriptor('CAN_APPROVE_PAYROLL');
    expect(d.group).toBe(PERMISSION_GROUPS.PAYROLL);
    expect(d.description).toBeTruthy();
  });

  it('getPermissionDescriptor: unknown → throw ERROR', () => {
    expect(() => getPermissionDescriptor('CAN_FAKE')).toThrow(/UNKNOWN_PERMISSION_CODE/);
  });
});
