# HRP V7.10 — INTELLIGENCE & CONTROLLED AUTOMATION IMPLEMENTATION BACKLOG

**Status:** SPLIT_REQUIRED — HRP operational intelligence only; conversational AI transferred to CRM app (Owner 13/09/2026)
**Target release:** V7.10  
**Prerequisite:** HRP operational intelligence needs its canonical fact/permission gate, not CRM V7.9. CRM conversational AI needs the relevant channel/consent/contract gate.
**Cross-cutting:** `AI_CODING_GUARDRAILS.md` is mandatory  
**Primary bounded contexts:** Intelligence / Decision Support / Controlled Automation  
**Primary principle:** AI assists canonical HRP workflows; it does not become canonical authority

> **Split ownership, Owner 13/09/2026:** The HRP repo may implement matching/risk/operational analytics from canonical domain facts and policy gates for approved commands. Chat summaries, reply drafting, CSKH next-best-action, agent coaching and conversational analytics belong to the separate CRM app. The conversational tasks below are retained only as CRM planning reference; they are removed from HRP execution and exit gates. See [HRP_CRM_INFRA_SPLIT.md](HRP_CRM_INFRA_SPLIT.md).

---

# 0. PURPOSE

V7.10 adds intelligence on top of a stable HRP Workforce Supply Operating System.

The system may assist HRP with:

```text
reactivation suggestions
matching ranking
interaction summaries
next-best-action suggestions
funnel risk
no-show risk
operational prioritization
controlled automation
```

But HRP must remain fully usable when AI is disabled.

The core architecture is:

```text
Canonical HRP data
      ↓
Redacted / policy-safe feature extraction
      ↓
AI / rules / ranking service
      ↓
Suggestion / score / explanation
      ↓
Human review or approved automation policy
      ↓
Canonical HRP command
```

AI never writes domain state directly.

---

# 1. NON-NEGOTIABLE DOMAIN INVARIANTS

1. AI output is not canonical business state.
2. AI may suggest; domain commands decide.
3. AI must not directly create:
   - PlacementCase;
   - HandlingAssignment;
   - Application;
   - Placement;
   - Worker;
   - EmploymentEpisode;
   - ProjectAssignment;
   - CommissionBeneficiaryDecision.
4. Matching ranking must not replace hard eligibility rules.
5. Reactivation suggestion must not imply Availability is confirmed.
6. No-show/funnel risk is advisory, not a lifecycle status.
7. AI-generated summaries must retain links to source evidence/context.
8. Sensitive PII must be minimized/redacted before model invocation where policy requires.
9. Raw secrets/tokens/identity documents must never be embedded in prompts.
10. AI behavior must be versioned enough to explain past suggestions.
11. Prompt/model/threshold configuration must be centralized.
12. Business policies must not be encoded only in prompts.
13. Human override/rejection must remain possible.
14. Controlled automation may only invoke pre-approved canonical commands.
15. Every automated action must be attributable to a policy/version/actor.
16. AI failure/outage must degrade gracefully to normal HRP workflow.
17. External AI provider must not become System of Record.
18. AI-generated data must respect retention/privacy policy.

---

# 2. V7.10 SCOPE

V7.10 includes:

```text
Reactivation suggestions
Matching ranking
AI interaction summarization
Next-best-action suggestions
Funnel/stagnation risk
No-show risk
Manager prioritization signals
Suggestion explainability
AI configuration/versioning
Feature extraction/redaction
Controlled automation framework
Automation approval modes
AI observability/evaluation
Security/privacy
```

V7.10 does NOT include:

```text
fully autonomous recruitment
unbounded agent workflows
AI-driven identity merge
AI deciding beneficiary entitlement
AI calculating commission
AI overriding ServiceModel
AI changing workforce history
AI replacing explicit consent/privacy rules
```

---

# 3. DELIVERY SLICES

```text
V7.10a — Intelligence foundation
V7.10b — Reactivation intelligence
V7.10c — Matching ranking
V7.10d — AI summaries + next-best-action
V7.10e — Risk signals
V7.10f — Controlled automation
V7.10g — Evaluation / observability / hardening
```

---

# 4. V7.10a — INTELLIGENCE FOUNDATION

## V710-001 — Intelligence provider abstraction

**Type:** Architecture/integration  
**Priority:** BLOCKER

Define provider-neutral interface for:

```text
generateStructuredSuggestion()
summarize()
rank()
classifyRisk()
```

Core domain code must not import vendor-specific SDK types.

---

## V710-002 — Model invocation contract

**Type:** Application contract  
**Priority:** BLOCKER

Each invocation must include:

```text
useCase
input schema version
policy version
model/provider reference
request correlationId
redaction profile
timeout/budget policy
```

