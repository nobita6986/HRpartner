/**
 * /api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke/route.ts
 *
 * P1-A0.4 canonical revoke route (correction batch 1/1).
 *
 * ADMIN/HR_MANAGER only. Revokes the recruiter assignment on the order.
 * The route is canonical: server derives orderId from the URL and the
 * assignment is loaded by id inside the locked transaction.
 *
 * POST body:
 *   { "reason": "<non-empty text>" }
 *
 * Returns the revoked row on success.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { withIdempotency, IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import {
  revokeRecruiterFromOrder,
  RecruiterAssignmentError,
} from '@/src/domains/talent/recruiter-assignment.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string; assignmentId: string }> },
) {
  const resolved = await params;
  const { orderId, assignmentId } = resolved;

  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'auth failed' }, { status: 500 });
  }
  if (ctx.role !== 'ADMIN' && ctx.role !== 'HR_MANAGER') {
    return NextResponse.json(
      { error: 'ROLE_NOT_PERMITTED', message: `Role ${ctx.role} cannot revoke recruiter assignments on this order` },
      { status: 403 },
    );
  }

  const idempotencyKey = (req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? '').trim();
  if (!idempotencyKey || !UUID_V4.test(idempotencyKey)) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Header Idempotency-Key (UUID v4) is required' },
      { status: 400 },
    );
  }

  let body: { reason?: string };
  try {
    body = (await req.json()) as { reason?: string };
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'Invalid JSON body' }, { status: 400 });
  }
  const reason = (body.reason ?? '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'reason is required' }, { status: 400 });
  }

  try {
    const result = await withDbContext(getPrisma(), ctx, (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE_KEY,
        actorId: ctx.userId,
        key: idempotencyKey,
        requestBody: { orderId, assignmentId, reason },
        handler: async () => ({
          body: await revokeRecruiterFromOrder(tx, {
            staffingOrderId: orderId,
            assignmentId,
            actorRole: ctx.role,
            actorId: ctx.userId,
            reason,
          }),
          statusCode: 200,
        }),
      }),
    );
    return NextResponse.json(
      { assignment: result.body, replayed: result.replayed },
      { status: result.statusCode },
    );
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: error.message }, { status: 409 });
    }
    if (error instanceof RecruiterAssignmentError) {
      return NextResponse.json(
        { error: error.code, message: error.message, details: error.details },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/staffing/orders/recruiters/revoke] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to revoke recruiter assignment' }, { status: 500 });
  }
}

/**
 * NOTE: assertAssignmentMatchesOrder was moved to the service layer
 * (`recruiter-assignment.service.ts`) as a defensive guard inside the
 * canonical revoke tx — it is no longer exported from this route file
 * because Next.js route files can only export route methods (GET/POST/etc.).
 */
