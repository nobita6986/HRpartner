/**
 * GET /api/worker/attendance — P1 Portals STEP-04 (RQ-03).
 *
 * Returns attendance history for the authenticated WORKER.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (!ctx.workerId) {
    return NextResponse.json({ error: 'NOT_A_WORKER' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100);

  const prisma = getPrisma();
  let rows;
  try {
    // Boundary canonical (L1 AttendanceEvent self-scope + L2 RLS GUC). `workerId`
    // suy ra từ server (ctx.workerId) — không nhận từ client (DEC-03).
    rows = await withAuthorizedDbReadOnly(prisma, ctx, (tx) =>
      tx.attendanceEvent.findMany({
        where: { workerId: ctx.workerId },
        orderBy: { workDate: 'desc' },
        take: limit,
        select: {
          id: true,
          workDate: true,
          checkInTime: true,
          checkOutTime: true,
          source: true,
          geofenceResult: true,
          status: true,
        },
      }),
    );
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/worker/attendance] query error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      workDate: r.workDate.toISOString().split('T')[0],
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      source: r.source,
      geofenceResult: r.geofenceResult,
      riskFlag: r.geofenceResult === 'OUTSIDE',
    })),
    total: rows.length,
  });
}
