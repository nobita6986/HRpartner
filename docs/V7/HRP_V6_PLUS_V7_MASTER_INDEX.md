# HRP — V6+ / V7 MASTER INDEX

**Status:** Master engineering entrypoint  
**Purpose:** Single source-of-navigation for architecture, migration, implementation order, and AI coding handoff  
**Applies to:** HRP V6+, V7.1–V7.10

> **Owner decision 13/09/2026:** CRM/Chat/CSKH vận hành ở ứng dụng riêng. Đọc [HRP_CRM_INFRA_SPLIT.md](HRP_CRM_INFRA_SPLIT.md) trước mọi task V7.2/V7.8/V7.9/V7.10. Những dòng bên dưới giao inbox, Chatwoot/Zalo, ACL, CSKH workbench hoặc AI hội thoại cho HRP đã được chuyển sang repo CRM; chỉ HRP canonical domain/API/outbox còn là scope ở repo này.

---

# 0. HOW TO USE THIS DOCUMENT

This file is the required starting point for any AI coding agent or engineer working on HRP V6+/V7.

Before implementing a task:

1. Read this Master Index.
2. Read `AI_CODING_GUARDRAILS.md`.
3. Read the relevant phase backlog.
4. Read any referenced architecture/domain contract sections.
5. Confirm all prerequisite gates are passed.
6. Do not infer missing business rules from legacy code if newer architecture documents explicitly supersede them.
7. If two documents conflict, follow the precedence rules below.
8. For any CRM-facing work, read `HRP_CRM_INFRA_SPLIT.md` and `HRP_CRM_CONNECTOR.md`; do not implement a CRM-owned row in the HRP repository.

---

# 1. DOCUMENT PRECEDENCE

When two documents conflict, use this order:

```text
1. Explicit latest Owner decisions, including HRP_CRM_INFRA_SPLIT.md (13/09/2026)
2. HRP_V6_PLUS_V7_MASTER_INDEX.md
3. AI_CODING_GUARDRAILS.md
4. V6_V7_CONFLICT_CHANGE_REGISTER.md
5. V7_ARCHITECTURE.md
6. V6_PLUS_PLAN.md
7. Phase implementation backlog for the specific V7.x phase, only its HRP-owned rows
8. V6_PLUS_IMPLEMENTATION_BACKLOG.md
9. HRP_CRM_CONNECTOR.md (current proposed cross-app contract); CRM_CSKH_INTEGRATION_PLAN.md is historical and absent from this checkout
10. v6-admin-rebuild.md
11. AI_PROJECT_BRIEF.md
```

Important nuance:

- Phase backlog is the operational implementation authority for that phase.
- `V7_ARCHITECTURE.md` remains the cross-phase domain constitution.
- `V6_V7_CONFLICT_CHANGE_REGISTER.md` explicitly supersedes old V6 wording where identified.
- Legacy documents remain valid where not superseded.

---

# 2. MANDATORY CROSS-CUTTING RULE

Every implementation task MUST comply with:

```text
AI_CODING_GUARDRAILS.md
```

This includes:

```text
no oversized god files
no scattered hardcoded business rules
no UI-owned domain logic
no repeated canonical state queries
no generic PATCH for critical lifecycle transitions
typed DTOs/contracts
centralized policy/catalog modules
explicit command/query boundaries
tests for business invariants
```

Soft source-file guidance:

```text
React component/page           <= ~300 lines
Domain command/service         <= ~350 lines
Repository/query service       <= ~350 lines
Route handler                  <= ~200 lines
Production source >500 lines   requires review
>700 lines                     architecture smell by default
```

Generated/migration/tool-managed files are exempt.

---

# 3. DOMAIN CONSTITUTION

The following distinctions MUST remain explicit:

```text
LaborProfile != Worker
Application != Placement
Application != JobProposal
JobProposal != Placement
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
Partner != User
Source != Handler
Handler != Beneficiary
```

Do not introduce convenience fields that collapse these concepts.

---

# 4. VERSION MODEL

Official product/engineering version structure:

```text
HRP V6
Marketplace & Admin Canonicalization

HRP V6+
V7 Compatibility & Domain Foundation

HRP V7
Workforce Supply Operating System
```

V6+ exists to make V7 possible without unsafe migration or semantic ambiguity.

---

# 5. V6+ ENTRY PURPOSE

V6+ must finish before V7 feature implementation.

Key V6+ objectives:

