# TASK — `hrp-t2-public-paging-tone-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t2-public-paging-tone-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `HOTFIX` (UI + bug pagination) |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Public site hotfix; no auth/RLS/migration; no shared-component churn beyond 4 in-scope files. Standard lane default = NONE. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `ffef0c4628fccd383cb7148349f53e771e3a8d9d` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| Execution round | `1` |
| In-scope roots | `src/domains/job-board/public-listing.params.ts`, `app/(jobs)/viec-lam/page.tsx`, `app/components/GlobalNavbar.tsx`, `src/domains/job-board/components/landing/hero.tsx`, `src/domains/job-board/public-listing.params.test.ts`, new `app/(jobs)/viec-lam/__tests__/pagination-integration.test.ts` |
| Forbidden paths | `prisma/schema.prisma`, `prisma/migrations/**`, `app/api/**`, `src/domains/job-board/public.service.ts` (logic OK; chỉ đổi nơi parse/searchParams), `app/(portal)/page.tsx` (Hero caller chỉ sửa `hero.tsx` wrapper, không đổi portal page), `app/globals.css` (CHỈ đổi nếu cần thêm 1 CSS var, Tier 1 duyệt trước), các file UI khác (footer, search-section, areas-section, ...) |
| Required gates | `pnpm test:unit` (chỉ chạy test liên quan + full unit suite); `pnpm typecheck`; `pnpm lint`; `pwsh .ai-pipeline/scripts/verify-encoding.ps1`; `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t2-public-paging-tone-hotfix/TASK.md`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-t2-public-paging-tone-hotfix/HANDOFF.md` |
| Visual gate | Tier 0 (Owner) live review post-deploy |
| Carrier | Không (no successor task) |

## 1. Outcome

### 1.1 User-visible outcome

Sau khi deploy lên production:

1. **Pagination /viec-lam hoạt động đúng** với mọi giá trị `listingPageSize` (6..50):
   - User click nút "Sau" / "Trang N" → URL đổi sang `?offset=` với offset bằng `(N-1) * pageSize`; page render jobs của trang N (khác trang 1)
   - User click "Trước" → URL giảm offset; page render đúng
   - Khi chuyển trang, các bộ lọc `q` / `area` / `shift` đang chọn được giữ nguyên trong URL
   - URL chia sẻ được (paste vào tab mới = cùng trang + cùng filter)
   - Khi reload `/viec-lam?q=abc&offset=20` thì page render jobs của trang 2 với filter `q=abc`

2. **Nút "Ứng tuyển" trong thẻ việc làm (`JobCard`)** dùng tone cam/nâu brand nhất quán:
   - Default: `bg-primary-dark` (#a63b00 — cam đậm/nâu) — khớp với màu title job (`var(--color-primary-dark)`)
   - Hover: đậm hơn một bậc, vẫn tone cam/nâu (vd: `bg-primary` cam sáng #f26522) — KHÔNG chuyển sang đen
   - Active/focus/disabled: đều trong họ cam/nâu brand, không rơi về xám/đen

3. **Hero + khu vực tìm kiếm dịu hơn** về độ rực:
   - Hero gradient bớt saturated (vd: từ 3 tông cam đậm sang 2 tông có primary-container + primary-fixed)
   - Search card giữ `bg-white` (đã đúng), có thể thêm border subtle nếu cần
   - Brand cam HRP vẫn nhận diện được; contrast chữ vẫn đạt WCAG AA

4. **Nút "Đăng ký" trên Navbar** gọn hơn, cân với menu:
   - Desktop: padding/height nhỏ lại (vd: `px-3 min-h-9` thay vì `px-5 min-h-11`), vẫn giữ `font-semibold` và label "Đăng ký"
   - Mobile: tương tự (`px-3 min-h-9` thay vì `px-4 min-h-11`)
   - Không thay đổi token màu (vẫn `var(--color-primary)` bg + `var(--color-on-primary)` text), chỉ thu nhỏ hình học

### 1.2 Non-goals

- KHÔNG thêm theme switcher / dark mode / light mode toggle trong hotfix này
- KHÔNG đổi schema Prisma, không migration, không backfill
- KHÔNG thêm dependency mới (giữ nguyên stack Tailwind v4 + tokens hiện có)
- KHÔNG thay đổi `src/domains/job-board/public.service.ts` (service logic đã đúng; bug nằm ở parser)
- KHÔNG refactor JobCard layout structure (giữ skeleton R3: header 2-col + body + footer; chỉ đổi color tokens)
- KHÔNG đổi Navbar menu items, chỉ thu nhỏ "Đăng ký" button
- KHÔNG đổi Hero copy, headline, search form fields; chỉ đổi gradient background

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | User report: "Hiện người dùng chỉ xem được trang 1; bấm trang 2 không chuyển" | Bug #1 reproducible narrative |
| `EV-02` | `src/domains/job-board/public-listing.params.ts:60` — `cleanOffset` returns `Math.floor(parsed / PAGE_SIZE) * PAGE_SIZE` with `PAGE_SIZE = 20` (hard-coded) | **Root cause #1**: parser kéo offset về bội của 20, nhưng `listingPageSize` runtime có thể là 6-50 (default 12) |
| `EV-03` | `src/domains/job-board/public-types.ts:89` — `LISTING_PAGE_SIZE_DEFAULT = 12`; line 130 `clampListingPageSize` returns value in [6, 50] | Runtime page size ≠ hard-coded PAGE_SIZE=20 |
| `EV-04` | `app/(jobs)/viec-lam/page.tsx:432` — `pageHref(n) = buildListingHref(params, (n-1) * listingPageSize)` | UI generates href với dynamic `listingPageSize`, mismatch với parser |
| `EV-05` | `app/(jobs)/viec-lam/page.tsx:381` — `currentPage = Math.floor(params.offset / listingPageSize) + 1`; line 402 `totalPages = Math.ceil(total / listingPageSize)` | Page numbering dùng dynamic size, càng lộ bug parser |
| `EV-06` | `src/domains/job-board/public-listing.params.test.ts:80-89` — test `cleanOffset` only with `PAGE_SIZE=20` cases (`25→20`, `19→0`, `41→40`, `40→40`); KHÔNG có test nào verify với `listingPageSize=12` | Test coverage gap; không bắt được bug |
| `EV-07` | `app/(jobs)/viec-lam/page.tsx:365-370` — JobCard "Ứng tuyển" button: `bg-primary text-white hover:bg-primary-dark` | **Root cause #2a**: default `bg-primary` quá rực, không semantic-aligned với title job color (`var(--color-primary-dark)` at line 308) |
| `EV-08` | `app/globals.css:11` — `--color-primary: #f26522` (cam rực), `--color-primary-dark: #a63b00` (cam đậm/nâu, WCAG AA) | Color tokens available; #a63b00 đạt contrast 5.83-6.47:1 trên các nền body/card |
| `EV-09` | `src/domains/job-board/components/landing/hero.tsx:11` — `bg-gradient-to-br from-primary-dark via-primary to-primary-fixed` | **Root cause #2b**: 3 tone cam đậm gradient → rất rực |
| `EV-10` | `app/components/GlobalNavbar.tsx:258-267` — desktop "Đăng ký" button: `px-5 min-h-11`; line 381-391 — mobile: `px-4 min-h-11` | **Root cause #3**: button height 44px trong navbar `h-16` (64px) — chiếm 69% navbar, quá to so với nav links 16px text |
| `EV-11` | `app/components/GlobalNavbar.tsx:250-268` — "Đăng ký" uses token `var(--color-primary)` bg + `var(--color-on-primary)` text | Color tokens đã đúng; chỉ cần thu nhỏ geometry |
| `EV-12` | `app/globals.css:8-12` — `--color-primary`, `--color-primary-dark`, `--color-primary-soft` available; line 340-365 `.hrp-btn-primary` uses `var(--color-primary-dark)` | Tokens & `.hrp-btn-primary` class đã có; JobCard nên dùng `.hrp-btn-primary` thay vì `bg-primary` raw |
| `EV-13` | `src/domains/job-board/public-listing.params.test.ts:178-219` — describe block "RQ-05/AC-06 — phân trang giữ nguyên bộ lọc ở ba mốc offset" đã verify Prev/Next href generation; test buildListingHref với PAGE_SIZE=20 | Existing test suite covers URL builder; chỉ gap là parser+pageSize integration |
| `EV-14` | `app/(jobs)/viec-lam/page.tsx:183-187` — FilterForm `action={LISTING_PATH}` `method="get"` (server-rendered form); page renders Prev/Next as Next.js `Link` (client navigation) | URL flow đúng; chỉ thiếu parser robustness |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | **Root cause #1 fix**: Tách `PAGE_SIZE` constant trong `public-listing.params.ts` thành EXPORTED function `cleanOffset(raw, pageSize)`; page.tsx truyền `listingPageSize` (đã load từ settings) xuống. Parser KHÔNG còn dùng hard-coded `PAGE_SIZE=20` cho offset rounding. | `OWNER_DECIDED` (chốt từ user requirement) |
| `DEC-02` | **Regression test #1**: thêm file `app/(jobs)/viec-lam/__tests__/pagination-integration.test.ts` test hàm buildListingHref với `listingPageSize=12` → verify `?offset=12` không bị kéo về 0 bởi parser. Unit test với `cleanOffset(raw, 12)` cho `12→12`, `24→24`, `7→0`, `30→24`. | `TIER_1_DECIDED` |
| `DEC-03` | **Root cause #2a fix (Ứng tuyển button)**: đổi default class từ `bg-primary hover:bg-primary-dark` sang `bg-primary-dark hover:bg-primary` để tone khớp với title color (`var(--color-primary-dark)`), hover tăng saturation một bậc (vẫn cam brand). KHÔNG dùng `.hrp-btn-primary` class vì button này inline trong JobCard, không có padding chuẩn của button primary. | `TIER_1_DECIDED` |
| `DEC-04` | **Root cause #2b fix (Hero gradient)**: đổi `from-primary-dark via-primary to-primary-fixed` → `from-primary-container to-primary-fixed` (2 tone thay vì 3, primary-container #a63b00 đậm hơn, primary-fixed #ffdbce nhạt). Giữ brand cam nhận diện, giảm saturation tổng. Có thể thêm `opacity-95` cho các blob blur nếu quá rực. | `TIER_1_DECIDED` |
| `DEC-05` | **Root cause #3 fix (Đăng ký button)**: desktop `px-5 min-h-11` → `px-3 min-h-9`; mobile `px-4 min-h-11` → `px-3 min-h-9`. Giữ `font-semibold` (font weight), giữ label "Đăng ký". Giữ nguyên color tokens. | `OWNER_DECIDED` (constraint "giữ nguyên cỡ chữ và nhãn") |
| `DEC-06` | **Scope guard**: KHÔNG thay đổi `public.service.ts` (service logic đúng, chỉ parser sai). KHÔNG mở schema, KHÔNG migration. KHÔNG touch `app/(portal)/page.tsx` (chỉ sửa `hero.tsx` wrapper mà portal page dùng). | `TIER_1_DECIDED` |
| `DEC-07` | **Test cho visual changes**: tier 0 visual review sau khi deploy. Không cần test tự động cho color tokens (đã covered bởi design-tokens.static.test.ts). | `TIER_1_DECIDED` |
| `DEC-08` | **Backward compat `PAGE_SIZE` export**: giữ `export const PAGE_SIZE = 20` để các caller khác (nếu có) không break; CHỈ đổi nội bộ `cleanOffset` để nhận `pageSize` parameter. | `TIER_1_DECIDED` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `src/domains/job-board/public-listing.params.ts`: `cleanOffset(raw, pageSize: number)` thay vì `cleanOffset(raw)`. Logic: `Math.floor(parsed / pageSize) * pageSize` thay vì `PAGE_SIZE=20`. Export signature mới. |
| `RQ-02` | `app/(jobs)/viec-lam/page.tsx`: `parseListingSearchParams(await searchParams, listingPageSize)` truyền `listingPageSize` từ loadListing (đã có sẵn ở line 130). Có thể cần refactor: loadListing return cả `listingPageSize` rồi page.tsx pass xuống parseListingSearchParams. |
| `RQ-03` | `app/(jobs)/viec-lam/page.tsx:482-557` (pagination nav): render Prev/Next/page numbers dựa trên `params.offset` (sau khi parser fix) + `listingPageSize` (đã có) → click page 2 thực sự load jobs của trang 2. |
| `RQ-04` | `app/(jobs)/viec-lam/page.tsx:365-370` (JobCard Ứng tuyển button): đổi `bg-primary hover:bg-primary-dark` → `bg-primary-dark hover:bg-primary`. Tone cam/nâu brand, không rơi về đen/xám ở bất kỳ trạng thái nào. |
| `RQ-05` | `src/domains/job-board/components/landing/hero.tsx:11`: đổi `bg-gradient-to-br from-primary-dark via-primary to-primary-fixed` → `bg-gradient-to-br from-primary-container to-primary-fixed` (hoặc 2 tone khác cùng giảm saturation). Search form wrapper giữ `bg-white` (đã đúng). |
| `RQ-06` | `app/components/GlobalNavbar.tsx:258-267` (desktop Đăng ký): đổi `px-5 min-h-11` → `px-3 min-h-9`. Giữ `font-semibold`, giữ label, giữ color tokens. |
| `RQ-07` | `app/components/GlobalNavbar.tsx:381-391` (mobile Đăng ký): đổi `px-4 min-h-11` → `px-3 min-h-9`. Cùng logic. |
| `RQ-08` | **Regression test #1**: thêm `app/(jobs)/viec-lam/__tests__/pagination-integration.test.ts` test integration giữa `parseListingSearchParams(raw, 12)` + `buildListingHref(params, offset)` + pageHref round-trip. Verify: URL `?offset=12` với `pageSize=12` → parse offset=12 → buildHref round-trip giữ nguyên offset. |
| `RQ-09` | **Regression test #2**: update `src/domains/job-board/public-listing.params.test.ts` cho `cleanOffset` — thêm test cases với `pageSize=12` (`12→12`, `24→24`, `7→0`, `30→24`, `100→96`). KHÔNG xóa test cũ với PAGE_SIZE=20 (backward compat). |
| `RQ-10` | **Gates**: `pnpm test:unit` pass; `pnpm typecheck` exit 0; `pnpm lint` exit 0 (chỉ warn cũ); `verify-encoding.ps1` pass; `verify-task.ps1` PASS; `verify-handoff.ps1` PASS. |
| `RQ-11` | **Visual gate**: Tier 0 review sau deploy. 3 surface (Hero, JobCard, Navbar Đăng ký) đều nhẹ mắt hơn, brand cam vẫn nhận diện, contrast đạt WCAG AA. |

