# AUDIT â€” `hrp-p1-a1-canonical-public-job-detail`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-p1-a1-canonical-public-job-detail` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.6` |
| Assurance lane | `CRITICAL` |
| Audit mode (TASK) | `LIGHT` |
| Audit depth | `LIGHT` |
| Execution round | `3` |
| Audit round | `1` |
| Baseline | `91525013fc2720a3803e808baac39e1c4497daf6` |
| Implementation SHA | `cb31044ac3ef1d56f23750ea7caad790f533d2c9` |
| Delivery HEAD / docs-freeze SHA | `b8a4e8b31a918b19ca1f447136a00fa45e222a12` |
| Finding completeness | `COMPLETE_CURRENT_SURFACE` |
| Correction batch | `0` |
| Auditor | `Tier 3 â€” independent session, detached worktree t3-p1a1-audit` |

> Tier 3 opens this LIGHT audit on the frozen delivery HEAD `b8a4e8bâ€¦`. The semantic implementation SHA `cb31044aâ€¦` (T0 DB-gate closure) sits one commit before `b8a4e8bâ€¦` and is the audited code surface. Docs-freeze range `cb31044aâ€¦â†’b8a4e8bâ€¦` contains exactly 2 files (TASK.md + HANDOFF.md, 51 insertions / 46 deletions), no semantic drift. The `Implementation SHA` field above is the semantic pin that matches HANDOFF Â§0 (the delivery HEAD is recorded separately under `Delivery HEAD / docs-freeze SHA`).

## 1. Findings

| ID | Severity | Release-blocking | Status | Finding / reproduction / impact | Planner decision |
|---|---|---|---|---|---|
| â€” | â€” | â€” | â€” | None | â€” |

Tier 3 scoped the changed surface (`91525013â€¦â†’cb31044aâ€¦` = 26 files, +5549/-1581) and the docs-freeze surface (`cb31044aâ€¦â†’b8a4e8bâ€¦` = 2 files, +51/-46). All 12 AC and 8 evaluation checks resolved to PASS with measured evidence. P0/P1 left empty by construction; no P2 release-blocking observed; P3 (LINT 707 warnings) is pre-existing and explicitly tracked outside this audit (HANDOFF Â§2 E-03).

P0/P1 luÃ´n cháº·n. P2 chá»‰ cháº·n khi `Release-blocking: YES`; P2 khÃ´ng cháº·n vÃ  P3 Ä‘i vÃ o debt/backlog cÃ³ owner.

Tier 3 pháº£i liá»‡t kÃª toÃ n bá»™ finding quan sÃ¡t Ä‘Æ°á»£c trÃªn current changed surface trong round nÃ y. KhÃ´ng giá»¯ láº¡i finding Ä‘Ã£ tháº¥y Ä‘á»ƒ má»Ÿ round sau.

## 2. Verification

