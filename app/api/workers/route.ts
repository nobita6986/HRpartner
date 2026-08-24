/**
 * GET /api/workers — M5 Admin Master Data (RQ-02)
 * POST /api/workers — M7 Admin Workers CRUD
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { projectWorker, projectWorkerList } from '@/src/shared/auth/worker-projection';

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
    const [rows, total] = await Promise.all([
      prisma.worker.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.worker.count({ where }),
    ]);
    return NextResponse.json({
      workers: projectWorkerList(rows, hasSensitivePermission),
      total,
      take,
      skip,
    });
  } catch (err) {
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
    const worker = await prisma.worker.create({
      data: {
        userId,
        fullName,
        phone: phone ?? null,
        cccdNumber: cccdNumber ?? null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender ?? null,
      },
    });
    return NextResponse.json({ worker: projectWorker(worker, hasSensitivePermission) }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'CONFLICT', message: 'Worker da ton tai.' }, { status: 409 });
    }
    console.error('[api/workers POST] error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create worker' }, { status: 500 });
  }
}
