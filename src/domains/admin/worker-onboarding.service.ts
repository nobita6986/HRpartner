/**
 * worker-onboarding.service.ts
 *
 * Dịch vụ quản trị toàn trình cho Admin đối với tài khoản WORKER và hồ sơ NLĐ:
 *   1. Kiểm tra trạng thái liên kết tài khoản WORKER ↔ Hồ sơ Worker ↔ Dự án hiện hành,
 *      cùng danh sách dự án / đơn hàng / vị trí (slot) đang mở.
 *   2. Xác thực SĐT thủ công + Tạo hoặc liên kết hồ sơ Worker chuẩn (USR-EMP-xxx,
 *      LaborProfile, SourceClaim) + Kích hoạt trạng thái NLĐ (VERIFIED / ACTIVE)
 *      + Gán trực tiếp vào Dự án / Vị trí (ProjectAssignment ACTIVE) trong 1 giao dịch
 *      có đầy đủ khóa đồng thời (advisory lock + FOR UPDATE), nhật ký kiểm toán (AuditLog)
 *      và sự kiện Outbox (AssignmentActivated).
 *   3. Gỡ liên kết tài khoản đăng nhập khỏi hồ sơ Worker khi Admin cần điều chỉnh.
 *
 * Lưu ý kiến trúc:
 *   - Chỉ sử dụng các trường vô hướng (scalar select) khi truy vấn Prisma để tránh
 *     select quan hệ bắt buộc qua bảng bật RLS (tuân thủ required-relation-sweep).
 */

import { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { nextBusinessCode } from '@/src/shared/business-code/business-code';
import { writeAuditLog } from '@/src/shared/integrity/audit';
import { enqueueOutbox } from '@/src/shared/integrity/outbox';
import { normalizePhone } from '@/src/domains/applications/apply-helpers';
import {
  EMPLOYMENT_TYPES,
  WORK_SETTINGS,
  type EmploymentType,
  type WorkSetting,
} from '@/src/domains/staffing/assignment-placement.service';

export type WorkerOnboardingErrorCode =
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'USER_NOT_READY'
  | 'WORKER_NOT_READY'
  | 'ALREADY_LINKED'
  | 'PHONE_MISMATCH'
  | 'SLOT_UNAVAILABLE'
  | 'PROJECT_QUOTA_FULL'
  | 'ACTIVE_ASSIGNMENT_CONFLICT'
  | 'EMPLOYEE_CODE_CONFLICT'
  | 'CONCURRENT_CHANGE';

export class WorkerOnboardingError extends Error {
  constructor(
    public readonly code: WorkerOnboardingErrorCode,
    public readonly httpStatus: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'WorkerOnboardingError';
  }
}

export interface OpenSlotOptionDto {
  slotId: string;
  positionCode: string;
  positionTitle: string;
  workLocation: string | null;
  slotsNeeded: number;
  slotsFilled: number;
  remaining: number;
  staffingOrderId: string;
  staffingOrderCode: string;
  staffingOrderTitle: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  projectQuota: number;
  projectFilled: number;
  projectRemaining: number;
}

export interface ActiveAssignmentSummaryDto {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  staffingOrderId: string | null;
  staffingOrderSlotId: string | null;
  employeeCode: string;
  employmentType: string;
  workSetting: string | null;
  validFrom: string;
}

export interface LinkedWorkerSummaryDto {
  id: string;
  userId: string;
  fullName: string | null;
  phone: string | null;
  profileStatus: string;
  employmentStatus: string;
  accountUserId: string | null;
  activeAssignment: ActiveAssignmentSummaryDto | null;
}

export interface CandidateUserOptionDto {
  id: string;
  name: string | null;
  phone: string | null;
  phoneVerified: boolean;
  isActive: boolean;
  matchedByPhone: boolean;
}

export interface UserOnboardingContextDto {
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    phoneVerified: boolean;
    role: string;
    isActive: boolean;
  };
  linkedWorker: LinkedWorkerSummaryDto | null;
  matchingWorkers: LinkedWorkerSummaryDto[];
  openSlots: OpenSlotOptionDto[];
}

export interface WorkerAccountContextDto {
  worker: LinkedWorkerSummaryDto;
  linkedUser: CandidateUserOptionDto | null;
  candidateUsers: CandidateUserOptionDto[];
  openSlots: OpenSlotOptionDto[];
}

export interface OnboardWorkerByAdminInput {
  userId: string;
  workerId?: string | null;
  slotId?: string | null;
  employeeCode?: string | null;
  employmentType?: string | null;
  workSetting?: string | null;
  replaceActiveAssignment?: boolean;
  allowPhoneUpdate?: boolean;
  reason: string;
}

export interface LinkOrAssignWorkerAccountInput {
  workerId: string;
  userId?: string | null;
  autoVerifyAndActivate?: boolean;
  allowPhoneUpdate?: boolean;
  slotId?: string | null;
  employeeCode?: string | null;
  employmentType?: string | null;
  workSetting?: string | null;
  replaceActiveAssignment?: boolean;
  reason: string;
}

export interface OnboardWorkerResultDto {
  userId: string;
  phoneVerified: boolean;
  workerId: string;
  workerCode: string;
  workerCreated: boolean;
  profileStatus: string;
  employmentStatus: string;
  assignment: ActiveAssignmentSummaryDto | null;
}

function assertAdmin(ctx: AuthContext): void {
  if (ctx.role !== 'ADMIN') {
    throw new WorkerOnboardingError(
      'FORBIDDEN',
      403,
      'Chỉ Quản trị viên (ADMIN) được thực hiện thao tác này.',
    );
  }
}

function requireReason(raw: string | undefined | null): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed || trimmed.length > 500) {
    throw new WorkerOnboardingError(
      'VALIDATION_ERROR',
      400,
      'Vui lòng nhập lý do kiểm toán hợp lệ (tối đa 500 ký tự).',
    );
  }
  return trimmed;
}

function phoneCandidates(phone: string | null | undefined): string[] {
  if (!phone) return [];
  const norm = normalizePhone(phone);
  const withoutZero = norm.replace(/^0/, '');
  return [...new Set([phone.trim(), norm, withoutZero].filter(Boolean))];
}

