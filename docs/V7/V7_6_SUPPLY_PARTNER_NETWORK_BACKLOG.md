# HRP V7.6 — SUPPLY PARTNER NETWORK IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V7.6  
**Prerequisite:** V7.5 Exit Gate PASS  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` is mandatory  
**Primary bounded context:** Supply Partner Network  
**Primary aggregates:** `SupplyPartner`, `ReferralAttribution`, `PartnerSubmissionBatch`

---

# 0. PURPOSE

V7.6 establishes a canonical supply-partner model for CTVs, vendors, affiliates, and other external workforce-sourcing relationships.

It must answer:

```text
Who is the partner?
How did this person arrive?
Which partner supplied the lead?
Was the person already known to HRP?
What source evidence exists?
Who currently handles the case?
Who may become a beneficiary later?
Which partner submitted which batch?
What can a partner see and do?
How are attribution disputes resolved without rewriting history?
```

The core constitution is:

```text
Partner != User
Source != Handler
Handler != Beneficiary
Attribution != Acquisition channel
Attribution != current PlacementCase responsibility
```

---

# 1. NON-NEGOTIABLE DOMAIN INVARIANTS

1. `SupplyPartner` represents the business/supply identity, not the authentication account.
2. A Partner may have zero, one, or many linked users/members.
3. `ReferralAttribution` belongs to the canonical `LaborProfile`.
4. Referral attribution is durable provenance and must not be overwritten by later handling or reactivation.
5. A new intake from Partner B must not silently replace canonical attribution to Partner A.
6. PlacementCase acquisition/reactivation source is separate from canonical person attribution.
7. `HandlingAssignment` remains owned by Talent Operations.
8. `CommissionBeneficiaryDecision` remains owned by V7.7.
9. V7.6 does not calculate commission amount/rate/formula.
10. Partner uploads/submissions go through canonical create-or-match.
11. Partner intake must never create duplicate canonical people by design.
12. Vendor/CTV portal operates on projections and allowed commands, not a separate candidate database.
13. Partner users cannot directly create Worker, EmploymentEpisode, Assignment, Placement EFFECTIVE, or beneficiary decisions.
14. Attribution changes use supersede/invalidate/correction workflow with reason/evidence.
15. Attribution disputes use a dedicated Case/workflow, not a generic Ticket.
16. Partner visibility must respect strict PII boundaries.
17. Bulk imports must preserve provenance and be idempotent/reconcilable.

---

# 2. V7.6 SCOPE

V7.6 includes:

```text
SupplyPartner
PartnerMember / linked users
CTV / Vendor classification
Partner submission intake
Submission batches
ReferralAttribution operational model
Attribution channel / acquisition metadata
Existing-profile submission behavior
Partner portal read projections
Partner submission status views
Attribution dispute workflow
Partner-level operational metrics
Security/RLS/audit
```

V7.6 does NOT include:

```text
commission amount/rate/formula      -> OUT OF SCOPE
beneficiary decision                -> V7.7
generic sales CRM                   -> V7.8
omnichannel integration             -> V7.9
AI sourcing optimization            -> V7.10
```

---

# 3. DELIVERY SLICES

```text
V7.6a — SupplyPartner foundation
V7.6b — Partner Intake + Batch
V7.6c — ReferralAttribution hardening
V7.6d — Partner Portal
V7.6e — Attribution Dispute
V7.6f — Metrics + Security + Hardening
```

---

# 4. V7.6a — SUPPLYPARTNER FOUNDATION

## V76-001 — SupplyPartner schema

**Type:** Schema/domain  
**Priority:** BLOCKER

Conceptual:

```text
id
partnerType
code
displayName
legalName?
status

organizationId?
primaryContact?
metadata?