### 2.1 Acceptance criteria

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `Get-Content src/domains/job-board/public.service.ts -Raw + Select-String "status: 'PUBLISHED'"` (re-run in `t3-p1a1-audit` worktree) | `PASS` | exit 0; 2 matches inside `where: { status: 'PUBLISHED' }` at `listPublicJobProjection` line 785 and `getPublicJobDetail` line 904; `npm run test:unit` exit 0 with `Test Files 169 passed (169) / Tests 2630 passed + 9 skipped (2639)` re-measured by auditor (see E-T3-12) | None |
| `AC-02` | `Get-Content src/domains/job-board/public.service.ts -Raw + Select-String "DRAFT+ARCHIVED"` + integration test registration check | `PASS` | exit 0; service has 2 `status: 'PUBLISHED'` gates and 0 `DRAFT/ARCHIVED` returns in `public.service.ts` (DRAFT rejected at `where` filter before reaching mappers); `vitest.integration-files.ts` registers `tests/db/p1a1-jobposting-public-apply.integration.test.ts` at line 105 (verified via `Get-Content vitest.integration-files.ts + Select-String "p1a1-"` = 2 hits) | None |
| `AC-03` | `rg -F "dangerouslySetInnerHTML" "app/(jobs)/viec-lam" src/shared/content 2>&1 + Measure-Object` | `PASS` | exit 0; 1 hit, all in `src/shared/content/job-posting-rich-text/renderer.tsx` line 13 of a defensive comment reading `Renders text inside HTML elements (NOT dangerouslySetInnerHTML)`; 0 functional hits; `Get-Content src/shared/content/job-posting-rich-text/renderer.tsx + Select-String "renderJSONContentToReactElement"` returns 1 hit confirming usage of `@tiptap/static-renderer/json/react`; `npm run typecheck` exit 0 | None |
| `AC-04` | `Get-Content src/shared/content/job-posting-rich-text/validator.ts -Raw + Select-String "INVALID_LINK_URL+UNSUPPORTED_NODE+UNSUPPORTED_MARK+INVALID_HEADING_LEVEL+https://"` + `Get-Content package.json -Raw + Select-String '"@tiptap/static-renderer"'` | `PASS` | exit 0; validator rejects 9 error codes (INVALID_JSON, SCHEMA_VERSION_MISMATCH, PAYLOAD_TOO_LARGE, TOO_MANY_NODES, DEPTH_EXCEEDED, UNSUPPORTED_NODE, UNSUPPORTED_MARK, INVALID_HEADING_LEVEL, INVALID_LINK_URL) at lines 36-45; HTTPS-only check at validator.ts line 252 (`if (!lower.startsWith('https://'))`); package.json pin reads `"@tiptap/static-renderer": "3.31.3"`; `npm ls @tiptap/static-renderer --depth=0` returns `3.31.3` | None |
| `AC-05` | `rg -F "Ná»™i dung Ä‘ang Ä‘Æ°á»£c cáº­p nháº­t" "app/(jobs)/viec-lam/[slug]/page.tsx"` + `Get-Content src/shared/content/job-posting-rich-text/renderer.tsx -Raw + Select-String "ok: false+ok: true"` | `PASS` | exit 0; the string appears only in a defensive comment at `app/(jobs)/viec-lam/[slug]/page.tsx` line 470 reading `khÃ´ng render fallback`; no functional rendering of that placeholder text; `RichTextSection` returns `null` at line 487 when `rendered.ok` is `false`; renderer emits `ok: false` with `reason` at `src/shared/content/job-posting-rich-text/renderer.tsx` line 51+69; `npm run test:unit` exit 0 includes `src/shared/content/job-posting-rich-text/__tests__/renderer.test.tsx` line 41-49 (`fails closed on invalid doc`) and line 46-49 (`fails closed on unknown schemaVersion`) | None |
| `AC-06` | `Get-Content "app/(jobs)/viec-lam/[slug]/page.tsx" -Raw + Select-String "publicJobMetaText+publicJobDetailPath"` + `rg -F "detail-sections.fixture" "app/(jobs)/viec-lam"` | `PASS` | exit 0; page.tsx line 198 calls `publicJobMetaText(job)` and line 202 calls `publicJobDetailPath(job.slug)` inside `generateMetadata`; `rg -F "detail-sections.fixture" "app/(jobs)/viec-lam"` exit 1 (0 matches) â€” fixture authority removed; `npm run typecheck` exit 0 | None |
| `AC-07` | `Get-Content src/shared/content/job-posting-rich-text/renderer.tsx -Raw + Select-String "schemaVersion+JOB_POSTING_RICH_TEXT_ALLOWED"` + `Get-Content src/shared/content/job-posting-rich-text/validator.ts -Raw + Select-String "ALLOWED_NODES+ALLOWED_MARKS+ALLOWED_HEADING_LEVELS"` | `PASS` | exit 0; renderer.tsx reads `JOB_POSTING_RICH_TEXT_ALLOWED_NODES`, `JOB_POSTING_RICH_TEXT_ALLOWED_MARKS`, `JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS` from shared profile; validator.ts enforces the same 3 sets at lines 142 + 226 + 150; renderer fails closed on schema mismatch (renderer.tsx line 68-71); unit test `src/shared/content/job-posting-rich-text/__tests__/renderer.test.tsx` line 17-71 covers 4 cases (valid doc renders, invalid doc fails, schemaVersion 99 fails, link target+rel enforced) | None |
| `AC-08` | `rg -F "projectId+jobOpeningId+slotId" "app/api/public/jobs/[slug]/applications/route.ts"` + `Get-Content src/domains/applications/application.service.ts -Raw + Select-String "slotId"` | `PASS` | exit 0; route uses `FORBIDDEN_PROVENANCE_FIELDS = new Set(['slotId', 'projectId', 'jobOpeningId'])` at `app/api/public/jobs/[slug]/applications/route.ts` line 69 + `ACCEPTED_FIELDS` shape gate at line 41-52 returning HTTP 400 with message `Field "..." do client cung cáº¥p bá»‹ tá»« chá»‘i`; `src/domains/applications/application.service.ts` `PublicApplyInput` (line 28-43) has NO `slotId` field; `src/domains/applications/apply-helpers.ts` does NOT export a slot-shape validator; unit tests under `src/domains/applications/` (`src/domains/applications/application.service.test.ts` + `src/domains/applications/marketplace-apply.routes.test.ts`) covered by `npm run test:unit` exit 0 (2630 passed) | None |
| `AC-09` | `Get-Content "app/(jobs)/viec-lam/[slug]/page.tsx" -Raw + Select-String "LEGACY_PROJECT_CODE_RE+maybeRedirectLegacyProjectCode"` + `Get-Content src/domains/job-board/public.service.ts -Raw + Select-String "PROJECT_CODE_RE+isProjectCodeQuery"` | `PASS` | exit 0; page.tsx `LEGACY_PROJECT_CODE_RE = /^[A-Z][A-Z0-9]*[-_][A-Za-z0-9_-]*$/` at line 109; `maybeRedirectLegacyProjectCode` at line 179-184 calls `redirect('/viec-lam?q=')` HTTP 307 (to listing, NOT to detail); service PROJECT_CODE_RE regex identical at line 876 + `isProjectCodeQuery` exact match `row.projectCode === search` at line 881; `rg -F "redirect.*viec-lam/" "app/(jobs)/viec-lam"` exit 1 (0 hits â€” no redirect-to-detail) | None |
| `AC-10` | `git diff --stat 91525013fc2720a3803e808baac39e1c4497daf6..cb31044ac3ef1d56f23750ea7caad790f533d2c9 -- src/shared/content/job-posting-rich-text` + `git diff --stat 91525013fc2720a3803e808baac39e1c4497daf6..cb31044ac3ef1d56f23750ea7caad790f533d2c9 -- prisma/schema.prisma package.json package-lock.json` | `PASS` | exit 0; `src/shared/content/job-posting-rich-text` shows no semantic edits in profile.ts/validator.ts and only consume-side usage in `app/(jobs)/viec-lam/[slug]/page.tsx` line 78 `import { renderJobPostingRichText }`; forbidden paths (`prisma/schema.prisma`, `package.json`, `package-lock.json`) return 0 lines | None |
| `AC-11` | `Get-Content prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql -Raw + Select-String "s.id = jo.staffing_order_slot_id+s.staffing_order_id = jo.staffing_order_id+s.job_opening_id = jo.id"` | `PASS` | exit 0; the 3 atomic chain conditions appear TWICE inside SECURITY DEFINER body (lines 255-257 inside IF NULL branch + lines 272-274 inside ELSE branch); mismatched chain returns 0 rows and fails closed with `JOB_NOT_AVAILABLE` (P0011) at line 286; `tests/db/p1a1-jobposting-public-apply.integration.test.ts` line 22-23 lists case 5 `sibling/wrong/expired/full slot â†’ fail closed` | None |
| `AC-12` | `Get-Content prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql -Raw + Select-String "SECURITY DEFINER+search_path = public, pg_temp+GRANT SELECT ON"` | `PASS` | exit 0; function defined `SECURITY DEFINER` at line 203 + `SET search_path = public, pg_temp` at line 204 (signature preserved); `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE ... TO app_user_writer, app_user` at lines 346-347; `GRANT SELECT ON TABLE job_postings` + `job_openings TO hrp_public_rpc` at lines 166-167; pre-assertions at lines 97-159 + post-assertions at lines 366-472 verify all 10 catalog conditions incl. `prosecdef`, `proconfig`, no PUBLIC EXECUTE, app_user/app_user_writer keep EXECUTE, role posture; `tests/db/p1a1-migration-chain-proof.integration.test.ts` registered at `vitest.integration-files.ts` line 111 | None |

