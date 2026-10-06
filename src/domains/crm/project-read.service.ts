import { Prisma } from '@prisma/client';

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
