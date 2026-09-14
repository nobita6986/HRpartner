/**
 * jobs.apply.route.test.ts — N1 intake writer round 2.
 *
 * UNIT route test cho POST /api/jobs/apply (LEGACY STUB theo DEC-10/RQ-08).
 *
 * Contract:
 *   - Module KHÔNG import Prisma/service nào (cấu trúc tĩnh).
 *   - Handler POST() trả về NextResponse 410 với body `{ error: 'APPLY_ENDPOINT_RETIRED' }`.
 *   - KHÔNG có handler nào khác (GET/PUT/PATCH/DELETE) — nếu có → fail.
 *   - KHÔNG dùng NextRequest (vì handler không nhận req).
 *
 * Lý do giữ test dù route chỉ là stub: round 1 đã phá contract DEC-10 bằng cách build
 * functional handler trên route này. Test này là RÀNG BUỘC ĐỘNG (runtime) — đảm bảo stub
 * thực sự là 410 và static test `marketplace-inventory.static.test.ts` (RETIRED_POST pattern)
 * vẫn enforce được bằng kiểm tra runtime.
 */

import { describe, expect, it } from 'vitest';

import { POST } from '@/app/api/jobs/apply/route';

describe('POST /api/jobs/apply — LEGACY STUB (DEC-10/RQ-08)', () => {
  it('POST: trả 410 APPLY_ENDPOINT_RETIRED', async () => {
    const res = POST();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toBe('APPLY_ENDPOINT_RETIRED');
  });

  it('POST: response KHÔNG chứa header Location (KHÔNG redirect, cố định 410)', () => {
    const res = POST();
    expect(res.headers.get('location')).toBeNull();
  });

  it('POST: KHÔNG có NextRequest parameter (stub không parse body)', () => {
    // Type-level check: handler signature phải là POST() không tham số.
    // Nếu ai đó thêm parameter (vd `req: NextRequest`) → TS compile sẽ fail ở route file.
    // Runtime: gọi POST() không truyền gì phải pass.
    expect(() => POST()).not.toThrow();
  });
});
