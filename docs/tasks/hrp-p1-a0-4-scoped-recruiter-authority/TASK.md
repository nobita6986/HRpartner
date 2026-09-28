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
| Spec version | `v1.1` (T0 correction C-01..C-12 closed) |
| Status | `READY_TO_CODE` (planning + correction batch closed; Tier 1 may start implementation on a separate worktree + separate baseline pinned to `f3a3d1a4`) |
| Planner | `Tier 1` (T1C, directive `T0 → T1C — P1-A0.4 Scoped Recruiter Authority — planning round`; v1.1 closed by `T0 → T1C — P1-A0.4 Contract Correction v1.1 — C-01..C-12`) |
| Baseline | `f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7` (origin/main @ current pin; predecessor planning SHA `5bb7581a11312c5111f51e0ec84534b4ac9b4a97` preserved) |
| Contract gate | `READY_TO_CODE` (V2 gate enum; T0 acceptance of the planning contract text is recorded as the separate semantic field `Contract accepted by T0: YES` below — the V2 gate enum does not contain a literal `ACCEPTED` value, so the canonical mapping is `READY_TO_CODE` once T0 has closed the correction batch) |
| Contract accepted by T0 | `YES` (v1.1 correction `C-01..C-12`; verdict `CHANGES_REQUIRED` is fully closed; one forward-only docs-only correction commit on top of predecessor `5bb7581a`) |
| Decision state | `CLOSED` |
| Test environment | `NOT_REQUIRED` (this is a docs-only planning + correction round; synthetic DB integration tests are scoped to the implementation round that follows) |
| Correction budget | `1` |
| Correction batches used | `1` (the v1.1 correction batch `C-01..C-12`; no further correction budget remains for the planning round) |
| Current execution round | `1` (planning round; correction batch closed; implementation round opens after this commit lands) |
| Current audit round | `0` (Tier 3 not called in this round) |
| Next gate | `TIER1_IMPLEMENTATION_FREEZE` (implementation round opens in a separate worktree on a separate baseline pinned to `f3a3d1a4`; no Tier 3 call from this round) |
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
| `DEC-20` | (C-02) The new SECDEFINER helper `hrp_staffing_order_visible_for(orderId)` is **least-authority** and returns true ONLY when `hrp_session_role() = 'HR_STAFF'` AND an active (non-revoked) `StaffingOrderRecruiterAssignment` row exists for the exact `orderId` with `recruiter_user_id = hrp_session_user_id()`. The helper MUST NOT duplicate the ADMIN/HR_MANAGER/PM/SALE logic — those roles continue through existing canonical helpers/policies. | `CHOSEN` |
| `DEC-21` | (C-03) A separate scoped SELECT-only helper `hrp_project_recruiter_visible_for(projectId)` returns true ONLY for HR_STAFF when the project contains at least one `StaffingOrder` actively assigned to that user. This helper is **SELECT-only** for `Project` — there is no INSERT/UPDATE/DELETE authority for HR_STAFF on `Project`. An assigned Project is visible; an unassigned Project is invisible; assigning one order in Project P MUST NOT reveal sibling orders in P. HR_STAFF is NOT added to the root branch of `hrp_project_visible_for` or `hrp_project_writable`. The matrix test for `HR_STAFF × projects` is updated: result is the **assigned-project set only**, not always `0`. | `CHOSEN` |
| `DEC-22` | (C-04) The contract resolves the contradiction between "no DROP policy" and example SQL using `DROP POLICY`. The locked truth: separate narrowly-scoped `PERMISSIVE` policies are ADDED for HR_STAFF — one for each of `Project` (SELECT only), `StaffingOrder` (SELECT), `StaffingOrderSlot` (SELECT), `JobOpening` (SELECT), and `JobPosting` (SELECT/INSERT/UPDATE only as required). Existing policies for existing roles remain byte/behavior equivalent. If an existing policy must be altered (e.g. to widen a USING clause), it is done in a transactional forward-only migration and the diff is recorded explicitly in HANDOFF. "Forward-only" means no destructive schema/data rollback; it does NOT mean policy definitions can never change. No broad `FOR ALL` recruiter policy is introduced. SELECT, INSERT, UPDATE `USING`/`WITH CHECK` clauses are defined separately for each new policy. | `CHOSEN` |
| `DEC-23` | (C-05) The application-to-handler bridge is locked: public apply remains unchanged and creates `CandidateSubmission` / `LaborProfile` through the canonical P1-B authority; `CandidateSubmission.slotId` derives the `StaffingOrder`; all active recruiters assigned to that order see an **UNCLAIMED** queue entry with privacy-safe/masked fields; an assigned recruiter executes a **claim candidate** command; first successful claim creates the canonical active `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM`; claim race is serialized via the repository's existing DB locking / advisory-lock pattern so exactly one recruiter wins; losers receive stable `409 HANDLING_ALREADY_CLAIMED`; after claim, the candidate appears in that recruiter's existing Workbench `MINE` view. Order authority is NOT faked by polymorphic reuse of `LaborProfileHandlingAssignment`. | `CHOSEN` |
| `DEC-24` | (C-06) Sensitive data boundary: StaffingOrder assignment alone does NOT grant global worker/candidate PII. Before claim: only masked/minimal application fields are returned (no phone/CCCD/raw evidence). After claim: the active handler receives only the recruiter-contact fields required for recruitment (e.g. masked phone); CCCD image / raw evidence remain outside this task and require the existing evidence authorization path. There is NO global `CAN_VIEW_WORKER_SENSITIVE` grant to `HR_STAFF`. Unassigned HR_STAFF receives empty / 404 responses without existence oracle. | `CHOSEN` |
| `DEC-25` | (C-07) Placement dual authority: `PLACEMENT_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_STAFF']` is NOT sufficient by itself. For HR_STAFF, every candidate-specific `PlacementCase` / `Placement` command MUST verify, inside the same transaction: (a) active `StaffingOrderRecruiterAssignment` to the exact `StaffingOrder` derived from the submission / slot / jobOpening; AND (b) active `LaborProfileHandlingAssignment` for the relevant `LaborProfile`. ADMIN and HR_MANAGER retain existing broad authority. The same object-scope rule applies to preview / create / confirm / effective / fail / cancel routes. No route may rely only on the coarse role gate. | `CHOSEN` |
| `DEC-26` | (C-08) Deterministic revoke concurrency replaces the prior "in-flight operation may complete or fail closed" wording. Lock-order contract: (a) recruiter command locks and validates the active order-assignment row inside its mutation transaction; (b) revoke locks the same assignment row; (c) if mutation obtains the lock first, it may commit before revoke; (d) if revoke commits first, the later mutation fails closed with uniform `404`; (e) NO mutation may commit after observing `revokedAt IS NOT NULL`; (f) tests exercise BOTH lock orderings; (g) the authorization check and domain mutation share ONE transaction. | `CHOSEN` |
| `DEC-27` | (C-09) Exact command/API contracts are frozen: `POST /api/admin/staffing/orders/{orderId}/recruiters` (ADMIN/HR_MANAGER only; assigns HR_STAFF); `POST /api/admin/staffing/orders/{orderId}/recruiters/{assignmentId}/revoke` (ADMIN/HR_MANAGER only); `POST /api/admin/applications/{submissionId}/claim` (assigned HR_STAFF only). All mutation commands require a raw UUID-v4 `Idempotency-Key`, use canonical `withIdempotency`, derive actor / user / order IDs server-side (do NOT accept actor IDs from request bodies), execute idempotency + authorization + mutation atomically, map duplicate active assignment to stable `409 ASSIGNMENT_ALREADY_EXISTS`, and return privacy-safe errors. | `CHOSEN` |
| `DEC-28` | (C-10) No new broad permission code is introduced in this slice. The proposed `CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS` requirement is REMOVED from P1-A0.4. The locked authorization model is: role establishes the recruiter persona; active `StaffingOrderRecruiterAssignment` establishes object scope; both are required. No `prisma/seed.mjs` permission grant is needed. A future fine-grained permission layer may be a separate task but is not a dependency of this P1 closure. | `CHOSEN` |
| `DEC-29` | (C-11) The implementation allowlist is expanded to enumerate the exact existing / new paths needed for the locked behavior: Prisma schema + one forward-only migration; recruiter assignment service / API / UI; staffing/project L1 scope builders; `JobOpening` / `JobPosting` policies and authoring / list services; application assigned-order queue / read service; candidate claim command / route / tests; recruiter workbench read service / types / UI required to surface claimed rows; Placement F0/F1 route helper / services / routes needed for HR_STAFF object checks; role-label surface that changes "HR Staff" to "Chuyên viên tuyển dụng"; synthetic DB integration tests; `vitest.integration-files.ts`; TASK / HANDOFF / evidence. Wildcard authorization to modify unrelated P1-B conversion, attendance, finance, payroll, leave, n8n, package or lock files is forbidden. Frozen-task source exceptions authorized by T0 are explicitly listed in `§4.2` so this task integrates with already-accepted E0/E1/F0/F1 runtime without editing their historical TASK/HANDOFF/AUDIT artifacts. | `CHOSEN` |
| `DEC-30` | (C-12) The final E2E acceptance chain is replaced/expanded from `AC-E2E-01..AC-E2E-18` to `AC-E2E-01..AC-E2E-22` covering the full canonical flow including: ADMIN creates SO-X and SO-Y in the same Project; Alice assigned to SO-X, Bob unassigned; Alice sees Project minimal metadata and SO-X only; Alice does not see sibling SO-Y despite the same Project; Alice sees SO-X slots only; Alice creates + publishes JobPosting X; public visitor applies; application enters SO-X unclaimed recruiter queue with masked fields; Alice and another SO-X recruiter race to claim — exactly one wins; winner receives active `LaborProfileHandlingAssignment`; winner sees row in Workbench MINE and performs next actions; loser / non-handler cannot mutate that candidate; winner opens / processes PlacementCase; valid Placement outcome reached using dual authority; Bob cannot observe Project / order / slot / posting-admin / application / case; ADMIN/HR_MANAGER revokes winner's StaffingOrder assignment; after revoke, new order-scoped and placement mutations fail closed; both revoke-before-command and command-before-revoke lock orderings tested; public JobPosting remains readable after recruiter revoke unless separately unpublished by canonical publication workflow; zero cross-run residue with FK-safe reverse teardown; existing ADMIN/HR_MANAGER/PM/SALE behavior unchanged; existing P1 public apply and idempotency behavior unchanged. | `CHOSEN` |
| `DEC-31` | (C-01) The v1.1 correction commit is one forward-only docs-only commit on top of predecessor `5bb7581a11312c5111f51e0ec84534b4ac9b4a97`. No amend / reset / rebase / force-push. Exactly the existing two planning documents change. No implementation, no PR, no Tier 3 call, no merge, no migration, no deploy. UTF-8 no-BOM, LF-only, zero NUL/U+FFFD/mojibake. | `CHOSEN` |

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
| `RQ-13` | (C-02) The new `hrp_staffing_order_visible_for(orderId)` helper is **least-authority**: returns true ONLY when `hrp_session_role() = 'HR_STAFF'` AND an active `StaffingOrderRecruiterAssignment` exists for the exact `orderId` with `recruiter_user_id = hrp_session_user_id()`. It MUST NOT duplicate the ADMIN/HR_MANAGER/PM/SALE logic. |
| `RQ-14` | (C-03) A separate SELECT-only helper `hrp_project_recruiter_visible_for(projectId)` exists. It returns true only for HR_STAFF when the project contains at least one `StaffingOrder` actively assigned to that user. There is no INSERT/UPDATE/DELETE authority for HR_STAFF on `Project`. HR_STAFF is NOT added to the root branch of `hrp_project_visible_for` / `hrp_project_writable`. Matrix test updated: `HR_STAFF × projects` returns the assigned-project set, not always `0`. |
| `RQ-15` | (C-04) The contract resolves the policy-truth contradiction: separate narrowly-scoped `PERMISSIVE` policies are ADDED for HR_STAFF on `Project` (SELECT), `StaffingOrder` (SELECT), `StaffingOrderSlot` (SELECT), `JobOpening` (SELECT), `JobPosting` (SELECT/INSERT/UPDATE only as required). Existing policies for existing roles remain byte/behavior equivalent. No broad `FOR ALL` recruiter policy is introduced. SELECT / INSERT / UPDATE `USING` / `WITH CHECK` clauses are defined separately. |
| `RQ-16` | (C-05) Application-to-handler bridge: public apply unchanged; `CandidateSubmission.slotId` derives the `StaffingOrder`; all active recruiters on that order see an UNCLAIMED queue entry with masked fields; assigned recruiter runs a **claim candidate** command; first successful claim creates the canonical active `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM`; race is serialized via the existing DB locking / advisory-lock pattern; exactly one recruiter wins; losers receive stable `409 HANDLING_ALREADY_CLAIMED`; claimed row appears in Workbench `MINE`. |
| `RQ-17` | (C-06) Sensitive data boundary: assignment alone does NOT grant global PII. Pre-claim: only masked / minimal application fields. Post-claim: recruiter-contact fields only. CCCD image / raw evidence remain outside this task. No global `CAN_VIEW_WORKER_SENSITIVE` grant. Unassigned HR_STAFF gets empty / 404 without existence oracle. |
| `RQ-18` | (C-07) Placement dual authority: extending `PLACEMENT_ROLES` to `[ADMIN, HR_MANAGER, HR_STAFF]` is NOT sufficient. For HR_STAFF, every candidate-specific `PlacementCase` / `Placement` command MUST verify, in the same transaction: active `StaffingOrderRecruiterAssignment` to the exact `StaffingOrder` derived from submission / slot / jobOpening; AND active `LaborProfileHandlingAssignment` for the relevant `LaborProfile`. Same rule for preview / create / confirm / effective / fail / cancel routes. |
| `RQ-19` | (C-08) Deterministic revoke concurrency: lock-order contract enforced. Recruiter command locks and validates the active order-assignment row in its mutation transaction; revoke locks the same row. If mutation obtains lock first → may commit before revoke. If revoke commits first → later mutation fails closed with uniform `404`. NO mutation commits after observing `revokedAt IS NOT NULL`. Tests cover BOTH lock orderings. Authorization check + domain mutation share ONE transaction. |
| `RQ-20` | (C-09) Exact routes: `POST /api/admin/staffing/orders/{orderId}/recruiters` (ADMIN/HR_MANAGER); `POST /api/admin/staffing/orders/{orderId}/recruiters/{assignmentId}/revoke` (ADMIN/HR_MANAGER); `POST /api/admin/applications/{submissionId}/claim` (assigned HR_STAFF). All mutation commands require raw UUID-v4 `Idempotency-Key`, use canonical `withIdempotency`, derive actor/user/order IDs server-side, execute idempotency + authorization + mutation atomically, map duplicate active assignment to stable `409 ASSIGNMENT_ALREADY_EXISTS`, return privacy-safe errors. |
| `RQ-21` | (C-10) No new broad permission code is introduced in this slice. The proposed `CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS` is REMOVED. The locked authorization model is: role establishes recruiter persona; active `StaffingOrderRecruiterAssignment` establishes object scope; both required. No `prisma/seed.mjs` permission grant needed. |
| `RQ-22` | (C-11 + C-12) Implementation allowlist expanded per `§4.2`. Final E2E chain expanded to `AC-E2E-01..AC-E2E-22` per `§6.2` (22 measurable steps including sibling-order isolation, claim race, dual-authority Placement, revoke lock-orderings both directions, and cross-run residue safety). |

