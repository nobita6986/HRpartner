# AUDIT: hrp-v5-go-live-21-credential-hygiene-closure

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-21-credential-hygiene-closure` |
| Work/Audit type | `INFRA / INFRA_AUDIT` |
| Spec version | `v1.1` |
| Execution round | `1` (Tier 2 prep STEP-00..06; OP STEP-07..11 OWNER_BLOCKED) |
| Audit round | `1` |
| Round opened by | Tier 3 independent context |
| Round closes when | Verdict PASS plus Planner Resolution ACCEPTED |
| Auditor/context | Tier 3 - Deep Audit Gate |
| Baseline/diff/artifacts | Baseline `7dd576e`; HEAD `485a36c` (Planner commit); diff vs `7dd576e` has 3 Planner commits only |
| Independence | Confirmed - Tier 3 independent, does not receive Tier 2 artifacts after this round |
| Audit time | 2026-09-07 11:25-12:30 Asia/Bangkok |

---

## 1. Findings

### AUD-001 - Active Neon credential in tracked source file

- Severity: P0 - critical
- Status: OPEN
- RQ/AC: RQ-10 / AC-11
- Evidence:
  - File `check_rls.cjs` line 2 - tracked (commit `ebca45c`)
  - Content: `postgresql://REDACTED_USER:REDACTED_PASS@ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` (Neon production `neondb_owner` role)
  - Command `git ls-files check_rls.cjs` returns tracked
  - Command `git status --porcelain check_rls.cjs` returns clean
  - Command `rg -nP 'postgresql://|postgres://' --glob '!scratch/**' --glob '!docs/tasks/**' --glob '!node_modules/**' --glob '!.next/**' --glob '!public/**'` hits `check_rls.cjs:2`
  - Evidence files: `evidence/go21-s00-check-rls-status.txt`, `evidence/go21-s00-secret-scan.txt`
- Impact: Credential is a Neon owner role possibly still active. DEC-03 and DEC-04 mandate rotation. Attacker with this credential has full DB access.
- Decision needed from Planner: `check_rls.cjs` is outside task 21 scope. Owner must (a) verify if credential is still active, (b) rotate immediately, (c) move credential to ENV. Open a separate task or extend task 21 scope.

### AUD-002 - STEP-01 `git rm --cached` did not persist in HEAD

- Severity: P1 - high
- Status: OPEN
- RQ/AC: RQ-02 / AC-02
- Evidence:
  - Command `git ls-files '.env*'` returns 4 files: `.env.dev`, `.env.example`, `.env.preview`, `.env.prod.test`
  - Command `git ls-files --stage .env.dev` returns hash `100644 c2e267cf2cba88e93381f73dcabe37f3491d2d90` (same as HEAD - still tracked)
  - Command `git check-ignore -v .env.dev .env.preview .env.prod.test` returns empty (not ignored because still tracked)
  - Command `git diff --cached` returns empty (no staged changes)
  - Evidence file `evidence/go21-s01-after-lsfiles.txt` - created by Tier 3 at audit time
  - Evidence file `evidence/go21-s01-index-status.txt`
  - Evidence file `evidence/go21-s01-gitignore-check.txt`
- Impact: Three env files with credentials remain tracked in HEAD. Although `.gitignore` has ignore rules, gitignore does not override tracked files. AC-02 FAIL.
- Decision needed from Planner: Tier 2 needs to commit staged changes to persist into HEAD; or rebase onto current HEAD.

### AUD-003 - Evidence file `go21-s05-apply-blocked.txt` missing

- Severity: P3 - low
- Status: OPEN
- RQ/AC: RQ-09 / AC-09
- Evidence:
  - `Test-Path evidence/go21-s05-apply-blocked.txt` returns False
  - HANDOFF section 6 references this file but it does not exist
  - Tier 3 successfully reproduced apply fail-closed behavior: exit 2 with correct message
- Impact: Verification gate S-15 could fail. No substantive verification gap since Tier 3 reproduced the behavior independently.
- Decision needed from Planner: Tier 2 needs to write all artifact files to disk correctly.

