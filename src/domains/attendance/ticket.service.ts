/**
 * Ticket Service — Domain logic cho Module M7 (Phản ánh, Tạm ứng)
 *
 * WORKFLOW (state machine — cải tiến từ HRM_SYSTEM ref repo):
 *
 *   CREATE (Worker)
 *     ↓
 *   PENDING
 *     ↓                      \→ REJECTED (terminal)
 *   HR_APPROVED              /   (HR/Accountant từ chối)
 *     ↓                      \
 *   APPROVED (cho LEAVE/DISPUTE)  \
 *     ↓                          \
 *   CLOSED                          \
 *                                   \
 *   (cho ADVANCE_SALARY)             \
 *   APPROVED → PAID                   \
 *     ↓                                \
 *   CLOSED                              \
 *
 *   PENDING / HR_APPROVED → CANCELLED (worker tự rút)
 *
 * CẢI TIẾN so với HRM_SYSTEM:
 *   - 2-step approval cho ADVANCE_SALARY (HR confirm → Accountant approve)
 *   - Idempotency key (header x-idempotency-key) cho POST
 *   - Optimistic locking (version field) chống race condition
 *   - Audit log MỖI transition (không chỉ final state)
 *   - DB-backed notification queue (retry được)
 *   - BigInt tiền (VND nguyên)
 *   - Transition guard qua state machine map (compile-time safe)
 *   - Tất cả thao tác ghi trong Prisma $transaction
 *
 * Tham khảo:
 *   - HRM_SYSTEM backend/api/leave_requests.php (state machine)
 *   - HRP v3.0 §7.2 (M7 wave 2-3), §9.7 (workerScope), §14.3 (idempotency)
 *   - HRP v3.2 §12.5.1 (doD có state transition test)
 */

