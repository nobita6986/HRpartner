/**
 * GET /api/payroll — M6 Admin Payroll Config
 *
 * List all payroll configurations for admin. Auth via hrp_token cookie.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// V5-M1-06d / RQ-07 / DEC-11: cau hinh luong doc theo canonical matrix §7.2 —
// ADMIN, HR_MANAGER, DIRECTOR, ACCOUNTANT. DEC-11 DAO NGUOC 06c OQ-03 deviation:
// PayrollConfig gio co scope builder tuong minh (finance.scope.ts) → ACCOUNTANT
// (non-root) global-read {}; ADMIN/HR_MANAGER/DIRECTOR la ROOT_ROLES passthrough.
// KHONG noi mutation (route GET-only). Role ngoai matrix → 403 (route gate) va
// L1 DENY_BY_DEFAULT (backstop) neu lot qua gate.
const VIEWER_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT']);

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!VIEWER_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen xem cau hinh luong.' },
      { status: 403 },
    );
  }

  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get('take') ?? '50', 10), 200);
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);
  const isActive = searchParams.get('isActive');
  const valueType = searchParams.get('valueType') ?? undefined;
  const search = searchParams.get('search') ?? undefined;

  const where: Record<string, unknown> = {};
  if (isActive !== undefined && isActive !== '') {
    where.isActive = isActive === 'true';
  }
  if (valueType) where.valueType = valueType;
  if (search) {
    where.OR = [
      { key: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [rows, total] = await withAuthorizedDbReadOnly(prisma, ctx, (tx) =>
      Promise.all([
        tx.payrollConfig.findMany({
          where,
          orderBy: [
            { isActive: 'desc' },
            { effectiveFrom: 'desc' },
          ],
          take,
          skip,
          select: {
            id: true,
            key: true,
            valueJson: true,
            valueType: true,
            description: true,
            legalRef: true,
            version: true,
            effectiveFrom: true,
            effectiveTo: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        tx.payrollConfig.count({ where }),
      ]),
    );

    // DEC-09 (RQ-10): allowlist DTO — build object tường minh, OMIT createdBy + relation audit.
    // KHÔNG spread raw row. Date → ISO (DEC-13). valueJson là giá trị cấu hình vận hành (giữ).
    const configs = rows.map((r) => ({
      id: r.id,
      key: r.key,
      valueJson: r.valueJson,
      valueType: r.valueType,
      description: r.description,
      legalRef: r.legalRef,
      version: r.version,
      effectiveFrom: r.effectiveFrom.toISOString(),
      effectiveTo: r.effectiveTo ? r.effectiveTo.toISOString() : null,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ configs, total, take, skip });
  } catch (err) {
    if (err instanceof AuthScopeError) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Khong co pham vi xem cau hinh luong.' },
        { status: 403 },
      );
    }
    console.error('[api/payroll] query error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to query payroll configs' }, { status: 500 });
  }
}
