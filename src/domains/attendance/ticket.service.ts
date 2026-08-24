/**
 * Ticket Service â€” Domain logic cho Module M7 (Pháº£n Ã¡nh, Táº¡m á»©ng)
 *
 * WORKFLOW (state machine â€” cáº£i tiáº¿n tá»« HRM_SYSTEM ref repo):
 *
 *   CREATE (Worker)
 *     â†“
 *   PENDING
 *     â†“                      \â†’ REJECTED (terminal)
 *   HR_APPROVED              /   (HR/Accountant tá»« chá»‘i)
 *     â†“                      \
 *   APPROVED (cho LEAVE/DISPUTE)  \
 *     â†“                          \
 *   CLOSED                          \
 *                                   \
 *   (cho ADVANCE_SALARY)             \
 *   APPROVED â†’ PAID                   \
 *     â†“                                \
 *   CLOSED                              \
 *
 *   PENDING / HR_APPROVED â†’ CANCELLED (worker tá»± rÃºt)
 *
 * Cáº¢I TIáº¾N so vá»›i HRM_SYSTEM:
 *   - 2-step approval cho ADVANCE_SALARY (HR confirm â†’ Accountant approve)
 *   - Idempotency key (header x-idempotency-key) cho POST
 *   - Optimistic locking (version field) chá»‘ng race condition
 *   - Audit log Má»–I transition (khÃ´ng chá»‰ final state)
 *   - DB-backed notification queue (retry Ä‘Æ°á»£c)
 *   - BigInt tiá»n (VND nguyÃªn)
 *   - Transition guard qua state machine map (compile-time safe)
 *   - Táº¥t cáº£ thao tÃ¡c ghi trong Prisma $transaction
 *
 * Tham kháº£o:
 *   - HRM_SYSTEM backend/api/leave_requests.php (state machine)
 *   - HRP v3.0 Â§7.2 (M7 wave 2-3), Â§9.7 (workerScope), Â§14.3 (idempotency)
 *   - HRP v3.2 Â§12.5.1 (doD cÃ³ state transition test)
 */

import { Prisma, TicketAction } from '@prisma/client'; // TicketAction lÃ  VALUE (enum dÃ¹ng trong TRANSITIONS)
import type {
  PrismaClient,
  Ticket,
  TicketType,
  TicketStatus,
  TicketActorRole,
  TicketHistory,
  AuditLog,
} from '@prisma/client';
// Phase 3 / RQ-03 + RQ-04 + RQ-05: refactor lá»›p integrity, giá»¯ nghiá»‡p vá»¥.
import { writeAuditLog } from '@/src/shared/integrity/audit';
import {
  IllegalTransitionError,
  guardTransition as guardTransitionGeneric,
  type TransitionMap,
} from '@/src/shared/integrity/state-machine';
import { enqueueOutbox } from '@/src/shared/integrity/outbox';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TYPES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
  // Cho ADVANCE_SALARY step 2: Accountant confirm Ä‘Ã£ chi
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
  assignedToMe?: boolean;  // HR role: ticket trong queue cá»§a mÃ¬nh
  take?: number;
  skip?: number;
  orderBy?: 'createdAt' | 'priority' | 'slaDueAt';
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// STATE MACHINE â€” Ä‘á»‹nh nghÄ©a transition há»£p lá»‡ + role Ä‘Æ°á»£c phÃ©p
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Map: tá»« status hiá»‡n táº¡i â†’ action â†’ Ä‘Ã­ch Ä‘áº¿n + roles Ä‘Æ°á»£c phÃ©p thá»±c hiá»‡n.
 *
 * Thiáº¿t káº¿: dÃ¹ng Map literal Ä‘á»ƒ TypeScript check `key` exhaustively.
 * Má»—i transition ghi Má»˜T history row + audit log.
 */
