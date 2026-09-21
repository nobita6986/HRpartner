# HRP V8 — MASTER PLAN

**Status:** Master product/engineering plan  
**Primary theme:** Experience, Distribution & Role-based Operations  
**Depends on:** HRP V7 canonical domain + Universal Affiliate design authority  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` remains mandatory

## 0. Executive summary

V7 establishes the canonical Workforce Supply Operating System.

V8 builds the experience and distribution layer on top of V7.

```text
V7 asks:
"What is true?"

V8 asks:
"How should each user see, operate, distribute, and act on that truth?"
```

V8 focuses on:

```text
Kanban Operations
Recruiter Microsites
Personal content / job promotion
Role-based Workspaces
Role-specific dashboards
Self-service portals
Permission-driven navigation
Experience personalization
Distribution surfaces
```

V8 must not create a second business authority parallel to V7.

---

## 1. Product intent

Target experience:

```text
Recruiter
→ sees today's work
→ operates cases through Kanban
→ promotes jobs from personal microsite
→ shares canonical affiliate links
→ follows personal performance

Manager
→ sees team pipeline and bottlenecks
→ sees Company Pool / SLA / workload
→ intervenes through canonical commands

CTV
→ sees jobs, links, submissions, results

Vendor
→ sees demand, batches, members, results

Worker
→ sees profile, job status, employment context

Client
→ sees demand, recruiting progress, confirmations

Admin
→ sees governance, operations, security, integrations
```

---

## 2. V8 architectural position

V8 is primarily:

```text
UX layer
View/projection layer
Workspace layer
Distribution layer
Self-service layer
Command orchestration layer
```

V8 is not primarily:

```text
new recruitment lifecycle
new source attribution engine
new workforce lifecycle
new commission engine
new client database
new partner database
```

When V8 changes business state, it must call canonical V7 commands.

---

## 3. Non-negotiable V8 principles

1. V8 consumes V7 domain authority.
2. V8 does not invent duplicate canonical statuses.
3. Kanban columns are projections/actions over V7 facts.
4. Kanban cards represent active business work, not person ownership.
5. Recruiter public pages reference canonical jobs.
6. V8 does not implement a second Affiliate system.
7. Universal AFF remains a shared platform capability.
8. Workspaces are permission-driven, not hardcoded one-role-one-app.
9. One User may hold multiple internal roles/permissions.
10. External actors receive constrained projections.
11. Navigation derives from capabilities/permissions.
12. Drag/drop invokes canonical commands.
13. Business rules do not live only in UI code.
14. V8 must obey file-size/module guardrails.
15. Public distribution surfaces must never expose internal PII/business notes.

---

## 4. Universal Affiliate — V8 boundary

Universal Affiliate is not a V8 domain.

V8 may:

```text
show affiliate link
copy/share affiliate link
attach optional Job destination
display safe affiliate stats projection
mount affiliate tools in role workspaces
use affiliate link inside recruiter microsite
```

V8 must not create:

```text
MicrositeAffiliate
RecruiterAffiliate
SaleReferral
separate microsite attribution cookie
separate microsite commission logic
```

The existing AFF design applies to generic `User`, not only Sale/CTV.

At V8 planning time, AFF must be treated in three categories:

```text
A. Existing baseline pieces
B. Designed but not yet proven implemented
C. Semantics that must be reconciled with V7 before execution
```

Known existing pieces include `User.affCode`, partial CTV UI/API, legacy submission/source structures, `ProjectAssignment.referrerId`, and partial commission/ledger foundation.

V8.2 must enable AFF-dependent behavior only when the required AFF capability is actually available.

---

## 5. V8 phase structure

```text
V8.0 — Experience Foundation
V8.1 — Recruitment Kanban
V8.2 — Recruiter Microsite & Content Distribution
V8.3 — Role-based Workspaces
V8.4 — Workspace Analytics & Personalization
V8.5 — Experience Hardening
```

---

# V8.0 — Experience Foundation

## Objective

Build shared experience infrastructure required by all later V8 phases.

## Capabilities

```text
Workspace Shell
Permission-driven Navigation Registry
Actor Context
Workspace Context
Shared Dashboard Framework
View Preferences
Saved Views
Board Definition foundation
Card Presentation foundation
Public Profile Slug foundation
Shared Public Layout
Feature flags
Role-safe projection patterns
```

## Workspace contexts

```text
Internal HRP
Partner
Client
Worker
Public
```

Internal HRP may expose:

```text
Recruiter
Recruitment Manager
Admin
```

These should not be separate applications with duplicated domain logic.

---

## 6. Permission-driven navigation

Navigation items should be registered against capabilities, for example:

```text
Talent Repository
requires talent.profile.read

