# HRP V7.7 — BENEFICIARY & EXTERNAL COMMISSION INTEGRATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V7.7  
**Prerequisite:** V7.6 Exit Gate PASS  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` is mandatory  
**Primary bounded context:** Incentive Eligibility / External Integration Boundary  
**Primary aggregate:** `CommissionBeneficiaryDecision`

---

# 0. PURPOSE

V7.7 establishes the canonical HRP decision boundary for commission eligibility without turning HRP into a payroll or commission-calculation engine.

HRP answers:

```text
Which Placement triggered beneficiary evaluation?
Which beneficiary role is recognized?
Who/what entity is the beneficiary?
Which source/handling/vendor evidence supports the decision?
At what milestone was the decision frozen?
Who decided or confirmed it?
Has the decision been superseded or disputed?
What canonical facts must be sent to the external Python commission app?
```

HRP does NOT answer:

```text
How much money?
Which rate?
Which formula?
Which tax?
Which retention clawback amount?
How is payout scheduled?
```

Those remain the responsibility of the external Python application.

---

# 1. NON-NEGOTIABLE DOMAIN INVARIANTS

1. `CommissionBeneficiaryDecision != ReferralAttribution`.
2. `CommissionBeneficiaryDecision != HandlingAssignment`.
3. Source, handler, vendor, and beneficiary roles are separate concepts.
4. A Placement may produce zero, one, or many beneficiary decisions.
5. Beneficiary decisions are based on canonical evidence available at the qualifying milestone.
6. Default qualifying milestone is `Placement EFFECTIVE`.
7. Beneficiary identity must be snapshotted; later handler/source changes must not silently rewrite historical decisions.
8. HRP stores beneficiary identity/role/basis/evidence only.
9. HRP does not store commission amount/rate/formula/tax as canonical calculation fields.
10. External Python app consumes HRP canonical facts through outbox/integration contracts.
11. External app downtime must not cause HRP to lose beneficiary decisions.
12. Corrections/disputes create superseding/voiding decisions; no silent in-place rewrite of historical entitlement.
13. Partner/User beneficiary identity remains typed and explicit.
14. Current handler is never queried later to reconstruct historical beneficiary.
15. Placement failure before EFFECTIVE must not trigger normal beneficiary decisions unless future policy explicitly defines another milestone.
16. All beneficiary override/dispute commands are highly restricted and audited.
17. Cross-app integration happens after canonical HRP transaction commit via outbox.

---

# 2. V7.7 SCOPE

V7.7 includes:

```text
CommissionBeneficiaryDecision schema
beneficiary role catalog
typed beneficiary identity
eligibility evaluation boundary
Placement EFFECTIVE snapshot
source evidence
handling evidence
vendor/partner evidence
decision lifecycle
decision correction/supersede/void
beneficiary dispute workflow
outbox event contract
external Python app delivery/retry
reconciliation
security/RLS/audit
```

V7.7 does NOT include:

```text
commission rate                  -> OUT OF SCOPE
commission amount                -> OUT OF SCOPE
commission formula               -> OUT OF SCOPE
tax calculation                  -> OUT OF SCOPE
payroll                          -> OUT OF SCOPE
payment scheduling               -> OUT OF SCOPE
internal HRM                     -> OUT OF SCOPE
```

---

# 3. DELIVERY SLICES

```text
V7.7a — Beneficiary decision foundation
V7.7b — Eligibility evaluation + EFFECTIVE snapshot
V7.7c — Correction / supersede / dispute
V7.7d — Outbox contract to Python app
V7.7e — Reconciliation + observability + security
```

---

# 4. V7.7a — BENEFICIARY DECISION FOUNDATION

## V77-001 — CommissionBeneficiaryDecision schema

**Type:** Schema/domain  
**Priority:** BLOCKER

Conceptual:

```text
id

placementId
placementCaseId

beneficiaryType
beneficiaryUserId?
beneficiaryPartnerId?

beneficiaryRole

basis
status

referralAttributionId?
handlingAssignmentId?
partnerIdEvidence?

qualifyingMilestone
qualifiedAt

decidedAt
decidedByActorType
decidedByActorId?

reason?
evidenceRefs?

supersedesDecisionId?

