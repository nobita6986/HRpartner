import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { verifyCronSecret } from '@/src/shared/auth/cron-auth';
import {
  BiSyncConfigurationError,
  BiSyncConflictError,
  runBiWorkerSync,
} from '@/src/domains/integrations/bi/bi-worker-sync.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = verifyCronSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.code }, { status: auth.status });
  }

  const prisma = getPrisma();
  try {
    const summary = await runBiWorkerSync({
      prisma,
      triggerSource: 'CRON',
      mode: 'INCREMENTAL',
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
      return NextResponse.json({ ok: false, error: err.code, message: err.message }, { status: 503 });
    }
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code: unknown }).code)
        : 'CRON_BI_SYNC_ERROR';
    console.error('[api/cron/bi-sync] failed:', { code });
    return NextResponse.json(
      { ok: false, error: code, message: 'Lỗi khi chạy đồng bộ nhân sự BI định kỳ.' },
      { status: 500 },
    );
  }
}
