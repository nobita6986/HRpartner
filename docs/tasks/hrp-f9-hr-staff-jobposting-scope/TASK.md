# TASK — `hrp-f9-hr-staff-jobposting-scope`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-f9-hr-staff-jobposting-scope` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | CRITICAL + LIGHT — security/RLS/authorization scope for HR_STAFF on JobPosting authoring + read surface. Tier 3 must verify on synthetic-DB evidence that the dual-boundary guard rejects unassigned/revoked/other-recruiter sessions, that ADMIN/HR_MANAGER regression is byte-equivalent, and that no PII or foreign entity metadata leaks through the error envelope. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` (T1A) |
| Baseline | `6015361bb986b920bad6a90f8f9986165a4a99d5` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Test environment note | Synthetic Neon `ep-empty-forest-azlhfyo9-*` writer/admin pair; env-blocked in this sandbox awaiting T0 authorization of the pair; falls back to `BLK-01` analog of P1-A0.4 R3 if T0 does not authorize. See also DEC-10, STEP-13, STEP-14, RISK-03. |
| Correction budget | `1` |
| In-scope roots | `src/domains/staffing/job-posting-authoring.service.ts`, `src/domains/staffing/job-posting-list.service.ts`, `app/admin/jobs/job-postings/page.tsx`, `app/api/admin/jobs/job-postings/route.ts`, `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts`, `src/domains/staffing/job-posting-authoring.service.test.ts`, `src/shared/security/required-relation-sweep.static.test.ts`; task bundle = `docs/tasks/hrp-f9-hr-staff-jobposting-scope/{TASK.md,HANDOFF.md,AUDIT.md}` |
| Forbidden paths | `prisma/schema.prisma` (no schema change), `prisma/migrations/**` (no new migration this round), `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` (no dependency change), `src/domains/talent/recruiter-assignment.service.ts` (read-only consumption of the canonical helper), `src/shared/auth/auth-context.ts` (read-only consumption), `src/shared/integrity/idempotency.ts` (read-only consumption), `app/admin/staffing-orders/**` (out of F9 scope), `app/admin/recruiter-workbench/**` (out of F9 scope), `src/domains/staffing/placement/**` (out of F9 scope), any unrelated sidebar / IA / icon / copy file |
| Required gates | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md`; `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md`; `node .ai-pipeline/scripts/verify-encoding-range.mjs <SHA_X1>..HEAD`; `npx prisma validate`; `npx tsc --noEmit`; `npm run lint`; `npm run build`; `git diff --check <SHA_BASELINE>..HEAD`; `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts <INTEGRATION_SUITES>` (env-gated); `npx vitest run --config vitest.unit.config.ts` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `TIER3_LIGHT_AUDIT` on exact frozen Implementation SHA. Pipeline = `/deliver hrp-f9-hr-staff-jobposting-scope` → implementation + canonical gates + freeze → `/audit hrp-f9-hr-staff-jobposting-scope` → one consolidated correction batch → closeout. |

> Lane and audit are independent decisions. CRITICAL defaults to LIGHT (this row). Audit reason is recorded so selective audit is reviewable.

> V2_FAST_FREEZE: contract switches to `READY_FOR_EXECUTION` only when `Contract gate = READY_TO_CODE`, `Decision state = CLOSED`, environment is `READY/NOT_REQUIRED`, baseline + file ownership pinned. One consolidated correction batch after audit. No retroactive lane downgrade on historical artifacts.

## 1. Outcome

### 1.1 User-visible outcome

- `HR_STAFF` only sees, only selects and only creates / publishes / updates / archives a `JobPosting` for a `StaffingOrderSlot` whose `StaffingOrder` has an ACTIVE `StaffingOrderRecruiterAssignment` for the caller. `revoked`, `unassigned` and `other-recruiter` HR_STAFF sessions are fail-closed at both the selector (read boundary) and the server write path (server-side authority), with no PII or foreign entity metadata leakage. `ADMIN` and `HR_MANAGER` retain cross-order authority byte-equivalent to the pre-F9 posture.

### 1.2 Non-goals

- No schema change. No new migration. No `prisma/schema.prisma` edit.
- No new dependency. No package.json / lockfile edit.
- No new lifecycle command (`cancelJobOpening`, `restoreArchivedJobPosting`, reopen `FILLED/CANCELLED`, rollback `EFFECTIVE`, compensation, exception intake are explicitly out of scope per binding decision §E.2).
- No change to `JobOpening` / `JobPosting` lifecycle state machine.
- No change to Placement dual authority (already enforced at `recruiter-placement.adapter.ts` + `placement.service.ts`); this task does NOT touch that path.
- No new RLS policy. `hrp_project_writable` stays HR_STAFF-false. `hrp_sora_*_staff_select` policies stay unchanged. The application layer holds the new authority.
- No `nới` of `admin` / `hr_manager` / `pm` / `sale` / `director` / `accountant` paths.
- No Media V1, no sidebar / navigation debt, no Priority 2 / Priority 3 work (binding decision §D.2 / §D.3 / §D.4).
- No production DB access. No production migration.
- No opening of new lifecycle command (binding decision §E.2).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md` (binding decision, fetched from `origin/main @ 6015361b`) | Tier 0 BINDING contract for execution order, F9 scope, completion criteria, stop conditions. |
| `EV-02` | `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` v1.3.r9.3.closeout (P1-A0.4) | Authoritative P1-A0.4 contract: scoped-recruiter authority, `StaffingOrderRecruiterAssignment`, RLS posture, `assertActiveRecruiterForOrder` helper. F9 inherits the contract; F9 is a narrow application-level extension over the same primitive. |
| `EV-03` | `src/domains/staffing/job-posting-authoring.service.ts:69-77` `AuthoringErrorCode` enum | Current error codes lack a typed `NO_ACTIVE_ORDER_ASSIGNMENT`. New code required so the route can map a stable, leak-free error envelope. |
| `EV-04` | `src/domains/staffing/job-posting-authoring.service.ts:97-100` `ALLOWED_MUTATION_ROLES = {ADMIN, HR_MANAGER, HR_STAFF}` | HR_STAFF is authorized to mutate JobPosting. The F9 fix narrows HR_STAFF scope at the order level, not the role level. |
| `EV-05` | `src/domains/staffing/job-posting-authoring.service.ts:374-475` `assertSlotEligibleForNewJobPosting` | Currently has NO application-level recruiter-assignment check. Selection is delegated to RLS-only. This is the F9 server-write-boundary gap. |
| `EV-06` | `src/domains/staffing/job-posting-list.service.ts:335-365` `eligibleSlotPredicateSql` and `baseJobOpeningCapacityPredicateSql` | Current SQL predicate has NO active-assignment join. F9 fix adds an `EXISTS (...)` clause on `staffing_order_recruiter_assignments` for HR_STAFF callers, mirroring `hrp_staffing_order_visible_for` semantics. |
| `EV-07` | `src/domains/talent/recruiter-assignment.service.ts:878-911` `assertActiveRecruiterForOrder(tx, actorId, actorRole, staffingOrderId)` | Canonical P1-A0.4 helper. ADMIN/HR_MANAGER bypass; HR_STAFF must have an ACTIVE row. Throws `RecruiterAssignmentError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)`. F9 fix calls this helper and maps the error class to `AuthoringError`. |
| `EV-08` | `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql:14` `hrp_project_writable` = `IN ('ADMIN','HR_MANAGER','DIRECTOR','SALE')` | This is what currently blocks HR_STAFF INSERT/UPDATE/DELETE on `job_postings` at the RLS layer. F9 fix keeps this posture; the application-level guard is additive (defense in depth, contract explicitness). |
| `EV-09` | `prisma/migrations/20260928220000_p1a04_scoped_recruiter_authority/migration.sql:445-450, 511, 515, 524-532` (HR_STAFF narrow SELECT policies on `staffing_orders`, `staffing_order_slots`, `job_openings`, `job_postings`) | RLS is currently the only thing scoping HR_STAFF. F9 fix adds the application-level guard; RLS stays the backstop. |
| `EV-10` | `app/admin/jobs/job-postings/page.tsx:87-95` `VIEWER_ROLES` / `CREATE_ROLES` | HR_STAFF is in `CREATE_ROLES` so the form is rendered. F9 fix adds a role-conditional UI banner above the form for HR_STAFF so the user understands the scope. |
| `EV-11` | `app/api/admin/jobs/job-postings/route.ts:90-110` POST route → `assertSlotEligibleForNewJobPosting` → `withIdempotency` → `createOrReuseJobOpeningForSlot` → `createOrReuseJobPostingDraftForOpening` | The write path. Currently the only check is `assertSlotEligibleForNewJobPosting` (which has no recruiter check) + role gate. F9 fix adds recruiter guard inside the same transaction, before the create chain. |
| `EV-12` | `tests/db/job-posting-authoring.integration.test.ts:1-100` (no HR_STAFF cases) | Confirms there is currently no synthetic test asserting HR_STAFF cannot see/create JobPosting on unassigned orders. F9 fix adds this coverage. |
| `EV-13` | `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` and `tests/db/p1a04-canonical-flow.integration.test.ts` (env-blocked) | Existing canonical recruiter-authority integration suites. F9 fix preserves these as regression guards and adds a sibling `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts`. |
| `EV-14` | `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_AUDIT.md` (binding audit ledger) | F9 disposition recorded here in §J.0 cross-document consistency table: F9 = `Priority 1` CRITICAL authorization; current disposition in this round is `CONFIRMED_PARTIAL` (RLS gates leak; service-layer dual-boundary guard absent). |
| `EV-15` | `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md` | Historical P1-A0.4 context (superseded by TASK.md + HANDOFF.md but still informative on assignment + RLS). |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | F9 is a CRITICAL authorization / scope task. Assurance lane CRITICAL; Audit mode LIGHT; bind to P1-A0.4 v1.3.r9.3.closeout contract. | `CHOSEN` |
| `DEC-02` | HR_STAFF is a scoped recruiter. HR_STAFF is permitted to view / select / create / update / publish / unpublish / archive a JobPosting ONLY for a StaffingOrder for which the same HR_STAFF has an ACTIVE `StaffingOrderRecruiterAssignment`. Revoked / unassigned / other-recruiter / not-yet-assigned are uniformly fail-closed. | `CHOSEN` |
| `DEC-03` | Enforcement is at BOTH the read/selector boundary (UI Server Component) AND the server write boundary (route + service). Client filtering alone is insufficient. | `CHOSEN` |
| `DEC-04` | `ADMIN` and `HR_MANAGER` behaviour remains BYTE-EQUIVALENT to pre-F9. The `assertActiveRecruiterForOrder` helper already bypasses these roles. | `CHOSEN` |
| `DEC-05` | Stable typed error code `NO_ACTIVE_ORDER_ASSIGNMENT` is added to `AuthoringErrorCode` (job-posting-authoring.service.ts). HTTP 403. The error envelope carries NO slot id, NO staffing order id, NO project id, NO assignee id of the out-of-scope order. | `CHOSEN` |
| `DEC-06` | Recruiter guard runs inside the same transaction as the mutation. Re-check happens after `SELECT FOR UPDATE` (defense in depth against revoke race). | `CHOSEN` |
| `DEC-07` | The selector SQL predicate gets a NEW narrow `eligibleSlotForRecruiterPredicateSql(now, actorId)` for HR_STAFF callers only. The base predicate remains unchanged for ADMIN / HR_MANAGER. The original `eligibleSlotPredicateSql` is composed with this new predicate via SQL `AND` only when `ctx.role === 'HR_STAFF'`. | `CHOSEN` |
| `DEC-08` | The new guard reuses the canonical `assertActiveRecruiterForOrder` helper from `recruiter-assignment.service.ts` (read-only consumption; no edit to that file). The JobPosting authoring service WRAPS `RecruiterAssignmentError` into a new `AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', ..., 403)` so the route's existing `AuthoringError` catch block surfaces the stable code without leaking recruiter-assignment internal type. | `CHOSEN` |
| `DEC-09` | For the read-helper `getJobPostingForAuthoring`, the guard derives `staffingOrderId` from `jobPosting → jobOpening → staffingOrderId` inside the same transaction and calls the same helper. For HR_STAFF on a posting whose order is not active-assigned, returns `null` (no existence oracle; RLS already returns 0 rows; explicit guard prevents future RLS relaxation regressions). | `CHOSEN` |
| `DEC-10` | Synthetic DB integration test mirrors the canonical P1-A0.4 pattern (`tests/db/p1a04-canonical-flow.integration.test.ts`): real `createStaffingOrder`, real `assignRecruiterToOrder`, real `createOrReuseJobOpeningForSlot`, real `createOrReuseJobPostingDraftForOpening`, real `assertSlotEligibleForNewJobPosting`. Env-blocked in this sandbox; awaits T0 authorization of the `ep-empty-forest-azlhfyo9-*` writer/admin pair. | `CHOSEN` |
| `DEC-11` | No new RLS policy this round. `hrp_project_writable` stays HR_STAFF-false (defense in depth at DB layer already in place). Optional future narrow INSERT/UPDATE policies on `job_postings` for HR_STAFF are explicitly deferred (binding decision §D.4 — minimal blast radius). | `CHOSEN` |
| `DEC-12` | No lifecycle / state machine change. `publish` invariant (JobOpening must be OPEN) is unchanged. `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION` and `P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY` remain visible but are out of F9 scope. | `CHOSEN` |
| `DEC-13` | UI banner on `app/admin/jobs/job-postings/page.tsx` for HR_STAFF: "Bạn chỉ thấy các slot thuộc StaffingOrder bạn được phân công làm recruiter." Empty-state message stays generic. No copy rewrite for the slot dropdown. | `CHOSEN` |
| `DEC-14` | Idempotency behavior is unchanged. `withIdempotency` is the route's concern. The new guard runs INSIDE the idempotency key's body so a replay observes the same authority posture. | `CHOSEN` |
| `DEC-15` | Public `JobPosting` read path (`/api/jobs/[slug]`, `getPublicJobDetail`, `hrp_public_apply_submission`) is UNCHANGED. Public read of a published JobPosting remains available after a recruiter revoke. (This is the same posture as P1-A0.4 §AC-E2E-18; F9 inherits it.) | `CHOSEN` |
| `DEC-16` | Correction budget = 1. One forward-only commit on top of `6015361b` for the implementation SHA. One forward-only commit for docs/evidence freeze SHA. No amend / reset / rebase / force-push. | `CHOSEN` |
| `DEC-17` | Library-first. No new package. Pattern reuse: `assertActiveRecruiterForOrder` (P1-A0.4), `withIdempotency` (E1), `withDbContext` (auth), `AuthoringError` (job-posting-authoring.service.ts). | `CHOSEN` |
| `DEC-18` | Build vs adopt = `N/A`. Task does not introduce any new capability kỹ thuật phổ thông and does not add/replace dependency or shared framework. | `CHOSEN` |
| `DEC-19` | Build vs automate = `N/A`. Task does not create or change a connector, scheduler, notification worker or multi-system / operator workflow. | `CHOSEN` |
| `DEC-20` | Out-of-scope is explicit: no `prisma/schema.prisma` edit, no migration, no package, no lockfile, no production-config, no other route surface, no Media V1, no Priority 2/3 work. | `CHOSEN` |
| `DEC-21` | Predecessor chain preserved: implementation SHA forward-only on top of `6015361b`; docs/evidence freeze SHA forward-only on top of the implementation SHA. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Capability kỹ thuật phổ thông | N/A | `N/A` | N/A | N/A | N/A | F9 does not create a common technical capability and does not change dependency / shared framework. The fix is application-layer logic on top of the existing `assertActiveRecruiterForOrder` helper. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Workflow / connector / scheduler | N/A | `N/A` | N/A | N/A | N/A | N/A | F9 does not create or change a connector, scheduler, notification worker or multi-system workflow. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | HR_STAFF only sees / selects slots of StaffingOrders for which the same HR_STAFF has an ACTIVE `StaffingOrderRecruiterAssignment` (`listEligibleSlotsForNewJobPosting`). |
| `RQ-02` | HR_STAFF `POST /api/admin/jobs/job-postings` for a slot of an order she's not assigned to is rejected with `AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)` and zero side effects (no JobOpening, no JobPosting, no idempotency key commit). |
| `RQ-03` | HR_STAFF direct attempts to create / update / publish / unpublish / archive a JobPosting on an order she's not assigned to are rejected at the service layer (each command derives `staffingOrderId` and re-checks). |
| `RQ-04` | Revoked `StaffingOrderRecruiterAssignment` (was ACTIVE, now REVOKED) for the caller is rejected uniformly. The re-check inside the transaction (after `SELECT FOR UPDATE`) closes the revoke race. |
| `RQ-05` | ADMIN and HR_MANAGER behaviour remains byte-equivalent. They do not have an active assignment and the canonical helper bypasses them. |
| `RQ-06` | The error envelope carries NO slot id, NO staffing order id, NO project id, NO assignee id of the out-of-scope order. Stable typed code `NO_ACTIVE_ORDER_ASSIGNMENT`. |
| `RQ-07` | Idempotency behavior is preserved. A retry of the same Idempotency-Key observes the same authority posture. |
| `RQ-08` | The public `JobPosting` read path (`/api/jobs/[slug]`, `getPublicJobDetail`, `hrp_public_apply_submission`) is unchanged. A published JobPosting remains readable to the public after a recruiter revoke. |
| `RQ-09` | Synthetic DB integration coverage exists: 22-step canonical chain (HR_STAFF scenarios + ADMIN/HR_MANAGER regression + no-PII + zero residue). Env-blocked in this sandbox; awaits T0 authorization of the `ep-empty-forest-azlhfyo9-*` pair. |
| `RQ-10` | Unit + static-test coverage: new unit cases for the new error path; `required-relation-sweep.static.test.ts` updated for the new helper call sites. |
| `RQ-11` | Canonical gates (typecheck, lint, build, Prisma validate, encoding, diff-check) PASS. |
| `RQ-12` | Tier 3 LIGHT audit passes at the exact frozen Implementation SHA, with no P0/P1/P2 release-blocking finding. |
| `RQ-13` | Working tree is clean before push. Predecessor chain preserved. No amend / reset / rebase / force-push. |
| `RQ-14` | UI banner is rendered for HR_STAFF on the JobPosting admin page (Server Component). |

