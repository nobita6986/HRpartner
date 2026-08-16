/**
 * app/api/admin/inspect-portal/route.ts (TEMPORARY — STEP-07)
 * Read-only khảo sát duplicate portal_timesheets trên PRODUCTION.
 * Auth: Bearer SEED_DEBUG_SECRET (non-sensitive).
 * XÓA sau khi STEP-07 done (trước HANDOFF READY_FOR_AUDIT).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const expected = process.env.SEED_DEBUG_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'NO_SECRET' }, { status: 500 });
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const dupRaw = await getPrisma().$queryRaw<Array<{
      employee_code: string;
      project: string;
      period_month: number;
      period_year: number;
      n: number;
    }>>`
      SELECT employee_code, project, period_month, period_year, COUNT(*)::int AS n
      FROM portal_timesheets
      GROUP BY employee_code, project, period_month, period_year
      HAVING COUNT(*) > 1
      ORDER BY n DESC
      LIMIT 50
    `;
    const totalDupGroups = await getPrisma().$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total FROM (
        SELECT 1 FROM portal_timesheets
        GROUP BY employee_code, project, period_month, period_year
        HAVING COUNT(*) > 1
      ) s
    `;
    const totalRows = await getPrisma().portalTimesheet.count();
    return NextResponse.json({
      ok: true,
      totalRows,
      duplicateGroups: totalDupGroups[0]?.total ?? 0,
      sampleDuplicates: dupRaw.slice(0, 10).map((d) => ({
        employeeCode: `${String(d.employee_code).substring(0, 3)}***`,
        project: `${String(d.project).substring(0, 3)}***`,
        periodMonth: d.period_month,
        periodYear: d.period_year,
        count: Number(d.n),
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'INTERNAL', message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
