/**
 * GET /api/ctv/claims — P1 Portals STEP-08 (RQ-09).
 *
 * Returns SourceClaims for the authenticated CTV.
 * V5-M1-06a: business query đi qua boundary canonical `withAuthorizedDb` (L1 scope +
 * L2 RLS GUC). CTV self-scope suy ra từ `ctx.userId` (DEC-06); không đọc raw client.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withAuthorizedDb } from '@/src/shared/auth/with-authorized-db';

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

  try {
    const prisma = getPrisma();
    // L1 tự inject WHERE { ctvId: ctx.userId }; giữ thêm self-filter tường minh làm
    // lớp phòng thủ (server-derived, không tin input) — cả hai cùng khoá theo ctx.
    const claims = await withAuthorizedDb(prisma, ctx, (tx) =>
      tx.sourceClaim.findMany({
        where: { ctvId: ctx.userId },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    );

    return NextResponse.json({
      items: claims.map((c) => ({
        id: c.id,
        workerId: c.workerId,
        claimType: c.claimType,
        status: c.accepted ? 'ACCEPTED' : 'PENDING',
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
