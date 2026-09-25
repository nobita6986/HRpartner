# HRP — EXECUTION REALIGNMENT PLAN
## Thin Value Slice, Production Safety, CRM Contract, and Evidence-Gated V8/V9

**Status:** Ready for AI Coding execution  
**Owner directive:** Replace version-completion sequencing with thin-value-slice execution  
**Primary goal:** Deliver usable recruitment workflow to real recruiters quickly without weakening V7/V8/V9 architecture  
**Production target:** VPS application deployment + Neon PostgreSQL  
**Test target:** Vercel / non-production environments  
**Sensitive evidence target:** Production VPS filesystem through Evidence Gateway  
**Cross-cutting authority:** `AI_CODING_GUARDRAILS.md`

---

# 0. EXECUTIVE DECISION

The architecture is NOT being discarded.

The execution strategy is changing.

Old execution mindset:

```text
Finish V7
→ Finish V8
→ Finish V9
→ Go live
```

New execution mindset:

```text
Production safety foundations
→ Thin end-to-end recruitment slice
→ 1 real recruiter
→ observe real usage
→ add only the next capability that usage justifies
```

Architectural authority remains:

```text
V7  = canonical business truth / System of Record
V8  = workspace & experience layer
V9  = recruiter social distribution / personal brand
CRM = System of Engagement
Universal AFF = attribution authority
```

The project must no longer use “version complete” as the primary milestone.

Primary milestone becomes:

> **A real workflow can be used safely by a real user.**

---

# 1. DOCUMENT AUTHORITY ORDER

To prevent conflicting architectural and execution directives, the following hierarchy strictly applies:

1. **`docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` (This Document)**
   - **Role:** The active execution roadmap and coordination authority.
   - **Scope:** Dictates the order of execution (P0 → P5), dependencies, evidence gates, and conditions for opening phases. It does not redefine the canonical domain models established in V6+/V7.

2. **V6+/V7 Documentation (`docs/V6/`, `docs/V7/`)**
   - **Role:** Canonical Domain and Architecture Authority.
   - **Scope:** Source of truth for canonical entities, state machines, ownership, RLS boundaries, and the HRP ↔ CRM boundary.

3. **V8/V9 Documentation (`docs/V8/`, `docs/V9/`)**
   - **Role:** Future direction and dependent plans.
   - **Scope:** These are *not* an automatic execution queue. No task within V8/V9 may be opened merely because the document exists. They may only be opened when their dependencies and evidence gates defined in this Realignment plan have been met.

4. **`docs/PLANNER_HANDOVER.md`**
   - **Role:** Current coordination cursor.
   - **Scope:** Tracks the current active task and next immediate steps. It must *not* act as a new architecture authority.

*In the event of any conflict, documents higher in this list take absolute precedence over those below.*

---

# 2. PRODUCT DELIVERY PRINCIPLES

1. Preserve V7/V8/V9 canonical boundaries.
2. Deliver one narrow end-to-end workflow before broad feature expansion.
3. Run V8 capabilities in parallel with V7 only when their dependencies are actually stable.
4. Keep the complete V9 architecture as future design, but unlock deferred phases only when usage evidence justifies them.
5. Production safety and data handling must be resolved before real sensitive data is accepted.
6. HRP and CRM must share explicit integration contracts before deep parallel development.
7. AI coding must work in small, bounded micro-steps.
8. No task should create a second authority just to bypass a missing canonical capability.
9. Docs/FAST tasks should use lightweight governance where permitted.
10. “Done” means usable + tested + observable, not merely code merged.
11. Before coding a connector, scheduler or cross-system workflow, evaluate automation/orchestration first; n8n may coordinate work but never becomes a second domain or security authority.

---

# 2. TARGET DEPLOYMENT MODEL

## 2.1 Production

Production target:

```text
VPS
├── HRP application
├── Evidence Gateway
├── CCCD / sensitive evidence filesystem
├── background workers / scheduler as needed
├── logs / local operational artifacts
└── reverse proxy / runtime

Database:
└── Neon PostgreSQL
```

Important distinction:

> CCCD files may live on the **same VPS host** as the production codebase, but must NOT live inside the Git/source repository directory.

Recommended filesystem structure:

```text
/srv/hrp/
├── app/
│   └── deployed application
│
├── evidence/
│   ├── originals/
│   ├── derived/
│   └── quarantine/
│
├── backups/
│   └── evidence backup staging
│
└── logs/
```

Example:

```text
Application path:
  /srv/hrp/app

Evidence root:
  /srv/hrp/evidence
```

Do NOT use:

```text
repo/uploads/cccd
public/uploads
frontend/public
/tmp as permanent storage
Vercel Blob for real CCCD
Chatwoot attachments as canonical CCCD storage
```

---

# 3. TEST / STAGING MODEL

Vercel remains acceptable for:

```text
frontend preview
integration testing
demo
non-sensitive test data
UI review
```

Vercel environments must NOT contain real CCCD/evidence.

Use:

```text
synthetic files
dummy images
generated test identities
```

Production-only feature policy:

