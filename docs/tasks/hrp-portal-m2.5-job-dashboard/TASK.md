# TASK: hrp-portal-m2.5-job-dashboard

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m2.5-job-dashboard |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main |
| Modules | M2-Landing-Page |
| ADR references | None |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-portal-m2.5-job-dashboard |
| Updated | 2026-08-20 09:50 +07:00 |

## 1. Outcome

### User-visible outcome

- Khách truy cập vào tên miền chính (route /) sẽ thấy giao diện Bảng công việc (Job Dashboard / Job Market) thay vì lỗi 404 hoặc trang trống.
- Giao diện được xây dựng hoàn toàn dựa trên thiết kế stitch/hrp_balanced_4_card_dashboard/code.html.
- Các tab lọc (Tất cả, Bán thời gian, Thực tập...), thanh tìm kiếm, và danh sách thẻ công việc hiển thị đúng CSS/Responsive.

### Non-goals

- Không cần gọi API thực (vẫn có thể dùng dummy data).
- Không can thiệp vào pp/(portal)/home/page.tsx (có thể sẽ xóa sau nếu thừa, nhưng trong task này tập trung vào pp/(portal)/page.tsx).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| EV-01 | Yêu cầu của Sếp | Trang chủ tìm việc phải là thiết kế hrp_balanced_4_card_dashboard. | Cần tạo mới route / cho đúng thiết kế được giao. |
| EV-02 | stitch/hrp_balanced_4_card_dashboard/code.html | Chứa giao diện Dashboard/Job Market chuẩn với Layout 4 card. | Dùng làm source chuyển đổi sang React Component. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| DEC-01 | CHOSEN | Sẽ tạo file pp/(portal)/page.tsx để hứng route root (/), kế thừa GlobalNavbar và GlobalFooter từ layout hiện hành. | Planner | Valid |
| DEC-02 | CHOSEN | Do bản thiết kế code.html có chứa sẵn một phần Header (navbar) riêng, Tier 2 cần bóc tách cẩn thận chỉ lấy phần thân nội dung (Main Content: Thanh tìm kiếm, Bộ lọc, Danh sách Job, Phân trang) để nhúng vào trang, KHÔNG ghi đè GlobalNavbar của hệ thống. | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| RQ-01 | Tạo trang pp/(portal)/page.tsx làm trang chủ, phục vụ giao diện tìm việc chính. | Must | EV-01 | Lỗi 404 khi vào root URL. |
| RQ-02 | Chuyển đổi mã HTML/Tailwind từ stitch/hrp_balanced_4_card_dashboard/code.html (chỉ lấy phần nội dung chính, bỏ header/footer) vào page.tsx. Đảm bảo Responsive. | Must | EV-02 | Giao diện không khớp / vỡ layout. |
| RQ-03 | Không làm vỡ các bài test Vitest (cập nhật test nếu route mới ảnh hưởng). | Must | Baseline | Build pipeline thất bại. |

### 4.2 Scope boundaries

**In scope:**
- pp/(portal)/page.tsx
- Các React component con (Search bar, Job card, Pagination) dùng cho trang này (VD: pp/components/JobCard.tsx).

**Out of scope:**
- Xóa/sửa pp/(portal)/home/page.tsx (tạm giữ nguyên, xử lý sau).
- Gọi API Backend thực tế.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Dùng mock data array trực tiếp trong component hoặc file ts.
- **Interface:** Các component nên tách nhỏ để dễ bảo trì.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| STEP-01 | RQ-01 | pp/(portal)/page.tsx | Khởi tạo trang root với React Server Component cơ bản. | N/A | Truy cập localhost:3000/ không 404 | Crash. |
| STEP-02 | RQ-02 | pp/(portal)/page.tsx | Bóc tách HTML hrp_balanced_4_card_dashboard, render UI danh sách việc làm. Loại bỏ Navbar/Footer cứng trong HTML mẫu vì đã có Layout lo. | STEP-01 | Giao diện hiển thị đúng | Vỡ layout. |
| STEP-03 | RQ-03 | Toàn bộ dự án | Chạy test xác nhận xanh. Cập nhật HANDOFF.md. | STEP-02 | 
px vitest run exit 0 | Test đỏ. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| AC-01 | RQ-01, RQ-02 | Truy cập / (root) hiển thị giao diện Job Dashboard với lưới việc làm 4 cột trên Desktop. | Mở UI thủ công. | Screenshot / npm run build pass. | Yes |
| AC-02 | RQ-03 | itest pass toàn bộ. | Chạy lệnh test. | Output (PASS). | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-01 |
| RQ-03 | STEP-03 | AC-02 |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| RISK-01 | HTML mẫu dùng config Tailwind cũ hoặc custom plugin. | Giao diện không ra đúng màu / spacing. | Sửa class thủ công sang chuẩn v4 của dự án. | N/A |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| - | - | - | - | - |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| - | - | - | - | - | - |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| 1.0 | 2026-08-20 | Tạo task hrp-portal-m2.5-job-dashboard. | Sếp đính chính thiết kế cho trang chủ tìm việc. |
