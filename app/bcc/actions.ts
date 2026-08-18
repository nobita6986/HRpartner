'use server';

import { getPrisma } from '@/src/lib/db';
import type { DailyData, PayrollItem, PayrollSummary } from './types';

export interface PortalTimesheetRow {
  id: string;
  employeeCode: string;
  fullName: string;
  project: string;
  periodMonth: number;
  periodYear: number;
  totalWorkDays: number;
  otHours: number;
  absentDays: number;
  dailyData: DailyData[];
  payrollData: any;
  updatedAt: string;
}

export interface PortalTimesheetResult {
  data?: PortalTimesheetRow[];
  error?: string;
  source?: string;
}

export async function fetchOptions(): Promise<{ projects: string[]; periods: string[] }> {
  try {
    const prisma = getPrisma();
    
    // Get unique projects
    const projectsData = await prisma.portalTimesheet.findMany({
      select: { project: true },
      distinct: ['project']
    });
    const projects = projectsData.map(p => p.project).filter(Boolean).sort();
    
    // Get unique periods
    const periodsData = await prisma.portalTimesheet.findMany({
      select: { periodMonth: true, periodYear: true },
      distinct: ['periodMonth', 'periodYear']
    });
    const periods = periodsData
      .filter(p => p.periodMonth && p.periodYear)
      .map(p => `${p.periodMonth}/${p.periodYear}`)
      .sort((a, b) => {
        const [mA, yA] = a.split('/').map(Number);
        const [mB, yB] = b.split('/').map(Number);
        if (yA !== yB) return yB - yA;
        return mB - mA;
      });
      
    return { projects, periods };
  } catch (error) {
    console.error('[fetchOptions] Lỗi:', error);
    return { projects: [], periods: [] };
  }
}

export async function fetchPortalTimesheet(
  employeeCode: string,
  project: string,
  period: string,
): Promise<PortalTimesheetResult> {
  if (!employeeCode || employeeCode.trim() === '') {
    return { error: 'Vui lòng nhập mã thẻ.' };
  }
  if (!period.includes('/')) {
    return { error: 'Kỳ lương không hợp lệ.' };
  }

  const [month, year] = period.split('/').map(Number);

  try {
    const prisma = getPrisma();
    
    const record = await prisma.portalTimesheet.findFirst({
      where: {
        employeeCode: { equals: employeeCode.trim(), mode: 'insensitive' },
        project,
        periodMonth: month,
        periodYear: year
      }
    });
    
    if (!record) {
      return { error: `Không có dữ liệu chấm công cho nhân viên này trong tháng ${month}/${year}.` };
    }
    
    const row: PortalTimesheetRow = {
      id: record.id,
      employeeCode: record.employeeCode,
      fullName: record.fullName,
      project: record.project,
      periodMonth: record.periodMonth || month,
      periodYear: record.periodYear || year,
      totalWorkDays: Number(record.totalWorkDays || 0),
      otHours: Number(record.otHours || 0),
      absentDays: Number(record.absentDays || 0),
      dailyData: (record.dailyData as any) || [],
      payrollData: record.payrollData || {},
      updatedAt: record.createdAt.toISOString()
    };
    
    return { data: [row], source: 'PORTAL_TIMESHEET' };
  } catch (error) {
    console.error('[fetchPortalTimesheet] Lỗi:', error);
    return { error: 'Có lỗi xảy ra trên server. Vui lòng thử lại sau.' };
  }
}
