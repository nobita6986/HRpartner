# HRP V7.3 — MATCHING & JOB PROPOSAL IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V7.3  
**Prerequisite:** V7.2 Exit Gate PASS  
**Primary bounded contexts:** Talent Operations + Matching & Placement  
**Primary aggregates:** `PlacementCase`, `JobOpening`

---

## 0. PURPOSE

V7.3 connects HRP's Talent Repository and Talent Workbench to active demand.

It must support both operational directions:

```text
PERSON-FIRST
Open a LaborProfile / PlacementCase
→ find suitable JobOpenings
→ propose opportunities

DEMAND-FIRST
Open a JobOpening
→ search HRP Talent Repository
→ identify suitable people
→ propose the job
```

The system must preserve provenance:

```text
Application
= candidate-initiated interest

JobProposal
= HRP-initiated opportunity suggestion
```

The implementation must never create fake Applications merely because a recruiter proposes a Job.

---

# 1. NON-NEGOTIABLE DOMAIN INVARIANTS

1. `Application != JobProposal`.
2. `Application != Placement`.
3. `JobProposal != Placement`.
4. `PlacementCase` represents the job-search/reassignment episode, not one Job.
5. One active PlacementCase may contain multiple Applications and multiple JobProposals.
6. A PlacementCase may exist with no Application.
7. A JobOpening may be matched before it has a public JobPosting.
8. An Application preserves the candidate's original point of interest.
9. Final Placement may target a different JobOpening than the original Application.
10. A recruiter proposal must not overwrite or reinterpret candidate-initiated source.
11. Matching results are suggestions, not canonical state transitions.
12. Matching must not automatically:
    - open PlacementCase;
    - mark Availability;
    - claim HandlingAssignment;
    - create Application;
    - create Placement;
    - change ReferralAttribution.
13. Matching filters must consume V7.1 canonical repository projections.
14. Operational actions must go through domain commands.
15. AI ranking is not required for V7.3.

---

# 2. V7.3 SCOPE

V7.3 includes:

```text
Application semantic hardening
CandidateSubmission compatibility
PlacementPreference
JobProposal
JobProposal lifecycle
Person-first job discovery
Demand-first talent discovery
Structured matching filters
Match explanation
Bulk proposal safeguards
Application/Proposal views on PlacementCase
Talent Pool view on JobOpening
Basic funnel metrics
Security/RLS/audit
```

V7.3 does NOT include:

```text
Placement lifecycle              -> V7.4
Worker lifecycle                 -> V7.5
Partner portal matching          -> V7.6
beneficiary logic                -> V7.7
Chatwoot/Zalo integration        -> V7.9
AI ranker / prediction           -> V7.10
autonomous outbound messaging    -> OUT OF SCOPE for V7.3
```

---

# 3. DELIVERY SLICES

```text
V7.3a — Application + Preference foundation
V7.3b — JobProposal
V7.3c — Person-first matching
V7.3d — Demand-first matching
V7.3e — Funnel / bulk actions / operational hardening
```

---

# 4. V7.3a — APPLICATION + PREFERENCE FOUNDATION

## V73-001 — Application domain contract

**Type:** Domain contract  
**Dependency:** V6+ CandidateSubmission linkage  
**Priority:** BLOCKER

Product vocabulary:

```text
Application
```

Persistence may continue using:

```text
CandidateSubmission
```

during compatibility period.

Application means:

> A candidate-originated expression of interest in a specific JobOpening / JobPosting.

It must retain:

```text
laborProfileId
placementCaseId
jobOpeningId
jobPostingId? / origin posting reference
appliedAt
origin/source
status
```

No implementation agent may reinterpret recruiter-created interest as an Application.

---

## V73-002 — Application lifecycle normalization

**Type:** Domain vocabulary  
**Priority:** HIGH

Keep lifecycle compact.

Suggested categories:

```text
SUBMITTED
UNDER_REVIEW
QUALIFIED
NOT_QUALIFIED
WITHDRAWN
CLOSED
```

Do not add workforce states such as:

