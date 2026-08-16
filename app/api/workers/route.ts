/**
 * GET /api/workers — Phase 2 / RQ-06 / DEC-07
 *
 * List Workers theo scope role:
 *   - ADMIN/HR_MANAGER/DIRECTOR → tất cả (passthrough root).
 *   - HR_STAFF → assignedToId = ctx.userId.
 *   - SALE → OR(ownerId, assignedToId) = ctx.userId.
 *   - PM → workers có ACTIVE assignment trong project PM quản lý.
 *   - VENDOR_* → workers có source_claim accepted với vendorId.
 *   - CTV → workers có source_claim accepted với ctvId.
 *   - WORKER → chỉ chính mình (qua accountUserId).
 *   - MKT/ACCOUNTANT/CTV... không có scope → throw (403).
 *
 * Response masking:
 *   - 7 trường nhạy cảm → '***' nếu ctx không có CAN_VIEW_WORKER_SENSITIVE.
 *   - ADMIN short-circuit → ALL permissions → không mask.
 *
 * L1 (withAuthScope) + L2 (RLS via withDbContext) đều phải pass.
 *
 * Auth: cookie hrp_token (Phase 1) hoặc Authorization Bearer.
 * 401: thiếu/sai token.
 * 403: role không có scope Worker (DENY_BY_DEFAULT).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { projectWorkerList } from '@/src/shared/auth/worker-projection';
import { SCOPE_REGISTRY } from '@/src/shared/auth/scopes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json(
        { error: e.code, message: e.message },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to build auth context' },
      { status: 500 },
    );
  }

  const prisma = getPrisma();

  let rows;
  try {
    rows = await withDbContext(prisma, ctx, async (tx) => {
      // tx là transaction client (L2 RLS qua GUC). L1 scope: build WHERE từ registry
      // và pass vào tx.findMany. Admin/root roles → SCOPE_REGISTRY trả về undefined → no WHERE.
      const scope = SCOPE_REGISTRY['Worker']?.(ctx) ?? {};
      return tx.worker.findMany({
        where: scope,
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
    });
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json(
        { error: e.code, message: e.message },
        { status: 403 },
      );
    }
    console.error('[api/workers] query error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to query workers' },
      { status: 500 },
    );
  }

  // Resolve permission masking
  const effPerms = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
  const hasSensitive = ctx.role === 'ADMIN' || effPerms.has('CAN_VIEW_WORKER_SENSITIVE');

  const projected = projectWorkerList(rows, hasSensitive);
  return NextResponse.json({ workers: projected, count: projected.length });
}