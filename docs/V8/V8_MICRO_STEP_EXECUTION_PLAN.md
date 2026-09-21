# HRP V8 — MICRO-STEP EXECUTION PLAN

**Status:** Execution planning baseline  
**Applies to:** V8.0–V8.5  
**Depends on:** `V8_MASTER_PLAN.md`, all V8 phase backlogs, V7 master/index docs, Universal Affiliate authority  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Execution principle:** Small, independently reviewable, evidence-backed implementation steps

---

# 0. PURPOSE

This document converts the V8 phase backlogs into an execution sequence suitable for AI coding agents.

The goal is to avoid tasks such as:

```text
Build Kanban
Build Recruiter Portal
Build Worker Portal
Build V8
```

Instead, V8 should be implemented as a chain of micro-steps where each step:

```text
has one narrow goal
touches a small module surface
has explicit prerequisites
has explicit evidence/tests
has a stop condition
does not silently expand scope
does not perform unrelated refactors
```

---

# 1. EXECUTION RULES

Every micro-step MUST:

1. Read `HRP_V6_PLUS_V7_MASTER_INDEX.md`.
2. Read `AI_CODING_GUARDRAILS.md`.
3. Read the relevant V8 phase backlog.
4. Inspect current repository reality before editing.
5. Confirm whether required V7/AFF capability actually exists.
6. Use canonical commands/queries where available.
7. Avoid introducing temporary shortcuts that become permanent authority.
8. Keep source files within guardrails.
9. Add or update tests in the same micro-step where practical.
10. Report deviations/blockers explicitly.

---

# 2. MICRO-STEP CONTRACT TEMPLATE

Every implementation task should contain:

```text
Micro-step ID
Phase
Goal
Why now
Prerequisites
Repository evidence required
Expected files/modules
Schema impact
Command/query impact
Permission/RLS impact
Tests/evidence
Stop conditions
Non-goals
Definition of Done
```

---

# 3. STOP CONDITIONS

AI coding MUST stop the micro-step if:

```text
required canonical V7 command does not exist
required schema differs materially from the plan
AFF capability is assumed but not actually implemented
permission/RLS model cannot support the step safely
migration order conflicts with existing migration chain
implementation would require a large unrelated refactor
business decision remains genuinely unresolved
```

On stop:

```text
do not invent authority
do not patch around canonical gaps
report exact blocker
identify next required decision/task
```

---

# 4. DISCOVERY GATE — BEFORE V8.0

## MS-V8-D00 — Repository structure inventory

**Goal:** Map current implementation structure relevant to V8.

Inspect:

```text
app/
src/
domains/
components/
auth/
permissions/
RLS helpers
workspace/layout structure
JobPosting/public job routes
Talent Workbench
PlacementCase
Handling
Placement
Partner portal
Worker/client routes if any
```

**Evidence:**

```text
module map
actual paths
existing shared UI/layout patterns
```

**Stop if:** repo architecture differs enough that planned module placement is invalid.

---

## MS-V8-D01 — V7 capability verification

Verify actual existence/current names of:

```text
PlacementCase
InteractionOutcome
NextAction
HandlingAssignment
Company Pool query
JobProposal
Placement commands
Worker / EmploymentEpisode / ProjectAssignment
SupplyPartner
Client CRM
permissions
RLS
```

**Do not implement V8 assumptions that are absent.**

---

## MS-V8-D02 — AFF implementation reality check

Verify against actual code:

```text
User.affCode
shared AFF API?
/r/:code?
ReferralAttribution?
public apply integration?
generic referrer?
generic beneficiary?
AFF analytics?
```

Classify each:

```text
IMPLEMENTED
PARTIAL
NOT_IMPLEMENTED
LEGACY_ONLY
```

V8.2 AFF-dependent micro-steps remain blocked where capability is absent.

---

## MS-V8-D03 — Existing UI/design-system inventory

Inspect:

```text
layout primitives
sidebar
top nav
cards
tables
dialogs
drawers
toasts
form components
responsive primitives
```

Reuse before adding new design primitives.

---

## MS-V8-D04 — Baseline tests/build

Run existing:

```text
typecheck
lint
unit tests
relevant integration tests
build
```

Record pre-existing failures separately.

Do not attribute baseline failures to V8.

---

# 5. V8.0 — EXPERIENCE FOUNDATION MICRO-STEPS

