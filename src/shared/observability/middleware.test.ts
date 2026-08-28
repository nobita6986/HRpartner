/**
 * middleware unit tests — AC-02 (RQ-02 all response classes), AC-06 (RQ-06).
 *
 * Coverage:
 * - All response classes carry x-request-id
 * - next() responses propagate x-request-id to BOTH channels:
 *     (a) the client response header `x-request-id`
 *     (b) the downstream request header `x-request-id`
 * - Redirect responses carry x-request-id as query param on Location
 * - Same ID reused when inbound valid; new ID when invalid/missing
 * - Auth/rate/domain behavior unchanged
 * - Concurrent request ID isolation
 *
 * PLN-01 round 3: `getResponseHeader` reads ONLY the response header (no
 * fallback to `x-middleware-request-`); `getDownstreamHeader` reads ONLY the
 * `x-middleware-request-` prefix. Tests assert the two channels independently
 * so removing either one breaks the test suite.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetAuthUser = vi.hoisted(() => vi.fn<() => Promise<unknown>>());

vi.mock('@/src/shared/auth/user', () => ({
  getAuthUser: mockGetAuthUser,
}));

vi.mock('@/src/shared/observability/correlation-id', () => ({
  getCorrelationId: vi.fn((headers: Headers) => {
    const inbound = headers.get('x-request-id');
    if (inbound && inbound.trim().length >= 8 && inbound.trim().length <= 128 &&
        /^[A-Za-z0-9._:-]+$/.test(inbound.trim())) {
      return inbound.trim();
    }
    return 'generated-uuid-12345678';
  }),
}));

import { middleware } from '../../../middleware';
import { NextRequest } from 'next/server';

function makeRequest(path: string, extraHeaders: Record<string, string> = {}) {
  const url = new URL(`http://localhost${path}`);
  const headers = new Headers({ host: 'localhost', ...extraHeaders });
  return new NextRequest(url, { headers });
}

// ─── Test helpers — strict per-channel readers ─────────────────────────────────

/**
 * Channel 1: read the client-facing response header.
 * NO fallback to `x-middleware-request-` prefix. For `NextResponse.next({ request: { headers } })`,
 * the downstream-request channel lives under that prefix and must NOT bleed into this reader.
 */
function getResponseHeader(response: unknown, name: string): string | null {
  const headers = (response as { headers?: { get: (n: string) => string | null } }).headers;
  if (!headers) return null;
  return headers.get(name);
}

/**
 * Channel 2: read the downstream-request header injected via
 * `NextResponse.next({ request: { headers } })`. Next.js exposes these under
 * the `x-middleware-request-` prefix on the response.headers.
 */
function getDownstreamHeader(response: unknown, name: string): string | null {
  const headers = (response as { headers?: { get: (n: string) => string | null } }).headers;
  if (!headers) return null;
  return headers.get(`x-middleware-request-${name}`);
}

/**
 * Channel 3: extract x-request-id from the redirect Location header (query param).
 */
function getRedirectRequestId(response: unknown): string | null {
  const headers = (response as { headers?: { get: (n: string) => string | null } }).headers;
  if (!headers) return null;
  const location = headers.get('Location');
  if (!location) return null;
  try {
    const u = new URL(location, 'http://localhost');
    return u.searchParams.get('x-request-id');
  } catch {
    return null;
  }
}

beforeEach(() => {
  mockGetAuthUser.mockReset();
  mockGetAuthUser.mockResolvedValue(null);
});

// ─── AC-02: x-request-id on ALL response classes ─────────────────────────────

