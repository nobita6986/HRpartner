# HRP — V6/V6+/V7 Conflict & Change Register

> Status: Architecture reconciliation register  
> Purpose: Resolve precedence between `v6-admin-rebuild.md`, `CRM_CSKH_INTEGRATION_PLAN.md`, `V6_PLUS_PLAN.md`, and `V7_ARCHITECTURE.md`.  
> Rule: This register does not rewrite historical documents. It tells implementers which decisions remain valid, which are clarified, and which are superseded for V6+/V7.

> **Later Owner decision (13/09/2026):** [HRP_CRM_INFRA_SPLIT.md](HRP_CRM_INFRA_SPLIT.md) supersedes every row here that assigns Chat, CSKH, Client CRM engagement workbench or Chatwoot/Zalo runtime to the HRP repo. Canonical HRP business records/commands remain HRP-owned. `CRM_CSKH_INTEGRATION_PLAN.md` is a historical reference named below and is not present in this checkout; use the split decision and [HRP_CRM_CONNECTOR.md](HRP_CRM_CONNECTOR.md) for current execution.

---

## 1. Document authority / precedence

When implementing code, use this precedence:

```text
1. V6_PLUS_PLAN.md
   authority for V6+ bridge, migration, compatibility and pre-V7 corrections

2. V7_ARCHITECTURE.md
   authority for V7 target domain and product architecture

3. V6_V7_CONFLICT_CHANGE_REGISTER.md
   authority for interpreting conflicts between old and new documents

4. CRM_CSKH_INTEGRATION_PLAN.md
   retained as the CRM/omnichannel discovery and integration design basis
   except where explicitly superseded here

5. v6-admin-rebuild.md
   retained as the V6 Marketplace/Admin source document
   except where V6+ explicitly changes semantics needed by V7
```

Important: V6 decisions not listed as changed/superseded in this register remain valid for their V6 scope.

---

## 2. Classification vocabulary

| Classification | Meaning |
|---|---|
| `KEEP` | Existing decision remains authoritative. |
| `CLARIFY` | Existing intent remains, but V6+/V7 gives a stricter semantic definition. |
| `SUPERSEDE` | Old rule must not be used for new implementation after V6+ migration. |
| `MOVE_TO_V6+` | Requirement belongs in bridge/foundation before V7 feature implementation. |
| `MOVE_TO_V7` | Do not expand V6 for this feature; implement in V7. |
| `DEFER` | Explicitly not required for V6+/initial V7. |
| `OUT_OF_SCOPE` | Removed from current HRP architecture boundary. |
| `OPEN` | Still requires an owner/policy decision; do not invent a value. |

---

# 3. Critical semantic conflicts

## CR-001 — AFF handling 7-day start time

**Old V6 rule:** protected handling starts when the `LaborProfile` is created/matched from a valid AFF flow. V6 describes `startsAt = profile create/match time`, with 7 days from there.

**CRM plan:** carries the same start rule while already attaching `AFF_INITIAL HandlingAssignment` to `PlacementCase`.

**New V6+/V7 rule:**

```text
ReferralAttribution established
        ↓
LaborProfile create/match
        ↓
job-seeking intent confirmed
        ↓
PlacementCase opened
        ↓
AFF_INITIAL HandlingAssignment starts
        ↓
7-day handling clock
```

`ReferralAttribution` may exist before an active PlacementCase. No active job-search case means no operational handling timer.

**Classification:** `SUPERSEDE` + `MOVE_TO_V6+ BLOCKER`.

**Implementation effect:** update old handling creation logic, migration assumptions, AFF tests, docs and any scheduler/query that assumes profile creation is the handling start event.

**Still OPEN:** whether “7 days” means calendar days or business days, and the authoritative timezone/calendar. V7 must not guess this policy.

---

## CR-002 — Handling belongs to LaborProfile vs PlacementCase

**Old V6 terminology:** `LaborProfileHandlingAssignment`, described as responsibility for the NLD/profile.

**CRM plan direction:** moves handling toward `PlacementCase` while retaining some profile-oriented wording.

**New rule:**

