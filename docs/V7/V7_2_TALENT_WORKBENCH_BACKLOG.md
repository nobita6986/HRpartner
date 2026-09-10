# HRP V7.2 — TALENT WORKBENCH IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V7.2  
**Prerequisite:** V7.1 Exit Gate PASS  
**Primary bounded context:** Talent Operations  
**Primary aggregate:** `PlacementCase`

---

## 0. PURPOSE

V7.2 turns the Talent Repository into a daily operating system for HRP recruiters, coordinators, and managers.

The Workbench must answer:

```text
Who needs attention now?
What happened most recently?
What is the current job-search stage?
Who is responsible?
What is the next action?
When is it due?
Is handling about to expire?
Is the case in Company Pool?
What must a manager intervene in?
```

V7.2 MUST remain usable without Chatwoot, Zalo integration, AI, or external automation.

The canonical source of truth remains HRP.

---

# 1. NON-NEGOTIABLE DOMAIN INVARIANTS

1. `PlacementCase` represents one job-search / reassignment episode.
2. One `LaborProfile` has at most one active `PlacementCase`.
3. A closed case is normally not reopened; a later search creates a new case.
4. `PlacementCase` may exist without any Application.
5. `PlacementCase` may contain multiple Applications/JobProposals later, but V7.2 does not implement full V7.3 matching UX.
6. `InteractionOutcome` records something that already happened.
7. `NextAction` records something that must happen next.
8. `HandlingAssignment` represents temporary responsibility, not ownership of a person.
9. `ReferralAttribution != HandlingAssignment != Beneficiary`.
10. A PlacementCase has at most one active HandlingAssignment.
11. Company Pool is a projection:
   `active PlacementCase + no active HandlingAssignment`.
12. Handling expiration does not change ReferralAttribution.
13. Availability and CurrentRelationship are consumed from V7.1, not redefined here.
14. Business state transitions use commands, not generic PATCH.
15. All critical commands are permission-checked, idempotent where applicable, concurrency-safe, auditable, and event/outbox aware.
16. Raw omnichannel transcript is NOT stored as canonical Talent Workbench state.

---

# 2. V7.2 SCOPE

V7.2 includes:

```text
PlacementCase lifecycle
PlacementCase 360
InteractionOutcome
NextAction
HandlingAssignment UX
AFF_INITIAL handling behavior
Company Pool
Claim / assign / transfer / release
Recruiter My Work
Manager Workbench
SLA projections
Untouched-case projections
Waiting-state support
Canonical Talent timeline
Security/RLS/audit
Operational metrics
```

V7.2 does NOT include:

```text
full JobProposal UX               -> V7.3
full matching engine              -> V7.3
Placement lifecycle UX            -> V7.4
Worker lifecycle UX               -> V7.5
Partner portal                    -> V7.6
commission calculation            -> OUT OF SCOPE
Chatwoot/Zalo production          -> V7.9
AI next-best-action               -> V7.10
```

---

# 3. DELIVERY SLICES

```text
V7.2a — PlacementCase Core + Case 360
V7.2b — Interaction + NextAction
V7.2c — Handling + Company Pool
V7.2d — Recruiter My Work + SLA
V7.2e — Manager Workbench + Operational Controls
```

---

# 4. V7.2a — PLACEMENTCASE CORE + CASE 360

## V72-001 — Finalize PlacementCase lifecycle contract

**Type:** Domain contract  
**Dependency:** V6+ PlacementCase foundation + V7.1  
**Priority:** BLOCKER

Recommended canonical lifecycle:

```text
status:
OPEN
IN_PROGRESS
READY_TO_PLACE
CLOSED
```

Recommended stage vocabulary:

```text
NEW
CONTACTING
NEEDS_INFO
QUALIFYING
MATCHING
PROPOSED
CANDIDATE_ACCEPTED
CLIENT_PROCESS
READY_TO_START
```

Recommended close reasons:

```text
SUCCESS
NO_LONGER_LOOKING
UNREACHABLE
NO_SUITABLE_JOB
CANDIDATE_WITHDREW
CLIENT_REJECTED
DUPLICATE_CASE
INVALID
CANCELLED
OTHER
```

Implementation must keep `status`, `stage`, and `closeReason` semantically distinct.

### Exit gate

No user can directly set `CLOSED_SUCCESS` by editing one field. Success will later depend on Placement EFFECTIVE in V7.4.

---

