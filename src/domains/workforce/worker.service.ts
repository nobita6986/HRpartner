/**
 * worker.service.ts — V5-M1-09A-era Worker read/update/delete (T1B Pre-P2 hotfix).
 *
 * Pattern mirror `deleteStaffingOrder` (src/domains/staffing/order.service.ts):
 *   - Role guard (writer / delete / sensitive view).
 *   - Advisory lock `pg_advisory_xact_lock((hashtext('hrp:worker:'||id)::bigint) & MASK)`
 *     để serialize mọi mutate/delete trên cùng Worker — KHÔNG collide với
 *     `p1a04:order:` / `p1a04:slot:` / `p1a04:candidate:`.
 *   - Snapshot → re-read dưới lock → dependency sweep → delete / update.
 *   - Audit log `WORKER_PERMANENT_DELETE` / `WORKER_PROFILE_UPDATE` trong cùng
 *     transaction với state change (atomic).
 *
 * Quy tắc bảo mật (DEC-W7..15):
 *   - 6 field sensitive (masked) + 3 field sensitive (issued) chỉ được ghi khi
 *     caller có `CAN_VIEW_WORKER_SENSITIVE` (route layer check; service tin tưởng).
 *   - 3 field ownership chỉ ADMIN được sửa.
 *   - 4 field cấm (userId, accountUserId, workerId, id) đã bị Zod reject ở route.
 *   - Mask character `*` ở 6 sensitive + phone → reject 400 (defense-in-depth).
 *   - Không cascade; không set-null; không xóa lịch sử.
 *   - Khi `expectedUpdatedAt` cung cấp → CAS check tránh ghi đè concurrent edit.
 *
 * KHÔNG đụng:
 *   - `linkLaborProfileWorker` (PR #107) — LaborProfile.workerId authority.
 *   - `LaborProfile.workerId` ownership (PR #82) — LaborProfile writer.
 *   - `withAuthorizedDb` L1 injection — service dùng `withDbContext` (L2-only)
 *     vì delete cần escape L1's AND-injection để delete theo id thuần.
 *     L2 RLS `WITH CHECK` (chỉ cho phép {ADMIN, HR_MANAGER, DIRECTOR} delete
 *     workers) sẽ chặn non-allowed.
 */
