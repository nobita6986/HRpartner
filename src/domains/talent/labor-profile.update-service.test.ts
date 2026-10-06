/**
 * labor-profile.update-service.test.ts — T1B Pre-P2 hotfix (DEC-P2-04..08).
 *
 * UNIT test cho:
 *   - `deriveCompleteness` (pure): boundary cases
 *   - `updateLaborProfileIntakeProfile` (DB-touching) — MOCK Prisma
 *
 * Pure helper test đứng độc lập; service test sử dụng in-memory mock tx
 * (theo pattern `src/domains/talent/labor-profile.read-service.test.ts`):
 *   - mock `tx.laborProfile.findUnique` (current row)
 *   - mock `tx.laborProfile.update` (target write)
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
  let mockUpdate: any;
  let mockFindMany: any;
  let mockTx: any;

  beforeEach(() => {
    mockFindUnique = vi.fn();
    mockUpdate = vi.fn();
    mockFindMany = vi.fn().mockResolvedValue([]);
    mockTx = {
      laborProfile: {
        findUnique: mockFindUnique,
        update: mockUpdate,
        findMany: mockFindMany,
      },
    } as unknown as Prisma.TransactionClient;
  });

  it('throws LaborProfileAlreadyLinkedError when current.workerId != null (DEC-P2-06)', async () => {
    mockFindUnique.mockResolvedValue({
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
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('throws LABOR_PROFILE_NOT_FOUND when current is null', async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(
      updateLaborProfileIntakeProfile(mockTx, {
        id: 'lp-missing',
        actorId: 'u-1',
      }),
    ).rejects.toMatchObject({ code: 'LABOR_PROFILE_NOT_FOUND' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('happy path: 3 fields updated, completeness recomputed to COMPLETE', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'lp-1',
      fullName: 'Old',
      phone: '0900000123',
      normalizedPhone: '900000123',
      cccdNumber: null,
      workerId: null,
    });
    mockUpdate.mockResolvedValue({
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

    // The prisma.laborProfile.update call MUST NOT include `workerId` key.
    const updateArgs = mockUpdate.mock.calls[0]?.[0];
    expect(updateArgs).toBeTruthy();
    expect(updateArgs.data).not.toHaveProperty('workerId');
    expect(updateArgs.data.fullName).toBe('New Name');
    expect(updateArgs.data.completeness).toBe('COMPLETE');
  });

  it('phone normalization: empty / invalid → null for phone + normalizedPhone', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'lp-1',
      fullName: 'A',
      phone: '0900000123',
      normalizedPhone: '900000123',
      cccdNumber: '001',
      workerId: null,
    });
    mockUpdate.mockResolvedValue({
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

    const updateArgs = mockUpdate.mock.calls[0]?.[0];
    expect(updateArgs.data.phone).toBeNull();
    expect(updateArgs.data.normalizedPhone).toBeNull();
    expect(updateArgs.data.completeness).toBe('MINIMAL');
  });

  it('preserves current values when input field is undefined (partial PATCH)', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'lp-1',
      fullName: 'Current',
      phone: '0900000123',
      normalizedPhone: '900000123',
      cccdNumber: '001',
      workerId: null,
    });
    mockUpdate.mockResolvedValue({
      id: 'lp-1',
      fullName: 'Updated',
      phone: '0900000123',
      normalizedPhone: '900000123',
      cccdNumber: '001',
      completeness: 'COMPLETE',
      workerId: null,
    });

    await updateLaborProfileIntakeProfile(mockTx, {
      id: 'lp-1',
      fullName: 'Updated',
      actorId: 'u-1',
    });

    const updateArgs = mockUpdate.mock.calls[0]?.[0];
    expect(updateArgs.data.fullName).toBe('Updated');
    expect(updateArgs.data.phone).toBe('0900000123'); // unchanged
    expect(updateArgs.data.cccdNumber).toBe('001'); // unchanged
  });

  it('returns warnings when duplicate profile (same normalizedPhone, unlinked)', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'lp-1',
      fullName: 'A',
      phone: '0900000123',
      normalizedPhone: '900000123',
      cccdNumber: null,
      workerId: null,
    });
    mockUpdate.mockResolvedValue({
      id: 'lp-1',
      fullName: 'A',
      phone: '0987654321',
      normalizedPhone: '987654321',
      cccdNumber: null,
      completeness: 'MINIMAL',
      workerId: null,
    });
    mockFindMany.mockResolvedValue([
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
    // Sanity: the findMany call for duplicate probe must have `id: { not: input.id }`
    // and `workerId: null`. We assert via findMany args.
    mockFindUnique.mockResolvedValue({
      id: 'lp-1',
      fullName: 'A',
      phone: '0900000123',
      normalizedPhone: '900000123',
      cccdNumber: null,
      workerId: null,
    });
    mockUpdate.mockResolvedValue({
      id: 'lp-1',
      fullName: 'A',
      phone: '0987654321',
      normalizedPhone: '987654321',
      cccdNumber: null,
      completeness: 'MINIMAL',
      workerId: null,
    });
    mockFindMany.mockResolvedValue([]);

    await updateLaborProfileIntakeProfile(mockTx, {
      id: 'lp-1',
      phone: '0987654321',
      actorId: 'u-1',
    });

    const findManyArgs = mockFindMany.mock.calls[0]?.[0];
    expect(findManyArgs.where.id).toEqual({ not: 'lp-1' });
    expect(findManyArgs.where.workerId).toBeNull();
  });
});

// suppress "unused import" linter warning (we keep the type re-export to
// make TS happy if downstream re-imports it).
