# HRP V8 — DISCOVERY & REPOSITORY AUDIT PACKAGE

**Status:** READY FOR EXECUTION  
**Scope:** `MS-V8-D00` → `MS-V8-D04`  
**Purpose:** Verify repository reality before any V8 implementation  
**Required references:**
- `HRP_V6_PLUS_V7_MASTER_INDEX.md`
- `V8_MASTER_PLAN.md`
- `V8_MICRO_STEP_EXECUTION_PLAN.md`
- `AI_CODING_GUARDRAILS.md`
- Universal Affiliate canonical plan

---

# 0. EXECUTION RULE

No V8 production code should be written before this audit is completed.

The audit must distinguish:

```text
DOCUMENTED
IMPLEMENTED
PARTIAL
LEGACY_ONLY
NOT_IMPLEMENTED
CONFLICT
UNKNOWN
```

Do not infer implementation from plans.

Do not infer business authority from UI presence.

Do not treat a Prisma model/field as a complete capability.

Do not modify production code during discovery unless the task explicitly requests a harmless diagnostic script.

---

# 1. REQUIRED OUTPUTS

The coding/repository agent must produce:

```text
V8_DISCOVERY_REPORT.md
V8_CAPABILITY_MATRIX.md
V8_REPO_MODULE_MAP.md
V8_BASELINE_TEST_REPORT.md
V8_BLOCKER_REGISTER.md
```

No implementation task starts until these outputs are reviewed.

---

# 2. MS-V8-D00 — REPOSITORY STRUCTURE INVENTORY

## Goal

Map the real repository structure relevant to V8.

## Inspect

At minimum:

```text
app/
src/
components/
domains/
services/
repositories/
queries/
auth/
permissions/
scopes/
RLS helpers
prisma/
migrations/
tests/
public job routes
portal/workspace routes
notification infrastructure
feature flags
design system / UI primitives
```

If repo structure differs, inspect the equivalent paths.

## Required evidence

Produce a module map:

```text
Authentication
Permission/RBAC
RLS/scope
Talent Repository
PlacementCase
InteractionOutcome
NextAction
Handling
Matching
Application
JobProposal
Placement
Worker
EmploymentEpisode
ProjectAssignment
Partner
Client CRM
Omnichannel
AI
Affiliate
Public Jobs
Existing Portals
UI Shell
Design System
Notifications
Analytics
```

For each:

```text
actual path(s)
main entry module
main service/query
main route(s)
test location(s)
notes
```

## PASS

```text
Repository structure understood
Primary authorities identifiable
No major ambiguity blocking V8 placement
```

## BLOCKED

```text
Multiple competing authorities with no clear owner
Repository structure too divergent from planning assumptions
Critical modules impossible to locate
```

---

# 3. MS-V8-D01 — V7 CAPABILITY VERIFICATION

## Goal

Verify what V7/V6+ capabilities actually exist in code.

## Capability status values

```text
IMPLEMENTED
PARTIAL
LEGACY_ONLY
NOT_IMPLEMENTED
CONFLICT
```

## 3.1 Talent / PlacementCase

Verify:

```text
LaborProfile model
create-or-match
duplicate review
Availability
CurrentRelationship
PlacementCase
max-one-active rule
PlacementCase stage/status
InteractionOutcome
NextAction
HandlingAssignment
Company Pool query/projection
Case 360
Profile 360
```

For each capability record:

```text
schema evidence
service/command evidence
query evidence
UI evidence
test evidence
status
```

## 3.2 Matching

Verify:

```text
Application semantic
JobProposal semantic
PlacementPreference
person-first matching
demand-first matching
```

Check whether recruiter suggestion still fabricates Application.

## 3.3 Placement

Verify:

```text
Placement entity
Placement lifecycle
sourceApplicationId
sourceJobProposalId
ServiceModel
CLIENT_MANAGED path
HRP_MANAGED path
EFFECTIVE command
FAILED/CANCELLED/VOIDED
JobOpening fulfillment query
```

## 3.4 Workforce

Verify:

```text
Worker unique per LaborProfile
EmploymentEpisode
ProjectAssignment
PRIMARY assignment constraint
transfer command
exit command
rehire path
current workforce projection
```

