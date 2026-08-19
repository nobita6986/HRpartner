/**
 * POST /api/admin/commission-ledger/[id]/[action] — P2 Commission STEP-04 (RQ-04, RQ-05).
 *
 * `action` ∈ {'approve', 'pay', 'reject', 'reverse'}.
 * Permission: ADMIN, ACCOUNTANT, DIRECTOR (WRITE/APPROVE theo TASK §4.3).
 * Idempotent: yêu cầu `x-idempotency-key`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  approveLedger,
  payLedger,
  rejectLedger,
  createReversal,
  applyReversal,
  CommissionLedgerError,
  ledgerToDTO,
} from '@/src/domains/commission/ledger.service';
import { withIdempotency } from '@/src/shared/integrity/idempotency';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WRITE_ROLES = new Set(['ADMIN', 'ACCOUNTANT', 'DIRECTOR'] as const);
const ALLOWED_ACTIONS = new Set(['approve', 'pay', 'reject', 'reverse'] as const);
type Action = typeof ALLOWED_ACTIONS extends Set<infer T> ? T : never;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id: ledgerId, action } = await params;
  if (!ALLOWED_ACTIONS.has(action as 'approve' | 'pay' | 'reject' | 'reverse')) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  const typedAction = action as 'approve' | 'pay' | 'reject' | 'reverse';

  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!WRITE_ROLES.has(ctx.role as 'ADMIN')) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền xử lý ledger` },
      { status: 403 },
    );
  }

  const idempotencyKey = req.headers.get('x-idempotency-key') ?? '';
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Header x-idempotency-key bắt buộc' },
      { status: 400 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }

  const actor = { id: ctx.userId, role: ctx.role };
  const reason = (body.reason as string) ?? '';

  const prisma = getPrisma();
  const route = `POST:/api/admin/commission-ledger/${ledgerId}/${action}`;

  try {
    const result = await withIdempotency({
      prisma,
      actorId: ctx.userId,
      route,
      key: idempotencyKey,
      requestBody: body,
      handler: async () => {
        if (typedAction === 'approve') {
          const r = await withDbContext(prisma, ctx, (tx) =>
            approveLedger(tx, { ledgerId, actor, reason: reason || undefined }),
          );
          return { status: 200, body: { ledger: ledgerToDTO(r.ledger), netting: r.netting } };
        }
        if (typedAction === 'pay') {
          const r = await withDbContext(prisma, ctx, (tx) =>
            payLedger(tx, { ledgerId, actor, reason: reason || undefined }),
          );
          return { status: 200, body: { ledger: ledgerToDTO(r.ledger), netting: r.netting } };
        }
        if (typedAction === 'reject') {
          if (!reason) {
            throw new CommissionLedgerError('INVALID_INPUT', 'reason bắt buộc cho reject');
          }
          const row = await withDbContext(prisma, ctx, (tx) =>
            rejectLedger(tx, { ledgerId, actor, reason }),
          );
          return { status: 200, body: { ledger: ledgerToDTO(row) } };
        }
        // reverse
        if (!reason) {
          throw new CommissionLedgerError('INVALID_INPUT', 'reason bắt buộc cho reverse');
        }
        const partialAmount = body.partialAmount ? BigInt(String(body.partialAmount)) : undefined;
        const reversal = await withDbContext(prisma, ctx, (tx) =>
          createReversal(tx, { creditId: ledgerId, actor, reason, partialAmount }),
        );
        // Tự approve ngay để trigger debt logic (DEC-05: REVERSAL tạo PENDING, kế toán duyệt).
        // Theo DEC-05 + RQ-05: chỉ duyệt REVERSAL mới tạo debt. Caller có thể gọi riêng /approve.
        // Ở đây: tạo reversal PENDING; client sẽ gọi action=approve reversal riêng.
        return { status: 201, body: { reversal: ledgerToDTO(reversal) } };
      },
    });
    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (e) {
    if (e instanceof CommissionLedgerError) {
      const status = e.code === 'NOT_FOUND' ? 404 : e.code === 'INVALID_TRANSITION' || e.code === 'INVALID_STATE' || e.code === 'INVALID_INPUT' || e.code === 'ALREADY_REVERSED' ? 409 : 400;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error(`[api/admin/commission-ledger/${action} POST] error:`, e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed' }, { status: 500 });
  }
}
