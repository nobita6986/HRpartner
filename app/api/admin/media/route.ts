/**
 * GET /api/admin/media — List media library items.
 *
 * Auth: ADMIN (short-circuit) hoặc `CAN_MANAGE_MEDIA` permission.
 * Query: ?status, ?tag, ?take, ?skip, ?search, ?folder (accept-and-ignored
 *   cho backward-compat với URL cũ — hrp-t1c-media-global-pool-bulk-upload-hotfix RQ-10)
 *
 * Folder không còn là filter nghiệp vụ: toàn bộ media trong một kho chung.
 * Pagination: offset-based (DEC-06 RECOMMENDATION, đơn giản cho MVP).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { hasPermission } from '@/src/shared/auth/permission-resolver';
import { listMedia } from '@/src/domains/media/media.service';
import type { MediaListQuery, MediaStatusEnum } from '@/src/domains/media/media.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseQuery(url: URL): MediaListQuery {
  const take = url.searchParams.get('take');
  const skip = url.searchParams.get('skip');
  const status = url.searchParams.get('status');
  return {
    // hrp-t1c-media-global-pool-bulk-upload-hotfix (RQ-10): folder không còn filter.
    // Vẫn accept `folder` param từ URL cũ nhưng service bỏ qua.
    folder: url.searchParams.get('folder') ?? undefined,
    tag: url.searchParams.get('tag') ?? undefined,
    status: status === 'PUBLIC' || status === 'INTERNAL' ? (status as MediaStatusEnum) : undefined,
    take: take ? Math.min(50, Math.max(1, Number(take))) : undefined,
    skip: skip ? Math.max(0, Number(skip)) : undefined,
    search: url.searchParams.get('search') ?? undefined,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
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
      { error: 'FORBIDDEN', message: 'Thiếu CAN_MANAGE_MEDIA để list media.' },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const query = parseQuery(url);
  const prisma = getPrisma();
  const result = await listMedia(prisma, query);
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
