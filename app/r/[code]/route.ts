/**
 * app/r/[code]/route.ts — hrp-v6-n2-aff-02-link-capture (N2-2).
 *
 * Canonical GET /r/{code}[?job=<slug>] referral redirect.
 *
 * Order of guards (each fail-closed):
 *   1. Rate-limit — dual bucket: IP (clientIp bucket) + AFF (canonical code bucket).
 *      Both must pass; either denial → 429 / 503.  AFF key is HMAC-digested
 *      (no raw affiliate code reaches the provider or logs).
 *   2. Code format + job allowlist (service layer).
 *   3. Engine client fail-closed on missing URL.
 *   4. Service typed outcome -> HTTP.
 *
 * Cookie `hrp_aff` (HttpOnly, SameSite=Lax, Path=/, Max-Age=2592000, Secure).
 * Never returns raw attributionId or referrerUserId to the browser.
 *
 * Decision A: no Idempotency-Key, no synthetic actor, no advisory lock.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { getEnginePrisma } from '@/src/db/engine-client';
import {
  canonicalTrackingCode,
  clientIpFromHeaders,
  hashRateLimitIdentifier,
} from '@/src/shared/security/rate-limit-identity';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';
import { enforceRateLimits } from '@/src/shared/security/rate-limit-guard';
import { getRateLimitRuntime } from '@/src/shared/security/rate-limit-provider';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { warn } from '@/src/shared/observability/logger';
import { resolveReferralRedirect, type RedirectOutcome } from '@/src/domains/referrals/attribution-redirect.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ code: string }> };

const ROUTE_CLASS = 'GET /r/[code]';
const COOKIE_NAME = 'hrp_aff';
/** 30 days in seconds — matches TOKEN_TTL_MS / redirect-token.ts */
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
const SECURE_COOKIE = process.env.NODE_ENV === 'production';

/* ─── Cookie helpers ────────────────────────────────────────────────────── */

function setCookieResponse(
  destination: string,
  cookieToken: string,
  requestId: string | null,
): NextResponse {
  const headers: Record<string, string> = {
    Location: destination,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'X-Request-Id': requestId ?? '',
  };
  const response = new NextResponse(null, {
    status: 302,
    headers,
  });
  response.cookies.set(COOKIE_NAME, cookieToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    secure: SECURE_COOKIE,
  });
  return response;
}

function redirectResponse(destination: string, requestId: string | null): NextResponse {
  return NextResponse.redirect(destination, 302);
}

/* ─── Outcome -> HTTP ───────────────────────────────────────────────────── */

function outcomeToResponse(outcome: RedirectOutcome, requestId: string | null): NextResponse {
  switch (outcome.kind) {
    case 'REDIRECT_EXISTING':
      return redirectResponse(outcome.destination, requestId);

    case 'REDIRECT_NEW':
      return setCookieResponse(outcome.destination, outcome.cookieToken, requestId);

    case 'NOT_FOUND':
    case 'INVALID_JOB':
      // Constant-shape: always redirect to /jobs — no existence signal.
      return redirectResponse(outcome.destination, requestId);

    case 'INVALID_CODE':
      // 404 so crawlers/indexers do not cache, no body (constant).
      return new NextResponse(null, { status: 404 });

    case 'RATE_LIMITED':
      return new NextResponse(null, { status: 429 });

    case 'ENGINE_UNAVAILABLE':
    case 'WRITE_FAILED':
      return new NextResponse(null, { status: 503 });
  }
}

/* ─── Handler ───────────────────────────────────────────────────────────── */

export async function GET(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { code: rawCode } = await params;
  const requestId = getCorrelationId(req.headers);

  // Pre-decode: full validation happens in service.
  const canonicalCode = canonicalTrackingCode(rawCode ?? '');

  // 1. Rate-limit guard — DUAL bucket: IP + AFF.
  //    Both must pass.  Denial → 429 / 503 (fail-closed).
  //    AFF key = HMAC-digested canonical code — raw code never reaches provider/log.
  const clientIp = clientIpFromHeaders(req.headers, process.env);
  const hashedCode = hashRateLimitIdentifier(
    RATE_LIMIT_RULES.REFERRAL_CAPTURE_CODE,
    canonicalCode,
    process.env.RATE_LIMIT_HASH_SECRET ?? '',
  );

  let rateLimitResponse: NextResponse | null = null;
  try {
    rateLimitResponse = await enforceRateLimits({
      buckets: [
        { rule: RATE_LIMIT_RULES.REFERRAL_CAPTURE_IP, value: clientIp },
        { rule: RATE_LIMIT_RULES.REFERRAL_CAPTURE_CODE, value: hashedCode },
      ],
      routeClass: ROUTE_CLASS,
      requestId,
    });
  } catch {
    // Fail-closed: rate-limiter unavailable → reject the request.
    warn('referral.redirect.rate_limit_error', requestId, {
      route: ROUTE_CLASS,
      outcome: 'engine_unavailable',
    });
    return new NextResponse(null, { status: 503 });
  }
  if (rateLimitResponse) return rateLimitResponse;

  // 2. Job query param (null if absent).
  const job = req.nextUrl.searchParams.get('job');

  // 3. Read existing hrp_aff cookie.
  const hrpAffCookie = req.cookies.get(COOKIE_NAME)?.value ?? null;

  // 4. Engine client — fail-closed if the URL is missing.
  let engine;
  try {
    engine = getEnginePrisma();
  } catch {
    warn('referral.redirect.engine_unavailable', requestId, {
      route: ROUTE_CLASS,
      outcome: 'engine_unavailable',
    });
    return new NextResponse(null, { status: 503 });
  }

  const writer = getPrisma();

  // 5. Service.
  const outcome = await resolveReferralRedirect(
    {
      affCode: canonicalCode,
      job,
      hrpAffCookie,
      requestId,
    },
    { writer, engine },
  );

  return outcomeToResponse(outcome, requestId);
}
