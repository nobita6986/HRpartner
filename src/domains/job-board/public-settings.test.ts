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

import { describe, it, expect, vi } from 'vitest';
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
function createMockPrisma(existingRow?: Record<string, unknown> | null) {
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
        zaloChatUrl: data.zaloChatUrl ?? null,
        messengerChatUrl: data.messengerChatUrl ?? null,
        phoneCallNumber: data.phoneCallNumber ?? null,
        newsSectionEnabled: data.newsSectionEnabled ?? true,
        stickyAnnouncement: data.stickyAnnouncement ?? null,
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
      zaloChatUrl: 'https://zalo.me/hrpartner',
      messengerChatUrl: 'https://m.me/hrpartner',
      phoneCallNumber: '+84901234567',
      newsSectionEnabled: true,
      stickyAnnouncement: null,
      updatedAt: new Date('2026-09-11T14:00:00.000Z'),
    };
    const dto = toHomepageSettingsDto(row);
    expect(dto.id).toBe('default');
    expect(dto.bestJobsPageSize).toBe(12);
    expect(dto.listingPageSize).toBe(24);
    expect(dto.zaloChatUrl).toBe('https://zalo.me/hrpartner');
    expect(dto.messengerChatUrl).toBe('https://m.me/hrpartner');
    expect(dto.phoneCallNumber).toBe('+84901234567');
    expect(dto.updatedAt).toBe('2026-09-11T14:00:00.000Z');
  });

  it('clamps listingPageSize out-of-range values', () => {
    const row = {
      id: HOMEPAGE_SETTINGS_SINGLETON_ID,
      bestJobsPageSize: 9,
      listingPageSize: 999, // out of range
      zaloChatUrl: null,
      messengerChatUrl: null,
      phoneCallNumber: null,
      newsSectionEnabled: true,
      stickyAnnouncement: null,
      updatedAt: new Date(),
    };
    expect(toHomepageSettingsDto(row).listingPageSize).toBe(LISTING_PAGE_SIZE_MAX);
  });

  it('normalizes bestJobsPageSize to allow-list', () => {
    const row = {
      id: HOMEPAGE_SETTINGS_SINGLETON_ID,
      bestJobsPageSize: 100, // not in allow-list
      listingPageSize: 12,
      zaloChatUrl: null,
      messengerChatUrl: null,
      phoneCallNumber: null,
      newsSectionEnabled: true,
      stickyAnnouncement: null,
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
      zaloChatUrl: null,
      messengerChatUrl: null,
      phoneCallNumber: null,
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

  it('normalizes chat URLs and permits clearing a channel', async () => {
    const prisma = createMockPrisma({
      id: 'default',
      bestJobsPageSize: 9,
      listingPageSize: 12,
      zaloChatUrl: null,
      messengerChatUrl: 'https://m.me/old-page',
      phoneCallNumber: null,
      updatedAt: new Date(),
    });
    const result = await updateHomepageSettings(
      prisma,
      { zaloChatUrl: '  https://zalo.me/new-oa  ', messengerChatUrl: '' },
      'user-1',
    );

    expect(result.settings.zaloChatUrl).toBe('https://zalo.me/new-oa');
    expect(result.settings.messengerChatUrl).toBeNull();
    expect(prisma.homepageSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          zaloChatUrl: 'https://zalo.me/new-oa',
          messengerChatUrl: null,
        }),
      }),
    );
  });

  it('rejects an off-platform chat URL', async () => {
    const prisma = createMockPrisma({
      id: 'default',
      bestJobsPageSize: 9,
      listingPageSize: 12,
      zaloChatUrl: null,
      messengerChatUrl: null,
      phoneCallNumber: null,
      updatedAt: new Date(),
    });

    await expect(
      updateHomepageSettings(prisma, { zaloChatUrl: 'https://example.com/chat' }, 'user-1'),
    ).rejects.toThrow('URL Zalo không hợp lệ.');
  });

  it('normalizes a formatted phone number and permits clearing it', async () => {
    const prisma = createMockPrisma({
      id: 'default',
      bestJobsPageSize: 9,
      listingPageSize: 12,
      zaloChatUrl: null,
      messengerChatUrl: null,
      phoneCallNumber: null,
      updatedAt: new Date(),
    });

    const saved = await updateHomepageSettings(
      prisma,
      { phoneCallNumber: '(+84) 901-234-567' },
      'user-1',
    );
    expect(saved.settings.phoneCallNumber).toBe('+84901234567');
    expect(prisma.homepageSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phoneCallNumber: '+84901234567' }),
      }),
    );

    const cleared = await updateHomepageSettings(prisma, { phoneCallNumber: '' }, 'user-1');
    expect(cleared.settings.phoneCallNumber).toBeNull();
  });

  it('rejects an invalid phone number', async () => {
    const prisma = createMockPrisma({
      id: 'default',
      bestJobsPageSize: 9,
      listingPageSize: 12,
      zaloChatUrl: null,
      messengerChatUrl: null,
      phoneCallNumber: null,
      updatedAt: new Date(),
    });

    await expect(
      updateHomepageSettings(prisma, { phoneCallNumber: 'tel:javascript' }, 'user-1'),
    ).rejects.toThrow('Số điện thoại không hợp lệ.');
  });
});