Output must be structured and validated.

---

## V710-003 — Prompt/config registry

**Type:** Configuration/domain support  
**Priority:** BLOCKER

Centralize:

```text
prompt template
model choice
temperature/parameters where relevant
output schema
thresholds
policy version
```

Do not hardcode prompts in React components/routes.

---

## V710-004 — Feature extraction layer

**Type:** Application/service  
**Priority:** BLOCKER

Convert canonical HRP data into minimal AI-safe features.

Examples:

```text
availability freshness
relationship state
job preferences
interaction recency
case stage
handling state
prior assignment categories
distance band
shift compatibility
```

Avoid sending raw full objects.

---

## V710-005 — Redaction policy

**Type:** Security  
**Priority:** BLOCKER

Centralize rules for removing/minimizing:

```text
identity document numbers
sensitive notes
tokens/secrets
unneeded phone/email
raw attachments
private dispute evidence
```

---

# 5. V7.10b — REACTIVATION INTELLIGENCE

## V710-010 — Reactivation candidate score

**Type:** Advisory projection  
**Priority:** HIGH

Input signals may include:

```text
FORMER_HRP_WORKER
stale/unknown availability
last assignment outcome
last interaction
location/job history
previous successful placement
recent inbound activity
```

Output:

```text
score/rank
reason codes
confidence
```

This is NOT Availability.

---

## V710-011 — Reactivation suggestion query

**Type:** Query service  
**Priority:** HIGH

Return:

```text
LaborProfile
reactivation score
reasons
data freshness warnings
recommended contact path
```

Must not:

```text
open case
assign handler
send message automatically
```

---

## V710-012 — Reactivation explanation

**Type:** Read contract  
**Priority:** HIGH

Examples:

```text
former Worker at similar project
last assignment ended normally
location matches current demand
no contact in 90 days
availability not recently confirmed
```

Warnings must be explicit.

---

# 6. V7.10c — MATCHING RANKING

## V710-020 — Ranking layer over V7.3 matching

**Type:** Advisory service  
**Priority:** BLOCKER

Pipeline:

```text
hard eligibility filters
→ deterministic structured matching
→ optional AI/statistical ranking
→ explanation
```

AI may reorder eligible results but cannot override hard blocks.

---

## V710-021 — Matching feature catalog

**Type:** Domain support  
**Priority:** HIGH

Examples:

```text
location fit
shift fit
income fit
availability/start-date fit
work history similarity
project familiarity
profile completeness
verification confidence
interaction recency
```

One authoritative catalog.

---

## V710-022 — Match explanation contract

**Type:** Read contract  
**Priority:** HIGH

Expose:

```text
positive reasons
negative/warning reasons
data freshness
model/policy version
```

Avoid unexplained opaque score as the only UI.

---

## V710-023 — Ranking fallback

**Type:** Resilience  
**Priority:** BLOCKER

If AI ranking unavailable:

```text
fall back to deterministic V7.3 ordering
```

Matching screen must remain operational.

---

# 7. V7.10d — AI SUMMARY + NEXT-BEST-ACTION

## V710-030 — Interaction summary assistant

**Type:** AI assist  
**Priority:** HIGH

Input:

```text
structured InteractionOutcome
optionally safe referenced transcript excerpt
PlacementCase context
```

Output:

```text
draft summary
key facts
possible follow-up
```

Human can edit/approve before canonical save unless policy explicitly allows auto-summary for non-critical text.

---

## V710-031 — Structured fact extraction

**Type:** AI assist  
**Priority:** HIGH

Potential suggestions:

```text
availability statement
location preference
shift preference
candidate interest
callback timing
```

AI returns candidates for user confirmation.

It must not directly write canonical facts.

---

## V710-032 — Next-best-action suggestion

**Type:** Advisory service  
**Priority:** HIGH

Input:

```text
case stage
recent interaction
open actions
handling expiry
availability
job context
```

Output:

```text
suggested action type
suggested due window
reason
confidence
```

User or approved automation policy invokes `createNextAction()`.

---

# 8. V7.10e — RISK SIGNALS

## V710-040 — Funnel stagnation risk

**Type:** Advisory projection  
**Priority:** MEDIUM

Signals may include:

```text
case age
stage age
no interaction
overdue NextAction
repeated no-answer
proposal inactivity
client waiting duration
```

Output is a risk signal, not case status.

---

## V710-041 — No-show risk

**Type:** Advisory projection  
**Priority:** MEDIUM

Possible inputs:

```text
confirmation recency
missed calls
prior no-show history where permitted
distance
start-time constraints
documentation readiness
```

Do not use protected/sensitive attributes for discriminatory decisions.

