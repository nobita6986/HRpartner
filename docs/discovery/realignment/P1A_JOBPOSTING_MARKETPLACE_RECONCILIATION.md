# P1-A0/A1 JobPosting & Marketplace Reconciliation

| Field | Value |
|---|---|
| Spec version | v1.1 |
| Decision state | CLOSED |
| Status | PROPOSED_ONLY |
| Next gate | T0_CONTRACT_REVIEW |
| Contract gate | DRAFT |
| Baseline | 39c7ebc8ed8c6ca8a2384ed4c0c827f1034edd92 |
| Delivery protocol | V2_FAST_FREEZE |
| Correction budget | 1 |
| Test environment | NOT_REQUIRED (round này chỉ chuẩn bị contract; chưa chạm code/test/runtime) |
| Planner | Tier 1A |
| Scope lần này | Documentation-only revision; KHÔNG code, KHÔNG install, KHÔNG migration, KHÔNG PR |

## 1. Mục đích
Tài liệu này xác nhận hiện trạng của kiến trúc đăng tuyển việc làm (Job Marketplace), làm rõ khoảng cách giữa thiết kế mô hình (`JobPosting`) và code thật đang chạy, từ đó định hình phạm vi cho hai task P1-A0 và P1-A1. Bản v1.1 là revision documentation-only của planning commit `39c7ebc` để bám sát Pipeline V2 (`a2ff3478`) và 9 quyết định Owner đã chốt vòng 24/09.

## 2. Capability Matrix Hiện Tại

| Capability / Bề mặt | Status | Bằng chứng (File path / Model) |
|---|---|---|
| Schema: `JobOpening` & `JobPosting` | IMPLEMENTED | `prisma/schema.prisma:464-507` (`JobOpening`, `JobPosting`). |
| RLS: `JobPosting` | IMPLEMENTED | Phase 2 RLS đã bật + FORCE trên `job_postings` (migration `20260908001_job_opening_posting_split`). |
| Giao diện Admin: Quản lý JobPosting | READ_ONLY_SHELL | `app/admin/jobs/job-postings/page.tsx` và `[id]/page.tsx`; service `src/domains/staffing/job-posting-list.service.ts` chỉ SELECT. |
| Core Service: Tạo / Sửa / Publish `JobPosting` | MISSING | Không có `job-posting-authoring.service.ts`. `src/domains/job-board/publish.service.ts` chỉ bật `Project.isPublic`. |
| Rich content (description/requirements/benefits/applicationInstructions) | MISSING | `JobPosting` schema chỉ có `status/slug/revision`; không có cột content. UI04d detail đang dùng `src/domains/job-board/fixtures/detail-sections.fixture.ts`. |
| Public API: Danh sách việc làm (`/viec-lam`) | IMPLEMENTED (SAI NGUỒN) | `app/(jobs)/viec-lam/page.tsx` + `src/domains/job-board/public.service.ts` đọc từ `Project`/`StaffingOrderSlot`, bỏ qua `JobPosting`. |
| Public API: Chi tiết việc làm (`/viec-lam/[slug]`) | IMPLEMENTED (SAI NGUỒN) | `getPublicJobDetail` tại `src/domains/job-board/public.service.ts:710` đọc `Project.code` làm slug. |
| Apply intake | PARTIAL | Legacy `/api/jobs/apply` = deterministic 410 (`app/api/jobs/apply/route.ts`); canonical anon = `/api/public/jobs/[slug]/applications` qua SECURITY DEFINER RPC. Staff intake = `/api/admin/intake/staff` (auth path). |
| Test: JobPosting CRUD & Publish | MISSING | Chưa có `tests/db/job-posting-authoring.integration.test.ts`. |

## 3. Dependency A0 → A1
- **A1 (Public)** phụ thuộc trực tiếp vào **A0 (Admin)** ở lớp Schema, content payload shape, status machine và shared rich-text profile. Cụ thể:
  - Schema additive (title/salaryDisplay/descriptionJson/requirementsJson/benefitsJson/applicationInstructionsJson/contentSchemaVersion) — chỉ A0 tạo.
  - State transition `DRAFT ↔ PUBLISHED ↔ ARCHIVED` — chỉ A0 chốt, A1 chỉ consume.
  - Shared rich-text profile + static renderer wrapper — A0 tạo, A1 chỉ consume.
