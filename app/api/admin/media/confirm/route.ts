/**
 * POST /api/admin/media/confirm — Tạo Media record sau khi upload Blob xong.
 *
 * Auth: ADMIN hoặc `CAN_MANAGE_MEDIA`.
 *
 * Sau khi client POST file qua /upload-url và nhận `blobUrl`, gọi POST
 * /confirm với metadata (alt bắt buộc nếu PUBLIC) để tạo Media row.
 */
import { NextRequest, NextResponse } from 'next/server';
import { head } from '@vercel/blob';
import { revalidateTag } from 'next/cache';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { hasPermission } from '@/src/shared/auth/permission-resolver';
import {
  createMedia,
  MediaValidationError,
} from '@/src/domains/media/media.service';
import type { MediaStatusEnum } from '@/src/domains/media/media.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ConfirmBody {
  blobUrl: string;
  alt: string;
  caption?: string | null;
  folder?: string;
  tags?: string[];
  status?: MediaStatusEnum;
  cover?: boolean;
  mimeType?: string;
  size?: number;
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: 'INVALID_INPUT', message }, { status: 400 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
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
      { error: 'FORBIDDEN', message: 'Thiếu CAN_MANAGE_MEDIA để confirm media.' },
      { status: 403 },
    );
  }

  // 2. Parse body
  let body: ConfirmBody;
  try {
    const raw = (await req.json()) as Record<string, unknown>;
    body = {
      blobUrl: typeof raw.blobUrl === 'string' ? raw.blobUrl : '',
      alt: typeof raw.alt === 'string' ? raw.alt : '',
      caption: typeof raw.caption === 'string' ? raw.caption : null,
      folder: typeof raw.folder === 'string' ? raw.folder : undefined,
      tags: Array.isArray(raw.tags) ? (raw.tags as unknown[]).filter((t): t is string => typeof t === 'string') : undefined,
      status: raw.status === 'INTERNAL' ? 'INTERNAL' : 'PUBLIC',
      cover: typeof raw.cover === 'boolean' ? raw.cover : undefined,
      mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : undefined,
      size: typeof raw.size === 'number' ? raw.size : undefined,
    };
  } catch {
    return badRequest('Body không phải JSON hợp lệ.');
  }

  if (!body.blobUrl) return badRequest('blobUrl là bắt buộc.');

  // 3. Verify blob tồn tại trên Vercel Blob (HEAD request)
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error: 'BLOB_TOKEN_MISSING',
        message: 'BLOB_READ_WRITE_TOKEN chưa cấu hình. Không thể verify blob.',
      },
      { status: 503 },
    );
  }

  let headResult: Awaited<ReturnType<typeof head>>;
  try {
    headResult = await head(body.blobUrl, { token });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'BLOB_NOT_FOUND',
        message: `Blob không tồn tại tại ${body.blobUrl}. Upload trước đó có thể đã fail.`,
      },
      { status: 404 },
    );
  }

  // 4. Tạo Media record
  try {
    const prisma = getPrisma();
    const item = await createMedia(prisma, {
      url: body.blobUrl,
      alt: body.alt,
      caption: body.caption ?? null,
      folder: body.folder ?? 'uncategorized',
      tags: body.tags ?? [],
      status: body.status ?? 'PUBLIC',
      cover: body.cover ?? false,
      filename: headResult.pathname.split('/').pop() ?? headResult.pathname,
      size: body.size ?? headResult.size,
      mimeType: body.mimeType ?? 'application/octet-stream',
      ownerId: ctx.userId,
      createdById: ctx.userId,
    });

    revalidateTag('media');
    return NextResponse.json(item, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof MediaValidationError) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: e.message, field: e.field },
        { status: 400 },
      );
    }
    console.error('[admin/media/confirm POST] error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Tạo Media record thất bại.' },
      { status: 500 },
    );
  }
}