const TRANSITIONS: TransitionMap<TicketStatus, TicketAction, TicketActorRole> = {
  PENDING: {
    APPROVE_HR: {
      to: 'HR_APPROVED',
      allowedRoles: ['HR_STAFF', 'HR_MANAGER', 'ADMIN'],
    },
    APPROVE_FINAL: {
      // Shortcut: Manager approve tháº³ng (skip HR step) â€” cho dispute/leave Ä‘Æ¡n giáº£n
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
      allowedRoles: ['WORKER'],  // chá»‰ worker táº¡o má»›i Ä‘Æ°á»£c cancel
    },
  },

  HR_APPROVED: {
    APPROVE_FINAL: {
      to: 'APPROVED',
      // Accountant approve advance; HR_Manager approve dispute/leave náº¿u Ä‘Ã£ HR_APPROVED
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

  // â•â•â• Terminal states â€” khÃ´ng transition nÃ o há»£p lá»‡ â•â•â•
  REJECTED: {},
  CANCELLED: {},
  CLOSED: {},
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ROLE â†’ ALLOWED ACTIONS (cho UI / List endpoint)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const ROLE_QUEUE: Record<TicketActorRole, TicketStatus[]> = {
  WORKER: [],  // worker khÃ´ng cÃ³ queue riÃªng, há» xem ticket cá»§a mÃ¬nh
  HR_STAFF: ['PENDING'],  // HR staff chá»‰ review PENDING
  HR_MANAGER: ['PENDING', 'HR_APPROVED'],  // Manager approve dispute/leave
  ACCOUNTANT: ['HR_APPROVED'],  // Accountant chá»‰ duyá»‡t advance Ä‘Ã£ HR confirm
  PM: [],
  ADMIN: ['PENDING', 'HR_APPROVED', 'APPROVED', 'PAID'],
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CUSTOM ERROR (Ä‘á»ƒ route handler chuyá»ƒn sang HTTP status code)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GUARDS (pure functions)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
      // KhÃ´ng yÃªu cáº§u field riÃªng
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
      // Map sang TicketServiceError code Ä‘á»ƒ giá»¯ contract cÅ© (test cÅ© expect).
      // Route handler Phase 3 map tiáº¿p sang HTTP 409.
      const code =
        err.code === 'ROLE_NOT_ALLOWED'
          ? 'FORBIDDEN'
          : 'INVALID_TRANSITION';
      throw new TicketServiceError(code, err.message);
    }
    throw err;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SERVICE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export class TicketService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogger?: AuditLogger,
  ) {}

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CREATE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  /**
   * Worker (hoáº·c HR táº¡o há»™) táº¡o ticket má»›i.
   * Idempotency: náº¿u trong vÃ²ng 24h Ä‘Ã£ cÃ³ ticket cÃ¹ng (workerId, type, idempotencyKey) â†’ tráº£ vá» ticket cÅ©.
   */
  async createTicket(
    input: CreateTicketInput,
    actor: SessionUser,
  ): Promise<Ticket> {
    validateCreateInput(input);

    // Phase 3 / RQ-02 (DEC-02): idempotency KHÃ”NG qua metadata.path ná»¯a.
    // CÆ¡ cháº¿ má»›i: route handler gá»i `withIdempotency` trÆ°á»›c khi gá»i createTicket.
    // Service nÃ y giá»¯ metadata.idempotencyKey Ä‘á»ƒ debug/trace â€” KHÃ”NG check replay.
    //
    // F24 TODO (Ä‘Ã£ Ä‘Ã³ng â€” Phase 3 chuyá»ƒn sang báº£ng idempotency_keys): xem ADR-014.

    // TÃ­nh deltaHours cho dispute
    let deltaHours: Prisma.Decimal | null = null;
    if (input.type === 'TIMESHEET_DISPUTE' && input.currentHours !== undefined) {
      deltaHours = new Prisma.Decimal(input.requestedHours!).sub(input.currentHours);
    }

    // TÃ­nh leaveDays
    let leaveDays: Prisma.Decimal | null = null;
    if (input.type === 'LEAVE_REQUEST' && input.leaveFromDate && input.leaveToDate) {
      const ms = input.leaveToDate.getTime() - input.leaveFromDate.getTime();
      leaveDays = new Prisma.Decimal(ms / (1000 * 60 * 60 * 24) + 1);
    }

    // Validate SLA: setup auto-overdue check (sáº½ cháº¡y cron)
    const slaDueAt = this.computeSlaDueAt(input.priority ?? 'NORMAL');

    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
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
      await tx.ticketHistory.create({
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
      await this.writeAuditLog(tx, {
        actorId: actor.id,
        actorRole: actor.role,
        entityType: 'Ticket',
        entityId: created.id,
        action: 'CREATE',
        diff: { before: null, after: created },
        metadata: { ipAddress: actor.ipAddress, userAgent: actor.userAgent },
      });

      // Queue notification cho HR (PENDING â†’ HR review)
      await this.enqueueNotification(tx, {
        ticketId: created.id,
        recipientRole: 'HR_STAFF',
        subject: `[Ticket ${created.type}] ${created.title}`,
        body: `Worker ${created.workerId} vá»«a táº¡o ticket má»›i.`,
        linkUrl: `/admin/tickets/${created.id}`,
      });

      return created;
    });

    return ticket;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // APPROVE (HR_STAFF hoáº·c direct APPROVE_FINAL cho HR_MANAGER)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  /**
   * Approve theo state machine. Map action theo type:
   *   - LEAVE_REQUEST / TIMESHEET_DISPUTE: APPROVE_HR hoáº·c APPROVE_FINAL
   *   - ADVANCE_SALARY: APPROVE_HR (HR xÃ¡c nháº­n) â†’ sau Ä‘Ã³ APPROVE_FINAL (Accountant chi)
   */
  async approveTicket(input: ApproveTicketInput, actor: SessionUser): Promise<Ticket> {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUniqueOrThrow({
        where: { id: input.ticketId },
      });

      // Worker khÃ´ng Ä‘Æ°á»£c approve ticket cá»§a mÃ¬nh
      if (actor.role === 'WORKER') {
        throw new TicketServiceError('FORBIDDEN', 'Worker cannot approve tickets');
      }

      // Tá»± guard qua state machine
      const action: TicketAction = this.inferApproveAction(ticket, actor.role);
      const toStatus = guardTransition(ticket, action, actor.role);

      // Optimistic lock check
      const updated = await tx.ticket.updateMany({
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
      const after = await tx.ticket.findUniqueOrThrow({ where: { id: ticket.id } });

      // Ghi history
      await tx.ticketHistory.create({
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
      await this.writeAuditLog(tx, {
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
      await this.enqueueNotification(tx, {
        ticketId: ticket.id,
        recipientRole: 'WORKER',
        subject: `Ticket ${after.type} Ä‘Ã£ Ä‘Æ°á»£c ${toStatus === 'APPROVED' ? 'duyá»‡t' : 'chuyá»ƒn tiáº¿p'}`,
        body: input.note ?? `Ticket "${after.title}" Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t tráº¡ng thÃ¡i.`,
        linkUrl: `/worker/tickets/${ticket.id}`,
      });

      // Náº¿u APPROVE_FINAL cho ADVANCE â†’ enqueue cho Accountant (PAI)
      if (action === 'APPROVE_FINAL' && toStatus === 'APPROVED' && ticket.type === 'ADVANCE_SALARY') {
        await this.enqueueNotification(tx, {
          ticketId: ticket.id,
          recipientRole: 'ACCOUNTANT',
          subject: `[Advance] ÄÃ£ duyá»‡t HR â€” sáºµn sÃ ng chi`,
          body: `Ticket advance ${ticket.id} Ä‘Ã£ Ä‘Æ°á»£c HR duyá»‡t. Cáº§n chi ${ticket.amountVnd.toString()} VND.`,
          linkUrl: `/accountant/tickets/${ticket.id}`,
        });
      }

      return after;
    });
  }

  /**
   * Map action approve phÃ¹ há»£p dá»±a trÃªn loáº¡i ticket + role.
   * Logic:
   *   - ADVANCE_SALARY: HR â†’ APPROVE_HR; Accountant â†’ APPROVE_FINAL
   *   - LEAVE/DISPUTE: HR_STAFF â†’ APPROVE_HR; HR_MANAGER â†’ APPROVE_FINAL (nhanh)
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // REJECT
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async rejectTicket(input: RejectTicketInput, actor: SessionUser): Promise<Ticket> {
    if (!input.reason?.trim()) {
      throw new TicketServiceError('VALIDATION', 'reason is required for reject');
    }

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUniqueOrThrow({
        where: { id: input.ticketId },
      });

      const toStatus = guardTransition(ticket, 'REJECT', actor.role);

      const updated = await tx.ticket.updateMany({
        where: { id: ticket.id, version: ticket.version },
        data: { status: toStatus, version: { increment: 1 } },
      });

      if (updated.count === 0) {
        throw new TicketServiceError('CONCURRENT_UPDATE', 'Ticket modified concurrently');
      }

      const after = await tx.ticket.findUniqueOrThrow({ where: { id: ticket.id } });

      await tx.ticketHistory.create({
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

      await this.writeAuditLog(tx, {
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

      await this.enqueueNotification(tx, {
        ticketId: ticket.id,
        recipientRole: 'WORKER',
        subject: `Ticket bá»‹ tá»« chá»‘i`,
        body: `LÃ½ do: ${input.reason}`,
        linkUrl: `/worker/tickets/${ticket.id}`,
      });

      return after;
    });
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CANCEL (worker tá»± rÃºt)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async cancelTicket(input: CancelTicketInput, actor: SessionUser): Promise<Ticket> {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUniqueOrThrow({
        where: { id: input.ticketId },
      });

      // Worker chá»‰ cancel Ä‘Æ°á»£c ticket cá»§a mÃ¬nh
      if (actor.role === 'WORKER' && ticket.workerId !== (actor.workerId ?? actor.id)) {
        throw new TicketServiceError('FORBIDDEN', 'Cannot cancel another worker\'s ticket');
      }

      const toStatus = guardTransition(ticket, 'CANCEL', actor.role);

      const updated = await tx.ticket.updateMany({
        where: { id: ticket.id, version: ticket.version },
        data: { status: toStatus, version: { increment: 1 } },
      });

      if (updated.count === 0) {
        throw new TicketServiceError('CONCURRENT_UPDATE', 'Ticket modified concurrently');
      }

      const after = await tx.ticket.findUniqueOrThrow({ where: { id: ticket.id } });

      await tx.ticketHistory.create({
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

      await this.writeAuditLog(tx, {
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PAY (Accountant ghi nháº­n Ä‘Ã£ chi tiá»n advance)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async payAdvance(input: ApproveTicketInput, actor: SessionUser): Promise<Ticket> {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUniqueOrThrow({ where: { id: input.ticketId } });
      if (ticket.type !== 'ADVANCE_SALARY') {
        throw new TicketServiceError('INVALID_TRANSITION', 'PAY only valid for ADVANCE_SALARY');
      }

      const toStatus = guardTransition(ticket, 'PAY', actor.role);

      const updated = await tx.ticket.updateMany({
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

      const after = await tx.ticket.findUniqueOrThrow({ where: { id: ticket.id } });

      await tx.ticketHistory.create({
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

      await this.writeAuditLog(tx, {
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

      await this.enqueueNotification(tx, {
        ticketId: ticket.id,
        recipientRole: 'WORKER',
        subject: `[Advance] Táº¡m á»©ng Ä‘Ã£ chi`,
        body: `Báº¡n Ä‘Ã£ nháº­n ${after.deductionVnd.toString()} VND.`,
        linkUrl: `/worker/tickets/${ticket.id}`,
      });

      return after;
    });
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LIST (cho UI table)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async listTickets(filter: ListTicketsFilter, actor: SessionUser): Promise<{
    items: Ticket[];
    total: number;
  }> {
    const where: Prisma.TicketWhereInput = {};

    // Worker chá»‰ tháº¥y ticket cá»§a mÃ¬nh
    if (actor.role === 'WORKER') {
      where.workerId = actor.workerId ?? actor.id;  // DEC-01
    } else if (filter.workerId) {
      where.workerId = filter.workerId;
    }

    if (filter.type) where.type = filter.type;

    if (filter.status) {
      where.status = { in: filter.status };
    } else if (!filter.includeClosed) {
      // Máº·c Ä‘á»‹nh loáº¡i trá»« terminal
      where.status = { notIn: ['REJECTED', 'CANCELLED', 'CLOSED'] };
    }

    if (filter.assignedToMe) {
      // HR/Accountant: ticket trong queue cá»§a role
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
      this.prisma.ticket.findMany({
        where,
        orderBy: orderByMap[filter.orderBy ?? 'createdAt'],
        take: filter.take ?? 50,
        skip: filter.skip ?? 0,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items, total };
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // GET (single ticket + history)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getTicket(ticketId: string, actor: SessionUser): Promise<{
    ticket: Ticket;
    history: TicketHistory[];
  }> {
    const ticket = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });

    // Worker chá»‰ xem ticket cá»§a mÃ¬nh
    if (actor.role === 'WORKER' && ticket.workerId !== (actor.workerId ?? actor.id)) {
      throw new TicketServiceError('FORBIDDEN', 'Cannot view another worker\'s ticket');
    }

    const history = await this.prisma.ticketHistory.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });

    return { ticket, history };
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PRIVATE HELPERS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
    // Custom logger (Sentry/Datadog) váº«n Ä‘Æ°á»£c respect qua ctor param.
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
    // Phase 3 / RQ-05 (DEC-01): enqueue qua outbox cÃ¹ng transaction vá»›i state change.
    // Drain in-process (sau commit) sáº½ táº¡o TicketNotification row.
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CUSTOM AUDIT LOGGER TYPE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