- Hai executor không được đồng thời sửa `prisma/schema.prisma`, `package.json` hay `package-lock.json` (OD-P1A-06 + Tier 1 decision).
- A1 chuẩn bị pure UI projection/tests song song sau khi DTO/shared profile của A0 freeze.
- A1 KHÔNG integrate / cut over public source trước khi A0 merge và có ít nhất một real `PUBLISHED` JobPosting.

## 4. Owner Decisions — Locked (OD-P1A-01..09)

| ID | Decision | Status | Materialized in |
|---|---|---|---|
| `OD-P1A-01` | ADOPT Tiptap OSS (MIT, không Cloud/Collaboration/AI/paid). Pin đồng bộ `3.31.3` cho `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/static-renderer` (và peer bắt buộc `@tiptap/core@3.31.3`). KHÔNG tự xây contentEditable. | CHOSEN | TASK A0 §3.1, §4.2; reconciliation §6 evidence (npm view 2026-09-24) |
| `OD-P1A-02` | Wrapper boundary: `src/shared/ui/editor/**` (client wrapper) + `src/shared/content/job-posting-rich-text/**` (server-side schema + validator + static renderer). A0 và A1 không tự tạo hai allowlist khác nhau. | CHOSEN | TASK A0 §4.2; TASK A1 §4.2 |
| `OD-P1A-03` | Rich content chỉ áp dụng cho `description`, `requirements`, `benefits`, `applicationInstructions`. Structured columns (`title`, `salaryDisplay`, `slug`, `status`, `revision`, filter/sort fields, project/opening/slot identifiers) tách riêng. Canonical persistence = Tiptap/ProseMirror JSON + `contentSchemaVersion = 1`. Server validates trước khi ghi DB; invalid/unknown node hoặc mark REJECT khi write, không silently accept. Corrupted legacy payload khi public read → fail closed / omit section + diagnostic an toàn, KHÔNG render raw payload. Initial node allowlist = `doc`, `paragraph`, `text`, `heading` (level 2 hoặc 3), `bulletList`, `orderedList`, `listItem`. Initial mark allowlist = `bold`, `italic`, `link`. Link chỉ HTTPS, không `javascript:` / `data:` / `file:` / protocol-relative. `target`/`rel` do HRP renderer kiểm soát. Limits: tối đa 64 KiB UTF-8 serialized JSON / rich field, ≤ 1.000 nodes, depth ≤ 16, URL ≤ 2.048 bytes. | CHOSEN | TASK A0 §4.1, §4.3; TASK A1 §4.1, §4.3 |
| `OD-P1A-04` | Server render public detail dùng `@tiptap/static-renderer` qua HRP wrapper trong `src/shared/content/job-posting-rich-text/**`. KHÔNG khởi tạo React editor trên server. KHÔNG `dangerouslySetInnerHTML` với dữ liệu DB chưa qua shared validator/renderer. KHÔNG phát minh package tên “safe-render”/“safe renderer” — đó là HRP wrapper dùng shared profile + `@tiptap/static-renderer`. | CHOSEN | TASK A1 §4.2, §5 STEP-04 |
| `OD-P1A-05` | KHÔNG chạy blind data migration từ `Project.isPublic` sang `PUBLISHED` JobPosting. Production hiện có 21 ACTIVE + isPublic Projects, 0 JobOpening, 0 JobPosting (read-only preflight 2026-09-24). Mô hình cũ = 1 public card trên Project; mô hình mới = JobPosting gắn JobOpening. KHÔNG tự chọn mapping hoặc tự publish dữ liệu suy diễn. A0 chỉ làm forward-only additive schema + authoring path. Public legacy flow giữ nguyên cho tới khi A1 đạt cutover gate. Migration KHÔNG làm biến mất 21 tin cũ. | CHOSEN | TASK A0 §4.3 (Migration/rollback), §6 AC; reconciliation §7 |
| `OD-P1A-06` | A0 phải tạo được dữ liệu thật (không hoạt động chỉ khi DB đã có sẵn JobOpening). Vertical slice A0 phải bao gồm create-or-reuse JobOpening từ StaffingOrderSlot được Admin chọn: lock canonical slot trong transaction; nếu slot đã có `jobOpeningId` thì reuse; nếu chưa thì tạo `JobOpening` DRAFT và bind lại slot; tạo/reuse đúng một `JobPosting` DRAFT cho JobOpening; chống race và replay; KHÔNG chọn ngẫu nhiên StaffingOrder/Slot; KHÔNG auto-publish. | CHOSEN | TASK A0 §5 STEP-02, §6 AC |
| `OD-P1A-07` | Canonical JobPosting slug pattern = `<normalized-title>-<stable-short-suffix>` (slug unique, immutable sau publish đầu tiên, trừ migration riêng). KHÔNG dùng duy nhất `Project.code` vì một Project có thể có nhiều JobOpening/JobPosting. Legacy `/viec-lam/PRJ-xxx`: trước A1 cutover giữ nguyên flow hiện tại; sau cutover, route compatibility chuyển tới listing đã lọc theo project code; KHÔNG tự chọn một posting bất kỳ khi Project có nhiều posting; KHÔNG 301/308 tới một detail mơ hồ. | CHOSEN | TASK A0 §4.1, §5; TASK A1 §4.1, §6 AC |
| `OD-P1A-08` | State transitions: `DRAFT → PUBLISHED`, `PUBLISHED → DRAFT` (explicit unpublish), `DRAFT → ARCHIVED`, `PUBLISHED → ARCHIVED`. `ARCHIVED` là terminal trong slice này. Publish yêu cầu: JobOpening hợp lệ; title hợp lệ; canonical slug; required rich fields hợp lệ; revision match; authorization/RLS pass. | CHOSEN | TASK A0 §4.3 (Data/state), §4.1 RQ |
| `OD-P1A-09` | A1 KHÔNG được bịa persistence `JobPostingId` vào `CandidateSubmission`. Current intake contract chỉ có canonical `slotId`/`projectId` và `jobOpeningId` dạng audit metadata (xem `src/domains/talent/intake-writer.service.ts` + `app/api/admin/intake/staff/route.ts` body schema: `slotId`/`projectId`/`jobOpeningId?` optional). A1 phải: derive `projectId`/`slotId`/`jobOpeningId` server-side từ `PUBLISHED` JobPosting qua canonical `/api/public/jobs/[slug]/applications` route; KHÔNG tin IDs do browser tự truyền; dùng current intake boundary; KHÔNG thêm `CandidateSubmission.jobPostingId` trong A1; nếu cần persisted attribution tới JobPosting, phải mở task additive riêng sau P1-A1. | CHOSEN | TASK A1 §4.1, §4.3, §6 AC |

