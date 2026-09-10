# HRP V7 — Implementation Roadmap

> Status: Execution Roadmap / Phase Contract  
> Product: HRP  
> Target: V7 — Workforce Supply Operating System  
> Upstream authority: `V7_ARCHITECTURE.md`  
> Entry prerequisite: `V6_PLUS_IMPLEMENTATION_BACKLOG.md` M5 / V7 Compatibility Gate passed  
> Conflict authority: `V6_V7_CONFLICT_CHANGE_REGISTER.md`  
> Explicitly out of scope: Payroll engine, internal HRM, commission amount/formula calculation.

---

## 0. Purpose of this roadmap

This document converts the V7 target architecture into an implementation sequence that can be executed by AI coding agents without re-interpreting the domain.

It intentionally does **not** decompose every capability into coding tasks yet. Its purpose is to lock:

- phase order;
- dependencies;
- what can run in parallel;
- the business value produced by each phase;
- the aggregate authority introduced or activated in each phase;
- mandatory security/audit behavior;
- permanent regression scenarios;
- exit gates that must pass before dependent phases start.

Detailed coding backlogs should be generated from this roadmap one phase at a time.

---

# 1. Document authority and implementation rules

## 1.1 Source-of-truth order

When documents disagree, use this order:

1. explicit locked Owner Decisions recorded in V7 architecture / V6+ conflict register;
2. `V7_ARCHITECTURE.md` for V7 domain semantics;
3. `V6_PLUS_IMPLEMENTATION_BACKLOG.md` for bridge/migration prerequisites;
4. `V6_PLUS_PLAN.md`;
5. `V6_V7_CONFLICT_CHANGE_REGISTER.md` for superseded V6/CRM wording;
6. older V6 and CRM design documents only for non-superseded behavior.

AI coding agents must not silently reconcile conflicts themselves.

## 1.2 V7 cannot repair unfinished V6+ work locally

If a V7 task discovers that any of the following are not satisfied, stop that task and route the gap back to V6+:

- canonical LaborProfile/create-or-match not stable;
- PlacementCase persistence or one-active-case invariant missing;
- HandlingAssignment still profile-owned;
- source/handler/beneficiary inference still coupled;
- Placement not independent from Assignment;
- Worker can be duplicated per LaborProfile;
- critical movement lacks effective-time/audit contract;
- required command permission/RLS is absent;
- migration unresolved rows are being silently normalized.

Do not implement a V7 UI workaround around a missing V6+ invariant.

## 1.3 Additive evolution first

V7 continues the same migration philosophy as V6+:

```text
ADD
 -> ADOPT
 -> SWITCH AUTHORITY
 -> OBSERVE
 -> CLEANUP LATER
```

Do not combine new capability work with cosmetic destructive cleanup unless the cleanup is required for correctness.

## 1.4 Business commands, not generic CRUD

Critical transitions must go through domain commands.

Examples:

```text
openPlacementCase
recordAvailabilityObservation
recordInteraction
createNextAction
assignHandling
claimPlacementCase
releaseHandling
transferHandling
proposeJob
selectPlacement
confirmPlacement
markPlacementEffective
failPlacement
startAssignment
transferWorker
endAssignment
confirmBeneficiary
resolveAttributionDispute
```

No V7 UI may become authoritative by directly writing critical status fields.

## 1.5 Every phase ships with security and audit

Security is not a later hardening phase.

Every new aggregate/action must define:

- permission;
- data scope;
- RLS behavior where applicable;
- actor/source semantics;
- audit behavior;
- idempotency for repeatable commands;
- concurrency behavior for contested state.

---

# 2. V7 phase map

```text
V6+ M5 — V7 Compatibility Gate
        |
        v
V7.1 Talent Repository
        |
        v
V7.2 Talent Workbench
        |
        +-----------------------------+
        |                             |
        v                             v
V7.3 Matching & JobProposal      V7.8 Client CRM foundation*
        |                             |
        v                             |
V7.4 Placement & ServiceModel UX <----+
        |
        v
V7.5 Workforce Operations
        |
        +-------------------+
        |                   |
        v                   v
V7.6 Partner Network    V7.8 Client CRM full operational flow
        |
        v
V7.7 Beneficiary Integration
        |
        v
V7.9 Omnichannel
        |
        v
V7.10 Intelligence
```

`*` Client CRM schema/read-only foundations may begin after the V6+ gate if they do not change or delay Talent/Placement/Workforce authority. Its direct-hire confirmation path cannot be considered complete before V7.4.

---

# 3. Cross-phase hard gates

## G0 — V7 Entry Gate

Source: V6+ M5.

Must be green before any V7 feature is enabled for production users.

Minimum conditions:

- one canonical LaborProfile authority;
- create-or-match is shared across new intake paths;
- PlacementCase exists;
- max one active PlacementCase per LaborProfile;
- new Application is case-aware;
- HandlingAssignment is PlacementCase-aware;
- max one active HandlingAssignment per case;
- Company Pool can be derived;
- canonical ReferralAttribution cannot be silently overwritten by a returning/referral intake;
- Placement exists independently from Assignment;
- `JobOpening.serviceModel` foundation exists;
- Worker uniqueness per LaborProfile is enforced;
- no-show path cannot create a real EmploymentEpisode;
- effectiveAt/actor/source/audit foundation exists;
- critical commands are permissioned/idempotent;
- unresolved legacy data is reported rather than fabricated.

