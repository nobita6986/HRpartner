# P1-A0.4 — Scoped Recruiter Authority — TASK

**Pipeline V2 — Task Contract**

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-p1-a0-4-scoped-recruiter-authority` |
| Work type | `IMPLEMENTATION` |
| Doc type | `task/contract` |
| Spec version | `v1.3` |
| Status | `READY_TO_CODE` |
| Planner | `Tier 1` (T1C) |
| Baseline | `f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7` |
| Contract gate | `READY_TO_CODE` |
| Contract accepted by T0 | `YES` |
| Decision state | `CLOSED` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Security/RLS slice (additive aggregate + SECDEFINER helpers + revoke locking); Tier 3 must verify on synthetic-DB evidence, not unit/static. |
| Planning correction budget | `1` (consumed by v1.1 `C-01..C-12`) |
| T0 planning integrity exceptions used | `1` (consumed by v1.2 `I-01..I-08`) |
| Implementation correction budget | `1` |
| Implementation correction batches used | `0` |
| Test environment | `REQUIRED` (synthetic-DB preflight; readiness determined by preflight outcome) |
| Current execution round | `2` (planning round closed at v1.3; implementation round begins on Phase 1 worktree) |
| Current audit round | `0` (Tier 3 not called) |
| Next gate | `TIER1_IMPLEMENTATION_FREEZE` |
| Open Owner decisions | `0` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Build vs adopt | `ADOPT` |
| Build vs automate | `N/A` |
| In-scope roots | `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md`; `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` |
| Required gates | `verify-task.ps1`; `.ai-pipeline/scripts/verify-task.ps1` |
| Predecessor chain (preserved) | `5bb7581a11312c5111f51e0ec84534b4ac9b4a97` (v1.0); `f1fff224e4d5fb9c4c6a24a51add565d85ed2c4e` (v1.1); `e40a0b50863a3501f89943ba737592f1e2054e8d` (v1.2 planning, ACCEPTED by T0) |
| v1.3 directive | `T0 → T1C — P1-A0.4 contract ACCEPTED + implementation authorization` |

## 1. Outcome

This planning-round contract documents the additive aggregation shape
and authorization scope for a future recruitment-workbench slice
(P1-A0.4). The planning round does not authorize implementation in this
round — it stops at T0 review. After T0 acceptance, an
implementation-round contract (separate baseline pin) will encode the
synthetic DB integration plan and the acceptance chain carried as
`AC-E2E-01..AC-E2E-22` in §6.2 below.

This v1.3 round is a docs-only contract adoption/materialization over
v1.2 (T0 ACCEPTED). It is delivered as exactly **one forward-only
commit** on top of predecessor `e40a0b50863a3501f89943ba737592f1e2054e8d`.
No amend, reset, rebase or force-push. Predecessors
`5bb7581a11312c5111f51e0ec84534b4ac9b4a97` (v1.0),
`f1fff224e4d5fb9c4c6a24a51add565d85ed2c4e` (v1.1) and
`e40a0b50863a3501f89943ba737592f1e2054e8d` (v1.2, ACCEPTED by T0) are
preserved. The v1.3 corrections are mechanical adoption fixes
(path correction + control-field truthfulness + AC-24 rewrite), NOT a
new T1C correction batch.

The two changed files are:

- `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md`
- `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`

## 2. Evidence

This is a docs-only planning round. Each `EV-` row below is a source
evidence pointer — a verbatim file:line in the existing
`origin/main` tree that justifies a specific realignment claim.
Implementation-round synthetic DB evidence will be added under
`evidence/EV-*.md` in the implementation round.

```
(canonical EV-* row set carried forward from v1.0; verified at v1.1;
re-verified at v1.2 against `origin/main @ f3a3d1a4`. All v1.0 EV rows
remain accurate. No new EV rows are added at v1.2; v1.2 only repairs
encoding/schema/path/atomicity truthfulness in the contract text.)
```

## 3. Decisions

### 3.1 Build vs Adopt

- `Decision`: `ADOPT`.
- `Reason`: This planning round does not introduce any new package or library; it reuses existing canonical repository patterns and helpers. Implementation round will use the canonical `withIdempotency`, `withDbContext`, `prisma/schema.prisma`, and the existing migration framework unchanged.
- `License`: N/A (no new package introduced).
- `Version/source`: Pinned versions are taken from the repo's existing `package.json` / `pnpm-lock.yaml`; no new package is introduced in this slice.
- `Wrapper boundary`: All canonical helpers remain unchanged; the new additive aggregate sits behind `public.hrp_*` helpers, isolated from existing helpers.


### 3.2 Locked decisions (`DEC-*`)

| ID | Decision | Status |
| --- | --- | --- |
| `DEC-01` | `ADOPT` for shared primitives (no new external library). | `CHOSEN` |
| `DEC-02` | Recruiter persona is the canonical operational recruiter; internal enum stays `HR_STAFF`. UI label is "Chuyên viên tuyển dụng". | `CHOSEN` |
| `DEC-03` | The new aggregate is an explicit additive `StaffingOrderRecruiterAssignment` table; not a column on `staffing_orders`. | `CHOSEN` |
| `DEC-04` | Multiple active recruiters per order permitted (no hard cap on hot orders). | `CHOSEN` |
| `DEC-05` | Audit provenance required (assigned_by_user_id, assigned_at, revoked_at, revoked_by_user_id, reason). | `CHOSEN` |
| `DEC-06` | DB-level invariant: at most one ACTIVE row per (order, recruiter); partial unique index in migration SQL. | `CHOSEN` |
| `DEC-07` | Visibility boundary is per-order; sibling orders in the same Project are NOT visible to HR_STAFF (sibling-order isolation). | `CHOSEN` |
| `DEC-08` | Fail-closed: unassigned HR_STAFF gets uniform `404` on direct read, empty list on collections, uniform `4xx` on mutation attempts. No existence oracle. | `CHOSEN` |
| `DEC-09` | Masked/minimal queue projection for unhandled candidates (no phone, no CCCD, no raw evidence). CCCD image / raw evidence stays outside this task. | `CHOSEN` |
| `DEC-10` | No global `CAN_VIEW_WORKER_SENSITIVE` grant to `HR_STAFF`. Active handler receives recruiter-contact fields only after winning claim. | `CHOSEN` |
| `DEC-11` | Application-to-handler bridge is canonical: public apply → `CandidateSubmission` derives StaffingOrder from `slotId` → UNCLAIMED queue with masked fields → assigned recruiter claim command → first claim creates active `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM` via repository DB locking / advisory-lock → losers receive stable `409 HANDLING_ALREADY_CLAIMED` → winner sees row in Workbench MINE. | `CHOSEN` |
| `DEC-12` | Placement dual authority for HR_STAFF: every candidate-specific PlacementCase/Placement command verifies in the SAME transaction BOTH (a) active `StaffingOrderRecruiterAssignment` to the exact derived StaffingOrder AND (b) active `LaborProfileHandlingAssignment` for the relevant LaborProfile. `PLACEMENT_ROLES` extending to `[ADMIN, HR_MANAGER, HR_STAFF]` is necessary but NOT sufficient alone. | `CHOSEN` |
| `DEC-13` | Deterministic revoke concurrency via lock-order contract: recruiter mutation and revoke both lock the exact same active `StaffingOrderRecruiterAssignment` row. Revoke-first → command fails closed with uniform `404`. Command-first → command commits, then revoke acquires lock and commits. NO mutation commits after observing `revokedAt IS NOT NULL`. Authorization check + domain mutation share ONE transaction. Tests exercise both lock orderings using two independent DB connections. Any command error rolls back the entire mutation; no orphan half-mutated row is ever persisted. | `CHOSEN` |
| `DEC-14` | UI label is "Chuyên viên tuyển dụng"; internal enum remains `HR_STAFF`. No role rename. | `CHOSEN` |
| `DEC-15` | Internal attendance / payroll / leave modules do NOT define the authorization model for this task. The new helpers do NOT reference attendance / payroll / leave tables. | `CHOSEN` |
| `DEC-16` | No n8n dependency; no direct n8n DB access; no PII export. The aggregate carries NO candidate/labor profile/PII data — only user FKs and timestamps. | `CHOSEN` |
| `DEC-17` | Library-first: reuse `AuthContext`, `withDbContext`, permission resolver, `DataTable`/form primitives, `withIdempotency`, existing assignment pattern (`LaborProfileHandlingAssignment` as design precedent, not structural reuse). | `CHOSEN` |
| `DEC-18` | Migration posture is forward-only. Rollback is a soft-revert via setting `revoked_at` on every row, never an in-place migration revert. A hard revert is a follow-up forward-only migration. | `CHOSEN` |
| `DEC-19` | This is a planning round — no source / schema / migration / package / test changes. The two docs files are the only artifacts. Tier 3 is NOT called. Production migration gate remains T0-owned. | `CHOSEN` |
| `DEC-20` | (C-02) The new SECDEFINER helper `public.hrp_staffing_order_visible_for(text)` is least-authority and returns true ONLY when (a) `public.hrp_session_role() = 'HR_STAFF'` AND (b) an active (non-revoked) `staffing_order_recruiter_assignments` row exists for the exact `sid` with `recruiter_user_id = public.hrp_session_user_id()`. The helper MUST NOT duplicate ADMIN / HR_MANAGER / PM / SALE logic. Existing roles continue through existing canonical helpers/policies (`public.hrp_project_visible_for` / `public.hrp_project_writable` / `public.hrp_worker_visible_for` / etc.). | `CHOSEN` |
| `DEC-21` | (C-03) A separate scoped SELECT-only helper `public.hrp_project_recruiter_visible_for(text)` returns true ONLY for HR_STAFF when the project contains at least one `StaffingOrder` actively assigned to that user. This helper is SELECT-only for `Project` — there is NO INSERT/UPDATE/DELETE authority for HR_STAFF on `Project`. HR_STAFF is NOT added to the root/global branch of `public.hrp_project_visible_for` or `public.hrp_project_writable`. Matrix test updated: `HR_STAFF × projects` returns the assigned-project set only, not always `0`. | `CHOSEN` |
| `DEC-22` | (C-04) Resolves policy-truth contradiction. Locked: separate narrowly-scoped `PERMISSIVE` policies are ADDED for HR_STAFF — one for each of `Project` (SELECT only), `StaffingOrder` (SELECT), `StaffingOrderSlot` (SELECT), `JobOpening` (SELECT), `JobPosting` (SELECT/INSERT/UPDATE only as required). Existing policies for existing roles remain byte/behavior equivalent. If an existing policy must be altered, the diff is recorded explicitly in HANDOFF and applied as a transactional forward-only migration. "Forward-only" means no destructive schema/data rollback; it does NOT mean policy definitions can never change. No broad `FOR ALL` recruiter policy is introduced. SELECT, INSERT and UPDATE `USING` / `WITH CHECK` are defined separately for each new policy. | `CHOSEN` |
| `DEC-23` | (C-05) Application-to-handler bridge: public apply remains unchanged and creates `CandidateSubmission` / `LaborProfile` through the canonical P1-B authority; `CandidateSubmission.slotId` derives the `StaffingOrder`; all active recruiters assigned to that order see an UNCLAIMED queue entry with privacy-safe / masked fields; an assigned recruiter executes a claim candidate command; first successful claim creates the canonical active `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM`; claim race is serialized via DB locking / advisory-lock; exactly one recruiter wins; losers receive stable `409 HANDLING_ALREADY_CLAIMED`; claimed row appears in Workbench MINE. | `CHOSEN` |
| `DEC-24` | (C-06) Sensitive data boundary: pre-claim masked/minimal application fields only; post-claim active handler receives recruiter-contact fields only; CCCD image / raw evidence remain outside this task and require the existing evidence authorization path; no global `CAN_VIEW_WORKER_SENSITIVE` grant to HR_STAFF; unassigned HR_STAFF receives empty / 404 without existence oracle. | `CHOSEN` |
| `DEC-25` | (C-07) Placement dual authority: `PLACEMENT_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_STAFF']` is NOT sufficient alone. For HR_STAFF, every candidate-specific PlacementCase / Placement command (preview/create/confirm/effective/fail/cancel) verifies inside the same transaction: (a) active `StaffingOrderRecruiterAssignment` to the exact `StaffingOrder` derived from submission/slot/jobOpening AND (b) active `LaborProfileHandlingAssignment` for the relevant `LaborProfile`. | `CHOSEN` |
| `DEC-26` | (C-08 / I-03) Deterministic revoke concurrency. Lock-order contract: (a) recruiter mutation locks and validates the active order-assignment row inside its mutation transaction; (b) revoke locks the exact same assignment row; (c) if mutation obtains the lock first → mutation commits; revoke waits; after mutation commit, revoke acquires lock and commits `revokedAt`. (d) if revoke commits first → the later mutation cannot find active authority and fails closed with uniform `404`. (e) NO mutation may commit after observing `revokedAt IS NOT NULL`. (f) any command error rolls back the entire mutation; NO orphan half-mutated row is persisted under any error path. (g) DB integration tests exercise both lock orderings using two independent DB connections. | `CHOSEN` |
| `DEC-27` | (C-09 / I-04) Exact command/API contracts frozen: `POST /api/admin/staffing/orders/{orderId}/recruiters` (ADMIN/HR_MANAGER only; assigns HR_STAFF); `POST /api/admin/staffing/orders/{orderId}/recruiters/{assignmentId}/revoke` (ADMIN/HR_MANAGER only); `POST /api/admin/applications/{submissionId}/claim` (assigned HR_STAFF only). All mutation commands require raw UUID-v4 `Idempotency-Key`, use canonical `withIdempotency`, derive actor / user / order IDs server-side (do NOT accept actor IDs from request bodies), execute idempotency + authorization + mutation atomically, map duplicate active assignment to stable `409 ASSIGNMENT_ALREADY_EXISTS`, return privacy-safe errors. | `CHOSEN` |
| `DEC-28` | (C-10 / I-04) No new broad permission code is introduced in this slice. The proposed `CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS` requirement is REMOVED from P1-A0.4. The locked authorization model is: role establishes the recruiter persona; active `StaffingOrderRecruiterAssignment` establishes object scope; both are required. No `prisma/seed.mjs` permission grant is needed. | `CHOSEN` |
| `DEC-29` | (C-11 / I-04) Implementation allowlist is expanded below in §4.2. Frozen-task source exceptions are explicitly listed (P1-B / F0/F1 / E1 / session). | `CHOSEN` |
| `DEC-30` | (C-12 / I-05) Final E2E acceptance chain is expanded to `AC-E2E-01..AC-E2E-22` per §6.2. | `CHOSEN` |
| `v1.2` | 2026-09-28 | Tier 1 (T1C) | T0 integrity correction after v1.1 verdict `CHANGES_REQUIRED`. Strict UTF-8 LF no-BOM, 0 NUL, 0 U+FFFD, 0 mojibake. | `T0 → T1C — P1-A0.4 pre-implementation integrity correction v1.2` |

