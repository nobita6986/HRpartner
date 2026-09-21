# HRP V8.4 — WORKSPACE ANALYTICS & PERSONALIZATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V8.4  
**Prerequisite:** V8.3 Exit Gate PASS  
**Depends on:** V8.0 Workspace/Saved View foundation, V8.1 Kanban, V8.2 Microsite, V8.3 Workspaces  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Personalization and workspace-specific analytics without creating new business authority

---

# 0. PURPOSE

V8.4 improves productivity and usability by allowing each user/workspace to personalize views and consume the right operational analytics.

It must support:

```text
Saved Views
Pinned Widgets
Default Landing Page
Default Board
Personal Filters
Recent Items
Notification Preferences
Workspace Analytics
Widget Preferences
User-level display preferences
```

These are experience-layer capabilities.

They are NOT:

```text
new business lifecycle
new KPI authority
new commission authority
new status authority
new performance-review engine
```

---

# 1. NON-NEGOTIABLE INVARIANTS

1. Analytics are projections from canonical V7/V8 facts.
2. Dashboard counts do not become domain state.
3. Saved views cannot expand data scope.
4. Personalization cannot bypass permissions/RLS.
5. Notification preferences control delivery, not whether canonical events exist.
6. User preferences must not alter shared business rules.
7. Default board/view is per-user/per-workspace experience state only.
8. Pinned widgets must come from a registered allow-list.
9. Analytics definitions must be centralized, not duplicated in each page.
10. Metrics with business-sensitive meaning must have one query authority.
11. Performance metrics must not silently become HR evaluation scores.
12. AFF analytics must remain separate from attribution/beneficiary authority.
13. Client/Partner/Worker analytics must be scope-safe.
14. Historical metric definitions should be versioned when materially changed.
15. V8.4 must not introduce a generic arbitrary BI/query builder in v1.

---

# 2. DELIVERY SLICES

```text
V8.4a — Personalization Model
V8.4b — Saved Views Expansion
V8.4c — Widget / Dashboard Preferences
V8.4d — Recent Items & Shortcuts
V8.4e — Notification Preferences
V8.4f — Workspace Analytics
V8.4g — Metric Governance / Security / Hardening
```

---

# 3. V8.4a — PERSONALIZATION MODEL

## V84-001 — WorkspacePreference expansion

**Type:** Schema/experience  
**Priority:** BLOCKER

Conceptual:

```text
userId
workspaceType

defaultLandingRoute?
defaultBoardId?
defaultSavedViewId?

displayDensity?
sidebarCollapsed?
preferredCardView?
preferredPageSize?

createdAt
updatedAt
version
```

No business state.

---

## V84-002 — Preference resolver

**Type:** Application service  
**Priority:** BLOCKER

Resolution order:

```text
user preference
→ workspace default
→ product default
```

Do not make UI components each implement their own fallback logic.

---

## V84-003 — Preference validation

**Type:** Security/application  
**Priority:** HIGH

Reject:

```text
invalid routes
board IDs user cannot access
saved views outside scope
unsupported card modes
```

---

# 4. V8.4b — SAVED VIEWS EXPANSION

## V84-010 — SavedView versioning

**Type:** Schema/application  
**Priority:** HIGH

Add/ensure:

```text
viewType
schemaVersion
filterConfig
sortConfig
layoutConfig
isDefault
```

Old saved views must be migratable or safely rejected with clear UX.

---

## V84-011 — Saved filter catalog

**Type:** Query policy  
**Priority:** BLOCKER

Each view type defines allowed filters.

Example Kanban:

```text
handler
team
job
project
source
availability
location
overdue
handling expiry
case age
```

Example Talent Repository:

```text
availability
relationship
verification
location
source
last activity
```

No arbitrary field querying.

---

## V84-012 — Saved sort catalog

Centralize allowed sorts.

Example:

```text
createdAt
nextActionDueAt
caseAge
stageAge
name
```

---

## V84-013 — Shared/team saved views

**Type:** Deferred-by-default feature  
**Priority:** MEDIUM

Initial recommendation:

```text
personal views first
```

Shared views may be enabled later with:

```text
owner
scope
edit permission
versioning
```

Do not make team-shared views editable by everyone by default.

---

# 5. V8.4c — WIDGET / DASHBOARD PREFERENCES

## V84-020 — WidgetRegistry

**Type:** Experience config  
**Priority:** BLOCKER

Conceptual:

```text
widgetId
title
workspaceTypes
requiredPermissions
queryKey
sizeOptions
defaultPlacement
featureFlag?
```

---

## V84-021 — UserWidgetPreference schema

**Type:** Schema/experience  
**Priority:** HIGH

Conceptual:

```text
userId
workspaceType
widgetId
visible
position
size
configuration?
```

Only validated widget configuration allowed.

---

