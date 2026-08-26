/**
 * GET /api/vendor/statements/[id]/export — P1 Portals STEP-07 / V5-M1-06b (RQ-05, DEC-06).
 *
 * MVP: trả CSV statement + lines. Boundary canonical (`withAuthorizedDbReadOnly`):
 * L1 `buildVendorStatementScope` (VENDOR → `{ vendorId }`) inject vào `findFirst`
 * (AND với `{ id }`) + L2 RLS. Statement ngoài vendor → không thấy → 404
 * (indistinguishable). Lines lấy theo statement cha (không có relation worker).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let auth;
  try {
    auth = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (auth.role !== 'VENDOR_ADMIN' && auth.role !== 'VENDOR_STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  if (!auth.vendorId) {
    return NextResponse.json({ error: 'NO_VENDOR_CONTEXT' }, { status: 403 });
  }

  const prisma = getPrisma();

  let stmt;
  try {
    stmt = await withAuthorizedDbReadOnly(prisma, auth, (tx) =>
      tx.vendorStatement.findFirst({
        where: { id },
        include: { lines: true },
      }),
    );
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/vendor/statements/[id]/export] error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
  if (!stmt) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  // Build CSV
  const csvLines = [
    ['Statement ID', 'Period', 'Status', 'Total Amount'].join(','),
    [stmt.id, `${stmt.periodYear}-${String(stmt.periodMonth).padStart(2, '0')}`, stmt.status, stmt.totalAmount.toString()].join(','),
    '',
    ['Line ID', 'Worker ID', 'Assignment ID', 'Total Hours', 'Rate', 'Amount'].join(','),
    ...stmt.lines.map((l) =>
      [l.id, l.workerId, l.assignmentId ?? '', l.totalHours.toString(), l.rate.toString(), l.amount.toString()].join(','),
    ),
  ];
  const csv = csvLines.join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="statement_${id}.csv"`,
    },
  });
}
