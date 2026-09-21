# HRP V9 — DISCOVERY & REPOSITORY AUDIT PACKAGE

**Status:** Ready for execution  
**Purpose:** Mandatory repository discovery gate before V9 production implementation  
**Applies to:** V9.0 → V9.8  
**Primary executor:** AI Coding Agent  
**Cross-cutting authority:** `AI_CODING_GUARDRAILS.md`

---

# 0. PURPOSE

This package defines the mandatory audit that must run before V9 production code is written.

V9 depends on a large number of V7/V8 capabilities:

```text
RecruiterPublicProfile
public slug
JobPosting public projection
media infrastructure
auth/RBAC/RLS
workspace ActorContext
notification preferences
scheduler/outbox
event/analytics pipeline
MetricDefinition
feature flags
Universal Affiliate
public SEO/rendering
Omnichannel boundaries
```

The documents describe the intended architecture.

The repository defines what is actually implemented.

Therefore:

> **Do not assume architecture plan == repository reality.**

V9 implementation begins only after this audit identifies what is:

```text
IMPLEMENTED
PARTIAL
LEGACY_ONLY
NOT_IMPLEMENTED
CONFLICT
UNKNOWN
```

---

# 1. MANDATORY INPUT DOCUMENTS

Read in this order:

```text
1. HRP_V6_PLUS_V7_MASTER_INDEX.md
2. AI_CODING_GUARDRAILS.md

3. V9_MASTER_PLAN_v1.1.md
4. V9_0_SOCIAL_PUBLISHING_FOUNDATION_BACKLOG.md
5. V9_1_RECRUITER_TIMELINE_BACKLOG.md
6. V9_2_PROFILE_PERSONAL_BRAND_APPEARANCE_BACKLOG.md
7. V9_3_CONTENT_STUDIO_BACKLOG.md
8. V9_4_ENGAGEMENT_AUDIENCE_BACKLOG.md
9. V9_5_DISTRIBUTION_CAMPAIGNS_BACKLOG.md
10. V9_6_CREATOR_ANALYTICS_BACKLOG.md
11. V9_7_AI_CONTENT_ASSISTANT_BACKLOG.md
12. V9_8_SOCIAL_HARDENING_BACKLOG.md
13. V9_MICRO_STEP_EXECUTION_PLAN.md

14. Relevant V8 implementation backlogs
15. V8 discovery/capability reports if already generated
16. Universal Affiliate canonical plan
```

Do not start implementation during document reading.

---

# 2. REQUIRED DISCOVERY OUTPUTS

The audit must create:

```text
V9_DISCOVERY_REPORT.md
V9_CAPABILITY_MATRIX.md
V9_REPO_MODULE_MAP.md
V9_BASELINE_TEST_REPORT.md
V9_BLOCKER_REGISTER.md
```

These outputs are evidence for the V9 implementation gate.

---

# 3. CLASSIFICATION SCALE

Every dependency/capability must be classified as one of:

## IMPLEMENTED

```text
schema exists
application contract exists
security/permissions exist
tests/evidence exist
usable by V9 with no material redesign
```

## PARTIAL

```text
some implementation exists
but contract/security/tests/scope are incomplete
```

## LEGACY_ONLY

```text
related older implementation exists
but semantics differ from canonical V7/V8/V9 design
```

## NOT_IMPLEMENTED

```text
documented capability has no meaningful implementation
```

## CONFLICT

```text
repository implementation materially contradicts canonical design
```

## UNKNOWN

```text
insufficient evidence
```

Do not upgrade UNKNOWN to IMPLEMENTED based on naming alone.

---

# 4. MS-V9-D00 — REPOSITORY STRUCTURE INVENTORY

## Objective

Map the actual codebase before making assumptions.

## Inspect

### Backend

Identify paths/modules for:

```text
auth
users
permissions/RBAC
RLS/security
LaborProfile
PlacementCase
JobPosting
public jobs
Recruiter/Public Profile
AFF
media
notifications
scheduler
outbox
events
analytics
AI
Omnichannel
feature flags
moderation
```

### Frontend

Identify:

```text
workspace shell
public recruiter/profile routes
public job pages
content/editor components
media upload/picker
theme/design-system
navigation
notification UI
analytics/dashboard components
admin/moderation UI
```

### Infrastructure

Identify:

```text
DB/ORM
migrations
queue/workers
cron/scheduler
object storage
CDN
cache
event bus
observability
tests
CI/build
```

---

