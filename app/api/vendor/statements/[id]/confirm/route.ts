/**
 * POST /api/vendor/statements/[id]/confirm — P1 Portals STEP-07 / V5-M1-06b (RQ-05/RQ-07, DEC-07).
 *
 * G17: SENT → CONFIRMED. Cross-vendor → 404 (indistinguishable from absent).
 *
 * Read-guard + transition trong CÙNG transaction (`withDbContext`, L2-only vì
 * update dùng WhereUnique — L1 sẽ vỡ theo DEC-03). `where.vendorId` server-derived
 * khoá ownership; L2 RLS `vendor_statements` (USING + WITH CHECK có nhánh
 * `VENDOR AND vendor_id=session`) backstop. Sai state → 409, không side effect.
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

  if (auth.role !== 'VENDOR_ADMIN' && auth.role !== 'VENDOR_STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  if (!auth.vendorId) {
    return NextResponse.json({ error: 'NO_VENDOR_CONTEXT' }, { status: 403 });
  }
  const vendorId = auth.vendorId;

  const prisma = getPrisma();

  try {
    await withDbContext(prisma, auth, async (tx) => {
      const stmt = await tx.vendorStatement.findFirst({
        where: { id, vendorId },
        select: { id: true, status: true },
      });
      if (!stmt) {
        throw new StatementGuardError('NOT_FOUND');
      }
      if (stmt.status !== 'SENT') {
        throw new StatementGuardError(
          'INVALID_STATE',
          `Statement status is ${stmt.status}, can only confirm SENT`,
        );
      }
      await tx.vendorStatement.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      });
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
