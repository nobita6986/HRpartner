/**
 * GET /api/admin/commission-ledger — P2 Commission STEP-04 (RQ-04, RQ-05).
 *
 * READ cho ADMIN/HR_MANAGER/ACCOUNTANT/DIRECTOR.
 * Trả về ledger + balance summary.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  ledgerToDTO,
  listLedger,
  type LedgerStatus,
  type Direction,
} from '@/src/domains/commission/ledger.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const READ_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR'] as const);

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!READ_ROLES.has(ctx.role as 'ADMIN')) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền xem ledger` },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const take = Math.min(100, parseInt(searchParams.get('take') ?? '50', 10));
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);
  const status = searchParams.get('status') as LedgerStatus | null;
  const ctvId = searchParams.get('ctvId');
  const direction = searchParams.get('direction') as Direction | null;

  const prisma = getPrisma();
  try {
    const { items, total } = await withDbContext(prisma, ctx, (tx) =>
      listLedger(tx, {
        take,
        skip,
        status: status ?? undefined,
        ctvId: ctvId ?? undefined,
        direction: direction ?? undefined,
      }),
    );
    return NextResponse.json({
      items: items.map(ledgerToDTO),
      total,
      take,
      skip,
    });
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/admin/commission-ledger GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list ledger' }, { status: 500 });
  }
}
