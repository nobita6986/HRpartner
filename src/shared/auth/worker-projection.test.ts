/**
 * worker-projection.test.ts — V5-M1-09A "current field projection" (RQ-02/03, DEC-04/05).
 *
 * Allowlist DTO action-aware: 6 field nhạy cảm mask theo permission; cccdChipData LUÔN omit;
 * SELF_PROFILE thấy real dù không có CAN_VIEW_WORKER_SENSITIVE. Pure function — không chạm DB.
 */
import { describe, it, expect } from 'vitest';
import {
  projectWorker,
  projectWorkerList,
  WORKER_SENSITIVE_FIELDS,
  type WorkerProjectionContext,
} from './worker-projection';

const LIST_NO_PERM: WorkerProjectionContext = { hasSensitivePermission: false, action: 'LIST' };
const DETAIL_PERM: WorkerProjectionContext = { hasSensitivePermission: true, action: 'DETAIL' };
const SELF: WorkerProjectionContext = { hasSensitivePermission: false, action: 'SELF_PROFILE' };

const FAKE_WORKER = {
  id: 'w-1',
  userId: 'USR-001',
  fullName: 'Nguyen Van A',
  phone: '09*********',
  cccdNumber: '012345678901',
  cccdImageUrl: 'https://example.com/cccd-1.jpg',
  selfieImageUrl: 'https://example.com/selfie-1.jpg',
  cccdChipData: { chipId: 'A1', biometric: true },
  cccdIssuedDate: new Date('2020-01-02T00:00:00.000Z'),
  cccdIssuedPlace: 'Cục CS ĐKQL cư trú',
  cccdExpiryDate: new Date('2035-01-02T00:00:00.000Z'),
  bankAccount: '1234567890',
  bankName: 'Vietcombank',
  bankBranch: 'Chi nhánh HN',
  profileStatus: 'VERIFIED',
  employmentStatus: 'ACTIVE',
  riskStatus: 'NORMAL',
};

describe('WORKER_SENSITIVE_FIELDS — 6 field masked theo DEC-04 (KHÔNG gồm cccdChipData)', () => {
  it('đúng 6 field: cccdNumber, cccdImageUrl, selfieImageUrl, bankAccount, bankName, bankBranch', () => {
    expect(WORKER_SENSITIVE_FIELDS).toEqual([
      'cccdNumber',
      'cccdImageUrl',
      'selfieImageUrl',
      'bankAccount',
      'bankName',
      'bankBranch',
    ]);
    expect(WORKER_SENSITIVE_FIELDS.length).toBe(6);
    expect(WORKER_SENSITIVE_FIELDS as readonly string[]).not.toContain('cccdChipData');
  });
});

describe('projectWorker — LIST không permission', () => {
  const out = projectWorker(FAKE_WORKER, LIST_NO_PERM);

  it('mask 6 field nhạy cảm thành ***', () => {
    expect(out.cccdNumber).toBe('***');
    expect(out.cccdImageUrl).toBe('***');
    expect(out.selfieImageUrl).toBe('***');
    expect(out.bankAccount).toBe('***');
    expect(out.bankName).toBe('***');
    expect(out.bankBranch).toBe('***');
  });

  it('cccd issued metadata → null khi không xem được nhạy cảm', () => {
    expect(out.cccdIssuedDate).toBeNull();
    expect(out.cccdIssuedPlace).toBeNull();
    expect(out.cccdExpiryDate).toBeNull();
  });

  it('cccdChipData LUÔN omit — không có key trong DTO', () => {
    expect(Object.prototype.hasOwnProperty.call(out, 'cccdChipData')).toBe(false);
    expect(JSON.stringify(out)).not.toContain('chipId');
  });

  it('KHÔNG mask field không nhạy cảm', () => {
    expect(out.fullName).toBe('Nguyen Van A');
    expect(out.phone).toBe('09*********');
    expect(out.userId).toBe('USR-001');
    expect(out.profileStatus).toBe('VERIFIED');
    expect(out.employmentStatus).toBe('ACTIVE');
    expect(out.riskStatus).toBe('NORMAL');
  });

  it('không mutate input (immutable)', () => {
    expect(FAKE_WORKER.cccdNumber).toBe('012345678901');
    expect(FAKE_WORKER.bankAccount).toBe('1234567890');
    expect(FAKE_WORKER.cccdChipData).toEqual({ chipId: 'A1', biometric: true });
  });
});

