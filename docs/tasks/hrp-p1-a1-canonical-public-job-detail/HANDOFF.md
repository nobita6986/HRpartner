# HANDOFF — `hrp-p1-a1-canonical-public-job-detail`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-p1-a1-canonical-public-job-detail` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.4` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Execution round | `2` |
| Baseline | `91525013fc2720a3803e808baac39e1c4497daf6` |
| Implementation SHA | `0ae001dd96e8c72c39a60b58f80aea6fcc2d306e` |
| Frozen delivery | `YES` |
| Canonical gates | `NOT_REQUIRED` |

> Canonical gates note. `NOT_REQUIRED` vì integration lane `BLOCKED` do thiếu synthetic DB. Static + unit + lint + typecheck + tiptap-pin đều PASS. Khi T0 cung cấp `DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST` thì promotion sang `PASS` (sau khi integration case 1..12 của C-05 chạy thật xanh). |
| Audit eligibility | `NOT_ELIGIBLE` (DB integration preflight fail-closed vì thiếu `DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST`; chỉ đạt `ELIGIBLE` sau khi T0 cung cấp synthetic DB và integration test chạy thật PASS). |
| Correction batches used | `1` |
| Status | `BLOCKED` (DB integration không chạy thật được trong agent sandbox — preflight fail-closed đúng nghĩa `ENV_BLOCKED`). Tier 3 chỉ mở sau khi DB integration PASS thật. |

> **Pin exact semantic Implementation SHA = `0ae001dd96e8c72c39a60b58f80aea6fcc2d306e`.** Hai commit docs-only HANDOFF pinning (`d357bc94dc57de92efe40bf1fc772c8d9bbf0dc5`, `915dd2737082ea5437232fdf6c9a56d61e710d10`) KHÔNG phải semantic implementation; chúng chỉ là docs/evidence freeze theo V2_FAST_FREEZE protocol.

> **Cumulative diff range = `91525013fc2720a3803e808baac39e1c4497daf6..915dd2737082ea5437232fdf6c9a56d61e710d10` = 20 files, +1410 / -332** (verified `git diff --stat 91525013f..915dd27`). Stale claim "21 files +1413/-335" và stale SHA `d2d60dc74de2b1ec5d6ef6bc590e4b92b52fa3e4` đã bị xóa khỏi HANDOFF.

> **Integration lane note.** Agent sandbox không có synthetic DB nên `npm run test:integration` dừng ở preflight với `ENV_BLOCKED` (xem `scripts/ci/integration-preflight.mjs`). Canonical preflight phải fail `ENV_BLOCKED` nếu thiếu `DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST` — KHÔNG dùng `describe.skipIf` để biến missing DB thành PASS/skip. Integration test mới (`tests/db/p1a1-jobposting-public-apply.integration.test.ts`) đã viết với `withPublicDb`/`DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST` để chạy thật khi synthetic DB được provision.

## 1. Outcome and changed surface

