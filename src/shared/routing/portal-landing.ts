/**
 * portal-landing.ts — V5-GO-LIVE-01 single canonical origin (RQ-01/07/08, DEC-01/02/05/06).
 *
 * Pure, dependency-free source of truth shared by the login route, the login form,
 * the middleware legacy-redirect branch and their tests. NO server-only / database /
 * secret imports — safe to import from client, edge (middleware) and node code alike.
 *
 * Responsibilities:
 *  - getLandingPath(role): the SAME-ORIGIN relative landing path for a portal role,
 *    or null for internal roles (caller falls back to a validated callback / '/bcc').
 *  - isSafeCallbackPath / sanitizeCallbackPath: open-redirect guard (DEC-06) — the
 *    ONLY accepted target is a same-origin path beginning with exactly one '/'.
 *  - isLegacyPortalHost / buildLegacyCanonicalUrl: the ONLY place the three legacy
 *    hostnames may appear, and only as a fixed transition-redirect allowlist (RQ-08).
 *    The redirect target ORIGIN is a hard-coded constant — incoming host/scheme is
 *    never reflected, so a spoofed Host can never become a redirect target (DEC-05).
 */

/** DEC-01: the single canonical production origin. All redirects target this constant. */
export const CANONICAL_ORIGIN = 'https://hrpartner.vn';
export const CANONICAL_HOST = 'hrpartner.vn';

/** DEC-02: portal role → same-origin landing path. Only the 4 portal roles have one. */
export const ROLE_LANDING_PATH: Readonly<Record<string, string>> = {
  VENDOR_ADMIN: '/vendor',
  VENDOR_STAFF: '/vendor',
  WORKER: '/worker',
  CTV: '/ctv',
};

/** Internal roles have no portal landing; the client falls back here when redirectTo is null. */
export const INTERNAL_FALLBACK_PATH = '/bcc';

/**
 * Landing path for a role after login, or null for internal roles (which fall back to
 * a validated callback or INTERNAL_FALLBACK_PATH at the call site). NEVER returns an
 * absolute URL — single-origin, relative-only (RQ-01/DEC-02).
 */
export function getLandingPath(role: string): string | null {
  return ROLE_LANDING_PATH[role] ?? null;
}

/**
 * DEC-06 open-redirect guard. A callback/redirect target is safe ONLY if it is a
 * same-origin relative path beginning with exactly one '/'. Rejects: non-strings,
 * empty, '//x' (protocol-relative), any backslash ('/\x' → '/' in browsers),
 * scheme URLs ('https:…', 'javascript:…' — they do not start with '/'), and any
 * ASCII control char (incl. CR/LF/TAB → header/redirect injection).
 */
export function isSafeCallbackPath(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  if (raw.length === 0 || raw.charCodeAt(0) !== 47 /* '/' */) return false; // must be root-relative
  if (raw.charCodeAt(1) === 47 /* '/' */) return false;                     // protocol-relative //host
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c <= 0x1f || c === 0x7f) return false; // ASCII control incl. CR / LF / TAB
    if (c === 92 /* '\' */) return false;      // backslash → '/' in browsers
  }
  return true;
}

/** Return the path if safe (DEC-06), else null. */
export function sanitizeCallbackPath(raw: unknown): string | null {
  return isSafeCallbackPath(raw) ? raw : null;
}

/**
 * RQ-08 allowlist: the exact three legacy portal hosts and their canonical root
 * landing path. This is the ONLY module allowed to carry these literals, and only
 * as a transition redirect source (they resolve to CANONICAL_ORIGIN, never to a
 * live subdomain).
 */
export const LEGACY_PORTAL_HOSTS: Readonly<Record<string, string>> = {
  'vendor.hrpartner.vn': '/vendor',
  'worker.hrpartner.vn': '/worker',
  'ctv.hrpartner.vn': '/ctv',
};

/** DEC-05: true ONLY for an exact allowlisted legacy host (caller must case-normalize). */
export function isLegacyPortalHost(host: string): boolean {
  return Object.prototype.hasOwnProperty.call(LEGACY_PORTAL_HOSTS, host);
}

/**
 * Build the canonical https://hrpartner.vn target for a request that arrived on a
 * legacy host (caller MUST have checked isLegacyPortalHost first):
 *  - bare root ('' or '/') → the host's landing path (query dropped)
 *  - any other path        → same pathname + query on the canonical origin (preserved)
 * The origin is the fixed CANONICAL_ORIGIN constant — the incoming host/scheme is
 * NEVER reflected (DEC-05), so the result is always same-origin.
 */
export function buildLegacyCanonicalUrl(host: string, pathname: string, search = ''): string {
  const landing = LEGACY_PORTAL_HOSTS[host] ?? '/';
  const isRoot = pathname === '' || pathname === '/';
  const path = isRoot ? landing : pathname;
  const query = isRoot ? '' : search;
  return `${CANONICAL_ORIGIN}${path}${query}`;
}

/** Portal path prefixes on the canonical origin (for tests / optional guards). */
export function isPortalPath(pathname: string): boolean {
  return (
    pathname === '/vendor' || pathname.startsWith('/vendor/') ||
    pathname === '/worker' || pathname.startsWith('/worker/') ||
    pathname === '/ctv' || pathname.startsWith('/ctv/')
  );
}