createdAt
updatedAt
```

Suggested initial partner types:

```text
COLLABORATOR
VENDOR
AFFILIATE
OTHER
```

Do not create separate canonical person tables for CTV and Vendor unless business semantics truly diverge later.

---

## V76-002 — Partner status catalog

**Type:** Domain catalog  
**Priority:** HIGH

Suggested:

```text
ACTIVE
SUSPENDED
INACTIVE
ARCHIVED
```

Status must not be hardcoded into portal UI conditionals.

---

## V76-003 — PartnerMember / PartnerUser linkage

**Type:** Schema/domain  
**Priority:** BLOCKER

Conceptual:

```text
id
partnerId
userId
memberRole
status
startsAt
endsAt?
```

A Vendor may have multiple users.

A CTV may have one linked user.

Authentication identity remains separate from partner business identity.

---

## V76-004 — Partner access scope resolver

**Type:** Security/application service  
**Priority:** BLOCKER

Resolve:

```text
current partner
member role
allowed commands
visible submission batches
visible profiles/cases/projections
```

Do not derive partner identity from arbitrary request parameters.

---

# 5. V7.6b — PARTNER INTAKE + BATCH

## V76-010 — PartnerSubmissionBatch schema

**Type:** Schema  
**Priority:** BLOCKER

Conceptual:

```text
id
partnerId
submittedByUserId?
submissionSource

originalFileRef?
idempotencyKey?

recordCount
status

submittedAt
processedAt?

createdAt
```

Suggested status:

```text
RECEIVED
PROCESSING
PROCESSED
PARTIAL
FAILED
CANCELLED
```

---

## V76-011 — Partner intake record

**Type:** Schema/domain  
**Priority:** BLOCKER

Each submitted person/input should generate a canonical intake record, conceptually:

```text
LaborProfileIntake
partnerId?
partnerSubmissionBatchId?
channel
submittedIdentity
submittedAt
sourceRef
processingResult
matchedLaborProfileId?
```

Use existing canonical Intake where possible; do not create a parallel partner-only intake system.

---

## V76-012 — Submit single profile command

**Type:** Domain/application command  
**Priority:** BLOCKER

Flow:

```text
partner submits person
→ validate permitted fields
→ normalize input
→ create Intake
→ run create-or-match
→ EXACT_MATCH / POSSIBLE_MATCH / NEW_PROFILE
→ return safe result
```

Must not:

```text
auto-overwrite ReferralAttribution
auto-create Worker
auto-create Placement
auto-open PlacementCase unless explicit qualified workflow exists
```

---

## V76-013 — Submit batch command

**Type:** Application command  
**Priority:** BLOCKER

Requirements:

```text
idempotent
bounded processing
row-level result
batch summary
safe retry
no duplicate canonical profiles
```

Large file processing may be chunked operationally, but the user-visible business result must reconcile to one batch.

---

## V76-014 — Batch result model

**Type:** Read projection  
**Priority:** HIGH

Per row:

```text
NEW_PROFILE
EXACT_MATCH
POSSIBLE_MATCH
INVALID
REJECTED
ERROR
```

Batch summary:

```text
total
new
matched
possibleDuplicates
invalid
failed
```

---

## V76-015 — Partner intake field policy

**Type:** Security/domain policy  
**Priority:** BLOCKER

Define exactly which fields Partner may submit.

Do not accept arbitrary internal fields such as:

```text
currentHandler
beneficiary
workerStatus
verification override
internal notes
```

---

# 6. V7.6c — REFERRAL ATTRIBUTION HARDENING

## V76-020 — ReferralAttribution schema finalization

**Type:** Domain/schema  
**Priority:** BLOCKER

Conceptual:

```text
id
laborProfileId

partnerId?
referrerUserId?

attributionChannel
campaignCode?
referralCode?

attributedAt
validFrom?
validUntil?

status
evidenceRef?

createdBy
createdAt

