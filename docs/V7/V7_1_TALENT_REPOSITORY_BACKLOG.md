# HRP V7.1 — TALENT REPOSITORY IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V7.1  
**Prerequisite:** V6 Native Compatibility Gate PASS
**Primary bounded context:** Talent Repository  
**Primary aggregate:** `LaborProfile`

---

## 0. PURPOSE

V7.1 turns `LaborProfile` from a canonical identity record into the operational foundation of the HRP Workforce Supply OS.

The Talent Repository is not a list of “active candidates”.

It is the long-lived workforce repository of HRP, containing every canonical `LaborProfile` that HRP is legitimately allowed to retain, including people who are:

- currently looking for work;
- working through HRP;
- former HRP workers;
- working externally;
- temporarily unavailable;
- dormant / unknown;
- returning to HRP after a previous placement or employment episode.

V7.1 must make the following distinction explicit:

```text
LaborProfile membership in repository
!=
availability for recruitment
!=
current employment relationship
!=
active PlacementCase
!=
current handler
```

---

# 1. NON-NEGOTIABLE DOMAIN INVARIANTS

These invariants are inherited from V6 Native Foundation/V7 architecture and MUST NOT be reinterpreted by implementation agents.

1. One human person maps to one canonical `LaborProfile`.
2. `LaborProfile` is identity, not a candidate pipeline state.
3. `LaborProfile != Worker`.
4. `Availability` is independent from `CurrentRelationship`.
5. `CurrentRelationship` is primarily a projection from canonical facts/history.
6. Presence in the repository does not mean “available”.
7. A returning person reuses the existing `LaborProfile`.
8. A former HRP Worker reuses the existing `Worker`.
9. A profile may have zero or one active `PlacementCase`.
10. Repository queues are projections/queries, not mutable statuses.
11. Current state must never erase historical facts.
12. Identity confidence and profile completeness are independent concepts.
13. A possible duplicate must not be auto-merged unless the match is safe by approved rules.
14. Import/backfill must not fabricate Application, PlacementCase, Placement, Worker, or employment history.
15. Sensitive identity data must remain permission-gated.

---

# 2. V7.1 SCOPE

V7.1 includes:

```text
LaborProfile 360
Repository search
Repository filters
Identity/completeness projections
Availability history/projection
CurrentRelationship projection
Dedup candidate detection
Duplicate review workflow
Profile merge hardening
Repository operational queues
Dormant profile views
Returnee recognition
Basic reactivation candidate views
Canonical timeline projection
Security/RLS/audit
```

V7.1 does NOT include:

```text
PlacementCase Workbench UX       -> V7.2
Handling / Company Pool UX       -> V7.2
JobProposal / Matching engine    -> V7.3
Placement UX                     -> V7.4
Worker operational lifecycle UX  -> V7.5
Partner portal                   -> V7.6
Commission calculation           -> OUT OF SCOPE
Payroll                          -> OUT OF SCOPE
Internal HRM                     -> OUT OF SCOPE
Chatwoot / Zalo production       -> V7.9
AI ranking / autonomous matching -> V7.10
```

---

# 3. DELIVERY SLICES

V7.1 is split into four release slices.

```text
V7.1a — Repository Read Model + Profile 360
V7.1b — Availability + CurrentRelationship
V7.1c — Dedup + Duplicate Review
V7.1d — Repository Queues + Reactivation Foundation
```

No slice may silently implement V7.2 PlacementCase Workbench behavior.

---

# 4. V7.1a — REPOSITORY READ MODEL + PROFILE 360

## V71-001 — Define TalentRepository read contract

**Type:** Architecture / service contract  
**Dependency:** V6 Native Compatibility Gate
**Priority:** BLOCKER

Create a canonical read contract for repository list/detail screens.

The repository list must not join arbitrary tables in the frontend.

Expected service contract should expose at least:

