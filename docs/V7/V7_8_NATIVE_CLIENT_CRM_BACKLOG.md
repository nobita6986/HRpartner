# HRP V7.8 — NATIVE CLIENT CRM IMPLEMENTATION BACKLOG

**Status:** SPLIT_REQUIRED — HRP canonical rows only; engagement UI transferred to CRM app (Owner 13/09/2026)
**Target release:** V7.8  
**Prerequisite:** HRP canonical B2B foundations may start after the V6+ gate; direct-hire path needs V7.4 Placement authority. V7.7 Beneficiary is not a blanket blocker for Client/Demand work.
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` is mandatory  
**Primary bounded context:** Client CRM / Client & Demand  
**Primary aggregates:** `ClientCompany`, `SalesOpportunity`

> **Scope correction, Owner 13/09/2026:** This is a historical mixed backlog. Only canonical B2B models, domain commands, read projections, demand/direct-hire handoff, security and audit remain HRP work. Client CRM Workbench, sales/CSKH engagement views, inbox, routine follow-up and campaigns move to the separate CRM app. Do not hand their UI tasks to an HRP coding agent. See [HRP_CRM_INFRA_SPLIT.md](HRP_CRM_INFRA_SPLIT.md); its ownership matrix supersedes the execution/exit-gate wording below.

---

# 0. PURPOSE

V7.8 adds a native B2B client-management layer for HRP's manpower business without turning HRP into a generic enterprise CRM.

The Client CRM must help HRP answer:

```text
Công ty khách hàng này là ai?
HRP đang làm việc với những contact nào?
Có cơ hội thương mại nào đang mở?
Cơ hội đang ở stage nào?
Việc tiếp theo với khách hàng là gì?
Opportunity thắng có liên quan Project/Order nào?
Ai đang phụ trách account/project?
Direct-hire Placement nào đang chờ khách xác nhận?
```

The core distinction remains:

```text
CrmLead != ClientCompany
SalesOpportunity != StaffingOrder
SalesOpportunity != Project
ClientCompany != Project
StaffingOrder != JobOpening
```

---

# 1. NON-NEGOTIABLE DOMAIN INVARIANTS

1. `ClientCompany` is the canonical organization/legal customer entity.
2. Native Client CRM must not create a second `CRMCompany` table as another source of truth.
3. `CrmLead` represents a commercial lead only, never worker/talent.
4. `SalesOpportunity` represents a commercial pipeline/deal context.
5. `SalesOpportunity != StaffingOrder`.
6. Winning an Opportunity does not automatically mean operational demand exists.
7. A won Opportunity may:
   - attach to an existing Project;
   - create a Project through an explicit command;
   - later result in one or many StaffingOrders.
8. `ClientContact` belongs to ClientCompany.
9. Client-side interactions are separate from Talent interactions.
10. Client next actions are separate from Talent NextAction.
11. `ServiceModel` on JobOpening remains operational authority; Opportunity may only hold expected/proposed commercial context.
12. Account/project responsibility should be represented through time-bounded responsibility records, not a generic permanent owner field where history matters.
13. Direct-hire confirmation from client must feed Placement commands; it must not let the client directly mutate Placement status.
14. Deep contract management, CPQ/pricing engine, e-sign, marketing automation, and generic sales forecasting are not V7.8 goals.
15. Client portal, if enabled later, is a constrained projection/command surface over canonical HRP data.
16. Client CRM must obey PII/security isolation between client contacts and talent data.

---

# 2. V7.8 SCOPE

V7.8 includes:

```text
ClientCompany lifecycle/completeness
ClientContact
CrmLead minimal commercial lead
SalesOpportunity
ClientInteraction
ClientNextAction
AccountResponsibility
ProjectResponsibility
Client CRM Workbench (CRM app; not HRP scope)
Commercial engagement/pipeline views (CRM app over HRP-authorized projections)
Opportunity -> Project/StaffingOrder handoff
Direct-hire confirmation workflow support
Security/RLS/audit
```

V7.8 does NOT include:

```text
deep contract lifecycle            -> DEFERRED
quote/CPQ engine                   -> DEFERRED
pricing calculation engine         -> DEFERRED
marketing automation               -> DEFERRED
generic Salesforce replacement     -> OUT OF SCOPE
client payroll/invoicing engine     -> OUT OF SCOPE
e-signature legal workflow         -> DEFERRED
external sales CRM integration      -> evaluate only if later gap is proven
```

---

# 3. DELIVERY SLICES

```text
V7.8a — ClientCompany + ClientContact foundation
V7.8b — SalesOpportunity
V7.8c — Client Interaction + NextAction
V7.8d — Responsibility model
V7.8e — Opportunity-to-Demand handoff
V7.8f — Direct-hire confirmation
V7.8g — Client CRM Workbench + hardening
```

---

# 4. V7.8a — CLIENTCOMPANY + CLIENTCONTACT FOUNDATION

## V78-001 — ClientCompany lifecycle contract

**Type:** Domain contract  
**Priority:** BLOCKER

Suggested commercial lifecycle:

```text
PROSPECT
ACTIVE_CLIENT
INACTIVE
ARCHIVED
```

Do not conflate company lifecycle with:

```text
Opportunity stage
Project status
StaffingOrder status
```

---

## V78-002 — ClientCompany completeness projection

**Type:** Projection  
**Priority:** HIGH

Separate:

```text
company completeness
company lifecycle
commercial activity
```

Suggested completeness:

```text
MINIMAL
BASIC
OPERATIONAL
COMPLETE
```

---

## V78-003 — ClientContact schema

**Type:** Schema/domain  
**Priority:** BLOCKER

Conceptual:

```text
id
clientCompanyId

