# HRP V8.3 — ROLE-BASED WORKSPACES IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V8.3  
**Prerequisite:** V8.0 Exit Gate PASS; V8.1/V8.2 capabilities integrated as available  
**Depends on:** V7 canonical domains, V8.0 Workspace Foundation, V8.1 Kanban, V8.2 Microsite  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Purpose-built workspaces over shared canonical HRP services

---

# 0. PURPOSE

V8.3 turns HRP into a role-appropriate product experience.

It must provide distinct workspaces for:

```text
Admin
Recruiter / Sale
Recruitment Manager
CTV
Vendor
Worker
Client
```

These workspaces are not separate products.

They are:

```text
different projections
different navigation
different scope
different default workflows
different allowed commands
```

over the same canonical V7 domain.

---

# 1. NON-NEGOTIABLE INVARIANTS

1. Workspace != business authority.
2. Role name is not the sole permission authority.
3. Multiple workspaces may belong to one User.
4. Internal and external workspaces remain explicitly separated.
5. External workspaces use dedicated safe DTOs/projections.
6. Hidden menu items do not substitute backend authorization.
7. No workspace may duplicate a V7 domain service.
8. Recruiter and Manager workspaces may share Talent/Placement services.
9. CTV/Vendor workspaces must consume Partner/AFF capabilities, not fork them.
10. Worker workspace must not directly mutate workforce history.
11. Client workspace must not expose unrestricted Talent Repository.
12. Admin workspace must not become a giant bypass layer.
13. Every critical action still goes through named canonical commands.
14. Workspace dashboards are projections only.
15. Workspace widgets should degrade safely if dependent features are disabled.
16. V8.1 Kanban and V8.2 Microsite are mounted as capabilities, not reimplemented.

---

# 2. DELIVERY SLICES

```text
V8.3a — Workspace Registry & Composition
V8.3b — Admin Workspace
V8.3c — Recruiter Workspace
V8.3d — Recruitment Manager Workspace
V8.3e — CTV Workspace
V8.3f — Vendor Workspace
V8.3g — Worker Workspace
V8.3h — Client Workspace
V8.3i — Cross-workspace Switching / Security / Hardening
```

---

# 3. V8.3a — WORKSPACE REGISTRY & COMPOSITION

## V83-001 — WorkspaceRegistry

**Type:** Experience config  
**Priority:** BLOCKER

Conceptual:

```text
workspaceType
displayName
requiredCapabilities
navigationRegistry
homeWidgetRegistry
defaultRoute
scopeResolver
theme/options?
```

Initial:

```text
ADMIN
RECRUITER
RECRUITMENT_MANAGER
CTV
VENDOR
WORKER
CLIENT
```

---

## V83-002 — Workspace composition resolver

**Type:** Application service  
**Priority:** BLOCKER

Input:

```text
ActorContext
permissions
memberships
feature flags
```

Output:

```text
availableWorkspaces
workspace navigation
home widgets
allowed actions
scope summary
```

---

## V83-003 — Shared widget contract

**Type:** UI/read contract  
**Priority:** HIGH

Widgets should expose:

```text
id
title
queryKey
requiredPermission
workspaceTypes
size/placement hints
empty/error behavior
```

Role-specific home pages compose widgets rather than implement monolithic pages.

---

# 4. V8.3b — ADMIN WORKSPACE

## V83-010 — Admin navigation

Suggested groups:

```text
Operations
Talent
Demand
Workforce
Partners
Clients
Users & Permissions
Integrations
Configuration
Audit
System Health
```

Admin navigation still follows permissions.

---

## V83-011 — Admin home

Focus on:

```text
system exceptions
unresolved operational issues
queue backlogs
integration health
security/audit alerts
pending disputes
configuration warnings
```

Avoid cramming all business KPIs onto one page.

---

## V83-012 — Admin exception widgets

Potential:

```text
Unresolved duplicate review
Open attribution disputes
Open beneficiary disputes
Failed integration events
Dead-letter count
Migration/reconciliation warnings
Suspended public profiles
```

---

## V83-013 — Admin configuration access

Admin may manage approved config catalogs, but not via arbitrary key/value editing.

Examples:

```text
workspace feature flags
public content moderation policy
selected SLA/policy config
navigation feature exposure
```

Business policy ownership remains with domain modules.

---

# 5. V8.3c — RECRUITER / SALE WORKSPACE

## V83-020 — Recruiter navigation

Recommended:

```text
Today
My Kanban
My Work
My Candidates
Jobs
My Microsite
My AFF
My Performance
```

---

