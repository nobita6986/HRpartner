# HRP V9 — MICRO-STEP EXECUTION PLAN

**Status:** Execution plan  
**Applies to:** V9.0 → V9.8  
**Primary use:** AI Coding handoff  
**Prerequisites:** V7/V8 foundations available, V9 Master Plan v1.1, all V9 phase backlogs  
**Cross-cutting authority:** `AI_CODING_GUARDRAILS.md`

---

# 0. PURPOSE

This document converts the V9 architecture/backlogs into small implementation steps suitable for AI coding.

The governing execution rule is:

> **One micro-step = one narrow goal, one bounded change, one evidence package.**

Do not hand the coding AI an entire V9 phase at once.

Recommended handoff size:

```text
1–3 micro-steps per coding session
```

Only increase batch size when the steps are trivial, tightly related, and already well-covered by tests.

---

# 1. REQUIRED DOCUMENT ORDER

Before implementing V9, coding AI must read:

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
13. Universal Affiliate canonical plan
14. Relevant V8 backlogs and discovery reports
```

If actual repository behavior conflicts with the documents, stop and report the conflict.

Do not silently “fix” architecture by inventing a new authority.

---

# 2. GLOBAL EXECUTION RULES

Every micro-step must:

```text
have one narrow purpose
touch the minimum number of modules
reuse existing canonical services
avoid unrelated refactors
include tests/evidence
report blockers
respect file-size guardrails
avoid scattered hardcoding
```

Every implementation response/report must include:

```text
Micro-step ID
Goal
Files changed
Schema/migration changes
Commands/queries added or changed
Permission/security impact
Tests run
Evidence
Known limitations
File-size review
Hardcoding review
Blockers / next prerequisite
```

---

# 3. STOP CONDITIONS

Coding AI must STOP and report rather than inventing a workaround when:

```text
required canonical V7 command does not exist
V8 public profile capability materially differs
Universal AFF capability assumed by V9 is absent
AFF semantics are unresolved
JobPosting public projection is missing/unsafe
permission/RLS boundary is unclear
schema materially differs from plan
migration conflicts with existing data
existing module ownership conflicts with V9 boundary
implementation requires a large unrelated refactor
a proposed file would become a god module
business decision is unresolved
```

Required output when blocked:

```text
BLOCKED
Reason
Observed repository evidence
Expected contract
Risk of proceeding
Required prerequisite
Suggested next micro-step after resolution
```

No substitute authority.

No duplicate model merely to “make progress”.

---

# 4. V9 DISCOVERY GATE — BEFORE PRODUCTION CODE

Do not implement V9 production features before this gate.

## MS-V9-D00 — Repository structure inventory

Inspect:

```text
backend modules
frontend apps/routes
public profile/microsite modules
media infrastructure
auth/RBAC/RLS
notification infrastructure
analytics/event infrastructure
scheduler/outbox
feature flags
tests
migrations
design system
```

**Output:** repository module map.

---

## MS-V9-D01 — V8 capability verification

Verify actual implementation of:

```text
RecruiterPublicProfile
public slug
public JobPosting projection
workspace/ActorContext
notification preferences
deep links
media infrastructure
public rendering
feature flags
```

Classify each:

```text
IMPLEMENTED
PARTIAL
LEGACY_ONLY
NOT_IMPLEMENTED
CONFLICT
UNKNOWN
```

---

## MS-V9-D02 — Universal AFF implementation reality check

Verify:

```text
User.affCode
link generation
public redirect
signed attribution
first-valid-source policy
ReferralAttribution
handling relationship
public Apply integration
```

Do not assume plan == implementation.

---

## MS-V9-D03 — Public security/SEO/media inventory

Verify:

```text
public route safety
public DTO patterns
sanitization
OpenGraph
canonical URLs
image/media upload
CDN/storage
external links
rate limiting
```

---

## MS-V9-D04 — Event/analytics/scheduler inventory

Verify:

```text
event bus/outbox
analytics event ingestion
MetricDefinition
scheduler
retry/DLQ
notification delivery
observability
```

---

## MS-V9-D05 — Baseline build/test

Run relevant:

```text
typecheck
lint
unit tests
integration tests
RLS/security tests
migration validation
frontend build
```

Classify baseline:

```text
GREEN
YELLOW
RED
ENV_BLOCKED
```

---

# 5. DISCOVERY GATE OUTPUTS

Required files:

```text
V9_DISCOVERY_REPORT.md
V9_CAPABILITY_MATRIX.md
V9_REPO_MODULE_MAP.md
V9_BASELINE_TEST_REPORT.md
V9_BLOCKER_REGISTER.md
```

V9 coding may start only when the next micro-step is clearly safe.

---

# 6. V9.0 — SOCIAL PUBLISHING FOUNDATION

## MS-V9-0001 — Confirm Social Publishing module location

Identify canonical backend/frontend module placement.

No schema change yet.

---

## MS-V9-0002 — Add SocialPost type definitions

Create centralized:

```text
PostType
PublicationStatus
Visibility
```

No persistence yet.

---

## MS-V9-0003 — Add SocialPost schema

Implement minimum schema from V9.0.

Migration additive.

---

## MS-V9-0004 — Add repository interface

Create bounded SocialPost repository contract.

No HTTP route yet.

---

## MS-V9-0005 — Add create draft command

Implement:

```text
createSocialPostDraft()
```

Self-author scope only.

---

## MS-V9-0006 — Add update draft command

Include:

```text
version/concurrency
author scope
status validation
```

---

## MS-V9-0007 — Add PostBlock types

Centralize approved block catalog.

---

## MS-V9-0008 — Add block validators

One validator per block type.

Reject arbitrary payload.

---

## MS-V9-0009 — Add safe rich-text representation

Use existing structured text system if present.

Do not introduce raw executable HTML.

---

## MS-V9-0010 — Add canonical Job reference contract

Reference `JobPosting` by ID only.

---

## MS-V9-0011 — Verify promotable Job query

Create/reuse safe query determining whether recruiter may promote a Job.

---

## MS-V9-0012 — Add dynamic JobCard public query adapter

Reuse canonical Job projection.

No copied salary/location authority.

---

## MS-V9-0013 — Implement publish command

Add:

```text
publishSocialPost()
```

with validation.

---

## MS-V9-0014 — Implement unpublish/archive commands

Named commands only.

---

## MS-V9-0015 — Implement scheduling metadata

Add scheduled state/time contract.

---

## MS-V9-0016 — Implement scheduler execution

Idempotent scheduled publish.

---

## MS-V9-0017 — Implement cancel/reschedule

No generic status/timestamp patch.

---

## MS-V9-0018 — Add public TimelinePostReadModel

Only public-safe fields.

---

## MS-V9-0019 — Add recruiter timeline query

Cursor pagination.

No UI yet.

---

## MS-V9-0020 — Add public post detail query

Public-safe projection only.

---

## MS-V9-0021 — Integrate media references

Reuse existing media infrastructure.

---

## MS-V9-0022 — Add renderer registry foundation

Map block type → renderer.

No giant switch file.

---

## MS-V9-0023 — Add moderation hold

Minimal moderation state/commands.

---

## MS-V9-0024 — Add V9.0 permissions and scope tests

Self-author and moderator boundaries.

---

## MS-V9-0025 — Add V9.0 regression suite

Implement RF-V90 fixtures.

---

## GATE-V9.0

PASS only if:

```text
draft/publish/schedule lifecycle works
Job references stay canonical
public read models are safe
scheduler idempotent
moderation hold works
regressions pass
```

---

# 7. V9.1 — RECRUITER TIMELINE

## MS-V9-0101 — Confirm public recruiter route integration

Reuse V8 public slug/profile.

---

## MS-V9-0102 — Build timeline shell

Profile header + navigation + feed placeholder.

---

## MS-V9-0103 — Render first TEXT post card

Prove one-card vertical slice.

---

## MS-V9-0104 — Generalize Base SocialPostCard

Extract shared post chrome.

---

## MS-V9-0105 — Add GUIDE card

Excerpt + read more.

---

## MS-V9-0106 — Add SUCCESS_STORY card

Verified claims only where supported.

---

## MS-V9-0107 — Add Q&A display card

No comments yet.

---

## MS-V9-0108 — Add canonical JobPost card

Editorial content + dynamic JobCard.

---

## MS-V9-0109 — Add MultiJob card

Batch Job projection.

---

## MS-V9-0110 — Add closed Job behavior

Historical post visible; Apply inactive.

---

## MS-V9-0111 — Add image post renderer

Lazy loading + alt text.

---

## MS-V9-0112 — Add video renderer

Approved video sources only.

---

## MS-V9-0113 — Add pinned post persistence

Minimal experience state.

---

## MS-V9-0114 — Add pin/unpin commands

Self scope.

---

## MS-V9-0115 — Add pinned area UI

Avoid immediate duplicate in feed.

---

## MS-V9-0116 — Add timeline filters

```text
ALL
JOBS
VIDEOS
GUIDES
```

---

## MS-V9-0117 — Add Jobs tab

Canonical job/post projection.

---

## MS-V9-0118 — Add Videos/Guides tabs

Only when content exists.

---

## MS-V9-0119 — Add post detail route

Reuse same renderer.

---

## MS-V9-0120 — Add OpenGraph metadata

Safe public data.

---

## MS-V9-0121 — Add cursor/infinite loading UI

Preserve back navigation position where possible.

---

## MS-V9-0122 — Add batched JobCard hydration

Prove no N+1.

---

## MS-V9-0123 — Mobile timeline pass

Single-column/touch usability.

---

## MS-V9-0124 — Add analytics hooks only

Emit non-authoritative events.

---

## MS-V9-0125 — V9.1 regression suite

Implement RF-V91 fixtures.

---

## GATE-V9.1

PASS only if public timeline is:

```text
safe
mobile-usable
cursor-paginated
canonical-Job-driven
free of social engagement side effects
```

---

# 8. V9.2 — PROFILE, PERSONAL BRAND & APPEARANCE

## MS-V9-0201 — Verify public profile extension points

No schema change before confirming V8 model.

---

## MS-V9-0202 — Add specialization taxonomy contract

Reuse canonical catalogs where possible.

---

## MS-V9-0203 — Add specialization persistence/query

Public-safe.

---

## MS-V9-0204 — Add verified recruiter derivation

No self-claim field.

---

## MS-V9-0205 — Add mandatory HRP trust component

Platform-owned.

---

## MS-V9-0206 — Add ThemePreset catalog

Centralized tokens.

---

## MS-V9-0207 — Add approved accent palette

No arbitrary CSS.

---

## MS-V9-0208 — Add contrast validator

Centralized accessibility check.

---

## MS-V9-0209 — Add LayoutPreset catalog

```text
SOCIAL_TIMELINE
RECRUITER_PROFESSIONAL
JOB_FIRST
CREATOR
```

---

## MS-V9-0210 — Implement Social Timeline layout

Reuse V9.1 feed.

---

## MS-V9-0211 — Implement Recruiter Professional layout

No business duplication.

---

## MS-V9-0212 — Implement Job-first layout

Canonical Jobs only.

---

## MS-V9-0213 — Implement Creator layout

Reuse media/timeline.

---

## MS-V9-0214 — Add SectionCatalog

Stable section keys.

---

## MS-V9-0215 — Add section ordering

Move Up/Down command/UI.

---

## MS-V9-0216 — Add section visibility

Mandatory trust cannot be hidden.

---

## MS-V9-0217 — Add RecruiterAppearancePreference

Prefer normalized validated model.

---

## MS-V9-0218 — Add appearance draft command

No public side effect.

---

## MS-V9-0219 — Add live desktop preview

Same renderer as public.

---

## MS-V9-0220 — Add mobile preview

Same responsive rules.

---

## MS-V9-0221 — Add publish appearance command

Validate theme/layout/contrast/mandatory sections.

---

## MS-V9-0222 — Add reset/revert

Concurrency-safe.

---

## MS-V9-0223 — Add portfolio projection

Canonical V7 outcomes; public allow-list.

---

## MS-V9-0224 — Add client confidentiality filter

No private client data.

---

## MS-V9-0225 — Add testimonial model

Moderated.

---

## MS-V9-0226 — Add verified-placement testimonial rule

Only canonical Placement evidence.

---

## MS-V9-0227 — V9.2 accessibility/mobile audit

All layouts.

---

## MS-V9-0228 — V9.2 regression suite

Implement RF-V92 fixtures.

---

## GATE-V9.2

PASS only if:

```text
themes/layouts work
appearance cannot alter truth
mandatory trust is preserved
portfolio/testimonials are public-safe
all layouts remain accessible/mobile-safe
```

---

# 9. V9.3 — CONTENT STUDIO & SCHEDULING

## MS-V9-0301 — Build Content Studio shell

Routes/navigation only.

---

## MS-V9-0302 — Build base composer

Use V9.0 SocialPost blocks.

---

## MS-V9-0303 — Add Create from Job query

Promotable canonical jobs only.

---

## MS-V9-0304 — Add single-Job draft flow

Create `JOB_REFERENCE`.

---

## MS-V9-0305 — Add multi-Job draft flow

Create `JOB_COLLECTION`.

---

## MS-V9-0306 — Add ContentTemplate model/catalog

No arbitrary expression language.

---

## MS-V9-0307 — Add first template

Example `NEW_JOB`.

---

## MS-V9-0308 — Generalize template renderer

Approved variables only.

---

## MS-V9-0309 — Add initial template catalog

Urgent/high salary/etc.

---

## MS-V9-0310 — Add draft list

Filter/search.

---

## MS-V9-0311 — Add autosave

Concurrency-safe.

---

## MS-V9-0312 — Add duplicate draft

New draft ID.

---

## MS-V9-0313 — Add timeline-card preview

Same renderer.

---

## MS-V9-0314 — Add post-detail preview

Same renderer.

---

## MS-V9-0315 — Add desktop/mobile preview context

Use V9.2 appearance.

---

## MS-V9-0316 — Add schedule UI

Canonical command.

---

## MS-V9-0317 — Add reschedule/cancel UI

Named commands.

---

## MS-V9-0318 — Add scheduled list

Date/time + status.

---

## MS-V9-0319 — Add calendar read model

Range query.

---

## MS-V9-0320 — Add Month/Week/Agenda calendar

Mobile Agenda default if appropriate.

---

## MS-V9-0321 — Optional drag reschedule

Must call command, not patch.

---

## MS-V9-0322 — Add scheduler failure state UI

No false “published”.

---

## MS-V9-0323 — Integrate media picker

Reuse existing media.

---

## MS-V9-0324 — Add deterministic repurpose

No AI yet.

---

## MS-V9-0325 — Add scheduled-Job revalidation

Closed Job safety.

---

## MS-V9-0326 — V9.3 regression suite

Implement RF-V93 fixtures.

---

## GATE-V9.3

PASS only if recruiter can:

```text
create
draft
preview
schedule
calendar-manage
publish
```

without AI and without duplicating Job truth.

---

# 10. V9.4 — ENGAGEMENT & AUDIENCE

## MS-V9-0401 — Add RecruiterFollower model

Authenticated actors first.

---

## MS-V9-0402 — Add follow command

Idempotent.

---

## MS-V9-0403 — Add unfollow command

No attribution side effect.

---

## MS-V9-0404 — Add follow UI/count

Privacy-safe.

---

## MS-V9-0405 — Add AudienceSubscription model

Validated types/filters.

---

## MS-V9-0406 — Add recruiter post/job subscriptions

Minimal useful subset.

---

## MS-V9-0407 — Add location/category subscription

Reuse canonical taxonomy.

---

## MS-V9-0408 — Add PostReaction model

```text
LIKE
INTERESTED
HELPFUL
```

---

## MS-V9-0409 — Add react/change/remove commands

One reaction per actor/post.

---

## MS-V9-0410 — Add reaction counts UI

No Application inference.

---

## MS-V9-0411 — Add RecruiterFAQ model

---

## MS-V9-0412 — Add FAQ management/public display

---

## MS-V9-0413 — Add private Q&A routing

Reuse Omnichannel/contact flow.

---

## MS-V9-0414 — Verify comment moderation prerequisites

STOP if moderation/report/rate-limit missing.

---

## MS-V9-0415 — Add PostComment model

Only after prerequisite PASS.

---

## MS-V9-0416 — Add create/delete/report comment

---

## MS-V9-0417 — Add moderator comment actions

Auditable.

---

## MS-V9-0418 — Add social notification event catalog

---

## MS-V9-0419 — Reuse V8 notification preferences

No second preference system.

---

## MS-V9-0420 — Add notification dedupe/deep links

---

## MS-V9-0421 — Add RecruiterAudienceReadModel

Aggregate only.

---

## MS-V9-0422 — Add rate limits/spam controls

---

## MS-V9-0423 — Add follower privacy tests

---

## MS-V9-0424 — V9.4 regression suite

Implement RF-V94 fixtures.

---

## GATE-V9.4

PASS only if:

```text
follow/subscriptions/reactions work
comments only enabled with moderation
privacy is safe
no social interaction mutates attribution/handling/application
```

---

# 11. V9.5 — DISTRIBUTION & CAMPAIGNS

## MS-V9-0501 — Verify Universal AFF capability

STOP if missing and required for attributed links.

---

## MS-V9-0502 — Add ShareAction registry

---

## MS-V9-0503 — Add centralized destination resolver

No UI URL building.

---

## MS-V9-0504 — Add Copy Link/share metadata

---

## MS-V9-0505 — Add ShortLink model

Controlled destinations only.

---

## MS-V9-0506 — Add short-link resolver route

Safe redirect.

---

## MS-V9-0507 — Add link disable/expiry

---

## MS-V9-0508 — Add QR generator

Profile/Job/Post.

---

## MS-V9-0509 — Add Campaign QR

---

## MS-V9-0510 — Add optional AFF decoration adapter

Feature-gated.

---

## MS-V9-0511 — Add poster template catalog

---

## MS-V9-0512 — Add single-Job poster

Canonical facts only.

---

## MS-V9-0513 — Add multi-Job poster

---

## MS-V9-0514 — Add recruiter-brand poster

---

## MS-V9-0515 — Add poster QR/live truth hint

---

## MS-V9-0516 — Add RecruitmentCampaign model

---

## MS-V9-0517 — Add Campaign Job references

---

## MS-V9-0518 — Add Campaign Post references

---

## MS-V9-0519 — Add campaign lifecycle commands

Named commands.

---

## MS-V9-0520 — Add public campaign route

---

## MS-V9-0521 — Add campaign landing projection

Batch canonical Jobs/Posts.

---

## MS-V9-0522 — Add campaign appearance override

Presentation only.

---

## MS-V9-0523 — Add DistributionEvent catalog

---

## MS-V9-0524 — Add UTM-like analytics tags

Analytics only.

---

## MS-V9-0525 — Add external distribution port

No provider-specific logic in domain.

---

## MS-V9-0526 — Add one share/deep-link adapter proof

Prefer low-risk adapter.

---

## MS-V9-0527 — Add adapter failure behavior

No state corruption.

---

## MS-V9-0528 — V9.5 regression suite

Implement RF-V95 fixtures.

---

## GATE-V9.5

PASS only if:

```text
share/short-link/QR/poster/campaign work
Universal AFF remains attribution authority
redirect security passes
campaign remains marketing-only
```

---

# 12. V9.6 — CREATOR ANALYTICS

## MS-V9-0601 — Inventory existing analytics event pipeline

Confirm reuse.

---

## MS-V9-0602 — Add V9 event catalog

Versioned schemas.

---

## MS-V9-0603 — Add event ingestion/dedupe

---

## MS-V9-0604 — Extend MetricDefinition catalog

Reuse V8.4.

---

## MS-V9-0605 — Add basic creator metrics

Views/followers/clicks.

---

## MS-V9-0606 — Add canonical Application outcome join

Evidence-based correlation only.

---

## MS-V9-0607 — Add canonical Placement EFFECTIVE join

Support client-managed direct hire.

---

## MS-V9-0608 — Add UNKNOWN bucket

Never force attribution.

---

## MS-V9-0609 — Add explicit conversion windows

---

## MS-V9-0610 — Build creator Overview read model

---

## MS-V9-0611 — Build Content performance read model

---

## MS-V9-0612 — Build Campaign performance read model

---

## MS-V9-0613 — Add channel breakdown

Traffic classification only.

---

## MS-V9-0614 — Add conversion funnel view

---

## MS-V9-0615 — Add deterministic content-type insight

Minimum sample threshold.

---

## MS-V9-0616 — Add publication-time insight

---

## MS-V9-0617 — Add privacy/small-cohort controls

---

## MS-V9-0618 — Add aggregate/materialized computation

Avoid raw scans per request.

---

## MS-V9-0619 — Add freshness indicator

---

## MS-V9-0620 — Add recompute/backfill tool

Analytics tables only.

---

## MS-V9-0621 — Add reconciliation monitor

Canonical vs analytics counts.

---

## MS-V9-0622 — V9.6 regression suite

Implement RF-V96 fixtures.

---

## GATE-V9.6

PASS only if:

```text
metrics are governed/versioned
funnel uses canonical outcomes
UNKNOWN remains possible
no opaque recruiter score
dashboard avoids raw-history scans
```

---

# 13. V9.7 — AI CONTENT ASSISTANT

## MS-V9-0701 — Verify AI provider abstraction

Reuse V7.10 foundation if implemented.

---

## MS-V9-0702 — Add AI capability registry

No generic `askAI(anything)`.

---

## MS-V9-0703 — Add AIContentContext

Bounded DTO.

---

## MS-V9-0704 — Add canonical JobFacts DTO

Public-safe only.

---

## MS-V9-0705 — Add context provenance

---

## MS-V9-0706 — Add prompt registry/versioning

No scattered prompts.

---

## MS-V9-0707 — Add structured output schema

GeneratedPostDraft.

---

## MS-V9-0708 — Implement single Job post generation

Draft only.

---

## MS-V9-0709 — Add tone/length presets

---

## MS-V9-0710 — Add fact validator

Salary/location/benefits/etc.

---

## MS-V9-0711 — Add Facebook repurpose

---

## MS-V9-0712 — Add Zalo repurpose

---

## MS-V9-0713 — Add TikTok script

---

## MS-V9-0714 — Add video 15/30/60s scripts

---

## MS-V9-0715 — Add FAQ generator

Unsupported facts omitted/flagged.

---

## MS-V9-0716 — Add Guide generator

Approved HRP process knowledge only.

---

## MS-V9-0717 — Add V9.6 insight context adapter

Governed metrics only.

---

## MS-V9-0718 — Add analytics-guided suggestion

No certainty claims.

---

## MS-V9-0719 — Add human review boundary

AI cannot publish directly.

---

## MS-V9-0720 — Add publish-time Job fact revalidation

---

## MS-V9-0721 — Add generation audit metadata

No hidden chain-of-thought storage.

---

## MS-V9-0722 — Add evaluation fixtures

---

## MS-V9-0723 — Add hallucination regression checks

---

## MS-V9-0724 — Add quota/rate control

---

## MS-V9-0725 — Add provider outage fallback

Manual studio works.

---

## MS-V9-0726 — V9.7 regression suite

Implement RF-V97 fixtures.

---

## GATE-V9.7

PASS only if:

```text
AI is optional
output is draft-first
facts are validated
PII minimized
prompts versioned
manual workflow survives provider outage
```

---

# 14. V9.8 — SOCIAL PLATFORM HARDENING

## MS-V9-0801 — Add ModerationCase model

Do not reuse PlacementCase.

---

## MS-V9-0802 — Add moderation queue query

---

## MS-V9-0803 — Add moderation commands

Hold/release/unpublish/suspend/restore.

---

## MS-V9-0804 — Add moderation audit

---

## MS-V9-0805 — Centralize rate-limit policies

---

## MS-V9-0806 — Add spam/link safety rules

---

## MS-V9-0807 — Add report workflow

---

## MS-V9-0808 — Audit public DTO allow-lists

All V9 public endpoints.

---

## MS-V9-0809 — Audit candidate PII exposure

Follower/comment/analytics/testimonial.

---

## MS-V9-0810 — Add canonical URL policy

---

## MS-V9-0811 — Add SEO indexability policy

Draft/held/suspended excluded.

---

## MS-V9-0812 — Add sitemap generation

---

## MS-V9-0813 — Add Job structured-data safety

Closed jobs excluded/updated.

---

## MS-V9-0814 — Measure public performance baseline

Timeline/profile/campaign/post detail.

---

## MS-V9-0815 — Define cache invalidation matrix

---

## MS-V9-0816 — Add media/CDN optimization

Measured only.

---

## MS-V9-0817 — Add N+1 regression checks

---

## MS-V9-0818 — Large recruiter load test

1,000+ posts scenario.

---

## MS-V9-0819 — Accessibility audit all layouts

---

## MS-V9-0820 — Add keyboard/non-drag alternatives

---

## MS-V9-0821 — Add notification reliability audit

Dedupe/retry/preferences.

---

## MS-V9-0822 — Add DLQ/reconciliation visibility

Where infrastructure supports it.

---

## MS-V9-0823 — Centralize operational error taxonomy

---

## MS-V9-0824 — Add PII-safe structured logging

---

## MS-V9-0825 — Add operational metrics

Publishing/scheduler/cache/AI/notifications.

---

## MS-V9-0826 — Validate AI outage mode

---

## MS-V9-0827 — Validate analytics outage mode

---

## MS-V9-0828 — Validate external social outage mode

---

## MS-V9-0829 — Validate AFF unavailable mode

No fake attribution.

---

## MS-V9-0830 — Validate notification outage mode

---

## MS-V9-0831 — Cross-phase security review

V9.0–V9.7.

---

## MS-V9-0832 — Cross-phase performance review

---

## MS-V9-0833 — Run RF-V98 suite

20 hardening fixtures.

---

## MS-V9-0834 — Re-run all phase regression gates

V9.0–V9.7.

---

## GATE-V9.8 / FINAL V9 GATE

PASS only if:

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

and the system still preserves:

```text
V7 = canonical business truth
V8 = workspace/experience infrastructure
V9 = social recruiting/creator/distribution
Universal AFF = attribution authority
```

---

# 15. MIGRATION RULES

All V9 migrations must be:

```text
additive
idempotent where tooling allows
reviewable
backward-compatible during rollout where practical
```

Before backfill:

```text
dry-run
count affected rows
report ambiguous rows
fail closed
```

Do not fabricate:

```text
followers
attribution
campaign history
testimonials
analytics events
```

for historical data.

---

# 16. FEATURE FLAG STRATEGY

Recommended flags:

```text
V9_SOCIAL_TIMELINE_ENABLED
V9_PROFILE_CUSTOMIZATION_ENABLED
V9_APPEARANCE_THEMES_ENABLED
V9_LAYOUT_PRESETS_ENABLED
V9_SECTION_CUSTOMIZATION_ENABLED
V9_CONTENT_STUDIO_ENABLED
V9_FOLLOW_ENABLED
V9_REACTIONS_ENABLED
V9_COMMENTS_ENABLED
V9_CAMPAIGNS_ENABLED
V9_CREATOR_ANALYTICS_ENABLED
V9_AI_CONTENT_ENABLED
```

Flags control rollout only.

They do not create alternative business logic.

---

# 17. TEST EVIDENCE RULES

Each micro-step must run the narrowest relevant evidence.

Examples:

```text
schema step
→ migration validation + repository test

