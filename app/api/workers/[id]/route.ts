/**
 * PUT /api/workers/[id] — M7 Admin Workers CRUD
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { projectWorker } from '@/src/shared/auth/worker-projection';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['ADMIN', 'HR_MANAGER']);

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
      { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen sua nhan vien.' },
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

  const { fullName, phone, cccdNumber, dateOfBirth, gender } = body;

  try {
    const permissions = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
    const hasSensitivePermission = permissions.has('CAN_VIEW_WORKER_SENSITIVE');
    // RQ-02/DEC-02: singular update dùng WhereUniqueInput → L1 (inject AND) làm vỡ.
    // Dùng withDbContext (L2-only) set GUC; workers RLS USING giới hạn row nhìn thấy +
    // WITH CHECK {ADMIN,HR_MANAGER,DIRECTOR}. Row ngoài scope → update 0 dòng → P2025 → 404
    // (IDOR: không phân biệt "không tồn tại" vs "ngoài quyền"). id lấy từ URL, không phải owner.
    const worker = await withDbContext(prisma, ctx, (tx) =>
      tx.worker.update({
        where: { id },
        data: {
          ...(fullName !== undefined && { fullName }),
          ...(phone !== undefined && { phone }),
          ...(cccdNumber !== undefined && { cccdNumber }),
          ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
          ...(gender !== undefined && { gender }),
        },
      }),
    );
    return NextResponse.json({ worker: projectWorker(worker, { hasSensitivePermission, action: 'DETAIL' }) });
  } catch (err: any) {
    if (err instanceof AuthScopeError) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen sua nhan vien.' },
        { status: 403 },
      );
    }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Worker not found.' }, { status: 404 });
    }
    console.error('[api/workers/[id] PUT] error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to update worker' }, { status: 500 });
  }
}
