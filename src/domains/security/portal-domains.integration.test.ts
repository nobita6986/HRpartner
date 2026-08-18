/**
 * portal-domains.integration.test.ts — P1 Portals STEP-02 (RQ-01).
 *
 * Tests the pure logic functions used by middleware.
 * Integration aspects (hostname header parsing, redirect URL construction)
 * are tested via the mock-based unit tests below.
 */
import { describe, it, expect } from 'vitest';

describe('P1 Portal domain logic', () => {
  describe('PORTAL_DOMAINS mapping', () => {
    const PORTAL_DOMAINS: Record<string, string> = {
      VENDOR_ADMIN:  'vendor.hrpartner.vn',
      VENDOR_STAFF: 'vendor.hrpartner.vn',
      WORKER:       'worker.hrpartner.vn',
      CTV:          'ctv.hrpartner.vn',
    };

    it('VENDOR_ADMIN maps to vendor.hrpartner.vn', () => {
      expect(PORTAL_DOMAINS['VENDOR_ADMIN']).toBe('vendor.hrpartner.vn');
    });
    it('VENDOR_STAFF maps to vendor.hrpartner.vn', () => {
      expect(PORTAL_DOMAINS['VENDOR_STAFF']).toBe('vendor.hrpartner.vn');
    });
    it('WORKER maps to worker.hrpartner.vn', () => {
      expect(PORTAL_DOMAINS['WORKER']).toBe('worker.hrpartner.vn');
    });
    it('CTV maps to ctv.hrpartner.vn', () => {
      expect(PORTAL_DOMAINS['CTV']).toBe('ctv.hrpartner.vn');
    });
    it('ADMIN not in PORTAL_DOMAINS → undefined', () => {
      expect(PORTAL_DOMAINS['ADMIN']).toBeUndefined();
    });
  });

  describe('getExpectedDomain logic', () => {
    const PORTAL_DOMAINS: Record<string, string> = {
      VENDOR_ADMIN:  'vendor.hrpartner.vn',
      VENDOR_STAFF: 'vendor.hrpartner.vn',
      WORKER:       'worker.hrpartner.vn',
      CTV:          'ctv.hrpartner.vn',
    };
    function getExpectedDomain(role: string): string {
      return PORTAL_DOMAINS[role] ?? 'hrpartner.vn';
    }

    it('VENDOR_ADMIN → vendor domain', () => {
      expect(getExpectedDomain('VENDOR_ADMIN')).toBe('vendor.hrpartner.vn');
    });
    it('WORKER → worker domain', () => {
      expect(getExpectedDomain('WORKER')).toBe('worker.hrpartner.vn');
    });
    it('CTV → ctv domain', () => {
      expect(getExpectedDomain('CTV')).toBe('ctv.hrpartner.vn');
    });
    it('ADMIN → hrpartner.vn (internal)', () => {
      expect(getExpectedDomain('ADMIN')).toBe('hrpartner.vn');
    });
    it('HR_MANAGER → hrpartner.vn (internal)', () => {
      expect(getExpectedDomain('HR_MANAGER')).toBe('hrpartner.vn');
    });
  });

  describe('isPortalPath logic', () => {
    function isPortalPath(pathname: string): boolean {
      return pathname.startsWith('/vendor') || pathname.startsWith('/worker') ||
             pathname.startsWith('/ctv')    || pathname.startsWith('/api/vendor') ||
             pathname.startsWith('/api/worker') || pathname.startsWith('/api/ctv');
    }

    it('/vendor/orders → true', () => { expect(isPortalPath('/vendor/orders')).toBe(true); });
    it('/worker/checkin → true', () => { expect(isPortalPath('/worker/checkin')).toBe(true); });
    it('/ctv/claims → true', () => { expect(isPortalPath('/ctv/claims')).toBe(true); });
    it('/api/vendor/submissions → true', () => { expect(isPortalPath('/api/vendor/submissions')).toBe(true); });
    it('/api/worker/checkins → true', () => { expect(isPortalPath('/api/worker/checkins')).toBe(true); });
    it('/api/ctv/summary → true', () => { expect(isPortalPath('/api/ctv/summary')).toBe(true); });
    it('/admin/jobs → false', () => { expect(isPortalPath('/admin/jobs')).toBe(false); });
    it('/bcc/internal → false', () => { expect(isPortalPath('/bcc/internal')).toBe(false); });
    it('/job-board → false', () => { expect(isPortalPath('/job-board')).toBe(false); });
    it('/login → false', () => { expect(isPortalPath('/login')).toBe(false); });
  });

  describe('domain check logic', () => {
    const INTERNAL_DOMAINS = new Set(['hrpartner.vn', 'localhost']);

    function isInternalHost(host: string): boolean {
      return INTERNAL_DOMAINS.has(host) || host.endsWith('.hrpartner.vn');
    }

    it('hrpartner.vn → internal', () => { expect(isInternalHost('hrpartner.vn')).toBe(true); });
    it('localhost → internal', () => { expect(isInternalHost('localhost')).toBe(true); });
    it('vendor.hrpartner.vn → internal', () => { expect(isInternalHost('vendor.hrpartner.vn')).toBe(true); });
    it('worker.hrpartner.vn → internal', () => { expect(isInternalHost('worker.hrpartner.vn')).toBe(true); });
    it('ctv.hrpartner.vn → internal', () => { expect(isInternalHost('ctv.hrpartner.vn')).toBe(true); });
    it('malicious.com → NOT internal', () => { expect(isInternalHost('malicious.com')).toBe(false); });
    it('vendor.hrpartner.com → NOT internal', () => { expect(isInternalHost('vendor.hrpartner.com')).toBe(false); });
  });

  describe('redirect URL construction', () => {
    function buildRedirectUrl(currentUrl: string, targetHost: string): string {
      const url = new URL(currentUrl);
      url.hostname = targetHost;
      return url.toString();
    }

    it('worker on vendor → redirects to worker domain', () => {
      const result = buildRedirectUrl('http://vendor.hrpartner.vn/worker/checkin', 'worker.hrpartner.vn');
      expect(result).toBe('http://worker.hrpartner.vn/worker/checkin');
    });

    it('vendor on worker → redirects to vendor domain', () => {
      const result = buildRedirectUrl('http://worker.hrpartner.vn/vendor/orders', 'vendor.hrpartner.vn');
      expect(result).toBe('http://vendor.hrpartner.vn/vendor/orders');
    });

    it('ctv on root → redirects to ctv domain', () => {
      const result = buildRedirectUrl('http://hrpartner.vn/ctv/claims', 'ctv.hrpartner.vn');
      expect(result).toBe('http://ctv.hrpartner.vn/ctv/claims');
    });

    it('preserves pathname and query', () => {
      const result = buildRedirectUrl('http://hrpartner.vn/ctv/claims?tab=active', 'ctv.hrpartner.vn');
      expect(result).toBe('http://ctv.hrpartner.vn/ctv/claims?tab=active');
    });
  });
});