fullName
title?
department?

phone?
email?
zalo?
preferredChannel?

status

createdAt
updatedAt
```

A ClientCompany may have many ClientContacts.

---

## V78-004 — Contact role foundation

**Type:** Domain catalog  
**Priority:** HIGH

Initial contextual roles may include:

```text
DECISION_MAKER
HR
OPERATIONS
PROCUREMENT
FINANCE
SITE_CONTACT
OTHER
```

Do not hardcode role-specific logic into UI.

If one person can have multiple contextual roles, use a relation/value collection rather than a single enum field.

---

## V78-005 — ClientCompany 360 read model

**Type:** Query/read DTO  
**Priority:** BLOCKER

Sections:

```text
company summary
contacts
open opportunities
active projects
recent staffing orders
recent client interactions
next actions
responsibility
direct-hire confirmations pending
```

Do not expose Talent PII unrelated to the client scope.

---

# 5. CRMLEAD MINIMAL FOUNDATION

## V78-010 — CrmLead contract

**Type:** Domain contract  
**Priority:** MEDIUM

`CrmLead` is a commercial lead only.

Possible sources:

```text
REFERRAL
OUTBOUND
INBOUND
EVENT
PARTNER
OTHER
```

Lead may convert to:

```text
existing ClientCompany
or
new ClientCompany
```

Never use CrmLead for LaborProfile/Talent.

---

## V78-011 — Lead conversion command

**Type:** Domain/application command  
**Priority:** MEDIUM

```text
convertCrmLead()
```

Must:

```text
match existing ClientCompany where appropriate
avoid duplicate companies
create/link contact if valid
preserve lead source
audit conversion
```

---

# 6. V7.8b — SALESOPPORTUNITY

## V78-020 — SalesOpportunity schema

**Type:** Schema/domain  
**Priority:** BLOCKER

Conceptual:

```text
id
clientCompanyId
primaryContactId?

name
stage
expectedServiceModel?
estimatedHeadcount?
expectedStartDate?

commercialOwnerResponsibilityId?

sourceLeadId?
notes?

wonAt?
lostAt?
lostReason?

createdAt
updatedAt
version
```

`expectedServiceModel` is commercial expectation only.

---

## V78-021 — Opportunity stage catalog

**Type:** Domain catalog  
**Priority:** BLOCKER

Suggested:

```text
QUALIFYING
PROPOSAL
NEGOTIATION
WON
LOST
CANCELLED
```

No hardcoded stage workflow scattered across components.

---

## V78-022 — Opportunity transition commands

**Type:** Domain commands  
**Priority:** BLOCKER

Commands:

```text
createSalesOpportunity()
advanceOpportunity()
markOpportunityWon()
markOpportunityLost()
cancelOpportunity()
```

Do not use generic PATCH for critical stage transitions.

---

## V78-023 — Opportunity expected ServiceModel rule

**Type:** Domain invariant  
**Priority:** HIGH

Opportunity may express:

```text
expectedServiceModel
```

for commercial planning.

Operational authority later remains:

```text
JobOpening.serviceModel
```

A discrepancy should surface for review rather than silently overwrite either side.

---

# 7. V7.8c — CLIENT INTERACTION + NEXTACTION

## V78-030 — ClientInteraction schema

**Type:** Schema/domain  
**Priority:** BLOCKER

Conceptual:

```text
id
clientCompanyId
clientContactId?
salesOpportunityId?

channel
direction
occurredAt

