'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ArticleCardExtended, ArticleStructuredBlock } from '../../public-types';

interface NewsPreviewModalProps {
  article: ArticleCardExtended | null;
  onClose: () => void;
}

/**
 * NewsPreviewModal — client component.
 *
 * Render `title + excerpt + body` từ structured content array:
 * - `paragraph` → `<p>`
 * - `heading` → `<h3>`
 * - `list` → `<ul><li>...</li></ul>`
 *
 * KHÔNG HTML string, KHÔNG raw HTML render, KHÔNG tự viết sanitizer.
 *
 * Đóng khi: click overlay, click nút X, bấm Esc.
 */
export function NewsPreviewModal({ article, onClose }: NewsPreviewModalProps) {
  /* Esc key handler */
  useEffect(() => {
    if (!article) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [article, onClose]);

  if (!article) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      data-testid="news-preview-modal"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="hrp-focus absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-on-surface shadow-sm hover:bg-white"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="relative h-48 w-full shrink-0 overflow-hidden sm:h-56">
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end gap-2">
            <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 font-label text-label-sm font-bold text-primary-dark">
              {article.category}
            </span>
            <span className="font-body text-label-sm text-white/90">
              {formatPublishedAt(article.publishedAt)}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h2
            id="news-preview-modal-title"
            className="font-head text-headline-md font-bold text-on-surface"
          >
            {article.title}
          </h2>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">
            {article.excerpt}
          </p>
          <div className="mt-4 flex flex-col gap-3 font-body text-body-md text-on-surface">
            {article.body.map((block, idx) => renderBlock(block, idx))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Render một structured content block thành React element. */
function renderBlock(block: ArticleStructuredBlock, key: number) {
  switch (block.type) {
    case 'paragraph':
      return <p key={key}>{block.content}</p>;
    case 'heading':
      return (
        <h3 key={key} className="font-head text-headline-md font-bold text-on-surface mt-2">
          {block.content}
        </h3>
      );
    case 'list':
      return (
        <ul key={key} className="flex list-disc flex-col gap-1 pl-5">
          {block.content.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    default:
      /* Exhaustiveness guard */
      return null;
  }
}

/** Format ISO date sang dd/mm/yyyy. */
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