supersedesAttributionId?
invalidationReason?
```

Suggested status:

```text
ACTIVE
SUPERSEDED
INVALIDATED
DISPUTED
```

---

## V76-021 — Attribution channel catalog

**Type:** Domain catalog  
**Priority:** HIGH

Examples:

```text
AFF_LINK
CTV_DIRECT
VENDOR_UPLOAD
PHONE_REFERRAL
MANUAL_VERIFIED
IMPORT
OTHER
```

Partner identity and channel must remain separate.

Example:

```text
partner = CTV A
channel = PHONE_REFERRAL
```

is valid.

---

## V76-022 — Existing-profile referral rule

**Type:** Core business rule  
**Priority:** BLOCKER

If Partner B submits a person already attributed to Partner A:

```text
do not overwrite canonical attribution
record Intake from B
record acquisition/reactivation context where appropriate
surface attribution conflict/review if policy requires
```

This is a permanent regression scenario.

---

## V76-023 — Attribution creation command

**Type:** Critical domain command  
**Priority:** BLOCKER

```text
createReferralAttribution()
```

Requires:

```text
laborProfileId
partner/referrer
channel
attributedAt
evidence
actor/source
```

Must validate existing active attribution according to policy.

---

## V76-024 — Supersede attribution command

**Type:** Critical domain command  
**Priority:** BLOCKER

```text
supersedeReferralAttribution()
```

Requires:

```text
old attribution
new attribution
reason
evidence
actor
effectiveAt
```

Do not update old partnerId in place.

---

## V76-025 — Invalidate attribution command

**Type:** Critical domain command  
**Priority:** HIGH

For invalid/fraudulent/mistaken provenance.

Preserve historical record.

---

# 7. ACQUISITION / REACTIVATION SOURCE

## V76-030 — Case acquisition source integration

**Type:** Cross-context contract  
**Priority:** HIGH

PlacementCase may record:

```text
how this job-search episode was activated
```

separately from canonical ReferralAttribution.

Example:

```text
ReferralAttribution = Partner A / AFF_LINK
Later return via Zalo
PlacementCase acquisition = ZALO
```

No source rewrite.

---

# 8. V7.6d — PARTNER PORTAL

## V76-040 — Partner dashboard projection

**Type:** Read projection  
**Priority:** BLOCKER

Partner may see only permitted business-safe fields.

Suggested cards:

```text
submitted profiles
processing results
possible duplicate reviews awaiting HRP
active sourcing cases summary where permitted
placement outcome summaries where permitted
```

Do not expose internal HRP notes, other partner data, internal handling history, or sensitive PII by default.

---

## V76-041 — Partner profile projection

**Type:** External DTO  
**Priority:** BLOCKER

Create explicit partner-safe DTO.

Do not reuse internal `LaborProfile 360` DTO.

Possible fields:

```text
partnerSubmissionRef
safe profile identifier
name/basic contact according to policy
submission status
high-level recruitment status
high-level placement result
```

Sensitive identity numbers/documents are excluded unless explicitly permitted.

---

## V76-042 — Partner batch UI

**Type:** UI  
**Priority:** HIGH

Allow:

```text
submit batch
see processing status
see row results
download safe reconciliation output
retry corrected invalid rows
```

No raw DB identifiers required in partner-facing exports unless safe.

---

## V76-043 — Partner correction/resubmission flow

**Type:** Command/UI  
**Priority:** HIGH

Partner may correct submission input but cannot directly edit canonical HRP person identity after matching.

Flow:

```text
correct intake data
→ HRP create-or-match/review
→ canonical profile updated only via approved HRP command
```

---

# 9. V7.6e — ATTRIBUTION DISPUTE

## V76-050 — AttributionDisputeCase schema

**Type:** Schema/domain  
**Priority:** BLOCKER

Conceptual:

```text
id
laborProfileId
disputedAttributionId

claimantPartnerId?
claimantUserId?

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

## V76-051 — Dispute open command

**Type:** Domain command  
**Priority:** HIGH

```text
openAttributionDispute()
```

Does not immediately change attribution.

---

## V76-052 — Resolve dispute command