createdAt
updatedAt
version
```

Important:

```text
beneficiaryUserId XOR beneficiaryPartnerId
```

according to `beneficiaryType`.

---

## V77-002 — Beneficiary type catalog

**Type:** Domain catalog  
**Priority:** BLOCKER

Initial:

```text
USER
PARTNER
```

Do not encode polymorphism through unvalidated arbitrary IDs.

---

## V77-003 — Beneficiary role catalog

**Type:** Domain catalog  
**Priority:** BLOCKER

Initial candidate roles:

```text
SOURCE
HANDLER
VENDOR
COLLABORATOR
OTHER
```

The exact role catalog may expand, but it must have one authority.

A Partner can be beneficiary under different roles; partner type does not automatically equal beneficiary role.

---

## V77-004 — Decision status catalog

**Type:** Domain catalog  
**Priority:** HIGH

Suggested:

```text
ACTIVE
SUPERSEDED
VOIDED
DISPUTED
```

A `DISPUTED` status should not automatically erase the prior canonical decision; downstream policy must know whether the decision remains active pending resolution.

---

# 5. V7.7b — ELIGIBILITY EVALUATION + EFFECTIVE SNAPSHOT

## V77-010 — Qualifying milestone policy

**Type:** Domain policy  
**Priority:** BLOCKER

Default:

```text
PLACEMENT_EFFECTIVE
```

The qualifying milestone is centralized and must not be hardcoded in route/UI code.

Future policies may define:

```text
ASSIGNMENT_COMPLETED_X_DAYS
CLIENT_PAYMENT_CONFIRMED
OTHER
```

but V7.7 initial implementation must not invent them.

---

## V77-011 — Beneficiary evaluation service

**Type:** Domain/application service  
**Priority:** BLOCKER

Conceptual:

```text
evaluateBeneficiariesForPlacement(placementId)
```

Consumes canonical evidence only:

```text
Placement
PlacementCase
ReferralAttribution
HandlingAssignment history
SupplyPartner
ServiceModel
```

Produces candidate decisions/eligibility facts.

It must NOT calculate money.

---

## V77-012 — SOURCE beneficiary resolution

**Type:** Domain policy  
**Priority:** BLOCKER

Resolve from canonical `ReferralAttribution` valid for the person/placement context.

Must not use:

```text
latest Intake submitter
current handler
latest partner interaction
```

as silent substitutes.

---

## V77-013 — HANDLER beneficiary resolution

**Type:** Domain policy  
**Priority:** BLOCKER

Handler eligibility is based on the relevant HandlingAssignment evidence at the qualifying milestone/policy window.

Do not query the current handler days/weeks later.

Store:

```text
handlingAssignmentId
beneficiaryUserId
qualifiedAt
basis
```

---

## V77-014 — Partner/Vendor beneficiary resolution

**Type:** Domain policy  
**Priority:** HIGH

Where business policy recognizes a Partner/Vendor role, resolve through canonical Partner/Attribution evidence.

Do not derive beneficiary from uploader account alone.

---

## V77-015 — createBeneficiaryDecisionsForEffectivePlacement command

**Type:** Critical orchestration command  
**Dependency:** Placement EFFECTIVE  
**Priority:** BLOCKER

Normally invoked as part of Placement EFFECTIVE orchestration or immediately after canonical Placement transaction through a reliable internal boundary.

Expected:

```text
load canonical evidence
evaluate applicable roles
create 0..N CommissionBeneficiaryDecision
write audit
enqueue outbox event(s)
```

Must be idempotent.

---

## V77-016 — Beneficiary snapshot integrity

**Type:** Invariant  
**Priority:** BLOCKER

Once created:

```text
beneficiary identity
role
basis
qualifying evidence references
qualifiedAt
```

must remain historical truth unless corrected through explicit supersede/void workflow.

Later changes to:

```text
ReferralAttribution
HandlingAssignment
Partner membership
```

must not silently rewrite old decisions.

---

# 6. V7.7c — CORRECTION / SUPERSEDE / DISPUTE

## V77-020 — supersedeBeneficiaryDecision command

**Type:** Highly restricted command  
**Priority:** BLOCKER

Inputs:

```text
decisionId
replacementBeneficiary
replacementRole
reason
evidence
effectiveAt
actor
```

Effects:

```text
old decision -> SUPERSEDED
new decision -> ACTIVE
link supersedesDecisionId
audit/correlation
outbox correction event
```

No in-place beneficiary ID change.

---

## V77-021 — voidBeneficiaryDecision command

**Type:** Highly restricted command  
**Priority:** HIGH

Used when original decision should not have existed.

Requires:

```text
reason
evidence
actor
effectiveAt
```

History remains visible.

---

## V77-022 — BeneficiaryDisputeCase schema

**Type:** Schema/domain  
**Priority:** BLOCKER

Conceptual:

```text
id
placementId
decisionId?

