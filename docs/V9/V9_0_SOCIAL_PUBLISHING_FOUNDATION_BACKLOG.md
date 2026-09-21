# HRP V9.0 — SOCIAL PUBLISHING FOUNDATION IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V9.0  
**Depends on:** HRP V7 canonical domain, V8 Experience Layer, V9 Master Plan v1.1  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Shared social publishing foundation for Recruiter Social Recruiting Layer

---

# 0. PURPOSE

V9.0 establishes the canonical experience-layer publishing foundation for all later V9 phases.

It must create a reusable social publishing model that supports:

```text
Recruiter Timeline
Job Posts
Text/Image/Video Posts
Multi-job Posts
Success Stories
Guides
Q&A
Publishing state
Scheduled publication foundation
Timeline queries
Moderation hooks
```

V9.0 must NOT yet build:

```text
full timeline UI
advanced profile themes/layouts
follow/reactions/comments
campaigns
creator analytics
AI content generation
```

Those belong to later V9 phases.

---

# 1. ARCHITECTURAL POSITION

V9.0 is an experience/content domain.

It may own:

```text
SocialPost
PostBlock
PostMedia
Job reference inside posts
Publication state
Visibility state
Publishing commands
Timeline read contracts
Moderation state
```

It must NOT own:

```text
JobPosting truth
LaborProfile truth
PlacementCase truth
Placement truth
ReferralAttribution
HandlingAssignment
Commission/beneficiary logic
```

Permanent rule:

> **Content may reference canonical truth. Content must not replace canonical truth.**

---

# 2. NON-NEGOTIABLE INVARIANTS

1. SocialPost is content, not a business workflow record.
2. JobPost references canonical `JobPosting`.
3. Job facts are rendered from canonical job data.
4. Do not duplicate salary/location/requirements as authoritative post fields.
5. Publication state is independent from JobPosting state.
6. A published post may remain visible when its JobPosting closes, but Apply CTA must reflect canonical availability.
7. Social content does not create Application by itself.
8. Social content does not create ReferralAttribution by itself.
9. Social content does not create HandlingAssignment.
10. Scheduled publication is experience automation only.
11. Post visibility must remain independent from recruiter employment/account status.
12. Moderation actions must be auditable.
13. Arbitrary JavaScript is forbidden.
14. Arbitrary executable HTML is forbidden.
15. Structured content rendering must use approved block types.
16. Media access/security must use existing platform media infrastructure where possible.
17. V9.0 schema must support later reactions/comments without coupling them now.
18. V9.0 must not become a generic CMS for all HRP entities.

---

# 3. DELIVERY SLICES

```text
V9.0a — Social Post Core Model
V9.0b — Structured Content Blocks
V9.0c — Canonical Job References
V9.0d — Publication Lifecycle
V9.0e — Timeline Read Foundation
V9.0f — Media & Rendering Boundary
V9.0g — Moderation Hooks
V9.0h — Security / Performance / Hardening
```

---

# 4. V9.0a — SOCIAL POST CORE MODEL

## V90-001 — SocialPost schema

**Type:** Schema/content  
**Priority:** BLOCKER

Conceptual:

```text
id
authorRecruiterProfileId
postType

title?
excerpt?

status
visibility

publishedAt?
scheduledAt?

createdAt
updatedAt
version
```

Suggested post types:

```text
TEXT
JOB
MULTI_JOB
IMAGE
VIDEO
SUCCESS_STORY
GUIDE
Q_AND_A
```

Avoid one table per post type unless a clear structural need appears.

---

## V90-002 — Publication status catalog

Suggested:

```text
DRAFT
SCHEDULED
PUBLISHED
UNPUBLISHED
ARCHIVED
MODERATION_HOLD
```

Meaning:

```text
DRAFT
→ author editable, not public

SCHEDULED
→ pending scheduled publication

PUBLISHED
→ visible according to visibility policy

UNPUBLISHED
→ intentionally removed from public

ARCHIVED
→ historical/non-active editorial record

MODERATION_HOLD
→ blocked from public display pending moderation
```

This is content lifecycle only.

---

## V90-003 — Visibility catalog

Initial recommendation:

```text
PUBLIC
UNLISTED
```

Future:

```text
FOLLOWERS_ONLY
```

may be introduced after V9.4 audience foundation.

Do not implement follower-only visibility prematurely.

---

## V90-004 — Author authority

`authorRecruiterProfileId` must resolve to the Recruiter Public Profile foundation from V8/V9.

Do not store only a display name.

Author identity must remain stable even if display name changes.

---

# 5. V9.0b — STRUCTURED CONTENT BLOCKS

