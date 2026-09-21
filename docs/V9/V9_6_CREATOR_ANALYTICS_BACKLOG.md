# HRP V9.6 — CREATOR ANALYTICS & CONVERSION INTELLIGENCE BACKLOG

**Status:** Draft for implementation  
**Target release:** V9.6  
**Prerequisite:** V9.5 Exit Gate PASS  
**Depends on:** V9.1 Timeline events, V9.4 Engagement events, V9.5 Distribution events, canonical Application/Placement outcomes, V8.4 Metric Governance foundation  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Measure recruiter content performance from audience activity through canonical recruitment outcomes

---

# 0. PURPOSE

V9.6 makes the Social Recruiting Layer measurable.

The goal is not merely to show:

```text
views
likes
followers
```

The real goal is to connect:

```text
Profile / Post / Campaign
→ View
→ Click
→ Apply
→ Placement
```

so recruiters can understand which content and channels create real recruitment outcomes.

V9.6 remains an analytics/projection layer.

It must NOT:

```text
assign ReferralAttribution
select CommissionBeneficiary
change PlacementCase stage
change Job priority
score employees opaquely
```

Permanent rule:

> **Analytics explains performance. Analytics does not own business truth.**

---

# 1. NON-NEGOTIABLE INVARIANTS

1. Analytics is projection/read-model only.
2. Social traffic events are not ReferralAttribution.
3. Distribution click is not commission entitlement.
4. Application/Placement outcomes must come from canonical V7 entities/events.
5. Metrics must have centralized definitions.
6. Metric definitions must include scope, denominator, time window, and version.
7. Do not create a hidden recruiter performance score.
8. Do not auto-rank employees for HR evaluation.
9. Avoid false precision when attribution/identity is uncertain.
10. Aggregate metrics should respect privacy thresholds where needed.
11. Historical metric definitions must remain reproducible/versioned.
12. Funnel joins must not silently infer identity beyond supported keys.
13. Unknown/unmatched traffic must remain unknown.
14. Campaign analytics does not become campaign business authority.
15. Creator analytics should support recruiter self-view and manager-approved aggregate views through canonical permissions.
16. Analytics must remain useful if AI is disabled.
17. V9.7 may consume these metrics, but AI recommendations must cite/derive from governed metrics.
18. Metric query performance must not scan raw event history synchronously for every dashboard request.

---

# 2. DELIVERY SLICES

```text
V9.6a — Analytics Event Foundation
V9.6b — Metric Governance
V9.6c — Creator Dashboard
V9.6d — Content Performance
V9.6e — Recruitment Conversion Funnel
V9.6f — Campaign & Channel Analytics
V9.6g — Insight Read Models
V9.6h — Privacy / Security / Performance
```

---

# 3. V9.6a — ANALYTICS EVENT FOUNDATION

## V96-001 — Event catalog

**Type:** Analytics event governance  
**Priority:** BLOCKER

Input events may include:

```text
PROFILE_VIEW
TIMELINE_VIEW
POST_IMPRESSION
POST_OPEN
VIDEO_VIEW
JOB_CARD_VIEW
CTA_CLICK

FOLLOW_CREATED
FOLLOW_REMOVED
POST_REACTION
POST_COMMENT

COPY_LINK
SHORT_LINK_OPEN
QR_OPEN
POSTER_DOWNLOAD
CAMPAIGN_VIEW
CAMPAIGN_JOB_CLICK
CAMPAIGN_CTA_CLICK
```

Canonical business events:

```text
APPLICATION_CREATED
PLACEMENT_CASE_OPENED
PLACEMENT_CONFIRMED
PLACEMENT_EFFECTIVE
```

Business events must come from V7 canonical sources, not recreated by analytics.

---

## V96-002 — AnalyticsEvent envelope

Conceptual:

```text
eventId
eventType
occurredAt

actorKey?
anonymousSessionKey?

recruiterProfileId?
postId?
jobPostingId?
campaignId?

distributionTarget?
channel?

correlationKey?
sourceEventId?

metadata
schemaVersion
```

Only approved metadata.

---

## V96-003 — Event idempotency

Duplicate delivery/retry must not double-count.

Use:

```text
eventId
sourceEventId
or deterministic dedupe key
```

depending event source.

---

