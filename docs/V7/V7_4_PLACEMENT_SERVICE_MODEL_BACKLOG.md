# HRP V7.4 — PLACEMENT & SERVICE MODEL IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V7.4  
**Prerequisite:** V7.3 Exit Gate PASS  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` is mandatory  
**Primary bounded context:** Matching & Placement  
**Primary aggregate:** `Placement`

---

# 0. PURPOSE

V7.4 establishes `Placement` as the canonical business bridge between recruiting and real fulfillment.

It must support:

```text
Placement attempts
selected opportunity
confirmation
failure / no-show
EFFECTIVE milestone
CLIENT_MANAGED outcome
HRP_MANAGED outcome
ServiceModel behavior
JobOpening fulfillment
direct-hire confirmation
```

`Placement != ProjectAssignment`.

Not every successful Placement creates a Worker.

---

# 1. NON-NEGOTIABLE INVARIANTS

1. `Placement` is independent from `Application`.
2. `Placement` is independent from `JobProposal`.
3. `Placement` is independent from `ProjectAssignment`.
4. One PlacementCase may have multiple Placement attempts.
5. Failed Placement does not automatically close PlacementCase.
6. PlacementCase closes SUCCESS only when an eligible Placement becomes EFFECTIVE.
7. `ServiceModel` is canonical on JobOpening and snapshotted by Placement.
8. Initial ServiceModels:
   - `STAFFING_SUPPLY`
   - `LABOR_LEASING`
   - `RECRUITMENT_SERVICE`
   - `REFERRAL_SERVICE`
9. Management mode is derived:
   - `STAFFING_SUPPLY`, `LABOR_LEASING` => `HRP_MANAGED`
   - `RECRUITMENT_SERVICE`, `REFERRAL_SERVICE` => `CLIENT_MANAGED`
10. `CLIENT_MANAGED` EFFECTIVE does not create Worker/Episode/Assignment.
11. `HRP_MANAGED` EFFECTIVE requires actual workforce start.
12. No-show before actual start must not create a first-time Worker/EmploymentEpisode.
13. Fulfillment is based on Placement EFFECTIVE, not raw Application or Assignment count.
14. Critical transitions use commands and centralized policy modules.
15. No ServiceModel-specific logic may be duplicated across controllers/UI.

---

# 2. DELIVERY SLICES

```text
V7.4a — ServiceModel + Placement core
V7.4b — Placement attempt lifecycle
V7.4c — CLIENT_MANAGED direct-hire/referral path
V7.4d — HRP_MANAGED workforce bridge
V7.4e — JobOpening fulfillment + reporting
V7.4f — Failure/no-show/correction hardening
```

---

# 3. V7.4a — SERVICEMODEL + PLACEMENT CORE

## V74-001 — Canonical ServiceModel catalog

**Type:** Domain catalog  
**Priority:** BLOCKER

One authoritative module owns:

```text
STAFFING_SUPPLY
LABOR_LEASING
RECRUITMENT_SERVICE
REFERRAL_SERVICE
```

Expose derived:

```text
managementMode
```

Do not store contradictory duplicate management mode if it can be derived.

---

## V74-002 — ServiceModel behavior policy

**Type:** Domain policy  
**Priority:** BLOCKER

Create centralized policy API, conceptually:

```text
getManagementMode(serviceModel)
requiresHRPWorkforceStart(serviceModel)
requiresClientEmploymentConfirmation(serviceModel)
```

Do not scatter switches across routes and UI.

---

## V74-003 — JobOpening ServiceModel validation

**Type:** Domain/service invariant  
**Priority:** BLOCKER

New JobOpening must have valid ServiceModel.

Legacy `UNKNOWN`/nullable handling must follow V6+ compatibility policy and cannot silently proceed to Placement EFFECTIVE without resolution.

---

## V74-004 — Placement schema finalization

**Type:** Schema  
**Priority:** BLOCKER

Conceptual:

```text
id
placementCaseId
laborProfileId
jobOpeningId
clientCompanyId
projectId?

serviceModelSnapshot

sourceApplicationId?
sourceJobProposalId?

status
selectedAt?
confirmedAt?
effectiveAt?

plannedStartAt?

failureReason?
cancelReason?

confirmationSource?
evidenceRef?

