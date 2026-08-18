/**
 * GET /api/ctv/summary — P1 Portals STEP-08 (RQ-09).
 *
 * Returns CTV summary: counts by status + affCode + estimated commission (MVP).
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

  if (ctx.role !== 'CTV') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const prisma = getPrisma();

  // Get affCode from user
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { affCode: true, phone: true },
  });

  const claims = await prisma.sourceClaim.findMany({
    where: { ctvId: ctx.userId },
    select: { accepted: true },
  });

  const counts = {
    total: claims.length,
    pending: claims.filter((c) => !c.accepted).length,
    accepted: claims.filter((c) => c.accepted).length,
    rejected: 0,
    merged: 0,
  };

  // MVP: estimated = accepted + merged * 0 (real engine is P2)
  const estimatedCommission = counts.accepted * 500_000; // 500k VND per accepted (MVP placeholder)

  return NextResponse.json({
    affCode: user?.affCode ?? null,
    phone: user?.phone ?? null,
    counts,
    estimatedCommission: estimatedCommission.toString(),
    note: 'Tích lũy dự kiến — engine hoa hồng thật là P2',
  });
}
