# TASK — `hrp-v6-ui-04b-urgent-live-ribbon-r3`

> **Urgent live integration + compact ribbon + Minimal SaaS Job Card R3** theo Tier 0 directive `docs/prompts/TIER0_UI04_URGENT_LIVE_AND_RIBBON_R3.md` + `docs/prompts/TIER0_UI04_JOB_CARD_MINIMAL_SAAS_REFACTOR.md`.
> v1.1 bổ sung Job Card Minimal SaaS Refactor: card trắng + viền slate + rounded-xl + shadow-sm, logo vuông 48px, Lucide icons, salary thành pill emerald, footer actions gọn (Xem chi tiết CTA xanh + Quick Apply), ribbon Tuyển gấp nhỏ bán trong suốt.
> Owner live review (`codex-clipboard-f3251ba6-b04c-4170-af01-24caf7d145c7.png`) chỉ ra: (1) Tab Tuyển gấp còn badge "Preview / Backend chưa hỗ trợ" và fixture; (2) `pr-[72px]` ép tiêu đề hẹp; (3) Ribbon quá lớn và đặc; (4) Card hiện tại quá blocky, salary chiếm full width, logo 64px tròn gây wrap xấu. Tier 0 quyết định: kéo `/api/jobs?urgency=URGENT` lên ngay R3 + gộp Job Card refactor vào R3 (tránh sửa file 2 lần).
> Scope: API urgency filter → thay fixture bằng live data → xóa Preview badge/banner → ribbon compact translucent → FeaturedJobCard refactor sang Minimal SaaS layout.
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
| Spec version | `v1.1` |
| Status | `DRAFT` (chờ composition/footer `ACCEPTED` → Tier 1 chuyển `READY_FOR_EXECUTION`) |
| Planner | `Tier 1` |
| Baseline | HEAD đầu round — `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt` |
| Source reference | R2 `ACCEPTED` (`55b27d2`) — featured-job-card.tsx (ribbon, pr-[72px]), composition `ACCEPTED` (1080px container), `app/api/jobs/route.ts` (current API), `public.service.ts` (current service) |
| Plan UI predecessor | Interaction R2 `ACCEPTED` (`55b27d2`) + composition/footer `ACCEPTED` |
| Plan UI successor | section-render (`hrp-v6-ui-04d-section-render`) — section-render chạy sau R3 ACCEPTED |
| In-scope roots | `app/api/jobs/route.ts`, `src/domains/job-board/public.service.ts`, `src/domains/job-board/components/landing/featured-job-card.tsx`, `app/(portal)/page.tsx`, `src/domains/job-board/components/landing/best-jobs-section.tsx`, `app/(portal)/components/ApplyModal/**` (nếu cần đảm bảo Quick Apply mở đúng job; chỉ sửa wiring, không đổi UX), `docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/**` |
| Forbidden paths | `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` (sẽ xóa — không sửa), `app/api/admin/**`, `prisma/**`, `src/shared/auth/permission-catalog.ts`, `app/admin/**`, `src/domains/job-board/components/landing/hero.tsx`, `src/domains/job-board/components/landing/areas-section.tsx`, `src/domains/job-board/components/landing/recruiting-projects-section.tsx`, `src/domains/job-board/components/landing/referral-strip.tsx`, `app/components/GlobalFooter.tsx`, `package.json` (KHÔNG thêm icon dependency; chỉ dùng `lucide-react` đã có), `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`, `docs/tasks/hrp-v6-ui-04a-visual-polish/**`, `docs/tasks/hrp-v6-ui-04b-pagination-admin/**`, `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/**`, `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/**`, `docs/tasks/hrp-v6-ui-04c-home-composition-footer/**`, `docs/tasks/hrp-v6-ui-04d-section-render/**` |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set với baseline + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; Tier 3 FOCUSED audit PASS |
| Visual gate | Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG Lighthouse/axe-core auto-install |
| Current execution round | `0` (v1.1 DRAFT) |
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
| `EV-08` | `featured-job-card.tsx:50` | Card surface hiện tại: `bg-surface ... shadow-card ... rounded-2xl ... p-5` — blocky, dùng semantic `surface` color |
| `EV-09` | `featured-job-card.tsx:75-77` | Logo 64px `HrMonogram` hình tròn-style với `border border-outline-variant` |
| `EV-10` | `featured-job-card.tsx:165-280` | Action area dùng CSS 3D flip với perspective + rotateX; salary/CTA thay nhau qua hover |
| `EV-11` | `featured-job-card.tsx:120-130` | Salary hiện full-width `bg-primary-fixed` slab (mặt trước flip) |
| `EV-12` | `app/(portal)/page.tsx:38-47` | `EnrichedJob` interface KHÔNG có `postedAt`; card adapter cần extend để hiển thị recruitment time (R3 v1.1 mới) |
| `EV-13` | `package.json:29` | `lucide-react ^0.468.0` đã có sẵn — KHÔNG cài thêm icon package |

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
| `DEC-17` | Job Card refactor theo Minimal SaaS: `bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md`. KHÔNG dùng semantic `surface` color (đổi sang white/slate palette — ghi rõ đây là card-local Owner-approved status color, không recolor global theme) | `CHOSEN` |
| `DEC-18` | Logo chuyển từ 64px HrMonogram bo tròn sang 48px vuông `rounded-lg`; không thêm nested border. Dùng `flex gap-4` với `min-w-0` content column | `CHOSEN` |
| `DEC-19` | Metadata icons dùng Lucide SVG từ `lucide-react` (đã có). Gợi ý: `MapPin` (location), `Clock3` (posted time), `Banknote` (salary), `Zap`/`Flame` (urgency). Decorative icons `aria-hidden="true"` | `CHOSEN` |
| `DEC-20` | Salary thành inline pill `bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-sm font-semibold inline-flex items-center gap-1` + Lucide `Banknote`. KHÔNG full-width slab. Giữ "Lương thương lượng" fallback | `CHOSEN` |
| `DEC-21` | Footer actions: salary pill bên trái + `Xem chi tiết` CTA xanh bên phải (`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium`). Link và CTA share cùng `href` từ `job.slug`. Quick Apply giữ nguyên (pill-sized compact), trigger qua hover/focus trên desktop, accessible ở mobile | `CHOSEN` |
| `DEC-22` | Nếu 3 action (salary + Quick Apply + Xem chi tiết) không fit gọn ở 3-col 1080px, ưu tiên: (a) Quick Apply accessible, (b) detail accessible qua card Link, (c) salary readable. CTA xanh có thể thu nhỏ còn arrow/link label thay vì ép 2 button lớn | `CHOSEN` |
| `DEC-23` | `prefers-reduced-motion: reduce` KHÔNG flip — render salary + Quick Apply + detail accessible đầy đủ không animation. Touch target ≥44px | `CHOSEN` |
| `DEC-24` | `EnrichedJob` adapter extend: thêm `postedAt: string \| null` từ `PublicJobDto.postedAt` để hiển thị recruitment time khi có (R3 v1.1). KHÔNG invent "x giờ trước" — chỉ render canonical ISO timestamp hoặc ẩn | `CHOSEN` |
| `DEC-25` | Component tests: real job (salary + posted time), negotiable salary (null), long title (>60 chars), urgent job (ribbon), Quick Apply (mở ApplyModal), detail href (canonical slug), mobile layout (≥44px touch target), reduced-motion state, hover text contrast (WCAG AA) | `CHOSEN` |

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
| `RQ-14` | Card surface: `bg-white`, `border border-slate-200`, `rounded-xl`, `shadow-sm`. Hover: `hover:shadow-md transition-all duration-200`. Subtle lift tối đa ~2px |
| `RQ-15` | Header: 2-col layout `flex gap-4` với logo fixed `w-12 h-12 rounded-lg border border-slate-100 flex-shrink-0` và content column có `min-w-0`. KHÔNG render nested border quanh HrMonogram. Title `text-lg font-semibold text-slate-900 leading-tight`; company `text-sm text-slate-500 font-medium`. Title wrap tự nhiên ≤2 dòng; nếu clamp thì giữ full title ở `title` attribute / accessible name |
| `RQ-16` | Metadata body: một row responsive `flex flex-wrap gap-2 mt-3`. Mỗi item `inline-flex items-center gap-1 text-sm text-slate-500` + Lucide icon (`MapPin`, `Clock3`, `Banknote`, `Zap`/`Flame`). Decorative icons `aria-hidden="true"`. Recruitment/posting time chỉ render khi `postedAt` có giá trị canonical — KHÔNG invent "x giờ trước" |
| `RQ-17` | Salary thành inline pill `bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-sm font-semibold inline-flex items-center gap-1` + Lucide `Banknote`. KHÔNG full-width slab. Giữ "Lương thương lượng" fallback. KHÔNG recolor global HRP theme — đây là card-local Owner-approved color |
| `RQ-18` | Footer actions: salary pill (left) + `Xem chi tiết` CTA xanh (right) `bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium`. Link và CTA share cùng canonical href từ `job.slug`. Quick Apply pill-sized compact, hover-trigger trên desktop, accessible ở mobile |
| `RQ-19` | Nếu 3 action không fit gọn ở 3-col 1080px: ưu tiên Quick Apply accessible → detail accessible qua card Link → salary readable. CTA xanh có thể thu còn arrow/link label thay vì ép 2 button lớn |
| `RQ-20` | `EnrichedJob` adapter extend: thêm `postedAt: string \| null` từ `PublicJobDto.postedAt`. Render ISO canonical hoặc ẩn (KHÔNG invent relative time) |
| `RQ-21` | Mobile (390px): không horizontal scroll, không clipped title, không overlapping ribbon/action, touch target ≥44px. Render salary + accessible Quick Apply + detail ở compact wrap/stack layout |
| `RQ-22` | `prefers-reduced-motion: reduce`: KHÔNG flip/lift animation. Render salary + Quick Apply + detail đầy đủ không animation. Touch target ≥44px |
| `RQ-23` | Ribbon inherit R3 compact: top-right overlay, ~24–28px height, icon 12–14px, label 11–12px, semantic dark-orange ~70–80% alpha, `pointer-events-none`, no title-width reservation |
| `RQ-24` | Semantic structure: Link và `Xem chi tiết` share canonical slug href. Quick Apply button là sibling của Link (KHÔNG nested interactive). KHÔNG `aria-hidden` trên focusable action |
| `RQ-25` | Component tests: real job (salary + posted time), negotiable salary, long title (>60 chars), urgent (ribbon), Quick Apply (ApplyModal opens), detail href (canonical slug), mobile 390px layout, reduced-motion state, hover text contrast (WCAG AA white-on-blue, emerald-on-emerald-50) |
| `RQ-26` | Comments chỉ giữ 3 vùng `Header` / `Body/Metadata` / `Footer/Actions`. Xóa verbose STEP/DEC historical comments từ production JSX (giữ ở HANDOFF.md) |

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
| `STEP-10` | Extend `EnrichedJob` adapter với `postedAt` | RQ-20: thêm `postedAt: string \| null` từ `PublicJobDto.postedAt`. Update `enrichJob()` ở `app/(portal)/page.tsx` để pass qua. Verify TypeScript compile pass | `rg "postedAt" app/\(portal\)/page.tsx src/domains/job-board/components/landing/featured-job-card.tsx` → có postedAt field | Nếu TypeScript fail → halt |
| `STEP-11` | Refactor `FeaturedJobCard` container | RQ-14/RQ-21: đổi container surface từ semantic `bg-surface ... rounded-2xl ... shadow-card` sang `bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200`. Subtle lift ≤2px. Mobile (390px) không horizontal scroll, touch target ≥44px | Source review: class names, hover behavior, mobile media query | Nếu dùng semantic `surface` color → halt |
| `STEP-12` | Refactor header (logo + title) | RQ-15: logo 48px vuông `rounded-lg border border-slate-100`. Layout `flex gap-4` với content column `min-w-0`. Title `text-lg font-semibold text-slate-900 leading-tight`. Company `text-sm text-slate-500 font-medium`. Xóa nested border quanh HrMonogram. Title wrap ≤2 dòng; nếu clamp thì `title` attribute giữ full | Source review: logo size, no nested border, title typography, min-w-0 | Nếu logo 64px hoặc pr-[72px] còn → halt |
| `STEP-13` | Refactor metadata body + Lucide icons | RQ-16: row `flex flex-wrap gap-2 mt-3`. Location + posted time + salary icons từ `lucide-react` (`MapPin`, `Clock3`, `Banknote`). Salary inline pill `bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-sm font-semibold inline-flex items-center gap-1`. Posted time chỉ render khi `postedAt` truthy | Source review: lucide imports, aria-hidden on icons, emerald pill classes | Nếu salary full-width slab còn → halt |
| `STEP-14` | Refactor footer (Quick Apply + Xem chi tiết CTA) | RQ-18/RQ-19/RQ-24: salary pill left + `Xem chi tiết` CTA xanh right (`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium`). Link và CTA share cùng canonical href. Quick Apply pill-sized compact, hover-trigger desktop, accessible mobile. Nếu 3 action không fit → ưu tiên Quick Apply > detail Link > salary (theo DEC-22) | Source review: CTA blue classes, shared href, semantic structure (no nested interactive) | Nếu nested interactive hoặc 2 button ép layout → halt |
| `STEP-15` | Component tests + reduced-motion verification | RQ-21/RQ-22/RQ-25: tests cover real job (posted time), negotiable salary, long title >60 chars, urgent (ribbon), Quick Apply (ApplyModal opens), detail href (canonical slug), mobile 390px layout, `prefers-reduced-motion: reduce` state, hover text contrast WCAG AA. Update `featured-job-card.test.tsx` hoặc thêm mới | `npm run test:unit` exits 0; new test count matches expected; `evidence/ac25-tests.txt` | Nếu test fail hoặc reduced-motion vẫn flip → halt |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `/api/jobs?urgency=URGENT&limit=9&offset=0` trả về chỉ job có `urgency === 'URGENT'` | API test: curl/fetch với urgency=URGENT, assert jobs[].urgency all 'URGENT' |
| `AC-02` | `total` và `nextOffset` mô tả filtered set đúng | API test: compare total với count of URGENT jobs; nextOffset = offset + limit nếu còn trang |
| `AC-03` | Unsupported urgency trả 400; absence giữ behavior hiện tại | API test: `/api/jobs?urgency=CLOSING` → 400; `/api/jobs` → same result as before |
| `AC-04` | Homepage production không import `BEST_JOBS_URGENT_PREVIEW` | Source review: `rg "BEST_JOBS_URGENT_PREVIEW" app/\(portal\)/page.tsx` → 0 match |
| `AC-05` | Không còn "Preview" badge hoặc "Preview / Backend chưa hỗ trợ" banner | Source review: `rg "Preview.*Backend\|Backend.*Preview\|urgentPreviewBadge" best-jobs-section.tsx` → 0 match |
| `AC-06` | Tab switch race-safe: switch nhanh không hiện stale data | Source review: `rg "tab.*state|offset.*reset|setBestJobsUrgentOffset" app/(portal)/page.tsx` → tab-specific state, offset reset on tab change |

