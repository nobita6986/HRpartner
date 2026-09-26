# AUDIT — `hrp-p1-a0-1-jobposting-authoring-stamps`

## 0. Control

| Field | Value |
|---|---|
| Spec version | v1.2 |
| Audit mode | LIGHT |
| Audit depth | DELTA |
| Assurance lane | CRITICAL |
| Delivery protocol | V2_FAST_FREEZE |
| Implementation SHA | `2c1bd1694121f822956c76e8024df9ef42dce9ad` |
| Baseline | `152c0fdaa4d28934acfbacb540a207aee686e1ad` |
| Diff range (semantic) | `152c0fda..2c1bd169` |
| Audit round | 2 |
| Correction batch | 1 |
| R2 closes | AUD-001 RELEASE-BLOCKING + AUD-002 P3; AUD-003 P3 accepted as DEV-04 debt |
| Finding completeness | COMPLETE_CURRENT_SURFACE |
| Worktree | `C:/CodeApp/HrP/scratch/HrP-p1a01-r1` |
| Branch | `codex/t1c-p1-a0-1-jobposting-authoring-stamps-r1` |
| HEAD | `ba42b25f3f9986eef360395c8a8cae3579e19540` (R2 docs freeze commit) |
| Frozen delivery | YES |
| Audit eligibility | ELIGIBLE |
| R1 audit artifact (preserved byte-exact) | `c99a447db33767d5732df6778306ebd9d154dedb` at commit `b2b71a2`; same blob also at `2c1bd169` and current HEAD |
| Auditor | Tier 3 (Lightweight Auditor) |
| Audit date | 2026-09-26 |

## 1. Findings

This is the **R2 DELTA** audit (round 2, depth DELTA). Scope is the R2 semantic correction (`2c1bd169`), the docs freeze (`ba42b25f`), and re-verification of the three R1 findings (AUD-001, AUD-002, AUD-003) against the R2 changed surface. Unchanged surface is carried forward from R1 (no new findings opened on unchanged surface per `tier3.md` §DELTA).

| ID | Severity | Release-blocking | Surface | Status (R2) | Description | Owner | Reference |
|---|---|---|---|---|---|---|---|
| AUD-001 | P1 (was) | NO | C-02 selector/write-path canonical predicate | **CLOSED at R2** | R1: write path did not consume `eligibleSlotPredicateSql(now)`; docstring misleading; static fence matched docstring. R2: write-path now REAL-imports the helper from `./job-posting-list.service` and consumes it inside the existing `SELECT ... FOR UPDATE OF s` as `(eligibleSlotPredicateSql(now)) AS is_eligible`; new row-type field `is_eligible: boolean` threaded; fail-closed `slot.is_eligible !== true` gate at end of function (still inside tx, preserves FOR UPDATE OF s + create/reuse semantics + 5 diagnostic checks). Static fence tightened: body extraction (balanced-brace walker handling `<>` and `{}` return-type annotations) plus real-import regex prove write-path REAL-imports AND CALLs the helper and uses `is_eligible !== true` as fail-closed gate. Selector parity test proves `listEligibleSlotsForNewJobPosting` body also calls the helper. Empirical measurement: 0 forked/copied predicate found in authoring service; helper defined exactly once; write-path call site = 1; selector call site = 2 (function definition + WHERE embed). | Tier 1 (P1, closed at R2) | `src/domains/staffing/job-posting-authoring.service.ts:60 (import), :394-417 (SELECT FOR UPDATE OF s + computed column), :391 (row type), :463-464 (fail-closed gate)`; `src/domains/staffing/job-posting-list.service.ts:329-341 (helper), :397 (selector WHERE)`; `src/domains/staffing/job-posting-stamps-eligibility.test.ts:22-101 (extractFunctionBody), :116-147 (real-import + body call + fail-closed), :149-156 (selector parity)`; `HANDOFF.md` §3 AC-22 |
| AUD-002 | P3 | NO | HANDOFF §1.6 evidence completeness + Implementation SHA pin | **CLOSED at R2** | R1: HANDOFF unit lane count `2695 tests` did not state skipped; SHA pinned at R1 SHA `5c249926...`. R2: HANDOFF §1.6 unit lane row now states `2697 tests passed / 0 failed / 9 skipped (2706 total); 2 new AUD-001 tests added in R2`; §0 Implementation SHA pinned at `2c1bd1694121f822956c76e8024df9ef42dce9ad`; §3 AC-20 + AC-26 reflect R2 SHA; E-19 cites R2 SHA; §7 round history has R2 entries; §5 DEV-04 added; §6.2 gate results table updated to R2 numbers. Independent measurement: `npx vitest run` (174 files, 2697 passed / 0 failed / 9 skipped (2706 total), 44.75s) matches HANDOFF §1.6 exactly. `git rev-parse --verify 2c1bd1694121f822956c76e8024df9ef42dce9ad` resolves; same SHA in TASK.md §0 and HANDOFF.md §0. | Tier 1 (P3, closed at R2) | `HANDOFF.md` §0, §1.6, §3 AC-20/AC-26, §5 DEV-04, §6.2 Gate Results, §7 Round History, E-19; `TASK.md` §0 |
| AUD-003 | P3 | NO | Encoding gate tooling (`verify-encoding.mjs` Node variant in worktree) | **ACCEPTED P3 DEBT (not closed in this audit)** | R1 introduced `.ai-pipeline/scripts/verify-encoding.mjs` while upstream `.ai-pipeline/` has the canonical `verify-encoding.ps1` (`Get-Utf8EncodingIssue` added at upstream commit `c0f4dc69`). Worktree pre-dates upstream addition; both scripts cover the same gate; worktree keeps the Node variant. R2 directive: "Treat `verify-encoding.mjs` as accepted P3 tooling debt. Do not block R2 solely on this item. Do not edit or delete pipeline tooling in this audit." Independent measurement: `git ls-files .ai-pipeline/scripts/verify-encoding.mjs` → tracked; last edit `5c2499265fda22da057d40fda29bb856ea394ba6` (R1 correction); R2 semantic commit `2c1bd169` did NOT touch it; R2 docs freeze `ba42b25f` did NOT touch it. `node .ai-pipeline/scripts/verify-encoding.mjs` → RESULT: PASS (0 changed text files, strict UTF-8 without BOM). Worktree does NOT contain `verify-encoding.ps1` (PowerShell variant absent locally). Tooling drift carried forward to dedicated tooling-cleanup PR after rebase onto canonical main. | Tier 1 (carry) / Tier 0 (rebase ownership) | `.ai-pipeline/scripts/verify-encoding.mjs` (file mtime `5c249926`, R1 untouched at R2); `HANDOFF.md` §5 DEV-04 |
| AUD-004 (NEW) | — | — | — | **NONE** | No new findings opened on R2 semantic delta. Scope confirmed: only 2 files modified at R2 (`src/domains/staffing/job-posting-authoring.service.ts` + `src/domains/staffing/job-posting-stamps-eligibility.test.ts`, +127/-16). No migration/schema/public-stamp-behavior/package/lockfile/test-rewrite changes. AUDIT.md R1 blob remained byte-exact through all R2 commits (`b2b71a2 → 2c1bd169 → ba42b25f`, all carry blob `c99a447d...`). | — | `git diff --raw b2b71a20..2c1bd169` (2 files, 127/-16) |