### 2.2 Assurance checks

LIGHT báº¯t buá»™c `C-07`, `C-09`, `C-10`, Ã­t nháº¥t má»™t changed-behavior check vÃ  cÃ¡c check rá»§i ro thá»±c sá»± Ã¡p dá»¥ng.

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-07` Git hygiene | `DONE` | `git status --porcelain` exit 0 with no source/test/migration drift outside `docs/tasks/hrp-p1-a1-canonical-public-job-detail/AUDIT.md` (intent-to-add only); `git diff --check 91525013â€¦â†’cb31044aâ€¦` exit 0 with no whitespace errors across 26 changed files (T3-E-08) |
| `C-09` Contract validity | `DONE` | `pwsh -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md'` exit 0 with `RESULT: DRAFT-VALID (1 warning(s))`; `pwsh -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-handoff.ps1 -TaskPath 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md'` exit 0 with `RESULT: PASS. HANDOFF.md is re-runnable` (T3-E-14 + T3-E-15) |
| `C-10` Diff scope | `DONE` | `git diff --stat 91525013â€¦â†’cb31044aâ€¦` exit 0 with `26 files changed, +5549/-1581` (matches HANDOFF Â§0 cumulative range exact, T3-E-06); `git diff --stat cb31044aâ€¦â†’b8a4e8bâ€¦` exit 0 with `2 files, +51/-46` (TASK.md + HANDOFF.md only, T3-E-07); forbidden paths (`prisma/schema.prisma`, `package.json`, `package-lock.json`, `src/shared/ui/editor`, `src/domains/staffing/job-posting-authoring.service.ts`, `src/domains/job-board/publish.service.ts`) all return 0 lines (T3-E-17) |
| `C-01` Canonical source authority (JobPosting PUBLISHED-only) | `DONE` | `Get-Content src/domains/job-board/public.service.ts -Raw + Select-String "status: 'PUBLISHED'"` exit 0 with 2 hits (line 785 listPublicJobProjection; line 904 getPublicJobDetail); `Get-Content prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql -Raw + Select-String "jp.status = 'PUBLISHED'"` exit 0 with 2 hits (line 259 inside IF branch + line 276 inside ELSE branch) |
| `C-02` Sibling/wrong/expired slot fail closed | `DONE` | `Get-Content prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql -Raw + Select-String "s.id = jo.staffing_order_slot_id AND s.staffing_order_id = jo.staffing_order_id AND s.job_opening_id = jo.id"` exit 0 with 2 hits (lines 255-257 IF branch + lines 272-274 ELSE branch); `RAISE EXCEPTION 'JOB_NOT_AVAILABLE' USING ERRCODE = 'P0011'` at line 286 fires when `v_slot_id IS NULL` |
| `C-03` Migration security + GRANT posture | `DONE` | `Get-Content prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql -Raw + Select-String "SECURITY DEFINER+SET search_path = public, pg_temp+GRANT SELECT ON+REVOKE ALL ON FUNCTION"` exit 0 with 5 hits covering `SECURITY DEFINER` line 203 + `SET search_path` line 204 + `GRANT SELECT` lines 166-167 + `REVOKE ALL ON FUNCTION` line 346 + `GRANT EXECUTE` line 347; `Get-Content prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql -Raw + Select-String "RAISE EXCEPTION"` exit 0 with 18 hits covering both pre-assertion block + post-assertion block |
| `C-04` Integration test registration | `DONE` | `Get-Content vitest.integration-files.ts -Raw + Select-String "p1a1-"` exit 0 with 2 hits (line 105 `tests/db/p1a1-jobposting-public-apply.integration.test.ts` + line 111 `tests/db/p1a1-migration-chain-proof.integration.test.ts`); `Get-Content tests/db/p1a1-jobposting-public-apply.integration.test.ts -Raw + Select-String "ENV_BLOCKED+describe.fail"` exit 0 with 2 hits confirming fail-closed preflight (no fake PASS path) |
| `C-05` Behavior case coverage | `DONE` | `Get-Content tests/db/p1a1-jobposting-public-apply.integration.test.ts -Raw + Select-String "C-05\.[0-9]++case [0-9]+:"` exit 0 with 14 hits covering 12 behavior cases (C-05.1..12): PUBLISHED+OPEN canonical success, DRAFT/ARCHIVED posting reject, DRAFT/FILLED/CANCELLED opening reject, old PRJ-only slug reject, sibling/wrong/expired/full slot reject, browser provenance rejection HTTP 400, idempotency replay, payload mismatch P0010, duplicate application P0012, exact-row-count submission+history, PUBLIC projection visibility, sibling-only render |
| `C-06` Legacy PRJ-xxx compatibility | `DONE` | `Get-Content "app/(jobs)/viec-lam/[slug]/page.tsx" -Raw + Select-String "LEGACY_PROJECT_CODE_RE+maybeRedirectLegacyProjectCode"` exit 0 with 4 hits (regex definition line 109 + helper function lines 179-184 + caller lines 190 + 321); `rg -F "redirect.*viec-lam/" "app/(jobs)/viec-lam"` exit 1 (no redirect-to-detail); `Get-Content src/domains/job-board/public.service.ts -Raw + Select-String "PROJECT_CODE_RE+isProjectCodeQuery"` exit 0 with 3 hits |
| `C-07` (mandatory) Rich-text fail-closed | `DONE` | `Get-Content src/shared/content/job-posting-rich-text/renderer.tsx -Raw + Select-String "ok === true+ok: false"` exit 0 with 4 hits across 2 result-type definitions (`RendererResultOk` + `RendererResultErr`); `Get-Content "app/(jobs)/viec-lam/[slug]/page.tsx" -Raw + Select-String "RichTextSection+rendered.ok+return null"` exit 0 with multiple hits; `RichTextSection` lines 487-493 return `null` when `rendered.ok === false` and `process.env.NODE_ENV !== 'production'` triggers safe `console.warn` with `title + reason` only (no raw payload logged) |
| `C-08` No DRAFT/ARCHIVED leak | `DONE` | `Get-Content src/domains/job-board/public.service.ts -Raw + Select-String "status: 'PUBLISHED'"` exit 0 with 2 hits at line 785 + line 904 (PUBLISHED-only `where` filters in both list + detail paths); `Get-Content app/api/public/jobs/[slug]/applications/route.ts -Raw + Select-String "PUBLISHED"` exit 1 (route delegates to SECURITY DEFINER which checks `jp.status = 'PUBLISHED'` twice inside migration.sql lines 259 + 276) |

Mandatory `C-07`, `C-09`, `C-10` all DONE with measured evidence above. No SKIP carried; no FAIL; every check has both a command and an exit code value.

## 3. Evidence and scope

LIGHT vÃ  DELTA cáº§n Ã­t nháº¥t 2 phÃ©p Ä‘o Ä‘á»™c láº­p, trong Ä‘Ã³ má»™t phÃ©p Ä‘o changed behavior. Má»™t phÃ©p Ä‘o cÃ³ thá»ƒ map nhiá»u AC/check.

- **Audited changed surface:**
  - `app/(jobs)/viec-lam/[slug]/page.tsx` (328 lines net in `91525013â€¦â†’cb31044aâ€¦`)
  - `app/api/public/jobs/[slug]/applications/route.ts` (33 lines diff)
  - `src/domains/job-board/public.service.ts` (320 lines added)
  - `src/domains/applications/application.service.ts` + `src/domains/applications/apply-helpers.ts` (slotId removal)
  - `src/domains/job-board/components/detail/__tests__/detail-sections-policy.test.ts` (91 lines)
  - `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql` (474 insertions)
  - `src/shared/content/job-posting-rich-text/{renderer.tsx,validator.ts,profile.ts,index.ts}` (consume only â€” no allowlist edits)
  - `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (1208 insertions)
  - `tests/db/p1a1-migration-chain-proof.integration.test.ts` (702 insertions)
  - 4 carry-in fixtures aligned to canonical `JobPosting`: `src/domains/applications/live-integration.mp2.test.ts` (775 lines diff), `src/domains/applications/live-integration.ops06a.test.ts` (691 lines diff), `src/domains/job-board/public-card-truth.integration.test.ts` (994 lines diff), `src/shared/auth/live-public-read-rls.go-live-04.test.ts` (474 lines diff)
  - 7 targeted unit tests under `src/domains/{applications,job-board}/**`
  - `vitest.integration-files.ts` (14 insertions, registration of 2 new DB tests)
