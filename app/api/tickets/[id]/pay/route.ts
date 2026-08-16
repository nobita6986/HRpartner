/**
 * POST /api/tickets/[id]/pay
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

    const input = {
      ticketId: id,
      note: body.note,
      idempotencyKey,
      ...(body.paidAmountVnd !== undefined && { paidAmountVnd: BigInt(body.paidAmountVnd) }),
      ...(body.paidAt && { paidAt: new Date(body.paidAt) }),
    };

    const ticket = await service.payAdvance(input, sessionUser);
    return NextResponse.json({ ticket }, { status: 200 });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}
