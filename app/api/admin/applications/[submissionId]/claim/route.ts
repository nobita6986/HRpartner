/**
 * /api/admin/applications/[submissionId]/claim/route.ts
 *
 * P1-A0.4 canonical candidate-claim route (correction batch 1/1).
 *
 * POST /api/admin/applications/[submissionId]/claim
 *
 * HR_STAFF only — assigned recruiters only. The order is derived server-side
 * via `CandidateSubmission -> slot -> StaffingOrder`. No client-supplied
 * orderId or profileId is honored.
 *
 * Idempotency: requires Idempotency-Key (UUID v4). Replay returns the
 * original outcome. Race losers receive 409 HANDLING_ALREADY_CLAIMED.
 *
 * On success: returns the new LaborProfileHandlingAssignment with
 * source = `ORDER_RECRUITER_CLAIM`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { withIdempotency, IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import {
  claimCandidateSubmission,
  RecruiterAssignmentError,
} from '@/src/domains/talent/recruiter-assignment.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/applications/[submissionId]/claim';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const resolved = await params;
  const submissionId = resolved.submissionId;
  if (!UUID_V4.test(submissionId)) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', message: 'submissionId must be UUID v4' },
      { status: 400 },
    );
  }

  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'auth failed' }, { status: 500 });
  }
  if (ctx.role !== 'HR_STAFF') {
    return NextResponse.json(
      { error: 'ROLE_NOT_PERMITTED', message: `Role ${ctx.role} cannot claim candidate submissions` },
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

  try {
    const result = await withDbContext(getPrisma(), ctx, (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE_KEY,
        actorId: ctx.userId,
        key: idempotencyKey,
        requestBody: { submissionId },
        handler: async () => ({
          body: await claimCandidateSubmission(tx, {
            submissionId,
            actorRole: ctx.role,
            actorId: ctx.userId,
          }),
          statusCode: 201,
        }),
      }),
    );
    return NextResponse.json(
      { claim: result.body, replayed: result.replayed },
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
    console.error('[api/admin/applications/claim] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to claim candidate' }, { status: 500 });
  }
}