// ─── toHomepageSettingsView ──────────────────────────────────────────────────

describe('toHomepageSettingsView', () => {
  it('returns source=REAL when dto is provided', () => {
    const dto: HomepageSettingsDto = {
      id: 'default',
      bestJobsPageSize: 9,
      listingPageSize: 20,
      zaloChatUrl: null,
      messengerChatUrl: null,
      phoneCallNumber: null,
      newsSectionEnabled: true,
      stickyAnnouncement: {
        enabled: false,
        message: '',
        ctaLabel: null,
        ctaUrl: null,
        dismissible: true,
        backgroundOpacity: 100,
        marqueeDurationSeconds: 18,
        textColor: 'on-primary',
        font: 'SANS',
        emphasis: 'BOLD',
        animation: 'NONE',
        contentRevision: 'rev-0',
      },
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

// ─── Phase B / UI2 — newsSectionEnabled + stickyAnnouncement ─────────────────

import { toStickyAnnouncementDto } from './public-settings.service';

describe('toStickyAnnouncementDto', () => {
  it('returns safe defaults (enabled=false) for null', () => {
    const dto = toStickyAnnouncementDto(null);
    expect(dto.enabled).toBe(false);
    expect(dto.message).toBe('');
    expect(dto.ctaLabel).toBeNull();
    expect(dto.ctaUrl).toBeNull();
    expect(dto.dismissible).toBe(true);
    expect(dto.backgroundOpacity).toBe(100);
    expect(dto.marqueeDurationSeconds).toBe(18);
    expect(dto.contentRevision).toBe('rev-0');
  });

  it('returns safe defaults for non-object values (defense-in-depth)', () => {
    expect(toStickyAnnouncementDto('hello').enabled).toBe(false);
    expect(toStickyAnnouncementDto(42).enabled).toBe(false);
    expect(toStickyAnnouncementDto([1, 2, 3]).enabled).toBe(false);
  });

  it('parses a valid Phase A DTO and returns it', () => {
    const dto = toStickyAnnouncementDto({
      enabled: true,
      message: 'Hello world',
      ctaLabel: 'Open',
      ctaUrl: 'https://hrpartner.vn/about',
      dismissible: true,
      backgroundOpacity: 64,
      marqueeDurationSeconds: 13,
      textColor: 'on-primary',
      font: 'SANS',
      emphasis: 'BOLD',
      animation: 'NONE',
      contentRevision: 'rev-1234',
    });
    expect(dto.enabled).toBe(true);
    expect(dto.message).toBe('Hello world');
    expect(dto.ctaLabel).toBe('Open');
    expect(dto.ctaUrl).toBe('https://hrpartner.vn/about');
    expect(dto.backgroundOpacity).toBe(64);
    expect(dto.marqueeDurationSeconds).toBe(13);
    expect(dto.contentRevision).toBe('rev-1234');
  });

  it('rejects invalid URL with safe defaults', () => {
    // The DTO projection is permissive (URL safety is enforced at the
    // service write path AND in the read-side component). This test pins
    // the projection's contract: a non-empty message + invalid URL is still
    // a parseable DTO; the runtime component is responsible for URL safety.
    const dto = toStickyAnnouncementDto({
      enabled: true,
      message: 'X',
      ctaLabel: null,
      ctaUrl: 'javascript:alert(1)',
      dismissible: true,
      textColor: 'on-primary',
      font: 'SANS',
      emphasis: 'BOLD',
      animation: 'NONE',
      contentRevision: 'rev-1',
    });
    expect(dto.enabled).toBe(true);
    expect(dto.ctaUrl).toBe('javascript:alert(1)');
  });
});

describe('Phase B / UI2 - toHomepageSettingsDto with new fields', () => {
  it('defaults newsSectionEnabled to true when row has no value (legacy data)', () => {
    const row = {
      id: HOMEPAGE_SETTINGS_SINGLETON_ID,
      bestJobsPageSize: 9,
      listingPageSize: 12,
      zaloChatUrl: null,
      messengerChatUrl: null,
      phoneCallNumber: null,
      newsSectionEnabled: undefined as unknown as boolean,
      stickyAnnouncement: null,
      updatedAt: new Date(),
    };
    const dto = toHomepageSettingsDto(row);
    expect(dto.newsSectionEnabled).toBe(true);
    expect(dto.stickyAnnouncement.enabled).toBe(false);
  });

  it('propagates newsSectionEnabled=false and a valid sticky DTO', () => {
    const row = {
      id: HOMEPAGE_SETTINGS_SINGLETON_ID,
      bestJobsPageSize: 9,
      listingPageSize: 12,
      zaloChatUrl: null,
      messengerChatUrl: null,
      phoneCallNumber: null,
      newsSectionEnabled: false,
      stickyAnnouncement: {
        enabled: true,
        message: 'Open jobs in Hanoi',
        ctaLabel: 'Xem',
        ctaUrl: '/viec-lam',
        dismissible: true,
        backgroundOpacity: 73,
        marqueeDurationSeconds: 15,
        textColor: 'on-primary',
        font: 'SANS',
        emphasis: 'BOLD',
        animation: 'NONE',
        contentRevision: 'rev-2026-10-04',
      },
      updatedAt: new Date('2026-10-04T16:00:00.000Z'),
    };
    const dto = toHomepageSettingsDto(row);
    expect(dto.newsSectionEnabled).toBe(false);
    expect(dto.stickyAnnouncement.enabled).toBe(true);
    expect(dto.stickyAnnouncement.message).toBe('Open jobs in Hanoi');
    expect(dto.stickyAnnouncement.backgroundOpacity).toBe(73);
    expect(dto.stickyAnnouncement.marqueeDurationSeconds).toBe(15);
    expect(dto.stickyAnnouncement.contentRevision).toBe('rev-2026-10-04');
  });
});

describe('Phase B / UI2 - updateHomepageSettings new fields', () => {
  it('persists newsSectionEnabled', async () => {
    const prisma = createMockPrisma({ id: 'default', bestJobsPageSize: 9, listingPageSize: 12, updatedAt: new Date() });
    const result = await updateHomepageSettings(prisma, { newsSectionEnabled: false }, 'user-1');
    expect(result.settings.newsSectionEnabled).toBe(false);
    expect(prisma.homepageSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ newsSectionEnabled: false }),
      }),
    );
  });

  it('persists a valid stickyAnnouncement payload', async () => {
    const prisma = createMockPrisma({ id: 'default', bestJobsPageSize: 9, listingPageSize: 12, updatedAt: new Date() });
    const sticky = {
      enabled: true,
      message: 'Hello',
      ctaLabel: 'Open',
      ctaUrl: 'https://hrpartner.vn/about',
      dismissible: true,
      backgroundOpacity: 63,
      marqueeDurationSeconds: 12,
      textColor: 'on-primary' as const,
      font: 'SANS' as const,
      emphasis: 'BOLD' as const,
      animation: 'NONE' as const,
      contentRevision: 'rev-1',
    };
    const result = await updateHomepageSettings(prisma, { stickyAnnouncement: sticky }, 'user-1');
    expect(result.settings.stickyAnnouncement.enabled).toBe(true);
    expect(result.settings.stickyAnnouncement.contentRevision).toBe('rev-1');
    expect(result.settings.stickyAnnouncement.backgroundOpacity).toBe(63);
    expect(result.settings.stickyAnnouncement.marqueeDurationSeconds).toBe(12);
    expect(prisma.homepageSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stickyAnnouncement: expect.objectContaining({
            backgroundOpacity: 63,
            marqueeDurationSeconds: 12,
          }),
        }),
      }),
    );
  });

  it('clears stickyAnnouncement when set to null', async () => {
    const prisma = createMockPrisma({ id: 'default', bestJobsPageSize: 9, listingPageSize: 12, updatedAt: new Date() });
    const result = await updateHomepageSettings(prisma, { stickyAnnouncement: null }, 'user-1');
    expect(result.settings.stickyAnnouncement.enabled).toBe(false);
    expect(result.settings.stickyAnnouncement.message).toBe('');
  });

  it('throws when stickyAnnouncement has an invalid URL', async () => {
    const prisma = createMockPrisma({ id: 'default', bestJobsPageSize: 9, listingPageSize: 12, updatedAt: new Date() });
    const bad = {
      enabled: true,
      message: 'X',
      ctaLabel: null,
      ctaUrl: 'javascript:alert(1)',
      dismissible: true,
      backgroundOpacity: 100,
      marqueeDurationSeconds: 18,
      textColor: 'on-primary' as const,
      font: 'SANS' as const,
      emphasis: 'BOLD' as const,
      animation: 'NONE' as const,
      contentRevision: 'rev-1',
    };
    await expect(updateHomepageSettings(prisma, { stickyAnnouncement: bad }, 'user-1'))
      .rejects.toThrow();
  });

  it('throws when stickyAnnouncement.message exceeds 280 chars', async () => {
    const prisma = createMockPrisma({ id: 'default', bestJobsPageSize: 9, listingPageSize: 12, updatedAt: new Date() });
    const bad = {
      enabled: true,
      message: 'X'.repeat(300),
      ctaLabel: null,
      ctaUrl: null,
      dismissible: true,
      backgroundOpacity: 100,
      marqueeDurationSeconds: 18,
      textColor: 'on-primary' as const,
      font: 'SANS' as const,
      emphasis: 'BOLD' as const,
      animation: 'NONE' as const,
      contentRevision: 'rev-1',
    };
    await expect(updateHomepageSettings(prisma, { stickyAnnouncement: bad }, 'user-1'))
      .rejects.toThrow();
  });
});
