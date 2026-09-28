# P1-A0.4 â€” Scoped Recruiter Authority â€” Reconciliation

**Pipeline V2 â€” Discovery / Realignment**

| Field | Value |
| --- | --- |
| Doc type | `discovery/realignment` |
| Spec version | `v1.1` (T0 correction `C-01..C-12` closed on top of v1.0) |
| Status | `READY_TO_CODE` (planning + correction batch closed; Tier 1 may start implementation on a separate worktree + separate baseline pinned to `f3a3d1a4`) |
| Delivery protocol | `V2_FAST_FREEZE` |
| Assurance lane | `CRITICAL` |
| Audit mode (TASK) | `LIGHT` |
| Baseline | `origin/main @ f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7` (planning branch pin; predecessor planning SHA `5bb7581a11312c5111f51e0ec84534b4ac9b4a97` preserved) |
| Worktree (planning) | `C:\CodeApp\HrP-t1c-p1a04` |
| Branch (planning) | `codex/t1c-p1a04-scoped-recruiter-authority` |
| Owner of this doc | T1C (Tier 1) |
| Contract gate | `READY_TO_CODE` (V2 enum; T0 acceptance of the planning contract text is recorded as the semantic field `Contract accepted by T0: YES` â€” the V2 gate enum does not contain a literal `ACCEPTED` value, so the canonical mapping is `READY_TO_CODE` once T0 has closed the correction batch) |
| Contract accepted by T0 | `YES` (v1.1 correction `C-01..C-12`; verdict `CHANGES_REQUIRED` is fully closed; one forward-only docs-only correction commit on top of predecessor `5bb7581a`) |
| Decision state | `CLOSED` |
| Correction budget | `1` |
| Correction batches used | `1` (the v1.1 correction batch `C-01..C-12`; no further correction budget remains for the planning round) |
| Open Owner decisions | `0` |
| Next gate | `TIER1_IMPLEMENTATION_FREEZE` (implementation round opens in a separate worktree on a separate baseline pinned to `f3a3d1a4`; no Tier 3 call from this round) |

## 0. Purpose & scope

This document reconciles the **current state** of how the `HR_STAFF` role
("ChuyÃªn viÃªn tuyá»ƒn dá»¥ng" / operational recruiter) is treated across the
canonical recruitment surface of HRP, and lays out the **additive shape** of a
new scoped recruiter authority model that:

- scopes `HR_STAFF` visibility to a `StaffingOrder` via an explicit,
  auditable assignment aggregate;
- never grants `HR_STAFF` global project visibility through the root branch of
  `hrp_project_visible_for` / `hrp_project_writable`;
- preserves fail-closed + information-oracle prevention for unassigned
  recruiters;
- reuses the existing `AuthContext`, `withDbContext`, permission resolver,
  `DataTable`/form primitives, idempotency helper and the canonical
  assignment-pattern precedent (`LaborProfileHandlingAssignment`).

This is a **docs-only planning round**. The accompanying contract is
`docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`. No source,
schema, migration, package or test changes are introduced in this round.

### 0.1 Canonical recruitment flow (from Owner)

```
Client demand
  â†’ StaffingOrder / StaffingOrderSlot
  â†’ JobOpening (1:1 to slot â€” V6 P1 split)
  â†’ JobPosting (1:1 to opening â€” public-facing)
  â†’ CandidateSubmission (public apply) â†’ CandidateIntake
  â†’ LaborProfile (canonical identity)
  â†’ PlacementCase (case lifecycle)
  â†’ Placement (SELECTED â†’ CONFIRMED â†’ EFFECTIVE/FAILED/CANCELLED)
  â†’ outsourced worker assignment at the client
```

`HR_STAFF` is the **operational recruiter** that moves demand through this
flow. They are not internal payroll staff, not `WORKER`, not `EMPLOYEE`, not
`PM`, not `SALE`.

### 0.2 Out of scope (already covered or explicitly excluded)

- `LaborProfile` handling / `LaborProfileHandlingAssignment` â€” that aggregate
  is keyed to a LaborProfile, not to a StaffingOrder. It is **not** safe to
  adopt as a fake StaffingOrder assignment (see Â§3).
- Internal attendance/payroll/leave modules â€” these do not define the
  authorization model for this task. Attendance/timesheet is relevant only
  where it concerns outsourced labor delivered to a client (i.e. downstream of
  Placement).
- n8n workflows / direct n8n DB access / PII export â€” explicitly forbidden
  by Owner.
- `PM` and `SALE` authority expansion â€” explicitly excluded by Owner.
- Production migration â€” the production migration gate is **owned by T0**
  and is **not** run from this branch in any round.

## 1. Capability matrix â€” current treatment of HR_STAFF

PhÃ¢n loáº¡i sá»­ dá»¥ng cÃ¡c tag:

- `IMPLEMENTED` â€” code Ä‘Ã£ á»Ÿ trÃªn `origin/main`, khÃ´ng cáº§n sá»­a.
- `PARTIAL` â€” code má»™t pháº§n á»Ÿ main, cÃ²n láº¡i pháº£i bá»• sung trong task má»›i.
- `MISSING` â€” chÆ°a cÃ³ trÃªn main, cáº§n task má»›i.
- `REFERENCE_ONLY` â€” chá»‰ lÃ  tÃ i liá»‡u/decision log.
- `OUT_OF_SCOPE` â€” thuá»™c task khÃ¡c.

### 1.1 Project / L1 scope

| Capability | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| `buildProjectScope` returns `{ id: '__IMPOSSIBLE__' }` for unknown roles, `{}` (no constraint) for ADMIN/HR_MANAGER/DIRECTOR/SALE, PM by pmUserId, WORKER by self+public, MKT by public, VENDOR_ADMIN/VENDOR_STAFF by self/public, CTV by public | `IMPLEMENTED` | `src/shared/auth/scopes/project.scope.ts:10` | HR_STAFF branch at lines 64-67 currently returns `{}` â€” **same as root branches** with a comment "Phase 3 sáº½ narrow". |
| HR_STAFF + HR_MANAGER + ACCOUNTANT are listed in the same fallback that returns `{}` | `PARTIAL` | `src/shared/auth/scopes/project.scope.ts:64-72` | This is a **deliberate Phase-2 placeholder**, not a security boundary. RLS is the floor. |
| L2 RLS via `hrp_project_visible_for` rejects HR_STAFF (`hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','SALE')` â€¦ â€” HR_STAFF absent) | `IMPLEMENTED` | `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql:6-13` | At the SQL layer, `HR_STAFF Ã— projects â†’ 0`. The matrix test (`src/shared/auth/matrix-scope.test.ts:119-123`) explicitly asserts this. |
| `hrp_project_writable` is restricted to root + SALE | `IMPLEMENTED` | `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql:14` | HR_STAFF cannot write projects at the DB level. |

**Observation.** The L1 app-scope layer says HR_STAFF may read all projects;
the L2 RLS layer says HR_STAFF sees zero projects. The current behavior is
correct **only as long as RLS is on and FORCE**. Any future migration that
narrowing/relaxing RLS, or any test/dev path that bypasses `withDbContext`,
suddenly grants HR_STAFF global project visibility. The footgun is real.

### 1.2 StaffingOrder / StaffingOrderSlot L1 scope

| Capability | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| `buildStaffingOrderScope` for HR_STAFF returns `{}` (same as root) | `PARTIAL` | `src/shared/auth/scopes/staffing.scope.ts:25-27` | HR_STAFF currently sees **all** StaffingOrders at the L1 layer. |
| `buildStaffingOrderSlotScope` for HR_STAFF returns `{}` | `PARTIAL` | `src/shared/auth/scopes/staffing.scope.ts:56-58` | HR_STAFF currently sees **all** slots at the L1 layer. |
| L2 RLS on `staffing_orders` uses `hrp_project_visible_for(project_id)` â€” HR_STAFF rejected | `IMPLEMENTED` | `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql:35-39` | Same footgun as Project â€” currently zero visibility at DB, but no L1 safety net. |
| `updateStaffingOrderStatus` allows `['ADMIN', 'HR_MANAGER', 'SALE']` only (HR_STAFF denied) | `IMPLEMENTED` | `src/domains/staffing/order.service.ts:204-209` | HR_STAFF cannot change order status. This is one of the few hard app-layer checks. |

