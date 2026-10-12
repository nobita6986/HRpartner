# TASK — `hrp-t1c-public-nav-job-filter-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1c-public-nav-job-filter-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Public UI/URL contract nhỏ, cô lập; unit/static regression và canonical gates đủ kiểm soát |
| Spec version | `v1.0` |
| Status | `READY_FOR_REVIEW` |
| Planner | `Tier 1` |
| Baseline | `d62df50e0a5ab48a5bba6cdc0c3fb1d033ff9f6f` |
| Implementation SHA | `e7c5b350dd8ebbcb05623856a96f772a3f7e5c75` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `app/(jobs)/viec-lam/page.tsx`; `app/(portal)/page.tsx`; `app/components/GlobalNavbar.tsx`; `src/domains/job-board/public-listing.*`; `src/domains/applications/marketplace-inventory.static.test.ts`; task artifacts |
| Forbidden paths | Schema, migrations, API routes, public service, admin/settings worktree và dependency manifests |
| Required gates | targeted Vitest; `pnpm run typecheck`; ESLint changed files; `pnpm run test:unit`; `pnpm run build`; encoding verifier; `git diff --check` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `T0 review; stop before merge/deploy` |

## 1. Outcome

### 1.1 User-visible outcome

- `/viec-lam` chỉ còn ba bộ lọc: từ khóa, khu vực, mức lương. `shift` không còn được đọc, phát ra URL hoặc truyền vào truy vấn; URL cũ có `shift` bị bỏ qua.
- Public header có `Trang chủ` trỏ `/` và `Việc làm` trỏ `/viec-lam`, nhất quán desktop/mobile; active state đúng ở `/`, `/viec-lam` và `/viec-lam/[slug]`.

### 1.2 Non-goals

