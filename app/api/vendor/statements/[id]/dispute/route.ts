/**
 * POST /api/vendor/statements/[id]/dispute — P1 Portals STEP-07 (RQ-07).
 *
 * DEC-06: vendor-scoped dispute.
 * G17: max 2 vòng (dispute_count < 2).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';

const disputeSchema = z.object({
  reason: z.string().min(1).max(500),
  evidence: z.string().max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let auth;
  try {
    auth = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (auth.role !== 'VENDOR_ADMIN' && auth.role !== 'VENDOR_STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  if (!auth.vendorId) {
    return NextResponse.json({ error: 'NO_VENDOR_CONTEXT' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }
  const parsed = disputeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
  }

  const prisma = getPrisma();
  const stmt = await prisma.vendorStatement.findUnique({
    where: { id },
    select: { vendorId: true, status: true, disputeCount: true },
  });
  if (!stmt || stmt.vendorId !== auth.vendorId) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  if (stmt.status !== 'SENT' && stmt.status !== 'DISPUTED') {
    return NextResponse.json({
      error: 'INVALID_STATE',
      message: `Statement status is ${stmt.status}, cannot dispute`,
    }, { status: 409 });
  }
  // G17: max 2 vòng
  if (stmt.disputeCount >= 2) {
    return NextResponse.json({
      error: 'MAX_DISPUTES',
      message: 'Đã đạt giới hạn 2 vòng dispute',
    }, { status: 409 });
  }

  await prisma.vendorStatement.update({
    where: { id },
    data: {
      status: 'DISPUTED',
      disputeCount: { increment: 1 },
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: 'STATEMENT_DISPUTED',
      actorId: auth.userId,
      entityType: 'VendorStatement',
      entityId: id,
      reason: parsed.data.reason,
      diff: { evidence: parsed.data.evidence, disputeCount: stmt.disputeCount + 1 } as object,
    },
  }).catch(() => null);

  return NextResponse.json({ ok: true, status: 'DISPUTED', disputeCount: stmt.disputeCount + 1 });
}
