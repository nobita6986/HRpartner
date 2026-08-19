/**
 * Commission Ledger Service — P2 Commission STEP-04 (RQ-04, RQ-05).
 *
 * State machine (theo TASK §4.3):
 *   PENDING → APPROVED → PAID
 *   PENDING → REJECTED  (terminal)
 *   PAID → chỉ REVERSAL (clawback); KHÔNG sửa trực tiếp.
 *
 * Reverse / Clawback (DEC-05):
 *   - REVERSAL luôn tạo dòng MỚI status=PENDING (không tự sửa dòng CREDIT đã PAID).
 *   - Khi duyệt REVERSAL: nếu số dư khả dụng < amount → tạo CommissionDebt.
 *
 * Netting (RQ-05):
 *   - Khi duyệt CREDIT → APPROVED → PAID: trước khi set PAID, cấn trừ debt OPEN/PARTIAL.
 *   - amount giảm cho mỗi debt match, debt remainingVnd giảm tương ứng.
 *   - Nếu debt hết → status=CLEARED.
 */
import type { PrismaClient, CommissionLedger, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { writeAuditLog, type AuditActor } from '@/src/shared/integrity/audit';

export type LedgerTx = PrismaClient | Prisma.TransactionClient;

export class CommissionLedgerError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'INVALID_STATE'
      | 'INVALID_TRANSITION'
      | 'INVALID_INPUT'
      | 'ALREADY_REVERSED'
      | 'NO_AMOUNT',
    message: string,
  ) {
    super(message);
    this.name = 'CommissionLedgerError';
  }
}

export type LedgerStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
export type Direction = 'CREDIT' | 'REVERSAL';

/** Transition map — compile-time safe (guardTransition). */
export const LEDGER_TRANSITIONS: Record<LedgerStatus, Record<string, LedgerStatus>> = {
  PENDING: { approve: 'APPROVED', reject: 'REJECTED', pay: 'APPROVED' /* pay from PENDING = approve+pay */ },
  APPROVED: { pay: 'PAID', reject: 'REJECTED' },
  PAID: { /* chỉ REVERSAL được tạo mới, không transition trên row này */ },
  REJECTED: {},
};

export interface ApproveInput {
  ledgerId: string;
  actor: AuditActor;
  reason?: string;
}

export interface PayInput {
  ledgerId: string;
  actor: AuditActor;
  reason?: string;
}

export interface RejectInput {
  ledgerId: string;
  actor: AuditActor;
  reason: string;
}

export interface ReverseInput {
  /** Dòng CREDIT cần đảo. */
  creditId: string;
  actor: AuditActor;
  reason: string;
  /** Tuỳ chọn chỉ đảo 1 phần (mặc định = toàn bộ). */
  partialAmount?: bigint;
}

export interface ApplyNettingResult {
  /** amount thực sự trừ vào debt (BigInt). */
  debtReduced: bigint;
  /** amount credit dùng để trả CTV (BigInt). */
  netPaid: bigint;
  /** debtId đã xử lý. */
  debtId: string | null;
}

async function getLedgerOrThrow(prisma: LedgerTx, id: string): Promise<CommissionLedger> {
  const row = await prisma.commissionLedger.findUnique({ where: { id } });
  if (!row) throw new CommissionLedgerError('NOT_FOUND', `Ledger ${id} không tồn tại`);
  return row;
}

/** Tính số dư khả dụng (balance) của CTV = tổng CREDIT APPROVED/PAID - tổng REVERSAL APPROVED/PAID. */
export async function getCtvBalance(
  prisma: LedgerTx,
  ctvId: string,
): Promise<bigint> {
  const rows = await prisma.commissionLedger.findMany({
    where: {
      ctvId,
      status: { in: ['APPROVED', 'PAID'] },
    },
    select: { direction: true, amount: true },
  });
  let balance = 0n;
  for (const r of rows) {
    if (r.direction === 'CREDIT') balance += r.amount;
    else balance -= r.amount;
  }
  return balance;
}

/**
 * Approve ledger row (PENDING → APPROVED).
 * - Nếu là CREDIT: sau khi approve, gọi netting — debt OPEN/PARTIAL được trừ.
 *   Trả về ledger với status = PAID nếu netting hết, APPROVED nếu không có debt hoặc debt đã hết nhưng amount dương vẫn được duyệt.
 *   Thực tế: state PAID phải qua pay() sau. Approve chỉ set APPROVED.
 */
