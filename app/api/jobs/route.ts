import { NextRequest, NextResponse } from 'next/server';
import { listPublicJobs, applyForJob, SubmissionServiceError } from '@/src/domains/staffing/submission.service';
import { getPrisma } from '@/src/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const prisma = getPrisma();
  const jobs = await prisma.$transaction(async (tx) => listPublicJobs(tx));
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  let body: { projectId?: string; fullName?: string; phone?: string; cccdNumber?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.projectId || !body.fullName || !body.phone) {
    return NextResponse.json({ error: 'Missing required fields: projectId, fullName, phone' }, { status: 400 });
  }

  // Public apply: no real auth. Use PUBLIC userId + WORKER role.
  const ctx = { userId: 'PUBLIC', role: 'WORKER' as const, permissions: [], dbLabel: null };
  const prisma = getPrisma();

  try {
    const result = await prisma.$transaction(async (tx) => applyForJob(tx, ctx, {
      projectId: body.projectId!,
      fullName: body.fullName!,
      phone: body.phone!,
      cccdNumber: body.cccdNumber,
    }));
    return NextResponse.json({ submission: result }, { status: 201 });
  } catch (e) {
    if (e instanceof SubmissionServiceError) {
      const status = e.code === 'PROJECT_NOT_PUBLIC' ? 404 : 400;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    console.error('applyForJob error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
