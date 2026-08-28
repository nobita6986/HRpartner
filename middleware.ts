/**
 * Middleware — V5-GO-LIVE-01 single canonical origin (RQ-03/04/08, DEC-01/04/05/07).
 *
 * DEC-01: ONE canonical origin — https://hrpartner.vn. Role→subdomain routing is gone;
 *   hostname is NOT a security boundary (DEC-07) — route guards + JWT + RLS own authz.
 * RQ-08/DEC-04: the three legacy hosts (vendor./worker./ctv.hrpartner.vn) are allowlisted
 *   transition redirects → 308 to the canonical origin (bare root → the host's landing
 *   path; any other path/query preserved). Allowlist lives in src/shared/routing/portal-landing.
 * DEC-05: an unknown or spoofed Host / x-forwarded-host is NEVER a redirect target — it
 *   falls through to the normal auth flow; the redirect target origin is a fixed constant.
 *
 * M8 STEP-02: Virtual Waiting Room for /worker* routes.
 * - Rate limit: 30 req/min per IP for /worker* routes.
 * - If exceeded: show waiting room HTML.
 *
 * Fail-closed: no token → 401 (/api) / redirect to login.
 * V5-OPS-04a: x-request-id correlation on every response (both channels + redirect query).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/src/shared/auth/user';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { isLegacyPortalHost, buildLegacyCanonicalUrl } from '@/src/shared/routing/portal-landing';

// ─── Rate Limiting State (in-memory) ────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_MAP = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute per IP
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60_000; // 5 minutes

let lastCleanup = Date.now();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim().split(':')[0];
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Periodic cleanup
  if (now - lastCleanup > RATE_LIMIT_CLEANUP_INTERVAL) {
    for (const [key, entry] of RATE_LIMIT_MAP.entries()) {
      if (entry.resetAt <= now) RATE_LIMIT_MAP.delete(key);
    }
    lastCleanup = now;
  }

  const entry = RATE_LIMIT_MAP.get(ip);
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetAt: entry.resetAt };
}

function waitingRoomHtml(retryAfterSec: number): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phòng chờ — HRPartner</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           background: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; border-radius: 16px; padding: 40px; max-width: 400px; width: 90%;
             box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; }
    .icon { width: 64px; height: 64px; margin: 0 auto 24px; background: #dbeafe; border-radius: 50%;
             display: flex; align-items: center; justify-content: center; font-size: 28px; }
    h1 { color: #1e40af; font-size: 24px; margin-bottom: 12px; }
    p { color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
    .timer { font-size: 36px; font-weight: 700; color: #3b82f6; margin: 16px 0; font-variant-numeric: tabular-nums; }
    .bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin: 24px 0; }
    .bar-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 3px;
                animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⏳</div>
    <h1>Phòng chờ</h1>
    <p>Hệ thống đang có nhiều người truy cập. Bạn sẽ được chuyển tiếp tự động.</p>
    <div class="timer" id="countdown">${retryAfterSec}</div>
    <p style="font-size:13px; margin-bottom:8px;">giây</p>
    <div class="bar"><div class="bar-fill" style="width:100%"></div></div>
    <p style="font-size:12px;">Vui lòng không tải lại trang</p>
  </div>
  <script>
    let secs = ${retryAfterSec};
    const el = document.getElementById('countdown');
    const iv = setInterval(() => {
      secs--;
      if (el) el.textContent = secs;
      if (secs <= 0) { clearInterval(iv); location.reload(); }
    }, 1000);
  </script>
</body>
</html>`;
}

// ─── Host parsing (single canonical origin) ──────────────────────────────────
// The ONLY host-dependent behavior left is the fixed legacy-host → canonical
// redirect (allowlist in src/shared/routing/portal-landing). Hostname is NOT a
// security boundary (DEC-07). Host is lower-cased so the allowlist match is
// case-insensitive (hostnames are case-insensitive per RFC 3986) — a spoofed
// mixed-case legacy host still resolves to the same fixed canonical origin.

function getHost(req: NextRequest): string {
  const hostHeader = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  return hostHeader.split(',')[0].trim().split(':')[0].toLowerCase();
}

// ─── Middleware ─────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/',                     // V5-GO-LIVE-01: bare-root legacy-host 308 redirect
    '/vendor/:path*',       // Vendor portal
    '/worker/:path*',        // Worker PWA (+ rate limit)
    '/ctv/:path*',         // CTV dashboard
    '/api/:path*',           // V5-OPS-04a STEP-02: ALL API routes for correlation
    '/api/vendor/:path*',    // Vendor API (covered by /api/:path* but explicit for readability)
    '/api/worker/:path*',   // Worker API
    '/api/ctv/:path*',      // CTV API
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── V5-OPS-04a STEP-02: Correlation ID (DEC-01/02/08) ──────────────────
  // Extract at top of function — BEFORE any branch, before await.
  // Canonical header: x-request-id. Reuse valid inbound; generate UUID if malformed.
  const requestId = getCorrelationId(req.headers);

  // Helper: build Headers with x-request-id injected. Returns Headers so it can be
  // used directly in NextResponse options objects.
  function withRequestId(extra?: Record<string, string>): Headers {
    const h = extra ? new Headers(extra) : new Headers();
    h.set('x-request-id', requestId);
    return h;
  }

  // Preserve every inbound request header for the downstream route. Passing a
  // fresh one-header object to NextResponse.next() silently drops cookies,
  // content-type, authorization and idempotency headers.
  function withDownstreamRequestId(): Headers {
    const h = new Headers(req.headers);
    h.set('x-request-id', requestId);
    return h;
  }

  // PLN-01 (round 3): every continuing next() response MUST set BOTH channels
  // — the client response header `x-request-id` and the downstream request header
  // `x-request-id` — so tests asserting each channel separately can fail when one
  // is removed.
  function continuingNext(): NextResponse {
    const resp = NextResponse.next({ request: { headers: withDownstreamRequestId() } });
    resp.headers.set('x-request-id', requestId);
    return resp;
  }

  function continuingNextWithRateLimit(remaining: number, resetAt: number): NextResponse {
    const resp = NextResponse.next({ request: { headers: withDownstreamRequestId() } });
    resp.headers.set('X-RateLimit-Remaining', String(remaining));
    resp.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
    resp.headers.set('x-request-id', requestId);
    return resp;
  }

  // Helper: clone a redirect URL and append x-request-id as query param.
  // This propagates correlation ID to the redirect target since redirect response
  // headers cannot carry custom headers to the client browser.
  function redirectWithRequestId(redirectUrl: URL): URL {
    const out = new URL(redirectUrl.href);
    out.searchParams.set('x-request-id', requestId);
    return out;
  }

  // Helper: build the login redirect URL with x-request-id query param.
  function buildLoginUrl(req: NextRequest): URL {
    const loginUrl = new URL(req.url);
    loginUrl.pathname = '/login';
    loginUrl.search = `?callback=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return redirectWithRequestId(loginUrl);
  }

  // ── V5-GO-LIVE-01: legacy portal host → canonical origin (RQ-03/04/08, DEC-04/05) ──
  // Runs BEFORE any auth/fence/rate-limit branch. ONLY the three exact allowlisted hosts
  // (vendor./worker./ctv.hrpartner.vn) are 308-redirected to https://hrpartner.vn: bare
  // root → the host's landing path, any other path preserves pathname + query. An unknown
  // or spoofed Host / x-forwarded-host is NEVER a redirect target (isLegacyPortalHost is a
  // strict allowlist) — it falls through to the normal flow below. No loop: the canonical
  // host is not a legacy host, and the redirect target origin is a fixed constant.
  // Location is kept CLEAN (no x-request-id query) so the exact path/query is preserved for
  // RQ-04; the correlation id still rides the response header via withRequestId().
  const host = getHost(req);
  if (isLegacyPortalHost(host)) {
    const target = buildLegacyCanonicalUrl(host, pathname, req.nextUrl.search);
    return NextResponse.redirect(target, { status: 308, headers: withRequestId() });
  }

  // ── Portal routes (/vendor, /worker, /ctv, /api/vendor, /api/worker, /api/ctv) ──
  const isPortal = pathname.startsWith('/vendor') || pathname.startsWith('/worker') ||
                    pathname.startsWith('/ctv')    || pathname.startsWith('/api/vendor') ||
                    pathname.startsWith('/api/worker') || pathname.startsWith('/api/ctv');;

  if (!isPortal) {
    return continuingNext();
  }

  // ── M8: Rate Limit for /worker* routes ─────────────────────────────
  if (pathname.startsWith('/worker') || pathname.startsWith('/api/worker')) {
    const ip = getClientIp(req);
    const { allowed, remaining, resetAt } = checkRateLimit(ip);

    if (!allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      const body = waitingRoomHtml(retryAfterSec);

      return new NextResponse(body, {
        status: 503,
        headers: withRequestId({
          'Content-Type': 'text/html; charset=utf-8',
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          'Cache-Control': 'no-store',
        }),
      });
    }

    return continuingNextWithRateLimit(remaining, resetAt);
  }

  // No auth → redirect to login
  const user = await getAuthUser(req);
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Missing or invalid token' },
        { status: 401, headers: withRequestId() },
      );
    }
    return NextResponse.redirect(buildLoginUrl(req), {
      headers: withRequestId(),
    });
  }

  // V5-GO-LIVE-01 (DEC-01/07): authenticated portal user on the canonical origin.
  // Hostname is not a security boundary — route guards + JWT + L1/L2 scope own
  // authorization. The former role→subdomain redirect is removed (single origin),
  // so any authenticated portal role simply continues.
  return continuingNext();
}
