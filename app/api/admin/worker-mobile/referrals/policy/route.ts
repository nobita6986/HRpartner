import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';

const writers = new Set(['ADMIN', 'DIRECTOR']);
const readers = new Set(['ADMIN', 'DIRECTOR', 'HR_MANAGER']);
const schema = z.object({
  policyVersion: z.string().trim().min(1).max(40), title: z.string().trim().min(1).max(200),
  eligibilityCriteria: z.string().trim().min(1).max(5000), successEventDescription: z.string().trim().min(1).max(5000),
  rewardPolicyDescription: z.string().trim().min(1).max(5000), termsAndConditions: z.string().trim().min(1).max(10000),
  effectiveFrom: z.string().datetime({ offset: true }), effectiveUntil: z.string().datetime({ offset: true }).nullable(),
  publish: z.boolean().default(false),
}).strict();

export async function GET(req: NextRequest) {
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }); }
  if (!readers.has(ctx.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const policies = await withDbContext(getPrisma(), ctx, (tx) => tx.referralProgramPolicy.findMany({ orderBy: { createdAt: 'desc' } }));
  return NextResponse.json({ policies });
}

export async function POST(req: NextRequest) {
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }); }
  if (!writers.has(ctx.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const input = schema.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'VALIDATION_ERROR', details: input.error.flatten() }, { status: 400 });
  const d = input.data;
  const from = new Date(d.effectiveFrom), until = d.effectiveUntil ? new Date(d.effectiveUntil) : null;
  if (until && until < from) return NextResponse.json({ error: 'INVALID_EFFECTIVE_RANGE' }, { status: 400 });
  const policy = await withDbContext(getPrisma(), ctx, async (tx) => {
    if (d.publish) await tx.referralProgramPolicy.updateMany({ where: { isEnabled: true }, data: { isEnabled: false } });
    return tx.referralProgramPolicy.create({ data: {
      policyVersion: d.policyVersion, title: d.title, eligibilityCriteria: d.eligibilityCriteria,
      successEventDescription: d.successEventDescription, rewardPolicyDescription: d.rewardPolicyDescription,
      termsAndConditions: d.termsAndConditions, effectiveFrom: from, effectiveUntil: until,
      isEnabled: d.publish, publishedAt: d.publish ? new Date() : null, publishedById: d.publish ? ctx.userId : null,
    } });
  });
  return NextResponse.json({ policy }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }); }
  if (!writers.has(ctx.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const input = z.object({ policyId: z.string().min(1), isEnabled: z.boolean() }).strict().safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  const policy = await withDbContext(getPrisma(), ctx, async (tx) => {
    const current = await tx.referralProgramPolicy.findUnique({ where: { id: input.data.policyId } });
    if (!current) return null;
    if (input.data.isEnabled) {
      const now = new Date();
      if ((current.effectiveFrom && current.effectiveFrom > now) || (current.effectiveUntil && current.effectiveUntil < now)) return 'OUTSIDE_EFFECTIVE_RANGE' as const;
      await tx.referralProgramPolicy.updateMany({ where: { isEnabled: true }, data: { isEnabled: false } });
    }
    return tx.referralProgramPolicy.update({ where: { id: current.id }, data: {
      isEnabled: input.data.isEnabled,
      publishedAt: input.data.isEnabled ? new Date() : current.publishedAt,
      publishedById: input.data.isEnabled ? ctx.userId : current.publishedById,
    } });
  });
  if (policy === 'OUTSIDE_EFFECTIVE_RANGE') return NextResponse.json({ error: 'OUTSIDE_EFFECTIVE_RANGE' }, { status: 409 });
  if (!policy) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ policy });
}
