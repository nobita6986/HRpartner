import { describe, it, expect } from 'vitest';
import { buildProjectScope } from './project.scope';
import { AuthScopeError } from '../with-auth-scope';
import type { AuthContext } from '../auth-context';

describe('buildProjectScope', () => {
  it('cho phép ADMIN, HR_MANAGER, DIRECTOR, SALE lấy tất cả', () => {
    const roles: AuthContext['role'][] = ['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE'];
    for (const role of roles) {
      expect(buildProjectScope({ userId: 'u1', role })).toEqual({});
    }
  });

  it('PM scope đồng bộ L1 với primary PM và sub-PM 1, 2', () => {
    const ctx: AuthContext = { userId: 'pm-123', role: 'PM' };
    const scope = buildProjectScope(ctx);
    expect(scope).toEqual({
      OR: [
        { pmUserId: 'pm-123' },
        { subPmUserId1: 'pm-123' },
        { subPmUserId2: 'pm-123' },
      ],
    });
  });

  it('WORKER scope dựa trên isPublic và assignment', () => {
    const scope = buildProjectScope({ userId: 'w1', role: 'WORKER' });
    expect(scope).toEqual({
      OR: [
        { isPublic: true },
        {
          assignments: {
            some: {
              status: 'ACTIVE',
              worker: { accountUserId: 'w1' },
            },
          },
        },
      ],
    });
  });

  it('MKT và CTV chỉ lấy isPublic', () => {
    expect(buildProjectScope({ userId: 'mkt1', role: 'MKT' })).toEqual({ isPublic: true });
    expect(buildProjectScope({ userId: 'ctv1', role: 'CTV' })).toEqual({ isPublic: true });
  });

  it('VENDOR staff/admin lấy isPublic và theo vendorId', () => {
    const ctx: AuthContext = { userId: 'v1', role: 'VENDOR_ADMIN', vendorId: 'vendor-123' };
    const scope = buildProjectScope(ctx);
    expect(scope).toEqual({
      OR: [
        { isPublic: true },
        { submissions: { some: { vendorId: 'vendor-123' } } },
      ],
    });
  });

  it('throws AuthScopeError cho VENDOR thiếu vendorId', () => {
    expect(() => buildProjectScope({ userId: 'v1', role: 'VENDOR_STAFF' })).toThrow(AuthScopeError);
  });

  it('trả về {} cho HR_STAFF và ACCOUNTANT nhưng warning phase 2', () => {
    expect(buildProjectScope({ userId: 'h1', role: 'HR_STAFF' })).toEqual({});
    expect(buildProjectScope({ userId: 'a1', role: 'ACCOUNTANT' })).toEqual({});
  });

  it('throws AuthScopeError cho EMPLOYEE', () => {
    expect(() => buildProjectScope({ userId: 'e1', role: 'EMPLOYEE' })).toThrow(AuthScopeError);
  });
});
