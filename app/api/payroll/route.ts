/**
 * GET /api/payroll — M6 Admin Payroll Config
 *
 * List all payroll configurations for admin. Auth via hrp_token cookie.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VIEWER_ROLES = new Set([
  'ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR',
]);

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
    const [rows, total] = await Promise.all([
      prisma.payrollConfig.findMany({
        where,
        orderBy: [
          { isActive: 'desc' },
          { effectiveFrom: 'desc' },
        ],
        take,
        skip,
      }),
      prisma.payrollConfig.count({ where }),
    ]);
    return NextResponse.json({ configs: rows, total, take, skip });
  } catch (err) {
    console.error('[api/payroll] query error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to query payroll configs' }, { status: 500 });
  }
}
