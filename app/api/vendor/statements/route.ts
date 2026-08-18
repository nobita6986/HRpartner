/**
 * GET /api/vendor/statements — P1 Portals STEP-07 (RQ-07).
 *
 * List vendor statements scoped to authenticated vendor (DEC-06).
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
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  if (!ctx.vendorId) {
    return NextResponse.json({ error: 'NO_VENDOR_CONTEXT' }, { status: 403 });
  }

  const prisma = getPrisma();

  // MVP: list VendorStatement records; in production, filter by vendorId context.
  // Since VendorStatement has no vendor relation, list all and let admin filter.
  const statements = await prisma.vendorStatement.findMany({
    where: { vendorId: ctx.vendorId },
    take: 50,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      periodMonth: true,
      periodYear: true,
      status: true,
      disputeCount: true,
      confirmDeadlineAt: true,
      totalAmount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    items: statements.map((s) => ({
      id: s.id,
      periodLabel: `${s.periodYear}-${String(s.periodMonth).padStart(2, '0')}`,
      status: s.status,
      disputeCount: s.disputeCount,
      confirmDeadlineAt: s.confirmDeadlineAt?.toISOString() ?? null,
      totalAmount: s.totalAmount.toString(),
    })),
  });
}
