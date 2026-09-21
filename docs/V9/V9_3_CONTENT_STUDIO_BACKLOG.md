# HRP V9.3 — CONTENT STUDIO & SCHEDULING IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V9.3  
**Prerequisite:** V9.2 Exit Gate PASS  
**Depends on:** V9.0 Social Publishing Foundation, V9.1 Timeline, V9.2 Appearance  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Recruiter content creation, templating, drafts, calendar, scheduling, preview, and publishing operations

---

# 0. PURPOSE

V9.3 provides recruiters with a professional Content Studio so HRP becomes a practical daily recruitment publishing tool.

Recruiters should be able to:

```text
create posts
create posts from canonical jobs
use templates
save drafts
preview content
schedule publication
reschedule/cancel
manage content calendar
reuse media
duplicate/repurpose content
```

V9.3 does NOT yet own:

```text
Follow
Reaction
Comment
Audience subscriptions
Recruitment Campaign orchestration
AI-generated copy
```

Those belong to later V9 phases.

---

# 1. NON-NEGOTIABLE INVARIANTS

1. Content Studio edits SocialPost content only.
2. Smart Job Post references canonical JobPosting.
3. Job facts must be read from canonical Job projection.
4. Template variables are presentation variables, not business authority.
5. Draft content may contain editorial wording but cannot override canonical Job facts inside Job Cards.
6. Scheduling controls publication timing only.
7. Schedule execution must be idempotent.
8. Content calendar is a projection over draft/scheduled/published content.
9. Preview must use the same renderer/sanitization rules as public rendering.
10. Media reuse must prefer existing platform infrastructure.
11. Duplicate/repurpose creates new draft content, not linked business duplication.
12. Recruiter cannot schedule content beyond own author scope.
13. Content Studio must remain usable without AI.
14. AI content generation belongs to V9.7.
15. Theme/layout preview may be consumed from V9.2 but Content Studio does not own appearance truth.

---

# 2. DELIVERY SLICES

```text
V9.3a — Content Studio Shell
V9.3b — Smart Job Post Creation
V9.3c — Content Templates
V9.3d — Draft Management
V9.3e — Preview
V9.3f — Scheduling & Content Calendar
V9.3g — Media Library Integration
V9.3h — Duplicate / Repurpose
V9.3i — Security / Performance / Hardening
```

---

# 3. V9.3a — CONTENT STUDIO SHELL

## V93-001 — Content Studio route

Recommended Recruiter Workspace area:

```text
My Channel
  ├── Timeline
  ├── Create Post
  ├── Drafts
  ├── Scheduled
  ├── Published
  ├── Calendar
  └── Media
```

---

## V93-002 — Studio dashboard

Summary cards:

```text
Drafts
Scheduled this week
Published this week
Posts needing attention
Closed-job posts
```

These are content projections only.

---

## V93-003 — Post composer shell

Composer supports:

```text
post type
title/headline
structured blocks
media
job references
CTA
preview
save draft
publish
schedule
```

Avoid one giant monolithic form component.

---

# 4. V9.3b — SMART JOB POST CREATION

## V93-010 — Create from Job flow

Flow:

```text
Select canonical JobPosting
→ fetch safe public Job projection
→ create SocialPost DRAFT
→ attach JOB_REFERENCE block
→ generate default editorial skeleton
```

No business fact copying as authority.

---

## V93-011 — Job selection query

Recruiter may choose only jobs:

```text
publicly distributable
within allowed scope
not blocked from promotion
```

---

## V93-012 — Default Job Post skeleton

Example presentation:

```text
Headline
Intro text
Canonical Job Card
CTA
```

Editorial text may be suggested by template, but job facts remain dynamic.

---

## V93-013 — Multi-job draft flow

Recruiter selects several canonical JobPostings.

Creates:

```text
SocialPost
+
JOB_COLLECTION block
```

Use cases:

```text
Top jobs this week
Jobs in Bắc Ninh
High salary jobs
Night shift jobs
```

---

# 5. V9.3c — CONTENT TEMPLATES

## V93-020 — ContentTemplate model/catalog

**Type:** Experience/content config  
**Priority:** BLOCKER

Conceptual:

```text
id
key
name
description
supportedPostTypes
templateBlocks
variables
status
scope
version
```

---

## V93-021 — Template scope

Potential:

```text
GLOBAL_HRP
COMPANY
RECRUITER_PERSONAL
```

Initial recommendation:

```text
GLOBAL_HRP
RECRUITER_PERSONAL
```

Company-specific template governance may follow later if needed.

---

## V93-022 — Initial template catalog

Examples:

```text
URGENT_HIRING
NEW_JOB
HIGH_SALARY
NEAR_HOME
DAY_SHIFT
NIGHT_SHIFT
TOP_JOBS_WEEKLY
JOB_GUIDE
SUCCESS_STORY
FAQ
```

---

## V93-023 — Template variables

Approved variable examples:

