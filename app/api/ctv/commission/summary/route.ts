/**
 * GET /api/ctv/commission/summary — P2 Commission STEP-04 (RQ-07).
 *
 * CTV (role=CTV) xem số dư khả dụng, nợ và lịch sử ledger của chính mình.
 * `ctvId` lấy từ ctx.userId (CTV's userId).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withAuthorizedDb } from '@/src/shared/auth/with-authorized-db';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  getCtvBalance,
  getTotalDebt,
  listLedgerByCtv,
  ledgerToDTO,
} from '@/src/domains/commission/ledger.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

  if (ctx.role !== 'CTV') {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: 'Chỉ CTV mới xem được' },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const take = Math.min(100, parseInt(searchParams.get('take') ?? '50', 10));
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);

  const ctvId = ctx.userId;
  const prisma = getPrisma();

  try {
    const [balance, totalDebt, ledgerPage] = await withAuthorizedDb(prisma, ctx, async (tx) => {
      const [b, d, l] = await Promise.all([
        getCtvBalance(tx, ctvId),
        getTotalDebt(tx, ctvId),
        listLedgerByCtv(tx, ctvId, { take, skip }),
      ]);
      return [b, d, l];
    });

    return NextResponse.json({
      ctvId,
      balance: balance.toString(),
      totalDebt: totalDebt.toString(),
      ledger: {
        items: ledgerPage.items.map(ledgerToDTO),
        total: ledgerPage.total,
        take,
        skip,
      },
    });
  } catch (e) {
    // RQ-06/AC-07 + DEC-07: 403 generic, KHÔNG lộ scope predicate/model; KHÔNG log raw error.
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/ctv/commission/summary GET] query failed');
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed' }, { status: 500 });
  }
}
