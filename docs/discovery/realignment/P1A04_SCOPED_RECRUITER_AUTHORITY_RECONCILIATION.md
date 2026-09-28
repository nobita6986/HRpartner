# P1-A0.4 — Scoped Recruiter Authority — Reconciliation

**Pipeline V2 — Discovery / Realignment**

| Field | Value |
| --- | --- |
| Doc type | `discovery/realignment` |
| Spec version | `v1.0` (planning-round draft) |
| Status | `PROPOSED_ONLY` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Assurance lane | `CRITICAL` |
| Audit mode (TASK) | `LIGHT` |
| Baseline | `origin/main @ f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7` |
| Worktree (planning) | `C:\CodeApp\HrP-t1c-p1a04` |
| Branch (planning) | `codex/t1c-p1a04-scoped-recruiter-authority` |
| Owner of this doc | T1C (Tier 1) |
| Next gate | `T0_CONTRACT_REVIEW` (planning-only round; no Tier 3 call) |

## 0. Purpose & scope

This document reconciles the **current state** of how the `HR_STAFF` role
("Chuyên viên tuyển dụng" / operational recruiter) is treated across the
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
  → StaffingOrder / StaffingOrderSlot
  → JobOpening (1:1 to slot — V6 P1 split)
  → JobPosting (1:1 to opening — public-facing)
  → CandidateSubmission (public apply) → CandidateIntake
  → LaborProfile (canonical identity)
  → PlacementCase (case lifecycle)
  → Placement (SELECTED → CONFIRMED → EFFECTIVE/FAILED/CANCELLED)
  → outsourced worker assignment at the client
```

`HR_STAFF` is the **operational recruiter** that moves demand through this
flow. They are not internal payroll staff, not `WORKER`, not `EMPLOYEE`, not
`PM`, not `SALE`.

### 0.2 Out of scope (already covered or explicitly excluded)

- `LaborProfile` handling / `LaborProfileHandlingAssignment` — that aggregate
  is keyed to a LaborProfile, not to a StaffingOrder. It is **not** safe to
  adopt as a fake StaffingOrder assignment (see §3).
- Internal attendance/payroll/leave modules — these do not define the
  authorization model for this task. Attendance/timesheet is relevant only
  where it concerns outsourced labor delivered to a client (i.e. downstream of
  Placement).
- n8n workflows / direct n8n DB access / PII export — explicitly forbidden
  by Owner.
- `PM` and `SALE` authority expansion — explicitly excluded by Owner.
- Production migration — the production migration gate is **owned by T0**
  and is **not** run from this branch in any round.

## 1. Capability matrix — current treatment of HR_STAFF

Phân loại sử dụng các tag:

- `IMPLEMENTED` — code đã ở trên `origin/main`, không cần sửa.
- `PARTIAL` — code một phần ở main, còn lại phải bổ sung trong task mới.
- `MISSING` — chưa có trên main, cần task mới.
- `REFERENCE_ONLY` — chỉ là tài liệu/decision log.
- `OUT_OF_SCOPE` — thuộc task khác.

### 1.1 Project / L1 scope

| Capability | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| `buildProjectScope` returns `{ id: '__IMPOSSIBLE__' }` for unknown roles, `{}` (no constraint) for ADMIN/HR_MANAGER/DIRECTOR/SALE, PM by pmUserId, WORKER by self+public, MKT by public, VENDOR_ADMIN/VENDOR_STAFF by self/public, CTV by public | `IMPLEMENTED` | `src/shared/auth/scopes/project.scope.ts:10` | HR_STAFF branch at lines 64-67 currently returns `{}` — **same as root branches** with a comment "Phase 3 sẽ narrow". |
| HR_STAFF + HR_MANAGER + ACCOUNTANT are listed in the same fallback that returns `{}` | `PARTIAL` | `src/shared/auth/scopes/project.scope.ts:64-72` | This is a **deliberate Phase-2 placeholder**, not a security boundary. RLS is the floor. |
| L2 RLS via `hrp_project_visible_for` rejects HR_STAFF (`hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','SALE')` … — HR_STAFF absent) | `IMPLEMENTED` | `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql:6-13` | At the SQL layer, `HR_STAFF × projects → 0`. The matrix test (`src/shared/auth/matrix-scope.test.ts:119-123`) explicitly asserts this. |
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
| L2 RLS on `staffing_orders` uses `hrp_project_visible_for(project_id)` — HR_STAFF rejected | `IMPLEMENTED` | `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql:35-39` | Same footgun as Project — currently zero visibility at DB, but no L1 safety net. |
| `updateStaffingOrderStatus` allows `['ADMIN', 'HR_MANAGER', 'SALE']` only (HR_STAFF denied) | `IMPLEMENTED` | `src/domains/staffing/order.service.ts:204-209` | HR_STAFF cannot change order status. This is one of the few hard app-layer checks. |

