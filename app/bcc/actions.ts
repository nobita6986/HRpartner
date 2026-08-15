'use server';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function fetchOptions() {
  try {
    const timesheets = await prisma.portalTimesheet.findMany({
      select: { project: true, periodMonth: true, periodYear: true },
      distinct: ['project', 'periodMonth', 'periodYear']
    });
    
    const projects = Array.from(new Set(timesheets.map(t => t.project))).sort();
    const periods = Array.from(new Set(timesheets.map(t => `${t.periodMonth}/${t.periodYear}`))).sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      if (yA !== yB) return yB - yA;
      return mB - mA;
    });
    
    return { projects, periods };
  } catch (error) {
    console.error('Lỗi lấy options:', error);
    return { projects: [], periods: [] };
  }
}

export async function fetchPortalTimesheet(employeeCode: string, project: string, period: string) {
  if (!employeeCode || employeeCode.trim() === '') {
    return { error: 'Vui lòng nhập mã thẻ.' };
  }

  const [month, year] = period.split('/').map(Number);

  try {
    const timesheets = await prisma.portalTimesheet.findMany({
      where: {
        employeeCode: {
          equals: employeeCode.trim(),
          mode: 'insensitive',
        },
        project: project,
        periodMonth: month,
        periodYear: year,
      },
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' },
        { createdAt: 'desc' }
      ],
    });

    if (!timesheets || timesheets.length === 0) {
      return { error: 'Không tìm thấy thông tin chấm công cho mã thẻ này.' };
    }

    return {
      data: timesheets.map(t => ({
        id: t.id,
        employeeCode: t.employeeCode,
        fullName: t.fullName,
        project: t.project,
        periodMonth: t.periodMonth,
        periodYear: t.periodYear,
        totalWorkDays: Number(t.totalWorkDays),
        otHours: Number(t.otHours),
        absentDays: Number(t.absentDays),
        dailyData: t.dailyData as any[],
        payrollData: t.payrollData as any,
        updatedAt: t.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error('Lỗi truy vấn tra cứu công:', error);
    return { error: 'Có lỗi xảy ra trên server. Vui lòng thử lại sau.' };
  }
}