## G1 — Talent Repository Ready

Required before V7.2 is considered production-ready.

## G2 — Manual Talent Operations Ready

Required before any Chatwoot/Zalo production dependency.

## G3 — Matching/Placement Ready

Required before V7.5 workforce activation and beneficiary production events.

## G4 — Workforce Lifecycle Ready

Required before workforce reporting is switched fully to V7 projections.

## G5 — Partner/Beneficiary Ready

Required before partner commission-beneficiary facts are published externally.

## G6 — Omnichannel Production Ready

Required before adding a second production messaging channel.

---

# 4. V7.1 — Talent Repository

## 4.1 Goal

Turn the existing LaborProfile foundation into the operational **HRP Talent Repository**: the canonical long-lived repository of people known to HRP.

The repository is not an “available candidates table”. It contains people who are:

- actively seeking work;
- working through HRP;
- working externally;
- former HRP workers;
- not currently available;
- dormant/unknown;
- returning after a long period.

## 4.2 Primary business value

After V7.1 HRP must be able to answer reliably:

- Have we seen this person before?
- What is the canonical profile?
- What are the person's previous job-search/workforce episodes?
- What do we currently know about availability?
- What is the current relationship with HRP?
- What facts are fresh and which are stale?
- Which possible duplicates require review?

## 4.3 Core capabilities

### Repository search

Search by normalized identifiers and useful operational fields without creating new identities.

### LaborProfile 360

Must show:

- canonical identity;
- profile completeness;
- verification state;
- contact identities;
- source/referral provenance;
- availability observation and freshness;
- current relationship projection;
- historical PlacementCases;
- Worker link if one exists;
- employment/assignment summary;
- canonical timeline projection.

### Dedup review

Possible matches are reviewed rather than auto-merged.

### Availability observations

Suggested domain values:

```text
UNKNOWN
AVAILABLE_NOW
AVAILABLE_FROM_DATE
NOT_AVAILABLE
DO_NOT_CONTACT
```

Availability must include provenance/freshness semantics and must not be inferred permanently from an old interaction.

### CurrentRelationship projection

Suggested values:

```text
NEVER_WORKED
WORKING_VIA_HRP
FORMER_HRP_WORKER
WORKING_EXTERNAL
UNKNOWN
```

`WORKING_VIA_HRP` and `FORMER_HRP_WORKER` are primarily derived from workforce lifecycle facts.

`WORKING_EXTERNAL` requires an external observation / direct-hire outcome and freshness context.

## 4.4 Explicit non-goals

V7.1 must not build:

- AI candidate ranking;
- automated reactivation messaging;
- Chatwoot/Zalo integration;
- full Talent CRM workflow;
- partner portal;
- payroll/internal HRM.

## 4.5 Commands / authority

At minimum:

```text
createOrMatchLaborProfile
updateLaborProfileDetails
recordAvailabilityObservation
recordRelationshipObservation
verifyLaborIdentity
mergeLaborProfiles
```

Critical identity merge must remain review/audit protected.

## 4.6 UI surfaces

Minimum:

```text
/admin/labor-profiles
/admin/labor-profiles/{id}
/admin/labor-profiles/duplicate-review
```

Recommended repository views:

```text
All people
Available now
Available from date
Working via HRP
Former HRP workers
Working externally
Unknown/dormant
Possible duplicates
Incomplete profiles
```

These are projections/queries, not mutually-exclusive persisted statuses.

## 4.7 Permanent regression scenarios

- returning person matches the same LaborProfile;
- former Worker reappears without creating Worker #2;
- referral from Partner B for a profile originally attributed to Partner A does not overwrite canonical attribution;
- phone collision with mismatched identity becomes possible-match review;
- old external-employment observation does not remain indefinitely authoritative as “currently working external”.

## 4.8 Exit gate G1

V7.1 is complete only when:

- repository search works across canonical LaborProfiles;
- create-or-match is used by all V7 intake surfaces introduced so far;
- possible duplicates can be reviewed safely;
- profile 360 shows canonical identity + history;
- availability is time-aware and auditable;
- current relationship is projected rather than freely editable;
- Worker/current-assignment state is not duplicated into user-editable LaborProfile status fields;
- security/PII scope tests pass.

---

# 5. V7.2 — Talent Workbench

## 5.1 Goal

Make PlacementCase the unit of daily recruiting/talent operations and give HRP staff a manual workflow that works without Chatwoot.

## 5.2 Primary business value

A recruiter opening HRP must know:

- who requires action now;
- which callbacks are overdue;
- which new cases are untouched;
- which handling assignments expire soon;
- which cases are in Company Pool;
- who is ready to start;
- what the next action is for every active case.

## 5.3 Core capabilities

### PlacementCase 360

Must display:

- current stage;
- availability;
- current relationship;
- current handler and expiry;
- case preferences;
- Applications/JobProposals;
- interactions;
- next actions;
- placement attempts;
- timeline.

### InteractionOutcome

Structured record of what happened.

Must support at least:

```text
PHONE
ZALO/manual
IN_PERSON
CHAT/manual
OTHER
```

Raw transcript is not required in HRP.

### NextAction

First-class lifecycle entity.

Suggested status authority:

```text
OPEN
DONE
CANCELLED
```

`OVERDUE` / `DUE_TODAY` are projections.

### HandlingAssignment

Commands:

```text
assignHandling
claimPlacementCase
releaseHandling
transferHandling
expireHandling
```

Rules:

- max one active handler per case;
- history is append/close + create, never assignee overwrite;
- AFF_INITIAL 7-day handling begins when an eligible PlacementCase opens;
- attribution survives handling expiry;
- active case without valid handling is Company Pool.

### My Work

Recommended priority groups:

```text
1. overdue NextAction
2. ready-to-start needing confirmation
3. due today
4. handling expiry < 24h
5. new untouched cases
6. available-now cases with no opportunity/proposal
7. other active cases
```

### Manager Workbench

Minimum projections:

```text
active cases
company pool
untouched > SLA
open overdue actions
handling expiring <24h
ready-to-start
failed/no-show today
```

## 5.4 Active case discipline

After first meaningful touch, an active PlacementCase should normally have either:

- an open NextAction; or
- an explicit waiting state with a dated follow-up action.

Do not allow cases to become silent dead records with no next action.

## 5.5 PlacementCase lifecycle

High-level authority remains:

```text
status:
OPEN
IN_PROGRESS
READY_TO_PLACE
CLOSED

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

Close reason is separate.

A closed case normally stays closed. A later return opens a new case.

## 5.6 Explicit non-goals

- no Chatwoot dependency;
- no automated outbound messaging;
- no AI autonomous stage transitions;
- no generic CRM ownership of Worker/Assignment;
- no full sales CRM.

## 5.7 Permanent regression scenarios

- concurrent Company Pool claim results in exactly one active handler;
- handler transfer retains source attribution;
- handling expiry returns active case to pool without changing ReferralAttribution;
- interaction completes previous NextAction and can create the next one atomically;
- closed historical case is not reused for a genuine later job-search episode.

## 5.8 Exit gate G2

V7.2 is complete when a recruiter can handle an NLD end-to-end from intake/job-seeking intent through manual CRM follow-up to ready-to-placement **without needing Chatwoot, Excel or personal reminders as the system of record**.

Required:

- My Work usable;
- Manager Workbench usable;
- Company Pool usable;
- callbacks/next actions auditable;
- handling timer/transfer/release correct;
- active-case rule enforced;
- security scopes pass;
- no source/beneficiary mutation through handling operations.

---

# 6. V7.3 — Matching & JobProposal

## 6.1 Goal

Connect Talent Repository and Demand Operations in both directions while preserving provenance between candidate-initiated and HRP-initiated interest.

## 6.2 Primary business value

HRP can operate both:

```text
PERSON-FIRST
Open a LaborProfile / PlacementCase
-> find suitable JobOpenings
```

and:

```text
DEMAND-FIRST
Open a JobOpening
-> find suitable people from HRP repository
```

## 6.3 Core capabilities

### Application

Candidate-initiated interest.

Existing `CandidateSubmission` may remain persistence-compatible where required, but V7 product vocabulary is Application.

### JobProposal

HRP-initiated job suggestion.

Suggested lifecycle:

```text
PROPOSED
INTERESTED
DECLINED
EXPIRED
WITHDRAWN
```

Do not fabricate an Application when a recruiter suggests a job.

### PlacementPreference

Case-scoped current job-seeking preferences, not permanent LaborProfile identity fields.

Potential categories:

- preferred/acceptable location;
- available-from;
- shift preference;
- desired work type;
- structured requirement facts actually needed for matching.

Avoid prematurely building an oversized job-preference schema.

### Manual matching

Start with explicit filters and structured data.

AI ranking is not required.

### Suggested reactivation

System may identify dormant/former profiles as potential reactivation candidates, but suggestion alone must not:

- change Availability;
- open PlacementCase;
- create HandlingAssignment;
- contact the person automatically.

## 6.4 JobOpening surface

Recommended sections:

```text
Demand summary
Applications
Job proposals
Placements in progress
Effective placements
Failed placements
Suggested talent from HRP repository
```

## 6.5 Permanent regression scenarios

- Application Samsung remains original provenance when final Placement is Actro;
- Proposal Actro does not create fake Application;
- multiple Applications/Proposals may belong to one active PlacementCase;
- demand-first suggestion does not auto-claim or auto-open a case.

## 6.6 Exit gate

V7.3 is complete when recruiters can reliably move between Person-first and Demand-first workflows and every opportunity preserves whether it was candidate-initiated or HRP-initiated.

---

# 7. V7.4 — Placement & ServiceModel UX

## 7.1 Goal

Make `Placement` the canonical recruiting outcome bridge and support HRP's distinct service models without equating Placement with Worker/Assignment.

## 7.2 Locked ServiceModel taxonomy

```text
STAFFING_SUPPLY
LABOR_LEASING
RECRUITMENT_SERVICE
REFERRAL_SERVICE
```

Derived management classification:

```text
STAFFING_SUPPLY      -> HRP_MANAGED
LABOR_LEASING        -> HRP_MANAGED
RECRUITMENT_SERVICE  -> CLIENT_MANAGED
REFERRAL_SERVICE     -> CLIENT_MANAGED
```

`TEMPORARY`, `PERMANENT`, etc. belong to WorkClassification, not ServiceModel.

## 7.3 Placement model semantics

A PlacementCase may have multiple Placement attempts.

Example:

```text
Placement #1 Samsung
-> FAILED / no-show

