# HRP V7.5 — WORKFORCE OPERATIONS IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V7.5  
**Prerequisite:** V7.4 Exit Gate PASS  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` is mandatory  
**Primary bounded context:** Workforce Operations  
**Primary aggregates:** `Worker`, `EmploymentEpisode`, `ProjectAssignment`

---

# 0. PURPOSE

V7.5 establishes the operational lifecycle of HRP-managed workers after a `Placement` becomes EFFECTIVE.

The Workforce layer must answer:

```text
Is this LaborProfile already a Worker?
Is the Worker currently active with HRP?
Which EmploymentEpisode is active?
Which PRIMARY Assignment is active?
Where is the Worker currently assigned?
When did they start?
When did they leave?
Was the movement a transfer or a real exit?
If they return later, is this a rehire or a new person?
```

V7.5 must preserve the core distinction:

```text
LaborProfile != Worker
Worker != EmploymentEpisode
EmploymentEpisode != ProjectAssignment
Placement != ProjectAssignment
```

---

# 1. NON-NEGOTIABLE DOMAIN INVARIANTS

1. A `LaborProfile` has at most one `Worker`.
2. A `Worker` is long-lived across rehire.
3. A new HRP-managed employment period creates a new `EmploymentEpisode`.
4. Rehire does not create a second `Worker`.
5. A transfer during continuous HRP workforce remains within the same `EmploymentEpisode`.
6. `ProjectAssignment` represents real operational placement/worksite/job context.
7. A Worker has at most one active PRIMARY Assignment.
8. `SECONDARY` Assignment capacity may be reserved for the future, but is not part of V7.5 MVP behavior.
9. `PLANNED` Assignment must not imply active workforce.
10. No-show before actual start must not create a first-time Worker/Episode.
11. Ending an Assignment does not always mean ending the EmploymentEpisode.
12. Ending an EmploymentEpisode means the Worker has left the HRP-managed workforce.
13. Current workforce status is derived from canonical Episode/Assignment facts, not manually edited booleans.
14. Historical effective dates must not be overwritten silently.
15. Transfer, termination, correction, and rehire use explicit commands.
16. No hard delete for normal workforce lifecycle records.
17. Payroll is OUT OF SCOPE.

---

# 2. V7.5 SCOPE

V7.5 includes:

```text
Worker 360
EmploymentEpisode lifecycle
ProjectAssignment lifecycle
PRIMARY Assignment invariant
start / end Assignment
transfer
end workforce / termination
rehire
current workforce projections
movement history
effectiveAt / recordedAt discipline
workforce search/filter
manager operational views
security/RLS/audit
```

V7.5 does NOT include:

```text
payroll calculations                 -> OUT OF SCOPE
commission calculations              -> OUT OF SCOPE
internal HRM                          -> OUT OF SCOPE
attendance deep redesign              -> DEFERRED unless already integrated
advanced scheduling/shift roster      -> DEFERRED
multi-active SECONDARY assignments    -> DEFERRED
```

---

# 3. DELIVERY SLICES

```text
V7.5a — Worker + EmploymentEpisode foundation
V7.5b — Assignment lifecycle
V7.5c — Transfer
V7.5d — Exit / termination
V7.5e — Rehire
V7.5f — Workforce projections + Worker 360
V7.5g — Corrections / audit / hardening
```

---

# 4. V7.5a — WORKER + EMPLOYMENTEPISODE FOUNDATION

## V75-001 — Worker uniqueness contract

**Type:** Domain/DB invariant  
**Priority:** BLOCKER

Enforce:

```text
one Worker per LaborProfile
```

Preferred DB protection:

```text
UNIQUE(worker.laborProfileId)
```

Service code must still handle concurrency/idempotency.

---

## V75-002 — Worker creation policy

**Type:** Domain policy  
**Priority:** BLOCKER

Worker creation is allowed only when HRP begins managing actual workforce for the LaborProfile.

Do NOT create Worker when:

```text
Application submitted
JobProposal accepted
Placement SELECTED
Placement CONFIRMED
planned start date reached
CLIENT_MANAGED Placement becomes EFFECTIVE
```

Worker is created/reused through HRP-managed actual-start orchestration.

---

## V75-003 — EmploymentEpisode schema finalization

**Type:** Schema  
**Priority:** BLOCKER

Conceptual:

```text
id
workerId

status

