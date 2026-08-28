/**
 * single-domain-consolidation.test.ts — V5-GO-LIVE-01 STEP-05
 * (RQ-02/03/04/05/06/07/09/10, DEC-01..07).
 *
 * One suite covering the routing-only consolidation to the single canonical origin:
 *   A) middleware legacy-host → canonical 308 (root→landing, path/query preserved),
 *      spoofed Host/x-forwarded-host is NEVER a redirect target, no redirect loop;
 *   B) regression — unauth 401 (/api) / login-redirect (page), worker
 *      rate-limit header, x-request-id, and an authenticated portal role on the
 *      canonical origin simply continues (proves the role→subdomain redirect is gone);
 *   C) login POST — relative redirectTo per role, host-only cookie (+ legacy deletion
 *      in prod), dev single non-Secure cookie, and unchanged 401 on bad credentials;
 *   D) logout POST — host-only deletion (+ legacy deletion in prod).
 *
 * Tokens are mocked to a placeholder ('fake.jwt.token') — never a real signed token.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockGetAuthUser = vi.hoisted(() => vi.fn<() => Promise<unknown>>());
const mockFindUser = vi.hoisted(() => vi.fn<() => Promise<unknown>>());
const mockVerifyPassword = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
const mockSignJwt = vi.hoisted(() => vi.fn<() => Promise<string>>());
const mockGetPrisma = vi.hoisted(() => vi.fn(() => ({})));

vi.mock('@/src/shared/auth/user', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/shared/auth/user')>();
  return { ...actual, getAuthUser: mockGetAuthUser }; // keep real AUTH_COOKIE_NAME
});
vi.mock('@/src/shared/observability/correlation-id', () => ({
  getCorrelationId: (headers: Headers) => {
    const inbound = headers.get('x-request-id')?.trim();
    return inbound && inbound.length >= 8 ? inbound : 'test-rid-00000001';
  },
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: mockGetPrisma }));
vi.mock('@/src/shared/auth/password', () => ({ verifyPassword: mockVerifyPassword }));
vi.mock('@/src/shared/auth/jwt', () => ({ signJwt: mockSignJwt, JWT_TTL_SECONDS: 28800 }));
vi.mock('@/src/shared/auth/preauth-db', () => ({ findUserForLogin: mockFindUser }));

import { middleware } from '@/middleware';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { NextRequest } from 'next/server';
import { CANONICAL_ORIGIN } from '@/src/shared/routing/portal-landing';
import { AUTH_COOKIE_NAME } from '@/src/shared/auth/user'; // real value via importOriginal spread

// PLACEHOLDER TOKEN — never a real signed JWT.
const FAKE_TOKEN = 'fake.jwt.token';

function req(url: string, headers: Record<string, string> = {}) {
  const u = new URL(url);
  return new NextRequest(u, { headers: new Headers({ host: u.host, ...headers }) });
}

function loginReq(body: unknown) {
  return new NextRequest(new URL('http://localhost/api/auth/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockGetAuthUser.mockReset();
  mockGetAuthUser.mockResolvedValue(null);
  mockFindUser.mockReset();
  mockVerifyPassword.mockReset();
  mockSignJwt.mockReset();
  mockSignJwt.mockResolvedValue(FAKE_TOKEN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ── A) middleware: legacy portal host → canonical 308 (RQ-03/04/08, DEC-04/05) ──
describe('A) legacy portal host → canonical 308', () => {
  it('root of each legacy host → 308 to the host landing path on canonical (query dropped)', async () => {
    const cases: Array<[string, string]> = [
      ['http://vendor.hrpartner.vn/', `${CANONICAL_ORIGIN}/vendor`],
      ['http://worker.hrpartner.vn/', `${CANONICAL_ORIGIN}/worker`],
      ['http://ctv.hrpartner.vn/?x=1', `${CANONICAL_ORIGIN}/ctv`],
    ];
    for (const [url, expected] of cases) {
      const res = await middleware(req(url));
      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe(expected);
      // x-request-id rides the response header (Location stays clean for RQ-04).
      expect(res.headers.get('x-request-id')).toBeTruthy();
    }
  });

  it('non-root legacy path preserves pathname + query on canonical (RQ-04)', async () => {
    const res = await middleware(req('http://vendor.hrpartner.vn/vendor/orders?tab=active'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe(`${CANONICAL_ORIGIN}/vendor/orders?tab=active`);
    // Location is clean — no correlation id leaked into the preserved query (RQ-04).
    expect(res.headers.get('location')).not.toContain('x-request-id');
  });

  it('x-forwarded-host is honored for the allowlist but target origin is ALWAYS canonical', async () => {
    // Even when the legacy host arrives via x-forwarded-host, the redirect target
    // origin is the fixed canonical constant — the incoming host is never reflected.
    const res = await middleware(req('http://internal-lb/whatever', { 'x-forwarded-host': 'worker.hrpartner.vn' }));
    expect(res.status).toBe(308);
    expect(new URL(res.headers.get('location')!).origin).toBe(CANONICAL_ORIGIN);
    expect(res.headers.get('location')).toBe(`${CANONICAL_ORIGIN}/whatever`);
  });

  it('spoofed / unknown host is NEVER a redirect target (DEC-05)', async () => {
    // Suffix attack + look-alike + deeper subdomain: none are allowlisted → fall through,
    // NOT a 308 to canonical.
    for (const host of ['vendor.hrpartner.vn.evil.com', 'vendor.hrpartner.com', 'sub.vendor.hrpartner.vn', 'evil.com']) {
      const res = await middleware(req(`http://${host}/`));
      expect(res.status).not.toBe(308);
      // '/' is not a portal/fence path → continues (200), no canonical Location.
      expect(res.headers.get('location')).toBeNull();
    }
  });

  it('canonical host is NOT legacy → no redirect loop', async () => {
    // Authenticated portal user on the canonical origin: no 308 back to itself.
    mockGetAuthUser.mockResolvedValue({ role: 'VENDOR_ADMIN' });
    const res = await middleware(req('http://hrpartner.vn/vendor/orders'));
    expect(res.status).not.toBe(308);
    expect(res.headers.get('location')).toBeNull();
  });
});
// ── B) regression on the canonical origin (RQ-02/05/07/09; DEC-01/07) ──
describe('B) canonical-origin regression (auth fence unchanged, no role→subdomain redirect)', () => {
  it('unauthenticated /api/vendor → 401 JSON (fail-closed)', async () => {
    const res = await middleware(req('http://localhost/api/vendor/orders'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('UNAUTHORIZED');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('unauthenticated /vendor page → redirect to /login with callback', async () => {
    const res = await middleware(req('http://localhost/vendor/orders'));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/login');
    expect(loc.searchParams.get('callback')).toBe('/vendor/orders');
  });

  it('worker route emits rate-limit headers + x-request-id (both channels)', async () => {
    const res = await middleware(req('http://localhost/worker', { 'x-forwarded-for': '203.0.113.9' }));
    expect(res.headers.get('X-RateLimit-Remaining')).toBeTruthy();
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy();
    expect(res.headers.get('x-request-id')).toBeTruthy();
    // downstream request channel is set too
    expect(res.headers.get('x-middleware-request-x-request-id')).toBeTruthy();
  });

  it('authenticated portal role on canonical origin CONTINUES (role→subdomain redirect removed)', async () => {
    // Previously a VENDOR_ADMIN would have been redirected to vendor.hrpartner.vn.
    // Single-origin: it simply passes through with no Location.
    mockGetAuthUser.mockResolvedValue({ role: 'VENDOR_ADMIN' });
    const res = await middleware(req('http://hrpartner.vn/vendor/orders'));
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(res.headers.get('x-middleware-request-x-request-id')).toBeTruthy();
  });

  it('inbound x-request-id is reused on the response (correlation)', async () => {
    mockGetAuthUser.mockResolvedValue({ role: 'CTV' });
    const res = await middleware(req('http://hrpartner.vn/ctv', { 'x-request-id': 'inbound-req-1234' }));
    expect(res.headers.get('x-request-id')).toBe('inbound-req-1234');
  });
});
// ── C) login POST — relative redirectTo + host-only cookie (RQ-06/10; DEC-02/03) ──
function setCookies(res: Response): string[] {
  // undici Headers.getSetCookie() returns every appended Set-Cookie separately.
  return (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
}

describe('C) login POST — same-origin landing + host-only cookie', () => {
  function grantUser(role: string) {
    mockFindUser.mockResolvedValue({ id: 'u1', role, isActive: true, passwordHash: '$hash' });
    mockVerifyPassword.mockResolvedValue(true);
  }

  it('portal role → relative redirectTo + single host-only cookie (dev: no Secure, no Domain)', async () => {
    grantUser('VENDOR_ADMIN');
    const res = await loginPOST(loginReq({ phone: '0900000001', password: 'pw' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, redirectTo: '/vendor' });

    const cookies = setCookies(res);
    expect(cookies).toHaveLength(1);
    const c = cookies[0];
    expect(c.startsWith(`${AUTH_COOKIE_NAME}=${FAKE_TOKEN}`)).toBe(true);
    expect(c).toContain('Path=/');
    expect(c).toContain('Max-Age=28800');
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Lax');
    expect(c).not.toContain('Domain='); // host-only
    expect(c).not.toContain('Secure'); // dev is http
  });

  it('WORKER → /worker, CTV → /ctv', async () => {
    grantUser('WORKER');
    expect((await (await loginPOST(loginReq({ phone: '1', password: 'p' }))).json()).redirectTo).toBe('/worker');
    grantUser('CTV');
    expect((await (await loginPOST(loginReq({ phone: '1', password: 'p' }))).json()).redirectTo).toBe('/ctv');
  });

  it('ADMIN root → /admin, still host-only cookie', async () => {
    grantUser('ADMIN');
    const res = await loginPOST(loginReq({ phone: '1', password: 'p' }));
    const body = await res.json();
    expect(body).toEqual({ ok: true, redirectTo: '/admin' });
    expect(setCookies(res)).toHaveLength(1);
  });

  it('production → host-only live cookie (Secure, no Domain) + legacy domain-scoped deletion', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    grantUser('VENDOR_STAFF');
    const res = await loginPOST(loginReq({ phone: '1', password: 'p' }));
    const cookies = setCookies(res);
    expect(cookies).toHaveLength(2);

    const live = cookies.find((c) => c.includes(`${FAKE_TOKEN}`))!;
    expect(live).toContain('Secure');
    expect(live).toContain('Max-Age=28800');
    expect(live).not.toContain('Domain='); // live cookie is host-only

    const legacyDel = cookies.find((c) => c.includes('Domain=.hrpartner.vn'))!;
    expect(legacyDel).toContain('Max-Age=0');
    expect(legacyDel).toContain('Secure');
  });

  // RQ-10: auth-failure response, JWT signing and cookie behavior UNCHANGED.
  it('bad credentials / locked / malformed → 401 INVALID_CREDENTIALS and NO cookie', async () => {
    // unknown user
    mockFindUser.mockResolvedValue(null);
    let res = await loginPOST(loginReq({ phone: '1', password: 'p' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('INVALID_CREDENTIALS');
    expect(setCookies(res)).toHaveLength(0);

    // wrong password
    mockFindUser.mockResolvedValue({ id: 'u1', role: 'WORKER', isActive: true, passwordHash: '$h' });
    mockVerifyPassword.mockResolvedValue(false);
    res = await loginPOST(loginReq({ phone: '1', password: 'bad' }));
    expect(res.status).toBe(401);
    expect(setCookies(res)).toHaveLength(0);
    expect(mockSignJwt).not.toHaveBeenCalled(); // never signs on failure

    // malformed body
    res = await loginPOST(loginReq({ phone: '' }));
    expect(res.status).toBe(401);
    expect(setCookies(res)).toHaveLength(0);
  });
});

// ── D) logout POST — host-only deletion (+ legacy deletion in prod) (RQ-08; DEC-03) ──
describe('D) logout POST — cookie deletion', () => {
  it('dev → single host-only deletion (Max-Age=0, no Domain, no Secure)', async () => {
    const res = await logoutPOST(req('http://localhost/api/auth/logout') as unknown as NextRequest);
    expect((await res.json())).toEqual({ ok: true });
    const cookies = setCookies(res);
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toContain('Max-Age=0');
    expect(cookies[0]).not.toContain('Domain=');
    expect(cookies[0]).not.toContain('Secure');
  });

  it('production → host-only deletion + legacy domain-scoped deletion', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await logoutPOST(req('http://localhost/api/auth/logout') as unknown as NextRequest);
    const cookies = setCookies(res);
    expect(cookies).toHaveLength(2);
    expect(cookies.some((c) => c.includes('Domain=.hrpartner.vn') && c.includes('Max-Age=0'))).toBe(true);
    expect(cookies.every((c) => c.includes('Max-Age=0'))).toBe(true); // both are deletions
  });
});
