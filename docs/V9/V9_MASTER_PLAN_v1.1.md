# HRP V9 — MASTER PLAN

**Status:** Master product/engineering plan  
**Design version:** 1.1  
**Primary theme:** Recruiter Social Publishing, Personal Brand, Appearance & Recruitment Distribution  
**Depends on:** HRP V7 canonical domain + V8 Experience/Distribution Layer + Universal Affiliate  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory

---

# 0. EXECUTIVE SUMMARY

HRP V9 evolves the Recruiter Microsite introduced in V8 into a full recruiter-facing social publishing and personal brand platform.

The shortest definition is:

```text
V7 = Business Truth
V8 = Experience & Workspaces
V9 = Recruiter Social Distribution & Personal Brand
```

V9 turns every recruiter/sale into a professional recruitment channel:

```text
Profile
Timeline
Jobs
Content
Audience
Engagement
Distribution
Lead Conversion
Analytics
AI-assisted Publishing
```

The core idea:

```text
Recruiter
→ builds personal recruitment brand
→ publishes jobs/content
→ distributes to social channels
→ attracts candidates
→ converts traffic into lead/apply
→ candidate enters canonical HRP flow
→ HRP measures conversion to Placement
```

V9 is not a separate ATS, social network database, affiliate system, or job database.

---

# 1. PRODUCT VISION

Each recruiter should have a public channel such as:

```text
hrp.vn/minh-nguyen
```

that looks and behaves more like a professional social recruitment profile than a static microsite.

Example experience:

```text
Cover
Avatar
Recruiter identity
Verified badge
Recruitment specialties
Areas served
Social links
Contact CTA

Timeline
  ├── Job Post
  ├── Text Post
  ├── Image Post
  ├── Video Post
  ├── Multi-job Collection
  ├── Success Story
  ├── Guide / FAQ
  └── Q&A

Featured Jobs
Featured Posts
Recruiter Portfolio
Follower / Subscription
Application CTA
General-interest CTA
Analytics
```

The product goal is not to reproduce Facebook.

The goal is:

> Build a Social Recruiting Layer specialized for recruitment conversion.

---

# 2. V9 PRODUCT PRINCIPLES

1. Every social feature must support at least one of:
   - recruiter personal brand,
   - job distribution,
   - candidate conversion.

2. V9 does not own canonical Job data.
3. V9 does not own candidate lifecycle.
4. V9 does not own ReferralAttribution.
5. V9 does not own commission logic.
6. V9 does not create a second messaging backend if Omnichannel already provides one.
7. Content may reference canonical domain objects.
8. Public presentation may be customized; canonical business facts may not.
9. Follower != ReferralAttribution.
10. Reaction != Application.
11. Comment != HandlingAssignment.
12. Recruiter audience != candidate ownership.
13. Traffic analytics != business attribution.
14. AI-generated content must not invent canonical job facts.
15. Social engagement must remain subordinate to recruitment utility.
16. Presentation is customizable; canonical truth is immutable.
17. Theme/layout settings are experience state, not business state.
18. Recruiter customization stays inside controlled design-system boundaries.
19. Mandatory HRP trust/verification elements cannot be hidden.
20. Accessibility and responsive behavior remain platform-controlled.

---

# 3. V8 → V9 EVOLUTION

V8.2 gives recruiters:

```text
Public Profile
Featured Jobs
Posts
Social Links
AFF integration
Microsite analytics
```

V9 upgrades this foundation into:

```text
Social Timeline
Professional Profile Customization
Content Studio
Content Scheduling
Share Kit
Multi-channel Distribution
Follower/Audience
Reaction/Comment/Q&A
Campaigns
Creator Analytics
AI Content Assistant
Recruiter Portfolio / Reputation
```

V8.2 remains the foundation.

V9 extends it rather than replacing it.

---

# 4. V9 PHASE STRUCTURE

Recommended phases:

