/**
 * POST /api/tickets/[id]/reject
 *
 * Body: { reason: string }
 * Headers:
 *   - Authorization: Bearer <userId>:<role>
 *   - x-idempotency-key: <uuid> (optional)
 *
 * Chuyển ticket → REJECTED (terminal). Lý do bắt buộc.
 */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { TicketService, TicketServiceError } from '@/src/domains/attendance/ticket.service';
import { getSessionUser, getIdempotencyKey } from '@/src/domains/attendance/session';

const prisma = new PrismaClient();
const service = new TicketService(prisma);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actor = getSessionUser(req);
    const idempotencyKey = getIdempotencyKey(req);
    const body = await req.json();

    if (!body.reason || typeof body.reason !== 'string' || !body.reason.trim()) {
      return NextResponse.json(
        { error: 'VALIDATION', message: 'reason is required' },
        { status: 400 },
      );
    }

    const ticket = await service.rejectTicket(
      {
        ticketId: params.id,
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
    console.error('[POST /api/tickets/[id]/reject] error', err);
    return NextResponse.json({ error: 'INTERNAL', message: String(err) }, { status: 500 });
  }
}
