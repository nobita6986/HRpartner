# HANDOFF — hrp-v6-n2-aff-05a-r2-bounded-manager-assignment

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-05a-r2-bounded-manager-assignment` |
| Spec version | `v1.2` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Execution round | `3` |
| Current audit round | `3` |
| Status | `READY_FOR_AUDIT` |
| Baseline | `825f763929e4a3026fc7b5d50436e216ef66da8c` (`origin/main`, post-#40 admin-managed phone link; `1e1895d1` is no longer main) |
| Authority | TASK v1.1 blob at commit `17d7cc26f05ede322f819f7bcdaa59a6a0805521` |
| Semantic commit SHA | `a9431702b97d3be67ce28aad4d75c238c55dec37` (short `a943170`) — T0 authoritative integration correction on top of `c1744ab`; business policy remains 1/7/30. T0 brief reports `a943170a97e773353df01c09cc252585896e5eaf` (T0 brief typo, does not resolve; see AUDIT.md `AUD-001`). |
| Docs/evidence freeze | the commit containing this HANDOFF; implementation bytes remain pinned separately to `a943170` and the post-AUD-001 docs closure to `c885274`. |
| Implementation HEAD | `a9431702b97d3be67ce28aad4d75c238c55dec37` — exact implementation/contract SHA covered by the T0 synthetic-DB evidence below. |
| Executor | `Tier 1B` |
| Planner Resolution | `TIER3_PASS` — round-3 AUDIT (DELTA) lifted the CONDITIONAL verdict to PASS by closing `AUD-001` via the `c885274` docs/evidence freeze (no source / test / migration / contract bytes touched). |
| Next gate | `T0_PRODUCTION_PREFLIGHT_AND_MERGE_DECISION` — T0 fresh production read-only preflight, migration impact review, CI observation, then merge/apply/smoke decision. No `ACCEPTED` closeout yet. |

T0 correction batch (2026-09-24, semantic contract 1/7/30 unchanged):

- **§1 provenance/SHA**: the previously pinned `f505abc` SHA was a transient `--amend` artifact and is no longer the HEAD. The previously frozen `f513608` was a docs/evidence freeze on top of the prior semantic `23fc38d`. T0 correction batch §1 retires both as not-current and pins the NEW semantic commit `8612795` (correction batch) with a docs/evidence freeze commit on top. All SHAs are recorded above.
- **§2 mojibake**: TASK.md had six mojibake tokens (em-dash, right arrow, left/right double quote, en-dash, section sign) — UTF-8 round-trip artifacts from the source blob. They are restored to the correct UTF-8 characters. U+FFFD = 0; remaining mojibake = 0.
- **§3 constraint scope**: `pg_constraint` lookups in the migration AND the integration test now bind `conrelid = 'public.labor_profile_handling_assignments'::regclass AND contype = 'c'`. A new negative-scoping test seeds a same-named decoy CHECK on a different table BEFORE applying R2 and asserts R2 still adds the target CHECK on the target relation (proves scoping works).
- **§4 upgrade path**: integration test now stages a temp pseudo-repo whose `prisma/migrations/` is pruned to exclude `20260924170000_*`, runs `prisma migrate deploy` against the pruned schema path on an ephemeral DB, seeds legacy rows, and applies R2 byte-identical. This is the real predecessor state — not the previous "apply all + DROP CONSTRAINT" fake.
- **§5 AC-05 race**: a new it() opens two independent Prisma clients and races two `MANAGER_ASSIGNMENT` INSERTs against the same `labor_profile_id` and `status='ACTIVE'`. Exactly one wins; the loser receives either Prisma `P2002` or raw SQLSTATE `23505`. No duplicate row, no orphan history. The bounded lock_timeout file-shape assertion is in a separate it() so the audit lane can classify them independently.
- **§6 canonical gates**: full re-run of `prisma validate`, `prisma generate`, `tsc --noEmit`, `npm run lint`, `npm run build`, `npx vitest run --config vitest.unit.config.ts`. Integration lane still self-skips under `ENV_BLOCKED` in this sandbox (no `DATABASE_URL_TEST`); authoritative integration run is T0's gate.
- **§7 historical sync**: round 1 had TASK/HANDOFF Status=`READY_FOR_AUDIT`, Spec version=`v1.1`, Next gate=`TIER3_LIGHT_AUDIT`. Round 2 supersedes these control fields with v1.2 and `TIER3_DELTA_REAUDIT`; business policy stays 1/7/30.

T0 authoritative integration correction (2026-09-24, semantic contract 1/7/30 unchanged):

- T0 provisioned a dedicated PostgreSQL 18 database on loopback only, applied all 50 migrations, and used the exact `app_user_writer` non-super/non-bypass role plus a `postgres` admin connection to the same database. No Neon, staging, production credential, or production data was used.
- The first real run exposed five defects in the task integration test that static review could not prove: three catalog assertions queried the base DB instead of their ephemeral DB, the fresh fixture was already beyond seven days, and Prisma `P2010` carried SQLSTATE `23505` in `meta.code`. All are corrected at `a943170`.
- Windows temp cleanup now retries a bounded 15 times and still fails visibly after the bound. Existing W5 manager-assignment fixtures now include a finite seven-day deadline so they conform to the new database CHECK.
- Targeted result: `1 file / 6 passed / 0 skipped / 0 failed`. Canonical result: `27 files / 487 passed / 2 pre-existing skips / 0 failed`. Temporary writer password verifier was restored, temporary membership revoked, and the synthetic database removed after the run.

T0 alignment correction at execution start (semantic contract 1/7/30 unchanged):
- Baseline `1e1895d1` → `825f7639` (origin/main post-#40).
- Migration directory `20260924140000` → `20260924170000` because main already
  carries `20260924150000` + `20260924160000`.
- Re-aligned allowlist and Revision Log row. No business-semantics change.

## 1. Outcome and changed surface

AFF-05A-R2 ships the bounded manager-assignment contract end-to-end:

- Manager duration is integer days in `[1, 30]` with server default `7`. The
  route detects property presence (not truthiness); explicit `null`, strings,
  booleans, `NaN` / `Infinity`, fractions, zero, negative, and values `>30`
  are rejected without coercion. The service re-validates and throws a typed
  `ManagerAssignDaysError` that maps to HTTP `400`.
- Release to Company Pool remains a separate action selected by the absence
  of `newAssigneeUserId`; it never enters `managerAssign`.
- The forward-only migration `20260924170000` backfills `expires_at =
  starts_at + interval '7 days'` on the narrow target predicate
  `source = 'MANAGER_ASSIGNMENT' AND expires_at IS NULL AND starts_at IS NOT NULL`.
  Overdue `ACTIVE` rows transition to `EXPIRED`; terminal status
  (`COMPLETED` / `REVOKED` / `TRANSFERRED` / already-`EXPIRED`) is preserved.
  `AFF_INITIAL` and `CASE_RESOLUTION` rows outside the predicate are
  byte-for-byte unchanged.
- The migration adds a conditional CHECK
  `source IS DISTINCT FROM 'MANAGER_ASSIGNMENT' OR expires_at IS NOT NULL`
  so direct SQL cannot create an indefinite manager assignment while leaving
  the Prisma field nullable (other sources still allow NULL deadline).
- The migration runs under `SET LOCAL lock_timeout = '5s'`, with fail-closed
  anomaly guards (future `starts_at`, NULL `starts_at`, unknown status,
  active-row overlap) that abort before mutation.
- Existing at-most-one-active backstop (`labor_profile_handling_active_idx`
  partial unique index) is preserved verbatim; concurrent manager
  assignments still leave exactly one active winner and complete history.

This slice does NOT open AFF-05B, commission, CRM, ER-003, dispute/case,
scheduler, new permission, or global RLS work. No `Ticket` change. No
Company Pool table.

### Changed surface (only Exact File Allowlist §4.5 + T0-approved config widening)

| Path | Change |
|---|---|
| `src/domains/talent/handling-assignment.service.ts` | Add typed `ManagerAssignDaysError` + `normalizeManagerAssignDays(present, raw)` enforcing DEC-01 (default `7`) and DEC-02 (rejects null, string, boolean, NaN/Infinity, fraction, 0, negative, `>30`). `managerAssign` now calls the validator as the final guard so non-route callers cannot bypass. Constants `MANAGER_ASSIGN_DAYS_DEFAULT` / `_MIN` / `_MAX` exported. |
| `src/domains/talent/handling-assignment.service.test.ts` | Add 7 unit cases for `normalizeManagerAssignDays` (boundary, null, types, NaN/Infinity, fraction, 0/neg/31+) and 1 service-boundary case confirming `managerAssign` re-validates `days` and rejects invalid values. |
| `app/api/admin/labor-profiles/[id]/handling-assignments/route.ts` | Detect `days` property presence with `Object.prototype.hasOwnProperty.call(body, 'days')`. Route no longer uses `Number()` / `parseInt` / truthy collapsing. Calls `normalizeManagerAssignDays`; on `ManagerAssignDaysError` returns HTTP `400`. Concurrent `P2002` remains `409`. |
| `app/api/admin/labor-profiles/[id]/handling-assignments/route.test.ts` | New 15-case unit file (AC-01). Accepts `1`, `7`, `30`, property-absent. Rejects explicit `null`, string, boolean, NaN, Infinity, fraction, zero, negative, `31`. Release path verified: no `newAssigneeUserId` routes to `releaseHandlingAssignment`; property-present null days still rejected. |
| `app/admin/labor-profiles/[id]/handling-assignment-manager.tsx` | UI defaults `days` to `''` (blank — server picks `7`); input gets `max="30"` and `step="1"`. Submission sends `days: undefined` (property absent) when blank, or `days: Number(days)` only when the user picked an assignee; never pre-coerces for release. |
| `prisma/migrations/20260924170000_aff05a_r2_bounded_manager_assignment/migration.sql` | New forward-only migration. Header documents 1/7/30 contract. Body runs under `SET LOCAL lock_timeout = '5s'`. Acquires `LOCK TABLE ... IN SHARE ROW EXCLUSIVE MODE`. Fail-closed anomaly guards (future starts_at, NULL starts_at, unknown status, active overlap) abort before mutation. Narrow backfill sets `expires_at = starts_at + interval '7 days'` and transitions overdue ACTIVE → EXPIRED. Adds conditional CHECK `labor_profile_handling_assignments_manager_expires_required` via idempotent DO block guarded by `pg_constraint`. Two final assertions: zero remaining indefinite manager rows; constraint present in `pg_constraint`. |
| `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` | DB integration test with real predecessor chain. T0 correction makes catalog assertions use their ephemeral DB clients, keeps the fresh fixture six days old, recognizes PostgreSQL `23505` through Prisma P2010 `meta.code`, and gives Windows temp cleanup a bounded fail-visible retry. Targeted T0 result: 6/6 PASS. |
| `tests/db/handling-assignment.integration.test.ts` | T0-approved compatibility correction: two existing terminal `MANAGER_ASSIGNMENT` fixtures now include `expiresAt = startsAt + 7 days`, satisfying the new database CHECK without changing W5 authorization expectations. |
| `vitest.integration-files.ts` | Register the new test file in the canonical guarded integration lane (only the inventory entry, no other paths touched). |
| `vitest.unit.config.ts` | T0-approved widening: add `'app/**/*.test.ts'` to `include` so route-handler unit tests are picked up. Fail-closed DB sentinel unchanged. |
| `vitest.config.ts` | T0-approved widening: add `'app/**/*.test.ts'` to `include` so default lane (`npm test`) is consistent with unit lane. Sentinel unchanged. |
| `src/shared/toolchain/vitest-default-lane.static.test.ts` | T0-approved amendment: `RQ05_INCLUDE_GLOBS` now contains `app/**/*.test.ts` so AC-05 stays green against the widened configs. Drift detection logic and negative test unchanged. |
| `docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md` | v1.2 records T0 authoritative integration findings, the named W5 fixture allowlist delta, and the delta re-audit gate. |
| `docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/HANDOFF.md` | This document. |

All diff is local to the allowlisted categories plus the three T0-approved
config edits (`vitest.unit.config.ts`, `vitest.config.ts`,
`vitest-default-lane.static.test.ts`). No file under
`docs/PLANNER_HANDOVER.md`, ER-003 source/docs, CRM contracts, AFF-05B,
dispute/case, `Ticket`, scheduler, auth/global RLS, env/config, AFF/CRM
runtime, or existing migrations is touched.

## 2. Acceptance evidence

| AC | RQ | Evidence | Limitation |
|---|---|---|---|
| `—` | — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath "docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md"` ⇒ `RESULT: PASS. TASK contract is ready for execution.` (re-runnable; §3 E-04). Contract gate green before this round executed. | none. |
| `AC-01` | `RQ-01` | `app/api/admin/labor-profiles/[id]/handling-assignments/route.test.ts` (15 cases): accepts `1`, `7`, `30`, property-absent; rejects explicit `null`, string, boolean, NaN, Infinity, fraction, zero, negative, `31`. Service `src/domains/talent/handling-assignment.service.test.ts` adds 7 cases for `normalizeManagerAssignDays` plus 1 service-boundary case confirming `managerAssign` re-validates `days`. | Unit lane only; no DB. Authoritative integration lane (AC-02..AC-06) is the Integration lane below. |
| `AC-02` | `RQ-02` | Real predecessor chain in an ephemeral DB; R2 applies byte-identical and creates exactly one scoped CHECK on the target relation. | **PASS** in T0 PostgreSQL 18 targeted run (E-09b). |
| `AC-03` | `RQ-03` | Six-day fresh ACTIVE, ten-day overdue ACTIVE, terminal REVOKED, AFF_INITIAL and CASE_RESOLUTION fixtures prove exact seven-day arithmetic, only overdue ACTIVE→EXPIRED, terminal/non-target preservation, and zero indefinite manager rows. | **PASS** in T0 targeted run (E-09b). |
| `AC-04` | `RQ-04` | A same-named decoy CHECK on another relation does not prevent R2 from adding the target CHECK; both remain present with strict relation/type scope. | **PASS** in T0 targeted run (E-09b). |
| `AC-05` | `RQ-05` | Two independent clients produce one ACTIVE winner and a typed P2002/PostgreSQL `23505` loser (including Prisma P2010 `meta.code`); row counts prove no duplicate/orphan. Separate AC-05/LT verifies bounded lock timeout. | **PASS** in T0 targeted run (E-09b). |
| `AC-06` | `RQ-06` | A future `starts_at` anomaly aborts R2; the ephemeral DB proves the CHECK is rolled back and the anomalous row remains unchanged. | **PASS** in T0 targeted run (E-09b). |
| `AC-07` | `RQ-01`..`RQ-06` | Quality gates remain as recorded. T0 additionally ran the strict canonical integration lane on a fully migrated PostgreSQL 18 synthetic DB: 27 files / 487 passed / 2 pre-existing skips / 0 failed. | **PASS**, pending Tier 3 delta re-audit of `a943170`. |

