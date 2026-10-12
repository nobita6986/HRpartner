/**
 * GET /api/staffing/orders/[id] — Get StaffingOrder detail
 * PATCH /api/staffing/orders/[id] — Update status (with idempotency)
 *
 * Phase 4 slice 4A STEP-06 + AC-10 (RQ-01, RQ-18).
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
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import {
  getStaffingOrderDetail,
  updateStaffingOrder,
  updateStaffingOrderStatus,
  deleteStaffingOrder,
  StaffingOrderServiceError,
} from '@/src/domains/staffing/order.service';
import type { UpdateStaffingOrderInput } from '@/src/domains/staffing/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GET_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'SALE', 'DIRECTOR', 'ACCOUNTANT'] as const);
const UPDATE_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'SALE'] as const);
const DELETE_ROLES = new Set(['ADMIN'] as const);

function getIdempotencyKey(req: NextRequest): string | undefined {
  return req.headers.get('x-idempotency-key') ?? undefined;
}

/**
 * slot.hourlyRateVnd là BigInt trong Prisma và JSON.stringify không serialize được
 * BigInt ⇒ trả nguyên object là 500. Mọi đơn có lương giờ (kể cả dữ liệu seed cũ)
 * đều không đọc được cho tới khi đổi BigInt sang number.
 */
