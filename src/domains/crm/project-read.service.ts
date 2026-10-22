import type { Prisma } from '@prisma/client';
import type { SiteGpsDto } from './site-gps.service';
import { listProjectSites } from './site-gps.service'; import { listProjectShifts, type ProjectShiftDto } from './project-shift.service';

export interface ProjectDetailStaffingOrderDto {
  id: string;
  code: string;
  title: string;
  status: string;
  slots: {
    id: string;
    positionTitle: string;
    jobOpeningId: string | null;
  }[];
}

export interface ProjectDetailDto {
  id: string;
  code: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  clientCompany: {
    id: string;
    name: string;
  };
  staffingOrders: ProjectDetailStaffingOrderDto[];
  metrics: {
    assignmentsCount: number;
    submissionsCount: number;
  };
}

export async function getProjectDetail(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<ProjectDetailDto | null> {
  const project = await tx.project.findUnique({
    where: { id },
    include: {
      clientCompany: { select: { id: true, name: true } },
      staffingOrders: {
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          slots: {
            select: {
              id: true,
              positionTitle: true,
              jobOpeningId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) return null;

  const assignmentsCount = await tx.projectAssignment.count({
    where: { projectId: id },
  });

  const submissionsCount = await tx.candidateSubmission.count({
    where: { projectId: id },
  });

  return {
    id: project.id,
    code: project.code,
    name: project.name,
    status: project.status,
    startDate: project.startDate.toISOString(),
    endDate: project.endDate?.toISOString() ?? null,
    clientCompany: project.clientCompany,
    staffingOrders: project.staffingOrders,
    metrics: {
      assignmentsCount,
      submissionsCount,
    },
  };
}

// ─── PRE-P2 PROJECT MANAGEMENT HOTFIX (T1A) ───────────────────────────────
// Surface mở rộng cho trang quản trị dự án — vẫn RLS-scoped (qua
// `withDbContext`), không thêm quyền, không mở rộng scope.

export interface ProjectDetailSlotDto {
  id: string;
  positionTitle: string;
  jobOpeningId: string | null;
}

export interface ProjectDetailStaffingOrderFullDto {
  id: string;
  code: string;
  title: string;
  status: string;
  slots: ProjectDetailSlotDto[];
}

export interface ProjectManagementDto {
  id: string;
  code: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  siteAddress: string | null;
  quota: number;
  filled: number;
  version: number;
  isPublic: boolean;
  clientCompany: { id: string; name: string };
  /** StaffingOrders + slots (jobOpeningId surfaced for the openings section). */
  staffingOrders: ProjectDetailStaffingOrderFullDto[];
  metrics: {
    assignmentsCount: number;
    submissionsCount: number;
    sitesCount: number;
  };
  // T1A GPS contract: Site DTO với trạng thái xác nhận GPS (CONFIRMED/UNCONFIRMED/MISSING_GEO) cho admin panel.
  sites: SiteGpsDto[];
  shifts: ProjectShiftDto[];
}

/**
 * Lấy đầy đủ thông tin quản trị Dự án cho trang /admin/projects/[id].
 *   - Dữ liệu READ-ONLY, không mutate.
 *   - Trả về null khi project không tồn tại / ngoài scope (RLS backstop
 *     trong `withDbContext` sẽ biến row "outside scope" thành không thấy).
 *   - Bổ sung `filled` + `quota` + `version` để UI hiển thị chỉ tiêu + site
 *     + optimistic guard tương lai. KHÔNG thêm field ngoài Prisma model.
 */
export async function getProjectForManagement(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<ProjectManagementDto | null> {
  const project = await tx.project.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      siteAddress: true,
      quota: true,
      filled: true,
      version: true,
      isPublic: true,
      clientCompany: { select: { id: true, name: true } },
      staffingOrders: {
        select: {
            id: true,
            code: true,
            title: true,
            status: true,
            slots: {
              select: { id: true, positionTitle: true, jobOpeningId: true },
            },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) return null;

  // T1A GPS contract: fetch sites một lần với trạng thái xác nhận GPS —
  // vừa thay thế cũ `tx.site.count`, vừa nuôi admin GPS section (RQ-02/05).
  const [assignmentsCount, submissionsCount, sites, shifts] = await Promise.all([
    tx.projectAssignment.count({ where: { projectId: id } }),
    tx.candidateSubmission.count({ where: { projectId: id } }),
    listProjectSites(tx, id),
    listProjectShifts(tx, id),
  ]);

  return {
    id: project.id,
    code: project.code,
    name: project.name,
    status: project.status,
    startDate: project.startDate.toISOString(),
    endDate: project.endDate?.toISOString() ?? null,
    siteAddress: project.siteAddress,
    quota: project.quota,
    filled: project.filled,
    version: project.version,
    isPublic: project.isPublic,
    clientCompany: project.clientCompany,
    staffingOrders: project.staffingOrders,
    metrics: { assignmentsCount, submissionsCount, sitesCount: sites.length },
    sites,
    shifts,
  };
}