outcomeType
summary?

actorType
actorId?
source

createdAt
```

Do not reuse Talent `InteractionOutcome` table unless architecture explicitly supports a generic interaction abstraction without mixing domain semantics.

Shared infrastructure is acceptable; domain meaning remains separate.

---

## V78-031 — Client interaction outcome catalog

**Type:** Domain catalog  
**Priority:** HIGH

Suggested:

```text
CONNECTED
NO_ANSWER
MEETING_HELD
NEEDS_PROPOSAL
FOLLOW_UP_REQUIRED
COMMERCIAL_INTEREST
NOT_INTERESTED
WAITING_CLIENT
WAITING_INTERNAL
OTHER
```

---

## V78-032 — ClientNextAction schema

**Type:** Schema/domain  
**Priority:** BLOCKER

Conceptual:

```text
id
clientCompanyId
salesOpportunityId?
clientContactId?

type
dueAt
assignedUserId
status

createdFromInteractionId?
completedByInteractionId?

createdAt
completedAt?
cancelledAt?
```

Canonical status:

```text
OPEN
DONE
CANCELLED
```

`OVERDUE` is derived.

---

## V78-033 — Client interaction command

**Type:** Domain/application command  
**Priority:** BLOCKER

Conceptual:

```text
recordClientInteraction()
```

May atomically:

```text
record interaction
complete previous next action
create next action
advance allowed Opportunity stage
```

Do not require frontend to orchestrate several independent mutations for one meeting/call.

---

## V78-034 — ClientNextAction commands

**Type:** Domain commands  
**Priority:** HIGH

```text
createClientNextAction()
completeClientNextAction()
cancelClientNextAction()
rescheduleClientNextAction()
```

---

# 8. V7.8d — RESPONSIBILITY MODEL

## V78-040 — AccountResponsibility schema

**Type:** Schema/domain  
**Priority:** HIGH

Conceptual:

```text
id
clientCompanyId
userId
responsibilityType
startsAt
endsAt?
assignedBy?
reason?
```

Suggested types:

```text
ACCOUNT_OWNER
SALES_LEAD
COORDINATOR
OTHER
```

Current owner is a projection from active responsibility.

Do not rely solely on `ClientCompany.ownerId`.

---

## V78-041 — ProjectResponsibility schema

**Type:** Schema/domain  
**Priority:** BLOCKER

Conceptual:

```text
id
projectId
userId
responsibilityType
startsAt
endsAt?
```

Suggested:

```text
PROJECT_MANAGER
RECRUITMENT_LEAD
COORDINATOR
OPERATIONS_LEAD
OTHER
```

This is more important operationally than generic permanent company ownership.

---

## V78-042 — Responsibility commands

**Type:** Domain commands  
**Priority:** HIGH

```text
assignAccountResponsibility()
transferAccountResponsibility()
assignProjectResponsibility()
transferProjectResponsibility()
endResponsibility()
```

Preserve history; do not overwrite prior user IDs.

---

# 9. V7.8e — OPPORTUNITY TO DEMAND HANDOFF

## V78-050 — Opportunity won contract

**Type:** Domain policy  
**Priority:** BLOCKER

Winning an Opportunity means commercial agreement/progress has reached WON.

It does NOT automatically create:

```text
Project
StaffingOrder
JobOpening
```

unless the user explicitly performs a handoff command.

---

## V78-051 — createProjectFromOpportunity command

**Type:** Cross-context command  
**Priority:** HIGH

Optional when a new Project is required.

Must allow:

```text
use existing ClientCompany
create Project
link sourceOpportunityId
preserve commercial context
```

---

## V78-052 — createStaffingOrderFromOpportunity command

**Type:** Cross-context command  
**Priority:** BLOCKER

Used when actual workforce demand is confirmed.

Inputs may include:

```text
opportunityId
projectId
requestedByContactId?
order summary
requested date
```

Does not automatically create arbitrary JobOpening rows without explicit structured demand.

---

## V78-053 — Opportunity-to-demand traceability

**Type:** Read projection  
**Priority:** HIGH

Expose:

```text
Opportunity
→ Project(s)
→ StaffingOrder(s)
→ JobOpening(s)
```

where links exist.

Do not enforce fake 1:1 mappings.

---

# 10. V7.8f — DIRECT-HIRE CONFIRMATION

## V78-060 — Pending client confirmation query

**Type:** Query service  
**Dependency:** V7.4 Placement  
**Priority:** BLOCKER

For `CLIENT_MANAGED` Placement:

```text
RECRUITMENT_SERVICE
REFERRAL_SERVICE
```

show records waiting for client employment/start confirmation.

---

## V78-061 — Client confirmation request record

**Type:** Schema/workflow  
**Priority:** HIGH

Conceptual:

```text
id
placementId
clientCompanyId
clientContactId?

