'use client';

/**
 * ViewToggle — Switch giữa Card view và Table view.
 *
 * Card view: cho directory/scan (Talent Pool, Vendors, Clients, Projects, CTVs, Tickets overview)
 * Table view: cho financial/reconciliation (Payroll, Statements, Audit log, Bulk operations)
 *
 * Pattern:
 *   - Lưu lựa chọn vào localStorage (key: 'hrp:view:<entity>')
 *   - Đồng bộ qua URL search param '?view=card' (ưu tiên URL > localStorage)
 *   - SSR-safe: default 'card' cho directory pages, 'table' cho financial pages
 *   - Keyboard accessible: role="tablist" + arrow keys
 */

import * as React from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import { cn } from '@/src/shared/utils/cn';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ViewMode = 'card' | 'table';

export interface ViewToggleProps {
  value?: ViewMode;
  onChange?: (mode: ViewMode) => void;
  /** LocalStorage key (vd 'hrp:view:tickets'). Bỏ qua nếu dùng URL sync. */
  storageKey?: string;
  /** Default khi không có localStorage/URL */
  defaultMode?: ViewMode;
  className?: string;
  /** Nếu true, đồng bộ qua URL '?view=' */
  syncUrl?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ViewToggle({
  value,
  onChange,
  storageKey,
  defaultMode = 'card',
  className,
  syncUrl = true,
}: ViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Resolve current mode: prop > URL > localStorage > default
  const resolved = React.useMemo<ViewMode>(() => {
    if (value) return value;
    if (syncUrl) {
      const fromUrl = searchParams.get('view');
      if (fromUrl === 'card' || fromUrl === 'table') return fromUrl;
    }
    if (storageKey && typeof window !== 'undefined') {
      const fromLs = window.localStorage.getItem(storageKey);
      if (fromLs === 'card' || fromLs === 'table') return fromLs;
    }
    return defaultMode;
  }, [value, syncUrl, searchParams, storageKey, defaultMode]);

  const updateMode = (mode: ViewMode) => {
    onChange?.(mode);
    if (storageKey && typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, mode);
    }
    if (syncUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', mode);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Chế độ hiển thị"
      className={cn(
        'inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5',
        className,
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={resolved === 'card'}
        aria-label="Xem dạng thẻ"
        title="Xem dạng thẻ (dành cho quét nhanh)"
        onClick={() => updateMode('card')}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
          resolved === 'card'
            ? 'bg-orange-100 text-orange-900'
            : 'text-slate-600 hover:text-slate-900',
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Thẻ
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={resolved === 'table'}
        aria-label="Xem dạng bảng"
        title="Xem dạng bảng (dành cho đối soát)"
        onClick={() => updateMode('table')}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
          resolved === 'table'
            ? 'bg-orange-100 text-orange-900'
            : 'text-slate-600 hover:text-slate-900',
        )}
      >
        <Table2 className="h-3.5 w-3.5" />
        Bảng
      </button>
    </div>
  );
}

/**
 * Hook helper: đọc view mode hiện tại từ URL.
 */
export function useViewModeFromUrl(defaultMode: ViewMode = 'card'): ViewMode {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get('view');
  if (fromUrl === 'card' || fromUrl === 'table') return fromUrl;
  return defaultMode;
}
