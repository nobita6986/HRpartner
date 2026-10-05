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
  UpdateSlotInput,
  UpdateStaffingOrderInput,
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
      | 'ORDER_NOT_EDITABLE'
      | 'ORDER_NOT_DELETABLE'
      | 'SLOT_HAS_DEPENDENCIES'
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

// ═══════════════════════════════════════════════════════════════════════════
// t1a-staffing-order-management: detail / edit / delete operations.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * t1a-staffing-order-management (DEC-01 — read-only detail):
 * Lấy đầy đủ thông tin quản lý Nhu cầu tuyển dụng — order + slots (kèm job
 * opening) + job openings của order (kèm posting) + recruiter assignments.
 * `RecruiterAssignmentManager` dùng API riêng để list ACTIVE/REVOKED, nhưng
 * mình vẫn include ở đây để hiển thị ngữ cảnh trên read-only header.
 *
 * L1 scope: áp dụng cho `staffingOrder` (qua `buildStaffingOrderScope`).
 */
export async function getStaffingOrderDetail(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  orderId: string,
) {
  const scopeWhere = buildStaffingOrderScope(ctx);
  const order = await tx.staffingOrder.findFirst({
    where: { id: orderId, ...scopeWhere },
    include: {
      project: { select: { id: true, name: true, code: true } },
      slots: {
        orderBy: { createdAt: 'asc' },
        // Cần đếm số phụ thuộc trên từng slot để UI cảnh báo.
        include: {
          jobOpening: { select: { id: true, status: true } },
          neoJobOpenings: { select: { id: true, status: true } },
          _count: {
            select: { submissions: true, assignments: true },
          },
        },
      },
      jobOpenings: {
        orderBy: { createdAt: 'asc' },
        include: { posting: { select: { id: true, status: true, slug: true } } },
      },
      recruiterAssignments: {
        orderBy: { assignedAt: 'desc' },
        select: {
          id: true,
          recruiterUserId: true,
          status: true,
          reason: true,
          assignedAt: true,
          revokedAt: true,
        },
      },
    },
  });

  if (!order) {
    throw new StaffingOrderServiceError('NOT_FOUND', `StaffingOrder ${orderId} not found or no permission`);
  }

  return order;
}

/** Các trường của `UpdateSlotInput` được phép ghi vào Prisma khi update/create slot. */
function pickSlotWriteData(slot: UpdateSlotInput) {
  return {
    positionCode: slot.positionCode,
    positionTitle: slot.positionTitle,
    slotsNeeded: slot.slotsNeeded,
    hourlyRateVnd: slot.hourlyRateVnd === null || slot.hourlyRateVnd === undefined
      ? null
      : BigInt(slot.hourlyRateVnd),
    shiftStart: slot.shiftStart ?? null,
    shiftEnd: slot.shiftEnd ?? null,
    validFrom: new Date(slot.validFrom),
    validTo: slot.validTo ? new Date(slot.validTo) : null,
    workLocation: slot.workLocation ?? null,
  };
}

/**
 * t1a-staffing-order-management: sửa Nhu cầu tuyển dụng (title, description,
 * deadlineDate, slots). Quy tắc backend (RQ-06):
 *
 *   1. Project KHÔNG thể đổi sau khi tạo — `projectId` không xuất hiện trong
 *      `UpdateStaffingOrderInput`, nên rule này tự động thoả mãn. Nếu input
 *      có truyền field lạ, service chỉ pick field được phép (defensive).
 *   2. `slotsNeeded >= slotsFilled` cho mọi slot sau khi apply payload —
 *      ngăn hạ xuống dưới mức đã tuyển.
 *   3. Không xoá slot đã có JobOpening, JobPosting (qua neoJobOpenings),
 *      CandidateSubmission (submissions) hoặc ProjectAssignment (assignments)
 *      — trả `SLOT_HAS_DEPENDENCIES` 409.
 *
 * Quyền: `ADMIN`, `HR_MANAGER`, `SALE` (cùng tập với create/status).
 */
