/**
 * Typed view-models cho UI04d section renderer (Plan UI Task D) — v1.9 cắt gọn.
 *
 * Source enum:
 * - `'REAL'` — render từ dữ liệu thật (e.g. `overview.newest`)
 * - `'DEMO'` — render từ fixture local trước khi AV6 CMS triển khai
 * - `'INTEGRATION_PENDING'` — chỗ dành cho section chờ integration (sẽ HIDDEN khi data rỗng)
 *
 * Mỗi view-model có `id`, `enabled`, `order`, `source`. Section component
 * nhận view-model qua prop; policy `enabled === false` → return null,
 * `source === 'REAL'` + data rỗng → HIDDEN (không fallback giả).
 *
 * v1.9 (11/09/2026): Bỏ 3 view-model không dùng — `NewestJobsContent`,
 * `PartnerStripContent`, `MobileBannerContentExtended`. Homepage mới giữ 2
 * section renderer: HrpIntro (Section 2 — Về HRP) + News (Section 4 — Tin tức).
 *
 * AV1 (11/09/2026): Thêm `HomepageSettingsDto`/`HomepageSettingsView` và helpers
 * `clampListingPageSize`/`normalizeBestJobsPageSize`/`toHomepageSettingsView`.
 */

import type { EnrichedJob } from '@/app/(portal)/page';

export type SectionSource = 'REAL' | 'DEMO' | 'INTEGRATION_PENDING';

interface BaseSectionViewModel {
  id: string;
  enabled: boolean;
  order: number;
  source: SectionSource;
}

/* ─── Section — Về HRP (DEMO) ───────────────────────────────────── */

export interface HrpValueItem {
  /** Tiêu đề ngắn của ô giá trị */
  title: string;
  /** Mô tả 1-2 câu */
  body: string;
  /** Tên Lucide icon — dùng dynamic import hoặc tên để render inline */
  iconName: 'package' | 'users' | 'briefcase' | 'truck' | 'shield-check';
}

export interface HrpIntroContent extends BaseSectionViewModel {
  source: 'DEMO';
  title: string;
  /** Image URL local (e.g. `/images/homepage-huongb/industrial-location-04.webp`) */
  imageUrl: string;
  imageAlt: string;
  /** Rich text content — paragraphs: string[] render trực tiếp bằng map.
   *  KHÔNG HTML string, KHÔNG dangerouslySetInnerHTML. */
  paragraphs: string[];
  /** 3 ô giá trị lấy từ 5 dịch vụ HRP (v1.9: gọn lại còn 3, bỏ "Giới thiệu việc làm" + "shield-check") */
  values: HrpValueItem[];
}

/* ─── Section — Tin tức & cẩm nang (DEMO) ──────────────────────── */

export type ArticleStructuredBlock =
  | { type: 'paragraph'; content: string }
  | { type: 'heading'; content: string }
  | { type: 'list'; content: string[] };

export interface ArticleCardExtended {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  imageUrl: string;
  /** Body dạng structured content array — render trực tiếp bằng React elements */
  body: ArticleStructuredBlock[];
}

export interface NewsSectionContent extends BaseSectionViewModel {
  source: 'DEMO';
  title: string;
  featured: ArticleCardExtended;
  others: ArticleCardExtended[];
}

/* ─── AV1 — HomepageSettings (Plan UI B integration) ────────────── */

/** Allow-list page sizes for the BestJobs section. Hardcoded (single source of truth). */
export const BEST_JOBS_PAGE_SIZES = [3, 6, 9, 12] as const;
export type BestJobsPageSize = (typeof BEST_JOBS_PAGE_SIZES)[number];

/** Range bounds for the public listing page size. */
export const LISTING_PAGE_SIZE_MIN = 6;
export const LISTING_PAGE_SIZE_MAX = 50;
export const LISTING_PAGE_SIZE_DEFAULT = 12;
export const BEST_JOBS_PAGE_SIZE_DEFAULT = 9;

/** DTO contract — public projection. */
export interface HomepageSettingsDto {
  /** Singleton id — always `'default'`. */
  id: 'default';
  /** Number of jobs per page in BestJobs section. Validated to be 3|6|9|12. */
  bestJobsPageSize: BestJobsPageSize;
  /** Number of jobs per page in `/viec-lam`. Validated to be 6..50. */
  listingPageSize: number;
  /** ISO string of last update. */
  updatedAt: string;
}

/**
 * View-model used by UI components. Adds a `source` discriminator so the
 * component can decide between rendering the real value or a sensible default
 * during `INTEGRATION_PENDING` (e.g. before migration applied, during a transient
 * DB outage, or when the singleton row was just bootstrapped).
 */
export interface HomepageSettingsView {
  settings: HomepageSettingsDto | null;
  /** 'REAL' when settings were read from DB; 'INTEGRATION_PENDING' otherwise. */
  source: 'REAL' | 'INTEGRATION_PENDING';
  /** Default used as fallback when source === 'INTEGRATION_PENDING'. */
  defaultBestJobsPageSize: typeof BEST_JOBS_PAGE_SIZE_DEFAULT;
  /** Default used as fallback when source === 'INTEGRATION_PENDING'. */
  defaultListingPageSize: typeof LISTING_PAGE_SIZE_DEFAULT;
}

/**
 * Clamp helper for listing page size — used both at API boundary and by UI
 * fallback logic. Returns the closest valid value within [min, max].
 */
export function clampListingPageSize(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return LISTING_PAGE_SIZE_DEFAULT;
  }
  return Math.min(LISTING_PAGE_SIZE_MAX, Math.max(LISTING_PAGE_SIZE_MIN, Math.floor(value)));
}

/**
 * Validate bestJobsPageSize is in the allow-list. Returns the value when valid,
 * the default otherwise.
 */
export function normalizeBestJobsPageSize(value: number | null | undefined): BestJobsPageSize {
  if (value !== null && value !== undefined && Number.isFinite(value)) {
    const int = Math.floor(value);
    if ((BEST_JOBS_PAGE_SIZES as readonly number[]).includes(int)) {
      return int as BestJobsPageSize;
    }
  }
  return BEST_JOBS_PAGE_SIZE_DEFAULT;
}

/**
 * Build a view-model from a DTO. Pure function — safe to use in tests.
 */
export function toHomepageSettingsView(dto: HomepageSettingsDto | null): HomepageSettingsView {
  return {
    settings: dto,
    source: dto === null ? 'INTEGRATION_PENDING' : 'REAL',
    defaultBestJobsPageSize: BEST_JOBS_PAGE_SIZE_DEFAULT,
    defaultListingPageSize: LISTING_PAGE_SIZE_DEFAULT,
  };
}
