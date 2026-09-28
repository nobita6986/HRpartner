# P1-A0.4 — Scoped Recruiter Authority — Reconciliation

**Pipeline V2 — Discovery / Realignment**

## 0. Header / control

| Field | Value |
| --- | --- |
| `Doc type` | `discovery/realignment` |
| `Spec version` | `v1.2` |
| `Status` | `T0_REVIEW` |
| `Delivery protocol` | `V2_FAST_FREEZE` |
| `Assurance lane` | `CRITICAL` |
| `Audit mode` | `LIGHT` |
| `Baseline` | `origin/main @ f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7` |
| `Worktree (planning)` | `C:\\CodeApp\\HrP-t1c-p1a04` |
| `Branch (planning)` | `codex/t1c-p1a04-scoped-recruiter-authority` |
| `Owner of this doc` | T1C (Tier 1) |
| `Contract gate` | `DRAFT` |
| `Contract accepted by T0` | `PENDING` |
| `Decision state` | `CLOSED` |
| `Correction budget` | `1` (exhausted by v1.1 batch `C-01..C-12`; v1.2 is an integrity repair using T0 integrity exceptions — not a fresh correction budget) |
| `T0 integrity exceptions used` | `1` (the v1.2 batch: encoding/schema/path/atomicity/control-truthfulness repair) |
| `Open Owner decisions` | `0` |
| `Next gate` | `T0_CONTRACT_REVIEW` |

## 1. Capability matrix — current treatment of HR_STAFF

| Surface | Current treatment | Evidence pointer |
| --- | --- | --- |
| `buildProjectScope` (project scope) | `HR_STAFF` falls into the `return {}` root branch (no narrowing). | `src/shared/auth/scopes/project.scope.ts` |
| `buildStaffingOrderScope` (StaffingOrder + StaffingOrderSlot) | `HR_STAFF` is in the root branch `return {}` (no narrowing). Slot scope inherits via parent. | `src/shared/auth/scopes/staffing.scope.ts` |
| `Project` RLS (canonical helper `public.hrp_project_visible_for`) | `HR_STAFF` returns false (no visibility). | `prisma/migrations/20260816211000_s1_rls_project` and `20260821103500_m13_restore_rls_matrix` |
| `StaffingOrder` + slot L1/L2 | `HR_STAFF` sees ALL orders (root branch `return {}`) — too broad. | `src/shared/auth/scopes/staffing.scope.ts` |
| `JobOpening` + `JobPosting` RLS | Reachable from project scope; `HR_STAFF` cannot reach Project; therefore cannot reach openings/postings today. | `prisma/migrations/*` RLS history |
| `JobPosting` authoring (`listEligibleSlotsForNewJobPosting` + creation) | Pure ADMIN/HR_MANAGER today (no HR_STAFF path). | `src/domains/staffing/job-posting-authoring.service.ts`; `src/domains/staffing/job-posting-list.service.ts` |
| Application / `LaborProfile` / `LaborProfileHandlingAssignment` path | Canonical AFF-05A R1/R2 precedent; recruiter-handler pairing derivation. | `prisma/migrations/20260922160000_aff05a_r1_initial_handling_window` |
| Recruiter workbench (Workbench `MINE`) | HR_STAFF-readable read surface; `MINE` requires an active `LaborProfileHandlingAssignment`. | `src/domains/talent/recruiter-workbench.read-service.ts`; `app/admin/recruiter-workbench/**` |
| PlacementCase / Placement F0/F1 (`PLACEMENT_ROLES`) | Today `PLACEMENT_ROLES = [ADMIN, HR_MANAGER]` only; HR_STAFF has no placement path. | `src/domains/talent/placement.service.ts`; `src/domains/talent/placement.commands.ts`; `src/domains/talent/placement-case.service.ts`; `src/domains/talent/placement.route-helpers.ts` |

## 2. L1/L2 inconsistency summary (for HR_STAFF today)

