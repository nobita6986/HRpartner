# HRP V7 — Workforce Supply Operating System

> Status: Target Architecture / Domain Source of Truth
> Product: HRP
> Version: V7
> Scope: end-to-end workforce supply operations for HRP as a manpower intermediary/provider.
> Preconditions: V6 Native Compatibility Gate passed.
>
> Naming note: historical “V6+” references mean the compatibility workstream now
> embedded in V6 by `docs/V6/V6_change.md`.
> Explicitly out of scope: Payroll engine, internal HRM, commission amount/formula calculation.

---

## 1. Product definition

HRP V7 is the operating system for the full workforce-supply lifecycle of HRP:

```text
client demand
 -> talent acquisition / repository
 -> job-search case management
 -> matching / proposal / application
 -> placement
 -> HRP-managed workforce OR client-managed hire
 -> partner/source/handling/beneficiary tracking
 -> canonical events for external systems
```

HRP V7 is not a generic ATS, not a generic HRM, and not a payroll/commission calculation engine.

The core product goal is to preserve a long-lived canonical relationship with every person while separately modeling each recruiting episode, placement outcome and workforce episode.

---

## 2. Top-level architecture

```text
                           HRP V7
                 WORKFORCE SUPPLY OPERATING SYSTEM

CLIENT / DEMAND
ClientCompany
  -> Project
     -> StaffingOrder
        -> JobOpening
           -> ServiceModel
           -> WorkClassification
           -> JobPosting

TALENT SUPPLY
Marketplace / Zalo / Phone / CTV / AFF / Vendor / Import / Walk-in / Relationship
  -> LaborProfileIntake
     -> Create-or-Match
        -> LaborProfile
           -> Identity / Verification / Dedup
           -> Availability
           -> CurrentRelationship
           -> ReferralAttribution
           -> PlacementCase[]
              -> Application[]
              -> JobProposal[]
              -> InteractionOutcome[]
              -> NextAction[]
              -> HandlingAssignment[]
              -> Placement[]

PLACEMENT OUTCOME
Placement EFFECTIVE
  -> CLIENT_MANAGED
     -> direct hire / referral
     -> no Worker required
     -> LaborProfile remains in HRP repository
  -> HRP_MANAGED
     -> Worker
        -> EmploymentEpisode[]
           -> ProjectAssignment[]

PARTNER / INCENTIVE
SupplyPartner
ReferralAttribution
HandlingAssignment
Placement EFFECTIVE
  -> CommissionBeneficiaryDecision[]
     -> external Python commission app
```

---

## 3. Bounded contexts

### 3.1 Client Relationship

Authority:

- `ClientCompany`
- `ClientContact`
- `CrmLead` (commercial leads only)
- `SalesOpportunity`
- `ClientInteraction`
- `ClientNextAction`

This context manages commercial relationship and follow-up. It must not become the canonical place for talent/workforce data.

### 3.2 Demand Operations

Authority:

- `Project`
- `ProjectResponsibility`
- `StaffingOrder`
- `JobOpening`
- `JobPosting`
- `ServiceModel`
- `WorkClassification`

`JobOpening` is the primary unit of fulfillment. `StaffingOrder` is the client request/container. `JobPosting` is public content/projection, not operational truth.

### 3.3 Talent Repository

Authority:

- `LaborProfile`
- `LaborProfileIntake`
- identity normalization / dedup
- verification/completeness
- availability observations/projection
- current relationship projection

The HRP Talent Repository is the entire set of canonical LaborProfiles. It is not limited to currently available candidates.

### 3.4 Talent Operations

Authority:

- `PlacementCase`
- `InteractionOutcome`
- `NextAction`
- `HandlingAssignment`
- Company Pool projection

PlacementCase is the unit of work for one job-search/reassignment episode.

### 3.5 Matching & Placement

Authority:

- `Application` / existing `CandidateSubmission` persistence as compatible implementation
- `JobProposal`
- `PlacementPreference`
- `Placement`

`Application` is candidate-initiated interest. `JobProposal` is HRP-initiated suggestion. `Placement` is the concrete attempt/outcome linking a person to demand.

### 3.6 Supply Partner Network

Authority:

- `SupplyPartner`
- partner membership/auth mapping
- partner submission batches
- `ReferralAttribution`
- case acquisition source
- attribution dispute workflow

Partner identity is not the same as a login User.

### 3.7 Workforce Operations

Authority:

- `Worker`
- `EmploymentEpisode`
- `ProjectAssignment`
- transfer / termination / rehire commands

This context exists only when HRP continues to manage the workforce lifecycle.

### 3.8 Beneficiary & Integration Boundary

Authority:

- `CommissionBeneficiaryDecision`
- canonical business events / outbox

HRP decides who is eligible as beneficiary and why. HRP does not calculate commission money.

---

## 4. Core aggregate definitions

### 4.1 LaborProfile

Definition:

> Canonical long-lived identity of a person known to HRP.

A LaborProfile remains in the HRP repository whether the person is:

- seeking work;
- working through HRP;
- working externally;
- a former HRP worker;
- temporarily unavailable;
- dormant/unknown;
- returning years later.

Rules:

- one person -> one canonical LaborProfile;
- all intake channels use the same create-or-match authority;
- possible duplicates require review rather than unsafe auto-merge;
- LaborProfile is not owned permanently by a recruiter;
- LaborProfile does not directly encode every changing lifecycle state.

### 4.2 PlacementCase

Definition:

> One episode in which HRP helps a LaborProfile find, change or be reassigned to work.

Rules:

- a LaborProfile may have many historical cases;
- max one active PlacementCase per LaborProfile;
- one case can contain multiple Applications, JobProposals and Placement attempts;
- a closed case normally remains closed; a later return creates a new case;
- general-interest is represented by a case that may initially have no JobOpening;
- a case closes success only when a Placement becomes EFFECTIVE.

Suggested high-level state model:

```text
status: OPEN | IN_PROGRESS | READY_TO_PLACE | CLOSED

stage:
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

Close reason is separate from status.

### 4.3 JobOpening

Definition:

> Operational unit of demand that HRP must fulfill.

Graph:

```text
ClientCompany
 -> Project
    -> StaffingOrder
       -> JobOpening
          -> JobPosting