```text
WORKING
LEFT
TRANSFERRED
```

to Application.

Those belong to later domains.

---

## V73-003 — Application linkage validation

**Type:** Service invariant  
**Priority:** BLOCKER

Validate:

```text
Application.laborProfileId
==
PlacementCase.laborProfileId
```

and:

```text
JobOpening exists
```

Application may reference an inactive historical case only if the Application itself is historical and immutable.

New Applications must link the active PlacementCase or use the approved create/continue flow.

---

## V73-004 — Application origin preservation

**Type:** Provenance invariant  
**Priority:** BLOCKER

Preserve:

```text
originJobPostingId?
originChannel
originIntakeId?
originAt
```

A later Placement to another JobOpening must not rewrite the original Application.

---

## V73-005 — PlacementPreference schema

**Type:** Schema/domain  
**Priority:** BLOCKER

Placement preferences belong to a PlacementCase, not permanently to LaborProfile.

Conceptual:

```text
id
placementCaseId

preferredLocations
acceptableLocations

shiftPreferences
workClassifications
jobFamilies / jobTypes

expectedIncomeMin?
availableFrom?

accommodationNeed?
transportCapability?

otherStructuredConstraints

recordedAt
recordedBy
source
```

Avoid putting high-churn job-search preferences as permanent identity fields.

---

## V73-006 — PlacementPreference command

**Type:** Domain command  
**Priority:** BLOCKER

```text
updatePlacementPreference()
```

Must preserve material history or audit.

Inputs must support partial updates without silently erasing unknown fields.

---

# 5. V7.3b — JOBPROPOSAL

## V73-010 — Add JobProposal schema

**Type:** Schema  
**Priority:** BLOCKER

Conceptual:

```text
id
placementCaseId
laborProfileId
jobOpeningId

proposedByUserId
proposedAt

status
candidateRespondedAt?

declineReason?
note?

source
createdAt
updatedAt
```

Suggested lifecycle:

```text
PROPOSED
INTERESTED
DECLINED
EXPIRED
WITHDRAWN
```

Do not use:

```text
HIRED
WORKING
PLACED
```

as JobProposal states.

---

## V73-011 — JobProposal uniqueness policy

**Type:** Domain policy  
**Priority:** HIGH

Default rule:

```text
one active JobProposal per PlacementCase + JobOpening
```

Historical declined/expired proposals may coexist if business needs repeated proposals later.

A new proposal to the same JobOpening should either:

```text
reuse/reactivate according to policy
or
create a new historical attempt with explicit relation
```

but never silently duplicate active proposals.

---

## V73-012 — proposeJob command

**Type:** Domain command  
**Priority:** BLOCKER

Inputs:

```text
placementCaseId
jobOpeningId
proposedBy
source
note?
```

Preconditions:

```text
PlacementCase active
JobOpening eligible for recruitment
candidate not blocked by hard constraints
permission valid
no conflicting active proposal
```

Effects:

```text
create JobProposal
optionally transition case stage to PROPOSED
write audit
emit JOB_PROPOSED
```

Must NOT create Application.

---

## V73-013 — recordProposalResponse command

**Type:** Domain command  
**Priority:** BLOCKER

Inputs:

```text
proposalId
response
respondedAt
actor/source
reason?
```

Responses:

```text
INTERESTED
DECLINED
```

Effects may update PlacementCase stage according to approved transition rules.

Candidate acceptance does NOT create Placement EFFECTIVE.

---

## V73-014 — expire/withdraw proposal commands

**Type:** Domain commands  
**Priority:** HIGH

```text
expireJobProposal()
withdrawJobProposal()
```

Used when:

```text
opening closes
offer context becomes stale
recruiter retracts proposal
candidate no longer eligible
```

History must remain visible.

---

## V73-015 — Application vs Proposal collision handling

**Type:** Domain policy  
**Priority:** HIGH

If candidate already has an active Application for the same JobOpening:

```text
proposeJob()
```

should normally surface/reuse that candidate interest rather than create redundant proposal state.

