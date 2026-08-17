/**
 * GET /api/attendance/timesheets/[id] — Get period detail
 * POST /api/attendance/timesheets/[id] — Transition period (REVIEW/APPROVE/LOCK/REOPEN)
 *
 * Phase 4 slice 4B STEP-11 (RQ-09).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  getTimesheetPeriod,
  transitionTimesheetPeriod,
  TimesheetServiceError,
} from '@/src/domains/attendance/timesheet.service';
import { IllegalTransitionError } from '@/src/shared/integrity/state-machine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const { id } = await params;
  const prisma = getPrisma();

  try {
    const period = await withDbContext(prisma, ctx, (tx) => getTimesheetPeriod(tx, id));
    if (!period) return NextResponse.json({ error: 'NOT_FOUND', message: `Period ${id} không tìm thấy` }, { status: 404 });
    return NextResponse.json({ period });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    console.error('[api/attendance/timesheets/[id] GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to get period' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const { id } = await params;
  let body: { action: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON' }, { status: 400 });
  }

  const VALID_ACTIONS = ['REVIEW', 'APPROVE', 'LOCK', 'REOPEN'] as const;
  if (!VALID_ACTIONS.includes(body.action as typeof VALID_ACTIONS[number])) {
    return NextResponse.json(
      { error: 'VALIDATION', message: `action phải là một trong: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  try {
    const updated = await withDbContext(prisma, ctx, (tx) =>
      transitionTimesheetPeriod(tx, ctx, id, body.action as any, { note: body.note }),
    );
    return NextResponse.json({ period: updated });
  } catch (e) {
    if (e instanceof TimesheetServiceError) {
      const status = e.code === 'NOT_FOUND' ? 404
        : e.code === 'INVALID_TRANSITION' || e.code === 'MAKER_EQ_CHECKER' || e.code === 'ALREADY_LOCKED' ? 409
        : e.code === 'PERMISSION_DENIED' ? 403 : 400;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    if (e instanceof IllegalTransitionError) {
      return NextResponse.json({ error: 'ILLEGAL_TRANSITION', message: e.message }, { status: 409 });
    }
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    console.error('[api/attendance/timesheets/[id] POST] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to transition period' }, { status: 500 });
  }
}
