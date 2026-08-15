/**
 * POST /api/tickets
 * Worker (hoặc HR tạo hộ) tạo ticket mới.
 *
 * Body: CreateTicketInput
 * Headers:
 *   - Authorization: Bearer <userId>:<role>
 *   - x-idempotency-key: <uuid> (optional)
 *
 * Response: 201 { ticket: Ticket }
 *           400 { error, message } validation
 *           401 { error, message } auth
 */
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { TicketService, TicketServiceError } from '@/src/domains/attendance/ticket.service';
import { getSessionUser, getIdempotencyKey } from '@/src/domains/attendance/session';
import { getPrisma } from '@/src/lib/db';

const service = new TicketService(getPrisma());

export async function POST(req: NextRequest) {
  try {
    const actor = getSessionUser(req);
    const body = await req.json();
    const idempotencyKey = getIdempotencyKey(req);

    // Body mặc định: worker tự tạo cho mình
    if (actor.role === 'WORKER') {
      body.workerId = body.workerId ?? actor.id;
      if (body.workerId !== actor.id) {
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

    const ticket = await service.createTicket(input, actor);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * GET /api/tickets?status=&type=&workerId=&assignedToMe=&take=&skip=
 */
export async function GET(req: NextRequest) {
  try {
    const actor = getSessionUser(req);
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

    const result = await service.listTickets(filter, actor);
    return NextResponse.json(result, { status: 200 });
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
  console.error('[POST /api/tickets] unexpected error', err);
  return NextResponse.json({ error: 'INTERNAL', message: String(err) }, { status: 500 });
}
