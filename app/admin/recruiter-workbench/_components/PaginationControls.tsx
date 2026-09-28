'use client';

/**
 * PaginationControls — URL-state pagination.
 *
 * Frozen contract (TASK.md AC-05, RQ-05):
 *   - `pageSize` ∈ {20, 50, 100}. Default: 20 (omitted from URL).
 *   - `page` ≥ 1. Page 1 omits the `page` param entirely.
 *   - Page nav preserves other params; toggling `pageSize` resets `page`.
 *   - No mutation; only navigation.
 */

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { RECRUITER_WORKBENCH_PAGE_SIZES } from '@/src/domains/talent/recruiter-workbench.types';

const PAGE_SIZES: number[] = RECRUITER_WORKBENCH_PAGE_SIZES.map((s) => Number(s));
const DEFAULT_PAGE_SIZE = 20;

export interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
}

function buildHref(
  pathname: string,
  currentParams: URLSearchParams,
  patch: Record<string, string | null>,
): string {
  const next = new URLSearchParams(currentParams.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) {
      next.delete(k);
    } else {
      next.set(k, v);
    }
  }
  const qs = next.toString();
  return qs.length > 0 ? `${pathname}?${qs}` : pathname;
}

export function PaginationControls({
  page,
  pageSize,
  total,
}: PaginationControlsProps): React.ReactElement {
  const pathname = usePathname();
  const raw = useSearchParams();

  const currentParams = React.useMemo(() => {
    const out = new URLSearchParams();
    if (!raw) return out;
    // `useSearchParams` returns a URLSearchParams-like object; iterate via
    // `entries()` (URLSearchParams has no enumerable own props).
    for (const [k, v] of raw.entries()) {
      if (typeof v === 'string') out.set(k, v);
    }
    return out;
  }, [raw]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const canPrev = safePage > 1;
  const canNext = safePage < pageCount;

  return (
    <nav
      role="navigation"
      aria-label="Phân trang"
      data-testid="pagination-controls"
      data-page={safePage}
      data-page-size={pageSize}
      data-total={total}
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"
    >
      <div className="flex items-center gap-2" role="group" aria-label="Kích thước trang">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Số dòng/trang
        </span>
        {PAGE_SIZES.map((size) => {
          const active = pageSize === size;
          const href = buildHref(pathname, currentParams, {
            pageSize: size === DEFAULT_PAGE_SIZE ? null : String(size),
            page: null,
          });
          return (
            <Link
              key={size}
              href={href}
              aria-pressed={active}
              data-testid={`page-size-${size}`}
              data-active={active ? 'true' : 'false'}
              className={
                'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 ' +
                (active
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100')
              }
            >
              {size}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={buildHref(pathname, currentParams, {
            page: canPrev ? String(safePage - 1) : null,
          })}
          aria-disabled={!canPrev}
          tabIndex={canPrev ? 0 : -1}
          data-testid="page-prev"
          className={
            'inline-flex items-center px-3 py-1 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 ' +
            (canPrev
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-slate-50 text-slate-300 pointer-events-none')
          }
        >
          Trước
        </Link>
        <span className="text-xs" data-testid="page-indicator">
          Trang {safePage} / {pageCount} ({total} kết quả)
        </span>
        <Link
          href={buildHref(pathname, currentParams, {
            page: canNext ? String(safePage + 1) : null,
          })}
          aria-disabled={!canNext}
          tabIndex={canNext ? 0 : -1}
          data-testid="page-next"
          className={
            'inline-flex items-center px-3 py-1 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 ' +
            (canNext
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-slate-50 text-slate-300 pointer-events-none')
          }
        >
          Sau
        </Link>
      </div>
    </nav>
  );
}
