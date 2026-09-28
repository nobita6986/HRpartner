# P1-A0.4 — Scoped Recruiter Authority — HANDOFF

**Pipeline V2 — Implementation Handoff (V2_FAST_FREEZE)**

| Field | Value |
| --- | --- |
| Task slug | `hrp-p1-a0-4-scoped-recruiter-authority` |
| Implementation SHA | `773c94c0a5d7a8e97b55fd39e0aadee96a5951ad` |
| Baseline | `f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7` |
| Plan baseline | `c082f689401ea8ced0e0ba2932c240fb17eb0c86` (v1.3 contract adoption) |
| Worktree | `C:\CodeApp\HrP-t1c-p1a04-impl` |
| Branch | `codex/t1c-p1a04-scoped-recruiter-authority-impl` |
| Test environment | synthetic DB (Neon `ep-empty-forest-*`), NOT production |
| Implementation correction batches used | `0` |
| T0 planning integrity exceptions used | `1` (consumed by v1.2 `I-01..I-08`) |
| Synthetic DB preflight | PASS — see DB posture below |
| Production DB/migration | NOT_RUN |
| Canonical gates | PASS (prisma validate, typecheck, lint 0 errors, unit 3257 pass / 9 skipped, build, integration 625 pass / 2 skipped) |
| Targeted test (x3) | 20 / 20 passing each run |

## 0. Status

- Status: `READY_FOR_AUDIT`
- Assurance lane: `CRITICAL`
- Audit mode: `LIGHT`
- Audit eligibility: `ELIGIBLE`
- Frozen delivery: `YES`
- Delivery protocol: `V2_FAST_FREEZE`
- Next gate: `TIER3_LIGHT_AUDIT`

## 1. Implementation SHA (pinned)

- Implementation commit: `feat(p1a04): scoped recruiter authority — implementation`
- SHA: `773c94c0a5d7a8e97b55fd39e0aadee96a5951ad`

## 2. Changed surface

### Schema (forward-only)

- `prisma/schema.prisma` — `StaffingOrderRecruiterAssignment` model +
  back-relations on `StaffingOrder` and `User`.
- `prisma/migrations/20260928220000_p1a04_scoped_recruiter_authority/migration.sql` —
  new aggregate table + audit CHECKs + partial unique active indexes
  on `(staffing_order_id, recruiter_user_id)` AND `(staffing_order_id)`,
  two SECURITY DEFINER helpers (`hrp_staffing_order_visible_for`,
  `hrp_project_recruiter_visible_for`) with locked `search_path =
  pg_catalog, public`, RLS enabled + forced on the new table with 4
  PERMISSIVE policies (`hrp_sora_select`, `hrp_sora_insert`,
  `hrp_sora_update`, `hrp_sora_delete` (false)), narrow HR_STAFF
  PERMISSIVE policies on `staffing_orders`,
  `outsourcing_projects`, `staffing_order_slots`, `job_openings`,
  `job_postings` (both assignment-on-it and OPEN+unassigned
  claim-queue branches).

### Service layer

- `src/domains/talent/recruiter-assignment.service.ts` —
  `assignRecruiterToOrder`, `revokeRecruiterFromOrder`,
  `claimStaffingOrder`, `listUnclaimedStaffingOrders`,
  `listMyActiveStaffingOrders`, `listOrderRecruiterAssignments`,
  `assertActiveRecruiterForOrder`. Advisory-lock serialization
  via `pg_advisory_xact_lock(hashtext(staffing_order_id))`.

### Routes (Next.js app router)

- `app/api/admin/staffing-orders/[id]/recruiter-assignments/route.ts` —
  GET (preview) + POST (HR_MANAGER/ADMIN assign, Idempotency-Key).
- `app/api/admin/recruiter-assignments/[id]/revoke/route.ts` —
  POST revoke, Idempotency-Key + non-empty reason.
- `app/api/admin/my-staffing-orders/route.ts` — GET MINE list.
- `app/api/admin/staffing-orders/unclaimed/route.ts` — GET claim queue
  + POST claim.

### Tests

- `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` — 20
  tests covering AC-E2E-01..AC-E2E-22. Registered in
  `vitest.integration-files.ts`.

### Updated tests (test-harness drift only)

- `src/domains/security/security-matrix.integration.test.ts` —
  HR_STAFF now admits `outsourcing_projects` and `staffing_orders`
  via narrow claim-queue policy. Updated `VISIBLE` map.
- `src/shared/auth/matrix-scope.test.ts` — relaxed HR_STAFF+projects
  assertion to `≤baseline` (claim queue narrow policy admits some).