describe('projectWorker — CÓ CAN_VIEW_WORKER_SENSITIVE (DETAIL)', () => {
  const out = projectWorker(FAKE_WORKER, DETAIL_PERM);

  it('giữ real 6 field nhạy cảm', () => {
    expect(out.cccdNumber).toBe('012345678901');
    expect(out.cccdImageUrl).toBe('https://example.com/cccd-1.jpg');
    expect(out.selfieImageUrl).toBe('https://example.com/selfie-1.jpg');
    expect(out.bankAccount).toBe('1234567890');
    expect(out.bankName).toBe('Vietcombank');
    expect(out.bankBranch).toBe('Chi nhánh HN');
  });

  it('cccd issued metadata → real (ISO cho date)', () => {
    expect(out.cccdIssuedDate).toBe('2020-01-02T00:00:00.000Z');
    expect(out.cccdIssuedPlace).toBe('Cục CS ĐKQL cư trú');
    expect(out.cccdExpiryDate).toBe('2035-01-02T00:00:00.000Z');
  });

  it('cccdChipData VẪN omit kể cả privileged (DEC-05)', () => {
    expect(Object.prototype.hasOwnProperty.call(out, 'cccdChipData')).toBe(false);
    expect(JSON.stringify(out)).not.toContain('chipId');
  });
});

describe('projectWorker — SELF_PROFILE không cần permission (DEC-05)', () => {
  const out = projectWorker(FAKE_WORKER, SELF);

  it('WORKER thấy CCCD/bank của chính mình dù hasSensitivePermission=false', () => {
    expect(out.cccdNumber).toBe('012345678901');
    expect(out.bankAccount).toBe('1234567890');
    expect(out.cccdIssuedPlace).toBe('Cục CS ĐKQL cư trú');
  });

  it('cccdChipData vẫn omit kể cả self', () => {
    expect(Object.prototype.hasOwnProperty.call(out, 'cccdChipData')).toBe(false);
  });
});

describe('projectWorker — null fields', () => {
  it('null giữ null (không mask thành ***)', () => {
    const worker = {
      id: 'w-2',
      cccdNumber: null,
      cccdImageUrl: null,
      selfieImageUrl: null,
      cccdChipData: null,
      bankAccount: null,
      bankName: null,
      bankBranch: null,
    };
    const out = projectWorker(worker, LIST_NO_PERM);
    expect(out.cccdNumber).toBeNull();
    expect(out.bankAccount).toBeNull();
    expect(out.bankName).toBeNull();
  });
});

describe('projectWorkerList — array', () => {
  it('project tất cả rows trong list', () => {
    const list = [FAKE_WORKER, { ...FAKE_WORKER, id: 'w-3' }];
    const out = projectWorkerList(list, LIST_NO_PERM);
    expect(out).toHaveLength(2);
    expect(out[0].cccdNumber).toBe('***');
    expect(out[1].cccdNumber).toBe('***');
  });

  it('empty list → empty list', () => {
    expect(projectWorkerList([], LIST_NO_PERM)).toEqual([]);
  });
});

describe('projectWorker — AC-10 PII không leak', () => {
  it('masked output KHÔNG chứa PII từ input', () => {
    const worker = {
      id: 'w-leak',
      cccdNumber: 'REAL_CCCD_123456',
      bankAccount: 'REAL_BANK_999',
      cccdChipData: { secret: 'REAL_CHIP_RAW' },
    };
    const out = projectWorker(worker, LIST_NO_PERM);
    const outStr = JSON.stringify(out);
    expect(outStr).not.toContain('REAL_CCCD');
    expect(outStr).not.toContain('REAL_BANK');
    expect(outStr).not.toContain('REAL_CHIP_RAW');
    expect(outStr).toContain('***');
  });
});
