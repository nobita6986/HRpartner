/**
 * worker.types.ts — V5-M1-09A-era Worker surface types (T1B Pre-P2 hotfix).
 *
 * AUTHORITY: Workforce domain (T1B `hrp-t1b-pre-p2-worker-management-hotfix`).
 * Worker là canonical employee; LaborProfile là intake (PR #82 / #107 separation).
 * Ta KHÔNG tạo second conversion authority — `linkLaborProfileWorker` (PR #107)
 * giữ nguyên. Worker create flow nằm ở:
 *   - POST /api/workers (legacy) — T0 chỉ định giữ nhưng không UI-call.
 *   - Conversion từ CandidateSubmission (PR #107) — authority thật.
 *
 * Mọi type ở đây là surface contract, KHÔNG phải schema. Validation tại route
 * (Zod) + service (mask check); runtime guard tại `worker.service.ts`.
 */
import type { Prisma } from '@prisma/client';

/** 4 employment-status enum canonical theo schema `workers.employment_status`. */
export const WORKER_EMPLOYMENT_STATUS_VALUES = [
  'NONE',
  'ACTIVE',
  'SUSPENDED',
  'TERMINATED',
] as const;
export type WorkerEmploymentStatusValue = (typeof WORKER_EMPLOYMENT_STATUS_VALUES)[number];

/** 3 profile-status enum canonical. */
export const WORKER_PROFILE_STATUS_VALUES = [
  'INCOMPLETE',
  'PENDING_VERIFY',
  'VERIFIED',
  'REJECTED',
] as const;
export type WorkerProfileStatusValue = (typeof WORKER_PROFILE_STATUS_VALUES)[number];

/** 3 risk-status enum canonical. */
export const WORKER_RISK_STATUS_VALUES = ['NORMAL', 'REVIEW', 'BLOCKED'] as const;
export type WorkerRiskStatusValue = (typeof WORKER_RISK_STATUS_VALUES)[number];

/** Tên bảng có FK trỏ về `workers.id` (dùng cho dependency sweep khi DELETE). */
export type WorkerDependencyKind =
  | 'LABOR_PROFILE'
  | 'EMPLOYMENT_EPISODE'
  | 'PROJECT_ASSIGNMENT'
  | 'TICKET'
  | 'DEPENDENT'
  | 'ATTENDANCE_EVENT'
  | 'TIMESHEET_LINE'
  | 'TIMESHEET_ADJUSTMENT'
  | 'WORKER_DEDUCTION'
  | 'VENDOR_STATEMENT_LINE'
  | 'CLIENT_STATEMENT_LINE'
  | 'COMMISSION_LEDGER'
  | 'SOURCE_CLAIM'
  | 'CANDIDATE_SUBMISSION'
  | 'CANDIDATE_SUBMISSION_MERGED';

/**
 * Field-group allowlist cho PATCH. KHÔNG bao gồm `userId`, `accountUserId`,
 * `workerId`, `id` (id lấy từ URL) — đó là authority khác, route layer reject
 * qua Zod `.strict()`.
 *
 * DEC-W7: gồm 26 field mở rộng so với PUT cũ (chỉ 5 field). PUT cũ giữ
 * backward-compat; PATCH route xài allowlist này.
 */
export interface WorkerEditableFields {
  // ── WORKER_CONTACT (4-12) ──
  fullName?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null; // ISO date YYYY-MM-DD; null = clear
  gender?: string | null;
  maritalStatus?: string | null;
  permanentAddress?: string | null;
  currentAddress?: string | null;
  hometown?: string | null;
  ethnicGroup?: string | null;
  religion?: string | null;
  nationality?: string | null;
  // ── WORKER_SENSITIVE_MASKED + ISSUED (DEC-W7: 9 field) ──
  cccdNumber?: string | null;
  cccdImageUrl?: string | null;
  selfieImageUrl?: string | null;
  cccdIssuedDate?: string | null;
  cccdIssuedPlace?: string | null;
  cccdExpiryDate?: string | null;
  taxCode?: string | null;
  insuranceCode?: string | null;
  // ── WORKER_BANK (3 field) ──
  bankAccount?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  // ── STATE MACHINE (3 field) ──
  profileStatus?: WorkerProfileStatusValue;
  employmentStatus?: WorkerEmploymentStatusValue;
  riskStatus?: WorkerRiskStatusValue;
  // ── OWNERSHIP (3 field; ADMIN-only writer authority) ──
  ownerId?: string | null;
  assignedToId?: string | null;
  managerId?: string | null;
}

/** 3 field KHÔNG được phép xuất hiện trong PATCH body (Zod strict). */
export const WORKER_FORBIDDEN_PATCH_FIELDS = ['userId', 'accountUserId', 'workerId', 'id'] as const;

/**
 * 6 field sensitive mask theo `WORKER_SENSITIVE_MASKED_FIELDS` (manifest).
 * Route layer check `canSeeSensitive` trước khi cho phép ghi.
 */
