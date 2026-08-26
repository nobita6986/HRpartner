/**
 * GET /api/cron/disputes — Auto-confirm expired statements (V5-M1-06b: RQ-09/DEC-09/DEC-10).
 *
 * Auth FAIL-CLOSED qua `verifyCronSecret` (secret chưa cấu hình → 503; sai/thiếu
 * header → 401; so sánh hằng thời gian; không log secret; zero DB khi deny).
 *
 * DEC-10 boundary: chạy `autoConfirmExpiredStatements` trong `withSystemDb(SYSTEM_CRON)`
 * — set L2 GUC role=ADMIN (RLS `vendor_statements`/`client_statements` WITH CHECK ⊇
 * ADMIN cho phép cập nhật). Danh tính audit ('system:cron'/SYSTEM) tách biệt, ghi ở
 * service. KHÔNG raw op tại route; toàn bộ read-guard + update + audit trong 1 tx.
 * Idempotent: chỉ SENT + quá hạn mới CONFIRMED.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { verifyCronSecret } from '@/src/shared/auth/cron-auth';
import { withSystemDb, SYSTEM_CRON } from '@/src/shared/auth/with-system-db';
import { autoConfirmExpiredStatements } from '@/src/domains/reconciliation/dispute.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = verifyCronSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.code }, { status: auth.status });
  }

  const prisma = getPrisma();

  try {
    const result = await withSystemDb(prisma, SYSTEM_CRON, (tx) =>
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
