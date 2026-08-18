/**
 * POST /api/statements/generate -- Generate VendorStatement + ClientStatement
 * GET  /api/statements/margin?month=X&year=Y -- Margin breakdown
 *
 * Phase 4 slice 4C STEP-13/14.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  generateVendorStatement,
  generateClientStatement,
  StatementServiceError,
} from '@/src/domains/reconciliation/statement.service';
import { calculateMargin, MarginPermissionError } from '@/src/domains/reconciliation/margin.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR'] as const);

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!ADMIN_ROLES.has(ctx.role as typeof ADMIN_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} khong co quyen generate statement` }, { status: 403 });
  }

  let body: { timesheetPeriodId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phai la JSON' }, { status: 400 });
  }

  if (!body.timesheetPeriodId) {
    return NextResponse.json({ error: 'VALIDATION', message: 'Thieu timesheetPeriodId' }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const [vendor, client] = await Promise.all([
      withDbContext(prisma, ctx, (tx) => generateVendorStatement(tx, ctx, { timesheetPeriodId: body.timesheetPeriodId })).catch((e) => {
        if (e instanceof StatementServiceError && e.code === 'ALREADY_EXISTS') return null;
        throw e;
      }),
      withDbContext(prisma, ctx, (tx) => generateClientStatement(tx, ctx, { timesheetPeriodId: body.timesheetPeriodId })).catch((e) => {
        if (e instanceof StatementServiceError && e.code === 'ALREADY_EXISTS') return null;
        throw e;
      }),
    ]);

    return NextResponse.json({
      vendorStatement: vendor ?? null,
      clientStatement: client ?? null,
    }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    if (e instanceof StatementServiceError) {
      const status = e.code === 'NOT_FOUND' ? 404 : e.code === 'INVALID_STATE' || e.code === 'NO_LINES' || e.code === 'ALREADY_EXISTS' ? 409 : 400;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    console.error('[api/statements/generate POST] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to generate statements' }, { status: 500 });
  }
}