```text
ReferralAttribution → LaborProfile
HandlingAssignment  → PlacementCase
```

A person is a long-lived company asset; responsibility is for the current job-search/reassignment episode, not permanent ownership of the person.

**Classification:** `SUPERSEDE` old ownership semantic; `MOVE_TO_V6+ BLOCKER`.

**Compatibility note:** a convenience `laborProfileId` may be retained on handling for query performance, but authority is the case relation.

---

## CR-003 — Company Pool / “Kho chung” meaning

**Old V6 wording:** “profile/hồ sơ về kho chung” after handling expiry.

**New rule:**

```text
Talent Repository / Kho nhân lực
= all canonical LaborProfiles

Company Pool / Kho chung xử lý
= active PlacementCases with no valid active HandlingAssignment
```

The LaborProfile never “leaves” or “returns to” the Talent Repository because of handling state.

**Classification:** `CLARIFY` + `MOVE_TO_V6+ COMPAT`.

**Implementation effect:** Company Pool should be a query/projection, not a second people repository or mutable ownership status.

---

## CR-004 — General Interest as separate concept vs PlacementCase

**Old V6 decision:** General Interest must be distinguished from Application but no canonical model/state was locked.

**CRM plan:** explicitly resolves this gap: `PlacementCase` is the search/reassignment aggregate and may start with no Job; General Interest is a case with no Job yet, not a peer person/application entity.

**New rule:**

```text
LaborProfile
└── PlacementCase (may initially have no JobOpening)
      └── Applications[] when specific candidate-initiated interest appears
```

**Classification:** `CLARIFY` V6 decision via `MOVE_TO_V6+ BLOCKER` PlacementCase foundation.

**Do not create:** a competing `GeneralInterest` person record or fake Application merely to represent general job-seeking intent.

---

## CR-005 — When a LaborProfile becomes Worker

**Old V6 wording:** at “chốt nhận việc”, convert to Worker once and create EmploymentEpisode/Assignment.

**New V6+/V7 rule:** Worker/workforce lifecycle starts only when HRP-managed work **actually begins**. Acceptance or confirmation before start is insufficient.

```text
Candidate accepted / client confirmed
→ Placement SELECTED/CONFIRMED
→ no Worker required yet

Actual workforce start
→ ensure Worker
→ start EmploymentEpisode
→ start PRIMARY ProjectAssignment
→ Placement EFFECTIVE
```

For client-managed/direct-hire placements, `Placement` can become EFFECTIVE without Worker/Episode/Assignment.

**Classification:** `SUPERSEDE` old timing semantic + `MOVE_TO_V6+ BLOCKER`.

**Reason:** prevents no-show candidates from becoming false Workers and enables direct-hire outcomes.

---

## CR-006 — Placement vs ProjectAssignment

**Old V6:** recognizes `Application != Placement`, but actual placement is strongly represented through Worker/Assignment flow and no independent canonical Placement entity is established.

**New rule:** `Placement` is a first-class outcome/attempt entity and is not `ProjectAssignment`.

```text
PlacementCase
└── Placement[]
      ├── FAILED/CANCELLED
      └── EFFECTIVE
             ├── client-managed → no Worker required
             └── HRP-managed    → workforce lifecycle
```

**Classification:** `MOVE_TO_V6+ BLOCKER` foundation, `V7 CORE` UX/lifecycle.

**Compatibility:** historical Assignments must not automatically become fabricated Placements unless evidence supports backfill.

---

## CR-007 — JobOpening fulfillment source

**Old V6:** active/left/headcount thinking is primarily derived from real Assignment relations, which is correct for HRP-managed workforce.

**New V7:** JobOpening fulfillment must be based on `Placement EFFECTIVE` under the opening’s `ServiceModel` rules.

```text
HRP-managed: Placement EFFECTIVE is backed by actual workforce start
Client-managed: Placement EFFECTIVE can exist without Assignment
```

`activeAssignmentCount` and `effectivePlacementCount` are different metrics.

**Classification:** `CLARIFY` + `MOVE_TO_V6+ COMPAT`.

