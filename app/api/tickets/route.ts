/**
 * POST /api/tickets + GET /api/tickets
 *
 * RQ-05 / DEC-08: DB operations go through withDbContext to set RLS GUC.
 * Auth via getTicketAuth (JWT verify + role check).
 *
 * T1A (TASK DEC-07): POST delegate sang shared handler
 * `src/shared/auth/ticket-create-handler.ts` — cùng workflow giờ cũng được
 * `POST /api/worker/tickets` tái sử dụng nguyên (validation, audit, history,
 * idempotency); hành vi route này GIỮ NGUYÊN.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  handleTicketCreateFromRequest,
  resolveTicketCreateAuth,
  ticketsErrorResponse,
  ticketService,
} from '@/src/shared/auth/ticket-create-handler';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getPrisma } from '@/src/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { ctx, sessionUser } = await resolveTicketCreateAuth(req);
    return await handleTicketCreateFromRequest(req, ctx, sessionUser);
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { ctx, sessionUser } = await resolveTicketCreateAuth(req);
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
      ticketService.listTickets(filter, sessionUser, tx),
    );
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return ticketsErrorResponse(err);
  }
}
