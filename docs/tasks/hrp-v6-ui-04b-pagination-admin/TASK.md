# TASK B — `hrp-v6-ui-04b-pagination-admin`

> Canonical contract path. Tier 1 owns this file; Tier 2 owns HANDOFF + evidence + source/test được phép sửa.
> Mandate: `docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md` (Tier 0 chỉ thị 10/09/2026, đã chốt A1–A16 + B1–B11).
> Plan tổng thể: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-overview.md`.
> Skeleton: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/skeleton-B-C-D.md` (§TASK B).
> Field matrix: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md` (§7 Tab, §8 Pagination, §12 Canonical types).
> Plan Admin V6 mapping: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-admin-v6.md` (§2 AV1).
> Tier 0 review r1 (`evidence/tier0-review-task-b-v1.md`) — REVISION_REQUIRED, đã chốt 3 quyết định: schema/permission/read API → AV1; lane STANDARD/FOCUSED.
> Tier 1 đặt TASK.md này ngay sau khi TASK A `ACCEPTED` (commit `d3add63`).

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04b-pagination-admin` |
| Work type | `CODE` (UI controls thuần; KHÔNG backend, KHÔNG schema, KHÔNG permission, KHÔNG API mới) |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Spec version | `v1.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `d3add63` — TASK A `ACCEPTED` HEAD (mốc tham chiếu) |
| Execution HEAD | đo ngay trước STEP-01 bằng `git rev-parse HEAD` → `evidence/exec-head-before.txt` |
| Source reference | TASK A audit commit `a4e472f`. UI-03 source reference `4d9a633` vẫn áp dụng cho field parity |
| Plan UI predecessor | TASK A `ACCEPTED` |
| Plan UI successor | TASK C `DRAFT` (Section Renderer + Demo Content) |
| Plan Admin V6 mapping | AV1 `HomepageSettings + Query API` (Plan B đẩy toàn bộ schema + permission + write API + Admin settings page + listingPageSize injection sang AV1 implementation task — Tier 1 lập AV1-TASK sau khi Plan B `ACCEPTED`) |
| In-scope roots | `app/(portal)/page.tsx`, `src/domains/job-board/components/landing/best-jobs-section.tsx`, `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` (NEW), `docs/tasks/hrp-v6-ui-04b-pagination-admin/**` |
| Forbidden paths | `prisma/**` (sang AV1), `src/shared/auth/permission-catalog.ts` (sang AV1), `prisma/seed.mjs` (sang AV1), `app/api/admin/homepage-settings/**` (sang AV1), `app/api/jobs/**` (KHÔNG mở scope filter URGENT — B4 đã đẩy sang AV1), `app/(jobs)/viec-lam/page.tsx` (KHÔNG inject listingPageSize — sang AV1), `app/(jobs)/viec-lam/[slug]/**` (sang Plan UI D.A), `app/admin/**` (sang AV1), `src/domains/job-board/public.service.ts` (KHÔNG đổi), `src/domains/job-board/public-settings.service.ts` (NEW sang AV1), `src/domains/job-board/public-types.ts` (NEW sang AV1), `app/globals.css` (chỉ thuộc TASK A scope; Plan B KHÔNG thêm class mới vì BestJobs tab/pagination dùng token hiện hữu), `app/admin/jobs/**` (sang Plan Admin V6 AV2), mọi file trong `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**` (Tier 1 plane — DEC-19) |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` cùng expected failure set với baseline `d3add63` + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-pagination-admin/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS |
| Visual gate | **Owner live review post-push** (DEC-18 chung — giữ override mới nhất). KHÔNG Edge/CDP/20 PNG/overlay/bbox markers; KHÔNG Lighthouse/pa11y/axe-core auto-install. Tier 3 KHÔNG audit visual; KHÔNG fail vì thiếu screenshot |
| Current execution round | `0` |
| Next gate | `/code → Tier 2 thi công → verify-task PASS → verify-handoff PASS → Tier 1 trình /audit → Tier 3 FOCUSED audit → /resolve → push Git → Owner live visual review post-deploy` |

> **Phạm vi Plan B (verdict Tier 0 r1)**: Plan B là **UI thuần**. Tier 2 chỉ (1) refactor `BestJobsSection` để nhận props controls, (2) thêm state `bestJobsTab` + `bestJobsOffset` ở `app/(portal)/page.tsx` + fetch riêng `/api/jobs?limit=9&offset=...` cho tab Tất cả, (3) tạo `fixtures/best-jobs-urgent-preview.ts` cho tab URGENT (INTEGRATION_PENDING marker rõ). Tab URGENT KHÔNG gửi `urgency=URGENT` query lên server (chưa được hỗ trợ — sang AV1); chỉ hiển thị fixture + badge "Preview / Backend chưa hỗ trợ". Mọi backend (HomepageSettings schema, migration, permission, write API, Admin settings page, `/api/jobs?urgency`, listingPageSize injection, view-model `HomepageSettingsView`) **sang AV1 implementation task**.

## 1. Outcome

### 1.1 User-visible outcome

Trang chủ `/` sau khi thi công đạt phần **điều khiển (controls) pagination + tab filter BestJobs** ở UI thuần, **KHÔNG** thay đổi phần dữ liệu thật vốn đã chạy từ TASK A:

#### BestJobs tab filter (RQ-01, B1, B2)
- Hai tab pill ngay dưới tiêu đề section "Việc làm tốt nhất":
  - `Tất cả` (default — dùng data thật từ `/api/jobs?limit=9&offset=...`)
  - `Tuyển gấp` (badge "Preview" / INTEGRATION_PENDING — dùng fixture; **KHÔNG** filter server vì backend chưa hỗ trợ — sang AV1)
- Tab `Tất cả` → fetch `/api/jobs?limit=9&offset=...` qua service hiện có; render grid từ response `{ jobs, total, nextOffset, facets, overview }`.
- Tab `Tuyển gấp` → render từ `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` với badge "Preview" rõ ràng (INTEGRATION_PENDING marker per Plan C convention). KHÔNG gửi `urgency=URGENT` lên server (chưa hỗ trợ — Tier 0 §2.1 r1); KHÔNG filter client trên `overview.newest` (Tier 0 §2.1 r1 — `overview.newest` chỉ tối đa 6 tin, không phải nguồn phân trang).
- Tab active: pill `bg-primary-container text-white font-bold`. Tab inactive: `bg-surface text-on-surface font-label`. ARIA: `role="tablist"` + mỗi pill `role="tab" aria-selected`.
- Số việc đếm trên pill `Tuyển gấp` lấy từ fixture length (INTEGRATION_PENDING).

#### BestJobs pagination prev/next (RQ-02, B3, B5, B6)
- Pagination control dưới grid BestJobs (chỉ hiển thị khi `total > 9`):
  - Nút `← Trước` (disabled khi offset = 0)
  - Range: `Trang X / Y` (Y = ceil(total / 9), X = floor(offset / 9) + 1)
  - Nút `Sau →` (disabled khi offset + 9 ≥ total hoặc `nextOffset === null`)
- Mỗi lần click → fetch `/api/jobs?limit=9&offset=M` (state offset riêng). Tabs URGENT (preview) KHÔNG phân trang — chỉ render fixture.
- bestJobsPageSize trong Plan B = **9 hardcode literal** ở client (Tier 0 r1 — sang AV1 sẽ inject qua view-model). Truyền qua prop `pageSize: number = 9` để AV1 sau thay constant thành config.
- Tie-breaker thứ tự giữ nguyên server hiện tại (`postedAt desc + id desc` đã có sẵn trong service — DEC-08 field-matrix §8).
- Homepage search giữ sentinel load-more (B9); KHÔNG dùng prev/next cho search results.

#### Fixture preview URGENT (RQ-03, DEC-07)
- File mới: `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts`
- Export `BEST_JOBS_URGENT_PREVIEW: EnrichedJob[]` (3-6 dòng hardcode với `badgeType: 'urgent'`).
- Type dùng `EnrichedJob` shape tương đương `app/(portal)/page.tsx` hiện có (id, slug, title, locations, badgeType, salaryMinVnd, salaryMaxVnd, availableSlots).
- Mỗi fixture item có field rõ ràng `source: 'INTEGRATION_PENDING'` để marker trong UI.
- Dữ liệu fixture dùng chính sách "không lẫn vào job live nhận ứng tuyển" (Plan C convention §0 evidence) — `id` prefix `preview-urgent-...` để không trùng job thật.
- Tier 2 KHÔNG lấy data từ `overview.topPaid`/`newest` cho fixture — phải hardcode rõ.

#### Shell regression (RQ-04, RQ-11)
- Navbar shell không đổi (TASK A đã chốt). BestJobs layout/grid responsive giữ TASK A: mobile 1 col, tablet 2 col, desktop 3 col.
- Container 1200px giữ TASK A.

### 1.2 Non-goals

- KHÔNG thêm `urgency=URGENT` query param vào `/api/jobs/route.ts` (B4 đã đẩy sang AV1).
- KHÔNG thêm schema `HomepageSettings` table / migration / CHECK constraint (sang AV1).
- KHÔNG thêm permission `CAN_EDIT_HOMEPAGE_SETTINGS` vào `permission-catalog.ts` + `seed.mjs` (sang AV1).
- KHÔNG viết `GET /api/admin/homepage-settings` read API (sang AV1).
- KHÔNG viết `POST /api/admin/homepage-settings` write API (sang AV1).
- KHÔNG viết Admin settings page `app/admin/settings/page.tsx` (sang AV1).
- KHÔNG inject `listingPageSize` vào `app/(jobs)/viec-lam/page.tsx` (sang AV1).
- KHÔNG thêm view-model `HomepageSettingsView` thật với `source: 'REAL' | 'INTEGRATION_PENDING'` (sang AV1).
- KHÔNG cache `unstable_cache` tag `homepage-settings` (sang AV1).
- KHÔNG thêm tab filter BestJobs thứ ba (vd `Mới nhất`, `Lương cao`); chỉ `Tất cả` + `Tuyển gấp` theo B1.
- KHÔNG đổi `q`/`area`/`shift`/`shiftTypes`/`jobTypes` filter semantics trong `/api/jobs`.
- KHÔNG thêm sort options client (chỉ `postedAt desc + id desc` cố định).
- KHÔNG đổi Hero search card wrapper (A16 đã chốt ở TASK A).
- KHÔNG đổi sentinel load-more của homepage search (B9 giữ nguyên).
- KHÔNG đổi `AreasSection`/`ReferralStrip`/`RecruitingProjectsSection` (TASK A đã chốt).
- KHÔNG đổi `/viec-lam/[slug]` page (sang Plan UI D.A).
- KHÔNG phát minh SUPER_ADMIN. KHÔNG đổi `permission-resolver.ts`.
- KHÔNG thêm class mới vào `app/globals.css` (BestJobs tab/pagination dùng token hiện hữu từ TASK A — DEC-21 TASK A).
- KHÔNG sửa task khác trong plan cha `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`.

### 1.3 Plan UI split reminder

| Công việc | Thuộc plan | Task slug dự kiến |
|---|---|---|
| Container + Navbar polish + A16 search card + BestJobs/Recruiting cards | **Plan UI A** | `hrp-v6-ui-04a-visual-polish` (ACCEPTED) |
| BestJobs tab + pagination controls + fixture preview URGENT (UI thuần) | **Plan UI B (task này)** | `hrp-v6-ui-04b-pagination-admin` |
| Sections mới + demo content có cấu trúc | Plan UI C | `hrp-v6-ui-04c-section-render` |
| Detail page UI (editorial sections skeleton) | Plan UI D.A | `hrp-v6-ui-04d-detail-ui` |
| HomepageSettings schema + Admin write API + permission + read API + Admin settings page + listingPageSize injection + view-model `HomepageSettingsView` + `/api/jobs?urgency` filter | **Plan Admin V6 AV1** | `hrp-v6-admin-v6-av1-settings-editor` |
| Editor tin Admin/Sale + JobPosting fields | Plan Admin V6 AV2 | `hrp-v6-admin-v6-av2-jobposting-editor` |
| Tag tùy biến | Plan Admin V6 AV3 (defer) | `hrp-v6-admin-v6-av3-tags` |
| Media management | Plan Admin V6 AV4 | `hrp-v6-admin-v6-av4-media` |
| Cache invalidation + integration test | Plan Admin V6 AV5 | `hrp-v6-admin-v6-av5-cache-inttest` |

> Plan B là UI controls thuần + fixture preview; AV1 mới thêm `urgency=URGENT` filter server, schema, permission, write API, Admin page, listingPageSize injection, view-model `HomepageSettingsView` thật (flip `source` từ `INTEGRATION_PENDING` sang `REAL`).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/public.service.ts:574` `listPublicJobProjection` | Service signature hiện có `q/area/shift/shiftTypes/jobTypes/offset/limit`; Plan B KHÔNG thêm `urgency`. |
| `EV-02` | `src/domains/job-board/public.service.ts:359` `orderUrgency` | URGENT chỉ compute từ `CLOSING_SOON` + `deadlineDate` trong khoảng `URGENT_WITHIN_DAYS`. Plan B chỉ dùng qua fixture preview. |
| `EV-03` | `app/api/jobs/route.ts:25` `GET handler` | Endpoint hiện không nhận `urgency`. Plan B KHÔNG mở scope — gọi qua endpoint public hiện có với `limit=9&offset=...`. |
| `EV-04` | `src/domains/job-board/components/landing/best-jobs-section.tsx` | Component hiện hardcode `.slice(0, 3)` + không có tab/pagination. Plan B refactor. |
| `EV-05` | `app/(portal)/page.tsx:200` `featuredJobs` | BestJobs hiện lấy từ `overview.newest.slice(0, 3)`. Plan B đổi sang fetch riêng `/api/jobs?limit=9&offset=...` cho tab Tất cả; tab URGENT dùng fixture. |
| `EV-06` | `app/(jobs)/viec-lam/page.tsx` | SSR listing pagination URL `?page=N` giữ nguyên — Plan B KHÔNG đụng (sang AV1 inject listingPageSize). |
| `EV-07` | `prisma/schema.prisma` | Schema KHÔNG có `HomepageSettings` table. Plan B KHÔNG đụng — sang AV1. |
| `EV-08` | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md` §7, §8 | Tab filter + pagination contract tham chiếu. Plan B chỉ dùng §8 cho pageSize 9 (hardcode) và tie-breaker. |
| `EV-09` | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-admin-v6.md` §2 | AV1 mapping — toàn bộ backend (schema, permission, write API, Admin page, listingPageSize, view-model) chuyển sang AV1. |
| `EV-10` | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-overview.md` | Plan tổng thể — Tier 0 đã chốt tách UI/backend. Plan B là UI thuần. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Tab `Tất cả` (default) + `Tuyển gấp` cho BestJobs. Tab `Tuyển gấp` dùng **fixture preview** (INTEGRATION_PENDING marker rõ); KHÔNG filter server `urgency=URGENT` (sang AV1) | `CHOSEN` (closeout v1.1) |
| `DEC-02` | Tab active: `bg-primary-container text-white font-bold`. Tab inactive: `bg-surface text-on-surface font-label`. ARIA `role="tablist"` + `role="tab" aria-selected` | `CHOSEN` |
| `DEC-03` | BestJobs pagination control: prev/next + range "Trang X / Y" cho tab Tất cả. Tab URGENT (preview) KHÔNG phân trang | `CHOSEN` |
| `DEC-04` | bestJobsPageSize = 9 hardcode literal trong Plan B; truyền qua prop `pageSize: number = 9`. AV1 sau thay constant thành config từ `HomepageSettingsView` | `CHOSEN` (closeout v1.1) |
| `DEC-05` | BestJobs fetch riêng từ `/api/jobs?limit=9&offset=...` cho tab Tất cả. Tabs URGENT (preview) dùng fixture hardcode. KHÔNG dùng `overview.newest` làm nguồn phân trang (Tier 0 §2.1 r1) | `CHOSEN` (closeout v1.1) |
| `DEC-06` | Fixture URGENT: `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts`. Hardcode 3-6 dòng `EnrichedJob` với `id` prefix `preview-urgent-...` để không trùng job thật. Mỗi item có `source: 'INTEGRATION_PENDING'` marker | `CHOSEN` (closeout v1.1) |
| `DEC-07` | Tab URGENT render badge "Preview" / "Backend chưa hỗ trợ" rõ ràng trên grid. KHÔNG lẫn fixture vào job live nhận ứng tuyển | `CHOSEN` (closeout v1.1) |
| `DEC-08` | Plan B KHÔNG đụng schema, permission, API mới, view-model `HomepageSettingsView`. Toàn bộ sang AV1 | `CHOSEN` (closeout v1.1) |
| `DEC-09` | `app/(jobs)/viec-lam/page.tsx` giữ nguyên (KHÔNG inject listingPageSize — sang AV1) | `CHOSEN` (closeout v1.1) |
| `DEC-10` | Tier 1 owns TASK.md canonical; Tier 2 owns HANDOFF + evidence + source/test được phép sửa. Tier 2 KHÔNG sửa TASK.md, KHÔNG sửa plan cha | `CHOSEN` |
| `DEC-11` | Baseline reference = `d3add63` (TASK A ACCEPTED HEAD). Execution HEAD đo ngay trước STEP-01 bằng `git rev-parse HEAD` → `evidence/exec-head-before.txt`. Expected unit failure set capture tại exec-head-before | `CHOSEN` |
| `DEC-12` | Visual parity = Owner live review post-push. KHÔNG Edge/CDP/PNG/bbox. Tier 3 KHÔNG audit visual; KHÔNG fail vì thiếu screenshot | `CHOSEN` |
| `DEC-13` | OBR-01 allow tạo file mới HANDOFF + `evidence/**` + source mới trong allowlist; KHÔNG cấm mọi path ngoài baseline-manifest | `CHOSEN` |
| `DEC-14` | Fence tests cập nhật theo composition mới: `public-ui-premium.static.test.ts` (BestJobs tab + pagination), `public-ui-token-parity.static.test.ts` (tab className density), `marketplace-inventory.static.test.ts` (BestJobs prev/next selector), `public-card-truth.test.ts` (URGENT fixture marker). Mỗi thay đổi có comment DEC-01 (tab/pagination) + file:line | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | BestJobs có 2 tab pill `Tất cả` (default) + `Tuyển gấp`. Tab Tất cả dùng data thật từ `/api/jobs?limit=9&offset=...`. Tab Tuyển gấp dùng fixture preview với badge rõ; KHÔNG filter server |
| `RQ-02` | BestJobs pagination control (chỉ tab Tất cả): prev/next + range "Trang X / Y". pageSize = 9 hardcode literal truyền qua prop `pageSize: number = 9`. Mỗi click fetch `/api/jobs?limit=9&offset=M` |
| `RQ-03` | Tab URGENT render từ `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` với badge "Preview" / "Backend chưa hỗ trợ" + `source: 'INTEGRATION_PENDING'` marker. KHÔNG phân trang |
| `RQ-04` | Fixture URGENT: `BEST_JOBS_URGENT_PREVIEW: EnrichedJob[]` (3-6 dòng hardcode, `id` prefix `preview-urgent-...`, `badgeType: 'urgent'`). Tier 2 KHÔNG lấy từ `overview.newest`/`topPaid` |
| `RQ-05` | Tab ARIA: `role="tablist"` + mỗi pill `role="tab" aria-selected`. Tab active class `bg-primary-container text-white font-bold`. Tab inactive `bg-surface text-on-surface font-label` |
| `RQ-06` | Pagination control ARIA: `role="group" aria-label="Phân trang"`. Prev disabled khi `offset = 0`. Next disabled khi `offset + 9 >= total` hoặc `nextOffset === null` |
| `RQ-07` | BestJobs KHÔNG dùng `overview.newest.slice(0, 3)` làm nguồn phân trang (Tier 0 §2.1 r1). Fetch riêng qua `/api/jobs` |
| `RQ-08` | Homepage search sentinel load-more giữ nguyên (B9). State BestJobs offset riêng với search sentinel offset |
| `RQ-09` | Tier 2 KHÔNG thêm class mới vào `app/globals.css` (BestJobs tab/pagination dùng token hiện hữu từ TASK A) |
| `RQ-10` | Fence tests cập nhật theo composition mới (allowlist §11 OBR-02). Mỗi thay đổi có comment DEC-01 (tab/pagination) + file:line |
| `RQ-11` | Regression shell: Navbar shell không đổi (TASK A đã chốt). BestJobs layout/grid responsive: mobile 1 col, tablet 2 col, desktop 3 col (giữ TASK A) |
| `RQ-12` | Visual parity gate: (a) code-side parity §1.1; (b) Owner live review post-push trên deployed homepage (DEC-18) |

### 4.2 Domain boundaries

- **Container-only edits**: KHÔNG thuộc Plan B (TASK A đã chốt 1200px). Tier 2 KHÔNG đổi container/padding ở Areas/CTV/Footer/Hero
- **Data/state**: KHÔNG mở schema. KHÔNG đổi `listPublicJobProjection` semantics. KHÔNG thêm endpoint mới
- **Permission/security**: KHÔNG đụng permission catalog, seed, resolver
- **Interface/API**: chỉ consume `/api/jobs` hiện có với `q/area/shift/shiftTypes/jobTypes/offset/limit` (KHÔNG mở `urgency`)
- **Migration/rollback**: N/A
- **Cache**: N/A (Tier 2 KHÔNG touch cache strategy; sang AV1)

### 4.3 Scope

- In: §0 In-scope roots
- Out: §0 Forbidden + §1.2
- Tier 2 tạo HANDOFF + `evidence/**` tại `docs/tasks/hrp-v6-ui-04b-pagination-admin/`. Tier 2 KHÔNG ghi TASK.md, KHÔNG ghi plan cha

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | OBR-01 baseline + execution HEAD | Record: (a) `git rev-parse HEAD` → `evidence/exec-head-before.txt`. (b) Source reference = TASK A `a4e472f`. (c) Capture unit failure set hiện tại → `evidence/expected-failure-set-before.txt`. (d) `git status --porcelain` → `evidence/working-tree-before.txt` | `git status --porcelain` không có path ngoài §1.3 dirty set; expected-failure-set-before.txt có hash + failing test files | Nếu expected failure set > 3 (TASK A baseline) → verify đo đúng lúc exec-head-before; nếu > 3 → báo Planner |
| `STEP-02` | `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` (NEW) | Export `BEST_JOBS_URGENT_PREVIEW: EnrichedJob[]` (3-6 dòng hardcode). Mỗi item: `id` prefix `preview-urgent-...`, `slug` tương ứng, `title`, `locations`, `badgeType: 'urgent'`, `salaryMinVnd`, `salaryMaxVnd`, `availableSlots`, `source: 'INTEGRATION_PENDING'`. Export `EnrichedJob` type từ module này nếu chưa có ở `app/(portal)/page.tsx` (refactor sang đây cho tab URGENT dùng lại) | Source review: file mới, 3-6 dòng, `id` prefix rõ, `source` marker; `npm run typecheck` exit 0 | Nếu type `EnrichedJob` lặp lại ở 2 file → refactor về `src/domains/job-board/types.ts` hoặc dùng `export type` shared |
| `STEP-03` | `src/domains/job-board/components/landing/best-jobs-section.tsx` | Refactor: nhận props `jobs: EnrichedJob[]`, `total: number`, `pageSize: number`, `offset: number`, `nextOffset: number \| null`, `tab: 'all' \| 'urgent'`, `onTabChange: (tab) => void`, `onPrev: () => void`, `onNext: () => void`, `buildHref`, `urgentPreviewBadge: string` (label cho badge INTEGRATION_PENDING). Render 2 tab pill (role tablist/tab/aria-selected). Render pagination control (prev/next + range "Trang X / Y") khi `tab === 'all' && total > pageSize`. KHÔNG hardcode `.slice(0, 3)` — render `jobs.slice(0, pageSize)` | Source review: tab ARIA + pagination selector + slice từ props; container 1200px giữ (TASK A) | Nếu tab ARIA thiếu → sửa; nếu slice hardcode → revert |
| `STEP-04` | `app/(portal)/page.tsx` | Thêm state `bestJobsTab` (`'all' \| 'urgent'`), `bestJobsOffset` (number), `bestJobsData` ({ jobs, total, nextOffset }), `bestJobsLoading` (boolean), `bestJobsError` (string). Fetch riêng qua `/api/jobs?limit=9&offset=...` khi tab active = 'all' hoặc offset đổi (useEffect dependency). `featuredJobs` đổi từ `overview.newest.slice(0, 3)` sang `bestJobsData.jobs` cho tab 'all'; tab 'urgent' dùng `BEST_JOBS_URGENT_PREVIEW`. Sentinel load-more homepage search giữ (B9) — state riêng với bestJobsOffset | Source review: state + fetch URL + sentinel KHÔNG đổi; tab 'all' dùng fetch riêng; tab 'urgent' dùng fixture | Nếu fetch riêng BestJobs duplicate state với sentinel → tách state (sentinel chỉ manage homepage search results) |
| `STEP-05` | Fence tests cập nhật allowlist §11 OBR-02 (DEC-14) | Update `public-ui-premium.static.test.ts` (BestJobs tab + pagination), `public-ui-token-parity.static.test.ts` (tab className density), `marketplace-inventory.static.test.ts` (BestJobs prev/next selector), `public-card-truth.test.ts` (URGENT fixture `source: INTEGRATION_PENDING` marker). Mỗi change có comment DEC-01 (tab/pagination) + DEC-06 (URGENT fixture) + file:line | `npm run test:unit -- public-card-truth` exit 0; full `npm run test:unit` cùng expected failure set với expected-failure-set-before + new failure count = 0 | Nếu test fail ngoài expected → halt, báo Planner |
| `STEP-06` | Regression check shell + mandatory gates (DEC-12) | Source review import `GlobalNavbar` không đổi (TASK A đã chốt). `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + new failure count = 0; `npm run test:unit -- public-card-truth` exit 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-pagination-admin/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS | `evidence/ac12-gates.txt` | Nếu gate fail → halt, sửa, KHÔNG ghi READY_FOR_AUDIT |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method (command/source review/evidence file) |
|---|---|---|
| `AC-01` | `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` mới có `BEST_JOBS_URGENT_PREVIEW` với `id` prefix `preview-urgent-...` và `source: 'INTEGRATION_PENDING'` marker | Command: `Test-Path src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` → True. `Select-String -Path src/domains/job-board/fixtures/best-jobs-urgent-preview.ts -Pattern "preview-urgent-\|INTEGRATION_PENDING"` expect 3+ matches. Lưu `evidence/ac01-urgent-fixture.txt` |
| `AC-02` | BestJobs tab `Tất cả` (default) + `Tuyển gấp`. Tab Tất cả dùng data thật từ `/api/jobs?limit=9&offset=...`; tab URGENT dùng fixture preview | Command: `Select-String -Path 'app/(portal)/page.tsx','src/domains/job-board/components/landing/best-jobs-section.tsx' -Pattern "bestJobsTab\|BEST_JOBS_URGENT_PREVIEW\|/api/jobs\?limit=9"` expect 3+ matches. Lưu `evidence/ac02-bestjobs-tab.txt` |
| `AC-03` | KHÔNG query `urgency=URGENT` gửi lên server trong Plan B (B4 đã đẩy AV1) | Command: `Select-String -Path 'app/(portal)/page.tsx','app/api/jobs/route.ts' -Pattern "urgency=URGENT\|urgency"` expect 0 match trong `app/(portal)/page.tsx`; 0 match trong `app/api/jobs/route.ts` (KHÔNG mở scope). Lưu `evidence/ac03-no-urgency-query.txt` |
| `AC-04` | BestJobs fetch riêng qua `/api/jobs?limit=9&offset=...` cho tab Tất cả. KHÔNG dùng `overview.newest.slice(0, 3)` làm nguồn phân trang | Command: `Select-String -Path 'app/(portal)/page.tsx' -Pattern "overview\.newest\.slice\(0, 3\)\|featuredJobs.*overview"` expect 0 match (KHÔNG dùng). Source review state `bestJobsData.jobs` từ fetch riêng. Lưu `evidence/ac04-bestjobs-fetch-separate.txt` |
| `AC-05` | bestJobsPageSize = 9 hardcode literal truyền qua prop `pageSize: number = 9` | Command: `Select-String -Path 'app/(portal)/page.tsx','src/domains/job-board/components/landing/best-jobs-section.tsx' -Pattern "pageSize.*=.*9\|pageSize: number = 9"` expect 1+ match. Lưu `evidence/ac05-pagesize-9.txt` |
| `AC-06` | BestJobs pagination control: prev/next + range "Trang X / Y" (chỉ tab Tất cả) | Command: `Select-String -Path 'app/(portal)/page.tsx','src/domains/job-board/components/landing/best-jobs-section.tsx' -Pattern "Trang.*/.*Y\|Phân trang\|onPrev\|onNext"` expect 3+ matches. Lưu `evidence/ac06-bestjobs-pagination.txt` |
| `AC-07` | Tab ARIA `role="tablist"` + mỗi pill `role="tab" aria-selected` | Command: `Select-String -Path src/domains/job-board/components/landing/best-jobs-section.tsx -Pattern "role=\"tablist\"|role=\"tab\"|aria-selected"` expect 3+ matches (tablist + tab per pill). Lưu `evidence/ac07-tab-aria.txt` |
| `AC-08` | Pagination control ARIA `role="group" aria-label="Phân trang"`. Prev disabled khi `offset = 0`. Next disabled khi `offset + 9 >= total` hoặc `nextOffset === null` | Command: `Select-String -Path src/domains/job-board/components/landing/best-jobs-section.tsx -Pattern "role=\"group\"|aria-label=\"Phân trang\"|disabled.*offset.*=.*0\|nextOffset === null"` expect 4+ matches. Lưu `evidence/ac08-pagination-aria.txt` |
| `AC-09` | Tab URGENT render badge "Preview" / "Backend chưa hỗ trợ" rõ ràng; KHÔNG phân trang | Command: `Select-String -Path 'app/(portal)/page.tsx','src/domains/job-board/components/landing/best-jobs-section.tsx' -Pattern "Preview\|Backend chưa hỗ trợ"` expect 1+ match. Source review: tab URGENT không có pagination control render. Lưu `evidence/ac09-urgent-preview-badge.txt` |
| `AC-10` | Truth fence: changed public surface không chứa "Top công ty\|Đối tác chính thức\|Cơ hội mới\|hiển thị số slot thật\|Dự án trọng điểm" + số giả (`17.800`, `13.000.000`, `+10.000.000`, `+50.000.000`) | PowerShell `Select-String -Path src/domains/job-board/components/landing/best-jobs-section.tsx,src/domains/job-board/components/landing/recruiting-projects-section.tsx,src/domains/job-board/fixtures/best-jobs-urgent-preview.ts,"app/(portal)/page.tsx" -Pattern "Top công ty\|Đối tác chính thức\|Cơ hội mới\|hiển thị số slot thật\|Dự án trọng điểm\|17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000"`. Expect 0 match. Lưu `evidence/ac10-truth-fence.txt` |
| `AC-11` | Fence tests cập nhật theo composition mới (allowlist §11 OBR-02) | Command: `Select-String -Path src/domains/job-board/public-ui-premium.static.test.ts,src/domains/job-board/public-ui-token-parity.static.test.ts,src/domains/applications/marketplace-inventory.static.test.ts,src/domains/job-board/public-card-truth.test.ts -Pattern "DEC-01\|DEC-06"` expect 1+ match mỗi file (tab/pagination + URGENT fixture comment). Lưu `evidence/ac11-fence-tests.txt` |
| `AC-12` | Mandatory gates | `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; full `npm run test:unit` cùng expected failure set với expected-failure-set-before + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-pagination-admin/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS. Lưu `evidence/ac12-gates.txt` với exit code từng gate |
| `AC-13` | Regression shell: 6 route portal vẫn import `GlobalNavbar` không vỡ (TASK A shell) | Command: `Select-String -Path 'app/(portal)/page.tsx','app/(jobs)/viec-lam/page.tsx','app/(jobs)/viec-lam/[slug]/page.tsx','app/(jobs)/login/page.tsx','app/(jobs)/ve-chung-toi/page.tsx','app/(jobs)/ctv-portal/page.tsx' -Pattern "import.*GlobalNavbar"` expect 6 matches. Tier 2 ghi line từng route. Lưu `evidence/ac13-regression-check.txt` |
| `AC-14` | AWAITING_OWNER_LIVE_VISUAL_REVIEW (DEC-12) | Status marker trong HANDOFF; Tier 3 không fail vì thiếu screenshot; visual parity Owner duyệt post-deploy |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-03, STEP-04 | AC-02, AC-07 |
| RQ-02 | STEP-03, STEP-04 | AC-05, AC-06, AC-08 |
| RQ-03 | STEP-02, STEP-03, STEP-04 | AC-01, AC-09 |
| RQ-04 | STEP-02 | AC-01 |
| RQ-05 | STEP-03 | AC-07 |
| RQ-06 | STEP-03, STEP-04 | AC-08 |
| RQ-07 | STEP-04 | AC-04 |
| RQ-08 | STEP-04 | AC-04 |
| RQ-09 | STEP-03 | AC-07, AC-08 |
| RQ-10 | STEP-05 | AC-11 |
| RQ-11 | STEP-06 | AC-13 |
| RQ-12 | STEP-06 | AC-14 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Tier 2 vô tình sửa schema, permission, API mới — scope creep | STEP-04 source review `git diff --name-only exec-head-before..HEAD` vs allowlist §11 OBR-02. Nếu có path ngoài (prisma, permission-catalog, seed.mjs, app/api/admin/homepage-settings) → revert, escalate. Forbidden paths §0 cứng |
| `RISK-02` | Tier 2 gửi `urgency=URGENT` lên server chưa hỗ trợ → backend throw hoặc filter sai | STEP-04 source review: KHÔNG có `urgency` trong query string cho `/api/jobs`. AC-03 enforce 0 match |
| `RISK-03` | Tier 2 dùng `overview.newest.slice(0, 3)` làm nguồn BestJobs → Tier 0 §2.1 r1 cấm | STEP-04 + AC-04 enforce `Select-String overview.newest.slice(0, 3)` → 0 match |
| `RISK-04` | BestJobs fetch riêng + sentinel homepage search trùng state → render duplicate | STEP-04 tách state: BestJobs offset riêng, sentinel homepage search offset riêng |
| `RISK-05` | Tier 2 vô tình sửa `AreasSection`/`ReferralStrip` container 1200px (TASK A đã chốt) | STEP-04 source review: chỉ đụng `app/(portal)/page.tsx` + `best-jobs-section.tsx` + fixture file mới. Nếu touch → revert |
| `RISK-06` | BestJobs tab + pagination ARIA thiếu → fail accessibility | AC-07 + AC-08 enforce. Nếu fail → sửa, KHÔNG ép PASS |
| `RISK-07` | Fence test fail khi đổi BestJobs slice + tab + pagination + fixture preview | DEC-14 mở allowlist; STEP-05 cập nhật fence theo composition mới |
| `RISK-08` | Fixture URGENT bị Tier 2 lấy từ `overview.topPaid` thật → trộn data live | DEC-06 + AC-01 enforce `id` prefix `preview-urgent-...` để không trùng. Tier 2 source review fixture là hardcode literal |

## 8. Open Questions

None — Tier 0 review r1 đã chốt 3 câu hỏi (B4 sang AV1, fetch riêng OK, read API sang AV1). Owner đã chốt B1–B11 trong `docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md` + `evidence/OWNER_APPROVAL_REQUIRED.md`. Plan Admin V6 mapping đã chốt ở `evidence/plan-admin-v6.md` §2.

## 9. Planner Resolution

Tier 1 append sau mỗi round.

| Round | Decision | Reason |
|---|---|---|
| Round 0 (planning) | Tier 1 soạn `TASK.md` v1.0 với scope lẫn lộn UI/backend (schema + permission + read API trong Plan B) | Tier 0 chỉ thị mới 10/09/2026 + skeleton B + field-matrix §6–§9 + plan-admin-v6 §2. |
| Round 1 (closeout) | Tier 0 verdict REVISION_REQUIRED: Plan B = UI thuần. Tier 1 sửa theo verdict: (1) lane CRITICAL → STANDARD/FOCUSED. (2) bỏ schema, permission catalog/seed, read API `GET /api/admin/homepage-settings`, write API, Admin settings page, listingPageSize injection, view-model `HomepageSettingsView` — toàn bộ sang AV1 implementation task. (3) B4: tab URGENT dùng fixture preview (INTEGRATION_PENDING marker) — KHÔNG gửi `urgency=URGENT` query lên server. (4) BestJobs fetch riêng qua `/api/jobs` hiện có cho tab Tất cả, KHÔNG dùng `overview.newest.slice(0, 3)` làm nguồn phân trang. (5) BestJobs pageSize = 9 hardcode literal truyền qua prop `pageSize: number = 9`. (6) Baseline reference = `d3add63` (TASK A ACCEPTED). Bump v1.1 → READY_FOR_EXECUTION. verify-task DRAFT-VALID | Tier 0 verdict REVISION_REQUIRED r1 — `evidence/tier0-review-task-b-v1.md`. |
| Round 2 (sau execution) | Tier 2 thi công → verify-task PASS → verify-handoff PASS → Tier 3 FOCUSED audit → /resolve → push → Owner live visual review post-deploy | per §0 Next gate |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-09-10 (Tier 1) | Initial TASK B — scope lẫn lộn UI/backend (CRITICAL lane, DEEP audit) | Tier 0 chỉ thị + skeleton B + field-matrix §6–§9 + plan-admin-v6 §2 (AV1 mapping). |
| `v1.1` | 2026-09-10 (Tier 1) | Closeout theo Tier 0 review r1 (REVISION_REQUIRED). Plan B thuần UI: lane STANDARD/FOCUSED. Bỏ schema, permission, read API, write API, Admin settings page, listingPageSize injection, view-model — sang AV1. B4: tab URGENT dùng fixture preview (KHÔNG gửi `urgency=URGENT` lên server). BestJobs fetch riêng qua `/api/jobs` hiện có (KHÔNG dùng `overview.newest.slice(0, 3)`). BestJobs pageSize = 9 hardcode literal truyền qua prop. Baseline reference = `d3add63` (TASK A ACCEPTED). Bump v1.1 → READY_FOR_EXECUTION | Tier 0 verdict REVISION_REQUIRED r1. |

## 11. Owner Baseline-aware Resolution (OBR)

### OBR-01 — Baseline reference + execution HEAD

- Source reference = `d3add63` (TASK A ACCEPTED HEAD). Dùng để đối chiếu scope TASK A đã chấp nhận. KHÔNG `git checkout`; chỉ đo `git show d3add63 -- file` khi cần
- UI-03 source reference `4d9a633` vẫn áp dụng cho field parity (DTO contract)
- Execution HEAD: đo ngay trước STEP-01 bằng `git rev-parse HEAD` → `evidence/exec-head-before.txt`. Tier 2 dùng để so diff
- Baseline expected unit failure set: chạy `npm run test:unit --reporter=json 2>evidence/test-unit-before.json` LÚC exec-head-before, hash số failing tests → `evidence/expected-failure-set-before.txt`
- `git status --porcelain` tại exec-head-before → `evidence/working-tree-before.txt`. Mọi dirty file ngoài §1.3 dirty set là non-task (foreign), KHÔNG FAIL
- **Allow create/edit HANDOFF + `evidence/**`** trong `docs/tasks/hrp-v6-ui-04b-pagination-admin/**` (DEC-13). OBR-01 chỉ cảnh báo path ngoài allowlist OBR-02 chứ KHÔNG cấm mọi file chưa tồn tại trong baseline-manifest
- `git diff --name-only [exec-head-before]..HEAD` cuối round vs baseline = KHÔNG có path mới ngoài allowlist OBR-02

### OBR-02 — Allowlist Sửa (paths Tier 2 được phép tạo/sửa)

| Path | Quyền | Ghi chú |
|---|---|---|
| `app/(portal)/page.tsx` | Sửa (state bestJobsTab + bestJobsOffset + fetch riêng + tab URGENT dùng fixture; KHÔNG đổi Hero search card wrapper từ TASK A) | STEP-04 RQ-01, RQ-02 |
| `src/domains/job-board/components/landing/best-jobs-section.tsx` | Sửa (tab pill + pagination control + props refactor; giữ container 1200px từ TASK A) | STEP-03 RQ-01, RQ-02, RQ-05, RQ-06 |
| `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` | Tạo mới | STEP-02 RQ-03, RQ-04 |
| `src/domains/job-board/public-ui-premium.static.test.ts` | Sửa (fence) | STEP-05 DEC-14 |
| `src/domains/job-board/public-ui-token-parity.static.test.ts` | Sửa (fence) | STEP-05 DEC-14 |
| `src/domains/applications/marketplace-inventory.static.test.ts` | Sửa (fence) | STEP-05 DEC-14 |
| `src/domains/job-board/public-card-truth.test.ts` | Sửa (fence) | STEP-05 DEC-14 |
| `docs/tasks/hrp-v6-ui-04b-pagination-admin/**` | Tạo + Sửa | HANDOFF + evidence + planning artifacts do Tier 2 tạo |
| `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**` | **KHÔNG** sửa (Tier 1 plane) | DEC-10; Tier 2 phát hiện cần sửa → halt, báo Tier 1 |
| `prisma/**` | **KHÔNG** sửa (sang AV1) | Tier 0 §2.3 r1 — DEC-08 |
| `src/shared/auth/permission-catalog.ts` | **KHÔNG** sửa (sang AV1) | Tier 0 §2.3 r1 — DEC-08 |
| `prisma/seed.mjs` | **KHÔNG** sửa (sang AV1) | Tier 0 §2.3 r1 — DEC-08 |
| `app/api/admin/homepage-settings/**` | **KHÔNG** tạo (sang AV1) | Tier 0 §2.3 r1 — DEC-08 |
| `app/api/jobs/route.ts` | **KHÔNG** sửa (B4 sang AV1 — KHÔNG mở `urgency`) | Tier 0 §2.1 r1 — DEC-01 |
| `src/domains/job-board/public.service.ts` | **KHÔNG** sửa | DEC-08; KHÔNG đổi `listPublicJobProjection` |
| `src/domains/job-board/public-settings.service.ts` | **KHÔNG** tạo (sang AV1) | DEC-08 |
| `src/domains/job-board/public-types.ts` | **KHÔNG** tạo (sang AV1) | DEC-08 |
| `app/(jobs)/viec-lam/page.tsx` | **KHÔNG** sửa (listingPageSize sang AV1) | Tier 0 §2.3 r1 — DEC-09 |
| `app/globals.css` | **KHÔNG** sửa (Tier 2 dùng token hiện hữu) | DEC-09 (closeout v1.1); không thêm class mới |
| `app/admin/**` | **KHÔNG** sửa (sang AV1) | DEC-08 |
| (mọi path khác) | **KHÔNG** sửa | OBR-01 cảnh báo; Tier 2 halt, escalate Tier 1 |

### OBR-03 — Anti-scope-creep

- Tier 2 không tự ý thêm path mới vào allowlist; nếu cần, mở correction round
- Mọi file mới: Tier 2 chỉ tạo trong `docs/tasks/hrp-v6-ui-04b-pagination-admin/evidence/**` + `HANDOFF.md` + fixture file `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts`
- Tier 2 KHÔNG commit/push/deploy — Tier 1 có quyền đó sau khi đạt gate READY_FOR_AUDIT + Tier 3 PASS
- Plan B thuần UI — Tier 2 nếu phát hiện cần backend (schema/permission/API) → halt, báo Tier 1 mở AV1-TASK