startedAt
endedAt?

startReason?
endReason?

sourcePlacementId?
startedByUserId?
endedByUserId?

recordedAt
createdAt
updatedAt
version
```

Recommended canonical status:

```text
ACTIVE
ENDED
VOIDED
```

Do not create large state machines unless needed.

---

## V75-004 — EmploymentEpisode start command

**Type:** Domain command  
**Dependency:** V75-001 + V75-003  
**Priority:** BLOCKER

Conceptual:

```text
startEmploymentEpisode()
```

Normally invoked by V7.4 `startHRPManagedPlacement()`.

Preconditions:

```text
Worker exists/reused
no active EmploymentEpisode
actual workforce start confirmed
```

Effects:

```text
create ACTIVE EmploymentEpisode
audit
event/outbox
```

---

## V75-005 — One active EmploymentEpisode invariant

**Type:** DB/service invariant  
**Priority:** BLOCKER

At most one ACTIVE EmploymentEpisode per Worker.

Must be concurrency-safe.

---

# 5. V7.5b — PROJECTASSIGNMENT LIFECYCLE

## V75-010 — Assignment schema finalization

**Type:** Schema  
**Priority:** BLOCKER

Conceptual:

```text
id
workerId
employmentEpisodeId
placementId?

clientCompanyId
projectId
jobOpeningId?

assignmentRole
status

plannedStartAt?
startedAt?
endedAt?

endReason?

createdByUserId
endedByUserId?

effectiveAt?
recordedAt
createdAt
updatedAt
version
```

Recommended `assignmentRole`:

```text
PRIMARY
SECONDARY
```

V7.5 operational behavior supports `PRIMARY` only unless architecture explicitly extends it.

Recommended status:

```text
PLANNED
ACTIVE
ENDED
CANCELLED
VOIDED
```

---

## V75-011 — One active PRIMARY Assignment invariant

**Type:** DB/service invariant  
**Priority:** BLOCKER

Enforce:

```text
max 1 ACTIVE PRIMARY Assignment / Worker
```

Prefer DB-level partial uniqueness where PostgreSQL supports the required predicate.

Service-level pre-check alone is insufficient.

---

## V75-012 — startAssignment command

**Type:** Domain command  
**Priority:** BLOCKER

Inputs:

```text
workerId
employmentEpisodeId
placementId?
projectId
jobOpeningId?
startedAt
actor/source
```

Preconditions:

```text
Episode ACTIVE
no conflicting ACTIVE PRIMARY Assignment
project/job context valid
```

Effects:

```text
create/activate PRIMARY Assignment
audit
event/outbox
```

No generic `status=ACTIVE` patch.

---

## V75-013 — cancelPlannedAssignment command

**Type:** Domain command  
**Priority:** HIGH

Use for no-show or cancelled start before actual assignment begins.

Effects:

```text
PLANNED -> CANCELLED
```

Must not create an EmploymentEpisode merely because a planned Assignment existed.

---

## V75-014 — endAssignment command

**Type:** Domain command  
**Priority:** BLOCKER

Inputs:

```text
assignmentId
endedAt
endReason
actor/source
note/evidence where required
```

Effects:

```text
ACTIVE -> ENDED
```

Must NOT automatically end EmploymentEpisode unless the business command is specifically "leave HRP workforce".

---

# 6. ASSIGNMENT END REASONS

## V75-020 — Central end-reason catalog

**Type:** Domain catalog  
**Priority:** HIGH

Initial suggestions:

```text
TRANSFERRED
RESIGNED
TERMINATED
PROJECT_ENDED
CLIENT_REQUEST
NO_SHOW
JOB_ABANDONMENT
CONTRACT_ENDED
MUTUAL_AGREEMENT
OTHER
```

Exact final vocabulary can be extended centrally.

No hardcoded labels/logic in UI components.

---

# 7. V7.5c — TRANSFER

## V75-030 — Transfer semantic contract

**Type:** Domain contract  
**Priority:** BLOCKER

A transfer means:

```text
same Worker
same active EmploymentEpisode
end old PRIMARY Assignment
start new PRIMARY Assignment
```

It does NOT mean:

```text
new Worker
new EmploymentEpisode
```

unless there is a true workforce exit between assignments.

---

## V75-031 — transferWorker command

**Type:** Critical domain command  
**Priority:** BLOCKER

Inputs:

```text
workerId
fromAssignmentId
toProjectId
toJobOpeningId?
effectiveAt
sourcePlacementId?
reason
actor/source
idempotencyKey
```

Transactional effects:

```text
validate active Worker/Episode
validate fromAssignment active PRIMARY
end old Assignment with TRANSFERRED
start new PRIMARY Assignment
preserve same EmploymentEpisode
audit/correlation
emit assignment transfer events
```

---

## V75-032 — Transfer with PlacementCase integration

**Type:** Cross-context policy  
**Priority:** HIGH

Two valid scenarios:

```text
BUSINESS REASSIGNMENT
Worker needs another job
→ may use PlacementCase + Placement
→ transfer to new Assignment