- **Delivered (semantic implementation = `0ae001dd96e8c72c39a60b58f80aea6fcc2d306e`).**
  - Continuous cutover sang `JobPosting PUBLISHED`: `getPublicJobDetail`, `listPublicJobs`, route handlers, service-level DTO mapping đọc đúng canonical table, derive siteAddress/clientCompanyName/staffingOrder thông qua `JobOpening → StaffingOrder → Project` (xem `src/domains/job-board/public.service.ts` — `staffingOrder: { select: { ... project: { ... } } }`). Public service CHỈ map linked `JobOpening.staffingOrderSlot` vào DTO, KHÔNG fetch toàn bộ `staffingOrder.slots` (C-02 atomic canonical slot).
  - Canonical slot join trong `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql`: chain `s.id = jo.staffing_order_slot_id AND s.staffing_order_id = jo.staffing_order_id AND s.job_opening_id = jo.id` — sibling slot trên cùng StaffingOrder bị reject; nếu chain thiếu hoặc drift thì fail closed.
  - Migration grant: `GRANT SELECT ON job_postings, job_openings TO hrp_public_rpc` (chỉ SELECT, không INSERT/UPDATE/DELETE). Function body wrap trong `BEGIN;` ... `COMMIT;` với pre/post assertions (predecessor function signature, role posture, required tables/columns, owner, prosecdef=true, proconfig chứa `search_path=public, pg_temp`, EXECUTE grants, dependency SELECTs).
  - Render rich content qua shared safe renderer `renderJobPostingRichText` (HRP wrapper, A0 freeze tại `src/shared/content/job-posting-rich-text/renderer.tsx`). Không `dangerouslySetInnerHTML`, không raw HTML string, không editor client trên server.
  - `RichTextSection` trong `app/(jobs)/viec-lam/[slug]/page.tsx`: invalid/corrupt/schema mismatch → trả `null` (omit section hoàn toàn), KHÔNG render raw payload, KHÔNG fallback placeholder text "Nội dung đang được cập nhật.". Diagnostic chỉ qua marker/log an toàn (C-07).
  - SEO metadata (title, description, canonical URL) đến từ canonical `JobPosting` qua projection HRP.
  - Legacy `/viec-lam/PRJ-xxx`: in-segment compatibility handler hiểu `PRJ-xxx` slug và render listing filter theo `Project.code` exact (query `project=<code>`); KHÔNG 301/308 redirect-to-detail; KHÔNG chọn posting tùy ý khi Project có nhiều posting (C-06).
  - Forward-only migration `20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` thay body `hrp_public_apply_submission` (signature, owner `hrp_public_rpc`, grants, `SET search_path = public, pg_temp`, `SECURITY DEFINER` boundary đều giữ nguyên). Function body mới derive canonical `projectId/slotId/jobOpeningId` từ `PUBLISHED` JobPosting + `OPEN` JobOpening trong cùng `SECURITY DEFINER` transaction, với canonical slot chain C-02.
  - `REVOKE hrp_public_rpc FROM session_user` ngay sau `WITH SET FALSE` để giữ vệ sinh RLS permission (RQ-06 hygiene).
  - Apply route `/api/public/jobs/[slug]/applications` reject browser-supplied `slotId`, `projectId`, `jobOpeningId` (HTTP 400 typed error); server-side derivation là source of truth duy nhất. RPC vẫn fail closed nếu bị gọi trực tiếp với slot không thuộc linked JobOpening (`JOB_NOT_AVAILABLE`/`P0011`). Comment về `p_slot_id` đã được reconcile (C-02): route không nhận, RPC chỉ nhận canonical linked slot hoặc NULL; input sai sẽ bị reject.
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
  - Không tự gọi Tier 3 (CHANGES_REQUIRED).
  - Integration test DB-touching lane (`tests/db/p1a1-jobposting-public-apply.integration.test.ts`): test đã viết với fixture chain đầy đủ và đăng ký trong `vitest.integration-files.ts`, nhưng CHƯA chạy thật được do agent sandbox thiếu synthetic DB. Status = `ENV_BLOCKED` đúng nghĩa, không fake PASS.
