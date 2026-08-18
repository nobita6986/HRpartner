/**
 * Shared route handler helper — Phase 1 identity-core (RQ-07, DEC-08) + Phase 3 (RQ-04 / RQ-02).
 *
 * Mọi /api/tickets/* route đều:
 *  1. verify JWT → AuthContext (getAuthContext)
 *  2. requirePermission check (nếu cần)
 *  3. map SystemRole → TicketActorRole (toSessionUser)
 *  4. (Phase 3) wrap POST handler với `withIdempotency` (RQ-02)
 *  5. gọi service
 *  6. map lỗi:
 *     - AuthSessionError → 401
 *     - AuthError → 403
 *     - IllegalTransitionError → 409 `{ error: 'ILLEGAL_TRANSITION', reason }`  (Phase 3 DoD)
 *     - TicketServiceError → theo code
 *     - IdempotencyConflictError → 409 `{ error: 'IDEMPOTENCY_CONFLICT', reason }`
 */
import { NextRequest, NextResponse } from 'next/server';
import { TicketServiceError } from '@/src/domains/attendance/ticket.service';
import { getAuthContext, AuthSessionError } from './auth-context';
import { AuthError } from './require-permission';
import { toSessionUser, extractRequestMeta } from './session-adapter';
import { IllegalTransitionError } from '@/src/shared/integrity/state-machine';
import { IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import type { SessionUser } from '@/src/domains/attendance/ticket.service';

const TICKET_STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  // Phase 3 / DoD: INVALID_TRANSITION cũng map 409 nhưng response shape mới `{ error: 'ILLEGAL_TRANSITION', reason }`
  // (handled riêng phía dưới).
  FORBIDDEN: 403,
  VALIDATION: 400,
  CONCURRENT_UPDATE: 409,
  IDEMPOTENCY_CONFLICT: 409,
};

/** Catch-all error mapper cho route tickets — đảm bảo response shape ổn định. */
export function ticketsErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthSessionError) {
    return NextResponse.json({ error: err.code, message: err.message }, { status: 401 });
  }
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: 'FORBIDDEN', reason: err.message },
      { status: 403 },
    );
  }
  if (err instanceof IllegalTransitionError) {
    // Phase 3 / RQ-04: response shape chuẩn theo DoD PHASE_KHOAHOC §4.
    return NextResponse.json(
      { error: 'ILLEGAL_TRANSITION', reason: err.message },
      { status: 409 },
    );
  }
  if (err instanceof IdempotencyConflictError) {
    // Phase 3 / RQ-02: client dùng cùng key nhưng khác body.
    return NextResponse.json(
      { error: 'IDEMPOTENCY_CONFLICT', reason: err.message },
      { status: 409 },
    );
  }
  if (err instanceof TicketServiceError) {
    // Phase 3: INVALID_TRANSITION path TicketServiceError (wrapper) cũng map 409 với reason.
    if (err.code === 'INVALID_TRANSITION') {
      return NextResponse.json(
        { error: 'ILLEGAL_TRANSITION', reason: err.message },
        { status: 409 },
      );
    }
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

/** Trich idempotency key tu request header. */
export function getIdempotencyKey(req: NextRequest): string | undefined {
  return req.headers.get('x-idempotency-key') ?? undefined;
}
