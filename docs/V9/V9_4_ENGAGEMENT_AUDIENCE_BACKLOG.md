# HRP V9.4 — ENGAGEMENT & AUDIENCE IMPLEMENTATION BACKLOG

**Status:** Draft for implementation  
**Target release:** V9.4  
**Prerequisite:** V9.3 Exit Gate PASS  
**Depends on:** V9.0 Social Publishing, V9.1 Timeline, V9.3 Content Studio, V8 Notification Preferences/Omnichannel where available  
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` mandatory  
**Primary purpose:** Build lightweight recruiter audience relationships and safe social engagement

---

# 0. PURPOSE

V9.4 introduces engagement and audience capabilities around recruiter social channels.

It should allow candidates/users to:

```text
follow recruiters
subscribe to selected recruitment updates
react to posts
interact with FAQ/Q&A
comment where moderation is enabled
receive audience-safe notifications
```

V9.4 must NOT create a second candidate ownership or attribution system.

Permanent distinctions:

```text
Follower != ReferralAttribution
Follower != HandlingAssignment
Reaction != Application
Comment != HandlingAssignment
Comment != candidate ownership
Audience != recruiter ownership of LaborProfile
```

---

# 1. NON-NEGOTIABLE INVARIANTS

1. Follow is an audience relationship only.
2. Follow does not assign candidate source.
3. Follow does not create HandlingAssignment.
4. Follow does not create commission entitlement.
5. Reaction is an engagement event only.
6. Reaction does not create Application.
7. Comment is social content only.
8. Comment does not mutate PlacementCase.
9. Job alert subscription is notification preference, not job application.
10. Audience metrics are projections, not business authority.
11. Existing ReferralAttribution cannot be overwritten by follow/reaction/comment.
12. Public engagement must be rate-limited and abuse-controlled.
13. Comments require moderation/reporting capability before broad rollout.
14. Private messaging should reuse Omnichannel where available, not create a second chat backend.
15. Unfollow removes future audience subscription only; it does not rewrite historical business events.
16. Anonymous/public identity policy must be explicit.
17. External engagement events must not expose internal IDs/PII.
18. Notification delivery preferences do not alter underlying social/business events.

---

# 2. DELIVERY SLICES

```text
V9.4a — Recruiter Follow
V9.4b — Job / Content Subscriptions
V9.4c — Reactions
V9.4d — FAQ / Q&A Interaction
V9.4e — Comments
V9.4f — Audience Notifications
V9.4g — Audience Read Models & Metrics
V9.4h — Abuse / Moderation / Security
```

---

# 3. V9.4a — RECRUITER FOLLOW

## V94-001 — RecruiterFollower schema

**Type:** Social relationship  
**Priority:** BLOCKER

Conceptual:

```text
id
recruiterProfileId
followerUserId?
followerLaborProfileId?
followerAnonymousKey?   # only if anonymous follow is explicitly supported

status
followedAt
unfollowedAt?

