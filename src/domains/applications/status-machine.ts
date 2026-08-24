/**
 * Canonical CandidateSubmission lifecycle.
 *
 * MP-2 keeps its narrow NEW <-> NEEDS_INFO compatibility action. MP-3 owns
 * explicit screening commands and never exposes an arbitrary target status.
 */
import type { CandidateSubmissionStatus } from '@prisma/client';

export const APPLICATION_STATUSES = [
  'NEW',
  'NEEDS_INFO',
  'SCREENING',
  'QUALIFIED',
  'REJECTED',
  'WITHDRAWN',
  'CONVERTED',
  'MERGED',
] as const satisfies readonly CandidateSubmissionStatus[];

export type ApplicationStatus = CandidateSubmissionStatus;
export type ScreeningAction = 'screen' | 'qualify' | 'reject';

const MP2_ALLOWED_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  NEW: ['NEEDS_INFO'],
  NEEDS_INFO: ['NEW'],
};

const MP3_ACTION_TARGET: Readonly<Record<ScreeningAction, CandidateSubmissionStatus>> = {
  screen: 'SCREENING',
  qualify: 'QUALIFIED',
  reject: 'REJECTED',
};

const MP3_ALLOWED_FROM: Readonly<Record<ScreeningAction, readonly CandidateSubmissionStatus[]>> = {
  screen: ['NEW', 'NEEDS_INFO'],
  qualify: ['SCREENING'],
  reject: ['NEW', 'NEEDS_INFO', 'SCREENING', 'QUALIFIED'],
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

export function isMp2Transition(from: string, to: string): boolean {
  return (MP2_ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export function assertMp2Transition(from: string, to: string, reason?: string | null): void {
  if (!isMp2Transition(from, to)) {
    throw new StatusTransitionError(
      'INVALID_TRANSITION',
      `Transition ${from} -> ${to} is not permitted in MP-2`,
    );
  }
  requireReason(reason);
}

export function targetForScreeningAction(action: ScreeningAction): CandidateSubmissionStatus {
  return MP3_ACTION_TARGET[action];
}

export function isMp3ActionTransition(
  action: ScreeningAction,
  from: CandidateSubmissionStatus,
): boolean {
  return MP3_ALLOWED_FROM[action].includes(from);
}

export function assertMp3ActionTransition(
  action: ScreeningAction,
  from: CandidateSubmissionStatus,
  reason?: string | null,
): CandidateSubmissionStatus {
  const target = targetForScreeningAction(action);
  if (from !== target && !isMp3ActionTransition(action, from)) {
    throw new StatusTransitionError(
      'INVALID_TRANSITION',
      `Action ${action} cannot transition ${from} -> ${target}`,
    );
  }
  requireReason(reason);
  return target;
}

function requireReason(reason?: string | null): void {
  if (!reason || reason.trim().length === 0) {
    throw new StatusTransitionError(
      'REASON_REQUIRED',
      'A non-empty reason is required for a status transition',
    );
  }
}