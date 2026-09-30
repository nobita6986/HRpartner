/**
 * /api/admin/my-claimed-candidates/route.ts
 *
 * P1-A0.4 narrow assignment-aware endpoint (F-04 honest classification).
 *
 * GET /api/admin/my-claimed-candidates
 *
 * This endpoint is NOT the Recruiter Workbench MINE rail. It is a
 * **narrow, assignment-aware** view of the caller's own
 * `LaborProfileHandlingAssignment` rows where `source='ORDER_RECRUITER_CLAIM'`
 * and `status='ACTIVE'`. The canonical Recruiter Workbench MINE rail is
 * `GET /api/admin/recruiter-workbench?view=MINE` (served by
 * `getRecruiterWorkbenchList` in `recruiter-workbench.read-service.ts`),
 * which is placement-case-centric and is the user-facing MINE UI surface.
 *
 * This endpoint exists for:
 *   - Programmatic access by the recruiter after a `POST /api/admin/
 *     applications/[submissionId]/claim` (the round-trip the recruiter
 *     flow needs to confirm the claim landed in the DB).
 *   - A narrower projection (no placement case, no DTO derivation, no
 *     next-action / age / overdue columns) that the claim flow can call
 *     without paying the Workbench DTO cost.
 *
 * F-05 contact-data boundary: the active winning handler (always the
 * caller for rows returned by this endpoint, because the SQL filter
 * restricts to `assigneeUserId = caller`) receives the FULL phone value
 * (recruiter-contact field needed to call the candidate). HR_MANAGER /
 * ADMIN see the FULL phone only when CAN_VIEW_WORKER_SENSITIVE is granted.
 * CCCD image and raw evidence are NEVER delivered on this surface.
 *
 * Auth: HR_STAFF (own assignments), HR_MANAGER / ADMIN (read-only).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
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
    // F-05: resolve permissions once (after auth, before service call).
    // HR_STAFF (own assigned) → canSeeSensitive = true (active handler).
    // HR_MANAGER / ADMIN → canSeeSensitive = perms.has('CAN_VIEW_WORKER_SENSITIVE').
    const perms = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
    const canSeeSensitive = ctx.role === 'HR_STAFF' || perms.has('CAN_VIEW_WORKER_SENSITIVE');
    const items = await withDbContext(getPrisma(), ctx, (tx) =>
      listMyClaimedCandidates(tx, ctx.userId, { canSeeSensitive, actorRole: ctx.role }),
    );
    return NextResponse.json({ items, total: items.length }, { status: 200 });
  } catch (error) {
    console.error('[api/admin/my-claimed-candidates] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list claimed candidates' }, { status: 500 });
  }
}
