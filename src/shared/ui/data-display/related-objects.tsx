import React from 'react';
import Link from 'next/link';

export interface RelatedObjectItem {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  statusLabel?: string;
  statusColor?: { bg: string; fg: string };
  href?: string;
}

export interface RelatedObjectsProps {
  title: string;
  items: RelatedObjectItem[];
  emptyState?: React.ReactNode;
  className?: string;
}

/**
 * RelatedObjects
 * Displays related children/objects with text-based statuses and optional deep links.
 */
export function RelatedObjects({ title, items, emptyState, className }: RelatedObjectsProps) {
  return (
    <section 
      className={`rounded-lg border p-4 ${className ?? ''}`}
      style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--color-surface)' }}
      aria-labelledby={`related-objects-title-${title}`}
    >
      <h2 
        id={`related-objects-title-${title}`}
        className="mb-3 text-sm font-semibold" 
        style={{ color: 'var(--on-surface)' }}
      >
        {title}
      </h2>
      
      {items.length === 0 ? (
        <div className="text-sm italic" style={{ color: 'var(--on-surface-variant)' }}>
          {emptyState ?? 'Chưa có dữ liệu liên kết.'}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const content = (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 w-full rounded border"
                   style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-balance" style={{ color: 'var(--on-surface)' }}>
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                      {item.subtitle}
                    </div>
                  )}
                </div>
                {item.statusLabel && (
                  <span
                    className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={
                      item.statusColor 
                        ? { backgroundColor: item.statusColor.bg, color: item.statusColor.fg }
                        : { backgroundColor: 'var(--color-surface-container-high)', color: 'var(--on-surface-variant)' }
                    }
                  >
                    {item.statusLabel}
                  </span>
                )}
              </div>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="block transition-opacity hover:opacity-80 focus-visible:ring-2 outline-none rounded">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
