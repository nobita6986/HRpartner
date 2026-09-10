# HRP V6+ — AI Coding Implementation Backlog

> Status: Execution Backlog
> Parent architecture: `V6_PLUS_PLAN.md`
> Target architecture: `V7_ARCHITECTURE.md`
> Reconciliation authority: `V6_V7_CONFLICT_CHANGE_REGISTER.md`
> Purpose: Convert the V6+ architecture into small, dependency-aware implementation tasks suitable for AI coding and code review.
> Explicitly out of scope: Payroll, internal HRM, commission amount/rate/formula calculation, Chatwoot/Zalo production UX, V7 feature UX except where required for migration/review tooling.

---

## 0. Authority and execution rules

When documents disagree, implement in this order:

```text
1. This backlog for task sequencing and task-level acceptance criteria
2. V6_PLUS_PLAN.md for V6+ domain/migration intent
3. V6_V7_CONFLICT_CHANGE_REGISTER.md for superseded/clarified old decisions
4. V7_ARCHITECTURE.md for target V7 semantics
5. CRM_CSKH_INTEGRATION_PLAN.md for retained integration decisions
6. v6-admin-rebuild.md for retained V6 behavior not superseded above
```

No coding agent may silently reinterpret a locked domain rule. If repository reality makes a task impossible as specified, stop that task, record the mismatch, and propose the smallest compatible adjustment.

Global migration strategy:

```text
ADD
-> AUDIT
-> BACKFILL WHEN TRUTHFUL
-> DUAL/COMPAT READ
-> SWITCH AUTHORITY
-> ENFORCE
-> CLEANUP LATER
```

Global prohibitions:

- do not fabricate Applications, PlacementCases, Placements or source history merely to satisfy new foreign keys;
- do not overwrite canonical referral source because a new partner/user submits an existing person;
- do not create a second Worker for the same LaborProfile;
- do not create Worker/EmploymentEpisode for a candidate who has not actually started HRP-managed work;
- do not make `Company Pool` a separately synchronized ownership state;
- do not calculate commission amount in HRP;
- do not bypass service commands by exposing generic mutation of critical lifecycle status;
- do not hard-delete lifecycle history as a normal correction mechanism.

---

# 1. Milestones and hard gates

## M0 — Repository & data discovery complete

Exit conditions:

- current Prisma/schema and relevant services mapped;
- migration audit runner exists;
- current data anomalies are measurable;
- no behavior change yet.

## M1 — Identity + PlacementCase foundation

Exit conditions:

- PlacementCase persistence exists;
- new case commands exist;
- new Applications can link to a case;
- max-one-active-case invariant works for new data;
- no unsafe legacy backfill.

## M2 — Handling authority migrated

Exit conditions:

- HandlingAssignment authority is case-scoped for new flow;
- max-one-active-handler enforced;
- AFF 7-day timer starts from PlacementCase opening;
- Company Pool is a projection.

## M3 — Placement bridge + ServiceModel

Exit conditions:

- Placement is independent from Assignment;
- direct-hire/client-managed effective Placement works without Worker;
- HRP-managed actual start creates/uses workforce records correctly;
- no-show does not create false workforce history.

## M4 — Operational command + audit foundation

Exit conditions:

- InteractionOutcome / NextAction foundations exist;
- critical commands are idempotent/concurrency-safe;
- effective-time/actor/source/correlation audit pattern is implemented;
- RLS/permissions updated for all new aggregates.

## M5 — Migration, reconciliation and V7 compatibility gate

Exit conditions:

- safe legacy records backfilled;
- unresolved records reported rather than guessed;
- regression fixtures pass;
- V7 Compatibility Gate passes.

V7 feature coding MUST NOT begin before M5 passes for the affected bounded context.

---

# 2. Track A — Discovery and migration audit

## V6P-000 — Freeze V6+ domain contract

**Class:** BLOCKER  
**Milestone:** M0  
**Dependencies:** none

### Goal

Create a repository-local machine-readable/human-readable domain contract so later agents do not infer semantics from old schema names.

### Required content

At minimum encode/document:

```text
LaborProfile != Worker
Application != Placement
Placement != ProjectAssignment
PlacementCase = one job-search/reassignment episode
max 1 active PlacementCase / LaborProfile
ReferralAttribution belongs to person provenance
HandlingAssignment belongs to PlacementCase responsibility
max 1 active HandlingAssignment / PlacementCase
Worker 0..1 / LaborProfile
rehire = same Worker + new EmploymentEpisode
Placement can be EFFECTIVE without Worker for CLIENT_MANAGED
actual HRP-managed start is required before workforce lifecycle begins
max 1 ACTIVE PRIMARY Assignment / Worker
critical movement = effectiveAt + recordedAt + actor + source + history
```

### Implementation notes

- Prefer a markdown architecture contract under project docs plus constants/tests where appropriate.
- Do not duplicate business logic into a second runtime rules engine solely for documentation.

### Tests / validation

- Architecture test/checklist confirms required invariants appear in the contract.
- Links to superseded V6 decisions reference the conflict register.

