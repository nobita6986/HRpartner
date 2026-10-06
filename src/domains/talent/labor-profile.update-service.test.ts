/**
 * labor-profile.update-service.test.ts — T1B Pre-P2 hotfix (DEC-P2-04..08)
 * + v1.1 PR #110 correction 1/1 (CAS-updateMany race protection, masked-input
 * rejection).
 *
 * UNIT test cho:
 *   - `deriveCompleteness` (pure): boundary cases
 *   - `updateLaborProfileIntakeProfile` (DB-touching) — MOCK Prisma
 *
 * Pure helper test đứng độc lập; service test sử dụng in-memory mock tx
 * (theo pattern `src/domains/talent/labor-profile.read-service.test.ts`):
 *   - mock `tx.laborProfile.findUnique` (current row + post-write re-read)
 *   - mock `tx.laborProfile.updateMany` (atomic CAS write)
 *   - mock `tx.laborProfile.findMany` (duplicate probe)
 *
 * Unit lane PHẢI không mở kết nối DB (vitest.unit.config.ts đã chặn
 * DATABASE_URL → 127.0.0.1:1 sentinel).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import {
  deriveCompleteness,
  updateLaborProfileIntakeProfile,
} from './labor-profile.service';
import {
  LaborProfileAlreadyLinkedError,
} from './labor-profile.types';

describe('deriveCompleteness (DEC-P2-05) — pure', () => {
  it('returns COMPLETE when full name + phone + cccd all present', () => {
    expect(
      deriveCompleteness({
        fullName: 'Nguyen Van A',
        phone: '0900000123',
        normalizedPhone: '900000123',
        cccdNumber: '001099123456',
      }),
    ).toBe('COMPLETE');
  });

  it('returns COMPLETE even if only normalizedPhone present (phone empty, normalizedPhone set)', () => {
    expect(
      deriveCompleteness({
        fullName: 'A',
        phone: '',
        normalizedPhone: '900000123',
        cccdNumber: '001',
      }),
    ).toBe('COMPLETE');
  });

  it('returns MINIMAL when full name missing', () => {
    expect(
      deriveCompleteness({
        fullName: null,
        phone: '0900000123',
        normalizedPhone: '900000123',
        cccdNumber: '001099123456',
      }),
    ).toBe('MINIMAL');
  });

  it('returns MINIMAL when phone missing (both phone and normalizedPhone empty)', () => {
    expect(
      deriveCompleteness({
        fullName: 'A',
        phone: '',
        normalizedPhone: '',
        cccdNumber: '001',
      }),
    ).toBe('MINIMAL');
  });

  it('returns MINIMAL when cccd missing', () => {
    expect(
      deriveCompleteness({
        fullName: 'A',
        phone: '0900000123',
        normalizedPhone: '900000123',
        cccdNumber: null,
      }),
    ).toBe('MINIMAL');
  });

  it('treats whitespace-only strings as missing', () => {
    expect(
      deriveCompleteness({
        fullName: '   ',
        phone: '   ',
        normalizedPhone: '   ',
        cccdNumber: '   ',
      }),
    ).toBe('MINIMAL');
  });
});

describe('updateLaborProfileIntakeProfile (DEC-P2-04..08) — in-memory Prisma mock', () => {
  let mockFindUnique: any;
  let mockUpdateMany: any;
  let mockFindMany: any;
  let mockTx: any;

  beforeEach(() => {
    mockFindUnique = vi.fn();
    mockUpdateMany = vi.fn();
    mockFindMany = vi.fn().mockResolvedValue([]);
    mockTx = {
      laborProfile: {
        findUnique: mockFindUnique,
        updateMany: mockUpdateMany,
        findMany: mockFindMany,
      },
    } as unknown as Prisma.TransactionClient;
  });

  // Helper: mock sequence findUnique (current) → updateMany (CAS) → findUnique
  // (post-write re-read). Caller specifies current row state AND post-write
  // row state. Defaults current = original intake row.
  function mockHappyPathSequence(
    postWriteRow: Record<string, unknown>,
    currentRow: Record<string, unknown> = {
      id: 'lp-1',
      fullName: 'Old',
      phone: '0900000123',
      normalizedPhone: '900000123',
      cccdNumber: null,
      workerId: null,
    },
  ) {
    mockFindUnique
      .mockResolvedValueOnce(currentRow)
      .mockResolvedValueOnce(postWriteRow);
    mockUpdateMany.mockResolvedValueOnce({ count: 1 });
  }

  it('throws LaborProfileAlreadyLinkedError when current.workerId != null (DEC-P2-06)', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'lp-1',
      fullName: 'A',
      phone: '0900000123',
      normalizedPhone: '900000123',
      cccdNumber: '001',
      workerId: 'worker-7',
    });
    await expect(
      updateLaborProfileIntakeProfile(mockTx, {
        id: 'lp-1',
        fullName: 'B',
        actorId: 'u-1',
      }),
    ).rejects.toBeInstanceOf(LaborProfileAlreadyLinkedError);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('throws LABOR_PROFILE_NOT_FOUND when current is null', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await expect(
      updateLaborProfileIntakeProfile(mockTx, {
        id: 'lp-missing',
        actorId: 'u-1',
      }),
    ).rejects.toMatchObject({ code: 'LABOR_PROFILE_NOT_FOUND' });
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('happy path: 3 fields updated, completeness recomputed to COMPLETE', async () => {
    mockHappyPathSequence({
      id: 'lp-1',
      fullName: 'New Name',
      phone: '0987654321',
      normalizedPhone: '987654321',
      cccdNumber: '001099123456',
      completeness: 'COMPLETE',
      workerId: null,
    });

    const out = await updateLaborProfileIntakeProfile(mockTx, {
      id: 'lp-1',
      fullName: 'New Name',
      phone: '+84 987 654 321',
      cccdNumber: '001099123456',
      actorId: 'u-1',
    });

    expect(out.fullName).toBe('New Name');
    expect(out.normalizedPhone).toBe('987654321');
    expect(out.cccdNumber).toBe('001099123456');
    expect(out.completeness).toBe('COMPLETE');
    expect(out.warnings).toEqual([]);

    // v1.1: prisma.laborProfile.updateMany MUST NOT include `workerId` key.
    const updateArgs = mockUpdateMany.mock.calls[0]?.[0];
    expect(updateArgs).toBeTruthy();
    expect(updateArgs.data).not.toHaveProperty('workerId');
    expect(updateArgs.data.fullName).toBe('New Name');
    expect(updateArgs.data.completeness).toBe('COMPLETE');
    // CAS WHERE compound: id + workerId: null
    expect(updateArgs.where.id).toBe('lp-1');
    expect(updateArgs.where.workerId).toBeNull();
  });

  it('phone normalization: empty / invalid → null for phone + normalizedPhone', async () => {
    mockHappyPathSequence({
      id: 'lp-1',
      fullName: 'A',
      phone: null,
      normalizedPhone: null,
      cccdNumber: '001',
      completeness: 'MINIMAL',
      workerId: null,
    });

    await updateLaborProfileIntakeProfile(mockTx, {
      id: 'lp-1',
      phone: '   ',
      actorId: 'u-1',
    });

    const updateArgs = mockUpdateMany.mock.calls[0]?.[0];
    expect(updateArgs.data.phone).toBeNull();
    expect(updateArgs.data.normalizedPhone).toBeNull();
    expect(updateArgs.data.completeness).toBe('MINIMAL');
  });

  it('preserves current values when input field is undefined (partial PATCH)', async () => {
    mockHappyPathSequence(
      {
        id: 'lp-1',
        fullName: 'Updated',
        phone: '0900000123',
        normalizedPhone: '900000123',
        cccdNumber: '001',
        completeness: 'COMPLETE',
        workerId: null,
      },
      {
        id: 'lp-1',
        fullName: 'Current',
        phone: '0900000123',
        normalizedPhone: '900000123',
        cccdNumber: '001',
        workerId: null,
      },
    );

    await updateLaborProfileIntakeProfile(mockTx, {
      id: 'lp-1',
      fullName: 'Updated',
      actorId: 'u-1',
    });

    const updateArgs = mockUpdateMany.mock.calls[0]?.[0];
    expect(updateArgs.data.fullName).toBe('Updated');
    expect(updateArgs.data.phone).toBe('0900000123'); // unchanged
    expect(updateArgs.data.cccdNumber).toBe('001'); // unchanged
  });

  it('returns warnings when duplicate profile (same normalizedPhone, unlinked)', async () => {
    mockHappyPathSequence({
      id: 'lp-1',
      fullName: 'A',
      phone: '0987654321',
      normalizedPhone: '987654321',
      cccdNumber: null,
      completeness: 'MINIMAL',
      workerId: null,
    });
    mockFindMany.mockResolvedValueOnce([
      { id: 'lp-2', normalizedPhone: '987654321', cccdNumber: null },
    ]);

    const out = await updateLaborProfileIntakeProfile(mockTx, {
      id: 'lp-1',
      phone: '0987654321',
      actorId: 'u-1',
    });

    expect(out.warnings).toEqual([
      { kind: 'POSSIBLE_DUPLICATE', signal: 'normalizedPhone', laborProfileIds: ['lp-2'] },
    ]);
  });

  it('excludes self from duplicate probe and excludes linked profiles', async () => {
    mockHappyPathSequence({
      id: 'lp-1',
      fullName: 'A',
      phone: '0987654321',
      normalizedPhone: '987654321',
      cccdNumber: null,
      completeness: 'MINIMAL',
      workerId: null,
    });
    mockFindMany.mockResolvedValueOnce([]);

    await updateLaborProfileIntakeProfile(mockTx, {
      id: 'lp-1',
      phone: '0987654321',
      actorId: 'u-1',
    });

    const findManyArgs = mockFindMany.mock.calls[0]?.[0];
    expect(findManyArgs.where.id).toEqual({ not: 'lp-1' });
    expect(findManyArgs.where.workerId).toBeNull();
  });

  // ─────────── v1.1 PR #110 CORRECTION 1/1 (CAS race protection) ───────────

  it('v1.1 CAS-lost: updateMany count=0 + row re-read shows workerId set → 409 LaborProfileAlreadyLinkedError', async () => {
    // Race: PATCH reads current (workerId=null), starts UPDATE; concurrent
    // conversion (PR #107 linkLaborProfileWorker) wins CAS first, so PATCH
    // CAS updateMany matches 0 rows. Re-read → row now has workerId set.
    mockFindUnique
      .mockResolvedValueOnce({
        id: 'lp-1',
        fullName: 'A',
        phone: '0900000123',
        normalizedPhone: '900000123',
        cccdNumber: null,
        workerId: null, // before race
      })
      // After CAS-lost re-read:
      .mockResolvedValueOnce({
        id: 'lp-1',
        workerId: 'worker-X', // concurrent conversion won
      });
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      updateLaborProfileIntakeProfile(mockTx, {
        id: 'lp-1',
        fullName: 'A',
        actorId: 'u-1',
      }),
    ).rejects.toMatchObject({
      name: 'LaborProfileAlreadyLinkedError',
      workerId: 'worker-X',
    });
    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('v1.1 CAS-lost + row gone: updateMany count=0 + re-read null → 404 LABOR_PROFILE_NOT_FOUND', async () => {
    // Edge: CAS-lost AND row deleted concurrently (extremely rare).
    mockFindUnique
      .mockResolvedValueOnce({
        id: 'lp-1',
        fullName: 'A',
        phone: '0900000123',
        normalizedPhone: '900000123',
        cccdNumber: null,
        workerId: null,
      })
      .mockResolvedValueOnce(null);
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      updateLaborProfileIntakeProfile(mockTx, {
        id: 'lp-1',
        fullName: 'A',
        actorId: 'u-1',
      }),
    ).rejects.toMatchObject({ code: 'LABOR_PROFILE_NOT_FOUND' });
  });

  // ─────────── v1.1 PR #110 CORRECTION 1/3 (masked-input rejection) ───────────

  it('v1.1 reject masked phone (contains "*"): throw LABOR_PROFILE_MASKED_INPUT_REJECTED', async () => {
    await expect(
      updateLaborProfileIntakeProfile(mockTx, {
        id: 'lp-1',
        phone: '091****678', // typical maskPhone window output
        actorId: 'u-1',
      }),
    ).rejects.toMatchObject({ code: 'LABOR_PROFILE_MASKED_INPUT_REJECTED' });
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('v1.1 reject masked cccdNumber (contains "*"): throw LABOR_PROFILE_MASKED_INPUT_REJECTED', async () => {
    await expect(
      updateLaborProfileIntakeProfile(mockTx, {
        id: 'lp-1',
        cccdNumber: '********3456', // typical maskCccd window output
        actorId: 'u-1',
      }),
    ).rejects.toMatchObject({ code: 'LABOR_PROFILE_MASKED_INPUT_REJECTED' });
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('v1.1 reject masked phone is entry-gate (no findUnique side effect)', async () => {
    // Belt-and-suspenders: chống submit masked phone KHÔNG trigger bất kỳ
    // SELECT/UPDATE nào (gọi là đã validate ngay tại đầu hàm).
    await expect(
      updateLaborProfileIntakeProfile(mockTx, {
        id: 'lp-1',
        phone: '****',
        actorId: 'u-1',
      }),
    ).rejects.toMatchObject({ code: 'LABOR_PROFILE_MASKED_INPUT_REJECTED' });
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('v1.1 accept plain phone (no "*") → no rejection from mask guard', async () => {
    mockHappyPathSequence({
      id: 'lp-1',
      fullName: 'A',
      phone: '0912345678',
      normalizedPhone: '912345678',
      cccdNumber: '001',
      completeness: 'COMPLETE',
      workerId: null,
    });
    const out = await updateLaborProfileIntakeProfile(mockTx, {
      id: 'lp-1',
      phone: '0912345678',
      actorId: 'u-1',
    });
    expect(out.normalizedPhone).toBe('912345678');
  });
});

// suppress "unused import" linter warning (we keep the type re-export to
// make TS happy if downstream re-imports it).