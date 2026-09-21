# HRP V9.7 — AI CONTENT ASSISTANT IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V9.7  
**Prerequisite:** V9.6 Exit Gate PASS  
**Depends on:** V9.0 Social Publishing, V9.3 Content Studio, V9.5 Distribution, V9.6 Creator Analytics, canonical JobPosting public projection  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** AI-assisted recruitment content creation and repurposing without compromising canonical business truth

---

# 0. PURPOSE

V9.7 adds an AI Content Assistant to help recruiters create professional recruitment content faster.

The assistant may generate:

```text
HRP timeline posts
Facebook-style captions
Zalo posts
TikTok scripts
short captions
long captions
video scripts
FAQ drafts
job summaries
poster copy
campaign copy
```

V9.7 must remain optional.

Permanent rule:

> **AI OFF = Content Studio still works.**

AI supports content creation.

AI does NOT become:

```text
JobPosting authority
Application authority
ReferralAttribution authority
Placement authority
automatic publisher by default
```

---

# 1. NON-NEGOTIABLE INVARIANTS

1. AI-generated output is draft content.
2. Canonical Job facts must come from approved structured input.
3. AI may rephrase facts but must not invent them.
4. AI may not change salary.
5. AI may not change benefits.
6. AI may not change location.
7. AI may not change working hours/shift.
8. AI may not change requirements.
9. AI may not claim a Job is open if canonical state says otherwise.
10. Human approval is required before publish in initial release.
11. AI must not auto-publish to external channels by default.
12. AI must remain usable only within authorized recruiter scope.
13. AI prompts/context must minimize PII.
14. AI must not receive CV/private candidate data for ordinary content generation.
15. Analytics insights may guide content suggestions but must remain governed V9.6 metrics.
16. AI must not invent analytics claims.
17. AI output must pass content policy/validation before becoming a SocialPost draft.
18. AI failure must not corrupt existing drafts.
19. Model/provider changes must not silently change canonical prompt contracts.
20. AI generated text must remain clearly editable by recruiter.

---

# 2. DELIVERY SLICES

```text
V9.7a — AI Content Context Builder
V9.7b — Job Post Generator
V9.7c — Channel Repurposing
V9.7d — Video / Short-form Script Generator
V9.7e — FAQ / Guide Generator
V9.7f — Analytics-guided Suggestions
V9.7g — Human Review / Publishing Boundary
V9.7h — Evaluation / Safety / Observability
```

---

# 3. V9.7a — AI CONTENT CONTEXT BUILDER

## V97-001 — AIContentContext contract

**Type:** Application contract  
**Priority:** BLOCKER

Conceptual:

```text
recruiterProfile
canonicalJobFacts[]
selectedTemplate?
selectedTone?
targetChannel?
analyticsInsights?
campaignContext?
```

No unrestricted database dump.

---

## V97-002 — Canonical Job Facts DTO

AI receives an explicit fact envelope such as:

```text
jobPostingId
title
location
salaryDisplay
benefits[]
requirements[]
shift?
workType?
publicStatus
applyUrl capability
```

Only public-safe, canonical fields.

---

## V97-003 — Fact provenance

Each factual field should be traceable to source category:

```text
CANONICAL_JOB
RECRUITER_PROFILE
APPROVED_TEMPLATE
ANALYTICS_INSIGHT
EDITORIAL_INPUT
```

This supports validation and debugging.

---

## V97-004 — Context minimization

Do NOT send:

```text
internal notes
candidate CVs
private phone/email unless required
internal commercial terms
permissions/RBAC details
commission data
```

unless a future approved use case explicitly requires it.

---

# 4. V9.7b — JOB POST GENERATOR

## V97-010 — Generate Job Post command

```text
generateJobPostDraft()
```

Inputs:

```text
jobPostingId
targetTone
targetLength
optionalTemplate
```

Output:

```text
structured draft blocks
```

not directly published text.

---

## V97-011 — Tone presets

Initial:

