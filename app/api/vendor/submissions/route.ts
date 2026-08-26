/**
 * GET /api/vendor/submissions — list vendor's candidate submissions (V5-M1-06b RQ-06).
 * POST /api/vendor/submissions — submit candidate for an order.
 *
 * Boundary canonical:
 *   - GET: `withAuthorizedDbReadOnly` (L1 `buildCandidateSubmissionScope` VENDOR→
 *     `{ vendorId }` + L2 RLS). Response KHÔNG lộ `dedupWorkerId` (DEC-05).
 *   - POST dedup (DEC-05): probe trùng SĐT qua repo đặc quyền hẹp `SYSTEM_DEDUP`,
 *     chỉ nhận outcome OPAQUE — KHÔNG trả tên/CCCD/trạng thái worker cho vendor.
 *   - POST create (DEC-06): re-check order VISIBLE + còn mở (OPEN/CLOSING_SOON) rồi
 *     create trong CÙNG `withDbContext(VENDOR)` (L2-only; create vỡ L1). RLS `staffing_orders`
 *     USING `hrp_project_visible_for` khoá order ngoài tầm nhìn; `candidate_submissions`
 *     WITH CHECK (VENDOR AND vendor_id=session) khoá ghi. Không TOCTOU order.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { probeWorkerDuplicateByPhone } from '@/src/shared/vendor/worker-dedup.repository';

const submitSchema = z.object({
  orderId: z.string(),
  fullName: z.string().min(1).max(200),
  phone: z.string().regex(/^0[0-9]{9}$/),
  cccdNumber: z.string().min(9).max(20).optional(),
});

/**
 * StaffingOrder còn nhận ứng viên khi status ∈ {OPEN, CLOSING_SOON} — đồng bộ với
 * định nghĩa "publishable/visible" của job-board (publish.service PUBLISHABLE_ORDER_STATUSES,
 * public.service VISIBLE_ORDER_STATUSES). CLOSED/CANCELLED → không nhận (ORDER_NOT_OPEN).
 * (StaffingOrder.status enum = OPEN|CLOSING_SOON|CLOSED|CANCELLED — KHÔNG có 'ACTIVE'.)
 */
const OPEN_FOR_SUBMISSION = new Set(['OPEN', 'CLOSING_SOON']);

class SubmissionGuardError extends Error {
  constructor(readonly kind: 'ORDER_NOT_FOUND' | 'ORDER_NOT_OPEN') {
    super(kind);
  }
}

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

  let submissions;
  try {
    submissions = await withAuthorizedDbReadOnly(prisma, ctx, (tx) =>
      tx.candidateSubmission.findMany({
        where: { vendorId: ctx.vendorId },
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { id: true, name: true } } },
      }),
    );
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/vendor/submissions] query error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }

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
      // DEC-05: KHÔNG lộ dedupWorkerId.
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

/**
 * POST: vendor submits a candidate for an order.
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
  const vendorId = ctx.vendorId;

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

  // Dedup trùng SĐT — outcome OPAQUE (DEC-05). Worker đang ACTIVE → chặn, không lộ danh tính.
  const dedup = await probeWorkerDuplicateByPhone(prisma, parsed.data.phone);
  if (dedup.activeConflict) {
    return NextResponse.json({ error: 'WORKER_ACTIVE', message: 'Ứng viên đang ACTIVE — liên hệ HR.' }, { status: 409 });
  }

  let submissionId: string;
  try {
    submissionId = await withDbContext(prisma, ctx, async (tx) => {
      // Re-check order trong tầm nhìn (RLS) + còn mở (OPEN/CLOSING_SOON) — cùng tx với create.
      const order = await tx.staffingOrder.findFirst({
        where: { id: parsed.data.orderId },
        select: { id: true, projectId: true, status: true },
      });
      if (!order) throw new SubmissionGuardError('ORDER_NOT_FOUND');
      if (!OPEN_FOR_SUBMISSION.has(order.status)) throw new SubmissionGuardError('ORDER_NOT_OPEN');

      const created = await tx.candidateSubmission.create({
        data: {
          vendorId,
          projectId: order.projectId,
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
          cccdNumber: parsed.data.cccdNumber,
          status: 'NEW',
          // Server-side linkage cho HR queue — KHÔNG trả ra ngoài (DEC-05).
          dedupWorkerId: dedup.workerId,
        },
      });
      return created.id;
    });
  } catch (err) {
    if (err instanceof SubmissionGuardError) {
      if (err.kind === 'ORDER_NOT_FOUND') {
        return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
      }
      return NextResponse.json({ error: 'ORDER_NOT_OPEN' }, { status: 409 });
    }
    if (err instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/vendor/submissions POST] error:', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: submissionId, duplicate: dedup.duplicate });
}
