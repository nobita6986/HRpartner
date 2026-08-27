/**
 * GET /api/statements/margin?month=X&year=Y -- Margin breakdown (CAN_VIEW_STATEMENT_MARGIN)
 *
 * Phase 4 slice 4C STEP-14 (RQ-12).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { calculateMargin, MarginPermissionError } from '@/src/domains/reconciliation/margin.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// V5-M1-06d / RQ-07 / DEC-12: margin la aggregate tai chinh toan cuc (SUM tren moi
// vendor/client statement cua ky) — chi ADMIN/ACCOUNTANT/DIRECTOR duoc doc (§7.2).
// DEC-12 DAO NGUOC 06c DEV-01: DB access di qua withAuthorizedDbReadOnly (L1+L2 that),
// KHONG con L2-only. ClientStatement/ClientStatementLine gio co scope builder
// (finance.scope.ts) → ACCOUNTANT (non-root) doc global {}; role ngoai finance →
// AuthScopeError DENY_BY_DEFAULT. Gate role tai route (defense-in-depth) + calculateMargin
// van tu kiem CAN_VIEW_STATEMENT_MARGIN.
const MARGIN_ROLES = new Set(['ADMIN', 'ACCOUNTANT', 'DIRECTOR']);

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!MARGIN_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: `Role ${ctx.role} khong co quyen xem margin` },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));

  if (!month || !year) {
    return NextResponse.json({ error: 'VALIDATION', message: 'Thieu month hoac year' }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const margin = await withAuthorizedDbReadOnly(prisma, ctx, (tx) => calculateMargin(tx, ctx, month, year));
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
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: 'PERMISSION_DENIED', message: 'Khong co pham vi xem margin' }, { status: 403 });
    }
    console.error('[api/statements/margin GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to calculate margin' }, { status: 500 });
  }
}