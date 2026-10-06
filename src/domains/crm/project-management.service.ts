/**
 * project-management.service.ts — T1A PRE-P2 PROJECT MANAGEMENT HOTFIX.
 *
 * Service layer cho:
 *   - Chuyển trạng thái Project (state machine) với terminal guard.
 *   - Xoá vĩnh viễn Project — chỉ khi zero dependency; canonical advisory
 *     lock + re-read deps dưới lock để chống race; typed 409
 *     PROJECT_NOT_DELETABLE nếu còn phụ thuộc.
 *
 * Authority (mirror backend routes):
 *   - updateProjectStatus: ADMIN / HR_MANAGER / PM (POST/PUT ADMIN_ROLES).
 *   - deleteProject: ADMIN only.
 *   - Backward transition từ terminal (`COMPLETED` / `CANCELLED`) bị cấm
 *     tuyệt đối (state machine RQ-04).
 *
 * Idempotency cho DELETE được route handler (`app/api/projects/[id]/route.ts`)
 * bọc qua `withIdempotency` (TTL 24h). Service KHÔNG cần tự dùng idempotency.
 */

import type { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';

/** Project lifecycle enum — mirror `prisma/schema.prisma` Project.status. */
export const PROJECT_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ProjectLifecycleStatus = (typeof PROJECT_STATUSES)[number];

/** State machine — non-terminal ↔ non-terminal, mọi trạng thái → terminal. */
export const PROJECT_TRANSITIONS: Readonly<
  Record<ProjectLifecycleStatus, ReadonlyArray<ProjectLifecycleStatus>>
> = {
  DRAFT: ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
  ACTIVE: ['DRAFT', 'PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Roles có quyền chuyển trạng thái Project — mirror `ADMIN_ROLES` của
 * `app/api/projects/[id]/route.ts` (PUT). PM và HR_MANAGER giữ authority
 * hiện hữu; HR_STAFF/DIRECTOR/... không thuộc ADMIN_ROLES ⇒ 403.
 */
export const PROJECT_UPDATE_ROLES = ['ADMIN', 'HR_MANAGER', 'PM'] as const;

/** Chỉ ADMIN được xoá vĩnh viễn — mirror DELETE_ROLES của route handler. */
export const PROJECT_DELETE_ROLES = ['ADMIN'] as const;

// ─── Error types ──────────────────────────────────────────────────────────

export class ProjectManagementServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'PERMISSION_DENIED'
      | 'INVALID_TRANSITION'
      | 'PROJECT_NOT_DELETABLE'
      | 'VALIDATION',
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ProjectManagementServiceError';
  }
}

// ─── Status transition ────────────────────────────────────────────────────

/** Pure helper exported cho test. Returns true nếu transition được phép. */
export function canTransitionProjectStatus(
  from: string,
  to: string,
): boolean {
  if (!PROJECT_STATUSES.includes(from as ProjectLifecycleStatus)) return false;
  if (!PROJECT_STATUSES.includes(to as ProjectLifecycleStatus)) return false;
  const allowed = PROJECT_TRANSITIONS[from as ProjectLifecycleStatus];
  return allowed.includes(to as ProjectLifecycleStatus);
}

/**
 * Cập nhật trạng thái Project với state-machine guard + canonical advisory lock.
 *
 * - Lock TRƯỚC khi đọc để serialize với concurrent update/delete.
 * - Re-read status dưới lock để chống stale-transition (khi concurrent update
 *   đã chuyển status trước khi lock acquire).
 * - COMPLETED / CANCELLED là terminal ⇒ INVALID_TRANSITION (400) cho mọi
 *   transition ngược.
 *
 * Caller PHẢI mở transaction (qua `withDbContext`).
 */
export async function updateProjectStatus(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  projectId: string,
  newStatus: ProjectLifecycleStatus,
): Promise<{ id: string; status: ProjectLifecycleStatus }> {
  if (
    !(PROJECT_UPDATE_ROLES as ReadonlyArray<string>).includes(ctx.role)
  ) {
    throw new ProjectManagementServiceError(
      'PERMISSION_DENIED',
      `Vai trò ${ctx.role} không có quyền chuyển trạng thái dự án.`,
    );
  }

  await acquireProjectAdvisoryLock(tx, projectId);

  const existing = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true, status: true },
  });
  if (!existing) {
    throw new ProjectManagementServiceError(
      'NOT_FOUND',
      `Không tìm thấy dự án ${projectId} hoặc nằm ngoài phạm vi truy cập.`,
    );
  }

  const from = existing.status as ProjectLifecycleStatus;
  if (from === newStatus) {
    // No-op: caller gửi cùng status ⇒ trả về row hiện tại (idempotent).
    return { id: existing.id, status: from };
  }

  if (!canTransitionProjectStatus(from, newStatus)) {
    throw new ProjectManagementServiceError(
      'INVALID_TRANSITION',
      `Không thể chuyển trạng thái dự án từ ${from} sang ${newStatus}.`,
    );
  }

  const updated = await tx.project.update({
    where: { id: projectId },
    data: { status: newStatus },
    select: { id: true, status: true },
  });
  return { id: updated.id, status: updated.status as ProjectLifecycleStatus };
}