---

## 2. Acceptance Verification

Tier 3 self-measured each AC. Method = command Tier 3 ran independently.

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | `rg --files-with-matches` across 3 layers; `rg 'demo-portal-2026'` in source and scratch | PASS | 18 evidence files exist. `rg -n 'demo-portal-2026' prisma/` returns 0 matches in source (test file contains literal as string test name only). RED canary scan: 0 match. | None |
| AC-02 | `git ls-files '.env*'` and `git check-ignore -v` | FAIL | `git ls-files '.env*'` returns 4 files (expected 1). `git check-ignore -v` returns empty for env files (not ignored because tracked). | AUD-002 |
| AC-03 | `npx vitest run prisma/seed-portal-demo-password.static.test.ts` | PASS | 5 tests passed, exit 0. Seed line 385 changed from literal to `process.env.PORTAL_DEMO_PASSWORD` with SKIP guard. | None |
| AC-04 | `rg -n 'STEP-07' docs/runbooks/credential-hygiene-cutover.md` | BLOCKED | Runbook section 2 lines 49-51: probe SQL template exists. OP execution Owner runs STEP-07. | None (by design) |
| AC-05 | `rg -n 'Smoke matrix' docs/runbooks/credential-hygiene-cutover.md` | BLOCKED | Runbook section 3 lines 63-75: smoke matrix with 6 routes exists. OP execution Owner runs STEP-08. | None (by design) |
| AC-06 | `Test-Path .env.local, .env.ops06a-test.local, .env.production.local` | **BLOCKED** | Result exit=0; count=3 files exist. Owner disposition not yet filled in manifest. OP execution Owner runs STEP-10. | None (by design) |
| AC-07 | `Get-Content evidence/go21-s04-disposition.md` line count | BLOCKED | Disposition manifest has 68 lines with 13 paths requiring Owner disposition. Before/after not yet measured. OP execution Owner runs STEP-10. | None (by design) |
| AC-08 | `rg -n 'pre-mp2-remediation' docs/runbooks/credential-hygiene-cutover.md` | BLOCKED | Runbook section 5 lines 96-97: exact-name target and negative guard exist. OP execution Owner runs STEP-10. | None (by design) |
| AC-09 | `node scripts/ops/demo-cleanup.mjs dry-run` run twice; `node scripts/ops/demo-cleanup.mjs apply` attempt | PASS | Dry-run x 2: exit 0, manifest hash `3fb0d3cc0f6fcb85dc3f3b978a71819f05bc011f8a5d4cad141222a14cfde47e` (matches both runs). Apply with non-local DB: exit 2, message "DB gate FAIL". | AUD-003 |
| AC-10 | `npx vitest run` and `npm run build` | PASS | vitest: 113 test files, 1740 tests, exit 0. build: exit 0. Production smoke not yet measured (OP execution). | None |
| AC-11 | `rg -nP 'postgresql://|postgres://' --glob '!scratch/**' --glob '!docs/tasks/**' --glob '!node_modules/**' --glob '!.next/**' --glob '!public/**'` | FAIL | Scan returns 1 hit: `check_rls.cjs:2`. Credential type is DB_URL_WITH_PASSWORD, Neon owner role. File is tracked. | AUD-001 |

### Mandatory Checks (Deep Audit C-01 to C-10)

