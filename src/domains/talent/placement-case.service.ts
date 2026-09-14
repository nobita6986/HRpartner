/**
 * placement-case.service.ts — N1 intake writer (STEP-05).
 *
 * openPlacementCase — command mở một PlacementCase active gắn với LaborProfile.
 *
 * Quy tắc (DEC-04 + V6P-003):
 *   - Race-safe nhờ partial unique index `placement_case_labor_profile_id_active_unique`
 *     (đã có ở N1 foundation migration — `20260912140411_n1_placement_case_foundation`).
 *   - INSERT race thua: Prisma throw P2002 → catch → SELECT existing active case
 *     → trả về caller (idempotent từ caller POV, KHÔNG 500).
 *   - Idempotency: wrap qua `withIdempotency` nếu caller cung cấp `idempotencyKey`.
 */

import { Prisma } from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';
import { withIdempotency, type IdemPrisma } from '@/src/shared/integrity/idempotency';

export type { PlacementCaseStatus } from '@prisma/client';

export interface OpenPlacementCaseInput {
  laborProfileId: string;
  intent: 'JOB_INTEREST' | 'GENERAL_INTEREST';
  /** Optional; nếu có, dùng làm `Idempotency-Key`. */
  idempotencyKey?: string;
  actorId: string;
}

export interface OpenPlacementCaseResult {
  placementCaseId: string;
  status: 'OPEN';
  laborProfileId: string;
  /** True nếu trả về case đã có sẵn (race hoặc idempotent replay). */
  replayed: boolean;
}

const ACTIVE_STATUSES = ['OPEN', 'IN_PROGRESS', 'READY_TO_PLACE'] as const;

/**
 * INSERT PlacementCase mới. Catch P2002 (unique violation) → return null để caller
 * chuyển sang SELECT existing.
 */
async function tryInsertPlacementCase(
  tx: PrismaTypes.TransactionClient,
  laborProfileId: string,
): Promise<{ id: string } | null> {
  try {
    const created = await tx.placementCase.create({
      data: {
        laborProfileId,
        status: 'OPEN',
        openedAt: new Date(),
      },
      select: { id: true },
    });
    return created;
  } catch (err) {
    const isUniqueViolation =
      (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') ||
      (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002');
    if (isUniqueViolation) return null;
    throw err;
  }
}

/**
 * SELECT existing active case cho LaborProfile.
 */
async function findActivePlacementCase(
  tx: PrismaTypes.TransactionClient,
  laborProfileId: string,
): Promise<{ id: string } | null> {
  const found = await tx.placementCase.findFirst({
    where: {
      laborProfileId,
      status: { in: [...ACTIVE_STATUSES] },
    },
    select: { id: true },
    orderBy: { openedAt: 'desc' },
  });
  return found;
}

/**
 * Mở một PlacementCase active cho LaborProfile. Race-safe + idempotent.
 *
 * - Nếu chưa có active case → INSERT.
 * - Nếu INSERT trả P2002 (race) → SELECT existing → trả về.
 * - Nếu đã có active case trước đó → SELECT → trả về (idempotent).
 *
 * @param tx Prisma transaction client (caller quản lý transaction boundary).
 * @param input xem OpenPlacementCaseInput.
 */
export async function openPlacementCase(
  tx: PrismaTypes.TransactionClient,
  input: OpenPlacementCaseInput,
): Promise<OpenPlacementCaseResult> {
  const created = await tryInsertPlacementCase(tx, input.laborProfileId);
  if (created) {
    return {
      placementCaseId: created.id,
      status: 'OPEN',
      laborProfileId: input.laborProfileId,
      replayed: false,
    };
  }

  // P2002 (race) hoặc đã có active case → SELECT.
  const existing = await findActivePlacementCase(tx, input.laborProfileId);
  if (!existing) {
    // Bất thường: P2002 nhưng không tìm thấy active case. Có thể case vừa CLOSED.
    // Retry INSERT một lần (best-effort). Caller sẽ throw nếu vẫn fail.
    const retry = await tryInsertPlacementCase(tx, input.laborProfileId);
    if (retry) {
      return {
        placementCaseId: retry.id,
        status: 'OPEN',
        laborProfileId: input.laborProfileId,
        replayed: false,
      };
    }
    throw new Error(
      `openPlacementCase: P2002 cho LaborProfile ${input.laborProfileId} nhưng không tìm thấy active case`,
    );
  }

  return {
    placementCaseId: existing.id,
    status: 'OPEN',
    laborProfileId: input.laborProfileId,
    replayed: true,
  };
}

/**
 * Variant có wrap idempotency. Dùng ở route layer; service layer gọi `openPlacementCase`
 * thẳng (idempotency ở một tầng cao hơn).
 */
export async function openPlacementCaseWithIdempotency(
  prisma: IdemPrisma,
  input: OpenPlacementCaseInput & { route: string },
): Promise<OpenPlacementCaseResult & { idempotencyReplayed: boolean }> {
  return withIdempotency({
    prisma,
    route: input.route,
    actorId: input.actorId,
    key: input.idempotencyKey ?? '',
    requestBody: {
      laborProfileId: input.laborProfileId,
      intent: input.intent,
    },
    handler: async () => {
      const result = await openPlacementCase(prisma as PrismaTypes.TransactionClient, input);
      return {
        body: result,
        statusCode: 201,
      };
    },
  }).then(async (idem) => {
    const body = idem.body as OpenPlacementCaseResult;
    return { ...body, idempotencyReplayed: idem.replayed };
  });
}