import type { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { enqueueOutbox } from '@/src/shared/integrity/outbox';
import {
  WorkerServiceError,
  WORKER_ALL_SENSITIVE_FIELD_NAMES,
  WORKER_OWNERSHIP_FIELD_NAMES,
  WORKER_SENSITIVE_MASKED_FIELD_NAMES,
  type DeleteWorkerInput,
  type DeleteWorkerResult,
  type UpdateWorkerProfileInput,
  type UpdateWorkerProfileResult,
  type WorkerDependencyKind,
  type WorkerDetailRow,
  type WorkerEmploymentStatusValue,
  type WorkerListEnrichedFilter,
  type WorkerListEnrichedResponse,
  type WorkerListEnrichedRow,
} from './worker.types';

const ADVISORY_LOCK_NAMESPACE = 'hrp:worker:';
const ADVISORY_LOCK_MASK = 9223372036854775807n; // bigint max
// Sentinel mask signature: same as `order.service.ts:80` (bigint-extract of
// hashtext). pg_advisory_xact_lock takes bigint; hashtext returns int4 — we
// widen to bigint via ::bigint and mask the sign bit so the result is always
// positive and unique-per-key under the (k & MASK) transform.
const ADVISORY_LOCK_SQL =
  "SELECT pg_advisory_xact_lock( (hashtext($1)::bigint) & 9223372036854775807::bigint )";

const ROLE_ADMIN: ReadonlySet<string> = new Set(['ADMIN']);
const ROLE_WRITER: ReadonlySet<string> = new Set(['ADMIN', 'HR_MANAGER']);
const ROLE_VIEWER: ReadonlySet<string> = new Set([
  'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'ACCOUNTANT', 'SALE', 'DIRECTOR',
]);

const MASK_INPUT_RE = /\*/;

/**
 * Advisory lock cấp-Worker. Mirror pattern ở `order.service.ts`:
 *   - Caller PHẢI mở transaction trước (qua `withDbContext` / `$transaction`).
 *   - Lock tự giải phóng khi transaction COMMIT/ROLLBACK.
 *   - Cùng namespace `hrp:worker:<id>` serialize mọi mutate/delete trên cùng
 *     Worker id, bất kể service khác (route, batch, cli).
 */
async function acquireWorkerAdvisoryLock(
  tx: Prisma.TransactionClient,
  workerId: string,
): Promise<void> {
  await tx.$executeRawUnsafe(
    ADVISORY_LOCK_SQL,
    `${ADVISORY_LOCK_NAMESPACE}${workerId}`,
  );
}

/**
 * L1 row-scope check ở service level (L2 RLS đã chặn, nhưng ta muốn
 * fail-fast với typed NOT_FOUND thay vì 0-row P2025). Mirror
 * `buildWorkerScope` từ `src/shared/auth/scopes/worker.scope.ts`.
 *
 * Trả về WHERE clause; root roles thấy toàn bộ.
 */
function buildWorkerScopeWhere(ctx: AuthContext): Prisma.WorkerWhereInput {
  switch (ctx.role) {
    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
      return {};
    case 'HR_STAFF':
      return { assignedToId: ctx.userId };
    case 'SALE':
      return { OR: [{ ownerId: ctx.userId }, { assignedToId: ctx.userId }] };
    case 'PM':
      return {
        assignments: {
          some: { status: 'ACTIVE', project: { pmUserId: ctx.userId } },
        },
      };
    case 'VENDOR_ADMIN':
    case 'VENDOR_STAFF':
      return ctx.vendorId
        ? { sourceClaims: { some: { accepted: true, vendorId: ctx.vendorId } } }
        : { id: '__never__' }; // vendorId thiếu → không thấy row nào
    case 'CTV':
      return { sourceClaims: { some: { accepted: true, ctvId: ctx.userId } } };
    case 'WORKER':
      return { accountUserId: ctx.userId };
    default:
      return { id: '__never__' };
  }
}

/**
 * Check role có đủ quyền xem Worker (mirror list route's VIEWER_ROLES).
 * 404 fail-closed nếu role lạ (route layer cũng enforce nhưng defense-in-depth).
 */
function assertViewerRole(ctx: AuthContext): void {
  if (!ROLE_VIEWER.has(ctx.role)) {
    throw new WorkerServiceError(
      'PERMISSION_DENIED',
      `Role ${ctx.role} không có quyền đọc thông tin người lao động.`,
    );
  }
}

function assertWriterRole(ctx: AuthContext): void {
  if (!ROLE_WRITER.has(ctx.role)) {
    throw new WorkerServiceError(
      'PERMISSION_DENIED',
      `Role ${ctx.role} không có quyền sửa thông tin người lao động.`,
    );
  }
}

function assertDeleteRole(ctx: AuthContext): void {
  if (!ROLE_ADMIN.has(ctx.role)) {
    throw new WorkerServiceError(
      'PERMISSION_DENIED',
      'Chỉ ADMIN mới có quyền xóa vĩnh viễn người lao động.',
    );
  }
}

/**
 * Quét masked-input trên 6 field mask + phone. Cùng pattern
 * `LABOR_PROFILE_MASKED_INPUT_REJECTED` (PR #110). Throw 400 INVALID_INPUT.
 *
 * Caller (route) CŨNG check `*` ở 6 field masked UI, nhưng service là lớp
 * defense-in-depth cuối cùng (chống replay / API bị bypass UI).
 */
function assertNoMaskedInput(fields: Record<string, unknown>): void {
  for (const name of WORKER_SENSITIVE_MASKED_FIELD_NAMES) {
    const v = fields[name];
    if (typeof v === 'string' && MASK_INPUT_RE.test(v)) {
      throw new WorkerServiceError(
        'WORKER_MASKED_INPUT_REJECTED',
        `Field ${name} chứa ký tự mask "*" — không thể submit dữ liệu đã bị che vào DB.`,
        { forbiddenFields: [name] },
      );
    }
  }
  if (typeof fields.phone === 'string' && MASK_INPUT_RE.test(fields.phone)) {
    throw new WorkerServiceError(
      'WORKER_MASKED_INPUT_REJECTED',
      'Field phone chứa ký tự mask "*" — không thể submit dữ liệu đã bị che vào DB.',
      { forbiddenFields: ['phone'] },
    );
  }
}

/** Validate `employmentStatus` value ở service layer (route cũng check Zod). */
function normalizeEnumValues(input: UpdateWorkerProfileInput): UpdateWorkerProfileInput {
  // employmentStatus
  if (input.employmentStatus !== undefined) {
    const allowed = ['NONE', 'ACTIVE', 'SUSPENDED', 'TERMINATED'] as const;
    if (!(allowed as readonly string[]).includes(input.employmentStatus)) {
      throw new WorkerServiceError(
        'INVALID_INPUT',
        `employmentStatus phải là một trong ${allowed.join(' | ')}; nhận "${input.employmentStatus}".`,
        { forbiddenFields: ['employmentStatus'] },
      );
    }
  }
  if (input.profileStatus !== undefined) {
    const allowed = ['INCOMPLETE', 'PENDING_VERIFY', 'VERIFIED', 'REJECTED'] as const;
    if (!(allowed as readonly string[]).includes(input.profileStatus)) {
      throw new WorkerServiceError(
        'INVALID_INPUT',
        `profileStatus phải là một trong ${allowed.join(' | ')}; nhận "${input.profileStatus}".`,
        { forbiddenFields: ['profileStatus'] },
      );
    }
  }
  if (input.riskStatus !== undefined) {
    const allowed = ['NORMAL', 'REVIEW', 'BLOCKED'] as const;
    if (!(allowed as readonly string[]).includes(input.riskStatus)) {
      throw new WorkerServiceError(
        'INVALID_INPUT',
        `riskStatus phải là một trong ${allowed.join(' | ')}; nhận "${input.riskStatus}".`,
        { forbiddenFields: ['riskStatus'] },
      );
    }
  }
  return input;
}

/** Normalize date string (YYYY-MM-DD) → Date hoặc null. */
function parseDateField(name: string, value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new WorkerServiceError(
      'INVALID_INPUT',
      `Field ${name} không phải ngày hợp lệ (YYYY-MM-DD); nhận "${value}".`,
      { forbiddenFields: [name] },
    );
  }
  return d;
}

