'use client';

/**
 * AgeCell — Format `ageHours` and surface the server-provided `isOverdue`.
 *
 * Frozen contract (TASK.md AC-11, RQ-11):
 *   - `ageHours` is server-derived (E0 `computeAge` helper). The cell MUST
 *     NOT recompute age; it only formats the server value.
 *   - `isOverdue` is server-derived (E0 rule: `ageHours >= 72` OR
 *     `handler.expiresAt < now`). The cell MUST NOT recompute overdue state.
 *
 * Display format:
 *   - < 1h   → "<1h"
 *   - < 24h  → "Xh" (rounded to 1 decimal place when fractional)
 *   - >= 24h → "Xd Yh" (days + remaining hours)
 *
 * The `data-is-overdue` attribute is exposed for tests and CSS hooks.
 */

import * as React from 'react';

function formatAgeHours(ageHours: number): string {
  if (!Number.isFinite(ageHours) || ageHours < 0) return '—';
  if (ageHours < 1) return '<1h';
  if (ageHours < 24) {
    const rounded = Math.round(ageHours * 10) / 10;
    return `${rounded}h`;
  }
  const days = Math.floor(ageHours / 24);
  const remainder = Math.round(ageHours - days * 24);
  return remainder === 0 ? `${days}d` : `${days}d ${remainder}h`;
}

export interface AgeCellProps {
  ageHours: number;
  isOverdue: boolean;
  /** Optional className override for the wrapping span. */
  className?: string;
}

/**
 * AgeCell — Render the server-provided `ageHours` and `isOverdue` flag.
 * Client component (pure render).
 */
export function AgeCell({ ageHours, isOverdue, className }: AgeCellProps): React.ReactElement {
  const label = formatAgeHours(ageHours);
  const overdueTone = isOverdue
    ? 'bg-red-100 text-red-800 ring-1 ring-red-200'
    : 'bg-slate-50 text-slate-700';
  const ariaLabel = isOverdue ? `Quá hạn: ${label}` : `Thời gian mở: ${label}`;
  return (
    <span
      aria-label={ariaLabel}
      data-testid="age-cell"
      data-is-overdue={isOverdue ? 'true' : 'false'}
      data-age-hours={ageHours}
      className={
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' +
        overdueTone +
        (className ? ` ${className}` : '')
      }
    >
      {label}
    </span>
  );
}
