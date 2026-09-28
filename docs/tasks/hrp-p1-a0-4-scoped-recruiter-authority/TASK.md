# TASK — `hrp-p1-a0-4-scoped-recruiter-authority`

P1-A0.4 — Scoped Recruiter Authority. CRITICAL priority. Docs-only planning
contract for an additive, scoped `User ↔ StaffingOrder` recruiter assignment
aggregate that lets `HR_STAFF` ("Chuyên viên tuyển dụng") operate on assigned
demand without granting global project visibility.

> **This is a planning round.** No source, schema, migration, package or
> test changes are introduced. The companion realignment doc is
> `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md`.
> Tier 3 audit is **not** called from this round. The implementation round
> is opened in a separate worktree on a separate baseline only after T0
> accepts this contract and promotes `Status → READY_TO_CODE`.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-a0-4-scoped-recruiter-authority` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CONTRACT` (planning-only round; no code delivery in this round) |
| Build vs adopt | `ADOPT` (reuses existing `AuthContext`, `withDbContext`, `resolveEffectivePermissions`, `withIdempotency`, `DataTable`/form primitives, the `LaborProfileHandlingAssignment` aggregate as **design precedent** only — not as structural reuse; forward-only Prisma migration framework) |
| Build vs automate | `N/A` (no connector, scheduler, notification worker or multi-system workflow; n8n explicitly out of scope per Owner decision 16) |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Scoped recruiter authority touches RLS / authorization on StaffingOrder + slots + openings + postings + cases + assignments. CRITICAL + LIGHT is conservative — any mistake can either grant HR_STAFF global visibility or strip a legitimate recruiter of operational authority. Implementation round requires an external auditor against the exact frozen Implementation SHA. |
| Spec version | `v1.0` (planning-only; promoted only after T0 acceptance) |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1` (T1C, directive `T0 → T1C — P1-A0.4 Scoped Recruiter Authority — planning round`) |
| Baseline | `f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7` (origin/main @ current pin) |
| Contract gate | `DRAFT` |
| Decision state | `CLOSED` (all 17 locked Owner decisions represented; no OPEN Owner decisions) |
| Test environment | `NOT_REQUIRED` (this is a docs-only planning round; synthetic DB integration tests are scoped to the implementation round that follows) |
| Correction budget | `1` |
| Current execution round | `1` (planning round; implementation round opens after T0 acceptance) |
| Current audit round | `0` (Tier 3 not called in this round) |
| Next gate | `T0_CONTRACT_REVIEW` |
| In-scope roots | `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md`; `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` |
| Forbidden paths | `app/**`; `src/**`; `prisma/**`; `tests/**`; `middleware.ts`; `next.config.*`; `tsconfig.json`; `package.json`; `package-lock.json`; `vitest*.config.*`; `docs/PLANNER_HANDOVER.md`; `docs/discovery/realignment/P1CD_P1E_RECRUITER_WORKBENCH_RECONCILIATION.md`; any file under `docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/`; any file under `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/`; any file under `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/`; any file under `docs/tasks/hrp-p1-b-public-apply/`; any file under `docs/tasks/hrp-p1-a0-jobposting-authoring-publish/`; any file under `docs/tasks/hrp-p1-f0-placement-command-api/`; any file under `docs/tasks/hrp-p1-f1-placement-action-ui/` |
| Required gates | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `git diff --check` |
| Production migration | `NOT_RUN` (no migration authored in this round; production migration gate remains T0-owned per T0_PRODUCTION_MIGRATION_GATE in the implementation round) |
| Modules / Deliverables | `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md`; `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` |

## 1. Outcome

### 1.1 User-visible outcome (planning-round — describes the **target** behavior of the implementation round)

After the implementation round is merged and T0 verifies the production
migration gate, the system exhibits the following behavior:

- An `HR_STAFF` user assigned to a `StaffingOrder` can:
  - view that `StaffingOrder` and its slots;
  - create / edit / publish a `JobPosting` for eligible slots in that order;
  - process associated candidates / `LaborProfile` / applications;
  - operate `PlacementCase` / `Placement` commands allowed to a recruiter on
    that order's demand.
- An `HR_STAFF` user NOT assigned to a `StaffingOrder`:
  - sees an empty list of orders;
  - receives uniform 404 on direct read of an unassigned order id;
  - cannot enumerate slots, openings, postings, or cases of an unassigned
    order (no count oracle, no existence oracle).
- `ADMIN` and `HR_MANAGER` retain broad recruitment oversight.
- `PM` and `SALE` semantics are unchanged.

### 1.2 Non-goals (planning-round; carries into implementation)

- No global project visibility for `HR_STAFF` via the root branch of
  `hrp_project_visible_for` / `hrp_project_writable`.
- No expansion of `PM` or `SALE` authority.
- No internal attendance / payroll / leave modules define authorization.
- No `n8n` dependency, no direct `n8n` DB access, no PII export.
- No `Worker.assignedToId` polymorphism.
- No adoption of `LaborProfileHandlingAssignment` as a fake
  `StaffingOrder` assignment (different aggregate root, different revoke
  semantics, no DB invariant; see
  `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md`
  §3).
- No schema change beyond an additive aggregate model + an additive
  forward-only migration + an additive SECDEFINER helper that ORs with the
  existing project-visibility helper.
- No new external library, no new framework, no package.json change.
- No production migration applied from this branch in any round.
- No JWT/session shape change.

### 1.3 Planning-round-specific outcome

- One reconciliation doc and one TASK contract are produced.
- The reconciliation doc inventories every L1/L2 boundary that currently
  treats `HR_STAFF` inconsistently and proposes the additive aggregate
  shape, SECDEFINER helper, RLS narrowing, L1 scope narrowing, threat model,
  and final E2E acceptance chain.
- The TASK contract closes all 17 locked Owner decisions; no OPEN Owner
  decisions; BUILD_VS_ADOPT and BUILD_VS_AUTOMATE are explicit;
  RQ → STEP → AC traceability is present; allowlist and forbidden paths are
  scoped to docs-only files.

## 2. Evidence

This is a docs-only planning round. Each `EV-` row below is a **source
evidence pointer** — a verbatim file:line in the existing `origin/main`
tree that justifies a specific realignment claim. Implementation-round
synthetic DB evidence will be added under `evidence/EV-*.md` in the
implementation round.

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/shared/auth/auth-context.ts:20-27` (`AuthContext` interface) | Confirms `AuthContext` shape (`userId`, `role`, `vendorId?`, `workerId?`); no `organizationId/orgId`; carries `role` through to all downstream services. |
| `EV-02` | `src/shared/auth/scopes/project.scope.ts:64-72` (`HR_STAFF` branch returns `{}` with Phase-3 narrow comment) | Direct evidence of the L1 permissive-no-op footgun for `HR_STAFF` on Project. |
| `EV-03` | `src/shared/auth/scopes/staffing.scope.ts:23-45` (`buildStaffingOrderScope` allows HR_STAFF = `{}`) | Direct evidence of the L1 permissive-no-op for HR_STAFF on StaffingOrder. |
| `EV-04` | `src/shared/auth/scopes/staffing.scope.ts:52-68` (`buildStaffingOrderSlotScope` allows HR_STAFF = `{}`) | Direct evidence of the L1 permissive-no-op for HR_STAFF on slots. |
| `EV-05` | `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql:6-13` (`hrp_project_visible_for` excludes HR_STAFF) | Direct evidence that L2 RLS is the floor today; HR_STAFF × projects = 0 at DB. |
| `EV-06` | `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql:14` (`hrp_project_writable` = root + SALE only) | HR_STAFF cannot write projects at DB. |
| `EV-07` | `src/shared/auth/matrix-scope.test.ts:119-123` (HR_STAFF × projects → 0) | Regression test that locks the current L2 behavior. Must continue to pass after the implementation round. |
| `EV-08` | `prisma/migrations/20260908001_job_opening_posting_split/migration.sql:71-126` (job_openings / job_postings RLS uses `hrp_project_visible_for(project_id)`) | Direct evidence of the RLS narrowing pattern to be reused for the new helper. |
| `EV-09` | `src/domains/staffing/job-posting-list.service.ts:110, 183` (`listJobPostingsForAdmin`, `getJobPostingForAdmin` do not take AuthContext) | Evidence that the read path is single-layer RLS today; needs no change for the L2 narrowing, but the L1 layer must be considered separately. |
| `EV-10` | `prisma/schema.prisma:1766-1790` (`LaborProfileHandlingAssignment` model) | Evidence of the aggregate root difference: keyed to LaborProfile, not StaffingOrder; cannot be adopted. |
| `EV-11` | `src/domains/talent/handling-assignment.service.ts:30-71, 99-146` (`createInitialAffiliateAssignment`, `managerAssign`) | Pattern for active-row lifecycle (`close-active-then-insert`); design precedent for the new aggregate's revoke semantics. |
| `EV-12` | `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql:17` (`hrp_worker_visible_for` includes HR_STAFF via `worker.assigned_to_id`) | Existing precedent for HR_STAFF authority gated by a User FK on the protected table. The new aggregate is the StaffingOrder-level analogue. |
| `EV-13` | `src/domains/staffing/assignment-placement.service.ts:47, 290-294` (`PLACEMENT_ROLES` = `['ADMIN','HR_MANAGER']`; `assertPlacementRole`) | Evidence of the current hard app-layer denial of Placement preview/activate for HR_STAFF. Implementation round must extend this to allow assigned-HR_STAFF on their orders. |
| `EV-14` | `src/shared/auth/permission-catalog.ts:37-109` (`PERMISSION_CATALOG`) | Permission catalog today does NOT include a scoped recruiter publish permission. Implementation round may add a scoped permission (e.g. `CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS`) — gated by the aggregate, not by role alone. |
| `EV-15` | `prisma/seed.mjs:548-551` (HR_STAFF base grants: `CAN_CREATE_WORKER`, `CAN_PROCESS_TICKET`, `CAN_MANAGE_MEDIA`) | Baseline HR_STAFF permissions today. Implementation round does NOT change the seed without an explicit Owner decision. |
| `EV-16` | `src/domains/talent/placement-case.service.ts:55-81` (`tryInsertPlacementCase` SAVEPOINT pattern) | Idempotency + race-safety pattern; reused for assignment-side commands. |
| `EV-17` | `src/shared/integrity/idempotency.ts` (`withIdempotency` helper) | Canonical integrity gate; required for assignment/revocation commands. |
| `EV-18` | `docs/discovery/realignment/P1CD_P1E_RECRUITER_WORKBENCH_RECONCILIATION.md` §3 R-D4, R-D5 (handler derivation; role × view matrix) | Existing precedent for role × view scoping that the new aggregate sits alongside. Implementation round must NOT regress the workbench behavior. |
| `EV-19` | `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md` §4 (additive schema shape, migration posture, SECDEFINER helper, propagation, L1 narrowing) | Implementation contract input. Carries into the implementation round as the design specification. |
| `EV-20` | `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md` §6 (threat model) | Race / revoke / stale session / oracle threats and mitigations. Implementation round tests must cover each row. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | `HR_STAFF` is preserved as a recruiter role (Owner decision 1). | `CHOSEN` |
| `DEC-02` | `HR_STAFF` does NOT gain global project visibility (Owner decision 2). The L1 app-scope branch for HR_STAFF must be narrowed from `{}` to the active-assignment predicate. | `CHOSEN` |
| `DEC-03` | `HR_STAFF` is NOT added to the root branch of `hrp_project_visible_for` / `hrp_project_writable` (Owner decision 3). The new helper is added separately and OR'd with the existing policy. | `CHOSEN` |
| `DEC-04` | Recruiter authorization is scoped via a new additive aggregate `StaffingOrderRecruiterAssignment` keyed to `StaffingOrder` (Owner decision 4). | `CHOSEN` |
| `DEC-05` | One `StaffingOrder` may have multiple active recruiters (Owner decision 5). The aggregate does NOT enforce single-recruiter-per-order. | `CHOSEN` |
| `DEC-06` | Assignment authority belongs only to `ADMIN` and `HR_MANAGER` (Owner decision 6). The assignment API/UI requires `ctx.role IN ('ADMIN','HR_MANAGER')`. HR_STAFF cannot self-assign. | `CHOSEN` |
| `DEC-07` | The aggregate retains full audit provenance: `staffingOrderId`, `recruiterUserId`, `assignedByUserId`, `assignedAt`, `revokedAt` (nullable), `revokedByUserId` (nullable), `reason` (nullable, optional) (Owner decision 7). | `CHOSEN` |
| `DEC-08` | Active duplicate assignment is prevented by a DB-level partial unique index `(staffing_order_id, recruiter_user_id) WHERE revoked_at IS NULL` (Owner decision 8). Race losers receive `ASSIGNMENT_ALREADY_EXISTS` 409. | `CHOSEN` |
| `DEC-09` | HR_STAFF assigned to an order can view the order + slots, create/edit/publish JobPosting for eligible slots, process candidates/LaborProfiles/applications, operate PlacementCase/Placement commands allowed to a recruiter (Owner decision 9). Implementation round extends `PLACEMENT_ROLES` from `[ADMIN, HR_MANAGER]` to `[ADMIN, HR_MANAGER, HR_STAFF]` and the service layer adds a per-slot scope predicate that joins the active assignment set. | `CHOSEN` |
| `DEC-10` | HR_STAFF not assigned to an order fails closed without revealing order/slot existence (Owner decision 10). All unassigned reads return uniform 404; all unassigned lists return empty collections; all unassigned mutations return uniform 4xx with no existence oracle. | `CHOSEN` |
| `DEC-11` | ADMIN and HR_MANAGER retain broad recruitment oversight (Owner decision 11). No change to their L1/L2 behavior. | `CHOSEN` |
| `DEC-12` | PM and SALE retain current semantics; no expansion (Owner decision 12). The PM branch of `buildProjectScope` and `buildStaffingOrderScope` is untouched; SALE branch is untouched. | `CHOSEN` |
| `DEC-13` | Assignment / revocation must have an Admin / HR Manager UI + API so the recruiter journey requires no developer / direct SQL (Owner decision 13). Implementation round ships both API and a UI surface in `app/admin/staffing/recruiter-assignments/**` using existing `DataTable`/form primitives. | `CHOSEN` |
| `DEC-14` | UI label is "Chuyên viên tuyển dụng"; internal enum remains `HR_STAFF` (Owner decision 14). No role rename. | `CHOSEN` |
| `DEC-15` | Internal attendance / payroll / leave modules do NOT define the authorization model for this task (Owner decision 15). The new helper does NOT reference attendance / payroll / leave tables. | `CHOSEN` |
| `DEC-16` | No n8n dependency; no direct n8n DB access; no PII export (Owner decision 16). The aggregate carries NO candidate/labor profile/PII data — only user FKs and timestamps. | `CHOSEN` |
| `DEC-17` | Library-first: reuse `AuthContext`, `withDbContext`, permission resolver, `DataTable`/form primitives, `withIdempotency`, existing assignment pattern (`LaborProfileHandlingAssignment` as **design precedent**, not structural reuse) (Owner decision 17). | `CHOSEN` |
| `DEC-18` | Migration posture is forward-only. Rollback is a soft-revert via setting `revoked_at` on every row, never an in-place migration revert. A hard revert is a follow-up forward-only migration. | `CHOSEN` |
| `DEC-19` | This is a **planning round** — no source / schema / migration / package / test changes. The two docs files are the only artifacts. Tier 3 is NOT called. Production migration gate remains T0-owned. | `CHOSEN` |

### 3.1 Build vs Adopt

Decision: `ADOPT`.

- **Library/framework**: `ADOPT` — no new external library; reuse
  `AuthContext`, `withDbContext`, `resolveEffectivePermissions`, `withIdempotency`,
  `DataTable`/form primitives, the existing Prisma migration framework, and
  the existing role × view matrix pattern from
  `docs/discovery/realignment/P1CD_P1E_RECRUITER_WORKBENCH_RECONCILIATION.md`.
- **Version/source**: not applicable — no new dependency.
- **License**: not applicable — no new dependency.
- **Wrapper boundary**: the new SECDEFINER helper is wrapped at the same
  RLS policy boundary as `hrp_project_visible_for` /
  `hrp_worker_visible_for`. The new Prisma aggregate is consumed by the
  existing `src/shared/auth/scopes/staffing.scope.ts` boundary. No new
  external API surface is introduced.
- **Aggregate as design precedent**: `LaborProfileHandlingAssignment`
  (`prisma/schema.prisma:1766`, migration
  `20260918000000_aff05a_labor_profile_handling_assignment`) is reused as
  the design precedent for the new `StaffingOrderRecruiterAssignment`
  aggregate. The two aggregates are **distinct** (different root, different
  revoke semantics, different unique index). The new aggregate does NOT
  share columns or relations with the existing one.

### 3.2 Build vs Automate

Decision: `N/A`.

This task introduces no connector, scheduler, notification worker or
multi-system/operator workflow. Assignment/revocation is a human-triggered
in-app flow. n8n is explicitly out of scope (Owner decision 16). No
orchestration platform owns auth/RLS, mutation authority, durable audit, or
domain-storage writes for this task.

## 4. Contract

### 4.1 Requirements (planning-round RQs)

| ID | Requirement |
|---|---|
| `RQ-01` | This planning round produces exactly two docs files: the realignment doc and this TASK contract. No source / schema / migration / package / lockfile is modified. |
| `RQ-02` | The realignment doc inventories the current treatment of `HR_STAFF` across project scope, StaffingOrder/slot scope, JobOpening/JobPosting RLS, JobPosting selector/write path, application/LaborProfile handling, recruiter workbench, and PlacementCase/Placement surface. |
| `RQ-03` | The realignment doc proves — with file:line evidence — that no existing canonical `User ↔ StaffingOrder` aggregate can be safely adopted as a fake project/order assignment, and explicitly addresses `LaborProfileHandlingAssignment` as a structural non-fit. |
| `RQ-04` | The realignment doc specifies the additive aggregate shape (`StaffingOrderRecruiterAssignment`), its audit-provenance fields per Owner decision 7, and the DB-level partial unique index per Owner decision 8. |
| `RQ-05` | The realignment doc specifies how assigned-order visibility reaches slots, openings, and postings without granting visibility to unrelated rows in the same Project — via a new SECDEFINER helper OR'd with the existing project-visibility helper, OR'd with the existing RLS policy without dropping it. |
| `RQ-06` | The realignment doc covers race, revoke, stale-session, and information-oracle threats with concrete mitigations. |
| `RQ-07` | The realignment doc closes the BUILD_VS_ADOPT (`ADOPT`) and BUILD_VS_AUTOMATE (`N/A`) decisions with evidence-based reuse paths. |
| `RQ-08` | This TASK contract closes all 17 locked Owner decisions in §3 with status `CHOSEN` and explicitly carries them as `DEC-01..DEC-19`. |
| `RQ-09` | This TASK contract defines a synthetic DB integration plan (Owner-mandated) for the implementation round, scoped to the AC-E2E-01..AC-E2E-18 chain. |
| `RQ-10` | This TASK contract carries forward the final E2E acceptance chain (Owner-mandated) into a measurable AC table with the canonical flow: ADMIN/HR_MANAGER assigns HR_STAFF → HR_STAFF logs in → sees only assigned demand/slots → creates and publishes a JobPosting → public user applies → HR_STAFF processes candidate and PlacementCase → valid Placement outcome → unassigned HR_STAFF cannot observe or mutate the order. |
| `RQ-11` | Production migration gate remains T0-owned. No production migration is run from this branch in any round. |
| `RQ-12` | The implementation round must produce a HANDOFF + AUDIT + evidence/ bundle per the canonical pipeline, scoped to the new aggregate. The planning round does not produce any of those. |

### 4.2 Scope boundaries

**In scope (this planning round)**

- `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md`
- `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`

**In scope (implementation round — **planned**, not executed in this round)**

- `prisma/schema.prisma` — additive model `StaffingOrderRecruiterAssignment`
  + relations; no field rename / type change.
- `prisma/migrations/<UTC>_p1a04_scoped_recruiter_assignment/migration.sql`
  — additive forward-only migration.
- `prisma/seed.mjs` — optional seed for a synthetic HR_STAFF + a synthetic
  StaffingOrder (only if needed for the synthetic DB integration test).
- `src/shared/auth/scopes/staffing.scope.ts` — narrow HR_STAFF branch.
- `src/shared/auth/scopes/project.scope.ts` — narrow HR_STAFF branch.
- `src/domains/staffing/order.service.ts` — narrow slot-eligibility
  predicate (only the eligible-for-new-JobPosting list path).
- `src/domains/staffing/job-posting-authoring.service.ts` — narrow slot
  eligibility for the create path.
- `src/domains/staffing/job-posting-list.service.ts` — leave unchanged if
  L1 narrowing is sufficient at the RLS layer; otherwise narrow the read
  service per slot.
- `src/domains/staffing/assignment-placement.service.ts` — extend
  `PLACEMENT_ROLES` from `[ADMIN, HR_MANAGER]` to
  `[ADMIN, HR_MANAGER, HR_STAFF]` and add a per-slot scope predicate that
  joins the active assignment set.
- New `src/domains/staffing/recruiter-assignment.service.ts` — assignment
  CRUD with `withIdempotency`.
- New `app/api/admin/staffing/recruiter-assignments/**` — assignment API.
- New `app/admin/staffing/recruiter-assignments/**` — assignment UI using
  `DataTable` + form primitives.
- `tests/db/**` — synthetic DB integration tests for: assignment lifecycle,
  fail-closed (404 on unassigned read), revoke propagation, race safety,
  assignment-oracle prevention, revoke-during-in-flight-write behavior.
- `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/{TASK.md,HANDOFF.md,evidence/**}`.

**Out of scope (explicit non-goals)**

- `prisma/schema.prisma` model changes beyond the additive aggregate.
- `src/domains/attendance/**` — no authority definition from attendance.
- `src/domains/finance/**`.
- `src/lib/auth/session.ts` — no JWT/session shape change.
- `package.json` / `package-lock.json` — no new dependency.
- Sidebar IA/label/order/icon change.
- `docs/PLANNER_HANDOVER.md` (T0-owned).
- n8n workflow files.
- `src/domains/applications/conversion.service.ts` (P1-B frozen).
- Production migration (`prisma migrate deploy` is OWNED by T0).
- `LaborProfileHandlingAssignment` polymorphic reuse.
- `Worker.assignedToId` polymorphism.
- Direct DB writes from background jobs / n8n.

### 4.3 Domain boundaries

- **Data/state:** synthetic DB integration tests use disposable fixture
  ids. Production DB is not mutated in this round (no migration authored).
- **Permission/security:** additive SECDEFINER helper + additive OR in
  existing RLS policy. No DROP policy, no DISABLE RLS, no privileged
  bypass.
- **Interface/API:** assignment UI/API is new. No public API contract
  changes. No JWT shape change.
- **Migration/rollback:** forward-only. Soft revert = `revoked_at` on every
  row. Hard revert = follow-up forward-only migration.

## 5. Execution Plan (planning round)

| Step | Target | Intent | Verify |
|---|---|---|---|
| `STEP-01` | Worktree `C:\CodeApp\HrP-t1c-p1a04`, branch `codex/t1c-p1a04-scoped-recruiter-authority`, baseline `f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7` | Establish fresh worktree from origin/main | `git rev-parse HEAD` matches baseline + `git status --short` clean |
| `STEP-02` | Inventory `HR_STAFF` L1/L2 surfaces, existing aggregate candidates, RLS helpers | Build the evidence base for the realignment doc | EV-01..EV-18 |
| `STEP-03` | Threat model: race / revoke / stale session / information oracle | Section 6 of the realignment doc | EV-19 / EV-20 |
| `STEP-04` | Design additive aggregate + migration + SECDEFINER helper + L1 narrowing | Section 4 of the realignment doc | EV-19 |
| `STEP-05` | Author `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md` | Discovery artifact | `git diff --check`; UTF-8 no-BOM |
| `STEP-06` | Author `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` | Contract artifact | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` |
| `STEP-07` | Run encoding gate + `git diff --check` | Verify exactly two docs files changed | `node .ai-pipeline/scripts/verify-encoding.mjs` exits 0; `git diff --check` clean |
| `STEP-08` | Single docs-only commit + push to remote branch | Deliver | One commit on the planning branch; `git log -1 --format=%s` reports the planning intent; no amend/reset/rebase/force-push |
| `STEP-09` | Stop for T0 contract review | Hand control back to T0 | No PR opened; no Tier 3 call; no merge; no deploy |

## 6. Acceptance

### 6.1 Planning-round acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md` exists at the canonical path, is non-empty, and has all 13 numbered sections. | `pwsh -NoProfile -Command "Test-Path docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md; (Get-Content -LiteralPath docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md -Raw).Length"` returns a non-empty size; `Select-String -Path docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md -Pattern '## [0-9]+\.'` returns 13 lines. |
| `AC-02` | `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` exists at the canonical path, is non-empty, and has all 11 required sections per `verify-task.ps1` A-01. | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` exits 0 with `RESULT: DRAFT-VALID` or `RESULT: PASS`. |
| `AC-03` | Realignment doc inventories every L1/L2 surface listed in the directive: project scope, StaffingOrder/slot scope, JobOpening/JobPosting RLS, JobPosting selector/write path, application/LaborProfile handling, recruiter workbench, PlacementCase/Placement actions. | `grep -E "project scope|buildProjectScope|StaffingOrder|StaffingOrderSlot|JobOpening|JobPosting|listEligibleSlotsForNewJobPosting|LaborProfile|HandlingAssignment|PLACEMENT_ROLES|PlacementCase|placement"` against the realignment doc returns non-empty matches in §1. |
| `AC-04` | Realignment doc proves that `LaborProfileHandlingAssignment` cannot be safely adopted as a `User ↔ StaffingOrder` recruiter assignment (3+ reasons; references Owner decision 7 + 8). | `grep -nE "cannot be adopted\|không thể adopt\|LaborProfileHandlingAssignment" docs/discovery/realignment/P1A04_*.md` returns non-empty matches in §3. |
| `AC-05` | Realignment doc specifies the additive aggregate shape (`StaffingOrderRecruiterAssignment`) with all 7 Owner-decision-7 audit-provenance fields and the DB-level partial unique index per Owner decision 8. | `grep -nE "StaffingOrderRecruiterAssignment\|staffing_order_recruiter_assignments\|staffingOrderId\|recruiterUserId\|assignedByUserId\|assignedAt\|revokedAt\|revokedByUserId\|partial unique\|WHERE revoked_at IS NULL" docs/discovery/realignment/P1A04_*.md` returns non-empty matches in §4. |
| `AC-06` | Realignment doc specifies the new SECDEFINER helper (`hrp_staffing_order_visible_for`) and how it ORs with the existing `hrp_project_visible_for` policy (forward-only, no DROP). | `grep -nE "hrp_staffing_order_visible_for\|SECURITY DEFINER\|forward-only\|no DROP\|OR'd\|OR with" docs/discovery/realignment/P1A04_*.md` returns non-empty matches in §4. |
| `AC-07` | Realignment doc covers race, revoke, stale-session, and information-oracle threats with concrete mitigations. | `grep -nE "race\|revoke\|stale\|oracle" docs/discovery/realignment/P1A04_*.md` returns ≥ 4 distinct matches in §6. |
| `AC-08` | TASK contract closes all 17 locked Owner decisions in §3 with `Status = CHOSEN` and one additional `DEC-18`/`DEC-19` for migration posture and planning-round posture. | `grep -nE "\| DEC-\|\| \`CHOSEN\` \|" docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` returns ≥ 19 rows in §3. |
| `AC-09` | TASK contract declares `BUILD_VS_ADOPT = ADOPT` with §3.1 evidence; `BUILD_VS_AUTOMATE = N/A` with §3.2 evidence. | `grep -nE "Build vs adopt\|Build vs automate" docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` returns rows matching the gate's expected field names. |
| `AC-10` | TASK contract encodes the final E2E acceptance chain `AC-E2E-01..AC-E2E-18` covering ADMIN assign → HR_STAFF login → view only assigned demand/slots → create + publish JobPosting → public apply → HR_STAFF process candidate + PlacementCase → valid Placement → unassigned HR_STAFF isolation. | `grep -nE "\| \`AC-E2E-" docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` returns 18 rows in §6.2. |
| `AC-11` | Exactly two docs files are changed (`docs/discovery/realignment/P1A04_*.md` and `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`). Zero source / schema / migration / package / lockfile modification. | `git diff --name-only origin/main..HEAD` returns exactly the two paths; `git diff --name-only origin/main..HEAD -- app/ src/ prisma/ package.json package-lock.json vitest.config.ts vitest.unit.config.ts vitest.integration.config.ts next.config.* tsconfig.json middleware.ts` returns empty. |
| `AC-12` | UTF-8 no-BOM, LF-only, zero U+FFFD/mojibake on every changed text file. | `node .ai-pipeline/scripts/verify-encoding.mjs` exits 0. |
| `AC-13` | `git diff --check origin/main..HEAD` returns no warnings on the planning diff. | `git diff --check origin/main..HEAD` exits 0 with empty output. |
| `AC-14` | `verify-task.ps1` runs against the planning TASK and passes (warnings allowed for placeholder/dry-run findings because status is `PROPOSED_ONLY`). | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` exits 0. |
| `AC-15` | No `Tier 3` call, no `PR` opened, no `merge`, no `deploy`. | `git log -1 --format=%s` reports the planning intent; `gh pr list` does not include a PR for the planning branch. |
| `AC-16` | Production migration is NOT applied from this branch in any round. | `git diff --name-only origin/main..HEAD -- prisma/migrations/` returns empty; the implementation round's TASK carries the `T0_PRODUCTION_MIGRATION_GATE` field as a planning placeholder. |

### 6.2 Final E2E acceptance (Owner-mandated — **planned** for the implementation round)

The implementation round's TASK contract must encode this AC chain verbatim,
with a synthetic DB integration plan per AC. This planning round carries
the chain forward so the implementation contract has a single source of truth.

| AC | Pass condition (Owner-mandated final E2E) | Verification method (implementation round) |
|---|---|---|
| `AC-E2E-01` | ADMIN creates `StaffingOrder SO-X` with N slots | synthetic DB integration test |
| `AC-E2E-02` | ADMIN/HR_MANAGER assigns HR_STAFF-Alice to `SO-X` via assignment UI/API | synthetic DB integration test |
| `AC-E2E-03` | HR_STAFF-Alice logs in (fresh JWT) — `AuthContext.role=HR_STAFF`, `userId=Alice.id` | synthetic DB integration test |
| `AC-E2E-04` | Alice calls `GET /api/staffing/orders` — sees ONLY `SO-X` (no other orders, no count oracle) | synthetic DB integration test |
| `AC-E2E-05` | Alice calls `GET /api/staffing/orders/{SO-Y.id}` for an unassigned order — uniform 404 | synthetic DB integration test |
| `AC-E2E-06` | Alice calls `GET /api/staffing/orders/{SO-X.id}/slots` — sees slots of `SO-X` | synthetic DB integration test |
| `AC-E2E-07` | Alice calls `listEligibleSlotsForNewJobPosting` — only `SO-X`'s slots are returned | synthetic DB integration test |
| `AC-E2E-08` | Alice `POST /api/admin/jobs/job-postings { slotId: SO-X.slot[0] }` — 200/201 + idempotency replay | synthetic DB integration test |
| `AC-E2E-09` | Alice `PATCH publish JobPosting` — 200, status=PUBLISHED | synthetic DB integration test |
| `AC-E2E-10` | Public user `GET /api/jobs?slug=...` — sees Alice's posting | synthetic DB integration test |
| `AC-E2E-11` | Public user `POST /api/public/jobs/{slug}/apply` — 201 (canonical apply path, unchanged) | synthetic DB integration test |
| `AC-E2E-12` | Alice reads candidate submission, scores `LaborProfile` (canonical helper) | synthetic DB integration test |
| `AC-E2E-13` | Alice opens `PlacementCase` (canonical helper, idempotency) | synthetic DB integration test |
| `AC-E2E-14` | Alice previews Placement — succeeds on `SO-X`-derived slot; fails closed otherwise | synthetic DB integration test |
| `AC-E2E-15` | HR_STAFF-Bob (NOT assigned to `SO-X`) attempts the same flow — uniform 404 / empty list at every step | synthetic DB integration test |
| `AC-E2E-16` | ADMIN/HR_MANAGER revokes Alice's assignment | synthetic DB integration test |
| `AC-E2E-17` | Alice's NEXT request to `/api/staffing/orders` returns empty list | synthetic DB integration test |
| `AC-E2E-18` | Existing in-flight ops by Alice that were authorized at start may complete or fail-closed depending on the tx-local snapshot — documented per §6 of the realignment doc | synthetic DB integration test |

### 6.3 Traceability (planning round)

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | STEP-05, STEP-06 | AC-01, AC-02, AC-11 |
| `RQ-02` | STEP-02 | AC-03 |
| `RQ-03` | STEP-02 | AC-04 |
| `RQ-04` | STEP-04 | AC-05 |
| `RQ-05` | STEP-04 | AC-06 |
| `RQ-06` | STEP-03 | AC-07 |
| `RQ-07` | STEP-04 | AC-09 |
| `RQ-08` | STEP-06 | AC-08 |
| `RQ-09` | STEP-06 | AC-09 (synthetic DB integration plan carries forward) |
| `RQ-10` | STEP-06 | AC-10 |
| `RQ-11` | STEP-08 | AC-16 |
| `RQ-12` | STEP-05, STEP-06 | AC-15 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | The new aggregate being added to `prisma/schema.prisma` could regress unrelated `staffing_orders` behavior (e.g. cascade effects on existing FKs). | Migration is forward-only; the new table has `ON DELETE RESTRICT` for all FKs; no existing table is altered. Pre-flight sanity: `npx prisma validate` + targeted migration dry-run. |
| `RISK-02` | The new SECDEFINER helper OR'd with the existing RLS policy could over-broaden visibility for some role other than HR_STAFF. | The new helper is implemented as a strict `EXISTS` over `staffing_order_recruiter_assignments WHERE revoked_at IS NULL`. The OR is restricted to HR_STAFF branch by checking `hrp_session_role() = 'HR_STAFF'` inside the helper. The matrix-scope test is extended to assert HR_STAFF × staffing_orders = N (assigned rows) + 0 (unassigned rows). |
| `RISK-03` | Tightening the L1 `buildProjectScope` HR_STAFF branch from `{}` to the active-assignment predicate could regress the matrix-scope test (which asserts 0 for HR_STAFF × projects today). | The matrix-scope test asserts HR_STAFF × projects = 0 at the SQL layer; this is independent of the L1 narrowing. The L1 narrowing is at the Prisma layer; the L2 RLS narrowing remains the source of truth. Tests cover both layers separately. |
| `RISK-04` | Extending `PLACEMENT_ROLES` from `[ADMIN, HR_MANAGER]` to `[ADMIN, HR_MANAGER, HR_STAFF]` could accidentally let an HR_STAFF activate a placement on a slot they are NOT assigned to. | The per-slot scope predicate (added in the same PR) joins active assignments; unassigned slots produce `PlacementError('FORBIDDEN', 403, ...)`. Synthetic DB tests cover both branches. |
| `RISK-05` | The implementation round (separate from this planning round) opens a new worktree on a new baseline. Carrying forward the AC-E2E chain verbatim requires the implementation TASK to copy §6.2 unchanged. | The implementation TASK contract template explicitly references `AC-E2E-01..AC-E2E-18` and prohibits rewriting them. `verify-task.ps1` does not check this; it's a Tier 1 self-review obligation. |
| `RISK-06` | Tier 3 audit in the implementation round may surface a blocking finding. The correction budget is 1; the round plan does not pre-authorize more. | Owner decision 16 forbids n8n; the canonical pipeline permits escalating back to T0 if the budget is exhausted. |
| `RISK-07` | The partial unique index `(staffing_order_id, recruiter_user_id) WHERE revoked_at IS NULL` requires careful migration wording — Prisma cannot express it directly in `@@unique`. | Migration SQL is hand-authored to add the partial index; Prisma schema uses `@index` for the non-unique lookups and the partial unique is added in SQL only. A migration linter step verifies the partial index exists. |

## 8. Open Questions

| ID | Question | Blocks | Status |
|---|---|---|---|
| `OQ-01` | None | — | All 17 locked Owner decisions are represented in §3 with status `CHOSEN`. No OPEN Owner decisions at the planning level. |

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | Adopt the planning contract as written; baseline `f3a3d1a4`; status `PROPOSED_ONLY`; `Contract gate = DRAFT`; `Decision state = CLOSED` (Owner decisions locked); correction budget = 1 (V2 base); `Audit mode = LIGHT` (carries into implementation round only). | T0 directive priority: docs-only planning, no implementation, no PR, no Tier 3. The contract deliberately scopes execution to two docs files and treats the implementation round as a separate worktree on a separate baseline. |

## 10. Revision Log

| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v1.0` | 2026-09-28 | Tier 1 (T1C) | Initial planning contract; baseline `f3a3d1a4`; CRITICAL + LIGHT (carries into implementation); PROPOSED_ONLY + Contract gate DRAFT + Decision state CLOSED; correction budget 1; AC-E2E-01..AC-E2E-18 chain carried forward from Owner directive; DEC-01..DEC-19 close all 17 locked Owner decisions plus DEC-18 (forward-only migration posture) and DEC-19 (planning-round posture). | `T0 → T1C — P1-A0.4 Scoped Recruiter Authority — planning round` |
