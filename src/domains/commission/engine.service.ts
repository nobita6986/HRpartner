/**
 * CommissionEngine — P2 Commission STEP-03 (RQ-03).
 *
 * Đánh giá milestone (RETAINED_30_DAYS, v.v.) trên ProjectAssignment và tạo
 * dòng CREDIT trong commission_ledger. Idempotent: trùng (ctvId, workerId,
 * month, year, milestone) → KHÔNG tạo dòng mới.
 *
 * ADR-013: ledger append-only, không sửa dòng đã tạo.
 * ADR-010: amount là BigInt (VND nguyên).
 *
 * DEC-04: chỉ chạy khi feature flag `commission` = true.
 *
 * Milestone evaluation rules (mặc định):
 *   - RETAINED_30_DAYS: assignment.status = ACTIVE, validFrom ≤ now - 30 days.
 *   - RETAINED_60_DAYS: tương tự, 60 days.
 *   - RETAINED_90_DAYS: tương tự, 90 days.
 *
 *   - PER_HEAD_MILESTONE calc: mỗi (ctvId, workerId, month, year, milestone) → amount = policy.value.
 *   - PERCENT_OF_REVENUE calc: amount = floor(revenue_attribution_vnd * policy.value / 10000) (basis points).
 *     revenue_attribution_vnd lấy t� ProjectAssignment (hiện chưa track — TODO: tích hợp statement).
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { FEATURE_FLAGS } from '@/src/shared/feature-flags';
import { writeAuditLog } from '@/src/shared/integrity/audit';

export type PolicyTx = PrismaClient | Prisma.TransactionClient;

export class CommissionEngineError extends Error {
  constructor(
    public readonly code:
      | 'DISABLED'
      | 'INVALID_INPUT'
      | 'NO_REFERRER'
      | 'NO_POLICY'
      | 'NOT_FOUND'
      | 'INTERNAL',
    message: string,
  ) {
    super(message);
    this.name = 'CommissionEngineError';
  }
}

export interface CreditInput {
  /** id của SourceClaim.accepted (CTV đã được chấp nhận cho worker này). */
  ctvId: string;
  workerId: string;
  assignmentId?: string;
  milestone: string; // 'RETAINED_30_DAYS' | ...
  month: number; // 1..12
  year: number;
  amount: bigint; // tính từ policy
  policyId: string;
  createdBy?: string;
}

export interface EvaluateContext {
  /** Date.now() reference (test inject). */
  now?: Date;
}

/** Milestone retention days theo code. */
const RETENTION_DAYS: Record<string, number> = {
  RETAINED_30_DAYS: 30,
  RETAINED_60_DAYS: 60,
  RETAINED_90_DAYS: 90,
};

/** Tính milestone đạt được cho 1 assignment. */
export function evaluateMilestones(
  assignment: { status: string; validFrom: Date },
  now: Date = new Date(),
): string[] {
  if (assignment.status !== 'ACTIVE') return [];
  const milestones: string[] = [];
  const ageMs = now.getTime() - assignment.validFrom.getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  if (ageDays >= 30) milestones.push('RETAINED_30_DAYS');
  if (ageDays >= 60) milestones.push('RETAINED_60_DAYS');
  if (ageDays >= 90) milestones.push('RETAINED_90_DAYS');
  return milestones;
}

/**
 * Tìm policy hiệu lực cho ngày now (effectiveFrom ≤ now < effectiveTo).
 * Nếu nhiều version match → lấy version cao nhất.
 */