/**
 * Đọc danh sách các vị trí tuyển dụng (StaffingOrderSlot) đang mở trên các đơn hàng OPEN
 * thuộc dự án ACTIVE. Chỉ dùng scalar select để tuân thủ static RLS relation sweep.
 */
export async function listOpenSlotsForAdmin(
  tx: Prisma.TransactionClient,
): Promise<OpenSlotOptionDto[]> {
  if (!tx.project?.findMany || !tx.staffingOrder?.findMany || !tx.staffingOrderSlot?.findMany) {
    return [];
  }

  const now = new Date();
  const activeProjects = await tx.project.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      code: true,
      name: true,
      quota: true,
      filled: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  if (activeProjects.length === 0) return [];

  const projectMap = new Map(activeProjects.map((p) => [p.id, p]));
  const openOrders = await tx.staffingOrder.findMany({
    where: {
      status: 'OPEN',
      projectId: { in: activeProjects.map((p) => p.id) },
    },
    select: {
      id: true,
      code: true,
      title: true,
      projectId: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  if (openOrders.length === 0) return [];

  const orderMap = new Map(openOrders.map((o) => [o.id, o]));
  const slots = await tx.staffingOrderSlot.findMany({
    where: {
      staffingOrderId: { in: openOrders.map((o) => o.id) },
      OR: [{ validTo: null }, { validTo: { gt: now } }],
    },
    select: {
      id: true,
      staffingOrderId: true,
      positionCode: true,
      positionTitle: true,
      workLocation: true,
      slotsNeeded: true,
      slotsFilled: true,
      validFrom: true,
      validTo: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  const out: OpenSlotOptionDto[] = [];
  for (const s of slots) {
    const order = orderMap.get(s.staffingOrderId);
    if (!order) continue;
    const project = projectMap.get(order.projectId);
    if (!project) continue;
    const remaining = Math.max(0, s.slotsNeeded - s.slotsFilled);
    const projectRemaining = Math.max(0, project.quota - project.filled);
    if (remaining <= 0 || projectRemaining <= 0) continue;
    out.push({
      slotId: s.id,
      positionCode: s.positionCode,
      positionTitle: s.positionTitle,
      workLocation: s.workLocation ?? null,
      slotsNeeded: s.slotsNeeded,
      slotsFilled: s.slotsFilled,
      remaining,
      staffingOrderId: order.id,
      staffingOrderCode: order.code,
      staffingOrderTitle: order.title,
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      projectQuota: project.quota,
      projectFilled: project.filled,
      projectRemaining,
    });
  }
  return out;
}

async function hydrateWorkersWithActiveAssignment(
  tx: Prisma.TransactionClient,
  workers: Array<{
    id: string;
    userId: string;
    fullName: string | null;
    phone: string | null;
    profileStatus: string;
    employmentStatus: string;
    accountUserId: string | null;
  }>,
): Promise<LinkedWorkerSummaryDto[]> {
  if (workers.length === 0) return [];
  if (!tx.projectAssignment?.findMany || !tx.project?.findMany) {
    return workers.map((w) => ({ ...w, activeAssignment: null }));
  }

  const now = new Date();
  const assignments = await tx.projectAssignment.findMany({
    where: {
      workerId: { in: workers.map((w) => w.id) },
      status: 'ACTIVE',
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gt: now } }],
    },
    select: {
      id: true,
      workerId: true,
      projectId: true,
      staffingOrderId: true,
      staffingOrderSlotId: true,
      employeeCode: true,
      employmentType: true,
      workSetting: true,
      validFrom: true,
    },
    orderBy: { validFrom: 'desc' },
  });

  const projectIds = [...new Set(assignments.map((a) => a.projectId))];
  const projects =
    projectIds.length > 0
      ? await tx.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, code: true, name: true },
        })
      : [];
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const assignmentByWorker = new Map<string, ActiveAssignmentSummaryDto>();
  for (const a of assignments) {
    if (assignmentByWorker.has(a.workerId)) continue;
    const proj = projectMap.get(a.projectId);
    assignmentByWorker.set(a.workerId, {
      id: a.id,
      projectId: a.projectId,
      projectCode: proj?.code ?? a.projectId,
      projectName: proj?.name ?? a.projectId,
      staffingOrderId: a.staffingOrderId ?? null,
      staffingOrderSlotId: a.staffingOrderSlotId ?? null,
      employeeCode: a.employeeCode,
      employmentType: a.employmentType,
      workSetting: a.workSetting ?? null,
      validFrom: a.validFrom.toISOString(),
    });
  }

  return workers.map((w) => ({
    ...w,
    activeAssignment: assignmentByWorker.get(w.id) ?? null,
  }));
}

/**
 * Làm giàu danh sách User trong GET /api/admin/users với tóm tắt hồ sơ Worker + dự án đang làm.
 * Tương thích ngược hoàn toàn với các unit test chỉ mock `tx.user`.
 */
export async function enrichUsersWithWorkerSummary<
  T extends { id: string; role: string },
>(
  tx: Prisma.TransactionClient,
  users: T[],
): Promise<Array<T & { workerProfile?: LinkedWorkerSummaryDto | null }>> {
  if (users.length === 0 || !tx.worker?.findMany) {
    return users;
  }
  const workerUserIds = users.filter((u) => u.role === 'WORKER').map((u) => u.id);
  if (workerUserIds.length === 0) {
    return users;
  }

  const workers = await tx.worker.findMany({
    where: { accountUserId: { in: workerUserIds } },
    select: {
      id: true,
      userId: true,
      fullName: true,
      phone: true,
      profileStatus: true,
      employmentStatus: true,
      accountUserId: true,
    },
  });
  const hydrated = await hydrateWorkersWithActiveAssignment(tx, workers);
  const byAccountId = new Map<string, LinkedWorkerSummaryDto>();
  for (const w of hydrated) {
    if (w.accountUserId) byAccountId.set(w.accountUserId, w);
  }

  return users.map((u) =>
    u.role === 'WORKER'
      ? { ...u, workerProfile: byAccountId.get(u.id) ?? null }
      : u,
  );
}

