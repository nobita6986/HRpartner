/**
 * POST /api/tickets + GET /api/tickets
 *
 * RQ-05 / DEC-08: DB operations go through withDbContext to set RLS GUC.
 * Auth via getTicketAuth (JWT verify + role check).
 */
import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/src/domains/attendance/ticket.service';
import { getTicketAuth, ticketsErrorResponse } from '@/src/shared/auth/ticket-route-helpers';
import { getIdempotencyKey } from '@/src/shared/auth/ticket-route-helpers';
import { getPrisma } from '@/src/lib/db';
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getAuthContext } from '@/src/shared/auth/auth-context';

const service = new TicketService(getPrisma());

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    const { sessionUser } = await getTicketAuth(req);
    const body = await req.json();
    const idempotencyKey = getIdempotencyKey(req);

    // Worker tự tạo cho mình; HR tạo hộ worker khác
    if (sessionUser.role === 'WORKER') {
      body.workerId = body.workerId ?? sessionUser.workerId;
      if (!sessionUser.workerId || body.workerId !== sessionUser.workerId) {
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

    const input = {
      ...body,
      amountVnd: body.amountVnd !== undefined ? BigInt(body.amountVnd) : undefined,
      workDate: body.workDate ? new Date(body.workDate) : undefined,
      requestedPayDate: body.requestedPayDate ? new Date(body.requestedPayDate) : undefined,
      leaveFromDate: body.leaveFromDate ? new Date(body.leaveFromDate) : undefined,
      leaveToDate: body.leaveToDate ? new Date(body.leaveToDate) : undefined,
      idempotencyKey,
    };

    // RQ-05: withDbContext sets RLS GUC before service call
    if (!idempotencyKey) {
      const ticket = await withDbContext(getPrisma(), ctx, async (tx) =>
        service.createTicket(input, sessionUser, tx),
      );
      return NextResponse.json({ ticket }, { status: 201 });
    }

    // Idempotent: withIdempotency outer wraps withDbContext inner
    const result = await withIdempotency({
      prisma: getPrisma(),
      route: 'POST:/api/tickets',
      actorId: sessionUser.id,
      key: idempotencyKey,
      requestBody: body,
      handler: async () => ({
        body: {
          ticket: await withDbContext(getPrisma(), ctx, async (tx) =>
            service.createTicket(input, sessionUser, tx),
          ),
        },
        statusCode: 201,
      }),
    });

    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
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

    // RQ-05: withDbContext sets RLS GUC before service call
    const result = await withDbContext(getPrisma(), ctx, async (tx) =>
      service.listTickets(filter, sessionUser, tx),
    );
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}
