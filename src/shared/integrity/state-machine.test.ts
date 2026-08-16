/**
 * State machine helper tests (Phase 3 / AC-04).
 *
 * Cover (theo TASK §6 RQ-04):
 *   1. Transition hợp lệ: PENDING + APPROVE_HR + HR_STAFF → HR_APPROVED.
 *   2. Transition sai (PENDING + PAY) → IllegalTransitionError NO_SUCH_TRANSITION.
 *   3. Role không thuộc allowedRoles → IllegalTransitionError ROLE_NOT_ALLOWED.
 *   4. ticketTypes mismatch (APPROVE_FINAL cho OTHER) → TYPE_NOT_ALLOWED.
 *   5. canTransition trả về true/false không throw.
 *   6. allowedActions lọc theo role.
 */

import { describe, it, expect } from 'vitest';
import {
  guardTransition,
  canTransition,
  allowedActions,
  IllegalTransitionError,
  type TransitionMap,
} from './state-machine';

type Status = 'PENDING' | 'HR_APPROVED' | 'APPROVED' | 'PAID' | 'CLOSED' | 'REJECTED' | 'CANCELLED';
type Action = 'APPROVE_HR' | 'APPROVE_FINAL' | 'REJECT' | 'CANCEL' | 'PAY' | 'CLOSE';
type Role = 'WORKER' | 'HR_STAFF' | 'HR_MANAGER' | 'ACCOUNTANT' | 'ADMIN';
type TicketType = 'TIMESHEET_DISPUTE' | 'LEAVE_REQUEST' | 'ADVANCE_SALARY' | 'OTHER';

const map: TransitionMap<Status, Action, Role> = {
  PENDING: {
    APPROVE_HR: {
      to: 'HR_APPROVED',
      allowedRoles: ['HR_STAFF', 'HR_MANAGER', 'ADMIN'],
    },
    APPROVE_FINAL: {
      to: 'APPROVED',
      allowedRoles: ['HR_MANAGER', 'ADMIN'],
      ticketTypes: ['TIMESHEET_DISPUTE', 'LEAVE_REQUEST'],
    },
    REJECT: { to: 'REJECTED', allowedRoles: ['HR_STAFF', 'HR_MANAGER', 'ADMIN'] },
    CANCEL: { to: 'CANCELLED', allowedRoles: ['WORKER'] },
  },
  HR_APPROVED: {
    APPROVE_FINAL: { to: 'APPROVED', allowedRoles: ['ACCOUNTANT', 'HR_MANAGER', 'ADMIN'] },
    REJECT: { to: 'REJECTED', allowedRoles: ['ACCOUNTANT', 'HR_MANAGER', 'ADMIN'] },
    CANCEL: { to: 'CANCELLED', allowedRoles: ['WORKER'] },
  },
  APPROVED: {
    PAY: { to: 'PAID', allowedRoles: ['ACCOUNTANT', 'ADMIN'], ticketTypes: ['ADVANCE_SALARY'] },
    CLOSE: { to: 'CLOSED', allowedRoles: ['HR_STAFF', 'HR_MANAGER', 'ADMIN', 'WORKER'] },
  },
  PAID: {
    CLOSE: { to: 'CLOSED', allowedRoles: ['HR_STAFF', 'HR_MANAGER', 'ADMIN'] },
  },
  // Terminal
  REJECTED: {},
  CANCELLED: {},
  CLOSED: {},
};

describe('state-machine helper (Phase 3 / AC-04)', () => {
  it('transition hợp lệ trả về to status', () => {
    const to = guardTransition('PENDING', 'APPROVE_HR', map, { actorRole: 'HR_STAFF' });
    expect(to).toBe('HR_APPROVED');
  });

  it('transition sai: PENDING + PAY → NO_SUCH_TRANSITION', () => {
    expect(() => guardTransition('PENDING', 'PAY', map, { actorRole: 'ACCOUNTANT' })).toThrow(
      IllegalTransitionError,
    );
    try {
      guardTransition('PENDING', 'PAY', map, { actorRole: 'ACCOUNTANT' });
    } catch (err) {
      expect((err as IllegalTransitionError).code).toBe('NO_SUCH_TRANSITION');
    }
  });

  it('role không thuộc allowedRoles → ROLE_NOT_ALLOWED', () => {
    expect(() => guardTransition('PENDING', 'APPROVE_HR', map, { actorRole: 'WORKER' })).toThrow(
      IllegalTransitionError,
    );
    try {
      guardTransition('PENDING', 'APPROVE_HR', map, { actorRole: 'WORKER' });
    } catch (err) {
      expect((err as IllegalTransitionError).code).toBe('ROLE_NOT_ALLOWED');
    }
  });

  it('ticketTypes mismatch: APPROVE_FINAL + OTHER → TYPE_NOT_ALLOWED', () => {
    expect(() =>
      guardTransition('PENDING', 'APPROVE_FINAL', map, {
        actorRole: 'HR_MANAGER',
        entityType: 'OTHER',
      }),
    ).toThrow(IllegalTransitionError);
    try {
      guardTransition('PENDING', 'APPROVE_FINAL', map, {
        actorRole: 'HR_MANAGER',
        entityType: 'OTHER',
      });
    } catch (err) {
      expect((err as IllegalTransitionError).code).toBe('TYPE_NOT_ALLOWED');
    }
  });

  it('canTransition trả về boolean, không throw', () => {
    expect(canTransition('PENDING', 'APPROVE_HR', map, { actorRole: 'HR_STAFF' })).toBe(true);
    expect(canTransition('PENDING', 'PAY', map, { actorRole: 'ACCOUNTANT' })).toBe(false);
    expect(canTransition('PENDING', 'APPROVE_HR', map, { actorRole: 'WORKER' })).toBe(false);
  });

  it('allowedActions lọc đúng theo role + type', () => {
    const hrStaff = allowedActions('PENDING', map, { actorRole: 'HR_STAFF' });
    expect(hrStaff).toEqual(expect.arrayContaining(['APPROVE_HR', 'REJECT']));
    expect(hrStaff).not.toContain('APPROVE_FINAL'); // HR_STAFF không có

    const hrManagerOnDispute = allowedActions('PENDING', map, {
      actorRole: 'HR_MANAGER',
      entityType: 'TIMESHEET_DISPUTE',
    });
    expect(hrManagerOnDispute).toEqual(
      expect.arrayContaining(['APPROVE_HR', 'APPROVE_FINAL', 'REJECT']),
    );

    const workerOnPending = allowedActions('PENDING', map, { actorRole: 'WORKER' });
    expect(workerOnPending).toEqual(['CANCEL']);

    const terminal = allowedActions('CLOSED', map, { actorRole: 'ADMIN' });
    expect(terminal).toEqual([]);
  });
});
