/**
 * Outbox helper (Phase 3 / RQ-05 / DEC-01 / D16 (b)).
 *
 * Pattern:
 *   1. `enqueueOutbox(tx, event)` — ghi event PENDING trong cùng $transaction
 *      với state change. Rollback tx → mất event (đúng).
 *   2. Sau commit, gọi `drainOutboxOnce(prisma, handlers)` — in-process.
 *   3. Cron daily gọi `processCronRetry(prisma, handlers)` — safety net
 *      cho event PENDING khi pod chết giữa ch�ng.
 *
 * Lưu ý:
 *   - KHÔNG QStash / Redis / worker ngoài (D16 (b)).
 *   - Drain idempotent: handler trả về ok → PROCESSED đúng 1 lần.
 *   - Channel thật (email/SMS/Zalo) ở Phase 4.
 */

import { Prisma, type PrismaClient, type OutboxEvent } from '@prisma/client';

export type OutboxPrisma = PrismaClient | Prisma.TransactionClient;

export interface OutboxEventInput {
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  /** Optional: trì hoãn gửi (vd thông báo sau khi approve 5 phút). */
  delayMs?: number;
}

export interface OutboxHandler {
  eventType: string;
  /** Xử lý event đã pick. Trả về ok=true → PROCESSED. */
  handle: (event: OutboxEvent) => Promise<boolean>;
}

export interface DrainOptions {
  /** Số event tối đa xử lý mỗi lần drain. Default 50. */
  batchSize?: number;
  /** Số retry tối đa trước khi chuyển sang FAILED. Default 5. */
  maxRetries?: number;
}

export interface DrainResult {
  processed: number;
  failed: number;
  skipped: number;
}

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_RETRIES = 5;

/**
 * Enqueue event trong transaction hiện tại.
 * Rollback tx → không còn event (đúng kỳ vọng outbox).
 */
export async function enqueueOutbox(
  tx: Prisma.TransactionClient,
  input: OutboxEventInput,
): Promise<OutboxEvent> {
  const availableAt = input.delayMs
    ? new Date(Date.now() + input.delayMs)
    : new Date();

  return tx.outboxEvent.create({
    data: {
      eventType: input.eventType,
      aggregateId: input.aggregateId,
      payload: input.payload as Prisma.InputJsonValue,
      status: 'PENDING',
      retryCount: 0,
      availableAt,
    },
  });
}

/**
 * Drain in-process: pick event PENDING + availableAt ≤ now, dispatch handler.
 * Trả về tóm tắt. KHÔNG throw nếu handler fail — chỉ log retry.
 *
 * Idempotency: 1 event PROCESSED đúng 1 lần (handler đánh status thành công → next
 * pick sẽ skip nhờ status=PENDING filter).
 */
export async function drainOutboxOnce(
  prisma: PrismaClient,
  handlers: readonly OutboxHandler[],
  options: DrainOptions = {},
): Promise<DrainResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const now = new Date();

  // Pick batch — dùng select for update không cần (in-process, không concurrent).
  const events = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING', availableAt: { lte: now } },
    orderBy: { availableAt: 'asc' },
    take: batchSize,
  });

  const handlerMap = new Map(handlers.map((h) => [h.eventType, h]));
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of events) {
    const handler = handlerMap.get(event.eventType);
    if (!handler) {
      skipped++;
      continue;
    }

    try {
      const ok = await handler.handle(event);
      if (ok) {
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: 'PROCESSED', processedAt: new Date() },
        });
        processed++;
      } else {
        failed++;
        await markRetryOrFailed(prisma, event.id, event.retryCount, maxRetries, 'Handler returned ok=false');
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      await markRetryOrFailed(prisma, event.id, event.retryCount, maxRetries, msg);
    }
  }

  return { processed, failed, skipped };
}

/**
 * Cron entry: giống drain nhưng KHÔNG giới hạn batchSize mặc định.
 * Dùng cho job daily quét lại event PENDING.
 */
export async function processCronRetry(
  prisma: PrismaClient,
  handlers: readonly OutboxHandler[],
  options: DrainOptions = {},
): Promise<DrainResult> {
  return drainOutboxOnce(prisma, handlers, {
    batchSize: options.batchSize ?? 500,
    maxRetries: options.maxRetries ?? 10,
  });
}

async function markRetryOrFailed(
  prisma: PrismaClient,
  eventId: string,
  currentRetry: number,
  maxRetries: number,
  lastError: string,
): Promise<void> {
  const nextRetry = currentRetry + 1;
  const isFailed = nextRetry > maxRetries;
  const backoffMs = Math.min(60_000, 1000 * 2 ** currentRetry); // 1s, 2s, 4s, ..., max 60s
  await prisma.outboxEvent.update({
    where: { id: eventId },
    data: {
      status: isFailed ? 'FAILED' : 'PENDING',
      retryCount: nextRetry,
      lastError,
      availableAt: new Date(Date.now() + (isFailed ? 0 : backoffMs)),
    },
  });
}
