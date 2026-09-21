# HRP V8.5 — EXPERIENCE HARDENING IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V8.5  
**Prerequisite:** V8.4 Exit Gate PASS  
**Depends on:** V8.0–V8.4  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Harden V8 UX, performance, accessibility, navigation, notifications, and operational reliability

---

# 0. PURPOSE

V8.5 makes the V8 experience production-grade.

It focuses on:

```text
responsive/mobile UX
accessibility
keyboard operation
Kanban performance
deep links
notification center
workspace switching UX
cross-workspace consistency
frontend reliability
experience observability
```

V8.5 must not become a new business-domain phase.

---

# 1. NON-NEGOTIABLE INVARIANTS

1. Hardening must not alter canonical V7 business semantics.
2. Mobile UX must call the same canonical commands as desktop.
3. Accessibility must be treated as a product requirement, not polish.
4. Keyboard alternatives must exist for critical drag/drop operations.
5. Deep links must preserve authorization boundaries.
6. Notification center is a delivery/read experience, not event authority.
7. Workspace switching must never elevate privileges.
8. Performance optimizations must not cache stale authorization.
9. Optimistic UI must reconcile against server truth.
10. Error states must be actionable and consistent.
11. Public and external workspaces must remain scope-safe under mobile/deep-link flows.
12. Frontend telemetry must not expose PII.
13. UI consistency must come from shared design primitives, not page copy/paste.
14. No V8.5 task should justify giant refactors without explicit need.

---

# 2. DELIVERY SLICES

```text
V8.5a — Responsive / Mobile
V8.5b — Accessibility
V8.5c — Keyboard & Non-drag Operations
V8.5d — Kanban Performance
V8.5e — Notification Center
V8.5f — Deep Links & Workspace Switching
V8.5g — Cross-workspace Design Consistency
V8.5h — Frontend Reliability / Observability
```

---

# 3. V8.5a — RESPONSIVE / MOBILE

## V85-001 — Responsive workspace shell

**Type:** UI architecture  
**Priority:** BLOCKER

Support:

```text
desktop sidebar
tablet collapsed navigation
mobile drawer/bottom navigation where appropriate
responsive top bar
safe content widths
sticky primary actions
```

Do not build separate mobile business logic.

---

## V85-002 — Mobile Kanban strategy

**Type:** UX  
**Priority:** BLOCKER

Desktop Kanban may use horizontal columns.

Mobile alternatives may include:

```text
column tabs
stage selector
stacked cards
single-column focus
```

Business actions remain the same.

---

## V85-003 — Mobile card action sheet

Card quick actions should be reachable without hover.

Examples:

```text
record interaction
create NextAction
claim/transfer
open Case 360
move stage/action
```

---

## V85-004 — Mobile public microsite

Recruiter microsite must optimize for:

```text
fast load
clear CTA
tap-to-call
Zalo/social links
job cards
safe forms
```

---

# 4. V8.5b — ACCESSIBILITY

## V85-010 — Accessibility baseline

**Type:** Quality  
**Priority:** BLOCKER

Target practical WCAG-compatible behavior for:

```text
keyboard navigation
screen-reader labels
focus order
contrast
form errors
semantic headings
dialog focus trapping
```

---

## V85-011 — Accessible Kanban

Kanban must provide:

```text
column/card labels
status announcements
keyboard move alternative
focus preservation after action
```

Drag/drop cannot be the only operation path.

---

## V85-012 — Accessible forms

Applies to:

```text
Microsite forms
Workspace filters
Saved Views
Public Profile editor
Partner batch controls
Worker self-service
Client confirmation
```

Errors must associate with fields.

---

## V85-013 — Accessibility regression tests

Automated checks plus manual critical-path tests.

Do not claim accessibility completion from automated scanner alone.

---

# 5. V8.5c — KEYBOARD & NON-DRAG OPERATIONS

## V85-020 — Move card action menu

**Type:** UX/application  
**Priority:** BLOCKER

Every drag transition must have an equivalent action flow:

```text
Move to...
→ choose target/action
→ preflight
→ required input
→ canonical command
```

---

## V85-021 — Keyboard shortcuts

Optional safe shortcuts:

```text
focus search
open command menu
next/previous card
open card
complete NextAction
```

Avoid shortcuts that execute irreversible actions without confirmation.

---

## V85-022 — Command palette

Potential internal-user feature:

```text
Open profile
Open case
Open job
Open project
Go to workspace
```

Permission-filtered.

---

# 6. V8.5d — KANBAN PERFORMANCE

## V85-030 — Large board performance budget

Set measurable targets for:

```text
initial board shell
first visible columns
card render
drag response
column pagination
filter application
```

Exact thresholds should be measured on realistic data.

---

## V85-031 — Column virtualization/pagination hardening

Ensure:

```text
stable card keys
cursor-safe load-more
no duplicate cards
no lost cards after refresh
```

---

## V85-032 — Query invalidation strategy

Centralize invalidation after:

```text
case transition
handling transfer
NextAction change
Placement change
interaction recorded
```

Do not full-reload every board unnecessarily.

---

## V85-033 — Stale state reconciliation

If optimistic state diverges:

```text
server wins
card refreshes
user gets actionable explanation
```

---

## V85-034 — Board memory usage

Avoid retaining all historical cards in browser state indefinitely.

---

# 7. V8.5e — NOTIFICATION CENTER

## V85-040 — Notification center read model

**Type:** Experience/read DTO  
**Priority:** BLOCKER

Conceptual:

```text
notificationId
eventType
title
summary
workspaceContext
resourceRef?
createdAt
readAt?
priority
actionKey?
```

---

## V85-041 — Notification inbox

Capabilities:

```text
unread/read
filter by workspace/type
mark read
mark all read
open target
```

---

## V85-042 — Notification deep links

Link should resolve through permission/scope.

If target no longer accessible:

```text
show safe unavailable state
```

Do not leak resource details.

---

## V85-043 — Notification deduplication

Avoid repeated notifications for the same event/retry.

Use canonical event/correlation identifiers.

---

## V85-044 — Notification preference integration

Consume V8.4 preferences.

Preference controls delivery, not event creation.

---

# 8. V8.5f — DEEP LINKS & WORKSPACE SWITCHING

## V85-050 — Canonical deep-link format

Define stable route patterns for:

```text
LaborProfile
PlacementCase
JobOpening
Project
Worker
ClientCompany
SupplyPartner
dispute/case
```

Avoid links tied to transient UI state only.

---

## V85-051 — Workspace-aware deep-link resolver

Flow:

```text
target resource
→ current workspace
→ access check
→ current workspace route if valid
→ suggest permitted workspace switch
→ deny if no access
```

---

## V85-052 — Switch return path

When user switches workspace to follow a resource:

```text
preserve intended destination
```

when safe.

---

## V85-053 — External-link isolation

Partner/Client/Worker links must not accidentally resolve into internal routes.

---

# 9. V8.5g — CROSS-WORKSPACE DESIGN CONSISTENCY

## V85-060 — Shared design primitives

Standardize:

```text
page header
section header
stat card
empty state
error state
filter bar
table/list
card
badge
action menu
dialog
drawer
toast
```

---

## V85-061 — Status/badge presentation catalog

Centralize display labels/colors/icons for experience.

Do not redefine labels independently per workspace.

Canonical state definitions remain domain-owned.

---

## V85-062 — Date/time formatting

Centralized timezone/locale presentation.

Avoid inconsistent relative-date handling.

---

## V85-063 — Loading/skeleton policy

Use predictable loading behavior.

Avoid layout jumps and misleading fake data.

---

## V85-064 — Error taxonomy

Map known errors into:

```text
permission denied
validation
conflict
stale state
dependency unavailable
network/retryable
not found
```

User messages should be actionable.

---

# 10. V8.5h — FRONTEND RELIABILITY / OBSERVABILITY

## V85-070 — Frontend error boundary strategy

Segment errors by:

```text
workspace shell
page
widget
public microsite
Kanban column/card
```

One broken widget should not always crash whole workspace.

---

## V85-071 — Experience telemetry

Track safe metrics:

```text
page_load
workspace_load
board_load
board_action_success/failure
public_page_load
notification_open
client_error
```

No sensitive PII in telemetry.

---

## V85-072 — Performance telemetry

Track:

```text
LCP/interaction timing
board initial load
filter latency
column pagination latency
public microsite latency
```

---

## V85-073 — Dependency health UX

If AFF/Omnichannel/AI service dependency is unavailable:

```text
show degraded state
preserve unrelated workflow
```

---

## V85-074 — Retry UX

Retry only safe/idempotent operations automatically.

Critical commands require command-level idempotency.

---

# 11. OFFLINE / NETWORK FAILURE BEHAVIOR

V8.5 does not need full offline mode.

But it should handle:

```text
network interruption
request timeout
stale browser tab
provider dependency outage
```

without ambiguous success.

Never show a critical mutation as successful until canonical server confirmation exists.

---

# 12. SECURITY HARDENING

Review:

```text
workspace route guards
public cache invalidation
CSRF/session patterns
XSS/content renderer
open redirect
deep-link resource enumeration
external DTO leakage
frontend log/telemetry PII
```

---

# 13. PERMANENT REGRESSION FIXTURES

## RF-V85-01 — Mobile Kanban

Recruiter can perform stage/action transition without desktop drag.

---

## RF-V85-02 — Keyboard Kanban

Card can be moved through accessible action menu.

---

## RF-V85-03 — Invalid keyboard move

Same canonical rejection as drag/drop.

