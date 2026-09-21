# HRP V8.1 — RECRUITMENT KANBAN IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V8.1  
**Prerequisite:** V8.0 Exit Gate PASS  
**Depends on:** V7 Talent Workbench, Matching, Placement, Workforce; V8.0 Board Foundation  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Visual recruitment operations over canonical V7 facts

---

# 0. PURPOSE

V8.1 delivers a visual Kanban experience for recruitment operations.

It must allow recruiters and managers to:

```text
see pipeline state at a glance
identify bottlenecks
see overdue / SLA risk
drag cards through valid workflow actions
operate by person + PlacementCase context
switch between My / Team / Job / Project boards
monitor confirmed starts and effective placements
```

Kanban is a visual operating layer.

It is NOT a second recruitment lifecycle engine.

---

# 1. NON-NEGOTIABLE INVARIANTS

1. Kanban Card authority = `PlacementCase`.
2. Card displays `LaborProfile`, but does not use LaborProfile as workflow authority.
3. One LaborProfile may appear in different historical PlacementCases over time.
4. Board columns are projections over canonical V7 state.
5. No `kanbanStatus` canonical field.
6. Drag/drop invokes named canonical commands.
7. Invalid transition does not mutate state.
8. Placement/Worker lifecycle remains owned by V7.
9. Company Pool is derived from active PlacementCase + no valid active HandlingAssignment.
10. Overdue is derived, not stored as permanent NextAction state.
11. Current handler is resolved from active HandlingAssignment.
12. Source attribution remains separate from handler.
13. Card counts/metrics are projections only.
14. Large boards must paginate/virtualize; do not load everything.
15. Realtime UI must not weaken concurrency control.
16. UI optimistic updates must reconcile against server authority.

---

# 2. DELIVERY SLICES

```text
V8.1a — Kanban Read Model
V8.1b — Default Recruitment Board
V8.1c — Drag/Drop Command Mapping
V8.1d — Specialized Boards
V8.1e — Card Actions & Inline Operations
V8.1f — Bottleneck / SLA / Metrics
V8.1g — Concurrency / Performance / Hardening
```

---

# 3. V8.1a — KANBAN READ MODEL

## V81-001 — KanbanCardReadModel

**Type:** Query/read DTO  
**Priority:** BLOCKER

Conceptual:

```text
placementCaseId
laborProfileId

displayName
phoneMasked?
ageBand?
location?
availability
currentRelationship

caseStatus
caseStage
caseAge
stageAge

currentHandler
handlingExpiresAt?

lastInteractionAt?
lastInteractionOutcome?

nextActionType?
nextActionDueAt?
nextActionOverdue?

primaryJobContext?
jobProposalState?
applicationState?

placementState?
serviceModel?
startDate?

referralSourceSummary?

warningFlags[]
allowedActionKeys[]
version
```

Card read model must be query/projection-owned.

Frontend must not reconstruct these facts from many raw endpoints.

---

## V81-002 — KanbanBoardReadModel

**Type:** Query/read DTO  
**Priority:** BLOCKER

Conceptual:

```text
boardId
boardType
title
scopeSummary

columns[]
  id
  label
  count
  cards[]
  nextCursor?

filters
sort
generatedAt
```

Support column-level pagination.

---

## V81-003 — Card warning flags

**Type:** Projection catalog  
**Priority:** HIGH

Examples:

```text
OVERDUE_NEXT_ACTION
HANDLING_EXPIRING
NO_RECENT_CONTACT
WAITING_CLIENT_TOO_LONG
READY_TO_START
START_DATE_PASSED
PROFILE_INCOMPLETE
AVAILABILITY_STALE
```

Warnings are advisory projections.

They do not become canonical statuses.

---

## V81-004 — Board query filter contract

**Type:** Query contract  
**Priority:** BLOCKER

Supported filter candidates:

```text
handler
team
JobOpening
Project
ServiceModel
source
availability
location
caseAge
stageAge
nextActionDue
handlingExpiry
```

Filters must be validated/whitelisted.

---

# 4. V8.1b — DEFAULT RECRUITMENT BOARD

## V81-010 — Default board columns

**Type:** BoardDefinition  
**Priority:** BLOCKER

Recommended:

```text
NEW
CONTACTING
QUALIFYING
MATCHING
PROPOSED
CLIENT_PROCESS
CONFIRMED
READY_TO_START
EFFECTIVE
```

User-facing labels may vary by locale/config.

---

## V81-011 — NEW projection

Example condition:

```text
PlacementCase OPEN
stage = NEW
```

May show:

```text
not yet meaningfully contacted
```

