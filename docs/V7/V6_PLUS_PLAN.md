# HRP V6+ — V7 Compatibility & Domain Foundation

> Status: Architecture / Implementation Plan
> Purpose: Bridge HRP V6 to HRP V7 Workforce Supply OS without inventing history or breaking canonical data.
> Scope: schema foundation, semantic corrections, migration/backfill, command boundaries, security hardening, and V7 entry gates.
> Out of scope: Payroll, internal HRM, commission amount/formula calculation.

---

## 1. Why V6+ exists

V6 remains the Marketplace/Admin canonicalization release. V6+ is not a large feature release; it is a compatibility and domain-correction release that prepares the canonical model required by V7.

V6+ must be completed before V7 feature work that depends on PlacementCase, Placement, case-scoped handling, canonical workforce transitions, partner attribution/beneficiary decisions, or the new Talent Workbench.

Implementation rule:

```text
ADD -> BACKFILL -> COMPATIBILITY READ -> SWITCH AUTHORITY -> CLEANUP LATER
```

Do not perform destructive renames/drops or rewrite historical data merely to make the new schema look clean.

---

## 2. Domain constitution inherited from V6 and extended for V7

These are non-negotiable invariants for V6+ implementation:

```text
LaborProfile != Worker
Application != Placement
Placement != ProjectAssignment
PlacementCase != JobOpening
PlacementCase != EmploymentEpisode
ReferralAttribution != HandlingAssignment
HandlingAssignment != CommissionBeneficiaryDecision
ClientCompany != Project
StaffingOrder != JobOpening
JobOpening != JobPosting
ServiceModel != WorkClassification
Talent Repository != Company Pool
```

Additional invariants:

1. One person has one canonical `LaborProfile`.
2. One `LaborProfile` has at most one `Worker`.
3. A returning worker reuses the same `Worker`; rehire creates a new `EmploymentEpisode` and new `ProjectAssignment`.
4. New V7-originated Applications must belong to a `PlacementCase`.
5. A `LaborProfile` may have many historical PlacementCases but at most one active PlacementCase.
6. A PlacementCase may have many Applications, JobProposals and Placement attempts.
7. A PlacementCase may have at most one active HandlingAssignment.
8. Referral/source provenance is not overwritten when handler changes.
9. Placement may become effective without Worker/Assignment for client-managed service models.
10. Worker lifecycle starts only on actual HRP-managed workforce start, not on acceptance/confirmation.
11. Critical movements require `effectiveAt`, `recordedAt`, actor, source and history.
12. Operational backfill must not create fake Applications or fake job-search history.

---

## 3. Owner decisions already locked

### 3.1 AFF 7-day handling clock

`ReferralAttribution` is created when a valid source is established. The 7-day `HandlingAssignment` clock begins only when an active `PlacementCase` is opened from a valid job-seeking intent.

```text
valid attribution
   -> LaborProfile create/match
   -> job-seeking intent?
      -> no: attribution only
      -> yes: open PlacementCase
              -> create AFF_INITIAL HandlingAssignment
              -> expiresAt = case openedAt + 7 days
```

Expiration of handling does not remove attribution. If the case remains active and there is no active handler, it appears in Company Pool.

### 3.2 Active assignment invariant

A Worker has at most one active `PRIMARY` ProjectAssignment at a time.

`SECONDARY` may be reserved in the data model for future business requirements but is not part of the V7 MVP workflow.

### 3.3 Service model taxonomy

Canonical V7 ServiceModels:

```text
STAFFING_SUPPLY     -> HRP_MANAGED
LABOR_LEASING       -> HRP_MANAGED
RECRUITMENT_SERVICE -> CLIENT_MANAGED
REFERRAL_SERVICE    -> CLIENT_MANAGED
```

`HRP_MANAGED` / `CLIENT_MANAGED` are derived classifications, not independently mutable fields.

`TEMPORARY`, `PERMANENT`, etc. belong to WorkClassification, not ServiceModel.

---

## 4. V6+ impact register