```

Rules:

- Project is operational collaboration context;
- StaffingOrder is a client request/container;
- JobOpening is the fulfillment unit;
- JobPosting is public content and may not exist for a valid JobOpening;
- an Opening can be worked from internal Talent Repository even when unpublished;
- fulfillment is not permanently defined as Assignment count.

### 4.4 Placement

Definition:

> A concrete attempt/outcome of matching a LaborProfile/PlacementCase to a JobOpening/client demand.

A PlacementCase may have multiple Placement attempts.

Example:

```text
Placement Samsung -> FAILED / NO_SHOW
Placement Actro   -> EFFECTIVE
```

Suggested lifecycle:

```text
SELECTED
CONFIRMED
EFFECTIVE
FAILED
CANCELLED
```

Placement retains snapshot/provenance such as:

- service model;
- client/project/job;
- source Application or JobProposal when available;
- effective timestamps;
- confirmation source/evidence;
- actor metadata.

### 4.5 Worker

Definition:

> Long-lived operational workforce identity for a LaborProfile after HRP actually begins managing that person's workforce lifecycle.

Rules:

- LaborProfile 1 -> 0..1 Worker;
- direct-hire/referral outcomes do not create Worker merely for reporting;
- Worker persists across exit and rehire;
- rehire creates a new EmploymentEpisode, not a new Worker.

### 4.6 EmploymentEpisode

Definition:

> One continuous period in which a Worker remains inside HRP-managed workforce.

Transfer between projects without leaving HRP workforce stays in the same Episode.

Actual exit closes the Episode. Later rehire opens a new Episode.

### 4.7 ProjectAssignment

Definition:

> Actual operational placement of a Worker into a Project/Job over an effective time range.

Rules:

- at most one active PRIMARY Assignment per Worker in V7 MVP;
- transfer ends previous primary Assignment and starts a new one;
- Assignment may link to Placement;
- legacy Assignment may lack Placement when history cannot be truthfully reconstructed;
- current assignment is a projection from active Assignment, not a mutable Worker field.

---

## 5. Independent state dimensions for LaborProfile

Do not use one giant `status` field.

### 5.1 Identity / verification

Examples:

```text
completeness: MINIMAL | COMPLETE | ...
verification: UNVERIFIED | VERIFIED | ...
```

Completeness and verification are independent concepts.

### 5.2 Availability

Suggested model:

```text
UNKNOWN
AVAILABLE_NOW
AVAILABLE_FROM_DATE
NOT_AVAILABLE
DO_NOT_CONTACT
```

Availability records should keep freshness/provenance:

```text
status
availableFrom?
observedAt
source
actor?
```

Availability is not the same as current employment relationship.

### 5.3 CurrentRelationship

Suggested projection:

```text
NEVER_WORKED
WORKING_VIA_HRP
FORMER_HRP_WORKER
WORKING_EXTERNAL
UNKNOWN
```

Rules:

- WORKING_VIA_HRP derives from active workforce relations;
- FORMER_HRP_WORKER derives from historical Worker/Episode with no active Episode;
- WORKING_EXTERNAL relies on external observation/placement evidence and should preserve freshness/confidence;
- CurrentRelationship should not be freely edited as a dropdown.

### 5.4 Job-seeking state

Derived from existence/stage of active PlacementCase.

### 5.5 Handling state

Derived from active HandlingAssignment for the active PlacementCase.

---

## 6. Talent Repository vs Company Pool

### Talent Repository

All canonical `LaborProfile` records HRP is allowed to retain/manage.

### Company Pool

Operational projection:

```text
active PlacementCase
AND no valid active HandlingAssignment
```

A person can remain in the Talent Repository for years without appearing in Company Pool.

---

## 7. Intake and identity resolution

All channels must converge through the same identity authority:

```text
Marketplace
Zalo
Phone
CTV
AFF
Vendor
Import
Walk-in
Relationship
 -> Intake
 -> normalize
 -> create-or-match
 -> EXACT_MATCH | POSSIBLE_MATCH | NEW_PROFILE
