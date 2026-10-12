/**
 * /api/admin/jobs/job-postings/[id]/media/[assignmentId]
 *   - DELETE → detach một assignment khỏi JobPosting. Trả 404 nếu assignment
 *     không thuộc JobPosting này (no existence oracle — không leak assignment
 *     thuộc owner khác).
 *
 * Idempotency-Key không bắt buộc (DELETE idempotent theo HTTP semantics).
 *
 * hrp-t1c-jobposting-media-youtube (RQ-07)
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthoringError } from '@/src/domains/staffing/job-posting-authoring.service';
import {
  detachMediaFromJobPosting,
  JobPostingMediaError,
} from '@/src/domains/staffing/job-posting-media.service';
import { ALLOWED_MUTATION_ROLES } from '@/src/domains/staffing/job-posting-authoring.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
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
      { error: 'FORBIDDEN', message: `Role ${authCtx.role} không có quyền detach JobPosting media.` },
      { status: 403 },
    );
  }

  const { id, assignmentId } = await ctx.params;
  try {
    const prisma = getPrisma();
    const result = await withDbContext(prisma, authCtx, async (tx) =>
      detachMediaFromJobPosting(tx, authCtx, id, assignmentId),
    );
    revalidateTag(`job-posting:${id}`);
    revalidateTag('media');
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
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
    console.error('[api/admin/jobs/job-postings/[id]/media/[assignmentId] DELETE] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to detach JobPosting media' }, { status: 500 });
  }
}
