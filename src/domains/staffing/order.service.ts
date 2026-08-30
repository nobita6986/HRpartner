/**
 * StaffingOrder service — Phase 4 slice 4A STEP-02 (RQ-01).
 *
 * DEC-01: CRUD StaffingOrder + slot + `slotsFilled` cùng transaction (O9).
 * DEC-08: quota 2 project trong 1 transaction → STEP-03 (transfer.service).
 *
 * Pattern Phase 2: API route nhận AuthContext, gọi `withDbContext(prisma, ctx, tx => {
 *   return staffingOrderService.listOrders(tx, ctx, filters);
 * })`. Service dùng `tx` trực tiếp (không dùng `tx.$extends` vì transaction
 * client không support $extends).
 *
 * L1 scope: áp dụng WHERE clause thủ công qua `SCOPE_REGISTRY[model]?.(ctx)`.
 * L2 scope: `withDbContext` set GUC trước transaction.
 *
 * Import từ Phase 2/3:
 *   - withDbContext, withAuthScope (Prisma extension)
 *   - SCOPE_REGISTRY (scopes/index.ts)
 *   - AuthContext (auth-context.ts)
 *   - TicketServiceError (legacy, throw cho route handler)
 */

import type { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { SCOPE_REGISTRY } from '@/src/shared/auth/scopes';
import { buildStaffingOrderScope, buildStaffingOrderSlotScope } from '@/src/shared/auth/scopes/staffing.scope';
import { enqueueOutbox } from '@/src/shared/integrity/outbox';
import type {
  CreateStaffingOrderInput,
  CreateSlotInput,
  StaffingOrderStatus,
} from './types';

// ─── Error types ─────────────────────────────────────────────────────────────

export class StaffingOrderServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'ALREADY_EXISTS'
      | 'SLOT_FULL'
      | 'INVALID_STATUS'
      | 'PERMISSION_DENIED'
      | 'PROJECT_QUOTA_EXCEEDED'
      | 'INTERNAL',
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'StaffingOrderServiceError';
  }
}

// ─── Code generator ─────────────────────────────────────────────────────────

/** Lay ma SO tiep theo: "SO-" + zero-padded sequential integer.
 *  DEC-02: pg_advisory_xact_lock chong race giua 2 request dong thoi.
 *  Advisory lock key = hashtext('staffing_order_code') (EV-12, giong pattern transfer.service.ts).
 */
