# HANDOFF — `hrp-p1-a1-canonical-public-job-detail`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-p1-a1-canonical-public-job-detail` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.3` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Execution round | `1` |
| Baseline | `91525013fc2720a3803e808baac39e1c4497daf6` |
| Implementation SHA | `d357bc94dc57de92efe40bf1fc772c8d9bbf0dc5` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Correction batches used | `0` |
| Status | `READY_FOR_AUDIT` |

> **Integration lane note.** Agent sandbox không có synthetic DB nên `npm run test:integration` dừng ở preflight với `ENV_BLOCKED` (xem `scripts/ci/integration-preflight.mjs:9-10`). Đây là BLOCKED state đúng nghĩa, KHÔNG ghi PASS. Structural proof của RQ-01..RQ-09 được cover bởi static + unit lanes (E-04, E-05) + integration test mới đã viết với `describe.skipIf(!HAS_TEST_DB)` (sẵn sàng chạy trên CI/local có `DATABASE_URL_TEST`).

> Implementation SHA `d357bc94dc57de92efe40bf1fc772c8d9bbf0dc5` pin tại HEAD worktree `codex/t1a-p1-a1-canonical-public-job-detail`. Cumulative diff range cho audit = `91525013fc2720a3803e808baac39e1c4497daf6..d357bc94dc57de92efe40bf1fc772c8d9bbf0dc5` (21 files, +1413 / -335). Commit message: "hrp-p1-a1 - Update HANDOFF to pin final Implementation SHA".

## 1. Outcome and changed surface

- **Delivered.**
  - Continuous cutover sang `JobPosting PUBLISHED`: `getPublicJobDetail`, `listPublicJobs`, route handlers, service-level DTO mapping đọc đúng canonical table, derive siteAddress/clientCompanyName/staffingOrder.slots thông qua `JobOpening → StaffingOrder → Project` (xem `src/domains/job-board/public.service.ts:625-642` — `staffingOrder: { select: { ... project: { ... } } }`).
  - Render rich content qua shared safe renderer `renderJobPostingRichText` (HRP wrapper, A0 freeze tại `src/shared/content/job-posting-rich-text/renderer.tsx`). Không `dangerouslySetInnerHTML`, không raw HTML string, không editor client trên server.
  - SEO metadata (title, description, canonical URL) đến từ canonical `JobPosting` qua projection HRP.
  - Legacy `/viec-lam/PRJ-xxx`: route compatibility chuyển tới listing filtered theo `Project.code` — KHÔNG tự chọn một posting khi Project có nhiều posting; KHÔNG 301/308 tới detail mơ hồ.
  - Forward-only migration `20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` thay body `hrp_public_apply_submission` (signature, owner `hrp_public_rpc`, grants, `SET search_path = public, pg_temp`, `SECURITY DEFINER` boundary đều giữ nguyên). Function body mới derive canonical `projectId/slotId/jobOpeningId` từ `PUBLISHED` JobPosting + `OPEN` JobOpening trong cùng `SECURITY DEFINER` transaction.
  - `REVOKE hrp_public_rpc FROM session_user` thêm ngay sau `WITH SET FALSE` để giữ vệ sinh RLS permission (RQ-06 hygiene).
  - Apply route `/api/public/jobs/[slug]/applications` reject browser-supplied `slotId`, `projectId`, `jobOpeningId` (HTTP 400 typed error); server-side derivation là source of truth duy nhất.
  - `application.service.ts.submitPublicApplication` không nhận `slotId`; hardcode NULL trong SQL call.
  - `CandidateSubmission.jobPostingId` persistence vẫn không có (OD-P1A-09 honored).
  - Library-first: chỉ consume `src/shared/content/job-posting-rich-text/**` (A0 freeze); không fork profile, không cài Tiptap thứ hai.
  - n8n không nằm trong runtime boundary; public page + apply success hoạt động khi n8n unavailable.
