/**
 * POST /api/tickets
 * Worker (hoặc HR tạo hộ) tạo ticket mới.
 *
 * Auth (Phase 1 identity-core — RQ-07, DEC-08):
 *  - JWT verify; SystemRole ngoài 6 TicketActorRole → 403.
 *  - GET/POST chỉ cần auth (200 role yếu theo PHASE_KHOAHOC exit criteria).
 *  - Idempotency key giữ nguyên hành vi Phase 3.
 */
import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/src/domains/attendance/ticket.service';
import { getTicketAuth, ticketsErrorResponse } from '@/src/shared/auth/ticket-route-helpers';
import { getIdempotencyKey } from '@/src/domains/attendance/session';
import { getPrisma } from '@/src/lib/db';

const service = new TicketService(getPrisma());

export async function POST(req: NextRequest) {
  try {
    const { sessionUser } = await getTicketAuth(req);
    const body = await req.json();
    const idempotencyKey = getIdempotencyKey(req);

    // Body mặc định: worker tự tạo cho mình
    if (sessionUser.role === 'WORKER') {
      body.workerId = body.workerId ?? sessionUser.id;
      if (body.workerId !== sessionUser.id) {
        return NextResponse.json(
          { error: 'FORBIDDEN', message: 'Worker can only create ticket for self' },
          { status: 403 },
        );
      }
    } else if (!body.workerId) {
      return NextResponse.json(
        { error: 'VALIDATION', message: 'workerId required when HR creates ticket' },
        { status: 400 },
      );
    }

    // Coerce BigInt và Date
    const input = {
      ...body,
      amountVnd: body.amountVnd !== undefined ? BigInt(body.amountVnd) : undefined,
      workDate: body.workDate ? new Date(body.workDate) : undefined,
      requestedPayDate: body.requestedPayDate ? new Date(body.requestedPayDate) : undefined,
      leaveFromDate: body.leaveFromDate ? new Date(body.leaveFromDate) : undefined,
      leaveToDate: body.leaveToDate ? new Date(body.leaveToDate) : undefined,
      idempotencyKey,
    };

    const ticket = await service.createTicket(input, sessionUser);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { sessionUser } = await getTicketAuth(req);
    const url = new URL(req.url);

    const statusParam = url.searchParams.get('status');
    const status = statusParam ? (statusParam.split(',') as any) : undefined;

    const filter = {
      status,
      type: (url.searchParams.get('type') as any) ?? undefined,
      workerId: url.searchParams.get('workerId') ?? undefined,
      assignedToMe: url.searchParams.get('assignedToMe') === 'true',
      take: url.searchParams.get('take') ? Number(url.searchParams.get('take')) : undefined,
      skip: url.searchParams.get('skip') ? Number(url.searchParams.get('skip')) : undefined,
      orderBy: (url.searchParams.get('orderBy') as any) ?? 'createdAt',
    };

    const result = await service.listTickets(filter, sessionUser);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}