createdAt
updatedAt
```

Initial recommendation:

```text
authenticated follow preferred
anonymous follow deferred
```

Avoid ambiguous identity where possible.

---

## V94-002 — Follow command

```text
followRecruiter()
```

Must be idempotent.

Repeated follow must not create duplicates.

---

## V94-003 — Unfollow command

```text
unfollowRecruiter()
```

Preserves historical timestamps where needed.

Does not alter:

```text
ReferralAttribution
HandlingAssignment
Application
Placement
```

---

## V94-004 — Follow state query

Public/profile UI may query:

```text
isFollowing
followerCount
```

subject to privacy/product policy.

---

# 4. V9.4b — JOB / CONTENT SUBSCRIPTIONS

## V94-010 — AudienceSubscription model

**Type:** Notification preference / audience  
**Priority:** HIGH

Potential subscription types:

```text
RECRUITER_POSTS
RECRUITER_JOBS
LOCATION_JOBS
JOB_CATEGORY
COMPANY
SALARY_THRESHOLD
```

Initial scope recommendation:

```text
RECRUITER_POSTS
RECRUITER_JOBS
LOCATION_JOBS
JOB_CATEGORY
```

---

## V94-011 — Subscription scope

Conceptual:

```text
subscriber identity
subscriptionType
targetKey
filters?
enabled
createdAt
updatedAt
```

Filters must be validated.

No arbitrary query expressions.

---

## V94-012 — Subscribe/unsubscribe commands

```text
subscribe()
unsubscribe()
```

Idempotent.

---

## V94-013 — Subscription matching

When content/job event occurs:

```text
canonical event
→ evaluate matching audience subscriptions
→ enqueue notification
```

Subscription matching does not create:

```text
Application
ReferralAttribution
Handling
```

---

# 5. V9.4c — REACTIONS

## V94-020 — PostReaction schema

**Type:** Engagement  
**Priority:** BLOCKER

Suggested reactions:

```text
LIKE
INTERESTED
HELPFUL
```

Avoid overly large reaction catalog initially.

---

## V94-021 — Reaction uniqueness

Recommended uniqueness:

```text
one reaction per actor per post
```

Actor may change reaction.

---

## V94-022 — React command

```text
reactToPost(postId, reactionType)
```

Validates:

```text
post public/accessible
actor identity
rate limit
reaction type
```

---

## V94-023 — Remove/change reaction

```text
removeReaction()
changeReaction()
```

---

## V94-024 — Reaction counts

Public read model may expose:

```text
reactionCounts
viewerReaction
```

Counts are social metrics only.

---

# 6. V9.4d — FAQ / Q&A INTERACTION

## V94-030 — Recruiter FAQ model

Conceptual:

```text
id
recruiterProfileId
question
answerBlocks
displayOrder
status
```

---

## V94-031 — FAQ management

Recruiter can:

```text
create
edit
reorder
publish/unpublish
```

---

## V94-032 — FAQ public projection

Only published items.

---

## V94-033 — Q&A prompt

Recruiter may publish Q&A-oriented SocialPost.

Initial interaction options:

```text
Ask privately
Leave question
View FAQ
```

---

## V94-034 — Private question routing

If private messaging infrastructure exists:

```text
V9 UI
→ Omnichannel / existing conversation boundary
```

Do not create `SocialChat`.

If unavailable:

```text
fallback to approved contact CTA / lead form
```

---

# 7. V9.4e — COMMENTS

## V94-040 — Comment rollout gate

Comments must NOT be enabled broadly until:

```text
moderation
report
hide/delete
rate limit
spam protection
notification
```

are ready.

---

## V94-041 — PostComment schema

Conceptual:

```text
id
postId
author identity
parentCommentId?
body
status
createdAt
updatedAt
```

Recommended initial nesting:

```text
max 1 reply level
```

Avoid deep-thread complexity.

---

## V94-042 — Comment status

```text
VISIBLE
HIDDEN
DELETED
MODERATION_HOLD
```

---

## V94-043 — Create comment command

```text
createComment()
```

Must validate:

```text
post public
actor allowed
content safe
rate limit
```

---

## V94-044 — Hide/delete/report comment

Commands:

```text
hideComment()
deleteOwnComment()
reportComment()
moderateComment()
```

All moderation auditable.

---

## V94-045 — Comment edit policy

Initial recommendation:

```text
allow short edit window
or
no edit after replies
```

Exact policy must be explicit.

---

# 8. V9.4f — AUDIENCE NOTIFICATIONS

## V94-050 — Social notification event catalog

Potential events:

```text
RECRUITER_NEW_POST
RECRUITER_NEW_JOB_POST
COMMENT_REPLY
COMMENT_MODERATION
Q_AND_A_RESPONSE
SUBSCRIPTION_JOB_MATCH
```

---

## V94-051 — Notification preferences

Reuse V8.4 notification preference foundation where possible.

Do not create a separate notification preference system.

---

## V94-052 — Notification dedupe

Repeated retries/events must not spam users.

Use canonical event/correlation key.

---

## V94-053 — Notification deep link

Deep links to:

```text
recruiter profile
post
job
comment context
```

Permission/public state checked at open time.

---

# 9. V9.4g — AUDIENCE READ MODELS & METRICS

## V94-060 — RecruiterAudienceReadModel

Potential:

```text
followerCount
newFollowers7d
subscriptionsCount
reactionCount30d
commentCount30d
```

Only non-sensitive aggregate data.

---

## V94-061 — Public follower count

Product decision:

```text
show
hide
or threshold-based display
```

Initial recommendation:

```text
configurable
```

Do not expose follower identities publicly by default.

---

## V94-062 — Recruiter audience list

Recruiter may see limited audience information only according to privacy policy.

Avoid exposing full LaborProfile data just because someone followed.

---

## V94-063 — Engagement metrics

Examples:

```text
followers gained
reactions
comments
subscription count
```

Full creator analytics belongs to V9.6.

---

# 10. V9.4h — ABUSE / MODERATION / SECURITY

## V94-070 — Rate limiting

Apply to:

```text
follow/unfollow bursts
reactions
comments
reports
public questions
```

---

## V94-071 — Spam protection

For comments/questions:

```text
velocity limits
duplicate text detection
link restrictions
bot protection where needed
```

---

## V94-072 — Report system hook

Users can report:

```text
post
comment
recruiter profile
testimonial
```

Full moderation center may evolve later.

---

## V94-073 — Block/mute future capability

Architecture may reserve support for:

```text
block user
mute recruiter
```

Not required initially.

---

## V94-074 — PII safety

Do not expose:

```text
phone
email
LaborProfile details
internal user IDs
```

in follower/reaction/comment payloads unless explicitly intended.

---

# 11. IDENTITY MODEL

Preferred engagement actor order:

```text
authenticated User
→ mapped public identity
```

Where a candidate has a LaborProfile:

```text
User identity may link to LaborProfile
```

but social engagement still references audience actor identity, not candidate ownership.

Do not require every follower to have PlacementCase.

---

# 12. BUSINESS BOUNDARY EXAMPLES

## Follow Recruiter

```text
Candidate follows Minh
```

Expected:

```text
RecruiterFollower created
notification subscription optional
```

Not expected:

```text
ReferralAttribution created
HandlingAssignment created
PlacementCase opened
```

---

## Reaction

```text
Candidate clicks INTERESTED
```

Expected:

```text
PostReaction
```

Not expected:

```text
Application
Lead
ReferralAttribution
```

If product later adds an explicit CTA:

```text
"I'm interested in this job"
```

that must be a separate canonical action, not inferred from reaction.

---

## Comment

```text
"Job này còn tuyển không?"
```

Expected:

```text
PostComment
```

Recruiter may then direct candidate to Apply/Ask Recruiter.

No candidate ownership changes.

---

# 13. PERMANENT REGRESSION FIXTURES

## RF-V94-01 — Follow recruiter

Creates audience relationship only.

---

## RF-V94-02 — Existing attribution

Following recruiter B does not overwrite attribution to A.

---

## RF-V94-03 — Unfollow

Does not alter historical Application/Placement/AFF facts.

---

## RF-V94-04 — Reaction

Creates no Application.

---

## RF-V94-05 — Reaction change

Updates social reaction only.

---

## RF-V94-06 — Subscribe location

Future matching notification only; no PlacementCase.

---

## RF-V94-07 — Comment

Creates no HandlingAssignment.

---

## RF-V94-08 — Hidden comment

No longer public; business records unchanged.

---

## RF-V94-09 — Comment spam burst

Rate limit activates.

---

## RF-V94-10 — Private Q&A

Routes through Omnichannel/contact boundary, not SocialChat.

---

## RF-V94-11 — Follower privacy

Recruiter/public cannot see unauthorized LaborProfile details.

---

## RF-V94-12 — Notification retry

No duplicate audience notification spam.

---

## RF-V94-13 — Suspended recruiter

Follow/comment/new engagement disabled according to policy.

---

## RF-V94-14 — Deleted/held post

New reactions/comments rejected.

---

# 14. MAINTAINABILITY REQUIREMENTS

Do NOT create:

```text
social-engagement-service.ts
audience-utils.ts
social-chat.ts
```

as catch-all modules.

Suggested structure:

```text
audience/
  follow/
  subscriptions/
  queries/

