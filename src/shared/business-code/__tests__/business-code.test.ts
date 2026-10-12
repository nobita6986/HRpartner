/**
 * business-code.test.ts — Unit test cho nextBusinessCode + nextBusinessCodeBatch.
 *
 * Mock Prisma TransactionClient thông qua việc chèn một fake object implement
 * $executeRawUnsafe và $queryRawUnsafe. Test verify:
 * - Format mã đúng (CC-001, PRJ-2026-001, VD-001, USR-EMP-001, POS-001).
 * - Zero-pad 3 là MIN width — mã 1000 vẫn sinh đúng (CC-1000, không phải CC-1000
 *   cap hay exception).
 * - Year-aware PROJECT: cùng table, year=2026 → seq tiếp tục; year=2027 → seq reset 1.
 * - Bảng trống → seq=1.
 * - Legacy code không match regex bị bỏ qua khi tìm MAX.
 * - Batch trả N mã liên tiếp không trùng.
 * - Advisory lock được acquire đúng key.
 * - Error path: thiếu opts.year cho PROJECT, count<=0, year ngoài range.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  nextBusinessCode,
  nextBusinessCodeBatch,
  BusinessCodeError,
  __INTERNAL_CONFIG__,
  type BusinessCodeKind,
} from '../business-code';

interface MockTx {
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
}

function makeTx(maxRow: bigint | null): MockTx {
  return {
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
    $queryRawUnsafe: vi
      .fn()
      .mockResolvedValue(maxRow === null ? [{ max_num: null }] : [{ max_num: maxRow }]),
  };
}

describe('nextBusinessCode', () => {
  let tx: MockTx;
  beforeEach(() => {
    tx = makeTx(null); // bảng trống
  });

  it('CC: bảng trống trả CC-001', async () => {
    const code = await nextBusinessCode(tx as never, 'CLIENT');
    expect(code).toBe('CC-001');
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      'business_code:client_code',
    );
  });

  it('VD: bảng trống trả VD-001', async () => {
    const code = await nextBusinessCode(tx as never, 'VENDOR');
    expect(code).toBe('VD-001');
  });

  it('WORKER_USER_ID: bảng trống trả USR-EMP-001', async () => {
    const code = await nextBusinessCode(tx as never, 'WORKER_USER_ID');
    expect(code).toBe('USR-EMP-001');
  });

  it('STAFFING_ORDER_SLOT_POSITION: bảng trống trả POS-001', async () => {
    const code = await nextBusinessCode(tx as never, 'STAFFING_ORDER_SLOT_POSITION');
    expect(code).toBe('POS-001');
  });

  it('PROJECT: năm hiện tại, bảng trống → PRJ-{YYYY}-001', async () => {
    const year = 2026;
    const code = await nextBusinessCode(tx as never, 'PROJECT', { year });
    expect(code).toBe('PRJ-2026-001');
  });

  it('PROJECT: năm 2027 → PRJ-2027-001 (reset sequence theo năm)', async () => {
    const code = await nextBusinessCode(tx as never, 'PROJECT', { year: 2027 });
    expect(code).toBe('PRJ-2027-001');
  });

  it('CC: max=42 → CC-043', async () => {
    tx = makeTx(42n);
    const code = await nextBusinessCode(tx as never, 'CLIENT');
    expect(code).toBe('CC-043');
  });

  it('CC: max=999 → CC-1000 (zero-pad 3 là MIN width, không cap 999)', async () => {
    tx = makeTx(999n);
    const code = await nextBusinessCode(tx as never, 'CLIENT');
    expect(code).toBe('CC-1000');
  });

  it('CC: max=12345 → CC-12346 (không cap, tiếp tục tăng)', async () => {
    tx = makeTx(12345n);
    const code = await nextBusinessCode(tx as never, 'CLIENT');
    expect(code).toBe('CC-12346');
  });

  it('PROJECT: max=99 trong cùng năm → PRJ-{YYYY}-100', async () => {
    tx = makeTx(99n);
    const code = await nextBusinessCode(tx as never, 'PROJECT', { year: 2026 });
    expect(code).toBe('PRJ-2026-100');
  });

  it('PROJECT: max=999 năm 2026 → PRJ-2026-1000', async () => {
    tx = makeTx(999n);
    const code = await nextBusinessCode(tx as never, 'PROJECT', { year: 2026 });
    expect(code).toBe('PRJ-2026-1000');
  });

  it('regex filter: bảng có legacy "wu-test-1" (mock trả max=null) bị bỏ qua → USR-EMP-001', async () => {
    // Legacy không match regex; MAX(...) trả null → next=1.
    tx = makeTx(null);
    const code = await nextBusinessCode(tx as never, 'WORKER_USER_ID');
    expect(code).toBe('USR-EMP-001');
    // Verify query có dùng regex.
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("~"),
      '^USR-EMP-[0-9]+$',
    );
  });

  it('PROJECT: năm=2026, regex filter scope theo năm', async () => {
    const code = await nextBusinessCode(tx as never, 'PROJECT', { year: 2026 });
    expect(code).toBe('PRJ-2026-001');
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("~"),
      '^PRJ-2026-[0-9]+$',
    );
  });

  it('PROJECT: thiếu opts.year → throw BusinessCodeError YEAR_REQUIRED', async () => {
    await expect(nextBusinessCode(tx as never, 'PROJECT')).rejects.toBeInstanceOf(BusinessCodeError);
    await expect(nextBusinessCode(tx as never, 'PROJECT')).rejects.toMatchObject({
      code: 'YEAR_REQUIRED',
    });
  });

  it('PROJECT: year ngoài range [2000, current+10] → throw INVALID_YEAR', async () => {
    await expect(
      nextBusinessCode(tx as never, 'PROJECT', { year: 1999 }),
    ).rejects.toMatchObject({ code: 'INVALID_YEAR' });
    await expect(
      nextBusinessCode(tx as never, 'PROJECT', { year: 9999 }),
    ).rejects.toMatchObject({ code: 'INVALID_YEAR' });
  });

  it('Worker year chỉ yêu cầu cho PROJECT; các kind khác không cần year', async () => {
    // Verify CLIENT/VENDOR/WORKER/POS không yêu cầu year (không throw).
    await expect(nextBusinessCode(tx as never, 'CLIENT')).resolves.toMatch(/^CC-/);
    await expect(nextBusinessCode(tx as never, 'VENDOR')).resolves.toMatch(/^VD-/);
    await expect(nextBusinessCode(tx as never, 'WORKER_USER_ID')).resolves.toMatch(/^USR-EMP-/);
    await expect(nextBusinessCode(tx as never, 'STAFFING_ORDER_SLOT_POSITION')).resolves.toMatch(
      /^POS-/,
    );
  });
});

describe('nextBusinessCodeBatch', () => {
  let tx: MockTx;
  beforeEach(() => {
    tx = makeTx(null);
  });

  it('POS: count=3, bảng trống → ["POS-001", "POS-002", "POS-003"]', async () => {
    const codes = await nextBusinessCodeBatch(tx as never, 'STAFFING_ORDER_SLOT_POSITION', 3);
    expect(codes).toEqual(['POS-001', 'POS-002', 'POS-003']);
  });

  it('CC: count=5, bảng trống → ["CC-001".."CC-005"]', async () => {
    const codes = await nextBusinessCodeBatch(tx as never, 'CLIENT', 5);
    expect(codes).toEqual(['CC-001', 'CC-002', 'CC-003', 'CC-004', 'CC-005']);
  });

  it('CC: count=3, max=99 → ["CC-100", "CC-101", "CC-102"]', async () => {
    tx = makeTx(99n);
    const codes = await nextBusinessCodeBatch(tx as never, 'CLIENT', 3);
    expect(codes).toEqual(['CC-100', 'CC-101', 'CC-102']);
  });

  it('CC: count=1 → ["CC-{max+1}"] (1 phần tử)', async () => {
    tx = makeTx(7n);
    const codes = await nextBusinessCodeBatch(tx as never, 'CLIENT', 1);
    expect(codes).toEqual(['CC-008']);
  });

  it('PROJECT: count=3, year=2026, bảng trống → ["PRJ-2026-001".."PRJ-2026-003"]', async () => {
    const codes = await nextBusinessCodeBatch(tx as never, 'PROJECT', 3, { year: 2026 });
    expect(codes).toEqual(['PRJ-2026-001', 'PRJ-2026-002', 'PRJ-2026-003']);
  });

  it('count=0 → throw INVALID_COUNT', async () => {
    await expect(
      nextBusinessCodeBatch(tx as never, 'STAFFING_ORDER_SLOT_POSITION', 0),
    ).rejects.toMatchObject({ code: 'INVALID_COUNT' });
  });

  it('count=-1 → throw INVALID_COUNT', async () => {
    await expect(
      nextBusinessCodeBatch(tx as never, 'STAFFING_ORDER_SLOT_POSITION', -1),
    ).rejects.toMatchObject({ code: 'INVALID_COUNT' });
  });

  it('count=1.5 (float) → throw INVALID_COUNT', async () => {
    await expect(
      nextBusinessCodeBatch(tx as never, 'STAFFING_ORDER_SLOT_POSITION', 1.5),
    ).rejects.toMatchObject({ code: 'INVALID_COUNT' });
  });

  it('count=1001 → throw INVALID_COUNT (cap 1000)', async () => {
    await expect(
      nextBusinessCodeBatch(tx as never, 'STAFFING_ORDER_SLOT_POSITION', 1001),
    ).rejects.toMatchObject({ code: 'INVALID_COUNT' });
  });

  it('batch trả mã liên tiếp không trùng (kiểm tra uniqueness)', async () => {
    const codes = await nextBusinessCodeBatch(tx as never, 'CLIENT', 10);
    expect(new Set(codes).size).toBe(10);
    // Verify strictly increasing.
    for (let i = 1; i < codes.length; i++) {
      const prev = Number(codes[i - 1].replace('CC-', ''));
      const curr = Number(codes[i].replace('CC-', ''));
      expect(curr).toBe(prev + 1);
    }
  });
});

describe('__INTERNAL_CONFIG__ (read-only snapshot)', () => {
  it('5 kind đều có config', () => {
    const kinds: BusinessCodeKind[] = [
      'CLIENT',
      'PROJECT',
      'VENDOR',
      'WORKER_USER_ID',
      'STAFFING_ORDER_SLOT_POSITION',
    ];
    for (const k of kinds) {
      expect(__INTERNAL_CONFIG__[k]).toBeDefined();
      expect(__INTERNAL_CONFIG__[k].prefix).toBeTruthy();
      expect(__INTERNAL_CONFIG__[k].padWidth).toBe(3);
    }
  });

  it('PROJECT là kind duy nhất có includeYear=true', () => {
    expect(__INTERNAL_CONFIG__.PROJECT.includeYear).toBe(true);
    for (const k of ['CLIENT', 'VENDOR', 'WORKER_USER_ID', 'STAFFING_ORDER_SLOT_POSITION'] as const) {
      expect(__INTERNAL_CONFIG__[k].includeYear).toBe(false);
    }
  });

  it('prefix đúng theo DEC-T0-01', () => {
    expect(__INTERNAL_CONFIG__.CLIENT.prefix).toBe('CC');
    expect(__INTERNAL_CONFIG__.PROJECT.prefix).toBe('PRJ');
    expect(__INTERNAL_CONFIG__.VENDOR.prefix).toBe('VD');
    expect(__INTERNAL_CONFIG__.WORKER_USER_ID.prefix).toBe('USR-EMP');
    expect(__INTERNAL_CONFIG__.STAFFING_ORDER_SLOT_POSITION.prefix).toBe('POS');
  });
});
