import { Prisma } from '@prisma/client';
import type { AuthContext } from '../../shared/auth/auth-context';

export interface ClientDetailProjectDto {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface ClientDetailDto {
  id: string;
  code: string;
  name: string;
  taxCode: string | null;
  industry: string | null;
  status: string;
  projects: ClientDetailProjectDto[];
  metrics: {
    ordersCount: number;
    slotsCount: number;
    openingsCount: number;
    assignmentsCount: number;
  };
}

export async function getClientDetail(
  tx: Prisma.TransactionClient,
  viewer: AuthContext,
  id: string,
): Promise<ClientDetailDto | null> {
  const client = await tx.clientCompany.findUnique({
    where: { id },
  });

  if (!client) {
    return null;
  }

  // W3 Guard: PM only sees Client if they have at least 1 visible project.
  // Because Project table has RLS, findFirst will only return visible projects.
  if (viewer.role === 'PM') {
    const visibleProject = await tx.project.findFirst({
      where: { clientCompanyId: id },
      select: { id: true },
    });
    if (!visibleProject) {
      return null;
    }
  }

  // Fetch visible projects (RLS applies automatically for non-ADMIN/HR_MANAGER if they use this endpoint,
  // but W3 UI audience is restricted. We just query projects and RLS does the rest).
  const projects = await tx.project.findMany({
    where: { clientCompanyId: id },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const projectIds = projects.map(p => p.id);

  // If there are no visible projects, metrics will be 0 naturally (for PMs),
  // but for ADMIN, they see all projects.
  let ordersCount = 0;
  let slotsCount = 0;
  let openingsCount = 0;
  let assignmentsCount = 0;

  if (projectIds.length > 0) {
    ordersCount = await tx.staffingOrder.count({
      where: { projectId: { in: projectIds } },
    });

    slotsCount = await tx.staffingOrderSlot.count({
      where: { staffingOrder: { projectId: { in: projectIds } } },
    });

    openingsCount = await tx.jobOpening.count({
      where: { staffingOrder: { projectId: { in: projectIds } } },
    });

    assignmentsCount = await tx.projectAssignment.count({
      where: { projectId: { in: projectIds } },
    });
  }

  return {
    id: client.id,
    code: client.code,
    name: client.name,
    taxCode: client.taxCode,
    industry: client.industry,
    status: client.status,
    projects,
    metrics: {
      ordersCount,
      slotsCount,
      openingsCount,
      assignmentsCount,
    },
  };
}