### 1.3 JobOpening / JobPosting L1 scope

| Capability | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| No `buildJobOpeningScope` / `buildJobPostingScope` exists in `SCOPE_REGISTRY` | `MISSING` | `src/shared/auth/scopes/index.ts` (no entry for these models) | L1 throws `DENY_BY_DEFAULT` for non-root on JobOpening/JobPosting. |
| L2 RLS on `job_openings` and `job_postings` uses `hrp_project_visible_for(project_id)` â€” HR_STAFF rejected | `IMPLEMENTED` | `prisma/migrations/20260908001_job_opening_posting_split/migration.sql:74-126` | Same footgun: HR_STAFF sees zero JobOpenings/JobPostings at DB, but no L1 safety net. |
| `listJobPostingsForAdmin` and `getJobPostingForAdmin` **do not take `AuthContext`** | `PARTIAL` | `src/domains/staffing/job-posting-list.service.ts:110, 183` | They rely on `withDbContext` GUC + L2 RLS only. There is no app-layer narrowing for HR_STAFF. |
| `POST /api/admin/jobs/job-postings` create-route | `PARTIAL` (current) | `app/api/admin/jobs/job-postings/route.ts` | Already CRITICAL lane + audit-adopted in P1-A0.3 (`f3a3d1a4`). Role guard for create is HR_MANAGER today (per OQ-01 evidence in P1-A0.3 task); HR_STAFF was the failing case under investigation. |

### 1.4 Application / LaborProfile handling

| Capability | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| `LaborProfileHandlingAssignment` (Userâ†”LaborProfile) is the canonical recruiter-style aggregate | `IMPLEMENTED` | `prisma/schema.prisma:1766`; migration `20260918000000_aff05a_labor_profile_handling_assignment` | Different aggregate â€” keyed to `laborProfileId`. Cannot be safely adopted for StaffingOrder authority (see Â§3). |
| `managerAssign` rejects non-HR_STAFF/non-HR_MANAGER as assignee | `IMPLEMENTED` | `src/domains/talent/handling-assignment.service.ts:116-118` | HR_STAFF and HR_MANAGER are valid assignee roles for LaborProfile. |
| Active duplicate assignment for LaborProfile is prevented by app-layer (close-active-then-insert) | `IMPLEMENTED` | `src/domains/talent/handling-assignment.service.ts:38-49` | No DB partial unique on `labor_profile_handling_assignments` for active rows â€” relies on app layer + tx semantics. |
| `app/admin/labor-profiles/page.tsx` allows `['ADMIN', 'HR_MANAGER', 'HR_STAFF']` | `IMPLEMENTED` | `app/admin/labor-profiles/page.tsx:16` | UI-level allowlist only â€” does not check any per-LaborProfile assignment. Page is a global list of all LaborProfiles; HR_STAFF today can read all LaborProfiles because there is no per-row assignment scope enforced at L1 for LaborProfile listing (only the detail read service masks sensitive fields by permission). |

### 1.5 Recruiter workbench (P1-E0 / P1-E1)

| Capability | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| `view=MINE` filter scopes workbench rows to `assigneeUserId = ctx.userId` (via active `LaborProfileHandlingAssignment`) | `IMPLEMENTED` | `docs/discovery/realignment/P1CD_P1E_RECRUITER_WORKBENCH_RECONCILIATION.md` Â§3 R-D5; P1-E0 TASK Â§5 | Recruiter-style scoping is already established **at the LaborProfile level** via handling-assignment. The new task introduces the **StaffingOrder-level** analogue. |
| `view=ALL` requires `CAN_VIEW_UNASSIGNED_POOL` (or being root/HR_MANAGER) | `IMPLEMENTED` | P1-E0 TASK Â§5 | Existing model uses a permission-code gate at the read service. The new task may use the same pattern. |

### 1.6 PlacementCase / Placement

| Capability | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| `PLACEMENT_ROLES = ['ADMIN', 'HR_MANAGER']` â€” HR_STAFF is denied at preview/activate | `IMPLEMENTED` | `src/domains/staffing/assignment-placement.service.ts:47, 290-294` | Hard app-layer denial. HR_STAFF cannot operate Placement commands today. |
| `PlacementCase` has no `assigneeUserId` field | `IMPLEMENTED` | `prisma/schema.prisma` (PlacementCase model) | Active handler is derived from `LaborProfileHandlingAssignment`, not stored on the case. |
| `openPlacementCase` is idempotent + race-safe via `withIdempotency` + SAVEPOINT | `IMPLEMENTED` | `src/domains/talent/placement-case.service.ts:55-81, 111-150` | The canonical helper pattern to reuse for assignment-side commands. |

### 1.7 Permission catalog â€” HR_STAFF base grants

| Permission | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| `CAN_CREATE_WORKER` | `IMPLEMENTED` | `prisma/seed.mjs:549` | HR_STAFF can create a worker profile. |
| `CAN_PROCESS_TICKET` | `IMPLEMENTED` | `prisma/seed.mjs:550` | HR_STAFF can cancel/pay/reject tickets. |
| `CAN_MANAGE_MEDIA` | `IMPLEMENTED` | `prisma/seed.mjs:551` | HR_STAFF can manage the media library. |
| `CAN_PUBLISH_JOB` (and similar job-publish permission) | `MISSING` | `prisma/seed.mjs` does not grant this to HR_STAFF | Under the new scoped model, HR_STAFF assigned to an order MAY publish JobPostings for that order's eligible slots â€” this requires a new scoped permission (e.g. `CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS`) granted to HR_STAFF. |

## 2. L1/L2 inconsistency summary (for HR_STAFF today)

| Surface | L1 app-scope (Prisma extension / `buildXxxScope`) | L2 RLS (`hrp_*_visible_for`) | Effective today | Risk if RLS is bypassed |
| --- | --- | --- | --- | --- |
| Project | `{}` (full) | `false` for HR_STAFF | zero visibility | global visibility |
| StaffingOrder | `{}` (full) | `false` (via project_id) | zero visibility | global visibility |
| StaffingOrderSlot | `{}` (full) | inherits from parent order | zero visibility | global visibility |
| JobOpening | no builder â†’ `DENY_BY_DEFAULT` | `false` (via project_id) | zero visibility | unchanged (L1 throws) |
| JobPosting | no builder â†’ `DENY_BY_DEFAULT` | `false` (via project_id) | zero visibility | unchanged (L1 throws) |
| CandidateSubmission | per-route L1 narrowing | unknown (separate task) | per-route behavior | route-specific |
| LaborProfile list | none (no L1 builder) | per-LaborProfile assignment on workers side | reads all but PII mask | reads all PII (masked) |
| PlacementCase | per-handler derivation in workbench | none | read-via-workbench only | reads all on direct read |
| Placement | `PLACEMENT_ROLES` app check | (FORCE RLS on assignments) | hard denial | unchanged |

**Conclusion.** The current behavior is "correct by RLS floor". The L1 layer
is **not** a defense in depth for HR_STAFF â€” it is a permissive no-op that
becomes a leak the moment any RLS policy is relaxed or any code path skips
`withDbContext`.

## 3. Existing User â†” StaffingOrder assignment candidates

A key question raised by the directive: **can any existing aggregate be
adopted as a `User â†” StaffingOrder` recruiter assignment?** Surveyed:

### 3.1 `LaborProfileHandlingAssignment` (`prisma/schema.prisma:1766`)

| Field | Value |
| --- | --- |
| Aggregate key | `(laborProfileId, assigneeUserId, status='ACTIVE')` |
| Lifecycle | `AFF_INITIAL` / `MANAGER_ASSIGNMENT` / `CASE_RESOLUTION` â†’ `ACTIVE`/`COMPLETED`/`EXPIRED`/`TRANSFERRED`/`REVOKED` |
| Source authority | `ASSIGNMENT_SOURCE` constants |
| Owner | AFF-05A R1 + R2 + W5 |
| Audit fields | `assignedByUserId`, `reason`, `previousAssignmentId` |