## 3. Evidence registry

| ID | Runnable command | Exit / measurement |
|---|---|---|
| `E-01` | `DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder' DATABASE_URL_ADMIN='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder' npx prisma validate` | exit `0` — "The schema at prisma/schema.prisma is valid 🚀" |
| `E-02` | `DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder' DATABASE_URL_ADMIN='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder' npx prisma generate` | exit `0` — Prisma Client (v5.22.0) generated; runtime model list unchanged |
| `E-03` | `npm run lint` | exit `0` — 0 errors, 706 warnings (all pre-existing baseline `any` warnings on test files; no new warnings introduced by this slice) |
| `E-04` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath "docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md"` | exit `0` — `RESULT: PASS. TASK contract is ready for execution.` |
| `E-05` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath "docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md" -HandoffPath "docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/HANDOFF.md"` | exit `0` — `RESULT: PASS.` |
| `E-06` | `npx vitest run --config vitest.unit.config.ts` | exit `0` — `Test Files 165 passed (165)` / `Tests 2570 passed | 9 skipped (2579)`. Route contributes 15 passing cases; service contributes 18 total: 11 carried-in + 6 inner normalization cases + 1 service-boundary case. |
| `E-07` | `git diff --check 825f763929e4a3026fc7b5d50436e216ef66da8c..HEAD` | exit `0` — no whitespace errors, no trailing whitespace, no mixed line endings (LF only) |
| `E-08` | `npx tsc --noEmit` (= `npm run typecheck`) | exit `0` — `tsc --noEmit` PASS, 0 errors |
| `E-09` | (sandbox) `npm run test:integration` | exit `0` — `ENV_BLOCKED` printed by `scripts/ci/integration-preflight.mjs` (DATABASE_URL_TEST absent). Integration lane NEVER falls back to dev/prod. Per the env contract, this is a blocked state, NOT a fake PASS. |
| `E-09b` | (T0-authoritative) set secret local loopback `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST`; `$env:CI_INTEGRATION_STRICT='1'; npm run test:integration` | **PASS** on PostgreSQL `18.6`, dedicated DB `aff05ar2_t0_20260924`: posture `app_user_writer` non-super/non-bypass + `postgres` admin same target; all 50 migrations applied; canonical result `27 files / 487 passed / 2 pre-existing skips / 0 failed`. Targeted file rerun: `1 file / 6 passed / 0 skipped / 0 failed`. No Neon/staging/production credential or data. Password verifier restored, temporary membership revoked, and synthetic DB removed after the run. |
| `E-10` | `rg --no-heading --line-number 'publicUrl|public_url|rootPath|root_path|token|bytea' -- "src/domains/talent/handling-assignment.service.ts" "src/domains/talent/handling-assignment.service.test.ts" "app/api/admin/labor-profiles/[id]/handling-assignments/route.ts" "app/api/admin/labor-profiles/[id]/handling-assignments/route.test.ts" "app/admin/labor-profiles/[id]/handling-assignment-manager.tsx" "prisma/migrations/20260924170000_aff05a_r2_bounded_manager_assignment/migration.sql" "tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts" "tests/db/handling-assignment.integration.test.ts" "vitest.integration-files.ts"` | exit `1`, 0 hits (expected ripgrep no-match exit). Quoted paths make the command PowerShell-safe despite `[id]`. |
| `E-11` | `git diff --name-only 825f763929e4a3026fc7b5d50436e216ef66da8c..a943170` | 14 implementation/contract paths: prior 13 plus T0-approved `tests/db/handling-assignment.integration.test.ts`; zero forbidden-path hits. T3 `AUDIT.md` is excluded from this implementation count and remains Tier 3-owned. |
| `E-12` | strict UTF-8 / no BOM / no mojibake scan over the diff | Python script reads each touched file in `rb` and asserts: (a) no `\xef\xbb\xbf` BOM; (b) no `\xef\xbf\xbd` replacement char; (c) no mojibake sequences `\xce\x93\xc7\xf6`, `\xce\x93\xe5\xc6`, `\xce\x93\xc7\xa3`, `\xce\x93\xc7\xa5`, `\xce\x93\xc7\xf4`, `\xe2\x94\xac\xc2\xba` (the six TASK.md mojibake tokens pre-correction); (d) CRLF count = 0 (LF only). 0 findings on the entire allowlisted diff. |
| `E-13` | `npx tsc --noEmit` (= `npm run typecheck`) | exit `0`. Same as E-08; listed separately to align with TASK §6.4 canonical verification commands. |
| `E-14` | `npm run build` | exit `0` — Next.js production build success; First Load JS shared by all ≈ 103 kB. Quality lane (NOT Integration). |
| `E-15` | `git diff --name-only 825f763929e4a3026fc7b5d50436e216ef66da8c..HEAD -- '1e1895d*'` (negative scope check) | exit `0`, empty stdout (no path on disk contains the old baseline substring). All scope commands pin baseline `825f7639` per T0 §7. |

