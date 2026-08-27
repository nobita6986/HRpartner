/**
 * POST /api/vendor/statements/[id]/confirm — P1 Portals STEP-07 / V5-M1-06b
 *                                          — V5-M1-08 STEP-04/05 (RQ-05/RQ-07, DEC-05/07/08).
 *
 * G17: SENT → CONFIRMED. Chỉ `VENDOR_ADMIN` (DEC-05): `VENDOR_STAFF` → 403 TRƯỚC DB.
 * Cross-vendor → 404 (indistinguishable from absent).
 *
 * Guarded/optimistic write trong CÙNG transaction (`withDbContext`, L2-only vì update
 * dùng WhereUnique — L1 sẽ vỡ theo DEC-03): `updateMany({ id, vendorId, status:'SENT' })`
 * ràng buộc owner+state TẠI LÚC WRITE → hai request đồng thời chỉ một winner (count=1);
 * loser (count=0) phân loại lại bằng 1 read có scope: absent/cross-vendor→404, sai
 * state→409. `where.vendorId` server-derived + L2 RLS `vendor_statements` backstop.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

class StatementGuardError extends Error {
  constructor(readonly kind: 'NOT_FOUND' | 'INVALID_STATE', readonly detail?: string) {
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
    // DEC-05: chỉ VENDOR_ADMIN confirm; VENDOR_STAFF (và role khác) → 403 TRƯỚC DB.
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Vendor admin only' }, { status: 403 });
  }
  if (!auth.vendorId) {
    return NextResponse.json({ error: 'NO_VENDOR_CONTEXT' }, { status: 403 });
  }
  const vendorId = auth.vendorId;

  const prisma = getPrisma();

  try {
    await withDbContext(prisma, auth, async (tx) => {
      // Guarded write (DEC-08): owner + state ràng buộc TẠI LÚC WRITE. Chỉ SENT của
      // đúng vendor mới flip → CONFIRMED. Race: đúng một winner (count=1).
      const res = await tx.vendorStatement.updateMany({
        where: { id, vendorId, status: 'SENT' },
        data: { status: 'CONFIRMED' },
      });
      if (res.count === 0) {
        // Loser/không đủ điều kiện: phân loại bằng read có scope (không lộ cross-vendor).
        const cur = await tx.vendorStatement.findFirst({
          where: { id, vendorId },
          select: { status: true },
        });
        if (!cur) {
          throw new StatementGuardError('NOT_FOUND');
        }
        throw new StatementGuardError(
          'INVALID_STATE',
          `Statement status is ${cur.status}, can only confirm SENT`,
        );
      }
    });
  } catch (err) {
    if (err instanceof StatementGuardError) {
      if (err.kind === 'NOT_FOUND') {
        return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
      }
      return NextResponse.json({ error: 'INVALID_STATE', message: err.detail }, { status: 409 });
    }
    if (err instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/vendor/statements/[id]/confirm] error:', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: 'CONFIRMED' });
}
