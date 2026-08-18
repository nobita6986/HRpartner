/**
 * GET /api/statements/margin?month=X&year=Y -- Margin breakdown (CAN_VIEW_STATEMENT_MARGIN)
 *
 * Phase 4 slice 4C STEP-14 (RQ-12).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { calculateMargin, MarginPermissionError } from '@/src/domains/reconciliation/margin.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));

  if (!month || !year) {
    return NextResponse.json({ error: 'VALIDATION', message: 'Thieu month hoac year' }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const margin = await calculateMargin(prisma, ctx, month, year);
    return NextResponse.json({
      margin: {
        ...margin,
        totalClientReceivable: margin.totalClientReceivable.toString(),
        totalVendorPayable: margin.totalVendorPayable.toString(),
        margin: margin.margin.toString(),
      },
    });
  } catch (e) {
    if (e instanceof MarginPermissionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/statements/margin GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to calculate margin' }, { status: 500 });
  }
}