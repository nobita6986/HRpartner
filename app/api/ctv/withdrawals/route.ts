/**
 * POST /api/ctv/withdrawals — M11 (refactor M9 RQ-02).
 * CTV tạo yêu cầu rút tiền. Lưu vào DB qua Prisma thay vì file JSON.
 *
 * V5-M1-06a: mọi DB op đi qua boundary. READ → `withAuthorizedDb` (L1+L2). CREATE
 * không thể qua L1 (extension inject `where` làm vỡ `create`) nên dùng `withDbContext`
 * (L2 RLS) + ownership suy ra từ server (`ctx.userId`), CẤM nhận `ctvId` từ body (DEC-03/06).
 */
import { NextRequest, NextResponse } from 'next/server';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { withAuthorizedDb } from '@/src/shared/auth/with-authorized-db';

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
  const created = await withDbContext(prisma, ctx, (tx) =>
    tx.ctvWithdrawalRequest.create({
      data: {
        ctvId: ctx.userId,
        amountVnd: amountBig,
        bankAccount: String(bankAccount),
        bankName: String(bankName),
        status: 'PENDING',
      },
      select: {
        id: true,
        amountVnd: true,
        bankAccount: true,
        bankName: true,
        status: true,
        createdAt: true,
      },
    }),
  );

  // RQ-06/AC-07: KHÔNG log amount/bank/ctvId (dữ liệu tài chính + PII). Chỉ log id.
  console.log(`[withdrawals] created ${created.id}`);

  // DEC-09 (RQ-09): allowlist self DTO — OMIT ctvId (owner suy từ session, KHÔNG lộ ra response).
  return NextResponse.json(
    {
      withdrawal: {
        id: created.id,
        amountVnd: created.amountVnd.toString(),
        bankAccount: created.bankAccount,
        bankName: created.bankName,
        status: created.status,
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
  const records = await withAuthorizedDb(prisma, ctx, (tx) =>
    tx.ctvWithdrawalRequest.findMany({
      where: { ctvId: ctx.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amountVnd: true,
        bankAccount: true,
        bankName: true,
        status: true,
        createdAt: true,
      },
    }),
  );

  // DEC-09 (RQ-09): allowlist self DTO — OMIT ctvId (CTV chỉ thấy withdrawal của chính mình).
  const items = records.map((r) => ({
    id: r.id,
    amountVnd: r.amountVnd.toString(),
    bankAccount: r.bankAccount,
    bankName: r.bankName,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ items });
}