**Type:** Highly restricted command  
**Priority:** BLOCKER

Possible outcomes:

```text
KEEP_CURRENT
SUPERSEDE_WITH_NEW
INVALIDATE_CURRENT
INSUFFICIENT_EVIDENCE
```

If attribution changes:

```text
create/supersede/invalidate records
```

Never silently mutate historical source.

---

## V76-053 — Dispute audit/evidence policy

**Type:** Security/audit  
**Priority:** HIGH

Attribution disputes may affect downstream beneficiary decisions.

Require:

```text
reason
evidence
actor
resolution timestamp
correlationId
```

---

# 10. V7.6f — METRICS + SECURITY + HARDENING

## V76-060 — Partner operational metrics

**Type:** Analytics projection  
**Priority:** HIGH

Allowed internal HRP metrics may include:

```text
submissions
new profiles
exact matches
duplicate rate
active cases sourced
effective Placements sourced
```

Do not calculate money.

Partner-facing metrics may be narrower.

---

## V76-061 — Permission catalog

Suggested internal permissions:

```text
partner.read
partner.create
partner.update
partner.member.manage

partner.intake.read
partner.intake.submit
partner.batch.read

attribution.read
attribution.create
attribution.supersede
attribution.invalidate

attribution.dispute.read
attribution.dispute.open
attribution.dispute.resolve
```

External partner roles get narrow subsets.

---

## V76-062 — Partner RLS/isolation

A Partner user must not access:

```text
another Partner's batches
another Partner's submissions
internal HRP notes
other Partner attribution details
unauthorized LaborProfiles
beneficiary decisions
```

---

## V76-063 — PII minimization

Partner portal DTOs and exports must follow least-privilege PII design.

No accidental reuse of internal admin serializers.

---

# 11. CONCURRENCY / IDEMPOTENCY

Permanent protections:

```text
duplicate batch upload
duplicate single submission
same person submitted multiple times rapidly
concurrent attribution creation
concurrent dispute resolution
```

Expected:

```text
no duplicate canonical person
no duplicate active attribution created accidentally
one dispute resolution authority
reconcilable batch outcomes
```

---

# 12. PERMANENT REGRESSION FIXTURES

## RF-PT-01 — New CTV referral

Expected:

```text
new Intake
NEW_PROFILE
ReferralAttribution to CTV
no Worker/Placement created
```

---

## RF-PT-02 — Existing profile from same CTV

Expected:

```text
EXACT_MATCH
new Intake
canonical profile reused
no duplicate attribution
```

---

## RF-PT-03 — Existing profile from different CTV

Expected:

```text
profile reused
original attribution unchanged
new Intake records new submitter
conflict/review available if needed
```

---

## RF-PT-04 — Vendor batch with duplicates

Expected:

```text
rows classified independently
no duplicate LaborProfiles
batch summary reconciles
```

---

## RF-PT-05 — Same batch retried

Expected:

```text
idempotent business result
no duplicate batch side effects
```

---

## RF-PT-06 — Partner cannot create Worker

Expected: permission/command unavailable.

---

## RF-PT-07 — Partner cannot mark Placement EFFECTIVE

Expected: blocked.

---

## RF-PT-08 — Handler changes

Expected:

```text
ReferralAttribution unchanged
```

---

## RF-PT-09 — Attribution dispute keep current

Expected:

```text
history unchanged
dispute resolved
```

---

## RF-PT-10 — Attribution dispute supersede

Expected:

```text
old attribution SUPERSEDED
new attribution ACTIVE
reason/evidence retained
```

---

## RF-PT-11 — Reactivation through another channel

Expected:

```text
canonical attribution remains
PlacementCase acquisition source differs
```

---

## RF-PT-12 — Partner portal isolation

Partner A cannot infer Partner B data through row access, search, or counts.

---

# 13. MAINTAINABILITY / MODULE BOUNDARY REQUIREMENTS

