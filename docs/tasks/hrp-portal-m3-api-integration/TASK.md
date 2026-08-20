# TASK: hrp-portal-m3-api-integration

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m3-api-integration |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main (Sau khi M2.5 ACCEPTED) |
| Modules | M3-Portal-API |
| ADR references | None |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-portal-m3-api-integration |
| Updated | 2026-08-20 11:08 +07:00 |

## 1. Outcome

### User-visible outcome

- **Trang chủ tìm việc (pp/(portal)/page.tsx)**: Hiển thị danh sách việc làm thực tế lấy từ API backend (/api/jobs). Chức năng tìm kiếm và lọc (filter) hoạt động và gọi API tương ứng.
- **Auth Portal / CTV**: Các nút "Đăng nhập", "Đăng ký" trên GlobalNavbar và trang CTV Portal (/ctv-portal) được tích hợp luồng Authentication thật (gọi /api/auth/login hoặc chuyển hướng đúng trang Auth của hệ thống). Trạng thái đăng nhập (đã login hay chưa) được phản ánh đúng trên Navbar (ví dụ: hiển thị Avatar thay vì nút Đăng nhập).

### Non-goals

- Không xây dựng mới Backend API (chỉ gọi các API đã có sẵn trong pp/api/jobs và pp/api/auth). Nếu thiếu field, tạm thời map tương đối, không sửa db schema.
- Không đụng vào logic bên trong các trang Dashboard nội bộ.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| EV-01 | Yêu cầu M3 | "Tích hợp API thật cho Job Search / Auth Portal" | Định hình scope chính của task là frontend fetching & state integration. |
| EV-02 | pp/api/jobs & pp/api/auth | Đã có sẵn cấu trúc thư mục API. | Frontend sẽ fetch từ các endpoint này thay vì mock data. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| DEC-01 | CHOSEN | Dùng Client Component (useState, useEffect) hoặc Server Component (etch trực tiếp) cho trang Job Dashboard tuỳ thuộc vào việc có cần tương tác filter real-time hay không. Khuyến nghị dùng Server Component bọc Client filter để tối ưu SEO. | Planner | Valid |
| DEC-02 | ASSUMPTION | API /api/jobs trả về JSON danh sách jobs theo định dạng cơ bản (có tiêu đề, lương, địa điểm...). Mọi maping UI sẽ do frontend xử lý. | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| RQ-01 | Tích hợp fetch API /api/jobs vào trang pp/(portal)/page.tsx. Thay thế dữ liệu tĩnh bằng dữ liệu động. Lọc (Search/Location) phải hoạt động bằng cách truyền query params xuống API. | Must | Sếp giao | Trang trống hoặc báo lỗi undefined. |
| RQ-02 | Tích hợp luồng Authentication cho Public Portal. Nút Đăng nhập/Đăng ký chuyển hướng hoặc gọi đúng endpoint. Global Navbar hiển thị đúng trạng thái user (nếu đã có cookie session). | Must | Sếp giao | Ấn login không chạy, hoặc F5 bị văng. |
| RQ-03 | Pass toàn bộ test suite. (Có thể phải cập nhật mock API trong file test nếu cần). | Must | Baseline | CI fail. |

### 4.2 Scope boundaries

**In scope:**
- pp/(portal)/page.tsx (Logic fetch jobs)
- pp/components/GlobalNavbar.tsx (Auth state, login/logout actions)
- pp/(portal)/ctv-portal/page.tsx (Cập nhật link đăng nhập/đăng ký nếu cần)

**Out of scope:**
- Viết mới backend controllers. 
- Sửa đổi Database schema.

### 4.3 Data, State, Permission và Interface Rules

- **State:** Auth state quản lý qua React Context hoặc Server Actions tuỳ kiến trúc hiện hành.
- **Error Handling:** Khi API /api/jobs lỗi hoặc đang loading, phải hiển thị Skeleton hoặc thông báo lỗi thân thiện (Không được crash trắng trang).

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| STEP-01 | RQ-01 | pp/(portal)/page.tsx | Đổi sang dùng fetch/SWR/React Query để gọi API /api/jobs. Cập nhật giao diện để render danh sách động, tích hợp logic thanh tìm kiếm (truyền param ?q=...&location=...). | N/A | Truy cập /, thấy data khác mock | Crash UI. |
| STEP-02 | RQ-02 | pp/components/GlobalNavbar.tsx | Check Auth Session. Nếu user đã đăng nhập, đổi nút Login thành Avatar/Dropdown. Nếu chưa, dẫn link tới /login hoặc form login. | N/A | Test login flow | Lỗi vòng lặp redirect. |
| STEP-03 | RQ-03 | Toàn bộ | Chạy unit tests. Cập nhật test cũ nếu API trả về cấu trúc khác. | STEP-01, 02 | 
px vitest run | Test đỏ. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| AC-01 | RQ-01 | UI Job Dashboard hiển thị data từ API (có thể kiểm tra Network tab). Filter làm thay đổi danh sách. | Đọc code / Test UI | Screenshot / Network log | Yes |
| AC-02 | RQ-02 | Auth flow hoạt động. Navbar thay đổi UI theo trạng thái login. | Đọc code / Test flow | Screenshot | Yes |
| AC-03 | RQ-03 | itest báo pass toàn bộ. | Chạy command | Output exit 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-02 |
| RQ-03 | STEP-03 | AC-03 |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| RISK-01 | API trả về schema khác với props của JobCard hiện tại. | Lỗi undefined is not an object trên giao diện. | Thêm Data mapper/Adapter layer ở Client để chuyển đổi format. | Xóa logic fetch, quay về mock data tạm. |

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
| 1.0 | 2026-08-20 | Tạo task hrp-portal-m3-api-integration. | Bắt đầu M3 (Job Search API / Auth Portal). |
