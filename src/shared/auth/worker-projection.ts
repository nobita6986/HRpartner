/**
 * worker-projection.ts — V5-M1-09A "current field projection" (RQ-02/03, DEC-04/05).
 *
 * ALLOWLIST DTO (DEC-01): KHÔNG spread raw row. Xây object MỚI từ field-group tường minh
 * khai báo ở `src/shared/projection/manifest.ts` (single source-of-truth). Không blacklist-
 * then-delete → field ngoài allowlist KHÔNG BAO GIỜ lọt ra HTTP.
 *
 * Visibility theo action + effective permission:
 *   - canSeeSensitive = hasSensitivePermission || action === 'SELF_PROFILE' (DEC-05).
 *   - SIX field nhạy cảm (WORKER_SENSITIVE_MASKED_FIELDS): khi !canSeeSensitive → '***'
 *     (nếu có giá trị) / null (nếu trống); real khi canSeeSensitive (giữ RF-02 compat, DEC-04).
 *   - CCCD issued metadata (WORKER_SENSITIVE_ISSUED_FIELDS): real khi canSeeSensitive, else null.
 *   - cccdChipData (WORKER_CHIP_RAW_FIELDS): LUÔN LUÔN omit khỏi HTTP — kể cả self/privileged (DEC-05).
 *
 * Projection KHÔNG throw; deterministic serialization (DEC-13): Date → ISO string / null.
 */
import type { Worker } from '@prisma/client';
import {
  WORKER_SENSITIVE_MASKED_FIELDS,
  WORKER_SENSITIVE_ISSUED_FIELDS,
} from '@/src/shared/projection/manifest';

const MASKED = '***';

/**
 * SIX field nhạy cảm mask theo permission (DEC-04, RF-02 compat).
 * Alias giữ tên cũ để tương thích; NGUỒN = manifest. Lưu ý: `cccdChipData` KHÔNG còn
 * trong nhóm mask — nó bị OMIT tuyệt đối (DEC-05), không phải mask '***'.
 */
export const WORKER_SENSITIVE_FIELDS = WORKER_SENSITIVE_MASKED_FIELDS;
export type WorkerSensitiveField = (typeof WORKER_SENSITIVE_MASKED_FIELDS)[number];

/** Action context điều khiển self-rule (DEC-05). */
export type WorkerProjectionAction = 'LIST' | 'DETAIL' | 'SELF_PROFILE';

export interface WorkerProjectionContext {
  hasSensitivePermission: boolean;
  action: WorkerProjectionAction;
}

/** DTO ổn định — shape KHÔNG phụ thuộc field nào có mặt trong row. cccdChipData KHÔNG có key. */
export interface ProjectedWorker {
  id: string | null;
  userId: string | null;
  fullName: string | null;
  profileStatus: string | null;
  employmentStatus: string | null;
  riskStatus: string | null;
  nationality: string | null;
  ownerId: string | null;
  assignedToId: string | null;
  accountUserId: string | null;
  managerId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  maritalStatus: string | null;
  permanentAddress: string | null;
  currentAddress: string | null;
  hometown: string | null;
  ethnicGroup: string | null;
  religion: string | null;
  taxCode: string | null;
  insuranceCode: string | null;
  cccdNumber: string | null;
  cccdImageUrl: string | null;
  selfieImageUrl: string | null;
  bankAccount: string | null;
  bankName: string | null;
  bankBranch: string | null;
  cccdIssuedDate: string | null;
  cccdIssuedPlace: string | null;
  cccdExpiryDate: string | null;
}

function serializeDate(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function str(v: unknown): string | null {
  return v == null ? null : String(v);
}

/** Mask SIX: '***' khi có giá trị, null khi trống (không leak "có giá trị nhưng bị che" khác biệt). */
function maskSensitive(v: unknown): string | null {
  return v == null ? null : MASKED;
}

/**
 * Project một Worker row theo allowlist DTO + action/permission. Trả object MỚI.
 * @param worker — Worker record (raw Prisma / partial fixture).
 * @param context — { hasSensitivePermission, action }.
 */
export function projectWorker<T extends Partial<Worker>>(
  worker: T,
  context: WorkerProjectionContext,
): ProjectedWorker {
  const w = worker as Partial<Worker>;
  const canSeeSensitive = context.hasSensitivePermission || context.action === 'SELF_PROFILE';

  return {
    // ── WORKER_CORE ──
    id: str(w.id),
    userId: str(w.userId),
    fullName: str(w.fullName),
    profileStatus: str(w.profileStatus),
    employmentStatus: str(w.employmentStatus),
    riskStatus: str(w.riskStatus),
    nationality: str(w.nationality),
    ownerId: str(w.ownerId),
    assignedToId: str(w.assignedToId),
    accountUserId: str(w.accountUserId),
    managerId: str(w.managerId),
    createdAt: serializeDate(w.createdAt),
    updatedAt: serializeDate(w.updatedAt),
    // ── WORKER_CONTACT ──
    phone: str(w.phone),
    dateOfBirth: serializeDate(w.dateOfBirth),
    gender: str(w.gender),
    maritalStatus: str(w.maritalStatus),
    permanentAddress: str(w.permanentAddress),
    currentAddress: str(w.currentAddress),
    hometown: str(w.hometown),
    ethnicGroup: str(w.ethnicGroup),
    religion: str(w.religion),
    taxCode: str(w.taxCode),
    insuranceCode: str(w.insuranceCode),
    // ── WORKER_SENSITIVE_MASKED (SIX) — real khi canSee, else '***'/null ──
    cccdNumber: canSeeSensitive ? str(w.cccdNumber) : maskSensitive(w.cccdNumber),
    cccdImageUrl: canSeeSensitive ? str(w.cccdImageUrl) : maskSensitive(w.cccdImageUrl),
    selfieImageUrl: canSeeSensitive ? str(w.selfieImageUrl) : maskSensitive(w.selfieImageUrl),
    bankAccount: canSeeSensitive ? str(w.bankAccount) : maskSensitive(w.bankAccount),
    bankName: canSeeSensitive ? str(w.bankName) : maskSensitive(w.bankName),
    bankBranch: canSeeSensitive ? str(w.bankBranch) : maskSensitive(w.bankBranch),
    // ── WORKER_SENSITIVE_ISSUED — real khi canSee, else null ──
    cccdIssuedDate: canSeeSensitive ? serializeDate(w.cccdIssuedDate) : null,
    cccdIssuedPlace: canSeeSensitive ? str(w.cccdIssuedPlace) : null,
    cccdExpiryDate: canSeeSensitive ? serializeDate(w.cccdExpiryDate) : null,
    // ── WORKER_CHIP_RAW (cccdChipData) — LUÔN omit (DEC-05): không có key trong DTO ──
  };
}

/** Project list Workers (self-rule không áp cho list — chỉ LIST/DETAIL privileged). */
export function projectWorkerList<T extends Partial<Worker>>(
  workers: T[],
  context: WorkerProjectionContext,
): ProjectedWorker[] {
  return workers.map((w) => projectWorker(w, context));
}

/** Số field masked (SIX) — tiện cho test coverage. */
export const WORKER_MASKED_FIELD_COUNT = WORKER_SENSITIVE_MASKED_FIELDS.length;
/** Số field issued gated — tiện cho test coverage. */
export const WORKER_ISSUED_FIELD_COUNT = WORKER_SENSITIVE_ISSUED_FIELDS.length;