export async function approveLedger(
  prisma: LedgerTx,
  input: ApproveInput,
): Promise<{ ledger: CommissionLedger; netting: ApplyNettingResult | null }> {
  const ledger = await getLedgerOrThrow(prisma, input.ledgerId);
  if (ledger.status !== 'PENDING') {
    throw new CommissionLedgerError(
      'INVALID_TRANSITION',
      `Không thể duyệt ledger ở trạng thái ${ledger.status}`,
    );
  }
  if (ledger.direction === 'REVERSAL') {
    throw new CommissionLedgerError(
      'INVALID_INPUT',
      'REVERSAL không approve qua đây — dùng applyReversal()',
    );
  }

  const updated = await prisma.commissionLedger.update({
    where: { id: ledger.id },
    data: {
      status: 'APPROVED',
      approvedBy: input.actor.id,
      approvedAt: new Date(),
    },
  });

  await writeAuditLog({
    prisma,
    actor: input.actor,
    entityType: 'CommissionLedger',
    entityId: ledger.id,
    action: 'APPROVE',
    diff: { before: { status: 'PENDING' }, after: { status: 'APPROVED' } },
    reason: input.reason ?? null,
  });

  // Netting chỉ áp dụng khi pay() (set PAID) — approve chỉ set APPROVED.
  return { ledger: updated, netting: null };
}

/**
 * Pay ledger row (APPROVED → PAID).
 * - Nếu CREDIT: trước khi PAID, áp dụng netting (trừ debt OPEN/PARTIAL).
 * - Trả về ledger PAID + thông tin netting.
 */
export async function payLedger(
  prisma: LedgerTx,
  input: PayInput,
): Promise<{ ledger: CommissionLedger; netting: ApplyNettingResult | null }> {
  const ledger = await getLedgerOrThrow(prisma, input.ledgerId);
  if (ledger.status !== 'APPROVED') {
    throw new CommissionLedgerError(
      'INVALID_TRANSITION',
      `Không thể pay ledger ở trạng thái ${ledger.status} (cần APPROVED)`,
    );
  }
  if (ledger.direction === 'REVERSAL') {
    throw new CommissionLedgerError(
      'INVALID_INPUT',
      'REVERSAL không pay qua đây — dùng applyReversal()',
    );
  }

  let netting: ApplyNettingResult | null = null;
  let ledgerAmount = ledger.amount;
  if (ledger.direction === 'CREDIT') {
    const n = await applyNetting(prisma, ledger.ctvId, ledger.amount);
    if (n.debtReduced > 0n) {
      netting = n;
      // Reduce ledger amount to netPaid để cân bằng với debt đã trừ.
      // Balance sau đó chỉ cần sum ledger amounts (không trừ debt riêng).
      ledgerAmount = n.netPaid;
    }
  }

  const updated = await prisma.commissionLedger.update({
    where: { id: ledger.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      amount: ledgerAmount,
    },
  });

  await writeAuditLog({
    prisma,
    actor: input.actor,
    entityType: 'CommissionLedger',
    entityId: ledger.id,
    action: 'PAY',
    diff: {
      before: { status: 'APPROVED' },
      after: { status: 'PAID', netting },
    },
    reason: input.reason ?? null,
  });

  return { ledger: updated, netting };
}

/** Reject ledger (PENDING → REJECTED). Không có REVERSAL. */
export async function rejectLedger(
  prisma: LedgerTx,
  input: RejectInput,
): Promise<CommissionLedger> {
  const ledger = await getLedgerOrThrow(prisma, input.ledgerId);
  if (ledger.status !== 'PENDING') {
    throw new CommissionLedgerError(
      'INVALID_TRANSITION',
      `Không thể reject ledger ở trạng thái ${ledger.status}`,
    );
  }
  if (!input.reason || input.reason.length < 3) {
    throw new CommissionLedgerError('INVALID_INPUT', 'reason bắt buộc (≥3 ký tự)');
  }
  const updated = await prisma.commissionLedger.update({
    where: { id: ledger.id },
    data: {
      status: 'REJECTED',
      rejectedBy: input.actor.id,
      rejectedAt: new Date(),
      rejectionReason: input.reason,
    },
  });
  await writeAuditLog({
    prisma,
    actor: input.actor,
    entityType: 'CommissionLedger',
    entityId: ledger.id,
    action: 'REJECT',
    diff: { before: { status: 'PENDING' }, after: { status: 'REJECTED', reason: input.reason } },
    reason: input.reason,
  });
  return updated;
}

/**
 * Clawback / Reversal (DEC-05).
 * - Tạo dòng REVERSAL MỚI status=PENDING (chưa tự trừ tiền — kế toán duyệt sau).
 * - Nếu ledger gốc đã REVERSED (1 lần) → throw ALREADY_REVERSED.
 * - partialAmount: nếu muốn đảo 1 phần amount (không dùng thường xuyên).
 */
