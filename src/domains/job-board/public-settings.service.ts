/**
 * public-settings.service.ts — AV1 HomepageSettings service layer.
 *
 * Single source of truth for reading + bootstrapping the singleton settings row.
 * Two contracts:
 *
 *   1. `getHomepageSettings(prisma)` — idempotent read. If the row is missing
 *      (e.g. migration not applied on a fresh DB, or row accidentally deleted),
 *      this function bootstraps it with defaults (9, 12) and returns the DTO.
 *      The bootstrap uses `upsert` so concurrent calls don't create duplicates.
 *
 *   2. `updateHomepageSettings(prisma, input, actorId)` — ADMIN-only write path.
 *      Validates the input, clamps values, and writes via `update` (NOT upsert —
 *      the row must already exist; if missing, an error is raised, because admin
 *      write should never implicitly create).
 *
 * Both functions read/write ONLY through Prisma — they are wrapped by route
 * handlers that handle auth, cache tags, and rate limits.
 */

import { Prisma } from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';
import {
  BEST_JOBS_PAGE_SIZE_DEFAULT,
  LISTING_PAGE_SIZE_DEFAULT,
  HERO_SLIDES_COUNT,
  HeroSlidesSchema,
  type HeroSlidePublic,
  type HeroSlideInput,
  clampListingPageSize,
  normalizeBestJobsPageSize,
  type HomepageSettingsDto,
} from './public-types';
import {
  normalizeChatUrl,
  normalizePhoneNumber,
  resolveChatHref,
  resolvePhoneNumber,
} from './chat-links';
import type { StickyAnnouncementDto } from './public-content-controls/types';
import { StickyAnnouncementSchema } from './public-content-controls/types';
import { toStickyAnnouncementDto } from './public-content-controls/dto-projection';
import { normalizeCtaUrl } from './public-content-controls/url-safety';

export const HOMEPAGE_SETTINGS_SINGLETON_ID = 'default' as const;

/** Subset of Prisma client surface used by this service — accepts both PrismaClient and TransactionClient. */
type SettingsDelegate = PrismaTypes.HomepageSettingsDelegate;
type SettingsClient =
  | { homepageSettings: SettingsDelegate }
  | (PrismaTypes.TransactionClient & { homepageSettings: SettingsDelegate });

export { toStickyAnnouncementDto };

/**
 * hrp-t2-public-site-hotfix (T2 / STEP-02): hình dạng row Media khi join
 * Hero image. Chỉ 4 cột cần cho public projection; service chọn subset để
 * tránh truy nguyên owner_id hay created_by_id (không xuất ra public DTO).
 */
type HeroMediaRow = {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
};

/** Internal row shape from Prisma (matches schema.prisma `HomepageSettings`). */
type SettingsRow = {
  id: string;
  bestJobsPageSize: number;
  listingPageSize: number;
  zaloChatUrl: string | null;
  messengerChatUrl: string | null;
  phoneCallNumber: string | null;
  newsSectionEnabled: boolean;
  stickyAnnouncement: Prisma.JsonValue | null;
  /**
   * hrp-t2-public-site-hotfix (T2 / STEP-02): FK tới Media.id (nullable).
   * Service KHÔNG include heroImage trong DTO read mặc định — caller phải
   * pass `includeHeroImage: true` (qua `withHomepageSettings(row, true)`)
   * hoặc đi qua path join để nhận Hero. Lý do: trang chỉ đọc page sizes /
   * contact URLs / sticky 99% thời gian — không cần query media mỗi r.
   */
  heroImageMediaId: string | null;
  heroImage?: HeroMediaRow | null;
  /**
   * hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-02):
   * JSON cột nullable chứa mảng 5 slide `{mediaId, title, desc}`. NULL
   * = giữ hardcoded array hiện tại ở `RecruitmentHighlight`. Service tự
   * parse qua Zod schema; nếu parse fail (DB corrupted) → length 0 fallback.
   */
  heroSlides: Prisma.JsonValue | null;
  updatedAt: Date;
};

/**
 * hrp-t2-public-site-hotfix (T2 / STEP-02): attach joined Hero image (or
 * clear null) vào row đã đọc về. Pure — không I/O. Trả row mới (immutable).
 */
function withHomepageSettingsHero(
  row: SettingsRow,
  hero: HeroMediaRow | null,
): SettingsRow {
  return { ...row, heroImage: hero };
}