/** Trim + empty-string-as-null helper cho text field. */
function trimOrNull(name: string, value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

/** Trim-only (giữ chuỗi rỗng) cho fullName. */
function trimString(name: string, value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length > 255) {
    throw new WorkerServiceError(
      'INVALID_INPUT',
      `Field ${name} dài quá 255 ký tự.`,
      { forbiddenFields: [name] },
    );
  }
  return trimmed;
}

/**
 * Read Worker detail (full row + relations) cho detail surface.
 * Caller chịu trách nhiệm pass `projectWorker` ở route.
 */
export async function getWorkerDetail(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  id: string,
): Promise<WorkerDetailRow | null> {
  assertViewerRole(ctx);

  const where: Prisma.WorkerWhereInput = { AND: [buildWorkerScopeWhere(ctx), { id }] };
  const row = await tx.worker.findFirst({
    where,
    include: {
      laborProfile: {
        select: { id: true, fullName: true, phone: true },
      },
      assignments: {
        where: { status: { in: ['ACTIVE', 'SUSPENDED'] } },
        select: {
          id: true,
          status: true,
          projectId: true,
          project: { select: { id: true, code: true, name: true } },
        },
      },
      episodes: {
        orderBy: { startedAt: 'desc' },
        take: 20,
        select: { id: true, status: true, startedAt: true, endedAt: true },
      },
    owner: { select: { id: true, name: true } },
    assignedTo: { select: { id: true, name: true } },
    manager: { select: { id: true, name: true } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    userId: row.userId,
    fullName: row.fullName,
    phone: row.phone,
    dateOfBirth: row.dateOfBirth,
    gender: row.gender,
    maritalStatus: row.maritalStatus,
    permanentAddress: row.permanentAddress,
    currentAddress: row.currentAddress,
    hometown: row.hometown,
    ethnicGroup: row.ethnicGroup,
    religion: row.religion,
    nationality: row.nationality,
    cccdNumber: row.cccdNumber,
    cccdImageUrl: row.cccdImageUrl,
    selfieImageUrl: row.selfieImageUrl,
    cccdIssuedDate: row.cccdIssuedDate,
    cccdIssuedPlace: row.cccdIssuedPlace,
    cccdExpiryDate: row.cccdExpiryDate,
    taxCode: row.taxCode,
    insuranceCode: row.insuranceCode,
    bankAccount: row.bankAccount,
    bankName: row.bankName,
    bankBranch: row.bankBranch,
    profileStatus: row.profileStatus,
    employmentStatus: row.employmentStatus,
    riskStatus: row.riskStatus,
    ownerId: row.ownerId,
    assignedToId: row.assignedToId,
    accountUserId: row.accountUserId,
    managerId: row.managerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    laborProfile: row.laborProfile,
    assignments: row.assignments.map((a) => ({
      id: a.id,
      status: a.status,
      projectId: a.projectId,
      projectCode: a.project?.code ?? null,
      projectName: a.project?.name ?? null,
    })),
    episodes: row.episodes,
    owner: row.owner,
    assignedTo: row.assignedTo,
    manager: row.manager,
  };
}

/**
 * Update Worker profile (writer authority).
 *
 * Guards:
 *   - 403 nếu role không phải ADMIN | HR_MANAGER.
 *   - 403 nếu cố sửa 3 ownership field mà không phải ADMIN.
 *   - 400 nếu input chứa ký tự `*` ở 6 sensitive masked + phone.
 *   - 400 nếu employmentStatus / profileStatus / riskStatus ngoài enum.
 *   - 400 nếu date field không hợp lệ.
 *   - 404 nếu Worker ngoài row scope (HR_STAFF không phải assignedTo, etc.).
 *   - 409 STALE_VERSION nếu `expectedUpdatedAt` cung cấp mà row đã đổi.
 *   - KHÔNG bao giờ set `userId` / `accountUserId` / `workerId` / `id`.
 *
 * Sensitive write authorization: caller (route) PHẢI check
 * `CAN_VIEW_WORKER_SENSITIVE` trước khi gọi service với field sensitive.
 * Service không re-check permission (đã ở route layer); chỉ check masked input.
 */
export async function updateWorkerProfile(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  id: string,
  input: UpdateWorkerProfileInput,
): Promise<UpdateWorkerProfileResult> {
  assertWriterRole(ctx);

  // Loại bỏ các field undefined; giữ null (clear). Map field → value để audit.
  const provided: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) provided[k] = v;
  }
  if (Object.keys(provided).length === 0) {
    throw new WorkerServiceError(
      'INVALID_INPUT',
      'Phải cung cấp ít nhất một field cần cập nhật.',
    );
  }
  if ('actorId' in provided) delete (provided as Record<string, unknown>).actorId;
  if ('expectedUpdatedAt' in provided) delete (provided as Record<string, unknown>).expectedUpdatedAt;

  // Defense-in-depth: defense cấm field (cấm trong zod strict rồi).
  for (const name of ['userId', 'accountUserId', 'workerId', 'id'] as const) {
    if (name in provided) {
      throw new WorkerServiceError(
        'INVALID_INPUT',
        `Field ${name} không thể sửa qua PATCH (authority khác).`,
        { forbiddenFields: [name] },
      );
    }
  }

  // Ownership guard: chỉ ADMIN được phép sửa 3 ownership field.
  if (ctx.role !== 'ADMIN') {
    const ownershipHit = WORKER_OWNERSHIP_FIELD_NAMES.find((n) => n in provided);
    if (ownershipHit) {
      throw new WorkerServiceError(
        'FORBIDDEN_OWNERSHIP',
        `Field ${ownershipHit} chỉ ADMIN mới có quyền sửa.`,
        { forbiddenFields: [ownershipHit] },
      );
    }
  }

  // Mask character guard.
  assertNoMaskedInput(provided);

  // Enum + date + trim normalization.
  normalizeEnumValues(input);

  // Compose Prisma `data` object.
  const data: Prisma.WorkerUncheckedUpdateInput = {};
  const updatedFields: string[] = [];

  // Helpers
  const set = <K extends keyof Prisma.WorkerUncheckedUpdateInput>(
    name: K,
    value: Prisma.WorkerUncheckedUpdateInput[K] | undefined,
    fieldName: string,
  ) => {
    if (value === undefined) return;
    if (!(fieldName in provided)) return;
    data[name] = value;
    updatedFields.push(fieldName);
  };

  set('fullName', trimString('fullName', input.fullName) as never, 'fullName');
  set('phone', trimOrNull('phone', input.phone) as never, 'phone');

  const dob = parseDateField('dateOfBirth', input.dateOfBirth);
  if (dob !== undefined) {
    data.dateOfBirth = dob;
    updatedFields.push('dateOfBirth');
  }

  set('gender', trimOrNull('gender', input.gender) as never, 'gender');
  set('maritalStatus', trimOrNull('maritalStatus', input.maritalStatus) as never, 'maritalStatus');
  set(
    'permanentAddress',
    trimOrNull('permanentAddress', input.permanentAddress) as never,
    'permanentAddress',
  );
  set('currentAddress', trimOrNull('currentAddress', input.currentAddress) as never, 'currentAddress');
  set('hometown', trimOrNull('hometown', input.hometown) as never, 'hometown');
  set('ethnicGroup', trimOrNull('ethnicGroup', input.ethnicGroup) as never, 'ethnicGroup');
  set('religion', trimOrNull('religion', input.religion) as never, 'religion');
  set('nationality', trimOrNull('nationality', input.nationality) as never, 'nationality');

  set('cccdNumber', trimOrNull('cccdNumber', input.cccdNumber) as never, 'cccdNumber');
  set('cccdImageUrl', trimOrNull('cccdImageUrl', input.cccdImageUrl) as never, 'cccdImageUrl');
  set('selfieImageUrl', trimOrNull('selfieImageUrl', input.selfieImageUrl) as never, 'selfieImageUrl');

  const cccdIssuedDate = parseDateField('cccdIssuedDate', input.cccdIssuedDate);
  if (cccdIssuedDate !== undefined) {
    data.cccdIssuedDate = cccdIssuedDate;
    updatedFields.push('cccdIssuedDate');
  }
  set('cccdIssuedPlace', trimOrNull('cccdIssuedPlace', input.cccdIssuedPlace) as never, 'cccdIssuedPlace');

  const cccdExpiryDate = parseDateField('cccdExpiryDate', input.cccdExpiryDate);
  if (cccdExpiryDate !== undefined) {
    data.cccdExpiryDate = cccdExpiryDate;
    updatedFields.push('cccdExpiryDate');
  }

  set('taxCode', trimOrNull('taxCode', input.taxCode) as never, 'taxCode');
  set('insuranceCode', trimOrNull('insuranceCode', input.insuranceCode) as never, 'insuranceCode');
  set('bankAccount', trimOrNull('bankAccount', input.bankAccount) as never, 'bankAccount');
  set('bankName', trimOrNull('bankName', input.bankName) as never, 'bankName');
  set('bankBranch', trimOrNull('bankBranch', input.bankBranch) as never, 'bankBranch');

  set('profileStatus', input.profileStatus as never, 'profileStatus');
  set('employmentStatus', input.employmentStatus as never, 'employmentStatus');
  set('riskStatus', input.riskStatus as never, 'riskStatus');

  set('ownerId', input.ownerId === undefined ? undefined : (input.ownerId as never), 'ownerId');
  set(
    'assignedToId',
    input.assignedToId === undefined ? undefined : (input.assignedToId as never),
    'assignedToId',
  );
  set('managerId', input.managerId === undefined ? undefined : (input.managerId as never), 'managerId');

  if (updatedFields.length === 0) {
    throw new WorkerServiceError(
      'INVALID_INPUT',
      'Không có field hợp lệ nào để cập nhật (sau khi áp allowlist + trim).',
    );
  }

  // Atomic: lock → read snapshot (CAS nếu expectedUpdatedAt) → updateMany.
  // updateMany thay vì update để count-based CAS — nếu row đã xóa hoặc version
  // lệch → count 0 → typed 404 / 409 STALE_VERSION.
  await acquireWorkerAdvisoryLock(tx, id);

  const existing = await tx.worker.findFirst({
    where: { AND: [buildWorkerScopeWhere(ctx), { id }] },
    select: { id: true, updatedAt: true },
  });
  if (!existing) {
    throw new WorkerServiceError('NOT_FOUND', `Worker ${id} không tồn tại hoặc ngoài phạm vi.`);
  }

  if (input.expectedUpdatedAt) {
    const expected =
      input.expectedUpdatedAt instanceof Date
        ? input.expectedUpdatedAt
        : new Date(input.expectedUpdatedAt);
    if (Number.isNaN(expected.getTime()) || existing.updatedAt.getTime() !== expected.getTime()) {
      throw new WorkerServiceError(
        'STALE_VERSION',
        `Worker ${id} đã bị chỉnh giữa chừng; vui lòng tải lại.`,
        {
          expectedUpdatedAt: expected.toISOString(),
          actualUpdatedAt: existing.updatedAt.toISOString(),
        },
      );
    }
  }

  const result = await tx.worker.updateMany({
    where: { id },
    data,
  });
  if (result.count !== 1) {
    throw new WorkerServiceError(
      'NOT_FOUND',
      `Worker ${id} không tồn tại hoặc bị xóa concurrent.`,
    );
  }

  // Audit log.
  const audit = await tx.auditLog.create({
    data: {
      actorId: ctx.userId,
      actorRole: ctx.role,
      entityType: 'Worker',
      entityId: id,
      action: 'WORKER_PROFILE_UPDATE',
      reason: 'PATCH /api/workers/[id]',
      diff: { fields: updatedFields, actorId: ctx.userId } as object as never,
    },
    select: { id: true },
  });

  // Outbox event (audit fan-out).
  await enqueueOutbox(tx, {
    eventType: 'WorkerProfileUpdated',
    aggregateId: id,
    payload: { workerId: id, updatedFields, actorId: ctx.userId },
  });

  return {
    id,
    updatedAt: existing.updatedAt,
    updatedFields,
    ...(audit?.id ? {} : {}),
  };
}

/** Sweep 15 dependency table → return list các `WorkerDependencyKind` còn block. */
async function sweepWorkerDependencies(
  tx: Prisma.TransactionClient,
  workerId: string,
): Promise<WorkerDependencyKind[]> {
  const facts: WorkerDependencyKind[] = [];

  const checks: Array<{ kind: WorkerDependencyKind; count: number }> = [];
  // 1. LaborProfile (0..1 back-relation).
  checks.push({
    kind: 'LABOR_PROFILE',
    count: await tx.laborProfile.count({ where: { workerId } }),
  });
  // 2. EmploymentEpisode.
  checks.push({
    kind: 'EMPLOYMENT_EPISODE',
    count: await tx.employmentEpisode.count({ where: { workerId } }),
  });
  // 3. ProjectAssignment.
  checks.push({
    kind: 'PROJECT_ASSIGNMENT',
    count: await tx.projectAssignment.count({ where: { workerId } }),
  });
  // 4. Ticket.
  checks.push({ kind: 'TICKET', count: await tx.ticket.count({ where: { workerId } }) });
  // 5. Dependent.
  checks.push({ kind: 'DEPENDENT', count: await tx.dependent.count({ where: { workerId } }) });
  // 6. AttendanceEvent.
  checks.push({
    kind: 'ATTENDANCE_EVENT',
    count: await tx.attendanceEvent.count({ where: { workerId } }),
  });
  // 7. TimesheetLine.
  checks.push({
    kind: 'TIMESHEET_LINE',
    count: await tx.timesheetLine.count({ where: { workerId } }),
  });
  // 8. TimesheetAdjustment.
  checks.push({
    kind: 'TIMESHEET_ADJUSTMENT',
    count: await tx.timesheetAdjustment.count({ where: { workerId } }),
  });
  // 9. WorkerDeduction.
  checks.push({
    kind: 'WORKER_DEDUCTION',
    count: await tx.workerDeduction.count({ where: { workerId } }),
  });
  // 10. VendorStatementLine.
  checks.push({
    kind: 'VENDOR_STATEMENT_LINE',
    count: await tx.vendorStatementLine.count({ where: { workerId } }),
  });
  // 11. ClientStatementLine.
  checks.push({
    kind: 'CLIENT_STATEMENT_LINE',
    count: await tx.clientStatementLine.count({ where: { workerId } }),
  });
  // 12. CommissionLedger.
  checks.push({
    kind: 'COMMISSION_LEDGER',
    count: await tx.commissionLedger.count({ where: { workerId } }),
  });
  // 13. SourceClaim.
  checks.push({
    kind: 'SOURCE_CLAIM',
    count: await tx.sourceClaim.count({ where: { workerId } }),
  });
  // 14. CandidateSubmission (workerId).
  checks.push({
    kind: 'CANDIDATE_SUBMISSION',
    count: await tx.candidateSubmission.count({ where: { workerId } }),
  });
  // 15. CandidateSubmission (mergedWorkerId).
  checks.push({
    kind: 'CANDIDATE_SUBMISSION_MERGED',
    count: await tx.candidateSubmission.count({ where: { mergedWorkerId: workerId } }),
  });

  for (const c of checks) {
    if (c.count > 0) facts.push(c.kind);
  }
  return facts;
}

/**
 * Xóa vĩnh viễn Worker (chỉ ADMIN, chỉ orphan).
 *
 * Flow:
 *   1. Lock advisory `hrp:worker:<id>`.
 *   2. Snapshot Worker (id, userId, fullName, createdAt).
 *   3. Re-read dưới lock để chắc chắn row vẫn tồn tại + sweep 15 dependency.
 *   4. Nếu còn dep → throw WORKER_NOT_DELETABLE + facts.
 *   5. Nếu sạch → `tx.worker.delete` + audit log + outbox event.
 *
 * Rollback: revert single commit. Không migration, không backfill.
 */
export async function deleteWorker(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  id: string,
  input: DeleteWorkerInput,
): Promise<DeleteWorkerResult> {
  assertDeleteRole(ctx);

  await acquireWorkerAdvisoryLock(tx, id);

  // Snapshot (1 SELECT) — KHÔNG dùng scope WHERE ở đây vì ADMIN luôn thấy.
  const snapshot = await tx.worker.findFirst({
    where: { id },
    select: { id: true, userId: true, fullName: true, createdAt: true },
  });
  if (!snapshot) {
    throw new WorkerServiceError('NOT_FOUND', `Worker ${id} không tồn tại.`);
  }

  // Phase 2: re-read dưới lock (concurrent insert mới giữa snapshot và re-read
  // sẽ commit trước lock ta lấy, hoặc phải đợi lock ta giải phóng → re-read
  // luôn thấy state mới nhất).
  const recheck = await tx.worker.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!recheck) {
    throw new WorkerServiceError('NOT_FOUND', `Worker ${id} đã bị xóa concurrent.`);
  }

  const blockingFacts = await sweepWorkerDependencies(tx, id);
  if (blockingFacts.length > 0) {
    throw new WorkerServiceError(
      'WORKER_NOT_DELETABLE',
      `Người lao động đã phát sinh nghiệp vụ (${blockingFacts.join(', ')}). Không thể xóa vĩnh viễn.`,
      { blockingFacts },
    );
  }

  const deleted = await tx.worker.delete({ where: { id }, select: { id: true } });

  const audit = await tx.auditLog.create({
    data: {
      actorId: ctx.userId,
      actorRole: ctx.role,
      entityType: 'Worker',
      entityId: id,
      action: 'WORKER_PERMANENT_DELETE',
      reason: input.reason,
      diff: {
        before: {
          id: snapshot.id,
          userId: snapshot.userId,
          fullName: snapshot.fullName,
          createdAt: snapshot.createdAt.toISOString(),
        },
        after: null,
        actorId: ctx.userId,
        reason: input.reason,
      } as object as never,
    },
    select: { id: true },
  });

  await enqueueOutbox(tx, {
    eventType: 'WorkerPermanentlyDeleted',
    aggregateId: id,
    payload: { workerId: id, userId: snapshot.userId, actorId: ctx.userId, reason: input.reason },
  });

  return {
    id: deleted.id,
    userId: snapshot.userId,
    fullName: snapshot.fullName,
    deletedAt: new Date(),
    auditId: audit.id,
  };
}

