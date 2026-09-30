/**
 * /api/admin/staffing/orders/[orderId]/recruiters/route.ts
 *
 * P1-A0.4 canonical routes (correction batch 1/1):
 *   - GET  /api/admin/staffing/orders/[orderId]/recruiters
 *   - POST /api/admin/staffing/orders/[orderId]/recruiters
 *
 * ADMIN/HR_MANAGER only.
 *
 * POST body:
 *   { "recruiterUserId": "<uuid>", "reason"?: "<text>" }
 *
 * GET response: list of all assignments (ACTIVE + REVOKED) on the order.
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

const ROUTE_KEY_POST = 'POST:/api/admin/staffing/orders/[orderId]/recruiters';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if (ctx.role !== 'ADMIN' && ctx.role !== 'HR_MANAGER') {
    return NextResponse.json(
      { error: 'ROLE_NOT_PERMITTED', message: `Role ${ctx.role} cannot view recruiter assignments on a staffing order` },
      { status: 403 },
    );
  }
  try {
    const items = await withDbContext(getPrisma(), ctx, (tx) =>
      listOrderRecruiterAssignments(tx, orderId),
    );
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    if (error instanceof RecruiterAssignmentError) {
      return NextResponse.json(
        { error: error.code, message: error.message, details: error.details },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/staffing/orders/recruiters] GET error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list recruiter assignments' }, { status: 500 });
  }
}

export async function POST(
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
  if (ctx.role !== 'ADMIN' && ctx.role !== 'HR_MANAGER') {
    return NextResponse.json(
      { error: 'ROLE_NOT_PERMITTED', message: `Role ${ctx.role} cannot assign recruiters to a staffing order` },
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
        requestBody: { orderId, recruiterUserId: body.recruiterUserId, reason: body.reason ?? null },
        handler: async () => ({
          body: await assignRecruiterToOrder(tx, {
            staffingOrderId: orderId,
            recruiterUserId: body.recruiterUserId!,
            actorRole: ctx.role,
            actorId: ctx.userId,
            reason: body.reason,
          }),
          statusCode: 201,
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
    console.error('[api/admin/staffing/orders/recruiters] POST error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to assign recruiter' }, { status: 500 });
  }
}