requestedAt
status

respondedAt?
response?
evidenceRef?

createdBy
```

Suggested status:

```text
PENDING
CONFIRMED
REJECTED
EXPIRED
CANCELLED
```

---

## V78-062 — recordClientHireConfirmation command

**Type:** Domain/application command  
**Priority:** BLOCKER

Internal user or future client portal may submit a confirmation fact.

This command must NOT directly set arbitrary Placement status.

It calls/feeds the canonical Placement confirmation/effective command according to V7.4 policy.

---

## V78-063 — Client portal safe confirmation contract

**Type:** External command contract  
**Priority:** HIGH

Future client portal may be allowed to:

```text
confirm started
reject/not started
provide date/evidence
```

but cannot:

```text
edit Placement fields
create Worker
change ServiceModel
change beneficiary
```

---

# 11. V7.8g — CLIENT CRM WORKBENCH

## V78-070 — Sales My Work query

**Type:** Query/read model  
**Priority:** HIGH

Sections:

```text
overdue client actions
due today
opportunities requiring follow-up
WON opportunities awaiting operational handoff
pending client confirmations
stale prospects/accounts
```

---

## V78-071 — Client CRM manager view

**Type:** Query/UI  
**Priority:** MEDIUM

Metrics:

```text
open opportunities
opportunity aging
WON without StaffingOrder
client actions overdue
active clients without recent interaction
pending direct-hire confirmations
```

Avoid pretending these are accounting/revenue forecasts unless explicit financial data is later integrated.

---

## V78-072 — ClientCompany Workbench UI

**Type:** UI  
**Priority:** BLOCKER

Primary actions:

```text
view contacts
record interaction
create next action
create/advance Opportunity
view Projects/Orders
handoff won opportunity
review pending direct-hire confirmation
```

Do not build one giant all-in-one component.

---

# 12. SECURITY REQUIREMENTS

Suggested permissions:

```text
client.company.read
client.company.edit

client.contact.read
client.contact.manage

client.lead.read
client.lead.manage
client.lead.convert

client.opportunity.read
client.opportunity.create
client.opportunity.transition

client.interaction.create
client.next_action.manage

client.responsibility.manage
project.responsibility.manage

client_hire_confirmation.read
client_hire_confirmation.record

client.workbench.team.read
```

External client users, if introduced, require separate identity/scope from HRP internal users.

---

# 13. RLS / DATA ISOLATION

Client CRM must not become a way to access unrestricted Talent data.

ClientCompany/Contact users should see only permitted candidate/placement projections.

No raw internal recruiter notes, partner disputes, other clients, or unrelated LaborProfile PII.

---

# 14. CONCURRENCY / IDEMPOTENCY

Permanent protections:

```text
duplicate Opportunity transition
duplicate lead conversion
concurrent responsibility transfer
duplicate staffing-order handoff
duplicate direct-hire confirmation
```

Commands must be safe to retry where business operations may be repeated.

---

# 15. PERMANENT REGRESSION FIXTURES

## RF-C-01 — Prospect converts to existing ClientCompany

Expected:

```text
no duplicate company
lead preserved
contact linked
```

---

## RF-C-02 — Prospect converts to new ClientCompany

Expected:

```text
one new canonical company
lead source preserved
```

---

## RF-C-03 — Opportunity WON without operational demand

Expected:

```text
Opportunity WON
no automatic StaffingOrder
```

---

## RF-C-04 — One Opportunity produces multiple StaffingOrders

Expected: allowed.

---

## RF-C-05 — Multiple Opportunities map to one Project

Expected: allowed.

---

## RF-C-06 — Expected ServiceModel differs from JobOpening

Expected:

```text
commercial expectation preserved
operational authority remains JobOpening.serviceModel
difference visible for review
```

---

## RF-C-07 — Account responsibility transfer

Expected:

```text
old responsibility ended
new responsibility active
history preserved
```

---

## RF-C-08 — Project responsibility differs from account owner

Expected: valid.

---

## RF-C-09 — Direct-hire confirmation

Expected:

```text
client confirmation fact recorded
canonical Placement command invoked
no Worker created
```

---

## RF-C-10 — Rejected direct-hire start

Expected:

```text
Placement not marked EFFECTIVE
history preserved
```

---

## RF-C-11 — Client interaction creates next action

Expected atomic business workflow.

---

## RF-C-12 — Client CRM cannot access unrelated Talent PII

Expected blocked by projection/RLS/permission.

---

# 16. MAINTAINABILITY / MODULE BOUNDARY REQUIREMENTS

Mandatory under `AI_CODING_GUARDRAILS.md`.

Do NOT create:

```text
crm-service.ts
client-page.tsx >500 lines
sales-utils.ts with opportunity + contact + project rules
```

Suggested separation:

```text
client-company/
  domain/
    client-company-status.ts
  application/
    update-client-company.ts
  queries/
    client-company-360-query.ts