```text
laborProfileId
displayName
normalized primary contact
identityCompleteness
verificationState
effectiveAvailability
currentRelationship
activePlacementCaseSummary?
currentHandlerSummary?
workerSummary?
lastInteractionAt?
lastIntakeAt?
lastEmploymentEventAt?
duplicateRisk?
```

### Rules

- derived values must identify their source/projection;
- no UI-local logic for employment relationship;
- no UI-local logic for availability freshness;
- no direct interpretation of Worker status columns if canonical history disagrees.

### Exit gate

Repository list can render 100% from one stable application-layer read model.

---

## V71-002 — Build LaborProfile 360 read service

**Type:** Service / projection  
**Dependency:** V71-001  
**Priority:** BLOCKER

Create canonical person-level detail response.

Sections:

```text
Identity
Contact
Completeness
Verification
Availability
Current relationship
Current job-seeking state
Current handler
Source / attribution
Recent intake
PlacementCase history summary
Placement history summary
Worker / employment history summary
Timeline
Audit-sensitive metadata where permitted
```

The page must NOT assume every profile has a Worker.

### Exit gate

A direct-hire-only profile, a current HRP Worker, and a never-worked profile all render correctly with no fake placeholder entities.

---

## V71-003 — Identity completeness projection

**Type:** Domain projection  
**Dependency:** V71-001  
**Priority:** HIGH

Do not encode a single mutable “profile status” that mixes completeness and verification.

Proposed output:

```text
MINIMAL
BASIC
OPERATIONAL
COMPLETE
```

Exact field requirements may be configurable, but implementation must keep:

```text
completeness != verification
```

### Acceptance examples

A profile may be:

```text
COMPLETE + UNVERIFIED
```

or:

```text
BASIC + VERIFIED
```

without contradiction.

---

## V71-004 — Verification projection

**Type:** Domain projection  
**Dependency:** V71-001  
**Priority:** HIGH

Suggested states:

```text
UNVERIFIED
PARTIALLY_VERIFIED
VERIFIED
REVIEW_REQUIRED
```

Do not infer verification from profile completeness.

Verification evidence must remain auditable.

---

## V71-005 — Canonical repository search service

**Type:** Query service  
**Dependency:** V71-001  
**Priority:** BLOCKER

Support:

```text
name
normalized phone
identity number where permission allows
internal profile code
worker code
previous contact identity
provider identity mapping where available
```

Requirements:

- accent-insensitive Vietnamese name search where practical;
- normalized phone lookup;
- exact lookup path optimized for create-or-match;
- fuzzy search must never mutate identity;
- sensitive identifiers must respect permission scopes.

---

## V71-006 — Repository pagination/sorting

**Type:** Query infrastructure  
**Dependency:** V71-005  
**Priority:** HIGH

Minimum sort keys:

```text
recently updated
last intake
last interaction
available from
relationship freshness
profile created
```

Avoid count-heavy queries that require full scans on every list render.

---

# 5. V7.1b — AVAILABILITY + CURRENT RELATIONSHIP

## V71-010 — Add AvailabilityObservation model

**Type:** Schema  
**Dependency:** V6 Native audit/effective-time foundation
**Priority:** BLOCKER

Recommended conceptual fields:

```text
id
laborProfileId

status
availableFrom?

observedAt
effectiveAt?
recordedAt

source
actorType
actorId?

confidence?
note?

supersedesObservationId?

createdAt
```

Canonical status set for V7.1:

```text
UNKNOWN
AVAILABLE_NOW
AVAILABLE_FROM_DATE
NOT_AVAILABLE
DO_NOT_CONTACT
```

Important:

`DO_NOT_CONTACT` may overlap privacy/contact-preference policy and must be implemented carefully so recruitment visibility does not override communication restrictions.

---

## V71-011 — Availability command service

**Type:** Domain commands  
**Dependency:** V71-010  
**Priority:** BLOCKER

Commands:

```text
recordAvailabilityObservation()
correctAvailabilityObservation()
```

No generic patch of current availability.

Required inputs:

