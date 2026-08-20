/**
 * POST /api/ctv/withdrawals — M11 (refactor M9 RQ-02).
 * CTV tạo yêu cầu rút tiền. Lưu vào DB qua Prisma thay vì file JSON.
 */
import { NextRequest, NextResponse } from 'next/server';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
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
      { error: 'FORBIDDEN', message: 'Only CTV can request withdrawal.' },
      { status: 403 },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid JSON' }, { status: 400 });
  }

  const { amountVnd, bankAccount, bankName } = body;

  const amountBig = typeof amountVnd === 'bigint' ? amountVnd : BigInt(Number(amountVnd) || 0);
  if (amountBig <= 0n) {
    return NextResponse.json(
      { error: 'VALIDATION', message: 'amountVnd phải lớn hơn 0.' },
      { status: 400 },
    );
  }

  if (!bankAccount || !bankName) {
    return NextResponse.json(
      { error: 'VALIDATION', message: 'bankAccount và bankName là bắt buộc.' },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const created = await prisma.ctvWithdrawalRequest.create({
    data: {
      ctvId: ctx.userId,
      amountVnd: amountBig,
      bankAccount: String(bankAccount),
      bankName: String(bankName),
      status: 'PENDING',
    },
    select: {
      id: true,
      ctvId: true,
      amountVnd: true,
      bankAccount: true,
      bankName: true,
      status: true,
      createdAt: true,
    },
  });

  console.log(`[withdrawals] New withdrawal: ${created.id} for CTV ${ctx.userId}, amount ${created.amountVnd}`);

  return NextResponse.json(
    {
      withdrawal: {
        ...created,
        amountVnd: created.amountVnd.toString(),
        createdAt: created.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}

/**
 * GET /api/ctv/withdrawals — list own withdrawals
 */
export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed' }, { status: 500 });
  }

  if (ctx.role !== 'CTV') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const prisma = getPrisma();
  const records = await prisma.ctvWithdrawalRequest.findMany({
    where: { ctvId: ctx.userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      ctvId: true,
      amountVnd: true,
      bankAccount: true,
      bankName: true,
      status: true,
      createdAt: true,
    },
  });

  const items = records.map((r) => ({
    ...r,
    amountVnd: r.amountVnd.toString(),
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ items });
}