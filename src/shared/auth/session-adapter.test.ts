/**
 * session-adapter test — Phase 1 identity-core (RQ-07, DEC-08).
 */
import { describe, it, expect } from 'vitest';
import { toTicketActorRole, toSessionUser, isTicketActorRole } from './session-adapter';
import { AuthError } from './require-permission';

describe('toTicketActorRole (DEC-08 ánh xạ 13→6)', () => {
  it.each([
    ['WORKER', 'WORKER'],
    ['HR_STAFF', 'HR_STAFF'],
    ['HR_MANAGER', 'HR_MANAGER'],
    ['ACCOUNTANT', 'ACCOUNTANT'],
    ['PM', 'PM'],
    ['ADMIN', 'ADMIN'],
  ])('SystemRole %s → TicketActorRole %s', (input, expected) => {
    expect(toTicketActorRole(input as any)).toBe(expected);
  });

  it.each(['DIRECTOR', 'SALE', 'MKT', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'EMPLOYEE'])(
    'SystemRole %s → throw AuthError PERMISSION_DENIED (deny-by-default)',
    (role) => {
      expect(() => toTicketActorRole(role as any)).toThrow(AuthError);
      expect(() => toTicketActorRole(role as any)).toThrow(/ngoài 6 TicketActorRole/);
    },
  );
});

describe('toSessionUser', () => {
  it('HR_MANAGER → SessionUser có id/role đúng', () => {
    const s = toSessionUser({ userId: 'u-1', role: 'HR_MANAGER' });
    expect(s.id).toBe('u-1');
    expect(s.role).toBe('HR_MANAGER');
  });

  it('HR_MANAGER + ip + ua → SessionUser có ipAddress/userAgent', () => {
    const s = toSessionUser(
      { userId: 'u-1', role: 'HR_MANAGER' },
      { ipAddress: '10.0.0.1', userAgent: 'test/1' },
    );
    expect(s.ipAddress).toBe('10.0.0.1');
    expect(s.userAgent).toBe('test/1');
  });

  it('DIRECTOR → throw (deny-by-default)', () => {
    expect(() => toSessionUser({ userId: 'd-1', role: 'DIRECTOR' })).toThrow(AuthError);
  });

  it('SESSION_USER Service shape — id/role/name?/ipAddress?/userAgent?', () => {
    const s = toSessionUser({ userId: 'a-1', role: 'ADMIN' });
    expect(Object.keys(s).sort()).toEqual(['id', 'role']);
  });
});

describe('isTicketActorRole', () => {
  it.each(['WORKER', 'HR_STAFF', 'HR_MANAGER', 'ACCOUNTANT', 'PM', 'ADMIN'])('%s → true', (r) => {
    expect(isTicketActorRole(r)).toBe(true);
  });
  it.each(['DIRECTOR', 'SALE', 'MKT', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'EMPLOYEE'])('%s → false', (r) => {
    expect(isTicketActorRole(r)).toBe(false);
  });
});