- **Excluded and why:** unchanged surface per V2_FAST_FREEZE rule; 6 carry-in `*.test.ts` files outside the 4 listed were not modified. Client editor wrapper `src/shared/ui/editor/**` belongs to A0 (forbidden). `prisma/schema.prisma`, `package.json`, `package-lock.json` belong to A0 (forbidden). `src/domains/staffing/job-posting-authoring.service.ts` belongs to A0. `src/domains/job-board/publish.service.ts` is legacy Project.isPublic authority â€” explicitly OUT.
- **Carry-forward scope (DB evidence):** Audit sandbox has no synthetic DB credentials via restricted local channel in this Tier 3 session. Per global rules section 8 + task carry-forward policy, DB suite results from T0 authoritative committed proof at `cb31044ac3ef1d56f23750ea7caad790f533d2c9` are referenced (HANDOFF Â§2 E-11 + E-14 + E-20). The semantic commit message `fix(p1-a1): close synthetic DB gate and canonical fixtures` (verified via `git log cb31044ac3ef1d56f23750ea7caad790f533d2c9 -1 --format=%s`) identifies the commit that closed the synthetic DB gate. Tier 3 did NOT re-run the DB suite in this audit; instead the static + unit + lint + typecheck + build + Prisma validate gates were re-measured against the same frozen SHA.

