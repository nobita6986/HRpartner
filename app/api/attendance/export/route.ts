/**
 * GET /api/attendance/export
 *
 * Xuất dữ liệu chấm công của toàn bộ NLĐ có phát sinh chấm công ra file Excel (.xlsx)
 * hoặc trả về dữ liệu JSON (`?format=json`) phục vụ bảng tra cứu trên `/admin/attendance`.
 *
 * Query params hỗ trợ:
 *   - `periodId`: ID kỳ công (tùy chọn)
 *   - `projectId`: ID dự án (tùy chọn; để trống = toàn bộ dự án trong phạm vi quyền)
 *   - `month`, `year`: Tháng/Năm (tùy chọn; để trống = toàn bộ thời gian)
 *   - `fromDate`, `toDate`: Khoảng ngày YYYY-MM-DD (tùy chọn)
 *   - `format`: 'xlsx' (mặc định) | 'json'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  buildAttendanceExportWorkbook,
  collectAttendanceExportData,
} from '@/src/domains/attendance/attendance-export.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EXPORT_ROLES = new Set([
  'ADMIN',
  'HR_MANAGER',
  'HR_STAFF',
  'PM',
  'ACCOUNTANT',
  'DIRECTOR',
] as const);

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

  const role = ctx.role as typeof EXPORT_ROLES extends Set<infer T> ? T : never;
  if (!EXPORT_ROLES.has(role)) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền xuất dữ liệu chấm công` },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const periodId = searchParams.get('periodId') || undefined;
  const projectId = searchParams.get('projectId') || undefined;
  const monthRaw = searchParams.get('month');
  const yearRaw = searchParams.get('year');
  const fromDate = searchParams.get('fromDate') || undefined;
  const toDate = searchParams.get('toDate') || undefined;
  const format = (searchParams.get('format') || 'xlsx').toLowerCase();

  const month = monthRaw ? parseInt(monthRaw, 10) : undefined;
  const year = yearRaw ? parseInt(yearRaw, 10) : undefined;

  const prisma = getPrisma();
  try {
    const data = await withDbContext(prisma, ctx, (tx) =>
      collectAttendanceExportData(tx, {
        periodId,
        projectId,
        month: month && Number.isFinite(month) && month >= 1 && month <= 12 ? month : undefined,
        year: year && Number.isFinite(year) && year >= 2000 && year <= 2100 ? year : undefined,
        fromDate,
        toDate,
      }),
    );

    if (format === 'json') {
      return NextResponse.json(data);
    }

    const buffer = buildAttendanceExportWorkbook(data);
    const suffixParts: string[] = [];
    if (year && month) {
      suffixParts.push(`${year}-${String(month).padStart(2, '0')}`);
    } else if (fromDate || toDate) {
      suffixParts.push(`${fromDate ?? 'all'}_${toDate ?? 'all'}`);
    } else {
      suffixParts.push(new Date().toISOString().slice(0, 10));
    }

    const filename = `bang-cham-cong-nld-${suffixParts.join('-')}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/attendance/export GET] error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Không thể xuất dữ liệu chấm công lúc này.' },
      { status: 500 },
    );
  }
}