```text
REAL_EVIDENCE_STORAGE_ENABLED=true
```

on approved VPS environments only.

Test environments:

```text
REAL_EVIDENCE_STORAGE_ENABLED=false
```

must reject real-evidence upload paths or route only to synthetic/test storage.

---

# 4. CCCD / EVIDENCE ARCHITECTURE

## 4.1 Evidence Gateway

All sensitive file access must pass through one bounded service:

```text
EvidenceGateway
```

Suggested application interface:

```text
storeEvidence()
getEvidenceMetadata()
openEvidence()
getSignedOrAuthorizedAccess()
deleteEvidence()
quarantineEvidence()
auditEvidenceAccess()
```

Domain modules must NOT directly manipulate filesystem paths.

---

# 5. EVIDENCE METADATA MODEL

Neon stores metadata, NOT the file binary.

Conceptual:

```text
EvidenceRecord
  id
  ownerType
  ownerId

  evidenceType
  storageKey
  originalFilename
  mimeType
  sizeBytes
  checksum

  status

  createdAt
  createdBy
  deletedAt?
```

Possible evidence types:

```text
CCCD_FRONT
CCCD_BACK
PORTRAIT
CONTRACT
CERTIFICATE
OTHER
```

Storage example:

```text
storageKey:
  labor-profile/{profileId}/{evidenceId}
```

Do not store absolute server paths as public/domain truth.

---

# 6. FILESYSTEM STORAGE ADAPTER

Initial production adapter:

```text
LocalVpsEvidenceStorageAdapter
```

Conceptual responsibilities:

```text
write file
read stream
delete file
calculate checksum
enforce path boundary
prevent traversal
set safe permissions
```

Recommended storage key resolution:

```text
storageKey
→ EvidenceStorageRoot
→ safe normalized path
```

Never accept raw path from browser/API.

---

# 7. EVIDENCE SECURITY REQUIREMENTS

Minimum implementation requirements:

```text
files stored outside web root
random/non-guessable evidence IDs
no direct public filesystem URL
authenticated/authorized access only
path traversal prevention
file size limit
MIME/content-type validation
extension validation
checksum
access audit
delete audit
backup policy
```

Strongly recommended:

```text
filesystem ownership dedicated to HRP runtime
chmod-style restrictive permissions
disk/volume encryption where deployment supports it
TLS for all uploads/downloads
```

Do not log file content.

Do not log CCCD numbers unnecessarily.

---

# 8. EVIDENCE BACKUP POLICY

Because production evidence is on a VPS filesystem, backup must be designed before real rollout.

Minimum:

```text
scheduled evidence backup
backup verification
restore drill
retention policy
checksum verification
```

Recommended architecture:

```text
Production VPS
  ↓ encrypted backup
Second Vietnam-hosted VPS / approved Vietnam storage
```

Do not treat “same VPS” as sufficient backup.

The first production release may use one production VPS for primary storage, but backup strategy must exist before accepting irreplaceable evidence at scale.

---

# 9. IMPORTANT COMPLIANCE BOUNDARY

This execution plan implements the technical storage architecture requested by Owner:

```text
Production:
VPS app + VPS evidence filesystem + Neon DB

Testing:
Vercel + synthetic data only
```

This is NOT, by itself, a legal determination that every data-residency or personal-data obligation is satisfied.

Before broad production rollout, Owner/operations should separately confirm:

```text
where VPS disk physically resides
where backups reside
who can administratively access evidence
whether Neon contains sensitive personal fields
retention/deletion requirements
incident-response expectations
```

AI coding must not invent legal conclusions.

---

# 10. HRP ↔ CRM INTEGRATION AUTHORITY

Before both repos evolve deeply in parallel, create one explicit shared contract authority.

Recommended source structure:

```text
contracts/
├── openapi/
├── events/
├── schemas/
├── enums/
├── errors/
└── README.md
```

Possible generated consumers:

```text
TypeScript package
Python models
OpenAPI clients
JSON Schema
```

The source-of-truth is the contract definitions, not copied enums in each repo.

---

# 11. REQUIRED HRP↔CRM CONTRACTS

Pin early:

```text
IntegrationEventEnvelope
IdempotencyKey
CorrelationId
ActorRef
ConversationRef
ClientContactRef
LaborProfileRef

ClientContactDTO
SalesOpportunityDTO
InteractionOutcomeDTO
NextActionDTO
```

Also define:

```text
error envelope
event version
retry semantics
idempotency semantics
timestamp format
pagination contract
authentication headers
correlation headers
```

---

# 12. S2S AUTHENTICATION

Create explicit server-to-server authentication.

Do not rely on:

```text
browser session
user JWT copied between systems
shared unscoped admin key in frontend
```

Contract must define:

```text
service identity
credential rotation
request signing/token strategy
scope
audit
```

Exact mechanism should follow existing stack if already present.

---

# 13. IDEMPOTENCY

All CRM→HRP mutating integration requests must support idempotency.

Conceptual:

```text
Idempotency-Key
```

Behavior:

```text
same request + same key
→ same business result
→ no duplicate mutation
```

