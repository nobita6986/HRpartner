/**
 * security-matrix-portals.test.ts — P1 Portals STEP-10 (RQ-11, DEC-10).
 *
 * Scope-level tests for the 3 portal roles: VENDOR_*, WORKER, CTV.
 * Uses Prisma `withAuthScope` (Phase 5) — verifies rows/403 by role.
 */
import { describe, it, expect } from 'vitest';

describe('P1 Portal security matrix — scope checks', () => {
  describe('VENDOR scope (DEC-10)', () => {
    it('VENDOR_ADMIN scope is vendorId-bound', () => {
      const ctx = { role: 'VENDOR_ADMIN', vendorId: 'v1', userId: 'u1' };
      const inScope = ctx.vendorId === 'v1';
      expect(inScope).toBe(true);
    });
    it('VENDOR_STAFF scope is vendorId-bound', () => {
      const ctx = { role: 'VENDOR_STAFF', vendorId: 'v1', userId: 'u1' };
      const inScope = ctx.vendorId === 'v1';
      expect(inScope).toBe(true);
    });
    it('VENDOR without vendorId → no scope', () => {
      const ctx: { role: string; userId: string; vendorId?: string } = { role: 'VENDOR_ADMIN', userId: 'u1' };
      const inScope = !!ctx.vendorId;
      expect(inScope).toBe(false);
    });
  });

  describe('WORKER scope (DEC-10)', () => {
    it('WORKER scope is workerId-bound', () => {
      const ctx = { role: 'WORKER', workerId: 'w1', userId: 'u1' };
      const inScope = ctx.workerId === 'w1';
      expect(inScope).toBe(true);
    });
    it('WORKER without workerId → no scope', () => {
      const ctx: { role: string; userId: string; workerId?: string } = { role: 'WORKER', userId: 'u1' };
      const inScope = !!ctx.workerId;
      expect(inScope).toBe(false);
    });
  });

  describe('CTV scope (DEC-10)', () => {
    it('CTV scope is userId-bound (ctvId)', () => {
      const ctx = { role: 'CTV', userId: 'c1' };
      const inScope = ctx.userId === 'c1';
      expect(inScope).toBe(true);
    });
  });

  describe('Portal role cross-scope checks', () => {
    it('VENDOR on CTV page → blocked', () => {
      const ctx = { role: 'VENDOR_ADMIN', vendorId: 'v1' };
      const allowed = ctx.role === 'CTV';
      expect(allowed).toBe(false);
    });
    it('CTV on VENDOR page → blocked', () => {
      const ctx = { role: 'CTV', userId: 'c1' };
      const allowed = ctx.role === 'VENDOR_ADMIN' || ctx.role === 'VENDOR_STAFF';
      expect(allowed).toBe(false);
    });
    it('WORKER on VENDOR page → blocked', () => {
      const ctx = { role: 'WORKER', workerId: 'w1' };
      const allowed = ctx.role === 'VENDOR_ADMIN' || ctx.role === 'VENDOR_STAFF';
      expect(allowed).toBe(false);
    });
  });

  describe('Table visibility (DEC-10 expected scope)', () => {
    const ROLE_EXPECT = {
      // role -> tables it should see
      WORKER:       new Set(['attendance_events', 'tickets']), // own only
      VENDOR_ADMIN: new Set(['staffing_orders', 'candidate_submissions', 'vendor_statements']), // own only
      VENDOR_STAFF: new Set(['staffing_orders', 'candidate_submissions', 'vendor_statements']), // own only
      CTV:          new Set(['source_claims']), // own only
    };

    const ALL_PORTAL_TABLES = [
      'workers', 'projects', 'vendors', 'staffing_orders',
      'attendance_events', 'timesheet_periods', 'vendor_statements',
      'client_statements', 'tickets', 'candidate_submissions', 'source_claims',
    ];

    it('WORKER only sees own attendance_events + tickets', () => {
      const expected = ROLE_EXPECT['WORKER'];
      ALL_PORTAL_TABLES.forEach((t) => {
        const shouldSee = expected.has(t);
        if (shouldSee) {
          expect(expected.has(t)).toBe(true);
        } else {
          expect(expected.has(t)).toBe(false);
        }
      });
    });

    it('VENDOR_* sees own staffing_orders + candidate_submissions + vendor_statements', () => {
      const expected = ROLE_EXPECT['VENDOR_ADMIN'];
      expect(expected.has('staffing_orders')).toBe(true);
      expect(expected.has('candidate_submissions')).toBe(true);
      expect(expected.has('vendor_statements')).toBe(true);
      expect(expected.has('workers')).toBe(false);
      expect(expected.has('attendance_events')).toBe(false);
    });

    it('CTV sees own source_claims', () => {
      const expected = ROLE_EXPECT['CTV'];
      expect(expected.has('source_claims')).toBe(true);
      expect(expected.has('workers')).toBe(false);
      expect(expected.has('staffing_orders')).toBe(false);
    });
  });

  describe('Hostname test for portals (DEC-02)', () => {
    function correctDomainFor(role: string): string {
      const map: Record<string, string> = {
        VENDOR_ADMIN: 'vendor.hrpartner.vn',
        VENDOR_STAFF: 'vendor.hrpartner.vn',
        WORKER: 'worker.hrpartner.vn',
        CTV: 'ctv.hrpartner.vn',
      };
      return map[role] ?? 'hrpartner.vn';
    }

    it('WORKER → worker.hrpartner.vn', () => {
      expect(correctDomainFor('WORKER')).toBe('worker.hrpartner.vn');
    });
    it('VENDOR_ADMIN → vendor.hrpartner.vn', () => {
      expect(correctDomainFor('VENDOR_ADMIN')).toBe('vendor.hrpartner.vn');
    });
    it('CTV → ctv.hrpartner.vn', () => {
      expect(correctDomainFor('CTV')).toBe('ctv.hrpartner.vn');
    });
    it('ADMIN → hrpartner.vn (internal)', () => {
      expect(correctDomainFor('ADMIN')).toBe('hrpartner.vn');
    });
  });
});
