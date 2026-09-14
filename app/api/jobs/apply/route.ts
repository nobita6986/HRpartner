/**
 * POST /api/jobs/apply — LEGACY STUB (DEC-10/RQ-08).
 *
 * OPS-06A / RQ-08 / DEC-10: legacy anonymous apply đã RETIRE. Deterministic 410 —
 * module này KHÔNG import Prisma/service nào, nên không thể ghi ẩn danh.
 *
 * Canonical MP-2 (DEC-01): POST /api/public/jobs/{slug}/applications → gọi
 * `submitPublicApplication` qua SECURITY DEFINER RPC. Đây là forward-facing URL DUY NHẤT
 * cho anonymous write của marketplace apply.
 *
 * ====================================================================================
 * N1 MÂU THUẪN (escalate Tier 0 — ghi trong HANDOFF §4):
 * TASK `hrp-v6-n1-intake-writer` round 1 build functional handler trên route này
 * (gọi `createCandidateSubmissionFromIntake`, idempotency, RLS proxy HR_STAFF).
 * Nhưng DEC-10 cố định route này = stub 410 và static test
 * `src/domains/applications/marketplace-inventory.static.test.ts` enforce contract này.
 *
 * Round 2 REVERT route về stub 410 để tôn trọng DEC-10 hiện hành và pass static test.
 * Logic N1 (createOrMatchLaborProfile + openPlacementCase + createCandidateSubmissionFromIntake)
 * đã có trong `src/domains/talent/intake-writer.service.ts` và route
 * `app/api/admin/intake/staff/route.ts` (auth path).
 *
 * Câu hỏi escalate Tier 0:
 *   (a) N1 có cần route public anon MỚI gọi `createCandidateSubmissionFromIntake` không?
 *       Nếu có → đề xuất vị trí: `/api/public/intake` (KHÔNG đụng `/api/jobs/apply`
 *       để tránh phá DEC-10).
 *   (b) Hoặc N1 chỉ cần auth path `/api/admin/intake/staff` (đã có) → xác nhận
 *       product không cần public anon N1, đóng task.
 * ====================================================================================
 */
import { NextResponse } from 'next/server';
import { retiredApplyEndpointResponse } from '@/src/shared/security/retired-endpoint';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function POST(): NextResponse {
  return retiredApplyEndpointResponse();
}