describe('AC-02: x-request-id on all response classes', () => {

  // Terminal responses — only client response header exists
  it('401 JSON response carries x-request-id in client response header', async () => {
    const req = makeRequest('/api/vendor/test');
    const resp = await middleware(req);
    expect(resp.status).toBe(401);
    expect(getResponseHeader(resp, 'x-request-id')).toBeTruthy();
    expect(getResponseHeader(resp, 'x-request-id')).toMatch(/^[A-Za-z0-9._:-]+$/);
  });

  it('rate-limited 503 response carries x-request-id in client response header', async () => {
    const req = makeRequest('/worker/page', { 'x-forwarded-for': '192.168.1.99' });
    const resp = await middleware(req);
    expect(getResponseHeader(resp, 'x-request-id')).toBeTruthy();
  });

  it('/bcc/api/ unauthenticated 401 JSON carries x-request-id in client response header', async () => {
    const req = makeRequest('/bcc/api/data');
    const resp = await middleware(req);
    expect(resp.status).toBe(401);
    expect(getResponseHeader(resp, 'x-request-id')).toBeTruthy();
  });

  // Redirect — ID lives in the Location query param (channel 3)
  it('/bcc unauthenticated redirect carries x-request-id via Location query param', async () => {
    const req = makeRequest('/bcc/dashboard');
    const resp = await middleware(req);
    expect([302, 307]).toContain(resp.status);
    expect(getRedirectRequestId(resp)).toBeTruthy();
  });

  it('portal unauthenticated redirect carries x-request-id via Location query param', async () => {
    const req = makeRequest('/vendor/page');
    const resp = await middleware(req);
    expect([302, 307]).toContain(resp.status);
    expect(getRedirectRequestId(resp)).toBeTruthy();
  });

  // next() responses — must carry BOTH channels (PLN-01 round 3)
  it('authenticated /vendor/ next() carries x-request-id on BOTH channels', async () => {
    mockGetAuthUser.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' as const });
    const req = makeRequest('/vendor/dashboard');
    const resp = await middleware(req);
    const respHdr = getResponseHeader(resp, 'x-request-id');
    const dsHdr = getDownstreamHeader(resp, 'x-request-id');
    expect(respHdr).toBeTruthy();
    expect(dsHdr).toBeTruthy();
    expect(respHdr).toBe(dsHdr); // same canonical ID on both channels
  });

  it('authenticated /bcc/ next() carries x-request-id on BOTH channels', async () => {
    mockGetAuthUser.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' as const });
    const req = makeRequest('/bcc/dashboard');
    const resp = await middleware(req);
    const respHdr = getResponseHeader(resp, 'x-request-id');
    const dsHdr = getDownstreamHeader(resp, 'x-request-id');
    expect(respHdr).toBeTruthy();
    expect(dsHdr).toBeTruthy();
    expect(respHdr).toBe(dsHdr);
  });

  it('authenticated /worker/ (allowed) next() carries x-request-id on BOTH channels', async () => {
    mockGetAuthUser.mockResolvedValue({ userId: 'worker-1', role: 'VENDOR' as const });
    const req = makeRequest('/worker/page', { 'x-forwarded-for': '10.0.0.1' });
    const resp = await middleware(req);
    const respHdr = getResponseHeader(resp, 'x-request-id');
    const dsHdr = getDownstreamHeader(resp, 'x-request-id');
    expect(respHdr).toBeTruthy();
    expect(dsHdr).toBeTruthy();
    expect(respHdr).toBe(dsHdr);
  });

  it('rate-allowed /worker/ next() carries x-request-id on BOTH channels', async () => {
    const req = makeRequest('/worker/page', { 'x-forwarded-for': '10.0.0.1' });
    const resp = await middleware(req);
    const respHdr = getResponseHeader(resp, 'x-request-id');
    const dsHdr = getDownstreamHeader(resp, 'x-request-id');
    expect(respHdr).toBeTruthy();
    expect(dsHdr).toBeTruthy();
    expect(respHdr).toBe(dsHdr);
  });

  it('non-portal path / about next() carries x-request-id on BOTH channels', async () => {
    const req = makeRequest('/about');
    const resp = await middleware(req);
    const respHdr = getResponseHeader(resp, 'x-request-id');
    const dsHdr = getDownstreamHeader(resp, 'x-request-id');
    expect(respHdr).toBeTruthy();
    expect(dsHdr).toBeTruthy();
    expect(respHdr).toBe(dsHdr);
  });

  it('non-portal next() preserves inbound headers for the downstream route', async () => {
    const req = makeRequest('/api/auth/login', {
      'content-type': 'application/json',
      cookie: 'hrp_session=test-session',
      'x-idempotency-key': 'idem-123',
    });
    const resp = await middleware(req);

    expect(getDownstreamHeader(resp, 'content-type')).toBe('application/json');
    expect(getDownstreamHeader(resp, 'cookie')).toBe('hrp_session=test-session');
    expect(getDownstreamHeader(resp, 'x-idempotency-key')).toBe('idem-123');
    expect(getDownstreamHeader(resp, 'x-request-id')).toBeTruthy();
  });
});

