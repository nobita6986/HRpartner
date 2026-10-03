# HANDOFF — `hrp-f9b-r2-slot-scope-read-restore` (F9-B correction round 2)

**Pipeline V2 — Implementation round 2 (CRITICAL / LIGHT). Restores the canonical read blast radius on `public.staffing_order_slots` by replacing the over-restrictive round-1 `hrp_f9b_slots_manager_select` policy with a narrow `FOR SELECT` policy that uses the canonical `hrp_project_visible_for(so.project_id)` predicate, while preserving every byte of the round-1 least-privilege write hardening (B-01 / B-02 / B-03 closed).**

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-f9b-r2-slot-scope-read-restore` |
| Spec version | `v1.0` |
| Status | `READY_FOR_AUDIT` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-f9b-jobposting-write-boundary-hardening` |
| Branch | `codex/t1a-f9b-jobposting-write-boundary-hardening` |
| Baseline (F9-B R1 final semantic SHA) | `e68ea4a3e4521eeb794e7c051a7bea0c33ec70f5` |
| Predecessor F9-B R1 HANDOFF + verify-handoff PASS SHA | `867f8882` |
| Predecessor F9-B R1 docs/evidence freeze SHA | `a4dfcded74c7fea425ee4e265b94ad85eaef951c` |
| Predecessor F9-B R1 Tier-3 LIGHT audit adoption SHA | `d777cf71d0abee81a39e093d562343e52da49d0c` |
| Predecessor F9 X4 SHA | `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26` |
| Predecessor F9 X5 SHA | `1b9bbd9f809e2251b501c288bd3d63179fcb4ee7` |
| **Implementation SHA (R2 final)** | `c3fa409a` (forward-only commit on top of R1) |
| Delivery protocol | `V2_FAST_FREEZE` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Audit mode | `LIGHT` (DELTA only — see §4.2) |
| Assurance lane | `CRITICAL` |
| Execution round | `2` |
| Correction batches used (cumulative) | `1` (R1 budget `1/1` exhausted; R2 budget `1/1` exhausted by this commit) |
| Predecessor chain preserved | F9 X4 `0d38042f` → F9 X5 `1b9bbd9f` → F9-B R1 `e68ea4a3` → F9-B R1 docs `a4dfcded` → F9-B R1 Tier-3 adoption `d777cf71` → F9-B R2 `c3fa409a`. **Every commit strictly after `e68ea4a3` on the branch is either (a) R1 docs/evidence freeze with no semantic delta, or (b) R2 forward-only corrective with the exact R2 surface below.** No amend / reset / rebase / force-push on `1b9bbd9f..HEAD`. |
| Test environment | `READY` (synthetic Neon `ep-empty-forest-azlhfyo9-*` writer / admin pair — T0 authorized `C:\cre_hrp.txt` ingestion via process wrapper. Wrapper loads URLs by host + username + database, never echoes URL / password / query string, never writes to repo.) |
| Synthetic DB preflight | `POSTURE_OK writer_is_writer admin_is_admin same_target` (writer `rolsuper=false, rolbypassrls=false`; admin `bypassrls=true`; `ep-empty-forest-azlhfyo9-*` host prefix; `neondb` database; production `ep-shy-tree-*` URLs counted-and-ignored — `ignored_production_lines=2`) |
| Synthetic migration deploy | `OK` — `npx --no-install prisma migrate deploy` applied `20261004000000_f9b_r2_slot_scope_read_restore` against `DATABASE_URL_ADMIN_TEST`. The migration's in-migration static guard (`assertMigrationStaticPosture()` invoked via `DO $$ ... $$` PL/pgSQL block) PASSED, otherwise the migration would have RAISED and aborted. |
| Production DB / migration | `NOT_RUN` (production `ep-shy-tree-*` host prefix never dialed) |
| Next gate | `TIER3_LIGHT_AUDIT` (DELTA only — R2 surface against the combined final semantic SHA `c3fa409a`). Tier 3 reviews the F9-B R2 freeze SHA (HEAD). |

## 1. Outcome Summary

### 1.1 What the regression was

F9-B round-1 corrective migration `20261003100000_f9b_slot_opening_binding_primitive` dropped the canonical `hrp_staffing_order_slot_scope` FOR ALL policy and the broad `hrp_f9_slots_staff_update` policy. To preserve HR_MANAGER / ADMIN read authority, R1 created a narrow policy `hrp_f9b_slots_manager_select` gated on `current_user IN ('hrp_admin', 'app_user_admin', 'app_user_hr_manager', ...)` — which is **only** those four roles. R1's intent was the smallest change required to fix B-01/B-02/B-03 (write hardening), but the SELECT side-effect was not caught at R1 audit time because R1's own tests only exercised HR_STAFF writer on assigned-vs-revoked slots.

