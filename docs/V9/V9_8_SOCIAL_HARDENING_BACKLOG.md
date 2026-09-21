# HRP V9.8 — SOCIAL PLATFORM HARDENING IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V9.8  
**Prerequisite:** V9.7 Exit Gate PASS  
**Depends on:** V9.0–V9.7 complete or production-candidate  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Production hardening, safety, performance, accessibility, observability, and final V9 regression gate

---

# 0. PURPOSE

V9.8 is the final hardening phase for the Social Recruiting Layer.

Its job is not to add major new product concepts.

Its job is to ensure the complete V9 stack is:

```text
safe
observable
performant
mobile-ready
accessible
moderated
privacy-aware
SEO-ready
resilient
operationally supportable
```

V9.8 validates V9.0–V9.7 as one coherent production platform.

Permanent rule:

> **Hardening does not create new business authority. It protects the authorities already defined.**

---

# 1. NON-NEGOTIABLE INVARIANTS

1. V9.8 does not redefine V7/V8 business truth.
2. Moderation actions are content/platform actions, not recruitment lifecycle actions.
3. Abuse prevention must not alter ReferralAttribution.
4. Security controls must fail closed where business safety requires it.
5. Public pages must not leak internal PII or internal identifiers.
6. Accessibility must not be optional per recruiter theme.
7. Mobile usability must work across all supported layout presets.
8. Cache must never turn stale Job data into misleading active recruitment truth.
9. SEO must not expose private/unpublished content.
10. Notification retries must not spam users.
11. External dependency outages must degrade gracefully.
12. AI outages must not break manual Content Studio.
13. Social API outages must not corrupt Campaign/Post state.
14. Analytics outages must not block canonical application/recruitment flows.
15. Moderation/admin actions must be auditable.
16. Public performance optimization must not bypass permission/publication checks.
17. Theme/layout customization remains subordinate to platform safety rules.
18. V9.8 must include end-to-end cross-phase regression tests.

---

# 2. DELIVERY SLICES

```text
V9.8a — Moderation Center
V9.8b — Abuse / Spam / Trust & Safety
V9.8c — Privacy & Public Data Protection
V9.8d — SEO & Discoverability Hardening
V9.8e — Performance / Cache / CDN
V9.8f — Mobile & Accessibility
V9.8g — Notification & Event Reliability
V9.8h — Operational Observability
V9.8i — Dependency Degradation
V9.8j — Cross-V9 Regression & Release Gate
```

---

# 3. V9.8a — MODERATION CENTER

## V98-001 — Moderation queue

**Type:** Admin/operations  
**Priority:** BLOCKER

Moderatable entities:

```text
Recruiter Profile
Social Post
Comment
Testimonial
Public FAQ/Q&A content
Campaign Landing Page
```

---

## V98-002 — ModerationCase model

Conceptual:

```text
id
entityType
entityId
reasonCode
reportedBy?
status
priority?
assignedTo?
createdAt
resolvedAt?
resolutionCode?
notes?
```

Do not couple moderation case to PlacementCase.

---

## V98-003 — Moderation status catalog

Suggested:

```text
OPEN
UNDER_REVIEW
RESOLVED
DISMISSED
```

Content entity may independently be:

```text
VISIBLE
HIDDEN
MODERATION_HOLD
UNPUBLISHED
```

---

## V98-004 — Moderation commands

Examples:

```text
placeOnModerationHold()
releaseFromModeration()
forceUnpublish()
hideComment()
suspendPublicProfile()
restorePublicProfile()
```

Named commands only.

---

## V98-005 — Moderation audit

Record:

```text
actor
command
entity
reason
before/after state
timestamp
```

---

# 4. V9.8b — ABUSE / SPAM / TRUST & SAFETY

## V98-010 — Abuse event catalog

Potential:

```text
RATE_LIMIT_TRIGGERED
SPAM_PATTERN_DETECTED
MASS_COMMENT_ATTEMPT
MASS_FOLLOW_ATTEMPT
MALICIOUS_LINK_ATTEMPT
REPORT_ABUSE
```

---

## V98-011 — Rate-limit policies

Apply to:

```text
follow/unfollow
reaction
comment
question submission
report
short-link creation
QR generation
poster generation
AI generation
```

Per-user/IP/session strategy as appropriate.

---

## V98-012 — Spam heuristics

Possible:

```text
duplicate text
high velocity
link flooding
repeated phone spam
bot-like patterns
```

Keep rules centralized/configurable.

---

## V98-013 — Link safety

Public content must reject/block:

```text
javascript:
data:
malicious redirects
unsafe external URL schemes
```

---

## V98-014 — Report workflow

Allow reporting:

```text
profile
post
comment
testimonial
campaign
```

One report should not automatically remove content unless policy says so.

---

# 5. V9.8c — PRIVACY & PUBLIC DATA PROTECTION

## V98-020 — Public data allow-list

Each public projection must explicitly allow fields.

Do not reuse internal DTOs.

---

## V98-021 — Recruiter public contact controls

Recruiter chooses approved public contact fields.

Internal contact != public contact.

---

## V98-022 — Candidate privacy

Do not expose:

```text
LaborProfile full name unless intentionally public
phone
email
CV
ID documents
internal notes
placement history
```

through engagement/audience features.

---

## V98-023 — Analytics privacy

Use:

```text
aggregate metrics
stable internal keys
coarse device/session metadata
small-cohort suppression where configured
```

No raw candidate PII in analytics events.

---

## V98-024 — Public deletion/unpublish behavior

Unpublish/hide must propagate through:

```text
timeline
post detail
SEO indexability
cache
OpenGraph
share preview
campaign embeds
```

---

# 6. V9.8d — SEO & DISCOVERABILITY HARDENING

## V98-030 — Canonical URL policy

Define canonical public URLs for:

```text
Recruiter Profile
Social Post
Campaign
Job-linked content
```

Avoid duplicate indexable URLs.

---

## V98-031 — Metadata policy

Public content may expose:

```text
title
description
OpenGraph
social image
canonical URL
```

---

## V98-032 — Indexability policy

Index:

```text
published recruiter profile
published public post
active/allowed campaign
```

Do NOT index:

```text
draft
scheduled
moderation hold
private/unlisted where policy forbids
suspended profile
```

---

## V98-033 — Job structured data

Use only when:

```text
canonical JobPosting public
structured-data requirements satisfied
current state valid
```

Do not emit active Job schema for closed/unavailable Job.

---

## V98-034 — Sitemap strategy

Potential:

```text
recruiter profiles
published posts
campaigns
```

Generated from public-safe projections.

---

# 7. V9.8e — PERFORMANCE / CACHE / CDN

## V98-040 — Public page performance budget

Measure:

```text
TTFB
LCP
CLS
interaction latency
media bytes
API payload sizes
```

Set budgets based on real baseline.

---

## V98-041 — Timeline cache strategy

Cache:

```text
public timeline page/read model
post detail
recruiter public profile
campaign page
```

with explicit invalidation.

---

## V98-042 — Cache invalidation matrix

Invalidate on:

```text
post publish/unpublish
moderation hold/release
profile appearance publish
profile suspend/restore
JobPosting state change
campaign state change
testimonial approval/hide
```

---

## V98-043 — CDN/media optimization

Use:

```text
responsive image sizes
compression
lazy loading
video poster images
CDN cache
```

where infrastructure permits.

---

## V98-044 — N+1 detection

Regression/performance tests for:

```text
timeline JobCards
campaign Job lists
post Job collections
portfolio metrics
testimonials
```

---

## V98-045 — Large-account scenarios

Test recruiter with:

```text
1,000+ posts
hundreds of media assets
many campaigns
many followers/reactions
```

Use pagination/read models.

---

# 8. V9.8f — MOBILE & ACCESSIBILITY

## V98-050 — Responsive layout matrix

Every V9.2 layout preset must define:

```text
desktop
tablet
mobile
```

behavior.

---

## V98-051 — Mobile Content Studio

Core tasks must work on mobile/tablet where product supports editing:

```text
draft
preview
schedule
publish
```

Complex poster/theme editing may be desktop-preferred but must fail gracefully.

---

## V98-052 — Keyboard navigation

Support keyboard operation for:

```text
tabs
menus
composer controls
section ordering via non-drag controls
moderation actions
```

---

## V98-053 — Non-drag alternative

Any drag UI must have alternative:

```text
Move Up
Move Down
Move to...
```

---

## V98-054 — Focus states

Theme customization cannot remove visible focus indicators.

---

## V98-055 — Semantic accessibility

Ensure:

```text
headings
labels
alt text
button semantics
form errors
live regions where appropriate
```

---

## V98-056 — Contrast enforcement

All theme/accent combinations must pass centralized contrast policy.

---

# 9. V9.8g — NOTIFICATION & EVENT RELIABILITY

## V98-060 — Event delivery pattern

Use:

```text
outbox
retry
dedupe
dead-letter/reconciliation
```

where event reliability matters.

---

