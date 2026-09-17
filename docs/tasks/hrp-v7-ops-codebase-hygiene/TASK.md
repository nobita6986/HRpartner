# TASK — hrp-v7-ops-codebase-hygiene

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v7-ops-codebase-hygiene` |
| Work type | `CODE` |
| Assurance lane | `FAST` |
| Audit mode | `LIGHT` |
| Audit reason | `Xử lý 10 ESLint warnings tại 3 file UI và chuẩn hóa .gitignore; cần Tier 3 đối chiếu để đảm bảo không làm thay đổi hành vi người dùng hay xóa nhầm file bảo tồn` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `3442370f0bc6fd78e275b76d36617fd909752a7a` |
| In-scope roots | `app/admin/attendance/page.tsx, app/(portal)/page.tsx, app/(jobs)/viec-lam/page.tsx, .gitignore` |
| Forbidden paths | `src/domains/**, src/shared/**, prisma/**, .ai-pipeline/**, t0_script.ps1, t0_correction.ps1, worktree_link/**, docs/V8/**, docs/V7/**` |
| Required gates | `npm run lint, npm run typecheck` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/deliver -> /audit -> /resolve` |

---

## 1. Outcome

### 1.1 User-visible outcome
- Xóa sạch 10 cảnh báo ESLint tích tụ trong log của Quality CI job:
  1. `app/admin/attendance/page.tsx`: thay thế `any` bằng kiểu type cụ thể hoặc `unknown`.
  2. `app/(portal)/page.tsx`: xóa bỏ các import và biến không dùng (`featuredJobs`, `featuredSource`, `appliedIds`, `setShift`, `Link`, `useId`) và gán `const` cho biến `cancelled`.
  3. `app/(jobs)/viec-lam/page.tsx`: loại bỏ import `getHomepageSettings` không dùng, gán `const` cho `numbers`.
- Bổ sung quy tắc ignore `*.tsbuildinfo` và `*.log` vào `.gitignore` để ngăn ngừa artifact sinh rác vào git index.
- Lệnh `npm run lint` và `npm run typecheck` chạy qua sạch sẽ với 0 errors và 0 warnings tại các in-scope files.

### 1.2 Non-goals
- KHÔNG thay đổi layout, màu sắc, token, CSS hay bất kỳ hành vi UX/UI nào.
- KHÔNG can thiệp vào logic domain, database schema, server actions hay API routes.
- KHÔNG di chuyển, đổi tên hay xóa bất kỳ file script nào ở root khi chưa có inventory đo lường được T0 phê duyệt riêng.
- KHÔNG đụng chạm các file runtime được bảo tồn: `t0_script.ps1`, `t0_correction.ps1`, `.ai-pipeline/**`, `worktree_link/**`.

---

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | GitHub Actions Quality job log (Run `35232461287`, Job `105240161511`): 10 cảnh báo ESLint tại `app/admin/attendance/page.tsx#251`, `app/(portal)/page.tsx#3,4,134,138,154,256,258`, `app/(jobs)/viec-lam/page.tsx#49,395`. | Cung cấp danh mục vi phạm chính xác cần sửa từ Quality job đã completed. |
| `EV-02` | `git status --short`: `?? t0_script.ps1`, `?? t0_correction.ps1`, `?? worktree_link/`. | Khẳng định các file bảo tồn đang nằm ở working tree, cấm xâm phạm. |
| `EV-03` | `git ls-files -- "scratch/root-scripts/*"`: Các script migration/handover cũ đã nằm trong `scratch/root-scripts/`. | Xác nhận không tự ý di chuyển script khi chưa có audit inventory. |

---

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | **Một Tier 1 duy nhất sở hữu trọn vẹn plan + code:** Tier 1 chịu trách nhiệm từ intake, sửa code, chạy linter/typecheck đến bàn giao; không có vai trò Tier 2. | `CHOSEN` |
| `DEC-02` | **Audit mode LIGHT:** Kiểm định độc lập bởi Tier 3 trước khi merge nhằm đảm bảo zero regression trên UI. | `CHOSEN` |
| `DEC-03` | **Strict Keep-list:** Bảo tồn nguyên vẹn `t0_script.ps1`, `t0_correction.ps1`, `.ai-pipeline/**`. | `CHOSEN` |

---

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Sửa dứt điểm 10 cảnh báo linter tại 3 file UI in-scope mà không làm thay đổi DOM/hành vi render. |
| `RQ-02` | Cập nhật `.gitignore` để ignore các file build cache (`*.tsbuildinfo`, `*.log`). |
| `RQ-03` | Không di chuyển, xóa hoặc sửa đổi bất kỳ file script nào ngoài in-scope roots. |

### 4.2 Scope boundaries

- **In:** `app/admin/attendance/page.tsx`, `app/(portal)/page.tsx`, `app/(jobs)/viec-lam/page.tsx`, `.gitignore`.
- **Out:** Mọi file trong `src/domains/**`, `src/shared/**`, `prisma/**`, các file script ở root (`*.ps1`, `*.py`, `*.cjs`).
- **Allowed task artifacts:** `docs/tasks/hrp-v7-ops-codebase-hygiene/**`.

### 4.3 Domain boundaries

- **Data/state:** N/A — Refactor UI linter thuần túy, không thay đổi data model.
- **Permission/security:** N/A — Không thay đổi RLS, auth scopes hay authorization.
- **Interface/API:** N/A — Không sửa API endpoints hay DTO contracts.
- **Migration/rollback:** Rollback bằng `git checkout` các file in-scope.

---

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `app/admin/attendance/page.tsx, app/(portal)/page.tsx, app/(jobs)/viec-lam/page.tsx` | Xóa các unused imports/vars, đổi let sang const, gán type chặt | `npm run lint` | Linter báo lỗi mới hoặc component bị lỗi render |
| `STEP-02` | `.gitignore` | Thêm pattern `*.tsbuildinfo` và `*.log` nếu chưa có | `git status` | Xuất hiện thay đổi ngoài file `.gitignore` |
| `STEP-03` | `Repository gates` | Chạy toàn bộ linter và typecheck xác thực | `npm run lint && npm run typecheck` | Bất kỳ gate nào FAIL |

---

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `npm run lint` chạy sạch không còn 10 warnings đã nêu | `npm run lint` |
| `AC-02` | `npm run typecheck` PASS không có lỗi biên dịch TypeScript | `npm run typecheck` |
| `AC-03` | `git status --porcelain` chỉ hiển thị tối đa 4 file in-scope được sửa | `git status --porcelain` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-02` | `AC-03` |
| `RQ-03` | `STEP-03` | `AC-03` |

---

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Xóa nhầm biến có side-effect hoặc làm vỡ type check | Giữ nguyên logic, chỉ xóa biến unused theo đúng báo cáo của ESLint; chạy `npm run typecheck` để verify. |

---

## 8. Open Questions

- None.

---

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | Start implementation | Baseline `3442370f` verified against `origin/main`; clean worktree created at `C:\CodeApp\HrP-worktrees\tier1-hygiene`; the 10 documented in-scope warnings reproduced in lint baseline; no STOP conditions triggered. `*.log` and `*.tsbuildinfo` already present in `.gitignore`; no tracked `.log` files exist → STEP-02 produces no diff. |

---

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-17` | Initial contract | Khởi tạo task theo chuẩn 3-tier canonical pipeline |
