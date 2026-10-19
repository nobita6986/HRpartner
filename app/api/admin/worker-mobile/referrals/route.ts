import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { decryptReferralValue } from '@/src/domains/worker-mobile/referral-pii';

const allowed = new Set(['ADMIN', 'DIRECTOR', 'HR_MANAGER']);
export async function GET(req: NextRequest) {
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }); }
  if (!allowed.has(ctx.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const referrals = await withDbContext(getPrisma(), ctx, (tx) => tx.workerReferral.findMany({
    orderBy: { createdAt: 'desc' }, take: 100,
    select: { id: true, referredNameCiphertext: true, referredPhoneCiphertext: true, jobInterest: true, consentedAt: true, status: true, benefitStatus: true, benefitAmountVnd: true, createdAt: true, referrerUser: { select: { id: true, name: true, phone: true } } },
  }));
  try {
    return NextResponse.json({ referrals: referrals.map(({ referredNameCiphertext, referredPhoneCiphertext, ...row }) => ({
      ...row, referredName: decryptReferralValue(referredNameCiphertext), referredPhone: decryptReferralValue(referredPhoneCiphertext),
      benefitAmountVnd: row.benefitAmountVnd?.toString() ?? null,
    })) });
  } catch (e) {
    console.error('[admin/worker-mobile/referrals] decrypt failed', { error: e instanceof Error ? e.name : 'unknown' });
    return NextResponse.json({ error: 'PII_KEY_UNAVAILABLE' }, { status: 503 });
  }
}