// ─── Safe delete ──────────────────────────────────────────────────────────

/**
 * Advisory lock cấp-project — dùng cùng gia đình namespace `p1a04:*` (per
 * pattern trong `src/domains/staffing/order.service.ts` / P1-A0.4 carryover)
 * để lock có thể serialize với các service khác đụng cùng project nếu cần.
 * Lock TỰ ĐỘNG giải phóng khi transaction COMMIT/ROLLBACK (pg_advisory_xact_lock).
 */
async function acquireProjectAdvisoryLock(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<void> {
  await tx.$executeRawUnsafe(
    "SELECT pg_advisory_xact_lock( (hashtext($1)::bigint) & 9223372036854775807::bigint )",
    `p1a04:project:${projectId}`,
  );
}

/** Tập relation mà Project bị chặn xoá. Mỗi relation đại diện cho 1 phụ thuộc
 * nghiệp vụ KHÔNG ĐƯỢC cascade theo RQ-05. `Placement.projectId` có onDelete
 * SetNull — KHÔNG block deletion, NHƯNG vẫn quét để audit (sẽ tự nullify sau
 * khi project xoá). */
const DELETION_BLOCKING_RELATIONS = [
  'staffingOrders',
  'submissions',
  'assignments',
  'sites',
] as const;

export interface ProjectDependencyReport {
  staffingOrderCount: number;
  candidateSubmissionCount: number;
  projectAssignmentCount: number;
  siteCount: number;
}

/**
 * Quét đầy đủ các relation blocking deletion của Project DƯỚI advisory lock
 * (lần 2 — sau khi lock acquire, re-read để bắt writes concurrent đã COMMIT).
 *
 * Returns counts per relation. Mọi count > 0 ⇒ PROJECT_NOT_DELETABLE.
 *
 * `Placement.projectId` SetNull ⇒ KHÔNG nằm trong blocking set; tuy nhiên ta
 * vẫn scan (`placementsCount`) để cung cấp audit info cho operator-facing
 * message khi cần.
 */
export async function scanProjectDependencies(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<ProjectDependencyReport & { placementsCount: number }> {
  const [staffingOrderCount, candidateSubmissionCount, projectAssignmentCount, siteCount, placementsCount] =
    await Promise.all([
      tx.staffingOrder.count({ where: { projectId } }),
      tx.candidateSubmission.count({ where: { projectId } }),
      tx.projectAssignment.count({ where: { projectId } }),
      tx.site.count({ where: { projectId } }),
      tx.placement.count({ where: { projectId } }),
    ]);
  return {
    staffingOrderCount,
    candidateSubmissionCount,
    projectAssignmentCount,
    siteCount,
    placementsCount,
  };
}

/** Tên phụ thuộc đã phát sinh (tiếng Việt) — operator-facing guidance. */
const DEPENDENCY_LABEL_VI: Readonly<Record<keyof ProjectDependencyReport, string>> = {
  staffingOrderCount: 'nhu cầu tuyển dụng',
  candidateSubmissionCount: 'đơn ứng tuyển',
  projectAssignmentCount: 'phân công người lao động',
  siteCount: 'địa điểm công trường',
};

export function describeBlockingDependencies(
  report: ProjectDependencyReport,
): string[] {
  const facts: string[] = [];
  for (const key of Object.keys(DEPENDENCY_LABEL_VI) as Array<
    keyof ProjectDependencyReport
  >) {
    const count = report[key];
    if (count > 0) facts.push(`${count} ${DEPENDENCY_LABEL_VI[key]}`);
  }
  return facts;
}

/**
 * Xoá vĩnh viễn Project — CHỈ khi zero dependency.
 *
 * Quy tắc (RQ-05, RQ-06):
 *   - Chỉ ADMIN.
 *   - Acquire canonical advisory lock TRƯỚC khi đọc.
 *   - Re-read deps DƯỚI lock để bắt writes concurrent đã COMMIT ngay
 *     trước lock acquire. Nếu bất kỳ relation nào > 0 ⇒ typed 409
 *     PROJECT_NOT_DELETABLE + Vietnamese guidance "Hoàn thành/Huỷ dự án".
 *   - KHÔNG cascade; KHÔNG set-null để ép xoá.
 *   - KHÔNG fallback về unhandled DB cascade hoặc 500.
 *
 * Caller PHẢI mở transaction (qua `withDbContext`). Route handler bọc qua
 * `withIdempotency` để retry an toàn.
 */
export async function deleteProject(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  projectId: string,
): Promise<{ id: string; deleted: true }> {
  if (ctx.role !== 'ADMIN') {
    throw new ProjectManagementServiceError(
      'PERMISSION_DENIED',
      'Chỉ ADMIN mới có quyền xoá vĩnh viễn dự án.',
    );
  }

  // Phase 1: lock + snapshot row (fail-closed nếu không tồn tại / ngoài scope).
  await acquireProjectAdvisoryLock(tx, projectId);

  const existing = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true, code: true, status: true },
  });
  if (!existing) {
    throw new ProjectManagementServiceError(
      'NOT_FOUND',
      `Không tìm thấy dự án ${projectId} hoặc nằm ngoài phạm vi truy cập.`,
    );
  }

  // Phase 2: re-read deps dưới lock (lần 2) để bắt writes từ request
  // concurrent đã COMMIT ngay trước lock acquire. Race-condition an toàn:
  // nếu có write mới từ concurrent request, write đó phải đợi lock của ta
  // hoặc đã COMMIT trước lock ta lấy ⇒ re-read sẽ thấy.
  const report = await scanProjectDependencies(tx, projectId);
  const blockingFacts = describeBlockingDependencies(report);
  if (blockingFacts.length > 0) {
    throw new ProjectManagementServiceError(
      'PROJECT_NOT_DELETABLE',
      `Dự án đã phát sinh nghiệp vụ (${blockingFacts.join(', ')}). Không thể xoá vĩnh viễn. Hãy dùng "Hoàn thành dự án" hoặc "Huỷ dự án" thay thế để giữ lại lịch sử.`,
    );
  }

  // Phase 3: thực thi xoá. `Placement.projectId` SetNull tự nullify sau;
  // không cần set-null ở service (DB tự lo).
  await tx.project.delete({ where: { id: projectId } });

  return { id: existing.id, deleted: true };
}