Important for:

```text
contact ingestion
interaction events
next-action updates
conversation linkage
```

---

# 14. OUTBOX CONTRACT

Where CRM/HRP publishes cross-system events:

```text
canonical transaction
→ outbox
→ delivery worker
→ retry
→ receiver idempotency
```

n8n may act as the delivery/orchestration worker after the outbox boundary. It must consume a versioned event, use a scoped service identity and call only narrow idempotent APIs. It must not write directly to HRP domain tables or become the authority for retry-safe business outcomes.

Avoid:

```text
DB transaction
→ synchronous external API
→ partial failure
```

---

# 15. GLOBAL PRIORITY ORDER

Execution priority is now:

```text
P0 — Production Safety & Integration Foundations

P1 — Thin Recruitment Value Slice

P2 — Early V8 Experience

P3 — Recruiter Growth Slice

P4 — Domain-driven Expansion

P5 — Evidence-triggered V9
```

These are execution priorities, not new domain authorities.

## 15.1. Universal AFF continuity and re-entry

`docs/V6/aff_plan.md` remains the domain/design authority for Universal Affiliate. This plan is the execution-sequencing authority: it decides when a new AFF slice may open and prevents completed production work from being restarted.

Current execution state:

| Area | Realignment disposition |
|---|---|
| AFF-01/AFF-02 | Attribution/link-capture capability baseline exists and supports the production AFF-03 path. Legacy task statuses still require documentation reconciliation; do not reopen these slices from zero. |
| AFF-03/03B/03C | Public attribution/intake path is production verified. AFF-03C closed the missing direct `labor_profile_id` link; this does not complete Universal AFF. |
| AFF-04 | Conversion, accepted SourceClaim resolution and server-derived Placement/ProjectAssignment propagation are production verified at main `8b8e39b` (PR #35). The production migration and narrow legacy backfill passed branch gate, aggregate preflight and post-deploy verification. |
| AFF-05A/W5 | HandlingAssignment foundation and W5 safety repair exist. W5 closes RLS, expiry sweep and `REVOKED` semantics only; it is not proof that the complete AFF-05A Company Pool/dispute scope is done. |
| Remaining expansion | Reconcile residual AFF-05A Company Pool/dispute scope before AFF-05B, AFF-06 and AFF-07. |

Re-entry rules:

1. Production defect or security hotfixes in an existing AFF path may open immediately under their own narrow gate.
2. Feature expansion requires one approved thin-slice contract, isolated file ownership, migration/security evidence where applicable, and the normal Tier 1 → Tier 3 → Tier 0 pipeline.
3. AFF-04 is closed and must not be restarted. The next AFF action is a thin contract for residual AFF-05A Company Pool/dispute scope; AFF-05B remains a separate commission-policy slice.
4. Do not recreate AFF-01 through AFF-03, declare the whole AFF feature complete, or infer acceptance from stale task status fields.
5. Full user-facing Universal AFF enablement remains P3-E and requires the AFF capability gate to pass.

Evidence/CCCD readiness is not an AFF development gate. Coding, CI, preview and tests use synthetic data and must not upload real CCCD or production PII. P0-A blocks only production enablement of real evidence ingestion; it does not block unrelated AFF implementation.

## 15.2. Completion semantics

Completing this Realignment Plan does not mean every item ever listed in the V6, V7 or AFF backlogs has been implemented. It means the required product milestones and production gates in this plan have passed, and every relevant inherited item has an explicit disposition.

Allowed dispositions are:

```text
ACCEPTED_PRODUCTION_VERIFIED
SUPERSEDED_BY_REALIGNMENT
DEFERRED_BY_OWNER_WITH_TRIGGER
NOT_REQUIRED_FOR_CURRENT_PRODUCT_MILESTONE
```

Therefore:

- “Realignment complete” means the milestone-driven HRP delivery is complete and its remaining backlog is explicitly dispositioned.
- “V6 complete” or “V7 complete” may be claimed only through a separate closure matrix proving every required item in that authority set is accepted or explicitly dispositioned; architectural conformance alone is not completion.
- “Universal AFF complete” may be claimed only when the Definition of Done in `docs/V6/aff_plan.md` passes, including the remaining AFF-04 through AFF-07 work where still applicable. P3 may ship with AFF actions hidden and therefore does not by itself prove AFF completion.
- Deferred work must retain an owner, reopen trigger and evidence reference. Silence or an old unchecked checklist is not a disposition.

---

# 16. P0 — PRODUCTION SAFETY & INTEGRATION FOUNDATIONS

P0 runs before or in parallel with the earliest safe domain work.

P0 contains:

```text
P0-A Evidence Gateway
P0-B Production deployment boundary
P0-C HRP↔CRM contract source
P0-D S2S auth/idempotency/outbox
P0-E CI/process simplification
```

---

# 17. P0-A — EVIDENCE GATEWAY

## P0-A01 — Audit current file/evidence handling

Find:

```text
CCCD fields
uploads
attachments
blob/storage adapters
filesystem usage
public file routes
Chatwoot attachment references
```

Output:

```text
EVIDENCE_STORAGE_AUDIT.md
```

Do NOT move files yet.

---

## P0-A02 — Add EvidenceStorage port

Create interface only.

No domain-wide refactor.

---

## P0-A03 — Add LocalVpsEvidenceStorageAdapter

Root configured through environment:

```text
HRP_EVIDENCE_ROOT=/srv/hrp/evidence
```

Test uses temporary/synthetic directory.

---

## P0-A04 — Add EvidenceRecord metadata

Neon migration.

Additive only.

---

## P0-A05 — Add storeEvidence command

Flow:

```text
authorize
validate file
generate evidenceId/storageKey
write file
checksum
create metadata
audit
```

Failure must clean partial artifacts.

---

## P0-A06 — Add protected evidence read

No direct public static route.

---

## P0-A07 — Add delete/quarantine commands

Named commands + audit.

---

## P0-A08 — Add evidence access audit

Record:

```text
actor
evidenceId
operation
timestamp
result
```

---

## P0-A09 — Add production/test environment guard

Vercel/test:

```text
real evidence disabled
```

---

## P0-A10 — Add backup/restore runbook

Create:

```text
EVIDENCE_BACKUP_RESTORE_RUNBOOK.md
```

At least one restore test before production use.

---

# 18. GATE P0-A

PASS when:

```text
real CCCD never stored in source tree
real CCCD never stored on Vercel
Neon stores evidence metadata only
filesystem access goes through EvidenceGateway
access is authorized/audited
backup/restore procedure exists
```

This is a production-enablement gate for real evidence/CCCD ingestion. It is not a blanket blocker for unrelated HRP or AFF coding performed with synthetic data.

---

# 19. P0-B — PRODUCTION DEPLOYMENT BOUNDARY

## P0-B01 — Define environment matrix

Create:

```text
ENVIRONMENT_MATRIX.md
```

Example:

```text
LOCAL
TEST/VERCEL
STAGING-VPS if used
PRODUCTION-VPS
```

For each define:

```text
DB
evidence storage
real PII allowed?
external integrations
feature flags
```

---

## P0-B02 — Production filesystem setup

Document/create expected directories:

```text
/srv/hrp/app
/srv/hrp/evidence
/srv/hrp/logs
```

---

## P0-B03 — Environment validation on boot

Production should fail closed if required storage root is unavailable.

---

## P0-B04 — Vercel safety guard

Vercel deployment must not silently fall back to storing evidence locally in ephemeral filesystem.

---

# 20. P0-C — CONTRACT SOURCE OF TRUTH

## P0-C01 — Inventory existing HRP/CRM contracts

Identify duplicated:

```text
enums
DTOs
routes
event payloads
error codes
```

---

## P0-C02 — Create contract authority

Choose repository/package location.

Do NOT duplicate a third copy.

---

## P0-C03 — Define IntegrationEventEnvelope

Suggested fields:

```text
eventId
eventType
eventVersion
occurredAt
producer
correlationId
payload
```

---

## P0-C04 — Define idempotency semantics

Document exact receiver behavior.

---

## P0-C05 — Define error taxonomy

Examples:

```text
INVALID_REQUEST
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
IDEMPOTENCY_CONFLICT
VALIDATION_FAILED
DEPENDENCY_UNAVAILABLE
INTERNAL_ERROR
```

---

## P0-C06 — Pin initial shared DTOs

Only DTOs needed for current thin slice / CRM integration.

Do not prematurely model the entire future.

---

# 21. P0-D — S2S / OUTBOX

## P0-D01 — Add S2S authentication proof

One harmless read endpoint first.

---

## P0-D02 — Add one idempotent mutation proof

One small integration command.

---

## P0-D03 — Add outbox contract/proof

One canonical event.

---

## P0-D04 — Add retry/dedupe test

Prove duplicate delivery is safe.

---

# 22. P0-E — CI / GOVERNANCE SIMPLIFICATION

## P0-E02 — Define Direct Fix class

Low-risk examples:

```text
.gitignore
docs
comments
spelling
non-production metadata
```

Use existing Tier process if present.

---

## P0-E03 — Document test matrix by task risk

Example:

```text
DOCS
FAST
STANDARD
DOMAIN
MIGRATION
SECURITY
```

Each gets proportional evidence.

---

# 23. P1 — THIN RECRUITMENT VALUE SLICE

The first true product milestone is:

> One recruiter can process one real candidate from public demand entry to Placement outcome.

Required chain:

```text
JobPosting
→ Public Apply
→ LaborProfile create-or-match
→ PlacementCase
→ Simple Recruiter Workbench
→ Placement
```

This is more important than finishing all V7 phases.

---

# 24. P1-A — JOBPOSTING PUBLIC SLICE

Required:

```text
one public JobPosting projection
one public Job detail route
open/closed state
public-safe fields
```

Do not expose internal StaffingOrder/JobOpening details unnecessarily.

After canonical publish exists, the first recommended n8n pilot is asynchronous JobPosting distribution to configured Zalo/Meta/email channels plus expiry reminders. The public page and publish transaction must remain usable when n8n is unavailable.

---

# 25. P1-B — PUBLIC APPLY

Required:

```text
candidate enters public form
trusted server validation
create/match LaborProfile
create canonical Application if candidate-originated
open/reuse PlacementCase according to V7 rules
```

AFF support may be feature-gated if not ready.

Public Apply must work without AFF.

---

# 26. P1-C — LABORPROFILE CREATE-OR-MATCH

Must follow canonical outcomes:

```text
EXACT_MATCH
POSSIBLE_MATCH
NEW_PROFILE
```

Do not auto-merge uncertain identities.

---

# 27. P1-D — PLACEMENTCASE

Must provide:

```text
one active case max per LaborProfile
canonical status/stage
handler/current work context where ready
NextAction
```

No Kanban-specific status field.

---

# 28. P1-E — SIMPLE RECRUITER WORKBENCH

This is NOT full V8.1 Kanban.

Initial workbench may be a table/list:

```text
Candidate
Current stage
Job/context
Last interaction
Next action
Handler
Age / overdue
Primary actions
```

Actions must call named canonical commands.

Do not optimize for beauty before usability.

---

# 29. P1-F — PLACEMENT

The thin slice is incomplete until recruiter can record a real outcome:

```text
SELECTED
→ CONFIRMED
→ EFFECTIVE
```

or appropriate failed/cancelled state.

Respect:

```text
CLIENT_MANAGED
vs
HRP_MANAGED
```

Do not force Worker creation for client-managed direct hire.

---

# 30. P1 RELEASE GATE

Before calling P1 usable:

```text
[ ] public Job visible
[ ] candidate can Apply
[ ] LaborProfile create/match works
[ ] PlacementCase exists
[ ] recruiter sees case in workbench
[ ] recruiter can perform next actions
[ ] Placement can reach valid outcome
[ ] audit/security pass
[ ] 1 recruiter can complete flow without developer intervention
```

---

# 31. REAL-USER PILOT — MILESTONE M1

Pilot:

```text
1 recruiter
1 narrow job category / workflow
real but controlled candidate volume
```

Observe:

```text
where recruiter gets stuck
missing fields
unnecessary steps
slow screens
confusing terminology
manual work outside HRP
```

Do NOT immediately generalize every complaint into a new framework.

Fix repeated blockers first.

---

# 32. P2 — EARLY V8 EXPERIENCE

P2 does NOT require “all V7 complete.”

Unlock by dependency readiness.

---

# 33. P2-A — V8.0 WORKSPACE SHELL

May start early when:

```text
ActorContext
permissions
basic workspace navigation
```

are stable.

Deliver only the shell needed by real recruiter/admin workflows.

---

# 34. P2-B — V8.2 RECRUITER MICROSITE

May start when:

```text
Recruiter public profile
Public JobPosting projection
Public Apply
public security boundary
```

are safe.

Microsite does NOT require Universal AFF to exist initially.

If AFF unavailable:

```text
canonical Job link works
AFF-specific features hidden
```

---

# 35. P2 RELEASE GATE — MILESTONE M2

A recruiter can:

```text
open personal public page
share a Job/profile link externally
candidate lands on HRP
candidate submits real application
application enters canonical thin slice
```

This is a direct business-value milestone.

---

# 36. P3 — RECRUITER GROWTH SLICE

This replaces “build full V9 now.”

P3 combines only small parts of V8/V9 that produce immediate distribution value.

Scope:

```text
Verified recruiter profile
Theme/Layout Lite
Featured Jobs
Share Kit
QR
Universal AFF when ready
```

---

# 37. P3-A — VERIFIED PROFILE

Deliver:

```text
Verified by HRP
avatar
cover
headline
bio
specialties
public contact
```

No follower/comment/social feed required.

---

# 38. P3-B — APPEARANCE LITE

Use the V9.2 architecture, but only:

```text
2–3 approved themes
accent color
1–2 layout presets
cover/avatar
limited section ordering
desktop/mobile preview
```

Do NOT implement full theme marketplace.

---

# 39. P3-C — FEATURED JOBS

Recruiter chooses distributable canonical JobPostings.

No duplicated Job truth.

---

# 40. P3-D — SHARE KIT LITE

Initial:

```text
Copy Link
Facebook share/open
Zalo share/open
QR
```

Poster generation optional only if recruiter usage justifies it.

---

# 41. P3-E — UNIVERSAL AFF

AFF implementation slices may be prepared earlier when their own dependencies and security gates are ready. This section controls user-facing enablement in the Recruiter Growth slice; it does not force unrelated AFF coding to wait for Evidence Gateway completion.

Enable only after AFF capability passes its own gate.

If unavailable:

```text
P3 still ships
AFF actions hidden
```

Do NOT block recruiter profile/share value.

---

# 42. P3 RELEASE GATE — MILESTONE M3

Recruiter can:

```text
customize basic public identity
feature Jobs
share public links/QR
receive real applications
```

If AFF is ready:

```text
canonical attribution also works
```

---

# 43. P4 — DOMAIN-DRIVEN EXPANSION

P4 is dependency-driven, not version-driven.

Examples:

## V8.1 Kanban unlock

Only when:

```text
PlacementCase lifecycle stable
named commands exist
read model stable
concurrency strategy known
```

## V8.3 Role Workspaces unlock

Only when corresponding domain modules exist:

```text
Handling
Beneficiary
Client CRM
Partner
Workforce
```

Do not build empty role shells backed by fake data.

---

# 44. P5 — EVIDENCE-TRIGGERED V9

Full V9 remains designed, but deferred.

Default status after this realignment:

```text
V9.0 Social Publishing          DEFERRED
V9.1 Recruiter Timeline         DEFERRED
V9.2 Appearance                 PARTIAL EARLY via P3
V9.3 Content Studio             DEFERRED
V9.4 Engagement & Audience      DEFERRED
V9.5 Distribution               PARTIAL EARLY via P3
V9.6 Creator Analytics          DEFERRED
V9.7 AI Content Assistant       DEFERRED
V9.8 Hardening                  APPLY AS NEEDED
```

---

# 45. V9 EVIDENCE GATES

## Unlock V9.0 / V9.1 when

Observed recruiter behavior shows:

```text
frequent need to publish recruiter-authored content
recruiters currently post manually on other platforms
microsite alone is insufficient
```

---

## Unlock V9.3 when

Evidence shows:

```text
repetitive content creation workload
draft/scheduling pain
multiple recruiters repeatedly copy/paste similar content
```

---

## Unlock V9.4 when

Evidence shows:

```text
meaningful returning audience
real demand for follow/subscription/comment
```

Do not build social engagement for an audience that does not yet exist.

---

## Unlock V9.6 when

Minimum condition:

```text
enough traffic/applications to make conversion analytics statistically useful
```

Until then use simple counts:

```text
profile views
job clicks
applications
```

if already available.

---

## Unlock V9.7 when

Evidence shows:

```text
content creation time is a material recruiter cost
manual templates insufficient
recruiters need repeated multi-channel rewriting
```

---

# 46. MILESTONE MODEL

Replace version-completion milestones with real workflow milestones.

## M0 — Production Safety Ready

```text
Evidence Gateway works
production/test separation works
contract authority exists
S2S proof works
```

## M1 — One Recruiter End-to-End

```text
Job
→ Apply
→ LaborProfile
→ PlacementCase
→ Workbench
→ Placement
```

used by 1 real recruiter.

## M2 — Recruiter Public Distribution

```text
Microsite
→ shared link
→ real application
```

## M3 — CRM Integration Proof

```text
real conversation / engagement
→ S2S contract
→ correct HRP context update
```

without CRM mutating core DB directly.

## M4 — 5 Recruiters Repeated Usage

Evidence:

```text
weekly use
real candidates
real placements
real distribution
```

## M5 — V9 Expansion Decision

Use actual data to decide whether to unlock:

```text
Timeline
Content Studio
Engagement
Analytics
AI
```

---

# 47. AI CODING EXECUTION ORDER

Recommended immediate execution:

```text
STEP 1
Repository discovery for Evidence / deployment / CRM contracts

STEP 2
Implement Evidence Gateway foundation

STEP 3
Pin HRP↔CRM contract source + S2S proof

STEP 4
Confirm thin-slice domain capability gaps

STEP 5
Implement missing P1 slice only

STEP 6
Pilot with 1 recruiter

STEP 7
Implement V8.0/V8.2 only as dependencies permit

STEP 8
Implement Recruiter Growth Slice

STEP 9
Observe usage

STEP 10
Unlock later V8/V9 capabilities only through evidence gate
```

This order expresses product priority, not a blanket serial coding lock. In particular, P0-A completion blocks real evidence ingestion, not synthetic-data AFF development. Parallel work is allowed only with explicit ownership and no overlapping schema/migration or coordination-file edits.

## 47.1 Delivery cadence — V2_FAST_FREEZE

All new HRP tasks use `.ai-pipeline` protocol `V2_FAST_FREEZE`; historical artifacts remain immutable and are not retrofitted.

```text
T1A prepares contract N+1
T1B implements task N
T3 audits frozen task N-1
```

Rules:

1. A code task starts only after `Contract gate: READY_TO_CODE`, closed Owner decisions, exact current-main baseline, explicit file ownership and a ready/not-required test environment.
2. Tier 1 completes one whole-surface self-review, canonical gates and a committed implementation before asking for audit. HANDOFF pins the exact `Implementation SHA`; source, tests and migrations are frozen at that SHA.
3. Tier 3 reports all findings visible on the current changed surface in one round. P3/documentation debt is non-blocking unless Tier 0 explicitly promotes it.
4. Tier 1 receives at most one consolidated correction batch. DELTA audit covers that correction and directly affected callers only; unchanged surfaces are not reopened without new evidence.
5. If a blocker remains after the correction budget, Tier 0 takes the correction directly or splits a new task. No unbounded code/review loop.
6. WIP per independent stream is limited to one planning contract, one implementation and one frozen audit. `PLANNER_HANDOVER.md` has one writer at a time.
7. Real CCCD/evidence availability is not a coding gate. It gates only real-evidence production enablement; synthetic fixtures remain mandatory during implementation.

---

## 47.2 BUILD_VS_ADOPT — Library-first policy

HRP tự xây domain rules, không tự xây lại hạ tầng kỹ thuật phổ thông đã có thư viện trưởng thành.

```text
LIBRARY_FIRST:
editor, form, table, upload UI, date/time, chart, queue,
email renderer, document export and accessibility primitives

HRP_OWNED:
authorization, RLS/data scope, lifecycle/state transition,
idempotency authority, audit semantics, attribution/AFF,
commission and product policy
```

Mọi TASK V2 phải khai `Build vs adopt: N/A | ADOPT | CUSTOM`:

1. `ADOPT` chỉ sau khi kiểm tra official source, license, maintenance/security posture, React/Next/runtime compatibility, SSR khi áp dụng, bundle/operational cost và data portability/vendor lock-in.
2. Dependency được pin bằng manifest + lockfile và chỉ được dùng qua wrapper/component/adapter do HRP sở hữu. Contract test bảo vệ wrapper; vendor API không lan trực tiếp vào domain.
3. `CUSTOM` cần marker `CUSTOM_BUILD_JUSTIFICATION` cùng evidence rằng candidate hiện hữu không phù hợp hoặc wrapper có tổng rủi ro/chi phí cao hơn tự xây.
4. Không copy source tùy tiện từ repository ngoài. Không coi package là authority cho permission, business transition, persistence ownership hoặc security policy.
5. Roadmap chỉ giữ policy và default direction. Package/version cụ thể thuộc TASK + lockfile để agent tương lai phải kiểm chứng lại thay vì kế thừa mù quáng.

Default direction cho P1-A và future recruiter-authored content là đánh giá **Tiptap OSS** trước. Job/search/filter fields vẫn structured; chỉ rich content dùng canonical editor JSON có schema version, server validation và sanitized/static public rendering. TASK P1-A pin version, license, extension allowlist và compatibility evidence trước khi cài package. Nếu spike chứng minh blocker thật, Tier 1 được counterproposal Lexical/BlockNote hoặc `CUSTOM` theo gate trên.

Authority thực thi nằm trong `.ai-pipeline/rules/00-global-rules.md`, `tier0.md`, `tier1.md`, `TASK.template.md` và `verify-task.ps1`.

---

## 47.3 BUILD_VS_AUTOMATE — Orchestration-first policy

Before HRP implements a scheduler, connector, notification worker, approval wait-loop or multi-system retry flow, every V2 TASK must declare `Build vs automate: N/A | ORCHESTRATE | CUSTOM`.

Contracts already at `READY_TO_CODE` before this policy are not reopened solely to add the field. Their next contract revision must record it; new tasks cannot omit it.

1. `ORCHESTRATE` with platform/source `n8n` is preferred for asynchronous coordination, external connectors, schedules, notifications, bounded retry, operator approvals and read-only operational reporting.
2. HRP remains authoritative for authentication, authorization/RLS, domain validation, canonical transitions, transaction/concurrency, idempotency authority, PII/evidence custody, financial calculations and durable business audit.
3. n8n integrates through signed events/outbox and narrow APIs. Direct writes to HRP domain tables are forbidden; direct reads require a separately reviewed read-only identity/replica.
4. `CUSTOM` requires `CUSTOM_AUTOMATION_JUSTIFICATION` with evidence that transaction locality, latency/throughput, security/compatibility or operational constraints make n8n unsuitable.
5. Workflow credentials stay in n8n credentials/secret management, not public Admin Settings or Git. Workflow promotion, retry, replay, observability and recovery must be specified before production enablement.
6. n8n availability must not roll back a completed HRP canonical transaction. Failed delivery remains recoverable through outbox/reconciliation.

Project-specific authority, candidate matrix, security baseline and first-pilot acceptance are defined in [`docs/N8N_AUTOMATION_BOUNDARY.md`](N8N_AUTOMATION_BOUNDARY.md). The portable execution gate lives in `.ai-pipeline`; n8n-specific architecture does not.

---

# 48. FIRST AI CODING DISCOVERY PACKAGE

Before coding, AI must produce:

```text
EXECUTION_REALIGNMENT_DISCOVERY.md
EVIDENCE_STORAGE_AUDIT.md
CRM_CONTRACT_GAP_REPORT.md
THIN_SLICE_CAPABILITY_MATRIX.md
CURRENT_CI_COST_REPORT.md
BLOCKER_REGISTER.md
```

---

# 49. THIN SLICE CAPABILITY MATRIX

Required rows:

```text
Public JobPosting Projection
Public Apply
LaborProfile create-or-match
Application
PlacementCase
NextAction
HandlingAssignment
Simple Workbench Query
Placement
Public Recruiter Profile
Universal AFF
```

Status:

```text
IMPLEMENTED
PARTIAL
LEGACY_ONLY
NOT_IMPLEMENTED
CONFLICT
UNKNOWN
```

---

# 50. EVIDENCE STORAGE AUDIT QUESTIONS

AI must answer:

```text
Where are uploads currently stored?
Does any route expose files publicly?
Are files stored in DB/base64?
Does Vercel currently receive evidence?
Does Chatwoot contain evidence copies?
Are CCCD numbers stored in DB fields?
Are file paths persisted?
Is there deletion support?
Is there audit support?
Is there backup support?
```

---

# 51. CRM CONTRACT GAP QUESTIONS

AI must answer:

```text
What DTOs are duplicated?
What enums are duplicated?
What routes are already implemented?
What S2S auth exists?
What idempotency exists?
What outbox exists?
What event envelope exists?
Does CRM directly depend on HRP Prisma/core DB?
```

Any direct CRM access to HRP core Prisma is a blocker/conflict.

---

# 52. CI COST AUDIT

Measure:

```text
docs-only PR runtime
frontend-only PR runtime
backend unit runtime
integration runtime
container DB startup cost
duplicate test stages
```

Then implement path filtering only where safe.

Do not weaken required security/domain tests for high-risk changes.

---

# 53. DIRECT FIX POLICY

Use lightweight execution for low-risk tasks.

Examples:

```text
documentation
.gitignore
comments
non-runtime metadata
spelling
format-only changes
```

Direct Fix must still:

```text
show diff
confirm no production behavior changed
run minimal relevant validation
```

No two-round ceremony unless repository governance explicitly requires it.

---

# 54. GLOBAL STOP CONDITIONS

AI coding must STOP when:

```text
canonical authority is unclear
repository contradicts the plan materially
AFF semantics unresolved
CRM contract requires guessing
CCCD storage path could become public
evidence filesystem permissions unsafe
migration could lose data
RLS/permission scope unclear
large unrelated refactor becomes necessary
```

Report:

```text
BLOCKED
Evidence
Risk
Required decision/prerequisite
Safe next action
```

---

# 55. MIGRATION RULES

All migrations:

```text
additive where possible
reviewed
dry-run if backfill
count affected rows
fail closed on ambiguity
```

Do not fabricate historical:

```text
ReferralAttribution
HandlingAssignment
followers
social events
campaigns
evidence metadata
```

---

# 56. FILE / MODULE GUARDRAILS

Mandatory:

```text
React page/component target <= ~300 lines
domain service/command target <= ~350 lines
query/repository target <= ~350 lines
route target <= ~200 lines
>500 production source requires review
>700 = architecture smell
```

No:

```text
god service
generic utils dumping ground
scattered business rules
scattered permission strings
scattered integration enums
```

---

# 57. REQUIRED IMPLEMENTATION REPORT

Every AI coding batch must report:

```text
Batch ID
Goal
Files changed
Schema changes
Environment changes
Commands/queries
Integration contracts
Security impact
Tests run
Evidence
Known limitations
File-size review
Hardcoding review
Blockers
Next 1–3 micro-steps
```

---

# 58. RECOMMENDED INITIAL MICRO-STEPS

Do NOT begin with V9 production code.

Start:

```text
ER-D00 — Repository deployment/evidence inventory

ER-D01 — CRM contract inventory

ER-D02 — Thin-slice capability inventory

ER-D03 — CI/runtime cost inventory

ER-D04 — Baseline tests
```

Then, if safe:

```text
ER-001 — EvidenceStorage port
ER-002 — LocalVpsEvidenceStorageAdapter
ER-003 — EvidenceRecord metadata
```

Only after those pass:

```text
ER-010 — Contract source-of-truth skeleton
ER-011 — IntegrationEventEnvelope
ER-012 — S2S read proof
```

Then fill missing thin-slice capabilities.

---

# 59. OWNER DECISION LOG — CURRENT

Locked execution decisions:

```text
Production app:
VPS

Production DB:
Neon PostgreSQL

Real CCCD / evidence:
same production VPS host
outside source tree
through Evidence Gateway

Vercel:
test/preview only
synthetic/non-sensitive evidence only

Roadmap:
thin-slice + real-user milestones

V8:
parallel by dependency readiness

V9:
full architecture retained
most phases evidence-gated/deferred

CRM:
separate System of Engagement
no direct HRP core Prisma access

Integration:
explicit shared contract authority
S2S + idempotency + outbox

Architecture delivery:
LIBRARY_FIRST / BUILD_VS_ADOPT
Tiptap OSS is the default P1-A editor candidate, not an installed dependency until TASK compatibility and lockfile gates pass

Automation delivery:
ORCHESTRATION_FIRST / BUILD_VS_AUTOMATE
n8n is the default candidate for asynchronous connectors, schedules, notifications and operator workflows; HRP retains all domain/security authority
```

---

# 60. FINAL SUCCESS CONDITION

The project is succeeding when:

```text
1 recruiter
can receive a real application,
process that person safely,
reach a valid Placement outcome,
share a recruiter/job page externally,
and do so without bypassing canonical business/security boundaries.
```

Everything else is expansion.

The strategic rule is:

> **Do not optimize for completing the roadmap. Optimize for safely completing real work.**
