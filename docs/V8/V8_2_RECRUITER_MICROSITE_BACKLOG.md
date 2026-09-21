# HRP V8.2 — RECRUITER MICROSITE & CONTENT DISTRIBUTION BACKLOG

**Status:** Draft for implementation  
**Target release:** V8.2  
**Prerequisite:** V8.0 Exit Gate PASS  
**Depends on:** V7 JobPosting/Public Apply, Universal Affiliate lane, V8.0 Public Profile Foundation  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Personal public recruitment presence for Recruiter/Sale

---

# 0. PURPOSE

V8.2 gives each eligible recruiter/sale a public recruitment microsite that can:

```text
introduce the recruiter
show approved public contact channels
promote canonical jobs
publish recruitment content
route applicants into canonical HRP application/intake
consume Universal Affiliate links
show safe distribution analytics
```

The microsite is a distribution surface.

It is NOT:

```text
a separate ATS
a separate Job database
a separate Affiliate engine
a separate CRM
a commission engine
```

---

# 1. NON-NEGOTIABLE INVARIANTS

1. Recruiter microsite references canonical `JobPosting`.
2. Recruiter cannot override canonical job facts such as salary, requirements, location, ServiceModel, opening state.
3. Microsite does not create another affiliate code/referral system.
4. Universal Affiliate remains the attribution authority.
5. Recruiter public profile is separate from internal User profile/permissions.
6. Public data is allow-listed.
7. Internal userId/roles/permissions/internal notes must not leak publicly.
8. Content uses structured safe blocks; no arbitrary HTML/JS in v1.
9. Public forms route through canonical application/intake commands.
10. Existing ReferralAttribution must not be overwritten merely because a user visits another recruiter's microsite.
11. Traffic analytics != ReferralAttribution.
12. Traffic analytics != beneficiary.
13. Public CTA must continue to work safely if AFF is disabled/unavailable.
14. Job availability on microsite follows canonical JobPosting state.
15. Social/contact channels must be explicitly published by the recruiter/admin policy.
16. Slugs must be unique, safe, and revocable.
17. Recruiter content must be auditable/moderatable.
18. The microsite may promote content; it may not change underlying HRP business truth.

---

# 2. DELIVERY SLICES

```text
V8.2a — Recruiter Public Profile
V8.2b — Featured Jobs
V8.2c — Content / Blog
V8.2d — Public CTA & Lead/Application Routing
V8.2e — Universal AFF Integration
V8.2f — Analytics
V8.2g — Moderation / Security / Hardening
```

---

# 3. V8.2a — RECRUITER PUBLIC PROFILE

## V82-001 — RecruiterPublicProfile schema

**Type:** Schema/experience  
**Priority:** BLOCKER

Conceptual:

```text
id
userId

slug
displayName
headline?
bio?

avatarAssetRef?
coverAssetRef?

publicPhone?
publicZalo?
publicEmail?

publishPhone
publishZalo
publishEmail

status
publishedAt?

createdAt
updatedAt
version
```

Do not expose internal User fields automatically.

---

## V82-002 — Public profile status

Suggested:

```text
DRAFT
PUBLISHED
UNPUBLISHED
SUSPENDED
```

Status is public visibility only.

It must not be reused as:

```text
User account status
employment status
recruiter performance status
```

---

## V82-003 — Slug rules

Reuse V8.0 public slug foundation.

Requirements:

```text
unique
lowercase normalized
URL-safe
reserved words blocked
collision-safe
admin moderation/override available
```

Example:

```text
hrp.vn/minh-nguyen
```

---

## V82-004 — Public social links

Suggested model:

```text
id
recruiterPublicProfileId
platform
url
label?
displayOrder
status
```

Platforms may include:

```text
FACEBOOK
TIKTOK
ZALO
YOUTUBE
LINKEDIN
OTHER_APPROVED
```

Validate URL/platform pairing.

---

## V82-005 — Public profile query

**Type:** Public-safe read DTO  
**Priority:** BLOCKER

Return only:

```text
displayName
headline
bio
approved avatar/cover
explicitly published contacts
approved social links
featured jobs
published posts
```

Never return internal permission/role/security data.

---

# 4. V8.2b — FEATURED JOBS

## V82-010 — RecruiterFeaturedJob schema

**Type:** Schema/experience  
**Priority:** BLOCKER

