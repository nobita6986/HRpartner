/**
 * GET /api/worker/tickets — P1 Portals STEP-04 (RQ-03).
 *
 * Returns tickets created by the authenticated WORKER.
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

  const prisma = getPrisma();

  // Get Worker record to find workerId
  const worker = await prisma.worker.findUnique({
    where: { id: ctx.workerId },
    select: { userId: true },
  });

  const rows = await prisma.ticket.findMany({
    where: { workerId: ctx.workerId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      status: true,
      type: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      type: r.type,
      createdAt: r.createdAt.toISOString().split('T')[0],
    })),
    total: rows.length,
  });
}
