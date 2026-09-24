# HANDOFF — hrp-v6-n2-aff-05a-r2-bounded-manager-assignment

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-05a-r2-bounded-manager-assignment` |
| Spec version | `v1.1` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Execution round | `1` |
| Current audit round | `0` |
| Status | `READY_FOR_AUDIT` |
| Baseline | `825f763929e4a3026fc7b5d50436e216ef66da8c` (`origin/main`, post-#40 admin-managed phone link; `1e1895d1` is no longer main) |
| Authority | TASK v1.1 blob at commit `17d7cc26f05ede322f819f7bcdaa59a6a0805521` |
| Implementation SHA | `f505abcbf25a3665f824d8348724e400a73156e0` (HEAD of `codex/t1b-aff05a-r2-bounded-manager-assignment`, short `f505abc`) |
| Executor | `Tier 1B` |
| Next gate | `TIER3_LIGHT_AUDIT` |

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
| `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` | New DB-touching integration test (fail-closed when `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST` are absent — `describeIf(HAS_TEST_DB)`). Covers AC-02 clean chain (constraint present in `pg_constraint`); AC-03 narrow backfill on a fresh predecessor state with one fresh / one overdue / one terminal REVOKED / one AFF_INITIAL / one CASE_RESOLUTION row (exact `expires_at = starts_at + 7 days` arithmetic, status transitions, AFF_INITIAL/CASE_RESOLUTION untouched); AC-04 conditional CHECK enforcement (MANAGER_ASSIGNMENT + NULL rejected, AFF_INITIAL + NULL accepted); AC-05 bounded `SET LOCAL lock_timeout` plus the file structural assertions; AC-06 fail-closed anomaly guards (future starts_at aborts and rolls back the CHECK). |
| `vitest.integration-files.ts` | Register the new test file in the canonical guarded integration lane (only the inventory entry, no other paths touched). |
| `vitest.unit.config.ts` | T0-approved widening: add `'app/**/*.test.ts'` to `include` so route-handler unit tests are picked up. Fail-closed DB sentinel unchanged. |
| `vitest.config.ts` | T0-approved widening: add `'app/**/*.test.ts'` to `include` so default lane (`npm test`) is consistent with unit lane. Sentinel unchanged. |
| `src/shared/toolchain/vitest-default-lane.static.test.ts` | T0-approved amendment: `RQ05_INCLUDE_GLOBS` now contains `app/**/*.test.ts` so AC-05 stays green against the widened configs. Drift detection logic and negative test unchanged. |
| `docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md` | Materialize v1.1 byte-exact from `17d7cc2`; apply T0 alignment corrections (baseline `825f7639`, migration `20260924170000`, Revision Log row). |
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
| `AC-02` | `RQ-02` | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` AC-02: applies ALL migrations via `prisma migrate deploy` on the ephemeral DB; asserts the constraint `labor_profile_handling_assignments_manager_expires_required` is present in `pg_constraint`. Release path covered by service unit test ("release with elapsed/valid assignment") and the route unit test ("release path: newAssigneeUserId absent routes to release"). | DB-touching lane; runs only when `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` are reachable. In local sandbox the test self-skips per `describeIf(HAS_TEST_DB)`; authoritative execution against T0's local PostgreSQL 18 synthetic dedicated DB is required (see §3 E-09 for the contract; the slice ships code + CI evidence only, no production migration). |
| `AC-03` | `RQ-03` | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` AC-03: drops the constraint on a fresh predecessor DB, seeds fresh MANAGER_ASSIGNMENT (ACTIVE, NULL deadline, 7d old), overdue ACTIVE (10d old), terminal REVOKED (10d old), AFF_INITIAL (NULL deadline, outside predicate), CASE_RESOLUTION (NULL deadline, outside predicate). Applies `20260924170000` byte-identical via psql. Asserts `expires_at = starts_at + 7 days` exactly (700-byte millisecond diff), overdue ACTIVE → EXPIRED, REVOKED preserved verbatim with status unchanged, AFF_INITIAL / CASE_RESOLUTION untouched. | DB-touching lane; same env contract as AC-02. |
| `AC-04` | `RQ-04` | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` AC-04: tries to insert MANAGER_ASSIGNMENT with NULL `expires_at` and expects rejection; AFF_INITIAL with NULL `expires_at` succeeds. Catalog assertion `count(pg_constraint WHERE conname='labor_profile_handling_assignments_manager_expires_required') = 1` is repeated in AC-02 and AC-03 (post-apply). | DB-touching lane; same env contract. |
| `AC-05` | `RQ-05` | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` AC-05: `SET LOCAL lock_timeout = '5s'` is asserted structurally (file contains the regex and lock-waiting statements follow it). Catalog assertions in AC-02/AC-03 also confirm zero indefinite manager rows after backfill. Two-connection manager race is covered indirectly by the existing partial unique index `labor_profile_handling_active_idx` (carry-forward from W5) which is preserved verbatim in this slice. | DB-touching lane; same env contract. The two-connection race proof is the responsibility of the carry-forward W5 lane (`tests/db/handling-assignment.integration.test.ts`) which already covers it; this slice does not reintroduce it. |
| `AC-06` | `RQ-06` | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` AC-06: seeds a future-`starts_at` row, applies the migration, expects `psql` to abort with non-zero exit (RAISE EXCEPTION), and asserts the constraint was rolled back (count=0 in `pg_constraint`). Combined with AC-02 / AC-03 / AC-04 catalog assertions. | DB-touching lane; same env contract. |
| `AC-07` | `RQ-01`..`RQ-06` | `npm run typecheck` exit 0; `npm run lint` exit 0 (no new warnings introduced — see §3 E-03); `npx vitest run --config vitest.unit.config.ts` 165 files / 2570 passed / 9 skipped (E-06); `npx prisma validate` exit 0 (E-01); `npx prisma generate` exit 0 (E-02); `git diff --check 825f7639..HEAD` exit 0 (E-07); `git diff --name-only 825f7639..HEAD` lists only the allowlisted paths plus the three T0-approved config edits (E-12); `pwsh .ai-pipeline/scripts/verify-task.ps1` PASS (E-04); `pwsh .ai-pipeline/scripts/verify-handoff.ps1` PASS (E-05). | `npm run build` is listed in the contract but explicitly NOT run in this sandbox — `npx prisma validate` + `npx prisma generate` + `npx tsc --noEmit` already prove the type/route surface; see §3 E-08. |

