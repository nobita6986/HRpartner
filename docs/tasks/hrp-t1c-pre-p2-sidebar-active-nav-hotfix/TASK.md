# TASK — `hrp-t1c-pre-p2-sidebar-active-nav-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1c-pre-p2-sidebar-active-nav-hotfix` |
| Spec version | `v1.0` |
| Audit mode | `NONE` |
| Audit eligibility | `NOT_REQUIRED` |
| Assurance lane | `FAST` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Contract gate | `READY_TO_CODE` |
| Correction budget | `1` |
| Baseline | `origin/main @ 0626ba28cf3723b37c05c5d5f32a490cca6ae87f` |
| Branch | `codex/t1c-pre-p2-sidebar-active-nav-hotfix` |
| Worktree | `C:\CodeApp\HrP-pre-p2-sidebar-active-nav-hotfix` |
| Next gate | `RUN_GATES_PUSH_PR_CI_GREEN_STOP_BEFORE_MERGE` |

## 1. Outcome and change surface

T0 directive: mỗi admin route phải highlight đúng một menu tương ứng; route detail không fallback "Tổng quan"; route không ánh xạ được → không item nào active.

Bug hiện tại: `getMostSpecificActiveHref` chỉ biết `pathname` khớp với `item.href` (theo longest-prefix). Nhiều route admin chi tiết (`/admin/staffing-orders/{id}`, `/admin/job-openings/{id}`, …) **không có nav href trùng tiền tố** trong `ADMIN_NAV_PHASE4` → trả về `null` → "Tổng quan" (`/admin`) highlight do logic ngoài helper (CSS / fallback), gây cảm giác sai "Tổng quan active cho mọi route lẻ".

## 2. Acceptance contract

### Behavior rules (T0 §Yêu cầu)

- R1. `/admin` chỉ active khi `pathname === '/admin'` (đã đúng; helper hiện tại đã enforce).
- R2. Không dùng `/admin` làm fallback cho route con.
- R3. Canonical route-family/alias mapping (BẮT BUỘC):
  - `/admin/projects*` → `/admin/projects`
  - `/admin/staffing*` → `/admin/staffing`
  - `/admin/staffing-orders*` → `/admin/staffing`
  - `/admin/jobs/job-postings*` → `/admin/jobs/job-postings`
  - `/admin/job-openings*` → `/admin/jobs/job-postings` (nếu route này tồn tại trong repo)
  - `/admin/applications*` → `/admin/applications`
  - `/admin/workers*` → `/admin/workers`
  - `/admin/labor-profiles*` → `/admin/labor-profiles`
  - clients / vendors / users / settings / media và các nav family còn lại: tiếp tục match đúng (helper hiện tại đã xử lý qua longest-prefix).
- R4. Path không ánh xạ được → trả `null` → không item nào active.
- R5. Luôn ≤ 1 active item.
- R6. Alias resolution explicit, deterministic, testable; KHÔNG rải condition trong JSX.
- R7. Longest-specific-match vẫn thắng cho các nav family thực sự lồng nhau.
- R8. Không đổi menu label, role matrix, sidebar visibility, route URL.

### Test cases (T0 §Tests bắt buộc)

| Pathname | Expected active href |
|---|---|
| `/admin` | `/admin` |
| `/admin/projects/abc-123` | `/admin/projects` |
| `/admin/staffing` | `/admin/staffing` |
| `/admin/staffing-orders/abc-123` | `/admin/staffing` |
| `/admin/jobs/job-postings/abc-123` | `/admin/jobs/job-postings` |
| `/admin/job-openings/abc-123` (nếu route tồn tại) | `/admin/jobs/job-postings` |
| `/admin/applications/abc-123` | `/admin/applications` |
| `/admin/workers/abc-123` | `/admin/workers` |
| `/admin/labor-profiles/abc-123` | `/admin/labor-profiles` |
| `/admin/lorem-ipsum` (unknown) | `null` |
| Mỗi case chỉ một active item (helper invariant) | 1 |
| Regression `/admin/jobs` không nhảy lên `/admin/jobs/job-postings/*` | preserved |

## 3. File ownership

- `src/shared/ui/role-guard/active-nav-helper.ts` — thêm `aliases` + `ALIASED_ADMIN_NAV` (canonical map); giữ pure, deterministic.
- `src/shared/ui/role-guard/active-nav-helper.test.ts` — bổ sung test cases §2.
- `src/shared/ui/role-guard/role-guard-layout.tsx` — **KHÔNG sửa logic active-state**; chỉ dùng helper hiện hữu.
- `src/shared/ui/role-guard/role-guard-layout.test.ts` — giữ nguyên (không phát sinh thay đổi behavior).
- `docs/tasks/hrp-t1c-pre-p2-sidebar-active-nav-hotfix/{TASK.md,HANDOFF.md}`.

## 4. Build / Adopt decision

- `BUILD_VS_ADOPT = N/A` — pure refactor helper đang có; không thêm dependency.
- `BUILD_VS_AUTOMATE = N/A` — không chạm connector / scheduler.

## 5. Plan ngắn

1. Helper (`active-nav-helper.ts`):
   - Thêm optional `aliases?: readonly string[]` trên `NavHrefItem`.
   - `matches(pathname, href)` giữ nguyên.
   - `getMostSpecificActiveHref` thêm 1 bước: với mỗi item, build danh sách `href` candidates = `[item.href, ...(item.aliases ?? [])]`; với mỗi candidate kiểm tra `matches(pathname, candidate)`; lấy **longest candidate across all items** thắng; trả về `item.href` của winner (KHÔNG trả alias).
   - Giữ nguyên deterministic, pure, no React.
2. Cung cấp `ADMIN_NAV_WITH_ALIASES` (named export) — danh sách canonical hrefs + aliases dùng trong test fixture và trong layout nếu layout muốn adopt. Layout hiện đang pass `ADMIN_NAV_PHASE4` thẳng vào helper — giữ nguyên giao tiếp (helper default `aliases = []` nên layout vẫn chạy như cũ). Khi nào layout sẵn sàng adopt alias map thì truyền `ADMIN_NAV_WITH_ALIASES`.
3. Test fixture: thêm `ADMIN_NAV_WITH_ALIASES_FIXTURE` (helper built-in map + nav items); viết test theo §2.
4. `role-guard-layout.test.ts` giữ nguyên; nếu có thêm test cần cho layout thì gom ở `active-nav-helper.test.ts`.

## 6. Gates (chạy tuần tự, stop khi fail)

- `pnpm vitest run --config vitest.unit.config.ts src/shared/ui/role-guard` (targeted)
- `pnpm vitest run --config vitest.unit.config.ts` (full unit; fail-closed DB sentinel)
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `node .ai-pipeline/scripts/verify-encoding.mjs` (chỉ trên changed surface)
- `git diff --check`

## 7. Self-review trước freeze (Audit NONE)

- (1) Alias map đặt trong helper — không rải `if` trong JSX; layout vẫn single-source-of-truth (`ADMIN_NAV_PHASE4`).
- (2) Longest-candidate-wins đảm bảo parent/child `/admin/jobs` ↔ `/admin/jobs/job-postings` regression-proof.
- (3) Path unknown → trả `null`; layout `isNavItemActive` sẽ false cho mọi item; CSS không có "Tổng quan" fallback.

## 8. Revision log

- v1.0 — initial TASK; chốt `Contract gate: READY_TO_CODE`.
