/**
 * POST /api/admin/recruiter-assignments/[id]/revoke
 *
 * P1-A0.4 Scoped Recruiter Authority — revoke route.
 *
 * DEC-04 / DEC-05:
 *   - HR_STAFF may revoke their own ORDER_RECRUITER_CLAIM rows.
 *   - HR_MANAGER / ADMIN may revoke any row.
 *   - Idempotency-Key (UUID v4) is required; replay returns the original
 *     response (without touching the DB) and the row remains REVOKED.
 *   - server-derived actor: ctx.userId.
 *
 * The body shape (POST):
 *   { "reason": "<non-empty string>" }
 *
 * Returns 200 with the revoked row, 404 if the row is missing, 400 if
 * reason is empty, 403 for non-permitted roles.
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

const ROUTE_KEY = 'POST:/api/admin/recruiter-assignments/[id]/revoke';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolved = await params;
  const assignmentId = resolved.id;

  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'auth failed' }, { status: 500 });
  }
  if (ctx.role !== 'ADMIN' && ctx.role !== 'HR_MANAGER' && ctx.role !== 'HR_STAFF') {
    return NextResponse.json({ error: 'ROLE_NOT_PERMITTED', message: `Role ${ctx.role} cannot revoke recruiter assignments` }, { status: 403 });
  }

  const idempotencyKey = (req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? '').trim();
  if (!idempotencyKey || !UUID_V4.test(idempotencyKey)) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Header Idempotency-Key (UUID v4) is required' },
      { status: 400 }
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
        requestBody: { assignmentId, reason },
        handler: async () => ({
          body: await revokeRecruiterFromOrder(tx, {
            assignmentId,
            actorRole: ctx.role,
            actorId: ctx.userId,
            reason,
          }),
          statusCode: 200,
        }),
      })
    );
    return NextResponse.json(
      { assignment: result.body, replayed: result.replayed },
      { status: result.statusCode }
    );
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: error.message }, { status: 409 });
    }
    if (error instanceof RecruiterAssignmentError) {
      return NextResponse.json(
        { error: error.code, message: error.message, details: error.details },
        { status: error.httpStatus }
      );
    }
    console.error('[api/admin/recruiter-assignments/revoke] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to revoke recruiter assignment' }, { status: 500 });
  }
}
