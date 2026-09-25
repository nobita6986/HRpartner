# TASK — `hrp-p1-a1-canonical-public-job-detail`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-a1-canonical-public-job-detail` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `ADOPT` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | `Public detail expose DRAFT/ARCHIVED hoặc raw payload là leak critical; lane CRITICAL + LIGHT audit (không phải NONE) cho vertical slice đầu của marketplace. Risk acceptance: Owner/T0 chấp nhận LIGHT audit cho cutover gate; người chấp nhận rủi ro: T0 (decision OD-P1A-04 + OD-P1A-09 đã chốt 2026-09-24).` |
| Spec version | `v1.4` |
| Status | `ENV_BLOCKED` (DB integration không chạy thật được khi agent sandbox thiếu synthetic DB; chờ T0 cung cấp `DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST`. CHỈ được `READY_FOR_AUDIT`/audit eligible sau khi DB integration PASS thật.) |
| Planner | `Tier 1A` |
| Baseline | `91525013fc2720a3803e808baac39e1c4497daf6` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `BLOCKED` (no synthetic DB provided; integration preflight fail-closed per `scripts/ci/integration-preflight.mjs`) |
| Correction budget | `1` (đã dùng trong correction batch 1/1) |
| In-scope roots | `src/domains/job-board/public.service.ts`; `src/shared/content/job-posting-rich-text/**` (chỉ consume, KHÔNG fork profile); `app/(jobs)/viec-lam/**`; `app/api/public/jobs/[slug]/applications/route.ts`; đúng một forward-only migration mới thay body `hrp_public_apply_submission` (và `GRANT SELECT` trên 2 bảng JobPosting/JobOpening cho `hrp_public_rpc`); `src/domains/job-board/public-detail.static.test.ts` (đổi path từ `tests/db/...`); `src/domains/applications/marketplace-apply.routes.test.ts` (đổi path từ `tests/api/...`); `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (đăng ký `vitest.integration-files.ts`); targeted unit tests; vitest integration registration nếu cần |
| Forbidden paths | `prisma/schema.prisma`; `package.json`; `package-lock.json`; `src/shared/ui/editor/**` (client editor wrapper thuộc A0); `src/domains/staffing/job-posting-authoring.service.ts` (A0 service); mọi migration cũ và mọi migration mới ngoài đúng function-body + GRANT migration của A1; `src/domains/job-board/publish.service.ts` (legacy publish Project.isPublic — KHÔNG modify); `CandidateSubmission.jobPostingId` persistence; tự publish bất kỳ Project.isPublic nào |
| Required gates | `npx prisma validate`; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration` (chạy qua `tests/db/p1a1-jobposting-public-apply.integration.test.ts` đã đăng ký trong `vitest.integration-files.ts`); migration-chain/upgrade-path + clean-chain + predecessor upgrade + negative rollback proof cho function-body replacement + GRANT; `npm list @tiptap/static-renderer@3.31.3 --depth=0` (read-only check; KHÔNG install thêm); `git diff --check <baseline>..HEAD`; strict UTF-8/LF/no-BOM/mojibake scan; `verify-task.ps1`; `verify-handoff.ps1` |
| Current execution round | `2` |
| Current audit round | `0` |
| Next gate | `TIER3_LIGHT_AUDIT` (chỉ sau khi DB integration PASS thật). Nếu synthetic DB chưa được provision, Status giữ `ENV_BLOCKED`/eligibility NOT ELIGIBLE, KHÔNG đẩy sang Tier 3. |

> Lane CRITICAL mặc định LIGHT. Risk acceptance: T0 chấp nhận LIGHT audit cho cutover gate; người chấp nhận rủi ro ghi rõ trong `Audit reason`.

> T0 đã đóng semantic review tại v1.2 nhưng A1 chưa được code: giữ `PROPOSED_ONLY`/`DRAFT` cho tới khi A0 merge, shared profile/package/schema freeze và có ít nhất một real `PUBLISHED` JobPosting. V2 chỉ có một consolidated correction batch sau audit.

## 1. Outcome

### 1.1 User-visible outcome

- Công khai `/viec-lam` và `/viec-lam/[slug]` chỉ hiển thị `JobPosting` với status `PUBLISHED`, render nội dung rich qua shared `@tiptap/static-renderer@3.31.3` wrapper HRP (`src/shared/content/job-posting-rich-text/**`); DRAFT/ARCHIVED trả 404; corrupted payload fail closed (omit section + diagnostic an toàn); SEO metadata (title, description, canonical URL) đến từ canonical `JobPosting`. Legacy `/viec-lam/PRJ-xxx`: trước cutover giữ nguyên flow hiện tại; sau cutover, route compatibility chuyển tới listing đã lọc theo `Project.code` — KHÔNG chọn một posting bất kỳ khi Project có nhiều posting; KHÔNG 301/308 tới detail mơ hồ. Apply `/api/public/jobs/[slug]/applications` derive server-side `projectId/slotId/jobOpeningId` từ `PUBLISHED` JobPosting; KHÔNG tin IDs do browser tự truyền; KHÔNG mở persistence `CandidateSubmission.jobPostingId` (chỉ dùng current intake boundary).

### 1.2 Non-goals

- KHÔNG sửa schema, package.json, package-lock.json (thuộc A0).
- KHÔNG cài bản Tiptap thứ hai hoặc đổi version.
- KHÔNG khởi tạo React editor trên server.
- KHÔNG `dangerouslySetInnerHTML` với dữ liệu DB chưa qua shared validator/renderer.
- KHÔNG fork shared profile rich-text (chỉ consume).
- KHÔNG auto-publish hoặc tự chọn JobPosting cho Project có nhiều posting khi xử lý legacy route.
- KHÔNG thêm `CandidateSubmission.jobPostingId` (OD-P1A-09); nếu cần persisted attribution phải mở task additive riêng sau P1-A1.
- KHÔNG tự ý render raw payload khi gặp corrupted payload.
- KHÔNG dùng Node pre-read của JobPosting làm authorization authority cho anonymous apply; quyết định PUBLISHED/OPEN/slot phải được revalidate trong cùng SECURITY DEFINER transaction.

## 2. Evidence

Chỉ liệt kê bằng chứng cần để Tier 1 implement.

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/public.service.ts:705` (`getPublicJobDetail`) đọc `Project.code` làm slug. | Public detail đang đọc sai nguồn; A1 cut over sang `JobPosting`. |
| `EV-02` | `app/(jobs)/viec-lam/[slug]/page.tsx` đang dùng `src/domains/job-board/fixtures/detail-sections.fixture.ts` cho UI04d D.A. | Chỉ ra fixture đang là authority cho UI; A1 loại bỏ fixture authority. |
| `EV-03` | `app/api/jobs/apply/route.ts` = deterministic 410. | Đây là legacy stub; A1 KHÔNG dùng. Canonical apply = `/api/public/jobs/[slug]/applications`. |
| `EV-04` | `app/api/admin/intake/staff/route.ts` body: `slotId`, `projectId`, `jobOpeningId?` optional. | Xác nhận current intake boundary; A1 derive server-side. |
| `EV-05` | `src/domains/talent/intake-writer.service.ts`. | Hiện không có `jobPostingId`; A1 KHÔNG thêm (OD-P1A-09). |
| `EV-06` | `npm view @tiptap/static-renderer@3.31.3 version license --json` = MIT. | Evidence ADOPT pin `3.31.3` cho server static renderer (OD-P1A-04). |
| `EV-07` | `prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql:116-145` resolve anonymous apply bằng `Project.code`/`Project.id`, chưa biết `JobPosting.slug` hoặc `JobPosting.status`. | Chứng minh chỉ đổi route/service sẽ tạo TOCTOU; A1 cần forward-only function-body migration với revalidation atomically. |
| `EV-08` | `app/api/public/jobs/[slug]/applications/route.ts` hiện nhận optional `slotId` từ browser và chuyển thẳng vào `submitPublicApplication`. | Canonical JobPosting flow phải loại quyền chọn provenance của browser và derive slot từ linked JobOpening. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Public detail / listing consume canonical `JobPosting` (status `PUBLISHED`); DRAFT/ARCHIVED trả 404 (NO_LEAK). | CHOSEN |
| `DEC-02` | Server render public detail bằng React output subpath `@tiptap/static-renderer/json/react` qua HRP wrapper `src/shared/content/job-posting-rich-text/**`. KHÔNG khởi tạo editor client trên server; KHÔNG HTML string/`dangerouslySetInnerHTML` với DB payload. | CHOSEN |
| `DEC-03` | Build vs Adopt = ADOPT `@tiptap/static-renderer@3.31.3` (MIT) + shared HRP profile (`src/shared/content/job-posting-rich-text/**`). KHÔNG cài bản Tiptap thứ hai; KHÔNG đổi version. KHÔNG fork profile. | CHOSEN |
| `DEC-04` | Corrupted legacy payload (khi public read) → fail closed / omit section + ghi diagnostic an toàn; KHÔNG render raw payload. | CHOSEN |
| `DEC-05` | Canonical slug theo A0 invariant (sinh từ `JobPosting.title` qua `generateCanonicalSlug`, suffix stable). Public detail dùng slug JobPosting, không phải `Project.code`. | CHOSEN |
| `DEC-06` | Legacy `/viec-lam/PRJ-xxx`: trước cutover giữ nguyên flow hiện tại; sau cutover route compatibility chuyển tới listing đã lọc theo `Project.code`; KHÔNG tự chọn một posting bất kỳ khi Project có nhiều posting; KHÔNG 301/308 tới detail mơ hồ. | CHOSEN |
| `DEC-07` | Apply `/api/public/jobs/[slug]/applications`: derive server-side `projectId/slotId/jobOpeningId` từ `PUBLISHED` JobPosting. KHÔNG tin IDs do browser tự truyền. KHÔNG thêm `CandidateSubmission.jobPostingId` (OD-P1A-09). Nếu cần persisted attribution tới JobPosting, mở task additive riêng sau P1-A1. | CHOSEN |
| `DEC-08` | SEO metadata (title, description, canonical URL) đến từ canonical `JobPosting`. KHÔNG dùng fixture title/desc; structured data JSON-LD chỉ dùng field đã được validator pass. | CHOSEN |
| `DEC-09` | KHÔNG fork shared profile: A1 chỉ consume `src/shared/content/job-posting-rich-text/**`. Wrapper phải đồng bộ allowlist + limits + schemaVersion với A0 (single source of truth). | CHOSEN |
| `DEC-10` | Canonical apply authority nằm trong `hrp_public_apply_submission`: thay body qua forward-only migration để resolve `JobPosting.slug`, bắt buộc `JobPosting.status = PUBLISHED`, linked `JobOpening.status = OPEN`, và derive canonical project/slot trong cùng transaction. Giữ nguyên function signature, owner `hrp_public_rpc`, grants và `SET search_path = public, pg_temp`. Node pre-read không phải authority. | CHOSEN |
| `DEC-11` | Route canonical không nhận `projectId`/`jobOpeningId`; browser-supplied `slotId` bị reject cho JobPosting flow. RPC vẫn fail closed nếu bị gọi trực tiếp với slot không thuộc linked JobOpening. Không thêm `CandidateSubmission.jobPostingId`. | CHOSEN |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Server-side rich React renderer | `@tiptap/static-renderer/json/react`, tự viết ProseMirror→React | `ADOPT` | MIT | `@tiptap/static-renderer@3.31.3` | `src/shared/content/job-posting-rich-text/**` (server renderer wrapper) | Dùng vendor React output từ validated JSON; KHÔNG khởi tạo editor client trên server, KHÔNG HTML string/`dangerouslySetInnerHTML`; pinned đồng bộ với A0. |
| Shared schema/profile cho rich content | Tiptap extension set + custom validator trong A1 | `N/A` (HRP-owned) | n/a | n/a | `src/shared/content/job-posting-rich-text/**` (single source of truth do A0 freeze; A1 chỉ consume) | A1 không tự tạo profile mới; reuse profile + validator + limits do A0 freeze theo OD-P1A-02. Vendor library không bao giờ là authority cho state/persistence/validation. |
| SEO metadata / JSON-LD | next/head + schema.org helpers tự viết | `N/A` (HRP-owned) | n/a | n/a | `app/(jobs)/viec-lam/[slug]/page.tsx` (read-only projection) | Metadata đến từ canonical `JobPosting` qua projection HRP; không thương mại hóa metadata. |

- `ADOPT` đã pin license + version/source + compatibility + wrapper boundary + regression test boundary.
- `N/A` đối với shared profile / metadata projection vì đó là HRP-owned capability.
- `CUSTOM` không áp dụng; KHÔNG tự viết lại ProseMirror→HTML; KHÔNG fork shared profile.

### 3.2 Build vs Automate

| Concern | Automation candidate | Decision | Reason |
|---|---|---|---|
| Public detail page render (`/viec-lam/[slug]`) | n8n pre-render / SSR webhook | `N/A` | Public read là server-component React render trực tiếp qua Next.js. n8n không tham gia request path. |
| Public listing (`/viec-lam`) | n8n search/cache index | `N/A` | Listing đọc `JobPosting PUBLISHED` qua Prisma; không có n8n hop. n8n down không ảnh hưởng 200 OK. |
| Anonymous apply (`/api/public/jobs/[slug]/applications`) | n8n workflow trigger | `N/A` | Apply là Node `route.ts` → `hrp_public_apply_submission` SECURITY DEFINER transaction. n8n post-commit/outbox distribution là task riêng sau canonical commit, không thuộc P1-A1. |
| Notification / email distribution | n8n workflow | Out of scope | P1-A1 chỉ deliver "application accepted" 200 OK với canonical reference id. Email/slack distribution bằng n8n (post-commit) là task additive mở sau P1-A1. |

n8n outage phải không ảnh hưởng public detail 200 OK và apply 200 OK. Distribution/notification có thể chạy post-commit/outbox ở task riêng (không block cutover).

### 3.3 Owner decisions (closed before code)

| ID | Decision | Owner | Status |
|---|---|---|---|
| `OD-A1-01` | Slug canonical cho public detail/listing; `/viec-lam/[slug]` resolve bằng `JobPosting.slug`, không phải `Project.code`. | T1A | CLOSED |
| `OD-A1-02` | Public listing/detail filter `JobPosting.status='PUBLISHED'` độc quyền; DRAFT/ARCHIVED + missing slug → 404 fail-closed. | T1A | CLOSED |
| `OD-A1-03` | Rich content render qua `renderJobPostingRichText` (shared safe renderer, P1-A0 freeze). KHÔNG raw HTML, KHÔNG `dangerouslySetInnerHTML`. | T1A | CLOSED |
| `OD-A1-04` | `hrp_public_apply_submission` signature, owner `hrp_public_rpc`, grants, `search_path`, `SECURITY DEFINER` boundary locked. Body thay trong một forward-only migration; derive posting/opening/slot server-side trong cùng transaction. | T1A | CLOSED |
| `OD-A1-05` | Legacy `/viec-lam/PRJ-xxx` chuyển tới listing pre-filter theo `Project.code`; KHÔNG redirect-to-detail mơ hồ, KHÔNG chọn posting tùy ý. | T1A | CLOSED |
| `OD-A1-06` | Apply route reject browser-supplied `slotId` / `projectId` / `jobOpeningId`; server-side derivation là source of truth duy nhất. | T1A | CLOSED |
| `OD-A1-07` | n8n KHÔNG nằm trong P1-A1 runtime boundary. Public page + apply success phải hoạt động khi n8n unavailable. Distribution/outbox là task riêng sau canonical commit. | T1A | CLOSED |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Public `/viec-lam` listing chỉ trả về `JobPosting` với `status = PUBLISHED`. DRAFT/ARCHIVED trả 404 từ service `src/domains/job-board/public.service.ts` (KHÔNG lộ dưới dạng preview). |
| `RQ-02` | Public `/viec-lam/[slug]` detail render validated JSON thành React elements qua `@tiptap/static-renderer/json/react` trong HRP wrapper `src/shared/content/job-posting-rich-text/**`. |
| `RQ-03` | Corrupted legacy payload (khi public read) → fail closed / omit section + ghi diagnostic an toàn; KHÔNG render raw payload. |
| `RQ-04` | Canonical slug (sinh từ A0) là URL identity cho `/viec-lam/[slug]`. KHÔNG dùng duy nhất `Project.code` vì một Project có thể có nhiều JobPosting. |
| `RQ-05` | Legacy `/viec-lam/PRJ-xxx`: trước cutover giữ nguyên flow hiện tại; sau cutover, route compatibility chuyển tới listing đã lọc theo `Project.code`; KHÔNG chọn một posting bất kỳ khi Project có nhiều posting; KHÔNG 301/308 tới detail mơ hồ. |
| `RQ-06` | Apply `/api/public/jobs/[slug]/applications`: SECURITY DEFINER RPC derive/revalidate server-side `projectId` + canonical `slotId` từ `PUBLISHED` JobPosting và linked `OPEN` JobOpening trong cùng transaction. KHÔNG tin IDs do browser tự truyền; route reject `slotId`/`projectId`/`jobOpeningId`. |
| `RQ-07` | KHÔNG thêm `CandidateSubmission.jobPostingId` (OD-P1A-09); nếu cần persisted attribution tới JobPosting phải mở task additive riêng sau P1-A1. |
| `RQ-08` | KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`. KHÔNG cài bản Tiptap thứ hai hoặc đổi version. A1 chỉ được thêm đúng một forward-only migration thay body public apply function, không sửa migration cũ. |
| `RQ-09` | KHÔNG khởi tạo editor client trên server; KHÔNG HTML-string rendering hoặc `dangerouslySetInnerHTML` với dữ liệu DB. |
| `RQ-10` | SEO metadata (title, description, canonical URL) đến từ canonical `JobPosting`. JSON-LD structured data chỉ dùng field đã được validator pass. |
| `RQ-11` | KHÔNG fork shared profile; A1 chỉ consume `src/shared/content/job-posting-rich-text/**` (single source of truth do A0 freeze). |

### 4.2 Scope boundaries

- **In:** `src/domains/job-board/public.service.ts`; `src/shared/content/job-posting-rich-text/**` (chỉ consume); `app/(jobs)/viec-lam/**`; `app/api/public/jobs/[slug]/applications/route.ts`; đúng một migration mới (forward-only) thay body `hrp_public_apply_submission` VÀ cấp `GRANT SELECT` trên `job_postings`, `job_openings` cho role `hrp_public_rpc`; `src/domains/job-board/public-detail.static.test.ts`; `src/domains/applications/marketplace-apply.routes.test.ts`; `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (đăng ký trong `vitest.integration-files.ts`); targeted unit tests; vitest integration registration.
- **Out:** `prisma/schema.prisma`; `package.json`; `package-lock.json`; `src/shared/ui/editor/**` (client editor wrapper thuộc A0); `src/domains/staffing/job-posting-authoring.service.ts`; mọi migration cũ và mọi migration mới ngoài đúng function-body + GRANT migration A1; `src/domains/job-board/publish.service.ts` (legacy Project.isPublic); tự publish bất kỳ Project.isPublic nào; persistence `CandidateSubmission.jobPostingId`.
- **Allowed task artifacts:** `docs/tasks/hrp-p1-a1-canonical-public-job-detail/**`.

### 4.3 Domain boundaries

- **Data/state:** Public read chỉ đụng `JobPosting` với `status = PUBLISHED`. Read-only; KHÔNG mutate. DRAFT/ARCHIVED trả 404 từ service.
- **Permission/security:** Public read không cần auth và đi qua canonical public read context. Anonymous apply chỉ được SECURITY DEFINER RPC quyết định; function revalidate `PUBLISHED` JobPosting + `OPEN` JobOpening + canonical slot atomically. Route/Node pre-read không thay authorization authority. RLS existing trên `job_postings` tiếp tục áp dụng cho read path; function giữ owner/grants/search_path hiện hành.
- **Interface/API:** Public REST cho `/viec-lam` listing + detail + apply route. Server render React elements qua shared renderer. JSON-LD chỉ từ field đã validator pass. KHÔNG HTML-string injection hoặc `dangerouslySetInnerHTML` với dữ liệu DB.
- **Migration/rollback:** KHÔNG có schema change. Có đúng một forward-only migration `CREATE OR REPLACE FUNCTION` thay body `hrp_public_apply_submission`; giữ nguyên signature/owner/grants/search_path và không sửa migration cũ. Upgrade-path test phải chứng minh old Project slug không còn cấp apply authority sau cutover, DRAFT/ARCHIVED posting hoặc non-OPEN opening bị từ chối, PUBLISHED+OPEN thành công. KHÔNG tự publish bất kỳ Project.isPublic nào. Cutover gate chỉ mở khi A0 merge + có ít nhất một real `PUBLISHED` JobPosting.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/job-board/public.service.ts` | Refactor: `listPublicJobs` chỉ SELECT từ `JobPosting` với `status = PUBLISHED`; `getPublicJobDetail` nhận `slug` JobPosting (KHÔNG dùng `Project.code`); DRAFT/ARCHIVED trả 404. | `AC-01`, `AC-02` | Service đọc sai nguồn / lộ DRAFT |
| `STEP-02` | `src/shared/content/job-posting-rich-text/**` (consume only) | Import shared renderer wrapper (do A0 freeze) + shared schema/profile + shared validator. KHÔNG fork; KHÔNG đổi allowlist/limits. | `AC-03`, `AC-04`, `AC-05` | A1 sửa wrapper / fork profile |
| `STEP-03` | `app/(jobs)/viec-lam/page.tsx` + `app/(jobs)/viec-lam/[slug]/page.tsx` | Listing gọi `listPublicJobs`. Detail dùng `getPublicJobDetail` + React output `@tiptap/static-renderer/json/react` qua HRP wrapper. SEO metadata từ canonical JobPosting. JSON-LD chỉ từ field validator pass. | `AC-06`, `AC-07`, `AC-10` | UI còn fixture authority / render raw payload |
| `STEP-04` | một forward-only migration mới + `app/api/public/jobs/[slug]/applications/route.ts` | Thay body `hrp_public_apply_submission` để resolve/revalidate `PUBLISHED` JobPosting + linked `OPEN` JobOpening + canonical slot (chain `s.id = jo.staffing_order_slot_id`, `s.staffing_order_id = jo.staffing_order_id`, `s.job_opening_id = jo.id`) trong cùng transaction; giữ signature/owner/grants/search_path; cấp `GRANT SELECT ON job_postings, job_openings TO hrp_public_rpc`; wrap BEGIN/COMMIT; pre/post assertions. Route reject browser `slotId`/`projectId`/`jobOpeningId`, giữ Idempotency-Key bắt buộc. KHÔNG thêm `CandidateSubmission.jobPostingId`. | `AC-08`, `AC-11`, `AC-12` | Node pre-read authority / browser-supplied provenance / function security drift / sibling slot cross-pollination |
| `STEP-05` | Legacy route `/viec-lam/PRJ-xxx` | Trước cutover: giữ nguyên flow hiện tại. Sau cutover: chuyển tới listing đã lọc theo `Project.code`; KHÔNG chọn posting tùy ý; KHÔNG 301/308 tới detail mơ hồ. | `AC-09` | 301/308 tới detail mơ hồ / chọn posting tùy ý |
| `STEP-06` | `src/domains/job-board/public-detail.static.test.ts` + `src/domains/applications/marketplace-apply.routes.test.ts` + `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (registered in `vitest.integration-files.ts`) + targeted unit tests | Cover: chỉ PUBLISHED xuất hiện; DRAFT/ARCHIVED 404; JSON render qua shared static renderer; unsafe content không render; SEO từ canonical JobPosting; legacy PRJ route về filtered listing; canonical apply RPC atomic authority; direct/browser ID injection reject; sibling slot isolation; function metadata preserved; không còn fixture authority; corrupted payload `RichTextSection → null`. | `AC-01`..`AC-12` | Test fail / leak DRAFT / apply boundary drift |
| `STEP-07` | Gate evidence | `npx prisma validate`; migration-chain/upgrade-path + clean-chain + predecessor upgrade + negative rollback proof; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration`; `npm list @tiptap/static-renderer@3.31.3 --depth=0`; `git diff --check <baseline>..HEAD`; strict UTF-8/LF/no-BOM/mojibake scan; `verify-task.ps1`; `verify-handoff.ps1`. | tất cả AC | Gate fail |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Public `/viec-lam` listing chỉ trả về `JobPosting` với `status = PUBLISHED`; DRAFT/ARCHIVED không xuất hiện. | `npm run test:integration tests/db/public-detail.static.test.ts` + `tests/api/public-jobs-detail.route.test.ts`. |
| `AC-02` | DRAFT/ARCHIVED trả 404 từ service `getPublicJobDetail` (KHÔNG lộ dưới preview/alternate path). | `npm run test:integration tests/api/public-jobs-detail.route.test.ts`. |
| `AC-03` | Public detail render rich content thành React elements qua `@tiptap/static-renderer/json/react` trong HRP wrapper. Server render KHÔNG gọi editor client, không HTML string. | `src/domains/job-board/components/detail/__tests__/detail-sections-policy.test.ts`; `rg -F "dangerouslySetInnerHTML" app/(jobs)/viec-lam src/shared/content` = 0 hit; `src/domains/job-board/public-detail.static.test.ts` = 0 hit cho 6 chuỗi bị cấm. |
| `AC-04` | image/iframe/raw HTML/script/style/code block/unsafe link KHÔNG render. | `src/shared/content/job-posting-rich-text/__tests__/validator.test.ts` (allowlist reject) + `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (render-time assertion + raw-payload absent). |
| `AC-05` | Corrupted payload fail closed: `RichTextSection` trả `null`; KHÔNG render raw payload; diagnostic chỉ qua marker/log an toàn. | `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (corrupt doc qua PUBLIC principal → assert section và raw payload đều không xuất hiện). |
| `AC-06` | SEO title/description/canonical URL đến từ canonical `JobPosting`; KHÔNG dùng fixture. | `npm run test:unit -- app/(jobs)/viec-lam/[slug]/page.tsx`; `rg -F "detail-sections.fixture" app/(jobs)/viec-lam` = 0 hit. |
| `AC-07` | JSON-LD structured data chỉ chứa field đã qua validator pass; không chứa field ngoài schema. | `src/domains/job-board/public-detail.service.test.ts` (snapshot JSON-LD). |
| `AC-08` | Apply route reject browser-supplied `slotId`/`projectId`/`jobOpeningId`; RPC derive canonical project/slot từ slug JobPosting; `CandidateSubmission` KHÔNG có field mới `jobPostingId`. | `src/domains/applications/marketplace-apply.routes.test.ts` + `tests/db/p1a1-jobposting-public-apply.integration.test.ts`; `rg -F "jobPostingId" prisma/schema.prisma src/domains/talent/intake-writer.service.ts` = 0 hit ngoài comment. |
| `AC-09` | Legacy `/viec-lam/PRJ-xxx`: trước cutover giữ nguyên; sau cutover route KHÔNG redirect-to-detail mơ hồ; chuyển tới listing filter theo `Project.code` chính xác (in-segment handler hiểu `PRJ-xxx` slug, render listing với query `project=<code>`, KHÔNG 301/308 tới detail). Project với N PUBLISHED postings phải trả đúng N rows; project 0 PUBLISHED không leak DRAFT/ARCHIVED. | `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (sibling test: Project với 2 PUBLISHED + 1 DRAFT, resolve `?project=PRJ-xxx` → list filter chính xác 2 PUBLISHED, không leak DRAFT, không redirect-to-detail); `app/(jobs)/viec-lam/[slug]/page.tsx` static check `rg -F "redirect" app/(jobs)/viec-lam` không chứa redirect-to-detail. |
| `AC-10` | KHÔNG fork shared profile; A1 chỉ consume `src/shared/content/job-posting-rich-text/**`. | `git status --porcelain -- src/shared/content/job-posting-rich-text` chỉ chứa read-side import (không chứa allowlist/limits edit); không có hit trên `prisma/schema.prisma`, `package.json`, `package-lock.json` (kết hợp `git ls-files --others --exclude-standard -- prisma/schema.prisma package.json package-lock.json` = 0 hit). |
| `AC-11` | Atomic authority (C-02 + C-05.1..10): PUBLISHED posting + OPEN opening + bound canonical slot thành công; DRAFT/ARCHIVED posting, DRAFT/FILLED/CANCELLED opening, old Project-only slug và sibling/wrong/expired/full slot đều fail closed. Node pre-read KHÔNG bypass được RPC. RPC chain: `s.id = jo.staffing_order_slot_id`, `s.staffing_order_id = jo.staffing_order_id`, `s.job_opening_id = jo.id`; nếu chain thiếu hoặc drift thì fail closed. | `tests/db/p1a1-jobposting-public-apply.integration.test.ts` chạy 12 case (C-05.1..10 + sibling/wrong/expired/full slot + payload mismatch P0010 + duplicate P0012 + exact row counts + sibling-only render). |
| `AC-12` | Function replacement + GRANT (C-03): giữ exact signature, owner `hrp_public_rpc`, `SECURITY DEFINER`, `SET search_path = public, pg_temp`, EXECUTE grants; migration wrapped BEGIN/COMMIT; `GRANT SELECT ON job_postings, job_openings TO hrp_public_rpc`; pre/post assertions (predecessor function signature, role posture, required tables/columns, owner, prosecdef=true, proconfig chứa `search_path=public, pg_temp`, PUBLIC không EXECUTE, app_user/app_user_writer giữ EXECUTE, hrp_public_rpc có đúng SELECT dependency, không có dư CREATE ON SCHEMA/membership); negative rollback proof sau một assertion failure. | Upgrade-path integration: migrate tới predecessor → seed synthetic fixtures → apply A1 migration → catalog assertions + negative rollback fixture; `npm run test:integration`. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-03`, `STEP-06` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-02`, `STEP-03`, `STEP-06` | `AC-03`, `AC-04`, `AC-05` |
| `RQ-03` | `STEP-02`, `STEP-03`, `STEP-06` | `AC-04`, `AC-05` |
| `RQ-04` | `STEP-01`, `STEP-03`, `STEP-06` | `AC-01` |
| `RQ-05` | `STEP-05`, `STEP-06` | `AC-09` |
| `RQ-07` | `STEP-04`, `STEP-06` | `AC-08` |
| `RQ-08` | `STEP-01`, `STEP-02`, `STEP-03`, `STEP-04`, `STEP-05`, `STEP-07` | `AC-01`, `AC-09` |
| `RQ-09` | `STEP-02`, `STEP-03`, `STEP-06` | `AC-03`, `AC-10` |
| `RQ-10` | `STEP-03`, `STEP-06` | `AC-06`, `AC-07` |
| `RQ-06` | `STEP-04`, `STEP-06` | `AC-08`, `AC-11`, `AC-12` |
| `RQ-11` | `STEP-02`, `STEP-06` | `AC-10` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | DRAFT/ARCHIVED content leak qua public detail. | Read chỉ `status = PUBLISHED`; service trả 404 cho non-PUBLISHED; DB integration test chứng minh `AC-01..02`. |
| `RISK-02` | Corrupted legacy payload render raw HTML. | Server render qua `@tiptap/static-renderer@3.31.3` qua HRP wrapper + shared validator; corrupted payload fail closed / omit section + diagnostic an toàn; KHÔNG `dangerouslySetInnerHTML` với DB payload. Test `AC-04..05`. |
| `RISK-03` | A1 vô tình fork shared profile rich-text. | Hard rule: A1 chỉ consume; `git diff --stat src/shared/content/job-posting-rich-text` phải chỉ read-side. Test `AC-10`. |
| `RISK-04` | A1 tự ý sửa schema/package.json/lockfile gây tranh chấp với A0. | Forbidden paths §0 + giám sát `git diff --stat` 3 path đó; nếu có hit thì block gate. |
| `RISK-05` | A1 cài bản Tiptap thứ hai hoặc đổi version. | `npm list @tiptap/static-renderer@3.31.3 --depth=0` ở gate; KHÔNG cài thêm; chỉ dùng bản A0 pin. |
| `RISK-06` | Legacy `/viec-lam/PRJ-xxx` 301/308 tới detail mơ hồ. | Route compatibility chỉ chuyển tới listing filter theo `Project.code`; static check không redirect-to-detail. Test `AC-09`. |
| `RISK-07` | A1 tự publish JobPosting từ `Project.isPublic` để có data. | Non-goal §1.2; chờ A0 merge + có ít nhất một real `PUBLISHED` JobPosting trước khi cutover. Cutover gate = A0 + data thật. |
| `RISK-08` | Route pre-read thấy PUBLISHED nhưng posting bị unpublish trước RPC; hồ sơ vẫn lọt qua Project legacy authority. | Không dùng Node pre-read làm authority. SECURITY DEFINER function resolve/revalidate posting/opening/slot trong cùng transaction; DB integration race/negative tests `AC-11`. |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | Revision documentation-only v1.1: chốt `@tiptap/static-renderer@3.31.3` qua HRP wrapper; chốt DRAFT/ARCHIVED trả 404; chốt canonical slug từ A0; chốt legacy route compatibility về listing filter; chốt apply derive server-side + KHÔNG thêm `CandidateSubmission.jobPostingId`; chốt `AC-01..10` chỉ chạy qua `npm run test:unit` và `npm run test:integration`; status `PROPOSED_ONLY`, contract gate `DRAFT`, next gate `T0_CONTRACT_REVIEW`. Chưa vào `READY_TO_CODE`. | Bản 39c7ebc có Build vs Adopt thiếu `@tiptap/static-renderer` wrapper; thiếu section `### 3.1`; chưa chốt DRAFT/ARCHIVED 404; chưa chốt canonical slug từ A0; chưa chốt legacy `/viec-lam/PRJ-xxx` route compatibility; chưa chốt AC chạy qua `npm run test:unit` và `npm run test:integration`; READY_FOR_EXECUTION cùng READY_TO_CODE không đúng với trạng thái proposal; cần revision để bám Pipeline V2. Round này KHÔNG code. |
| 2 | T0 contract correction v1.2: thêm canonical apply route + SECURITY DEFINER function-body migration + DB upgrade/negative tests vào allowlist; khóa atomic PUBLISHED/OPEN/slot authority. | Code thật cho thấy RPC hiện resolve `Project.code`/`Project.id`; v1.1 chỉ đổi route/service sẽ tạo TOCTOU và không thể enforce JobPosting status. |
| 3 | T0 semantic review closed; A1 vẫn `PROPOSED_ONLY` và chờ A0 ACCEPTED. Baseline pin exact `origin/main@b34cdddd`; renderer khóa React output subpath `/json/react`, bỏ nhánh DOMPurify chưa quyết. | Không code A1 trước khi package/shared profile/schema A0 freeze; tránh hidden dependency và HTML-string injection. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-24` | Initial contract at planning commit `39c7ebc` | Initial |
| `v1.1` | `2026-09-24` | Revision documentation-only theo Pipeline V2 (`a2ff3478`) + OD-P1A-01..09: `Build vs adopt` = `ADOPT` với `@tiptap/static-renderer@3.31.3` + shared HRP profile `src/shared/content/job-posting-rich-text/**` (bỏ `~2.2.0`); bổ sung section `### 3.1 Build vs Adopt` (License/Version/source/Wrapper boundary/Reason); bổ sung wrapper boundary `src/shared/content/job-posting-rich-text/**` chỉ consume (không fork); chốt DRAFT/ARCHIVED trả 404 (NO_LEAK); chốt corrupted payload fail closed / omit section + diagnostic an toàn; chốt canonical slug từ A0; chốt legacy `/viec-lam/PRJ-xxx` route compatibility (trước cutover giữ flow hiện tại; sau cutover về listing filter theo `Project.code`, KHÔNG 301/308 tới detail mơ hồ); chốt apply derive server-side + KHÔNG thêm `CandidateSubmission.jobPostingId` (OD-P1A-09); chốt KHÔNG khởi tạo React editor trên server + KHÔNG `dangerouslySetInnerHTML` với DB payload (OD-P1A-04); chốt AC chạy qua `npm run test:unit` và `npm run test:integration` (không AC dùng làm verification method); đổi Status `PROPOSED_ONLY`, Contract gate `DRAFT`, Next gate `T0_CONTRACT_REVIEW`; Audit reason ghi rõ risk acceptance của T0. Không code/install/migration/runtime. | Correction documentation-only per OD-P1A-01..09 + V2 contract gate |
| `v1.2` | `2026-09-24` | T0 semantic correction: baseline pin exact `origin/main@b34cdddd`; thêm existing canonical apply route vào scope; cho phép đúng một forward-only `hrp_public_apply_submission` body replacement; enforce PUBLISHED JobPosting + OPEN JobOpening + canonical slot atomically; giữ signature/owner/grants/search_path; bổ sung upgrade-path/catalog/race/negative AC; renderer khóa `@tiptap/static-renderer/json/react`, không HTML string/DOMPurify branch; environment `READY`. Status vẫn `PROPOSED_ONLY`, chờ A0 ACCEPTED. | Đóng TOCTOU, hidden dependency và missing-file allowlist gap trước execution. |
| `v1.3` | `2026-09-25` | Refresh baseline pin: `origin/main@91525013fc2720a3803e808baac39e1c4497daf6` (post-A0 closeout). Đối chiếu implementation P1-A0 thực tế: shared renderer `src/shared/content/job-posting-rich-text/renderer.tsx` đã freeze; JobPosting canonical slug đã enforce; JobOpening + StaffingOrderSlot chain đã có. Bổ sung `Build vs automate = N/A` (P1-A1 không phụ thuộc n8n; distribution/notification bằng n8n là task riêng sau canonical commit). Đóng toàn bộ Owner decisions (OD-A1-01..07) trước code. Chuyển Status → `READY_FOR_EXECUTION`, Contract gate → `READY_TO_CODE`. Không mở rộng scope sang P1-B. | A0 merge thật + shared renderer đã accept → A1 đủ điều kiện READY_TO_CODE. |
| `v1.4` | `2026-09-25` | T0 consolidated correction batch 1/1 (verdict `CHANGES_REQUIRED` trên `915dd2737082ea5437232fdf6c9a56d61e710d10`). Pin exact semantic Implementation SHA = `0ae001dd96e8c72c39a60b58f80aea6fcc2d306e`; `d357bc94...` và `915dd273...` chỉ là docs-only HANDOFF SHA pinning, KHÔNG ghi là Implementation SHA. Xóa citation sai/stale (`d2d60dc74...`, claim 21 files +1413/-335, claim implementation SHA = `d357bc94...`). Sửa §6.1 verification method sang file thật (`src/domains/job-board/public-detail.static.test.ts`, `src/domains/applications/marketplace-apply.routes.test.ts`, `tests/db/p1a1-jobposting-public-apply.integration.test.ts` đăng ký `vitest.integration-files.ts`). Correction budget used = 1/1; execution round = 2. Status đổi sang `ENV_BLOCKED` (DB integration không chạy thật được trong agent sandbox, chờ `DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST`); KHÔNG được `READY_FOR_AUDIT`/audit eligible khi DB integration chưa PASS thật. Next gate = `TIER3_LIGHT_AUDIT` (chỉ sau DB integration PASS thật). Bổ sung đặc tả C-02 (canonical slot chain `s.id=jo.staffing_order_slot_id`, `s.staffing_order_id=jo.staffing_order_id`, `s.job_opening_id=jo.id`; sibling slot rejection), C-03 (`GRANT SELECT ON job_postings, job_openings TO hrp_public_rpc`; `BEGIN`/`COMMIT`; pre/post assertions về predecessor function signature, role posture, tables/columns, owner, prosecdef=true, proconfig, EXECUTE grants, dependency SELECTs), C-04 (integration test dùng `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` + `withPublicDb`, không `DATABASE_URL_PUBLIC_TEST`, không `describe.skipIf`; đăng ký `vitest.integration-files.ts`), C-05 (12 behavior case bắt buộc + migration-chain proof + negative rollback), C-06 (legacy PRJ-xxx compatibility theo `Project.code` exact filter; KHÔNG 301/308 redirect-to-detail), C-07 (`RichTextSection` trả `null` cho invalid/corrupt payload; KHÔNG render raw payload). AC-09 bổ sung điều kiện "Project với N PUBLISHED postings → đúng N rows trong listing; Project 0 PUBLISHED → không leak DRAFT/ARCHIVED". AC-12 bổ sung GRANT + pre/post assertions + negative rollback. | Đóng stale SHA citation, sửa path refs, thắt chặt atomic authority sibling slot, cấp SELECT grant cho role RPC, khóa migration chain proof với rollback negative. |
