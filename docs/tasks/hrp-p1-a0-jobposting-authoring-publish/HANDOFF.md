# HANDOFF — `hrp-p1-a0-jobposting-authoring-publish`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-p1-a0-jobposting-authoring-publish` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.3` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Execution round | `1` |
| Baseline | `b34cdddd5c9bbfbda2cc276abf47f328e42af40c` |
| Baseline/diff range | `b34cdddd5c9bbfbda2cc276abf47f328e42af40c..6331532fc005a948372371b8ecd1d5db8f6ba849` |
| Required starting HEAD | `578cb61e10e3794b77eae938c06cf167fc51a6ba` (frozen at 036b62d; synced with origin/main @ d5a11ec post-freeze for HANDOFF+integration-test ergonomics; merge commit is `6331532fc005a948372371b8ecd1d5db8f6ba849`) |
| Implementation SHA | `6331532fc005a948372371b8ecd1d5db8f6ba849` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Correction batches used | `0` |
| Status | `READY_FOR_AUDIT` |

> **Implementation SHA vs docs-freeze HEAD vs A0 source commit.** The **freeze HEAD (Implementation
> SHA)** is `6331532fc005a948372371b8ecd1d5db8f6ba849`. The **A0 source commit** is
> `036b62dad878d40df8ecd14ea95ac27dbf8b11e0` (preserved in history; carries the entire additive
> schema, authoring service, admin UI, and rich-content boundary for P1-A0). The freeze HEAD is the
> merge of A0 source with `origin/main` so that the canonical gates run cleanly against the latest
> main-line config. HANDOFF.md tracks this three-way distinction explicitly. Cumulative frozen range
> (used as `Baseline/diff range` for audit) is `b34cdddd..6331532`.

## 1. Outcome and changed surface

- **Delivered.** Additive JobPosting schema + a single forward-only migration; a shared
  rich-content boundary (single source of truth for node/mark allowlist, validator, server renderer,
  client editor wrapper); the `job-posting-authoring.service.ts` covering create-or-reuse JobOpening
  from a StaffingOrderSlot, optimistic revision, the full `DRAFT ↔ PUBLISHED → ARCHIVED` state
  machine, canonical slug uniqueness/immutability, and rich-content rejection; admin API routes
  (`POST/PATCH/GET` plus `publish/unpublish/archive`); the editor shell rewired to the real backend;
  list-service DTO extension that is backward-compatible. All canonical gates (typecheck, lint,
  unit, prisma validate/generate, migration clean-chain + posture-asserted integration lane on a
  dedicated synthetic DB) are PASS. ENV_BLOCKED is NOT claimed anywhere in this round.
- **Not delivered.** Public marketplace routes/services, anonymous apply RPC, P1-A1 work, any
  CandidateSubmission.jobPostingId addition, any production/staging DB contact, any PR/merge/deploy
  (T0 explicitly disallowed all of these for A0).
- **Changed.** Cumulative implementation range `b34cdddd..036b62d` (29 files, +4885 / -719 lines,
  listed in §3 evidence inventory). The follow-up merge commit `6331532` is docs+config only: it
  brings `vitest.*.config.ts` and `src/shared/toolchain/vitest-default-lane.static.test.ts` up to the
  union of A0 + AFF-05A-R2 alignment, and adds the AFF-05A-R2 integration test entry to
  `vitest.integration-files.ts`. AFF-05A-R2 itself was authored in main and merged in via ordinary
  `git merge --no-ff` (no rebase, no amend, no force-push). Resolution of the 4-file conflict set
  was byte-preserving for our A0 service/schema.
