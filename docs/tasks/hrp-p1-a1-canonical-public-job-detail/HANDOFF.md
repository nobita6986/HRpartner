# HANDOFF — `hrp-p1-a1-canonical-public-job-detail`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-p1-a1-canonical-public-job-detail` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.8` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Execution round | `4` |
| Baseline | `91525013fc2720a3803e808baac39e1c4497daf6` |
| Implementation SHA | `487cd14ca293eaef6a4db0ddd75908234888a465` |

> Implementation SHA note. `487cd14ca293eaef6a4db0ddd75908234888a465` is the narrow PR #49 CI correction over the prior T3-reviewed delivery. Delta `279ce27a8a7f821eac5e7039ab7c5f98c6b5da42..487cd14ca293eaef6a4db0ddd75908234888a465` contains only the A1 migration and its migration-chain test.
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |

> Canonical gates note. After the CI portability correction, `CI_INTEGRATION_STRICT=1 npm run test:integration` passed 30/30 files with 529 passed, 2 Redis-only skipped, and 0 failed. Production credentials/data were not used.
| Audit eligibility | `ELIGIBLE` |
| Correction batches used | `1` |
| Status | `ACCEPTED` |

> **Cumulative delivery diff range = `91525013fc2720a3803e808baac39e1c4497daf6..487cd14ca293eaef6a4db0ddd75908234888a465` = 27 files, +5725 / -1580.**

> **Integration lane note.** Preflight verified writer=`app_user_writer` (non-superuser, non-BYPASSRLS), admin=`neondb_owner` (BYPASSRLS), and same synthetic target. Both P1-A1 DB suites ran for real; missing credentials still fail closed. The two skips are the pre-existing Upstash Redis TEST cases in OPS06A and do not weaken the P1-A1 DB proof.

## 1. Outcome and changed surface

- **Delivered (semantic implementation = `487cd14ca293eaef6a4db0ddd75908234888a465` — narrow CI portability correction, round 4).**
  - Continuous cutover sang `JobPosting PUBLISHED`: `getPublicJobDetail`, `listPublicJobs`, route handlers, service-level DTO mapping đọc đúng canonical table, derive siteAddress/clientCompanyName/staffingOrder thông qua `JobOpening → StaffingOrder → Project` (xem `src/domains/job-board/public.service.ts` — `staffingOrder: { select: { ... project: { ... } } }`). Public service CHỈ map linked `JobOpening.staffingOrderSlot` vào DTO, KHÔNG fetch toàn bộ `staffingOrder.slots` (C-02 atomic canonical slot).
  - Canonical slot join trong `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql`: chain `s.id = jo.staffing_order_slot_id AND s.staffing_order_id = jo.staffing_order_id AND s.job_opening_id = jo.id` — sibling slot trên cùng StaffingOrder bị reject; nếu chain thiếu hoặc drift thì fail closed.
  - Migration grant: `GRANT SELECT ON job_postings, job_openings TO hrp_public_rpc` (chỉ SELECT, không INSERT/UPDATE/DELETE). Function body wrap trong `BEGIN;` ... `COMMIT;` với pre/post assertions (predecessor function signature, role posture, required tables/columns, owner, prosecdef=true, proconfig chứa `search_path=public, pg_temp`, EXECUTE grants, dependency SELECTs).
  - Render rich content qua shared safe renderer `renderJobPostingRichText` (HRP wrapper, A0 freeze tại `src/shared/content/job-posting-rich-text/renderer.tsx`). Không `dangerouslySetInnerHTML`, không raw HTML string, không editor client trên server.
  - `RichTextSection` trong `app/(jobs)/viec-lam/[slug]/page.tsx`: invalid/corrupt/schema mismatch → trả `null` (omit section hoàn toàn), KHÔNG render raw payload, KHÔNG fallback placeholder text "Nội dung đang được cập nhật.". Diagnostic chỉ qua marker/log an toàn (C-07).
  - SEO metadata (title, description, canonical URL) đến từ canonical `JobPosting` qua projection HRP.
  - Legacy `/viec-lam/PRJ-xxx`: in-segment compatibility handler hiểu `PRJ-xxx` slug và render listing filter theo `Project.code` exact (query `project=<code>`); KHÔNG 301/308 redirect-to-detail; KHÔNG chọn posting tùy ý khi Project có nhiều posting (C-06).
  - Forward-only migration `20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` thay body `hrp_public_apply_submission` (signature, owner `hrp_public_rpc`, grants, `SET search_path = public, pg_temp`, `SECURITY DEFINER` boundary đều giữ nguyên). Function body mới derive canonical `projectId/slotId/jobOpeningId` từ `PUBLISHED` JobPosting + `OPEN` JobOpening trong cùng `SECURITY DEFINER` transaction, với canonical slot chain C-02.
  - Migration executes `CREATE OR REPLACE FUNCTION` as the existing owner `hrp_public_rpc`, revokes the temporary SET-capable grant, preserves any predecessor `WITH SET FALSE` membership, and verifies that `session_user` has no effective SET ROLE capability after replacement.
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
  - Không tự gọi Tier 3; T0 owns the next audit dispatch.
  - Production migration/deploy remains not executed.