## 3.5 Partner

Verify:

```text
SupplyPartner
PartnerMember
PartnerSubmissionBatch
ReferralAttribution
Attribution dispute
partner-safe projection
partner portal
```

## 3.6 Beneficiary boundary

Verify:

```text
CommissionBeneficiaryDecision
snapshot-at-effective behavior
outbox event
correction/supersede/void
Python app integration boundary
```

## 3.7 Client CRM

Verify:

```text
ClientCompany
ClientContact
CrmLead
SalesOpportunity
ClientInteraction
ClientNextAction
AccountResponsibility
ProjectResponsibility
direct-hire confirmation
```

## 3.8 Omnichannel

Verify:

```text
provider adapter abstraction
Chatwoot
Zalo
webhook verification
identity mapping
conversation mapping
inbound event store
outbound outbox
DLQ/reconciliation
```

## 3.9 Intelligence

Verify:

```text
AI provider abstraction
suggestion-only architecture
matching ranking
summary
next-best-action
risk
automation policy
kill switch
```

## Critical output

Produce:

```text
V7 capability → status → actual authority → V8 dependency
```

---

# 4. MS-V8-D02 — AFF IMPLEMENTATION REALITY CHECK

## Goal

Do not confuse AFF design with implementation.

Use the canonical AFF plan as design authority, then verify code.

## 4.1 Verify current AFF baseline

Check:

```text
User.affCode
CTV raw affCode UI
CTV summary API
CandidateSubmission.ctvId
SourceClaim legacy fields
ProjectAssignment.referrerId
commission policy/ledger
CTV scope
```

## 4.2 Verify universal AFF capabilities

Check individually:

```text
GET /api/me/affiliate-link
GET /r/:code
ReferralAttribution model
signed attribution token
HttpOnly attribution cookie
30-day TTL
first-click logic
manual fallback
public apply attribution
SECURITY DEFINER RPC attribution support
generic referrerUserId
AFF-safe create-or-match integration
generic SourceClaim
generic beneficiary
universal ledger self-scope
AFF analytics
feature flags
```

## 4.3 Handling semantic reconciliation

Explicitly report whether code uses:

```text
OLD:
7-day handling starts at LaborProfile create/match

NEW V7:
7-day operational handling starts at qualifying PlacementCase open
```

If both exist or documents/code disagree:

```text
STATUS = CONFLICT
BLOCK handling-related V8 assumptions
```

Do not silently choose one.

## 4.4 Required AFF matrix

Columns:

```text
Capability
Design required?
Code evidence
Status
V8.2 dependency?
Can degrade safely?
Blocking?
```

---

# 5. MS-V8-D03 — UI / DESIGN SYSTEM INVENTORY

## Goal

Reuse existing UX primitives before creating V8-specific replacements.

## Inspect

### Layout

```text
app shell
sidebar
top navigation
breadcrumbs
user menu
responsive layout
```

### Data display

```text
card
table
list
badge
stat card
tabs
pagination
empty state
loading/skeleton
```

### Interaction

```text
dialog
drawer
popover
dropdown
command menu
toast
form controls
date picker
file upload
drag/drop library
```

### Accessibility

```text
focus management
keyboard patterns
aria utilities
screen-reader labels
```

### State/query

```text
TanStack Query usage
query invalidation
optimistic updates
server actions / route handlers
```

### Feature flags

Locate current feature flag authority.

## Required output

For each planned V8 primitive:

```text
REUSE
EXTEND
NEW_REQUIRED
AVOID
```

Example:

```text
WorkspaceShell       EXTEND existing admin layout
Kanban Card          NEW_REQUIRED
Dialog               REUSE
Toast                REUSE
Saved View filter UI EXTEND existing filters
```

---

# 6. MS-V8-D04 — BASELINE TEST / BUILD

## Goal

Record repository health before V8 changes.

## Run, where available

```text
typecheck
lint
unit tests
integration tests
database tests
RLS tests
migration validation
build
```

Do not run destructive production operations.

## Record

For each command:

```text
command
exit code
pass/fail
duration
known pre-existing failure?
relevant modules
```

## Baseline classification

```text
GREEN
YELLOW
RED
ENV_BLOCKED
```

### GREEN

Core checks pass.

### YELLOW

Known unrelated failures exist but V8 work can proceed with documented exclusions.

### RED

Critical build/type/security failures make V8 coding unsafe.

### ENV_BLOCKED

Required test environment unavailable.

---

# 7. V8 REPOSITORY MODULE MAP

Required format:

```text
Capability
Canonical module
Schema/model
Command/service
Query/read model
Route/API
UI
Tests
Authority confidence
Notes
```

Authority confidence:

```text
HIGH
MEDIUM
LOW
CONFLICT
```

---

# 8. V8 CAPABILITY MATRIX

Required top-level rows:

```text
V8.0 Workspace Foundation
V8.1 Kanban dependencies
V8.2 Microsite dependencies
V8.3 Admin dependencies
V8.3 Recruiter dependencies
V8.3 Manager dependencies
V8.3 CTV dependencies
V8.3 Vendor dependencies
V8.3 Worker dependencies
V8.3 Client dependencies
V8.4 Analytics dependencies
V8.5 UX infrastructure
```

For each dependency mark:

```text
READY
PARTIAL
BLOCKED
NOT_REQUIRED_YET
```

---

# 9. BLOCKER REGISTER

Every blocker must have:

```text
Blocker ID
Affected V8 micro-step(s)
Observed evidence
Expected architecture
Actual implementation
Risk
Recommended prerequisite task
Can V8 work continue elsewhere?
```

Example:

```text
BLK-V8-001
Affected: MS-V81-016
Expected: named PlacementCase transition command
Actual: generic PATCH only
Risk: Kanban would become business authority
Action: create V7 canonical command first
Parallel work: board read model may continue
```

---

# 10. DISCOVERY DECISION TREE

For every planned V8 dependency:

```text
Capability exists and canonical
→ reuse

Capability exists but legacy
→ compatibility adapter or prerequisite migration

Capability partial
→ identify exact missing layer

Capability absent
→ block dependent V8 micro-step

Capability conflicts with newer architecture
→ open blocker/ADR
```

Never:

```text
rebuild silently
duplicate silently
patch UI around missing domain authority
```

---

# 11. PRE-V8 IMPLEMENTATION GATE

V8.0 coding may start only when:

```text
[ ] repository module map complete
[ ] V7 capability matrix complete
[ ] AFF reality matrix complete
[ ] UI/design-system inventory complete
[ ] baseline build/test report complete
[ ] blockers classified
[ ] no unknown critical authority for MS-V80-001..005
```

V8.1 coding may start only when:

```text
[ ] PlacementCase authority verified
[ ] current handler query verified
[ ] NextAction authority verified
[ ] Placement effective command verified or blocker identified
```

V8.2 AFF features may start only when:

```text
[ ] AFF capability required by the step is VERIFIED IMPLEMENTED
```

---

# 12. DISCOVERY OUTPUT TEMPLATE

## Executive Summary

```text
Repository health:
V7 readiness:
AFF readiness:
V8.0 readiness:
V8.1 readiness:
V8.2 readiness:
Critical blockers:
```

## Key Findings

```text
Implemented:
Partial:
Legacy:
Missing:
Conflicts:
```

## Recommended next execution batch

Exactly identify the next 1–3 micro-steps that are safe to implement.

---

# 13. NON-GOALS

Discovery does NOT:

```text
implement V8
rewrite V7
upgrade libraries
rename folders for cleanliness
replace design system
refactor working services
fix unrelated lint/test debt
```

Unless a critical blocker makes a prerequisite task necessary.

---

# 14. DEFINITION OF DONE

Discovery is DONE only when the team can answer with evidence:

```text
Where is each canonical V7 authority?
Which V8 dependencies really exist?
Which AFF capabilities are actually implemented?
Which UI primitives can be reused?
What tests currently pass/fail?
What exactly blocks the first V8 implementation steps?
Which 1–3 micro-steps should be coded next?
```

No answer may rely only on plan documents when repository evidence is required.
