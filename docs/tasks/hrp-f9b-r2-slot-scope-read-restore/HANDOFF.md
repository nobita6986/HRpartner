# HANDOFF — `hrp-f9b-r2-slot-scope-read-restore` (F9-B correction round 2)

**Pipeline V2 — Implementation round 2 (CRITICAL / LIGHT). Restores the canonical read blast radius on `public.staffing_order_slots` by replacing the over-restrictive round-1 `hrp_f9b_slots_manager_select` policy with a narrow `FOR SELECT` policy that uses the canonical `hrp_project_visible_for(so.project_id)` predicate, while preserving every byte of the round-1 least-privilege write hardening (B-01 / B-02 / B-03 closed).**

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-f9b-r2-slot-scope-read-restore` |
| Spec version | `v1.0` |
| Spec version description | closeout 2026-10-04 ICT; post-production docs-only forward-only on top of merge SHA `09d68a67…` |
| Status | `ACCEPTED` (T0 closeout 2026-10-04 ICT: PR #88 merged to `main` at `09d68a67…`; 4 F9/F9-B migrations applied to production; production image `ghcr.io/nobita6986/hrpartner:09d68a67` deployed and verified; Tier 3 LIGHT + DELTA audit PASS adopted; F9/F9-B = CLOSED; MỐC_1 = COMPLETE) |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-f9b-r2-production-closeout` (post-merge closeout worktree, fresh from `origin/main @ 09d68a67…`) |
| Branch | `codex/t1a-f9b-r2-production-closeout` (post-production closeout branch; differs from the now-merged implementation branch `codex/t1a-f9b-jobposting-write-boundary-hardening`) |
| Baseline | `e68ea4a3e4521eeb794e7c051a7bea0c33ec70f5` |
| Accepted main SHA | `09d68a67fe9ab3b30c09e77eea65f042519365e1` (PR #88 merge commit on `main`; PR #88 head `dc088842fa55f0bb61b2d086ee82c24a0ead390c`; pre-merge base `6015361bb986b920bad6a90f8f9986165a4a99d5`; merge parents = `6015361b…` + `dc088842…`) |
| Merged PR | `#88` (merged into `main` at `09d68a67…`; source branch `codex/t1a-f9b-jobposting-write-boundary-hardening`; merge strategy `--merge` per T0/Owner merge operation; no squash, no rebase, no force-push) |
| Predecessor F9-B R1 HANDOFF + verify-handoff PASS SHA | `867f8882` |
| Predecessor F9-B R1 docs/evidence freeze SHA | `a4dfcded74c7fea425ee4e265b94ad85eaef951c` |
| Predecessor F9-B R1 Tier-3 LIGHT audit adoption SHA | `d777cf71d0abee81a39e093d562343e52da49d0c` |
| Predecessor F9 X4 SHA | `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26` |
| Predecessor F9 X5 SHA | `1b9bbd9f809e2251b501c288bd3d63179fcb4ee7` |
| Implementation SHA | `c3fa409ada5295cfbbe2a57ebd2ef9eddeb7aae3` |
| Implementation SHA (R2 final) | `c3fa409ada5295cfbbe2a57ebd2ef9eddeb7aae3` (R2 forward-only commit on top of R1; pinned per TASK §4 RQ-12) |
| Delivery protocol | `V2_FAST_FREEZE` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Audit mode | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Execution round | `3` (R2 implementation round = 1, R2 docs/control correction round = 2, this post-production docs-only closeout round = 3; R2 semantic Implementation SHA `c3fa409a` unchanged; this round is docs-only with zero semantic delta vs merge SHA `09d68a67…`) |
| Correction batches used | `1` |
| Correction batches used (cumulative) | `1` (R1 budget `1/1` exhausted; R2 budget `1/1` exhausted by `c3fa409a`) |
| Predecessor chain preserved | F9 X4 `0d38042f` → F9 X5 `1b9bbd9f` → F9-B R1 `e68ea4a3` → F9-B R1 docs `a4dfcded` → F9-B R1 Tier-3 adoption `d777cf71` → F9-B R2 semantic `c3fa409a` → F9-B R2 docs/evidence `1c90860c` → F9-B R2 docs/control correction `3f8b42cf` → F9-B R2 terminal control sync `f7e4032e` → F9-B R2 Tier-3 DELTA audit adoption `dc088842` → merge `09d68a67`. **Every commit strictly after `e68ea4a3` on the branch is either (a) R1 docs/evidence freeze with no semantic delta, (b) R2 forward-only corrective with the exact R2 surface below, or (c) post-merge docs-only closeout with zero semantic delta vs merge SHA `09d68a67…`.** No amend / reset / rebase / force-push on `1b9bbd9f..HEAD`. |
| Test environment | `READY` (synthetic Neon `ep-empty-forest-azlhfyo9-*` writer / admin pair — T0 authorized `C:\cre_hrp.txt` ingestion via process wrapper. Wrapper loads URLs by host + username + database, never echoes URL / password / query string, never writes to repo.) |
| Synthetic DB preflight | `POSTURE_OK writer_is_writer admin_is_admin same_target` (writer `rolsuper=false, rolbypassrls=false`; admin `rolsuper=false, rolbypassrls=true`; `ep-empty-forest-azlhfyo9-*` host prefix; `neondb` database; production `ep-shy-tree-*` URLs counted-and-ignored — `ignored_production_lines=2`) |
| Synthetic migration deploy | `OK` — `npx --no-install prisma migrate deploy` applied `20261004000000_f9b_r2_slot_scope_read_restore` against `DATABASE_URL_ADMIN_TEST`. The migration's in-migration static guard (`assertMigrationStaticPosture()` invoked via `DO $$ ... $$` PL/pgSQL block) PASSED, otherwise the migration would have RAISED and aborted. |
| Production DB / migration | `COMPLETED` — production `ep-shy-tree-*` host prefix dialed only through the existing `/opt/hrp/migrate-production.sh` sudo-wrapped wrapper; admin URL loaded from `/etc/hrp/secrets/migration.env`; flock-protected. 4 F9/F9-B migrations applied; `prisma migrate status` reports `Database schema is up to date!`; production `_prisma_migrations` row count = 67; repository migration directories observed by Prisma = 62 (the 5-row difference includes the previously documented historical hotfix migrations). |
| Production deployment | `PASS` — image `ghcr.io/nobita6986/hrpartner:09d68a67fe9ab3b30c09e77eea65f042519365e1` built from exact merge SHA, deployed via existing `/opt/hrp/deploy-production.sh`. Atomic release-env write `/opt/hrp/.release.env` ⇒ `HRP_IMAGE=ghcr.io/nobita6986/hrpartner@sha256:91044236443ae3329875089ec5fe3e00fa16abc8d6148b71b1aa8880187a3f47`. `docker compose up -d --wait` succeeded; smoke test (login + viec-lam) PASSED. Auto-rollback NOT triggered. |
| Production verification | `PASS` — read-only verification against https://vieclammienbac.com.vn: `pg_policies` shows `staffing_order_slots \| hrp_f9b_slots_project_select \| SELECT` (using canonical `hrp_project_visible_for(so.project_id)`); old `hrp_f9b_slots_manager_select` absent; broad HR_STAFF UPDATE/DELETE policies absent; F9 narrow INSERT hardening preserved; `hrp_f9b_bind_slot_to_opening` has `prosecdef=t` and `proconfig={search_path=...}`; PUBLIC has no EXECUTE on the binding primitive; public `/`, `/login`, `/viec-lam`, JobPosting detail return HTTP 200; `/admin` returns 307 (auth redirect smoke). `hrp-app` healthy. Production backups retained (oldest 20261002, newest pre-migrate `20261003T201150Z.dump` sha256 `4095a6744dc1f6a599ff5bcb8f9272aac49699bfaa16f30e249eef82a437fddc`). |
| Tier 3 LIGHT audit round 1 | `PASS` (adopted at SHA `d777cf71`; verdict preserved as authoritative for the F9-B R1 final surface `e68ea4a3`) |
| Tier 3 DELTA audit round 2 | `PASS` (adopted at SHA `dc088842`; scope = R2 forward-only corrective on top of `c3fa409a`) |
| aff03 AC-06 disposition | `PRE_EXISTING_NON_REGRESSION` (F9-B R2 delta scope only; AFF-03 debt NOT closed; R2 has zero mechanism to alter AC-06 path which reads `labor_profile_handling_assignments`) |
| Next gate | `NONE — MỐC_1_CLOSED` (PR #88 merged into `main` at `09d68a67…`; production migration + deployment + verification PASS; Tier 3 LIGHT + DELTA audit PASS adopted; closeout commits are docs-only forward-only on top of merge SHA; UI V1, UI2, Mốc 2 are unlocked for parallel assignment to T1A/T1B/T1C) |

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

## 3. Acceptance Evidence

> Per TASK §6.1 AC-01..AC-12. Em-dash rows (`—`) carry the contract gate and Tier-3 chain evidence per verify-handoff H-04. The verify-task.ps1 contract-gate row sits first per H-04 ordering preference.

| ID | Gate / Command | Result / Outcome | Evidence location |
| --- | --- | --- | --- |
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-f9b-r2-slot-scope-read-restore/TASK.md` (contract gate for the R2 forward-only commit; re-runs in this docs/control correction round against TASK.md §0 control fields) | `RESULT: PASS` (this docs/control correction round; before correction: 5 errors → after `Baseline` / `Implementation SHA` / `Correction batches used` field rename + `A-02 Audit mode LIGHT (DELTA only - see 4.2)` value correction: PASS) | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-f9b-r2-slot-scope-read-restore/TASK.md` console output captured by verifiers (E-01) |
| AC-01 | `git diff e68ea4a3..c3fa409a -- prisma/migrations/20261003000000_f9_hr_staff_posting_write_rls/migration.sql prisma/migrations/20261003000001_f9_hr_staff_posting_insert_rls/migration.sql prisma/migrations/20261003100000_f9b_slot_opening_binding_primitive/migration.sql` (returns empty) AND `npx --no-install prisma migrate deploy` against `ep-empty-forest-azlhfyo9-*` (applied `20261004000000_f9b_r2_slot_scope_read_restore`) AND live posture `pg_policies` query on `staffing_order_slots` shows new policy present, old policy gone, F9-B R1 / F9 bytes untouched | `RESULT: PASS` — `git diff` empty; `prisma migrate deploy` applies cleanly; in-migration static guard PASS; pg_policies shows `hrp_f9b_slots_project_select` (FOR SELECT, `USING (hrp_project_visible_for(so.project_id))`); `hrp_f9b_slots_manager_select` gone | `RUN_TIME_REPRODUCTION.md §1.2`; live posture at `C:\Users\Admin\AppData\Local\Temp\rhp-r2-intg.log` (posture probes); E-08 / E-09 |
| AC-02 | `npx vitest run src/shared/security/f9b-slot-opening-binding-primitive.static.test.ts` AND `psql` query on `pg_policies` of `staffing_order_slots` to assert canonical predicate `EXISTS (SELECT 1 FROM public.staffing_orders so WHERE so.id = public.staffing_order_slots.staffing_order_id AND public.hrp_project_visible_for(so.project_id))` | `RESULT: PASS` — new policy `hrp_f9b_slots_project_select` carries canonical `hrp_project_visible_for` predicate; static guard tests include the new predicate assertion (R2 assertion in addition to R1 assertions) | `RUN_TIME_REPRODUCTION.md §1.8` (static guard tests 32/32 PASS); `RUN_TIME_REPRODUCTION.md §3.1` |
| AC-03 | `npx vitest run src/shared/security/f9b-slot-opening-binding-primitive.static.test.ts src/shared/security/f9-hr-staff-posting-write-rls.static.test.ts src/shared/security/required-relation-sweep.static.test.ts` (all static guards) | `RESULT: PASS` — 32/32 static guard tests PASS; F9-B R1 posture preserved; no `*_delete` policy introduced; no broad `staffing_orders_*` write relaxation | `RUN_TIME_REPRODUCTION.md §1.8` |
| AC-04 | `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts tests/db/p1a07-f9b-r2-role-scope.integration.test.ts` ×3 fresh processes | `RESULT: PASS` — 31/31 PASS each run (MKT-01/02, CTV-01/02, PM-01/02, ADMIN-01, HRM-01, DIRECTOR-01, SALE-01, WORKER-01/02, VENDOR_ADMIN-01/02, VENDOR_STAFF-01/02, HRSTAFF-01/02/03/04/05/06/07); exact-ID zero residue | `RUN_TIME_REPRODUCTION.md §1.3`; E-10 |
| AC-05 | `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts tests/db/p1a1-jobposting-public-apply.integration.test.ts tests/db/job-posting-stamps.integration.test.ts src/domains/job-board/public-card-truth.integration.test.ts src/shared/auth/live-public-read-rls.go-live-04.test.ts src/domains/admin-demand-tree.integration.test.ts` (one-shot bundle of the 5 previously failing PR #88 CI suites) | `RESULT: PASS` — 62/62 in the bundle (live-public-read-rls 5 + p1a1-apply + job-posting-stamps + public-card-truth 10 + admin-demand-tree 17) | `RUN_TIME_REPRODUCTION.md §1.4`; E-13 |
| AC-06 | `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts tests/db/p1a06-f9b-jobposting-write-boundary.integration.test.ts` ×3 AND `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` ×3 AND `tests/db/job-posting-authoring.integration.test.ts tests/db/p1a04-canonical-flow.integration.test.ts tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` (predecessor DB regressions) | `RESULT: PASS` — F9-B R1 18/18 ×3 PASS; F9 12/12 ×3 PASS; predecessor DB regressions 78/78 PASS | `RUN_TIME_REPRODUCTION.md §1.5`, `§1.6`, `§1.4` (combined bundle); E-11, E-12 |
| AC-07 | All canonical gates: `npx prisma validate`; `npx tsc --noEmit`; `npm run lint`; `npm run build`; `npx vitest run --config vitest.unit.config.ts`; `git diff --check e68ea4a3..HEAD`; `node .ai-pipeline/scripts/verify-encoding-range.mjs e68ea4a3 HEAD`; `node .ai-pipeline/scripts/verify-encoding.mjs`; synthetic posture; synthetic migration deploy; F9-B R2 ×3; F9-B R1 ×3; F9 ×3; the 5 CI-failing test suites (one-shot) | `RESULT: PASS` — typecheck clean; lint 0 errors; build clean; unit 3622 passed / 9 skipped / 219 files; `prisma validate` valid; static guard tests 32/32; encoding clean (no BOM); synthetic posture `POSTURE_OK`; `prisma migrate deploy` applied; F9-B R2 31/31 ×3; F9-B R1 18/18 ×3; F9 12/12 ×3; one-shot bundle 62/62 | `RUN_TIME_REPRODUCTION.md §1.7`, `§1.8`; E-09, E-10, E-11, E-12, E-13, E-14, E-15, E-16, E-17, E-18 |
| AC-08 | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-f9b-r2-slot-scope-read-restore/TASK.md` | `RESULT: PASS` (this docs/control correction round; before correction: 12 errors / 1 warning → after §3/§4/§5/§6 rename, AC evidence rows, field name fixes: PASS) | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-f9b-r2-slot-scope-read-restore/TASK.md` console output; E-02 |
| AC-09 | `git log --oneline -3` shows R2 docs/control correction HEAD forward of `c3fa409a`; F9-B R1 TASK.md untouched (out of scope for this docs/control correction round) | `RESULT: PASS` — F9-B R1 TASK.md unchanged (out of scope); `git log --oneline -3` confirms R2 docs/control HEAD > `c3fa409a` (post-commit handback reports exact SHA) | post-commit `git log` output (handback chat); E-04 |
| AC-10 | `git status --short` returns empty (except untracked `.ai-pipeline/scripts/verify-encoding.ps1`); `git log --oneline -7` shows preserved predecessor chain | `RESULT: PASS` — clean tree (except intentionally untracked workspace-internal infrastructure file); preserved chain `6015361b → ... → d777cf71 → c3fa409a → <docs/control HEAD>` | post-commit `git status --short` output (handback chat); E-07 |
| AC-11 | Out of scope (push step — pending T0 authorization; not executed per T0 instruction "Chưa push PR #88"). Cites E-04 / E-05 / E-06 / E-07 to demonstrate push-readiness invariants hold (frozen delivery invariant, no later semantic delta, clean tree). | `RESULT: N/A_OUT_OF_SCOPE` (T0 instruction: "Chưa push PR #88, chưa gọi Tier 3, chưa merge/deploy"); push-readiness invariants proven by E-04, E-05, E-06, E-07 | not executed (T0 instruction); cited E-04 / E-05 / E-06 / E-07 |
| AC-12 | Out of scope (Tier-3 LIGHT DELTA audit phase — T0 instruction "chưa gọi Tier 3"). The T1A-authored R2 `AUDIT.md` was deleted in this docs/control correction; Tier 3 will author the new authoritative R2 `AUDIT.md` after this commit. Cites E-02 (verify-handoff PASS) to demonstrate Tier 3 prerequisites are met. | `RESULT: N/A_OUT_OF_SCOPE` (Tier-3 phase; T1A-authored R2 `AUDIT.md` deleted in this docs/control correction round per T0 decision "Tier 1 không được tự author AUDIT.md") | not executed (T0 instruction); cited E-02 (verify-handoff PASS) |

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

**Cross-check on R1 baseline SHA `e68ea4a3` (this docs/control correction round)** — to rule out R2-introduced regression the same `vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts -t 'AC-06'` invocation was executed against a sibling detached worktree at `e68ea4a3` (R1 final semantic SHA; `node_modules` copied from R2 worktree, `prisma generate` re-run to refresh client; same synthetic Neon pair `ep-empty-forest-azlhfyo9-*` writer/admin, same test invocation):

| Variant | Worktree HEAD | Command | Exit | Failure signature |
| --- | --- | --- | --- | --- |
| R2 (semantic) | `c3fa409a` | `npx vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts -t 'AC-06'` | `1` | `AssertionError: expected 1 to be +0 // Object.is equality` at `tests/db/aff03-public-intake.integration.test.ts:2598:33` |
| R1 baseline | `e68ea4a3` | identical | `1` | **byte-identical** (`AssertionError: expected 1 to be +0 // Object.is equality` at `tests/db/aff03-public-intake.integration.test.ts:2598:33`) |

Both runs produced identical expected/received numbers (`Expected: 0, Received: 1`), identical failure message (`AssertionError: expected 1 to be +0 // Object.is equality`), identical assertion location (`tests/db/aff03-public-intake.integration.test.ts:2598:33`), and identical `1 failed | 1 passed | 24 skipped (26)` test-file roll-up. Logs at `C:\Users\Admin\AppData\Local\Temp\rhp-r2-intg-ac06.log` (R2) and `C:\Users\Admin\AppData\Local\Temp\rhp-r2-baseline-ac06.log` (R1 baseline). **Disposition: `PRE_EXISTING_NON_REGRESSION`** — accepted only for F9-B R2 delta scope. The R2 surface (R2 SELECT policy on `public.staffing_order_slots`) does not intersect with the AC-06 path (which queries `labor_profile_handling_assignments` via Prisma model); R2 has **zero mechanism** to alter AC-06 outcome. Fix out of scope for F9-B R2.

### 3.5 Tier 3 LIGHT audit target

- **Audit-target HEAD**: **reported in post-commit handback** (this HANDOFF is committed before the docs/control correction SHA is finalized; the exact 40-character audit-target HEAD is reported by T1A in the chat handback to T0/Tier 3). **Semantic SHA = `c3fa409a`** (R2 forward-only corrective; R1 final semantic SHA = `e68ea4a3`). The docs/control correction in this round is forward-only with **zero semantic delta** against `c3fa409a` (no source/test/migration edit, only docs/evidence/control field updates and deletion of T1A-authored `AUDIT.md`).
- **Predecessor audit-target SHAs preserved**: F9-B R1 final semantic `e68ea4a3`; F9-B R1 docs/evidence freeze `a4dfcded`; F9-B R1 Tier-3 LIGHT audit adoption `d777cf71`; F9 X4 `0d38042f`; F9 X5 `1b9bbd9f`.
- **Audit mode**: LIGHT DELTA on R2 surface only (per TASK.md §0 / §4.2).
- **Predecessor chain evidence**: R1 HANDOFF + AUDIT + RUN_TIME_REPRODUCTION at `docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/` (R1 audit artifact Tier-3 LIGHT PASS at SHA `d777cf71`).
- **R2 AUDIT.md status (this round)**: the `AUDIT.md` at `docs/tasks/hrp-f9b-r2-slot-scope-read-restore/AUDIT.md` authored by T1A at SHA `1c90860c` is **deleted** in this docs/control correction per T0 decision ("Tier 1 không được tự author AUDIT.md"). Tier 3 authors the new authoritative R2 `AUDIT.md` after this commit lands. Predecessor R1 AUDIT.md is preserved byte-equivalent at `docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/AUDIT.md`.

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

**Cross-check on R1 baseline SHA `e68ea4a3` (this docs/control correction round)** — to rule out R2-introduced regression the same `vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts -t 'AC-06'` invocation was executed against a sibling detached worktree at `e68ea4a3` (R1 final semantic SHA; `node_modules` copied from R2 worktree, `prisma generate` re-run to refresh client; same synthetic Neon pair `ep-empty-forest-azlhfyo9-*` writer/admin, same test invocation):

| Variant | Worktree HEAD | Command | Exit | Failure signature |
| --- | --- | --- | --- | --- |
| R2 (semantic) | `c3fa409a` | `npx vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts -t 'AC-06'` | `1` | `AssertionError: expected 1 to be +0 // Object.is equality` at `tests/db/aff03-public-intake.integration.test.ts:2598:33` |
| R1 baseline | `e68ea4a3` | identical | `1` | **byte-identical** (`AssertionError: expected 1 to be +0 // Object.is equality` at `tests/db/aff03-public-intake.integration.test.ts:2598:33`) |

Both runs produced identical expected/received numbers (`Expected: 0, Received: 1`), identical failure message (`AssertionError: expected 1 to be +0 // Object.is equality`), identical assertion location (`tests/db/aff03-public-intake.integration.test.ts:2598:33`), and identical `1 failed | 1 passed | 24 skipped (26)` test-file roll-up. Logs at `C:\Users\Admin\AppData\Local\Temp\rhp-r2-intg-ac06.log` (R2) and `C:\Users\Admin\AppData\Local\Temp\rhp-r2-baseline-ac06.log` (R1 baseline). **Disposition: `PRE_EXISTING_NON_REGRESSION`** — accepted only for F9-B R2 delta scope. The R2 surface (R2 SELECT policy on `public.staffing_order_slots`) does not intersect with the AC-06 path (which queries `labor_profile_handling_assignments` via Prisma model); R2 has **zero mechanism** to alter AC-06 outcome. Fix out of scope for F9-B R2.

### 3.5 Tier 3 LIGHT audit target

- **Audit-target HEAD**: **reported in post-commit handback** (this HANDOFF is committed before the docs/control correction SHA is finalized; the exact 40-character audit-target HEAD is reported by T1A in the chat handback to T0/Tier 3). **Semantic SHA = `c3fa409a`** (R2 forward-only corrective; R1 final semantic SHA = `e68ea4a3`). The docs/control correction in this round is forward-only with **zero semantic delta** against `c3fa409a` (no source/test/migration edit, only docs/evidence/control field updates and deletion of T1A-authored `AUDIT.md`).
- **Predecessor audit-target SHAs preserved**: F9-B R1 final semantic `e68ea4a3`; F9-B R1 docs/evidence freeze `a4dfcded`; F9-B R1 Tier-3 LIGHT audit adoption `d777cf71`; F9 X4 `0d38042f`; F9 X5 `1b9bbd9f`.
- **Audit mode**: LIGHT DELTA on R2 surface only (per TASK.md §0 / §4.2).
- **Predecessor chain evidence**: R1 HANDOFF + AUDIT + RUN_TIME_REPRODUCTION at `docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/` (R1 audit artifact Tier-3 LIGHT PASS at SHA `d777cf71`).
- **R2 AUDIT.md status (this round)**: the `AUDIT.md` at `docs/tasks/hrp-f9b-r2-slot-scope-read-restore/AUDIT.md` authored by T1A at SHA `1c90860c` is **deleted** in this docs/control correction per T0 decision ("Tier 1 không được tự author AUDIT.md"). Tier 3 authors the new authoritative R2 `AUDIT.md` after this commit lands. Predecessor R1 AUDIT.md is preserved byte-equivalent at `docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/AUDIT.md`.

## 4. Changed Deliverables

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

## 5. Deviations

### 5.1 Next Gate

**`NONE — MỐC_1_CLOSED`** (post-production docs-only closeout 2026-10-04 ICT). PR #88 merged into `main` at `09d68a67…`; production migration + deployment + verification all PASS; Tier 3 LIGHT + DELTA audit PASS adopted at SHA `dc088842`. This HANDOFF pins the post-production closeout state: Implementation SHA `c3fa409a` (R2 semantic), Accepted main SHA `09d68a67` (PR #88 merge commit), Production migration `COMPLETED`, Production deployment `PASS`, Production verification `PASS`, F9/F9-B = CLOSED, MỐC_1 = COMPLETE. UI V1, UI2, Mốc 2 unlocked for parallel assignment to T1A/T1B/T1C. No further audit round is opened on F9/F9-B.

### 5.2 Recorded deviations

| ID | Deviation | Mitigation |
| --- | --- | --- |
| DEV-01 | The original T1A-authored R2 `AUDIT.md` (77 lines, at SHA `1c90860c`) was deleted in this docs/control correction round per T0 decision "Tier 1 không được tự author AUDIT.md" | The new authoritative R2 `AUDIT.md` will be authored by Tier 3 after this commit lands; predecessor R1 `AUDIT.md` is preserved byte-equivalent at `docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/AUDIT.md` (Tier-3 LIGHT PASS at SHA `d777cf71`); HANDOFF §3.5 records the deletion and rationale. |
| DEV-02 | Audit-target HEAD is intentionally NOT pinned inside this HANDOFF commit (per T0 instruction: "Audit-target HEAD không tự pin bên trong chính commit đó"); the exact 40-character audit-target HEAD is reported by T1A in the post-commit handback chat. | HANDOFF §0 and §3.5 explicitly mark "reported in post-commit handback"; verify-handoff H-16 requires Implementation SHA (40-char, must resolve to local commit), which is satisfied by `c3fa409a` (the semantic SHA — the audit-target HEAD is a docs/control HEAD forward of `c3fa409a`, not the Implementation SHA itself). The frozen delivery invariant (H-16) is preserved because `git diff c3fa409a..HEAD -- app src prisma tests scripts packages` is empty (no semantic delta after `c3fa409a`). |
| DEV-03 | The full integration lane shows a single `aff03 AC-06` failure (out of scope, pre-existing). | Documented as `PRE_EXISTING_NON_REGRESSION` per §3.4 cross-check (R1 baseline `e68ea4a3` produces byte-identical failure signature); R2 surface is R2 SELECT policy on `public.staffing_order_slots` only — zero mechanism to alter AC-06 path (which queries `labor_profile_handling_assignments`); fix is out of scope for F9-B R2. |
| DEV-04 | The HANDOFF in this round contains a docs-only HEAD forward of `c3fa409a`; the docs/control correction is intentionally forward-only with zero semantic delta, so no `Implementation SHA` re-pin is required. | `verify-handoff.ps1` H-16 frozen-delivery invariant checks `git diff <ImplementationSHA>..HEAD -- app src prisma tests scripts packages` is empty; this round's docs-only HEAD satisfies the invariant (only `docs/tasks/...` files changed). |
| DEV-05 | Post-production docs-only closeout (this round, 2026-10-04 ICT, FAST lane docs-only, Audit mode NONE, Tier 3 recall NOT_REQUIRED). Status flipped `READY_FOR_AUDIT → ACCEPTED`; Next gate flipped `TIER3_LIGHT_AUDIT → NONE — MỐC_1_CLOSED`. Implementation SHA `c3fa409a` remains pinned unchanged. CLOSEOUT.md added to the task directory capturing the merge, deployment, backup, verification, and remaining-debt evidence. Predecessor `AUDIT.md`, `RUN_TIME_REPRODUCTION.md`, `T0_RECONCILIATION_REPORT.md` byte-unchanged on `main`. | No semantic delta vs merge SHA `09d68a67…` (only the three docs/control files change). `git diff 09d68a67..HEAD -- app src prisma tests scripts packages` is empty. Closing line `Handoff status: ACCEPTED`. T0 pre-authorized merge of the closeout PR if diff is exactly the three allowed docs, all verifiers PASS, PR CI 4/4 GREEN, PR is MERGEABLE/CLEAN, and no secret/source/test/schema/migration/deploy-config delta exists. |

## 6. Evidence Index

### 6.1 Runnable evidence registry (E-xx → command / result)

| ID | Runnable | Evidence |
| --- | --- | --- |
| E-01 | yes | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-f9b-r2-slot-scope-read-restore/TASK.md` — RESULT: PASS (this docs/control correction round) |
| E-02 | yes | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-f9b-r2-slot-scope-read-restore/TASK.md` — RESULT: PASS (this docs/control correction round) |
| E-03 | yes | `node .ai-pipeline/scripts/verify-encoding.mjs` — RESULT: PASS (3 changed text file(s), strict UTF-8 without BOM) |
| E-04 | yes | `git diff --check c3fa409a..HEAD` (this docs/control correction round) — RESULT: PASS (no whitespace-only conflicts) |
| E-05 | yes | `git diff --check HEAD` — RESULT: PASS (clean) |
| E-06 | yes | `git diff c3fa409a..HEAD -- app src prisma tests scripts packages` — RESULT: PASS (empty; zero semantic delta) |
| E-07 | yes | `git status --short` — clean tree (except intentionally untracked `.ai-pipeline/scripts/verify-encoding.ps1` workspace-internal infrastructure file) |
| E-08 | yes | `npx --no-install prisma migrate deploy` against `ep-empty-forest-azlhfyo9-*` (synthetic DB) — applied `20261004000000_f9b_r2_slot_scope_read_restore`; in-migration static guard PASS |
| E-09 | yes | `node scripts/ci/assert-test-db-posture.mjs` — `POSTURE_OK writer_is_writer admin_is_admin same_target` |
| E-10 | yes | `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts tests/db/p1a07-f9b-r2-role-scope.integration.test.ts` ×3 — 31/31 ×3 PASS |
| E-11 | yes | `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts tests/db/p1a06-f9b-jobposting-write-boundary.integration.test.ts` ×3 — 18/18 ×3 PASS |
| E-12 | yes | `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` ×3 — 12/12 ×3 PASS |
| E-13 | yes | targeted bundle: `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts src/shared/auth/live-public-read-rls.go-live-04.test.ts tests/db/p1a1-jobposting-public-apply.integration.test.ts tests/db/job-posting-stamps.integration.test.ts src/domains/job-board/public-card-truth.integration.test.ts src/domains/admin-demand-tree.integration.test.ts` — 62/62 PASS |
| E-14 | yes | `npx vitest run --config vitest.unit.config.ts` — 3622 passed / 9 skipped (219 files) |
| E-15 | yes | `npx --no-install prisma validate` — schema valid |
| E-16 | yes | `npx tsc --noEmit` — clean |
| E-17 | yes | `npm run lint` — 0 errors (918 pre-existing warnings) |
| E-18 | yes | `npm run build` — clean |
| E-19 | yes | aff03 AC-06 cross-check: `npx vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts -t 'AC-06'` against R2 (`c3fa409a`) and R1 baseline (`e68ea4a3`) — byte-identical `AssertionError: expected 1 to be +0 // Object.is equality` at `tests/db/aff03-public-intake.integration.test.ts:2598:33` — disposition: `PRE_EXISTING_NON_REGRESSION`. Logs: `C:\Users\Admin\AppData\Local\Temp\rhp-r2-intg-ac06.log` (R2) and `C:\Users\Admin\AppData\Local\Temp\rhp-r2-baseline-ac06.log` (R1 baseline). |
| E-20 | yes | Production deployment + verification (post-merge, 2026-10-03 ICT): production backup `/srv/hrp/backups/hrp-pre-migrate-20261003T201150Z.dump` (sha256 `4095a6744dc1f6a599ff5bcb8f9272aac49699bfaa16f30e249eef82a437fddc`, 520559 bytes, `pg_restore --list` re-verified: 779 entries, TOC 769); `prisma migrate deploy` via `/opt/hrp/migrate-production.sh` applied 4 F9/F9-B migrations; `prisma migrate status` reports `Database schema is up to date!`; image `ghcr.io/nobita6986/hrpartner:09d68a67fe9ab3b30c09e77eea65f042519365e1` deployed via `/opt/hrp/deploy-production.sh`; running image digest `sha256:91044236443ae3329875089ec5fe3e00fa16abc8d6148b71b1aa8880187a3f47`; `hrp-app` healthy. |
| E-21 | yes | Production read-only posture (post-merge, 2026-10-03 ICT): `pg_policies` for `staffing_order_slots` shows `hrp_f9b_slots_project_select` (FOR SELECT, `USING (hrp_project_visible_for(so.project_id))`); `hrp_f9b_slots_manager_select` is gone; broad HR_STAFF UPDATE/DELETE policies absent; F9 narrow INSERT hardening preserved; `pg_proc WHERE proname = 'hrp_f9b_bind_slot_to_opening'` shows `prosecdef=t` and `proconfig={search_path=...}`; PUBLIC has no EXECUTE on the binding primitive. |
| E-22 | yes | Production smoke (post-merge, 2026-10-03 ICT): `GET https://vieclammienbac.com.vn/` HTTP 200; `GET /login` HTTP 200; `GET /viec-lam` HTTP 200 (1 job listing); `GET /viec-lam/tho-dien-0-08d57fb2` HTTP 200 (full Vietnamese JobPosting detail); `GET /admin` HTTP 307 (auth redirect smoke). |

### 6.2 R2 Disposition

| Round | Author | Disposition | Notes |
| --- | --- | --- | --- |
| R2 semantic round | T1A (at SHA `c3fa409a`) | `READY_FOR_AUDIT` | R2 forward-only corrective (semantic SHA `c3fa409a`, frozen by `1c90860c`); 31/31 role-matrix ×3 PASS, 62/62 in targeted bundle PASS, F9-B R1 18/18 ×3 PASS, F9 12/12 ×3 PASS, full integration lane `730 passed / 1 failed (out-of-scope pre-existing) / 2 skipped`, all unit/typecheck/lint/build/Prisma/static/encoding gates PASS. |
| R2 docs/control correction round (this commit) | T1A | `READY_FOR_AUDIT` | Per T0 correction: T1A-authored `AUDIT.md` deleted; HANDOFF and T0_RECONCILIATION_REPORT control fields updated; AUDIT-target HEAD NOT pinned inside the commit (T0 instruction); exact 40-character audit-target HEAD reported by T1A in post-commit handback. Zero semantic delta vs `c3fa409a` (no source/test/migration edit). Cross-check on R1 baseline SHA `e68ea4a3` confirms aff03 AC-06 failure is `PRE_EXISTING_NON_REGRESSION` (see §3.4). |
| R2 post-production closeout (this commit, on top of merge SHA `09d68a67…`) | T1A | `ACCEPTED` | T0 closeout 2026-10-04 08:25 ICT, FAST lane docs-only, Audit mode NONE, Tier 3 recall NOT_REQUIRED. Status `READY_FOR_AUDIT → ACCEPTED`; Next gate `TIER3_LIGHT_AUDIT → NONE — MỐC_1_CLOSED`. PR #88 merged into `main` at `09d68a67…`; 4 F9/F9-B migrations applied to production; production image deployed and verified; Tier 3 LIGHT + DELTA audit PASS adopted. CLOSEOUT.md authored with C-01..C-07 corrections. Implementation SHA `c3fa409a` preserved unchanged. Predecessor `AUDIT.md`, `RUN_TIME_REPRODUCTION.md`, `T0_RECONCILIATION_REPORT.md` byte-unchanged. |

## 7. Execution Round History

| Round | Author | SHA(s) | Type | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | T1A | `c3fa409a` (semantic, frozen by `1c90860c`) | semantic implementation | `COMPLETE` | R2 forward-only corrective migration + new test + extended posture guards + integration lane allowlist. Implementation SHA pinned to `c3fa409a` per TASK §4 RQ-12 / HANDOFF §0. |
| 2 | T1A | this commit's HEAD (reported in post-commit handback) | docs/control correction | `COMPLETE` | Forward-only correction per T0 decision: (a) T1A-authored `AUDIT.md` deleted (Tier 1 may not author AUDIT.md); (b) HANDOFF + T0_RECONCILIATION_REPORT control fields updated to point at the post-commit handback audit-target HEAD; (c) §3.4 cross-check evidence added (aff03 AC-06 reproduction parity on `e68ea4a3` and `c3fa409a`); (d) Execution Round History row added to satisfy verify-handoff H-14. **Zero semantic delta** vs `c3fa409a` (no source/test/migration edit). Implementation SHA remains `c3fa409a`. |
| 3 | T1A | this closeout commit's HEAD (post-merge docs-only forward-only; reported in post-merge handback chat) | post-production docs-only closeout | `COMPLETE` | T0 closeout directive 2026-10-04 08:25 ICT, FAST lane docs-only, Audit mode NONE, Tier 3 recall NOT_REQUIRED. Status flipped `READY_FOR_AUDIT → ACCEPTED`; Next gate flipped `TIER3_LIGHT_AUDIT → NONE — MỐC_1_CLOSED`. Implementation SHA `c3fa409a` unchanged. CLOSEOUT.md authored with C-01..C-07 corrections (merge identity, migration counts, hr-staff production evidence, admin demand tree, table-name schema check, PR #88 actor wording, aff03 framing). Predecessor `AUDIT.md`, `RUN_TIME_REPRODUCTION.md`, `T0_RECONCILIATION_REPORT.md` byte-unchanged on `main`. PR #88 already in `main` at `09d68a67…`. Zero semantic delta vs merge SHA `09d68a67…` (only 3 docs files change). |

## 8. Closing

This HANDOFF is the formal post-production closeout for F9-B R2 (T0 directive 2026-10-04 08:25 ICT). PR #88 was merged into `main` at `09d68a67fe9ab3b30c09e77eea65f042519365e1`; the merge SHA `09d68a67…` carries the combined F9/F9-B surface. R2 semantic Implementation SHA `c3fa409ada5295cfbbe2a57ebd2ef9eddeb7aae3` remains pinned unchanged. Production migration, deployment, and verification all PASS. Tier 3 LIGHT + DELTA audit verdict PASS adopted at SHA `dc088842`. F9/F9-B = CLOSED; MỐC_1 = COMPLETE. The closeout commits on the `codex/t1a-f9b-r2-production-closeout` branch are docs-only forward-only on top of merge SHA `09d68a67…` with zero semantic delta. No further audit round is opened on F9/F9-B. UI V1, UI2 and Mốc 2 are unlocked for parallel assignment to T1A/T1B/T1C per T0 directive.

---

*HANDOFF authored 2026-10-04 ICT by Tier 1A (T1A) on the F9-B R2 forward-only correction (semantic SHA `c3fa409a`). The post-production docs-only closeout round (this revision, on top of merge SHA `09d68a67…`) is forward-only with zero semantic delta. The R1 chain evidence is preserved byte-equivalent at `docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/`. All forbidden paths in the TASK contract are zero-touched.*

Handoff status: ACCEPTED