## MS-V80-001 — Define ActorContext type

Create minimal type/contracts only.

No UI.

**Done when:**

```text
actor types represented
permission collection represented
scope descriptor represented
tests/type coverage pass
```

---

## MS-V80-002 — Build ActorContext resolver

Read from existing auth/session/permission infrastructure.

Do not duplicate authentication.

**Test:**

```text
internal user
partner user
client user
worker user
```

where current system supports them.

---

## MS-V80-003 — Define WorkspaceType catalog

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

One authority module.

---

## MS-V80-004 — Define WorkspaceRegistry contract

Add:

```text
displayName
requiredCapabilities
defaultRoute
navigationRegistryKey
```

No role switch logic yet.

---

## MS-V80-005 — Implement workspace availability resolver

Input ActorContext → allowed workspace list.

**Regression:**

One user with recruiter + manager permissions receives both.

---

## MS-V80-006 — Add workspace context selector

Server/application layer first.

No visual switcher yet.

---

## MS-V80-007 — Define NavigationItem contract

Include:

```text
id
label
route
group
requiredPermissions
workspaceTypes
featureFlag?
```

---

## MS-V80-008 — Build navigation registry

Start only with existing routes/capabilities.

Do not create placeholder routes that imply implemented features.

---

## MS-V80-009 — Build navigation visibility resolver

Test:

```text
same workspace
different permissions
feature flag off
```

---

## MS-V80-010 — Add shared WorkspaceShell skeleton

Implement only:

```text
sidebar slot
topbar slot
content slot
user menu slot
```

Keep component small.

---

## MS-V80-011 — Mount permission-resolved navigation

No workspace-specific custom pages yet.

---

## MS-V80-012 — Add workspace switcher UI

Only render workspaces returned by resolver.

Switch changes experience context only.

---

## MS-V80-013 — Add standard loading/empty/error primitives

Create reusable patterns.

Avoid business-specific messages in primitives.

---

## MS-V80-014 — Add WorkspacePreference schema

Only if no equivalent exists.

Additive migration.

Fields minimal.

---

## MS-V80-015 — Add WorkspacePreference repository/service

Self-scope only.

---

## MS-V80-016 — Add SavedView schema

Additive migration.

Store validated JSON/config only.

---

## MS-V80-017 — Add SavedView validation contract

Define per-view whitelist framework.

Do not enable arbitrary field filtering.

---

## MS-V80-018 — Add SavedView CRUD self-service

Commands:

```text
create
rename
update
delete
set default
```

---

## MS-V80-019 — Define BoardDefinition contract

Config/type only.

No Kanban query implementation yet.

---

## MS-V80-020 — Define ColumnDefinition contract

Ensure no business status persistence.

---

## MS-V80-021 — Define CardViewDefinition contract

Variants:

```text
COMPACT
STANDARD
OPERATIONAL
```

---

## MS-V80-022 — Define BoardActionRegistry contract

Action key → canonical command adapter.

No actions registered until V8.1.

---

## MS-V80-023 — Implement public slug policy

Centralize:

```text
normalize
reserved words
validation
collision behavior
```

---

## MS-V80-024 — Add public profile visibility foundation

Only generic foundation if architecture supports it.

Do not build Recruiter profile content yet.

---

## MS-V80-025 — Add V8.0 feature flags

Only flags actually needed for rollout.

---

## MS-V80-026 — Add V8.0 regression suite

Cover:

```text
multi-workspace
switch no privilege change
hidden route backend deny
saved filter validation
slug collision
external workspace isolation
```

---

## MS-V80-GATE — V8.0 Exit Gate

Do not continue to V8.1 canonical implementation until V8.0 exit criteria pass.

---

# 6. V8.1 — RECRUITMENT KANBAN MICRO-STEPS

## MS-V81-001 — Verify PlacementCase query authority

Identify canonical query/service for:

```text
case
LaborProfile display
current handler
NextAction
Placement
Job context
```

Stop if UI would need raw duplicated joins across many modules.

---

## MS-V81-002 — Define KanbanCardReadModel DTO

Type only.

---

## MS-V81-003 — Define KanbanBoardReadModel DTO

Include:

```text
columns
count
cards
nextCursor
```

---

## MS-V81-004 — Implement card projection query

Start with minimal fields:

```text
caseId
profile
stage
handler
nextAction
job context
```