// ─── Zod-style validation helpers (allowlist + strict types) ──────────────

/**
 * RQ-05 / RQ-08: payload validation cho PUT. Cho phép caller narrow shape
 * sang một object chỉ chứa field hợp lệ. Không dùng Zod runtime — dùng
 * guards ngắn gọn để không kéo thêm dependency mới (EP §4.1 BUILD_VS_ADOPT).
 */
export interface ProjectUpdateInput {
  name?: string;
  clientCompanyId?: string;
  pmUserId?: string | null;
  siteAddress?: string | null;
  startDate?: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD or null
  status?: ProjectLifecycleStatus;
  quota?: number | null; // integer >= 0 hoặc null
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return false;
  // Round-trip: loại bỏ "2026-02-30".
  return d.toISOString().slice(0, 10) === value;
}

export function validateProjectUpdateInput(
  raw: unknown,
):
  | { ok: true; value: ProjectUpdateInput }
  | { ok: false; error: string } {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, error: 'Body phải là object JSON' };
  }
  const body = raw as Record<string, unknown>;
  const allowed = new Set([
    'name',
    'clientCompanyId',
    'pmUserId',
    'siteAddress',
    'startDate',
    'endDate',
    'status',
    'quota',
  ]);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      return {
        ok: false,
        error: `Trường không hợp lệ: ${key}. Chỉ chấp nhận: ${Array.from(allowed).join(', ')}.`,
      };
    }
  }

  const out: ProjectUpdateInput = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return { ok: false, error: 'Tên dự án phải là chuỗi khác rỗng.' };
    }
    out.name = body.name.trim();
  }

  if (body.clientCompanyId !== undefined) {
    if (typeof body.clientCompanyId !== 'string' || !body.clientCompanyId) {
      return { ok: false, error: 'clientCompanyId phải là chuỗi khác rỗng.' };
    }
    out.clientCompanyId = body.clientCompanyId;
  }

  if (body.pmUserId !== undefined) {
    if (body.pmUserId !== null && typeof body.pmUserId !== 'string') {
      return { ok: false, error: 'pmUserId phải là chuỗi hoặc null.' };
    }
    out.pmUserId = body.pmUserId as string | null;
  }

  if (body.siteAddress !== undefined) {
    if (body.siteAddress !== null && typeof body.siteAddress !== 'string') {
      return { ok: false, error: 'siteAddress phải là chuỗi hoặc null.' };
    }
    out.siteAddress = body.siteAddress as string | null;
  }

  if (body.startDate !== undefined) {
    if (!isIsoDateOnly(body.startDate)) {
      return {
        ok: false,
        error: 'Ngày bắt đầu phải là ngày hợp lệ (YYYY-MM-DD).',
      };
    }
    out.startDate = body.startDate;
  }

  if (body.endDate !== undefined) {
    if (body.endDate === null) {
      out.endDate = null;
    } else if (!isIsoDateOnly(body.endDate)) {
      return {
        ok: false,
        error: 'Ngày kết thúc phải là ngày hợp lệ (YYYY-MM-DD) hoặc null.',
      };
    } else if (out.startDate && body.endDate < out.startDate) {
      return {
        ok: false,
        error: `Ngày kết thúc (${body.endDate}) phải >= ngày bắt đầu (${out.startDate}).`,
      };
    } else {
      out.endDate = body.endDate;
    }
  }

  if (body.status !== undefined) {
    if (
      typeof body.status !== 'string' ||
      !(PROJECT_STATUSES as ReadonlyArray<string>).includes(body.status)
    ) {
      return {
        ok: false,
        error: `Trạng thái phải là một trong: ${PROJECT_STATUSES.join(', ')}.`,
      };
    }
    out.status = body.status as ProjectLifecycleStatus;
  }

  if (body.quota !== undefined) {
    if (body.quota === null) {
      out.quota = null;
    } else if (
      typeof body.quota !== 'number' ||
      !Number.isInteger(body.quota) ||
      body.quota < 0 ||
      !Number.isSafeInteger(body.quota)
    ) {
      return {
        ok: false,
        error: 'Chỉ tiêu nhân sự phải là số nguyên không âm hoặc null.',
      };
    } else {
      out.quota = body.quota;
    }
  }

  return { ok: true, value: out };
}