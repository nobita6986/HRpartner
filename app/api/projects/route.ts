/**
 * GET /api/projects — M5 Admin Master Data (RQ-02)
 *
 * List all projects for admin. Auth via hrp_token cookie.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VIEWER_ROLES = new Set([
  'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'ACCOUNTANT', 'SALE', 'DIRECTOR',
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
      { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen xem du an.' },
      { status: 403 },
    );
  }

  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get('take') ?? '50', 10), 200);
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);
  const status = searchParams.get('status') ?? undefined;
  const search = searchParams.get('search') ?? undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: { clientCompany: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.project.count({ where }),
    ]);
    return NextResponse.json({ projects: rows, total, take, skip });
  } catch (err) {
    console.error('[api/projects] query error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to query projects' }, { status: 500 });
  }
}