**Cannot be adopted.** Reasons:

1. **Wrong aggregate root.** It is keyed to a LaborProfile, not a
   StaffingOrder. A recruiter's scope is the demand they handle; a
   LaborProfile's owner is whoever is processing that specific profile.
2. **Different revoke semantics.** `releaseHandlingAssignment` flips status
   to `REVOKED`; the new aggregate per Owner decision must keep a nullable
   `revokedAt` timestamp so historical rows are still queryable as
   audit evidence.
3. **No DB-level partial unique** today â€” relies on app-layer close-then-insert.
   Owner decision 8 requires the new aggregate to enforce active-uniqueness
   via DB partial unique index.
4. **Shared model would couple concerns** â€” LaborProfile-handling is part of
   candidate resolution (P1-C), not recruiter demand authority (P1-A0.4).
   A recruiter handling a LaborProfile because they handled the slot is
   derivable from the new aggregate + the canonical flow; the reverse is not.

### 3.2 `Project.pmUserId` / `Project.subPmUserId1` / `Project.subPmUserId2`

Already used for PM scope. Wrong role, wrong model â€” see
`buildProjectScope` PM branch.

### 3.3 `Worker.assignedToId`

Referenced by `hrp_worker_visible_for` for HR_STAFF's worker-row scope
(migration `20260821103500_m13_restore_rls_matrix/migration.sql:17`). This is
the closest precedent for HR_STAFF authority at the SQL layer â€” it shows the
**pattern** of gating HR_STAFF by a user FK on the protected table.

But it cannot host `staffingOrderId` (FK type mismatch), and the field is a
single nullable FK, not an auditable aggregate. Reusing it would require
making `assignedToId` polymorphic, which the schema does not support.

### 3.4 Decision

A **new additive aggregate** is required:

```
StaffingOrderRecruiterAssignment
  id                uuid
  staffingOrderId   uuid FK â†’ staffing_orders(id) ON DELETE RESTRICT
  recruiterUserId   uuid FK â†’ users(id) ON DELETE RESTRICT
  assignedByUserId  uuid FK â†’ users(id) ON DELETE RESTRICT
  assignedAt        timestamptz NOT NULL DEFAULT now()
  revokedAt         timestamptz NULL
  revokedByUserId   uuid NULL FK â†’ users(id) ON DELETE RESTRICT
  reason            text NULL
  @@unique INDEX (staffingOrderId, recruiterUserId) WHERE revokedAt IS NULL
  @@index (recruiterUserId) WHERE revokedAt IS NULL
```

**Why additive and not a column on `staffing_orders`.** Multiple active
recruiters per order is a requirement (Owner decision 5). Audit provenance is
required (Owner decision 7). The single-FK-on-parent pattern cannot satisfy
either.

## 4. Additive schema/migration shape

### 4.1 New model (proposed, declarative)

```prisma
model StaffingOrderRecruiterAssignment {
  id                String    @id @default(uuid())
  staffingOrderId   String    @map("staffing_order_id")
  recruiterUserId   String    @map("recruiter_user_id")
  assignedByUserId  String    @map("assigned_by_user_id")
  assignedAt        DateTime  @default(now()) @map("assigned_at")
  revokedAt         DateTime? @map("revoked_at")
  revokedByUserId   String?   @map("revoked_by_user_id")
  reason            String?   @db.Text

  staffingOrder     StaffingOrder @relation(fields: [staffingOrderId], references: [id], onDelete: Restrict)
  recruiterUser     User          @relation("RecruiterAssignments", fields: [recruiterUserId], references: [id], onDelete: Restrict)
  assignedByUser    User          @relation("RecruiterAssignedBy", fields: [assignedByUserId], references: [id], onDelete: Restrict)
  revokedByUser     User?         @relation("RecruiterRevokedBy", fields: [revokedByUserId], references: [id], onDelete: Restrict)

  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  // Active uniqueness: at most one ACTIVE row per (order, recruiter).
  // Implemented in migration SQL as a partial unique index (Prisma cannot
  // express `WHERE revoked_at IS NULL` directly on @@unique).
  @@index([staffingOrderId])
  @@index([recruiterUserId])
  @@map("staffing_order_recruiter_assignments")
}
```

**Audit provenance (Owner decision 7)** â€” fields covered:

- `staffingOrderId` âœ“
- `recruiterUserId` âœ“
- `assignedByUserId` âœ“
- `assignedAt` âœ“
- `revokedAt` (nullable) âœ“
- optional `reason` âœ“ (and `revokedByUserId` for symmetry; not strictly required
  by Owner decision but consistent with the LaborProfileHandlingAssignment
  pattern).

**DB-level invariant (Owner decision 8)** â€” partial unique index added in
the migration:

```sql
CREATE UNIQUE INDEX staffing_order_recruiter_assignments_active_unique
  ON staffing_order_recruiter_assignments (staffing_order_id, recruiter_user_id)
  WHERE revoked_at IS NULL;
```

### 4.2 Migration posture (forward-only, additive)

Migration name pattern:
`prisma/migrations/<UTC-timestamp>_p1a04_scoped_recruiter_assignment/migration.sql`.

**Truthfulness (T0 correction `C-04`).** This contract locks the following
implementation choice. **No policy is `DROP POLICY`d.** The new
narrowly-scoped `PERMISSIVE` policies are **ADDED**; existing policies for
existing roles remain **byte/behavior equivalent**. If a specific existing
policy must be altered (for example, to widen a `USING` clause to OR with
the new helper), the diff is recorded explicitly in HANDOFF and applied as
a transactional forward-only migration. "Forward-only" means **no
destructive schema/data rollback**; it does NOT mean "policy definitions
can never change". No broad `FOR ALL` recruiter policy is introduced. SELECT,
INSERT and UPDATE `USING` / `WITH CHECK` clauses are defined separately for
each new policy.

Migration SQL outline (additive; no DROP, no DISABLE RLS, no broad FOR ALL):

1. `CREATE TABLE staffing_order_recruiter_assignments (...)` â€” exact column
   set above.
2. `ALTER TABLE` adding FKs `ON DELETE RESTRICT` (preserve audit rows).
3. `CREATE UNIQUE INDEX â€¦ WHERE revoked_at IS NULL` for active uniqueness.
4. `CREATE INDEX` on `(recruiter_user_id) WHERE revoked_at IS NULL` for
   "my assigned orders" lookups.
5. `CREATE OR REPLACE FUNCTION hrp_staffing_order_visible_for(sid text)`
   (least-authority â€” see Â§4.3.1).
6. `CREATE OR REPLACE FUNCTION hrp_project_recruiter_visible_for(pid text)`
   (least-authority â€” see Â§4.3.2).
7. `CREATE POLICY â€¦` â€” a separate narrowly-scoped `PERMISSIVE FOR SELECT`
   policy per table for `HR_STAFF` (see Â§4.3.3). No broad `FOR ALL`.
8. `GRANT SELECT, INSERT, UPDATE ON â€¦ TO app_user_writer` â€” no DELETE grant
   (revoke is an update of `revoked_at`).
9. **Do NOT** enable RLS on `staffing_order_recruiter_assignments` in this
   round. The new aggregate is authority-of-truth for assignment scope;
   gating it behind RLS would produce a chicken-and-egg with the RLS policy
   itself. L1 app-side authority check (HR_MANAGER/ADMIN only) is
   sufficient.

**Rollback posture.** Forward-only:

- **Soft revert** (preferred): leave the table in place; flip the `revokedAt`
  flag on every row (so the active set is empty); the new code path becomes a
  no-op and HR_STAFF reverts to the prior "zero visibility" behavior.
- **Hard revert**: a follow-up migration that DROPs the table and indexes.
  Forward-only; never revert this migration in-place.

### 4.3 SECDEFINER helpers (recommended)

Two narrowly-scoped SECDEFINER helpers are added. **Each helper is
least-authority** â€” it is intentionally restricted to the single role that
the new P1-A0.4 slice unlocks (`HR_STAFF`). Existing roles continue to
flow through their existing canonical helpers / policies. This avoids
duplicating the ADMIN / HR_MANAGER / PM / SALE branching inside the new
helper, and keeps the diff to existing roles at **zero**.