TECHNICAL/ADMIN CORRECTION
wrong project/job recorded
→ correction/transfer command
→ no fake PlacementCase
```

Do not force every operational correction through recruiting pipeline.

---

## V75-033 — Transfer overlap protection

**Type:** Invariant  
**Priority:** BLOCKER

At effective transfer time:

```text
old PRIMARY assignment ends
new PRIMARY assignment starts
```

No unintended double-active interval.

Backdated transfers require explicit effective-time handling and audit.

---

# 8. V7.5d — EXIT / TERMINATION

## V75-040 — End workforce semantic contract

**Type:** Domain contract  
**Priority:** BLOCKER

Leaving HRP-managed workforce means:

```text
end active PRIMARY Assignment
end active EmploymentEpisode
```

This is distinct from transfer.

---

## V75-041 — endEmploymentEpisode command

**Type:** Domain command  
**Priority:** BLOCKER

Preconditions:

```text
active Episode exists
active Assignment state reconciled
```

Effects:

```text
end Assignment if commanded as part of workforce exit
end Episode
audit
emit workforce-ended events
```

---

## V75-042 — leaveWorkforce orchestration command

**Type:** Application command  
**Priority:** BLOCKER

Preferred orchestration:

```text
leaveWorkforce()
```

Inputs:

```text
workerId
effectiveAt
assignmentEndReason
episodeEndReason
actor/source
notes/evidence?
```

Effects atomically:

```text
end active PRIMARY Assignment
end EmploymentEpisode
```

Do not require frontend to call two independent mutations.

---

## V75-043 — No auto-reactivation on exit

**Type:** Business rule  
**Priority:** HIGH

When Worker leaves:

```text
do NOT automatically mark AVAILABLE_NOW
do NOT automatically open PlacementCase
do NOT automatically claim handler
```

Possible future workflow:

```text
schedule outreach
→ contact Worker
→ confirm intent
→ record Availability
→ open new PlacementCase
```

---

# 9. V7.5e — REHIRE

## V75-050 — Rehire semantic contract

**Type:** Domain contract  
**Priority:** BLOCKER

A returning former HRP worker:

```text
same LaborProfile
same Worker
new PlacementCase
new Placement
new EmploymentEpisode
new ProjectAssignment
```

No second Worker.

---

## V75-051 — rehire through Placement EFFECTIVE

**Type:** Cross-context orchestration  
**Priority:** BLOCKER

V7.4 HRP-managed actual start must:

```text
find existing Worker
if prior Episode ended:
  create new Episode
start new PRIMARY Assignment
```

The Worker record is reused.

---

## V75-052 — Rehire gap correctness

**Type:** Regression/invariant  
**Priority:** HIGH

Do not infer rehire solely from date gaps.

Use explicit Episode boundary facts.

A Worker may transfer after a long operational gap without ending Episode only if business command/history explicitly supports it; default workflows should close Episode for true workforce exit.

---

# 10. V7.5f — WORKFORCE PROJECTIONS + WORKER 360

## V75-060 — Current workforce projection

**Type:** Read projection  
**Priority:** BLOCKER

Expose:

```text
workerId
laborProfileId
isCurrentlyHRPManaged
activeEmploymentEpisodeId?
activeAssignmentId?
currentClientCompanyId?
currentProjectId?
currentJobOpeningId?
startedAt?
assignmentStartedAt?
```

Derived from canonical active records.

Do not persist duplicate "current project" authority unless it is explicitly a rebuildable projection.

---

## V75-061 — Worker relationship integration

**Type:** Cross-context projection  
**Priority:** BLOCKER

V7.1 `CurrentRelationship` consumes Workforce facts:

```text
active Episode/Assignment
=> WORKING_VIA_HRP

