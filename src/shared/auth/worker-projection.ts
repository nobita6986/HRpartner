/**
 * worker-projection.ts — Phase 2 / RQ-05 / DEC-05
 *
 * Worker field masking — che 7 trường nhạy cảm thành `***` nếu thiếu
 * permission `CAN_VIEW_WORKER_SENSITIVE`.
 *
 * 7 trường nhạy cảm (DEC-05):
 *   - cccdNumber
 *   - cccdImageUrl
 *   - selfieImageUrl
 *   - cccdChipData
 *   - bankAccount
 *   - bankName
 *   - bankBranch
 *
 * Lưu ý:
 *   - Permission check: truyền `hasSensitivePermission: boolean` từ caller
 *     (đã query từ permission-resolver + AuthContext).
 *   - Projection KHÔNG throw — return object đã mask.
 *   - Projection giữ nguyên structure của Worker record (kể cả null fields).
 *   - Source-of-truth cho mask = field name (literal key).
 */
import type { Worker } from '@prisma/client';

const MASKED = '***';

/** 7 trường nhạy cảm — DEC-05. */
export const WORKER_SENSITIVE_FIELDS = [
  'cccdNumber',
  'cccdImageUrl',
  'selfieImageUrl',
  'cccdChipData',
  'bankAccount',
  'bankName',
  'bankBranch',
] as const;

export type WorkerSensitiveField = (typeof WORKER_SENSITIVE_FIELDS)[number];

/**
 * Project một Worker row theo permission. Trả object mới — KHÔNG mutate input.
 *
 * @param worker — Worker record (raw từ Prisma).
 * @param hasSensitivePermission — true nếu session có CAN_VIEW_WORKER_SENSITIVE.
 * @returns Worker object đã mask (các trường nhạy cảm = '***' hoặc giữ nguyên).
 */
export function projectWorker<T extends Partial<Worker>>(
  worker: T,
  hasSensitivePermission: boolean,
): T {
  const out = { ...worker };

  if (!hasSensitivePermission) {
    for (const f of WORKER_SENSITIVE_FIELDS) {
      // Chỉ mask khi giá trị hiện không phải null (mask `***` thay vì null)
      if ((out as any)[f] !== null && (out as any)[f] !== undefined) {
        (out as any)[f] = MASKED;
      }
      // Nếu đã null thì giữ null (không leak info "có giá trị nhưng bị che")
    }
  }

  return out;
}

/**
 * Project một list Workers. Wrapper cho array — Phase 2 không phân trang, chỉ map.
 */
export function projectWorkerList<T extends Partial<Worker>>(
  workers: T[],
  hasSensitivePermission: boolean,
): T[] {
  return workers.map((w) => projectWorker(w, hasSensitivePermission));
}