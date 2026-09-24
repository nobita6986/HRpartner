# P1-A0/A1 JobPosting & Marketplace Reconciliation

## 1. Mục đích
Tài liệu này xác nhận hiện trạng của kiến trúc đăng tuyển việc làm (Job Marketplace), làm rõ khoảng cách giữa thiết kế mô hình (`JobPosting`) và code thật đang chạy, từ đó định hình phạm vi cho hai task P1-A0 và P1-A1.

## 2. Capability Matrix Hiện Tại

| Capability / Bề mặt | Status | Bằng chứng (File path / Model) |
|---|---|---|
| Schema: `JobOpening` & `JobPosting` | IMPLEMENTED | `prisma/schema.prisma` (có `JobOpening`, `JobPosting`). |
| RLS: `JobPosting` | IMPLEMENTED | Đã có RLS Phase 2 cho `job_postings`. |
| Giao diện Admin: Quản lý JobPosting | READ_ONLY_SHELL | `app/admin/jobs/job-postings/page.tsx` và `[id]/page.tsx` chỉ hiển thị, không có nút Lưu/Publish, không mutate DB. |
| Core Service: Tạo / Sửa / Publish `JobPosting` | MISSING | Không có service tương ứng. `publish.service.ts` hiện tại chỉ bật cờ `isPublic` trên `Project`. |
| Public API: Danh sách việc làm (`/viec-lam`) | IMPLEMENTED (SAI NGUỒN) | `app/(jobs)/viec-lam/page.tsx` và `src/domains/job-board/public.service.ts` đang đọc trực tiếp từ `Project` và `StaffingOrderSlot`, bỏ qua `JobPosting`. |
| Public API: Chi tiết việc làm (`/viec-lam/[slug]`) | IMPLEMENTED (SAI NGUỒN) | Đọc trực tiếp từ `Project`, sử dụng `slug` của Project (`project.code`). |
| Nội dung Public Detail | FIXTURE_ONLY / Đọc từ Project | Fixture hoặc `Project` data. Các trường title, content của JobPosting hoàn toàn chưa có schema hay backend hỗ trợ. |
| Test: JobPosting CRUD & Publish | MISSING | Không có test file nào liên quan đến CRUD của `JobPosting`. |

## 3. Dependency A0 → A1
- **A1 (Public)** phụ thuộc trực tiếp vào **A0 (Admin)** ở lớp Schema và DTO.
- Phải có Schema bổ sung nội dung (tiêu đề, lương hiển thị, mô tả...) ở `JobPosting` (A0 làm) thì A1 mới có dữ liệu để render.
- Phải có state transition `DRAFT -> PUBLISHED -> ARCHIVED` ở A0 thì A1 mới biết tin nào để hiển thị.

## 4. Schema & Content Recommendation
- Schema `JobPosting` hiện tại chỉ có `status`, `slug`, `revision`. Cần bổ sung tối thiểu:
  - `title` (Tiêu đề tin)
  - `description` (Nội dung / Yêu cầu)
  - `salaryDisplay` (Lương hiển thị)
  - `benefits`, `requirements` (tuỳ chọn hoặc lưu dưới dạng JSON/text).
- Chuyển quyền quyết định "tin có public hay không" từ `Project.isPublic` sang `JobPosting.status === 'PUBLISHED'`.
- Chuyển `JobPosting` thành the single source of truth cho URL (`slug`) và nội dung public.
- Mở rộng migration (forward-only) cập nhật schema.

## 5. Owner Decisions Còn Mở
| Vấn đề | Tình trạng | Recommendation |
|---|---|---|
| Migration dữ liệu cũ (đang publish qua `Project.isPublic`) | MỞ | Tạo Data Migration chuyển `Project.isPublic=true` thành các `JobPosting(status=PUBLISHED)` hoặc bỏ qua nếu Owner đồng ý reset lại từ đầu (tức là admin tự đăng lại tin mới). Khuyến nghị: Cần T0 chốt hướng xử lý migration dữ liệu. |
| URL slug pattern mới | MỞ | URL cũ đang dùng `Project.code` (PRJ-xxx). Việc định tuyến dựa vào `JobPosting.slug` mới có cần hỗ trợ HTTP 301 cho link cũ? Khuyến nghị: Giữ pattern PRJ-xxx cho JobPosting slug nếu có thể, hoặc hỗ trợ fallback. |

## 6. Đề xuất Implementation Order
- **P1-A0 (Schema, Backend & Admin):** Nên thực thi trước. Xây dựng Schema, Migration, Core Service và Admin UI để có dữ liệu thật (thậm chí là tạo draft).
- **P1-A1 (Public UI):** Có thể chạy song song dựa vào DTO contract đã chốt từ A0, nhưng chỉ integration thật sự được khi A0 đã merge schema.
- Tuyệt đối không cho 2 executor cùng thay đổi `prisma/schema.prisma`. A0 phải giao migration trước.
