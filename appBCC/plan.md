# Kế hoạch phát triển Module Tra Cứu Chấm Công (Bản Final)

## 1. Phương án Database (Cùng DB Prisma hiện tại)
**Đề xuất:** KHÔNG nên tạo DB phụ riêng biệt, mà nên **thêm 1 bảng mới vào Prisma schema hiện tại**.
**Lý do:**
- Thêm 1 bảng độc lập (ví dụ `PortalTimesheet`) vào cùng DB hoàn toàn không làm xáo trộn các bảng lõi khác của HrP. 
- Giúp ứng dụng Next.js chỉ cần duy trì 1 connection pool duy nhất (1 instance PrismaClient), tối ưu hiệu năng và dễ deploy lên Vercel.
- Nếu dùng DB phụ, bạn sẽ phải cấu hình 2 schema Prisma, 2 biến môi trường `DATABASE_URL_1` và `DATABASE_URL_2`, rất phức tạp và khó bảo trì. Sau này khi không dùng module tra cứu tạm này nữa, bạn chỉ cần xóa bảng `PortalTimesheet` đi là xong.

```prisma
// Sẽ được thêm vào schema.prisma
model PortalTimesheet {
  id             String   @id @default(uuid())
  employeeCode   String   @map("employee_code") // Mã thẻ
  fullName       String   @map("full_name")
  project        String   // Dự án/Nhà máy (Kế toán nhập từ tool Desktop)
  
  totalWorkDays  Decimal  @default(0) @map("total_work_days") @db.Decimal(5, 2)
  otHours        Decimal  @default(0) @map("ot_hours") @db.Decimal(5, 2)
  absentDays     Decimal  @default(0) @map("absent_days") @db.Decimal(5, 2)
  
  dailyData      Json?    @map("daily_data") 
  
  createdAt      DateTime @default(now()) @map("created_at")
  
  @@index([employeeCode])
  @@map("portal_timesheets")
}
```

## 2. Nâng cấp Desktop App (Python)
- Giao diện có nút **Preview Data**.
- Phân tích bằng AI -> Sinh dữ liệu Lịch (Mảng JSON).
- Hiển thị bảng `QTableWidget` ngay trên phần mềm để kế toán dò lại số liệu.
- Kế toán bấm **Push to DB**, tool dùng `SQLAlchemy` đẩy vào Neon DB.

## 3. Phát triển UI Tra cứu trên Web (Next.js HrP)
- Render giao diện **Lịch để bàn (Calendar Component)**.
- Đổ màu Grid Lịch: Xanh (Đi làm), Hồng (OT), Đỏ (Nghỉ).
- Thanh tìm kiếm theo Mã thẻ, không cần mật khẩu.

## Open Questions
> [!IMPORTANT]
> Phương án dùng chung DB bằng cách tạo thêm 1 bảng độc lập là tối ưu nhất. Nếu bạn đồng ý với phương án này, hãy bấm **Proceed** hoặc xác nhận để tôi bắt tay vào code Phase 1 (Sửa Schema và code UI Lịch trên Next.js) luôn nhé!

## Verification Plan
1. Chạy lệnh `npx prisma db push` thành công.
2. Viết UI Next.js với Mock Data để bạn duyệt giao diện Lịch.
3. Hoàn thiện Python Desktop App với tính năng Preview.
