/**
 * manifest.test.ts — V5-M1-09A / RQ-01/11/13 / STEP-01/STEP-08 / AC-01/10/12.
 *
 * Contract coverage cho projection manifest (source-of-truth khai báo). Chứng minh:
 *   - AC-10 (RQ-11): SYSTEM_ROLES ĐÚNG 13 role canonical (EV-14); mọi role được phân loại
 *     (có surface hoặc no-surface tường minh) → enum thêm/bớt role sẽ FAIL.
 *   - AC-01 (RQ-01): mỗi surface khai báo route/allowedRoles⊆roles/fieldGroups hợp lệ; không
 *     surface nhạy cảm nào thiếu manifest coverage; impl (worker-projection) khớp field-group count.
 *   - AC-12 (RQ-13): PAYMENT_PROJECTION = SCHEMA_NOT_AVAILABLE, defer M8-06, KHÔNG mock-pass.
 *   - cccdChipData nằm DUY NHẤT trong WORKER_CHIP_RAW (always-omit, DEC-05), không lẫn nhóm khác.
 */
import { describe, it, expect } from 'vitest';
import {
  SYSTEM_ROLES,
  PROJECTION_SURFACES,
  PAYMENT_PROJECTION,
  WORKER_CORE_FIELDS,
  WORKER_CONTACT_FIELDS,
  WORKER_SENSITIVE_MASKED_FIELDS,
  WORKER_SENSITIVE_ISSUED_FIELDS,
  WORKER_CHIP_RAW_FIELDS,
  PAYSLIP_SELF_FINANCIAL_FIELDS,
  WITHDRAWAL_SELF_BANK_FIELDS,
  PAYROLL_CONFIG_OPERATIONAL_FIELDS,
} from '@/src/shared/projection/manifest';
import { WORKER_MASKED_FIELD_COUNT, WORKER_ISSUED_FIELD_COUNT } from '@/src/shared/auth/worker-projection';

// EV-14 canonical 13 SystemRole — hardcode để phát hiện enum drift (không đọc lại từ nguồn đang test).
const EXPECTED_ROLES = [
  'ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF', 'SALE', 'PM', 'ACCOUNTANT', 'MKT',
  'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'WORKER', 'EMPLOYEE',
];

// Role KHÔNG có projection surface nào (không phải reader/self của surface M1-09A hiện hữu).
const ROLES_WITHOUT_SURFACE = ['MKT', 'EMPLOYEE'];

const EXPECTED_SURFACES = [
  'WORKER_LIST', 'WORKER_MUTATE', 'WORKER_SELF', 'STATEMENT_LIST', 'STATEMENT_MARGIN',
  'STATEMENT_GENERATE', 'VENDOR_STATEMENT_LIST', 'VENDOR_STATEMENT_EXPORT', 'PAYSLIP_SELF',
  'CTV_WITHDRAWAL_SELF', 'PAYROLL_CONFIG_LIST',
];

const KNOWN_FIELD_GROUPS = new Set([
  'WORKER_CORE', 'WORKER_CONTACT', 'WORKER_SENSITIVE_MASKED', 'WORKER_SENSITIVE_ISSUED',
  'WORKER_CHIP_RAW', 'STATEMENT_CORE', 'VENDOR_FINANCIAL', 'CLIENT_COMMERCIAL',
  'PAYSLIP_SELF_FINANCIAL', 'WITHDRAWAL_SELF_BANK', 'PAYROLL_CONFIG_OPERATIONAL',
]);

describe('projection manifest — 13-role coverage (AC-10 / RQ-11)', () => {
  it('SYSTEM_ROLES = ĐÚNG 13 role canonical (enum drift → fail)', () => {
    expect(SYSTEM_ROLES).toHaveLength(13);
    expect([...SYSTEM_ROLES].sort()).toEqual([...EXPECTED_ROLES].sort());
  });

  it('mọi role được phân loại: có surface HOẶC no-surface tường minh (disjoint, phủ đủ 13)', () => {
    const rolesWithSurface = new Set<string>();
    for (const s of Object.values(PROJECTION_SURFACES)) {
      for (const r of s.allowedRoles) rolesWithSurface.add(r);
    }
    // Disjoint: role no-surface không được đồng thời xuất hiện trong surface nào.
    for (const r of ROLES_WITHOUT_SURFACE) {
      expect(rolesWithSurface.has(r), `${r} không được có surface`).toBe(false);
    }
    // Union phủ đúng 13.
    const union = new Set<string>([...rolesWithSurface, ...ROLES_WITHOUT_SURFACE]);
    expect([...union].sort()).toEqual([...EXPECTED_ROLES].sort());
  });

  it('allowedRoles của MỌI surface ⊆ SYSTEM_ROLES (không role lạ)', () => {
    const roleSet = new Set<string>(SYSTEM_ROLES);
    for (const [name, s] of Object.entries(PROJECTION_SURFACES)) {
      for (const r of s.allowedRoles) {
        expect(roleSet.has(r), `surface ${name} có role lạ ${r}`).toBe(true);
      }
    }
  });
});

