/**
 * GET /api/cron/disputes — Auto-confirm expired disputes
 *
 * Phase 5 UAT/Cutover STEP-03 (RQ-06).
 * DEC-02: Vercel Cron Jobs calls this every 5 minutes.
 *
 * Idempotent: calling multiple times is safe (only SENT+expired statements confirmed).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { autoConfirmExpiredStatements } from '@/src/domains/reconciliation/dispute.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CRON_SECRET = process.env.CRON_SECRET ?? '';

export async function GET(req: NextRequest) {
  if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const prisma = getPrisma();

  try {
    const result = await prisma.$transaction(async (tx) =>
      autoConfirmExpiredStatements(tx, new Date()),
    );
    return NextResponse.json({
      confirmed: true,
      vendorConfirmed: result.vendorConfirmed,
      clientConfirmed: result.clientConfirmed,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[cron/disputes] error:', e);
    return NextResponse.json({ error: 'INTERNAL', confirmed: false }, { status: 500 });
  }
}
