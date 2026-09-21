# HRP V9.5 — DISTRIBUTION & RECRUITMENT CAMPAIGNS IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V9.5  
**Prerequisite:** V9.4 Exit Gate PASS  
**Depends on:** V9.0 Social Publishing, V9.1 Timeline, V9.3 Content Studio, V9.4 Engagement, Universal Affiliate capability  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Recruitment content distribution, share assets, QR/short links, and campaign orchestration

---

# 0. PURPOSE

V9.5 turns recruiter social content into a distribution engine.

Recruiters should be able to:

```text
share posts/jobs
generate short links
generate QR codes
generate recruitment posters
group jobs/content into campaigns
publish campaign landing pages
track distribution traffic
```

V9.5 must NOT create a second attribution system.

Permanent rule:

> **Distribution may generate traffic. Universal AFF decides attribution.**

---

# 1. NON-NEGOTIABLE INVARIANTS

1. V9.5 distribution is presentation/marketing infrastructure.
2. Universal AFF remains source/attribution authority.
3. Distribution tracking is not ReferralAttribution.
4. Click tracking is not commission entitlement.
5. Campaign is not PlacementCase.
6. Campaign is not StaffingOrder.
7. Campaign does not own JobPosting truth.
8. Campaign references canonical JobPosting.
9. Poster generation uses canonical public Job facts.
10. Static poster facts should be timestamp/version traceable.
11. Short links must resolve through controlled redirects.
12. QR codes encode approved destinations only.
13. Share Kit must not expose internal URLs or IDs.
14. Campaign landing page must use public-safe projections.
15. Recruitment Campaign must remain useful even if external social APIs are unavailable.
16. Auto-posting to third-party networks is optional and adapter-based.
17. Campaign appearance may override visual presentation only.
18. Distribution analytics remains distinct from business attribution.
19. Closed jobs must not continue presenting active Apply CTAs.
20. Campaign lifecycle is marketing lifecycle only.

---

# 2. DELIVERY SLICES

```text
V9.5a — Share Kit
V9.5b — Short Links
V9.5c — QR Codes
V9.5d — Recruitment Poster Generator
V9.5e — Recruitment Campaign Core
V9.5f — Campaign Landing Pages
V9.5g — Distribution Tracking
V9.5h — External Distribution Adapters
V9.5i — Security / Performance / Hardening
```

---

# 3. V9.5a — SHARE KIT

## V95-001 — Share Kit action registry

Supported initial actions:

```text
COPY_LINK
FACEBOOK_SHARE
ZALO_SHARE
COPY_CAPTION
DOWNLOAD_QR
DOWNLOAD_POSTER
```

Future:

```text
TIKTOK_SCRIPT
SMS_SHARE
EMAIL_SHARE
```

## V95-002 — Shareable targets

```text
RECRUITER_PROFILE
SOCIAL_POST
JOB_POSTING
JOB_COLLECTION
RECRUITMENT_CAMPAIGN
```

## V95-003 — Share destination resolver

Centralized flow:

```text
target
→ canonical public URL
→ optional AFF capability decoration
→ optional short link
```

Do not construct distribution URLs independently in UI.

## V95-004 — Share metadata

Expose safe:

```text
title
description
cover/image
canonical URL
```

---

# 4. V9.5b — SHORT LINKS

## V95-010 — ShortLink model

Conceptual:

```text
id
code
destinationType
destinationId
ownerUserId?
campaignId?
status
createdAt
expiresAt?
```

Prefer resolving live target state rather than treating one stale copied URL as authority.

## V95-011 — Short-link route

Example:

```text
/s/{code}
```

Flow:

```text
short code
→ resolve target
→ optional Universal AFF destination decoration
→ log distribution event
→ safe redirect
```

## V95-012 — Redirect safety

Reject:

```text
open redirects
arbitrary external destinations
javascript/data URLs
untrusted protocols
```

## V95-013 — Link lifecycle

```text
ACTIVE
DISABLED
EXPIRED
```

