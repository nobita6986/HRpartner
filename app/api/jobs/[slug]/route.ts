import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { getPublicJobProjection } from '@/src/domains/job-board/public.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const prisma = getPrisma();
  const job = await prisma.$transaction((tx) => getPublicJobProjection(tx, slug));
  if (!job) return NextResponse.json({ error: 'NOT_FOUND', message: 'Job not found' }, { status: 404 });
  return NextResponse.json({ job });
}