Kanban
requires talent.case.read

Company Pool
requires talent.case.pool.read

Partner Management
requires partner.read
```

Avoid making `if role === ...` the primary navigation architecture.

Roles remain permission bundles.

---

# V8.1 — Recruitment Kanban

## Objective

Turn recruiting operations into a visual pipeline without creating a second workflow authority.

## Card authority

```text
Kanban Card authority = PlacementCase
Displayed person = LaborProfile
```

Do not use `LaborProfile.status` as Kanban authority.

One person may have multiple PlacementCases over time.

## Initial board types

```text
My Recruitment Board
Team Recruitment Board
JobOpening Board
Project Board
Company Pool Board
Start Monitoring Board
```

Potential later:

```text
Direct Hire Board
Reactivation Board
Vendor Supply Board
Client Confirmation Board
```

## Column semantics

Example default:

```text
NEW
CONTACTING
QUALIFYING
MATCHING
PROPOSED
CLIENT_PROCESS
CONFIRMED
READY_TO_START
EFFECTIVE
```

User labels may be:

```text
Mới
Đang liên hệ
Đang tư vấn
Đã giới thiệu việc
Chờ khách
Đã nhận
Chờ đi làm
Đi làm
```

Labels are UX; canonical transitions remain V7 domain logic.

## Drag/drop contract

```text
drag card
→ requested board action
→ canonical V7 command
→ validation
→ transaction
→ board refresh
```

Invalid transition:

```text
reject
restore card
show actionable reason
```

No direct status patch.

## Kanban card content

Recommended:

```text
Name
Job/JobOpening
Availability
Location
Current handler
Last interaction
NextAction
SLA/overdue
Source
Placement readiness
```

Initial variants:

```text
Compact
Standard
Operational
```

## Bottleneck visibility

```text
column count
age in column
case age
overdue actions
handling expiry
waiting on client
untouched cases
ready-to-start
```

## Board configuration

V8 may add:

```text
BoardDefinition
ColumnDefinition
CardViewDefinition
```

These configure presentation/query/action mapping only.

They must not become a second business workflow engine.

---

# V8.2 — Recruiter Microsite & Content Distribution

## Objective

Give each recruiter/sale a personal public recruitment presence.

Recommended product concept:

```text
Recruiter Microsite
```

Example:

```text
hrp.vn/minh-nguyen
```

## Public profile

```text
Avatar
Display name
Role/title
Short introduction
Phone
Zalo
TikTok
Facebook
Approved social links
Contact CTA
```

Public visibility must be permission/privacy controlled.

## Featured jobs

Recruiter curates canonical JobPostings.

Conceptually:

```text
RecruiterFeaturedJob
→ JobPosting reference
→ display order
→ recruiter intro/comment
→ optional presentation media
```

Recruiter may customize presentation but may not override canonical:

```text
salary
requirements
location
ServiceModel
opening status
```

If the canonical job closes, the microsite reflects that automatically.

## Content/blog

Initial safe content types:

```text
Article/Post
Short update
Image
Video link
TikTok link
Facebook link
Job promotion block
```

Do not allow arbitrary HTML/JS in the first release.

## CTA

```text
Apply to this job
Ask me for job advice
Leave contact information
View all jobs
Call / Zalo
```

All applications/intakes route through canonical V7/AFF paths.

## Microsite + Affiliate

```text
Recruiter Microsite
→ Featured Job
→ canonical JobPosting
→ canonical Universal AFF destination
→ AFF attribution flow
```

Microsite never decides canonical source itself.

## Microsite analytics

Safe projections may include:

```text
Page views
Job views
Share clicks
Applications
General-interest leads
Matched profiles
PlacementCases opened
Effective Placements
```

Always distinguish:

```text
traffic analytics
!= ReferralAttribution
!= Handling
!= Beneficiary
```

---

# V8.3 — Role-based Workspaces

## Objective

Give each major actor a purpose-built experience over shared canonical HRP services.

Initial workspaces:

```text
Admin
Recruiter / Sale
Recruitment Manager
CTV
Vendor
Worker
Client
```

## Admin Workspace

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

## Recruiter / Sale Workspace

```text
Today
My Work
My Kanban
My Candidates
Jobs
My Microsite
My AFF Link
My Performance
```

## Recruitment Manager Workspace

```text
Team Kanban
Company Pool
Untouched cases
Overdue actions
Handling expiry
Recruiter workload
Pipeline bottlenecks
Demand shortages
Team performance
```

## CTV Workspace

```text
Dashboard
Jobs
My AFF Link
Submit Candidate
My Candidates
Results
Disputes
Profile
```

CTV must not see internal HRP notes, other partner data, or sensitive internal beneficiary logic.

## Vendor Workspace

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

Vendor Admin/Member capabilities are permission-driven.

## Worker Workspace

```text
My Profile
Availability
Applications
Job Proposals
Current Job
Employment
Current Project
Assignment History
Notifications
Support
Documents
```

Payroll remains outside HRP unless a future explicit read integration is designed.

## Client Workspace

```text
Projects
Staffing Orders
JobOpenings
Recruitment Progress
Candidates awaiting confirmation
Direct Hire Confirmation
Current HRP Workforce summary
Contacts
Support
```

Client cannot freely browse the HRP Talent Repository.

---

# V8.4 — Workspace Analytics & Personalization

## Objective

Improve productivity without altering canonical domain facts.

Capabilities may include:

```text
Saved Views
Dashboard Preferences
Pinned Widgets
Default Board
Personal filters
Recent items
Notification preferences
Role-specific analytics
```

Analytics remain projections.

Examples:

```text
Recruiter:
cases handled
effective placements
overdue rate

