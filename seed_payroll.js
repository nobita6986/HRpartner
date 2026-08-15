const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Đang đẩy dữ liệu seed bảng lương vào Neon DB...");

  const payrollData = {
    salaryItems: [
      { name: "Tổng giờ làm việc ngày thường 100%", qty: 208, rate: 30000, total: 6240000 },
      { name: "Tổng giờ tăng ca ngày thường 150%", qty: 10, rate: 45000, total: 450000 },
      { name: "Tổng giờ hành chính đêm 130%", qty: 0, rate: 39000, total: 0 },
      { name: "Tổng giờ tăng ca đêm 180%", qty: 0, rate: 54000, total: 0 },
      { name: "Tổng giờ tăng ca đêm 200%", qty: 0, rate: 60000, total: 0 },
      { name: "Tổng giờ tăng ca 210%", qty: 0, rate: 63000, total: 0 },
      { name: "Tổng giờ chủ nhật 200%", qty: 8, rate: 60000, total: 480000 },
      { name: "Tổng giờ chủ nhật đêm 270%", qty: 0, rate: 81000, total: 0 },
      { name: "Tổng giờ chủ nhật đêm 240%", qty: 0, rate: 72000, total: 0 },
      { name: "Tổng giờ tăng ca 250%", qty: 0, rate: 75000, total: 0 },
      { name: "Tổng giờ tăng ca 260%", qty: 0, rate: 78000, total: 0 },
      { name: "Làm thêm ngày lễ 300%", qty: 0, rate: 90000, total: 0 },
      { name: "Tổng giờ 390% lễ đêm", qty: 0, rate: 117000, total: 0 },
      { name: "Trợ cấp làm đêm ngày thường 30%", qty: 0, rate: 9000, total: 0 },
      { name: "Trợ cấp ca đêm ngày thường 50%", qty: 0, rate: 15000, total: 0 },
      { name: "Trợ cấp làm đêm chủ nhật 70%", qty: 0, rate: 21000, total: 0 },
      { name: "Trợ cấp ca đêm ngày lễ 90%", qty: 0, rate: 27000, total: 0 }
    ],
    allowances: [
      { name: "Thưởng chuyên cần", qty: 1, rate: 300000, total: 300000 },
      { name: "Phụ cấp đời sống", qty: 1, rate: 500000, total: 500000 },
      { name: "Phụ cấp thâm niên", qty: 1, rate: 200000, total: 200000 },
      { name: "Phụ cấp suất ăn", qty: 26, rate: 25000, total: 650000 },
      { name: "Phụ cấp công đoạn/ phòng sạch", qty: 0, rate: 0, total: 0 },
      { name: "Phụ cấp soi kính", qty: 0, rate: 0, total: 0 },
      { name: "Thưởng sản lượng/KPI", qty: 1, rate: 1000000, total: 1000000 },
      { name: "Các khoản phụ cấp/ thưởng khác", qty: 0, rate: 0, total: 0 },
      { name: "Bù lương", qty: 0, rate: 0, total: 0 }
    ],
    deductions: [
      { name: "Bảo hiểm", qty: null, rate: null, total: 525000 },
      { name: "Ứng lương (lương tuần, trừ hộ người tuyển)", qty: null, rate: null, total: 0 },
      { name: "Khấu trừ đồng phục", qty: null, rate: null, total: 0 },
      { name: "Khấu trừ tiền ăn", qty: null, rate: null, total: 0 },
      { name: "Khấu trừ khác", qty: null, rate: null, total: 0 }
    ],
    summary: {
      totalSalary: 7170000,
      totalAllowance: 2650000,
      grossIncome: 9820000,
      totalDeduction: 525000,
      netIncome: 9295000
    }
  };

  // Find existing employee and update with payroll data
  const existing = await prisma.portalTimesheet.findFirst({
    where: { employeeCode: 'A601010731' }
  });

  if (existing) {
    await prisma.portalTimesheet.update({
      where: { id: existing.id },
      data: {
        payrollData: payrollData,
        totalIncome: 9295000
      }
    });
    console.log("Đã cập nhật Bảng Lương thành công cho nhân viên: Ma Doãn Chung");
  } else {
    console.log("Không tìm thấy nhân viên A601010731. Vui lòng chạy seed_portal.js gốc trước.");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