## V98-061 — Notification dedupe

Prevent duplicates for:

```text
new recruiter post
comment reply
job subscription match
campaign notification
```

---

## V98-062 — Notification preference compliance

Respect V8.4 notification preferences.

Delivery preference must not erase canonical event history.

---

## V98-063 — Deep-link validation

Notification opens:

```text
current public/permitted state
```

not stale cached authorization.

---

## V98-064 — Dead-letter operational view

Provide ops visibility into failed:

```text
notification deliveries
scheduled publishes
external adapter sends
analytics ingestion where needed
```

---

# 10. V9.8h — OPERATIONAL OBSERVABILITY

## V98-070 — Structured logging

Log key operations with:

```text
request/correlation ID
actor ID where permitted
entity type/id
command
result
latency
error category
```

No sensitive content dumping.

---

## V98-071 — Error taxonomy

Centralize errors:

```text
AUTHORIZATION
VALIDATION
CONCURRENCY
DEPENDENCY
RATE_LIMIT
MODERATION
NOT_FOUND
INTERNAL
```

---

## V98-072 — Metrics

Operational metrics:

```text
publish success/failure
scheduler lag
timeline latency
cache hit rate
short-link resolution errors
poster generation failures
AI generation failures
notification failures
moderation queue size
```

---

## V98-073 — Tracing

Trace important multi-step flows:

```text
scheduled publish
campaign page render
short-link redirect
AI generation
notification send
```

where infrastructure supports it.

---

## V98-074 — PII-safe telemetry

Never log:

```text
CV
full comment body unnecessarily
phone/email
private candidate notes
auth tokens
```

---

# 11. V9.8i — DEPENDENCY DEGRADATION

## V98-080 — AI outage

Expected:

```text
manual Content Studio works
templates work
publishing works
```

---

## V98-081 — Analytics outage

Expected:

```text
public pages work
Apply works
AFF works
publishing works
analytics dashboard may show degraded state
```

---

## V98-082 — External social outage

Expected:

```text
HRP post/campaign state remains correct
share assets remain available
adapter error surfaced
```

---

## V98-083 — Media/CDN issue

Expected:

```text
content remains structurally usable
fallback/placeholder
retry
no broken business state
```

---

## V98-084 — Universal AFF unavailable

Expected:

```text
canonical public navigation still works where allowed
AFF-specific link decoration feature-gated
no substitute attribution invented
```

---

## V98-085 — Notification outage

Expected:

```text
underlying social/business event persists
delivery retries/reconciles
```

---

# 12. CROSS-PHASE SECURITY REVIEW

Review boundaries:

```text
V9.0 publishing
V9.1 public timeline
V9.2 appearance
V9.3 studio/scheduling
V9.4 engagement
V9.5 distribution
V9.6 analytics
V9.7 AI
```

Specifically verify:

```text
author scope
public/private projections
moderation
XSS/link safety
open redirect
rate limits
PII
AI context safety
permission-driven admin access
```

---

# 13. CROSS-PHASE PERFORMANCE REVIEW

Test:

```text
large recruiter timeline
multi-job posts
campaign with many jobs/posts
analytics dashboard
comment-heavy post
many followers
large media library
theme/layout rendering
```

Use measured bottlenecks before optimization.

---

# 14. FINAL V9 REGRESSION FIXTURES

## RF-V98-01 — Suspended recruiter

Profile, timeline, campaigns become unavailable according to policy; historical business records unchanged.

---

## RF-V98-02 — Moderated post

Removed from public timeline/cache/SEO without mutating Job/Application/Placement.

---

## RF-V98-03 — Closed Job + cached post

Cache invalidation ensures Apply CTA is no longer active.

---

## RF-V98-04 — Theme accessibility

Invalid contrast cannot be published.

---

## RF-V98-05 — Mobile layouts

All supported V9.2 presets remain usable on mobile.

---

## RF-V98-06 — Spam burst

Rate limits work without creating business-side effects.

---

## RF-V98-07 — Duplicate notification

Delivered once.

---

## RF-V98-08 — AI outage

Manual publishing workflow remains operational.

---

## RF-V98-09 — Analytics outage

Candidate can still view/apply normally.

---

## RF-V98-10 — Social adapter outage

Campaign/Post state remains valid.

---

## RF-V98-11 — AFF outage

No fake attribution created.

---

## RF-V98-12 — Open redirect attack

Blocked.

---

## RF-V98-13 — XSS payload

Never executes.

---

## RF-V98-14 — Internal DTO leakage

Public API exposes only allow-listed fields.

---

