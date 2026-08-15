# Kế hoạch phát triển Module Hiển thị Lương Chi tiết (Payslip Toàn diện)

Với 2 hình ảnh bạn cung cấp, đây là một cấu trúc **Phiếu Lương (Payslip)** cực kỳ hoàn chỉnh và chuyên nghiệp trong các nhà máy sản xuất. Cấu trúc này chia làm 4 phần rõ rệt:
*   **Phần A:** Các khoản tính lương (17 mục - Tăng ca, ca đêm, chủ nhật, lễ...)
*   **Phần B:** Các khoản thưởng / Phụ cấp (9 mục - Chuyên cần, thâm niên, soi kính...)
*   **Phần C:** Tổng thu nhập (A + B)
*   **Phần D:** Các khoản khấu trừ (5 mục - Bảo hiểm, ứng lương, đồng phục...)
*   **Phần E:** THỰC LĨNH (C - D)

Để giải quyết bài toán này mà không làm phình to Database hay bị "chết cứng" (hardcode), chúng ta sẽ áp dụng kiến trúc **JSON-based Payload**.

## 1. Cấu trúc Database (Prisma)
Thay vì tạo ra hàng chục cột trong CSDL, toàn bộ Phiếu Lương sẽ được đóng gói thành một Object JSON thống nhất.

**[MODIFY]** `schema.prisma`:
```prisma
model PortalTimesheet {
  // ... các trường cũ (thông tin cá nhân, Lịch làm việc) ...
  
  // Dữ liệu chi tiết Bảng Lương (Lưu dạng Object JSON)
  /* Format:
  {
    "salaryItems": [{"name": "Tổng giờ làm việc...", "qty": 200, "rate": 20000, "total": 4000000}],
    "allowances": [{"name": "Thưởng chuyên cần", "qty": null, "rate": null, "total": 500000}],
    "deductions": [{"name": "Bảo hiểm", "qty": null, "rate": null, "total": 250000}],
    "summary": {
      "totalSalary": 4000000,
      "totalAllowance": 500000,
      "grossIncome": 4500000,
      "totalDeduction": 250000,
      "netIncome": 4250000
    }
  }
  */
  payrollData    Json?    @map("payroll_data")
}
```

## 2. Nâng cấp Desktop App (Python)
- **Agent Mapper (AI)**: Cấu hình hệ thống để AI tự động parse các cột tương ứng trong file Excel thành cấu trúc JSON trên. 
- Do cấu trúc quá dài, ta có thể xây dựng một tính năng **Mapping Rules (Kéo thả hoặc Cấu hình tay)** nếu AI bóc tách chậm hoặc không chính xác đối với file hàng ngàn dòng.

## 3. Giao diện UI Web (Next.js)
- Thêm một nút **"Xem Phiếu Lương"** bên cạnh nút "Chi tiết Lịch làm việc".
- Khi bấm vào, sẽ hiển thị một Bảng (Table) y hệt hình ảnh bạn cung cấp, với các Section màu xanh dương chia rõ ràng Phần A, B, C, D.
- Bảng được code bằng Tailwind CSS, responsive tốt trên cả điện thoại (để công nhân dễ xem).

## Open Questions
> [!IMPORTANT]
> 1. Trong file Excel chấm công gốc, đã tính sẵn cột **"Thành tiền"** (Cột cuối cùng) cho tất cả các khoản này chưa, hay hệ thống của chúng ta phải tự lấy **Số lượng $\times$ Đơn giá** để ra Thành tiền? 
> 2. Các dòng có giá trị bằng 0 (Ví dụ: Không có tăng ca đêm), bạn muốn ẨN đi cho phiếu lương ngắn gọn, hay vẫn HIỂN THỊ nhưng để trống/ghi số 0 (như hình mẫu)?

## Verification Plan
1. Chạy `prisma db push` để thêm cột `payrollData`.
2. Tạo dữ liệu giả lập (Seed data) với cấu trúc JSON hoàn chỉnh (Phần A, B, C, D) cho 1 nhân viên.
3. Dựng giao diện Phiếu Lương bằng Next.js + Tailwind và gửi bạn xem trước.
4. Cập nhật tool Python để nó có thể bóc tách cấu trúc này từ file Excel thực tế.