### 4.2 Scope boundaries

**In scope (this planning round)**

- `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md`
- `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`

**In scope (implementation round — **planned**, not executed in this round)**

The implementation round allowlist (per `DEC-29` / `C-11`) enumerates the exact
existing / new paths needed for the locked behavior:

- `prisma/schema.prisma` — additive model `StaffingOrderRecruiterAssignment`
  + relations; no field rename / type change.
- `prisma/migrations/<UTC>_p1a04_scoped_recruiter_assignment/migration.sql` —
  additive forward-only migration (table, partial unique index, RLS
  policies, DB-locking helper registration as needed).
- `src/shared/auth/scopes/staffing.scope.ts` — narrow HR_STAFF branch
  (`hrp_staffing_order_visible_for` helper integration).
- `src/shared/auth/scopes/project.scope.ts` — narrow HR_STAFF branch
  (`hrp_project_recruiter_visible_for` helper integration; SELECT-only).
- `src/domains/staffing/l1-scope/builders/**` — staffing L1 scope builder
  updates (slot / order eligibility predicates for HR_STAFF).
- `src/domains/staffing/l1-scope/builders/project.builder.ts` — Project
  L1 narrowing for HR_STAFF (assigned-project set only).
- `src/domains/staffing/job-opening.service.ts` — read path honoring
  `JobOpening` HR_STAFF SELECT policy.