If proposal exists first and candidate later explicitly applies via Marketplace:

```text
preserve both provenance facts
```

but avoid duplicate funnel counting.

This requires a canonical "opportunity interest" read model, not destructive merging of records.

---

# 6. V7.3c — PERSON-FIRST MATCHING

## V73-020 — Person-first Job search service

**Type:** Query service  
**Dependency:** V7.1 repository + JobOpening read model  
**Priority:** BLOCKER

Input:

```text
laborProfileId
placementCaseId
filters?
```

Use:

```text
Availability
PlacementPreference
CurrentRelationship
location
work classification
job family
shift compatibility
availableFrom
historical job/assignment signals where allowed
```

Return candidate JobOpenings with reasons.

---

## V73-021 — Hard filter vs soft match distinction

**Type:** Domain/query policy  
**Priority:** BLOCKER

Hard filters:

```text
opening closed
opening cancelled
candidate DO_NOT_CONTACT where proposing would violate policy
known incompatible required condition
service eligibility violation
```

Soft signals:

```text
distance
preferred shift
expected income
previous industry
prior worksite history
```

V7.3 should not encode every soft mismatch as a rejection.

---

## V73-022 — Match explanation contract

**Type:** Read contract  
**Priority:** HIGH

Each recommendation should expose human-readable reasons:

```text
location matches
available before required start
previous electronics experience
prefers day shift
income expectation within range
```

and warnings:

```text
availability stale
shift preference unknown
distance not verified
```

No opaque score required.

---

## V73-023 — Person-first UI

**Type:** UI  
**Priority:** BLOCKER

On PlacementCase:

```text
Suitable Jobs
Current Applications
Current JobProposals
Previously declined opportunities
```

Actions:

```text
open JobOpening
propose job
record candidate response
```

Do not hide provenance behind one generic "job status" list.

---

# 7. V7.3d — DEMAND-FIRST MATCHING

## V73-030 — JobOpening Talent Pool query

**Type:** Query service  
**Priority:** BLOCKER

Input:

```text
jobOpeningId
filters
```

Search Talent Repository for suitable profiles.

Must support:

```text
Availability
availability freshness
CurrentRelationship
location
work classification
previous Worker/project/job history
profile completeness
verification
last contact
active PlacementCase
current handler
source/partner
```

---

## V73-031 — Eligibility to propose from demand-first view

**Type:** Policy  
**Priority:** BLOCKER

A LaborProfile found in repository is not automatically actionable.

For each result expose:

```text
HAS_ACTIVE_CASE
NO_ACTIVE_CASE
NOT_AVAILABLE
AVAILABILITY_UNKNOWN
DO_NOT_CONTACT
WORKING_VIA_HRP
WORKING_EXTERNAL
FORMER_HRP_WORKER
```

If no active PlacementCase exists:

```text
do not auto-create one
```

User must first confirm job-seeking intent through approved workflow.

---

## V73-032 — Demand-first Talent Pool UI

**Type:** UI  
**Priority:** BLOCKER

JobOpening page should show:

```text
Applications
JobProposals
Placement pipeline placeholder
Suggested from HRP Repository
```

Repository results need clear actions:

```text
open profile
open active case
contact/revalidate
propose job when valid
```

No blind "assign all".

---

## V73-033 — Reactivation workflow handoff

**Type:** Domain handoff  
**Priority:** HIGH

For a dormant/former profile:

```text
Talent Pool result
→ initiate contact / revalidation
→ record Interaction
→ confirm job-seeking intent
→ open PlacementCase if needed
→ propose Job
```

Do not:

```text
matching result
→ PlacementCase auto-open
→ HandlingAssignment auto-claim
```

---

# 8. V7.3e — FUNNEL / BULK ACTIONS / HARDENING

## V73-040 — Opportunity-interest read model

**Type:** Read projection  
**Priority:** HIGH

For a PlacementCase + JobOpening expose combined context:

```text
Application?
JobProposal?
candidateInterest?
latest interaction?
current state?
```

This read model prevents UI from pretending Application and Proposal are the same entity.

---