## V83-021 — Recruiter home

Primary cards/widgets:

```text
Due today
Overdue
New cases
Handling expiring
Waiting client
Ready to start
Recent inbound replies
Recent effective placements
```

---

## V83-022 — My Work query composition

Combines:

```text
current HandlingAssignment
open NextActions
active PlacementCases
recent interactions
start monitoring
```

No duplicate recruiter task model.

---

## V83-023 — Recruiter Kanban mount

Uses V8.1:

```text
My Recruitment Board
```

No recruiter-specific fork of Kanban engine.

---

## V83-024 — Recruiter Microsite management mount

Uses V8.2:

```text
Profile
Featured Jobs
Posts
Social links
Analytics
```

---

## V83-025 — Recruiter AFF mount

Consumes Universal AFF capability.

Possible:

```text
My Link
Copy/Share
Safe funnel stats
Ledger link if permitted
```

Do not create Sale-specific AFF API.

---

## V83-026 — Recruiter performance

Initial metrics may include:

```text
cases handled
contacts completed
proposals
effective placements
overdue rate
start success
```

Do not display money unless canonical external integration explicitly supports it later.

---

# 6. V8.3d — RECRUITMENT MANAGER WORKSPACE

## V83-030 — Manager navigation

Recommended:

```text
Team Overview
Team Kanban
Company Pool
Demand Gaps
Recruiter Workload
Overdue / SLA
Disputes
Team Performance
```

---

## V83-031 — Team overview

Widgets:

```text
active cases
unassigned pool
overdue actions
handling expiring
ready-to-start
team workload imbalance
jobs under-supplied
```

---

## V83-032 — Team Kanban mount

Uses V8.1 Team Board.

Scope from team authorization.

---

## V83-033 — Company Pool management

Manager may:

```text
view pool
claim/assign
transfer/release
see aging/priority
```

through canonical Handling commands.

---

## V83-034 — Workload view

Projection may show:

```text
active case count per recruiter
overdue count
next actions due
cases by stage
start-monitoring workload
```

No automatic performance verdict.

---

## V83-035 — Manager exception center

Potential queues:

```text
stale cases
uncontacted new cases
handling expiring
long client wait
start date passed
duplicate review
disputes
```

---

# 7. V8.3e — CTV WORKSPACE

## V83-040 — CTV navigation

Recommended:

```text
Dashboard
Jobs
My AFF
Submit Candidate
My Candidates
Results
Disputes
Profile
```

---

## V83-041 — CTV dashboard

Safe metrics:

```text
submitted
matched/new
in progress
effective placements
open disputes
affiliate funnel if available
```

No internal recruiter performance/internal notes.

---

## V83-042 — CTV Job view

CTV sees only jobs explicitly public/shareable for partner sourcing.

No unrestricted demand internals.

---

## V83-043 — CTV submit candidate

Consumes canonical Partner Intake/Create-or-Match flow.

No CTV-owned candidate database.

---

## V83-044 — CTV candidate projection

Allowed high-level statuses may include:

```text
RECEIVED
PROCESSING
IN_PROGRESS
PLACED
CLOSED
```

These are partner-safe projections, not canonical lifecycle replacements.

---

## V83-045 — CTV dispute view

May open/view allowed attribution dispute cases.

Cannot see other partner evidence unless policy permits.

---

# 8. V8.3f — VENDOR WORKSPACE

## V83-050 — Vendor navigation

Recommended:

```text
Dashboard
Shared Demand
Jobs
Submit Batch
Batches
Candidates
Members
Results
Disputes
```

---

## V83-051 — Vendor dashboard

Safe metrics:

```text
batch count
submitted candidates
new/matched
processing errors
effective placements
open disputes
```

---

## V83-052 — Shared Demand

Vendor sees only demand explicitly exposed to that Vendor/scope.

No unrestricted Client/Demand access.

---

## V83-053 — Batch submission mount

Uses V7.6 PartnerSubmissionBatch.

Features:

```text
upload
processing state
row results
safe reconciliation export
correct invalid rows
```

---

## V83-054 — Vendor member administration

Vendor Admin may manage permitted PartnerMember accounts.

Cannot alter HRP internal users/roles.

---

## V83-055 — Vendor candidate projection

Safe projection, not internal LaborProfile 360.

---

# 9. V8.3g — WORKER WORKSPACE

## V83-060 — Worker identity/self mapping

**Type:** Security/application  
**Priority:** BLOCKER

Resolve authenticated User to canonical:

```text
LaborProfile
Worker?
current EmploymentEpisode?
current ProjectAssignment?
```