/**
 * Lấy ngữ cảnh kích hoạt / gán dự án cho một tài khoản User (role=WORKER) tại `/admin/users`.
 */
export async function getUserOnboardingContext(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  userId: string,
): Promise<UserOnboardingContextDto> {
  assertAdmin(ctx);

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      phoneVerified: true,
      role: true,
      isActive: true,
    },
  });
  if (!user) {
    throw new WorkerOnboardingError('NOT_FOUND', 404, 'Không tìm thấy tài khoản người dùng.');
  }

  const linkedRaw = await tx.worker.findFirst({
    where: { accountUserId: user.id },
    select: {
      id: true,
      userId: true,
      fullName: true,
      phone: true,
      profileStatus: true,
      employmentStatus: true,
      accountUserId: true,
    },
  });
  const [linkedWorker] = linkedRaw
    ? await hydrateWorkersWithActiveAssignment(tx, [linkedRaw])
    : [null];

  const phones = phoneCandidates(user.phone);
  const matchingRaw =
    phones.length > 0
      ? await tx.worker.findMany({
          where: {
            accountUserId: null,
            phone: { in: phones },
          },
          select: {
            id: true,
            userId: true,
            fullName: true,
            phone: true,
            profileStatus: true,
            employmentStatus: true,
            accountUserId: true,
          },
          take: 10,
        })
      : [];
  const matchingWorkers = await hydrateWorkersWithActiveAssignment(tx, matchingRaw);
  const openSlots = await listOpenSlotsForAdmin(tx);

  return {
    user,
    linkedWorker: linkedWorker ?? null,
    matchingWorkers,
    openSlots,
  };
}

/**
 * Lấy ngữ cảnh liên kết tài khoản & phân công dự án cho một hồ sơ Worker tại `/admin/workers/[id]`.
 */