| `AC-07` | URGENT tab Quick Apply mở ApplyModal thật cho job thật | Component test: render URGENT card, click CTA, expect `onApply` gọi với correct job data; URL không change |
| `AC-09` | Ribbon: `pointer-events-none`, compact (~24–28px height), nền 70–80% alpha | Source review: `rg "pointer-events-none|bg-primary/80|h-6|h-7" featured-job-card.tsx` → ribbon class properties |

| `AC-11` | Regression: CTA flip + hover readability (R2) còn nguyên | Component test: flip animation pass, hover contrast pass |
| `AC-12` | Regression: 1080px composition (VIS-06) còn nguyên | Source review: `rg "max-w-\[1080px\]" app/(portal)/page.tsx src/domains/job-board/components/landing/` → count match baseline |
| `AC-13` | `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + 0 new; `npm run build` exit 0 | Command: run all gates; `verify-task.ps1`; `verify-handoff.ps1` |
| `AC-14` | Card surface `bg-white border border-slate-200 rounded-xl shadow-sm`; hover `hover:shadow-md transition-all duration-200`. Subtle lift ≤2px | Source review: `rg "bg-white.*border-slate-200.*rounded-xl" src/domains/job-board/components/landing/featured-job-card.tsx` → match |
| `AC-15` | Logo 48px vuông `rounded-lg border border-slate-100 flex-shrink-0`; content column `min-w-0`; KHÔNG nested border quanh HrMonogram | Source review: `rg "w-12 h-12 rounded-lg" featured-job-card.tsx` → logo size; `rg "min-w-0" featured-job-card.tsx` → content column; `rg "size={48}" featured-job-card.tsx` → HrMonogram 48 |
| `AC-16` | Lucide icons: `MapPin` (location), `Clock3` (posted time), `Banknote` (salary); decorative icons `aria-hidden="true"` | Source review: `rg "from 'lucide-react'" featured-job-card.tsx` → imports include MapPin, Clock3, Banknote; `rg "aria-hidden=\"true\"" featured-job-card.tsx` → count matches icon uses |
| `AC-17` | Salary pill `bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-sm font-semibold inline-flex items-center gap-1`; KHÔNG full-width slab | Source review: `rg "bg-emerald-50 text-emerald-700" featured-job-card.tsx` → match; `rg "bg-primary-fixed" featured-job-card.tsx` → 0 match (slab removed) |
| `AC-18` | `Xem chi tiết` CTA `bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium`; Link và CTA share cùng canonical href | Source review: `rg "bg-blue-600 hover:bg-blue-700" featured-job-card.tsx` → match; manual verify `href` consistency with `job.slug` |
| `AC-19` | Long title (>60 chars) wrap ≤2 dòng, không clipping ở 1080px container, không overlap ribbon | Component test: render 80+ chars title, assert no overflow at viewport 1280px, ribbon không che |
| `AC-20` | Mobile 390px: không horizontal scroll, touch target ≥44px, salary + Quick Apply + detail accessible | Component test: viewport 390px width, assert no horizontal scroll; assert action buttons height ≥44px |
| `AC-21` | `prefers-reduced-motion: reduce`: KHÔNG flip/lift, salary + Quick Apply + detail render đầy đủ static | Component test: simulate `prefers-reduced-motion: reduce`, assert no `rotateX` transform applied |
| `AC-22` | Posted time chỉ render khi `postedAt` truthy; KHÔNG invent "x giờ trước" | Component test: render với `postedAt = null`, assert không có text "x giờ trước" |
| `AC-23` | Hover text contrast WCAG AA: white-on-blue CTA ≥4.5:1, emerald-700-on-emerald-50 ≥4.5:1 | Manual/computed: check contrast ratio của CTA hover state và salary pill; document in HANDOFF |
| `AC-24` | Semantic structure: KHÔNG nested interactive, KHÔNG `aria-hidden` trên focusable action | Source review: `grep -E "<button.*<Link\|<Link.*<button" featured-job-card.tsx` → 0 match |
| `AC-25` | Component tests cover 9 cases: real job, negotiable salary, long title, urgent, Quick Apply, detail href, mobile, reduced-motion, hover contrast | `npm run test:unit` exits 0; test count ≥9 cases; `evidence/ac25-tests.txt` |


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
| RQ-14 | STEP-11 | AC-14 |
| RQ-15 | STEP-12 | AC-15, AC-19 |
| RQ-16 | STEP-13 | AC-16, AC-22 |
| RQ-17 | STEP-13 | AC-17, AC-23 |
| RQ-18 | STEP-14 | AC-18, AC-20, AC-24 |
| RQ-19 | STEP-14 | AC-20 (mobile priority) |
| RQ-20 | STEP-10 | AC-22 |
| RQ-21 | STEP-11, STEP-15 | AC-20 |
| RQ-22 | STEP-11, STEP-15 | AC-21 |
| RQ-23 | STEP-08 (inherited) | AC-09 |
| RQ-24 | STEP-14 | AC-24 |
| RQ-25 | STEP-15 | AC-25 |
| RQ-26 | STEP-11, STEP-12, STEP-13, STEP-14 | AC-14 (source review: only Header/Body/Metadata/Footer/Actions comments remain) |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Filter urgency chạy SAU pagination — `total`/`nextOffset` sai | STEP-03 verify filter trước `total`/`nextOffset`/`slice`. Halt nếu sai thứ tự |
| `RISK-02` | URGENT tab ghi đè global `facets`/`overview` — Hero/Areas/Recruiting totals sai | STEP-06 verify URGENT response không set global state. Halt nếu có |
| `RISK-03` | Race condition khi switch tab nhanh — stale response hiện | STEP-05 verify tab-specific state + offset reset. Test manual: switch nhanh |
| `RISK-04` | Ribbon compact vẫn chiếm layout (push title) | STEP-08 verify `pointer-events-none` + no pr-[72px] |
| `RISK-05` | Long titles bị clipping ở 1080px với ribbon mới | STEP-08 verify no pr-[72px]; Owner visual review post-deploy |
| `RISK-06` | Tier 2 revert R2 VIS-04/05 khi sửa ribbon | STEP-09 regression check; AC-11 gate |
| `RISK-07` | Card refactor quá rộng → Tier 2 nhầm scope, sửa cả BestJobsSection hoặc Hero | STEP-11/12/13/14 scope locked to featured-job-card.tsx only (except STEP-04 page.tsx adapter). Source review: git diff filter |
| `RISK-08` | Salary pill emerald color clash với global HRP theme → vi phạm "không recolor global theme" | DEC-17/DEC-20: emerald chỉ card-local. Tier 3 audit verify Tailwind config không đổi |
| `RISK-09` | Lucide icon import thừa tăng bundle size | STEP-13: chỉ import MapPin/Clock3/Banknote/Zap; verify tree-shake (lucide-react ESM); bundle size check trong build output |
| `RISK-10` | Mobile 390px 3 action (salary + Quick Apply + Xem chi tiết) overflow | STEP-14: DEC-22 priority fallback — compact stack wrap. AC-20 verify no horizontal scroll |
| `RISK-11` | Reduced-motion vẫn có flip animation vì dùng CSS @media độc lập | STEP-15: test render với `prefers-reduced-motion: reduce` mock, assert no rotateX. AC-21 |
| `RISK-12` | Posted time render "x giờ trước" thay vì canonical ISO | DEC-24: chỉ render ISO khi truthy. AC-22 verify no relative time text |
| `RISK-13` | Title clamp 2 dòng che mất thông tin | DEC-15: giữ full title ở `title` attribute / accessible name |

## 8. Open Questions

None — Tier 0 directive đã chốt mọi boundary.

## 9. Planner Resolution

Tier 1 append sau mỗi round.

## 10. Revision Log

- `v1.0` (10/09/2026): Khởi tạo R3 contract. Tier 0 directive: URGENT live integration (pulled from AV1) + compact translucent ribbon. STANDARD/FOCUSED lane. API extends `/api/jobs`, UI replaces fixture, ribbon compact. Predecessors: R2 ACCEPTED + composition/footer ACCEPTED. Successor: section-render.
- `v1.1` (10/09/2026): Merge Tier 0 directive `TIER0_UI04_JOB_CARD_MINIMAL_SAAS_REFACTOR.md` vào R3 để tránh sửa FeaturedJobCard hai lần. Thêm: card surface `bg-white border-slate-200 rounded-xl shadow-sm`, logo 48px vuông, Lucide icons (MapPin/Clock3/Banknote/Zap), salary emerald pill, `Xem chi tiết` CTA xanh, accessibility (WCAG AA, reduced-motion, mobile 390px ≥44px), `EnrichedJob.postedAt` extend. Thêm 9 RQ (RQ-14 → RQ-26), 6 STEP (STEP-10 → STEP-15), 12 AC (AC-14 → AC-25), 7 RISK (RISK-07 → RISK-13), 9 DEC (DEC-17 → DEC-25). In-scope mở rộng thêm `ApplyModal/**` (chỉ wiring, không đổi UX). Source survey: `lucide-react ^0.468.0` đã có — KHÔNG cài thêm. Plan UI execution order: composition ACCEPTED → R3 (live URGENT + ribbon + Job Card refactor) → section-render.
