/**
 * submission.service — Phase 4 slice 4D (Job Board).
 *
 * Public job board: list public jobs + apply + SourceClaim accepted unique (DEC-10).
 *
 * DEC-10: SourceClaim.accepted duy nhất 1/worker (partial unique index da co).
 * Non-goals: khong lam payroll, khong eKYC NFC.
 */
import type { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { PrismaClient } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface PublicJob {
  id: string;
  title: string;
  isPublic: boolean;
  availableSlots: number;
}

export interface ApplyForJobInput {
  projectId: string;
  fullName: string;
  phone: string;
  cccdNumber?: string;
  dateOfBirth?: Date;
  gender?: string;
  experience?: string;
}

export interface SubmissionRow {
  id: string;
  fullName: string;
  phone: string;
  cccdNumber: string | null;
  projectId: string | null;
  projectName: string | null;
  vendorId: string | null;
  vendorName: string | null;
  status: string;
  createdAt: Date;
}

export interface ClaimRow {
  id: string;
  workerId: string;
  workerName: string | null;
  claimType: string;
  vendorId: string | null;
  vendorName: string | null;
  accepted: boolean;
  acceptedBy: string | null;
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// Errors
// ═══════════════════════════════════════════════════════════════════════════

export class SubmissionServiceError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION' | 'ALREADY_ACCEPTED' | 'DUPLICATE_WORKER_ACCEPTED' | 'PROJECT_NOT_PUBLIC',
    message: string,
  ) {
    super(message);
    this.name = 'SubmissionServiceError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Roles that can manage submissions/claims
// ═══════════════════════════════════════════════════════════════════════════

const SUBMISSION_ADMIN_ROLES = new Set([
  'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'VENDOR_ADMIN', 'VENDOR_STAFF',
]);

function checkSubmissionRole(ctx: AuthContext): void {
  if (!SUBMISSION_ADMIN_ROLES.has(ctx.role)) {
    throw new SubmissionServiceError('FORBIDDEN', `Role ${ctx.role} cannot manage submissions`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Public job listing (no auth required)
// ═══════════════════════════════════════════════════════════════════════════

export async function listPublicJobs(
  tx: Prisma.TransactionClient,
): Promise<PublicJob[]> {
  // Lay project isPublic va staffing order slots
  const projects = await tx.project.findMany({
    where: { isPublic: true, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      isPublic: true,
      staffingOrders: {
        select: {
          slots: {
            select: { slotsNeeded: true, slotsFilled: true },
          },
        },
      },
    },
  });

  // Project without slots: guard against null/undefined
  return projects.map((p) => {
    const staffingOrders = (p as any).staffingOrders ?? [];
    let slotsNeeded = 0;
    let slotsFilled = 0;
    for (const order of staffingOrders) {
      const slots = (order as any).slots ?? [];
      for (const slot of slots) {
        slotsNeeded += slot.slotsNeeded;
        slotsFilled += slot.slotsFilled;
      }
    }
    return {
      id: p.id,
      title: p.name,
      isPublic: p.isPublic,
      availableSlots: Math.max(0, slotsNeeded - slotsFilled),
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Public apply (no auth — worker applies from public job board)
// ═══════════════════════════════════════════════════════════════════════════

export async function applyForJob(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: ApplyForJobInput,
): Promise<{ submissionId: string; sourceClaimId: string }> {
  if (!input.projectId || !input.fullName || !input.phone) {
    throw new SubmissionServiceError('VALIDATION', 'Thieu required fields: projectId, fullName, phone');
  }

  // Verify project is public
  const project = await tx.project.findUnique({ where: { id: input.projectId } });
  if (!project || !project.isPublic) {
    throw new SubmissionServiceError('PROJECT_NOT_PUBLIC', 'Job not found or not public');
  }

  // Create CandidateSubmission
  const submission = await tx.candidateSubmission.create({
    data: {
      projectId: input.projectId,
      fullName: input.fullName,
      phone: input.phone,
      cccdNumber: input.cccdNumber ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      experience: input.experience ?? null,
      status: 'NEW',
    },
  });

  // Claim type: MVP always HRP_DIRECT (vendor chain added Phase 5+)
  // DEC-10: SourceClaim accepted unique 1/worker (partial unique index da co)
  const claimType = 'HRP_DIRECT';
  const claim = await tx.sourceClaim.create({
    data: {
      workerId: ctx.workerId ?? ctx.userId,
      claimType,
      vendorId: null,
      submissionId: submission.id,
      registrationChannel: 'SELF_REGISTER',
      accepted: false,
    },
  });

  return { submissionId: submission.id, sourceClaimId: claim.id };
}

// ═══════════════════════════════════════════════════════════════════════════
// Admin: list submissions
// ═══════════════════════════════════════════════════════════════════════════

export async function listSubmissions(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  opts?: { take?: number; skip?: number; projectId?: string; status?: string },
): Promise<{ rows: SubmissionRow[]; total: number }> {
  checkSubmissionRole(ctx);

  const where: Prisma.CandidateSubmissionWhereInput = {};
  if (opts?.projectId) where.projectId = opts.projectId;
  if (opts?.status) where.status = opts.status;

  const [rows, total] = await Promise.all([
    tx.candidateSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts?.take ?? 50,
      skip: opts?.skip ?? 0,
      include: { project: { select: { name: true } }, vendor: { select: { name: true } } },
    }),
    tx.candidateSubmission.count({ where }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      phone: r.phone,
      cccdNumber: r.cccdNumber,
      projectId: r.projectId,
      projectName: r.project?.name ?? null,
      vendorId: r.vendorId,
      vendorName: r.vendor?.name ?? null,
      status: r.status,
      createdAt: r.createdAt,
    })),
    total,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Admin: list source claims
// ═══════════════════════════════════════════════════════════════════════════

export async function listClaims(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  opts?: { take?: number; skip?: number; accepted?: boolean; workerId?: string },
): Promise<{ rows: ClaimRow[]; total: number }> {
  checkSubmissionRole(ctx);

  const where: Prisma.SourceClaimWhereInput = {};
  if (opts?.accepted !== undefined) where.accepted = opts.accepted;
  if (opts?.workerId) where.workerId = opts.workerId;

  const [rows, total] = await Promise.all([
    tx.sourceClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts?.take ?? 50,
      skip: opts?.skip ?? 0,
      include: {
        worker: { select: { fullName: true } },
        vendor: { select: { name: true } },
      },
    }),
    tx.sourceClaim.count({ where }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      workerId: r.workerId,
      workerName: r.worker?.fullName ?? null,
      claimType: r.claimType,
      vendorId: r.vendorId,
      vendorName: r.vendor?.name ?? null,
      accepted: r.accepted,
      acceptedBy: r.acceptedBy,
      createdAt: r.createdAt,
    })),
    total,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Admin: accept source claim (DEC-10 — unique 1 accepted/worker)
// ═══════════════════════════════════════════════════════════════════════════

export async function acceptSourceClaim(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  claimId: string,
): Promise<void> {
  checkSubmissionRole(ctx);

  const claim = await tx.sourceClaim.findUnique({ where: { id: claimId } });
  if (!claim) {
    throw new SubmissionServiceError('NOT_FOUND', 'Claim not found');
  }
  if (claim.accepted) {
    throw new SubmissionServiceError('ALREADY_ACCEPTED', 'Claim already accepted');
  }

  // DEC-10: check no other accepted claim for same worker
  const otherAccepted = await tx.sourceClaim.findFirst({
    where: { workerId: claim.workerId, accepted: true, id: { not: claimId } },
  });
  if (otherAccepted) {
    throw new SubmissionServiceError(
      'DUPLICATE_WORKER_ACCEPTED',
      `Worker ${claim.workerId} already has an accepted claim`,
    );
  }

  // Accept claim + update submission status
  await tx.sourceClaim.update({ where: { id: claimId }, data: { accepted: true, acceptedBy: ctx.userId } });
  if (claim.submissionId) {
    await tx.candidateSubmission.update({ where: { id: claim.submissionId }, data: { status: 'SCREENING' } });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Admin: reject source claim
// ═══════════════════════════════════════════════════════════════════════════

export async function rejectSourceClaim(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  claimId: string,
  _reason?: string,
): Promise<void> {
  checkSubmissionRole(ctx);

  const claim = await tx.sourceClaim.findUnique({ where: { id: claimId } });
  if (!claim) {
    throw new SubmissionServiceError('NOT_FOUND', 'Claim not found');
  }

  // Reject: update claim + submission
  await tx.sourceClaim.update({ where: { id: claimId }, data: { accepted: false, acceptedBy: null } });
  if (claim.submissionId) {
    await tx.candidateSubmission.update({ where: { id: claim.submissionId }, data: { status: 'REJECTED' } });
  }
}