- **Changed.** Cumulative delivery diff range = `91525013fc2720a3803e808baac39e1c4497daf6..487cd14ca293eaef6a4db0ddd75908234888a465` = 27 files, +5725 / -1580. The audit-to-correction delta `279ce27..487cd14` changes exactly two semantic files: the migration and migration-chain test. Earlier round-3 changes remain:
  - `app/(jobs)/viec-lam/[slug]/page.tsx` (bỏ demo fixtures; render rich qua `renderJobPostingRichText`; SEO metadata từ canonical; RichTextSection helper local fail-closed; legacy PRJ-xxx in-segment handler).
  - `app/api/public/jobs/[slug]/applications/route.ts` (reject browser-supplied IDs).
  - `src/domains/job-board/public.service.ts` (refactor to JobPosting PUBLISHED; `projectRowFromPosting`; DTO mapping chỉ map linked `JobOpening.staffingOrderSlot`; sibling slot không xuất hiện trong DTO).
  - `src/domains/applications/application.service.ts` (bỏ slotId; hardcode NULL trong SQL call).
  - `src/domains/applications/apply-helpers.ts` + `apply-helpers.test.ts` (đồng bộ với slotId removal).
  - `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` (forward-only function-body replacement + canonical slot chain C-02 + `GRANT SELECT` C-03 + `BEGIN/COMMIT` + pre/post assertions).
  - `docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md` (v1.6 DB-gate closure; status `READY_FOR_AUDIT`; round 3; expanded exact integration scope).
  - `docs/tasks/hrp-p1-a1-canonical-public-job-detail/HANDOFF.md` (this file).
  - Targeted unit tests: `application.service.test.ts`, `marketplace-apply.routes.test.ts`, `public-card-truth.test.ts`, `public-detail.service.test.ts`, `mp1.contract.test.ts`, `public-board-architecture.test.ts`, `public-board-route-json.test.ts`, `public-select.static.test.ts`, `required-relation-sweep.static.test.ts`, `detail-sections-policy.test.ts`.
  - `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (real synthetic DB behavior: full canonical chain, PUBLISHED/DRAFT/ARCHIVED, idempotency and sibling-slot isolation; missing env throws instead of skip).
  - `tests/db/p1a1-migration-chain-proof.integration.test.ts` (isolated true predecessor chain, byte-identical migration apply, catalog checks, and transactional negative rollback proof).
  - `src/domains/applications/live-integration.mp2.test.ts`, `src/domains/applications/live-integration.ops06a.test.ts`, `src/domains/job-board/public-card-truth.integration.test.ts`, `src/shared/auth/live-public-read-rls.go-live-04.test.ts` (carry-in fixtures aligned to `JobPosting` as canonical public authority; no production runtime change).
  - `vitest.integration-files.ts` (đăng ký `tests/db/p1a1-jobposting-public-apply.integration.test.ts`).
- **Lane escalation.** No. `CRITICAL + LIGHT` matches the contract and is unchanged.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `STATIC_PASS` | `verify-task.ps1` PASS trên TASK.md v1.4; forbidden paths (`prisma/schema.prisma`, `package.json`, `package-lock.json`, `src/shared/ui/editor/**`, `src/domains/staffing/job-posting-authoring.service.ts`, `src/domains/job-board/publish.service.ts`) untouched — `git diff --stat 91525013f..HEAD -- prisma/schema.prisma package.json package-lock.json src/shared/ui/editor src/domains/staffing/job-posting-authoring.service.ts src/domains/job-board/publish.service.ts` = 0 lines. |
| API/route boundary | `STATIC_PASS` | Apply route reject browser-supplied `slotId`, `projectId`, `jobOpeningId` (HTTP 400 typed error). Public detail + listing dùng `withPublicDb` wrapper. Không có public marketplace route ngoài `/viec-lam` + `/viec-lam/[slug]` + `/api/public/jobs/[slug]/applications` bị thay đổi contract. Legacy PRJ-xxx in-segment handler: filter theo `Project.code` exact, không redirect-to-detail. |
| Auth/permission/data exposure | `STATIC_PASS` | Public path dùng `withPublicDb` (POST `hrp_session_role()=NULL` → public RLS context). SECURITY DEFINER function giữ owner `hrp_public_rpc`, grants y nguyên. `REVOKE hrp_public_rpc FROM session_user` ngay sau `WITH SET FALSE` để hygiene. `GRANT SELECT ON job_postings, job_openings TO hrp_public_rpc` để RPC mới không permission-denied runtime (C-03). `CandidateSubmission.jobPostingId` vẫn không có (`rg jobPostingId src/domains/applications/application.service.ts prisma/schema.prisma` ngoài comment audit-trail = 0 hits). |
| Migration/backfill/rollback | `PASS` | Forward-only transaction applied on the dedicated synthetic branch. True predecessor-chain proof, byte-identical apply, catalog verification, and forced post-assert rollback all PASS. No production apply. |
| Concurrency/idempotency | `PASS` | Canonical RPC behavior, replay, mismatch, duplicate, sibling-slot rejection, and exact row counts passed on the real writer/admin pair. |
| Test isolation and cleanup | `PASS` | Writer/admin posture and same-target guards passed; predecessor proof uses an isolated temporary DB; fixtures are run-scoped and cleaned in FK order; missing DB throws/fails preflight. |

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `powershell -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md'` | `RESULT: PASS. TASK contract is ready for execution.` exit 0 | `None` |
| `AC-01` | `E-02`, `E-04`, `E-11` | Typecheck PASS; unit 169 files / 2630 passed / 9 skipped; strict integration proves PUBLIC listing only returns PUBLISHED postings. | `None` |
| `AC-02` | `E-06`, `E-11` | Real DB cases prove DRAFT/ARCHIVED postings and non-OPEN openings fail closed. | `None` |
| `AC-03` | `E-07` | `app/(jobs)/viec-lam/[slug]/page.tsx` import `renderJobPostingRichText` từ `@/src/shared/content/job-posting-rich-text`; không có `dangerouslySetInnerHTML` (xác nhận bằng `public-detail.static.test.ts` + `detail-sections-policy.test.ts`); `src/domains/job-board/components/detail/__tests__/detail-sections-policy.test.ts` PASS | `None` |
| `AC-04` | `E-08`, `E-11` | Validator/renderer remains pinned; integration and unit evidence pass. | `None` |
| `AC-05` | `E-13`, `E-15` | `RichTextSection` trả `null` cho invalid/corrupt/schema mismatch (C-07); không render raw payload, không placeholder text "Nội dung đang được cập nhật."; diagnostic chỉ qua marker/log an toàn; test assert section + raw payload absent | `None` |
| `AC-06` | `E-02`, `E-04` | `app/(jobs)/viec-lam/page.tsx` + `/viec-lam/[slug]/page.tsx` gọi `listPublicJobs` + `getPublicJobDetail` qua `withPublicDb`; SEO metadata từ canonical JobPosting; không fixture authority | `None` |
| `AC-07` | `E-07` | React output `@tiptap/static-renderer/json/react` qua HRP wrapper; JSON-LD chỉ từ field validator pass | `None` |
| `AC-08` | `E-09`, `E-11` | Browser provenance rejection and server-derived canonical chain pass on synthetic DB; catalog proof preserves function security posture. | `None` |
| `AC-09` | `E-11`, `E-14` | Legacy filtered-list behavior and no DRAFT leak pass in unit/integration evidence. | `None` |
| `AC-10` | `E-07`, `E-02` | Rich content render qua `renderJobPostingRichText`; SEO từ canonical JobPosting; JSON-LD từ field validator pass; typecheck PASS | `None` |
| `AC-11` | `E-10`, `E-11` | 18/18 P1-A1 behavior cases PASS, including replay/mismatch/duplicate and canonical-slot negatives. | `None` |
| `AC-12` | `E-09`, `E-16`, `E-20` | 11/11 isolated migration-chain assertions PASS, including explicit SET-capable membership cleanup, catalog posture and complete rollback after forced post-assert failure. | `None` |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `powershell -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md'` | exit 0; `RESULT: PASS. TASK contract is ready for execution.` (all 11 sections present, T-01..T-07 all OK) | inline |
| `E-02` | `npm run typecheck` | exit 0; 0 errors | inline |
| `E-03` | `npm run lint` | exit 0; 0 errors, 707 warnings (pre-existing, none introduced by A1) | inline |
| `E-04` | `npm run test:unit` | exit 0; `Test Files 169 passed (169) / Tests 2630 passed | 9 skipped (2639)` | inline |
| `E-05` | targeted static lanes (chạy qua `npm run test:unit`) | exit 0; `public-detail.static.test.ts`, `public-select.static.test.ts`, `required-relation-sweep.static.test.ts`, `migrations-permission-hygiene.static.test.ts`, `detail-sections-policy.test.ts` all PASS | inline |
| `E-06` | `rg "JobPosting PUBLISHED" src/domains/job-board/public.service.ts` + đọc các query `findMany`/`findUnique` | match `status: 'PUBLISHED'` ở `getPublicJobDetail` và `listPublicJobs`; `prisma/schema.prisma` không sửa | `src/domains/job-board/public.service.ts` |
| `E-07` | `rg "renderJobPostingRichText\|dangerouslySetInnerHTML" "app/(jobs)/viec-lam/[slug]/page.tsx"` | 1 hit cho `renderJobPostingRichText`, 0 hit cho `dangerouslySetInnerHTML` | `app/(jobs)/viec-lam/[slug]/page.tsx` |
| `E-08` | đọc `src/shared/content/job-posting-rich-text/renderer.tsx` + `validator.ts` | fail-closed trên schemaVersion mismatch + doc không qua validator | `src/shared/content/job-posting-rich-text/renderer.tsx` |
| `E-09` | `cat prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` | DROP/CREATE FUNCTION giữ signature + owner + grants + SECURITY DEFINER + search_path; body mới derive canonical IDs server-side với canonical slot chain C-02; `GRANT SELECT ON job_postings, job_openings TO hrp_public_rpc`; wrap `BEGIN; ... COMMIT;`; pre/post assertions | `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` |
| `E-10` | `rg "slotId\|projectId\|jobOpeningId" app/api/public/jobs/[slug]/applications/route.ts` | chỉ validate để reject (HTTP 400 typed error code), không pass-through | `app/api/public/jobs/[slug]/applications/route.ts` |
| `E-11` | `CI_INTEGRATION_STRICT=1 npm run test:integration` trên dedicated synthetic DB | exit 0; 30/30 files, 529 passed, 2 Redis-only skipped, 0 failed. P1-A1 public-apply suite 18/18 PASS; migration-chain proof 11/11 PASS. Production DB không được dùng. | inline |
| `E-12` | `npm list @tiptap/static-renderer@3.31.3 --depth=0` | `3.31.3` (read-only); `package.json` không sửa | inline |
| `E-13` | `rg "fork" src/shared/content/job-posting-rich-text/ src/domains/job-board/` | 0 hits trong profile/wrapper source | inline |
| `E-14` | 18 behavior cases trong `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (đăng ký trong `vitest.integration-files.ts`) | PUBLISHED+OPEN canonical success; DRAFT/ARCHIVED posting, non-OPEN opening, old Project-only slug, sibling/wrong/expired/full slot và browser provenance đều fail closed; replay/mismatch/duplicate semantics và exact row counts được chứng minh; public listing/detail qua `withPublicDb` chỉ thấy PUBLISHED và canonical linked slot. | `tests/db/p1a1-jobposting-public-apply.integration.test.ts` |
| `E-15` | `rg "Nội dung đang được cập nhật" "app/(jobs)/viec-lam/[slug]/page.tsx"` | 0 hits (RichTextSection trả `null` cho invalid/corrupt/schema mismatch) | `app/(jobs)/viec-lam/[slug]/page.tsx` |
| `E-16` | `git diff --stat 91525013f..HEAD -- prisma/migrations/` | 1 file changed (đúng một forward-only migration A1) | inline |
| `E-17` | `git diff --check 91525013fc2720a3803e808baac39e1c4497daf6..HEAD` | exit 0 (no whitespace errors) | inline |
| `E-18` | strict UTF-8/LF/no-BOM/mojibake scan qua `node -e "..."` script | exit 0 (no mojibake / CRLF / BOM in changed files) | inline |
| `E-19` | `powershell -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-handoff.ps1 -HandoffPath 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/HANDOFF.md'` | exit 0; HANDOFF substantive gate PASS after semantic SHA freeze. | inline |
| `E-20` | `npx vitest run --config vitest.integration.config.ts tests/db/p1a1-migration-chain-proof.integration.test.ts` trên isolated synthetic predecessor DB | exit 0; 11/11 assertions PASS, including byte-identical migration apply, explicit membership cleanup, catalog posture and transaction rollback under injected postflight fault. | `tests/db/p1a1-migration-chain-proof.integration.test.ts` |

## 4. Deviations and blockers

| ID | Type | Description | Resolution |
|---|---|---|---|
| `BLK-01` | `CLOSED` | T0 provisioned the dedicated synthetic admin/writer pair through the restricted local credential channel. The canonical strict integration lane ran against that synthetic DB only. | 30/30 files, 529 passed, 2 Redis-only skips, 0 failed; public-apply 18/18 and migration-chain 11/11 PASS. Production credentials/database were not used or mutated. |
| `CI-01` | `CLOSED` | PR #49 PostgreSQL 16 superuser runner exposed a false-positive postflight assertion: superusers inherently pass `pg_has_role(..., 'SET')`. | Migration now checks only explicit `pg_auth_members.set_option=true` leakage. Targeted 11/11 and full 529-test integration PASS; Tier 3 DELTA round 2 PASS. |
| `BLK-02` | `CORRECTION_BATCH_USED_1/1` | T0 verdict `CHANGES_REQUIRED` trên reviewed HEAD `915dd2737082ea5437232fdf6c9a56d61e710d10`. Toàn bộ directive C-01..C-08 đã được apply trong semantic commit tiếp theo (`0ae001d...`); HANDOFF/TASK đồng bộ v1.4. | Correction batch đã đóng; không còn correction budget. Nếu sau này T0 mở round mới, cần mở task additive (KHÔNG amend/force-push round cũ). |

## 5. Final status

Status: `ACCEPTED`. Implementation SHA `487cd14ca293eaef6a4db0ddd75908234888a465` remains the frozen semantic correction. Tier 3 LIGHT/DELTA round 2 PASS was adopted at `13e298fde23a1c5ed5d241b2dd70aae25f108215`; PR #49 was squash-merged as `a9c5c39514449e5226f8f745d5689538f8d14651`; main CI run `36137131501` passed Quality and Integration.

## 6. Closeout

- **Production migration:** read-only preflight found exactly one pending migration. T0 applied `20260925000000_p1a1_canonical_apply_jobpostings`; `prisma migrate status` then reported all 52 migrations applied and schema up to date.
- **Catalog verification:** function owner=`hrp_public_rpc`, `SECURITY DEFINER` and `search_path=public, pg_temp` preserved; `app_user`/`app_user_writer` retain EXECUTE; PUBLIC cannot execute; `hrp_public_rpc` has SELECT on `job_postings` and `job_openings` but no INSERT/UPDATE/DELETE; no explicit SET-capable membership and no CREATE on schema `public` remain.
- **Deployment/smoke:** Vercel production status for merge commit `a9c5c39514449e5226f8f745d5689538f8d14651` is SUCCESS. `GET /` and `GET /viec-lam` returned 200; an unknown `/viec-lam/[slug]` returned 404. No real application submission or PII was created.
- **Closeout:** P1-A1 is `ACCEPTED`. P1-B remains a separate gated task; this closeout only removes its `WAIT_P1_A1_ACCEPTED` dependency.

Handoff status: ACCEPTED
