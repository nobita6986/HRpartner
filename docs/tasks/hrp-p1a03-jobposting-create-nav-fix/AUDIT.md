# AUDIT — `hrp-p1a03-jobposting-create-nav-fix`

> Tier 3 LIGHT audit round 1. V2_FAST_FREEZE.
> Independent measurement + ENV_BLOCKED declaration for DB-gated AC.
> T0 runtime evidence carried forward with provenance + posture verified.

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1a03-jobposting-create-nav-fix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.1` (latest-main reconciliation after P1-F1 ACCEPT) |
| Audit mode | `LIGHT` |
| Audit round | `1` |
| Assurance lane | `CRITICAL` |
| Audit depth | `LIGHT` |
| Worktree | `C:\CodeApp\HrP-t1c-p1a03` |
| Branch | `codex/t1c-p1a03-jobposting-create-nav-fix` |
| Baseline (v1.1 reconciliation) | `7bdba6769ba62aed5a26de10c617d1ee996ebdd9` |
| Baseline (v1.0 anchor, retained in evidence) | `2586b9fa2574c978be56f4d8dc259228516fdfbc` |
| Semantic Implementation SHA | `36e5b18e448577d240b932b9af296fa60845df04` (code freeze on this branch) |
| Reconciled Implementation SHA | `5698294294289af50a67afa482196967f129d58c` (merge commit, == effective freeze boundary) |
| Previous freeze HEAD | `cceefa5baefa2272a0f9a303e35da8127d6f802f` (T1C v1.1 freeze) |
| Audit-target HEAD | `c491000bd1d25c6cf925dd24149a60b958c2866a` |
| Migration blob (expected) | `2fad21f86e86405ab7a6eefe8002a97a5d180bcc` (`prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql`) |
| Production migration | `NOT_RUN` (T0 owns `T0_PRODUCTION_MIGRATION_GATE`) |
| Production verification | `PENDING_T0_PRODUCTION_MIGRATION_GATE` |
| Correction batches used | `0` |
| Tier 3 verdict | `CONDITIONAL` (see §6) |
| Implementation SHA | `5698294294289af50a67afa482196967f129d58c` |
| Finding completeness | `COMPLETE_CURRENT_SURFACE` |
| Correction batch | `0` |

## 1. Findings Summary

| ID | Severity | Release-blocking | Owner | Description |
|---|---|---|---|---|
| AUD-001 | P3 | NO | Tier 0 | Production HTTP 500 root cause is reported as **environment-state drift** (Prisma `P2022` column-not-found caused by missing migration `20260926120000_p1a01_jobposting_stamps`), NOT an application-source defect. Migration bytes are unchanged vs `origin/main` (blob SHA `2fad21f86e86405ab7a6eefe8002a97a5d180bcc` on both sides). Branch does NOT apply or modify production migration state. Recorded as RISK-P1-A0.3-prod in HANDOFF §4. |
| AUD-002 | P3 | NO | Tier 0 (TASK §8 OQ-01) | `HR_STAFF` is in `ALLOWED_MUTATION_ROLES` but `hrp_project_visible_for` does NOT include `HR_STAFF`. `HR_STAFF` calling POST /api/admin/jobs/job-postings hits stage 3 with 0 rows visible and receives `404 NOT_FOUND`. Pre-existing app/RLS inconsistency, out of scope for this bundle, recorded as RISK-HR_STAFF-DENIED. The repro harness encodes this denial-by-default RLS behavior (E-04 stage 3 row). |
| AUD-003 | P3 | NO | Tier 1 (TASK) | HANDOFF §1 lists 11 task-local files. Cumulative diff vs `7bdba67..c491000` reports 11 files (1659 insertions, 3 deletions). T1C §1 numbers match the live git output. |
| AUD-004 | P3 | NO | Tier 1 (TASK) | HANDOFF §2 records `E-13` Unit lane result as "199 files / 3257 tests / 9 skipped". Cumulative source diff matches HANDOFF §1 listing (11 files). Targeted unit + new test files: 3 files / 29 tests PASS, all on changed surface. |

No P0, P1, or P2 release-blocking findings.

## 2. Acceptance Verification

### 2.1 Acceptance Criteria (22 AC)

| AC | Method | Measured result | Evidence |
|---|---|---|---|
| AC-01 | Inspected `tests/db/job-posting-create-bundle.repro.test.ts` + `evidence/EV-04-synthetic-reproduction.md`; verified that the repro harness exercises all 8 stages and self-skips on `!HAS_TEST_DB` (`describe.skipIf(SKIP)` at line 22-23). NOT independently re-run on local (`DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST` absent — DEC-13 honest `ENV_BLOCKED`). Tier 3 did NOT run synthetic DB gate locally. | ENV_BLOCKED | `tests/db/job-posting-create-bundle.repro.test.ts:22-23` (HAS_TEST_DB + describe.skipIf); `:19-30` (8 stages enumerated per directive); `evidence/EV-04-synthetic-reproduction.md:20-27` (stage 1..8 table for HR_MANAGER + HR_STAFF). Provenance verified via `evidence/EV-14-full-canonical-integration.md:56-63` (final vitest output 36 files / 605 passed / 2 skipped / exit 0). |
| AC-02 | Inspected `evidence/EV-04-synthetic-reproduction.md:40-55` (E-07) + `tests/db/job-posting-create-bundle.repro.test.ts` for stage 8 enumeration; verified migration blob `2fad21f86e86405ab7a6eefe8002a97a5d180bcc` is identical at HEAD and origin/main (`git rev-parse` returned the same SHA both sides). | ENV_BLOCKED | `evidence/EV-04-synthetic-reproduction.md:48-55` (Prisma P2022 column-not-found on `job_postings.is_hot`, stage 8 response serialization); `git rev-parse HEAD:prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` = `2fad21f86e86405ab7a6eefe8002a97a5d180bcc`; `git rev-parse origin/main:prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` = `2fad21f86e86405ab7a6eefe8002a97a5d180bcc` (identical). |
| AC-03 | Ran `npx vitest run --config vitest.unit.config.ts app/api/admin/jobs/job-postings/route.test.ts`; asserted 9 tests cover 200 + error-mapping contract. | PASS | `npx vitest run --config vitest.unit.config.ts app/api/admin/jobs/job-postings/route.test.ts` — exit 0; `app/api/admin/jobs/job-postings/route.test.ts (9 tests) 34ms`; 200 happy path + 400 INVALID_INPUT + 401 INTERNAL auth-failure + 403 PERMISSION_DENIED + 404 NOT_FOUND + 409 IDEMPOTENCY_CONFLICT + 500 INTERNAL — 9/9 PASS. |
| AC-04 | Inspected `tests/db/job-posting-authoring.integration.test.ts` test names + chain assertions; tests are wired to a synthetic DB that fails when the migration is missing (was 5 failed pre-fix, now all PASS after migration per `evidence/EV-04-synthetic-reproduction.md:60`). | ENV_BLOCKED | `tests/db/job-posting-authoring.integration.test.ts` (13 tests, E-04 confirms 13/13 PASS post-migration on synthetic cluster); `evidence/EV-04-synthetic-reproduction.md:58-60` (was 5 failed, now all PASS). Local env lacks DB credentials. |
| AC-05 | Inspected `tests/db/job-posting-authoring.integration.test.ts` test "reuses existing opening when slot already has one" (cited in HANDOFF §2 AC-05). | ENV_BLOCKED | Same as AC-04 evidence; `evidence/EV-14-full-canonical-integration.md:104` (row 28: 13 tests PASS). Local env lacks DB credentials. |
| AC-06 | Inspected `app/api/admin/jobs/job-postings/route.test.ts` + authoring integration (E-09). | ENV_BLOCKED | `app/api/admin/jobs/job-postings/route.test.ts` (9/9 route-level proof) + `tests/db/job-posting-authoring.integration.test.ts` (13/13) + `evidence/EV-04-synthetic-reproduction.md:58-63`. Local env lacks DB credentials. |
| AC-07 | Ran `npx vitest run --config vitest.unit.config.ts app/api/admin/jobs/job-postings/route.test.ts`; asserted test "returns 409 IDEMPOTENCY_CONFLICT" present and PASS. | PASS | `npx vitest run --config vitest.unit.config.ts app/api/admin/jobs/job-postings/route.test.ts` — exit 0; 9/9 PASS includes 409 IDEMPOTENCY_CONFLICT case. Source inspection: `app/api/admin/jobs/job-postings/route.test.ts` mock for `withIdempotency` + `IdempotencyConflictError` simulates the conflict and asserts 409 mapping. |
| AC-08 | Ran `npx vitest run --config vitest.unit.config.ts app/api/admin/jobs/job-postings/route.test.ts`; asserted test "returns 404 NOT_FOUND when slot does not exist" PASS. | PASS | Same vitest run; 9/9 PASS includes NOT_FOUND case for stale/invalid slot; source inspection confirms `assertSlotEligibleForNewJobPosting` returning NOT_FOUND is mapped to HTTP 404. |
| AC-09 | Ran `npx vitest run --config vitest.unit.config.ts app/api/admin/jobs/job-postings/route.test.ts`; asserted test "returns 403 PERMISSION_DENIED" PASS. | PASS | Same vitest run; 9/9 PASS includes 403 PERMISSION_DENIED for unauthorized role (SALE / outside ALLOWED_MUTATION_ROLES). |
| AC-10 | Inspected `tests/db/job-posting-authoring.integration.test.ts` transaction-rollback case (E-09); asserts that on Prisma `$transaction` failure, no orphan JobOpening / slot binding / JobPosting is left behind (covered by `withDbContext` invariant + per-test fixture cleanup). | ENV_BLOCKED | `tests/db/job-posting-authoring.integration.test.ts` (13 tests including transaction-rollback case); `evidence/EV-04-synthetic-reproduction.md:24-27` (stage 5+6+7 create chain asserted via authoring test). Local env lacks DB credentials. |
| AC-11 | Inspected `evidence/EV-14-full-canonical-integration.md` for full canonical integration result (CI_INTEGRATION_STRICT=1, 36 files / 605 passed / 2 skipped / exit 0). | ENV_BLOCKED | `evidence/EV-14-full-canonical-integration.md:54-69` (36 test files, 605 tests passed, 2 skipped (Redis-gated V5-OPS-06A), 0 failed, exit 0). Local env lacks DB credentials. |
| AC-12 | Inspected `tests/db/job-posting-stamps.integration.test.ts` for draft-no-public invariant (E-10). | ENV_BLOCKED | `tests/db/job-posting-stamps.integration.test.ts` (10 tests PASS, E-14 row 34); DRAFT postings do not surface in `GET /api/jobs` (total=0). Local env lacks DB credentials. |
| AC-13 | Ran `git diff 7bdba67..c491000 -- 'app/(jobs)/**' 'app/api/public/jobs/**' 'app/api/admin/jobs/job-postings/[id]/**' 'prisma/schema.prisma' 'src/shared/auth/auth-context.ts' 'src/shared/auth/with-db-context.ts' 'src/shared/auth/rls-context.ts' 'src/shared/integrity/idempotency.ts' 'src/domains/staffing/job-posting-list.service.ts' 'package.json' 'package-lock.json'`; output empty. Also re-checked `prisma/` and `prisma/schema.prisma` independently — empty. | PASS | `git diff 7bdba67..c491000 -- <forbidden paths>` — exit 0; output empty. Cumulative `git diff 7bdba67..c491000 -- 'prisma/'` — empty (no migration, no schema). Cumulative `git diff 56982942..c491000 -- 'app/(jobs)/**' 'app/api/public/jobs/**' 'prisma/schema.prisma' 'package.json' 'package-lock.json' 'src/domains/staffing/labor-profile/**' 'src/domains/staffing/placement/**'` — empty. |
| AC-14 | Ran encoding scan on 11 changed text files in `7bdba67..c491000` range (HANDOFF.md, TASK.md, EV-04, EV-14, route.test.ts, active-nav-helper.{ts,test.ts}, role-guard-layout.{tsx,test.ts}, repro.test.ts, vitest.integration-files.ts). | PASS | `node temp_encoding_range.mjs` — exit 0; `RESULT: PASS (11 checked, 0 failed)`; all 11 files are strict UTF-8 without BOM, LF-only, zero NUL/U+FFFD/mojibake. |
| AC-15 | Ran `npm run typecheck` (exit 0; `tsc --noEmit` clean) + `npx eslint --no-warn-ignored <changed surface>` (exit 0; 0 errors) + targeted unit `npx vitest run --config vitest.unit.config.ts <3 test files>` (3 files / 29 tests / 0 failed). NOT independently re-run full unit lane + build — carried forward from HANDOFF E-13 (199 files / 3257 tests / 9 skipped / 0 lint errors / build compiled). | PASS | `npm run typecheck` — exit 0; `tsc --noEmit` clean. `npx eslint --no-warn-ignored <5 changed files>` — exit 0; 0 errors / 0 warnings. `npx vitest run --config vitest.unit.config.ts <3 test files>` — exit 0; 3 files / 29 tests / 0 failed. Full unit lane + build: HANDOFF E-13 (199 files / 3257 tests / 9 skipped / 0 lint errors / build compiled in 19.6s). |
| AC-16 | Ran `npx vitest run --config vitest.unit.config.ts src/shared/ui/role-guard/active-nav-helper.test.ts`; asserted RQ-08 / AC-16 — child wins over parent. | PASS | `npx vitest run --config vitest.unit.config.ts src/shared/ui/role-guard/active-nav-helper.test.ts` — exit 0; `src/shared/ui/role-guard/active-nav-helper.test.ts (14 tests) 3ms`. Test "returns /admin/jobs/job-postings when pathname is /admin/jobs/job-postings" PASS. Source inspection: `src/shared/ui/role-guard/active-nav-helper.ts:50-69` (`getMostSpecificActiveHref` returns longest matching href). |
| AC-17 | Same vitest run; asserted RQ-08 / AC-16 — `/admin/jobs` exact match. | PASS | Same vitest run (14 tests PASS). Test "returns /admin/jobs when pathname is /admin/jobs (parent only)" PASS. |
| AC-18 | Same vitest run; asserted RQ-08 / AC-16 — child `/admin/jobs/job-postings` wins over parent `/admin/jobs` for arbitrary nested IDs. | PASS | Same vitest run (14 tests PASS). Test "returns /admin/jobs/job-postings when pathname is /admin/jobs/job-postings/{id}" PASS. |
| AC-19 | Same vitest run; asserted RQ-08 — no-match returns null. | PASS | Same vitest run (14 tests PASS). Test "returns null when pathname matches no item" PASS; also "returns null for empty / null / undefined pathname" PASS. |
| AC-20 | Ran `npx vitest run --config vitest.unit.config.ts src/shared/ui/role-guard/role-guard-layout.test.ts`; asserted wiring uses `href === activeHref`, not `startsWith`. | PASS | `npx vitest run --config vitest.unit.config.ts src/shared/ui/role-guard/role-guard-layout.test.ts` — exit 0; 6/6 PASS. Source inspection: `src/shared/ui/role-guard/role-guard-layout.tsx:192-195` (`isNavItemActive = (href) => activeHref !== null && href === activeHref`). Old prefix-match expression `pathname === href || (href !== '/' && pathname?.startsWith(href + '/'))` confirmed removed (line 41 import block + active flag at 192-195). |
| AC-21 | Same vitest run; asserted worker portal bottom-nav unchanged (still uses `pathname === item.href`). | PASS | Same vitest run (6/6 PASS). Test "keeps the worker portal bottom-nav on exact-match (pathname === item.href)" PASS. Source inspection: `src/shared/ui/role-guard/role-guard-layout.tsx:317` (`const active = pathname === item.href;` inside worker bottom-nav block). |
| AC-22 | Ran `npx vitest run --config vitest.unit.config.ts src/shared/ui/role-guard/role-guard-layout.test.ts`; asserted ADMIN_NAV_PHASE4 slice byte-exact (labels and order). | PASS | Same vitest run (6/6 PASS). Test "preserves ADMIN_NAV_PHASE4 structure byte-exact — labels and order are not changed" PASS. Source inspection: `src/shared/ui/role-guard/role-guard-layout.tsx:111-138` (`ADMIN_NAV_PHASE4` array unchanged in diff; only helper-wiring lines at 41, 184-195 changed). Cumulative diff `git diff 7bdba67..c491000 -- src/shared/ui/role-guard/role-guard-layout.tsx` shows ONLY helper import + activeHref memo + isNavItemActive equality-based + developmentActiveHref memo — zero ADMIN_NAV_PHASE4 byte changes. |

### 2.2 Assurance Checks

| Check | Status | Evidence |
|---|---|---|
| C-01 | DONE | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1a03-jobposting-create-nav-fix/TASK.md` — exit 0; RESULT: DRAFT-VALID (6 warning(s)) — A-04 expected non-blocking warning for READY_FOR_AUDIT status; T-09/T-10/T-11 V2 draft fields structurally valid |
| C-02 | DONE | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1a03-jobposting-create-nav-fix/TASK.md -HandoffPath docs/tasks/hrp-p1a03-jobposting-create-nav-fix/HANDOFF.md` — exit 0; RESULT: PASS; all H-01..H-16 OK; H-16 frozen-delivery gate closes (Frozen delivery YES, Canonical gates PASS, Correction batches used 0, Audit eligibility ELIGIBLE) |
| C-03 | DONE | `git rev-parse --verify c491000…^{commit}` + `git rev-parse --verify 56982942…^{commit}` + `git rev-parse --verify 36e5b18…^{commit}` + `git rev-parse --verify cceefa5…^{commit}` + `git rev-parse HEAD:prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` + `git rev-parse origin/main:prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` — exit 0 all six; all five commit SHAs resolve + migration blob identical (2fad21f8) on both sides |
| C-04 | DONE | `git rev-parse --verify c491000…^{commit}` (resolves) + `git rev-parse --verify 56982942…^{commit}` (resolves) + `git rev-parse --verify 36e5b18…^{commit}` (resolves) + `git log --oneline cceefa5…^..c491000…` (single-commit chain `docs(p1a03): v1.1 pre-audit evidence/control integrity closure`) — exit 0; c491000 is a forward-only child of cceefa5 (single-commit chain); 56982942 and 36e5b18 are ancestors of c491000; all forward-only |
| C-05 | DONE | `git diff --name-only cceefa5…^..c491000…` (i.e., the new commits) — output = `c491000 docs(p1a03): v1.1 pre-audit evidence/control integrity closure` (1 commit); `git diff --name-only cceefa5..c491000` = 2 files (HANDOFF.md modified + evidence/EV-14-full-canonical-integration.md added); matches prompt expectation of exactly 2 files |
| C-06 | DONE | `git diff --name-only 56982942..c491000` — output = `docs/tasks/hrp-p1a03-jobposting-create-nav-fix/HANDOFF.md`, `docs/tasks/hrp-p1a03-jobposting-create-nav-fix/TASK.md`, `docs/tasks/hrp-p1a03-jobposting-create-nav-fix/evidence/EV-14-full-canonical-integration.md` (3 files); matches prompt expectation of exactly 3 task-local docs/evidence files |
| C-07 | DONE | `git diff --name-only 56982942..c491000 -- 'app/(jobs)/**' 'app/api/public/jobs/**' 'prisma/schema.prisma' 'package.json' 'package-lock.json' 'src/domains/staffing/labor-profile/**' 'src/domains/staffing/placement/**'` + `git diff --name-only 7bdba67..c491000 -- 'app/(jobs)/**' 'app/api/public/jobs/**' 'app/api/admin/jobs/job-postings/[id]/**' 'prisma/schema.prisma' 'src/shared/auth/auth-context.ts' 'src/shared/auth/with-db-context.ts' 'src/shared/auth/rls-context.ts' 'src/shared/integrity/idempotency.ts' 'src/domains/staffing/job-posting-list.service.ts' 'package.json' 'package-lock.json'` — exit 0 both; empty output; zero source/test/schema/migration/package delta after the Implementation SHA |
| C-08 | DONE | `node temp_encoding_range.mjs` (custom scan over 11 changed text files in `7bdba67..c491000`) — exit 0; RESULT: PASS (11 checked, 0 failed); all 11 files are strict UTF-8 without BOM, LF-only, zero NUL/U+FFFD/mojibake. Also independently confirmed `git diff --check 7bdba67..c491000` exit 0 (empty whitespace-only delta) |
| C-09 | DONE | `npm run typecheck` — exit 0; `tsc --noEmit` clean (0 errors). `npx eslint --no-warn-ignored src/shared/ui/role-guard/role-guard-layout.tsx src/shared/ui/role-guard/active-nav-helper.ts src/shared/ui/role-guard/active-nav-helper.test.ts src/shared/ui/role-guard/role-guard-layout.test.ts app/api/admin/jobs/job-postings/route.test.ts` — exit 0; 0 errors / 0 warnings on changed surface. Targeted unit: `npx vitest run --config vitest.unit.config.ts <3 test files>` — exit 0; 3 files / 29 tests / 0 failed |
| C-10 | DONE | `git rev-parse HEAD:prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` = `2fad21f86e86405ab7a6eefe8002a97a5d180bcc`; `git rev-parse origin/main:prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` = `2fad21f86e86405ab7a6eefe8002a97a5d180bcc` — identical; migration bytes are unchanged vs origin/main (HANDOFF §4 D-01 and Canonical gates row). Cumulative `git diff 7bdba67..c491000 -- 'prisma/'` — empty; the bundle does NOT add or modify any migration |

## 3. Scope

Audit surface (independent re-measurement in this round):

- **Frozen Implementation SHA**: `5698294294289af50a67afa482196967f129d58c` (effective freeze boundary = post-merge reconciler HEAD; equals Reconciled Implementation SHA per directive).
- **Cumulative semantic range** `36e5b18..56982942`: P1-A0.3 + P1-NAV-01 source delta (semantic code freeze); 9 source/test/registry files (route.test.ts, active-nav-helper.{ts,test.ts}, role-guard-layout.{tsx,test.ts}, repro.test.ts, vitest.integration-files.ts, EV-04).
- **Post-freeze docs/evidence range** `56982942..c491000`: 3 task-local docs/evidence files only (HANDOFF.md + TASK.md + EV-14).
- **Forbidden-path scan** (cumulative `7bdba67..c491000`): all 13 forbidden paths in TASK §0 + HANDOFF §2 empty. `prisma/` and `prisma/schema.prisma` independently empty.

DB runtime evidence (`AC-01`, `AC-02`, `AC-04`, `AC-05`, `AC-06`, `AC-10`, `AC-11`, `AC-12`) is **ENV_BLOCKED** — Tier 3 could not independently re-run synthetic DB gates locally because `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST` are absent (DEC-13 honest `ENV_BLOCKED`). T0 reproduction at exact Implementation SHA `56982942` is carried forward with provenance verified:

- `evidence/EV-04-synthetic-reproduction.md` (sanitized stage-by-stage reproduction; no secrets, no production URL, no production Idempotency-Key);
- `evidence/EV-14-full-canonical-integration.md` (full canonical integration run; 36 files / 605 passed / 2 skipped (Redis-gated V5-OPS-06A) / 0 failed / exit 0 in 894.11s on T0-provisioned synthetic writer/admin pair);
- Posture verified at `evidence/EV-14-full-canonical-integration.md:32-49` (writer `app_user_writer` non-super + non-bypassrls; admin `neondb_owner` bypassrls=true; same host/port/database; synthetic-only cluster `ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech/neondb`);
- Production DB NOT touched (URLs masked by the preflight itself; grep on production-host markers returns 0 matches).

Tier 3 cross-checked the EV-14 file-by-file registry count (36 entries in `vitest.integration-files.ts`) against the table in `evidence/EV-14-full-canonical-integration.md:75-113` (36 entries); numbers agree. Test-sum cross-check: 9+59+124+11+11+13+1+7+6+6+10+32+32+5+13+5+4+10+16+19+17+15+15+26+4+10+7+13+6+20+11+10+20+10+20+10 = 607 total tests (605 passed + 2 skipped in Redis-gated V5-OPS-06A) — agrees with EV-14 "605 passed | 2 skipped (607)".

The HTTP 500 root cause (Prisma `P2022` column-not-found on `job_postings.is_hot` at stage 8 response serialization) is recorded in `evidence/EV-04-synthetic-reproduction.md:40-55` (E-07) and HANDOFF §1 + §4 D-01 + RISK-P1-A0.3-prod. Tier 3 confirms this is an **environment-state defect** (cluster missing migration `20260926120000_p1a01_jobposting_stamps`), NOT an application-source defect. Migration bytes are unchanged vs `origin/main` (blob SHA `2fad21f8` on both sides). The branch does NOT apply or modify production migration state.

Historical pre-existing shared-DB residue (P1-F1 `idempotency_keys` 20 rows; P1-F0 `idempotency_keys` 124 rows; P1-F0 `ClientCompany`/`Project`/`StaffingOrder`/`JobOpening` 80 rows each) is disclosed as `BLK-02` in HANDOFF.md §4 (carried from the prior P1-F1 audit round 1 disclosure; P1-F1 evidence folder is upstream and is referenced only as historical context). Tier 3 confirms this is NOT current-run residue of `56982942` — it predates the frozen delivery and is historical synthetic-DB debt left untouched per T0 decision.

## 4. Independent Evidence

| Command | Exit | Result |
|---|---|---|
| `git rev-parse HEAD` | 0 | `c491000bd1d25c6cf925dd24149a60b958c2866a` (matches prompt audit-target) |
| `git rev-parse --abbrev-ref HEAD` | 0 | `codex/t1c-p1a03-jobposting-create-nav-fix` |
| `git status --short` | 0 | (empty — clean working tree) |
| `git rev-parse --verify c491000… c56982942… c36e5b18… ccceefa5…` | 0 | all four SHAs resolve |
| `git rev-parse HEAD:prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` | 0 | `2fad21f86e86405ab7a6eefe8002a97a5d180bcc` (matches prompt expected blob) |
| `git rev-parse origin/main:prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` | 0 | `2fad21f86e86405ab7a6eefe8002a97a5d180bcc` (identical) |
| `git log --oneline cceefa5…^..c491000…` | 0 | true; c491000 is forward-only child of cceefa5 (single-commit chain `docs(p1a03): v1.1 pre-audit evidence/control integrity closure`); 56982942 and 36e5b18 are ancestors of c491000; all forward-only |
| `git diff --name-only cceefa5..c491000` | 0 | 2 files: HANDOFF.md (modified) + EV-14-full-canonical-integration.md (added) |
| `git diff --name-only 56982942..c491000` | 0 | 3 files: HANDOFF.md + TASK.md + EV-14 (all task-local docs/evidence) |
| `git diff --name-only 7bdba67..c491000 -- 'prisma/'` | 0 | (empty — no migration / no schema) |
| `git diff --name-only 7bdba67..c491000 -- '<forbidden paths>'` | 0 | (empty — all 13 forbidden paths byte-identical) |
| `git diff --check 7bdba67..c491000` | 0 | (empty — LF-only, no whitespace-only lines) |
| `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1a03-jobposting-create-nav-fix/TASK.md` | 0 | RESULT: DRAFT-VALID (6 warning(s)) |
| `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1a03-jobposting-create-nav-fix/TASK.md -HandoffPath docs/tasks/hrp-p1a03-jobposting-create-nav-fix/HANDOFF.md` | 0 | RESULT: PASS; all H-01..H-16 OK |
| `npm run typecheck` | 0 | `tsc --noEmit` clean (0 errors) |
| `npx eslint --no-warn-ignored <5 changed files>` | 0 | 0 errors / 0 warnings on changed surface |
| `npx vitest run --config vitest.unit.config.ts src/shared/ui/role-guard/active-nav-helper.test.ts src/shared/ui/role-guard/role-guard-layout.test.ts app/api/admin/jobs/job-postings/route.test.ts` | 0 | 3 files / 29 tests / 0 failed |
| `node temp_encoding_range.mjs` (custom scan, 11 changed text files) | 0 | RESULT: PASS (11 checked, 0 failed); strict UTF-8 no-BOM, LF-only, 0 NUL/U+FFFD/mojibake |

## 5. Coverage Gaps

Eight AC are **ENV_BLOCKED** — Tier 3 could not independently re-run synthetic DB gates locally because `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST` are absent (DEC-13 honest `ENV_BLOCKED`):

- **AC-01** (synthetic DB reproduction produces HTTP 500 / GREEN reproduction lock-in): T0 reproduction PASS (4/4) at exact Implementation SHA `56982942`; provenance verified via `evidence/EV-04-synthetic-reproduction.md:20-27` (stage-by-stage table for HR_MANAGER + HR_STAFF) + `evidence/EV-14-full-canonical-integration.md:17-25` (preflight guards); local env lacks DB credentials.
- **AC-02** (failing stage pinned + sanitized error code recorded): T0 records `P2022 — column not found` on `job_postings.is_hot` at stage 8 (response serialization); `tests/db/job-posting-create-bundle.repro.test.ts:8-15` enumerates the 8 stages; `evidence/EV-04-synthetic-reproduction.md:40-55` (E-07); migration blob `2fad21f8` identical at HEAD and origin/main.
- **AC-04** (eligible slot no opening → 1 JobOpening + 1 JobPosting DRAFT): T0 reproduction PASS (13/13) at exact Implementation SHA `56982942`; provenance verified via `tests/db/job-posting-authoring.integration.test.ts` + `evidence/EV-04-synthetic-reproduction.md:60`.
- **AC-05** (slot already has opening → reuse opening + 1 new JobPosting DRAFT): same T0 reproduction (test "reuses existing opening when slot already has one"); provenance verified.
- **AC-06** (same Idempotency-Key replay → 0 new rows): same T0 reproduction + 9/9 route-level proof at AC-03.
- **AC-10** (DB txn failure → rollback chain): same T0 reproduction (transaction-rollback case in `tests/db/job-posting-authoring.integration.test.ts`); provenance verified.
- **AC-11** (synthetic integration × 3 / E-09 + E-14): T0 reports 27/27 targeted (E-09) and 36 files / 605 passed / 2 skipped / exit 0 (E-14) at exact Implementation SHA `56982942`; provenance verified via `evidence/EV-14-full-canonical-integration.md:54-69`.
- **AC-12** (DRAFT no public / GET /api/jobs total=0): same T0 reproduction (`tests/db/job-posting-stamps.integration.test.ts` 10/10 PASS); provenance verified.

Tier 3 cross-verified the EV-14 file registry (36 entries in `vitest.integration-files.ts` vs 36 entries in the EV-14 table) and the test-sum (607 total = 605 passed + 2 skipped, matches EV-14 footer); posture `POSTURE_OK` (writer non-super + non-bypassrls; admin bypassrls=true; same host/port/database; synthetic-only cluster). The remaining release gate is `T0_PRODUCTION_MIGRATION_GATE` which is owned by T0.

## 6. Verdict

**Verdict:** CONDITIONAL

Rationale: 14/22 AC independently verified (PASS) at the audit-target HEAD via Tier 3 live re-run (route.test.ts 9/9, active-nav-helper.test.ts 14/14, role-guard-layout.test.ts 6/6, typecheck clean, eslint clean, encoding PASS, forbidden-path empty, migration blob `2fad21f8` identical at HEAD and origin/main); 8/22 AC (AC-01, AC-02, AC-04, AC-05, AC-06, AC-10, AC-11, AC-12) honestly declared **ENV_BLOCKED** — T0 reproduction at exact Implementation SHA `56982942` has verified provenance (`evidence/EV-04-synthetic-reproduction.md` for stage-by-stage + `evidence/EV-14-full-canonical-integration.md` for full canonical integration; posture `POSTURE_OK`; current-run delta = 0), code inspection confirms implementation correctness (route-level 9/9 + P1-NAV-01 helper 14/14 + wiring 6/6), but local env lacks synthetic DB credentials (`DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST` absent — DEC-13 honest `ENV_BLOCKED`). No P0/P1/P2 release-blocking findings. Frozen delivery (`Implementation SHA = 56982942`, `Reconciled Implementation SHA = 56982942`), canonical gates (`verify-task` DRAFT-VALID with expected warnings; `verify-handoff` PASS; `verify-encoding` PASS; typecheck clean; lint clean; unit 199 files / 3257 tests / 9 skipped carried forward; forbidden-path audit empty), and tier-3 substance checks (route + helper + wiring tests on changed surface) all green. Tier 1 may resolve on this AUDIT.md on the basis that the 8 `ENV_BLOCKED` AC are honest DB-gated declarations with verified T0 provenance + code inspection, not failures.

## 7. Re-audit Trace

| Round | Date | Verdict | Note |
|---|---|---|---|
| 1 | 2026-09-28 | CONDITIONAL | Initial LIGHT audit round. 14/22 AC PASS (Tier 3 live re-run); 8/22 AC ENV_BLOCKED (DB-gated, T0 provenance verified). 4 P3 observations recorded (AUD-001 environment-state root cause; AUD-002 HR_STAFF pre-existing inconsistency; AUD-003 11 files matching HANDOFF §1; AUD-004 unit lane numbers consistent). |

AUDIT.md cho Tier 1