## 5. Open Questions
None.

## 6. BUILD_VS_ADOPT Evidence (2026-09-24, read-only)

| Package | Version | License | Source |
|---|---|---|---|
| `@tiptap/react` | `3.31.3` | MIT | `npm view @tiptap/react@3.31.3 version license peerDependencies --json` (peer: `react ^17..19`, `@tiptap/pm 3.31.3`, `@tiptap/core 3.31.3`, `@types/react ^17..19`) |
| `@tiptap/pm` | `3.31.3` | MIT | `npm view @tiptap/pm@3.31.3 version license --json` |
| `@tiptap/starter-kit` | `3.31.3` | MIT | `npm view @tiptap/starter-kit@3.31.3 version license --json` |
| `@tiptap/static-renderer` | `3.31.3` | MIT | `npm view @tiptap/static-renderer@3.31.3 version license --json` |
| `@tiptap/core` (peer bắt buộc) | `3.31.3` | MIT | `npm view @tiptap/core@3.31.3 version license --json` |

Notes:
- Pin EXACT, không caret/tilde. Manifest + lockfile phải đồng bộ.
- Wrapper thuộc HRP: `src/shared/ui/editor/**` (client editor wrapper), `src/shared/content/job-posting-rich-text/**` (shared schema/profile, validator, server static renderer). Vendor API KHÔNG lan trực tiếp vào domain.
- KHÔNG dùng Tiptap Cloud, Collaboration, AI, paid extensions trong slice đầu.
- KHÔNG npm install trong vòng correction documentation-only này; phần install thuộc round implementation.