**Do not hard-code:** `filled = activeAssignments` for V7-compatible fulfillment.

---

## CR-008 — Commission ownership boundary

**Old V6:** commission modules/ledger exist and discussion includes beneficiary candidate; payroll/commission detail was deferred.

**CRM plan wording:** ownership table says “Commission/beneficiary/amount | HRP”, which implies HRP may own amount.

**New locked boundary:**

```text
HRP owns:
- referral/source facts
- handling facts
- Placement milestone
- CommissionBeneficiaryDecision[]

External Python app owns:
- amount
- rate
- formula
- tiers
- calculation policy
```

HRP may emit canonical context/events to the Python app but does not calculate commission money.

**Classification:** `SUPERSEDE` CRM ownership wording for `amount`; `OUT_OF_SCOPE` calculation in HRP.

**V7 model:** one Placement may produce multiple beneficiary decisions, e.g. `SOURCE` and `HANDLER`.

---

## CR-009 — Payroll and internal HRM

**Old V6:** payroll engine explicitly deferred; attendance/reconciliation/etc. retained outside current marketplace slice.

**New scope:** Payroll and internal HRM must not drive V6+/V7 architecture. Payroll is already handled by another app and may integrate later. Internal HRM may be built outside this HRP V7 scope.

**Classification:** `OUT_OF_SCOPE` for V6+/V7 architecture.

**HRP still owns:** canonical workforce facts required by integrations: Worker, EmploymentEpisode, Assignment, effective dates, movement history and events.

---

# 4. Talent Repository / identity reconciliation

## CR-010 — LaborProfile remains the canonical person

**V6:** one person must resolve to a canonical LaborProfile; staff-assisted and public intake should converge on that person record.

**CRM/V7:** fully consistent.

**Classification:** `KEEP` + V6+ hardening.

**Required implementation:** one create-or-match path for Marketplace, manual intake, phone/chat, Zalo, AFF/CTV/Vendor and imports.

---

## CR-011 — Phone/CCCD uniqueness is not identity authority

**V6 measured gap:** hard uniqueness assumptions can be wrong because phone ownership changes and identity documents may be corrected/reissued.

**V7:** identity uses exact/possible/new resolution; ambiguous matches go to review.

**Classification:** `KEEP` problem statement + `MOVE_TO_V6+ BLOCKER` hardening.

**Forbidden migration behavior:** auto-merge ambiguous people merely to satisfy unique/FK constraints.

---

## CR-012 — Availability and CurrentRelationship

**V6:** contains views such as never-worked/active/left but does not define the full independent state axes.

**V7:** formalizes independent semantics:

```text
Availability
- UNKNOWN
- AVAILABLE_NOW
- AVAILABLE_FROM_DATE
- NOT_AVAILABLE
- DO_NOT_CONTACT

CurrentRelationship
- NEVER_WORKED
- WORKING_VIA_HRP
- FORMER_HRP_WORKER
- WORKING_EXTERNAL
- UNKNOWN
```

CurrentRelationship is mainly a projection/observation, not a manually editable authoritative status.

**Classification:** `MOVE_TO_V7`.

---

# 5. PlacementCase / CRM reconciliation

## CR-013 — PlacementCase active uniqueness

**CRM plan:** leaves state machine/reopen/active uniqueness open.

**V7 decision:** a LaborProfile has at most one active PlacementCase at a time. A closed case normally stays closed; a later job-seeking episode creates a new case. Reopen is an exceptional correction with audit.

**Classification:** `SUPERSEDE OPEN` with locked V7 decision; `MOVE_TO_V6+ BLOCKER` constraint/foundation.

---

## CR-014 — PlacementCase stage vs outcome details

**New rule:** case stage describes the job-search process; InteractionOutcome describes what happened in a contact; JobProposal/Application/Placement carry opportunity/outcome details.

Do not create one giant status enum containing no-answer, working, transferred, rejected, etc.

**Classification:** `MOVE_TO_V7` domain/UI; V6+ only needs stable foundation/compatible state contract.

---

## CR-015 — CandidateSubmission persistence