### Exit gate

A fresh coding agent can determine the intended meaning of LaborProfile, PlacementCase, Placement, Worker, Assignment, source, handler and beneficiary without reading chat history.

---

## V6P-001 — Build read-only V6+ migration audit runner

**Class:** BLOCKER  
**Milestone:** M0  
**Dependencies:** V6P-000

### Goal

Inspect actual database state before any semantic backfill.

### Audit outputs

At minimum report counts and row identifiers for:

- LaborProfiles total;
- Workers without expected canonical LaborProfile relationship;
- duplicate normalized phones;
- duplicate/ambiguous identity documents;
- CandidateSubmissions missing canonical LaborProfile linkage;
- CandidateSubmissions per LaborProfile and suspicious historical clusters;
- Workers with multiple active Assignments;
- active Assignments lacking expected Project/Job relation;
- source/referral conflicts;
- legacy handling records that cannot map to one clear recruiting context;
- Worker/LaborProfile uniqueness violations;
- rows with impossible or contradictory effective dates/statuses.

### Classification output

Identity findings:

```text
EXACT_SAFE
POSSIBLE_DUPLICATE
UNRESOLVED
```

Migration candidates should similarly expose confidence rather than hiding inference.

### Safety

- strictly read-only;
- supports dry-run by definition;
- output JSON plus concise markdown summary is preferred;
- must not print full sensitive PII into logs where identifiers/hashes suffice.

### Tests

Fixtures covering duplicate phone, reused phone, missing document, multiple active assignments, legacy submission without profile.

### Exit gate

Audit can run repeatedly with deterministic counts and no database writes.

---

# 3. Track B — Identity hardening

## V6P-007A — Centralize create-or-match authority

**Class:** BLOCKER  
**Milestone:** M1  
**Dependencies:** V6P-001

### Goal

Ensure Marketplace, staff intake, partner intake and future provider intake resolve a person through one canonical identity service.

### Required outcomes

```text
EXACT_MATCH
POSSIBLE_MATCH
NEW_PROFILE
```

### Rules

- phone alone is not permanent human identity;
- actor performing intake does not become referrer/handler/beneficiary automatically;
- `POSSIBLE_MATCH` must not auto-merge;
- provider identity is mapping evidence, not canonical person identity.

### Commands/services

- `createOrMatchLaborProfile(...)`
- optional `reviewPossibleMatch(...)` foundation if existing workflow supports it.

### Tests

- same phone + conflicting DOB does not unsafe-merge;
- exact known identity returns same LaborProfile;
- repeated idempotent intake does not duplicate profile.

### Exit gate

All new first-party intake paths can be routed through the same create-or-match authority.

---

## V6P-007B — Harden profile merge workflow

**Class:** BLOCKER/HARDENING  
**Milestone:** M1  
**Dependencies:** V6P-007A

### Goal

Prevent unsafe merge of profiles that carry recruiting/workforce/source history.

### Preconditions checked before merge

- Worker conflict;
- active PlacementCase conflict once cases exist;
- attribution conflict;
- identity evidence confidence;
- downstream relation collision.

### Command

`mergeLaborProfiles(sourceId, targetId, reason, evidence)`

### Audit

Record source, target, moved relations, actor, reason, recordedAt, correlationId.

### Rule

Do not promise generic undo when downstream writes make reversal unsafe. Reversal must be separately validated.

### Tests

- two profiles each linked to different Workers cannot merge silently;
- source attribution conflict requires explicit resolution path;
- successful merge leaves no orphaned foreign keys.

---

## V6P-008 — Protect canonical referral source on existing profiles

**Class:** BLOCKER  
**Milestone:** M1  
**Dependencies:** V6P-007A

### Goal

A new intake/referral of an existing person must not overwrite canonical person provenance.

### Expected behavior

```text
existing LaborProfile source = Partner A
Partner B submits same person
-> match existing LaborProfile
-> record new Intake / acquisition evidence
-> preserve canonical source A
-> optionally raise attribution conflict/review
```

### Tests

Permanent regression fixture for "referral reclaim".

### Exit gate

No create-or-match path can silently replace existing canonical attribution.

---

## V6P-021 — Enforce one Worker per LaborProfile

**Class:** BLOCKER  
**Milestone:** M1  
**Dependencies:** V6P-001

### Goal

Make `LaborProfile 1 -> 0..1 Worker` enforceable under concurrency.

### Work

- audit existing violations first;
- add DB uniqueness where safe;
- add service-level error with domain wording;
- never auto-delete/merge duplicate Workers during migration.

### Tests

- concurrent conversion attempts yield one Worker;
- unresolved legacy duplicate blocks enforcement only for affected rows via approved migration plan, not silent data loss.

---

# 4. Track C — PlacementCase foundation

## V6P-001A — Add PlacementCase schema

**Class:** BLOCKER  
**Milestone:** M1  
**Dependencies:** V6P-000

### Minimum model