### 3.2 Build vs Adopt

| Field | Value |
| --- | --- |
| `Decision` | `ADOPT` |
| `License` | The repo adopts its own existing primitives; no third-party library is added; PRISMA / Next.js / @aws-sdk / zod / vitest licenses are already governed repo-wide. |
| `Version/source` | Pinned versions are taken from the repo's existing `package.json` / `pnpm-lock.yaml`; no new package is introduced in this slice. |
| `Wrapper boundary` | The wrapper boundary is the canonical V2 contract layer (`AuthContext`, `withDbContext`, `withIdempotency`, permission resolver, `DataTable`/form primitives, the canonical assignment pattern `LaborProfileHandlingAssignment`). New routes are pure orchestrators that delegate to existing services. |

### 3.3 Build vs Automate

| Field | Value |
| --- | --- |
| `Decision` | `N/A` |
| `Reason` | Assignment / revocation is an in-app human-triggered flow. n8n is explicitly out of scope (per DEC-16 and the Owner directive). |

## 4. Contract

### 4.1 Requirements (planning-round RQs)

| ID | Step | AC |
| --- | --- | --- |
| `RQ-01` | `STEP-05`, `STEP-06`, `STEP-08` | `AC-11`, `AC-16` |
| `RQ-02` | `STEP-02` | `AC-03` |
| `RQ-03` | `STEP-02` | `AC-04` |
| `RQ-04` | `STEP-04` | `AC-05` |
| `RQ-05` | `STEP-04` | `AC-06`, `AC-19` |
| `RQ-06` | `STEP-03` | `AC-07`, `AC-20` |
| `RQ-07` | `STEP-04` | `AC-09` |
| `RQ-08` | `STEP-06` | `AC-08`, `AC-27` |
| `RQ-09` | `STEP-06` | `AC-10` |
| `RQ-10` | `STEP-06` | `AC-10`, `AC-22` |
| `RQ-11` | `STEP-08` | `AC-16` |
| `RQ-12` | `STEP-05`, `STEP-06` | `AC-15` |
| `RQ-13` | `STEP-05`, `STEP-06` | `AC-19` |
| `RQ-14` | `STEP-05`, `STEP-06` | `AC-19` |
| `RQ-15` | `STEP-05`, `STEP-06` | `AC-18`, `AC-19` |
| `RQ-16` | `STEP-05`, `STEP-06` | `AC-22` |
| `RQ-17` | `STEP-05`, `STEP-06` | `AC-23`, `AC-20` |
| `RQ-18` | `STEP-05`, `STEP-06` | `AC-21` (placement dual authority) |
| `RQ-19` | `STEP-05`, `STEP-06` | `AC-20` |
| `RQ-20` | `STEP-05`, `STEP-06` | `AC-21` (routes) |
| `RQ-21` | `STEP-05`, `STEP-06` | `AC-21` (no new permission code) |
| `RQ-22` | `STEP-05`, `STEP-06` | `AC-21`, `AC-25`, `AC-26` |

