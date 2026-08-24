/**
 * status-machine unit tests — MP-2 STEP-03 (DEC-05).
 */
import { describe, it, expect } from 'vitest';
import { assertMp2Transition, isMp2Transition, StatusTransitionError } from './status-machine';

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
    // valid
    expect(() => assertMp2Transition('NEW', 'NEEDS_INFO', 'Cần bổ sung CCCD')).not.toThrow();
  });

  it('surfaces stable error codes', () => {
    try {
      assertMp2Transition('NEW', 'CONVERTED', 'x');
    } catch (e) {
      expect((e as StatusTransitionError).code).toBe('INVALID_TRANSITION');
    }
    try {
      assertMp2Transition('NEW', 'NEEDS_INFO', '');
    } catch (e) {
      expect((e as StatusTransitionError).code).toBe('REASON_REQUIRED');
    }
  });
});
