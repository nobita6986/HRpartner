# HRP V9.2 — ADVANCED PROFILE, PERSONAL BRAND & APPEARANCE BACKLOG

**Status:** Draft for implementation  
**Target release:** V9.2  
**Prerequisite:** V9.1 Exit Gate PASS  
**Depends on:** V8 Recruiter Public Profile, V9.0 Social Publishing, V9.1 Recruiter Timeline  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Controlled recruiter branding, themes, layouts, portfolio, and public trust

---

# 0. PURPOSE

V9.2 transforms the recruiter public channel from a functional social page into a professional, customizable personal recruitment brand.

It must allow recruiters to customize:

```text
profile identity
specialties
cover/avatar
theme preset
accent color
layout preset
section order
section visibility
timeline density
featured content composition
```

while preserving:

```text
canonical Job truth
AFF truth
ReferralAttribution
HandlingAssignment
Placement truth
permission/security boundaries
HRP trust/verification elements
```

Permanent invariant:

> **Presentation customizable. Canonical truth immutable.**

---

# 1. NON-NEGOTIABLE INVARIANTS

1. Appearance state is experience state only.
2. Theme/layout cannot mutate canonical business entities.
3. Recruiter customization cannot hide mandatory HRP trust/safety elements.
4. Recruiter cannot inject arbitrary CSS/JS/HTML.
5. Only approved components/design tokens may be customized.
6. Accessibility remains platform-controlled.
7. Mobile responsiveness remains platform-controlled.
8. Layout changes do not alter content ownership or publication state.
9. Section order does not change Job priority.
10. Recruiter portfolio claims should derive from canonical evidence where possible.
11. Verified recruiter state must come from canonical HRP relationship, not self-claim.
12. Testimonials require moderation and optional verification.
13. Public appearance must support draft/preview/publish behavior.
14. Suspended recruiter profile must override published appearance.
15. Theme catalog must be centrally managed.
16. Custom color support, if enabled, must pass contrast/accessibility validation.

---

# 2. DELIVERY SLICES

```text
V9.2a — Recruiter Specialization & Public Identity
V9.2b — Verified Recruiter & Trust Layer
V9.2c — Theme / Color System
V9.2d — Layout Presets
V9.2e — Section Composition
V9.2f — Appearance Draft / Preview / Publish
V9.2g — Recruiter Portfolio
V9.2h — Testimonials
V9.2i — Security / Accessibility / Hardening
```

---

# 3. V9.2a — RECRUITER SPECIALIZATION & PUBLIC IDENTITY

## V92-001 — Recruiter specialization model

**Type:** Experience/profile taxonomy  
**Priority:** BLOCKER

Conceptual fields:

```text
industries[]
jobCategories[]
locations[]
recruitmentTypes[]
languages[]
specialtyTags[]
```

Examples:

```text
Electronics
Warehouse
QC
Factory
Bắc Ninh
Bắc Giang
Temporary
Permanent
```

These are public profile attributes.

They must not imply:

```text
candidate ownership
ReferralAttribution
HandlingAssignment
commission entitlement
```

---

## V92-002 — Specialization catalog

Use centralized approved taxonomy where possible.

Avoid arbitrary free-text for all fields if canonical catalogs already exist.

Free-text tags may be allowed only where needed.

---

## V92-003 — Public recruiter identity projection

Include:

```text
displayName
headline
bio
avatar
cover
verified state
specialties
areas served
public contacts
social links
```

No internal user/account metadata leakage.

---

# 4. V9.2b — VERIFIED RECRUITER & TRUST LAYER

## V92-010 — Verified recruiter derivation

**Type:** Projection/security  
**Priority:** BLOCKER

Derived from canonical HRP relationship.

Possible criteria:

```text
active HRP user
eligible recruiter capability
not suspended
public profile approved
```

Exact policy should be centralized.

---

## V92-011 — Mandatory trust elements

Platform-owned elements may include:

```text
Verified by HRP
HRP trust mark
Report profile
Privacy
canonical Job status
```

Recruiter theme/layout cannot remove them.

---

## V92-012 — Trust element presentation contract

Theme may alter surrounding appearance, but not visibility/meaning of trust components.

---

# 5. V9.2c — THEME / COLOR SYSTEM

## V92-020 — ThemePreset catalog

Initial candidates:

```text
PROFESSIONAL
FRIENDLY
INDUSTRIAL
YOUTH
MINIMAL
DARK
PREMIUM
```

Theme defines presentation tokens only.

---

## V92-021 — Theme token contract

Potential tokens:

```text
accentColor
backgroundTone
surfaceTone
buttonVariant
cardVariant
borderRadius
headingStyle
density
```

Do not persist arbitrary CSS.

---

## V92-022 — Approved accent palette

Initial:

```text
BLUE
GREEN
ORANGE
RED
PURPLE
PINK
TEAL
NEUTRAL
```

---

## V92-023 — Custom color validation

If custom hex color support is later enabled:

```text
validate format
derive accessible text color
derive hover/focus states
check contrast
reject inaccessible combination
```

---

## V92-024 — Color mode

Optional:

```text
LIGHT
DARK
SYSTEM
```

Only where theme supports it.

---

# 6. V9.2d — LAYOUT PRESETS

## V92-030 — LayoutPreset catalog

Initial presets:

```text
SOCIAL_TIMELINE
RECRUITER_PROFESSIONAL
JOB_FIRST
CREATOR
```

---

## V92-031 — SOCIAL_TIMELINE layout

```text
Cover
Profile Header

Desktop:
Left sidebar:
  Intro
  Jobs
  Social links

Main:
  Timeline
```

Mobile collapses to single column.

---

## V92-032 — RECRUITER_PROFESSIONAL layout

```text
Cover
Recruiter identity
Specialties
CTA
Featured Jobs
Portfolio
Timeline
Testimonials
```

---

## V92-033 — JOB_FIRST layout

```text
Cover
Recruiter header
Hot Jobs
Featured Job Collection
Latest Posts
Videos
About
```

---

## V92-034 — CREATOR layout

```text
Cover
Recruiter/audience summary
Featured video
Featured content
Timeline
Jobs
```

---

## V92-035 — Layout renderer registry

Map layout preset → approved composition strategy.

Do not create one giant conditional layout component.

---

# 7. V9.2e — SECTION COMPOSITION

## V92-040 — Section catalog

Initial sections:

```text
FEATURED_JOBS
FEATURED_POSTS
TIMELINE
VIDEOS
PORTFOLIO
TESTIMONIALS
FAQ
CONTACT_CTA
SOCIAL_LINKS
```

---

## V92-041 — Section order

Recruiter may reorder approved sections.

Store stable section keys, not raw component names.

---

## V92-042 — Section visibility

Recruiter may show/hide optional sections.

Mandatory sections/trust controls cannot be hidden.

---

## V92-043 — Section constraints

Examples:

```text
Timeline required for SOCIAL_TIMELINE layout
Featured Jobs optional
Verified Trust always rendered if applicable
Contact CTA may be required by company policy
```

Centralize constraints.

---

# 8. V9.2f — APPEARANCE DRAFT / PREVIEW / PUBLISH

## V92-050 — RecruiterAppearancePreference schema

**Type:** Experience schema  
**Priority:** BLOCKER

Conceptual:

```text
id
recruiterProfileId

themePreset
accentColor
colorMode

layoutPreset
timelineDensity

sectionOrder
sectionVisibility

draftConfig?
publishedConfig?

createdAt
updatedAt
version
```

Implementation may normalize rather than store one giant blob.

---

## V92-051 — Appearance draft command

```text
updateAppearanceDraft()
```

No public side effect.

---

## V92-052 — Appearance preview

Preview should use same renderer as public page.

Modes:

```text
Desktop
Mobile
```

---

## V92-053 — Publish appearance command

```text
publishAppearance()
```

Validates:

```text
theme valid
layout valid
section constraints
contrast/accessibility
mandatory trust sections
```

---

## V92-054 — Revert/reset appearance

Commands:

```text
resetAppearanceToDefault()
revertDraftToPublished()
```

---

## V92-055 — Appearance versioning

Use version/concurrency token to avoid lost edits.

---

# 9. V9.2g — RECRUITER PORTFOLIO

## V92-060 — Portfolio projection

Potential public signals:

```text
companies/projects recruited for
job categories recruited
effective placements
recent successful placements
areas of experience
```

Prefer canonical V7 projections.

---

## V92-061 — Sensitive client filtering

Do not expose:

```text
confidential client names
internal project codes
commercial terms
private placement details
```

Public portfolio policy must be allow-listed.

---

## V92-062 — Manual portfolio items

Initial recommendation:

```text
avoid arbitrary unverified claims
```

If manual items are later allowed, clearly label them as self-provided and subject to moderation.

---

# 10. V9.2h — TESTIMONIALS

## V92-070 — CandidateTestimonial schema

Conceptual:

```text
id
recruiterProfileId
authorLaborProfileId?
placementId?

content
status
verifiedPlacement

submittedAt
approvedAt?
publishedAt?
```

---

## V92-071 — Testimonial verification

If linked to canonical Placement:

```text
Placement EFFECTIVE
→ eligible for Verified Placement badge
```

Exact policy centralized.

---

## V92-072 — Testimonial moderation

Statuses:

```text
PENDING
APPROVED
REJECTED
HIDDEN
```

No auto-publish by default.

---

## V92-073 — Testimonial public projection

Expose only approved/public-safe content.

---

# 11. V9.2i — SECURITY / ACCESSIBILITY / HARDENING

## V92-080 — Appearance permissions

Suggested:

```text
recruiter_appearance.read_self
recruiter_appearance.manage_self
recruiter_appearance.publish_self
recruiter_profile.verify
recruiter_testimonial.moderate
```

---

## V92-081 — No arbitrary CSS/JS

Reject any attempt to persist arbitrary executable style/script payloads.

---

## V92-082 — Contrast validation

All published appearance must pass platform accessibility policy.

---

## V92-083 — Responsive invariant

Every layout preset must have:

```text
desktop behavior
tablet behavior
mobile behavior
```

Recruiter cannot disable responsive rules.

---

## V92-084 — Public cache invalidation

Invalidate public appearance when:

```text
appearance publish
profile suspend
theme catalog update
mandatory trust policy update
```

---

# 12. OPTIONAL FUTURE EXTENSIONS

Not required in V9.2 initial release:

```text
custom external domain
theme marketplace
company-provided custom theme packs
seasonal campaigns
advanced animation
```

Architecture should not block them.

---

# 13. CAMPAIGN APPEARANCE OVERRIDE

V9.5 may later allow campaign-specific appearance:

```text
campaignCover
campaignAccent
campaignHeroStyle
```

This override:

```text
does not mutate recruiter default appearance
does not alter canonical Job facts
```

---

# 14. PERMANENT REGRESSION FIXTURES

## RF-V92-01 — Theme change

Presentation changes; Job/AFF/Placement data unchanged.

---

## RF-V92-02 — Layout change

Same content/data rendered in different approved composition.

---

## RF-V92-03 — Section reorder

Does not change Job priority or publication order.

---

## RF-V92-04 — Hide mandatory trust

Attempt rejected.

---

## RF-V92-05 — Invalid color

Rejected or normalized by accessibility policy.

---

## RF-V92-06 — Mobile layout

Published appearance remains usable on mobile.

---

## RF-V92-07 — Profile suspended

Public appearance/content becomes unavailable according to policy.

---

## RF-V92-08 — Verified badge

Cannot be self-enabled by recruiter.

