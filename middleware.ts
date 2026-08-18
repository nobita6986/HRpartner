/**
 * Middleware — P1 Portals multi-domain (STEP-02, RQ-01).
 *
 * DEC-01: 3 subdomain: vendor.hrpartner.vn, worker.hrpartner.vn, ctv.hrpartner.vn
 * DEC-02: role-domain guard (VENDOR_* → vendor, WORKER → worker, CTV → ctv).
 * DEC-03: Root (hrpartner.vn) keeps job board + admin.
 *
 * Fail-closed: no token → 401 / redirect to login.
 * Role-domain guard: wrong domain for role → redirect to correct domain.
 * Fence /bcc preserved from Phase 1.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/src/shared/auth/user';

export const config = {
  matcher: [
    '/bcc/:path*',          // Phase 1 fence — unchanged
    '/vendor/:path*',       // Vendor portal
    '/worker/:path*',       // Worker PWA
    '/ctv/:path*',         // CTV dashboard
    '/api/vendor/:path*',    // Vendor API
    '/api/worker/:path*',   // Worker API
    '/api/ctv/:path*',      // CTV API
  ],
};

// ─── Domain config ───────────────────────────────────────────────────────────

const PORTAL_DOMAINS: Record<string, string> = {
  VENDOR_ADMIN:  'vendor.hrpartner.vn',
  VENDOR_STAFF: 'vendor.hrpartner.vn',
  WORKER:       'worker.hrpartner.vn',
  CTV:          'ctv.hrpartner.vn',
};

const INTERNAL_DOMAINS = new Set(['hrpartner.vn', 'localhost']);

function getHost(req: NextRequest): string {
  return req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
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
  // Preserve port for local dev
  if (req.nextUrl.port && req.nextUrl.port !== '80' && req.nextUrl.port !== '443') {
    redirectUrl.port = req.nextUrl.port;
  }
  return NextResponse.redirect(redirectUrl);
}
