# HRP V7.9 — OMNICHANNEL INTEGRATION IMPLEMENTATION BACKLOG

**Status:** TRANSFERRED_TO_CRM — reference only for HRP connector/contract work (Owner 13/09/2026)
**Target release:** V7.9  
**Prerequisite:** Per-flow HRP canonical command/auth/contract gate; Talent channel does not require all V7.8 B2B or V7.7 Beneficiary work.
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` is mandatory  
**Primary bounded context:** Integration / Anti-Corruption Layer  
**Primary systems:** HRP System of Record, Chatwoot, Zalo OA  
**Primary principle:** CRM/chat systems are Systems of Engagement, never canonical business authority

> **Transferred out of HRP, Owner 13/09/2026:** This backlog is retained as integration reference, not an HRP task queue. Chatwoot, Zalo OA, provider adapters, ACL, external mapping/receipts, retry/DLQ/reconciliation, chat inbox and CSKH UI are built and operated by the separate CRM app. HRP owns only canonical command/query APIs, authentication/permissions, business audit, transactional outbox/events and shared contract fixtures. V7.9 acceptance is cross-repo. See [HRP_CRM_INFRA_SPLIT.md](HRP_CRM_INFRA_SPLIT.md). All implementation steps below naming CRM runtime are **CRM work**, even if they were formerly phrased as HRP tasks.

---

# 0. PURPOSE

V7.9 connects HRP to external engagement channels while preserving HRP as the canonical source of business truth.

The integration layer must answer:

```text
Which external conversation/contact maps to which LaborProfile or ClientContact?
Was this webhook authentic?
Has this event already been processed?
Which canonical HRP command should be invoked?
What structured business outcome should be recorded?
What happens if Chatwoot/Zalo is temporarily unavailable?
Can failed events be retried safely?
Can integration state be reconciled without manual DB surgery?
```

The core architecture is:

```text
Zalo / Chatwoot / future channel
        ↓
Provider Adapter
        ↓
Anti-Corruption Layer
        ↓
Identity / Mapping / Idempotency
        ↓
Canonical HRP Command API
        ↓
Talent / Client domain
```

---

# 1. NON-NEGOTIABLE DOMAIN INVARIANTS

1. HRP is the System of Record.
2. Chatwoot/Zalo are Systems of Engagement.
3. External providers must not write HRP database tables directly.
4. Provider-specific payloads must not leak into core domain models.
5. Raw conversation history belongs primarily to the engagement platform; HRP stores structured business outcomes and references.
6. External assignment in Chatwoot does not equal HRP `HandlingAssignment`.
7. External contact identity does not automatically equal canonical `LaborProfile`.
8. All inbound events must pass webhook verification where provider supports it.
9. All inbound events must be idempotent.
10. Identity mapping must support:
    - exact match;
    - possible match/review;
    - unresolved identity.
11. Integration must not fabricate `PlacementCase`, `Application`, `Placement`, or Worker state merely from chat traffic.
12. Structured InteractionOutcome must be written through canonical HRP commands/services.
13. Provider outage must not destroy canonical HRP business state.
14. Retry/replay must be safe.
15. Dead-letter/reconciliation paths must exist.
16. External provider IDs are mappings, not canonical primary keys.
17. Secrets/service identities must be separate from admin user roles.
18. PII must be minimized/redacted where integration or AI boundaries require it.

---

# 2. V7.9 SCOPE

V7.9 includes:

```text
Integration/Anti-Corruption Layer
Provider adapter contracts
Chatwoot POC
Zalo OA production integration
Webhook verification
Inbound normalization
Identity mapping
Conversation mapping
Contact mapping
Idempotency
Structured InteractionOutcome write-through
ClientInteraction write-through
Outbox for outbound actions
Retry/backoff/DLQ
Reconciliation
Provider health/observability
Security/secrets
```

V7.9 does NOT include:

```text
AI copilot                       -> V7.10
autonomous decisioning           -> V7.10 / controlled automation
generic workflow engine          -> OUT OF SCOPE
provider becoming SoR            -> FORBIDDEN
full message archival in HRP     -> OUT OF SCOPE
```

---

# 3. DELIVERY SLICES

```text
V7.9a — Integration Core / Anti-Corruption Layer
V7.9b — Chatwoot POC
V7.9c — Zalo OA Production
V7.9d — Outbound messaging boundary
V7.9e — Retry / DLQ / Reconciliation
V7.9f — Security / Observability / Hardening
```

---

# 4. V7.9a — INTEGRATION CORE

## V79-001 — Provider adapter interface

**Type:** Integration contract  
**Priority:** BLOCKER

Define one canonical adapter interface per provider capability.

Conceptually:

```text
verifyWebhook()
normalizeInboundEvent()
resolveExternalIdentity()
mapConversation()
sendMessage()
fetchConversationMetadata()
```

Core domain code must not import provider SDK types.

---

## V79-002 — Canonical inbound event envelope

**Type:** Integration contract  
**Priority:** BLOCKER

Conceptual:

```text
eventId
provider
providerEventType
providerOccurredAt
receivedAt