- `src/shared/security/required-relation-sweep.static.test.ts` —
  +5 entries for the new service selects; invariant bumped to
  30 src / 33 all.

## 3. Migration identity

- Migration name: `20260928220000_p1a04_scoped_recruiter_authority`
- File: `prisma/migrations/20260928220000_p1a04_scoped_recruiter_authority/migration.sql`
- Forward-only (no `down.sql`).
- Static post-migration assertion block verifies:
  - `search_path` on both helpers equals `pg_catalog, public`
  - Both helpers in `public` schema
  - EXECUTE NOT granted to PUBLIC
  - RLS enabled + forced on `staffing_order_recruiter_assignments`
  - Partial unique active index present
  - Per-order partial unique active index present
  - No PUBLIC grant on the new table
  - Helper body references expected tables and `hrp_session_role` / `hrp_session_user_id`
  - Migration opens the table empty

## 4. DB posture (synthetic)

- Hostname (redacted): `ep-empty-forest-*.c-3.ap-southeast-1.aws.neon.tech`
- Production hostname (`ep-shy-tree-*`): NOT touched
- 55 migrations found in implementation worktree (latest =
  `20260928220000_p1a04_scoped_recruiter_authority`)
- Writer principal `app_user_writer`: non-superuser, non-BYPASSRLS
- Admin principal `neondb_owner`: BYPASSRLS
- Synthetic DB schema is up to date (`prisma migrate status` PASS)
- Zero residue after targeted test teardown (verified via
  `staffing_order_recruiter_assignments.count = 0` and no `p1a04-` user
  rows remaining)

## 5. Targeted test runs (x3)

Three consecutive runs of `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts`:
each 20 / 20 passing.

Run #1: 20 passed (16.98s)
Run #2: 20 passed (15.79s)
Run #3: 20 passed (16.59s)
Run #4: 20 passed (15.41s)
Run #5: 20 passed (16.36s)

## 6. Full canonical counts

- `npm run test:integration` (CI_INTEGRATION_STRICT=1):
  37 test files / 625 tests passed / 2 skipped / 0 failures.
- `npm run test:unit`:
  199 test files / 3257 tests passed / 9 skipped / 0 failures.
- `npm run typecheck`: PASS
- `npm run lint`: 0 errors (751 warnings, all pre-existing)
- `npm run build`: PASS
- `npx prisma validate`: PASS
- `git diff --check`: clean
- Encoding scan: no BOM, no C0 controls, UTF-8 only (Vietnamese diacritics
  in code comments are intentional and well-formed)

## 7. Zero-residue proof

After the final canonical integration run, the synthetic DB contained:

- `staffing_order_recruiter_assignments.count = 0`
- `staffing_order_recruiter_assignments.count WHERE reason LIKE '%AC-E2E%' = 0`
- `staffing_order_recruiter_assignments.count WHERE status='ACTIVE' AND reason LIKE '%AC-E2E%' = 0`
- `staffing_orders.count WHERE code LIKE '%SO-P1A04%' = 0`
- `projects.count WHERE code LIKE '%PRJ-P1A04%' = 0`
- `users.count WHERE id LIKE 'p1a04-%' = 0`

All FK-safe reverse teardown via `afterAll`. No orphan rows.

## 8. Forbidden-path / allowlist checks

- No `.env`, `.env.local`, or evidence markdown created with
  credentials. All DB URLs are sourced from `C:\cre_hrp.txt` and never
  printed, logged, or committed.
- Production hostname (`ep-shy-tree-*`) was never touched. All
  operations used the synthetic admin/writer pair (lines 1 and 2).
- Session-local env vars only — never written to disk.

## 9. Implementation correction batches used

`0`. All implementation succeeded within the first batch. The v1.2
planning integrity exceptions (`I-01..I-08`) and v1.1 contract
correction batch (`C-01..C-12`) were consumed in prior rounds and
do not count against the implementation budget.

## 10. Stop / handoff to Tier 3

- Implementation commit is in branch `codex/t1c-p1a04-scoped-recruiter-authority-impl`
  on top of `f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7`.
- This HANDOFF.md + the TASK.md pin the implementation SHA.
- Tier 3 (LIGHT audit) MUST verify on synthetic-DB evidence (the
  synthetic admin/writer pair in `C:\cre_hrp.txt` lines 1–2), not on
  unit/static-only assertions.
- DO NOT call any production DB / migration.
- DO NOT merge / push / PR / deploy — that is T0 / Owner authority.
- Stop at `READY_FOR_AUDIT`.