Placement #2 Actro
-> EFFECTIVE
```

Do not overwrite failed attempts.

Suggested lifecycle authority:

```text
SELECTED
CONFIRMED
EFFECTIVE
FAILED
CANCELLED
```

Exact persistence enum may differ, but semantics must remain.

## 7.4 EFFECTIVE semantics

### HRP_MANAGED

Placement becomes EFFECTIVE only when actual HRP-managed workforce start is confirmed through the workforce command/orchestration.

### CLIENT_MANAGED

Placement becomes EFFECTIVE when client-managed employment start is sufficiently confirmed according to the approved evidence policy.

No Worker is created.

## 7.5 JobOpening fulfillment

From V7 authority:

```text
fulfilledCount = qualifying EFFECTIVE Placements
```

Do not hard-code fulfillment as Assignment count.

Separate metrics:

```text
placements effective
currently active HRP workers
ended workforce assignments
```

## 7.6 Direct-hire confirmation flow

At minimum support:

```text
selectPlacement
confirmPlacement
confirmClientHireOutcome
markPlacementEffective
failPlacement
cancelPlacement
```

Evidence/source must be auditable.

## 7.7 No-show behavior

If first-time candidate never actually starts:

- Placement -> FAILED;
- planned Assignment may be cancelled if it exists;
- no real EmploymentEpisode starts;
- no Worker should be created solely from confirmation;
- PlacementCase may return to matching;
- no EFFECTIVE beneficiary trigger occurs.

## 7.8 Exit gate G3

Both main business classes must pass end-to-end:

### CLIENT_MANAGED fixture

```text
LaborProfile
-> PlacementCase
-> Placement RECRUITMENT/REFERRAL
-> client employment confirmed
-> Placement EFFECTIVE
-> Case CLOSED_SUCCESS
-> no Worker / Episode / Assignment
-> profile retained
```

### HRP_MANAGED fixture

```text
LaborProfile
-> PlacementCase
-> Placement STAFFING/LEASE
-> actual workforce start
-> same/correct Worker
-> Episode
-> primary Assignment
-> Placement EFFECTIVE
-> Case CLOSED_SUCCESS
```

---

# 8. V7.5 — Workforce Operations

## 8.1 Goal

Provide canonical workforce lifecycle after an HRP-managed Placement becomes effective.

## 8.2 Core definitions

```text
LaborProfile 1 -> 0..1 Worker
Worker 1 -> N EmploymentEpisode
EmploymentEpisode 1 -> N ProjectAssignment
```

`Worker` is long-lived workforce identity, not “currently active” status.

`EmploymentEpisode` is one continuous period in which the person remains in HRP-managed workforce.

`ProjectAssignment` is the concrete project/job placement during that period.

## 8.3 Locked assignment invariant

One Worker may have at most **one active PRIMARY Assignment** at a time.

A reserved SECONDARY concept may exist for future extension but is not part of V7 operational UI unless a new Owner Decision enables it.

## 8.4 Core commands

```text
startAssignment
transferWorker
endAssignment
endEmploymentEpisode
rehireWorker / workforce-start orchestration
correctAssignmentEffectiveDate (privileged)
```

## 8.5 Transfer semantics

Continuous transfer:

```text
end Assignment A with TRANSFERRED
start Assignment B
keep same Worker
keep same EmploymentEpisode
```

If the Worker truly leaves HRP workforce, end the Episode.

A later return:

```text
same LaborProfile
same Worker
new PlacementCase
new Placement
new EmploymentEpisode
new Assignment
```

## 8.6 Exit semantics

Ending workforce employment must not:

- delete LaborProfile;
- delete Worker;
- change canonical source attribution;
- automatically mark Available;
- automatically open PlacementCase.

It may create a follow-up NextAction if HRP SOP requires confirming future job-seeking intent.

## 8.7 Effective-time requirement

Every start/end/transfer/correction must preserve:

```text
effectiveAt
recordedAt
recordedBy / actor
source
reason when relevant
```

## 8.8 Worker 360

Minimum UI:

- current relationship;
- active Episode;
- current primary Assignment;
- previous Assignments;
- previous Episodes;
- originating Placements;
- transfer/exit history;
- timeline.

## 8.9 Permanent regression scenarios

### Transfer

Same Worker + same Episode, old Assignment ended, new primary active.

### Rehire

Same LaborProfile + same Worker, new Episode.

### Direct hire

Never creates Worker.

### No-show

Never creates real employment Episode for first-time candidate.

### Concurrent workforce start

Cannot create Worker #2 or two active PRIMARY assignments.

## 8.10 Exit gate G4

V7.5 is complete when HRP can determine current workforce truth from effective lifecycle relations without mutable `Worker.status = ACTIVE/LEFT` authority.

---

# 9. V7.6 — Partner Network

## 9.1 Goal

Model CTV/Vendor/other supply relationships without conflating business partner identity with system User identity or with candidate ownership.

## 9.2 Core capabilities

### SupplyPartner

Partner business identity.

Possible partner categories include CTV/collaborator, vendor and other approved source partner types.

### Partner membership

A Vendor can have multiple authenticated users.

A CTV may have a linked user account.

Historical partner identity must not change because a login account changes.

### Partner submission batch

For batch/vendor intake, support traceability:

```text
PartnerSubmissionBatch
-> Intakes
-> create-or-match
-> unique/matched/conflict counts
```

### ReferralAttribution

Long-lived person provenance.

Rules:

- canonical attribution belongs to LaborProfile;
- returning/referral intake cannot silently overwrite existing canonical attribution;
- attribution survives handling expiry;
- correction requires auditable supersede/dispute path.

### Case acquisition source

A later PlacementCase may record that Partner B or Zalo reactivated a person even when canonical person attribution remains Partner A.

### Attribution dispute

Must use a business Case/workflow rather than mutating source silently.

## 9.3 Partner portal boundary

Partner surfaces are projections + permitted commands over canonical HRP domain.

Do not create separate canonical `VendorCandidate` or `CTVCandidate` databases.

Partners must not be allowed to:

- create Worker directly;
- start/end Assignment;
- mark Placement EFFECTIVE without approved HRP command policy;
- decide beneficiary arbitrarily;
- inspect unrestricted sensitive PII/internal notes.

## 9.4 Exit gate

V7.6 is complete when partner-originated people can be submitted, matched, attributed and tracked without creating duplicate identities or giving partners authority over canonical workforce lifecycle.

---

# 10. V7.7 — Beneficiary & External Commission Integration

## 10.1 Goal

Let HRP decide **who is recognized as commission beneficiary and why**, while keeping all monetary calculation outside HRP.

## 10.2 Core model

```text
Placement 1 -> N CommissionBeneficiaryDecision
```

Potential beneficiary roles:

```text
SOURCE
HANDLER
VENDOR_SOURCE
OTHER_APPROVED_ROLE
```

Beneficiary may be a User or SupplyPartner.

## 10.3 Boundary rule

HRP may store:

- beneficiary identity;
- beneficiary role;
- Placement/milestone;
- basis/evidence;
- decision status;
- effective decision time;
- supersede/dispute history.

HRP must **not** own:

```text
commissionAmount
commissionRate
commissionFormula
commissionTier
tax calculation
```

## 10.4 Snapshot rule

Beneficiary evidence is evaluated/snapshotted at the approved Placement EFFECTIVE milestone.

Do not recalculate entitlement later from `currentHandler`.

## 10.5 Multiple beneficiaries

Support more than one beneficiary per Placement where policy recognizes separate source/handler/vendor roles.

Python app decides how those roles translate into money.

## 10.6 Dispute/correction

Do not edit old decision in place.

Use:

```text
old decision -> SUPERSEDED
new decision -> ACTIVE
reason / dispute resolution / actor / evidence
```

## 10.7 Integration

Canonical transaction:

```text
Placement EFFECTIVE
-> BeneficiaryDecision persisted
-> transactional outbox event
-> external Python commission app consumes
```

External app failure does not roll back HRP business truth.

## 10.8 Exit gate G5

Required:

- no amount/formula fields in HRP core;
- source/handler can differ and still produce correct decisions;
- multiple beneficiary fixture passes;
- handler changed after EFFECTIVE does not alter existing decision;
- dispute supersede path audited;
- outbox replay is idempotent.

---

# 11. V7.8 — Client CRM

## 11.1 Goal

Add the minimum B2B relationship layer HRP needs to operate manpower sales without turning HRP into a generic enterprise CRM.

## 11.2 Core graph

```text
CrmLead
 -> ClientCompany
    -> ClientContact
    -> SalesOpportunity
    -> Project
       -> StaffingOrder
          -> JobOpening