#### 4.3.1 `hrp_staffing_order_visible_for(orderId)` â€” least-authority (T0 correction `C-02`)

```sql
CREATE OR REPLACE FUNCTION hrp_staffing_order_visible_for(sid text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    -- ONLY HR_STAFF can be made visible by this helper.
    -- All other roles flow through their existing canonical helpers / policies.
    hrp_session_role() = 'HR_STAFF'
    AND EXISTS (
      SELECT 1 FROM staffing_order_recruiter_assignments a
      WHERE a.staffing_order_id = sid
        AND a.recruiter_user_id = hrp_session_user_id()
        AND a.revoked_at IS NULL
    );
$$;
```

This helper **must not** be extended to short-circuit for ADMIN /
HR_MANAGER / PM / SALE â€” those roles continue to flow through the
existing canonical helpers / policies (which remain byte/behavior
equivalent). Duplicating role branching inside the new helper would
create drift risk between this P1-A0.4 helper and the canonical project /
order visibility helpers.

#### 4.3.2 `hrp_project_recruiter_visible_for(projectId)` â€” SELECT-only (T0 correction `C-03`)

A second, separate, scoped SELECT-only helper exists for `Project`:

```sql
CREATE OR REPLACE FUNCTION hrp_project_recruiter_visible_for(pid text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    hrp_session_role() = 'HR_STAFF'
    AND EXISTS (
      SELECT 1 FROM staffing_orders so
      JOIN staffing_order_recruiter_assignments a
        ON a.staffing_order_id = so.id
       AND a.revoked_at IS NULL
      WHERE so.project_id = pid
        AND a.recruiter_user_id = hrp_session_user_id()
    );
$$;
```

Properties:

- `SELECT` only â€” there is NO `hrp_project_writable` companion helper for
  HR_STAFF, and `HR_STAFF` is **NOT** added to the root/global branch of
  `hrp_project_visible_for` or `hrp_project_writable`.
- An assigned Project (one containing â‰¥1 `StaffingOrder` actively assigned
  to the user) is visible; an unassigned Project is invisible.
- Assigning one `StaffingOrder` in Project P does **NOT** reveal sibling
  orders in P â€” that visibility is gated by
  `hrp_staffing_order_visible_for(orderId)`, not by project membership.
- The matrix-scope test is updated: `HR_STAFF Ã— projects` returns the
  **assigned-project set only**, not always `0`.

#### 4.3.3 Narrowly-scoped PERMISSIVE policies (T0 correction `C-04`)

The new policies are **separate narrowly-scoped `PERMISSIVE` policies** â€”
one per table â€” with `USING` and `WITH CHECK` clauses defined **separately**
for SELECT / INSERT / UPDATE. **No broad `FOR ALL` recruiter policy.**

```sql
-- Project: SELECT only for HR_STAFF (no INSERT/UPDATE/DELETE authority).
CREATE POLICY hrp_project_recruiter_select ON projects
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (hrp_project_recruiter_visible_for(id));

-- StaffingOrder: SELECT only for HR_STAFF (no INSERT/UPDATE/DELETE authority).
CREATE POLICY hrp_staffing_order_recruiter_select ON staffing_orders
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (hrp_staffing_order_visible_for(id));

-- StaffingOrderSlot: SELECT only for HR_STAFF (inherits via parent order FK).
CREATE POLICY hrp_staffing_order_slot_recruiter_select ON staffing_order_slots
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (
    EXISTS (
      SELECT 1 FROM staffing_orders so
      WHERE so.id = staffing_order_slots.staffing_order_id
        AND hrp_staffing_order_visible_for(so.id)
    )
  );

-- JobOpening: SELECT only for HR_STAFF.
CREATE POLICY hrp_job_opening_recruiter_select ON job_openings
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (
    EXISTS (
      SELECT 1 FROM staffing_order_slots s
      JOIN staffing_orders so ON so.id = s.staffing_order_id
      WHERE s.id = job_openings.slot_id
        AND hrp_staffing_order_visible_for(so.id)
    )
  );

-- JobPosting: SELECT + INSERT + UPDATE for HR_STAFF on assigned-scope rows.
-- (HR_STAFF may author/publish JobPosting rows under slots whose parent
-- order is in their active assignment set. The mutation routes through the
-- canonical authoring service with idempotency.)
CREATE POLICY hrp_job_posting_recruiter_select ON job_postings
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (
    EXISTS (
      SELECT 1 FROM job_openings jo
      JOIN staffing_order_slots s ON s.id = jo.slot_id
      JOIN staffing_orders so ON so.id = s.staffing_order_id
      WHERE jo.id = job_postings.opening_id
        AND hrp_staffing_order_visible_for(so.id)
    )
  );

CREATE POLICY hrp_job_posting_recruiter_insert ON job_postings
  AS PERMISSIVE FOR INSERT TO app_user_writer
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_openings jo
      JOIN staffing_order_slots s ON s.id = jo.slot_id
      JOIN staffing_orders so ON so.id = s.staffing_order_id
      WHERE jo.id = job_postings.opening_id
        AND hrp_staffing_order_visible_for(so.id)
    )
  );

CREATE POLICY hrp_job_posting_recruiter_update ON job_postings
  AS PERMISSIVE FOR UPDATE TO app_user_writer
  USING (
    EXISTS (
      SELECT 1 FROM job_openings jo
      JOIN staffing_order_slots s ON s.id = jo.slot_id
      JOIN staffing_orders so ON so.id = s.staffing_order_id
      WHERE jo.id = job_postings.opening_id
        AND hrp_staffing_order_visible_for(so.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_openings jo
      JOIN staffing_order_slots s ON s.id = jo.slot_id
      JOIN staffing_orders so ON so.id = s.staffing_order_id
      WHERE jo.id = job_postings.opening_id
        AND hrp_staffing_order_visible_for(so.id)
    )
  );
```

Existing policies for existing roles (`ADMIN`, `HR_MANAGER`, `PM`,
`SALE`, `DIRECTOR`, `ACCOUNTANT`, `VENDOR_*`) remain **byte/behavior
equivalent**. If a specific existing policy must be altered, the diff is
documented in HANDOFF and applied as a transactional forward-only
migration.

Because the new policies are PERMISSIVE and added alongside the existing
ones, an HR_STAFF row is visible when **any** matching policy's `USING`
clause returns true. `hrp_project_visible_for` returns false for
HR_STAFF, so the new branch is **only ever true for HR_STAFF when an
active assignment exists**. The additive OR is safe â€” it can only widen
visibility for HR_STAFF who has an active assignment, and never for any
other role.

### 4.4 Propagation to slots, openings, postings, cases

- **`staffing_order_slots`** already inherits from `staffing_orders` via the
  parent FK. The new `hrp_staffing_order_slot_recruiter_select` policy
  (defined in Â§4.3.3) gates slots under assigned orders; under unassigned
  orders, slots remain invisible. Verify by re-running
  `matrix-scope.test.ts` against the new policy â€” HR_STAFF should now see
  slots under assigned orders and zero under unassigned orders.
- **`job_openings` and `job_postings`** are gated by the new narrowly-scoped
  `PERMISSIVE FOR SELECT` policies `hrp_job_opening_recruiter_select` and
  `hrp_job_posting_recruiter_select` (defined in Â§4.3.3). `JobPosting`
  additionally gets narrowly-scoped `PERMISSIVE FOR INSERT` and
  `PERMISSIVE FOR UPDATE` policies (`hrp_job_posting_recruiter_insert`,
  `hrp_job_posting_recruiter_update`). No broad `FOR ALL` recruiter policy.
  Existing policies for existing roles remain byte/behavior equivalent.
  **No `DROP POLICY` is performed.** All narrowing is by **additive** new
  policies OR'd over the existing ones.
- **`candidate_submissions`** are created by public apply â€” visibility is
  governed by `candidate_submission` RLS + per-application workbench
  derivation. The new aggregate does NOT need to gate applications directly
  because the existing workbench handler derivation (via
  `LaborProfileHandlingAssignment`) already handles this for assigned HR_STAFF
  (after a successful claim). For the **unclaimed queue** (multiple assigned
  recruiters before any claim), see Â§4.6 â€” the new
  `assignedOrderQueue` read service derives the order from the slot and
  applies the masked-field redaction policy.