async function generateOrderCode(tx: Prisma.TransactionClient): Promise<string> {
  // Chong race: khoa transaction-scoped voi key hang. Moi request tao order
  // deu phai cho de lay lock nay truoc khi SELECT MAX+1.
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('staffing_order_code'))`);
  const rows = await tx.$queryRawUnsafe<Array<{ max_num: bigint | null }>>(
    `SELECT MAX(SUBSTRING(code FROM 4)::bigint) AS max_num FROM staffing_orders WHERE code ~ '^SO-[0-9]+$'`,
  );
  const next = Number(rows[0]?.max_num ?? 0n) + 1;
  return `SO-${String(next).padStart(5, '0')}`;
}

// ─── CRUD operations ───────────────────────────────────────────────────────────

/**
 * Tạo StaffingOrder + N slot trong 1 transaction.
 * slotsFilled luôn = 0 lúc tạo.
 * Mỗi slot có hourlyRateVnd → BigInt (ADR-010).
 */
export async function createStaffingOrder(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: CreateStaffingOrderInput,
): Promise<Prisma.StaffingOrderGetPayload<{ include: { slots: true } }>> {
  const code = await generateOrderCode(tx);

  const order = await tx.staffingOrder.create({
    data: {
      code,
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      deadlineDate: input.deadlineDate ? new Date(input.deadlineDate) : null,
      status: 'OPEN',
      slots: {
        create: input.slots.map((slot) => ({
          positionCode: slot.positionCode,
          positionTitle: slot.positionTitle,
          slotsNeeded: slot.slotsNeeded,
          slotsFilled: 0,
          hourlyRateVnd: slot.hourlyRateVnd !== undefined
            ? BigInt(slot.hourlyRateVnd)
            : null,
          shiftStart: slot.shiftStart ?? null,
          shiftEnd: slot.shiftEnd ?? null,
          validFrom: new Date(slot.validFrom),
          validTo: slot.validTo ? new Date(slot.validTo) : null,
          workLocation: slot.workLocation ?? null,
        })),
      },
    },
    include: { slots: true },
  });

  // Outbox: publish event — same tx, rollback-safe
  await enqueueOutbox(tx, {
    eventType: 'StaffingOrderCreated',
    aggregateId: order.id,
    payload: {
      orderId: order.id,
      code: order.code,
      projectId: order.projectId,
      slotCount: order.slots.length,
      createdBy: ctx.userId,
    },
  });

  return order;
}

/**
 * List StaffingOrders với L1 scope (ADMIN/HR/SALE thấy all; PM chỉ project mình).
 * Slots không include — page riêng.
 */
export async function listStaffingOrders(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  opts?: {
    projectId?: string;
    status?: StaffingOrderStatus;
    take?: number;
    skip?: number;
  },
) {
  const scopeWhere = buildStaffingOrderScope(ctx);
  const where: Prisma.StaffingOrderWhereInput = {
    ...scopeWhere,
    ...(opts?.projectId && { projectId: opts.projectId }),
    ...(opts?.status && { status: opts.status }),
  };

  const [rows, total] = await Promise.all([
    tx.staffingOrder.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, code: true } },
        slots: { select: { id: true, positionTitle: true, slotsNeeded: true, slotsFilled: true, validTo: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: opts?.take ?? 50,
      skip: opts?.skip ?? 0,
    }),
    tx.staffingOrder.count({ where }),
  ]);

  return { rows, total };
}

/**
 * Get 1 StaffingOrder by ID với L1 scope + slots.
 */
export async function getStaffingOrder(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  orderId: string,
) {
  const scopeWhere = buildStaffingOrderScope(ctx);
  const order = await tx.staffingOrder.findFirst({
    where: { id: orderId, ...scopeWhere },
    include: {
      project: { select: { id: true, name: true, code: true, quota: true, filled: true } },
      slots: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order) {
    throw new StaffingOrderServiceError('NOT_FOUND', `StaffingOrder ${orderId} not found or no permission`);
  }

  return order;
}

/**
 * Cập nhật trạng thái StaffingOrder (OPEN | CLOSING_SOON | CLOSED | CANCELLED).
 * Chỉ ADMIN/HR_MANAGER/HR_STAFF được phép.
 * OPEN → CLOSED / CANCELLED là terminal states.
 */
export async function updateStaffingOrderStatus(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  orderId: string,
  newStatus: StaffingOrderStatus,
) {
  if (!['ADMIN', 'HR_MANAGER', 'SALE'].includes(ctx.role)) {
    throw new StaffingOrderServiceError(
      'PERMISSION_DENIED',
      `Role ${ctx.role} không có quyền cập nhật StaffingOrder`,
    );
  }

  const VALID_TRANSITIONS: Record<string, StaffingOrderStatus[]> = {
    OPEN: ['CLOSING_SOON', 'CLOSED', 'CANCELLED'],
    CLOSING_SOON: ['OPEN', 'CLOSED', 'CANCELLED'],
    CLOSED: [],
    CANCELLED: [],
  };

  const current = await tx.staffingOrder.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!current) {
    throw new StaffingOrderServiceError('NOT_FOUND', `StaffingOrder ${orderId} not found`);
  }

  const allowed = VALID_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new StaffingOrderServiceError(
      'INVALID_STATUS',
      `Không thể chuyển ${current.status} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }

  const updated = await tx.staffingOrder.update({
    where: { id: orderId },
    data: { status: newStatus },
    select: { id: true, status: true },
  });

  // Outbox: publish event
  await enqueueOutbox(tx, {
    eventType: 'StaffingOrderStatusChanged',
    aggregateId: orderId,
    payload: {
      orderId,
      fromStatus: current.status,
      toStatus: newStatus,
      changedBy: ctx.userId,
    },
  });

  return updated;
}

/**
 * List slots của 1 order với L1 scope.
 */
export async function listStaffingOrderSlots(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  orderId: string,
) {
  const slotScope = buildStaffingOrderSlotScope(ctx);
  return tx.staffingOrderSlot.findMany({
    where: {
      staffingOrderId: orderId,
      ...slotScope,
    },
    orderBy: { createdAt: 'asc' },
  });
}