```text
laborProfileId
status
availableFrom?
observedAt/effectiveAt
source
actor
reason/note when correction
```

### Invariants

- `AVAILABLE_FROM_DATE` requires a date;
- future date must not be silently converted to `AVAILABLE_NOW`;
- historical observation remains auditable;
- correction creates history rather than erasing the original fact.

---

## V71-012 — Effective availability projection

**Type:** Projection  
**Dependency:** V71-010  
**Priority:** BLOCKER

Return:

```text
status
effectiveStatus
availableFrom?
lastObservedAt
freshness
source
```

Example:

```text
stored status = AVAILABLE_FROM_DATE
availableFrom = 2026-10-01
today = 2026-10-03

effectiveStatus = AVAILABLE_NOW
```

without requiring a cron mutation.

---

## V71-013 — Availability freshness policy

**Type:** Policy / projection  
**Dependency:** V71-012  
**Priority:** HIGH

The system must not treat old availability as permanent truth.

Expose:

```text
FRESH
AGING
STALE
UNKNOWN
```

Exact day thresholds should be configuration/policy, not hard-wired throughout UI code.

A stale `AVAILABLE_NOW` must remain historically visible while UI indicates the need for reconfirmation.

---

## V71-014 — Build CurrentRelationship projection

**Type:** Domain projection  
**Dependency:** V6 Native Worker/Episode/Assignment foundation
**Priority:** BLOCKER

Canonical output:

```text
NEVER_WORKED
WORKING_VIA_HRP
FORMER_HRP_WORKER
WORKING_EXTERNAL
UNKNOWN
```

Priority of evidence should favor canonical HRP facts.

Suggested evaluation order:

```text
active HRP employment facts
    ↓
recent external employment observation / effective direct-hire placement
    ↓
historical HRP worker facts
    ↓
never-worked evidence
    ↓
unknown
```

This order must be validated against domain facts, not implemented as a fragile UI switch.

---

## V71-015 — Add external relationship observation foundation

**Type:** Schema / domain  
**Dependency:** V71-014  
**Priority:** HIGH

Do NOT build a full external HRM history.

Minimum conceptual model:

```text
RelationshipObservation {
  id
  laborProfileId

  relationshipType
  employerName?
  clientCompanyId?

  observedAt
  effectiveFrom?
  effectiveTo?

  source
  actor
  confidence

  relatedPlacementId?
}
```

V7.1 only needs enough to support honest `WORKING_EXTERNAL` projection.

---

## V71-016 — CurrentRelationship freshness

**Type:** Projection  
**Dependency:** V71-015  
**Priority:** HIGH

A direct-hire placement from two years ago must not imply the person is certainly still externally employed today.

Expose:

```text
relationship
lastObservedAt
freshness
confidence
previousRelationship?
```

When evidence becomes stale, projection may become `UNKNOWN` while preserving prior observed relationship in history.

---

# 6. V7.1c — DEDUP + DUPLICATE REVIEW

## V71-020 — Define identity signal catalog

**Type:** Domain contract  
**Dependency:** V6 Native identity hardening
**Priority:** BLOCKER

Signals may include:

```text
normalizedPhone
identityDocumentNumber
fullNameNormalized
dateOfBirth
gender
address signals
previousWorker linkage
provider identity
historical phone ownership
partner submission identity
```

No single mutable field is automatically “the human”.

---

## V71-021 — Create-or-match result contract

**Type:** Domain service  
**Dependency:** V71-020  
**Priority:** BLOCKER

Output must be one of:

```text
EXACT_MATCH
POSSIBLE_MATCH
NEW_PROFILE
```

Return evidence/reasons, not just a hidden score.

Example:

```text
POSSIBLE_MATCH
candidates:
- LP-001: same phone, same name, missing DOB
- LP-827: same ID number, different phone
```

---

## V71-022 — PossibleDuplicate record / review queue foundation

**Type:** Schema / workflow  
**Dependency:** V71-021  
**Priority:** BLOCKER

