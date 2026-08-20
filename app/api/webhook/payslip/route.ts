/**
 * POST /api/webhook/payslip — M8 RQ-03
 *
 * Receives pre-computed payslip JSON from Python app and caches it in Redis.
 * DEC-02: JSON payload from Python → store directly in cache.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/src/lib/cache';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';

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

export async function POST(req: NextRequest) {
  // Internal API: verify via header or auth
  const apiKey = req.headers.get('x-api-key');
  const expectedKey = process.env.INTERNAL_API_KEY ?? 'dev-internal-key';

  if (apiKey !== expectedKey) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Invalid API key' }, { status: 401 });
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

    const cacheKey = `payslip:${slip.workerId}:${slip.periodYear}:${String(slip.periodMonth).padStart(2, '0')}`;

    try {
      await cache.set(cacheKey, slip, { ttlMs: CACHE_TTL_MS });
      results.push({ workerId: slip.workerId, cached: true });
    } catch (err) {
      console.error('[webhook/payslip] cache error:', err);
      results.push({ workerId: slip.workerId, cached: false, error: 'Cache failed' });
    }
  }

  const allSuccess = results.every(r => r.cached);
  return NextResponse.json({
    success: allSuccess,
    processed: results.length,
    cached: results.filter(r => r.cached).length,
    failed: results.filter(r => !r.cached).length,
    details: results,
  }, { status: allSuccess ? 200 : 207 });
}

/**
 * GET /api/webhook/payslip — M8 RQ-04
 * Worker reads payslip from cache.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const workerId = url.searchParams.get('workerId');
  const periodMonth = url.searchParams.get('periodMonth');
  const periodYear = url.searchParams.get('periodYear');

  if (!workerId || !periodMonth || !periodYear) {
    return NextResponse.json({ error: 'VALIDATION', message: 'workerId, periodMonth, periodYear required' }, { status: 400 });
  }

  const cacheKey = `payslip:${workerId}:${periodYear}:${String(periodMonth).padStart(2, '0')}`;
  const payslip = await cache.get(cacheKey);

  if (!payslip) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Payslip not in cache' }, { status: 404 });
  }

  return NextResponse.json({ payslip, cachedAt: new Date().toISOString() });
}
