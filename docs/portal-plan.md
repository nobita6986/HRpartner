# Kế hoạch phát triển: Hệ sinh thái Portal Toàn diện (All-in-One ERP Workspace)

## 1. Tầm nhìn chiến lược (Vision: User-Centric ERP)
Sếp nhận định cực kỳ chính xác: **"Xây dựng hệ thống xong mà người dùng không thể thao tác hay tương tác thì không có tác dụng gì"**. Điểm nghẽn lớn nhất của phần mềm doanh nghiệp là chỉ phục vụ chiều thu thập dữ liệu (cho HR/Kế toán) mà quên mất việc mang lại giá trị thực tế cho người dùng đầu cuối.

Chúng ta sẽ chuyển hướng mạnh mẽ, biến HRP thành một **Hệ sinh thái Không gian làm việc số (Digital Workspaces)**. Từng nhóm người dùng (Worker, Vendor, CTV, BoD, Public) khi truy cập vào subdomain của mình sẽ thấy một ứng dụng hoàn chỉnh, có lợi ích rõ ràng, giúp họ giải quyết công việc hàng ngày một cách sung sướng nhất.

## 2. Quy hoạch Không gian làm việc cho từng Role (The Workspaces)

### 2.1. Public Portal (Chợ Giao dịch việc làm)
- **Đối tượng:** Ứng viên tự do, người tìm việc.
- **Giá trị:** Tìm việc nhanh, minh bạch, uy tín.
- **Tính năng tương tác:**
  - Landing Page với thiết kế `warm_professionalism` thu hút.
  - Tìm kiếm công việc theo địa điểm, ngành nghề với filter realtime.
  - Nộp hồ sơ (Apply) nhanh chóng, theo dõi trạng thái hồ sơ (Pending, Interview, Accepted).

### 2.2. Worker Workspace (App cho Người lao động - worker.hrpartner.vn)
- **Hiện trạng:** Quá nghèo nàn (Chỉ có check-in GPS và xem ticket).
- **Quy hoạch mới (Self-Service PWA):**
  - **Quản lý thu nhập:** Xem phiếu lương (Payslip) chi tiết từng đồng, lịch sử nhận lương.
  - **Quản lý công việc:** Xem lịch làm việc (Shift/Roster), thông tin dự án đang tham gia.
  - **Tương tác HR:** Tạo yêu cầu nghỉ phép, khiếu nại (Dispute), cập nhật thông tin cá nhân (STK Ngân hàng, size đồng phục).
  - **Gamification:** Điểm thưởng chuyên cần, thông báo nội bộ từ công ty.

### 2.3. Vendor Workspace (App cho Đối tác cung ứng - vendor.hrpartner.vn)
- **Hiện trạng:** Chỉ xem order, đẩy hồ sơ thô, xem statement.
- **Quy hoạch mới (B2B Partner Portal):**
  - **Quản lý Pipeline:** Xem phễu chuyển đổi của ứng viên do mình cung cấp (Bao nhiêu người pass, bao nhiêu rớt, lý do rớt).
  - **SLA & Công nợ:** Theo dõi thời gian phản hồi (SLA), đối soát công nợ tự động (Confirm/Dispute statement) trực quan.
  - **Hỗ trợ kinh doanh:** Nhận thông báo Order khẩn cấp (Push notification), chat/trao đổi trực tiếp với HR của HRP trên từng đơn hàng.

### 2.4. Affiliate / CTV Workspace (ctv.hrpartner.vn)
- **Hiện trạng:** Bảng table hiển thị danh sách người đã giới thiệu khô khan.
- **Quy hoạch mới (Marketing & Sales Hub):**
  - **Công cụ bán hàng:** Nút "Tạo link Affiliate", mã QR Code để đi rải trên Zalo/Facebook.
  - **Theo dõi hoa hồng (Real-time):** Giao diện ví điện tử, biểu đồ hoa hồng dự kiến, hoa hồng đã duyệt. Nút "Yêu cầu rút tiền" (Withdrawal request).
  - **Kích thích chéo:** Bảng xếp hạng CTV (Leaderboard), các chương trình thưởng nóng (Campaigns). Kho tài liệu hình ảnh (Marketing Kits) để CTV tải về đăng bài.

### 2.5. BoD Dashboard (Không gian của Ban Giám Đốc)
- **Đối tượng:** C-Level, Giám đốc, Quản lý cấp cao.
- **Quy hoạch mới (Executive Summary):**
  - 4 Thẻ chỉ số sinh tử: Tổng Headcount (Biến động), Tỷ lệ lấp đầy Dự án, Sức khỏe tài chính (Quỹ lương/Hoa hồng), Hiệu suất tuyển dụng.
  - Biểu đồ xu hướng (Trend charts) cập nhật realtime từ Prisma.

## 3. Rà soát Codebase (Gap Analysis)
- **Core Database & Logic:** 80% logic nghiệp vụ phía sau (Backend) cho Worker, Vendor, CTV đã làm xong ở Phase 1 & 2. (VD: Bảng `Tickets`, `SourceClaims`, `CommissionLedger`, `Orders`).
- **Giao diện (Frontend):** 
  - Thư mục `stitch/` đã có các bản HTML tĩnh cho Public Portal, CTV, và Admin Dashboard. Cần Slicing thành React Component.
  - Riêng **Worker** và **Vendor** hiện đang xài UI thô sơ (làm bằng Tailwind cơ bản ở Phase 1), cần lên ý tưởng UX/UI mới hoặc vẽ thêm bản thiết kế để nâng cấp.
- **Kiến trúc Layout:** Cần chia tách các Layout rõ ràng trong Next.js: `app/(portal)` cho Public, `app/worker` cho Worker, `app/vendor` cho Vendor, v.v... đảm bảo mỗi bên có Navbar/Sidebar riêng biệt.

## 4. Chiến lược triển khai (Milestones)

- **Milestone 1:** Cấu hình Design System `warm_professionalism` và xây dựng Public Portal (Landing Page + Chợ việc làm).
- **Milestone 2:** Nâng cấp toàn diện CTV Workspace (Affiliate Hub) bằng giao diện có sẵn từ `stitch/`.
- **Milestone 3:** Xây dựng BoD Dashboard cho Ban Giám Đốc.
- **Milestone 4:** Tái cấu trúc Worker Workspace (Thêm Quản lý thu nhập, Lịch làm việc, Profile).
- **Milestone 5:** Nâng cấp Vendor Workspace (B2B Pipeline & SLA).

> Kế hoạch này đảm bảo HRP không chỉ là phần mềm quản lý, mà là một **sản phẩm B2C/B2B** mang lại trải nghiệm xuất sắc cho tất cả các bên tham gia.
