/**
 * GET /api/vendor/submissions — P1 Portals STEP-06 (RQ-06).
 * POST /api/vendor/submissions — submit candidate for an order.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';

const submitSchema = z.object({
  orderId: z.string(),
  fullName: z.string().min(1).max(200),
  phone: z.string().regex(/^0[0-9]{9}$/),
  cccdNumber: z.string().min(9).max(20).optional(),
});

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (ctx.role !== 'VENDOR_ADMIN' && ctx.role !== 'VENDOR_STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Vendor only' }, { status: 403 });
  }
  if (!ctx.vendorId) {
    return NextResponse.json({ error: 'NO_VENDOR_CONTEXT' }, { status: 403 });
  }

  const prisma = getPrisma();
  const submissions = await prisma.candidateSubmission.findMany({
    where: { vendorId: ctx.vendorId },
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    items: submissions.map((s) => ({
      id: s.id,
      projectName: s.project?.name ?? null,
      fullName: s.fullName,
      phone: s.phone,
      cccdNumber: s.cccdNumber,
      status: s.status,
      blockCode: s.blockCode,
      overrideCase: s.overrideCase,
      dedupWorkerId: s.dedupWorkerId,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

/**
 * POST: vendor submits a candidate for an order.
 * - DEC-07: dedup hint via SĐT, Referral Guard skipped for MVP.
 */
export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (ctx.role !== 'VENDOR_ADMIN' && ctx.role !== 'VENDOR_STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Vendor only' }, { status: 403 });
  }
  if (!ctx.vendorId) {
    return NextResponse.json({ error: 'NO_VENDOR_CONTEXT' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
  }

  const prisma = getPrisma();

  // Dedup hint: existing worker with same phone
  let dedupHint: string | null = null;
  const existingWorker = await prisma.worker.findFirst({
    where: { phone: parsed.data.phone },
    select: { id: true, employmentStatus: true, fullName: true },
  });
  if (existingWorker) {
    if (existingWorker.employmentStatus === 'ACTIVE') {
      return NextResponse.json({
        error: 'WORKER_ACTIVE',
        message: 'Ứng viên đang ACTIVE — liên hệ HR.',
      }, { status: 409 });
    }
    dedupHint = `Trùng SĐT với worker ${existingWorker.fullName}`;
  }

  // Get order for projectId
  const order = await prisma.staffingOrder.findUnique({
    where: { id: parsed.data.orderId },
    select: { id: true, projectId: true, code: true },
  });
  if (!order) {
    return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
  }

  const submission = await prisma.candidateSubmission.create({
    data: {
      vendorId: ctx.vendorId,
      projectId: order.projectId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      cccdNumber: parsed.data.cccdNumber,
      status: 'NEW',
      dedupWorkerId: existingWorker?.id ?? null,
    },
  });

  return NextResponse.json({
    ok: true,
    id: submission.id,
    dedupHint,
  });
}