```

## 11.3 Locked distinctions

```text
CrmLead != LaborProfile
SalesOpportunity != StaffingOrder
ClientCompany != Project
Account responsibility != Project responsibility != PlacementCase handling
```

`ClientCompany` remains the canonical organization entity; do not create a separate canonical CRM company table.

## 11.4 Minimum capabilities

### ClientContact

Canonical B2B contact people for a ClientCompany.

### SalesOpportunity

Suggested lifecycle:

```text
QUALIFYING
PROPOSAL
NEGOTIATION
WON
LOST
CANCELLED
```

Opportunity is commercial pipeline, not operational demand.

### ClientInteraction

Structured B2B communication separate from Talent InteractionOutcome.

### ClientNextAction

B2B follow-up tasks. Can share infrastructure patterns with Talent NextAction but domain semantics remain distinct.

### Client Workbench

Suggested views:

```text
overdue client follow-ups
opportunities with no recent activity
proposals waiting response
meetings / follow-ups today
open opportunities
```

### Direct-hire support

Client-side confirmation must integrate with V7.4 Placement command semantics rather than introducing a parallel hire outcome.

## 11.5 Explicit non-goals

- CPQ engine;
- deep quote/pricing engine;
- marketing automation;
- complex email sequences;
- enterprise forecasting;
- contract lifecycle management;
- generic external Sales CRM integration unless later justified by real operating gaps.

## 11.6 Parallelization rule

Client CRM schema/basic read surfaces may be developed after G0 in parallel if isolated.

However:

- Talent/Placement core keeps priority;
- Client direct-hire confirmation must use V7.4 Placement authority;
- Client CRM cannot introduce a second ClientCompany source of truth;
- it cannot delay G2/G3/G4.

## 11.7 Exit gate

V7.8 is complete when HRP can track commercial opportunities and client follow-up through actual operational demand without conflating sales pipeline with StaffingOrder fulfillment.

---

# 12. V7.9 — Omnichannel

## 12.1 Goal

Add external engagement channels after HRP's manual Talent Workbench is fully operational.

## 12.2 Locked architecture boundary

```text
HRP
= System of Record
identity / case / stage / next action / handling / placement / workforce / source / beneficiary

