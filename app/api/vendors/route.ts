/**
 * GET /api/vendors — M7 Admin Vendors (hardened V5-M1-06b: RQ-08/DEC-08).
 * POST /api/vendors — create vendor.
 *
 * DEC-08: PM KHÔNG được xem Vendor master → VIEWER_ROLES bỏ PM.
 * Boundary canonical: GET qua `withAuthorizedDbReadOnly` (L1 `buildVendorScope`
 * root/SALE→`{}`; + L2 RLS `vendors`). POST qua `withDbContext` (L2-only, create
 * vỡ L1 theo DEC-03; RLS WITH CHECK ⊇ {root, ACCOUNTANT, SALE}).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VIEWER_ROLES = new Set(['ADMIN', 'SALE', 'HR_MANAGER']);
const ADMIN_ROLES = new Set(['ADMIN', 'SALE']);

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
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen xem.' }, { status: 403 });
  }

  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get('take') ?? '50', 10), 200);
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);
  const status = searchParams.get('status') ?? undefined;
  const search = searchParams.get('search') ?? undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const { rows, total } = await withAuthorizedDbReadOnly(prisma, ctx, async (tx) => {
      const rows = await tx.vendor.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip });
      const total = await tx.vendor.count({ where });
      return { rows, total };
    });
    return NextResponse.json({ vendors: rows, total, take, skip });
  } catch (err) {
    if (err instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/vendors] error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to query vendors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen tao vendor.' }, { status: 403 });
  }

  const prisma = getPrisma();
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid JSON' }, { status: 400 });
  }

  const { code, name, taxCode, phone, email, area, status } = body;
  if (!code || !name) {
    return NextResponse.json({ error: 'VALIDATION', message: 'code và name la bat buoc.' }, { status: 400 });
  }

  try {
    const vendor = await withDbContext(prisma, ctx, (tx) =>
      tx.vendor.create({
        data: { code, name, taxCode: taxCode ?? null, phone: phone ?? null, email: email ?? null, area: area ?? null, status: status ?? 'ACTIVE' },
      }),
    );
    return NextResponse.json({ vendor }, { status: 201 });
  } catch (err: any) {
    if (err instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (err.code === 'P2002') return NextResponse.json({ error: 'CONFLICT', message: 'Ma vendor da ton tai.' }, { status: 409 });
    console.error('[api/vendors POST] error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create vendor' }, { status: 500 });
  }
}
