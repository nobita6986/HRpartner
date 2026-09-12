/**
 * POST /api/admin/media/assign — Attach media to owner (JobPosting/HomepageSection/...).
 *
 * Auth: ADMIN hoặc `CAN_MANAGE_MEDIA`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { hasPermission } from '@/src/shared/auth/permission-resolver';
import {
  assignMedia,
  MediaAssignmentConflictError,
  MediaNotFoundError,
  MediaValidationError,
} from '@/src/domains/media/media.service';
import type { MediaAssignmentOwnerType } from '@/src/domains/media/media.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function badRequest(message: string, field?: string): NextResponse {
  return NextResponse.json({ error: 'INVALID_INPUT', message, field }, { status: 400 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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
      { error: 'FORBIDDEN', message: 'Thiếu CAN_MANAGE_MEDIA để assign media.' },
      { status: 403 },
    );
  }

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return badRequest('Body không phải JSON hợp lệ.');
  }

  const mediaId = typeof raw.mediaId === 'string' ? raw.mediaId : '';
  const ownerType = typeof raw.ownerType === 'string' ? (raw.ownerType as MediaAssignmentOwnerType) : '';
  const ownerId = typeof raw.ownerId === 'string' ? raw.ownerId : '';

  if (!mediaId) return badRequest('mediaId là bắt buộc.', 'mediaId');
  if (!ownerType) return badRequest('ownerType là bắt buộc.', 'ownerType');
  if (!ownerId) return badRequest('ownerId là bắt buộc.', 'ownerId');

  try {
    const prisma = getPrisma();
    const assignment = await assignMedia(prisma, {
      mediaId,
      ownerType,
      ownerId,
      order: typeof raw.order === 'number' ? raw.order : undefined,
      cover: typeof raw.cover === 'boolean' ? raw.cover : undefined,
    });
    revalidateTag('media');
    return NextResponse.json(assignment, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof MediaValidationError) {
      return badRequest(e.message, e.field);
    }
    if (e instanceof MediaNotFoundError) {
      return NextResponse.json({ error: 'NOT_FOUND', message: e.message }, { status: 404 });
    }
    if (e instanceof MediaAssignmentConflictError) {
      return NextResponse.json(
        { error: 'CONFLICT', message: e.message },
        { status: 409 },
      );
    }
    console.error('[admin/media/assign POST] error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Gán media thất bại.' },
      { status: 500 },
    );
  }
}