```text
canonical identity hardening
PlacementCase foundation
Application -> PlacementCase linkage
case-aware HandlingAssignment
AFF handling semantic update
Placement foundation
ServiceModel foundation
Worker uniqueness
EmploymentEpisode re-entry support
PRIMARY Assignment invariant
effective-time/history hardening
domain commands
security/RLS
migration/backfill/reconciliation
```

Primary documents:

```text
V6_PLUS_PLAN.md
V6_PLUS_IMPLEMENTATION_BACKLOG.md
V6_V7_CONFLICT_CHANGE_REGISTER.md
```

---

# 6. V6+ HARD GATE

V7 must NOT begin until the V6+ Compatibility Gate passes.

Minimum requirements:

```text
[ ] canonical LaborProfile stable
[ ] create-or-match canonical
[ ] PlacementCase persistence exists
[ ] new Application is case-linked
[ ] max one active PlacementCase per LaborProfile
[ ] HandlingAssignment is case-aware
[ ] AFF 7-day Handling starts on qualifying PlacementCase open
[ ] source/handler/beneficiary semantics separated
[ ] Placement exists independently from Assignment
[ ] CLIENT_MANAGED Placement can exist without Worker
[ ] Worker max one per LaborProfile
[ ] rehire reuses Worker
[ ] EmploymentEpisode supports re-entry
[ ] max one active PRIMARY Assignment
[ ] effectiveAt / recordedAt / actor / source contract works
[ ] command authorization exists
[ ] RLS updated
[ ] migrations/backfills do not fabricate history
[ ] reconciliation report passes
[ ] permanent regression suite passes
```

---

# 7. LOCKED BUSINESS DECISIONS

These are treated as architecture assumptions unless explicitly changed by a later Architecture Decision Record.

## 7.1 AFF handling clock

```text
ReferralAttribution may be recorded before job-seeking begins.

The 7-day AFF_INITIAL HandlingAssignment starts when
a qualifying PlacementCase is opened.
```

Handling expiry does not erase attribution.

---

## 7.2 Worker Assignment invariant

```text
max one ACTIVE PRIMARY ProjectAssignment per Worker
```

`SECONDARY` may be reserved for future use but is not part of V7 MVP behavior.

---

## 7.3 ServiceModel taxonomy

Initial canonical ServiceModels:

```text
STAFFING_SUPPLY
LABOR_LEASING
RECRUITMENT_SERVICE
REFERRAL_SERVICE
```

Derived management classification:

```text
STAFFING_SUPPLY     -> HRP_MANAGED
LABOR_LEASING       -> HRP_MANAGED
RECRUITMENT_SERVICE -> CLIENT_MANAGED
REFERRAL_SERVICE    -> CLIENT_MANAGED
```

Do not store conflicting duplicate management authority when it can be derived.

---

# 8. V7 PHASE ORDER

Canonical implementation sequence:

```text
V6+ Compatibility Gate
        ↓
V7.1 Talent Repository
        ↓
V7.2 Talent Workbench
        ↓
V7.3 Matching & JobProposal
        ↓
V7.4 Placement & ServiceModel
        ↓
V7.5 Workforce Operations
        ↓
V7.6 Supply Partner Network
        ↓
V7.7 Beneficiary & External Commission Integration
        ↓
V7.8 HRP canonical Client/Demand (may start earlier after its own prerequisites)
        ↓
V7.10 HRP operational intelligence (after required domain facts)

Parallel CRM app lane: Chat/CSKH UI + provider adapters + mock contracts
        ↓
V7.9 HRP↔CRM production integration gates per Talent/B2B flow
        ↓
V7.10 CRM conversational AI (separate release gate)
```

---

# 9. PHASE DOCUMENTS

## V7.1 — Talent Repository

Document:

```text
V7_1_TALENT_REPOSITORY_BACKLOG.md
```

Owns:

```text
LaborProfile 360
Availability
CurrentRelationship
repository search/filter
dedup review
returnee recognition
repository queues
reactivation foundation
```

Hard outcome:

> HRP has a trustworthy canonical workforce repository independent of current candidate status.

---

## V7.2 — Talent Workbench

Document:

```text
V7_2_TALENT_WORKBENCH_BACKLOG.md
```

Owns:

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

Hard outcome:

> Recruiter can run daily Talent operations without spreadsheet/chat platform as workflow authority.

---

## V7.3 — Matching & JobProposal

Document:

```text
V7_3_MATCHING_JOB_PROPOSAL_BACKLOG.md
```

Owns:

```text
Application semantic hardening
PlacementPreference
JobProposal
person-first matching
demand-first matching
matching explanation
```