## V90-010 — PostBlock contract

**Type:** Schema/content  
**Priority:** BLOCKER

Conceptual:

```text
id
socialPostId
blockType
displayOrder
payload
createdAt
updatedAt
```

Allowed initial types:

```text
TEXT
HEADING
IMAGE
VIDEO
QUOTE
JOB_REFERENCE
JOB_COLLECTION
CTA
FAQ
```

`payload` must be validated by block type.

---

## V90-011 — Block schema validation

Each block type gets one canonical validator.

Examples:

```text
TEXT
→ text
→ formatting marks if supported

IMAGE
→ mediaAssetId
→ altText
→ caption?

VIDEO
→ approved video source/mediaAssetId
→ caption?

JOB_REFERENCE
→ jobPostingId

JOB_COLLECTION
→ ordered jobPostingIds[]

CTA
→ approved action key
→ label override within policy
```

Do not allow arbitrary JSON payloads without validation.

---

## V90-012 — Rich text policy

Initial recommendation:

```text
structured rich text
```

Allowed formatting may include:

```text
bold
italic
link
bullet list
numbered list
```

Avoid raw HTML as canonical content.

---

## V90-013 — External link policy

External links must pass centralized validation.

Possible controls:

```text
allowed protocols
nofollow/sponsored policy if relevant
safe target handling
phishing protection
```

---

# 6. V9.0c — CANONICAL JOB REFERENCES

## V90-020 — PostJobReference model/contract

**Type:** Schema/domain-reference  
**Priority:** BLOCKER

A post may reference one or more canonical `JobPosting` records.

Conceptual:

```text
id
socialPostId
jobPostingId
displayOrder
presentationRole
```

Possible roles:

```text
PRIMARY
SECONDARY
COLLECTION_ITEM
```

Do not copy canonical Job fields into this record.

---

## V90-021 — Job reference validation

Before attach:

```text
JobPosting exists
author has permission to promote it
job is publicly distributable
```

A recruiter may not reference arbitrary internal-only demand.

---

## V90-022 — Dynamic Job Card projection

Public renderer must obtain current canonical data such as:

```text
title
location
salary display
public benefits
public requirements summary
availability/open state
```

through one safe JobPosting projection/query authority.

---

## V90-023 — Closed Job behavior

When referenced JobPosting becomes closed/unpublished:

```text
post may remain visible
job card reflects closed state
Apply CTA removed/disabled
```

Do not mutate historical post content merely to hide closure.

---

## V90-024 — Multi-job collection

A post may contain ordered canonical Job references.

Use:

```text
JOB_COLLECTION
```

presentation.

Do not create a second job catalog owned by social publishing.

---

# 7. V9.0d — PUBLICATION LIFECYCLE

## V90-030 — Create draft command

```text
createSocialPostDraft()
```

Creates:

```text
SocialPost DRAFT
```

No public side effects.

---

## V90-031 — Update draft command

```text
updateSocialPostDraft()
```

Validates:

```text
author permission
post version
content block schema
job reference permissions
media references
```

---

## V90-032 — Publish command

```text
publishSocialPost()
```

Must validate:

```text
post completeness
author profile public state
moderation policy
content safety
job reference validity
```

Sets:

```text
PUBLISHED
publishedAt
```

---

## V90-033 — Unpublish command

```text
unpublishSocialPost()
```

Does not delete history.

---

## V90-034 — Archive command

```text
archiveSocialPost()
```

Used for content lifecycle, not hard deletion.

---

## V90-035 — Schedule publication command

```text
scheduleSocialPost()
```

Initial requirements:

```text
future scheduledAt
post currently DRAFT/SCHEDULED
content valid
author allowed
```

Scheduler execution belongs to application/infrastructure.

---

## V90-036 — Cancel/reschedule

Commands:

```text
cancelScheduledPost()
rescheduleSocialPost()
```

---

## V90-037 — Scheduler idempotency

A scheduled job must not publish twice after retry.

Use:

```text
idempotent scheduler execution
version/status check
```

---

# 8. V9.0e — TIMELINE READ FOUNDATION

## V90-040 — TimelinePostReadModel

**Type:** Public read DTO  
**Priority:** BLOCKER

Conceptual:

```text
postId
author
postType

publishedAt
pinned? later

contentBlocks[]
media[]
jobCards[]

publicActionKeys[]
```

No internal content-management fields.

---

## V90-041 — Recruiter timeline query

Initial:

```text
authorRecruiterProfileId
status = PUBLISHED
visibility = PUBLIC
publishedAt <= now
ORDER BY publishedAt DESC
```

Use cursor pagination.