No request-supplied workerId authority.

---

## V83-061 — Worker navigation

Recommended:

```text
My Profile
Availability
Applications
Job Proposals
Current Job
Employment
Assignment History
Documents
Notifications
Support
```

---

## V83-062 — Worker home

Possible widgets:

If job-seeking:

```text
availability
active applications
job proposals
upcoming start
```

If HRP-managed workforce:

```text
current company/project
job
start date
HRP contact
recent notifications
```

---

## V83-063 — Worker profile updates

Only allow fields explicitly self-editable.

Changes requiring verification should create review/verification workflow rather than silently overwrite trusted identity.

---

## V83-064 — Worker availability update

Uses canonical Availability command/observation.

No `Worker.isAvailable` shortcut.

---

## V83-065 — Worker application/proposal view

Shows self-only canonical Applications/JobProposals.

---

## V83-066 — Worker employment history

Read-only projection from:

```text
EmploymentEpisode
ProjectAssignment
```

Worker cannot edit historical start/end/transfer facts.

---

## V83-067 — Worker documents

Initial scope should distinguish:

```text
self-uploaded
HRP-verified
required
expired
```

Document security/access policy required.

---

# 10. V8.3h — CLIENT WORKSPACE

## V83-070 — Client account membership

**Type:** Security/application  
**Priority:** BLOCKER

Resolve authenticated Client User to:

```text
ClientCompany
allowed Projects
allowed actions
```

No request-supplied ClientCompany authority.

---

## V83-071 — Client navigation

Recommended:

```text
Overview
Projects
Staffing Orders
JobOpenings
Recruitment Progress
Confirmations
Workforce Summary
Contacts
Support
```

---

## V83-072 — Client overview

Safe metrics:

```text
open demand
requested headcount
effective placements
pending confirmations
active HRP-managed workforce summary
```

---

## V83-073 — Recruitment progress projection

Client-safe view by:

```text
Project
StaffingOrder
JobOpening
```

Do not expose full Talent Repository or internal sourcing notes.

---

## V83-074 — Candidate confirmation queue

For permitted flows:

```text
candidate/start confirmation
direct-hire confirmation
```

Feeds canonical V7 Client Confirmation/Placement commands.

---

## V83-075 — Workforce summary

For HRP-managed services, client may see only authorized workforce summary/details.

No unrestricted cross-client Worker access.

---

# 11. V8.3i — CROSS-WORKSPACE SWITCHING / HARDENING

## V83-080 — Workspace switcher

Show only available workspaces.

Switch changes:

```text
navigation
home
scope presentation
```

It does not mutate permissions.

---

## V83-081 — External/internal separation

A user with multiple identities/memberships must have explicit context.

Example:

```text
HRP internal account
vs
Vendor member context
```

Never infer a broader scope from the same email/account alone without canonical membership.

---

## V83-082 — Route guards

Every workspace route enforces:

```text
workspace capability
underlying domain permission
data scope
```

---

## V83-083 — Cross-workspace deep links

If a link points to a resource inaccessible in current workspace:

```text
offer valid workspace switch if permitted
or
deny
```

Do not leak resource existence unnecessarily.

---

# 12. SECURITY MATRIX

Minimum considerations:

```text
Admin:
internal broad but permission-scoped

Recruiter:
own/current handling + permitted job/project scope

Manager:
team scope

CTV:
own partner/referral scope

Vendor:
own SupplyPartner scope

Worker:
self-only

Client:
own ClientCompany/project scope
```

RLS and query scopes must align.

---

# 13. WORKSPACE HOME QUERY PATTERN

Home pages should call dedicated composition queries.

Example:

```text
RecruiterHomeQuery
ManagerHomeQuery
CTVHomeQuery
VendorHomeQuery
WorkerHomeQuery
ClientHomeQuery
```

These queries may compose canonical projections.

Do not fetch dozens of unrelated endpoints from each page if a stable composition query is more maintainable.

---

# 14. NOTIFICATION SURFACE

Workspace home/top bar may display notifications appropriate to context.

Examples:

Recruiter:

```text
NextAction due
case assigned
candidate replied
start due
```

CTV/Vendor:

```text
submission processed
dispute updated
placement outcome
```

Worker:

```text
job proposal
start reminder
document request
```

Client:

```text
confirmation requested
demand update
```

Canonical event sources remain outside notification UI.

---

# 15. PERMANENT REGRESSION FIXTURES

## RF-V83-01 — SALE + MANAGER

One User can access both Recruiter and Manager workspaces without duplicate account.

