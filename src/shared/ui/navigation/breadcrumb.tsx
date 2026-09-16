import React from 'react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb
 * Semantic navigation with stable URLs.
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 text-sm ${className ?? ''}`}
      style={{ color: 'var(--on-surface-variant)' }}
    >
      <ol className="flex items-center gap-2 m-0 p-0 list-none">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:underline"
                  style={{ color: 'inherit' }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'font-semibold' : ''}
                  style={isLast ? { color: 'var(--on-surface)' } : {}}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              
              {!isLast && (
                <span aria-hidden="true" style={{ opacity: 0.6 }}>
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