createdByUserId
recordedAt
createdAt
updatedAt
version
```

---

# 4. V7.4b — PLACEMENT ATTEMPT LIFECYCLE

## V74-010 — Placement state machine

**Type:** Domain policy  
**Priority:** BLOCKER

Canonical lifecycle:

```text
SELECTED
CONFIRMED
EFFECTIVE
FAILED
CANCELLED
VOIDED
```

`VOIDED` is an authorized correction/exception path, not normal failure.

---

## V74-011 — createPlacement command

Inputs:

```text
placementCaseId
jobOpeningId
sourceApplicationId?
sourceJobProposalId?
plannedStartAt?
actor/source
```

Preconditions:

```text
case active
job eligible
service model known
candidate/job relationship valid
no conflicting active Placement attempt if policy forbids
```

Effects:

```text
create SELECTED Placement
snapshot ServiceModel
audit/outbox
```

---

## V74-012 — confirmPlacement command

Moves:

```text
SELECTED -> CONFIRMED
```

Requires confirmation evidence/source appropriate to ServiceModel.

Candidate acceptance alone must not equal EFFECTIVE.

---

## V74-013 — failPlacement command

Moves eligible active state to:

```text
FAILED
```

Requires:

```text
failureReason
effectiveAt/occurredAt
actor/source
```

PlacementCase may return to MATCHING/PROPOSED according to centralized case transition policy.

---

## V74-014 — cancelPlacement command

Use when attempt is cancelled before business failure is established.

Preserve history.

---

# 5. FAILURE REASON CATALOG

## V74-020 — Placement failure catalog

Centralized vocabulary:

```text
CANDIDATE_NO_SHOW
CANDIDATE_WITHDREW
CLIENT_CANCELLED
CLIENT_REJECTED
DOCUMENT_FAILED
MEDICAL_FAILED
POSITION_CLOSED
ELIGIBILITY_FAILED
OTHER
```

Do not hardcode display labels/logic per screen.

---

# 6. V7.4c — CLIENT_MANAGED PATH

## V74-030 — Client-managed confirmation policy

Applies:

```text
RECRUITMENT_SERVICE
REFERRAL_SERVICE
```

EFFECTIVE means client employment/start has been sufficiently confirmed.

Required canonical facts:

```text
confirmedBy/source
confirmedAt
effectiveStartAt
evidenceRef? according to policy
```

---

## V74-031 — confirmClientHire command

Records client-side acceptance/confirmation.

Does not create Worker.

---

## V74-032 — markClientManagedPlacementEffective command

Preconditions:

```text
Placement CONFIRMED
ServiceModel is CLIENT_MANAGED
effective employment evidence sufficient
```

Effects:

```text
Placement -> EFFECTIVE
PlacementCase -> CLOSED SUCCESS
record external relationship observation
emit PlacementEffective
do NOT create Worker
do NOT create EmploymentEpisode
do NOT create Assignment
```

Beneficiary integration is consumed later by V7.7.

---

# 7. V7.4d — HRP_MANAGED WORKFORCE BRIDGE

## V74-040 — HRP-managed actual-start policy

Applies:

```text
STAFFING_SUPPLY
LABOR_LEASING
```

EFFECTIVE is reached only when actual workforce start occurs.

Do not mark effective merely because:

```text
candidate accepted
client accepted
plannedStartAt arrived
Assignment is PLANNED
```

---

## V74-041 — startHRPManagedPlacement command

Preconditions:

```text
Placement CONFIRMED
ServiceModel HRP_MANAGED
actual start confirmed
no conflicting active PRIMARY Assignment
```

Effects in one HRP transaction:

```text
ensure/reuse Worker
open EmploymentEpisode if needed
start PRIMARY ProjectAssignment
Placement -> EFFECTIVE
PlacementCase -> CLOSED SUCCESS
audit
outbox
```

Must be idempotent.

---

## V74-042 — First-time no-show protection

If candidate never actually starts:

```text
Placement -> FAILED(CANDIDATE_NO_SHOW)
planned Assignment -> CANCELLED if it exists
no first Worker created
no EmploymentEpisode created
```

If Worker already exists historically, do not create new Episode.

---

# 8. V7.4e — JOBOPENING FULFILLMENT

## V74-050 — Fulfillment projection

Canonical principle:

```text
fulfilledCount
=
count of EFFECTIVE Placements
eligible for this JobOpening
```

Do not use raw Application count.

Do not use active Assignment count as universal fulfillment.

---

## V74-051 — Workforce-active projection

Separate metric:

```text
activeWorkerCount
```

for HRP-managed jobs/projects.

This is not the same as historical effective Placement count.

---

## V74-052 — Remaining demand projection

Conceptual:

```text
remaining =
requestedHeadcount - fulfilledCount
```

Policy must handle:

```text
cancelled demand
overfill
reopened demand
manual correction
```

centrally.

---

## V74-053 — JobOpening operational dashboard

Show separately:

```text
requested headcount
applications
proposals
placements selected
placements confirmed
placements effective
placements failed
currently active HRP workers where applicable
remaining demand
```

---

# 9. V7.4f — CORRECTION / VOID / HISTORY

## V74-060 — voidPlacement command

Elevated permission.

Requires:

```text
reason
evidence
actor
effective correction time
```

Must not simply delete Placement.

Downstream reconciliation implications must be recorded/emitted.

---

## V74-061 — Placement correction policy

Changes to:

```text
effectiveAt
jobOpening
serviceModel snapshot
```

after EFFECTIVE are sensitive.

Do not allow generic edit.

Use explicit correction commands or superseding records according to architecture decision.

---

# 10. CONCURRENCY / IDEMPOTENCY

Permanent protections:

```text
duplicate createPlacement
duplicate confirmPlacement
duplicate markEffective
concurrent HRP workforce start
concurrent client confirmation
```

Must not create:

```text
duplicate effective Placements
duplicate Workers
duplicate Episodes
duplicate PRIMARY Assignments
```

---

# 11. SECURITY

Suggested permissions:

```text
placement.read
placement.create
placement.confirm
placement.fail
placement.cancel
placement.mark_effective
placement.override

