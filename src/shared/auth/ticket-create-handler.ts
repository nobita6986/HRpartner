/**
 * ticket-create-handler.ts — T1A Android backend mobile contract (TASK DEC-07).
 *
 * Shared handler cho `POST /api/tickets` và `POST /api/worker/tickets` — worker
 * route TÁI SỬ DỤNG NGUYÊN workflow tạo ticket hiện hành (validation, audit,
 * history, notification, idempotency) thay vì code path riêng.
 *
 * Contract:
 *  - options.selfScope = workerId  → bắt buộc self (worker route): body.workerId
 *    khác selfScope → 403; không có/nhầm → ép = selfScope (server-derived).
 *  - options.selfScope = undefined → giữ nguyên hành vi /api/tickets: WORKER chỉ
 *    tạo cho mình với workerId server-side (existing RQ), HR bắt buộc body.workerId.
 *  - Body-passed amountVnd → BigInt; date fields → Date (transform của POST /api/tickets).
 *  - Idempotency qua header x-idempotency-key → withIdempotency wrapper route
 *    'POST:/api/tickets' cho cả 2 route (same canonical workflow).
 *  - Lỗi → ticketsErrorResponse (taxonomy hiện hành).
 *
 * Tầng ghi record: withDbContext (L2 GUC theo AuthContext) — như hiện hành.
 */
import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/src/domains/attendance/ticket.service';
import { getIdempotencyKey, ticketsErrorResponse } from '@/src/shared/auth/ticket-route-helpers';
import { toSessionUser, extractRequestMeta } from '@/src/shared/auth/session-adapter';
import { getPrisma } from '@/src/lib/db';
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getAuthContext, AuthSessionError, type AuthContext } from '@/src/shared/auth/auth-context';
import type { SessionUser } from '@/src/domains/attendance/ticket.service';

export const ticketService = new TicketService(getPrisma());

export interface HandleTicketCreateOptions {
  /** Worker self-scope (worker route). Khi set: body.workerId khác self → 403, force = self. */
  selfScope?: string;
}

export async function handleTicketCreateFromRequest(
  req: NextRequest,
  ctx: AuthContext,
  sessionUser: SessionUser,
  options: HandleTicketCreateOptions = {},
): Promise<NextResponse> {
  const body = await req.json();
  const idempotencyKey = getIdempotencyKey(req);

  if (options.selfScope !== undefined) {
    // T1A (DEC-07): body workerId khác self → 403 (cross-worker chặn rõ);
    // thiếu → force selfScope suy ra từ server.
    if (body.workerId != null && body.workerId !== options.selfScope) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Worker can only create ticket for self' },
        { status: 403 },
      );
    }
    body.workerId = options.selfScope;
  } else {
    // Hành vi hiện hành /api/tickets (giữ nguyên byte-compatible).
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

  // RQ-05: withDbContext sets RLS GUC before service call (workflow hiện hành).
  if (!idempotencyKey) {
    const ticket = await withDbContext(getPrisma(), ctx, async (tx) =>
      ticketService.createTicket(input, sessionUser, tx),
    );
    return NextResponse.json({ ticket }, { status: 201 });
  }

  // Idempotent: withIdempotency outer wraps withDbContext inner (workflow hiện hành).
  const result = await withIdempotency({
    prisma: getPrisma(),
    route: 'POST:/api/tickets',
    actorId: sessionUser.id,
    key: idempotencyKey,
    requestBody: body,
    handler: async () => ({
      body: {
        ticket: await withDbContext(getPrisma(), ctx, async (tx) =>
          ticketService.createTicket(input, sessionUser, tx),
        ),
      },
      statusCode: 201,
    }),
  });

  return NextResponse.json(result.body, { status: result.statusCode });
}

/**
 * Auth glue: AuthContext verify MỘT lần rồi map SessionUser tại chỗ.
 *
 * AUDIT FIX (correction batch 1/1): trước đây gọi `getTicketAuth(req)` — nó
 * gọi lại `getAuthContext` bên trong ⇒ mỗi POST xác thực cùng request 2 lần
 * (2 lần truy vấn User/Worker). Giờ dùng `toSessionUser` + `extractRequestMeta`
 * trực tiếp trên ctx đã có (cùng mapping bằng `requireTicketAuth` không
 * permission-code — hành vi byte-compatible, chỉ bỏ truy vấn lặp).
 */
export async function resolveTicketCreateAuth(
  req: NextRequest,
): Promise<{ ctx: AuthContext; sessionUser: SessionUser }> {
  const ctx = await getAuthContext(req);
  const sessionUser = toSessionUser(ctx, extractRequestMeta(req));
  return { ctx, sessionUser };
}

export type { AuthSessionError };
export { ticketsErrorResponse, getIdempotencyKey };
