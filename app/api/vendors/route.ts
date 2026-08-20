/**
 * GET /api/vendors — M7 Admin Vendors
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VIEWER_ROLES = new Set(['ADMIN', 'SALE', 'HR_MANAGER', 'PM']);
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
    const [rows, total] = await Promise.all([
      prisma.vendor.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      prisma.vendor.count({ where }),
    ]);
    return NextResponse.json({ vendors: rows, total, take, skip });
  } catch (err) {
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
    const vendor = await prisma.vendor.create({
      data: { code, name, taxCode: taxCode ?? null, phone: phone ?? null, email: email ?? null, area: area ?? null, status: status ?? 'ACTIVE' },
    });
    return NextResponse.json({ vendor }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'CONFLICT', message: 'Ma vendor da ton tai.' }, { status: 409 });
    console.error('[api/vendors POST] error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create vendor' }, { status: 500 });
  }
}