externalConversationId?
externalContactId?
externalMessageId?

direction
channel

normalizedIdentitySignals
payloadRef / safe metadata
```

Do not persist arbitrary raw payload JSON as business authority.

Raw payload storage, if needed for audit/debug, belongs to integration storage with retention/security policy.

---

## V79-003 — Webhook verification service

**Type:** Security/infrastructure  
**Priority:** BLOCKER

Per provider:

```text
signature validation
timestamp freshness where supported
replay protection
secret lookup
failure audit
```

No provider-specific signature logic in route handlers.

---

## V79-004 — Integration idempotency store

**Type:** Infrastructure  
**Priority:** BLOCKER

Deduplicate by stable provider event/message identifiers.

Conceptual:

```text
provider
externalEventId
status
firstReceivedAt
lastReceivedAt
processingResult
correlationId
```

Retries must not create duplicate InteractionOutcome or duplicate outbound side effects.

---

## V79-005 — External identity mapping

**Type:** Integration/domain bridge  
**Priority:** BLOCKER

Mappings may include:

```text
provider
externalContactId
laborProfileId?
clientContactId?
matchStatus
confidence/evidence
lastVerifiedAt
```

Match states:

```text
MATCHED
POSSIBLE_MATCH
UNRESOLVED
BLOCKED
```

No auto-merge of canonical profiles from provider contact data.

---

## V79-006 — Conversation mapping

**Type:** Integration mapping  
**Priority:** HIGH

Map external conversations to HRP context:

```text
LaborProfile?
PlacementCase?
ClientCompany?
ClientContact?
SalesOpportunity?
```

Mapping may be partial.

Do not require every conversation to have a PlacementCase.

---

# 5. CANONICAL WRITE-THROUGH

## V79-010 — Talent Interaction write-through

**Type:** Application integration  
**Priority:** BLOCKER

Provider event that represents a meaningful business interaction must call:

```text
recordInteraction()
```

or equivalent canonical Talent command.

Integration adapter provides:

```text
channel
direction
occurredAt
outcomeType
summary
sourceConversationRef
actor = INTEGRATION
```

Do not write InteractionOutcome rows directly from provider webhook code.

---

## V79-011 — Client Interaction write-through

**Type:** Application integration  
**Priority:** HIGH

For client-side conversations call:

```text
recordClientInteraction()
```

with mapped ClientCompany/ClientContact/Opportunity context where available.

Do not reuse Talent semantics accidentally.

---

## V79-012 — Unresolved inbound interaction queue

**Type:** Operational workflow  
**Priority:** BLOCKER

If identity cannot be safely matched:

```text
do not fabricate profile
do not drop event
```

Queue for:

```text
identity review
manual match
new canonical profile creation when justified
```

---

# 6. V7.9b — CHATWOOT POC

## V79-020 — Chatwoot adapter

**Type:** Integration adapter  
**Priority:** BLOCKER

Implement:

```text
webhook verification
contact/conversation normalization
message event normalization
agent/team metadata mapping
outbound send contract
```

Chatwoot assignment metadata remains engagement metadata only.

---

## V79-021 — Chatwoot contact mapping

**Type:** Integration mapping  
**Priority:** HIGH

Map:

```text
Chatwoot contact
↔ LaborProfile or ClientContact
```

using canonical create-or-match/review rules.

Do not let Chatwoot contact merge dictate HRP identity merge.

---

## V79-022 — Chatwoot conversation reference

**Type:** Read/write integration  
**Priority:** HIGH

HRP InteractionOutcome may store:

```text
sourceConversationRef
```

to navigate/reconcile with Chatwoot.

Do not replicate full transcript into HRP.

---

## V79-023 — Chatwoot POC exit criteria

POC must prove:

```text
webhook authenticity
idempotent ingestion
identity mapping
structured InteractionOutcome write-through
safe unresolved queue
outbound response capability
reconciliation
```

Do not expand channels before these are proven.

---

# 7. V7.9c — ZALO OA PRODUCTION

## V79-030 — Zalo OA adapter

**Type:** Integration adapter  
**Priority:** BLOCKER

Implement provider-specific:

```text
webhook verification
event normalization
user identity mapping
conversation/message reference
outbound message send
delivery/error normalization
```

All provider specifics remain inside adapter/infrastructure modules.

---

## V79-031 — Zalo identity policy

**Type:** Integration identity policy  
**Priority:** BLOCKER

Zalo identity may be a signal, not a human canonical ID.

Use:

```text
provider user id
phone where legitimately available
name
existing mapping
conversation history
```

through approved identity resolver.

No automatic profile merge from one Zalo account alone.

---

## V79-032 — Zalo inbound Talent workflow

**Type:** Integration application  
**Priority:** BLOCKER

Inbound flow:

```text
verified webhook
→ normalized event
→ dedupe
→ identity resolution
→ conversation mapping
→ canonical Interaction command
→ optional NextAction update
```

No direct PlacementCase open unless approved business command conditions are met.

---

## V79-033 — Zalo production pilot gate

Pilot requirements:

```text
limited user/team scope
observability enabled
DLQ monitored
reconciliation tested
manual fallback available
PII policy reviewed
```

---

# 8. V7.9d — OUTBOUND MESSAGING BOUNDARY

## V79-040 — Canonical outbound message request

**Type:** Integration contract  
**Priority:** BLOCKER

Core application requests:

```text
recipient canonical ref
channel/provider preference
template/message intent
business context
idempotencyKey
```

Integration layer resolves provider-specific destination.

---

## V79-041 — Outbound outbox

**Type:** Infrastructure  
**Priority:** BLOCKER

Do not call provider APIs inside critical Talent/Client domain transactions.

Write outbound request to outbox.

Worker handles:

```text
delivery
retry
failure
provider response mapping
```

---

## V79-042 — Outbound delivery status

**Type:** Integration projection  
**Priority:** HIGH

Suggested:

```text
PENDING
SENT
DELIVERED
FAILED
CANCELLED
```

Provider-specific status maps to canonical status.

---

## V79-043 — Duplicate outbound protection

**Type:** Idempotency  
**Priority:** BLOCKER

Repeated command/retry with same business idempotency key must not send duplicate user-facing messages.

---

# 9. V7.9e — RETRY / DLQ / RECONCILIATION

## V79-050 — Inbound processing state

**Type:** Infrastructure  
**Priority:** BLOCKER

Suggested:

```text
RECEIVED
PROCESSING
PROCESSED
FAILED_RETRYABLE
DEAD_LETTER
IGNORED
```

---

## V79-051 — Retry policy

**Type:** Integration policy  
**Priority:** BLOCKER

Centralize:

```text
max attempts
backoff strategy
retryable provider errors
non-retryable validation failures
```

Do not hardcode retry loops per route.

---

## V79-052 — Dead-letter queue

**Type:** Operational infrastructure  
**Priority:** BLOCKER

Store enough information to:

```text
understand failure
fix mapping/config
replay safely
```

No manual raw DB mutation required.

---

## V79-053 — Reconciliation jobs/tools

**Type:** Operational tooling  
**Priority:** HIGH

Detect:

```text
provider events missing HRP processing
HRP outbound messages not acknowledged
identity mappings stale/conflicting
conversation refs missing
duplicate mappings
```

---

## V79-054 — Replay command

**Type:** Restricted operational command  
**Priority:** HIGH

Replay from DLQ/reconciliation must preserve original:

```text
provider event identity
correlation
idempotency
```

so canonical business effects are not duplicated.

---

# 10. V7.9f — SECURITY / OBSERVABILITY / HARDENING

## V79-060 — Integration service identities

**Type:** Security  
**Priority:** BLOCKER

Use service principals/credentials distinct from human admin roles.

Track:

```text
provider
credential scope
environment
rotation
last used
```

Secrets must not be stored in source code.

---

## V79-061 — PII redaction policy

**Type:** Security/domain boundary  
**Priority:** BLOCKER

Logs/metrics must not contain:

```text
full identity documents
raw sensitive message content
tokens/secrets
```

Structured summaries should be redacted where necessary.

---

## V79-062 — Integration observability

Track:

```text
webhook verification failures
events received
dedupe rate
identity unresolved rate
processing latency
Interaction write failures
outbound send success/failure
retry counts
DLQ size
reconciliation drift
```

---

## V79-063 — Provider health dashboard

**Type:** Operational query/UI  
**Priority:** HIGH

Per provider:

```text
last successful webhook
last successful outbound
error rate
DLQ count
unresolved identity count
reconciliation status
```

---

# 11. CHATWOOT/ZALO VS HANDLING

## V79-070 — Assignment semantic firewall

**Type:** Architecture rule  
**Priority:** BLOCKER

Never map:

```text
Chatwoot agent assignment
Zalo operator assignment
```

directly to:

```text
HandlingAssignment
```

If external engagement activity should claim/assign HRP responsibility, it must invoke explicit Talent Operations commands under approved policy.

---

# 12. RAW TRANSCRIPT POLICY

## V79-080 — Transcript boundary

**Type:** Data architecture  
**Priority:** BLOCKER

HRP stores:

```text
structured outcome
summary
external conversation reference
business timestamps
```

Engagement platform stores raw conversation transcript.

If regulatory/business requirements later require HRP archival, add an explicit retention/security design rather than silently copying all messages.

---

# 13. FUTURE CHANNEL EXTENSIBILITY

## V79-090 — Provider-neutral channel contract

**Type:** Architecture  
**Priority:** HIGH

New channels should implement adapter contracts without changing core Talent/Client domains.

Examples:

```text
Facebook Messenger
WhatsApp
SMS
Email provider
other OA/chat channel
```

Do not prebuild unused integrations.

---

# 14. PERMANENT REGRESSION FIXTURES

## RF-OM-01 — Duplicate inbound webhook

Expected:

```text
one InteractionOutcome
one processed integration event
```

---

## RF-OM-02 — Invalid webhook signature

Expected:

```text
rejected
no canonical mutation
security event logged
```

---

## RF-OM-03 — Known Talent contact

Expected:

```text
maps to LaborProfile
records canonical InteractionOutcome
```

---

## RF-OM-04 — Possible duplicate identity

Expected:

```text
no auto-merge
unresolved/review queue
no fake profile mutation
```

---

## RF-OM-05 — Conversation without PlacementCase

Expected:

```text
LaborProfile-level interaction may be recorded
no case auto-created
```

---

## RF-OM-06 — Chatwoot agent reassigned

Expected:

```text
HRP HandlingAssignment unchanged
```

unless explicit command is invoked.

---

## RF-OM-07 — Provider outage outbound

Expected:

```text
HRP domain transaction succeeds
outbound request remains pending/retrying
```

---

## RF-OM-08 — Duplicate outbound retry

Expected: one user-facing send per idempotency key.

---

## RF-OM-09 — DLQ replay

Expected:

```text
canonical side effect created once
event moves to processed
```

---

## RF-OM-10 — Client conversation

Expected:

```text
ClientInteraction written
not Talent Interaction
```

---

## RF-OM-11 — Raw transcript

Expected:

```text
HRP stores reference/structured outcome
does not duplicate full transcript by default
```

---

## RF-OM-12 — Provider identity changes

Expected:

```text
mapping can be updated/reverified
canonical LaborProfile remains stable
```

---

# 15. MAINTAINABILITY / MODULE BOUNDARY REQUIREMENTS

Mandatory under `AI_CODING_GUARDRAILS.md`.

Do NOT create:

```text
integration-service.ts
chatwoot-zalo-utils.ts
webhook-route.ts with verification + identity + domain writes + retries
```

Suggested separation:

```text
integration-core/
  contracts/
    inbound-event.ts
    outbound-message.ts
    provider-adapter.ts
  domain/
    integration-idempotency.ts
    retry-policy.ts
  application/
    process-inbound-event.ts
    enqueue-outbound-message.ts
    replay-integration-event.ts
  queries/
    integration-health-query.ts

