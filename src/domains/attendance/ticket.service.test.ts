/**
 * Ticket Service Unit Tests â€” Vitest
 *
 * Test state machine transitions & role guards. DÃ¹ng Prisma mock (in-memory).
 *
 * Cover:
 *   1. CREATE â€” happy path + idempotency
 *   2. APPROVE (HR_STAFF) â†’ HR_APPROVED (advance)
 *   3. APPROVE (ACCOUNTANT) â†’ APPROVED (advance)
 *   4. APPROVE (HR_MANAGER) â†’ APPROVED (fast-track dispute)
 *   5. APPROVE (WORKER) â†’ FORBIDDEN
 *   6. REJECT (HR) â†’ REJECTED (terminal)
 *   7. CANCEL (worker) trÃªn PENDING â†’ CANCELLED
 *   8. CANCEL (worker) trÃªn APPROVED â†’ INVALID_TRANSITION
 *   9. PAY (Accountant) trÃªn APPROVED advance â†’ PAID
 *  10. PAY (HR) trÃªn APPROVED advance â†’ FORBIDDEN
 *  11. CONCURRENT_UPDATE khi version khÃ´ng khá»›p
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TicketService, TicketServiceError } from './ticket.service';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Mock Prisma client (in-memory store)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

interface MockTicket {
  id: string;
  workerId: string;
  createdByActorId: string;
  createdByRole: string;
  type: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  amountVnd: bigint;
  deductionVnd: bigint;
  workDate: Date | null;
  currentHours: any;
  requestedHours: any;
  deltaHours: any;
  leaveFromDate: Date | null;
  leaveToDate: Date | null;
  leaveDays: any;
  assignmentId: string | null;
  reasonCode: string | null;
  leaveTypeCode: string | null;
  requestedPayDate: Date | null;
  deductMonth: number | null;
  deductYear: number | null;
  metadata: any;
  slaDueAt: Date | null;
  isOverdue: boolean;
  version: number;
  createdAt: Date;
}

interface MockHistory {
  id: string;
  ticketId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string | null;
  actorRole: string;
  actorName: string | null;
  note: string | null;
  payload: any;
  ipAddress: string | null;
  userAgent: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
}

function makeMockPrisma() {
  const tickets: MockTicket[] = [];
  const histories: MockHistory[] = [];
  const audits: any[] = [];
  // Phase 3 / RQ-05: notifications Ä‘i qua outbox trÆ°á»›c, drain má»›i táº¡o TicketNotification.
  // Test mock track outboxEvents thay vÃ¬ notifications trá»±c tiáº¿p.
  const outboxEvents: any[] = [];
  // Phase 3 / RQ-02: withIdempotency wrapper sáº½ Ä‘á»¥ng idempotencyKey.
  const idemRows = new Map<string, any>();

  let ticketCounter = 0;
  let historyCounter = 0;
  let auditCounter = 0;
  let outboxCounter = 0;

  return {
    $transaction: vi.fn(async (fn: any) => fn(tx)),
    ticket: {
      findFirst: vi.fn(async ({ where }: any) => {
        if (where?.metadata?.path) {
          return tickets.find((t) => {
            const meta = t.metadata as any;
            return (
              meta?.idempotencyKey === where.metadata.equals &&
              t.workerId === where.workerId &&
              t.createdByActorId === where.createdByActorId
            );
          }) ?? null;
        }
        return null;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return tickets.find((t) => t.id === where.id) ?? null;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: any) => {
        const found = tickets.find((t) => t.id === where.id);
        if (!found) throw new Error('Not found');
        return found;
      }),
      create: vi.fn(async ({ data }: any) => {
        const ticket: MockTicket = {
          id: `ticket-${++ticketCounter}`,
          ...data,
          // Mirror schema @default (Prisma tháº­t tá»± Ä‘iá»n â€” mock pháº£i lÃ m tÆ°Æ¡ng tá»±)
          amountVnd: data.amountVnd ?? 0n,
          deductionVnd: data.deductionVnd ?? 0n,
          version: data.version ?? 1,
          isOverdue: false,
          createdAt: new Date(),
        };
        tickets.push(ticket);
        return ticket;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const idx = tickets.findIndex((t) => t.id === where.id && t.version === where.version);
        if (idx < 0) return { count: 0 };
        tickets[idx] = { ...tickets[idx], ...data };
        return { count: 1 };
      }),
      findMany: vi.fn(),
      count: vi.fn(() => tickets.length),
    },
    ticketHistory: {
      create: vi.fn(async ({ data }: any) => {
        const h: MockHistory = {
          id: `h-${++historyCounter}`,
          ...data,
          createdAt: new Date(),
        };
        histories.push(h);
        return h;
      }),
      findMany: vi.fn(async ({ where }: any) =>
        histories.filter((h) => h.ticketId === where.ticketId),
      ),
    },
    auditLog: {
      create: vi.fn(async ({ data }: any) => {
        const a = { id: `a-${++auditCounter}`, ...data, createdAt: new Date() };
        audits.push(a);
        return a;
      }),
    },
    outboxEvent: {
      create: vi.fn(async ({ data }: any) => {
        const e = {
          id: `outbox-${++outboxCounter}`,
          ...data,
          status: data.status ?? 'PENDING',
          retryCount: data.retryCount ?? 0,
          createdAt: new Date(),
        };
        outboxEvents.push(e);
        return e;
      }),
    },
    // Phase 3 / RQ-02: withIdempotency wrapper sáº½ Ä‘á»¥ng idempotencyKey.
    idempotencyKey: {
      findUnique: vi.fn(async ({ where }: any) => {
        const w = where.uq_idempotency_keys_scope;
        return idemRows.get(`${w.actorId}|${w.route}|${w.key}`) ?? null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const r = {
          id: `idem-${idemRows.size + 1}`,
          ...data,
          createdAt: new Date(),
        };
        idemRows.set(`${data.actorId}|${data.route}|${data.key}`, r);
        return r;
      }),
    },
    _data: { tickets, histories, audits, outboxEvents },
  };
}

let tx: ReturnType<typeof makeMockPrisma>;
let prisma: ReturnType<typeof makeMockPrisma>;
let service: TicketService;

beforeEach(() => {
  prisma = makeMockPrisma();
  tx = prisma;  // mock $transaction dÃ¹ng chung
  service = new TicketService(prisma as any);
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TEST CASES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe('TicketService â€” CREATE', () => {
  it('táº¡o ticket TIMESHEET_DISPUTE thÃ nh cÃ´ng', async () => {
    const ticket = await service.createTicket(
      {
        workerId: 'w1',
        type: 'TIMESHEET_DISPUTE',
        title: 'Sai cÃ´ng ngÃ y 10/8',
        description: 'TÃ´i Ä‘i lÃ m 8h nhÆ°ng há»‡ thá»‘ng ghi 6h',
        assignmentId: 'a1',
        workDate: new Date('2025-08-10'),
        currentHours: 6,
        requestedHours: 8,
        reasonCode: 'MISSING_CHECKOUT',
      },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1', name: '' },
    );

    expect(ticket.status).toBe('PENDING');
    expect(ticket.workerId).toBe('w1');
    expect(prisma._data.histories).toHaveLength(1);
    expect(prisma._data.histories[0].action).toBe('CREATE');
    expect(prisma._data.audits).toHaveLength(1);
    expect(prisma._data.outboxEvents).toHaveLength(1);
    expect(prisma._data.outboxEvents[0].eventType).toBe('TicketNotification');
  });

  it('idempotency: 2 láº§n táº¡o cÃ¹ng key â†’ tráº£ vá» ticket cï¿½ (via withIdempotency wrapper)', async () => {
    // Phase 3 / RQ-02 (DEC-02): idempotency chuyá»ƒn sang `withIdempotency` wrapper.
    // Route handler sáº½ wrap createTicket; service KHÃ”NG tá»± check metadata ná»¯a.
    const input = {
      workerId: 'w1',
      type: 'ADVANCE_SALARY' as const,
      title: 'Táº¡m á»©ng',
      description: 'Cáº§n tiá»n',
      amountVnd: 2000000n,
      deductMonth: 8,
      deductYear: 2025,
      idempotencyKey: 'idem-123',
    };
    const actor = { id: 'USR-w1', role: 'WORKER' as const, workerId: 'w1', name: 'A' };

    const { withIdempotency } = await import('@/src/shared/integrity/idempotency');
    const wrap = (key: string) =>
      withIdempotency({
        prisma,
        route: 'POST:/api/tickets',
        actorId: actor.id,
        key,
        requestBody: input,
        handler: async () => ({ body: await service.createTicket(input, actor) }),
      });

    const r1 = await wrap('idem-123');
    const r2 = await wrap('idem-123');

    expect((r2.body as any).id).toBe((r1.body as any).id);
    expect(prisma._data.tickets).toHaveLength(1);
    expect(r2.replayed).toBe(true);
  });

  it('VALIDATION: amountVnd = 0 â†’ throw', async () => {
    await expect(
      service.createTicket(
        {
          workerId: 'w1',
          type: 'ADVANCE_SALARY',
          title: 'Test',
          description: 'Test',
          amountVnd: 0n,
          deductMonth: 8,
          deductYear: 2025,
        },
        { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
      ),
    ).rejects.toThrow(TicketServiceError);
  });
});

describe('TicketService â€” APPROVE (advance salary 2-step)', () => {
  async function seedAdvance(): Promise<string> {
    const t = await service.createTicket(
      {
        workerId: 'w1',
        type: 'ADVANCE_SALARY',
        title: 'Táº¡m á»©ng',
        description: 'Test',
        amountVnd: 2000000n,
        deductMonth: 8,
        deductYear: 2025,
      },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1', name: '' },
    );
    return t.id;
  }

  it('HR_STAFF approve â†’ HR_APPROVED', async () => {
    const id = await seedAdvance();
    const after = await service.approveTicket(
      { ticketId: id, note: 'OK' },
      { id: 'hr1', role: 'HR_STAFF', name: 'HR' },
    );
    expect(after.status).toBe('HR_APPROVED');
  });

  it('ACCOUNTANT approve HR_APPROVED â†’ APPROVED', async () => {
    const id = await seedAdvance();
    await service.approveTicket(
      { ticketId: id },
      { id: 'hr1', role: 'HR_STAFF' },
    );
    const after = await service.approveTicket(
      { ticketId: id, note: 'Chi thÃ¡ng nÃ y' },
      { id: 'acc1', role: 'ACCOUNTANT' },
    );
    expect(after.status).toBe('APPROVED');
  });

  it('WORKER approve â†’ FORBIDDEN', async () => {
    const id = await seedAdvance();
    await expect(
      service.approveTicket(
        { ticketId: id },
        { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('TicketService â€” APPROVE (LEAVE/DISPUTE fast-track)', () => {
  it('HR_MANAGER approve trá»±c tiáº¿p â†’ APPROVED (skip HR step)', async () => {
    const t = await service.createTicket(
      {
        workerId: 'w1',
        type: 'TIMESHEET_DISPUTE',
        title: 'Sai cÃ´ng',
        description: 'Test',
        assignmentId: 'a1',
        workDate: new Date('2025-08-10'),
        currentHours: 6,
        requestedHours: 8,
      },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
    );

    const after = await service.approveTicket(
      { ticketId: t.id },
      { id: 'mgr1', role: 'HR_MANAGER' },
    );

    expect(after.status).toBe('APPROVED');
  });
});

describe('TicketService â€” REJECT', () => {
  it('HR reject PENDING â†’ REJECTED (terminal)', async () => {
    const t = await service.createTicket(
      {
        workerId: 'w1',
        type: 'LEAVE_REQUEST',
        title: 'Nghá»‰ phÃ©p',
        description: 'Test',
        leaveFromDate: new Date('2025-08-15'),
        leaveToDate: new Date('2025-08-16'),
      },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
    );

    const after = await service.rejectTicket(
      { ticketId: t.id, reason: 'KhÃ´ng há»£p lá»‡' },
      { id: 'hr1', role: 'HR_STAFF' },
    );

    expect(after.status).toBe('REJECTED');
  });

  it('reject thiáº¿u lÃ½ do â†’ VALIDATION', async () => {
    const t = await service.createTicket(
      {
        workerId: 'w1',
        type: 'LEAVE_REQUEST',
        title: 'Test',
        description: 'Test',
        leaveFromDate: new Date('2025-08-15'),
        leaveToDate: new Date('2025-08-16'),
      },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
    );

    await expect(
      service.rejectTicket(
        { ticketId: t.id, reason: '   ' },
        { id: 'hr1', role: 'HR_STAFF' },
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('TicketService â€” CANCEL', () => {
  it('Worker cancel PENDING ticket cá»§a mÃ¬nh â†’ CANCELLED', async () => {
    const t = await service.createTicket(
      {
        workerId: 'w1',
        type: 'LEAVE_REQUEST',
        title: 'Test',
        description: 'Test',
        leaveFromDate: new Date('2025-08-15'),
        leaveToDate: new Date('2025-08-16'),
      },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
    );

    const after = await service.cancelTicket(
      { ticketId: t.id, reason: 'Äá»•i káº¿ hoáº¡ch' },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
    );

    expect(after.status).toBe('CANCELLED');
  });

  it('Worker cancel ticket ngÆ°á»i khÃ¡c â†’ FORBIDDEN', async () => {
    const t = await service.createTicket(
      {
        workerId: 'w1',
        type: 'LEAVE_REQUEST',
        title: 'Test',
        description: 'Test',
        leaveFromDate: new Date('2025-08-15'),
        leaveToDate: new Date('2025-08-16'),
      },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
    );

    await expect(
      service.cancelTicket(
        { ticketId: t.id },
        { id: 'w2', role: 'WORKER' },
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('Cancel terminal ticket â†’ INVALID_TRANSITION', async () => {
    const t = await service.createTicket(
      {
        workerId: 'w1',
        type: 'LEAVE_REQUEST',
        title: 'Test',
        description: 'Test',
        leaveFromDate: new Date('2025-08-15'),
        leaveToDate: new Date('2025-08-16'),
      },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
    );
    await service.rejectTicket(
      { ticketId: t.id, reason: 'No' },
      { id: 'hr1', role: 'HR_STAFF' },
    );

    await expect(
      service.cancelTicket(
        { ticketId: t.id },
        { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
      ),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});

describe('TicketService â€” PAY (advance chi tiá»n)', () => {
  it('ACCOUNTANT pay APPROVED advance â†’ PAID', async () => {
    const t = await service.createTicket(
      {
        workerId: 'w1',
        type: 'ADVANCE_SALARY',
        title: 'Táº¡m á»©ng',
        description: 'Test',
        amountVnd: 2000000n,
        deductMonth: 8,
        deductYear: 2025,
      },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
    );
    await service.approveTicket({ ticketId: t.id }, { id: 'hr1', role: 'HR_STAFF' });
    await service.approveTicket({ ticketId: t.id }, { id: 'acc1', role: 'ACCOUNTANT' });

    const after = await service.payAdvance(
      {
        ticketId: t.id,
        paidAmountVnd: 1800000n,
        note: 'ÄÃ£ chuyá»ƒn khoáº£n',
      },
      { id: 'acc1', role: 'ACCOUNTANT' },
    );

    expect(after.status).toBe('PAID');
    expect(after.deductionVnd).toBe(1800000n);
  });

  it('HR pay advance â†’ FORBIDDEN', async () => {
    const t = await service.createTicket(
      {
        workerId: 'w1',
        type: 'ADVANCE_SALARY',
        title: 'Táº¡m á»©ng',
        description: 'Test',
        amountVnd: 2000000n,
        deductMonth: 8,
        deductYear: 2025,
      },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
    );
    await service.approveTicket({ ticketId: t.id }, { id: 'hr1', role: 'HR_STAFF' });
    await service.approveTicket({ ticketId: t.id }, { id: 'acc1', role: 'ACCOUNTANT' });

    await expect(
      service.payAdvance(
        { ticketId: t.id },
        { id: 'hr1', role: 'HR_STAFF' },
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('PAY trÃªn LEAVE_REQUEST â†’ INVALID_TRANSITION', async () => {
    const t = await service.createTicket(
      {
        workerId: 'w1',
        type: 'LEAVE_REQUEST',
        title: 'Test',
        description: 'Test',
        leaveFromDate: new Date('2025-08-15'),
        leaveToDate: new Date('2025-08-16'),
      },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
    );
    await service.approveTicket({ ticketId: t.id }, { id: 'mgr1', role: 'HR_MANAGER' });

    await expect(
      service.payAdvance(
        { ticketId: t.id },
        { id: 'acc1', role: 'ACCOUNTANT' },
      ),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});

describe('TicketService â€” Concurrency', () => {
  it('CONCURRENT_UPDATE khi version khÃ´ng khá»›p', async () => {
    const t = await service.createTicket(
      {
        workerId: 'w1',
        type: 'LEAVE_REQUEST',
        title: 'Test',
        description: 'Test',
        leaveFromDate: new Date('2025-08-15'),
        leaveToDate: new Date('2025-08-16'),
      },
      { id: 'USR-w1', role: 'WORKER', workerId: 'w1' },
    );

    // Giáº£ láº­p 1 actor khÃ¡c tháº¯ng race giá»¯a find vÃ  update: updateMany tráº£ count 0 1 láº§n
    // (CÃ¡ch cÅ©: mutate version trong store KHÃ”NG giáº£ láº­p Ä‘Æ°á»£c race â€” service Ä‘á»c láº¡i version má»›i)
    (prisma.ticket.updateMany as any).mockImplementationOnce(async () => ({ count: 0 }));

    await expect(
      service.approveTicket(
        { ticketId: t.id },
        { id: 'mgr1', role: 'HR_MANAGER' },
      ),
    ).rejects.toMatchObject({ code: 'CONCURRENT_UPDATE' });
  });
});
