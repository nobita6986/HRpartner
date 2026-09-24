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
| Semantic commit SHA | `86127956206362d5a1aae2502b8787cd0442cd3e` (short `8612795`) — code, migration, tests, contracts (1/7/30), scope-bounded pg_constraint lookups, real upgrade-path test, two-connection race test, fail-closed anomaly rollback, fail-visible cleanup. |
| Docs/evidence freeze SHA | see next field — pinned on top of `8612795`. |
| Implementation HEAD | HEAD of `codex/t1b-aff05a-r2-bounded-manager-assignment` after the docs/evidence freeze commit. The previously frozen `f513608` was the docs/evidence freeze on top of the prior semantic `23fc38d`; T0 correction batch §1 explicitly retires `f505abc` (transient `--amend` artifact) and the prior `f513608` freeze. Only this batch's semantic `8612795` and its docs freeze on top are canonical. |
| Executor | `Tier 1B` |
| Next gate | `TIER3_LIGHT_AUDIT` |

T0 correction batch (2026-09-24, semantic contract 1/7/30 unchanged):

- **§1 provenance/SHA**: the previously pinned `f505abc` SHA was a transient `--amend` artifact and is no longer the HEAD. The previously frozen `f513608` was a docs/evidence freeze on top of the prior semantic `23fc38d`. T0 correction batch §1 retires both as not-current and pins the NEW semantic commit `8612795` (correction batch) with a docs/evidence freeze commit on top. All SHAs are recorded above.
- **§2 mojibake**: TASK.md had six mojibake tokens (em-dash, right arrow, left/right double quote, en-dash, section sign) — UTF-8 round-trip artifacts from the source blob. They are restored to the correct UTF-8 characters. U+FFFD = 0; remaining mojibake = 0.
- **§3 constraint scope**: `pg_constraint` lookups in the migration AND the integration test now bind `conrelid = 'public.labor_profile_handling_assignments'::regclass AND contype = 'c'`. A new negative-scoping test seeds a same-named decoy CHECK on a different table BEFORE applying R2 and asserts R2 still adds the target CHECK on the target relation (proves scoping works).
- **§4 upgrade path**: integration test now stages a temp pseudo-repo whose `prisma/migrations/` is pruned to exclude `20260924170000_*`, runs `prisma migrate deploy` against the pruned schema path on an ephemeral DB, seeds legacy rows, and applies R2 byte-identical. This is the real predecessor state — not the previous "apply all + DROP CONSTRAINT" fake.
- **§5 AC-05 race**: a new it() opens two independent Prisma clients and races two `MANAGER_ASSIGNMENT` INSERTs against the same `labor_profile_id` and `status='ACTIVE'`. Exactly one wins; the loser receives either Prisma `P2002` or raw SQLSTATE `23505`. No duplicate row, no orphan history. The bounded lock_timeout file-shape assertion is in a separate it() so the audit lane can classify them independently.
- **§6 canonical gates**: full re-run of `prisma validate`, `prisma generate`, `tsc --noEmit`, `npm run lint`, `npm run build`, `npx vitest run --config vitest.unit.config.ts`. Integration lane still self-skips under `ENV_BLOCKED` in this sandbox (no `DATABASE_URL_TEST`); authoritative integration run is T0's gate.
- **§7 sync**: TASK and HANDOFF share Status=`READY_FOR_AUDIT`, Spec version=`v1.1`, Next gate=`TIER3_LIGHT_AUDIT`. Build is in the Quality lane, not Integration. DEV-04 wording corrected (integration test DOES consume `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST`). AC-03 evidence uses exact 7-day deadline measurement (no "ms diff" wording). AC-07 scope command pins baseline `825f763929e4a3026fc7b5d50436e216ef66da8c`.

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
| `AC-02` | `RQ-02` | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` AC-02 (`AC-02 clean chain`): build a temp pseudo-repo with `prisma/schema.prisma` and a `prisma/migrations/` tree pruned to exclude `20260924170000_*` (real predecessor chain ends at `20260924160000`); run `prisma migrate deploy --schema <temp>` against an ephemeral DB; assert the conditional CHECK is NOT yet on the target relation; apply R2 byte-identical via psql; assert exactly one CHECK on `public.labor_profile_handling_assignments` in `pg_constraint` with the strict scope binding `conrelid = 'public.labor_profile_handling_assignments'::regclass AND contype = 'c'`. Release path covered by service unit test ("release with elapsed/valid assignment") and the route unit test ("release path: newAssigneeUserId absent routes to release"). | DB-touching lane; runs only when `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` are reachable. In this sandbox `ENV_BLOCKED`; T0 runs the authoritative synthetic-DB lane. |
| `AC-03` | `RQ-03` | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` `AC-03 narrow backfill on predecessor state`: stage the pruned-migrations predecessor, create ephemeral DB, run `prisma migrate deploy`, seed five legacy rows (fresh MANAGER_ASSIGNMENT ACTIVE 7d-old NULL deadline; overdue ACTIVE 10d-old; terminal REVOKED 10d-old; AFF_INITIAL NULL deadline outside predicate; CASE_RESOLUTION NULL deadline outside predicate), apply R2 byte-identical. Assert: (a) fresh row ACTIVE with `expires_at = starts_at + 7 days` exact `7 * 86_400_000 ms`; (b) overdue row → EXPIRED with `expires_at = starts_at + 7 days` exact; (c) terminal REVOKED status verbatim with reason preserved; (d) AFF_INITIAL source/ACTIVE/NULL deadline byte-for-byte unchanged; (e) CASE_RESOLUTION source/ACTIVE/NULL deadline byte-for-byte unchanged; final guard `count(MANAGER_ASSIGNMENT WHERE expires_at IS NULL AND starts_at IS NOT NULL) = 0`. | DB-touching lane; same env contract as AC-02. |
| `AC-04` | `RQ-04` | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` `AC-04 scope`: BEFORE applying R2, add a same-named decoy CHECK (`CHECK (true)`) on a different existing table (e.g. an auxiliary lookup table). Assert decoy is in pg_constraint on that table (count=1) and the target relation has none. Apply R2 byte-identical. Assert R2 still adds the target CHECK on the target relation (count=1 with strict `conrelid` + `contype='c'` scope) and the decoy is preserved. The migration's own `IF NOT EXISTS` guard and final assertion both bind `conrelid = 'public.labor_profile_handling_assignments'::regclass AND contype = 'c'`, so the decoy does NOT cause R2 to skip the target CHECK. The `AC-02` and `AC-06` it() cases also assert `pg_constraint` lookup with strict scope. | DB-touching lane; same env contract as AC-02. |
| `AC-05` | `RQ-05` | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` `AC-05 race`: open TWO independent Prisma clients (separate connection pools) on the same ephemeral DB. Insert one MANAGER_ASSIGNMENT (status='ACTIVE', `expires_at = starts_at + 7 days`) as winner via client A. Then client B attempts the same INSERT for the same `labor_profile_id` and `status='ACTIVE'`. Assert: (1) the loser's exception is either `Prisma.PrismaClientKnownRequestError` with code `P2002` or contains `SQLSTATE 23505`; (2) `count(labor_profile_handling_assignments WHERE labor_profile_id = X AND status = 'ACTIVE') = 1`; (3) `count(labor_profile_handling_assignments WHERE labor_profile_id = X) = 1` (no duplicate row, no orphan history); (4) `count(labor_profile_handling_assignments WHERE id = loserId) = 0` (loser row not committed). The bounded `lock_timeout` file-shape assertion lives in a separate `AC-05/LT bounded lock_timeout` it() so the audit lane can classify them independently. | DB-touching lane; same env contract as AC-02. |
| `AC-06` | `RQ-06` | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` `AC-06 fail-closed`: stage predecessor, seed one MANAGER_ASSIGNMENT with `starts_at = now() + 1 hour` (future anomaly on the target predicate), apply R2 byte-identical. Assert: (1) `applyAff05aR2MigrationFile` raised a non-zero exit; (2) the conditional CHECK is rolled back (`count(pg_constraint WHERE conname = ... AND conrelid = 'public.labor_profile_handling_assignments'::regclass AND contype = 'c') = 0`); (3) the seeded future row's `expires_at` is still NULL (transactional atomicity). | DB-touching lane; same env contract as AC-02. |
| `AC-07` | `RQ-01`..`RQ-06` | `npx prisma validate` exit 0 (E-01); `npx prisma generate` exit 0 (E-02); `npx tsc --noEmit` exit 0 (E-08 / E-13); `npm run lint` exit 0 (E-03); `npm run build` exit 0 (E-14, Quality lane); `npx vitest run --config vitest.unit.config.ts` exit 0, 165 files / 2570 passed / 9 skipped (E-06); `pwsh .ai-pipeline/scripts/verify-task.ps1` PASS (E-04); `pwsh .ai-pipeline/scripts/verify-handoff.ps1` PASS (E-05); `git diff --check 825f7639..HEAD` exit 0 (E-07); `git diff --name-only 825f7639..HEAD` lists only allowlisted paths + 3 T0-approved config edits (E-11). Integration lane self-skipped under `ENV_BLOCKED` in this sandbox; authoritative integration run is T0's gate (BLK-01). | All Quality-lane commands above are PASS in this sandbox; integration lane is BLOCKED in this sandbox and T0-runnable in the synthetic DB. |

## 3. Evidence registry

| ID | Runnable command | Exit / measurement |
|---|---|---|
| `E-01` | `DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder' DATABASE_URL_ADMIN='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder' npx prisma validate` | exit `0` — "The schema at prisma/schema.prisma is valid 🚀" |
| `E-02` | `DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder' DATABASE_URL_ADMIN='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder' npx prisma generate` | exit `0` — Prisma Client (v5.22.0) generated; runtime model list unchanged |
| `E-03` | `npm run lint` | exit `0` — 0 errors, 706 warnings (all pre-existing baseline `any` warnings on test files; no new warnings introduced by this slice) |
| `E-04` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath "docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md"` | exit `0` — `RESULT: PASS. TASK contract is ready for execution.` |
| `E-05` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath "docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md" -HandoffPath "docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/HANDOFF.md"` | exit `0` — `RESULT: PASS.` |
| `E-06` | `npx vitest run --config vitest.unit.config.ts` | exit `0` — `Test Files  165 passed (165)` / `Tests  2570 passed | 9 skipped (2579)`. The AFF-05A-R2 route handler unit test contributes 15 passing cases; the service unit test contributes 18 passing cases (including 8 new normalization cases). |
| `E-07` | `git diff --check 825f763929e4a3026fc7b5d50436e216ef66da8c..HEAD` | exit `0` — no whitespace errors, no trailing whitespace, no mixed line endings (LF only) |
| `E-08` | `npx tsc --noEmit` (= `npm run typecheck`) | exit `0` — `tsc --noEmit` PASS, 0 errors |
| `E-09` | (sandbox) `npm run test:integration` | exit `0` — `ENV_BLOCKED` printed by `scripts/ci/integration-preflight.mjs` (DATABASE_URL_TEST absent). Integration lane NEVER falls back to dev/prod. Per the env contract, this is a blocked state, NOT a fake PASS. |
| `E-09b` | (T0-authoritative, future) `DATABASE_URL_TEST=postgresql://test_admin@127.0.0.1:5432/aff05ar2_synthetic DATABASE_URL_ADMIN_TEST=... $env:CI_INTEGRATION_STRICT='1'; npm run test:integration` | T0 runs the integration lane against the local PostgreSQL 18 synthetic dedicated DB (NOT Neon staging, NOT production, no production credential). The new test consumes both `DATABASE_URL_TEST` and `DATABASE_URL_ADMIN_TEST` directly (`process.env.DATABASE_URL_TEST`, `process.env.DATABASE_URL_ADMIN_TEST`) per DEV-04. Pre-flight posture assertion runs (`scripts/ci/assert-test-db-posture.mjs`): writer non-super + non-bypassrls; admin same host+port+db. Vitest then runs the integration lane and asserts: (a) `AC-02 clean chain`; (b) `AC-03 narrow backfill on predecessor state` (the predecessor is the real chain `20260824161500`..`20260924160000`, NOT apply-all + DROP); (c) `AC-04 scope` (decoy CHECK on a different table does NOT prevent R2 from adding its target CHECK); (d) `AC-05 race` (two Prisma clients race; exactly one ACTIVE winner, typed conflict on loser, no duplicate row, no orphan history); (e) `AC-05/LT bounded lock_timeout` (file-shape); (f) `AC-06 fail-closed` (future `starts_at` raises and rolls back the CHECK add). Expected result on T0's synthetic DB: 1 file (this test) → 6 it() cases PASS, 0 skip, 0 fail. |
| `E-10` | `rg --no-heading --line-number 'publicUrl|public_url|rootPath|root_path|token|bytea' src/domains/talent/handling-assignment.service.ts src/domains/talent/handling-assignment.service.test.ts app/api/admin/labor-profiles/[id]/handling-assignments/route.ts app/api/admin/labor-profiles/[id]/handling-assignments/route.test.ts app/admin/labor-profiles/[id]/handling-assignment-manager.tsx prisma/migrations/20260924170000_aff05a_r2_bounded_manager_assignment/migration.sql tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts vitest.integration-files.ts docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/HANDOFF.md` | 0 hits. None of the AFF-05A-R2 files references `publicUrl`, `public_url`, `rootPath`, `root_path`, `token`, or `bytea`. The conditional CHECK mentions the literal `'MANAGER_ASSIGNMENT'` only. |
| `E-11` | `git diff --name-only 825f763929e4a3026fc7b5d50436e216ef66da8c..HEAD` | lists exactly the allowlisted paths plus the three T0-approved config edits: <br> 1. `src/domains/talent/handling-assignment.service.ts` <br> 2. `src/domains/talent/handling-assignment.service.test.ts` <br> 3. `app/api/admin/labor-profiles/[id]/handling-assignments/route.ts` <br> 4. `app/api/admin/labor-profiles/[id]/handling-assignments/route.test.ts` (new) <br> 5. `app/admin/labor-profiles/[id]/handling-assignment-manager.tsx` <br> 6. `prisma/migrations/20260924170000_aff05a_r2_bounded_manager_assignment/migration.sql` (new) <br> 7. `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` (new) <br> 8. `vitest.integration-files.ts` <br> 9. `vitest.unit.config.ts` (T0-approved widening) <br> 10. `vitest.config.ts` (T0-approved widening) <br> 11. `src/shared/toolchain/vitest-default-lane.static.test.ts` (T0-approved RQ05 glob amendment) <br> 12. `docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md` <br> 13. `docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/HANDOFF.md` (new) <br> 13 files total, all inside the allowlist §4.5 or the three T0-approved config edits. Zero forbidden-path hits. |
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
| `BLK-01` | **ENV_BLOCKED in this sandbox**: `DATABASE_URL_TEST` is not provisioned; `scripts/ci/integration-preflight.mjs` prints the canonical `ENV_BLOCKED` token (fail-closed sentinel — never `PASS`). Resolution is T0's gate: T0 provisions a local PostgreSQL 18 synthetic dedicated DB (NOT Neon staging, NOT production, no production credential) and runs E-09b. Expected result on that DB: 1 file (this test) → 6 it() cases PASS (AC-02 / AC-04 / AC-03 / AC-05 race / AC-05/LT / AC-06), 0 skip, 0 fail. | Tier 0/Owner (synthetic DB provision + run). |