providers/
  chatwoot/
    chatwoot-adapter.ts
    chatwoot-webhook-verifier.ts
    chatwoot-mapper.ts
  zalo/
    zalo-adapter.ts
    zalo-webhook-verifier.ts
    zalo-mapper.ts

integration-identity/
  application/
    resolve-external-identity.ts
    review-unresolved-identity.ts
```

Exact folder layout may follow repository conventions.

Centralize:

```text
provider adapter contract
idempotency
retry policy
identity mapping
outbound status mapping
```

---

# 16. V7.9 EXIT GATE

## Architecture

```text
[ ] HRP remains System of Record
[ ] provider-specific fields stay outside core domain
[ ] no direct provider DB writes into HRP tables
```

## Inbound

```text
[ ] webhook verification works
[ ] idempotency works
[ ] identity mapping handles matched/possible/unresolved
[ ] canonical Interaction commands used
```

## Chatwoot

```text
[ ] POC proves end-to-end ingestion/outbound/reconciliation
[ ] Chatwoot assignment does not mutate HRP handling
```

## Zalo

```text
[ ] production pilot passes
[ ] identity policy safe
[ ] DLQ/reconciliation operational
```

## Outbound

```text
[ ] outbox separates domain transaction from provider call
[ ] retry safe
[ ] duplicate outbound prevented
```

## Security

```text
[ ] service credentials isolated
[ ] logs redact sensitive data
[ ] provider health observable
```

## Regression

```text
[ ] RF-OM-01 through RF-OM-12 pass
```

---

# 17. HANDOFF TO V7.10

V7.10 owns Intelligence:

```text
reactivation suggestions
matching ranking
AI interaction summaries
next-best-action suggestions
funnel risk
no-show risk
controlled automation
```

AI must remain suggest-only by default and must consume canonical HRP structured data.

---

# 18. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V79-001 through V79-006

Batch B
V79-010 through V79-012

Batch C
V79-020 through V79-023

Batch D
V79-030 through V79-033

Batch E
V79-040 through V79-043

Batch F
V79-050 through V79-054

Batch G
V79-060 through V79-090
Security/observability

Batch H
RF-OM-01 through RF-OM-12
V7.9 EXIT GATE
```

---

# 19. ARCHITECTURAL WARNINGS FOR IMPLEMENTATION AGENTS

Do NOT:

```text
write Prisma mutations directly in webhook handlers
map Chatwoot assignee to HandlingAssignment automatically
use provider contact ID as LaborProfile ID
copy raw transcripts into HRP by default
hardcode retry loops in routes
call provider APIs inside canonical DB transactions
```

Do NOT introduce:

```text
LaborProfile.chatwootOwnerId
LaborProfile.zaloUserId as canonical identity
PlacementCase.chatwootStatus as business authority
```

External IDs belong in mapping/integration tables.

---

# 20. PRODUCT OUTCOME

After V7.9, HRP can use Zalo/Chatwoot operationally while still truthfully saying:

```text
Tin nhắn nằm ở đâu?
Conversation này thuộc NLD/khách hàng nào?
Business outcome nào đã được ghi vào HRP?
Ai đang thực sự chịu trách nhiệm case theo HRP?
Webhook nào lỗi?
Event nào chưa xử lý?
Provider lỗi thì HRP có mất dữ liệu nghiệp vụ không?
Có thể replay/reconcile an toàn không?
```

without allowing the engagement platform to become the source of canonical workforce/recruitment state.