## V96-004 — Event schema validation

Each event type has one schema/version.

Reject ungoverned arbitrary metadata.

---

# 4. V9.6b — METRIC GOVERNANCE

## V96-010 — MetricDefinition catalog

**Type:** Metric governance  
**Priority:** BLOCKER

Conceptual:

```text
key
name
description
version

scope
numerator definition
denominator definition
time window
filters
privacy policy
status
```

Reuse/extend V8.4 MetricDefinition pattern.

---

## V96-011 — Core creator metrics

Initial examples:

```text
PROFILE_VIEWS
POST_VIEWS
POST_ENGAGEMENT_RATE
FOLLOWERS_GAINED
JOB_CTA_CLICKS
APPLICATION_STARTS
APPLICATIONS_CREATED
PLACEMENTS_EFFECTIVE
```

---

## V96-012 — Conversion metrics

Examples:

```text
POST_TO_JOB_CTR
JOB_TO_APPLICATION_CONVERSION
POST_TO_APPLICATION_CONVERSION
APPLICATION_TO_EFFECTIVE_PLACEMENT
CAMPAIGN_TO_APPLICATION_CONVERSION
CAMPAIGN_TO_EFFECTIVE_PLACEMENT
```

Each needs an explicit denominator.

---

## V96-013 — Metric versioning

If metric logic changes:

```text
v1 remains reproducible
v2 becomes new definition
```

Do not silently rewrite old dashboards.

---

# 5. V9.6c — CREATOR DASHBOARD

## V96-020 — Recruiter analytics workspace

Suggested tabs:

```text
Overview
Content
Jobs
Campaigns
Audience
Conversion
```

---

## V96-021 — Overview cards

Potential:

```text
Profile views
Post views
Followers gained
Job CTA clicks
Applications created
Effective placements
```

Time range selector:

```text
7d
30d
90d
custom
```

---

## V96-022 — Trend charts

Examples:

```text
views over time
applications over time
placements over time
followers over time
```

No chart should imply causality where only correlation exists.

---

## V96-023 — Comparison periods

Optional:

```text
previous period
same-length prior window
```

Clearly label comparison basis.

---

# 6. V9.6d — CONTENT PERFORMANCE

## V96-030 — PostPerformanceReadModel

Conceptual:

```text
postId
postType
publishedAt

impressions
opens
engagements
jobClicks
applicationStarts
applications
effectivePlacements
```

---

## V96-031 — Top content

Recruiter may sort by explicit metric:

```text
views
engagement
job clicks
applications
effective placements
```

Do not collapse into one opaque “best post score.”

---

## V96-032 — Content-type breakdown

Examples:

```text
TEXT
JOB
MULTI_JOB
VIDEO
GUIDE
SUCCESS_STORY
```

Compare:

```text
views
CTR
application conversion
placement conversion
```

---

## V96-033 — Job-content linkage

When post references multiple jobs:

```text
job-specific click/application metrics
```

must remain distinguishable.

Avoid attributing every downstream application to every job in the collection.

---

# 7. V9.6e — RECRUITMENT CONVERSION FUNNEL

## V96-040 — Funnel model

Recommended conceptual funnel:

```text
Exposure
→ Engagement
→ Job Intent
→ Application
→ Placement
```

Concrete stages:

```text
POST_VIEW
JOB_CARD_VIEW
CTA_CLICK
APPLICATION_CREATED
PLACEMENT_EFFECTIVE
```

---

## V96-041 — Identity/correlation rules

Correlate only with supported evidence:

```text
session/correlation token
canonical application source context
approved AFF/click context
authenticated actor where available
```

Do not guess identity across devices/sessions.

---

## V96-042 — Unknown attribution bucket

If connection is not supportable:

```text
UNKNOWN
```

must remain a valid bucket.

Never force every Application into a social Post/Campaign.

---

## V96-043 — Canonical outcome join

Placement outcome source:

```text
Placement EFFECTIVE
```

not recruiter self-report.

For direct-hire/client-managed flow:

```text
Placement EFFECTIVE still valid
Worker/Assignment not required
```

This preserves V7 service-model semantics.

---

## V96-044 — Funnel time window

Define allowed conversion windows explicitly.

Examples:

```text
same session
7 days
30 days
```

Do not mix windows silently.

