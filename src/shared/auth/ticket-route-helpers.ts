/**
 * Shared route handler helper — Phase 1 identity-core (RQ-07, DEC-08).
 *
 * Mọi /api/tickets/* route đều:
 *  1. verify JWT → AuthContext (getAuthContext)
 *  2. requirePermission check (nếu cần)
 *  3. map SystemRole → TicketActorRole (toSessionUser)
 *  4. gọi service
 *  5. map lỗi (AuthSessionError → 401, AuthError → 403, TicketServiceError → theo code)
 *
 * Giữ nguyên response shape cũ — không phá vỡ contract service.
 */
import { NextRequest, NextResponse } from 'next/server';
import { TicketServiceError } from '@/src/domains/attendance/ticket.service';
import { getAuthContext, AuthSessionError } from './auth-context';
import { AuthError } from './require-permission';
import { toSessionUser, extractRequestMeta } from './session-adapter';
import type { SessionUser } from '@/src/domains/attendance/ticket.service';

const TICKET_STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  FORBIDDEN: 403,
  VALIDATION: 400,
  CONCURRENT_UPDATE: 409,
  IDEMPOTENCY_CONFLICT: 409,
};

/** Catch-all error mapper cho route tickets — đảm bảo response shape ổn định. */
export function ticketsErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthSessionError) {
    const status = err.code === 'NO_TOKEN' ? 401 : 401;
    return NextResponse.json({ error: err.code, message: err.message }, { status });
  }
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: 'FORBIDDEN', reason: err.message },
      { status: 403 },
    );
  }
  if (err instanceof TicketServiceError) {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: TICKET_STATUS_MAP[err.code] ?? 500 },
    );
  }
  console.error('[tickets route] unexpected error', err);
  return NextResponse.json({ error: 'INTERNAL', message: String(err) }, { status: 500 });
}

export interface TicketAuthContext {
  auth: { userId: string; role: string };
  sessionUser: SessionUser;
}

/** Helper: verify + requirePermission (nếu có) → trả SessionUser cho service. */
export async function requireTicketAuth(
  req: NextRequest,
  permissionCode?: Parameters<typeof import('./require-permission').requirePermission>[1],
): Promise<TicketAuthContext> {
  const ctx = await getAuthContext(req);
  const { requirePermission } = await import('./require-permission');
  if (permissionCode) {
    await requirePermission({ userId: ctx.userId, role: ctx.role }, permissionCode);
  }
  const sessionUser = toSessionUser(ctx, extractRequestMeta(req));
  return {
    auth: { userId: ctx.userId, role: ctx.role },
    sessionUser,
  };
}

/** Helper chỉ verify auth (không require permission) — cho GET list/detail và POST create. */
export async function getTicketAuth(req: NextRequest): Promise<TicketAuthContext> {
  return requireTicketAuth(req);
}