Manager:
team throughput
bottleneck duration
pool age

CTV:
referrals
applications
effective placements

Vendor:
batch conversion
effective placements

Client:
demand fulfillment
pending confirmations
```

Commission money remains outside HRP where already defined.

---

# V8.5 — Experience Hardening

Potential scope:

```text
mobile responsiveness
keyboard operations
Kanban performance
accessibility
notification center
workspace switching
deep links
saved filters
cross-workspace navigation
design consistency
performance monitoring
```

This hardening may be continuous rather than a single release if execution prefers.

---

## 7. V8 data-model rules

V8 may add experience-layer models such as:

```text
WorkspacePreference
SavedView
BoardDefinition
ColumnDefinition
CardViewDefinition
RecruiterPublicProfile
RecruiterFeaturedJob
RecruiterPost
PublicSocialLink
```

These must not replace:

```text
LaborProfile
PlacementCase
JobOpening
JobPosting
ReferralAttribution
HandlingAssignment
Placement
Worker
SupplyPartner
ClientCompany
```

---

## 8. V8 command boundary

Examples:

```text
Kanban move
→ V7 domain command

Microsite apply
→ public application/AFF flow

CTV submit
→ partner intake command

Vendor batch
→ partner batch command

Client confirmation
→ canonical Placement confirmation flow