---

## RF-V85-04 — Notification deep link

Permission checked before target content appears.

---

## RF-V85-05 — Lost access after notification

Notification does not leak inaccessible resource data.

---

## RF-V85-06 — Workspace switch deep link

Allowed switch preserves target; no permission elevation.

---

## RF-V85-07 — Partner deep link

Cannot escape Partner scope into internal resource.

---

## RF-V85-08 — Large Kanban

Column pagination/virtualization remains stable under realistic large dataset.

---

## RF-V85-09 — Optimistic conflict

Server truth restores card correctly.

---

## RF-V85-10 — One widget fails

Workspace shell/other widgets continue where safe.

---

## RF-V85-11 — AFF dependency unavailable

Microsite/workspace non-AFF capabilities remain usable.

---

## RF-V85-12 — Public profile suspension

Cached public route stops serving suspended content within defined invalidation policy.

---

## RF-V85-13 — Accessibility critical path

Recruiter can operate Today → Kanban → Case → NextAction using keyboard.

---

## RF-V85-14 — Telemetry privacy

No phone/email/token/internal notes in frontend analytics payload.

---

# 14. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
ui-utils.ts with all presentation logic
mobile-only business services
notification-service.ts mixing event generation + delivery + UI
mega design-system component with role conditions
```

Suggested split:

```text
experience-hardening/
  accessibility/
  responsive/
  keyboard/
  deep-links/
  telemetry/

notifications-ui/
  queries/
  components/
  preferences-adapter/

design-system/
  primitives/
  patterns/
  status-presentation/
```

Business event generation remains in canonical domains.

---

# 15. V8.5 EXIT GATE

## Responsive

```text
[ ] internal workspaces responsive
[ ] Kanban usable mobile
[ ] microsite mobile optimized
```

## Accessibility

```text
[ ] keyboard critical paths
[ ] accessible Kanban alternative
[ ] form/dialog focus/error handling
```

## Performance

```text
[ ] large board tested
[ ] column pagination stable
[ ] optimistic reconciliation stable
```

## Notifications

```text
[ ] inbox/read model
[ ] preferences integration
[ ] secure deep links
[ ] dedupe
```

## Deep Links

```text
[ ] canonical routes
[ ] workspace-aware resolver
[ ] external/internal isolation
```

## Consistency

```text
[ ] shared primitives
[ ] status presentation catalog
[ ] date/time standards
[ ] error taxonomy
```

## Reliability

```text
[ ] error boundaries
[ ] safe telemetry
[ ] degraded dependency states
```

## Regression

```text
[ ] RF-V85-01 through RF-V85-14 pass
```

---

# 16. V8 COMPLETE GATE

V8 is considered architecture-complete when:

```text
V8.0 PASS
V8.1 PASS
V8.2 PASS
V8.3 PASS
V8.4 PASS
V8.5 PASS
```

and:

```text
V7 remains canonical
AFF is not duplicated
workspace scopes remain safe
Kanban uses canonical commands
microsite uses canonical jobs/apply/AFF
external portals use safe projections
analytics remains non-authoritative
UX works across desktop/mobile/accessibility paths
```

---

# 17. HANDOFF TO MICRO-STEP PLANNING

After V8.5 architecture/backlog is accepted, the next artifact should be:

```text
V8_MICRO_STEP_EXECUTION_PLAN.md
```

The micro-step plan should:

```text
start from repository/codebase discovery
map existing V7/V6/AFF capabilities
split V8.0–V8.5 into small implementation units
define dependency graph
define file/module targets
define test/evidence per micro-step
define stop conditions
avoid giant tasks
avoid speculative refactors
```

---

# 18. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V85-001 through V85-004

Batch B
V85-010 through V85-013

Batch C
V85-020 through V85-022

Batch D
V85-030 through V85-034

Batch E
V85-040 through V85-044

Batch F
V85-050 through V85-053

Batch G
V85-060 through V85-064

Batch H
V85-070 through V85-074
Security hardening

Batch I
RF-V85-01 through RF-V85-14
V8.5 EXIT GATE
V8 COMPLETE GATE
```

---

# 19. ARCHITECTURAL WARNINGS

Do NOT:

```text
create separate mobile domain logic
use drag/drop as the only transition UX
cache authorization indefinitely
make notification UI the event source
hardcode external/internal deep-link routing
copy status label maps into each workspace
log PII in frontend telemetry
```

---

# 20. PRODUCT OUTCOME

After V8.5, HRP should not only have the right V8 features—it should feel coherent and reliable:

```text
usable on desktop and mobile
operable by keyboard
clear under errors/conflicts
fast on large boards
consistent across workspaces
safe when deep-linking
useful through notifications
resilient when dependencies fail
observable without leaking PII
```

This closes the V8 experience architecture before micro-step execution planning begins.