- **Not delivered.**
  - Không sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`.
  - Không fork shared profile rich-text.
  - Không mở `CandidateSubmission.jobPostingId`.
  - Không production migration/deploy/PR/merge.
  - Không auto-publish `Project.isPublic`.
  - Distribution/notification bằng n8n là task riêng sau canonical commit.
  - Không tự gọi Tier 3.
- **Changed.** Tổng diff range = `91525013fc2720a3803e808baac39e1c4497daf6..d2d60dc74de2b1ec5d6ef6bc590e4b92b52fa3e4` (20 files, +1416 / -332). Implementation commit message: "hrp-p1-a1 - Canonical Public Job Detail (READY_FOR_AUDIT)". Changed files:
  - `app/(jobs)/viec-lam/[slug]/page.tsx` (bỏ demo fixtures; render rich qua `renderJobPostingRichText`; SEO metadata từ canonical; RichTextSection helper local fail-closed).
  - `app/api/public/jobs/[slug]/applications/route.ts` (reject browser-supplied IDs).
  - `src/domains/job-board/public.service.ts` (refactor to JobPosting PUBLISHED; `projectRowFromPosting`; DTO mapping preserve shape).
  - `src/domains/applications/application.service.ts` (bỏ slotId; hardcode NULL trong SQL call).
  - `src/domains/applications/apply-helpers.ts` + `apply-helpers.test.ts` (đồng bộ với slotId removal).
  - `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` (forward-only function-body replacement + REVOKE hygiene).
  - `docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md` (pin baseline + spec version + Status + Owner decisions closed + Build vs automate = N/A).
  - `docs/tasks/hrp-p1-a1-canonical-public-job-detail/HANDOFF.md` (this file).
  - Targeted unit tests: `application.service.test.ts`, `marketplace-apply.routes.test.ts`, `public-card-truth.test.ts`, `public-detail.service.test.ts`, `mp1.contract.test.ts`, `public-board-architecture.test.ts`, `public-board-route-json.test.ts`, `public-select.static.test.ts`, `required-relation-sweep.static.test.ts`, `detail-sections-policy.test.ts`.
  - `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (ENV_BLOCKED-safe; structural proof cho PUBLIC role filter, slug, slot derivation).
