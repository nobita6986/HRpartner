/**
 * POST /api/tickets/[id]/cancel
 * Auth: JWT + CAN_PROCESS_TICKET.
 * RQ-05 / DEC-08: DB ops go through withDbContext to set RLS GUC.
 */
import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/src/domains/attendance/ticket.service';
import { requireTicketAuth, ticketsErrorResponse } from '@/src/shared/auth/ticket-route-helpers';
import { getIdempotencyKey } from '@/src/shared/auth/ticket-route-helpers';
import { getPrisma } from '@/src/lib/db';
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { notifyTicketStatusChange } from '@/src/shared/push/trigger';

const service = new TicketService(getPrisma());

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const authCtx = await getAuthContext(req);
    const { sessionUser } = await requireTicketAuth(req, 'CAN_PROCESS_TICKET');
    const idempotencyKey = getIdempotencyKey(req);
    const body = await req.json().catch(() => ({}));

    const input = { ticketId: id, reason: body.reason, idempotencyKey };

    // RQ-05: withDbContext sets RLS GUC before service call
    if (!idempotencyKey) {
      const ticket = await withDbContext(getPrisma(), authCtx, async (tx) =>
        service.cancelTicket(input, sessionUser, tx),
      );
      await notifyTicketStatusChange(ticket.workerId, ticket.title, ticket.status).catch(() => {});
      return NextResponse.json({ ticket }, { status: 200 });
    }

    const result = await withIdempotency({
      prisma: getPrisma(),
      route: 'POST:/api/tickets/{id}/cancel',
      actorId: sessionUser.id,
      key: idempotencyKey,
      requestBody: body,
      handler: async () => ({
        body: {
          ticket: await withDbContext(getPrisma(), authCtx, async (tx) =>
            service.cancelTicket(input, sessionUser, tx),
          ),
        },
        statusCode: 200,
      }),
    });

    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}
