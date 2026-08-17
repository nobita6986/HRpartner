/**
 * GET /api/staffing/orders/[id] — Get StaffingOrder detail
 * PATCH /api/staffing/orders/[id] — Update status
 *
 * Phase 4 slice 4A STEP-06 (RQ-01, RQ-18).
 *
 * Auth: cookie hrp_token (Phase 1).
 * 401: thiếu/sai token.
 * 403: role không có quyền.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  getStaffingOrder,
  updateStaffingOrderStatus,
  listStaffingOrderSlots,
  StaffingOrderServiceError,
} from '@/src/domains/staffing/order.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GET_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'SALE', 'DIRECTOR', 'ACCOUNTANT'] as const);
const UPDATE_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'] as const);

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!GET_ROLES.has(ctx.role as typeof GET_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền` }, { status: 403 });
  }

  const { id } = await params;
  const prisma = getPrisma();

  try {
    const [order, slots] = await Promise.all([
      withDbContext(prisma, ctx, (tx) => getStaffingOrder(tx, ctx, id)),
      withDbContext(prisma, ctx, (tx) => listStaffingOrderSlots(tx, ctx, id)),
    ]);
    return NextResponse.json({ order, slots });
  } catch (e) {
    if (e instanceof StaffingOrderServiceError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === 'NOT_FOUND' ? 404 : 400 });
    }
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/staffing/orders/[id] GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to get order' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!UPDATE_ROLES.has(ctx.role as typeof UPDATE_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền cập nhật` }, { status: 403 });
  }

  const { id } = await params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON' }, { status: 400 });
  }

  if (!body.status) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Thiếu field: status' }, { status: 400 });
  }

  const validStatuses = ['OPEN', 'CLOSING_SOON', 'CLOSED', 'CANCELLED'] as const;
  if (!validStatuses.includes(body.status as typeof validStatuses[number])) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: `status phải là một trong: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const updated = await withDbContext(prisma, ctx, (tx) =>
      updateStaffingOrderStatus(tx, ctx, id, body.status as any),
    );
    return NextResponse.json({ order: updated });
  } catch (e) {
    if (e instanceof StaffingOrderServiceError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === 'NOT_FOUND' ? 404 : 400 });
    }
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/staffing/orders/[id] PATCH] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to update order' }, { status: 500 });
  }
}
