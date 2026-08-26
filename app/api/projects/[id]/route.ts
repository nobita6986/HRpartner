/**
 * PUT /api/projects/[id] — M7 Admin Projects CRUD
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['ADMIN', 'PM', 'HR_MANAGER']);

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!ADMIN_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen sua du an.' },
      { status: 403 },
    );
  }

  const { id } = await params;
  const prisma = getPrisma();
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, clientCompanyId, pmUserId, siteAddress, startDate, endDate, status, quota } = body;

  try {
    // V5-M1-06c / RQ-03: update-by-id vo L1 (DEC-03) -> withDbContext (L2-only).
    // RLS backstop: project ngoai pham vi -> P2025 -> 404 (cross-project deny).
    const project = await withDbContext(prisma, ctx, (tx) =>
      tx.project.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(clientCompanyId !== undefined && { clientCompanyId }),
          ...(pmUserId !== undefined && { pmUserId }),
          ...(siteAddress !== undefined && { siteAddress }),
          ...(startDate !== undefined && { startDate: new Date(startDate) }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(status !== undefined && { status }),
          ...(quota !== undefined && { quota }),
        },
      }),
    );
    return NextResponse.json({ project });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Project not found.' }, { status: 404 });
    }
    console.error('[api/projects/[id] PUT] error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to update project' }, { status: 500 });
  }
}
