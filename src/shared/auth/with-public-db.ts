/**
 * with-public-db.ts — V5-go-live-04 / RQ-03, RQ-04, RQ-05 / DEC-01, DEC-02, DEC-03, DEC-08.
 *
 * ĐÚNG MỘT đường đọc DB cho khách vô danh (không cookie, không session). Trước task này
 * ba call site công khai gọi `prisma.$transaction` TRẦN nên không GUC nào được set:
 * `hrp_session_role()` trả NULL ⇒ mọi nhánh của `hrp_project_visible_for` so sánh với
 * NULL ⇒ predicate NULL ⇒ 3 bảng FORCE RLS (`outsourcing_projects`, `staffing_orders`,
 * `staffing_order_slots`) trả 0 dòng. Triệu chứng: `/api/jobs` = `total 0`, `/api/jobs/{slug}` = 404.
 *
 * Nguyên tắc (DEC-08): CẤM rải `set_config` hay `applyRlsContext` lẻ trong route/page/service.
 * Mọi đường đọc vô danh đi qua đúng hàm này.
 *
 * SECURITY:
 *   - `role: 'MKT'` và CHỈ 'MKT'. Nhánh MKT của `hrp_project_visible_for` đúng bằng
 *     "chỉ dự án `is_public`". CẤM mức quản trị (DEC-02): role đó khớp nhánh ĐẦU TIÊN của
 *     function nên khách vô danh sẽ thấy TOÀN BỘ dự án, kể cả dự án chưa publish.
 *   - `userId` là hằng dạng `system:` — mức đặc quyền RLS, KHÔNG phải identity audit.
 *   - Transaction READ-ONLY ở mức Postgres (DEC-03): 3 policy trên là `FOR ALL` và Postgres
 *     CHỈ xét `USING` cho DELETE, nên mở tầm nhìn là mở luôn quyền DELETE trên đúng những
 *     dòng public. Read-only chặn lỗ đó tại chỗ; lệnh ghi phát ra trong đây bị từ chối
 *     bằng SQLSTATE 25006.
 *   - Read-only đặt bằng `set_config('transaction_read_only', 'on', true)` là câu ĐẦU TIÊN:
 *     transaction-local như 4 GUC kia, và không mắc bẫy thứ tự của `SET TRANSACTION READ ONLY`
 *     (chỉ hợp lệ trước truy vấn đầu tiên, chạy sau sẽ lỗi 25001).
 *   - KHÔNG try/catch. Lỗi set GUC hoặc set read-only phải NỔI LÊN. Chính chế độ
 *     hỏng-thành-rỗng-im-lặng là lý do defect này sống sót qua mọi gate trước đó.
 */
import type { PrismaClient } from '@prisma/client';
import type { AuthContext } from './auth-context';
import { applyRlsContext } from './rls-context';
import type { DbContextCallback } from './with-db-context';

/** GUC bật read-only cho đúng transaction hiện tại (is_local = true). */
export const PUBLIC_READ_ONLY_GUC = 'transaction_read_only';

/**
 * Principal cố định của bề mặt công khai. KHÔNG tái dùng `SystemPrincipal` của
 * `with-system-db.ts`: field `role` ở đó là literal mức quản trị, nới ra là mở đường cho
 * mức đó lọt vào đường đọc vô danh (DEC-02). Chuỗi mức quản trị KHÔNG xuất hiện trong file
 * này, kể cả trong chú thích — `AC-05` đo bằng grep thô, không strip comment.
 */
export interface PublicReadPrincipal {
  readonly userId: string;
  readonly role: 'MKT';
  readonly purpose: 'PUBLIC_JOB_BOARD_READ';
}

export const PUBLIC_READ_PRINCIPAL: PublicReadPrincipal = {
  userId: 'system:public-job-board-read',
  role: 'MKT',
  purpose: 'PUBLIC_JOB_BOARD_READ',
} as const;

/**
 * Mở transaction READ-ONLY dưới principal công khai rồi trao `tx` cho callback.
 *
 * Không nhận principal từ ngoài — chỉ có một mức đặc quyền cho bề mặt vô danh.
 *
 * @throws lỗi thật của Postgres/Prisma khi không set được read-only hoặc GUC.
 */
export async function withPublicDb<T>(
  prisma: PrismaClient,
  cb: DbContextCallback<T>,
): Promise<T> {
  const ctx: AuthContext = {
    userId: PUBLIC_READ_PRINCIPAL.userId,
    role: PUBLIC_READ_PRINCIPAL.role,
  };
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('${PUBLIC_READ_ONLY_GUC}', 'on', true)`);
    await applyRlsContext(tx, ctx);
    return cb(tx);
  });
}
