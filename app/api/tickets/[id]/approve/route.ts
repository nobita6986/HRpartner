/**
 * POST /api/tickets/[id]/approve
 * Auth (Phase 1 identity-core — RQ-07, DEC-08): JWT + CAN_APPROVE_TICKET_LEVEL2.
 * Không permission → 403 FORBIDDEN.
 * Không JWT → 401.
 */
import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/src/domains/attendance/ticket.service';
import { requireTicketAuth, ticketsErrorResponse } from '@/src/shared/auth/ticket-route-helpers';
import { getIdempotencyKey } from '@/src/shared/auth/ticket-route-helpers';
import { getPrisma } from '@/src/lib/db';
import { withIdempotency } from '@/src/shared/integrity/idempotency';

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

    // Phase 3 / RQ-02: wrap handler nếu có key (client retry → replay kết quả cũ).
    if (!idempotencyKey) {
      const ticket = await service.approveTicket(input, sessionUser);
      return NextResponse.json({ ticket }, { status: 200 });
    }

    const result = await withIdempotency({
      prisma: getPrisma(),
      route: 'POST:/api/tickets/{id}/approve',
      actorId: sessionUser.id,
      key: idempotencyKey,
      requestBody: body,
      handler: async () => ({
        body: { ticket: await service.approveTicket(input, sessionUser) },
        statusCode: 200,
      }),
    });

    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}