```text
PROFESSIONAL
FRIENDLY
URGENT
YOUTHFUL
CONCISE
INFORMATIVE
```

Tone may change wording only.

It must not change facts.

---

## V97-012 — Length presets

```text
SHORT
STANDARD
LONG
```

---

## V97-013 — Generated block structure

Preferred output:

```text
HEADING
TEXT
JOB_REFERENCE
CTA
```

AI should not duplicate canonical JobCard facts unnecessarily when JobCard already renders them.

---

## V97-014 — Fact validation after generation

Generated output must be checked against canonical facts.

Examples:

```text
salary number mismatch
location mismatch
unsupported benefit
unsupported requirement
```

should be flagged/rejected before draft creation.

---

# 5. V9.7c — CHANNEL REPURPOSING

## V97-020 — Repurpose command

```text
repurposeContent()
```

Input:

```text
existing SocialPost
targetChannel
tone?
length?
```

Target channels:

```text
HRP_TIMELINE
FACEBOOK
ZALO
TIKTOK_SCRIPT
SHORT_CAPTION
```

---

## V97-021 — Channel profile catalog

Each channel gets presentation guidance:

```text
preferred length
format
CTA style
hashtag guidance
line-break style
```

No business logic inside channel profile.

---

## V97-022 — Facebook variant

May optimize for:

```text
hook
readability
clear CTA
job link
```

---

## V97-023 — Zalo variant

May optimize for:

```text
shorter structure
direct CTA
mobile readability
```

---

## V97-024 — TikTok script variant

May output:

```text
hook
spoken script
shot notes
CTA
```

Do not claim third-party auto-posting.

---

## V97-025 — Multi-channel batch

Recruiter may request:

```text
Generate:
Facebook
Zalo
TikTok
```

but each result remains a separate draft/variant.

---

# 6. V9.7d — VIDEO / SHORT-FORM SCRIPT GENERATOR

## V97-030 — Video script command

```text
generateVideoScript()
```

Inputs:

```text
JobPosting
duration target
tone
format
```

Suggested duration presets:

```text
15s
30s
60s
```

---

## V97-031 — Script structure

Output:

```text
Hook
Key facts
Recruiter line
CTA
Optional shot suggestions
```

---

## V97-032 — Short-form safety

Avoid invented urgency like:

```text
"chỉ còn hôm nay"
"còn đúng 5 suất"
```

unless canonical input explicitly supports it.

---

# 7. V9.7e — FAQ / GUIDE GENERATOR

## V97-040 — FAQ draft generator

From:

```text
canonical Job facts
approved recruiter FAQ
```

AI may draft:

```text
common candidate questions
answers
```

---

## V97-041 — FAQ fact validation

Answers about:

```text
salary
documents
transport
shift
requirements
fees
```

must be grounded in approved facts.

If unsupported:

```text
AI should omit
or mark "cần recruiter xác nhận"
```

not invent.

---

## V97-042 — Guide generator

Examples:

```text
How to prepare for interview
What documents to bring
How to apply through HRP
```

Guide content may use approved HRP process knowledge.

Do not fabricate company-specific policy.

---

# 8. V9.7f — ANALYTICS-GUIDED SUGGESTIONS

## V97-050 — Insight input

AI may consume governed V9.6 insights such as:

```text
VIDEO posts had higher CTA rate in past 30 days
Bắc Ninh content had higher application conversion
Evening posts had higher engagement
```

---

## V97-051 — Suggestion examples

AI may suggest:

```text
Try a 30-second video for this Job.
Use a shorter caption.
Lead with location and salary.
Create a job collection for Bắc Ninh.
```

---

## V97-052 — Recommendation boundaries

AI must not say:

```text
"This will definitely perform better."
```

Prefer:

```text
"Based on your past 30-day data..."
```

and include the metric window/definition where practical.

---

## V97-053 — No opaque performance scoring

Do not generate:

```text
Recruiter quality score
Content quality score
employee ranking
```

unless separately defined by governed product policy later.