```text
PlacementCase
- id
- laborProfileId
- status
- stage
- openedAt
- closedAt?
- closeReason?
- openedFromIntakeId?
- createdByUserId?
- version
- createdAt
- updatedAt
```

### Rules

- case is a job-search/reassignment episode, not a Job;
- case may begin without JobOpening;
- historical cases are allowed;
- new flow will allow max one active case per LaborProfile.

### Migration

Additive only. Do not backfill yet.

### Tests

Schema relation, indexes, enum/state validation.

---

## V6P-001B — Add PlacementCase lifecycle commands

**Class:** BLOCKER  
**Milestone:** M1  
**Dependencies:** V6P-001A, V6P-025A

### Commands

- `openPlacementCase`
- `closePlacementCase`
- exceptional `reopenPlacementCase` only if explicitly permitted

### Business rules

- opening requires job-seeking/reassignment intent evidence;
- import/backfill alone does not imply an active case;
- normal return after a closed episode creates a new case instead of reopening old history;
- close requires a reason; success closure later requires effective Placement once Placement exists.

### Audit

openedAt/effective source, actor, correlationId.

### Tests

- no-intent intake cannot auto-open case;
- closed case + returning person can open a new case;
- invalid transition rejected.

---

## V6P-003 — Enforce max one active PlacementCase per LaborProfile

**Class:** BLOCKER  
**Milestone:** M1  
**Dependencies:** V6P-001A, V6P-001B

### Goal

Concurrency-safe one-active-case invariant.

### Implementation

Prefer DB-enforced partial uniqueness or equivalent transaction/locking strategy plus service validation.

### Tests

Two concurrent `openPlacementCase` calls for the same LaborProfile cannot create two active cases.

---

## V6P-002A — Add CandidateSubmission.placementCaseId compatibility relation

**Class:** BLOCKER  
**Milestone:** M1  
**Dependencies:** V6P-001A

### Rules

- nullable initially for truthful legacy compatibility;
- new V7-compatible Application creation must supply/resolve an active PlacementCase;
- CandidateSubmission remains persistence name during V6+ unless a separate cleanup task is approved.

### Tests

New submission path links the same LaborProfile as the PlacementCase.

---

## V6P-002B — Move new Application creation through case-aware command

**Class:** BLOCKER  
**Milestone:** M1  
**Dependencies:** V6P-001B, V6P-002A

### Command

`createApplication(...)` or compatible existing command with mandatory case context.

### Invariants

- Application LaborProfile matches PlacementCase LaborProfile;
- Application preserves original JobOpening/JobPosting provenance;
- Placement may later target another JobOpening;
- no fake Application for general interest.

### Tests

- cross-person case/application linkage rejected;
- general-interest case can exist with zero Applications;
- candidate-originated application preserves source Job.

---

# 5. Track D — Safe PlacementCase legacy backfill

## V6P-024A — Build PlacementCase backfill classifier

**Class:** BLOCKER  
**Milestone:** M5  
**Dependencies:** V6P-001, V6P-001A, V6P-002A

### Goal

Classify legacy records without mutating them.

### Categories

```text
HIGH_CONFIDENCE_CASE
AMBIGUOUS_GROUPING
WORKFORCE_ONLY_NO_RECRUITING_EVIDENCE
UNRESOLVED
```

### Prohibition

Do not invent an arbitrary time window (e.g. 30 days) as a case grouping rule unless separately approved.

### Exit gate

Every candidate legacy row is classified or explicitly unresolved.

---

## V6P-024B — Execute high-confidence PlacementCase backfill

**Class:** BLOCKER  
**Milestone:** M5  
**Dependencies:** V6P-024A

### Rules

- create only high-confidence historical cases;
- mark migration provenance (`migrationRunId`, confidence, origin in audit metadata);
- leave ambiguous links nullable/reviewable;
- do not create fake Applications for workforce-only records.

### Tooling

- dry-run;
- resumable/idempotent;
- reports scanned/created/skipped/unresolved/failed counts.

### Tests

Rerun does not duplicate cases.

---

# 6. Track E — Handling authority and Company Pool

## V6P-004A — Add PlacementCase relation to HandlingAssignment

**Class:** BLOCKER  
**Milestone:** M2  
**Dependencies:** V6P-001A

### Goal

Move future handling authority to the active job-search episode.

### Migration

- relation may be nullable for unresolved legacy history;
- do not create fake PlacementCase merely to satisfy handling FK.

---

## V6P-005 — Enforce max one active HandlingAssignment per PlacementCase

**Class:** BLOCKER  
**Milestone:** M2  
**Dependencies:** V6P-004A

### Requirements

- concurrency-safe;
- transfer ends old assignment and creates new row;
- no in-place reassignment that destroys history.

### Tests

Concurrent claim from Company Pool has one winner.

---

## V6P-006 — Implement AFF_INITIAL 7-day handling trigger from PlacementCase open

**Class:** BLOCKER / SUPERSEDES OLD V6 WORDING  
**Milestone:** M2  
**Dependencies:** V6P-001B, V6P-004A, V6P-008