Conceptual:

```text
id
recruiterPublicProfileId
jobPostingId

displayOrder
customIntro?
coverAssetRef?
featuredLabel?

status
createdAt
updatedAt
```

This is curation only.

---

## V82-011 — Canonical job authority

Microsite must display canonical JobPosting facts from source.

Examples:

```text
title
location
salary/compensation display
requirements
work classification
public description
availability/open state
```

Recruiter-specific custom content is visually separated from canonical fields.

---

## V82-012 — Closed job behavior

If JobPosting closes/unpublishes:

```text
microsite cannot continue presenting it as open
```

Options:

```text
hide
show "Đã ngừng tuyển"
remove CTA
```

Exact UX may be configurable.

---

## V82-013 — Featured job management commands

Commands:

```text
featureJob()
unfeatureJob()
reorderFeaturedJobs()
updateFeaturedJobPresentation()
```

These commands never modify JobPosting.

---

# 5. V8.2c — CONTENT / BLOG

## V82-020 — RecruiterPost schema

**Type:** Schema/content  
**Priority:** BLOCKER

Conceptual:

```text
id
recruiterPublicProfileId

type
title?
slug?
excerpt?
contentBlocks

coverAssetRef?
status
publishedAt?

createdAt
updatedAt
version
```

Suggested types:

```text
ARTICLE
SHORT_UPDATE
JOB_PROMOTION
VIDEO_POST
```

---

## V82-021 — Structured content blocks

Allowed examples:

```text
PARAGRAPH
HEADING
IMAGE
VIDEO_LINK
QUOTE
JOB_REFERENCE
CTA
```

Do not allow raw arbitrary JavaScript.

If limited HTML is allowed later, sanitize through one centralized policy.

---

## V82-022 — Job reference block

A content block may reference:

```text
JobPosting
```

If job closes, the block must reflect current canonical state.

Do not snapshot stale job facts into permanent free text unless clearly presented as editorial content.

---

## V82-023 — Content publishing commands

```text
createDraftPost()
updateDraftPost()
publishPost()
unpublishPost()
archivePost()
```

Critical publish state should be command-driven, not generic patch.

---

## V82-024 — Content preview

Recruiter should preview public page before publish.

Preview must use same renderer/sanitization policy as production.

---

# 6. V8.2d — PUBLIC CTA & APPLICATION ROUTING

## V82-030 — CTA catalog

Initial CTAs:

```text
APPLY_JOB
ASK_FOR_ADVICE
LEAVE_CONTACT
CALL
ZALO
VIEW_JOBS
```

CTA behavior is centrally mapped.

---

## V82-031 — Apply Job

Flow:

```text
microsite
→ selected canonical JobPosting
→ canonical public application route
→ Universal AFF context when available
```

No microsite-specific application table.

---

## V82-032 — General interest / Ask for advice

Possible flow:

```text
public contact form
→ canonical LaborProfile intake/create-or-match
→ typed source/acquisition context
→ optional AFF attribution according to AFF authority
```

Do not fabricate Application when no specific job was selected.

---

## V82-033 — Public form abuse protection

Requirements:

```text
rate limit
bot protection
input validation
duplicate handling
PII minimization
safe error responses
```

---

## V82-034 — Public tracking response

Applicant should not see:

```text
referrer identity
commission policy
beneficiary
internal handler
internal notes
```

---

# 7. V8.2e — UNIVERSAL AFF INTEGRATION

## V82-040 — AFF capability adapter

**Type:** Integration/application boundary  
**Priority:** BLOCKER

V8.2 should consume an Affiliate capability interface such as:

```text
getSelfAffiliateLink(userId)
buildAffiliateDestination(userId, jobPosting?)
getAffiliateFeatureState()
```

Exact API depends on actual AFF implementation state.

Do not call legacy CTV-only internals as long-term canonical dependency.

---

## V82-041 — Featured Job affiliate destination

When AFF capability is available:

```text
Recruiter microsite Job CTA
→ canonical affiliate destination for current recruiter
→ optional job destination
```

The server/AFF layer decides attribution.

---

## V82-042 — Existing attribution safety

Scenario:

```text
LaborProfile already attributed to Partner/CTV A
later visits Recruiter B microsite
```

Expected:

```text
canonical attribution remains according to AFF policy
new traffic/acquisition event may be recorded
```

Microsite B cannot overwrite source.

---

## V82-043 — AFF unavailable behavior

If AFF feature is disabled/not implemented:

```text
microsite still loads
jobs still display
public apply may use normal canonical public flow
affiliate-specific tracking/share affordances disabled
```

Do not fail the whole microsite.

---

## V82-044 — No duplicate affiliate model

Forbidden:

```text
RecruiterPublicProfile.affCode
MicrositeReferral
RecruiterAttribution
SaleCommission
```

unless an explicit future ADR proves they are distinct concepts.

---

# 8. V8.2f — ANALYTICS

## V82-050 — Microsite analytics events

Potential non-authoritative events:

```text
PAGE_VIEW
JOB_VIEW
POST_VIEW
CTA_CLICK
SHARE_CLICK
APPLICATION_STARTED
APPLICATION_SUBMITTED
```

These are analytics.

They do not prove source/beneficiary entitlement.

---

## V82-051 — Analytics aggregation

Recruiter-safe dashboard may show:

```text
page views
unique-ish sessions where privacy-safe
job views
CTA clicks
applications
general-interest leads
matched profiles
PlacementCases opened
effective Placements
```

Attribution-based downstream metrics must come from canonical AFF/V7 facts, not browser events.

---

## V82-052 — Traffic source separation

Track presentation-level source such as:

```text
direct
facebook
tiktok
zalo
other
```

only for analytics.

Do not silently convert analytics source into ReferralAttribution.

---

## V82-053 — Recruiter microsite dashboard

Suggested:

```text
Profile status
Featured jobs
Published posts
Traffic summary
Top jobs
Applications
Effective placements
Affiliate link status
```

No commission estimate unless authoritative ledger data exists and permission allows it.

---

# 9. V8.2g — MODERATION / SECURITY / HARDENING

## V82-060 — Content moderation policy

Initial choices:

```text
auto-publish trusted recruiter
or
requires approval
```

This is configurable policy, not hardcoded page behavior.

Admin needs ability to:

```text
suspend profile
unpublish post
remove unsafe content
```

with audit.

---

## V82-061 — Contact privacy policy

Recruiter explicitly chooses what to publish.

Do not automatically expose account phone/email.

---

## V82-062 — Media security

Requirements:

```text
safe file types
size limits
image processing where available
no executable uploads
safe external video/embed policy
```

---

## V82-063 — SEO/public metadata

Microsite may expose:

```text
title
description
canonical URL
OpenGraph metadata
job/post structured metadata where appropriate
```

No internal IDs/PII in metadata.

---

## V82-064 — Public caching

Public pages may be cached, but invalidation must respect:

```text
profile unpublish
job close
post unpublish
security suspension
```

Security changes should invalidate quickly.

---

# 10. PERMISSIONS

Suggested:

```text
recruiter_profile.read_self
recruiter_profile.manage_self
recruiter_profile.publish

recruiter_featured_job.manage_self

recruiter_post.create
recruiter_post.edit_self
recruiter_post.publish_self

recruiter_microsite.analytics.read_self

recruiter_profile.moderate
recruiter_post.moderate
```

These are experience permissions.

Underlying JobPosting/public application permissions remain separate.

---

# 11. RLS / PUBLIC BOUNDARY

Public endpoints should access public projections/views/services only.

Do not expose internal User/LaborProfile/JobOpening repositories directly.

Admin moderation paths are separate from public rendering.

---

# 12. CONCURRENCY / IDEMPOTENCY

Protect:

```text
slug claim race
duplicate featureJob request
duplicate publish command
double CTA submission
duplicate analytics event
```

Business submissions continue to use canonical application/intake idempotency.

---

# 13. PERMANENT REGRESSION FIXTURES

## RF-V82-01 — Recruiter publishes profile

Only explicitly public fields appear.

---

## RF-V82-02 — Internal phone not published

Internal account phone is absent from public projection.

---

## RF-V82-03 — Featured Job closes

Microsite no longer offers active Apply CTA.

---

## RF-V82-04 — Recruiter custom intro

Custom intro changes presentation only; JobPosting remains unchanged.

---

## RF-V82-05 — Existing attribution

Recruiter B microsite visit does not overwrite canonical source from A.

---