Chatwoot
= System of Engagement
contact / conversation / raw transcript / agent inbox / reply productivity
```

No CRM/engagement provider may write HRP DB directly.

## 12.3 Order

```text
1. Chatwoot technical POC
2. integration anti-corruption layer
3. webhook durable receipt / identity mapping / idempotency
4. deep links HRP <-> Chatwoot
5. Zalo OA official adapter production pilot
6. reconcile / kill switch / outage tests
7. second channel only after Zalo production gate
```

## 12.4 Chatwoot integration capabilities

- ExternalContactLink;
- ConversationLink;
- EventReceipt/dedupe;
- durable webhook intake;
- exact/possible/new identity resolution into HRP;
- agent action “Tiếp nhận NLD” calling canonical HRP command;
- safe projections back to Chatwoot;
- replay/retry/DLQ/reconciliation.

Chatwoot agent assignment is not HRP HandlingAssignment.

## 12.5 Zalo OA production requirements

Before pilot:

- official OA/API eligibility confirmed;
- account/app ownership documented;
- permission scopes documented;
- consent/reply-window rules documented;
- attachment/retention policy documented;
- secrets owner identified;
- inbound/outbound provider message IDs persisted;
- kill switch available;
- reconciliation dashboard available.

No personal-account scraping or unofficial DM workaround.

## 12.6 AI policy during Omnichannel

AI remains suggest-only initially for:

- summarize;
- classify;
- extract structured facts;
- draft reply;
- suggest SOP/next action.

AI must not autonomously:

- qualify/reject a candidate;
- create Worker;
- mark Placement EFFECTIVE;
- change source;
- select beneficiary;
- expose sensitive PII;
- send outside allowed consent/window policy.

## 12.7 Exit gate G6

Zalo/first production channel is complete when:

- repeated provider events do not duplicate HRP intake/case state;
- provider outage loses no accepted inbound event;
- possible identity conflicts go to review;
- Chatwoot/adapter removal does not remove canonical HRP history;
- no direct CRM DB write path exists;
- reconciliation can detect/repair projection drift;
- kill switch works;
- privacy/security tests pass.

Only then evaluate second production channel.

---

# 13. V7.10 — Intelligence

## 13.1 Goal

Use structured V7 domain facts to improve prioritization, matching and operator productivity without changing canonical authority boundaries.

## 13.2 Sequence

Recommended order:

```text
1. deterministic reactivation suggestions
2. deterministic/weighted matching ranking
3. AI summary + draft assistance
4. next-best-action suggestion
5. funnel/no-show risk
6. anomaly / quality signals
```

Do not begin with autonomous AI workflow execution.

## 13.3 Reactivation

Potential signals:

- former HRP Worker;
- Availability unknown/stale;
- matching location/skills/history;
- recent demand nearby;
- no active PlacementCase.

System produces suggestion only.

## 13.4 Matching ranking

Rank on structured facts such as:

- effective availability;
- location/distance;
- work/shift preference;
- relevant experience;
- prior assignment outcomes where policy allows;
- contact freshness;
- JobOpening requirements.

Do not rank from hidden inferred sensitive traits.

## 13.5 AI copilot

Allowed initial surfaces:

- summarize Conversation/Interaction into redacted structured draft;
- suggest InteractionOutcome;
- suggest profile fields for human confirmation;
- draft candidate/client replies;
- suggest NextAction;
- summarize case timeline.

Canonical action still requires HRP command and policy gate.

## 13.6 Exit gate

Intelligence features are complete only when they can be disabled without breaking core HRP operations.

The system must remain fully operable manually.

---

# 14. Cross-phase capability ownership matrix

| Capability | V6+ | V7.1 | V7.2 | V7.3 | V7.4 | V7.5 | V7.6 | V7.7 | V7.8 | V7.9 | V7.10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Canonical LaborProfile | foundation | UX/core | use | use | use | use | use | use | use | map | intelligence |
| PlacementCase persistence | foundation | history | core UX | use | use | use | use | use | - | map | use |
| HandlingAssignment | foundation | view | core UX | use | use | - | partner evidence | beneficiary evidence | - | projection only | suggest |
| JobProposal | foundation | - | view | core | use | - | - | - | - | projection | rank |
| Placement | foundation | history | view | prepare | core UX | bridge | use | trigger | direct-hire support | safe projection | risk |
| Worker/Episode/Assignment | foundation/harden | projection | view | - | bridge | core UX | view-limited | events | summary | never CRM-owned | analytics |
| SupplyPartner | - | attribution view | source context | - | - | - | core | beneficiary target | - | provider-independent | analytics |
| BeneficiaryDecision | foundation boundary | view | view-limited | - | trigger-ready | event facts | partner context | core | - | no CRM authority | analytics only |
| Client CRM | - | - | - | - | direct-hire hook | - | - | - | core | engagement | intelligence |
| Omnichannel | integration foundation only | no dependency | no dependency | no dependency | no dependency | no dependency | partner channel later | - | client channel later | core | AI assist |

---

# 15. Parallelization rules

## 15.1 Safe parallel work after G0

Possible in separate bounded contexts:

- V7.1 repository UI and V7.8 ClientContact/Opportunity schema foundation;
- security permission catalog extension;
- read-only reporting projections;
- design of Chatwoot technical POC in an isolated environment.

## 15.2 Work that must remain sequential

```text
PlacementCase manual Workbench
before
production Omnichannel
```

```text
Placement EFFECTIVE semantics
before
production Workforce start orchestration
```

```text
Placement EFFECTIVE + source/handler separation
before
Beneficiary production integration
```

```text
Zalo first-channel production gate
before
second messaging channel
```

## 15.3 Parallel work must not introduce competing authority

Examples of forbidden parallel shortcuts:

- Client CRM creates its own direct-hire status instead of using Placement;
- Chatwoot agent assignment becomes candidate owner;
- Partner portal stores separate candidate master data;
- reporting creates editable counters for fulfilled headcount/current workforce;
- AI writes lifecycle status directly.

---

# 16. Phase-level task template for later backlogs

Every phase backlog generated from this roadmap should decompose capabilities using this header:

```text
Task ID:
Phase:
Classification: SCHEMA | COMMAND | MIGRATION | SECURITY | UI | PROJECTION | INTEGRATION | TEST
Aggregate / bounded context:
Goal:
Prerequisites:
Business invariants:
Schema impact:
Migration impact:
Command/API impact:
Permission/RLS impact:
Audit/events:
UI behavior:
Tests:
Permanent regression fixture impact:
Observability/reconciliation:
Exit criteria:
Explicit non-goals:
```

AI coding tasks should normally be small enough to review independently.

---

# 17. Permanent V7 regression suite

The following scenarios must survive all later V7 phases.

## R1 — Returning direct-hire person

```text
LaborProfile exists
previous CLIENT_MANAGED Placement EFFECTIVE
no Worker
person returns later
```

Expected:

- same LaborProfile;
- new PlacementCase;
- old Placement retained;
- no Worker created until a future HRP-managed actual start.

## R2 — Referral reclaim

Partner A is canonical attribution. Partner B resubmits same person later.

Expected:

- same LaborProfile;
- canonical source remains A unless formal dispute/correction resolves otherwise;
- new Intake can record B;
- new case acquisition source may record B;
- no silent overwrite.

## R3 — Handling expiry

AFF_INITIAL handler reaches 7-day expiry while PlacementCase remains active.

Expected:

- HandlingAssignment expires;
- ReferralAttribution unchanged;
- case appears in Company Pool;
- no beneficiary is automatically decided merely because handling expired.

## R4 — Concurrent pool claim

Two recruiters claim the same pooled case simultaneously.

Expected:

- exactly one active HandlingAssignment;
- losing command receives deterministic conflict response;
- no duplicate handler state.

## R5 — Multi-opportunity case

One PlacementCase has Application Samsung and Proposal Actro/Wisum.

Expected:

- one active case;
- provenance retained per opportunity;
- final Actro Placement does not rewrite Samsung Application.

## R6 — No-show first workforce start

First-time person is confirmed but never actually starts.

Expected:

- Placement FAILED;
- no real EmploymentEpisode;
- no Worker if Worker creation is deferred to actual start;
- case may return to matching;
- no EFFECTIVE beneficiary trigger.

## R7 — HRP workforce transfer

Active Worker transfers Actro -> Wisum continuously.

Expected:

- same Worker;
- same EmploymentEpisode;
- Actro Assignment ENDED/TRANSFERRED;
- Wisum PRIMARY Assignment ACTIVE;
- no overlapping active PRIMARY assignments.

## R8 — Rehire

Former HRP Worker returns after Episode ended.

Expected:

- same LaborProfile;
- same Worker;
- new PlacementCase;
- new Placement;
- new EmploymentEpisode;
- new Assignment.

## R9 — Direct-hire outcome

CLIENT_MANAGED Placement reaches EFFECTIVE.

Expected:

- PlacementCase closes success;
- LaborProfile retained;
- no Worker/Episode/Assignment required;
- external working relationship may be observed;
- beneficiary decision can be produced.

## R10 — Beneficiary snapshot

Placement becomes EFFECTIVE while handler A is active. Handler later changes to B.

Expected:

- existing beneficiary decision evidence remains based on milestone snapshot/policy;
- later handler change does not silently rewrite decision;
- dispute/override uses supersede history.

## R11 — Omnichannel duplicate webhook

Same provider event delivered multiple times.

Expected:

- one canonical accepted business effect;
- EventReceipt/idempotency recognizes replay;
- no duplicate LaborProfile/Intake/Interaction/Case.

## R12 — AI disabled

Disable all V7.10 intelligence features.

Expected:

- Talent Repository, Workbench, Matching, Placement, Workforce, Partner and Client CRM remain fully operable manually.

---

# 18. Observability requirements by phase

Every phase must expose enough operational metrics to detect silent workflow failure.

## V7.1

- create/match exact/new/possible counts;
- duplicate-review backlog;
- merge failures;
- stale availability counts.

## V7.2

- active cases;
- untouched cases;
- overdue NextActions;
- Company Pool count;
- handling expiry volume;
- transfer/claim conflicts.

## V7.3

- Applications vs JobProposals;
- proposal interested/declined rates;
- cases with no opportunity;
- demand-first suggestion conversion.

## V7.4

- Placement states;
- no-show/failure reasons;
- effective placement counts by ServiceModel;
- JobOpening requested/effective/remaining.

## V7.5

- active Workers;
- active primary Assignments;
- transfers;
- exits;
- rehires;
- invariant violation attempts.

## V7.6

- partner submissions;
- unique/matched/conflict counts;
- attribution disputes;
- partner permission denials.

## V7.7

- beneficiary decisions created;
- multiple-beneficiary placements;
- dispute/supersede volume;
- outbox pending/retry/dead-letter counts.

## V7.8

- open opportunities;
- stale opportunities;
- client follow-up overdue;
- opportunity -> StaffingOrder conversion.

## V7.9

- webhook receipts;
- dedupe rate;
- provider failures;
- DLQ/replay counts;
- reconciliation drift;
- outbound delivery state.

## V7.10

- suggestion acceptance/rejection;
- confidence/review rates;
- AI provider failures;
- kill-switch use;
- human override rates.

---

# 19. Recommended release slices

Product-facing version labels do not need to expose every engineering slice, but implementation should prefer smaller releases.

```text
V7.1a Repository read + Profile 360
V7.1b Availability / Relationship / Dedup review