Worker exists with no active Episode
=> FORMER_HRP_WORKER
```

No UI-local inference.

---

## V75-062 — Worker 360 read model

**Type:** Query/read DTO  
**Priority:** BLOCKER

Sections:

```text
LaborProfile summary
Worker identity
current workforce status
active Episode
active Assignment
employment episodes
assignment history
placement origin/history
movement timeline
```

Do not expose payroll data.

---

## V75-063 — Worker search/filter

**Type:** Query service  
**Priority:** HIGH

Filters:

```text
current client
current project
current job
active/former
episode start range
assignment start range
assignment end reason
source Placement
```

---

## V75-064 — Workforce operational dashboard

**Type:** Query/UI  
**Priority:** HIGH

Metrics:

```text
active HRP-managed Workers
starts today/this week
exits today/this week
transfers
workers without valid active PRIMARY Assignment
assignment conflicts
```

No payroll totals.

---

# 11. V7.5g — CORRECTIONS / HISTORY / AUDIT

## V75-070 — Workforce correction commands

**Type:** Critical commands  
**Priority:** BLOCKER

Do not allow generic edits after historical records affect business reporting.

Examples:

```text
correctAssignmentStart()
correctAssignmentEnd()
correctEmploymentEpisodeBoundary()
voidAssignment()
```

Require:

```text
permission
reason
effective correction time
audit
correlation
```

---

## V75-071 — effectiveAt vs recordedAt

**Type:** Cross-cutting invariant  
**Priority:** BLOCKER

For movement events:

```text
effectiveAt
= when the business event actually happened

recordedAt
= when HRP recorded it
```

Example:

```text
worker left on 2026-09-01
manager records on 2026-09-03
```

must preserve both facts.

---

## V75-072 — Workforce timeline projection

**Type:** Read projection  
**Priority:** HIGH

Combine:

```text
Worker created
Episode started
Assignment started
Assignment transferred
Assignment ended
Episode ended
Rehire episode started
Corrections/voids
```

Show actor/source/effective time where available.

---

# 12. SECURITY REQUIREMENTS

Suggested permissions:

```text
workforce.worker.read

workforce.episode.start
workforce.episode.end
workforce.episode.correct

workforce.assignment.start
workforce.assignment.end
workforce.assignment.transfer
workforce.assignment.cancel
workforce.assignment.correct

workforce.dashboard.read
```

Critical history correction permissions should be highly restricted.

---

# 13. CONCURRENCY / IDEMPOTENCY

Permanent protections:

```text
concurrent Worker creation
concurrent Episode start
concurrent PRIMARY Assignment start
duplicate transfer command
duplicate leaveWorkforce command
duplicate rehire actual-start event
```

Expected:

```text
one Worker
one active Episode
one active PRIMARY Assignment
no duplicate movement events
```

---

# 14. PERMANENT REGRESSION FIXTURES

## RF-WF-01 — First HRP-managed start

Expected:

```text
LaborProfile
→ Worker #1
→ Episode #1
→ PRIMARY Assignment #1
```

---

## RF-WF-02 — Transfer Actro → Wisum

Expected:

```text
same Worker
same Episode
Actro ENDED TRANSFERRED
Wisum ACTIVE
```

---

## RF-WF-03 — Workforce exit

Expected:

```text
Assignment ended
Episode ended
CurrentRelationship = FORMER_HRP_WORKER
```

---

## RF-WF-04 — Rehire

Expected:

```text
same LaborProfile
same Worker
Episode #2
new PRIMARY Assignment
```

---

## RF-WF-05 — Direct hire

Expected:

```text
no Worker
no Episode
no Assignment
```

---

## RF-WF-06 — First-time no-show

Expected:

```text
no Worker
no Episode
planned Assignment cancelled if present
```

---

## RF-WF-07 — Existing former Worker no-show on rehire attempt

Expected:

```text
same historical Worker remains
no new Episode
no active Assignment
```

---

## RF-WF-08 — Concurrent actual start

Expected:

```text
one Worker
one Episode
one PRIMARY Assignment
```

---

## RF-WF-09 — Assignment end without Episode end

Expected:

```text
valid only for transfer/reassignment/correction workflow
Episode can remain active
```

---

## RF-WF-10 — Exit does not auto-open PlacementCase

Expected:

```text
former worker state
no active PlacementCase unless explicitly opened later
```

---

## RF-WF-11 — Backdated termination

Expected:

```text
effectiveAt old date
recordedAt current date
history/projections reconcile correctly
```

---

## RF-WF-12 — Historical Placement preserved after transfer

Expected:

```text
old Placement/Assignment history retained
new Assignment context does not overwrite past Placement
```

---

# 15. MAINTAINABILITY / MODULE BOUNDARY REQUIREMENTS

Mandatory under `AI_CODING_GUARDRAILS.md`.

Do NOT create:

```text
workforce-service.ts with all commands
worker-page.tsx with history/query/mutations/business rules
assignment-utils.ts containing unrelated policies
```

Suggested responsibility split:

```text
workforce/
  domain/
    worker-policy.ts
    episode-policy.ts
    assignment-policy.ts
    assignment-end-reasons.ts

  application/
    start-employment-episode.ts
    start-assignment.ts
    transfer-worker.ts
    leave-workforce.ts
    end-assignment.ts
    workforce-corrections.ts

  queries/
    current-workforce-query.ts
    worker-360-query.ts
    workforce-dashboard-query.ts

  infrastructure/
    worker-repository.ts
    employment-episode-repository.ts
    assignment-repository.ts
