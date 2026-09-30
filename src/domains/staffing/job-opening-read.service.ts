/**
 * job-opening-read.service.ts — read-side projection for a single JobOpening.
 *
 * P1-A0.5 ADDITIVE UPDATE (RQ-14 / v1.2 §I-06): the DTO is extended with
 * the server-derived fields needed by the page-side flag computation
 * (`canClassify` / `canOpen` / `blockedReason`). The DTO is forward-compatible
 * (no existing field removed or renamed); existing consumers keep working.
 *
 * Added in v1.2 §I-06:
 *   - serviceModel                — `ServiceModel | null` (canonical 4-enum taxonomy)
 *   - placementCount              — number of Placement rows bound to this opening
 *   - parentStaffingOrderStatus   — `'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'CANCELLED' | null`
 *   - parentStaffingOrderDeadlineDate — Date | null (StaffingOrder.deadlineDate exact field name)
 *   - slotValidTo                 — Date | null (StaffingOrderSlot.validTo exact field name)
 *   - slotSlotsFilled             — number
 *   - slotSlotsNeeded             — number
 *
 * Explicitly NOT added (privacy / authority boundary — RQ-14):
 *   - `assigneeId` / `actorId`     — never forwarded to Client Component
 *   - `assignment` audit metadata
 *   - recruiter assignment rows
 *
 * The page component (Server Component) reads this DTO and derives
 * `canClassify` / `canOpen` / `blockedReason` server-side. Client never
 * re-derives authority (LOCK-07).
 */
import { Prisma } from '@prisma/client';

export interface JobOpeningDetailDto {
  id: string;
  status: string;
  openedAt: string | null;
  closedAt: string | null;
  /** P1-A0.5 ADDITIVE (RQ-14 / v1.2 §I-06) — canonical 4-enum taxonomy. */
  serviceModel: string | null;
  /** P1-A0.5 ADDITIVE — defense-in-depth placementCount check for canClassify. */
  placementCount: number;
  staffingOrder: {
    id: string;
    code: string;
    title: string;
    /** P1-A0.5 ADDITIVE — `'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'CANCELLED'`. */
    status: string;
    /** P1-A0.5 ADDITIVE — StaffingOrder.deadlineDate (exact source field name). */
    deadlineDate: string | null;
    project: {
      id: string;
      code: string;
      name: string;
    };
  };
  /** P1-A0.5 ADDITIVE — slot-level eligibility facts (nullable when no slot). */
  slot: {
    id: string;
    positionCode: string;
    positionTitle: string;
    /** P1-A0.5 ADDITIVE — StaffingOrderSlot.validTo (exact source field name). */
    validTo: string | null;
    /** P1-A0.5 ADDITIVE — slot capacity. */
    slotsFilled: number;
    slotsNeeded: number;
  } | null;
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
          // P1-A0.5 ADDITIVE
          status: true,
          deadlineDate: true,
          project: {
            select: { id: true, code: true, name: true },
          },
        },
      },
      posting: {
        select: { id: true, slug: true, status: true },
      },
      staffingOrderSlot: {
        // P1-A0.5 ADDITIVE — surface slot validity / capacity so the page
        // can render `canOpen` server-side without a second round-trip.
        select: {
          id: true,
          positionCode: true,
          positionTitle: true,
          validTo: true,
          slotsFilled: true,
          slotsNeeded: true,
        },
      },
      slots: {
        select: { id: true, positionCode: true, positionTitle: true },
      },
      // P1-A0.5 ADDITIVE — placementCount (defense in depth per RQ-04).
      _count: { select: { placements: true } },
    },
  });

  if (!opening) return null;

  // Deduplicate slots
  const slotMap = new Map<string, { id: string; positionCode: string; positionTitle: string }>();
  if (opening.staffingOrderSlot) {
    slotMap.set(opening.staffingOrderSlot.id, {
      id: opening.staffingOrderSlot.id,
      positionCode: opening.staffingOrderSlot.positionCode,
      positionTitle: opening.staffingOrderSlot.positionTitle,
    });
  }
  for (const s of opening.slots) {
    slotMap.set(s.id, s);
  }
  const associatedSlots = Array.from(slotMap.values());
  const slotIds = associatedSlots.map((s) => s.id);

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
    // P1-A0.5 ADDITIVE
    serviceModel: opening.serviceModel ?? null,
    placementCount: opening._count.placements,
    staffingOrder: {
      id: opening.staffingOrder.id,
      code: opening.staffingOrder.code,
      title: opening.staffingOrder.title,
      status: opening.staffingOrder.status,
      deadlineDate: opening.staffingOrder.deadlineDate?.toISOString() ?? null,
      project: opening.staffingOrder.project,
    },
    slot: opening.staffingOrderSlot
      ? {
          id: opening.staffingOrderSlot.id,
          positionCode: opening.staffingOrderSlot.positionCode,
          positionTitle: opening.staffingOrderSlot.positionTitle,
          validTo: opening.staffingOrderSlot.validTo?.toISOString() ?? null,
          slotsFilled: opening.staffingOrderSlot.slotsFilled,
          slotsNeeded: opening.staffingOrderSlot.slotsNeeded,
        }
      : null,
    jobPosting: opening.posting,
    metrics: {
      submissionsCount,
      assignmentsCount,
    },
    associatedSlots,
  };
}
