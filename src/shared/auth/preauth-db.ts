/**
 * preauth-db.ts — V5-M1-06d / RQ-08 / STEP-08 / DEC-13.
 *
 * PREAUTH_DB: đọc User cho login khi route CHƯA có AuthContext (login là entry-point,
 * getAuthContext cần token hợp lệ → bất khả thi). Đóng gói cơ chế raw pre-auth vào MỘT
 * helper có tên, KHÔNG để route tự viết `$transaction` + `set_config` tuỳ tiện (route-level
 * raw transaction/GUC KHÔNG nằm allowlist — static gate bắt).
 *
 *   - Bootstrap GUC `app.role='ADMIN'` transaction-local (`is_local=true` → reset sau
 *     commit), mirror `getAuthContext` bootstrap, để đọc qua RLS khi chưa có actor.
 *   - Projection CỐ ĐỊNH (chỉ field login cần) — KHÔNG select toàn bộ User (tránh kéo PII
 *     thừa ra khỏi DB). KHÔNG log giá trị nào.
 *
 * CHỈ dùng cho login. Mọi truy cập DB đã-xác-thực phải đi qua withDbContext/withAuthorizedDb.
 */
import type { PrismaClient, SystemRole } from '@prisma/client';

/** Projection cố định cho login — không mở rộng nếu không có yêu cầu contract mới. */
export interface PreAuthLoginUser {
  id: string;
  role: SystemRole;
  isActive: boolean;
  passwordHash: string | null;
}

export async function findUserForLogin(
  prisma: PrismaClient,
  phone: string,
): Promise<PreAuthLoginUser | null> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.role', 'ADMIN', true)`;
    return tx.user.findFirst({
      where: { phone },
      select: { id: true, role: true, isActive: true, passwordHash: true },
    });
  });
}
