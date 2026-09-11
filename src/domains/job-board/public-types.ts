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
