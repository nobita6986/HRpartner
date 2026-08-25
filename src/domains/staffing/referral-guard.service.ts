/**
 * Referral Guard — Phase 4 slice 4A STEP-04 (RQ-03, DEC-09), corrected for
 * MP-3C STEP-02 (RQ-06, DEC-07, EV-06).
 *
 * Kiểm tra R1/R2/R3 khi tạo submission hoặc assignment.
 * Override S1/S2/S3 cần CAN_OVERRIDE_REFERRAL_GUARD + audit log.
 *
 * DEC-09 rules:
 *   R1 IN_7D_WINDOW — submission/worker tạo trong 7 ngày gần nhất (config REFERRAL_GUARD_DAYS)
 *   R2 COMMISSION_ACTIVE — vendor có contract hiệu lực cho project
 *   R3 VENDOR_PAYROLL_ACTIVE — vendor đã setup payroll (VendorRateCard active)
 *
 * Block codes: R1=1 / R2=2 / R3=4, bitmask — mọi tổ hợp 0..7 hợp lệ (RQ-06).
 * Override: cần CAN_OVERRIDE_REFERRAL_GUARD + overrideCase (S1|S2|S3) + reason + evidence + audit.
 *
 * MP-3C corrections (EV-06):
 *   1. R1 đọc canonical conversion link `candidate_submissions.worker_id`
 *      (MP-3B). `merged_worker_id` chỉ còn là fallback cho row LEGACY chưa có
 *      canonical link — nó KHÔNG còn là authority.
 *   2. `blockCode` là bitmask đầy đủ 0..7; type cũ (0|1|2|4) không biểu diễn
 *      được tổ hợp 3/5/6/7 nên đã truncate.
 *   3. R2/R3 là rule VENDOR. Referral PUBLIC/CTV không có vendor → hai rule đó
 *      KHÔNG được giả lập (DEC-07): chúng bị SKIP và bit tương ứng luôn = 0.
 *   4. `applyOverride` nhận trước kết quả permission (`hasOverridePermission`)
 *      để caller giữ được ràng buộc "không I/O ngoài transaction sau khi lấy
 *      lock" (MP-3C 4.4) — resolver mở connection riêng ngoài tx.
 */

import { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';

// ─── Config ───────────────────────────────────────────────────────────────────

export const REFERRAL_GUARD_DAYS = Number(process.env['REFERRAL_GUARD_DAYS'] ?? 7);

// ─── Types ───────────────────────────────────────────────────────────────────

export const GUARD_RULES = ['R1', 'R2', 'R3'] as const;
export type GuardRule = (typeof GUARD_RULES)[number];

/** Bit per rule — R1=1, R2=2, R3=4. */
export const GUARD_RULE_BITS: Readonly<Record<GuardRule, 1 | 2 | 4>> = { R1: 1, R2: 2, R3: 4 };

/** Full bitmask domain (RQ-06): every combination of R1/R2/R3 is representable. */
export type GuardBlockCode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** VENDOR rules (R2/R3) only apply to a vendor-sourced referral (DEC-07). */
export const VENDOR_ONLY_RULES: readonly GuardRule[] = ['R2', 'R3'];

export type ReferralSource = 'VENDOR' | 'CTV' | 'PUBLIC';

export type OverrideCase = 'S1' | 'S2' | 'S3';

export interface GuardContext {
  workerId: string;
  /** null cho referral PUBLIC/CTV — KHÔNG được bịa vendor (DEC-07). */
  vendorId: string | null;
  projectId: string;
  /** Nguồn referral. Suy ra từ vendorId/ctvId nếu không truyền. */
  source?: ReferralSource;
  /** CTV giới thiệu (chỉ dùng để suy ra `source`). */
  ctvId?: string | null;
  /** Submission tạo gần đây (đã có trong DB) — dùng cho R1 check */
  submissionId?: string;
}

export interface GuardResult {
  allowed: boolean;
  /** Bitmask 0..7 — R1=1, R2=2, R3=4 (0 = pass). */
  blockCode: GuardBlockCode;
  failedRules: GuardRule[];
  /** Rule KHÔNG được đánh giá vì referral không có vendor (PUBLIC/CTV). */
  skippedRules: GuardRule[];
  source: ReferralSource;
}

export interface OverrideInput {
  overrideCase: OverrideCase;
  reason: string;
  evidence?: string;
}

/** Cho phép caller truyền trước kết quả permission (pre-lock) — 4.4. */
export interface ApplyOverrideOptions {
  /**
   * Đã resolve `CAN_OVERRIDE_REFERRAL_GUARD` TRƯỚC khi vào vùng có lock.
   * Khi undefined, hàm tự resolve (mở connection riêng — chỉ dùng ngoài lock).
   */
  hasOverridePermission?: boolean;
  /** entityType của audit row; mặc định 'REFERRAL_GUARD'. */
  entityType?: string;
  /** entityId của audit row; mặc định ctx.workerId. */
  entityId?: string;
  /** Field bổ sung ghi vào audit diff (vd submissionId, slotId). */
  extra?: Record<string, unknown>;
}

export interface GuardAuditData {
  workerId: string;
  vendorId: string | null;
  projectId: string;
  blockCode: number;
  overrideCase?: OverrideCase;
  reason?: string;
  evidence?: string;
  actor: AuthContext;
}

// ─── Source resolution (DEC-07) ──────────────────────────────────────────────

/** VENDOR khi có vendorId; CTV khi có ctvId; còn lại PUBLIC. Không suy diễn khác. */
export function resolveReferralSource(ctx: GuardContext): ReferralSource {
  if (ctx.source) return ctx.source;
  if (ctx.vendorId) return 'VENDOR';
  if (ctx.ctvId) return 'CTV';
  return 'PUBLIC';
}

/** Chỉ referral VENDOR mới chạy R2/R3 (rule commission/payroll của vendor). */
export function appliesVendorRules(source: ReferralSource): boolean {
  return source === 'VENDOR';
}

// ─── Rule evaluators ─────────────────────────────────────────────────────────

/**
 * R1: IN_7D_WINDOW
 *
 * Canonical (MP-3B): `candidate_submissions.worker_id` — submission ĐÃ convert
 * sang chính worker này. `merged_worker_id` chỉ được xét cho row LEGACY chưa có
 * canonical link (`worker_id IS NULL`), nên canonical luôn là authority.
 *
 * `ctx.submissionId` (khi có) là submission ĐANG được xử lý: nó là claim của
 * chính nó nên bị LOẠI khỏi cửa sổ — R1 chỉ chặn khi tồn tại claim KHÁC cho cùng
 * worker trong cửa sổ. Đây đúng là mục đích đã ghi của field này.
 */
async function checkR1(tx: Prisma.TransactionClient, ctx: GuardContext): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - REFERRAL_GUARD_DAYS);

  const recent = await tx.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM candidate_submissions
     WHERE (
             worker_id = $1
             OR (worker_id IS NULL AND merged_worker_id = $1)
           )
       AND created_at >= $2
       AND ($3::text IS NULL OR id <> $3::text)
     LIMIT 1`,
    ctx.workerId,
    cutoff,
    ctx.submissionId ?? null,
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
 * Evaluate rules. Trả GuardResult.
 *
 * R1 luôn chạy. R2/R3 chỉ chạy cho referral VENDOR (DEC-07) — với PUBLIC/CTV
 * chúng được liệt kê ở `skippedRules` và bit tương ứng giữ 0, KHÔNG giả lập.
 */
export async function evaluateReferralGuard(
  tx: Prisma.TransactionClient,
  ctx: GuardContext,
): Promise<GuardResult> {
  const source = resolveReferralSource(ctx);
  const vendorRules = appliesVendorRules(source);

  const [r1, r2, r3] = await Promise.all([
    checkR1(tx, ctx),
    vendorRules ? checkR2(tx, ctx) : Promise.resolve(false),
    vendorRules ? checkR3(tx, ctx) : Promise.resolve(false),
  ]);

  let blockCode = 0;
  const failedRules: GuardRule[] = [];

  // PASS (rule = true) → BLOCK (blockCode bit set)
  // FAIL (rule = false) → ALLOW (không block)
  if (r1) { blockCode |= GUARD_RULE_BITS.R1; failedRules.push('R1'); }
  if (r2) { blockCode |= GUARD_RULE_BITS.R2; failedRules.push('R2'); }
  if (r3) { blockCode |= GUARD_RULE_BITS.R3; failedRules.push('R3'); }

  return {
    allowed: blockCode === 0,
    blockCode: blockCode as GuardBlockCode,
    failedRules,
    skippedRules: vendorRules ? [] : [...VENDOR_ONLY_RULES],
    source,
  };
}

/** Human-readable block label, vd 0 → 'NONE', 3 → 'R1+R2'. */
export function describeBlockCode(blockCode: number): string {
  const parts = GUARD_RULES.filter((rule) => (blockCode & GUARD_RULE_BITS[rule]) !== 0);
  return parts.length === 0 ? 'NONE' : parts.join('+');
}

/**
 * Apply override (S1/S2/S3) — ghi audit log.
 * Require CAN_OVERRIDE_REFERRAL_GUARD permission.
 *
 * Override cho phép bỏ qua block để tiếp tục tạo submission/assignment.
 * Audit log ghi lại override để kiểm tra sau (đúng 1 row / 1 transaction).
 */
export async function applyOverride(
  tx: Prisma.TransactionClient,
  actor: AuthContext,
  ctx: GuardContext,
  guardResult: GuardResult,
  override: OverrideInput,
  options: ApplyOverrideOptions = {},
): Promise<void> {
  // DEC-03: override CHI duoc khi worker bi block (allowed === false).
  // Neu worker khong bi block (allowed === true) -> khong co gi de override.
  if (guardResult.allowed) {
    throw new ReferralGuardError(
      'NOT_BLOCKED',
      `Cannot override: worker not blocked. There is nothing to override.`,
    );
  }

  if (!isOverrideCase(override.overrideCase)) {
    throw new ReferralGuardError(
      'INVALID_OVERRIDE_CASE',
      `overrideCase must be one of S1|S2|S3 (got "${String(override.overrideCase)}")`,
    );
  }
  if (!override.reason?.trim()) {
    throw new ReferralGuardError('REASON_REQUIRED', 'A non-empty override reason is required');
  }

  // Verify permission. `hasOverridePermission` đã resolve trước (pre-lock) →
  // không mở connection mới trong vùng đã giữ lock (4.4).
  const permitted = options.hasOverridePermission ?? (
    await resolveEffectivePermissions({ userId: actor.userId, role: actor.role })
  ).has('CAN_OVERRIDE_REFERRAL_GUARD');
  if (!permitted) {
    throw new ReferralGuardError(
      'PERMISSION_DENIED',
      `Role ${actor.role} lacks CAN_OVERRIDE_REFERRAL_GUARD`,
    );
  }

  // Audit log
  await tx.auditLog.create({
    data: {
      entityType: options.entityType ?? 'REFERRAL_GUARD',
      entityId: options.entityId ?? ctx.workerId,
      action: `OVERRIDE_${override.overrideCase}`,
      actorId: actor.userId,
      actorRole: actor.role,
      reason: override.reason.trim(),
      diff: {
        workerId: ctx.workerId,
        vendorId: ctx.vendorId,
        projectId: ctx.projectId,
        source: guardResult.source,
        originalBlockCode: guardResult.blockCode,
        originalBlockLabel: describeBlockCode(guardResult.blockCode),
        failedRules: guardResult.failedRules,
        overrideCase: override.overrideCase,
        reason: override.reason.trim(),
        evidence: override.evidence ?? null,
        ...(options.extra ?? {}),
      } as unknown as Prisma.InputJsonValue,
    },
  });
}

export function isOverrideCase(value: unknown): value is OverrideCase {
  return value === 'S1' || value === 'S2' || value === 'S3';
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class ReferralGuardError extends Error {
  constructor(
    public readonly code:
      | 'BLOCKED'
      | 'NOT_BLOCKED'
      | 'PERMISSION_DENIED'
      | 'INVALID_OVERRIDE_CASE'
      | 'REASON_REQUIRED'
      | 'INTERNAL',
    message: string,
    public readonly details?: { blockCode?: number; failedRules?: GuardRule[] },
  ) {
    super(message);
    this.name = 'ReferralGuardError';
  }
}
