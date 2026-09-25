# AUDIT — `hrp-p1-a0-jobposting-authoring-publish`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-p1-a0-jobposting-authoring-publish` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.3` |
| Assurance lane | `CRITICAL` |
| Audit depth | `LIGHT` |
| Execution round | `1` |
| Audit round | `1` |
| Baseline / source round | `b34cdddd5c9bbfbda2cc276abf47f328e42af40c` (cumulative frozen baseline); source A0 commit `036b62dad878d40df8ecd14ea95ac27dbf8b11e0` (preserved in history) |
| Implementation SHA | `c4418bb96f7715d09b856549f44914da38c603cd` |
| Delivery HEAD | `729efa34e7c5c737f00620ecd2b3dc53a749aa5d` |
| Cumulative implementation range | `b34cdddd5c9bbfbda2cc276abf47f328e42af40c..c4418bb96f7715d09b856549f44914da38c603cd` |
| Post-freeze docs range | `c4418bb96f7715d09b856549f44914da38c603cd..729efa34e7c5c737f00620ecd2b3dc53a749aa5d` (TASK.md + HANDOFF.md only; 4 insertions / 4 deletions; zero semantic delta) |
| Frozen delivery | `YES` |
| Audit eligibility | `ELIGIBLE` |
| Finding completeness | `COMPLETE_CURRENT_SURFACE` |
| Correction batch | `0` |
| Auditor | `Tier 3 — independent session (Cursor MiniMax-M3, 2026-09-25)` |

> Tier 3 đã audit theo Tier 3.md flow: xác nhận HANDOFF pin exact frozen SHA + Frozen delivery YES + Audit eligibility ELIGIBLE → đọc TASK, HANDOFF, diff đúng `Baseline..Implementation SHA` + changed callers trực tiếp → chạy `verify-handoff.ps1` PASS → tái hiện ≥2 phép đo độc lập (changed behavior + risk/scope) trên Tier 3 ephemeral synthetic DB (`127.0.0.1:5434/hrp_test`, port 5434 tách biệt khỏi cluster Tier 1) → luôn check C-07/C-09/C-10 → báo toàn bộ finding trong cùng một lượt → chạy `verify-audit.ps1` PASS.

## 1. Findings

| ID | Severity | Release-blocking | Status | Finding / reproduction / impact | Planner decision |
|---|---|---|---|---|---|
| `AUD-001` | `P3` | `NO` | OBSERVED | HANDOFF.md §0 blockquote và revision-history v1.1 vẫn giữ text lệch về "freeze HEAD = `2c240e5`" và "Cumulative frozen range = `b34cdddd..2c240e5`", trong khi field header cùng file pin đúng `Implementation SHA = c4418bb` và `Baseline/diff range = b34cdddd..c4418bb` theo T0 directive. Residual drift doc-only; không ảnh hưởng source/runtime/schema/test/config. | Owner — debt. Không chặn PASS; T0 quyết định có mở correction batch tiếp theo để chuẩn hóa wording hay không. |
| `AUD-002` | `P3` | `NO` | OBSERVED | HANDOFF.md §0 ghi "Required starting HEAD: `578cb61e...` (frozen at 036b62d; ... this freeze HEAD is `2c240e5...`)" trong khi T0 directive và field header đã pin Implementation SHA `c4418bb`. Wording carry-in từ vòng freeze trước (chain `c32cf1d → 2c240e5 → c031651 → 3e73a03 → c4418bb → 729efa3`). Doc-only. | Owner — debt. |
| `AUD-003` | `P3` | `NO` | OBSERVED | HANDOFF.md §2 evidence row E-03 ghi "validator.test.ts passes 14 cases"; Tier 3 đo độc lập được 29 cases passed trên cùng HEAD `729efa3`. Số test thực cao hơn 14, không có failed case nào. Doc-only count drift, không phải test failure. | Owner — debt. |
| `AUD-004` | `P3` | `NO` | OBSERVED | HANDOFF.md §5/E-15 ghi "27/27 test files, 494 tests passed, 2 skipped (496)". `vitest.integration-files.ts` tại HEAD `729efa3` chứa **28** file entries; Tier 3 đo độc lập được 28 test files total, 27 passed, 1 failed (AFF-03B carry-in Unicode normalization), 2 skipped, 502 tests total. Carry-in test fail không thuộc P1-A0 changed surface (commit `9e527a1`, `b5e62e6`, `f27afe0`, `955645e`, `3b8074f` đều trước baseline `b34cdddd`; không nằm trong `b34cdddd..c4418bb`). Doc count drift. | Owner — debt. |
| `AUD-005` | `P3` | `NO` | OBSERVED | Tier 3 đo được `npm run test:unit` tại HEAD `729efa3`: 169 test files / 2629 passed / 9 skipped / exit 0. HANDOFF.md §2 row E-12 ghi "168 files / 2607 passed / 9 skipped". Số file/test thực cao hơn, all green, exit 0. Doc-only count drift. | Owner — debt. |
| `AUD-006` | `P3` | `NO` | OBSERVED | Tier 3 integration lane trên synthetic DB local (`127.0.0.1:5434/hrp_test`, builtin-locale=C, initdb với `--locale-provider=builtin --builtin-locale=C --encoding=UTF8`) báo 1 fail ở `tests/db/aff03-public-intake.integration.test.ts` AC-13 normalization corpus: TS lowercases `nguyễn văn a` đúng nhưng PL/pgSQL với builtin locale C trả `nguyỄn vĂn a` (collation thiếu Vietnamese lowercasing). File này không thuộc P1-A0 changed surface (commit history độc lập với P1-A0); chỉ là carry-in test phụ thuộc ICU/UTF-8 locale collation mà cluster Tier 3 dựng lại không có sẵn. P1-A0 changed-surface test `tests/db/job-posting-authoring.integration.test.ts` chạy 13/13 PASS. Env mismatch, không release-blocking. | Tier 3 — env limitation. Tier 1 không cần mở correction batch vì file carry-in nằm ngoài scope P1-A0; nếu muốn carry-in test pass trên mọi locale cần cluster dựng với ICU locale có Vietnamese collation — out of P1-A0 contract. |

