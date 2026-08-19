/**
 * Commission Policy Service — P2 Commission STEP-02 (RQ-02).
 *
 * CRUD + versioning cho `commission_policies`.
 *
 * ADR-013: Update policy = TẠO ROW MỚI (version++), KHÔNG mutate row cũ.
 *   Mỗi dòng Ledger tham chiếu `policyId` cụ thể, đảm bảo lịch sử bất biến.
 *
 * Permission:
 *   - WRITE (ROOT, DIRECTOR) — DEC-02 + TASK §4.3
 *   - READ (ADMIN, HR_MANAGER, ACCOUNTANT)
 *
 * BigInt: `value` BigInt (VND nguyên) — serialized sang string qua API.
 */
import type { PrismaClient, CommissionPolicy, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

/** Cho phép dùng ở top-level (PrismaClient) hoặc trong $transaction (TransactionClient). */
export type PolicyTx = PrismaClient | Prisma.TransactionClient;

export class CommissionPolicyError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'INVALID_INPUT' | 'ALREADY_EXISTS' | 'NO_VERSION',
    message: string,
  ) {
    super(message);
    this.name = 'CommissionPolicyError';
  }
}

export interface CreatePolicyInput {
  name: string;
  calcType: 'PER_HEAD_MILESTONE' | 'PERCENT_OF_REVENUE';
  value: bigint;
  conditions?: Prisma.JsonObject;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  createdBy?: string;
}

export interface UpdatePolicyInput {
  /** Update = tạo version mới. Cung cấp id của policy cũ để tham chiếu. */
  previousId: string;
  name: string;
  calcType: 'PER_HEAD_MILESTONE' | 'PERCENT_OF_REVENUE';
  value: bigint;
  conditions?: Prisma.JsonObject;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  createdBy?: string;
}

export interface PolicyDTO {
  id: string;
  name: string;
  calcType: string;
  value: string; // BigInt → string
  conditions: Prisma.JsonValue;
  effectiveFrom: string; // ISO date
  effectiveTo: string | null;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const ALLOWED_CALC_TYPES = new Set(['PER_HEAD_MILESTONE', 'PERCENT_OF_REVENUE']);

export function toDTO(p: CommissionPolicy): PolicyDTO {
  return {
    id: p.id,
    name: p.name,
    calcType: p.calcType,
    value: p.value.toString(),
    conditions: p.conditions,
    effectiveFrom: p.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: p.effectiveTo ? p.effectiveTo.toISOString().slice(0, 10) : null,
    version: p.version,
    createdBy: p.createdBy,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function validateCreateInput(input: CreatePolicyInput): void {
  if (!input.name || input.name.length > 200) {
    throw new CommissionPolicyError('INVALID_INPUT', 'name bắt buộc (≤200 ký tự)');
  }
  if (!ALLOWED_CALC_TYPES.has(input.calcType)) {
    throw new CommissionPolicyError(
      'INVALID_INPUT',
      `calcType phải là một trong: ${[...ALLOWED_CALC_TYPES].join(', ')}`,
    );
  }
  if (input.value <= 0n) {
    throw new CommissionPolicyError('INVALID_INPUT', 'value phải > 0');
  }
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) {
    throw new CommissionPolicyError('INVALID_INPUT', 'effectiveTo phải ≥ effectiveFrom');
  }
}

export async function createPolicy(
  prisma: PolicyTx,
  input: CreatePolicyInput,
): Promise<CommissionPolicy> {
  validateCreateInput(input);
  return prisma.commissionPolicy.create({
    data: {
      id: randomUUID(),
      name: input.name,
      calcType: input.calcType,
      value: input.value,
      conditions: (input.conditions ?? {}) as Prisma.JsonObject,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      version: 1,
      createdBy: input.createdBy ?? null,
    },
  });
}

/**
 * Update policy = tạo row mới (ADR-013 immutable ledger).
 * - `previousId` xác định policy cũ.
 * - Lookup policy cũ để bump version.
 * - Tên phải khác version trước (đảm bảo lịch sử) — có thể giữ nguyên tên.
 */
export async function updatePolicy(
  prisma: PolicyTx,
  input: UpdatePolicyInput,
): Promise<CommissionPolicy> {
  validateCreateInput(input);

  const previous = await prisma.commissionPolicy.findUnique({
    where: { id: input.previousId },
  });
  if (!previous) {
    throw new CommissionPolicyError('NOT_FOUND', `Policy ${input.previousId} không tồn tại`);
  }

  return prisma.commissionPolicy.create({
    data: {
      id: randomUUID(),
      name: input.name,
      calcType: input.calcType,
      value: input.value,
      conditions: (input.conditions ?? {}) as Prisma.JsonObject,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      version: previous.version + 1,
      createdBy: input.createdBy ?? null,
    },
  });
}

export async function getPolicyById(
  prisma: PolicyTx,
  id: string,
): Promise<CommissionPolicy | null> {
  return prisma.commissionPolicy.findUnique({ where: { id } });
}

export async function listPolicies(
  prisma: PolicyTx,
  options: { take?: number; skip?: number; effectiveAt?: Date } = {},
): Promise<{ items: CommissionPolicy[]; total: number }> {
  const take = Math.min(100, options.take ?? 50);
  const skip = options.skip ?? 0;
  const where: Prisma.CommissionPolicyWhereInput = {};
  if (options.effectiveAt) {
    where.effectiveFrom = { lte: options.effectiveAt };
    where.OR = [
      { effectiveTo: null },
      { effectiveTo: { gte: options.effectiveAt } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.commissionPolicy.findMany({
      where,
      orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
      take,
      skip,
    }),
    prisma.commissionPolicy.count({ where }),
  ]);
  return { items, total };
}