---

## MS-V81-005 — Add warning flag resolver

Start:

```text
OVERDUE_NEXT_ACTION
HANDLING_EXPIRING
READY_TO_START
```

Central policy only.

---

## MS-V81-006 — Add default board definition

Map V7 facts to:

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

No `kanbanStatus`.

---

## MS-V81-007 — Implement one column query

Start `NEW`.

Prove:

```text
filter
pagination
count
```

before implementing all columns.

---

## MS-V81-008 — Generalize column query pipeline

Reuse projection/query logic.

Avoid copy/paste SQL per column.

---

## MS-V81-009 — Implement remaining default columns

Incrementally.

Test each mapping.

---

## MS-V81-010 — Build board shell UI

Columns + card placeholders.

No drag yet.

---

## MS-V81-011 — Build Compact card

Minimal fields only.

---

## MS-V81-012 — Build Standard card

Add operational context.

---

## MS-V81-013 — Add column pagination

Must work before large board pilot.

---

## MS-V81-014 — Add board filters

Start:

```text
handler
job
project
overdue
```

Then expand.

---

## MS-V81-015 — Add board search

Safe fields only.

---

## MS-V81-016 — Register simple action NEW → CONTACTING

Use existing canonical command.

If command absent, stop and report V7 gap.

---

## MS-V81-017 — Add action preflight contract

Return:

```text
allowed
blocked
requiresInput
reason
```

---

## MS-V81-018 — Add drag/drop for one safe transition

Use optimistic UI + server reconciliation.

---

## MS-V81-019 — Add non-drag move action

Needed for accessibility from the start.

---

## MS-V81-020 — Add remaining safe case-stage transitions

One action mapping at a time.

---

## MS-V81-021 — Add transition requiring input modal

Example planned start date.

---

## MS-V81-022 — Integrate Placement transition

`CONFIRMED/READY_TO_START → EFFECTIVE`

Must call canonical Placement command.

Stop if this would patch stage directly.

---

## MS-V81-023 — Implement My Recruitment Board

Scope by current valid HandlingAssignment.

---

## MS-V81-024 — Implement Team Board

Requires team scope resolver.

---

## MS-V81-025 — Implement JobOpening Board

Do not fabricate Application.

---

## MS-V81-026 — Implement Project Board

Aggregate authorized JobOpenings.

---

## MS-V81-027 — Implement Company Pool Board

Canonical condition:

```text
active PlacementCase
+
no valid active HandlingAssignment
```

---

## MS-V81-028 — Add Company Pool claim action

Concurrency-safe.

---

## MS-V81-029 — Implement Start Monitoring Board

Placement-based projection.

---

## MS-V81-030 — Add quick Interaction action

Record through canonical command.

---

## MS-V81-031 — Add quick NextAction action

Create/complete/reschedule.

---

## MS-V81-032 — Add Handling quick actions

Claim/assign/transfer/release.

---

## MS-V81-033 — Add Case 360 deep link

---

## MS-V81-034 — Add board summary metrics

```text
total
overdue
handling expiring
ready to start
```

---

## MS-V81-035 — Add stage-age/bottleneck metric

Only if canonical transition timestamps exist.

Otherwise record limitation.

---

## MS-V81-036 — Add stale-card version handling

---

## MS-V81-037 — Add optimistic reconciliation tests

---

## MS-V81-038 — Add large-board performance test

Realistic fixture size.

---

## MS-V81-GATE — V8.1 Exit Gate

---

# 7. V8.2 — RECRUITER MICROSITE MICRO-STEPS

## MS-V82-001 — Verify AFF dependency matrix

Before implementation, produce matrix:

```text
self link
job destination link
click capture
public apply attribution
analytics
```

Each marked available/not available.

---

## MS-V82-002 — Add RecruiterPublicProfile schema

Additive and minimal.

---

## MS-V82-003 — Add profile self-management commands

```text
create draft
update public fields
publish
unpublish
```

---

## MS-V82-004 — Add public profile safe DTO

Allow-list fields.

---

## MS-V82-005 — Add public profile route by slug

Only published profiles.

---

## MS-V82-006 — Add avatar/cover support using existing media mechanism

Do not invent new file infrastructure if reusable one exists.

---

## MS-V82-007 — Add PublicSocialLink model/commands

Validate platform/URL.

---

