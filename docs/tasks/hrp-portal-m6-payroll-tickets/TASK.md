# TASK: hrp-portal-m6-payroll-tickets

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m6-payroll-tickets |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | ACCEPTED |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main |
| Modules | M6-Admin |
| ADR references | None |
| Current execution round | 1 |
| Current audit round | 1 |
| Next gate | None (Closed) |
| Updated | 2026-08-20 14:45 +07:00 |

## 1. Outcome

### User-visible outcome

Hoàn thiện 2 phân hệ Quản trị còn thiếu trong Admin Panel (đã được nhắc đến từ M5):
- **Quản lý Tính lương (Payroll):** Trang /admin/payroll hiển thị danh sách các cấu hình lương (PayrollConfig) để admin có thể quản lý, theo dõi các chu kỳ lương.
- **Quản lý Phản ánh (Tickets):** Trang /admin/tickets hiển thị danh sách các khiếu nại/phản ánh từ người dùng (Ticket), cho phép xem chi tiết, và phân loại trạng thái (PENDING, RESOLVED, ...).

### Non-goals

- Không làm phần tính toán lương thực tế (Payroll computation engine). Chỉ xây dựng giao diện hiển thị cấu hình/danh sách cơ bản.
- Không thay đổi thiết kế layout tổng thể của Admin.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| EV-01 | M5 TASK | 2 phân hệ payroll và tickets được lùi lại cho M6. | Khởi tạo trang /admin/payroll và /admin/tickets. |
| EV-02 | UI Audit | Admin layout đã xây dựng bằng Tailwind CSS + Lucide React. | Sử dụng chung bộ UI library hiện hành. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| DEC-01 | CHOSEN | Áp dụng kiến trúc Server Component kết hợp với Prisma Client để fetch dữ liệu hoặc API routes giống M5. | Planner | Valid |
| DEC-02 | CHOSEN | Sử dụng Prisma Model PayrollConfig cho Payroll và Ticket cho Tickets. | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| RQ-01 | Xây dựng trang /admin/payroll: Đổ dữ liệu từ bảng PayrollConfig. | Must | EV-01 | 404 Not Found. |
| RQ-02 | Xây dựng trang /admin/tickets: Đổ dữ liệu từ bảng Ticket. | Must | EV-01 | 404 Not Found. |
| RQ-03 | Bổ sung 2 mục Payroll và Tickets vào các thẻ (cards) trong trang Control Tower (/admin/page.tsx). | Must | UX | Thiếu liên kết điều hướng. |
| RQ-04 | Pass toàn bộ test suite. Không làm hỏng các module Admin khác. | Must | Baseline | CI fail. |

### 4.2 Scope boundaries

**In scope:**
- pp/api/payroll/route.ts (hoặc server component data fetch)
- pp/api/tickets/route.ts (hoặc server component data fetch)
- pp/admin/payroll/page.tsx
- pp/admin/tickets/page.tsx
- pp/admin/page.tsx (cập nhật SLICE_CARDS)

**Out of scope:**
- Sửa đổi Database schema.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| STEP-01 | RQ-01 | payroll | Tạo UI danh sách cấu hình lương. | N/A | Check /admin/payroll | Code lỗi |
| STEP-02 | RQ-02 | tickets | Tạo UI danh sách phản ánh. | N/A | Check /admin/tickets | Code lỗi |
| STEP-03 | RQ-03 | control tower | Thêm 2 thẻ vào /admin/page.tsx. | N/A | Check /admin | Code lỗi |
| STEP-04 | RQ-04 | Toàn bộ | Chạy vitest và build. | Xong 3 bước trên | Exit 0 | Lỗi test |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| AC-01 | RQ-01..03 | Truy cập UI tải bình thường, hiển thị bảng danh sách data. | Truy cập UI | Chụp ảnh / Code Diff | Yes |
| AC-02 | RQ-04 | vitest báo pass và build thành công. | Chạy lệnh | Exit 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-01 |
| RQ-03 | STEP-03 | AC-01 |
| RQ-04 | STEP-04 | AC-02 |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| RISK-01 | Lỗi dữ liệu liên kết relation khi fetch bảng Ticket. | Build fail / Lỗi logic. | Chỉ lấy các field cơ bản cần hiển thị, tránh include quá nhiều bảng không cần thiết. | - |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| - | - | - | - | - |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| 1 | N/A | ACCEPT | Tier 3 kiểm định PASS (C-01..C-10 đạt). Không có finding lớn. Build xanh. | None | Tier 1 |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| 1.0 | 2026-08-20 | Tạo task hrp-portal-m6-payroll-tickets. | Khởi tạo phân hệ Payroll và Tickets tiếp nối M5. |
| 1.0 | 2026-08-20 | Đóng task thành công (ACCEPTED). | Đạt đầy đủ tiêu chí M6. |