## V84-022 — Pin / unpin / reorder widgets

Commands:

```text
pinWidget()
unpinWidget()
reorderWidgets()
resizeWidget()
```

No business side effects.

---

## V84-023 — Workspace default widgets

Product/manager defaults may exist, but user overrides are personal only unless explicitly governed.

---

# 6. V8.4d — RECENT ITEMS & SHORTCUTS

## V84-030 — RecentItem model/projection

**Type:** Experience  
**Priority:** HIGH

Possible tracked entities:

```text
LaborProfile
PlacementCase
JobOpening
Project
ClientCompany
SupplyPartner
Worker
```

Store only references the user actually accessed.

---

## V84-031 — Recent item privacy

Do not surface an item after the user loses access.

Resolver must re-check permission/scope at display time.

---

## V84-032 — Favorites / shortcuts

Optional:

```text
pin profile
pin case
pin job
pin project
pin client
```

Favorites do not imply ownership.

---

# 7. V8.4e — NOTIFICATION PREFERENCES

## V84-040 — NotificationPreference schema

**Type:** Schema/experience  
**Priority:** BLOCKER

Conceptual:

```text
userId
workspaceType?
eventType
channel
enabled
digestMode?
quietHours?
```

Channels may include:

```text
IN_APP
EMAIL
PUSH
```

depending on available infrastructure.

---

## V84-041 — Notification event catalog

Initial candidates:

```text
NEXT_ACTION_DUE
HANDLING_EXPIRING
CASE_ASSIGNED
CANDIDATE_REPLIED
PLACEMENT_START_DUE
CLIENT_CONFIRMATION_REQUESTED
PARTNER_DISPUTE_UPDATED
DOCUMENT_REQUESTED
```

Catalog is centralized.

---

## V84-042 — Mandatory notifications

Some compliance/security/critical operational alerts may not be fully suppressible.

Policy must be explicit.

---

## V84-043 — Digest preferences

Optional modes:

```text
IMMEDIATE
DAILY_DIGEST
WEEKLY_DIGEST
OFF
```

Not every event type must support every mode.

---

# 8. V8.4f — WORKSPACE ANALYTICS

## V84-050 — MetricDefinition catalog

**Type:** Analytics governance  
**Priority:** BLOCKER

Conceptual:

```text
metricKey
displayName
workspaceTypes
queryAuthority
definition
unit
scopeRules
version
```

Avoid duplicate definitions across dashboards.

---

## V84-051 — Recruiter analytics

Possible:

```text
active cases
cases contacted
applications handled
job proposals
effective placements
overdue actions
start success
```

No automatic employee rating.

---

## V84-052 — Manager analytics

Possible:

```text
team active cases
Company Pool aging
cases per recruiter
overdue ratio
stage bottleneck
JobOpening fulfillment
ready-to-start count
```

---

## V84-053 — CTV analytics

Safe projections:

```text
submitted
new/matched
in progress
effective placements
AFF funnel when available
```

No other partner data.

---

## V84-054 — Vendor analytics

Safe projections:

```text
batch count
rows submitted
new/matched
processing errors
effective placements
```

---

## V84-055 — Worker analytics / summary

Keep simple:

```text
applications
job proposals
current employment summary
assignment history count
```

Do not gamify sensitive employment data.

---

## V84-056 — Client analytics

Possible:

```text
requested headcount
open demand
effective placements
fulfillment
pending confirmations
current HRP-managed workforce summary
```

No internal recruiter/partner diagnostics unless explicitly exposed.

---

## V84-057 — Microsite analytics mount

Consume V8.2 analytics:

```text
page views
job views
CTA clicks
applications
effective placements
```

Traffic remains distinct from AFF attribution.

---

# 9. V8.4g — METRIC GOVERNANCE / SECURITY / HARDENING

## V84-060 — Metric time window standards

Standard ranges:

```text
TODAY
7_DAYS
30_DAYS
90_DAYS
CUSTOM_ALLOWED
```

Use centralized date/window handling.

---

## V84-061 — Metric scope enforcement

Metric query must enforce:

```text
self
team
partner
client
worker-self
```

according to workspace.

Frontend filters cannot broaden scope.

---

## V84-062 — Metric definition versioning

If a metric materially changes definition:

```text
increment version
document effective date
avoid silently comparing incompatible periods
```

---

## V84-063 — Analytics cache policy

Use cache/materialized projection only where safe.

Cache key must include:

```text
metric
scope
filters
time window
permission-relevant context
```

---

## V84-064 — Export policy

If analytics export is enabled:

```text
scope-safe
PII minimized
audit export
row limits
```

---

# 10. SECURITY REQUIREMENTS

Suggested capabilities:

