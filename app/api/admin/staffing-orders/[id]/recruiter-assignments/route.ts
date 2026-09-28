/**
 * GET  /api/admin/staffing-orders/[id]/recruiter-assignments
 * POST /api/admin/staffing-orders/[id]/recruiter-assignments
 *
 * P1-A0.4 Scoped Recruiter Authority — list / assign routes.
 *
 * DEC-04 / DEC-08:
 *   - GET is admin/HR_MANAGER/HR_STAFF (HR_STAFF sees only their own rows
 *     via RLS).
 *   - POST requires Idempotency-Key (UUID v4 string) header. The Idempotency-
 *     Key scope is (actorId, route, key). Replay returns the original
 *     response without touching the DB.
 *   - server-derived actor: ctx.userId (the role gate is in the service).
 *
 * The body shape (POST):
 *   { "recruiterUserId": "<userId>" }
 *
 * The route returns 201 with the assignment row, 409 on duplicate, 404 if
 * the order or the recruiter is missing, 400 if the user is not HR_STAFF.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { withIdempotency, IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import {
  assignRecruiterToOrder,
  listOrderRecruiterAssignments,
  RecruiterAssignmentError,
} from '@/src/domains/talent/recruiter-assignment.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY_POST = 'POST:/api/admin/staffing-orders/[id]/recruiter-assignments';
const ROUTE_KEY_GET = 'GET:/api/admin/staffing-orders/[id]/recruiter-assignments';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolved = await params;
  const staffingOrderId = resolved.id;
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
    return NextResponse.json({ error: 'ROLE_NOT_PERMITTED', message: `Role ${ctx.role} cannot view recruiter assignments` }, { status: 403 });
  }
  try {
    const items = await withDbContext(getPrisma(), ctx, (tx) =>
      listOrderRecruiterAssignments(tx, staffingOrderId)
    );
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error('[api/admin/staffing-orders/recruiter-assignments] GET error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list recruiter assignments' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolved = await params;
  const staffingOrderId = resolved.id;

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
    return NextResponse.json({ error: 'ROLE_NOT_PERMITTED', message: `Role ${ctx.role} cannot assign recruiters` }, { status: 403 });
  }

  const idempotencyKey = (req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? '').trim();
  if (!idempotencyKey || !UUID_V4.test(idempotencyKey)) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Header Idempotency-Key (UUID v4) is required' },
      { status: 400 }
    );
  }

  let body: { recruiterUserId?: string; reason?: string };
  try {
    body = (await req.json()) as { recruiterUserId?: string; reason?: string };
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.recruiterUserId || typeof body.recruiterUserId !== 'string') {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'recruiterUserId is required' }, { status: 400 });
  }

  try {
    const result = await withDbContext(getPrisma(), ctx, (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE_KEY_POST,
        actorId: ctx.userId,
        key: idempotencyKey,
        requestBody: { staffingOrderId, recruiterUserId: body.recruiterUserId, reason: body.reason ?? null },
        handler: async () => ({
          body: await assignRecruiterToOrder(tx, {
            staffingOrderId,
            recruiterUserId: body.recruiterUserId!,
            actorRole: ctx.role,
            actorId: ctx.userId,
            reason: body.reason,
          }),
          statusCode: 201,
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
    console.error('[api/admin/staffing-orders/recruiter-assignments] POST error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to assign recruiter' }, { status: 500 });
  }
}
