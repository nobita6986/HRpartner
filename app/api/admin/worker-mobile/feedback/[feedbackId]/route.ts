import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';

const allowed = new Set(['ADMIN', 'DIRECTOR', 'HR_MANAGER']);
const schema = z.object({ status: z.enum(['IN_REVIEW', 'RESOLVED', 'REJECTED']), adminResponse: z.string().trim().max(5000).optional() }).strict();
export async function PATCH(req: NextRequest, context: { params: Promise<{ feedbackId: string }> }) {
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }); }
  if (!allowed.has(ctx.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const input = schema.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  const { feedbackId } = await context.params;
  const data = await withDbContext(getPrisma(), ctx, (tx) => tx.feedback.update({ where: { id: feedbackId }, data: {
    status: input.data.status, adminResponse: input.data.adminResponse ?? null, respondedById: ctx.userId, respondedAt: new Date(),
  }, select: { id: true, status: true, respondedAt: true } }));
  return NextResponse.json({ item: data });
}
