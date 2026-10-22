import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext, type AuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { extractRequestMeta } from '@/src/shared/auth/session-adapter';
import {
  deleteProjectShift,
  PROJECT_SHIFT_CONFIG_ROLES,
  ProjectShiftServiceError,
  updateProjectShift,
} from '@/src/domains/crm/project-shift.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mapShiftError(e: ProjectShiftServiceError): NextResponse {
  switch (e.code) {
    case 'NOT_FOUND':
      return NextResponse.json({ error: e.code, message: e.message }, { status: 404 });
    case 'PERMISSION_DENIED':
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    case 'CONFLICT':
      return NextResponse.json({ error: e.code, message: e.message }, { status: 409 });
    case 'VALIDATION':
      return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    default:
      return NextResponse.json({ error: 'INTERNAL', message: e.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; shiftId: string }> },
) {
  let ctx: AuthContext;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!(PROJECT_SHIFT_CONFIG_ROLES as ReadonlyArray<string>).includes(ctx.role)) {
    return NextResponse.json(
      {
        error: 'PERMISSION_DENIED',
        message: `Chỉ Admin/BoD/HR Manager/PM mới được cấu hình ca làm việc của dự án. Vai trò hiện tại: ${ctx.role}.`,
      },
      { status: 403 },
    );
  }

  const { id, shiftId } = await params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON.' }, { status: 400 });
  }

  const prisma = getPrisma();
  const auditMeta = extractRequestMeta(req);

  try {
    const shift = await withDbContext(prisma, ctx, (tx) =>
      updateProjectShift(tx, ctx, id, shiftId, raw, auditMeta),
    );
    return NextResponse.json({ shift });
  } catch (e) {
    if (e instanceof ProjectShiftServiceError) {
      return mapShiftError(e);
    }
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/projects/[id]/shifts/[shiftId] PUT] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Không thể cập nhật ca làm việc.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; shiftId: string }> },
) {
  let ctx: AuthContext;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!(PROJECT_SHIFT_CONFIG_ROLES as ReadonlyArray<string>).includes(ctx.role)) {
    return NextResponse.json(
      {
        error: 'PERMISSION_DENIED',
        message: `Chỉ Admin/BoD/HR Manager/PM mới được xoá ca làm việc của dự án. Vai trò hiện tại: ${ctx.role}.`,
      },
      { status: 403 },
    );
  }

  const { id, shiftId } = await params;
  const prisma = getPrisma();
  const auditMeta = extractRequestMeta(req);

  try {
    const deleted = await withDbContext(prisma, ctx, (tx) =>
      deleteProjectShift(tx, ctx, id, shiftId, auditMeta),
    );
    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (e) {
    if (e instanceof ProjectShiftServiceError) {
      return mapShiftError(e);
    }
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/projects/[id]/shifts/[shiftId] DELETE] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Không thể xoá ca làm việc.' }, { status: 500 });
  }
}
