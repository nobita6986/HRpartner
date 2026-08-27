/**
 * internal-webhook-auth.ts — V5-M1-06d / RQ-02 / STEP-02 / DEC-03.
 *
 * Xác thực webhook nội bộ (`x-api-key`) FAIL-CLOSED cho SYSTEM_SCOPED_DATA
 * (`POST /api/webhook/payslip`). Mirror precedent `cron-auth.ts` (06b):
 *   - `INTERNAL_API_KEY` chưa cấu hình (rỗng/undefined) → 503 NOT_CONFIGURED
 *     TRƯỚC khi parse body / chạm cache (KHÔNG còn fallback literal 'dev-internal-key').
 *   - Header `x-api-key` thiếu hoặc sai → 401.
 *   - So sánh HẰNG THỜI GIAN qua digest SHA-256 + `timingSafeEqual` (độc lập độ dài
 *     → không lộ độ dài secret). KHÔNG log secret ở bất kỳ nhánh nào.
 * Zero side-effect ở mọi nhánh deny — caller chỉ chạm cache sau khi `ok === true`.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

const HEADER = 'x-api-key';

export type InternalApiAuthResult =
  | { ok: true }
  | { ok: false; status: 503; code: 'INTERNAL_API_NOT_CONFIGURED' }
  | { ok: false; status: 401; code: 'UNAUTHORIZED' };

/** So sánh hằng thời gian, độc lập độ dài (hash cố định 32 byte rồi timingSafeEqual). */
function constantTimeEqual(a: string, b: string): boolean {
  const da = createHash('sha256').update(a).digest();
  const db = createHash('sha256').update(b).digest();
  return timingSafeEqual(da, db);
}

/**
 * Xác thực secret webhook nội bộ. KHÔNG log giá trị secret/header ở bất kỳ nhánh nào.
 */
export function verifyInternalApiKey(req: NextRequest): InternalApiAuthResult {
  const secret = process.env.INTERNAL_API_KEY;
  if (!secret || secret.length === 0) {
    return { ok: false, status: 503, code: 'INTERNAL_API_NOT_CONFIGURED' };
  }
  const provided = req.headers.get(HEADER);
  if (!provided || !constantTimeEqual(provided, secret)) {
    return { ok: false, status: 401, code: 'UNAUTHORIZED' };
  }
  return { ok: true };
}
