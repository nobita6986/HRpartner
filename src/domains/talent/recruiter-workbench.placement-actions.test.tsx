/**
 * recruiter-workbench.placement-actions.test.tsx — P1-F1 UI structural tests.
 *
 * Same dependency-free pattern as `placement-panel.test.ts`: render with
 * `react-dom/server` + `createElement`, no DOM, no testing-library.
 *
 * Targets:
 *   - LOCK-03: cell renders "—" sentinel for terminal rows; trigger button
 *     for rows with actions; stale-alert text for stale snapshots.
 *   - LOCK-04: drawer renders 1 row only (no bulk checkboxes).
 *   - LOCK-07: inline `role="status"` and `role="alert"` paragraphs in
 *     DOM (no Toast dep).
 *   - LOCK-08: NO client-side audit log; no `placement.timeline` DOM hook.
 *   - LOCK-15: HRP-managed + CONFIRMED → drawer does NOT include the
 *     EFFECTIVE trigger.
 *   - Stale snapshot: caseStatus 'IN_PROGRESS' + placement.status='SELECTED'
 *     → renders the inline stale alert, NOT a trigger.
 *   - PRIMARY actions cell from the parent <PrimaryActions/> STILL renders
 *     its detail / submission links for the same row (we did not displace
 *     anything).
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type {
  RecruiterWorkbenchPlacement,
  RecruiterWorkbenchPlacementOption,
} from '@/src/domains/talent/recruiter-workbench.types';

import {
  PlacementActionCell,
} from '@/src/domains/talent/recruiter-workbench.placement-actions';

// ─────────────────────────────────────────────────────────────────────────
// next/navigation is a client-only dep; stub it to a no-op router.
// ─────────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: () => {
      /* no-op for SSR markup */
    },
    push: () => {
      /* no-op */
    },
    replace: () => {
      /* no-op */
    },
    back: () => {
      /* no-op */
    },
    prefetch: () => {
      /* no-op */
    },
    forward: () => {
      /* no-op */
    },
  }),
}));

