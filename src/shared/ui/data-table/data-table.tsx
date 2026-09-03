'use client';

/**
 * DataTable — Reusable TanStack Table wrapper cho HRP.
 *
 * Pattern học từ satnaing/shadcn-admin:
 *   - URL-synced state (pagination, filters)
 *   - Toolbar với search + column faceted filters
 *   - Bulk actions (row selection)
 *   - Row actions menu
 *   - Empty state
 *
 * HRP-specific:
 *   - Brand primary color (orange) cho header/sort
 *   - WCAG-safe text colors (slate-700 cho secondary, slate-900 cho primary)
 *   - Bulk selection tích hợp `EntityCard` selection state (cho ViewToggle)
 *   - Tương thích server components (data là RSC-fetched, table là client)
 *
 * Props:
 *   - data: array đã fetch sẵn (server-side pagination sẽ handle total)
 *   - columns: TanStack ColumnDef[]
 *   - searchPlaceholder: text cho global search input
 *   - filters: faceted filter definitions
 *   - bulkActions: action bar khi có row selected
 *   - toolbar: custom toolbar slot (extra buttons)
 *   - emptyState: hiển thị khi data.length === 0
 *   - onRowClick: callback khi click row (vd mở drawer)
 */

import * as React from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, Search, Settings2, X } from 'lucide-react';
import { cn } from '@/src/shared/utils/cn';
import { useNextTableUrlState, type ColumnFilterConfig, type NavigateFn } from './use-table-url-state';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DataTableFilterOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

export interface DataTableFilterDef {
  columnId: string;
  title: string;
  options: DataTableFilterOption[];
}

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  searchPlaceholder?: string;
  searchKey?: string;
  filters?: DataTableFilterDef[];
  columnFilters?: ColumnFilterConfig[];
  defaultPageSize?: number;
  bulkActions?: (selectedRows: TData[]) => React.ReactNode;
  toolbar?: React.ReactNode;
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  /** Ẩn column toggle dropdown */
  hideColumnToggle?: boolean;
  className?: string;
  /** Server-side pagination flag (nếu true, page count là server-provided) */
  manualPagination?: boolean;
  pageCount?: number;
  /** Loading state */
  isLoading?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENT: Toolbar
// ═══════════════════════════════════════════════════════════════════════════

interface DataTableToolbarProps<TData> {
  table: ReturnType<typeof useReactTable<TData>>;
  searchPlaceholder?: string;
  searchKey?: string;
  filters?: DataTableFilterDef[];
  extra?: React.ReactNode;
}

function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Tìm kiếm...',
  searchKey,
  filters = [],
  extra,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div role="toolbar" className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Search input */}
        {searchKey && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
              className={cn(
                'h-9 w-[200px] rounded-md border border-slate-200 bg-white pl-8 pr-3 text-sm',
                'placeholder:text-slate-400',
                'focus-visible:border-[var(--color-focus-ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
              )}
            />
          </div>
        )}

        {/* Faceted filters */}
        {filters.map((filter) => (
          <FacetedFilter key={filter.columnId} table={table} filter={filter} />
        ))}

        {/* Reset button */}
        {isFiltered && (
          <button
            type="button"
            onClick={() => table.resetColumnFilters()}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Xóa lọc
            <X className="ml-1 inline-block h-3.5 w-3.5" />
          </button>
        )}

        {extra}
      </div>

      {/* Column visibility toggle */}
      <div className="flex items-center gap-2">
        <ColumnToggle table={table} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENT: FacetedFilter (multi-select dropdown)
// ═══════════════════════════════════════════════════════════════════════════

interface FacetedFilterProps<TData> {
  table: ReturnType<typeof useReactTable<TData>>;
  filter: DataTableFilterDef;
}

