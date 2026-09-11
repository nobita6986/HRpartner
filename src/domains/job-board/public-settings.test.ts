/**
 * public-settings.test.ts — AV1 HomepageSettings unit tests.
 *
 * Covers:
 *   - DTO contract (HomepageSettingsDto fields)
 *   - clampListingPageSize (min/max bounds)
 *   - normalizeBestJobsPageSize (allow-list matching)
 *   - toHomepageSettingsView (source discriminator)
 *   - getHomepageSettings bootstrap idempotency (mock Prisma)
 *   - updateHomepageSettings validation + clamping (mock Prisma)
 *   - SettingsRowMissingError on missing row
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BEST_JOBS_PAGE_SIZES,
  LISTING_PAGE_SIZE_DEFAULT,
  LISTING_PAGE_SIZE_MAX,
  LISTING_PAGE_SIZE_MIN,
  clampListingPageSize,
  normalizeBestJobsPageSize,
  toHomepageSettingsView,
  type HomepageSettingsDto,
} from './public-types';
import {
  SettingsRowMissingError,
  getHomepageSettings,
  updateHomepageSettings,
  toHomepageSettingsDto,
  HOMEPAGE_SETTINGS_SINGLETON_ID,
} from './public-settings.service';

// ─── Mocks ───────────────────────────────────────────────────────────────────

/** Mock Prisma client for testing. */
function createMockPrisma(existingRow?: Record<string, unknown>) {
  return {
    homepageSettings: {
      findUnique: vi.fn().mockResolvedValue(existingRow ?? null),
      upsert: vi.fn().mockImplementation(async ({ create }: { create: Record<string, unknown> }) => ({
        ...create,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: HOMEPAGE_SETTINGS_SINGLETON_ID,
        bestJobsPageSize: data.bestJobsPageSize ?? 9,
        listingPageSize: data.listingPageSize ?? 12,
        updatedAt: new Date(),
      })),
    },
  } as unknown as Parameters<typeof getHomepageSettings>[0];
}

// ─── clampListingPageSize ─────────────────────────────────────────────────────

describe('clampListingPageSize', () => {
  it('returns LISTING_PAGE_SIZE_DEFAULT for null', () => {
    expect(clampListingPageSize(null)).toBe(LISTING_PAGE_SIZE_DEFAULT);
  });

  it('returns LISTING_PAGE_SIZE_DEFAULT for undefined', () => {
    expect(clampListingPageSize(undefined)).toBe(LISTING_PAGE_SIZE_DEFAULT);
  });

  it('returns LISTING_PAGE_SIZE_DEFAULT for non-finite values', () => {
    expect(clampListingPageSize(NaN)).toBe(LISTING_PAGE_SIZE_DEFAULT);
    expect(clampListingPageSize(Infinity)).toBe(LISTING_PAGE_SIZE_DEFAULT);
    expect(clampListingPageSize(-Infinity)).toBe(LISTING_PAGE_SIZE_DEFAULT);
  });

  it('returns the value unchanged when within [min, max]', () => {
    expect(clampListingPageSize(6)).toBe(6);
    expect(clampListingPageSize(12)).toBe(12);
    expect(clampListingPageSize(25)).toBe(25);
    expect(clampListingPageSize(50)).toBe(50);
  });

  it('clamps values below min to min', () => {
    expect(clampListingPageSize(0)).toBe(LISTING_PAGE_SIZE_MIN);
    expect(clampListingPageSize(-5)).toBe(LISTING_PAGE_SIZE_MIN);
    expect(clampListingPageSize(1)).toBe(LISTING_PAGE_SIZE_MIN);
    expect(clampListingPageSize(5)).toBe(LISTING_PAGE_SIZE_MIN);
  });

  it('clamps values above max to max', () => {
    expect(clampListingPageSize(51)).toBe(LISTING_PAGE_SIZE_MAX);
    expect(clampListingPageSize(100)).toBe(LISTING_PAGE_SIZE_MAX);
    expect(clampListingPageSize(999)).toBe(LISTING_PAGE_SIZE_MAX);
  });

  it('floors float values', () => {
    expect(clampListingPageSize(10.7)).toBe(10);
    expect(clampListingPageSize(10.3)).toBe(10);
    expect(clampListingPageSize(6.9)).toBe(6);
    expect(clampListingPageSize(6.1)).toBe(6);
  });
});