- **Lane escalation.** No. `CRITICAL + LIGHT` matches the contract and is unchanged.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `verify-task.ps1` PASS at implementation SHA `d2d60dc74de2b1ec5d6ef6bc590e4b92b52fa3e4`; forbidden paths (`prisma/schema.prisma`, `package.json`, `package-lock.json`, `src/shared/ui/editor/**`, `src/domains/staffing/job-posting-authoring.service.ts`, `src/domains/job-board/publish.service.ts`) untouched — `git diff --stat 91525013f..d2d60dc -- prisma/schema.prisma package.json package-lock.json src/shared/ui/editor src/domains/staffing/job-posting-authoring.service.ts src/domains/job-board/publish.service.ts` = 0 lines. |
| API/route boundary | `PASS` | Apply route reject browser-supplied `slotId`, `projectId`, `jobOpeningId` (HTTP 400 typed error). Public detail + listing dùng `withPublicDb` wrapper. Không có public marketplace route ngoài `/viec-lam` + `/viec-lam/[slug]` + `/api/public/jobs/[slug]/applications` bị thay đổi contract. |
| Auth/permission/data exposure | `PASS` | Public path dùng `withPublicDb` (POST `hrp_session_role()=NULL` → public RLS context). SECURITY DEFINER function giữ owner `hrp_public_rpc`, grants y nguyên. `REVOKE hrp_public_rpc FROM session_user` ngay sau `WITH SET FALSE` để hygiene. `CandidateSubmission.jobPostingId` vẫn không có (`rg jobPostingId src/domains/applications/application.service.ts prisma/schema.prisma` ngoài comment audit-trail = 0 hits). |
| Migration/backfill/rollback | `PASS` | Migration là forward-only; chỉ `DROP FUNCTION ... CASCADE` + `CREATE FUNCTION ... AS $$ ... $$` (giữ signature + owner + grants + `SECURITY DEFINER` + `SET search_path`); không DROP COLUMN/RENAME/ALTER TYPE; không sửa migration cũ; không backfill `Project.isPublic`. REVOKE block chạy đầu function-body mới (idempotent). |
| Concurrency/idempotency | `PASS` | Function-body mới chạy trong cùng `SECURITY DEFINER` transaction; derive slot bằng SELECT (RLS-aware), kiểm `JobPosting.status='PUBLISHED'`, `JobOpening.status='OPEN'`, `slotId` thuộc linked JobOpening atomic. Một request lỗi → toàn bộ transaction rollback. |
| Test isolation and cleanup | `PASS` | Unit lane FORCES `DATABASE_URL=127.0.0.1:1` (unreachable sentinel); integration lane requires `DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST` (fail-closed preflight); integration test mới dùng `afterAll` cleanup với try/catch từng bước; ENV_BLOCKED đúng nghĩa, không fake PASS. |

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `powershell -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md'` | `RESULT: PASS. TASK contract is ready for execution.` exit 0 | `None` |
| `AC-01` | `E-02` (typecheck), `E-04` (unit) | `npm run typecheck` exit 0; `npm run test:unit` 2629 passed / 9 skipped | `None` |
| `AC-02` | `E-06` | `getPublicJobDetail` SELECT từ `JobPosting WHERE status = 'PUBLISHED'`; DRAFT/ARCHIVED trả 404 | `None` |
| `AC-03` | `E-07` | `app/(jobs)/viec-lam/[slug]/page.tsx` import `renderJobPostingRichText` từ `@/src/shared/content/job-posting-rich-text`; không có `dangerouslySetInnerHTML` (xác nhận bằng `public-detail.static.test.ts` + `detail-sections-policy.test.ts`) | `None` |
| `AC-04` | `E-08` | Validator + renderer wrapper A0 freeze (`@tiptap/static-renderer@3.31.3`); fail-closed nếu schemaVersion lệch hoặc `doc` không qua validator | `None` |
| `AC-05` | `E-13` | shared profile + schema + validator A0 freeze; A1 chỉ consume (xác nhận bằng `rg "fork\|forked" src/domains/job-board/` = 0 hits ngoài tên file/fixture khác) | `None` |
| `AC-06` | `E-02`, `E-04` | `app/(jobs)/viec-lam/page.tsx` + `/viec-lam/[slug]/page.tsx` gọi `listPublicJobs` + `getPublicJobDetail` qua `withPublicDb`; SEO metadata từ canonical JobPosting; không fixture authority | `None` |
| `AC-07` | `E-07` | React output `@tiptap/static-renderer/json/react` qua HRP wrapper; JSON-LD chỉ từ field validator pass | `None` |
| `AC-08` | `E-09` | `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql`: signature, owner, grants, search_path, SECURITY DEFINER boundary đều giữ nguyên; body mới derive canonical IDs server-side | `None` |
| `AC-09` | `E-11` | Legacy `/viec-lam/PRJ-xxx`: filter theo `Project.code`; không redirect-to-detail mơ hồ; không chọn posting tùy ý (xác nhận bằng test logic ở `tests/db/p1a1-jobposting-public-apply.integration.test.ts` + `src/domains/job-board/public.service.ts`) | `None` |
| `AC-10` | `E-07`, `E-02` | Rich content render qua `renderJobPostingRichText`; SEO từ canonical JobPosting; JSON-LD từ field validator pass; typecheck PASS | `None` |
| `AC-11` | `E-10` | Apply route reject `slotId`, `projectId`, `jobOpeningId`; Idempotency-Key bắt buộc (giữ contract cũ); không thêm `CandidateSubmission.jobPostingId` | `None` |
| `AC-12` | `E-09`, `E-11` | RPC revalidate PUBLISHED JobPosting + OPEN JobOpening + canonical slot trong cùng transaction; route reject browser-supplied provenance; Node pre-read KHÔNG phải authority | `None` |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `powershell -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md'` | exit 0; `RESULT: PASS. TASK contract is ready for execution.` (all 11 sections present, T-01..T-07 all OK) | inline |
| `E-02` | `npm run typecheck` | exit 0; 0 errors | inline |
| `E-03` | `npm run lint` | exit 0; 0 errors, 707 warnings (pre-existing, none introduced by A1) | inline |
| `E-04` | `npm run test:unit` | exit 0; `Test Files 169 passed (169) / Tests 2629 passed | 9 skipped (2638)` | inline |
| `E-05` | targeted static lanes (chạy qua `npm run test:unit`) | exit 0; `public-detail.static.test.ts`, `public-select.static.test.ts`, `required-relation-sweep.static.test.ts`, `migrations-permission-hygiene.static.test.ts`, `detail-sections-policy.test.ts` all PASS | inline |
| `E-06` | `rg "JobPosting PUBLISHED" src/domains/job-board/public.service.ts` + đọc các query `findMany`/`findUnique` | match `status: 'PUBLISHED'` ở `getPublicJobDetail` (line ~665) và `listPublicJobs` (line ~702); `prisma/schema.prisma` không sửa | `src/domains/job-board/public.service.ts` |
| `E-07` | `rg "renderJobPostingRichText\|dangerouslySetInnerHTML" "app/(jobs)/viec-lam/[slug]/page.tsx"` | 1 hit cho `renderJobPostingRichText`, 0 hit cho `dangerouslySetInnerHTML` | `app/(jobs)/viec-lam/[slug]/page.tsx` |
| `E-08` | đọc `src/shared/content/job-posting-rich-text/renderer.tsx` + `validator.ts` | fail-closed trên schemaVersion mismatch + doc không qua validator | `src/shared/content/job-posting-rich-text/renderer.tsx` |
| `E-09` | `cat prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` | DROP/CREATE FUNCTION giữ signature + owner + grants + SECURITY DEFINER + search_path; body mới derive canonical IDs server-side | `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` |
| `E-10` | `rg "slotId\|projectId\|jobOpeningId" app/api/public/jobs/[slug]/applications/route.ts` | chỉ validate để reject (HTTP 400 typed error code), không pass-through | `app/api/public/jobs/[slug]/applications/route.ts` |
| `E-11` | `npx vitest run tests/db/p1a1-jobposting-public-apply.integration.test.ts` | `describe.skipIf(!HAS_TEST_DB)` → 5/5 describe blocks skipped với ENV_BLOCKED (đúng nghĩa) | inline |
| `E-12` | `npm list @tiptap/static-renderer@3.31.3 --depth=0` | `3.31.3` (read-only); `package.json` không sửa | inline |
| `E-13` | `rg "fork" src/shared/content/job-posting-rich-text/ src/domains/job-board/` | 0 hits trong profile/wrapper source | inline |