---

# 8. V9.6f — CAMPAIGN & CHANNEL ANALYTICS

## V96-050 — CampaignPerformanceReadModel

Potential:

```text
campaignId
views
jobClicks
CTA clicks
applications
effective placements
```

---

## V96-051 — Channel breakdown

Potential:

```text
HRP_TIMELINE
SHORT_LINK
QR
FACEBOOK_SHARE
ZALO_SHARE
DIRECT
UNKNOWN
```

Channel is traffic source classification, not ReferralAttribution authority.

---

## V96-052 — Poster/QR analytics

Possible:

```text
QR opens
short-link opens
poster downloads
poster-linked visits
```

Be explicit about what is measured versus inferred.

---

## V96-053 — Campaign job breakdown

Per canonical JobPosting:

```text
views
clicks
applications
placements
```

---

# 9. V9.6g — INSIGHT READ MODELS

## V96-060 — ContentInsightReadModel

Examples of deterministic insights:

```text
Video posts had higher application conversion than text posts in selected period.
Job collections produced more job-card clicks.
Bắc Ninh job posts generated more applications.
```

Only emit if sample size meets configured threshold.

---

## V96-061 — Best-time insight

Potential:

```text
day-of-week
hour bucket
```

Compare post performance by publication time.

Require minimum event volume.

---

## V96-062 — Job/category insight

Potential:

```text
location
job category
work type
```

based on canonical Job dimensions.

---

## V96-063 — Recommendation boundary

V9.6 may generate deterministic suggestions:

```text
"Your VIDEO posts had higher CTA rate over the past 30 days."
```

Do not claim:

```text
"Video will definitely perform better."
```

Predictive/AI wording belongs to V9.7.

---

# 10. PRIVACY / SECURITY / PERFORMANCE

## V96-070 — Analytics permissions

Suggested:

```text
creator_analytics.read_self
creator_analytics.read_team
creator_analytics.read_admin
```

Scope must use canonical actor/workspace context.

---

## V96-071 — Audience privacy

Do not expose individual follower/candidate behavior unless product policy explicitly permits and lawful.

Prefer aggregates.

---

## V96-072 — Small cohort suppression

Optional threshold:

```text
do not expose segmented aggregate below N
```

for privacy-sensitive dimensions.

---

## V96-073 — PII minimization

Analytics events should avoid raw:

```text
phone
email
full name
CV data
```

Use stable internal keys/correlation identifiers only where justified.

---

## V96-074 — Aggregation architecture

Do not compute all metrics from raw events in page request.

Use one or more:

```text
scheduled aggregates
incremental rollups
materialized read models
analytics tables
cache
```

depending existing stack.

---

## V96-075 — Backfill/recompute

Metric pipeline should support:

```text
safe recompute
versioned metric backfill
date-range repair
```

without rewriting canonical business tables.

---

# 11. ANALYTICS VS AFF

Critical distinction:

```text
Social analytics:
Post A → click → Application B
```

can support content performance analysis.

But canonical attribution:

```text
ReferralAttribution
```

is governed by Universal AFF/source policy.

Therefore:

```text
analytics association
!= legal/business source attribution
```

unless the canonical attribution layer explicitly confirms it.

---

# 12. ANALYTICS VS PERFORMANCE MANAGEMENT

V9.6 should NOT create:

```text
RecruiterScore
EmployeeQualityScore
automatic ranking
automatic disciplinary flag
```

If managers view team analytics, expose governed factual metrics rather than opaque judgments.

Examples:

```text
applications generated
effective placements
conversion rates
response/activity metrics where approved
```

Interpretation remains a management decision outside the analytics engine.

---

# 13. DATA QUALITY CONTROLS

## V96-080 — Event completeness monitor

Track:

```text
missing events
late events
duplicate rate
schema errors
```

---

## V96-081 — Funnel reconciliation

Periodically compare:

```text
analytics Application count
vs
canonical Application count in eligible scope
```

Flag discrepancy.

---

## V96-082 — Metric freshness

Dashboard should know:

```text
lastCalculatedAt
dataFreshness
```

Avoid presenting stale values as live.

---

# 14. PERMANENT REGRESSION FIXTURES

## RF-V96-01 — Duplicate event
Counted once.

