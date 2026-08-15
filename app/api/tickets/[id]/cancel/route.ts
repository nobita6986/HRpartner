/**
 * POST /api/tickets/[id]/cancel
 *
 * Worker (chủ ticket) tự rút ticket khi còn PENDING/HR_APPROVED.
 * Body: { reason?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { TicketService, TicketServiceError } from '@/src/domains/attendance/ticket.service';
import { getSessionUser, getIdempotencyKey } from '@/src/domains/attendance/session';
import { getPrisma } from '@/src/lib/db';

const service = new TicketService(getPrisma());

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const actor = getSessionUser(req);
    const idempotencyKey = getIdempotencyKey(req);
    const body = await req.json().catch(() => ({}));

    const ticket = await service.cancelTicket(
      {
        ticketId: id,
        reason: body.reason,
        idempotencyKey,
      },
      actor,
    );

    return NextResponse.json({ ticket }, { status: 200 });
  } catch (err) {
    if (err instanceof TicketServiceError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        INVALID_TRANSITION: 409,
        FORBIDDEN: 403,
        VALIDATION: 400,
      };
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: statusMap[err.code] ?? 500 },
      );
    }
    console.error('[POST /api/tickets/[id]/cancel] error', err);
    return NextResponse.json({ error: 'INTERNAL', message: String(err) }, { status: 500 });
  }
}