### 4.5 L1 app-scope changes (narrow, additive)

After RLS is in place, tighten the L1 layer so the footgun is closed:

```typescript
// src/shared/auth/scopes/staffing.scope.ts (proposed patch)
export function buildStaffingOrderScope(ctx: AuthContext): Prisma.StaffingOrderWhereInput {
  // root + SALE + DIRECTOR see all (unchanged)
  if (['ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'SALE', 'DIRECTOR'].includes(ctx.role)) {
    return {};
  }

  // HR_STAFF â€” narrow to active assignments
  if (ctx.role === 'HR_STAFF') {
    return {
      recruiterAssignments: {
        some: {
          recruiterUserId: ctx.userId,
          revokedAt: null,
        },
      },
    };
  }

  // PM unchanged â€” by project
  if (ctx.role === 'PM') {
    return { project: buildProjectScope(ctx) };
  }
  // VENDOR_* unchanged
  // ...
  return { id: '__IMPOSSIBLE__' };
}
```

This is a **narrowing change** for HR_STAFF only; root/PM/SALE branches are
unchanged. It converts the L1 layer from "permissive no-op + RLS floor" to
"explicit narrowing + RLS floor".

### 4.6 Application-to-handler bridge (T0 correction `C-05`)

The E2E flow jumps from public apply directly to Alice processing the candidate,
but multiple recruiters may be assigned to one order and no handler is selected.
This gap is closed as follows:

1. **Public apply** remains unchanged and creates `CandidateSubmission` /
   `LaborProfile` through the canonical P1-B authority (no changes to the
   apply surface).
2. **`CandidateSubmission.slotId`** derives the `StaffingOrder` (via the slot's
   FK chain).
3. All **active recruiters** assigned to that order may see an **UNCLAIMED**
   queue entry with **privacy-safe / masked fields** (see Â§5.1 for the
   masking boundary).
4. An assigned recruiter executes a **"claim candidate"** command:
   `POST /api/admin/applications/{submissionId}/claim` (HR_STAFF only; see
   Â§8).
5. First successful claim creates the canonical active
   `LaborProfileHandlingAssignment` with source **`ORDER_RECRUITER_CLAIM`**.
6. The claim race is **serialized** using the repository's existing DB
   locking / advisory-lock pattern â€” exactly one recruiter wins.
7. Losers receive stable **`409 HANDLING_ALREADY_CLAIMED`** (no existence
   oracle, no retry-spam).
8. After claim, the candidate appears in that recruiter's existing
   Workbench **`MINE`** view.
9. Order authority is **NOT** faked by polymorphically reusing
   `LaborProfileHandlingAssignment` â€” the order assignment and the handler
   assignment are **distinct aggregates** with different roots, different
   unique indexes, and different revoke semantics.

The claim command is atomic: idempotency + authorization + DB lock +
domain mutation all execute inside **one transaction**.

## 5. Fail-closed & information-oracle prevention (Owner decision 10)

An unassigned HR_STAFF must:

1. Receive **uniform 404** on direct read of an unassigned
   `StaffingOrder.id` (not 403, which leaks existence).
2. See **empty collections** on list endpoints (no count oracle, no
   ordering oracle).
3. Receive **uniform 4xx** on mutation attempts against unassigned slots
   (no P2025/P2002 distinctions that distinguish "exists but not yours"
   from "does not exist").

Implementation patterns:

- `getStaffingOrder` for HR_STAFF on an unassigned order:
  throw `StaffingOrderServiceError('NOT_FOUND', 'StaffingOrder {id} not found or no permission')`
  (already the message â€” keep it; do NOT distinguish).
- `listJobPostingsForAdmin` for HR_STAFF:
  rely on RLS narrowing; the query returns empty. Do not add per-row
  404 distinctions.
- Slot eligibility predicate for HR_STAFF:
  must JOIN against `staffing_order_recruiter_assignments` (active) before
  returning the slot. An HR_STAFF who tries to create a JobPosting for an
  unassigned slot gets 404 (slot not eligible), not 403 (slot exists).

### 5.1 Sensitive data boundary (T0 correction `C-06`)

`StaffingOrder` assignment alone **does NOT grant global worker/candidate PII**.
The sensitive data boundary is locked as follows:

| State | Data surfaced |
|---|---|
| **Unclaimed** (no `LaborProfileHandlingAssignment` exists) | Only masked / minimal application fields in the unclaimed queue: e.g. `submissionId`, slot-derived orderId (no orderId if not assigned), timestamp, status badge, generic candidate name placeholder. **No phone number, no CCCD, no raw evidence, no full LaborProfile fields.** |
| **Claimed** (active `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM`) | Active handler receives only the **recruiter-contact fields** required for recruitment (e.g. masked phone â€” sufficient for the recruiter to make contact). |
| **CCCD image / raw evidence** | Remains **outside** this task's authorization path. Requires the existing evidence authorization path (separate from `StaffingOrderRecruiterAssignment`). No global `CAN_VIEW_WORKER_SENSITIVE` grant to `HR_STAFF`. |
| **Unassigned HR_STAFF** | Empty / 404 responses. No existence oracle for candidate presence. |

## 6. Threat model

| Threat | Vector | Mitigation |
| --- | --- | --- |
| **Race on assignment creation** | Two admins assign the same recruiter simultaneously | DB partial unique index on `(staffing_order_id, recruiter_user_id) WHERE revoked_at IS NULL` (Owner decision 8). Race loses with P2002; service translates to `ASSIGNMENT_ALREADY_EXISTS` 409. |
| **Race on assignment + read** | Admin revokes right as HR_STAFF is mid-read | Use `withDbContext` + RLS at row read time, not stale JWT-derived scope. HR_STAFF's `tx` will see revoked row â†’ not visible. No special handling. |
| **Stale JWT vs revocation** | HR_STAFF's JWT still valid 5 minutes after revoke | RLS is evaluated at query time against `app.user_id` + the active-assignment subquery â€” JWT expiry is irrelevant. The auth layer does not cache the assignment set; each transaction re-resolves. |
| **Information oracle (slot existence)** | HR_STAFF queries `GET /api/admin/staffing/orders/{id}` for an order they are not assigned to | Route returns 404 (no 403). Body does not distinguish "exists but not yours" from "does not exist". Same message as a truly missing order. |
| **Information oracle (slot enumeration)** | HR_STAFF attempts to list slots under an unassigned order | List endpoint's WHERE clause includes the active-assignment filter at L1; RLS narrows at L2. Empty list returned for HR_STAFF on unassigned orders. |
| **Information oracle (assignment existence)** | HR_STAFF tries to read another HR_STAFF's assignment | No read endpoint exposed to HR_STAFF for the assignment table itself. Assignment list is admin/HR_MANAGER-only. |
| **Privilege escalation via SALE/PM parity** | HR_STAFF reuses PM/SALE branches in scope builders | All scope builders explicitly branch on role. PM scope is unchanged. HR_STAFF branch is the new narrowing branch. No shared code path. |
| **Migration rollback exposing ghost assignments** | Operator reverts the migration in place | Migration is forward-only; rollback = soft-revert via `revokedAt` on all rows. Hard revert requires a follow-up migration, never an in-place revert. |
| **PII export via assignment aggregate** | Admin queries recruiter assignments and sees candidate names | Aggregate does NOT carry candidate/labor profile data. Only `staffingOrderId`, `recruiterUserId`, `assignedByUserId`, timestamps, reason. No PII. |
| **Forced overwrite via UPDATE without revoke** | Concurrent mutation tries to overwrite an active row | Partial unique index prevents two ACTIVE rows; mutation must first revoke (UPDATE `revoked_at`) then INSERT. Service enforces this in app layer. |
| **Use of revoked assignment as audit evidence** | Auditor queries `WHERE revoked_at IS NOT NULL` to see history | Revoked rows are NOT deleted; audit query supports `revoked_at IS NULL` and `IS NOT NULL` filters. |
| **Self-revoke / self-assign** | HR_STAFF attempts to assign themselves to an order | Authority check (`requireRole(['ADMIN','HR_MANAGER'])`) is performed BEFORE the assignee validation. HR_STAFF never reaches the assignment endpoint. |
| **Revoke during in-flight write** | HR_STAFF opens a JobPosting create â†’ admin revokes â†’ tx completes | The JobPosting create runs inside `withDbContext`; the slot eligibility revalidation JOINs active assignments at COMMIT time. If revoked, the row is not visible at COMMIT â€” Prisma `create` succeeds in tx but the slot is filtered out, producing `SlotNotEligible` 4xx. Audit logs preserve the partial state for reconciliation. |
| **Race on candidate claim** (T0 correction `C-05`) | Two HR_STAFFs race to claim the same unhandled candidate | Claim command uses DB locking / advisory-lock serialization; exactly one wins; losers receive stable `409 HANDLING_ALREADY_CLAIMED`. The winning handler receives active `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM`. |
| **Dual-authority Placement failure** (T0 correction `C-07`) | HR_STAFF attempts to open/confirm PlacementCase without active handling assignment | For HR_STAFF, every candidate-specific `PlacementCase` / `Placement` command verifies in the **same transaction**: (a) active `StaffingOrderRecruiterAssignment` to the exact `StaffingOrder` derived from submission/slot/jobOpening; AND (b) active `LaborProfileHandlingAssignment` for the relevant `LaborProfile`. ADMIN/HR_MANAGER retain existing broad authority. Same rule for preview/create/confirm/effective/fail/cancel routes. |
| **Revoke-first lock-order race** (T0 correction `C-08`) | ADMIN revokes assignment while HR_STAFF's mutation tx is in-flight (revoke committed first) | Recruiter mutation locks and validates the active assignment row inside its mutation transaction; revoke locks the same row. If revoke commits first â†’ the later mutation sees `revokedAt IS NOT NULL` and fails closed with uniform `404`. Authorization check + domain mutation share **ONE** transaction. No mutation may commit after observing `revokedAt IS NOT NULL`. Tests exercise both lock orderings. |
| **Command-first lock-order race** (T0 correction `C-08`) | HR_STAFF's mutation tx obtains lock before revoke is committed | Mutation may commit before revoke (snapshot-time authorization). This is safe â€” the mutation was authorized at tx start. Revoke then fails with idempotency-safe 409 `ASSIGNMENT_ALREADY_REVOKED` or similar. |