---

## V90-042 — Timeline cursor contract

Use stable cursor based on:

```text
publishedAt
postId
```

or repository-standard equivalent.

Avoid offset pagination for long social feeds.

---

## V90-043 — Post detail query

Public post route/query:

```text
/recruiter-slug/post/:postId-or-slug
```

Exact URL design may be finalized later.

Must resolve through public-safe projection only.

---

## V90-044 — Timeline type filters

Support later:

```text
ALL
JOBS
VIDEOS
GUIDES
```

Foundation may include filter contract even if UI comes in V9.1.

---

# 9. V9.0f — MEDIA & RENDERING BOUNDARY

## V90-050 — Media reuse inventory

Before schema changes, inspect V8/existing media infrastructure.

Reuse where possible:

```text
image upload
avatar/cover media
video links
asset storage
CDN
signed/public media URLs
```

Do not build a second media platform.

---

## V90-051 — Media attachment contract

Post media reference should include only what publishing needs.

Possible:

```text
mediaAssetId
mediaType
displayOrder
altText
caption
```

---

## V90-052 — Renderer registry

Centralized renderer mapping:

```text
TEXT → TextBlockRenderer
IMAGE → ImageBlockRenderer
VIDEO → VideoBlockRenderer
JOB_REFERENCE → JobCardRenderer
JOB_COLLECTION → JobCollectionRenderer
CTA → CTA renderer
```

Avoid giant switch logic in one page file.

---

## V90-053 — Public renderer safety

Renderer must sanitize:

```text
rich text
links
embedded media metadata
```

and never execute user-provided code.

---

# 10. V9.0g — MODERATION HOOKS

## V90-060 — Moderation state

Content may enter:

```text
MODERATION_HOLD
```

without deleting the post.

---

## V90-061 — Moderation reason

Store structured moderation reason/reference where appropriate.

Do not rely only on free-text admin notes.

---

## V90-062 — Moderation commands

Potential:

```text
holdPost()
releasePost()
forceUnpublishPost()
```

All auditable.

---

## V90-063 — Author appeal/support hook

Do not build full moderation case system yet.

But keep a reference path to future dispute/support flow.

---

# 11. V9.0h — SECURITY / PERFORMANCE / HARDENING

## V90-070 — Permissions

Suggested capabilities:

```text
social_post.create_self
social_post.edit_self
social_post.publish_self
social_post.schedule_self
social_post.unpublish_self
social_post.archive_self

social_post.moderate
social_post.read_public
```

Exact names may align with existing permission conventions.

---

## V90-071 — Scope rules

Recruiter may manage only own posts unless moderation permission allows broader action.

Do not trust `authorRecruiterProfileId` from client as authority.

Resolve self-author context server-side where appropriate.

---

## V90-072 — Optimistic concurrency

Post updates should use:

```text
version
```

or repository-standard concurrency control.

Prevent silent overwrite between multiple tabs/devices.

---

## V90-073 — Public caching

Public timeline/post content may be cached.

Invalidation required on:

```text
publish
unpublish
archive
moderation hold
author profile suspension
job state changes affecting embedded JobCard
```

---

## V90-074 — Timeline performance

Plan for:

```text
cursor pagination
lazy media
batched JobCard projection
no N+1 JobPosting fetch
no loading all blocks for hidden/unrendered posts
```

---

## V90-075 — Audit

Audit content lifecycle actions:

```text
create
publish
schedule
unpublish
archive
moderation
```

Avoid auditing every harmless draft keystroke individually.

---

# 12. PUBLIC CTA BOUNDARY

V9.0 may define allowed CTA keys but does not yet implement all candidate flows.

Examples:

```text
VIEW_JOB
APPLY_JOB
ASK_RECRUITER
FIND_JOB_FOR_ME
FOLLOW_RECRUITER
```

At V9.0:

```text
VIEW_JOB
APPLY_JOB
```

may be fully resolvable if canonical V8/V7 public flows exist.

Others may remain registered but disabled until later phases.

CTA must route to canonical flow.

---

# 13. DATA MODEL BOUNDARY

Potential V9.0 models:

```text
SocialPost
SocialPostBlock
SocialPostJobReference
SocialPostMedia
ScheduledPublication metadata
```

Potential reuse:

```text
RecruiterPublicProfile
PublicSlug
existing MediaAsset
```

Do not create:

```text
SocialJob
SocialCandidate
SocialApplication
SocialReferral
SocialPlacement
```

---

# 14. PERMANENT REGRESSION FIXTURES

## RF-V90-01 — Job salary changes

Post renders current canonical JobCard salary.

---