### 4.2 Scope boundaries

- **In:**
  - `src/domains/staffing/job-posting-authoring.service.ts` — add new `AuthoringErrorCode` literal `'NO_ACTIVE_ORDER_ASSIGNMENT'`; wrap `assertActiveRecruiterForOrder` calls in `assertSlotEligibleForNewJobPosting`, `createOrReuseJobOpeningForSlot`, `createOrReuseJobPostingDraftForOpening`, `updateDraftContent`, `publishJobPosting`, `unpublishJobPosting`, `archiveJobPosting`, `getJobPostingForAuthoring`. Map `RecruiterAssignmentError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)` to `AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)`.
  - `src/domains/staffing/job-posting-list.service.ts` — add `eligibleSlotForRecruiterPredicateSql(now, actorId)`; compose in `listEligibleSlotsForNewJobPosting` only for HR_STAFF callers. Base predicate unchanged for ADMIN / HR_MANAGER / PM / SALE / DIRECTOR.
  - `app/admin/jobs/job-postings/page.tsx` — Server Component adds role-conditional UI banner for HR_STAFF; empty-state stays generic.
  - `app/api/admin/jobs/job-postings/route.ts` — confirm the new `AuthoringErrorCode` is mapped to 403 via the existing `AuthoringError` catch block (no edit needed if the catch already returns `error.httpStatus`; verify and adjust if needed).
  - `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` (new) — synthetic DB integration suite; mirrors p1a04-canonical-flow pattern.
  - `src/domains/staffing/job-posting-authoring.service.test.ts` (existing) — append unit cases for the new error path.
  - `src/shared/security/required-relation-sweep.static.test.ts` (existing) — update `EXPECTED_HITS` to include the new helper call sites.
  - Task bundle: `docs/tasks/hrp-f9-hr-staff-jobposting-scope/{TASK.md, HANDOFF.md, AUDIT.md}`.
