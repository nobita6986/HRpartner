/**
 * POST /api/tickets/[id]/approve
 *
 * Body: { note?: string, paidAmountVnd?: string, paidAt?: string }
 * Headers:
 *   - Authorization: Bearer <userId>:<role>:<name>
 *   - x-idempotency-key: <uuid> (optional)
 *
 * State machine:
 *   PENDING + HR_STAFF/HR_MANAGER → HR_APPROVED (cho ADVANCE)
 *   PENDING + HR_MANAGER → APPROVED (cho LEAVE/DISPUTE — fast-track)
 *   HR_APPROVED + ACCOUNTANT → APPROVED (cho ADVANCE)
 *   HR_APPROVED + HR_MANAGER → APPROVED (cho LEAVE/DISPUTE)
 *   APPROVED + ACCOUNTANT → PAID (cho ADVANCE — đã chi tiền)
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
    const body = await req.json().catch(() => ({}));

    // Phân biệt route theo path con hay không
    // URL: /api/tickets/[id]/approve  (Next.js dynamic segment cùng path)
    // Logic phân nhánh nằm trong service.approveTicket() / service.payAdvance()
    // Tạm thời: nếu body có paidAmountVnd/paidAt → payAdvance; ngược lại approve
    const isPayAction = body.paidAmountVnd !== undefined || body.paidAt !== undefined;

    const input = {
      ticketId: params.id,
      note: body.note,
      idempotencyKey,
      ...(body.paidAmountVnd !== undefined && { paidAmountVnd: BigInt(body.paidAmountVnd) }),
      ...(body.paidAt && { paidAt: new Date(body.paidAt) }),
    };

    const ticket = isPayAction
      ? await service.payAdvance(input, actor)
      : await service.approveTicket(input, actor);

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