```

Do not create separate person authorities such as ZaloCandidate, VendorCandidate, MarketplaceCandidate, etc.

Identity signals may include normalized phone, identity document, name, date of birth, historical provider identity and other evidence, but no single mutable field should be treated as the permanent person identity.

Possible matches go to review.

---

## 8. Application vs JobProposal

```text
Application = candidate initiated
JobProposal = HRP initiated
```

If a worker applies to Samsung but HRP recommends Actro, do not fabricate an Actro Application.

Placement provenance may point to an Application or JobProposal but must remain nullable for legitimate legacy/backfill cases.

---

## 9. ServiceModel

Canonical V7 taxonomy:

| ServiceModel | Derived management mode | Workforce action after effective placement |
|---|---|---|
| `STAFFING_SUPPLY` | HRP_MANAGED | Worker/Episode/Assignment |
| `LABOR_LEASING` | HRP_MANAGED | Worker/Episode/Assignment |
| `RECRUITMENT_SERVICE` | CLIENT_MANAGED | No Worker creation |
| `REFERRAL_SERVICE` | CLIENT_MANAGED | No Worker creation |

`WorkClassification` is independent, e.g. TEMPORARY, FIXED_TERM, PERMANENT, SEASONAL, etc.

Canonical ServiceModel lives on JobOpening for new operational demand; Placement stores a snapshot so history does not change when the Opening changes later.

---

## 10. Placement effective semantics

### HRP-managed

Placement becomes EFFECTIVE when actual HRP-managed workforce starts.

Canonical transition should atomically ensure:

```text
Worker exists
EmploymentEpisode active/opened
PRIMARY ProjectAssignment starts
Placement -> EFFECTIVE
PlacementCase -> CLOSED_SUCCESS
beneficiary facts snapshot/evaluated
outbox events written
```

### Client-managed

Placement becomes EFFECTIVE when client employment start is canonically confirmed.

Result:

```text
Placement -> EFFECTIVE
PlacementCase -> CLOSED_SUCCESS
no Worker/Episode/Assignment required
LaborProfile remains in repository
CurrentRelationship may become WORKING_EXTERNAL via observation/projection
```

### Failed placement

A confirmed placement may fail/no-show without closing the case.

The case may return to MATCHING and later produce another Placement attempt.

---

## 11. Demand fulfillment

JobOpening fulfillment is based on effective Placement according to ServiceModel.

Do not permanently define:

```text
fulfilled = active Assignment count
```

For HRP-managed demand, Assignment start is strong evidence for effective Placement.

For client-managed demand, effective Placement has no Assignment.

Separate metrics:

```text
Effective Placements
Current Active Workers
Ended Workers/Assignments
```

These answer different questions and must not be conflated.

---

## 12. Talent Workbench / CRM operations

Core objects:

```text
PlacementCase
InteractionOutcome
NextAction
HandlingAssignment
Queue/SLA projections
```

### InteractionOutcome

Records what happened:

```text
who contacted
when
channel
direction
outcome
summary
related case/job/placement
```

Raw omnichannel transcripts are not canonical HRP InteractionOutcome records.

### NextAction

Records what must happen next.

Suggested types:

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

Store only primary lifecycle states such as OPEN/DONE/CANCELLED. `OVERDUE` is a projection from dueAt.

Operational principle:

> An active PlacementCase after first touch should normally have a NextAction or explicit waiting condition.

### HandlingAssignment

Authority for current recruiting responsibility.

Rules:

- belongs to PlacementCase;
- max one active handling per case;
- source/referral remains independent;
- transfer ends old assignment and creates a new record;
- handler may release early to pool if policy permits;
- expiration returns active case to Company Pool projection.

Suggested assignment sources:

```text
AFF_INITIAL
MANAGER_ASSIGNMENT
POOL_CLAIM
MANUAL_TRANSFER
SYSTEM_ROUTING
RETURNING_CASE
```

### SLA

Keep separate:

```text
Handling SLA -> HandlingAssignment.expiresAt
Action SLA   -> NextAction.dueAt
```

Do not mix the two.

---

## 13. Workbench UX principles

Recruiter home is an action board, not a static dashboard.

Suggested priority:

```text
1. overdue NextActions
2. ready-to-start needing confirmation
3. due today
4. handling expiry < 24h
5. new untouched cases
6. AVAILABLE_NOW with no proposal
7. other active cases
```

Queue membership is derived; do not create one status per UI queue.

A profile/case may appear in multiple relevant views such as:

```text
My Cases + Seeking Work + Overdue Callback
```

Recommended UX principle: one-screen interaction recording that can capture outcome, availability update, case transition, job response and next action in one business command.

---

## 14. Partner / supply network

### 14.1 SupplyPartner

Business identity for external supply partners such as CTV/Vendor.

Do not model a Vendor as one User.

Conceptually:

```text
SupplyPartner
 -> PartnerMembers / linked auth users