`HR_STAFF` today flows through `hrp_project_visible_for` (which returns false for HR_STAFF) AND through the legacy L1 `src/shared/auth/scopes/staffing.scope.ts` whose HR_STAFF branch currently returns `return {}` (root/no-narrowing). The v1.2 slice keeps that L1 file as the authorized allowlist path but **narrows** its HR_STAFF branch to the active `StaffingOrderRecruiterAssignment` predicate, AND adds a narrowly-scoped RLS policy per table at L2, without modifying the root/global branch of `public.hrp_project_visible_for` or `public.hrp_project_writable`.

## 3. Existing User ↔ StaffingOrder assignment candidates

| Candidate | Verdict | Reason |
| --- | --- | --- |
| `LaborProfileHandlingAssignment` | CANNOT be safely adopted as a fake StaffingOrder recruiter assignment (structural non-fit). | (1) It is keyed by LaborProfile, NOT by StaffingOrder; (2) its `source` enum (`OUTREACH_BATCH_CLAIM`, `ORDER_RECRUITER_CLAIM`, etc.) is handler-bound, not authority-bound; (3) reusing it would conflate handler-routing with order authority; (4) it would force the Operation Order ↔ Unclaimed Queue reading to also gate by handler assignment; (5) per Owner decision 7 + 8, a dedicated additive table is the canonical contract. |

## 4. Additive schema/migration shape

### 4.1 New aggregate (`StaffingOrderRecruiterAssignment`)