### Locked rule

```text
valid ReferralAttribution can exist without active handling
job-seeking intent -> PlacementCase opens
if attribution/policy qualifies -> AFF_INITIAL HandlingAssignment created
expiresAt = case openedAt + 7-day policy
```

### Important

- handling expiry never removes ReferralAttribution;
- calendar-day vs business-day calculation remains a policy configuration decision if not already resolved in repo; do not invent a business calendar silently;
- if exact clock policy is unresolved, implement a clearly isolated policy function/config boundary.

### Tests

- profile created via AFF without job-seeking intent gets no handling timer;
- later case open starts the timer;
- expiry preserves source.

---

## V6P-004B — Add handling commands

**Class:** BLOCKER  
**Milestone:** M2  
**Dependencies:** V6P-005, V6P-025A

### Commands

- `assignHandling`
- `claimPlacementCase`
- `transferHandling`
- `releaseHandling`
- `expireHandling` (policy/system command if persisted transition is needed)

### Rules

- current handler = active HandlingAssignment projection;
- source/referral remains independent;
- release can return active case to pool immediately;
- transfer requires reason and creates history.

---

## V6P-019 — Replace Company Pool state with projection

**Class:** COMPAT / REQUIRED  
**Milestone:** M2  
**Dependencies:** V6P-003, V6P-005

### Canonical query

```text
active PlacementCase
AND no valid active HandlingAssignment
= Company Pool
```

### Work

- add query/service selector;
- stop new writes to any redundant ownership/pool flag if one exists;
- preserve legacy field only as compatibility until cleanup.

### Tests

Expiry/release makes case appear in pool without separate pool mutation.

---

# 7. Track F — Source / handler / beneficiary separation

## V6P-009A — Audit coupling between attribution, handler and commission fields

**Class:** BLOCKER  
**Milestone:** M2  
**Dependencies:** V6P-001

### Goal

Find all schema/service/UI code paths that infer one concept from another.

### Detect patterns

- `createdBy` used as referrer;
- current handler used as permanent source;
- source/referrer used directly as commission beneficiary;
- partner submitter used as Worker/owner;
- source overwritten on assignment/placement change.

### Deliverable

Code-location register with remediation tasks.

---

## V6P-009B — Remove critical source/handler/beneficiary inference paths

**Class:** BLOCKER  
**Milestone:** M3/M4  
**Dependencies:** V6P-009A, V6P-004B

### Goal

Make each concept authoritative from its own domain record/service.

### Acceptance

No critical production command derives beneficiary solely from `createdBy`, source solely from handler, or handler solely from attribution after explicit handling history exists.

---

# 8. Track G — ServiceModel foundation

## V6P-014A — Add canonical ServiceModel taxonomy to JobOpening

**Class:** COMPAT / REQUIRED FOR V7  
**Milestone:** M3  
**Dependencies:** V6P-000

### Canonical enum

```text
STAFFING_SUPPLY
LABOR_LEASING
RECRUITMENT_SERVICE
REFERRAL_SERVICE
```

Derived classification:

```text
STAFFING_SUPPLY, LABOR_LEASING -> HRP_MANAGED
RECRUITMENT_SERVICE, REFERRAL_SERVICE -> CLIENT_MANAGED
```

### Migration

- legacy JobOpenings may temporarily be null/UNKNOWN_LEGACY if truth cannot be established;
- new JobOpening creation must require a valid canonical ServiceModel once feature flag/authority switch occurs;
- do not persist an independently editable managementMode.

### Tests

Derived management mode cannot contradict ServiceModel.

---

## V6P-014B — Add service-model snapshot contract for Placement

**Class:** BLOCKER FOR HISTORICAL CORRECTNESS  
**Milestone:** M3  
**Dependencies:** V6P-014A, V6P-010A

### Goal

A historical Placement must retain the ServiceModel under which it occurred even if JobOpening config later changes.

### Implementation

Use enum snapshot or versioned terms reference. Prefer simplest truthful implementation for current scope.

---

# 9. Track H — Placement foundation

## V6P-010A — Add independent Placement schema

**Class:** BLOCKER  
**Milestone:** M3  
**Dependencies:** V6P-001A

### Minimum model

```text
Placement
- id
- laborProfileId
- placementCaseId
- clientCompanyId
- projectId?
- jobOpeningId?
- serviceModelSnapshot
- status
- selectedAt?
- confirmedAt?
- effectiveAt?
- failureReason?
- sourceApplicationId?
- sourceJobProposalId?
- createdByUserId
- version
- createdAt
- updatedAt
```

### Cardinality

`PlacementCase 1 -> N Placement`

### Rules

- Placement is an attempt/outcome, not Assignment;
- failed attempt remains historical;
- a later attempt in same case may succeed;
- backfill provenance links may be nullable where evidence is missing.

---

## V6P-010B — Add Placement lifecycle commands

**Class:** BLOCKER  
**Milestone:** M3  
**Dependencies:** V6P-010A, V6P-025A, V6P-026A

### Commands