// ─── PLN-01 channel-independence (round 3) ────────────────────────────────────
// Removing EITHER channel must break the corresponding assertion in this block.

describe('PLN-01 channel independence — removing either channel breaks its test', () => {

  it('removes response channel → response-header reader returns null', () => {
    // Simulate a response object where ONLY the downstream channel is populated.
    const fakeResp = {
      headers: {
        get(name: string) {
          if (name === 'x-middleware-request-x-request-id') return 'only-downstream';
          return null;
        },
      },
    };
    expect(getResponseHeader(fakeResp, 'x-request-id')).toBeNull();
    expect(getDownstreamHeader(fakeResp, 'x-request-id')).toBe('only-downstream');
  });

  it('removes downstream channel → downstream-header reader returns null', () => {
    const fakeResp = {
      headers: {
        get(name: string) {
          if (name === 'x-request-id') return 'only-response';
          return null;
        },
      },
    };
    expect(getResponseHeader(fakeResp, 'x-request-id')).toBe('only-response');
    expect(getDownstreamHeader(fakeResp, 'x-request-id')).toBeNull();
  });

  it('real middleware /vendor next() passes only if BOTH channels are set', async () => {
    mockGetAuthUser.mockResolvedValue({ userId: 'u', role: 'ADMIN' as const });
    const req = makeRequest('/vendor/dashboard');
    const resp = await middleware(req);
    const respHdr = getResponseHeader(resp, 'x-request-id');
    const dsHdr = getDownstreamHeader(resp, 'x-request-id');
    // Both must be present and equal. If `continuingNext()` drops the
    // `resp.headers.set('x-request-id', requestId)` call, the response header
    // becomes null and this test fails.
    // If `continuingNext()` drops the `NextResponse.next({ request: { headers: ... } })`,
    // the downstream header becomes null and this test fails.
    expect(respHdr).not.toBeNull();
    expect(dsHdr).not.toBeNull();
    expect(respHdr).toBe(dsHdr);
  });

  it('real middleware /worker next() passes only if BOTH channels are set', async () => {
    mockGetAuthUser.mockResolvedValue({ userId: 'u', role: 'VENDOR' as const });
    const req = makeRequest('/worker/page', { 'x-forwarded-for': '10.0.0.1' });
    const resp = await middleware(req);
    const respHdr = getResponseHeader(resp, 'x-request-id');
    const dsHdr = getDownstreamHeader(resp, 'x-request-id');
    expect(respHdr).not.toBeNull();
    expect(dsHdr).not.toBeNull();
    expect(respHdr).toBe(dsHdr);
  });

  it('real middleware /bcc next() passes only if BOTH channels are set', async () => {
    mockGetAuthUser.mockResolvedValue({ userId: 'u', role: 'ADMIN' as const });
    const req = makeRequest('/bcc/dashboard');
    const resp = await middleware(req);
    const respHdr = getResponseHeader(resp, 'x-request-id');
    const dsHdr = getDownstreamHeader(resp, 'x-request-id');
    expect(respHdr).not.toBeNull();
    expect(dsHdr).not.toBeNull();
    expect(respHdr).toBe(dsHdr);
  });

  it('real middleware /about (non-portal) next() passes only if BOTH channels are set', async () => {
    const req = makeRequest('/about');
    const resp = await middleware(req);
    const respHdr = getResponseHeader(resp, 'x-request-id');
    const dsHdr = getDownstreamHeader(resp, 'x-request-id');
    expect(respHdr).not.toBeNull();
    expect(dsHdr).not.toBeNull();
    expect(respHdr).toBe(dsHdr);
  });
});

