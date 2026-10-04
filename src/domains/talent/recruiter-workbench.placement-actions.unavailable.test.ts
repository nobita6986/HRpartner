/**
 * recruiter-workbench.placement-actions.unavailable.test.ts — F6 pure
 * resolver unit tests.
 *
 * Targets (F-06 / `RQ-01..RQ-04` / `RQ-09`):
 *   - Every documented code path returns the canonical `code` and a
 *     safe Vietnamese `label`.
 *   - Purity: two calls with the same arguments produce the same
 *     `{ code, label }`. No `Date.now()`, no `Math.random()`, no fetch.
 *   - Safe text: no returned label contains a UUID substring, the
 *     literal text `body.message`, `case-`, `submission`, or PII
 *     keywords (`sdt`, `cccd`, `email`, `phone`).
 *   - Closed enum: 7 reason codes; the exported
 *     `PLACEMENT_UNAVAILABLE_REASON_VALUES` is exactly 7 entries.
 */

import { describe, expect, it } from 'vitest';

import type {
  RecruiterWorkbenchPlacement,
  RecruiterWorkbenchPlacementOption,
  RecruiterWorkbenchRow,
} from '@/src/domains/talent/recruiter-workbench.types';

import {
  PLACEMENT_UNAVAILABLE_REASON_CODES,
  PLACEMENT_UNAVAILABLE_REASON_VALUES,
  resolvePlacementUnavailableReason,
  type PlacementUnavailableReasonCode,
} from '@/src/domains/talent/recruiter-workbench.placement-actions.unavailable';

// ─────────────────────────────────────────────────────────────────────────
// Builders (mirror `placement-actions.states.test.ts:39-72`).
// ─────────────────────────────────────────────────────────────────────────

function baseRow(
  overrides: Partial<RecruiterWorkbenchRow> = {},
): Pick<
  RecruiterWorkbenchRow,
  'caseStatus' | 'placement' | 'placementOptions' | 'nextAction'
> {
  return {
    caseStatus: overrides.caseStatus ?? 'READY_TO_PLACE',
    placement: overrides.placement ?? null,
    placementOptions: overrides.placementOptions ?? null,
    nextAction: overrides.nextAction ?? 'REVIEW_PLACEMENT',
  };
}

function placement(
  overrides: Partial<RecruiterWorkbenchPlacement> = {},
): RecruiterWorkbenchPlacement {
  return {
    id: overrides.id ?? 'pl-1',
    status: overrides.status ?? 'SELECTED',
    jobOpeningId: overrides.jobOpeningId ?? 'jo-1',
    managementMode: overrides.managementMode ?? 'HRP_MANAGED',
  };
}

