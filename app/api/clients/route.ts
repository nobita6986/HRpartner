/**
 * GET /api/clients — M5 Admin Master Data
 * POST /api/clients — M7 Admin Clients CRUD
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { nextBusinessCode } from '@/src/shared/business-code/business-code';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// V5-M1-06c / RQ-04 / AC-04: ClientCompany CHUA co scope builder (OQ-01 cam tao
// builder moi o 06c). Nen chi ROOT_ROLES (ADMIN/HR_MANAGER/DIRECTOR) doc/ghi duoc:
// L1 passthrough cho root, non-root -> DENY_BY_DEFAULT. Gate root o route (defense-in
// -depth + tranh L1 throw cho authz). Deviation ghi HANDOFF: bo SALE/HR_STAFF/PM/
// ACCOUNTANT khoi view + bo SALE khoi create/update (truoc day ADMIN/SALE/HR_MANAGER).
const VIEWER_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR']);
const ADMIN_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR']);

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
      { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen xem khach hang.' },
      { status: 403 },
    );
  }

  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get('take') ?? '50', 10), 200);
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);
  const search = searchParams.get('search') ?? undefined;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { taxCode: { contains: search, mode: 'insensitive' } },
      { contactEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [rows, total] = await withAuthorizedDbReadOnly(prisma, ctx, (tx) =>
      Promise.all([
        tx.clientCompany.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        tx.clientCompany.count({ where }),
      ]),
    );
    return NextResponse.json({ clients: rows, total, take, skip });
  } catch (err) {
    if (err instanceof AuthScopeError) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Khong co pham vi xem khach hang.' },
        { status: 403 },
      );
    }
    console.error('[api/clients] query error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to query clients' }, { status: 500 });
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
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen tao khach hang.' },
      { status: 403 },
    );
  }

  const prisma = getPrisma();
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid JSON body' }, { status: 400 });
  }

  // T1D DEC-T0-04: server-side generator authority duy nhất. Client KHÔNG
  // được gửi `code` trong body; nếu gửi → 400 SERVER_GENERATED_CODE.
  if (body && typeof body === 'object' && 'code' in body && body.code !== undefined) {
    return NextResponse.json(
      { error: 'SERVER_GENERATED_CODE', message: 'Ma khach hang do server sinh tu dong; khong gui `code` trong body.' },
      { status: 400 },
    );
  }

  const { name, taxCode, industry, companySize, status } = body;

  if (!name) {
    return NextResponse.json(
      { error: 'VALIDATION', message: 'name la bat buoc.' },
      { status: 400 },
    );
  }

  try {
    const client = await withDbContext(prisma, ctx, async (tx) => {
      const code = await nextBusinessCode(tx, 'CLIENT');
      return tx.clientCompany.create({
        data: {
          code,
          name,
          taxCode: taxCode ?? null,
          industry: industry ?? null,
          companySize: companySize ?? null,
          status: status ?? 'PROSPECT',
        },
      });
    });
    return NextResponse.json({ client }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'CONFLICT', message: 'Ma khach hang da ton tai.' }, { status: 409 });
    }
    console.error('[api/clients POST] error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create client' }, { status: 500 });
  }
}