| Evidence | Command / method | Exit / measured result | Mapping |
|---|---|---|---|
| `E-T3-01` | `git rev-parse HEAD` in `t3-p1a1-audit` | exit 0; HEAD resolves to `b8a4e8b31a918b19ca1f447136a00fa45e222a12` | AC control, C-07 |
| `E-T3-02` | `git rev-parse --verify cb31044ac3ef1d56f23750ea7caad790f533d2c9` | exit 0; semantic implementation SHA resolves to T0 DB-gate closure commit | AC control |
| `E-T3-03` | `git rev-parse --verify b8a4e8b31a918b19ca1f447136a00fa45e222a12` | exit 0; delivery HEAD resolves, matches HANDOFF Â§0 `Delivery HEAD / docs-freeze SHA` | AC control |
| `E-T3-04` | `git rev-parse --verify 91525013fc2720a3803e808baac39e1c4497daf6` | exit 0; baseline resolves, matches TASK Â§0 `Baseline` + HANDOFF Â§0 `Baseline` | AC control |
| `E-T3-05` | `git rev-parse --verify origin/codex/t0-p1a1-db-gate-correction` | exit 0; remote HEAD = `b8a4e8b31a918b19ca1f447136a00fa45e222a12` matches local detached HEAD | AC control |
| `E-T3-06` | `git diff --stat 91525013â€¦â†’cb31044aâ€¦` | exit 0; 26 files changed, +5549/-1581 (byte-exact match to HANDOFF Â§0 cumulative range) | C-10 |
| `E-T3-07` | `git diff --stat cb31044aâ€¦â†’b8a4e8bâ€¦` | exit 0; 2 files (TASK.md 22 +12/-10, HANDOFF.md 75 +39/-36, totals +51/-46) | C-10 |
| `E-T3-08` | `git diff --check 91525013â€¦â†’cb31044aâ€¦` | exit 0; no whitespace errors across 26 files | C-07 |
| `E-T3-09` | `npx prisma validate` | exit 0; `The schema at prisma\schema.prisma is valid` (info notice about `8.0.0-rc.17` is upgrade notice, not failure) | gate canonical |
| `E-T3-10` | `npm run typecheck` | exit 0; `tsc --noEmit` 0 errors | gate canonical |
| `E-T3-11` | `npm run lint` | exit 0; 0 errors, 707 warnings (pre-existing, not introduced by A1) | gate canonical |
| `E-T3-12` | `npm run test:unit` | exit 0; `Test Files 169 passed (169) / Tests 2630 passed + 9 skipped (2639)` | gate canonical, AC-01/03/04/05/06/07/08/12 |
| `E-T3-13` | `npm run build` | exit 0; Next.js production build succeeded | gate canonical |
| `E-T3-14` | `pwsh -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md'` | exit 0; `RESULT: DRAFT-VALID (1 warning(s))` | C-09 |
| `E-T3-15` | `pwsh -NoProfile -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-handoff.ps1 -TaskPath 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md'` | exit 0; `RESULT: PASS. HANDOFF.md is re-runnable` | C-09 |
| `E-T3-16` | `npm ls @tiptap/static-renderer --depth=0` + `grep '"@tiptap/static-renderer"' package.json` | exit 0; tree resolves to `3.31.3`, manifest pin `"3.31.3"` (read-only check) | AC-04 |
| `E-T3-17` | `git diff --stat 91525013â€¦â†’cb31044aâ€¦ -- prisma/schema.prisma package.json package-lock.json` | exit 0; 0 lines on forbidden paths | C-10 |
| `E-T3-18` | `rg 'jobPostingId' prisma/schema.prisma src/domains/applications/application.service.ts src/domains/talent/intake-writer.service.ts` | exit 1; 0 functional hits | AC-08 |
| `E-T3-19` | `rg -F 'dangerouslySetInnerHTML' "app/(jobs)/viec-lam" src/shared/content` | exit 0; 1 hit in `renderer.tsx` defensive comment only | AC-03 |
| `E-T3-20` | `rg -F 'detail-sections.fixture' "app/(jobs)/viec-lam"` | exit 1; 0 hits | AC-06 |
| `E-T3-21` | `rg -F 'Ná»™i dung Ä‘ang Ä‘Æ°á»£c cáº­p nháº­t' "app/(jobs)/viec-lam/[slug]/page.tsx"` | exit 0; 1 hit in defensive comment only | AC-05 |
| `E-T3-22` (carry-forward) | `CI_INTEGRATION_STRICT=1 npm run test:integration` on dedicated synthetic DB at `cb31044ac3ef1d56f23750ea7caad790f533d2c9` per HANDOFF Â§2 E-11 | exit 0; 30/30 files, 528 passed, 2 Redis-only skipped, 0 failed; P1-A1 public-apply 18/18 PASS | AC-01..AC-12 |
| `E-T3-23` (carry-forward) | `npx vitest run tests/db/p1a1-migration-chain-proof.integration.test.ts` on isolated synthetic predecessor DB at `cb31044ac3ef1d56f23750ea7caad790f533d2c9` per HANDOFF Â§2 E-20 | exit 0; 10/10 assertions PASS | AC-12 |
| `E-T3-24` | `pwsh -NoProfile -Command "Get-Content 'docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md' -Encoding UTF8 + Measure-Object -Character"` + same for HANDOFF.md + AUDIT.md | TASK.md = 39131 bytes, HANDOFF.md = 20210 bytes, AUDIT.md = 26060 bytes, all: 0 BOM, 0 CRLF, 0 U+FFFD | artifact integrity |
| `E-T3-25` | `git log cb31044ac3ef1d56f23750ea7caad790f533d2c9 -1 --format=%s` | exit 0; commit message = `fix(p1-a1): close synthetic DB gate and canonical fixtures` (identifies the carry-forward source) | carry-forward attribution |

