import { NextRequest, NextResponse } from 'next/server';
import { listPublicJobProjection } from '@/src/domains/job-board/public.service';
import { getPrisma } from '@/src/lib/db';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { clientIpFromHeaders } from '@/src/shared/security/rate-limit-identity';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';
import { enforceRateLimits } from '@/src/shared/security/rate-limit-guard';
import { retiredApplyEndpointResponse } from '@/src/shared/security/retired-endpoint';
import { withPublicDb } from '@/src/shared/auth/with-public-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// OPS-06A / RQ-03: distributed browse limit (JOB_BROWSE, chung bucket với detail)
// chạy TRƯỚC mọi truy vấn. 429/503 ⇒ zero DB call.
export async function GET(req: NextRequest) {
  const denied = await enforceRateLimits({
    buckets: [{ rule: RATE_LIMIT_RULES.JOB_BROWSE, value: clientIpFromHeaders(req.headers, process.env) }],
    routeClass: 'GET /api/jobs',
    requestId: getCorrelationId(req.headers),
  });
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const prisma = getPrisma();
  // go-live-04 / RQ-03: principal công khai MKT + transaction read-only. `$transaction`
  // trần ở đây chính là defect P0 làm bề mặt việc làm trả 0 dòng dưới FORCE RLS.
  const projection = await withPublicDb(prisma, (tx) => listPublicJobProjection(tx, {
    q: searchParams.get('q') ?? undefined,
    area: searchParams.get('area') ?? undefined,
    shift: searchParams.get('shift') ?? undefined,
    shiftTypes: searchParams.getAll('shiftType'),
    jobTypes: searchParams.getAll('jobType'),
    offset: Number(searchParams.get('offset') ?? 0),
    limit: Number(searchParams.get('limit') ?? 20),
  }));
  return NextResponse.json(projection);
}

// OPS-06A / RQ-08 / DEC-10: legacy anonymous write đã RETIRE. Deterministic 410,
// không parse body, không rate-limit call, không Prisma, không service — canonical
// path là POST /api/public/jobs/{slug}/applications.
export function POST(): NextResponse {
  return retiredApplyEndpointResponse();
}
