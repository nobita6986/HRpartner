# HRP V9.1 — RECRUITER TIMELINE IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V9.1  
**Prerequisite:** V9.0 Exit Gate PASS  
**Depends on:** V9.0 Social Publishing Foundation, V8 Recruiter Public Profile, canonical JobPosting public projection  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Facebook-like public recruitment timeline for each recruiter

---

# 0. PURPOSE

V9.1 delivers the first true social experience of V9.

Each recruiter should have a public recruitment timeline where candidates can:

```text
see recent posts
see featured/pinned content
view job posts
view image/video posts
browse guides
open post detail
open canonical JobPosting
apply through canonical flow
```

The timeline should feel social and modern without introducing social engagement state yet.

V9.1 does NOT yet own:

```text
Follow
Reaction
Comment
Audience subscriptions
Campaigns
AI content generation
```

Those belong to later phases.

---

# 1. NON-NEGOTIABLE INVARIANTS

1. Timeline renders only published/public content.
2. Timeline does not own JobPosting truth.
3. Job cards always use canonical JobPosting public projection.
4. Closed jobs may remain in historical posts but cannot expose active Apply CTA.
5. Timeline order is content presentation, not business priority.
6. Pinned content does not change Job priority or Placement logic.
7. Opening a post does not create Application.
8. Viewing a post does not create ReferralAttribution.
9. Viewing a recruiter timeline does not create HandlingAssignment.
10. Timeline filters are projections only.
11. Public timeline must use cursor pagination.
12. Media must lazy-load where appropriate.
13. Recruiter account/profile suspension must affect public visibility.
14. Public timeline must never expose internal notes, private job data, internal user IDs, or permission data.
15. Mobile must be treated as first-class.
16. Timeline rendering must remain modular by post type.

---

# 2. DELIVERY SLICES

```text
V9.1a — Timeline Shell & Navigation
V9.1b — Social Post Card System
V9.1c — Job / Multi-job Rendering
V9.1d — Media Post Rendering
V9.1e — Pinned / Featured Content
V9.1f — Timeline Filters & Tabs
V9.1g — Post Detail Experience
V9.1h — Mobile / Performance / Hardening
```

---

# 3. V9.1a — TIMELINE SHELL & NAVIGATION

## V91-001 — Recruiter timeline route

**Type:** Public route  
**Priority:** BLOCKER

Primary route reuses recruiter slug:

```text
/{recruiterSlug}
```

Timeline becomes the default public experience or primary tab depending on selected V9.2 layout.

Exact routing must remain compatible with V8 public profile foundation.

---

## V91-002 — Public profile header integration

Timeline page should consume recruiter public profile projection:

```text
avatar
cover
displayName
headline
verified badge
public CTA
social links
specialties summary
```

Do not duplicate profile data into Timeline models.

---

## V91-003 — Timeline tabs

Initial tabs:

```text
Timeline
Jobs
About
```

Optional in same phase if content exists:

```text
Videos
Guides
```

Tabs are filters/projections, not separate content stores.

---

## V91-004 — Timeline shell

Shared composition:

```text
Profile Header
Navigation Tabs
Pinned/Featured Area
Timeline Feed
Sidebar/Secondary Modules where layout permits
```

Must adapt to layout presets later introduced by V9.2.

---

# 4. V9.1b — SOCIAL POST CARD SYSTEM

## V91-010 — Base SocialPostCard

**Type:** UI component  
**Priority:** BLOCKER

Base card shows:

```text
author identity
verified badge where applicable
published timestamp
post type treatment
content preview
media/job blocks
public actions
```

Do not display internal publication/moderation metadata.

---

## V91-011 — Text post card

Render:

```text
TEXT
HEADING
QUOTE
CTA
```

with safe truncation/expand behavior.

---

## V91-012 — Guide post card

For long GUIDE content:

```text
title
excerpt
cover
short preview
Read more
```

Do not dump full long article into feed.

---

## V91-013 — Success story card

Render structured content such as:

```text
headline
story excerpt
optional verified outcome badge
media
CTA
```

Any public placement-related claim must derive from approved/canonical evidence if marked verified.

---

## V91-014 — Q&A post card

Initial V9.1 only displays:

```text
question/prompt
author content
CTA for contact or future Q&A
```

Do not implement public comment thread yet.

---

# 5. V9.1c — JOB / MULTI-JOB RENDERING

## V91-020 — JobPostCard renderer

A job post combines:

```text
recruiter editorial content
+
canonical JobCard projection
```

Clear visual separation is required.

---

## V91-021 — Canonical JobCard

Recommended public fields:

```text
job title
location
salary display
selected benefits
work type
status/open state
Apply CTA
View Job
```

Only fields from canonical public JobPosting projection.

---

## V91-022 — MultiJobPost renderer

Support:

```text
JOB_COLLECTION
```

Presentation options:

```text
horizontal cards
stacked list
compact collection
```

depending on screen width.