- Không đổi homepage content, service/API/schema/database, dependency hoặc deploy configuration.
- Không bỏ thông tin ca làm khỏi thẻ/chi tiết việc làm; chỉ bỏ bộ lọc theo ca.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/(jobs)/viec-lam/page.tsx:242-265` render select `listing-shift`; loader truyền `params.shift` tại `:417` | Đây là toàn call path cần bỏ ở listing surface |
| `EV-02` | `src/domains/job-board/public-listing.params.ts:103-160` đọc/phát/index theo `shift` | URL cũ chỉ thật sự ngừng lọc khi sửa shared parser/builder |
| `EV-03` | `app/components/GlobalNavbar.tsx:31-58` hiện `/` mang nhãn `Việc làm`; cùng `navLinks` được map cho desktop/mobile | Chỉ cần sửa một nguồn dữ liệu; matcher hiện có đã root-exact và prefix-match route con |
| `EV-04` | `.codegraph/` không có trong worktree mới | Cho phép fallback sang `rg`/đọc file theo AGENTS.md |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Bỏ `shift` khỏi URL contract của riêng `/viec-lam`; API/service vẫn giữ khả năng lọc shift cho caller khác | `CHOSEN` |
| `DEC-02` | URL cũ chỉ có `shift` được coi như URL sạch vì parser bỏ qua; không redirect cưỡng bức | `CHOSEN` |
| `DEC-03` | Dùng mảng `navLinks` hiện hữu làm nguồn duy nhất cho desktop/mobile, không tạo header thứ hai | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| N/A | `GlobalNavbar` và public listing helpers hiện hữu | `N/A` | N/A | Repo hiện tại | N/A | Không tạo capability mới, không đổi dependency/shared framework |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| N/A | Không có workflow ngoài ứng dụng | `N/A` | N/A | N/A | N/A | N/A | Không tạo connector/scheduler/notification workflow |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Xóa control/copy “Ca làm” khỏi `/viec-lam`; giữ Từ khóa/Khu vực/Mức lương. |
| `RQ-02` | Parser không trả `shift`; URL builder không phát `shift`; indexability bỏ qua input `shift`. |
| `RQ-03` | Loader `/viec-lam` không nhận hoặc truyền `shift` vào `listPublicJobProjection`. |
| `RQ-04` | Homepage navigation tới `/viec-lam` không mang state/query `shift` cũ. |
| `RQ-05` | Header thêm `Trang chủ` → `/` và đổi `Việc làm` → `/viec-lam` bằng mảng dùng chung desktop/mobile. |
| `RQ-06` | `/` chỉ active Trang chủ; `/viec-lam` và route con active Việc làm. |
| `RQ-07` | Regression tests khóa UI, parser/query semantics và navigation; canonical gates xanh. |

### 4.2 Scope boundaries

- **In:** Các file in-scope đã pin trong Control và task artifacts.
- **Out:** Settings hotfix chưa commit của T0; schema/migration/API/service; homepage content khác ngoài loại bỏ dead shift caller.
- **Allowed task artifacts:** `docs/tasks/hrp-t1c-public-nav-job-filter-hotfix/**`.

### 4.3 Domain boundaries

- **Data/state:** Chỉ bỏ `shift` khỏi state URL của `/viec-lam`; không đổi DTO/data.
- **Permission/security:** N/A — public read behavior, không đổi auth/rate limit.
- **Interface/API:** URL contract listing còn `q`, `salary`, `area`, `offset`; input `shift` bị ignore.
- **Migration/rollback:** Không migration; rollback bằng revert commit.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | listing params + tests | Thu gọn URL contract và khóa hành vi legacy `shift` bị ignore | `AC-01`, targeted test | Parser/build không deterministic |
| `STEP-02` | listing page + homepage caller + tests | Bỏ control/copy/call shift, giữ ba filter còn lại | `AC-02`, `AC-03` | Phải đổi service/API |
| `STEP-03` | `GlobalNavbar` + static tests | Thêm mapping và active-state đúng trên mảng dùng chung | `AC-04` | Cần header mới hoặc route mới |
| `STEP-04` | changed surface | Chạy canonical gates, self-review, freeze và handoff | `AC-05` | Gate đỏ chưa giải thích |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Parser trả đúng bốn khóa `q/salary/area/offset`; `shift` input không làm đổi output/indexability/href | `pnpm exec vitest run --config vitest.unit.config.ts src/domains/job-board/public-listing.params.test.ts` |
| `AC-02` | Listing không còn label/control/copy/filter call `shift`, vẫn có keyword/area/salary | `pnpm exec vitest run --config vitest.unit.config.ts src/domains/job-board/public-listing.static.test.ts` |
| `AC-03` | Homepage callers không truyền `shift` vào builder | `pnpm exec vitest run --config vitest.unit.config.ts src/domains/applications/marketplace-inventory.static.test.ts` |
| `AC-04` | Header có mapping `/`/`/viec-lam`, matcher root-exact + prefix route con, cùng mảng render 2 lần | `pnpm exec vitest run --config vitest.unit.config.ts src/domains/job-board/public-listing.static.test.ts` |
| `AC-05` | Targeted, typecheck, lint changed files, full unit, build, encoding và diff check pass | Commands trong Required gates |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-02` |
| `RQ-02` | `STEP-01` | `AC-01` |
| `RQ-03` | `STEP-02` | `AC-02` |
| `RQ-04` | `STEP-02` | `AC-03` |
| `RQ-05` | `STEP-03` | `AC-04` |
| `RQ-06` | `STEP-03` | `AC-04` |
| `RQ-07` | `STEP-04` | `AC-05` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Bookmark cũ có `?shift=` hiển thị tập không lọc theo ca | Hành vi được test và là yêu cầu Owner; URL phân trang mới không giữ `shift` |
| `RISK-02` | Navbar active sai vì `/` prefix mọi route | Matcher hiện hữu giữ `/` exact; test khóa `/`, `/viec-lam`, `/viec-lam/[slug]` |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | `Implementation frozen at e7c5b350dd8ebbcb05623856a96f772a3f7e5c75` | Canonical gates pass; T1 stopped before merge/deploy as directed |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-12` | Initial contract | Owner chốt outcome và boundary |
