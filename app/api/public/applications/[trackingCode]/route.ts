import { NextRequest, NextResponse } from 'next/server';
import { getPublicTracking } from '@/src/domains/applications/application.service';
import { checkTrackingRateLimit, clientKeyFromHeaders } from '@/src/domains/applications/rate-limit';
import { getPrisma } from '@/src/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ trackingCode: string }> };

// Public tracking (DEC-02/RQ-04): safe status projection ONLY, via the
// SECURITY DEFINER function. Unknown/disabled code → generic 404 with no
// row-existence signal. Rate-limit hook guards code enumeration (RISK-03).
export async function GET(req: NextRequest, { params }: RouteParams) {
  const rl = checkTrackingRateLimit(clientKeyFromHeaders(req.headers));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec), 'Cache-Control': 'no-store' } },
    );
  }

  const { trackingCode } = await params;
  const prisma = getPrisma();
  const dto = await prisma.$transaction((tx) => getPublicTracking(tx, trackingCode));
  if (!dto) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Application not found' }, { status: 404 });
  }
  return NextResponse.json({ application: dto }, { headers: { 'Cache-Control': 'no-store' } });
}