Conceptual model:

```text
DuplicateReviewCase {
  id

  incomingIdentityRef?
  candidateProfileIds[]

  status
  reasonSignals

  createdAt
  assignedReviewerId?
  reviewedAt?
  resolution?
  resolvedBy?
}
```

Suggested status:

```text
OPEN
UNDER_REVIEW
RESOLVED_MATCH
RESOLVED_DISTINCT
CANCELLED
```

---

## V71-023 — Duplicate Review UI

**Type:** UI  
**Dependency:** V71-022  
**Priority:** HIGH

Reviewer must see:

```text
side-by-side identity
contact history
Worker linkage
active PlacementCase conflict
ReferralAttribution
recent intake
verification evidence
source provenance
```

The UI must not encourage blind “merge because phone matches”.

---

## V71-024 — Harden mergeLaborProfiles command

**Type:** Critical domain command  
**Dependency:** V71-022 + V6 Native merge audit foundation
**Priority:** BLOCKER

Before merge check:

```text
Worker conflict
active PlacementCase conflict
ReferralAttribution conflict
verification conflict
partner attribution dispute
identity evidence sufficiency
permission
```

Required effects:

```text
preserve source profile tombstone/reference
move/relink allowed relations
record moved relations
record actor/reason
write audit
write correlationId
emit canonical merge event
```

No hard deletion of the source identity record as part of normal merge.

---

## V71-025 — Merge conflict policy

**Type:** Domain policy  
**Dependency:** V71-024  
**Priority:** HIGH

If both profiles have incompatible critical identities or each has a different Worker:

```text
merge = BLOCKED
```

and requires explicit resolution, not automatic preference.

---

## V71-026 — Merge reversal safety contract

**Type:** Hardening  
**Dependency:** V71-024  
**Priority:** MEDIUM

Do not promise universal “undo merge”.

Support reversal only if downstream facts have not made the operation unsafe.

At minimum retain enough metadata to investigate and manually repair an erroneous merge.

---

# 7. V7.1d — REPOSITORY QUEUES + REACTIVATION FOUNDATION

## V71-030 — Define repository queue catalog

**Type:** Product/query contract  
**Dependency:** V71-002 + V71-012 + V71-014  
**Priority:** BLOCKER

Initial queues/views:

```text
All Profiles
Available Now
Available From Date
Former HRP Workers
Working Via HRP
Working Externally
Relationship Unknown
Availability Unknown
Dormant
Incomplete Profiles
Verification Review
Duplicate Review
Recently Returned / Recently Re-intaked
```

Do NOT implement `Company Pool` here. That belongs to active PlacementCase handling in V7.2.

---

## V71-031 — Define Dormant projection

**Type:** Query/projection  
**Dependency:** V71-030  
**Priority:** HIGH

A dormant profile is NOT deleted and NOT necessarily available.

Conceptual rule:

```text
no active PlacementCase
not current HRP workforce
no recent interaction/intake
availability stale/unknown/not available
```

Exact freshness thresholds are policy/configuration.

---

## V71-032 — Former worker reactivation view

**Type:** Query  
**Dependency:** V71-014  
**Priority:** HIGH

Return profiles matching:

```text
CurrentRelationship = FORMER_HRP_WORKER
no active PlacementCase
```

Additional filters:

```text
last project
last job
last assignment end reason
last assignment end date
location
skills
availability freshness
last contact
```

This is a candidate list, not an automatic PlacementCase creator.

---

## V71-033 — Demand-independent reactivation candidate marker

**Type:** Projection  
**Dependency:** V71-032  
**Priority:** MEDIUM

Expose a non-authoritative signal:

```text
REACTIVATION_CANDIDATE
```

It must NOT:

```text
open PlacementCase
change Availability
create HandlingAssignment
send message
```

without explicit user/business action.

---

## V71-034 — Returnee recognition on intake

**Type:** Domain behavior  
**Dependency:** V71-021  
**Priority:** BLOCKER