command step
→ unit/integration command tests

public projection
→ authorization/public DTO tests

UI step
→ typecheck/build + component/e2e where available

security step
→ negative authorization tests

performance step
→ query count/timing evidence

AI step
→ fixture evaluation + fact-safety tests
```

Never claim “tested” without listing the command/result or equivalent evidence.

---

# 18. FILE-SIZE / HARDCODING REVIEW

Every coding report must explicitly answer:

```text
Did any production source file exceed ~300–350 lines?
Did any file exceed 500 lines?
Was any new generic util/god service created?
Were business rules hardcoded in UI?
Were permission strings scattered?
Were theme tokens scattered?
Were metric formulas scattered?
Were AI prompts scattered?
```

If yes, stop and refactor or explain the architectural reason.

---

# 19. IMPLEMENTATION COMPLETION REPORT TEMPLATE

```text
Micro-step:
Status: PASS | PARTIAL | BLOCKED

Goal:
...

Files changed:
...

Schema:
...

Commands/queries:
...

Permissions/security:
...

Tests/evidence:
...

Regression impact:
...

File-size review:
...

Hardcoding review:
...

Known limitations:
...

Blockers:
...

Recommended next micro-step:
...
```

---

# 20. FINAL EXECUTION PRINCIPLE

The coding AI must optimize for:

```text
correct authority
small changes
explicit contracts
testable behavior
maintainability
```

not for:

```text
maximum code volume
maximum feature count per session
fastest apparent completion
```

The target is not “finish V9 quickly”.

The target is:

> **Build V9 without weakening the V7/V8 foundation that makes V9 possible.**