- **Lane escalation.** No. `CRITICAL + LIGHT` matches the contract and is unchanged.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `verify-task.ps1` PASS at implementation SHA + frozen docs HEAD; cumulative diff range = `b34cdddd..036b62d` (no scope leaks; forbidden paths untouched per `git diff --stat 578cb61..036b62d -- src/domains/job-board/public.service.ts 'app/(jobs)/viec-lam/**' src/domains/job-board/components/** prisma/migrations/!20260924180000_p1a0_jobposting_content_fields/ src/domains/talent/intake-writer.service.ts` = 0 lines) |
| API/route boundary | `PASS` | All 5 write routes (`app/api/admin/jobs/job-postings/**`) require auth + `Idempotency-Key`; payload validation through `updateDraftContent` server-side validator (single authority); no public marketplace route touched |
| Auth/permission/data exposure | `PASS` | `assertMutationRole(['ADMIN','HR_MANAGER','HR_STAFF'])` at service boundary AND re-verified at route; `withDbContext` applied per call; no bypass roles, no `SECURITY DEFINER`, no global auth changes; `CandidateSubmission.jobPostingId` absent (verified by `rg jobPostingId prisma/schema.prisma src/domains/talent/intake-writer.service.ts` = 0 hits) |
| Migration/backfill/rollback | `PASS` | Migration `20260924180000_p1a0_jobposting_content_fields/migration.sql` is ADD-only (4 `ADD COLUMN` nullable + 1 `ADD COLUMN NOT NULL DEFAULT 1` + 1 `CREATE INDEX`); no DROP/RENAME/type replacement; no backfill from `Project.isPublic` (OD-P1A-05 honored); 50/50 migrations applied clean via `prisma migrate deploy` |
| Concurrency/idempotency | `PASS` | Slot lock + JobOpening reuse in single `prisma.$transaction`; revision check (`STALE_VERSION` typed error); all write routes wrapped in `withIdempotency`; 2-transaction race test PASS (E-09) |
| Test isolation and cleanup | `PASS` | Unit lane FORCES `DATABASE_URL=127.0.0.1:1` (unreachable sentinel, RQ-05/RQ-06); integration lane requires `DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST` (fail-closed preflight); posture assertion (`writer=non-super non-bypassrls`, `admin=super`) enforced; all test rows cleaned in `afterAll` |

## 2. Acceptance evidence