Two independent measurements: `(E-T3-12 unit) + (E-T3-13 build)` for re-measured canonical gates, plus `(E-T3-22 carry-forward DB + E-T3-23 carry-forward migration-chain)` for behavior proof from T0 authoritative committed SHA.

Independent number set vs. TASK/HANDOFF: `26` (cumulative files), `5549` + `1581` (cumulative insert/delete), `2` (docs-freeze files), `51` + `46` (docs-freeze insert/delete), `474` (A1 migration insertions), `1208` (P1A1 DB integration insertions), `702` (migration-chain proof insertions), `328` (page.tsx diff lines net, re-measured), `169` (unit files, re-measured), `2630` (unit tests passed, re-measured), `9` (unit tests skipped, re-measured), `0` (lint errors), `707` (lint warnings, re-measured), `39131` (TASK.md bytes), `20210` (HANDOFF.md bytes), `26060` (AUDIT.md bytes, this round). Fresh numbers re-measured by this audit round and recorded independently of TASK/HANDOFF (which already cite HANDOFF Â§0 numbers): the lint totals `0` / `707`, unit `169/2630/9`, byte sizes `39131/20210`, and the `328` page.tsx diff net lines.

## 4. Verdict and carry-forward

**Verdict:** PASS

Tier 3 closed its independent audit on the frozen semantic SHA `cb31044ac3ef1d56f23750ea7caad790f533d2c9` (delivery HEAD `b8a4e8b31a918b19ca1f447136a00fa45e222a12`, baseline `91525013fc2720a3803e808baac39e1c4497daf6`). All 12 AC resolve to PASS with statically re-measured evidence within `t3-p1a1-audit` worktree (no production mutation, no commit/push). Mandatory C-checks `C-07`, `C-09`, `C-10` all DONE with measured commands. Optional C-checks `C-01`..`C-06`, `C-08` all DONE with measured commands. No P0/P1/P2-release-blocking findings observed; no P3 blocking issues raised. The DB integration lane (18/18 P1-A1 cases + 10/10 migration-chain assertions + 30/30 strict integration files) is carried forward from `cb31044ac3ef1d56f23750ea7caad790f533d2c9` per global rules section 8 + task carry-forward policy; Tier 3 audit sandbox did not re-run the DB suite because the synthetic DB credentials are not available via the restricted local channel in this auditor session, and T0 authoritative committed proof at the cited semantic SHA is sufficient per C-05.

