/**
 * worker-dedup.repository.ts — V5-M1-06b / RQ-06 / DEC-05.
 *
 * Repo ĐẶC QUYỀN HẸP: probe trùng SĐT trên TOÀN BỘ worker (vượt tầm nhìn vendor)
 * qua boundary hệ thống `SYSTEM_DEDUP` (L2 GUC role=ADMIN → RLS `workers` cho đọc).
 *
 * DEC-05 — KẾT QUẢ OPAQUE: chỉ trả `{ duplicate, activeConflict, workerId }`. Không
 * trả tên/CCCD/SĐT/trạng thái tuyển dụng thô. `workerId` CHỈ dùng phía server
 * (lưu `dedupWorkerId` để HR queue liên kết) — route KHÔNG được trả nó cho vendor.
 */
import type { PrismaClient } from '@prisma/client';
import { withSystemDb, SYSTEM_DEDUP } from '@/src/shared/auth/with-system-db';

export interface WorkerDedupResult {
  /** Có worker trùng SĐT hay không. */
  duplicate: boolean;
  /** Worker trùng đang ACTIVE → chặn submission (opaque, không lộ danh tính). */
  activeConflict: boolean;
  /** ID worker trùng — CHỈ dùng phía server, KHÔNG trả cho client. */
  workerId: string | null;
}

/**
 * Probe trùng SĐT. Đọc tối thiểu (`id`, `employmentStatus`) qua boundary đặc quyền.
 * Trả opaque outcome; không rò rỉ PII.
 */
export async function probeWorkerDuplicateByPhone(
  prisma: PrismaClient,
  phone: string,
): Promise<WorkerDedupResult> {
  return withSystemDb(prisma, SYSTEM_DEDUP, async (tx) => {
    const worker = await tx.worker.findFirst({
      where: { phone },
      select: { id: true, employmentStatus: true },
    });
    if (!worker) {
      return { duplicate: false, activeConflict: false, workerId: null };
    }
    return {
      duplicate: true,
      activeConflict: worker.employmentStatus === 'ACTIVE',
      workerId: worker.id,
    };
  });
}
