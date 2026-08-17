/**
 * POST /api/staffing/transfers — Guided Transfer (STEP-06, RQ-02).
 *
 * Body: { workerId, fromProjectId, toProjectId, transferDate, positionCode?, positionTitle?, transferReason? }
 *
 * Auth: cookie hrp_token (Phase 1).
 * 401: thiếu/sai token.
 * 403: role không có quyền (ADMIN/HR_MANAGER/HR_STAFF).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  transferWorker,
  bulkTransferWorker,
  TransferServiceError,
} from '@/src/domains/staffing/transfer.service';
import type { TransferWorkerInput } from '@/src/domains/staffing/transfer.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TRANSFER_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'] as const);

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

  if (!TRANSFER_ROLES.has(ctx.role as typeof TRANSFER_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền transfer worker` },
      { status: 403 },
    );
  }

  let body: TransferWorkerInput | TransferWorkerInput[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON' }, { status: 400 });
  }

  const prisma = getPrisma();

  // Single transfer
  if (!Array.isArray(body)) {
    try {
      const result = await withDbContext(prisma, ctx, (tx) => transferWorker(tx, ctx, body));
      return NextResponse.json({ transfer: result }, { status: 201 });
    } catch (e) {
      if (e instanceof TransferServiceError) {
        const status = e.code === 'PERMISSION_DENIED' ? 403
          : e.code === 'NO_ACTIVE_ASSIGNMENT' || e.code === 'MULTIPLE_ACTIVE_ASSIGNMENTS' ? 409
          : e.code === 'PROJECT_QUOTA_FULL' ? 409 : 400;
        return NextResponse.json({ error: e.code, message: e.message }, { status });
      }
      if (e instanceof AuthScopeError) {
        return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
      }
      console.error('[api/staffing/transfers POST] error:', e);
      return NextResponse.json({ error: 'INTERNAL', message: 'Failed to transfer worker' }, { status: 500 });
    }
  }

  // Bulk transfer
  try {
    const result = await bulkTransferWorker(prisma, ctx, body);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[api/staffing/transfers POST bulk] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to bulk transfer' }, { status: 500 });
  }
}
