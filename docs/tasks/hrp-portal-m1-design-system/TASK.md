# CONTRACT: HRP Portal Ecosystem - Milestone 1 (Design System & Public Layout)

## 1. Metadata
- **Task ID:** `hrp-portal-m1-design-system`
- **Phase:** Phase Extension - Job Market Portal (Milestone 1)
- **Role:** Tier 2 (Figma Owner / Frontend Engineer)
- **Status:** COMPLETED

## 2. Context & Objectives
Ban Giám đốc đã chốt hướng đi mới: Biến HRP thành một Hệ sinh thái Digital Workspaces. Bước đầu tiên (Milestone 1) là "khoác áo mới" cho toàn bộ hệ thống bằng Design System `warm_professionalism` và dựng bộ khung (Layout) cho Public Portal (khách vãng lai).

**Mục tiêu:**
1. Cấu hình Tailwind v4 (`app/globals.css`) theo đúng thông số từ `F01_Tokens.html (hoặc stitch/warm_professionalism)`.
2. Slicing (cắt HTML) bộ Global Navbar và Global Footer từ `S05_JobBoard_Public_1440.html (hoặc stitch tương ứng)`.
3. Xây dựng Layout wrapper `app/(portal)/layout.tsx` để chứa Navbar/Footer này. Các trang public (Trang chủ, CTV Portal) sẽ dùng layout này để tách biệt với Admin/Worker Dashboard.

## 3. Specifications (Yêu cầu kỹ thuật)

### 3.1. Design System Integration
- Đọc file `F01_Tokens.html (hoặc stitch/warm_professionalism)`.
- Chuyển đổi các biến màu sắc (đặc biệt là dải màu `brand-orange: #f26522`, `brand-dark`, v.v...) vào `app/globals.css` theo chuẩn Tailwind v4 (`@theme { --color-brand-orange: #f26522; ... }`).
- Cấu hình font chữ: `Be Vietnam Pro` (chính) và `Inter` (phụ). Import từ Google Fonts nếu chưa có.

### 3.2. Public Layout (`app/(portal)/layout.tsx`)
- Tạo file `app/(portal)/layout.tsx`.
- Cắt đoạn Header (Navigation) và Footer từ file `S05_JobBoard_Public_1440.html (hoặc stitch tương ứng)`.
- **Yêu cầu Header:** Có Logo HRP, các menu link (Việc làm, Dịch vụ Tuyển dụng, Cộng tác viên...), và nút Đăng nhập / Đăng ký.
- Đảm bảo Responsive: Nút menu hamburger trên Mobile phải hoạt động (hiển thị dropdown menu khi click - dùng React `useState`).

## 4. Bàn giao (Handoff Requirements)
Tier 2 sau khi hoàn thành cần:
1. Đảm bảo app build thành công (`npm run build`).
2. Viết báo cáo vào `HANDOFF.md` liệt kê các biến CSS đã thiết lập và ảnh chụp màn hình (nếu có thể) xác nhận Navbar đã lên hình.
3. Pass lại cho Tier 3 Audit.

> **Planner Note:** Chỉ làm Layout và Design System. Phần ruột của Landing Page (Hero Section, Job Search) sẽ làm ở Milestone 2.

