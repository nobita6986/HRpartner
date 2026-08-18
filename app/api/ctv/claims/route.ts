/**
 * GET /api/ctv/claims — P1 Portals STEP-08 (RQ-09).
 *
 * Returns SourceClaims for the authenticated CTV.
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
  const claims = await prisma.sourceClaim.findMany({
    where: { ctvId: ctx.userId },
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    items: claims.map((c) => ({
      id: c.id,
      workerId: c.workerId,
      claimType: c.claimType,
      status: c.accepted ? 'ACCEPTED' : 'PENDING',
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
