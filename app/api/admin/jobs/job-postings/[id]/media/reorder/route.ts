/**
 * /api/admin/jobs/job-postings/[id]/media/reorder
 *   - POST → set thứ tự gallery theo mảng assignmentId do client gửi lên. Body:
 *       { orderedAssignmentIds: string[] }
 *
 * Idempotency-Key required. Service so sánh current set với orderedAssignmentIds;
 * mismatch (thiếu/thừa/trùng) → 400.
 *
 * hrp-t1c-jobposting-media-youtube (RQ-08, DEC-07)
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { IdempotencyConflictError, withIdempotency } from '@/src/shared/integrity/idempotency';
import { AuthoringError } from '@/src/domains/staffing/job-posting-authoring.service';
import {
  reorderMediaForJobPosting,
  JobPostingMediaError,
} from '@/src/domains/staffing/job-posting-media.service';
import { ALLOWED_MUTATION_ROLES } from '@/src/domains/staffing/job-posting-authoring.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/jobs/job-postings/[id]/media/reorder';

function badRequest(message: string, field?: string): NextResponse {
  return NextResponse.json({ error: 'INVALID_INPUT', message, field }, { status: 400 });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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
      { error: 'FORBIDDEN', message: `Role ${authCtx.role} không có quyền sắp xếp JobPosting media.` },
      { status: 403 },
    );
  }

  const idempotencyKey = (
    req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? ''
  ).trim();
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_REQUIRED', message: 'Header Idempotency-Key is required to reorder JobPosting media' },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  let body: { orderedAssignmentIds?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return badRequest('Body không phải JSON hợp lệ.');
  }

  if (!Array.isArray(body.orderedAssignmentIds)) {
    return badRequest('orderedAssignmentIds là bắt buộc (mảng string).', 'orderedAssignmentIds');
  }
  for (const aid of body.orderedAssignmentIds as unknown[]) {
    if (typeof aid !== 'string' || aid.length === 0) {
      return badRequest('orderedAssignmentIds phải là mảng id không rỗng.', 'orderedAssignmentIds');
    }
  }
  if (new Set(body.orderedAssignmentIds as string[]).size !== (body.orderedAssignmentIds as string[]).length) {
    return badRequest('orderedAssignmentIds chứa id trùng lặp.', 'orderedAssignmentIds');
  }

  const orderedAssignmentIds = body.orderedAssignmentIds as string[];
  const requestBody = [id, ...orderedAssignmentIds];

  try {
    const outcome = await withDbContext(getPrisma(), authCtx, async (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE_KEY,
        actorId: authCtx.userId,
        key: idempotencyKey,
        requestBody,
        handler: async () => {
          const items = await reorderMediaForJobPosting(tx, authCtx, id, orderedAssignmentIds);
          return { body: { items } };
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
    console.error('[api/admin/jobs/job-postings/[id]/media/reorder POST] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to reorder JobPosting media' }, { status: 500 });
  }
}