---

## RF-V92-09 — Portfolio canonical metrics

Reflect approved canonical data, not recruiter-entered business counts.

---

## RF-V92-10 — Confidential client

Not exposed in public portfolio.

---

## RF-V92-11 — Testimonial pending

Not visible publicly.

---

## RF-V92-12 — Verified testimonial

Badge appears only when policy and canonical Placement evidence allow it.

---

## RF-V92-13 — Concurrent appearance edit

Stale update rejected/reconciled.

---

## RF-V92-14 — Theme catalog update

Existing profiles remain renderable or migrate safely.

---

# 15. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
profile-customization-page.tsx with all logic
theme-utils.ts with arbitrary CSS
layout-renderer.tsx giant switch
appearance-config JSON with unvalidated free-form fields
```

Suggested structure:

```text
recruiter-brand/
  specialization/
  trust/

appearance/
  domain/
    theme-preset.ts
    layout-preset.ts
    section-catalog.ts

  application/
    update-draft.ts
    publish-appearance.ts
    reset-appearance.ts

  rendering/
    theme-registry/
    layout-registry/
    section-registry/

  validation/
    contrast.ts
    layout-constraints.ts

portfolio/
  queries/
  ui/

testimonials/
  domain/
  application/
  queries/
  moderation/
```

---

# 16. V9.2 EXIT GATE

## Identity/Brand

```text
[ ] specialization profile
[ ] verified recruiter derivation
[ ] mandatory HRP trust layer
```

## Appearance

```text
[ ] theme presets
[ ] approved accent palette
[ ] color mode where enabled
[ ] no arbitrary CSS/JS
```

## Layout

```text
[ ] Social Timeline
[ ] Recruiter Professional
[ ] Job-first
[ ] Creator
[ ] responsive behaviors
```

## Sections

```text
[ ] reorder
[ ] show/hide optional sections
[ ] mandatory section constraints
```

## Preview/Publish

```text
[ ] draft
[ ] desktop preview
[ ] mobile preview
[ ] publish
[ ] reset/revert
[ ] concurrency safe
```

## Portfolio/Testimonial

```text
[ ] public-safe portfolio
[ ] client confidentiality filter
[ ] testimonial moderation
[ ] verified placement badge where enabled
```

## Security/Accessibility

```text
[ ] contrast validation
[ ] trust elements cannot be hidden
[ ] no business truth mutation
```

## Regression

```text
[ ] RF-V92-01 through RF-V92-14 pass
```

---

# 17. HANDOFF TO V9.3

V9.3 owns Content Studio & Scheduling:

```text
Create Post workspace
Templates
Smart Job Post creation
Draft management
Scheduled publishing
Content Calendar
Media Library integration
Preview
Duplicate/repurpose content
```

V9.3 must reuse V9.0 publishing model and V9.2 appearance renderer where preview context matters.

---

# 18. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V92-001 through V92-012

Batch B
V92-020 through V92-024

Batch C
V92-030 through V92-035

Batch D
V92-040 through V92-043

Batch E
V92-050 through V92-055

Batch F
V92-060 through V92-073

Batch G
V92-080 through V92-084
Security/accessibility

Batch H
RF-V92-01 through RF-V92-14
V9.2 EXIT GATE
```

---

# 19. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
RecruiterTheme.cssText
RecruiterLayout.rawHtml
RecruiterProfile.verifiedSelfClaim
Portfolio.manualPlacementCount
```

Do NOT:

```text
allow recruiter theme to hide HRP trust
allow appearance to change canonical data
allow custom scripts
allow public portfolio to expose internal client information
treat profile specialty as candidate ownership
```

---

# 20. PRODUCT OUTCOME

After V9.2, every recruiter should be able to say:

```text
"This is my recruitment channel,
with my visual identity,
my specialties,
my preferred layout,
my public credibility,
and my verified portfolio."
```

while HRP still guarantees that presentation changes never alter business truth.