- `src/domains/staffing/job-posting.service.ts` — SELECT / INSERT / UPDATE
  honoring HR_STAFF policy.
- `src/domains/staffing/job-posting-authoring.service.ts` — narrow slot
  eligibility for the create path (assigned-order set).
- `src/domains/staffing/job-posting-list.service.ts` — leave unchanged if
  L1 narrowing is sufficient at the RLS layer; otherwise narrow the read
  service per slot.
- `src/domains/staffing/assignment-placement.service.ts` — extend
  `PLACEMENT_ROLES` from `[ADMIN, HR_MANAGER]` to
  `[ADMIN, HR_MANAGER, HR_STAFF]` and add the dual-authority per-slot
  scope predicate (active `StaffingOrderRecruiterAssignment` AND active
  `LaborProfileHandlingAssignment`).
- `src/domains/staffing/recruiter-assignment.service.ts` *(new)* —
  assignment CRUD with `withIdempotency`; revoke semantics with
  `revokedAt` (DB-locked, deterministic).
- `src/domains/applications/unclaimed-queue.service.ts` *(new)* —
  assigned-order queue read service returning masked application fields
  for HR_STAFF.
- `src/domains/applications/claim-candidate.service.ts` *(new)* — claim
  candidate command using canonical DB locking / advisory-lock pattern;
  creates active `LaborProfileHandlingAssignment` with source
  `ORDER_RECRUITER_CLAIM`; stable `409 HANDLING_ALREADY_CLAIMED` for losers.
- `src/domains/recruiter/workbench.service.ts` — read service types and
  handlers required to surface claimed rows in `MINE` for HR_STAFF.
