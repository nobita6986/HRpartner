/**
 * PUT /api/clients/[id] — M7 Admin Clients CRUD
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// V5-M1-06c / RQ-04: ClientCompany chua co builder -> chi root (ADMIN/HR_MANAGER/
// DIRECTOR) sua duoc. Deviation: bo SALE (truoc {ADMIN,SALE,HR_MANAGER}).
const ADMIN_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR']);

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
      { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen sua khach hang.' },
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

  const { name, taxCode, industry, companySize, status } = body;

  try {
    // V5-M1-06c / RQ-04: update-by-id -> withDbContext (L2-only). RLS backstop:
    // client ngoai pham vi -> P2025 -> 404 (cross-client deny).
    const client = await withDbContext(prisma, ctx, (tx) =>
      tx.clientCompany.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(taxCode !== undefined && { taxCode }),
          ...(industry !== undefined && { industry }),
          ...(companySize !== undefined && { companySize }),
          ...(status !== undefined && { status }),
        },
      }),
    );
    return NextResponse.json({ client });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Client not found.' }, { status: 404 });
    }
    console.error('[api/clients/[id] PUT] error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to update client' }, { status: 500 });
  }
}
