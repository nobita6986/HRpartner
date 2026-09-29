/**
 * /api/admin/my-claimed-candidates/route.ts
 *
 * P1-A0.4 canonical Recruiter Workbench MINE rail (correction batch 1/1).
 *
 * GET /api/admin/my-claimed-candidates
 *
 * Returns the caller's ACTIVE LaborProfileHandlingAssignments where
 * source = `ORDER_RECRUITER_CLAIM`, projected through the canonical chain
 * `handling -> laborProfile -> placementCase -> candidateSubmission ->
 * slot -> staffingOrder`. Phone numbers are masked server-side.
 *
 * Auth: HR_STAFF (own assignments), HR_MANAGER / ADMIN (read-only, full).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { listMyClaimedCandidates } from '@/src/domains/talent/recruiter-assignment.service';

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
    return NextResponse.json(
      { error: 'ROLE_NOT_PERMITTED', message: `Role ${ctx.role} cannot view claimed candidates` },
      { status: 403 },
    );
  }
  try {
    const items = await withDbContext(getPrisma(), ctx, (tx) =>
      listMyClaimedCandidates(tx, ctx.userId),
    );
    return NextResponse.json({ items, total: items.length }, { status: 200 });
  } catch (error) {
    console.error('[api/admin/my-claimed-candidates] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list claimed candidates' }, { status: 500 });
  }
}