```text
V9.0 — Social Publishing Foundation
V9.1 — Recruiter Timeline
V9.2 — Advanced Profile, Personal Brand & Appearance
V9.3 — Content Studio & Scheduling
V9.4 — Engagement & Audience
V9.5 — Distribution & Recruitment Campaigns
V9.6 — Creator Analytics & Conversion Intelligence
V9.7 — AI Content Assistant
V9.8 — Social Platform Hardening
```

---

# 5. V9.0 — SOCIAL PUBLISHING FOUNDATION

## Objective

Create the shared content and timeline foundation for all V9 features.

## Core capabilities

```text
SocialPost
PostType
PostBlock
PostMedia
PostJobReference
PostPublicationState
Timeline Query
Post Visibility
Post Scheduling foundation
Content moderation hooks
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

Avoid creating different tables for every post type unless justified.

Use one structured publishing model with typed content blocks/references.

---

# 6. SOCIAL POST MODEL

Conceptual:

```text
SocialPost
  id
  authorRecruiterProfileId
  postType

  title?
  bodyBlocks
  status

  publishedAt?
  scheduledAt?

  visibility

  createdAt
  updatedAt
  version
```

Status:

```text
DRAFT
SCHEDULED
PUBLISHED
UNPUBLISHED
ARCHIVED
MODERATION_HOLD
```

Status is publication state only.

It must not become candidate/job/business state.

---

# 7. STRUCTURED CONTENT BLOCKS

Initial block catalog:

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

Do not allow arbitrary JavaScript.

If HTML is ever supported:

```text
sanitize centrally
allow-list tags
no script/embed arbitrary code
```

---

# 8. CANONICAL JOB REFERENCES

A recruiter should be able to insert:

```text
[+ Add Job]
```

into a post.

The post stores:

```text
JobPosting ID
```

not copied business facts.

Canonical facts remain:

```text
salary
location
requirements
benefits
work classification
job availability
```

If a JobPosting changes:

```text
post rendering updates automatically
```

If it closes:

```text
CTA disables/hides
job card shows closed state
```

---

# 9. MULTI-JOB COLLECTION

Support curated posts such as:

```text
Top 5 jobs in Bắc Ninh this week
Jobs for women
Night-shift jobs
High-income jobs
```

Concept:

```text
Post
  └── JOB_COLLECTION
       ├── JobPosting A
       ├── JobPosting B
       └── JobPosting C
```

Collection is presentation.

Job truth remains canonical.

---

# 10. V9.1 — RECRUITER TIMELINE

## Objective

Give each recruiter a Facebook-like recruitment timeline.

Public timeline can include:

```text
recent posts
featured/pinned posts
job posts
videos
success stories
guides
FAQ/Q&A
```

Primary URL:

```text
/recruiter-slug
```

Potential tabs:

```text
Timeline
Jobs
About
Videos
Guides
```

---

# 11. TIMELINE QUERY

Timeline order:

```text
pinned
then publishedAt DESC
```

Support:

```text
cursor pagination
post type filter
job-related filter
media filter
```

Do not load entire history at once.

---

# 12. PINNED / FEATURED CONTENT

Recruiter may pin:

```text
1–3 important posts
```

Examples:

```text
intro post
current urgent job
top job collection
FAQ
```

Pinning does not affect canonical job priority.

---

# 13. V9.2 — ADVANCED PROFILE, PERSONAL BRAND & APPEARANCE

## Objective

Allow recruiters to build a recognizable professional recruitment identity while HRP retains control of security, accessibility, responsive behavior, SEO, and canonical business facts.

The permanent rule is:

> **Presentation customizable. Canonical truth immutable.**

V9.2 should make each recruiter channel feel personal without turning HRP into a free-form website builder.

## Recruiter specialization

Public profile may include:

```text
Specialties
Industries
Job categories
Locations
Recruitment types
Languages
```

These profile/taxonomy attributes may support discovery later, but they do not imply candidate ownership, ReferralAttribution, or HandlingAssignment.

---

# 14. VERIFIED RECRUITER & HRP TRUST

HRP may display:

```text
Verified by HRP
```

Only based on canonical HRP user/account relationship.

Mandatory trust elements may include:

```text
Verified by HRP
HRP trust mark
Report profile
Privacy
Canonical Job status
```

Recruiter customization cannot hide these elements.

---

# 15. CONTROLLED APPEARANCE CUSTOMIZATION

V9 should use controlled customization rather than arbitrary HTML/CSS page building.

Allowed customization:

```text
Cover image
Avatar
Theme preset
Accent color
Color mode
Layout preset
Headline
Bio
Specialties
Areas served
Featured sections
CTA presentation
Featured Jobs
Featured Posts
Timeline density
Section order
Section visibility
```

Forbidden initially:

```text
raw CSS
raw JavaScript
arbitrary HTML templates
arbitrary component injection
```

### Theme presets

Initial candidates:

```text
Professional
Friendly
Industrial
Youth / Short-form
Minimal
Dark
Premium
```

A theme may control:

```text
accent color
background tone
button treatment
card treatment
border radius
heading style
surface density
```

### Color / accent system

Initial approved palette:

```text
Blue
Green
Orange
Red
Purple
Pink
Teal
Neutral
```

If custom colors are allowed later, HRP centrally derives accessible text/hover/surface/border/focus states and rejects inaccessible combinations.

### Layout presets

#### Layout A — Social Timeline

```text
Cover
Profile header

