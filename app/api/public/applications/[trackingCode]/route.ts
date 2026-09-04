import { NextRequest, NextResponse } from 'next/server';
import { getPublicTracking } from '@/src/domains/applications/application.service';
import { getPrisma } from '@/src/lib/db';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { clientIpFromHeaders } from '@/src/shared/security/rate-limit-identity';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';
import { enforceRateLimits } from '@/src/shared/security/rate-limit-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ trackingCode: string }> };

// Public tracking (MP-2 RQ-04 + Owner decision (b) of 2026-08-31, which SUPERSEDES
// decision (a) of the same day — go-live-13, RQ-11/DEC-15): the 120-bit tracking
// code is a bearer secret. Its holder sees the submitted full name plus the
// PARTIALLY MASKED phone and CCCD (`phoneMasked`, `cccdMasked`) — never the raw
// values. Masking happens inside `getPublicTracking` (DEC-01), so the originals are
// never part of this response body; this route must not add any key, header or
// attribute carrying them. No normalized/internal review fields. Unknown code →
// generic 404 with no row-existence signal.
//
// OPS-06A: limiter phân tán DUAL BUCKET (IP 20/60s + tracking-code HMAC 10/60s) thay
// cho Map per-instance cũ — enumeration không còn scale theo số instance. Cả 429 và
// 503 xảy ra TRƯỚC mọi truy vấn ⇒ zero DB call; raw code/IP không ra khỏi process.
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { trackingCode } = await params;

  const denied = await enforceRateLimits({
    buckets: [
      { rule: RATE_LIMIT_RULES.TRACKING_IP, value: clientIpFromHeaders(req.headers, process.env) },
      { rule: RATE_LIMIT_RULES.TRACKING_CODE, value: trackingCode },
    ],
    routeClass: 'GET /api/public/applications/[trackingCode]',
    requestId: getCorrelationId(req.headers),
  });
  if (denied) return denied;

  const prisma = getPrisma();
  const dto = await prisma.$transaction((tx) => getPublicTracking(tx, trackingCode));
  if (!dto) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Application not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ application: dto }, { headers: { 'Cache-Control': 'no-store' } });
}