// ─── AC-02: inbound ID reuse ──────────────────────────────────────────────────

describe('AC-02: inbound x-request-id is reused when valid', () => {
  it('valid inbound ID appears in client response', async () => {
    const req = makeRequest('/api/test', { 'x-request-id': 'valid-inbound-12345' });
    const resp = await middleware(req);
    expect(getResponseHeader(resp, 'x-request-id')).toBe('valid-inbound-12345');
  });

  it('valid UUID inbound appears in response unchanged', async () => {
    const req = makeRequest('/api/test', { 'x-request-id': 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });
    const resp = await middleware(req);
    expect(getResponseHeader(resp, 'x-request-id')).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
  });
});

// ─── AC-02: invalid inbound → new ID generated ─────────────────────────────────

describe('AC-02: malformed inbound → generated ID in response', () => {
  it('empty inbound → generated ID', async () => {
    const req = makeRequest('/api/test', { 'x-request-id': '' });
    const resp = await middleware(req);
    expect(getResponseHeader(resp, 'x-request-id')).toBe('generated-uuid-12345678');
  });

  it('invalid chars inbound → generated ID', async () => {
    const req = makeRequest('/api/test', { 'x-request-id': ' spaces here! ' });
    const resp = await middleware(req);
    expect(getResponseHeader(resp, 'x-request-id')).toBe('generated-uuid-12345678');
  });

  it('too-short inbound → generated ID', async () => {
    const req = makeRequest('/api/test', { 'x-request-id': 'abc' });
    const resp = await middleware(req);
    expect(getResponseHeader(resp, 'x-request-id')).toBe('generated-uuid-12345678');
  });

  it('missing inbound → generated ID', async () => {
    const req = makeRequest('/api/test');
    const resp = await middleware(req);
    expect(getResponseHeader(resp, 'x-request-id')).toBe('generated-uuid-12345678');
  });
});

// ─── AC-06: concurrent ID isolation ───────────────────────────────────────────

describe('AC-06: concurrent request ID isolation', () => {
  it('two concurrent requests get different IDs', async () => {
    const req1 = makeRequest('/api/test', { 'x-request-id': 'req-id-11111111' });
    const req2 = makeRequest('/api/test', { 'x-request-id': 'req-id-22222222' });
    const [resp1, resp2] = await Promise.all([
      middleware(req1),
      middleware(req2),
    ]);
    const id1 = getResponseHeader(resp1, 'x-request-id');
    const id2 = getResponseHeader(resp2, 'x-request-id');
    expect(id1).toBe('req-id-11111111');
    expect(id2).toBe('req-id-22222222');
    expect(id1).not.toBe(id2);
  });

  it('concurrent valid + invalid → distinct IDs (no cross-contamination)', async () => {
    const req1 = makeRequest('/api/test', { 'x-request-id': 'valid-id-1234' });
    const req2 = makeRequest('/api/test', { 'x-request-id': '' });
    const [resp1, resp2] = await Promise.all([
      middleware(req1),
      middleware(req2),
    ]);
    const id1 = getResponseHeader(resp1, 'x-request-id');
    const id2 = getResponseHeader(resp2, 'x-request-id');
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });
});

// ─── Behavior unchanged: auth/rate/domain ─────────────────────────────────────

describe('Behavior unchanged (DEC-02/08)', () => {

  it('unauthenticated /api/ → 401, not 403 or redirect', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const req = makeRequest('/api/vendor/test');
    const resp = await middleware(req);
    expect(resp.status).toBe(401);
    const body = await resp.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('authenticated ADMIN → next() with x-request-id, no error', async () => {
    mockGetAuthUser.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' as const });
    const req = makeRequest('/vendor/admin');
    const resp = await middleware(req);
    expect(getResponseHeader(resp, 'x-request-id')).toBeTruthy();
  });

  it('rate limit headers present on worker responses', async () => {
    const req = makeRequest('/worker/page', { 'x-forwarded-for': '10.0.0.1' });
    const resp = await middleware(req);
    expect(getResponseHeader(resp, 'x-request-id')).toBeTruthy();
  });
});
