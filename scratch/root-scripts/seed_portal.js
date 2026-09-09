const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Đang đẩy dữ liệu seed vào Neon DB...");

  // Generate 30 days of mock data
  const dailyData = [];
  for (let i = 1; i <= 30; i++) {
    const dateStr = `2026-06-${i.toString().padStart(2, '0')}`;
    let status = 'WORKING';
    let ot = 0;
    
    // Sundays (6, 13, 20, 27)
    if (i % 7 === 6) {
      status = 'ABSENT';
    } 
    // OT days
    else if (i % 4 === 0) {
      status = 'OVERTIME';
      ot = 2.5;
    }
    // Late
    else if (i === 10) {
      status = 'LATE';
    }
    
    dailyData.push({
      date: dateStr,
      status: status,
      in: status === 'ABSENT' ? '' : (status === 'LATE' ? '08:45' : '08:00'),
      out: status === 'WORKING' ? '17:00' : (status === 'OVERTIME' ? '19:30' : (status === 'LATE' ? '17:00' : '')),
      ot: ot
    });
  }

  await prisma.portalTimesheet.create({
    data: {
      employeeCode: 'A601010731',
      fullName: 'Ma Doãn Chung',
      project: 'Nhà máy Actro - Vĩnh Phúc',
      totalWorkDays: 25.5,
      otHours: 12.5,
      absentDays: 4,
      dailyData: dailyData
    }
  });

  console.log("Đã seed thành công nhân viên: Ma Doãn Chung (Mã thẻ: A601010731)");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
