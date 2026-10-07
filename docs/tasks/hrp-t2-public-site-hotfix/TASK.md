# TASK — `hrp-t2-public-site-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t2-public-site-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | UI/copy/settings hotfix, blast radius public surface + admin settings; STANDARD + NONE per scope (no auth/RLS/PII/migration authority) — schema migration is ADD-only (1 nullable column) |
| Spec version | `v1.0` |
| Status | `ACCEPTED` (all 4 canonical gates GREEN) |
| Planner | `Tier 1` |
| Baseline | `8f93178a81c9f35c6f9be1e016bc4377928db185` (origin/main) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `app/(jobs)/viec-lam/`, `app/admin/settings/`, `app/(portal)/page.tsx`, `app/(portal)/_components/`, `src/domains/job-board/`, `src/domains/media/`, `app/api/public/homepage-settings/`, `app/api/admin/homepage-settings/`, `prisma/schema.prisma`, `prisma/migrations/` |
| Forbidden paths | `app/admin/workers/**`, `app/admin/users/**`, `src/domains/workforce/**`, `src/domains/staffing/**`, `app/admin/clients/**`, `app/admin/projects/**` (đã có worktree khác đang chạm) |
| Required gates | `npx --no-install prisma validate`, `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `node .ai-pipeline/scripts/verify-encoding.mjs`, `git diff --check HEAD` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `/deliver → /resolve` (PR pushed, CI monitoring, stop before merge) |

> Audit chọn `NONE` vì hotfix chỉ chạm: (a) UI copy/render (UI-evidence + static fences), (b) parser thêm một tham số (đo bằng phép gọi hàm trần), (c) admin settings form học thêm field + tab — tất cả có static/unit fence cùng tầng với implementation. Không có schema authority thay đổi; migration add-only, không đổi RLS. Risk acceptance: Tier 1 (Tier 1 tự review trước freeze, có thể mời Tier 3 nếu phát hiện blast radius mới).

## 1. Outcome

### 1.1 User-visible outcome

1. **`/viec-lam` — Lọc theo mức lương**: Bộ lọc `Mức lương` thật trong form filter. Sáu khoảng cố định từ lương tối thiểu (`salaryMinVnd`): `< 5 triệu`, `5–10 triệu`, `10–15 triệu`, `15–20 triệu`, `20–30 triệu`, `> 30 triệu` (đơn vị VND/tháng, mỗi bucket = 1.000.000). Đơn KHÔNG có `salaryMinVnd` (lương thương lượng) bị ẩn khỏi tập lọc khi bucket được chọn; khi không chọn bucket thì tập không đổi. Mỗi kết hợp filter là URL chia sẻ được (`?salary=10-15`), index/noindex theo cùng rule với `q/area/shift`. Hero search ở trang chủ: control `Mức lương — sắp có` (đã disabled từ trước) trở thành enabled, cùng 6 bucket, cùng URL contract; người dùng submit hero form sẽ navigate tới `/viec-lam?q=...&area=...&salary=...`.
2. **Admin → Cài đặt — Ảnh Hero trang chủ**: Trong `admin/settings`, một khối mới `Ảnh nền trang chủ` cho phép chọn ảnh từ Media Library hiện hữu hoặc upload mới (qua API `/api/admin/media`). Có preview, validation (URL bắt đầu bằng `https://`, MIME nằm trong allow-list, size ≤ MAX_UPLOAD_BYTES), lưu/publish theo cùng cơ chế save/revalidate hiện có của `homepage-settings`. Hero trang chủ (`app/(portal)/page.tsx`) đọc từ DTO `HomepageSettings`; nếu có ảnh thì render `<img>` overlay; nếu null thì giữ gradient hiện tại.
3. **Admin → Cài đặt — Sắp xếp thành tab**: Nhóm `Giao diện` (Page sizes, News section, Ảnh Hero mới, Sticky), nhóm `Liên hệ công khai` (3 chat URL/phone), nhóm `Tài khoản & Quyền` → chỉ điều hướng tới `/admin/users` (KHÔNG build CRUD). Placeholder cũ (Bảo mật/Thông báo/Tích hợp/Nhật ký) gộp vào tab `Hệ thống` với badge `Chưa khả dụng`.
4. **Trang chủ — Khu vực "Dự án đang tuyển"**: Tên hiển thị trên thẻ = `Project.name` (qua `PublicJobDto.companyName` — denormalized `clientCompanyName ?? project.name` đã có trong `toDto`). Vị trí tuyển (`positionTitle`) + số lượng cần tuyển (`availableSlots`) là thông tin phụ, không trộn với tên dự án. Monogram sinh từ `displayTitle = companyName`.