```text
{JOB_TITLE}
{LOCATION}
{SALARY}
{BENEFITS}
{SHIFT}
{RECRUITER_NAME}
{PROFILE_LINK}
{AFF_LINK}
```

Variables resolve through safe capability adapters.

No arbitrary expression language.

---

## V93-024 — Template rendering safety

Template rendering must:

```text
escape unsafe content
resolve only approved variables
fail safely when variable unavailable
```

Do not invent missing Job facts.

---

# 6. V9.3d — DRAFT MANAGEMENT

## V93-030 — Draft list query

Filters:

```text
post type
updatedAt
contains Job
status
```

---

## V93-031 — Auto-save

Optional but recommended.

Must use:

```text
debounced save
version/concurrency check
clear save state
```

Do not silently overwrite another session.

---

## V93-032 — Draft rename/title

Allow recruiter to use internal working title separate from public headline if needed.

---

## V93-033 — Draft duplicate

```text
duplicateDraft()
```

Creates a new draft with copied editorial structure.

Canonical references remain references.

---

## V93-034 — Draft delete/archive policy

Prefer:

```text
archive/delete draft
```

according to existing data-retention policy.

Published history should not use destructive delete casually.

---

# 7. V9.3e — PREVIEW

## V93-040 — Post preview mode

Preview must render:

```text
same blocks
same JobCards
same media
same sanitization
same theme/layout context
```

as public page.

---

## V93-041 — Preview contexts

Support:

```text
Timeline Card
Post Detail
Desktop
Mobile
```

Potential later:

```text
Campaign landing
```

---

## V93-042 — Preview canonical freshness

If JobPosting changes while draft is open:

```text
preview refreshes current canonical JobCard
```

Do not preserve stale job facts silently.

---

# 8. V9.3f — SCHEDULING & CONTENT CALENDAR

## V93-050 — Schedule command UI

Uses V9.0:

```text
scheduleSocialPost()
```

Inputs:

```text
scheduledAt
timezone context
```

---

## V93-051 — Timezone policy

Scheduling should use centralized timezone handling.

Store canonical timestamp.

Display in user/workspace locale/timezone.

---

## V93-052 — Scheduled queue query

Show:

```text
scheduledAt
post type
title
job references
status
```

---

## V93-053 — Reschedule/cancel

Use canonical V9.0 commands.

---

## V93-054 — Content calendar read model

Calendar entries:

```text
drafts optionally
scheduled
published
```

Recommended default focus:

```text
scheduled
published
```

---

## V93-055 — Calendar views

Initial:

```text
Month
Week
Agenda
```

Mobile may default to Agenda.

---

## V93-056 — Calendar drag reschedule

If enabled:

```text
drag scheduled post
→ reschedule command
→ server validation
```

Not a direct timestamp patch.

---

## V93-057 — Scheduler failure visibility

If publication fails:

```text
mark operational failure state
surface retry/support action
do not pretend post published
```

Exact failure model may live in scheduler infrastructure.

---

# 9. V9.3g — MEDIA LIBRARY INTEGRATION

## V93-060 — Existing media reuse

Inspect and reuse:

```text
uploads
asset IDs
image processing
video link handling
CDN/storage
```

---

## V93-061 — Recruiter media picker

Allow recruiter to select approved existing assets from own/public scope.

---

## V93-062 — Media upload from Studio

Use same media service as V8/V9.0.

Do not create `ContentStudioMedia` storage authority.

---

## V93-063 — Media metadata

Manage:

```text
alt text
caption
asset usage
```

---

# 10. V9.3h — DUPLICATE / REPURPOSE

## V93-070 — Duplicate published post to draft

Creates new draft.

Does not mutate old post.

---

## V93-071 — Repurpose post structure

Without AI, support deterministic transformations such as:

```text
Job Post → Short Job Post
Multi-job → Single selected Job draft
Guide → Short Update draft
```

Only safe structured transformations.

---

## V93-072 — Cross-channel placeholder

V9.3 may define future channel targets:

```text
HRP_TIMELINE
FACEBOOK
ZALO
TIKTOK_SCRIPT
```

But actual distribution belongs to V9.5 and AI rewriting to V9.7.

---

# 11. V9.3i — SECURITY / PERFORMANCE / HARDENING

## V93-080 — Permissions

Suggested:

```text
content_studio.access
social_post.create_self
social_post.edit_self
social_post.schedule_self
social_post.publish_self
content_template.read
content_template.manage_self
media.read_self
media.upload_self
```

---

## V93-081 — Author scope enforcement

Never trust arbitrary recruiter profile ID from client.

Resolve/manage own author scope server-side.

---

## V93-082 — Template injection safety

No executable expressions.

No arbitrary template code.

---

## V93-083 — Calendar performance

Query by date range.

Do not load all historical content.

---

## V93-084 — Draft performance

Large media/block-heavy drafts should load incrementally where appropriate.

---

# 12. CONTENT QUALITY WARNINGS

Studio may warn when:

```text
referenced job is closed
referenced job closes before scheduled publication
profile is unpublished
required public contact unavailable
CTA target unavailable
```

