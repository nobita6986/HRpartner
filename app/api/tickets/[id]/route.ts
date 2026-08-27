/**
 * GET /api/tickets/[id]
 *
 * RQ-05 / DEC-08: DB operations go through withDbContext to set RLS GUC.
 */
import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/src/domains/attendance/ticket.service';
import { getTicketAuth, ticketsErrorResponse } from '@/src/shared/auth/ticket-route-helpers';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getAuthContext } from '@/src/shared/auth/auth-context';

const service = new TicketService(getPrisma());

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const authCtx = await getAuthContext(req);
    const { sessionUser } = await getTicketAuth(req);
    const { id } = await ctx.params;

    // RQ-05: withDbContext sets RLS GUC before service call
    const { ticket, history } = await withDbContext(getPrisma(), authCtx, async (tx) =>
      service.getTicket(id, sessionUser, tx),
    );
    return NextResponse.json({ ticket, history }, { status: 200 });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}