```text
workspace.preference.manage_self
saved_view.manage_self
widget.preference.manage_self
recent_item.read_self
favorite.manage_self
notification.preference.manage_self

analytics.recruiter.read_self
analytics.manager.read_team
analytics.partner.read_self
analytics.worker.read_self
analytics.client.read_self
```

Metrics do not bypass domain permissions.

---

# 11. PERFORMANCE REQUIREMENTS

Analytics must avoid:

```text
N+1 queries
full-table scans for every dashboard load
recomputing heavy aggregates on every render
```

Use:

```text
canonical query services
indexed aggregates
materialized/read models where justified
incremental cache
```

But do not introduce premature data warehouse complexity.

---

# 12. CONCURRENCY / IDEMPOTENCY

Protect:

```text
two-tab preference update
widget reorder race
saved-view update race
notification preference race
```

Use versioning or last-write policy intentionally.

---

# 13. PERMANENT REGRESSION FIXTURES

## RF-V84-01 — Saved view scope

User cannot create a view that exposes unauthorized team/client data.

---

## RF-V84-02 — Default board revoked

If access is later removed, preference falls back safely.

---

## RF-V84-03 — Recent item access revoked

Item disappears from recent list.

---

## RF-V84-04 — Widget permission revoked

Widget no longer renders.

---

## RF-V84-05 — Recruiter metrics

Only self-scope when team permission absent.

---

## RF-V84-06 — Manager metrics

Team scope enforced.

---

## RF-V84-07 — CTV analytics

CTV A cannot infer CTV B counts.

---

## RF-V84-08 — Client analytics

Client A cannot infer Client B demand/workforce.

---

## RF-V84-09 — Notification disabled

Canonical event still exists; only delivery preference changes.

---

## RF-V84-10 — Metric definition change

Historical dashboard clearly tracks metric version/effective definition.

---

## RF-V84-11 — AFF analytics

Traffic event does not become attribution/beneficiary fact.

---

## RF-V84-12 — Malicious saved filter

Rejected before query execution.

---

# 14. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
analytics-service.ts with every metric
dashboard-utils.ts
preference-service.ts handling unrelated concerns
workspace-specific copied SQL
```

Suggested split:

```text
personalization/
  preferences/
  saved-views/
  widgets/
  recent-items/
  favorites/

notifications/
  preferences/
  catalog/

analytics/
  metric-registry/
  recruiter/
  manager/
  partner/
  worker/
  client/
  microsite/
```

Centralize:

```text
metric definitions
time-window handling
scope resolution
saved-filter schema
widget registry
notification event catalog
```

---

# 15. V8.4 EXIT GATE

## Preferences

```text
[ ] default landing/board works
[ ] invalid preference falls back safely
```

## Saved Views

```text
[ ] filter/sort schema validated
[ ] no scope bypass
[ ] version handling works
```

## Widgets

```text
[ ] registry
[ ] pin/unpin/reorder
[ ] permission-sensitive rendering
```

## Recent / Favorites

```text
[ ] access rechecked
[ ] no ownership implication
```

## Notifications

```text
[ ] preferences
[ ] event catalog
[ ] mandatory-event policy
```

## Analytics

```text
[ ] centralized metric definitions
[ ] Recruiter
[ ] Manager
[ ] CTV
[ ] Vendor
[ ] Worker
[ ] Client
[ ] Microsite
[ ] scope-safe
```

## Regression

```text
[ ] RF-V84-01 through RF-V84-12 pass
```

---

# 16. HANDOFF TO V8.5

V8.5 owns experience hardening:

```text
mobile
accessibility
keyboard support
Kanban performance
deep links
notification center polish
workspace switching UX
cross-workspace consistency
performance observability
```

---

# 17. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V84-001 through V84-003

Batch B
V84-010 through V84-013

Batch C
V84-020 through V84-023

Batch D
V84-030 through V84-032

Batch E
V84-040 through V84-043

Batch F
V84-050 through V84-057

Batch G
V84-060 through V84-064
Security/performance

Batch H
RF-V84-01 through RF-V84-12
V8.4 EXIT GATE
```

---

# 18. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
User.performanceScore as dashboard shortcut
PlacementCase.analyticsStatus
Partner.analyticsOwner
Client.analyticsStatus
```

Do NOT:

```text
let saved filters widen scope
derive HR evaluation automatically from recruiter metrics
use dashboard cache as canonical state
duplicate metric SQL across workspaces
treat microsite traffic as affiliate entitlement
```

---

# 19. PRODUCT OUTCOME

After V8.4, each user should be able to shape HRP around how they work:

```text
Tôi muốn mở board nào mặc định?
Tôi muốn lưu bộ lọc nào?
Widget nào quan trọng với tôi?
Việc gần đây của tôi là gì?
Tôi muốn nhận thông báo nào?
Các chỉ số nào có ý nghĩa với workspace của tôi?
```

while every metric, alert, and preference remains subordinate to canonical HRP business facts.