- **Changed.** Cumulative diff range = `91525013fc2720a3803e808baac39e1c4497daf6..915dd2737082ea5437232fdf6c9a56d61e710d10` = 20 files, +1410 / -332. Implementation commit message: "hrp-p1-a1 - Canonical Public Job Detail (READY_FOR_AUDIT)". Changed files:
  - `app/(jobs)/viec-lam/[slug]/page.tsx` (bỏ demo fixtures; render rich qua `renderJobPostingRichText`; SEO metadata từ canonical; RichTextSection helper local fail-closed; legacy PRJ-xxx in-segment handler).
  - `app/api/public/jobs/[slug]/applications/route.ts` (reject browser-supplied IDs).
  - `src/domains/job-board/public.service.ts` (refactor to JobPosting PUBLISHED; `projectRowFromPosting`; DTO mapping chỉ map linked `JobOpening.staffingOrderSlot`; sibling slot không xuất hiện trong DTO).
  - `src/domains/applications/application.service.ts` (bỏ slotId; hardcode NULL trong SQL call).
  - `src/domains/applications/apply-helpers.ts` + `apply-helpers.test.ts` (đồng bộ với slotId removal).
  - `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` (forward-only function-body replacement + canonical slot chain C-02 + `GRANT SELECT` C-03 + `BEGIN/COMMIT` + pre/post assertions).
  - `docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md` (bump v1.4: spec version + Status `ENV_BLOCKED` + Correction budget 1/1 + execution round 2 + file references chuẩn + C-02/C-03/C-04/C-05/C-06/C-07 acceptance criteria).
  - `docs/tasks/hrp-p1-a1-canonical-public-job-detail/HANDOFF.md` (this file).
  - Targeted unit tests: `application.service.test.ts`, `marketplace-apply.routes.test.ts`, `public-card-truth.test.ts`, `public-detail.service.test.ts`, `mp1.contract.test.ts`, `public-board-architecture.test.ts`, `public-board-route-json.test.ts`, `public-select.static.test.ts`, `required-relation-sweep.static.test.ts`, `detail-sections-policy.test.ts`.
  - `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (rewrite: `withPublicDb` + `DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST`; KHÔNG `DATABASE_URL_PUBLIC_TEST`; KHÔNG `describe.skipIf`; full chain ClientCompany→Project→StaffingOrder→2 Slots→2 Openings→2 Postings PUBLISHED/DRAFT/ARCHIVED; 12 behavior case C-05; migration upgrade + negative rollback proof; sibling slot isolation).
  - `vitest.integration-files.ts` (đăng ký `tests/db/p1a1-jobposting-public-apply.integration.test.ts`).
- **Lane escalation.** No. `CRITICAL + LIGHT` matches the contract and is unchanged.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `STATIC_PASS` | `verify-task.ps1` PASS trên TASK.md v1.4; forbidden paths (`prisma/schema.prisma`, `package.json`, `package-lock.json`, `src/shared/ui/editor/**`, `src/domains/staffing/job-posting-authoring.service.ts`, `src/domains/job-board/publish.service.ts`) untouched — `git diff --stat 91525013f..HEAD -- prisma/schema.prisma package.json package-lock.json src/shared/ui/editor src/domains/staffing/job-posting-authoring.service.ts src/domains/job-board/publish.service.ts` = 0 lines. |
| API/route boundary | `STATIC_PASS` | Apply route reject browser-supplied `slotId`, `projectId`, `jobOpeningId` (HTTP 400 typed error). Public detail + listing dùng `withPublicDb` wrapper. Không có public marketplace route ngoài `/viec-lam` + `/viec-lam/[slug]` + `/api/public/jobs/[slug]/applications` bị thay đổi contract. Legacy PRJ-xxx in-segment handler: filter theo `Project.code` exact, không redirect-to-detail. |
| Auth/permission/data exposure | `STATIC_PASS` | Public path dùng `withPublicDb` (POST `hrp_session_role()=NULL` → public RLS context). SECURITY DEFINER function giữ owner `hrp_public_rpc`, grants y nguyên. `REVOKE hrp_public_rpc FROM session_user` ngay sau `WITH SET FALSE` để hygiene. `GRANT SELECT ON job_postings, job_openings TO hrp_public_rpc` để RPC mới không permission-denied runtime (C-03). `CandidateSubmission.jobPostingId` vẫn không có (`rg jobPostingId src/domains/applications/application.service.ts prisma/schema.prisma` ngoài comment audit-trail = 0 hits). |
| Migration/backfill/rollback | `STATIC_PASS + DB_INTEGRATION_PENDING` | Migration là forward-only; `BEGIN/COMMIT`; chỉ `DROP FUNCTION ... CASCADE` + `CREATE FUNCTION ... AS $$ ... $$` (giữ signature + owner + grants + `SECURITY DEFINER` + `SET search_path`) + `GRANT SELECT` block + pre/post assertions. KHÔNG DROP COLUMN/RENAME/ALTER TYPE; không sửa migration cũ; không backfill `Project.isPublic`. REVOKE block chạy đầu function-body mới (idempotent). Negative rollback proof pending until synthetic DB provisioned. |
| Concurrency/idempotency | `STATIC_PASS + DB_INTEGRATION_PENDING` | Function-body mới chạy trong cùng `SECURITY DEFINER` transaction; derive slot bằng canonical chain `s.id = jo.staffing_order_slot_id AND s.staffing_order_id = jo.staffing_order_id AND s.job_opening_id = jo.id` (RLS-aware), kiểm `JobPosting.status='PUBLISHED'`, `JobOpening.status='OPEN'`, slotId thuộc linked JobOpening atomic. Một request lỗi → toàn bộ transaction rollback. |
| Test isolation and cleanup | `STATIC_PASS` | Unit lane FORCES `DATABASE_URL=127.0.0.1:1` (unreachable sentinel); integration lane requires `DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST` (fail-closed preflight); integration test mới KHÔNG dùng `describe.skipIf`; cleanup theo FK order, runId-scoped, không swallow exception, disconnect trong finally, cleanup fail → test fail. ENV_BLOCKED đúng nghĩa, không fake PASS. |

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `powershell -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md'` | `RESULT: PASS. TASK contract is ready for execution.` exit 0 | `None` |
| `AC-01` | `E-02` (typecheck), `E-04` (unit), `E-14` (integration pending DB) | `npm run typecheck` exit 0; `npm run test:unit` 2629 passed / 9 skipped; integration case "PUBLIC listing chỉ thấy PUBLISHED" covered trong `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (case 11 C-05) | Integration DB chưa chạy (ENV_BLOCKED) |
| `AC-02` | `E-06`, `E-14` | `getPublicJobDetail` SELECT từ `JobPosting WHERE status = 'PUBLISHED'`; DRAFT/ARCHIVED trả 404; integration case "DRAFT/ARCHIVED posting 404" covered trong `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (case 2 C-05) | Integration DB chưa chạy (ENV_BLOCKED) |
| `AC-03` | `E-07` | `app/(jobs)/viec-lam/[slug]/page.tsx` import `renderJobPostingRichText` từ `@/src/shared/content/job-posting-rich-text`; không có `dangerouslySetInnerHTML` (xác nhận bằng `public-detail.static.test.ts` + `detail-sections-policy.test.ts`); `src/domains/job-board/components/detail/__tests__/detail-sections-policy.test.ts` PASS | `None` |
| `AC-04` | `E-08`, `E-14` | Validator + renderer wrapper A0 freeze (`@tiptap/static-renderer@3.31.3`); fail-closed nếu schemaVersion lệch hoặc `doc` không qua validator; integration case "unsafe content / raw payload absent" covered trong `tests/db/p1a1-jobposting-public-apply.integration.test.ts` | Integration DB chưa chạy (ENV_BLOCKED) |
| `AC-05` | `E-13`, `E-15` | `RichTextSection` trả `null` cho invalid/corrupt/schema mismatch (C-07); không render raw payload, không placeholder text "Nội dung đang được cập nhật."; diagnostic chỉ qua marker/log an toàn; test assert section + raw payload absent | `None` |
| `AC-06` | `E-02`, `E-04` | `app/(jobs)/viec-lam/page.tsx` + `/viec-lam/[slug]/page.tsx` gọi `listPublicJobs` + `getPublicJobDetail` qua `withPublicDb`; SEO metadata từ canonical JobPosting; không fixture authority | `None` |
| `AC-07` | `E-07` | React output `@tiptap/static-renderer/json/react` qua HRP wrapper; JSON-LD chỉ từ field validator pass | `None` |
| `AC-08` | `E-09`, `E-14` | `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql`: signature, owner, grants, search_path, SECURITY DEFINER boundary đều giữ nguyên; body mới derive canonical IDs server-side với chain C-02; integration case "browser provenance fields → HTTP 400, zero DB write" covered | Integration DB chưa chạy (ENV_BLOCKED) |
| `AC-09` | `E-11`, `E-14` | Legacy `/viec-lam/PRJ-xxx`: in-segment handler hiểu `PRJ-xxx` slug, render listing filter theo `Project.code` exact; KHÔNG redirect-to-detail; KHÔNG chọn posting tùy ý; integration case "Project với 2 PUBLISHED + 1 DRAFT, ?project=PRJ-xxx → list filter đúng 2 PUBLISHED, không leak DRAFT, không redirect" covered | Integration DB chưa chạy (ENV_BLOCKED) |
| `AC-10` | `E-07`, `E-02` | Rich content render qua `renderJobPostingRichText`; SEO từ canonical JobPosting; JSON-LD từ field validator pass; typecheck PASS | `None` |
| `AC-11` | `E-10`, `E-14` | Apply route reject `slotId`, `projectId`, `jobOpeningId`; Idempotency-Key bắt buộc; 12 behavior case C-05.1..10 + sibling/wrong/expired/full slot + payload mismatch P0010 + duplicate P0012 + exact row counts covered trong `tests/db/p1a1-jobposting-public-apply.integration.test.ts` | Integration DB chưa chạy (ENV_BLOCKED) |
| `AC-12` | `E-09`, `E-11`, `E-16` | RPC revalidate PUBLISHED JobPosting + OPEN JobOpening + canonical slot trong cùng transaction với chain C-02; route reject browser-supplied provenance; Node pre-read KHÔNG phải authority; migration wrapped `BEGIN/COMMIT` + `GRANT SELECT` C-03 + pre/post assertions; negative rollback proof pending | Migration chain proof pending DB |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `powershell -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md'` | exit 0; `RESULT: PASS. TASK contract is ready for execution.` (all 11 sections present, T-01..T-07 all OK) | inline |
| `E-02` | `npm run typecheck` | exit 0; 0 errors | inline |
| `E-03` | `npm run lint` | exit 0; 0 errors, 707 warnings (pre-existing, none introduced by A1) | inline |
| `E-04` | `npm run test:unit` | exit 0; `Test Files 169 passed (169) / Tests 2629 passed | 9 skipped (2638)` | inline |
| `E-05` | targeted static lanes (chạy qua `npm run test:unit`) | exit 0; `public-detail.static.test.ts`, `public-select.static.test.ts`, `required-relation-sweep.static.test.ts`, `migrations-permission-hygiene.static.test.ts`, `detail-sections-policy.test.ts` all PASS | inline |
| `E-06` | `rg "JobPosting PUBLISHED" src/domains/job-board/public.service.ts` + đọc các query `findMany`/`findUnique` | match `status: 'PUBLISHED'` ở `getPublicJobDetail` và `listPublicJobs`; `prisma/schema.prisma` không sửa | `src/domains/job-board/public.service.ts` |
| `E-07` | `rg "renderJobPostingRichText\|dangerouslySetInnerHTML" "app/(jobs)/viec-lam/[slug]/page.tsx"` | 1 hit cho `renderJobPostingRichText`, 0 hit cho `dangerouslySetInnerHTML` | `app/(jobs)/viec-lam/[slug]/page.tsx` |
| `E-08` | đọc `src/shared/content/job-posting-rich-text/renderer.tsx` + `validator.ts` | fail-closed trên schemaVersion mismatch + doc không qua validator | `src/shared/content/job-posting-rich-text/renderer.tsx` |
| `E-09` | `cat prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` | DROP/CREATE FUNCTION giữ signature + owner + grants + SECURITY DEFINER + search_path; body mới derive canonical IDs server-side với canonical slot chain C-02; `GRANT SELECT ON job_postings, job_openings TO hrp_public_rpc`; wrap `BEGIN; ... COMMIT;`; pre/post assertions | `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` |
| `E-10` | `rg "slotId\|projectId\|jobOpeningId" app/api/public/jobs/[slug]/applications/route.ts` | chỉ validate để reject (HTTP 400 typed error code), không pass-through | `app/api/public/jobs/[slug]/applications/route.ts` |
| `E-11` | `npx vitest run tests/db/p1a1-jobposting-public-apply.integration.test.ts` | FAIL_ENV_BLOCKED với canonical preflight (`scripts/ci/integration-preflight.mjs`) khi thiếu `DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST`. Test KHÔNG dùng `describe.skipIf` để biến missing DB thành PASS/skip. | inline |
| `E-12` | `npm list @tiptap/static-renderer@3.31.3 --depth=0` | `3.31.3` (read-only); `package.json` không sửa | inline |
| `E-13` | `rg "fork" src/shared/content/job-posting-rich-text/ src/domains/job-board/` | 0 hits trong profile/wrapper source | inline |
| `E-14` | 12 behavior case trong `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (đăng ký trong `vitest.integration-files.ts`) | case definitions: PUBLISHED+OPEN canonical → success (C-05.1); DRAFT/ARCHIVED posting → fail closed (C-05.2); DRAFT/FILLED/CANCELLED opening → fail closed (C-05.3); old Project-only slug → fail closed (C-05.4); sibling/wrong/expired/full slot → fail closed (C-05.5); browser provenance → HTTP 400, zero DB write (C-05.6); idempotency replay (C-05.7); payload mismatch → P0010 (C-05.8); duplicate → P0012 (C-05.9); successful apply exact row counts (C-05.10); public listing/detail qua `withPublicDb` chỉ thấy PUBLISHED (C-05.11); public projection mỗi posting chỉ có linked slot (C-05.12). | `tests/db/p1a1-jobposting-public-apply.integration.test.ts` |
| `E-15` | `rg "Nội dung đang được cập nhật" "app/(jobs)/viec-lam/[slug]/page.tsx"` | 0 hits (RichTextSection trả `null` cho invalid/corrupt/schema mismatch) | `app/(jobs)/viec-lam/[slug]/page.tsx` |
| `E-16` | `git diff --stat 91525013f..HEAD -- prisma/migrations/` | 1 file changed (đúng một forward-only migration A1) | inline |
| `E-17` | `git diff --check 91525013fc2720a3803e808baac39e1c4497daf6..HEAD` | exit 0 (no whitespace errors) | inline |
| `E-18` | strict UTF-8/LF/no-BOM/mojibake scan qua `node -e "..."` script | exit 0 (no mojibake / CRLF / BOM in changed files) | inline |
| `E-19` | `powershell -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-handoff.ps1 -HandoffPath 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/HANDOFF.md'` | exit 0; `RESULT: PASS. HANDOFF is ready for freeze.` (pending semantic SHA freeze after C-08 gates complete) | inline |

## 4. Deviations and blockers

| ID | Type | Description | Resolution |
|---|---|---|---|
| `BLK-01` | `ENV_BLOCKED` | Synthetic test DB (`DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST`) không có trên agent sandbox nên integration preflight fail-closed (`scripts/ci/integration-preflight.mjs`). Đây là BLOCKED state đúng nghĩa, KHÔNG ghi PASS eligibility. | Structural proof ở static + unit lanes (E-04, E-05) đã cover RQ-01..RQ-09 cho PUBLIC role filter, slug from JobPosting, slot derivation, fail-closed renderer. Integration test mới (`tests/db/p1a1-jobposting-public-apply.integration.test.ts`) đã viết đầy đủ với `withPublicDb` + `DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST` và đăng ký trong `vitest.integration-files.ts`; chạy thật PASS ngay khi synthetic DB được provision. Status giữ `ENV_BLOCKED` cho tới khi integration DB-touching lane chạy được. |
| `BLK-02` | `CORRECTION_BATCH_USED_1/1` | T0 verdict `CHANGES_REQUIRED` trên reviewed HEAD `915dd2737082ea5437232fdf6c9a56d61e710d10`. Toàn bộ directive C-01..C-08 đã được apply trong semantic commit tiếp theo (`0ae001d...`); HANDOFF/TASK đồng bộ v1.4. | Correction batch đã đóng; không còn correction budget. Nếu sau này T0 mở round mới, cần mở task additive (KHÔNG amend/force-push round cũ). |

## 5. Final status

Status: `BLOCKED` (DB integration `ENV_BLOCKED` — synthetic DB thiếu trên agent sandbox). Implementation SHA `0ae001dd96e8c72c39a60b58f80aea6fcc2d306e` pin tại HEAD worktree branch `codex/t1a-p1-a1-canonical-public-job-detail` (trước docs-only HANDOFF SHA pinning commits `d357bc94dc57de92efe40bf1fc772c8d9bbf0dc5` và `915dd2737082ea5437232fdf6c9a56d61e710d10`). Correction batches used = 1. Frozen delivery = YES. Canonical gates = `NOT_REQUIRED` (static + unit + typecheck + lint + tiptap pin PASS; integration lane `BLOCKED` vì thiếu synthetic DB). Lane CRITICAL + LIGHT audit (đã chốt bởi T0 tại OD-P1A-04 + OD-P1A-09). Tự review toàn changed surface xong; không có semantic delta sau Implementation SHA.

Cumulative diff range đã audit: `91525013fc2720a3803e808baac39e1c4497daf6..915dd2737082ea5437232fdf6c9a56d61e710d10` = 20 files, +1410 / -332.

Tier 3 chỉ được mở sau khi DB integration PASS thật. Nếu synthetic DB chưa được provision, KHÔNG tuyên bố READY_FOR_AUDIT/audit eligible.

Handoff status: BLOCKED (chờ synthetic DB)
