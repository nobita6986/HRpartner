/**
 * placement.lifecycle.test.ts — pure state machine (DEC-05).
 *
 * ≥10 cases: từng edge hợp lệ + không hợp lệ + idempotent replay + HRP guard.
 */

import { describe, expect, it } from 'vitest';
import {
  allowedTransitions,
  canTransition,
  computeManagementMode,
  isActivePlacement,
  isTerminalPlacement,
} from '@/src/domains/talent/placement.lifecycle';

describe('placement.lifecycle — computeManagementMode (DEC-02)', () => {
  it('STAFFING_SUPPLY → HRP_MANAGED', () => {
    expect(computeManagementMode('STAFFING_SUPPLY')).toBe('HRP_MANAGED');
  });
  it('LABOR_LEASING → HRP_MANAGED', () => {
    expect(computeManagementMode('LABOR_LEASING')).toBe('HRP_MANAGED');
  });
  it('RECRUITMENT_SERVICE → CLIENT_MANAGED', () => {
    expect(computeManagementMode('RECRUITMENT_SERVICE')).toBe('CLIENT_MANAGED');
  });
  it('REFERRAL_SERVICE → CLIENT_MANAGED', () => {
    expect(computeManagementMode('REFERRAL_SERVICE')).toBe('CLIENT_MANAGED');
  });
  it('null → null (DEC-10: legacy openings không phân loại)', () => {
    expect(computeManagementMode(null)).toBe(null);
  });
});

describe('placement.lifecycle — canTransition happy paths', () => {
  it('SELECTED → CONFIRMED (cả HRP và CLIENT)', () => {
    expect(canTransition('SELECTED', 'CONFIRMED', 'HRP_MANAGED').ok).toBe(true);
    expect(canTransition('SELECTED', 'CONFIRMED', 'CLIENT_MANAGED').ok).toBe(true);
  });

  it('CONFIRMED → EFFECTIVE chỉ hợp lệ với CLIENT_MANAGED', () => {
    expect(canTransition('CONFIRMED', 'EFFECTIVE', 'CLIENT_MANAGED').ok).toBe(true);
  });

  it('SELECTED → FAILED / CANCELLED (side exits)', () => {
    expect(canTransition('SELECTED', 'FAILED', 'HRP_MANAGED').ok).toBe(true);
    expect(canTransition('SELECTED', 'CANCELLED', 'CLIENT_MANAGED').ok).toBe(true);
  });

  it('CONFIRMED → FAILED / CANCELLED (side exits)', () => {
    expect(canTransition('CONFIRMED', 'FAILED', 'HRP_MANAGED').ok).toBe(true);
    expect(canTransition('CONFIRMED', 'CANCELLED', 'CLIENT_MANAGED').ok).toBe(true);
  });

  it('Same state → ok (idempotent replay)', () => {
    expect(canTransition('SELECTED', 'SELECTED', 'HRP_MANAGED')).toEqual({ ok: true });
    expect(canTransition('CONFIRMED', 'CONFIRMED', 'CLIENT_MANAGED')).toEqual({ ok: true });
  });
});