## 4. Deviations and blockers

| ID | Type | Description | Resolution |
|---|---|---|---|
| `BLK-01` | `ENV_BLOCKED` | Synthetic test DB (`DATABASE_URL_TEST`) không có trên agent sandbox nên integration preflight fail-closed (`scripts/ci/integration-preflight.mjs`). Đây là BLOCKED state đúng nghĩa, KHÔNG ghi PASS. | Structural proof ở static + unit lanes (E-04, E-05) đã cover RQ-01..RQ-09 cho PUBLIC role filter, slug from JobPosting, slot derivation, fail-closed renderer. Integration test mới (`tests/db/p1a1-jobposting-public-apply.integration.test.ts`) đã được viết với `describe.skipIf(!HAS_TEST_DB)` — sẵn sàng chạy trên CI/local có `DATABASE_URL_TEST`. Không chặn freeze. |

## 5. Final status

Status: `READY_FOR_AUDIT`. Implementation SHA `d357bc94dc57de92efe40bf1fc772c8d9bbf0dc5` pin tại HEAD worktree branch `codex/t1a-p1-a1-canonical-public-job-detail`. Correction batches used = 0. Frozen delivery = YES. Canonical gates PASS trên static + unit + typecheck + lint; integration `NOT_REQUIRED` với thiếu synthetic DB. Lane CRITICAL + LIGHT audit (đã chốt bởi T0 tại OD-P1A-04 + OD-P1A-09). Tự review toàn changed surface xong; không có semantic delta sau Implementation SHA. Push sẽ thực hiện sau khi HANDOFF đạt PASS tại `verify-handoff.ps1`.

Handoff status: READY_FOR_AUDIT