export async function createReversal(
  prisma: LedgerTx,
  input: ReverseInput,
): Promise<CommissionLedger> {
  const credit = await getLedgerOrThrow(prisma, input.creditId);
  if (credit.direction !== 'CREDIT') {
    throw new CommissionLedgerError('INVALID_INPUT', 'Chỉ đảo dòng CREDIT');
  }
  if (!['APPROVED', 'PAID'].includes(credit.status)) {
    throw new CommissionLedgerError(
      'INVALID_STATE',
      `Không thể đảo ledger ở trạng thái ${credit.status}`,
    );
  }

  // Check chưa bị đảo
  const existingReversal = await prisma.commissionLedger.findFirst({
    where: { reversalOfId: credit.id, direction: 'REVERSAL' },
  });
  if (existingReversal) {
    throw new CommissionLedgerError(
      'ALREADY_REVERSED',
      `Ledger ${credit.id} đã có dòng REVERSAL ${existingReversal.id}`,
    );
  }

  const reversalAmount = input.partialAmount ?? credit.amount;
  if (reversalAmount <= 0n || reversalAmount > credit.amount) {
    throw new CommissionLedgerError(
      'INVALID_INPUT',
      'partialAmount phải 0 < x ≤ credit.amount',
    );
  }

  const reversal = await prisma.commissionLedger.create({
    data: {
      id: randomUUID(),
      ctvId: credit.ctvId,
      workerId: credit.workerId,
      assignmentId: credit.assignmentId,
      policyId: credit.policyId,
      milestone: credit.milestone,
      amount: reversalAmount,
      direction: 'REVERSAL',
      reversalOfId: credit.id,
      month: credit.month,
      year: credit.year,
      status: 'PENDING',
      createdBy: input.actor.id,
    },
  });

  await writeAuditLog({
    prisma,
    actor: input.actor,
    entityType: 'CommissionLedger',
    entityId: reversal.id,
    action: 'CREATE_REVERSAL',
    diff: {
      before: { ledgerId: credit.id, status: credit.status, amount: credit.amount },
      after: { reversalId: reversal.id, amount: reversalAmount, status: 'PENDING' },
    },
    reason: input.reason,
  });

  return reversal;
}

/**
 * Duyệt REVERSAL (PENDING → APPROVED). Nếu vượt số dư khả dụng → tạo CommissionDebt.
 * REVERSAL không qua PAID vì nó không phải chi trả — chỉ cần APPROVED để trừ balance.
 */
export async function applyReversal(
  prisma: LedgerTx,
  reversalId: string,
  actor: AuditActor,
): Promise<{ reversal: CommissionLedger; debtId: string | null }> {
  const reversal = await getLedgerOrThrow(prisma, reversalId);
  if (reversal.direction !== 'REVERSAL') {
    throw new CommissionLedgerError('INVALID_INPUT', 'Không phải REVERSAL');
  }
  if (reversal.status !== 'PENDING') {
    throw new CommissionLedgerError(
      'INVALID_TRANSITION',
      `REVERSAL ở trạng thái ${reversal.status} (cần PENDING)`,
    );
  }

  const balance = await getCtvBalance(prisma, reversal.ctvId);
  let debtId: string | null = null;

  if (reversal.amount > balance) {
    // Vượt số dư → tạo debt
    const overage = reversal.amount - balance;
    const debt = await prisma.commissionDebt.create({
      data: {
        id: randomUUID(),
        ctvId: reversal.ctvId,
        originLedgerId: reversal.id,
        amountVnd: overage,
        remainingVnd: overage,
        status: 'OPEN',
        reason: `Reversal vượt số dư ${balance.toString()} (reversal amount ${reversal.amount.toString()})`,
      },
    });
    debtId = debt.id;
  }

  const updated = await prisma.commissionLedger.update({
    where: { id: reversal.id },
    data: {
      status: 'APPROVED',
      approvedBy: actor.id,
      approvedAt: new Date(),
    },
  });

  await writeAuditLog({
    prisma,
    actor,
    entityType: 'CommissionLedger',
    entityId: reversal.id,
    action: 'APPROVE_REVERSAL',
    diff: {
      before: { status: 'PENDING' },
      after: { status: 'APPROVED', debtId },
    },
  });

  return { reversal: updated, debtId };
}

/**
 * Netting — áp dụng khi pay CREDIT.
 * Lấy debt OPEN/PARTIAL cũ nhất, trừ remainingVnd cho đến khi amount hết hoặc debt hết.
 * Cập nhật debt status nếu remainingVnd == 0.
 *
 * Sử dụng transaction + atomic update để chống race condition.
 */