/**
 * T1B-OPS — Worker list enriched cho `/admin/workers`.
 *
 * DEC-T1B-OPS-03 / 09 — Canonical projections:
 *   - `currentProject` từ `ProjectAssignment WHERE status IN ('ACTIVE','PAUSED') ORDER BY validFrom DESC LIMIT 1`.
 *   - `firstWorkDate` = `MIN(EmploymentEpisode.startedAt WHERE workerId = X)`.
 *   - `currentProjectManager` từ `Project.pmUserId` (User.name) — KHÔNG phải Worker.managerId.
 *   - `handler` từ `Worker.assignedToId` (User.name).
 *   - `referrer` từ `ProjectAssignment.referrerId` (User.name), fallback `SourceClaim.referrerUserId`.
 *   - `commissionBeneficiary` từ `SourceClaim WHERE accepted=true AND claimType='CTV_REFERRAL'` → `ctvId` (User.name).
 *
 * Pipeline tối ưu:
 *   1. 1 query Worker.findMany với include relations cố định.
 *   2. 1 batch query cho aggregate (Episode min) + latest Assignment + latest SourceClaim.
 *   3. Compose DTO từ data đã có, không loop per-row query.
 *
 * Permission: ADMIN/HR_MANAGER/DIRECTOR thấy toàn bộ. HR_STAFF/SALE/PM scope theo 13-role matrix (mirror `buildWorkerScopeWhere`).
 *
 * Auth role guard `ROLE_VIEWER` (mirror list route).
 */
