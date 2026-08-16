/**
 * Idempotency helper (Phase 3 / RQ-02 / DEC-02 / ADR-014).
 *
 * Scope UNIQUE (actorId, route, key) — retry cùng key trong TTL trả về response cũ.
 * Hết TTL → tạo record mới (handler chạy lại). Không dùng query metadata.
 *
 * Hỗ trợ 2 invocation patterns:
 *  - Top-level: truyền `PrismaClient` (vd từ route handler).
 *  - In-transaction: truyền `Prisma.TransactionClient` (vd khi route bọc $transaction).
 *
 * Race condition handling: UNIQUE constraint DB quyết. Bên thua bắt P2002, đọc row
 * cũ, trả về response replay — KHÔNG chạy handler 2 lần.
 *
 * Usage:
 *   const { body, replayed } = await withIdempotency({
 *     prisma, route: 'POST:/api/tickets', actorId, key, requestBody,
 *     handler: () => service.createTicket(input, actor),
 *     ttlMs: 24 * 60 * 60 * 1000,
 *   });
 */
import { createHash } from 'node:crypto';
import {
  Prisma,
  type PrismaClient,
} from '@prisma/client';

export type IdemPrisma = PrismaClient | Prisma.TransactionClient;

export interface IdempotencyOptions<TBody> {
  prisma: IdemPrisma;
  /** vd `POST:/api/tickets`, `POST:/api/tickets/{id}/approve` */
  route: string;
  actorId: string;
  /** header `x-idempotency-key` */
  key: string;
  /** Body để hash — phát hiện client sai key (gửi cùng key, khác payload). */
  requestBody: unknown;
  /** Thực thi lần đầu. Trả về object có `body` (any) và tuỳ chọn `statusCode`. */
  handler: () => Promise<{ body: unknown; statusCode?: number }>;
  /** TTL mặc định 24h (DEC-02). */
  ttlMs?: number;
}

export interface IdempotencyResult {
  body: unknown;
  statusCode: number;
  /** true nếu trả về kết quả đã lưu (replay); false nếu chạy handler lần đầu. */
  replayed: boolean;
}

/** Error dành cho caller — client dùng cùng key nhưng khác body. */
export class IdempotencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function hashRequest(body: unknown): string {
  // JSON chuẩn hoá trước khi hash để key-order không đổi sha.
  // BigInt không stringify được mặc định → convert sang string có đuôi 'n'.
  const replacer = (_key: string, value: unknown) =>
    typeof value === 'bigint' ? `${value.toString()}n` : value;
  const json = JSON.stringify(body ?? null, replacer);
  return createHash('sha256').update(json).digest('hex');
}

export async function withIdempotency<TBody>(opts: IdempotencyOptions<TBody>): Promise<IdempotencyResult> {
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
  const now = new Date();
  const requestHash = hashRequest(opts.requestBody);
  const expiresAt = new Date(now.getTime() + ttl);

  // 1. Thử tìm row hợp lệ (chưa hết TTL)
  const existing = await opts.prisma.idempotencyKey.findUnique({
    where: {
      uq_idempotency_keys_scope: {
        actorId: opts.actorId,
        route: opts.route,
        key: opts.key,
      },
    },
  });

  if (existing && existing.expiresAt > now) {
    // Client sai body nhưng dùng cùng key → 409 IDEMPOTENCY_CONFLICT
    if (existing.requestHash !== requestHash) {
      throw new IdempotencyConflictError(
        `x-idempotency-key "${opts.key}" đã được dùng với request body khác`,
      );
    }
    return {
      body: existing.response,
      statusCode: existing.statusCode,
      replayed: true,
    };
  }

  // 2. Row không có hoặc hết TTL → chạy handler.
  const result = await opts.handler();
  const statusCode = result.statusCode ?? 200;

  // 3. Lưu row mới. Nếu race thua (P2002) → đọc row cũ và replay.
  try {
    await opts.prisma.idempotencyKey.create({
      data: {
        actorId: opts.actorId,
        route: opts.route,
        key: opts.key,
        requestHash,
        response: result.body as Prisma.JsonObject,
        statusCode,
        expiresAt,
      },
    });
  } catch (err) {
    // Match cả Prisma runtime lẫn raw error có code P2002 (test mock friendly).
    const isUniqueViolation =
      (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') ||
      (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002');
    if (isUniqueViolation) {
      const winner = await opts.prisma.idempotencyKey.findUnique({
        where: {
          uq_idempotency_keys_scope: {
            actorId: opts.actorId,
            route: opts.route,
            key: opts.key,
          },
        },
      });
      if (winner && winner.requestHash !== requestHash) {
        throw new IdempotencyConflictError(
          `x-idempotency-key "${opts.key}" đã được dùng với request body khác (race)`,
        );
      }
      return {
        body: winner?.response ?? result.body,
        statusCode: winner?.statusCode ?? statusCode,
        replayed: true,
      };
    }
    throw err;
  }

  return {
    body: result.body,
    statusCode,
    replayed: false,
  };
}

/**
 * Variant không có handler — chỉ check xem key đã có response lưu chưa.
 * Dùng cho trường hợp caller muốn tự quyết có chạy handler hay không.
 */
export async function findExistingIdempotency(
  prisma: IdemPrisma,
  scope: { actorId: string; route: string; key: string },
): Promise<{ response: unknown; statusCode: number } | null> {
  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      uq_idempotency_keys_scope: {
        actorId: scope.actorId,
        route: scope.route,
        key: scope.key,
      },
    },
  });
  if (!existing || existing.expiresAt <= new Date()) return null;
  return { response: existing.response, statusCode: existing.statusCode };
}
