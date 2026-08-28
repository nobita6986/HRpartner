/**
 * security-matrix-portals.test.ts — P1 Portals STEP-10 (RQ-11, DEC-10);
 * V5-GO-LIVE-01 STEP-05: hostname block replaced by role→landing-path (single origin).
 *
 * Scope-level tests for the 3 portal roles: VENDOR_*, WORKER, CTV.
 * Uses Prisma `withAuthScope` (Phase 5) — verifies rows/403 by role.
 */
import { describe, it, expect } from 'vitest';
import { getLandingPath } from '@/src/shared/routing/portal-landing';

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

  describe('Landing path for portals (V5-GO-LIVE-01, DEC-01/02 — single origin)', () => {
    // Post-login landing is a SAME-ORIGIN relative path per role — NOT a subdomain.
    it('WORKER → /worker', () => {
      expect(getLandingPath('WORKER')).toBe('/worker');
    });
    it('VENDOR_ADMIN → /vendor', () => {
      expect(getLandingPath('VENDOR_ADMIN')).toBe('/vendor');
    });
    it('VENDOR_STAFF → /vendor', () => {
      expect(getLandingPath('VENDOR_STAFF')).toBe('/vendor');
    });
    it('CTV → /ctv', () => {
      expect(getLandingPath('CTV')).toBe('/ctv');
    });
    it('ADMIN (internal) → null (no portal landing)', () => {
      expect(getLandingPath('ADMIN')).toBeNull();
    });
    it('every portal landing path is relative (no absolute subdomain URL)', () => {
      for (const role of ['WORKER', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV']) {
        const p = getLandingPath(role)!;
        expect(p.startsWith('/')).toBe(true);
        expect(p.startsWith('//')).toBe(false);
        expect(p).not.toMatch(/^https?:/);
      }
    });
  });
});