- **Out:** schema, migration, package, lockfile, public RLS path, RLS helper function bodies, lifecycle state machine, Placement dual-authority path, Recruiter Workbench, sidebar/IA, Media V1, Priority 2/3 work, production DB, production migration, production deploy.
- **Allowed task artifacts:** `docs/tasks/hrp-f9-hr-staff-jobposting-scope/**`.

### 4.3 Domain boundaries

- **Data/state:** Synthetic DB integration test uses disposable fixture ids (`p1a05-f9-<RUN_ID>-<SLUG>`). Production DB is not mutated in this round (no migration authored). FK-safe reverse teardown mandated.
- **Permission/security:** Application-level guard via `assertActiveRecruiterForOrder` (read-only consumption of canonical helper, no edit to `recruiter-assignment.service.ts`). Stable typed error code `NO_ACTIVE_ORDER_ASSIGNMENT` (HTTP 403). No PII / foreign entity metadata in error envelope. `assertMutationRole` is unchanged (HR_STAFF still in `ALLOWED_MUTATION_ROLES`). No new RLS policy; no `nới` of existing RLS.
- **Interface/API:** `POST /api/admin/jobs/job-postings` envelope gains one new error code; existing `AuthoringError` catch block already maps `error.code` to JSON; verified that the new code propagates correctly. No JWT shape change. No public API contract change.
- **Migration/rollback:** Forward-only. No new migration this round. Soft-revert = revert the implementation commit; the docs/evidence freeze commit depends on it. Hard-revert = a follow-up forward-only commit that unwinds the guard.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/staffing/job-posting-authoring.service.ts` | Add `AuthoringErrorCode` literal `'NO_ACTIVE_ORDER_ASSIGNMENT'`; add a private `assertHrStaffRecruiterScope(tx, ctx, staffingOrderId)` helper that wraps `assertActiveRecruiterForOrder` and maps `RecruiterAssignmentError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)` → `AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)`. For HR_STAFF callers only; bypass for ADMIN/HR_MANAGER. | `npx tsc --noEmit` PASS; `npm run lint` 0 errors; `git grep -nE "NO_ACTIVE_ORDER_ASSIGNMENT" src/domains/staffing/job-posting-authoring.service.ts` non-empty. | If `assertActiveRecruiterForOrder` signature changes or helper is removed from canonical P1-A0.4, stop and escalate to T0. |
| `STEP-02` | `src/domains/staffing/job-posting-authoring.service.ts` — `assertSlotEligibleForNewJobPosting` (lines 374-475) | After the `SELECT FOR UPDATE` returns a row, BEFORE predicate validation, call `assertHrStaffRecruiterScope(tx, ctx, slot.staffing_order_id)` for HR_STAFF callers. This is the server-write-boundary guard. | `npx tsc --noEmit` PASS; targeted unit case `src/domains/staffing/job-posting-authoring.service.test.ts` "HR_STAFF slot of unassigned order → 403 NO_ACTIVE_ORDER_ASSIGNMENT" PASS. | If the SELECT FOR UPDATE shape must change for the guard, stop and escalate. |
| `STEP-03` | `src/domains/staffing/job-posting-authoring.service.ts` — `createOrReuseJobOpeningForSlot` (lines 499-577) | After the slot lock, re-call `assertHrStaffRecruiterScope(tx, ctx, slot.staffing_order_id)` for HR_STAFF. Defense in depth — closes a revoke race that may have committed between the read in `assertSlotEligibleForNewJobPosting` and the INSERT/UPDATE. | Same as STEP-02. | Same. |
| `STEP-04` | `src/domains/staffing/job-posting-authoring.service.ts` — `createOrReuseJobPostingDraftForOpening` (lines 591-650) | Derive `staffingOrderId` from `jobOpening.staffingOrderId` inside the same transaction. Call `assertHrStaffRecruiterScope`. | Same. | Same. |
| `STEP-05` | `src/domains/staffing/job-posting-authoring.service.ts` — `updateDraftContent` (lines 660-770), `publishJobPosting` (lines 779-870), `unpublishJobPosting` (lines 880-915), `archiveJobPosting` (lines 930-970) | Each command derives `staffingOrderId` from `jobPosting → jobOpening.staffingOrderId` (via include) and calls `assertHrStaffRecruiterScope`. | Same. | Same. |
| `STEP-06` | `src/domains/staffing/job-posting-authoring.service.ts` — `getJobPostingForAuthoring` (lines 980-985) | For HR_STAFF, derive `staffingOrderId` and call `assertHrStaffRecruiterScope`. On miss, return `null` (no existence oracle). | Same. | Same. |
| `STEP-07` | `src/domains/staffing/job-posting-list.service.ts` | Add `eligibleSlotForRecruiterPredicateSql(now, actorId)` (new exported SQL fragment) that adds `EXISTS (SELECT 1 FROM staffing_order_recruiter_assignments a WHERE a.staffing_order_id = s.staffing_order_id AND a.recruiter_user_id = $actorId AND a.status = 'ACTIVE')`. `listEligibleSlotsForNewJobPosting` accepts an optional `actorId`; when `actorId` is provided, compose the recruiter predicate with the base predicate via SQL `AND`. Caller (`app/admin/jobs/job-postings/page.tsx`) passes `session.role === 'HR_STAFF' ? session.userId : undefined`. | `npx tsc --noEmit` PASS; targeted unit case PASS; the page-level integration shows the HR_STAFF slot list is the same set the `assertSlotEligibleForNewJobPosting` re-validates (no drift). | If the canonical P1-A0.4 assignment table column names drift, stop and escalate. |
| `STEP-08` | `app/admin/jobs/job-postings/page.tsx` | When `session.role === 'HR_STAFF'`, render a banner above the form: "Bạn chỉ thấy các slot thuộc StaffingOrder bạn được phân công làm recruiter." When `eligibleSlots.length === 0`, the existing empty-state message remains. | `npx tsc --noEmit` PASS; targeted `*.test.tsx` if any; visual review. | If the existing message text is locked by an Owner copy decision, escalate before changing. |
| `STEP-09` | `app/api/admin/jobs/job-postings/route.ts` | Verify the existing `AuthoringError` catch block propagates `error.code` and `error.httpStatus`; confirm the new `NO_ACTIVE_ORDER_ASSIGNMENT` code returns HTTP 403 with `{ error: 'NO_ACTIVE_ORDER_ASSIGNMENT', message: <CANONICAL_SAFE_TEXT> }` and no PII. | `npx tsc --noEmit` PASS; targeted route unit test. | If the catch block does not propagate the new code correctly, add a small explicit branch (no semantic change to other codes). |
| `STEP-10` | `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` (new) | Synthetic DB integration suite. Mirrors p1a04-canonical-flow. 22 AC mapped 1:1 to §6.1 below. Env-blocked in this sandbox via `describe.skipIf(!HAS_TEST_DB)`; awaits T0 authorization. | `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts --repeat 3` PASS; zero residue. | If the env pair is not authorized, the suite is env-blocked; close the round only with `BLK-01` analog documented. |
| `STEP-11` | `src/domains/staffing/job-posting-authoring.service.test.ts` | Append unit cases: HR_STAFF slot of unassigned order → 403; HR_STAFF slot of assigned order → 200; ADMIN/HR_MANAGER slot of any order → 200. | `npx vitest run src/domains/staffing/job-posting-authoring.service.test.ts` PASS. | None. |
| `STEP-12` | `src/shared/security/required-relation-sweep.static.test.ts` | Update `EXPECTED_HITS` to include the new helper call sites. | `npx vitest run src/shared/security/required-relation-sweep.static.test.ts` PASS; hit count increases by exactly the new call sites. | None. |
| `STEP-13` | `git add docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` (this file), then source/test changes in steps 1..12, then commit as Implementation SHA `X1` forward-only on top of `6015361b`. | Freeze semantic. | `git rev-parse --verify X1^{commit}` resolves; `git log --oneline -2` shows 1 commit ahead of `6015361b`. | If pre-commit hooks fail, stop and report. |
| `STEP-14` | Run canonical gates: `npx prisma validate`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check 6015361b..X1`, `node .ai-pipeline/scripts/verify-encoding-range.mjs 6015361b X1`, `npx vitest run --config vitest.unit.config.ts`. | Confirm pre-audit posture. | All gates PASS or NOT_REQUIRED (integration is env-blocked). | Any FAIL blocks Tier 3 call. |
| `STEP-15` | `docs/tasks/hrp-f9-hr-staff-jobposting-scope/HANDOFF.md` | Document implementation SHA, freeze SHA, evidence rows, deviations, final status. | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` = `RESULT: PASS`. | None. |
| `STEP-16` | Commit HANDOFF.md as docs/evidence freeze SHA `X2` forward-only on top of `X1`. | Freeze docs/evidence. | `git rev-parse --verify X2^{commit}` resolves; predecessor chain preserved. | None. |
| `STEP-17` | Tier 3 LIGHT audit at exact Implementation SHA `X1`. | Independent verification. | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` = `RESULT: PASS` after `docs/tasks/hrp-f9-hr-staff-jobposting-scope/AUDIT.md` is adopted. | If Tier 3 returns blockers, address in one consolidated correction batch. |
| `STEP-18` | Push branch `codex/t1a-f9-hr-staff-jobposting-scope` forward-only. Open non-draft PR into `main`. Stop. | Hand control to T0 for merge review. | `git push` exit 0; `gh pr create --base main --head codex/t1a-f9-hr-staff-jobposting-scope --draft=false` exit 0. | None. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `listEligibleSlotsForNewJobPosting` for HR_STAFF Alice returns only slots of orders Alice has an ACTIVE `StaffingOrderRecruiterAssignment` on; slots of orders Bob is assigned to are NOT in the result; slots of unassigned orders are NOT in the result. | `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` step 1 (env-blocked) + targeted static unit test on the SQL fragment |
| `AC-02` | Alice direct `POST /api/admin/jobs/job-postings` with `slotId` of Order B (Bob's assignment) is rejected. | `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` step 2 + targeted route unit test |
| `AC-03` | Alice direct POST with `slotId` of Order C (no assignment) is rejected. | `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` step 3 (synthetic-DB psql + vitest run, env-blocked) |
| `AC-04` | Alice direct POST with `slotId` of Order A (her own assignment) succeeds; JobOpening + JobPosting DRAFT are created; idempotent replay returns the same row. | `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` steps 4-5 (synthetic-DB vitest + curl POST) |
| `AC-05` | Alice direct POST with `slotId` of Order D (revoked from Alice) is rejected. | `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` step 6 (synthetic-DB vitest run, env-blocked) |
| `AC-06` | Bob direct POST with `slotId` of Order A is rejected. | `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` step 7 (synthetic-DB vitest run, env-blocked) |
| `AC-07` | Concurrent revoke-before-create: in two independent transactions, a `revokeRecruiterFromOrder` commits before Alice's `createOrReuseJobOpeningForSlot` re-reads authority inside the same transaction → fail-closed with `NO_ACTIVE_ORDER_ASSIGNMENT`. | Step 8 (synthetic-DB two-connection race) |
| `AC-08` | ADMIN direct POST with `slotId` of any order succeeds (cross-order access preserved). | `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` step 9 (synthetic-DB vitest run, env-blocked) |
| `AC-09` | HR_MANAGER direct POST with `slotId` of any order succeeds (cross-order access preserved). | `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` step 10 (synthetic-DB vitest run, env-blocked) |
| `AC-10` | Typed error envelope for HR_STAFF on unassigned order contains NO `slotId`, NO `staffingOrderId`, NO `projectId`, NO `assigneeUserId`, NO `JobPosting.id`. Stable `error.code = 'NO_ACTIVE_ORDER_ASSIGNMENT'`. | `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` step 11 (HTTP POST + curl allowlist assertion on error keys) |
| `AC-11` | Existing canonical chain (HR_MANAGER creates Opening → publishes JobPosting) remains byte-equivalent. | `npx vitest run tests/db/job-posting-authoring.integration.test.ts tests/db/p1a04-canonical-flow.integration.test.ts` regression (env-blocked) |
| `AC-12` | `updateDraftContent` / `publishJobPosting` / `unpublishJobPosting` / `archiveJobPosting` for HR_STAFF on a posting of an order she's not assigned to is rejected at the service layer (not just the route). | `npx vitest run src/domains/staffing/job-posting-authoring.service.test.ts` (targeted unit cases) + `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` step 12 (synthetic-DB vitest, env-blocked) |
| `AC-13` | `getJobPostingForAuthoring` for HR_STAFF on a posting of an order she's not assigned to returns `null` (no existence oracle). | `npx vitest run src/domains/staffing/job-posting-authoring.service.test.ts` (targeted unit case) + `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` step 13 (synthetic-DB vitest, env-blocked) |
| `AC-14` | Idempotency-Key replay for the same POST body observes the same authority posture (same 403, same 200). | `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` step 14 (synthetic-DB vitest, env-blocked) + `curl` POST replay |
| `AC-15` | Public `getPublicJobDetail` for an Alice-published posting remains readable after a recruiter revoke. (Public path unchanged.) | Step 15 + `tests/db/p1b-public-apply-slug-bound.integration.test.ts` regression |
| `AC-16` | UI banner rendered for HR_STAFF on the JobPosting admin page; not rendered for ADMIN / HR_MANAGER / PM / SALE / DIRECTOR. | `app/admin/jobs/job-postings/page.tsx` Server Component + targeted component test if any |
| `AC-17` | Zero residue after `afterAll` in the new integration suite. FK-safe reverse teardown. | `npx vitest run tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` (suite `afterAll` block + psql residue scan) |
| `AC-18` | New `AuthoringErrorCode` literal `'NO_ACTIVE_ORDER_ASSIGNMENT'` is in the enum and is returned with HTTP 403. | `git grep -nE "NO_ACTIVE_ORDER_ASSIGNMENT" src/domains/staffing/job-posting-authoring.service.ts` non-empty + targeted unit test |
| `AC-19` | `required-relation-sweep.static.test.ts` PASS with updated `EXPECTED_HITS`; no broken references. | `npx vitest run src/shared/security/required-relation-sweep.static.test.ts` PASS |
| `AC-20` | Canonical gates PASS at Implementation SHA: `npx prisma validate`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check 6015361b..X1`, `node .ai-pipeline/scripts/verify-encoding-range.mjs 6015361b X1` = `RESULT: PASS`, `npx vitest run --config vitest.unit.config.ts` = all PASS. | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` = `RESULT: PASS` |
| `AC-21` | Tier 3 LIGHT audit on exact frozen Implementation SHA `X1`: 50/50 AC PASS or zero P0/P1/P2 release-blocking findings; one consolidated correction batch if any. | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` = `RESULT: PASS` after AUDIT.md is adopted. |
| `AC-22` | Working tree is clean before push; predecessor chain preserved (no amend / reset / rebase / force-push). | `git status --short` empty; `git log -1 --format=%P` shows `6015361bb986b920bad6a90f8f9986165a4a99d5`. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-07`, `STEP-08` | `AC-01`, `AC-16` |
| `RQ-02` | `STEP-01`, `STEP-02`, `STEP-09` | `AC-02`, `AC-03`, `AC-04`, `AC-18` |
| `RQ-03` | `STEP-04`, `STEP-05`, `STEP-12` | `AC-04`, `AC-12` |
| `RQ-04` | `STEP-02`, `STEP-03`, `STEP-12` | `AC-05`, `AC-07` |
| `RQ-05` | `STEP-01`, `STEP-12` | `AC-08`, `AC-09`, `AC-11` |
| `RQ-06` | `STEP-01`, `STEP-12` | `AC-10`, `AC-18` |
| `RQ-07` | `STEP-09` | `AC-14` |
| `RQ-08` | `STEP-12` (regression only) | `AC-15` |
| `RQ-09` | `STEP-10` | `AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-10, AC-12, AC-13, AC-15, AC-17` |
| `RQ-10` | `STEP-11`, `STEP-12` | `AC-12`, `AC-13`, `AC-18`, `AC-19` |
| `RQ-11` | `STEP-14` | `AC-20` |
| `RQ-12` | `STEP-17` | `AC-21` |
| `RQ-13` | `STEP-13`, `STEP-16`, `STEP-18` | `AC-22` |
| `RQ-14` | `STEP-08` | `AC-16` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | A future RLS relaxation (e.g. someone adds a HR_STAFF INSERT policy on `job_postings`) silently opens the F9 hole if the application layer does not re-check. | The new service-layer guard is the application-level authority. RLS stays as backstop. Mitigation documented in HANDOFF §5 future-proofing. |
| `RISK-02` | The `assertActiveRecruiterForOrder` call in `assertSlotEligibleForNewJobPosting` runs on a non-HR_STAFF path for some test fixture. | Guard `if (ctx.role === 'HR_STAFF')` is explicit. Bypass for ADMIN/HR_MANAGER matches the canonical P1-A0.4 helper bypass. |
| `RISK-03` | The integration suite is env-blocked; if T0 does not authorize the env pair, the runtime ×3 evidence is unverifiable. | `BLK-01` analog to P1-A0.4 R3 is documented in HANDOFF §4. The static unit + component tests still cover the surface. |
| `RISK-04` | The new error code `NO_ACTIVE_ORDER_ASSIGNMENT` is leaked to the client in a way that reveals the existence of the foreign order. | Error envelope is constrained to `{ error: 'NO_ACTIVE_ORDER_ASSIGNMENT', message: <CANONICAL_SAFE_TEXT_NO_IDS> }`. Unit test asserts no slotId, no staffingOrderId, no projectId, no assigneeUserId, no JobPosting.id in the envelope. |
| `RISK-05` | The new SQL fragment `eligibleSlotForRecruiterPredicateSql` drifts from the `hrp_staffing_order_visible_for` predicate. | Fragment mirrors the helper's HR_STAFF branch exactly (`status = 'ACTIVE'`, `recruiter_user_id = $actorId`). Static guard test asserts the predicate's text contains the expected substrings. |
| `RISK-06` | The UI banner copy leaks the existence of the scoped-recruiter system to operators. | Banner is generic ("Bạn chỉ thấy các slot thuộc StaffingOrder bạn được phân công làm recruiter."). No order code, no assignee name. |
| `RISK-07` | Idempotency replay observes a different authority posture than the original. | Guard runs INSIDE `withIdempotency` body, so a replay re-checks authority. The 403 reply is itself idempotent (no side effect, no idempotency-key commit because the throw bubbles up). |
| `RISK-08` | A future schema change to `StaffingOrderRecruiterAssignment` (e.g. column rename) breaks the new guard silently. | Static guard + integration test reference the canonical column names; HANDOFF §5 documents the dependency. |
| `RISK-09` | The `JobPosting` route envelope breaks for ADMIN / HR_MANAGER because the new guard's bypass path is wrong. | The bypass reuses the canonical P1-A0.4 helper's existing bypass; targeted regression on `tests/db/job-posting-authoring.integration.test.ts` (HR_MANAGER) and the existing `tests/db/p1a04-canonical-flow.integration.test.ts` (HR_MANAGER full chain). |

## 8. Open Questions

- None.

All questions resolved by T0 disposition on F9 (Phase D = `q-f9-proceed`). No further Owner decision required to begin implementation.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 | Tier 1 (T1A) authored contract v1.0 with `Status = READY_FOR_EXECUTION`, `Contract gate = READY_TO_CODE`, `Decision state = CLOSED`. | Reproduction-first verdict from Phase B = `PARTIAL_CONFIRMED` (RLS gates leak; service-layer dual-boundary guard absent per binding decision §D.1+§D.2). T0 disposition = proceed with Phase D correction. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-03 | Initial contract; baseline `6015361b`; Assurance lane `CRITICAL`; Audit mode `LIGHT`; Status `READY_FOR_EXECUTION`; Contract gate `READY_TO_CODE`; Decision state `CLOSED`; Correction budget `1`; 22 AC mapped 1:1 to Owner brief §B.3..§B.6 + §F.6; scope bounded to JobPosting authoring + read surface only; no schema/migration/package change. | T0 → T1A: F9 HR_STAFF JobPosting assignment scoping (CRITICAL, V2_FAST_FREEZE, correction budget 1). |

— Tier 1 (T1A), 2026-10-03