/** Map a Prisma row to the public DTO. Pure function — safe for tests. */
export function toHomepageSettingsDto(row: SettingsRow): Omit<HomepageSettingsDto, 'heroSlides'> {
  return {
    id: 'default',
    bestJobsPageSize: normalizeBestJobsPageSize(row.bestJobsPageSize),
    listingPageSize: clampListingPageSize(row.listingPageSize),
    zaloChatUrl: resolveChatHref(row.zaloChatUrl, 'zalo'),
    messengerChatUrl: resolveChatHref(row.messengerChatUrl, 'messenger'),
    phoneCallNumber: resolvePhoneNumber(row.phoneCallNumber),
    newsSectionEnabled: row.newsSectionEnabled ?? true,
    stickyAnnouncement: toStickyAnnouncementDto(row.stickyAnnouncement),
    // hrp-t2-public-site-hotfix (T2 / STEP-02): Hero image projection — null
    // khi `heroImageMediaId` null HOẶC joined media row absent (FK SET NULL).
    heroImage:
      row.heroImage === undefined || row.heroImage === null
        ? null
        : {
            mediaId: row.heroImage.id,
            url: row.heroImage.url,
            alt: row.heroImage.alt,
            caption: row.heroImage.caption,
          },
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-02):
 * Parse + join Media rows cho 5 slide. Pure ngoài việc gọi `media.findMany`
 * qua `prisma`. Trả `[]` khi column null OR parse fail (fallback về hardcoded
 * array ở component `RecruitmentHighlight`).
 */
export async function buildHeroSlidesPublic(
  rawJson: Prisma.JsonValue | null,
  // hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-02):
  // accept `SettingsClient` (Prisma delegate) hoặc unit-test mock. Loose
  // shape — function body cast `(prisma as unknown as { media: ... })` để
  // truy cập media.findMany (settings table đã có sẵn media delegate ở
  // Prisma client runtime, chỉ TS subset không include).
  prisma:
    | SettingsClient
    | { media: { findMany: (a: unknown) => Promise<HeroMediaRow[]> } },
): Promise<HeroSlidePublic[]> {
  if (rawJson === null || rawJson === undefined) return [];
  const parsed = HeroSlidesSchema.safeParse(rawJson);
  if (!parsed.success) {
    console.warn(
      '[public-settings] hero_slides JSON parse fail; fallback [] — ',
      parsed.error.issues[0]?.message,
    );
    return [];
  }
  const inputs = parsed.data;
  // Collect non-null mediaIds (1..5 slots, deduplicate; 1 row lookup cho mỗi id).
  const mediaIds = Array.from(
    new Set(inputs.map((s) => s.mediaId).filter((id): id is string => id !== null)),
  );
  const mediaMap = new Map<string, HeroMediaRow>();
  if (mediaIds.length > 0) {
    const rows = await (prisma as unknown as {
      media: { findMany: (a: unknown) => Promise<HeroMediaRow[]> };
    }).media.findMany({
      where: { id: { in: mediaIds } },
      select: { id: true, url: true, alt: true, caption: true },
    });
    for (const row of rows) mediaMap.set(row.id, row);
  }
  return inputs.map((input, i) => {
    const media = input.mediaId !== null ? mediaMap.get(input.mediaId) ?? null : null;
    return {
      index: i + 1,
      mediaId: input.mediaId,
      url: media?.url ?? null,
      alt: media?.alt ?? '',
      title: input.title,
      desc: input.desc,
    };
  });
}

/**
 * Read the singleton settings row. If missing, bootstrap it with defaults.
 *
 * Idempotent — concurrent callers will all read the same row. The `upsert`
 * pattern is safe because the table has a singleton CHECK constraint.
 *
 * hrp-t2-public-site-hotfix (T2 / STEP-02): joins `media` row for Hero image
 * only when `heroImageMediaId` is non-null; null FK or absent row → `null` heroImage
 * trong DTO. Khi bootstrap, `heroImageMediaId` mặc định null → không có join.
 */
export async function getHomepageSettings(prisma: SettingsClient): Promise<HomepageSettingsDto> {
  // Step 1: try to read the existing row (without hero join — 99% path).
  const existing = await prisma.homepageSettings.findUnique({
    where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID },
  });

  if (existing) {
    const base = toHomepageSettingsDto(withHomepageSettingsHero(existing, await loadHeroImage(existing, prisma)));
    // hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-02):
    // parse + join 5 slide media rows. Khi column null → `[]` (fallback hardcoded).
    const heroSlides = await buildHeroSlidesPublic(existing.heroSlides, prisma);
    return { ...base, heroSlides };
  }

  // Step 2: bootstrap with defaults. Upsert handles concurrent calls safely.
  const bootstrapped = await prisma.homepageSettings.upsert({
    where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID },
    create: {
      id: HOMEPAGE_SETTINGS_SINGLETON_ID,
      bestJobsPageSize: BEST_JOBS_PAGE_SIZE_DEFAULT,
      listingPageSize: LISTING_PAGE_SIZE_DEFAULT,
      newsSectionEnabled: true,
      stickyAnnouncement: Prisma.JsonNull,
    },
    update: {}, // no-op when row already exists
  });

  const base = toHomepageSettingsDto(withHomepageSettingsHero(bootstrapped, null));
  return { ...base, heroSlides: [] };
}