## V72-002 — PlacementCase open command

**Type:** Domain command  
**Dependency:** V72-001  
**Priority:** BLOCKER

Command:

```text
openPlacementCase()
```

Inputs:

```text
laborProfileId
openedFromIntakeId?
acquisitionSource?
initialStage?
confirmedJobSeekingIntent
actor/source
idempotencyKey?
```

Preconditions:

```text
LaborProfile exists
no active PlacementCase already exists
job-seeking/reassignment intent is explicit enough
```

Effects:

```text
create PlacementCase
record openedAt/effectiveAt
write audit
emit PLACEMENT_CASE_OPENED
evaluate initial handling rule
```

If canonical ReferralAttribution qualifies for AFF_INITIAL handling, handling starts from this case opening event.

---

## V72-003 — PlacementCase continue-or-open resolver

**Type:** Application service  
**Dependency:** V72-002  
**Priority:** HIGH

For inbound returnee/contact workflows:

```text
if active case exists
  -> continue existing case
else if job-seeking intent confirmed
  -> open new case
else
  -> no case mutation
```

Do not open duplicate cases for repeated messages/intakes.

---

## V72-004 — PlacementCase close command

**Type:** Domain command  
**Dependency:** V72-001  
**Priority:** BLOCKER

Command:

```text
closePlacementCase()
```

Inputs:

```text
caseId
closeReason
effectiveAt
actor/source
note/evidence where required
```

Rules:

- `SUCCESS` must not be manually used before V7.4 Placement EFFECTIVE integration is active.
- closing a case ends/releases active handling;
- open NextActions must be explicitly cancelled/completed according to policy;
- closure must not delete Applications, Interactions, Handling history, or source attribution.

---

## V72-005 — PlacementCase reopen exception command

**Type:** Exception command  
**Dependency:** V72-004  
**Priority:** MEDIUM

Normal behavior for a later job search is new case creation.

Reopen is allowed only for:

```text
mistaken closure
same continuing job-search episode
authorized exception
```

Requires:

```text
reopenReason
reopenedBy
reopenedAt
```

and elevated permission.

---

## V72-006 — PlacementCase 360 read service

**Type:** Read model  
**Dependency:** V72-001 + V7.1 Profile read service  
**Priority:** BLOCKER

Return:

```text
case identity
LaborProfile summary
Availability
CurrentRelationship
ReferralAttribution summary
acquisitionSource
current handler
handling expiry
stage/status
preference summary
Applications summary
JobProposals summary placeholder
recent Interactions
open NextActions
Placement summary placeholder
timeline
```

The read model must support a case with no Application.

---

## V72-007 — PlacementCase detail UI

**Type:** UI  
**Dependency:** V72-006  
**Priority:** BLOCKER

Primary areas:

```text
Person summary
Current case state
Current needs/preferences
Current handler / handling expiry
Current opportunities summary
Next action
Interaction history
Timeline
Valid actions
```

Do not present a giant editable form as the primary UX.

---

# 5. V7.2b — INTERACTION + NEXTACTION

## V72-010 — Finalize InteractionOutcome schema

**Type:** Schema/domain  
**Dependency:** V6+ Interaction foundation  
**Priority:** BLOCKER

Conceptual fields:

```text
id
laborProfileId
placementCaseId?

channel
direction

actorType
actorId?
occurredAt
recordedAt

outcomeType
summary?

relatedJobOpeningId?
relatedPlacementId?

sourceConversationRef?
source

createdAt
```

PlacementCase remains nullable for interactions unrelated to active job-search work.

---

## V72-011 — Interaction outcome catalog

**Type:** Domain vocabulary  
**Dependency:** V72-010  
**Priority:** HIGH

Initial values:

```text
CONNECTED
NO_ANSWER
BUSY
INVALID_CONTACT
CALLBACK_REQUESTED
INTERESTED
NOT_INTERESTED
NEEDS_MORE_INFO
JOB_ACCEPTED
JOB_DECLINED
CLIENT_WAITING
OTHER
```

Do not turn every operational nuance into a PlacementCase stage.

---

## V72-012 — Record Interaction command

**Type:** Critical domain command  
**Dependency:** V72-010  
**Priority:** BLOCKER

Command:

```text
recordInteraction()
```

Inputs may include:

```text
caseId?
laborProfileId
channel
direction
occurredAt
outcomeType
summary
availabilityUpdate?
stageTransition?
nextAction?
jobContext?
```