# 5. D00 OUTPUT — V9_REPO_MODULE_MAP.md

Required structure:

```text
# Backend Modules
Path | Responsibility | Owner | Reusable for V9? | Notes

# Frontend Modules
Path | Responsibility | Reusable for V9? | Notes

# Infrastructure
Component | Location | Capability | Notes

# Suspicious Overlaps
Module | Why it may conflict with V9 authority
```

Also identify:

```text
god services
large page components
generic utils
duplicated permission constants
duplicated business enums
```

that may affect V9 maintainability.

Do not refactor them during discovery.

---

# 6. MS-V9-D01 — V7/V8 CAPABILITY VERIFICATION FOR V9

Audit only capabilities V9 actually depends on.

---

# 7. PUBLIC RECRUITER PROFILE FOUNDATION

Verify:

```text
RecruiterPublicProfile model
user/recruiter relation
public profile state
slug
avatar
cover
bio
social links
public contact
featured jobs
posts/content if any
```

Questions:

```text
Is it actually implemented?
Is profile tied to generic User or role-specific entity?
Is public state explicit?
Can profile be suspended/unpublished?
Is slug unique/stable?
```

Expected V9 classification example:

```text
RecruiterPublicProfile: IMPLEMENTED/PARTIAL/...
PublicSlug: ...
PublicProfileState: ...
```

---

# 8. PUBLIC JOBPOSTING PROJECTION

Verify one canonical public Job query/projection exists.

Required V9 fields may include:

```text
jobPostingId
title
location
salaryDisplay
benefits
requirements summary
shift/work type
open/public state
apply destination
```

Check:

```text
public DTO
permission/public visibility
closed job handling
cache
N+1 behavior
```

Red flag:

```text
V9 must not reuse internal JobOpening/StaffingOrder DTO directly.
```

---

# 9. ACTOR / WORKSPACE / PERMISSION CONTEXT

Verify V8 implementation of:

```text
ActorContext
permissions
scope
available workspaces
current workspace
permission-driven navigation
command authorization
```

Check whether frontend only hides UI versus backend enforcing permissions.

V9 requires server-side scope for:

```text
own posts
own appearance
own campaigns
own analytics
team/admin moderation
```

---

# 10. MEDIA INFRASTRUCTURE

Verify:

```text
image upload
avatar/cover storage
media asset model
object storage
public/signed URLs
image transformation
CDN
video handling
external media link policy
```

Classification examples:

```text
Image upload: IMPLEMENTED
Video upload: NOT_IMPLEMENTED
YouTube embed: PARTIAL
Media picker: NOT_IMPLEMENTED
```

V9 must reuse existing media capability where safe.

---

# 11. NOTIFICATION FOUNDATION

Verify:

```text
NotificationPreference
NotificationReadModel
event → notification flow
delivery channels
dedupe
deep links
retry
```

V9.4 expects this foundation.

Do not create a second notification preference system.

---

# 12. SCHEDULER / OUTBOX / BACKGROUND EXECUTION

Verify:

```text
scheduler/cron
worker infrastructure
outbox
idempotency
retry
dead-letter handling
operational visibility
```

V9.0/V9.3 need scheduled publishing.

V9.5 external adapters may need outbox.

---

# 13. ANALYTICS / METRIC FOUNDATION

Verify V8.4/V7.10 reality:

```text
analytics event model
event ingestion
MetricDefinition
metric versioning
aggregates
dashboards
recompute/backfill
privacy controls
```

Do not assume `MetricDefinition` exists just because V8 backlog specifies it.

---

# 14. OMNICHANNEL / PRIVATE MESSAGING BOUNDARY

Verify:

```text
Chatwoot integration
Zalo integration
conversation entity/boundary
contact routing
private message support
```

V9.4 should reuse this.

If absent:

```text
Q&A private interaction must fall back to safe contact CTA
```

Do not build SocialChat.

---

# 15. FEATURE FLAG FOUNDATION

Verify:

```text
flag storage
server evaluation
frontend evaluation
environment targeting
per-user/per-role rollout if supported
```

V9 has multiple phased flags.

---

# 16. SEO / PUBLIC RENDERING FOUNDATION

Verify:

```text
server rendering / static rendering
metadata support
OpenGraph
canonical URLs
sitemap
structured data
public cache
```

V9.1/V9.8 depend on this.

---

# 17. D01 OUTPUT — V9_CAPABILITY_MATRIX.md

Minimum table:

```text
Capability
Expected Contract
Actual Evidence
Status
Gap
Required Before Phase
```

Required rows:

```text
RecruiterPublicProfile
PublicSlug
PublicProfileState
PublicJobPostingProjection
ActorContext
Permission/Scope Enforcement
Media Upload
Media Asset
Video Support
NotificationPreference
Notification Delivery
Scheduler
Outbox
Retry/DLQ
Analytics Event Pipeline
MetricDefinition
Aggregate Read Models
Omnichannel Private Routing
Feature Flags
SEO Metadata
Canonical URL
Sitemap
Public Cache
```

---

# 18. MS-V9-D02 — UNIVERSAL AFF REALITY CHECK

This is a mandatory independent audit.

Do not infer Universal AFF from the presence of `affCode`.

Verify:

```text
User.affCode
link generation
public affiliate redirect
signed cookie/token
attribution duration
first-valid-source-wins
public Apply integration
LaborProfile ReferralAttribution
handling integration
source dispute behavior
```

---

# 19. AFF REQUIRED EVIDENCE

For each item record:

```text
schema path
service/command
route/API
tests
actual behavior
```

Classify:

```text
IMPLEMENTED
PARTIAL
LEGACY_ONLY
NOT_IMPLEMENTED
CONFLICT
UNKNOWN
```

---

# 20. AFF SEMANTIC RECONCILIATION

Explicitly inspect the known design conflict:

```text
older AFF:
7-day AFF_INITIAL handling starts at LaborProfile create/match

newer V7:
operational handling belongs primarily to PlacementCase
and begins when qualifying active PlacementCase opens
```

Discovery must NOT choose a winner silently.

Report:

```text
repository behavior
AFF document behavior
V7 canonical behavior
conflict status
decision required
```

---

# 21. AFF → V9 REQUIRED CAPABILITY

V9 ideally consumes capabilities such as:

```text
getSelfAffiliateLink()
buildAffiliateDestination()
getAffiliateFeatureState()
```

Exact names may differ.

Audit whether an equivalent safe abstraction exists.

Red flags:

```text
UI manually builds ?ref=
hash(employeeId)
raw userId trusted from browser
V9-owned referral cookie
```

---

# 22. D02 OUTPUT

Add dedicated AFF section to:

```text
V9_DISCOVERY_REPORT.md
V9_CAPABILITY_MATRIX.md
V9_BLOCKER_REGISTER.md
```

If AFF is not ready:

```text
V9.0–V9.4 may still proceed where AFF-independent
V9.5 attributed distribution must be feature-gated
```

Do not invent substitute attribution.

---

# 23. MS-V9-D03 — PUBLIC SECURITY / MEDIA / SEO AUDIT

Inspect attack surfaces introduced by V9.

---

# 24. PUBLIC PROJECTION SAFETY

Verify existing pattern for:

```text
public DTO allow-list
internal DTO separation
permission/publication checks
profile suspension
```

Identify endpoints that leak:

```text
internal user IDs
permissions
internal notes
private contacts
commercial terms
```

---

# 25. CONTENT SANITIZATION

Verify existing libraries/policies for:

```text
rich text
HTML sanitization
external links
video embeds
URL protocols
```

V9 must not invent a parallel sanitizer without reason.

---

# 26. REDIRECT SECURITY

Audit current redirect patterns.

Check for:

```text
open redirects
unvalidated returnUrl
javascript/data protocols
external destination passthrough
```

Important for V9.5 short links/QR.

---

# 27. RATE LIMITING

Verify reusable rate-limit infrastructure for:

```text
public forms
comments
follow
reaction
AI generation
short links
poster generation
```

---

# 28. MEDIA SECURITY

Verify:

```text
file type validation
size limits
virus/malware policy if relevant
signed upload
public media permissions
image transformation safety
```

---

# 29. SEO / INDEXING

Verify current rules for:

```text
robots
metadata
canonical URL
sitemap
unpublished pages
closed jobs
```

---

# 30. D03 OUTPUT

Add a security readiness table:

```text
Area
Existing Mechanism
Status
V9 Risk
Required Action
```

Areas:

```text
XSS
Unsafe HTML
External Links
Open Redirect
Media Upload
Public DTO Leakage
Rate Limiting
SEO Leakage
Cache Leakage
```

---

# 31. MS-V9-D04 — EVENT / ANALYTICS / SCHEDULER AUDIT

V9 relies heavily on asynchronous and analytical infrastructure.

---

# 32. EVENT FOUNDATION