## 7. BUILD_VS_ADOPT analysis

### 7.1 Library/framework adoption â€” `ADOPT` (existing primitives only)

This task does NOT introduce new external libraries. It reuses:

- `AuthContext` (`src/shared/auth/auth-context.ts`) â€” unchanged shape.
- `withDbContext` (`src/shared/auth/with-db-context.ts`) â€” unchanged.
- `resolveEffectivePermissions` (`src/shared/auth/permission-resolver.ts`) â€”
  unchanged; no new broad permission code such as `CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS`
  is introduced in this slice (T0 correction `C-10`). The locked authorization
  model is: role establishes the recruiter persona; active
  `StaffingOrderRecruiterAssignment` establishes object scope; both are
  required. A future fine-grained permission layer may be a separate task but
  is not a dependency of this P1 closure.
- `PERMISSION_CATALOG` (`src/shared/auth/permission-catalog.ts`) â€” no new
  permission codes needed.
- `withIdempotency` (`src/shared/integrity/idempotency.ts`) â€” for the
  assignment / revoke / claim commands to satisfy the canonical integrity gate.
- `DataTable` + form primitives (`src/shared/ui/data-table/...`,
  `src/shared/ui/forms/...`) â€” for the Admin/HR-Manager UI.
- The `LaborProfileHandlingAssignment` aggregate (W5 + AFF-05A R1 + R2) as
  the **design precedent** for the new aggregate, not as a structural reuse.

### 7.2 Frozen-task integration (T0 correction `C-11`)

This task integrates with already-accepted E0/E1/F0/F1 runtime without
editing their historical TASK/HANDOFF/AUDIT artifacts. The following
narrowly-scoped source exceptions are authorized for the implementation
round only:

- `src/domains/applications/conversion.service.ts` (P1-B frozen) â€” read-only
  consumption is allowed; no behavioral or signature change.
- `src/domains/placement/route-helpers/**` (P1-F0/F1 frozen) â€” adding a
  new exported helper `assertPlacementHrStaffDualAuthority()` is allowed **as
  a new exported helper**, not as an edit to the existing route bodies.
  Existing F0/F1 route bodies continue to call the canonical F0/F1 helper;
  HR_STAFF gating is enforced via the dual-authority predicate **before**
  calling those F0/F1 helpers.
- `src/shared/auth/withIdempotency.ts` (E1 frozen) â€” read-only consumption;
  no behavioral or signature change.
- `src/lib/auth/session.ts` â€” read-only consumption; no JWT / session shape
  change.

No historical TASK.md / HANDOFF.md / AUDIT.md / evidence/ bundle of any
frozen task may be edited. This task's own TASK / HANDOFF / AUDIT /
evidence/ bundle is the only such bundle that may be created or edited.

### 7.2 Automation/orchestration â€” `N/A`

This task does not introduce connectors, schedulers, notification workers,
or multi-system workflows. Assignment/revocation is an in-app
human-triggered UI/API flow. n8n is explicitly out of scope (Owner
decision 16).

### 7.3 Schema migration â€” `ADOPT` (existing migration framework)

The additive aggregate follows the existing Prisma migration framework
(`prisma/migrations/<UTC>_*/migration.sql`) and the canonical forward-only
ROLLBACK posture documented in `PLAN.md`. No new tooling.

## 8. Final E2E acceptance (Owner-mandated â€” v1.1 expansion)

The contract must encode an end-to-end AC chain that walks the canonical
recruitment flow under scoped recruiter authority. The chain below is the
**v1.1 expansion of `C-12`** (`DEC-30`) â€” `AC-E2E-01..AC-E2E-22`
supersedes the original `AC-E2E-01..AC-E2E-18` set from the v1.0
planning round.

