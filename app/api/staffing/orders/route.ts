/**
 * GET /api/staffing/orders — List StaffingOrders
 * POST /api/staffing/orders — Create StaffingOrder
 *
 * Phase 4 slice 4A STEP-06 + AC-10 (RQ-01, RQ-18).
 *
 * Auth: cookie hrp_token (Phase 1).
 * 401: thiếu/sai token.
 * 403: role không có quyền (chỉ ADMIN/HR_MANAGER/HR_STAFF/PM/SALE được list, ADMIN/HR_MANAGER/HR_STAFF được tạo).
 *
 * AC-10: POST bọc withIdempotency (header x-idempotency-key, TTL 24h).
 * Outbox events được gửi trong service (createStaffingOrder, updateStaffingOrderStatus).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import {
  listStaffingOrders,
  createStaffingOrder,
  updateStaffingOrderStatus,
  StaffingOrderServiceError,
} from '@/src/domains/staffing/order.service';
import type { CreateStaffingOrderInput } from '@/src/domains/staffing/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LIST_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'SALE', 'DIRECTOR', 'ACCOUNTANT'] as const);
const CREATE_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'SALE'] as const);

/**
 * slot.hourlyRateVnd là BigInt trong Prisma, mà JSON.stringify không serialize được
 * BigInt ⇒ NextResponse.json(order) ném TypeError và route trả 500 SAU KHI đơn đã
 * commit (người dùng thấy lỗi, bấm lại, tạo trùng đơn). Đổi BigInt sang number —
 * VND nguyên nên còn rất xa Number.MAX_SAFE_INTEGER.
 */
function bigintSafe<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
}

function getIdempotencyKey(req: NextRequest): string | undefined {
  return req.headers.get('x-idempotency-key') ?? undefined;
}

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!LIST_ROLES.has(ctx.role as typeof LIST_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền xem StaffingOrders` }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const take = Math.min(50, parseInt(searchParams.get('take') ?? '20', 10));
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);

  const prisma = getPrisma();
  try {
    const { rows, total } = await withDbContext(prisma, ctx, (tx) =>
      listStaffingOrders(tx, ctx, { projectId, status: status as any, take, skip }),
    );
    return NextResponse.json({ orders: rows, total, take, skip });
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    if (e instanceof StaffingOrderServiceError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    }
    console.error('[api/staffing/orders GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list orders' }, { status: 500 });
  }
}

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

  if (!CREATE_ROLES.has(ctx.role as typeof CREATE_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền tạo StaffingOrder` }, { status: 403 });
  }

  let body: CreateStaffingOrderInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON hợp lệ' }, { status: 400 });
  }

  if (!body.projectId || !body.title?.trim() || !Array.isArray(body.slots) || body.slots.length === 0) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Thiếu required fields: projectId, title, slots[]' },
      { status: 400 },
    );
  }
  const invalidSlot = body.slots.some((slot) =>
    !slot.positionCode?.trim() || !slot.positionTitle?.trim() ||
    !Number.isInteger(slot.slotsNeeded) || slot.slotsNeeded <= 0 ||
    !slot.validFrom || Number.isNaN(new Date(slot.validFrom).getTime()),
  );
  if (invalidSlot) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Mỗi slot cần positionCode, positionTitle, headcount dương và validFrom hợp lệ' },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const idempotencyKey = getIdempotencyKey(req);

  // AC-10: idempotency wrap
  if (!idempotencyKey) {
    try {
      const order = await withDbContext(prisma, ctx, (tx) => createStaffingOrder(tx, ctx, body));
      return NextResponse.json(bigintSafe({ order }), { status: 201 });
    } catch (e) {
      if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
      if (e instanceof StaffingOrderServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
      console.error('[api/staffing/orders POST] error:', e);
      return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create order' }, { status: 500 });
    }
  }

  try {
    const result = await withIdempotency({
      prisma,
      route: 'POST:/api/staffing/orders',
      actorId: ctx.userId,
      key: idempotencyKey,
      requestBody: body,
      handler: async () => {
        const order = await withDbContext(prisma, ctx, (tx) => createStaffingOrder(tx, ctx, body));
        return { body: { order }, statusCode: 201 };
      },
    });
    return NextResponse.json(bigintSafe(result.body), { status: result.statusCode });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    if (e instanceof StaffingOrderServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    if (e instanceof Error && e.name === 'IdempotencyConflictError') {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: e.message }, { status: 409 });
    }
    console.error('[api/staffing/orders POST idempotency] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create order' }, { status: 500 });
  }
}