- `src/app/admin/recruiter-workbench/_components/MineList.tsx` *(or
  equivalent)** — UI surface that shows claimed candidate rows.
- `src/domains/placement/route-helpers/case.command.ts` *(or equivalent
  Placement F0/F1 helpers)* — helpers to enforce HR_STAFF dual authority
  in preview / create / confirm / effective / fail / cancel routes.
- `src/domains/placement/services/{case,placement}.service.ts` —
  candidate-specific commands guarded by the dual-authority predicate.
- `src/app/api/admin/staffing/orders/[orderId]/recruiters/route.ts`
  *(new)* — `POST` assign (ADMIN/HR_MANAGER).
- `src/app/api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke/route.ts`
  *(new)* — `POST` revoke (ADMIN/HR_MANAGER).
- `src/app/api/admin/applications/[submissionId]/claim/route.ts` *(new)* —
  `POST` claim (assigned HR_STAFF).
- `src/app/admin/staffing/orders/[orderId]/recruiters/_components/**`
  *(new)* — assignment UI using `DataTable` + form primitives.
- Role-label surface (`src/i18n/locales/{vi,en}/**` or equivalent) that
  changes the "HR Staff" label to "Chuyên viên tuyển dụng"; internal
  enum remains `HR_STAFF`.
- `tests/db/**` — synthetic DB integration tests for: assignment
  lifecycle, sibling-order isolation in same Project, fail-closed
  (404 on unassigned read), revoke propagation (both lock orderings),
  race safety for claim (advisory lock), assignment-oracle prevention,
  revoke-during-in-flight-write behavior, dual-authority Placement,
  masked-field redaction pre-claim.
- `vitest.integration-files.ts` — register the synthetic DB integration
  files in the canonical integration runner.
- `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/{TASK.md,HANDOFF.md,AUDIT.md,evidence/**}`.

**Frozen-task source exceptions (explicitly authorized by T0)**

The implementation round integrates with already-accepted E0/E1/F0/F1
runtime. To honor T0's instruction to integrate without editing their
historical TASK/HANDOFF/AUDIT artifacts, the following narrowly-scoped
source exceptions are authorized for the **implementation round only**:

- `src/domains/applications/conversion.service.ts` (P1-B frozen) —
  read-only consumption is allowed; no behavioral or signature change.
- `src/domains/placement/route-helpers/**` (P1-F0/F1 frozen) — adding a
  narrow `assertPlacementHrStaffDualAuthority()` helper is allowed **as a
  new exported helper**, not as an edit to the existing route bodies.
  Existing route bodies continue to call the canonical F0/F1 helper;
  HR_STAFF gating is enforced via the dual-authority predicate **before**
  calling those F0/F1 helpers.
- `src/shared/auth/withIdempotency.ts` (E1 frozen) — read-only
  consumption; no behavioral or signature change.
- `src/lib/auth/session.ts` — read-only consumption; no JWT / session
  shape change.

No historical TASK.md / HANDOFF.md / AUDIT.md / evidence/ bundle of any
frozen task is to be edited. This task's own TASK / HANDOFF / AUDIT /
evidence/ bundle is the only such bundle that may be created or edited
for this work.

**Out of scope (explicit non-goals)**

- `prisma/schema.prisma` model changes beyond the additive aggregate
  (`StaffingOrderRecruiterAssignment`) and its relations.
- `src/domains/attendance/**` — no authority definition from attendance.
- `src/domains/finance/**` — no authority definition from finance.
- `src/domains/payroll/**` — no authority definition from payroll.
- `src/domains/leave/**` — no authority definition from leave.
- `src/domains/conversion/**` (P1-B) — no behavioral change.
- `src/domains/n8n/**` and any n8n workflow files — no n8n dependency,
  no direct n8n DB access.
- `src/lib/auth/session.ts` — no JWT/session shape change.
- `package.json` / `package-lock.json` / `pnpm-lock.yaml` /
  `yarn.lock` — no new dependency.
- Sidebar IA / label order / icon change beyond the "Chuyên viên tuyển
  dụng" label surface inside the recruiter surface itself.
- `docs/PLANNER_HANDOVER.md` (T0-owned).
- `LaborProfileHandlingAssignment` polymorphic reuse for fake order
  authority (DEC-23 / C-05).
- `Worker.assignedToId` polymorphism.
- A new broad permission code such as `CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS`
  (DEC-28 / C-10) — REMOVED from this slice.
- Direct DB writes from background jobs / n8n.
- A broad `FOR ALL` recruiter policy (DEC-22 / C-04).
- Adding `HR_STAFF` to the root/global branch of `hrp_project_visible_for`
  or `hrp_project_writable` (DEC-21 / C-03).
- Production migration (`prisma migrate deploy` is OWNED by T0;
  planning round does not author a migration).

### 4.3 Domain boundaries

- **Data/state:** synthetic DB integration tests use disposable fixture
  ids. Production DB is not mutated in this round (no migration authored).
- **Permission/security:** additive SECDEFINER helpers + additive narrowly-
  scoped `PERMISSIVE` policies for HR_STAFF (one per table). No broad `FOR
  ALL` recruiter policy. No DROP policy, no DISABLE RLS, no privileged
  bypass. Existing policies for existing roles remain byte/behavior
  equivalent.
