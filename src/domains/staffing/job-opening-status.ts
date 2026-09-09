/**
 * job-opening-status.ts — V6 Phase 1 STEP-01
 *
 * Service đếm số JobOpening theo status (DRAFT/OPEN/FILLED/CANCELLED).
 * Dùng prisma.groupBy({ by: ['status'] }) — chuẩn SQL, portable.
 *
 * Scope: toàn hệ thống (không lọc theo staffingOrderId).
 * Zero-fill 4 status. KHÔNG nuốt lỗi Prisma.
 */
import { PrismaClient } from '@prisma/client';

export type JobOpeningStatusSummary = {
  byStatus: {
    DRAFT: number;
    OPEN: number;
    FILLED: number;
    CANCELLED: number;
  };
  total: number;
};

const CANONICAL_STATUSES = ['DRAFT', 'OPEN', 'FILLED', 'CANCELLED'] as const;
type CanonicalStatus = typeof CANONICAL_STATUSES[number];

export async function summarizeAllJobOpenings(
  prisma: PrismaClient,
): Promise<JobOpeningStatusSummary> {
  const groups = await prisma.jobOpening.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  // Zero-fill all 4 canonical statuses
  const byStatus: JobOpeningStatusSummary['byStatus'] = {
    DRAFT: 0,
    OPEN: 0,
    FILLED: 0,
    CANCELLED: 0,
  };

  for (const group of groups) {
    // Only map known canonical statuses; ignore any stray values.
    // This matches test case 3: non-canonical statuses must NOT appear in byStatus.
    if (group.status in byStatus) {
      (byStatus as Record<string, number>)[group.status] = group._count.status;
    }
  }

  const total =
    byStatus.DRAFT + byStatus.OPEN + byStatus.FILLED + byStatus.CANCELLED;

  return { byStatus, total };
}
