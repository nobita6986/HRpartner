# TASK — `hrp-v6-ui-04b-urgent-live-ribbon-r3`

> **Urgent live integration + compact ribbon R3** theo Tier 0 directive `docs/prompts/TIER0_UI04_URGENT_LIVE_AND_RIBBON_R3.md`.
> Owner live review (`codex-clipboard-f3251ba6-b04c-4170-af01-24caf7d145c7.png`) chỉ ra: (1) Tab Tuyển gấp còn badge "Preview / Backend chưa hỗ trợ" và fixture; (2) `pr-[72px]` ép tiêu đề hẹp; (3) Ribbon quá lớn và đặc. Tier 0 quyết định: kéo `/api/jobs?urgency=URGENT` lên ngay R3 thay vì đợi AV1.
> Scope: mở API urgency filter → thay fixture bằng live data → xóa Preview badge/banner → ribbon compact translucent.
> UI + API, STANDARD lane, FOCUSED audit. KHÔNG mở Admin/schema/pagination/permission/settings.
> Plan UI predecessor: Interaction R2 `ACCEPTED` (`55b27d2`) + composition/footer `ACCEPTED`.
> Plan UI successor: section-render (`hrp-v6-ui-04d-section-render`).

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04b-urgent-live-ribbon-r3` |
| Work type | `CODE` (API urgency filter + UI live tab + ribbon compact) |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Spec version | `v1.0` |
| Status | `DRAFT` (chờ composition/footer `ACCEPTED` → Tier 1 chuyển `READY_FOR_EXECUTION`) |
| Planner | `Tier 1` |
| Baseline | HEAD đầu round — `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt` |
| Source reference | R2 `ACCEPTED` (`55b27d2`) — featured-job-card.tsx (ribbon, pr-[72px]), composition `ACCEPTED` (1080px container), `app/api/jobs/route.ts` (current API), `public.service.ts` (current service) |
| Plan UI predecessor | Interaction R2 `ACCEPTED` (`55b27d2`) + composition/footer `ACCEPTED` |
| Plan UI successor | section-render (`hrp-v6-ui-04d-section-render`) — section-render chạy sau R3 ACCEPTED |
| In-scope roots | `app/api/jobs/route.ts`, `src/domains/job-board/public.service.ts`, `src/domains/job-board/components/landing/featured-job-card.tsx`, `app/(portal)/page.tsx`, `src/domains/job-board/components/landing/best-jobs-section.tsx`, `docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/**` |
| Forbidden paths | `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` (sẽ xóa — không sửa), `app/api/admin/**`, `prisma/**`, `src/shared/auth/permission-catalog.ts`, `app/admin/**`, `src/domains/job-board/components/landing/hero.tsx`, `src/domains/job-board/components/landing/areas-section.tsx`, `src/domains/job-board/components/landing/recruiting-projects-section.tsx`, `src/domains/job-board/components/landing/referral-strip.tsx`, `app/components/GlobalFooter.tsx`, `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`, `docs/tasks/hrp-v6-ui-04a-visual-polish/**`, `docs/tasks/hrp-v6-ui-04b-pagination-admin/**`, `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/**`, `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/**`, `docs/tasks/hrp-v6-ui-04c-home-composition-footer/**`, `docs/tasks/hrp-v6-ui-04d-section-render/**` |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set với baseline + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; Tier 3 FOCUSED audit PASS |
| Visual gate | Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG Lighthouse/axe-core auto-install |
| Current execution round | `0` (v1.0 DRAFT) |
| Next gate | Sửa contract → `verify-task.ps1` PASS → Chờ composition/footer `ACCEPTED` → Tier 1 chuyển `READY_FOR_EXECUTION` → Tier 2 thi công → Tier 3 FOCUSED audit → Owner live visual review → ACCEPTED → section-render `READY_FOR_EXECUTION` |

## 1. Outcome

### 1.1 User-visible outcome

**Tab "Tuyển gấp" dùng dữ liệu thật từ database:**
- Tab "Tất cả" gọi `/api/jobs` (không đổi)
- Tab "Tuyển gấp" gọi `/api/jobs?urgency=URGENT&limit=9&offset=...`
- Xóa toàn bộ "Preview" badge, "Preview / Backend chưa hỗ trợ" banner, fixture rows
- Empty state: "Hiện chưa có việc tuyển gấp."
- Quick Apply mở ApplyModal thật cho job thật
- Pagination prev/next hoạt động khi `total > pageSize`
- Switching tab nhanh không bị stale response ghi đè

**Ribbon compact + translucent:**
- Xóa `pr-[72px]` khỏi title wrapper — tiêu đề nhận full width
- Ribbon cao ~24–28px, icon ~12–14px, label ~11–12px, padding ngang ~8px
- Nền cam 70–80% trong suốt (content thấy mờ qua ribbon)
- `pointer-events-none` — không chiếm layout
- Tiêu đề dài tiếng Việt ở container 1080px: không bị cắt, không overflow ngang

**Không thu nhỏ:**
- Font tiêu đề job, logo, location, salary/CTA area giữ nguyên
- Card không bị squeeze

### 1.2 Non-goals

- KHÔNG tạo endpoint mới — mở rộng `GET /api/jobs`
- KHÔNG filter `CLOSING` (chỉ `URGENT`)
- KHÔNG sửa Admin/schema/permission/HomepageSettings
- KHÔNG pagination riêng cho URGENT tab (dùng chung limit/offset)
- KHÔNG sửa Hero, Areas, Recruiting, ReferralStrip, Footer
- KHÔNG revert CTA flip, hover readability, 1080px composition, mobile, reduced-motion

### 1.3 Plan UI split reminder

| Công việc | Thuộc plan | Trạng thái |
|---|---|---|
| Job-card interaction R2 (VIS-04/05) | Interaction R2 | `ACCEPTED` (`55b27d2`) |
| Composition/footer (VIS-06 1080px) | Composition v1.4 | `ACCEPTED` (composition đang chạy) |
| **Urgent live + ribbon compact R3 (task này)** | **R3** | **DRAFT** |
| Sections 5 mới | section-render | `READY_FOR_EXECUTION` |
| Backend (HomepageSettings, permission, write API, Admin) | Plan Admin V6 AV1 | DRAFT |
| JobPosting editor | Plan Admin V6 AV2 | DRAFT |
| Detail page UI | Plan D.A | DRAFT |

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/api/jobs/route.ts` | API hiện parse `q`, `area`, `shift`, `shiftType`, `jobType`, `offset`, `limit` — chưa parse `urgency` |
| `EV-02` | `src/domains/job-board/public.service.ts:574` | `listPublicJobProjection` nhận opts không có urgency; pagination dùng `slice(offset, offset + limit)` |
| `EV-03` | `app/(portal)/page.tsx:15` | Import `BEST_JOBS_URGENT_PREVIEW`; tab urgent dùng fixture |
| `EV-04` | `app/(portal)/page.tsx:302` | `urgentPreviewBadge="Preview"`; line 191 `bestJobsTab === 'all' ? bestJobsData.jobs : BEST_JOBS_URGENT_PREVIEW` |
| `EV-05` | `best-jobs-section.tsx:128-133` | Banner "Preview / Backend chưa hỗ trợ" |
| `EV-06` | `featured-job-card.tsx:79` | `pr-[72px]` khi `badgeType === 'urgent'` |
| `EV-07` | `featured-job-card.tsx:54-55` | Ribbon solid `bg-primary-container` cao, không translucent |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Mở rộng `GET /api/jobs` — thêm query param `urgency`. Chỉ chấp nhận giá trị `URGENT`; giá trị khác (non-empty, không phải `URGENT`) trả 400. Không có param → giữ behavior hiện tại (byte-compatible). Không tạo endpoint mới | `CHOSEN` |
| `DEC-02` | Filter `urgency=URGENT` xảy ra TRƯỚC khi tính `total`, `nextOffset` và `slice(offset, limit)`. Dùng `job.urgency === 'URGENT'` đã có trong `PublicJobDto` | `CHOSEN` |
| `DEC-03` | Tab "Tuyển gấp" gọi `/api/jobs?urgency=URGENT&limit=9&offset=...` (limit=9 cho URGENT, khác unfiltered tab) | `CHOSEN` |
| `DEC-04` | Xóa import `BEST_JOBS_URGENT_PREVIEW` khỏi `app/(portal)/page.tsx`. Xóa `urgentPreviewBadge` prop. Xóa banner "Preview / Backend chưa hỗ trợ" khỏi `best-jobs-section.tsx`. Xóa `best-jobs-urgent-preview.ts` (sau khi xóa import xong) | `CHOSEN` |
| `DEC-05` | Empty state URGENT: "Hiện chưa có việc tuyển gấp." — chỉ hiện khi `jobs.length === 0` | `CHOSEN` |
| `DEC-06` | Chỉ tab "Tất cả" update global `facets` và `overview` của homepage. URGENT response KHÔNG thay thế Hero/Areas/Recruiting totals | `CHOSEN` |
| `DEC-07` | Race-safe: khi switch tab, reset offset về 0. Dùng tab-specific data state (không share state giữa tabs) | `CHOSEN` |
| `DEC-08` | URGENT tab pagination: prev/next hoạt động khi `total > limit`. Empty state khi `total === 0` | `CHOSEN` |
| `DEC-09` | Xóa `pr-[72px]` khỏi title wrapper. Ribbon trở thành `pointer-events-none` overlay, không push content | `CHOSEN` |
| `DEC-10` | Ribbon compact: cao ~24–28px, icon ~12–14px, label ~11–12px, padding ngang ~8px, border-radius bottom-left nhỏ. Nền dùng `bg-primary/80` hoặc semantic equivalent alpha 70–80%. `pointer-events-none` | `CHOSEN` |
| `DEC-11` | Tier 1 owns TASK.md; Tier 2 owns HANDOFF + evidence + source/test allowlist. Tier 2 KHÔNG sửa TASK.md, KHÔNG sửa plan cha | `CHOSEN` |
| `DEC-12` | Baseline = HEAD đầu round (Tier 2 đo `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt`). Expected unit failure set capture tại exec-head-before | `CHOSEN` |
| `DEC-13` | Visual parity = Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG fail vì thiếu screenshot | `CHOSEN` |
| `DEC-14` | Tier 3 FOCUSED audit sau khi Tier 2 xong. Audit focus: API query validation (urgency=URGENT → 400 cho giá trị khác), filter-before-pagination, request race isolation, removal of fixture runtime, ribbon layout, regression | `CHOSEN` |
| `DEC-15` | OBR-01 cho phép tạo HANDOFF + `evidence/**` + sửa các file in-scope. KHÔNG cấm file mới trong §0 In-scope roots | `CHOSEN` |
| `DEC-16` | AV1 ghi nhận URGENT filter đã được kéo lên R3. AV1 giữ HomepageSettings/Admin configuration ownership | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `GET /api/jobs?urgency=URGENT` trả về chỉ các job có `urgency === 'URGENT'`. `total` và `nextOffset` mô tả tập đã lọc. Filter xảy ra TRƯỚC pagination (`slice`). Dùng `PublicJobDto.urgency` đã có, không query mới. Không tạo endpoint mới |
| `RQ-02` | `GET /api/jobs?urgency=<invalid>` (non-empty, không phải `URGENT`) trả 400 với body mô tả lỗi. Không có param → giữ behavior hiện tại (không affect) |
| `RQ-03` | Homepage production source KHÔNG còn import `BEST_JOBS_URGENT_PREVIEW`. Tab "Tuyển gấp" gọi `/api/jobs?urgency=URGENT&limit=9&offset=...`. Không còn `Preview` badge, `Preview / Backend chưa hỗ trợ` banner, hoặc fixture rows trong production UI |
| `RQ-04` | Tab switching race-safe: switch tab reset offset về 0; dùng tab-specific state; stale response không ghi đè active tab |
| `RQ-05` | URGENT tab empty state: "Hiện chưa có việc tuyển gấp." chỉ hiện khi `jobs.length === 0` |
| `RQ-06` | URGENT tab pagination: prev/next hoạt động khi `total > limit`; `nextOffset` đúng cho filtered set |
| `RQ-07` | Chỉ tab "Tất cả" update global `facets` và `overview`. URGENT response không thay thế Hero/Areas/Recruiting totals |
| `RQ-08` | Quick Apply trên live URGENT card mở ApplyModal thật; card body mở detail `/viec-lam/{slug}` |
| `RQ-09` | Xóa `pr-[72px]` khỏi title wrapper — title nhận full card width. Không có fixed right reservation nào cho ribbon |
| `RQ-10` | Ribbon: `pointer-events-none` overlay. Cao ~24–28px, icon ~12–14px, label ~11–12px, padding ngang ~8px. Nền 70–80% trong suốt. Text "Tuyển gấp" đọc được qua nền translucent. Border-radius bottom-left nhỏ |
| `RQ-11` | Long Vietnamese titles ở container 1080px: không clipping, không cột hẹp cưỡng ép, không overflow ngang |
| `RQ-12` | Regression: CTA flip (R2 VIS-04), hover readability (R2 VIS-05), 1080px composition (VIS-06), mobile behavior, reduced-motion, Quick Apply modal chain, semantic Link/button giữ nguyên |
| `RQ-13` | Xóa file `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` sau khi xóa import xong |

### 4.2 Scope boundaries

- **API**: Mở rộng `GET /api/jobs` với `urgency` query param
- **Service**: Thêm urgency filter trong `listPublicJobProjection`, filter TRƯỚC pagination
- **UI**: Thay fixture bằng live API call cho URGENT tab; ribbon compact
- **Forbidden**: Admin, schema, permission, HomepageSettings, endpoint mới, feature mới ngoài spec

### 4.3 Scope

- In: §0 In-scope roots
- Out: §0 Forbidden + §1.2
- Tier 2 tạo HANDOFF + `evidence/**` tại `docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/`. Tier 2 KHÔNG ghi TASK.md, KHÔNG ghi plan cha

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | Baseline capture | Record: (a) `git rev-parse HEAD` → `evidence/exec-head-before.txt`. (b) `git status --porcelain` → `evidence/working-tree-before.txt`. (c) Capture unit failure set → `evidence/expected-failure-set-before.txt` | `git status --porcelain` không có path ngoài §1.3 dirty set; expected-failure-set-before.txt có hash + failing test files | Nếu expected failure set > baseline pre-existing → verify đo đúng lúc exec-head-before |
| `STEP-02` | `app/api/jobs/route.ts` — parse urgency | RQ-01/RQ-02: thêm `urgency` vào searchParams. Chỉ chấp nhận `URGENT`; reject giá trị khác (non-empty) với 400. Truyền xuống service | Source review: urgency param parsed, 400 branch exists, pass to service | Nếu 400 không đúng → halt |
| `STEP-03` | `src/domains/job-board/public.service.ts` — filter urgency | RQ-01/RQ-02: thêm `urgency?: 'URGENT'` vào opts. Filter `eligible` array trước khi tính `total` và `slice`. Dùng `job.urgency === 'URGENT'` | Source review: filter xảy ra trước `total`/`nextOffset`/`slice`; filter dùng DTO field | Nếu filter sau pagination → halt |
| `STEP-04` | `app/(portal)/page.tsx` — remove fixture | RQ-03: xóa import `BEST_JOBS_URGENT_PREVIEW`. Xóa `urgentPreviewBadge` prop khỏi BestJobsSection. Thêm state cho URGENT tab data + offset. Khi `bestJobsTab === 'urgent'`, fetch `/api/jobs?urgency=URGENT&limit=9&offset={bestJobsUrgentOffset}` | Source review: no BEST_JOBS_URGENT_PREVIEW import; URGENT fetch URL đúng | Nếu fixture còn → halt |
| `STEP-05` | `app/(portal)/page.tsx` — tab race safety | RQ-04/RQ-06: khi `handleBestJobsTabChange` switch sang 'urgent', reset `bestJobsUrgentOffset` về 0. Dùng tab-specific data state. Switch nhanh không bị stale ghi đè | Source review: tab-specific state; offset reset on tab change | Nếu race condition possible → halt |
| `STEP-06` | `app/(portal)/page.tsx` — facets/overview guard | RQ-07: URGENT response KHÔNG update `facets` và `overview`. Chỉ "Tất cả" bootstrap update global state | Source review: URGENT fetch không set facets/overview | Nếu URGENT update global state → halt |
| `STEP-07` | `src/domains/job-board/components/landing/best-jobs-section.tsx` — remove preview UI | RQ-03/RQ-05: xóa banner "Preview / Backend chưa hỗ trợ". Xóa `urgentPreviewBadge` prop và usage. Thêm empty state "Hiện chưa có việc tuyển gấp." cho URGENT tab khi `jobs.length === 0` | Source review: no preview banner; empty state text correct | Nếu banner còn → halt |
| `STEP-08` | `src/domains/job-board/components/landing/featured-job-card.tsx` — ribbon compact | RQ-09/RQ-10/RQ-11: xóa `pr-[72px]` từ title wrapper. Ribbon: `pointer-events-none`, cao ~24–28px, icon ~12–14px, label ~11–12px, padding ~8px, nền 70–80% alpha, bottom-left radius nhỏ. Test long Vietnamese titles ở 1080px container | Source review: no pr-[72px]; ribbon dimensions; pointer-events-none; alpha background | Nếu pr-[72px] còn hoặc ribbon quá lớn → halt |
| `STEP-09` | Regression check + delete fixture file | RQ-12/RQ-13: git diff filter chỉ in-scope roots. Xóa `best-jobs-urgent-preview.ts` sau khi STEP-04 confirm import gone. `npm run typecheck`; `npm run test:unit`; `npm run build` | `evidence/ac12-gates.txt` | Nếu gate fail hoặc fixture còn → halt |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `/api/jobs?urgency=URGENT&limit=9&offset=0` trả về chỉ job có `urgency === 'URGENT'` | API test: curl/fetch với urgency=URGENT, assert jobs[].urgency all 'URGENT' |
| `AC-02` | `total` và `nextOffset` mô tả filtered set đúng | API test: compare total với count of URGENT jobs; nextOffset = offset + limit nếu còn trang |
| `AC-03` | Unsupported urgency trả 400; absence giữ behavior hiện tại | API test: `/api/jobs?urgency=CLOSING` → 400; `/api/jobs` → same result as before |
| `AC-04` | Homepage production không import `BEST_JOBS_URGENT_PREVIEW` | Source review: `rg "BEST_JOBS_URGENT_PREVIEW" app/\(portal\)/page.tsx` → 0 match |
| `AC-05` | Không còn "Preview" badge hoặc "Preview / Backend chưa hỗ trợ" banner | Source review: `rg "Preview.*Backend\|Backend.*Preview\|urgentPreviewBadge" best-jobs-section.tsx` → 0 match |
| `AC-06` | Tab switch race-safe: switch nhanh không hiện stale data | Source review: tab-specific state, offset reset on tab change |
| `AC-06` | Tab switch race-safe: switch nhanh không hiện stale data | Source review: `rg "tab.*state|offset.*reset|setBestJobsUrgentOffset" app/(portal)/page.tsx` → tab-specific state, offset reset on tab change |
| `AC-07` | URGENT tab Quick Apply mở ApplyModal thật cho job thật | Component test: render URGENT card, click CTA, expect `onApply` gọi với correct job data; URL không change |
| `AC-09` | Ribbon: `pointer-events-none`, compact (~24-28px height), nền 70-80% alpha | Source review: ribbon class; measure height/icon/label/font-size |
| `AC-09` | Ribbon: `pointer-events-none`, compact (~24–28px height), nền 70–80% alpha | Source review: `rg "pointer-events-none|bg-primary/80|h-6|h-7" featured-job-card.tsx` → ribbon class properties |
| `AC-11` | Regression: CTA flip + hover readability (R2) còn nguyên | Component test: flip animation pass, hover contrast pass |
| `AC-12` | Regression: 1080px composition (VIS-06) còn nguyên | Source review: `max-w-[1080px]` container không bị đổi |
| `AC-12` | Regression: 1080px composition (VIS-06) còn nguyên | Source review: `rg "max-w-\[1080px\]" app/(portal)/page.tsx src/domains/job-board/components/landing/` → count match baseline |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-02, STEP-03 | AC-01, AC-02 |
| RQ-02 | STEP-02 | AC-03 |
| RQ-03 | STEP-04, STEP-07 | AC-04, AC-05 |
| RQ-04 | STEP-05 | AC-06 |
| RQ-05 | STEP-07 | AC-05 (empty state) |
| RQ-06 | STEP-05 | AC-06 |
| RQ-07 | STEP-06 | AC-13 (source review only — no command for facets guard) |
| RQ-08 | STEP-04 | AC-07 |
| RQ-09 | STEP-08 | AC-08 |
| RQ-10 | STEP-08 | AC-09 |
| RQ-11 | STEP-08 | AC-10 |
| RQ-12 | STEP-09 | AC-11, AC-12, AC-13 |
| RQ-13 | STEP-09 | AC-04 (verify no import after deletion) |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Filter urgency chạy SAU pagination — `total`/`nextOffset` sai | STEP-03 verify filter trước `total`/`nextOffset`/`slice`. Halt nếu sai thứ tự |
| `RISK-02` | URGENT tab ghi đè global `facets`/`overview` — Hero/Areas/Recruiting totals sai | STEP-06 verify URGENT response không set global state. Halt nếu có |
| `RISK-03` | Race condition khi switch tab nhanh — stale response hiện | STEP-05 verify tab-specific state + offset reset. Test manual: switch nhanh |
| `RISK-04` | Ribbon compact vẫn chiếm layout (push title) | STEP-08 verify `pointer-events-none` + no pr-[72px] |
| `RISK-05` | Long titles bị clipping ở 1080px với ribbon mới | STEP-08 verify no pr-[72px]; Owner visual review post-deploy |
| `RISK-06` | Tier 2 revert R2 VIS-04/05 khi sửa ribbon | STEP-09 regression check; AC-11 gate |

## 8. Open Questions

None — Tier 0 directive đã chốt mọi boundary.

## 9. Planner Resolution

Tier 1 append sau mỗi round.

## 10. Revision Log

- `v1.0` (10/09/2026): Khởi tạo R3 contract. Tier 0 directive: URGENT live integration (pulled from AV1) + compact translucent ribbon. STANDARD/FOCUSED lane. API extends `/api/jobs`, UI replaces fixture, ribbon compact. Predecessors: R2 ACCEPTED + composition/footer ACCEPTED. Successor: section-render.