V7.2a PlacementCase 360 + Interaction
V7.2b NextAction / My Work
V7.2c Handling / Company Pool / Manager Workbench

V7.3a Application/Proposal semantics
V7.3b person-first matching
V7.3c demand-first repository search

V7.4a Placement attempt UX
V7.4b CLIENT_MANAGED effective flow
V7.4c HRP_MANAGED effective orchestration
V7.4d fulfillment projections

V7.5a Worker 360
V7.5b transfer/exit
V7.5c rehire

V7.6a SupplyPartner
V7.6b submission batches
V7.6c partner portal projection/disputes

V7.7a Beneficiary decisions
V7.7b Python app outbox integration
V7.7c dispute/supersede hardening

V7.8a ClientContact/Opportunity
V7.8b Client Workbench
V7.8c direct-hire confirmation/client-side integration

V7.9a Chatwoot POC
V7.9b integration ledger/mapping/reconciliation
V7.9c Zalo OA pilot
V7.9d first-channel production gate

V7.10a deterministic intelligence
V7.10b AI copilot
V7.10c risk/anomaly suggestions
```

---

# 20. Cleanup policy

Do not block V7 feature delivery on cosmetic cleanup of legacy naming.

Candidates for later cleanup after stable authority switch:

- rename `CandidateSubmission` persistence to `Application` if worthwhile;
- remove obsolete profile-owner fields;
- remove old fulfillment counters;
- remove superseded legacy status fields;
- remove compatibility selectors no longer needed;
- consolidate deprecated referral/source fields;
- remove feature flags after stable cutover.

Cleanup requires its own migration/test plan.

---

# 21. Definition of V7 core complete

HRP V7 core can be considered functionally complete before Intelligence when all of the following are true:

```text
DEMAND
ClientCompany -> Project -> StaffingOrder -> JobOpening works
JobOpening knows canonical ServiceModel
fulfillment derives from effective Placement