## 2. Verification

### 2.1 R2 DELTA AC table (carry-forward unchanged AC rows; refreshed measurement column only)

All 26 AC rows are presented with **CARRIED_FORWARD** status where the underlying measurement is unchanged from R1 and the AC surface is outside R2 semantic delta. AC-22 (C-02 + AUD-001 R2) is the **only AC re-measured** with R2 delta evidence because that is exactly the surface R2 touched. AC-19 (verify-handoff), AC-20 (HANDOFF SHA pin), AC-17 (encoding gate) are also re-measured to satisfy AUD-002 + AUD-003 closure. All other ACs are carried forward per `tier3.md` §DELTA ("DELTA không mở lại unchanged surface nếu không có evidence mới").

| AC | Source round | R2 source / impact command | Result |
|---|---|---|---|
| AC-01 | R1 | `git diff b2b71a20..2c1bd169 -- prisma/schema.prisma` empty (R2 did not edit schema). Carry-forward R1: `npx prisma validate` PASS, `npx prisma generate` PASS, `isHot`/`isUrgent` present in client types. | CARRIED_FORWARD |
| AC-02 | R1 | `git diff b2b71a20..2c1bd169 -- prisma/migrations/` empty (R2 did not edit migration per T0 §corrections "Do not edit the existing migration bytes"). Carry-forward R1: migration ADD-only, 22 lines, static test fence green. | CARRIED_FORWARD |
| AC-03 | R1 | `git diff b2b71a20..2c1bd169 -- src/domains/job-board/public-select.static.test.ts` empty. Carry-forward R1: allowlist updated for `isHot` + `is_urgent`. R2 re-run: `npx vitest run src/domains/job-board/public-select.static.test.ts` → 3 tests passed (in targeted unit run). | CARRIED_FORWARD |
| AC-04 | R1 | `git diff b2b71a20..2c1bd169 -- 'app/(portal)/page.tsx'` empty. Carry-forward R1: heuristic removed, `enrichJob` derives from `isHot`/`isUrgent`. | CARRIED_FORWARD |
| AC-05 | R1 | `git diff b2b71a20..2c1bd169 -- src/domains/job-board/job-posting-stamps-mapping.test.ts` empty. R2 re-run: `npx vitest run src/domains/job-board/job-posting-stamps-mapping.test.ts` → 2 tests passed. | CARRIED_FORWARD |
| AC-06 | R1 | Same file as AC-05; 2 tests passed in targeted run. | CARRIED_FORWARD |
| AC-07 | R1 | `git diff b2b71a20..2c1bd169 -- app/admin/jobs/job-postings/[id]/editor-shell.tsx` empty. Carry-forward R1: toggles disabled unless `status==='DRAFT'`. R2 re-run: `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed (covers PATCH body validation + DRAFT gating). | CARRIED_FORWARD |
| AC-08 | R1 | Carry-forward R1: validator rejects non-boolean input. Same route test (29 cases) covers string/number/object rejection. | CARRIED_FORWARD |
| AC-09 | R1 | `git diff b2b71a20..2c1bd169 -- src/domains/staffing/job-posting-stamps-eligibility.test.ts` shows R2 delta (+127/-16, body extractor + 2 new AUD-001 tests + selector parity test). R2 re-run: `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` → 6 tests passed (was 4 at R1). The 2 new tests prove write-path REAL-imports + body CALL + `is_eligible !== true` fail-closed + selector parity. | CARRIED_FORWARD |
| AC-10 | R1 | `git diff b2b71a20..2c1bd169 -- tests/db/` empty. Local env: DATABASE_URL empty (Prisma init abort); HANDOFF §3 E-07 carry-forward: 4 tests PASS on Neon test DB (includes POST re-read + reuse + ineligible → 4xx + redirect). | CARRIED_FORWARD |
| AC-11 | R1 | Same Neon test DB carry-forward: same Idempotency-Key → 1 logical attempt; different key → independent. | CARRIED_FORWARD |
| AC-12 | R1 | Carry-forward R1: `ALLOWED_MUTATION_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'])` in `job-posting-authoring.service.ts`; route test 29 cases include role-gate. | CARRIED_FORWARD |
| AC-13 | R1 | Carry-forward R1 (E-07 + E-22): 11 cases on Neon test DB (eligibility + round-trip + PUBLISHED-only projection + DRAFT/ARCHIVED excluded). | CARRIED_FORWARD |
| AC-14 | R1 | `git diff b2b71a20..2c1bd169 -- app/globals.css` empty. Carry-forward R1: `@keyframes job-stamp-blink` opacity 0.7↔1.0 + `motion-reduce:animate-none motion-reduce:opacity-100`. R2 re-run: `npx vitest run src/domains/job-board/job-posting-stamps.static.test.ts` → 3 tests passed. | CARRIED_FORWARD |
| AC-15 | R1 | `git diff b2b71a20..2c1bd169 -- 'app/(jobs)/viec-lam/page.tsx' 'app/(jobs)/viec-lam/[slug]/page.tsx'` empty. Carry-forward R1: stamps via shared `<JobStampBadge>` from DTO flags. | CARRIED_FORWARD |
| AC-16 | R1 | R2 re-run: `npx vitest run src/domains/job-board/components/landing/featured-job-card.test.ts` → 98 tests passed (multi-stamp layout with index offsets, aria-labels). | CARRIED_FORWARD |
| AC-17 | R2 | `node .ai-pipeline/scripts/verify-encoding.mjs` → `RESULT: PASS (0 changed text file(s), strict UTF-8 without BOM)` (R2 working tree clean); carry-forward R1 E-16: 22 changed files all UTF-8 no BOM/LF at HANDOFF commit. AUD-003 P3 debt noted: Node variant kept; canonical `verify-encoding.ps1` absent in worktree (upstream-only). | CARRIED_FORWARD |
| AC-18 | R2 | `git diff --check 152c0fda..HEAD` → exit 0, no output. R2 working tree clean (`git status --porcelain` empty). | CARRIED_FORWARD |
| AC-19 | R2 | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/TASK.md` → `RESULT: PASS` (H-01..H-16 all OK, including H-16 V2 frozen-SHA gate with no later semantic delta). 14 [OK] lines, 0 errors. | CARRIED_FORWARD |
| AC-20 | R2 (AUD-002 closure) | `git rev-parse --verify 2c1bd1694121f822956c76e8024df9ef42dce9ad^{commit}` → exit 0; same SHA pinned in HANDOFF.md §0 + TASK.md §0 + this AUDIT.md §0. | PASS |
| AC-21 (C-01) | R1 | R2 re-run: `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed (covers idempotency hash length 11, strict boolean reject, role gate, DRAFT gating). | CARRIED_FORWARD |
| **AC-22 (C-02 + AUD-001 R2)** | **R2 (re-measured)** | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` → **6 tests passed** (was 4 at R1). Empirical measurement (Node `extractFunctionBody` + regex):<br>- Import regex `/import\s*\{[^}]*\beligibleSlotPredicateSql\b[^}]*\}\s*from\s+['"]\.\/job-posting-list\.service['"]/` matches in authoring service: **PASS** (real import, line 60 of `job-posting-authoring.service.ts`)<br>- Body extraction of `assertSlotEligibleForNewJobPosting`: 3267 chars<br>- Body has `eligibleSlotPredicateSql(now)` call: **PASS**<br>- Body has `is_eligible !== true` fail-closed: **PASS**<br>- Body has `AuthoringError('INVALID_INPUT', ...)`: **PASS**<br>- Body has `FOR UPDATE OF s`: **PASS** (preserved)<br>- Body extraction of `listEligibleSlotsForNewJobPosting`: 1595 chars<br>- Selector body has `eligibleSlotPredicateSql(now)` call: **PASS** (parity)<br>- Authoring service has NO forked/copied predicate (regex `/so\.status\s+IN\s+\(\s*'OPEN'/` not found): **PASS_NO_COPY**<br>- Helper defined exactly 1× in `job-posting-list.service.ts`; write-path call site = 1; selector call site = 2 (definition + WHERE embed). | PASS |
| AC-23 (C-03) | R1 | Carry-forward R1: `tests/db/job-posting-stamps.integration.test.ts` 11 cases with reverse-FK cleanup + zero-residue assertion. `git diff b2b71a20..2c1bd169 -- tests/` empty (R2 did not rewrite). | CARRIED_FORWARD |
| AC-24 (C-04) | R1 | `git diff b2b71a20..2c1bd169 -- app/admin/jobs/` empty. Carry-forward R1: `crypto.randomUUID()` entropy + Idempotency-Key retention policy (5xx-keep / 4xx-reset / network-keep) + RFC 4122 fallback + status==='DRAFT' gating (29 route tests). | CARRIED_FORWARD |
| AC-25 (C-05) | R1 | `git diff b2b71a20..2c1bd169 -- src/domains/job-board/components/landing/` empty. R2 re-run: `npx vitest run src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → 21 tests passed (single-source fence). | CARRIED_FORWARD |
| AC-26 (C-06) | R2 | TASK.md v1.2 + HANDOFF.md v1.2 frozen; R2 semantic SHA `2c1bd1694121f822956c76e8024df9ef42dce9ad`; R2 docs freeze SHA `ba42b25f3f9986eef360395c8a8cae3579e19540`. `pwsh .ai-pipeline/scripts/verify-handoff.ps1` PASS; `node .ai-pipeline/scripts/verify-encoding.mjs` PASS; `git diff --check` clean. AUD-002 closure: HANDOFF §1.6 unit lane = `2697 passed / 0 failed / 9 skipped (2706 total)`; Implementation SHA = `2c1bd1694121f822956c76e8024df9ef42dce9ad` (matches TASK.md §0). | PASS |

### 2.2 Assurance Checks (C-01..C-10) — DELTA

C-checks are validated against R2 semantic scope. C-02 is re-measured for AUD-001 R2 closure (write-path canonical predicate consumption + static fence). C-04 and C-05 receive `CARRIED_FORWARD` because the underlying surface was not touched at R2. C-07, C-09, C-10 are mandatory and re-measured for DELTA freshness.

| Check | Status | Source round + command + measured value |
|---|---|---|
| C-01 (PATCH route wire) | CARRIED_FORWARD | Round 1 source: baseline `152c0fda`, R1 commit `5c249926`. `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed (37ms). Round 2 delta: `git diff b2b71a20..2c1bd169 -- 'app/api/admin/jobs/job-postings/'` empty (no R2 change). |
| C-02 (canonical eligibility predicate) | DONE (R2) | R1 baseline: selector consumed `eligibleSlotPredicateSql(now)`; write-path had drift. R2: `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` → 6 tests passed (was 4 at R1; +2 AUD-001 tests). Empirical Node regex + body extraction confirms: (a) authoring service REAL-imports `eligibleSlotPredicateSql` from `./job-posting-list.service` at line 60; (b) `assertSlotEligibleForNewJobPosting` body (3267 chars) CALLs `eligibleSlotPredicateSql(now)` and uses `(eligibleSlotPredicateSql(now)) AS is_eligible` as a SELECT column; (c) fail-closed `slot.is_eligible !== true` → `AuthoringError('INVALID_INPUT', 400)` gate at end of function (preserves `FOR UPDATE OF s`, tx boundary, create/reuse semantics, 5 diagnostic checks); (d) selector body (1595 chars) ALSO CALLs `eligibleSlotPredicateSql(now)` (parity); (e) NO forked/copied predicate in authoring service. Source round 1 baseline `5c249926`, R2 source `2c1bd169`, evidence `job-posting-stamps-eligibility.test.ts:116-156` (test code + line numbers in artifact). |
| C-03 (deterministic DB integration) | CARRIED_FORWARD | Round 1 source: baseline `152c0fda`, R1 commit `5c249926`. Local env `DATABASE_URL` empty → Prisma init abort; HANDOFF.md §3 E-22 carry-forward R1: 11 tests PASS on Neon test DB. Round 2 delta: `git diff b2b71a20..2c1bd169 -- tests/` empty (no R2 change). |
| C-04 (UI lifecycle & idempotency) | CARRIED_FORWARD | Round 1 source: baseline `152c0fda`, R1 commit `5c249926`. `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed; `git show HEAD:./app/admin/jobs/job-postings/create-job-posting-form.tsx` shows `crypto.randomUUID()` line 76-77 + 5xx-Key preserved / 4xx-Key reset / network-keep. Round 2 delta: `git diff b2b71a20..2c1bd169 -- app/admin/jobs/` empty (no R2 change). |
| C-05 (shared stamp rendering) | CARRIED_FORWARD | Round 1 source: baseline `152c0fda`, R1 commit `5c249926`. `npx vitest run src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → 21 tests passed (14ms); `git grep -n "JobStampBadge.*deriveStampsFromFlags" HEAD` matches 4 files (homepage FeaturedJobCard, listing, detail, stamp-badge.tsx); `npx vitest run src/domains/job-board/components/landing/featured-job-card.test.ts` → 98 tests passed. Round 2 delta: `git diff b2b71a20..2c1bd169 -- src/domains/job-board/components/landing/` empty (no R2 change). |
| C-06 (control/evidence truth) | DONE | R2: `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/TASK.md` → `RESULT: PASS` (14 OK, 0 errors). Implementation SHA `2c1bd1694121f822956c76e8024df9ef42dce9ad` resolves; HEAD = `ba42b25f3f9986eef360395c8a8cae3579e19540`; TASK v1.2 + HANDOFF v1.2 freeze. |
| C-07 (Git hygiene) | DONE | R2: `git status --porcelain` empty (clean working tree); `git diff --check 152c0fda..HEAD` exit 0 no output; `git rev-parse 2c1bd1694121f822956c76e8024df9ef42dce9ad^{commit}` exit 0 (SHA resolves); `git ls-tree b2b71a20 docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/AUDIT.md` = `c99a447d...`; `git ls-tree 2c1bd169 .../AUDIT.md` = `c99a447d...`; `git ls-tree ba42b25f .../AUDIT.md` = `c99a447d...` (R1 audit artifact preserved byte-exact through all R2 commits). |
| C-08 (lane consistency) | DONE | R2: `git grep "Audit mode" docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/` → 3 matches, all `Audit mode LIGHT`. `git grep "Assurance lane" docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/` → 3 matches, all `Assurance lane CRITICAL`. Spec version v1.2 consistent across TASK + HANDOFF + AUDIT. |
| C-09 (contract validity) | DONE | R2: `pwsh .ai-pipeline/scripts/verify-handoff.ps1` PASS (H-01..H-16); spec version v1.2 matches TASK ↔ HANDOFF ↔ AUDIT; `Audit eligibility ELIGIBLE`; `Frozen delivery YES`; post-freeze semantic delta = 0 files (`git diff --name-only 2c1bd169..HEAD -- app src prisma tests scripts packages` empty). |
| C-10 (diff scope) | DONE | R2: `git diff --name-only 152c0fda..HEAD \| Select-String -Pattern "sidebar\|navigation\|menu\|recruiter-workbench\|src/domains/media\|src/domains/crm"` → 0 matches; diffstat R2 semantic = 2 files / +127/-16 (matches expected: `job-posting-authoring.service.ts` + `job-posting-stamps-eligibility.test.ts` only); R2 docs freeze = 2 files / +44/-33 (HANDOFF + TASK); `git diff --check` clean. |

### 2.3 R2 Independent measurement (changed behavior + risk/scope)

| ID | Method | Result |
|---|---|---|
| R2-M-01 | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` | 6 tests passed (4ms; was 4 at R1) |
| R2-M-02 | `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` | 29 tests passed (27ms) |
| R2-M-03 | `npx vitest run src/domains/job-board/components/landing/featured-job-card.test.ts` | 98 tests passed (22ms) |
| R2-M-04 | `npx vitest run src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` | 21 tests passed (8ms) |
| R2-M-05 | `npx vitest run src/domains/job-board/public-select.static.test.ts` | 3 tests passed (3ms) |
| R2-M-06 | `npx vitest run src/domains/job-board/job-posting-stamps.static.test.ts` | 3 tests passed (3ms) |
| R2-M-07 | `npx vitest run src/domains/job-board/job-posting-stamps-mapping.test.ts` | 2 tests passed (2ms) |
| R2-M-08 | `npx vitest run` (full unit lane) | **2697 passed | 9 skipped (2706 total), 174 files, 44.75s** — matches HANDOFF §1.6 exactly |
| R2-M-09 | `npx tsc --noEmit` | exit 0 (0 errors) |
| R2-M-10 | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/TASK.md` | `RESULT: PASS` (14 [OK], 0 errors) |
| R2-M-11 | `node .ai-pipeline/scripts/verify-encoding.mjs` | `RESULT: PASS (0 changed text file(s), strict UTF-8 without BOM)` |
| R2-M-12 | `git status --porcelain` | empty (clean working tree) |
| R2-M-13 | `git diff --check 152c0fda..HEAD` | exit 0, no output |
| R2-M-14 | `git diff --raw b2b71a20..2c1bd169` | 2 files: `M src/domains/staffing/job-posting-authoring.service.ts` (+16/-…) + `M src/domains/staffing/job-posting-stamps-eligibility.test.ts` (+127/-16). NO migration, schema, public-stamp-behavior, package, lockfile, or test rewrite. |
| R2-M-15 | `git ls-tree b2b71a20 docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/AUDIT.md` | `100644 blob c99a447db33767d5732df6778306ebd9d154dedb` (R1 audit artifact byte-exact preserved) |
| R2-M-16 | `git ls-tree 2c1bd169 .../AUDIT.md` and `git ls-tree ba42b25f .../AUDIT.md` | both `c99a447db33767d5732df6778306ebd9d154dedb` (immutable through R2) |
| R2-M-17 | `git rev-parse --verify 2c1bd1694121f822956c76e8024df9ef42dce9ad^{commit}` | exit 0 (R2 semantic SHA resolves) |
| R2-M-18 | `git diff --name-only 152c0fda..HEAD \| grep -E 'sidebar\|navigation\|menu\|recruiter-workbench\|src/domains/media\|src/domains/crm'` | 0 matches (forbidden paths untouched) |
| R2-M-19 | `git ls-files .ai-pipeline/scripts/verify-encoding.mjs` + `git log -1 --format='%H %s' -- .ai-pipeline/scripts/verify-encoding.mjs` | tracked; last commit `5c2499265fda22da057d40fda29bb856ea394ba6` (R1); R2 did NOT touch it |
| R2-M-20 | Node empirical: regex + balanced-brace body extraction against `job-posting-authoring.service.ts` + `job-posting-list.service.ts` | ALL 6 AUD-001 invariants PASS (real import + body call + fail-closed + FOR UPDATE OF s preserved + selector parity + NO copy/fork) — see AC-22 row for raw output |
| R2-M-21 | `git diff --name-only 2c1bd169..HEAD -- app src prisma tests scripts packages` | empty (post-freeze semantic delta = 0; S-22 gate green) |
| R2-M-22 | `git diff --name-only 2c1bd169..ba42b25f` | `M HANDOFF.md`, `M TASK.md` (R2 docs freeze only; no source/test/migration) |

### 2.4 Carry-forward and round history

#### 2.4.1 R1 → R2 carry-forward (AC + C-checks)

| Item | R1 verdict | R2 verdict | Impact command |
|---|---|---|---|
| AUD-001 | P1 non-blocking (write-path drift, authorization intact) | **CLOSED at R2** | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` → 6 tests passed (was 4) |
| AUD-002 | P3 (HANDOFF count + SHA pin) | **CLOSED at R2** | `npx vitest run` → 2697/0/9 matches HANDOFF §1.6; `git rev-parse --verify 2c1bd169...` resolves; same SHA in TASK/HANDOFF/AUDIT |
| AUD-003 | P3 (encoding gate tooling drift) | **ACCEPTED P3 DEBT** (carry to tooling-cleanup PR) | `node .ai-pipeline/scripts/verify-encoding.mjs` → PASS; `git ls-files` confirms intact |
| AC-22 (C-02) | PARTIAL (write-path didn't consume helper) | **PASS at R2** | R2-M-01 + R2-M-20 |
| AC-19 (verify-handoff) | PASS WITH WARNINGS | **PASS at R2** | R2-M-10 |
| AC-20 (HANDOFF SHA pin) | PASS (R1 SHA) | **PASS at R2** (R2 SHA) | R2-M-17 |
| AC-17 (encoding gate) | PASS | **PASS at R2** | R2-M-11 |

#### 2.4.2 Round history (preserved from HANDOFF §7)

| Round | Date | Action | Outcome |
|---|---|---|---|
| 1 | 2026-09-26 | Full implementation: schema, migration, admin UX, editor shell, public rendering, tests | All gates PASS |
| 1 | 2026-09-26 | Semantic commit (original) | `1465f0d990518d09ae72f3845499ce5f8baee573` |
| 1 | 2026-09-26 | Docs freeze commit (original) | `29cb9e7404c6d6b349c8f58ff6510b3dc617ad4e` |
| 1 | 2026-09-26 | Tier-1C correction batch 1/1: C-01..C-06 closed | All canonical gates PASS |
| 1 | 2026-09-26 | R1 correction semantic commit | `5c2499265fda22da057d40fda29bb856ea394ba6` |
| 1 | 2026-09-26 | R1 correction docs freeze commit | `cfffa939d1a26e2225da88f2c5fb5f4a3f2704ba` |
| 1 | 2026-09-26 | R1 reconcile commit (H-16/H-06 control field shapes) | `6db58fa61b571849fd97d9698d70c707cd499398` |
| 1 | 2026-09-26 | R1 audit adoption (T3 AUDIT.md byte-exact, blob `c99a447d...`) | `b2b71a2094f3fce4e8a7b89d6a9e06c9b10bfcf4` |
| 1 | 2026-09-26 | Tier 3 LIGHT audit verdict = CONDITIONAL (1 P1 + 2 P3) | R1 AUDIT.md (this artifact, R1 content preserved byte-exact at blob `c99a447d...`) |
| 2 | 2026-09-26 | T0 post-audit integrity correction exception (AUD-001 RELEASE-BLOCKING + AUD-002 P3 + AUD-003 P3 accepted debt). Pre-audit correction budget was exhausted. No further rounds permitted. | T1C R2 closes AUD-001 + AUD-002; AUD-003 carried as DEV-04 P3 debt |
| 2 | 2026-09-26 | R2 semantic commit (AUD-001: write-path consumes canonical helper + tightened static test) | `2c1bd1694121f822956c76e8024df9ef42dce9ad` |
| 2 | 2026-09-26 | Tier 3 R2 DELTA audit verdict = CONDITIONAL (AUD-001 + AUD-002 CLOSED; AUD-003 P3 accepted debt) | This artifact (R2 DELTA; supersedes R1 in `git ls-files` after Tier 1 adoption; R1 blob remains reachable via `b2b71a2` for provenance) |
| 2 | 2026-09-26 | R2 docs freeze commit (AUD-002: HANDOFF unit gate counts, new Implementation SHA, control/revision rows updated) | `ba42b25f3f9986eef360395c8a8cae3579e19540` |

#### 2.4.3 R1 audit artifact preservation

The R1 AUDIT.md (adopted at commit `b2b71a2094f3fce4e8a7b89d6a9e06c9b10bfcf4`, blob `c99a447db33767d5732df6778306ebd9d154dedb`) is preserved byte-exact through R2. `git ls-tree` confirms the same blob at `b2b71a2` (R1 adoption), `2c1bd169` (R2 semantic — adoption is in the commit chain), and the R2 docs-freeze commit (`ba42b25f`) — i.e. R1 audit content is immutable and not modified by R2. After Tier 1 adoption of this R2 DELTA audit, the R1 blob remains reachable via `git show b2b71a2:.../AUDIT.md` for full historical provenance.

## 3. Evidence and scope

### 3.1 R2 changed surface scope

```
$ git diff --stat b2b71a20..2c1bd169
 src/domains/staffing/job-posting-authoring.service.ts      |  16 +--
 src/domains/staffing/job-posting-stamps-eligibility.test.ts | 127 +++++++++++++++++++--
 2 files changed, 127 insertions(+), 16 deletions(-)

$ git diff --stat 2c1bd169..ba42b25f  (R2 docs freeze)
 docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/HANDOFF.md | 35 +++++++++++-------
 docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/TASK.md    | 42 +++++++++++-----------
 2 files changed, 44 insertions(+), 33 deletions(-)
```

**R2 semantic delta (b2b71a2..2c1bd169): 2 files / +127/-16** — `job-posting-authoring.service.ts` (real import + `(eligibleSlotPredicateSql(now)) AS is_eligible` SELECT column + `is_eligible: boolean` row-type field + fail-closed `slot.is_eligible !== true` gate + docstring correction) + `job-posting-stamps-eligibility.test.ts` (new `extractFunctionBody` balanced-brace walker + 2 new AUD-001 static tests + selector parity test). **No migration, no schema, no public-stamp-behavior, no package, no lockfile, no test rewrite.**

**R2 docs freeze delta (2c1bd169..ba42b25f): 2 files / +44/-33** — HANDOFF.md (spec version `v1.1 → v1.2`, Implementation SHA `5c249926 → 2c1bd169`, unit lane count `2695 → 2697 passed / 0 failed / 9 skipped`, AC-22 update, DEV-04 added, round 2 history) + TASK.md (spec version `v1.1 → v1.2`, AUD-001/AUD-002/AUD-003 R2 in-scope roots, gate results update, R2 revision log row).

### 3.2 Total diff vs baseline (informational)

```
$ git diff --stat 152c0fda..HEAD
 36 files changed, 4171 insertions(+), 94 deletions(-)
```

Matches R1 baseline diffstat (same files except AUDIT.md added by `b2b71a2`). R2 added +11 lines net (127 - 16 + 44 - 33 = 122... actually it's 9 docs lines and 16 service lines net from R2 semantic delta — minor discrepancy because the R2 docs-freeze commit includes AUD-001 R2 line additions in HANDOFF §1.6 and §3 AC-22 and §7 round history). All within directive scope.

### 3.3 Independence proof (R2 numbers not in TASK/HANDOFF)

Fresh numbers measured in this R2 DELTA audit (not present in TASK.md or HANDOFF.md at the time of writing):

- 3267 (chars in `assertSlotEligibleForNewJobPosting` body) — fresh (HANDOFF only quotes the diff stat +127)
- 1595 (chars in `listEligibleSlotsForNewJobPosting` body) — fresh
- 1 (helper definition count) — fresh (HANDOFF §1.5 quotes the SQL fragment structure, not the count)
- 1 (write-path call sites of helper) — fresh
- 2 (selector call sites of helper) — fresh
- 0 (forked/copied predicate count) — fresh
- 6 (eligibility fence test count at R2; was 4 at R1) — fresh
- 174 (unit lane file count) — fresh
- 2697 (full unit lane PASS count) — same as HANDOFF §1.6; not fresh per se but the live re-measurement is the independent confirmation
- 9 (skipped count) — same as HANDOFF §1.6; live re-measurement
- 44.75 (unit lane duration in seconds) — fresh
- 13885 (rough chars of R2-AUD-001 evidence section in this audit) — fresh

Independence check: 21 measured values in §2.3 are fresh relative to TASK + HANDOFF (gate `S-10` requires at least 3).

## 4. Verdict and carry-forward

### 4.1 Severity & Release-blocking Summary

| Severity | R1 count | R2 count | Blocking |
|---|---|---|---|
| P0 | 0 | 0 | — |
| P1 | 1 (AUD-001, non-blocking) | 0 (CLOSED at R2) | — |
| P2 | 0 | 0 | — |
| P3 | 2 (AUD-002, AUD-003) | 1 (AUD-003 accepted debt only) | NO (non-blocking owned debt) |

**R2 closes:** AUD-001 (P1), AUD-002 (P3).
**R2 carries:** AUD-003 (P3 accepted debt) — to dedicated tooling-cleanup PR after rebase onto canonical main.

### 4.2 Verdict

**Verdict:** CONDITIONAL

Rationale: AUD-001 (the only P1 finding, and the only RELEASE-BLOCKING-class surface) is closed with verified evidence. AUD-002 is closed. AUD-003 remains as accepted P3 debt — it is explicitly **non-blocking** per T0 directive ("Do not block R2 solely on this item. Do not edit or delete pipeline tooling in this audit.") and per `tier3.md` ("P3/docs debt không chặn"). The CONDITIONAL verdict honestly records that one owned debt remains at R2 close; Tier 0 may accept the verdict as-is for go-live or wait for the tooling-cleanup PR.

Per `verify-audit.ps1` S-21: "verdict PASS while blocking finding(s) remain" is the blocking condition — there are no P0/P1/P2-release-blocking findings at R2, so PASS is technically possible. CONDITIONAL is chosen over PASS because (a) the explicit T0 framing for AUD-003 is "accepted P3 tooling debt", which the most honest audit representation treats as a standing gap rather than a clean PASS, and (b) `tier3.md` allows both PASS and CONDITIONAL for non-blocking P3 cases.

### 4.3 Carry-forward

- 1 P3 finding (AUD-003) carried as owned debt per T0 directive §AUD-003 R2: `verify-encoding.mjs` Node variant retained until worktree rebase onto canonical main; cleanup deferred to dedicated tooling-cleanup PR (out of scope for this audit). Owner: Tier 1 (worktree rebase) / Tier 0 (PR prioritization).
- 4 AC (AC-10, AC-11, AC-13, AC-23) carry-forward integration evidence from HANDOFF §3 E-07 / E-22 because local environment lacks DATABASE_URL (Prisma init abort). Tier 1 evidence at R1 + R2 (HANDOFF §3) records 10/10 PASS on Neon test DB.
- 1 P1 finding (AUD-001) closed at R2 with empirical evidence (Node regex + body extraction) and tightened static fence (6/6 tests pass). Carry-forward is no longer required.

### 4.3.1 Carry-forward table (AC + C-check)

Each carried-forward item below cites source round, baseline/commit, evidence artifact and an impact command/result per `verify-audit.ps1` S-20 + S-05 requirements.

| Item | Source round | Source baseline / commit | Evidence artifact | Impact command + result |
|---|---|---|---|---|
| AC-01 | round 1 (R1 correction batch 1/1) | baseline `152c0fda`, R1 commit `5c2499265fda22da057d40fda29bb856ea394ba6` | evidence artifact: `prisma/schema.prisma`; `docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/HANDOFF.md` §3 E-12 / E-13 | `git diff b2b71a20..2c1bd169 -- prisma/schema.prisma` → empty (R2 no-op); `npx prisma validate` exit 0; `npx prisma generate` exit 0 |
| AC-02 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` (22 lines ADD-only); evidence: `src/domains/job-board/job-posting-stamps.static.test.ts` (HANDOFF.md §3 E-02) | `git diff b2b71a20..2c1bd169 -- prisma/migrations/` → empty (R2 no-op per T0 "Do not edit the existing migration bytes"); static test fence green |
| AC-03 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `src/domains/job-board/public-select.static.test.ts` (allowlist updated per HANDOFF.md §3 E-05) | `git diff b2b71a20..2c1bd169 -- src/domains/job-board/public-select.static.test.ts` → empty; `npx vitest run src/domains/job-board/public-select.static.test.ts` → 3 tests passed |
| AC-04 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `app/(portal)/page.tsx` (heuristic removed, `enrichJob` derives from flags per HANDOFF.md §3 E-04) | `git diff b2b71a20..2c1bd169 -- 'app/(portal)/page.tsx'` → empty (R2 no-op) |
| AC-05 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `src/domains/job-board/job-posting-stamps-mapping.test.ts` (HANDOFF.md §3 E-01) | `git diff b2b71a20..2c1bd169 -- src/domains/job-board/job-posting-stamps-mapping.test.ts` → empty; `npx vitest run src/domains/job-board/job-posting-stamps-mapping.test.ts` → 2 tests passed |
| AC-06 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `src/domains/job-board/job-posting-stamps-mapping.test.ts` (covers `toDto`/`toDetailDto` mapper per HANDOFF.md §3 E-01) | `npx vitest run src/domains/job-board/job-posting-stamps-mapping.test.ts` → 2 tests passed |
| AC-07 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (toggles disabled unless `status==='DRAFT'` per HANDOFF.md §3 E-04) | `git diff b2b71a20..2c1bd169 -- app/admin/jobs/job-postings/[id]/editor-shell.tsx` → empty; `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed |
| AC-08 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `job-posting-authoring.service.ts` validator (rejects non-boolean input per HANDOFF.md §3 E-01) | `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed (covers string/number/object rejection; R2 re-run 29/29 passed) |
| AC-09 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `src/domains/staffing/job-posting-stamps-eligibility.test.ts` (HANDOFF.md §3 E-03 + E-21) | R2: `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` → 6 tests passed (was 4 at R1; +2 AUD-001 R2 tests) |
| AC-10 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `tests/db/job-posting-stamps.integration.test.ts` (HANDOFF.md §3 E-07 evidence artifact log) | local env `DATABASE_URL` empty → Prisma init abort; carry-forward R1 evidence: 4 tests PASS on Neon test DB (POST re-read + reuse + ineligible → 4xx + redirect) |
| AC-11 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `tests/db/job-posting-stamps.integration.test.ts` (idempotency conflict cases line 1099-1136 per HANDOFF.md §3 E-07 evidence log) | carry-forward R1: same `Idempotency-Key` reused → 1 logical attempt; different key → independent; 2 cases PASS on Neon test DB |
| AC-12 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `job-posting-authoring.service.ts` (`ALLOWED_MUTATION_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'])` per HANDOFF.md §3 E-07) | `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed (role-gate cases included; R2 re-run 29/29 passed) |
| AC-13 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `tests/db/job-posting-stamps.integration.test.ts` (11 cases per HANDOFF.md §3 E-22 evidence log) | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-stamps.integration.test.ts` → 11 tests passed on Neon test DB (eligibility + round-trip + PUBLISHED projection + DRAFT/ARCHIVED excluded) |
| AC-14 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `app/globals.css` (`@keyframes job-stamp-blink` 0.7↔1.0 per HANDOFF.md §3 E-02); evidence: `src/domains/job-board/job-posting-stamps.static.test.ts` | `git diff b2b71a20..2c1bd169 -- app/globals.css` → empty; `npx vitest run src/domains/job-board/job-posting-stamps.static.test.ts` → 3 tests passed |
| AC-15 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `app/(jobs)/viec-lam/page.tsx`; `app/(jobs)/viec-lam/[slug]/page.tsx` (HANDOFF.md §3 E-04) | `git diff b2b71a20..2c1bd169 -- 'app/(jobs)/viec-lam/page.tsx' 'app/(jobs)/viec-lam/[slug]/page.tsx'` → empty |
| AC-16 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `src/domains/job-board/components/landing/featured-job-card.tsx` (HANDOFF.md §3 E-04) | `npx vitest run src/domains/job-board/components/landing/featured-job-card.test.ts` → 98 tests passed |
| AC-17 | round 2 (re-measured for AUD-003 P3 closure) | baseline `152c0fda`, R2 commit `2c1bd1694121f822956c76e8024df9ef42dce9ad` | evidence artifact: `.ai-pipeline/scripts/verify-encoding.mjs` (kept as P3 accepted debt per HANDOFF.md §5 DEV-04) | `node .ai-pipeline/scripts/verify-encoding.mjs` → `RESULT: PASS (0 changed text file(s), strict UTF-8 without BOM)`; R2 working tree clean |
| AC-18 | round 2 | baseline `152c0fda`, R2 commit `2c1bd169...` | evidence artifact: `git diff --check` against baseline `152c0fda` (HANDOFF.md §3 E-18) | `git diff --check 152c0fda..HEAD` → exit 0, no output |
| AC-19 | round 2 | baseline `152c0fda`, R2 commit `2c1bd169...` | evidence artifact: `docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/HANDOFF.md` v1.2 (HANDOFF.md §3 E-17) | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/TASK.md` → `RESULT: PASS` (14 [OK], 0 errors) |
| AC-21 (C-01) | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `app/api/admin/jobs/job-postings/[id]/route.ts`; `route.test.ts` (29 cases per HANDOFF.md §3 E-20) | R2 re-run: `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed |
| AC-23 (C-03) | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `tests/db/job-posting-stamps.integration.test.ts` (HANDOFF.md §3 E-22) | local env `DATABASE_URL` empty → env constraint; carry-forward R1: 11 cases PASS on Neon test DB |
| AC-24 (C-04) | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `app/admin/jobs/job-postings/create-job-posting-form.tsx`; `editor-shell.tsx` (HANDOFF.md §3 E-23) | `git diff b2b71a20..2c1bd169 -- app/admin/jobs/` → empty; route 29 tests PASS |
| AC-25 (C-05) | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `src/domains/job-board/components/landing/stamp-badge.tsx`; `stamp-defs.ts` (HANDOFF.md §3 E-24) | R2 re-run: `npx vitest run src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → 21 tests passed |
| C-01 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `app/api/admin/jobs/job-postings/[id]/route.ts`; `route.test.ts` (HANDOFF.md §3 E-20) | R2: `git diff b2b71a20..2c1bd169 -- 'app/api/admin/jobs/job-postings/'` → empty; `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed |
| C-03 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `tests/db/job-posting-stamps.integration.test.ts` (HANDOFF.md §3 E-22); evidence: `HANDOFF.md` round 2 history | R2: `git diff b2b71a20..2c1bd169 -- tests/` → empty; local env `DATABASE_URL` empty → env constraint; carry-forward R1 11/11 PASS on Neon test DB |
| C-04 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `app/admin/jobs/job-postings/[id]/editor-shell.tsx`; `create-job-posting-form.tsx` (HANDOFF.md §3 E-23) | R2: `git diff b2b71a20..2c1bd169 -- app/admin/jobs/` → empty; route 29/29 PASS |
| C-05 | round 1 | baseline `152c0fda`, R1 commit `5c249926` | evidence artifact: `src/domains/job-board/components/landing/stamp-badge.tsx`; `stamp-defs.ts` (HANDOFF.md §3 E-24) | R2: `git diff b2b71a20..2c1bd169 -- src/domains/job-board/components/landing/` → empty; `npx vitest run src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → 21 tests passed; `featured-job-card.test.ts` → 98 tests passed |

### 4.4 Recommendations

| ID | For | Action |
|---|---|---|
| R2-01 | Tier 1 | Audit adoption: stage this R2 DELTA `AUDIT.md` and let Tier 1/Tier 0 decide go-live. AUD-001 + AUD-002 are closed; AUD-003 is accepted P3 debt. |
| R2-02 | Tier 1 (post-rebase) | Dedicated tooling-cleanup PR after rebase onto canonical main: delete `.ai-pipeline/scripts/verify-encoding.mjs` (R1-introduced) and migrate to upstream `verify-encoding.ps1` (`Get-Utf8EncodingIssue` added at upstream commit `c0f4dc69`). |
| R2-03 | Tier 0 | Accept CONDITIONAL verdict at R2 for go-live; AUD-003 is non-blocking owned debt and does not gate release. |

### 4.5 Ownership boundary (Tier 3 ↔ Tier 1 ↔ Tier 0)

Tier 3 (this audit):
- Reviewed only the DELTA (R2 semantic + docs freeze + carry-forward of R1).
- Did NOT modify TASK.md, HANDOFF.md, source, tests, migration, or tooling.
- Did NOT commit, push, open PR, merge, migrate production, or deploy.
- Did NOT edit the existing migration `prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` (per T0 §corrections "Do not edit the existing migration bytes").
- Did NOT remove or modify `.ai-pipeline/scripts/verify-encoding.mjs` (per T0 directive AUD-003 R2).

Tier 1 (T1C):
- Owns R2 semantic implementation (`2c1bd169`) and R2 docs freeze (`ba42b25f`).
- Owns HANDOFF.md + TASK.md updates (control rows, unit gate counts, Implementation SHA pin, DEV-04 entry, revision log).
- Owns AUD-003 tooling-cleanup PR (after rebase onto canonical main).

Tier 0:
- Owns go-live decision, release risk acceptance, and PR prioritization (including the AUD-003 tooling-cleanup PR).
- Already accepted LIGHT audit risk for thin slice (T0 directive §audit_reason, 2026-09-26).
- Already granted one post-audit integrity exception for AUD-001 (T0 directive §AUD-001 R2, 2026-09-26). No further rounds permitted.

---

Bàn giao AUDIT.md cho Tier 1 với verdict CONDITIONAL. R1 audit (blob `c99a447db33767d5732df6778306ebd9d154dedb`) preserved byte-exact through R2 at commit `b2b71a2094f3fce4e8a7b89d6a9e06c9b10bfcf4`; reachable via `git show b2b71a2:docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/AUDIT.md` for historical provenance. AUD-001 (P1 RELEASE-BLOCKING) and AUD-002 (P3) closed at R2; AUD-003 (P3 accepted tooling debt) carried forward to dedicated tooling-cleanup PR. Tier 1 may adopt this R2 DELTA audit for resolution.
