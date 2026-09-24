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
| Spec version | `v1.1` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1A` |
| Baseline | `39c7ebc8ed8c6ca8a2384ed4c0c827f1034edd92` |
| Contract gate | `DRAFT` |
| Decision state | `CLOSED` |
| Test environment | `NOT_REQUIRED` |
| Correction budget | `1` |
| In-scope roots | `src/domains/job-board/public.service.ts`; `src/shared/content/job-posting-rich-text/**` (chỉ consume, KHÔNG fork profile); `app/(jobs)/viec-lam/**`; `tests/db/public-detail.static.test.ts`; `tests/api/public-jobs-detail.route.test.ts`; targeted unit tests; DB integration test chứng minh DRAFT/ARCHIVED không lộ |
| Forbidden paths | `prisma/schema.prisma`; `package.json`; `package-lock.json`; `src/shared/ui/editor/**` (client editor wrapper thuộc A0); `src/domains/staffing/job-posting-authoring.service.ts` (A0 service); `prisma/migrations/`; `src/domains/job-board/publish.service.ts` (legacy publish Project.isPublic — KHÔNG modify); `CandidateSubmission.jobPostingId` persistence; tự publish bất kỳ Project.isPublic nào |
| Required gates | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration` (chạy `tests/db/public-detail.static.test.ts`, `tests/api/public-jobs-detail.route.test.ts`, DB integration test cho DRAFT/ARCHIVED không lộ); `npm list @tiptap/static-renderer@3.31.3 --depth=0` (read-only check; KHÔNG install thêm) |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `T0_CONTRACT_REVIEW` |

> Lane CRITICAL mặc định LIGHT. Risk acceptance: T0 chấp nhận LIGHT audit cho cutover gate; người chấp nhận rủi ro ghi rõ trong `Audit reason`.

> Round này chỉ chuẩn bị contract (`PROPOSED_ONLY`). KHÔNG chuyển `READY_FOR_EXECUTION` cho tới khi T0 duyệt qua `T0_CONTRACT_REVIEW`. V2 chỉ có một consolidated correction batch sau audit.

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

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Public detail / listing consume canonical `JobPosting` (status `PUBLISHED`); DRAFT/ARCHIVED trả 404 (NO_LEAK). | CHOSEN |
| `DEC-02` | Server render public detail bằng `@tiptap/static-renderer@3.31.3` qua HRP wrapper `src/shared/content/job-posting-rich-text/**`. KHÔNG khởi tạo React editor trên server; KHÔNG `dangerouslySetInnerHTML` với dữ liệu DB chưa qua shared validator/renderer. | CHOSEN |
| `DEC-03` | Build vs Adopt = ADOPT `@tiptap/static-renderer@3.31.3` (MIT) + shared HRP profile (`src/shared/content/job-posting-rich-text/**`). KHÔNG cài bản Tiptap thứ hai; KHÔNG đổi version. KHÔNG fork profile. | CHOSEN |
| `DEC-04` | Corrupted legacy payload (khi public read) → fail closed / omit section + ghi diagnostic an toàn; KHÔNG render raw payload. | CHOSEN |
| `DEC-05` | Canonical slug `<normalized-title>-<stable-short-suffix>` (sinh từ A0). Public detail dùng slug JobPosting. | CHOSEN |
| `DEC-06` | Legacy `/viec-lam/PRJ-xxx`: trước cutover giữ nguyên flow hiện tại; sau cutover route compatibility chuyển tới listing đã lọc theo `Project.code`; KHÔNG tự chọn một posting bất kỳ khi Project có nhiều posting; KHÔNG 301/308 tới detail mơ hồ. | CHOSEN |
| `DEC-07` | Apply `/api/public/jobs/[slug]/applications`: derive server-side `projectId/slotId/jobOpeningId` từ `PUBLISHED` JobPosting. KHÔNG tin IDs do browser tự truyền. KHÔNG thêm `CandidateSubmission.jobPostingId` (OD-P1A-09). Nếu cần persisted attribution tới JobPosting, mở task additive riêng sau P1-A1. | CHOSEN |
| `DEC-08` | SEO metadata (title, description, canonical URL) đến từ canonical `JobPosting`. KHÔNG dùng fixture title/desc; structured data JSON-LD chỉ dùng field đã được validator pass. | CHOSEN |
| `DEC-09` | KHÔNG fork shared profile: A1 chỉ consume `src/shared/content/job-posting-rich-text/**`. Wrapper phải đồng bộ allowlist + limits + schemaVersion với A0 (single source of truth). | CHOSEN |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Server-side rich HTML renderer | `@tiptap/static-renderer`, custom DOMPurify-only, tự viết ProseMirror→HTML | `ADOPT` | MIT | `@tiptap/static-renderer@3.31.3` | `src/shared/content/job-posting-rich-text/**` (server renderer wrapper) | Cần thiết cho SSR/SSG public detail; KHÔNG khởi tạo React editor trên server; pinned đồng bộ với A0 (license MIT); wrapper HRP khóa allowlist + limits + schemaVersion; không có library candidate nào đồng thời hỗ trợ đầy đủ JSON validator + shared profile + SSR-friendly output. |
| Shared schema/profile cho rich content | Tiptap extension set + custom validator trong A1 | `N/A` (HRP-owned) | n/a | n/a | `src/shared/content/job-posting-rich-text/**` (single source of truth do A0 freeze; A1 chỉ consume) | A1 không tự tạo profile mới; reuse profile + validator + limits do A0 freeze theo OD-P1A-02. Vendor library không bao giờ là authority cho state/persistence/validation. |
| Sanitize HTML output | DOMPurify-only, kết hợp `@tiptap/static-renderer` + DOMPurify, custom sanitizer | `ADOPT` (chỉ DOMPurify nếu cần layer phụ) | Apache-2.0 | DOMPurify pinned version tại implementation freeze (chưa cần install nếu `@tiptap/static-renderer` đủ an toàn với allowlist) | `src/shared/content/job-posting-rich-text/**` (DOMPurify adapter nếu có) | Wrapper HRP quyết định có dùng DOMPurify hay không tại implementation; chỉ ghi tên candidate, license, và wrapper boundary; không ép install ở contract v1.1. |
| SEO metadata / JSON-LD | next/head + schema.org helpers tự viết | `N/A` (HRP-owned) | n/a | n/a | `app/(jobs)/viec-lam/[slug]/page.tsx` (read-only projection) | Metadata đến từ canonical `JobPosting` qua projection HRP; không thương mại hóa metadata. |

- `ADOPT` đã pin license + version/source + compatibility + wrapper boundary + regression test boundary.
- `N/A` đối với shared profile / metadata projection vì đó là HRP-owned capability.
- `CUSTOM` không áp dụng; KHÔNG tự viết lại ProseMirror→HTML; KHÔNG fork shared profile.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Public `/viec-lam` listing chỉ trả về `JobPosting` với `status = PUBLISHED`. DRAFT/ARCHIVED trả 404 từ service `src/domains/job-board/public.service.ts` (KHÔNG lộ dưới dạng preview). |
| `RQ-02` | Public `/viec-lam/[slug]` detail render nội dung qua `@tiptap/static-renderer@3.31.3` qua HRP wrapper `src/shared/content/job-posting-rich-text/**`. |
| `RQ-03` | Corrupted legacy payload (khi public read) → fail closed / omit section + ghi diagnostic an toàn; KHÔNG render raw payload. |
| `RQ-04` | Canonical slug (sinh từ A0) là URL identity cho `/viec-lam/[slug]`. KHÔNG dùng duy nhất `Project.code` vì một Project có thể có nhiều JobPosting. |
| `RQ-05` | Legacy `/viec-lam/PRJ-xxx`: trước cutover giữ nguyên flow hiện tại; sau cutover, route compatibility chuyển tới listing đã lọc theo `Project.code`; KHÔNG chọn một posting bất kỳ khi Project có nhiều posting; KHÔNG 301/308 tới detail mơ hồ. |
| `RQ-06` | Apply `/api/public/jobs/[slug]/applications`: derive server-side `projectId/slotId/jobOpeningId` từ `PUBLISHED` JobPosting. KHÔNG tin IDs do browser tự truyền. |
| `RQ-07` | KHÔNG thêm `CandidateSubmission.jobPostingId` (OD-P1A-09); nếu cần persisted attribution tới JobPosting phải mở task additive riêng sau P1-A1. |
| `RQ-08` | KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`. KHÔNG cài bản Tiptap thứ hai hoặc đổi version. |
| `RQ-09` | KHÔNG khởi tạo React editor trên server; KHÔNG `dangerouslySetInnerHTML` với dữ liệu DB chưa qua shared validator/renderer. |
| `RQ-10` | SEO metadata (title, description, canonical URL) đến từ canonical `JobPosting`. JSON-LD structured data chỉ dùng field đã được validator pass. |
| `RQ-11` | KHÔNG fork shared profile; A1 chỉ consume `src/shared/content/job-posting-rich-text/**` (single source of truth do A0 freeze). |

### 4.2 Scope boundaries

- **In:** `src/domains/job-board/public.service.ts`; `src/shared/content/job-posting-rich-text/**` (chỉ consume); `app/(jobs)/viec-lam/**`; `tests/db/public-detail.static.test.ts`; `tests/api/public-jobs-detail.route.test.ts`; targeted unit tests; DB integration test chứng minh DRAFT/ARCHIVED không lộ.
- **Out:** `prisma/schema.prisma`; `package.json`; `package-lock.json`; `src/shared/ui/editor/**` (client editor wrapper thuộc A0); `src/domains/staffing/job-posting-authoring.service.ts`; `prisma/migrations/`; `src/domains/job-board/publish.service.ts` (legacy Project.isPublic); tự publish bất kỳ Project.isPublic nào; persistence `CandidateSubmission.jobPostingId`.
- **Allowed task artifacts:** `docs/tasks/hrp-p1-a1-canonical-public-job-detail/**`.

### 4.3 Domain boundaries

- **Data/state:** Public read chỉ đụng `JobPosting` với `status = PUBLISHED`. Read-only; KHÔNG mutate. DRAFT/ARCHIVED trả 404 từ service.
- **Permission/security:** Public read không cần auth. Apply route xác minh slug → `PUBLISHED` JobPosting; derive server-side. RLS existing trên `job_postings` phải tiếp tục áp dụng (qua `withDbContext`).
- **Interface/API:** Public REST cho `/viec-lam` listing + detail + apply route. Server render HTML qua shared renderer. JSON-LD structured data chỉ từ field đã validator pass. KHÔNG `dangerouslySetInnerHTML` với dữ liệu DB chưa qua shared validator/renderer.
- **Migration/rollback:** KHÔNG có schema migration. KHÔNG DROP/RENAME. Nếu cần thay đổi metadata structure: thêm field qua A0 additive migration; KHÔNG sửa trong A1. KHÔNG tự publish bất kỳ Project.isPublic nào. Cutover gate chỉ mở khi A0 merge + có ít nhất một real `PUBLISHED` JobPosting.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/job-board/public.service.ts` | Refactor: `listPublicJobs` chỉ SELECT từ `JobPosting` với `status = PUBLISHED`; `getPublicJobDetail` nhận `slug` JobPosting (KHÔNG dùng `Project.code`); DRAFT/ARCHIVED trả 404. | `AC-01`, `AC-02` | Service đọc sai nguồn / lộ DRAFT |
| `STEP-02` | `src/shared/content/job-posting-rich-text/**` (consume only) | Import shared renderer wrapper (do A0 freeze) + shared schema/profile + shared validator. KHÔNG fork; KHÔNG đổi allowlist/limits. | `AC-03`, `AC-04`, `AC-05` | A1 sửa wrapper / fork profile |
| `STEP-03` | `app/(jobs)/viec-lam/page.tsx` + `app/(jobs)/viec-lam/[slug]/page.tsx` | Listing gọi `listPublicJobs`. Detail dùng `getPublicJobDetail` + `@tiptap/static-renderer@3.31.3` qua HRP wrapper. SEO metadata từ canonical JobPosting. JSON-LD structured data từ field đã validator pass. | `AC-06`, `AC-07`, `AC-10` | UI còn fixture authority / render raw payload |
| `STEP-04` | `app/api/public/jobs/[slug]/applications/route.ts` (nếu chưa tồn tại) | Apply route: derive server-side `projectId/slotId/jobOpeningId` từ `PUBLISHED` JobPosting. Reject nếu browser tự truyền ID. Idempotency-Key bắt buộc. KHÔNG thêm `CandidateSubmission.jobPostingId`. | `AC-08` | Browser-supplied ID được tin / persistence mới |
| `STEP-05` | Legacy route `/viec-lam/PRJ-xxx` | Trước cutover: giữ nguyên flow hiện tại. Sau cutover: chuyển tới listing đã lọc theo `Project.code`; KHÔNG chọn posting tùy ý; KHÔNG 301/308 tới detail mơ hồ. | `AC-09` | 301/308 tới detail mơ hồ / chọn posting tùy ý |
| `STEP-06` | `tests/db/public-detail.static.test.ts` + `tests/api/public-jobs-detail.route.test.ts` + targeted unit tests | Cover: chỉ PUBLISHED xuất hiện; DRAFT/ARCHIVED 404; JSON render qua shared static renderer; image/iframe/raw HTML/unsafe link không render; corrupted payload fail closed; SEO từ canonical JobPosting; legacy PRJ route về filtered listing; apply derive server-side; không còn fixture authority. | `AC-01`..`AC-10` | Test fail / leak DRAFT |
| `STEP-07` | Gate evidence | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration`; `npm list @tiptap/static-renderer@3.31.3 --depth=0`. | tất cả AC | Gate fail |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Public `/viec-lam` listing chỉ trả về `JobPosting` với `status = PUBLISHED`; DRAFT/ARCHIVED không xuất hiện. | `npm run test:integration tests/db/public-detail.static.test.ts` + `tests/api/public-jobs-detail.route.test.ts`. |
| `AC-02` | DRAFT/ARCHIVED trả 404 từ service `getPublicJobDetail` (KHÔNG lộ dưới preview/alternate path). | `npm run test:integration tests/api/public-jobs-detail.route.test.ts`. |
| `AC-03` | Public detail render rich content qua `@tiptap/static-renderer@3.31.3` qua HRP wrapper `src/shared/content/job-posting-rich-text/**`. Server render KHÔNG gọi React editor. | `npm run test:unit` + `npm run test:integration`; `rg -F "@tiptap/react" src/domains/job-board src/shared/content` không xuất hiện ở server render path; `rg -F "dangerouslySetInnerHTML" app/(jobs)/viec-lam src/shared/content` không xuất hiện với DB payload path. |
| `AC-04` | image/iframe/raw HTML/script/style/code block/unsafe link KHÔNG render. | `npm run test:unit -- src/shared/content/job-posting-rich-text` (allowlist reject); `npm run test:integration` (render assertion). |
| `AC-05` | Corrupted payload fail closed / omit section + diagnostic an toàn; KHÔNG render raw payload. | `npm run test:integration` (fixture corrupted JSON qua service → assert omitsection + diagnostic, không có raw payload trong HTML output). |
| `AC-06` | SEO title/description/canonical URL đến từ canonical `JobPosting`; KHÔNG dùng fixture. | `npm run test:unit -- app/(jobs)/viec-lam/[slug]/page.tsx`; `rg -F "detail-sections.fixture" app/(jobs)/viec-lam` = 0 hit. |
| `AC-07` | JSON-LD structured data chỉ chứa field đã qua validator pass; không chứa field ngoài schema. | `npm run test:unit` (snapshot JSON-LD với field hợp lệ). |
| `AC-08` | Apply `/api/public/jobs/[slug]/applications` derive `projectId/slotId/jobOpeningId` server-side từ `PUBLISHED` JobPosting; reject khi browser tự truyền ID lệch; `CandidateSubmission` KHÔNG có field mới `jobPostingId`. | `npm run test:integration tests/api/public-jobs-detail.route.test.ts` (route + intake writer); `rg -F "jobPostingId" prisma/schema.prisma src/domains/talent/intake-writer.service.ts` = 0 hit (kể cả diff A1). |
| `AC-09` | Legacy `/viec-lam/PRJ-xxx`: trước cutover giữ nguyên; sau cutover chuyển tới listing đã lọc theo `Project.code`; KHÔNG chọn posting tùy ý khi Project có nhiều posting; KHÔNG 301/308 tới detail mơ hồ. | `npm run test:integration` (route handler); static check `rg -F "redirect" app/(jobs)/viec-lam` không chứa redirect-to-detail. |
| `AC-10` | KHÔNG fork shared profile; A1 chỉ consume `src/shared/content/job-posting-rich-text/**`. | `git status --porcelain -- src/shared/content/job-posting-rich-text` chỉ chứa read-side import (không chứa allowlist/limits edit); không có hit trên `prisma/schema.prisma`, `package.json`, `package-lock.json` (kết hợp `git ls-files --others --exclude-standard -- prisma/schema.prisma package.json package-lock.json` = 0 hit). |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-03`, `STEP-06` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-02`, `STEP-03`, `STEP-06` | `AC-03`, `AC-04`, `AC-05` |
| `RQ-03` | `STEP-02`, `STEP-03`, `STEP-06` | `AC-04`, `AC-05` |
| `RQ-04` | `STEP-01`, `STEP-03`, `STEP-06` | `AC-01` |
| `RQ-05` | `STEP-05`, `STEP-06` | `AC-09` |
| `RQ-06` | `STEP-04`, `STEP-06` | `AC-08` |
| `RQ-07` | `STEP-04`, `STEP-06` | `AC-08` |
| `RQ-08` | `STEP-01`, `STEP-02`, `STEP-03`, `STEP-04`, `STEP-05`, `STEP-07` | `AC-01`, `AC-09` |
| `RQ-09` | `STEP-02`, `STEP-03`, `STEP-06` | `AC-03`, `AC-10` |
| `RQ-10` | `STEP-03`, `STEP-06` | `AC-06`, `AC-07` |
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

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | Revision documentation-only v1.1: chốt `@tiptap/static-renderer@3.31.3` qua HRP wrapper; chốt DRAFT/ARCHIVED trả 404; chốt canonical slug từ A0; chốt legacy route compatibility về listing filter; chốt apply derive server-side + KHÔNG thêm `CandidateSubmission.jobPostingId`; chốt `AC-01..10` chỉ chạy qua `npm run test:unit` và `npm run test:integration`; status `PROPOSED_ONLY`, contract gate `DRAFT`, next gate `T0_CONTRACT_REVIEW`. Chưa vào `READY_TO_CODE`. | Bản 39c7ebc có Build vs Adopt thiếu `@tiptap/static-renderer` wrapper; thiếu section `### 3.1`; chưa chốt DRAFT/ARCHIVED 404; chưa chốt canonical slug từ A0; chưa chốt legacy `/viec-lam/PRJ-xxx` route compatibility; chưa chốt AC chạy qua `npm run test:unit` và `npm run test:integration`; READY_FOR_EXECUTION cùng READY_TO_CODE không đúng với trạng thái proposal; cần revision để bám Pipeline V2. Round này KHÔNG code. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-24` | Initial contract at planning commit `39c7ebc` | Initial |
| `v1.1` | `2026-09-24` | Revision documentation-only theo Pipeline V2 (`a2ff3478`) + OD-P1A-01..09: `Build vs adopt` = `ADOPT` với `@tiptap/static-renderer@3.31.3` + shared HRP profile `src/shared/content/job-posting-rich-text/**` (bỏ `~2.2.0`); bổ sung section `### 3.1 Build vs Adopt` (License/Version/source/Wrapper boundary/Reason); bổ sung wrapper boundary `src/shared/content/job-posting-rich-text/**` chỉ consume (không fork); chốt DRAFT/ARCHIVED trả 404 (NO_LEAK); chốt corrupted payload fail closed / omit section + diagnostic an toàn; chốt canonical slug từ A0; chốt legacy `/viec-lam/PRJ-xxx` route compatibility (trước cutover giữ flow hiện tại; sau cutover về listing filter theo `Project.code`, KHÔNG 301/308 tới detail mơ hồ); chốt apply derive server-side + KHÔNG thêm `CandidateSubmission.jobPostingId` (OD-P1A-09); chốt KHÔNG khởi tạo React editor trên server + KHÔNG `dangerouslySetInnerHTML` với DB payload (OD-P1A-04); chốt AC chạy qua `npm run test:unit` và `npm run test:integration` (không AC dùng làm verification method); đổi Status `PROPOSED_ONLY`, Contract gate `DRAFT`, Next gate `T0_CONTRACT_REVIEW`; Audit reason ghi rõ risk acceptance của T0. Không code/install/migration/runtime. | Correction documentation-only per OD-P1A-01..09 + V2 contract gate |
