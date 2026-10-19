import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const policy = await getPrisma().referralProgramPolicy.findFirst({
      where: { isEnabled: true, publishedAt: { not: null }, effectiveFrom: { lte: now }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }] },
      orderBy: { publishedAt: 'desc' },
      select: { policyVersion: true, title: true, eligibilityCriteria: true, successEventDescription: true, rewardPolicyDescription: true, termsAndConditions: true, effectiveFrom: true, effectiveUntil: true },
    });
    let canSubmit = false;
    let blockedReason: string | null = policy ? 'AUTH_REQUIRED' : 'PROGRAM_CLOSED';
    try {
      const ctx = await getAuthContext(req);
      if (ctx.role !== 'WORKER' || !ctx.workerId) blockedReason = 'WORKER_NOT_VERIFIED';
      else {
        const assignment = await withDbContext(getPrisma(), ctx, (tx) => tx.projectAssignment.findFirst({ where: { workerId: ctx.workerId, status: 'ACTIVE' }, select: { id: true } }));
        canSubmit = Boolean(policy && assignment);
        blockedReason = canSubmit ? null : policy ? 'NO_ACTIVE_ASSIGNMENT' : 'PROGRAM_CLOSED';
      }
    } catch { /* public read; unauthenticated callers see policy only */ }
    return NextResponse.json({ ok: true, data: { program: policy ? { isEnabled: true, ...policy, canSubmit, blockedReason } : {
      isEnabled: false, policyVersion: null, title: null, eligibilityCriteria: null, successEventDescription: null,
      rewardPolicyDescription: null, termsAndConditions: null, effectiveFrom: null, effectiveUntil: null,
      canSubmit: false, blockedReason: 'PROGRAM_CLOSED',
    } } });
  } catch (e) {
    console.error('[referrals/program] read failed', { error: e instanceof Error ? e.name : 'unknown' });
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Không thể tải chính sách giới thiệu.', details: {} } }, { status: 500 });
  }
}