- `createPlacement` / `selectPlacement`
- `confirmPlacement`
- `failPlacement`
- `cancelPlacement`
- `markPlacementEffective`
- privileged `voidPlacement`/correction command if needed

### Rules

- no generic `PATCH status = EFFECTIVE`;
- success is milestone-based;
- failed/no-show attempt does not necessarily close PlacementCase;
- PlacementCase closes success only from valid effective outcome.

### Tests

State transition matrix plus idempotent retries.

---

## V6P-011 — Support EFFECTIVE client-managed Placement without Worker

**Class:** BLOCKER  
**Milestone:** M3  
**Dependencies:** V6P-010B, V6P-014A

### Required behavior

For `RECRUITMENT_SERVICE` / `REFERRAL_SERVICE`:

```text
confirm actual client employment milestone
-> Placement EFFECTIVE
-> PlacementCase CLOSED_SUCCESS
-> no Worker required
-> no EmploymentEpisode
-> no ProjectAssignment
-> LaborProfile retained
```

### Audit/evidence

Store confirmation source/effective date as supported by final schema.

### Permanent regression test

Direct-hire fixture.

---

## V6P-012 — Prevent Worker creation before actual HRP-managed start

**Class:** BLOCKER  
**Milestone:** M3  
**Dependencies:** V6P-010B, V6P-021, V6P-022A

### Rule

Acceptance/selection/client confirmation before start is represented by Placement state (and optionally planned Assignment), not Worker lifecycle start.

### Expected no-show behavior

```text
Placement CONFIRMED
candidate does not start
-> Placement FAILED
-> planned Assignment CANCELLED if it exists
-> no EmploymentEpisode started
-> no new Worker created for first-time person
-> case may return to matching
```

### Tests

Permanent no-show fixture.

---

## V6P-013 — Link ProjectAssignment to originating Placement where known

**Class:** COMPAT  
**Milestone:** M3  
**Dependencies:** V6P-010A

### Migration

- nullable for legacy truthfulness;
- new V7-compatible HRP-managed starts should populate relation;
- do not fabricate a Placement for every legacy Assignment.

---

# 10. Track I — Workforce invariants

## V6P-022A — Harden rehire semantics

**Class:** BLOCKER  
**Milestone:** M3  
**Dependencies:** V6P-021

### Locked rule

```text
former HRP worker returns
-> same LaborProfile
-> same Worker
-> new PlacementCase
-> new Placement
-> new EmploymentEpisode
-> new ProjectAssignment
```

### Tests

Permanent rehire fixture.

---

## V6P-023 — Enforce max one ACTIVE PRIMARY Assignment per Worker

**Class:** BLOCKER  
**Milestone:** M3  
**Dependencies:** V6P-001 audit runner

### Schema/enum

If needed, introduce:

```text
assignmentRole = PRIMARY | SECONDARY
```

Only PRIMARY is part of V7 MVP workflow.

### Rules

- max one active PRIMARY under concurrency;
- transfer ends old PRIMARY and starts new PRIMARY atomically;
- SECONDARY is reserved, not exposed as normal V7 flow.

### Tests

Concurrent start attempts and transfer fixture.

---

## V6P-022B — Implement/start workforce orchestration command

**Class:** BLOCKER  
**Milestone:** M3  
**Dependencies:** V6P-010B, V6P-012, V6P-013, V6P-023, V6P-026A

### Goal

For HRP-managed ServiceModel, actual start must transition recruiting and workforce consistently.

### Command/orchestration effect

```text
validate Placement confirmed and HRP_MANAGED
ensure/reuse Worker
open EmploymentEpisode if none active
start PRIMARY ProjectAssignment
mark Placement EFFECTIVE
close PlacementCase success
write audit
write outbox
```

### Transaction

All canonical HRP DB changes are atomic. External calls are never inside this transaction.

### Tests

First employment, transfer/continuity where applicable, rehire, duplicate retry.

---

# 11. Track J — JobProposal / CRM foundations

## V6P-016 — Add JobProposal foundation

**Class:** COMPAT  
**Milestone:** M4  
**Dependencies:** V6P-001A

### Minimum semantics

```text
Application = candidate-initiated
JobProposal = HRP-initiated
```

### Minimum model

- placementCaseId
- jobOpeningId
- proposedByUserId
- proposedAt
- status (`PROPOSED`, `INTERESTED`, `DECLINED`, `EXPIRED`, `WITHDRAWN` or final approved equivalent)
- response timestamp/reason as appropriate.

### Rule

Do not create fake Application when recruiter proposes another Job.

### Tests

Candidate applies Samsung; recruiter proposes Actro; provenance remains distinct.

---

## V6P-017 — Add InteractionOutcome foundation

**Class:** COMPAT  
**Milestone:** M4  
**Dependencies:** V6P-001A, V6P-020A

### Minimum model

- laborProfileId
- placementCaseId nullable
- channel
- direction
- actor
- occurredAt/effective timestamp
- outcomeType
- summary
- related external conversation/message refs where safe

### Rules