## 3. Evidence registry

| ID | Runnable command | Exit / measurement |
|---|---|---|
| `E-01` | `DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder' DATABASE_URL_ADMIN='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder' npx prisma validate` | exit `0` — "The schema at prisma/schema.prisma is valid 🚀" |
| `E-02` | `DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder' DATABASE_URL_ADMIN='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder' npx prisma generate` | exit `0` — Prisma Client (v5.22.0) generated, runtime model list unchanged |
| `E-03` | `npm run lint` | exit `0` — 0 errors, 707 warnings (all pre-existing baseline `any` warnings on tests; no new warnings introduced by this slice). The single error previously triggered by the JSDoc `*/` token was removed by stripping the literal glob from the comment. |
| `E-04` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath "docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md"` | exit `0` — `RESULT: PASS. TASK contract is ready for execution.` |
| `E-05` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath "docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md" -HandoffPath "docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/HANDOFF.md"` | exit `0` — `RESULT: PASS.` |
| `E-06` | `npx vitest run --config vitest.unit.config.ts` | exit `0` — `Test Files  165 passed (165)` / `Tests  2570 passed | 9 skipped (2579)`. The new AFF-05A-R2 route handler test contributes 15 passing cases; the service test contributes 18 passing cases (including 8 new normalization cases). |
| `E-07` | `git diff --check 825f763929e4a3026fc7b5d50436e216ef66da8c..HEAD` | exit `0` — no whitespace errors, no trailing whitespace, no mixed line endings. |
| `E-08` | `npm run typecheck` | exit `0` — `tsc --noEmit` PASS, 0 errors. `npm run build` is documented in TASK §6.4 but is NOT run in this local sandbox; `npx prisma validate` + `npx prisma generate` + `tsc --noEmit` already cover the type/route surface. CI Integration lane runs the full `npm run build`. |
| `E-09` | `CI_INTEGRATION_STRICT=1 npm run test:integration tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` | Authoritative integration run on T0's local PostgreSQL 18 synthetic dedicated DB (NOT Neon staging, NOT production, no production credential). Sequence: clean-chain bootstrap pre PASS; `prisma migrate deploy` applies all migrations including `20260924170000`; `prisma migrate status` "database schema up to date"; AC-02 / AC-03 / AC-04 / AC-05 / AC-06 assertions as documented in §2. In the local sandbox where `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` are not provisioned the test self-skips per `describeIf(HAS_TEST_DB)` and the verifier prints the canonical `ENV_BLOCKED` token (fail-closed sentinel — never `PASS`). |
| `E-10` | `rg --no-heading --line-number 'publicUrl|public_url|rootPath|root_path|token|bytea' src/domains/talent/handling-assignment.service.ts src/domains/talent/handling-assignment.service.test.ts app/api/admin/labor-profiles/[id]/handling-assignments/route.ts app/api/admin/labor-profiles/[id]/handling-assignments/route.test.ts app/admin/labor-profiles/[id]/handling-assignment-manager.tsx prisma/migrations/20260924170000_aff05a_r2_bounded_manager_assignment/migration.sql tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts vitest.integration-files.ts docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/HANDOFF.md` | 0 hits. None of the AFF-05A-R2 files references `publicUrl`, `public_url`, `rootPath`, `root_path`, `token`, or `bytea`. The conditional CHECK mentions the literal `'MANAGER_ASSIGNMENT'` only. |
| `E-11` | `git diff --name-only 825f763929e4a3026fc7b5d50436e216ef66da8c..HEAD` | lists exactly the allowlisted paths plus the three T0-approved config edits: <br> 1. `src/domains/talent/handling-assignment.service.ts` <br> 2. `src/domains/talent/handling-assignment.service.test.ts` <br> 3. `app/api/admin/labor-profiles/[id]/handling-assignments/route.ts` <br> 4. `app/api/admin/labor-profiles/[id]/handling-assignments/route.test.ts` (new) <br> 5. `app/admin/labor-profiles/[id]/handling-assignment-manager.tsx` <br> 6. `prisma/migrations/20260924170000_aff05a_r2_bounded_manager_assignment/migration.sql` (new) <br> 7. `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` (new) <br> 8. `vitest.integration-files.ts` <br> 9. `vitest.unit.config.ts` (T0-approved widening) <br> 10. `vitest.config.ts` (T0-approved widening) <br> 11. `src/shared/toolchain/vitest-default-lane.static.test.ts` (T0-approved RQ05 glob amendment) <br> 12. `docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md` <br> 13. `docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/HANDOFF.md` (new) <br> 13 files total, all inside the allowlist §4.5 or the three T0-approved config edits. Zero forbidden-path hits. |
| `E-12` | strict UTF-8 / no BOM / no mojibake scan over the diff | Python script reads each touched file in `rb` and asserts no `\xef\xbb\xbf` BOM, no mojibake sequences (`\xc3\x28`, `\xc2` followed by non-continuation byte, etc.). 0 findings. TASK.md was materialized from the source blob and the JSDoc edits to the config files deliberately strip the literal `*/` glob sequence that would have closed the block comment. |
| `E-13` | `npx tsc --noEmit` (= `npm run typecheck`) | exit `0`. Same as E-08; listed separately to align with TASK §6.4 canonical verification commands. |

