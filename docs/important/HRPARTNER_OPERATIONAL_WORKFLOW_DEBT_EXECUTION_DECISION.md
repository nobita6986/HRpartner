# HRPartner — Operational Workflow Debt Execution Decision

| Field | Value |
| --- | --- |
| Authority | Owner / Tier 0 |
| Status | BINDING |
| Effective date | 2026-10-03 |
| Effective main baseline | `f6100c39f2012a018596d10b888dc312135f8aac` (post PR #86) |
| Source audit | PR #85 / corrected audit HEAD `3955c57bcc5de0b397c77d465d761af8ea6ef201` |
| Applies to | T1A, T1B, T1C, Tier 3 and future implementation tasks |
| Supersedes | Non-binding rollout suggestions that conflict with this decision |

> Document status: BINDING EXECUTION DECISION (Owner / Tier 0)
> Conflict rule: this decision is binding for execution order and authority; source code and canonical V7 / V8 / HRP_EXECUTION_REALIGNMENT_PLAN authority still decide **runtime behavior** until an implementation is merged.

## C. Authority statement

This document is binding on:

1. The execution **priority order** (Priority 0 → Priority 3).
2. The **business boundary** for each priority (what is and is not in scope).
3. The **authorization decision** for HR_STAFF JobPosting scoping (F9).
4. The **deferred / not-authorized** work (F4/F13, F10, F12, F14).
5. The **audit requirement** (Tier 3 LIGHT on CRITICAL authorization work; correction batch discipline; resolution-state discipline).

This document does NOT, by itself, change any runtime contract. Source code, the canonical V7/V8/HRP_EXECUTION_REALIGNMENT_PLAN authority documents, and the live Prisma schema continue to determine runtime behavior until implementation lands. The decision only constrains Tier 1 / Tier 3 actions in the execution round that follows.

Tier 1 MUST NOT:

- Collapse all debt into a single mega-batch / mega-refactor.
- Introduce a new lifecycle command on its own initiative (`cancelJobOpening`, `restoreArchivedJobPosting`, `reopen FILLED/CANCELLED`, rollback `EFFECTIVE`, compensation flow, exception intake).
- Enable a module that is `DEFERRED` (Tickets / Attendance / Reconciliation / Payroll / Commission policies / Commission ledger).
- Weaken auth / RLS to make a UI pass.
- Re-order priorities without explicit Tier 0 sign-off.

Tier 3 MUST NOT:

- Audit work that is not CRITICAL authorization or designated `LIGHT` by Tier 0.
- Re-open surface that has not changed since the previous audit round.

## D. Binding priority order

The execution MUST proceed in the following order. PRIORITY 0 blocks PRIORITY 1. PRIORITY 1 blocks PRIORITY 2. PRIORITY 2 blocks PRIORITY 3.

### Priority 0 — Production verification of PR #86

- **State**: `EXECUTE_NOW`
- **Owner check on production** (post-PR-#86 main `f6100c39`):
  - A JobPosting whose linked JobOpening is `DRAFT` shows a `Publish chưa blocked` banner with a recovery CTA to `/admin/job-openings/[id]`.
  - The Publish action is `disabled`.
  - The `blockedReason` text matches the server-derived reason (Vietnamese).
  - The `/admin/job-openings/[id]` page shows the `Classify` / `Mở JobOpening` action (or a `blockedReason` if HR_STAFF is unassigned).
  - When the linked JobOpening reaches `OPEN`, the Publish action becomes `enabled`.
- **Decision**:
  - If any item fails → T1A correction retains absolute priority. The audit correction shall reopen and add a regression test for the failing case.
  - If all items pass → mark F1 and F5 as `RESOLVED` against `f6100c39` (see audit `§19.1`) and proceed to Priority 1.
- **No new feature may be opened** while the production core JobPosting publish flow is failing.

### Priority 1 — F9 HR_STAFF JobPosting assignment scoping

- **State**: `EXECUTE_NOW_AFTER_P0_PASS`
- **Binding business rule** (already closed by T0/Owner, 2026-10-03):
  - `HR_STAFF` is a scoped recruiter. `HR_STAFF` is permitted to view / select / create a JobPosting **only** for a `StaffingOrder` for which the same `HR_STAFF` has an active `StaffingOrderRecruiterAssignment`.
  - There is NO "accept asymmetry" option. The previous undecided-scoped-gate stance is closed.
- **Execution contract** (T1A):
  1. Reproduce against a synthetic DB (read-only synthetic session, no production DB).
  2. The reproduction MUST exercise each of:
     - `eligibleSlots` selector predicate (current shape).
     - `CreateJobPostingForm` data the UI submits.
     - `POST /api/admin/jobs/job-postings` create route.
     - Domain service / write path (`assertSlotEligibleForNewJobPosting` family and surrounding scope checks).
     - Revoked `StaffingOrderRecruiterAssignment` (was active, now revoked).
     - Assignment belonging to another recruiter (`recruiterId !== caller.id`).
  3. **If reproduction does NOT confirm**: close F9 by evidence in `§19`-style post-baseline note; no code change.
  4. **If reproduction confirms**:
     - Task lane: `CRITICAL`.
     - Enforcement MUST be at **the selector and the server write path** (both). Client filtering alone is insufficient.
     - `ADMIN` and `HR_MANAGER` behaviour remains unchanged.
     - Fail-closed stable error code (server-side).
     - Synthetic integration tests × 3 (assigned HR_STAFF, revoked HR_STAFF, other-recruiter HR_STAFF).
     - Tier 3 `LIGHT` audit is **mandatory** before merge.
     - No production DB writes during reproduction.
- **Completion criteria** (when promoted to confirmed):
  - Assigned HR_STAFF → allowed (selector visible, server accepted).
  - Unassigned / revoked / other-recruiter HR_STAFF → hidden at the selector AND rejected at the server with a stable fail-closed error code.
  - `ADMIN` / `HR_MANAGER` behaviour unchanged.
  - No PII leak (test matrix must include a no-PII assertion).
  - Zero residue in the corrected path; zero regression in the existing test suite.

### Priority 2 — Navigation and recovery batch

- **State**: `AUTHORIZED_NEXT` (Owner gates the actual TASK hand-off until Priority 1 disposition is recorded).
- **Candidate findings**:
  - F2 / F3 — Add sidebar entry for LaborProfile list + intake.
  - F7 — Link `openingStaffingOrderCode` / `openingStatus` on `/admin/jobs/job-postings` to `/admin/job-openings/[jobOpeningId]`.
  - F8 — Map canonical error codes (`JOB_OPENING_NOT_OPEN`, `INVALID_STATE_TRANSITION`, `INVALID_REVISION`, `IDEMPOTENCY_CONFLICT`) to a localized, recovery-oriented message; only IF PR #86 did not already cover the surface.
  - F11 — Rename project-level publish to "Công bố dự án" / "Bỏ công bố dự án" and keep "Publish" only for the JobPosting editor; small footer glossary in the JobPosting editor.
- **Boundary**:
  - UI / navigation only.
  - Domain lifecycle unchanged.
  - Auth / RLS unchanged.
  - Server precondition unchanged.
  - Re-baseline each finding against `f6100c39` (post-PR-#86) before any source change. Resolved findings MUST NOT be re-implemented.
  - Findings already in `RESOLVED` (F1, F5) MUST NOT be re-opened.
- **Lane**: `STANDARD`, audit default `NONE`.
- **Acceptance criteria**:
  - Every important linked entity has a canonical navigation.
  - No raw developer / DB message reaches the operator.
  - Terminology does not create ambiguity between "Công bố dự án" and "Publish tin".
  - Role visibility unchanged.
  - Unit / component / build gates PASS.

### Priority 3 — Placement unavailable reason (F6)

- **State**: `AUTHORIZED_AFTER_PRIORITY_2`
- **Finding**: F6.
- **Outcome contract**:
  - `placement.read-service` produces a structured `placementUnavailableReason` (e.g. terminal state / no assignment / no authority / no valid action).
  - UI does not display a silent `—` for unavailable actions.
  - Distinguishes terminal state, no assignment, no authority, and no valid action.
  - The client MUST NOT infer authority on its own.
- **Boundary**:
  - DTO / read-model + presentation only.
  - No change to Placement lifecycle.
  - No rollback path introduced.
  - No loosening of recruiter authority.
- **Lane**: `STANDARD`; promote to `CRITICAL` only if a side-effect requires touching auth / RLS.

## E. Deferred decisions

### E.1 F4 / F13 — Development modules

- **State**: `DEFERRED / NOT_AUTHORIZED_FOR_GO_LIVE`
- **Applies to**: Tickets, Attendance, Reconciliation, Payroll, Commission policies, Commission ledger.
- **Binding decision**:
  - Having source / API / page is NOT equivalent to production-ready.
  - Keep under "Đang phát triển".
  - Do NOT move to a live-operational navigation slot.
  - Do NOT advertise as operational.
  - Do NOT enable mutation just because a page renders.
  - Each module requires its own Owner acceptance before enablement.
  - A future task MAY normalize a `releaseState: 'LIVE' | 'PREVIEW' | 'DEFERRED'` metadata field on the nav config; this metadata is allowed but is NOT implemented by any batch in the current execution round.

### E.2 F10 — Lifecycle additions

- **State**: `DEFERRED / NOT_AUTHORIZED`
- **The following are NOT authorized from this decision**:
  - `cancelJobOpening` command.
  - `restoreArchivedJobPosting` command.
  - Re-opening `FILLED` / `CANCELLED` JobOpenings.
  - Rolling back `Placement EFFECTIVE`.
  - A compensation / restore flow.
- **Each capability, if it ever becomes a real requirement, MUST have its own business requirement document and its own contract.**

### E.3 F12 — Open override / exception intake

- **State**: `CLOSED — NO ISSUE`
- The audit `§14` (moved from `§8.12`) records the closing rationale:
  - There is no "Open anyway" affordance and there MUST NOT be one.
  - `ADMIN` MUST NOT bypass domain invariants simply because they are ADMIN.
  - `blockedReason` + fail-closed is the correct behaviour.
- The audit does NOT propose a V7 exception-intake intake for `openJobOpening`. None is opened from this decision.

### E.4 F14 — Recruiter Workbench case deep-link

- **State**: `DEFERRED P3`
- **Open only when** a runtime / user evidence shows that losing the originating `PlacementCase` context is actively blocking a workflow.
- Until that evidence lands, F14 stays `OPEN` against `f6100c39` but is NOT authorized for implementation in the current execution round.

## F. Mandatory implementation pattern

Every correction batch MUST follow the chain:

```
Server authority
  → capability / canPerformAction
  → stable blockedReasonCode
  → localized blockedReasonText
  → recoveryHref / nextAction
  → enabled or disabled UI action
```

Rules:

- Server is the authority for permission and lifecycle.
- DTO transports capability and reason (structured, NOT raw developer message).
- UI MUST NOT infer permission on its own.
- Actions MUST NOT silently disappear.
- Actions MUST NOT be enabled when the client already knows the server will reject.
- Linked entities MUST have a recovery navigation.
- Error codes MUST be mapped to a localized message; raw developer / DB messages MUST NOT be echoed.
- Each correction MUST add both a happy-path regression test and a blocked-path regression test.

## G. WIP and agent ownership

Binding ownership:

- **T1A**: JobPosting / domain correction and the F9 reproduction / scope enforcement.
- **T1B**: bounded navigation / recovery UI batch (Priority 2).
- **T1C**: ledger reconciliation, cross-domain review, and decision-integrity tracking. NO source changes from T1C in the current execution round (this audit is docs-only).
- **Tier 3**: audit `LIGHT` is required for CRITICAL authorization work (Priority 1 confirmed) or any task explicitly designated `LIGHT` by Tier 0.

WIP:

- Maximum one implementation in the JobPosting / auth lane at any time.
- Maximum one independent UI batch when file ownership does NOT overlap.
- Two agents MUST NOT edit the same sidebar / editor / service file simultaneously.
- One coordinator owns integration and final gates.

## H. Stop conditions

Tier 1 MUST stop and report Tier 0 if ANY of the following is true:

- A schema / migration change is required.
- An auth / RLS loosening is required.
- Production DB access is required.
- F9 is found to have a blast radius beyond the JobPosting create / publish path.
- A new lifecycle command becomes required.
- A finding collides with production behaviour and the boundary record no longer fits.
- A correction exceeds the recorded boundary.
- A task risks making a `DEFERRED` module appear as `LIVE`.

In all of the above, Tier 1 MUST escalate to Tier 0 before continuing.

## J. Completion definition

The current debt-program round is COMPLETE only when ALL of the following are true:

1. PR #86 production verification PASS (Priority 0).
2. F9 is reproduced and either resolved (with closure evidence) or closed-no-issue by evidence.
4. Navigation / recovery batch PASSes and merges (Priority 2) — OR Owner defers the batch with a written reason.
5. Placement unavailable-reason batch PASSes and merges (Priority 3) — OR Owner defers the batch with a written reason.
6. Audit ledger (`docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_AUDIT.md`) carries a current status per finding: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `DEFERRED`, or `CLOSED_NO_ISSUE`.
7. No `P1 CONFIRMED` finding remains without an owner or disposition.
8. No schema / auth regression introduced.
9. Production smoke PASS after each release.

## J.0 Cross-document consistency (with the audit)

| Audit finding | Disposition in this decision |
| --- | --- |
| F1 | `RESOLVED` by PR #86 against `f6100c39` (audit `§19.1`) |
| F2 / F3 | Priority 2 — bounded navigation (sidebar entry for LaborProfile) |
| F4 / F13 | `DEFERRED / NOT_AUTHORIZED_FOR_GO_LIVE` (audit `§19.3`, `E.1` here) |
| F5 | `RESOLVED` by PR #86 against `f6100c39` (audit `§19.1`) |
| F6 | Priority 3 — DTO + presentation only |
| F7 | Priority 2 — link the staffing-order / opening code in the All Jobs list |
| F8 | Priority 2 — only if PR #86 did not already cover the surface (audit `§19.2` confirms it did NOT) |
| F9 | Priority 1 — CRITICAL authorization, reproduce first |
| F10a / F10b / terminal states | `DEFERRED / NOT_AUTHORIZED` (`E.3`) |
| F11 | Priority 2 — terminology rename |
| F12 | `CLOSED — NO ISSUE` (`E.3`); moved to audit `§14` |
| F14 | `DEFERRED P3` (`E.4`); open only with runtime / user evidence |

## K. Verification and handoff

Every forward-only commit on PR #85 in this round MUST satisfy:

- `git diff --check` PASS.
- Strict UTF-8 no-BOM (`verify-encoding.mjs` PASS).
- LF-only (no `\r` in changed surface).
- Zero `U+FFFD` / mojibake in changed surface.
- Secret / PII scan PASS.
- Relative-link validation PASS (paths resolve inside the repo).
- SHA / PR references cross-checked.
- Status / priority consistency between the audit document and this decision document.
- CI 4/4 PASS (Quality / Integration / Vercel preview / Vercel Preview Comments).

PR #85 changed-surface in this directive MUST contain exactly two files:

1. `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_AUDIT.md`
2. `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md`

No source / test / schema / migration / package / CI / deploy / production-config changes.

## 1. Stop before merge

Tier 1 MUST stop before merge. No implementation of findings from this round. No hand-off to another agent. No deployment. The execution decision is the binding contract; implementation starts in a follow-up round after Owner signs off on Priority 0 production verification.