'use client';

/**
 * use-table-url-state — Đồng bộ TanStack Table state với URL search params.
 *
 * Học từ shadcn-admin (satnaing/shadcn-admin) — pattern này cho phép:
 *   - Chia sẻ URL có filter/sort (deep link)
 *   - Back/forward navigation hoạt động đúng
 *   - Reload không mất filter
 *
 * Sử dụng kết hợp Next.js `useSearchParams` + `useRouter`.
 */

import * as React from 'react';
import {
  type ColumnFiltersState,
  type PaginationState,
  type OnChangeFn,
} from '@tanstack/react-table';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type NavigateFn = (opts: { search?: Record<string, string | null> }) => void;

export interface ColumnFilterConfig {
  columnId: string;
  searchKey: string;
  type: 'string' | 'array' | 'number';
}

export interface UseTableUrlStateOpts {
  search: Record<string, unknown>;
  navigate: NavigateFn;
  pagination?: { defaultPage: number; defaultPageSize: number };
  columnFilters?: ColumnFilterConfig[];
  globalFilter?: { enabled: boolean; searchKey?: string };
}

const ARRAY_DELIM = ',';

function parseArrayParam(v: string | null): string[] {
  if (!v) return [];
  return v.split(ARRAY_DELIM).filter(Boolean);
}

function parseNumberParam(v: string | null): number | undefined {
  if (v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseStringParam(v: string | null): string {
  return v ?? '';
}

/**
 * Hook trả về state + onChange handlers để bind vào TanStack Table.
 */
export function useTableUrlState({
  search,
  navigate,
  pagination,
  columnFilters = [],
  globalFilter = { enabled: false },
}: UseTableUrlStateOpts) {
  // Pagination state
  const page = parseNumberParam(parseStringParam(search[pagination?.defaultPage ? 'page' : '_p'] as string))
    ?? pagination?.defaultPage ?? 1;
  const pageSize =
    parseNumberParam(search.pageSize as string) ?? pagination?.defaultPageSize ?? 10;

  const paginationState: PaginationState = React.useMemo(
    () => ({ pageIndex: page - 1, pageSize }),
    [page, pageSize],
  );

  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === 'function' ? updater(paginationState) : updater;
    navigate({
      search: {
        page: next.pageIndex === 0 ? null : String(next.pageIndex + 1),
        pageSize: next.pageSize === (pagination?.defaultPageSize ?? 10) ? null : String(next.pageSize),
      },
    });
  };

  // Column filters
  const columnFiltersState: ColumnFiltersState = React.useMemo(() => {
    return columnFilters
      .map((cfg) => {
        const raw = search[cfg.searchKey] as string | undefined;
        if (cfg.type === 'array') {
          const arr = parseArrayParam(raw ?? null);
          return arr.length > 0 ? { id: cfg.columnId, value: arr } : null;
        }
        if (cfg.type === 'number') {
          const n = parseNumberParam(raw ?? null);
          return n !== undefined ? { id: cfg.columnId, value: n } : null;
        }
        const s = parseStringParam(raw ?? null);
        return s ? { id: cfg.columnId, value: s } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [columnFilters, search]);

  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updater) => {
    const next = typeof updater === 'function' ? updater(columnFiltersState) : updater;
    const patch: Record<string, string | null> = {};

    // Reset page về 1 khi filter đổi
    patch.page = null;

    columnFilters.forEach((cfg) => {
      const filter = next.find((f) => f.id === cfg.columnId);
      if (!filter || filter.value === undefined || filter.value === '') {
        patch[cfg.searchKey] = null;
        return;
      }
      if (cfg.type === 'array' && Array.isArray(filter.value)) {
        patch[cfg.searchKey] = filter.value.length > 0 ? filter.value.join(ARRAY_DELIM) : null;
      } else if (cfg.type === 'number') {
        patch[cfg.searchKey] = String(filter.value);
      } else {
        patch[cfg.searchKey] = String(filter.value);
      }
    });

    // Global filter (search box)
    if (globalFilter.enabled && globalFilter.searchKey) {
      patch[globalFilter.searchKey] = null;  // tách riêng, không auto-clear
    }

    navigate({ search: patch });
  };

  // Đảm bảo page nằm trong range khi totalRows đổi
  const ensurePageInRange = React.useCallback(
    (pageCount: number) => {
      if (pageCount === 0) return;
      if (paginationState.pageIndex >= pageCount) {
        navigate({ search: { page: null } });
      }
    },
    [paginationState.pageIndex, navigate],
  );

  return {
    columnFilters: columnFiltersState,
    onColumnFiltersChange,
    pagination: paginationState,
    onPaginationChange,
    ensurePageInRange,
  };
}

/**
 * Hook wrapper cho Next.js: tự động lấy searchParams + router.
 */
export function useNextTableUrlState(opts: Omit<UseTableUrlStateOpts, 'search' | 'navigate'>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search: Record<string, unknown> = React.useMemo(() => {
    const obj: Record<string, unknown> = {};
    searchParams.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }, [searchParams]);

  const navigate: NavigateFn = React.useCallback(
    ({ search: patch } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch ?? {}).forEach(([k, v]) => {
        if (v === null || v === '') params.delete(k);
        else params.set(k, v);
      });
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return useTableUrlState({ ...opts, search, navigate });
}