export async function listWorkersForAdmin(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  filter: WorkerListEnrichedFilter = {},
): Promise<WorkerListEnrichedResponse> {
  assertViewerRole(ctx);

  const take = Math.min(filter.take ?? 50, 200);
  const skip = filter.skip ?? 0;
  const where: Prisma.WorkerWhereInput = { ...buildWorkerScopeWhere(ctx) };
  if (filter.status) {
    where.employmentStatus = filter.status;
  }

  const [total, rows] = await Promise.all([
    tx.worker.count({ where }),
    tx.worker.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: {
        id: true,
        userId: true,
        fullName: true,
        phone: true,
        cccdNumber: true,
        bankAccount: true,
        bankName: true,
        employmentStatus: true,
        assignedTo: { select: { id: true, name: true } },
        // T1B-OPS: Pre-load ACTIVE/PAUSED assignments + Project (pmSubUserId1/pmSubUserId2).
        // We'll pick the latest one in service.
        assignments: {
          where: { status: { in: ['ACTIVE', 'PAUSED'] } },
          orderBy: { validFrom: 'desc' },
          take: 1,
          select: {
            referrerId: true,
            referrer: { select: { id: true, name: true } },
            projectId: true,
            project: { select: { id: true, code: true, name: true, pmUserId: true, subPmUserId1: true, subPmUserId2: true } },
          },
        },
        // T1B-OPS: Pre-load firstWorkDate (MIN startedAt).
        episodes: {
          orderBy: { startedAt: 'asc' },
          take: 1,
          select: { startedAt: true },
        },
      },
    }),
  ]);

  if (rows.length === 0) {
    return { workers: [], total, take, skip };
  }

  const ids = rows.map(r => r.id);

  // T1B-OPS: batch fetch commission beneficiary (CTV_REFERRAL accepted).
  const sourceClaims = await tx.sourceClaim.findMany({
    where: {
      workerId: { in: ids },
      accepted: true,
      claimType: 'CTV_REFERRAL',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      workerId: true,
      ctvId: true,
      ctv: { select: { id: true, name: true } },
    },
  });
  const ctvByWorkerId = new Map<string, string | null>();
  for (const claim of sourceClaims) {
    if (!ctvByWorkerId.has(claim.workerId)) {
      ctvByWorkerId.set(claim.workerId, claim.ctv?.name ?? null);
    }
  }

  // T1B-OPS: Resolve PM names (1 query for all PMs).
  const pmUserIds = new Set<string>();
  for (const row of rows) {
    const a = row.assignments[0];
    if (!a) continue;
    if (a.project?.pmUserId) pmUserIds.add(a.project.pmUserId);
    if (!a.project?.pmUserId && a.project?.subPmUserId1) pmUserIds.add(a.project.subPmUserId1);
    if (!a.project?.pmUserId && a.project?.subPmUserId2) pmUserIds.add(a.project.subPmUserId2);
  }
  const pmRows = pmUserIds.size > 0
    ? await tx.user.findMany({
        where: { id: { in: Array.from(pmUserIds) } },
        select: { id: true, name: true },
      })
    : [];
  const pmNameById = new Map<string, string | null>();
  for (const u of pmRows) pmNameById.set(u.id, u.name);

  return {
    workers: rows.map((row) => {
      const a = row.assignments[0];
      const currentProject = a
        ? {
            id: a.projectId,
            code: a.project?.code ?? null,
            name: a.project?.name ?? null,
          }
        : null;
      let currentProjectManager: string | null = null;
      if (a?.project) {
        if (a.project.pmUserId) {
          currentProjectManager = pmNameById.get(a.project.pmUserId) ?? null;
        } else if (a.project.subPmUserId1) {
          currentProjectManager = pmNameById.get(a.project.subPmUserId1) ?? null;
        } else if (a.project.subPmUserId2) {
          currentProjectManager = pmNameById.get(a.project.subPmUserId2) ?? null;
        }
      }
      const referrer = a?.referrer?.name ?? null;
      const firstWorkDate = row.episodes[0]?.startedAt?.toISOString() ?? null;
      const handler = row.assignedTo?.name ?? null;
      const commissionBeneficiary = ctvByWorkerId.get(row.id) ?? null;
      return {
        id: row.id,
        userId: row.userId,
        fullName: row.fullName,
        phone: row.phone,
        cccdNumber: row.cccdNumber,
        bankAccount: row.bankAccount,
        bankName: row.bankName,
        employmentStatus: row.employmentStatus,
        currentProject,
        firstWorkDate,
        currentProjectManager,
        handler,
        referrer,
        commissionBeneficiary,
      };
    }),
    total,
    take,
    skip,
  };
}

