/**
 * application-queue.service — MP-2 STEP-04/03 (RQ-05/RQ-06, DEC-05/DEC-06).
 *
 * Authenticated HR/Sale queue + detail + the single MP-2-owned status action
 * (NEW ↔ NEEDS_INFO). This path is RLS-enforced: routes call it inside
 * `withDbContext` so every query runs under the caller's tx-local GUC. It NEVER
 * uses the definer boundary and NEVER sets app.role itself. Queue readers are
 * ADMIN/HR_MANAGER/DIRECTOR/SALE only (DEC-06); RLS is the backstop, this
 * app-layer check is the primary gate + a stable 403 surface.
 */
import type { CandidateSubmissionStatus, Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { assertMp2Transition, StatusTransitionError } from './status-machine';

// DEC-06 — queue readers. HR_STAFF is intentionally NOT included.
const QUEUE_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE']);

export class AdminApplicationError extends Error {
  constructor(
    public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' | 'INVALID_TRANSITION' | 'REASON_REQUIRED',
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'AdminApplicationError';
  }
}

function checkQueueRole(ctx: AuthContext): void {
  if (!QUEUE_ROLES.has(ctx.role)) {
    throw new AdminApplicationError('FORBIDDEN', 403, `Role ${ctx.role} cannot access the application queue`);
  }
}

export type ApplicationSource = 'PUBLIC' | 'VENDOR' | 'CTV';

export interface QueueFilters {
  status?: CandidateSubmissionStatus;
  slotId?: string;
  projectId?: string;
  source?: ApplicationSource;
  q?: string;
  take?: number;
  skip?: number;
}

// Queue row — contact PII is permitted here (4.3): only row-scoped queue roles
// reach this projection, under RLS. Forbidden internal fields stay out.
export interface AdminApplicationRow {
  id: string;
  fullName: string;
  phone: string;
  status: string;
  slotId: string | null;
  projectId: string | null;
  projectName: string | null;
  publicTrackingCode: string | null;
  source: ApplicationSource;
  createdAt: Date;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorUserId: string | null;
  reason: string | null;
  createdAt: Date;
}

export interface AdminApplicationDetail extends AdminApplicationRow {
  cccdNumber: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  experience: string | null;
  cvFileName: string | null;
  cvMimeType: string | null;
  cvSizeBytes: number | null;
  consentAt: Date | null;
  statusHistory: StatusHistoryEntry[];
  // ── MP-3 additions (RQ-08). IDs / codes / counters only: no rate, no margin,
  // no internal source evidence. The reader boundary is UNCHANGED (DEC-06).
  /** Optimistic transition guard — the drawer echoes it back as expectedVersion. */
  version: number;
  /** Canonical converted Worker (MP-3B); null until the application is CONVERTED. */
  workerId: string | null;
  /** Safe source facts from the accepted SourceClaim (MP-3B). */
  sourceClaim: SourceClaimSummary | null;
  /** Safe dedup / guard facts already stored on the submission. */
  dedup: DedupFacts;
  /** The MP-3C placement created from this application, when it exists. */
  assignment: AssignmentSummary | null;
}

export interface SourceClaimSummary {
  id: string;
  claimType: string;
  registrationChannel: string;
  accepted: boolean;
}

export interface DedupFacts {
  dedupWorkerId: string | null;
  mergedWorkerId: string | null;
  blockCode: string | null;
  overrideCase: string | null;
}

export interface AssignmentSummary {
  assignmentId: string;
  status: string;
  projectId: string;
  staffingOrderId: string | null;
  staffingOrderSlotId: string | null;
  employeeCode: string;
  employmentType: string;
  validFrom: Date;
  validTo: Date | null;
}

const MAX_PAGE = 100;
const DEFAULT_PAGE = 20;

function clampTake(take?: number): number {
  if (!take || Number.isNaN(take) || take < 1) return DEFAULT_PAGE;
  return Math.min(Math.floor(take), MAX_PAGE);
}
function clampSkip(skip?: number): number {
  if (!skip || Number.isNaN(skip) || skip < 0) return 0;
  return Math.floor(skip);
}

function sourceOf(row: { vendorId: string | null; ctvId: string | null }): ApplicationSource {
  if (row.vendorId) return 'VENDOR';
  if (row.ctvId) return 'CTV';
  return 'PUBLIC';
}

function sourceWhere(source?: ApplicationSource): Prisma.CandidateSubmissionWhereInput {
  switch (source) {
    case 'VENDOR': return { vendorId: { not: null } };
    case 'CTV': return { ctvId: { not: null } };
    case 'PUBLIC': return { vendorId: null, ctvId: null };
    default: return {};
  }
}

/** Scoped, bounded queue list. RLS (via withDbContext tx) is the row gate. */
export async function listApplications(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  filters: QueueFilters = {},
): Promise<{ rows: AdminApplicationRow[]; total: number }> {
  checkQueueRole(ctx);

  const where: Prisma.CandidateSubmissionWhereInput = { ...sourceWhere(filters.source) };
  if (filters.status) where.status = filters.status;
  if (filters.slotId) where.slotId = filters.slotId;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { publicTrackingCode: { contains: q, mode: 'insensitive' } },
    ];
  }

  const take = clampTake(filters.take);
  const skip = clampSkip(filters.skip);

  const [rows, total] = await Promise.all([
    tx.candidateSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: { project: { select: { name: true } } },
    }),
    tx.candidateSubmission.count({ where }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      phone: r.phone,
      status: r.status,
      slotId: r.slotId ?? null,
      projectId: r.projectId ?? null,
      projectName: (r as { project?: { name: string } | null }).project?.name ?? null,
      publicTrackingCode: r.publicTrackingCode ?? null,
      source: sourceOf(r),
      createdAt: r.createdAt,
    })),
    total,
  };
}