---

## V91-023 — Job card unavailable state

If JobPosting:

```text
closed
unpublished
expired
not publicly accessible
```

render safe unavailable/closed treatment.

Do not 404 the whole historical post solely because one Job reference is unavailable.

---

## V91-024 — Job CTA routing

`Apply` routes to canonical public application/AFF path.

Timeline does not implement application logic.

---

# 6. V9.1d — MEDIA POST RENDERING

## V91-030 — Image post

Support:

```text
single image
small gallery
caption
alt text
```

Reuse existing media infrastructure.

---

## V91-031 — Video post

Support approved:

```text
uploaded media if platform supports it
YouTube link
TikTok link
other approved source
```

Do not allow arbitrary embed HTML.

---

## V91-032 — Media lazy loading

Images/video previews should load lazily where practical.

Above-the-fold content may use prioritized loading.

---

## V91-033 — Aspect ratio/layout policy

Use centralized rendering presets to prevent layout instability.

Examples:

```text
1:1
4:5
16:9
auto-safe
```

---

# 7. V9.1e — PINNED / FEATURED CONTENT

## V91-040 — PinnedPost relation/state

**Type:** Experience state  
**Priority:** HIGH

Recruiter may pin a limited number of posts.

Initial recommendation:

```text
max 3 pinned posts
```

---

## V91-041 — Pin/unpin commands

Commands:

```text
pinPost()
unpinPost()
reorderPinnedPosts()
```

Only own eligible posts.

---

## V91-042 — Pinned content rendering

Pinned content appears in a distinct area before chronological feed.

Do not duplicate the same post again immediately in feed if UX would be redundant.

---

## V91-043 — Pin eligibility

Cannot pin:

```text
DRAFT
UNPUBLISHED
ARCHIVED
MODERATION_HOLD
```

If a pinned post later becomes unavailable, it automatically disappears from pinned projection.

---

# 8. V9.1f — TIMELINE FILTERS & TABS

## V91-050 — Timeline filter contract

Initial:

```text
ALL
JOBS
VIDEOS
GUIDES
```

Potential later:

```text
SUCCESS_STORIES
Q_AND_A
```

---

## V91-051 — Jobs tab

Jobs tab may show:

```text
Job-related posts
and/or
Recruiter Featured Jobs
```

Define presentation clearly so recruiter does not appear to own a separate job catalog.

---

## V91-052 — Videos tab

Projection of published posts containing approved video media.

---

## V91-053 — Guides tab

Projection of GUIDE content.

---

## V91-054 — Empty states

Examples:

```text
No posts yet
No videos yet
No open jobs currently
```

Keep CTA context appropriate.

---

# 9. V9.1g — POST DETAIL EXPERIENCE

## V91-060 — Public post detail route

Possible route:

```text
/{recruiterSlug}/posts/{postId-or-slug}
```

Reuse public-safe Post read model.

---

## V91-061 — Full content rendering

Render all approved blocks:

```text
text
images
video
job references
collections
CTA
FAQ
```

---

## V91-062 — Related content

Optional initial related content:

```text
other recent posts by same recruiter
other active jobs featured by same recruiter
```

No opaque recommendation engine required.

---

## V91-063 — Share metadata

Post detail should expose safe:

```text
title
description
cover/media
canonical URL
OpenGraph metadata
```

Distribution actions come later in V9.5, but metadata foundation should exist.

---

# 10. V9.1h — MOBILE / PERFORMANCE / HARDENING

## V91-070 — Mobile-first timeline

Requirements:

```text
single-column default
sticky/minimal profile navigation
touch-friendly CTA
media fit
job cards readable
```

---

## V91-071 — Cursor pagination

Load feed incrementally.

Use V9.0 stable cursor.

---

## V91-072 — Infinite loading behavior

If infinite scroll is used:

```text
preserve browser back position
avoid duplicate requests
show load failure/retry state
```

A manual “Load more” fallback is acceptable.

---

## V91-073 — Batched JobCard hydration

Multiple Job references in visible posts should be resolved in batches.

No N+1 per card.

---

## V91-074 — Public cache strategy

Cache timeline/read projections where safe.

Invalidate on:

```text
publish/unpublish
pin/unpin
profile suspension
job state change
moderation
```

---

## V91-075 — Skeleton/loading policy

Use realistic skeletons.

Do not show fake job facts.

---

# 11. PUBLIC ACTION KEYS

V9.1 may render actions such as:

```text
VIEW_JOB
APPLY_JOB
ASK_RECRUITER
SHARE
```

But:

```text
FOLLOW
REACTION
COMMENT
```

remain disabled/absent until V9.4.

---

# 12. SECURITY REQUIREMENTS

Public timeline must:

```text
resolve published recruiter profile
resolve only PUBLIC content
enforce moderation state
use public-safe Job projection
sanitize rendered content
validate media URLs
avoid internal identifiers where unnecessary
```

No internal DTO reuse.

