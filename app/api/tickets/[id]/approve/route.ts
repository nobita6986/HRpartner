/**
 * POST /api/tickets/[id]/approve
 *
 * Body: { note?: string }  — V4 (F27): ghi nhận chi tiền đi qua /api/tickets/[id]/pay riêng
 * Headers:
 *   - Authorization: Bearer <userId>:<role>:<name>
 *   - x-idempotency-key: <uuid> (optional)
 *
 * State machine:
 *   PENDING + HR_STAFF/HR_MANAGER → HR_APPROVED (cho ADVANCE)
 *   PENDING + HR_MANAGER → APPROVED (cho LEAVE/DISPUTE — fast-track)
 *   HR_APPROVED + ACCOUNTANT → APPROVED (cho ADVANCE)
 *   HR_APPROVED + HR_MANAGER → APPROVED (cho LEAVE/DISPUTE)
 *   APPROVED + ACCOUNTANT → PAID (qua /pay — xem route pay, V4 F27)
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

    // V4 (F27): route này CHỈ approve — ghi nhận chi tiền đi qua /api/tickets/[id]/pay
    const input = {
      ticketId: id,
      note: body.note,
      idempotencyKey,
    };

    const ticket = await service.approveTicket(input, actor);

    return NextResponse.json({ ticket }, { status: 200 });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): NextResponse {
  if (err instanceof TicketServiceError) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      INVALID_TRANSITION: 409,
      FORBIDDEN: 403,
      VALIDATION: 400,
      CONCURRENT_UPDATE: 409,
      IDEMPOTENCY_CONFLICT: 409,
    };
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: statusMap[err.code] ?? 500 },
    );
  }
  console.error('[POST /api/tickets/[id]/approve] error', err);
  return NextResponse.json({ error: 'INTERNAL', message: String(err) }, { status: 500 });
}