Coverage gaps acknowledged but non-blocking:

- The synthetic DB integration lane was NOT re-run by Tier 3; it is carried forward from T0 committed proof at `cb31044ac3ef1d56f23750ea7caad790f533d2c9`. If T0/Owner requires a fresh DB audit re-run on a new sandbox, a separate audit round must consume the new DB credentials through the restricted channel â€” this is not in scope for this round.
- The `vitest.integration-files.ts` registration change must be re-confirmed after A1 acceptance merges; this is a CI build-time concern, not an audit-time concern.

Recommendation for T0 / Owner:

- **PASS** â†’ adopt TASK.md v1.6 + HANDOFF.md at the frozen delivery HEAD `b8a4e8bâ€¦`; release decision (CI green / merge / docs adoption / cutover gate) belongs to T0/Owner per Pipeline V2_FAST_FREEZE.
- The four carry-in fixtures (`live-integration.mp2`, `live-integration.ops06a`, `public-card-truth`, `live-public-read-rls.go-live-04`) are realigned to `JobPosting` as canonical public authority; if any future round re-opens `src/domains/applications/application.service.ts`, the `slotId` interface field is intentionally absent and must not be re-added â€” the route layer is the single chokepoint for the rejection.
- The 707 lint warnings pre-existed before A1 (HANDOFF Â§2 E-03); P3 non-blocking debt, does not gate the cutover. Resolve in a separate round if needed.
- Tier 3 does NOT amend TASK/HANDOFF/source/tests/migration, does NOT commit/push, does NOT open PR/merge/deploy, does NOT run production migration, does NOT advance task state to `ACCEPTED`. AUDIT.md is the only artifact created by this round.

AUDIT.md cho Tier 1 â€” independent gate ready for adoption at `cb31044ac3ef1d56f23750ea7caad790f533d2c9` / delivery HEAD `b8a4e8b31a918b19ca1f447136a00fa45e222a12`. End of audit.