Verify:

```text
domain/application event pattern
event IDs
correlation IDs
outbox
consumer retry
dedupe
```

---

# 33. SCHEDULER FOUNDATION

Verify actual implementation for:

```text
scheduled jobs
timezone handling
idempotent execution
retry
failure state
ops visibility
```

Do not assume cron alone is enough.

---

# 34. ANALYTICS FOUNDATION

Verify:

```text
client/server event collection
schema governance
privacy
storage
aggregation
dashboard query pattern
```

---

# 35. OBSERVABILITY

Verify:

```text
structured logs
error taxonomy
metrics
tracing
PII policy
```

V9.8 should extend existing mechanisms rather than create separate observability.

---

# 36. D04 OUTPUT

Create readiness matrix:

```text
Event ingestion
Outbox
Scheduler
Retry
DLQ
Notification
Analytics storage
Aggregates
Metric governance
Logs
Metrics
Tracing
```

Each with evidence/status/gap.

---

# 37. MS-V9-D05 — BASELINE TEST / BUILD

Run repository-supported commands.

At minimum where available:

```text
typecheck
lint
unit tests
integration tests
security/RLS tests
migration validation
frontend build
```

Do not fix unrelated failures during discovery.

Record them.

---

# 38. BASELINE CLASSIFICATION

## GREEN

```text
relevant baseline passes
```

## YELLOW

```text
known failures exist but do not block V9 starting point
```

## RED

```text
baseline failure makes safe V9 work impossible
```

## ENV_BLOCKED

```text
cannot run due environment/dependency setup
```

---

# 39. D05 OUTPUT — V9_BASELINE_TEST_REPORT.md

Required:

```text
Command
Result
Failure summary
Pre-existing?
Relevant to V9?
Blocking?
```

---

# 40. V9_BLOCKER_REGISTER.md

Every material blocker must be recorded.

Required fields:

```text
Blocker ID
Title
Detected in discovery step
Affected V9 phase
Observed repository evidence
Expected canonical contract
Risk
Severity
Decision/prerequisite needed
Owner/authority needed
Status
```

Suggested severities:

```text
BLOCKER
HIGH
MEDIUM
LOW
```

---

# 41. BLOCKER EXAMPLES

Examples:

```text
V9-B001
Universal AFF link builder missing

V9-B002
Public Job projection exposes internal fields

V9-B003
No idempotent scheduler for scheduled posts

V9-B004
RecruiterPublicProfile schema differs materially

V9-B005
No media asset abstraction; uploads directly embedded in feature modules

V9-B006
No notification preference foundation

V9-B007
MetricDefinition planned but not implemented

V9-B008
Existing public route permits open redirect

V9-B009
AFF handling semantics conflict with V7 PlacementCase handling
```

---

# 42. V9_DISCOVERY_REPORT.md REQUIRED STRUCTURE

```text
# Executive Summary

# Repository Reality
- architecture
- stack
- relevant modules

# V9 Readiness by Phase
V9.0
V9.1
...
V9.8

# Capability Summary
IMPLEMENTED
PARTIAL
LEGACY_ONLY
NOT_IMPLEMENTED
CONFLICT
UNKNOWN

# Universal AFF Reality

# Public Security Reality

# Media Reality

# Scheduler/Event Reality

# Analytics Reality

# Baseline Build/Test

# Blockers

# Safe First Micro-Steps

# Final Discovery Verdict
```

---

# 43. READINESS BY V9 PHASE

Discovery must classify each phase:

```text
READY
READY_WITH_LIMITATIONS
BLOCKED
NOT_ASSESSED
```

Example:

```text
V9.0 READY
V9.1 READY_WITH_LIMITATIONS
V9.2 READY
V9.3 BLOCKED — scheduler missing
V9.4 READY_WITH_LIMITATIONS
V9.5 BLOCKED — Universal AFF missing
V9.6 BLOCKED — analytics foundation missing
V9.7 READY_WITH_LIMITATIONS — AI provider foundation exists
V9.8 NOT_ASSESSED
```

Do not use optimistic defaults.

---

# 44. SAFE-FIRST-MICROSTEP RULE

After discovery, coding AI must recommend only:

```text
1–3 safest next micro-steps
```

Example:

```text
MS-V9-0001
MS-V9-0002
MS-V9-0003
```

Only if prerequisites are confirmed.

Do not start the entire phase automatically.

---

# 45. IMPLEMENTATION GATES

