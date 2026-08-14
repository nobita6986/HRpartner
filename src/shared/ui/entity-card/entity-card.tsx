'use client';

/**
 * EntityCard — Reusable card component cho directory-style list.
 *
 * Dùng cho: Talent Pool, Vendors, Clients, Projects, CTVs, Tickets (overview).
 * KHÔNG dùng cho: payroll reconciliation, statement lines, audit log
 *   (những cái đó dùng DataTable).
 *
 * Props:
 *   - id / href: nhấn card để navigate (vd /admin/workers/[id])
 *   - title / subtitle: heading + sub-heading
 *   - avatar / icon: leading visual
 *   - badges: array để render badge pills (status, type)
 *   - meta: thông tin phụ hiển thị grid 2 cột
 *   - actions: footer buttons (vd "Duyệt", "Hủy")
 *   - selection: bulk selection mode (checkbox)
 *   - selected: controlled
 *   - onSelectChange: callback
 *
 * WCAG: title dùng text-neutral-900 (16:1), subtitle text-neutral-700 (10:1).
 * Badge text đã có bg/text được check contrast.
 */

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/src/shared/utils/cn';
import { Check } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface EntityCardBadge {
  label: string;
  variant?: 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  icon?: React.ReactNode;
}

export interface EntityCardMetaItem {
  label: string;
  value: React.ReactNode;
  /** Hiển thị value trước label (cho phone/email ngắn) */
  inline?: boolean;
}

export interface EntityCardProps {
  id: string;
  href?: string;
  title: string;
  subtitle?: string;
  avatar?: React.ReactNode;
  icon?: React.ReactNode;
  badges?: EntityCardBadge[];
  meta?: EntityCardMetaItem[];
  actions?: React.ReactNode;
  selection?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  className?: string;
  /** Footer phụ (vd timestamp, version) */
  footer?: React.ReactNode;
  /** Click handler (khi không dùng href) */
  onClick?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const badgeClasses: Record<NonNullable<EntityCardBadge['variant']>, string> = {
  brand: 'bg-orange-50 text-orange-800 border-orange-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function EntityCard({
  id,
  href,
  title,
  subtitle,
  avatar,
  icon,
  badges,
  meta,
  actions,
  selection,
  selected,
  onSelectChange,
  className,
  footer,
  onClick,
}: EntityCardProps) {
  const isInteractive = !!(href || onClick);

  const content = (
    <article
      data-entity-id={id}
      className={cn(
        // Base
        'group relative flex flex-col gap-3 rounded-xl border bg-white p-4',
        'border-slate-200 shadow-sm transition-all',
        // Hover (chỉ khi interactive)
        isInteractive && [
          'hover:border-orange-300 hover:shadow-md',
          'focus-within:ring-2 focus-within:ring-orange-300 focus-within:ring-offset-2',
        ],
        // Selected state
        selected && 'border-orange-500 ring-2 ring-orange-200 bg-orange-50/30',
        className,
      )}
    >
      {/* Selection checkbox (top-left) */}
      {selection && (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${title}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelectChange?.(!selected);
          }}
          className={cn(
            'absolute left-3 top-3 z-10',
            'flex h-5 w-5 items-center justify-center rounded border-2',
            'transition-colors',
            selected
              ? 'border-orange-600 bg-orange-600 text-white'
              : 'border-slate-300 bg-white hover:border-orange-400',
          )}
        >
          {selected && <Check className="h-3 w-3" />}
        </button>
      )}

      {/* Header: avatar/icon + title + subtitle */}
      <div className={cn('flex items-start gap-3', selection && 'pl-7')}>
        {(avatar || icon) && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              avatar ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600',
            )}
          >
            {avatar ?? icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="truncate text-sm text-slate-700">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge, i) => (
            <span
              key={i}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                badgeClasses[badge.variant ?? 'neutral'],
              )}
            >
              {badge.icon}
              {badge.label}
            </span>
          ))}
        </div>
      )}

      {/* Meta grid */}
      {meta && meta.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {meta.map((item, i) => (
            <div key={i} className={cn('flex flex-col', item.inline && 'col-span-2')}>
              <dt className="text-slate-500">{item.label}</dt>
              <dd className="font-medium text-slate-900 truncate">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Footer (optional) */}
      {footer && (
        <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">{footer}</div>
      )}

      {/* Actions */}
      {actions && (
        <div className="flex gap-2 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </article>
  );

  // Wrap với Link hoặc button nếu interactive
  if (href) {
    return (
      <Link href={href} className="block focus:outline-none" tabIndex={-1}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left focus:outline-none"
      >
        {content}
      </button>
    );
  }

  return content;
}

// ═══════════════════════════════════════════════════════════════════════════
// GRID WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

export interface EntityCardGridProps {
  children: React.ReactNode;
  className?: string;
  /** Số cột: 1 (mobile), 2 (md), 3 (lg), 4 (xl) */
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function EntityCardGrid({ children, className, cols }: EntityCardGridProps) {
  const c = cols ?? { default: 1, sm: 2, lg: 3 };
  return (
    <div
      className={cn(
        'grid gap-3',
        c.default === 1 && 'grid-cols-1',
        c.default === 2 && 'grid-cols-2',
        c.default === 3 && 'grid-cols-3',
        c.default === 4 && 'grid-cols-4',
        c.sm === 2 && 'sm:grid-cols-2',
        c.sm === 3 && 'sm:grid-cols-3',
        c.md === 2 && 'md:grid-cols-2',
        c.md === 3 && 'md:grid-cols-3',
        c.md === 4 && 'md:grid-cols-4',
        c.lg === 3 && 'lg:grid-cols-3',
        c.lg === 4 && 'lg:grid-cols-4',
        c.xl === 4 && 'xl:grid-cols-4',
        c.xl === 5 && 'xl:grid-cols-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
