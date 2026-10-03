# T0_RECONCILIATION_REPORT — `hrp-f9b-r2-slot-scope-read-restore` (F9-B correction round 2)

**Pipeline V2 — T0 reconciliation. R2 forward-only corrective on top of R1 final semantic SHA `e68ea4a3`. CHANGES_REQUIRED_RUNTIME for R2, runtime reproduce PASS at HEAD `c3fa409a`.**

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-f9b-r2-slot-scope-read-restore` |
| T0 disposition | `CHANGES_REQUIRED_RUNTIME` (initial) → `READY_FOR_AUDIT` (after R2 forward-only commit) |
| Initial disposition date | 2026-10-03 23:30 ICT |
| R2 runtime reproduction PASS date | 2026-10-04 ICT |
| Audit-target HEAD | **reported in post-commit handback** (this T0_RECONCILIATION_REPORT is committed before the docs/control correction SHA is finalized; the exact 40-character audit-target HEAD is reported by T1A in the chat handback to T0/Tier 3). **Semantic SHA** = `c3fa409a` (R2 forward-only corrective; R1 final semantic SHA = `e68ea4a3`). The docs/control correction in this round is forward-only with **zero semantic delta** against `c3fa409a`. |
| Predecessor F9-B R1 final semantic SHA | `e68ea4a3` |
| Predecessor F9-B R1 Tier-3 LIGHT PASS | SHA `d777cf71` (R1 adopted) |
| Predecessor F9 X4 / X5 | `0d38042f` / `1b9bbd9f` |
| Predecessor T0 reconciliation R1 | `docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/T0_RECONCILIATION_REPORT.md` |
| Predecessor R1 disposition | `READY_FOR_AUDIT` (R1 closed at SHA `d777cf71`) |

## 1. Initial Disposition (CHANGES_REQUIRED_RUNTIME)

T0 raised the R2 correction after PR #88 surfaced a regression in fresh-DB-only integration coverage:

- R1 corrective migration `20261003100000_f9b_slot_opening_binding_primitive` dropped the canonical `hrp_staffing_order_slot_scope` FOR ALL policy.
- R1's replacement `hrp_f9b_slots_manager_select` was gated on `current_user IN ('hrp_admin', 'app_user_admin', 'app_user_hr_manager', ...)` — admin / HR_MANAGER only.
- Effect: MKT, CTV, PM, sub-PM, DIRECTOR, SALE, WORKER, VENDOR_ADMIN, VENDOR_STAFF, and even HR_STAFF on assigned orders all collapsed to 0 rows when reading `staffing_order_slots` through canonical paths.
- 5 previously-green CI suites flipped red on PR #88: `live-public-read-rls.go-live-04`, `p1a1-jobposting-public-apply`, `job-posting-stamps`, `public-card-truth`, `admin-demand-tree`.
- T0 disposition 2026-10-03 23:30 ICT: `CHANGES_REQUIRED_RUNTIME / NOT_READY_TO_MERGE`. T1A correction batch 1/1 authorized.

## 2. T0 R2 Contract

T0 authorized R2 with the following constraints:

- Single forward-only corrective migration (no rollback, no amend of R1 or F9 migration files).
- In-migration static guard (PL/pgSQL `DO $$ ... $$` block) that RE-READS `pg_policies` and `pg_proc` after DDL and RAISE EXCEPTION on any forbidden posture.
- Restore the canonical read blast radius via a narrow `FOR SELECT` policy using the existing `hrp_project_visible_for(so.project_id)` predicate.
- Preserve every byte of R1's least-privilege write hardening (B-01 / B-02 / B-03).
- R2 correction budget: `1/1`.
- No production DB / production migration / production deploy.

## 3. R2 Forward-Only Commit (SHA `c3fa409a`)

The R2 commit author:

- 1 new migration (`prisma/migrations/20261004000000_f9b_r2_slot_scope_read_restore/migration.sql`) — DROP `hrp_f9b_slots_manager_select`; CREATE `hrp_f9b_slots_project_select` (FOR SELECT, narrow role-gated, uses canonical `hrp_project_visible_for(so.project_id)`); in-migration static guard.
- 1 new test (`tests/db/p1a07-f9b-r2-role-scope.integration.test.ts`) — 31 role-matrix tests covering MKT, CTV, PM, sub-PM, ADMIN, HR_MANAGER, DIRECTOR, SALE, WORKER, VENDOR_ADMIN, VENDOR_STAFF, HR_STAFF (assigned / unassigned / revoked), plus HR_STAFF direct-write negative proof (UPDATE / INSERT / DELETE all fail-closed).
- 3 modified source files (`src/shared/security/f9b-rls-static-guards.ts`, `src/shared/security/f9b-slot-opening-binding-primitive.static.test.ts`, `vitest.integration-files.ts`) — extended posture checks + integration lane allowlist.
- 1 new TASK.md (planning / control delta).

The R2 commit does NOT touch:

- `prisma/schema.prisma`.
- `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml`.
- F9-B R1 corrective migration `20261003100000_f9b_slot_opening_binding_primitive/migration.sql`.
- F9 migration files `20261003000000_f9_hr_staff_posting_write_rls/migration.sql`, `20261003000001_f9_hr_staff_posting_insert_rls/migration.sql`.
- The SECURITY DEFINER function `hrp_f9b_bind_slot_to_opening` (round-1 primitive preserved byte-equivalent).
- The narrow role-gated write policies `hrp_f9b_slots_manager_insert` / `hrp_f9b_slots_manager_update`.
- The hardened F9 INSERT policy `hrp_f9_openings_staff_insert`.
- The RESTRICTIVE no-DELETE policy `hrp_staffing_order_slots_no_delete`.
- The SORA read policies.

## 4. Runtime Reproduction at semantic SHA `c3fa409a`

See `RUN_TIME_REPRODUCTION.md` for the full reproduction trace. Summary:

| Gate | Result |
| --- | --- |
| Posture gate | PASS |
| R2 migration apply | PASS (in-migration static guard PASS) |
| R2 role matrix ×3 | 31/31 ×3 PASS |
| 5 previously failing CI suites (one-shot bundle) | 62/62 PASS |
| F9-B R1 ×3 | 18/18 ×3 PASS |
| F9 ×3 | 12/12 ×3 PASS |
| Full integration lane | 730 passed / 1 failed (out-of-scope) / 2 skipped |
| Unit / typecheck / lint / build / Prisma / static / encoding | PASS |
| Zero-residue | PASS |

## 4a. Cross-Check: aff03 AC-06 on R1 baseline SHA `e68ea4a3`

To rule out an R2-introduced regression behind the single `aff03-public-intake.integration.test.ts > AC-06 (backfill R1)` failure observed in the full integration lane, T1A executed the **same** vitest invocation in isolation against the R1 baseline SHA `e68ea4a3` (sibling detached worktree with `node_modules` copied from R2 and `prisma generate` re-run; identical synthetic Neon pair `ep-empty-forest-azlhfyo9-*` writer/admin; identical test invocation):

| Variant | Worktree HEAD | Exit | Failure signature |
| --- | --- | --- | --- |
| R2 (semantic) | `c3fa409a` | `1` | `AssertionError: expected 1 to be +0 // Object.is equality` at `tests/db/aff03-public-intake.integration.test.ts:2598:33` |
| R1 baseline | `e68ea4a3` | `1` | **byte-identical** (`AssertionError: expected 1 to be +0 // Object.is equality` at `tests/db/aff03-public-intake.integration.test.ts:2598:33`) |