### 1.2 Non-goals

- KHÔNG thay schema `/viec-lam` filter cũ (`q`/`area`/`shift`); chỉ thêm `salary`.
- KHÔNG động vào các Hero search control khác (Từ khóa, Khu vực); chỉ kích hoạt Salary.
- KHÔNG build ảng/User board CRUD; tab `Tài khoản & Quyền` chỉ điều hướng.
- KHÔNG đổi flow API quảng cáo `Media`/`MediaAssignment`; chỉ dùng để chọn ảnh đã có sẵn.
- KHÔNG touch các worktree song song (`HrP-t1c-admin-ux-hotfix2` / `HrP-pre-p2-sidebar-active-nav-hotfix` / `HrP-t1a-*` / `HrP-t1b-*`); đó là các PR độc lập.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/(jobs)/viec-lam/page.tsx:178-269` (`FilterForm` chỉ có 3 select) + `page.tsx:367` (`Mức lương — sắp có` ở hero) | Filter `/viec-lam` chưa có lương; hero chỉ là placeholder. |
| `EV-02` | `app/admin/settings/admin-settings-form.tsx:1-1150` (1 form duy nhất) + `:72-105` (`PLACEHOLDER_GROUPS`) | Settings page là single-form; chưa có tab. |
| `EV-03` | `prisma/schema.prisma:1734-1750` (`HomepageSettings` chưa có `heroImageMediaId`) + `src/domains/job-board/public-types.ts:108-140` (DTO chưa chứa hero image) | Cần migration add-only 1 cột nullable. |
| `EV-04` | `src/domains/job-board/public.service.ts:23-37, 595-684` (`PublicJobDto.companyName = project.clientCompanyName ?? project.name`) | Canonical nguồn tên dự án đã có sẵn trong DTO — không phải bịa. |
| `EV-05` | `app/(portal)/page.tsx:287-291, 416-425` (recruiting section nhận `jobs` từ `overview.newest`) + `recruiting-projects-section.tsx:14-119` (card hiển thị `job.title` như `displayTitle`) | Đang hiển thị `JobPosting.title` (vị trí) thay vì `Project.name` (dự án). |
| `EV-06` | `src/domains/media/media.service.ts:1-200` + `media.types.ts:1-130` | Media service đã hoàn chỉnh (validate, list, upload endpoint qua `/api/admin/media`). Tận dụng làm picker. |
| `EV-07` | `src/domains/job-board/public-listing.params.ts:60-105` + `public-listing.labels.ts:39-65` | Parser/href/indexable theo 4-param contract; thêm `salary` thì phải đồng bộ. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Bucket lương cố định 6 khoảng: `<5`, `5-10`, `10-15`, `15-20`, `20-30`, `>30` (triệu VND/tháng). Bucket mã hoá đơn giản theo `salaryMinVnd` đã fold theo `1_000_000`. Một đơn được xếp vào bucket khi `salaryMinVnd/1e6 ≤ upperBound` (với `<5` nghĩa là `salaryMinVnd < 5e6`; `>30` nghĩa là `salaryMinVnd ≥ 30e6`). | `CHOSEN` |
| `DEC-02` | Khi bucket được chọn: loại bỏ các job `salaryMinVnd === null` (đã tránh in `"Lương thương lượng"` trong dải lọc cụ thể — đó là DEC-03 của topPaid cũ). Khi không chọn bucket: tập eligible không đổi. | `CHOSEN` |
| `DEC-03` | `HomepageSettings.heroImageMediaId: string?` (FK tới Media.id, ON DELETE SET NULL). Migration add-only — KHÔNG đổi schema cũ; KHÔNG RLS change (Media là table admin-only). | `CHOSEN` |
| `DEC-04` | Hero page render ảnh từ `Media.url` (lookup qua `MediaAssignment` hoặc trực tiếp `Media.id` nếu `heroImageMediaId` không null). Service `getHomepageSettings` mở rộng: nếu `heroImageMediaId` set, join `media` để trả `{ url, alt, caption }`. Fallback gradient nếu không có. | `CHOSEN` |
| `DEC-05` | Tab trong `/admin/settings`: state lưu `useState<'interface' | 'contact' | 'system' | 'account'>('interface')`. Active tab dùng primary border-bottom; inactive dùng outline-variant. Render theo tab. KHÔNG dùng URL hash (giữ route `/admin/settings` đơn giản). | `CHOSEN` |
| `DEC-06` | Tab `Tài khoản & Quyền`: chỉ một Card với title "Quản lý tài khoản", description "Đi đến trang Tài khoản & Quyền", button `Đi đến` link tới `/admin/users`. KHÔNG CRUD, KHÔNG form. | `CHOSEN` |
| `DEC-07` | Tab `Hệ thống`: gộp 4 placeholder cũ (Bảo mật/Thông báo/Tích hợp/Nhật ký) thành một danh sách mục với badge `Chưa khả dụng` như trước. | `CHOSEN` |
| `DEC-08` | Recruiting card: tiêu đề `companyName` (canonical từ DTO); subtitle dòng nhỏ "Tuyển {positionTitle}" (lấy từ `positionTitles[0]`); `Cần tuyển {n} người` giữ nguyên. Monogram sinh từ `displayTitle = companyName`. | `CHOSEN` |
| `DEC-09` | Parser thêm `salary: '5-10' | '10-15' | ... | '<5' | '>30' | undefined`. Bucket mã hoá chuỗi hyphen-range để thân thiện URL. `BANNED_PARAMS` giữ nguyên. `listingIsIndexable` cập nhật để bao gồm `salary === undefined`. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Media picker cho Hero image | `Media` service + `/api/admin/media` đã có (EV-06) | `N/A` | n/a | n/a | n/a | Dùng luôn API hiện hữu; chỉ build thin client UI để gọi `/api/admin/media?folder=homepage` |
| Tab component | Không có sẵn | `CUSTOM` | n/a | n/a | `app/admin/settings/_components/settings-tabs.tsx` | `CUSTOM_BUILD_JUSTIFICATION`: chỉ 4 tab nội bộ với logic đơn giản; library ngoài (Radix Tabs, Reach UI Tabs) lớn hơn cần thiết cho một internal admin, không tương tác với public surface. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Media upload pipeline | `/api/admin/media` đã có endpoint POST + Vercel Blob SDK | `N/A` | n/a | n/a | n/a | n/a | Dùng nguyên pipeline hiện hữu; không tạo worker riêng |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `/viec-lam` form filter thêm một select `Mức lương` với 6 bucket cố định + option trống "Mọi mức lương". Submit là GET với key `salary=<bucket>`. |
| `RQ-01b` | Hero search form (trang chủ): control `Mức lương — sắp có` (đã disabled) trở thành enabled select với cùng 6 bucket; submit hero navigate tới `/viec-lam?q=...&area=...&salary=...`. |
| `RQ-02` | `parseListingSearchParams` thêm trường `salary: SalaryBucket | undefined`. `cleanSalary` whitelist 6 bucket; tất cả input khác trả `undefined`. |
| `RQ-03` | `buildListingHref` ghi `salary=...` khi giá trị khác undefined, theo thứ tự `q, salary, area, shift, offset` (đặt `salary` sau `q` để URL ngắn gọn). `listingIsIndexable` trả `false` khi `salary !== undefined`. |
| `RQ-04` | `listPublicJobProjection` áp dụng filter `salary`: loại bỏ job có `salaryMinVnd === null` khi bucket được chọn, giữ lại theo `bucketUpperBound` (so sánh `salaryMinVnd/1e6 ≤ upperBound`); `>30` → `salaryMinVnd ≥ 30e6`; `<5` → `salaryMinVnd < 5e6`. |
| `RQ-05` | `PublicJobFacets` không thêm trường mới — salary bucket là enum cố định, không facet. (Tránh RQ-04 vi phạm "facet từ dữ liệu thật".) |
| `RQ-06` | Migration add-only: thêm cột `homepage_settings.hero_image_media_id TEXT NULL` + FK tới `media(id) ON DELETE SET NULL`. |
| `RQ-07` | `HomepageSettingsDto.heroImage: { url: string; alt: string; caption: string \| null } \| null` — service join `media` row khi `heroImageMediaId` set, fallback null khi media row deleted. |
| `RQ-08` | `getHomepageSettings` và `updateHomepageSettings` xử lý `heroImageMediaId`: read join media; write validate id tồn tại (FK constraint) + null to clear. |
| `RQ-09` | Admin settings form — block mới `Ảnh nền trang chủ`: preview `<img>` nếu có, button "Chọn ảnh từ Media Library" (mở modal list `/api/admin/media?folder=homepage`), button upload mới (multipart `POST /api/admin/media`), button "Bỏ chọn" set null. Submit cùng save flow. |
| `RQ-10` | `Hero` (`src/domains/job-board/components/landing/hero.tsx`) chấp nhận prop `backgroundImage: string \| null`; render `<img>` absolute layer với overlay gradient nếu có; fallback gradient-only nếu null. KHÔNG thay đổi kích thước/padding. |
| `RQ-11` | `app/(portal)/page.tsx` fetch settings via `/api/public/homepage-settings`, truyền `backgroundImage` cho Hero. Nếu public API 500 hoặc `heroImage === null` thì giữ gradient. |
| `RQ-12` | Admin settings — tabs 4 nhóm: `interface`, `contact`, `system`, `account`. State cục bộ `useState` (no URL). Mỗi tab là một Card chứa block tương ứng. |
| `RQ-13` | Tab `interface`: gom Page sizes, Blog card, Sticky card, Ảnh nền trang chủ mới. |
| `RQ-14` | Tab `contact`: 3 chat URL/phone (giữ nguyên khối hiện tại). |
| `RQ-15` | Tab `system`: 4 placeholder cũ (Bảo mật, Thông báo, Tích hợp, Nhật ký hệ thống) gộp vào danh sách, badge `Chưa khả dụng`. |
| `RQ-16` | Tab `account`: Card "Quản lý tài khoản" với description + Link `<Link href="/admin/users">`. |
| `RQ-17` | `recruiting-projects-section.tsx`: nhận `title: string` (project name) + `availableSlots: number`. Card title = `title` (không phải `job.title`); monogram = `deriveMonogram(title)`; thêm subtitle nhỏ `Vị trí: {positionTitle}` lấy từ prop mới `positionTitle`. |
| `RQ-18` | `app/(portal)/page.tsx` truyền `{ id, title: companyName, availableSlots, positionTitle: positionTitles[0] }` cho từng card. Khi `positionTitles[0]` rỗng thì ẩn dòng subtitle. |
| `RQ-19` | Static fences cập nhật: `public-listing.params.test.ts` thêm test cho 6 bucket whitelist; `public-listing.static.test.ts` thêm assert `salary` không xuất hiện trong `BANNED_PARAMS` (note: `salary` chính là một bucket param hợp lệ — chỉ cấm nếu parser quên nó). Sửa `settings-terminology.static.test.ts` + `admin-settings-form.ui2.test.ts` để tab structure mới pass. |
| `RQ-20` | Required gates PASS trên worktree `codex/t2-public-site-hotfix`. CI 4/4 xanh (Quality, Vercel Build, Vercel Preview, Integration) trước khi bàn giao. |

### 4.2 Scope boundaries

- **In:** Files trong §0 In-scope roots. Đặc biệt: `app/(jobs)/viec-lam/page.tsx`, `app/admin/settings/admin-settings-form.tsx`, `src/domains/job-board/components/landing/hero.tsx`, `app/(portal)/page.tsx`, `src/domains/job-board/components/landing/recruiting-projects-section.tsx`, `src/domains/job-board/public-listing.params.ts`, `src/domains/job-board/public.service.ts`, `src/domains/job-board/public-types.ts`, `src/domains/job-board/public-settings.service.ts`, `prisma/schema.prisma`, `prisma/migrations/<ts>_t2_homepage_hero_image/`, `app/api/public/homepage-settings/route.ts`, `app/api/admin/homepage-settings/route.ts`.
- **Out:** Các domain/worktree khác (đã có PR riêng đang chạm); schema/RLS của các bảng khác; public card detail page.
- **Allowed task artifacts:** `docs/tasks/hrp-t2-public-site-hotfix/**` (TASK.md, HANDOFF.md).

### 4.3 Domain boundaries

- **Data/state:** Salary bucket là state URL-derived; heroImage là singleton column; không thêm bảng. Public DTO `PublicJobDto` không thêm field (companyName đã có).
- **Permission/security:** Admin route `/api/admin/homepage-settings` giữ role gate (ADMIN/HR_MANAGER/DIRECTOR); không đổi. Media picker gọi admin route — đã gate.
- **Interface/API:** Thêm một key `salary` trong search params `/viec-lam` (URL contract). `HomepageSettingsDto.heroImage` là field mới, optional.
- **Migration/rollback:** 1 migration add-only — `homepage_settings.hero_image_media_id TEXT NULL` + FK. Rollback = drop column. KHÔNG đổi FK cũ. KHÔNG backfill (cột null).

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `prisma/schema.prisma` + `prisma/migrations/<ts>_t2_homepage_hero_image/migration.sql` | Add `heroImageMediaId String? @relation ...` | `npx prisma validate` | Validate fail → revert & log |
| `STEP-02` | `src/domains/job-board/public-types.ts` + `public-settings.service.ts` + `app/api/admin/homepage-settings/route.ts` + `app/api/public/homepage-settings/route.ts` | Add heroImage to DTO + service write/read | `npm run typecheck` | typecheck fail → revert |
| `STEP-03` | `src/domains/job-board/public-listing.params.ts` | Add `salary` parser + href + indexable | `npm run test:unit src/domains/job-board/public-listing.params.test.ts` | test fail → adjust |
| `STEP-04` | `src/domains/job-board/public.service.ts` | Apply salary filter in `listPublicJobProjection` | `npm run test:unit src/domains/job-board/public-service*.test.ts` | test fail → adjust |
| `STEP-05` | `app/(jobs)/viec-lam/page.tsx` | Add Salary select to FilterForm | `npm run test:unit src/domains/job-board/public-listing.static.test.ts` | static fail → adjust |
| `STEP-06` | `src/domains/job-board/components/landing/hero.tsx` + `app/(portal)/page.tsx` | Hero reads heroImage; render or fallback | `npm run typecheck` + manual mental check | mismatch → revert |
| `STEP-07` | `app/admin/settings/admin-settings-form.tsx` + new `_components/settings-tabs.tsx` + `_components/media-picker.tsx` | Tabs (4) + Hero image picker block | `npm run test:unit app/admin/settings/__tests__/*.test.ts` | fence fail → adjust |
| `STEP-08` | `src/domains/job-board/components/landing/recruiting-projects-section.tsx` + `app/(portal)/page.tsx` | Recruiting card: project name + position subtitle | `npm run test:unit` (existing) | test fail → adjust |
| `STEP-09` | Update all impacted static fences (`public-listing.params.test.ts`, `public-listing.static.test.ts`, `settings-terminology.static.test.ts`, `admin-settings-form.ui2.test.ts`) | Tests reflect new contract | `npm run test:unit` | fence fail → adjust |
| `STEP-10` | `docs/tasks/hrp-t2-public-site-hotfix/HANDOFF.md` + commit + push + open PR | Deliverable | CI 4/4 green | CI red → adjust until green |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `/viec-lam` URL `?salary=10-15` trả về jobs có `salaryMinVnd/1e6 ≤ 15` và loại bỏ job có `salaryMinVnd === null` | `curl` + integration test; static test đo `parseListingSearchParams({salary:'10-15'}).salary === '10-15'` |
| `AC-02` | 6 bucket whitelist: `<5`, `5-10`, `10-15`, `15-20`, `20-30`, `>30`; mọi input khác trả `undefined` | unit test |
| `AC-03` | `buildListingHref` không bao giờ phát `salary` khi giá trị `undefined`; có ghi `salary=10-15` khi bucket chọn | unit test (mở rộng `BANNED_PARAMS`-style) |
| `AC-04` | `listingIsIndexable` trả `false` khi có `salary` | unit test |
| `AC-05` | `HomepageSettings.heroImage` join `Media` đúng khi `heroImageMediaId` set; null khi clear; null khi media deleted | service test |
| `AC-06` | Hero render `<img>` layer khi `backgroundImage` prop != null; fallback gradient khi null | manual mental check + static test ở hero.tsx (assert có/ không có thẻ img) |
| `AC-07` | Settings form có 4 tab; mỗi tab render đúng block | unit test đọc source |
| `AC-08` | Tab `account` chỉ là Link tới `/admin/users`, KHÔNG có form input | static test |
| `AC-09` | Recruiting card hiển thị project name (canonical) làm title; position là subtitle; monogram sinh từ project name | static test |
| `AC-10` | Migration apply thành công; column add-only, không ảnh hưởng row hiện có | `prisma migrate status` |
| `AC-11` | UTF-8 no-BOM cho toàn changed surface | `node .ai-pipeline/scripts/verify-encoding.mjs` |
| `AC-12` | CI run với 4/4 PASS (Quality, Integration, Vercel Build, Vercel Preview Comments) | gh CLI |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | STEP-05 | AC-01, AC-03 |
| `RQ-02` | STEP-03 | AC-02 |
| `RQ-03` | STEP-03 | AC-03, AC-04 |
| `RQ-04` | STEP-04 | AC-01 |
| `RQ-05` | (doc-only) | — |
| `RQ-06` | STEP-01 | AC-10 |
| `RQ-07` | STEP-02 | AC-05 |
| `RQ-08` | STEP-02 | AC-05 |
| `RQ-09` | STEP-07 | AC-07 |
| `RQ-10` | STEP-06 | AC-06 |
| `RQ-11` | STEP-06 | AC-06 |
| `RQ-12` | STEP-07 | AC-07 |
| `RQ-13` | STEP-07 | AC-07 |
| `RQ-14` | STEP-07 | AC-07 |
| `RQ-15` | STEP-07 | AC-07 |
| `RQ-16` | STEP-07 | AC-08 |
| `RQ-17` | STEP-08 | AC-09 |
| `RQ-18` | STEP-08 | AC-09 |
| `RQ-19` | STEP-09 | AC-01..AC-09 |
| `RQ-20` | STEP-10 | AC-11, AC-12 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Bucket enum thay đổi → URL cũ `?salary=...` lệch expectation. | Whitelist cứng trong parser, mọi unknown → `undefined` (như behavior cũ với `salary` không nằm trong `BANNED_PARAMS`). |
| `RISK-02` | `Media` row bị xóa → `heroImageMediaId` FK sẽ cascade SET NULL (theo DEC-03) → hero fallback gradient, không crash. | FK ON DELETE SET NULL đã chốt. Service detect null và trả `null` cho DTO. |
| `RISK-03` | Tab state local useState sẽ mất khi reload → tab mặc định 'interface'. Acceptable vì tab chỉ là UI grouping, không phải data. | Doc trong HANDOFF. |
| `RISK-04` | Recruiting card đổi `job.title` → `companyName` có thể ảnh hưởng test cũ. | Cập nhật test trong STEP-09. |
| `RISK-05` | Media picker gọi `/api/admin/media` — admin route đã gate; nhưng cần confirm tab `system` không hiển thị media picker. | Media picker chỉ trong tab `interface`. |

## 8. Open Questions

- None.

## 9. Planner Resolution

Tier 1 append sau review/audit.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-07 | Initial contract | Initial |
| `v1.0` | 2026-10-07 | Status → ACCEPTED; HANDOFF.md appended; all 4 gates GREEN (`tsc --noEmit` 0 errors, `lint` 0 errors, `vitest run` 4947 tests passed, `next build` success, `verify-encoding.mjs` 24 files UTF-8 no-BOM); awaiting PR push + CI 4/4 GREEN | Implementation complete |