## 5. Final status

AFF-05A-R2 v1.1 delivery candidate is frozen for T0 review. Code, migration,
service + route + integration tests, UI alignment, task delegation copy, and
HANDOFF are aligned to the allowlist §4.5 plus the three T0-approved config
edits. The Quality-lane gates listed in AC-07 have been re-runnable against
the rebased baseline `825f763929e4a3026fc7b5d50436e216ef66da8c`:

- `npx prisma validate` → exit 0 (E-01)
- `npx prisma generate` → exit 0 (E-02)
- `npx tsc --noEmit` → exit 0 (E-08)
- `npm run lint` → exit 0, no new warnings (E-03)
- `npm run build` → exit 0 (E-14)
- `npx vitest run --config vitest.unit.config.ts` → exit 0; 165 files / 2570 passed / 9 skipped (E-06)
- `pwsh .ai-pipeline/scripts/verify-task.ps1` → `RESULT: PASS` (E-04)
- `pwsh .ai-pipeline/scripts/verify-handoff.ps1` → `RESULT: PASS` (E-05)
- `git diff --check 825f7639..HEAD` → exit 0 (E-07)
- `git diff --name-only 825f7639..HEAD` → 13 files, all inside allowlist §4.5 or T0-approved config widening (E-11)
- `npm run test:integration` → `ENV_BLOCKED` (sandbox; E-09). Authoritative integration run is T0's gate on a synthetic dedicated DB (E-09b).

