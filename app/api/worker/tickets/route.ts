/**
 * GET /api/worker/tickets — P1 Portals STEP-04 (RQ-03).
 *
 * Returns tickets created by the authenticated WORKER.
 *
 * POST /api/worker/tickets — T1A Android backend mobile contract (TASK DEC-07):
 * worker tự tạo ticket cho CHÍNH MÌNH bằng cách TÁI SỬ DỤNG NGUYÊN workflow của
 * `POST /api/tickets` (validation, audit, history, notification, idempotency)
 * qua shared handler `ticket-create-handler.ts`. Server-side ownership:
 * body.workerId khác self → 403; thiếu → force = ctx.workerId. KHÔNG code path
 * riêng, KHÔNG đổi behavior service.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  handleTicketCreateFromRequest,
  resolveTicketCreateAuth,
  ticketsErrorResponse,
} from '@/src/shared/auth/ticket-create-handler';

export async function POST(req: NextRequest) {
  try {
    const { ctx, sessionUser } = await resolveTicketCreateAuth(req);

    if (ctx.role !== 'WORKER') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Endpoint chỉ dành cho role WORKER' },
        { status: 403 },
      );
    }
    if (!ctx.workerId) {
      return NextResponse.json(
        { error: 'WORKER_PROFILE_NOT_FOUND', message: 'Worker profile chưa được tạo' },
        { status: 404 },
      );
    }

    // DEC-07: self-scope server-side — client không tự khai workerId.
    return await handleTicketCreateFromRequest(req, ctx, sessionUser, { selfScope: ctx.workerId });
  } catch (err) {
    // Cùng taxonomy lỗi với POST /api/tickets (AuthSessionError→401,
    // IdempotencyConflictError→409, TicketServiceError→…).
    return ticketsErrorResponse(err);
  }
}

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (!ctx.workerId) {
    return NextResponse.json({ error: 'NOT_A_WORKER' }, { status: 403 });
  }

  const prisma = getPrisma();

  let rows;
  try {
    // Boundary canonical: L1 Ticket self-scope (workerId = ctx.workerId) + L2 RLS.
    rows = await withAuthorizedDbReadOnly(prisma, ctx, (tx) =>
      tx.ticket.findMany({
        where: { workerId: ctx.workerId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          createdAt: true,
        },
      }),
    );
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/worker/tickets] query error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      type: r.type,
      createdAt: r.createdAt.toISOString().split('T')[0],
    })),
    total: rows.length,
  });
}