export async function findActivePolicy(
  prisma: PolicyTx,
  now: Date = new Date(),
): Promise<{ id: string; calcType: string; value: bigint; name: string; version: number } | null> {
  const row = await prisma.commissionPolicy.findFirst({
    where: {
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: { version: 'desc' },
  });
  if (!row) return null;
  return {
    id: row.id,
    calcType: row.calcType,
    value: row.value,
    name: row.name,
    version: row.version,
  };
}

/**
 * Tạo dòng CREDIT idempotent. Trả về ledger row (existing hoặc newly created).
 * Lookup trùng: (ctvId, workerId, month, year, milestone) + direction=CREDIT.
 */
export async function createCredit(
  prisma: PolicyTx,
  input: CreditInput,
): Promise<{ row: Awaited<ReturnType<typeof createLedgerRow>>; created: boolean }> {
  if (!FEATURE_FLAGS.commission) {
    throw new CommissionEngineError('DISABLED', 'Feature flag commission chưa bật');
  }
  if (input.amount <= 0n) {
    throw new CommissionEngineError('INVALID_INPUT', 'amount phải > 0');
  }
  if (input.month < 1 || input.month > 12) {
    throw new CommissionEngineError('INVALID_INPUT', 'month phải 1..12');
  }

  // 1. Idempotency: tìm row đã tồn tại chưa
  const existing = await prisma.commissionLedger.findFirst({
    where: {
      ctvId: input.ctvId,
      workerId: input.workerId,
      month: input.month,
      year: input.year,
      milestone: input.milestone,
      direction: 'CREDIT',
    },
  });
  if (existing) {
    return { row: existing, created: false };
  }

  // 2. Tạo mới (DB unique index sẽ catch race condition cuối cùng)
  const row = await createLedgerRow(prisma, {
    id: randomUUID(),
    ctvId: input.ctvId,
    workerId: input.workerId,
    assignmentId: input.assignmentId ?? null,
    policyId: input.policyId,
    milestone: input.milestone,
    amount: input.amount,
    direction: 'CREDIT',
    reversalOfId: null,
    month: input.month,
    year: input.year,
    status: 'PENDING',
    createdBy: input.createdBy ?? null,
  });
  return { row, created: true };
}

async function createLedgerRow(
  prisma: PolicyTx,
  data: {
    id: string;
    ctvId: string;
    workerId: string | null;
    assignmentId: string | null;
    policyId: string;
    milestone: string;
    amount: bigint;
    direction: 'CREDIT' | 'REVERSAL';
    reversalOfId: string | null;
    month: number;
    year: number;
    status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
    createdBy: string | null;
  },
) {
  // Race-condition catch: P2002 (unique) on idempotency index
  try {
    return await prisma.commissionLedger.create({ data });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
      const again = await prisma.commissionLedger.findFirst({
        where: {
          ctvId: data.ctvId,
          workerId: data.workerId,
          month: data.month,
          year: data.year,
          milestone: data.milestone,
          direction: 'CREDIT',
        },
      });
      if (again) return again;
    }
    throw e;
  }
}

/**
 * Evaluate + create credits cho assignment (idempotent batch).
 * `actor` cho audit log. Trả về số dòng CREDIT mới tạo + chi tiết.
 *
 * Quy trình:
 *   1. Lấy assignment.
 *   2. Đánh giá milestone đạt.
 *   3. Tìm CTV (referrerId).
 *   4. Tìm policy active.
 *   5. Tạo credit cho mỗi milestone (idempotent).
 */
export async function evaluateAndCreateCredit(
  prisma: PolicyTx,
  assignmentId: string,
  ctx: EvaluateContext & { actor?: { id: string; role: string } } = {},
): Promise<{
  evaluated: string[];
  created: { milestone: string; ledgerId: string }[];
  skipped: string[];
  policyId: string | null;
  ctvId: string | null;
}> {
  const now = ctx.now ?? new Date();
  const assignment = await prisma.projectAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) {
    throw new CommissionEngineError('NOT_FOUND', `Assignment ${assignmentId} không tồn tại`);
  }

  const evaluated = evaluateMilestones(assignment, now);
  const policy = await findActivePolicy(prisma, now);

  const created: { milestone: string; ledgerId: string }[] = [];
  const skipped: string[] = [];

  // PERCENT_OF_REVENUE cần revenue từ assignment — chưa track → skip
  const ctvId = (assignment as unknown as { referrerId: string | null }).referrerId ?? null;

  if (!policy) {
    return { evaluated, created, skipped, policyId: null, ctvId };
  }
  if (!ctvId) {
    return { evaluated, created, skipped, policyId: policy.id, ctvId: null };
  }

  for (const milestone of evaluated) {
    const amount = policy.calcType === 'PER_HEAD_MILESTONE'
      ? policy.value
      : 0n; // PERCENT_OF_REVENUE: revenue chưa integrate → 0, skip
    if (amount === 0n) {
      skipped.push(milestone);
      continue;
    }
    const { row, created: isNew } = await createCredit(prisma, {
      ctvId,
      workerId: assignment.workerId,
      assignmentId,
      milestone,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      amount,
      policyId: policy.id,
      createdBy: ctx.actor?.id,
    });
    if (isNew) created.push({ milestone, ledgerId: row.id });
    else skipped.push(milestone);
  }

  if (created.length > 0 && ctx.actor) {
    await writeAuditLog({
      prisma,
      actor: ctx.actor,
      entityType: 'CommissionLedger',
      entityId: created.map((c) => c.ledgerId).join(','),
      action: 'CREATE',
      diff: { before: null, after: { created, source: 'evaluateAndCreateCredit', assignmentId, ctvId, policyId: policy.id } },
    });
  }

  return { evaluated, created, skipped, policyId: policy.id, ctvId };
}

export { RETENTION_DAYS };