describe('placement.lifecycle — canTransition sad paths (DEC-05/07)', () => {
  it('CONFIRMED → EFFECTIVE bị REJECT với HRP_MANAGED (DEC-07)', () => {
    const r = canTransition('CONFIRMED', 'EFFECTIVE', 'HRP_MANAGED');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('HRP_EFFECTIVE_FORBIDDEN');
  });

  it('EFFECTIVE không thể revert trong N3 (terminal)', () => {
    for (const target of ['CONFIRMED', 'SELECTED', 'FAILED', 'CANCELLED'] as const) {
      const r = canTransition('EFFECTIVE', target, 'CLIENT_MANAGED');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('EFFECTIVE_TERMINAL');
    }
  });

  it('FAILED không thể revert về SELECTED/CONFIRMED', () => {
    for (const target of ['SELECTED', 'CONFIRMED', 'EFFECTIVE'] as const) {
      const r = canTransition('FAILED', target, 'CLIENT_MANAGED');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('TERMINAL_STATE');
    }
  });

  it('CANCELLED không thể revert về SELECTED/CONFIRMED', () => {
    for (const target of ['SELECTED', 'CONFIRMED', 'EFFECTIVE'] as const) {
      const r = canTransition('CANCELLED', target, 'CLIENT_MANAGED');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('TERMINAL_STATE');
    }
  });

  it('SELECTED → EFFECTIVE bị REJECT (chỉ CONFIRMED mới được EFFECTIVE)', () => {
    const r = canTransition('SELECTED', 'EFFECTIVE', 'CLIENT_MANAGED');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('INVALID_TRANSITION');
  });

  it('HRP-managed SELECTED → EFFECTIVE cũng REJECT (DEC-07)', () => {
    const r = canTransition('SELECTED', 'EFFECTIVE', 'HRP_MANAGED');
    expect(r.ok).toBe(false);
    // First reason: HRP_EFFECTIVE_FORBIDDEN (DEC-07 explicit guard)
    if (!r.ok) expect(r.reason).toBe('HRP_EFFECTIVE_FORBIDDEN');
  });
});

describe('placement.lifecycle — isActive / isTerminal', () => {
  it('isActivePlacement: SELECTED & CONFIRMED là active', () => {
    expect(isActivePlacement('SELECTED')).toBe(true);
    expect(isActivePlacement('CONFIRMED')).toBe(true);
    expect(isActivePlacement('EFFECTIVE')).toBe(false);
    expect(isActivePlacement('FAILED')).toBe(false);
    expect(isActivePlacement('CANCELLED')).toBe(false);
  });

  it('isTerminalPlacement: EFFECTIVE, FAILED, CANCELLED là terminal', () => {
    expect(isTerminalPlacement('EFFECTIVE')).toBe(true);
    expect(isTerminalPlacement('FAILED')).toBe(true);
    expect(isTerminalPlacement('CANCELLED')).toBe(true);
    expect(isTerminalPlacement('SELECTED')).toBe(false);
    expect(isTerminalPlacement('CONFIRMED')).toBe(false);
  });
});

describe('placement.lifecycle — allowedTransitions', () => {
  it('SELECTED HRP → [CONFIRMED, FAILED, CANCELLED, SELECTED]', () => {
    expect(allowedTransitions('SELECTED', 'HRP_MANAGED').sort()).toEqual(
      ['CANCELLED', 'CONFIRMED', 'FAILED', 'SELECTED'].sort(),
    );
  });

  it('SELECTED CLIENT → [CONFIRMED, FAILED, CANCELLED, SELECTED] (EFFECTIVE không từ SELECTED)', () => {
    expect(allowedTransitions('SELECTED', 'CLIENT_MANAGED').sort()).toEqual(
      ['CANCELLED', 'CONFIRMED', 'FAILED', 'SELECTED'].sort(),
    );
  });

  it('CONFIRMED CLIENT → [EFFECTIVE, FAILED, CANCELLED, CONFIRMED]', () => {
    expect(allowedTransitions('CONFIRMED', 'CLIENT_MANAGED').sort()).toEqual(
      ['CANCELLED', 'CONFIRMED', 'EFFECTIVE', 'FAILED'].sort(),
    );
  });

  it('CONFIRMED HRP → [FAILED, CANCELLED, CONFIRMED] (KHÔNG có EFFECTIVE)', () => {
    expect(allowedTransitions('CONFIRMED', 'HRP_MANAGED').sort()).toEqual(
      ['CANCELLED', 'CONFIRMED', 'FAILED'].sort(),
    );
  });

  it('EFFECTIVE → [EFFECTIVE] (chỉ same-state idempotent)', () => {
    expect(allowedTransitions('EFFECTIVE', 'CLIENT_MANAGED')).toEqual(['EFFECTIVE']);
  });
});