```
AC-E2E-01  ADMIN creates StaffingOrder SO-X and StaffingOrder SO-Y under the SAME Project P
AC-E2E-02  ADMIN/HR_MANAGER assigns HR_STAFF-Alice to SO-X via assignment UI/API;
            HR_STAFF-Bob remains unassigned to either order
AC-E2E-03  HR_STAFF-Alice logs in (fresh JWT) â€” AuthContext.role=HR_STAFF,
            userId=Alice.id. Alice sees minimal Project P metadata required to render
            SO-X (no other Project fields, no other projects)
AC-E2E-04  Alice calls GET /api/staffing/orders â€” sees ONLY SO-X.
            Sibling SO-Y in the SAME Project P is NOT visible to Alice (sibling-order isolation)
AC-E2E-05  Alice calls GET /api/staffing/orders/{SO-Y.id} for an unassigned sibling order
            â€” uniform 404 (no existence oracle)
AC-E2E-06  Alice calls GET /api/staffing/orders/{SO-X.id}/slots â€” sees slots of SO-X only
AC-E2E-07  Alice creates a JobPosting for SO-X.slot[0] and publishes it â€” 200/201,
            status PUBLISHED, canonical idempotency replay
AC-E2E-08  Public visitor GET /api/jobs?slug=... â€” sees Alice's posting.
            Public visitor POST /api/public/jobs/{slug}/apply â€” 201 (canonical apply path,
            unchanged)
AC-E2E-09  Application enters the SO-X unclaimed recruiter queue.
            Alice and another SO-X-assigned recruiter race to claim the candidate.
            Exactly ONE wins; loser receives stable 409 HANDLING_ALREADY_CLAIMED
AC-E2E-10  Winner receives active LaborProfileHandlingAssignment with source
            ORDER_RECRUITER_CLAIM. Claim command runs inside one transaction with
            authorization + DB lock + domain mutation
AC-E2E-11  Winner sees the candidate row in Workbench MINE and can perform next actions
            (profile score, PlacementCase open, Placement preview). Loser / non-handler
            cannot mutate that candidate
AC-E2E-12  Winner opens PlacementCase and processes Placement preview / create / confirm â€”
            valid Placement outcome reached using DUAL AUTHORITY (active
            StaffingOrderRecruiterAssignment AND active LaborProfileHandlingAssignment
            in same transaction)
AC-E2E-13  HR_STAFF-Bob (NOT assigned to either order) attempts the same flow â€”
            uniform 404 / empty list at every step (project, order, slot,
            posting-admin, application, case, placement)
AC-E2E-14  ADMIN/HR_MANAGER revokes the WINNER's StaffingOrderRecruiterAssignment
            (lock-order case A: revoke first)
AC-E2E-15  After revoke, NEW order-scoped and placement mutations by the
            previously-winning recruiter fail closed (uniform 404).
            DB-locked revoke row guarantees no mutation commits after revokedAt IS NOT NULL
AC-E2E-16  Lock-order case B: a new mutation is started by the previously-winning
            recruiter, then ADMIN/HR_MANAGER revokes. Mutation either commits before
            revoke (snapshot-time authorization) OR fails closed with uniform 404.
            Authorization check + domain mutation share ONE transaction
AC-E2E-17  The public JobPosting remains READABLE after the recruiter revoke â€”
            public listing/apply path is unchanged.
            Public unpublish is a separate canonical publication workflow
AC-E2E-18  Bob remains unable to observe ANY of: Project P metadata beyond what he
            is assigned to; SO-X/SO-Y; slots; posting-admin; application; case;
            placement â€” across all revoke states
AC-E2E-19  Pre-claim / masked boundary: while candidate is UNCLAIMED, unclaimed queue
            read returns only masked / minimal application fields (no phone / no CCCD /
            no raw evidence)
AC-E2E-20  Post-claim / handler boundary: after winning the claim, handler receives
            only recruiter-contact fields required for recruitment.
            CCCD image / raw evidence remain outside this task
AC-E2E-21  Zero cross-run residue; FK-safe reverse teardown.
            Every fixture row created for the 22-step chain is deleted in teardown;
            no orphan rows remain across runs
AC-E2E-22  Existing ADMIN/HR_MANAGER/PM/SALE behavior remains byte/behavior
            equivalent. Existing P1 public apply + idempotency behavior remains
            byte/behavior equivalent. No regression in canonical withIdempotency
            or withDbContext helpers
```

The TASK contract includes AC-E2E-01..AC-E2E-22 as AC rows with synthetic DB
integration plan, explicit allowlist and forbidden paths, and exactly two
docs files changed.

## 9. Open Owner decisions

The directive closes all 17 locked decisions. T0 v1.1 correction `C-01..C-12`
closes all correction items. **Zero open Owner decisions at the planning
level.**

If during implementation a previously-closed decision needs revisiting (e.g.
SALE expansion is requested mid-task), Tier 1 stops and returns to T0 per
the pipeline's "do not silently expand Owner decisions" rule.

## 10. File allowlist (carries into TASK â€” expanded per T0 correction `C-11`)

This planning doc does NOT modify any file. The TASK contract defines the
file allowlist for the implementation round. The expected allowlist shape
includes the following **planned implementation paths** (this planning round
does not execute any of these):

**Prisma schema + migration:**

- `prisma/schema.prisma` â€” additive model `StaffingOrderRecruiterAssignment`
  + relations; no field rename / type change.
- `prisma/migrations/<UTC>_p1a04_scoped_recruiter_assignment/migration.sql`
  â€” additive forward-only migration (table, partial unique index, narrowly-scoped
  PERMISSIVE RLS policies, DB-locking helper registrations).

**Scoped recruiter helpers (SECDEFINER):**

- `prisma/migrations/â€¦` â€” registers `hrp_staffing_order_visible_for` and
  `hrp_project_recruiter_visible_for` as `SECURITY DEFINER` helpers.

**Auth scope builders (L1 narrowing):**

- `src/shared/auth/scopes/staffing.scope.ts` â€” HR_STAFF branch calls
  `hrp_staffing_order_visible_for` (or equivalent Prisma predicate).
- `src/shared/auth/scopes/project.scope.ts` â€” HR_STAFF branch calls
  `hrp_project_recruiter_visible_for` (SELECT-only; no INSERT/UPDATE/DELETE).

**Staffing services (L1 + L2, HR_STAFF-visible reads + writes):**

- `src/domains/staffing/l1-scope/builders/staffing-order.builder.ts` *(or equivalent)*
  â€” order eligibility predicate for HR_STAFF.
- `src/domains/staffing/l1-scope/builders/project.builder.ts` *(or equivalent)*
  â€” Project L1 narrowing for HR_STAFF (assigned-project set only).
- `src/domains/staffing/job-opening.service.ts` â€” read path honoring
  `hrp_job_opening_recruiter_select` policy.
- `src/domains/staffing/job-posting.service.ts` â€” SELECT / INSERT / UPDATE
  honoring the narrowly-scoped HR_STAFF policies.
- `src/domains/staffing/job-posting-authoring.service.ts` â€” narrow slot
  eligibility for the create path (assigned-order set only).
- `src/domains/staffing/job-posting-list.service.ts` â€” leave unchanged if
  L1 narrowing is sufficient; otherwise narrow per slot.

**Placement services (dual-authority for HR_STAFF):**

- `src/domains/placement/route-helpers/assert-placement-hrstaff-dual-authority.ts`
  *(new)* â€” exported helper enforcing the dual-authority predicate
  (active `StaffingOrderRecruiterAssignment` AND active
  `LaborProfileHandlingAssignment` in same transaction) for use before
  calling existing F0/F1 route helpers.
- `src/domains/placement/services/case.service.ts` â€” candidate-specific
  `PlacementCase` commands guarded by dual-authority predicate.
- `src/domains/placement/services/placement.service.ts` â€” candidate-specific
  Placement commands guarded by dual-authority predicate.

**Recruiter assignment service + API (ADMIN/HR_MANAGER only):**

- `src/domains/staffing/recruiter-assignment.service.ts` *(new)* â€” assignment
  CRUD with `withIdempotency`; revoke with `revokedAt` (DB-locked,
  deterministic).
- `src/app/api/admin/staffing/orders/[orderId]/recruiters/route.ts` *(new)*
  â€” `POST` assign (ADMIN/HR_MANAGER only; raw UUID-v4 `Idempotency-Key`,
  server-side actor derivation, atomic execution).
- `src/app/api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke/route.ts`
  *(new)* â€” `POST` revoke (ADMIN/HR_MANAGER only).

**Application claim service + API (HR_STAFF only):**

- `src/domains/applications/claim-candidate.service.ts` *(new)* â€” claim
  candidate command; advisory-lock serialization; creates
  `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM`;
  stable `409 HANDLING_ALREADY_CLAIMED`.
- `src/app/api/admin/applications/[submissionId]/claim/route.ts` *(new)*
  â€” `POST` claim (assigned HR_STAFF only).

**Unclaimed queue + recruiter workbench (HR_STAFF read surface):**

- `src/domains/applications/unclaimed-queue.service.ts` *(new)* â€” read
  service for assigned-order queue; returns masked fields (no phone / no
  CCCD / no raw evidence) for unclaimed candidates.
- `src/domains/recruiter/workbench.service.ts` â€” read service types and
  handlers required to surface claimed rows in `MINE` for HR_STAFF.
- `src/app/admin/recruiter-workbench/_components/MineList.tsx` *(or
  equivalent)* â€” UI surface that shows claimed candidate rows in Workbench.

**Assignment UI (ADMIN/HR_MANAGER):**

- `src/app/admin/staffing/orders/[orderId]/recruiters/_components/**`
  *(new)* â€” assignment UI using `DataTable` + form primitives.

**Role-label surface:**

- `src/i18n/locales/vi/**` *(or equivalent)* â€” changes "HR Staff" label
  to "ChuyÃªn viÃªn tuyá»ƒn dá»¥ng"; internal enum remains `HR_STAFF`.

**Synthetic DB integration tests:**

- `tests/db/p1-a0-4/**` â€” synthetic DB integration tests for:
  assignment lifecycle; sibling-order isolation in same Project;
  fail-closed (404 on unassigned read); revoke propagation (both lock
  orderings); race safety for claim (advisory lock);
  assignment-oracle prevention; revoke-during-in-flight-write behavior;
  dual-authority Placement; masked-field redaction pre-claim;
  cross-run residue safety.