/**
 * Snapshot Worker dependencies (read-only) — dùng cho UI confirm trước khi
 * DELETE. Trả về facts nếu có, hoặc mảng rỗng nếu sạch.
 */
export async function inspectWorkerDependencies(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  id: string,
): Promise<{ exists: boolean; facts: WorkerDependencyKind[] }> {
  assertViewerRole(ctx);
  const existing = await tx.worker.findFirst({
    where: { AND: [buildWorkerScopeWhere(ctx), { id }] },
    select: { id: true },
  });
  if (!existing) return { exists: false, facts: [] };
  const facts = await sweepWorkerDependencies(tx, id);
  return { exists: true, facts };
}

/** Re-export các type liên quan (caller dùng để typed). */
export {
  WorkerServiceError,
  WORKER_ALL_SENSITIVE_FIELD_NAMES,
  WORKER_OWNERSHIP_FIELD_NAMES,
  WORKER_SENSITIVE_MASKED_FIELD_NAMES,
  type DeleteWorkerInput,
  type DeleteWorkerResult,
  type UpdateWorkerProfileInput,
  type UpdateWorkerProfileResult,
  type WorkerDependencyKind,
  type WorkerDetailRow,
  type WorkerEmploymentStatusValue,
  type WorkerListEnrichedRow,
  type WorkerListEnrichedFilter,
  type WorkerListEnrichedResponse,
};