> P0/P1 luôn chặn. P2 chỉ chặn khi `Release-blocking: YES`. Không có P0/P1 trong round này. P3 non-blocking đi vào debt/backlog với owner = T0/Owner cho doc wording (`AUD-001..005`) hoặc Tier 3 cho env limitation (`AUD-006`).

## 2. Verification

### 2.1 Acceptance criteria

| AC | Independent method or carry-forward source | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `npx prisma validate` tại worktree detached HEAD `729efa3` | `PASS` | exit 0; output: `The schema at prisma/schema.prisma is valid 🚀`. Schema đã thêm đúng 7 nullable content fields + contentSchemaVersion default 1, không phá additive constraint. | `None` |
| `AC-02` | `git show c4418bb:prisma/migrations/20260924180000_p1a0_jobposting_content_fields/migration.sql` | `PASS` | exit 0; file chứa 7 × `ALTER TABLE "job_postings" ADD COLUMN` (title, salary_display, description_json, requirements_json, benefits_json, application_instructions_json, content_schema_version INTEGER NOT NULL DEFAULT 1) + `CREATE INDEX IF NOT EXISTS "job_postings_status_idx"`; rg "DROP COLUMN\|DROP TABLE\|RENAME COLUMN\|ALTER COLUMN TYPE" trên file = 0 match. | `None` |
| `AC-03` | `npm run test:unit` (validator suite) + `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts` | `PASS` | unit lane đo 29/29 PASS ở `src/shared/content/job-posting-rich-text/__tests__/validator.test.ts`; integration lane đo 13/13 PASS ở `tests/db/job-posting-authoring.integration.test.ts`. image/iframe/video/codeBlock/script/style/blockquote/strike/underline đều bị reject fail-closed. | `None` |
| `AC-04` | `rg "JOB_POSTING_RICH_TEXT_MAX_" src/shared/content/job-posting-rich-text/profile.ts` + unit-test negative cases | `PASS` | grep tìm thấy `JOB_POSTING_RICH_TEXT_MAX_BYTES=64*1024`, `MAX_NODES=1000`, `MAX_DEPTH=16`, `MAX_URL_BYTES=2048`. Validator enforce đủ 4 limit; test đo 4 negative case unit PASS + 3 negative case integration PASS. | `None` |
| `AC-05` | `rg "JOB_POSTING_LINK_URL_PATTERN\|target.*_blank\|noopener" src/shared/content/job-posting-rich-text/` + validator unit | `PASS` | validator.ts reject `javascript:`, `data:`, `file:`, protocol-relative (`//`) và chỉ accept `https://`; renderer.tsx enforce `target='_blank' rel='noopener noreferrer'` ở link mark mapping (line 100-110). | `None` |
| `AC-06` | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts -t "race\|idempotent"` | `PASS` | `AC-06 createOrReuse idempotent` PASS; `AC-06 2-transaction race` PASS — cả 2 caller thấy cùng `JobOpening.id`. Service dùng `SELECT FOR UPDATE` + `UPDATE ... WHERE job_opening_id IS NULL` race-safe. | `None` |
| `AC-07` | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-authoring.service.test.ts` + integration "stale revision does not write" | `PASS` | service `updateDraftContent` throw `AuthoringError('INVALID_REVISION')` khi `current.revision !== input.expectedRevision` (line 539-546). Optimistic concurrency backstop thêm `where: { id, revision: current.revision }` (line 556-557). | `None` |
| `AC-08` | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts -t "publish\|unpublish\|archive"` | `PASS` | exit 0; 6 test cases trong matrix PASS — `publishJobPosting` reject khi `JobOpening.status !== OPEN` (lỗi `JOB_OPENING_NOT_OPEN`); `unpublishJobPosting` chỉ từ PUBLISHED; `archiveJobPosting` terminal (ARCHIVED→ARCHIVED reject, lỗi `INVALID_STATE_TRANSITION`). | `None` |
| `AC-09` | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts -t "RLS"` | `PASS` | HR_MANAGER SELECTs PASS; PUBLIC posture 0 rows visible (USING-clause deny-by-default) PASS. `assertMutationRole(['ADMIN','HR_MANAGER','HR_STAFF'])` enforce ở service + route boundary. | `None` |
| `AC-10` | `npm run typecheck && npm run lint && rg "dangerouslySetInnerHTML" app/admin/jobs/job-postings src/shared/ui/editor` | `PASS` | typecheck exit 0; lint exit 0 (0 errors, 705 warnings carry-in); `rg` không match trên UI path (chỉ match comment trong `renderer.tsx` để giải thích intentional non-use). Editor shell chỉ gọi API qua wrapper. | `None` |
| `AC-11` | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-authoring.service.test.ts -t "slug"` + integration | `PASS` | exit 0; `generateCanonicalSlug({ jobOpeningId, title })` deterministic + suffix-disambiguated (sha256 first 8 hex, 4 slug unit tests PASS). Slug unique trên `@@unique([slug])` + service reject mutation sau first PUBLISHED (`generateCanonicalSlug` ở line 246-251). | `None` |
| `AC-12` | `npm run test:unit -- src/domains/staffing/job-posting-list.service.test.ts` + full unit lane 169 files | `PASS` | DTO extension additive (`title`, `salaryDisplay`, bốn `*Json` fields, `hasContent`). Unit lane 169 files / 2629 passed / 9 skipped — list-service không regression. | `None` |
| `AC-13` | `npx --no-install npm list @tiptap/react@3.31.3 @tiptap/pm@3.31.3 @tiptap/starter-kit@3.31.3 @tiptap/static-renderer@3.31.3 @tiptap/core@3.31.3 --depth=0` + `git show c4418bb:package.json` | `PASS` | exit 0; 5 packages tại exact `3.31.3`; `git show c4418bb:package.json` không có caret/tilde trên 4 entry ADOPT; lockfile không chứa bản Tiptap thứ hai (count=0). | `None` |
| `AC-14` | `rg "jobPostingId" prisma/schema.prisma src/domains/talent/intake-writer.service.ts` + integration runtime check | `PASS` | exit 0; grep không match (zero hits, count=0). Integration test runtime `Prisma.dmmf.datamodel.models.find(m=>m.name==='CandidateSubmission').fields.some(f=>f.name==='jobPostingId')` = false (boolean=false). | `None` |

### 2.2 Assurance checks

LIGHT bắt buộc `C-07`, `C-09`, `C-10`, ít nhất một changed-behavior check và các check rủi ro thực sự áp dụng. Toàn bộ C-01..C-10 được liệt kê dưới đây (các check áp dụng) hoặc SKIP có lý do (các check ngoài phạm vi audit, vd. C-04 secret scan đã là gate).

| Check | Status | Evidence (command + exit + output, hoặc carry-forward source) |
|---|---|---|
| `C-01` Plan / contract integrity | `DONE` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath 'docs/tasks/hrp-p1-a0-jobposting-authoring-publish/TASK.md'` → `RESULT: DRAFT-VALID (1 warning(s))`; exit 0. 1 warning là READY_FOR_AUDIT placeholder non-blocking. |
| `C-02` Diff scope vs in-scope roots | `DONE` | `git diff --name-only b34cdddd..c4418bb` chứa toàn bộ file thuộc `prisma/schema.prisma`, migration mới, `package.json`+`package-lock.json`, `src/shared/ui/editor/**`, `src/shared/content/job-posting-rich-text/**`, `src/domains/staffing/job-posting-authoring.service.ts`, `src/domains/staffing/job-posting-list.service.ts`, `app/api/admin/jobs/job-postings/**`, `app/admin/jobs/job-postings/**`, targeted tests, vitest configs. Không có file ngoài in-scope roots. |
| `C-03` Forbidden paths untouched | `DONE` | `git diff --stat b34cdddd..c4418bb -- src/domains/job-board/public.service.ts app/(jobs)/viec-lam/** src/domains/job-board/components/** src/domains/talent/intake-writer.service.ts src/domains/job-board/publish.service.ts prisma/migrations/!20260924180000_p1a0_jobposting_content_fields/**` = 0 lines; `prisma/schema.prisma` không có `jobPostingId`. |
| `C-04` Secret scan | `DONE` | `pwsh .ai-pipeline/scripts/verify-task.ps1` + `verify-handoff.ps1` PASS với `[OK] T-06 no plaintext secret in TASK.md` và `[OK] H-09 no plaintext secret in HANDOFF.md`. Tier 3 secret scan: AUDIT.md không chứa token/password/PII. |
| `C-05` Build artefact / dependency hygiene | `DONE` | `npm run build` exit 0; `npm list @tiptap/* --depth=0` xác nhận 5 packages exact `3.31.3`; `package.json` không caret/tilde trên 4 entry ADOPT. |
| `C-06` Type / lint / unit canonical lane | `DONE` | `npm run typecheck` exit 0; `npm run lint` exit 0 (0 errors, 705 warnings baseline); `npm run test:unit` exit 0 — 169 files / 2629 passed / 9 skipped. |
| `C-07` Git hygiene (commit / working tree / WIP) | `DONE` | working tree tại `C:\CodeApp\HrP-worktrees\t1a-p1-job-marketplace-planning-v2` clean cho tracked files; 5 untracked files `t0_*.{txt,ps1,md}` là T0 scratch bảo toàn (giữ untracked theo T0 directive). `git diff --check b34cdddd..c4418bb` + `git diff --check c4418bb..729efa3` exit True (no whitespace conflicts). |
| `C-08` Migration safety (forward-only, additive, idempotent) | `DONE` | migration SQL chỉ `ADD COLUMN` nullable + 1 `ADD COLUMN NOT NULL DEFAULT 1` + 1 `CREATE INDEX`; zero DROP/RENAME/ALTER TYPE; zero backfill từ `Project.isPublic`. `prisma migrate deploy` apply 50/50 migrations clean. |
| `C-09` Contract validity (TASK/HANDOFF coherence, frozen SHA) | `DONE` | TASK §0 và HANDOFF §0 pin đúng `Implementation SHA = c4418bb96f7715d09b856549f44914da38c603cd` và `Baseline/diff range = b34cdddd..c4418bb` (verified tại HEAD `729efa3`). `verify-handoff.ps1` exit 0 với `[OK] H-16 V2 delivery pins a resolvable frozen SHA with no later semantic delta`. |
| `C-10` Diff scope (`c4418bb..HEAD` không có semantic delta) | `DONE` | `git diff --shortstat c4418bb..HEAD` = `2 files changed, 4 insertions(+), 4 deletions(-)`. Hai file duy nhất: `TASK.md` và `HANDOFF.md`. `git diff c4418bb..HEAD -- src app prisma tests scripts packages` = 0 lines. Post-freeze docs-only diff đúng kỳ vọng. |