Left:
  Intro
  Jobs
  Social links

Main:
  Timeline
```

#### Layout B — Recruiter Professional

```text
Cover
Recruiter identity
Specialties
CTA

Featured Jobs
Recruitment Portfolio
Timeline
Testimonials
```

#### Layout C — Job-first

```text
Cover
Recruiter header

Hot Jobs
Featured Job Collection
Latest Posts
Videos
About
```

#### Layout D — Creator

```text
Cover
Recruiter / audience summary
Featured video
Featured content
Timeline
Jobs
```

Layout changes presentation only. It must not change Job, AFF, Apply, Handling, Placement, or permission semantics.

### Section composition

Recruiter can control approved sections using:

```text
Show / Hide
Move Up / Down
```

Initial sections:

```text
Featured Jobs
Featured Posts
Timeline
Videos
Recruiter Portfolio
Testimonials
FAQ
Contact CTA
Social Links
```

Example:

```text
[Profile Header]

[Featured Jobs]      ↑ ↓
[Featured Post]      ↑ ↓
[Timeline]           ↑ ↓
[Videos]             ↑ ↓
[Portfolio]          ↑ ↓
[Testimonials]       ↑ ↓
[FAQ]                ↑ ↓
[Contact CTA]        ↑ ↓
```

### Appearance preference model

Potential experience model:

```text
RecruiterAppearancePreference

recruiterProfileId

themePreset
accentColor
colorMode

layoutPreset
timelineDensity

showFeaturedJobs
showFeaturedPosts
showTimeline
showVideos
showPortfolio
showTestimonials
showFAQ
showContactCTA

sectionOrder

createdAt
updatedAt
version
```

This is experience state only and must never contain canonical recruitment data.

### Live preview

Recruiter Workspace should include:

```text
Left:
  Theme
  Accent
  Layout
  Sections
  Density

Right:
  Live Preview
```

Preview modes:

```text
Desktop
Mobile
```

Recommended flow:

```text
Draft appearance
→ Preview
→ Publish appearance
```

### Custom URL

Reuse the V8 public slug foundation.

Examples:

```text
hrp.vn/minh-viec-lam
hrp.vn/maijobs
hrp.vn/tuan-tuyen-dung
```

Custom external domains may be considered later.

### Theme catalog / future marketplace

Architecture may leave room for:

```text
HRP Themes
Company Themes
Seasonal Themes
Campaign Themes
```

Themes remain approved design-token/component packages, never arbitrary executable code.

### Campaign appearance override

A V9.5 campaign may use a light appearance override:

```text
Recruiter profile:
Professional Blue

