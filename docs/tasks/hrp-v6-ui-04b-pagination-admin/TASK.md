# TASK B — `hrp-v6-ui-04b-pagination-admin`

> Canonical contract path. Tier 1 owns this file; Tier 2 owns HANDOFF + evidence + source/test được phép sửa.
> Mandate: `docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md` (Tier 0 chỉ thị 10/09/2026, đã chốt A1–A16 + B1–B11).
> Plan tổng thể: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-overview.md`.
> Skeleton: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/skeleton-B-C-D.md` (§TASK B).
> Field matrix: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md` (§6 Settings, §7 Tab, §8 Pagination, §9 Permission).
> Plan Admin V6 mapping: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-admin-v6.md` (§2 AV1).
> Tier 1 đặt TASK.md này ngay sau khi TASK A `ACCEPTED` (commit `d3add63`).

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04b-pagination-admin` |
| Work type | `MIXED` (UI controls + read integration + new read API + new admin write API + schema migration) |
| Assurance lane | `CRITICAL` |
| Audit mode | `DEEP` trên schema/permission/data changed surface (KHÔNG quét toàn repo) |
| Spec version | `v1.0` |
| Status | `DRAFT` |
| Planner | `Tier 1` |
| Baseline | `d3add63` — HEAD hiện tại (sau khi TASK A `ACCEPTED`) |
| Source reference | TASK A audit commit `a4e472f` (UI-04A thi công). UI-03 source reference `4d9a633` (UI-03 audit) vẫn áp dụng cho field parity |
| Plan UI predecessor | TASK A `ACCEPTED` |
| Plan UI successor | TASK C `DRAFT` (Section Renderer + Demo Content) |
| Plan Admin V6 mapping | AV1 `HomepageSettings + Query API` (skeleton ở `plan-admin-v6.md` §2). Plan B mở phần public read + UI integration; ADMIN write page + form sang AV1 implementation task (Tier 1 lập AV1-TASK sau khi Plan B verify contract) |
| In-scope roots | `app/(portal)/page.tsx`, `src/domains/job-board/components/landing/best-jobs-section.tsx`, `src/domains/job-board/public-types.ts` (NEW), `src/domains/job-board/public-settings.service.ts` (NEW), `src/domains/job-board/public.service.ts`, `app/api/jobs/route.ts`, `app/api/admin/homepage-settings/route.ts` (NEW), `prisma/schema.prisma` (ADD only), `prisma/migrations/<ts>_homepage_settings/migration.sql` (NEW), `src/shared/auth/permission-catalog.ts`, `prisma/seed.mjs`, `docs/tasks/hrp-v6-ui-04b-pagination-admin/**` |
| Forbidden paths | `app/admin/settings/**` (sang AV1 implementation), `prisma/schema.prisma` NGOÀI ADD `HomepageSettings` table + `updatedById User relation` (KHÔNG drop/rename existing), `src/domains/job-board/public.service.ts` NGOÀI filter URGENT (KHÔNG restyle `q`/`area`/`shift`/facet/overview), `app/(jobs)/viec-lam/[slug]/**` (sang Plan UI D.A), `app/admin/**` settings page, `app/api/jobs/submissions/**` (Phase 5, NGOÀI scope), `src/shared/auth/**` NGOÀI `permission-catalog.ts` (KHÔNG đổi resolver), `app/api/admin/commission-policies/**` (P2 commission, NGOÀI scope), `app/admin/jobs/**` (Plan Admin V6 AV2 editor), schema/database/file MIGRATION bất kỳ NGOÀI HomepageSettings ADD-only, mọi file trong `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**` (Tier 1 plane — DEC-19) |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set với TASK A baseline + new failure count = 0; `npm run test:unit -- public-card-truth` exit 0; `npm run build` exit 0; `npx prisma validate` exit 0; `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` KHÔNG có DROP (ADD-only); `npx prisma generate` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-pagination-admin/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; permission integration test: POST `/api/admin/homepage-settings` không phải ADMIN → 403 |
| Visual gate | **Owner live review post-push** (DEC-18 chung — giữ override mới nhất). KHÔNG Edge/CDP/20 PNG/overlay/bbox markers; KHÔNG Lighthouse/pa11y/axe-core auto-install. Tier 3 KHÔNG audit visual; KHÔNG fail vì thiếu screenshot |
| Current execution round | `0` (DRAFT) |
| Next gate | `/code → Tier 2 thi công → verify-task PASS → verify-handoff PASS → Tier 1 trình /audit → Tier 3 DEEP audit → /resolve → push Git → Owner live visual review post-deploy` |

> **Nguyên tắc Plan B**: (1) UI controls + view-model `HomepageSettingsView { source: 'REAL' | 'INTEGRATION_PENDING' }` để sẵn sàng cho AV1 publish. (2) Mở scope `/api/jobs?urgency=URGENT&limit=N&offset=M` (B4) trong Plan UI B, KHÔNG mở schema `JobPosting` (sang AV2). (3) Tier 2 KHÔNG viết Admin settings page — sang AV1. Plan B chỉ expose read API để UI consume.

## 1. Outcome

### 1.1 User-visible outcome

Trang chủ `/` sau khi thi công đạt phần điều khiển (controls) pagination + tab filter URGENT theo `field-matrix.md` §7–§8, **KHÔNG** thay đổi phần dữ liệu thật vốn đã chạy từ TASK A:

#### BestJobs tab filter (RQ-01, B1, B2)
- Hai tab pill ngay dưới tiêu đề section "Việc làm tốt nhất":
  - `Tất cả` (default, label thường)
  - `Tuyển gấp` (badge đếm số việc URGENT, icon `local_fire_department` 16px)
- `Tuyển gấp` chỉ filter `urgency === 'URGENT'` (CHỈ URGENT, KHÔNG bao gồm `CLOSING` — DEC-04 §B2 điều chỉnh).
- Khi đổi tab:
  - `Tất cả` → fetch `/api/jobs?limit=N&offset=0` (giữ bestJobsPageSize config) — overview `newest` fallback `topPaid` cùng cấu trúc.
  - `Tuyển gấp` → fetch `/api/jobs?urgency=URGENT&limit=N&offset=0` — chỉ render dòng có `urgency === 'URGENT'`.
- Tab đang chọn: pill `bg-primary-container text-white font-bold` (CTA state), tab kia `bg-surface text-on-surface font-label`. ARIA: `role="tablist"` + mỗi pill `role="tab" aria-selected`.
- Số việc đếm trên pill `Tuyển gấp` lấy từ overview total KHÔNG filter (giữ nhất quán với tag facet hiện có — DEC-08 UI-04A). Khi `Tuyển gấp` đang active → render grid lọc từ `/api/jobs` riêng.

#### BestJobs pagination prev/next (RQ-02, B3, B5, B6)
- Pagination control dưới grid BestJobs (chỉ hiển thị khi `total > bestJobsPageSize`):
  - Nút `← Trước` (disabled khi offset = 0)
  - Range hiển thị: `Trang X / Y` (Y = ceil(total / bestJobsPageSize), X = floor(offset / bestJobsPageSize) + 1)
  - Nút `Sau →` (disabled khi offset + bestJobsPageSize ≥ total)
- Mỗi lần click → fetch `/api/jobs?urgency=URGENT&limit=N&offset=M` hoặc không urgency tuỳ tab active. State offset giữ trong client `useState` riêng (KHÔNG dùng sentinel — Plan B đổi từ append/load-more sang prev/next cho BestJobs; homepage search giữ sentinel per B9).
- Tie-breaker thứ tự: `postedAt desc + id desc` (DEC-08 field-matrix §8).
- bestJobsPageSize đọc từ view-model `HomepageSettingsView.settings?.bestJobsPageSize ?? 9` (default fallback khi `INTEGRATION_PENDING`).
- Range hợp lệ: `{3, 6, 9, 12}`. Validate server-side nếu query truyền `limit` ngoài range → clamp về default 9 + log.

#### Listing page `/viec-lam` (RQ-03, B7, B8)
- SSR pagination URL `/viec-lam?page=N` giữ contract cũ (B8) — KHÔNG phá canonical/metadata.
- `listingPageSize` đọc từ view-model `HomepageSettingsView.settings?.listingPageSize ?? 12` (default fallback).
- Validate range `[6..50]` server-side: query ngoài range → clamp về default 12 + log. KHÔNG 400, KHÔNG ép PASS — B8 là lựa chọn mật độ.
- Pagination URL giữ nguyên `searchParams.page`; component render prev/next + trang hiện tại. Loader check view-model source: `INTEGRATION_PENDING` → dùng default 12.

#### Settings API read-side (RQ-04, B10, B11)
- `GET /api/admin/homepage-settings` (public projection): trả `{ id: 'default', bestJobsPageSize: 3|6|9|12, listingPageSize: 6..50, updatedAt }`.
- Cache strategy: Next.js `unstable_cache` với tag `homepage-settings` + TTL fallback 60s. Khi AV1 implement write, gọi `revalidateTag('homepage-settings')` ở POST.
- Hiện tại Plan B: server init bootstrap row nếu chưa có (idempotent UPSERT với `id='default'`). Tier 2 viết service `public-settings.service.ts` đảm bảo singleton row tồn tại.
- Client UI consume view-model qua prop `initialHomepageSettings: HomepageSettingsView` (parent server component fetch qua service).
- Không ADMIN write endpoint trong Plan B — sang AV1 implementation task.

#### Schema HomepageSettings (RQ-05, B10)
- ADD-only migration:
  ```prisma
  model HomepageSettings {
    id                String   @id @default("default")
    bestJobsPageSize  Int      @default(9)
    listingPageSize   Int      @default(12)
    createdAt         DateTime @default(now())
    updatedAt         DateTime @updatedAt
    updatedById       String?
    updatedBy         User?    @relation(fields: [updatedById], references: [id])
    @@index([updatedAt])
  }
  ```
- Migration SQL: `CREATE TABLE homepage_settings (...)` + `ALTER TABLE homepage_settings ADD CONSTRAINT homepage_settings_id_check CHECK (id = 'default')`. ADD-only — KHÔNG drop/rename bất kỳ table/column nào hiện có.
- Invariant DB: CHECK constraint ép `id = 'default'`. Tier 2 verify constraint có trong migration SQL.

#### Permission CAN_EDIT_HOMEPAGE_SETTINGS (RQ-06, B11)
- Thêm permission mới vào `src/shared/auth/permission-catalog.ts`:
  ```ts
  { code: 'CAN_EDIT_HOMEPAGE_SETTINGS', group: PERMISSION_GROUPS.SYSTEM, description: 'Sửa HomepageSettings singleton (chỉ ADMIN).' }
  ```
- Seed mới vào `prisma/seed.mjs` §PERMISSION_CATALOG (10 → 11 codes; DEC-02 yêu cầu ≥10):
  ```js
  { role: 'ADMIN', code: 'CAN_EDIT_HOMEPAGE_SETTINGS' },
  ```
- ADMIN đã có short-circuit ALL trong resolver — vẫn seed row để permission catalog đầy đủ.
- POST `/api/admin/homepage-settings` (sang AV1): check `CAN_EDIT_HOMEPAGE_SETTINGS`. KHÔNG implement trong Plan B; Plan B chỉ thêm permission catalog + seed.

### 1.2 Non-goals

- KHÔNG viết Admin settings page (`app/admin/settings/page.tsx`) — sang AV1 implementation.
- KHÔNG viết POST `/api/admin/homepage-settings` write API — sang AV1.
- KHÔNG mở schema `JobPosting`/`EditorialContent`/`Media` (sang AV2).
- KHÔNG thêm CMS homepage content fields (Giới thiệu, Tin tức, banner mobile, đối tác) — sang AV2 + Plan UI C.
- KHÔNG thêm tab filter BestJobs thứ ba (vd `Mới nhất`, `Lương cao`); chỉ `Tất cả` + `Tuyển gấp` theo B1.
- KHÔNG đổi `q`/`area`/`shift`/`shiftTypes`/`jobTypes` filter semantics trong `/api/jobs`. Chỉ mở thêm `urgency`.
- KHÔNG thêm sort options client (chỉ `postedAt desc + id desc` cố định).
- KHÔNG thay đổi Hero search card wrapper (A16 đã chốt ở TASK A) ngoài việc consume `bestJobsPageSize` cho sentinel pageSize.
- KHÔNG đổi sentinel load-more của homepage search (B9 — append/load-more giữ nguyên). Sentinel dùng `PAGE_SIZE = 12` fallback hoặc đọc `listingPageSize` từ view-model (Tier 2 chọn approach).
- KHÔNG thay đổi `/viec-lam/[slug]` page (sang Plan UI D.A).
- KHÔNG thay đổi `AreasSection`/`ReferralStrip`/`RecruitingProjectsSection` container (TASK A đã chốt 1200px).
- KHÔNG phát minh SUPER_ADMIN. KHÔNG đổi `permission-resolver.ts`.
- KHÔNG reset cache toàn repo. KHÔNG đổi `with-public-db.ts` / `with-db-context.ts`.
- KHÔNG sửa task khác trong plan cha `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`.

### 1.3 Plan UI split reminder

| Công việc | Thuộc plan | Task slug dự kiến |
|---|---|---|
| Container + Navbar polish + A16 search card + BestJobs/Recruiting cards | **Plan UI A** | `hrp-v6-ui-04a-visual-polish` (ACCEPTED) |
| Tab filter + pagination thật + UI controls + view-model INTEGRATION_PENDING | **Plan UI B (task này)** | `hrp-v6-ui-04b-pagination-admin` |
| Sections mới + demo content có cấu trúc | Plan UI C | `hrp-v6-ui-04c-section-render` |
| Detail page UI (editorial sections skeleton) | Plan UI D.A | `hrp-v6-ui-04d-detail-ui` |
| HomepageSettings schema + Admin write API + permission + read API | **Plan Admin V6 AV1** | `hrp-v6-admin-v6-av1-settings-editor` |
| Editor tin Admin/Sale + JobPosting fields | Plan Admin V6 AV2 | `hrp-v6-admin-v6-av2-jobposting-editor` |
| Tag tùy biến | Plan Admin V6 AV3 (defer) | `hrp-v6-admin-v6-av3-tags` |
| Media management | Plan Admin V6 AV4 | `hrp-v6-admin-v6-av4-media` |
| Cache invalidation + integration test | Plan Admin V6 AV5 | `hrp-v6-admin-v6-av5-cache-inttest` |

> Plan B là cầu nối giữa UI (cần `bestJobsPageSize`/`listingPageSize`) và backend (chưa có Admin UI). View-model `INTEGRATION_PENDING` cho phép UI nghiệm thu độc lập; AV1 chỉ cần thêm POST + settings page + revalidateTag để UI flip sang `REAL`.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/public.service.ts:574` `listPublicJobProjection` | Source signature hiện có: filter `q/area/shift/shiftTypes/jobTypes/offset/limit` — B4 mở thêm `urgency`. |
| `EV-02` | `src/domains/job-board/public.service.ts:359` `orderUrgency` | Urgency hiện compute từ `order.status === 'CLOSING_SOON'` + `deadlineDate`. URGENT chỉ khi còn `< URGENT_WITHIN_DAYS`. |
| `EV-03` | `src/domains/job-board/public.service.ts:411` `toDto` | Urgency propagate lên `PublicJobDto['urgency']` (NONE/CLOSING/URGENT/CLOSING_SOON). Filter URGENT ở service khả thi. |
| `EV-04` | `app/api/jobs/route.ts:25` `GET handler` | Endpoint hiện không nhận `urgency`. Plan B thêm vào searchParams + pass xuống service. |
| `EV-05` | `src/domains/job-board/components/landing/best-jobs-section.tsx` | Component hiện hardcode `.slice(0, 3)` + không có tab/pagination. Plan B refactor. |
| `EV-06` | `app/(portal)/page.tsx:200` `featuredJobs` | BestJobs lấy từ `overview.newest.slice(0, 3)` — KHÔNG qua `/api/jobs` riêng. Plan B đổi sang fetch qua `/api/jobs` riêng (kèm `urgency` + `limit=bestJobsPageSize`). |
| `EV-07` | `app/(jobs)/viec-lam/page.tsx` (sẽ đọc khi thi công) | SSR listing pagination URL `?page=N`. Plan B chỉ inject `listingPageSize` từ view-model. |
| `EV-08` | `src/shared/auth/permission-catalog.ts:88` `CAN_PUBLISH_JOB` | Pattern thêm permission mới: descriptor + group. Plan B thêm `CAN_EDIT_HOMEPAGE_SETTINGS` group SYSTEM. |
| `EV-09` | `prisma/seed.mjs:524` `CAN_PUBLISH_JOB` | Pattern seed permission cho role. Plan B seed ADMIN. |
| `EV-10` | `app/api/admin/commission-policies/route.ts` | Pattern admin write API: getAuthContext + withDbContext + AuthScopeError + role gate. Plan B KHÔNG viết write; AV1 mới viết. |
| `EV-11` | `prisma/schema.prisma` | Schema hiện KHÔNG có `HomepageSettings` table. Plan B ADD-only. |
| `EV-12` | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md` §6 | Canonical data contract cho `HomepageSettings`. Tier 2 dùng để typecheck. |
| `EV-13` | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md` §7, §8 | Tab filter + pagination contract. |
| `EV-14` | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md` §9 | Permission matrix — Plan B chỉ thêm CAN_EDIT_HOMEPAGE_SETTINGS seed ADMIN. |
| `EV-15` | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-admin-v6.md` §2 | AV1 mapping — Plan B là phần read-side + UI của AV1. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Tab `Tất cả` (default) + `Tuyển gấp` cho BestJobs. Logic filter: `urgency === 'URGENT'` (CHỈ URGENT, KHÔNG bao gồm CLOSING) | `CHOSEN` |
| `DEC-02` | Tab active style: `bg-primary-container text-white font-bold`. Tab inactive: `bg-surface text-on-surface font-label`. ARIA `role="tablist"` + `role="tab" aria-selected` | `CHOSEN` |
| `DEC-03` | BestJobs pagination control: prev/next + range "Trang X / Y". KHÔNG giữ sentinel cho BestJobs; sentinel chỉ còn ở homepage search results (B9) | `CHOSEN` |
| `DEC-04` | bestJobsPageSize default 9; range `{3, 6, 9, 12}` | `CHOSEN` |
| `DEC-05` | listingPageSize default 12; range integer `[6..50]`. Validate server-side: ngoài range → clamp default + log (KHÔNG 400) | `CHOSEN` |
| `DEC-06` | `/api/jobs` mở thêm `urgency=URGENT` query param. Filter URGENT trong service `listPublicJobProjection` ở memory layer (sau `q/area/shift/shiftTypes/jobTypes`, trước pagination) | `CHOSEN` |
| `DEC-07` | Tie-breaker order: `postedAt desc + id desc` | `CHOSEN` |
| `DEC-08` | Schema `HomepageSettings` singleton với CHECK constraint `id = 'default'`. ADD-only migration | `CHOSEN` |
| `DEC-09` | `public-settings.service.ts` mới: getSingleton + bootstrap row nếu chưa có (idempotent UPSERT với `id='default'`) | `CHOSEN` |
| `DEC-10` | `GET /api/admin/homepage-settings` trả public projection `{ id, bestJobsPageSize, listingPageSize, updatedAt }`. Cache: Next.js `unstable_cache` tag `homepage-settings` + TTL 60s fallback | `CHOSEN` |
| `DEC-11` | Permission mới: `CAN_EDIT_HOMEPAGE_SETTINGS` group SYSTEM. Seed ADMIN. ADMIN short-circuit ALL — permission chỉ để đầy đủ catalog (DEC-02 ≥10 codes) | `CHOSEN` |
| `DEC-12` | View-model `HomepageSettingsView`: `{ source: 'REAL' \| 'INTEGRATION_PENDING', settings: HomepageSettingsDto \| null, defaultBestJobsPageSize: 9, defaultListingPageSize: 12 }`. Source = `REAL` khi AV1 xong | `CHOSEN` |
| `DEC-13` | BestJobs fetch riêng qua `/api/jobs` (thay vì lấy `overview.newest.slice(0, 3)` ở page.tsx hiện tại). Lý do: cần `urgency` filter + pageSize từ settings | `CHOSEN` |
| `DEC-14` | Plan B KHÔNG viết Admin settings page + write API — sang AV1. Plan B chỉ expose read-side | `CHOSEN` |
| `DEC-15` | Migration ADD-only: `CREATE TABLE homepage_settings` + `ALTER TABLE ... ADD CONSTRAINT ... CHECK (id = 'default')`. Verify bằng `npx prisma migrate diff` không có DROP | `CHOSEN` |
| `DEC-16` | Tier 1 owns TASK.md canonical; Tier 2 owns HANDOFF + evidence + source/test được phép sửa. Tier 2 KHÔNG sửa TASK.md, KHÔNG sửa plan cha | `CHOSEN` |
| `DEC-17` | Baseline reference = `d3add63` (TASK A `ACCEPTED` HEAD). Execution HEAD đo ngay trước STEP-01 bằng `git rev-parse HEAD` → `evidence/exec-head-before.txt`. Expected unit failure set capture tại exec-head-before | `CHOSEN` |
| `DEC-18` | Visual parity = Owner live review post-push. KHÔNG Edge/CDP/PNG/bbox. Tier 3 KHÔNG audit visual; KHÔNG fail vì thiếu screenshot | `CHOSEN` |
| `DEC-19` | OBR-01 allow tạo file mới HANDOFF + `evidence/**` + source/test mới trong allowlist; KHÔNG cấm mọi path ngoài baseline-manifest | `CHOSEN` |
| `DEC-20` | OBR-02 scope-creep: Tier 2 không tự ý thêm path mới vào allowlist; nếu cần → halt, báo Tier 1 | `CHOSEN` |
| `DEC-21` | Fence tests cập nhật theo composition mới: `public-ui-premium.static.test.ts` (BestJobs tab + pagination), `public-ui-token-parity.static.test.ts` (tab className density), `marketplace-inventory.static.test.ts` (BestJobs prev/next selector), `public-card-truth.test.ts` (urgency filter mapping). Mỗi thay đổi có comment DEC-01 (tab/pagination) | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | BestJobs có 2 tab pill `Tất cả` (default) + `Tuyển gấp`. Logic filter `urgency === 'URGENT'`. Tab `Tuyển gấp` chỉ filter URGENT, KHÔNG bao gồm CLOSING |
| `RQ-02` | BestJobs pagination control: prev/next + range "Trang X / Y". Mỗi click fetch `/api/jobs?urgency=URGENT\|none&limit=N&offset=M` (N = bestJobsPageSize từ settings, fallback 9) |
| `RQ-03` | SSR `/viec-lam?page=N` pagination URL giữ contract cũ. `listingPageSize` từ view-model (fallback 12, range `[6..50]`) |
| `RQ-04` | Schema `HomepageSettings` ADD-only: id `default` (PK string), bestJobsPageSize Int default 9, listingPageSize Int default 12, updatedAt auto, updatedById FK to User nullable. Migration SQL có CHECK constraint `id = 'default'` |
| `RQ-05` | `GET /api/admin/homepage-settings` trả public projection. Cache: `unstable_cache` tag `homepage-settings` + TTL 60s. Bootstrap row idempotent nếu chưa có |
| `RQ-06` | Permission `CAN_EDIT_HOMEPAGE_SETTINGS` group SYSTEM thêm vào catalog + seed ADMIN. Catalog 10 → 11 codes (DEC-02 ≥10) |
| `RQ-07` | `/api/jobs` mở thêm `urgency=URGENT` query. Filter URGENT ở service `listPublicJobProjection` memory layer (sau q/area/shift/shiftTypes/jobTypes, trước pagination). Order tie-breaker `postedAt desc + id desc` |
| `RQ-08` | `/api/jobs` validate `limit` ngoài range `{3..50}` → clamp default 9 (bestJobs) hoặc default 12 (listing) + log. KHÔNG 400 |
| `RQ-09` | View-model `HomepageSettingsView` type export từ `src/domains/job-board/public-types.ts`. UI consume qua prop `initialHomepageSettings`. Default `bestJobsPageSize = 9`, `listingPageSize = 12` khi `INTEGRATION_PENDING` |
| `RQ-10` | BestJobs fetch riêng qua `/api/jobs?urgency=URGENT\|none&limit=N&offset=M` (KHÔNG dùng `overview.newest.slice(0, 3)` cũ). Sentinel load-more homepage search giữ nguyên (B9) |
| `RQ-11` | Regression shell: Navbar shell không đổi (TASK A đã chốt). BestJobs layout/grid responsive: mobile 1 col, tablet 2 col, desktop 3 col (giữ TASK A) |
| `RQ-12` | Fence tests cập nhật theo composition mới (allowlist §11 OBR-02). Mỗi thay đổi có comment DEC-01 (tab/pagination) + file:line |
| `RQ-13` | Tier 2 typography đối chiếu `app/globals.css` token table thực có (DEC-21 TASK A); nếu class thiếu, bổ sung scoped class vào `app/globals.css` |
| `RQ-14` | Migration verify ADD-only: `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` không có DROP statement. Verify CHECK constraint có trong SQL output |
| `RQ-15` | Visual parity gate: (a) code-side parity §1.1; (b) Owner live review post-push trên deployed homepage (DEC-18) |

### 4.2 Domain boundaries

- **Container-only edits**: KHÔNG thuộc Plan B (TASK A đã chốt 1200px). Tier 2 KHÔNG đổi container/padding ở Areas/CTV/Footer/Hero
- **Data/state**: thêm `HomepageSettings` table ADD-only. `JobOpening`/`JobPosting`/Media chưa chạm (sang AV2)
- **Permission/security**: thêm `CAN_EDIT_HOMEPAGE_SETTINGS` vào catalog + seed ADMIN. Resolver KHÔNG đổi. ADMIN write API KHÔNG viết (sang AV1)
- **Interface/API**: thêm `GET /api/admin/homepage-settings` (read-only). Mở `urgency` query trên `GET /api/jobs`. KHÔNG thêm route mới NGOÀI 2 route trên
- **Migration/rollback**: ADD-only migration. Rollback: DROP TABLE homepage_settings (Plan Admin V6 AV5 chịu rollback policy)
- **Cache**: Next.js `unstable_cache` tag `homepage-settings` + TTL 60s. AV1 write API sẽ `revalidateTag`

### 4.3 Scope

- In: §0 In-scope roots
- Out: §0 Forbidden + §1.2
- Tier 2 tạo HANDOFF + `evidence/**` tại `docs/tasks/hrp-v6-ui-04b-pagination-admin/`. Tier 2 KHÔNG ghi TASK.md, KHÔNG ghi plan cha

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | OBR-01 baseline + execution HEAD | Record: (a) `git rev-parse HEAD` → `evidence/exec-head-before.txt`. (b) Source reference = TASK A `a4e472f`. (c) Capture unit failure set hiện tại → `evidence/expected-failure-set-before.txt`. (d) `git status --porcelain` → `evidence/working-tree-before.txt` | `git status --porcelain` không có path ngoài §1.3 dirty set; expected-failure-set-before.txt có hash + failing test files | Nếu expected failure set > 3 (TASK A baseline) → verify đo đúng lúc exec-head-before; nếu > 3 → báo Planner |
| `STEP-02` | `prisma/schema.prisma` + `prisma/migrations/<ts>_homepage_settings/migration.sql` (NEW) | ADD `HomepageSettings` model: id `default` PK, bestJobsPageSize Int default 9, listingPageSize Int default 12, updatedAt auto, updatedById FK to User nullable, @@index([updatedAt]). Migration SQL: `CREATE TABLE homepage_settings (...)` + `ALTER TABLE ... ADD CONSTRAINT ... CHECK (id = 'default')` | `npx prisma validate` exit 0; `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` không có DROP; `npx prisma generate` exit 0 | Nếu diff có DROP/ALTER TABLE existing → revert, escalate |
| `STEP-03` | `src/shared/auth/permission-catalog.ts` + `prisma/seed.mjs` | Thêm `CAN_EDIT_HOMEPAGE_SETTINGS` group SYSTEM vào PERMISSION_CATALOG. Seed `ADMIN → CAN_EDIT_HOMEPAGE_SETTINGS` trong ROLE_PERMISSION_SEED | `npm run test:unit -- permission-catalog` PASS; `node prisma/seed.mjs` (dry-run import) không throw | Nếu seed fail → verify schema permission table có sẵn row cho 10 codes trước |
| `STEP-04` | `src/domains/job-board/public-types.ts` (NEW) + `src/domains/job-board/public-settings.service.ts` (NEW) | Export types `HomepageSettingsDto`, `HomepageSettingsView`, `MediaStatus`, `PublishStatus` (theo field-matrix §12). Service `public-settings.service.ts`: `getHomepageSettings(tx)` idempotent UPSERT bootstrap nếu row chưa có | `npm run typecheck` exit 0; source review types khớp field-matrix §6 | Nếu service throw khi singleton chưa có → fix bootstrap, KHÔNG silent fallback |
| `STEP-05` | `app/api/admin/homepage-settings/route.ts` (NEW) | `GET /api/admin/homepage-settings` — public projection. Cache `unstable_cache` tag `homepage-settings` + TTL 60s. KHÔNG auth required (public read của projection). Trả `{ id, bestJobsPageSize, listingPageSize, updatedAt }` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/homepage-settings` → 200; body khớp shape | Nếu route trả 500 → check service + types |
| `STEP-06` | `src/domains/job-board/public.service.ts` + `app/api/jobs/route.ts` | Mở filter `urgency=URGENT` ở `listPublicJobProjection` (memory layer, sau q/area/shift/shiftTypes/jobTypes, trước pagination). Tie-breaker `postedAt desc + id desc` (đã có sẵn). Route `/api/jobs` parse `urgency` từ searchParams + pass xuống. Validate `limit` ngoài `{3..50}` → clamp default 9 + log | `npm run test:unit -- public-card-truth` PASS; source review service + route | Nếu filter URGENT trả 0 khi có URGENT job → fix memory filter, KHÔNG ép SQL where |
| `STEP-07` | `src/domains/job-board/components/landing/best-jobs-section.tsx` | Refactor: nhận props `jobs: EnrichedJob[]`, `total: number`, `pageSize: number`, `offset: number`, `tab: 'all' \| 'urgent'`, `onTabChange`, `onPrev`, `onNext`, `buildHref`. Render 2 tab pill (role tablist/tab/aria-selected). Render pagination control (prev/next + range "Trang X / Y") khi `total > pageSize`. KHÔNG hardcode `.slice(0, 3)` — lấy từ props | Source review: tab ARIA + pagination selector + slice từ props (KHÔNG hardcode 3); container 1200px giữ (TASK A) | Nếu tab ARIA thiếu → sửa; nếu slice hardcode → revert |
| `STEP-08` | `app/(portal)/page.tsx` | Thêm state `bestJobsTab` (`'all' \| 'urgent'`), `bestJobsOffset`, fetch riêng qua `/api/jobs` (khi tab active: thêm `urgency=URGENT`). `featuredJobs` đổi từ `overview.newest.slice(0, 3)` sang fetch riêng. Sentinel load-more homepage search giữ (B9). Pass `initialHomepageSettings` từ server component | Source review: state + fetch URL + sentinel KHÔNG đổi; `initialHomepageSettings` từ server fetch `getHomepageSettings` | Nếu fetch riêng BestJobs làm duplicate data với sentinel → tách state, sentinel chỉ manage homepage search results |
| `STEP-09` | `app/(jobs)/viec-lam/page.tsx` | Inject `listingPageSize` từ `initialHomepageSettings.settings?.listingPageSize ?? 12`. Validate range `[6..50]`. Pagination URL `?page=N` giữ contract | Source review: query limit từ view-model, fallback 12, validation | Nếu query trả 400 khi pageSize ngoài range → fix validate clamp |
| `STEP-10` | Fence tests cập nhật allowlist §11 OBR-02 (DEC-21) | Update `public-ui-premium.static.test.ts` (BestJobs tab + pagination), `public-ui-token-parity.static.test.ts` (tab className density), `marketplace-inventory.static.test.ts` (BestJobs prev/next selector), `public-card-truth.test.ts` (urgency filter mapping). Mỗi change có comment DEC-01 + file:line | `npm run test:unit -- public-card-truth` exit 0; full `npm run test:unit` cùng expected failure set với expected-failure-set-before + new failure count = 0 | Nếu test fail ngoài expected → halt, báo Planner |
| `STEP-11` | Regression check shell + mandatory gates (DEC-18) | Source review import `GlobalNavbar` không đổi (TASK A đã chốt). `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + new failure count = 0; `npm run test:unit -- public-card-truth` exit 0; `npm run build` exit 0; `npx prisma validate` exit 0; `npx prisma migrate diff` không có DROP; `npx prisma generate` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-pagination-admin/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS | `evidence/ac13-gates.txt` | Nếu gate fail → halt, sửa, KHÔNG ghi READY_FOR_AUDIT |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method (command/source review/evidence file) |
|---|---|---|
| `AC-01` | Schema `HomepageSettings` ADD-only — `git diff --cached -- prisma/schema.prisma` chỉ `+`, không `-` | `git diff HEAD -- prisma/schema.prisma` (PowerShell: `git diff --cached -- prisma/schema.prisma \| Select-String "^-" ` → 0 match NGOÀI `-` comment). Lưu `evidence/ac01-schema-addonly.txt`. Migration SQL có CHECK constraint `id = 'default'` |
| `AC-02` | Migration không có DROP statement | `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` output không chứa `DROP TABLE\|DROP COLUMN` (case-insensitive). Lưu `evidence/ac02-migration-no-drop.txt` |
| `AC-03` | Permission `CAN_EDIT_HOMEPAGE_SETTINGS` group SYSTEM có trong catalog + seed ADMIN | `rg -n "CAN_EDIT_HOMEPAGE_SETTINGS" src/shared/auth/permission-catalog.ts prisma/seed.mjs` (PowerShell; expect 2+ matches: 1 trong catalog descriptor, 1 trong ROLE_PERMISSION_SEED cho ADMIN). Lưu `evidence/ac03-permission-catalog.txt` |
| `AC-04` | Service `public-settings.service.ts` có bootstrap idempotent + types export | `rg -n "HomepageSettingsView\|HomepageSettingsDto" src/domains/job-board/public-types.ts src/domains/job-board/public-settings.service.ts` (expect matches). Source review `getHomepageSettings` có idempotent UPSERT path. Lưu `evidence/ac04-settings-service.txt` |
| `AC-05` | `GET /api/admin/homepage-settings` trả public projection đúng shape | `curl -s http://localhost:3000/api/admin/homepage-settings \| jq '.id, .bestJobsPageSize, .listingPageSize, .updatedAt'` (sau khi `npm run build`). Expect non-null. Lưu `evidence/ac05-admin-settings-get.txt` (capture cả curl output) |
| `AC-06` | `/api/jobs?urgency=URGENT` filter đúng (CHỈ URGENT, KHÔNG CLOSING) | `curl -s "http://localhost:3000/api/jobs?urgency=URGENT&limit=50" \| jq '.jobs[].urgency'` — expect tất cả `"URGENT"` (KHÔNG có `"CLOSING"` hoặc `"NONE"`). Lưu `evidence/ac06-jobs-urgent-filter.txt` |
| `AC-07` | Tie-breaker order: `postedAt desc + id desc` | `curl -s "http://localhost:3000/api/jobs?limit=50" \| jq '[.jobs[] \| {postedAt, id}]'` — verify `postedAt` descending, tie `postedAt` thì `id` descending. Lưu `evidence/ac07-tie-breaker.txt` |
| `AC-08` | `/api/jobs` validate limit ngoài range → clamp default + log (KHÔNG 400) | `curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/jobs?limit=999"` → 200. Verify log có "limit clamped to 9" hoặc tương đương (Tier 2 grep server log hoặc unit test). Lưu `evidence/ac08-limit-clamp.txt` |
| `AC-09` | BestJobs tab `Tất cả` (default) + `Tuyển gấp` filter đúng `urgency === 'URGENT'` | **Manual source review** `app/(portal)/page.tsx`: state `bestJobsTab` (`'all' \| 'urgent'`), fetch riêng `/api/jobs?urgency=URGENT&limit=N&offset=M` khi tab = 'urgent'. Command: `Select-String -Path 'app/(portal)/page.tsx' -Pattern "bestJobsTab\|urgency=URGENT"` kèm line + state init. Lưu `evidence/ac09-bestjobs-tab.txt` |
| `AC-10` | BestJobs pagination control: prev/next + range "Trang X / Y" | **Manual source review** `app/(portal)/page.tsx` + `best-jobs-section.tsx`: control render khi `total > pageSize`, ARIA `role="group" aria-label="Phân trang"`, prev disabled khi `offset = 0`, next disabled khi `offset + pageSize >= total`. Command: `Select-String -Path 'app/(portal)/page.tsx','src/domains/job-board/components/landing/best-jobs-section.tsx' -Pattern "Trang|Phân trang|onPrev|onNext"` kèm line. Lưu `evidence/ac10-bestjobs-pagination.txt` |
| `AC-11` | bestJobsPageSize đọc từ view-model, fallback 9 khi INTEGRATION_PENDING | **Manual source review** `app/(portal)/page.tsx`: `const pageSize = initialHomepageSettings?.settings?.bestJobsPageSize ?? initialHomepageSettings?.defaultBestJobsPageSize ?? 9`. Command: `Select-String -Path 'app/(portal)/page.tsx' -Pattern "bestJobsPageSize\|defaultBestJobsPageSize"` kèm line. Lưu `evidence/ac11-bestjobs-pagesize.txt` |
| `AC-12` | SSR `/viec-lam?page=N` listingPageSize từ view-model, fallback 12, range `[6..50]` | **Manual source review** `app/(jobs)/viec-lam/page.tsx`: `const listingPageSize = clamp(settings?.listingPageSize ?? 12, 6, 50)`. Command: `Select-String -Path 'app/(jobs)/viec-lam/page.tsx' -Pattern "listingPageSize\|clamp.*6.*50"` kèm line. Lưu `evidence/ac12-listing-pagesize.txt` |
| `AC-13` | BestJobs slice KHÔNG hardcode `.slice(0, 3)` | Command: `Select-String -Path best-jobs-section.tsx -Pattern "slice\(0, 3\)"` → 0 match. Tier 2 ghi exit code 1 + 0 match. Lưu `evidence/ac13-no-hardcode-slice.txt` |
| `AC-14` | Tab ARIA `role="tablist"` + mỗi pill `role="tab" aria-selected` | Command: `Select-String -Path best-jobs-section.tsx -Pattern "role=\"tablist\"|role=\"tab\"|aria-selected" ` expect 3+ matches (tablist + tab per pill). Lưu `evidence/ac14-tab-aria.txt` |
| `AC-15` | Truth fence: changed public surface không chứa "Top công ty\|Đối tác chính thức\|Cơ hội mới\|hiển thị số slot thật\|Dự án trọng điểm" + số giả (`17.800`, `13.000.000`, `+10.000.000`, `+50.000.000`) | PowerShell `Select-String -Path src/domains/job-board/components/landing/best-jobs-section.tsx,src/domains/job-board/components/landing/recruiting-projects-section.tsx,"app/(portal)/page.tsx" -Pattern "Top công ty\|Đối tác chính thức\|Cơ hội mới\|hiển thị số slot thật\|Dự án trọng điểm\|17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000"`. Expect 0 match. Lưu `evidence/ac15-truth-fence.txt` |
| `AC-16` | Fence tests cập nhật theo composition mới (allowlist §11 OBR-02) | Command: `Select-String -Path src/domains/job-board/public-ui-premium.static.test.ts,src/domains/job-board/public-ui-token-parity.static.test.ts,src/domains/applications/marketplace-inventory.static.test.ts,src/domains/job-board/public-card-truth.test.ts -Pattern "DEC-01"` expect 1+ match mỗi file (tab/pagination comment). Lưu `evidence/ac16-fence-tests.txt` |
| `AC-17` | Regression shell: 6 route portal vẫn import `GlobalNavbar` không vỡ (TASK A shell) | Command: `Select-String -Path 'app/(portal)/page.tsx','app/(jobs)/viec-lam/page.tsx','app/(jobs)/viec-lam/[slug]/page.tsx','app/(jobs)/login/page.tsx','app/(jobs)/ve-chung-toi/page.tsx','app/(jobs)/ctv-portal/page.tsx' -Pattern "import.*GlobalNavbar"` expect 6 matches. Tier 2 ghi line từng route. Lưu `evidence/ac17-regression-check.txt` |
| `AC-18` | Mandatory gates | `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; full `npm run test:unit` cùng expected failure set với expected-failure-set-before + new failure count = 0; `npm run build` exit 0; `npx prisma validate` exit 0; `npx prisma migrate diff` không có DROP; `npx prisma generate` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-pagination-admin/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; permission integration test (mock): POST `/api/admin/homepage-settings` không phải ADMIN → 403 (Tier 2 verify route này sang AV1 nên test placeholder) — Tier 3 chấp nhận placeholder với note "AV1 owned". Lưu `evidence/ac18-gates.txt` với exit code từng gate |
| `AC-19` | AWAITING_OWNER_LIVE_VISUAL_REVIEW (DEC-18) | Status marker trong HANDOFF; Tier 3 không fail vì thiếu screenshot; visual parity Owner duyệt post-deploy |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-06, STEP-07, STEP-08 | AC-09, AC-14 |
| RQ-02 | STEP-06, STEP-07, STEP-08 | AC-10, AC-13 |
| RQ-03 | STEP-09 | AC-12 |
| RQ-04 | STEP-02 | AC-01, AC-02 |
| RQ-05 | STEP-04, STEP-05 | AC-04, AC-05 |
| RQ-06 | STEP-03 | AC-03 |
| RQ-07 | STEP-06 | AC-06, AC-07, AC-08 |
| RQ-08 | STEP-06 | AC-08 |
| RQ-09 | STEP-04, STEP-08 | AC-11 |
| RQ-10 | STEP-07, STEP-08 | AC-09, AC-10, AC-11, AC-13 |
| RQ-11 | STEP-11 | AC-17 |
| RQ-12 | STEP-10 | AC-16 |
| RQ-13 | STEP-07 | AC-14, AC-16 |
| RQ-14 | STEP-02 | AC-01, AC-02 |
| RQ-15 | STEP-11 | AC-19 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Migration ADD-only vô tình ALTER TABLE existing | STEP-02 verify `npx prisma migrate diff` không có DROP/ALTER TABLE existing. Nếu có → revert, escalate |
| `RISK-02` | Permission mới không seed → ADMIN không có CAN_EDIT_HOMEPAGE_SETTINGS khi AV1 viết | STEP-03 seed ADMIN. Verify `prisma db seed` chạy OK |
| `RISK-03` | BestJobs fetch riêng + sentinel homepage search trùng state | STEP-08 tách state: BestJobs offset riêng, sentinel homepage search offset riêng |
| `RISK-04` | Filter URGENT trong memory layer (sau SQL) miss performance khi data lớn | Plan B chấp nhận memory filter (giống q/area/shift). Nếu cần scale → sang Plan B+ hoặc optimize SQL where ở Plan UI C/D.A |
| `RISK-05` | Tier 2 vô tình sửa `AreasSection`/`ReferralStrip` container 1200px (TASK A đã chốt) | STEP-08 source review: chỉ đụng `app/(portal)/page.tsx` + `best-jobs-section.tsx`. Nếu touch → revert |
| `RISK-06` | BestJobs tab + pagination ARIA thiếu → fail accessibility | AC-14 enforce. Nếu fail → sửa, KHÔNG ép PASS |
| `RISK-07` | Fence test fail khi đổi BestJobs slice + tab + pagination | DEC-21 mở allowlist; STEP-10 cập nhật fence theo composition mới |
| `RISK-08` | OBR-02 vi phạm scope: Tier 2 sửa file ngoài allowlist | STEP-11 source review `git diff --name-only exec-head-before..HEAD` vs allowlist. Nếu có path ngoài → revert, escalate |

## 8. Open Questions

None — Tier 0 chỉ thị đã chốt B1–B11 trong `docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md` + `evidence/OWNER_APPROVAL_REQUIRED.md` + `evidence/field-matrix.md` §6–§9. Plan Admin V6 mapping đã chốt ở `evidence/plan-admin-v6.md` §2.

## 9. Planner Resolution

Tier 1 append sau mỗi round.

| Round | Decision | Reason |
|---|---|---|
| Round 0 (planning) | Tier 1 soạn `TASK.md` canonical tại `docs/tasks/hrp-v6-ui-04b-pagination-admin/TASK.md`. Plan B thuộc CRITICAL lane (schema + permission + admin write API sang AV1, read API + UI controls trong Plan B). Baseline reference = `d3add63` (TASK A ACCEPTED HEAD). | Tier 0 chỉ thị mới 10/09/2026 + skeleton-B-C-D.md. |
| Round 1 (sau execution) | Tier 2 thi công → verify-task PASS → verify-handoff PASS → Tier 3 DEEP audit → push → Owner live review post-deploy | per §0 Next gate |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-09-10 (Tier 1) | Initial TASK B | Tier 0 chỉ thị + skeleton B + field-matrix §6–§9 + plan-admin-v6 §2 (AV1 mapping). Baseline `d3add63` (TASK A ACCEPTED HEAD). |

## 11. Owner Baseline-aware Resolution (OBR)

### OBR-01 — Baseline reference + execution HEAD

- Source reference = `d3add63` (TASK A ACCEPTED HEAD). Dùng để đối chiếu scope TASK A đã chấp nhận. KHÔNG `git checkout`; chỉ đo `git show d3add63 -- file` khi cần
- UI-03 source reference `4d9a633` vẫn áp dụng cho field parity (DTO contract)
- Execution HEAD: đo ngay trước STEP-01 bằng `git rev-parse HEAD` → `evidence/exec-head-before.txt`. Tier 2 dùng để so diff
- Baseline expected unit failure set: chạy `npm run test:unit --reporter=json 2>evidence/test-unit-before.json` LÚC exec-head-before, hash số failing tests → `evidence/expected-failure-set-before.txt`
- `git status --porcelain` tại exec-head-before → `evidence/working-tree-before.txt`. Mọi dirty file ngoài §1.3 dirty set là non-task (foreign), KHÔNG FAIL
- **Allow create/edit HANDOFF + `evidence/**`** trong `docs/tasks/hrp-v6-ui-04b-pagination-admin/**` (DEC-19). OBR-01 chỉ cảnh báo path ngoài allowlist OBR-02 chứ KHÔNG cấm mọi file chưa tồn tại trong baseline-manifest
- `git diff --name-only [exec-head-before]..HEAD` cuối round vs baseline = KHÔNG có path mới ngoài allowlist OBR-02

### OBR-02 — Allowlist Sửa (paths Tier 2 được phép tạo/sửa)

| Path | Quyền | Ghi chú |
|---|---|---|
| `prisma/schema.prisma` | Sửa (ADD only `HomepageSettings` model + `User.homepageSettingsUpdates` reverse relation nếu cần) | STEP-02 RQ-04 |
| `prisma/migrations/<ts>_homepage_settings/migration.sql` | Tạo mới | STEP-02 RQ-04 ADD-only |
| `prisma/seed.mjs` | Sửa (thêm CAN_EDIT_HOMEPAGE_SETTINGS vào PERMISSION_CATALOG + ROLE_PERMISSION_SEED cho ADMIN) | STEP-03 RQ-06 |
| `src/shared/auth/permission-catalog.ts` | Sửa (thêm descriptor CAN_EDIT_HOMEPAGE_SETTINGS group SYSTEM) | STEP-03 RQ-06 |
| `src/domains/job-board/public-types.ts` | Tạo mới | STEP-04 RQ-09 types export |
| `src/domains/job-board/public-settings.service.ts` | Tạo mới | STEP-04 RQ-09 service singleton |
| `src/domains/job-board/public.service.ts` | Sửa (chỉ mở `urgency` param trong `listPublicJobProjection` signature + memory filter; KHÔNG restyle `q/area/shift/shiftTypes/jobTypes` semantics) | STEP-06 RQ-07 |
| `app/api/jobs/route.ts` | Sửa (parse `urgency` từ searchParams + validate `limit` clamp) | STEP-06 RQ-07, RQ-08 |
| `app/api/admin/homepage-settings/route.ts` | Tạo mới (GET public projection only) | STEP-05 RQ-05 |
| `app/(portal)/page.tsx` | Sửa (BestJobs state + fetch riêng + tab + pagination control; KHÔNG đổi Hero search card wrapper từ TASK A) | STEP-08 RQ-01, RQ-02, RQ-10 |
| `app/(jobs)/viec-lam/page.tsx` | Sửa (inject listingPageSize từ view-model; KHÔNG đổi pagination URL contract) | STEP-09 RQ-03 |
| `src/domains/job-board/components/landing/best-jobs-section.tsx` | Sửa (tab pill + pagination control + props refactor; giữ container 1200px từ TASK A) | STEP-07 RQ-01, RQ-02 |
| `app/globals.css` | Sửa (chỉ bổ sung scoped class typography nếu thiếu cho tab/pagination) | DEC-21 TASK A, AC-14 token parity |
| `src/domains/job-board/public-ui-premium.static.test.ts` | Sửa (fence) | STEP-10 DEC-21 |
| `src/domains/job-board/public-ui-token-parity.static.test.ts` | Sửa (fence) | STEP-10 DEC-21 |
| `src/domains/applications/marketplace-inventory.static.test.ts` | Sửa (fence) | STEP-10 DEC-21 |
| `src/domains/job-board/public-card-truth.test.ts` | Sửa (fence) | STEP-10 DEC-21 |
| `docs/tasks/hrp-v6-ui-04b-pagination-admin/**` | Tạo + Sửa | HANDOFF + evidence + planning artifacts do Tier 2 tạo |
| `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**` | **KHÔNG** sửa (Tier 1 plane) | DEC-16; Tier 2 phát hiện cần sửa → halt, báo Tier 1 |
| (mọi path khác) | **KHÔNG** sửa | OBR-01 cảnh báo; Tier 2 halt, escalate Tier 1 |

### OBR-03 — Anti-scope-creep

- Tier 2 không tự ý thêm path mới vào allowlist; nếu cần, mở correction round
- Mọi file mới: Tier 2 chỉ tạo trong `docs/tasks/hrp-v6-ui-04b-pagination-admin/evidence/**` + `HANDOFF.md` + allowlist OBR-02 (route file, service file, types file, migration file, fence test file mới)
- Tier 2 KHÔNG commit/push/deploy — Tier 1 có quyền đó sau khi đạt gate READY_FOR_AUDIT + Tier 3 PASS
- Plan B KHÔNG viết Admin settings page + write API — sang AV1. Tier 2 nếu phát hiện cần → halt, báo Tier 1 mở AV1-TASK