Mandatory under `AI_CODING_GUARDRAILS.md`.

Do NOT create:

```text
partner-service.ts containing partner + intake + attribution + disputes
partner-utils.ts with business policies
one giant portal route handling uploads/search/disputes
```

Suggested separation:

```text
partner/
  domain/
    partner-types.ts
    partner-policy.ts

  application/
    create-partner.ts
    manage-partner-member.ts

  queries/
    partner-dashboard-query.ts

partner-intake/
  application/
    submit-partner-profile.ts
    submit-partner-batch.ts
  queries/
    partner-batch-query.ts

attribution/
  domain/
    attribution-channel.ts
    attribution-policy.ts
  application/
    create-attribution.ts
    supersede-attribution.ts
    invalidate-attribution.ts

attribution-dispute/
  application/
    open-dispute.ts
    resolve-dispute.ts
```

Exact folder conventions may differ; responsibilities must remain bounded.

Centralize:

```text
existing-profile attribution rule
attribution eligibility
partner visibility
batch idempotency policy
```

---

# 14. V7.6 EXIT GATE

## Partner

```text
[ ] Partner business identity separate from User
[ ] Vendor supports multiple members
[ ] partner lifecycle/status centralized
```

## Intake

```text
[ ] single submission uses canonical create-or-match
[ ] batch submission is idempotent/reconcilable
[ ] no parallel partner candidate DB
```

## Attribution

```text
[ ] ReferralAttribution belongs to LaborProfile
[ ] existing-profile referral does not overwrite source
[ ] Partner and channel are separate
[ ] source remains independent from handling
```

## Portal

```text
[ ] partner-safe DTO exists
[ ] PII is minimized
[ ] other partner/internal data cannot leak
[ ] forbidden workforce/placement commands unavailable
```

## Dispute

```text
[ ] dedicated dispute workflow exists
[ ] attribution history is superseded/inactivated, never silently overwritten
[ ] resolution is audited
```

## Regression

```text
[ ] RF-PT-01 through RF-PT-12 pass
```

---

# 15. HANDOFF TO V7.7

V7.7 owns:

```text
CommissionBeneficiaryDecision
source/handler/vendor beneficiary roles
beneficiary snapshot at EFFECTIVE
beneficiary disputes
outbox contract to external Python commission application
```

V7.7 must consume Partner, ReferralAttribution, Handling, Placement, and Workforce facts without calculating commission amount.

---

# 16. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V76-001 through V76-004

Batch B
V76-010 through V76-015

Batch C
V76-020 through V76-030

Batch D
V76-040 through V76-043

Batch E
V76-050 through V76-053

Batch F
V76-060 through V76-063
Concurrency/idempotency

Batch G
RF-PT-01 through RF-PT-12
V7.6 EXIT GATE
```

---

# 17. ARCHITECTURAL WARNINGS FOR IMPLEMENTATION AGENTS

Do NOT introduce shortcuts such as:

```text
LaborProfile.partnerId = latest submitter
LaborProfile.ownerPartnerId
HandlingAssignment.partnerId as source authority
User.isCTV as the only partner model
VendorCandidate table as a second candidate database
```

Do NOT:

```text
overwrite ReferralAttribution on every new submission
derive beneficiary directly from current handler
expose internal notes to partner portal
let partner upload bypass create-or-match
hardcode partner type behavior in React components
```

---

# 18. PRODUCT OUTCOME

After V7.6, HRP should be able to operate a supply network cleanly:

```text
CTV A introduces a person.
HRP stores canonical attribution to A.

The person returns months later through Zalo.
The original source remains historically true.

Vendor B uploads the same person in a batch.
HRP matches the existing profile instead of creating a duplicate.

A dispute can be opened and resolved with evidence.
Any correction supersedes historical attribution rather than rewriting it.

Partner users can see only the safe subset relevant to their own submissions.
```

This creates the trustworthy partner/source foundation required before V7.7 determines commission beneficiaries.