```

### 14.2 Attribution vs channel

Separate:

```text
Partner = who brought the source?
Attribution channel = how was it captured?
```

Examples:

```text
partner = CTV A, channel = AFF_LINK
partner = Vendor X, channel = IMPORT
```

### 14.3 ReferralAttribution

Long-lived provenance attached to LaborProfile.

It does not expire merely because handling expires.

Existing profiles must not receive a new canonical attribution merely because another partner re-submits the same person.

### 14.4 Case acquisition source

A returning existing profile may begin a new case through a different acquisition source while canonical referral provenance remains unchanged.

This separates:

```text
who first brought the person into HRP
from
who/channel reactivated the current job-search episode
```

### 14.5 AFF clocks

```text
30-day attribution window != 7-day handling window
```

Locked rule: 7-day handling starts with active PlacementCase opening, not mere LaborProfile creation/match.

---

## 15. Commission beneficiary boundary

HRP does not calculate commission money.

HRP stores only canonical entitlement/beneficiary decisions.

Recommended entity:

```text
CommissionBeneficiaryDecision
```

A Placement can have multiple beneficiary decisions, e.g.:

```text
SOURCE  -> CTV A
HANDLER -> HRP employee B
VENDOR_SOURCE -> Vendor X
```

Each decision may retain:

- beneficiary type + ID;
- beneficiary role;
- basis;
- linked handling/attribution evidence;
- milestone;
- decidedAt / decidedBy;
- status;
- reason.

Beneficiary is snapshot at the effective milestone. It must not be recalculated later simply from current handler.

Disputes create/supersede decisions with history; do not silently mutate beneficiary IDs.

External Python app receives canonical facts/events and owns rate, amount, formula, tier and related monetary calculations.

---

## 16. Workforce lifecycle

### First workforce entry

```text
Placement EFFECTIVE (HRP_MANAGED)
 -> create/reuse canonical Worker
 -> start EmploymentEpisode
 -> start PRIMARY Assignment
```

### Transfer without HRP exit

```text
PlacementCase for reassignment when there is a real matching process
 -> Placement effective
 -> old PRIMARY Assignment ENDED / TRANSFERRED
 -> new PRIMARY Assignment ACTIVE
 -> same Worker
 -> same EmploymentEpisode
```

Administrative corrections do not require fake PlacementCases.

### Exit

```text
end Assignment
 -> if leaving HRP workforce, end EmploymentEpisode
 -> CurrentRelationship = FORMER_HRP_WORKER projection
```

Do not automatically set Availability to AVAILABLE_NOW or open a PlacementCase just because the worker left.

### Rehire

```text
same LaborProfile
same Worker
new PlacementCase
new Placement
new EmploymentEpisode
new Assignment
```

---

## 17. Client CRM / B2B

V7 includes only the commercial CRM required to support workforce supply operations.

Recommended graph:

```text
CrmLead
 -> ClientCompany
    -> ClientContact[]
    -> SalesOpportunity[]
    -> Project[]
       -> StaffingOrder[]
          -> JobOpening[]
```

Rules:

- CrmLead is commercial only, never used for LaborProfile;
- ClientCompany is the canonical company entity shared by CRM and Demand;
- SalesOpportunity is commercial pipeline;
- StaffingOrder is operational demand;
- Opportunity != StaffingOrder and they are not necessarily 1:1;
- Project is operational collaboration context;
- Client CRM does not become a generic enterprise CRM/CPQ system in V7.

Minimum V7 Client CRM:

```text
ClientContact
SalesOpportunity
ClientInteraction
ClientNextAction
```

Deep contract management, quote/CPQ, pricing engine and external generic Sales CRM remain deferred unless real operational gaps justify them.

Direct-hire Placement requires a canonical client-confirmation path.

---

## 18. Responsibility model

Do not use one generic `ownerId` across domains.

Keep distinct:

```text
Account / commercial responsibility
Project responsibility
PlacementCase handling
Referral provenance
Commission beneficiary
```

Examples:

```text
Samsung account manager = A
Samsung project manager  = B
candidate case handler   = C
referral source          = Partner D
beneficiary              = C and/or D by policy
```

All are valid simultaneously.

---

## 19. Security architecture

Layers:

```text
Authentication
 -> Permission catalog
 -> Domain command authorization
 -> RLS / row visibility
 -> Audit/history