/**
 * hrp-t2-public-site-hotfix (T2 / STEP-02): helper load heroImage row (chỉ
 * khi `heroImageMediaId` non-null). Trả null khi skip / media missing.
 */
async function loadHeroImage(
  row: { heroImageMediaId: string | null },
  prisma: SettingsClient,
): Promise<HeroMediaRow | null> {
  if (!row.heroImageMediaId) return null;
  return (prisma as unknown as {
    media: { findUnique: (a: unknown) => Promise<HeroMediaRow | null> };
  }).media.findUnique({
    where: { id: row.heroImageMediaId },
    select: { id: true, url: true, alt: true, caption: true },
  });
}

/** Input shape for admin write. All fields optional; omitted fields are unchanged. */
export interface UpdateHomepageSettingsInput {
  bestJobsPageSize?: number;
  listingPageSize?: number;
  zaloChatUrl?: string | null;
  messengerChatUrl?: string | null;
  phoneCallNumber?: string | null;
  /** Phase B / UI2 — news section toggle. Optional. */
  newsSectionEnabled?: boolean;
  /**
   * Phase B / UI2 — sticky announcement payload. Optional.
   *
   *   - `undefined` → column unchanged.
   *   - `null`      → column set to NULL (admin cleared the bar).
   *   - object      → validated by `StickyAnnouncementSchema` and persisted.
   *                   Throws `ZodError` on schema failure.
   */
  stickyAnnouncement?: StickyAnnouncementDto | null;
  /**
   * hrp-t2-public-site-hotfix (T2 / STEP-02): Hero image media id.
   *   - `undefined` → column unchanged.
   *   - `null`      → clear Hero (admin xoá chọn ảnh).
   *   - string      → FK tới media.id. Prisma sẽ tự reject nếu id không tồn
   *                    tại (P2003); nếu media row xoá sau đó, FK SET NULL tự
   *                    xử (không cần admin dọn).
   */
  heroImageMediaId?: string | null;
  /**
   * hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-03): 5 slide
   * payload cho Hero carousel bên phải trang chủ.
   *   - `undefined` → cột `hero_slides` JSONB giữ nguyên.
   *   - `null`      → xoá payload (clear toàn bộ slide custom → fallback hardcoded).
   *   - array       → đã được `HeroSlidesSchema` validate ở API layer; lưu
   *                   thẳng vào cột JSONB. Length luôn = HERO_SLIDES_COUNT (5).
   */
  heroSlides?: HeroSlideInput[] | null;
}

/** Result type for admin write — returns the post-write DTO. */
export interface UpdateHomepageSettingsResult {
  settings: HomepageSettingsDto;
  actorId: string | null;
}

/**
 * Admin write path. Validates + clamps input, then writes via `update`.
 *
 * Errors:
 *   - `SettingsRowMissingError`: row does not exist. Caller should bootstrap first.
 *   - `SettingsSingletonViolationError`: DB-level CHECK constraint rejected the update
 *     (e.g. somehow tried to set id != 'default'). Should never happen in normal flow.
 */
export class SettingsRowMissingError extends Error {
  constructor() {
    super('SETTINGS_ROW_MISSING');
    this.name = 'SettingsRowMissingError';
  }
}

