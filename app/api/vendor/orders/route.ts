/**
 * GET /api/vendor/orders — P1 Portals STEP-06 / V5-M1-06b (RQ-05/RQ-06, DEC-06)
 *                        — V5-M1-08 STEP-02 (RQ-02, DEC-03/04).
 *
 * Trả staffing order đang MỞ NHẬN HỒ SƠ (`OPEN|CLOSING_SOON`) trong tầm nhìn vendor.
 * Boundary canonical (`withAuthorizedDbReadOnly`): L1 `buildStaffingOrderScope`
 * (VENDOR → project public HOẶC đã có submission của vendor) + L2 RLS `staffing_orders
 * USING hrp_project_visible_for(project_id)` trong CÙNG transaction. `where.status`
 * dùng canonical `OPEN_ORDER_STATUSES` (DEC-04) AND với scope đã inject — KHÔNG còn
 * literal `'ACTIVE'` (không hợp lệ trong enum) và không tự filter sau raw query.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { OPEN_ORDER_STATUSES } from '@/src/domains/staffing/types';

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

  let orders;
  try {
    orders = await withAuthorizedDbReadOnly(prisma, ctx, (tx) =>
      tx.staffingOrder.findMany({
        where: { status: { in: [...OPEN_ORDER_STATUSES] } },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { id: true, name: true, code: true } },
          slots: {
            select: {
              id: true,
              positionCode: true,
              positionTitle: true,
              slotsNeeded: true,
              slotsFilled: true,
            },
          },
        },
      }),
    );
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/vendor/orders] query error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }

  return NextResponse.json({
    items: orders.map((o) => ({
      id: o.id,
      code: o.code,
      projectName: o.project.name,
      projectCode: o.project.code,
      deadlineDate: o.deadlineDate?.toISOString().split('T')[0] ?? null,
      status: o.status,
      slots: (o.slots ?? []).map((s) => ({
        id: s.id,
        role: s.positionCode,
        headcount: s.slotsNeeded,
        filled: s.slotsFilled,
        remaining: s.slotsNeeded - s.slotsFilled,
      })),
    })),
  });
}
