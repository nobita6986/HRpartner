/**
 * with-system-db.ts — V5-M1-06b / RQ-09 / DEC-10
 *
 * BOUNDARY cho tiến trình HỆ THỐNG (cron, self check-in) — nơi KHÔNG có
 * người dùng đăng nhập (không `getAuthContext`) nhưng vẫn phải chạy qua một
 * context ổn định, transaction-local, KHÔNG bao giờ dùng raw client rỗng GUC.
 *
 * Vì sao L2-only (không L1 extension):
 *   - Cron auto-confirm dùng `update({ where: { id } })` (WhereUniqueInput) và
 *     check-in dùng `create(...)` — cả hai VỠ nếu đi qua L1 (extension inject
 *     `where`/`AND` — DEC-03). Do đó system boundary chỉ set L2 GUC; phạm vi
 *     được khoá bằng `where` suy ra từ SERVER ở callsite (không nhận từ client).
 *
 * Vì sao role = ADMIN trong GUC:
 *   - Đây là "mức đặc quyền hệ thống" để RLS policy cho phép thao tác nền:
 *       • attendance_events WITH CHECK ⊇ {ADMIN,HR_MANAGER,HR_STAFF} (check-in).
 *       • vendor_statements / client_statements WITH CHECK ⊇ {ADMIN,...} (cron).
 *       • outbox_events / audit_logs: KHÔNG bật RLS → mọi context ghi được.
 *   - GUC `app.role` (mức đặc quyền cho RLS) TÁCH BIỆT với DANH TÍNH AUDIT: cron
 *     ghi audit với actor cố định `{ id:'system:cron', role:'SYSTEM' }` ở service
 *     layer (writeAuditLog) — KHÔNG mạo danh một user thật. Đây KHÔNG phải
 *     impersonation: `app.user_id` là danh tính hệ thống ổn định (`system:*`),
 *     không phải id người dùng nào.
 *
 * Giới hạn có chủ đích: một DB role 'SYSTEM' chuyên biệt (least-privilege thật)
 * cần policy RLS mới ⇒ MIGRATION ⇒ ngoài scope M1-06b (DEC-12). Ở đây dùng mức
 * ADMIN + danh tính `system:*` cố định, đúng pattern elevation sẵn có trong
 * auth-bootstrap; đã ghi rõ trong HANDOFF để Tier 3/Planner soi.
 */
import type { PrismaClient } from '@prisma/client';
import type { AuthContext } from './auth-context';
import { applyRlsContext } from './rls-context';
import type { DbContextCallback } from './with-db-context';

/** Mục đích của tiến trình hệ thống — chỉ để nhãn/telemetry, không đổi hành vi. */
export type SystemPurpose = 'CRON' | 'CHECKIN';

/**
 * Danh tính hệ thống ổn định. `userId` là id `system:*` (KHÔNG phải user thật);
 * `role` là mức đặc quyền RLS. Chỉ những hằng số dưới đây được phép — không nhận
 * principal tuỳ ý từ caller để tránh mở rộng đặc quyền ngoài ý muốn.
 */
export interface SystemPrincipal {
  readonly userId: string;
  readonly role: 'ADMIN';
  readonly purpose: SystemPurpose;
}

/** Cron nền (outbox drain, dispute auto-confirm). Audit actor riêng ở service. */
export const SYSTEM_CRON: SystemPrincipal = {
  userId: 'system:cron',
  role: 'ADMIN',
  purpose: 'CRON',
};

/** Self check-in — attendance INSERT hẹp (RLS WITH CHECK loại WORKER). */
export const SYSTEM_CHECKIN: SystemPrincipal = {
  userId: 'system:checkin',
  role: 'ADMIN',
  purpose: 'CHECKIN',
};

/**
 * Chạy callback trong transaction đã set L2 GUC theo danh tính hệ thống.
 * KHÔNG áp L1. Phạm vi thao tác PHẢI được khoá bằng `where` suy ra từ server
 * bên trong `cb` (ví dụ `workerId: ctx.workerId`). Throw → rollback.
 *
 * @param prisma — PrismaClient raw (thường `getPrisma()`).
 * @param principal — một trong `SYSTEM_CRON` | `SYSTEM_CHECKIN`.
 * @param cb — business op; nhận transaction client đã set GUC.
 */
export async function withSystemDb<T>(
  prisma: PrismaClient,
  principal: SystemPrincipal,
  cb: DbContextCallback<T>,
): Promise<T> {
  const ctx: AuthContext = { userId: principal.userId, role: principal.role };
  return prisma.$transaction(async (tx) => {
    await applyRlsContext(tx, ctx);
    return cb(tx);
  });
}
