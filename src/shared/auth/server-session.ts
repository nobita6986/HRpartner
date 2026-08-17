/**
 * Server-side session helper (Phase 4 slice 4A STEP-01).
 *
 * Đọc `hrp_token` cookie + verify JWT thông qua `verifyJwt` (Phase 1).
 * Dùng cho Admin layout (Server Component) — KHÔNG dùng cho route handler
 * (route handler dùng `getAuthContext` qua `auth-context.ts` — vùng cấm).
 *
 * Trả về null nếu không có token / verify fail — caller xử lý redirect.
 * Trả về { userId, role } nếu OK.
 *
 * KHÔNG sửa `jwt.ts` / `auth-context.ts` (vùng cấm Iron Rule).
 * Chỉ IMPORT + dùng.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { verifyJwt } from './jwt';
import type { SystemRole } from '@prisma/client';

export interface ServerSession {
  userId: string;
  role: SystemRole;
}

/**
 * Read session từ `hrp_token` cookie. Trả null nếu thiếu / verify fail.
 * Dùng trong Server Component (`app/admin/layout.tsx`) để guard route.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('hrp_token')?.value;
  if (!token) return null;

  try {
    const claims = await verifyJwt(token);
    return { userId: claims.sub, role: claims.role };
  } catch {
    // verifyJwt fail (missing secret, expired, invalid) → anonymous
    return null;
  }
}

/**
 * Roles allowed access to Admin Portal (Phase 4 V4 §4.2).
 * Worker → /m, Vendor → /vendor, anonymous → /login.
 */
export const ADMIN_PORTAL_ROLES: readonly SystemRole[] = [
  'ADMIN',
  'HR_MANAGER',
  'HR_STAFF',
  'PM',
  'ACCOUNTANT',
  'SALE',
  'DIRECTOR',
] as const;

export function isAdminPortalRole(role: SystemRole): boolean {
  return ADMIN_PORTAL_ROLES.includes(role);
}