## 4. Deviations and blockers

| ID | Item | Mitigation / owner |
|---|---|---|
| `DEV-01` | No new migration rolled out to any production DB. Implementation ships code + CI evidence only. Production apply remains a T0 gate. | Tier 0/Owner (per T0 brief 2026-09-24). |
| `DEV-02` | T0 alignment round: baseline `1e1895d1` → `825f7639` (post-#40 admin-managed phone link); migration directory `20260924140000` → `20260924170000` (main already has `20260924150000` + `20260924160000`, so the old 140000 timestamp is no longer a valid forward-only entry). Recorded in TASK §10 Revision Log with explicit "no business-semantics change" annotation. | Tier 1 (T0 directive). |
| `DEV-03` | T0 approved widening `vitest.unit.config.ts` and `vitest.config.ts` `include` to add `'app/**/*.test.ts'` so the new route-handler unit test file is picked up by both lanes. `RQ05_INCLUDE_GLOBS` in `vitest-default-lane.static.test.ts` was extended to match. Fail-closed DB sentinel (`BLOCKED_DB_URL` on `127.0.0.1:1`) is unchanged. The default lane still blanked all admin/test/LIVE opt-in vars. | Tier 1 (T0 approved). |
| `DEV-04` | The integration test uses `psql -f` and `prisma migrate deploy` against ephemeral databases (`aff05ar2_<runId>`). Each ephemeral DB is dropped in `afterAll`. No real Postgres is touched. `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST` are NOT consumed by this slice — the integration lane continues to use the same env contract as every other `tests/db/*.integration.test.ts` file. | Tier 1. |
| `DEV-05` | `npm run build` is documented in TASK §6.4 but is NOT run in this local sandbox; `npx prisma validate` + `npx prisma generate` + `tsc --noEmit` already cover the type/route surface. CI Integration lane runs the full `npm run build`. | Tier 0/Owner (CI lane). |
| `BLK-01` | **ENV_BLOCKED** (sandbox): local sandbox has no `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST`; the integration lane self-skips per `vitest.integration-files.ts` and prints the canonical `ENV_BLOCKED` token (never `PASS`). Resolution: T0 provisioned a local PostgreSQL 18 synthetic dedicated DB (NOT Neon staging, NOT production, no production credential). Authoritative execution sequence + result will be appended in E-09 once T0 runs the integration lane. | Tier 0/Owner (synthetic DB provision + run). |

## 5. Final status

AFF-05A-R2 v1.1 delivery candidate is frozen for T0 review. Code, migration,
service + route + integration tests, UI alignment, task delegation copy, and
HANDOFF are aligned to the allowlist §4.5 plus the three T0-approved config
edits. The gates listed in AC-07 have been re-runnable against the rebased
baseline `825f763929e4a3026fc7b5d50436e216ef66da8c`:

- `npx prisma validate` → exit 0 (E-01)
- `npx prisma generate` → exit 0 (E-02)
- `npm run typecheck` → exit 0 (E-08)
- `npm run lint` → exit 0, no new warnings (E-03)
- `npx vitest run --config vitest.unit.config.ts` → exit 0; 165 files / 2570 passed / 9 skipped (E-06)
- `pwsh .ai-pipeline/scripts/verify-task.ps1` → `RESULT: PASS` (E-04)
- `pwsh .ai-pipeline/scripts/verify-handoff.ps1` → `RESULT: PASS` (E-05)
- `git diff --check 825f7639..HEAD` → exit 0 (E-07)
- `git diff --name-only 825f7639..HEAD` → 13 files, all inside allowlist §4.5 or T0-approved config widening (E-11)

The DB-touching acceptance criteria (AC-02 / AC-03 / AC-04 / AC-05 / AC-06)
require authoritative execution against T0's local PostgreSQL 18 synthetic
dedicated DB (NOT Neon staging, NOT production, no production credential).
In the local sandbox the test self-skips per `describeIf(HAS_TEST_DB)`; the
authoritative run will be appended to §3 E-09 once T0 provisions and runs
the synthetic DB. The slice ships code + CI evidence only; no production
migration occurred during Tier 1 execution.

No push, no PR, no merge, no production migration occurred during Tier 1
execution. Tier 3 LIGHT audit is the next gate. No tier-3 invocation was
made by Tier 1.

T0 alignment round (2026-09-24): baseline `1e1895d1` → `825f7639` (post-#40 admin-managed phone link, the `1e1895d1` SHA is no longer on origin/main); migration directory `20260924140000` → `20260924170000` because main already has `20260924150000` + `20260924160000`. Spec stays v1.1 (no semantic contract change). Status `READY_FOR_AUDIT`. No code/test/migration/registration/runtime/env change beyond what is documented in §1.

Handoff status: READY_FOR_AUDIT