Fresh-DB-only integration coverage from PR #88 surfaced the regression: MKT (public JobPosting cards), PM/sub-PM (Demand Tree), DIRECTOR (cross-project overview), SALE (cross-project overview), WORKER (own assignment), VENDOR_ADMIN / VENDOR_STAFF (own submission), CTV (job cards), and even HR_MANAGER (own authority) all collapsed to 0 rows when reading `staffing_order_slots` through canonical paths. Five previously-green CI suites flipped red on PR #88: `live-public-read-rls.go-live-04`, `p1a1-jobposting-public-apply`, `job-posting-stamps`, `public-card-truth`, `admin-demand-tree`.

### 1.2 What R2 changes (forward-only)

A single forward-only corrective migration `prisma/migrations/20261004000000_f9b_r2_slot_scope_read_restore/migration.sql`:

1. `DROP POLICY IF EXISTS hrp_f9b_slots_manager_select ON public.staffing_order_slots;` — the over-restrictive R1 read.
2. `CREATE POLICY hrp_f9b_slots_project_select ON public.staffing_order_slots AS PERMISSIVE FOR SELECT TO app_user_writer, app_user USING (hrp_project_visible_for(so.project_id) = true);` — narrow role-gated SELECT using the canonical visibility function the rest of the RLS suite already uses for `outsourcing_projects`.
3. In-migration PL/pgSQL static guard: the migration calls `assertMigrationStaticPosture()` inside a `DO $$ ... $$` block, which re-reads `pg_policies` and `pg_proc` after the DDL and `RAISE EXCEPTION` if any forbidden posture (over-restrictive policy still present / canonical policy missing / canonical policy uses non-canonical predicate / round-1 posture not preserved / DELETE policy introduced / broad StaffingOrder write relaxation) is detected. Fail-closed.

The migration is byte-isolated to `public.staffing_order_slots` SELECT. **No byte of the round-1 corrective migration `20261003100000_f9b_slot_opening_binding_primitive/migration.sql` is touched.** The SECURITY DEFINER primitive `public.hrp_f9b_bind_slot_to_opening` is unchanged (byte-equivalent). The narrow role-gated write policies `hrp_f9b_slots_manager_insert` / `hrp_f9b_slots_manager_update` are preserved. The hardened F9 INSERT policy `hrp_f9_openings_staff_insert` is preserved. The RESTRICTIVE no-DELETE policy `hrp_staffing_order_slots_no_delete` is preserved.

### 1.3 Hardened application invariants

- **B-01 (column-agnostic slot UPDATE)**: still closed — `hrp_f9b_slots_manager_update` is the only path that mutates `staffing_order_slots` for HR_MANAGER; HR_STAFF mutation goes through `hrp_f9b_bind_slot_to_opening` SECURITY DEFINER primitive; no broad UPDATE / DELETE policy.
- **B-02 (revoke-then-create race)**: still closed — `createOrReuseJobOpeningForSlot` post-lock re-read still raises `HRP_F9B_BINDING_DENIED_AFTER_REVOKE` (mapped to `NO_ACTIVE_ORDER_ASSIGNMENT` 403). Verified live in R2 AC by 3 fresh processes.
- **B-03 (static-text checks do not prove direct DB denial)**: still closed — `p1a07-f9b-r2-role-scope.integration.test.ts` HRSTAFF-04/05/06 negative proofs (UPDATE / INSERT / DELETE all 0-row fail-closed) exercise the writer role directly and prove the canonical denial shape.

### 1.4 Forbidden paths (zero touched)

No `prisma/schema.prisma` edit; no `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` edit; no edit to F9-B R1 corrective migration `20261003100000_f9b_slot_opening_binding_primitive/migration.sql`; no edit to F9 migration files `20261003000000_f9_hr_staff_posting_write_rls/migration.sql` or `20261003000001_f9_hr_staff_posting_insert_rls/migration.sql`; no introduction of a DELETE policy on `staffing_order_slots`; no restoration of broad column-agnostic mutation on `staffing_order_slots` or `staffing_orders`; no introduction of a separate admin / bypass Prisma client into the application runtime (the production application runtime remains writer-only); no production DB / production migration / production deploy / push / PR / merge / new PR.

## 2. Execution Trace

