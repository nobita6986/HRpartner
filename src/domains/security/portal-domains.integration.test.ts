/**
 * portal-domains.integration.test.ts — V5-GO-LIVE-01 STEP-05 (RQ-01/07/08, DEC-01/02/05/06).
 *
 * REWRITTEN for the single canonical origin. The former version copied the portal→subdomain
 * mapping locally and asserted subdomains (EV-08 anti-pattern: a test that re-declares the
 * logic it claims to verify). This version imports and exercises the REAL source-of-truth
 * helper (src/shared/routing/portal-landing) so the test fails if the shipped logic drifts.
 *
 *  - getLandingPath: portal roles → same-origin relative path; internal roles → null.
 *  - isSafeCallbackPath / sanitizeCallbackPath: open-redirect hostile matrix (DEC-06).
 *  - isLegacyPortalHost / buildLegacyCanonicalUrl: transition-redirect allowlist (RQ-08).
 *  - isPortalPath: canonical-origin portal prefixes.
 */
import { describe, it, expect } from 'vitest';
import {
  CANONICAL_ORIGIN,
  ROLE_LANDING_PATH,
  LEGACY_PORTAL_HOSTS,
  getLandingPath,
  isSafeCallbackPath,
  sanitizeCallbackPath,
  isLegacyPortalHost,
  buildLegacyCanonicalUrl,
  isPortalPath,
} from '@/src/shared/routing/portal-landing';

// Explicit post-login landings. ADMIN owns the root management console.
const PORTAL_ROLES: Array<[string, string]> = [
  ['ADMIN', '/admin'],
  ['VENDOR_ADMIN', '/vendor'],
  ['VENDOR_STAFF', '/vendor'],
  ['WORKER', '/worker'],
  ['CTV', '/ctv'],
];
const INTERNAL_ROLES = [
  'HR_MANAGER', 'DIRECTOR', 'HR_STAFF', 'SALE', 'PM', 'ACCOUNTANT', 'MKT', 'EMPLOYEE',
];

