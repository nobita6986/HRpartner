'use client';

/**
 * HandlerChip — Render the server-derived handler assignment.
 *
 * Frozen contract (TASK.md AC-12, RQ-12):
 *   - Render `assigneeName` when present.
 *   - Render muted "Chưa phân công" otherwise.
 *   - MUST NOT query DB to resolve a name; everything is server-provided.
 *
 * The `data-source` attribute surfaces the E0-derived `handler.source`
 * (e.g. assignment record id) for tests and CSS hooks.
 */

import * as React from 'react';

export interface HandlerChipProps {
  assigneeName: string | null;
  /** Optional E0-derived source string (e.g. assignment record id). */
  source?: string | null;
  /** Optional className override for the wrapping span. */
  className?: string;
}

/**
 * HandlerChip — Render the handler name chip.
 * Client component (pure render).
 */
export function HandlerChip({
  assigneeName,
  source = null,
  className,
}: HandlerChipProps): React.ReactElement {
  const isAssigned = typeof assigneeName === 'string' && assigneeName.length > 0;
  const display = isAssigned ? assigneeName : 'Chưa phân công';
  const tone = isAssigned
    ? 'bg-indigo-100 text-indigo-800'
    : 'bg-slate-100 text-slate-500';
  const ariaLabel = isAssigned ? `Phụ trách: ${assigneeName}` : 'Chưa phân công';
  return (
    <span
      aria-label={ariaLabel}
      data-testid="handler-chip"
      data-assigned={isAssigned ? 'true' : 'false'}
      data-source={source ?? ''}
      className={
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' +
        tone +
        (className ? ` ${className}` : '')
      }
    >
      {display}
    </span>
  );
}