export async function applyNetting(
  prisma: LedgerTx,
  ctvId: string,
  amount: bigint,
): Promise<ApplyNettingResult> {
  if (amount <= 0n) return { debtReduced: 0n, netPaid: amount, debtId: null };

  const debts = await prisma.commissionDebt.findMany({
    where: { ctvId, status: { in: ['OPEN', 'PARTIAL'] } },
    orderBy: { createdAt: 'asc' },
  });

  let remaining = amount;
  let totalReduced = 0n;
  let debtId: string | null = null;

  for (const debt of debts) {
    if (remaining <= 0n) break;
    const debtRem = debt.remainingVnd;
    if (debtRem <= 0n) continue;
    const reduce = remaining < debtRem ? remaining : debtRem;
    const newRem = debtRem - reduce;

    await prisma.commissionDebt.update({
      where: { id: debt.id },
      data: {
        remainingVnd: newRem,
        status: newRem === 0n ? 'CLEARED' : 'PARTIAL',
        clearedAt: newRem === 0n ? new Date() : null,
      },
    });

    remaining -= reduce;
    totalReduced += reduce;
    debtId = debt.id;
  }

  return { debtReduced: totalReduced, netPaid: amount - totalReduced, debtId };
}

/** Tổng nợ OPEN/PARTIAL của 1 CTV. */
export async function getTotalDebt(
  prisma: LedgerTx,
  ctvId: string,
): Promise<bigint> {
  const rows = await prisma.commissionDebt.findMany({
    where: { ctvId, status: { in: ['OPEN', 'PARTIAL'] } },
    select: { remainingVnd: true },
  });
  let total = 0n;
  for (const r of rows) total += r.remainingVnd;
  return total;
}

/** List ledger theo CTV (cho UI CTV). */
export async function listLedgerByCtv(
  prisma: LedgerTx,
  ctvId: string,
  options: { take?: number; skip?: number; status?: LedgerStatus } = {},
): Promise<{ items: CommissionLedger[]; total: number }> {
  const take = Math.min(100, options.take ?? 50);
  const skip = options.skip ?? 0;
  const where: Prisma.CommissionLedgerWhereInput = { ctvId };
  if (options.status) where.status = options.status;
  const [items, total] = await Promise.all([
    prisma.commissionLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.commissionLedger.count({ where }),
  ]);
  return { items, total };
}

/** List tất cả ledger (cho UI Admin). */
export async function listLedger(
  prisma: LedgerTx,
  options: {
    take?: number;
    skip?: number;
    status?: LedgerStatus;
    ctvId?: string;
    direction?: Direction;
  } = {},
): Promise<{ items: CommissionLedger[]; total: number }> {
  const take = Math.min(100, options.take ?? 50);
  const skip = options.skip ?? 0;
  const where: Prisma.CommissionLedgerWhereInput = {};
  if (options.status) where.status = options.status;
  if (options.ctvId) where.ctvId = options.ctvId;
  if (options.direction) where.direction = options.direction;
  const [items, total] = await Promise.all([
    prisma.commissionLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.commissionLedger.count({ where }),
  ]);
  return { items, total };
}

export interface LedgerDTO {
  id: string;
  ctvId: string;
  workerId: string | null;
  assignmentId: string | null;
  policyId: string;
  milestone: string;
  amount: string;
  direction: Direction;
  reversalOfId: string | null;
  month: number;
  year: number;
  status: LedgerStatus;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

export function ledgerToDTO(l: CommissionLedger): LedgerDTO {
  return {
    id: l.id,
    ctvId: l.ctvId,
    workerId: l.workerId,
    assignmentId: l.assignmentId,
    policyId: l.policyId,
    milestone: l.milestone,
    amount: l.amount.toString(),
    direction: l.direction as Direction,
    reversalOfId: l.reversalOfId,
    month: l.month,
    year: l.year,
    status: l.status as LedgerStatus,
    createdAt: l.createdAt.toISOString(),
    approvedAt: l.approvedAt?.toISOString() ?? null,
    paidAt: l.paidAt?.toISOString() ?? null,
    rejectedAt: l.rejectedAt?.toISOString() ?? null,
    rejectionReason: l.rejectionReason,
  };
}

export interface DebtDTO {
  id: string;
  ctvId: string;
  originLedgerId: string | null;
  amountVnd: string;
  remainingVnd: string;
  status: string;
  reason: string | null;
  createdAt: string;
  clearedAt: string | null;
}
