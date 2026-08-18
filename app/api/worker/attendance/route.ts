/**
 * GET /api/worker/attendance — P1 Portals STEP-04 (RQ-03).
 *
 * Returns attendance history for the authenticated WORKER.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';

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
  const rows = await prisma.attendanceEvent.findMany({
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
  });

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