function bigintSafe<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
}

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!GET_ROLES.has(ctx.role as typeof GET_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền` }, { status: 403 });
  }

  const { id } = await params;
  const prisma = getPrisma();

  try {
    // t1a-staffing-order-management: trả về detail đầy đủ (slots + jobOpenings
    // + recruiterAssignments) để phục vụ trang quản lý Nhu cầu tuyển dụng.
    const order = await withDbContext(prisma, ctx, (tx) => getStaffingOrderDetail(tx, ctx, id));
    return NextResponse.json(bigintSafe({ order }));
  } catch (e) {
    if (e instanceof StaffingOrderServiceError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === 'NOT_FOUND' ? 404 : 400 });
    }
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    console.error('[api/staffing/orders/[id] GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to get order' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
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
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: `status phải là một trong: ${validStatuses.join(', ')}` },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const idempotencyKey = getIdempotencyKey(req);

  if (!idempotencyKey) {
    try {
      const updated = await withDbContext(prisma, ctx, (tx) =>
        updateStaffingOrderStatus(tx, ctx, id, body.status as any),
      );
      return NextResponse.json({ order: updated });
    } catch (e) {
      if (e instanceof StaffingOrderServiceError) {
        return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === 'NOT_FOUND' ? 404 : 400 });
      }
      if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
      console.error('[api/staffing/orders/[id] PATCH] error:', e);
      return NextResponse.json({ error: 'INTERNAL', message: 'Failed to update order' }, { status: 500 });
    }
  }

  try {
    const result = await withIdempotency({
      prisma,
      route: `PATCH:/api/staffing/orders/${id}`,
      actorId: ctx.userId,
      key: idempotencyKey,
      requestBody: body,
      handler: async () => {
        const updated = await withDbContext(prisma, ctx, (tx) =>
          updateStaffingOrderStatus(tx, ctx, id, body.status as any),
        );
        return { body: { order: updated }, statusCode: 200 };
      },
    });
    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (e) {
    if (e instanceof StaffingOrderServiceError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === 'NOT_FOUND' ? 404 : 400 });
    }
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    if (e instanceof Error && e.name === 'IdempotencyConflictError') {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: e.message }, { status: 409 });
    }
    console.error('[api/staffing/orders/[id] PATCH idempotency] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to update order' }, { status: 500 });
  }
}

/**
 * t1a-staffing-order-management: PUT /api/staffing/orders/[id]
 *
 * Sửa title, description, deadlineDate và slots của Nhu cầu tuyển dụng.
 * Quy tắc:
 *   - ProjectId KHÔNG đổi (input không nhận `projectId`).
 *   - `slotsNeeded >= slotsFilled` cho mọi slot update.
 *   - Không xoá slot có JobOpening/Submission/Assignment/NeoJobOpening.
 *
 * Quyền: ADMIN/HR_MANAGER/SALE (giống tạo/status).
 * Idempotency: chấp nhận header `x-idempotency-key` (TTL 24h, AC-10).
 *
 * 200: `{ order: { id, updated: true } }`
 * 400: VALIDATION_ERROR (body không hợp lệ)
 * 403: PERMISSION_DENIED
 * 404: NOT_FOUND
 * 409: ORDER_NOT_EDITABLE | SLOT_HAS_DEPENDENCIES
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!UPDATE_ROLES.has(ctx.role as typeof UPDATE_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền sửa` }, { status: 403 });
  }

  const { id } = await params;
  let body: UpdateStaffingOrderInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON' }, { status: 400 });
  }

  // ─── Validation (CORRECTION 1/1 T0): tất cả 400 không rơi xuống 500 ───
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Body phải là object' }, { status: 400 });
  }
  if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Tiêu đề phải là chuỗi khác rỗng' }, { status: 400 });
  }
  if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Mô tả phải là chuỗi hoặc null' }, { status: 400 });
  }
  if (body.deadlineDate !== undefined && body.deadlineDate !== null && !isIsoDateOnly(body.deadlineDate)) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Hạn tuyển phải là ngày hợp lệ (YYYY-MM-DD) hoặc null' }, { status: 400 });
  }
  if (body.slots !== undefined && !Array.isArray(body.slots)) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Vị trí tuyển phải là mảng' }, { status: 400 });
  }
  if (body.slots) {
    for (const [idx, slot] of body.slots.entries()) {
      if (!slot || typeof slot !== 'object') {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: `Vị trí #${idx} không hợp lệ` },
          { status: 400 },
        );
      }
      if (!slot.positionCode?.trim() || !slot.positionTitle?.trim()) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: `Vị trí #${idx} cần có mã và tên` },
          { status: 400 },
        );
      }
      if (!Number.isInteger(slot.slotsNeeded) || slot.slotsNeeded < 0) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: `Vị trí #${idx}: số lượng cần tuyển phải là số nguyên không âm` },
          { status: 400 },
        );
      }
      // hourlyRateVnd: safe integer >= 0 hoặc null
      if (slot.hourlyRateVnd !== undefined && slot.hourlyRateVnd !== null) {
        if (typeof slot.hourlyRateVnd !== 'number' || !Number.isInteger(slot.hourlyRateVnd) || slot.hourlyRateVnd < 0) {
          return NextResponse.json(
            { error: 'VALIDATION_ERROR', message: `Vị trí #${idx}: lương/giờ phải là số nguyên không âm hoặc null` },
            { status: 400 },
          );
        }
        // JSON.Number.MAX_SAFE_INTEGER = 2^53 - 1
        if (!Number.isSafeInteger(slot.hourlyRateVnd)) {
          return NextResponse.json(
            { error: 'VALIDATION_ERROR', message: `Vị trí #${idx}: lương/giờ vượt quá giá trị an toàn` },
            { status: 400 },
          );
        }
      }
      // shiftStart/shiftEnd: HH:mm hoặc null
      if (slot.shiftStart !== undefined && slot.shiftStart !== null && !isTimeOfDay(slot.shiftStart)) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: `Vị trí #${idx}: giờ vào phải là HH:mm hoặc null` },
          { status: 400 },
        );
      }
      if (slot.shiftEnd !== undefined && slot.shiftEnd !== null && !isTimeOfDay(slot.shiftEnd)) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: `Vị trí #${idx}: giờ ra phải là HH:mm hoặc null` },
          { status: 400 },
        );
      }
      // validFrom: bắt buộc, hợp lệ
      if (!slot.validFrom || !isIsoDateOnly(slot.validFrom)) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: `Vị trí #${idx}: hiệu lực từ ngày phải là ngày hợp lệ (YYYY-MM-DD)` },
          { status: 400 },
        );
      }
      // validTo: optional, nếu có phải hợp lệ VÀ >= validFrom
      if (slot.validTo !== undefined && slot.validTo !== null) {
        if (!isIsoDateOnly(slot.validTo)) {
          return NextResponse.json(
            { error: 'VALIDATION_ERROR', message: `Vị trí #${idx}: hiệu lực đến ngày phải là ngày hợp lệ (YYYY-MM-DD) hoặc null` },
            { status: 400 },
          );
        }
        if (slot.validTo < slot.validFrom) {
          return NextResponse.json(
            { error: 'VALIDATION_ERROR', message: `Vị trí #${idx}: hiệu lực đến ngày (${slot.validTo}) phải >= hiệu lực từ ngày` },
            { status: 400 },
          );
        }
      }
    }
  }

  const prisma = getPrisma();
  const idempotencyKey = getIdempotencyKey(req);

  if (!idempotencyKey) {
    try {
      const result = await withDbContext(prisma, ctx, (tx) => updateStaffingOrder(tx, ctx, id, body));
      return NextResponse.json({ order: result });
    } catch (e) {
      return mapStaffingOrderEditError(e);
    }
  }

  try {
    const result = await withIdempotency({
      prisma,
      route: `PUT:/api/staffing/orders/${id}`,
      actorId: ctx.userId,
      key: idempotencyKey,
      requestBody: body,
      handler: async () => {
        const updated = await withDbContext(prisma, ctx, (tx) => updateStaffingOrder(tx, ctx, id, body));
        return { body: { order: updated }, statusCode: 200 };
      },
    });
    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (e) {
    if (e instanceof Error && e.name === 'IdempotencyConflictError') {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: e.message }, { status: 409 });
    }
    return mapStaffingOrderEditError(e);
  }
}