---

# 9. V9.7g — HUMAN REVIEW / PUBLISHING BOUNDARY

## V97-060 — Draft-first workflow

Required:

```text
Generate
→ Review
→ Edit
→ Validate
→ Save Draft
→ Publish/Schedule
```

---

## V97-061 — AI output labeling

Studio should identify:

```text
AI-generated draft
```

internally/UI where useful.

Do not imply content is already approved.

---

## V97-062 — Publish validation

Before publish:

```text
canonical Job state rechecked
Job facts revalidated
CTA valid
content safe
```

---

## V97-063 — No autonomous publish initially

Default:

```text
AI cannot directly call publishSocialPost()
```

without explicit human action.

---

## V97-064 — External distribution boundary

AI may generate:

```text
Facebook copy
Zalo copy
TikTok script
```

External posting still uses V9.5 distribution adapters and permission flow.

---

# 10. V9.7h — EVALUATION / SAFETY / OBSERVABILITY

## V97-070 — AI generation audit metadata

Store minimal metadata:

```text
generationId
model/provider identifier
prompt contract version
source context IDs
createdAt
actor
```

Avoid storing hidden chain-of-thought.

---

## V97-071 — Prompt contract versioning

Prompt templates must be versioned.

Do not scatter prompts across UI files.

---

## V97-072 — Evaluation suite

Create representative fixtures:

```text
single Job
multi-job
closed Job
missing salary
missing shift
high-salary Job
temporary work
direct-hire Job
HRP-managed Job
```

---

## V97-073 — Hallucination checks

Automated/semi-automated checks for:

```text
salary mismatch
location mismatch
unsupported benefit
unsupported requirement
false urgency
false availability
```

---

## V97-074 — Quality metrics

Track:

```text
generation success
fact-validation failure
human edit rate
publish-after-generation rate
regeneration rate
```

These are product quality metrics, not employee performance metrics.

---

## V97-075 — Provider failure

If AI unavailable:

```text
Content Studio remains functional
templates remain functional
manual editing remains functional
```

---

# 11. AI CAPABILITY REGISTRY

Recommended capabilities:

```text
GENERATE_JOB_POST
REPURPOSE_POST
GENERATE_VIDEO_SCRIPT
GENERATE_FAQ
GENERATE_GUIDE
SUGGEST_CONTENT_IDEA
```

Each capability defines:

```text
required input
allowed context
output schema
validation policy
```

Avoid generic:

```text
askAI(anything)
```

inside production content workflows.

---

# 12. OUTPUT SCHEMAS

Prefer structured outputs.

Example:

```text
GeneratedPostDraft
  title?
  blocks[]
  suggestedCTA?
  warnings[]
  sourceFactsUsed[]
```

For video:

```text
GeneratedVideoScript
  hook
  scenes[]
  spokenLines[]
  CTA
  warnings[]
```

This is safer than unstructured giant text blobs.

---

# 13. PII / DATA SAFETY

Do not include candidate personal data in ordinary content generation.

No:

```text
CV
candidate phone
candidate email
private notes
identity documents
```

Recruiter profile data should use public-safe projection.

---

# 14. COST / RATE CONTROL

## V97-080 — AI usage limits

Potential controls:

```text
per-user daily quota
per-capability quota
model tier selection
max input size
max output size
```

---

## V97-081 — Caching/reuse

Safe reuse may apply to:

```text
same Job
same template
same channel
```

but recruiter-specific personalization must remain correct.

---

## V97-082 — Long-context prevention

Do not send entire social history.

Use:

```text
selected post
selected metrics
selected recruiter profile
selected Job facts
```

---

# 15. PERMANENT REGRESSION FIXTURES

## RF-V97-01 — Salary
AI output cannot contradict canonical salary.

## RF-V97-02 — Location
AI output cannot invent another location.

## RF-V97-03 — Missing benefit
AI does not invent benefit.

## RF-V97-04 — Closed Job
AI cannot present it as actively hiring.