## 3. Evidence and scope

- **Audited changed surface:** `b34cdddd..c4418bb` gồm 41 files: additive `JobPosting` schema + 1 forward-only migration + `package.json`+`package-lock.json` (4 package Tiptap pinned `3.31.3`) + `src/shared/ui/editor/JobPostingRichTextEditor.tsx` + `src/shared/content/job-posting-rich-text/{index,profile,validator,renderer}.ts(x)` + `__tests__/{profile,validator,renderer}.test.ts(x)` + `src/domains/staffing/job-posting-authoring.service.ts` + `src/domains/staffing/job-posting-list.service.ts` + `app/api/admin/jobs/job-postings/{route, [id]/route, [id]/publish/route, [id]/unpublish/route, [id]/archive/route}.ts` + `app/admin/jobs/job-postings/{page, [id]/page, [id]/editor-shell}.tsx` + `tests/db/job-posting-authoring.integration.test.ts` + vitest configs + carry-in AFF-05A-R2 + carry-in handling-assignment. AFF-05A-R2 là carry-in từ main merge vào branch trước A0; đã có AUDIT riêng tại `docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/AUDIT.md` — không audit lại trong round này.
- **Excluded and why:** post-freeze range `c4418bb..729efa3` chỉ là 4-line SHA retarget giữa TASK/HANDOFF (xác nhận bằng `git diff --shortstat` = 2 files / 4 insertions / 4 deletions, không có file ngoài `docs/tasks/hrp-p1-a0-jobposting-authoring-publish/`); out of scope vì đã đối chiếu thủ công và carry-in tests đã được xác minh nằm ngoài P1-A0 changed surface (`git log tests/db/aff03-public-intake.integration.test.ts` cho thấy 5 commit gốc `9e527a1..3b8074f` đều trước baseline `b34cdddd`).