Do not infer from createdAt alone if canonical stage exists.

---

## V81-012 — CONTACTING projection

Canonical case stage:

```text
CONTACTING
```

Card should surface:

```text
last call result
next callback
overdue
```

---

## V81-013 — QUALIFYING projection

Canonical case stage:

```text
NEEDS_INFO
or
QUALIFYING
```

User-visible board may combine multiple V7 stages into one UX column if desired.

ColumnDefinition owns display grouping, not new business status.

---

## V81-014 — MATCHING projection

Canonical:

```text
MATCHING
```

Card may show:

```text
preference summary
candidate/job match context
```

---

## V81-015 — PROPOSED projection

Canonical:

```text
PROPOSED
```

May surface active JobProposal(s).

---

## V81-016 — CLIENT_PROCESS projection

Canonical:

```text
CLIENT_PROCESS
```

May include:

```text
waiting interview
waiting approval
waiting client feedback
```

These may initially be sublabels/badges rather than separate canonical columns.

---

## V81-017 — CONFIRMED projection

Placement exists with:

```text
CONFIRMED
```

but not yet effective.

---

## V81-018 — READY_TO_START projection

Placement / case context indicates confirmed start readiness.

The exact canonical query must follow V7 Placement policy.

Do not create a duplicate Placement state solely for Kanban.

---

## V81-019 — EFFECTIVE projection

Canonical Placement:

```text
EFFECTIVE
```

For HRP-managed:

```text
Worker/Episode/Assignment exists as required
```

For client-managed:

```text
no Worker required
```

---

# 5. V8.1c — DRAG/DROP COMMAND MAPPING

## V81-020 — BoardActionRegistry implementation

**Type:** Application/command mapping  
**Priority:** BLOCKER

Maps:

```text
source column
target column
card context
→ action key
→ canonical command
```

Example:

```text
NEW → CONTACTING
→ startContactingPlacementCase()

CONTACTING → QUALIFYING
→ moveCaseToQualifying()

MATCHING → PROPOSED
→ requires existing/new JobProposal workflow

CONFIRMED → EFFECTIVE
→ canonical Placement effective command
```

---

## V81-021 — Command preflight API

**Type:** Application query/action  
**Priority:** HIGH

Before drop commit, server may return:

```text
allowed
blocked
requiresInput
reason
requiredFields
```

Useful for transitions requiring extra data.

---

## V81-022 — Transition requiring modal/input

Examples:

```text
PROPOSED → CLIENT_PROCESS
may require selected JobProposal/Job context

CONFIRMED → READY_TO_START
may require planned start date

READY_TO_START → EFFECTIVE
may require actual start date / evidence
```

Drag can open a small action sheet/modal.

Do not silently fabricate missing data.

---

## V81-023 — Invalid transition handling

Expected UX:

```text
optimistic card move
→ server reject
→ restore card
→ show specific reason
```

No generic “Something went wrong” for known domain blocks.

---

## V81-024 — Idempotent board actions

Repeated drop/retry must not duplicate:

```text
Interaction
JobProposal
Placement
Worker
Assignment
```

Use command idempotency where required.

---

# 6. V8.1d — SPECIALIZED BOARDS

## V81-030 — My Recruitment Board

**Priority:** BLOCKER

Scope:

```text
PlacementCases where current HandlingAssignment = current user
```

Primary daily operational board.

---

## V81-031 — Team Recruitment Board

**Priority:** BLOCKER

Scope:

```text
manager-authorized team handling scope
```

Must not simply query all cases by frontend role.

---

## V81-032 — JobOpening Board

**Priority:** BLOCKER

Scope:

```text
PlacementCases / Applications / Proposals relevant to a JobOpening
```

Needs explicit query semantics so that merely viewing a job does not fabricate an Application.

---

## V81-033 — Project Board

**Priority:** HIGH

Scope:

```text
cases relevant to JobOpenings under Project
```

May aggregate multiple JobOpenings.

---

## V81-034 — Company Pool Board

**Priority:** BLOCKER

Scope:

```text
active PlacementCase
+
no valid active HandlingAssignment
```

Columns may differ from normal recruitment board.

Example:

```text
NEW_POOL
AGING
HIGH_PRIORITY
CLAIMED_RECENTLY
```

These are board buckets/projections, not case lifecycle statuses.

---

## V81-035 — Start Monitoring Board

**Priority:** BLOCKER

Focus:

```text
CONFIRMED
READY_TO_START
START_DATE_TODAY
START_DATE_PASSED
EFFECTIVE
FAILED/NO_SHOW
```

