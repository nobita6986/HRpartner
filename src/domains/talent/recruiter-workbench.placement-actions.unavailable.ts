/**
 * recruiter-workbench.placement-actions.unavailable.ts — F6 pure resolver.
 *
 * Maps the row's authoritative state (server-derived `canMutatePlacement`
 * + the `RecruiterWorkbenchRow` projection + the existing F-03 stale
 * detector) to a structured `{ code, label }` result that the
 * `PlacementActionCell` renders when no action is available.
 *
 * Pure: no React, no Prisma, no fetches, no I/O, no `Date.now()`,
 * no `Math.random()`. Two calls with the same arguments produce the
 * same `{ code, label }`. The caller computes `isStale` from the
 * existing `isStalePlacementSnapshot` so this module does not import
 * the F-03 detector (which keeps the test surface tight).
 *
 * NEVER echoes raw server text, UUID, SQL, stack trace, PII
 * (phone / CCCD / email), or `case-` / `submission` substrings.
 * Every label is a short, stable, safe Vietnamese phrase.
 *
 * The `STALE` code is reserved: the cell still uses the existing F-03
 * amber alert for stale rows (F-02 / F-03 byte-exact). The resolver
 * still returns `STALE` for caller compatibility so any downstream
 * test can assert the contract end-to-end.
 */

import type {
  RecruiterWorkbenchRow,
} from '@/src/domains/talent/recruiter-workbench.types';

// ─────────────────────────────────────────────────────────────────────────
// 1. Closed reason-code enum (7 values).
// ─────────────────────────────────────────────────────────────────────────

export const PLACEMENT_UNAVAILABLE_REASON_VALUES = [
  'NO_AUTHORITY',
  'STALE',
  'NO_ELIGIBLE_OPTION',
  'CASE_NOT_READY',
  'TERMINAL_PLACEMENT',
  'WORKFLOW_GATE',
  'GENERIC_FALLBACK',
] as const;

export type PlacementUnavailableReasonCode =
  (typeof PLACEMENT_UNAVAILABLE_REASON_VALUES)[number];

// ─────────────────────────────────────────────────────────────────────────
// 2. Safe Vietnamese reason table (F-06).
// ─────────────────────────────────────────────────────────────────────────

export const PLACEMENT_UNAVAILABLE_REASON_CODES: Readonly<
  Record<PlacementUnavailableReasonCode, string>
> = {
  NO_AUTHORITY: 'Không thuộc quyền của bạn.',
  STALE: 'Dữ liệu đã cũ — vui lòng tải lại trang.',
  NO_ELIGIBLE_OPTION:
    'Chưa có JobOpening phù hợp — cần JobOpening ở trạng thái OPEN và slot còn chỗ.',
  CASE_NOT_READY:
    "Case chưa sẵn sàng — cần chuyển sang 'Sẵn sàng bố trí'.",
  TERMINAL_PLACEMENT:
    'Bố trí đã ở trạng thái kết thúc — không còn thao tác.',
  WORKFLOW_GATE: 'Case chưa đến bước bố trí.',
  GENERIC_FALLBACK: 'Chưa có thao tác bố trí phù hợp cho case này.',
};

// ─────────────────────────────────────────────────────────────────────────
// 3. Pure resolver (F-06 / §1.1 user-visible outcome).
// ─────────────────────────────────────────────────────────────────────────

export interface ResolvePlacementUnavailableReasonInput {
  /**
   * Server-derived affordance flag (F-02). `true` only for ADMIN,
   * HR_MANAGER, and HR_STAFF + view=MINE. The cell MUST NOT infer this
   * flag — it is forwarded from the page.
   */
  canMutatePlacement: boolean;
  /**
   * Pre-computed by the existing `isStalePlacementSnapshot` (F-03). The
   * caller is responsible for keeping the F-03 amber alert path
   * byte-exact; the resolver still returns `STALE` for testability.
   */
  isStale: boolean;
  row: Pick<
    RecruiterWorkbenchRow,
    'caseStatus' | 'placement' | 'placementOptions' | 'nextAction'
  >;
}

export interface PlacementUnavailableReason {
  code: PlacementUnavailableReasonCode;
  label: string;
}

/**
 * Pure: map the row's authoritative state to a `{ code, label }` result.
 *
 * Decision order (F-06 / `RQ-02`):
 *   1. `canMutatePlacement === false`            → `NO_AUTHORITY`
 *   2. `isStale === true`                        → `STALE` (caller keeps the
 *      existing F-03 amber alert; the resolver still returns the code
 *      so the cell can stamp the `data-unavailable-reason` attribute)
 *   3. `placement == null && no eligible option` → `NO_ELIGIBLE_OPTION`
 *      (no placement, no options, `caseStatus === 'READY_TO_PLACE'`)
 *   4. `placement == null && case not ready`     → `CASE_NOT_READY`
 *      (no placement, `caseStatus !== 'READY_TO_PLACE'`, options present)
 *   5. `placement != null && terminal status`    → `TERMINAL_PLACEMENT`
 *      (`placement.status ∈ {EFFECTIVE, FAILED, CANCELLED}`)
 *   6. `nextAction !== 'REVIEW_PLACEMENT'`       → `WORKFLOW_GATE`
 *      (F-06 workflow gate; the cell has actions blocked even if the
 *      row is otherwise healthy)
 *   7. otherwise                                 → `GENERIC_FALLBACK`
 */
export function resolvePlacementUnavailableReason(
  input: ResolvePlacementUnavailableReasonInput,
): PlacementUnavailableReason {
  const { canMutatePlacement, isStale, row } = input;

  if (canMutatePlacement === false) {
    return reason('NO_AUTHORITY');
  }
  if (isStale === true) {
    return reason('STALE');
  }

  const placement = row.placement;
  const options = row.placementOptions ?? [];
  const hasOptions = options.length > 0;

  if (placement == null) {
    if (!hasOptions) {
      // No placement + no eligible option → safe generic.
      return reason('NO_ELIGIBLE_OPTION');
    }
    // Has options but case is not ready.
    if (row.caseStatus !== 'READY_TO_PLACE') {
      return reason('CASE_NOT_READY');
    }
    // No placement + options + READY_TO_PLACE → caller should have
    // offered a CREATE action. If we are here, the cell has no
    // actions (defensive path). Fall through to the generic fallback.
    return reason('GENERIC_FALLBACK');
  }

  if (
    placement.status === 'EFFECTIVE' ||
    placement.status === 'FAILED' ||
    placement.status === 'CANCELLED'
  ) {
    return reason('TERMINAL_PLACEMENT');
  }

  if (row.nextAction !== 'REVIEW_PLACEMENT') {
    return reason('WORKFLOW_GATE');
  }

  return reason('GENERIC_FALLBACK');
}

function reason(code: PlacementUnavailableReasonCode): PlacementUnavailableReason {
  return { code, label: PLACEMENT_UNAVAILABLE_REASON_CODES[code] };
}