export async function updateStaffingOrder(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  orderId: string,
  input: UpdateStaffingOrderInput,
) {
  if (!['ADMIN', 'HR_MANAGER', 'SALE'].includes(ctx.role)) {
    throw new StaffingOrderServiceError(
      'PERMISSION_DENIED',
      `Role ${ctx.role} không có quyền sửa StaffingOrder`,
    );
  }

  const existing = await tx.staffingOrder.findFirst({
    where: { id: orderId, ...buildStaffingOrderScope(ctx) },
    include: {
      slots: {
        orderBy: { createdAt: 'asc' },
        include: {
          _count: { select: { submissions: true, assignments: true } },
          neoJobOpenings: { select: { id: true } },
          jobOpening: { select: { id: true } },
        },
      },
    },
  });

  if (!existing) {
    throw new StaffingOrderServiceError('NOT_FOUND', `StaffingOrder ${orderId} not found or no permission`);
  }

  const orderData: Prisma.StaffingOrderUpdateInput = {};
  if (input.title !== undefined) orderData.title = input.title.trim();
  if (input.description !== undefined) orderData.description = input.description;
  if (input.deadlineDate !== undefined) {
    orderData.deadlineDate = input.deadlineDate ? new Date(input.deadlineDate) : null;
  }

  if (input.slots !== undefined) {
    // Phase 1: validate delete guard trước khi thay đổi — không phụ thuộc
    // thứ tự update. Tập id hiện tại giúp phát hiện slot yêu cầu `_delete=true`
    // nhưng id không tồn tại trong order.
    const existingById = new Map(existing.slots.map((s) => [s.id, s]));

    for (const incoming of input.slots) {
      if (!incoming._delete) continue;
      if (!incoming.id) {
        throw new StaffingOrderServiceError(
          'ORDER_NOT_EDITABLE',
          'Slot muốn xoá phải có id hợp lệ thuộc order hiện tại.',
        );
      }
      const current = existingById.get(incoming.id);
      if (!current) {
        throw new StaffingOrderServiceError(
          'ORDER_NOT_EDITABLE',
          `Slot id=${incoming.id} không tồn tại trong order.`,
        );
      }
      const deps =
        current._count.submissions +
        current._count.assignments +
        (current.jobOpening ? 1 : 0) +
        current.neoJobOpenings.length;
      if (deps > 0) {
        throw new StaffingOrderServiceError(
          'SLOT_HAS_DEPENDENCIES',
          `Slot "${current.positionTitle}" đã có JobOpening, đơn ứng tuyển hoặc placement; không thể xoá.`,
        );
      }
    }

    // Phase 2: validate slotsNeeded >= slotsFilled cho mọi slot update/create.
    for (const incoming of input.slots) {
      if (incoming._delete) continue;
      if (!Number.isInteger(incoming.slotsNeeded) || incoming.slotsNeeded < 0) {
        throw new StaffingOrderServiceError(
          'ORDER_NOT_EDITABLE',
          'slotsNeeded phải là số nguyên không âm.',
        );
      }
      if (incoming.id) {
        const current = existingById.get(incoming.id);
        if (!current) {
          throw new StaffingOrderServiceError(
            'ORDER_NOT_EDITABLE',
            `Slot id=${incoming.id} không tồn tại trong order.`,
          );
        }
        if (incoming.slotsNeeded < current.slotsFilled) {
          throw new StaffingOrderServiceError(
            'ORDER_NOT_EDITABLE',
            `Slot "${current.positionTitle}" đã tuyển ${current.slotsFilled} người; không thể giảm slotsNeeded xuống ${incoming.slotsNeeded}.`,
          );
        }
      } else {
        // Slot mới: slotsFilled = 0 ⇒ slotsNeeded >= 0 luôn đúng; chỉ cần chặn <= 0.
        if (incoming.slotsNeeded <= 0) {
          throw new StaffingOrderServiceError(
            'ORDER_NOT_EDITABLE',
            'Slot mới phải có slotsNeeded > 0.',
          );
        }
      }
    }
  }

  // Phase 3: apply changes. Vì mỗi operation là độc lập, ta thực hiện tuần tự
  // trong cùng transaction.
  if (Object.keys(orderData).length > 0) {
    await tx.staffingOrder.update({ where: { id: orderId }, data: orderData });
  }

  if (input.slots !== undefined) {
    for (const incoming of input.slots) {
      if (incoming._delete && incoming.id) {
        await tx.staffingOrderSlot.delete({ where: { id: incoming.id } });
        continue;
      }
      if (incoming.id) {
        await tx.staffingOrderSlot.update({
          where: { id: incoming.id },
          data: pickSlotWriteData(incoming),
        });
      } else {
        await tx.staffingOrderSlot.create({
          data: {
            ...pickSlotWriteData(incoming),
            staffingOrderId: orderId,
            slotsFilled: 0,
          },
        });
      }
    }
  }

  // Outbox event
  await enqueueOutbox(tx, {
    eventType: 'StaffingOrderUpdated',
    aggregateId: orderId,
    payload: {
      orderId,
      changedBy: ctx.userId,
      changedFields: {
        title: input.title !== undefined,
        description: input.description !== undefined,
        deadlineDate: input.deadlineDate !== undefined,
        slots: input.slots !== undefined,
      },
    },
  });

  return { id: orderId, updated: true };
}

