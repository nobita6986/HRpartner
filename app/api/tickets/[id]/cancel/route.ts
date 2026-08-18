/**
 * POST /api/tickets/[id]/cancel
 * Auth (Phase 1 identity-core — RQ-07, DEC-08): JWT + CAN_PROCESS_TICKET.
 */
import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/src/domains/attendance/ticket.service';
import { requireTicketAuth, ticketsErrorResponse } from '@/src/shared/auth/ticket-route-helpers';
import { getIdempotencyKey } from '@/src/shared/auth/ticket-route-helpers';
import { getPrisma } from '@/src/lib/db';
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import { notifyTicketStatusChange } from '@/src/shared/push/trigger';

const service = new TicketService(getPrisma());

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const { sessionUser } = await requireTicketAuth(req, 'CAN_PROCESS_TICKET');
    const idempotencyKey = getIdempotencyKey(req);
    const body = await req.json().catch(() => ({}));

    const input = {
      ticketId: id,
      reason: body.reason,
      idempotencyKey,
    };

    // Phase 3 / RQ-02: wrap handler nếu có key.
    if (!idempotencyKey) {
      const ticket = await service.cancelTicket(input, sessionUser);
      await notifyTicketStatusChange(ticket.workerId, ticket.title, ticket.status).catch(() => {});
      return NextResponse.json({ ticket }, { status: 200 });
    }

    const result = await withIdempotency({
      prisma: getPrisma(),
      route: 'POST:/api/tickets/{id}/cancel',
      actorId: sessionUser.id,
      key: idempotencyKey,
      requestBody: body,
      handler: async () => {
        const ticket = await service.cancelTicket(input, sessionUser);
        await notifyTicketStatusChange(ticket.workerId, ticket.title, ticket.status).catch(() => {});
        return { body: { ticket }, statusCode: 200 };
      },
    });

    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}
