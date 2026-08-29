import { NextResponse } from 'next/server';
import { retiredApplyEndpointResponse } from '@/src/shared/security/retired-endpoint';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// OPS-06A / RQ-08 / DEC-10: legacy anonymous apply đã RETIRE. Deterministic 410 —
// module này KHÔNG import Prisma/service nào, nên không thể ghi ẩn danh. Canonical:
// POST /api/public/jobs/{slug}/applications.
export function POST(): NextResponse {
  return retiredApplyEndpointResponse();
}
