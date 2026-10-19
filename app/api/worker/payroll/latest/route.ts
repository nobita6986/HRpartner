/**
 * GET /api/worker/payroll/latest?period=YYYY-MM — T1A Android backend mobile
 * contract (TASK DEC-09 / RQ-09).
 *
 * USER_SCOPED_DATA: BẮT BUỘC AuthContext; WORKER chỉ đọc payslip của CHÍNH MÌNH
 * qua `ctx.workerId` — KHÔNG nhận workerId từ query/body (DEC-04 pattern).
 *
 * NGUỒN DỮ LIỆU: payslip webhook cache hiện hành (key `payslip:{workerId}:
 * {year}:{MM}`, TTL 10 phút, projection allowlist chia sẻ với
 * GET /api/webhook/payslip qua `payslip-projection.ts`). KHÔNG tạo payroll
 * schema mới trong task này.
 *
 * TÍNH CHẤT: cache là process-local (src/lib/cache.ts Map module-level) →
 * kết quả là BEST-EFFORT: instance khác / restart / TTL hết ⇒ 404. KHÔNG được
 * quảng bá thành dữ liệu bền vững/production-ready (blocker ghi trong HANDOFF).
 *
 * period=YYYY-MM bắt buộc; sai format → 400.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/src/lib/cache';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { projectPayslipForResponse } from '@/src/domains/payroll/payslip-projection';

const PERIOD_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (ctx.role !== 'WORKER') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Endpoint chỉ dành cho role WORKER' },
      { status: 403 },
    );
  }
  if (!ctx.workerId) {
    return NextResponse.json(
      { error: 'WORKER_PROFILE_NOT_FOUND', message: 'Worker profile chưa được tạo' },
      { status: 404 },
    );
  }

  const periodRaw = req.nextUrl.searchParams.get('period');
  if (!periodRaw || !PERIOD_FORMAT.test(periodRaw)) {
    return NextResponse.json(
      { error: 'VALIDATION', message: 'period required, format YYYY-MM' },
      { status: 400 },
    );
  }
  const [year, month] = periodRaw.split('-');

  const cacheKey = `payslip:${ctx.workerId}:${year}:${month}`;
  const payslip = await cache.get(cacheKey);

  if (!payslip) {
    // Cache process-local: miss là kết quả bình thường (TTL/restart) — KHÔNG log payload.
    return NextResponse.json(
      { error: 'NOT_FOUND', message: 'Payslip not in cache', cached: false },
      { status: 404 },
    );
  }

  // Allowlist DTO chung với webhook GET — KHÔNG trả raw cache object.
  return NextResponse.json({
    period: periodRaw,
    payslip: projectPayslipForResponse(payslip),
    cachedAt: new Date().toISOString(),
  });
}