**CRM plan:** name is open: keep `CandidateSubmission` or add/rename to Application.

**V6+ decision:** keep current persistence during bridge; product/domain vocabulary may say Application. Add `placementCaseId` first. Cosmetic rename is cleanup later.

**Classification:** `CLARIFY` + `MOVE_TO_V6+ BLOCKER` linkage; rename `DEFER`.

---

## CR-016 — Application vs JobProposal

**V6:** Application records initial candidate interest; candidate can ultimately be placed elsewhere.

**V7 extension:**

```text
Application = candidate-initiated interest
JobProposal = HRP-initiated job suggestion
```

Do not fabricate Applications for recruiter-suggested jobs.

**Classification:** V6 principle `KEEP`; `JobProposal` `MOVE_TO_V6+ COMPAT / V7 CORE`.

---

## CR-017 — InteractionOutcome / NextAction

**CRM plan:** structured interaction, callback and next action are part of Talent Workbench.

**V7:** retains this and strengthens `NextAction` as a first-class operational entity; overdue is a projection, not a stored status.

**Classification:** `KEEP` CRM direction + `MOVE_TO_V6+ COMPAT / V7 CORE`.

---

# 6. Attribution / partner / beneficiary reconciliation

## CR-018 — Canonical attribution location

**V6:** source follows the NLD and survives placement changes.

**CRM wording:** in one flow says `ReferralAttributionEvent` is attached to Intake + PlacementCase server-side.

**V7 authority:** canonical long-lived attribution belongs to the `LaborProfile`. Immutable attribution/touch events may reference Intake/PlacementCase for evidence/context, but the person provenance is not case-owned.

**Classification:** `CLARIFY` CRM flow wording; V6 provenance principle `KEEP`.

---

## CR-019 — Existing profile cannot be silently re-claimed

**V7 addition:** if CTV/Vendor B submits a person already canonically attributed to A, create a new Intake/acquisition fact but do not overwrite canonical ReferralAttribution automatically.

A new PlacementCase may record a separate acquisition/reactivation source without changing canonical person provenance.

**Classification:** `MOVE_TO_V6+ BLOCKER` source hardening + `V7 CORE` acquisition semantics.

---

## CR-020 — Partner identity vs User identity

**V6:** existing commission/source models are user/CTV-centric.

**V7:** introduce `SupplyPartner` for business identity (CTV/Vendor/other partner). A partner may have zero/one/many linked login users. Vendor must not be represented as a fake User.

**Classification:** `MOVE_TO_V7`.

---

## CR-021 — Beneficiary is not inferred directly

**V6/CRM:** already distinguish source, handling and beneficiary conceptually.

**V7:** formalizes `CommissionBeneficiaryDecision[]` as a snapshot at the effective placement milestone. Handling/attribution are evidence, not automatic entitlement.

**Classification:** underlying separation `KEEP`; canonical V7 entity `MOVE_TO_V7 CORE` with V6+ schema/service separation hardening.

---

# 7. Demand / ServiceModel reconciliation

## CR-022 — Existing V6 demand hierarchy

Keep:

```text
ClientCompany
→ Project
→ StaffingOrder
→ JobOpening
→ JobPosting
```

`StaffingOrder` is the client request/container. `JobOpening` is the fulfillment unit. `JobPosting` is public content/projection.

**Classification:** `KEEP`.

---

## CR-023 — ServiceModel authority

**V6:** no locked canonical service-model taxonomy at JobOpening level.

**V7 locked taxonomy:**

```text
STAFFING_SUPPLY       → HRP_MANAGED
LABOR_LEASING         → HRP_MANAGED
RECRUITMENT_SERVICE   → CLIENT_MANAGED
REFERRAL_SERVICE      → CLIENT_MANAGED
```

`managementMode` is derived from `ServiceModel`; do not store two independent authorities.

Canonical authority is `JobOpening.serviceModel`; Placement snapshots service-model context/history.

**Classification:** `MOVE_TO_V6+ COMPAT` schema + `V7 CORE`.

---

## CR-024 — WorkClassification is not ServiceModel