When new intake matches an existing profile:

```text
reuse LaborProfile
append Intake
show previous PlacementCase history
show Worker/former Worker status
show canonical attribution
do not overwrite source
```

If job-seeking intent is confirmed, V7.2 may open/continue PlacementCase.

V7.1 itself should only expose correct repository state and returnee identity.

---

## V71-035 — Repository bulk actions policy

**Type:** UX/security  
**Dependency:** V71-030  
**Priority:** HIGH

Allowed bulk actions in V7.1 should be conservative.

Safe candidates:

```text
export permitted projection
assign verification review
tag/label non-canonical metadata
request revalidation
```

Not allowed as blind bulk actions:

```text
change canonical attribution
mark available
merge profiles
create Worker
open PlacementCase
create Placement
```

---

# 8. PROFILE 360 UI SPEC

## V71-040 — LaborProfile header

Display:

```text
Name
internal ID
primary normalized contact
identity verification
profile completeness
effective availability
current relationship
active job-seeking indicator
current HRP workforce indicator
duplicate warning
```

Avoid status-badge overload.

---

## V71-041 — Identity section

Include:

```text
canonical identity fields
contact methods
verification evidence summary
field provenance where relevant
previous contact identities
merge history
```

Sensitive fields require explicit permission.

---

## V71-042 — Current State section

Render independent cards:

```text
Availability
CurrentRelationship
Active PlacementCase summary
CurrentHandler summary
Current HRP Assignment summary
```

Do not collapse these into one “candidate status”.

---

## V71-043 — Source / attribution section

Show:

```text
canonical ReferralAttribution
partner/referrer
channel
attributedAt
evidence summary
```

and recent acquisition/intake source separately.

Do not label current handler as “source”.

---

## V71-044 — History summary

Include:

```text
PlacementCase history
Placement outcomes
Worker history
EmploymentEpisode history
Assignment history
External relationship observations
```

Repository screen may summarize; detailed Workbench/Workforce pages come later.

---

## V71-045 — Canonical person timeline

**Type:** Read projection  
**Dependency:** audit/history foundation  
**Priority:** HIGH

Combine read-only events from:

```text
identity
intake
availability
placement case
interaction
handling
placement
workforce
external relationship
beneficiary decisions
```

Each item should contain where available:

```text
event
effectiveAt
recordedAt
actor
source
context
```

Do not duplicate entire raw message transcripts.

---

# 9. REPOSITORY FILTER MODEL

## V71-050 — Core filters

Support:

```text
availability
availability freshness
current relationship
worker/former worker
profile completeness
verification
duplicate risk
location
age/date of birth where permitted
last contact range
last intake range
last project
last job
source / partner
has active PlacementCase
has active Assignment
```

---

## V71-051 — Saved views

**Type:** UX  
**Priority:** MEDIUM

Allow internal users to save query/filter definitions.

Saved views must not store snapshots of result IDs as the canonical view.

---

## V71-052 — Permission-safe counts

Counts on repository tabs must obey the same row visibility rules as the result query.

Never show a user:

```text
"2,451 profiles"
```

if they can only read 500 of them.

---

# 10. SECURITY REQUIREMENTS

## V71-060 — Permission catalog additions

Minimum candidate permissions:

```text
talent.profile.read
talent.profile.edit
talent.profile.search
talent.profile.verify
talent.profile.merge

talent.availability.record
talent.relationship.observe

talent.duplicate.review

talent.pii.basic.read
talent.pii.sensitive.read
```

Role bundles remain separate from permission definitions.

---

## V71-061 — RLS/read scope

Repository search must honor approved scope rules.

Do not implement “search all profiles” by bypassing RLS in the API layer.

Internal privileged search exceptions must be explicit and audited.

---

## V71-062 — Sensitive identity access audit

Viewing highly sensitive identity documents/fields should be auditable where required by existing HRP security policy.

V7.1 must not broaden access compared with V6 Native Foundation.

---

