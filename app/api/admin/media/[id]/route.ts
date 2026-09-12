/**
 * DELETE /api/admin/media/[id] — Delete Media + revoke Blob.
 *
 * Auth: ADMIN hoặc `CAN_MANAGE_MEDIA`.
 *
 * Flow:
 *  1. Lookup Media
 *  2. del() trên Vercel Blob (idempotent — nếu đã xóa trên Blob, OK)
 *  3. Xóa Media record (cascade → MediaAssignment)
 */
import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { revalidateTag } from 'next/cache';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { hasPermission } from '@/src/shared/auth/permission-resolver';
import { deleteMedia, MediaNotFoundError } from '@/src/domains/media/media.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
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
      { error: 'FORBIDDEN', message: 'Thiếu CAN_MANAGE_MEDIA để xóa media.' },
      { status: 403 },
    );
  }

  const { id } = await params;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error: 'BLOB_TOKEN_MISSING',
        message: 'BLOB_READ_WRITE_TOKEN chưa cấu hình. Không thể xóa blob — abort an toàn.',
      },
      { status: 503 },
    );
  }

  try {
    const prisma = getPrisma();
    await deleteMedia(prisma, id, async (url) => {
      await del(url, { token });
    });
    revalidateTag('media');
    return NextResponse.json(
      { id, deleted: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    if (e instanceof MediaNotFoundError) {
      return NextResponse.json({ error: 'NOT_FOUND', message: e.message }, { status: 404 });
    }
    console.error('[admin/media/[id] DELETE] error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Xóa media thất bại.' },
      { status: 500 },
    );
  }
}