Warning != automatic mutation.

---

# 13. JOB-CLOSURE + SCHEDULE POLICY

Scenario:

```text
Post scheduled for tomorrow
Job closes today
```

Recommended execution policy:

```text
scheduler revalidates canonical Job reference at publish time
```

Possible outcomes:

```text
publish with closed JobCard and no Apply CTA
or
block publish if post type requires active Job
```

Exact rule must be explicit per template/post type.

Do not publish misleading active hiring CTA.

---

# 14. PERMANENT REGRESSION FIXTURES

## RF-V93-01 — Create from Job

Draft references canonical JobPosting; no duplicate Job truth.

---

## RF-V93-02 — Job changes during draft

Preview shows current canonical facts.

---

## RF-V93-03 — Template missing variable

Fails safely; does not invent data.

---

## RF-V93-04 — Duplicate draft

Creates separate draft; original unchanged.

---

## RF-V93-05 — Concurrent auto-save

Stale update does not silently overwrite newer draft.

---

## RF-V93-06 — Schedule retry

No duplicate publication.

---

## RF-V93-07 — Reschedule

Only publication time changes; content/business truth unchanged.

---

## RF-V93-08 — Job closes before schedule

Publish flow follows explicit closure policy and never shows misleading active Apply CTA.

---

## RF-V93-09 — Preview

Same sanitization/rendering as public page.

---

## RF-V93-10 — Calendar range

Does not load entire content history.

---

## RF-V93-11 — Media reuse

Uses canonical media asset; no duplicated binary storage.

---

## RF-V93-12 — Unauthorized author

Cannot edit/schedule another recruiter's post.

---

# 15. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
content-studio-page.tsx with composer/calendar/media/templates all together
template-engine.ts supporting arbitrary code
calendar-service.ts owning publication business logic
```

Suggested structure:

```text
content-studio/
  shell/
  composer/
  drafts/
  preview/
  calendar/

content-templates/
  domain/
  application/
  rendering/

smart-job-post/
  queries/
  application/

content-scheduling/
  queries/
  ui/

media-picker/
  queries/
  ui/

content-repurpose/
  application/
```

Publishing commands remain in V9.0 application layer.

---

# 16. V9.3 EXIT GATE

## Studio

```text
[ ] Content Studio shell
[ ] Create Post
[ ] Drafts
[ ] Scheduled
[ ] Published
[ ] Calendar
```

## Smart Job Post

```text
[ ] create from one Job
[ ] create multi-job draft
[ ] canonical Job references only
```

## Templates

```text
[ ] template catalog
[ ] approved variables
[ ] safe rendering
```

## Drafts

```text
[ ] save
[ ] auto-save where enabled
[ ] duplicate
[ ] concurrency-safe
```

## Preview

```text
[ ] timeline preview
[ ] detail preview
[ ] desktop/mobile
[ ] canonical Job freshness
```

## Scheduling

```text
[ ] schedule
[ ] reschedule
[ ] cancel
[ ] scheduler failure visible
[ ] calendar
```

## Media

```text
[ ] existing media infrastructure reused
[ ] picker/upload
[ ] metadata
```

## Repurpose

```text
[ ] duplicate published to draft
[ ] deterministic safe repurpose
```

## Security/Performance

```text
[ ] author scope
[ ] template safety
[ ] date-range calendar query
```

## Regression

```text
[ ] RF-V93-01 through RF-V93-12 pass
```

---

# 17. HANDOFF TO V9.4

V9.4 owns Engagement & Audience:

```text
Follow Recruiter
Job/Content subscriptions
Reactions
FAQ/Q&A interaction
Comments when moderation is ready
Audience-safe notification hooks
```

V9.4 must preserve:

```text
Follower != ReferralAttribution
Reaction != Application
Comment != HandlingAssignment
```

---

# 18. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V93-001 through V93-003

Batch B
V93-010 through V93-013

Batch C
V93-020 through V93-024

Batch D
V93-030 through V93-034

Batch E
V93-040 through V93-042

Batch F
V93-050 through V93-057

Batch G
V93-060 through V93-072

Batch H
V93-080 through V93-084
Security/performance

Batch I
RF-V93-01 through RF-V93-12
V9.3 EXIT GATE
```

---

# 19. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
TemplateJob salary snapshot as authority
ContentStudioJob
ContentStudioMedia binary store
CalendarPostState separate from SocialPost status
```

Do NOT:

```text
schedule direct DB status patches
invent Job facts for template variables
let preview use a different renderer than public
let content calendar become another publishing state machine
```

---

# 20. PRODUCT OUTCOME

After V9.3, a recruiter should be able to run a professional recruitment content workflow entirely inside HRP:

```text
choose a Job
→ create a structured post
→ apply a template
→ edit
→ preview desktop/mobile
→ save draft
→ schedule
→ see it on calendar
→ publish to recruiter timeline
```

without duplicating Job truth or requiring AI to make the workflow useful.