import { Prisma, TicketAction } from '@prisma/client'; // TicketAction là VALUE (enum dùng trong TRANSITIONS)
import type {
  PrismaClient,
  Ticket,
  TicketType,
  TicketStatus,
  TicketActorRole,
  TicketHistory,
  AuditLog,
} from '@prisma/client';
// Phase 3 / RQ-03 + RQ-04 + RQ-05: refactor lớp integrity, giữ nghiệp vụ.
import { writeAuditLog } from '@/src/shared/integrity/audit';
import {
  IllegalTransitionError,
  guardTransition as guardTransitionGeneric,
  type TransitionMap,
} from '@/src/shared/integrity/state-machine';
import { enqueueOutbox } from '@/src/shared/integrity/outbox';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SessionUser {
  id: string;
  role: TicketActorRole;
  workerId?: string;  // DEC-01: Worker.id for WORKER role (from ctx.workerId). Not set for other roles.
  name?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateTicketInput {
  workerId: string;
  type: TicketType;
  title: string;
  description: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

  // TIMESHEET_DISPUTE
  assignmentId?: string;
  workDate?: Date;
  currentHours?: number;
  requestedHours?: number;
  reasonCode?: string;

  // ADVANCE_SALARY
  amountVnd?: bigint;
  requestedPayDate?: Date;
  deductMonth?: number;
  deductYear?: number;

  // LEAVE_REQUEST
  leaveFromDate?: Date;
  leaveToDate?: Date;
  leaveTypeCode?: string;

  // Optional
  metadata?: Prisma.JsonObject;
  idempotencyKey?: string;
}

export interface ApproveTicketInput {
  ticketId: string;
  note?: string;
  idempotencyKey?: string;
  // Cho ADVANCE_SALARY step 2: Accountant confirm đã chi
  paidAmountVnd?: bigint;
  paidAt?: Date;
}

export interface RejectTicketInput {
  ticketId: string;
  reason: string;  // Required
  idempotencyKey?: string;
}

export interface CancelTicketInput {
  ticketId: string;
  reason?: string;
  idempotencyKey?: string;
}

export interface ListTicketsFilter {
  workerId?: string;
  type?: TicketType;
  status?: TicketStatus[];
  includeClosed?: boolean;
  assignedToMe?: boolean;  // HR role: ticket trong queue của mình
  take?: number;
  skip?: number;
  orderBy?: 'createdAt' | 'priority' | 'slaDueAt';
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE MACHINE — định nghĩa transition hợp lệ + role được phép
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map: từ status hiện tại → action → đích đến + roles được phép thực hiện.
 *
 * Thiết kế: dùng Map literal để TypeScript check `key` exhaustively.
 * Mỗi transition ghi MỘT history row + audit log.
 */
const TRANSITIONS: TransitionMap<TicketStatus, TicketAction, TicketActorRole> = {
  PENDING: {
    APPROVE_HR: {
      to: 'HR_APPROVED',
      allowedRoles: ['HR_STAFF', 'HR_MANAGER', 'ADMIN'],
    },
    APPROVE_FINAL: {
      // Shortcut: Manager approve thẳng (skip HR step) — cho dispute/leave đơn giản
      to: 'APPROVED',
      allowedRoles: ['HR_MANAGER', 'ADMIN'],
      ticketTypes: ['TIMESHEET_DISPUTE', 'LEAVE_REQUEST'],
    },
    REJECT: {
      to: 'REJECTED',
      allowedRoles: ['HR_STAFF', 'HR_MANAGER', 'ADMIN'],
    },
    CANCEL: {
      to: 'CANCELLED',
      allowedRoles: ['WORKER'],  // chỉ worker tạo mới được cancel
    },
  },

  HR_APPROVED: {
    APPROVE_FINAL: {
      to: 'APPROVED',
      // Accountant approve advance; HR_Manager approve dispute/leave nếu đã HR_APPROVED
      allowedRoles: ['ACCOUNTANT', 'HR_MANAGER', 'ADMIN'],
    },
    REJECT: {
      to: 'REJECTED',
      allowedRoles: ['ACCOUNTANT', 'HR_MANAGER', 'ADMIN'],
    },
    CANCEL: {
      to: 'CANCELLED',
      allowedRoles: ['WORKER'],
    },
  },

  APPROVED: {
    PAY: {
      to: 'PAID',
      allowedRoles: ['ACCOUNTANT', 'ADMIN'],
      ticketTypes: ['ADVANCE_SALARY'],
    },
    CLOSE: {
      to: 'CLOSED',
      allowedRoles: ['HR_STAFF', 'HR_MANAGER', 'ADMIN', 'WORKER'],
    },
  },

  PAID: {
    CLOSE: {
      to: 'CLOSED',
      allowedRoles: ['HR_STAFF', 'HR_MANAGER', 'ADMIN'],
    },
  },

  // ═══ Terminal states — không transition nào hợp lệ ═══
  REJECTED: {},
  CANCELLED: {},
  CLOSED: {},
};

// ═══════════════════════════════════════════════════════════════════════════
// ROLE → ALLOWED ACTIONS (cho UI / List endpoint)
// ═══════════════════════════════════════════════════════════════════════════

export const ROLE_QUEUE: Record<TicketActorRole, TicketStatus[]> = {
  WORKER: [],  // worker không có queue riêng, họ xem ticket của mình
  HR_STAFF: ['PENDING'],  // HR staff chỉ review PENDING
  HR_MANAGER: ['PENDING', 'HR_APPROVED'],  // Manager approve dispute/leave
  ACCOUNTANT: ['HR_APPROVED'],  // Accountant chỉ duyệt advance đã HR confirm
  PM: [],
  ADMIN: ['PENDING', 'HR_APPROVED', 'APPROVED', 'PAID'],
};

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM ERROR (để route handler chuyển sang HTTP status code)
// ═══════════════════════════════════════════════════════════════════════════

export class TicketServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'INVALID_TRANSITION'
      | 'FORBIDDEN'
      | 'VALIDATION'
      | 'CONCURRENT_UPDATE'
      | 'IDEMPOTENCY_CONFLICT',
    message: string,
  ) {
    super(message);
    this.name = 'TicketServiceError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDS (pure functions)
// ═══════════════════════════════════════════════════════════════════════════

function validateCreateInput(input: CreateTicketInput): void {
  if (!input.workerId) throw new TicketServiceError('VALIDATION', 'workerId is required');
  if (!input.title?.trim()) throw new TicketServiceError('VALIDATION', 'title is required');
  if (!input.description?.trim()) throw new TicketServiceError('VALIDATION', 'description is required');
  if (input.title.length > 200) throw new TicketServiceError('VALIDATION', 'title too long (max 200)');

  switch (input.type) {
    case 'TIMESHEET_DISPUTE':
      if (!input.assignmentId) throw new TicketServiceError('VALIDATION', 'assignmentId required for dispute');
      if (!input.workDate) throw new TicketServiceError('VALIDATION', 'workDate required for dispute');
      if (input.requestedHours === undefined || input.requestedHours < 0) {
        throw new TicketServiceError('VALIDATION', 'requestedHours must be >= 0');
      }
      if (input.currentHours !== undefined && input.currentHours < 0) {
        throw new TicketServiceError('VALIDATION', 'currentHours must be >= 0');
      }
      break;

    case 'ADVANCE_SALARY':
      if (input.amountVnd === undefined || input.amountVnd <= 0n) {
        throw new TicketServiceError('VALIDATION', 'amountVnd must be > 0');
      }
      if (!input.deductMonth || !input.deductYear) {
        throw new TicketServiceError('VALIDATION', 'deductMonth/deductYear required for advance');
      }
      if (input.deductMonth < 1 || input.deductMonth > 12) {
        throw new TicketServiceError('VALIDATION', 'deductMonth must be 1-12');
      }
      break;

    case 'LEAVE_REQUEST':
      if (!input.leaveFromDate || !input.leaveToDate) {
        throw new TicketServiceError('VALIDATION', 'leaveFromDate/leaveToDate required');
      }
      if (input.leaveToDate < input.leaveFromDate) {
        throw new TicketServiceError('VALIDATION', 'leaveToDate must be >= leaveFromDate');
      }
      break;

    case 'OTHER':
      // Không yêu cầu field riêng
      break;
  }
}

function guardTransition(
  ticket: Ticket,
  action: TicketAction,
  actorRole: TicketActorRole,
): TicketStatus {
  try {
    return guardTransitionGeneric(ticket.status, action, TRANSITIONS, {
      actorRole,
      entityType: ticket.type,
    });
  } catch (err) {
    if (err instanceof IllegalTransitionError) {
      // Map sang TicketServiceError code để giữ contract cũ (test cũ expect).
      // Route handler Phase 3 map tiếp sang HTTP 409.
      const code =
        err.code === 'ROLE_NOT_ALLOWED'
          ? 'FORBIDDEN'
          : 'INVALID_TRANSITION';
      throw new TicketServiceError(code, err.message);
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export class TicketService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogger?: AuditLogger,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Worker (hoặc HR tạo hộ) tạo ticket mới.
   * Idempotency: nếu trong vòng 24h đã có ticket cùng (workerId, type, idempotencyKey) → trả về ticket cũ.
   */
  async createTicket(
    input: CreateTicketInput,
    actor: SessionUser,
    tx?: PrismaClient | Prisma.TransactionClient,
  ): Promise<Ticket> {
    validateCreateInput(input);

    // Phase 3 / RQ-02 (DEC-02): idempotency KHÔNG qua metadata.path nữa.
    // Cơ chế mới: route handler gọi `withIdempotency` trước khi gọi createTicket.
    // Service này giữ metadata.idempotencyKey để debug/trace — KHÔNG check replay.
    //
    // F24 TODO (đã đóng — Phase 3 chuyển sang bảng idempotency_keys): xem ADR-014.

    // Tính deltaHours cho dispute
    let deltaHours: Prisma.Decimal | null = null;
    if (input.type === 'TIMESHEET_DISPUTE' && input.currentHours !== undefined) {
      deltaHours = new Prisma.Decimal(input.requestedHours!).sub(input.currentHours);
    }

    // Tính leaveDays
    let leaveDays: Prisma.Decimal | null = null;
    if (input.type === 'LEAVE_REQUEST' && input.leaveFromDate && input.leaveToDate) {
      const ms = input.leaveToDate.getTime() - input.leaveFromDate.getTime();
      leaveDays = new Prisma.Decimal(ms / (1000 * 60 * 60 * 24) + 1);
    }

    // Validate SLA: setup auto-overdue check (sẽ chạy cron)
    const slaDueAt = this.computeSlaDueAt(input.priority ?? 'NORMAL');

    const ticket = await this.runInTx<Ticket>(tx, async (txc) => {
      const created = await txc.ticket.create({
        data: {
          workerId: input.workerId,
          createdByActorId: actor.id,
          createdByRole: actor.role,
          type: input.type,
          status: 'PENDING',
          priority: input.priority ?? 'NORMAL',
          title: input.title,
          description: input.description,
          assignmentId: input.assignmentId,
          workDate: input.workDate,
          currentHours: input.currentHours !== undefined ? new Prisma.Decimal(input.currentHours) : null,
          requestedHours: input.requestedHours !== undefined ? new Prisma.Decimal(input.requestedHours) : null,
          deltaHours,
          reasonCode: input.reasonCode,
          amountVnd: input.amountVnd ?? 0n,
          requestedPayDate: input.requestedPayDate,
          deductMonth: input.deductMonth,
          deductYear: input.deductYear,
          leaveFromDate: input.leaveFromDate,
          leaveToDate: input.leaveToDate,
          leaveDays,
          leaveTypeCode: input.leaveTypeCode,
          slaDueAt,
          metadata: {
            ...input.metadata,
            ...(input.idempotencyKey && { idempotencyKey: input.idempotencyKey }),
          },
        },
      });

      // Ghi history (CREATE)
      await txc.ticketHistory.create({
        data: {
          ticketId: created.id,
          action: 'CREATE',
          fromStatus: null,
          toStatus: 'PENDING',
          actorId: actor.id,
          actorRole: actor.role,
          actorName: actor.name,
          note: input.description,
          payload: input.metadata ?? {},
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          idempotencyKey: input.idempotencyKey,
        },
      });

      // Ghi audit log (chung)
      await this.writeAuditLog(txc, {
        actorId: actor.id,
        actorRole: actor.role,
        entityType: 'Ticket',
        entityId: created.id,
        action: 'CREATE',
        diff: { before: null, after: created },
        metadata: { ipAddress: actor.ipAddress, userAgent: actor.userAgent },
      });

      // Queue notification cho HR (PENDING → HR review)
      await this.enqueueNotification(txc, {
        ticketId: created.id,
        recipientRole: 'HR_STAFF',
        subject: `[Ticket ${created.type}] ${created.title}`,
        body: `Worker ${created.workerId} vừa tạo ticket mới.`,
        linkUrl: `/admin/tickets/${created.id}`,
      });

      return created;
    });

    return ticket;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // APPROVE (HR_STAFF hoặc direct APPROVE_FINAL cho HR_MANAGER)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Approve theo state machine. Map action theo type:
   *   - LEAVE_REQUEST / TIMESHEET_DISPUTE: APPROVE_HR hoặc APPROVE_FINAL
   *   - ADVANCE_SALARY: APPROVE_HR (HR xác nhận) → sau đó APPROVE_FINAL (Accountant chi)
   */
  async approveTicket(
    input: ApproveTicketInput,
    actor: SessionUser,
    tx?: PrismaClient | Prisma.TransactionClient,
  ): Promise<Ticket> {
    return this.runInTx<Ticket>(tx, async (txc) => {
      const ticket = await txc.ticket.findUniqueOrThrow({
        where: { id: input.ticketId },
      });

      // Worker không được approve ticket của mình
      if (actor.role === 'WORKER') {
        throw new TicketServiceError('FORBIDDEN', 'Worker cannot approve tickets');
      }

      // Tự guard qua state machine
      const action: TicketAction = this.inferApproveAction(ticket, actor.role);      const toStatus = guardTransition(ticket, action, actor.role);

      // Optimistic lock check
      const updated = await txc.ticket.updateMany({
        where: { id: ticket.id, version: ticket.version },
        data: {
          status: toStatus,
          version: { increment: 1 },
          ...(toStatus === 'APPROVED' && input.paidAmountVnd !== undefined && {
            deductionVnd: input.paidAmountVnd,
          }),
        },
      });

      if (updated.count === 0) {
        throw new TicketServiceError(
          'CONCURRENT_UPDATE',
          `Ticket ${ticket.id} was modified concurrently. Please retry.`,
        );
      }

      // Re-fetch updated ticket
      const after = await txc.ticket.findUniqueOrThrow({ where: { id: ticket.id } });

      // Ghi history
      await txc.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action,
          fromStatus: ticket.status,
          toStatus,
          actorId: actor.id,
          actorRole: actor.role,
          actorName: actor.name,
          note: input.note,
          payload: {
            ...(input.paidAmountVnd !== undefined && { paidAmountVnd: input.paidAmountVnd.toString() }),
          },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          idempotencyKey: input.idempotencyKey,
        },
      });

      // Audit log
      await this.writeAuditLog(txc, {
        actorId: actor.id,
        actorRole: actor.role,
        entityType: 'Ticket',
        entityId: ticket.id,
        action: 'STATE_TRANSITION',
        diff: {
          before: { status: ticket.status, version: ticket.version },
          after: { status: toStatus, version: after.version },
        },
        metadata: { fromAction: action, ...(input.note && { note: input.note }) },
      });

      // Queue notification cho worker
      await this.enqueueNotification(txc, {
        ticketId: ticket.id,
        recipientRole: 'WORKER',
        subject: `Ticket ${after.type} đã được ${toStatus === 'APPROVED' ? 'duyệt' : 'chuyển tiếp'}`,
        body: input.note ?? `Ticket "${after.title}" đã được cập nhật trạng thái.`,
        linkUrl: `/worker/tickets/${ticket.id}`,
      });

      // Nếu APPROVE_FINAL cho ADVANCE → enqueue cho Accountant (PAI)
      if (action === 'APPROVE_FINAL' && toStatus === 'APPROVED' && ticket.type === 'ADVANCE_SALARY') {
        await this.enqueueNotification(txc, {
          ticketId: ticket.id,
          recipientRole: 'ACCOUNTANT',
          subject: `[Advance] Đã duyệt HR — sẵn sàng chi`,
          body: `Ticket advance ${ticket.id} đã được HR duyệt. Cần chi ${ticket.amountVnd.toString()} VND.`,
          linkUrl: `/accountant/tickets/${ticket.id}`,
        });
      }

      return after;
    });
  }

  /**
   * Map action approve phù hợp dựa trên loại ticket + role.
   * Logic:
   *   - ADVANCE_SALARY: HR → APPROVE_HR; Accountant → APPROVE_FINAL
   *   - LEAVE/DISPUTE: HR_STAFF → APPROVE_HR; HR_MANAGER → APPROVE_FINAL (nhanh)
   */
  private inferApproveAction(ticket: Ticket, role: TicketActorRole): TicketAction {
    if (ticket.type === 'ADVANCE_SALARY') {
      if (role === 'ACCOUNTANT') return 'APPROVE_FINAL';
      return 'APPROVE_HR';
    }
    // LEAVE / DISPUTE / OTHER
    if (role === 'HR_MANAGER' || role === 'ADMIN') return 'APPROVE_FINAL';
    return 'APPROVE_HR';
  }

  // ═══════════════════════════════════════════════════════════════════════
  // REJECT
  // ═══════════════════════════════════════════════════════════════════════

  async rejectTicket(
    input: RejectTicketInput,
    actor: SessionUser,
    tx?: PrismaClient | Prisma.TransactionClient,
  ): Promise<Ticket> {
    if (!input.reason?.trim()) {
      throw new TicketServiceError('VALIDATION', 'reason is required for reject');
    }

    return this.runInTx<Ticket>(tx, async (txc) => {
      const ticket = await txc.ticket.findUniqueOrThrow({
        where: { id: input.ticketId },
      });

      const toStatus = guardTransition(ticket, 'REJECT', actor.role);

      const updated = await txc.ticket.updateMany({
        where: { id: ticket.id, version: ticket.version },
        data: { status: toStatus, version: { increment: 1 } },
      });

      if (updated.count === 0) {
        throw new TicketServiceError('CONCURRENT_UPDATE', 'Ticket modified concurrently');
      }

      const after = await txc.ticket.findUniqueOrThrow({ where: { id: ticket.id } });

      await txc.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action: 'REJECT',
          fromStatus: ticket.status,
          toStatus,
          actorId: actor.id,
          actorRole: actor.role,
          actorName: actor.name,
          note: input.reason,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          idempotencyKey: input.idempotencyKey,
        },
      });

      await this.writeAuditLog(txc, {
        actorId: actor.id,
        actorRole: actor.role,
        entityType: 'Ticket',
        entityId: ticket.id,
        action: 'STATE_TRANSITION',
        diff: {
          before: { status: ticket.status, version: ticket.version },
          after: { status: toStatus, version: after.version },
        },
        metadata: { fromAction: 'REJECT', reason: input.reason },
      });

      await this.enqueueNotification(txc, {
        ticketId: ticket.id,
        recipientRole: 'WORKER',
        subject: `Ticket bị từ chối`,
        body: `Lý do: ${input.reason}`,
        linkUrl: `/worker/tickets/${ticket.id}`,
      });

      return after;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CANCEL (worker tự rút)
  // ═══════════════════════════════════════════════════════════════════════

  async cancelTicket(
    input: CancelTicketInput,
    actor: SessionUser,
    tx?: PrismaClient | Prisma.TransactionClient,
  ): Promise<Ticket> {
    return this.runInTx<Ticket>(tx, async (txc) => {
      const ticket = await txc.ticket.findUniqueOrThrow({
        where: { id: input.ticketId },
      });

      // Worker chỉ cancel được ticket của mình
      if (actor.role === 'WORKER' && ticket.workerId !== (actor.workerId ?? actor.id)) {
        throw new TicketServiceError('FORBIDDEN', 'Cannot cancel another worker\'s ticket');
      }

      const toStatus = guardTransition(ticket, 'CANCEL', actor.role);

      const updated = await txc.ticket.updateMany({
        where: { id: ticket.id, version: ticket.version },
        data: { status: toStatus, version: { increment: 1 } },
      });

      if (updated.count === 0) {
        throw new TicketServiceError('CONCURRENT_UPDATE', 'Ticket modified concurrently');
      }

      const after = await txc.ticket.findUniqueOrThrow({ where: { id: ticket.id } });

      await txc.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action: 'CANCEL',
          fromStatus: ticket.status,
          toStatus,
          actorId: actor.id,
          actorRole: actor.role,
          actorName: actor.name,
          note: input.reason,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          idempotencyKey: input.idempotencyKey,
        },
      });

      await this.writeAuditLog(txc, {
        actorId: actor.id,
        actorRole: actor.role,
        entityType: 'Ticket',
        entityId: ticket.id,
        action: 'STATE_TRANSITION',
        diff: { before: { status: ticket.status }, after: { status: toStatus } },
        metadata: { fromAction: 'CANCEL' },
      });

      return after;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAY (Accountant ghi nhận đã chi tiền advance)
  // ═══════════════════════════════════════════════════════════════════════

  async payAdvance(
    input: ApproveTicketInput,
    actor: SessionUser,
    tx?: PrismaClient | Prisma.TransactionClient,
  ): Promise<Ticket> {
    return this.runInTx<Ticket>(tx, async (txc) => {
      const ticket = await txc.ticket.findUniqueOrThrow({ where: { id: input.ticketId } });
      if (ticket.type !== 'ADVANCE_SALARY') {
        throw new TicketServiceError('INVALID_TRANSITION', 'PAY only valid for ADVANCE_SALARY');
      }

      const toStatus = guardTransition(ticket, 'PAY', actor.role);

      const updated = await txc.ticket.updateMany({
        where: { id: ticket.id, version: ticket.version, status: 'APPROVED' },
        data: {
          status: toStatus,
          version: { increment: 1 },
          deductionVnd: input.paidAmountVnd ?? ticket.amountVnd,
        },
      });

      if (updated.count === 0) {
        throw new TicketServiceError(
          'CONCURRENT_UPDATE',
          'Ticket not in APPROVED status or modified concurrently',
        );
      }

      const after = await txc.ticket.findUniqueOrThrow({ where: { id: ticket.id } });

      await txc.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action: 'PAY',
          fromStatus: ticket.status,
          toStatus,
          actorId: actor.id,
          actorRole: actor.role,
          actorName: actor.name,
          note: input.note,
          payload: {
            paidAmountVnd: (input.paidAmountVnd ?? ticket.amountVnd).toString(),
            paidAt: (input.paidAt ?? new Date()).toISOString(),
          },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          idempotencyKey: input.idempotencyKey,
        },
      });

      await this.writeAuditLog(txc, {
        actorId: actor.id,
        actorRole: actor.role,
        entityType: 'Ticket',
        entityId: ticket.id,
        action: 'STATE_TRANSITION',
        diff: {
          before: { status: ticket.status, deductionVnd: ticket.deductionVnd.toString() },
          after: { status: toStatus, deductionVnd: after.deductionVnd.toString() },
        },
        metadata: { fromAction: 'PAY' },
      });

      await this.enqueueNotification(txc, {
        ticketId: ticket.id,
        recipientRole: 'WORKER',
        subject: `[Advance] Tạm ứng đã chi`,
        body: `Bạn đã nhận ${after.deductionVnd.toString()} VND.`,
        linkUrl: `/worker/tickets/${ticket.id}`,
      });

      return after;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LIST (cho UI table)
  // ═══════════════════════════════════════════════════════════════════════

  async listTickets(
    filter: ListTicketsFilter,
    actor: SessionUser,
    tx?: PrismaClient | Prisma.TransactionClient,
  ): Promise<{ items: Ticket[]; total: number }> {
    const db = tx ?? this.prisma;
    const where: Prisma.TicketWhereInput = {};

    // Worker chỉ thấy ticket của mình
    if (actor.role === 'WORKER') {
      where.workerId = actor.workerId ?? actor.id;  // DEC-01
    } else if (filter.workerId) {
      where.workerId = filter.workerId;
    }

    if (filter.type) where.type = filter.type;

    if (filter.status) {
      where.status = { in: filter.status };
    } else if (!filter.includeClosed) {
      // Mặc định loại trừ terminal
      where.status = { notIn: ['REJECTED', 'CANCELLED', 'CLOSED'] };
    }

    if (filter.assignedToMe) {
      // HR/Accountant: ticket trong queue của role
      const queue = ROLE_QUEUE[actor.role];
      if (queue.length > 0) {
        where.status = { in: queue };
      }
    }

    const orderByMap: Record<string, Prisma.TicketOrderByWithRelationInput> = {
      createdAt: { createdAt: 'desc' },
      priority: { priority: 'desc' },
      slaDueAt: { slaDueAt: 'asc' },
    };

    const [items, total] = await Promise.all([
      db.ticket.findMany({
        where,
        orderBy: orderByMap[filter.orderBy ?? 'createdAt'],
        take: filter.take ?? 50,
        skip: filter.skip ?? 0,
      }),
      db.ticket.count({ where }),
    ]);

    return { items, total };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GET (single ticket + history)
  // ═══════════════════════════════════════════════════════════════════════

  async getTicket(
    ticketId: string,
    actor: SessionUser,
    tx?: PrismaClient | Prisma.TransactionClient,
  ): Promise<{ ticket: Ticket; history: TicketHistory[] }> {
    const db = tx ?? this.prisma;
    const ticket = await db.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });

    // Worker chỉ xem ticket của mình
    if (actor.role === 'WORKER' && ticket.workerId !== (actor.workerId ?? actor.id)) {
      throw new TicketServiceError('FORBIDDEN', 'Cannot view another worker\'s ticket');
    }

    const history = await db.ticketHistory.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });

    return { ticket, history };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  private async writeAuditLog(
    tx: Prisma.TransactionClient,
    entry: {
      actorId: string;
      actorRole: TicketActorRole;
      entityType: string;
      entityId: string;
      action: string;
      diff: unknown;
      metadata?: Record<string, unknown>;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<AuditLog> {
    // Phase 3 / RQ-03: delegate sang helper integrity/audit.
    // Custom logger (Sentry/Datadog) vẫn được respect qua ctor param.
    return writeAuditLog({
      prisma: tx,
      actor: {
        id: entry.actorId,
        role: entry.actorRole,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      diff: {
        before: (entry.diff as { before?: unknown } | undefined)?.before,
        after: (entry.diff as { after?: unknown } | undefined)?.after,
      },
      reason: entry.reason,
      metadata: entry.metadata,
      customLogger: this.auditLogger
        ? (prisma, row) => this.auditLogger!(prisma, {
            actorId: row.actorId ?? '',
            actorRole: row.actorRole as TicketActorRole,
            entityType: row.entityType,
            entityId: row.entityId,
            action: row.action,
            diff: row.diff,
            metadata: row.metadata as Record<string, unknown> | undefined,
          })
        : undefined,
    });
  }

  private async enqueueNotification(
    tx: Prisma.TransactionClient,
    notif: {
      ticketId: string;
      recipientRole: TicketActorRole;
      subject: string;
      body: string;
      linkUrl?: string;
    },
  ): Promise<void> {
    // Phase 3 / RQ-05 (DEC-01): enqueue qua outbox cùng transaction với state change.
    // Drain in-process (sau commit) sẽ tạo TicketNotification row.
    await enqueueOutbox(tx, {
      eventType: 'TicketNotification',
      aggregateId: notif.ticketId,
      payload: {
        ticketId: notif.ticketId,
        recipientId: `ROLE:${notif.recipientRole}`,
        recipientRole: notif.recipientRole,
        channel: 'IN_APP',
        subject: notif.subject,
        body: notif.body,
        linkUrl: notif.linkUrl,
      },
    });
  }

  /**
   * Run callback in a transaction if tx is provided, otherwise execute directly.
   * Route layer MUST pass a tx from withDbContext to set RLS GUC.
   * System/cron callers can omit tx (uses this.prisma.$transaction).
   */
  private async runInTx<T>(
    tx: PrismaClient | Prisma.TransactionClient | undefined,
    cb: (txc: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (tx) return cb(tx as Prisma.TransactionClient);
    return this.prisma.$transaction(cb);
  }

  private computeSlaDueAt(priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'): Date {
    const hours: Record<typeof priority, number> = {
      LOW: 72,
      NORMAL: 48,
      HIGH: 24,
      URGENT: 4,
    };
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + hours[priority]);
    return dueAt;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM AUDIT LOGGER TYPE
// ═══════════════════════════════════════════════════════════════════════════

export type AuditLogger = (
  tx: Prisma.TransactionClient,
  entry: {
    actorId: string;
    actorRole: TicketActorRole;
    entityType: string;
    entityId: string;
    action: string;
    diff: unknown;
    metadata?: Record<string, unknown>;
  },
) => Promise<AuditLog>;