export const WORKER_SENSITIVE_MASKED_FIELD_NAMES = [
  'cccdNumber',
  'cccdImageUrl',
  'selfieImageUrl',
  'bankAccount',
  'bankName',
  'bankBranch',
] as const;

/** 3 field CCCD issued metadata; route layer check `canSeeSensitive`. */
export const WORKER_SENSITIVE_ISSUED_FIELD_NAMES = [
  'cccdIssuedDate',
  'cccdIssuedPlace',
  'cccdExpiryDate',
] as const;

/** Tất cả sensitive fields = 9 (masked + issued). */
export const WORKER_ALL_SENSITIVE_FIELD_NAMES = [
  ...WORKER_SENSITIVE_MASKED_FIELD_NAMES,
  ...WORKER_SENSITIVE_ISSUED_FIELD_NAMES,
] as const;

/** 3 ownership field; chỉ ADMIN được sửa. */
export const WORKER_OWNERSHIP_FIELD_NAMES = ['ownerId', 'assignedToId', 'managerId'] as const;

/**
 * Input cho `updateWorkerProfile`. Spread `WorkerEditableFields` + audit context.
 * `actorId` để ghi audit log; `expectedUpdatedAt` optional cho CAS optimistic.
 */
export interface UpdateWorkerProfileInput extends WorkerEditableFields {
  actorId: string;
  /** Optional: optimistic CAS — tránh ghi đè concurrent edit. */
  expectedUpdatedAt?: Date | null;
}

/** Result của `updateWorkerProfile`. */
export interface UpdateWorkerProfileResult {
  id: string;
  updatedAt: Date;
  /** Sensitive field đã được write (echo cho response; client tự mask tiếp). */
  updatedFields: string[];
}

/** Result của `deleteWorker` — id + audit summary. */
export interface DeleteWorkerResult {
  id: string;
  userId: string;
  fullName: string | null;
  deletedAt: Date;
  /** Audit reference để caller log nếu cần. */
  auditId: string;
}

/** Detail DTO trả về từ `getWorkerDetail` (projected; caller mask nếu cần). */
export interface WorkerDetailRow {
  id: string;
  userId: string;
  fullName: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  maritalStatus: string | null;
  permanentAddress: string | null;
  currentAddress: string | null;
  hometown: string | null;
  ethnicGroup: string | null;
  religion: string | null;
  nationality: string;
  cccdNumber: string | null;
  cccdImageUrl: string | null;
  selfieImageUrl: string | null;
  cccdIssuedDate: Date | null;
  cccdIssuedPlace: string | null;
  cccdExpiryDate: Date | null;
  taxCode: string | null;
  insuranceCode: string | null;
  bankAccount: string | null;
  bankName: string | null;
  bankBranch: string | null;
  profileStatus: string;
  employmentStatus: string;
  riskStatus: string;
  ownerId: string | null;
  assignedToId: string | null;
  accountUserId: string | null;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Liên kết LaborProfile (0..1) — null nếu Worker chưa được gắn LaborProfile. */
  laborProfile: { id: string; fullName: string | null; phone: string | null } | null;
  /** ProjectAssignment hiện tại + project.code (rỗng = orphan). */
  assignments: Array<{
    id: string;
    status: string;
    projectId: string;
    projectCode: string | null;
    projectName: string | null;
  }>;
  /** Episodes lịch sử. */
  episodes: Array<{
    id: string;
    status: string;
    startedAt: Date;
    endedAt: Date | null;
  }>;
  /** Owner / assignedTo / manager — tên user (nếu có). */
  owner: { id: string; name: string | null } | null;
  assignedTo: { id: string; name: string | null } | null;
  manager: { id: string; name: string | null } | null;
}

/** Snapshot trả về từ `deleteWorker`'s pre-flight check (read-only). */
export interface WorkerDependencySnapshot {
  workerId: string;
  facts: WorkerDependencyKind[];
}

/** Input cho `deleteWorker` — service-level guard, route chỉ pass-through. */
export interface DeleteWorkerInput {
  actorId: string;
  reason: string;
}

/** Service error codes — route layer map sang HTTP. */
export type WorkerServiceErrorCode =
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'FORBIDDEN_OWNERSHIP'
  | 'INVALID_INPUT'
  | 'WORKER_MASKED_INPUT_REJECTED'
  | 'WORKER_NOT_DELETABLE'
  | 'WORKER_OUT_OF_SCOPE'
  | 'STALE_VERSION'
  | 'INTERNAL';

export class WorkerServiceError extends Error {
  constructor(
    public readonly code: WorkerServiceErrorCode,
    message: string,
    public readonly details?: {
      blockingFacts?: WorkerDependencyKind[];
      forbiddenFields?: string[];
      expectedUpdatedAt?: string | null;
      actualUpdatedAt?: string | null;
    },
  ) {
    super(message);
    this.name = 'WorkerServiceError';
  }
}

/** Re-export Prisma type để caller dùng khi cần. */
export type { Prisma };
