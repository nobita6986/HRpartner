# F9-B R2 CLOSEOUT — Post-production formal closeout (MỐC_1)

> **TIER-1 CONTROL — post-production docs-only closeout (2026-10-04 ICT, FAST lane, Audit mode NONE, Tier 3 recall NOT_REQUIRED)**.
> This document is the formal closeout for the F9/F9-B delivery. It captures the merge, audit adoption, production migration, production deployment, production backup, production verification, and remaining-debt evidence. It is intentionally docs-only: the diff is exactly three files in `docs/tasks/hrp-f9b-r2-slot-scope-read-restore/` (`TASK.md`, `HANDOFF.md`, this `CLOSEOUT.md`); no source, test, schema, migration, package, lockfile, or deploy-config delta. AUDIT.md, RUN_TIME_REPRODUCTION.md, and T0_RECONCILIATION_REPORT.md remain byte-unchanged on `main`.

## 1. Identity (corrected per C-01)

| Field | Value |
| --- | --- |
| Current `origin/main` HEAD | `09d68a67fe9ab3b30c09e77eea65f042519365e1` (PR #88 merge commit) |
| **Pre-merge main/base (authoritative)** | `6015361bb986b920bad6a90f8f9986165a4a99d5` |
| `14712f15…` (stale local checkout HEAD) | **NOT** the pre-merge main SHA; intentionally referenced only as a stale local branch state |
| PR #88 head | `dc088842fa55f0bb61b2d086ee82c24a0ead390c` |
| Merge commit parents | `6015361b…` (pre-merge base) **+** `dc088842…` (PR #88 head) |
| R2 semantic Implementation SHA (pinned unchanged) | `c3fa409ada5295cfbbe2a57ebd2ef9eddeb7aae3` |
| Tier-3 LIGHT audit adoption SHA | `d777cf71d0abee81a39e093d562343e52da49d0c` |
| Tier-3 DELTA audit adoption SHA | `dc088842fa55f0bb61b2d086ee82c24a0ead390c` |
| PR | https://github.com/nobita6986/HRpartner/pull/88 |
| Production public origin | https://vieclammienbac.com.vn |
| Running production image (before this docs-only closeout) | `ghcr.io/nobita6986/hrpartner:09d68a67fe9ab3b30c09e77eea65f042519365e1` |
| Running image digest | `sha256:91044236443ae3329875089ec5fe3e00fa16abc8d6148b71b1aa8880187a3f47` |

`git show -s --format='%H %P' 09d68a67…` confirms the merge commit has exactly two parents: `6015361bb986b920bad6a90f8f9986165a4a99d5` and `dc088842fa55f0bb61b2d086ee82c24a0ead390c`. `14712f15a5bc58d406fac784adb174c76d823d33` is only the HEAD of the local `codex/t1c-maintainability-reference` branch and MUST NOT be described as the pre-merge main SHA.

## 2. Disposition

**F9/F9-B = CLOSED; MỐC_1 = COMPLETE.** PR #88 merged into `main` at `09d68a67…`; 4 F9/F9-B migrations applied to production; production image `09d68a67…` deployed; production read-only verification PASS on every T0 requirement; public endpoints (`/`, `/login`, `/viec-lam`, JobPosting detail) return HTTP 200; `hrp-app` healthy; production backups retained. Tier 3 LIGHT + DELTA audit PASS adopted at SHA `dc088842`. After `MỐC_1_COMPLETE`, UI V1, UI2 and Mốc 2 are unlocked for parallel assignment to T1A/T1B/T1C.

This closeout is **docs-only forward-only** on a fresh clean worktree `C:\CodeApp\HrP-worktrees\t1a-f9b-r2-production-closeout` from exact `origin/main @ 09d68a67…` on branch `codex/t1a-f9b-r2-production-closeout`. Three-file allowlist only: `TASK.md`, `HANDOFF.md`, `CLOSEOUT.md`. AUDIT.md, RUN_TIME_REPRODUCTION.md, T0_RECONCILIATION_REPORT.md are **byte-unchanged** on `main`.

## 3. Predecessor chain (R2 forward-only lineage on `main`)

```
d777cf71  docs(F9-B): adopt Tier 3 LIGHT audit PASS              ← R1 final (Tier-3 LIGHT verdict adopted)
└─ c3fa409a  feat(F9-B R2): restore canonical slot SELECT scope   ← R2 semantic (pinned across R2 chain)
   └─ 1c90860c  docs/evidence freeze — runtime reproduction PASS  ← R2 docs/evidence freeze
      └─ 3f8b42cf  T0 docs/control correction #1                   ← R2 docs/control #1
         └─ f7e4032e  terminal control sync (READY_FOR_AUDIT)      ← R2 docs/control #2
            └─ dc088842  adopt Tier 3 DELTA audit PASS             ← R2 audit adoption (Tier-3 DELTA verdict adopted)
               └─ 09d68a67  Merge pull request #88                 ← merge commit on main (PR #88 → main)
```

The closeout commit on `codex/t1a-f9b-r2-production-closeout` is forward-only on top of `09d68a67…` with **zero semantic delta**. No amend / reset / rebase / force-push on `1b9bbd9f..HEAD`. The branch is single-purpose and retires after merge.

## 4. PR #88 — neutral merge description (corrected per C-06)

PR #88 was merged into `main` at `09d68a67…` through the authorized T0/Owner merge operation using the repository's merge strategy (`--merge`). The merge strategy produces a true merge commit with two parents (`6015361b…` + `dc088842…`); the merge SHA is `09d68a67…`. **No squash, no rebase, no force-push occurred.** Branch `codex/t1a-f9b-jobposting-write-boundary-hardening` is preserved at the merge-source SHA `dc088842…`.

Pre-merge CI on PR #88 (`run 37149565595`): Quality + Integration + Vercel + Vercel Preview Comments all `pass` (4/4 GREEN).
Post-merge CI on `main` (`run 37150107246`): Quality + Integration `pass`.

## 5. Production migration — corrected per C-02

| Migration | Status | Notes |
| --- | --- | --- |
| `20261003000000_f9_hr_staff_posting_write_rls` | APPLIED | F9 narrow HR_STAFF UPDATE policy |
| `20261003000001_f9_hr_staff_posting_insert_rls` | APPLIED | F9 narrow HR_STAFF INSERT policy |
| `20261003100000_f9b_slot_opening_binding_primitive` | APPLIED | F9-B R1 corrective (SECURITY DEFINER primitive) |
| `20261004000000_f9b_r2_slot_scope_read_restore` | APPLIED | F9-B R2 corrective (new `hrp_f9b_slots_project_select` SELECT policy) |

All four F9/F9-B migrations applied via the existing `/opt/hrp/migrate-production.sh` sudo-wrapped wrapper (admin URL loaded from `/etc/hrp/secrets/migration.env`, flock-protected). Post-deploy `prisma migrate status`: `Database schema is up to date!`.

**Migration counts (corrected per C-02):**

- Repository migration directories observed by Prisma: **62** (`62 migrations found in prisma/migrations` per auto-deploy workflow log).
- Production `_prisma_migrations` applied rows after cutover: **67** (per `prisma migrate status` `Database schema is up to date!` reading on the production DB).
- The **5-row difference** (67 − 62) reflects the previously documented historical hotfix migrations; this is not a discrepancy and not a creation of unexpected schema paths.
- The **four pending F9/F9-B migrations** matched the expected set exactly (no unknown migration, no bypass).
- `prisma migrate status` reports `Database schema is up to date!`.

The auto-deploy workflow's `hrp-check-migrations` step **fail-closed** correctly on the 4 pending migrations (`run 37150309437`): the image was NOT swapped automatically; the cutover proceeded via the T0-authorized migration + deploy sequence.

## 6. Production deployment

| Field | Value |
| --- | --- |
| Image tag | `ghcr.io/nobita6986/hrpartner:09d68a67fe9ab3b30c09e77eea65f042519365e1` (built from exact merge SHA) |
| Image digest | `sha256:91044236443ae3329875089ec5fe3e00fa16abc8d6148b71b1aa8880187a3f47` |
| Release env | `/opt/hrp/.release.env` ⇒ `HRP_IMAGE=ghcr.io/nobita6986/hrpartner@sha256:91044236443ae3329875089ec5fe3e00fa16abc8d6148b71b1aa8880187a3f47` |
| Deploy wrapper | existing `/opt/hrp/deploy-production.sh` (atomic release-env write + `docker compose up -d --wait`) |
| Smoke test | login + viec-lam PASSED |
| Auto-rollback | NOT triggered (smoke passed; release env stable) |
| Post-deploy container posture | `hrp-app` healthy (started 2026-10-03T20:13:48Z); `hrp-redis` Up 28h (healthy); `hrp-rate-limit` Up 28h (healthy) |
| Running image matches merge SHA digest | YES (`docker inspect hrp-app --format '{{.Config.Image}}'` = `ghcr.io/nobita6986/hrpartner@sha256:91044236443ae3329875089ec5fe3e00fa16abc8d6148b71b1aa8880187a3f47`) |

## 7. Production backup

Pre-migrate backup retained at `/srv/hrp/backups/hrp-pre-migrate-20261003T201150Z.dump`:

```
size=520559
sha256=4095a6744dc1f6a599ff5bcb8f9272aac49699bfaa16f30e249eef82a437fddc
verify=PASS  pg_restore_list_count=779  TOC 769
```

Independent `pg_restore --list` re-verified (779 entries, TOC 769). `/srv/hrp/backups/hrp-before-migrate-20261003T201256Z.dump` was created automatically by `/opt/hrp/migrate-production.sh` right before applying migrations. `/srv/hrp/backups/MANIFEST.log` records:

```
20261003T201205Z backup-created-by=tier1 pre-migrate
  release_sha=6015361bb986b920bad6a90f8f9986165a4a99d5 (pre-migrate running image)
  image_digest=sha256:eeb9ca01b8d8298e8a32492de4de93c25aab04838071c4c7dba36695ad5c7218
  image_short=eeb9ca01b8d8
  file=hrp-pre-migrate-20261003T201150Z.dump
  size=520559
  sha256=4095a6744dc1f6a599ff5bcb8f9272aac49699bfaa16f30e249eef82a437fddc
  verify=PASS  pg_restore_list_count=779
  target_release=09d68a67fe9ab3b30c09e77eea65f042519365e1
```

Backups are retained in `/srv/hrp/backups/` along with prior dumps; the oldest is from 20261002 and the newest is the pre-migrate 20261003T201150Z snapshot above.

## 8. Production read-only verification (corrected per C-03, C-04, C-05)

| T0 requirement | Evidence | Status |
| --- | --- | --- |
| Migration status up-to-date | `prisma migrate status`: `Database schema is up to date!` (production `_prisma_migrations` row count = 67) | PASS |
| R2 SELECT policy exists | `pg_policies` shows `staffing_order_slots \| hrp_f9b_slots_project_select \| SELECT` (using canonical `hrp_project_visible_for(so.project_id)`) | PASS |
| Old manager SELECT absent | `pg_policies` count for `hrp_f9b_slots_manager_select` = **0** | PASS |
| Broad HR_STAFF UPDATE absent | `pg_policies` count for `hrp_f9_slots_staff_update` = **0** | PASS |
| Broad HR_STAFF UPDATE absent on `staffing_order_slots` | no broad UPDATE policy on `staffing_order_slots` | PASS |
| HR_STAFF DELETE absent | `pg_policies` count for any HR_STAFF DELETE on `staffing_order_slots` = **0** (RESTRICTIVE `hrp_staffing_order_slots_no_delete USING (false)` preserved) | PASS |
| F9 narrow INSERT preserved (hardening) | `pg_policies` count for `hrp_f9_openings_staff_insert` = **1** (with cross-order sub-select) | PASS |
| PUBLIC has no EXECUTE on F9-B primitive | `information_schema.routine_privileges` for `hrp_f9b_bind_slot_to_opening`: only `app_user`, `app_user_writer`, `neondb_owner` (no `PUBLIC`) | PASS |
| `hrp_f9b_bind_slot_to_opening` posture | `pg_proc.prosecdef = t`; `pg_proc.proconfig = {"search_path=pg_catalog, public"}` | PASS |
| `hrp-app` container | `running, healthy, started 2026-10-03T20:13:48.438575833Z` | PASS |
| Running image matches merge SHA digest | `docker inspect hrp-app --format '{{.Config.Image}}'` = `ghcr.io/nobita6986/hrpartner@sha256:91044236443ae3329875089ec5fe3e00fa16abc8d6148b71b1aa8880187a3f47` (= merge SHA `09d68a67…` immutable digest) | PASS |
| Production backups preserved | `/srv/hrp/backups/` retains 4 dumps + MANIFEST.log (oldest 20261002, newest pre-migrate 20261003T201150Z) | PASS |

**C-03 — HR_STAFF production evidence (corrected).** No destructive production write E2E was run. Production catalog/security-posture verification PASS. Broad HR_STAFF UPDATE/DELETE policies absent. Old manager SELECT policy absent. R2 canonical SELECT policy present. SECURITY DEFINER function `hrp_f9b_bind_slot_to_opening` has pinned `search_path`. PUBLIC has no EXECUTE on the primitive. Runtime authorization behavior is supported by the synthetic ×3 evidence in HANDOFF §3.2 (31/31 ×3 PASS) and Tier 3 DELTA PASS at SHA `dc088842`. **No synthetic production fixture was created** — `ep-shy-tree-*` (production host prefix) was dialed only through the existing `/opt/hrp/migrate-production.sh` sudo-wrapped wrapper, never through the synthetic test harness.

**C-04 — admin demand tree (corrected).** `GET /admin` → **307** is the authentication redirect — it proves the canonical auth gating is functioning. It does **not** independently prove the authenticated demand-tree UI. Production auth-redirect smoke PASS. The demand-tree regression is covered by the targeted 62/62 test bundle (HANDOFF §3.3) and PR/main CI (Quality + Integration + Vercel + Vercel Preview Comments 4/4 GREEN on PR #88 `run 37149565595` and post-merge `run 37150107246`).

**C-05 — residue (corrected).** No production fixture was created (see C-03); therefore fixture-row teardown is `NOT_APPLICABLE`. The table-name query (used in HANDOFF §1.4 + this CLOSEOUT §8) is an auxiliary schema-only check (`information_schema.tables WHERE table_name ~* '(^|_)fixture$|test$|seed|residue|sandbox|temp_'` returns 0 matches). It is **not** a row-residue proof.

## 9. Production smoke (HTTP, public domain)

| URL | Status | Bytes | Notes |
| --- | --- | --- | --- |
| `https://vieclammienbac.com.vn/` | 200 | — | Landing page |
| `https://vieclammienbac.com.vn/login` | 200 | — | Public login form |
| `https://vieclammienbac.com.vn/viec-lam` | 200 | 46623 | Public marketplace; 1 job listed |
| `https://vieclammienbac.com.vn/viec-lam/tho-dien-0-08d57fb2` | 200 | 57117 | Public JobPosting detail (Thợ điện · KCN Yên Phong, Bắc Ninh, 2 chỗ trống) |
| `https://vieclammienbac.com.vn/viec-lam/tho-dien-0-08d57fb2#ung-tuyen` | 200 | — | Public apply form (apply markers found) |
| `https://vieclammienbac.com.vn/admin` | 307 | — | Auth redirect (functional; see C-04) |

## 10. Audit adoption (carry-over from R2 AUDIT.md)

- Tier-3-authored R2 AUDIT.md is byte-equivalent between working tree, staged index, and HEAD on `main`.
- AUDIT.md is **NOT** modified by this docs-only closeout (T1A does not author `AUDIT.md`).
- `verify-audit.ps1`: PASS (per Tier-3 adoption chain).
- Semantic diff `c3fa409a..HEAD -- app src prisma tests scripts packages` = **0 lines** (zero R2 semantic delta beyond the R2 commit itself).
- `git diff 09d68a67..HEAD -- app src prisma tests scripts scripts packages package.json pnpm-lock.yaml pnpm-workspace.yaml` = **0 lines** (this docs-only closeout introduces no source/test/schema/migration/deploy-config delta).

## 11. Remaining debt — AFF-03 (preserved per C-07)

- `aff03 AC-06` failure (in `tests/db/aff03-public-intake.integration.test.ts > AFF-05A-R1 > AC-06 (backfill R1)`) is classified as **`PRE_EXISTING_NON_REGRESSION`** for the F9-B R2 delta only (see HANDOFF §3.4 cross-check; identical failure signature on `c3fa409a` and `e68ea4a3`; R2 surface has zero mechanism to alter AC-06 path which reads `labor_profile_handling_assignments`).
- **AFF-03 is NOT closed by this delivery.** AFF-03 is a separate future work item.
- AFF-03 must NOT be described as resolved in any downstream artifact.
- The CI on PR #88 was 4/4 GREEN (Quality + Integration + Vercel + Vercel Preview Comments).

## 12. Boundary preserved

- T1A did NOT author or edit `AUDIT.md`, `RUN_TIME_REPRODUCTION.md`, or `T0_RECONCILIATION_REPORT.md`. They remain byte-equivalent on `main`.
- T1A did NOT call `git push --force`, `git commit --amend`, `git rebase`, `git reset --hard` against the F9/F9-B chain (`1b9bbd9f..HEAD`).
- T1A did NOT modify any source/test/schema/migration/deploy-config file in this docs-only closeout. The diff is exactly the three allowed docs.
- No production fixture was created; no synthetic production residue teardown needed (`NOT_APPLICABLE`).
- Production-side remediation authority (release env rotation, observation window decisions, retention policy, F9-B R3 R3 ticket if needed) belongs to T0.
- UI V1 was unlocked by T0 closeout 2026-10-04 08:25 ICT (`MỐC_1_COMPLETE`).
- The pre-cutover running images (`eeb9ca01…`, `6015361b…`, etc.) are preserved in `docker images` history; `deploy-production.sh`'s 168h auto-prune remains the only retention policy.
- The local main checkout (`C:\CodeApp\HrP`) HEAD remains at `14712f15a5bc58d406fac784adb174c76d823d33` — the stale local `codex/t1c-maintainability-reference` branch. It does **not** match `origin/main = 09d68a67…` and is used only as a read-only witness; production deploys read from `origin/main`. **This is intentional and does not affect production.**

## 13. Handback

| Field | Value |
| --- | --- |
| Handback | `MỐC_1_COMPLETE` |
| Production deployment status | `DEPLOYED_AND_VERIFIED` |
| Auto-rollback triggered? | `NO` (smoke test passed; release env stable) |
| Open production migration issue | `NONE` |
| Pending T0 decisions for next phase | UI V1 / UI2 / Mốc 2 / Mốc 3+ / P2 assignment (all unlocked, none in this delivery) |
| F9/F9-B budget | R1 1/1 exhausted; R2 1/1 exhausted (this docs-only closeout does NOT consume an additional budget) |
| AFF-03 closure | Separate ticket; NOT in this delivery; `PRE_EXISTING_NON_REGRESSION` for F9-B R2 delta only |

## 14. Out of delivery (declared)

- Untracked artifact `.ai-pipeline/scripts/verify-encoding.ps1`: declared out-of-delivery, NOT staged, NOT modified, NOT deleted.
- The three closeout docs are the only files in the diff: `docs/tasks/hrp-f9b-r2-slot-scope-read-restore/{TASK.md,HANDOFF.md,CLOSEOUT.md}`. AUDIT.md, RUN_TIME_REPRODUCTION.md, T0_RECONCILIATION_REPORT.md are unchanged on `main`.

## 15. Next coordination boundary

- T0 may now authorise UI V1 unlock / production user-facing announcement.
- T0 may now authorise closure of the pre-cutover image retention policy once F9-B R2 has been observed healthy in production for the standard observation window.
- AFF-03 (`aff03 AC-06`) is a separate ticket. The Tier-3 DELTA PASS verdict at SHA `dc088842` for the F9-B R2 delta does NOT close AFF-03.
- A separate F9-B R3 ticket may be opened if any further HR_STAFF write boundary findings appear during the observation window.
- The branch `codex/t1a-f9b-r2-production-closeout` may be retired by Tier 0 once this PR merges into `main`.
- UI V1, UI2 and Mốc 2 are unlocked for parallel assignment to T1A/T1B/T1C.