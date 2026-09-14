/**
 * placement.resolution.ts — N3 (DEC-06) clientCompanyId resolution + classification helpers.
 *
 * Pure functions + một async helper resolveClientCompanyIdForJobOpening cần Prisma tx.
 *
 * Quy tắc (DEC-06):
 *   - Với Placement mới: clientCompanyId BẮT BUỘC resolve qua chain
 *     JobOpening → StaffingOrder → Project → ClientCompany.
 *   - Chain broken (thiếu FK ở bất kỳ bước nào) → REJECT với PlacementValidationError.
 *   - Cột nullable trên schema cho legacy rows; command createPlacement KHÔNG cho phép
 *     tạo Placement mới với clientCompanyId = NULL.
 */

import type { Prisma, ServiceModel } from '@prisma/client';
import { PlacementValidationError } from './placement.errors';
import { computeManagementMode } from './placement.lifecycle';

/** JobOpening phải có staffingOrderId + serviceModel (legacy NULL → reject — DEC-10). */
export interface ClassifiedJobOpening {
  id: string;
  staffingOrderId: string;
  serviceModel: ServiceModel; // đã classify (không NULL)
}

/** Assert JobOpening đã được classify (DEC-10). Nếu NULL → throw. */
export function assertClassifiedJobOpening(
  jobOpening: { id: string; staffingOrderId: string | null; serviceModel: ServiceModel | null },
): asserts jobOpening is ClassifiedJobOpening {
  if (!jobOpening.staffingOrderId) {
    throw new PlacementValidationError(
      `JobOpening ${jobOpening.id} thiếu staffingOrderId — không thể tạo Placement mới`,
      { jobOpeningId: jobOpening.id },
    );
  }
  if (jobOpening.serviceModel === null) {
    throw new PlacementValidationError(
      `JobOpening ${jobOpening.id} chưa phân loại ServiceModel — Owner phải classify trước khi tạo Placement`,
      { jobOpeningId: jobOpening.id },
    );
  }
}

export interface ResolvedClientCompany {
  clientCompanyId: string;
  projectId: string;
  serviceModel: ServiceModel;
  managementMode: 'HRP_MANAGED' | 'CLIENT_MANAGED';
}

/**
 * Resolve clientCompanyId qua chain JobOpening → StaffingOrder → Project → ClientCompany.
 *
 * @param tx Prisma transaction client.
 * @param jobOpening JobOpening đã được verify qua assertClassifiedJobOpening.
 * @throws PlacementValidationError nếu chain broken.
 */
export async function resolveClientCompanyIdForJobOpening(
  tx: Prisma.TransactionClient,
  jobOpening: ClassifiedJobOpening,
): Promise<ResolvedClientCompany> {
  const staffingOrder = await tx.staffingOrder.findUnique({
    where: { id: jobOpening.staffingOrderId },
    select: { id: true, projectId: true },
  });

  if (!staffingOrder) {
    throw new PlacementValidationError(
      `StaffingOrder ${jobOpening.staffingOrderId} (qua JobOpening ${jobOpening.id}) không tồn tại — chain broken`,
      { jobOpeningId: jobOpening.id, staffingOrderId: jobOpening.staffingOrderId },
    );
  }
  if (!staffingOrder.projectId) {
    throw new PlacementValidationError(
      `StaffingOrder ${staffingOrder.id} thiếu projectId — chain broken`,
      { staffingOrderId: staffingOrder.id },
    );
  }

  const project = await tx.project.findUnique({
    where: { id: staffingOrder.projectId },
    select: { id: true, clientCompanyId: true },
  });

  if (!project) {
    throw new PlacementValidationError(
      `Project ${staffingOrder.projectId} (qua StaffingOrder ${staffingOrder.id}) không tồn tại — chain broken`,
      { staffingOrderId: staffingOrder.id, projectId: staffingOrder.projectId },
    );
  }
  if (!project.clientCompanyId) {
    throw new PlacementValidationError(
      `Project ${project.id} thiếu clientCompanyId — chain broken`,
      { projectId: project.id },
    );
  }

  const clientCompany = await tx.clientCompany.findUnique({
    where: { id: project.clientCompanyId },
    select: { id: true },
  });

  if (!clientCompany) {
    throw new PlacementValidationError(
      `ClientCompany ${project.clientCompanyId} (qua Project ${project.id}) không tồn tại — chain broken`,
      { projectId: project.id, clientCompanyId: project.clientCompanyId },
    );
  }

  const mode = computeManagementMode(jobOpening.serviceModel);
  if (mode === null) {
    // assertClassifiedJobOpening đã bảo đảm serviceModel không null; defensive guard.
    throw new PlacementValidationError(
      `computeManagementMode trả null cho ServiceModel ${jobOpening.serviceModel} — bug nội bộ`,
      { jobOpeningId: jobOpening.id, serviceModel: jobOpening.serviceModel },
    );
  }

  return {
    clientCompanyId: clientCompany.id,
    projectId: project.id,
    serviceModel: jobOpening.serviceModel,
    managementMode: mode,
  };
}
