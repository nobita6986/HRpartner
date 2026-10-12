/**
 * /api/admin/jobs/job-postings/[id]/media
 *   - GET  → list media assignments của JobPosting (cover first, order asc).
 *
 * Auth: ALLOWED_MUTATION_ROLES (ADMIN / HR_MANAGER / HR_STAFF — scoped-recruiter
 * guard enforced bởi `getJobPostingForAuthoring` cho HR_STAFF).
 *
 * hrp-t1c-jobposting-media-youtube (RQ-05, DEC-05)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthoringError } from '@/src/domains/staffing/job-posting-authoring.service';
import { listJobPostingMedia, JobPostingMediaError } from '@/src/domains/staffing/job-posting-media.service';
import { ALLOWED_MUTATION_ROLES } from '@/src/domains/staffing/job-posting-authoring.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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
      { error: 'FORBIDDEN', message: `Role ${authCtx.role} không có quyền đọc JobPosting media.` },
      { status: 403 },
    );
  }
  const { id } = await ctx.params;
  try {
    const prisma = getPrisma();
    const items = await withDbContext(prisma, authCtx, async (tx) =>
      listJobPostingMedia(tx, authCtx, id),
    );
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
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
    console.error('[api/admin/jobs/job-postings/[id]/media GET] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list JobPosting media' }, { status: 500 });
  }
}
