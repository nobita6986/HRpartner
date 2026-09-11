'use client';

import { useState } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import type { NewsSectionContent, ArticleCardExtended } from '../../public-types';
import { NewsPreviewModal } from './news-preview-modal';

/**
 * Section 4 — Tin tức & cẩm nang (DEMO).
 *
 * v1.9: 1 bài lớn (featured, col-span-2 row-span-2) + 2 bài nhỏ (others).
 * v1.11 (11/09/2026): đổi layout → 1 featured full-width (col-span-4) + 4 bài
 * nhỏ (others, grid-cols-4). Tổng 5 article. Click mở NewsPreviewModal.
 *
 * Client component vì dùng useState cho modal.
 *
 * HIDDEN nếu `enabled === false`.
 */
export function NewsSection({ content }: { content: NewsSectionContent }) {
  const [selected, setSelected] = useState<ArticleCardExtended | null>(null);

  if (!content.enabled) return null;

  return (
    <section
      data-section="news"
      data-source={content.source}
      aria-labelledby="hrp-news-heading"
      className="w-full px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6"
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container">
            <span
              className="material-symbols-outlined text-base text-primary-dark"
              aria-hidden="true"
            >
              article
            </span>
          </span>
          <h2
            id="hrp-news-heading"
            className="font-head text-headline-lg font-bold text-on-surface"
          >
            {content.title}
          </h2>
        </div>

        {/* v1.11: grid lg:grid-cols-4 — featured full-width row 1 (col-span-4), 4 others row 2 (col-span-1 mỗi) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          {/* Featured (full-width row 1) */}
          <button
            type="button"
            onClick={() => setSelected(content.featured)}
            className="hrp-focus group flex h-full flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm transition-all hover:shadow-md lg:col-span-4 text-left"
            data-testid={`news-featured-${content.featured.id}`}
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              <img
                src={content.featured.imageUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary-fixed/40 px-3 py-1 font-label text-label-sm font-bold text-primary-dark">
                  {content.featured.category}
                </span>
                <span className="inline-flex items-center gap-1 font-body text-label-sm text-on-surface-variant">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatPublishedAt(content.featured.publishedAt)}
                </span>
              </div>
              <h3 className="font-head text-headline-md font-bold text-on-surface transition-colors group-hover:text-primary-dark">
                {content.featured.title}
              </h3>
              <p className="font-body text-body-md text-on-surface-variant">
                {content.featured.excerpt}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 font-label text-label-md font-bold text-primary-dark">
                Đọc tiếp
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          </button>

          {/* Others (small) — v1.11: 4 cards, 4-col grid */}
          {content.others.slice(0, 4).map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => setSelected(article)}
              className="hrp-focus group flex h-full flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm transition-all hover:shadow-md text-left"
              data-testid={`news-card-${article.id}`}
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <img
                  src={article.imageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-primary-fixed/40 px-2.5 py-0.5 font-label text-label-sm font-bold text-primary-dark">
                    {article.category}
                  </span>
                <span className="inline-flex items-center gap-1 font-body text-label-sm text-on-surface-variant">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                    {formatPublishedAt(article.publishedAt)}
                  </span>
                </div>
                <h3 className="font-head text-headline-md font-bold text-on-surface transition-colors group-hover:text-primary-dark">
                  {article.title}
                </h3>
                <p className="font-body text-label-sm text-on-surface-variant line-clamp-3">
                  {article.excerpt}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <NewsPreviewModal article={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function formatPublishedAt(iso: string): string {
  try {
    const date = new Date(iso);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return iso;
  }
}
