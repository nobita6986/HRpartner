# TASK — `t1c-pre-p2-menu-labor-order-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `t1c-pre-p2-menu-labor-order-hotfix` (HOTFIX UI/COPY: `Hồ sơ ứng viên → Người lao động`) |
| Spec version | `v1.0` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` (UI + copy + tests) |
| Build vs adopt | N/A (no new dep) |
| Build vs automate | N/A |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | T0 directive: hotfix UI/copy trước P2; KHÔNG triển khai nghiệp vụ tạo Worker. Risk-accept: Tier 0. |
| Baseline | `7f5704123cbe0ae52c897b38c8afdd3f14358c78` (`origin/main` @ PR #115 merge) |
| Branch | `codex/t1c-pre-p2-menu-labor-order-hotfix` |
| Worktree | `C:\CodeApp\HrP-t1c-pre-p2-menu-labor-order-hotfix` |
| Status | `READY_TO_CODE` (r1) |
| Decision state | `CLOSED` (T0 directive chốt scope) |
| Test environment | `READY` |
| Correction budget | `0` |
| In-scope roots | `app/admin/labor-profiles/**`, `src/shared/ui/role-guard/role-guard-layout.tsx`, **+1 static test file mới** `admin-nav-phase4-menu-labor-order.static.test.ts`, **update 4 static test files** (terminology/separation/list-table/role-guard-layout) |
| Forbidden paths | `prisma/`, `src/shared/auth/`, `app/api/auth/`, `middleware.ts`, `app/admin/workers/**` (PR #115 surface), `app/api/workers/**`, `src/domains/applications/conversion*`, `src/domains/talent/placement*`, `src/domains/talent/placement-case*`, `src/domains/talent/labor-profile.read-service.ts` (chỉ read), `app/api/admin/labor-profiles/**` (chỉ route, không sửa API contract) |
| Required gates | targeted tests (role-guard + T1C static), full unit, typecheck, lint, build, prisma validate, verify-encoding, git diff --check |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/deliver → /resolve` (PR opened, CI 4/4 GREEN, stop before merge) |

## 1. Outcome

### 1.1 User-visible outcome

- **Sidebar** `/admin/...` (admin portal): nhóm quản lý lao động hiển thị đúng thứ tự `Hồ sơ ứng viên → Người lao động`; header section đổi từ `NGƯỜI LAO ĐỘNG` → `QUẢN LÝ LAO ĐỘNG`. Roles, href, icon, active-nav behavior giữ nguyên.
- **`/admin/labor-profiles`** (list): `<h1>` + `metadata.title` = `Hồ sơ ứng viên`; subhead + empty state cũng chuẩn hoá; CTA `+ Tiếp nhận hồ sơ`.
- **`/admin/labor-profiles/[id]`** (detail): breadcrumb `Hồ sơ ứng viên`; banner linked read-only copy = `Hồ sơ này đã được liên kết với người lao động`; nút disabled `Chuyển thành người lao động` bị xoá, thay bằng ghi chú static `Người lao động được tạo hoặc liên kết khi hoàn tất quy trình tuyển dụng phù hợp.`
- **Form sửa** (`labor-profile-edit-form.tsx`): thông báo lỗi dùng `Hồ sơ ứng viên` thay vì `Hồ sơ tiếp nhận`.

### 1.2 Non-goals (boundary)

- **KHÔNG** triển khai `LaborProfile → Worker` conversion. **KHÔNG** mở API mới. **KHÔNG** nối nút sang conversion hiện có.
- **KHÔNG** schema/migration. **KHÔNG** auth/RLS/permission change. **KHÔNG** thay đổi dữ liệu production.
- **KHÔNG** sửa Worker CRUD / DELETE flow của PR #115 ngoài forward-merge baseline.
- **KHÔNG** sửa `convertApplication`, Placement, PlacementCase, `linkLaborProfileWorker`, state machine.
- **KHÔNG** rebase / amend / force-push. **KHÔNG** merge hoặc deploy.

## 2. Business boundary (ghi quyết định, không mở task mới)

| ID | Decision | Source |
|---|---|---|
| `DEC-01` | Worker creation thuộc task nghiệp vụ P1-F completion/correction (mở task riêng sau pre-P2) | T0 directive §4 |
| `DEC-02` | Chỉ tạo / liên kết Worker theo outcome được phê duyệt, đặc biệt `HRP_MANAGED` | T0 directive §4 |
| `DEC-03` | `CLIENT_MANAGED` KHÔNG tự động tạo Worker | T0 directive §4 |
| `DEC-04` | `LaborProfile` là định danh con người lâu dài, KHÔNG bị Worker thay thế | T0 directive §4 |
| `DEC-05` | KHÔNG mở task P1-F trong vòng này | T0 directive §4 |
| `DEC-06` | Bounded copy sweep: 8 surface canonical — sidebar / list-title / breadcrumb / detail-title / form-msg / empty-state / CTA / banner | T0 directive §2 |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-07` | Sidebar entry: `Hồ sơ tiếp nhận` (label) → `Hồ sơ ứng viên` | `CHOSEN` |
| `DEC-08` | Sidebar entry: `Hồ sơ ứng viên` (people-group) đặt TRƯỚC `Người lao động` (cũ: AFTER) | `CHOSEN` |
| `DEC-09` | Section header `NGƯỜI LAO ĐỘNG` → `QUẢN LÝ LAO ĐỘNG` | `CHOSEN` |
| `DEC-10` | List page `<h1>` + metadata.title = `Hồ sơ ứng viên` (shorter — directive "Có thể dùng: Trang danh sách: Hồ sơ ứng viên") | `CHOSEN` |
| `DEC-11` | List page CTA = `+ Tiếp nhận hồ sơ` (cũ: `+ Tiếp nhận người lao động`) | `CHOSEN` |
| `DEC-12` | Empty state = `Chưa có hồ sơ ứng viên nào.` (cũ: `Chưa có hồ sơ tiếp nhận người lao động nào.`) | `CHOSEN` |
| `DEC-13` | Detail page breadcrumb first item label = `Hồ sơ ứng viên` | `CHOSEN` |
| `DEC-14` | Detail page metadata.title = `Chi tiết hồ sơ ứng viên - Quản trị` (cũ: `Chi tiết hồ sơ tiếp nhận - Quản trị`) | `CHOSEN` |
| `DEC-15` | Banner linked copy = `Hồ sơ này đã được liên kết với người lao động` (directive) | `CHOSEN` |
| `DEC-16` | Xoá `<button disabled>Chuyển thành người lao động</button>` + `title="Tính năng đang được phát triển"`; thay bằng `<p>` static note | `CHOSEN` |
| `DEC-17` | Static note copy = `Người lao lao động được tạo hoặc liên kết khi hoàn tất quy trình tuyển dụng phù hợp.` (directive verbatim) | `CHOSEN` |
| `DEC-18` | Form error copy: `Hồ sơ tiếp nhận` → `Hồ sơ ứng viên` (2 chỗ) | `CHOSEN` |
| `DEC-19` | Roles: `['ADMIN', 'HR_STAFF', 'HR_MANAGER']` GIỮ NGUYÊN cho cả `Hồ sơ ứng viên` lẫn `Người lao động` | `CHOSEN` (mirror ALLOWED_ROLES trong page) |
| `DEC-20` | active-nav-helper: logic GIỮ NGUYÊN; chỉ labels + order đổi — re-run PR #112 contracts | `CHOSEN` |
| `DEC-21` | New test file `admin-nav-phase4-menu-labor-order.static.test.ts` chốt thứ tự menu + section label + 8-surface bounded copy | `CHOSEN` |
| `DEC-22` | KHÔNG sửa `app/admin/workers/**`, `app/api/workers/**`, `convertApplication`, Placement, PlacementCase, `linkLaborProfileWorker` | `CHOSEN` |
| `DEC-23` | Lane FAST + Audit NONE + V2_FAST_FREEZE (T0 directive) | `CHOSEN` |
| `DEC-24` | Correction budget: 0. Nếu phát hiện phải chạm business flow ⇒ dừng, báo T0 | `CHOSEN` |

### 3.1 Build vs Adopt

N/A — không thêm library mới. Reuse các dictionary (`roleLabel`, `formLabel`), `getMostSpecificActiveHref` (PR #112), `RowLink` (existing).

## 4. Contract

- **URL**: `/admin/labor-profiles` + `/admin/workers` + `/admin/labor-profiles/[id]` GIỮ NGUYÊN. KHÔNG thêm route mới. KHÔNG đổi role matrix.
- **Sidebar**:
  - Entry 1: `{ href: '/admin/labor-profiles', label: 'Hồ sơ ứng viên', icon: UserRoundCheck, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER'], section: 'people' }`
  - Entry 2: `{ href: '/admin/workers', label: 'Người lao động', icon: Users, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER'], section: 'people' }`
  - Group header text: `QUẢN LÝ LAO ĐỘNG`.
- **Bounded copy sweep — 8 surface canonical**:
  1. **Sidebar label**: `Hồ sơ ứng viên`.
  2. **List page title** (`<h1>`): `Hồ sơ ứng viên`.
  3. **List page metadata.title**: `Hồ sơ ứng viên - Quản trị`.
  4. **List page subhead**: `Quản lý hồ sơ ứng viên, nhận diện và đối chiếu trùng lặp.`
  5. **List page empty state**: `Chưa có hồ sơ ứng viên nào.`
  6. **List page CTA**: `+ Tiếp nhận hồ sơ`.
  7. **Detail page breadcrumb first item**: `Hồ sơ ứng viên`.
  8. **Detail page metadata.title**: `Chi tiết hồ sơ ứng viên - Quản trị`.
  9. **Detail page banner body**: `Hồ sơ này đã được liên kết với người lao động.` (giữ `<p>Đã chuyển thành người lao động</p>` heading — đúng nghiệp vụ khi profile đã linked).
  10. **Form error (2 chỗ)**: `Hồ sơ ứng viên` thay cho `Hồ sơ tiếp nhận`.
- **Anti-regression** (KHÔNG xuất hiện operator-facing):
  - Chuỗi `Hồ sơ tiếp nhận` trên bất kỳ surface nào trong `/admin/labor-profiles/**`.
  - Nút disabled `Chuyển thành người lao động` + `title="Tính năng đang được phát triển"`.
  - Section label `NGƯỜI LAO ĐỘNG` trong sidebar (đã đổi thành `QUẢN LÝ LAO ĐỘNG`).

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/shared/ui/role-guard/role-guard-layout.tsx` | Reorder 2 entries (labor-profiles trước workers); đổi label `Hồ sơ tiếp nhận` → `Hồ sơ ứng viên`; đổi group header `NGƯỜI LAO ĐỘNG` → `QUẢN LÝ LAO ĐỘNG` | typecheck + targeted test | Bất kỳ lỗi |
| `STEP-02` | `app/admin/labor-profiles/page.tsx` | Đổi `<h1>` + metadata.title + subhead + empty state + CTA theo contract §4; giữ nguyên filter chips, table HTML, RowLink contract | typecheck + 2 static test | Bất kỳ lỗi |
| `STEP-03` | `app/admin/labor-profiles/[id]/page.tsx` | Đổi breadcrumb first item; metadata.title; banner body; **xoá** nút disabled `Chuyển thành người lao động` + title; thêm static note | typecheck + 2 static test | Bất kỳ lỗi |
| `STEP-04` | `app/admin/labor-profiles/[id]/labor-profile-edit-form.tsx` | Đổi 2 chỗ `Hồ sơ tiếp nhận` → `Hồ sơ ứng viên` (CAN_VIEW_WORKER_SENSITIVE banner) | typecheck + static test | Bất kỳ lỗi |
| `STEP-05` | Update 4 existing static tests cho khớp copy mới: `labor-profiles-terminology.static.test.ts`, `labor-profiles-separation.static.test.ts`, `labor-profiles-list-table.static.test.ts`, `role-guard-layout.test.ts`, `admin-nav-phase4-people-section.static.test.ts` | Test reflect contract mới | `pnpm test:unit` (targeted) | Bất kỳ test fail |
| `STEP-06` | New `admin-nav-phase4-menu-labor-order.static.test.ts` | Chốt: thứ tự menu (labor-profiles trước workers), section label `QUẢN LÝ LAO ĐỘNG`, 8-surface sweep không còn `Hồ sơ tiếp nhận` operator-facing, nút `Chuyển thành người lao động` KHÔNG còn | `pnpm test:unit` (targeted) | Bất kỳ test fail |
| `STEP-07` | `git status` review forbidden paths (prisma / auth / api-workers / conversion / placement / labor-profile.read-service) | Đảm bảo 0 thay đổi ngoài scope | shell diff | Bất kỳ thay đổi ngoài scope |
| `STEP-08` | Full gates: targeted / full unit / typecheck / lint / build / prisma validate / verify-encoding / `git diff --check` | Tất cả pass | E-01..E-05 | Bất kỳ lệnh fail |
| `STEP-09` | Commit + push + mở PR + chờ CI 4/4 GREEN + dừng trước merge | PR URL reported | `gh run list` | CI fail hoặc conflict |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification |
|---|---|---|
| `AC-01` | Sidebar hiển thị đúng thứ tự: `Hồ sơ ứng viên` (1) → `Người lao động` (2) | E-01 (new static) + E-02 (active-nav-helper) |
| `AC-02` | Section header = `QUẢN LÝ LAO ĐỘNG` (không còn `NGƯỜI LAO ĐỘNG`) | E-01 |
| `AC-03` | List page `<h1>` + metadata.title = `Hồ sơ ứng viên` | E-03 (terminology) + E-04 (list-table) |
| `AC-04` | List page CTA = `+ Tiếp nhận hồ sơ` | E-03 + E-04 |
| `AC-05` | List page empty state = `Chưa có hồ sơ ứng viên nào.` | E-03 |
| `AC-06` | Detail page breadcrumb first item = `Hồ sơ ứng viên` | E-05 (separation) |
| `AC-07` | Detail page metadata.title = `Chi tiết hồ sơ ứng viên - Quản trị` | E-05 |
| `AC-08` | Banner body = `Hồ sơ này đã được liên kết với người lao động.` | E-05 |
| `AC-09` | KHÔNG còn `<button ... Chuyển thành người lao động ...title="Tính năng đang được phát triển">` | E-01 + E-05 |
| `AC-10` | KHÔNG còn chuỗi operator-facing `Hồ sơ tiếp nhận` trong `/admin/labor-profiles/**` (sidebar / page / form / breadcrumb) | E-01 (broad sweep regex) |
| `AC-11` | Form error copy dùng `Hồ sơ ứng viên` | E-06 (separation) |
| `AC-12` | Roles `['ADMIN', 'HR_STAFF', 'HR_MANAGER']` mirror trên cả 2 entry; icon `UserRoundCheck` cho `Hồ sơ ứng viên`, `Users` cho `Người lao động` | E-01 + E-02 |
| `AC-13` | Active-nav: `/admin/labor-profiles/**` chỉ active `Hồ sơ ứng viên`; `/admin/workers/**` chỉ active `Người lao động`; MỖI ROUTE chỉ 1 sidebar item active | E-02 (PR #112 contract) + new test |
| `AC-14` | URL `/admin/labor-profiles`, `/admin/workers`, `/admin/labor-profiles/new` KHÔNG đổi | E-01 (route string check) |
| `AC-15` | Forward-only: 0 rebase / 0 amend / 0 force-push | git log |
| `AC-16` | Full gates pass; CI 4/4 GREEN; dừng trước merge | E-07..E-11 |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` (1. Menu re-order) | `STEP-01` | `AC-01`, `AC-02`, `AC-12` |
| `RQ-02` (2. Terminology sweep) | `STEP-02`, `STEP-03`, `STEP-04` | `AC-03..AC-11` |
| `RQ-03` (3. Remove fake button) | `STEP-03` | `AC-09` |
| `RQ-04` (4. Business boundary) | (DEC-01..06) | `AC-14` (URL/role) |
| `RQ-05` (5. Anti-regression) | `STEP-05`, `STEP-06` | `AC-10`, `AC-12`, `AC-13` |
| `RQ-06` (6. UTF-8 no-BOM) | `STEP-08` (verify-encoding) | `AC-16` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Existing static test (`admin-nav-phase4-people-section.static.test.ts`, `labor-profiles-terminology.static.test.ts`, etc.) assert `Hồ sơ tiếp nhận` — break nếu không update đồng thời với code | `STEP-05` chạy trước gates; nếu fail ⇒ update test cho khớp contract mới |
| `RISK-02` | Sidebar reorder có thể break `getMostSpecificActiveHref` nếu regex parse entries theo vị trí | Active-nav-helper chỉ dùng `href` + pathname, không dùng index; PR #112 contracts đã cover. Re-run targeted test |
| `RISK-03` | `Quản lý lao động` (UPPERCASE tracking) phải khớp với các section header khác (`NHU CẦU & TUYỂN`, `ĐỐI TÁC`, `TÀI CHÍNH`, `HỆ THỐNG`) — không trộn case | Visual style giữ nguyên; chỉ đổi text content |
| `RISK-04` | `worker-delete-vi-hotfix` (PR #115) vừa merge — `app/admin/workers/**` đang ở trạng thái merged mới; không được sửa | `git diff --name-only` chốt diff scope; `STEP-07` audit |
| `RISK-05` | Nếu user click `[id]/page.tsx` direct URL sau khi xoá nút `Chuyển thành người lao động` mà state machine cũ vẫn pending — không có cơ chế retry ở UI | Workflow: User đã link Worker thì route sang `/admin/workers`; chưa link thì đợi outcome duyệt (HRP_MANAGED). Document trong static note; không tạo API mới |

## 8. Open Questions

- None. T0 directive đã chốt mọi quyết sách.

## 9. Planner Resolution

Tier 1 self-review. Audit NONE resolve trực tiếp từ HANDOFF. Nếu phát hiện cần chạm business flow ngoài §1.1 ⇒ dừng, báo T0, không mở rộng scope.

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-06 | Initial contract | T0 directive 2026-10-06 PRE-P2 HOTFIX: HỒ SƠ ỨNG VIÊN → NGƯỜI LAO ĐỘNG |
