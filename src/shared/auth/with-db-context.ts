/**
 * with-db-context.ts — Phase 2 / RQ-03
 *
 * Transaction helper: tạo Prisma transaction đã set GUC theo AuthContext.
 *
 * Quy tắc (DEC-02 + data-scope-security §6.2):
 *   - Mọi DB operation trong context (L1+L2) phải qua transaction đã set GUC.
 *   - Không dùng pool connection rỗi (session GUC) — luôn transaction-local.
 *   - Không set GUC ngoài transaction.
 *
 * Pattern sử dụng:
 *
 *   const ctx = await getAuthContext();
 *   const result = await withDbContext(prisma, ctx, async (tx) => {
 *     return tx.worker.findMany(); // L2 RLS tự scope theo GUC
 *   });
 *
 * Lưu ý: L1 (withAuthScope) vẫn inject where-clause — L1 + L2 cùng pass.
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import type { AuthContext } from './auth-context';
import { applyRlsContext } from './rls-context';

export type DbContextCallback<T> = (tx: Prisma.TransactionClient) => Promise<T>;

/**
 * Chạy callback trong transaction đã apply RLS context.
 * Auto-commit nếu callback return; auto-rollback nếu throw.
 *
 * @param prisma — PrismaClient instance (thường từ getPrisma()).
 * @param ctx — AuthContext đã verify bởi getAuthContext.
 * @param cb — callback nhận transaction client, throw để rollback.
 */
export async function withDbContext<T>(
  prisma: PrismaClient,
  ctx: AuthContext,
  cb: DbContextCallback<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await applyRlsContext(tx, ctx);
    return cb(tx);
  });
}

/**
 * Variant cho read-only query (Phase 2 chưa enforce READ ONLY — Postgres
 * vẫn cho phép read trong transaction write-mode).
 *
 * Tương đương withDbContext — Phase 2 đơn giản hoá, Phase 3+ sẽ enforce
 * SET TRANSACTION READ ONLY nếu cần.
 */
export async function withDbContextReadOnly<T>(
  prisma: PrismaClient,
  ctx: AuthContext,
  cb: DbContextCallback<T>,
): Promise<T> {
  return withDbContext(prisma, ctx, cb);
}