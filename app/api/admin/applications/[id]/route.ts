/**
 * GET /api/admin/applications/[id] — MP-2 STEP-04 (RQ-05, DEC-06).
 *
 * Authenticated application detail + append-only status history. RLS-scoped via
 * `withDbContext`; `getApplicationDetail` is the DEC-06 role gate (FORBIDDEN 403)
 * and returns NOT_FOUND(404) for a missing/out-of-scope row. The detail DTO
 * carries contact PII (permitted for scoped queue roles, 4.3) but never any
 * forbidden internal field.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  getApplicationDetail,
  AdminApplicationError,
} from '@/src/domains/applications/application-queue.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const prisma = getPrisma();
  try {
    const detail = await withDbContext(prisma, ctx, (tx) => getApplicationDetail(tx, ctx, id));
    return NextResponse.json({ application: detail });
  } catch (e) {
    if (e instanceof AdminApplicationError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.httpStatus });
    }
    console.error('[api/admin/applications/:id GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to fetch application' }, { status: 500 });
  }
}