### 4.2 Scope boundaries (implementation round allowlist)

**In scope (this planning round) — docs only:**

- `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md`
- `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`

**In scope (implementation round — planned, NOT executed in this round):**

The implementation allowlist below carries every path T0 has accepted under `I-04`. Existing paths are verified at `origin/main @ f3a3d1a4` via `git cat-file -e origin/main:<path>`. New paths are marked `(new)`.

**Prisma schema + migration:**

- `prisma/schema.prisma` — additive model `StaffingOrderRecruiterAssignment` + relations; no field rename / type change. *(existing)*
- `prisma/migrations/<UTC>_p1a04_scoped_recruiter_assignment/migration.sql` — additive forward-only migration (table, partial unique index, narrowly-scoped PERMISSIVE RLS policies, DB-locking helper registration, REVOKE/GRANT per `RQ-13`/`RQ-14`). *(new)*

**SECDEFINER helpers (registered in the migration):**

- `public.hrp_staffing_order_visible_for(text)` — schema-qualified, SECURITY DEFINER, `SET search_path = pg_catalog, public`, REVOKE EXECUTE FROM PUBLIC + GRANT EXECUTE to runtime roles. *(new, registered in migration SQL)*
- `public.hrp_project_recruiter_visible_for(text)` — same posture. *(new, registered in migration SQL)*

**Auth L1 scope builders:**

- `src/shared/auth/scopes/staffing.scope.ts` — narrow HR_STAFF branch (uses `recruiterAssignments.some ... revokedAt: null` predicate at L1; relies on `public.hrp_staffing_order_visible_for`-based RLS at L2; does NOT add HR_STAFF to a global root branch in a way that lets unassigned HR_STAFF see all rows). *(existing — T0 confirmed path)*
- `src/shared/auth/scopes/project.scope.ts` — narrow HR_STAFF branch (SELECT-only; assigned-project set only). *(existing — T0 confirmed path)*

**Staffing services (L1 + L2, HR_STAFF-visible reads + writes):**

- `src/domains/staffing/job-posting-authoring.service.ts` — narrow slot eligibility for the create path (assigned-order set only). *(existing)*
- `src/domains/staffing/job-posting-list.service.ts` — leave unchanged if L1 narrowing is sufficient; otherwise narrow per slot. *(existing)*

**Recruiter assignment service + admin API (admin/HR_MANAGER only; routes are NEW):**

- `src/domains/staffing/recruiter-assignment.service.ts` — assignment CRUD with `withIdempotency`; revoke with `revokedAt` (DB-locked, deterministic). *(new)*
- `app/api/admin/staffing/orders/[orderId]/recruiters/route.ts` — `POST` assign (ADMIN/HR_MANAGER only; raw UUID-v4 `Idempotency-Key`, server-side actor derivation, atomic execution). *(new)*
- `app/api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke/route.ts` — `POST` revoke (ADMIN/HR_MANAGER only). *(new)*

**Application claim service + admin API (assigned HR_STAFF only; route is NEW):**

- `src/domains/applications/claim-candidate.service.ts` — claim candidate command; advisory-lock serialization; creates `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM`; stable `409 HANDLING_ALREADY_CLAIMED`. *(new)*
- `app/api/admin/applications/[submissionId]/claim/route.ts` — `POST` claim (assigned HR_STAFF only). *(new)*

**Unclaimed queue + recruiter workbench (HR_STAFF read surface; existing files):**

