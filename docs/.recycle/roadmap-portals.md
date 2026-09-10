# Lộ trình Phát triển: Hệ sinh thái Portal Toàn diện (All-in-One ERP Workspace)

Tài liệu này theo dõi tiến độ thực thi kế hoạch chuyển đổi HRP thành Hệ sinh thái Workspaces (dựa trên portal-plan.md và portal_plan_evaluation.md).

## 🟢 Milestone 1: Nền tảng Design System & Public Layout
**Mục tiêu:** Đồng bộ UI/UX toàn hệ thống theo chuẩn F01_Tokens và xây dựng bộ khung Public.
- [ ] Cập nhật globals.css với mã màu và typography mới.
- [ ] Xây dựng pp/(portal)/layout.tsx (Global Navbar & Footer).
- [ ] Tạo các UI Components dùng chung (Button, Card, Input) chuẩn Tailwind v4.

## 🟢 Milestone 2: Landing Page & Chợ Việc Làm (Job Board)
**Mục tiêu:** Thu hút ứng viên tự do qua giao diện SEO-friendly (S05_JobBoard_Public).
- [ ] Triển khai giao diện S05.
- [ ] Hoàn thiện pp/(portal)/page.tsx (Hero, Services).
- [ ] Tích hợp API /api/jobs vào thanh tìm kiếm và luồng Apply trực tuyến.

## 🟢 Milestone 3: Affiliate / CTV Workspace
**Mục tiêu:** Biến ctv.hrpartner.vn thành Marketing & Sales Hub.
- [ ] Nâng cấp pp/ctv/page.tsx.
- [ ] Tích hợp tính năng tạo mã Referral QR / Copy Link.
- [ ] Hiển thị biểu đồ hoa hồng (từ CommissionLedger) và danh sách ứng viên (từ SourceClaim).

## 🟢 Milestone 4: Worker Workspace & Kiến trúc Chịu tải (High Concurrency)
**Mục tiêu:** Cải tổ app cho Công nhân (S03_Attendance) và giải bài toán Thundering Herd vào kỳ phát lương.
- [ ] Tích hợp Redis Cache và Neon Connection Pooling / PgBouncer.
- [ ] Dựng luồng Pre-compute Payslip từ ppBCC (Python) lưu thành JSON Snapshot.
- [ ] Nâng cấp UI PWA của Worker (Xem Phiếu lương, Lịch làm việc).
- [ ] Bổ sung Rate Limiting / Virtual Waiting Room bằng Vercel Edge Middleware.

## 🟢 Milestone 5: Control Tower (BoD Dashboard)
**Mục tiêu:** Báo cáo cho Giám đốc (S01_ControlTower).
- [ ] Triển khai giao diện S01_ControlTower làm Dashboard Giám đốc (/bod).
- [ ] Bổ sung thẻ thống kê: Active Workers, Tỷ lệ lấp đầy, Quỹ lương, Hiệu suất tuyển dụng.

## 🟢 Milestone 6: Vendor Portal & Reconciliation
**Mục tiêu:** Nâng cấp công cụ B2B cho Đối tác (S02_Staffing, S04_Reconciliation).
- [ ] Triển khai giao diện S02_Staffing và S04_Reconciliation cho Vendor.
- [ ] Xây dựng phễu ứng viên (Pipeline) và tích hợp Referral Guard.
- [ ] Nâng cấp endor.hrpartner.vn để quản lý Pipeline ứng viên và Đối soát công nợ tự động.

---
*Cập nhật lần cuối: 19/08/2026. Tiến trình sẽ được đánh dấu [x] khi các Task tương ứng hoàn thành và ACCEPTED.*