Hard outcome:

> HRP can connect people and demand without conflating candidate-originated Application with recruiter-originated Proposal.

---

## V7.4 — Placement & ServiceModel

Document:

```text
V7_4_PLACEMENT_SERVICE_MODEL_BACKLOG.md
```

Owns:

```text
Placement attempts
Placement lifecycle
ServiceModel behavior
CLIENT_MANAGED path
HRP_MANAGED path
JobOpening fulfillment
failure/no-show/correction
```

Hard outcome:

> HRP records the real business outcome independently from Assignment.

---

## V7.5 — Workforce Operations

Document:

```text
V7_5_WORKFORCE_OPERATIONS_BACKLOG.md
```

Owns:

```text
Worker
EmploymentEpisode
ProjectAssignment
transfer
workforce exit
rehire
current workforce projections
movement history
```

Hard outcome:

> HRP can truthfully reconstruct who is working where, who left, who transferred, and who returned.

---

## V7.6 — Supply Partner Network

Document:

```text
V7_6_SUPPLY_PARTNER_NETWORK_BACKLOG.md
```

Owns:

```text
SupplyPartner
PartnerMember
partner intake
submission batches
ReferralAttribution
partner portal
attribution dispute
```

Hard outcome:

> CTV/Vendor sourcing works without duplicate candidate databases or source overwrites.

---

## V7.7 — Beneficiary & External Commission Integration

Document:

```text
V7_7_BENEFICIARY_COMMISSION_INTEGRATION_BACKLOG.md
```

Owns:

```text
CommissionBeneficiaryDecision
SOURCE/HANDLER/VENDOR beneficiary roles
EFFECTIVE snapshot
beneficiary correction/dispute
outbox to Python commission app
reconciliation
```

Hard outcome:

> HRP decides who is entitled; Python app calculates money.

---

## V7.8 — Canonical Client/Demand domain; CRM engagement UI external

Document:

```text
V7_8_NATIVE_CLIENT_CRM_BACKLOG.md
```

Owns:

```text
ClientCompany lifecycle
ClientContact
CrmLead
SalesOpportunity
ClientInteraction
ClientNextAction
AccountResponsibility
ProjectResponsibility
opportunity-to-demand handoff
direct-hire confirmation
```

These are HRP canonical entities/commands only. The Client CRM Workbench and commercial/CSKH engagement UI are CRM-app deliverables, not HRP deliverables.

Hard outcome:

> HRP manages B2B manpower relationships without introducing a second client source of truth.

---

## V7.9 — HRP connector milestone; Omnichannel runtime external

Document:

```text
V7_9_OMNICHANNEL_INTEGRATION_BACKLOG.md
```

CRM app owns:

```text
Anti-Corruption Layer
Chatwoot
Zalo OA
webhook verification
identity mapping
conversation mapping
idempotency
outbound delivery queue
retry/DLQ
reconciliation
```

HRP owns authenticated canonical command/query APIs, business permission/audit and its own transactional outbox/event publisher. CRM does not consume HRP core DB directly.

Hard outcome:

> Engagement channels integrate with HRP but never become System of Record.

---

## V7.10 — HRP operational intelligence; conversational AI external

Document:

```text
V7_10_INTELLIGENCE_CONTROLLED_AUTOMATION_BACKLOG.md
```

Ownership split:

```text
HRP: matching ranking, operational risk/facts, command policy/approval
CRM app: reactivation outreach, conversation AI summary/draft, CSKH next-best-action
CRM app: agent coaching, AI evaluation of conversations, channel redaction/security
```

Hard outcome:

```text
AI OFF = HRP STILL WORKS
```

---

# 10. PHASE GATE RULE

Each V7.x phase has an explicit Exit Gate in its backlog.

Rule:

```text
Do not start the next phase's canonical authority
until the previous phase's Exit Gate passes.
```

Schema exploration/prototyping may happen in parallel only if:

```text
it does not establish competing authority
it does not bypass unfinished invariants
it does not create production dependency on the future phase
```

---

# 11. ALLOWED PARALLELISM

Safe examples:

```text
UI mockup work
non-authoritative query prototypes
test fixture preparation
documentation
security catalog planning
performance benchmark preparation
```

Potentially safe after V6+:

```text
Client CRM schema exploration
integration adapter POC
```

but these must not block or redefine Talent/Placement/Workforce authority.

---

# 12. FORBIDDEN SHORTCUTS

AI coding agents must NOT introduce canonical shortcuts such as:

```text
LaborProfile.status = ACTIVE_CANDIDATE
LaborProfile.ownerId
LaborProfile.isAvailable
LaborProfile.isWorking
LaborProfile.currentCompanyId

PlacementCase.ownerId
PlacementCase.poolStatus

Worker.currentProjectId as authority
Worker.isActive as authority

ReferralAttribution.currentHandlerId

Application = every considered Job
Placement = Assignment
```

Rebuildable read projections are allowed only when authority remains explicit.

---

# 13. COMMAND-FIRST RULE

Critical mutations must go through named commands.

Examples:

```text
openPlacementCase()
closePlacementCase()

recordInteraction()
createNextAction()

assignHandling()
claimPlacementCase()
transferHandling()
releaseHandling()

proposeJob()

createPlacement()
confirmPlacement()
markClientManagedPlacementEffective()
startHRPManagedPlacement()
failPlacement()

transferWorker()
leaveWorkforce()

createReferralAttribution()
supersedeReferralAttribution()

createBeneficiaryDecisionsForEffectivePlacement()

markOpportunityWon()
createStaffingOrderFromOpportunity()
```

Do not replace these with generic status PATCH endpoints.

---

# 14. QUERY/PROJECTION AUTHORITY

Centralize canonical read logic for:

```text
effective Availability
CurrentRelationship
active PlacementCase
current handler
Company Pool
overdue NextAction
current HRP workforce
active PRIMARY Assignment
JobOpening fulfillment
partner-safe profile projection
beneficiary reconciliation
integration health
```

Frontend must consume these queries/read models rather than reconstruct them independently.

---

# 15. MIGRATION PRINCIPLE

V6+ migrations follow:

```text
ADD
→ BACKFILL
→ COMPATIBILITY READ/WRITE
→ SWITCH AUTHORITY
→ CLEANUP LATER
```

Never fabricate business history just to satisfy a cleaner schema.

Allowed:

```text
legacy nullable relation
migration provenance
unresolved review record
```

Forbidden:

```text
fake Application
fake PlacementCase
fake Placement
fake Worker
fake attribution
```

---

# 16. DATA HISTORY PRINCIPLE

Lifecycle records preserve:

```text
effectiveAt
recordedAt
actor
source
reason/evidence where material
```

Normal lifecycle correction uses:

```text
end
cancel
void
supersede
correct
```

not hard delete.

---

# 17. SECURITY MODEL

Cross-cutting layers:

```text
Authentication
→ Permission catalog / RBAC
→ Domain command authorization
→ RLS / row visibility
→ Audit
```

Roles are permission bundles.

Business services check permissions/capabilities rather than hardcoding role names.

External identities remain distinct:

```text
HRP user
Partner user
Client user
Integration service
System automation
```

---

# 18. INTEGRATION BOUNDARIES

## External Python commission app

HRP sends:

```text
Placement/beneficiary canonical facts
stable IDs
roles
milestones
correction events
```

HRP does not calculate money.

---

## Chatwoot/Zalo

They own engagement/conversation experience.

HRP owns:

```text
identity
PlacementCase
InteractionOutcome
NextAction
Handling
Placement
Workforce
Attribution
Beneficiary
```

---

## AI

AI owns no canonical business state.

All actions route through approved HRP commands.

---

# 19. MASTER PERMANENT REGRESSION THEMES

Every release should retain coverage for these cross-domain scenarios:

```text
1. One person / one LaborProfile
2. Returnee reuses LaborProfile
3. Rehire reuses Worker
4. General-interest case without Application
5. Application Samsung / Placement Actro
6. Handling expiry preserves source
7. Concurrent Company Pool claim
8. CLIENT_MANAGED effective creates no Worker
9. HRP_MANAGED no-show creates no phantom workforce
10. Transfer keeps same Episode
11. Attribution reclaim does not overwrite canonical source
12. Beneficiary snapshot survives later handler/source changes
13. External Python outage does not lose HRP decision
14. Duplicate webhook is idempotent
15. Provider assignment does not become HRP handling
16. AI disabled leaves core HRP operational
```

---

# 20. AI CODING TASK HANDOFF TEMPLATE

Every coding task should contain:

```text
Task ID
Version / Phase
Classification
Business goal
Prerequisites
Aggregate / bounded context
Schema impact
Migration impact
Domain invariants
Command/query contract
Permission/RLS impact
Audit/outbox impact
Concurrency/idempotency
Tests/regression fixtures
File/module plan
Guardrail check
Exit criteria
```

A task is not complete if it only says:

```text
"Build PlacementCase"
"Build CRM"
"Add matching"
```

---

# 21. PRE-CODING CHECKLIST

Before implementation begins:

```text
[ ] correct phase backlog identified
[ ] prerequisite gate passed
[ ] no unresolved document conflict
[ ] canonical aggregate identified
[ ] command/query boundary identified
[ ] migration path identified
[ ] security scope identified
[ ] tests identified before implementation
[ ] module split planned
[ ] no expected source file requires god-file growth
[ ] business policy has one authority
```

---

# 22. CODE REVIEW CHECKLIST

Before marking task DONE:

```text
[ ] no production source file >500 lines without justification
[ ] no avoidable >700-line production source file
[ ] no hardcoded business threshold duplicated
[ ] no domain logic in UI/routes
[ ] no raw Prisma query duplicates canonical projection
[ ] no generic critical-state PATCH
[ ] no permission/RLS bypass
[ ] no new owner/status shortcut
[ ] no fabricated migration history
[ ] idempotency/concurrency tested where required
[ ] audit/effective time preserved
[ ] permanent regression fixture passes
[ ] future policy change is localized
```

---

# 23. CLEANUP POLICY

Do not block core V7 implementation on cosmetic legacy cleanup.

Potential cleanup after authority is stable:

```text
CandidateSubmission -> Application rename
remove legacy source fields
remove obsolete owner/status convenience fields
remove compatibility fulfillment logic
remove expired feature flags
remove migration-only adapters
```

Each cleanup must be a separate explicit task with regression tests.

---

# 24. ROADMAP SUMMARY

```text
V6
Canonical marketplace/admin

↓ V6+

Domain migration foundation
Identity
PlacementCase
Handling
Placement
ServiceModel
Workforce bridge
Security
Migration/reconciliation

↓ V7.1
Talent Repository

↓ V7.2
Talent Workbench

↓ V7.3
Matching

↓ V7.4
Placement

↓ V7.5
Workforce

↓ V7.6
Partners

↓ V7.7
Beneficiary / Python boundary

↓ V7.8
Client CRM

↓ V7.9
Omnichannel

↓ V7.10
Intelligence
```

---

# 25. FINAL ARCHITECTURAL TEST

The architecture is considered healthy only if HRP can answer these questions from explicit canonical facts:

```text
Who is this person?
Are they available?
Are they actively looking for work?
Who is handling that search episode?
Where did they originally come from?
Which jobs did they apply to?
Which jobs did HRP propose?
Which Placement actually became effective?
Was it direct hire or HRP-managed?
Are they currently an HRP Worker?
Where are they assigned now?
Have they transferred or left?
If they returned, was the same Worker reused?
Which Partner/source is canonical?
Who is the recognized beneficiary?
Was the external commission app notified?
Which client opportunity generated operational demand?
Which engagement-channel event produced the structured business outcome?
What did AI suggest, and did a canonical command actually execute?
```

If the implementation requires guessing these answers from mutable status shortcuts, the architecture has drifted.

---

# 26. REQUIRED DOCUMENT SET

Engineering repository should contain and keep synchronized:

```text
AI_PROJECT_BRIEF.md
v6-admin-rebuild.md
CRM_CSKH_INTEGRATION_PLAN.md

V6_PLUS_PLAN.md
V6_PLUS_IMPLEMENTATION_BACKLOG.md
V6_V7_CONFLICT_CHANGE_REGISTER.md

V7_ARCHITECTURE.md
V7_IMPLEMENTATION_ROADMAP.md

AI_CODING_GUARDRAILS.md

V7_1_TALENT_REPOSITORY_BACKLOG.md
V7_2_TALENT_WORKBENCH_BACKLOG.md
V7_3_MATCHING_JOB_PROPOSAL_BACKLOG.md
V7_4_PLACEMENT_SERVICE_MODEL_BACKLOG.md
V7_5_WORKFORCE_OPERATIONS_BACKLOG.md
V7_6_SUPPLY_PARTNER_NETWORK_BACKLOG.md
V7_7_BENEFICIARY_COMMISSION_INTEGRATION_BACKLOG.md
V7_8_NATIVE_CLIENT_CRM_BACKLOG.md
V7_9_OMNICHANNEL_INTEGRATION_BACKLOG.md
V7_10_INTELLIGENCE_CONTROLLED_AUTOMATION_BACKLOG.md

HRP_V6_PLUS_V7_MASTER_INDEX.md
```

This Master Index is the recommended AI coding entrypoint.