- `src/domains/applications/unclaimed-queue.service.ts` — read service for assigned-order queue; returns masked fields (no phone / no CCCD / no raw evidence) for unclaimed candidates. *(new)*
- `src/domains/talent/recruiter-workbench.types.ts` — workbench types include surface for claimed rows. *(existing — T0 confirmed path)*
- `src/domains/talent/recruiter-workbench.read-service.ts` — read service handlers used to surface claimed rows in `MINE`. *(existing — T0 confirmed path)*
- `src/domains/talent/recruiter-workbench.placement-actions.tsx` — placement actions mounted from `MINE`. *(existing — T0 confirmed path)*
- `app/api/admin/recruiter-workbench/route.ts` — workbench API (read endpoints). *(existing — T0 confirmed path)*
- `app/admin/recruiter-workbench/**` — workbench UI surface. *(existing — T0 confirmed path)*

**Assignment UI (ADMIN/HR_MANAGER; NEW):**

- `app/admin/staffing/orders/[orderId]/recruiters/_components/**` — assignment UI using `DataTable` + form primitives. *(new)*

**JobPosting authoring/list (existing files):**

- `app/api/admin/jobs/job-postings/**` — JobPosting admin API (existing — T0 confirmed path; HR_STAFF gating via `public.hrp_staffing_order_visible_for`-derived RLS).
- `app/admin/jobs/job-postings/**` — JobPosting admin UI (existing — T0 confirmed path).

**Placement F0/F1 (dual-authority for HR_STAFF; existing files):**

- `src/domains/talent/placement-case.service.ts` — candidate-specific PlacementCase commands guarded by the dual-authority predicate (DEC-25). *(existing — T0 confirmed path)*
- `src/domains/talent/placement.service.ts` — candidate-specific Placement commands guarded by the dual-authority predicate (DEC-25). *(existing — T0 confirmed path)*
- `src/domains/talent/placement.commands.ts` — Placement command functions (existing — T0 confirmed path); for HR_STAFF the wrappers add the dual-authority check at the start of every command.
- `src/domains/talent/placement.route-helpers.ts` — shared route helper (existing — T0 confirmed path); read-only consumption by HR_STAFF-tagged actions is allowed; HR_STAFF gating is enforced via the dual-authority predicate BEFORE calling existing helpers.
- `app/api/admin/placements/route.ts` — Placements admin API root. *(existing — T0 confirmed path)*
- `app/api/admin/placements/[id]/actions/confirm/route.ts` — Placement confirm action. *(existing — T0 confirmed path; HR_STAFF gating enforced via the dual-authority helper, which performs the assignment + handler check before delegating to existing F0/F1 logic.)*
- `app/api/admin/placements/[id]/actions/effective/route.ts` — Placement effective action. *(existing — T0 confirmed path; same dual-authority gate.)*
- `app/api/admin/placements/[id]/actions/fail/route.ts` — Placement fail action. *(existing — T0 confirmed path; same dual-authority gate.)*
- `app/api/admin/placements/[id]/actions/cancel/route.ts` — Placement cancel action. *(existing — T0 confirmed path; same dual-authority gate.)*

**Staffing order reads (existing — T0 confirmed paths):**

- `app/api/staffing/orders/route.ts` — list endpoint; uses `buildStaffingOrderScope` which narrows HR_STAFF to assigned orders via the new aggregate.
- `app/api/staffing/orders/[id]/route.ts` — detail endpoint; same.

**Role-label surface:**

- `app/admin/users/page.tsx` — admin Users page (the canonical role-label surface per the existing UI; HR_STAFF role label is changed from "HR Staff" to "Chuyên viên tuyển dụng"; internal enum remains `HR_STAFF`). *(existing — T0 confirmed path)*
- Any additional surface where the label appears must be verified by `git grep` (this task must not silently fan out to unrelated IA files).

**Synthetic DB integration tests:**

- `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` — synthetic DB integration tests (sibling-order isolation; fail-closed on unassigned read; revoke lock-orderings both directions via two independent DB connections; claim race via advisory lock; assignment-oracle prevention; revoke-during-in-flight-write behavior; dual-authority Placement; masked-field redaction pre-claim; FK-safe cross-run residue teardown). *(new)*
- `vitest.integration-files.ts` — register the synthetic DB integration file in the canonical integration runner. *(existing)*

**Task bundle:**

- `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/{TASK.md,HANDOFF.md,AUDIT.md,evidence/**}`.

**Frozen-task source exceptions (explicitly authorized by T0 under I-04):**

- `src/domains/applications/conversion.service.ts` (P1-B frozen) — read-only consumption; no behavioral or signature change.
- `src/domains/talent/placement.route-helpers.ts` (P1-F0/F1 frozen) — the canonical placement route-helper in this repo. If a new narrowly-scoped helper `assertPlacementHrStaffDualAuthority()` is needed, it is added as a new EXPORTED helper adjacent to the existing one, NOT as an edit to the existing helper bodies.
- `src/shared/integrity/idempotency.ts` (E1 frozen) — read-only consumption.
- `src/shared/auth/auth-context.ts` — read-only consumption.

No historical TASK.md / HANDOFF.md / AUDIT.md / evidence/ bundle of any frozen task is to be edited. This task's own TASK / HANDOFF / AUDIT / evidence/ bundle is the only such bundle that may be created or edited.

**Out of scope (explicit non-goals):**

