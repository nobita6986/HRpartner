/**
 * GET /api/worker/tickets — P1 Portals STEP-04 (RQ-03).
 *
 * Returns tickets created by the authenticated WORKER.
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

  const prisma = getPrisma();

  let rows;
  try {
    // Boundary canonical: L1 Ticket self-scope (workerId = ctx.workerId) + L2 RLS.
    rows = await withAuthorizedDbReadOnly(prisma, ctx, (tx) =>
      tx.ticket.findMany({
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
      }),
    );
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/worker/tickets] query error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }

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