| ID | Work item | Class | Required before V7? |
|---|---|---|---|
| V6P-001 | Add `PlacementCase` persistence foundation | BLOCKER | Yes |
| V6P-002 | Link `CandidateSubmission` / Application to PlacementCase | BLOCKER | Yes |
| V6P-003 | Enforce max 1 active PlacementCase / LaborProfile | BLOCKER | Yes |
| V6P-004 | Move HandlingAssignment semantic authority to PlacementCase | BLOCKER | Yes |
| V6P-005 | Enforce max 1 active HandlingAssignment / case | BLOCKER | Yes |
| V6P-006 | Implement new AFF 7-day trigger rule | BLOCKER | Yes |
| V6P-007 | Harden canonical create-or-match / dedup | BLOCKER | Yes |
| V6P-008 | Prevent referral source overwrite on existing profiles | BLOCKER | Yes |
| V6P-009 | Separate source / handler / beneficiary in schema + services | BLOCKER | Yes |
| V6P-010 | Add independent `Placement` foundation | BLOCKER | Yes |
| V6P-011 | Allow effective Placement without Worker/Assignment | BLOCKER | Yes |
| V6P-012 | Prevent Worker creation before actual workforce start | BLOCKER | Yes |
| V6P-013 | Add optional `ProjectAssignment.placementId` | COMPAT | Recommended |
| V6P-014 | Add `JobOpening.serviceModel` | COMPAT | Yes for V7 Placement UX |
| V6P-015 | Remove hard dependency `fulfillment = assignment count` | COMPAT | Yes |
| V6P-016 | Add `JobProposal` foundation | COMPAT | Recommended |
| V6P-017 | Add `InteractionOutcome` foundation | COMPAT | Recommended |
| V6P-018 | Add `NextAction` foundation | COMPAT | Recommended |
| V6P-019 | Make Company Pool a projection from case + handling | COMPAT | Yes |
| V6P-020 | Harden effective-time / actor / source / history contract | BLOCKER | Yes |
| V6P-021 | Verify one Worker per LaborProfile | BLOCKER | Yes |
| V6P-022 | Verify rehire = same Worker + new Episode | BLOCKER | Yes |
| V6P-023 | Enforce max 1 active PRIMARY Assignment / Worker | BLOCKER | Yes |
| V6P-024 | Migration/backfill with no fabricated history | BLOCKER | Yes |
| V6P-025 | Update permission catalog, RLS and command authorization | BLOCKER | Yes |
| V6P-026 | Add idempotency and concurrency protection for critical commands | BLOCKER | Yes |
| V6P-027 | Add domain audit/correlation metadata | COMPAT | Recommended |

---

## 5. Implementation phases

### V6+.0 — Freeze contract and audit current state

Deliverables:

- `V6_PLUS_DOMAIN_CONTRACT.md` or equivalent section in this file.
- Data inventory / migration audit report.
- No production behavior changes yet.

Audit at minimum:

- total LaborProfiles;
- Workers without canonical LaborProfile relation;
- duplicate normalized phones;
- duplicate/ambiguous identity documents;
- CandidateSubmissions without canonical profile;
- profiles with multiple active recruiting-like records;
- Workers with multiple active assignments;
- Assignments missing expected Project/Job relationships;
- source/referral conflicts;
- legacy status combinations;
- rows that cannot be migrated without inference.

Classify identity findings as:

```text
EXACT_SAFE
POSSIBLE_DUPLICATE
UNRESOLVED
```

Never auto-merge `POSSIBLE_DUPLICATE` solely to make migration pass.

### V6+.1 — Add schema foundation

Recommended dependency order:

```text
PlacementCase
  -> CandidateSubmission.placementCaseId
  -> HandlingAssignment.placementCaseId
  -> Placement
  -> ProjectAssignment.placementId?
  -> JobOpening.serviceModel
  -> JobProposal
  -> InteractionOutcome
  -> NextAction
```

Migration rules:

- Additive first.
- New foreign keys may begin nullable where legacy data cannot be truthfully backfilled.
- New V7-originated records must follow stronger invariants than legacy records.
- Do not rename `CandidateSubmission` only for vocabulary cleanup during V6+.

### V6+.2 — Backfill PlacementCase safely

