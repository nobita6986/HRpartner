/**
 * StatusBadge — T1B Wave 1 Foundation shared presentation primitive.
 *
 * Architecture rule (T0 §3.C / EP §4.2 / EP §4.5):
 * - This component is a PRESENTATION PRIMITIVE only. It does NOT own any
 *   dictionary data. It does NOT read from a global aggregator.
 * - The consumer MUST compute the Vietnamese label by looking up its own
 *   domain-owned dictionary (e.g. `placement-ui.ts` STATUS_LABELS,
 *   `recruiter-assignment-manager.tsx` STATUS_CONFIG, `workers/page.tsx`
 *   STATUS_CONFIG, etc.) and pass the rendered string as `children`.
 * - The `module` prop is a stable identifier so test/static-scans can prove
 *   which module owns the lookup; the component does not branch on it.
 *
 * Why this shape:
 * - Wave 1 has no domain status dictionary of its own. Wave 2/3/4 each ship
 *   their domain dictionary and migrate the existing inline `<span>` chips to
 *   this primitive. Wave 1 only ships the primitive + tests so the migration
 *   has a stable target.
 *
 * Styling rule:
 * - Use existing token classes (`rounded-full px-2 py-0.5 text-xs font-semibold`)
 *   to match the established inline chip aesthetic in the admin app
 *   (recruiter-assignment-manager.tsx, projects/page.tsx, workers/page.tsx,
 *   NextActionBadge.tsx).
 * - `tone` selects tone classes; `tone: NEUTRAL_OR_SUCCESS_OR_WARN_OR_DANGER`
 *   is the only branch the component performs.
 */

import * as React from 'react';

export type StatusBadgeTone = 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER';

export interface StatusBadgeProps {
  /**
   * Stable module identifier. Used by static tests to verify the consumer
   * owns the lookup. Not branched on at runtime.
   */
  module: string;
  /** Canonical enum value (NOT user-facing). */
  status: string;
  /**
   * Optional tone. Defaults to NEUTRAL. The component picks one of 4 tone
   * styles. Consumers typically derive the tone from the same lookup.
   */
  tone?: StatusBadgeTone;
  /** Rendered text. MUST be the Vietnamese label from the consumer's dictionary. */
  children: React.ReactNode;
  /** Optional className appended to the tone baseline. */
  className?: string;
  /** Optional `data-testid`. Static tests use this to assert membership. */
  testId?: string;
}

const TONE_CLASSES: Readonly<Record<StatusBadgeTone, string>> = {
  NEUTRAL: 'bg-slate-100 text-slate-700',
  SUCCESS: 'bg-green-100 text-green-800',
  WARN: 'bg-yellow-100 text-yellow-800',
  DANGER: 'bg-red-100 text-red-800',
};

export function StatusBadge(props: StatusBadgeProps): React.ReactElement {
  const tone = props.tone ?? 'NEUTRAL';
  const cls = TONE_CLASSES[tone];
  const testId = props.testId ?? `status-badge-${props.module}-${props.status}`;
  return (
    <span
      data-testid={testId}
      data-status-badge-module={props.module}
      data-status-badge-status={props.status}
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls} ${props.className ?? ''}`.trim()}
    >
      {props.children}
    </span>
  );
}