/**
 * t1a-staffing-order-management: DELETE /api/staffing/orders/[id]
 *
 * Xoá vĩnh viễn Nhu cầu tuyển dụng. CHỈ ADMIN.
 *
 * CORRECTION 1/1 (T0): DELETE dùng `withIdempotency` đúng contract —
 * cùng `x-idempotency-key` → cùng response (replay); khác key hoặc khác
 * payload với key đã dùng → 409 IDEMPOTENCY_CONFLICT. Click "Xóa vĩnh viễn"
 * nhiều lần trong cùng dialog (cùng key) an toàn, không double-delete.
 *
 * 200: `{ order: { id, deleted: true } }`
 * 400: VALIDATION_ERROR (thiếu `x-idempotency-key` cho idempotency-safe route)
 * 403: PERMISSION_DENIED (non-ADMIN)
 * 404: NOT_FOUND
 * 409: ORDER_NOT_DELETABLE | IDEMPOTENCY_CONFLICT
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!DELETE_ROLES.has(ctx.role as typeof DELETE_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: 'Chỉ ADMIN mới có quyền xoá vĩnh viễn nhu cầu tuyển dụng.' },
      { status: 403 },
    );
  }

  const { id } = await params;
  const prisma = getPrisma();
  const idempotencyKey = getIdempotencyKey(req);

  // CORRECTION 1/1 (T0): DELETE yêu cầu idempotency key để chống double-click
  // và tuân thủ contract "same key → same response". Không có key → 400.
  if (!idempotencyKey) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Thiếu header x-idempotency-key cho thao tác xoá vĩnh viễn.',
      },
      { status: 400 },
    );
  }

  try {
    const result = await withIdempotency({
      prisma,
      route: `DELETE:/api/staffing/orders/${id}`,
      actorId: ctx.userId,
      key: idempotencyKey,
      // DELETE không nhận body — requestBody null để cùng key replay cùng response.
      requestBody: { _delete: true, orderId: id },
      handler: async () => {
        const deleted = await withDbContext(prisma, ctx, (tx) =>
          deleteStaffingOrder(tx, ctx, id),
        );
        return { body: { order: deleted }, statusCode: 200 };
      },
    });
    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (e) {
    if (e instanceof Error && e.name === 'IdempotencyConflictError') {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: e.message }, { status: 409 });
    }
    return mapStaffingOrderEditError(e);
  }
}

/**
 * Map lỗi service sang HTTP response. 404/409/403 tách riêng để client dễ
 * xử lý typed error.
 */
function mapStaffingOrderEditError(e: unknown): NextResponse {
  if (e instanceof StaffingOrderServiceError) {
    if (e.code === 'NOT_FOUND') {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 404 });
    }
    if (e.code === 'PERMISSION_DENIED') {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    if (e.code === 'ORDER_NOT_DELETABLE' || e.code === 'SLOT_HAS_DEPENDENCIES') {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 409 });
    }
    if (e.code === 'ORDER_NOT_EDITABLE') {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 409 });
    }
    return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
  }
  if (e instanceof AuthScopeError) {
    return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
  }
  console.error('[api/staffing/orders/[id]] error:', e);
  return NextResponse.json({ error: 'INTERNAL', message: 'Failed to process request' }, { status: 500 });
}

/**
 * CORRECTION 1/1 (T0): validator helpers cho PUT body.
 * - isIsoDateOnly: YYYY-MM-DD hợp lệ
 * - isTimeOfDay: HH:mm (24h) hợp lệ
 */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_OF_DAY_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isIsoDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return false;
  // Round-trip: đảm bảo Date parse trùng với input (loại bỏ "2026-02-30").
  return d.toISOString().slice(0, 10) === value;
}

function isTimeOfDay(value: unknown): value is string {
  return typeof value === 'string' && TIME_OF_DAY_RE.test(value);
}
