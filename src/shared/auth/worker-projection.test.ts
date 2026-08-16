/**
 * worker-projection.test.ts — Phase 2 / RQ-05 / DEC-05
 *
 * Test 7 trường nhạy cảm theo permission flag.
 * Không chạm DB — pure function test.
 */
import { describe, it, expect } from 'vitest';
import {
  projectWorker,
  projectWorkerList,
  WORKER_SENSITIVE_FIELDS,
} from './worker-projection';

const FAKE_WORKER = {
  id: 'w-1',
  userId: 'USR-001',
  fullName: 'Nguyen Van A',
  phone: '09*********',
  cccdNumber: '012345678901',
  cccdImageUrl: 'https://example.com/cccd-1.jpg',
  selfieImageUrl: 'https://example.com/selfie-1.jpg',
  cccdChipData: { chipId: 'A1', biometric: true },
  bankAccount: '1234567890',
  bankName: 'Vietcombank',
  bankBranch: 'Chi nhánh HN',
  profileStatus: 'VERIFIED',
  employmentStatus: 'ACTIVE',
  riskStatus: 'NORMAL',
};

describe('WORKER_SENSITIVE_FIELDS — 7 trường theo DEC-05', () => {
  it('đúng 7 trường: cccdNumber, cccdImageUrl, selfieImageUrl, cccdChipData, bankAccount, bankName, bankBranch', () => {
    expect(WORKER_SENSITIVE_FIELDS).toEqual([
      'cccdNumber',
      'cccdImageUrl',
      'selfieImageUrl',
      'cccdChipData',
      'bankAccount',
      'bankName',
      'bankBranch',
    ]);
    expect(WORKER_SENSITIVE_FIELDS.length).toBe(7);
  });
});

describe('projectWorker — không có permission', () => {
  const out = projectWorker(FAKE_WORKER, false);

  it('mask 7 trường thành ***', () => {
    expect(out.cccdNumber).toBe('***');
    expect(out.cccdImageUrl).toBe('***');
    expect(out.selfieImageUrl).toBe('***');
    expect(out.cccdChipData).toBe('***');
    expect(out.bankAccount).toBe('***');
    expect(out.bankName).toBe('***');
    expect(out.bankBranch).toBe('***');
  });

  it('KHÔNG mask các trường không nhạy cảm', () => {
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
  });
});

describe('projectWorker — CÓ permission', () => {
  const out = projectWorker(FAKE_WORKER, true);

  it('giữ nguyên tất cả trường nhạy cảm', () => {
    expect(out.cccdNumber).toBe('012345678901');
    expect(out.cccdImageUrl).toBe('https://example.com/cccd-1.jpg');
    expect(out.selfieImageUrl).toBe('https://example.com/selfie-1.jpg');
    expect(out.cccdChipData).toEqual({ chipId: 'A1', biometric: true });
    expect(out.bankAccount).toBe('1234567890');
    expect(out.bankName).toBe('Vietcombank');
    expect(out.bankBranch).toBe('Chi nhánh HN');
  });

  it('không mask các trường không nhạy cảm', () => {
    expect(out.fullName).toBe('Nguyen Van A');
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
    const out = projectWorker(worker, false);
    expect(out.cccdNumber).toBeNull();
    expect(out.bankAccount).toBeNull();
  });
});

describe('projectWorkerList — array', () => {
  it('project tất cả rows trong list', () => {
    const list = [FAKE_WORKER, { ...FAKE_WORKER, id: 'w-3' }];
    const out = projectWorkerList(list, false);
    expect(out).toHaveLength(2);
    expect(out[0].cccdNumber).toBe('***');
    expect(out[1].cccdNumber).toBe('***');
  });

  it('empty list → empty list', () => {
    expect(projectWorkerList([], false)).toEqual([]);
  });
});

describe('projectWorker — AC-10 PII không leak', () => {
  it('masked output KHÔNG chứa PII từ input', () => {
    const worker = {
      id: 'w-leak',
      cccdNumber: 'REAL_CCCD_123456',
      bankAccount: 'REAL_BANK_999',
    };
    const out = projectWorker(worker, false);
    const outStr = JSON.stringify(out);
    expect(outStr).not.toContain('REAL_CCCD');
    expect(outStr).not.toContain('REAL_BANK');
    expect(outStr).toContain('***');
  });
});