---

## V710-042 — Risk action policy

**Type:** Domain policy  
**Priority:** HIGH

Risk may trigger suggestions like:

```text
reconfirm start
schedule reminder
manager review
backup candidate search
```

Risk score alone must not:

```text
cancel Placement
reject candidate
void beneficiary
```

---

# 9. V7.10f — CONTROLLED AUTOMATION

## V710-050 — Automation policy model

**Type:** Domain/application policy  
**Priority:** BLOCKER

Automation must define:

```text
useCase
trigger
preconditions
allowed command
approvalMode
policyVersion
maxFrequency
scope
```

---

## V710-051 — Approval modes

**Type:** Domain catalog  
**Priority:** BLOCKER

Suggested:

```text
SUGGEST_ONLY
ONE_CLICK_APPROVAL
AUTO_EXECUTE_LOW_RISK
```

Default for V7.10:

```text
SUGGEST_ONLY
```

`AUTO_EXECUTE_LOW_RISK` requires explicit per-use-case architecture approval.

---

## V710-052 — Allowed automation commands

**Type:** Security policy  
**Priority:** BLOCKER

Initial safe candidates may include:

```text
createNextAction
send approved reminder template
flag case for review
```

Not allowed initially:

```text
markPlacementEffective
mergeLaborProfiles
changeReferralAttribution
transferHandling
startAssignment
endEmploymentEpisode
decideBeneficiary
```

---

## V710-053 — Automation executor

**Type:** Application service  
**Priority:** BLOCKER

Must invoke the same canonical commands as human workflows.

Automation context:

```text
actorType = SYSTEM
policyVersion
triggerEventId
correlationId
```

No direct database writes.

---

## V710-054 — Automation kill switch

**Type:** Operations/security  
**Priority:** BLOCKER

Support global and use-case-level disable.

Disabling automation must not disable core HRP workflow.

---

# 10. AI FEEDBACK / EVALUATION

## V710-060 — Suggestion feedback capture

**Type:** Analytics  
**Priority:** HIGH

Capture:

```text
accepted
edited
rejected
ignored
reason where useful
```

Do not silently train external models from production data without explicit approved policy.

---

## V710-061 — Evaluation datasets

**Type:** Quality engineering  
**Priority:** HIGH

Maintain approved test fixtures for:

```text
reactivation ranking
matching ranking
summary quality
next-action suggestion
risk signals
```

Use de-identified/synthetic data where possible.

---

## V710-062 — Version comparison

**Type:** Quality/operations  
**Priority:** MEDIUM

Allow comparing:

```text
model version
prompt version
policy version
```

before rollout.

---

# 11. SECURITY / PRIVACY

## V710-070 — AI permission boundary

Suggested permissions:

```text
ai.summary.use
ai.matching.use
ai.reactivation.use
ai.risk.use
ai.automation.approve
ai.automation.manage
```

AI features must not bypass underlying domain permissions.

---

## V710-071 — Sensitive attribute exclusion

**Type:** Safety/domain policy  
**Priority:** BLOCKER

Do not use legally/protected or sensitive attributes for ranking/rejection unless explicitly lawful, necessary, reviewed, and documented.

Default is exclusion.

---

## V710-072 — Prompt/output logging policy

**Type:** Security  
**Priority:** BLOCKER

Do not log unrestricted prompts containing PII.

Store:

```text
invocation metadata
hash/reference
redacted features
structured output
version
```

as policy permits.

---

# 12. OBSERVABILITY

Track:

```text
AI invocation success/failure
latency
fallback rate
accept/edit/reject rates
ranking drift
risk alert precision where measurable
automation execution count
automation failure count
kill-switch state
provider outage
cost/budget metrics where relevant
```

---

# 13. PERMANENT REGRESSION FIXTURES

## RF-AI-01 — AI disabled

Expected:

```text
Repository works
Workbench works
Matching works
Placement works
Workforce works
Partner works
Client CRM works
Omnichannel works
```

No core capability blocked.

---

## RF-AI-02 — Reactivation suggestion

Expected:

```text
former Worker suggested
Availability not modified
PlacementCase not opened
```

---

## RF-AI-03 — Matching hard block

Expected:

```text
AI cannot rank blocked candidate into eligible result set
```

---

## RF-AI-04 — Ranking provider outage

Expected deterministic fallback.

---

## RF-AI-05 — Summary suggestion

Expected:

```text
draft only
canonical InteractionOutcome unchanged until approved/save command
```

---

## RF-AI-06 — Suggested availability extraction

Expected:

```text
user confirmation required
no direct AvailabilityObservation mutation
```

---

## RF-AI-07 — Next-best-action