claimantType
claimantUserId?
claimantPartnerId?

status
reason
evidenceRefs

openedAt
resolvedAt?
resolvedBy?

resolution
createdAt
```

Suggested status:

```text
OPEN
UNDER_REVIEW
RESOLVED
REJECTED
CANCELLED
```

---

## V77-023 — openBeneficiaryDispute command

**Type:** Domain command  
**Priority:** HIGH

Opening a dispute does not directly modify amount or beneficiary identity.

It records the contest and evidence.

---

## V77-024 — resolveBeneficiaryDispute command

**Type:** Highly restricted command  
**Priority:** BLOCKER

Possible outcomes:

```text
KEEP_DECISION
SUPERSEDE_DECISION
VOID_DECISION
INSUFFICIENT_EVIDENCE
```

Any decision mutation must use the explicit supersede/void commands or atomic orchestration with equivalent history guarantees.

---

# 7. V7.7d — OUTBOX CONTRACT TO PYTHON APP

## V77-030 — Canonical event contract

**Type:** Integration contract  
**Priority:** BLOCKER

Recommended event:

```text
CommissionBeneficiaryDecisionRecorded
```

Payload should contain stable identifiers and canonical facts only.

Conceptual payload:

```json
{
  "eventId": "...",
  "eventType": "CommissionBeneficiaryDecisionRecorded",
  "occurredAt": "...",
  "placementId": "...",
  "placementCaseId": "...",
  "jobOpeningId": "...",
  "clientCompanyId": "...",
  "projectId": "...",
  "serviceModel": "...",
  "placementEffectiveAt": "...",
  "decisionId": "...",
  "beneficiaryType": "USER|PARTNER",
  "beneficiaryUserId": "...",
  "beneficiaryPartnerId": "...",
  "beneficiaryRole": "SOURCE|HANDLER|...",
  "basis": "...",
  "referralAttributionId": "...",
  "handlingAssignmentId": "..."
}
```

Do NOT include:

```text
rate
amount
formula
tax
payment amount
```

---

## V77-031 — Correction event contract

**Type:** Integration contract  
**Priority:** BLOCKER

Events:

```text
CommissionBeneficiaryDecisionSuperseded
CommissionBeneficiaryDecisionVoided
```

Must link:

```text
oldDecisionId
newDecisionId?
reasonCode
effectiveAt
```

External app decides financial consequences.

---

## V77-032 — Workforce follow-up facts

**Type:** Integration boundary  
**Priority:** HIGH

If external commission policy depends on later workforce retention/end events, HRP may emit canonical lifecycle facts such as:

```text
AssignmentStarted
AssignmentEnded
EmploymentEpisodeEnded
```

HRP does not interpret those facts into monetary clawbacks.

---

## V77-033 — Transactional outbox

**Type:** Infrastructure  
**Priority:** BLOCKER

Decision creation/correction and outbox record must be part of the same HRP database transaction where feasible.

External network call occurs after commit.

No direct synchronous Python API call inside the Placement EFFECTIVE DB transaction.

---

## V77-034 — Delivery worker/retry

**Type:** Integration infrastructure  
**Priority:** BLOCKER

Requirements:

```text
idempotent delivery
retry
backoff
dead-letter/review state
delivery attempt audit
```

External app must receive stable event IDs.

---

## V77-035 — Consumer idempotency contract

**Type:** Integration contract  
**Priority:** HIGH

Python app is expected to deduplicate by:

```text
eventId
```

and/or stable decision/version identifiers.

HRP should be able to resend safely.

---

# 8. V7.7e — RECONCILIATION + OBSERVABILITY + SECURITY

## V77-040 — Beneficiary reconciliation query

**Type:** Query/service  
**Priority:** BLOCKER

Identify:

```text
EFFECTIVE Placements with expected decision evaluation not completed
decisions without outbox delivery
superseded decisions missing correction event
delivery failures
duplicate active decisions for same role where policy forbids
```

---

## V77-041 — External delivery reconciliation

**Type:** Operational tool/query  
**Priority:** HIGH

Support:

```text
pending
sent
acknowledged if protocol supports
failed
dead-letter
replay requested
```

Never require manual DB editing to retry.

---

## V77-042 — Beneficiary read model

**Type:** Query/DTO  
**Priority:** HIGH

Internal HRP view:

```text
Placement
beneficiary roles
beneficiary identities
basis
evidence references
decision status
decision history
integration delivery state
```

Do not show amount calculated by external Python app unless a future explicit read integration is designed.

---

## V77-043 — Permission catalog

Suggested:

```text
beneficiary.read
beneficiary.evaluate
beneficiary.decide
beneficiary.override
beneficiary.void