Do not hard-delete links required for historical analytics/audit.

---

# 5. V9.5c — QR CODES

## V95-020 — QR generation

Targets:

```text
Recruiter profile
JobPosting
SocialPost
Campaign
```

## V95-021 — Universal AFF integration

Where appropriate:

```text
QR
→ approved HRP resolver
→ Universal AFF destination
→ canonical public page
```

V9.5 does not own referral logic.

## V95-022 — QR asset options

Potential:

```text
PNG
SVG
print-safe size
```

Optional branding:

```text
HRP trust mark
recruiter name
CTA label
```

## V95-023 — QR destination safety

If target becomes unavailable, the resolver must show/redirect to a safe inactive destination rather than preserve a misleading live Apply experience.

---

# 6. V9.5d — RECRUITMENT POSTER GENERATOR

## V95-030 — Poster template catalog

```text
URGENT_HIRING
SINGLE_JOB
MULTI_JOB
RECRUITER_BRAND
CAMPAIGN
```

## V95-031 — Poster inputs

Poster consumes:

```text
canonical JobPosting public projection
recruiter public profile
approved brand/theme tokens
CTA
QR/short link
```

No recruiter-entered salary/location override.

## V95-032 — Static fact traceability

Because poster export is static, retain internal traceability:

```text
generatedAt
job reference/version where available
template version
```

Recommended public hint where useful:

```text
Quét QR để xem thông tin mới nhất
```

## V95-033 — Poster generation command

```text
generateRecruitmentPoster()
```

## V95-034 — Poster export

Initial:

```text
PNG
```

Optional later:

```text
JPG
PDF
```

## V95-035 — Closed-job warning

When reusing old poster assets:

```text
current Job state rechecked
closed/inactive warning shown
live QR still resolves canonical state
```

---

# 7. V9.5e — RECRUITMENT CAMPAIGN CORE

## V95-040 — RecruitmentCampaign model

Conceptual:

```text
id
ownerRecruiterProfileId
name
slug?
description?
status

startsAt?
endsAt?

appearanceConfig?
createdAt
updatedAt
version
```

Statuses:

```text
DRAFT
ACTIVE
PAUSED
ENDED
ARCHIVED
```

Marketing lifecycle only.

## V95-041 — Campaign Job references

```text
CampaignJobReference
campaignId
jobPostingId
displayOrder
featured
```

Job remains canonical.

## V95-042 — Campaign Post references

```text
CampaignPostReference
campaignId
socialPostId
displayOrder
```

Campaign references content; it does not duplicate content.

## V95-043 — Campaign commands

```text
createCampaign()
updateCampaign()
activateCampaign()
pauseCampaign()
endCampaign()
archiveCampaign()
```

No generic lifecycle PATCH.

## V95-044 — Campaign ownership/scope

Recruiter manages own campaigns.

Managers/admin may receive broader scope through canonical permissions.

---

# 8. V9.5f — CAMPAIGN LANDING PAGES

## V95-050 — Public campaign route

Example:

```text
/{recruiterSlug}/campaign/{campaignSlug}
```

## V95-051 — Campaign landing projection

Public-safe:

```text
campaign title
description
cover
active jobs
selected posts
recruiter identity
CTA
```

## V95-052 — Campaign appearance override

May customize:

```text
cover
accent
hero style
approved section ordering
```

Must not mutate recruiter default appearance.

## V95-053 — Campaign sections

Initial:

```text
HERO
FEATURED_JOBS
ALL_JOBS
FEATURED_POSTS
VIDEO
RECRUITER_INFO
CONTACT_CTA
FAQ
```

## V95-054 — Inactive campaign behavior

Recommended:

```text
ENDED
→ may remain viewable historically
→ no misleading active campaign CTA
→ current canonical Job state still rendered
```

---

# 9. V9.5g — DISTRIBUTION TRACKING

## V95-060 — DistributionEvent catalog