/** Detail projection + append-only status history (most-recent last). */
export async function getApplicationDetail(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  id: string,
): Promise<AdminApplicationDetail> {
  checkQueueRole(ctx);

  const r = await tx.candidateSubmission.findUnique({
    where: { id },
    include: {
      project: { select: { name: true } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
      // MP-3 (RQ-08): safe source + placement facts. Selected explicitly so no
      // forbidden field can ride along.
      sourceClaims: {
        where: { accepted: true },
        select: { id: true, claimType: true, registrationChannel: true, accepted: true, workerId: true },
      },
      assignment: {
        select: {
          id: true, status: true, projectId: true, staffingOrderId: true,
          staffingOrderSlotId: true, employeeCode: true, employmentType: true,
          validFrom: true, validTo: true,
        },
      },
    },
  });
  if (!r) {
    throw new AdminApplicationError('NOT_FOUND', 404, 'Application not found');
  }

  const history = (r as { statusHistory?: StatusHistoryEntry[] }).statusHistory ?? [];
  const claims = (r as { sourceClaims?: Array<SourceClaimSummary & { workerId: string }> }).sourceClaims ?? [];
  const acceptedClaim = claims.find((c) => c.workerId === r.workerId) ?? claims[0] ?? null;
  const placement = (r as { assignment?: (Omit<AssignmentSummary, 'assignmentId'> & { id: string }) | null }).assignment ?? null;
  return {
    id: r.id,
    fullName: r.fullName,
    phone: r.phone,
    status: r.status,
    slotId: r.slotId ?? null,
    projectId: r.projectId ?? null,
    projectName: (r as { project?: { name: string } | null }).project?.name ?? null,
    publicTrackingCode: r.publicTrackingCode ?? null,
    source: sourceOf(r),
    createdAt: r.createdAt,
    cccdNumber: r.cccdNumber ?? null,
    dateOfBirth: r.dateOfBirth ?? null,
    gender: r.gender ?? null,
    experience: r.experience ?? null,
    cvFileName: r.cvFileName ?? null,
    cvMimeType: r.cvMimeType ?? null,
    cvSizeBytes: r.cvSizeBytes ?? null,
    consentAt: r.consentAt ?? null,
    statusHistory: history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus ?? null,
      toStatus: h.toStatus,
      actorUserId: h.actorUserId ?? null,
      reason: h.reason ?? null,
      createdAt: h.createdAt,
    })),
    version: r.version,
    workerId: r.workerId ?? null,
    sourceClaim: acceptedClaim
      ? {
          id: acceptedClaim.id,
          claimType: acceptedClaim.claimType,
          registrationChannel: acceptedClaim.registrationChannel,
          accepted: acceptedClaim.accepted,
        }
      : null,
    dedup: {
      dedupWorkerId: r.dedupWorkerId ?? null,
      mergedWorkerId: r.mergedWorkerId ?? null,
      blockCode: r.blockCode ?? null,
      overrideCase: r.overrideCase ?? null,
    },
    assignment: placement
      ? {
          assignmentId: placement.id,
          status: placement.status,
          projectId: placement.projectId,
          staffingOrderId: placement.staffingOrderId ?? null,
          staffingOrderSlotId: placement.staffingOrderSlotId ?? null,
          employeeCode: placement.employeeCode,
          employmentType: placement.employmentType,
          validFrom: placement.validFrom,
          validTo: placement.validTo ?? null,
        }
      : null,
  };
}

/**
 * The single MP-2-owned status action: NEW ↔ NEEDS_INFO with a required reason.
 * Validates the state machine, then updates status + appends a history row in
 * the SAME transaction (append-only invariant, 4.3). MP-3 transitions are
 * rejected with a stable code. Never mutates status without a history row.
 */
export async function transitionApplicationStatus(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  id: string,
  toStatus: string,
  reason: string,
): Promise<{ id: string; status: string }> {
  checkQueueRole(ctx);

  const current = await tx.candidateSubmission.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!current) {
    throw new AdminApplicationError('NOT_FOUND', 404, 'Application not found');
  }

  try {
    assertMp2Transition(current.status, toStatus, reason);
  } catch (e) {
    if (e instanceof StatusTransitionError) {
      const httpStatus = e.code === 'REASON_REQUIRED' ? 400 : 409;
      throw new AdminApplicationError(e.code, httpStatus, e.message);
    }
    throw e;
  }

  await tx.candidateSubmission.update({ where: { id }, data: { status: toStatus as CandidateSubmissionStatus } });
  await tx.applicationStatusHistory.create({
    data: {
      submissionId: id,
      fromStatus: current.status,
      toStatus,
      actorUserId: ctx.userId,
      reason: reason.trim(),
    },
  });

  return { id, status: toStatus };
}