Worker availability update
→ AvailabilityObservation command
```

V8 orchestrates; V7 owns business truth.

---

## 9. Security model

V8 preserves:

```text
Authentication
→ Permission
→ Scope
→ Projection
→ Command authorization
→ RLS
```

Public microsites use public-safe DTOs.

External workspaces use explicit external DTOs and must not reuse internal admin serializers.

---

## 10. Maintainability guardrails

`AI_CODING_GUARDRAILS.md` applies unchanged.

V8-specific prohibitions:

```text
no kanban-page.tsx god component
no giant workspace role switch
no duplicated role-specific domain services
no microsite-specific AFF implementation
no hardcoded column transitions in React
no copied dashboard business queries
```

Preferred top-level modules:

```text
experience-core/
workspace/
navigation/
kanban/
recruiter-public-profile/
recruiter-content/
workspace-analytics/
external-portals/
```

---

## 11. Performance requirements

Plan for:

```text
column-level pagination
cursor/page loading
optimistic drag UI with server confirmation
query batching
read-model caching where safe
no N+1
virtualized large columns where needed
incremental refresh
```

Do not fetch all PlacementCases for large projects into one browser payload.

---

## 12. Real-time strategy

Useful events include:

```text
card changed by another recruiter
handling claimed
NextAction completed
Placement EFFECTIVE
new inbound interaction
```

Start with the simplest mechanism compatible with the existing stack:

```text
query invalidation
polling
server event mechanism if already available
```

Do not introduce complex realtime infrastructure prematurely.

---

## 13. Notification strategy

Potential V8 notifications:

```text
NextAction due
Handling expiring
Case assigned
Placement start due
Client response
Partner dispute update
New candidate reply
```

Notifications are derived from canonical events, not business authority.

---

## 14. Dependency map

```text
V7 canonical domain
      │
      ├────────────── Universal AFF lane
      │                      │
      ▼                      ▼
V8.0 Experience Foundation
      │
      ├─────────────┐
      ▼             ▼
V8.1 Kanban     V8.2 Recruiter Microsite
      │             │
      └──────┬──────┘
             ▼
      V8.3 Role Workspaces
             │
             ▼
      V8.4 Personalization
             │
             ▼
      V8.5 Hardening
```

AFF implementation can progress independently, but AFF-dependent V8.2 behavior is enabled only when the needed AFF slice has real implementation evidence.

---

## 15. Phase gates

### V8.0 Exit Gate

```text
[ ] permission-driven navigation
[ ] workspace shell
[ ] actor/workspace context
[ ] no role-hardcoded core navigation
[ ] shared view/config patterns
```

### V8.1 Exit Gate

```text
[ ] PlacementCase cards
[ ] canonical-command drag/drop
[ ] My/Team/Job boards
[ ] no duplicate lifecycle
[ ] bottleneck/SLA indicators
```

### V8.2 Exit Gate

```text
[ ] recruiter public profile
[ ] featured canonical jobs
[ ] safe content/posts
[ ] AFF consumed only through canonical AFF
[ ] public privacy/security pass
```

### V8.3 Exit Gate

```text
[ ] Admin workspace
[ ] Recruiter workspace
[ ] Manager workspace
[ ] CTV workspace
[ ] Vendor workspace
[ ] Worker workspace
[ ] Client workspace
[ ] all permission/scope-safe
```

### V8.4 Exit Gate

```text
[ ] saved views/preferences
[ ] role-appropriate analytics
[ ] no aggregate becomes business authority
```

### V8.5 Exit Gate

```text
[ ] mobile
[ ] accessibility
[ ] performance
[ ] notification consistency
[ ] workspace UX consistency
```

---

## 16. Master regression scenarios

```text
R-V8-01 Same LaborProfile, different PlacementCases remain separate cards/history.
R-V8-02 Invalid Kanban transition reverts UI; canonical state unchanged.
R-V8-03 "Đi làm" drag executes V7 Placement command, not status patch.
R-V8-04 Closed JobPosting disappears/becomes unavailable on recruiter microsite.
R-V8-05 Microsite cannot overwrite an existing canonical ReferralAttribution.
R-V8-06 SALE + MANAGER permissions work on one User account.
R-V8-07 CTV cannot see internal HRP notes or other partner data.
R-V8-08 Vendor member is isolated to own Vendor scope.
R-V8-09 Worker cannot directly edit workforce history.
R-V8-10 Client cannot search unrestricted Talent Repository.
R-V8-11 Hidden navigation is not security; direct API is still denied.
R-V8-12 AFF unavailable degrades microsite AFF features safely.
```

---

## 17. Release strategy

Recommended:

```text
V8.0 internal foundation

