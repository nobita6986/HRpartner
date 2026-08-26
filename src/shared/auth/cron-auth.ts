/**
 * cron-auth.ts — V5-M1-06b / RQ-09 / DEC-09.
 *
 * Xác thực cron FAIL-CLOSED, dùng chung cho mọi route `app/api/cron/**`:
 *   - `CRON_SECRET` chưa cấu hình (rỗng/undefined) → 503 CRON_NOT_CONFIGURED
 *     (KHÔNG chạy DB, KHÔNG mở cửa như cũ `if (SECRET && ...)`).
 *   - Header `x-cron-secret` thiếu hoặc sai → 401.
 *   - So sánh HẰNG THỜI GIAN qua `timingSafeEqual` trên digest SHA-256 (độc lập độ
 *     dài → không lộ độ dài secret). KHÔNG log secret ở bất kỳ nhánh nào.
 * Zero DB call ở mọi nhánh deny — caller chỉ chạm DB sau khi `ok === true`.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

const HEADER = 'x-cron-secret';

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 503; code: 'CRON_NOT_CONFIGURED' }
  | { ok: false; status: 401; code: 'UNAUTHORIZED' };

/** So sánh hằng thời gian, độc lập độ dài (hash cố định 32 byte rồi timingSafeEqual). */
function constantTimeEqual(a: string, b: string): boolean {
  const da = createHash('sha256').update(a).digest();
  const db = createHash('sha256').update(b).digest();
  return timingSafeEqual(da, db);
}

export function verifyCronSecret(req: NextRequest): CronAuthResult {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length === 0) {
    return { ok: false, status: 503, code: 'CRON_NOT_CONFIGURED' };
  }
  const provided = req.headers.get(HEADER);
  if (!provided || !constantTimeEqual(provided, secret)) {
    return { ok: false, status: 401, code: 'UNAUTHORIZED' };
  }
  return { ok: true };
}