### 1.3 JobOpening / JobPosting L1 scope

| Capability | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| No `buildJobOpeningScope` / `buildJobPostingScope` exists in `SCOPE_REGISTRY` | `MISSING` | `src/shared/auth/scopes/index.ts` (no entry for these models) | L1 throws `DENY_BY_DEFAULT` for non-root on JobOpening/JobPosting. |
| L2 RLS on `job_openings` and `job_postings` uses `hrp_project_visible_for(project_id)` — HR_STAFF rejected | `IMPLEMENTED` | `prisma/migrations/20260908001_job_opening_posting_split/migration.sql:74-126` | Same footgun: HR_STAFF sees zero JobOpenings/JobPostings at DB, but no L1 safety net. |
| `listJobPostingsForAdmin` and `getJobPostingForAdmin` **do not take `AuthContext`** | `PARTIAL` | `src/domains/staffing/job-posting-list.service.ts:110, 183` | They rely on `withDbContext` GUC + L2 RLS only. There is no app-layer narrowing for HR_STAFF. |
| `POST /api/admin/jobs/job-postings` create-route | `PARTIAL` (current) | `app/api/admin/jobs/job-postings/route.ts` | Already CRITICAL lane + audit-adopted in P1-A0.3 (`f3a3d1a4`). Role guard for create is HR_MANAGER today (per OQ-01 evidence in P1-A0.3 task); HR_STAFF was the failing case under investigation. |

### 1.4 Application / LaborProfile handling

| Capability | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| `LaborProfileHandlingAssignment` (User↔LaborProfile) is the canonical recruiter-style aggregate | `IMPLEMENTED` | `prisma/schema.prisma:1766`; migration `20260918000000_aff05a_labor_profile_handling_assignment` | Different aggregate — keyed to `laborProfileId`. Cannot be safely adopted for StaffingOrder authority (see §3). |
| `managerAssign` rejects non-HR_STAFF/non-HR_MANAGER as assignee | `IMPLEMENTED` | `src/domains/talent/handling-assignment.service.ts:116-118` | HR_STAFF and HR_MANAGER are valid assignee roles for LaborProfile. |
| Active duplicate assignment for LaborProfile is prevented by app-layer (close-active-then-insert) | `IMPLEMENTED` | `src/domains/talent/handling-assignment.service.ts:38-49` | No DB partial unique on `labor_profile_handling_assignments` for active rows — relies on app layer + tx semantics. |
| `app/admin/labor-profiles/page.tsx` allows `['ADMIN', 'HR_MANAGER', 'HR_STAFF']` | `IMPLEMENTED` | `app/admin/labor-profiles/page.tsx:16` | UI-level allowlist only — does not check any per-LaborProfile assignment. Page is a global list of all LaborProfiles; HR_STAFF today can read all LaborProfiles because there is no per-row assignment scope enforced at L1 for LaborProfile listing (only the detail read service masks sensitive fields by permission). |

### 1.5 Recruiter workbench (P1-E0 / P1-E1)

| Capability | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| `view=MINE` filter scopes workbench rows to `assigneeUserId = ctx.userId` (via active `LaborProfileHandlingAssignment`) | `IMPLEMENTED` | `docs/discovery/realignment/P1CD_P1E_RECRUITER_WORKBENCH_RECONCILIATION.md` §3 R-D5; P1-E0 TASK §5 | Recruiter-style scoping is already established **at the LaborProfile level** via handling-assignment. The new task introduces the **StaffingOrder-level** analogue. |
| `view=ALL` requires `CAN_VIEW_UNASSIGNED_POOL` (or being root/HR_MANAGER) | `IMPLEMENTED` | P1-E0 TASK §5 | Existing model uses a permission-code gate at the read service. The new task may use the same pattern. |