function FacetedFilter<TData>({ table, filter }: FacetedFilterProps<TData>) {
  const column = table.getColumn(filter.columnId);
  const value = (column?.getFilterValue() as string[] | undefined) ?? [];
  const [open, setOpen] = React.useState(false);

  const toggle = (v: string) => {
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    column?.setFilterValue(next);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-md border bg-white px-3 text-sm',
          value.length > 0
            ? 'border-orange-300 text-orange-800'
            : 'border-slate-200 text-slate-700',
          'hover:bg-slate-50',
        )}
      >
        {filter.title}
        {value.length > 0 && (
          <span className="ml-1 rounded-full bg-orange-100 px-1.5 text-xs font-medium text-orange-700">
            {value.length}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-10 z-40 min-w-[180px] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
            {filter.options.map((opt) => {
              const isSelected = value.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm',
                    isSelected ? 'bg-orange-50 text-orange-900' : 'hover:bg-slate-50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(opt.value)}
                    className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  {opt.icon}
                  <span className="text-slate-700">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENT: Column visibility toggle
// ═══════════════════════════════════════════════════════════════════════════

function ColumnToggle<TData>({ table }: { table: ReturnType<typeof useReactTable<TData>> }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 w-9 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        aria-label="Tùy chỉnh cột"
      >
        <Settings2 className="mx-auto h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-10 z-40 min-w-[180px] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
            {table
              .getAllColumns()
              .filter((c) => c.getCanHide())
              .map((column) => (
                <label
                  key={column.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={(e) => column.toggleVisibility(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="capitalize text-slate-700">{column.id}</span>
                </label>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENT: Pagination
// ═══════════════════════════════════════════════════════════════════════════

interface PaginationProps<TData> {
  table: ReturnType<typeof useReactTable<TData>>;
  totalRows?: number;
}

function DataTablePagination<TData>({ table, totalRows }: PaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = totalRows ?? table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const start = pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2 text-sm text-slate-700">
      <div>
        {total === 0 ? (
          '0 kết quả'
        ) : (
          <>
            <span className="font-medium text-slate-900">{start}–{end}</span> trong{' '}
            <span className="font-medium text-slate-900">{total}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="h-8 rounded-md border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Trước
        </button>
        <span className="px-2 text-slate-700">
          Trang <span className="font-medium">{pageIndex + 1}</span> / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="h-8 rounded-md border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Sau
        </button>

        <select
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="ml-2 h-8 rounded-md border border-slate-200 bg-white px-2 text-sm focus-visible:border-[var(--color-focus-ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        >
          {[10, 20, 50, 100].map((s) => (
            <option key={s} value={s}>
              {s}/trang
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function DataTable<TData>({
  data,
  columns,
  searchPlaceholder,
  searchKey,
  filters,
  columnFilters,
  defaultPageSize = 10,
  bulkActions,
  toolbar,
  emptyState,
  onRowClick,
  hideColumnToggle,
  className,
  manualPagination,
  pageCount,
  isLoading,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const {
    columnFilters: columnFiltersState,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useNextTableUrlState({
    pagination: { defaultPage: 1, defaultPageSize },
    columnFilters: columnFilters ?? [],
    globalFilter: { enabled: !!searchKey, searchKey },
  });

  const table = useReactTable<TData>({
    data,
    columns,
    state: { sorting, pagination, rowSelection, columnFilters: columnFiltersState, columnVisibility },
    enableRowSelection: true,
    onPaginationChange,
    onColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination,
    pageCount: pageCount ?? -1,
  });

  React.useEffect(() => {
    ensurePageInRange(table.getPageCount());
  }, [table, ensurePageInRange]);

  const selectedRows = React.useMemo(
    () => table.getFilteredSelectedRowModel().rows.map((r) => r.original),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, rowSelection],
  );

  const hasSelection = Object.keys(rowSelection).length > 0;

  return (
    <div className={cn('flex flex-1 flex-col gap-3', className)}>
      {/* Toolbar */}
      {!hideColumnToggle && (
        <DataTableToolbar
          table={table}
          searchPlaceholder={searchPlaceholder}
          searchKey={searchKey}
          filters={filters}
          extra={toolbar}
        />
      )}

      {/* Bulk action bar (khi có selection) */}
      {hasSelection && bulkActions && (
        <div className="flex items-center justify-between rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm">
          <span className="text-orange-900">
            <strong>{selectedRows.length}</strong> mục đã chọn
          </span>
          <div className="flex gap-2">{bulkActions(selectedRows)}</div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="px-3 py-2 font-medium"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-12 text-center text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-12 text-center">
                    {emptyState ?? (
                      <span className="text-slate-500">Không có dữ liệu</span>
                    )}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      'text-slate-900 transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-orange-50/40',
                      row.getIsSelected() && 'bg-orange-50/60',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 bg-slate-50">
          <DataTablePagination table={table} />
        </div>
      </div>
    </div>
  );
}
