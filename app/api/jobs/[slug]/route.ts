import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { getPublicJobProjection } from '@/src/domains/job-board/public.service';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { clientIpFromHeaders } from '@/src/shared/security/rate-limit-identity';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';
import { enforceRateLimits } from '@/src/shared/security/rate-limit-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ slug: string }> };

// OPS-06A / RQ-03: cùng bucket JOB_BROWSE với list (DEC-04 "browse list+detail
// 120/60s/IP"), chạy TRƯỚC truy vấn ⇒ 429/503 zero DB call.
export async function GET(req: NextRequest, { params }: RouteParams) {
  const denied = await enforceRateLimits({
    buckets: [{ rule: RATE_LIMIT_RULES.JOB_BROWSE, value: clientIpFromHeaders(req.headers, process.env) }],
    routeClass: 'GET /api/jobs/[slug]',
    requestId: getCorrelationId(req.headers),
  });
  if (denied) return denied;

  const { slug } = await params;
  const prisma = getPrisma();
  const job = await prisma.$transaction((tx) => getPublicJobProjection(tx, slug));
  if (!job) return NextResponse.json({ error: 'NOT_FOUND', message: 'Job not found' }, { status: 404 });
  return NextResponse.json({ job });
}