The DB-touching acceptance criteria (AC-02 / AC-03 / AC-04 / AC-05 race /
AC-06) require authoritative execution against T0's local PostgreSQL 18
synthetic dedicated DB (NOT Neon staging, NOT production, no production
credential). The integration test has been rewritten to (a) stage a real
predecessor state by pruning R2 out of the migrations tree, (b) bind
`pg_constraint` lookups with strict `conrelid` + `contype='c'` scope, (c)
seed a decoy same-named CHECK on a different table BEFORE R2 apply to prove
scope, (d) race two independent Prisma clients on the same `labor_profile_id`
to assert one ACTIVE winner + typed conflict on loser + no duplicate row,
and (e) fail visibly on cleanup errors (no swallowed exceptions). In this
sandbox `ENV_BLOCKED`; T0 runs E-09b.

No push, no PR, no merge, no production migration occurred during Tier 1
execution. Tier 3 LIGHT audit is the next gate. No tier-3 invocation was
made by Tier 1.

T0 correction batch (2026-09-24): provenance/SHA corrected
(`8612795` semantic, docs/evidence freeze on top of it); TASK.md mojibake
restored (six UTF-8 round-trip artifacts replaced with their correct
characters); constraint scope bound to
`public.labor_profile_handling_assignments::regclass AND contype='c'`
in migration AND integration test (with negative scoping test);
upgrade-path test rewritten to a real predecessor (no apply-all +
DROP); AC-05 race added as a real two-connection test (1 winner, typed
conflict on loser, no duplicate row); TASK.md and HANDOFF now share
Status, Spec version, Next gate; build moved to Quality lane; DEV-04
wording corrected; AC-03 evidence uses exact 7-day deadline measurement;
AC-07 scope command pins baseline `825f7639`. Spec stays v1.1 (no
semantic contract change). Status `READY_FOR_AUDIT`. No push/PR/merge/deploy.

Handoff status: READY_FOR_AUDIT
