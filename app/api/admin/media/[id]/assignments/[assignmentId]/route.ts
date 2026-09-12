/**
 * DELETE /api/admin/media/[id]/assignments/[assignmentId] — Detach media.
 *
 * Auth: ADMIN hoặc `CAN_MANAGE_MEDIA`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { hasPermission } from '@/src/shared/auth/permission-resolver';
import {
  unassignMedia,
  MediaAssignmentNotFoundError,
} from '@/src/domains/media/media.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string; assignmentId: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const allowed = await hasPermission({ userId: ctx.userId, role: ctx.role }, 'CAN_MANAGE_MEDIA');
  if (!allowed) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Thiếu CAN_MANAGE_MEDIA để detach media.' },
      { status: 403 },
    );
  }

  const { assignmentId } = await params;
  try {
    const prisma = getPrisma();
    const result = await unassignMedia(prisma, assignmentId);
    revalidateTag('media');
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof MediaAssignmentNotFoundError) {
      return NextResponse.json({ error: 'NOT_FOUND', message: e.message }, { status: 404 });
    }
    console.error('[admin/media/[id]/assignments/[assignmentId] DELETE] error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Detach media thất bại.' },
      { status: 500 },
    );
  }
}