## Gate A — V9.0 may start only if

```text
recruiter public identity exists or clear prerequisite is known
JobPosting canonical reference exists
auth/scope pattern exists
migration baseline is safe
```

## Gate B — V9.1 may start only if

```text
V9.0 PASS
public recruiter route foundation safe
public Job projection safe
media rendering safe
```

## Gate C — V9.2 may start only if

```text
V9.1 PASS
design system/theme token strategy known
public profile ownership clear
```

## Gate D — V9.3 may start only if

```text
V9.0 publication lifecycle stable
scheduler path understood
media picker/upload path understood
```

## Gate E — V9.4 may start only if

```text
notification preference path understood
identity/privacy policy clear
comment moderation prerequisite understood
```

## Gate F — V9.5 attributed distribution may start only if

```text
Universal AFF capability is IMPLEMENTED
or feature-gated non-AFF path is explicitly accepted
```

## Gate G — V9.6 may start only if

```text
event pipeline/analytics storage strategy known
canonical Application/Placement outcome queries available
```

## Gate H — V9.7 may start only if

```text
AI provider abstraction understood
canonical Job facts DTO safe
manual Content Studio works independently
```

---

# 46. NO-GO CONDITIONS

Do not proceed with production V9 implementation if discovery finds:

```text
public security leakage
unsafe redirect pattern
unclear attribution authority
unclear recruiter identity ownership
migration baseline RED
permission/RLS conflict
canonical Job projection unavailable
```

Resolve prerequisites first.

---

# 47. DISCOVERY NON-GOALS

Discovery must NOT:

```text
implement V9 features
rewrite V7/V8
upgrade frameworks unnecessarily
clean unrelated technical debt
rename broad modules
migrate historical data
introduce speculative abstractions
```

Discovery is evidence collection.

---

# 48. EVIDENCE STANDARD

Every capability claim must cite repository evidence such as:

```text
schema/model path
service/command path
route/controller path
query path
UI path
test path
migration path
```

Bad:

```text
"Probably implemented because there is an affCode column."
```

Good:

```text
"PARTIAL — User.affCode exists, but no verified public link builder/attribution flow found."
```

---

# 49. FILE-SIZE / HARDCODING AUDIT

During discovery, identify existing risks relevant to V9:

```text
production files >500 lines
god frontend pages
god services
scattered permission strings
scattered status enums
hardcoded theme values
hardcoded metric formulas
hardcoded public URLs
AI prompts embedded in UI
```

Report only.

Do not refactor yet unless it blocks a subsequent approved micro-step.

---

# 50. FINAL DISCOVERY VERDICT

The final report must end with one of:

## READY_FOR_V9_MICROSTEPS

```text
Core prerequisites exist.
Proceed with recommended 1–3 micro-steps.
```

## READY_WITH_PREREQUISITES

```text
Some V9 work can begin, but named capabilities/phases remain blocked.
```

## BLOCKED

```text
Repository conflicts/gaps make V9 production coding unsafe.
Resolve blockers first.
```

Never report “READY” merely because documentation is complete.

---

# 51. CODING AGENT FINAL DISCOVERY RESPONSE TEMPLATE

```text
V9 DISCOVERY COMPLETE

Verdict:
READY_FOR_V9_MICROSTEPS
| READY_WITH_PREREQUISITES
| BLOCKED

Baseline:
GREEN | YELLOW | RED | ENV_BLOCKED

V9 Phase Readiness:
V9.0 ...
V9.1 ...
V9.2 ...
V9.3 ...
V9.4 ...
V9.5 ...
V9.6 ...
V9.7 ...
V9.8 ...

Top Blockers:
1.
2.
3.

Key Repository Conflicts:
...

Universal AFF Status:
...

Public Security Status:
...

Recommended Next Micro-Steps:
1.
2.
3.

Generated Reports:
- V9_DISCOVERY_REPORT.md
- V9_CAPABILITY_MATRIX.md
- V9_REPO_MODULE_MAP.md
- V9_BASELINE_TEST_REPORT.md
- V9_BLOCKER_REGISTER.md

No V9 production feature implementation was performed during discovery.
```

---

# 52. FINAL PRINCIPLE

V9 is intentionally built on V7/V8 rather than around them.

Therefore the first implementation responsibility is not:

```text
"make V9 code compile"
```

It is:

```text
prove the repository has the authorities V9 expects
```

Only after that proof should production implementation begin.

> **Discover first. Reuse canonical authority. Implement second.**