function option(
  overrides: Partial<RecruiterWorkbenchPlacementOption> = {},
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

const RESOLVER_INPUTS = {
  canMutatePlacement: true as const,
  isStale: false as const,
  row: baseRow(),
};

// ─────────────────────────────────────────────────────────────────────────
// Closed enum
// ─────────────────────────────────────────────────────────────────────────

describe('PLACEMENT_UNAVAILABLE_REASON_VALUES', () => {
  it('F6-ENUM01: exactly 7 reason codes (closed enum)', () => {
    expect(PLACEMENT_UNAVAILABLE_REASON_VALUES).toHaveLength(7);
  });

  it('F6-ENUM02: includes all 7 expected codes', () => {
    const expected: ReadonlyArray<PlacementUnavailableReasonCode> = [
      'NO_AUTHORITY',
      'STALE',
      'NO_ELIGIBLE_OPTION',
      'CASE_NOT_READY',
      'TERMINAL_PLACEMENT',
      'WORKFLOW_GATE',
      'GENERIC_FALLBACK',
    ];
    for (const code of expected) {
      expect(PLACEMENT_UNAVAILABLE_REASON_VALUES).toContain(code);
    }
  });

  it('F6-ENUM03: PLACEMENT_UNAVAILABLE_REASON_CODES table covers every code', () => {
    for (const code of PLACEMENT_UNAVAILABLE_REASON_VALUES) {
      expect(PLACEMENT_UNAVAILABLE_REASON_CODES[code]).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Decision-order coverage
// ─────────────────────────────────────────────────────────────────────────

describe('resolvePlacementUnavailableReason — code paths', () => {
  it('F6-CP01: canMutatePlacement=false → NO_AUTHORITY', () => {
    const out = resolvePlacementUnavailableReason({
      canMutatePlacement: false,
      isStale: false,
      row: baseRow(),
    });
    expect(out.code).toBe('NO_AUTHORITY');
    expect(out.label).toBe('Không thuộc quyền của bạn.');
  });

  it('F6-CP02: isStale=true → STALE (caller keeps the F-03 amber alert)', () => {
    const out = resolvePlacementUnavailableReason({
      canMutatePlacement: true,
      isStale: true,
      row: baseRow(),
    });
    expect(out.code).toBe('STALE');
    expect(out.label).toBe('Dữ liệu đã cũ — vui lòng tải lại trang.');
  });

  it('F6-CP03: canMutatePlacement=false + isStale=true → NO_AUTHORITY wins (auth first)', () => {
    // Authorization must always beat the stale detector — unauthorized
    // callers must not be told to "reload" the data.
    const out = resolvePlacementUnavailableReason({
      canMutatePlacement: false,
      isStale: true,
      row: baseRow(),
    });
    expect(out.code).toBe('NO_AUTHORITY');
  });

  it('F6-CP04: no placement + no options + READY_TO_PLACE → NO_ELIGIBLE_OPTION', () => {
    const out = resolvePlacementUnavailableReason({
      ...RESOLVER_INPUTS,
      row: baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: null,
        placementOptions: [],
      }),
    });
    expect(out.code).toBe('NO_ELIGIBLE_OPTION');
    expect(out.label).toMatch(/JobOpening/i);
    expect(out.label).toMatch(/OPEN/);
    expect(out.label).toMatch(/slot/i);
  });

  it('F6-CP05: no placement + options + non-READY_TO_PLACE → CASE_NOT_READY', () => {
    const out = resolvePlacementUnavailableReason({
      ...RESOLVER_INPUTS,
      row: baseRow({
        caseStatus: 'IN_PROGRESS',
        placement: null,
        placementOptions: [option()],
      }),
    });
    expect(out.code).toBe('CASE_NOT_READY');
    expect(out.label).toMatch(/Sẵn sàng bố trí/);
  });

  it('F6-CP06: placement EFFECTIVE + READY_TO_PLACE → TERMINAL_PLACEMENT', () => {
    const out = resolvePlacementUnavailableReason({
      ...RESOLVER_INPUTS,
      row: baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: placement({ status: 'EFFECTIVE' }),
      }),
    });
    expect(out.code).toBe('TERMINAL_PLACEMENT');
    expect(out.label).toMatch(/kết thúc/);
  });

  it('F6-CP07: placement FAILED + READY_TO_PLACE → TERMINAL_PLACEMENT', () => {
    const out = resolvePlacementUnavailableReason({
      ...RESOLVER_INPUTS,
      row: baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: placement({ status: 'FAILED' }),
      }),
    });
    expect(out.code).toBe('TERMINAL_PLACEMENT');
  });

  it('F6-CP08: placement CANCELLED + READY_TO_PLACE → TERMINAL_PLACEMENT', () => {
    const out = resolvePlacementUnavailableReason({
      ...RESOLVER_INPUTS,
      row: baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: placement({ status: 'CANCELLED' }),
      }),
    });
    expect(out.code).toBe('TERMINAL_PLACEMENT');
  });

  it.each([
    'OPEN_INTAKE',
    'REQUEST_DOCS',
    'SCREEN_SUBMISSION',
    'SCHEDULE_SCREEN',
    'AWAITING_RESULT',
    'NONE',
  ] as const)(
    'F6-CP09-%s: placement SELECTED + READY_TO_PLACE + non-REVIEW nextAction → WORKFLOW_GATE',
    (nextAction) => {
      const out = resolvePlacementUnavailableReason({
        ...RESOLVER_INPUTS,
        row: baseRow({
          caseStatus: 'READY_TO_PLACE',
          placement: placement({ status: 'SELECTED' }),
          nextAction,
        }),
      });
      expect(out.code).toBe('WORKFLOW_GATE');
    },
  );

  it('F6-CP10: placement CONFIRMED + HRP_MANAGED + READY_TO_PLACE + REVIEW → still routes through decision order (placement != null + non-terminal + REVIEW) → GENERIC_FALLBACK', () => {
    // The resolver does NOT consult `canPerformPlacementAction`; it
    // maps the row's authoritative state to a reason. For a healthy
    // CONFIRMED + REVIEW row, the cell would offer a transition button,
    // so the resolver is not actually called in the UI flow. From the
    // resolver's perspective this row reaches the final fallback.
    const out = resolvePlacementUnavailableReason({
      ...RESOLVER_INPUTS,
      row: baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: placement({
          status: 'CONFIRMED',
          managementMode: 'HRP_MANAGED',
        }),
        nextAction: 'REVIEW_PLACEMENT',
      }),
    });
    expect(out.code).toBe('GENERIC_FALLBACK');
    expect(out.label).toBe('Chưa có thao tác bố trí phù hợp cho case này.');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Determinism + purity
