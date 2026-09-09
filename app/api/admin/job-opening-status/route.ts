/**
 * GET /api/admin/job-opening-status — V6 Phase 1 STEP-03
 *
 * Trả về số lượng JobOpening theo status (DRAFT/OPEN/FILLED/CANCELLED).
 *
 * Auth: yêu cầu role trong VIEWER_ROLES (giống /api/projects).
 * KHÔNG nhận query string.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { summarizeAllJobOpenings } from '@/src/domains/staffing/job-opening-status';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// VIEWER_ROLES giống hệ /api/projects (V6-DEC-011)
const VIEWER_ROLES = new Set([
  'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'ACCOUNTANT', 'DIRECTOR',
]);

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!VIEWER_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen xem trang thai job opening.' },
      { status: 403 },
    );
  }

  try {
    const prisma = getPrisma();
    const summary = await summarizeAllJobOpenings(prisma);
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[api/admin/job-opening-status] query error:', err);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to query job opening status' },
      { status: 500 },
    );
  }
}