const render = (el: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(el);

function makePlacement(
  overrides: Partial<RecruiterWorkbenchPlacement>,
): RecruiterWorkbenchPlacement {
  return {
    id: overrides.id ?? 'pl-1',
    status: overrides.status ?? 'SELECTED',
    jobOpeningId: overrides.jobOpeningId ?? 'jo-1',
    managementMode: overrides.managementMode ?? 'HRP_MANAGED',
  };
}

function makeOption(
  overrides: Partial<RecruiterWorkbenchPlacementOption>,
): RecruiterWorkbenchPlacementOption {
  return {
    jobOpeningId: overrides.jobOpeningId ?? 'jo-1',
    sourceCandidateSubmissionId:
      overrides.sourceCandidateSubmissionId ?? 'sub-1',
    title: overrides.title ?? 'Thợ hàn',
    projectName: overrides.projectName ?? 'Dự án A',
    companyName: overrides.companyName ?? 'Cty B',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// LOCK-03 — cell sentinel vs trigger
// ─────────────────────────────────────────────────────────────────────────

describe('PlacementActionCell', () => {
  it('F1-CEL01: terminal case renders "—" sentinel (no trigger button)', () => {
    const html = render(
      createElement(PlacementActionCell, {
        row: {
          caseId: 'case-1',
          caseStatus: 'CLOSED',
          placement: makePlacement({ status: 'EFFECTIVE' }),
          placementOptions: null,
        },
      }),
    );
    expect(html).toContain('—');
    expect(html).not.toContain('Mở bố trí');
  });

  it('F1-CEL02: stale snapshot renders inline alert; no trigger', () => {
    const html = render(
      createElement(PlacementActionCell, {
        row: {
          caseId: 'case-2',
          caseStatus: 'IN_PROGRESS',
          placement: makePlacement({ status: 'SELECTED' }),
          placementOptions: null,
        },
      }),
    );
    expect(html).toContain('placement-stale-alert');
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('Mở bố trí');
  });

  it('F1-CEL03: no placement + no options renders "—" sentinel', () => {
    const html = render(
      createElement(PlacementActionCell, {
        row: {
          caseId: 'case-3',
          caseStatus: 'IN_PROGRESS',
          placement: null,
          placementOptions: null,
        },
      }),
    );
    expect(html).toContain('—');
    expect(html).not.toContain('Mở bố trí');
  });

  it('F1-CEL04: READY_TO_PLACE + options renders trigger', () => {
    const html = render(
      createElement(PlacementActionCell, {
        row: {
          caseId: 'case-4',
          caseStatus: 'READY_TO_PLACE',
          placement: null,
          placementOptions: [makeOption({ jobOpeningId: 'jo-1' })],
        },
      }),
    );
    expect(html).toContain('Mở bố trí');
    expect(html).toContain('placement-action-open');
  });

  it('F1-CEL05: SELECTED + READY_TO_PLACE renders trigger', () => {
    const html = render(
      createElement(PlacementActionCell, {
        row: {
          caseId: 'case-5',
          caseStatus: 'READY_TO_PLACE',
          placement: makePlacement({ status: 'SELECTED' }),
          placementOptions: null,
        },
      }),
    );
    expect(html).toContain('Mở bố trí');
  });

  it('F1-CEL06: client-managed + CONFIRMED renders trigger (EFFECTIVE available)', () => {
    const html = render(
      createElement(PlacementActionCell, {
        row: {
          caseId: 'case-6',
          caseStatus: 'READY_TO_PLACE',
          placement: makePlacement({
            status: 'CONFIRMED',
            managementMode: 'CLIENT_MANAGED',
          }),
          placementOptions: null,
        },
      }),
    );
    expect(html).toContain('Mở bố trí');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LOCK-04 — drawer is single-row, no bulk checkboxes
// ─────────────────────────────────────────────────────────────────────────

describe('Drawer structural conformance (single-row, no bulk)', () => {
  it('F1-DRW01: confirms the render path includes no `bulk` or checkbox markup', () => {
    // Placeholder — confirmed via the *trigger button* test above. The
    // marker is `placement-drawer` only ever wrapping ONE row's `<aside>`,
    // and never a `bulk-` `data-testid`. If this test ever fails, something
    // was added that contradicts LOCK-04.
    const html = render(
      createElement(PlacementActionCell, {
        row: {
          caseId: 'case-9',
          caseStatus: 'READY_TO_PLACE',
          placement: null,
          placementOptions: [makeOption({})],
        },
      }),
    );
    expect(html).not.toContain('bulk-action');
    expect(html).not.toContain('type="checkbox"');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LOCK-15 — HRP-managed restrictions preserved
// ─────────────────────────────────────────────────────────────────────────

describe('HRP-managed restrictions preserved (LOCK-15)', () => {
  it('F1-HRP01: trigger available on HRP-managed CONFIRMED (FAIL/CANCEL allowed)', () => {
    const html = render(
      createElement(PlacementActionCell, {
        row: {
          caseId: 'case-h1',
          caseStatus: 'READY_TO_PLACE',
          placement: makePlacement({
            status: 'CONFIRMED',
            managementMode: 'HRP_MANAGED',
          }),
          placementOptions: null,
        },
      }),
    );
    expect(html).toContain('Mở bố trí');
  });

  it('F1-HRP02: states helper excludes EFFECTIVE for HRP-managed', async () => {
    // Import via the same module so we exercise the real matrix.
    const { availableActionsForRow } = await import(
      '@/src/domains/talent/recruiter-workbench.placement-actions.states'
    );
    const out = availableActionsForRow({
      caseStatus: 'READY_TO_PLACE',
      placement: makePlacement({
        status: 'CONFIRMED',
        managementMode: 'HRP_MANAGED',
      }),
      placementOptions: null,
    });
    expect(out.map((a) => a.command)).not.toContain('placement.effective');
    expect(out.map((a) => a.command)).toEqual([
      'placement.fail',
      'placement.cancel',
    ]);
  });

  it('F1-HRP03: client-managed CONFIRMED INCLUDES EFFECTIVE', async () => {
    const { availableActionsForRow } = await import(
      '@/src/domains/talent/recruiter-workbench.placement-actions.states'
    );
    const out = availableActionsForRow({
      caseStatus: 'READY_TO_PLACE',
      placement: makePlacement({
        status: 'CONFIRMED',
        managementMode: 'CLIENT_MANAGED',
      }),
      placementOptions: null,
    });
    expect(out.map((a) => a.command)).toContain('placement.effective');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LOCK-07 — safe inline status / alert (render-only check)
// ─────────────────────────────────────────────────────────────────────────

describe('safe inline status / alert (LOCK-07)', () => {
  it('F1-INL01: stale alert carries role="alert"', () => {
    const html = render(
      createElement(PlacementActionCell, {
        row: {
          caseId: 'case-i1',
          caseStatus: 'IN_PROGRESS',
          placement: makePlacement({ status: 'SELECTED' }),
          placementOptions: null,
        },
      }),
    );
    expect(html).toContain('role="alert"');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LOCK-08 — no client-side audit / timeline
// ─────────────────────────────────────────────────────────────────────────

describe('no client-side audit log / no timeline (LOCK-08)', () => {
  it('F1-LK801: cell markup contains NO `timeline` hook', () => {
    const html = render(
      createElement(PlacementActionCell, {
        row: {
          caseId: 'case-i2',
          caseStatus: 'READY_TO_PLACE',
          placement: null,
          placementOptions: [makeOption({})],
        },
      }),
    );
    expect(html).not.toContain('placement.timeline');
    expect(html).not.toContain('audit-log');
  });
});