## V73-041 — Matching funnel metrics

**Type:** Analytics projection  
**Priority:** HIGH

Initial metrics:

```text
Applications
Qualified Applications
JobProposals
Proposal Interested
Proposal Declined
Cases with selected opportunity
```

Do not count Placement EFFECTIVE until V7.4 owns that metric.

---

## V73-042 — Bulk proposal safeguards

**Type:** UX/security  
**Priority:** HIGH

Bulk proposal may be allowed only for:

```text
profiles with active PlacementCase
eligible to contact
not already holding active proposal for same Job
```

Bulk action must present:

```text
eligible count
skipped count
skip reasons
```

No silent creation of cases or handling.

---

## V73-043 — Proposal expiry on JobOpening closure

**Type:** Domain integration  
**Priority:** HIGH

When JobOpening closes/cancels:

```text
active JobProposals
```

must become non-actionable.

Whether to persist EXPIRED transitions immediately or project them from opening state should be one consistent policy.

Applications remain historical.

---

## V73-044 — Matching audit

**Type:** Audit  
**Priority:** MEDIUM

Record:

```text
who proposed which Job
when
from which surface
candidate response
why proposal was withdrawn/expired
```

Do not audit every search/filter query as a business event unless security policy requires it.

---

# 9. JOBOPENING REQUIREMENTS FOR V7.3

Matching consumes, but does not redefine, JobOpening.

Required fields/projections available:

```text
status
serviceModel
workClassification
location/workplace
recruitment dates
headcount
job terms needed for matching
public posting status
```

V7.3 must not use JobPosting as the canonical demand record.

---

# 10. PLACEMENT PREFERENCE VERSIONING

V7.3 does not require event sourcing.

Recommended:

```text
current structured PlacementPreference
+
audit/history of material changes
```

If preferences change during one PlacementCase:

```text
old preference context must remain recoverable enough
to understand prior proposals
```

Do not copy profile-level permanent identity fields into preference state without reason.

---

# 11. SECURITY REQUIREMENTS

## V73-050 — Permission additions

Suggested:

```text
talent.application.read
talent.application.review

talent.preference.read
talent.preference.update

talent.proposal.create
talent.proposal.respond
talent.proposal.withdraw

matching.person_first.read
matching.demand_first.read
matching.bulk_propose
```

---

## V73-051 — Demand visibility

A user may only match against JobOpenings they are allowed to see/use.

No cross-client leakage through search result counts.

---

## V73-052 — Talent visibility

Demand-first search must respect Talent Repository RLS/scope.

Matching endpoints must not become a bypass for PII restrictions.

---

# 12. PERFORMANCE REQUIREMENTS

Person-first and demand-first matching must be operationally usable.

Minimum:

```text
indexed status/serviceModel/workClassification
indexed location fields where applicable
indexed availability/current relationship projections
paginated Talent Pool results
bounded joins
no N+1 LaborProfile/JobOpening loading
query explain/benchmark on production-like fixture sizes
```

If future vector/AI search is added, relational filter authority remains canonical.

---

# 13. PERMANENT REGRESSION FIXTURES

## RF-M-01 — General-interest case gets proposed Job

Expected:

```text
no Application
JobProposal created
PlacementCase remains same
```

---

## RF-M-02 — Candidate applies Samsung, HRP proposes Actro

Expected:

```text
Application Samsung preserved
JobProposal Actro separate
```

---

## RF-M-03 — Candidate applies Samsung, final future Placement may be Actro

V7.3 must preserve enough provenance for V7.4 to support this without rewriting Application.

---

## RF-M-04 — Same Job Application already exists

Expected:

```text
proposeJob does not create redundant active JobProposal by default
```

---

## RF-M-05 — Proposal first, Marketplace Application later

Expected:

```text
both provenance facts preserved
funnel read model avoids double-counting candidate
```

---

## RF-M-06 — Dormant profile appears in Talent Pool

Expected:

```text
result visible if permitted
no case auto-created
action requires revalidation/contact flow
```

---

## RF-M-07 — DO_NOT_CONTACT profile