V8.1 internal recruiter pilot
→ selected recruiters
→ selected JobOpening/Project boards

V8.2 microsite pilot
→ selected Sale users
→ public security/content review
→ AFF integration behind feature flag

V8.3 workspace rollout
→ recruiter/manager first
→ CTV/Vendor
→ Worker
→ Client

V8.4/V8.5 iterative rollout
```

---

## 18. Potential feature flags

```text
V8_WORKSPACE_SHELL_ENABLED
V8_KANBAN_ENABLED
V8_RECRUITER_MICROSITE_ENABLED
V8_MICROSITE_AFF_ENABLED
V8_CTV_WORKSPACE_ENABLED
V8_VENDOR_WORKSPACE_ENABLED
V8_WORKER_WORKSPACE_ENABLED
V8_CLIENT_WORKSPACE_ENABLED
```

Flags control rollout, not competing business semantics.

---

## 19. Documentation sequence

Planning artifacts should be produced in this order:

```text
1. V8_MASTER_PLAN.md

2. V8_0_EXPERIENCE_FOUNDATION_BACKLOG.md
3. V8_1_RECRUITMENT_KANBAN_BACKLOG.md
4. V8_2_RECRUITER_MICROSITE_BACKLOG.md
5. V8_3_ROLE_BASED_WORKSPACES_BACKLOG.md
6. V8_4_WORKSPACE_ANALYTICS_PERSONALIZATION_BACKLOG.md
7. V8_5_EXPERIENCE_HARDENING_BACKLOG.md

8. V8_MICRO_STEP_EXECUTION_PLAN.md
```

Each phase backlog will define:

```text
scope
domain dependencies
schema impact
commands
queries
security
UI
regression fixtures
exit gate
AI coding batches
```

Only after phase backlogs are stable should micro-step execution be written.

---

## 20. Micro-step principle

Do not create giant tasks:

```text
Build Kanban
Build Recruiter Portal
Build Worker Portal
```

Prefer steps such as:

```text
define board read DTO
create board query
define one column mapping
create drag command adapter
add transition test
build compact card
add column pagination
build board shell
```

Each micro-step should:

```text
touch few modules
have a clear test
avoid unrelated refactor
respect file-size guardrails
be independently reviewable
```

---

## 21. V8 success criteria

V8 succeeds when:

```text
Recruiters can work visually instead of living in tables.
Managers can see bottlenecks immediately.
Sales can publicly promote jobs through personal microsites.
Universal Affiliate is consumed without duplication.
Each major actor receives a purpose-built workspace.
External actors only see permitted data/actions.
V7 domain truth remains canonical.
The codebase remains modular and maintainable.
```

---

## 22. Final V8 constitution

The architecture remains healthy only if:

```text
Kanban does not own recruitment truth.
Microsite does not own Job truth.
Microsite does not own Affiliate truth.
Workspace does not own authorization truth.
Dashboard does not own domain truth.
External portal does not own HRP canonical data.
```

**V8 owns how HRP is experienced.**

**V7 owns what HRP business facts mean.**