Effects must be transactional where changes are in the same HRP database.

The command may:

```text
record InteractionOutcome
complete prior NextAction
create next NextAction
record AvailabilityObservation
perform allowed case-stage transition
```

Do not expose five unrelated frontend mutations for one business interaction.

---

## V72-013 — Interaction UI one-screen workflow

**Type:** UX  
**Dependency:** V72-012  
**Priority:** BLOCKER

A recruiter should be able to finish a call/chat outcome in one panel:

```text
Outcome
Summary
Availability update
Case-stage action
Next action
Due date/time
Related job context
```

Save once.

---

## V72-014 — NextAction schema

**Type:** Schema  
**Dependency:** V6+ NextAction foundation  
**Priority:** BLOCKER

Conceptual:

```text
id
laborProfileId
placementCaseId

type
dueAt
assignedUserId

status
priority?

waitingOn?

createdFromInteractionId?
completedByInteractionId?

createdAt
completedAt?
cancelledAt?

createdByUserId
```

Canonical status:

```text
OPEN
DONE
CANCELLED
```

`OVERDUE` is derived.

---

## V72-015 — NextAction type catalog

**Type:** Domain vocabulary  
**Priority:** HIGH

Initial:

```text
CALL
MESSAGE
COLLECT_INFORMATION
FOLLOW_UP_CANDIDATE
FOLLOW_UP_CLIENT
CONFIRM_START
CHECK_RESULT
REVIEW_CASE
OTHER
```

---

## V72-016 — WaitingOn support

**Type:** Domain support  
**Dependency:** V72-014  
**Priority:** MEDIUM

Suggested values:

```text
NONE
CANDIDATE
CLIENT
INTERNAL
EXTERNAL_PROCESS
```

This should improve operational clarity without becoming another case status.

---

## V72-017 — NextAction command set

**Type:** Domain commands  
**Dependency:** V72-014  
**Priority:** BLOCKER

Commands:

```text
createNextAction()
completeNextAction()
cancelNextAction()
rescheduleNextAction()
```

Every mutation must preserve audit history.

---

## V72-018 — Active-case next-action invariant

**Type:** Policy / validation  
**Dependency:** V72-017  
**Priority:** HIGH

Soft invariant:

> after first meaningful touch, an active PlacementCase should have either an OPEN NextAction or an explicit valid waiting state.

Cases without a future action should surface in an operational exception queue.

Do not hard-close cases automatically.

---

# 6. V7.2c — HANDLING + COMPANY POOL

## V72-020 — Finalize HandlingAssignment schema

**Type:** Domain/schema  
**Dependency:** V6+ handling migration  
**Priority:** BLOCKER

Conceptual:

```text
id
placementCaseId

assigneeUserId
assignedByUserId?

assignmentSource

startsAt
expiresAt

status

endedAt?
endReason?

createdAt
```

Suggested status:

```text
ACTIVE
ENDED
EXPIRED
CANCELLED
```

Suggested sources:

```text
AFF_INITIAL
MANAGER_ASSIGNMENT
POOL_CLAIM
MANUAL_TRANSFER
SYSTEM_ROUTING
RETURNING_CASE
```

---

## V72-021 — One active handling constraint

**Type:** DB/service invariant  
**Dependency:** V72-020  
**Priority:** BLOCKER

At most one active HandlingAssignment per PlacementCase.

Must be concurrency safe at DB level where feasible.

---

## V72-022 — AFF_INITIAL 7-day handling

**Type:** Business rule  
**Dependency:** V72-002 + V72-020  
**Priority:** BLOCKER

Locked V7 rule:

```text
ReferralAttribution may exist before a PlacementCase.

The 7-day AFF_INITIAL HandlingAssignment begins when
a qualifying PlacementCase is opened.
```

Handling expiration:

```text
does NOT modify ReferralAttribution
does NOT modify canonical source
```

Calendar-day/business-day policy must be centrally configurable if not already fixed.

---

## V72-023 — Assign handling command

**Type:** Domain command  
**Priority:** BLOCKER

```text
assignHandling()
```

Checks:

```text
case active
assignee authorized
no conflicting active handling
duration policy
scope/permissions
```

---

## V72-024 — Claim Company Pool case

**Type:** Domain command  
**Dependency:** V72-021  
**Priority:** BLOCKER

```text
claimPlacementCase()
```