TALENT REPOSITORY
one canonical person
safe returnee/dedup behavior
availability + relationship + timeline usable

TALENT OPERATIONS
PlacementCase + Interaction + NextAction + Handling + Company Pool usable daily

MATCHING
Application and HRP JobProposal provenance preserved
person-first and demand-first workflow usable

PLACEMENT
failed/confirmed/effective attempts retained
CLIENT_MANAGED and HRP_MANAGED paths both work

WORKFORCE
one Worker identity
Episode/Assignment history correct
transfer/exit/rehire correct

PARTNER
CTV/Vendor/source attribution works without candidate ownership confusion

BENEFICIARY
HRP identifies beneficiary facts but performs no commission calculation

CLIENT CRM
minimum opportunity/contact/follow-up flow works without replacing Demand Operations

SECURITY
command permissions + RLS + PII boundaries + audit + idempotency pass

INTEGRATION
manual operation remains canonical; external channels cannot bypass HRP command authority
```

Omnichannel and Intelligence can then deepen engagement/productivity without changing the core domain model.

---

# 22. Next planning artifacts

After this roadmap is approved, generate implementation backlogs in this order:

```text
1. V7_1_TALENT_REPOSITORY_BACKLOG.md
2. V7_2_TALENT_WORKBENCH_BACKLOG.md
3. V7_3_MATCHING_JOB_PROPOSAL_BACKLOG.md
4. V7_4_PLACEMENT_SERVICE_MODEL_BACKLOG.md
5. V7_5_WORKFORCE_OPERATIONS_BACKLOG.md
6. V7_6_PARTNER_NETWORK_BACKLOG.md
7. V7_7_BENEFICIARY_INTEGRATION_BACKLOG.md
8. V7_8_CLIENT_CRM_BACKLOG.md
9. V7_9_OMNICHANNEL_BACKLOG.md
10. V7_10_INTELLIGENCE_BACKLOG.md
```

Do not generate all detailed backlogs simultaneously if implementation feedback from earlier phases may affect later UI/infrastructure details. Domain invariants remain locked, but task decomposition can adapt after each gate.

---

# 23. Final implementation principle

The implementation sequence must preserve this dependency direction:

```text
canonical facts first
-> operational workflow
-> projections / dashboards
-> external engagement
-> automation / intelligence
```

Never reverse it into:

```text
UI/channel/AI first
-> invent missing domain state later
```

The value of HRP V7 is not the number of screens. It is that Client demand, Talent identity, job-search episodes, Placement outcomes, Partner provenance, workforce movement and beneficiary evidence all describe the same business reality without competing sources of truth.