Expected:

```text
suggestion returned
no NextAction created until command/approved automation
```

---

## RF-AI-08 — High no-show risk

Expected:

```text
risk signal only
Placement not failed/cancelled automatically
```

---

## RF-AI-09 — Automation low-risk reminder

Expected:

```text
approved policy
canonical outbound command/outbox used
system actor audited
```

---

## RF-AI-10 — Automation attempts forbidden command

Expected blocked.

---

## RF-AI-11 — Prompt version update

Expected old suggestions remain traceable to prior version.

---

## RF-AI-12 — Sensitive PII redaction

Expected prohibited fields absent from provider payload/logs.

---

# 14. MAINTAINABILITY / MODULE BOUNDARY REQUIREMENTS

Mandatory under `AI_CODING_GUARDRAILS.md`.

Do NOT create:

```text
ai-service.ts
ai-utils.ts
one giant prompt registry file
React components with embedded prompts
```

Suggested separation:

```text
intelligence-core/
  contracts/
    intelligence-provider.ts
    suggestion-result.ts
  domain/
    intelligence-policy.ts
    model-config.ts
  application/
    invoke-intelligence.ts
    redact-features.ts

reactivation-intelligence/
  application/
    rank-reactivation-candidates.ts
  queries/
    reactivation-suggestions-query.ts

matching-intelligence/
  application/
    rank-job-matches.ts
    rank-talent-matches.ts

interaction-assist/
  application/
    summarize-interaction.ts
    extract-structured-facts.ts
    suggest-next-action.ts

risk/
  application/
    assess-funnel-risk.ts
    assess-no-show-risk.ts

automation/
  domain/
    automation-policy.ts
    approval-mode.ts
  application/
    evaluate-automation.ts
    execute-approved-automation.ts
  infrastructure/
    automation-worker.ts
```

Centralize:

```text
prompt/config registry
redaction policy
hard-vs-soft matching rules
automation approval policy
model/provider mapping
```

---

# 15. V7.10 EXIT GATE

## AI foundation

```text
[ ] provider abstraction exists
[ ] prompts/config centralized
[ ] outputs schema-validated
[ ] PII redaction enforced
```

## Reactivation

```text
[ ] suggestions explainable
[ ] no Availability/case mutation
```

## Matching

```text
[ ] hard eligibility authority preserved
[ ] AI ranking optional
[ ] deterministic fallback works
```

## Summary/NBA

```text
[ ] summary and fact extraction are assistive
[ ] next-action suggestion does not bypass commands
```

## Risk

```text
[ ] risk is advisory
[ ] no critical lifecycle action from score alone
```

## Automation

```text
[ ] default SUGGEST_ONLY
[ ] allowed command whitelist enforced
[ ] system actor/audit recorded
[ ] global kill switch works
```

## Resilience

```text
[ ] AI provider outage does not break core HRP
[ ] RF-AI-01 through RF-AI-12 pass
```

---

# 16. RECOMMENDED AI-CODING BATCH ORDER

```text
Batch A
V710-001 through V710-005

Batch B
V710-010 through V710-012

Batch C
V710-020 through V710-023

Batch D
V710-030 through V710-032

Batch E
V710-040 through V710-042

Batch F
V710-050 through V710-054

Batch G
V710-060 through V710-072
Observability/evaluation

Batch H
RF-AI-01 through RF-AI-12
V7.10 EXIT GATE
```

---

# 17. ARCHITECTURAL WARNINGS FOR IMPLEMENTATION AGENTS

Do NOT:

```text
let AI call Prisma directly
put business eligibility rules only in prompts
hardcode prompt text in pages/routes
treat model score as canonical status
auto-open cases from reactivation
auto-mark Placement EFFECTIVE
auto-merge duplicate profiles
auto-decide beneficiary
```

Do NOT introduce:

```text
LaborProfile.aiStatus
Placement.aiDecision
JobOpening.aiFilled
```

as canonical business authority.

If a cached/materialized AI signal is stored, it must be explicitly advisory and versioned.

---

# 18. PRODUCT OUTCOME

After V7.10, HRP should gain intelligence without losing control:

```text
Ai nên gọi lại ai?
Ai phù hợp JobOpening này hơn?
Case nào đang có nguy cơ bị quên?
Cuộc gọi vừa rồi có thể tóm tắt thế nào?
Việc tiếp theo nên làm gì?
Placement nào có nguy cơ no-show?
Automation nào có thể thực hiện an toàn?
```

But every important answer remains grounded in canonical HRP facts, explainable policies, and explicit business commands.

Most importantly:

```text
AI OFF
=
HRP STILL WORKS
```

That is the final architectural guardrail for V7 intelligence.
