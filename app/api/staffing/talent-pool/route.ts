/**
 * GET /api/staffing/talent-pool — Unassigned worker pool (STEP-06, RQ-05).
 *
 * Auth: cookie hrp_token (Phase 1).
 * 401: thiếu/sai token.
 * 403: không có CAN_VIEW_UNASSIGNED_POOL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { queryTalentPool, TalentPoolError } from '@/src/domains/staffing/talent-pool.repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

  const prisma = getPrisma();
  try {
    const result = await queryTalentPool(prisma, ctx, { page, pageSize });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof TalentPoolError) {
      return NextResponse.json(
        { error: e.code, message: e.message },
        { status: e.code === 'PERMISSION_DENIED' ? 403 : 500 },
      );
    }
    console.error('[api/staffing/talent-pool GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to get talent pool' }, { status: 500 });
  }
}