| Evidence | Command / method | Exit / measured result | Mapping |
|---|---|---|---|
| `AE-01` | `npx prisma validate` (worktree detached `729efa3`) | exit 0; `The schema at prisma/schema.prisma is valid` | `AC-01` |
| `AE-02` | `npx prisma migrate deploy` trên Tier 3 ephemeral synthetic DB `127.0.0.1:5434/hrp_test` | exit 0; `All migrations have been successfully applied.` (50/50 migrations, gồm `20260924180000_p1a0_jobposting_content_fields`) | `AC-01`, `AC-02`, `AC-08` |
| `AE-03` | `npm run typecheck` | exit 0 | `AC-10`, `C-06` |
| `AE-04` | `npm run lint` | exit 0; 0 errors, 705 warnings (carry-in baseline không thuộc P1-A0) | `AC-10`, `C-06` |
| `AE-05` | `npm run test:unit` (vitest.unit.config.ts force `DATABASE_URL=postgresql://***:***@127.0.0.1:1/blocked` — fail-closed sentinel RQ-05/RQ-06) | exit 0; **169 test files / 2629 passed / 9 skipped** | `AC-03`, `AC-04`, `AC-05`, `AC-07`, `AC-08`, `AC-11`, `AC-12`, `C-06` |
| `AE-06` | `npm run build` | exit 0; `next build` completed; routes gồm `/viec-lam` + `/viec-lam/[slug]` (P1-A1 public, không bị A0 touch) | `AC-10`, `C-05` |
| `AE-07` | Tier 3 ephemeral synthetic DB integration lane: `initdb -A trust --locale-provider=builtin --builtin-locale=C --encoding=UTF8` → cluster trên `127.0.0.1:5434` → `node scripts/ci/container-test-db.mjs --phase=pre` (8 roles + 11 grants) → `prisma migrate deploy` (50/50) → `--phase=post` (8 roles + 1 grant) → `assert-test-db-posture.mjs` (`POSTURE_OK writer_is_writer admin_is_admin same_target`) → `npx vitest run --config vitest.integration.config.ts` | exit 1 (tổng) nhưng `tests/db/job-posting-authoring.integration.test.ts` = **13/13 PASS**; carry-in `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` = 6/6 PASS; carry-in `tests/db/handling-assignment.integration.test.ts` = 4/4 PASS; 28 files total: 27 passed + 1 failed (AFF-03B carry-in Unicode locale, ngoài P1-A0 changed surface); 502 tests: 499 passed + 1 failed (AFF-03B) + 2 skipped | `AC-03`, `AC-04`, `AC-05`, `AC-06`, `AC-07`, `AC-08`, `AC-09`, `AC-11`, `AC-14`, `C-08`, `AUD-006` |
| `AE-08` | `git show c4418bb:prisma/migrations/20260924180000_p1a0_jobposting_content_fields/migration.sql` | exit 0; 7 × `ADD COLUMN` (6 nullable + 1 NOT NULL DEFAULT 1) + 1 `CREATE INDEX`; zero DROP/RENAME/ALTER TYPE | `AC-02`, `C-08` |
| `AE-09` | `npx --no-install npm list @tiptap/react@3.31.3 @tiptap/pm@3.31.3 @tiptap/starter-kit@3.31.3 @tiptap/static-renderer@3.31.3 @tiptap/core@3.31.3 --depth=0` | exit 0; cả 5 packages tại exact version `3.31.3` (5/5 match); 0 package nào có version khác hoặc thứ hai trong tree | `AC-13`, `C-05` |
| `AE-10` | `rg "dangerouslySetInnerHTML" app/admin/jobs/job-postings src/shared/ui/editor` | exit 0; 0 hits (chỉ match comment trong `renderer.tsx` giải thích non-use) | `AC-10`, `C-05` |
| `AE-11` | `rg "jobPostingId" prisma/schema.prisma src/domains/talent/intake-writer.service.ts` | exit 0; 0 hits | `AC-14` |
| `AE-12` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath 'docs/tasks/hrp-p1-a0-jobposting-authoring-publish/TASK.md'` | exit 0; `RESULT: DRAFT-VALID (1 warning(s))` | `C-01`, `C-09` |
| `AE-13` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath 'docs/tasks/hrp-p1-a0-jobposting-authoring-publish/TASK.md'` | exit 0; `RESULT: PASS. HANDOFF.md is re-runnable; Tier 3 may open an audit round on it.` | `C-01`, `C-09`, `C-10` |
| `AE-14` | `git diff --check b34cdddd..c4418bb` + `git diff --check c4418bb..729efa3` | exit 0 cho cả hai; no whitespace conflicts, no BOM/mojibake in changed docs | `C-07`, `C-10` |
| `AE-15` | `git diff --stat c4418bb..HEAD` + `git diff c4418bb..HEAD -- src app prisma tests scripts packages` | exit 0; 2 files / 4 insertions / 4 deletions trên docs-only path; 0 lines trên src/app/prisma/tests/scripts/packages | `C-10` |

