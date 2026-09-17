import { Prisma } from '@prisma/client';

export interface JobOpeningDetailDto {
  id: string;
  status: string;
  openedAt: string | null;
  closedAt: string | null;
  staffingOrder: {
    id: string;
    code: string;
    title: string;
    project: {
      id: string;
      code: string;
      name: string;
    };
  };
  jobPosting: {
    id: string;
    slug: string;
    status: string;
  } | null;
  metrics: {
    submissionsCount: number;
    assignmentsCount: number;
  };
  associatedSlots: {
    id: string;
    positionCode: string;
    positionTitle: string;
  }[];
}

export async function getJobOpeningDetail(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<JobOpeningDetailDto | null> {
  const opening = await tx.jobOpening.findUnique({
    where: { id },
    include: {
      staffingOrder: {
        select: {
          id: true,
          code: true,
          title: true,
          project: {
            select: { id: true, code: true, name: true },
          },
        },
      },
      posting: {
        select: { id: true, slug: true, status: true },
      },
      staffingOrderSlot: {
        select: { id: true, positionCode: true, positionTitle: true },
      },
      slots: {
        select: { id: true, positionCode: true, positionTitle: true },
      },
    },
  });

  if (!opening) return null;

  // Deduplicate slots
  const slotMap = new Map<string, { id: string; positionCode: string; positionTitle: string }>();
  if (opening.staffingOrderSlot) {
    slotMap.set(opening.staffingOrderSlot.id, opening.staffingOrderSlot);
  }
  for (const s of opening.slots) {
    slotMap.set(s.id, s);
  }
  const associatedSlots = Array.from(slotMap.values());
  const slotIds = associatedSlots.map(s => s.id);

  let submissionsCount = 0;
  let assignmentsCount = 0;
  if (slotIds.length > 0) {
    submissionsCount = await tx.candidateSubmission.count({
      where: { slotId: { in: slotIds } },
    });
    assignmentsCount = await tx.projectAssignment.count({
      where: { staffingOrderSlotId: { in: slotIds } },
    });
  }

  return {
    id: opening.id,
    status: opening.status,
    openedAt: opening.openedAt?.toISOString() ?? null,
    closedAt: opening.closedAt?.toISOString() ?? null,
    staffingOrder: opening.staffingOrder,
    jobPosting: opening.posting,
    metrics: {
      submissionsCount,
      assignmentsCount,
    },
    associatedSlots,
  };
}
