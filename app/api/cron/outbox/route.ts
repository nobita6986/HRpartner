/**
 * GET /api/cron/outbox — Drain outbox events
 *
 * Phase 5 UAT/Cutover STEP-03 (RQ-05).
 * DEC-02: Vercel Cron Jobs calls this every 5 minutes.
 *
 * Idempotent: calling multiple times is safe.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { drainOutboxOnce, type OutboxHandler } from '@/src/shared/integrity/outbox';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Vercel cron auth: verify secret header if provided
const CRON_SECRET = process.env.CRON_SECRET ?? '';

const handlers: OutboxHandler[] = [
  // Phase 5: no email/SMS handlers yet — outbox events are processed
  // but handlers just return true (acknowledge) until Phase 6+.
  // Real handlers added in Phase 6+ when channels are wired.
];

export async function GET(req: NextRequest) {
  // Verify cron secret
  if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const prisma = getPrisma();

  try {
    const result = await drainOutboxOnce(prisma, handlers, { batchSize: 50, maxRetries: 5 });
    return NextResponse.json({
      drained: true,
      processed: result.processed,
      failed: result.failed,
      skipped: result.skipped,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[cron/outbox] error:', e);
    return NextResponse.json({ error: 'INTERNAL', drained: false }, { status: 500 });
  }
}