## RF-V90-02 — Job closes

Post stays historically visible if allowed, but Apply CTA is disabled/removed.

---

## RF-V90-03 — Recruiter edits post

Cannot mutate canonical JobPosting facts through post update.

---

## RF-V90-04 — Unauthorized job reference

Recruiter cannot attach an internal/private JobPosting outside distributable scope.

---

## RF-V90-05 — Arbitrary script

Script/raw executable HTML is rejected/sanitized.

---

## RF-V90-06 — Scheduled retry

Same scheduled post is not published twice.

---

## RF-V90-07 — Concurrent edit

Stale draft update is rejected or reconciled safely.

---

## RF-V90-08 — Moderation hold

Public timeline stops rendering held post.

---

## RF-V90-09 — Recruiter profile suspended

Public timeline no longer exposes posts according to suspension policy.

---

## RF-V90-10 — Multi-job post

Each job card reflects its own current canonical state.

---

## RF-V90-11 — Public timeline pagination

No duplicate/missing posts under stable cursor pagination.

---

## RF-V90-12 — Traffic/social presence

Publishing a post creates no Application, ReferralAttribution, HandlingAssignment, or Placement.

---

# 15. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
social-service.ts
post-utils.ts
timeline-page.tsx
```

as god modules containing every concern.

Suggested structure:

```text
social-publishing/
  domain/
    social-post.ts
    post-types.ts
    publication-state.ts

  blocks/
    schemas/
    validation/

  application/
    create-draft.ts
    update-draft.ts
    publish-post.ts
    schedule-post.ts
    unpublish-post.ts

  job-reference/
    application/
    queries/

  queries/
    recruiter-timeline-query.ts
    public-post-query.ts

  rendering/
    registry/
    blocks/

  moderation/
    application/

  infrastructure/
    repositories/
    scheduler/
```

Keep canonical Job query/services outside V9.

---

# 16. V9.0 EXIT GATE

## Core model

```text
[ ] SocialPost exists
[ ] post types centralized
[ ] publication states centralized
[ ] visibility model exists
```

## Content blocks

```text
[ ] structured blocks
[ ] per-block validation
[ ] no arbitrary executable HTML/JS
```

## Job references

```text
[ ] canonical JobPosting reference
[ ] no duplicated Job authority
[ ] distributable-scope validation
[ ] closed Job behavior correct
```

## Lifecycle

```text
[ ] draft
[ ] publish
[ ] unpublish
[ ] archive
[ ] schedule/reschedule/cancel
[ ] scheduler idempotent
```

## Read model

```text
[ ] public timeline DTO
[ ] cursor pagination
[ ] public post query
[ ] no internal data leakage
```

## Media/rendering

```text
[ ] existing media reused where possible
[ ] renderer registry
[ ] safe rich-content rendering
```

## Moderation

```text
[ ] moderation hold
[ ] audited moderator actions
```

## Performance/security

```text
[ ] scope-safe authoring
[ ] optimistic concurrency
[ ] cache invalidation rules
[ ] no N+1 JobCard rendering
```

## Regression

```text
[ ] RF-V90-01 through RF-V90-12 pass
```

---

# 17. HANDOFF TO V9.1

V9.1 owns the actual Recruiter Timeline experience:

```text
Facebook-like public timeline
post cards
timeline tabs/filters
pinned posts
featured content
infinite/cursor loading
post detail UX
job card presentation
video/image presentation
public recruiter timeline navigation
```

V9.1 must reuse the V9.0 SocialPost model and read contracts.

---

# 18. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V90-001 through V90-004

Batch B
V90-010 through V90-013

Batch C
V90-020 through V90-024

Batch D
V90-030 through V90-037

Batch E
V90-040 through V90-044

Batch F
V90-050 through V90-053

Batch G
V90-060 through V90-075
Security/performance/moderation

Batch H
RF-V90-01 through RF-V90-12
V9.0 EXIT GATE
```

---

# 19. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
SocialPost.salary
SocialPost.jobStatus
SocialPost.referrerUserId
SocialPost.handlerId
SocialApplication
SocialPlacement
```

Do NOT:

```text
copy canonical Job data into social publishing as authority
let post publication mutate JobPosting
let post click create ReferralAttribution
let post publishing assign candidate handling
turn content scheduler into business automation engine
```

---

# 20. PRODUCT OUTCOME

After V9.0, HRP should have a stable publishing engine where a recruiter can create structured social recruitment content that safely references real HRP jobs and can later power:

```text
Timeline
Personal Brand
Content Studio
Engagement
Campaigns
Creator Analytics
AI Content Assistant
```

without creating a second recruitment system.
