/**
 * GET /api/me (RQ-04, DEC-08; DoD PHASE_KHOAHOC §4)
 *
 * Không token / token lỗi → 401 JSON (không 500).
 * Token hợp lệ → 200 { userId, role } — TUYỆT ĐỐI không trả thêm trường PII nào.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/src/shared/auth/user';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Missing or invalid token' },
      { status: 401 },
    );
  }
  return NextResponse.json({ userId: user.sub, role: user.role });
}