| STEP | Description | Status |
| --- | --- | --- |
| STEP-01 | T0 authorization for credential source: `C:\cre_hrp.txt`, only `ep-empty-forest-azlhfyo9-*` pair (same host+db, admin `bypassrls=true`, writer `rolsuper=false, rolbypassrls=false`). Wrapper at `C:\Users\Admin\AppData\Local\Temp\rhp-r2-cred.ps1` is session-only, child-process env only, deleted at session end. | PASS |
| STEP-02 | Posture gate BEFORE migration: `node scripts/ci/assert-test-db-posture.mjs` → `POSTURE_OK writer_is_writer admin_is_admin same_target`. | PASS |
| STEP-03 | `npx --no-install prisma migrate deploy` against `DATABASE_URL_ADMIN_TEST` → applied `20261004000000_f9b_r2_slot_scope_read_restore`; in-migration static guard PASSED. | PASS |
| STEP-04 | R2 role matrix ×3: `npx vitest run --config vitest.integration.config.ts tests/db/p1a07-f9b-r2-role-scope.integration.test.ts` ×3 fresh processes — 31/31 PASS each (HRSTAFF-06 contract: throw OR zero-row both acceptable; updated after first-run to align with the existing RESTRICTIVE no-DELETE policy posture from `m1_07b`). | PASS |
| STEP-05 | Targeted bundle of the 5 previously failing CI suites in one shot (deterministic — not ×3): `live-public-read-rls.go-live-04` (5) + `p1a1-jobposting-public-apply` + `job-posting-stamps` + `public-card-truth` (10) + `admin-demand-tree` (17) = 62/62 PASS. | PASS |
| STEP-06 | F9-B R1 ×3: `npx vitest run --config vitest.integration.config.ts tests/db/p1a06-f9b-jobposting-write-boundary.integration.test.ts` ×3 fresh processes — 18/18 PASS each. | PASS |
| STEP-07 | F9 ×3: `npx vitest run --config vitest.integration.config.ts tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` ×3 fresh processes — 12/12 PASS each. | PASS |
| STEP-08 | Full integration lane (one shot): 730 passed \| 1 failed \| 2 skipped (733 total). The single failure is in `aff03-public-intake.integration.test.ts` AC-06 (legacy AFF_INITIAL NULL-deadline backfill assertion). **Out of R2 scope** — R2 only touches `staffing_order_slots` SELECT policies; the aff03 AC-06 bug predates R2, reproduces deterministically in isolation, and is documented as pre-existing (see §3.4). | PASS (R2 surface); KNOWN_PRE-EXISTING (aff03 AC-06, out of scope) |
| STEP-09 | Full unit / typecheck / lint / build / Prisma / static / encoding / diff: typecheck (`tsc --noEmit`) clean; lint 0 errors (918 pre-existing warnings); build clean; unit 3622 passed \| 9 skipped (3631 total, 219 files); `prisma validate` valid; `prisma format` reorders 587 lines but the only real (non-whitespace) deltas are pre-existing `@@unique`/`@@index` reorderings (restored to HEAD before commit); static guard tests 32/32 PASS; `verify-encoding.ps1` clean (no BOM, no invalid UTF-8). | PASS |
| STEP-10 | Zero-residue check: F9-B R2 surface (LPHA `f9b-r2*` / `p1a07*` / slot `p1a07*` / project `P1A07*` / `F9B-R2*`) → 0 rows. | PASS |
| STEP-11 | Commit semantic correction forward-only: `git commit` produced SHA `c3fa409a` with the 6-file R2 surface (3 modified + 3 created). | PASS |
| STEP-12 | This HANDOFF + AUDIT + RUN_TIME_REPRODUCTION + T0_RECONCILIATION_REPORT authored; docs-freeze commit pending (Step 13). | PASS |
| STEP-13 | docs-freeze commit (this commit). Working tree is clean afterwards (except workspace-internal `verify-encoding.ps1` infrastructure file, which is intentionally NOT tracked in this task's surface). | PASS |
| STEP-14 | Tier 3 LIGHT DELTA audit on the exact committed audit-target HEAD (`c3fa409a`); on DELTA PASS, adopt AUDIT.md byte-exact; push to existing PR #88. | PENDING (next gate) |

## 3. Evidence

### 3.1 Live posture (R2)

After `prisma migrate deploy` of `20261004000000_f9b_r2_slot_scope_read_restore` against the synthetic DB:

- `pg_policies WHERE tablename = 'staffing_order_slots'`: contains `hrp_f9b_slots_project_select` (FOR SELECT, `USING (hrp_project_visible_for(so.project_id) = true)`), `hrp_f9b_slots_manager_insert` (FOR INSERT, role-gated HR_MANAGER/ADMIN), `hrp_f9b_slots_manager_update` (FOR UPDATE, role-gated HR_MANAGER/ADMIN), `hrp_staffing_order_slots_no_delete` (RESTRICTIVE, `USING (false)`), plus the F9 narrowed policies and the SORA read policies. **No** `hrp_f9b_slots_manager_select` (the over-restrictive R1 read is gone).
- `pg_proc WHERE proname = 'hrp_f9b_bind_slot_to_opening'`: `prosecdef=true`, `proconfig=search_path=...` (unchanged from R1).
- `routine_privileges WHERE routine_name = 'hrp_f9b_bind_slot_to_opening'`: PUBLIC EXECUTE = 0; `app_user_writer` EXECUTE = 1; `app_user` EXECUTE = 1; `app_user_admin` EXECUTE = 1; `app_user_hr_manager` EXECUTE = 1 (unchanged from R1).

### 3.2 R2 role matrix (31/31 ×3)

| Role | Slot of public project | Slot of private project | Own project slot | Other project slot |
| --- | --- | --- | --- | --- |
| MKT (anon via `system:public-job-board-read`) | ✓ see (MKT-01) | ✗ zero-row (MKT-02) | — | — |
| CTV (anon) | ✓ see (CTV-01) | ✗ zero-row (CTV-02) | — | — |
| PM (assigned) | — | — | ✓ see (PM-01) | ✗ zero-row (PM-02) |
| ADMIN | ✓ see (ADMIN-01) | — | — | — |
| HR_MANAGER | ✓ see (HRM-01) | — | — | — |
| DIRECTOR | ✓ see (DIRECTOR-01) | — | — | — |
| SALE | ✓ see (SALE-01) | — | — | — |
| WORKER (own assignment) | ✓ see (WORKER-01) | ✗ zero-row (WORKER-02) | — | — |
| VENDOR_ADMIN (own submission) | ✓ see (VENDOR_ADMIN-01) | ✗ zero-row (VENDOR_ADMIN-02) | — | — |
| VENDOR_STAFF (own submission) | ✓ see (VENDOR_STAFF-01) | ✗ zero-row (VENDOR_STAFF-02) | — | — |
| HR_STAFF (assigned order) | — | — | ✓ see (HRSTAFF-01) | ✗ zero-row (HRSTAFF-02) |
| HR_STAFF (revoked order) | — | — | ✗ zero-row (HRSTAFF-03) | — |

HR_STAFF direct-write negative proof (B-01 / B-02 / B-03 preserved):

| Sub-test | Description | Outcome |
| --- | --- | --- |
| HRSTAFF-04 | HR_STAFF direct UPDATE on `staffing_order_slots.slots_needed` | zero-row fail-closed |
| HRSTAFF-05 | HR_STAFF direct INSERT on `staffing_order_slots` | throws RLS |
| HRSTAFF-06 | HR_STAFF direct DELETE on `staffing_order_slots` | zero-row fail-closed (RESTRICTIVE `hrp_staffing_order_slots_no_delete` `USING (false)`) — row still present after attempt |

### 3.3 Previously failing CI suites (5/5 green, one-shot bundle)

| Suite | Tests | Outcome |
| --- | --- | --- |
| `src/shared/auth/live-public-read-rls.go-live-04.test.ts` | 5 | PASS |
| `tests/db/p1a1-jobposting-public-apply.integration.test.ts` | (file count = 1) | PASS |
| `tests/db/job-posting-stamps.integration.test.ts` | (file count = 1) | PASS |
| `src/domains/job-board/public-card-truth.integration.test.ts` | 10 | PASS |
| `src/domains/admin-demand-tree.integration.test.ts` | 17 | PASS |

Total = 62/62 in the targeted bundle.

### 3.4 Out-of-scope pre-existing failure (aff03 AC-06)

`tests/db/aff03-public-intake.integration.test.ts > AFF-05A-R1 — Canonical initial handling window (R1) > AC-06 (backfill R1): legacy AFF_INITIAL NULL-deadline rows get deadline from starts_at` fails with `expected 1 to be +0`.

Root cause: the assertion at line 2598 counts `where: { source: 'AFF_INITIAL', expiresAt: null }` against the **entire** `labor_profile_handling_assignments` table. The test's own rerun-cleanup at `beforeAll` only drops rows tagged with the current `runId` (a UUID prefix), and the AC-06 backfill is run inline against the IDs the test itself created. A prior run of the integration lane left a non-runId-tagged orphan row (id `1274f164-4093-4063-a090-a0714be981ec`, source `AFF_INITIAL`, `expires_at = NULL`, `status = ACTIVE`, `starts_at = 2026-10-01T06:07:04.914Z`) on the synthetic DB. The test then asserts ZERO NULL rows but finds the orphan.

Reproducibility: fails deterministically in isolation (filtered to AFF-05A-R1) on a fresh process. **No R2 surface touches `labor_profile_handling_assignments`** — the R2 migration is byte-isolated to `public.staffing_order_slots` SELECT. Recommended fix (not in this PR): scope the AC-06 assertion to the current runId (e.g. add `id: { in: createdA05HandlingAssignmentIds }` to the where filter), OR add a pre-test global cleanup of NULL `AFF_INITIAL` rows on the synthetic DB.

### 3.5 Tier 3 LIGHT audit target

- **Audit-target HEAD**: `c3fa409a` (this branch's R2 forward-only commit).
- **Predecessor audit-target SHAs preserved**: F9-B R1 final semantic `e68ea4a3`; F9-B R1 docs/evidence freeze `a4dfcded`; F9-B R1 Tier-3 LIGHT audit adoption `d777cf71`; F9 X4 `0d38042f`; F9 X5 `1b9bbd9f`.
- **Audit mode**: LIGHT DELTA on R2 surface only (per TASK.md §0 / §4.2).
- **Predecessor chain evidence**: R1 HANDOFF + AUDIT + RUN_TIME_REPRODUCTION at `docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/`.

## 4. Implementation Surface

### 4.1 R2 forward-only files (6 files, +1770 −4)

| File | Status | Lines | Purpose |
| --- | --- | --- | --- |
| `prisma/migrations/20261004000000_f9b_r2_slot_scope_read_restore/migration.sql` | NEW | +1 migration | DROP over-restrictive read; CREATE canonical narrow read; in-migration static guard |
| `src/shared/security/f9b-rls-static-guards.ts` | MODIFIED | +extensions | `parseRound2MigrationPosture()` and `assertRound2MigrationApplied()` |
| `src/shared/security/f9b-slot-opening-binding-primitive.static.test.ts` | MODIFIED | +66 | R2 static posture assertions (replaces the R1-only assertions, preserves all R1 assertions) |
| `tests/db/p1a07-f9b-r2-role-scope.integration.test.ts` | NEW | +test | 31 role-matrix tests (positive + zero-row + HR_STAFF direct-write negative proof) |
| `docs/tasks/hrp-f9b-r2-slot-scope-read-restore/TASK.md` | NEW | +TASK | READY_FOR_EXECUTION / READY_TO_CODE / CLOSED / CRITICAL / LIGHT |
| `vitest.integration-files.ts` | MODIFIED | +17 | Add `tests/db/p1a07-f9b-r2-role-scope.integration.test.ts` to the integration lane allowlist |

### 4.2 R2 DELTA scope (for Tier 3 LIGHT audit)

The Tier 3 LIGHT audit must DELTA-verify the R2 surface against the R1 audit-target SHA `e68ea4a3`:

- New migration is forward-only and contains an in-migration static guard.
- No byte edit to R1 corrective migration `20261003100000_f9b_slot_opening_binding_primitive/migration.sql`.
- No byte edit to F9 migration files.
- No byte edit to `prisma/schema.prisma` / `package.json` / lockfiles.
- New SELECT policy uses canonical `hrp_project_visible_for(so.project_id)` predicate (same function the rest of the RLS suite uses for `outsourcing_projects`).
- HR_STAFF direct-write negative proof preserved (HRSTAFF-04 / HRSTAFF-05 / HRSTAFF-06).
- No DELETE policy introduced on `staffing_order_slots`.
- No broad StaffingOrder write relaxation.

## 5. Next Gate

**TIER3_LIGHT_AUDIT (DELTA)** on the exact committed audit-target HEAD `c3fa409a`. On DELTA PASS, adopt `AUDIT.md` byte-exact and push the docs-freeze + R2 surface together to the existing PR #88. Wait for CI 4/4. Production DB / migration remains `NOT_RUN`. UI V1 remains locked.

---

*HANDOFF authored 2026-10-04 ICT by Tier 1A (T1A) on the F9-B R2 forward-only correction. The R2 task is a CRITICAL / LIGHT DELTA on top of F9-B R1 final semantic SHA `e68ea4a3`; the R1 chain evidence is preserved byte-equivalent. All forbidden paths in the TASK contract are zero-touched.*
