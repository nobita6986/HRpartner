/**
 * GET /api/tickets/[id]
 * Lấy chi tiết ticket + lịch sử transition.
 *
 * Permission: HR/Accountant/PM/Admin xem được. Worker chỉ xem ticket của mình.
 */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { TicketService, TicketServiceError } from '@/src/domains/attendance/ticket.service';
import { getSessionUser } from '@/src/domains/attendance/session';

const prisma = new PrismaClient();
const service = new TicketService(prisma);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actor = getSessionUser(req);
    const { ticket, history } = await service.getTicket(params.id, actor);
    return NextResponse.json({ ticket, history }, { status: 200 });
  } catch (err) {
    if (err instanceof TicketServiceError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
      };
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: statusMap[err.code] ?? 500 },
      );
    }
    console.error('[GET /api/tickets/[id]] error', err);
    return NextResponse.json({ error: 'INTERNAL', message: String(err) }, { status: 500 });
  }
}
