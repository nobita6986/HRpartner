'use client';

/**
 * NextActionBadge — Pure UI helper, enum → label/icon.
 *
 * Frozen contract (TASK.md §4.4, AC-10, RQ-10):
 *   - Exactly 7 values from E0 `ServerDerivedNextAction` (no `CONTACT_CANDIDATE`).
 *   - The badge MUST NOT derive `nextAction` from row fields — server is the
 *     authority. This component receives the already-derived value and renders
 *     a label/icon only.
 *   - If E0 ever extends the enum, this map is the single place to update.
 *
 * Styling: badge with text + color (WCAG — not color-only). `NONE` renders
 * an em-dash placeholder rather than a colored chip to keep semantics clear.
 */

import * as React from 'react';
import {
  SERVER_DERIVED_NEXT_ACTION_VALUES,
  type ServerDerivedNextAction,
} from '@/src/domains/talent/recruiter-workbench.types';

const ACTION_META: Record<
  ServerDerivedNextAction,
  { label: string; tone: 'open' | 'docs' | 'screen' | 'schedule' | 'await' | 'review' | 'none' }
> = {
  OPEN_INTAKE: { label: 'Mở hồ sơ intake', tone: 'open' },
  REQUEST_DOCS: { label: 'Yêu cầu giấy tờ', tone: 'docs' },
  SCREEN_SUBMISSION: { label: 'Sàng lọc hồ sơ', tone: 'screen' },
  SCHEDULE_SCREEN: { label: 'Sắp lịch sàng lọc', tone: 'schedule' },
  AWAITING_RESULT: { label: 'Chờ kết quả', tone: 'await' },
  REVIEW_PLACEMENT: { label: 'Xem placement', tone: 'review' },
  NONE: { label: '—', tone: 'none' },
};

/**
 * Compile-time guarantee that the map covers all 7 enum values.
 * Adding/removing a value in `SERVER_DERIVED_NEXT_ACTION_VALUES` MUST
 * surface here as a TypeScript error before the build.
 */
const _exhaustiveCheck: Record<ServerDerivedNextAction, true> = {
  OPEN_INTAKE: true,
  REQUEST_DOCS: true,
  SCREEN_SUBMISSION: true,
  SCHEDULE_SCREEN: true,
  AWAITING_RESULT: true,
  REVIEW_PLACEMENT: true,
  NONE: true,
};
void _exhaustiveCheck;

/** Internal: derive tone class for accessibility-friendly text+color badge. */
function toneClass(tone: (typeof ACTION_META)[ServerDerivedNextAction]['tone']): string {
  switch (tone) {
    case 'open':
      return 'bg-blue-100 text-blue-800';
    case 'docs':
      return 'bg-amber-100 text-amber-800';
    case 'screen':
      return 'bg-violet-100 text-violet-800';
    case 'schedule':
      return 'bg-cyan-100 text-cyan-800';
    case 'await':
      return 'bg-slate-100 text-slate-700';
    case 'review':
      return 'bg-emerald-100 text-emerald-800';
    case 'none':
      return 'bg-transparent text-slate-400';
  }
}

/** Read-only accessor: export the static 7-value map for tests. */
export const NEXT_ACTION_META = ACTION_META;
export const NEXT_ACTION_VALUES = SERVER_DERIVED_NEXT_ACTION_VALUES;

export interface NextActionBadgeProps {
  action: ServerDerivedNextAction;
  /** Optional className override for the wrapping span. */
  className?: string;
}

/**
 * NextActionBadge — Render the server-derived `nextAction` as a label + tone.
 * Client component (no DB access; pure render).
 */
export function NextActionBadge({ action, className }: NextActionBadgeProps): React.ReactElement {
  const meta = ACTION_META[action];
  const ariaLabel = `Hành động tiếp theo: ${meta.label}`;
  return (
    <span
      aria-label={ariaLabel}
      data-testid="next-action-badge"
      data-next-action={action}
      className={
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' +
        toneClass(meta.tone) +
        (className ? ` ${className}` : '')
      }
    >
      {meta.label}
    </span>
  );
}
