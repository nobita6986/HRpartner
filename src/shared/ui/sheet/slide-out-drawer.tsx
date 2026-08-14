'use client';

/**
 * SlideOutDrawer — Right-side drawer for record detail view.
 *
 * Pattern học từ shadcn-admin (data-table-row-actions → opens dialog),
 * nhưng mở rộng thành full drawer cho các màn cần nhiều field (worker profile,
 * pay run detail, ticket history, statement lines).
 *
 * Features:
 *   - Width tùy chỉnh (md: 480, lg: 640, xl: 768)
 *   - Footer slot (vd action buttons: Duyệt, Hủy)
 *   - Close on ESC + backdrop click
 *   - Focus trap (basic)
 *   - Body scroll lock
 *
 * Khác với Dialog (modal center): Drawer chiếm 1 phía màn hình, cho phép
 * user vẫn thấy table bên trái.
 */

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/src/shared/utils/cn';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SlideOutDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** md: 480px, lg: 640px, xl: 768px, full: 90vw */
  width?: 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function SlideOutDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'lg',
  className,
}: SlideOutDrawerProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  // ESC to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Body scroll lock
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus first focusable on open
  React.useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    el?.focus();
  }, [open]);

  if (!open) return null;

  const widthClass = {
    md: 'sm:max-w-[480px]',
    lg: 'sm:max-w-[640px]',
    xl: 'sm:max-w-[768px]',
    full: 'sm:max-w-[90vw]',
  }[width];

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed inset-y-0 right-0 flex w-full flex-col bg-white shadow-xl',
          widthClass,
          'animate-slide-in-from-right',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-slate-700">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="�óng"
            className="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in-from-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-from-right {
          animation: slide-in-from-right 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
