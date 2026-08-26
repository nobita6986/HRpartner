/**
 * GET /api/vendor/statements — P1 Portals STEP-07 / V5-M1-06b (RQ-05, DEC-06).
 *
 * List vendor statement trong tầm nhìn vendor qua boundary canonical
 * (`withAuthorizedDbReadOnly`): L1 `buildVendorStatementScope` (VENDOR →
 * `{ vendorId: ctx.vendorId }`) + L2 RLS `vendor_statements` USING
 * `(root/ACCOUNTANT) OR (VENDOR AND vendor_id=session)`. `where.vendorId`
 * server-derived giữ lại như defense-in-depth (AND với scope L1).
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

  if (ctx.role !== 'VENDOR_ADMIN' && ctx.role !== 'VENDOR_STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  if (!ctx.vendorId) {
    return NextResponse.json({ error: 'NO_VENDOR_CONTEXT' }, { status: 403 });
  }

  const prisma = getPrisma();

  let statements;
  try {
    statements = await withAuthorizedDbReadOnly(prisma, ctx, (tx) =>
      tx.vendorStatement.findMany({
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
      }),
    );
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/vendor/statements] query error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }

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