beneficiary.dispute.read
beneficiary.dispute.open
beneficiary.dispute.resolve

commission_integration.read
commission_integration.retry
```

Override/resolve permissions should be tightly restricted.

---

## V77-044 — RLS / partner visibility

Partners may be allowed to see a limited "recognized/not recognized" outcome in the future, but V7.7 internal implementation must not expose:

```text
other beneficiaries
internal handler details
other partners
internal evidence
dispute investigator notes
```

without explicit projection policy.

---

# 9. BENEFICIARY POLICY CONFIGURATION

## V77-050 — Central policy module

**Type:** Domain policy  
**Priority:** BLOCKER

No scattered rules such as:

```ts
if (serviceModel === "STAFFING_SUPPLY" && handlerDays >= 7)
```

inside controllers/UI.

Preferred conceptual interface:

```text
beneficiaryPolicy.evaluate({
  placement,
  referralAttribution,
  handlingHistory,
  partnerContext
})
```

The result is eligibility/beneficiary identity, not money.

---

## V77-051 — Policy version metadata

**Type:** Hardening  
**Priority:** HIGH

Because beneficiary rules may evolve, each decision should be able to record:

```text
policyVersion
```

or equivalent basis/version metadata.

This prevents future rule changes from making old decisions inexplicable.

Do not implement a generic rules engine unless needed.

---

# 10. CONCURRENCY / IDEMPOTENCY

Permanent protections:

```text
duplicate PlacementEffective event
concurrent beneficiary evaluation
duplicate outbox worker delivery
concurrent dispute resolution
duplicate supersede request
```

Expected:

```text
no duplicate active beneficiary role decisions
no duplicate correction chain
safe replay to external Python app
```

---

# 11. PERMANENT REGRESSION FIXTURES

## RF-B-01 — SOURCE beneficiary from CTV

Expected:

```text
Placement EFFECTIVE
ReferralAttribution CTV A
SOURCE decision -> Partner A
```

No amount in HRP.

---

## RF-B-02 — HANDLER beneficiary

Expected:

```text
qualifying HandlingAssignment identified
decision snapshots handler user
later transfer does not change decision
```

---

## RF-B-03 — SOURCE + HANDLER both eligible

Expected:

```text
Placement has 2 decisions
SOURCE
HANDLER
```

No collision.

---

## RF-B-04 — Existing-profile referral reclaim

Expected:

```text
canonical source remains CTV A
new intake from CTV B does not create SOURCE beneficiary B
```

unless explicit attribution correction occurred.

---

## RF-B-05 — Handling expired before EFFECTIVE

Expected beneficiary follows configured handler policy; no assumption that expired/current handler automatically wins.

---

## RF-B-06 — Direct hire

CLIENT_MANAGED Placement can generate beneficiary decisions without Worker.

---

## RF-B-07 — No-show

Placement FAILED before EFFECTIVE -> no normal beneficiary decision.

---

## RF-B-08 — Later handler change

Historical decision unchanged.

---

## RF-B-09 — Attribution dispute resolved after decision

Expected:

```text
old decision superseded/voided as required
correction event emitted
external app receives canonical correction
```

HRP does not calculate clawback.

---

## RF-B-10 — External Python app offline

Expected:

```text
decision committed
outbox pending/retrying
no loss of canonical HRP decision
```

---

## RF-B-11 — Duplicate delivery

External event can be replayed with same eventId without creating duplicate financial event downstream per contract.

---

## RF-B-12 — Policy version change

Old decisions retain old policyVersion/basis; new decisions use new policy version.

---

# 12. MAINTAINABILITY / MODULE BOUNDARY REQUIREMENTS

Mandatory under `AI_CODING_GUARDRAILS.md`.

Do NOT create:

```text
commission-service.ts
```

that mixes:

```text
beneficiary resolution
money calculation
outbox delivery
dispute handling
HTTP client logic
```

Suggested separation:

```text
beneficiary/
  domain/
    beneficiary-types.ts
    beneficiary-roles.ts
    beneficiary-policy.ts
    decision-status.ts

  application/
    evaluate-beneficiaries.ts
    create-beneficiary-decisions.ts
    supersede-beneficiary-decision.ts
    void-beneficiary-decision.ts

  queries/
    beneficiary-read-model.ts
    beneficiary-reconciliation-query.ts