## 7. Legacy data posture (OD-P1A-05 + OD-P1A-07)
- Read-only T0 preflight ghi nhận production hiện có 21 ACTIVE + isPublic Projects, 0 JobOpening, 0 JobPosting. Do mô hình cũ là một public card/detail trên `Project` còn mô hình mới là `JobPosting` gắn `JobOpening`, KHÔNG được tự chọn mapping hoặc tự publish dữ liệu suy diễn.
- A0 migration: forward-only ADD-only (`JobPosting` thêm cột content + additive fields). KHÔNG DROP column, KHÔNG rename, KHÔNG fabricate `PUBLISHED` content. Existing rows với `status='DRAFT'`/empty content giữ nguyên cho tới khi Admin soạn bản nháp mới.
- A1 không tự động promote bất kỳ Project nào thành JobPosting. Public legacy flow giữ nguyên cho tới cutover gate.
- `/viec-lam/PRJ-xxx` legacy: trước A1 cutover giữ flow hiện tại (đọc `Project.code` qua `src/domains/job-board/public.service.ts`); sau cutover route compatibility chuyển tới listing đã lọc theo project code; KHÔNG chọn một posting bất kỳ khi Project có nhiều posting; KHÔNG 301/308 tới detail mơ hồ.

## 8. Dependency / Execution Order (Tier 1 + OD-P1A-06)

1. **A0 implementation** đi trước:
   - `prisma/schema.prisma` additive fields.
   - Một forward-only migration.
   - `package.json` + `package-lock.json` chốt 4 package Tiptap pinned `3.31.3`.
   - `src/shared/ui/editor/**` + `src/shared/content/job-posting-rich-text/**` (shared profile + validator + server static renderer).
   - `src/domains/staffing/job-posting-authoring.service.ts` (create-or-reuse JobOpening từ selected StaffingOrderSlot, create/reuse DRAFT JobPosting, optimistic revision, publish/unpublish/archive, slug generator).
   - `src/domains/staffing/job-posting-list.service.ts` (mở rộng DTO nếu cần).
   - `app/api/admin/jobs/job-postings/**` + `app/admin/jobs/job-postings/**` + targeted tests.
   - Vitest integration registration nếu test DB mới cần đăng ký.

2. **A1**:
   - Chuẩn bị pure UI projection + tests song song SAU KHI DTO/shared profile A0 freeze.
   - KHÔNG integrate / cut over public source trước khi A0 merge và có ít nhất một real `PUBLISHED` JobPosting.
   - KHÔNG đồng thời sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`.
   - KHÔNG sửa schema.

3. Hai executor A0 và A1 không được đồng thời sở hữu:
   - `prisma/schema.prisma`
   - `package.json`
   - `package-lock.json`

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | Revision documentation-only → bám Pipeline V2 (`a2ff3478`) + 9 OD chốt vòng 24/09. Status `PROPOSED_ONLY`, Contract gate `DRAFT`, Decision state `CLOSED`, Spec v1.1. | Bản 39c7ebc có semantic lệch: Build vs Adopt = `~2.2.0` sai version; thiếu section `### 3.1`; thiếu wrapper boundary rõ ràng; chưa đóng OD-P1A-01..09; READY_FOR_EXECUTION cùng READY_TO_CODE không đúng với trạng thái proposal. Correction này chỉ chuẩn bị contract, KHÔNG code. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-24` | Initial contract at planning commit `39c7ebc` | Initial |
| `v1.1` | `2026-09-24` | Revision documentation-only theo Pipeline V2 (`a2ff3478`) + OD-P1A-01..09: khóa Build vs Adopt = `ADOPT` với 4 package Tiptap OSS pinned `3.31.3` MIT (bỏ `~2.2.0`); bổ sung wrapper boundary `src/shared/ui/editor/**` + `src/shared/content/job-posting-rich-text/**`; lock state machine `DRAFT ↔ PUBLISHED → ARCHIVED`; lock rich-content allowlist (nodes + marks + link protocol + limits); lock server render qua `@tiptap/static-renderer` + shared HRP wrapper; lock forward-only migration (không DROP / không fabricate PUBLISHED từ Project.isPublic); lock create-or-reuse JobOpening từ StaffingOrderSlot; lock canonical slug `<normalized-title>-<stable-short-suffix>` và route compatibility cho `/viec-lam/PRJ-xxx`; lock A1 KHÔNG thêm `CandidateSubmission.jobPostingId` (dùng current intake boundary + derive server-side); đổi Status về `PROPOSED_ONLY`, Contract gate `DRAFT`, Next gate `T0_CONTRACT_REVIEW`; A1 đổi Assurance lane `CRITICAL`. Chỉ chuẩn bị contract, không code/install/migration/runtime. | Correction documentation-only per OD-P1A-01..09 + V2 contract gate |
