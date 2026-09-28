/**
 * GET /api/admin/my-staffing-orders
 *
 * P1-A0.4 — the recruiter's "My Active Staffing Orders" surface.
 *
 * Returns the caller's ACTIVE `StaffingOrderRecruiterAssignment` rows.
 * Used by the workbench MINE rail to render the recruiter's orders.
 *
 * Auth: HR_STAFF (self) or HR_MANAGER / ADMIN (self for testing).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { listMyActiveStaffingOrders } from '@/src/domains/talent/recruiter-assignment.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
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
    return NextResponse.json({ error: 'ROLE_NOT_PERMITTED', message: `Role ${ctx.role} cannot view my staffing orders` }, { status: 403 });
  }
  try {
    const items = await withDbContext(getPrisma(), ctx, (tx) =>
      listMyActiveStaffingOrders(tx, ctx.userId)
    );
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error('[api/admin/my-staffing-orders] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list my staffing orders' }, { status: 500 });
  }
}
