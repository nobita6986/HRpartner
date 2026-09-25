/**
 * POST /api/admin/jobs/job-postings/[id]/publish — P1-A0 publish.
 *
 * Body: { expectedRevision: number }
 *
 * - Mutation roles: ADMIN/HR_MANAGER/HR_STAFF (validated in service).
 * - Publish succeeds only when linked JobOpening.status = OPEN.
 * - Title + descriptionJson required (service guard).
 * - Idempotency-Key required (UUID).
 *
 * Errors:
 *   - 409 INVALID_STATE_TRANSITION / INVALID_REVISION / JOB_OPENING_NOT_OPEN
 *   - 400 INVALID_INPUT (missing title or description)
 *   - 403 PERMISSION_DENIED (role gate)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { IdempotencyConflictError, withIdempotency } from '@/src/shared/integrity/idempotency';
import {
  AuthoringError,
  publishJobPosting,
} from '@/src/domains/staffing/job-posting-authoring.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/jobs/job-postings/[id]/publish';

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

  const idempotencyKey = (
    req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? ''
  ).trim();
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_REQUIRED', message: 'Header Idempotency-Key is required to publish' },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'Body không phải JSON hợp lệ.' }, { status: 400 });
  }
  for (const key of Object.keys(body)) {
    if (key !== 'expectedRevision') {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: `Trường không cho phép: ${key}.` },
        { status: 400 },
      );
    }
  }
  const expectedRevision = body.expectedRevision;
  if (typeof expectedRevision !== 'number' || !Number.isInteger(expectedRevision) || expectedRevision < 1) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', message: 'expectedRevision phải là số nguyên dương.' },
      { status: 400 },
    );
  }

  const requestBody = [id, expectedRevision];

  try {
    const outcome = await withDbContext(getPrisma(), authCtx, async (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE_KEY,
        actorId: authCtx.userId,
        key: idempotencyKey,
        requestBody,
        handler: async () => {
          const posting = await publishJobPosting(tx, authCtx, { jobPostingId: id, expectedRevision });
          return { body: { jobPosting: posting } };
        },
      }),
    );
    return NextResponse.json(
      { ...(outcome.body as Record<string, unknown>), replayed: outcome.replayed },
      { status: outcome.statusCode },
    );
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: error.message }, { status: 409 });
    }
    if (error instanceof AuthoringError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/jobs/job-postings/[id]/publish] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to publish JobPosting' }, { status: 500 });
  }
}