### 1.6 PlacementCase / Placement

| Capability | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| `PLACEMENT_ROLES = ['ADMIN', 'HR_MANAGER']` — HR_STAFF is denied at preview/activate | `IMPLEMENTED` | `src/domains/staffing/assignment-placement.service.ts:47, 290-294` | Hard app-layer denial. HR_STAFF cannot operate Placement commands today. |
| `PlacementCase` has no `assigneeUserId` field | `IMPLEMENTED` | `prisma/schema.prisma` (PlacementCase model) | Active handler is derived from `LaborProfileHandlingAssignment`, not stored on the case. |
| `openPlacementCase` is idempotent + race-safe via `withIdempotency` + SAVEPOINT | `IMPLEMENTED` | `src/domains/talent/placement-case.service.ts:55-81, 111-150` | The canonical helper pattern to reuse for assignment-side commands. |

### 1.7 Permission catalog — HR_STAFF base grants

| Permission | Tag | Evidence | Notes |
| --- | --- | --- | --- |
| `CAN_CREATE_WORKER` | `IMPLEMENTED` | `prisma/seed.mjs:549` | HR_STAFF can create a worker profile. |
| `CAN_PROCESS_TICKET` | `IMPLEMENTED` | `prisma/seed.mjs:550` | HR_STAFF can cancel/pay/reject tickets. |
| `CAN_MANAGE_MEDIA` | `IMPLEMENTED` | `prisma/seed.mjs:551` | HR_STAFF can manage the media library. |
| `CAN_PUBLISH_JOB` (and similar job-publish permission) | `MISSING` | `prisma/seed.mjs` does not grant this to HR_STAFF | Under the new scoped model, HR_STAFF assigned to an order MAY publish JobPostings for that order's eligible slots — this requires a new scoped permission (e.g. `CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS`) granted to HR_STAFF. |

## 2. L1/L2 inconsistency summary (for HR_STAFF today)

| Surface | L1 app-scope (Prisma extension / `buildXxxScope`) | L2 RLS (`hrp_*_visible_for`) | Effective today | Risk if RLS is bypassed |
| --- | --- | --- | --- | --- |
| Project | `{}` (full) | `false` for HR_STAFF | zero visibility | global visibility |
| StaffingOrder | `{}` (full) | `false` (via project_id) | zero visibility | global visibility |
| StaffingOrderSlot | `{}` (full) | inherits from parent order | zero visibility | global visibility |
| JobOpening | no builder → `DENY_BY_DEFAULT` | `false` (via project_id) | zero visibility | unchanged (L1 throws) |
| JobPosting | no builder → `DENY_BY_DEFAULT` | `false` (via project_id) | zero visibility | unchanged (L1 throws) |
| CandidateSubmission | per-route L1 narrowing | unknown (separate task) | per-route behavior | route-specific |
| LaborProfile list | none (no L1 builder) | per-LaborProfile assignment on workers side | reads all but PII mask | reads all PII (masked) |
| PlacementCase | per-handler derivation in workbench | none | read-via-workbench only | reads all on direct read |
| Placement | `PLACEMENT_ROLES` app check | (FORCE RLS on assignments) | hard denial | unchanged |

**Conclusion.** The current behavior is "correct by RLS floor". The L1 layer
is **not** a defense in depth for HR_STAFF — it is a permissive no-op that
becomes a leak the moment any RLS policy is relaxed or any code path skips
`withDbContext`.

## 3. Existing User ↔ StaffingOrder assignment candidates

A key question raised by the directive: **can any existing aggregate be
adopted as a `User ↔ StaffingOrder` recruiter assignment?** Surveyed:

### 3.1 `LaborProfileHandlingAssignment` (`prisma/schema.prisma:1766`)

| Field | Value |
| --- | --- |
| Aggregate key | `(laborProfileId, assigneeUserId, status='ACTIVE')` |
| Lifecycle | `AFF_INITIAL` / `MANAGER_ASSIGNMENT` / `CASE_RESOLUTION` → `ACTIVE`/`COMPLETED`/`EXPIRED`/`TRANSFERRED`/`REVOKED` |
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
3. **No DB-level partial unique** today — relies on app-layer close-then-insert.
   Owner decision 8 requires the new aggregate to enforce active-uniqueness
   via DB partial unique index.