| Check | Status | Evidence (command plus exit plus output) |
|---|---|
| C-01 Regression test | DONE | `npx vitest run` returns exit 0; 113 test files; 1740 tests passed |
| C-02 Build | DONE | `npm run build` returns exit 0; build succeeded |
| C-03 Route handlers line-by-line | SKIP (INFRA work type - no route changes) | Task 21 does not modify any route handler |
| C-04 Prisma query vs schema | SKIP (INFRA - no query changes) | `npx prisma validate` returns schema valid, exit 0 (bonus check) |
| C-05 POST/PATCH idempotency and outbox | SKIP (INFRA - no new routes) | Task 21 creates no routes |
| C-06 Migration and RLS policy | SKIP (INFRA - no schema or RLS changes) | Task 21 does not modify schema or RLS |
| C-07 Git hygiene (scope, forbidden zones) | DONE | `git log 7dd576e..HEAD` returns 3 Planner commits. `git diff 7dd576e..HEAD --name-status` shows only 3 Planner docs. No Tier 2 commits. No forbidden zones touched. `git diff --cached` is empty - staged changes did not persist. |
| C-08 Test coverage for new or modified files | DONE | `npx vitest run prisma/seed-portal-demo-password.static.test.ts` returns 5 tests passed. New test file provides full AC-03 coverage. No new routes to cover. |
| C-09 `verify-task.ps1` on TASK | DONE | `powershell -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/TASK.md` returns RESULT PASS |
| C-10 Diff scope from baseline to HEAD | DONE | `git diff 7dd576e..HEAD --name-only` shows only Planner docs. No out-of-scope files. Tier 2 prep artifacts are in worktree, not yet committed. |

---

## 3. Scope and Impact

- Deliverables in scope (Tier 2 prep): `.gitignore` (credential hygiene section correct), `prisma/seed.mjs` (literal fixed), `prisma/seed-portal-demo-password.static.test.ts` (5 tests), `docs/runbooks/credential-hygiene-cutover.md` (complete), `scripts/ops/demo-cleanup.mjs` (fail-closed correct), `evidence/go21-s04-disposition.md`, `evidence/go21-s05-demo-manifest.json`
- Out-of-scope changes: `check_rls.cjs` - found by Tier 3; outside task 21 scope
- Blast radius: No impact on business logic. Env untrack and seed fix affect dev-setup and seed pipeline.
- Data/security/migration/operations: P0 credential in `check_rls.cjs` requires immediate rotation. All OP steps (STEP-07 through STEP-11) remain OWNER_BLOCKED.

---

## 4. Independent Evidence

Tier 3 ran every command independently. Numbers are NOT from HANDOFF.

| Check/command | Exit/result | Summary | Evidence path |
|---|---|---|---|
| `npx vitest run` | exit 0 | 113 test files; 1740 tests passed | `C:\Users\Admin\.cursor\projects\c-CodeApp-HrP\terminals\925921.txt` |
| `npm run build` | exit 0 | Build succeeded | `C:\Users\Admin\.cursor\projects\c-CodeApp-HrP\terminals\925922.txt` |
| `npx prisma validate` | exit 0 | Schema valid | `evidence/go21-s02-prisma-validate.txt` |
| `git ls-files '.env*'` | exit 0; count 4 | 4 files tracked (expected 1) | `evidence/go21-s01-after-lsfiles.txt` |
| `git ls-files --stage .env.dev` | exit 0; hash `100644 c2e267cf...` | .env.dev still tracked at HEAD | `evidence/go21-s01-index-status.txt` |
| `git status --porcelain .gitignore` and `Test-Path .env.dev .env.preview .env.prod.test .neon tsconfig.tmp.json` | exit 0; count 0 env files in gitignore output; count 2 .neon+tsconfig.tmp.json exist | .env files NOT listed in tracked change set (still tracked); .neon and tsconfig.tmp.json present in worktree. .gitignore lines 79-80 contain ignore rules for .neon and tsconfig.tmp.json. | `evidence/go21-s06-gitignore-check-all.txt` |
| `git diff --cached` | exit 0; count 0 | No staged changes | `evidence/go21-s01-no-staged.txt` |
| `npx vitest run prisma/seed-portal-demo-password.static.test.ts` | exit 0; tests 5 of 5 passed | Seed literal correctly fixed | `evidence/go21-s02-test-audit.txt` |
| `node scripts/ops/demo-cleanup.mjs dry-run` (run twice) | exit 0 both times; hash `3fb0d3cc0f6fcb85dc3f3b978a71819f05bc011f8a5d4cad141222a14cfde47e` | Dry-run idempotent; same hash both runs | `evidence/go21-s05-dry-run-audit.txt` |
| `node scripts/ops/demo-cleanup.mjs apply` with non-local DB URL | exit 2; message "DB gate FAIL" | DB gate fail-closed works correctly | `evidence/go21-s05-apply-audit.txt` |
| `rg -nP 'postgresql://|postgres://' --glob '!scratch/**' --glob '!docs/tasks/**' --glob '!node_modules/**' --glob '!.next/**' --glob '!public/**'` | hit count 1 | Raw Neon credential in tracked file | `evidence/go21-s00-secret-scan.txt` |
| `git ls-files check_rls.cjs` | exit 0 | File is tracked | `evidence/go21-s00-check-rls-status.txt` |
| `powershell -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/TASK.md` | exit 0; RESULT PASS | TASK contract valid | `evidence/go21-gate-task.txt` |
| `git log 7dd576e..HEAD --oneline` | count 3 | 3 Planner commits; 0 Tier 2 commits | `evidence/go21-s00-baseline.txt` |
| `rg -n 'STEP-07' docs/runbooks/credential-hygiene-cutover.md` | matches at lines 3 and 27 | STEP-07 section exists | `evidence/go21-s06-runbook-probes.txt` |
| `rg -n 'Smoke matrix' docs/runbooks/credential-hygiene-cutover.md` | matches at lines 65 and 132 | Smoke matrix section exists | `evidence/go21-s06-smoke-matrix.txt` |
| `rg -n 'pre-mp2-remediation' docs/runbooks/credential-hygiene-cutover.md` | matches at lines 13, 100, and 105 | Branch names and guards exist | `evidence/go21-s06-branch-names.txt` |