## RF-V82-06 — AFF disabled

Microsite still functions in non-AFF mode.

---

## RF-V82-07 — General interest

Creates/uses canonical intake; no fake Application.

---

## RF-V82-08 — Unsafe HTML/script

Rejected/sanitized.

---

## RF-V82-09 — Suspended public profile

Public route stops exposing content promptly.

---

## RF-V82-10 — Duplicate apply

Canonical duplicate/idempotency policy applies; no duplicate profile just because microsite retried.

---

## RF-V82-11 — Analytics click

Does not become canonical ReferralAttribution by itself.

---

## RF-V82-12 — Recruiter cannot edit canonical salary

Attempt fails/field is not part of experience command.

---

# 14. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
microsite-page.tsx containing profile + jobs + posts + analytics + forms
recruiter-blog-service.ts containing every concern
microsite-affiliate.ts implementing attribution logic
```

Suggested split:

```text
recruiter-public-profile/
  domain/
  application/
  queries/
  ui/

recruiter-featured-jobs/
  application/
  queries/
  ui/

recruiter-content/
  domain/
  application/
  queries/
  renderer/

recruiter-microsite-public/
  queries/
  ui/

recruiter-microsite-analytics/
  events/
  queries/

affiliate-consumer/
  application/
    affiliate-capability-adapter.ts
```

Centralize:

```text
public field allow-list
slug policy
content block schema
CTA mapping
moderation policy
AFF capability boundary
```

---

# 15. V8.2 EXIT GATE

## Public Profile

```text
[ ] profile schema
[ ] safe public projection
[ ] slug works
[ ] publish/unpublish/suspend works
[ ] contact privacy works
```

## Featured Jobs

```text
[ ] canonical JobPosting reference
[ ] no canonical job override
[ ] closed jobs handled correctly
[ ] ordering/presentation works
```

## Content

```text
[ ] safe structured posts
[ ] publish workflow
[ ] preview
[ ] job references stay canonical
```

## CTA

```text
[ ] Apply Job routes canonically
[ ] general-interest flow does not fabricate Application
[ ] abuse protection
```

## Affiliate

```text
[ ] consumes canonical AFF capability only
[ ] no duplicate affiliate model
[ ] existing attribution cannot be overwritten by microsite
[ ] AFF-disabled mode safe
```

## Analytics

```text
[ ] public traffic analytics
[ ] downstream metrics use canonical facts
[ ] traffic != attribution
```

## Security

```text
[ ] public PII review
[ ] content/media security
[ ] cache invalidation for suspend/unpublish
```

## Regression

```text
[ ] RF-V82-01 through RF-V82-12 pass
```

---

# 16. HANDOFF TO V8.3

V8.3 owns role-based workspaces:

```text
Admin
Recruiter
Recruitment Manager
CTV
Vendor
Worker
Client
```

V8.3 should mount Recruiter Microsite management and AFF consumer components inside the Recruiter workspace rather than duplicate them.

---

# 17. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V82-001 through V82-005

Batch B
V82-010 through V82-013

Batch C
V82-020 through V82-024

Batch D
V82-030 through V82-034

Batch E
V82-040 through V82-044

Batch F
V82-050 through V82-053

Batch G
V82-060 through V82-064
Permissions/security/performance

Batch H
RF-V82-01 through RF-V82-12
V8.2 EXIT GATE
```

---

# 18. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
RecruiterPublicProfile.affCode
RecruiterJob salary override
MicrositeApplication
MicrositeLaborProfile
MicrositeBeneficiary
```

Do NOT:

```text
trust raw referrerUserId from public form
copy JobPosting into microsite-owned job records
use click analytics as payout/source authority
publish internal User data by default
allow arbitrary JavaScript in recruiter content
```

---

# 19. PRODUCT OUTCOME

After V8.2, a recruiter/sale should be able to maintain a professional public recruitment page:

```text
Tôi là ai?
Tôi đang tuyển những việc nào?
Tôi muốn giới thiệu việc nào nổi bật?
Tôi có bài viết/video nào để quảng bá?
Ứng viên liên hệ hoặc ứng tuyển bằng cách nào?
Traffic của trang ra sao?
Có bao nhiêu apply / placement hiệu quả?
```

while HRP still preserves one canonical Job, one canonical Talent flow, and one Universal Affiliate authority.
