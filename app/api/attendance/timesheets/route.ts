/**
 * GET /api/attendance/timesheets — List TimesheetPeriods
 * POST /api/attendance/timesheets — Create TimesheetPeriod
 *
 * Phase 4 slice 4B STEP-11 (RQ-09).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  listTimesheetPeriods,
  createTimesheetPeriod,
  TimesheetServiceError,
  type CreateTimesheetPeriodInput,
} from '@/src/domains/attendance/timesheet.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LIST_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'ACCOUNTANT', 'DIRECTOR'] as const);
const CREATE_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'] as const);

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const role = ctx.role as typeof LIST_ROLES extends Set<infer T> ? T : never;
  if (!LIST_ROLES.has(role)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền` }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const take = Math.min(50, parseInt(searchParams.get('take') ?? '20', 10));
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);
  const status = searchParams.get('status') ?? undefined;
  const projectId = searchParams.get('projectId') ?? undefined;

  const prisma = getPrisma();
  try {
    const { rows, total } = await withDbContext(prisma, ctx, (tx) =>
      listTimesheetPeriods(tx, ctx, { take, skip, status: status as any, projectId }),
    );
    return NextResponse.json({ periods: rows, total, take, skip });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    console.error('[api/attendance/timesheets GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list periods' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const role = ctx.role as typeof CREATE_ROLES extends Set<infer T> ? T : never;
  if (!CREATE_ROLES.has(role)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền tạo` }, { status: 403 });
  }

  let body: CreateTimesheetPeriodInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON' }, { status: 400 });
  }

  if (!body.month || !body.year) {
    return NextResponse.json({ error: 'VALIDATION', message: 'Thiếu month hoặc year' }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const period = await withDbContext(prisma, ctx, (tx) => createTimesheetPeriod(tx, ctx, body));
    return NextResponse.json({ period }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    if (e instanceof TimesheetServiceError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === 'PERIOD_EXISTS' ? 409 : 400 });
    }
    console.error('[api/attendance/timesheets POST] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create period' }, { status: 500 });
  }
}