Do not assume `1 CandidateSubmission = 1 PlacementCase`.

Backfill categories:

**A. High-confidence legacy case**
- Evidence safely supports one job-search episode.
- Create PlacementCase with migration provenance.

**B. Ambiguous historical grouping**
- Do not invent temporal grouping rules such as arbitrary 30-day windows unless explicitly approved.
- Keep links unresolved or mark migration confidence/review state.

**C. Operational worker/assignment backfill without recruiting evidence**
- Do not create fake PlacementCase/Application.
- Keep legacy workforce history valid independently.

Suggested migration metadata:

```text
origin = LEGACY_V6_MIGRATION
migrationRunId
migrationConfidence
```

This metadata may live in audit/provenance rather than permanent business columns.

### V6+.3 — Migrate Handling semantics

For every existing handling record:

- if exactly one valid active PlacementCase is identifiable, attach handling to the case;
- otherwise do not create a fake case merely to preserve handling;
- retain history and mark unresolved legacy handling for review where required.

Implement the locked AFF rule:

```text
Attribution may pre-exist a case.
AFF_INITIAL handling starts only when the PlacementCase opens.
```

Company Pool becomes:

```text
active PlacementCase
AND no valid active HandlingAssignment
```

It is a query/projection, not a manually synchronized status.

### V6+.4 — Introduce Placement as a canonical bridge

Placement must be independent from Assignment.

Conceptual minimum:

```text
Placement
- laborProfileId
- placementCaseId
- jobOpeningId?
- clientCompanyId
- projectId?
- serviceModelSnapshot
- status
- selectedAt?
- confirmedAt?
- effectiveAt?
- sourceApplicationId?
- sourceJobProposalId?
- failureReason?
- confirmationSource?
- created/recorded actor metadata
```

A PlacementCase can have many Placement attempts.

New HRP-managed flow:

```text
Placement CONFIRMED
 -> actual start command
 -> ensure Worker
 -> open/reuse active EmploymentEpisode
 -> start PRIMARY ProjectAssignment
 -> Placement EFFECTIVE
 -> close PlacementCase SUCCESS
```

New client-managed flow:

```text
Placement CONFIRMED
 -> client employment start confirmed
 -> Placement EFFECTIVE
 -> close PlacementCase SUCCESS
 -> no Worker/Episode/Assignment creation
```

Do not backfill every historical Assignment as a Placement unless evidence is sufficient.

### V6+.5 — ServiceModel foundation

Add canonical ServiceModel to JobOpening for new data.

Legacy openings may use an explicit legacy/unknown migration state or remain nullable during migration; do not blindly classify all historical openings as HRP-managed.

Placement always snapshots the ServiceModel used for its outcome so later JobOpening changes do not rewrite history.

### V6+.6 — Workforce linkage hardening

Rules:

- Worker created only when HRP-managed workforce actually begins.
- one Worker / LaborProfile;
- rehire uses same Worker;
- new EmploymentEpisode after genuine exit/re-entry;
- transfer within continuous HRP workforce ends old PRIMARY Assignment and starts new PRIMARY Assignment within same Episode;
- Assignment should reference Placement when created through new V7 flow;
- legacy Assignment may have `placementId = null`.

### V6+.7 — Command layer

Critical state transitions must not be generic CRUD patches.

Minimum command set:

```text
openPlacementCase
closePlacementCase
attachApplicationToCase
assignHandling
claimPoolCase
transferHandling
releaseHandling
recordInteraction
createNextAction
completeNextAction
createPlacement
confirmPlacement
failPlacement
cancelPlacement
markPlacementEffective
startAssignment
endAssignment
transferWorker
correctAssignmentHistory
```

Each command contract must define:

- permission;
- scope;
- preconditions;
- allowed state transition;
- transaction effects;
- audit effects;
- outbox events;
- idempotency behavior;
- concurrency behavior;
- forbidden shortcuts.

### V6+.8 — Security, RLS, audit, idempotency

Security layers:

```text
Authentication
 -> Permission catalog
 -> Domain authorization
 -> RLS/data visibility
 -> Audit/history
```

