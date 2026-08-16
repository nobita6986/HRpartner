/**
 * GET /api/tickets/[id]
 * Lấy chi tiết ticket + lịch sử transition.
 *
 * Auth (Phase 1 identity-core — RQ-07, DEC-08):
 *  - JWT verify (cookie/Bearer) qua getAuthContext.
 *  - SystemRole ngoài 6 TicketActorRole → 403 FORBIDDEN.
 *  - Service giữ logic cũ (worker chỉ xem ticket của mình).
 */
import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/src/domains/attendance/ticket.service';
import { getTicketAuth, ticketsErrorResponse } from '@/src/shared/auth/ticket-route-helpers';
import { getPrisma } from '@/src/lib/db';

const service = new TicketService(getPrisma());

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const { sessionUser } = await getTicketAuth(req);
    const { ticket, history } = await service.getTicket(id, sessionUser);
    return NextResponse.json({ ticket, history }, { status: 200 });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}
