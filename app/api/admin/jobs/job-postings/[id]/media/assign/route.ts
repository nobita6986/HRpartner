/**
 * /api/admin/jobs/job-postings/[id]/media/assign
 *   - POST → attach một media có sẵn (PUBLIC) vào JobPosting. Body: { mediaId, order?, cover? }.
 *
 * Auth: ALLOWED_MUTATION_ROLES. Idempotency-Key required (UUID) để tránh double-attach
 * khi network retry. Validation fail-fast trên type-jail trước khi mở transaction.
 *
 * hrp-t1c-jobposting-media-youtube (RQ-06, DEC-05, DEC-06)
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { IdempotencyConflictError, withIdempotency } from '@/src/shared/integrity/idempotency';
import { AuthoringError } from '@/src/domains/staffing/job-posting-authoring.service';
import {
  assignMediaToJobPosting,
  JobPostingMediaError,
} from '@/src/domains/staffing/job-posting-media.service';
import { ALLOWED_MUTATION_ROLES } from '@/src/domains/staffing/job-posting-authoring.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/jobs/job-postings/[id]/media/assign';

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
      { error: 'FORBIDDEN', message: `Role ${authCtx.role} không có quyền gán media JobPosting.` },
      { status: 403 },
    );
  }

  const idempotencyKey = (
    req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? ''
  ).trim();
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_REQUIRED', message: 'Header Idempotency-Key is required to attach JobPosting media' },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  let body: { mediaId?: unknown; order?: unknown; cover?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return badRequest('Body không phải JSON hợp lệ.');
  }

  if (typeof body.mediaId !== 'string' || body.mediaId.length === 0) {
    return badRequest('mediaId là bắt buộc (chuỗi).', 'mediaId');
  }
  if (body.order !== undefined && (typeof body.order !== 'number' || !Number.isInteger(body.order) || body.order < 0)) {
    return badRequest('order phải là số nguyên không âm (hoặc bị bỏ qua).', 'order');
  }
  if (body.cover !== undefined && typeof body.cover !== 'boolean') {
    return badRequest('cover phải là boolean (hoặc bị bỏ qua).', 'cover');
  }

  const requestBody = [
    id,
    body.mediaId,
    body.order ?? null,
    body.cover ?? null,
  ];

  try {
    const outcome = await withDbContext(getPrisma(), authCtx, async (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE_KEY,
        actorId: authCtx.userId,
        key: idempotencyKey,
        requestBody,
        handler: async () => {
          const assignment = await assignMediaToJobPosting(tx, authCtx, id, {
            mediaId: body.mediaId as string,
            order: typeof body.order === 'number' ? body.order : undefined,
            cover: typeof body.cover === 'boolean' ? body.cover : undefined,
          });
          return { body: { assignment }, statusCode: 201 };
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
    console.error('[api/admin/jobs/job-postings/[id]/media/assign POST] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to attach media to JobPosting' }, { status: 500 });
  }
}
