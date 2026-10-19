/**
 * preauth-db.ts — V5-M1-06d / RQ-08 / STEP-08 / DEC-13 + public registration.
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
 * Chỉ dùng cho login lookup và public registration; mọi truy cập DB đã-xác-thực phải đi qua withDbContext/withAuthorizedDb.
 */
import { Prisma, SystemRole, type PrismaClient } from '@prisma/client';
import { normalizePhone } from '@/src/domains/applications/apply-helpers';
import { hashPassword } from './password';

/**
 * Projection cố định cho login — không mở rộng nếu không có yêu cầu contract mới.
 * T1A Android contract (TASK DEC-02): thêm `name` + `phone` cho user summary JSON
 * trong response /api/auth/login (mobile client dựng profile card ngay sau login).
 */
export interface PreAuthLoginUser {
  id: string;
  role: SystemRole;
  name: string | null;
  phone: string | null;
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
      select: { id: true, role: true, isActive: true, passwordHash: true, name: true, phone: true },
    });
  });
}

export class PublicRegistrationError extends Error {
  readonly code = 'PHONE_TAKEN';
  constructor() {
    super('Không thể tạo tài khoản với thông tin này. Nếu đã có tài khoản, vui lòng đăng nhập.');
    this.name = 'PublicRegistrationError';
  }
}

/** Public phone signup: serialize by canonical phone; the expression unique index is the final race guard. */
export async function createUnverifiedWorkerAccount(
  prisma: PrismaClient,
  input: { phone: string; fullName: string; password: string },
) {
  const normalizedPhone = normalizePhone(input.phone);
  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.role', 'ADMIN', true)`;
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${normalizedPhone}, 0))`);

    const duplicate = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM public.users
      WHERE hrp_normalize_phone(phone) = hrp_normalize_phone(${input.phone})
      LIMIT 1
    `);
    if (duplicate.length) throw new PublicRegistrationError();

    return tx.user.create({
      data: {
        phone: normalizedPhone,
        name: input.fullName.trim(),
        passwordHash,
        role: SystemRole.WORKER,
        phoneVerified: false,
        phoneVerifiedAt: null,
        isActive: true,
      },
      select: { id: true, phone: true, name: true, role: true, phoneVerified: true },
    });
  });
}
