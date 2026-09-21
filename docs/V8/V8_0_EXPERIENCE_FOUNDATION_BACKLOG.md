# HRP V8.0 — EXPERIENCE FOUNDATION IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V8.0  
**Depends on:** HRP V7 canonical domain, V8 Master Plan  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Shared experience infrastructure for V8.1–V8.5

---

# 0. PURPOSE

V8.0 builds the common experience foundation that later V8 phases consume.

It must establish:

```text
Workspace Shell
Actor Context
Workspace Context
Permission-driven Navigation
Shared Dashboard Shell
View Preferences
Saved Views
Board/Card presentation contracts
Public Profile slug foundation
Feature-gated experience modules
Role-safe external projection conventions
```

V8.0 must NOT build:

```text
full Kanban business behavior
Recruiter Microsite content
role-specific business dashboards
new recruitment status
new affiliate system
new Partner/Client/Worker lifecycle
```

---

# 1. NON-NEGOTIABLE INVARIANTS

1. V8.0 does not own V7 business truth.
2. Role names are not the primary navigation authority.
3. Permissions/capabilities drive visible actions.
4. Hidden navigation is not security.
5. Every action still requires backend permission + scope + RLS.
6. Internal and external actor contexts remain explicit.
7. Workspace switching must not elevate privileges.
8. Saved views/preferences are user experience data, not business state.
9. BoardDefinition/ColumnDefinition are presentation contracts, not workflow authority.
10. Public profile slug/data is public-safe projection only.
11. Internal DTOs must not be reused blindly for public/external experiences.
12. Shared components must not introduce domain decisions into UI.
13. V8.0 modules must remain small and composable.
14. Feature flags control rollout, not semantics.

---

# 2. DELIVERY SLICES

```text
V8.0a — Actor & Workspace Context
V8.0b — Permission-driven Navigation
V8.0c — Workspace Shell & Layout
V8.0d — View Preferences & Saved Views
V8.0e — Board/Card Presentation Foundation
V8.0f — Public Profile Foundation
V8.0g — Feature Flags / Observability / Hardening
```

---

# 3. V8.0a — ACTOR & WORKSPACE CONTEXT

## V80-001 — ActorContext contract

**Type:** Application/security contract  
**Priority:** BLOCKER

Conceptual:

```text
userId
actorType
internal/external context
permissions
scope descriptors
availableWorkspaces
currentWorkspace
```

Suggested actor types:

```text
HRP_USER
PARTNER_USER
CLIENT_USER
WORKER_USER
SYSTEM
```

Do not derive actor behavior from one `role` string.

---

## V80-002 — WorkspaceContext contract

**Type:** Experience contract  
**Priority:** BLOCKER

Conceptual:

```text
workspaceId
workspaceType
displayName
permission requirements
scope resolver
navigation registry
default route
```

Initial workspace types:

```text
ADMIN
RECRUITER
RECRUITMENT_MANAGER
CTV
VENDOR
WORKER
CLIENT
```

Workspace availability is derived from actor permissions/context.

---

## V80-003 — Workspace availability resolver

**Type:** Application service  
**Priority:** BLOCKER

Resolve which workspaces a User may access.

Example:

```text
User has:
talent.case.read
talent.case.team.read

→ Recruiter Workspace
→ Recruitment Manager Workspace
```

No hardcoded frontend-only role switching.

---

## V80-004 — Workspace switch command/session action

**Type:** Experience/application  
**Priority:** HIGH

Switching workspace may update experience context only.

It must not:

```text
change User role
grant permission
change data scope
```

---

# 4. V8.0b — PERMISSION-DRIVEN NAVIGATION

## V80-010 — Navigation registry

**Type:** Experience config  
**Priority:** BLOCKER

Conceptual:

```text
id
label
route
iconKey
group
requiredPermissions
workspaceTypes
featureFlag?
sortOrder
```

Do not embed permission conditions in dozens of page components.

---

## V80-011 — Navigation visibility resolver

**Type:** Application/UI support  
**Priority:** BLOCKER

Input:

```text
ActorContext
WorkspaceContext
Navigation Registry
Feature Flags
```

Output:

```text
visible navigation tree
```

UI only consumes result.

---

## V80-012 — Action visibility pattern

**Type:** Shared UX contract  
**Priority:** HIGH

Buttons/menus should use capability checks such as:

```text
can("talent.case.transfer")
```

instead of:

```text
role === "MANAGER"
```

Backend remains authority.

---

## V80-013 — Navigation grouping

Suggested groups:

Internal:

```text
Today
Talent
Demand
Workforce
Partners
Clients
Insights
Administration
```

External workspaces get narrower registries.

---

# 5. V8.0c — WORKSPACE SHELL & LAYOUT

## V80-020 — Shared Workspace Shell

**Type:** UI architecture  
**Priority:** BLOCKER

Shared shell should support:

```text
sidebar/navigation
top bar
workspace switcher
user menu
notification area placeholder
content area
breadcrumbs/deep-link context
responsive layout
```

Avoid one giant layout component.

---

## V80-021 — Workspace Home contract

**Type:** UI/query contract  
**Priority:** HIGH