Roles are permission bundles; business services authorize against command permissions, not hard-coded role names.

Critical permissions should be command-oriented, e.g.:

```text
placement.mark_effective
placement.override
workforce.assignment.start
workforce.assignment.transfer
partner.attribution.override
beneficiary.decide
```

Critical movements must store:

```text
effectiveAt
recordedAt
actor
source
reason/evidence when required
correlationId/requestId where useful
```

Critical commands must be idempotent and concurrency-safe.

### V6+.9 — Compatibility reads and authority switch

Introduce compatibility selectors/services so UI does not embed old assumptions:

```text
getCurrentCandidateState()
getCurrentHandler()
getJobFulfillment()
getCurrentWorkforceState()
```

During transition, document for each concept:

```text
legacy source
compatibility source
future canonical source
```

Example:

```text
Legacy fulfillment: Assignment count
V6+ compatibility: FulfillmentProjection
V7 canonical: effective Placement according to ServiceModel
```

Never let two sources silently claim to be canonical at the same time.

### V6+.10 — Enforce database invariants

After data is audited/backfilled:

- max 1 active PlacementCase / LaborProfile;
- max 1 active HandlingAssignment / PlacementCase;
- unique Worker / LaborProfile;
- max 1 active PRIMARY Assignment / Worker;
- new Applications require PlacementCase;
- new case handling requires PlacementCase;
- new HRP-managed workforce starts should link to Placement.

Use DB constraints/partial unique indexes where feasible, plus service-level validation and concurrency tests.

---

## 6. Migration execution requirements

Every data migration/backfill must support, where feasible:

- dry-run mode;
- deterministic rerun/idempotency;
- count reporting;
- unresolved-row reporting;
- fail-closed behavior for ambiguous identity/history;
- migration provenance;
- no demo/seed contamination of production metrics.

Example output:

```text
Scanned: 12,420
Safely migrated: 11,980
Needs review: 380
Failed validation: 60
```

---

## 7. Required permanent regression fixtures

### Fixture A — Referral + handler transfer + rehire

Input history:

```text
LaborProfile A
canonical source = CTV X
Case handler A -> expires
handler B claims
Placement Actro effective
Worker already exists from an older episode
```

Expected:

- same LaborProfile;
- same Worker;
- source remains CTV X;
- handling history A -> B retained;
- Placement Actro retained;
- new EmploymentEpisode/Assignment only when this is a true rehire;
- beneficiary evaluation uses milestone snapshot, not current handler.

### Fixture B — Direct hire

```text
LaborProfile B
Placement Samsung
ServiceModel = RECRUITMENT_SERVICE or REFERRAL_SERVICE
```

Expected:

- Placement EFFECTIVE;
- PlacementCase CLOSED_SUCCESS;
- no Worker created solely for this outcome;
- no EmploymentEpisode/Assignment;
- LaborProfile remains in repository;
- external relationship may be observed;
- beneficiary decision may be produced.

### Fixture C — No-show

```text
Placement CONFIRMED
candidate does not start
```

Expected:

- Placement FAILED;
- planned Assignment cancelled if it existed;
- no EmploymentEpisode started;
- no first-time Worker created merely from confirmation;
- case may return to MATCHING;
- no effective beneficiary trigger.

### Fixture D — Transfer

```text
Worker active
Episode #1 active
PRIMARY Assignment Actro active
```

Transfer to Wisum expected:

- same Worker;
- same EmploymentEpisode;
- Actro assignment ended with TRANSFERRED reason;
- Wisum PRIMARY assignment active;
- placement/movement history retained.

### Fixture E — Rehire

```text
Worker exists
Episode #1 ended
person returns later
```

Expected:

- same LaborProfile;
- same Worker;
- new PlacementCase;
- new Placement;
- new Episode #2;
- new Assignment.

### Fixture F — Referral reclaim attempt

```text
Profile already canonically attributed to CTV A
CTV B submits same person later
```

Expected:

- existing profile matched;
- canonical attribution remains A unless formal dispute/override succeeds;
- new Intake records B;
- new case acquisition source may record B;
- no silent source overwrite.

---

