/**
 * GET /api/vendor/orders — P1 Portals STEP-06 (RQ-06).
 *
 * Returns staffing orders ACTIVE for the authenticated vendor's scope.
 * MVP: list all ACTIVE orders with vendor-visible slots.
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

  if (ctx.role !== 'VENDOR_ADMIN' && ctx.role !== 'VENDOR_STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Vendor only' }, { status: 403 });
  }
  if (!ctx.vendorId) {
    return NextResponse.json({ error: 'NO_VENDOR_CONTEXT' }, { status: 403 });
  }

  const prisma = getPrisma();
  const orders = await prisma.staffingOrder.findMany({
    where: { status: 'ACTIVE' },
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      project: { select: { id: true, name: true, code: true } },
      slots: {
        select: {
          id: true,
          positionCode: true,
          positionTitle: true,
          slotsNeeded: true,
          slotsFilled: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: orders.map((o) => ({
      id: o.id,
      code: o.code,
      projectName: o.project.name,
      projectCode: o.project.code,
      deadlineDate: o.deadlineDate?.toISOString().split('T')[0] ?? null,
      status: o.status,
      slots: (o.slots ?? []).map((s) => ({
        id: s.id,
        role: s.positionCode,
        headcount: s.slotsNeeded,
        filled: s.slotsFilled,
        remaining: s.slotsNeeded - s.slotsFilled,
      })),
    })),
  });
}