Campaign:
Samsung October Hiring
→ campaign cover
→ campaign accent
```

Campaign appearance must not mutate the recruiter's default profile appearance.

### Appearance invariants

Customization may change:

```text
theme
layout
section order
section visibility
presentation density
approved color tokens
visual emphasis
```

Customization may NOT change:

```text
Job salary
Job requirements
Job location
Job availability
Application flow
AFF attribution
ReferralAttribution
HandlingAssignment
Verified badge authority
Placement statistics source
permission/security boundaries
```

---

# 16. RECRUITER PORTFOLIO

Profile may show verified historical signals such as:

```text
companies/projects recruited for
job categories recruited
effective placements
recent successful placements
```

Only expose metrics/data approved for public display.

No internal client-sensitive information.

Prefer canonical V7 outcome projections over recruiter-entered claims.

---

# 17. TESTIMONIALS

Potential:

```text
Candidate Testimonial
```

Recommended trust model:

```text
testimonial author maps to known LaborProfile
optional Placement EFFECTIVE verification
moderation before public
```

Possible badge:

```text
Verified placement
```

Avoid anonymous unverified claims in v1.

---

# 18. V9.3 — CONTENT STUDIO & SCHEDULING

## Objective

Make publishing easy enough that recruiters use HRP as their primary recruitment content tool.

Content Studio:

```text
Create Post
Templates
Drafts
Scheduled
Published
Media Library
Job Collections
Preview
Content Calendar
```

---

# 19. SMART JOB POST CREATION

Flow:

```text
Select JobPosting
→ generate structured draft
→ recruiter customizes
→ preview
→ publish/schedule
```

Generated draft pulls canonical facts.

It must not duplicate them permanently as business authority.

---

# 20. CONTENT TEMPLATES

Examples:

```text
Urgent Hiring
New Job
High Salary
Near Home
Female Candidates
Day Shift
Night Shift
Top Jobs This Week
```

Template variables:

```text
{JOB_TITLE}
{LOCATION}
{SALARY}
{BENEFITS}
{SHIFT}
{AFF_LINK}
```

Templates control presentation only.

---

# 21. CONTENT CALENDAR

Recruiter sees:

```text
Draft
Scheduled
Published
```

by date.

Capabilities:

```text
schedule
reschedule
cancel schedule
duplicate draft
```

Publishing scheduler should be idempotent.

---

# 22. CONTENT MEDIA LIBRARY

Optional scoped media manager:

```text
images
videos
covers
post assets
```

Reuse existing media infrastructure where possible.

Do not build a separate file platform unnecessarily.

---

# 23. V9.4 — ENGAGEMENT & AUDIENCE

## Objective

Allow candidates to establish lightweight relationships with recruiters without altering canonical talent ownership.

Initial features should be phased carefully.

---

# 24. FOLLOW RECRUITER

Candidate/user may:

```text
Follow recruiter
Unfollow recruiter
```

Critical invariant:

```text
Follower
!= ReferralAttribution
!= HandlingAssignment
!= CommissionBeneficiary
```

Follow is audience subscription only.

---

# 25. JOB ALERT SUBSCRIPTIONS

Candidate may subscribe to:

```text
Recruiter posts
Bắc Ninh jobs
Warehouse jobs
Salary threshold
Company/job category
```

This creates notification preferences, not candidate ownership.

---

# 26. REACTIONS

Initial simple reaction set:

```text
LIKE
INTERESTED
HELPFUL
```

Reaction is an engagement event.

Do not infer Application or ReferralAttribution from reaction.

---

# 27. COMMENTS

Comments may be introduced after reaction/follow foundation.

Requirements:

```text
moderation
spam protection
report
block/hide
notification
rate limit
```

Comments should be delayed until moderation capabilities are ready.

---

# 28. Q&A

Recruiter may publish:

```text
Ask me anything about this job
```

Candidate questions may route to:

```text
public Q&A
or
private contact flow
```

Do not build a second messaging platform.

Private conversation should reuse V7.9 Omnichannel where available.

---

# 29. FAQ

Recruiter may maintain common answers:

```text
Application process
Required documents
Transport
Working hours
Interview steps
Fees
```

FAQ content remains recruiter/public content.

Canonical job-specific facts should reference JobPosting where possible.

---

# 30. V9.5 — DISTRIBUTION & RECRUITMENT CAMPAIGNS

## Objective

Turn HRP into a recruitment marketing distribution platform.

---

# 31. SHARE KIT

Every suitable post/job can expose:

```text
Copy link
Facebook share
Zalo share
TikTok script
QR code
Poster
Short link
```

V9 does not need to auto-post to every external network initially.

Start with share-ready assets.

---

# 32. QR CODE

QR can target:

```text
Recruiter profile
Job post
Job collection
Recruitment campaign
```

When AFF is active:

```text
QR destination may include canonical affiliate path
```

V9 does not own attribution.

---

# 33. RECRUITMENT POSTER GENERATOR

Generate visual recruitment posters from:

```text
canonical JobPosting
recruiter identity
approved branding
CTA / QR
```

Poster must clearly distinguish dynamic job facts.

If exported as static image, snapshot timestamp/version may be stored for traceability.

---

# 34. RECRUITMENT CAMPAIGN

Introduce:

```text
RecruitmentCampaign
```

as a marketing/distribution aggregate, not a business recruitment lifecycle.

Conceptual:

```text
Campaign
  name
  ownerRecruiter
  dateRange

  JobPosting references[]
  posts[]
  landingPage?
  shareAssets[]
  audience tags?
