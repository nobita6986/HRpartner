/**
 * CandidateSubmission state-machine contracts for the MP-2 compatibility
 * boundary and MP-3 explicit commands.
 */
import { describe, it, expect } from 'vitest';
import {
  assertMp2Transition,
  assertMp3ActionTransition,
  isMp2Transition,
  isMp3ActionTransition,
  StatusTransitionError,
} from './status-machine';

describe('status-machine (MP-2 boundary)', () => {
  it('allows only NEW <-> NEEDS_INFO', () => {
    expect(isMp2Transition('NEW', 'NEEDS_INFO')).toBe(true);
    expect(isMp2Transition('NEEDS_INFO', 'NEW')).toBe(true);
  });

  it('rejects MP-3-owned transitions', () => {
    for (const to of ['SCREENING', 'QUALIFIED', 'REJECTED', 'WITHDRAWN', 'CONVERTED']) {
      expect(isMp2Transition('NEW', to)).toBe(false);
      expect(() => assertMp2Transition('NEW', to, 'reason')).toThrow(StatusTransitionError);
    }
  });

  it('requires a non-empty reason', () => {
    expect(() => assertMp2Transition('NEW', 'NEEDS_INFO', '')).toThrow(/REASON_REQUIRED|reason/);
    expect(() => assertMp2Transition('NEW', 'NEEDS_INFO', '   ')).toThrow(StatusTransitionError);
    expect(() => assertMp2Transition('NEW', 'NEEDS_INFO', 'Cần bổ sung CCCD')).not.toThrow();
  });

  it('surfaces stable error codes', () => {
    try {
      assertMp2Transition('NEW', 'CONVERTED', 'x');
    } catch (error) {
      expect((error as StatusTransitionError).code).toBe('INVALID_TRANSITION');
    }
    try {
      assertMp2Transition('NEW', 'NEEDS_INFO', '');
    } catch (error) {
      expect((error as StatusTransitionError).code).toBe('REASON_REQUIRED');
    }
  });
});

describe('status-machine (MP-3 screening)', () => {
  it('supports NEW/NEEDS_INFO -> SCREENING -> QUALIFIED', () => {
    expect(isMp3ActionTransition('screen', 'NEW')).toBe(true);
    expect(isMp3ActionTransition('screen', 'NEEDS_INFO')).toBe(true);
    expect(assertMp3ActionTransition('screen', 'NEW', 'review')).toBe('SCREENING');
    expect(assertMp3ActionTransition('qualify', 'SCREENING', 'pass')).toBe('QUALIFIED');
  });

  it('allows rejection from every non-terminal pre-conversion state', () => {
    for (const status of ['NEW', 'NEEDS_INFO', 'SCREENING', 'QUALIFIED'] as const) {
      expect(assertMp3ActionTransition('reject', status, 'not fit')).toBe('REJECTED');
    }
  });

  it('keeps terminal states closed and permits idempotent same-target replay', () => {
    expect(assertMp3ActionTransition('screen', 'SCREENING', 'replay')).toBe('SCREENING');
    expect(() => assertMp3ActionTransition('screen', 'REJECTED', 'reopen')).toThrow(StatusTransitionError);
    expect(() => assertMp3ActionTransition('qualify', 'CONVERTED', 'reopen')).toThrow(StatusTransitionError);
    expect(() => assertMp3ActionTransition('reject', 'MERGED', 'reopen')).toThrow(StatusTransitionError);
  });
});