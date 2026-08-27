/**
 * POST /api/vendor/statements/[id]/dispute — P1 Portals STEP-07 / V5-M1-06b
 *                                         — V5-M1-08 STEP-04/05 (RQ-05/RQ-07, DEC-05/07/08).
 *
 * G17: tối đa 2 vòng (dispute_count < 2). Chỉ `VENDOR_ADMIN` (DEC-05): `VENDOR_STAFF`
 * → 403 TRƯỚC DB. Cross-vendor → 404.
 *
 * Guarded/optimistic write + audit trong CÙNG transaction (`withDbContext`, L2-only vì
 * update dùng WhereUnique). `updateMany({ id, vendorId, status∈{SENT,DISPUTED},
 * disputeCount<2 })` ràng buộc owner+state+count TẠI LÚC WRITE → hai request đồng thời
 * chỉ một winner cho vòng cuối (count=1), loser (count=0) phân loại 404/409/MAX_DISPUTES
 * và KHÔNG ghi audit. Audit ghi bằng `tx.auditLog.create` — KHÔNG `.catch(() => null)`
 * (DEC-07): audit fail → throw → rollback cả state. `audit_logs` không bật RLS.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

const disputeSchema = z.object({
  reason: z.string().min(1).max(500),
  evidence: z.string().max(2000).optional(),
});

class StatementGuardError extends Error {
  constructor(readonly kind: 'NOT_FOUND' | 'INVALID_STATE' | 'MAX_DISPUTES', readonly detail?: string) {
    super(kind);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let auth;
  try {
    auth = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (auth.role !== 'VENDOR_ADMIN') {
    // DEC-05: chỉ VENDOR_ADMIN dispute; VENDOR_STAFF (và role khác) → 403 TRƯỚC DB.
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Vendor admin only' }, { status: 403 });
  }
  if (!auth.vendorId) {
    return NextResponse.json({ error: 'NO_VENDOR_CONTEXT' }, { status: 403 });
  }
  const vendorId = auth.vendorId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }
  const parsed = disputeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
  }

  const prisma = getPrisma();

  let nextDisputeCount = 0;
  try {
    await withDbContext(prisma, auth, async (tx) => {
      const stmt = await tx.vendorStatement.findFirst({
        where: { id, vendorId },
        select: { id: true, status: true, disputeCount: true },
      });
      if (!stmt) {
        throw new StatementGuardError('NOT_FOUND');
      }
      if (stmt.status !== 'SENT' && stmt.status !== 'DISPUTED') {
        throw new StatementGuardError('INVALID_STATE', `Statement status is ${stmt.status}, cannot dispute`);
      }
      if (stmt.disputeCount >= 2) {
        throw new StatementGuardError('MAX_DISPUTES', 'Đã đạt giới hạn 2 vòng dispute');
      }

      // Guarded write (DEC-08): owner + state + count ràng buộc TẠI LÚC WRITE. Chỉ một
      // request đồng thời flip được vòng cuối (count=1); loser count=0 → phân loại lại.
      const res = await tx.vendorStatement.updateMany({
        where: { id, vendorId, status: { in: ['SENT', 'DISPUTED'] }, disputeCount: { lt: 2 } },
        data: { status: 'DISPUTED', disputeCount: { increment: 1 } },
      });
      if (res.count === 0) {
        const cur = await tx.vendorStatement.findFirst({
          where: { id, vendorId },
          select: { status: true, disputeCount: true },
        });
        if (!cur) {
          throw new StatementGuardError('NOT_FOUND');
        }
        if (cur.disputeCount >= 2) {
          throw new StatementGuardError('MAX_DISPUTES', 'Đã đạt giới hạn 2 vòng dispute');
        }
        throw new StatementGuardError('INVALID_STATE', `Statement status is ${cur.status}, cannot dispute`);
      }

      // Đọc lại count đã commit (giữ lock trong tx) → chính xác cho response + audit.
      const after = await tx.vendorStatement.findFirst({
        where: { id, vendorId },
        select: { disputeCount: true },
      });
      nextDisputeCount = after?.disputeCount ?? stmt.disputeCount + 1;

      // DEC-07: audit cùng transaction, KHÔNG swallow — fail → rollback state. Chỉ winner
      // (count=1) tới được đây → exactly-once audit cho một transition logic (RQ-07).
      await tx.auditLog.create({
        data: {
          action: 'STATEMENT_DISPUTED',
          actorId: auth.userId,
          entityType: 'VendorStatement',
          entityId: id,
          reason: parsed.data.reason,
          diff: { evidence: parsed.data.evidence, disputeCount: nextDisputeCount } as object,
        },
      });
    });
  } catch (err) {
    if (err instanceof StatementGuardError) {
      if (err.kind === 'NOT_FOUND') {
        return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
      }
      const code = err.kind === 'MAX_DISPUTES' ? 'MAX_DISPUTES' : 'INVALID_STATE';
      return NextResponse.json({ error: code, message: err.detail }, { status: 409 });
    }
    if (err instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/vendor/statements/[id]/dispute] error:', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: 'DISPUTED', disputeCount: nextDisputeCount });
}