## RF-V97-05 — False urgency
AI does not invent deadline/limited slots.

## RF-V97-06 — Human review
AI output does not auto-publish.

## RF-V97-07 — Provider outage
Manual Content Studio still works.

## RF-V97-08 — Analytics suggestion
References governed metric/window only.

## RF-V97-09 — Candidate PII
Not passed into generation context.

## RF-V97-10 — Multi-channel
Each variant preserves same canonical facts.

## RF-V97-11 — Prompt upgrade
Version recorded; existing audit remains interpretable.

## RF-V97-12 — Job changes before publish
Publish revalidation catches stale generated text.

## RF-V97-13 — Unsupported FAQ fact
Output marks for confirmation/omits; does not invent.

## RF-V97-14 — External posting
AI generation alone does not post to Facebook/Zalo/TikTok.

---

# 16. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
ai-service.ts
prompt-utils.ts
content-ai-page.tsx
```

as giant catch-all modules.

Suggested structure:

```text
ai-content/
  capabilities/
    generate-job-post/
    repurpose-post/
    video-script/
    faq/
    guide/
    suggestions/

  context/
    job-context-builder/
    recruiter-context-builder/
    analytics-context-builder/

  prompts/
    registry/
    versions/

  validation/
    fact-check/
    output-schema/

  providers/
    ports/
    adapters/

  evaluation/
    fixtures/
    runners/

  observability/
    generation-audit/
```

One canonical prompt registry.

One canonical capability registry.

---

# 17. V9.7 EXIT GATE

## Context

```text
[ ] AIContentContext
[ ] canonical Job fact DTO
[ ] context minimization
[ ] provenance
```

## Generation

```text
[ ] job post
[ ] tone/length presets
[ ] structured output
[ ] fact validation
```

## Repurposing

```text
[ ] HRP
[ ] Facebook
[ ] Zalo
[ ] TikTok script
[ ] multi-channel variants
```

## Video/FAQ/Guide

```text
[ ] video script
[ ] FAQ
[ ] guide
[ ] unsupported facts handled safely
```

## Analytics guidance

```text
[ ] governed V9.6 insight input
[ ] no unsupported certainty
```

## Human control

```text
[ ] draft-first
[ ] explicit review
[ ] publish revalidation
[ ] no autonomous publishing
```

## Safety/Evaluation

```text
[ ] prompt versioning
[ ] evaluation suite
[ ] hallucination checks
[ ] provider fallback
[ ] PII minimization
```

## Regression

```text
[ ] RF-V97-01 through RF-V97-14 pass
```

---

# 18. HANDOFF TO V9.8

V9.8 owns Social Platform Hardening:

```text
moderation center
spam/abuse controls
privacy hardening
SEO
performance
cache/CDN
mobile
accessibility
notification scale
operational observability
degraded dependency behavior
```

V9.8 also validates V9.0–V9.7 as one coherent platform.

---

# 19. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V97-001 through V97-004

Batch B
V97-010 through V97-014

Batch C
V97-020 through V97-025

Batch D
V97-030 through V97-042

Batch E
V97-050 through V97-064

Batch F
V97-070 through V97-082

Batch G
RF-V97-01 through RF-V97-14
V9.7 EXIT GATE
```

---

# 20. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
AIJobPosting
AIReferralAttribution
AIPlacement
AIPublishAuthority
```

Do NOT:

```text
let AI invent business facts
let AI auto-publish by default
send full candidate data into content generation
scatter prompt text throughout UI/components
use analytics suggestions as deterministic truth
```

---

# 21. PRODUCT OUTCOME

After V9.7, a recruiter should be able to:

```text
select a Job
→ generate a professional post
→ create Facebook/Zalo variants
→ generate TikTok/video script
→ generate FAQ/guide
→ use analytics-informed suggestions
→ review/edit
→ publish/schedule through normal V9 workflow
```

while HRP guarantees:

```text
AI helps write.
Canonical systems define truth.
Human remains in control of publishing.
```