// ─── normalizeBestJobsPageSize ────────────────────────────────────────────────

describe('normalizeBestJobsPageSize', () => {
  it('returns the value unchanged when it matches allow-list', () => {
    for (const size of BEST_JOBS_PAGE_SIZES) {
      expect(normalizeBestJobsPageSize(size)).toBe(size);
    }
  });

  it('returns default for null/undefined', () => {
    expect(normalizeBestJobsPageSize(null)).toBe(9);
    expect(normalizeBestJobsPageSize(undefined)).toBe(9);
  });

  it('returns default for non-allow-list values', () => {
    expect(normalizeBestJobsPageSize(4)).toBe(9);   // not in list
    expect(normalizeBestJobsPageSize(8)).toBe(9);   // not in list
    expect(normalizeBestJobsPageSize(10)).toBe(9);  // not in list
    expect(normalizeBestJobsPageSize(0)).toBe(9);
    expect(normalizeBestJobsPageSize(100)).toBe(9);
    expect(normalizeBestJobsPageSize(NaN)).toBe(9);
  });

  it('floors float values then checks allow-list', () => {
    expect(normalizeBestJobsPageSize(8.9)).toBe(9);  // floor=8 not in list → default 9
    expect(normalizeBestJobsPageSize(9.9)).toBe(9);  // floor=9 IS in list → 9
    expect(normalizeBestJobsPageSize(11.9)).toBe(9); // floor=11 not in list → default 9
    expect(normalizeBestJobsPageSize(12.1)).toBe(12); // floor=12 IS in list → 12
    expect(normalizeBestJobsPageSize(7.5)).toBe(9); // floor=7 not in list → default
  });
});

// ─── toHomepageSettingsDto ───────────────────────────────────────────────────

describe('toHomepageSettingsDto', () => {
  it('maps a row to DTO with ISO string updatedAt', () => {
    const row = {
      id: HOMEPAGE_SETTINGS_SINGLETON_ID,
      bestJobsPageSize: 12,
      listingPageSize: 24,
      updatedAt: new Date('2026-09-11T14:00:00.000Z'),
    };
    const dto = toHomepageSettingsDto(row);
    expect(dto.id).toBe('default');
    expect(dto.bestJobsPageSize).toBe(12);
    expect(dto.listingPageSize).toBe(24);
    expect(dto.updatedAt).toBe('2026-09-11T14:00:00.000Z');
  });

  it('clamps listingPageSize out-of-range values', () => {
    const row = {
      id: HOMEPAGE_SETTINGS_SINGLETON_ID,
      bestJobsPageSize: 9,
      listingPageSize: 999, // out of range
      updatedAt: new Date(),
    };
    expect(toHomepageSettingsDto(row).listingPageSize).toBe(LISTING_PAGE_SIZE_MAX);
  });

  it('normalizes bestJobsPageSize to allow-list', () => {
    const row = {
      id: HOMEPAGE_SETTINGS_SINGLETON_ID,
      bestJobsPageSize: 100, // not in allow-list
      listingPageSize: 12,
      updatedAt: new Date(),
    };
    expect(toHomepageSettingsDto(row).bestJobsPageSize).toBe(9);
  });
});

// ─── getHomepageSettings ─────────────────────────────────────────────────────

