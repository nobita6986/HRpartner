/**
 * POST /api/tickets/[id]/pay
 * Accountant ghi nhận đã chi tạm ứng (ADVANCE_SALARY: APPROVED → PAID).
 * V4 (F27): endpoint riêng — KHÔNG còn sniff body trong /approve.
 *
 * Body: { note?: string, paidAmountVnd?: string, paidAt?: string }
 * Headers:
 *   - Authorization: Bearer <userId>:<role>
 *   - x-idempotency-key: <uuid> (optional)
 *
 * Response: 200 { ticket } | 400/403/404/409 { error, message }
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

    const input = {
      ticketId: id,
      note: body.note,
      idempotencyKey,
      ...(body.paidAmountVnd !== undefined && { paidAmountVnd: BigInt(body.paidAmountVnd) }),
      ...(body.paidAt && { paidAt: new Date(body.paidAt) }),
    };

    const ticket = await service.payAdvance(input, actor);
    return NextResponse.json({ ticket }, { status: 200 });
  } catch (err) {
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
    console.error('[POST /api/tickets/[id]/pay] error', err);
    return NextResponse.json({ error: 'INTERNAL', message: String(err) }, { status: 500 });
  }
}