describe('projection manifest — surface coverage (AC-01 / RQ-01)', () => {
  it('PROJECTION_SURFACES = đúng 11 surface khai báo', () => {
    expect(Object.keys(PROJECTION_SURFACES).sort()).toEqual([...EXPECTED_SURFACES].sort());
  });

  it('mỗi surface có route/allowedRoles/fieldGroups hợp lệ (không surface rỗng)', () => {
    for (const [name, s] of Object.entries(PROJECTION_SURFACES)) {
      expect(typeof s.route, `${name}.route`).toBe('string');
      expect(s.route.length, `${name}.route non-empty`).toBeGreaterThan(0);
      expect(Array.isArray(s.allowedRoles), `${name}.allowedRoles`).toBe(true);
      expect(s.allowedRoles.length, `${name} có ≥1 allowedRole`).toBeGreaterThan(0);
      expect(Array.isArray(s.fieldGroups), `${name}.fieldGroups`).toBe(true);
      expect(s.fieldGroups.length, `${name} có ≥1 fieldGroup`).toBeGreaterThan(0);
      expect(typeof s.selfScoped, `${name}.selfScoped`).toBe('boolean');
      const perm = s.gatingPermission;
      expect(perm === null || typeof perm === 'string', `${name}.gatingPermission`).toBe(true);
      for (const g of s.fieldGroups) {
        expect(KNOWN_FIELD_GROUPS.has(g), `${name} fieldGroup lạ ${g}`).toBe(true);
      }
    }
  });

  it('field-group count khớp impl (worker-projection không lệch manifest)', () => {
    expect(WORKER_CORE_FIELDS).toHaveLength(13);
    expect(WORKER_CONTACT_FIELDS).toHaveLength(11);
    expect(WORKER_SENSITIVE_MASKED_FIELDS).toHaveLength(6);
    expect(WORKER_SENSITIVE_ISSUED_FIELDS).toHaveLength(3);
    expect(PAYSLIP_SELF_FINANCIAL_FIELDS).toHaveLength(8);
    expect(WITHDRAWAL_SELF_BANK_FIELDS).toHaveLength(6);
    expect(PAYROLL_CONFIG_OPERATIONAL_FIELDS).toHaveLength(12);
    // impl cross-check: helper count == manifest group length.
    expect(WORKER_MASKED_FIELD_COUNT).toBe(WORKER_SENSITIVE_MASKED_FIELDS.length);
    expect(WORKER_ISSUED_FIELD_COUNT).toBe(WORKER_SENSITIVE_ISSUED_FIELDS.length);
  });

  it('cccdChipData chỉ ở WORKER_CHIP_RAW (always-omit), KHÔNG lẫn nhóm khác (DEC-05)', () => {
    expect(WORKER_CHIP_RAW_FIELDS).toEqual(['cccdChipData']);
    const others = [
      ...WORKER_CORE_FIELDS, ...WORKER_CONTACT_FIELDS,
      ...WORKER_SENSITIVE_MASKED_FIELDS, ...WORKER_SENSITIVE_ISSUED_FIELDS,
    ];
    expect(others).not.toContain('cccdChipData');
  });
});

describe('projection manifest — Payment gap truthful (AC-12 / RQ-13)', () => {
  it('PAYMENT_PROJECTION = SCHEMA_NOT_AVAILABLE, defer M8-06, không mock-pass', () => {
    expect(PAYMENT_PROJECTION.status).toBe('SCHEMA_NOT_AVAILABLE');
    expect(PAYMENT_PROJECTION.models).toEqual(['Payment', 'PaymentAllocation']);
    expect(PAYMENT_PROJECTION.deferredTo).toContain('M8-06');
  });
});