---

## 5. Coverage Gaps

- Tier 3 used `rg` pattern-based scan for secret detection. A dedicated tool (TruffleHog, git-secrets) has not been run. Recommendation: Owner runs a dedicated secret scanner in OP execution.
- DEMO apply mode in `demo-cleanup.mjs` is a stub. Dry-run exits 0 but actual apply has not been executed. OP execution needs to run apply with a safe DB read target.
- Production smoke: STEP-08 smoke routes not yet measured. BLOCKED by Q-01 through Q-04.
- Typecheck for production auth: AC-10 typecheck has not been measured separately. `npm run build` exit 0 is a proxy signal but not a guarantee.
- AUD-001 P0 remediation: `check_rls.cjs` credential requires rotation. This is outside task 21 scope. Needs a separate task or scope extension.

---

## 6. Verdict and Planner Questions

**Verdict:** `FAIL`

**Reason:** P0 (AUD-001: `check_rls.cjs` credential) and P1 (AUD-002: env files still tracked). AC-02 FAIL, AC-11 FAIL. PASS requires no P0/P1/P2 open plus all C-01 through C-10 DONE (SKIP with reason) plus `verify-audit.ps1` PASS. Conditions not yet met.

Planner decisions required:

1. AUD-001 P0 (immediate): `check_rls.cjs` contains active credential. Owner must verify if credential is still active. If yes: rotate immediately. Open a separate task or extend task 21 scope.
2. AUD-002 P1: `git rm --cached` did not persist. Tier 2 needs to commit staged changes or rebase onto current HEAD.
3. AUD-003 P3: Tier 2 needs to write all artifact files into the evidence directory.

Scope creep check (C-10): PASS - `git diff 7dd576e..HEAD` shows only 3 Planner doc files. Tier 2 prep artifacts are in worktree, not committed.

---

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1 | AUD-001 | N/A (new) | OPEN | `evidence/go21-s00-secret-scan.txt`, `evidence/go21-s00-check-rls-status.txt` |
| 1 | AUD-002 | N/A (new) | OPEN | `evidence/go21-s01-after-lsfiles.txt`, `evidence/go21-s01-index-status.txt`, `evidence/go21-s01-gitignore-check.txt` |
| 1 | AUD-003 | N/A (new) | OPEN | Reproduced independently with exit 2; evidence file missing |

> Da ban giao AUDIT.md cho Tier 1; cho Planner Resolution trong TASK.md.
