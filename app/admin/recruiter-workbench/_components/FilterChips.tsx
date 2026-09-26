'use client';

/**
 * FilterChips — URL-state filter chips via `<Link>`.
 *
 * Frozen contract (TASK.md AC-03, RQ-03):
 *   - Each chip is a `<Link>` that swaps the corresponding URL param.
 *   - `view` is restricted by role × view matrix at the E0 service; chips
 *     render `view=ALL` only for ADMIN/HR_MANAGER (page passes the allowlist).
 *   - `caseStatus` is multi-select (comma-separated in URL).
 *   - `overdue` is a toggle (omitted = no filter, `overdue=true` or
 *     `overdue=false`).
 *   - `search` is an input — submitting it preserves other params and resets
 *     `page` to 1.
 *
 * No hidden/internal fields are sent; everything on screen maps to URL params.
 */

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import {
  CASE_STATUS_VALUES,
  RECRUITER_WORKBENCH_VIEW_VALUES,
  type RecruiterWorkbenchCaseStatus,
} from '@/src/domains/talent/recruiter-workbench.types';

type View = (typeof RECRUITER_WORKBENCH_VIEW_VALUES)[number];

const ALL_VIEW_VALUES: View[] = [...RECRUITER_WORKBENCH_VIEW_VALUES];
const ALL_CASE_STATUS_VALUES: RecruiterWorkbenchCaseStatus[] = [...CASE_STATUS_VALUES];

const CASE_STATUS_LABELS: Record<RecruiterWorkbenchCaseStatus, string> = {
  OPEN: 'Đang mở',
  IN_PROGRESS: 'Đang xử lý',
  READY_TO_PLACE: 'Sẵn sàng bố trí',
  CLOSED: 'Đã đóng',
};

const VIEW_LABELS: Record<View, string> = {
  ALL: 'Tất cả',
  MINE: 'Của tôi',
  UNASSIGNED: 'Chưa phân công',
};

function buildHref(
  pathname: string,
  currentParams: URLSearchParams,
  patch: Record<string, string | null>,
): string {
  const next = new URLSearchParams(currentParams.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  const qs = next.toString();
  return qs.length > 0 ? `${pathname}?${qs}` : pathname;
}

function toggleArrayValue(current: string | null, value: string): string | null {
  if (current === null || current.length === 0) return value;
  const parts = current.split(',').filter(Boolean);
  const idx = parts.indexOf(value);
  if (idx === -1) {
    parts.push(value);
  } else {
    parts.splice(idx, 1);
  }
  return parts.length === 0 ? null : parts.join(',');
}

function useCurrentParams(): URLSearchParams {
  const raw = useSearchParams();
  return React.useMemo(() => {
    const out = new URLSearchParams();
    if (!raw) return out;
    // `useSearchParams` returns a URLSearchParams-like object; iterate via
    // its `entries()` iterator (URLSearchParams has no enumerable own props,
    // so `Object.entries(raw)` would skip every key — see Node/URL).
    for (const [k, v] of raw.entries()) {
      if (typeof v === 'string') out.set(k, v);
    }
    return out;
  }, [raw]);
}

export interface FilterChipsProps {
  /** Currently-applied caseStatus (comma-separated string from URL or null). */
  activeCaseStatuses: ReadonlyArray<RecruiterWorkbenchCaseStatus>;
  /** Currently-applied view (string or null). */
  activeView: View | null;
  /** Currently-applied overdue flag (true | false | null). */
  activeOverdue: boolean | null;
  /** Current search string (or null when omitted). */
  activeSearch: string | null;
  /** Views allowed for the current role. `view=ALL` chip is hidden if `MINE` only. */
  allowedViews: ReadonlyArray<View>;
}

export function FilterChips({
  activeCaseStatuses,
  activeView,
  activeOverdue,
  activeSearch,
  allowedViews,
}: FilterChipsProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const currentParams = useCurrentParams();

  const allowedSet = new Set<View>(allowedViews);
  const viewValues = ALL_VIEW_VALUES.filter((v) => allowedSet.has(v));

  const caseStatusSet = new Set<RecruiterWorkbenchCaseStatus>(activeCaseStatuses);
  const overdueOn = activeOverdue === true;
  const overdueOff = activeOverdue === false;

  const [searchInput, setSearchInput] = React.useState(activeSearch ?? '');
  React.useEffect(() => {
    setSearchInput(activeSearch ?? '');
  }, [activeSearch]);

  const submitSearch = () => {
    const trimmed = searchInput.trim();
    const href = buildHref(pathname, currentParams, {
      search: trimmed.length > 0 ? trimmed : null,
      page: null,
    });
    router.push(href);
  };

  return (
    <div className="flex flex-col gap-3" data-testid="filter-chips">
      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Bộ lọc view">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mr-1">
          View
        </span>
        {viewValues.map((v) => {
          const active = activeView === v;
          const href = buildHref(pathname, currentParams, { view: v, page: null });
          return (
            <Link
              key={v}
              href={href}
              aria-pressed={active}
              data-testid={`view-chip-${v}`}
              data-active={active ? 'true' : 'false'}
              className={
                'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ' +
                (active
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100')
              }
            >
              {VIEW_LABELS[v]}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Bộ lọc trạng thái case">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mr-1">
          Trạng thái
        </span>
        {ALL_CASE_STATUS_VALUES.map((s) => {
          const active = caseStatusSet.has(s);
          const currentRaw =
            activeCaseStatuses.length > 0 ? activeCaseStatuses.join(',') : null;
          const next = toggleArrayValue(currentRaw, s);
          const href = buildHref(pathname, currentParams, {
            caseStatus: next,
            page: null,
          });
          return (
            <Link
              key={s}
              href={href}
              aria-pressed={active}
              data-testid={`status-chip-${s}`}
              data-active={active ? 'true' : 'false'}
              className={
                'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ' +
                (active
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100')
              }
            >
              {CASE_STATUS_LABELS[s]}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Bộ lọc quá hạn">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mr-1">
          Quá hạn
        </span>
        <Link
          href={buildHref(pathname, currentParams, {
            overdue: overdueOn ? null : 'true',
            page: null,
          })}
          aria-pressed={overdueOn}
          data-testid="overdue-chip-true"
          data-active={overdueOn ? 'true' : 'false'}
          className={
            'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-300 ' +
            (overdueOn
              ? 'bg-red-600 text-white'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100')
          }
        >
          Quá hạn
        </Link>
        <Link
          href={buildHref(pathname, currentParams, {
            overdue: overdueOff ? null : 'false',
            page: null,
          })}
          aria-pressed={overdueOff}
          data-testid="overdue-chip-false"
          data-active={overdueOff ? 'true' : 'false'}
          className={
            'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-300 ' +
            (overdueOff
              ? 'bg-green-600 text-white'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100')
          }
        >
          Không quá hạn
        </Link>
      </div>

      <form
        role="search"
        aria-label="Tìm kiếm ứng viên theo họ tên"
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch();
        }}
      >
        <label htmlFor="recruiter-workbench-search" className="sr-only">
          Tìm ứng viên
        </label>
        <div className="relative">
          <Search
            className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="recruiter-workbench-search"
            type="search"
            placeholder="Tìm theo họ tên"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            data-testid="search-input"
            className="pl-8 pr-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <button
          type="submit"
          data-testid="search-submit"
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Tìm
        </button>
        {activeSearch !== null && activeSearch.length > 0 ? (
          <Link
            href={buildHref(pathname, currentParams, { search: null, page: null })}
            data-testid="search-clear"
            className="text-xs text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Xóa
          </Link>
        ) : null}
      </form>
    </div>
  );
}