```text
SHARE_KIT_OPEN
COPY_LINK
SHORT_LINK_OPEN
QR_OPEN
POSTER_GENERATED
POSTER_DOWNLOAD
CAMPAIGN_VIEW
CAMPAIGN_JOB_CLICK
CAMPAIGN_CTA_CLICK
```

## V95-061 — Event payload

Public-safe context:

```text
targetType
target public/reference key
campaignId?
recruiterProfileId
channel?
timestamp
coarse session/device metadata where permitted
```

Avoid unnecessary PII.

## V95-062 — Traffic vs attribution invariant

Distribution analytics may answer:

```text
which asset/link produced traffic?
```

Universal AFF answers:

```text
who is canonical source/referrer?
```

Never merge these authorities.

## V95-063 — UTM-like tags

Optional analytics-only fields:

```text
source
medium
campaign
content
```

Not ReferralAttribution authority.

---

# 10. V9.5h — EXTERNAL DISTRIBUTION ADAPTERS

## V95-070 — Adapter boundary

Potential:

```text
Facebook
Zalo
TikTok
```

Initial priority:

```text
share-ready assets
copy/open-share workflows
```

rather than full auto-posting.

## V95-071 — Capability contract

Adapter may expose:

```text
CAN_SHARE_LINK
CAN_DEEP_LINK
CAN_AUTO_PUBLISH
CAN_UPLOAD_MEDIA
```

Do not assume external API capabilities.

## V95-072 — Auto-publish policy

If later supported:

```text
explicit connection
explicit permission
human confirmation
outbox/retry
audit
```

## V95-073 — Adapter failure

External network failure must not corrupt SocialPost or Campaign state.

---

# 11. V9.5i — SECURITY / PERFORMANCE / HARDENING

## V95-080 — Permissions

Suggested:

```text
distribution.share_self
short_link.create_self
poster.generate_self
campaign.create_self
campaign.manage_self
campaign.publish_self
campaign.manage_team
```

## V95-081 — Redirect security

Prevent:

```text
open redirect
protocol injection
destination tampering
```

## V95-082 — Rate limiting

Apply to:

```text
short-link creation
poster generation
QR generation
public redirect abuse
```

## V95-083 — Asset caching

QR/posters may use cache/CDN where safe.

## V95-084 — Campaign query performance

Batch:

```text
Job projections
Post projections
media
```

No N+1.

---

# 12. UNIVERSAL AFF INTEGRATION CONTRACT

V9.5 should consume capabilities similar to:

```text
getSelfAffiliateLink()
buildAffiliateDestination()
getAffiliateFeatureState()
```

Exact names depend on actual implementation.

Do NOT implement:

```text
hash(employeeId)
custom social referral cookie
campaign referral owner
poster referral table
```

If Universal AFF is unavailable/not reconciled:

```text
feature-gate affiliate decoration
use canonical non-attributed public URL
report blocker
```

Do not invent substitute attribution.

---

# 13. CAMPAIGN VS BUSINESS DOMAIN

`RecruitmentCampaign` is:

```text
marketing/distribution grouping
```

It is NOT:

```text
StaffingOrder
JobOpening
PlacementCase
Project
```

Example:

```text
Campaign: Samsung October Hiring
```

may reference multiple canonical JobPostings.

The Campaign is not canonical demand.

---

# 14. STATIC ASSET VS LIVE TRUTH

Dynamic destination is live truth.

Static asset is a presentation snapshot.

```text
Poster image
→ static marketing asset

QR / Short link
→ controlled live canonical route
```

Recruiters should be encouraged to distribute static assets together with live QR/link.

---

# 15. PERMANENT REGRESSION FIXTURES

## RF-V95-01 — Short link
Resolves approved destination only.

## RF-V95-02 — Open redirect attempt
Rejected.

## RF-V95-03 — QR Job
Resolves current canonical Job page.

## RF-V95-04 — Existing AFF attribution
Campaign click does not overwrite valid attribution by itself.

## RF-V95-05 — AFF unavailable
Distribution still works using canonical non-AFF link; no fake attribution implementation.

