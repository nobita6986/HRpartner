/**
 * Referral Guard — Phase 4 slice 4A STEP-04 (RQ-03, DEC-09).
 *
 * Kiểm tra R1/R2/R3 khi tạo submission hoặc assignment.
 * Override S1/S2/S3 cần CAN_OVERRIDE_REFERRAL_GUARD + audit log.
 *
 * DEC-09 rules:
 *   R1 IN_7D_WINDOW — submission/worker tạo trong 7 ngày gần nhất (config REFERRAL_GUARD_DAYS)
 *   R2 COMMISSION_ACTIVE — vendor có contract hiệu lực cho project
 *   R3 VENDOR_PAYROLL_ACTIVE — vendor đã setup payroll (VendorRateCard active)
 *
 * Block codes: R1 / R2 / R3 (bitmask 0b001/010/100)
 * Override: cần CAN_OVERRIDE_REFERRAL_GUARD + overrideCase (S1|S2|S3) + reason + evidence + audit.
 */

import { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';

// ─── Config ───────────────────────────────────────────────────────────────────

export const REFERRAL_GUARD_DAYS = Number(process.env['REFERRAL_GUARD_DAYS'] ?? 7);

// ─── Types ───────────────────────────────────────────────────────────────────

export const GUARD_RULES = ['R1', 'R2', 'R3'] as const;
export type GuardRule = (typeof GUARD_RULES)[number];

export type OverrideCase = 'S1' | 'S2' | 'S3';

export interface GuardContext {
  workerId: string;
  vendorId: string;
  projectId: string;
  /** Submission tạo gần đây (đã có trong DB) — dùng cho R1 check */
  submissionId?: string;
}

export interface GuardResult {
  allowed: boolean;
  /** 0 = pass, 1 = R1 fail, 2 = R2 fail, 4 = R3 fail */
  blockCode: 0 | 1 | 2 | 4;
  failedRules: GuardRule[];
}

export interface OverrideInput {
  overrideCase: OverrideCase;
  reason: string;
  evidence?: string;
}

export interface GuardAuditData {
  workerId: string;
  vendorId: string;
  projectId: string;
  blockCode: number;
  overrideCase?: OverrideCase;
  reason?: string;
  evidence?: string;
  actor: AuthContext;
}

// ─── Rule evaluators ─────────────────────────────────────────────────────────

/**
 * R1: IN_7D_WINDOW
 * CandidateSubmission có mergedWorkerId = ctx.workerId, createdAt trong cửa sổ REFERRAL_GUARD_DAYS.
 *
 * mergedWorkerId: Worker đã được dedup sau khi submit.
 * (CandidateSubmission không có trường workerId trực tiếp).
 */
async function checkR1(tx: Prisma.TransactionClient, ctx: GuardContext): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - REFERRAL_GUARD_DAYS);

  const recent = await tx.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM candidate_submissions
     WHERE merged_worker_id = $1
       AND created_at >= $2
     LIMIT 1`,
    ctx.workerId,
    cutoff,
  );

  // PASS nếu CÓ submission trong cửa sổ (worker đã từng submit → block)
  // FAIL nếu KHÔNG có
  return recent.length > 0;
}

/**
 * R2: COMMISSION_ACTIVE
 * Vendor có contract (CLIENT_SUPPLY | VENDOR_FRAMEWORK) hiệu lực cho project này.
 *
 * Contract hiệu lực = now() BETWEEN startDate AND endDate (hoặc endDate IS NULL).
 */
async function checkR2(tx: Prisma.TransactionClient, ctx: GuardContext): Promise<boolean> {
  const now = new Date();
  const contract = await tx.contract.findFirst({
    where: {
      projectId: ctx.projectId,
      type: { in: ['CLIENT_SUPPLY', 'VENDOR_FRAMEWORK'] },
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    select: { id: true },
  });

  // PASS nếu CÓ contract active (vendor được commission → block)
  // FAIL (block) nếu KHÔNG có
  return contract !== null;
}

/**
 * R3: VENDOR_PAYROLL_ACTIVE
 * Vendor đã setup VendorRateCard cho project này (đã bắt đầu tính lương).
 *
 * VendorRateCard hiệu lực = now() BETWEEN effectiveFrom AND effectiveTo.
 */
async function checkR3(tx: Prisma.TransactionClient, ctx: GuardContext): Promise<boolean> {
  const now = new Date();

  // Tìm contract active của vendor cho project này
  const contract = await tx.contract.findFirst({
    where: {
      projectId: ctx.projectId,
      type: { in: ['CLIENT_SUPPLY', 'VENDOR_FRAMEWORK'] },
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    select: { id: true },
  });

  if (!contract) return false;

  const rateCard = await tx.vendorRateCard.findFirst({
    where: {
      contractId: contract.id,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    select: { id: true },
  });

  // PASS nếu CÓ rate card active (vendor đã payroll → block)
  // FAIL (block) nếu KHÔNG có
  return rateCard !== null;
}

// ─── Main guard ──────────────────────────────────────────────────────────────

/**
 * Evaluate all 3 rules. Trả GuardResult.
 * Block codes: R1=1, R2=2, R3=4. Bitmask để support multi-rule fail.
 */
export async function evaluateReferralGuard(
  tx: Prisma.TransactionClient,
  ctx: GuardContext,
): Promise<GuardResult> {
  const [r1, r2, r3] = await Promise.all([
    checkR1(tx, ctx),
    checkR2(tx, ctx),
    checkR3(tx, ctx),
  ]);

  let blockCode: 0 | 1 | 2 | 4 = 0;
  const failedRules: GuardRule[] = [];

  // PASS (rule = true) → BLOCK (blockCode bit set)
  // FAIL (rule = false) → ALLOW (không block)
  if (r1) { blockCode |= 1; failedRules.push('R1'); }
  if (r2) { blockCode |= 2; failedRules.push('R2'); }
  if (r3) { blockCode |= 4; failedRules.push('R3'); }

  return { allowed: blockCode === 0, blockCode: blockCode as 0|1|2|4, failedRules };
}

/**
 * Apply override (S1/S2/S3) — ghi audit log.
 * Require CAN_OVERRIDE_REFERRAL_GUARD permission.
 *
 * Override cho phép bỏ qua block để tiếp tục tạo submission/assignment.
 * Audit log ghi lại override để kiểm tra sau.
 */
export async function applyOverride(
  tx: Prisma.TransactionClient,
  actor: AuthContext,
  ctx: GuardContext,
  guardResult: GuardResult,
  override: OverrideInput,
): Promise<void> {
  // DEC-03: override CHI duoc khi worker bi block (allowed === false).
  // Neu worker khong bi block (allowed === true) -> khong co gi de override.
  if (guardResult.allowed) {
    throw new ReferralGuardError(
      'NOT_BLOCKED',
      `Cannot override: worker not blocked. There is nothing to override.`,
    );
  }

  // Verify permission
  const effPerms = await resolveEffectivePermissions({
    userId: actor.userId,
    role: actor.role,
  });
  if (!effPerms.has('CAN_OVERRIDE_REFERRAL_GUARD')) {
    throw new ReferralGuardError(
      'PERMISSION_DENIED',
      `Role ${actor.role} lacks CAN_OVERRIDE_REFERRAL_GUARD`,
    );
  }

  // Audit log
  await tx.auditLog.create({
    data: {
      entityType: 'REFERRAL_GUARD',
      entityId: ctx.workerId,
      action: `OVERRIDE_${override.overrideCase}`,
      actorId: actor.userId,
      diff: {
        vendorId: ctx.vendorId,
        projectId: ctx.projectId,
        originalBlockCode: guardResult.blockCode,
        overrideCase: override.overrideCase,
        reason: override.reason,
        evidence: override.evidence ?? null,
      } as unknown as Prisma.InputJsonValue,
    },
  });
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class ReferralGuardError extends Error {
  constructor(
    public readonly code: 'BLOCKED' | 'NOT_BLOCKED' | 'PERMISSION_DENIED' | 'INTERNAL',
    message: string,
    public readonly details?: { blockCode?: number; failedRules?: GuardRule[] },
  ) {
    super(message);
    this.name = 'ReferralGuardError';
  }
}