```

Examples:

```text
Samsung October Hiring
Bắc Ninh Night Shift Campaign
Tet Seasonal Workers
```

Campaign does not create PlacementCase or Application by itself.

---

# 35. CAMPAIGN LANDING PAGE

Optional route:

```text
/minh-nguyen/campaign/samsung-thang-10
```

Contains:

```text
campaign intro
jobs
videos/posts
CTA
```

All jobs remain canonical references.

---

# 36. V9.6 — CREATOR ANALYTICS & CONVERSION INTELLIGENCE

## Objective

Help recruiter understand which content creates real recruitment outcomes.

---

# 37. SOCIAL ANALYTICS

Metrics:

```text
profile views
post views
video views
job card views
CTA clicks
share clicks
followers
reactions
comments
```

These are content analytics.

---

# 38. RECRUITMENT CONVERSION FUNNEL

More important:

```text
Post View
→ Job View
→ CTA
→ Lead/Application
→ LaborProfile match/create
→ PlacementCase
→ Placement EFFECTIVE
```

This is V9's strongest differentiation from generic social platforms.

---

# 39. ATTRIBUTION BOUNDARY

Traffic analytics can say:

```text
candidate clicked recruiter post
```

AFF/canonical attribution decides:

```text
who is source
```

Never merge these concepts.

---

# 40. CONTENT PERFORMANCE

Recruiter dashboard may show:

```text
Top posts
Top jobs
Highest CTA rate
Highest application conversion
Highest effective-placement conversion
Best content type
```

Do not create opaque employee scores.

---

# 41. BEST TIME / CONTENT INSIGHTS

After sufficient data:

```text
video performs better than text
evening posts get higher engagement
Bắc Ninh posts convert better
job collections generate more clicks
```

These are recommendations, not guarantees.

---

# 42. V9.7 — AI CONTENT ASSISTANT

## Objective

Help recruiters create professional content faster.

AI may generate:

```text
Facebook-style post
Zalo post
TikTok script
Short caption
Long caption
FAQ
Job summary
Video script
Poster copy
```

---

# 43. AI JOB FACT SAFETY

AI receives structured canonical facts:

```text
JobPosting
Recruiter profile
Approved template
Tone
```

AI must not invent:

```text
salary
benefits
location
requirements
shift
fees
job availability
```

Generated content should distinguish:

```text
canonical fact
editorial wording
```

---

# 44. AI CONTENT WORKFLOW

```text
Select Job
→ Select channel/tone
→ Generate draft
→ Highlight canonical facts
→ Recruiter review
→ Publish/schedule
```

Default:

```text
human approval required
```

No autonomous publishing in initial release.

---

# 45. AI CONTENT REPURPOSING

One source post can become:

```text
Facebook version
Zalo version
TikTok script
Short video script
Poster headline
SMS-style short text
```

This is a high-value productivity feature.

---

# 46. V9.8 — SOCIAL PLATFORM HARDENING

Scope:

```text
moderation
spam protection
abuse/reporting
privacy
performance
timeline pagination
media security
SEO
mobile
accessibility
notification scale
content caching
analytics integrity
```

---

# 47. MODERATION

Admin capabilities:

```text
suspend recruiter profile
unpublish post
remove comment
review reported content
review testimonial
block abusive user/session
```

All moderation should be audited.

---

# 48. PRIVACY

Public recruiter data must be explicit opt-in.

Do not publish:

```text
internal phone
internal email
permissions
internal HRP role details
manager
internal notes
internal performance
```

unless intentionally approved for public use.

---

# 49. TIMELINE PERFORMANCE

Use:

```text
cursor pagination
media lazy loading
cached public projections
CDN/media optimization
incremental analytics
```

Do not load all posts/reactions/comments at once.

---

# 50. SEO / DISCOVERABILITY

Potential:

```text
Recruiter profile metadata
Post metadata
Job structured data
Campaign landing metadata
canonical URLs
OpenGraph
```

Public pages should remain safe and indexable according to policy.

---

# 51. V9 DATA MODEL BOUNDARY

Potential V9 experience models:

```text
SocialPost
SocialPostBlock
SocialPostMedia
SocialPostJobReference
RecruiterFollower
PostReaction
PostComment
RecruiterFAQ
RecruitmentCampaign
CampaignJobReference
CampaignPostReference
ContentTemplate
ScheduledPublication
CreatorAnalyticsEvent
CandidateTestimonial
```

These must not replace:

```text
User
LaborProfile
PlacementCase
JobPosting
ReferralAttribution
HandlingAssignment
Placement
Worker
ClientCompany
SupplyPartner
```

---

# 52. V9 COMMAND BOUNDARY

Examples:

```text
publishPost()
schedulePost()
unpublishPost()
followRecruiter()
reactToPost()
commentOnPost()
createCampaign()
featureJobInPost()
```

Recruitment CTA routes into:

```text
canonical public apply
canonical intake/create-or-match
Universal AFF
```

not V9-specific candidate lifecycle.

---

# 53. V9 WORKSPACE INTEGRATION

Recruiter workspace from V8.3 should gain:

```text
My Channel
Timeline
Create Post
Content Studio
Calendar
Campaigns
Audience
Analytics
AI Assistant
```

Do not build a second recruiter application shell.

---

# 54. PUBLIC EXPERIENCE

Suggested public tabs:

```text
Timeline
Jobs
About
Videos
Guides
```

Future optional:

```text
Reviews
Campaigns
```

---

# 55. CANDIDATE CONVERSION PATHS

Every page/post should support clear conversion paths:

```text
Apply to Job
Ask Recruiter
Find a Job for Me
Leave Contact
Follow
Subscribe to Job Alerts
Call
Zalo
```

The most important CTA depends on context.

---

# 56. “FIND A JOB FOR ME”

This should be considered a first-class V9 conversion flow.

Example:

```text
Không biết chọn việc nào?
[Nhờ Minh tìm việc phù hợp]
```

Flow:

```text
public form
→ canonical LaborProfile create-or-match
→ canonical job-seeking flow
→ PlacementCase according to V7 rules
```

Do not create a separate SocialLead candidate database.

---

# 57. SOCIAL EVENT VS BUSINESS EVENT

Must remain distinct.

Examples:

```text
FOLLOW
LIKE
POST_VIEW
COMMENT
```

are social events.

```text
APPLICATION_CREATED
PLACEMENT_CASE_OPENED
PLACEMENT_EFFECTIVE
```

are canonical business events.

Never infer one as the other without explicit command/policy.

---

# 58. V9 DEPENDENCY MAP

```text
V7 canonical domain
       │
       ├──────── Universal AFF
       │
       ▼
