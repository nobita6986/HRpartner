/**
 * rls-context.ts — Phase 2 / RQ-03 / DEC-02
 *
 * Set 4 PostgreSQL GUC (`app.user_id`, `app.role`, `app.vendor_id`, `app.worker_id`)
 * trong transaction bằng `set_config(..., true)` (transaction-local).
 *
 * Quy tắc (DEC-02 + data-scope-security §6.2):
 *   - CHỈ dùng `set_config('app.<key>', value, true)` — is_local = true (transaction-bound).
 *   - CẤM `SET ROLE` — không có lý do chính đáng (RLS policy đọc GUC, không phải role).
 *   - CẤM GUC session-global — bảo đảm không leak qua transaction khác.
 *   - CẤM set_config(..., false) hoặc SET ... TO ... (non-LOCAL).
 *
 * Helper:
 *   - `applyRlsContext(tx, ctx)` — set cả 4 GUC + return tx (chainable).
 *   - `assertRlsContextNotLeaked(prisma)` — assert current_user không phải app_user_writer
 *     mà GUC vẫn còn giá trị (chỉ dùng trong test).
 */
import type { Prisma } from '@prisma/client';
import type { AuthContext } from './auth-context';

/** GUC keys cho session scope — DEC-02. */
export const RLS_GUC_KEYS = {
  userId: 'app.user_id',
  role: 'app.role',
  vendorId: 'app.vendor_id',
  workerId: 'app.worker_id',
} as const;

export type RlsContextKeys = keyof typeof RLS_GUC_KEYS;

/**
 * Apply session scope trong transaction. Phải gọi TRONG `prisma.$transaction(async tx => ...)`.
 *
 * Ví dụ:
 *   await prisma.$transaction(async (tx) => {
 *     await applyRlsContext(tx, ctx);
 *     return tx.worker.findMany();
 *   });
 *
 * SECURITY: bốn `set_config(..., true)` — `true` = is_local = transaction-bound.
 * Khi transaction COMMIT/ROLLBACK, GUC tự động reset về session default.
 *
 * @throws nếu ctx.userId/role thiếu (DENY_BY_DEFAULT)
 */
export async function applyRlsContext(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
): Promise<void> {
  if (!ctx.userId) {
    throw new Error('applyRlsContext: ctx.userId is required');
  }
  if (!ctx.role) {
    throw new Error('applyRlsContext: ctx.role is required');
  }

  // set_config(key, value, is_local). is_local=true → transaction-bound.
  await tx.$executeRawUnsafe(
    `SELECT set_config('${RLS_GUC_KEYS.userId}', $1, true)`,
    ctx.userId,
  );
  await tx.$executeRawUnsafe(
    `SELECT set_config('${RLS_GUC_KEYS.role}', $1, true)`,
    ctx.role,
  );
  await tx.$executeRawUnsafe(
    `SELECT set_config('${RLS_GUC_KEYS.vendorId}', $1, true)`,
    ctx.vendorId ?? '',
  );
  // workerId = ctx.workerId nếu có (cho role WORKER); rỗng cho role khác
  await tx.$executeRawUnsafe(
    `SELECT set_config('${RLS_GUC_KEYS.workerId}', $1, true)`,
    ctx.workerId ?? '',
  );
}

/**
 * Verify (debug/test only) — GUC có giá trị trong transaction hiện tại hay không.
 * Trả object { user_id, role, vendor_id, worker_id }.
 *
 * KHÔNG dùng trong production path — chỉ cho test verify "không leak".
 */
export async function readRlsContext(
  tx: Prisma.TransactionClient,
): Promise<{ user_id: string; role: string; vendor_id: string; worker_id: string }> {
  const rows = await tx.$queryRawUnsafe<Array<{ k: string; v: string | null }>>(
    `SELECT 'user_id' AS k, current_setting('app.user_id', true) AS v
     UNION ALL SELECT 'role', current_setting('app.role', true)
     UNION ALL SELECT 'vendor_id', current_setting('app.vendor_id', true)
     UNION ALL SELECT 'worker_id', current_setting('app.worker_id', true)`,
  );
  const out: Record<string, string> = {};
  for (const r of rows) out[r.k] = r.v ?? '';
  return out as { user_id: string; role: string; vendor_id: string; worker_id: string };
}