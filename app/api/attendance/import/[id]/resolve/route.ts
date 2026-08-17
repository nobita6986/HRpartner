/**
 * PATCH /api/attendance/import/[id]/resolve — Resolve unmatched batch rows
 *
 * Phase 4 slice 4B STEP-13 (RQ-10, F00A bước 7).
 *
 * Resolve: map rawEmployeeCode → worker (e.g. AP-QM-1048 → Mai)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { resolveUnmatchedRows, ResolveServiceError } from '@/src/domains/attendance/resolve-adjustment.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RESOLVE_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'] as const);

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!RESOLVE_ROLES.has(ctx.role as typeof RESOLVE_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền resolve` }, { status: 403 });
  }

  const { id: batchId } = await params;
  let body: { resolves: Array<{ rowId: string; matchedWorkerId: string; note?: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.resolves) || body.resolves.length === 0) {
    return NextResponse.json({ error: 'VALIDATION', message: 'Thiếu resolves array' }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const result = await withDbContext(prisma, ctx, (tx) => resolveUnmatchedRows(tx, ctx, batchId, body.resolves));
    return NextResponse.json({ resolved: result }, { status: 200 });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    if (e instanceof ResolveServiceError) {
      const status = e.code === 'NOT_FOUND' ? 404
        : e.code === 'INVALID_STATUS' || e.code === 'ALREADY_RESOLVED' || e.code === 'ROW_NOT_UNMATCHED' ? 409 : 400;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    console.error('[api/attendance/import/[id]/resolve PATCH] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to resolve rows' }, { status: 500 });
  }
}