V8 Experience / Workspaces
       │
       ▼
V8 Recruiter Microsite
       │
       ▼
V9.0 Social Publishing Foundation
       │
       ├──────── V9.1 Timeline
       ├──────── V9.2 Personal Brand
       ├──────── V9.3 Content Studio
       │
       ▼
V9.4 Engagement & Audience
       │
       ▼
V9.5 Distribution / Campaigns
       │
       ▼
V9.6 Creator Analytics
       │
       ▼
V9.7 AI Content Assistant
       │
       ▼
V9.8 Hardening
```

---

# 59. PHASE GATES

## V9.0 Exit Gate

```text
[ ] SocialPost model
[ ] structured content blocks
[ ] canonical Job references
[ ] publication states
[ ] timeline read contract
[ ] moderation hooks
```

## V9.1 Exit Gate

```text
[ ] recruiter timeline
[ ] cursor pagination
[ ] pinned posts
[ ] post-type rendering
[ ] closed Job behavior
```

## V9.2 Exit Gate

```text
[ ] specialization profile
[ ] verified badge
[ ] controlled theme presets
[ ] approved accent/color system
[ ] layout presets
[ ] section ordering
[ ] show/hide approved sections
[ ] timeline density
[ ] desktop/mobile live preview
[ ] appearance draft/publish behavior
[ ] mandatory HRP trust elements preserved
[ ] portfolio
[ ] testimonials where enabled
[ ] public privacy
[ ] no appearance setting can mutate canonical business truth
```

## V9.3 Exit Gate

```text
[ ] content studio
[ ] templates
[ ] drafts
[ ] scheduling
[ ] content calendar
[ ] preview
```

## V9.4 Exit Gate

```text
[ ] follow
[ ] subscriptions
[ ] reaction
[ ] FAQ/Q&A
[ ] comments only if moderation ready
```

## V9.5 Exit Gate

```text
[ ] share kit
[ ] QR
[ ] poster generation
[ ] campaigns
[ ] campaign landing page
```

## V9.6 Exit Gate

```text
[ ] creator analytics
[ ] recruitment conversion funnel
[ ] content performance
[ ] traffic != attribution
```

## V9.7 Exit Gate

```text
[ ] AI content draft
[ ] canonical Job fact safety
[ ] multi-channel repurposing
[ ] human approval before publish
```

## V9.8 Exit Gate

```text
[ ] moderation
[ ] privacy
[ ] abuse protection
[ ] performance
[ ] accessibility/mobile
[ ] SEO/cache hardening
```

---

# 60. MASTER REGRESSION SCENARIOS

## R-V9-01 — Job salary changes

A job referenced in an old post displays the current canonical salary where the dynamic Job Card is rendered.

---

## R-V9-02 — Job closes

Apply CTA is disabled/hidden.

---

## R-V9-03 — Recruiter edits post

Cannot edit canonical JobPosting facts from the post editor.

---

## R-V9-04 — Candidate follows recruiter

No ReferralAttribution or HandlingAssignment is created.

---

## R-V9-05 — Candidate likes job post

No Application is created.

---

## R-V9-06 — Existing attribution

Visiting/reacting/following another recruiter does not overwrite canonical ReferralAttribution.

---

## R-V9-07 — Find a Job for Me

Creates/uses canonical intake and job-seeking flow; no social-only candidate record.

---

## R-V9-08 — Recruiter removed/suspended

Public channel/content can be disabled without altering historical Placement facts.

---

## R-V9-09 — AI content

AI cannot change salary/benefits/requirements beyond canonical source.

---

## R-V9-10 — Campaign

Campaign does not create Applications/PlacementCases until candidate takes canonical action.

---

## R-V9-11 — Analytics

Post view/click does not become commission/source authority.

---

## R-V9-12 — Testimonial

Only permitted/approved testimony becomes public.

---

## R-V9-13 — Theme change

Recruiter changes theme/accent.

Expected:

```text
public presentation changes
canonical Job/AFF/Placement data unchanged
```

---

## R-V9-14 — Layout change

Recruiter switches from Social Timeline to Job-first.

Expected:

```text
same canonical content/data
different approved composition only
```

---

## R-V9-15 — Invalid color

Inaccessible/invalid color is rejected or normalized by centralized appearance policy.

---

## R-V9-16 — Mandatory HRP trust mark

Recruiter cannot hide required verification/privacy/reporting elements.

---

## R-V9-17 — Section reorder

Changing section order does not modify Job priority, attribution, or business lifecycle.

---

## R-V9-18 — Mobile appearance

Published theme/layout remains usable under platform responsive/mobile rules.

---

# 61. FEATURE FLAGS

Potential:

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

---

# 62. RELEASE STRATEGY

Recommended:

```text
V9.0 internal technical foundation