---

# 13. SEO / DISCOVERABILITY FOUNDATION

Recruiter timeline pages may expose:

```text
page title
profile description
OpenGraph
canonical URL
structured Job data only where appropriate
```

Do not create misleading Job schema for closed/unavailable jobs.

---

# 14. ANALYTICS HOOKS

V9.1 may emit non-authoritative events:

```text
TIMELINE_VIEW
POST_IMPRESSION
POST_OPEN
JOB_CARD_VIEW
CTA_CLICK
```

Actual analytics aggregation belongs to V9.6.

These events must not create:

```text
ReferralAttribution
HandlingAssignment
Application
```

---

# 15. PERMANENT REGRESSION FIXTURES

## RF-V91-01 — Public timeline

Only published/public posts appear.

---

## RF-V91-02 — Draft post

Never visible publicly.

---

## RF-V91-03 — Closed job

Historical post remains readable; active Apply CTA disappears.

---

## RF-V91-04 — Job salary changes

Job card reflects current canonical salary.

---

## RF-V91-05 — Pinned post unpublished

Automatically disappears from pinned projection.

---

## RF-V91-06 — Multi-job partial closure

Only closed jobs show closed state; other jobs remain actionable.

---

## RF-V91-07 — Profile suspended

Timeline unavailable according to suspension policy.

---

## RF-V91-08 — Cursor pagination

No duplicate or skipped posts under normal pagination.

---

## RF-V91-09 — Large timeline

Media lazy loading and pagination avoid loading full history.

---

## RF-V91-10 — Public content safety

Script/unsafe HTML never executes.

---

## RF-V91-11 — Timeline view

Creates no Application, ReferralAttribution, HandlingAssignment, or Placement.

---

## RF-V91-12 — Mobile timeline

Core content and Apply CTA remain usable on mobile.

---

# 16. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
recruiter-timeline-page.tsx with all renderers
post-card.tsx containing every post type
timeline-service.ts mixing query + analytics + moderation
```

Suggested structure:

```text
timeline/
  queries/
    recruiter-timeline-query.ts
    timeline-filter-query.ts

  ui/
    timeline-shell/
    timeline-feed/
    pinned-content/

social-post-card/
  base/
  text/
  guide/
  success-story/
  qa/

job-post-rendering/
  job-card/
  multi-job/

media-post-rendering/
  image/
  video/

post-detail/
  queries/
  ui/
```

---

# 17. V9.1 EXIT GATE

## Timeline

```text
[ ] recruiter public timeline route
[ ] profile header integration
[ ] chronological feed
[ ] cursor pagination
```

## Post cards

```text
[ ] text
[ ] guide
[ ] success story
[ ] Q&A display
```

## Jobs

```text
[ ] canonical JobCard
[ ] multi-job collection
[ ] closed job behavior
[ ] Apply routing canonical
```

## Media

```text
[ ] image
[ ] video
[ ] lazy loading
```

## Featured content

```text
[ ] pin/unpin
[ ] max pin rule
[ ] unavailable pinned content handled
```

## Navigation

```text
[ ] Timeline
[ ] Jobs
[ ] About
[ ] Videos/Guides where enabled
```

## Public quality

```text
[ ] mobile usable
[ ] no N+1 JobCard query
[ ] cache invalidation
[ ] content safety
[ ] public DTO isolation
```

## Regression

```text
[ ] RF-V91-01 through RF-V91-12 pass
```

---

# 18. HANDOFF TO V9.2

V9.2 owns:

```text
Advanced Profile
Recruiter Specialization
Verified Recruiter treatment
Theme Presets
Accent/Color System
Layout Presets
Section Ordering
Section Visibility
Timeline Density
Desktop/Mobile Live Preview
Recruiter Portfolio
Testimonials
Appearance publishing
```

V9.2 must customize presentation without mutating V9.1 content truth or V7 canonical business truth.

---

# 19. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V91-001 through V91-004

Batch B
V91-010 through V91-014

Batch C
V91-020 through V91-024

Batch D
V91-030 through V91-033

Batch E
V91-040 through V91-043

Batch F
V91-050 through V91-054

Batch G
V91-060 through V91-075
Security/SEO/analytics hooks

Batch H
RF-V91-01 through RF-V91-12
V9.1 EXIT GATE
```

---

# 20. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
TimelineJob
TimelineCandidate
TimelineApplication
Post.currentJobStatus
```

Do NOT:

```text
copy canonical Job facts into timeline authority
use post impressions as attribution
let timeline pinning change business priority
create follower/comment tables early
render internal JobOpening data publicly
```

---

# 21. PRODUCT OUTCOME

After V9.1, each recruiter should have a public recruitment channel that genuinely feels like a social profile:

```text
profile header
timeline
posts
jobs
images/videos
featured content
job collections
guides
```

Candidates can browse and convert into canonical HRP job/application flows, while HRP keeps one source of business truth behind the experience.
