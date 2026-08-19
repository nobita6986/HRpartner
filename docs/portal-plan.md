# Kế hoạch phát triển: Hệ sinh thái Portal Toàn diện (All-in-One ERP Workspace)

## 1. Tầm nhìn chiến lược (Vision: User-Centric ERP)
"Xây dựng hệ thống xong mà người dùng không thể thao tác hay tương tác thì không có tác dụng gì". Điểm nghẽn lớn nhất của phần mềm doanh nghiệp là chỉ phục vụ chiều thu thập dữ liệu mà quên mất trải nghiệm của người dùng cuối.

Chúng ta sẽ chuyển hướng mạnh mẽ, biến HRP thành một **Hệ sinh thái Không gian làm việc số (Digital Workspaces)**. Từng nhóm người dùng (Worker, Vendor, CTV, BoD, Public) khi truy cập vào subdomain của mình sẽ thấy một ứng dụng hoàn chỉnh, có lợi ích rõ ràng, giúp họ giải quyết công việc hàng ngày một cách sung sướng nhất.

## 2. Quy hoạch Không gian làm việc cho từng Role (The Workspaces)

### 2.1. Public Portal (Chợ Giao dịch việc làm)
- **Đối tượng:** Ứng viên tự do.
- **Giá trị:** Landing Page thu hút (`warm_professionalism`), SEO-friendly. Tìm kiếm việc làm với filter realtime và nộp hồ sơ nhanh chóng.

### 2.2. Worker Workspace (worker.hrpartner.vn)
- **Quy hoạch mới:** Trở thành "sổ tay điện tử" của công nhân. 
- **Tính năng:** Xem Phiếu lương (Payslip) minh bạch, quản lý ca làm việc (Shift), xin nghỉ phép, nhận điểm thưởng chuyên cần và cập nhật thông tin cá nhân.

### 2.3. Vendor Workspace (vendor.hrpartner.vn)
- **Quy hoạch mới:** B2B Partner Portal. 
- **Tính năng:** Xem "phễu ứng viên" (tỷ lệ đậu/rớt), theo dõi thời gian phản hồi (SLA), đối soát công nợ tự động trực quan và trao đổi trực tiếp với HR.

### 2.4. Affiliate / CTV Workspace (ctv.hrpartner.vn)
- **Hiện trạng Logic:** Nền tảng luồng Affiliate đã cực kỳ vững chắc (qua `SourceClaim` và `CommissionLedger`). Hệ thống đã tự động cộng/trừ hoa hồng.
- **Quy hoạch mới (Marketing Hub):** Nút "Tạo link Affiliate/Mã QR", ví điện tử theo dõi tiền hoa hồng realtime, nút "Yêu cầu rút tiền", bảng xếp hạng CTV. Thay thế giao diện khô khan hiện tại bằng bản thiết kế xịn từ `stitch`.

### 2.5. BoD Dashboard (Báo cáo nhanh cho Giám đốc)
- **Quy hoạch mới:** Gom mọi số liệu sinh tử về 1 trang duy nhất cho C-Level (từ thiết kế `hrp_balanced_4_card_dashboard`).
- **Tính năng:** 4 thẻ chỉ số quan trọng: Tổng Headcount (Biến động), Tỷ lệ lấp đầy Dự án, Sức khỏe tài chính (Quỹ lương/Hoa hồng), và Hiệu suất tuyển dụng.

---

## 3. Đánh giá Kiến trúc chịu tải cao (High Concurrency Architecture)

Khi chuyển HRP thành một Portal tương tác cao, đặc biệt là **Worker Workspace**, chúng ta sẽ đối mặt với bài toán **"Thundering Herd" (Hiệu ứng bầy đàn)**: Hàng ngàn công nhân sẽ đồng loạt đăng nhập vào ngày phát lương để xem Payslip.

Để giải quyết vấn đề quá tải Database Connections và nghẽn CPU, kiến trúc hệ thống sẽ áp dụng:

1. **Pre-computed Snapshot (Tận dụng Microservice appBCC):**
   - TUYỆT ĐỐI không tính toán lương (gross-to-net, thuế, BHXH) khi user bấm xem.
   - Các tác vụ tính toán nặng nề được đẩy sang service Python (`appBCC`). Khi tính xong, `appBCC` đẩy bản ghi (Snapshot JSON) lên Database. Next.js chỉ việc truy vấn và render tĩnh, giải phóng hoàn toàn CPU.
2. **Caching (Redis):**
   - Vào kỳ lương, hệ thống sẽ "warm-up" dữ liệu phiếu lương vào Redis (In-memory cache). Các API xem lương sẽ đọc từ Redis thay vì chọc thẳng xuống PostgreSQL.
3. **Connection Pooling:**
   - Đảm bảo sử dụng Neon Serverless Driver (qua WebSockets) hoặc PgBouncer để giới hạn số lượng connection, bảo vệ DB không bị sập.
4. **Rate Limiting & Virtual Waiting Room:**
   - Dùng Vercel Edge Middleware để giới hạn truy cập. Nếu vượt mức (ví dụ 5000 request/giây), người dùng đến sau sẽ vào "Phòng chờ ảo" để điều tiết lưu lượng.

---

## 4. Chiến lược triển khai (Milestones)

Lộ trình được điều chỉnh để ưu tiên bài toán chịu tải của Worker Workspace ngay từ sớm:

- **Milestone 1: Design System & Public Portal**
  - Cấu hình Design System `warm_professionalism` (`globals.css`).
  - Cắt HTML Landing Page & Chợ việc làm.
- **Milestone 2: Affiliate Hub (CTV Workspace)**
  - Đắp giao diện `hrp_collaborator_page_html_standard` vào `app/ctv`. 
  - Nối API Referral, hiển thị biểu đồ hoa hồng.
- **Milestone 3: Worker Workspace & Kiến trúc Chịu tải** *(Ưu tiên giải quyết rủi ro Thundering Herd)*
  - Xây dựng luồng Pre-compute Payslip từ `appBCC`.
  - Tích hợp Redis Cache và Neon Connection Pooling.
  - Xây dựng giao diện xem lương và lịch làm việc cho công nhân.
  - Stress-test (Giả lập 10,000 req/s).
- **Milestone 4: BoD Dashboard**
  - Xây dựng trang tổng quan cho Ban Giám Đốc.
- **Milestone 5: Control Tower (BoD Dashboard)**
  - Triển khai giao diện S01_ControlTower_Default_1440.html.
  - Xây dựng trang tổng quan cho Ban Giám Đốc.
- **Milestone 6: Vendor Portal & Reconciliation**
  - Đồng bộ UI/UX nội bộ và hệ thống đối soát công nợ Vendor.
  - Triển khai S02_Staffing và S04_Reconciliation.