V9.1 timeline pilot
→ selected recruiters

V9.2 profile customization
→ selected themes

V9.3 content studio
→ recruiter pilot
→ scheduling

V9.4 follow/reaction
→ limited public rollout

V9.5 campaigns/share kit
→ recruitment marketing teams

V9.6 analytics
→ once event quality is sufficient

V9.7 AI assistant
→ human-reviewed only initially

V9.8 hardening
→ broad rollout
```

---

# 63. MAINTAINABILITY GUARDRAILS

Do NOT create:

```text
social-page.tsx god component
post-service.ts handling every concern
job data copied into post tables
social-affiliate logic
social-candidate lifecycle
AI-generated business facts
```

Suggested modules:

```text
social-publishing/
timeline/
recruiter-brand/
content-studio/
audience/
engagement/
recruitment-campaigns/
creator-analytics/
ai-content/
social-moderation/
```

Each module should remain bounded.

---

# 64. DOCUMENTATION PLAN

After this Master Plan, write:

```text
V9_0_SOCIAL_PUBLISHING_FOUNDATION_BACKLOG.md
V9_1_RECRUITER_TIMELINE_BACKLOG.md
V9_2_PROFILE_PERSONAL_BRAND_APPEARANCE_BACKLOG.md
V9_3_CONTENT_STUDIO_BACKLOG.md
V9_4_ENGAGEMENT_AUDIENCE_BACKLOG.md
V9_5_DISTRIBUTION_CAMPAIGNS_BACKLOG.md
V9_6_CREATOR_ANALYTICS_BACKLOG.md
V9_7_AI_CONTENT_ASSISTANT_BACKLOG.md
V9_8_SOCIAL_HARDENING_BACKLOG.md

V9_MICRO_STEP_EXECUTION_PLAN.md
```

Do not write micro-steps until phase backlogs are stable.

---

# 65. V9 SUCCESS CRITERIA

V9 succeeds when recruiters can:

```text
build recognizable personal recruitment brands
customize approved themes/layouts without compromising HRP trust or canonical truth
publish professional social recruitment content
promote canonical jobs without copying job data
convert audience into real leads/applications
distribute content across channels
measure content-to-placement performance
use AI to create content faster without inventing facts
```

and HRP still maintains:

```text
one Job truth
one Talent truth
one Placement truth
one Affiliate authority
one permission/security model
```

---

# 66. FINAL V9 CONSTITUTION

The V9 architecture remains healthy only if:

```text
Timeline does not own Job truth.
Follower does not own candidate attribution.
Reaction does not create Application.
Comment does not create Handling.
Campaign does not own Placement.
Traffic analytics does not own commission.
AI does not invent recruitment facts.
Theme/layout customization does not alter business truth.
```

V9 owns:

```text
Recruiter brand
Content
Audience
Engagement
Distribution
Creator analytics
```

V7 owns business truth.

V8 owns workspace/experience infrastructure.

Universal Affiliate owns attribution.

That separation is the foundation of V9.