Must be atomic under concurrent claims.

Expected result:

```text
one claimant succeeds
others receive conflict/current-handler response
```

---

## V72-025 — Transfer handling

**Type:** Domain command  
**Priority:** BLOCKER

```text
transferHandling()
```

Effects:

```text
end current assignment
create new assignment
preserve ReferralAttribution
record reason
audit/correlation
```

Never mutate the prior assignment's assignee.

---

## V72-026 — Release handling early

**Type:** Domain command  
**Priority:** HIGH

```text
releaseHandling()
```

Ends current HandlingAssignment with:

```text
RELEASED_TO_POOL
```

The case immediately appears in Company Pool projection if still active.

---

## V72-027 — Handling expiry projection/service

**Type:** Projection  
**Priority:** BLOCKER

No cron-maintained `inPool` flag.

Expose:

```text
ACTIVE
EXPIRES_SOON
EXPIRED
```

based on effective timestamps.

An expiration reconciler may close stale ACTIVE rows if persistence requires, but Company Pool authority remains query/projection based.

---

## V72-028 — Company Pool query

**Type:** Query service  
**Dependency:** V72-021  
**Priority:** BLOCKER

Canonical definition:

```text
PlacementCase active
AND no currently valid active HandlingAssignment
```

Filters:

```text
case age
Availability
CurrentRelationship
source/partner
location
current stage
last interaction
untouched duration
```

Company Pool is NOT the Talent Repository.

---

# 7. V7.2d — RECRUITER MY WORK + SLA

## V72-030 — Recruiter My Work read model

**Type:** Query/read model  
**Dependency:** NextAction + Handling  
**Priority:** BLOCKER

Sections:

```text
Overdue actions
Due today
Ready-to-start requiring action
Handling expires < 24h
New untouched cases
Available-now cases with no next action
Other active assigned cases
```

Exact priority may be policy-configured.

---

## V72-031 — Overdue projection

**Type:** Query  
**Priority:** BLOCKER

Definition:

```text
NextAction.status = OPEN
AND dueAt < now
```

No persistent OVERDUE state required.

---

## V72-032 — Untouched-case projection

**Type:** Query  
**Priority:** HIGH

Definition:

```text
PlacementCase opened
AND no meaningful InteractionOutcome exists
```

Expose age buckets:

```text
<30m
30m-2h
2h-24h
>24h
```

Thresholds may be configurable.

---

## V72-033 — Handling-expiry SLA view

**Type:** Query  
**Priority:** HIGH

Suggested buckets:

```text
<4h
4-12h
12-24h
1-2d
>2d
```

Do not confuse action overdue with handling expiry.

---

## V72-034 — No-next-action exception queue

**Type:** Query  
**Dependency:** V72-018  
**Priority:** HIGH

Show:

```text
active case
meaningful first touch completed
no OPEN NextAction
not legitimately waiting
```

This queue prevents cases from dying silently in the database.

---

## V72-035 — Recruiter Workbench UI

**Type:** UI  
**Dependency:** V72-030  
**Priority:** BLOCKER

Home screen must prioritize work, not static navigation cards.

Minimum:

```text
urgent counts
work sections
one-click open case
quick interaction action
quick next-action completion
handling expiry visibility
```

---

# 8. V7.2e — MANAGER WORKBENCH + OPERATIONAL CONTROLS

## V72-040 — Manager operational summary

**Type:** Read model  
**Priority:** HIGH

Minimum metrics:

```text
Active cases
Company Pool
Untouched > threshold
Overdue actions
Handling expiry < 24h
Ready to start
Cases without next action
```

Later metrics can be added without changing domain authority.

---

## V72-041 — Manager drilldown

**Type:** Query/UI  
**Priority:** HIGH

Filters:

```text
team
recruiter
project
job opening
source
partner
case stage
availability
relationship
```

---

## V72-042 — Manager handling controls

**Type:** UI/commands  
**Dependency:** V72-023 through V72-026  
**Priority:** HIGH

Allowed actions subject to permission:

```text
assign
transfer
release
extend handling if policy allows
```

All actions use domain commands.

---

## V72-043 — Handling extension exception

**Type:** Domain policy  
**Priority:** MEDIUM

If handling extension is supported:

```text
extendHandling()
```

must require:

```text
permission
reason
new expiry
audit
```

Do not let users manually edit expiresAt.

---

## V72-044 — Team SLA dashboard

