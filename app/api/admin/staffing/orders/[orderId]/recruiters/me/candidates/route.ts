/**
 * /api/admin/staffing/orders/[orderId]/recruiters/me/candidates/route.ts
 *
 * P1-A0.4 masked unclaimed candidate queue (correction batch 1/1).
 *
 * GET /api/admin/staffing/orders/[orderId]/recruiters/me/candidates
 *
 * HR_STAFF only — assigned recruiters only. Returns the MASKED view of
 * unclaimed candidate submissions on the assigned order. Phone numbers
 * are masked server-side via `maskPhone`. Non-winners receive 403
 * NO_ACTIVE_ORDER_ASSIGNMENT.
 *
 * This is the read surface for the Recruiter Workbench "candidates" rail.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  listMaskedUnclaimedCandidatesForOrder,
  RecruiterAssignmentError,
} from '@/src/domains/talent/recruiter-assignment.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const resolved = await params;
  const orderId = resolved.orderId;

  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'auth failed' }, { status: 500 });
  }
  if (ctx.role !== 'HR_STAFF' && ctx.role !== 'HR_MANAGER' && ctx.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'ROLE_NOT_PERMITTED', message: `Role ${ctx.role} cannot view masked candidate queue` },
      { status: 403 },
    );
  }
  try {
    const items = await withDbContext(getPrisma(), ctx, (tx) =>
      listMaskedUnclaimedCandidatesForOrder(tx, orderId, ctx.userId),
    );
    return NextResponse.json({ items, total: items.length }, { status: 200 });
  } catch (error) {
    if (error instanceof RecruiterAssignmentError) {
      return NextResponse.json(
        { error: error.code, message: error.message, details: error.details },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/staffing/orders/recruiters/me/candidates] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list masked candidates' }, { status: 500 });
  }
}
