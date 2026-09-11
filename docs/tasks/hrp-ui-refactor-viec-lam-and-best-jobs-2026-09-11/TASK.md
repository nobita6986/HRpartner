# TASK — `hrp-ui-refactor-viec-lam-and-best-jobs-2026-09-11`

> Refactor UI trang **Danh sách việc làm** (`/viec-lam`) và component **JobCard** + **BestJobsSection** theo 4 nhóm yêu cầu của sếp (11/09/2026).
> File này được tạo tối thiểu để satisfy `verify-handoff.ps1` (TASK + HANDOFF phải có AC khớp nhau); sếp đã chỉ thị bỏ qua spec đầy đủ và code + HANDOFF luôn.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-ui-refactor-viec-lam-and-best-jobs-2026-09-11` |
| Work type | `CODE` (UI refactor thuần, không API/schema) |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `FAST lane bypass Tier 3` |
| Spec version | `v1.0` |
| Status | `READY_FOR_REVIEW` |
| Planner | `Tier 1` |
| Baseline | `a21b5866180fa429dacd02987d1bdace6125fefb` |
| In-scope roots | `app/(jobs)/viec-lam/page.tsx`, `src/domains/job-board/components/landing/best-jobs-section.tsx`, `src/domains/job-board/components/landing/featured-job-card.tsx`, `docs/tasks/hrp-ui-refactor-viec-lam-and-best-jobs-2026-09-11/**` |
| Forbidden paths | `app/(portal)/page.tsx`, `src/domains/job-board/public.service.ts`, `src/domains/job-board/public-types.ts`, `prisma/**`, `app/api/**`, `app/globals.css`, mọi test file, các task docs khác |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set với baseline + new failure count = 0; `npm run build` exit 0; `verify-task.ps1` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `NONE: /deliver → /resolve` |

## 1. Outcome

### 1.1 User-visible outcome

Refactor UI 4 nhóm theo yêu cầu sếp:

- **Y1**: Bố cục `/viec-lam` — gradient nền `bg-gradient-to-b from-orange-50 via-white to-gray-50`; giảm padding dọc; các thẻ con `bg-white/60`/`bg-white/80` để không đứt gradient. BestJobsSection cũng giảm padding và bỏ nền `bg-surface-container-low` để xuyên suốt.
- **Y2**: BestJobsSection — xóa khối "Gợi ý cho bạn", mô tả "Các vị trí đang tuyển nhiều ứng viên nhất…", link "Xem tất cả →"; **giữ** icon `local_fire_department` theo chỉ thị sếp; đẩy tabs `Tất cả` / `Tuyển gấp` lên ngay dưới tiêu đề mới.
- **Y3**: JobCard — `flex flex-col h-full`; tách dòng mức lương riêng sau location/shift; 2 nút ở `mt-auto` footer với `Xem chi tiết` (outline/ghost `border-slate-300 bg-white`) + `Ứng tuyển` (primary cam `bg-primary text-white hover:bg-primary-dark`).
- **Y4**: Pagination `/viec-lam` — bố cục `flex justify-center mt-10 gap-2`; nội dung gồm `Trước` + `[1] [2] [3]…` + `Sau`; trang active `bg-primary text-white`, các nút khác outline `border-outline bg-white/80`.

### 1.2 Non-goals

- KHÔNG đụng `app/(portal)/page.tsx`, KHÔNG đụng `src/domains/job-board/public.service.ts`.
- KHÔNG đụng `app/globals.css`.
- KHÔNG thêm dependency mới.
- KHÔNG mở API/schema.
- KHÔNG viết test mới (chiến lược minimal_touch của sếp).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `evidence/E-01-typecheck.txt` | `npm run typecheck` exit 0 |
| `EV-02` | `evidence/E-02-test-unit.txt` | `npm run test:unit` cùng expected failure set + new failure count = 0 (so với baseline `a21b5866`) |
| `EV-03` | `evidence/E-03-build.txt` | `npm run build` exit 0 |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Lane FAST (refactor UI thuần); Audit NONE | `CHOSEN` |
| `DEC-02` | Skip spec đầy đủ theo chỉ thị sếp; chỉ tạo TASK tối thiểu để verify-handoff pass | `CHOSEN` |
| `DEC-03` | BestJobsSection giữ icon `local_fire_department` (xóa sẽ fail `public-ui-premium > RQ-21` ≥3 icon ligature) | `CHOSEN` |
| `DEC-04` | Chiến lược minimal_touch với fence tests: KHÔNG sửa test, giữ anchor trong source | `CHOSEN` |
| `DEC-05` | Baseline = `a21b5866`; pre-existing 13 fail không thuộc refactor | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Y1 — gradient nền `bg-gradient-to-b from-orange-50 via-white to-gray-50` xuyên suốt `/viec-lam`; BestJobsSection bỏ `bg-surface-container-low` ở section |
| `RQ-02` | Y1 — giảm padding dọc `py-8 sm:py-10` → `py-6 sm:py-8` (viec-lam), `py-12 md:py-16` → `py-8 md:py-10` (BestJobs) |
| `RQ-03` | Y1 — các thẻ con dùng `bg-white/60` (empty state), `bg-white/80` (nút phân trang/nút CTA) |
| `RQ-04` | Y2 — xóa khối "Gợi ý cho bạn" + mô tả + "Xem tất cả →" |
| `RQ-05` | Y2 — đẩy tabs `Tất cả` / `Tuyển gấp` lên ngay sau header mới |
| `RQ-06` | Y3 — JobCard `flex flex-col h-full` |
| `RQ-07` | Y3 — Tách dòng mức lương riêng sau location/shift |
| `RQ-08` | Y3 — Footer `mt-auto flex flex-wrap gap-2 justify-between` chứa 2 nút |
| `RQ-09` | Y3 — Nút Xem chi tiết outline `border-slate-300 bg-white hover:bg-slate-50` |
| `RQ-10` | Y3 — Nút Ứng tuyển primary `bg-primary text-white hover:bg-primary-dark` |
| `RQ-11` | Y4 — Pagination `flex justify-center mt-10 gap-2` |
| `RQ-12` | Y4 — Trang active `bg-primary text-white`; nút khác outline `border-outline bg-white/80` |
| `RQ-21` | Chiến lược minimal_touch — KHÔNG thêm test mới; chỉ giữ anchor trong source |

### 4.2 Scope boundaries

- **In:** §0 In-scope roots
- **Out:** §0 Forbidden + §1.2
- Tier 1 owns TASK.md + HANDOFF.md + source allowlist; không tạo test mới.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `app/(jobs)/viec-lam/page.tsx` | Y1+Y3+Y4 — wrapper gradient, JobCard mới, pagination full | Source review | nếu typecheck fail → halt |
| `STEP-02` | `src/domains/job-board/components/landing/best-jobs-section.tsx` | Y1+Y2 — bỏ nền, bỏ "Gợi ý cho bạn", đẩy tabs | Source review | nếu typecheck fail → halt |
| `STEP-03` | `src/domains/job-board/components/landing/featured-job-card.tsx` | Y3 — tách salary, footer chỉ 2 nút | Source review | nếu typecheck fail → halt |
| `STEP-04` | Gates | typecheck + test:unit + build | exit code | nếu fail mới (so baseline) → halt |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Y1 — gradient nền ở `/viec-lam` | `grep 'bg-gradient-to-b from-orange-50 via-white to-gray-50' app/(jobs)/viec-lam/page.tsx` ≥1 match |
| `AC-02` | Y1 — không có `bg-surface-container-low` ở BestJobsSection | `grep 'bg-surface-container-low' src/domains/job-board/components/landing/best-jobs-section.tsx` = 0 ở thẻ section ngoài |
| `AC-03` | Y1 — padding giảm | `grep 'py-6 sm:py-8' app/(jobs)/viec-lam/page.tsx` = 1; `grep 'py-8 md:py-10' best-jobs-section.tsx` = 1 |
| `AC-04` | Y2 — không còn "Gợi ý cho bạn" | `grep 'Gợi ý cho bạn' best-jobs-section.tsx` = 0 |
| `AC-05` | Y2 — không còn "Xem tất cả →" | `grep 'Xem tất cả →' best-jobs-section.tsx` = 0 |
| `AC-06` | Y2 — Tabs ở ngay sau tiêu đề (không còn mô tả ở giữa) | `grep -A 1 'flex items-center gap-3' best-jobs-section.tsx | grep 'role="tablist"'` ≥1 |
| `AC-07` | Y2 — Giữ icon `local_fire_department` | `grep 'local_fire_department' best-jobs-section.tsx` ≥1 |
| `AC-08` | Y3 — JobCard landing `flex flex-col h-full` | `grep 'flex h-full flex-col' app/(jobs)/viec-lam/page.tsx` = 1 |
| `AC-09` | Y3 — Salary đứng riêng dưới metadata trong landing | `grep 'salaryLabel(job.salaryMinVnd' app/(jobs)/viec-lam/page.tsx` = 1 sau `<dl>` |
| `AC-10` | Y3 — FeaturedJobCard salary pill tách riêng | `grep 'bg-emerald-50 text-emerald-700 border-emerald-100' featured-job-card.tsx` = 1 |
| `AC-11` | Y3 — Footer 2 nút với outline + primary | `grep 'bg-primary text-white hover:bg-primary-dark' featured-job-card.tsx` = 1 |
| `AC-12` | Y4 — Pagination full | `grep 'flex flex-wrap items-center justify-center gap-2' app/(jobs)/viec-lam/page.tsx` = 1 |
| `AC-13` | Y4 — Trang active dùng `bg-primary` | `grep 'bg-primary text-white' app/(jobs)/viec-lam/page.tsx` ≥3 (1 ở JobCard CTA + 1 ở pagination current + 1 ở phân trang landing khác) |
| `AC-14` | Gates runtime | `npm run typecheck` exit 0; `npm run build` exit 0 |
| `AC-15` | Tests: 0 fail mới so baseline | `npm run test:unit` cho ra cùng expected failure set + new failure count = 0 (so baseline `a21b5866`) |
| `AC-16` | Verify-handoff PASS | `verify-handoff.ps1` exit 0 |
| `AC-17` | Verify-task PASS | `verify-task.ps1` exit 0 |
| `AC-18` | Anchor counts balanced (interactive == min-h-11 == hrp-focus = 12) | PowerShell script đếm |
| `AC-19` | Fence test interaction — KHÔNG thêm test mới; chỉ giữ anchor trong source | Source review |
| `AC-20` | Pre-existing 13 fail không tăng/giảm so baseline | diff baseline vs HEAD |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-02` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-01`, `STEP-02` | `AC-03` |
| `RQ-03` | `STEP-01` | `AC-01`, `AC-13` |
| `RQ-04` | `STEP-02` | `AC-04`, `AC-05` |
| `RQ-05` | `STEP-02` | `AC-06` |
| `RQ-06` | `STEP-01`, `STEP-03` | `AC-08` |
| `RQ-07` | `STEP-01`, `STEP-03` | `AC-09`, `AC-10` |
| `RQ-08` | `STEP-01`, `STEP-03` | `AC-11` |
| `RQ-09` | `STEP-01`, `STEP-03` | `AC-11` |
| `RQ-10` | `STEP-01`, `STEP-03` | `AC-11` |
| `RQ-11` | `STEP-01` | `AC-12` |
| `RQ-12` | `STEP-01` | `AC-13` |
| `RQ-21` | `STEP-04` | `AC-19` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Phá fence test (anchor test không match) | DEC-04 minimal_touch; đếm anchor trước khi đóng round |
| `RISK-02` | Pre-existing 13 fail không rõ nguồn | Baseline `a21b5866` đã đo; nếu tăng → halt, revert, escalate |
| `RISK-03` | BestJobsSection giữ icon gây fail test khác | Đã đo: icon count + Lucide icons = ≥3 vẫn pass |
| `RISK-04` | Em sửa docblock Y3.3 làm slice `mt-auto` dính comment | Comment phải ở SAU div (DEC-06) |

## 8. Open Questions

None — sếp đã chốt tất cả qua AskQuestion.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 (11/09/2026) | Tier 1 thực hiện trực tiếp Y1..Y4; bỏ spec đầy đủ | sếp chỉ thị "skip_spec_direct_code" |

## 10. Revision Log

- `v1.0` (11/09/2026): Initial TASK tối thiểu cho verify-handoff gate; SPEC đầy đủ đã thay bằng HANDOFF.md theo chỉ thị sếp.