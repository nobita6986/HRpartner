/**
 * GET /api/cron/outbox — Drain outbox events (V5-M1-06b: RQ-09/DEC-09/DEC-10).
 *
 * Auth FAIL-CLOSED qua `verifyCronSecret` (secret chưa cấu hình → 503; sai/thiếu
 * header → 401; so sánh hằng thời gian; không log secret; zero DB khi deny).
 *
 * DEC-10 boundary: `outbox_events` KHÔNG bật RLS nên drain không cần GUC; và drain
 * là tiến trình NHIỀU transaction + có thể I/O trong handler (Phase 6+) → KHÔNG
 * gói toàn bộ trong 1 transaction (outbox.ts §4.3: cấm I/O khi giữ tx). Vì vậy
 * route truyền raw client làm ĐỐI SỐ cho `drainOutboxOnce` (service tự quản tx nội
 * bộ theo từng event) — không có model-op raw nào chạy tại route. Xem HANDOFF EV-10.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { verifyCronSecret } from '@/src/shared/auth/cron-auth';
import { drainOutboxOnce, type OutboxHandler } from '@/src/shared/integrity/outbox';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const handlers: OutboxHandler[] = [
  // Phase 5: chưa có handler email/SMS — event được PROCESSED (ack) tới Phase 6+.
];

export async function GET(req: NextRequest) {
  const auth = verifyCronSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.code }, { status: auth.status });
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