Each workspace home may compose widgets from a registry.

V8.0 provides framework only.

Role-specific widget content belongs primarily to V8.3/V8.4.

---

## V80-022 — Empty/loading/error conventions

**Type:** Shared UX  
**Priority:** HIGH

Standardize:

```text
loading
empty
error
permission denied
dependency unavailable
feature disabled
```

Avoid custom error behavior per workspace.

---

## V80-023 — Deep-link preservation

**Type:** UX/router  
**Priority:** MEDIUM

When switching or reloading, preserve valid target context where possible.

Do not redirect users to broad dashboards unnecessarily.

---

# 6. V8.0d — VIEW PREFERENCES & SAVED VIEWS

## V80-030 — WorkspacePreference schema

**Type:** Schema/experience  
**Priority:** HIGH

Conceptual:

```text
id
userId
workspaceType
defaultLanding?
defaultBoard?
density?
sidebarState?
updatedAt
```

No business state.

---

## V80-031 — SavedView schema

**Type:** Schema/experience  
**Priority:** BLOCKER

Conceptual:

```text
id
userId
workspaceType
viewType
name
filterJson
sortJson
layoutJson
isDefault
createdAt
updatedAt
```

Store only validated/safe view configuration.

---

## V80-032 — Saved view validation

**Type:** Application/security  
**Priority:** BLOCKER

Saved filters must not allow:

```text
arbitrary SQL
unbounded internal field access
permission bypass
```

Use whitelisted filter schema per view type.

---

## V80-033 — Personal vs shared views

**Type:** Product decision  
**Priority:** MEDIUM

Initial recommendation:

```text
V8.0 = personal views only
```

Shared/team views can be added later after governance rules are clear.

---

# 7. V8.0e — BOARD / CARD PRESENTATION FOUNDATION

## V80-040 — BoardDefinition contract

**Type:** Experience/domain-adjacent config  
**Priority:** BLOCKER

Conceptual:

```text
id
boardType
name
allowedWorkspaces
queryKey
columnDefinitionSet
cardViewSet
```

BoardDefinition selects presentation/query behavior.

It does not define core business state transitions.

---

## V80-041 — ColumnDefinition contract

**Type:** Experience config  
**Priority:** BLOCKER

Conceptual:

```text
id
boardType
label
displayOrder
projectionPredicate
allowedActionKeys
wipIndicatorConfig?
```

`projectionPredicate` maps canonical V7 facts to a visible column.

Do not persist a duplicate `kanbanStatus`.

---

## V80-042 — CardViewDefinition contract

**Type:** Experience config  
**Priority:** HIGH

Initial variants:

```text
COMPACT
STANDARD
OPERATIONAL
```

Each variant defines display fields, not business authority.

---

## V80-043 — Board action registry

**Type:** Command mapping  
**Priority:** BLOCKER

Maps UI actions to canonical command handlers.

Example:

```text
MOVE_TO_CONTACTING
→ canonical placement-case command

MARK_EFFECTIVE
→ canonical Placement command
```

No direct generic status PATCH.

---

# 8. V8.0f — PUBLIC PROFILE FOUNDATION

## V80-050 — Public slug registry

**Type:** Schema/application  
**Priority:** BLOCKER

Needed for Recruiter Microsite.

Conceptual:

```text
slug
entityType
entityId
status
createdAt
updatedAt
```

Or a narrower Recruiter-specific model if repo architecture prefers.

Requirements:

```text
unique
URL-safe
reserved words blocked
case normalization
collision handling
```

---

## V80-051 — Public profile enable/disable state

**Type:** Public experience contract  
**Priority:** HIGH

Must support:

```text
DRAFT
PUBLISHED
UNPUBLISHED
SUSPENDED
```

This is public visibility state, not User employment/account status.

---

## V80-052 — Public-safe projection boundary

**Type:** Security/query  
**Priority:** BLOCKER

Public profile queries may expose only allow-listed fields.

Never expose automatically:

```text
internal userId
permissions
internal notes
manager data
sensitive contact data not explicitly published
```

---

## V80-053 — Reserved slug policy

Examples:

```text
admin
api
jobs
login
register
r
support
```

Centralize policy.

---

# 9. V8.0g — FEATURE FLAGS / OBSERVABILITY / HARDENING

## V80-060 — Experience feature flags

Initial candidates:

```text
V8_WORKSPACE_SHELL_ENABLED
V8_SAVED_VIEWS_ENABLED
V8_KANBAN_FOUNDATION_ENABLED
V8_PUBLIC_PROFILE_FOUNDATION_ENABLED
```

Feature flags only gate rollout.

---

## V80-061 — Experience telemetry

Track safe metrics:

```text
workspace_open_total
workspace_switch_total
navigation_click_total
saved_view_create_total
saved_view_apply_total
board_open_total
public_profile_view_total
```

No sensitive field values in metrics.

---

## V80-062 — Performance baseline

Measure:

```text
workspace shell load
navigation resolve
saved view load
board config load
public profile response
```

before V8.1 adds heavy Kanban data.

---

# 10. SECURITY REQUIREMENTS

