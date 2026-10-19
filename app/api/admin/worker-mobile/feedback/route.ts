import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';

const allowed = new Set(['ADMIN', 'DIRECTOR', 'HR_MANAGER']);
export async function GET(req: NextRequest) {
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }); }
  if (!allowed.has(ctx.role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const status = req.nextUrl.searchParams.get('status');
  const take = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('take') ?? 50) || 50));
  const items = await withDbContext(getPrisma(), ctx, (tx) => tx.feedback.findMany({
    where: status ? { status: status as never } : undefined, orderBy: { createdAt: 'desc' }, take,
    select: { id: true, category: true, content: true, status: true, adminResponse: true, respondedAt: true, createdAt: true, user: { select: { id: true, name: true, phone: true } } },
  }));
  return NextResponse.json({ items });
}