client_hire.confirm
workforce.start_from_placement
```

Partner users must not mark Placement EFFECTIVE directly unless a future explicit policy allows a limited confirmation command.

---

# 12. PERMANENT REGRESSION FIXTURES

## RF-P-01 — Application Samsung, Placement Actro

Original Application remains Samsung.

Placement references Actro.

---

## RF-P-02 — Failed then successful Placement in same case

```text
Samsung FAILED
Actro EFFECTIVE
```

Case closes only after Actro EFFECTIVE.

---

## RF-P-03 — Direct hire effective

No Worker/Episode/Assignment created.

---

## RF-P-04 — HRP-managed effective

Worker/Episode/PRIMARY Assignment created/reused correctly.

---

## RF-P-05 — First-time no-show

No Worker/Episode created.

---

## RF-P-06 — Existing former Worker rehire via Placement

Same Worker, new Episode.

---

## RF-P-07 — Client-managed placement does not inflate active workforce

fulfilledCount increases; activeWorkerCount does not.

---

## RF-P-08 — HRP-managed Worker later leaves

historical fulfilledCount remains; activeWorkerCount decreases.

---

## RF-P-09 — Unknown legacy ServiceModel

Cannot mark EFFECTIVE until resolved by approved compatibility flow.

---

## RF-P-10 — Duplicate markEffective

Idempotent; no duplicate side effects.

---

## RF-P-11 — Placement void

History preserved and fulfillment projection reconciles.

---

## RF-P-12 — ServiceModel snapshot

Later JobOpening ServiceModel change does not rewrite historical Placement semantics.

---

# 13. V7.4 EXIT GATE

```text
[ ] ServiceModel catalog has one authority
[ ] ServiceModel behavior is centralized
[ ] Placement lifecycle is command-driven
[ ] multiple attempts per case work
[ ] failed attempt does not destroy case history
[ ] client-managed effective path creates no Worker
[ ] HRP-managed effective path requires actual start
[ ] no-show protection works
[ ] JobOpening fulfillment uses Placement EFFECTIVE
[ ] active workforce is reported separately
[ ] critical corrections are audited
[ ] concurrency/idempotency fixtures pass
[ ] RF-P-01 through RF-P-12 pass
```

---

# 14. HANDOFF TO V7.5

V7.5 owns detailed Workforce Operations:

```text
Worker 360
EmploymentEpisode lifecycle
Assignment lifecycle
transfer
termination
rehire
current workforce projections
```

V7.5 consumes Placement EFFECTIVE and must not redefine Placement semantics.

---

# 15. MAINTAINABILITY REQUIREMENTS

Mandatory under `AI_CODING_GUARDRAILS.md`:

```text
No Placement god-service file.
No 500+ line route handler.
No ServiceModel switch duplicated across features.
No hardcoded 4-value ServiceModel behavior in UI.
No JobOpening fulfillment SQL copied across screens.
No generic placement update endpoint.
```

Suggested module split:

```text
placement/
  domain/
    placement-state.ts
    placement-policy.ts
    service-model.ts
    failure-reasons.ts
  application/
    create-placement.ts
    confirm-placement.ts
    fail-placement.ts
    mark-client-managed-effective.ts
    start-hrp-managed-placement.ts
    void-placement.ts
  queries/
    placement-read-model.ts
    job-fulfillment-query.ts
  infrastructure/
    placement-repository.ts
```

Exact folder layout may follow repository conventions; responsibility separation is mandatory.

---

# 16. PRODUCT OUTCOME

After V7.4, HRP can truthfully answer:

```text
Which job did the person originally apply for?
Which jobs did HRP propose?
Which placement attempts failed?
Which placement actually became effective?
Was the person hired directly by the client?
Did HRP continue managing them as workforce?
How much demand has truly been fulfilled?
How many HRP-managed workers are still active today?
```

without conflating Application, Placement and Assignment.