Suggested permissions/capabilities:

```text
workspace.admin.access
workspace.recruiter.access
workspace.manager.access
workspace.ctv.access
workspace.vendor.access
workspace.worker.access
workspace.client.access

saved_view.create
saved_view.update
saved_view.delete

public_profile.manage
```

Workspace access permission does not replace underlying domain permissions.

---

# 11. EXTERNAL ACTOR SAFETY

Partner, Worker, and Client contexts must never infer access from route alone.

Required chain:

```text
authenticate
→ resolve external membership/self mapping
→ resolve permission
→ resolve scope
→ build external-safe projection
```

---

# 12. CONCURRENCY / IDEMPOTENCY

Potential cases:

```text
two tabs updating same default view
slug claim race
workspace preference update race
duplicate saved-view create
```

Use optimistic versioning/unique constraints where appropriate.

---

# 13. PERMANENT REGRESSION FIXTURES

## RF-V80-01 — Multi-role internal user

User with Recruiter + Manager permissions sees both valid workspaces.

---

## RF-V80-02 — Workspace switch

Switching workspace changes layout/navigation only, not permissions.

---

## RF-V80-03 — Hidden nav direct URL

User lacking permission receives backend denial.

---

## RF-V80-04 — Saved view malicious filter

Rejected by schema validation.

---

## RF-V80-05 — Board column

No `kanbanStatus` business field is created.

---

## RF-V80-06 — Public profile projection

Internal-only fields never appear.

---

## RF-V80-07 — Slug collision

Only one canonical owner wins; second request receives deterministic conflict.

---

## RF-V80-08 — External user scope

Partner/Client/Worker cannot switch into internal workspace without permission.

---

## RF-V80-09 — Feature flag off

Disabled experience disappears without corrupting data.

---

## RF-V80-10 — Role renamed

Permission-driven navigation continues to work if permission bundle remains equivalent.

---

# 14. MAINTAINABILITY REQUIREMENTS

Mandatory:

```text
no giant workspace-layout.tsx
no navigation conditions duplicated across pages
no generic experience-utils.ts dumping ground
no saved-view filter execution from raw JSON
no board business transitions in UI
```

Suggested layout:

```text
experience-core/
  actor-context/
  workspace-context/
  feature-flags/

navigation/
  navigation-registry.ts
  resolve-navigation.ts

workspace-shell/
  components/
  queries/

saved-views/
  domain/
  application/
  queries/
  infrastructure/

board-foundation/
  contracts/
  registries/

public-profile-foundation/
  domain/
  application/
  queries/
```

---

# 15. V8.0 EXIT GATE

## Actor / Workspace

```text
[ ] ActorContext canonical contract exists
[ ] WorkspaceContext exists
[ ] multi-workspace internal user supported
[ ] switch does not change permissions
```

## Navigation

```text
[ ] navigation registry exists
[ ] permission-driven visibility works
[ ] backend still enforces authorization
```

## Shell

```text
[ ] shared responsive shell
[ ] loading/empty/error conventions
[ ] workspace switcher where applicable
```

## Preferences

```text
[ ] WorkspacePreference works
[ ] SavedView works
[ ] filters validated
[ ] no business truth stored
```

## Board foundation

```text
[ ] BoardDefinition contract
[ ] ColumnDefinition contract
[ ] CardViewDefinition contract
[ ] board action registry
[ ] no duplicate lifecycle authority
```

## Public profile

```text
[ ] slug foundation
[ ] publish state
[ ] public-safe projection
[ ] reserved slug policy
```

## Regression

```text
[ ] RF-V80-01 through RF-V80-10 pass
```

---

# 16. HANDOFF TO V8.1

V8.1 owns actual Recruitment Kanban behavior:

```text
PlacementCase board query
column projection rules
drag/drop command mappings
My Board
Team Board
JobOpening Board
Project Board
Company Pool Board
Start Monitoring Board
card pagination/performance
SLA/bottleneck indicators
```

V8.1 must reuse V8.0 board contracts and V7 canonical commands.

---

# 17. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V80-001 through V80-004

Batch B
V80-010 through V80-013

Batch C
V80-020 through V80-023

Batch D
V80-030 through V80-033

Batch E
V80-040 through V80-043

Batch F
V80-050 through V80-053

Batch G
V80-060 through V80-062
Security / performance

Batch H
RF-V80-01 through RF-V80-10
V8.0 EXIT GATE
```

---

# 18. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
User.currentRole as global experience authority
User.workspaceRole
LaborProfile.kanbanStatus
PlacementCase.workspaceOwnerId
RecruiterProfile.affiliateCode duplicate
```

Do NOT:

```text
hardcode nav by role name
let UI determine business transitions
reuse internal DTOs for public profile
let saved filters bypass authorization
turn BoardDefinition into workflow engine
```

---

# 19. PRODUCT OUTCOME

After V8.0, HRP should have a reusable experience foundation where:

```text
one User can enter the right workspace,
navigation adapts to real permissions,
views can be personalized safely,
Kanban can be built without inventing new statuses,
public microsites can be built on a safe public projection,
and all later V8 phases share the same UX/security foundation.
```
