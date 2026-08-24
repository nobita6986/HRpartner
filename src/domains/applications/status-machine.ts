/**
 * status-machine — MP-2 Apply + Tracking (STEP-03, RQ-06 / DEC-05).
 *
 * MP-2 owns ONLY the initial `NEW` event and a constrained `NEW ↔ NEEDS_INFO`
 * transition. `SCREENING`, `QUALIFIED`, `REJECTED`, `WITHDRAWN`, `CONVERTED`
 * are MP-3-owned and MUST NOT be reachable from an MP-2 status action. Any
 * transition requires a non-empty reason (append-only history invariant).
 */

export const APPLICATION_STATUSES = [
  'NEW',
  'NEEDS_INFO',
  'SCREENING',
  'QUALIFIED',
  'REJECTED',
  'WITHDRAWN',
  'CONVERTED',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// MP-2-owned transitions only (DEC-05). Everything else is MP-3.
const MP2_ALLOWED_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  NEW: ['NEEDS_INFO'],
  NEEDS_INFO: ['NEW'],
};

export class StatusTransitionError extends Error {
  constructor(
    public readonly code: 'INVALID_TRANSITION' | 'REASON_REQUIRED',
    message: string,
  ) {
    super(message);
    this.name = 'StatusTransitionError';
  }
}

/** True only for transitions MP-2 is allowed to perform. */
export function isMp2Transition(from: string, to: string): boolean {
  return (MP2_ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Validate a requested transition for MP-2. Throws INVALID_TRANSITION for any
 * transition outside NEW↔NEEDS_INFO (including MP-3 targets), and
 * REASON_REQUIRED when no reason is supplied.
 */
export function assertMp2Transition(from: string, to: string, reason?: string | null): void {
  if (!isMp2Transition(from, to)) {
    throw new StatusTransitionError(
      'INVALID_TRANSITION',
      `Transition ${from} -> ${to} is not permitted in MP-2`,
    );
  }
  if (!reason || reason.trim().length === 0) {
    throw new StatusTransitionError('REASON_REQUIRED', 'A non-empty reason is required for a status transition');
  }
}