- **Interface/API:** the three frozen routes in `DEC-27` / `C-09` are
  new. No public API contract changes. No JWT shape change.
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
| `AC-08` | TASK contract closes all 17 locked Owner decisions in §3 with `Status = CHOSEN` and additional `DEC-18..DEC-31` (migration posture, planning-round posture, and the 12 T0-correction decisions `C-01..C-12`). | `grep -nE "\| DEC-\|\| \`CHOSEN\` \|" docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` returns ≥ 31 rows in §3 (the `DEC-01..DEC-31` set). |
| `AC-09` | TASK contract declares `BUILD_VS_ADOPT = ADOPT` with §3.1 evidence; `BUILD_VS_AUTOMATE = N/A` with §3.2 evidence. | `grep -nE "Build vs adopt\|Build vs automate" docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` returns rows matching the gate's expected field names. |
| `AC-10` | TASK contract encodes the final E2E acceptance chain `AC-E2E-01..AC-E2E-22` covering ADMIN assign → HR_STAFF login → view only assigned demand/slots (including sibling-order isolation in same Project) → create + publish JobPosting → public apply → claim candidate race (exactly-one-winner) → Workbench MINE → dual-authority Placement → revoke lock-orderings (both directions) → cross-run residue safety. | `grep -nE "\| \`AC-E2E-" docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` returns 22 rows in §6.2. |
| `AC-11` | Exactly two docs files are changed (`docs/discovery/realignment/P1A04_*.md` and `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`). Zero source / schema / migration / package / lockfile modification. | `git diff --name-only origin/main..HEAD` returns exactly the two paths; `git diff --name-only origin/main..HEAD -- app/ src/ prisma/ package.json package-lock.json vitest.config.ts vitest.unit.config.ts vitest.integration.config.ts next.config.* tsconfig.json middleware.ts` returns empty. |
| `AC-12` | UTF-8 no-BOM, LF-only, zero U+FFFD/mojibake on every changed text file. | `node .ai-pipeline/scripts/verify-encoding.mjs` exits 0. |
| `AC-13` | `git diff --check origin/main..HEAD` returns no warnings on the planning diff. | `git diff --check origin/main..HEAD` exits 0 with empty output. |
| `AC-14` | `verify-task.ps1` runs against the planning TASK and passes (warnings allowed for placeholder/dry-run findings because status is `PROPOSED_ONLY`). | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` exits 0. |
| `AC-15` | No `Tier 3` call, no `PR` opened, no `merge`, no `deploy`. | `git log -1 --format=%s` reports the planning intent; `gh pr list` does not include a PR for the planning branch. |
| `AC-16` | Production migration is NOT applied from this branch in any round. | `git diff --name-only origin/main..HEAD -- prisma/migrations/` returns empty; the implementation round's TASK carries the `T0_PRODUCTION_MIGRATION_GATE` field as a planning placeholder. |
| `AC-17` | (C-01) Control fields after correction: Spec version `v1.1`; Status `READY_TO_CODE`; Contract gate `READY_TO_CODE`; Contract accepted by T0 `YES`; Decision state `CLOSED`; Correction budget `1`; Correction batches used `1`; Next gate `TIER1_IMPLEMENTATION_FREEZE`; Baseline pinned at `f3a3d1a4`; Zero open Owner decisions. Both revision logs record `C-01..C-12`. | `grep -nE "Spec version.*v1.1\|Status.*READY_TO_CODE\|Contract accepted by T0.*YES\|Correction batches used.*1\|Next gate.*TIER1_IMPLEMENTATION_FREEZE" docs/tasks/.../TASK.md` returns all five rows. `grep -nE "\| \`v1.1\` \|" docs/tasks/.../TASK.md` shows a revision-log row recording C-01..C-12. |
| `AC-18` | (C-02) Realignment doc specifies `hrp_staffing_order_visible_for(orderId)` as **least-authority**: returns true ONLY when `hrp_session_role() = 'HR_STAFF'` AND an active `StaffingOrderRecruiterAssignment` exists for that exact order with `recruiter_user_id = hrp_session_user_id()`. Helper does NOT duplicate ADMIN/HR_MANAGER/PM/SALE logic. | `grep -nE "hrp_staffing_order_visible_for\|hrp_session_role.*HR_STAFF\|recruiter_user_id.*hrp_session_user_id" docs/discovery/realignment/P1A04_*.md` returns non-empty matches in §3.2 (or equivalent). |
| `AC-19` | (C-03) Realignment doc specifies the scoped SELECT-only helper `hrp_project_recruiter_visible_for(projectId)`: true only for HR_STAFF when the project contains ≥1 `StaffingOrder` actively assigned to that user. HR_STAFF NOT added to root/global branch of `hrp_project_visible_for` / `hrp_project_writable`. Matrix test updated: `HR_STAFF × projects` returns assigned-project set, not always `0`. | `grep -nE "hrp_project_recruiter_visible_for\|SELECT-only\|assigned-project set" docs/discovery/realignment/P1A04_*.md` returns non-empty matches. |
| `AC-20` | (C-04) The "no DROP policy / DROP POLICY" contradiction is removed; the contract locks separate narrowly-scoped `PERMISSIVE` policies for HR_STAFF: `Project` SELECT, `StaffingOrder` SELECT, `StaffingOrderSlot` SELECT, `JobOpening` SELECT, `JobPosting` SELECT/INSERT/UPDATE only as required. Existing policies for existing roles remain byte/behavior equivalent. No broad `FOR ALL` recruiter policy. SELECT, INSERT, UPDATE `USING`/`WITH CHECK` defined separately. "Forward-only" clarified: no destructive schema/data rollback; policy definitions may change in transactional forward-only migration. | `grep -nE "PERMISSIVE.*HR_STAFF\|FOR ALL.*recruiter\|USING\|WITH CHECK\|forward-only" docs/discovery/realignment/P1A04_*.md` returns non-empty matches in §3.4 (or equivalent). |
| `AC-21` | (C-05) Application-to-handler bridge locked: public apply unchanged → derives StaffingOrder from slot → UNCLAIMED queue with masked fields visible to all active assigned recruiters → assigned recruiter executes "claim candidate" → first claim creates active `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM` via DB lock → losers get `409 HANDLING_ALREADY_CLAIMED` → claimed row appears in Workbench `MINE`. Order authority NOT faked via polymorphic `LaborProfileHandlingAssignment`. | `grep -nE "ORDER_RECRUITER_CLAIM\|HANDLING_ALREADY_CLAIMED\|claim candidate\|UNCLAIMED" docs/discovery/realignment/P1A04_*.md` returns non-empty matches in §4. |
| `AC-22` | (C-06) Sensitive data boundary locked: pre-claim → masked/minimal application fields; post-claim → recruiter-contact fields only; CCCD image / raw evidence outside this task; NO global `CAN_VIEW_WORKER_SENSITIVE` grant to `HR_STAFF`; unassigned HR_STAFF → empty / 404 without existence oracle. | `grep -nE "masked\|recruiter-contact\|CCCD\|CAN_VIEW_WORKER_SENSITIVE\|existence oracle" docs/discovery/realignment/P1A04_*.md` returns non-empty matches in §5. |
| `AC-23` | (C-07) Placement dual authority locked: `PLACEMENT_ROLES = [ADMIN, HR_MANAGER, HR_STAFF]` is NOT sufficient alone. For HR_STAFF, every candidate-specific `PlacementCase` / `Placement` command verifies in the SAME transaction: (a) active `StaffingOrderRecruiterAssignment` to exact `StaffingOrder` AND (b) active `LaborProfileHandlingAssignment` for the relevant `LaborProfile`. Same rule for preview / create / confirm / effective / fail / cancel routes. | `grep -nE "dual authority\|same transaction\|PlacementCase\|placement route" docs/discovery/realignment/P1A04_*.md` returns non-empty matches in §6. |
| `AC-24` | (C-08) Deterministic revoke concurrency lock-order contract enforced: recruiter command locks + validates order-assignment row in mutation tx; revoke locks same row; if mutation first → may commit; if revoke first → mutation fails closed with uniform `404`; NO mutation commits after observing `revokedAt IS NOT NULL`; tests cover BOTH lock orderings; authorization check + domain mutation share ONE transaction. | `grep -nE "lock-order\|revokedAt IS NOT NULL\|fail closed\|uniform 404\|share one transaction\|lock ordering" docs/discovery/realignment/P1A04_*.md` returns non-empty matches in §7. |
| `AC-25` | (C-09) Exact routes frozen: `POST /api/admin/staffing/orders/{orderId}/recruiters` (ADMIN/HR_MANAGER); `POST /api/admin/staffing/orders/{orderId}/recruiters/{assignmentId}/revoke` (ADMIN/HR_MANAGER); `POST /api/admin/applications/{submissionId}/claim` (assigned HR_STAFF). All mutation commands require raw UUID-v4 `Idempotency-Key`, use canonical `withIdempotency`, derive actor/user/order IDs server-side, do NOT accept actor IDs from request body, execute idempotency + authorization + mutation atomically, map duplicate active assignment to stable `409 ASSIGNMENT_ALREADY_EXISTS`, return privacy-safe errors. | `grep -nE "/api/admin/staffing/orders/.*recruiters\|/api/admin/applications/.*claim\|Idempotency-Key\|UUID-v4\|withIdempotency\|ASSIGNMENT_ALREADY_EXISTS\|privacy-safe" docs/discovery/realignment/P1A04_*.md` returns non-empty matches in §8. |
| `AC-26` | (C-10) The proposed `CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS` permission code is REMOVED from P1-A0.4. Authorization model: role establishes recruiter persona; active `StaffingOrderRecruiterAssignment` establishes object scope; both required. No `prisma/seed.mjs` permission grant needed. | `grep -nE "CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS.*REMOVED\|role.*recruiter persona\|active.*StaffingOrderRecruiterAssignment.*object scope" docs/discovery/realignment/P1A04_*.md` returns non-empty matches in §9. |
| `AC-27` | (C-11) Implementation allowlist expanded to enumerate: Prisma schema + one forward-only migration; recruiter assignment service / API / UI; staffing/project L1 scope builders; JobOpening/JobPosting policies + authoring/list services; application assigned-order queue / read service; candidate claim command / route / tests; recruiter workbench read service / types / UI to surface claimed rows; Placement F0/F1 route helper / services / routes for HR_STAFF object checks; role-label surface "Chuyên viên tuyển dụng"; synthetic DB integration tests; `vitest.integration-files.ts`; TASK / HANDOFF / evidence. Wildcard authorization to unrelated P1-B / attendance / finance / payroll / leave / n8n / package / lock files is forbidden. Frozen-task source exceptions explicitly listed. | `grep -nE "recruiter-assignment.service\|recruiter-assignment\|claim-candidate.service\|unclaimed-queue.service\|hrp_staffing_order_visible_for\|hrp_project_recruiter_visible_for\|Chuyên viên tuyển dụng\|Frozen-task source exceptions\|wildcard authorization" docs/tasks/.../TASK.md` returns non-empty matches in §4.2. |
| `AC-28` | (C-12) Final E2E acceptance chain replaced/expanded to `AC-E2E-01..AC-E2E-22` per §6.2 of this TASK, including sibling-order isolation in same Project, claim race (exactly-one-winner), Workbench MINE, dual-authority Placement, revoke lock-orderings both directions, public posting readable after revoke (unless separately unpublished), zero cross-run residue with FK-safe reverse teardown, existing ADMIN/HR_MANAGER/PM/SALE behavior unchanged, existing P1 public apply + idempotency behavior unchanged. | `grep -nE "\| \`AC-E2E-" docs/tasks/.../TASK.md` returns exactly 22 rows in §6.2. |
| `AC-29` | (C-12) AC-E2E-04..AC-E2E-05 explicitly cover sibling-order isolation in the same Project (assigned vs unassigned visibility). | `grep -nE "sibling\|same Project\|SO-X\|SO-Y" docs/tasks/.../TASK.md` returns non-empty matches in §6.2. |
| `AC-30` | (C-12) AC-E2E-09..AC-E2E-12 explicitly cover the claim race and Workbench MINE routing. | `grep -nE "race\|claim\|MINE\|HANDLING_ALREADY_CLAIMED\|ORDER_RECRUITER_CLAIM" docs/tasks/.../TASK.md` returns non-empty matches in §6.2. |
| `AC-31` | (C-12) AC-E2E-13..AC-E2E-14 explicitly cover dual-authority Placement. | `grep -nE "PlacementCase\|dual authority\|Placement" docs/tasks/.../TASK.md` returns non-empty matches in §6.2. |
| `AC-32` | (C-12) AC-E2E-16..AC-E2E-18 explicitly cover revoke lock-orderings both directions. | `grep -nE "revoke\|lock\|404\|fail closed" docs/tasks/.../TASK.md` returns non-empty matches in §6.2. |
| `AC-33` | (C-12) AC-E2E-19 explicitly covers public JobPosting remaining readable after recruiter revoke (unless separately unpublished). | `grep -nE "public JobPosting\|public posting\|canonical publication workflow" docs/tasks/.../TASK.md` returns non-empty matches in §6.2. |
| `AC-34` | (C-12) AC-E2E-20 explicitly covers zero cross-run residue with FK-safe reverse teardown. | `grep -nE "cross-run residue\|FK-safe\|reverse teardown" docs/tasks/.../TASK.md` returns non-empty matches in §6.2. |
| `AC-35` | (C-12) AC-E2E-21 explicitly covers existing ADMIN/HR_MANAGER/PM/SALE behavior unchanged. | `grep -nE "ADMIN\|HR_MANAGER\|PM\|SALE" docs/tasks/.../TASK.md` returns non-empty matches in §6.2. |
| `AC-36` | (C-12) AC-E2E-22 explicitly covers existing P1 public apply and idempotency behavior unchanged. | `grep -nE "public apply\|idempotency\|unchanged" docs/tasks/.../TASK.md` returns non-empty matches in §6.2. |
| `AC-37` | (C-04) Policy migration truthfulness: realignment doc explicitly resolves the contradiction between "no DROP policy" and example SQL using `DROP POLICY`. The locked truth is: separate narrowly-scoped `PERMISSIVE` policies are ADDED; existing policies for existing roles remain byte/behavior equivalent; if any existing policy is altered, the diff is documented in HANDOFF and applied via transactional forward-only migration. "Forward-only" is defined as no destructive schema/data rollback (NOT "policy definitions can never change"). | `grep -nE "no DROP\|byte/behavior equivalent\|transactional forward-only migration\|forward-only.*no destructive schema" docs/discovery/realignment/P1A04_*.md` returns non-empty matches. |
| `AC-38` | (C-11) Frozen-task source exceptions explicitly listed in §4.2: read-only consumption of `src/domains/applications/conversion.service.ts` (P1-B); new exported helper from `src/domains/placement/route-helpers/**` (P1-F0/F1) without editing existing F0/F1 route bodies; read-only consumption of `src/shared/auth/withIdempotency.ts` (E1) and `src/lib/auth/session.ts`. No historical TASK/HANDOFF/AUDIT/evidence/ bundle of any frozen task may be edited. | `grep -nE "Frozen-task source exceptions\|conversion.service.ts\|placement/route-helpers\|withIdempotency.ts\|session.ts" docs/tasks/.../TASK.md` returns non-empty matches in §4.2. |

### 6.2 Final E2E acceptance (Owner-mandated — **planned** for the implementation round)

The implementation round's TASK contract must encode this AC chain verbatim,
with a synthetic DB integration plan per AC. This planning round carries
the chain forward so the implementation contract has a single source of
truth. The chain below is the **v1.1 expansion of `C-12`** (see `DEC-30`)
— `AC-E2E-01..AC-E2E-22` supersedes the original `AC-E2E-01..AC-E2E-18`
set from the v1.0 planning round.

| AC | Pass condition (Owner-mandated final E2E) | Verification method (implementation round) |
|---|---|---|
| `AC-E2E-01` | ADMIN creates `StaffingOrder SO-X` and `StaffingOrder SO-Y` under the SAME Project P. | synthetic DB integration test |
| `AC-E2E-02` | ADMIN/HR_MANAGER assigns HR_STAFF-Alice to `SO-X` via assignment UI/API; HR_STAFF-Bob remains unassigned to either order. | synthetic DB integration test |
| `AC-E2E-03` | HR_STAFF-Alice logs in (fresh JWT) — `AuthContext.role=HR_STAFF`, `userId=Alice.id`. Alice sees the minimal Project P metadata required to render SO-X (no other Project fields, no other projects). | synthetic DB integration test |
| `AC-E2E-04` | Alice calls `GET /api/staffing/orders` — sees ONLY `SO-X`. Sibling `SO-Y` in the SAME Project P is NOT visible to Alice (sibling-order isolation). | synthetic DB integration test |
| `AC-E2E-05` | Alice calls `GET /api/staffing/orders/{SO-Y.id}` for an unassigned sibling order — uniform `404` (no existence oracle). | synthetic DB integration test |
| `AC-E2E-06` | Alice calls `GET /api/staffing/orders/{SO-X.id}/slots` — sees slots of `SO-X` only. | synthetic DB integration test |
| `AC-E2E-07` | Alice creates a JobPosting for `SO-X.slot[0]` and publishes it — `200/201`, status `PUBLISHED`, canonical idempotency replay. | synthetic DB integration test |
| `AC-E2E-08` | Public visitor `GET /api/jobs?slug=...` — sees Alice's posting. Public visitor `POST /api/public/jobs/{slug}/apply` — `201` (canonical apply path, unchanged). | synthetic DB integration test |
| `AC-E2E-09` | Application enters the `SO-X` unclaimed recruiter queue. Alice and another SO-X-assigned recruiter race to claim the candidate. Exactly ONE recruiter wins; the loser receives stable `409 HANDLING_ALREADY_CLAIMED`. | synthetic DB integration test |
| `AC-E2E-10` | Winner receives an active `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM`. The canonical claim command runs inside one transaction with authorization + DB lock + domain mutation. | synthetic DB integration test |
| `AC-E2E-11` | Winner sees the candidate row in Workbench `MINE` and can perform the next actions (profile score, PlacementCase open, Placement preview). Loser / non-handler cannot mutate that candidate. | synthetic DB integration test |
| `AC-E2E-12` | Winner opens `PlacementCase` and processes Placement preview / create / confirm — valid Placement outcome is reached using DUAL AUTHORITY (active `StaffingOrderRecruiterAssignment` AND active `LaborProfileHandlingAssignment` in same transaction). | synthetic DB integration test |
| `AC-E2E-13` | HR_STAFF-Bob (NOT assigned to either order) attempts the same flow — uniform `404` / empty list at every step (project, order, slot, posting-admin, application, case, placement). | synthetic DB integration test |
| `AC-E2E-14` | ADMIN/HR_MANAGER revokes the WINNER's `StaffingOrderRecruiterAssignment` (lock-order case A: revoke first). | synthetic DB integration test |
| `AC-E2E-15` | After revoke, NEW order-scoped and placement mutations by the previously-winning recruiter fail closed (uniform `404`). The DB-locked revoke row guarantees no mutation commits after `revokedAt IS NOT NULL`. | synthetic DB integration test |
| `AC-E2E-16` | Lock-order case B: a new mutation is started by the previously-winning recruiter, then ADMIN/HR_MANAGER revokes. The mutation either commits before revoke (snapshot-time authorization) OR fails closed with uniform `404`. Authorization check + domain mutation share ONE transaction. | synthetic DB integration test |
| `AC-E2E-17` | The public `JobPosting` remains READABLE after the recruiter revoke — public listing/apply path is unchanged. Public unpublish is a separate canonical publication workflow, NOT triggered by recruiter revoke. | synthetic DB integration test |
| `AC-E2E-18` | Bob remains unable to observe ANY of: Project P metadata beyond what he is assigned to; SO-X / SO-Y; slots; posting-admin; application; case; placement — across all revoke states. | synthetic DB integration test |
| `AC-E2E-19` | Pre-claim / masked boundary: while the candidate is UNCLAIMED, the unclaimed queue read returns only masked / minimal application fields (no phone / no CCCD / no raw evidence). | synthetic DB integration test |
| `AC-E2E-20` | Post-claim / handler boundary: after winning the claim, the handler receives only the recruiter-contact fields required for recruitment. CCCD image / raw evidence remain outside this task and require the existing evidence authorization path. | synthetic DB integration test |
| `AC-E2E-21` | Zero cross-run residue; FK-safe reverse teardown. Every fixture row created in `tests/db/**` for the 22-step chain is deleted in teardown; no orphan rows remain across runs. | synthetic DB integration test |
| `AC-E2E-22` | Existing ADMIN / HR_MANAGER / PM / SALE behavior remains byte/behavior equivalent. Existing P1 public apply + idempotency behavior remains byte/behavior equivalent. No regression in the canonical `withIdempotency` or `withDbContext` helpers. | synthetic DB integration test + regression diff of canonical helper calls |

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
| `RQ-13` | STEP-05, STEP-06 | AC-18, AC-27 |
| `RQ-14` | STEP-05, STEP-06 | AC-19, AC-27 |
| `RQ-15` | STEP-05, STEP-06 | AC-20, AC-37, AC-27 |
| `RQ-16` | STEP-05, STEP-06 | AC-21, AC-30 |
| `RQ-17` | STEP-05, STEP-06 | AC-22, AC-29, AC-30 |
| `RQ-18` | STEP-05, STEP-06 | AC-23, AC-31 |
| `RQ-19` | STEP-05, STEP-06 | AC-24, AC-32 |
| `RQ-20` | STEP-05, STEP-06 | AC-25, AC-27 |
| `RQ-21` | STEP-05, STEP-06 | AC-26, AC-27 |
| `RQ-22` | STEP-05, STEP-06 | AC-27, AC-28, AC-29, AC-30, AC-31, AC-32, AC-33, AC-34, AC-35, AC-36, AC-38 |

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
| `OQ-01` | None | — | All 17 locked Owner decisions are represented in §3 with status `CHOSEN`. T0 v1.1 correction `C-01..C-12` is closed; no further OPEN Owner decisions at the planning level. Zero OPEN Owner questions. |

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | Adopt the planning contract as written; baseline `f3a3d1a4`; status `PROPOSED_ONLY`; `Contract gate = DRAFT`; `Decision state = CLOSED` (Owner decisions locked); correction budget = 1 (V2 base); `Audit mode = LIGHT` (carries into implementation round only). | T0 directive priority: docs-only planning, no implementation, no PR, no Tier 3. The contract deliberately scopes execution to two docs files and treats the implementation round as a separate worktree on a separate baseline. |
| 2 (v1.1 correction) | Apply T0 verdict `CHANGES_REQUIRED` as one forward-only docs-only correction commit on top of predecessor `5bb7581a11312c5111f51e0ec84534b4ac9b4a97`. Status → `READY_TO_CODE`. Contract gate → `READY_TO_CODE` (V2 enum; T0 acceptance recorded semantically as `Contract accepted by T0: YES`). Correction budget = 1 (the v1.1 batch `C-01..C-12`); correction batches used = 1. Next gate → `TIER1_IMPLEMENTATION_FREEZE`. No source / schema / migration / package / lockfile / test changes. No amend/reset/rebase/force-push. Predecessor SHA preserved. | T0 correction directive `C-01..C-12`: control field updates, least-authority helper, scoped Project SELECT helper, separate narrow PERMISSIVE policies, application-to-handler claim bridge, sensitive data boundary, Placement dual authority, deterministic revoke concurrency, exact command/API contracts, no new broad permission code, expanded implementation allowlist, expanded final E2E chain to 22 steps. |

## 10. Revision Log

| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v1.0` | 2026-09-28 | Tier 1 (T1C) | Initial planning contract; baseline `f3a3d1a4`; CRITICAL + LIGHT (carries into implementation); PROPOSED_ONLY + Contract gate DRAFT + Decision state CLOSED; correction budget 1; AC-E2E-01..AC-E2E-18 chain carried forward from Owner directive; DEC-01..DEC-19 close all 17 locked Owner decisions plus DEC-18 (forward-only migration posture) and DEC-19 (planning-round posture). | `T0 → T1C — P1-A0.4 Scoped Recruiter Authority — planning round` |
| `v1.1` | 2026-09-28 | Tier 1 (T1C) | T0 correction `C-01..C-12` consolidated into one docs-only forward-only commit on top of predecessor `5bb7581a`. Control fields: Spec version v1.1; Status `READY_TO_CODE`; Contract gate `READY_TO_CODE` (V2 enum; T0 acceptance recorded as semantic field `Contract accepted by T0: YES`); Decision state CLOSED; correction budget 1; correction batches used 1; next gate `TIER1_IMPLEMENTATION_FREEZE`; baseline pinned at `f3a3d1a4`; zero open Owner decisions. See realignment doc §3.2 (least-authority helper), §3.3 (scoped Project SELECT helper), §3.4 (separate narrow PERMISSIVE policies), §4 (Application-to-handler claim bridge), §5 (sensitive data boundary), §6 (Placement dual authority), §7 (deterministic revoke concurrency), §8 (exact command/API contracts), §9 (no new broad permission code), §10 (expanded implementation allowlist), §11 (AC-E2E expanded to 22 steps). See TASK §3 (DEC-20..DEC-31 closing C-01..C-12), §4.1 (RQ-13..RQ-22), §6 (AC-17..AC-38 + AC-E2E-01..AC-E2E-22). | `T0 → T1C — P1-A0.4 Contract Correction v1.1 — C-01..C-12` |
