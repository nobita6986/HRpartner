# Báo cáo Audit Toàn diện: Kế hoạch Portal vs Thực tế Codebase

Căn cứ theo yêu cầu Audit sâu vào codebase để đối chiếu với 2 bản kế hoạch gốc là `portal-plan.md` và `portal_plan_evaluation.md`, dưới đây là báo cáo trung thực và chi tiết nhất về tiến độ thực tế của dự án.

> [!WARNING]
> **Tồn tại độ lệch pha cực lớn giữa tên Task và Kế hoạch gốc.** 
> Chúng ta vừa hoàn thành một chuỗi 6 task có tên bắt đầu bằng `hrp-portal-m1` đến `m6` (Landing Page, Job Board, API, UI Fixes, Admin Master Data, Admin Payroll/Tickets). Tuy nhiên, đây chỉ là các tính năng phục vụ cho Public Portal và Admin. Nó **HOÀN TOÀN KHÔNG KHỚP** với cấu trúc 6 Milestone được định nghĩa trong `portal-plan.md`. 
> 
> Dưới đây là phân tích chi tiết dựa trên `portal-plan.md`.

---

## 1. Trạng thái theo 6 Milestones gốc (portal-plan.md)

### ✅ Milestone 1: Design System & Public Portal
- **Yêu cầu:** Cấu hình Design System `warm_professionalism`, cắt HTML Landing Page & Chợ việc làm.
- **Thực tế codebase:** **ĐÃ HOÀN THÀNH 100%**. 
  - File `globals.css` đã chứa toàn bộ biến màu của `warm_professionalism`. 
  - `app/(portal)/page.tsx` và `app/job-board` đã hiển thị tốt. Cuộn vô hạn và Material Symbols hoạt động chuẩn mực. 
  - (Được hoàn thiện thông qua các task `hrp-portal-m1` đến `m4` thực tế).

### ❌ Milestone 2: Affiliate Hub (CTV Workspace)
- **Yêu cầu:** Đập giao diện `hrp_collaborator_page_html_standard` vào `app/ctv`. Nối API Referral, hiển thị biểu đồ hoa hồng, yêu cầu rút tiền.
- **Thực tế codebase:** **CHƯA HOÀN THÀNH**.
  - Route `app/ctv` và `app/ctv-portal` vẫn đang dùng giao diện cũ từ Phase 1 (hiển thị Claims list thô sơ). Hoàn toàn chưa tích hợp Gamification, chưa có biểu đồ thu nhập và nút rút tiền theo bản thiết kế mới từ Stitch.

### ❌ Milestone 3 (Quan trọng nhất): Worker Workspace & Kiến trúc chịu tải (High Concurrency)
- **Yêu cầu:** Xây dựng luồng Pre-compute Payslip từ `appBCC`, tích hợp **Redis Cache**, **Neon Connection Pooling**, Virtual Waiting Room (Rate Limiting).
- **Thực tế codebase:** **CHƯA BẮT ĐẦU**.
  - `app/worker/page.tsx` vẫn là bản cũ từ P1 (Chấm công, Lịch sử, Phiếu của tôi qua PWA tĩnh).
  - Không hề có bất kỳ dấu vết nào của `Redis`, không có Rate Limiting trong `middleware.ts`.
  - Luồng đẩy snapshot JSON từ `appBCC` lên Next.js chưa được thực hiện. Nếu Golive lúc này, hiệu ứng "Thundering Herd" sẽ đánh sập Database ngay lập tức.

### ❌ Milestone 4: BoD Dashboard
- **Yêu cầu:** Xây dựng trang tổng quan cho Ban Giám Đốc (4 thẻ chỉ số: Headcount, Lấp đầy, Sức khoẻ tài chính, Hiệu suất).
- **Thực tế codebase:** **CHƯA BẮT ĐẦU**.
  - Hoàn toàn chưa có `app/bod` hoặc giao diện Dashboard dành riêng cho C-Level.

### ⚠️ Milestone 5: Control Tower
- **Yêu cầu:** Triển khai giao diện `S01_ControlTower_Default_1440.html` cho Admin.
- **Thực tế codebase:** **HOÀN THÀNH MỘT NỬA**.
  - Chúng ta có file `app/admin/page.tsx` (tạo từ Phase 4) và vừa bổ sung thêm các thẻ Master Data, Payroll, Tickets ở task M5/M6 thực tế. Tuy nhiên, nó vẫn ở dạng Skeleton thuần túy, chưa phải giao diện dashboard phân tích cao cấp S01.

