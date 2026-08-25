/**
 * with-authorized-db.ts — V5-M1-06a / RQ-02 / DEC-02 / DEC-03
 *
 * BOUNDARY CANONICAL cho request nghiệp vụ: hợp nhất L1 (scope) + L2 (RLS GUC)
 * trong ĐÚNG MỘT transaction. Đây là điểm vào chuẩn để route admin/CTV chạy
 * business query — thay cho việc gọi thẳng `getPrisma()` (raw client).
 *
 * Thứ tự áp dụng (DEC-02):
 *   verified AuthContext  →  L1 `withAuthScope(ctx)` (Prisma extension inject WHERE)
 *   →  $transaction  →  L2 `applyRlsContext(tx, ctx)` (4 GUC transaction-local)
 *   →  callback business query.
 *
 * Vì sao an toàn (defense-in-depth):
 *   - L1 chặn ở tầng ORM: non-root role không có builder → DENY_BY_DEFAULT; có builder
 *     → inject `WHERE AND [caller, scope]`. Root role passthrough.
 *   - L2 chặn ở tầng DB: RLS policy đọc GUC (`app.user_id`/`app.role`/...). Nếu L1 bị
 *     bypass (vd bug), L2 vẫn backstop tại Postgres.
 *   - `applyRlsContext` dùng `$executeRawUnsafe` — KHÔNG phải model op nên KHÔNG bị L1
 *     extension can thiệp; GUC set bình thường bên trong client đã `$extends`.
 *
 * Rollback (RQ-02): callback throw → `$transaction` tự ROLLBACK, GUC transaction-local
 * tự reset. Không auto-retry mutation (DEC-09 / §4.3).
 *
 * GIỚI HẠN QUAN TRỌNG (DEC-03):
 *   - L1 inject `where` cho CẢ write-ops. Prisma `create`/`createMany` KHÔNG nhận `where`
 *     → dùng boundary này cho `create` trên model có builder sẽ VỠ. Vì vậy:
 *       • READ (findMany/findFirst/count/aggregate/...) trên model có builder → dùng
 *         `withAuthorizedDb` (L1+L2).
 *       • WRITE mà L1 không scope an toàn (đặc biệt `create`) → dùng `withDbContext`
 *         (L2-only) + ownership suy ra từ server (`ctx.userId`), CẤM tạo `where` giả.
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import type { AuthContext } from './auth-context';
import { withAuthScope } from './with-auth-scope';
import { applyRlsContext } from './rls-context';
import type { DbContextCallback } from './with-db-context';

/**
 * Chạy callback trong transaction đã áp CẢ L1 (scope extension) VÀ L2 (RLS GUC).
 *
 * @param prisma — PrismaClient raw (chỉ để compose boundary; KHÔNG query trực tiếp).
 * @param ctx — AuthContext đã verify bởi getAuthContext (bắt buộc userId + role).
 * @param cb — business query; nhận transaction client đã scope. Throw → rollback.
 *
 * Cách dùng (read path):
 *   const rows = await withAuthorizedDb(getPrisma(), ctx, (tx) =>
 *     tx.sourceClaim.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
 *   );
 *   // L1 tự inject WHERE { ctvId: ctx.userId }; L2 set GUC; RLS backstop.
 */
export async function withAuthorizedDb<T>(
  prisma: PrismaClient,
  ctx: AuthContext,
  cb: DbContextCallback<T>,
): Promise<T> {
  // L1 — extension scope. `withAuthScope` tự throw INTERNAL nếu ctx thiếu userId/role.
  const scoped = prisma.$extends(withAuthScope(ctx));

  // interactive transaction trên client đã $extends → model op trên `tx` VẪN qua L1.
  return scoped.$transaction(async (tx) => {
    // L2 — set 4 GUC transaction-local. Raw op nên không bị L1 can thiệp.
    await applyRlsContext(tx as unknown as Prisma.TransactionClient, ctx);
    // callback thấy tx "bình thường" nhưng L1 vẫn âm thầm enforce ở runtime.
    return cb(tx as unknown as Prisma.TransactionClient);
  });
}

/**
 * Variant read-only rõ nghĩa (Phase 2 chưa enforce SET TRANSACTION READ ONLY — giữ
 * tương đương `withAuthorizedDb` để callsite đọc tự tài liệu hoá ý định).
 */
export async function withAuthorizedDbReadOnly<T>(
  prisma: PrismaClient,
  ctx: AuthContext,
  cb: DbContextCallback<T>,
): Promise<T> {
  return withAuthorizedDb(prisma, ctx, cb);
}