# 11. AUDIT / EVENT REQUIREMENTS

Canonical events recommended for V7.1:

```text
LABOR_PROFILE_CREATED
LABOR_PROFILE_MATCHED
LABOR_PROFILE_UPDATED
LABOR_PROFILE_VERIFIED
LABOR_PROFILE_MERGED

AVAILABILITY_OBSERVED
AVAILABILITY_CORRECTED

RELATIONSHIP_OBSERVED
RELATIONSHIP_CORRECTED

DUPLICATE_REVIEW_OPENED
DUPLICATE_REVIEW_RESOLVED
```

All critical commands use correlation/request IDs where supported.

---

# 12. API / COMMAND BOUNDARY

Frontend may not directly patch:

```text
currentAvailability
currentRelationship
duplicateResolution
merge target
verification state
```

through generic profile update.

Use business commands/services.

Generic profile edit remains acceptable for ordinary profile fields subject to validation and audit.

---

# 13. PERFORMANCE REQUIREMENTS

Repository is expected to become one of the highest-volume operational screens.

Minimum engineering requirements:

```text
indexed normalized phone
indexed current projection fields where materialized
pagination
no N+1 relation loading
precomputed/efficient current relationship query
efficient active PlacementCase existence lookup
efficient active Assignment existence lookup
bounded timeline pagination
```

Do not denormalize business authority merely to make UI fast.

If materialized projections are added, they must be rebuildable/reconcilable from canonical facts.

---

# 14. MIGRATION REQUIREMENTS

V7.1 must consume the V6 Native Foundation migration outputs.

Rules:

1. Do not re-run identity migration logic differently in V7.1.
2. Legacy profiles with unresolved identity stay visible with review indicators.
3. Legacy records missing PlacementCase links do not block repository rendering.
4. Legacy Worker records must still map to canonical LaborProfile.
5. Missing external relationship history must render as `UNKNOWN`, not inferred fiction.
6. Existing attribution must not be rewritten by new returnee intake.

---

# 15. PERMANENT REGRESSION FIXTURES FOR V7.1

## RF-01 — Never-worked available profile

Expected:

```text
LaborProfile exists
Worker absent
Availability = AVAILABLE_NOW
CurrentRelationship = NEVER_WORKED
```

---

## RF-02 — Current HRP worker

Expected:

```text
Worker exists
active Episode
active PRIMARY Assignment
CurrentRelationship = WORKING_VIA_HRP
```

Availability remains independent.

---

## RF-03 — Former HRP worker

Expected:

```text
Worker exists
no active Episode
CurrentRelationship = FORMER_HRP_WORKER
```

Profile remains searchable in repository.

---

## RF-04 — Direct-hire external worker

Expected:

```text
effective CLIENT_MANAGED Placement
no HRP Worker created
recent external employment evidence
CurrentRelationship = WORKING_EXTERNAL
```

---

## RF-05 — Stale external employment

Expected:

```text
old external evidence
relationship freshness stale
effective CurrentRelationship may become UNKNOWN
history still shows previous external employment
```

---

## RF-06 — Returning existing profile

Expected:

```text
new Intake
EXACT_MATCH old LaborProfile
no new LaborProfile
canonical ReferralAttribution unchanged
```

---

## RF-07 — Possible duplicate

Expected:

```text
no automatic merge
DuplicateReviewCase OPEN
both profiles remain intact
```

---

## RF-08 — Duplicate phone, distinct humans

Expected:

```text
same normalized phone is not sufficient for unsafe merge
review can resolve DISTINCT
```

---

## RF-09 — Completeness vs verification

Expected:

```text
COMPLETE + UNVERIFIED valid
BASIC + VERIFIED valid
```

---

## RF-10 — Availability from future date

Expected:

```text
stored AVAILABLE_FROM_DATE
before date -> effective AVAILABLE_FROM_DATE
after date -> effective AVAILABLE_NOW
without cron mutation
```

---

## RF-11 — Stale availability

Expected:

```text
historical AVAILABLE_NOW preserved
freshness = STALE
UI does not present it as recently confirmed truth
```

---

## RF-12 — Repository view security

Partner/client/limited internal actor cannot infer hidden profile counts or PII through list/count endpoints.

---

# 16. V7.1 EXIT GATE

V7.1 is DONE only when all items below pass.

## Canonical identity

```text
[ ] one-person/one-LaborProfile invariant remains intact
[ ] returnee intake reuses canonical profile
[ ] possible duplicates never silently merge
[ ] merge conflicts are guarded
```

## Repository

```text
[ ] repository list uses canonical read service
[ ] Profile 360 renders all major profile types
[ ] direct-hire-only profile works without Worker
[ ] former Worker history remains intact
```

## Availability

```text
[ ] availability history is append/audit oriented
[ ] AVAILABLE_FROM_DATE works without scheduled mutation
[ ] stale availability is visibly stale
[ ] DO_NOT_CONTACT is respected by communication surfaces
```

## CurrentRelationship

```text
[ ] WORKING_VIA_HRP derives from canonical workforce facts
[ ] FORMER_HRP_WORKER derives from history
[ ] external employment uses explicit evidence/observation
[ ] stale external evidence does not remain permanent truth
```

## Dedup

```text
[ ] create-or-match returns EXACT / POSSIBLE / NEW
[ ] Duplicate Review queue works
[ ] merge command validates critical conflicts
[ ] merge is fully audited
```

## Security

```text
[ ] permission catalog implemented
[ ] repository search obeys scope/RLS
[ ] sensitive PII remains protected
[ ] counts do not leak hidden rows
```

## Regression

```text
[ ] RF-01 through RF-12 pass
```

---

# 17. HANDOFF TO V7.2

V7.2 may start only after the V7.1 exit gate passes.

V7.2 will own:

```text
PlacementCase 360
InteractionOutcome
NextAction
HandlingAssignment UX
Company Pool
My Work
Manager Workbench
SLA projections
```

V7.2 must consume, not redefine:

```text
LaborProfile identity
Availability
CurrentRelationship
repository search
dedup/create-or-match
canonical attribution
```

---

# 18. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V71-001
V71-002
V71-003
V71-004
V71-005
V71-006

Batch B
V71-010
V71-011
V71-012
V71-013

Batch C
V71-014
V71-015
V71-016

Batch D
V71-020
V71-021
V71-022

Batch E
V71-023
V71-024
V71-025
V71-026

Batch F
V71-030
V71-031
V71-032
V71-033
V71-034
V71-035

Batch G
V71-040 through V71-052

Batch H
V71-060 through V71-062
audit/event hardening
performance/reconciliation

Batch I
RF-01 through RF-12
V7.1 EXIT GATE
```

Parallel execution is allowed only when tasks do not modify the same invariant or schema authority.

---

# 19. ARCHITECTURAL WARNING FOR IMPLEMENTATION AGENTS

Do not introduce shortcuts such as:

```text
LaborProfile.status = ACTIVE_CANDIDATE
LaborProfile.ownerId = recruiter
LaborProfile.currentCompanyId = ...
LaborProfile.isWorking = true/false
LaborProfile.isAvailable = true/false
```

as canonical business authority.

Those shortcuts collapse independent domains and will conflict with V7.2–V7.5.

Prefer canonical facts + explicit projections.

---

# 20. PRODUCT OUTCOME

After V7.1, HRP should be able to answer reliably:

```text
Who is this person?
Have we seen them before?
What is the quality/completeness of the profile?
Are they currently available?
How fresh is that availability?
Are they working through HRP?
Were they an HRP worker before?
Are they believed to be working elsewhere?
When was that last confirmed?
What is their historical relationship with HRP?
Where did they originally come from?
Do we suspect a duplicate?
Can this person safely be reactivated for future recruitment?
```

That is the foundation required before Talent Workbench, Matching, Placement, Partner, and Workforce modules can safely operate.
