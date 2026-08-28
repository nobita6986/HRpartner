/**
 * GET /api/statements -- List VendorStatement + ClientStatement
 * Phase 5 UAT/Cutover STEP-01 (RQ-02) -- V5-M1-08 STEP-06 (DEC-06).
 *
 * Auth: cookie hrp_token (Phase 1).
 * Roles nội bộ read-only: ADMIN, HR_MANAGER, ACCOUNTANT, DIRECTOR.
 *
 * DEC-06: đây là generic alias nội bộ. Vendor KHÔNG dùng surface này — mọi vendor role
 * (VENDOR_ADMIN/VENDOR_STAFF) → 403 PERMISSION_DENIED TRƯỚC DB (zero business DB call).
 * Vendor đọc statement của mình qua `/api/vendor/**` canonical (own-scope + RLS). Bỏ nhánh
 * `where.vendorId` cũ vì không còn vendor role nào tới được query.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LIST_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR'] as const);

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const role = ctx.role as typeof LIST_ROLES extends Set<infer T> ? T : never;
  if (!LIST_ROLES.has(role)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền xem statements` }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind'); // 'vendor' | 'client'
  const status = searchParams.get('status') ?? undefined;
  const take = Math.min(50, parseInt(searchParams.get('take') ?? '20', 10));
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);

  const prisma = getPrisma();

  try {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // DEC-06 / RQ-04: CLIENT_COMMERCIAL (client receivable `totalAmount`) CHỈ lộ khi caller có
    // CAN_VIEW_STATEMENT_MARGIN hiệu lực. Resolve FAIL-CLOSED — mọi lỗi resolver ⇒ coi như KHÔNG
    // có quyền (ẩn client totalAmount). VENDOR_FINANCIAL (vendor payable) vẫn hiển thị cho internal
    // reader; thiếu vế client ⇒ RISK-02 không thể suy ra margin.
    let canViewClientCommercial = false;
    try {
      const perms = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
      canViewClientCommercial = perms.has('CAN_VIEW_STATEMENT_MARGIN');
    } catch {
      canViewClientCommercial = false;
    }

    const [vendorRows, clientRows, vendorTotal, clientTotal] = await Promise.all([
      withDbContext(prisma, ctx, (tx) =>
        tx.vendorStatement.findMany({
          where: kind === 'client' ? { id: 'never-match' } : where,
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
      ),
      withDbContext(prisma, ctx, (tx) =>
        tx.clientStatement.findMany({
          where: kind === 'vendor' ? { id: 'never-match' } : where,
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
      ),
      withDbContext(prisma, ctx, (tx) =>
        tx.vendorStatement.count({ where: kind === 'client' ? { id: 'never-match' } : where }),
      ),
      withDbContext(prisma, ctx, (tx) =>
        tx.clientStatement.count({ where: kind === 'vendor' ? { id: 'never-match' } : where }),
      ),
    ]);

    // Allowlist DTO (DEC-01): xây object mới từ field tường minh, KHÔNG spread raw row.
    // VENDOR → luôn kèm VENDOR_FINANCIAL totalAmount. CLIENT → chỉ kèm CLIENT_COMMERCIAL
    // totalAmount khi canViewClientCommercial (else OMIT field, không null-placeholder).
    interface StatementSummary {
      id: string;
      kind: 'VENDOR' | 'CLIENT';
      partyId: string;
      partyName: string;
      periodMonth: number;
      periodYear: number;
      totalAmount?: string;
      status: string;
      version: number;
      disputeCount: number;
      confirmDeadlineAt: string | null;
      sentAt: string | null;
      lockedAt: string | null;
      createdAt: string;
    }

    const vendorSummaries: StatementSummary[] = vendorRows.map((r) => ({
      id: r.id,
      kind: 'VENDOR',
      partyId: r.vendorId,
      partyName: r.vendorId,
      periodMonth: r.periodMonth,
      periodYear: r.periodYear,
      totalAmount: r.totalAmount.toString(),
      status: r.status,
      version: r.version,
      disputeCount: r.disputeCount,
      confirmDeadlineAt: r.confirmDeadlineAt?.toISOString() ?? null,
      sentAt: r.sentAt?.toISOString() ?? null,
      lockedAt: r.lockedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    const clientSummaries: StatementSummary[] = clientRows.map((r) => ({
      id: r.id,
      kind: 'CLIENT',
      partyId: r.clientId,
      partyName: r.clientId,
      periodMonth: r.periodMonth,
      periodYear: r.periodYear,
      ...(canViewClientCommercial ? { totalAmount: r.totalAmount.toString() } : {}),
      status: r.status,
      version: r.version,
      disputeCount: r.disputeCount,
      confirmDeadlineAt: r.confirmDeadlineAt?.toISOString() ?? null,
      sentAt: r.sentAt?.toISOString() ?? null,
      lockedAt: r.lockedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    const statements = [...vendorSummaries, ...clientSummaries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json({
      statements,
      vendorCount: vendorTotal,
      clientCount: clientTotal,
      total: vendorTotal + clientTotal,
      take,
      skip,
    });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    console.error('[api/statements GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list statements' }, { status: 500 });
  }
}
