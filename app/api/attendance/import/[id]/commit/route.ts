/**
 * POST /api/attendance/import/[id]/commit — Commit import batch
 *
 * Phase 4 slice 4B STEP-11 (RQ-07).
 *
 * 3 blockers → 409 + danh sách.
 * AttendanceEvent idempotent (UNIQUE source+external_event_id).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { commitBatch, checkBlockers } from '@/src/domains/attendance/import-commit.service';
import { ImportServiceError } from '@/src/domains/attendance/import.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COMMIT_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'] as const);

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!COMMIT_ROLES.has(ctx.role as typeof COMMIT_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền commit` }, { status: 403 });
  }

  const { id: batchId } = await params;
  const prisma = getPrisma();

  try {
    // Pre-check blockers (without committing)
    const blockers = await withDbContext(prisma, ctx, (tx) => checkBlockers(tx, batchId));
    if (blockers.length > 0) {
      return NextResponse.json({
        error: 'HAS_BLOCKERS',
        message: `Batch có ${blockers.length} blocker chưa resolve`,
        blockers,
      }, { status: 409 });
    }

    const result = await withDbContext(prisma, ctx, (tx) => commitBatch(tx, ctx, batchId));
    return NextResponse.json({ commit: result }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    if (e instanceof ImportServiceError) {
      const code = e.code as string;
      const status = code === 'NOT_FOUND' ? 404
        : code === 'HAS_BLOCKERS' ? 409
        : code === 'INVALID_STATUS' ? 409
        : 400;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    console.error('[api/attendance/import/[id]/commit POST] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to commit batch' }, { status: 500 });
  }
}
