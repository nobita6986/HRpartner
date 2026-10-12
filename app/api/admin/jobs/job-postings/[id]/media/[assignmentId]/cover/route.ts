/**
 * /api/admin/jobs/job-postings/[id]/media/[assignmentId]/cover
 *   - POST → set 1 assignment làm cover duy nhất của JobPosting. Service chạy
 *     `clear-cover-all` + `set-cover-one` trong 1 transaction (race-guard).
 *
 * Idempotency-Key required.
 *
 * hrp-t1c-jobposting-media-youtube (RQ-09, DEC-06)
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { IdempotencyConflictError, withIdempotency } from '@/src/shared/integrity/idempotency';
import { AuthoringError } from '@/src/domains/staffing/job-posting-authoring.service';
import {
  setCoverMediaForJobPosting,
  JobPostingMediaError,
} from '@/src/domains/staffing/job-posting-media.service';
import { ALLOWED_MUTATION_ROLES } from '@/src/domains/staffing/job-posting-authoring.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/jobs/job-postings/[id]/media/[assignmentId]/cover';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; assignmentId: string }> },
) {
  let authCtx;
  try {
    authCtx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }
  if (!ALLOWED_MUTATION_ROLES.has(authCtx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: `Role ${authCtx.role} không có quyền đặt cover JobPosting media.` },
      { status: 403 },
    );
  }

  const idempotencyKey = (
    req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? ''
  ).trim();
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_REQUIRED', message: 'Header Idempotency-Key is required to set JobPosting cover' },
      { status: 400 },
    );
  }

  const { id, assignmentId } = await ctx.params;
  const requestBody = [id, assignmentId];

  try {
    const outcome = await withDbContext(getPrisma(), authCtx, async (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE_KEY,
        actorId: authCtx.userId,
        key: idempotencyKey,
        requestBody,
        handler: async () => {
          const assignment = await setCoverMediaForJobPosting(tx, authCtx, id, assignmentId);
          return { body: { assignment } };
        },
      }),
    );
    revalidateTag(`job-posting:${id}`);
    revalidateTag('media');
    return NextResponse.json(
      { ...(outcome.body as Record<string, unknown>), replayed: outcome.replayed },
      { status: outcome.statusCode },
    );
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: error.message }, { status: 409 });
    }
    if (error instanceof JobPostingMediaError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    if (error instanceof AuthoringError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/jobs/job-postings/[id]/media/[assignmentId]/cover POST] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to set JobPosting cover' }, { status: 500 });
  }
}