4. **Shared model would couple concerns** — LaborProfile-handling is part of
   candidate resolution (P1-C), not recruiter demand authority (P1-A0.4).
   A recruiter handling a LaborProfile because they handled the slot is
   derivable from the new aggregate + the canonical flow; the reverse is not.

### 3.2 `Project.pmUserId` / `Project.subPmUserId1` / `Project.subPmUserId2`

Already used for PM scope. Wrong role, wrong model — see
`buildProjectScope` PM branch.

### 3.3 `Worker.assignedToId`

Referenced by `hrp_worker_visible_for` for HR_STAFF's worker-row scope
(migration `20260821103500_m13_restore_rls_matrix/migration.sql:17`). This is
the closest precedent for HR_STAFF authority at the SQL layer — it shows the
**pattern** of gating HR_STAFF by a user FK on the protected table.

But it cannot host `staffingOrderId` (FK type mismatch), and the field is a
single nullable FK, not an auditable aggregate. Reusing it would require
making `assignedToId` polymorphic, which the schema does not support.

### 3.4 Decision

A **new additive aggregate** is required:

```
StaffingOrderRecruiterAssignment
  id                uuid
  staffingOrderId   uuid FK → staffing_orders(id) ON DELETE RESTRICT
  recruiterUserId   uuid FK → users(id) ON DELETE RESTRICT
  assignedByUserId  uuid FK → users(id) ON DELETE RESTRICT
  assignedAt        timestamptz NOT NULL DEFAULT now()
  revokedAt         timestamptz NULL
  revokedByUserId   uuid NULL FK → users(id) ON DELETE RESTRICT
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

**Audit provenance (Owner decision 7)** — fields covered:

- `staffingOrderId` ✓
- `recruiterUserId` ✓
- `assignedByUserId` ✓
- `assignedAt` ✓
- `revokedAt` (nullable) ✓
- optional `reason` ✓ (and `revokedByUserId` for symmetry; not strictly required
  by Owner decision but consistent with the LaborProfileHandlingAssignment
  pattern).

**DB-level invariant (Owner decision 8)** — partial unique index added in
the migration:

```sql
CREATE UNIQUE INDEX staffing_order_recruiter_assignments_active_unique
  ON staffing_order_recruiter_assignments (staffing_order_id, recruiter_user_id)
  WHERE revoked_at IS NULL;
