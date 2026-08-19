# Lộ trình Phát triển: Hệ sinh thái Portal Toàn diện (All-in-One ERP Workspace)

Tài liệu này theo dõi tiến độ thực thi kế hoạch chuyển đổi HRP thành Hệ sinh thái Workspaces (dựa trên `portal-plan.md` và `portal_plan_evaluation.md`).

## 🟢 Milestone 1: Nền tảng Design System & Public Layout
**Mục tiêu:** Đồng bộ UI/UX toàn hệ thống theo chuẩn `warm_professionalism` và xây dựng bộ khung Public.
- [ ] Cập nhật `globals.css` với mã màu và typography mới.
- [ ] Xây dựng `app/(portal)/layout.tsx` (Global Navbar & Footer).
- [ ] Tạo các UI Components dùng chung (Button, Card, Input) chuẩn Tailwind v4.

## 🟢 Milestone 2: Landing Page & Chợ Việc Làm (Public Portal)
**Mục tiêu:** Thu hút ứng viên tự do qua giao diện SEO-friendly.
- [ ] Cắt HTML từ `stitch/hrp_landing_page_html_standard`.
- [ ] Hoàn thiện `app/(portal)/page.tsx` (Hero, Services).
- [ ] Tích hợp API `/api/jobs` vào thanh tìm kiếm và hiển thị danh sách việc làm.
- [ ] Xây dựng trang Chi tiết công việc và luồng Apply hồ sơ.

## 🟢 Milestone 3: Affiliate / CTV Workspace
**Mục tiêu:** Biến `ctv.hrpartner.vn` thành Marketing & Sales Hub.
- [ ] Cắt HTML từ `stitch/hrp_collaborator_page_html_standard`.
- [ ] Nâng cấp `app/ctv/page.tsx`.
- [ ] Tích hợp tính năng tạo mã Referral QR / Copy Link.
- [ ] Hiển thị biểu đồ hoa hồng (từ `CommissionLedger`) và danh sách ứng viên (từ `SourceClaim`).

## 🟢 Milestone 4: Worker Workspace & Kiến trúc Chịu tải (High Concurrency)
**Mục tiêu:** Cải tổ app cho Công nhân và giải bài toán Thundering Herd vào kỳ phát lương.
- [ ] Tích hợp Redis Cache và Neon Connection Pooling / PgBouncer.
- [ ] Dựng luồng Pre-compute Payslip từ `appBCC` (Python) lưu thành JSON Snapshot.
- [ ] Nâng cấp UI PWA của Worker (Xem Phiếu lương, Lịch làm việc).
- [ ] Bổ sung Rate Limiting / Virtual Waiting Room bằng Vercel Edge Middleware.
- [ ] Thực hiện Stress-test 10,000 req/s.

## 🟢 Milestone 5: BoD Dashboard & Vendor Workspace
**Mục tiêu:** Báo cáo cho Giám đốc và nâng cấp công cụ B2B cho Đối tác.
- [ ] Cắt HTML từ `stitch/hrp_balanced_4_card_dashboard` làm Dashboard Giám đốc (`/bod`).
- [ ] Bổ sung thẻ thống kê: Active Workers, Tỷ lệ lấp đầy, Quỹ lương, Hiệu suất tuyển dụng.
- [ ] Nâng cấp `vendor.hrpartner.vn`: Quản lý Pipeline ứng viên và Đối soát công nợ tự động.

---
*Cập nhật lần cuối: 19/08/2026. Tiến trình sẽ được đánh dấu [x] khi các Task tương ứng hoàn thành và ACCEPTED.*
