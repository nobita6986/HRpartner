/**
 * Typed view-models cho UI04d section renderer (Plan UI Task D).
 *
 * Source enum:
 * - `'REAL'` — render từ dữ liệu thật (e.g. `overview.newest`)
 * - `'DEMO'` — render từ fixture local trước khi AV6 CMS triển khai
 * - `'INTEGRATION_PENDING'` — chờ integration (sẽ HIDDEN khi data rỗng)
 *
 * Mỗi view-model có `id`, `enabled`, `order`, `source`. Section component
 * nhận view-model qua prop; policy `enabled === false` → return null,
 * `source === 'REAL'` + data rỗng → HIDDEN (không fallback giả).
 */

import type { EnrichedJob } from '@/app/(portal)/page';

export type SectionSource = 'REAL' | 'DEMO' | 'INTEGRATION_PENDING';

interface BaseSectionViewModel {
  id: string;
  enabled: boolean;
  order: number;
  source: SectionSource;
}

/* ─── Section 1 — Việc làm mới nhất (REAL) ─────────────────────────────── */

export interface NewestJobsContent extends BaseSectionViewModel {
  source: 'REAL';
  /** Title hiển thị cho section */
  title: string;
  /** Subtitle/description ngắn (optional) */
  subtitle?: string;
  /** Dữ liệu thật từ `overview.newest` đã `enrichJob` trong page.tsx. */
  jobs: EnrichedJob[];
}

/* ─── Section 2 — Giới thiệu HRP (DEMO) ──────────────────────────────── */

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
  /** Image URL local (e.g. `/images/homepage-huongb/referral-team.webp`) */
  imageUrl: string;
  imageAlt: string;
  /** Rich text content — paragraphs: string[] render trực tiếp bằng map.
   *  KHÔNG HTML string, KHÔNG dangerouslySetInnerHTML. */
  paragraphs: string[];
  /** 4 ô giá trị lấy từ 5 dịch vụ HRP */
  values: HrpValueItem[];
}

/* ─── Section 3 — Đối tác/minh họa (DEMO) ────────────────────────────── */

export interface PartnerStripItem {
  /** Monogram text hiển thị (vd "HRP", "YP", "KT") */
  monogram: string;
  /** Tên hiển thị (optional) */
  label?: string;
}

export interface PartnerStripContent extends BaseSectionViewModel {
  source: 'DEMO';
  title: string;
  /** 5 logo strip — đều dùng monogram local (HRP lặp hoặc project abbreviation) */
  partners: PartnerStripItem[];
}

/* ─── Section 4 — Tin tức & cẩm nang (DEMO) ──────────────────────────── */

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

/* ─── Section 5 — Banner trải nghiệm trên di động (DEMO) ────────────── */

export interface MobileBannerContentExtended extends BaseSectionViewModel {
  source: 'DEMO';
  title: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
  ctaText: string;
  /** CTA route thật (vd `/viec-lam`). KHÔNG App Store/Google Play URL giả. */
  ctaHref: string;
}