export async function getWorkerAccountContext(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  workerId: string,
): Promise<WorkerAccountContextDto> {
  assertAdmin(ctx);

  const workerRaw = await tx.worker.findUnique({
    where: { id: workerId },
    select: {
      id: true,
      userId: true,
      fullName: true,
      phone: true,
      profileStatus: true,
      employmentStatus: true,
      accountUserId: true,
    },
  });
  if (!workerRaw) {
    throw new WorkerOnboardingError('NOT_FOUND', 404, 'Không tìm thấy hồ sơ người lao động.');
  }

  const [worker] = await hydrateWorkersWithActiveAssignment(tx, [workerRaw]);

  let linkedUser: CandidateUserOptionDto | null = null;
  if (worker.accountUserId) {
    const u = await tx.user.findUnique({
      where: { id: worker.accountUserId },
      select: { id: true, name: true, phone: true, phoneVerified: true, isActive: true },
    });
    if (u) {
      linkedUser = { ...u, matchedByPhone: true };
    }
  }

  // Tìm các tài khoản WORKER chưa gắn với Worker nào
  const linkedWorkers = await tx.worker.findMany({
    where: { accountUserId: { not: null } },
    select: { accountUserId: true },
  });
  const takenUserIds = new Set(
    linkedWorkers.map((w) => w.accountUserId).filter((v): v is string => Boolean(v)),
  );

  const phones = phoneCandidates(worker.phone);
  const normWorkerPhone = worker.phone ? normalizePhone(worker.phone) : '';

  const recentWorkerUsers = await tx.user.findMany({
    where: {
      role: 'WORKER',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      phoneVerified: true,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const candidateUsers: CandidateUserOptionDto[] = recentWorkerUsers
    .filter((u) => !takenUserIds.has(u.id))
    .map((u) => {
      const normUserPhone = u.phone ? normalizePhone(u.phone) : '';
      const matchedByPhone = Boolean(
        (normWorkerPhone && normUserPhone && normWorkerPhone === normUserPhone) ||
          (u.phone && phones.includes(u.phone)),
      );
      return {
        id: u.id,
        name: u.name,
        phone: u.phone,
        phoneVerified: u.phoneVerified,
        isActive: u.isActive,
        matchedByPhone,
      };
    })
    .sort((a, b) => Number(b.matchedByPhone) - Number(a.matchedByPhone));

  const openSlots = await listOpenSlotsForAdmin(tx);

  return {
    worker,
    linkedUser,
    candidateUsers,
    openSlots,
  };
}

/**
 * Đảm bảo Worker có LaborProfile và SourceClaim (HRP_DIRECT / HR_ADDED) hợp lệ.
 */
async function ensureWorkerCanonicalProfileAndClaim(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  worker: { id: string; fullName: string | null; phone: string | null },
): Promise<{ laborProfileId: string | null }> {
  const normPhone = worker.phone ? normalizePhone(worker.phone) : '';
  const normNoZero = normPhone.replace(/^0/, '');

  let laborProfileId: string | null = null;
  if (tx.laborProfile) {
    const existingByWorker = await tx.laborProfile.findFirst({
      where: { workerId: worker.id },
      select: { id: true },
    });
    if (existingByWorker) {
      laborProfileId = existingByWorker.id;
    } else {
      const phones = phoneCandidates(worker.phone);
      const unlinkedProfile =
        phones.length > 0
          ? await tx.laborProfile.findFirst({
              where: {
                workerId: null,
                OR: [
                  { phone: { in: phones } },
                  ...(normNoZero ? [{ normalizedPhone: { in: [normNoZero, normPhone] } }] : []),
                ],
              },
              select: { id: true },
            })
          : null;

      if (unlinkedProfile) {
        await tx.laborProfile.updateMany({
          where: { id: unlinkedProfile.id, workerId: null },
          data: {
            workerId: worker.id,
            identityVerification: 'VERIFIED',
          },
        });
        laborProfileId = unlinkedProfile.id;
      } else {
        const createdProfile = await tx.laborProfile.create({
          data: {
            fullName: worker.fullName ?? (normPhone || 'Người lao động'),
            phone: normPhone || worker.phone,
            normalizedPhone: normNoZero || null,
            workerId: worker.id,
            identityVerification: 'VERIFIED',
            completeness: 'SUFFICIENT',
          },
          select: { id: true },
        });
        laborProfileId = createdProfile.id;
      }
    }
  }

  if (tx.sourceClaim) {
    const acceptedClaim = await tx.sourceClaim.findFirst({
      where: { workerId: worker.id, accepted: true },
      select: { id: true },
    });
    if (!acceptedClaim) {
      await tx.sourceClaim.create({
        data: {
          workerId: worker.id,
          claimType: 'HRP_DIRECT',
          registrationChannel: 'HR_ADDED',
          accepted: true,
          acceptedBy: ctx.userId,
          claimedBy: ctx.userId,
        },
        select: { id: true },
      });
    }
  }

  return { laborProfileId };
}

interface SlotLockRow {
  id: string;
  staffing_order_id: string;
  position_code: string;
  position_title: string;
  slots_needed: number;
  slots_filled: number;
  valid_from: Date;
  valid_to: Date | null;
}

/**
 * Gán trực tiếp Worker vào một vị trí tuyển dụng (StaffingOrderSlot) của dự án đang hoạt động.
 * Đảm bảo khóa đồng thời (worker advisory lock + slot FOR UPDATE), kiểm tra sức chứa,
 * cập nhật bộ đếm slotsFilled & project.filled, ghi AuditLog và OutboxEvent.
 */
async function assignWorkerToProjectSlotInTx(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  args: {
    workerId: string;
    laborProfileId: string | null;
    slotId: string;
    employeeCode: string;
    employmentType: string;
    workSetting: string | null;
    replaceActiveAssignment: boolean;
    reason: string;
  },
): Promise<ActiveAssignmentSummaryDto> {
  const employeeCode = args.employeeCode.trim();
  if (!employeeCode || employeeCode.length > 64) {
    throw new WorkerOnboardingError(
      'VALIDATION_ERROR',
      400,
      'Mã nhân viên tại dự án là bắt buộc và tối đa 64 ký tự.',
    );
  }
  const employmentType = args.employmentType.trim() as EmploymentType;
  if (!EMPLOYMENT_TYPES.includes(employmentType)) {
    throw new WorkerOnboardingError(
      'VALIDATION_ERROR',
      400,
      `Hình thức sử dụng lao động không hợp lệ (${EMPLOYMENT_TYPES.join(' | ')}).`,
    );
  }
  const rawWorkSetting =
    args.workSetting === null || args.workSetting === undefined || args.workSetting.trim() === ''
      ? null
      : args.workSetting.trim();
  if (rawWorkSetting !== null && !WORK_SETTINGS.includes(rawWorkSetting as WorkSetting)) {
    throw new WorkerOnboardingError(
      'VALIDATION_ERROR',
      400,
      `Môi trường làm việc không hợp lệ (${WORK_SETTINGS.join(' | ')}).`,
    );
  }

  const now = new Date();

  // 1. Khóa advisory trên worker theo đúng chuẩn placement/transfer
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1::text))`, args.workerId);

  // 2. Khóa dòng slot (FOR UPDATE)
  const slotRows = await tx.$queryRawUnsafe<SlotLockRow[]>(
    `SELECT id, staffing_order_id, position_code, position_title,
            slots_needed, slots_filled, valid_from, valid_to
       FROM staffing_order_slots
      WHERE id = $1
      FOR UPDATE`,
    args.slotId,
  );
  const slot = slotRows[0];
  if (!slot) {
    throw new WorkerOnboardingError(
      'SLOT_UNAVAILABLE',
      409,
      'Không tìm thấy vị trí tuyển dụng (slot) hoặc vị trí không khả dụng.',
    );
  }

  const order = await tx.staffingOrder.findUnique({
    where: { id: slot.staffing_order_id },
    select: { id: true, code: true, status: true, projectId: true },
  });
  if (!order || order.status !== 'OPEN') {
    throw new WorkerOnboardingError(
      'SLOT_UNAVAILABLE',
      409,
      'Đơn hàng nhân sự của vị trí này không còn mở (OPEN).',
    );
  }

  const project = await tx.project.findUnique({
    where: { id: order.projectId },
    select: { id: true, code: true, name: true, status: true, quota: true, filled: true },
  });
  if (!project || project.status !== 'ACTIVE') {
    throw new WorkerOnboardingError(
      'SLOT_UNAVAILABLE',
      409,
      'Dự án của vị trí này không ở trạng thái đang hoạt động (ACTIVE).',
    );
  }

  // Kiểm tra phân công ACTIVE hiện có của Worker
  const existingActive = await tx.projectAssignment.findFirst({
    where: {
      workerId: args.workerId,
      status: 'ACTIVE',
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gt: now } }],
    },
    select: {
      id: true,
      projectId: true,
      staffingOrderId: true,
      staffingOrderSlotId: true,
      employeeCode: true,
      employmentType: true,
      workSetting: true,
      validFrom: true,
    },
  });

  if (existingActive) {
    // Idempotent nếu đã phân công vào đúng slot này
    if (
      existingActive.projectId === project.id &&
      existingActive.staffingOrderSlotId === slot.id
    ) {
      return {
        id: existingActive.id,
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        staffingOrderId: existingActive.staffingOrderId ?? null,
        staffingOrderSlotId: existingActive.staffingOrderSlotId ?? null,
        employeeCode: existingActive.employeeCode,
        employmentType: existingActive.employmentType,
        workSetting: existingActive.workSetting ?? null,
        validFrom: existingActive.validFrom.toISOString(),
      };
    }

    if (!args.replaceActiveAssignment) {
      throw new WorkerOnboardingError(
        'ACTIVE_ASSIGNMENT_CONFLICT',
        409,
        'Người lao động đang có phân công ACTIVE ở dự án/vị trí khác. Hãy bật tùy chọn thay thế phân công hiện tại nếu muốn chuyển dự án.',
        {
          existingAssignmentId: existingActive.id,
          existingProjectId: existingActive.projectId,
          existingEmployeeCode: existingActive.employeeCode,
        },
      );
    }

    // Kết thúc phân công cũ và hoàn lại bộ đếm của phân công cũ
    await tx.projectAssignment.update({
      where: { id: existingActive.id },
      data: {
        status: 'ENDED',
        validTo: now,
        transferReason: args.reason,
      },
    });
    if (existingActive.staffingOrderSlotId) {
      await tx.$executeRawUnsafe(
        `UPDATE staffing_order_slots
            SET slots_filled = GREATEST(0, slots_filled - 1)
          WHERE id = $1`,
        existingActive.staffingOrderSlotId,
      );
    }
    await tx.$executeRawUnsafe(
      `UPDATE outsourcing_projects
          SET filled = GREATEST(0, filled - 1)
        WHERE id = $1`,
      existingActive.projectId,
    );
  }

  // Đọc lại số lượng slot/project nếu vừa hoàn bộ đếm trên cùng project/slot
  const slotsNeeded = Number(slot.slots_needed);
  const slotsFilled =
    existingActive?.staffingOrderSlotId === slot.id
      ? Math.max(0, Number(slot.slots_filled) - 1)
      : Number(slot.slots_filled);
  if (slotsFilled >= slotsNeeded) {
    throw new WorkerOnboardingError(
      'SLOT_UNAVAILABLE',
      409,
      `Vị trí "${slot.position_title}" đã đủ định biên (${slotsFilled}/${slotsNeeded}).`,
    );
  }

  const projectFilled =
    existingActive?.projectId === project.id
      ? Math.max(0, project.filled - 1)
      : project.filled;
  if (projectFilled >= project.quota) {
    throw new WorkerOnboardingError(
      'PROJECT_QUOTA_FULL',
      409,
      `Dự án "${project.name}" đã đủ định biên (${projectFilled}/${project.quota}).`,
    );
  }

  const codeClash = await tx.projectAssignment.findFirst({
    where: {
      projectId: project.id,
      employeeCode,
    },
    select: { id: true, workerId: true },
  });
  if (codeClash) {
    throw new WorkerOnboardingError(
      'EMPLOYEE_CODE_CONFLICT',
      409,
      `Mã nhân viên "${employeeCode}" đã được sử dụng trong dự án ${project.code}.`,
    );
  }

  const acceptedClaim = tx.sourceClaim
    ? await tx.sourceClaim.findFirst({
        where: { workerId: args.workerId, accepted: true },
        select: { id: true, referrerUserId: true },
      })
    : null;

  let beneficiaryUserId: string | null = null;
  if (args.laborProfileId && tx.laborProfileHandlingAssignment) {
    const activeHandling = await tx.laborProfileHandlingAssignment.findFirst({
      where: { laborProfileId: args.laborProfileId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { assigneeUserId: true },
    });
    beneficiaryUserId = activeHandling?.assigneeUserId ?? null;
  }

  const createdAssignment = await tx.projectAssignment.create({
    data: {
      workerId: args.workerId,
      projectId: project.id,
      staffingOrderId: slot.staffing_order_id,
      staffingOrderSlotId: slot.id,
      employeeCode,
      employmentType,
      workSetting: rawWorkSetting,
      validFrom: now,
      validTo: null,
      status: 'ACTIVE',
      isPrimary: true,
      referrerId: acceptedClaim?.referrerUserId ?? null,
    },
    select: {
      id: true,
      projectId: true,
      staffingOrderId: true,
      staffingOrderSlotId: true,
      employeeCode: true,
      employmentType: true,
      workSetting: true,
      validFrom: true,
    },
  });

  const slotAfter = await tx.staffingOrderSlot.update({
    where: { id: slot.id },
    data: { slotsFilled: { increment: 1 } },
    select: { slotsFilled: true, slotsNeeded: true },
  });
  if (slotAfter.slotsFilled > slotAfter.slotsNeeded) {
    throw new WorkerOnboardingError(
      'SLOT_UNAVAILABLE',
      409,
      'Vị trí tuyển dụng vừa đầy định biên, vui lòng chọn vị trí khác.',
    );
  }

  const projectAfter = await tx.project.update({
    where: { id: project.id },
    data: { filled: { increment: 1 } },
    select: { filled: true, quota: true },
  });
  if (projectAfter.filled > projectAfter.quota) {
    throw new WorkerOnboardingError(
      'PROJECT_QUOTA_FULL',
      409,
      'Dự án vừa đầy định biên, vui lòng kiểm tra lại quota dự án.',
    );
  }

  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: 'ProjectAssignment',
    entityId: createdAssignment.id,
    action: 'ASSIGNMENT_ACTIVATE',
    reason: args.reason,
    diff: {
      before: {
        previousActiveAssignmentId: existingActive?.id ?? null,
        slotsFilled,
        projectFilled,
      },
      after: {
        assignmentId: createdAssignment.id,
        status: 'ACTIVE',
        workerId: args.workerId,
        slotId: slot.id,
        staffingOrderId: slot.staffing_order_id,
        projectId: project.id,
        employeeCode,
        employmentType,
        workSetting: rawWorkSetting,
        slotsFilled: slotAfter.slotsFilled,
        projectFilled: projectAfter.filled,
        referrerId: acceptedClaim?.referrerUserId ?? null,
        beneficiaryUserId,
        laborProfileId: args.laborProfileId,
      },
    },
    metadata: { method: 'ADMIN_DIRECT_ONBOARD' },
  });

  await enqueueOutbox(tx, {
    eventType: 'AssignmentActivated',
    aggregateId: createdAssignment.id,
    payload: {
      assignmentId: createdAssignment.id,
      submissionId: null,
      workerId: args.workerId,
      slotId: slot.id,
      staffingOrderId: slot.staffing_order_id,
      projectId: project.id,
      employeeCode,
      employmentType,
      validFrom: now.toISOString(),
      activatedBy: ctx.userId,
      referrerId: acceptedClaim?.referrerUserId ?? null,
      beneficiaryUserId,
      laborProfileId: args.laborProfileId,
    },
  });

  return {
    id: createdAssignment.id,
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    staffingOrderId: createdAssignment.staffingOrderId ?? null,
    staffingOrderSlotId: createdAssignment.staffingOrderSlotId ?? null,
    employeeCode: createdAssignment.employeeCode,
    employmentType: createdAssignment.employmentType,
    workSetting: createdAssignment.workSetting ?? null,
    validFrom: createdAssignment.validFrom.toISOString(),
  };
}

/**
 * Thao tác toàn trình từ phía `/admin/users`:
 *   1. Xác minh SĐT thủ công cho tài khoản WORKER (nếu chưa xác minh).
 *   2. Tìm hoặc tạo mới hồ sơ Worker chuẩn (USR-EMP-xxx) và liên kết `accountUserId = user.id`.
 *   3. Kích hoạt trạng thái `profileStatus = 'VERIFIED'`, `employmentStatus = 'ACTIVE'`.
 *   4. Đảm bảo `LaborProfile` + `SourceClaim` chuẩn.
 *   5. Nếu có `slotId`, phân công trực tiếp vào dự án / vị trí tuyển dụng ngay trong cùng giao dịch.
 */
export async function onboardWorkerAccountByAdmin(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: OnboardWorkerByAdminInput,
  requestMeta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<OnboardWorkerResultDto> {
  assertAdmin(ctx);
  const reason = requireReason(input.reason);

  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      name: true,
      phone: true,
      phoneVerified: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });
  if (!user || user.role !== 'WORKER' || !user.isActive || !user.phone) {
    throw new WorkerOnboardingError(
      'USER_NOT_READY',
      409,
      'Chỉ tài khoản WORKER đang hoạt động và có số điện thoại mới có thể kích hoạt NLĐ.',
    );
  }

  const normPhone = normalizePhone(user.phone);
  const now = new Date();

  // 1. Tự động xác minh SĐT nếu chưa xác minh
  if (!user.phoneVerified) {
    await tx.user.update({
      where: { id: user.id },
      data: { phoneVerified: true, phoneVerifiedAt: now },
    });
    await writeAuditLog({
      prisma: tx,
      actor: { id: ctx.userId, role: ctx.role, ...requestMeta },
      entityType: 'User',
      entityId: user.id,
      action: 'PHONE_VERIFIED_MANUALLY',
      diff: { before: { phoneVerified: false }, after: { phoneVerified: true } },
      reason,
      metadata: { method: 'ADMIN_ONBOARD_WORKER' },
    });
  }

  // 2. Tìm hoặc tạo hồ sơ Worker và liên kết accountUserId
  let worker = await tx.worker.findFirst({
    where: { accountUserId: user.id },
    select: {
      id: true,
      userId: true,
      fullName: true,
      phone: true,
      profileStatus: true,
      employmentStatus: true,
      accountUserId: true,
    },
  });
  let workerCreated = false;

  if (!worker && input.workerId) {
    const selected = await tx.worker.findUnique({
      where: { id: input.workerId },
      select: {
        id: true,
        userId: true,
        fullName: true,
        phone: true,
        profileStatus: true,
        employmentStatus: true,
        accountUserId: true,
      },
    });
    if (!selected) {
      throw new WorkerOnboardingError('NOT_FOUND', 404, 'Không tìm thấy hồ sơ Worker được chọn.');
    }
    if (selected.accountUserId && selected.accountUserId !== user.id) {
      throw new WorkerOnboardingError(
        'ALREADY_LINKED',
        409,
        'Hồ sơ Worker này đã được liên kết với một tài khoản đăng nhập khác.',
      );
    }
    if (
      selected.phone &&
      normalizePhone(selected.phone) !== normPhone &&
      !input.allowPhoneUpdate
    ) {
      throw new WorkerOnboardingError(
        'PHONE_MISMATCH',
        409,
        'Số điện thoại của hồ sơ Worker không khớp với tài khoản. Bật xác nhận đồng bộ SĐT nếu muốn cập nhật.',
      );
    }
    worker = selected;
  }

  if (!worker) {
    const phones = phoneCandidates(user.phone);
    const matches = await tx.worker.findMany({
      where: {
        accountUserId: null,
        phone: { in: phones },
      },
      select: {
        id: true,
        userId: true,
        fullName: true,
        phone: true,
        profileStatus: true,
        employmentStatus: true,
        accountUserId: true,
      },
      take: 2,
    });
    if (matches.length === 1) {
      worker = matches[0];
    }
  }

  if (!worker) {
    const workerCode = await nextBusinessCode(tx, 'WORKER_USER_ID');
    worker = await tx.worker.create({
      data: {
        userId: workerCode,
        fullName: user.name?.trim() || normPhone,
        phone: normPhone,
        profileStatus: 'VERIFIED',
        employmentStatus: 'ACTIVE',
        riskStatus: 'NORMAL',
        accountUserId: user.id,
        ownerId: ctx.userId,
        assignedToId: ctx.userId,
      },
      select: {
        id: true,
        userId: true,
        fullName: true,
        phone: true,
        profileStatus: true,
        employmentStatus: true,
        accountUserId: true,
      },
    });
    workerCreated = true;

    await writeAuditLog({
      prisma: tx,
      actor: { id: ctx.userId, role: ctx.role, ...requestMeta },
      entityType: 'Worker',
      entityId: worker.id,
      action: 'WORKER_CREATED_BY_ADMIN_ONBOARD',
      diff: {
        before: null,
        after: {
          userId: worker.userId,
          fullName: worker.fullName,
          phone: worker.phone,
          profileStatus: 'VERIFIED',
          employmentStatus: 'ACTIVE',
          accountUserId: user.id,
        },
      },
      reason,
      metadata: { linkedUserId: user.id },
    });
  } else {
    const previousAccountUserId = worker.accountUserId;
    const prevProfileStatus = worker.profileStatus;
    const prevEmploymentStatus = worker.employmentStatus;
    const shouldUpdatePhone = !worker.phone || Boolean(input.allowPhoneUpdate);

    worker = await tx.worker.update({
      where: { id: worker.id },
      data: {
        accountUserId: user.id,
        profileStatus: 'VERIFIED',
        employmentStatus: 'ACTIVE',
        ...(shouldUpdatePhone ? { phone: normPhone } : {}),
        ...(worker.fullName ? {} : { fullName: user.name?.trim() || normPhone }),
      },
      select: {
        id: true,
        userId: true,
        fullName: true,
        phone: true,
        profileStatus: true,
        employmentStatus: true,
        accountUserId: true,
      },
    });

    if (previousAccountUserId !== user.id) {
      await writeAuditLog({
        prisma: tx,
        actor: { id: ctx.userId, role: ctx.role, ...requestMeta },
        entityType: 'Worker',
        entityId: worker.id,
        action: 'LOGIN_ACCOUNT_LINKED',
        diff: {
          before: {
            accountUserId: previousAccountUserId,
            profileStatus: prevProfileStatus,
            employmentStatus: prevEmploymentStatus,
          },
          after: {
            accountUserId: user.id,
            profileStatus: 'VERIFIED',
            employmentStatus: 'ACTIVE',
          },
        },
        reason,
        metadata: { linkedUserId: user.id },
      });
    } else if (prevProfileStatus !== 'VERIFIED' || prevEmploymentStatus !== 'ACTIVE') {
      await writeAuditLog({
        prisma: tx,
        actor: { id: ctx.userId, role: ctx.role, ...requestMeta },
        entityType: 'Worker',
        entityId: worker.id,
        action: 'WORKER_ACTIVATED_BY_ADMIN',
        diff: {
          before: { profileStatus: prevProfileStatus, employmentStatus: prevEmploymentStatus },
          after: { profileStatus: 'VERIFIED', employmentStatus: 'ACTIVE' },
        },
        reason,
        metadata: { linkedUserId: user.id },
      });
    }
  }

  // 3. Đảm bảo LaborProfile & SourceClaim chuẩn
  const { laborProfileId } = await ensureWorkerCanonicalProfileAndClaim(tx, ctx, worker);

  // 4. Phân công dự án nếu Admin chọn slotId
  let assignment: ActiveAssignmentSummaryDto | null = null;
  if (input.slotId && input.slotId.trim()) {
    assignment = await assignWorkerToProjectSlotInTx(tx, ctx, {
      workerId: worker.id,
      laborProfileId,
      slotId: input.slotId.trim(),
      employeeCode: input.employeeCode ?? '',
      employmentType: input.employmentType ?? 'HRP_EMPLOYED',
      workSetting: input.workSetting ?? 'PHOTHONG',
      replaceActiveAssignment: Boolean(input.replaceActiveAssignment),
      reason,
    });
  } else {
    const [hydrated] = await hydrateWorkersWithActiveAssignment(tx, [worker]);
    assignment = hydrated?.activeAssignment ?? null;
  }

  return {
    userId: user.id,
    phoneVerified: true,
    workerId: worker.id,
    workerCode: worker.userId,
    workerCreated,
    profileStatus: worker.profileStatus,
    employmentStatus: worker.employmentStatus,
    assignment,
  };
}

/**
 * Liên kết tài khoản đăng nhập và/hoặc kích hoạt + gán dự án từ phía `/admin/workers/[id]`.
 * Gỡ bỏ rào cản cứng nhắc trước đây (bắt buộc phải có assignment trước mới cho liên kết tài khoản):
 * Admin có toàn quyền liên kết tài khoản (tự động xác minh SĐT + chuyển trạng thái VERIFIED/ACTIVE)
 * và có thể phân công dự án ngay trong cùng thao tác.
 */
export async function linkOrAssignWorkerAccountByAdmin(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: LinkOrAssignWorkerAccountInput,
  requestMeta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<{
  workerId: string;
  userId: string | null;
  phoneVerified: boolean;
  profileStatus: string;
  employmentStatus: string;
  assignment: ActiveAssignmentSummaryDto | null;
}> {
  assertAdmin(ctx);
  const reason = requireReason(input.reason);
  const autoVerifyAndActivate = input.autoVerifyAndActivate ?? true;

  const worker = await tx.worker.findUnique({
    where: { id: input.workerId },
    select: {
      id: true,
      userId: true,
      fullName: true,
      phone: true,
      profileStatus: true,
      employmentStatus: true,
      accountUserId: true,
    },
  });
  if (!worker) {
    throw new WorkerOnboardingError('NOT_FOUND', 404, 'Không tìm thấy Worker.');
  }

  const targetUserId = input.userId?.trim() || worker.accountUserId || null;
  let phoneVerified = false;
  let linkedUserId: string | null = worker.accountUserId;

  if (targetUserId) {
    if (worker.accountUserId && worker.accountUserId !== targetUserId) {
      throw new WorkerOnboardingError(
        'ALREADY_LINKED',
        409,
        'Worker đã có tài khoản đăng nhập khác. Hãy gỡ liên kết cũ trước khi đổi tài khoản.',
      );
    }

    const user = await tx.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        phoneVerified: true,
        isActive: true,
        passwordHash: true,
      },
    });
    if (!user || user.role !== 'WORKER' || !user.isActive || !user.passwordHash) {
      throw new WorkerOnboardingError(
        'USER_NOT_READY',
        409,
        'Tài khoản phải là WORKER đang hoạt động và đã có mật khẩu.',
      );
    }

    const normUserPhone = user.phone ? normalizePhone(user.phone) : '';
    const normWorkerPhone = worker.phone ? normalizePhone(worker.phone) : '';
    if (
      (!normWorkerPhone || !normUserPhone || normWorkerPhone !== normUserPhone) &&
      !input.allowPhoneUpdate
    ) {
      throw new WorkerOnboardingError(
        'PHONE_MISMATCH',
        409,
        'Số điện thoại tài khoản không khớp hồ sơ Worker.',
      );
    }

    if (autoVerifyAndActivate && user.phone && !user.phoneVerified) {
      const now = new Date();
      await tx.user.update({
        where: { id: user.id },
        data: { phoneVerified: true, phoneVerifiedAt: now },
      });
      await writeAuditLog({
        prisma: tx,
        actor: { id: ctx.userId, role: ctx.role, ...requestMeta },
        entityType: 'User',
        entityId: user.id,
        action: 'PHONE_VERIFIED_MANUALLY',
        diff: { before: { phoneVerified: false }, after: { phoneVerified: true } },
        reason,
        metadata: { method: 'ADMIN_WORKER_ACCOUNT_LINK', workerId: worker.id },
      });
      phoneVerified = true;
    } else {
      phoneVerified = Boolean(user.phoneVerified);
    }

    linkedUserId = user.id;

    if (worker.accountUserId !== user.id) {
      const nextProfileStatus = autoVerifyAndActivate ? 'VERIFIED' : worker.profileStatus;
      const nextEmploymentStatus = autoVerifyAndActivate ? 'ACTIVE' : worker.employmentStatus;
      const updated = await tx.worker.updateMany({
        where: { id: worker.id, accountUserId: null },
        data: {
          accountUserId: user.id,
          profileStatus: nextProfileStatus,
          employmentStatus: nextEmploymentStatus,
          ...(input.allowPhoneUpdate && normUserPhone ? { phone: normUserPhone } : {}),
        },
      });
      if (updated.count !== 1) {
        throw new WorkerOnboardingError(
          'CONCURRENT_CHANGE',
          409,
          'Worker vừa được liên kết hoặc thay đổi; hãy tải lại.',
        );
      }

      await writeAuditLog({
        prisma: tx,
        actor: { id: ctx.userId, role: ctx.role, ...requestMeta },
        entityType: 'Worker',
        entityId: worker.id,
        action: 'LOGIN_ACCOUNT_LINKED',
        diff: {
          before: { accountUserId: null },
          after: { accountUserId: user.id },
        },
        reason,
        metadata: { linkedUserId: user.id },
      });
      worker.accountUserId = user.id;
      worker.profileStatus = nextProfileStatus;
      worker.employmentStatus = nextEmploymentStatus;
    } else if (
      autoVerifyAndActivate &&
      (worker.profileStatus !== 'VERIFIED' || worker.employmentStatus !== 'ACTIVE')
    ) {
      await tx.worker.update({
        where: { id: worker.id },
        data: { profileStatus: 'VERIFIED', employmentStatus: 'ACTIVE' },
      });
      await writeAuditLog({
        prisma: tx,
        actor: { id: ctx.userId, role: ctx.role, ...requestMeta },
        entityType: 'Worker',
        entityId: worker.id,
        action: 'WORKER_ACTIVATED_BY_ADMIN',
        diff: {
          before: {
            profileStatus: worker.profileStatus,
            employmentStatus: worker.employmentStatus,
          },
          after: { profileStatus: 'VERIFIED', employmentStatus: 'ACTIVE' },
        },
        reason,
        metadata: { linkedUserId: user.id },
      });
      worker.profileStatus = 'VERIFIED';
      worker.employmentStatus = 'ACTIVE';
    }
  } else if (
    autoVerifyAndActivate &&
    (worker.profileStatus !== 'VERIFIED' || worker.employmentStatus !== 'ACTIVE')
  ) {
    await tx.worker.update({
      where: { id: worker.id },
      data: { profileStatus: 'VERIFIED', employmentStatus: 'ACTIVE' },
    });
    await writeAuditLog({
      prisma: tx,
      actor: { id: ctx.userId, role: ctx.role, ...requestMeta },
      entityType: 'Worker',
      entityId: worker.id,
      action: 'WORKER_ACTIVATED_BY_ADMIN',
      diff: {
        before: {
          profileStatus: worker.profileStatus,
          employmentStatus: worker.employmentStatus,
        },
        after: { profileStatus: 'VERIFIED', employmentStatus: 'ACTIVE' },
      },
      reason,
    });
    worker.profileStatus = 'VERIFIED';
    worker.employmentStatus = 'ACTIVE';
  }

  let assignment: ActiveAssignmentSummaryDto | null = null;
  if (input.slotId && input.slotId.trim()) {
    const { laborProfileId } = await ensureWorkerCanonicalProfileAndClaim(tx, ctx, worker);
    assignment = await assignWorkerToProjectSlotInTx(tx, ctx, {
      workerId: worker.id,
      laborProfileId,
      slotId: input.slotId.trim(),
      employeeCode: input.employeeCode ?? '',
      employmentType: input.employmentType ?? 'HRP_EMPLOYED',
      workSetting: input.workSetting ?? 'PHOTHONG',
      replaceActiveAssignment: Boolean(input.replaceActiveAssignment),
      reason,
    });
  } else {
    const [hydrated] = await hydrateWorkersWithActiveAssignment(tx, [worker]);
    assignment = hydrated?.activeAssignment ?? null;
  }

  return {
    workerId: worker.id,
    userId: linkedUserId,
    phoneVerified,
    profileStatus: worker.profileStatus,
    employmentStatus: worker.employmentStatus,
    assignment,
  };
}

/**
 * Gỡ liên kết tài khoản đăng nhập khỏi hồ sơ Worker (ADMIN only, có ghi AuditLog).
 */
export async function unlinkWorkerAccountByAdmin(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  args: { workerId: string; reason: string },
  requestMeta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<{ workerId: string; unlinkedUserId: string | null }> {
  assertAdmin(ctx);
  const reason = requireReason(args.reason);

  const worker = await tx.worker.findUnique({
    where: { id: args.workerId },
    select: { id: true, accountUserId: true },
  });
  if (!worker) {
    throw new WorkerOnboardingError('NOT_FOUND', 404, 'Không tìm thấy Worker.');
  }
  if (!worker.accountUserId) {
    return { workerId: worker.id, unlinkedUserId: null };
  }

  const previousUserId = worker.accountUserId;
  await tx.worker.update({
    where: { id: worker.id },
    data: { accountUserId: null },
  });

  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role, ...requestMeta },
    entityType: 'Worker',
    entityId: worker.id,
    action: 'LOGIN_ACCOUNT_UNLINKED',
    diff: {
      before: { accountUserId: previousUserId },
      after: { accountUserId: null },
    },
    reason,
    metadata: { unlinkedUserId: previousUserId },
  });

  return { workerId: worker.id, unlinkedUserId: previousUserId };
}