### 4.2 Scope boundaries

- **In-scope**: 4 in-scope roots + 2 test files
- **Out-of-scope**: schema/migration, API routes, service layer (public.service.ts), các UI components khác
- **No new dep**: giữ nguyên stack Tailwind v4 + CSS var tokens hiện có

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | Baseline | `git rev-parse HEAD` → `evidence/baseline.txt`; `git status --porcelain` → `evidence/working-tree-before.txt` | shell | working tree dirty → halt |
| `STEP-02` | `public-listing.params.ts` | Đổi `cleanOffset(raw, pageSize: number)` signature; thay `PAGE_SIZE` constant cũ bằng `pageSize` parameter | rg | nếu `PAGE_SIZE = 20` còn dùng trong cleanOffset → halt |
| `STEP-03` | `public-listing.params.ts` | Update `parseListingSearchParams(raw, pageSize: number)` signature; default pageSize = 20 (backward compat cho caller khác nếu có) | rg + typecheck | caller chưa update → halt |
| `STEP-04` | `app/(jobs)/viec-lam/page.tsx` | Pass `listingPageSize` xuống `parseListingSearchParams`; `loadListing` return `{ data, listingPageSize }` (đã có) | rg + typecheck | nếu `loadListing` return shape đổi → halt |
| `STEP-05` | `public-listing.params.test.ts` | Thêm test cases cho `cleanOffset(raw, 12)` với các giá trị 12, 24, 7, 30, 100. KHÔNG xóa test cũ. | npm test:unit | new failure > 0 → halt |
| `STEP-06` | `app/(jobs)/viec-lam/__tests__/pagination-integration.test.ts` (NEW) | Test round-trip: buildListingHref với pageSize=12 → URL `?offset=12` → parseListingSearchParams(raw, 12) → offset=12. Plus: total=100, currentPage math đúng. Plus: filter retention khi đổi trang. | npm test:unit | new failure > 0 → halt |
| `STEP-07` | `app/(jobs)/viec-lam/page.tsx:365-370` JobCard Ứng tuyển | Đổi className: `bg-primary text-white hover:bg-primary-dark` → `bg-primary-dark text-white hover:bg-primary` | rg | class cũ còn → halt |
| `STEP-08` | `src/domains/job-board/components/landing/hero.tsx:11` | Đổi `from-primary-dark via-primary to-primary-fixed` → `from-primary-container to-primary-fixed` | rg | gradient cũ còn → halt |
| `STEP-09` | `app/components/GlobalNavbar.tsx:258-267` desktop | Đổi `px-5 min-h-11` → `px-3 min-h-9` | rg | class cũ còn → halt |
| `STEP-10` | `app/components/GlobalNavbar.tsx:381-391` mobile | Đổi `px-4 min-h-11` → `px-3 min-h-9` | rg | class cũ còn → halt |
| `STEP-11` | Gates | `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` (full unit suite), `verify-encoding.ps1` | shell | gate fail → halt |
| `STEP-12` | Verify task/handoff | `verify-task.ps1`, `verify-handoff.ps1` | shell | fail → halt |
| `STEP-13` | Commit | git commit, doc only + source files | shell | — |
| `STEP-14` | HANDOFF | Viết `docs/tasks/hrp-t2-public-paging-tone-hotfix/HANDOFF.md` với: root cause evidence, file diff, test results, AC table | shell | — |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification |
|---|---|---|
| `AC-01` | Bug #1 fixed: `parseListingSearchParams(raw, 12)` parse `offset=12` → `offset: 12` (không về 0) | `pnpm test:unit` regression test pass; manual `parseListingSearchParams({offset: '12'}, 12).offset === 12` |
| `AC-02` | Click "Trang 2" từ `/viec-lam` → URL `/viec-lam?offset=12` (với listingPageSize=12) | `pnpm test` integration test round-trip + manual browser DevTools verify URL |
| `AC-03` | Khi chuyển trang, filter `q`/`area`/`shift` giữ nguyên | `pnpm test` regression test pass; manual browser verify URL không mất param filter |
| `AC-04` | URL shareable: paste `/viec-lam?q=abc&offset=12` vào tab mới → cùng page + filter | manual browser DevTools reproduce |
| `AC-05` | JobCard Ứng tuyển button dùng `bg-primary-dark` default, `hover:bg-primary` | `rg "bg-primary-dark.*hover:bg-primary"` trong JobCard |
| `AC-06` | JobCard Ứng tuyển button KHÔNG chuyển sang đen ở bất kỳ state nào (default/hover/focus/active/disabled) | `rg "bg-gray\|bg-slate\|bg-black\|text-black" app/(jobs)/viec-lam/page.tsx` expect 0 match (chỉ trong phần Ứng tuyển button) |
| `AC-07` | Hero gradient 2-tone thay vì 3-tone cam đậm | `rg "from-primary-container to-primary-fixed"` |
| `AC-08` | Hero vẫn brand cam HRP, contrast text vẫn WCAG AA | manual review; existing contrast tests pass |
| `AC-09` | Navbar Đăng ký desktop: `px-3 min-h-9` | `rg "px-3 min-h-9" app/components/GlobalNavbar.tsx` expect ≥1 match |
| `AC-10` | Navbar Đăng ký mobile: `px-3 min-h-9` | `rg "px-3 min-h-9" app/components/GlobalNavbar.tsx` expect ≥2 match (desktop + mobile) |
| `AC-11` | Navbar Đăng ký vẫn `font-semibold` + label "Đăng ký" | `rg "font-semibold" app/components/GlobalNavbar.tsx` && `rg "Đăng ký" app/components/GlobalNavbar.tsx` |
| `AC-12` | Gates: typecheck, lint, unit suite, verify-encoding, verify-task, verify-handoff đều PASS | `pnpm typecheck && pnpm lint && pnpm test && node .ai-pipeline/scripts/verify-encoding.mjs && pwsh .ai-pipeline/scripts/verify-task.ps1` |
| `AC-13` | Regression test mới (pagination-integration.test.ts) cover round-trip + filter retention | `npx vitest run app/(jobs)/viec-lam/__tests__/pagination-integration.test.ts` exit 0 |
| `AC-14` | Existing static test (public-listing.static.test.ts, public-listing.params.test.ts) không break | `npx vitest run src/domains/job-board/public-listing.static.test.ts src/domains/job-board/public-listing.params.test.ts` exit 0 |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-01`, `AC-13` |
| `RQ-02` | `STEP-03`, `STEP-04` | `AC-01`, `AC-02`, `AC-13` |
| `RQ-03` | `STEP-04` | `AC-02`, `AC-03`, `AC-04` |
| `RQ-04` | `STEP-07` | `AC-05`, `AC-06` |
| `RQ-05` | `STEP-08` | `AC-07`, `AC-08` |
| `RQ-06` | `STEP-09` | `AC-09`, `AC-11` |
| `RQ-07` | `STEP-10` | `AC-10`, `AC-11` |
| `RQ-08` | `STEP-06` | `AC-13` |
| `RQ-09` | `STEP-05` | `AC-14` |
| `RQ-10` | `STEP-11`, `STEP-12` | `AC-12` |
| `RQ-11` | `STEP-13` | `AC-12` |

## 7. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | `parseListingSearchParams` signature đổi → caller khác (nếu có) break | Default param `pageSize: number = PAGE_SIZE` (backward compat); test existing caller vẫn pass |
| `RISK-02` | JobCard hover state mới `hover:bg-primary` (#f26522 cam sáng) có thể hơi rực hơn default `bg-primary-dark` (#a63b00) | Mitigation: tier 0 visual review sau deploy; nếu cần adjust thì dùng `hover:bg-primary-container` (đậm hơn default) hoặc thêm opacity |
| `RISK-03` | Hero gradient 2-tone có thể mất chiều sâu so với 3-tone | Mitigation: thêm blob `bg-primary-fixed-dim` nếu cần depth; tier 0 review |
| `RISK-04` | Navbar Đăng ký thu nhỏ → có thể mất visual prominence | Mitigation: tier 0 review; nếu cần contrast hơn thì đổi từ `var(--color-primary)` sang `var(--color-primary-dark)` |
| `RISK-05` | `pnpm test:unit` full suite chạy lâu (220+ files) → step STEP-11 chậm | Mitigation: chạy targeted test trước (pagination, params, static), rồi full suite cuối |
| `RISK-06` | Working tree có pre-existing changes từ round khác | Mitigation: STEP-01 capture baseline + working tree before; STEP-11 git diff filter allowlist |
| `RISK-07` | `app/(jobs)/viec-lam/__tests__/pagination-integration.test.ts` mới cần test infrastructure có sẵn (vitest) | Mitigation: check vitest config ở root; dùng cùng pattern với `public-listing.params.test.ts` (describe + it + expect) |
| `RISK-08` | Tier 0 visual review fail → correction batch | Mitigation: correction budget = 1; gom tất cả visual fix vào 1 batch |

## 8. Open Questions

- **None.** Tất cả decision đã chốt. Tier 0 directive đã rõ (4 yêu cầu cụ thể). Tier 1 tự quyết technical detail (color token cụ thể, padding cụ thể) theo design token hiện có.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | `READY_TO_CODE` → execute `STEP-01..STEP-14` | Root cause #1..#4 đã identify rõ (EV-02, EV-07, EV-09, EV-10). Decision #1..#5 đã chốt. 4 file in-scope + 2 test file. Standard lane, audit NONE, correction budget 1. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-12 | Initial READY_TO_CODE | Hotfix 4 vấn đề: pagination bug + 3 UI tone issues. Tier 1 khảo sát root cause bằng codegraph, đọc 8 file liên quan, identify bug #1 ở `cleanOffset` cứng `PAGE_SIZE=20` không khớp với dynamic `listingPageSize`. |
