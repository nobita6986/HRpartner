/**
 * GET /api/admin/audit-logs — T1B-OPS audit log viewer (ADMIN-only).
 *
 * DEC-T1B-OPS-02 / 03: tra cứu audit_logs với filter + pagination. Diff (JSON)
 * được redact PII ở service (`redactAuditDiff`).
 *
 * Auth: ADMIN-only — HR_MANAGER / HR_STAFF / PM / ... → 403.
 *
 * Query (Zod):
 *   - entityType?: string
 *   - entityId?: string
 *   - action?: string
 *   - actorId?: string
 *   - fromDate?: ISO date (YYYY-MM-DD)
 *   - toDate?: ISO date (YYYY-MM-DD)
 *   - skip?: number (>= 0)
 *   - take?: number (1..200; clamp 200)
 *
 * KHÔNG export Excel/CSV — out of scope. KHÔNG delete audit_log — immutable.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { AuthError, listAuditLogs } from '@/src/domains/audit/audit-logs.read-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const QuerySchema = z.object({
  entityType: z.string().min(1).max(64).optional(),
  entityId: z.string().min(1).max(64).optional(),
  action: z.string().min(1).max(64).optional(),
  actorId: z.string().min(1).max(64).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to build auth context' },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Invalid query.', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const filter = parsed.data;

  const prisma = getPrisma();
  try {
    const result = await withAuthorizedDbReadOnly(prisma, ctx, async (tx) => {
      return listAuditLogs(tx as never, ctx as never, filter);
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      const status = err.code === 'UNAUTHENTICATED' ? 401 : 403;
      return NextResponse.json({ error: err.code, message: err.message }, { status });
    }
    if (err instanceof AuthScopeError) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Bạn không có quyền tra cứu nhật ký kiểm toán.' },
        { status: 403 },
      );
    }
    console.error('[api/admin/audit-logs] error:', err);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to query audit logs' },
      { status: 500 },
    );
  }
}