This board is operationally critical.

Its projection must use Placement facts, not mutate case stage independently.

---

# 7. V8.1e — CARD ACTIONS & INLINE OPERATIONS

## V81-040 — Quick contact action

**Type:** UI/application  
**Priority:** HIGH

Allow:

```text
call / open contact action
record InteractionOutcome
create/update NextAction
```

Prefer one compact workflow.

---

## V81-041 — Quick NextAction

Allow:

```text
set callback
mark done
reschedule
```

Card refreshes derived overdue state.

---

## V81-042 — Handling quick actions

Authorized users may:

```text
claim
assign
transfer
release
```

through V7 Handling commands.

---

## V81-043 — Open Case 360

Every card should deep-link to:

```text
PlacementCase 360
```

Kanban is not the only detail screen.

---

## V81-044 — Open LaborProfile 360

Secondary context action.

Do not confuse profile-level and case-level operations.

---

# 8. V8.1f — BOTTLENECK / SLA / METRICS

## V81-050 — Column count

**Type:** Projection  
**Priority:** BLOCKER

Counts should remain consistent with board query filters.

---

## V81-051 — Stage aging

Calculate:

```text
time since canonical stage entered
```

Requires reliable stage transition timestamps/history from V7.

If not available, document limitation rather than inventing fake precision.

---

## V81-052 — Bottleneck indicator

Possible board-level metrics:

```text
largest column
oldest stage age
highest overdue ratio
highest untouched count
```

These are advisory.

---

## V81-053 — SLA indicator

Examples:

```text
CONTACT_OVERDUE
NEXT_ACTION_OVERDUE
HANDLING_EXPIRING
CLIENT_WAITING_TOO_LONG
START_CONFIRMATION_OVERDUE
```

Thresholds must live in centralized policy/config.

Not hardcoded in React.

---

## V81-054 — Board summary header

Potential:

```text
Total active
Due today
Overdue
Handling expiring
Waiting client
Ready to start
```

---

# 9. V8.1g — CONCURRENCY / PERFORMANCE / HARDENING

## V81-060 — Card version/concurrency token

**Type:** Concurrency contract  
**Priority:** BLOCKER

Each card/action request should carry enough version/context to detect stale actions.

If another user changed the case:

```text
reject stale mutation
refresh card
show latest state
```

---

## V81-061 — Concurrent claim protection

Company Pool:

```text
two recruiters claim same case
→ one wins
→ other receives deterministic conflict
```

DB/domain constraint remains authority.

---

## V81-062 — Column pagination

**Priority:** BLOCKER

Each column loads:

```text
initial limited cards
count
next cursor
```

Large columns must not load all records.

---

## V81-063 — Virtualization

**Priority:** HIGH

Use for large visible columns where needed.

---

## V81-064 — Optimistic UI reconciliation

Optimistic moves should reconcile with server response.

Server may return:

```text
updated card
new column
warnings
side effects summary
```

---

## V81-065 — Incremental refresh

Board should refresh changed cards/columns without full-page reload where practical.

---

# 10. SEARCH / FILTER / SAVED VIEWS

## V81-070 — Board search

Search by safe supported fields:

```text
name
phone normalized where permission allows
profile code
case code
job
```

---

## V81-071 — Board filter panel

Initial filters:

```text
handler
job
project
source
availability
location
overdue
handling expiry
case age
```

---

## V81-072 — Saved board views

Uses V8.0 `SavedView`.

Examples:

```text
My overdue
Samsung morning shift
Bắc Ninh available now
Starts this week
```

Saved view config cannot bypass scope.

---

# 11. SECURITY REQUIREMENTS

Suggested permissions:

```text
kanban.read.self
kanban.read.team
kanban.read.job
kanban.read.project
kanban.read.pool
kanban.read.start_monitoring

talent.case.transition
talent.case.claim
talent.case.transfer
placement.confirm
placement.effective
```

Navigation/action visibility does not replace backend enforcement.

---

# 12. AUDIT REQUIREMENTS

Kanban drag itself is UX.

Audit the canonical command, including:

```text
actor
effectiveAt
recordedAt
source = KANBAN
from projection
to requested projection
command executed
reason/input where required
correlationId
```

Do not create duplicate audit streams for the same domain transition.

---

# 13. PERMANENT REGRESSION FIXTURES

## RF-V81-01 — One person, two historical cases

Expected:

```text
two PlacementCases
separate historical cards
no profile-level status collapse
```

---

## RF-V81-02 — Invalid drag

Expected:

```text
server rejects
card restored
canonical state unchanged
```

---

