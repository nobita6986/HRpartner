import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import {
  BiSyncConfigurationError,
  BiSyncConflictError,
  runBiWorkerSync,
} from '@/src/domains/integrations/bi/bi-worker-sync.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const triggerSyncSchema = z.object({
  mode: z.enum(['INCREMENTAL', 'FULL_RESYNC']).optional(),
});

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (err) {
    if (err instanceof AuthSessionError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (ctx.role !== 'ADMIN' && ctx.role !== 'HR_MANAGER') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Chỉ ADMIN hoặc HR_MANAGER mới được kích hoạt đồng bộ BI.' },
      { status: 403 },
    );
  }

  let rawBody: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) rawBody = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body JSON không hợp lệ.' }, { status: 400 });
  }

  const parsed = triggerSyncSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Tham số mode không hợp lệ.' }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const summary = await runBiWorkerSync({
      prisma,
      triggerSource: 'ADMIN_MANUAL',
      mode: parsed.data.mode ?? 'INCREMENTAL',
      actorUserId: ctx.userId,
    });

    const httpStatus = summary.status === 'FAILED' ? 502 : 200;
    return NextResponse.json(
      {
        ok: summary.status !== 'FAILED',
        summary,
      },
      { status: httpStatus },
    );
  } catch (err) {
    if (err instanceof BiSyncConflictError) {
      return NextResponse.json({ ok: false, error: err.code, message: err.message }, { status: 409 });
    }
    if (err instanceof BiSyncConfigurationError) {
      return NextResponse.json({ ok: false, error: err.code, message: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: 'BI_SYNC_FAILED', message: 'Không thể thực hiện đồng bộ BI lúc này.' },
      { status: 500 },
    );
  }
}
