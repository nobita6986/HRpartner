import React from 'react';
import Link from 'next/link';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

/**
 * EmptyState
 * Chuẩn hóa giao diện khi không có dữ liệu.
 */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div 
      className={`flex flex-col items-center justify-center p-8 text-center rounded-lg border ${className ?? ''}`}
      style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
    >
      {icon && (
        <div className="mb-4 text-4xl" style={{ color: 'var(--on-surface-variant)' }}>
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>
        {title}
      </h3>
      <p className="max-w-md text-sm mb-6" style={{ color: 'var(--on-surface-variant)' }}>
        {description}
      </p>
      
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="rounded px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 focus-visible:ring-2 outline-none"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}
          >
            {action.label}
          </Link>
        ) : action.onClick ? (
          <button
            onClick={action.onClick}
            type="button"
            className="rounded px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 focus-visible:ring-2 outline-none"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}
          >
            {action.label}
          </button>
        ) : null
      )}
    </div>
  );
}
