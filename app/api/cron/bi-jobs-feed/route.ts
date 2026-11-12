/**
 * GET /api/cron/bi-jobs-feed — hrp-bi-jobs-feed-sync-v1 (RQ-03, DEC-04)
 *
 * Periodic 30-minute poll endpoint that fetches `https://bi.hrpartner.vn/feeds/jobs.v1.json`
 * and reconciles all published BI recruitment posts into HRP's public job board.
 *
 * Auth: fail-closed via `verifyCronSecret` (`x-cron-secret`).
 */

import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { verifyCronSecret } from '@/src/shared/auth/cron-auth';
import { syncBiJobsPublicFeed } from '@/src/domains/integrations/bi/bi-jobs-feed.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = verifyCronSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.code }, { status: auth.status });
  }

  const prisma = getPrisma();
  const result = await syncBiJobsPublicFeed(prisma, {
    actorId: 'system:cron',
    actorRole: 'ADMIN',
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

  if (result.created > 0 || result.updated > 0 || result.archived > 0) {
    try {
      revalidatePath('/viec-lam');
      revalidatePath('/');
      revalidatePath('/admin/jobs/job-postings');
    } catch {
      // Ignore revalidation errors outside Next.js request context (e.g., unit tests).
    }
  }

  return NextResponse.json(result, { status: 200 });
}