Temporary/permanent/fixed-term/seasonal employment classification must not be mixed with HRP’s commercial service model.

**Classification:** `MOVE_TO_V7`.

---

# 8. Workforce reconciliation

## CR-025 — One LaborProfile → at most one Worker

**V6:** already decided.

**V7:** unchanged.

**Classification:** `KEEP`; `V6+ BLOCKER/HARDEN` DB/service invariant.

---

## CR-026 — Rehire and EmploymentEpisode

**V6:** returning former Worker must not produce a second Worker; employment history should preserve episodes/assignments.

**V7:** formalizes:

```text
rehire
→ same Worker
→ new EmploymentEpisode
→ new PRIMARY ProjectAssignment
```

**Classification:** `KEEP` + V6+ tests/hardening.

---

## CR-027 — Transfer semantics

**V7 clarification:** continuous transfer within HRP-managed workforce ends old Assignment and starts new Assignment while retaining the same EmploymentEpisode. Genuine exit closes the episode; later return creates a new episode.

**Classification:** `MOVE_TO_V7 CORE`; preserve V6 history principles.

---

## CR-028 — Active Assignment uniqueness

**V6:** existing uniqueness does not correctly represent re-entry/current assignment constraints.

**V7 locked rule:** at most one active `PRIMARY` ProjectAssignment per Worker. `SECONDARY` is reserved for future need and is not part of initial V7 behavior.

**Classification:** `MOVE_TO_V6+ INVARIANT`.

---

## CR-029 — Assignment ↔ Placement relation

**V7:** new HRP-managed flows should connect ProjectAssignment to the Placement that caused the workforce transition. Historical/backfill rows may remain without Placement if provenance cannot be established honestly.

**Classification:** `MOVE_TO_V6+ COMPAT` (`ProjectAssignment.placementId?`).

---

# 9. Client CRM / omnichannel reconciliation

## CR-030 — Talent CRM priority vs Client CRM

**CRM plan:** Talent CRM first; B2B sales CRM evaluated after operational learning.

**V7:** retains Talent priority but now includes a **minimal native Client CRM** later in V7 (ClientContact, SalesOpportunity, ClientInteraction, ClientNextAction), not a full generic CRM.

**Classification:** CRM sequencing principle `KEEP`; minimal Client CRM `MOVE_TO_V7 LATER`.

Do not install a second generic sales CRM unless a real B2B gap is demonstrated later.

---

## CR-031 — Chatwoot ownership

Keep:

```text
Chatwoot = System of Engagement
HRP      = System of Record
```

Chatwoot owns raw conversations/inbox productivity. HRP owns LaborProfile, PlacementCase, structured InteractionOutcome, NextAction, handling, placement and workforce state.

**Classification:** `KEEP`.

---

## CR-032 — Omnichannel sequencing

Keep:

```text
Manual HRP Talent Workbench
→ Chatwoot technical integration
→ Zalo OA production pilot
→ additional channels
```

No channel integration should become a prerequisite for canonical Talent CRM operations.

**Classification:** `KEEP`; implementation belongs `V7 LATER` after core Workbench.

---

# 10. Security / audit reconciliation

## CR-033 — Route/RBAC/RLS vs domain commands

**V6:** already uses RBAC permission catalog + RLS direction.

**V7 extension:** critical lifecycle transitions may only occur through domain commands/services; RLS handles row/data isolation but is not the only business authorization layer.

**Classification:** V6 security foundation `KEEP`; command-boundary hardening `MOVE_TO_V6+ BLOCKER`.

---

## CR-034 — Movement history requirement

**V6 measured gap:** current audit tables do not by themselves satisfy the canonical movement timeline requirement.

**V7:** every critical movement must carry at least effective time, recorded time, actor and source; current state is projection from history/facts.

**Classification:** `MOVE_TO_V6+ BLOCKER`.

Do not interpret this as requiring full event sourcing. Canonical relational tables + domain history + audit + transactional outbox remain the target.

---

## CR-035 — Idempotency and concurrency

**CRM plan:** requires idempotent commands/events, retry/DLQ/reconciliation.

