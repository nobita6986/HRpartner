# TASK: hrp-portal-m2-landing-page

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m2-landing-page |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | READY_FOR_AUDIT |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main (sau khi M1 ACCEPTED) |
| Modules | M2-Landing-Page |
| ADR references | None |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-portal-m2-landing-page |
| Updated | 2026-08-20 09:18 +07:00 |

## 1. Outcome

### User-visible outcome

- Trang chủ (Landing Page - pp/(portal)/home/page.tsx): Hoàn thiện UI responsive, Job Search functionality (ít nhất về mặt giao diện/form logic) và cấu trúc chuẩn.
- Trang giới thiệu Cộng tác viên (CTV Portal Landing - pp/(portal)/ctv/page.tsx): Triển khai đầy đủ thiết kế từ thư mục stitch/hrp_collaborator_page_html_standard bao gồm phần Hero Section (Giới thiệu thành viên, nhận tiền ngay) và Process Section (5 bước đơn giản).

### Non-goals

- Không xây dựng Logic Backend/API sâu cho Job Search trong task này nếu phụ thuộc hệ thống ngoài (nếu có, chỉ gọi API placeholder hoặc dummy data).
- Không sửa đổi hay xóa hệ thống layout M1 (GlobalNavbar, GlobalFooter).
- Không động vào trang Dashboard nội bộ của CTV (pp/ctv/page.tsx cũ).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| EV-01 | stitch/hrp_collaborator_page_html_standard/code.html | Chứa thiết kế HTML/Tailwind CSS chuẩn cho trang CTV. | Làm cơ sở triển khai component cho pp/(portal)/ctv/page.tsx. |
| EV-02 | pp/(portal)/home/page.tsx | Đã có một số section (Hero, Services, Why HRP) từ M1 nhưng chưa trau chuốt nội dung/form (Job Search). | Cần rà soát code và tinh chỉnh lại responsive, chức năng Search. |
| EV-03 | docs/roadmap-portals.html | M2 là "Job Market / Landing Page". | Định hướng task. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| DEC-01 | CHOSEN | Tái sử dụng triệt để mã màu/theme v4 từ M1 (globals.css) cho trang CTV, không chép đè hay định nghĩa lại CSS variable trong file. | Planner | Valid |
| DEC-02 | CHOSEN | Chuyển đổi mã HTML/Tailwind từ code.html của trang CTV thành React Components với className chuẩn xác, đảm bảo tương thích Next.js App Router. | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| RQ-01 | Triển khai giao diện trang CTV từ bản thiết kế stitch/hrp_collaborator_page_html_standard/code.html vào pp/(portal)/ctv/page.tsx. Bao gồm Hero Section & Process Section. Tương thích thiết bị di động (Responsive). | Must | Sếp giao | Trang bị vỡ layout. |
| RQ-02 | Refactor / Hoàn thiện pp/(portal)/home/page.tsx: Cải thiện UI/UX của form Job Search và Responsive polish các section. Đảm bảo form hoạt động về mặt UI. | Must | M1 Preview | Trải nghiệm người dùng kém. |
| RQ-03 | Kiểm tra và đảm bảo không làm hỏng tính năng Auth hoặc Test Suite hiện tại. Test phải xanh 100%. | Must | Baseline | Build fail / Lỗi logic cũ. |

### 4.2 Scope boundaries

**In scope:**
- pp/(portal)/ctv/page.tsx
- pp/(portal)/home/page.tsx
- Các component con nếu cần tách ra (ví dụ: pp/components/CvtHeroSection.tsx).

**Out of scope:**
- API / Backend sâu cho tính năng Search.
- Thay đổi GlobalNavbar và GlobalFooter.

### 4.3 Data, State, Permission và Interface Rules

- **Interface:** Cấu trúc Component React phải clean, không chứa logic business phức tạp (chỉ UI). 
- **Data/Image:** Sử dụng thẻ Image component của NextJS (nếu có ảnh), hoặc thẻ HTML/SVG cơ bản.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| STEP-01 | RQ-01 | pp/(portal)/ctv/page.tsx | Chuyển đổi HTML trang giới thiệu CTV thành code React (JSX) tương thích với Tailwind v4 của dự án. Loại bỏ các phần head/body HTML dư thừa (vì đã có Layout bọc ngoài). | N/A | 
pm run build không lỗi. | Syntax JSX lỗi. |
| STEP-02 | RQ-02 | pp/(portal)/home/page.tsx | Tinh chỉnh Responsive cho form tìm kiếm và các mục Services, Contact. Đảm bảo UI khớp thiết kế và hoạt động mượt trên Mobile. | N/A | 
pm run build không lỗi. | Giao diện vỡ trên màn hình nhỏ. |
| STEP-03 | RQ-03 | Toàn bộ dự án | Chạy test đảm bảo không hồi quy (regression) các test cũ. Cập nhật HANDOFF.md. | STEP-01, 02 | 
px vitest run | Test đỏ. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| AC-01 | RQ-01 | Trang /ctv hiển thị đúng giao diện Hero và 5 bước đăng ký. | Kiểm tra mã nguồn. | Screenshot / Command exit 0. | Yes |
| AC-02 | RQ-02 | Trang chủ /home hiển thị form Search đẹp mắt, Responsive chuẩn. | Kiểm tra mã nguồn. | Screenshot / Command exit 0. | Yes |
| AC-03 | RQ-03 | Tất cả test đều PASS (Exit 0) và Build thành công. | 
px vitest run | Output màn hình (PASS). | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-02 |
| RQ-03 | STEP-03 | AC-03 |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| RISK-01 | Xung đột style Tailwind | Giao diện không giống thiết kế | Tái sử dụng triệt để token của v4 | Chỉnh sửa class thủ công. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| Q-01 | Dữ liệu mẫu (dummy data) cho việc làm sẽ lấy từ đâu? | N/A | N/A | No |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| - | - | - | - | - | - |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| 1.0 | 2026-08-20 | Khởi tạo hợp đồng M2. | Yêu cầu thiết kế Landing Page và CTV. |
