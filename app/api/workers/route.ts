/**
 * GET /api/workers — M5 Admin Master Data (RQ-02)
 * POST /api/workers — M7 Admin Workers CRUD
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { projectWorker, projectWorkerList } from '@/src/shared/auth/worker-projection';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VIEWER_ROLES = new Set([
  'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'ACCOUNTANT', 'SALE', 'DIRECTOR',
]);
const ADMIN_ROLES = new Set(['ADMIN', 'HR_MANAGER']);

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
      { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen xem nhan vien.' },
      { status: 403 },
    );
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
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const permissions = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
    const hasSensitivePermission = permissions.has('CAN_VIEW_WORKER_SENSITIVE');
    // RQ-02/RQ-04: L1 buildWorkerScope (row scope theo 13-role matrix) + L2 RLS GUC
    // trong CÙNG transaction. Root (ADMIN/HR_MANAGER/DIRECTOR) passthrough L1 → thấy
    // toàn bộ; HR_STAFF/PM/SALE bị inject WHERE scope; role không khai báo scope Worker
    // (MKT/ACCOUNTANT/EMPLOYEE) → L1 throw AuthScopeError → 403 (deny-by-default, DEC-08).
    const { rows, total } = await withAuthorizedDbReadOnly(prisma, ctx, async (tx) => {
      const [r, t] = await Promise.all([
        tx.worker.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
        tx.worker.count({ where }),
      ]);
      return { rows: r, total: t };
    });
    return NextResponse.json({
      workers: projectWorkerList(rows, { hasSensitivePermission, action: 'LIST' }),
      total,
      take,
      skip,
    });
  } catch (err) {
    if (err instanceof AuthScopeError) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen xem nhan vien.' },
        { status: 403 },
      );
    }
    console.error('[api/workers] query error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to query workers' }, { status: 500 });
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
      { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen tao nhan vien.' },
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

  const { userId, fullName, phone, cccdNumber, dateOfBirth, gender } = body;

  if (!userId || !fullName) {
    return NextResponse.json(
      { error: 'VALIDATION', message: 'userId và fullName la bat buoc.' },
      { status: 400 },
    );
  }

  try {
    const permissions = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
    const hasSensitivePermission = permissions.has('CAN_VIEW_WORKER_SENSITIVE');
    // RQ-02/DEC-02: create KHÔNG đi qua L1 (extension inject `where` làm vỡ create) —
    // dùng withDbContext (L2-only) set GUC; workers RLS WITH CHECK cho phép
    // {ADMIN,HR_MANAGER,DIRECTOR} INSERT (đã gate role ở trên). Không nhận owner từ client.
    const worker = await withDbContext(prisma, ctx, (tx) =>
      tx.worker.create({
        data: {
          userId,
          fullName,
          phone: phone ?? null,
          cccdNumber: cccdNumber ?? null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender ?? null,
        },
      }),
    );
    return NextResponse.json({ worker: projectWorker(worker, { hasSensitivePermission, action: 'DETAIL' }) }, { status: 201 });
  } catch (err: any) {
    if (err instanceof AuthScopeError) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen tao nhan vien.' },
        { status: 403 },
      );
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'CONFLICT', message: 'Worker da ton tai.' }, { status: 409 });
    }
    console.error('[api/workers POST] error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create worker' }, { status: 500 });
  }
}