## 8. V7 compatibility gate

V7 feature implementation must not begin until the following are green:

### Identity

- [ ] canonical LaborProfile create-or-match works;
- [ ] possible duplicates do not auto-merge unsafely;
- [ ] one Worker per LaborProfile is enforced;
- [ ] legacy identity conflicts are reported.

### PlacementCase

- [ ] PlacementCase persistence exists;
- [ ] new Applications are case-linked;
- [ ] max one active case is enforced;
- [ ] case history can be preserved without fabricating legacy history.

### Handling

- [ ] handling is case-scoped;
- [ ] max one active handler per case;
- [ ] AFF 7-day rule uses case opening;
- [ ] Company Pool projection works;
- [ ] attribution does not change when handling expires/transfers.

### Placement

- [ ] Placement is independent from Assignment;
- [ ] PlacementCase can keep multiple Placement attempts;
- [ ] direct-hire/client-managed Placement can become EFFECTIVE without Worker;
- [ ] HRP-managed effective path starts workforce atomically;
- [ ] no-show does not create fake Worker history.

### Workforce

- [ ] transfer preserves EmploymentEpisode continuity;
- [ ] rehire uses same Worker + new Episode;
- [ ] max one active PRIMARY Assignment is enforced;
- [ ] movement history records effectiveAt + actor + source.

### Security

- [ ] command permissions exist;
- [ ] RLS is updated;
- [ ] critical commands are idempotent;
- [ ] race conditions are tested;
- [ ] override/correction commands require audit reason/evidence.

### Migration

- [ ] no fake Application created;
- [ ] no referral source silently overwritten;
- [ ] unresolved data is reported, not guessed;
- [ ] migration reports can be reviewed and rerun safely.

---

## 9. AI coding task contract template

Every V6+ task should include:

```text
Version: V6+
Classification: BLOCKER | COMPAT | HARDENING
Aggregate:
Prerequisites:

Business goal:

Schema impact:
Migration impact:
Business invariants:
Commands / APIs:
Permissions / RLS:
Audit requirements:
Idempotency / concurrency:
Tests:
Forbidden shortcuts:
Exit gate:
```

Do not create broad tasks such as “Build PlacementCase”. Split schema, constraints, services, commands, migration, security and tests into explicit slices with dependencies.

---

## 10. Release sequence

```text
V6 FINAL
  -> V6+ Foundation 1: schema + audit
  -> V6+ Foundation 2: commands + migration + security
  -> V6+ Gate Release
  -> V7.1 Talent Repository
  -> V7.2 Talent Workbench
  -> V7.3 Matching
  -> V7.4 Placement & ServiceModel UX
  -> V7.5 Workforce Operations
  -> V7.6 Partner Network
  -> V7.7 Beneficiary Integration
  -> V7.8 HRP canonical Client/Demand; CRM app engagement UI
  -> V7.9 HRP↔CRM integration gate; CRM app Omnichannel runtime
  -> V7.10 HRP operational intelligence; CRM app conversational AI
```

Feature flags may be used for safe rollout, but they must not preserve competing canonical semantics indefinitely.

Owner decision 13/09/2026: [HRP_CRM_INFRA_SPLIT.md](HRP_CRM_INFRA_SPLIT.md) assigns all Chat/CSKH runtime, workbench and channel adapters to the separate CRM app. V6+ still builds only the canonical HRP foundations and connector-ready commands/events.

Destructive cleanup such as renaming `CandidateSubmission`, dropping legacy source fields, or deleting compatibility projections belongs to a later stabilization/cleanup phase after V7 paths have proven stable in production.

---

## 11. Definition of done for V6+

V6+ is complete when:

1. the V7 domain contract can be expressed without relying on legacy semantic shortcuts;
2. new records follow V7-compatible invariants;
3. legacy data remains truthful even when incomplete;
4. critical lifecycle commands are permissioned, idempotent, audited and concurrency-safe;
5. no migration creates fabricated Application/source/placement history;
6. both client-managed and HRP-managed Placement outcomes are representable;
7. Worker re-entry and transfer semantics are stable;
8. the full V7 compatibility gate passes.

