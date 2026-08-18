/**
 * GET /api/vendor/statements/[id]/export — P1 Portals STEP-07 (RQ-07).
 *
 * MVP: returns CSV. Production: PDF/Excel.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';

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
  const stmt = await prisma.vendorStatement.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          // worker would normally be joined, but no direct relation on VendorStatementLine
        },
      },
    },
  });
  if (!stmt || stmt.vendorId !== auth.vendorId) {
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