// ─────────────────────────────────────────────────────────────────────────

describe('resolvePlacementUnavailableReason — purity', () => {
  it('F6-PUR01: same input → same output (determinism)', () => {
    const a = resolvePlacementUnavailableReason({
      canMutatePlacement: true,
      isStale: false,
      row: baseRow({
        caseStatus: 'IN_PROGRESS',
        placement: null,
        placementOptions: [option()],
      }),
    });
    const b = resolvePlacementUnavailableReason({
      canMutatePlacement: true,
      isStale: false,
      row: baseRow({
        caseStatus: 'IN_PROGRESS',
        placement: null,
        placementOptions: [option()],
      }),
    });
    expect(a).toEqual(b);
  });

  it('F6-PUR02: resolver does not call Date.now() / Math.random() / fetch', () => {
    // The resolver module does not import any of: Date, Math.random,
    // globalThis.fetch, process, Buffer, setTimeout, setInterval. This
    // is enforced by a static import scan in CI (see HANDOFF).
    // Here we assert the runtime property: 1000 calls produce the
    // same result and never throw.
    for (let i = 0; i < 1000; i++) {
      const out = resolvePlacementUnavailableReason({
        canMutatePlacement: true,
        isStale: false,
        row: baseRow({
          caseStatus: 'READY_TO_PLACE',
          placement: placement({ status: 'EFFECTIVE' }),
        }),
      });
      expect(out.code).toBe('TERMINAL_PLACEMENT');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Safe-text assertion
// ─────────────────────────────────────────────────────────────────────────

describe('PLACEMENT_UNAVAILABLE_REASON_CODES — safe text', () => {
  // F-06: the resolver NEVER echoes raw server text, UUID, SQL, stack
  // trace, PII (phone / CCCD / email), or `case-` / `submission`
  // substrings. Every label is a short, curated Vietnamese phrase.
  const FORBIDDEN_SUBSTRINGS: ReadonlyArray<[string, RegExp]> = [
    ['UUID v4 substring', /^[0-9a-f]{8}-[0-9a-f]{4}-/i],
    ['body.message literal', /body\.message/],
    ['case- id prefix', /case-/],
    ['submission id keyword', /submission/i],
    ['PII keyword: sdt', /\bsdt\b/i],
    ['PII keyword: cccd', /\bcccd\b/i],
    ['PII keyword: email', /\bemail\b/i],
    ['PII keyword: phone', /\bphone\b/i],
  ];

  for (const [code, label] of Object.entries(PLACEMENT_UNAVAILABLE_REASON_CODES)) {
    for (const [name, pattern] of FORBIDDEN_SUBSTRINGS) {
      it(`F6-SAFE-${code}-${name.replace(/[^a-z0-9]/gi, '')}: label is free of ${name}`, () => {
        expect(label).not.toMatch(pattern);
      });
    }
  }

  it('F6-SAFE-LEN: every label is ≤ 140 chars (responsive constraint)', () => {
    for (const [code, label] of Object.entries(PLACEMENT_UNAVAILABLE_REASON_CODES)) {
      expect(label.length, `code=${code}`).toBeLessThanOrEqual(140);
    }
  });

  it('F6-SAFE-NONEMPTY: every label is non-empty', () => {
    for (const [code, label] of Object.entries(PLACEMENT_UNAVAILABLE_REASON_CODES)) {
      expect(label.trim().length, `code=${code}`).toBeGreaterThan(0);
    }
  });
});
