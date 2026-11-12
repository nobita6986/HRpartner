/**
 * GET / POST /api/admin/jobs/bi-feed-sync — hrp-bi-jobs-feed-sync-v1 (RQ-03)
 *
 * Admin/HR_MANAGER trigger and status endpoint for BI Public Jobs Feed synchronization.
 */

import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import type { SystemRole } from '@prisma/client';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import {
  getBiJobsFeedSyncState,
  resolveBiJobsFeedUrl,
  syncBiJobsPublicFeed,
} from '@/src/domains/integrations/bi/bi-jobs-feed.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_SYNC_ROLES: ReadonlySet<SystemRole> = new Set(['ADMIN', 'HR_MANAGER']);

export async function GET(req: NextRequest): Promise<NextResponse> {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'INTERNAL', message: 'Lỗi xác thực phiên' }, { status: 500 });
  }

  if (!ALLOWED_SYNC_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { ok: false, error: 'FORBIDDEN', message: 'Chỉ ADMIN hoặc HR_MANAGER mới có quyền xem trạng thái đồng bộ BI Feed.' },
      { status: 403 },
    );
  }

  const prisma = getPrisma();
  const lastSync = await getBiJobsFeedSyncState(prisma);
  return NextResponse.json({
    ok: true,
    feedUrl: resolveBiJobsFeedUrl(),
    lastSync,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'INTERNAL', message: 'Lỗi xác thực phiên' }, { status: 500 });
  }

  if (!ALLOWED_SYNC_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { ok: false, error: 'FORBIDDEN', message: 'Chỉ ADMIN hoặc HR_MANAGER mới có quyền đồng bộ tin từ BI Feed.' },
      { status: 403 },
    );
  }

  let forceUpdate = false;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (body && typeof body.forceUpdate === 'boolean') {
      forceUpdate = body.forceUpdate;
    }
  } catch {
    // Empty body is valid.
  }

  const prisma = getPrisma();
  const result = await syncBiJobsPublicFeed(prisma, {
    forceUpdate,
    actorId: ctx.userId,
    actorRole: ctx.role,
  });

  if (!result.ok) {
    const status =
      result.code === 'SYNC_ALREADY_RUNNING'
        ? 409
        : result.code === 'FEED_FETCH_FAILED' || result.code === 'INVALID_FEED_PAYLOAD'
        ? 502
        : 500;
    return NextResponse.json(result, { status });
  }

  try {
    revalidatePath('/viec-lam');
    revalidatePath('/');
    revalidatePath('/admin/jobs/job-postings');
  } catch {
    // Ignore revalidation errors outside Next.js request context.
  }

  return NextResponse.json(result, { status: 200 });
}