## RF-V81-03 — READY_TO_START → EFFECTIVE HRP-managed

Expected:

```text
canonical Placement command
Worker reused/created correctly
Episode/Assignment created as V7 requires
```

---

## RF-V81-04 — CLIENT_MANAGED effective

Expected:

```text
Placement EFFECTIVE
no Worker
```

---

## RF-V81-05 — Company Pool concurrent claim

Expected one winner.

---

## RF-V81-06 — Handler transfer

Card moves scope between users after canonical Handling transfer.

Source attribution unchanged.

---

## RF-V81-07 — Overdue NextAction

Card warning changes from time/query projection; no stored OVERDUE status required.

---

## RF-V81-08 — JobOpening board

Recruiter suggestion alone does not create fake Application.

---

## RF-V81-09 — Large board

Column pagination works without loading all cases.

---

## RF-V81-10 — Stale card

Old version mutation rejected/refreshed.

---

## RF-V81-11 — Manager team scope

Cannot access cases outside authorized team scope.

---

## RF-V81-12 — Board label change

Changing UX label does not alter canonical stage/state.

---

# 14. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
kanban-page.tsx with all boards/actions/modals
kanban-service.ts with queries + commands + permissions
kanban-utils.ts with domain transition rules
```

Suggested split:

```text
kanban/
  contracts/
    kanban-card-read-model.ts
    kanban-board-read-model.ts

  queries/
    my-board-query.ts
    team-board-query.ts
    job-opening-board-query.ts
    company-pool-board-query.ts
    start-monitoring-board-query.ts

  application/
    execute-board-action.ts
    preflight-board-action.ts

  presentation/
    board-definitions/
    card-view-definitions/

  ui/
    board-shell/
    column/
    card/
    filters/
    action-sheet/
```

Centralize:

```text
column projection rules
action mapping
SLA policies
warning flag rules
```

---

# 15. V8.1 EXIT GATE

## Read model

```text
[ ] KanbanCardReadModel exists
[ ] board query supports pagination
[ ] frontend does not reconstruct canonical facts independently
```

## Default board

```text
[ ] core columns map to V7 facts
[ ] no kanbanStatus field
[ ] labels configurable
```

## Drag/drop

```text
[ ] canonical command mapping
[ ] invalid transition safe
[ ] required-input transitions supported
[ ] idempotency/concurrency handled
```

## Boards

```text
[ ] My Board
[ ] Team Board
[ ] JobOpening Board
[ ] Project Board
[ ] Company Pool Board
[ ] Start Monitoring Board
```

## Productivity

```text
[ ] quick interaction
[ ] quick NextAction
[ ] handling actions
[ ] Case 360 deep link
```

## Metrics

```text
[ ] column count
[ ] overdue indicators
[ ] handling expiry
[ ] bottleneck visibility
```

## Performance/security

```text
[ ] column pagination
[ ] stale-card handling
[ ] concurrent claim protected
[ ] scope/RLS pass
```

## Regression

```text
[ ] RF-V81-01 through RF-V81-12 pass
```

---

# 16. HANDOFF TO V8.2

V8.2 owns:

```text
RecruiterPublicProfile
public slug page
social/contact links
featured canonical JobPostings
safe recruiter posts/content
public CTA
Microsite + Universal AFF integration
microsite analytics projections
```

V8.2 must not build another affiliate/source system.

---

# 17. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V81-001 through V81-004

Batch B
V81-010 through V81-019

Batch C
V81-020 through V81-024

Batch D
V81-030 through V81-035

Batch E
V81-040 through V81-044

Batch F
V81-050 through V81-054

Batch G
V81-060 through V81-072
Security/audit/performance

Batch H
RF-V81-01 through RF-V81-12
V8.1 EXIT GATE
```

---

# 18. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
LaborProfile.kanbanStatus
PlacementCase.kanbanColumn
User.currentKanbanOwnerId
JobOpening.kanbanCandidates[]
```

Do NOT:

```text
patch PlacementCase.stage from React without command
mark EFFECTIVE by card movement alone
create fake Application for board display
query current handler/source independently in every card component
hardcode SLA thresholds in UI
```

---

# 19. PRODUCT OUTCOME

After V8.1, recruiters should be able to open HRP and immediately answer:

```text
Hôm nay tôi phải xử lý ai?
Case nào đang quá hạn?
Ai đang chờ khách?
Ai đã nhận việc nhưng chưa đi làm?
Ai sắp hết handling?
Job nào đang bị nghẽn ở bước nào?
Team nào đang quá tải?
```

and act on those facts visually, while every mutation still passes through V7 canonical commands.
