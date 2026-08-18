/**
 * POST /api/vendor/statements/[id]/confirm — P1 Portals STEP-07 (RQ-07).
 *
 * DEC-06: vendor-scoped confirm.
 * G17: SENT → CONFIRMED (or AUTO-CONFIRMED by cron if past deadline).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';

export async function POST(
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
    select: { vendorId: true, status: true },
  });
  if (!stmt || stmt.vendorId !== auth.vendorId) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  if (stmt.status !== 'SENT') {
    return NextResponse.json({
      error: 'INVALID_STATE',
      message: `Statement status is ${stmt.status}, can only confirm SENT`,
    }, { status: 409 });
  }

  await prisma.vendorStatement.update({
    where: { id },
    data: { status: 'CONFIRMED' },
  });

  return NextResponse.json({ ok: true, status: 'CONFIRMED' });
}