- not every Interaction opens a PlacementCase;
- raw transcript remains outside HRP canonical record when Chatwoot is introduced later;
- structured business outcome belongs in HRP.

---

## V6P-018A — Add NextAction foundation

**Class:** COMPAT  
**Milestone:** M4  
**Dependencies:** V6P-001A

### Minimum model

- placementCaseId
- laborProfileId
- type
- dueAt
- assignedUserId
- status (`OPEN`, `DONE`, `CANCELLED`)
- source interaction refs
- completion timestamp

### Projection

`OVERDUE` is derived from `OPEN && dueAt < now`; do not store it as a manually synchronized state.

---

## V6P-018B — Add recordInteraction orchestration command

**Class:** COMPAT / V7 ENABLER  
**Milestone:** M4  
**Dependencies:** V6P-017, V6P-018A, V6P-026A

### Goal

Allow one user action to record interaction, complete prior action and create the next action consistently.

### Avoid

Frontend making a series of unrelated mutations with partial failure.

---

# 12. Track K — Fulfillment compatibility

## V6P-015A — Introduce JobOpening fulfillment selector/service

**Class:** COMPAT / REQUIRED  
**Milestone:** M3/M5  
**Dependencies:** V6P-010A, V6P-014A

### Goal

Centralize fulfillment logic so V6 UI does not hard-code `filled = activeAssignments`.

### Semantics

- effective placement count = historical fulfillment outcome;
- active HRP worker count = current Assignment projection;
- these are distinct metrics;
- client-managed fulfillment does not require Assignment.

### Compatibility

Legacy records may use documented fallback logic until Placement authority is complete.

---

## V6P-015B — Migrate affected V6 counters/UI queries to fulfillment selector

**Class:** COMPAT  
**Milestone:** M5  
**Dependencies:** V6P-015A

### Goal

Prevent future V7 reports from mixing Assignment count with Placement fulfillment.

### Tests

Opening containing client-managed effective Placements reports fulfilled count without fake active Worker count.

---

# 13. Track L — Effective time, audit and command context

## V6P-020A — Standardize critical movement metadata

**Class:** BLOCKER  
**Milestone:** M4  
**Dependencies:** V6P-000

### Standard facts

```text
effectiveAt
recordedAt
actorType / actorId
source
reason? / evidenceRef?
correlationId
```

### Applies to at least

- handling assign/transfer/release/expiry;
- Placement confirm/effective/fail/void;
- Assignment start/end/transfer/correction;
- EmploymentEpisode start/end;
- attribution override/supersede;
- beneficiary decision/supersede when introduced.

### Rule

`createdAt` alone is never sufficient for backdated business movement.

---

## V6P-027A — Add command/request correlation metadata

**Class:** COMPAT  
**Milestone:** M4  
**Dependencies:** V6P-020A

### Goal

Events generated by one business command can be traced as one operation.

### Example

`markPlacementEffective` may emit PlacementEffective, AssignmentStarted, PlacementCaseClosed and outbox rows under one `correlationId`.

---

## V6P-027B — Add DomainAuditEvent projection/log

**Class:** COMPAT  
**Milestone:** M4  
**Dependencies:** V6P-020A, V6P-027A

### Rule

Audit log is a readable projection and does not replace canonical lifecycle tables/history.

### Minimum fields

- aggregateType / aggregateId
- eventType
- effectiveAt nullable
- recordedAt
- actorType / actorId
- source
- reason
- correlationId

### Security

Avoid leaking raw sensitive PII into general audit payloads.

---

# 14. Track M — Permission, RLS and command authorization

## V6P-025A — Define V6+/V7 permission catalog additions

**Class:** BLOCKER  
**Milestone:** M1-M4  
**Dependencies:** V6P-000

### Required command-oriented permissions

At minimum cover:

```text
talent.case.create / close / handle / transfer
talent.interaction.create
talent.next_action.manage
placement.create / confirm / mark_effective / fail / override
workforce.assignment.start / transfer / end / correct_history
partner.attribution.review / override
beneficiary.decide / override (foundation/reserved if entity deferred)
```

### Rule

Role is a permission bundle. Critical services must not branch directly on a role name where a permission is the real authority.

---

## V6P-025B — Update RLS/data scopes for new aggregates

**Class:** BLOCKER  
**Milestone:** M4  
**Dependencies:** relevant schema tasks, V6P-025A

### Principles

- RLS/data scope controls row visibility;
- service authorization controls business action;
- partner/client/integration identities are separate security boundaries;
- `OWN` for Talent is based on active HandlingAssignment, not LaborProfile.ownerId.

### Tests

Security matrix across own/team/other/partner contexts as supported by current role model.

---

## V6P-025C — Block generic mutation of critical lifecycle fields

**Class:** BLOCKER  
**Milestone:** M4  
**Dependencies:** V6P-010B, V6P-004B, V6P-025A

### Critical fields/entities

- Placement status/effectiveAt;
- HandlingAssignment assignee/status;
- ReferralAttribution authority;
- EmploymentEpisode lifecycle;
- ProjectAssignment effective movement;
- beneficiary decisions once implemented.