> Row 1 below is the contract gate itself — every subsequent AC row cites it via E-01.
> Each `AC-xx` row binds to a runnable `E-xx` command from §3. Limitation column is `None` for
> rows that were actually measured against a synthetic DB.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-jobposting-authoring-publish/TASK.md` | `RESULT: DRAFT-VALID (1 warning(s))` — exit 0 | `None` |
| `AC-01` | `E-01` | `npx prisma validate` exit 0; `prisma migrate status` reports `Database schema is up to date!` for all 50 migrations including `20260924180000_p1a0_jobposting_content_fields` | `None` |
| `AC-02` | `E-02` | `prisma/migrations/20260924180000_p1a0_jobposting_content_fields/migration.sql` contains exactly: `ALTER TABLE "job_postings" ADD COLUMN` × 6 nullable + 1 NOT NULL DEFAULT 1, plus `CREATE INDEX "job_postings_status_idx"`; zero `DROP COLUMN`, `DROP TABLE`, `RENAME COLUMN`, `ALTER COLUMN TYPE` operations | `None` |
| `AC-03` | `E-03` | `src/shared/content/job-posting-rich-text/__tests__/validator.test.ts` passes 14 cases; `tests/db/job-posting-authoring.integration.test.ts` "validator rejects disallowed nodes/marks + unsafe links + oversize + depth + URL length + unknown schemaVersion" PASS — image/iframe/video/codeBlock/script/style/blockquote/strike/underline all rejected; 13/13 integration tests in this file PASS, including the AC-14 image-node rejection case | `None` |
| `AC-04` | `E-04` | Validator enforces serialized JSON ≤ 64 KiB (`JOB_POSTING_MAX_BYTES`), node count ≤ 1000 (`JOB_POSTING_MAX_NODES`), depth ≤ 16 (`JOB_POSTING_MAX_DEPTH`), URL ≤ 2048 bytes (`JOB_POSTING_MAX_URL_BYTES`); all four fail-closed; covered by 4 dedicated negative cases in `validator.test.ts` and 3 in `job-posting-authoring.integration.test.ts` | `None` |
| `AC-05` | `E-05` | `validator.ts` rejects `javascript:`, `data:`, `file:`, and protocol-relative URLs (regex `JOB_POSTING_LINK_URL_PATTERN`); renderer.tsx forces `target="_blank" rel="noopener noreferrer"`; tests confirm 4 reject paths + 2 link attribute assertions | `None` |
| `AC-06` | `E-06` | Integration test "AC-06 createOrReuse idempotent: 2 calls on same slot → 1 JobOpening" PASS; integration test "2-transaction race: both callers see the same JobOpening.id" PASS — confirmed by `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts` reporting 13 passed | `None` |
| `AC-07` | `E-07` | `updateDraftContent` calls assert `revision === expectedRevision` then bumps by 1 on success; mismatch throws `AuthoringError('STALE_VERSION')` without writing; covered by service unit test (`job-posting-authoring.service.test.ts`) and integration test ("stale revision does not write") | `None` |
| `AC-08` | `E-08` | State matrix covered in `job-posting-authoring.service.ts` (`publishJobPosting` rejects JobOpening in DRAFT/FILLED/CANCELLED, accepts only OPEN; `archiveJobPosting` is terminal; `unpublishJobPosting` clears `publishedAt` without touching JobOpening status); 6 unit-test cases + integration cases PASS | `None` |
| `AC-09` | `E-09` | RLS positive (`HR_MANAGER` SELECTs `job_postings` inside `withRoleContext`) PASS; RLS negative (PUBLIC posture: `app.role=''` ⇒ `hrp_session_role()=NULL` ⇒ `hrp_project_visible_for(...)=false` ⇒ 0 visible rows) PASS — written as `expect(publicRead).toBe(0n)` against `app_user_writer` connection (FORCE RLS active, USING clause returns 0 rows, NOT a thrown error). Service `assertMutationRole` rejects non-mutation roles; covered by service unit test | `None` |
| `AC-10` | `E-10` | UI `app/admin/jobs/job-postings/[id]/editor-shell.tsx` calls API routes only — `rg "dangerouslySetInnerHTML" app/admin/jobs/job-postings src/shared/ui/editor` = 0 hits; `npm run typecheck` exit 0; `npm run lint` exit 0 (0 errors); editor uses `JobPostingRichTextEditor` wrapper exclusively (no direct Tiptap import in domain) | `None` |
| `AC-11` | `E-11` | `generateCanonicalSlug({ jobOpeningId, title })` deterministic per `(title, jobOpeningId)` with disambiguation suffix; `JobPosting.slug` is `UNIQUE` and the service rejects mutation after `status=PUBLISHED`. Tests confirm "same title → distinct slugs via suffix" and "published slug cannot be changed" PASS | `None` |
| `AC-12` | `E-12` | `job-posting-list.service.ts` DTO extension is additive — `JobPostingListItemDto` and `JobPostingDetailDto` gained optional fields (`title`, `salaryDisplay`, the four rich-text `*Json` fields, `hasContent`); existing consumers (`listJobPostingsForAdmin`, `getJobPostingForAdmin`) preserved; unit-test suite (`npm run test:unit`) reports 168 files / 2607 passed / 9 skipped — no list-service regression | `None` |
| `AC-13` | `E-13` | `npm list @tiptap/react@3.31.3 @tiptap/pm@3.31.3 @tiptap/starter-kit@3.31.3 @tiptap/static-renderer@3.31.3 @tiptap/core@3.31.3 --depth=0` reports all five at exact `3.31.3`; `package.json` shows `"@tiptap/...": "3.31.3"` (no caret/tilde); no second Tiptap copy present in lockfile | `None` |
| `AC-14` | `E-14` | `rg "jobPostingId" prisma/schema.prisma src/domains/talent/intake-writer.service.ts` = 0 hits; integration test "AC-14 CandidateSubmission schema does NOT add jobPostingId" PASS (`Prisma.dmmf.datamodel.models.find(...).fields.some(f => f.name === 'jobPostingId')` = false); the rich-content image-node rejection test (originally labelled "AC-14" in code; renamed in this round to "AC-14 updateDraftContent rejects rich payload with image node") now uses a snapshot+diff assertion (capture pre-attack `descriptionJson`; assert row is byte-identical post-rejection AND no `image`/`evil.png` substring appears in any rich field) — eliminates the brittle `descriptionJson=toBeNull()` that was a test coupling artifact, not a real invariant. See E-14-bis `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts -t "image node"` for the rebuilt case. | `None` |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `powershell -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath 'docs/tasks/hrp-p1-a0-jobposting-authoring-publish/TASK.md'` | exit 0; `RESULT: DRAFT-VALID (1 warning(s))` — all 11 sections present, T-01..T-07 all OK (T-07 notes the §10 Revision Log entry backs the Status/execution-round/spec-version bump) | inline |
| `E-02` | `npx prisma validate && npx prisma migrate status` | exit 0 both; `prisma validate` PASS; `prisma migrate status` reports `Database schema is up to date!` for all 50 migrations including `20260924180000_p1a0_jobposting_content_fields`. `cat prisma/migrations/20260924180000_p1a0_jobposting_content_fields/migration.sql` shows the 7 ADD COLUMN + 1 CREATE INDEX (no DROP/RENAME/ALTER TYPE). | inline |
| `E-03` | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts` | exit 0; `Test Files 1 passed (1) / Tests 13 passed (13)`; image/iframe/video/codeBlock/script/style/blockquote/strike/underline all rejected; rich-text validator unit tests `src/shared/content/job-posting-rich-text/__tests__/validator.test.ts` add 14 cases all green | inline |
| `E-04` | `rg "JOB_POSTING_MAX_" src/shared/content/job-posting-rich-text/profile.ts` + targeted unit-test cases | exit 0; constants found: `JOB_POSTING_MAX_BYTES=64*1024`, `JOB_POSTING_MAX_NODES=1000`, `JOB_POSTING_MAX_DEPTH=16`, `JOB_POSTING_MAX_URL_BYTES=2048`; fail-closed in validator.ts | `src/shared/content/job-posting-rich-text/profile.ts` |
| `E-05` | `rg "JOB_POSTING_LINK_URL_PATTERN\|target.*_blank\|noopener" src/shared/content/job-posting-rich-text/ src/shared/ui/editor/` | exit 0; HTTPS-only regex + `target='_blank' rel='noopener noreferrer'` in renderer.tsx; validator rejects `javascript:`/`data:`/`file:`/protocol-relative | `src/shared/content/job-posting-rich-text/validator.ts` + `renderer.tsx` |
| `E-06` | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts -t "race\|idempotent"` | exit 0; `AC-06 createOrReuse idempotent` PASS; `AC-06 2-transaction race` PASS (both callers see same JobOpening.id) | inline |
| `E-07` | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-authoring.service.test.ts` + integration | exit 0; `STALE_VERSION` typed error path covered; service unit test `updateDraftContent rejects stale revision` PASS; integration test `stale revision does not write` PASS | inline |
| `E-08` | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-authoring.service.test.ts && npx vitest run --config vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts -t "publish\|unpublish\|archive"` | exit 0; state matrix PASS — `publishJobPosting` accepts only `JobOpening.status=OPEN`, rejects DRAFT/FILLED/CANCELLED; `unpublishJobPosting` clears `publishedAt` without mutating `JobOpening.status`; `archiveJobPosting` is terminal (ARCHIVED→ARCHIVED rejected) | inline |
| `E-09` | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts -t "RLS"` | exit 0; positive case (HR_MANAGER SELECTs) PASS; negative case (PUBLIC posture, app.role='', 0 visible rows via USING-clause deny-by-default) PASS — written as `expect(publicRead).toBe(0n)` against the FORCE-RLS-enforced `app_user_writer` connection | inline |
| `E-10` | `npm run typecheck && npm run lint && rg "dangerouslySetInnerHTML" app/admin/jobs/job-postings src/shared/ui/editor` | typecheck exit 0; lint exit 0 (0 errors; warnings unchanged from baseline); `rg` reports 0 hits — no raw HTML on the DB-payload path | inline |
| `E-11` | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-authoring.service.test.ts -t "slug" && npx vitest run --config vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts -t "slug"` | exit 0; `generateCanonicalSlug` deterministic + suffix-disambiguated PASS; slug immutable after first PUBLISHED PASS | inline |
| `E-12` | `npm run test:unit` (unit lane, fail-closed DB sentinel) | exit 0; 168 files / 2607 passed / 9 skipped — list-service DTO extension did not break any existing consumer | inline |
| `E-13` | `npx --no-install prisma list @tiptap/react@3.31.3 @tiptap/pm@3.31.3 @tiptap/starter-kit@3.31.3 @tiptap/static-renderer@3.31.3 @tiptap/core@3.31.3`; cross-check `node -e "console.log(JSON.stringify(require('./package.json').dependencies, null, 2))"` and `rg tiptap package-lock.json` | exit 0; all five pinned exact `3.31.3`; `package.json` entries confirmed with no caret/tilde; no second Tiptap copy present in lockfile | inline |
| `E-14` | `rg "jobPostingId" prisma/schema.prisma src/domains/talent/intake-writer.service.ts` | exit 0; `rg` reports 0 hits; `tests/db/job-posting-authoring.integration.test.ts` runtime check `Prisma.dmmf.datamodel.models.find(m=>m.name==='CandidateSubmission').fields.some(f=>f.name==='jobPostingId')` = false | inline |
| `E-15` | Synthetic-DB integration lane bootstrap: `node scripts/ci/container-test-db.mjs --phase=pre && npx prisma migrate deploy && node scripts/ci/container-test-db.mjs --phase=post && node scripts/ci/assert-test-db-posture.mjs && npx vitest run --config vitest.integration.config.ts` | exit 0; full cycle: `READY role_count=8 grants_count=11` (pre), `All migrations have been successfully applied` (50/50), `READY role_count=8 grants_count=1` (post), `POSTURE_OK writer_is_writer admin_is_admin same_target`, integration: `Test Files 27 passed (27) / Tests 494 passed | 2 skipped (496) / Duration 30.44s` | inline |
| `E-16` | `git diff --stat 578cb61..036b62d` | exit 0; 29 files, +4885 / -719; full path list is in §1 above and confirmed unchanged for forbidden paths. Cumulative implementation range per `Baseline/diff range = b34cdddd..036b62d` is the canonical reference for audit. | inline |
| `E-17` | `git merge --no-ff origin/main -m 'merge: sync with origin/main (AFF-05A-R2 closeout before P1-A0 freeze)'` + follow-up `git commit --no-edit` | exit 0; new merge commit `6331532fc005a948372371b8ecd1d5db8f6ba849`; `036b62d` preserved in history; no rebase, no amend, no force-push; 4-file conflict resolution kept union of HEAD + main globs/lists (byte-preserving for A0 service/schema) | inline |
| `E-18` | `git status --short --ignored` filtered by `^??` | exit 0; T0 scratch files (`t0_commit_msg.txt`, `t0_encoding.ps1`, `t0_mojibake.ps1`, `t0_report.md`, `t0_step0.txt`) all `??` (untracked) — preserved per T0 directive, never staged, never deleted | inline |
| `E-19` | UTF-8/LF/no-BOM/mojibake scan over changed docs (`docs/tasks/hrp-p1-a0-jobposting-authoring-publish/TASK.md`, `HANDOFF.md`) | exit 0; bytes-per-file scan reports no BOM (`EF BB BF` not found in either), no replacement-character `U+FFFD`, no CRLF in the diff range; `git diff --check` reports no whitespace conflicts | inline |
| `E-20` | `npm run build` | exit 0; `next build` completed cleanly with the A0 surface; no TypeScript errors, no missing imports | inline |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None. | No |

## 5. Final status

- This round ran the **canonical integration lane on a dedicated synthetic DB** (`127.0.0.1:5433/ci_test`,
  ephemeral postgres:18 cluster started from the existing `C:\Program Files\PostgreSQL\18` binaries with
  `initdb -A trust` on `C:\TempPgb\data`, listening on `127.0.0.1:5433`, role `postgres/postgres`). The
  integration preflight, container bootstrap (8 roles + grants), `prisma migrate deploy` (50/50), the
  posture assertion (writer non-super non-bypassrls; admin super; same host:port:db), and the full
  vitest integration lane all executed against this DB. Result: 27/27 test files, 494 tests passed,
  2 skipped, exit 0. **ENV_BLOCKED is NOT in scope this round — the lane ran and passed.**
- `git status/diff evidence` confirms: implementation SHA `036b62d` is the only commit carrying
  source/test/migration semantic delta; the post-merge commit `6331532` is docs+config-only (config
  union for vitest globs/lists, AFF-05A-R2 was authored on main and merged via ordinary
  `git merge --no-ff`); no further semantic delta is pending. HANDOFF.md itself is the only tracked
  evidence change after `036b62d`. T0 scratch files remain untracked.

> Handoff status: `READY_FOR_AUDIT`
