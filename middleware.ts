/**
 * Middleware — P1 Portals multi-domain (STEP-02, RQ-01).
 *
 * DEC-01: 3 subdomain: vendor.hrpartner.vn, worker.hrpartner.vn, ctv.hrpartner.vn
 * DEC-02: role-domain guard (VENDOR_* → vendor, WORKER → worker, CTV → ctv).
 * DEC-03: Root (hrpartner.vn) keeps job board + admin.
 *
 * M8 STEP-02: Virtual Waiting Room for /worker* routes.
 * - Rate limit: 30 req/min per IP for /worker* routes.
 * - If exceeded: show waiting room HTML.
 *
 * Fail-closed: no token → 401 / redirect to login.
 * Role-domain guard: wrong domain for role → redirect to correct domain.
 * Fence /bcc preserved from Phase 1.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/src/shared/auth/user';

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

// ─── Domain config ───────────────────────────────────────────────────────────

const PORTAL_DOMAINS: Record<string, string> = {
  VENDOR_ADMIN:  'vendor.hrpartner.vn',
  VENDOR_STAFF: 'vendor.hrpartner.vn',
  WORKER:       'worker.hrpartner.vn',
  CTV:          'ctv.hrpartner.vn',
};

const INTERNAL_DOMAINS = new Set(['hrpartner.vn', 'localhost']);

function getHost(req: NextRequest): string {
  const hostHeader = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  return hostHeader.split(',')[0].trim().split(':')[0];
}

function isInternal(host: string): boolean {
  return INTERNAL_DOMAINS.has(host) || host.endsWith('.hrpartner.vn');
}

function getExpectedDomain(role: string): string {
  return PORTAL_DOMAINS[role] ?? 'hrpartner.vn';
}

function redirectToLogin(req: NextRequest): NextResponse {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = `?callback=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(loginUrl);
}

// ─── Middleware ─────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/bcc/:path*',          // Phase 1 fence — unchanged
    '/vendor/:path*',       // Vendor portal
    '/worker/:path*',        // Worker PWA (+ rate limit)
    '/ctv/:path*',         // CTV dashboard
    '/api/vendor/:path*',    // Vendor API
    '/api/worker/:path*',   // Worker API
    '/api/ctv/:path*',      // CTV API
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── /bcc fence — Phase 1 unchanged ──────────────────────────────────
  if (pathname.startsWith('/bcc')) {
    const user = await getAuthUser(req);
    if (!user) {
      if (pathname.startsWith('/bcc/api/')) {
        return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Missing or invalid token' }, { status: 401 });
      }
      return redirectToLogin(req);
    }
    return NextResponse.next();
  }

  // ── Portal routes (/vendor, /worker, /ctv, /api/vendor, /api/worker, /api/ctv) ──
  const isPortal = pathname.startsWith('/vendor') || pathname.startsWith('/worker') ||
                    pathname.startsWith('/ctv')    || pathname.startsWith('/api/vendor') ||
                    pathname.startsWith('/api/worker') || pathname.startsWith('/api/ctv');;

  if (!isPortal) {
    return NextResponse.next();
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
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          'Cache-Control': 'no-store',
        },
      });
    }

    // Inject rate limit headers
    const resp = NextResponse.next();
    resp.headers.set('X-RateLimit-Remaining', String(remaining));
    resp.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
    return resp;
  }

  // No auth → redirect to login
  const user = await getAuthUser(req);
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Missing or invalid token' }, { status: 401 });
    }
    return redirectToLogin(req);
  }

  // Determine expected domain for this role
  const expectedDomain = getExpectedDomain(user.role);

  // Admin / internal roles → no domain redirect needed
  if (!expectedDomain || expectedDomain === 'hrpartner.vn') {
    return NextResponse.next();
  }

  const host = getHost(req);

  // Already on correct domain
  if (host === expectedDomain || host === `${expectedDomain}:${req.nextUrl.port || '443'}`) {
    return NextResponse.next();
  }

  // Wrong domain → redirect to correct domain
  const redirectUrl = req.nextUrl.clone();
  redirectUrl.hostname = expectedDomain;
  if (req.nextUrl.port && req.nextUrl.port !== '80' && req.nextUrl.port !== '443') {
    redirectUrl.port = req.nextUrl.port;
  }
  return NextResponse.redirect(redirectUrl);
}