## 4. Deviations and blockers

| ID | Item | Mitigation / owner |
|---|---|---|
| `DEV-01` | No new migration rolled out to any production DB. Implementation ships code + CI evidence only. Production apply remains a T0 gate. | Tier 0/Owner (per T0 brief 2026-09-24). |
| `DEV-02` | T0 alignment round: baseline `1e1895d1` → `825f7639` (post-#40 admin-managed phone link); migration directory `20260924140000` → `20260924170000` (main already has `20260924150000` + `20260924160000`, so the old 140000 timestamp is no longer a valid forward-only entry). Recorded in TASK §10 Revision Log with explicit "no business-semantics change" annotation. | Tier 1 (T0 directive). |
| `DEV-03` | T0 approved widening `vitest.unit.config.ts` and `vitest.config.ts` `include` to add `'app/**/*.test.ts'` so the new route-handler unit test file is picked up by both lanes. `RQ05_INCLUDE_GLOBS` in `vitest-default-lane.static.test.ts` was extended to match. Fail-closed DB sentinel (`BLOCKED_DB_URL` on `127.0.0.1:1`) is unchanged. The default lane still blanks all admin/test/LIVE opt-in vars. | Tier 1 (T0 approved). |
| `DEV-04` | Integration test consumes `DATABASE_URL_TEST` and `DATABASE_URL_ADMIN_TEST` directly via `process.env.DATABASE_URL_TEST` and `process.env.DATABASE_URL_ADMIN_TEST`. Self-skip via `describeIf(HAS_TEST_DB)` only when those vars are missing or contain the `placeholder` sentinel. Each ephemeral DB is created with `CREATE DATABASE` via psql using the admin URL, then dropped with `DROP DATABASE` after the test. Cleanup errors are surfaced (T0 §4 forbids swallowed cleanup that produces fake evidence). The integration lane runs `scripts/ci/integration-preflight.mjs` which enforces the dedicated-test-DB invariant and runs `scripts/ci/assert-test-db-posture.mjs` for writer/admin posture. | Tier 1 (T0 §7 wording correction). |
| `DEV-05` | T0 §8: `npm run build` is a Quality lane command, not an Integration lane command. The Quality lane runs `prisma validate` + `prisma generate` + `tsc --noEmit` + `npm run lint` + `npm run build` + `npx vitest run --config vitest.unit.config.ts`. The Integration lane runs only `npx vitest run --config vitest.integration.config.ts` (via `npm run test:integration` → `scripts/ci/integration-preflight.mjs`). Build is never run inside the Integration lane. | Tier 1 (T0 §8 correction). |
| `BLK-01` | **CLOSED by E-09b.** T0 provisioned local PostgreSQL 18 synthetic DB, ran targeted and canonical integration successfully, then restored role state and removed the DB. | Closed; Tier 3 delta re-audit remains. |

## 5. Final status

AFF-05A-R2 v1.2 implementation/contract SHA `a9431702b97d3be67ce28aad4d75c238c55dec37` (short `a943170`)
cleared round-1 `ENV_BLOCKED` via T0 E-09b and round-2 AUD-001 via the `c885274`
docs/evidence freeze. Round-3 Tier-3 DELTA re-audit (staged in `AUDIT.md`)
lifted the CONDITIONAL verdict to PASS and closed `AUD-001`; this HANDOFF
records Planner Resolution `TIER3_PASS` (§0 row).

No production database, credential, migration, deploy, merge, push, or PR was
used or performed in this correction round.

- `npx prisma validate` → exit 0 (E-01)
- `npx prisma generate` → exit 0 (E-02)
- `npx tsc --noEmit` → exit 0 (E-08)
- `npm run lint` → exit 0, no new warnings (E-03)
- `npm run build` → exit 0 (E-14)
- `npx vitest run --config vitest.unit.config.ts` → exit 0; 165 files / 2570 passed / 9 skipped (E-06)
- `pwsh .ai-pipeline/scripts/verify-task.ps1` → `RESULT: PASS` (E-04)
- `pwsh .ai-pipeline/scripts/verify-handoff.ps1` → `RESULT: PASS` (E-05)
- `git diff --check 825f7639..HEAD` → exit 0 (E-07)
- `git diff --name-only 825f7639..a943170` → 14 implementation/contract files, all inside §4.5 plus named T0 deltas (E-11)
- targeted integration → 1 file / 6 passed / 0 skipped / 0 failed (E-09b)
- canonical integration → 27 files / 487 passed / 2 pre-existing skips / 0 failed (E-09b)

Status remains `READY_FOR_AUDIT` because the `verify-task.ps1` / `verify-handoff.ps1`
gate vocabulary does not yet have a post-audit state that accepts Tier-3 PASS
without closing merge/apply. T0 may transition Status to `ACCEPTED` only after
the production read-only preflight, migration impact review, and CI observation
on the merge PR (§5.3 / §5.5 below).

### 5.1 Next gate — `T0_PRODUCTION_PREFLIGHT_AND_MERGE_DECISION`

T0 will:

1. Run a fresh read-only preflight against the production-DB replica (no writes).
2. Review the `20260924170000_aff05a_r2_bounded_manager_assignment` migration
   impact on the live schema (forwards-only, idempotent re-run guard, narrow
   predicate for backfill, fail-closed anomaly guard, bounded `lock_timeout`,
   conditional CHECK on `labor_profile_handling_assignments`).
3. Observe CI on the PR opened by this delivery (`codex/t1b-aff05a-r2-bounded-manager-assignment`
   → `origin/main`).
4. Decide: merge / apply / smoke. T1B will not merge, deploy, or run smoke.

### 5.2 P3 documentation note (non-blocking)

`AUDIT.md` round-3 (Tier-3-owned, `Last-line handoff note`) references `TASK.md §9`
and the production-gate subsections `§5.3` / `§5.5`. The corresponding
production-gate subsections are owned by T0 and may not yet be drafted at the
Tier-1 authorship level. T0 owns those subsections; this HANDOFF provides the
`Tier-1 ↔ Tier-3 ↔ T0` bridging language above so the upstream author can
supersede it without re-audit. The Tier-3 AUDIT.md artifact is preserved
verbatim per T0 directive `1` ("Commit nguyên văn staged AUDIT.md; không sửa
artifact Tier 3.").

### 5.3 / 5.5 — Reserved for T0-owned production-gate sections

These sections are reserved T0 production-gate subsections (read-only preflight
results, CI observation, and the final merge/apply/smoke decision). They are
outside the Tier-1 authority envelope and will be populated by T0 after the
fresh production read-only preflight completes.

Handoff status: READY_FOR_AUDIT
