# Lộ trình Phát triển: Hệ sinh thái Portal Toàn diện (All-in-One ERP Workspace)

Tài liệu này theo dõi tiến độ thực thi kế hoạch chuyển đổi HRP thành Hệ sinh thái Workspaces (dựa trên `portal-plan.md`).

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

## 🟢 Milestone 4: BoD Dashboard (Báo cáo Giám đốc)
**Mục tiêu:** Cung cấp số liệu tổng quan realtime cho Ban Giám đốc.
- [ ] Cắt HTML từ `stitch/hrp_balanced_4_card_dashboard`.
- [ ] Xây dựng trang `/admin/dashboard` (hoặc `/bod`).
- [ ] Viết Queries thống kê: Active Workers, Tỷ lệ lấp đầy dự án, Quỹ lương/Hoa hồng dự kiến, Hiệu suất tuyển dụng.

## 🟢 Milestone 5: Worker & Vendor Workspace Revamp
**Mục tiêu:** Cải tổ giao diện và tính năng cho Công nhân và Đối tác.
- [ ] **Worker:** Nâng cấp PWA, bổ sung màn hình xem Lịch làm việc và Phiếu lương.
- [ ] **Vendor:** Bổ sung giao diện Quản lý Pipeline ứng viên và Đối soát công nợ tự động.

---
*Cập nhật lần cuối: 19/08/2026. Tiến trình sẽ được đánh dấu [x] khi các Task tương ứng hoàn thành và ACCEPTED.*