### Acceptance

UI/API can only change these through validated commands except privileged correction commands with reason/audit.

---

# 15. Track N — Idempotency and concurrency

## V6P-026A — Introduce critical command idempotency pattern

**Class:** BLOCKER  
**Milestone:** M3/M4  
**Dependencies:** V6P-020A

### Commands requiring idempotency at minimum

- createOrMatchLaborProfile
- openPlacementCase
- assign/claim handling
- create/confirm/markPlacementEffective
- startAssignment
- future beneficiary confirmation

### Requirements

- repeated same idempotency key returns same semantic result;
- provider/webhook retries cannot duplicate canonical rows;
- idempotency record itself has bounded retention/policy appropriate to command class.

---

## V6P-026B — Add optimistic concurrency/version checks to stateful aggregates

**Class:** BLOCKER/COMPAT  
**Milestone:** M3/M4  
**Dependencies:** PlacementCase/Placement schema

### Target aggregates

- PlacementCase
- Placement
- other high-contention aggregates where required.

### Tests

Stale version cannot overwrite a newer valid state transition.

---

# 16. Track O — Legacy Handling and Placement migration

## V6P-024C — Classify and migrate legacy HandlingAssignments

**Class:** BLOCKER  
**Milestone:** M5  
**Dependencies:** V6P-024B, V6P-004A, V6P-006

### Rules

- attach to a case only when one correct case is identifiable;
- unresolved legacy handling remains explicit/reviewable;
- never create fake active case solely to retain old ownership data;
- source is preserved separately.

---

## V6P-024D — Classify legacy Assignment -> Placement links

**Class:** BLOCKER  
**Milestone:** M5  
**Dependencies:** V6P-010A, V6P-013, V6P-014A

### Categories

```text
SAFE_HISTORICAL_PLACEMENT
INSUFFICIENT_RECRUITING_EVIDENCE
UNKNOWN_SERVICE_MODEL
UNRESOLVED
```

### Rule

Do not manufacture Application/JobProposal/source provenance to make a historical Placement look complete.

---

## V6P-024E — Execute safe Placement/Assignment backfill

**Class:** BLOCKER  
**Milestone:** M5  
**Dependencies:** V6P-024D

### Tooling

Dry-run, resumable, idempotent, migrationRunId, deterministic report.

### Exit

All unlinked legacy Assignment rows are either truthfully linked or explicitly classified unresolved/legacy.

---

# 17. Track P — Compatibility selectors and authority switch

## V6P-028A — Add current-state selectors

**Class:** COMPAT  
**Milestone:** M5  
**Dependencies:** M1-M4 foundations

### Suggested selectors/services

```text
getCurrentCandidateState()
getCurrentHandler()
getCompanyPoolCases()
getJobFulfillment()
getCurrentWorkforceState()
```

### Rule

UI must not reimplement canonical joins differently across pages.

---

## V6P-028B — Switch new-write authority to V6+ commands

**Class:** BLOCKER  
**Milestone:** M5  
**Dependencies:** V6P-028A, security/idempotency tasks

### Work

- feature-flagged rollout where useful;
- stop new writes through superseded legacy paths;
- preserve compatibility reads for old data;
- telemetry for rejected legacy mutation attempts.

---

# 18. Track Q — Regression fixtures

## V6P-T01 — Referral reclaim fixture

**Permanent test:** existing profile attributed to Partner A, Partner B resubmits.

Expected:

- same LaborProfile;
- attribution A preserved;
- Intake records B;
- case acquisition may record B if business event warrants;
- no silent beneficiary/source reassignment.

---

## V6P-T02 — Direct hire fixture

Expected:

```text
CLIENT_MANAGED Placement EFFECTIVE
PlacementCase CLOSED_SUCCESS
no Worker created
no Episode
no Assignment
LaborProfile retained
```

---

## V6P-T03 — No-show fixture

Expected:

```text
Placement CONFIRMED -> FAILED
planned Assignment CANCELLED if present
no Episode starts
no first Worker creation
case may return to matching
no effective beneficiary trigger
```

---

## V6P-T04 — Transfer fixture

Expected:

```text
same Worker
same active EmploymentEpisode
old PRIMARY Assignment ENDED/TRANSFERRED
new PRIMARY Assignment ACTIVE
history retained
```

---

## V6P-T05 — Rehire fixture

Expected:

```text
same LaborProfile
same Worker
new PlacementCase
new Placement
new EmploymentEpisode
new PRIMARY Assignment
```

---

## V6P-T06 — Multi-job case fixture

Expected:

```text
one PlacementCase
Application Samsung
JobProposal Actro
failed Placement Samsung optional
successful Placement Actro
no fake Application Actro
```

---

## V6P-T07 — Concurrent Company Pool claim

Expected:

Only one active HandlingAssignment is created; losing request gets deterministic conflict response.

---

## V6P-T08 — Duplicate Worker conversion

Expected:

Concurrent HRP-managed actual-start commands reuse/create exactly one Worker.

---

# 19. V7 Compatibility Gate

No affected V7 feature phase may begin until all required checks are green.

## Identity

- [ ] one canonical create-or-match service is used for new intake paths;
- [ ] POSSIBLE_MATCH never unsafe-auto-merges;
- [ ] one Worker per LaborProfile enforced;
- [ ] existing profile referral cannot overwrite canonical source.

## PlacementCase

- [ ] persistence exists;
- [ ] normal open/close commands exist;
- [ ] new Applications are case-aware;
- [ ] max one active case per LaborProfile is concurrency-safe;
- [ ] General Interest works as a case with zero Applications.

## Handling

- [ ] HandlingAssignment is case-scoped for new flow;
- [ ] max one active handling per case;
- [ ] AFF 7-day handling starts at case open, not profile create/match;
- [ ] handling expiry preserves source;
- [ ] Company Pool derives from active case + no active handler.

## Placement

- [ ] independent Placement entity exists;
- [ ] PlacementCase supports multiple placement attempts;
- [ ] client-managed effective Placement creates no Worker;
- [ ] HRP-managed effective outcome is tied to actual workforce start;
- [ ] no-show path creates no false workforce history;
- [ ] historical ServiceModel is preserved on Placement.

## Workforce

- [ ] same Worker reused on rehire;
- [ ] rehire creates new EmploymentEpisode;
- [ ] max one active PRIMARY Assignment per Worker;
- [ ] transfer retains same Episode when continuity applies;
- [ ] Assignment may link Placement without forcing false legacy links.

## Commands / security / audit

- [ ] critical status changes use commands, not generic updates;
- [ ] permission catalog updated;
- [ ] RLS/data scopes cover new aggregates;
- [ ] critical commands idempotent;
- [ ] concurrency tests pass;
- [ ] effectiveAt/recordedAt/actor/source pattern implemented;
- [ ] correlation/audit available;
- [ ] outbox writes occur transactionally with canonical changes where events are emitted.

## Migration

- [ ] migration audit report generated;
- [ ] backfills are dry-run capable and rerunnable;
- [ ] unresolved history is reported, not guessed;
- [ ] no fake Application created;
- [ ] no fake PlacementCase created solely to satisfy FK;
- [ ] no canonical referral source overwritten;
- [ ] all permanent regression fixtures pass.

---

# 20. Suggested execution order for AI coding

```text
Batch 0 — Contract / discovery
V6P-000
V6P-001
V6P-009A

Batch 1 — Identity + case schema
V6P-007A
V6P-007B
V6P-008
V6P-021
V6P-001A
V6P-025A

Batch 2 — Case behavior + Application
V6P-001B
V6P-003
V6P-002A
V6P-002B

Batch 3 — Handling
V6P-004A
V6P-005
V6P-006
V6P-004B
V6P-019

Batch 4 — ServiceModel + Placement
V6P-014A
V6P-010A
V6P-014B
V6P-026A
V6P-026B
V6P-010B
V6P-011

Batch 5 — Workforce bridge
V6P-022A
V6P-023
V6P-013
V6P-012
V6P-022B

Batch 6 — CRM foundation + audit/security hardening
V6P-020A
V6P-027A
V6P-027B
V6P-016
V6P-017
V6P-018A
V6P-018B
V6P-025B
V6P-025C
V6P-009B

Batch 7 — Legacy classification/backfill
V6P-024A
V6P-024B
V6P-024C
V6P-024D
V6P-024E

Batch 8 — Compatibility authority switch
V6P-015A
V6P-015B
V6P-028A
V6P-028B

Batch 9 — Gate
V6P-T01 .. V6P-T08
V7 Compatibility Gate
```

Tasks within a batch may run in parallel only where their listed dependencies are satisfied and they do not mutate the same migration authority simultaneously.

---

# 21. AI coding task template

Every implementation ticket generated from this backlog should use this shape:

```text
Task ID:
Version: V6+
Classification: BLOCKER | COMPAT | HARDENING
Aggregate / bounded context:

Goal:

Prerequisites:

Source-of-truth decisions:

Schema impact:

Migration impact:

Commands / service impact:

Security / RLS impact:

Audit / outbox impact:

Forbidden shortcuts:

Tests:

Observability / migration report:

Rollback / feature flag notes:

Exit gate:
```

A task is not complete merely because code compiles. Its stated domain invariant, migration safety and regression tests must pass.

---

# 22. Deferred cleanup after V7 stabilization

Do not block V7 on cosmetic cleanup such as:

- renaming `CandidateSubmission` to `Application` everywhere;
- removing all nullable legacy compatibility FKs;
- dropping old ownership/pool/counter columns before authority switch proves stable;
- deep JobTerms versioning;
- full partner/client portals;
- external Chatwoot/Zalo rollout;
- AI ranking/reactivation;
- payroll/internal HRM/commission calculation.

Cleanup requires a separate post-stabilization plan after production telemetry confirms the V6+ path is authoritative.