- `vitest.integration-files.ts` â€” registers the synthetic DB integration
  files in the canonical integration runner.

**Task bundle:**

- `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/{TASK.md,HANDOFF.md,AUDIT.md,evidence/**}`.

**Frozen-task source exceptions** (explicitly authorized by T0 â€” see Â§7.2):

- `src/domains/applications/conversion.service.ts` (P1-B frozen) â€” read-only
  consumption.
- `src/domains/placement/route-helpers/**` (P1-F0/F1 frozen) â€” new exported
  helper only; existing F0/F1 route bodies unchanged.
- `src/shared/auth/withIdempotency.ts` (E1 frozen) â€” read-only consumption.
- `src/lib/auth/session.ts` â€” read-only consumption.

**Forbidden** (explicit non-goals â€” see TASK Â§4.2):

- `prisma/schema.prisma` model changes beyond additive model + relations.
- `src/domains/attendance/**` / `src/domains/finance/**` /
  `src/domains/payroll/**` / `src/domains/leave/**` â€” no authority
  definition.
- `src/domains/conversion/**` (P1-B) â€” no behavioral change.
- `src/domains/n8n/**` â€” no n8n dependency.
- `package.json` / `package-lock.json` / `pnpm-lock.yaml` /
  `yarn.lock` â€” no new dependency.
- Sidebar IA change beyond "ChuyÃªn viÃªn tuyá»ƒn dá»¥ng" label surface.
- `docs/PLANNER_HANDOVER.md` (T0-owned).
- A broad `FOR ALL` recruiter policy (T0 correction `C-04`).
- A new broad permission code such as `CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS`
  (T0 correction `C-10`).
- Adding `HR_STAFF` to the root/global branch of `hrp_project_visible_for`
  or `hrp_project_writable` (T0 correction `C-03`).
- Direct DB writes from background jobs / n8n.

## 11. Verification (this doc)

- `git diff --check` â†’ khÃ´ng cáº£nh bÃ¡o.
- UTF-8 strict, no BOM.
- LF only.
- U+FFFD = 0.
- Mojibake = 0.
- Exactly two docs files changed (`docs/discovery/realignment/P1A04_*.md` and
  `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`).
- No source/schema/migration/package/lockfile modification.

## 12. Tóm tắt

- HR_STAFF được điều phối bởi **RLS floor + L1 narrowing**; L1 app-scope
  của HR_STAFF chuyển từ `{}` sang `recruiterAssignments.some` với
  `revokedAt=null`.
- `LaborProfileHandlingAssignment` không thể adopt làm aggregate cho
  StaffingOrder (sai root, sai revoke semantics, thiếu DB invariant).
- Cần **aggregate aditif mới** `StaffingOrderRecruiterAssignment` với
  partial unique index cho active uniqueness (Owner decision 8), audit
  provenance đầy đủ (Owner decision 7).
- Cần **SECDEFINER helper mới** `hrp_staffing_order_visible_for`
  (least-authority, HR_STAFF only, không duplicate
  ADMIN/HR_MANAGER/PM/SALE — correction C-02) và
  `hrp_project_recruiter_visible_for` (SELECT-only, assigned-project set
  only — correction C-03) để L2 narrowing, OR với branch hiện tại
  (forward-only, không DROP policy cũ, không broad FOR ALL —
  correction C-04).
- Application-to-handler bridge: public apply không đổi; slotId derives
  StaffingOrder; UNCLAIMED queue với masked fields cho tất cả recruiter
  đã assign; assigned recruiter claim → `LaborProfileHandlingAssignment`
  source `ORDER_RECRUITER_CLAIM`; advisory-lock race; losers → `409
  HANDLING_ALREADY_CLAIMED`; winner → Workbench MINE
  (correction C-05).
- Sensitive data boundary: assignment không grant global PII; pre-claim →
  masked fields; post-claim → recruiter-contact fields only; CCCD/raw
  evidence ngoài task này; không có `CAN_VIEW_WORKER_SENSITIVE` global
  cho HR_STAFF (correction C-06).
- Placement dual authority cho HR_STAFF: mỗi PlacementCase/Placement command
  verify TRONG CÙNG TRANSACTION cả (a) active
  `StaffingOrderRecruiterAssignment` và (b) active
  `LaborProfileHandlingAssignment` (correction C-07).
- Deterministic revoke concurrency: lock-order contract; revoke-first →
  uniform `404`; auth + mutation share ONE transaction; test cả hai lock
  orderings (correction C-08).
- Exact API contracts: `POST /api/admin/staffing/orders/{orderId}/recruiters`;
  `POST /api/admin/staffing/orders/{orderId}/recruiters/{assignmentId}/revoke`;
  `POST /api/admin/applications/{submissionId}/claim` — raw UUID-v4
  Idempotency-Key, server-side actor derivation, atomic execution
  (correction C-09).
- Không có broad permission code mới (`CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS`
  REMOVED — correction C-10).
- Fail-closed + information-oracle prevention: 404 thống nhất, không phân
  biệt 403/404 cho HR_STAFF trên unassigned orders.
- Threat model đầy đủ: race, revoke, stale session, oracle, claim race,
  dual-authority Placement, revoke-first lock-order, command-first
  lock-order.
- BUILD_VS_ADOPT = `ADOPT` (tái sử dụng primitive hiện hữu, không thêm
  library).
- BUILD_VS_AUTOMATE = `N/A` (no connector/scheduler/notification).
- Frozen-task integration: read-only consumption của P1-B/F0/F1/E1 frozen
  sources; new helper only (không edit F0/F1 route bodies —
  correction C-11).
- AC-E2E-01..22 bao phủ toàn bộ flow từ assignment → JobPosting →
  apply → claim race → Workbench MINE → dual-authority Placement → revoke
  lock-orderings → cross-run residue safety (correction C-12).
- **Không code / không cài package / không migration / không PR** trong
  round planning này. T0 sở hữu production migration gate.

---

*Doc này là planning-round cho P1-A0.4. T0 review contract; Tier 1
mở implementation round mới trên worktree mới với baseline mới pin từ
origin/main, status `READY_TO_CODE` sau khi T0 chốt v1.1 correction
C-01..C-12. Một forward-only docs-only commit trên predecessor
`5bb7581a`.*
## 13. Revision Log

| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v1.0` | 2026-09-28 | Tier 1 (T1C) | Initial reconciliation (PROPOSED_ONLY) | `T0 â†’ T1C â€” P1-A0.4 Scoped Recruiter Authority â€” planning round` |
| 1.1 | 2026-09-28 | Tier 1 (T1C) | T0 correction C-01..C-12 consolidated into one docs-only forward-only commit on top of predecessor 5bb7581a11312c5111f51e0ec84534b4ac9b4a97. Control fields: Spec version 1.1; Status READY_TO_CODE; Contract gate READY_TO_CODE (V2 enum; T0 acceptance semantically Contract accepted by T0: YES); Decision state CLOSED; correction budget 1; correction batches used 1; next gate TIER1_IMPLEMENTATION_FREEZE; baseline pinned at 3a3d1a4; zero open Owner decisions. Key corrections: 4.3 least-authority hrp_staffing_order_visible_for (C-02, HR_STAFF only, no ADMIN/HR_MANAGER/PM/SALE); new hrp_project_recruiter_visible_for (C-03, SELECT-only); separate narrowly-scoped PERMISSIVE policies per table (C-04, no DROP, no broad FOR ALL); 4.6 application-to-handler bridge (C-05, claim race, ORDER_RECRUITER_CLAIM); 5.1 sensitive data boundary (C-06, masked pre-claim); 6 threat table: dual-authority Placement (C-07) and deterministic revoke lock-order (C-08); 7 BUILD_VS_ADOPT updated + 7.2 frozen-task integration (C-11); 8 E2E chain expanded to AC-E2E-01..AC-E2E-22 (C-12); 10 allowlist expanded (C-11). | T0 -> T1C - P1-A0.4 Contract Correction v1.1 - C-01..C-12 |