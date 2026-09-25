# TASK — `hrp-p1-a1-canonical-public-job-detail`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-a1-canonical-public-job-detail` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `ADOPT` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | `Public detail expose DRAFT/ARCHIVED hoặc raw payload là leak critical; lane CRITICAL + LIGHT audit (không phải NONE) cho vertical slice đầu của marketplace. Risk acceptance: Owner/T0 chấp nhận LIGHT audit cho cutover gate; người chấp nhận rủi ro: T0 (decision OD-P1A-04 + OD-P1A-09 đã chốt 2026-09-24).` |
| Spec version | `v1.2` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1A` |
| Baseline | `b34cdddd5c9bbfbda2cc276abf47f328e42af40c` |
| Contract gate | `DRAFT` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `src/domains/job-board/public.service.ts`; `src/shared/content/job-posting-rich-text/**` (chỉ consume, KHÔNG fork profile); `app/(jobs)/viec-lam/**`; `app/api/public/jobs/[slug]/applications/route.ts`; đúng một forward-only migration mới thay body `hrp_public_apply_submission`; `tests/db/public-detail.static.test.ts`; `tests/api/public-jobs-detail.route.test.ts`; `tests/db/p1a1-jobposting-public-apply.integration.test.ts`; targeted unit tests; vitest integration registration nếu cần |
| Forbidden paths | `prisma/schema.prisma`; `package.json`; `package-lock.json`; `src/shared/ui/editor/**` (client editor wrapper thuộc A0); `src/domains/staffing/job-posting-authoring.service.ts` (A0 service); mọi migration cũ và mọi migration mới ngoài đúng function-body migration của A1; `src/domains/job-board/publish.service.ts` (legacy publish Project.isPublic — KHÔNG modify); `CandidateSubmission.jobPostingId` persistence; tự publish bất kỳ Project.isPublic nào |
| Required gates | `npx prisma validate`; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration` (chạy `tests/db/public-detail.static.test.ts`, `tests/api/public-jobs-detail.route.test.ts`, `tests/db/p1a1-jobposting-public-apply.integration.test.ts`); migration-chain/upgrade-path proof cho function-body replacement; `npm list @tiptap/static-renderer@3.31.3 --depth=0` (read-only check; KHÔNG install thêm) |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `WAIT_P1_A0_ACCEPTED` |

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
| `DEC-05` | Canonical slug `<normalized-title>-<stable-short-suffix>` (sinh từ A0). Public detail dùng slug JobPosting. | CHOSEN |
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

- **In:** `src/domains/job-board/public.service.ts`; `src/shared/content/job-posting-rich-text/**` (chỉ consume); `app/(jobs)/viec-lam/**`; `app/api/public/jobs/[slug]/applications/route.ts`; đúng một migration mới thay body `hrp_public_apply_submission`; `tests/db/public-detail.static.test.ts`; `tests/api/public-jobs-detail.route.test.ts`; `tests/db/p1a1-jobposting-public-apply.integration.test.ts`; targeted unit tests; vitest integration registration nếu cần.
- **Out:** `prisma/schema.prisma`; `package.json`; `package-lock.json`; `src/shared/ui/editor/**` (client editor wrapper thuộc A0); `src/domains/staffing/job-posting-authoring.service.ts`; mọi migration cũ và mọi migration mới ngoài đúng function-body migration A1; `src/domains/job-board/publish.service.ts` (legacy Project.isPublic); tự publish bất kỳ Project.isPublic nào; persistence `CandidateSubmission.jobPostingId`.
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
| `STEP-04` | một forward-only migration mới + `app/api/public/jobs/[slug]/applications/route.ts` | Thay body `hrp_public_apply_submission` để resolve/revalidate `PUBLISHED` JobPosting + linked `OPEN` JobOpening + canonical slot trong cùng transaction; giữ signature/owner/grants/search_path. Route reject browser `slotId`/`projectId`/`jobOpeningId`, giữ Idempotency-Key bắt buộc. KHÔNG thêm `CandidateSubmission.jobPostingId`. | `AC-08`, `AC-11`, `AC-12` | Node pre-read authority / browser-supplied provenance / function security drift |
| `STEP-05` | Legacy route `/viec-lam/PRJ-xxx` | Trước cutover: giữ nguyên flow hiện tại. Sau cutover: chuyển tới listing đã lọc theo `Project.code`; KHÔNG chọn posting tùy ý; KHÔNG 301/308 tới detail mơ hồ. | `AC-09` | 301/308 tới detail mơ hồ / chọn posting tùy ý |
| `STEP-06` | `tests/db/public-detail.static.test.ts` + `tests/api/public-jobs-detail.route.test.ts` + `tests/db/p1a1-jobposting-public-apply.integration.test.ts` + targeted unit tests | Cover: chỉ PUBLISHED xuất hiện; DRAFT/ARCHIVED 404; JSON render qua shared static renderer; unsafe content không render; SEO từ canonical JobPosting; legacy PRJ route về filtered listing; canonical apply RPC atomic authority; direct/browser ID injection reject; function metadata preserved; không còn fixture authority. | `AC-01`..`AC-12` | Test fail / leak DRAFT / apply boundary drift |
| `STEP-07` | Gate evidence | `npx prisma validate`; migration-chain/upgrade-path proof; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration`; `npm list @tiptap/static-renderer@3.31.3 --depth=0`. | tất cả AC | Gate fail |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Public `/viec-lam` listing chỉ trả về `JobPosting` với `status = PUBLISHED`; DRAFT/ARCHIVED không xuất hiện. | `npm run test:integration tests/db/public-detail.static.test.ts` + `tests/api/public-jobs-detail.route.test.ts`. |
| `AC-02` | DRAFT/ARCHIVED trả 404 từ service `getPublicJobDetail` (KHÔNG lộ dưới preview/alternate path). | `npm run test:integration tests/api/public-jobs-detail.route.test.ts`. |
| `AC-03` | Public detail render rich content thành React elements qua `@tiptap/static-renderer/json/react` trong HRP wrapper. Server render KHÔNG gọi editor client, không HTML string. | `npm run test:unit` + `npm run test:integration`; `rg -F "@tiptap/react" src/domains/job-board src/shared/content` không xuất hiện ở server path; `rg -F "dangerouslySetInnerHTML" app/(jobs)/viec-lam src/shared/content` = 0 hit. |
| `AC-04` | image/iframe/raw HTML/script/style/code block/unsafe link KHÔNG render. | `npm run test:unit -- src/shared/content/job-posting-rich-text` (allowlist reject); `npm run test:integration` (render assertion). |
| `AC-05` | Corrupted payload fail closed / omit section + diagnostic an toàn; KHÔNG render raw payload. | `npm run test:integration` (fixture corrupted JSON qua service → assert omit section + diagnostic, raw payload không xuất hiện trong rendered React output). |
| `AC-06` | SEO title/description/canonical URL đến từ canonical `JobPosting`; KHÔNG dùng fixture. | `npm run test:unit -- app/(jobs)/viec-lam/[slug]/page.tsx`; `rg -F "detail-sections.fixture" app/(jobs)/viec-lam` = 0 hit. |
| `AC-07` | JSON-LD structured data chỉ chứa field đã qua validator pass; không chứa field ngoài schema. | `npm run test:unit` (snapshot JSON-LD với field hợp lệ). |
| `AC-08` | Apply route reject browser-supplied `slotId`/`projectId`/`jobOpeningId`; RPC derive canonical project/slot từ slug JobPosting; `CandidateSubmission` KHÔNG có field mới `jobPostingId`. | `npm run test:integration` với `tests/api/public-jobs-detail.route.test.ts` + `tests/db/p1a1-jobposting-public-apply.integration.test.ts`; `rg -F "jobPostingId" prisma/schema.prisma src/domains/talent/intake-writer.service.ts` = 0 hit. |
| `AC-09` | Legacy `/viec-lam/PRJ-xxx`: trước cutover giữ nguyên; sau cutover chuyển tới listing đã lọc theo `Project.code`; KHÔNG chọn posting tùy ý khi Project có nhiều posting; KHÔNG 301/308 tới detail mơ hồ. | `npm run test:integration` (route handler); static check `rg -F "redirect" app/(jobs)/viec-lam` không chứa redirect-to-detail. |
| `AC-10` | KHÔNG fork shared profile; A1 chỉ consume `src/shared/content/job-posting-rich-text/**`. | `git status --porcelain -- src/shared/content/job-posting-rich-text` chỉ chứa read-side import (không chứa allowlist/limits edit); không có hit trên `prisma/schema.prisma`, `package.json`, `package-lock.json` (kết hợp `git ls-files --others --exclude-standard -- prisma/schema.prisma package.json package-lock.json` = 0 hit). |
| `AC-11` | Atomic authority: PUBLISHED posting + OPEN opening + bound available slot thành công; DRAFT/ARCHIVED posting, DRAFT/FILLED/CANCELLED opening, old Project-only slug và slot ngoài linked opening đều fail closed. Không có Node pre-read nào có thể bypass quyết định RPC. | `npm run test:integration` với `tests/db/p1a1-jobposting-public-apply.integration.test.ts` chạy transaction/race cases trên PostgreSQL thật. |
| `AC-12` | Function replacement giữ nguyên exact signature, owner `hrp_public_rpc`, `SECURITY DEFINER`, `SET search_path = public, pg_temp`, EXECUTE grants hiện hành; migration rollback atomic khi assertion fail. | Upgrade-path integration: migrate tới predecessor → seed synthetic fixtures → apply A1 migration → catalog assertions + negative rollback fixture; `npm run test:integration`. |

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
