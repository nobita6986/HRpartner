# P1-A0.4 — Scoped Recruiter Authority — HANDOFF

**Pipeline V2 — Implementation Handoff (V2_FAST_FREEZE)**

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-p1-a0-4-scoped-recruiter-authority` |
| Spec version | `v1.3` |
| Status | `READY_FOR_AUDIT` |
| Worktree | `C:\CodeApp\HrP-t1c-p1a04-impl` |
| Branch | `codex/t1c-p1a04-scoped-recruiter-authority-impl` |
| Baseline | `f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7` |
| Plan baseline | `c082f689401ea8ced0e0ba2932c240fb17eb0c86` (v1.3 contract adoption) |
| Implementation SHA | `773c94c0a5d7a8e97b55fd39e0aadee96a5951ad` |
| Freeze SHA | `e3187ac` (docs/evidence freeze; final after pin-only docs amend) |
| Delivery protocol | `V2_FAST_FREEZE` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `3` |
| Current audit round | `0` |
| Next gate | `TIER3_LIGHT_AUDIT` |
| Correction batches used | `0` |
| Implementation correction batches used | `0` |
| T0 planning integrity exceptions used | `1` (consumed by v1.2 `I-01..I-08`) |
| Synthetic DB preflight | `PASS` (Neon `ep-empty-forest-*`; PG 18.6) |
| Production DB/migration | `NOT_RUN` |
| Test environment | synthetic-DB (admin BYPASSRLS + writer non-superuser/non-BYPASSRLS), same host/port/database; 54 migrations; schema up to date |

## 1. Outcome and changed surface

**Outcome.** P1-A0.4 v1.3 contract ACCEPTED by T0 and implemented in this worktree on top of `f3a3d1a4`. Forward-only schema migration introduces `StaffingOrderRecruiterAssignment` (additive aggregate). Two SECURITY DEFINER helpers (`hrp_staffing_order_visible_for`, `hrp_project_recruiter_visible_for`) lock `search_path` and revoke/grants EXECUTE to `app_user_writer, app_user`. Narrow PERMISSIVE RLS policies admit assigned HR_STAFF plus OPEN+unassigned claim-queue visibility on `staffing_orders`, `outsourcing_projects`, `staffing_order_slots`, `job_openings`, `job_postings`. Placement dual authority verifies both active `StaffingOrderRecruiterAssignment` and active `LaborProfileHandlingAssignment` in one transaction. Deterministic mutex via `pg_advisory_xact_lock` produces a single claim winner across 2 independent DB connections and a deterministic revoke ordering. All gates PASS.

**Changed files (forward-only).**

- `prisma/schema.prisma` — `StaffingOrderRecruiterAssignment` model + back-relations on `StaffingOrder` and `User`.
- `prisma/migrations/20260928220000_p1a04_scoped_recruiter_authority/migration.sql` — table, audit CHECKs, two partial unique active indexes (on `(staffing_order_id, recruiter_user_id)` AND `(staffing_order_id)`), two SECDEFINER helpers, RLS enable + force on new table, narrow HR_STAFF PERMISSIVE policies on `staffing_orders`, `outsourcing_projects`, `staffing_order_slots`, `job_openings`, `job_postings`, plus static post-migration validation block.
- `src/domains/talent/recruiter-assignment.service.ts` — `assignRecruiterToOrder`, `claimStaffingOrder` (advisory-lock), `revokeRecruiterFromOrder` (advisory-lock), `listUnclaimedStaffingOrders`, `listMyActiveStaffingOrders`, `listOrderRecruiterAssignments`, `assertActiveRecruiterForOrder`.
- `app/api/admin/staffing-orders/[id]/recruiter-assignments/route.ts` — GET preview + POST assign (HR_MANAGER/ADMIN) with UUID v4 Idempotency-Key.
- `app/api/admin/recruiter-assignments/[id]/revoke/route.ts` — POST revoke with Idempotency-Key + non-empty reason.
- `app/api/admin/my-staffing-orders/route.ts` — GET MINE list.
- `app/api/admin/staffing-orders/unclaimed/route.ts` — GET claim queue + POST claim.
- `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` — 20 tests covering AC-E2E-01..AC-E2E-22 incl. two-connection claim race and revoke orderings.
- `vitest.integration-files.ts` — registered new test file.
- `src/domains/security/security-matrix.integration.test.ts` — updated HR_STAFF scope for claimable OPEN+unassigned visibility.
- `src/shared/auth/matrix-scope.test.ts` — updated HR_STAFF counts to reflect legitimate claim-queue visibility.
- `src/shared/security/required-relation-sweep.static.test.ts` — `EXPECTED_HITS` updated (30 `src/`, 33 total).
- `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` — v1.3 contract adoption (preserved from plan baseline `c082f689`).
- `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/HANDOFF.md` — this file.

## 2. Acceptance evidence

Evidence table — every row carries a command and a measured result. The `verify-task.ps1` contract-gate row is first (Tier 3 check C-09 re-runs that gate).

| AC | Evidence summary | Limitation | Outcome |
| --- | --- | --- | --- |
| — | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` | none | `RESULT: DRAFT-VALID` exit 0 |
| AC-01 | `Select-String -Path docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md -Pattern '^## [0-9]+\.'` returns 14 numbered headings; canonical realignment doc present at canonical path | none | 14 lines matched, exit 0 |
| AC-02 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` exits 0 (DRAFT-VALID allowed for DRAFT status); UTF-8 scanner clean | none | `RESULT: DRAFT-VALID` exit 0 |
| AC-03 | `Select-String -Path docs/discovery/realignment/P1A04_*.md -Pattern 'project scope\|buildProjectScope\|StaffingOrder\|StaffingOrderSlot\|JobOpening\|JobPosting\|listEligibleSlotsForNewJobPosting\|LaborProfile\|HandlingAssignment\|PLACEMENT_ROLES\|PlacementCase\|placement'` returns non-empty matches | none | 30+ matches across sections, exit 0 |
| AC-04 | `Select-String -Path docs/discovery/realignment/P1A04_*.md -Pattern 'cannot be adopted\|LaborProfileHandlingAssignment'` returns non-empty matches in section 3 | none | 6 matches, exit 0 |
| AC-05 | `Select-String -Path docs/discovery/realignment/P1A04_*.md -Pattern 'StaffingOrderRecruiterAssignment\|staffing_order_recruiter_assignments\|partial unique\|WHERE revoked_at IS NULL'` returns non-empty matches in section 4 | none | 9 matches, exit 0 |
| AC-06 | `Select-String -Path docs/discovery/realignment/P1A04_*.md -Pattern 'public\.hrp_staffing_order_visible_for\|public\.hrp_project_recruiter_visible_for\|least-authority\|HR_STAFF-only'` returns non-empty matches in section 4.3 | none | 8 matches, exit 0 |
| AC-07 | `Select-String -Path docs/discovery/realignment/P1A04_*.md -Pattern 'race\|revoke\|stale\|oracle'` returns ≥4 distinct matches in section 6 | none | 17 matches, exit 0 |
| AC-08 | `Select-String -Path docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md -Pattern '\| DEC-\|`CHOSEN`'` returns 31 rows | none | 31 rows, exit 0 |
| AC-09 | `Select-String -Path docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md -Pattern 'Build vs adopt\|Build vs automate'` returns expected gate fields | none | 2 rows, exit 0 |
| AC-10 | `Select-String -Path docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md -Pattern 'AC-E2E-'` returns 22 rows in section 6.2 | none | 22 rows, exit 0 |
| AC-11 | `git diff --name-only f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7..HEAD` lists the schema/migration/source/test/docs paths only; no `src/app/**` paths added | none | 15 paths listed, 0 src/app, exit 0 |
| AC-12 | `node .ai-pipeline/scripts/verify-encoding-range.mjs` over both docs files | none | BOM=0 CR=0 NUL=0 U+FFFD=0 C0=0 mojibake=0, exit 0 |
| AC-13 | `git diff --check f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7..HEAD` returns no warnings on planning + impl diff | none | clean, exit 0 |
| AC-14 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` exits 0 | none | `RESULT: DRAFT-VALID` exit 0 |
| AC-15 | `git log -1 --format=%s` reports the v1.3 freeze intent; `git status --short` is empty; no PR/merge/deploy | none | status empty, exit 0 |
| AC-16 | `git diff --name-only f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7..HEAD -- prisma/migrations/` returns the new migration file only; `npx prisma migrate status` reports 54 migrations up to date on synthetic DB | none | 1 added migration, schema up to date, exit 0 |
| AC-17 | `node .ai-pipeline/scripts/verify-encoding-range.mjs --paths docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md,docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` reports BOM=0 CR=0 NUL=0 U+FFFD=0 C0=0 mojibake=0 | none | clean on both files, exit 0 |
| AC-18 | `Select-String -Path prisma/migrations/20260928220000_p1a04_scoped_recruiter_authority/migration.sql -Pattern 'job_openings\.slot_id\|job_postings\.opening_id'` returns 0 matches; `Select-String -Path prisma/migrations/20260928220000_p1a04_scoped_recruiter_authority/migration.sql -Pattern 'job_openings\.staffing_order_id\|job_postings\.job_opening_id\|staffing_order_slots\.staffing_order_id'` returns non-empty matches | none | 0 forbidden + 3 canonical column refs, exit 0 |
| AC-19 | `Select-String -Path prisma/migrations/20260928220000_p1a04_scoped_recruiter_authority/migration.sql -Pattern 'public\.hrp_staffing_order_visible_for\|public\.hrp_project_recruiter_visible_for\|SET search_path = pg_catalog, public\|REVOKE EXECUTE\|GRANT EXECUTE'` returns non-empty matches; static + migration tests assert search_path/grants/owner | none | 12+ matches, exit 0 |
| AC-20 | `Select-String -Path prisma/migrations/20260928220000_p1a04_scoped_recruiter_authority/migration.sql -Pattern 'snapshot\|half-mutated'` returns 0 matches; integration tests cover BOTH lock orderings via TWO independent DB connections | none | 0 forbidden phrases; 2-conn tests pass, exit 0 |
| AC-21 | `git diff --name-only f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7..HEAD` shows no `src/app/**` paths; allowlist rows match T0 I-04 list; new paths marked `(new)` | none | 0 src/app paths, allowlist conformant, exit 0 |
| AC-22 | `git grep -nE '/api/jobs\?slug=\|/api/public/jobs/[^/]+/(apply\|\?slug=)' docs/` returns 0 matches; canonical routes preserved | none | 0 matches, exit 0 |
| AC-23 | `Select-String -Path prisma/migrations/20260928220000_p1a04_scoped_recruiter_authority/migration.sql,src/domains/talent/recruiter-assignment.service.ts -Pattern 'masked'` returns 0 forbidden phrasings; post-claim recruiter-contact fields delivered ONLY to active winning handler | none | 0 forbidden phrases, exit 0 |
| AC-24 | `Select-String -Path docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md -Pattern 'Status .READY_TO_CODE\|Contract gate .READY_TO_CODE\|Contract accepted by T0 .YES\|Assurance lane .CRITICAL\|Audit mode .LIGHT\|Implementation correction budget .1\|Implementation correction batches used .0\|Next gate .TIER1_IMPLEMENTATION_FREEZE\|Open Owner decisions .0'` returns expected v1.3 control rows in section 0 | none | 9 rows matched, exit 0 |
| AC-25 | `node .ai-pipeline/scripts/verify-encoding-range.mjs --paths docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md,docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` clean; `git diff --check f1fff224..HEAD` clean; `verify-task.ps1` returns `RESULT: DRAFT-VALID` | none | BOM=0 CR=0 NUL=0 U+FFFD=0 C0=0 mojibake=0, `git diff --check` clean, `RESULT: DRAFT-VALID` exit 0 |
| AC-26 | `git status --short` after implementation commit is empty; `git log -1 --format=%P` shows predecessor chain preserved | none | status empty; predecessor chain intact, exit 0 |
| AC-27 | `Select-String -Path docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md -Pattern 'DEC-2[0-9]\|DEC-31'` returns 12 rows in section 3 | none | 12 rows, exit 0 |
| AC-28 | `Select-String -Path docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md -Pattern 'conversion\.service\.ts\|placement\.route-helpers\.ts\|withIdempotency\.ts\|session\.ts\|auth-context\.ts\|idempotency\.ts'` returns non-empty matches in section 4.2 (canonical paths) | none | 6 matches, exit 0 |

## 3. Evidence registry

Run-once commands and gate results that the AC rows above cite. Each row is runnable and produces a measured value.

| ID | Command / gate | Measured value |
| --- | --- | --- |
| E-01 | `npx prisma validate` | exit 0 |
| E-02 | `npx prisma migrate status` | 54 migrations, schema up to date |
| E-03 | `npm run typecheck` | exit 0 |
| E-04 | `npm run lint` | 0 errors, 751 warnings |
| E-05 | `npm run test:unit` | 199 files / 3257 passed / 9 skipped |
| E-06 | `npm run build` | Next.js production build PASS |
| E-07 | `git diff --check f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7..HEAD` | clean, exit 0 |
| E-08 | `node .ai-pipeline/scripts/verify-encoding-range.mjs` over changed tree | BOM=0 CR=0 NUL=0 U+FFFD=0 C0=0 mojibake=0 |
| E-09 | `CI_INTEGRATION_STRICT=1 npm run test:integration` | 37 files / 625 passed / 2 skipped |
| E-10 | targeted `npx vitest run --config vitest.integration.config.ts tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` x3 | 20 / 20 / 20 passed |
| E-11 | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` | `RESULT: DRAFT-VALID (2 warnings)` exit 0 |
| E-12 | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` | `RESULT: PASS` exit 0 |
| E-13 | zero-residue query against writer session: `SELECT count(*) FROM staffing_order_recruiter_assignments` (and analogues for `staffing_orders.code LIKE '%SO-P1A04%'`, `outsourcing_projects.code LIKE '%PRJ-P1A04%'`, `users.id LIKE 'p1a04-%'`) | 0 / 0 / 0 / 0 |
| E-14 | SELECT from writer session to verify HR_STAFF visibility: assigned orders / sibling orders / claimable OPEN+unassigned / revoked orders | 1 / 0 / 1 / 0 |
| E-15 | SELECT from admin session to verify partial unique active indexes (`staffing_order_recruiter_assignments_active_unique_idx`, `staffing_order_recruiter_assignments_active_order_unique_idx`) | both present |
| E-16 | SELECT from admin session: SECURITY DEFINER helpers `public.hrp_staffing_order_visible_for`, `public.hrp_project_recruiter_visible_for` exist with `search_path = pg_catalog, public`, owner `neondb_owner`, granted to `app_user_writer, app_user` | confirmed |

## 4. Deviations and blockers

No `BLK-`, `LIM-`, or `DEV-` rows. All planned AC-E2E-01..AC-E2E-22 satisfied without deviation. Implementation correction batches used: `0` (the v1.2 planning integrity exceptions `I-01..I-08` and v1.1 contract correction `C-01..C-12` were consumed in prior rounds and do not count against the implementation budget).

## 5. Final status

- Status: `READY_FOR_AUDIT`
- Assurance lane: `CRITICAL`
- Audit mode: `LIGHT`
- Audit eligibility: `ELIGIBLE`
- Frozen delivery: `YES`
- Delivery protocol: `V2_FAST_FREEZE`
- Canonical gates: `PASS` (prisma validate, migrate status, typecheck, lint 0 errors, unit 3257 pass / 9 skipped, build, integration 625 pass / 2 skipped)
- Targeted test (x3): 20 / 20 passing each run
- Next gate: `TIER3_LIGHT_AUDIT`
- Implementation correction batches used: `0` (truthful actual count)
- Synthetic DB: `PASS`
- Production DB/migration: `NOT_RUN`

Handoff status: READY_FOR_AUDIT
