# TASK — `hrp-p1-a0-jobposting-authoring-publish`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-a0-jobposting-authoring-publish` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `ADOPT` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | `Tạo JobPosting là canonical public source of truth cho P1-A; rich content + state machine + RLS là critical path cho public marketplace; LIGHT audit đảm bảo changed surface (schema, service, API, admin UI) được đối chiếu sau khi implementation freeze SHA. Không phải CRITICAL + NONE — public-facing leak risk có thật. Risk acceptance: Owner/T0 chấp nhận LIGHT audit cho vertical slice đầu của marketplace. Người chấp nhận rủi ro: T0 (decision OD-P1A-08 + OD-P1A-09 đã chốt 2026-09-24).` |
| Spec version | `v1.1` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1A` |
| Baseline | `39c7ebc8ed8c6ca8a2384ed4c0c827f1034edd92` |
| Contract gate | `DRAFT` |
| Decision state | `CLOSED` |
| Test environment | `NOT_REQUIRED` |
| Correction budget | `1` |
| In-scope roots | `prisma/schema.prisma`; đúng một forward-only migration mới; `package.json`; `package-lock.json`; `src/shared/ui/editor/**`; `src/shared/content/job-posting-rich-text/**`; `src/domains/staffing/job-posting-authoring.service.ts`; `src/domains/staffing/job-posting-list.service.ts` (mở rộng DTO nếu cần); `app/api/admin/jobs/job-postings/**`; `app/admin/jobs/job-postings/**`; `tests/db/job-posting-authoring.integration.test.ts`; targeted unit tests; vitest integration registration nếu test DB mới cần đăng ký |
| Forbidden paths | `src/domains/job-board/public.service.ts`; `app/(jobs)/viec-lam/**`; `src/domains/job-board/components/**`; `src/shared/content/job-posting-rich-text/**` được A1 consume (KHÔNG fork profile); `prisma/migrations/` các file không thuộc migration mới của A0 |
| Required gates | `npx prisma validate`; `npx prisma generate`; `npm run typecheck`; `npm run test:unit`; `npm run test:integration` (chạy `tests/db/job-posting-authoring.integration.test.ts`); `npm run lint`; `npm list @tiptap/react@3.31.3 @tiptap/pm@3.31.3 @tiptap/starter-kit@3.31.3 @tiptap/static-renderer@3.31.3 --depth=0` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `T0_CONTRACT_REVIEW` |

> Lane CRITICAL mặc định LIGHT. Risk acceptance: T0 chấp nhận LIGHT audit cho vertical slice đầu của marketplace; người chấp nhận rủi ro ghi rõ trong `Audit reason`.

> Round này chỉ chuẩn bị contract (`PROPOSED_ONLY`). KHÔNG chuyển `READY_FOR_EXECUTION` cho tới khi T0 duyệt qua `T0_CONTRACT_REVIEW`. V2 chỉ có một consolidated correction batch sau audit.

## 1. Outcome

### 1.1 User-visible outcome

- Admin có khả năng, từ một StaffingOrderSlot đã được Admin chọn, tạo hoặc reuse `JobOpening` rồi tạo/reuse `JobPosting` DRAFT gắn với nó; soạn thảo và cập nhật nội dung qua shared Tiptap-based editor wrapper; chuyển trạng thái DRAFT ↔ PUBLISHED → ARCHIVED; hệ thống sinh canonical slug (`<normalized-title>-<stable-short-suffix>`); cạnh tranh race và replay; chống drift content bằng schema validation + revision check + RLS. `JobPosting` trở thành single source of truth cho URL công khai và content của tin tuyển dụng, trong khi structured columns (`title`, `salaryDisplay`, slug, status, revision, filter/sort fields, project/opening/slot identifiers) vẫn tách riêng trong DB.

### 1.2 Non-goals

- KHÔNG blind data migration từ `Project.isPublic` sang `PUBLISHED` JobPosting (OD-P1A-05).
- KHÔNG sửa public route `/viec-lam/**` hay `src/domains/job-board/public.service.ts` (thuộc A1).
- KHÔNG mở full CMS, Media Library, drag & drop page builder.
- KHÔNG thêm plugin Tiptap hình ảnh/iframe/video/HTTP khác ngoài allowlist (OD-P1A-03).
- KHÔNG dùng Tiptap Cloud / Collaboration / AI / paid extensions trong slice đầu.
- KHÔNG tạo hai allowlist rich-text khác nhau giữa A0 và A1 (OD-P1A-02): shared profile là single source of truth ở `src/shared/content/job-posting-rich-text/**`.
- KHÔNG auto-publish; KHÔNG tự chọn ngẫu nhiên StaffingOrder/Slot.

## 2. Evidence

Chỉ liệt kê bằng chứng cần để Tier 1 implement.

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/public.service.ts:705` (`getPublicJobDetail`) đọc `Project.code` làm slug, bỏ qua `JobPosting`. | Chứng minh public detail đang đọc sai nguồn; A0 schema + service chuẩn bị source-of-truth mới để A1 cut over. |
| `EV-02` | `src/domains/job-board/publish.service.ts` chỉ bật `Project.isPublic`; không có `JobPosting` CRUD. | Chứng minh publish service hiện không thuộc A0; cần service mới. |
| `EV-03` | `prisma/schema.prisma:491-507` (`JobPosting` chỉ có `id/jobOpeningId/slug/revision/status/publishedAt/archivedAt/createdAt/updatedAt`). | Chứng minh schema thiếu content fields; A0 cần additive. |
| `EV-04` | `prisma/schema.prisma:431-456` (`StaffingOrderSlot` có nullable `jobOpeningId` + quan hệ `JobOpening` qua `OpeningSlots`). | Cho phép A0 implement create-or-reuse JobOpening từ selected slot theo OD-P1A-06. |
| `EV-05` | `src/domains/job-board/fixtures/detail-sections.fixture.ts` (UI04d D.A đang dùng DEMO fixture cho intro/benefits/requirements/apply instructions/footer banner). | Cho thấy A0 schema + service cần để A1 cut over thật sự dùng DB. |
| `EV-06` | `src/domains/talent/intake-writer.service.ts` + `app/api/admin/intake/staff/route.ts` (current intake boundary). | Xác nhận `CandidateSubmission` không có `jobPostingId` (OD-P1A-09); A0 không mở persistence mới. |
| `EV-07` | `npm view @tiptap/react@3.31.3 version license peerDependencies --json` (MIT; peer `@tiptap/pm 3.31.3`, `@tiptap/core 3.31.3`); tương tự cho `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/static-renderer`. | Evidence ADOPT pin version 3.31.3 (OD-P1A-01). |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Additive schema `JobPosting` tối thiểu với: `title String`, `salaryDisplay String`, `descriptionJson Json?`, `requirementsJson Json?`, `benefitsJson Json?`, `applicationInstructionsJson Json?`, `contentSchemaVersion Int @default(1)`. | CHOSEN |
| `DEC-02` | State transition `DRAFT ↔ PUBLISHED → ARCHIVED`; `ARCHIVED` terminal trong slice này. Publish yêu cầu: JobOpening hợp lệ; title hợp lệ; canonical slug; required rich fields hợp lệ; revision match; authorization/RLS pass. | CHOSEN |
| `DEC-03` | Canonical persistence = Tiptap/ProseMirror JSON + `contentSchemaVersion = 1`. Server validates trước khi ghi DB; invalid/unknown node hoặc mark REJECT khi write, không silently accept. | CHOSEN |
| `DEC-04` | Build vs Adopt = ADOPT Tiptap OSS (MIT), pin exact `3.31.3` cho 4 package: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/static-renderer` (và peer `@tiptap/core@3.31.3`). KHÔNG dùng Tiptap Cloud/Collaboration/AI/paid extensions. Wrapper thuộc HRP: `src/shared/ui/editor/**` (client) + `src/shared/content/job-posting-rich-text/**` (server-side schema/profile, validator, static renderer). | CHOSEN |
| `DEC-05` | Wrapper boundary: vendor API KHÔNG lan trực tiếp vào domain. `src/shared/ui/editor/**` chỉ là client wrapper; `src/shared/content/job-posting-rich-text/**` là single source of truth cho extensions, JSON validation, node/mark allowlist, document limits, public static rendering. A0 và A1 không tự tạo hai allowlist khác nhau. | CHOSEN |
| `DEC-06` | Forward-only additive migration: KHÔNG DROP column, KHÔNG RENAME, KHÔNG fabricate `PUBLISHED` content từ `Project.isPublic`. Existing rows giữ nguyên cho tới khi Admin soạn bản nháp mới. Public legacy flow giữ nguyên cho tới A1 cutover gate. | CHOSEN |
| `DEC-07` | Vertical slice A0 phải create-or-reuse JobOpening từ selected StaffingOrderSlot: lock slot trong transaction; nếu slot đã có `jobOpeningId` thì reuse; nếu chưa thì tạo `JobOpening` DRAFT và bind lại slot; tạo/reuse đúng một `JobPosting` DRAFT cho JobOpening; chống race + replay; KHÔNG chọn ngẫu nhiên StaffingOrder/Slot; KHÔNG auto-publish. | CHOSEN |
| `DEC-08` | Canonical JobPosting slug pattern = `<normalized-title>-<stable-short-suffix>` (slug unique, immutable sau publish đầu tiên, trừ migration riêng). KHÔNG dùng duy nhất `Project.code` vì một Project có thể có nhiều JobOpening/JobPosting. | CHOSEN |
| `DEC-09` | Authorization cho Admin JobPosting API: ADMIN/HR_MANAGER/HR_STAFF (ghi); READ cho SALE/PM qua admin list (chỉ SELECT qua existing `job-posting-list.service.ts`). KHÔNG mở endpoint public anon. | CHOSEN |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Rich-text editor engine (client) | Tiptap OSS, Lexical, BlockNote, tự xây contentEditable | `ADOPT` | MIT | `@tiptap/react@3.31.3` (peer `@tiptap/core@3.31.3`) | `src/shared/ui/editor/**` | Tiptap OSS là default candidate theo `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §47.2 BUILD_VS_ADOPT; pin exact `3.31.3` (read-only evidence `npm view @tiptap/react@3.31.3 version license peerDependencies --json`); license MIT tương thích; peer React `^17..19` đã khớp repo (`react ^19.0.0`, `react-dom ^19.0.0`); wrapper client giữ domain API ổn định. Vendor API KHÔNG lan vào domain. |
| ProseMirror schema layer (peer bắt buộc) | `@tiptap/pm` | `ADOPT` | MIT | `@tiptap/pm@3.31.3` | `src/shared/ui/editor/**` (re-export qua `src/shared/content/job-posting-rich-text/**`) | Bắt buộc theo peer của `@tiptap/react@3.31.3`; pinned đồng bộ. |
| Starter extension set (bold/italic/heading/list/link) | `@tiptap/starter-kit` | `ADOPT` | MIT | `@tiptap/starter-kit@3.31.3` | `src/shared/ui/editor/**` (qua shared profile) | Cung cấp đúng node/mark nằm trong initial allowlist (OD-P1A-03); pinned đồng bộ; license MIT. |
| Server-side static HTML rendering | `@tiptap/static-renderer` | `ADOPT` | MIT | `@tiptap/static-renderer@3.31.3` | `src/shared/content/job-posting-rich-text/**` (server renderer wrapper) | Cần cho A1 public detail; KHÔNG khởi tạo React editor trên server; pinned đồng bộ; license MIT. |
| Node/mark allowlist + document limits | Custom validator trong repo | `N/A` (HRP-owned) | n/a | n/a | `src/shared/content/job-posting-rich-text/**` | Initial allowlist (nodes: doc/paragraph/text/heading 2–3/bulletList/orderedList/listItem; marks: bold/italic/link); limits 64 KiB / 1.000 nodes / depth 16 / URL 2.048 bytes. Link chỉ HTTPS, không `javascript:` / `data:` / `file:` / protocol-relative. `target`/`rel` do HRP renderer kiểm soát. |

- `ADOPT` đã pin license + version/source + compatibility (peer đồng bộ React/Next) + wrapper boundary + regression test boundary.
- `N/A` đối với validator/limits vì đó là HRP-owned capability, không tự tạo capability kỹ thuật phổ thông bằng package ngoài (vendor library không bao giờ là authority cho state transition, persistence, RLS).
- `CUSTOM` không áp dụng; không có evidence candidate nào hợp lý hơn Tiptap OSS theo plan §47.2.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Schema additive `JobPosting`: `title`, `salaryDisplay`, `descriptionJson`, `requirementsJson`, `benefitsJson`, `applicationInstructionsJson`, `contentSchemaVersion` (mặc định `1`). Migrations forward-only, không DROP/RENAME/fabricate PUBLISHED. |
| `RQ-02` | API tạo DRAFT `JobPosting` từ một canonical `JobOpening` đã chọn; create-or-reuse `JobOpening` từ StaffingOrderSlot theo OD-P1A-06 (lock slot trong transaction; reuse nếu slot đã có `jobOpeningId`; ngược lại tạo `JobOpening` DRAFT và bind lại slot; tạo/reuse đúng một `JobPosting` DRAFT). |
| `RQ-03` | API lưu DRAFT có optimistic concurrency (`revision` check). Backend reject khi payload chứa node/mark ngoài allowlist; reject raw HTML; reject `javascript:` / `data:` / `file:` / protocol-relative link; reject kích thước vượt 64 KiB / 1.000 nodes / depth 16 / URL > 2.048 bytes; reject unknown contentSchemaVersion. |
| `RQ-04` | Generate canonical slug `<normalized-title>-<stable-short-suffix>`. Slug unique trong `JobPosting`; immutable sau publish đầu tiên. KHÔNG dùng duy nhất `Project.code`. |
| `RQ-05` | API publish/unpublish/archive với RLS authorization (ADMIN/HR_MANAGER/HR_STAFF cho mutate; SALE/PM READ qua admin list). Publish yêu cầu JobOpening hợp lệ + title hợp lệ + canonical slug + required rich fields hợp lệ + revision match + authorization/RLS pass. `ARCHIVED` là terminal. |
| `RQ-06` | Sửa editor shell thành real editor gọi API backend; dùng shared wrapper `src/shared/ui/editor/**` + shared profile `src/shared/content/job-posting-rich-text/**`. Persistence chỉ qua API; KHÔNG lưu raw HTML. |
| `RQ-07` | Khi public read gặp corrupted legacy payload, fail closed / omit section + ghi diagnostic an toàn, KHÔNG render raw payload. |
| `RQ-08` | KHÔNG sửa `CandidateSubmission.jobPostingId`; A0 không mở persistence mới cho JobPostingId. (A1 vẫn dùng current intake boundary.) |

### 4.2 Scope boundaries

- **In:** additive schema (JobPosting), một forward-only migration mới, `package.json` + `package-lock.json` (chốt 4 package Tiptap pinned `3.31.3`), `src/shared/ui/editor/**`, `src/shared/content/job-posting-rich-text/**`, `src/domains/staffing/job-posting-authoring.service.ts`, `src/domains/staffing/job-posting-list.service.ts` (DTO mở rộng nếu cần), `app/api/admin/jobs/job-postings/**`, `app/admin/jobs/job-postings/**`, `tests/db/job-posting-authoring.integration.test.ts`, targeted unit tests, vitest integration registration nếu cần.
- **Out:** public routes (`app/(jobs)/viec-lam/**`, `src/domains/job-board/public.service.ts`, `src/domains/job-board/components/**`); legacy data migration từ `Project.isPublic`; Tiptap Cloud/Collaboration/AI/paid extensions; full CMS/Media Library; auto-publish; tự chọn ngẫu nhiên StaffingOrder/Slot; `CandidateSubmission.jobPostingId` persistence.
- **Allowed task artifacts:** `docs/tasks/hrp-p1-a0-jobposting-authoring-publish/**`.

### 4.3 Domain boundaries

- **Data/state:** `JobPosting` status state machine theo OD-P1A-08; `contentSchemaVersion` bắt buộc và phải khớp validator version. Forward-only migration; existing rows không bị rewrite.
- **Permission/security:** Admin JobPosting API: ADMIN/HR_MANAGER/HR_STAFF cho mutate. READ cho SALE/PM qua `job-posting-list.service.ts`. Không mở endpoint public anon. RLS Phases hiện hữu trên `job_postings` phải tiếp tục áp dụng (qua `withDbContext`).
- **Interface/API:** Backend API cho Admin JobPosting. Client HTML không được tin tưởng. KHÔNG `dangerouslySetInnerHTML` với dữ liệu DB chưa qua shared validator/renderer.
- **Migration/rollback:** Forward-only ADD-only. KHÔNG DROP column. KHÔNG fabricate `PUBLISHED` content từ `Project.isPublic`. Existing rows giữ nguyên. Public legacy flow giữ nguyên cho tới A1 cutover gate (xoá/mở rộng route compatibility không thuộc A0).

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `prisma/schema.prisma` (additive); `prisma/migrations/<timestamp>_p1a0_jobposting_content_fields/migration.sql` | Khai báo + migration ADD-only cho `title`, `salaryDisplay`, `descriptionJson`, `requirementsJson`, `benefitsJson`, `applicationInstructionsJson`, `contentSchemaVersion` (mặc định `1`). KHÔNG DROP/RENAME. | `AC-01`, `AC-02` | `npx prisma validate` thất bại hoặc migration preview có DROP/RENAME |
| `STEP-02` | `package.json` + `package-lock.json` | Pin exact `3.31.3` cho 4 package Tiptap (và peer `@tiptap/core@3.31.3`). KHÔNG dùng caret/tilde. KHÔNG cài bản Tiptap thứ hai. | `AC-13` | `npm list` không khớp `3.31.3` đồng bộ |
| `STEP-03` | `src/shared/content/job-posting-rich-text/**` | Shared profile (node/mark allowlist + limits + link protocol + schemaVersion check), server-side JSON validator, public static renderer qua `@tiptap/static-renderer@3.31.3`. Single source of truth; A1 chỉ consume, không fork. | `AC-03`, `AC-04`, `AC-05` | wrapper không validate được payload; server renderer phụ thuộc editor client |
| `STEP-04` | `src/shared/ui/editor/**` | Client editor wrapper dùng `@tiptap/react@3.31.3` + `@tiptap/pm@3.31.3` + `@tiptap/starter-kit@3.31.3` qua shared profile. Vendor API KHÔNG lan trực tiếp vào domain. | `AC-13`, `AC-14` | UI error / vendor import lan vào domain |
| `STEP-05` | `src/domains/staffing/job-posting-authoring.service.ts` | Commands: `createOrReuseJobOpeningForSlot`, `createOrReuseJobPostingDraftForOpening`, `updateDraftContent`, `publishJobPosting`, `unpublishJobPosting`, `archiveJobPosting`, `generateCanonicalSlug`. Idempotency qua `withIdempotency` ở route; revision check; race-safe theo OD-P1A-06. | `AC-06`, `AC-07`, `AC-08`, `AC-09` | Logic sai RLS / race / replay |
| `STEP-06` | `src/domains/staffing/job-posting-list.service.ts` (DTO mở rộng nếu cần) | DTO list hiển thị `title`, `salaryDisplay`, content có/không, `contentSchemaVersion` cho Admin/Sale/PM. KHÔNG đổi read shape khi không cần. | `AC-12` | DTO vỡ unit test hiện hữu |
| `STEP-07` | `app/api/admin/jobs/job-postings/**` | REST handlers validate JSON, contentSchemaVersion, slug canonical, revision, role gate (ADMIN/HR_MANAGER/HR_STAFF cho mutate; READ qua list). Idempotency-Key bắt buộc cho write. | `AC-02`, `AC-04`, `AC-05`, `AC-09` | Test fail / auth bypass |
| `STEP-08` | `app/admin/jobs/job-postings/**` | Editor shell + list page gọi API backend qua wrapper. KHÔNG có save/publish button nếu chưa có API; nếu đã có, route qua handlers của STEP-07. | `AC-10` | UI error / mutate ngoài API |
| `STEP-09` | `tests/db/job-posting-authoring.integration.test.ts` + targeted unit tests | Cover create-or-reuse JobOpening + DRAFT, optimistic revision, publish/unpublish/archive matrix, RLS positive/negative, JSON allowlist rejection (image/iframe/script/style/code/unsafe link/oversize/deep/unknown), slug uniqueness + immutability, no raw HTML persistence. | `AC-04`..`AC-12` | Test fail / isolation thiếu |
| `STEP-10` | Vitest integration registration nếu test DB mới cần đăng ký; gate evidence | Self-review full-surface; chạy `npx prisma validate`, `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration tests/db/job-posting-authoring.integration.test.ts`. | tất cả AC | Gate fail |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `prisma validate` PASS sau khi thêm additive fields. | `npx prisma validate` (chạy từ worktree tại freeze commit) |
| `AC-02` | Migration preview không chứa DROP TABLE / DROP COLUMN / RENAME / ALTER COLUMN TYPE; chỉ ADD COLUMN nullable + DEFAULT. | `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` rồi `rg -F "DROP COLUMN" / "DROP TABLE" / "RENAME COLUMN" / "ALTER COLUMN" "DROP NOT NULL"` = 0 hit; nếu có phải đối chiếu và chứng minh safe. |
| `AC-03` | Backend reject JSON payload chứa node ngoài allowlist (`image`, `iframe`, `video`, `codeBlock`, `html`/`script`/`style` raw). | `npm run test:unit` (suite `src/shared/content/job-posting-rich-text/**`); `npm run test:integration tests/db/job-posting-authoring.integration.test.ts` (route + service). |
| `AC-04` | Backend reject JSON vượt 64 KiB serialized, > 1.000 nodes, depth > 16, URL > 2.048 bytes, unknown `contentSchemaVersion`. | `npm run test:unit` + `npm run test:integration tests/db/job-posting-authoring.integration.test.ts`. |
| `AC-05` | Backend reject link protocol ngoài HTTPS (`javascript:`, `data:`, `file:`, protocol-relative). Renderer kiểm soát `target`/`rel`. | `npm run test:unit` + `npm run test:integration tests/db/job-posting-authoring.integration.test.ts`. |
| `AC-06` | Race/replay khi hai transaction đồng thời select slot trống → chỉ một JobOpening được tạo, transaction còn lại nhận reuse; không double-publish. | `npm run test:integration tests/db/job-posting-authoring.integration.test.ts` (test 2-transaction concurrency cho OD-P1A-06). |
| `AC-07` | Optimistic revision conflict: PATCH với revision cũ trả `STALE_VERSION`, không ghi. | `npm run test:integration tests/db/job-posting-authoring.integration.test.ts`. |
| `AC-08` | State machine matrix: `DRAFT→PUBLISHED` ok khi đủ điều kiện; `DRAFT→ARCHIVED` ok; `PUBLISHED→DRAFT` (unpublish) ok; `PUBLISHED→ARCHIVED` ok; từ `ARCHIVED` không có transition hợp lệ (terminal). | `npm run test:integration tests/db/job-posting-authoring.integration.test.ts`. |
| `AC-09` | RLS positive: ADMIN/HR_MANAGER/HR_STAFF được mutate; SALE/PM chỉ READ. RLS negative: anonymous/anon role bị chặn. | `npm run test:integration tests/db/job-posting-authoring.integration.test.ts` (SET LOCAL ROLE). |
| `AC-10` | UI Admin editor shell gọi API backend qua wrapper; KHÔNG có lệnh mutate nào ngoài API; raw HTML không xuất hiện trong payload persistence (test grep trên payload example fixtures). | `npm run typecheck && npm run lint`; `npm run test:unit` UI editor wrapper; `rg -F "dangerouslySetInnerHTML" app/admin/jobs/job-postings src/shared/ui/editor` không xuất hiện trên DB payload path. |
| `AC-11` | Slug uniqueness + immutability: cùng title sinh slug khác nhau (suffix unique); sau publish đầu tiên slug không đổi qua DRAFT revision; migration riêng được mở riêng nếu cần đổi slug. | `npm run test:integration tests/db/job-posting-authoring.integration.test.ts`. |
| `AC-12` | DTO list mở rộng không vỡ unit test hiện hữu (`tests/db/job-posting-list.service.test.ts` và `tests/db/public-detail.static.test.ts`). | `npm run test:unit -- src/domains/staffing/job-posting-list.service.test.ts`; `npm run test:unit -- src/domains/job-board/public-detail.static.test.ts`. |
| `AC-13` | `package.json` + `package-lock.json` chứa đúng 4 package `@tiptap/{react,pm,starter-kit,static-renderer}@3.31.3` + peer `@tiptap/core@3.31.3`; KHÔNG caret/tilde cho 4 package đó; KHÔNG có bản Tiptap thứ hai. | `npm list @tiptap/react@3.31.3 @tiptap/pm@3.31.3 @tiptap/starter-kit@3.31.3 @tiptap/static-renderer@3.31.3 @tiptap/core@3.31.3 --depth=0`; `rg -F "\"~\"" package.json` không xuất hiện ở 4 entry trên. |
| `AC-14` | `CandidateSubmission` KHÔNG có field mới liên quan `jobPostingId`; intake writer service không tự thêm. | `rg -F "jobPostingId" prisma/schema.prisma src/domains/talent/intake-writer.service.ts` = 0 hit (kể cả trong diff của round này). |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-05`, `STEP-07`, `STEP-09` | `AC-06`, `AC-09` |
| `RQ-03` | `STEP-03`, `STEP-05`, `STEP-07`, `STEP-09` | `AC-03`, `AC-04`, `AC-05`, `AC-14` |
| `RQ-04` | `STEP-05`, `STEP-09` | `AC-11` |
| `RQ-05` | `STEP-05`, `STEP-07`, `STEP-09` | `AC-08`, `AC-09` |
| `RQ-06` | `STEP-04`, `STEP-08`, `STEP-10` | `AC-10`, `AC-13` |
| `RQ-07` | `STEP-03`, `STEP-05`, `STEP-09` | `AC-03`, `AC-04` |
| `RQ-08` | `STEP-05`, `STEP-09` | `AC-14` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Lỗi race khi hai transaction cùng select slot trống và tạo JobOpening. | DB-level anti-race qua transaction lock + idempotency key ở route. Test `AC-06` (2-tx concurrency). |
| `RISK-02` | Rich content bị bypass validator vào DB; render raw payload. | Server validates trước khi ghi; allowlist + limits + link protocol check ở `src/shared/content/job-posting-rich-text/**`; reject fail-closed. Test `AC-03..05`. |
| `RISK-03` | Drift version giữa 4 package Tiptap do lockfile không đồng bộ. | Pin exact `3.31.3` (không caret/tilde); `npm list --depth=0` ở gate. Test `AC-13`. |
| `RISK-04` | Tự ý fabricate `PUBLISHED` JobPosting từ `Project.isPublic`. | Forward-only ADD-only migration + gate `AC-02`; chính sách OD-P1A-05; explicit non-goal §1.2. |
| `RISK-05` | A1 đọc sai DTO vì A0 đổi shape đột ngột. | §4.3 Scope boundaries giữ list-service backward compatible; test `AC-12`. |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | Revision documentation-only v1.1: pin Tiptap `3.31.3` đồng bộ; lock OD-P1A-01..09; chốt wrapper boundary; status `PROPOSED_ONLY`, contract gate `DRAFT`, next gate `T0_CONTRACT_REVIEW`. Chưa vào `READY_TO_CODE`. | Bản 39c7ebc có Build vs Adopt dùng `~2.2.0` (lệch version so với pin OD-P1A-01 = `3.31.3`); thiếu section `### 3.1` với License/Version/source/Wrapper boundary; thiếu wrapper boundary rõ ràng; chưa đóng 9 OD; READY_FOR_EXECUTION cùng READY_TO_CODE không đúng với trạng thái proposal; cần revision để bám Pipeline V2. Round này KHÔNG code. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-24` | Initial contract at planning commit `39c7ebc` | Initial |
| `v1.1` | `2026-09-24` | Revision documentation-only theo Pipeline V2 (`a2ff3478`) + OD-P1A-01..09: `Build vs adopt` = `ADOPT` với 4 package Tiptap pinned exact `3.31.3` MIT (bỏ `~2.2.0`); bổ sung section `### 3.1 Build vs Adopt` (License/Version/source/Wrapper boundary/Reason); bổ sung wrapper boundary `src/shared/ui/editor/**` + `src/shared/content/job-posting-rich-text/**`; lock state machine `DRAFT ↔ PUBLISHED → ARCHIVED`; lock rich-content allowlist (nodes + marks + link protocol + limits); chốt schema additive fields (`title`, `salaryDisplay`, `descriptionJson`, `requirementsJson`, `benefitsJson`, `applicationInstructionsJson`, `contentSchemaVersion`); chốt forward-only ADD-only migration (không DROP/RENAME/fabricate PUBLISHED); chốt create-or-reuse JobOpening từ StaffingOrderSlot (OD-P1A-06); chốt canonical slug `<normalized-title>-<stable-short-suffix>` (OD-P1A-07); chốt `CandidateSubmission` KHÔNG có `jobPostingId` mới (OD-P1A-09); đổi Status `PROPOSED_ONLY`, Contract gate `DRAFT`, Next gate `T0_CONTRACT_REVIEW`; Audit reason ghi rõ risk acceptance của T0. Không code/install/migration/runtime. | Correction documentation-only per OD-P1A-01..09 + V2 contract gate |