export async function updateHomepageSettings(
  prisma: SettingsClient,
  input: UpdateHomepageSettingsInput,
  actorId: string | null,
): Promise<UpdateHomepageSettingsResult> {
  // Pre-check the row exists — admin write should not implicitly create.
  // The bootstrap path is `getHomepageSettings`, not this function.
  const existing = await prisma.homepageSettings.findUnique({
    where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID },
    select: { id: true },
  });

  if (!existing) {
    throw new SettingsRowMissingError();
  }

  const data: {
    bestJobsPageSize?: number;
    listingPageSize?: number;
    zaloChatUrl?: string | null;
    messengerChatUrl?: string | null;
    phoneCallNumber?: string | null;
    newsSectionEnabled?: boolean;
    stickyAnnouncement?: Prisma.InputJsonValue | Prisma.JsonNullValueInput;
    /** hrp-t2-public-site-hotfix (T2 / STEP-02): cột Hero image FK. */
    heroImageMediaId?: string | null;
    /** hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-03): cột JSONB 5 slide. */
    heroSlides?: Prisma.InputJsonValue | Prisma.JsonNullValueInput;
    updatedById: string | null;
  } = { updatedById: actorId };

  if (input.bestJobsPageSize !== undefined) {
    data.bestJobsPageSize = normalizeBestJobsPageSize(input.bestJobsPageSize);
  }
  if (input.listingPageSize !== undefined) {
    data.listingPageSize = clampListingPageSize(input.listingPageSize);
  }
  if (input.zaloChatUrl !== undefined) {
    data.zaloChatUrl = normalizeChatUrl(input.zaloChatUrl, 'zalo');
  }
  if (input.messengerChatUrl !== undefined) {
    data.messengerChatUrl = normalizeChatUrl(input.messengerChatUrl, 'messenger');
  }
  if (input.phoneCallNumber !== undefined) {
    data.phoneCallNumber = normalizePhoneNumber(input.phoneCallNumber);
  }
  if (input.newsSectionEnabled !== undefined) {
    if (typeof input.newsSectionEnabled !== 'boolean') {
      throw new Error('newsSectionEnabled phải là boolean.');
    }
    data.newsSectionEnabled = input.newsSectionEnabled;
  }
  if (input.stickyAnnouncement !== undefined) {
    if (input.stickyAnnouncement === null) {
      data.stickyAnnouncement = Prisma.JsonNull;
    } else {
      const parsed = StickyAnnouncementSchema.parse(input.stickyAnnouncement);
      // Defense-in-depth: Phase A also enforces URL safety on the read path.
      // The server-side write must reject unsafe URLs before persistence.
      if (parsed.ctaUrl) {
        try {
          normalizeCtaUrl(parsed.ctaUrl);
        } catch {
          throw new Error('ctaUrl không hợp lệ.');
        }
      }
      data.stickyAnnouncement = parsed as unknown as Prisma.InputJsonValue;
    }
  }
  // hrp-t2-public-site-hotfix (T2 / STEP-02): chấp nhận string id hoặc null
  // để clear. Validate cú pháp (string non-empty) — FK existence do DB layer
  // xử (P2003).
  if (input.heroImageMediaId !== undefined) {
    if (input.heroImageMediaId === null) {
      data.heroImageMediaId = null;
    } else if (typeof input.heroImageMediaId !== 'string' || input.heroImageMediaId.trim() === '') {
      throw new Error('heroImageMediaId phải là chuỗi khác rỗng hoặc null.');
    } else {
      data.heroImageMediaId = input.heroImageMediaId.trim();
    }
  }
  // hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-03):
  // ghi trực tiếp mảng 5 slide (đã validate ở API layer) hoặc JsonNull khi clear.
  if (input.heroSlides !== undefined) {
    if (input.heroSlides === null) {
      data.heroSlides = Prisma.JsonNull;
    } else {
      data.heroSlides = input.heroSlides as unknown as Prisma.InputJsonValue;
    }
  }

  const updated = await prisma.homepageSettings.update({
    where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID },
    data,
  });

  // hrp-t2-public-site-hotfix (T2 / STEP-02): re-join hero để DTO phản ánh
  // media row mới nhất (FK SET NULL nếu media bị xoá giữa đường).
  const hero = await loadHeroImage(updated, prisma);
  const heroSlidesPublic = await buildHeroSlidesPublic(updated.heroSlides, prisma);
  return {
    settings: {
      ...toHomepageSettingsDto(withHomepageSettingsHero(updated, hero)),
      heroSlides: heroSlidesPublic,
    },
    actorId,
  };
}