## RF-V95-06 — Poster salary
Generated from canonical Job projection.

## RF-V95-07 — Job closes after poster generation
Live QR destination reflects closed state.

## RF-V95-08 — Campaign activation
Does not create PlacementCase/Application.

## RF-V95-09 — Campaign Job changes
Landing page reflects current canonical Job facts.

## RF-V95-10 — Ended campaign
No misleading active campaign CTA.

## RF-V95-11 — Distribution event
Does not create ReferralAttribution.

## RF-V95-12 — External adapter failure
SocialPost/Campaign canonical state remains valid.

## RF-V95-13 — Unauthorized campaign edit
Rejected.

## RF-V95-14 — Large campaign
Job/Post projections batch efficiently.

---

# 16. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
distribution-service.ts handling links + QR + posters + campaigns + external APIs
campaign-job duplicate business model
affiliate logic inside share UI
```

Suggested structure:

```text
distribution/
  share-kit/
  destinations/

short-links/
  domain/
  application/
  resolver/

qr/
  application/

posters/
  templates/
  application/
  rendering/

campaigns/
  domain/
  application/
  queries/
  public-rendering/

distribution-analytics/
  events/

external-distribution/
  ports/
  adapters/
```

Universal AFF remains outside V9.5.

---

# 17. V9.5 EXIT GATE

## Share Kit

```text
[ ] share action registry
[ ] approved target resolver
[ ] safe metadata
```

## Short Links

```text
[ ] create
[ ] resolve
[ ] disable/expire
[ ] no open redirects
```

## QR

```text
[ ] profile/job/post/campaign QR
[ ] live resolver
[ ] optional AFF decoration
```

## Posters

```text
[ ] template catalog
[ ] canonical Job facts
[ ] recruiter branding
[ ] QR/CTA
[ ] traceability
```

## Campaigns

```text
[ ] campaign model
[ ] Job refs
[ ] Post refs
[ ] lifecycle commands
[ ] permissions
```

## Landing Page

```text
[ ] public campaign route
[ ] current Job projections
[ ] selected posts
[ ] appearance override
```

## Tracking

```text
[ ] distribution event catalog
[ ] traffic != attribution
[ ] privacy-safe payloads
```

## External Distribution

```text
[ ] adapter boundary
[ ] graceful failure
[ ] no auto-post without explicit capability/permission
```

## Regression

```text
[ ] RF-V95-01 through RF-V95-14 pass
```

---

# 18. HANDOFF TO V9.6

V9.6 owns Creator Analytics & Conversion Intelligence:

```text
profile/post/campaign performance
content funnel
traffic-to-apply conversion
apply-to-placement conversion
best content insights
channel performance
campaign performance
metric governance
```

V9.6 consumes social/distribution events and canonical business outcomes without becoming business authority.

---

# 19. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V95-001 through V95-004

Batch B
V95-010 through V95-023

Batch C
V95-030 through V95-035

Batch D
V95-040 through V95-044

Batch E
V95-050 through V95-054

Batch F
V95-060 through V95-073

Batch G
V95-080 through V95-084
Security/performance

Batch H
RF-V95-01 through RF-V95-14
V9.5 EXIT GATE
```

---

# 20. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
Campaign.referrerOwner
Poster.referralAttribution
ShortLink.commissionBeneficiary
CampaignJob salary/location copies as authority
```

Do NOT:

```text
treat click as source
treat campaign as demand
copy Job truth into marketing tables
auto-publish externally without permission
invent AFF behavior when Universal AFF is missing
```

---

# 21. PRODUCT OUTCOME

After V9.5, a recruiter should be able to:

```text
create content
→ package it for distribution
→ copy/share links
→ generate QR/posters
→ organize a recruitment campaign
→ publish a campaign landing page
→ measure traffic
```

while HRP continues to maintain:

```text
one Job truth
one Talent/Application truth
one Placement truth
one Affiliate attribution authority
```

V9.5 becomes the recruitment marketing distribution layer, not a competing business engine.
