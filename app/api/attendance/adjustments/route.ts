/**
 * POST /api/attendance/adjustments — Create TimesheetAdjustment
 * GET /api/attendance/adjustments?periodId=xxx — List adjustments
 *
 * Phase 4 slice 4B STEP-13 (RQ-10, ADR-013).
 *
 * ADR-013: LOCKED bất biến — adjustments sau APPROVED trước khi LOCK.
 * RQ-10: adjustment phải có reason + audit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  createTimesheetAdjustment,
  listTimesheetAdjustments,
  AdjustmentServiceError,
  type CreateAdjustmentInput,
} from '@/src/domains/attendance/resolve-adjustment.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADJUST_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM'] as const);

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!ADJUST_ROLES.has(ctx.role as typeof ADJUST_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền tạo adjustment` }, { status: 403 });
  }

  let body: CreateAdjustmentInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON' }, { status: 400 });
  }

  if (!body.periodId || !body.workerId || body.deltaHours === undefined) {
    return NextResponse.json({ error: 'VALIDATION', message: 'Thiếu periodId, workerId hoặc deltaHours' }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const adjustment = await withDbContext(prisma, ctx, (tx) => createTimesheetAdjustment(tx, ctx, body));
    return NextResponse.json({ adjustment }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    if (e instanceof AdjustmentServiceError) {
      const status = e.code === 'NOT_FOUND' ? 404
        : e.code === 'INVALID_STATUS' ? 409
        : e.code === 'MISSING_REASON' ? 400 : 400;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    console.error('[api/attendance/adjustments POST] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create adjustment' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periodId = searchParams.get('periodId');

  if (!periodId) {
    return NextResponse.json({ error: 'VALIDATION', message: 'Thiếu periodId' }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const adjustments = await listTimesheetAdjustments(prisma, periodId);
    return NextResponse.json({ adjustments });
  } catch (e) {
    console.error('[api/attendance/adjustments GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list adjustments' }, { status: 500 });
  }
}