```

Roles are permission bundles. Domain services authorize business commands, not role names.

Prefer command permissions such as:

```text
talent.case.handle
talent.case.transfer
placement.confirm
placement.mark_effective
placement.override
workforce.assignment.start
workforce.assignment.transfer
partner.attribution.override
beneficiary.decide
beneficiary.override
```

Visibility scopes may include:

```text
OWN
TEAM
ASSIGNED_PROJECT
PARTNER_OWN
ALL
```

`OWN` is contextual, e.g. active HandlingAssignment for Talent Operations, not a permanent LaborProfile owner.

PII/sensitive PII needs separate permissions.

Partner/client portals receive minimal projections, not unrestricted canonical records.

---

## 20. Command boundaries

Critical transitions must be business commands, not generic PATCH status updates.

Examples:

```text
openPlacementCase
recordInteraction
assignHandling
transferHandling
releaseHandling
createPlacement
confirmPlacement
markPlacementEffective
failPlacement
startAssignment
transferWorker
endAssignment
resolveAttributionDispute
confirmBeneficiary
voidPlacement
```

Each command should define:

- authorization;
- preconditions;
- transition rules;
- transaction boundary;
- effective/recorded time;
- actor/source;
- audit;
- outbox events;
- idempotency;
- concurrency control.

Critical lifecycle data should not be hard-deleted during normal operations. Use explicit states such as ENDED, CANCELLED, VOIDED, SUPERSEDED.

---

## 21. Audit and effective-time model

For critical movements preserve:

```text
effectiveAt
recordedAt
recordedBy / actor
source
reason/evidence when relevant
```

Example:

```text
worker left on 08/09
HRP recorded it on 10/09
```

Both facts must remain visible.

Use relational canonical tables + domain history + append audit + transactional outbox. Full event sourcing is not required.

A common `correlationId` is recommended when one business command creates several domain events/effects.

---

## 22. Integration architecture

### HRP

System of Record for:

- canonical person identity;
- job-search cases;
- demand;
- placement;
- workforce lifecycle;
- attribution;
- handling;
- beneficiary decisions.

### Chatwoot

System of Engagement for:

- raw inbox/conversation/message;
- agent/team/channel productivity;
- omnichannel transport.

Chatwoot must not directly create Worker/Assignment or mutate canonical HRP lifecycle tables.

### Zalo OA / future channels

Use provider adapters behind an integration/anti-corruption layer with:

- verified inbound events;
- normalization;
- identity resolution;
- idempotency;
- retry/DLQ/replay/reconciliation;
- safe outbound state management.

### Python applications

External calculation/application layer for payroll and commission calculation. HRP emits canonical facts/events and does not own calculation formulas.

---

## 23. Canonical event backbone

Recommended events include:

```text
LABOR_PROFILE_CREATED
LABOR_PROFILE_MATCHED
PLACEMENT_CASE_OPENED
PLACEMENT_CASE_CLOSED
APPLICATION_CREATED
JOB_PROPOSED
HANDLING_ASSIGNED
HANDLING_EXPIRED
HANDLING_TRANSFERRED
PLACEMENT_SELECTED
PLACEMENT_CONFIRMED
PLACEMENT_EFFECTIVE
PLACEMENT_FAILED
WORKER_CREATED
EMPLOYMENT_EPISODE_STARTED
ASSIGNMENT_STARTED
ASSIGNMENT_ENDED
WORKER_TRANSFERRED
EMPLOYMENT_EPISODE_ENDED
WORKER_REHIRED
BENEFICIARY_CONFIRMED
BENEFICIARY_SUPERSEDED
```

Events support audit/integration/reconciliation; they do not require full event sourcing.

---

## 24. V7 product phases

### V7.1 Talent Repository

- LaborProfile 360;
- identity/dedup review;
- availability;
- current relationship;
- repository filters;
- canonical timeline.

### V7.2 Talent Workbench

- PlacementCase 360;
- InteractionOutcome;
- NextAction;
- HandlingAssignment;
- Company Pool;
- My Work / Manager Workbench;
- SLA projections.

### V7.3 Matching & JobProposal

- Applications;
- JobProposals;
- placement preferences;
- person-first matching;
- demand-first talent search;
- structured manual filtering before AI ranking.

### V7.4 Placement & ServiceModel UX

- placement attempts;
- confirm/effective/fail/no-show;
- HRP-managed vs client-managed workflows;
- direct-hire client confirmation;
- JobOpening fulfillment projections.

### V7.5 Workforce Operations

- Worker 360;
- EmploymentEpisode;
- Assignment;
- transfer;
- exit;
- rehire.

### V7.6 Partner Network

- SupplyPartner;
- CTV/Vendor intake;
- partner submission batches;
- ReferralAttribution;
- case acquisition source;
- partner portal projections;
- attribution dispute flow.

### V7.7 Beneficiary Integration

- CommissionBeneficiaryDecision;
- beneficiary dispute/override history;
- outbox events to Python app.

### V7.8 Client CRM

- ClientContact;
- SalesOpportunity;
- ClientInteraction;
- ClientNextAction;
- Client Workbench;
- direct-hire confirmation support.

### V7.9 Omnichannel

- Chatwoot technical integration;
- Zalo OA production adapter;
- channel expansion only after first channel is stable.

### V7.10 Intelligence

- reactivation suggestions;
- matching ranking;
- AI summary/draft;
- next-best-action;
- funnel/no-show risk;
- anomaly detection.

AI must operate on structured canonical domain facts and should not be used to compensate for missing data semantics.

---

## 25. Deferred / out-of-scope

### Explicitly outside HRP V7 core

- Payroll calculation;
- Internal HRM;
- Commission amount/rate/formula/tier calculation.

### Deferred until justified

- deep contract management / e-sign;
- enterprise CPQ / quote engine;
- sophisticated pricing/margin engine;
- generic second Sales CRM;
- secondary concurrent Assignments as an operational workflow;
- TransferRequest approval workflow;
- full external-employment HRM tracking;
- advanced AI automation / auto-send;
- full event sourcing.

---

## 26. Architecture acceptance rules

A future design/change should be rejected or explicitly reviewed if it:

1. creates a second canonical person identity outside LaborProfile;
2. treats Application as actual Placement/Assignment;
3. creates Worker for client-managed direct-hire outcomes merely for reporting;
4. overwrites referral source when handler changes;
5. derives commission beneficiary only from current handler at query time;
6. uses generic ownerId as authority across unrelated contexts;
7. makes Company Pool a separate person database/status;
8. rewrites history instead of recording effective movement/correction;
9. lets external CRM/channel systems write canonical lifecycle tables directly;
10. introduces payroll/internal HRM/commission formula logic into V7 core;
11. fabricates migration history to satisfy new non-null relationships;
12. allows UI status patches to bypass command invariants.

---

## 27. Target outcome

When V7 is complete, HRP should be able to answer, from canonical data:

```text
Who is this person?
How did HRP first acquire them?
Are they currently available?
What is their current employment relationship?
What job-search episode is active?
Who is currently responsible for the case?
What has been done and what must happen next?
Which jobs did they apply to vs which jobs HRP proposed?
Which placements were attempted, failed or became effective?
Was the successful outcome client-managed or HRP-managed?
If HRP-managed, where is the Worker actually assigned now?
What is their complete HRP workforce history?
Which client demand was fulfilled?
Which partner/source was involved?
Who was recognized as commission beneficiary at the milestone?
What canonical events should external systems consume?
```

That is the operational definition of HRP V7 as a Workforce Supply Operating System.