Both runs produced identical expected/received numbers (`Expected: 0, Received: 1`), identical failure message (`AssertionError: expected 1 to be +0 // Object.is equality`), identical assertion location (`tests/db/aff03-public-intake.integration.test.ts:2598:33`), and identical `1 failed | 1 passed | 24 skipped (26)` test-file roll-up. **SHA / command / exit / failure signature identical → `PRE_EXISTING_NON_REGRESSION`** — accepted only for F9-B R2 delta scope. R2 surface (R2 SELECT policy on `public.staffing_order_slots`) has zero mechanism to alter the AC-06 path (which queries `labor_profile_handling_assignments` via Prisma model). Fix is out of scope for F9-B R2. Logs at `C:\Users\Admin\AppData\Local\Temp\rhp-r2-intg-ac06.log` (R2) and `C:\Users\Admin\AppData\Local\Temp\rhp-r2-baseline-ac06.log` (R1 baseline).

## 5. R2 Disposition

T1A R2 forward-only commit satisfies the T0 R2 contract. Runtime reproduction PASS at semantic SHA `c3fa409a`. R2 disposition: `READY_FOR_AUDIT`. The R2 audit target is the exact audit-target HEAD reported in the post-commit handback; the docs/control correction in this round is forward-only with zero semantic delta.

R2 budget exhausted (`1/1`).

## 6. Next Gate

**TIER3_LIGHT_DELTA_AUDIT** on the exact audit-target HEAD reported in the post-commit handback (semantic SHA = `c3fa409a`; the docs/control correction in this round is forward-only with zero semantic delta against `c3fa409a`). The Tier 3 audit must DELTA-verify the R2 surface against the R1 final semantic SHA `e68ea4a3` per the new authoritative R2 `AUDIT.md` (to be authored by Tier 3 after this commit lands; T1A-authored R2 `AUDIT.md` was deleted in the docs/control correction round per T0 decision that Tier 1 may not author AUDIT.md).

On DELTA PASS, push the docs-freeze + R2 surface together to PR #88, and wait for CI 4/4.

On DELTA FAIL, open a round-3 budget (would require T0 re-authorization). Do not push. Do not merge.

---

*T0_RECONCILIATION_REPORT authored 2026-10-04 ICT by Tier 1A (T1A). The R1 T0_RECONCILIATION_REPORT is preserved byte-equivalent at `docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/T0_RECONCILIATION_REPORT.md`. This revision reflects the T0 docs/control correction decision: Implementation SHA remains `c3fa409a`; the R2 audit-target HEAD is reported in the post-commit handback; the T1A-authored R2 `AUDIT.md` was deleted in this round; Tier 3 authors the new authoritative R2 `AUDIT.md`.*