/**
 * t1a-staffing-order-management: xoá vĩnh viễn Nhu cầu tuyển dụng.
 * Quy tắc (RQ-07):
 *
 *   - Chỉ `ADMIN`.
 *   - Chỉ khi order CHƯA phát sinh:
 *       + JobOpening
 *       + JobPosting (qua opening.posting)
 *       + CandidateSubmission (qua slot.submissions)
 *       + ProjectAssignment (qua slot.assignments / order.assignments)
 *       + StaffingOrderRecruiterAssignment
 *     Nếu bất kỳ mục nào tồn tại → 409 `ORDER_NOT_DELETABLE` + guidance
 *     "Dùng Hủy nhu cầu (CANCELLED) thay thế".
 *   - KHÔNG cascade — service phải kiểm tra trước khi gọi delete.
 */
export async function deleteStaffingOrder(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  orderId: string,
) {
  if (ctx.role !== 'ADMIN') {
    throw new StaffingOrderServiceError(
      'PERMISSION_DENIED',
      'Chỉ ADMIN mới có quyền xoá vĩnh viễn nhu cầu tuyển dụng.',
    );
  }

  const existing = await tx.staffingOrder.findFirst({
    where: { id: orderId, ...buildStaffingOrderScope(ctx) },
    include: {
      _count: {
        select: {
          jobOpenings: true,
          recruiterAssignments: true,
          assignments: true,
        },
      },
      slots: {
        select: {
          id: true,
          _count: { select: { submissions: true, assignments: true } },
        },
      },
      jobOpenings: { select: { id: true, posting: { select: { id: true } } } },
    },
  });

  if (!existing) {
    throw new StaffingOrderServiceError('NOT_FOUND', `StaffingOrder ${orderId} not found or no permission`);
  }

  const blockingFacts: string[] = [];
  if (existing._count.jobOpenings > 0) blockingFacts.push('JobOpening');
  if (existing.jobOpenings.some((o) => o.posting)) blockingFacts.push('JobPosting');
  if (existing._count.assignments > 0) blockingFacts.push('ProjectAssignment');
  if (existing._count.recruiterAssignments > 0) blockingFacts.push('StaffingOrderRecruiterAssignment');
  for (const s of existing.slots) {
    if (s._count.submissions > 0) blockingFacts.push('CandidateSubmission');
  }

  if (blockingFacts.length > 0) {
    const uniqueFacts = Array.from(new Set(blockingFacts)).join(', ');
    throw new StaffingOrderServiceError(
      'ORDER_NOT_DELETABLE',
      `Nhu cầu đã phát sinh: ${uniqueFacts}. Không thể xoá vĩnh viễn. Dùng "Hủy nhu cầu" (CANCELLED) thay thế để giữ lại lịch sử nghiệp vụ.`,
    );
  }

  // Xoá slots trước (vì `slots.staffingOrder` có onDelete: Cascade, nhưng ta
  // muốn rõ ràng và audit-friendly). Sau đó xoá order.
  await tx.staffingOrderSlot.deleteMany({ where: { staffingOrderId: orderId } });
  await tx.staffingOrder.delete({ where: { id: orderId } });

  await enqueueOutbox(tx, {
    eventType: 'StaffingOrderDeleted',
    aggregateId: orderId,
    payload: {
      orderId,
      code: existing.code,
      deletedBy: ctx.userId,
    },
  });

  return { id: orderId, deleted: true };
}
