# TASK: hrp-portal-m7-admin-expansion

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m7-admin-expansion |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main |
| Modules | M7-Admin-CRUD |
| ADR references | None |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-portal-m7-admin-expansion |
| Updated | 2026-08-20 15:45 +07:00 |

## 1. Outcome

### User-visible outcome

Hoàn thiện các chức năng Thêm mới, Chỉnh sửa (CRUD) còn thiếu sót trong Admin Panel, và xây dựng các trang quản trị còn trống:
- **Master Data (Thêm/Sửa):** Bổ sung Modal/Form tạo mới và chỉnh sửa cho các trang /admin/workers, /admin/projects, /admin/clients, /admin/jobs. Cho phép thực hiện luồng Điều chuyển nhân sự (Transfer) tại bảng Workers.
- **Vendors & Users:** Xây dựng mới trang /admin/vendors (Quản lý đối tác) và /admin/users (Quản lý tài khoản hệ thống) với đầy đủ CRUD cơ bản.
- **Settings:** Xây dựng trang /admin/settings tĩnh với giao diện cài đặt cơ bản (hoặc layout placeholder hoàn chỉnh để các team khác đắp logic sau).

### Non-goals
- Không đi sâu vào phân quyền chi tiết (chỉ cần chặn Role Admin ở cấp độ UI routing).
- Không xử lý nghiệp vụ phức tạp của việc tính toán lương hoặc hoa hồng trong task này.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| EV-01 | Khảo sát UI M5/M6 | Thiếu toàn bộ luồng thêm/sửa, chỉ có danh sách Read-only. | Bắt buộc phải bổ sung form nhập liệu để Admin có thể vận hành thực tế. |
| EV-02 | Yêu cầu thực tế | /admin/settings, /admin/vendors báo lỗi 404. | Khởi tạo trang và luồng API tương ứng. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| DEC-01 | CHOSEN | Tái sử dụng các React component Modals / Forms đang có (nếu có) hoặc tự code bằng Tailwind/Lucide. | Planner | Valid |
| DEC-02 | CHOSEN | Các API POST/PUT/DELETE tương ứng sẽ được thêm vào pp/api/... để phục vụ UI. | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| RQ-01 | /admin/projects, /admin/workers, /admin/clients: Bổ sung nút Thêm mới, giao diện Form, và API xử lý dữ liệu. | Must | EV-01 | Không thể vận hành. |
| RQ-02 | Tạo mới 2 trang /admin/vendors và /admin/users có danh sách và form Thêm/Sửa. | Must | EV-02 | 404 Not Found. |
| RQ-03 | Tạo trang /admin/settings cơ bản (UI Layout) theo chuẩn sidebar có sẵn. | Must | EV-02 | 404 Not Found. |
| RQ-04 | Đảm bảo compile sạch, build thành công toàn bộ Next.js. | Must | Codebase | Build Error. |

### 4.2 Scope boundaries

**In scope:**
- pp/admin/workers/* (UI + API)
- pp/admin/projects/* (UI + API)
- pp/admin/clients/* (UI + API)
- pp/admin/vendors/* (Tạo mới hoàn toàn)
- pp/admin/users/* (Tạo mới hoàn toàn)
- pp/admin/settings/* (Tạo mới hoàn toàn)
- src/shared/ui/role-guard/role-guard-layout.tsx (Cập nhật nav nếu cần, ví dụ vendors/users).

**Out of scope:**
- Thay đổi Schema Prisma.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| STEP-01 | RQ-01 | Master Data CRUD | Thêm Form/Modal UI + API cho Workers, Projects, Clients. | UI Tailwind | Kiểm tra truy cập UI | Syntax Error |
| STEP-02 | RQ-02 | Vendors & Users | Khởi tạo /admin/vendors và /admin/users. | UI Tailwind | Kiểm tra UI | Syntax Error |
| STEP-03 | RQ-03 | Settings | Khởi tạo /admin/settings. | UI Tailwind | Kiểm tra UI | Syntax Error |
| STEP-04 | RQ-04 | Audit & Build | Chạy build và test. | Xong 3 bước | Exit 0 | Build Fail |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| AC-01 | RQ-01 | Nút 'Thêm' hoạt động, mở popup/trang nhập liệu. Gửi form thành công mà không sập. | Truy cập UI (npm run dev) | Code Diff | Yes |
| AC-02 | RQ-02..03 | Các route /admin/vendors, /admin/users, /admin/settings hết báo lỗi 404, giao diện nhất quán. | Truy cập UI | Code Diff | Yes |
| AC-03 | RQ-04 | 
pm run build thành công | CI / CLI | Exit 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-02 |
| RQ-03 | STEP-03 | AC-02 |
| RQ-04 | STEP-04 | AC-03 |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| RISK-01 | Form quá phức tạp mất thời gian. | Cần nhiều field theo DB. | Chỉ require các field thực sự cơ bản, các trường phụ có thể làm đơn giản. | - |

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
| 1.0 | 2026-08-20 | Tạo task hrp-portal-m7-admin-expansion. | Bổ sung phần CRUD bị thiếu và các module chưa làm. |
