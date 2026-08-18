/**
 * POST /api/attendance/adjustments -- Create TimesheetAdjustment
 * GET /api/attendance/adjustments?periodId=xxx -- List adjustments
 *
 * Phase 4 slice 4B STEP-13 (RQ-10, ADR-013) + R5.1 F5-05 (AC-10).
 *
 * ADR-013: LOCKED bat bien -- adjustments sau APPROVED truoc khi LOCK.
 * RQ-10: adjustment phai co reason + audit.
 * AC-10: POST boc withIdempotency (header x-idempotency-key, TTL 24h).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import {
  createTimesheetAdjustment,
  listTimesheetAdjustments,
  AdjustmentServiceError,
  type CreateAdjustmentInput,
} from '@/src/domains/attendance/resolve-adjustment.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADJUST_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM'] as const);

function getIdempotencyKey(req: NextRequest): string | undefined {
  return req.headers.get('x-idempotency-key') ?? undefined;
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!ADJUST_ROLES.has(ctx.role as typeof ADJUST_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} khong co quyen tao adjustment` }, { status: 403 });
  }

  let body: CreateAdjustmentInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phai la JSON' }, { status: 400 });
  }

  if (!body.periodId || !body.workerId || body.deltaHours === undefined) {
    return NextResponse.json({ error: 'VALIDATION', message: 'Thieu periodId, workerId hoac deltaHours' }, { status: 400 });
  }

  const prisma = getPrisma();
  const idempotencyKey = getIdempotencyKey(req);

  try {
    if (!idempotencyKey) {
      const adjustment = await withDbContext(prisma, ctx, (tx) => createTimesheetAdjustment(tx, ctx, body));
      return NextResponse.json({ adjustment }, { status: 201 });
    }

    const result = await withIdempotency({
      prisma,
      route: 'POST:/api/attendance/adjustments',
      actorId: ctx.userId,
      key: idempotencyKey,
      requestBody: body,
      handler: async () => {
        const adjustment = await withDbContext(prisma, ctx, (tx) => createTimesheetAdjustment(tx, ctx, body));
        return { body: { adjustment }, statusCode: 201 };
      },
    });
    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    if (e instanceof AdjustmentServiceError) {
      const status = e.code === 'NOT_FOUND' ? 404
        : e.code === 'INVALID_STATUS' ? 409
        : e.code === 'MISSING_REASON' ? 400 : 400;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    if (e instanceof Error && e.name === 'IdempotencyConflictError') {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: e.message }, { status: 409 });
    }
    console.error('[api/attendance/adjustments POST] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create adjustment' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periodId = searchParams.get('periodId');

  if (!periodId) {
    return NextResponse.json({ error: 'VALIDATION', message: 'Thieu periodId' }, { status: 400 });
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