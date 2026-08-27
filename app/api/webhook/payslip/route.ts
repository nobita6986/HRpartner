/**
 * /api/webhook/payslip — M8 (RQ-03/04) · V5-M1-06d STEP-02 (RQ-02 / DEC-03 / DEC-04).
 *
 * Không dùng Prisma — payslip là JSON tiền-tính từ Python app, lưu ở cache (Redis-like).
 * Phân loại boundary:
 *   - POST = SYSTEM_SCOPED_DATA: xác thực `x-api-key` FAIL-CLOSED (verifyInternalApiKey);
 *     thiếu secret → 503, sai → 401 (DEC-03). KHÔNG log secret/payslip.
 *   - GET  = USER_SCOPED_DATA: BẮT BUỘC AuthContext. WORKER chỉ đọc payslip của chính
 *     mình qua `ctx.workerId` — query `workerId` KHÔNG override được (DEC-04). Role đặc
 *     quyền {ADMIN,HR_MANAGER,DIRECTOR,ACCOUNTANT} đọc worker tường minh; role khác → 403.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/src/lib/cache';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { verifyInternalApiKey } from '@/src/shared/auth/internal-webhook-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PayslipItem {
  workerId: string;
  periodMonth: number;
  periodYear: number;
  grossSalary: number;
  netSalary: number;
  deductions: Record<string, number>;
  earned: Record<string, number>;
  computedAt: string;
}

interface PayslipPayload {
  payslips: PayslipItem[];
  source: string;
  computedAt: string;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// DEC-04: role được đọc payslip của worker tường minh (canonical payroll visibility).
// WORKER xử lý riêng (self qua ctx.workerId). Role ngoài tập này → 403.
// EMPLOYEE self defer tới canonical Employee↔Payslip mapping (chưa có) → 403 tạm thời.
const PRIVILEGED_PAYSLIP_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT']);

function cacheKeyFor(workerId: string, periodYear: string | number, periodMonth: string | number): string {
  return `payslip:${workerId}:${periodYear}:${String(periodMonth).padStart(2, '0')}`;
}

export async function POST(req: NextRequest) {
  // DEC-03: FAIL-CLOSED trước khi parse body / chạm cache. KHÔNG log secret.
  const auth = verifyInternalApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.code }, { status: auth.status });
  }

  let body: PayslipPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.payslips || !Array.isArray(body.payslips)) {
    return NextResponse.json({ error: 'VALIDATION', message: 'payslips array required' }, { status: 400 });
  }

  const results: { workerId: string; cached: boolean; error?: string }[] = [];

  for (const slip of body.payslips) {
    if (!slip.workerId || slip.periodMonth == null || slip.periodYear == null) {
      results.push({ workerId: slip.workerId ?? 'unknown', cached: false, error: 'Missing required fields' });
      continue;
    }

    const cacheKey = cacheKeyFor(slip.workerId, slip.periodYear, slip.periodMonth);

    try {
      await cache.set(cacheKey, slip, { ttlMs: CACHE_TTL_MS });
      results.push({ workerId: slip.workerId, cached: true });
    } catch {
      // DEC-03: KHÔNG log nội dung payslip. Chỉ ghi nhận thất bại theo workerId.
      results.push({ workerId: slip.workerId, cached: false, error: 'Cache failed' });
    }
  }

  const allSuccess = results.every((r) => r.cached);
  return NextResponse.json(
    {
      success: allSuccess,
      processed: results.length,
      cached: results.filter((r) => r.cached).length,
      failed: results.filter((r) => !r.cached).length,
      details: results,
    },
    { status: allSuccess ? 200 : 207 },
  );
}

/**
 * GET /api/webhook/payslip?workerId&periodMonth&periodYear — USER_SCOPED_DATA (DEC-04).
 * WORKER: bỏ qua query `workerId`, luôn dùng `ctx.workerId`. Query khác self → 404 (no leak).
 */
export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const url = new URL(req.url);
  const queryWorkerId = url.searchParams.get('workerId');
  const periodMonth = url.searchParams.get('periodMonth');
  const periodYear = url.searchParams.get('periodYear');

  if (!periodMonth || !periodYear) {
    return NextResponse.json({ error: 'VALIDATION', message: 'periodMonth, periodYear required' }, { status: 400 });
  }

  // DEC-04: resolve worker identity từ SERVER context, không tin query param cho WORKER.
  let effectiveWorkerId: string;
  if (ctx.role === 'WORKER') {
    if (!ctx.workerId) {
      // WORKER chưa liên kết Worker → không self-resolve được → 404 (không lộ tồn tại).
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Payslip not found' }, { status: 404 });
    }
    // Query workerId khác self → cross-worker: 404, KHÔNG phục vụ dữ liệu người khác.
    if (queryWorkerId && queryWorkerId !== ctx.workerId) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Payslip not found' }, { status: 404 });
    }
    effectiveWorkerId = ctx.workerId;
  } else if (PRIVILEGED_PAYSLIP_ROLES.has(ctx.role)) {
    if (!queryWorkerId) {
      return NextResponse.json({ error: 'VALIDATION', message: 'workerId required' }, { status: 400 });
    }
    effectiveWorkerId = queryWorkerId;
  } else {
    // PM/HR_STAFF/SALE/MKT/VENDOR_*/CTV/EMPLOYEE: không có canonical payslip visibility.
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: `Role ${ctx.role} khong co quyen doc payslip` },
      { status: 403 },
    );
  }

  const cacheKey = cacheKeyFor(effectiveWorkerId, periodYear, periodMonth);
  const payslip = await cache.get(cacheKey);

  if (!payslip) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Payslip not in cache' }, { status: 404 });
  }

  return NextResponse.json({ payslip, cachedAt: new Date().toISOString() });
}
