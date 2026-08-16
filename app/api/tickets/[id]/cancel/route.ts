/**
 * POST /api/tickets/[id]/cancel
 * Auth (Phase 1 identity-core — RQ-07, DEC-08): JWT + CAN_PROCESS_TICKET.
 */
import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/src/domains/attendance/ticket.service';
import { requireTicketAuth, ticketsErrorResponse } from '@/src/shared/auth/ticket-route-helpers';
import { getIdempotencyKey } from '@/src/domains/attendance/session';
import { getPrisma } from '@/src/lib/db';

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

    const ticket = await service.cancelTicket(
      {
        ticketId: id,
        reason: body.reason,
        idempotencyKey,
      },
      sessionUser,
    );

    return NextResponse.json({ ticket }, { status: 200 });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}