```

### 4.2 Migration posture (forward-only, additive)

Migration name pattern:
`prisma/migrations/<UTC-timestamp>_p1a04_scoped_recruiter_assignment/migration.sql`.

Migration SQL outline (additive; no DROP, no DISABLE RLS):

1. `CREATE TABLE staffing_order_recruiter_assignments (...)` — exact column
   set above.
2. `ALTER TABLE` adding FKs `ON DELETE RESTRICT` (preserve audit rows).
3. `CREATE UNIQUE INDEX … WHERE revoked_at IS NULL` for active uniqueness.
4. `CREATE INDEX` on `(recruiter_user_id) WHERE revoked_at IS NULL` for
   "my assigned orders" lookups.
5. `GRANT SELECT, INSERT, UPDATE ON … TO app_user_writer` — no DELETE grant
   (revoke is an update of `revoked_at`).
6. **Do NOT** enable RLS on this table in this round. The new aggregate is
   authority-of-truth for assignment scope; gating it behind RLS would
   produce a chicken-and-egg with the RLS policy itself. L1 app-side
   authority check (HR_MANAGER/ADMIN only) is sufficient.

**Rollback posture.** Forward-only:

- **Soft revert** (preferred): leave the table in place; flip the `revokedAt`
  flag on every row (so the active set is empty); the new code path becomes a
  no-op and HR_STAFF reverts to the prior "zero visibility" behavior.
- **Hard revert**: a follow-up migration that DROPs the table and indexes.
  Forward-only; never revert this migration in-place.

### 4.3 SECDEFINER helper (recommended)

To keep L1 narrow and reuse the same shape as `hrp_project_visible_for`,
add a `SECURITY DEFINER` helper:

```sql
CREATE OR REPLACE FUNCTION hrp_staffing_order_visible_for(sid text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','SALE')
    OR (hrp_session_role() = 'PM' AND EXISTS (
      SELECT 1 FROM staffing_orders so
      JOIN outsourcing_projects p ON p.id = so.project_id
      WHERE so.id = sid
      AND (p.pm_user_id = hrp_session_user_id()
        OR p.sub_pm_user_id_1 = hrp_session_user_id()
        OR p.sub_pm_user_id_2 = hrp_session_user_id())))
    OR (hrp_session_role() = 'HR_STAFF' AND EXISTS (
      SELECT 1 FROM staffing_order_recruiter_assignments a
      WHERE a.staffing_order_id = sid
      AND a.recruiter_user_id = hrp_session_user_id()
      AND a.revoked_at IS NULL));
$$;
```

**Note.** SALE/PM semantics are NOT expanded by this task (Owner decision 12).
Their inclusion in the helper is **identical to today's** behavior for the
SALE/PM branches — the helper is additive only in the HR_STAFF branch. PM
scope continues to derive from project assignment (per `buildProjectScope`).
SALE continues to see all orders (today's behavior, by project).

Then layer a narrow new RLS policy on `staffing_orders` (and `staffing_order_slots`
via parent) **without** relaxing the existing policy — the new policy is
additive OR over the existing root/PM/SALE branches. Concretely:

```sql
-- Replace the existing hrp_staffing_order_scope policy with an additive OR.
DROP POLICY IF EXISTS hrp_staffing_order_scope ON staffing_orders;
CREATE POLICY hrp_staffing_order_scope ON staffing_orders
  AS PERMISSIVE FOR ALL TO app_user_writer, app_user
  USING (hrp_project_visible_for(project_id) OR hrp_staffing_order_visible_for(id))
  WITH CHECK (hrp_project_writable(project_id));
```

Because `hrp_project_visible_for` returns false for HR_STAFF, the new branch
is **only ever true for HR_STAFF when an active assignment exists**. The
additive OR is safe — it can only widen visibility for HR_STAFF who has an
active assignment, and never for any other role.

### 4.4 Propagation to slots, openings, postings, cases

- **`staffing_order_slots`** already inherits from `staffing_orders` via the
  parent FK. Once the new helper gates the order, slots inherit the same
  narrowing transitively (the slot's `staffing_order_id` is in scope if and
  only if its parent order is in scope). Verify by re-running
  `matrix-scope.test.ts` against the new policy — HR_STAFF should now see
  slots under assigned orders and zero under unassigned orders.
- **`job_openings` and `job_postings`** route through
  `hrp_project_visible_for`. To narrow for HR_STAFF, two paths:
  - **Path A (preferred, additive).** Update the existing RLS policies to OR
    with a new helper that resolves via
    `staffing_orders.project_id` → `staffing_order_recruiter_assignments`.
    This requires a new subquery expression. Migration is a no-op DROP+CREATE
    of the policy.
  - **Path B (alternative).** Add a SECOND policy on the same table with
    `FOR SELECT TO app_user_writer USING (...)`. RLS policies on a table OR
    together. This is forward-only and easier to roll back.

  Both paths are forward-only and survive T0 review. Path A is more compact;
  Path B is more surgical.

- **`candidate_submissions`** are created by public apply — visibility is
  governed by `candidate_submission` RLS + per-application workbench
  derivation. The new aggregate does NOT need to gate applications directly
  because the existing workbench handler derivation (via
  `LaborProfileHandlingAssignment`) already handles this for assigned HR_STAFF.
  The new aggregate only governs the **slot-level** recruiter authority
  (open/close posting for the slot, post Placement commands for the slot).

### 4.5 L1 app-scope changes (narrow, additive)

After RLS is in place, tighten the L1 layer so the footgun is closed:

```typescript
// src/shared/auth/scopes/staffing.scope.ts (proposed patch)
export function buildStaffingOrderScope(ctx: AuthContext): Prisma.StaffingOrderWhereInput {
  // root + SALE + DIRECTOR see all (unchanged)
  if (['ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'SALE', 'DIRECTOR'].includes(ctx.role)) {
    return {};
  }

  // HR_STAFF — narrow to active assignments
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

  // PM unchanged — by project
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
  (already the message — keep it; do NOT distinguish).
- `listJobPostingsForAdmin` for HR_STAFF:
  rely on RLS narrowing; the query returns empty. Do not add per-row
  404 distinctions.
- Slot eligibility predicate for HR_STAFF:
  must JOIN against `staffing_order_recruiter_assignments` (active) before
  returning the slot. An HR_STAFF who tries to create a JobPosting for an
  unassigned slot gets 404 (slot not eligible), not 403 (slot exists).

## 6. Threat model

| Threat | Vector | Mitigation |
| --- | --- | --- |
| **Race on assignment creation** | Two admins assign the same recruiter simultaneously | DB partial unique index on `(staffing_order_id, recruiter_user_id) WHERE revoked_at IS NULL` (Owner decision 8). Race loses with P2002; service translates to `ASSIGNMENT_ALREADY_EXISTS` 409. |
| **Race on assignment + read** | Admin revokes right as HR_STAFF is mid-read | Use `withDbContext` + RLS at row read time, not stale JWT-derived scope. HR_STAFF's `tx` will see revoked row → not visible. No special handling. |
| **Stale JWT vs revocation** | HR_STAFF's JWT still valid 5 minutes after revoke | RLS is evaluated at query time against `app.user_id` + the active-assignment subquery — JWT expiry is irrelevant. The auth layer does not cache the assignment set; each transaction re-resolves. |
| **Information oracle (slot existence)** | HR_STAFF queries `GET /api/admin/staffing/orders/{id}` for an order they are not assigned to | Route returns 404 (no 403). Body does not distinguish "exists but not yours" from "does not exist". Same message as a truly missing order. |
| **Information oracle (slot enumeration)** | HR_STAFF attempts to list slots under an unassigned order | List endpoint's WHERE clause includes the active-assignment filter at L1; RLS narrows at L2. Empty list returned for HR_STAFF on unassigned orders. |
| **Information oracle (assignment existence)** | HR_STAFF tries to read another HR_STAFF's assignment | No read endpoint exposed to HR_STAFF for the assignment table itself. Assignment list is admin/HR_MANAGER-only. |
| **Privilege escalation via SALE/PM parity** | HR_STAFF reuses PM/SALE branches in scope builders | All scope builders explicitly branch on role. PM scope is unchanged. HR_STAFF branch is the new narrowing branch. No shared code path. |
| **Migration rollback exposing ghost assignments** | Operator reverts the migration in place | Migration is forward-only; rollback = soft-revert via `revokedAt` on all rows. Hard revert requires a follow-up migration, never an in-place revert. |
| **PII export via assignment aggregate** | Admin queries recruiter assignments and sees candidate names | Aggregate does NOT carry candidate/labor profile data. Only `staffingOrderId`, `recruiterUserId`, `assignedByUserId`, timestamps, reason. No PII. |
| **Forced overwrite via UPDATE without revoke** | Concurrent mutation tries to overwrite an active row | Partial unique index prevents two ACTIVE rows; mutation must first revoke (UPDATE `revoked_at`) then INSERT. Service enforces this in app layer. |
| **Use of revoked assignment as audit evidence** | Auditor queries `WHERE revoked_at IS NOT NULL` to see history | Revoked rows are NOT deleted; audit query supports `revoked_at IS NULL` and `IS NOT NULL` filters. |
| **Self-revoke / self-assign** | HR_STAFF attempts to assign themselves to an order | Authority check (`requireRole(['ADMIN','HR_MANAGER'])`) is performed BEFORE the assignee validation. HR_STAFF never reaches the assignment endpoint. |
| **Revoke during in-flight write** | HR_STAFF opens a JobPosting create → admin revokes → tx completes | The JobPosting create runs inside `withDbContext`; the slot eligibility revalidation JOINs active assignments at COMMIT time. If revoked, the row is not visible at COMMIT — Prisma `create` succeeds in tx but the slot is filtered out, producing `SlotNotEligible` 4xx. Audit logs preserve the partial state for reconciliation. |

## 7. BUILD_VS_ADOPT analysis

### 7.1 Library/framework adoption — `ADOPT` (existing primitives only)

This task does NOT introduce new external libraries. It reuses:

- `AuthContext` (`src/shared/auth/auth-context.ts`) — unchanged shape.
- `withDbContext` (`src/shared/auth/with-db-context.ts`) — unchanged.
- `resolveEffectivePermissions` (`src/shared/auth/permission-resolver.ts`) —
  unchanged; the new scoped permission (if introduced) is added to the
  catalog with a documented scope.
- `PERMISSION_CATALOG` (`src/shared/auth/permission-catalog.ts`) — add new
  code(s) only if implementation requires them; default is to gate at the
  aggregate level via `withDbContext` rather than adding a new permission.
- `withIdempotency` (`src/shared/integrity/idempotency.ts`) — for the
  assignment/revocation commands (mutating the assignment table) to satisfy
  the canonical integrity gate.
- `DataTable` + form primitives (`src/shared/ui/data-table/...`,
  `src/shared/ui/forms/...`) — for the Admin/HR-Manager UI.
- The `LaborProfileHandlingAssignment` aggregate (W5 + AFF-05A R1 + R2) as
  the **design precedent** for the new aggregate, not as a structural reuse.

### 7.2 Automation/orchestration — `N/A`

This task does not introduce connectors, schedulers, notification workers,
or multi-system workflows. Assignment/revocation is an in-app
human-triggered UI/API flow. n8n is explicitly out of scope (Owner
decision 16).

### 7.3 Schema migration — `ADOPT` (existing migration framework)

The additive aggregate follows the existing Prisma migration framework
(`prisma/migrations/<UTC>_*/migration.sql`) and the canonical forward-only
ROLLBACK posture documented in `PLAN.md`. No new tooling.

## 8. Final E2E acceptance (Owner-mandated)

The contract must encode an end-to-end AC chain that walks the canonical
recruitment flow under scoped recruiter authority:

```
AC-E2E-01  ADMIN creates StaffingOrder SO-X with N slots
AC-E2E-02  ADMIN/HR_MANAGER assigns HR_STAFF-Alice to SO-X via assignment UI/API
AC-E2E-03  HR_STAFF-Alice logs in (fresh JWT) — AuthContext.role=HR_STAFF, userId=Alice.id
AC-E2E-04  Alice calls GET /api/staffing/orders — sees ONLY SO-X (no other orders, no count oracle)
AC-E2E-05  Alice calls GET /api/staffing/orders/{SO-Y.id} for an unassigned order — uniform 404
AC-E2E-06  Alice calls GET /api/staffing/orders/{SO-X.id}/slots — sees slots of SO-X
AC-E2E-07  Alice calls listEligibleSlotsForNewJobPosting — only SO-X's slots are returned
AC-E2E-08  Alice POST /api/admin/jobs/job-postings { slotId: SO-X.slot[0] } — 201 (or 200 + idempotency replay)
AC-E2E-09  Alice PATCH publish JobPosting — 200, status=PUBLISHED
AC-E2E-10  Public user GET /api/jobs?slug=... — sees Alice's posting
AC-E2E-11  Public user POST /api/public/jobs/{slug}/apply — 201 (canonical apply path, unchanged)
AC-E2E-12  Alice reads candidate submission, scores LaborProfile (canonical helper)
AC-E2E-13  Alice opens PlacementCase (canonical helper, idempotency)
AC-E2E-14  Alice previews Placement — succeeds if assigned to SO-X; fails closed otherwise
AC-E2E-15  HR_STAFF-Bob (NOT assigned to SO-X) attempts the same flow — uniform 404 / empty list at every step
AC-E2E-16  ADMIN/HR_MANAGER revokes Alice's assignment
AC-E2E-17  Alice's NEXT request to /api/staffing/orders returns empty list
AC-E2E-18  Existing in-flight ops (create JobPosting, publish, etc.) by Alice that were authorized at start may complete or fail-closed depending on the tx-local snapshot — documented in §6
```

The TASK contract must include AC-E2E-01..AC-E2E-18 as AC rows with
synthetic DB integration plan (Owner decision: "synthetic DB integration
plan"), explicit allowlist and forbidden paths, and exactly two docs files
changed.

## 9. Open Owner decisions

The directive closes all 17 locked decisions. This doc surfaces zero
unresolved Owner questions at the planning level.

If during implementation a previously-closed decision needs revisiting (e.g.
SALE expansion is requested mid-task), Tier 1 stops and returns to T0 per
the pipeline's "do not silently expand Owner decisions" rule.

## 10. File allowlist (carries into TASK)

This planning doc does NOT modify any file. The TASK contract defines the
file allowlist for the implementation round; the expected allowlist shape
includes:

- `prisma/schema.prisma` — additive model `StaffingOrderRecruiterAssignment`.
- `prisma/migrations/<UTC>_p1a04_scoped_recruiter_assignment/migration.sql`
  — additive migration, forward-only.
- `prisma/seed.mjs` — optional seed for a synthetic test recruiter (HR_STAFF
  + assigned to a synthetic StaffingOrder).
- `src/shared/auth/scopes/staffing.scope.ts` — narrow HR_STAFF branch.
- `src/shared/auth/scopes/project.scope.ts` — narrow HR_STAFF branch (move
  from `{}` to explicit scope).
- `src/domains/staffing/order.service.ts` — narrow slot-eligibility predicate.
- `src/domains/staffing/job-posting-authoring.service.ts` — narrow slot
  eligibility for create path.
- New `src/domains/staffing/recruiter-assignment.service.ts` — assignment
  CRUD with `withIdempotency`.
- New `app/api/admin/staffing/recruiter-assignments/**` — assignment API.
- New `app/admin/staffing/recruiter-assignments/**` — assignment UI.
- `tests/db/**` — synthetic DB integration tests (assignment lifecycle,
  fail-closed, revoke propagation).
- `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/{TASK.md,HANDOFF.md,evidence/**}`.

**Forbidden** (explicit non-goals):

- `prisma/schema.prisma` model changes beyond additive model + relations.
- `src/domains/attendance/**` (no authority definition from attendance).
- `src/domains/finance/**`.
- `src/lib/auth/session.ts` (no JWT shape change).
- `package.json` / `package-lock.json` (no new dependency).
- Sidebar IA/label change.
- `docs/PLANNER_HANDOVER.md` (T0-owned).
- n8n workflow files.
- `src/domains/applications/conversion.service.ts` (P1-B frozen).
- Direct DB writes from background jobs / n8n.

## 11. Verification (this doc)

- `git diff --check` → không cảnh báo.
- UTF-8 strict, no BOM.
- LF only.
- U+FFFD = 0.
- Mojibake = 0.
- Exactly two docs files changed (`docs/discovery/realignment/P1A04_*.md` and
  `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`).
- No source/schema/migration/package/lockfile modification.

## 12. Tóm tắt

- HR_STAFF hiện được điều phối bởi **RLS floor only**; L1 app-scope là
  permissive no-op. Footgun thật nếu RLS bị relax/bypass.
- `LaborProfileHandlingAssignment` không thể adopt làm aggregate cho
  StaffingOrder (sai root, sai revoke semantics, thiếu DB invariant).
- Cần một **aggregate additif mới** `StaffingOrderRecruiterAssignment` với
  partial unique index cho active uniqueness (Owner decision 8), audit
  provenance đầy đủ (Owner decision 7).
- Cần **SECDEFINER helper mới** `hrp_staffing_order_visible_for` để L2
  narrowing, OR với branch hiện tại (forward-only, không DROP policy cũ).
- L1 scope của HR_STAFF cần narrow từ `{}` sang điều kiện
  `recruiterAssignments.some` — chuyển từ "RLS floor only" sang
  "RLS floor + app narrowing".
- Fail-closed + information-oracle prevention: 404 thống nhất, không phân
  biệt 403/404 cho HR_STAFF trên unassigned orders.
- Threat model đầy đủ (race, revoke, stale session, oracle).
- BUILD_VS_ADOPT = `ADOPT` (tái sử dụng primitive hiện hữu, không thêm
  library).
- BUILD_VS_AUTOMATE = `N/A` (no connector/scheduler/notification).
- AC-E2E-01..18 bao phủ toàn bộ flow từ assignment → JobPosting → apply →
  Placement → revoke, bao gồm unassigned fail-closed isolation.
- **Không code / không cài package / không migration / không PR** trong
  round planning này. T0 sở hữu production migration gate.

---

*Doc này là planning-round duy nhất cho P1-A0.4. T0 review contract; Tier 1
mở implementation round mới trên worktree mới với baseline mới pin từ
origin/main, status `READY_TO_CODE` chỉ sau khi T0 chốt v1.0.*

## 13. Revision Log

| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v1.0` | 2026-09-28 | Tier 1 (T1C) | Initial reconciliation (PROPOSED_ONLY) | `T0 → T1C — P1-A0.4 Scoped Recruiter Authority — planning round` |