## MS-V82-008 — Add RecruiterFeaturedJob schema

Reference canonical JobPosting.

---

## MS-V82-009 — Add feature/unfeature job commands

---

## MS-V82-010 — Add featured job public projection

Read current canonical JobPosting facts.

---

## MS-V82-011 — Handle closed/unpublished JobPosting

Hide or disable CTA according to product rule.

---

## MS-V82-012 — Add RecruiterPost schema

Structured blocks only.

---

## MS-V82-013 — Define content block schema

Start small:

```text
HEADING
PARAGRAPH
IMAGE
VIDEO_LINK
JOB_REFERENCE
CTA
```

---

## MS-V82-014 — Add draft post editor backend commands

---

## MS-V82-015 — Add safe renderer

Same renderer for preview/public.

---

## MS-V82-016 — Add publish/unpublish commands

---

## MS-V82-017 — Add Microsite home composition query

Profile + featured jobs + recent posts.

---

## MS-V82-018 — Add public microsite page

Mobile-first enough for pilot.

---

## MS-V82-019 — Add APPLY_JOB CTA

Route to canonical public application.

---

## MS-V82-020 — Add general-interest CTA

Route to canonical intake/create-or-match.

Do not create fake Application.

---

## MS-V82-021 — Add AFF capability adapter

Only wrap capabilities actually implemented.

---

## MS-V82-022 — Add affiliate destination on featured Job

Only if AFF capability is available.

Feature-flag otherwise.

---

## MS-V82-023 — Add AFF-unavailable degraded behavior

Microsite remains functional.

---

## MS-V82-024 — Add microsite traffic event schema/stream if needed

Only analytics.

No source authority.

---

## MS-V82-025 — Add basic analytics aggregation

```text
page views
job views
CTA clicks
```

---

## MS-V82-026 — Add downstream canonical metrics

Applications / effective placements using canonical facts.

---

## MS-V82-027 — Add recruiter microsite management UI

Sections:

```text
Profile
Jobs
Posts
Socials
Analytics
```

---

## MS-V82-028 — Add moderation controls

Suspend/unpublish with audit.

---

## MS-V82-029 — Add public security tests

```text
PII leakage
script injection
slug enumeration behavior
closed job behavior
```

---

## MS-V82-GATE — V8.2 Exit Gate

---

# 8. V8.3 — ROLE-BASED WORKSPACES MICRO-STEPS

## MS-V83-001 — Define workspace composition registry

Use V8.0 contracts.

---

## MS-V83-002 — Add Admin workspace navigation/home shell

No giant dashboard.

---

## MS-V83-003 — Add Admin exception query 1

Start one real queue, e.g.:

```text
integration failures
or duplicate review
```

---

## MS-V83-004 — Add Recruiter workspace home query

Compose:

```text
due today
overdue
active cases
handling expiry
ready to start
```

---

## MS-V83-005 — Add Recruiter home UI

---

## MS-V83-006 — Mount My Kanban

Reuse V8.1.

---

## MS-V83-007 — Mount Microsite management

Reuse V8.2.

---

## MS-V83-008 — Mount AFF panel if available

No duplicate API.

---

## MS-V83-009 — Add Recruiter performance projection

Non-evaluative operational metrics.

---

## MS-V83-010 — Add Manager workspace home query

---

## MS-V83-011 — Add Team Kanban mount

---

## MS-V83-012 — Add Company Pool management mount

---

## MS-V83-013 — Add workload projection

---

## MS-V83-014 — Add manager exception center

---

## MS-V83-015 — Add CTV workspace shell

---

## MS-V83-016 — Add CTV jobs projection

Partner-safe.

---

## MS-V83-017 — Add CTV submit candidate mount

Canonical Partner intake.

---

## MS-V83-018 — Add CTV candidate/result projection

---

## MS-V83-019 — Add CTV dispute view

---

## MS-V83-020 — Add CTV AFF panel if available

---

## MS-V83-021 — Add Vendor workspace shell

---

## MS-V83-022 — Add Shared Demand projection

Vendor-scoped.

---

## MS-V83-023 — Mount PartnerSubmissionBatch

---

## MS-V83-024 — Add Vendor batch status/results UI

---

## MS-V83-025 — Add Vendor members UI

PartnerMember only.

---

## MS-V83-026 — Add Worker self-mapping resolver

Security blocker.

---