**V7:** extends idempotency/concurrency safety to critical internal commands such as create-or-match, claim handling, mark Placement effective and start Assignment.

**Classification:** CRM principle `KEEP`; `MOVE_TO_V6+ BLOCKER/HARDENING` for canonical commands.

---

# 11. Items intentionally still OPEN

The following are **not resolved by V7 architecture** and must not be invented by AI coding:

1. Whether 7-day handling uses calendar days or business days; authoritative timezone/calendar.
2. Detailed role → permission → scope matrix for recruiters, team leads, managers, directors, partner users and future client users.
3. Privacy/legal retention and consent periods for phone/chat/Zalo and sensitive PII.
4. Exact Zalo OA/business assets, permissions, quota/template/reply-window and compliance requirements.
5. Detailed work-classification enum beyond the conceptual separation from ServiceModel.
6. Detailed Placement failure/reason enums and client-confirmation evidence policy.
7. Whether future business needs require actual concurrent `SECONDARY` Assignments; V7 initial behavior does not expose them.
8. Deep contract/quote/rate-card management; currently deferred.

---

# 12. Explicitly deferred / out of scope

Do not expand V6+/initial V7 for:

- Payroll calculation;
- internal HRM;
- commission amount/rate/formula calculation;
- full CPQ/contract management;
- generic enterprise Sales CRM;
- full event sourcing;
- AI auto-send/auto-decision;
- AI matching as a prerequisite;
- external-employer HRM lifecycle beyond minimal observations needed by the Talent Repository;
- multi-channel rollout before the Workbench/Chatwoot/Zalo sequence is satisfied.

---

# 13. V6 decision reconciliation summary

The following V6 principles remain foundational and should **not** be weakened by V6+/V7:

```text
Application != Placement
JobOpening != JobPosting
one person -> one canonical LaborProfile
referral provenance survives job/project changes
public and staff-assisted intake converge on create-or-match
returning Worker does not create Worker #2
operational backfill must not fabricate Applications
movement history must preserve effective time and provenance
source != handler != beneficiary
```

V6+ exists primarily to make the runtime/schema actually satisfy these principles while introducing the missing abstractions (`PlacementCase`, `Placement`, case-scoped handling, service model compatibility) needed by V7.

---

# 14. Required edits to historical docs before coding handoff

Do **not** edit the historical documents destructively. Instead, add a short precedence banner or supersession note in their next maintained revision.

Recommended changes:

### `v6-admin-rebuild.md`

Add a banner near the top:

> For V6+ and V7 implementation, decisions explicitly superseded by `V6_V7_CONFLICT_CHANGE_REGISTER.md` and `V6_PLUS_PLAN.md` take precedence. In particular: AFF handling start time, HandlingAssignment ownership, Worker creation timing and independent Placement semantics.

Then mark the following old passages as superseded for V6+:

- handling clock starts at LaborProfile create/match;
- `LaborProfileHandlingAssignment` as profile-owned responsibility;
- conversion to Worker at “chốt nhận việc” if interpreted before actual workforce start.

### `CRM_CSKH_INTEGRATION_PLAN.md`

Add a banner near the top:

> V7 architecture keeps the SoR/SoE, Workbench-first, Chatwoot and Zalo sequencing from this plan. V6+/V7 supersede the old 7-day start trigger and remove commission amount/formula ownership from HRP.

Then update/annotate:

- AFF flow: 7-day handling starts when PlacementCase opens, not profile create/match;
- commission ownership row: HRP owns beneficiary decisions, not amount/formula calculation;
- PlacementCase open questions already resolved by V7 should link to `V7_ARCHITECTURE.md`.

---

# 15. AI coding precedence rule

If AI coding encounters two statements that conflict:

```text
A. Never silently choose one.
B. Check this register.
C. If resolved here, follow V6+ for bridge work and V7 Architecture for target behavior.
D. If listed OPEN, stop that specific implementation decision and surface it as an owner decision.
E. Do not rewrite historical production data to make the target model look cleaner.
```

This rule is part of the V7 compatibility gate.
