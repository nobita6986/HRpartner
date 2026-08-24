/**
 * GET /api/jobs/submissions -- List CandidateSubmissions (admin)
 * GET /api/jobs/claims    -- List SourceClaims (admin)
 *
 * Phase 5 UAT/Cutover STEP-01 (RQ-01).
 *
 * Auth: cookie hrp_token.
 * Roles: ADMIN, HR_MANAGER, HR_STAFF, VENDOR_ADMIN, VENDOR_STAFF.
 */
import { CandidateSubmissionStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  listSubmissions,
  listClaims,
  SubmissionServiceError,
} from '@/src/domains/staffing/submission.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LIST_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'VENDOR_ADMIN', 'VENDOR_STAFF'] as const);
const STATUSES = new Set(Object.values(CandidateSubmissionStatus));

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const role = ctx.role as typeof LIST_ROLES extends Set<infer T> ? T : never;
  if (!LIST_ROLES.has(role)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền` }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab'); // 'submissions' | 'claims'
  const projectId = searchParams.get('projectId') ?? undefined;
  const rawStatus = searchParams.get('status');
  const status = rawStatus && STATUSES.has(rawStatus as CandidateSubmissionStatus)
    ? rawStatus as CandidateSubmissionStatus
    : undefined;
  const accepted = searchParams.get('accepted');
  const take = Math.min(50, parseInt(searchParams.get('take') ?? '20', 10));
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);

  const prisma = getPrisma();

  try {
    if (tab === 'claims' || !tab) {
      // Default to claims tab for the claims page
      const { rows, total } = await withDbContext(prisma, ctx, (tx) =>
        listClaims(tx, ctx, { take, skip, accepted: accepted === 'true' ? true : accepted === 'false' ? false : undefined }),
      );
      return NextResponse.json({ rows, total, take, skip });
    } else {
      const { rows, total } = await withDbContext(prisma, ctx, (tx) =>
        listSubmissions(tx, ctx, { take, skip, projectId, status }),
      );
      return NextResponse.json({ rows, total, take, skip });
    }
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    if (e instanceof SubmissionServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    console.error('[api/jobs/submissions GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list' }, { status: 500 });
  }
}