## MS-V83-027 — Add Worker workspace shell

---

## MS-V83-028 — Add Worker profile self-safe projection

---

## MS-V83-029 — Add Availability update

Canonical command.

---

## MS-V83-030 — Add Applications/JobProposals view

---

## MS-V83-031 — Add current employment projection

---

## MS-V83-032 — Add assignment history read-only view

---

## MS-V83-033 — Add Client membership resolver

Security blocker.

---

## MS-V83-034 — Add Client workspace shell

---

## MS-V83-035 — Add Client projects/orders/jobs projection

---

## MS-V83-036 — Add recruitment progress projection

---

## MS-V83-037 — Add confirmation queue

Canonical confirmation command.

---

## MS-V83-038 — Add workforce summary

Client-scoped.

---

## MS-V83-039 — Add cross-workspace route guards

---

## MS-V83-040 — Add workspace deep-link switch support

---

## MS-V83-GATE — V8.3 Exit Gate

---

# 9. V8.4 — ANALYTICS & PERSONALIZATION MICRO-STEPS

## MS-V84-001 — Expand WorkspacePreference

Only missing fields.

---

## MS-V84-002 — Add preference resolver

```text
user → workspace default → product default
```

---

## MS-V84-003 — Add SavedView schemaVersion

---

## MS-V84-004 — Add filter catalog for Kanban

---

## MS-V84-005 — Add filter catalog for Talent Repository

---

## MS-V84-006 — Add WidgetRegistry

---

## MS-V84-007 — Add UserWidgetPreference

---

## MS-V84-008 — Add pin/unpin/reorder

---

## MS-V84-009 — Add RecentItem tracking

Only references.

---

## MS-V84-010 — Re-check access when rendering Recent Items

---

## MS-V84-011 — Add Favorites

Optional if product priority remains.

---

## MS-V84-012 — Add NotificationPreference schema

---

## MS-V84-013 — Add notification event catalog

---

## MS-V84-014 — Add preference management UI

---

## MS-V84-015 — Define MetricDefinition contract

---

## MS-V84-016 — Add Recruiter metric set

One metric at a time.

---

## MS-V84-017 — Add Manager metric set

---

## MS-V84-018 — Add CTV metric set

---

## MS-V84-019 — Add Vendor metric set

---

## MS-V84-020 — Add Worker summary metrics

---

## MS-V84-021 — Add Client metric set

---

## MS-V84-022 — Mount Microsite analytics

---

## MS-V84-023 — Add metric time-window helper

Centralized.

---

## MS-V84-024 — Add analytics scope enforcement tests

---

## MS-V84-025 — Add metric cache where proven necessary

No premature warehouse.

---

## MS-V84-GATE — V8.4 Exit Gate

---

# 10. V8.5 — EXPERIENCE HARDENING MICRO-STEPS

## MS-V85-001 — Responsive WorkspaceShell

---

## MS-V85-002 — Responsive Recruiter workspace

---

## MS-V85-003 — Mobile Kanban navigation mode

Use column tabs/single-column focus.

---

## MS-V85-004 — Mobile card action sheet

---

## MS-V85-005 — Mobile recruiter microsite audit

---

## MS-V85-006 — Accessibility audit baseline

Identify critical violations first.

---

## MS-V85-007 — Keyboard focus/navigation primitives

---

## MS-V85-008 — Accessible Kanban move action

Equivalent to drag.

---

## MS-V85-009 — Accessible modal/drawer forms

---

## MS-V85-010 — Critical path manual accessibility test

```text
Today
→ Kanban
→ Case
→ NextAction
```

---

## MS-V85-011 — Board performance profiling

Measure before optimizing.

---

## MS-V85-012 — Add virtualization where evidence shows need

---

## MS-V85-013 — Harden column pagination

---

## MS-V85-014 — Centralize board query invalidation

---

## MS-V85-015 — Add stale optimistic-state recovery UX

---

## MS-V85-016 — Define NotificationReadModel

---

## MS-V85-017 — Build Notification Inbox

---

## MS-V85-018 — Add read/unread actions

---

## MS-V85-019 — Add notification deep-link resolver

---

## MS-V85-020 — Add notification dedupe

---

## MS-V85-021 — Define canonical resource deep links

---

## MS-V85-022 — Add workspace-aware deep-link resolver

---

## MS-V85-023 — Add external/internal route isolation tests

