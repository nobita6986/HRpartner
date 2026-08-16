/**
 * POST /api/tickets/[id]/approve
 * Auth (Phase 1 identity-core — RQ-07, DEC-08): JWT + CAN_APPROVE_TICKET_LEVEL2.
 * Không permission → 403 FORBIDDEN.
 * Không JWT → 401.
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
    const { sessionUser } = await requireTicketAuth(req, 'CAN_APPROVE_TICKET_LEVEL2');
    const idempotencyKey = getIdempotencyKey(req);
    const body = await req.json().catch(() => ({}));

    // V4 (F27): route này CHỈ approve — chi tiền đi qua /pay riêng
    const input = {
      ticketId: id,
      note: body.note,
      idempotencyKey,
    };

    const ticket = await service.approveTicket(input, sessionUser);
    return NextResponse.json({ ticket }, { status: 200 });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}