Expected:

```text
matching may show restricted result according to permission/policy
outbound proposal action blocked
```

---

## RF-M-08 — Available-from future date

Expected:

```text
match explanation shows future availability
hard/soft eligibility follows Job start date
```

---

## RF-M-09 — Working external but seeking change

Expected:

```text
profile can match if active PlacementCase + Availability permits
CurrentRelationship does not block by itself
```

---

## RF-M-10 — Current HRP Worker seeking reassignment

Expected:

```text
profile can participate in matching without creating new Worker
```

---

## RF-M-11 — Closed JobOpening

Expected:

```text
not available for new proposal
existing Application/Proposal history retained
```

---

## RF-M-12 — Bulk proposal

Expected:

```text
only eligible active-case profiles receive proposal
skipped results report reasons
no case/source/handling mutation
```

---

# 14. V7.3 EXIT GATE

## Application

```text
[ ] candidate-originated intent preserved
[ ] Application linked to correct PlacementCase
[ ] no fake Application generated from proposals
[ ] original JobOpening/Posting provenance retained
```

## Preference

```text
[ ] preferences belong to PlacementCase
[ ] structured fields available to matching
[ ] material changes auditable
```

## JobProposal

```text
[ ] proposal lifecycle implemented
[ ] proposal commands use domain rules
[ ] same-job duplicate policy enforced
[ ] Application/Proposal remain distinct
```

## Person-first matching

```text
[ ] case can discover suitable JobOpenings
[ ] reasons/warnings are visible
[ ] match does not mutate canonical state
```

## Demand-first matching

```text
[ ] JobOpening can search repository
[ ] inactive/dormant profiles do not auto-open cases
[ ] Talent visibility/RLS is preserved
```

## Funnel

```text
[ ] Application and Proposal metrics are not conflated
[ ] candidate is not double-counted for same Job context
```

## Regression

```text
[ ] RF-M-01 through RF-M-12 pass
```

---

# 15. HANDOFF TO V7.4

V7.4 owns:

```text
Placement entity
Placement attempts
selected opportunity
confirmation
failure/no-show
EFFECTIVE milestone
ServiceModel execution
CLIENT_MANAGED direct hire
HRP_MANAGED workforce bridge
JobOpening fulfillment
```

V7.4 must consume without redefining:

```text
PlacementCase
Application
JobProposal
PlacementPreference
JobOpening
ServiceModel
Availability
CurrentRelationship
HandlingAssignment
ReferralAttribution
```

---

# 16. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V73-001 through V73-006

Batch B
V73-010 through V73-015

Batch C
V73-020 through V73-023

Batch D
V73-030 through V73-033

Batch E
V73-040 through V73-044
Security
Performance

Batch F
RF-M-01 through RF-M-12
V7.3 EXIT GATE
```

---

# 17. ARCHITECTURAL WARNINGS FOR IMPLEMENTATION AGENTS

Do NOT introduce:

```text
Application.source = recruiter-proposed
Application = every job considered
LaborProfile.preferredJob = canonical forever
JobOpening.candidateIds[]
matchScore = authority
```

Do NOT:

```text
auto-open PlacementCase from a search result
auto-claim a recruiter when matching
auto-change Availability
auto-create Application from JobProposal
rewrite original Application when later Job differs
```

Matching is recommendation/query logic. Business changes happen through explicit commands.

---

# 18. PRODUCT OUTCOME

After V7.3, HRP must support these real workflows cleanly:

```text
Candidate applies Samsung.
Recruiter learns Samsung is unsuitable.
Recruiter proposes Actro and Wisum.
Candidate declines Wisum and is interested in Actro.
Original Samsung Application remains historically true.
```

And:

```text
Actro needs 200 workers.
Recruiter opens the JobOpening.
HRP searches its Talent Repository.
Former workers, available profiles, and active seekers are surfaced.
Recruiter can re-contact dormant profiles without the system
pretending they are already active candidates.
```

This establishes the matching layer required before V7.4 can create and manage real Placement outcomes.