reactions/
  domain/
  application/
  queries/

faq/
  domain/
  application/
  queries/

comments/
  domain/
  application/
  queries/
  moderation/

social-notifications/
  events/
  application/

engagement-moderation/
  application/
```

Reuse V8 notification infrastructure and V7.9 Omnichannel boundaries.

---

# 15. V9.4 EXIT GATE

## Follow

```text
[ ] follow
[ ] unfollow
[ ] idempotency
[ ] follower count
[ ] no attribution/handling side effect
```

## Subscriptions

```text
[ ] recruiter posts
[ ] recruiter jobs
[ ] selected job/location/category subscriptions
[ ] validated filters
```

## Reactions

```text
[ ] LIKE
[ ] INTERESTED
[ ] HELPFUL
[ ] one reaction per actor/post
[ ] counts
```

## FAQ/Q&A

```text
[ ] recruiter FAQ
[ ] public FAQ
[ ] private question routes through approved boundary
```

## Comments

```text
[ ] moderation gate satisfied before enable
[ ] comment create
[ ] hide/delete/report
[ ] rate limit/spam protection
```

## Notifications

```text
[ ] social event catalog
[ ] V8 notification preferences reused
[ ] dedupe
[ ] safe deep links
```

## Privacy/Security

```text
[ ] no LaborProfile data leakage
[ ] engagement does not modify business attribution
[ ] abuse controls
```

## Regression

```text
[ ] RF-V94-01 through RF-V94-14 pass
```

---

# 16. HANDOFF TO V9.5

V9.5 owns Distribution & Recruitment Campaigns:

```text
Share Kit
Short links
QR codes
Poster generation
Recruitment Campaigns
Campaign landing pages
Campaign content/job composition
Distribution tracking
```

V9.5 must consume:

```text
V9 posts
canonical JobPosting
Universal AFF
```

without creating a second attribution engine.

---

# 17. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V94-001 through V94-004

Batch B
V94-010 through V94-013

Batch C
V94-020 through V94-024

Batch D
V94-030 through V94-034

Batch E
V94-040 through V94-045

Batch F
V94-050 through V94-063

Batch G
V94-070 through V94-074
Security/moderation

Batch H
RF-V94-01 through RF-V94-14
V9.4 EXIT GATE
```

---

# 18. ARCHITECTURAL WARNINGS

Do NOT introduce:

```text
Follower.referrerId
Reaction.applicationId auto-created
Comment.handlerId
SocialChat
AudienceCandidateOwnership
```

Do NOT:

```text
infer source from follow
infer application from reaction
infer handling from comment
expose full candidate profile to recruiter because of follow
build private chat parallel to Omnichannel
```

---

# 19. PRODUCT OUTCOME

After V9.4, recruiter channels should begin to develop a real audience:

```text
followers
subscribers
reactions
questions
comments
```

but HRP must still maintain a strict boundary between:

```text
social relationship
and
recruitment business relationship
```

That distinction protects the integrity of V7/V8 while allowing V9 to feel genuinely social.
