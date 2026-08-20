# Đánh giá Kế hoạch phát triển Portal (Hệ sinh thái All-in-One ERP Workspace)

Dựa trên tài liệu `portal-plan.md` và yêu cầu đặc thù về **khả năng chịu tải cao (High Concurrency)** lên tới hàng ngàn truy cập cùng lúc vào kỳ lương, tôi xin gửi bản đánh giá và các đề xuất tối ưu kiến trúc.

## 1. Đánh giá chung về kế hoạch hiện tại (Strengths)

Kế hoạch `portal-plan.md` thể hiện một tư duy sản phẩm xuất sắc (Product-Mindset):
- **User-Centric (Lấy người dùng làm trung tâm):** Việc chia nhỏ thành các Workspace (Worker, Vendor, CTV, BoD) giải quyết triệt để vấn đề UX. Thay vì nhồi nhét mọi thứ vào một phần mềm nguyên khối, mỗi đối tượng có một "sân chơi" riêng với tính năng đo ni đóng giày.
- **Giá trị thực tiễn cao:** Các tính năng như *Quản lý Pipeline* (cho Vendor), *Gamification & Rút tiền* (cho CTV), và *Tương tác trực tiếp* (cho Worker) biến HRP từ một công cụ quản lý thụ động thành một vũ khí tạo ra doanh thu và giữ chân nhân sự.
- **Lộ trình rõ ràng:** Việc chia 5 Milestone giúp việc release tính năng được kiểm soát tốt, roll-out cuốn chiếu giảm thiểu rủi ro.

Tuy nhiên, **kế hoạch hiện tại đang thiếu vắng hoàn toàn góc nhìn về Kiến trúc Hệ thống (System Architecture) để đáp ứng Performance**, đặc biệt là vấn đề sếp vừa nêu: **"Chịu tải hàng ngàn lượt truy cập cùng lúc vào kỳ lương"**.

---

## 2. Phân tích rủi ro "Thundering Herd" vào kỳ lương

Vào ngày phát lương (ví dụ mùng 5 hoặc mùng 10 hàng tháng), hàng ngàn công nhân (Worker) sẽ nhận được tin báo lương và ĐỒNG LOẠT đăng nhập vào `worker.hrpartner.vn` để xem phiếu lương (Payslip).

**Rủi ro hệ thống sẽ đối mặt:**
1. **Quá tải Database Connections (Connection Pool Exhaustion):** Hàng ngàn truy vấn cùng lúc chọc thẳng vào Database (Prisma -> Postgres) sẽ làm sập pool kết nối. Chúng ta đã từng gặp lỗi "transaction timeout" của Neon DB ngay cả khi chạy test.
2. **Nghẽn CPU vì tính toán động:** Nếu phiếu lương được tính toán (gross to net, trừ thuế, trừ BHXH, cộng hoa hồng) ngay tại thời điểm user click xem, server Node.js/Next.js sẽ bị nghẽn (Event Loop Blocked).
3. **Băng thông & API Timeout:** Giao diện bị treo, vòng xoay loading vô tận gây bức xúc cho người lao động, dẫn đến họ liên tục nhấn F5 (Refresh), tạo ra một cuộc tấn công DDoS từ chính người dùng nội bộ.

---

## 3. Đề xuất Kiến trúc Chịu tải cao (High Concurrency Architecture)

Để giải quyết bài toán trên, tôi đề xuất bổ sung **Milestone 0: Hạ tầng & Kiến trúc (Infrastructure & Architecture)** vào kế hoạch, tập trung vào các giải pháp sau:

### 3.1. Kế thừa kiến trúc Microservices (Tận dụng `appBCC` Python)
> [!IMPORTANT]
> **Quy tắc Vàng:** TUYỆT ĐỐI không tính toán lương khi user xem. 
- Việc sếp đã quy hoạch tách bạch việc tính lương (BCC) cho **`appBCC` (Python)** xử lý là một quyết định kiến trúc cực kỳ chuẩn xác (Microservices pattern). Python với sức mạnh xử lý data (Pandas/NumPy) sẽ làm nhiệm vụ tính toán nặng nề (gross to net, thuế, BHXH) một cách độc lập (Decoupled).
- Sau khi `appBCC` tính xong, nó đẩy dữ liệu "sạch" (Pre-computed JSON Snapshot) lên cơ sở dữ liệu chính của App. Nhờ vậy, khi Worker đăng nhập, hệ thống Next.js chỉ việc truy vấn và render dữ liệu tĩnh, loại bỏ hoàn toàn nguy cơ nghẽn CPU trên web server.

### 3.2. Caching & Edge Network
- Mặc dù Phiếu lương là dữ liệu Private không thể cache trên CDN (Public), chúng ta có thể sử dụng **Redis (In-memory Cache)**. 
- Khi đến kỳ lương, hệ thống chủ động "bơm" (warm-up) dữ liệu phiếu lương của hàng ngàn công nhân vào Redis. Các API từ `worker.hrpartner.vn` sẽ đọc trực tiếp từ Redis thay vì gọi xuống PostgreSQL.

### 3.3. Database Connection Pooling
> [!WARNING]
> Prisma kết nối trực tiếp với database ở môi trường Serverless (Vercel) sẽ cạn kiệt connection rất nhanh.
- Phải đảm bảo đang sử dụng **Neon Serverless Driver** thông qua WebSockets hoặc **PgBouncer** connection pool. Giới hạn số lượng connection tối đa để bảo vệ Database không bị sập.

### 3.4. Rate Limiting & Queueing (Cơ chế xếp hàng)
- Bổ sung Rate Limiting (Giới hạn truy cập) trên Vercel Edge Middleware.
- Áp dụng kỹ thuật **Virtual Waiting Room (Phòng chờ ảo)**: Khi có quá 5000 người truy cập cùng 1 giây, những người đến sau sẽ thấy giao diện *"Hệ thống đang đông, vui lòng chờ trong 10 giây..."*. Giống như cách các web bán vé concert hoặc đăng ký tín chỉ trường Đại học đang làm.

---

## 4. Điều chỉnh Lộ trình (Milestones)

Tôi đề xuất cập nhật lại Milestone như sau để lồng ghép yếu tố chịu tải:

1. **Milestone 1:** Cấu hình Design System + Xây dựng Public Portal.
2. **Milestone 2:** Nâng cấp CTV Workspace (Affiliate Hub).
3. **Milestone 3 (Nâng hạng ưu tiên):** **Worker Workspace + Kiến trúc Chịu tải.** 
   - Xây dựng luồng Pre-compute Payslip.
   - Tích hợp Redis Cache cho Payslip API.
   - Stress-test (Dùng công cụ như k6 hoặc JMeter) giả lập 10,000 requests/giây trước khi golive.
4. **Milestone 4:** BoD Dashboard (C-Level).
5. **Milestone 5:** Nâng cấp Vendor Workspace.

> [!TIP]
> Việc đẩy Worker Workspace lên làm sớm (Milestone 3) kết hợp giải quyết bài toán chịu tải ngay từ đầu sẽ giúp hệ thống vững vàng nhất, vì Worker là tập user đông đảo nhất và dễ tạo "Thundering Herd" nhất.