### ❌ Milestone 6: Vendor Portal & Reconciliation
- **Yêu cầu:** Đồng bộ UI/UX nội bộ và hệ thống đối soát công nợ Vendor (S02_Staffing và S04_Reconciliation).
- **Thực tế codebase:** **CHƯA HOÀN THÀNH**.
  - `app/vendor/page.tsx` hiện tại là phiên bản cũ, chưa ghép UI thiết kế mới của Portal, cũng như chưa kết nối sâu vào luồng duyệt Statements thời gian thực.

---

## 2. Kết luận và Đề xuất Hướng đi

**Kết luận:** 
Chuỗi 6 task mà chúng ta vừa thực hiện thực chất là **"Public Portal & Admin Foundation"**. Nó rất tốt, nhưng nó **KHÔNG PHẢI** là tiến độ của Kế hoạch Digital Workspaces. Chúng ta mới chỉ xong M1 của kế hoạch gốc!

**Đề xuất hành động tiếp theo:**
Để đi đúng với kế hoạch chịu tải và All-in-One ERP, chúng ta cần:
1. **Dừng làm Admin:** Admin đã đủ tính năng cơ bản.
2. **Khởi động ngay M3 (Worker Workspace & Architecture):** Đây là bãi mìn rủi ro cao nhất. Phải setup Redis, viết luồng Pre-compute Payslip từ Python `appBCC` và tích hợp Rate Limit vào `middleware.ts`.
3. **Thực thi M2 (Affiliate Hub):** Lấy UI/UX xịn sò đắp vào `app/ctv` để Marketing có công cụ đi thu hút nhân sự.
4. **Làm M4/M5 (BoD Dashboard):** Xây dựng trang báo cáo C-level với 4 thẻ chỉ số thần thánh.

---

## 3. Lỗ hổng Admin Panel (Phát hiện từ khảo sát ngày 20/08)

Mặc dù chuỗi task M1-M6 vừa qua tập trung nhiều vào Admin, nhưng thực tế Admin Panel hiện tại chỉ là **"Vỏ bọc Read-only"**.
- **Thiếu toàn bộ CRUD:** Các trang `/admin/workers`, `/admin/projects`, `/admin/clients`, `/admin/jobs` chỉ có bảng danh sách, hoàn toàn không có Form/Modal để Thêm mới, Chỉnh sửa hay Điều chuyển nhân sự.
- **Trang rỗng (404):** Các trang `/admin/vendors`, `/admin/users`, và `/admin/settings` chưa hề được lập trình.

---

## 4. Kế hoạch Tổng thể (Comprehensive Master Plan)

Dựa trên Audit Report và Lỗ hổng Admin, đây là lộ trình chuẩn xác nhất để hoàn thiện toàn bộ HRP V4 Front-end & Architecture:

### 🎯 Giai đoạn 1: Trám lỗ hổng nền tảng (Admin Expansion)
**Mã Task:** `hrp-portal-m7-admin-expansion` (Đã lên hợp đồng)
- **Mục tiêu:** Xử lý dứt điểm các chức năng cốt lõi bị bỏ sót ở Admin để hệ thống có thể vận hành thực tế.
- **Chi tiết:** Xây dựng Modal/Form Thêm/Sửa cho Workers, Projects, Clients. Khởi tạo các trang Vendors, Users, Settings.

### 🎯 Giai đoạn 2: Bãi mìn Kiến trúc & Tải trọng (M3 gốc)
**Tên gọi:** Worker Workspace & High Concurrency
- **Mục tiêu:** Đảm bảo hệ thống sống sót khi 10.000 công nhân truy cập cùng lúc.
- **Chi tiết:** 
  - Tích hợp **Redis Cache** và Rate Limiting (Virtual Waiting Room) tại Middleware.
  - Xây dựng luồng **Pre-compute Payslip** kết nối với Python `appBCC`.
  - Cập nhật giao diện `app/worker` theo chuẩn mới.

### 🎯 Giai đoạn 3: Tăng trưởng & Đối tác (M2 & M6 gốc)
**Tên gọi:** Affiliate Hub & Vendor Portal
- **Mục tiêu:** Hỗ trợ Marketing thu hút nhân sự và tự động hóa đối soát công nợ.
- **Chi tiết:** 
  - Đắp UI mới cho `app/ctv`, bổ sung biểu đồ hoa hồng, yêu cầu rút tiền (Gamification).
  - Đồng bộ UI/UX cho `app/vendor`, kết nối luồng duyệt Statements thời gian thực.

### 🎯 Giai đoạn 4: Báo cáo C-Level (M4 gốc)
**Tên gọi:** BoD Dashboard
- **Mục tiêu:** Góc nhìn toàn cảnh cho Ban Giám đốc.
- **Chi tiết:** Khởi tạo `app/bod` với 4 thẻ chỉ số: Headcount, Lấp đầy, Sức khoẻ tài chính, Hiệu suất.