**Type:** Query/UI  
**Priority:** MEDIUM

Show operational distributions rather than vanity charts:

```text
untouched age
overdue age
handling expiry age
case age by stage
next-action completion
```

No payroll/commission amount analytics.

---

# 9. PLACEMENTCASE TIMELINE

## V72-050 — Canonical case timeline projection

**Type:** Read projection  
**Priority:** BLOCKER

Combine:

```text
case open/close
interaction
next action created/completed/cancelled
handling assigned/transferred/released/expired
Application summary events
JobProposal summary events later
Placement summary events later
availability changes relevant to case
```

Each event should show:

```text
effectiveAt/occurredAt
recordedAt
actor
source
context
```

Raw transcript content should not be duplicated.

---

# 10. ACQUISITION SOURCE VS CANONICAL ATTRIBUTION

## V72-060 — PlacementCase acquisition source

**Type:** Domain field/value object  
**Priority:** HIGH

A case may record how this search episode was activated:

```text
ZALO
PHONE
MARKETPLACE
CTV
VENDOR
INTERNAL_REACTIVATION
RETURNING_WORKER
OTHER
```

This does not replace canonical `ReferralAttribution`.

Example:

```text
canonical source = CTV A
case acquisition = ZALO
```

is valid.

---

# 11. SECURITY REQUIREMENTS

## V72-070 — Permission additions

Suggested permissions:

```text
talent.case.read
talent.case.create
talent.case.update_stage
talent.case.close
talent.case.reopen

talent.interaction.create
talent.next_action.manage

talent.handling.assign
talent.handling.claim
talent.handling.transfer
talent.handling.release
talent.handling.extend

talent.workbench.team.read
```

---

## V72-071 — Contextual OWN scope

For Talent Operations:

```text
OWN case
=
current valid HandlingAssignment.assigneeUserId == current user
```

Do not use `LaborProfile.ownerId`.

---

## V72-072 — Company Pool read/claim policy

Read and claim permissions may differ.

Examples:

```text
recruiter can read pool but not claim
team recruiter can claim only team pool
manager can assign across team
```

Exact role bundles remain configuration/policy.

---

## V72-073 — Interaction visibility

Sensitive internal notes may require narrower visibility than basic case status.

Do not expose internal Interaction summaries to Partner/Client projections by default.

---

# 12. CONCURRENCY / IDEMPOTENCY

## V72-080 — Concurrent pool claim fixture

Two recruiters claim same case.

Expected:

```text
exactly one active HandlingAssignment created
one success
one conflict
no duplicate audit/outbox side effects
```

---

## V72-081 — Duplicate interaction submission

Repeated `recordInteraction()` with same idempotency key must not create duplicate InteractionOutcome/NextAction.

---

## V72-082 — Duplicate case open attempt

Concurrent openPlacementCase calls for one LaborProfile must result in at most one active case.

---

# 13. PERMANENT REGRESSION FIXTURES

## RF-WB-01 — General-interest case

```text
LaborProfile
active PlacementCase
no Application
```

Expected: case is fully operable.

---

## RF-WB-02 — No-answer then callback

Expected:

```text
Interaction NO_ANSWER
NextAction CALL tomorrow
old task lifecycle preserved
```

---

## RF-WB-03 — Case in Company Pool

Expected:

```text
active case
no active handling
appears in pool
```

No `poolStatus` authority required.

---

## RF-WB-04 — Handling expiry preserves source

Expected:

```text
ReferralAttribution unchanged
Handling expired
case enters pool
```

---

## RF-WB-05 — Concurrent claim

Exactly one claimant wins.

---

## RF-WB-06 — Transfer handling

Expected:

```text
old handling ended
new handling active
source unchanged
history preserved
```

---

## RF-WB-07 — Release early

Expected:

```text
handling ended RELEASED_TO_POOL
case immediately queryable in pool
```

---

## RF-WB-08 — Active case with no next action

Expected: appears in exception queue after first meaningful touch.

---

## RF-WB-09 — Interaction outside PlacementCase

Expected:

```text
LaborProfile-level interaction allowed
no fake case created
```

---

## RF-WB-10 — Returning person with active case

Expected:

```text
new intake/contact reuses current case
no duplicate active case
```

---

## RF-WB-11 — Returning person without active case and no job-seeking intent

Expected:

```text
Interaction/Intake recorded
no PlacementCase created
```

---

## RF-WB-12 — Closed historical case

