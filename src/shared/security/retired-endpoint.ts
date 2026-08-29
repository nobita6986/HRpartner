/**
 * retired-endpoint.ts — V5-OPS-06A / RQ-08 / STEP-04 (DEC-10).
 *
 * Response TIỀN ĐỊNH cho hai legacy anonymous write đã ngừng phục vụ:
 * `POST /api/jobs` và `POST /api/jobs/apply`. Trả `410` kèm canonical path
 * template, KHÔNG redirect (redirect POST sẽ bị client replay), KHÔNG chạm Prisma
 * và KHÔNG gọi service nào ⇒ không còn đường ghi ẩn danh thứ hai.
 */
import { NextResponse } from 'next/server';

export const CANONICAL_APPLY_PATH_TEMPLATE = '/api/public/jobs/{slug}/applications';
export const RETIRED_APPLY_ERROR = 'APPLY_ENDPOINT_RETIRED';
export const RETIRED_APPLY_MESSAGE =
  'Endpoint này đã ngừng phục vụ. Vui lòng gửi ứng tuyển qua POST /api/public/jobs/{slug}/applications.';

export function retiredApplyEndpointResponse(): NextResponse {
  return NextResponse.json(
    {
      error: RETIRED_APPLY_ERROR,
      message: RETIRED_APPLY_MESSAGE,
      canonicalPath: CANONICAL_APPLY_PATH_TEMPLATE,
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}