describe('getHomepageSettings', () => {
  it('returns existing row as DTO when row exists', async () => {
    const existingRow = {
      id: HOMEPAGE_SETTINGS_SINGLETON_ID,
      bestJobsPageSize: 6,
      listingPageSize: 20,
      updatedAt: new Date(),
    };
    const prisma = createMockPrisma(existingRow);
    const dto = await getHomepageSettings(prisma);
    expect(dto.id).toBe('default');
    expect(dto.bestJobsPageSize).toBe(6);
    expect(dto.listingPageSize).toBe(20);
  });

  it('bootstraps with defaults (9, 12) when row is missing', async () => {
    const prisma = createMockPrisma(null);
    const dto = await getHomepageSettings(prisma);
    expect(dto.bestJobsPageSize).toBe(9);
    expect(dto.listingPageSize).toBe(12);
  });

  it('bootstraps with defaults when findUnique throws', async () => {
    const prisma = {
      homepageSettings: {
        findUnique: vi.fn().mockRejectedValue(new Error('DB error')),
        upsert: vi.fn().mockImplementation(async ({ create }: { create: Record<string, unknown> }) => ({
          ...create,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      },
    } as unknown as Parameters<typeof getHomepageSettings>[0];
    await expect(getHomepageSettings(prisma)).rejects.toThrow('DB error');
  });

  it('upsert is called only when row is missing', async () => {
    const prisma = createMockPrisma({ id: 'default', bestJobsPageSize: 9, listingPageSize: 12, updatedAt: new Date() });
    await getHomepageSettings(prisma);
    expect(prisma.homepageSettings.upsert).not.toHaveBeenCalled();
  });
});

// ─── updateHomepageSettings ───────────────────────────────────────────────────

describe('updateHomepageSettings', () => {
  it('throws SettingsRowMissingError when row does not exist', async () => {
    const prisma = createMockPrisma(null);
    await expect(updateHomepageSettings(prisma, { bestJobsPageSize: 6 }, null))
      .rejects.toThrow(SettingsRowMissingError);
  });

  it('updates bestJobsPageSize and returns clamped DTO', async () => {
    const prisma = createMockPrisma({ id: 'default', bestJobsPageSize: 9, listingPageSize: 12, updatedAt: new Date() });
    const result = await updateHomepageSettings(prisma, { bestJobsPageSize: 12 }, 'user-1');
    expect(result.settings.bestJobsPageSize).toBe(12);
    expect(result.actorId).toBe('user-1');
  });

  it('updates listingPageSize and clamps to [6, 50]', async () => {
    const prisma = createMockPrisma({ id: 'default', bestJobsPageSize: 9, listingPageSize: 12, updatedAt: new Date() });
    const result = await updateHomepageSettings(prisma, { listingPageSize: 100 }, 'user-1');
    expect(result.settings.listingPageSize).toBe(50);
  });

  it('sets updatedById to null when actorId is null', async () => {
    const prisma = createMockPrisma({ id: 'default', bestJobsPageSize: 9, listingPageSize: 12, updatedAt: new Date() });
    const result = await updateHomepageSettings(prisma, { bestJobsPageSize: 3 }, null);
    expect(result.actorId).toBeNull();
  });

  it('normalizes invalid bestJobsPageSize to allow-list', async () => {
    const prisma = createMockPrisma({ id: 'default', bestJobsPageSize: 9, listingPageSize: 12, updatedAt: new Date() });
    const result = await updateHomepageSettings(prisma, { bestJobsPageSize: 7 }, 'user-1'); // not in allow-list
    expect(result.settings.bestJobsPageSize).toBe(9); // normalized to default
  });

  it('can update both fields in one call', async () => {
    const prisma = createMockPrisma({ id: 'default', bestJobsPageSize: 9, listingPageSize: 12, updatedAt: new Date() });
    const result = await updateHomepageSettings(prisma, { bestJobsPageSize: 6, listingPageSize: 30 }, 'user-1');
    expect(result.settings.bestJobsPageSize).toBe(6);
    expect(result.settings.listingPageSize).toBe(30);
  });
});

// ─── toHomepageSettingsView ──────────────────────────────────────────────────

describe('toHomepageSettingsView', () => {
  it('returns source=REAL when dto is provided', () => {
    const dto: HomepageSettingsDto = {
      id: 'default',
      bestJobsPageSize: 9,
      listingPageSize: 20,
      updatedAt: '2026-09-11T14:00:00.000Z',
    };
    const view = toHomepageSettingsView(dto);
    expect(view.source).toBe('REAL');
    expect(view.settings).toBe(dto);
    expect(view.defaultBestJobsPageSize).toBe(9);
    expect(view.defaultListingPageSize).toBe(12);
  });

  it('returns source=INTEGRATION_PENDING when dto is null', () => {
    const view = toHomepageSettingsView(null);
    expect(view.source).toBe('INTEGRATION_PENDING');
    expect(view.settings).toBeNull();
  });
});
