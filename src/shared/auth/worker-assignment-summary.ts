/**
 * worker-assignment-summary.ts — T1A Android backend mobile contract (TASK DEC-02/03).
 *
 * Summary USER-SERVED cho mobile client: WORKER self + assignment hiện hành
 * (ACTIVE) — employee code từ ProjectAssignment, position từ
 * StaffingOrderSlot.positionTitle, location từ Project + Sites của project.
 *
 * USAGE / IDENTITY:
 *   - CHỈ chạy cho userId đã VERIFY (login sau verifyPassword, hoặc
 *     getAuthContext đã verify JWT). KHÔNG nhận identity tường minh từ client.
 *   - Đọc dưới GUC WORKER self (withDbContext) — RLS:
 *       workers WORKER self-branch + project_assignments WORKER branch +
 *       hrp_project_visible_for (project/site qua ACTIVE assignment).
 *     => KHÔNG elevation SYSTEM — đọc đúng tầm nhìn RLS của chính worker.
 *
 * DEPARTMENT NOTE: schema không có department canonical — không tự gán
 * workLocation/projectName thành department. Caller trả `department: null`.
 * (Sản phẩm: BLK-03 cho T0/Owner trên HANDOFF.)
 */
import type { Prisma, ProjectAssignment } from '@prisma/client';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from './with-db-context';

export interface WorkerAssignmentSite {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
}

export interface WorkerAssignmentSummary {
  id: string;
  projectId: string;
  projectName: string | null;
  projectCode: string | null;
  employeeCode: string;
  employmentType: string;
  workSetting: string | null;
  position: string | null;
  validFrom: string;
  validTo: string | null;
  sites: WorkerAssignmentSite[];
}

export interface WorkerSelfSummary {
  id: string;
  fullName: string | null;
  assignment: WorkerAssignmentSummary | null;
}

function serializeDate(v: Date | null): string | null {
  return v == null ? null : v.toISOString();
}

function decimalToNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type ProjectAssignmentWithSummary = Pick<
  ProjectAssignment,
  'id' | 'projectId' | 'employeeCode' | 'employmentType' | 'workSetting' | 'validFrom' | 'validTo'
> & {
  project: { name: string; code: string } | null;
  staffingOrderSlot: { positionTitle: string } | null;
};

/**
 * Đọc summary trong MỘT transaction đã set GUC WORKER self (đã có sẵn `tx`
 * từ caller — dùng trong login bootstrap hoặc /api/workers/me).
 * Trả null khi user chưa có Worker profile (login vẫn OK — client dùng /me).
 */
export async function loadWorkerSelfSummaryInTx(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<WorkerSelfSummary | null> {
  const worker = await tx.worker.findUnique({
    where: { accountUserId: userId },
    select: { id: true, fullName: true },
  });
  if (!worker) return null;

  // Assignment hiện hành: ACTIVE, một worker chỉ một ACTIVE tại một thời điểm
  // (isPrimary invariant G14) — mới nhất nếu có nhiều (defensive ordering).
  const assignment = (await tx.projectAssignment.findFirst({
    where: { workerId: worker.id, status: 'ACTIVE' },
    orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      projectId: true,
      employeeCode: true,
      employmentType: true,
      workSetting: true,
      validFrom: true,
      validTo: true,
      project: { select: { name: true, code: true } },
      staffingOrderSlot: { select: { positionTitle: true } },
    },
  })) as ProjectAssignmentWithSummary | null;

  if (!assignment) {
    return { id: worker.id, fullName: worker.fullName, assignment: null };
  }

  // Sites của project hiện hành (check-in geofence dùng đến list này; profile
  // trả cho Android hiển thị — geofence vẫn dùng TẤT CẢ sites của project).
  const sites = await tx.site.findMany({
    where: { projectId: assignment.projectId },
    orderBy: [{ createdAt: 'asc' }],
    select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true },
  });

  return {
    id: worker.id,
    fullName: worker.fullName,
    assignment: {
      id: assignment.id,
      projectId: assignment.projectId,
      projectName: assignment.project?.name ?? null,
      projectCode: assignment.project?.code ?? null,
      employeeCode: assignment.employeeCode,
      employmentType: assignment.employmentType,
      workSetting: assignment.workSetting,
      position: assignment.staffingOrderSlot?.positionTitle ?? null,
      validFrom: serializeDate(assignment.validFrom) ?? '',
      validTo: serializeDate(assignment.validTo),
      sites: sites.map((s) => ({
        id: s.id,
        name: s.name,
        latitude: decimalToNumber(s.latitude),
        longitude: decimalToNumber(s.longitude),
        radiusMeters: s.radiusMeters,
      })),
    },
  };
}

/**
 * Version top-level tự dựng transaction — dùng trong login (sau verifyPassword,
 * userId verified): bootstrap GUC WORKER self đúng pattern getAuthContext.
 */
export async function loadWorkerSelfSummary(userId: string): Promise<WorkerSelfSummary | null> {
  const prisma = getPrisma();
  return withDbContext(prisma, { userId, role: 'WORKER' as const }, (tx) =>
    loadWorkerSelfSummaryInTx(tx, userId),
  );
}