---

## MS-V85-024 — Consolidate shared UI primitives

Only after real duplication is observed.

---

## MS-V85-025 — Centralize status presentation catalog

Display only; domain enums remain canonical.

---

## MS-V85-026 — Centralize date/time formatting

---

## MS-V85-027 — Add error taxonomy mapping

---

## MS-V85-028 — Add widget/page error boundaries

---

## MS-V85-029 — Add frontend telemetry

PII-safe.

---

## MS-V85-030 — Add dependency degraded-state UI

AFF / Omnichannel / AI as applicable.

---

## MS-V85-031 — Run V8 security hardening review

Focus:

```text
workspace scopes
public PII
XSS
deep links
cache invalidation
telemetry leakage
```

---

## MS-V85-032 — Run V8 performance regression suite

---

## MS-V85-033 — Run V8 accessibility regression suite

---

## MS-V85-GATE — V8.5 + V8 Complete Gate

---

# 11. CROSS-PHASE DEPENDENCY RULES

Important dependencies:

```text
V8.1 requires V8.0 board/workspace foundation.

V8.2 requires V8.0 public profile foundation.

V8.2 AFF features require actual AFF capability evidence.

V8.3 Recruiter Kanban mount requires V8.1.

V8.3 Recruiter Microsite mount requires V8.2.

V8.3 CTV/Vendor depend on V7.6 Partner capability.

V8.3 Worker depends on canonical Worker/self mapping.

V8.3 Client depends on canonical Client membership/scope.

V8.4 analytics require stable canonical projections.

V8.5 hardening occurs after primary UX paths exist.
```

---

# 12. SAFE PARALLELISM

After V8.0 core contracts stabilize, these may proceed in parallel:

```text
V8.1 board read-model work
V8.2 recruiter public-profile schema/UI
```

provided they do not compete for the same migration or shared registry changes without coordination.

V8.3 external workspaces may be developed independently by actor after:

```text
workspace registry
scope contracts
canonical domain dependency
```

are stable.

---

# 13. MIGRATION RULES

For any V8 schema addition:

```text
additive first
nullable where rollout requires
backfill only when evidence supports it
no fabricated history
no destructive rename/drop in same slice
```

Experience data such as:

```text
WorkspacePreference
SavedView
RecruiterPublicProfile
RecruiterPost
```

must remain clearly separated from canonical domain records.

---

# 14. FILE-SIZE / MODULE RULES

Each micro-step must inspect resulting source files.

If implementation pushes a production file:

```text
>500 lines
```

the task must justify or split.

If:

```text
>700 lines
```

treat as architecture smell by default.

Do not solve file-size rules by meaningless fragmentation.

---

# 15. TEST EVIDENCE RULES

Each micro-step should identify the smallest appropriate evidence:

```text
unit
contract
integration
LIVE DB/RLS
browser/E2E
migration
performance
accessibility
security
```

Do not mark a security-sensitive step complete using UI screenshots alone.

Do not mark a UX step complete using unit tests alone when browser behavior is material.

---

# 16. AI CODING HANDOFF RULE

The coding agent should receive one micro-step or one tightly coupled mini-batch at a time.

Recommended batch size:

```text
1–3 micro-steps
```

unless steps are trivial type/config additions.

Do not hand the coding agent an entire V8 phase as one task.

---

# 17. MICRO-STEP COMPLETION REPORT

Each completed micro-step should report:

```text
Micro-step ID
Files changed
Schema/migration changed?
Commands/queries added
Permissions/RLS changed?
Tests run
Evidence
Known limitations
Follow-up dependency
File-size check
Hardcoding check
```

---

# 18. V8 FINAL ACCEPTANCE CONDITIONS

V8 is ready for release only when:

```text
all required phase gates pass
no unresolved P0/P1 security/domain issue
Kanban mutations use canonical commands
Microsite does not duplicate Affiliate
external workspaces are scope-safe
analytics do not become authority
mobile/keyboard critical paths work
large boards remain operational
telemetry is PII-safe
```

---

# 19. EXECUTION START POINT

The recommended first execution sequence is:

```text
MS-V8-D00
→ MS-V8-D01
→ MS-V8-D02
→ MS-V8-D03
→ MS-V8-D04
→ MS-V80-001
```

Do not start coding V8 UI before the discovery gate confirms repository reality.
