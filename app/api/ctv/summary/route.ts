/**
 * GET /api/ctv/summary — portal summary backed by canonical commission ledger.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  getCtvBalance,
  listLedgerByCtv,
} from '@/src/domains/commission/ledger.service';

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (ctx.role !== 'CTV') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const prisma = getPrisma();

  try {
    const { user, claims, balance, ledgerTotal } = await withDbContext(
      prisma,
      ctx,
      async (tx) => {
        const [userRow, claimRows, availableBalance, ledgerPage] = await Promise.all([
          tx.user.findUnique({
            where: { id: ctx.userId },
            select: { affCode: true, phone: true },
          }),
          tx.sourceClaim.findMany({
            where: { ctvId: ctx.userId },
            select: { accepted: true },
          }),
          getCtvBalance(tx, ctx.userId),
          listLedgerByCtv(tx, ctx.userId, { take: 1, skip: 0 }),
        ]);

        return {
          user: userRow,
          claims: claimRows,
          balance: availableBalance,
          ledgerTotal: ledgerPage.total,
        };
      },
    );

    const counts = {
      total: claims.length,
      pending: claims.filter((claim) => !claim.accepted).length,
      accepted: claims.filter((claim) => claim.accepted).length,
      rejected: 0,
      merged: 0,
    };
    const hasLedger = ledgerTotal > 0;
    const availableVnd = hasLedger ? balance.toString() : null;
    const note = hasLedger
      ? 'Số dư từ CommissionLedger APPROVED/PAID, đã trừ REVERSAL.'
      : 'Chưa có dữ liệu CommissionLedger; không ước tính hoa hồng.';

    return NextResponse.json({
      affCode: user?.affCode ?? null,
      phone: user?.phone ?? null,
      counts,
      estimatedCommission: availableVnd,
      commissionSource: 'COMMISSION_LEDGER',
      commission: {
        source: 'COMMISSION_LEDGER',
        availableVnd,
        ledgerEntries: ledgerTotal,
        note,
      },
      note,
    });
  } catch (error) {
    console.error('[api/ctv/summary] query error:', error);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}