## RF-V96-02 — Unknown traffic
Remains UNKNOWN; no forced social attribution.

## RF-V96-03 — Existing ReferralAttribution
Analytics correlation does not overwrite it.

## RF-V96-04 — Direct-hire effective placement
Counted from Placement EFFECTIVE without requiring Worker/Assignment.

## RF-V96-05 — Metric definition change
Old historical metric remains reproducible.

## RF-V96-06 — Multi-job post
Application is associated only with supported Job/Post path, not all collection jobs.

## RF-V96-07 — Small cohort
Privacy rule suppresses sensitive aggregate if threshold not met.

## RF-V96-08 — Raw PII
Not stored in analytics event payload.

## RF-V96-09 — Dashboard query
Does not scan full raw history synchronously.

## RF-V96-10 — Campaign traffic
Does not become ReferralAttribution.

## RF-V96-11 — Stale aggregate
Freshness indicator visible/correct.

## RF-V96-12 — Placement correction
Analytics recompute updates projection without mutating canonical Placement.

## RF-V96-13 — Team analytics
Unauthorized recruiter cannot view another recruiter's private metrics.

## RF-V96-14 — Insight sample size
No “best time/content” insight below minimum threshold.

---

# 15. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
analytics-service.ts doing events + metrics + dashboards + insights
metric formulas scattered in UI
SQL copied into every dashboard card
```

Suggested structure:

```text
creator-analytics/
  events/
    catalog/
    ingestion/

  metrics/
    definitions/
    computation/

  aggregates/
    repositories/
    jobs/

  dashboards/
    recruiter/
    team/

  funnels/
    correlation/
    queries/

  insights/
    deterministic/

  quality/
    reconciliation/
    freshness/
```

Metric definitions must have one canonical authority.

---

# 16. V9.6 EXIT GATE

## Events

```text
[ ] governed event catalog
[ ] schema validation
[ ] idempotent ingestion
```

## Metrics

```text
[ ] MetricDefinition catalog
[ ] versioning
[ ] explicit denominators/windows
```

## Creator dashboard

```text
[ ] overview
[ ] content
[ ] campaigns
[ ] audience
[ ] conversion
```

## Funnel

```text
[ ] post/job/click/application/placement linkage
[ ] UNKNOWN bucket
[ ] explicit conversion window
[ ] canonical Placement EFFECTIVE outcome
```

## Campaign/channel

```text
[ ] campaign metrics
[ ] channel breakdown
[ ] QR/short-link analytics
```

## Insights

```text
[ ] content-type insights
[ ] publication-time insights
[ ] minimum sample thresholds
```

## Privacy/Performance

```text
[ ] scoped permissions
[ ] no raw PII
[ ] aggregation/read models
[ ] freshness indicators
[ ] recompute/backfill
```

## Regression

```text
[ ] RF-V96-01 through RF-V96-14 pass
```

---

# 17. HANDOFF TO V9.7

V9.7 owns AI Content Assistant.

It may consume:

```text
canonical Job facts
recruiter public profile
approved templates
governed V9.6 analytics insights
```

to help create:

```text
captions
social posts
video scripts
FAQ drafts
channel-specific variants
```

AI must remain advisory/draft-first and may not invent canonical Job facts.

---

# 18. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V96-001 through V96-004

Batch B
V96-010 through V96-013

Batch C
V96-020 through V96-033

Batch D
V96-040 through V96-044

Batch E
V96-050 through V96-063

Batch F
V96-070 through V96-082

Batch G
RF-V96-01 through RF-V96-14
V9.6 EXIT GATE
```

---

# 19. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
AnalyticsReferralAttribution
RecruiterPerformanceScore
CampaignCommissionOwner
PostBusinessPriority
```

Do NOT:

```text
infer source without evidence
rewrite canonical attribution
use analytics to mutate PlacementCase
hide metric formula/denominator
rank recruiters opaquely
```

---

# 20. PRODUCT OUTCOME

After V9.6, recruiters should be able to answer:

```text
Which posts get attention?
Which jobs get clicks?
Which content creates applications?
Which campaigns create effective placements?
Which channels are actually useful?
```

while HRP keeps a strict separation between:

```text
analytics explanation
and
business authority
```

That separation allows V9 to become data-driven without corrupting V7/V8 domain truth.
