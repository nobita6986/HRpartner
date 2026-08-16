/**
 * Session adapter — Phase 1 identity-core (RQ-07, DEC-08).
 *
 * Chuyển AuthContext (JWT-thật) → SessionUser (TicketActorRole) ticket service hiểu.
 *
 * - Trong 6 TicketActorRole (WORKER/HR_STAFF/HR_MANAGER/ACCOUNTANT/PM/ADMIN): giữ nguyên role.
 * - Ngoài 6 (DIRECTOR/SALE/MKT/VENDOR_ADMIN/VENDOR_STAFF/CTV/EMPLOYEE): throw → 403.
 *
 * Identity field cho service (DEC-08):
 *   - id: AuthContext.userId (sub từ JWT)
 *   - role: mapped TicketActorRole
 *   - name/ipAddress/userAgent: optional, lấy từ req headers
 */
import { TicketActorRole } from '@prisma/client';
import type { AuthContext } from './auth-context';
import { AuthError } from './require-permission';
import type { SessionUser } from '@/src/domains/attendance/ticket.service';

const TICKET_ACTOR_ROLES: readonly TicketActorRole[] = [
  'WORKER', 'HR_STAFF', 'HR_MANAGER', 'ACCOUNTANT', 'PM', 'ADMIN',
];

const ROLE_TO_TICKET: Record<string, TicketActorRole | null> = {
  WORKER: 'WORKER',
  HR_STAFF: 'HR_STAFF',
  HR_MANAGER: 'HR_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  PM: 'PM',
  ADMIN: 'ADMIN',
  // Ngoài 6 → null → throw
  DIRECTOR: null,
  SALE: null,
  MKT: null,
  VENDOR_ADMIN: null,
  VENDOR_STAFF: null,
  CTV: null,
  EMPLOYEE: null,
};

/** Ánh xạ SystemRole → TicketActorRole. Throw nếu ngoài 6. */
export function toTicketActorRole(role: AuthContext['role']): TicketActorRole {
  const mapped = ROLE_TO_TICKET[role];
  if (mapped === null || mapped === undefined) {
    throw new AuthError(
      'PERMISSION_DENIED',
      `Role ${role} ngoài 6 TicketActorRole (worker tạo/quản lý ticket) — deny-by-default.`,
      { role },
    );
  }
  return mapped;
}

/** Adapter AuthContext → SessionUser (contract service). */
export function toSessionUser(
  ctx: AuthContext,
  meta?: { ipAddress?: string; userAgent?: string },
): SessionUser {
  const role = toTicketActorRole(ctx.role);
  return {
    id: ctx.userId,
    role,
    ...(meta?.ipAddress && { ipAddress: meta.ipAddress }),
    ...(meta?.userAgent && { userAgent: meta.userAgent }),
  };
}

/** Helper trích IP/UA từ NextRequest. */
export function extractRequestMeta(req: { headers: Headers }): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  };
}

/** Re-export — caller kiểm tra role có phải ticket actor không. */
export function isTicketActorRole(role: string): role is TicketActorRole {
  return TICKET_ACTOR_ROLES.includes(role as TicketActorRole);
}