`StaffingOrderRecruiterAssignment` is an additive aggregate per DEC-03, with audit-provenance fields per DEC-05 and the partial unique index per DEC-06. Schema shape (representative; production migration is the implementation round's deliverable):

```
model StaffingOrderRecruiterAssignment {
  id                    String   @id @default(uuid())
  staffingOrderId       String   @map("staffing_order_id")
  recruiterUserId       String   @map("recruiter_user_id")
  assignedByUserId      String   @map("assigned_by_user_id")
  assignedAt            DateTime @default(now()) @map("assigned_at")
  revokedAt             DateTime? @map("revoked_at")
  revokedByUserId       String?  @map("revoked_by_user_id")
  reason                String?  // null on assignment; set on revoke
  source                String   @default("ADMIN_ASSIGN")  // ADMIN_ASSIGN | ADMIN_REVOKE | ...
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  staffingOrder         StaffingOrder @relation(fields: [staffingOrderId], references: [id], onDelete: Restrict)
  recruiterUser         User          @relation("StaffingOrderRecruiter", fields: [recruiterUserId], references: [id], onDelete: Restrict)
  assignedByUser        User          @relation("StaffingOrderAssignedBy", fields: [assignedByUserId], references: [id], onDelete: Restrict)

  @@unique([staffingOrderId, recruiterUserId, revokedAt], name: "uniq_active_assignment_per_order_recruiter")
  @@map("staffing_order_recruiter_assignments")
}
```

The aggregate carries NO candidate/labor profile/PII data — only user
FKs and timestamps (DEC-16).

### 4.2 Migration posture (forward-only, additive)

**Truthfulness (T0 correction `C-04` / I-02).** No policy is `DROP POLICY`d. The new narrowly-scoped `PERMISSIVE` policies are **ADDED**; existing policies for existing roles remain byte/behavior equivalent. If a specific existing policy must be altered, the diff is recorded explicitly in HANDOFF and applied as a transactional forward-only migration. "Forward-only" means **no destructive schema/data rollback**; it does NOT mean "policy definitions can never change". No broad `FOR ALL` recruiter policy is introduced. SELECT, INSERT and UPDATE `USING` / `WITH CHECK` clauses are defined separately for each new policy. The migration SQL applies `SET search_path = pg_catalog, public` on every new helper (canonical SECURITY DEFINER posture per the most recent RLS backstop migration `20260826120000_m1_07a_ticket_rls_backstop`) and applies `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC` + `GRANT EXECUTE ON FUNCTION ... TO app_user_writer, app_user` to each new helper.

### 4.3 SECDEFINER helpers (least-authority)

Two narrowly-scoped SECDEFINER helpers are added. Each helper is least-authority — restricted to the single role that the new P1-A0.4 slice unlocks (`HR_STAFF`). Existing roles continue to flow through their existing canonical helpers / policies.

#### 4.3.1 `public.hrp_staffing_order_visible_for(sid text)` (C-02 / I-02)

Schema-qualified, `SECURITY DEFINER`, `LANGUAGE sql STABLE`. Identity is taken ONLY from the transaction GUC via the existing `public.hrp_session_role()` and `public.hrp_session_user_id()` helpers. The helper locks the canonical SECURITY DEFINER posture:

```sql
CREATE OR REPLACE FUNCTION public.hrp_staffing_order_visible_for(sid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    -- ONLY HR_STAFF can be made visible by this helper.
    -- All other roles continue to flow through their existing canonical
    -- helpers / policies (public.hrp_project_visible_for, etc.).
    public.hrp_session_role() = 'HR_STAFF'
    AND EXISTS (
      SELECT 1
        FROM public.staffing_order_recruiter_assignments a
       WHERE a.staffing_order_id = sid
         AND a.recruiter_user_id = public.hrp_session_user_id()
         AND a.revoked_at IS NULL
    );
$$;

REVOKE EXECUTE ON FUNCTION public.hrp_staffing_order_visible_for(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hrp_staffing_order_visible_for(text) TO app_user_writer, app_user;
```

The migration also documents the function-owner posture (the migration must be applied as a role that owns `public.staffing_order_recruiter_assignments`, which is the migration runner role per the existing migration framework). A static / migration test asserts: `search_path = pg_catalog, public`; grants are exactly `app_user_writer, app_user` (and not PUBLIC); owner is the migration runner; SQL column references use the real schema column names (`recruiter_user_id`, not `recruiterUserId`, etc.).

This helper **must not** be extended to short-circuit for ADMIN / HR_MANAGER / PM / SALE — those roles continue to flow through the existing canonical helpers / policies.

#### 4.3.2 `public.hrp_project_recruiter_visible_for(pid text)` (C-03 / I-02)

Schema-qualified, `SECURITY DEFINER`, `LANGUAGE sql STABLE`, same `SET search_path = pg_catalog, public` posture:

```sql
CREATE OR REPLACE FUNCTION public.hrp_project_recruiter_visible_for(pid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    public.hrp_session_role() = 'HR_STAFF'
    AND EXISTS (
      SELECT 1
        FROM public.staffing_orders so
        JOIN public.staffing_order_recruiter_assignments a
          ON a.staffing_order_id = so.id
         AND a.revoked_at IS NULL
       WHERE so.project_id = pid
         AND a.recruiter_user_id = public.hrp_session_user_id()
    );
$$;

REVOKE EXECUTE ON FUNCTION public.hrp_project_recruiter_visible_for(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hrp_project_recruiter_visible_for(text) TO app_user_writer, app_user;
```

Properties:

- `SELECT` only — there is NO `public.hrp_project_writable_recruiter` companion helper for HR_STAFF, and `HR_STAFF` is **NOT** added to the root/global branch of `public.hrp_project_visible_for` or `public.hrp_project_writable`.
- An assigned Project (one containing ≥1 `StaffingOrder` actively assigned to the user) is visible; an unassigned Project is invisible.
- Assigning one `StaffingOrder` in Project P does **NOT** reveal sibling orders in P — that visibility is gated by `public.hrp_staffing_order_visible_for(orderId)`, not by project membership.
- The matrix-scope test is updated: `HR_STAFF × projects` returns the assigned-project set only, not always `0`.

#### 4.3.3 Narrowly-scoped PERMISSIVE policies (C-04 / I-02)

The new policies are separate narrowly-scoped `PERMISSIVE` policies — one per table — with `USING` and `WITH CHECK` clauses defined **separately** for SELECT / INSERT / UPDATE. **No broad `FOR ALL` recruiter policy.**

All SQL examples below use the REAL column names per `prisma/schema.prisma` at `origin/main @ f3a3d1a4`:

- `job_openings.staffing_order_id` (NOT a different name)
- `job_postings.job_opening_id` (NOT a different name)
- `staffing_order_slots.staffing_order_id`

Derived link chain for JobPosting ↔ StaffingOrder: `job_postings.job_opening_id` → `job_openings.id` → `job_openings.staffing_order_id`.

```sql
-- Project: SELECT only for HR_STAFF (no INSERT/UPDATE/DELETE authority).
CREATE POLICY hrp_project_recruiter_select ON projects
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (public.hrp_project_recruiter_visible_for(id));

-- StaffingOrder: SELECT only for HR_STAFF (no INSERT/UPDATE/DELETE authority).
CREATE POLICY hrp_staffing_order_recruiter_select ON staffing_orders
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (public.hrp_staffing_order_visible_for(id));

-- StaffingOrderSlot: SELECT only for HR_STAFF (inherits via parent staffing_order_id).
CREATE POLICY hrp_staffing_order_slot_recruiter_select ON staffing_order_slots
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (
    EXISTS (
      SELECT 1
        FROM public.staffing_orders so
       WHERE so.id = staffing_order_slots.staffing_order_id
         AND public.hrp_staffing_order_visible_for(so.id)
    )
  );

-- JobOpening: SELECT only for HR_STAFF (via parent staffing_order_id,
-- the canonical FK per prisma/schema.prisma).
CREATE POLICY hrp_job_opening_recruiter_select ON job_openings
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (public.hrp_staffing_order_visible_for(staffing_order_id));

-- JobPosting: SELECT + INSERT + UPDATE for HR_STAFF on assigned-scope rows.
-- Chain: job_postings.job_opening_id -> job_openings.id -> job_openings.staffing_order_id
CREATE POLICY hrp_job_posting_recruiter_select ON job_postings
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (
    EXISTS (
      SELECT 1
        FROM public.job_openings jo
       WHERE jo.id = job_postings.job_opening_id
         AND public.hrp_staffing_order_visible_for(jo.staffing_order_id)
    )
  );

CREATE POLICY hrp_job_posting_recruiter_insert ON job_postings
  AS PERMISSIVE FOR INSERT TO app_user_writer
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.job_openings jo
       WHERE jo.id = job_postings.job_opening_id
         AND public.hrp_staffing_order_visible_for(jo.staffing_order_id)
    )
  );

CREATE POLICY hrp_job_posting_recruiter_update ON job_postings
  AS PERMISSIVE FOR UPDATE TO app_user_writer
  USING (
    EXISTS (
      SELECT 1
        FROM public.job_openings jo
       WHERE jo.id = job_postings.job_opening_id
         AND public.hrp_staffing_order_visible_for(jo.staffing_order_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.job_openings jo
       WHERE jo.id = job_postings.job_opening_id
         AND public.hrp_staffing_order_visible_for(jo.staffing_order_id)
    )
  );
```

Existing policies for existing roles (`ADMIN`, `HR_MANAGER`, `PM`, `SALE`, `DIRECTOR`, `ACCOUNTANT`, `VENDOR_*`) remain byte/behavior equivalent. If a specific existing policy must be altered, the diff is documented in HANDOFF and applied as a transactional forward-only migration.

The narrow-helper-and-policy set is exercised by synthetic-DB integration tests in the implementation round to confirm: `search_path` on each helper, grants exactly `app_user_writer, app_user`, helper owner is the migration runner, and column references use the real schema column names.

### 4.4 Propagation to slots, openings, postings, cases

- `staffing_order_slots` inherits from `staffing_orders` via the parent FK `staffing_order_slots.staffing_order_id`.
- `job_openings` SELECT is gated by `public.hrp_staffing_order_visible_for(job_openings.staffing_order_id)`.
- `job_postings` SELECT/INSERT/UPDATE are gated via the explicit policies above (chain: `job_postings.job_opening_id` → `job_openings.id` → `job_openings.staffing_order_id`).
- `candidate_submissions` — unclaimed queue is gated by the new read service (DEC-23). `LaborProfileHandlingAssignment` already exists for the claimed handler derivation (per the AFF-05A R1/R2 precedent; not polymorphic with the new aggregate, per DEC-23).

### 4.5 L1 app-scope changes (narrow, additive)

The L1 narrowing of `src/shared/auth/scopes/staffing.scope.ts` to `recruiterAssignments.some ... revokedAt: null` remains the canonical L1 path; the existing `src/shared/auth/scopes/project.scope.ts` is also narrowed for the Project SELECT authority via `public.hrp_project_recruiter_visible_for`. Neither L1 file is added to a global root branch for HR_STAFF; both narrow the HR_STAFF branch inside the existing L1 PRISMA path.

### 4.6 Application-to-handler bridge (C-05 / I-04 / I-05)

1. Public apply remains unchanged and creates `CandidateSubmission` / `LaborProfile` through the canonical P1-B authority.
2. `CandidateSubmission.staffingOrderSlotId` derives the `StaffingOrder` (via the slot's FK chain: `candidate_submissions.staffing_order_slot_id` → `staffing_order_slots.id` → `staffing_order_slots.staffing_order_id`).
3. All active recruiters assigned to that order may see an UNCLAIMED queue entry with privacy-safe / masked fields.
4. An assigned recruiter executes the claim candidate command `POST /api/admin/applications/{submissionId}/claim` (HR_STAFF only; new route, see §8).
5. First successful claim creates the canonical active `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM`.
6. The claim race is serialized using the repository's existing DB locking / advisory-lock pattern — exactly one recruiter wins.
7. Losers receive stable `409 HANDLING_ALREADY_CLAIMED`.
8. After claim, the candidate appears in that recruiter's existing Workbench `MINE` view.
9. Order authority is NOT faked by polymorphic reuse of `LaborProfileHandlingAssignment`.

The canonical public API endpoints used in the E2E flow are repository-exact per `git cat-file -e origin/main:<path>`:

- `GET /api/jobs/{slug}` — canonical public get (file: `app/api/jobs/[slug]/route.ts`).
- `POST /api/public/jobs/{slug}/applications` — canonical public apply (file: `app/api/public/jobs/[slug]/applications/route.ts`).

The public apply endpoint is NOT modified by this task (P1-B public apply and idempotency remain byte/behavior equivalent). This task only adds the new `POST /api/admin/applications/{submissionId}/claim` admin endpoint for HR_STAFF.

## 5. Fail-closed & information-oracle prevention

### 5.1 Sensitive data boundary (C-06 / I-06)

`StaffingOrder` assignment alone does NOT grant global worker/candidate PII. The sensitive data boundary is locked as follows:

| State | Data surfaced |
| --- | --- |
| Unclaimed (no `LaborProfileHandlingAssignment`) | Only masked / minimal application fields: `submissionId`, slot-derived orderId (only when assigned), timestamp, status badge. **No phone, no CCCD, no raw evidence, no full LaborProfile fields.** |
| Claimed (active `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM`) | The active winning handler receives only the recruiter-contact fields required for recruitment. **Post-claim phone may be the full contact phone** when that is what the recruiter needs to call the candidate, **but it is returned only to the active handler for the relevant LaborProfile**. |
| CCCD image / raw evidence | Remains outside this task's authorization path. Requires the existing evidence authorization path. No global `CAN_VIEW_WORKER_SENSITIVE` grant to HR_STAFF. |
| Unassigned HR_STAFF | Empty / 404 responses. No existence oracle. |
| Loser / revoked handler / unassigned HR_STAFF | Cannot read the candidate (no PII path). |

## 6. Threat model

| Threat | Mitigation |
| --- | --- |
| Recruiter-mutation vs revoke race | Lock-order contract (both lock the same `StaffingOrderRecruiterAssignment` row). Revoke-first → later mutation fails closed with uniform `404`. Command-first → mutation commits; revoke waits; revoke acquires lock and commits. Tests cover BOTH orderings using TWO independent DB connections. ANY command error rolls back the entire mutation; NO orphan half-mutated row is persisted under any error path. |
| Claim race producing double-active handler | `pg_advisory_xact_lock(hash, hash_sub)` on the (StaffingOrderId, SubmissionId) key + partial unique index on `LaborProfileHandlingAssignment` — loser gets stable `409 HANDLING_ALREADY_CLAIMED`. |
| Stale session (revoked JWT) | Server-side derivation of actor / user / order IDs — NOT from request body. `AuthContext` re-validation. |
| Information oracle (unassigned HR_STAFF guessing order existence) | Uniform `404` on direct read; empty list on collections; uniform 4xx on mutation. No existence oracle. |
| Project-scope blast radius (assigning one order leaking whole Project) | `public.hrp_staffing_order_visible_for` is per-order; sibling-order isolation (DEC-07). `public.hrp_project_recruiter_visible_for` only reveals the minimal Project metadata needed to render the assigned orders. |
| Cross-tenant / cross-role leakage via helper OR-composition | HR_STAFF branch is the FIRST branch in each new helper. Non-HR_STAFF roles never pass the first branch. `SET search_path = pg_catalog, public` + REVOKE EXECUTE FROM PUBLIC + explicit GRANT EXECUTE TO runtime roles only. |
| Reassignment to already-active recruiter (duplication) | Partial unique index in migration — maps to stable `409 ASSIGNMENT_ALREADY_EXISTS`. |
| Placement bypass via PLACEMENT_ROLES alone | Dual authority predicate (DEC-25) inside the same transaction before any Placement mutation. |
| Worker assignment polymorphism (`Worker.assignedToId`) | Explicitly excluded (DEC-22 / out-of-scope). |

## 7. Transactional revoke semantics (C-08 / I-03)

The lock-order contract is exact (no half-mutated-row language; no
snapshot-based fail-closed wording):

1. Recruiter mutation and revoke both lock the exact same active `StaffingOrderRecruiterAssignment` row.
2. Authorization check and domain mutation share ONE transaction.
3. **Command-first ordering:**
   - The recruiter command acquires the lock first;
   - The command commits (or rolls back) its mutation;
   - Revoke waits for the lock;
   - After the command commits, revoke acquires the lock and commits `revokedAt` successfully.
4. **Revoke-first ordering:**
   - Revoke acquires the lock and commits `revokedAt`;
   - A later recruiter mutation cannot find active authority and fails closed with uniform `404`.
5. Any command error (validation failure, constraint conflict, network error, server failure) rolls back the entire mutation. **No orphan half-mutated row is ever persisted under any error path.**
6. Database integration tests exercise both orderings using TWO independent DB connections.

The contract does not use any of the following four phrase patterns (referenced by T0 I-08.7 phrase-id list only): revoke-described-as-snapshot, audit-described-as-half-mutated-row, create-described-as-half-mutated-row-but-committed, revoke-returning-token-name. These phrase patterns are excluded by the v1.2 correctness contract.

## 8. Exact command/API contracts (C-09 / I-04)

Frozen routes (planned; verified-not-present at `origin/main` via `git cat-file -e origin/main:<path>`):

- `POST /api/admin/staffing/orders/{orderId}/recruiters` — ADMIN/HR_MANAGER only; assigns HR_STAFF. *(new)*
- `POST /api/admin/staffing/orders/{orderId}/recruiters/{assignmentId}/revoke` — ADMIN/HR_MANAGER only. *(new)*
- `POST /api/admin/applications/{submissionId}/claim` — assigned HR_STAFF only. *(new)*

Existing canonical public API endpoints (used in E2E, NOT modified by this task):

- `GET /api/jobs/{slug}` — `app/api/jobs/[slug]/route.ts` (existing).
- `POST /api/public/jobs/{slug}/applications` — `app/api/public/jobs/[slug]/applications/route.ts` (existing, P1-B unchanged).

All three new mutation commands require raw UUID-v4 `Idempotency-Key`, use canonical `withIdempotency`, derive actor / user / order IDs server-side (NOT from request body), execute idempotency + authorization + mutation atomically, map duplicate active assignment to stable `409 ASSIGNMENT_ALREADY_EXISTS`, return privacy-safe errors.

## 9. No new broad permission code (C-10 / I-04)

The proposed `CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS` is REMOVED from this slice. Authorization model: role establishes recruiter persona; active `StaffingOrderRecruiterAssignment` establishes object scope; both are required. No `prisma/seed.mjs` permission grant is needed.

## 10. Implementation allowlist (C-11 / I-04)

The implementation allowlist from TASK §4.2 is repeated here for discoverability. Existing paths have been verified at `origin/main @ f3a3d1a4` via `git cat-file -e origin/main:<path>`. New paths are marked `(new)`. No `src/app/**` paths appear anywhere.

(allowlist rows are referenced from TASK §4.2 to avoid duplication.)

## 11. Final E2E acceptance (Owner-mandated, v1.2 22-step chain)

(unchanged from v1.1; the full chain with each AC pass condition is listed in TASK §6.2 and is the canonical source for the implementation round.)

## 12. Open Owner decisions

The directive closes all 17 locked decisions. T0 v1.1 correction `C-01..C-12` closes all correction items. T0 v1.2 integrity correction `I-01..I-08` closes all integrity items. **Zero open Owner decisions at the planning level.**

If during implementation a previously-closed decision needs revisiting, Tier 1 stops and returns to T0 per the pipeline's "do not silently expand Owner decisions" rule.

## 13. Verification (this doc)

- Strict UTF-8 LF no-BOM — verified by Node.js `TextDecoder('utf-8', { fatal: true })` scanner.
- BOM=0, CR=0, NUL=0, U+FFFD=0, C0 controls (excl. TAB/LF)=0.
- Mojibake markers (Latin Capital A Tilde; Latin Capital A Circumflex; Euro Sign; Dagger; replacement char U+FFFD escape) = 0.
- Exactly two docs files changed at the planning commit.
- No source / schema / migration / package / lockfile modification.
- Forbidden-path diff (`app/ src/ prisma/ package.json pnpm-lock.yaml yarn.lock vitest.* next.config.* tsconfig.json middleware.ts`) is empty.
- `git diff --check origin/main..HEAD` is clean.

## 14. Revision Log

| Spec version | Date | Author | Change | Reason |
| --- | --- | --- | --- | --- |
| `v1.0` | 2026-09-28 | Tier 1 (T1C) | Initial reconciliation (PROPOSED_ONLY). | `T0 → T1C — P1-A0.4 Scoped Recruiter Authority — planning round` |
| `v1.1` | 2026-09-28 | Tier 1 (T1C) | T0 correction `C-01..C-12` consolidated into one docs-only forward-only commit on top of predecessor `5bb7581a11312c5111f51e0ec84534b4ac9b4a97`. Status equivalent to the legacy `ready-to-code-token` under the legacy V2 enum; Contract gate `ready-to-code-token` (V2 enum); Contract accepted by T0 `YES` (semantic field, later corrected). E2E chain expanded to 22 steps. | `T0 → T1C — P1-A0.4 Contract Correction v1.1 — C-01..C-12` |
| `v1.2` | 2026-09-28 | Tier 1 (T1C) | T0 integrity correction after v1.1 verdict `CHANGES_REQUIRED`. Working-tree docs reset from clean predecessor blob to repair encoder-induced mojibake (195 markers, 3 C0 controls U+000B×2 + U+000C) introduced at v1.1. Control fields updated: Status `T0_REVIEW` (no self-declared contract-text-accepted state); Contract gate `DRAFT`; Contract accepted by T0 `PENDING`; Spec version `v1.2`; T0 integrity exceptions used `1`; Correction budget `1` exhausted by v1.1; Open Owner decisions `0`. §4.3 SQL helpers rewritten schema-qualified (`public.hrp_staffing_order_visible_for(text)`, `public.hrp_project_recruiter_visible_for(text)`) with `SET search_path = pg_catalog, public` posture, identity only via `public.hrp_session_role()` / `public.hrp_session_user_id()`, and migration REVOKE/GRANT to runtime roles. §4.3.3 narrowly-scoped policies use correct column names. §7 transactional revoke semantics revised exactly per I-03 (no half-mutated-row language). §5.1 post-claim phone corrected (full contact phone may be returned to active handler only when needed for calling). §8 routes explicitly marked `(new)` and verified-not-present at origin/main; existing public endpoints `GET /api/jobs/{slug}` and `POST /api/public/jobs/{slug}/applications` are repository-exact paths. §10 implementation allowlist rebuilt with `git cat-file -e origin/main:<path>` proof per existing item, `(new)` markers, and zero `src/app/`. Predecessor `f1fff224e4d5fb9c4c6a24a51add565d85ed2c4e` preserved. No amend / reset / rebase / force-push. | `T0 → T1C — P1-A0.4 pre-implementation integrity correction v1.2` |
