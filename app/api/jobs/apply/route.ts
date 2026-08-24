import { NextRequest, NextResponse } from 'next/server';
import { applyForJob, SubmissionServiceError } from '@/src/domains/staffing/submission.service';
import { ApplicationServiceError } from '@/src/domains/applications/application.service';
import { CvValidationError } from '@/src/domains/applications/apply-helpers';
import { getPrisma } from '@/src/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Legacy compatibility route. MP-2 (DEC-01): delegates to the canonical
// SECURITY DEFINER boundary; never creates a Worker/SourceClaim. Prefer
// POST /api/public/jobs/:slug/applications for new clients.
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

  const ctx = { userId: 'PUBLIC', role: 'WORKER' as const, permissions: [], dbLabel: null };
  const prisma = getPrisma();

  try {
    const result = await prisma.$transaction(async (tx) =>
      applyForJob(tx, ctx, {
        projectId: body.projectId!,
        fullName: body.fullName!,
        phone: body.phone!,
        cccdNumber: body.cccdNumber,
      }),
    );
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof CvValidationError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 422 });
    }
    if (e instanceof ApplicationServiceError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.httpStatus });
    }
    if (e instanceof SubmissionServiceError) {
      const status = e.code === 'PROJECT_NOT_PUBLIC' ? 404 : 400;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    console.error('applyForJob error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
