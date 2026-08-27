/**
 * AuthContext — Phase 1 identity-core (RQ-04, DEC-04).
 *
 * Decode JWT thật từ cookie/Bearer (jwt.ts của bcc-fence) → AuthContext chuẩn.
 * Tái sử dụng toàn bộ bộ auth bcc-fence (DEC-01 + lưu ý sếp 16/08):
 *   - jwt.ts (jose HS256)
 *   - user.ts (getAuthUser từ Next.js Request)
 *
 * AuthContext là đầu vào cho mọi module downstream (require-permission, with-auth-scope, ticket route).
 * Phải có AuthContext mới dùng được resolveEffectivePermissions (cần userId).
 *
 * Token thiếu/sai/hết hạn/isActive=false → throw AuthSessionError (caller map 401).
 */
import { SystemRole } from '@prisma/client';
import { NextRequest } from 'next/server';
import { getAuthUser } from './user';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from './with-db-context';

export interface AuthContext {
  userId: string;
  role: SystemRole;
  /** VENDOR_ADMIN | VENDOR_STAFF có vendorId từ User.vendorId. */
  vendorId?: string;
  /** WORKER có workerId = Worker.id (lookup qua Worker.accountUserId). */
  workerId?: string;
}

/** Lỗi chuẩn hoá — caller map 401. */
export class AuthSessionError extends Error {
  constructor(
    public readonly code: 'NO_TOKEN' | 'INVALID_TOKEN' | 'USER_INACTIVE' | 'USER_NOT_FOUND' | 'INTERNAL',
    message: string,
  ) {
    super(message);
    this.name = 'AuthSessionError';
  }
}

/**
 * Decode JWT thật + lookup User → AuthContext.
 *
 * Quy trình (DEC-04):
 *  1. Lấy token từ cookie/Bearer (user.ts).
 *  2. Verify JWT (jwt.ts — fail-closed, decode + validate SystemRole).
 *  3. Lookup User theo sub (userId) — isActive=false → 401.
 *  4. VENDOR_* → lấy vendorId từ User; WORKER → lookup Worker qua accountUserId.
 *
 * @throws AuthSessionError nếu bất kỳ bước nào fail.
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext> {
  const claims = await getAuthUser(req);
  if (!claims) {
    throw new AuthSessionError('NO_TOKEN', 'Missing or invalid JWT token');
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, role: true, isActive: true, vendorId: true },
  });

  if (!user) {
    throw new AuthSessionError('USER_NOT_FOUND', 'User not found');
  }
  if (!user.isActive) {
    throw new AuthSessionError('USER_INACTIVE', 'User is inactive');
  }

  // Permission claim là advisory — nhưng role thực tế lấy từ DB (không tin claim).
  // Nếu role trong JWT lệch DB → ưu tiên DB (an toàn hơn).
  const role = user.role as SystemRole;

  const ctx: AuthContext = { userId: user.id, role };

  if (user.vendorId) {
    ctx.vendorId = user.vendorId;
  }

  // WORKER → lookup Worker.accountUserId
  if (role === 'WORKER') {
    // SECURITY (RQ-04, DEC-05): NO app-driven ADMIN impersonation. Bootstrap the
    // WORKER's own id under a VERIFIED self-context — set the real transaction-local
    // GUCs (app.user_id = verified sub, app.role = 'WORKER') via withDbContext, so the
    // workers RLS WORKER self-branch (account_user_id = hrp_session_user_id()) admits
    // ONLY the caller's own row. No privilege elevation, no session leak.
    const worker = await withDbContext(prisma, { userId: user.id, role: 'WORKER' }, (tx) =>
      tx.worker.findUnique({
        where: { accountUserId: user.id },
        select: { id: true },
      }),
    );
    if (worker) ctx.workerId = worker.id;
  }

  return ctx;
}

/**
 * Adapter cho test hoặc internal flow không có NextRequest (vd background job).
 * Dùng đã verify JWT claim — KHÔNG nhận role tự khai.
 */
export async function buildAuthContextFromClaims(claims: { sub: string; role: SystemRole }): Promise<AuthContext> {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, role: true, isActive: true, vendorId: true },
  });
  if (!user) throw new AuthSessionError('USER_NOT_FOUND', 'User not found');
  if (!user.isActive) throw new AuthSessionError('USER_INACTIVE', 'User is inactive');

  const ctx: AuthContext = { userId: user.id, role: user.role as SystemRole };
  if (user.vendorId) ctx.vendorId = user.vendorId;
  if (ctx.role === 'WORKER') {
    // SECURITY (RQ-04, DEC-05): verified self-context bootstrap — real transaction-local
    // GUCs (app.user_id + app.role='WORKER'), never ADMIN impersonation. The workers RLS
    // WORKER self-branch admits only the caller's own row.
    const worker = await withDbContext(prisma, { userId: user.id, role: 'WORKER' }, (tx) =>
      tx.worker.findUnique({
        where: { accountUserId: user.id },
        select: { id: true },
      }),
    );
    if (worker) ctx.workerId = worker.id;
  }
  return ctx;
}