Expected:

```text
history retained
new later search creates new case
normal UI does not reopen old case
```

---

# 14. PERFORMANCE REQUIREMENTS

Workbench is operational and time-sensitive.

Required:

```text
indexed active PlacementCase lookup
indexed active HandlingAssignment lookup
indexed NextAction dueAt/status
efficient Company Pool query
efficient My Work query
cursor/page pagination
no N+1 profile lookups
bounded timeline reads
```

Manager counts must share canonical query semantics with drilldown lists.

---

# 15. OBSERVABILITY

Track at minimum:

```text
case_open_command failures
duplicate_active_case conflicts
handling_claim conflicts
expired handling count
overdue action count
cases without next action
untouched case age
interaction command failures
```

Operational observability must not contain sensitive raw message content.

---

# 16. V7.2 EXIT GATE

## PlacementCase

```text
[ ] max one active case per LaborProfile
[ ] general-interest case works without Application
[ ] close/reopen policy enforced
[ ] case 360 read model stable
```

## Interaction

```text
[ ] structured InteractionOutcome works
[ ] interaction may exist without case where valid
[ ] one-screen interaction workflow works
[ ] duplicate command does not duplicate records
```

## NextAction

```text
[ ] next actions have lifecycle
[ ] overdue is projection
[ ] no-next-action exception queue works
[ ] due-today / overdue views are accurate
```

## Handling

```text
[ ] handling authority belongs to PlacementCase
[ ] max one active handling
[ ] AFF_INITIAL starts at qualifying case open
[ ] transfer/release preserve history
[ ] source attribution is unchanged by handling changes
```

## Company Pool

```text
[ ] defined by active case + no valid active handling
[ ] concurrent claim is safe
[ ] no canonical poolStatus field required
```

## Workbench

```text
[ ] recruiter can operate daily work without Chatwoot/Zalo
[ ] manager can see SLA/exception queues
[ ] operational counts match drilldowns
```

## Security

```text
[ ] permission checks implemented
[ ] OWN derives from HandlingAssignment
[ ] Team/Pool scopes enforced
[ ] internal notes not leaked to external contexts
```

## Regression

```text
[ ] RF-WB-01 through RF-WB-12 pass
```

---

# 17. HANDOFF TO V7.3

V7.3 may begin only after V7.2 Exit Gate passes.

V7.3 owns:

```text
Application semantics hardening
JobProposal
PlacementPreference
person-first matching
demand-first matching
candidate/job suggestion views
```

V7.3 must consume without redefining:

```text
LaborProfile
Availability
CurrentRelationship
PlacementCase
InteractionOutcome
NextAction
HandlingAssignment
Company Pool
ReferralAttribution
```

---

# 18. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V72-001 through V72-007

Batch B
V72-010 through V72-018

Batch C
V72-020 through V72-028

Batch D
V72-030 through V72-035

Batch E
V72-040 through V72-044

Batch F
V72-050
V72-060
Security tasks

Batch G
Concurrency/idempotency tests
RF-WB-01 through RF-WB-12

Batch H
V7.2 EXIT GATE
```

---

# 19. ARCHITECTURAL WARNINGS FOR IMPLEMENTATION AGENTS

Do NOT introduce:

```text
PlacementCase.ownerId
LaborProfile.ownerId
PlacementCase.poolStatus
NextAction.status = OVERDUE
ReferralAttribution.currentHandlerId
```

as canonical shortcuts.

Do NOT:

```text
change source when handler changes
open a PlacementCase for every contact
create a fake Application for a general-interest case
store raw Chatwoot/Zalo transcript as InteractionOutcome
close case SUCCESS without Placement EFFECTIVE once V7.4 is active
```

---

# 20. PRODUCT OUTCOME

After V7.2, an HRP recruiter should be able to work an entire day from the Workbench and answer:

```text
Which cases are mine?
Which actions are overdue?
Who must I call today?
Which new cases have not been touched?
Which handling assignments expire soon?
Which cases are currently unowned in Company Pool?
What happened last?
What do I need to do next?
Who handled the case previously?
Why did responsibility change?
```

A manager should be able to answer:

```text
Where are cases getting stuck?
Which team members have overdue work?
Which cases have no next action?
How many cases are unhandled?
Which handling assignments are expiring?
Which new cases have not been touched?
```

without relying on spreadsheets, personal notes, or Chatwoot as canonical workflow state.