## RF-V98-15 — Large timeline

Cursor pagination/lazy media remain within performance budget.

---

## RF-V98-16 — Campaign with closed Job

Current canonical state is rendered.

---

## RF-V98-17 — Comment moderation

Comment hidden without changing HandlingAssignment.

---

## RF-V98-18 — Follow/unfollow

No ReferralAttribution changes.

---

## RF-V98-19 — Analytics correlation

Does not overwrite canonical source attribution.

---

## RF-V98-20 — AI generated draft after Job change

Publish validation catches stale/incorrect facts.

---

# 15. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
v9-hardening-service.ts
security-utils.ts
platform-admin.tsx
```

as giant catch-all modules.

Suggested structure:

```text
moderation/
  cases/
  commands/
  queries/

trust-safety/
  rate-limits/
  spam/
  reports/

public-privacy/
  projections/
  policies/

seo/
  metadata/
  sitemap/
  structured-data/

performance/
  cache/
  invalidation/
  budgets/

accessibility/
  audits/
  components/

reliability/
  outbox/
  retries/
  dlq/

observability/
  logging/
  metrics/
  tracing/

degradation/
  policies/
```

---

# 16. RELEASE READINESS CHECKLIST

## Moderation

```text
[ ] moderation queue
[ ] hold/release/unpublish
[ ] audited actions
```

## Abuse

```text
[ ] rate limiting
[ ] spam controls
[ ] report flow
[ ] unsafe link blocking
```

## Privacy

```text
[ ] public allow-list DTOs
[ ] no candidate PII leakage
[ ] analytics PII minimization
```

## SEO

```text
[ ] canonical URLs
[ ] metadata
[ ] indexability policy
[ ] sitemap
[ ] Job structured data safe
```

## Performance

```text
[ ] timeline budget
[ ] campaign budget
[ ] cache invalidation
[ ] media optimization
[ ] no N+1 regressions
```

## Mobile/Accessibility

```text
[ ] all layouts responsive
[ ] keyboard support
[ ] non-drag alternatives
[ ] contrast checks
[ ] semantic accessibility
```

## Reliability

```text
[ ] outbox/retry where needed
[ ] notification dedupe
[ ] DLQ/reconciliation
```

## Observability

```text
[ ] structured logs
[ ] error taxonomy
[ ] metrics
[ ] PII-safe telemetry
```

## Degradation

```text
[ ] AI outage safe
[ ] Analytics outage safe
[ ] Social adapter outage safe
[ ] AFF unavailable behavior safe
[ ] Notification outage safe
```

## Regression

```text
[ ] RF-V98-01 through RF-V98-20 pass
[ ] V9.0–V9.7 exit-gate regressions re-run
```

---

# 17. FINAL V9 RELEASE GATE

V9 is considered production-ready only when:

```text
V9.0 PASS
V9.1 PASS
V9.2 PASS
V9.3 PASS
V9.4 PASS
V9.5 PASS
V9.6 PASS
V9.7 PASS
V9.8 PASS
```

And the architecture still preserves:

```text
V7 = canonical business truth
V8 = workspace/experience infrastructure
V9 = social recruiting / creator / distribution layer
Universal AFF = attribution authority
```

---

# 18. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V98-001 through V98-014
Moderation + abuse

Batch B
V98-020 through V98-034
Privacy + SEO

Batch C
V98-040 through V98-045
Performance/cache/CDN

Batch D
V98-050 through V98-056
Mobile/accessibility

Batch E
V98-060 through V98-074
Reliability/observability

Batch F
V98-080 through V98-085
Dependency degradation

Batch G
RF-V98-01 through RF-V98-20
Cross-phase regression

Batch H
Full V9 release gate
```

---

# 19. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
ModerationPlacementState
SecurityReferralAttribution
AnalyticsFallbackAttribution
ThemeBypassAccessibility
```

Do NOT:

```text
let cache override canonical Job state
let outage handling invent business data
log sensitive candidate content
treat moderation as recruitment lifecycle
disable accessibility through recruiter customization
```

---

# 20. PRODUCT OUTCOME

After V9.8, HRP should have a production-grade Social Recruiting Layer where each recruiter can:

```text
build a personal recruitment brand
publish professional content
operate a social timeline
engage an audience
distribute jobs/campaigns
measure real conversion
use AI assistance
```

while the platform remains:

```text
safe
fast
auditable
accessible
privacy-aware
resilient
```

and the foundational separation remains intact:

```text
V9 owns experience/content/distribution.
V7 owns business truth.
Universal AFF owns attribution.
```
