'use server';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function fetchPortalTimesheet(employeeCode: string) {
  if (!employeeCode || employeeCode.trim() === '') {
    return { error: 'Vui lòng nhập mã thẻ.' };
  }

  try {
    const timesheet = await prisma.portalTimesheet.findFirst({
      where: {
        employeeCode: {
          equals: employeeCode.trim(),
          mode: 'insensitive',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!timesheet) {
      return { error: 'Không tìm thấy thông tin chấm công cho mã thẻ này.' };
    }

    return {
      data: {
        id: timesheet.id,
        employeeCode: timesheet.employeeCode,
        fullName: timesheet.fullName,
        project: timesheet.project,
        totalWorkDays: Number(timesheet.totalWorkDays),
        otHours: Number(timesheet.otHours),
        absentDays: Number(timesheet.absentDays),
        dailyData: timesheet.dailyData as any[],
        payrollData: timesheet.payrollData as any,
        updatedAt: timesheet.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Lỗi truy vấn tra cứu công:', error);
    return { error: 'Có lỗi xảy ra trên server. Vui lòng thử lại sau.' };
  }
}
