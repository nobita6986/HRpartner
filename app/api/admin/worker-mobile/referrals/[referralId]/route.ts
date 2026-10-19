import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';

const allowed = new Set(['ADMIN', 'DIRECTOR', 'HR_MANAGER']);
const schema = z.object({
  status: z.enum(['IN_REVIEW', 'QUALIFIED', 'REWARD_APPROVED', 'PAID', 'REJECTED']),
  benefitStatus: z.enum(['NONE', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED']).optional(),
  benefitAmountVnd: z.string().regex(/^\d{1,15}$/).nullable().optional(),
  reconciliationNote: z.string().trim().max(5000).nullable().optional(),
  candidateSubmissionId: z.string().min(1).nullable().optional(),
}).strict().superRefine((value, ctx) => {
  if ((value.status === 'REWARD_APPROVED' || value.status === 'PAID') && (!value.benefitAmountVnd || value.benefitAmountVnd === '0')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['benefitAmountVnd'], message: 'Phải có mức quyền lợi VND dương trước khi duyệt/chi trả.' });
  }
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ referralId: string }> }) {
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }); }
  if (!allowed.has(ctx.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const input = schema.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'VALIDATION_ERROR', details: input.error.flatten() }, { status: 400 });
  const { referralId } = await context.params;
  const item = await withDbContext(getPrisma(), ctx, (tx) => tx.workerReferral.update({
    where: { id: referralId },
    data: {
      status: input.data.status,
      benefitStatus: input.data.benefitStatus,
      benefitAmountVnd: input.data.benefitAmountVnd === undefined ? undefined : input.data.benefitAmountVnd === null ? null : BigInt(input.data.benefitAmountVnd),
      reconciliationNote: input.data.reconciliationNote,
      candidateSubmissionId: input.data.candidateSubmissionId,
      reviewedById: ctx.userId, reviewedAt: new Date(),
      paidAt: input.data.status === 'PAID' ? new Date() : undefined,
    },
    select: { id: true, status: true, benefitStatus: true, benefitAmountVnd: true, reviewedAt: true, paidAt: true },
  }));
  return NextResponse.json({ item: { ...item, benefitAmountVnd: item.benefitAmountVnd?.toString() ?? null } });
}