```

Exact repository folder conventions may differ; responsibility isolation is required.

Centralize:

```text
PRIMARY Assignment invariant
Episode-active logic
movement end-reason policy
current workforce projection
```

Do not duplicate them across API routes and UI.

---

# 16. V7.5 EXIT GATE

## Worker

```text
[ ] one LaborProfile -> max one Worker
[ ] direct hire never creates Worker
[ ] rehire reuses Worker
```

## EmploymentEpisode

```text
[ ] max one active Episode
[ ] transfer keeps same Episode
[ ] real workforce exit ends Episode
[ ] rehire creates new Episode
```

## Assignment

```text
[ ] max one active PRIMARY Assignment
[ ] start/end use commands
[ ] transfer is atomic
[ ] no-show does not create false active workforce
```

## Projections

```text
[ ] current Worker/project/job derived correctly
[ ] CurrentRelationship integrates canonical workforce facts
[ ] active vs historical workforce metrics are distinct
```

## Audit

```text
[ ] effectiveAt and recordedAt preserved
[ ] correction commands require reason
[ ] history not overwritten
```

## Regression

```text
[ ] RF-WF-01 through RF-WF-12 pass
```

---

# 17. HANDOFF TO V7.6

V7.6 owns Supply Partner Network:

```text
SupplyPartner
CTV
Vendor
PartnerMember
Partner Intake
Partner batches
ReferralAttribution operationalization
Partner portal projections
Attribution dispute workflow
```

V7.6 must consume Workforce, Placement, Talent Repository and Handling semantics without redefining them.

---

# 18. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V75-001 through V75-005

Batch B
V75-010 through V75-020

Batch C
V75-030 through V75-033

Batch D
V75-040 through V75-043

Batch E
V75-050 through V75-052

Batch F
V75-060 through V75-064

Batch G
V75-070 through V75-072
Security
Concurrency

Batch H
RF-WF-01 through RF-WF-12
V7.5 EXIT GATE
```

---

# 19. ARCHITECTURAL WARNINGS FOR IMPLEMENTATION AGENTS

Do NOT introduce canonical shortcuts such as:

```text
Worker.currentProjectId
Worker.currentJobId
Worker.isActive
Worker.status = WORKING/LEFT/TRANSFERRED
LaborProfile.isEmployee
```

unless explicitly implemented as rebuildable projections with clear authority.

Do NOT:

```text
create new Worker on rehire
create new Episode on transfer
end Episode automatically on every Assignment end
infer active workforce from Placement CONFIRMED
auto-open PlacementCase when Worker leaves
```

---

# 20. PRODUCT OUTCOME

After V7.5, HRP must be able to distinguish clearly:

```text
Người này từng là Worker HRP hay chưa?
Hiện có đang làm qua HRP không?
Đang làm tại client/project/job nào?
Đây là lần làm việc thứ mấy với HRP?
Đã chuyển từ đâu sang đâu?
Chuyển việc hay thực sự nghỉ HRP?
Nếu quay lại thì có reuse đúng Worker không?
```

without relying on mutable convenience status fields or reconstructing history from overwritten rows.
