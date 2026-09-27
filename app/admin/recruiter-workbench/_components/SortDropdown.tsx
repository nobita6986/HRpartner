'use client';

/**
 * SortDropdown — URL-state sort selector.
 *
 * Frozen contract (TASK.md AC-04, RQ-04):
 *   - Exactly 4 sort values from E0:
 *     `ageDesc | ageAsc | openedDesc | openedAsc`.
 *   - Default: `ageDesc`.
 *   - Selecting a sort value navigates the user; the page preserves other
 *     params and resets `page` to 1.
 *   - No mutation API is called; navigation only.
 */

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  RECRUITER_WORKBENCH_SORT_VALUES,
} from '@/src/domains/talent/recruiter-workbench.types';

type Sort = (typeof RECRUITER_WORKBENCH_SORT_VALUES)[number];

const SORT_LABELS: Record<Sort, string> = {
  ageDesc: 'Mở lâu nhất',
  ageAsc: 'Mở gần đây nhất',
  openedDesc: 'Mở sau cùng',
  openedAsc: 'Mở đầu tiên',
};

const DEFAULT_SORT: Sort = 'ageDesc';

export interface SortDropdownProps {
  activeSort: Sort;
}

export function SortDropdown({ activeSort }: SortDropdownProps): React.ReactElement {
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

  return (
    <nav
      role="navigation"
      aria-label="Sắp xếp"
      className="inline-flex items-center gap-2"
      data-testid="sort-dropdown"
      data-active-sort={activeSort}
    >
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        Sắp xếp
      </span>
      {RECRUITER_WORKBENCH_SORT_VALUES.map((value) => {
        const active = activeSort === value;
        const next = new URLSearchParams(currentParams.toString());
        if (value === DEFAULT_SORT) {
          next.delete('sort');
        } else {
          next.set('sort', value);
        }
        next.delete('page');
        const qs = next.toString();
        const href = qs.length > 0 ? `${pathname}?${qs}` : pathname;
        return (
          <Link
            key={value}
            href={href}
            aria-pressed={active}
            data-testid={`sort-link-${value}`}
            data-active={active ? 'true' : 'false'}
            className={
              'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ' +
              (active
                ? 'bg-blue-600 text-white'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100')
            }
          >
            {SORT_LABELS[value]}
          </Link>
        );
      })}
    </nav>
  );
}