- Any path beginning `src/app/` (the repo's authoritative location for app code under `app/`, not `src/app/`).
- `prisma/schema.prisma` model changes beyond the additive aggregate and its relations.
- `src/domains/attendance/**` / `src/domains/finance/**` / `src/domains/payroll/**` / `src/domains/leave/**` — no authority definition.
- `src/domains/conversion/**` (P1-B) — no behavioral change.
- `src/domains/n8n/**` and any n8n workflow files — no n8n dependency.
- `src/shared/auth/auth-context.ts` — no JWT / session shape change.
- `package.json` / `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` — no new dependency.
- Sidebar IA / label order / icon change beyond the "Chuyên viên tuyển dụng" label surface inside the recruiter surface itself.
- `docs/PLANNER_HANDOVER.md` (T0-owned).
- `LaborProfileHandlingAssignment` polymorphic reuse for fake order authority (DEC-23).
- `Worker.assignedToId` polymorphism.
- A new broad permission code such as `CAN_PUBLISH_JOB_FOR_ASSIGNED_ORDERS` (DEC-28) — REMOVED from this slice.
- Direct DB writes from background jobs / n8n.
- A broad `FOR ALL` recruiter policy (DEC-22).
- Adding `HR_STAFF` to the root/global branch of `public.hrp_project_visible_for` or `public.hrp_project_writable` (DEC-21).
- Production migration (`prisma migrate deploy` is OWNED by T0; planning round does not author a migration).

### 4.3 Domain boundaries

- **Data/state:** synthetic DB integration tests use disposable fixture ids. Production DB is not mutated in this round (no migration authored).
- **Permission/security:** additive SECDEFINER helpers (least-authority, HR_STAFF-only) + additive narrowly-scoped `PERMISSIVE` policies for HR_STAFF (one per table). No broad `FOR ALL` recruiter policy. No DROP policy, no DISABLE RLS, no privileged bypass. Existing policies for existing roles remain byte/behavior equivalent. Identity only via `public.hrp_session_role()` and `public.hrp_session_user_id()` (transaction GUC). Migration SQL applies `REVOKE EXECUTE FROM PUBLIC` + `GRANT EXECUTE TO app_user_writer, app_user` to each new helper.
- **Interface/API:** the three frozen NEW routes under `DEC-27` are planned. No public API contract changes (P1-B public apply stays byte/behavior equivalent). No JWT shape change.
- **Migration/rollback:** forward-only. Soft revert = `revoked_at` on every row. Hard revert = follow-up forward-only migration.

## 5. Execution Plan (planning round)

| Step | Target | Intent | Verify |
| --- | --- | --- | --- |
| `STEP-01` | Worktree `C:\\CodeApp\\HrP-t1c-p1a04`, branch `codex/t1c-p1a04-scoped-recruiter-authority`, baseline `f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7` | Establish fresh worktree from origin/main | `git rev-parse HEAD` matches baseline + `git status --short` clean |
| `STEP-02` | Inventory `HR_STAFF` L1/L2 surfaces | Build the evidence base | EV rows |
| `STEP-03` | Threat model | Section 6 of the realignment doc | EV rows |
| `STEP-04` | Design additive aggregate + helpers + policies | Section 4 of the realignment doc | EV rows |
| `STEP-05` | Author `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md` | Discovery artifact | UTF-8 LF no-BOM, 0 mojibake markers |
| `STEP-06` | Author `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` | Contract artifact | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` (warnings allowed for DRAFT) |
| `STEP-07` | Run encoding gate + strict UTF-8 scanner + path verification + forbidden-substring scanner | Verify exactly two docs files changed and that they are clean | strict UTF-8 scan passes on both files; `git cat-file -e origin/main:<path>` passes for every existing allowlist path; zero forbidden substrings |
| `STEP-08` | Single docs-only commit + push | Deliver v1.2 | One commit on the planning branch; no amend/reset/rebase/force-push; `git show --name-status --stat HEAD` reports exactly the two changed files |
| `STEP-09` | Stop for T0 contract review | Hand control back to T0 | No PR opened; no Tier 3 call; no merge; no deploy |

## 6. Acceptance

### 6.1 Planning-round acceptance criteria

| AC | Pass condition | Verification method |
| --- | --- | --- |
| `AC-01` | `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md` exists at the canonical path, is non-empty, has all 14 numbered sections (per the realignment doc structure), and is strict UTF-8 LF no-BOM with 0 mojibake markers and 0 C0 controls. | `Select-String -Path docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md -Pattern '^## [0-9]+\\.'` returns 14 lines; Node.js strict-UTF-8 scanner (`TextDecoder('utf-8', { fatal: true })`) returns BOM=0, CR=0, NUL=0, U+FFFD=0, C0 (excl. TAB/LF)=0, mojibake markers (Latin Capital A Tilde; Latin Capital A Circumflex; Euro Sign; Dagger) = 0. |
| `AC-02` | `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` exists at the canonical path, is non-empty, has all 11 required canonical V2 sections per `verify-task.ps1` A-01, and is strict UTF-8 LF no-BOM with 0 mojibake markers and 0 C0 controls. | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` exits 0 (DRAFT-VALID warnings allowed for DRAFT status); Node.js strict-UTF-8 scanner returns clean. |
| `AC-03` | Realignment doc inventories every L1/L2 surface listed in the directive: project scope, StaffingOrder/slot scope, JobOpening/JobPosting RLS, JobPosting selector/write path, application/LaborProfile handling, recruiter workbench, PlacementCase/Placement actions. | `grep -E "project scope|buildProjectScope|StaffingOrder|StaffingOrderSlot|JobOpening|JobPosting|listEligibleSlotsForNewJobPosting|LaborProfile|HandlingAssignment|PLACEMENT_ROLES|PlacementCase|placement"` against the realignment doc returns non-empty matches in §1. |
| `AC-04` | Realignment doc proves that `LaborProfileHandlingAssignment` cannot be safely adopted as a `User ↔ StaffingOrder` recruiter assignment (3+ reasons; references Owner decision 7 + 8). | `grep -nE "cannot be adopted|không thể adopt|LaborProfileHandlingAssignment"` returns non-empty matches in §3. |
| `AC-05` | Realignment doc specifies the additive aggregate shape (`StaffingOrderRecruiterAssignment`) with all 7 Owner-decision-7 audit-provenance fields and the DB-level partial unique index per Owner decision 8. | `grep -nE "StaffingOrderRecruiterAssignment|staffing_order_recruiter_assignments|staffingOrderId|recruiterUserId|assignedByUserId|assignedAt|revokedAt|revokedByUserId|partial unique|WHERE revoked_at IS NULL"` returns non-empty matches in §4. |
| `AC-06` | Realignment doc specifies the new SECDEFINER helpers (`public.hrp_staffing_order_visible_for` and `public.hrp_project_recruiter_visible_for`) and the least-authority contract (HR_STAFF-only; no duplication of ADMIN/HR_MANAGER/PM/SALE logic). | `grep -nE "public\.hrp_staffing_order_visible_for|public\.hrp_project_recruiter_visible_for|least-authority|HR_STAFF-only"` returns non-empty matches in §4.3. |
| `AC-07` | Realignment doc covers race, revoke, stale-session, and information-oracle threats with concrete mitigations. | `grep -nE "race|revoke|stale|oracle"` returns ≥ 4 distinct matches in §6. |
| `AC-08` | TASK contract closes all 17 locked Owner decisions in §3 with `Status = CHOSEN`, plus `DEC-18..DEC-31` for migration posture, planning-round posture, T0 v1.1 corrections (C-01..C-12), and T0 v1.2 integrity corrections (I-01..I-08). | `grep -nE "| DEC-|| `CHOSEN` |"` returns 31 rows in §3. |
| `AC-09` | TASK contract declares `Build vs adopt = ADOPT` with §3.2 evidence; `Build vs automate = N/A` with §3.3 evidence. | `grep -nE "Build vs adopt|Build vs automate"` returns rows matching the gate's expected field names. |
| `AC-10` | TASK contract encodes the final E2E acceptance chain `AC-E2E-01..AC-E2E-22`. | `grep -nE "| `AC-E2E-"` returns 22 rows in §6.2. |
| `AC-11` | Exactly two docs files are changed (`docs/discovery/realignment/P1A04_*.md` and `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`). Zero source / schema / migration / package / lockfile modification. | `git diff --name-only origin/main..HEAD` returns exactly the two paths; forbidden-path diff is empty. |
| `AC-12` | Strict UTF-8 no-BOM, LF-only, zero NUL/U+FFFD/mojibake, zero C0 controls (excl. TAB/LF), on both changed text files. | Node.js strict-UTF-8 scanner (`TextDecoder('utf-8', { fatal: true })`) passes on both files (`pwsh .ai-pipeline/scripts/verify-encoding-scan.mjs -Path 'docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md','docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md'`). |
| `AC-13` | `git diff --check origin/main..HEAD` returns no warnings on the planning diff. | `git diff --check origin/main..HEAD` exits 0 with empty output. |
| `AC-14` | `verify-task.ps1` runs against the planning TASK and produces `RESULT: DRAFT-VALID` (warnings allowed but no errors) because status is `T0_REVIEW` and contract gate is `DRAFT`. | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` exits 0 with `RESULT: DRAFT-VALID`. |
| `AC-15` | No `Tier 3` call, no `PR` opened, no `merge`, no `deploy`. | `git log -1 --format=%s` reports the v1.2 intent; `gh pr list` does not include a PR for the planning branch. |
| `AC-16` | Production migration is NOT applied from this branch in any round. | `git diff --name-only origin/main..HEAD -- prisma/migrations/` returns empty. |
| `AC-17` | (I-01) Both docs files are strict UTF-8 LF no-BOM with 0 mojibake markers (Latin Capital A Tilde; Latin Capital A Circumflex; Euro Sign; Dagger; replacement char U+FFFD) and 0 C0 controls (excl. TAB/LF) and 0 NUL. | `node .ai-pipeline/scripts/verify-encoding-scan.mjs --paths docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md,docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` (Node.js strict-UTF-8 scanner using `TextDecoder('utf-8', { fatal: true })`) reports BOM=0, CR=0, NUL=0, U+FFFD=0, C0 (excl. TAB/LF)=0, mojibake markers=0 on both files. |
| `AC-18` | (I-02) SQL examples use correct column names: `job_openings.staffing_order_id` (NOT `slot_id`); `job_postings.job_opening_id` (NOT `opening_id`); `staffing_order_slots.staffing_order_id`. | `grep -nE "job_openings\.slot_id|job_postings\.opening_id"` returns 0 matches; `grep -nE "job_openings\.staffing_order_id|job_postings\.job_opening_id|staffing_order_slots\.staffing_order_id"` returns non-empty matches in §4. |
| `AC-19` | (I-02) Both new helpers are schema-qualified (`public.hrp_staffing_order_visible_for(text)`, `public.hrp_project_recruiter_visible_for(text)`), `SECURITY DEFINER`, lock `SET search_path = pg_catalog, public`, take identity from `public.hrp_session_role()` / `public.hrp_session_user_id()`, apply `REVOKE EXECUTE ... FROM PUBLIC` + `GRANT EXECUTE ... TO app_user_writer, app_user`. The migration is a forward-only add; producer role posture and synthetic-DB verification are documented. Static / migration test asserts `search_path`, grants, owner, and correct column names. | `grep -nE "public\.hrp_staffing_order_visible_for|public\.hrp_project_recruiter_visible_for|SET search_path = pg_catalog, public|REVOKE EXECUTE|GRANT EXECUTE" docs/discovery/realignment/P1A04_*.md` returns non-empty matches in §4. |
| `AC-20` | (I-03) The realignment doc and this TASK contract do NOT contain any of the four forbidden phrase patterns enumerated in T0 I-08.7 (referenced in this AC only by phrase-id list): revoke-described-as-snapshot, audit-described-as-half-mutated-row, create-described-as-half-mutated-row-but-committed, revoke-returning-token-name; OR any description suggesting the assignment row may be left in a half-mutated state after error or revoke. The lock-order contract is exact (no half-mutated-row language; no snapshot-based fail-closed wording). | Phrase-id grep against the four forbidden phrase-ids returns 0 matches in either doc; tests cover BOTH lock orderings using TWO independent DB connections. |
| `AC-21` | (I-04) Implementation allowlist lists — at minimum — each path T0 listed under I-04. Existing paths are verified at `origin/main` via `git cat-file -e origin/main:<path>`. New paths are marked `(new)`. No `src/app/**` paths appear anywhere in the doc. | `grep -nE "^src/app/"` returns 0 matches across both docs; allowlist rows match T0's I-04 list. |
| `AC-22` | (I-05) E2E AC uses the canonical repository-exact routes verified at `origin/main`: `GET /api/jobs/{slug}` (`app/api/jobs/[slug]/route.ts`) and `POST /api/public/jobs/{slug}/applications` (`app/api/public/jobs/[slug]/applications/route.ts`). No use of any query-string variant or non-canonical alternate path for these endpoints. | `git grep -nE "/api/jobs\?slug=|/api/public/jobs/[^/]+/(apply|\?slug=)" docs/` returns 0 matches. |
| `AC-23` | (I-06) No phrasing that treats the post-claim phone as automatically masked (rather than as recruiter-contact fields whose full value is delivered ONLY to the active winning handler when that is what is needed to call the candidate) is present in either doc. | Phrase-id grep against masked-as-sufficient returns 0 matches in either doc. |
| `AC-24` | (I-07) Control field truthfulness — Spec version `v1.3`; Status `READY_TO_CODE`; Contract gate `READY_TO_CODE`; Contract accepted by T0 `YES`; Decision state `CLOSED`; Assurance lane `CRITICAL`; Audit mode `LIGHT`; Planning correction budget `1` consumed by v1.1; T0 planning integrity exceptions used `1` consumed by v1.2; Implementation correction budget `1`; Implementation correction batches used `0`; Test environment `REQUIRED` (synthetic-DB preflight); Next gate `TIER1_IMPLEMENTATION_FREEZE`; Open Owner decisions `0`. The contract does NOT self-declare any contract-text-accepted state for the implementation round. | `grep -nE "Status .READY_TO_CODE|Contract gate .READY_TO_CODE|Contract accepted by T0 .YES|Assurance lane .CRITICAL|Audit mode .LIGHT|Implementation correction budget .1|Implementation correction batches used .0|Next gate .TIER1_IMPLEMENTATION_FREEZE|Open Owner decisions .0" docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` returns expected rows in §0; section 9/10 records T0 acceptance and the v1.3 adoption commit. |
| `AC-25` | (I-08) After commit, the strict UTF-8 scanner returns BOM=0, CR=0, NUL=0, U+FFFD=0, C0=0, mojibake markers=0 for both docs files. `git diff --check f1fff224..HEAD` is clean. `verify-task.ps1` returns `DRAFT-VALID`. | Raw scanner output is reported to T0 in the closing summary. |
| `AC-26` | Working tree is clean after commit; push is forward-only (no force); predecessor `f1fff224e4d5fb9c4c6a24a51add565d85ed2c4e` is preserved as `HEAD~1`. | `git status --short` after commit is empty; `git log -1 --format=%P` shows `f1fff224e4d5fb9c4c6a24a51add565d85ed2c4e`. |
| `AC-27` | The full v1.1 review batch is still represented in `DEC-20..DEC-30` (C-01..C-12) and `DEC-31` (I-01..I-08). | `grep -nE "DEC-2[0-9]|DEC-31" docs/.../TASK.md` returns 12 rows in §3. |
| `AC-28` | (I-04) Frozen-task source exceptions are explicitly listed with the path T0 authorized. | `grep -nE "Frozen-task source exceptions|conversion\.service\.ts|placement\.route-helpers\.ts|withIdempotency\.ts|session\.ts" docs/.../TASK.md` returns non-empty matches in §4.2. |

### 6.2 Final E2E acceptance (Owner-mandated — planned, v1.2 22-step chain)

The implementation round's TASK contract must encode this AC chain verbatim,
with a synthetic DB integration plan per AC (carrying the AC-09 via two DB
connections where the chain requires concurrency under a real database).

| AC | Pass condition (Owner-mandated final E2E, v1.2 22-step chain) | Verification method (implementation round) |
| --- | --- | --- |
| `AC-E2E-01` | ADMIN creates `StaffingOrder SO-X` and `StaffingOrder SO-Y` under the SAME Project P. | synthetic DB integration test |
| `AC-E2E-02` | ADMIN/HR_MANAGER assigns HR_STAFF-Alice to `SO-X` via assignment UI/API; HR_STAFF-Bob remains unassigned to either order. | synthetic DB integration test |
| `AC-E2E-03` | HR_STAFF-Alice logs in (fresh JWT) — `AuthContext.role=HR_STAFF`, `userId=Alice.id`. Alice sees minimal Project P metadata required to render SO-X (no other Project fields, no other projects). | synthetic DB integration test |
| `AC-E2E-04` | Alice calls `GET /api/staffing/orders` — sees ONLY `SO-X`. Sibling `SO-Y` in the SAME Project P is NOT visible to Alice (sibling-order isolation). | synthetic DB integration test |
| `AC-E2E-05` | Alice calls `GET /api/staffing/orders/{SO-Y.id}` for an unassigned sibling order — uniform `404` (no existence oracle). | synthetic DB integration test |
| `AC-E2E-06` | Alice calls `GET /api/staffing/orders/{SO-X.id}/slots` — sees slots of `SO-X` only. | synthetic DB integration test |
| `AC-E2E-07` | Alice calls `listEligibleSlotsForNewJobPosting` — only `SO-X` slots are returned. | synthetic DB integration test |
| `AC-E2E-08` | Alice `POST /api/admin/jobs/job-postings` — creates a JobPosting for `SO-X` slot and publishes via canonical authoring service; idempotency replay yields same result. | synthetic DB integration test |
| `AC-E2E-09` | Public visitor `GET /api/jobs/{slug}` — sees Alice's posting. Public visitor `POST /api/public/jobs/{slug}/applications` — `201` (canonical P1-B apply, unchanged). | synthetic DB integration test |
| `AC-E2E-10` | Application enters the `SO-X` unclaimed recruiter queue. Alice and another SO-X-assigned recruiter race to claim the candidate. Exactly ONE wins; the loser receives stable `409 HANDLING_ALREADY_CLAIMED`. | synthetic DB integration test (two DB connections) |
| `AC-E2E-11` | Winner receives an active `LaborProfileHandlingAssignment` with source `ORDER_RECRUITER_CLAIM`. The canonical claim command runs inside one transaction with authorization + DB lock + domain mutation. | synthetic DB integration test |
| `AC-E2E-12` | Winner sees the candidate row in Workbench `MINE` and can perform the next actions (profile score, PlacementCase open, Placement preview). Loser / non-handler cannot mutate that candidate. | synthetic DB integration test |
| `AC-E2E-13` | Winner opens PlacementCase and processes Placement preview / create / confirm — valid Placement outcome is reached using DUAL AUTHORITY (active `StaffingOrderRecruiterAssignment` AND active `LaborProfileHandlingAssignment` in the SAME transaction). | synthetic DB integration test |
| `AC-E2E-14` | HR_STAFF-Bob (NOT assigned to either order) attempts the same flow — uniform `404` / empty list at every step (project, order, slot, posting-admin, application, case, placement). | synthetic DB integration test |
| `AC-E2E-15` | ADMIN/HR_MANAGER revokes the WINNER's `StaffingOrderRecruiterAssignment` (lock-order case A: revoke first). | synthetic DB integration test (two DB connections) |
| `AC-E2E-16` | After revoke, NEW order-scoped and placement mutations by the previously-winning recruiter fail closed (uniform `404`). The DB-locked revoke row guarantees no mutation commits after `revokedAt IS NOT NULL`. | synthetic DB integration test |
| `AC-E2E-17` | Lock-order case B: a new mutation is started by the previously-winning recruiter, then ADMIN/HR_MANAGER revokes. The mutation either commits before revoke (snapshot-time authorization) OR fails closed with uniform `404`. Authorization check + domain mutation share ONE transaction. ANY command error rolls back the entire mutation; there is NO orphan half-mutated row under any error path. | synthetic DB integration test (two DB connections) |
| `AC-E2E-18` | The public `JobPosting` remains READABLE after the recruiter revoke — public listing/apply path is unchanged. Public unpublish is a separate canonical publication workflow, NOT triggered by recruiter revoke. | synthetic DB integration test |
| `AC-E2E-19` | Bob remains unable to observe ANY of: Project P metadata beyond what he is assigned to; SO-X/SO-Y; slots; posting-admin; application; case; placement — across all revoke states. | synthetic DB integration test |
| `AC-E2E-20` | Pre-claim / masked boundary: while the candidate is UNCLAIMED, the unclaimed queue read returns only masked / minimal application fields (no phone, no CCCD, no raw evidence). Post-claim / handler boundary: after winning the claim, the handler receives only the recruiter-contact fields required for recruitment; the post-claim phone field may be the full contact phone when that is what the recruiter needs to call the candidate, but it is returned ONLY to the active handler for the relevant LaborProfile. CCCD image / raw evidence remain outside this task. | synthetic DB integration test |
| `AC-E2E-21` | Zero cross-run residue; FK-safe reverse teardown. Every fixture row created in `tests/db/**` for the 22-step chain is deleted in teardown; no orphan rows remain across runs. | synthetic DB integration test |
| `AC-E2E-22` | Existing ADMIN / HR_MANAGER / PM / SALE behavior remains byte/behavior equivalent. Existing P1 public apply + idempotency behavior remains byte/behavior equivalent. No regression in the canonical `withIdempotency` or `withDbContext` helpers. | synthetic DB integration test + regression diff of canonical helper calls |

## 7. Risk

| ID | Risk | Mitigation / rollback |
| --- | --- | --- |
| `RISK-01` | The new aggregate being added to `prisma/schema.prisma` could regress unrelated `staffing_orders` behavior (e.g. cascade effects on existing FKs). | Migration is forward-only; the new table has `ON DELETE RESTRICT` for all FKs; no existing table is altered. Pre-flight sanity: `npx prisma validate` + targeted migration dry-run. |
| `RISK-02` | The new SECDEFINER helpers OR'd with the existing RLS policies could over-broaden visibility for some role other than HR_STAFF because the helper composes with other branches. | Both helpers are strictly HR_STAFF-only (`public.hrp_session_role() = 'HR_STAFF'` is the FIRST branch). Non-HR_STAFF roles do not pass the first branch and continue to flow through existing canonical helpers/policies unchanged. Lock `SET search_path = pg_catalog, public` plus REVOKE EXECUTE FROM PUBLIC and explicit GRANT EXECUTE only to runtime roles. Static/migration test asserts `search_path`, grants, owner. Matrix-scope test asserts HR_STAFF × staffing_orders = N (assigned rows) + 0 (unassigned rows). |
| `RISK-03` | The locking strategy for the claim race (`ORDER_RECRUITER_CLAIM`) and for revoke may produce deadlocks under specific orderings. | Lock-order contract: recruiter mutation locks active assignment row inside its tx; revoke locks the same assignment row. Order is fixed. Tests cover both orderings using two DB connections. |
| `RISK-04` | Adding narrowly-scoped HR_STAFF policies for `Project` could accidentally let HR_STAFF INSERT/UPDATE/DELETE projects via the additive OR. | The HR_STAFF `Project` policy is `PERMISSIVE FOR SELECT` only. No `FOR INSERT`, no `FOR UPDATE`, no `FOR DELETE` policy for HR_STAFF on `Project`. The root/global branch of `public.hrp_project_writable` is unchanged. |
| `RISK-05` | Path allowlist drift if Tier 1 silently edits unrelated files. | `verify-task.ps1` enforces `AC-11` (`git diff --check origin/main..HEAD` returns no warnings and exactly two docs files changed). |
| `RISK-06` | Encoding corruption in working tree (CRLF or UTF-8 BOM) or C0 controls producing false bytes in committed text. | Node.js strict-UTF-8 scanner (`TextDecoder('utf-8', { fatal: true })`) before commit; commit aborted if scanner reports any non-zero count. |
| `RISK-07` | Invented paths shipped to implementation. | Implementation allowlist rows are verified at `origin/main @ f3a3d1a4` via `git cat-file -e origin/main:<path>`; new paths are explicitly marked `(new)` and out-of-scope paths are explicitly forbidden (including all `src/app/**`). |
| `RISK-08` | Claim race producing extra losers leaking `LaborProfileHandlingAssignment` rows if the second `INSERT` is not serialized. | The single insert is performed inside `withDbContext` with `pg_advisory_xact_lock(hash, hash_sub)` on the (StaffingOrderId, SubmissionId) key; the partial unique index on `LaborProfileHandlingAssignment` also enforces no-double-active. Loser path returns `409 HANDLING_ALREADY_CLAIMED` immediately. |

## 8. Open Questions

Open questions for the implementation round (this planning round closes
zero with non-zero status; all rows point forward to the
implementation round):

| ID | Question | Owner | Status |
| --- | --- | --- | --- |
| `OPEN-Q-01` | Will the production migration role own the new aggregate table `staffing_order_recruiter_assignments`? | T0 | carries forward to implementation round |
| `OPEN-Q-02` | Will `HR_STAFF` JobPosting INSERT/UPDATE policies require a manual override gate at publish-time? | T0 | carries forward to implementation round |
| `OPEN-Q-03` | Will the unclaimed-queue masked-field redaction be enforced at the SQL helper (`public.hrp_*`) layer or at the read-service layer? | T1C | carries forward to implementation round |

The planning round closes with **zero** open planning-level decisions
(`Open Owner decisions: 0` in §0 above). All open question rows above
point to the implementation round, NOT to this planning-round contract.

## 9. Planner Resolution

Tier 1 (T1C) is the planner of record for this contract. v1.2 was
authored as a T0-requested integrity correction over v1.1. Tier 1
explicitly:

- Acknowledges that v1.1 received a verdict of `CHANGES_REQUIRED` and
  does not self-declare any contract-text-accepted state.
- Closes the v1.1-corrected `DEC-20..DEC-30` (C-01..C-12) and the
  v1.2-corrected `DEC-31` (I-01..I-08) carrier decision into §3.
- Limits the working-tree change set to exactly the two planned docs
  files; no source / schema / migration / package / lockfile edits.
- Stops execution after the v1.2 docs-only commit + push and reports the
  full SHA back to T0 for final review.

## 10. Revision Log

| Spec version | Date | Author | Change | Reason |
| --- | --- | --- | --- | --- |
| `v1.0` | 2026-09-28 | Tier 1 (T1C) | Initial planning contract; baseline `f3a3d1a4`; PROPOSED_ONLY + Contract gate DRAFT + Decision state CLOSED; correction budget 1; AC-E2E-01..AC-E2E-18 chain carried forward from Owner directive; DEC-01..DEC-19 close all 17 locked Owner decisions plus DEC-18 (forward-only migration posture) and DEC-19 (planning-round posture). | `T0 → T1C — P1-A0.4 Scoped Recruiter Authority — planning round` |
| `v1.1` | 2026-09-28 | Tier 1 (T1C) | T0 correction `C-01..C-12` consolidated into one docs-only forward-only commit on top of predecessor `5bb7581a11312c5111f51e0ec84534b4ac9b4a97`. Status equivalent to the legacy `ready-to-code-token` under the legacy V2 enum; Contract gate `ready-to-code-token` (V2 enum); Contract accepted by T0 `YES` (semantic field; T0 later returned a verdict of `CHANGES_REQUIRED` on a follow-up review which is why v1.2 is required). AC-E2E chain expanded from 18 to 22 steps; DEC-20..DEC-30 carry the C-01..C-12 corrections. | `T0 → T1C — P1-A0.4 Contract Correction v1.1 — C-01..C-12` |
| `v1.2` | 2026-09-28 | Tier 1 (T1C) | T0 integrity correction after v1.1 verdict `CHANGES_REQUIRED`. Working-tree docs reset from clean predecessor blob to repair encoder-induced mojibake (195 markers, 3 C0 controls U+000B ×2 + U+000C) introduced at v1.1. Strict UTF-8 LF no-BOM, 0 NUL, 0 U+FFFD, 0 mojibake. | `T0 → T1C — P1-A0.4 pre-implementation integrity correction v1.2` |
| `v1.3` | 2026-09-28 | Tier 1 (T1C) | T0 ACCEPTED v1.2 planning SHA `e40a0b50863a3501f89943ba737592f1e2054e8d`. Phase-0 contract adoption/materialization (mechanical, not a new T1C correction batch): (1) replace nonexistent path `src/shared/auth/withIdempotency.ts` with existing canonical `src/shared/integrity/idempotency.ts`; (2) replace nonexistent path `src/lib/auth/session.ts` with existing canonical `src/shared/auth/auth-context.ts` (and additionally allow `src/shared/auth/server-session.ts` for Server Component session reading); (3) §6.1 AC-24 row rewritten to a real `AC-24` — I-07 control truthfulness row carrying v1.3 truthful controls (Spec version `v1.3`; Status `READY_TO_CODE`; Contract gate `READY_TO_CODE`; Contract accepted by T0 `YES`; Assurance lane `CRITICAL`; Audit mode `LIGHT`; implementation correction budget `1`; implementation correction batches used `0`; Test environment `REQUIRED`; Next gate `TIER1_IMPLEMENTATION_FREEZE`; Open Owner decisions `0`); (4) §0 control table rewritten to v1.3 fields (work type `IMPLEMENTATION`, planning correction budget `1` consumed by v1.1, T0 planning integrity exceptions used `1` consumed by v1.2, implementation correction budget `1`, implementation correction batches used `0`, test environment `REQUIRED`); (5) predecessor chain preserved: `5bb7581a` (v1.0), `f1fff224` (v1.1), `e40a0b5` (v1.2 ACCEPTED). No amend / reset / rebase / force-push. Strict UTF-8 no-BOM LF verified. Planning AC numbering stays exactly `AC-01..AC-28`; E2E chain stays exactly `AC-E2E-01..AC-E2E-22`. | `T0 → T1C — P1-A0.4 contract ACCEPTED + implementation authorization` |

---

*This contract is v1.3, materializing T0 ACCEPTED v1.2 (`e40a0b50863a3501f89943ba737592f1e2054e8d`). Work type `IMPLEMENTATION`; Status `READY_TO_CODE`; Contract gate `READY_TO_CODE`; Next gate `TIER1_IMPLEMENTATION_FREEZE`. Tier 1 begins Phase 1 (separate worktree + branch `codex/t1c-p1a04-scoped-recruiter-authority-impl`) immediately. Implementation round does not consume T0 planning correction budgets or T0 planning integrity exceptions.*