---

## RF-V83-02 — Recruiter cannot access team scope

If lacking team permission, Team queries/routes deny.

---

## RF-V83-03 — CTV isolation

CTV A cannot access CTV B/Vendor/internal candidate data.

---

## RF-V83-04 — Vendor member

Vendor member sees only own Vendor scope.

---

## RF-V83-05 — Vendor Admin

Can manage Vendor members but not HRP internal permissions.

---

## RF-V83-06 — Worker self mapping

Cannot substitute another workerId in URL/body to read history.

---

## RF-V83-07 — Worker employment edit

Direct edit of Assignment history denied.

---

## RF-V83-08 — Client isolation

Client A cannot access Client B projects/candidates/workforce.

---

## RF-V83-09 — Client Talent Repository access

Unrestricted Talent search denied.

---

## RF-V83-10 — Hidden navigation

Direct API still denies unauthorized user.

---

## RF-V83-11 — Workspace switch

Does not elevate permissions or expand scope beyond memberships.

---

## RF-V83-12 — Disabled dependency

If Microsite/AFF/Kanban flag is off, workspace degrades safely without breaking unrelated features.

---

# 16. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
workspace-page.tsx with every role
workspace-service.ts switching by role
if/else forest based on role names
duplicate Partner/Worker/Client services inside workspace modules
```

Suggested split:

```text
workspaces/
  registry/
  shared/

  admin/
    queries/
    ui/

  recruiter/
    queries/
    ui/

  manager/
    queries/
    ui/

  ctv/
    queries/
    ui/

  vendor/
    queries/
    ui/

  worker/
    queries/
    ui/

  client/
    queries/
    ui/
```

Shared canonical domain services remain outside these workspace folders.

---

# 17. V8.3 EXIT GATE

## Workspace framework

```text
[ ] registry/composition resolver
[ ] permission-driven workspace availability
[ ] switcher safe
```

## Admin

```text
[ ] governance/exception-focused navigation/home
```

## Recruiter

```text
[ ] Today/My Work
[ ] My Kanban
[ ] Microsite mount
[ ] AFF mount where available
[ ] performance projection
```

## Manager

```text
[ ] Team Board
[ ] Company Pool
[ ] workload
[ ] exceptions
```

## CTV

```text
[ ] jobs
[ ] submit
[ ] candidates/results
[ ] disputes
[ ] AFF where available
```

## Vendor

```text
[ ] demand/jobs
[ ] batch
[ ] candidates/results
[ ] member management
```

## Worker

```text
[ ] self profile
[ ] availability
[ ] applications/proposals
[ ] current employment
[ ] assignment history
```

## Client

```text
[ ] projects/orders/jobs
[ ] recruiting progress
[ ] confirmations
[ ] workforce summary
```

## Security

```text
[ ] internal/external scopes enforced
[ ] no workspace permission escalation
[ ] RF-V83-01 through RF-V83-12 pass
```

---

# 18. HANDOFF TO V8.4

V8.4 owns:

```text
Saved Views expansion
Pinned widgets
Dashboard preferences
default board
personal filters
recent items
workspace-specific analytics
notification preferences
```

It must remain a personalization/analytics layer, not domain authority.

---

# 19. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V83-001 through V83-003

Batch B
V83-010 through V83-013

Batch C
V83-020 through V83-026

Batch D
V83-030 through V83-035

Batch E
V83-040 through V83-045

Batch F
V83-050 through V83-055

Batch G
V83-060 through V83-067

Batch H
V83-070 through V83-075

Batch I
V83-080 through V83-083
Security / notification surface

Batch J
RF-V83-01 through RF-V83-12
V8.3 EXIT GATE
```

---

# 20. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
User.portalType as one permanent authority
User.isSale as product routing authority
WorkerPortalWorker
ClientPortalCompany
VendorPortalCandidate
CTVPortalCandidate
```

Do NOT:

```text
duplicate canonical candidate lists per portal
reuse internal DTOs for external users
allow route parameter to choose Partner/Client/Worker identity
hardcode role-based navigation everywhere
let Admin UI bypass command/audit logic
```

---

# 21. PRODUCT OUTCOME

After V8.3, HRP should feel different for each actor without becoming several disconnected systems:

```text
Recruiter sees today's recruiting work.
Manager sees the team's pipeline and exceptions.
CTV sees their own sourcing activity.
Vendor sees shared demand and batch operations.
Worker sees their own employment journey.
Client sees their own demand and fulfillment.
Admin sees governance and system exceptions.
```

All of them still operate on one canonical HRP domain.
