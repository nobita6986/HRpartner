/**
 * public-content-controls/news-section-gate.ts — News toggle resolver.
 *
 * Maps the `NewsSectionToggle` DTO (read from `HomepageSettings` in Phase B)
 * to a `NewsSectionGate` view-model that the existing
 * `if (!content.enabled) return null` policy in `news-section.tsx` already
 * understands.
 *
 * Default ON: when the row is missing (Phase A pre-migration; pre-Phase-B
 * safe defaults) we return `{ enabled: true, source: 'INTEGRATION_PENDING' }`
 * so the public surface keeps the current ON state.
 *
 * No imports from `src/domains/job-board/components/landing/news-section.tsx`
 * — that file is T1B-owned. The gate is consumed in Phase B by a thin
 * composition wrapper placed next to the existing `<NewsSection>` mount
 * in `app/(portal)/page.tsx` (also T1B-owned; Phase A does not touch it).
 */

import type {
  NewsSectionGate,
  NewsSectionToggle,
} from './types';

export function resolveNewsSectionGate(
  toggle: NewsSectionToggle | null | undefined,
): NewsSectionGate {
  if (toggle === null || toggle === undefined) {
    return { enabled: true, source: 'INTEGRATION_PENDING' };
  }
  return {
    enabled: toggle.newsSectionEnabled,
    source: 'REAL',
  };
}