> Tier 3 evidence logs (gate outputs, integration lane log) đã lưu ở `C:\Temp\t3-evidence\` ngoài repo để không đụng working tree (Tier 3.md cấm sửa source/test/migration; theo spirit chỉ để lại AUDIT.md làm Tier 3 artifact). Tier 1 / T0 có thể yêu cầu Tier 3 publish evidence nếu cần tái kiểm.

## 4. Verdict and carry-forward

- **Verdict:** `PASS`
- **Open release blockers:** `None`
- **Non-blocking debt:**
  - `AUD-001..005` — HANDOFF.md wording drift (còn text về `2c240e5`/`27-27 test files`/`14 validator cases`/`168 files` dù thực tế đã pin lại về `c4418bb` / 28 files / 29 cases / 169 files tại HEAD `729efa3`). Owner: T0/Owner — debt; không chặn PASS; đã thông báo, không mở correction batch mới vì budget Tier 1 đã consume 1/1 theo T0 directive.
  - `AUD-006` — Tier 3 env limitation: cluster ephemeral local dựng với `--builtin-locale=C` thiếu Vietnamese ICU collation làm 1 carry-in test (`tests/db/aff03-public-intake.integration.test.ts` AC-13) fail; file này nằm ngoài P1-A0 changed surface. Owner: Tier 3 — env limitation đã phân loại rõ trong AUDIT; không đề xuất correction batch.
- **Reason:** 14/14 AC PASS; C-07/C-09/C-10 mandatory PASS; gate verify-task PASS; gate verify-handoff PASS; canonical gates (typecheck, lint, test:unit, build, prisma validate, prisma migrate deploy) PASS; P1-A0 changed-surface integration test (`tests/db/job-posting-authoring.integration.test.ts`) 13/13 PASS trên Tier 3 ephemeral synthetic DB tách biệt với cluster Tier 1. Carry-in failure (`AUD-006`) nằm ngoài P1-A0 changed surface — không chặn. Tất cả findings đã được báo đầy đủ trong cùng round này (`AUD-001..006`); không giữ finding cho round sau.
- **Carry-forward:** `None` (audit round 1, depth LIGHT, correction batch 0; không có AC nào CARRIED_FORWARD).
- **Surface-completeness statement:** Đã báo toàn bộ finding quan sát được trên current changed surface; không giữ finding cho round sau.
- **DELTA boundary:** `N/A` (audit round 1, không có correction batch trước).

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