beneficiary-dispute/
  application/
    open-beneficiary-dispute.ts
    resolve-beneficiary-dispute.ts

commission-integration/
  contracts/
    beneficiary-decision-events.ts
  application/
    enqueue-beneficiary-event.ts
  infrastructure/
    commission-outbox-worker.ts
    python-commission-adapter.ts
```

Exact folder conventions may differ.

Centralize:

```text
beneficiary role eligibility
qualifying milestone
policy version
event payload mapping
```

---

# 13. V7.7 EXIT GATE

## Decision model

```text
[ ] one Placement supports 0..N beneficiary decisions
[ ] typed USER/PARTNER beneficiary works
[ ] role catalog has one authority
[ ] no amount/rate/formula stored as HRP calculation authority
```

## Snapshot

```text
[ ] SOURCE uses canonical attribution
[ ] HANDLER uses historical handling evidence
[ ] later source/handler changes do not rewrite decisions
[ ] policy version/basis is traceable
```

## Correction/dispute

```text
[ ] supersede/void preserve history
[ ] disputes use dedicated workflow
[ ] highly restricted permissions enforced
```

## Integration

```text
[ ] outbox transaction is reliable
[ ] event payload contains IDs/facts, no money calculation
[ ] retry/replay is safe
[ ] external outage does not lose decisions
[ ] correction events supported
```

## Regression

```text
[ ] RF-B-01 through RF-B-12 pass
```

---

# 14. HANDOFF TO V7.8

V7.8 owns native Client CRM:

```text
ClientCompany lifecycle
ClientContact
SalesOpportunity
ClientInteraction
ClientNextAction
Project responsibility
direct-hire confirmation workflow support
```

V7.8 must not redefine Talent CRM or Placement semantics.

---

# 15. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V77-001 through V77-004

Batch B
V77-010 through V77-016

Batch C
V77-020 through V77-024

Batch D
V77-030 through V77-035

Batch E
V77-040 through V77-051
Security/concurrency

Batch F
RF-B-01 through RF-B-12
V7.7 EXIT GATE
```

---

# 16. ARCHITECTURAL WARNINGS FOR IMPLEMENTATION AGENTS

Do NOT introduce:

```text
Placement.commissionAmount
Placement.commissionRate
ReferralAttribution.commissionAmount
HandlingAssignment.commissionAmount
User.commissionPercentage
```

as HRP calculation authority.

Do NOT:

```text
calculate money in Placement EFFECTIVE command
derive historical handler from current assignment
rewrite beneficiary when handler changes
call Python commission service inside DB transaction
let external service become canonical beneficiary source
```

---

# 17. PRODUCT OUTCOME

After V7.7, HRP can reliably state:

```text
Placement này làm phát sinh quyền lợi cho ai?
Người/Partner đó được ghi nhận theo vai trò gì?
Quyết định dựa trên attribution/handling evidence nào?
Quyết định được chốt tại milestone nào?
Nếu có tranh chấp thì lịch sử thay đổi ra sao?
App Python đã nhận được canonical facts chưa?
```

while leaving all monetary calculation to the external Python application.