client-contact/
  application/
    create-client-contact.ts
    update-client-contact.ts

sales-opportunity/
  domain/
    opportunity-stage.ts
    opportunity-policy.ts
  application/
    create-opportunity.ts
    advance-opportunity.ts
    mark-opportunity-won.ts
    mark-opportunity-lost.ts
  queries/
    opportunity-pipeline-query.ts

client-activity/
  application/
    record-client-interaction.ts
    manage-client-next-action.ts

responsibility/
  application/
    assign-account-responsibility.ts
    assign-project-responsibility.ts
    transfer-responsibility.ts

client-demand-handoff/
  application/
    create-project-from-opportunity.ts
    create-staffing-order-from-opportunity.ts

client-hire-confirmation/
  application/
    request-client-confirmation.ts
    record-client-hire-confirmation.ts
```

Exact folders may follow repository conventions.

Centralize:

```text
opportunity transitions
company lifecycle
responsibility resolution
direct-hire confirmation policy
```

---

# 17. V7.8 EXIT GATE

## ClientCompany / Contact

```text
[ ] no parallel CRMCompany source of truth
[ ] multiple contacts supported
[ ] company lifecycle distinct from opportunity/project status
```

## Opportunity

```text
[ ] Opportunity stage command-driven
[ ] WON does not auto-create demand
[ ] expected ServiceModel does not override JobOpening authority
```

## Client activity

```text
[ ] interaction and next action separate from Talent CRM
[ ] overdue derived
[ ] sales workbench usable
```

## Responsibility

```text
[ ] account responsibility history preserved
[ ] project responsibility supported
[ ] no generic owner overwrite required
```

## Demand handoff

```text
[ ] Opportunity can link to existing/new Project
[ ] StaffingOrder created explicitly
[ ] no fake 1:1 mapping enforced
```

## Direct hire

```text
[ ] pending confirmations query works
[ ] client confirmation feeds canonical Placement flow
[ ] client cannot directly mutate Placement authority
```

## Regression

```text
[ ] RF-C-01 through RF-C-12 pass
```

---

# 18. HANDOFF TO V7.9

V7.9 owns Omnichannel engagement:

```text
Chatwoot POC
Zalo OA production
webhook verification
identity matching
conversation mapping
structured InteractionOutcome write-through
retry/DLQ/reconciliation
provider adapters
```

V7.9 must use Client/Talent domain commands and must not become canonical business state.

---

# 19. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V78-001 through V78-005
V78-010 through V78-011

Batch B
V78-020 through V78-023

Batch C
V78-030 through V78-034

Batch D
V78-040 through V78-042

Batch E
V78-050 through V78-053

Batch F
V78-060 through V78-063

Batch G
V78-070 through V78-072
Security/RLS
Concurrency

Batch H
RF-C-01 through RF-C-12
V7.8 EXIT GATE
```

---

# 20. ARCHITECTURAL WARNINGS FOR IMPLEMENTATION AGENTS

Do NOT introduce:

```text
CRMCompany
SalesOpportunity.staffingOrderId as mandatory 1:1
ClientCompany.ownerId as only responsibility history
Opportunity.serviceModel as operational authority
```

Do NOT:

```text
reuse Talent Interaction tables without preserving domain semantics
auto-create StaffingOrder when Opportunity becomes WON
let client portal directly patch Placement
turn V7.8 into generic contract/quote/accounting software
```

---

# 21. PRODUCT OUTCOME

After V7.8, HRP should be able to manage the commercial side of manpower operations coherently:

```text
Từ lead nào ra khách hàng này?
Ai là contact chính?
Đang có opportunity nào?
Cơ hội đang ở stage nào?
Việc tiếp theo với khách là gì?
Opportunity thắng đã được bàn giao sang Project/StaffingOrder chưa?
Ai phụ trách account/project tại từng thời điểm?
Direct-hire Placement nào đang chờ khách xác nhận?
```

without introducing a second client database or conflating commercial pipeline with operational staffing demand.
