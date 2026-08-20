/**
 * POST /api/ctv/withdrawals — M9 RQ-02
 * CTV tạo yêu cầu rút tiền.
 * MVP: Lưu vào JSON file. Production: cần migration CtvWithdrawalRequest.
 */
import { NextRequest, NextResponse } from 'next/server';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface WithdrawalRecord {
  id: string;
  ctvId: string;
  amountVnd: number;
  bankAccount: string;
  bankName: string;
  status: string;
  createdAt: string;
}

const STORE_PATH = path.join(process.cwd(), 'data', 'withdrawals.json');

async function readStore(): Promise<WithdrawalRecord[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeStore(records: WithdrawalRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

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

  if (!amountVnd || Number(amountVnd) <= 0) {
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

  const record: WithdrawalRecord = {
    id: crypto.randomUUID(),
    ctvId: ctx.userId,
    amountVnd: Number(amountVnd),
    bankAccount,
    bankName,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  const store = await readStore();
  store.push(record);
  await writeStore(store);

  console.log(`[withdrawals] New withdrawal: ${record.id} for CTV ${ctx.userId}, amount ${amountVnd}`);

  return NextResponse.json({
    withdrawal: record,
    note: 'MVP: Lưu vào JSON. Production cần migration CtvWithdrawalRequest.',
  }, { status: 201 });
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

  const store = await readStore();
  const items = store.filter(r => r.ctvId === ctx.userId);

  return NextResponse.json({ items });
}