describe('V5-GO-LIVE-01 — portal landing (single canonical origin)', () => {
  describe('getLandingPath — role → same-origin relative path (RQ-01/DEC-02)', () => {
    it.each(PORTAL_ROLES)('%s → %s (relative, not absolute)', (role, path) => {
      const landing = getLandingPath(role);
      expect(landing).toBe(path);
      expect(landing!.startsWith('/')).toBe(true);
      expect(landing!.startsWith('//')).toBe(false);
      expect(landing).not.toMatch(/^https?:/); // never an absolute subdomain URL
    });

    it.each(INTERNAL_ROLES)('internal role %s → null (no portal landing)', (role) => {
      expect(getLandingPath(role)).toBeNull();
    });

    it('unknown role → null', () => {
      expect(getLandingPath('NOPE')).toBeNull();
      expect(getLandingPath('')).toBeNull();
    });

    it('ROLE_LANDING_PATH carries NO absolute subdomain URLs', () => {
      for (const v of Object.values(ROLE_LANDING_PATH)) {
        expect(v.startsWith('/')).toBe(true);
        expect(v).not.toMatch(/hrpartner\.vn/);
      }
    });
  });

  describe('isSafeCallbackPath / sanitizeCallbackPath — open-redirect guard (DEC-06)', () => {
    const SAFE = ['/bcc', '/vendor', '/worker/checkin', '/ctv/claims?tab=active', '/a/b/c?x=1&y=2'];
    const HOSTILE = [
      '//evil.com',                 // protocol-relative
      '///evil.com',                // triple slash
      'https://evil.com',           // absolute scheme URL
      'http://hrpartner.vn.evil',   // absolute scheme URL
      'javascript:alert(1)',        // scheme, no leading slash
      '/\\evil.com',                // backslash after slash → '/' in browsers
      '\\\\evil.com',               // leading backslashes
      'vendor',                     // no leading slash
      '',                           // empty
      '/bad\r\nSet-Cookie: x=y',    // CR/LF injection
      '/bad\tpath',                 // TAB control char
    ];

    it.each(SAFE)('safe: %s', (p) => {
      expect(isSafeCallbackPath(p)).toBe(true);
      expect(sanitizeCallbackPath(p)).toBe(p);
    });

    it.each(HOSTILE)('hostile rejected: %j', (p) => {
      expect(isSafeCallbackPath(p)).toBe(false);
      expect(sanitizeCallbackPath(p)).toBeNull();
    });

    it('non-string input rejected', () => {
      for (const v of [null, undefined, 123, {}, [], true]) {
        expect(isSafeCallbackPath(v)).toBe(false);
        expect(sanitizeCallbackPath(v)).toBeNull();
      }
    });
  });

  describe('isLegacyPortalHost — strict allowlist only (DEC-05)', () => {
    it.each(Object.keys(LEGACY_PORTAL_HOSTS))('legacy host allowlisted: %s', (h) => {
      expect(isLegacyPortalHost(h)).toBe(true);
    });

    it.each([
      'hrpartner.vn',              // canonical is NOT legacy (no loop)
      'localhost',
      'evil.com',
      'vendor.hrpartner.com',      // look-alike TLD
      'vendor.hrpartner.vn.evil',  // suffix attack
      'sub.vendor.hrpartner.vn',   // deeper subdomain not allowlisted
      'VENDOR.HRPARTNER.VN',       // caller must lower-case; raw mixed-case is not a member
      '',
    ])('non-legacy host rejected: %s', (h) => {
      expect(isLegacyPortalHost(h)).toBe(false);
    });
  });

  describe('buildLegacyCanonicalUrl — canonical target, host never reflected (RQ-03/04)', () => {
    it('bare root → host landing path on canonical origin (query dropped)', () => {
      expect(buildLegacyCanonicalUrl('vendor.hrpartner.vn', '/', '')).toBe(`${CANONICAL_ORIGIN}/vendor`);
      expect(buildLegacyCanonicalUrl('worker.hrpartner.vn', '', '')).toBe(`${CANONICAL_ORIGIN}/worker`);
      expect(buildLegacyCanonicalUrl('ctv.hrpartner.vn', '/', '?x=1')).toBe(`${CANONICAL_ORIGIN}/ctv`);
    });

    it('non-root → preserves pathname + query on canonical origin', () => {
      expect(buildLegacyCanonicalUrl('vendor.hrpartner.vn', '/vendor/orders', '?tab=active'))
        .toBe(`${CANONICAL_ORIGIN}/vendor/orders?tab=active`);
      expect(buildLegacyCanonicalUrl('worker.hrpartner.vn', '/worker/checkin', ''))
        .toBe(`${CANONICAL_ORIGIN}/worker/checkin`);
      // Even a cross-portal path is preserved verbatim (path is not host-derived).
      expect(buildLegacyCanonicalUrl('ctv.hrpartner.vn', '/vendor/x', ''))
        .toBe(`${CANONICAL_ORIGIN}/vendor/x`);
    });

    it('result is ALWAYS the canonical origin — incoming host is never reflected', () => {
      for (const host of Object.keys(LEGACY_PORTAL_HOSTS)) {
        expect(buildLegacyCanonicalUrl(host, '/x', '').startsWith(`${CANONICAL_ORIGIN}/`)).toBe(true);
        expect(new URL(buildLegacyCanonicalUrl(host, '/x', '')).origin).toBe(CANONICAL_ORIGIN);
      }
    });
  });

  describe('isPortalPath — canonical-origin portal prefixes', () => {
    it('portal paths → true', () => {
      ['/vendor', '/vendor/orders', '/worker', '/worker/checkin', '/ctv', '/ctv/claims']
        .forEach((p) => expect(isPortalPath(p)).toBe(true));
    });
    it('non-portal paths → false', () => {
      ['/', '/bcc', '/bcc/internal', '/login', '/job-board', '/vendorx', '/workerish']
        .forEach((p) => expect(isPortalPath(p)).toBe(false));
    });
  });

  describe('no legacy subdomain literal is used as a live routing target', () => {
    it('LEGACY_PORTAL_HOSTS values are relative landing paths, not URLs', () => {
      for (const v of Object.values(LEGACY_PORTAL_HOSTS)) {
        expect(v.startsWith('/')).toBe(true);
        expect(v).not.toMatch(/^https?:/);
      }
    });
  });
});
